# POC result: real Inha notice → crawler → DB → AI → DB

**Status (2026-09-23): SUCCESS.** All steps ran end to end on real data. The key dates are correct; one wording error in `easyExplanation` is documented below.

| Definition of Done | Result |
|---|---|
| Real public Inha notice fetched | ✅ |
| Original content extracted | ✅ 574 chars of clean text |
| Notice stored in DB | ✅ `notices.id=1` |
| Content processed by an LLM | ✅ Gemini `gemini-3.8-flash`, then OpenRouter `openrouter/free` (both free tier; Gemini is the default again) |
| Structured result returned | ✅ schema-valid JSON, first try |
| Analysis stored separately | ✅ `notice_analysis.id=1–3`; `notices` row untouched |
| Duplicate insertion prevented | ✅ re-run → no new rows, no second AI call |
| Errors handled clearly | ✅ live and offline (see below) |
| Result retrievable | ✅ `npm run show` |
| Tested with real data | ✅ |

## Source tested

https://www.inha.ac.kr/bbs/kr/8/45601/artclView.do: `[창업지원단][대학혁신지원사업] 창업꿈나무 장학금 접수 안내(학부)`, published 2026-09-22. Details: [notice-sources.md](notice-sources.md).

## Crawling result

| | |
|---|---|
| HTTP | 200, HTML, no login; `robots.txt` allows all |
| Extracted | title, 작성일 `2026-09-22`, 분류 `모집/채용`, author, 574 chars / 23 lines of body text |
| Kept for re-parsing | body HTML (47,353 chars) in `raw_html` |
| Recorded, not parsed | poster `2026-2_창업꿈나무_포스터_고해상도.png`, image `2hdfi.jpg`, form `창업꿈나무 장학금 지원신청서.hwp` |

Key source text (verbatim):

```
[모집기간] 2026.09.28(월) ~ 2026.10.16(금)
[지원대상]
▪ 4학기이상 이수한자
▪ 창업강좌 이수자 or 이수예정자
※기 수혜자, 휴학 및 부분 등록자, 수료자는 불가
[모집 규모] 3명 내외
[운영일정]
▪ 서류평가: 2026.10.19(월) ~ 2026.10.30(금)
▪ 최종발표: 2026.11.06(금) 개별 연락
...
※ 우편접수는 접수기간 마감일 소인분까지 인정
```

## AI result (stored as `notice_analysis.id=1`)

Provider `gemini`, model `gemini-3.8-flash`, prompt `v1`, temperature 0, JSON-schema-constrained output.

```json
{
  "category": "장학금",
  "applicationStart": "2026-09-28",
  "applicationEnd": "2026-10-16",
  "deadline": "2026-10-16",
  "target": "4학기 이상 이수한 자 중 창업강좌 이수자 또는 이수예정자 (기 수혜자, 휴학 및 부분 등록자, 수료자 제외)",
  "summary": [
    "대학혁신지원사업의 일환으로 창업 마일리지 점수에 따라 창업꿈나무 장학생 선발 (3명 내외)",
    "모집기간: 2026.09.28(월) ~ 2026.10.16(금)",
    "지원자격: 4학기 이상 이수자 및 창업강좌 이수(예정)자 (휴학/부분등록/수료/기수혜자 불가)",
    "제출방법: 인하대학교 본관 창업지원단 방문 접수 또는 우편 접수(마감일 소인분 유효)",
    "운영일정: 서류평가(10.19~10.30) 후 2026.11.06(금) 최종 개별 발표"
  ],
  "easyExplanation": "창업지원단 프로그램에 참여해 창업 마일리지를 쌓은 학부생을 위한 장학금입니다. 4학기 이상 수료하고 창업강좌를 들었거나 듣고 있는 재학생 3명 내외를 선발하며, 신청서와 증빙서류를 준비해 방문하거나 우편으로 접수해야 합니다.",
  "evidence": { "applicationStart": "2026.09.28", "applicationEnd": "2026.10.16", "deadline": "2026.10.16" },
  "uncertain": [{ "field": "summary", "reason": "첨부된 포스터 이미지 및 지원신청서 양식 파일의 세부 내용은 확인할 수 없습니다." }]
}
```

