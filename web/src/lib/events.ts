import type { NoticeListItem } from '@shared/api/types.ts';

/**
 * Calendar entries derived from a notice's AI analysis.
 * deadline = last day to apply/submit (explicit deadline, else end of the application period)
 * event    = the day the event itself happens (eventDate, prompt v2+)
 */
export type EventKind = 'deadline' | 'event';

export interface NoticeEvent {
  kind: EventKind;
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm (KST) */
  date: string;
  notice: NoticeListItem;
}

export const EVENT_LABEL: Record<EventKind, string> = { deadline: '신청 마감', event: '행사 일정' };

export function noticeEvents(n: NoticeListItem): NoticeEvent[] {
  const a = n.analysis;
  if (!a) return []; // pending notices have no trustworthy dates yet
  const out: NoticeEvent[] = [];
  const deadline = a.deadline ?? a.applicationEnd;
  if (deadline) out.push({ kind: 'deadline', date: deadline, notice: n });
  if (a.eventDate) out.push({ kind: 'event', date: a.eventDate, notice: n });
  return out;
}
