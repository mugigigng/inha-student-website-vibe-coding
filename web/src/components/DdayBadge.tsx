import { dday } from '../lib/dates.ts';
import { useLanguage } from '../lib/language.tsx';
import './DdayBadge.css';

/** D-day for a deadline (KST). "D-6" is the same in both languages; only "마감/Closed" and the tooltip change. */
export function DdayBadge({ deadline }: { deadline: string | null }) {
  const { lang, t } = useLanguage();
  if (!deadline) return null;
  const { label, tone, days } = dday(deadline, undefined, lang);
  const title = tone === 'closed' ? t.common.ddayClosed : days === 0 ? t.common.ddayToday : t.common.ddayLeft(days);
  return (
    <span className={`dday dday--${tone}`} title={title}>
      {label}
    </span>
  );
}
