// All "today" math is in Korea time — the notices' dates are KST calendar days.

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Today's date in Asia/Seoul as YYYY-MM-DD. */
export function todayKst(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
}

/** Days from today (KST) to the date part of `iso` (YYYY-MM-DD[THH:mm]). Negative = past. */
export function daysUntil(iso: string, today = todayKst()): number {
  const day = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((day(iso) - day(today)) / 86_400_000);
}

export type DdayTone = 'urgent' | 'soon' | 'open' | 'closed';

export function dday(iso: string, today = todayKst(), lang: 'ko' | 'en' = 'ko'): { label: string; tone: DdayTone; days: number } {
  const days = daysUntil(iso, today);
  if (days < 0) return { label: lang === 'en' ? 'Closed' : '마감', tone: 'closed', days };
  if (days === 0) return { label: 'D-DAY', tone: 'urgent', days };
  return { label: `D-${days}`, tone: days <= 2 ? 'urgent' : days <= 7 ? 'soon' : 'open', days };
}

/**
 * "10.16(금)" (ko) or "Oct 16 (Fri)" (en) — plus " 14:00" when a time is present.
 * Only the formatting changes with language; the date itself stays structured data.
 */
export function shortDate(iso: string, lang: 'ko' | 'en' = 'ko'): string {
  const [y, m, d] = [+iso.slice(0, 4), +iso.slice(5, 7), +iso.slice(8, 10)];
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const time = iso.length > 10 ? ` ${iso.slice(11, 16)}` : '';
  if (lang === 'en') return `${MONTHS_EN[m - 1]} ${d} (${WEEKDAYS_EN[wd]})${time}`;
  return `${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}(${WEEKDAYS[wd]})${time}`;
}

/** "2026.09.22" */
export function fullDate(iso: string): string {
  return iso.slice(0, 10).replaceAll('-', '.');
}

/** "09.28(월) – 10.16(금)", or one side only when the other is unknown. */
export function period(start: string | null, end: string | null): string | null {
  if (start && end) return `${shortDate(start)} – ${shortDate(end)}`;
  if (end) return `~ ${shortDate(end)}`;
  if (start) return `${shortDate(start)} ~`;
  return null;
}
