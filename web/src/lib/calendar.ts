import type { NoticeListItem } from '@shared/api/types.ts';
import { noticeEvents, type NoticeEvent } from './events.ts';

// Pure calendar logic (no React) so it can be unit-tested. Dates are KST calendar days as YYYY-MM-DD.

const pad = (n: number) => String(n).padStart(2, '0');

export interface Cell {
  date: string;
  day: number;
  inMonth: boolean;
}

/** All cells of the month grid (Sunday first), including leading/trailing days of adjacent months. */
export function monthCells(year: number, month: number): Cell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((first.getUTCDay() + daysInMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: d.getUTCMonth() === month - 1 };
  });
}

/** "2026-09" + 1 -> "2026-10" */
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** Events keyed by day; within a day, deadlines first, then by time. */
export function eventsByDay(notices: NoticeListItem[]): Map<string, NoticeEvent[]> {
  const map = new Map<string, NoticeEvent[]>();
  for (const e of notices.flatMap(noticeEvents)) {
    const k = e.date.slice(0, 10);
    map.set(k, [...(map.get(k) ?? []), e]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.kind === b.kind ? a.date.localeCompare(b.date) : a.kind === 'deadline' ? -1 : 1));
  }
  return map;
}

/** First event on or after `from` (for "next date" links from empty months). */
export function nextEventAfter(notices: NoticeListItem[], from: string): NoticeEvent | null {
  return (
    notices
      .flatMap(noticeEvents)
      .filter((e) => e.date.slice(0, 10) >= from)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  );
}

/**
 * The day a notice should open on in the calendar: its upcoming deadline, else its upcoming
 * event, else the latest past one (so closed notices still land somewhere meaningful).
 */
export function calendarDayFor(notice: NoticeListItem, today: string): string | null {
  const events = noticeEvents(notice).map((e) => e.date.slice(0, 10));
  if (events.length === 0) return null;
  const upcoming = events.filter((d) => d >= today).sort();
  return upcoming[0] ?? events.sort().at(-1)!;
}

/** URL for the calendar focused on one notice. */
export function calendarHref(notice: NoticeListItem, today: string): string | null {
  const day = calendarDayFor(notice, today);
  return day ? `/calendar?month=${day.slice(0, 7)}&date=${day}&notice=${notice.id}` : null;
}
