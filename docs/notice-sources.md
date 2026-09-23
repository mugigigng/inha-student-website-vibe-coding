# Notice sources

Sources the crawler is allowed to read. One module per source in `src/sources/`.

## `inha-main-notice` — 인하대학교 대표 홈페이지 공지사항

| | |
|---|---|
| Board (list) | https://www.inha.ac.kr/kr/950/subview.do |
| Article URL pattern | `https://www.inha.ac.kr/bbs/kr/8/{articleId}/artclView.do` |
| Module | [`src/sources/inhaMainNotice.ts`](../src/sources/inhaMainNotice.ts) |
| Access | Public, no login, server-rendered HTML (no JavaScript needed) |
| robots.txt | `User-agent: *` / `Allow: /` (checked 2026-09-23) |
| Dedup key | `(source, articleId)`: the `articleId` in the URL is the board's own article number |
| Status | **POC: one notice only** |

### Notice used for the POC

- **URL:** https://www.inha.ac.kr/bbs/kr/8/45601/artclView.do
- **Title:** [창업지원단][대학혁신지원사업] 창업꿈나무 장학금 접수 안내(학부)
- **Board category:** 모집/채용, **작성일:** 2026.09.22
- **Why this one:** scholarship deadlines are a core use case. The body is real text (not only a poster), and it has an application period plus other dates (review and announcement) that must *not* be taken as the deadline.

### Page structure relied on

| Field | Selector |
|---|---|
| Title | `.artclViewTitle` |
| Body | `.artclView` |
| Metadata | `.artclViewHead dl` → `<dt>작성일/분류/작성자</dt><dd>…</dd>` |
| Attachments | `a[href*="/download.do"]`, and `<img>` inside the body |

If the notice is deleted, the site returns HTTP 200 with a page that doesn't have these selectors. The crawler reports that as `InvalidResponseError`.

### Crawling etiquette

- One request per run and no bulk crawling. The crawler identifies itself with a `User-Agent`: `inha-notice-poc/0.1`.
- Posters (images) and `.hwp` attachments are recorded in the database but not downloaded or parsed.

### Not used (and why)

- `eng.inha.ac.kr` Notice board: rows link through JavaScript form posts, so there's no stable per-notice URL (see `inha-university-student-info-research.md` §2).
- `portal.inha.ac.kr`: requires login. Out of scope.
