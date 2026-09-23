import type { NoticeListItem } from '@shared/api/types.ts';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CategoryFilter, type FilterOption } from '../components/CategoryFilter.tsx';
import { deadlineOf, NoticeCard } from '../components/NoticeCard.tsx';
import { StateMessage } from '../components/StateMessage.tsx';
import { UpcomingList } from '../components/UpcomingList.tsx';
import { api, useApi } from '../lib/api.ts';
import { CATEGORIES, PENDING_FILTER } from '../lib/categories.ts';
import { daysUntil, todayKst } from '../lib/dates.ts';
import { buildHome, UPCOMING_DAYS } from '../lib/personalize.ts';
import { profileLabel, useProfile } from '../lib/profile.tsx';
import { scrollToTarget } from '../lib/smoothScroll.ts';
import './NoticeListPage.css';

const ALL = '전체';
type Sort = 'latest' | 'deadline';

const categoryOf = (n: NoticeListItem) => n.analysis?.category ?? PENDING_FILTER;

/** Open deadlines soonest first, then no deadline, then closed ones. */
function byDeadline(a: NoticeListItem, b: NoticeListItem) {
  const rank = (n: NoticeListItem) => {
    const d = deadlineOf(n);
    if (!d) return [1, 0];
    const days = daysUntil(d);
    return days >= 0 ? [0, days] : [2, -days];
  };
  const [ra, rb] = [rank(a), rank(b)];
  return ra[0] - rb[0] || ra[1] - rb[1];
}

