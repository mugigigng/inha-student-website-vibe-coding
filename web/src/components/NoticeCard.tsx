import type { NoticeListItem } from '@shared/api/types.ts';
import type { MatchResult } from '@shared/match.ts';
import { Link } from 'react-router-dom';
import { CATEGORY_TINT } from '../lib/categories.ts';
import { fullDate, period, shortDate } from '../lib/dates.ts';
import { categoryName, englishMissing, matchReasons, noticeSummaryLine, noticeTitle } from '../lib/i18n.ts';
import { useLanguage } from '../lib/language.tsx';
import { DdayBadge } from './DdayBadge.tsx';
import './NoticeCard.css';

/** The deadline a student cares about: explicit deadline, else end of the application period. */
export const deadlineOf = (n: NoticeListItem) => n.analysis?.deadline ?? n.analysis?.applicationEnd ?? null;

/** `match` is only passed in the personalized section; the all-notices grid renders plain cards. */
export function NoticeCard({ notice, match }: { notice: NoticeListItem; match?: MatchResult }) {
  const { lang, t } = useLanguage();
  const a = notice.analysis;
  const deadline = deadlineOf(notice);
  const applyPeriod = a ? period(a.applicationStart, a.applicationEnd, lang) : null;
  // English title/summary come from the stored analysis; without one the Korean text is shown as is.
  const contentLang = lang === 'en' && a?.en ? 'en' : 'ko';
  const reasons = match ? matchReasons(match, lang) : [];

  return (
    <article className="card" data-status={notice.analysisStatus}>
      <div className="card__top">
        {a ? (
          <span className="chip" style={{ background: CATEGORY_TINT[a.category] }}>
            {categoryName(a.category, lang)}
          </span>
        ) : (
          <span className="chip chip--pending">{t.common.pending}</span>
        )}
        <DdayBadge deadline={deadline} />
      </div>

      {reasons.length > 0 && (
        <p className="card__match">
          <span aria-hidden>⭐</span> {reasons.slice(0, 2).join(' · ')}
          {match!.basedOnTitleOnly && <span className="card__match-note"> {t.card.titleOnly}</span>}
        </p>
      )}

      <h3 className="card__title" lang={contentLang}>
        {/* stretched link: the whole card opens the detail page */}
        <Link to={`/notices/${notice.id}`} className="card__link">
          {noticeTitle(notice, lang)}
        </Link>
      </h3>

      {a ? (
        <p className="card__summary" lang={contentLang}>
          <span className="card__ai" lang={lang}>
            {t.card.aiSummary}
          </span>
          {noticeSummaryLine(notice, lang)}
        </p>
      ) : (
        <p className="card__summary card__summary--pending">{t.card.pendingBody}</p>
      )}

      {a && (applyPeriod || deadline || a.eventDate) && (
        <dl className="card__dates">
          {applyPeriod && (
            <div>
              <dt>{t.card.apply}</dt>
              <dd>{applyPeriod}</dd>
            </div>
          )}
          {deadline && (
            <div>
              <dt>{t.card.deadline}</dt>
              <dd>{shortDate(deadline, lang)}</dd>
            </div>
          )}
          {a.eventDate && (
            <div>
              <dt>{t.card.event}</dt>
              <dd>{shortDate(a.eventDate, lang)}</dd>
            </div>
          )}
        </dl>
      )}

      {notice.analysisStatus === 'stale' && <p className="card__note">{t.card.stale}</p>}
      {englishMissing(notice, lang) && <p className="card__note">{t.card.koreanOnly}</p>}

      <footer className="card__foot">
        <span>
          {t.card.posted} {notice.publishedAt ? fullDate(notice.publishedAt, lang) : '—'}
        </span>
        <a href={notice.sourceUrl} target="_blank" rel="noreferrer" className="card__source">
          {t.card.original} <span aria-hidden>↗</span>
        </a>
      </footer>
    </article>
  );
}