Automatic validation: all 3 dates are well-formed, and each evidence quote was found verbatim in the notice. `validation_warnings = []`.

## Verification against the original notice (Step 5)

| Field | Expected (from notice) | AI | Verdict |
|---|---|---|---|
| category | 장학금 (the board label `모집/채용` is misleading) | 장학금 | ✅ correctly ignored the board label |
| applicationStart | 2026-09-28 | 2026-09-28 | ✅ |
| applicationEnd | 2026-10-16 | 2026-10-16 | ✅ |
| deadline | 2026-10-16, not 10-30 (review) or 11-06 (announcement) | 2026-10-16 | ✅ avoided both trap dates |
| target | ≥4 semesters **and** 창업강좌 taken or planned; excludes 기 수혜자, 휴학, 부분 등록자, 수료자 | same, all 4 exclusions kept | ✅ (see note 1) |
| summary | selection by 마일리지, ~3 people, period, eligibility, submission method, schedule | all present, dates correct, postmark rule kept | ✅ |
| uncertain | should flag the unseen poster and form | flagged | ✅ |
| easyExplanation | plain restatement | **"4학기 이상 수료하고"** | ⚠️ **wording error** (note 2) |

**Note 1: `target` is slightly interpreted.** The notice lists the two conditions as separate bullets. The AI joined them with "중" (meaning both apply). That's the natural reading, but the notice doesn't say so explicitly. It also leaves out "학부", which appears only in the title.

**Note 2: `easyExplanation` misuses 수료.** The notice says **이수** (completed 4 semesters) and explicitly **excludes 수료자** (students who have finished all coursework but not graduated). The explanation says "4학기 이상 **수료**하고", which inverts the meaning for exactly the excluded group. It also calls applicants "재학생" (currently enrolled). The notice doesn't say that directly, though it's implied by the 재학증명서 (proof of enrollment) requirement and the exclusions. **Takeaway:** the structured fields are reliable here, but the free-text explanation can drift. It should be shown as "AI 요약" (AI summary) next to the original text, never on its own.

**Minor:** the evidence quotes are just the date strings ("2026.10.16") rather than the labelled line (`[모집기간] …`). They are verbatim, but on their own they don't show which label the date came from.

## Second run: consistency check (`--reanalyze`, stored as `notice_analysis.id=2`)

Same model and prompt, run about 10 minutes later.

| Field | Run 1 | Run 2 | Note |
|---|---|---|---|
| category / dates | 장학금, 09-28 → 10-16, deadline 10-16 | **identical** | ✅ structured fields stable |
| evidence | `2026.10.16` | `2026.10.16(금)` | ✅ slightly better (includes weekday) |
| target | all 4 exclusions | all 4 exclusions | ✅ |
| summary | includes review/announcement schedule | includes the submitted-documents list; the eligibility bullet keeps only 휴학/부분등록 and **drops 기 수혜자 and 수료자** | ⚠️ minor omission (`target` still has all 4) |
| easyExplanation | "4학기 이상 **수료**" ❌ | "4학기 이상 **이수**" ✅, but says "창업 강좌를 **수강하고**" (took the course), omitting students who only *plan to* take it (이수예정자), and adds "**정규** 재학생" (regular enrolled student), which the notice doesn't say | ⚠️ different drift |

**Conclusion:** dates, category and target were identical and correct in both runs. The free-text fields (`summary`, `easyExplanation`) vary between runs and each run had a different small accuracy problem. That confirms: show the structured fields and dates as data, and label the free text as an AI summary, always linked to the original.

## Third run: migrated to OpenRouter (`notice_analysis.id=3`)

