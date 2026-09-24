# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

The repo now contains a **backend-only proof of concept** (no frontend yet): crawl one real Inha notice, store it in SQLite, analyze it with an LLM, store the analysis separately. Results and limitations are in [`docs/poc-result.md`](docs/poc-result.md); crawl sources are in [`docs/notice-sources.md`](docs/notice-sources.md).

Stack: Node 26 + TypeScript (run with `tsx`, no build step), `cheerio`, built-in `node:sqlite`, `zod`. The LLM is provider-agnostic (`src/ai/`): Gemini via `@google/genai` by default (free tier, with a fallback-model chain); OpenRouter (plain `fetch`) and Anthropic (`@anthropic-ai/sdk`) are alternatives. A future frontend is expected to be React + Vite (see [SKILLS.md](SKILLS.md)).

### Commands

```bash
npm install
cp .env.example .env            # then set GEMINI_API_KEY (never commit .env)
npm run crawl -- <notice-url>   # fetch + parse only, no DB/AI
npm run poc   -- <notice-url>   # crawl -> DB -> AI -> DB -> print; add --reanalyze to force a new AI run
npm run show  [-- <notice-id>]  # print stored notices + latest analysis
npm run ingest [-- --pages N] [--limit N] [--no-ai] [--upgrade-prompt]   # real pipeline: list -> new/updated detection -> DB -> Gemini only where needed; --upgrade-prompt also re-runs analyses from an older PROMPT_VERSION
npm test                        # offline error-handling tests (node:test)
npm run dev                     # API (:8787, read-only) + web (Vite :5173, proxies /api)
npm run build:web               # production build to dist/web
npm run deploy                  # static snapshot (export DB -> JSON + build) pushed to gh-pages -> GitHub Pages
npm run typecheck
```

DB file: `data/poc.db` (gitignored; override with `POC_DB_PATH`). AI: `AI_PROVIDER=gemini` (default, model `gemini-3.8-flash`, fallbacks via `GEMINI_FALLBACK_MODELS`), `openrouter` (`openrouter/free`) or `AI_PROVIDER=anthropic` (`claude-sonnet-5`, override `ANTHROPIC_MODEL`).

### Architecture

- `src/sources/*.ts`: one module per notice board, each returning a `RawNotice` (`src/types.ts`). Add new Inha sources here.
- `src/db.ts`: `notices` holds the original crawled data and is never modified by the AI. `notice_analysis` holds AI output, one row per run, with model and prompt version. Dedup is `UNIQUE(source, source_notice_id)`.
- `src/ai/`: the `AiProvider` interface (prompt + JSON Schema in, raw text out) and one file per provider. Providers only send and receive; they never validate.
- `src/analyze.ts`: provider-neutral prompt, Zod schema (also converted to JSON Schema for the provider), JSON parsing and schema validation, and the evidence check (every date must come with a verbatim quote from the notice).
- `src/ingest.ts`: the ingestion loop (dependencies injected, so it can be tested). Per notice: fetch → `upsertNotice` (new/updated/unchanged by `content_hash` + title) → AI only if `hasCurrentAnalysis` is false. One failure never stops the run. Quota, bad key or model, or 3 overloads in a row stop AI for that run; the remaining notices are deferred (`pending`) to the next run.
- An analysis is **current** when `notice_analysis.content_hash = notices.content_hash`. Stale analyses are kept, never deleted. Bump `PROMPT_VERSION` in `src/analyze.ts` whenever the prompt or schema changes; old analyses stay current until re-run with `--upgrade-prompt`.
- `src/ai/gemini.ts`: no SDK retries; fallback chain with per-model cooldowns. Daily-quota cooldowns last until midnight PT and are saved to `data/gemini-cooldown.json`.
- `src/errors.ts`: one error class per failure mode; `src/cli.ts` prints them and never swallows them.
- Results: `docs/poc-result.md` (single notice), `docs/ingestion-result.md` (pipeline).

### Web frontend (`web/`)

