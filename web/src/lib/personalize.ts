import type { NoticeListItem } from '@shared/api/types.ts';
import { matchNotice, type MatchResult } from '@shared/match.ts';
import { buildNotification, type NotificationMessage } from '@shared/notifications.ts';
import type { Profile } from '@shared/profile.ts';
import { daysUntil } from './dates.ts';
import { noticeEvents, type NoticeEvent } from './events.ts';

// Builds the personalized Home from the full notice list. Pure (no React) and unit-tested.
// Rule: personalization only ORDERS and HIGHLIGHTS — `all` is always every notice, untouched.

export const FOR_YOU_LIMIT = 6;
export const UPCOMING_DAYS = 30;
export const UPCOMING_LIMIT = 6;

export interface Recommended {
  notice: NoticeListItem;
  match: MatchResult;
}

export interface HomeData {
  /** high/medium matches that are still open, best first. Empty without a profile. */
  forYou: Recommended[];
  /** Deadlines/events in the next UPCOMING_DAYS days, soonest first (excludes notices not for this profile). */
  upcoming: (NoticeEvent & { match: MatchResult | null })[];
  /** Every notice, same order as the API. Never filtered by the profile. */
  all: NoticeListItem[];
}

const deadlineOf = (n: NoticeListItem) => n.analysis?.deadline ?? n.analysis?.applicationEnd ?? null;

export function buildHome(notices: NoticeListItem[], profile: Profile | null, today: string): HomeData {
  const matches = new Map(notices.map((n) => [n.id, profile ? matchNotice(profile, n, today) : null]));

  const forYou = profile
    ? notices
        .map((notice) => ({ notice, match: matches.get(notice.id)! }))
        .filter(({ notice, match }) => {
          if (match.matchLevel !== 'high' && match.matchLevel !== 'medium') return false;
          const d = deadlineOf(notice);
          return !d || daysUntil(d, today) >= 0; // closed notices are not recommended
        })
        .sort((a, b) => {
          const byScore = b.match.relevanceScore - a.match.relevanceScore;
          if (byScore) return byScore;
          const [da, db] = [deadlineOf(a.notice), deadlineOf(b.notice)];
          if (da && db) return da.localeCompare(db); // sooner deadline first
          if (da || db) return da ? -1 : 1;
          return (b.notice.publishedAt ?? '').localeCompare(a.notice.publishedAt ?? '');
        })
        .slice(0, FOR_YOU_LIMIT)
    : [];

  const upcoming = notices
    .flatMap(noticeEvents)
    .filter((e) => {
      const days = daysUntil(e.date, today);
      return days >= 0 && days <= UPCOMING_DAYS && matches.get(e.notice.id)?.matchLevel !== 'none';
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, UPCOMING_LIMIT)
    .map((e) => ({ ...e, match: matches.get(e.notice.id) ?? null }));

  return { forYou, upcoming, all: notices };
}

export const NOTIFICATION_DAYS = 14;

/**
 * In-app notification list (nothing is sent): notices posted in the last NOTIFICATION_DAYS days,
 * newest first. Each message carries both languages (titleKo/titleEn/bodyKo/bodyEn); the UI picks
 * one with the global language. "relevant" = high profile match; without a profile everything is "new".
 */
export function buildNotifications(notices: NoticeListItem[], profile: Profile | null, today: string): NotificationMessage[] {
  return notices
    .filter((n) => n.publishedAt && daysUntil(n.publishedAt, today) <= 0 && daysUntil(n.publishedAt, today) > -NOTIFICATION_DAYS)
    .map((n) => buildNotification(n, profile ? matchNotice(profile, n, today) : null))
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || b.noticeId - a.noticeId);
}
