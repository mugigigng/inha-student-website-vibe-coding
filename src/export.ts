import './env.ts';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getNoticeDetail, listNotices } from './api/notices.ts';
import { DB_PATH, openDb } from './db.ts';

// Writes the read API's responses as static JSON for hosting without a server
// (GitHub Pages). Same shapes as src/server.ts; read-only; never calls the AI.
//   <out>/api/notices.json        = GET /api/notices
//   <out>/api/notices/<id>.json   = GET /api/notices/:id

const out = process.argv[2] ?? 'dist/web';
const db = openDb();
const notices = listNotices(db);

mkdirSync(join(out, 'api', 'notices'), { recursive: true });
writeFileSync(join(out, 'api', 'notices.json'), JSON.stringify(notices));
for (const n of notices) {
  writeFileSync(join(out, 'api', 'notices', `${n.id}.json`), JSON.stringify(getNoticeDetail(db, n.id)));
}

const analyzed = notices.filter((n) => n.analysis).length;
console.log(`[EXPORT] ${notices.length} notices (${analyzed} analyzed) from ${DB_PATH} -> ${out}/api/`);
