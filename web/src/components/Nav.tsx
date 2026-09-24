import { Link, NavLink } from 'react-router-dom';
import { useLanguage } from '../lib/language.tsx';
import './Nav.css';

const LINKS = [
  { to: '/', key: 'notices', end: true },
  { to: '/calendar', key: 'calendar', end: false },
  { to: '/notifications', key: 'notifications', end: false },
  { to: '/profile', key: 'profile', end: false },
] as const;

export function Nav() {
  const { t } = useLanguage();
  return (
    <header className="nav">
      <Link to="/" className="nav__brand notranslate" translate="no" aria-label={t.nav.brandLabel}>
        <span className="nav__brand-mark">{t.nav.brandMain}</span> <em>{t.nav.brandAccent}</em>
      </Link>
      <nav aria-label={t.nav.menu}>
        <ul className="nav__links">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end} className="pill">
                {t.nav[l.key]}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
