import { z } from 'zod';
import { createProvider, type AiProvider } from './ai/index.ts';
import { CATEGORIES } from './categories.ts';
import { InvalidAiJsonError } from './errors.ts';
import type { RawNotice } from './types.ts';

export const PROMPT_VERSION = 'v3';

const DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
const nullableDate = z.string().nullable().describe('YYYY-MM-DD, or YYYY-MM-DDTHH:mm if a time is stated. null if not stated.');

// The user-requested fields, plus `evidence` and `uncertain` so extracted facts
// can be told apart from inferred/uncertain ones.
export const AnalysisSchema = z.object({
  category: z.enum(CATEGORIES),
  applicationStart: nullableDate,
  applicationEnd: nullableDate,
  deadline: nullableDate,
  eventDate: nullableDate.describe(
    'Date the event itself happens (행사/특강/박람회/설명회/시험/면접 etc.), YYYY-MM-DD or YYYY-MM-DDTHH:mm. First day if it spans several days. null if the notice has no event.',
  ),
  target: z.string().describe('Eligibility only (who may apply / attend), in Korean, using the notice\'s exact terms and ALL exclusions. No quotas or headcounts.'),
  summary: z.array(z.string()).describe('3-6 short Korean bullet points of the key facts.'),
  easyExplanation: z.string().describe('2-3 plain Korean sentences a first-year student understands.'),
  evidence: z
    .object({
      applicationStart: z.string().nullable(),
      applicationEnd: z.string().nullable(),
      deadline: z.string().nullable(),
      eventDate: z.string().nullable(),
    })
    .describe('For each non-null date: the exact substring of the notice it came from, copied verbatim. null when the date is null.'),
  uncertain: z
    .array(z.object({ field: z.string(), reason: z.string() }))
    .describe('Fields that were inferred, ambiguous, or only partly supported by the text. Empty if none.'),
  // English rendering of the Korean free-text fields, produced in the SAME call (prompt v3+).
  // Korean stays the source of truth; dates/category are structured and never translated here.
  en: z
    .object({
      title: z.string().describe('English translation of the notice title.'),
      summary: z.array(z.string()).describe('English translation of `summary`: same number of bullets, same order.'),
      easyExplanation: z.string().describe('English translation of `easyExplanation`.'),
      target: z.string().describe('English translation of `target`, keeping every condition and exclusion.'),
      eventInfo: z
        .string()
        .nullable()
        .describe('One short English line saying what the event is and where, if the notice has an event (eventDate not null). null otherwise. No dates.'),
    })
    .describe('English translations for international students. Translate faithfully; add nothing.'),
});
export type Analysis = z.infer<typeof AnalysisSchema>;
export type AnalysisEn = Analysis['en'];

const { $schema: _, ...ANALYSIS_JSON_SCHEMA } = z.toJSONSchema(AnalysisSchema);

const SYSTEM = `You extract structured data from official Inha University (인하대학교) notices for a student calendar. Students will act on your dates, so a wrong date is worse than null.

## Dates
- Use ONLY the notice text. Never invent or guess a date. If it is not written, return null.
- Format YYYY-MM-DD; add THH:mm only if a time is written. If the year is omitted, infer it from the publication date and list that field in "uncertain".
- applicationStart / applicationEnd: the period in which the student must ACT — apply, register, submit, or respond (모집기간, 접수기간, 신청기간, 응답기간, 제출기간).
  - These are NOT application periods: 서비스 기간, 운영 기간, 이용 기간, 교육 기간, 활동 기간, 사업 기간 (when something runs or is available). Do not put them in applicationStart/End.
  - If only an end is written ("10월 13일까지"), applicationStart is null.
- deadline: the last moment the student must act (usually = applicationEnd). Never use review, interview or result dates (서류평가, 면접, 최종발표, 결과 발표) as the deadline.
- eventDate: the day the event itself takes place (행사, 특강, 박람회, 설명회, 포럼, 시험, 대회 본선 등). First day if it spans several days (list the full range in "uncertain"). null if there is no event. An application deadline is never an eventDate.
- evidence: for each non-null date, copy the source line verbatim INCLUDING its label, e.g. "[모집기간] 2026.09.28(월) ~ 2026.10.16(금)". null when the date is null.

## target (eligibility)
- Only who may apply or attend. Do not include how many are selected (e.g. "3명 내외") or benefits.
- Use the notice's exact terms. Do not substitute near-synonyms: 이수 ≠ 수료, 이수자 ≠ 수강생, 재학생 ≠ 학생. Keep "이수예정자" (planning to take) when present.
- Include EVERY exclusion (e.g. 기 수혜자, 휴학생, 부분 등록자, 수료자 불가).
- Do not add conditions that are not written (e.g. do not add "정규" or "재학생" unless stated).

## summary and easyExplanation (Korean)
- summary: 3–6 bullets covering what it is, who can apply, when (dates), how to apply/submit, and what to submit if listed.
- easyExplanation: 2–3 plain sentences a first-year student understands: what it is, who can apply (with the same eligibility terms and exclusions as target), and by when.
- Plain wording must not change meaning; when unsure, reuse the notice's wording.

## uncertain
- If attachments or images are listed as not visible to you, ALWAYS add an entry saying their content could not be checked.
- Add an entry for any inferred year, ambiguous date, or interpretation you made.

## Language of each field
- Every field OUTSIDE "en" is written in Korean — including uncertain[].reason. English appears ONLY inside "en".

## en (English translation)
- Translate the Korean title, summary, easyExplanation and target into natural English for international students. The Korean fields remain the source of truth: translate them faithfully, adding or dropping nothing.
- summary: exactly the same number of bullets in the same order as the Korean summary.
- Keep eligibility precise and add the Korean term in parentheses where a student might need it, e.g. "completed 4+ semesters (이수)", "students who have completed all coursework but not graduated (수료자) are not eligible".
- Keep names of offices, programs and places recognisable: translate, then give the Korean in parentheses the first time, e.g. "Startup Support Foundation (창업지원단)".
- Do not write dates or D-days in the English text beyond what the Korean sentence says; the app shows dates from the structured fields.
- eventInfo: only when eventDate is not null — what the event is and where, one line, no dates. Otherwise null.`;

