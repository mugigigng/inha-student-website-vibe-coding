import { useEffect } from 'react';
import { Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { Nav } from './components/Nav.tsx';
import { useLanguage } from './lib/language.tsx';
import { resetScroll, useSmoothScroll } from './lib/smoothScroll.ts';
import { CalendarPage } from './pages/CalendarPage.tsx';
import { NoticeDetailPage } from './pages/NoticeDetailPage.tsx';
import { NoticeListPage } from './pages/NoticeListPage.tsx';
import { NotificationsPage } from './pages/NotificationsPage.tsx';
import { Placeholder } from './pages/Placeholder.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';

export function App() {
  useSmoothScroll();
  const { pathname } = useLocation();
  useEffect(() => resetScroll(), [pathname]);
  const { t, setLang } = useLanguage();

  // Older shared links carry ?lang=en|ko (the former detail-page-only toggle): adopt it as the
  // global language once, then drop it so the URL has no second source of truth.
  const [params, setParams] = useSearchParams();
  const urlLang = params.get('lang');
  useEffect(() => {
    if (urlLang === null) return;
    if (urlLang === 'en' || urlLang === 'ko') setLang(urlLang);
    setParams((p) => {
      p.delete('lang');
      return p;
    }, { replace: true, preventScrollReset: true });
  }, [urlLang, setLang, setParams]);

  return (
    <>
      <div className="scroll-progress" aria-hidden />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<NoticeListPage />} />
          <Route path="/notices/:id" element={<NoticeDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="*" element={<Placeholder />} />
        </Routes>
      </main>
      <footer className="site-foot">
        <span>{t.footer.disclaimer}</span>
        <span>© 2026 Inha notices</span>
      </footer>
    </>
  );
}
