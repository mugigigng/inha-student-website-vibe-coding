// "Notice boards last checked": ingest stores each board's successful list check; the read API
// (getMeta) reports the oldest one, falling back to the newest crawled_at for older databases.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMeta } from '../src/api/meta.ts';
import { insertNotice, openDb, recordSourceCheck } from '../src/db.ts';
import { NetworkError } from '../src/errors.ts';
import { ingestAll } from '../src/ingest.ts';
import { parseNoticeHtml } from '../src/sources/inhaMainNotice.ts';
import { lastCheckedAt } from '../web/src/lib/lastChecked.ts';

const MAIN = 'inha-main-notice';
const CSE = 'inha-cse-notice';

const storedNotice = (crawledAt: string) => ({
  ...parseNoticeHtml(
    `<h2 class="artclViewTitle">안내</h2><div class="artclView"><p>학부생 대상 안내문입니다. 신청기간 2026.10.16까지 접수합니다.</p></div>`,
    { sourceNoticeId: '1', canonicalUrl: 'https://www.inha.ac.kr/bbs/kr/8/1/artclView.do' },
  ),
  crawledAt,
});

test('a board with nothing new still counts as checked; a failed listing does not', async () => {
  const db = openDb(':memory:');
  const before = new Date().toISOString();
  await ingestAll(
    [
      { id: MAIN, listNotices: async () => [], fetchNotice: async () => { throw new Error('unused'); } },
      { id: CSE, listNotices: async () => { throw new NetworkError('down'); }, fetchNotice: async () => { throw new Error('unused'); } },
    ],
    { db, analyze: null, log: () => {}, crawlDelayMs: 0 },
  );
  const meta = getMeta(db);
  assert.deepEqual(meta.boards.map((b) => b.source), [MAIN], 'only the board whose list was read');
  assert.ok(meta.boards[0].checkedAt >= before);
  assert.equal(meta.lastCheckedAt, meta.boards[0].checkedAt);
});

test('lastCheckedAt is the oldest board check (never overstates a board that keeps failing)', () => {
  const db = openDb(':memory:');
  insertNotice(db, storedNotice('2026-09-20T00:00:00.000Z'));
  recordSourceCheck(db, MAIN, '2026-09-28T03:00:00.000Z');
  recordSourceCheck(db, CSE, '2026-09-27T23:00:00.000Z');
  recordSourceCheck(db, MAIN, '2026-09-28T09:00:00.000Z'); // re-check replaces
  recordSourceCheck(db, 'retired-board', '2020-01-01T00:00:00.000Z'); // not a known source: ignored
  const meta = getMeta(db);
  assert.equal(meta.lastCheckedAt, '2026-09-27T23:00:00.000Z');
  assert.deepEqual(meta.boards, [
    { source: CSE, checkedAt: '2026-09-27T23:00:00.000Z' },
    { source: MAIN, checkedAt: '2026-09-28T09:00:00.000Z' },
  ]);
});

test('databases from before board checks fall back to the newest crawled_at; empty DB = null', () => {
  const db = openDb(':memory:');
  assert.deepEqual(getMeta(db), { lastCheckedAt: null, boards: [] });
  insertNotice(db, storedNotice('2026-09-20T00:00:00.000Z'));
  assert.equal(getMeta(db).lastCheckedAt, '2026-09-20T00:00:00.000Z');
});

test('UI: meta value wins; missing meta (old static snapshot) falls back to crawledAt; hidden while loading', () => {
  const notices = [{ crawledAt: '2026-09-20T00:00:00.000Z' }, { crawledAt: '2026-09-22T00:00:00.000Z' }];
  assert.equal(lastCheckedAt({ lastCheckedAt: '2026-09-28T09:00:00.000Z', boards: [] }, notices), '2026-09-28T09:00:00.000Z');
  assert.equal(lastCheckedAt({ lastCheckedAt: null, boards: [] }, notices), '2026-09-22T00:00:00.000Z');
  assert.equal(lastCheckedAt(null, notices), '2026-09-22T00:00:00.000Z');
  assert.equal(lastCheckedAt(undefined, notices), null);
  assert.equal(lastCheckedAt(null, []), null);
});
