import type { NoticeListItem } from '@shared/api/types.ts';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CategoryFilter, type FilterOption } from '../components/CategoryFilter.tsx';
import { LanguageToggle } from '../components/LanguageToggle.tsx';
import { deadlineOf, NoticeCard } from '../components/NoticeCard.tsx';
import { StateMessage } from '../components/StateMessage.tsx';
import { UpcomingList } from '../components/UpcomingList.tsx';
import { api, useApi } from '../lib/api.ts';
import { CATEGORIES, PENDING_FILTER } from '../lib/categories.ts';
import { daysUntil, todayKst } from '../lib/dates.ts';
import { categoryName } from '../lib/i18n.ts';
import { useLanguage } from '../lib/language.tsx';
import { buildHome, UPCOMING_DAYS } from '../lib/personalize.ts';
import { profileLabel, useProfile } from '../lib/profile.tsx';
import { scrollToTarget } from '../lib/smoothScroll.ts';
import './NoticeListPage.css';

const ALL = 'all'; // URL value for "no category filter" (label comes from translations)
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
  const { lang, t } = useLanguage();
  const state = useApi(api.notices);
  const [params, setParams] = useSearchParams();
  const rawFilter = params.get('category');
  const filter = !rawFilter || rawFilter === '전체' ? ALL : rawFilter; // '전체' = older links
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
      { value: ALL, label: t.home.all, count: notices.length },
      ...CATEGORIES.map((c) => ({ value: c, label: categoryName(c, lang), count: count(c) })).filter((o) => o.count > 0),
      { value: PENDING_FILTER, label: t.common.pending, count: count(PENDING_FILTER) },
    ].filter((o) => o.value === ALL || o.count > 0);
  }, [notices, lang, t]);

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
        <div className="hero__top">
          <p className="hero__eyebrow">{t.home.eyebrow}</p>
          {/* app-wide language switch (lib/language.tsx): changes every page, not just this one */}
          <LanguageToggle />
        </div>
        <h1 className="hero__title">
          <span>Notices,</span>
          <em>understood.</em>
        </h1>
        <div className="hero__foot">
          <div className="hero__greeting">
            {!profile && (
              <p className="hero__hello">
                {t.home.hello} <span aria-hidden>👋</span>
              </p>
            )}
            {profile ? (
              <p className="hero__lede">
                <Link to="/profile">{t.home.editProfile}</Link>
              </p>
            ) : (
              <p className="hero__lede">
                {t.home.setupPrompt}{' '}
                <Link to="/profile" className="pill pill--solid hero__cta">
                  {t.home.setupCta}
                </Link>
              </p>
            )}
          </div>
          {state.status === 'ok' && (
            <dl className="hero__stats">
              <div>
                <dt>{t.home.statNotices}</dt>
                <dd>{notices.length}</dd>
              </div>
              <div>
                <dt>{t.home.statAnalyzed}</dt>
                <dd>{analyzed}</dd>
              </div>
              <div>
                <dt>{t.home.statClosingSoon}</dt>
                <dd>{closingSoon}</dd>
              </div>
            </dl>
          )}
        </div>
        {lastChecked && (
          <p className="hero__checked">
            {t.home.lastChecked} ·{' '}
            {new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastChecked))}
          </p>
        )}
        <button type="button" className="hero__cue" onClick={() => scrollToTarget('#notices', -72)}>
          {t.home.jumpToAll} <span aria-hidden>↓</span>
        </button>
      </section>

      {state.status === 'ok' && profile && (
        <section className="foryou" aria-labelledby="foryou-title">
          <div className="foryou__inner">
            <div className="section-head">
              <h2 id="foryou-title" className="section-head__title">
                <span aria-hidden>⭐</span> {t.home.forYouTitle}
              </h2>
              <p className="section-head__note">
                {t.home.forYouNote(profileLabel(profile, lang))}
              </p>
            </div>
            {home.forYou.length === 0 ? (
              <p className="foryou__empty">{t.home.forYouEmpty}</p>
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
              <span aria-hidden>📅</span> {t.home.upcomingTitle}
            </h2>
            <p className="section-head__note">
              {t.home.upcomingNote(UPCOMING_DAYS, !!profile)} · <Link to="/calendar">{t.home.viewCalendar}</Link>
            </p>
          </div>
          <UpcomingList events={home.upcoming} />
        </section>
      )}

      <section id="notices" className="list" aria-labelledby="list-title">
        <div className="list__head">
          <div>
            <h2 id="list-title" className="list__title">
              <span aria-hidden>📋</span> {t.home.allTitle} <em>{filter === ALL ? t.home.allTag : (options.find((o) => o.value === filter)?.label ?? filter)}</em>
            </h2>
            <p className="section-head__note">{t.home.allNote}</p>
          </div>
          <div className="list__sort" role="group" aria-label={t.home.sortGroup}>
            <button type="button" className="pill" aria-pressed={sort === 'latest'} onClick={() => update('sort', 'latest', 'latest')}>
              {t.home.sortLatest}
            </button>
            <button type="button" className="pill" aria-pressed={sort === 'deadline'} onClick={() => update('sort', 'deadline', 'latest')}>
              {t.home.sortDeadline}
            </button>
          </div>
        </div>

        {state.status === 'loading' && <StateMessage title={t.home.loading} />}
        {state.status === 'error' && (
          <StateMessage title={t.home.loadError} action={{ label: t.common.retry, onClick: state.retry }}>
            {t.home.loadErrorBody(state.error)}
          </StateMessage>
        )}
        {state.status === 'ok' && (
          <>
            <CategoryFilter options={options} value={filter} onChange={(v) => update('category', v, ALL)} label={t.home.filterGroup} />
            {visible.length === 0 ? (
              <StateMessage title={t.home.emptyFilter} action={{ label: t.home.showAll, onClick: () => update('category', ALL, ALL) }} />
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