The Gemini provider was replaced by OpenRouter (`src/ai/openrouter.ts`, plain `fetch` to `https://openrouter.ai/api/v1/chat/completions`). The prompt, schema, validation, crawler and DB are unchanged. Request: `model: openrouter/free`, `response_format: json_schema (strict)`, `provider.require_parameters: true`.

| | |
|---|---|
| Connection | ✅ HTTP 200 on the first attempt, ~5 s, no retries |
| Model actually used | `nex-agi/nex-n2.5-mini:free` (chosen at random by the free router from free models that support structured output) |
| Structured JSON | ✅ schema-valid; all dates backed by verbatim quotes (`validation_warnings = []`) |
| Free-tier limit | not hit: 1 request (limit is 20/min, 50/day); key `is_free_tier: true`, `usage: 0` (no charges) |

```json
{
  "category": "장학금",
  "applicationStart": "2026-09-28",
  "applicationEnd": "2026-10-16",
  "deadline": "2026-10-16",
  "target": "4학기 이상 이수했고 창업강좌를 이수했거나 이수예정인 학부생(3명 내외). 기수혜자, 휴학자, 부분등록자, 수료자는 지원 불가",
  "summary": ["창업마일리지 점수에 따라 학부생을 장학생으로 선발합니다."],
  "easyExplanation": "2026년 9월 28일부터 10월 16일까지 신청합니다. 우편접수는 10월 16일 마감일 소인분까지 인정됩니다.",
  "evidence": { "applicationStart": "2026.09.28(월)", "applicationEnd": "2026.10.16(금)", "deadline": "2026.10.16(금)" },
  "uncertain": []
}
```

### Compared with Gemini (runs 1 and 2)

| Field | Gemini `gemini-3.8-flash` | OpenRouter `nex-n2.5-mini:free` | Verdict |
|---|---|---|---|
| category, dates, deadline | 장학금, 09-28 → 10-16, deadline 10-16 | **identical** | ✅ all 3 runs agree and match the notice |
| target | all 4 exclusions | all 4 exclusions, **and** says 학부생 and uses 이수/이수예정 correctly | ✅ best of the three, but it includes "3명 내외" (number selected), which isn't eligibility |
| summary | 5 bullets | **1 bullet** | ❌ the prompt asks for 3–6; it omits eligibility, documents and submission method |
| easyExplanation | explains what the scholarship is (with wording drift) | only restates dates and the postmark rule; doesn't explain what the scholarship is or who can apply | ⚠️ accurate but not useful |
| uncertain | flagged the unseen poster/.hwp | **empty**, although the prompt lists the unseen attachments | ❌ missed |

**Takeaway:** the structured fields (dates, category, target) were correct with every model tested. Quality differences show up only in the free text. `openrouter/free` picks a **different random model per request**, so quality and behavior will vary from run to run. For consistent results, pin one free model with `OPENROUTER_MODEL=<vendor>/<model>:free` after comparing a few. The stored `model` column records which one answered.

## Fourth run: back on Gemini (`notice_analysis.id=4`)

We switched the default provider back to Gemini, because OpenRouter's free tier is capped at 50 requests/day. OpenRouter stays available with `AI_PROVIDER=openrouter`. On this run `gemini-3.8-flash` and `gemini-3.7-flash` both returned 503, and **the fallback chain answered with `gemini-3.6-flash`**.

- Dates, category and deadline: identical to all earlier runs ✅
- target: includes 학부 재학생 and all 4 exclusions ✅ (best Gemini target so far)
- summary: 5 useful bullets, including documents and submission method ✅. The eligibility bullet leaves out 부분 등록자 ⚠️
- easyExplanation: says "창업강좌를 **수강한**" (took the course), omitting students who only plan to take it (이수예정자), and names only 2 of the 4 exclusions ⚠️
- uncertain: flags the unseen .hwp and poster ✅

## Database result

```
notices          1 row   (id=1, source=inha-main-notice, source_notice_id=45601, content_hash=7c09e0ce…)
notice_analysis  4 rows  (all notice_id=1, prompt_version=v1)
                 id=1, id=2: provider=gemini, model=gemini-3.8-flash
                 id=3:       provider=openrouter, model=nex-agi/nex-n2.5-mini:free
                 id=4:       provider=gemini, model=gemini-3.6-flash (fallback)
```

