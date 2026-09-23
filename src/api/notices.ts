import type { DatabaseSync } from 'node:sqlite';
import type { NoticeAnalysis, NoticeDetail, NoticeListItem } from './types.ts';

// Read-only queries behind the HTTP API. Each notice is joined with its LATEST
// analysis; `analysisStatus` says whether that analysis matches the current text.

const SELECT = `
  SELECT n.*, a.id AS a_id, a.provider, a.model, a.prompt_version, a.category, a.application_start,
         a.application_end, a.deadline, a.event_date, a.en_json, a.target, a.summary_json, a.easy_explanation,
         a.evidence_json, a.uncertain_fields_json, a.validation_warnings_json, a.created_at AS analyzed_at,
         a.content_hash AS analyzed_hash
    FROM notices n
    LEFT JOIN notice_analysis a ON a.id = (SELECT max(id) FROM notice_analysis WHERE notice_id = n.id)`;

type Row = Record<string, any>;

function toAnalysis(r: Row): NoticeAnalysis | null {
  if (r.a_id == null) return null;
  const evidence = JSON.parse(r.evidence_json);
  return {
    category: r.category,
    applicationStart: r.application_start,
    applicationEnd: r.application_end,
    deadline: r.deadline,
    eventDate: r.event_date ?? null, // NULL for prompt-v1 analyses
    target: r.target,
    summary: JSON.parse(r.summary_json),
    easyExplanation: r.easy_explanation,
    evidence: { eventDate: null, ...evidence },
    uncertain: JSON.parse(r.uncertain_fields_json),
    en: r.en_json ? JSON.parse(r.en_json) : null,
    provider: r.provider,
    model: r.model,
    promptVersion: r.prompt_version,
    validationWarnings: JSON.parse(r.validation_warnings_json),
    analyzedAt: r.analyzed_at,
  };
}

function toListItem(r: Row): NoticeListItem {
  return {
    id: r.id,
    sourceNoticeId: r.source_notice_id,
    title: r.title,
    sourceUrl: r.source_url,
    publishedAt: r.published_at,
    boardCategory: r.board_category,
    crawledAt: r.crawled_at,
    contentUpdatedAt: r.content_updated_at ?? null,
    analysisStatus: r.a_id == null ? 'pending' : r.analyzed_hash === r.content_hash ? 'ready' : 'stale',
    analysis: toAnalysis(r),
  };
}

/** Newest first by publication date. */
export function listNotices(db: DatabaseSync): NoticeListItem[] {
  const rows = db.prepare(`${SELECT} ORDER BY n.published_at DESC, n.id DESC`).all() as Row[];
  return rows.map(toListItem);
}

export function getNoticeDetail(db: DatabaseSync, id: number): NoticeDetail | null {
  const r = db.prepare(`${SELECT} WHERE n.id = ?`).get(id) as Row | undefined;
  if (!r) return null;
  return {
    ...toListItem(r),
    author: r.author,
    attachments: JSON.parse(r.attachments_json),
    originalContent: r.original_content,
  };
}