- React 19 + Vite + react-router, Lenis smooth scroll. Talks only to `src/server.ts` (`GET /api/notices`, `GET /api/notices/:id`): plain `node:http`, read-only, never calls the AI.
- Response types live in `src/api/types.ts` and are imported by the web app through the `@shared` alias. **Only type imports or dependency-free modules** (`src/categories.ts`) may be imported from `@shared`, so backend and AI code never reach the browser bundle.
- `analysisStatus` is `ready | stale | pending`. The UI must show pending/stale honestly and always link the original notice.
- Pages: `/` list (filter/sort in the URL query), `/notifications`, `/profile`, `/notices/:id` detail (each date shows its source quote; "캘린더에 추가" saves the notice to the in-app calendar, i.e. saved notice ids in localStorage via `web/src/lib/saved.tsx`; a secondary link still exports an `.ics` built in `web/src/lib/ics.ts`), `/calendar?month=YYYY-MM[&view=mine]` (deadline = black chip, event = blue outlined chip, prefix text from translations via `data-prefix`; saved notices are marked ★ and `view=mine` shows only them; dots + agenda list on narrow screens).
- Calendar entries come from `web/src/lib/events.ts`: deadline = `deadline ?? applicationEnd`, event = `eventDate`. Pending notices have no entries. Pure calendar logic (grid, grouping, next date, notice→day) lives in `web/src/lib/calendar.ts` and is unit-tested in `test/calendar.test.ts`.
- Notice ↔ Calendar: detail "캘린더에서 보기" → `/calendar?month=&date=&notice=`, which opens on the notice's upcoming deadline, else its upcoming event, else its last date, with that notice highlighted. Calendar links pass `state.from`, so the detail back link returns to the same calendar view. Calendar state (month, selected day, highlighted notice) lives in the URL.
- **Personalization = priority, not access.** `src/profile.ts` (Profile type and validation), `src/inhaCatalog.ts` (colleges and majors copied from the official college pages), `src/match.ts` (`matchNotice()`: deterministic score, level and Korean reasons from `category`, `target` and title; **no AI**). All three are dependency-free and shared by web and backend. `web/src/lib/personalize.ts` `buildHome()` gives `forYou` (high/medium, still open), `upcoming` (next 30 days, excluding `none`) and `all` (**always every notice, never filtered**). Profile lives in localStorage (`web/src/lib/profile.tsx`, no accounts). `/profile` edits it.
- Notification foundation: `ingest({ onAnalyzed })` is called after each saved analysis; the CLI matches it against optional `data/profiles.json` (`[{id, profile}]`, gitignored) through `notificationCandidates()` and only logs `[MATCH]`. Nothing is sent.
- `API_PORT` sets both the API server port and the Vite proxy target, e.g. to run a second API against another DB copy.
- **Deploy = static snapshot on GitHub Pages** (`scripts/deploy-pages.sh`): `src/export.ts` writes the API responses to `api/notices.json` and `api/notices/<id>.json`; the web build with `VITE_STATIC_API=1` + `VITE_BASE=/<repo>/` reads those instead of the server. `404.html` = `index.html` for deep links. Re-run after ingestion to refresh the live data.
- `useApi` refetches when the tab regains focus, so newly ingested analyses appear without a reload.
- **Global language (ko/en):** ONE source of truth, `web/src/lib/language.tsx` (`LanguageProvider` + `useLanguage()` → `{ lang, setLang, t }`), persisted in localStorage `appLanguage`, Korean on first visit, sets `<html lang>`. Pages never keep their own language state. `LanguageToggle` appears only on the notice pages (list hero and detail) but drives that same app-wide state, so every page follows. Old `?lang=` links are adopted once in `App.tsx`, then removed from the URL. All UI strings live in `web/src/lib/i18n.ts` (`translations.ko` / `translations.en`, same keys, checked by `test/i18n.test.ts`). Do not hardcode UI text in components.
- **Notice content per language:** English comes only from `analysis.en` (title, summary, easyExplanation, target, eventInfo), generated in the SAME Gemini call since prompt v3 (`notice_analysis.en_json`). Without it (pre-v3 or pending), the Korean text is shown with a note. Helpers: `noticeTitle`, `noticeSummaryLine` in `i18n.ts`. Category names are a static map. Dates stay structured and are formatted per language (`fullDate`/`shortDate`/`period` in `lib/dates.ts`). D-day is the same in both languages. Evidence quotes, college/major names (profile data) and the original-notice link stay Korean. The frontend never translates or calls the AI.
- **Match reasons** are produced in both languages by `matchNotice()` (`matchReasons` / `matchReasonsEn`, index-aligned). Language never affects scores or levels.
- **Notifications (foundation, nothing sent):** `src/notifications.ts` `buildNotification()` returns `{ kind: new|relevant, titleKo, titleEn, bodyKo, bodyEn, deadline, … }`, and `localizeNotification(m, lang)` picks one. `/notifications` lists notices from the last 14 days (`buildNotifications` in `web/src/lib/personalize.ts`). The ingest CLI logs `[NOTIFY]` with both languages.
- Home hero background: `web/src/components/HeroParticles.tsx`, a 2D canvas particle network ported from the "Aether Flow" hero (canvas only, no framer-motion/Tailwind). It fills `.hero` only (ends at "Recommended for You"), takes its colours from the active theme (`--accent`, `--ink`), ignores clicks, pauses when off-screen or the tab is hidden, and draws one static frame with `prefers-reduced-motion`.
- Design follows gchf.kr (tokens in `web/src/styles/tokens.css`): greige `#e6e0d7`, brown ink `#2c1600`, green hover `#0d8f00`, black active pill, IBM Plex Sans KR + Fraunces display, italic pill buttons, thin 1px rules, hidden scrollbar with a scroll-progress line. Honour `prefers-reduced-motion`. No 3D (see SKILLS.md rule 2).

