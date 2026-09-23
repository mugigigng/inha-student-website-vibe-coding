// Read API shape: English fields round-trip, and pre-v3 analyses degrade to `en: null`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getNoticeDetail, listNotices } from '../src/api/notices.ts';
import type { AnalysisResult } from '../src/analyze.ts';
import { analyzeNotice } from '../src/analyze.ts';
import { contentHash, insertAnalysis, insertNotice, openDb } from '../src/db.ts';
import { parseNoticeHtml } from '../src/sources/inhaMainNotice.ts';

const notice = parseNoticeHtml(
  `<h2 class="artclViewTitle">장학금 안내</h2><div class="artclView"><p>[모집기간] 2026.09.28(월) ~ 2026.10.16(금) 학부생 대상 장학금 신청 안내</p></div>`,
  { sourceNoticeId: '1', canonicalUrl: 'https://www.inha.ac.kr/bbs/kr/8/1/artclView.do' },
);
const en = { title: 'Scholarship notice', summary: ['A', 'B', 'C'], easyExplanation: 'Easy.', target: 'Undergraduates', eventInfo: null };
const result: AnalysisResult = {
  analysis: {
    category: '장학금', applicationStart: '2026-09-28', applicationEnd: '2026-10-16', deadline: '2026-10-16', eventDate: null,
    target: '학부생', summary: ['가', '나', '다'], easyExplanation: '쉬움', uncertain: [], en,
    evidence: { applicationStart: null, applicationEnd: null, deadline: null, eventDate: null },
  },
  rawResponse: '{}', validationWarnings: [], provider: 'gemini', model: 'm', 
};

test('English block is stored and returned by the API next to the Korean original', () => {
  const db = openDb(':memory:');
  const id = insertNotice(db, notice);
  insertAnalysis(db, id, result, 'v3', contentHash(notice));
  const detail = getNoticeDetail(db, id)!;
  assert.deepEqual(detail.analysis!.en, en);
  assert.deepEqual(detail.analysis!.summary, ['가', '나', '다'], 'Korean untouched');
  assert.equal(detail.title, '장학금 안내');
  assert.equal(detail.sourceUrl, 'https://www.inha.ac.kr/bbs/kr/8/1/artclView.do');
  assert.equal(detail.analysis!.deadline, '2026-10-16', 'dates stay structured');
});

test('analyses from before prompt v3 have no English: API returns en = null (UI falls back to Korean)', () => {
  const db = openDb(':memory:');
  const id = insertNotice(db, notice);
  insertAnalysis(db, id, result, 'v2', contentHash(notice));
  db.prepare('UPDATE notice_analysis SET en_json = NULL').run();
  assert.equal(listNotices(db)[0].analysis!.en, null);
  assert.equal(getNoticeDetail(db, id)!.analysis!.summary[0], '가');
});

test('English summary bullet count must match Korean -> validation warning', async () => {
  const bad = { ...result.analysis, en: { ...en, summary: ['A'] } };
  const r = await analyzeNotice(notice, {
    name: 'fake', model: 'fake',
    generateJson: async () => ({ text: JSON.stringify(bad), model: 'fake', incomplete: false, stopReason: 'STOP' }),
  });
  assert.ok(r.validationWarnings.includes('en.summary has 1 bullets but summary has 3'));
});

test('AI output without the en block is rejected (schema v3 requires it)', async () => {
  const { en: _, ...noEn } = result.analysis;
  await assert.rejects(
    analyzeNotice(notice, { name: 'fake', model: 'fake', generateJson: async () => ({ text: JSON.stringify(noEn), model: 'fake', incomplete: false, stopReason: 'STOP' }) }),
    /does not match schema/,
  );
});
