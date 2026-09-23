import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DdayBadge } from '../components/DdayBadge.tsx';
import { StateMessage } from '../components/StateMessage.tsx';
import { api, useApi } from '../lib/api.ts';
import { eventsByDay, monthCells, nextEventAfter, shiftMonth } from '../lib/calendar.ts';
import { shortDate, todayKst } from '../lib/dates.ts';
import { EVENT_LABEL } from '../lib/events.ts';
import { scrollToTarget } from '../lib/smoothScroll.ts';
import './CalendarPage.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MAX_CHIPS = 3;
const isDay = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * Month view of application deadlines and event dates.
 * URL state: ?month=YYYY-MM  &date=YYYY-MM-DD (selected day)  &notice=<id> (highlighted notice).
 * Everything lives in the URL so calendar → notice → back restores the same view.
 */
export function CalendarPage() {
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

  const update = (next: { month?: string; date?: string | null; notice?: number | null }) =>
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
      return p;
    }, { replace: true, preventScrollReset: true });

  const setMonth = (m: string) => update({ month: m, date: null, notice: null });
  const selectDay = (d: string | null) => update({ date: d, notice: null });

  const notices = state.status === 'ok' ? state.data : [];
  const byDay = useMemo(() => eventsByDay(notices), [notices]);
  const cells = monthCells(year, month);
  const monthEvents = cells.filter((c) => c.inMonth).flatMap((c) => byDay.get(c.date) ?? []);
  const agenda = selected ? (byDay.get(selected) ?? []) : monthEvents;
  const pending = notices.filter((n) => n.analysisStatus === 'pending').length;
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
          <p className="cal__eyebrow">
            {year}년 {month}월
          </p>
          <h1 className="cal__title">
            {MONTHS_EN[month - 1]} <em>{year}</em>
          </h1>
        </div>
        <div className="cal__nav" role="group" aria-label="월 이동">
          <button type="button" className="pill" onClick={() => setMonth(shiftMonth(ym, -1))} aria-label="이전 달">
            ←
          </button>
          <button type="button" className="pill" aria-pressed={ym === today.slice(0, 7) && !selected} onClick={() => setMonth(today.slice(0, 7))}>
            오늘
          </button>
          <button type="button" className="pill" onClick={() => setMonth(shiftMonth(ym, 1))} aria-label="다음 달">
            →
          </button>
        </div>
      </header>

      <div className="cal__legend">
        <span className="ev ev--deadline ev--sample">{EVENT_LABEL.deadline}</span>
        <span className="ev ev--event ev--sample">{EVENT_LABEL.event}</span>
        {state.status === 'ok' && (
          <span className="cal__legend-note">
            AI 분석이 끝난 공지의 날짜만 표시돼요{pending > 0 && ` · 분석 대기 ${pending}개는 아직 없어요`}
          </span>
        )}
      </div>

      {state.status === 'loading' && <StateMessage title="일정을 불러오는 중…" />}
      {state.status === 'error' && (
        <StateMessage title="일정을 불러오지 못했어요" action={{ label: '다시 시도', onClick: state.retry }}>
          {state.error}
        </StateMessage>
      )}
      {state.status === 'ok' && (
        <>
          <div className="grid" role="grid" aria-label={`${year}년 ${month}월`}>
            {WEEKDAYS.map((w, i) => (
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
                    aria-label={`${c.date} 일정 ${events.length}개`}
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
                              className={`ev ev--${e.kind}${highlight === e.notice.id ? ' ev--highlight' : ''}`}
                              title={`[${EVENT_LABEL[e.kind]}] ${e.notice.title}`}
                            >
                              {e.notice.title}
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
              <h2 className="agenda__title">{selected ? `${shortDate(selected)} 일정` : `${month}월 일정`}</h2>
              {selected && (
                <button type="button" className="pill" onClick={() => selectDay(null)}>
                  {month}월 전체 보기
                </button>
              )}
            </div>
            {agenda.length === 0 ? (
              <div className="agenda__empty">
                <p>{selected ? '이 날에는 일정이 없어요.' : '이번 달에는 표시할 일정이 없어요.'}</p>
                {!selected && next && (
                  <button
                    type="button"
                    className="pill"
                    onClick={() => update({ month: next.date.slice(0, 7), date: next.date.slice(0, 10), notice: next.notice.id })}
                  >
                    다음 일정 · {shortDate(next.date)} →
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
                      <span className="agenda__date">{shortDate(e.date)}</span>
                      <span className={`ev ev--${e.kind} ev--sample`}>{EVENT_LABEL[e.kind]}</span>
                      <span className="agenda__name">
                        {e.notice.title}
                        {e.notice.analysisStatus === 'stale' && <span className="agenda__stale"> · 원문 수정됨</span>}
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