## What's in this repo

- [`mvp-spec-student-dashboard.md`](mvp-spec-student-dashboard.md) — the MVP spec for **"My Inha"**, a personalized student dashboard. This is the primary product spec and should be the source of truth for scope decisions.
- [`inha-university-student-info-research.md`](inha-university-student-info-research.md) — sourced research on Inha University's university-wide student information sources (official site structure, portals, notices, student services), scoped to *exclude* the library (which has its own document).
- [`inha-libray-research.md`](inha-libray-research.md) — sourced research on Inha University's Jungseok Memorial Library specifically (history, building, collection, technology stack). Kept separate from the university-wide research by design — don't duplicate library details into the other doc, or vice versa.
- [`SKILLS.md`](SKILLS.md) — rules for using React Three Fiber (R3F) + Drei if/when 3D UI is added to this project. Key points: keep 3D components isolated (e.g. under `src/components/3d/`), only add 3D where it improves UX, avoid per-render object creation and unnecessary `useFrame` calls, and keep the UI usable if 3D is hidden/disabled.

## Product scope (from the MVP spec)

**My Inha** aggregates university information scattered across the portal, notice boards, scholarship pages, and academic calendar into one personalized dashboard, filtered by student profile (major, year, enrollment status, international-student status, interests).

MVP consists of one profile + three modules:
- **Profile** — mock/test student data (no Portal SSO integration in MVP)
- **Personalized Announcements** — filtered by major/year/status from official INHA notice pages
- **Personalized Scholarships** — simple attribute-based eligibility matching (explicitly *not* AI-based), labeled as a preliminary match requiring official verification
- **Deadlines** — a single date-sorted list combining academic calendar, scholarship, and announcement dates

Explicit non-goals (do not implement unless the spec changes): course registration, tuition payment, grades/transcripts, online scholarship applications, profile editing, calendar sync, push notifications, a mobile app, full site-wide crawling, Portal/SSO integration, advanced AI eligibility decisions.

Every displayed item should carry its official source URL and a last-checked/publication date — the spec requires that stale data never be presented silently as current.

### AI role

Gemini is used to understand notice content and extract information
that is difficult or unreliable to obtain with simple keyword matching.

Gemini may be used for:

- deadline/application-period extraction
- target/eligibility extraction
- category classification when ambiguous
- notice summarization
- easy-language explanation

Normal application code should be preferred for deterministic tasks:

- keyword search
- filtering
- sorting
- duplicate detection
- notice ID/URL matching
- database operations
- date formatting
- checking whether a notice already has an analysis

### Gemini usage policy

Gemini is currently the project's AI provider.

Do not switch to or add another AI provider unless explicitly requested.

Because the project uses a free-tier Gemini API, minimize AI requests.

Only call Gemini when:

1. A notice is newly discovered, or
2. An existing notice's content has actually changed.

Do not call Gemini when a user views, searches, filters, or opens an
already-analyzed notice.

Store successful AI analysis in the database and reuse it.

A crawler rerun with unchanged notices must result in zero unnecessary
Gemini requests.

Never expose GEMINI_API_KEY in frontend code, logs, or committed files.