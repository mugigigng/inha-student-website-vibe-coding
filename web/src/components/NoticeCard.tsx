import type { NoticeListItem } from '@shared/api/types.ts';
import { Link } from 'react-router-dom';
import { CATEGORY_TINT, PENDING_FILTER } from '../lib/categories.ts';
import { fullDate, period, shortDate } from '../lib/dates.ts';
import { DdayBadge } from './DdayBadge.tsx';
import './NoticeCard.css';

/** The deadline a student cares about: explicit deadline, else end of the application period. */
export const deadlineOf = (n: NoticeListItem) => n.analysis?.deadline ?? n.analysis?.applicationEnd ?? null;

export function NoticeCard({ notice }: { notice: NoticeListItem }) {
  const a = notice.analysis;
  const deadline = deadlineOf(notice);
  const applyPeriod = a ? period(a.applicationStart, a.applicationEnd) : null;

  return (
    <article className="card" data-status={notice.analysisStatus}>
      <div className="card__top">
        {a ? (
          <span className="chip" style={{ background: CATEGORY_TINT[a.category] }}>
            {a.category}
          </span>
        ) : (
          <span className="chip chip--pending">{PENDING_FILTER}</span>
        )}
        <DdayBadge deadline={deadline} />
      </div>

      <h3 className="card__title">
        {/* stretched link: the whole card opens the detail page */}
        <Link to={`/notices/${notice.id}`} className="card__link">
          {notice.title}
        </Link>
      </h3>

      {a ? (
        <p className="card__summary">
          <span className="card__ai">AI 요약</span>
          {a.summary[0] ?? a.easyExplanation}
        </p>
      ) : (
        <p className="card__summary card__summary--pending">AI 분석을 기다리는 중이에요. 원문에서 먼저 확인하세요.</p>
      )}

      {a && (applyPeriod || deadline || a.eventDate) && (
        <dl className="card__dates">
          {applyPeriod && (
            <div>
              <dt>신청</dt>
              <dd>{applyPeriod}</dd>
            </div>
          )}
          {deadline && (
            <div>
              <dt>마감</dt>
              <dd>{shortDate(deadline)}</dd>
            </div>
          )}
          {a.eventDate && (
            <div>
              <dt>일정</dt>
              <dd>{shortDate(a.eventDate)}</dd>
            </div>
          )}
        </dl>
      )}

      {notice.analysisStatus === 'stale' && <p className="card__note">원문이 수정되어 AI 정보가 다를 수 있어요</p>}

      <footer className="card__foot">
        <span>게시 {notice.publishedAt ? fullDate(notice.publishedAt) : '—'}</span>
        <a href={notice.sourceUrl} target="_blank" rel="noreferrer" className="card__source">
          원문 보기 <span aria-hidden>↗</span>
        </a>
      </footer>
    </article>
  );
}
