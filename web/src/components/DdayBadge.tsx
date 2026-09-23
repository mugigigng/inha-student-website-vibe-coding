import { dday } from '../lib/dates.ts';
import './DdayBadge.css';

/** D-day for a deadline (KST). Renders nothing when there is no deadline. */
export function DdayBadge({ deadline, lang = 'ko' }: { deadline: string | null; lang?: 'ko' | 'en' }) {
  if (!deadline) return null;
  const { label, tone, days } = dday(deadline, undefined, lang);
  const title =
    lang === 'en'
      ? tone === 'closed' ? 'Applications have closed' : days === 0 ? 'Closes today' : `${days} day${days === 1 ? '' : 's'} left`
      : tone === 'closed' ? '신청이 마감되었어요' : days === 0 ? '오늘 마감' : `마감까지 ${days}일`;
  return (
    <span className={`dday dday--${tone}`} title={title}>
      {label}
    </span>
  );
}
