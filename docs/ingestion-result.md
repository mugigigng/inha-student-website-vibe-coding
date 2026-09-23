# Ingestion pipeline: real-data verification (2026-09-23)

```
www.inha.ac.kr 공지사항 list page → article pages → new/updated detection (SQLite) → Gemini (only when needed) → notice_analysis
```

Command: `npm run ingest [-- --pages N] [--limit N] [--no-ai]`

## How it decides what to do

| Step | Mechanism (plain code/SQL, no AI) |
|---|---|
| Find notices | `listNotices()` parses `/bbs/kr/8/artclList.do?page=N`; IDs from `a.artclLinkView` hrefs; pinned rows deduped |
| New? | `UNIQUE(source, source_notice_id)` lookup |
| Updated? | SHA-256 of the extracted body text (`content_hash`) + title comparison. The site has no usable modified date: 수정일 is commented out in the HTML and the list shows only the post date |
| Needs AI? | Only if no `notice_analysis` row has `content_hash` = the notice's current `content_hash` |
| On update | Row refreshed to the current official text, `content_updated_at` set; old analyses **kept but stale** (hash mismatch) |
| On AI failure | Notice row kept; stays "pending" and is retried on the next run |

## Gemini usage controls

- No SDK-level retries (they silently re-hit a rate-limited model 4 times). Every request is logged as `[AI] Gemini request made (model=…)` and counted.
- On 429/503 a model is **benched**: 30 s for 503, Google's `retryDelay` for 429, or **until midnight Pacific time** for the daily quota. Benched models are skipped instead of retried on every notice.
- Daily-quota benches are saved to `data/gemini-cooldown.json`, so the next run makes **0 requests** instead of re-discovering the limit.
- The pipeline stops AI for the rest of a run on quota, bad key/model, or 3 consecutive overloads. Remaining notices are stored and **deferred**.
- `INGEST_AI_DELAY_MS` (default 4000) spaces AI calls for the free tier's per-minute limit.

## Real runs (list page 1: 27 notices = 12 pinned + 15 regular)

| Run | Before (notices / analyses / current / pending) | new | updated | unchanged | crawl failed | analyzed | Gemini requests | After |
|---|---|---|---|---|---|---|---|---|
| 1 (old Gemini layer, stopped early) | 1 / 4 / 1 / 0 | 17 | 0 | 0 | 0 | 6 | ~40+ (hidden SDK retries) | 18 / 10 / 7 / 11 |
| 2 (optimized) | 18 / 10 / 7 / 11 | 8 | 0 | 18 | 1 | 0 | 3 (daily quota hit) | 26 / 10 / 7 / 19 |
| 3 | 26 / 10 / 7 / 19 | 0 | 0 | 26 | 1 | 0 | 3 | same |
| 4 (after bench-until-midnight change) | same | 0 | 0 | 26 | 1 | 0 | 3 | same |
| 5 | same | 0 | 0 | 26 | 1 | 0 | **0** | same |
| 6 (benched = deferred fix) | same | 0 | 0 | 26 | 1 | 0 | **0** | same |

- **Idempotency:** runs 3–6 inserted 0 notices and 0 analyses, and the 7 analyzed notices were skipped each time with no Gemini request.
- **Real crawl failure:** 45616 (PSAT 특강) is a poster-only notice (0 chars of text) → `EmptyContentError`, logged, run continued.
- **Real AI failures:** in run 1, 5 notices failed with 503/429 after fallbacks. Their rows were kept and they are now `pending`.
- **Fallbacks used in run 1:** 3.8 → 3.7 → 3.6 on most notices; saved analyses came from all three models.
- **Gemini free-tier daily quota** was exhausted for all three Flash models on 2026-09-23 (earlier POC runs plus run 1). **19 notices are pending** and will be analyzed on the first run after 00:00 PT (07:00 UTC).

### Update detection (real site, copy of the DB)