The analysis only references the notice through `notice_id`. `original_content`, `raw_html` and `content_hash` in `notices` were never modified.

## Duplicate handling

Dedup key: `UNIQUE(source, source_notice_id)`. The board's article number is stable and doesn't depend on URL variants.

- Re-running `npm run poc` on the same URL prints `DUPLICATE … No new row inserted`, then `Analysis already exists; skipping the AI call`. Counts stay 1 and 1.
- If the page content changes, the duplicate message says so. The original is kept, not overwritten.

## Error handling

| Case | How verified | Result |
|---|---|---|
| Invalid / non-Inha URL | live | `InvalidResponseError` |
| Deleted notice | live (`/8/99999999/`) | `InvalidResponseError`; the site returns 200 without the article markup |
| AI API failure | **live**, 3 real cases: missing key; Anthropic `400 credit balance too low`; Gemini `503 high demand` | `AiApiError`; the notice row survives every time |
| Duplicate | live | handled, no new rows |
| Network failure | offline test | `NetworkError` |
| Empty content | offline test | `EmptyContentError` |
| Invalid AI JSON: non-JSON, schema mismatch, truncated | offline tests | `InvalidAiJsonError` with the raw output kept |
| Date without verbatim evidence | offline test | stored as a validation warning |

`npm test`: 12/12 pass (including Gemini fallback and OpenRouter adapter tests).

## Problems encountered

1. **Anthropic API account had no credits.** The request was rejected with `400 credit balance too low`, even after the purchase and 5 minutes of retries (likely a claude.ai subscription or a different org/workspace). We switched to Gemini's free tier through a provider-agnostic interface (`AI_PROVIDER=gemini|anthropic`).
2. **Gemini free tier often returns `503 high demand`.** The first run failed; after adding SDK retries (4 attempts, exponential backoff) the next run succeeded. A later `--reanalyze` failed again even with retries. We added a fallback model chain (`gemini-3.8-flash` → `gemini-3.7-flash` → `gemini-3.6-flash`, set by `GEMINI_FALLBACK_MODELS`), but at that moment all three were overloaded. `gemini-2.5-flash` is listed by the API but returns 404 ("no longer available to new users"). **The free tier's availability can't be relied on; a paid tier or a second provider is needed for anything scheduled.**
3. The free-text `easyExplanation` misused 수료 (note 2 above).
4. The notice includes a poster image and an `.hwp` form that aren't read.

## Limitations

- One source, one notice. Accuracy on a sample of 1 says little about accuracy in general.
- Text only: no OCR of posters, no `.hwp` parsing. Notices that exist only as a poster will fail with `EmptyContentError`.
- **Free tiers (Gemini earlier, OpenRouter now):** low rate limits (OpenRouter: 20/min, 50/day), availability spikes, and free-model providers may log or train on prompts. That's acceptable for public notices, not for student data.
- `openrouter/free` routes each request to a random free model, so results aren't reproducible between runs unless a model is pinned.
- Selectors are tied to the current `www.inha.ac.kr` CMS layout.
- The Anthropic provider is implemented and typechecked, and provider selection is tested, but it has never made a successful live call (blocked by credits).

## Recommended next step

1. **Accuracy on more notices:** run ~10–20 varied notices from the same board (no dates, dates without a year, poster-heavy, multiple deadlines) and score each field against hand-checked answers, like the table above.
2. **Tighten the prompt (v2):** forbid replacing source terms like 이수 with other terms like 수료 in `easyExplanation`, and ask for evidence quotes that include the label (`[모집기간] …`).
3. **New-notice detection:** crawl the board list page (`/kr/950/subview.do`), take new article IDs, and feed them through the same pipeline.
4. Only then: an API endpoint plus a simple UI showing each notice with its source link, crawl date, and AI fields marked as AI output.