export function NoticeListPage() {
  const state = useApi(api.notices);
  const [params, setParams] = useSearchParams();
  const filter = params.get('category') ?? ALL;
  const sort: Sort = params.get('sort') === 'deadline' ? 'deadline' : 'latest';

  const update = (key: string, value: string, fallback: string) =>
    setParams((p) => {
      if (value === fallback) p.delete(key);
      else p.set(key, value);
      return p;
    }, { replace: true, preventScrollReset: true });

  const notices = state.status === 'ok' ? state.data : [];
  const options = useMemo<FilterOption[]>(() => {
    const count = (c: string) => notices.filter((n) => categoryOf(n) === c).length;
    return [
      { value: ALL, label: ALL, count: notices.length },
      ...CATEGORIES.map((c) => ({ value: c, label: c, count: count(c) })).filter((o) => o.count > 0),
      { value: PENDING_FILTER, label: PENDING_FILTER, count: count(PENDING_FILTER) },
    ].filter((o) => o.value === ALL || o.count > 0);
  }, [notices]);

  const visible = useMemo(() => {
    const list = filter === ALL ? notices : notices.filter((n) => categoryOf(n) === filter);
    return sort === 'deadline' ? [...list].sort(byDeadline) : list; // API is already newest first
  }, [notices, filter, sort]);

  // Personalization only orders/highlights; the "전체 공지" list below uses `notices` unfiltered.
  const { profile } = useProfile();
  const home = useMemo(() => buildHome(notices, profile, todayKst()), [notices, profile]);

  const analyzed = notices.filter((n) => n.analysis).length;
  const lastChecked = notices.reduce<string | null>((max, n) => (!max || n.crawledAt > max ? n.crawledAt : max), null);
  const closingSoon = notices.filter((n) => {
    const d = deadlineOf(n);
    return d !== null && daysUntil(d) >= 0 && daysUntil(d) <= 7;
  }).length;

  return (
    <>
      <section className="hero">
        <p className="hero__eyebrow">Inha University · 공지사항</p>
        <h1 className="hero__title">
          <span>Notices,</span>
          <em>understood.</em>
        </h1>
        <div className="hero__foot">
          <div className="hero__greeting">
            {!profile && (
              <p className="hero__hello">
                안녕하세요 <span aria-hidden>👋</span>
              </p>
            )}
            {profile ? (
              <p className="hero__lede">
                <Link to="/profile">프로필 수정</Link>
              </p>
            ) : (
              <p className="hero__lede">
                나에게 맞는 정보를 먼저 볼 수 있도록 프로필을 설정해주세요.{' '}
                <Link to="/profile" className="pill pill--solid hero__cta">
                  프로필 설정하기
                </Link>
              </p>
            )}
          </div>
          {state.status === 'ok' && (
            <dl className="hero__stats">
              <div>
                <dt>공지</dt>
                <dd>{notices.length}</dd>
              </div>
              <div>
                <dt>AI 분석 완료</dt>
                <dd>{analyzed}</dd>
              </div>
              <div>
                <dt>7일 내 마감</dt>
                <dd>{closingSoon}</dd>
              </div>
            </dl>
          )}
        </div>
        {lastChecked && (
          <p className="hero__checked">
            인하대 공지사항 마지막 확인 ·{' '}
            {new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastChecked))}
          </p>
        )}
        <button type="button" className="hero__cue" onClick={() => scrollToTarget('#notices', -72)}>
          전체 공지 바로 보기 <span aria-hidden>↓</span>
        </button>
      </section>

      {state.status === 'ok' && profile && (
        <section className="foryou" aria-labelledby="foryou-title">
          <div className="foryou__inner">
            <div className="section-head">
              <h2 id="foryou-title" className="section-head__title">
                <span aria-hidden>⭐</span> 나에게 맞는 공지
              </h2>
              <p className="section-head__note">
                {profileLabel(profile)} 프로필 기준 추천 · 마감이 지난 공지는 빼고 보여드려요
              </p>
            </div>
            {home.forYou.length === 0 ? (
              <p className="foryou__empty">지금은 프로필에 딱 맞는 공지가 없어요. 아래 전체 공지를 확인해 보세요.</p>
            ) : (
              <ul className="list__grid">
                {home.forYou.map(({ notice, match }) => (
                  <li key={notice.id}>
                    <NoticeCard notice={notice} match={match} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {state.status === 'ok' && home.upcoming.length > 0 && (
        <section className="soon" aria-labelledby="soon-title">
          <div className="section-head">
            <h2 id="soon-title" className="section-head__title">
              <span aria-hidden>📅</span> 다가오는 일정
            </h2>
            <p className="section-head__note">
              앞으로 {UPCOMING_DAYS}일 안의 마감과 행사{profile ? ' · 내 프로필과 무관한 공지는 뺐어요' : ''} ·{' '}
              <Link to="/calendar">캘린더 전체 보기</Link>
            </p>
          </div>
          <UpcomingList events={home.upcoming} />
        </section>
      )}

      <section id="notices" className="list" aria-labelledby="list-title">
        <div className="list__head">
          <div>
            <h2 id="list-title" className="list__title">
              <span aria-hidden>📋</span> 전체 공지 <em>{filter === ALL ? 'all' : filter}</em>
            </h2>
            <p className="section-head__note">프로필과 관계없이 모든 인하대 공지를 보여드려요</p>
          </div>
          <div className="list__sort" role="group" aria-label="정렬">
            <button type="button" className="pill" aria-pressed={sort === 'latest'} onClick={() => update('sort', 'latest', 'latest')}>
              최신순
            </button>
            <button type="button" className="pill" aria-pressed={sort === 'deadline'} onClick={() => update('sort', 'deadline', 'latest')}>
              마감 임박순
            </button>
          </div>
        </div>

        {state.status === 'loading' && <StateMessage title="공지를 불러오는 중…" />}
        {state.status === 'error' && (
          <StateMessage title="공지를 불러오지 못했어요" action={{ label: '다시 시도', onClick: state.retry }}>
            API 서버가 켜져 있는지 확인해 주세요 ({state.error})
          </StateMessage>
        )}
        {state.status === 'ok' && (
          <>
            <CategoryFilter options={options} value={filter} onChange={(v) => update('category', v, ALL)} />
            {visible.length === 0 ? (
              <StateMessage title="해당하는 공지가 없어요" action={{ label: '전체 보기', onClick: () => update('category', ALL, ALL) }} />
            ) : (
              <ul className="list__grid">
                {visible.map((n) => (
                  <li key={n.id}>
                    <NoticeCard notice={n} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
}