The stored text of 45601 (and its analyses' hash) was set to an "older version" with a different deadline in a **copy** of the DB, then ingestion ran against the live site:
`[UPDATE] Notice 45601 changed (content)` → row refreshed to the live text, `content_updated_at` set, all 4 old analyses kept and marked stale, notice queued for re-analysis, no duplicate, 0 requests (benched).

## Spot-check of the 6 new analyses

| Notice | Extracted | Verdict |
|---|---|---|
| 45523 학생 강사 모집 | start null, deadline 10-13 ("10월 13일(화) 까지") | ✅ no invented start date |
| 45307 실태조사 | 09-08 → 09-29 | ✅ |
| 45272 만족도 조사 | 09-01 → 09-30 | ✅ (category 학사 is debatable for a survey) |
| 45549 / 45537 직무박람회 | all dates null | ✅ correct for the schema, but the **event date (9/30) has no field** |
| 45242 AI역량검사 | applicationStart 2025-04-01 | ⚠️ that's a *service* period ("서비스 기간 : 2025.4.1. ~"), not an application period |

## Known limitations

- Every run fetches every listed article (the site gives no modified date), about 28 requests to inha.ac.kr per page, spaced 300 ms apart.
- Title-only edits update the row but don't trigger re-analysis (the AI input hash is body-only).
- Poster-only notices are skipped (`EmptyContentError`); they need OCR.
- `npm run ingest` exits with code 2 whenever any notice failed, including the permanent poster-only one.
- The free-tier daily quota is the real bottleneck: about 20–25 analyses before it was exhausted today.

## Prompt v2 + `eventDate` (2026-09-23)

**Schema:** new `eventDate` (plus `evidence.eventDate`) = the day the event itself happens (행사/특강/박람회/설명회/시험…), first day if multi-day, null if no event. Stored in `notice_analysis.event_date`. v1 rows keep NULL there.

**Prompt v2 (`PROMPT_VERSION = 'v2'`) targets the errors found so far:**

| Problem seen with v1 | v2 rule |
|---|---|
| 45242: 서비스 기간 stored as applicationStart | 서비스/운영/이용/교육/활동 기간 are not application periods |
| Job fair (45549): event date had no field | `eventDate`; an application deadline is never an eventDate |
| 45601: 이수 → 수료, 이수예정자 dropped, exclusions dropped, "정규" added | exact terms, no near-synonyms, all exclusions, no unstated conditions, in `target` **and** `easyExplanation` |
| OpenRouter run: 1-bullet summary, no attachment flag | 3–6 bullets with what/who/when/how; always flag unseen attachments |
| `target` included "3명 내외" | eligibility only, no headcounts |
| evidence was a bare date | evidence quotes the labelled line, e.g. `[모집기간] 2026.09.28(월) ~ 2026.10.16(금)` |

**New code checks** (stored as validation warnings, never silently accepted): `eventDate` needs a verbatim quote like the other dates; an `eventDate` before the `deadline` is flagged; a summary outside 3–6 bullets is flagged.

**Live check:** `gemini-3.5-flash` on a DB copy. The fallback chain (3.8/3.7/3.6) was benched on its daily quota, so this used a separate Gemini model with its own quota.

| Notice | v1 result | v2 result |
|---|---|---|
| 45549 직무박람회 | no place for the event date | ✅ `eventDate: 2026-09-30T14:00`, evidence `- 일시: 2026.9.30.(수), 14시~17시`; application dates null |
| 45242 JOBDA 제휴 | ❌ applicationStart 2025-04-01 (service period) | ✅ all application dates null; `uncertain` explains the 2025.4.1 service start was deliberately not used |
| 45601 창업꿈나무 | target/explanation drifted (수료, 수강, 정규; exclusions dropped) | ✅ exact `4학기이상 이수한자, 창업강좌 이수자 or 이수예정자`, all 4 exclusions in target **and** explanation, labelled evidence |

Remaining nit: the 45549 explanation says "누구나 참여" ("anyone can join"); the notice only says it's aimed at 취업준비생. All 3 results had 0 validation warnings. Two of the three calls got one 503 first; the 30 s bench + single wait handled it.

**Existing v1 analyses are not re-run automatically** (that would spend quota). To upgrade them: `npm run ingest -- --upgrade-prompt` (7 requests for the 7 v1-analyzed notices, on top of the 19 pending ones).
