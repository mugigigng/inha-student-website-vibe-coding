import { Link } from 'react-router-dom';
import { shortDate } from '../lib/dates.ts';
import { EVENT_LABEL, type NoticeEvent } from '../lib/events.ts';
import { DdayBadge } from './DdayBadge.tsx';
import './UpcomingList.css';

/** Compact date-first list of upcoming deadlines/events; each row opens the calendar on that day. */
export function UpcomingList({ events }: { events: NoticeEvent[] }) {
  return (
    <ul className="upcoming">
      {events.map((e) => (
        <li key={`${e.notice.id}-${e.kind}`}>
          <Link to={`/calendar?date=${e.date.slice(0, 10)}&month=${e.date.slice(0, 7)}&notice=${e.notice.id}`} className="upcoming__row">
            <span className="upcoming__date">{shortDate(e.date)}</span>
            <span className={`ev ev--${e.kind} ev--sample`}>{EVENT_LABEL[e.kind]}</span>
            <span className="upcoming__title">{e.notice.title}</span>
            {e.kind === 'deadline' ? <DdayBadge deadline={e.date} /> : <span />}
          </Link>
        </li>
      ))}
    </ul>
  );
}
