import { Link, NavLink } from 'react-router-dom';
import './Nav.css';

const LINKS = [
  { to: '/', label: '공지', end: true },
  { to: '/calendar', label: '캘린더', end: false },
];

export function Nav() {
  return (
    <header className="nav">
      <Link to="/" className="nav__brand" aria-label="인하 공지 홈">
        <span className="nav__brand-mark">Inha</span> <em>notices</em>
      </Link>
      <nav aria-label="주요 메뉴">
        <ul className="nav__links">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end} className="pill">
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
