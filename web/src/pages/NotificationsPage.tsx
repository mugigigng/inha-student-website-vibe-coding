import { localizeNotification } from '@shared/notifications.ts';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DdayBadge } from '../components/DdayBadge.tsx';
import { StateMessage } from '../components/StateMessage.tsx';
import { api, useApi } from '../lib/api.ts';
import { fullDate, todayKst } from '../lib/dates.ts';
import { useLanguage } from '../lib/language.tsx';
import { buildNotifications, NOTIFICATION_DAYS } from '../lib/personalize.ts';
import { useProfile } from '../lib/profile.tsx';
import './NotificationsPage.css';

/**
 * Notification foundation, shown in-app only (no push/email yet). Messages are built in both
 * languages from stored data; the global language picks which version is displayed.
 */
export function NotificationsPage() {
  const { lang, t: all } = useLanguage();
  const t = all.notifications;
  const { profile } = useProfile();
  const state = useApi(api.notices);
  const items = useMemo(() => (state.status === 'ok' ? buildNotifications(state.data, profile, todayKst()) : []), [state, profile]);

  return (
    <section className="notif">
      <p className="notif__eyebrow">{t.eyebrow}</p>
      <h1 className="notif__title">{t.title}</h1>
      <p className="notif__note">{t.note(NOTIFICATION_DAYS)}</p>
      {!profile && (
        <p className="notif__note">
          <Link to="/profile">{t.noProfile}</Link>
        </p>
      )}

      {state.status === 'loading' && <StateMessage title={t.loading} />}
      {state.status === 'error' && (
        <StateMessage title={t.loadError} action={{ label: all.common.retry, onClick: state.retry }}>
          {state.error}
        </StateMessage>
      )}
      {state.status === 'ok' &&
        (items.length === 0 ? (
          <StateMessage title={t.empty} />
        ) : (
          <ul className="notif__list">
            {items.map((m) => {
              const { title, body } = localizeNotification(m, lang);
              return (
                <li key={m.noticeId}>
                  <Link to={`/notices/${m.noticeId}`} className={`notif__item notif__item--${m.kind}`}>
                    <span className="notif__kind">
                      {m.kind === 'relevant' && <span aria-hidden>⭐ </span>}
                      {title}
                    </span>
                    <span className="notif__body">{body}</span>
                    <span className="notif__meta">
                      {m.publishedAt ? fullDate(m.publishedAt, lang) : ''}
                      <DdayBadge deadline={m.deadline} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
    </section>
  );
}
