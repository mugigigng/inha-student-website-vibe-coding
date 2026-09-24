import type { NoticeListItem } from '@shared/api/types.ts';
import { noticeTitle, translations, type Lang } from './i18n.ts';
import { noticeEvents } from './events.ts';

// "캘린더에 추가": a standard .ics file that Google / Apple / Outlook calendars import.
// No account or backend needed. KST has no DST, so timed events convert to UTC with a fixed +9h.

const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** RFC 5545 line folding at 75 octets (UTF-8 aware, so Korean isn't split mid-character). */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const ymd = (d: string) => d.slice(0, 10).replaceAll('-', '');
function nextDay(d: string) {
  const t = new Date(`${d.slice(0, 10)}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10).replaceAll('-', '');
}
function kstToUtc(d: string, addHours = 0) {
  const t = new Date(`${d.slice(0, 16)}:00+09:00`);
  t.setUTCHours(t.getUTCHours() + addHours);
  return t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildIcs(notice: NoticeListItem, lang: Lang = 'ko'): string | null {
  const t = translations[lang];
  const events = noticeEvents(notice);
  if (events.length === 0) return null;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Inha Insight//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    const timed = e.date.length > 10;
    lines.push(
      'BEGIN:VEVENT',
      `UID:inha-notice-${notice.sourceNoticeId}-${e.kind}@inha-notices`,
      `DTSTAMP:${stamp}`,
      ...(timed ? [`DTSTART:${kstToUtc(e.date)}`, `DTEND:${kstToUtc(e.date, 1)}`] : [`DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`]),
      `SUMMARY:${escape(`[${t.events[e.kind]}] ${noticeTitle(notice, lang)}`)}`,
      `DESCRIPTION:${escape(`${t.ics.description}\n${t.ics.source}: ${notice.sourceUrl}`)}`,
      `URL:${notice.sourceUrl}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(notice: NoticeListItem, lang: Lang = 'ko'): boolean {
  const ics = buildIcs(notice, lang);
  if (!ics) return false;
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `inha-notice-${notice.sourceNoticeId}.ics` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