export interface AnalysisResult {
  analysis: Analysis;
  rawResponse: string;
  /** Problems our own code found after the model answered (not the model's opinion). */
  validationWarnings: string[];
  provider: string;
  model: string;
}

export async function analyzeNotice(notice: RawNotice, provider: AiProvider = createProvider()): Promise<AnalysisResult> {
  const attachmentNote = notice.attachments.length
    ? `\n\n[Not visible to you: ${notice.attachments.map((a) => `${a.kind} "${a.name}"`).join(', ')}]`
    : '';
  const user =
    `제목: ${notice.title}\n게시일(publication date): ${notice.publishedAt ?? 'unknown'}\n` +
    `게시판 분류: ${notice.boardCategory ?? 'unknown'}\n\n본문:\n${notice.originalContent}${attachmentNote}`;

  const res = await provider.generateJson({ system: SYSTEM, user, jsonSchema: ANALYSIS_JSON_SCHEMA });
  if (res.incomplete) {
    throw new InvalidAiJsonError(`${provider.name} stopped early (${res.stopReason}); output is not usable`, res.text);
  }

  let json: unknown;
  try {
    json = JSON.parse(res.text);
  } catch (err) {
    throw new InvalidAiJsonError(`${provider.name} returned text that is not JSON: ${(err as Error).message}`, res.text, { cause: err });
  }
  const parsed = AnalysisSchema.safeParse(json);
  if (!parsed.success) {
    throw new InvalidAiJsonError(`${provider.name} JSON does not match schema: ${z.prettifyError(parsed.error)}`, res.text);
  }

  return {
    analysis: parsed.data,
    rawResponse: res.text,
    validationWarnings: checkAgainstSource(parsed.data, notice.originalContent),
    provider: provider.name,
    model: res.model,
  };
}

/** Cheap hallucination guard: every returned date must be well-formed and backed by a verbatim quote. */
function checkAgainstSource(a: Analysis, content: string): string[] {
  const warnings: string[] = [];
  const squash = (s: string) => s.replace(/\s+/g, '');
  for (const field of ['applicationStart', 'applicationEnd', 'deadline', 'eventDate'] as const) {
    const value = a[field];
    const quote = a.evidence[field];
    if (value === null) continue;
    if (!DATE.test(value)) warnings.push(`${field}="${value}" is not YYYY-MM-DD[THH:mm]`);
    if (!quote) warnings.push(`${field} has a date but no evidence quote`);
    else if (!squash(content).includes(squash(quote))) warnings.push(`${field} evidence "${quote}" not found verbatim in notice`);
  }
  if (a.applicationStart && a.applicationEnd && a.applicationStart > a.applicationEnd) {
    warnings.push('applicationStart is after applicationEnd');
  }
  if (a.eventDate && a.deadline && a.eventDate.slice(0, 10) < a.deadline.slice(0, 10)) {
    warnings.push(`eventDate ${a.eventDate} is before the deadline ${a.deadline}; check which is which`);
  }
  if (a.summary.length < 3 || a.summary.length > 6) warnings.push(`summary has ${a.summary.length} bullets (expected 3-6)`);
  if (a.en.summary.length !== a.summary.length) {
    warnings.push(`en.summary has ${a.en.summary.length} bullets but summary has ${a.summary.length}`);
  }
  if (a.eventDate === null && a.en.eventInfo !== null) warnings.push('en.eventInfo is set but eventDate is null');
  return warnings;
}
