# Notice sources

Sources the crawler is allowed to read. One module per source in `src/sources/`. Every board below runs on the same K2Web CMS, so parsing and fetching are shared in [`src/sources/k2web.ts`](../src/sources/k2web.ts). The registry and `--source` names are in [`src/sources/index.ts`](../src/sources/index.ts), and UI metadata (kind, college, major) is in [`src/sourceMeta.ts`](../src/sourceMeta.ts).

| `--source` | Source key | Kind | Board | Default per run |
|---|---|---|---|---|
| `main` | `inha-main-notice` | 본교 (main) | 인하대학교 공지사항 | list page 1 |
| `aicc` | `inha-aicc-notice` | 단과대 (college) | AI융합대학 공지사항 | latest 10 |
| `cse` | `inha-cse-notice` | 학과 (department) | 컴퓨터공학과 공지사항 | latest 10 |

`npm run ingest` runs all three in this order. `--source cse,aicc` picks boards, and `--limit N` overrides the per-run default. A board that fails (even its list page) never stops the others.

## `inha-main-notice` — 인하대학교 대표 홈페이지 공지사항

| | |
|---|---|
| Board (list) | https://www.inha.ac.kr/kr/950/subview.do (rows: `https://www.inha.ac.kr/bbs/kr/8/artclList.do?page=N`) |
| Article URL pattern | `https://www.inha.ac.kr/bbs/kr/8/{articleId}/artclView.do` |
| Module | [`src/sources/inhaMainNotice.ts`](../src/sources/inhaMainNotice.ts) |
| Access | Public, no login, server-rendered HTML (no JavaScript needed) |
| robots.txt | `User-agent: *` / `Allow: /` (checked 2026-09-23) |
| Dedup key | `(source, articleId)`: the `articleId` in the URL is the board's own article number |
| Status | **Ingested** (list page 1 per run) |

### Notice used for the POC

- **URL:** https://www.inha.ac.kr/bbs/kr/8/45601/artclView.do
- **Title:** [창업지원단][대학혁신지원사업] 창업꿈나무 장학금 접수 안내(학부)
- **Board category:** 모집/채용, **작성일:** 2026.09.22
- **Why this one:** scholarship deadlines are a core use case. The body is real text (not only a poster), and it has an application period plus other dates (review and announcement) that must *not* be taken as the deadline.

### Page structure relied on

