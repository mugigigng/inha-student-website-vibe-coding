import './env.ts';
import { createServer, type ServerResponse } from 'node:http';
import { getNoticeDetail, listNotices } from './api/notices.ts';
import type { ApiError } from './api/types.ts';
import { DB_PATH, openDb } from './db.ts';

// Minimal read-only JSON API for the web frontend. No writes, no AI calls.
//   GET /api/notices       -> NoticeListItem[]
//   GET /api/notices/:id   -> NoticeDetail

const PORT = Number(process.env.API_PORT ?? 8787);
const db = openDb();

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' } satisfies ApiError);
    if (url.pathname === '/api/notices') return send(res, 200, listNotices(db));
    const m = url.pathname.match(/^\/api\/notices\/(\d+)$/);
    if (m) {
      const notice = getNoticeDetail(db, Number(m[1]));
      return notice ? send(res, 200, notice) : send(res, 404, { error: 'Notice not found' } satisfies ApiError);
    }
    send(res, 404, { error: 'Not found' } satisfies ApiError);
  } catch (err) {
    console.error(`[API] ${req.method} ${url.pathname} failed:`, err);
    send(res, 500, { error: 'Internal error' } satisfies ApiError);
  }
}).listen(PORT, () => console.log(`[API] http://localhost:${PORT}/api/notices  (db: ${DB_PATH})`));
