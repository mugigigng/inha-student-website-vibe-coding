import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Nav } from './components/Nav.tsx';
import { resetScroll, useSmoothScroll } from './lib/smoothScroll.ts';
import { CalendarPage } from './pages/CalendarPage.tsx';
import { NoticeDetailPage } from './pages/NoticeDetailPage.tsx';
import { NoticeListPage } from './pages/NoticeListPage.tsx';
import { Placeholder } from './pages/Placeholder.tsx';

export function App() {
  useSmoothScroll();
  const { pathname } = useLocation();
  useEffect(() => resetScroll(), [pathname]);

  return (
    <>
      <div className="scroll-progress" aria-hidden />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<NoticeListPage />} />
          <Route path="/notices/:id" element={<NoticeDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="*" element={<Placeholder title="페이지를 찾을 수 없어요" />} />
        </Routes>
      </main>
      <footer className="site-foot">
        <span>인하대학교 공식 공지를 AI로 정리한 비공식 서비스예요. 중요한 내용은 꼭 원문에서 확인하세요.</span>
        <span>© 2026 Inha notices</span>
      </footer>
    </>
  );
}
