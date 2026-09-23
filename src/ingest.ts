import type { DatabaseSync } from 'node:sqlite';
import { PROMPT_VERSION, type AnalysisResult } from './analyze.ts';
import { contentHash, hasCurrentAnalysis, insertAnalysis, upsertNotice } from './db.ts';
import { AiApiError } from './errors.ts';
import type { ListedNotice } from './sources/inhaMainNotice.ts';
import type { RawNotice } from './types.ts';

// Ingestion: list -> fetch each -> upsert -> analyze only if no analysis exists for
// the notice's current content. One notice failing never stops the run.

export interface IngestDeps {
  db: DatabaseSync;
  listNotices: () => Promise<ListedNotice[]>;
  fetchNotice: (url: string) => Promise<RawNotice>;
  /** null = AI disabled for this run (e.g. no API key); notices are still stored. */
  analyze: ((n: RawNotice) => Promise<AnalysisResult>) | null;
  log?: (line: string) => void;
  /** Pause between article requests to the Inha site. */
  crawlDelayMs?: number;
  /** Pause between AI calls (free-tier requests-per-minute). */
  aiDelayMs?: number;
  /** Process at most this many listed notices. */
  limit?: number;
  /** Also re-analyze notices whose current analysis came from an older prompt version. Costs AI requests. */
  upgradePrompt?: boolean;
}

export interface IngestStats {
  found: number;
  new: number;
  updated: number;
  unchanged: number;
  crawlFailed: number;
  analyzed: number;
  analysisFailed: number;
  /** Needed analysis but AI was disabled or stopped; picked up next run. */
  analysisDeferred: number;
  /** Unchanged notices that already had a current analysis → no AI call. */
  analysisSkipped: number;
  aiStoppedReason: string | null;
  errors: { noticeId: string; stage: 'crawl' | 'analysis'; message: string }[];
}

// After this many consecutive overload failures (each already retried + fallen back),
// stop calling the AI for the rest of the run instead of hammering it.
const MAX_CONSECUTIVE_OVERLOADS = 3;

export async function ingest(deps: IngestDeps): Promise<IngestStats> {
  const { db, log = console.log, crawlDelayMs = 300, aiDelayMs = 0 } = deps;
  const stats: IngestStats = {
    found: 0, new: 0, updated: 0, unchanged: 0, crawlFailed: 0,
    analyzed: 0, analysisFailed: 0, analysisDeferred: 0, analysisSkipped: 0,
    aiStoppedReason: deps.analyze ? null : 'AI disabled for this run', errors: [],
  };

  // Listing failure (site down, layout change) aborts the run: there is nothing to iterate.
  const listed = (await deps.listNotices()).slice(0, deps.limit);
  stats.found = listed.length;
  log(`[CRAWL] Found ${listed.length} notices`);

  let consecutiveOverloads = 0;
  let aiCalls = 0;
  for (const [i, item] of listed.entries()) {
    if (i > 0 && crawlDelayMs) await sleep(crawlDelayMs);
    const id = item.sourceNoticeId;

    let notice: RawNotice;
    try {
      notice = await deps.fetchNotice(item.url);
    } catch (err) {
      stats.crawlFailed++;
      stats.errors.push({ noticeId: id, stage: 'crawl', message: describe(err) });
      log(`[ERROR] Notice ${id} crawl failed: ${describe(err)}`);
      continue;
    }

    const { id: rowId, status, changed } = upsertNotice(db, notice);
    stats[status]++;
    if (status === 'new') log(`[NEW] Notice ${id} ${notice.title}`);
    if (status === 'updated') log(`[UPDATE] Notice ${id} changed (${changed.join(', ')})`);

    // Existence, duplicate and change checks above are plain DB/hash comparisons.
    // Gemini is only reached below when no analysis exists for the current content.
    const current = hasCurrentAnalysis(db, rowId);
    const upgrade = current && deps.upgradePrompt && !hasCurrentAnalysis(db, rowId, PROMPT_VERSION);
    if (current && !upgrade) {
      stats.analysisSkipped++;
      if (status === 'unchanged') log(`[SKIP] Unchanged notice ${id} (existing analysis is current; no Gemini request)`);
      else log(`[SKIP] Existing analysis for ${id} still valid (${changed.join(', ')} change only; no Gemini request)`);
      continue;
    }
    if (upgrade) log(`[UPGRADE] Notice ${id} analysis is from an older prompt; re-analyzing with ${PROMPT_VERSION}`);
    else if (status === 'unchanged') log(`[PENDING] Notice ${id} unchanged but has no analysis yet (earlier failure or deferral)`);

    if (!deps.analyze || stats.aiStoppedReason) {
      stats.analysisDeferred++;
      log(`[DEFER] Notice ${id} analysis deferred to next run: ${stats.aiStoppedReason}`);
      continue;
    }

    if (aiCalls++ > 0 && aiDelayMs) await sleep(aiDelayMs);
    log(`[AI] Analyzing ${id}`);
    try {
      const result = await deps.analyze(notice);
      insertAnalysis(db, rowId, result, PROMPT_VERSION, contentHash(notice));
      stats.analyzed++;
      consecutiveOverloads = 0;
      const a = result.analysis;
      log(
        `[AI] Saved analysis for ${id} (${result.model}): ${a.category}, ` +
          `apply ${a.applicationStart ?? '?'} ~ ${a.applicationEnd ?? '?'}, deadline ${a.deadline ?? 'none'}, event ${a.eventDate ?? 'none'}`,
      );
      for (const w of result.validationWarnings) log(`[WARN] Notice ${id}: ${w}`);
    } catch (err) {
      if (err instanceof AiApiError && err.noRequestSent) {
        stats.aiStoppedReason = `AI unavailable: ${err.message}`;
        stats.analysisDeferred++;
        log(`[DEFER] Notice ${id} analysis deferred to next run: ${err.message}`);
        log(`[AI] Stopping AI calls for this run: ${stats.aiStoppedReason}`);
        continue;
      }
      stats.analysisFailed++;
      stats.errors.push({ noticeId: id, stage: 'analysis', message: describe(err) });
      log(`[ERROR] Notice ${id} analysis failed (original notice kept): ${describe(err)}`);
      if (err instanceof AiApiError) {
        if (err.status === 429) {
          stats.aiStoppedReason = 'AI rate/quota limit reached (429)';
        } else if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404) {
          stats.aiStoppedReason = `AI request rejected (${err.status}); check API key/model`;
        } else if (++consecutiveOverloads >= MAX_CONSECUTIVE_OVERLOADS) {
          stats.aiStoppedReason = `${consecutiveOverloads} consecutive AI failures (provider overloaded)`;
        }
        if (stats.aiStoppedReason) log(`[AI] Stopping AI calls for this run: ${stats.aiStoppedReason}`);
      }
    }
  }

  return stats;
}

const describe = (err: unknown) => `${(err as Error).name}: ${(err as Error).message}`.replace(/\s+/g, ' ').slice(0, 300);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
