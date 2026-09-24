// Notification foundation (nothing is sent yet: no push/email). A notification message is
// built once, in BOTH languages, from data that already exists (notice title, AI `en` block,
// deterministic match reasons). The UI or a future sender picks the language at display time,
// so switching language never re-generates or translates anything. Dependency-free: shared by
// the backend (after ingestion) and the web app.

import type { NoticeListItem } from './api/types.ts';
import type { MatchResult } from './match.ts';

export type NotificationKind = 'new' | 'relevant';

export interface NotificationMessage {
  noticeId: number;
  kind: NotificationKind;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  /** Notice deadline/end of application, structured (YYYY-MM-DD[THH:mm]); formatted per language by the UI. */
  deadline: string | null;
  /** When the notice was published; used for ordering. */
  publishedAt: string | null;
  sourceUrl: string;
}

/**
 * `relevant` when the profile match is high, otherwise `new`. The body is the notice title
 * (English title from the analysis when there is one), followed by the match reasons.
 */
export function buildNotification(notice: NoticeListItem, match: MatchResult | null): NotificationMessage {
  const relevant = match?.matchLevel === 'high';
  const a = notice.analysis;
  const noticeTitleEn = a?.en?.title ?? notice.title; // no English yet → Korean title, never machine-translated
  const reasonsKo = relevant ? match!.matchReasons.slice(0, 2).join(' · ') : '';
  const reasonsEn = relevant ? match!.matchReasonsEn.slice(0, 2).join(' · ') : '';
  return {
    noticeId: notice.id,
    kind: relevant ? 'relevant' : 'new',
    titleKo: relevant ? '나에게 맞는 공지' : '새로운 공지',
    titleEn: relevant ? 'Relevant to you' : 'New notice',
    bodyKo: reasonsKo ? `${notice.title} (${reasonsKo})` : notice.title,
    bodyEn: reasonsEn ? `${noticeTitleEn} (${reasonsEn})` : noticeTitleEn,
    deadline: a?.deadline ?? a?.applicationEnd ?? null,
    publishedAt: notice.publishedAt,
    sourceUrl: notice.sourceUrl,
  };
}

/** Pick the language version of a stored/built message. */
export function localizeNotification(m: NotificationMessage, lang: 'ko' | 'en'): { title: string; body: string } {
  return lang === 'en' ? { title: m.titleEn, body: m.bodyEn } : { title: m.titleKo, body: m.bodyKo };
}
