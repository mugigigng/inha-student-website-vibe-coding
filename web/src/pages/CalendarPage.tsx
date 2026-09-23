import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DdayBadge } from '../components/DdayBadge.tsx';
import { StateMessage } from '../components/StateMessage.tsx';
import { api, useApi } from '../lib/api.ts';
import { shortDate, todayKst } from '../lib/dates.ts';
import { EVENT_LABEL, noticeEvents, type NoticeEvent } from '../lib/events.ts';
import './CalendarPage.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MAX_CHIPS = 3;

const pad = (n: number) => String(n).padStart(2, '0');
const key = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** All cells of the month grid (Sunday first), including leading/trailing days of adjacent months. */
function monthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((first.getUTCDay() + daysInMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: d.getUTCMonth() === month - 1 };
  });
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function CalendarPage() {
  const state = useApi(api.notices);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = todayKst();
  const ym = /^\d{4}-\d{2}$/.test(params.get('month') ?? '') ? params.get('month')! : today.slice(0, 7);
  const [year, month] = ym.split('-').map(Number);
  const [selected, setSelected] = useState<string | null>(null);

  const setMonth = (next: string) => {
    setSelected(null);
    setParams((p) => {
      if (next === today.slice(0, 7)) p.delete('month');
      else p.set('month', next);
      return p;
    }, { replace: true, preventScrollReset: true });
  };

  const notices = state.status === 'ok' ? state.data : [];
  const byDay = useMemo(() => {
    const map = new Map<string, NoticeEvent[]>();
    for (const e of notices.flatMap(noticeEvents)) {
      const k = e.date.slice(0, 10);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    for (const list of map.values()) list.sort((a, b) => (a.kind === b.kind ? a.date.localeCompare(b.date) : a.kind === 'deadline' ? -1 : 1));
    return map;
  }, [notices]);

  const cells = monthCells(year, month);
  const monthEvents = cells.filter((c) => c.inMonth).flatMap((c) => (byDay.get(c.date) ?? []).map((e) => ({ ...e, day: c.date })));
  const agenda = selected ? monthEvents.filter((e) => e.day === selected) : monthEvents;
  const pending = notices.filter((n) => n.analysisStatus === 'pending').length;

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
          <button type="button" className="pill" aria-pressed={ym === today.slice(0, 7)} onClick={() => setMonth(today.slice(0, 7))}>
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
                    onClick={() => setSelected(selected === c.date ? null : c.date)}
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
                            <Link to={`/notices/${e.notice.id}`} className={`ev ev--${e.kind}`} title={`[${EVENT_LABEL[e.kind]}] ${e.notice.title}`}>
                              {e.notice.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {events.length > MAX_CHIPS && (
                        <button type="button" className="grid__more" onClick={() => setSelected(c.date)}>
                          +{events.length - MAX_CHIPS}
                        </button>
                      )}
                      {/* compact markers for narrow screens */}
                      <span className="grid__dots" aria-hidden>
                        {events.map((e) => (
                          <i key={`${e.notice.id}-${e.kind}`} className={`dot dot--${e.kind}`} />
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
                <button type="button" className="pill" onClick={() => setSelected(null)}>
                  {month}월 전체 보기
                </button>
              )}
            </div>
            {agenda.length === 0 ? (
              <p className="agenda__empty">{selected ? '이 날에는 일정이 없어요.' : '이번 달에는 표시할 일정이 없어요.'}</p>
            ) : (
              <ul className="agenda__list">
                {agenda.map((e) => (
                  <li key={`${e.notice.id}-${e.kind}`}>
                    <button type="button" className="agenda__item" onClick={() => navigate(`/notices/${e.notice.id}`)}>
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
