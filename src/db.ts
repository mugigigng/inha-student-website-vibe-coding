import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AnalysisResult } from './analyze.ts';
import { DuplicateNoticeError } from './errors.ts';
import type { RawNotice } from './types.ts';

export const DB_PATH = process.env.POC_DB_PATH || 'data/poc.db';

// Original crawled data and AI output live in separate tables; the AI never
// writes to `notices`.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS notices (
  id               INTEGER PRIMARY KEY,
  source           TEXT NOT NULL,
  source_notice_id TEXT NOT NULL,
  source_url       TEXT NOT NULL,
  title            TEXT NOT NULL,
  original_content TEXT NOT NULL,
  raw_html         TEXT NOT NULL,
  published_at     TEXT,
  board_category   TEXT,
  author           TEXT,
  attachments_json TEXT NOT NULL,
  content_hash     TEXT NOT NULL,
  crawled_at       TEXT NOT NULL,
  content_updated_at TEXT,
  UNIQUE (source, source_notice_id)
);

CREATE TABLE IF NOT EXISTS notice_analysis (
  id                    INTEGER PRIMARY KEY,
  notice_id             INTEGER NOT NULL REFERENCES notices(id),
  provider              TEXT NOT NULL,
  model                 TEXT NOT NULL,
  prompt_version        TEXT NOT NULL,
  category              TEXT NOT NULL,
  application_start     TEXT,
  application_end       TEXT,
  deadline              TEXT,
  event_date            TEXT,
  en_json               TEXT,
  target                TEXT NOT NULL,
  summary_json          TEXT NOT NULL,
  easy_explanation      TEXT NOT NULL,
  evidence_json         TEXT NOT NULL,
  uncertain_fields_json TEXT NOT NULL,
  validation_warnings_json TEXT NOT NULL,
  raw_response          TEXT NOT NULL,
  created_at            TEXT NOT NULL,
  content_hash          TEXT
);
`;

export function openDb(path = DB_PATH): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

// Additive migrations for databases created by earlier versions of this POC.
function migrate(db: DatabaseSync) {
  const has = (table: string, col: string) =>
    (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === col);
  if (!has('notice_analysis', 'provider')) {
    db.exec("ALTER TABLE notice_analysis ADD COLUMN provider TEXT NOT NULL DEFAULT 'unknown'");
  }
  if (!has('notices', 'content_updated_at')) {
    db.exec('ALTER TABLE notices ADD COLUMN content_updated_at TEXT');
  }
  if (!has('notice_analysis', 'en_json')) {
    db.exec('ALTER TABLE notice_analysis ADD COLUMN en_json TEXT'); // NULL for analyses before prompt v3
  }
  if (!has('notice_analysis', 'event_date')) {
    db.exec('ALTER TABLE notice_analysis ADD COLUMN event_date TEXT'); // NULL for prompt-v1 analyses
  }
  if (!has('notice_analysis', 'content_hash')) {
    db.exec('ALTER TABLE notice_analysis ADD COLUMN content_hash TEXT');
    // Before this column existed notices were never updated in place, so every
    // existing analysis was made from the notice's current content.
    db.exec('UPDATE notice_analysis SET content_hash = (SELECT content_hash FROM notices WHERE notices.id = notice_analysis.notice_id)');
  }
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Fingerprint of the notice text the AI sees. Title-only edits don't change it. */
export const contentHash = (n: Pick<RawNotice, 'originalContent'>) => sha256(n.originalContent);

/** Inserts a new notice. On duplicate, bumps crawled_at and throws DuplicateNoticeError. */
export function insertNotice(db: DatabaseSync, n: RawNotice): number {
  const hash = contentHash(n);
  const result = db
    .prepare(
      `INSERT INTO notices (source, source_notice_id, source_url, title, original_content, raw_html,
         published_at, board_category, author, attachments_json, content_hash, crawled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (source, source_notice_id) DO NOTHING`,
    )
    .run(
      n.source, n.sourceNoticeId, n.sourceUrl, n.title, n.originalContent, n.rawHtml,
      n.publishedAt, n.boardCategory, n.author, JSON.stringify(n.attachments), hash, n.crawledAt,
    );
  if (result.changes === 1) return Number(result.lastInsertRowid);

  const existing = db
    .prepare('SELECT id, content_hash FROM notices WHERE source = ? AND source_notice_id = ?')
    .get(n.source, n.sourceNoticeId) as { id: number; content_hash: string };
  db.prepare('UPDATE notices SET crawled_at = ? WHERE id = ?').run(n.crawledAt, existing.id);
  throw new DuplicateNoticeError(existing.id, existing.content_hash !== hash);
}

export type UpsertStatus = 'new' | 'updated' | 'unchanged';

/**
 * Ingestion entry point: inserts a new notice, or compares a re-crawled one with
 * the stored row. On change the row is updated to the current official version
 * (old analyses keep their content_hash, so they become stale, not deleted).
 */
export function upsertNotice(db: DatabaseSync, n: RawNotice): { id: number; status: UpsertStatus; changed: string[] } {
  const existing = db
    .prepare('SELECT id, title, content_hash FROM notices WHERE source = ? AND source_notice_id = ?')
    .get(n.source, n.sourceNoticeId) as { id: number; title: string; content_hash: string } | undefined;
  if (!existing) return { id: insertNotice(db, n), status: 'new', changed: [] };

  const hash = contentHash(n);
  const changed = [
    ...(existing.content_hash !== hash ? ['content'] : []),
    ...(existing.title !== n.title ? ['title'] : []),
  ];
  if (changed.length === 0) {
    db.prepare('UPDATE notices SET crawled_at = ? WHERE id = ?').run(n.crawledAt, existing.id);
    return { id: existing.id, status: 'unchanged', changed };
  }
  db.prepare(
    `UPDATE notices SET source_url = ?, title = ?, original_content = ?, raw_html = ?, published_at = ?,
       board_category = ?, author = ?, attachments_json = ?, content_hash = ?, crawled_at = ?, content_updated_at = ?
     WHERE id = ?`,
  ).run(
    n.sourceUrl, n.title, n.originalContent, n.rawHtml, n.publishedAt, n.boardCategory, n.author,
    JSON.stringify(n.attachments), hash, n.crawledAt, n.crawledAt, existing.id,
  );
  return { id: existing.id, status: 'updated', changed };
}

/**
 * True if some analysis was made from the notice's current content (i.e. not stale).
 * With `promptVersion`, it must also come from that prompt version (used by --upgrade-prompt).
 */
export function hasCurrentAnalysis(db: DatabaseSync, noticeId: number, promptVersion?: string): boolean {
  return (
    db
      .prepare(
        `SELECT 1 FROM notice_analysis a JOIN notices n ON n.id = a.notice_id
          WHERE a.notice_id = ? AND a.content_hash = n.content_hash AND (? IS NULL OR a.prompt_version = ?) LIMIT 1`,
      )
      .get(noticeId, promptVersion ?? null, promptVersion ?? null) !== undefined
  );
}

export function counts(db: DatabaseSync) {
  const row = db
    .prepare(
      `SELECT (SELECT count(*) FROM notices) AS notices,
              (SELECT count(*) FROM notice_analysis) AS analyses,
              (SELECT count(*) FROM notices n WHERE EXISTS (
                 SELECT 1 FROM notice_analysis a WHERE a.notice_id = n.id AND a.content_hash = n.content_hash)) AS analyzed_current,
              (SELECT count(*) FROM notices n WHERE NOT EXISTS (
                 SELECT 1 FROM notice_analysis a WHERE a.notice_id = n.id AND a.content_hash = n.content_hash)) AS pending_analysis`,
    )
    .get() as { notices: number; analyses: number; analyzed_current: number; pending_analysis: number };
  return { ...row };
}

/** `analyzedHash` = contentHash() of the exact text sent to the AI. */
export function insertAnalysis(db: DatabaseSync, noticeId: number, r: AnalysisResult, promptVersion: string, analyzedHash: string): number {
  const a = r.analysis;
  const result = db
    .prepare(
      `INSERT INTO notice_analysis (notice_id, provider, model, prompt_version, category, application_start,
         application_end, deadline, target, summary_json, easy_explanation, evidence_json,
         uncertain_fields_json, validation_warnings_json, raw_response, created_at, content_hash, event_date, en_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      noticeId, r.provider, r.model, promptVersion, a.category, a.applicationStart, a.applicationEnd, a.deadline,
      a.target, JSON.stringify(a.summary), a.easyExplanation, JSON.stringify(a.evidence),
      JSON.stringify(a.uncertain), JSON.stringify(r.validationWarnings), r.rawResponse, new Date().toISOString(), analyzedHash,
      a.eventDate, JSON.stringify(a.en),
    );
  return Number(result.lastInsertRowid);
}

export function getNotice(db: DatabaseSync, noticeId: number) {
  return db.prepare('SELECT * FROM notices WHERE id = ?').get(noticeId) as Record<string, unknown> | undefined;
}

export function listNoticesWithLatestAnalysis(db: DatabaseSync) {
  return db
    .prepare(
      `SELECT n.id, n.source, n.source_notice_id, n.source_url, n.title, n.published_at, n.crawled_at, n.content_updated_at,
              length(n.original_content) AS content_chars, a.id AS analysis_id, a.provider, a.model, a.category,
              a.application_start, a.application_end, a.deadline, a.event_date, a.target, a.summary_json, a.prompt_version,
              a.easy_explanation, a.evidence_json, a.uncertain_fields_json, a.validation_warnings_json, a.created_at,
              CASE WHEN a.id IS NULL THEN NULL ELSE a.content_hash IS NOT n.content_hash END AS analysis_stale
         FROM notices n
         LEFT JOIN notice_analysis a ON a.id = (SELECT max(id) FROM notice_analysis WHERE notice_id = n.id)
        ORDER BY n.id`,
    )
    .all() as Record<string, unknown>[];
}
