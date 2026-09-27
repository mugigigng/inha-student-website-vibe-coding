import type { DatabaseSync } from 'node:sqlite';
import { sourceChecks } from '../db.ts';
import { NOTICE_SOURCES } from '../sourceMeta.ts';
import type { ApiMeta } from './types.ts';

// Site-wide facts for the read API (GET /api/meta, static api/meta.json). Read-only.

export function getMeta(db: DatabaseSync): ApiMeta {
  const known = new Set(NOTICE_SOURCES.map((s) => s.id));
  const boards = sourceChecks(db).filter((b) => known.has(b.source));
  const oldest = boards.reduce<string | null>((min, b) => (!min || b.checkedAt < min ? b.checkedAt : min), null);
  const latestCrawl = (db.prepare('SELECT max(crawled_at) AS t FROM notices').get() as { t: string | null }).t;
  return { lastCheckedAt: oldest ?? latestCrawl ?? null, boards };
}
