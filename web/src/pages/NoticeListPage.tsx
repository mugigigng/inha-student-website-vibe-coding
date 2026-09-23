import type { NoticeListItem } from '@shared/api/types.ts';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CategoryFilter, type FilterOption } from '../components/CategoryFilter.tsx';
import { deadlineOf, NoticeCard } from '../components/NoticeCard.tsx';
import { StateMessage } from '../components/StateMessage.tsx';
import { api, useApi } from '../lib/api.ts';
import { CATEGORIES, PENDING_FILTER } from '../lib/categories.ts';
import { daysUntil } from '../lib/dates.ts';
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
          <p className="hero__lede">
            흩어진 인하대 공지를 AI가 읽고
            <br />
            신청 기간과 마감일을 한눈에 정리했어요.
          </p>
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
          공지 보러 가기 <span aria-hidden>↓</span>
        </button>
      </section>

      <section id="notices" className="list" aria-labelledby="list-title">
        <div className="list__head">
          <h2 id="list-title" className="list__title">
            공지 <em>{filter === ALL ? 'all' : filter}</em>
          </h2>
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