| Field | Selector |
|---|---|
| List rows | `table.artclTable tbody tr`; link `a.artclLinkView` (title = the link's own text); `._artclTdRdate`; `tr.headline` = pinned |
| Title | `.artclViewTitle` |
| Body | `.artclView` |
| Metadata | `.artclViewHead dl` → `<dt>작성일/분류/작성자</dt><dd>…</dd>` |
| Attachments | `a[href*="/download.do"]`, and `<img>` inside the body |

If the notice is deleted, the site returns HTTP 200 with a page that doesn't have these selectors. The crawler reports that as `InvalidResponseError`.

## `inha-aicc-notice` — AI융합대학 공지사항

AI융합대학 is the college 컴퓨터공학과 belongs to. It was renamed from 소프트웨어융합대학: the official page https://www.inha.ac.kr/kr/3907/subview.do is titled "AI융합대학", and `swcc.inha.ac.kr` now redirects to `aicc.inha.ac.kr` (checked 2026-09-25). `src/inhaCatalog.ts` keeps the old name as a `formerNames` entry.

| | |
|---|---|
| Board (list) | `https://aicc.inha.ac.kr/bbs/act/716/artclList.do?page=N` (the "공지사항 더보기" link on https://aicc.inha.ac.kr/act/index.do) |
| Article URL pattern | `https://aicc.inha.ac.kr/bbs/act/716/{articleId}/artclView.do` |
| Module | [`src/sources/inhaAiccNotice.ts`](../src/sources/inhaAiccNotice.ts) |
| Access | Public, no login, server-rendered HTML (same K2Web CMS as the main site) |
| robots.txt | Only `User-agent: Yeti` (Naver's crawler) / `Disallow: /bbs/*`. There is no rule for other user agents, so this crawler is allowed (checked 2026-09-25) |
| Dedup key | `(source, articleId)` |
| Status | **Ingested** (latest 10 per run) |

## `inha-cse-notice` — 컴퓨터공학과 공지사항

| | |
|---|---|
| Board (list) | `https://cse.inha.ac.kr/bbs/cse/242/artclList.do?page=N` (the "공지사항 더보기" link on https://cse.inha.ac.kr/cse/index.do) |
| Article URL pattern | `https://cse.inha.ac.kr/bbs/cse/242/{articleId}/artclView.do` |
| Module | [`src/sources/inhaCseNotice.ts`](../src/sources/inhaCseNotice.ts) |
| Access | Public, no login, server-rendered HTML (same K2Web CMS as the main site) |
| robots.txt | Only `User-agent: Yeti` / `Disallow: /bbs/*`. No rule for other user agents, so allowed (checked 2026-09-25) |
| Dedup key | `(source, articleId)` |
| Status | **Ingested** (latest 10 per run) |

`https://cse.inha.ac.kr/` itself is only a JavaScript redirect ("site move") to `/cse/index.do`, so the module uses the board URLs above directly. Other CSE boards are not collected (yet): 243 졸업예정자 공지 and 244 취업정보.

### Page structure (college and department boards)

Same as the main board, with three differences:

| | Main board | College/department boards |
|---|---|---|
| List title | the link's own text | `<strong>` inside `a.artclLinkView`, next to a `span.newArtcl` "새글" badge |
| Metadata `dl` | 작성일, 분류, 작성자 | 작성일, 수정일, 작성자, 조회수 (AI융합대학 also has 글번호). **No 분류** → `boardCategory` is `null` |
| Body images | relative or main-site URLs | may point to another Inha host (e.g. `swcc.inha.ac.kr/CrossEditor/...`); resolved against the board's origin |

Poster-only posts (the body is an image and has no text, e.g. aicc 191375, cse 191227 and 190971) fail with `EmptyContentError` and are not stored, just like on the main board.

Offline parser tests use real pages saved on 2026-09-25 in `test/fixtures/sources/` (`test/sources.test.ts`).

## Cross-source duplicates

The same notice is often posted on the main, college and department boards, e.g. main 45574 "2026학년도 2학기 수강신청 포기 안내" (09-21) = CSE 191991 "[학부]2026학년도 2학기 수강신청 포기 안내" (09-22). The rule is in `src/dedup.ts` and is deterministic, with no AI:

- **Same notice** = a different source + the same normalized title + 작성일 at most 3 days apart. Copies are often posted a day apart.
- **Normalized title:**
  - Leading tags (`[학부]`, `(학부)`, `[인재개발팀]`, `★`) are dropped, plus spaces, punctuation and case.
  - A `[대학원]` tag is kept, so a graduate notice never merges with the undergraduate one.
  - Keys shorter than 6 characters are never merged.
- **Not merged:** copies whose wording differs (e.g. 직무박람회: main "[인재개발팀] 2026 하반기 인하대학교 직무박람회 개최 안내!" vs college "2026년 하반기 인하대학교 직무박람회"). They show up as two notices, rather than risking a false merge.
- **Storage:** every copy is its own `notices` row. `notices.dup_of` points to the first stored copy (the canonical one; main is ingested first).
- **One analysis per notice:** ingest skips Gemini for a copy when any copy in its group already has a current analysis (`[DUP]` log).
- **API:** a group is returned once, as its canonical copy, with every board in `sources`. Opening a duplicate's id returns the canonical detail.

## Crawling etiquette

- The crawler identifies itself with the `User-Agent` `inha-notice-poc/0.1`. Requests are sequential, with a 300 ms pause between article requests, and boards are crawled one after another.
- Per run: one list page per board, and at most 10 articles from the college and department boards.
- Posters (images) and `.hwp` attachments are recorded in the database but not downloaded or parsed.

## Not used (and why)

- `eng.inha.ac.kr` Notice board: rows link through JavaScript form posts, so there's no stable per-notice URL (see `inha-university-student-info-research.md` §2).
- `portal.inha.ac.kr`: requires login. Out of scope.
