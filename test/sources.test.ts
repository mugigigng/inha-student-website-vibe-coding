// College/department board parsers, tested offline against real pages saved on 2026-09-25
// (test/fixtures/sources/). Same K2Web markup as the main board, but list titles sit in <strong>.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { EmptyContentError, InvalidResponseError } from '../src/errors.ts';
import * as aicc from '../src/sources/inhaAiccNotice.ts';
import * as cse from '../src/sources/inhaCseNotice.ts';
import * as doai from '../src/sources/inhaDoaiNotice.ts';
import * as main from '../src/sources/inhaMainNotice.ts';
import { selectSources, sourceForUrl } from '../src/sources/index.ts';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/sources/${name}`, import.meta.url), 'utf8');

test('CSE list page: ids, <strong> titles, dates, pinned rows', () => {
  const rows = cse.parseListHtml(fixture('cse-list.html'));
  assert.equal(rows.length, 17);
  assert.equal(rows.filter((r) => r.pinned).length, 2);
  const r = rows.find((x) => x.sourceNoticeId === '191991')!;
  assert.deepEqual(r, {
    sourceNoticeId: '191991',
    url: 'https://cse.inha.ac.kr/bbs/cse/242/191991/artclView.do',
    title: '[학부]2026학년도 2학기 수강신청 포기 안내',
    listedDate: '2026-09-22',
    pinned: false,
  });
  assert.ok(rows.every((x) => x.title && !x.title.includes('새글')), 'the "새글" badge is not part of the title');
});

test('AI융합대학 list page: ids, titles, dates, pinned rows', () => {
  const rows = aicc.parseListHtml(fixture('aicc-list.html'));
  assert.equal(rows.length, 18);
  assert.equal(rows.filter((r) => r.pinned).length, 3);
  const r = rows.find((x) => x.sourceNoticeId === '191359')!;
  assert.equal(r.title, '2026-2학기 전담지도교수 상담 안내');
  assert.equal(r.listedDate, '2026-09-15');
  assert.equal(r.url, 'https://aicc.inha.ac.kr/bbs/act/716/191359/artclView.do');
});

test('인공지능공학과 list page: ids, <strong> titles, dates, pinned rows', () => {
  const rows = doai.parseListHtml(fixture('doai-list.html'));
  assert.equal(rows.length, 14);
  assert.equal(rows.filter((r) => r.pinned).length, 4);
  assert.deepEqual(rows.find((x) => x.sourceNoticeId === '190683'), {
    sourceNoticeId: '190683',
    url: 'https://doai.inha.ac.kr/bbs/doai/731/190683/artclView.do',
    title: '[학사] 2026-2 추가 복학신청 일정 안내',
    listedDate: '2026-09-07',
    pinned: false,
  });
  assert.equal(cse.parseListHtml(fixture('doai-list.html')).length, 0, 'CSE parser ignores the AI board');
});

test('인공지능공학과 article: title, date, author, text body, attachment on the doai host; poster-only → EmptyContentError', () => {
  const n = doai.parseNoticeHtml(fixture('doai-article-190683.html'), doai.parseNoticeUrl('https://doai.inha.ac.kr/bbs/doai/731/190683/artclView.do'));
  assert.equal(n.source, 'inha-doai-notice');
  assert.equal(n.title, '[학사] 2026-2 추가 복학신청 일정 안내');
  assert.equal(n.publishedAt, '2026-09-07');
  assert.equal(n.author, '김경남');
  assert.equal(n.boardCategory, null);
  assert.match(n.originalContent, /1\. 신청 대상자 : 휴학 기간이 만료되었거나/);
  assert.deepEqual(n.attachments, [
    { kind: 'file', name: '2. 휴복학 프로세스(학생신청) (2).pdf', url: 'https://doai.inha.ac.kr/bbs/doai/731/185140/download.do' },
  ]);
  const poster = 'https://doai.inha.ac.kr/bbs/doai/731/191467/artclView.do';
  assert.throws(() => doai.parseNoticeHtml(fixture('doai-article-191467-poster.html'), doai.parseNoticeUrl(poster)), EmptyContentError);
});

test('a board only parses its own rows (other boards\' list pages give nothing)', () => {
  assert.equal(aicc.parseListHtml(fixture('cse-list.html')).length, 0);
  assert.equal(main.parseListHtml(fixture('cse-list.html')).length, 0);
});

test('CSE article: title, date, author, text body, attachment URL on the CSE host', () => {
  const url = 'https://cse.inha.ac.kr/bbs/cse/242/191991/artclView.do';
  const n = cse.parseNoticeHtml(fixture('cse-article-191991.html'), cse.parseNoticeUrl(url));
  assert.equal(n.source, 'inha-cse-notice');
  assert.equal(n.sourceNoticeId, '191991');
  assert.equal(n.title, '[학부]2026학년도 2학기 수강신청 포기 안내');
  assert.equal(n.publishedAt, '2026-09-22');
  assert.equal(n.author, '김소현');
  assert.equal(n.boardCategory, null, 'department boards have no 분류');
  assert.match(n.originalContent, /수강포기 신청기간: 2026\. 9\. 28\.\(월\) 09:00 ~ 30\.\(수\) 23:59/);
  assert.deepEqual(n.attachments, [
    { kind: 'file', name: '수강신청포기 및 포기취소 매뉴얼.pdf', url: 'https://cse.inha.ac.kr/bbs/cse/242/186462/download.do' },
  ]);
});

test('AI융합대학 article with a text body parses', () => {
  const url = 'https://aicc.inha.ac.kr/bbs/act/716/191359/artclView.do';
  const n = aicc.parseNoticeHtml(fixture('aicc-article-191359.html'), aicc.parseNoticeUrl(url));
  assert.equal(n.source, 'inha-aicc-notice');
  assert.equal(n.title, '2026-2학기 전담지도교수 상담 안내');
  assert.equal(n.publishedAt, '2026-09-15');
  assert.ok(n.originalContent.length >= 30);
});

test('poster-only article (image, no text) → EmptyContentError, like on the main board', () => {
  const url = 'https://aicc.inha.ac.kr/bbs/act/716/191375/artclView.do';
  assert.throws(() => aicc.parseNoticeHtml(fixture('aicc-article-191375-poster.html'), aicc.parseNoticeUrl(url)), EmptyContentError);
});

test('each module accepts only its own board\'s article URLs; the registry routes URLs and --source names', () => {
  const cseUrl = 'https://cse.inha.ac.kr/bbs/cse/242/191991/artclView.do';
  const aiccUrl = 'http://aicc.inha.ac.kr/bbs/act/716/191359/artclView.do?layout=unknown';
  assert.equal(aicc.parseNoticeUrl(aiccUrl).canonicalUrl, 'https://aicc.inha.ac.kr/bbs/act/716/191359/artclView.do');
  assert.throws(() => aicc.parseNoticeUrl(cseUrl), InvalidResponseError);
  assert.throws(() => cse.parseNoticeUrl('https://cse.inha.ac.kr/bbs/cse/243/191991/artclView.do'), InvalidResponseError, 'other CSE board');
  assert.throws(() => main.parseNoticeUrl(cseUrl), InvalidResponseError);
  assert.equal(sourceForUrl(cseUrl).id, 'inha-cse-notice');
  assert.equal(sourceForUrl(aiccUrl).id, 'inha-aicc-notice');
  assert.deepEqual(selectSources('cse,main').map((s) => s.alias), ['main', 'cse'], 'always in ingest order');
  assert.deepEqual(selectSources(undefined).map((s) => s.alias), ['main', 'aicc', 'cse', 'ai']);
  assert.deepEqual(selectSources('ai').map((s) => s.id), ['inha-doai-notice']);
  assert.equal(sourceForUrl('https://doai.inha.ac.kr/bbs/doai/731/190683/artclView.do').id, 'inha-doai-notice');
  assert.throws(() => doai.parseNoticeUrl('https://doai.inha.ac.kr/bbs/doai/729/190683/artclView.do'), InvalidResponseError, 'doai 취업/이벤트 board');
  assert.throws(() => selectSources('eng'), /Unknown source "eng"/);
});
