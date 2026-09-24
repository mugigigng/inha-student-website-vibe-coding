import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DdayBadge } from '../components/DdayBadge.tsx';
import { StateMessage } from '../components/StateMessage.tsx';
import { api, useApi } from '../lib/api.ts';
import { eventsByDay, monthCells, nextEventAfter, shiftMonth } from '../lib/calendar.ts';
import { shortDate, todayKst } from '../lib/dates.ts';
import { noticeTitle } from '../lib/i18n.ts';
import { useLanguage } from '../lib/language.tsx';
import { useSaved } from '../lib/saved.tsx';
import { scrollToTarget } from '../lib/smoothScroll.ts';
import './CalendarPage.css';

const MAX_CHIPS = 3;
const isDay = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * Month view of application deadlines and event dates.
 * URL state: ?month=YYYY-MM  &date=YYYY-MM-DD (selected day)  &notice=<id> (highlighted notice)
 *            &view=mine (only notices the student added with "캘린더에 추가").
 * Everything lives in the URL so calendar → notice → back restores the same view.
 */
export function CalendarPage() {
  const { lang, t: all } = useLanguage();
  const t = all.calendar;
  const state = useApi(api.notices);
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const today = todayKst();

  const selected = isDay(params.get('date')) ? params.get('date')! : null;
  const monthParam = params.get('month');
  const ym = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : (selected?.slice(0, 7) ?? today.slice(0, 7));
  const [year, month] = ym.split('-').map(Number);
  const highlight = Number(params.get('notice')) || null;
  const mine = params.get('view') === 'mine';
  const { saved, isSaved } = useSaved();

  const update = (next: { month?: string; date?: string | null; notice?: number | null; mine?: boolean }) =>
    setParams((p) => {
      if (next.month !== undefined) {
        if (next.month === today.slice(0, 7)) p.delete('month');
        else p.set('month', next.month);
      }
      if (next.date !== undefined) {
        if (next.date) p.set('date', next.date);
        else p.delete('date');
      }
      if (next.notice !== undefined) {
        if (next.notice) p.set('notice', String(next.notice));
        else p.delete('notice');
      }
      if (next.mine !== undefined) {
        if (next.mine) p.set('view', 'mine');
        else p.delete('view');
      }
      return p;
    }, { replace: true, preventScrollReset: true });

  const setMonth = (m: string) => update({ month: m, date: null, notice: null });
  const selectDay = (d: string | null) => update({ date: d, notice: null });

  const allNotices = state.status === 'ok' ? state.data : [];
  const savedCount = allNotices.filter((n) => saved.has(n.id)).length;
  const notices = mine ? allNotices.filter((n) => saved.has(n.id)) : allNotices;
  const byDay = useMemo(() => eventsByDay(notices), [notices]);
  const cells = monthCells(year, month);
  const monthEvents = cells.filter((c) => c.inMonth).flatMap((c) => byDay.get(c.date) ?? []);
  const agenda = selected ? (byDay.get(selected) ?? []) : monthEvents;
  const pending = allNotices.filter((n) => n.analysisStatus === 'pending').length;
  const next = monthEvents.length === 0 ? nextEventAfter(notices, `${ym}-01`) : null;
  // Where the notice page's back link should return to (this exact calendar view).
  const from = `${location.pathname}${location.search}`;

  // Arriving from a notice (?notice=): bring its agenda entry into view once data is loaded.
  useEffect(() => {
    if (state.status === 'ok' && highlight) {
      const el = document.querySelector<HTMLElement>(`.agenda [data-notice="${highlight}"]`);
      if (el) setTimeout(() => scrollToTarget(el, -120), 150);
    }
  }, [state.status, highlight]);

  return (
    <section className="cal">
      <header className="cal__head">
        <div>
          <p className="cal__eyebrow">{t.eyebrow(year, month)}</p>
          <h1 className="cal__title">
            {t.monthName(month)} <em>{year}</em>
          </h1>
        </div>
        <div className="cal__nav" role="group" aria-label={t.monthNav}>
          <button type="button" className="pill" onClick={() => setMonth(shiftMonth(ym, -1))} aria-label={t.prevMonth}>
            ←
          </button>
          <button type="button" className="pill" aria-pressed={ym === today.slice(0, 7) && !selected} onClick={() => setMonth(today.slice(0, 7))}>
            {t.today}
          </button>
          <button type="button" className="pill" onClick={() => setMonth(shiftMonth(ym, 1))} aria-label={t.nextMonth}>
            →
          </button>
        </div>
      </header>

      <div className="cal__legend">
        <div className="cal__view" role="group" aria-label={t.viewGroup}>
          <button type="button" className="pill" aria-pressed={!mine} onClick={() => update({ mine: false, date: null, notice: null })}>
            {t.viewAll}
          </button>
          <button type="button" className="pill" aria-pressed={mine} onClick={() => update({ mine: true, date: null, notice: null })}>
            ★ {t.viewMine(savedCount)}
          </button>
        </div>
        <span className="ev ev--deadline ev--sample">{all.events.deadline}</span>
        <span className="ev ev--event ev--sample">{all.events.event}</span>
        <span className="ev ev--event ev--saved ev--sample">★ {t.savedMark}</span>
        {state.status === 'ok' && (
          <span className="cal__legend-note">
            {t.legendNote}
            {pending > 0 && t.legendPending(pending)}
          </span>
        )}
      </div>

      {state.status === 'loading' && <StateMessage title={t.loading} />}
      {state.status === 'error' && (
        <StateMessage title={t.loadError} action={{ label: all.common.retry, onClick: state.retry }}>
          {state.error}
        </StateMessage>
      )}
      {state.status === 'ok' && (
        <>
          <div className="grid" role="grid" aria-label={t.monthTitle(year, month)}>
            {t.weekdays.map((w, i) => (
              <div key={w} role="columnheader" className={`grid__wd${i === 0 ? ' grid__wd--sun' : ''}`}>
                {w}
              </div>
            ))}
            {cells.map((c) => {
              const events = byDay.get(c.date) ?? [];
              const classes = [
                'grid__cell',
                !c.inMonth && 'grid__cell--out',
                c.date === today && 'grid__cell--today',
                c.date < today && 'grid__cell--past',
                selected === c.date && 'grid__cell--selected',
              ].filter(Boolean).join(' ');
              return (
                <div key={c.date} role="gridcell" className={classes}>
                  <button
                    type="button"
                    className="grid__day"
                    onClick={() => selectDay(selected === c.date ? null : c.date)}
                    aria-label={t.dayLabel(c.date, events.length)}
                    aria-pressed={selected === c.date}
                    disabled={!c.inMonth}
                  >
                    {c.day}
                  </button>
                  {c.inMonth && events.length > 0 && (
                    <>
                      <ul className="grid__events">
                        {events.slice(0, MAX_CHIPS).map((e) => (
                          <li key={`${e.notice.id}-${e.kind}`}>
                            <Link
                              to={`/notices/${e.notice.id}`}
                              state={{ from }}
                              className={`ev ev--${e.kind}${isSaved(e.notice.id) ? ' ev--saved' : ''}${highlight === e.notice.id ? ' ev--highlight' : ''}`}
                              data-prefix={`${isSaved(e.notice.id) ? '★ ' : ''}${all.events.short[e.kind]}`}
                              title={`[${all.events[e.kind]}] ${noticeTitle(e.notice, lang)}`}
                            >
                              {noticeTitle(e.notice, lang)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {events.length > MAX_CHIPS && (
                        <button type="button" className="grid__more" onClick={() => selectDay(c.date)}>
                          +{events.length - MAX_CHIPS}
                        </button>
                      )}
                      {/* compact markers for narrow screens */}
                      <span className="grid__dots" aria-hidden>
                        {events.map((e) => (
                          <i key={`${e.notice.id}-${e.kind}`} className={`dot dot--${e.kind}${highlight === e.notice.id ? ' dot--highlight' : ''}`} />
                        ))}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <section className="agenda" aria-live="polite">
            <div className="agenda__head">
              <h2 className="agenda__title">{selected ? t.dayAgenda(shortDate(selected, lang)) : t.monthAgenda(month)}</h2>
              {selected && (
                <button type="button" className="pill" onClick={() => selectDay(null)}>
                  {t.showMonth(month)}
                </button>
              )}
            </div>
            {agenda.length === 0 ? (
              <div className="agenda__empty">
                <p>{mine && savedCount === 0 ? t.emptyMine : selected ? t.emptyDay : mine ? t.emptyMineMonth : t.emptyMonth}</p>
                {!selected && next && (
                  <button
                    type="button"
                    className="pill"
                    onClick={() => update({ month: next.date.slice(0, 7), date: next.date.slice(0, 10), notice: next.notice.id })}
                  >
                    {t.nextDate(shortDate(next.date, lang))}
                  </button>
                )}
              </div>
            ) : (
              <ul className="agenda__list">
                {agenda.map((e) => (
                  <li key={`${e.notice.id}-${e.kind}`}>
                    <button
                      type="button"
                      data-notice={e.notice.id}
                      className={`agenda__item${highlight === e.notice.id ? ' agenda__item--highlight' : ''}`}
                      onClick={() => navigate(`/notices/${e.notice.id}`, { state: { from } })}
                    >
                      <span className="agenda__date">{shortDate(e.date, lang)}</span>
                      <span className={`ev ev--${e.kind} ev--sample`}>{all.events[e.kind]}</span>
                      <span className="agenda__name">
                        {isSaved(e.notice.id) && (
                          <span className="agenda__saved" title={t.savedMark} aria-label={t.savedMark}>
                            ★{' '}
                          </span>
                        )}
                        {noticeTitle(e.notice, lang)}
                        {e.notice.analysisStatus === 'stale' && <span className="agenda__stale">{t.stale}</span>}
                      </span>
                      {e.kind === 'deadline' && <DdayBadge deadline={e.date} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}
