// Reachability check for GitHub Actions runners (overseas IPs): one list-page request per board,
// with the crawler's own User-Agent. Prints HTTP status, response size and parsed row count only.
// No DB, no AI. Exit code 1 if any board is unreachable or returns no rows.
import { USER_AGENT } from '../src/sources/k2web.ts';
import { SOURCES } from '../src/sources/index.ts';

let bad = 0;
for (const { alias, board } of SOURCES) {
  const { origin, site, board: no } = board.config;
  const url = `${origin}/bbs/${site}/${no}/artclList.do?page=1`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ko' },
      signal: AbortSignal.timeout(20_000),
    });
    const body = await res.text();
    const rows = res.ok ? board.parseListHtml(body).length : 0;
    if (!res.ok || rows === 0) bad++;
    console.log(`[PROBE] ${alias.padEnd(4)} HTTP ${res.status} ${Buffer.byteLength(body)} bytes, ${rows} rows, ${Date.now() - started} ms  ${url}`);
  } catch (err) {
    bad++;
    const e = err as Error & { cause?: { code?: string } };
    console.log(`[PROBE] ${alias.padEnd(4)} FAILED ${e.cause?.code ?? e.name}: ${e.message}, ${Date.now() - started} ms  ${url}`);
  }
}
console.log(bad ? `[PROBE] ${bad}/${SOURCES.length} board(s) unreachable or empty` : `[PROBE] all ${SOURCES.length} boards OK`);
if (bad) process.exitCode = 1;
