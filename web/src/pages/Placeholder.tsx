import { Link } from 'react-router-dom';
import { StateMessage } from '../components/StateMessage.tsx';

/** Temporary page for routes built in the next steps (detail, calendar). */
export function Placeholder({ title }: { title: string }) {
  return (
    <section style={{ padding: '140px var(--gutter) 80px', maxWidth: 'var(--max)', margin: '0 auto' }}>
      <StateMessage title={title}>곧 만들어질 페이지예요.</StateMessage>
      <p style={{ textAlign: 'center' }}>
        <Link to="/" className="pill">
          ← 공지 목록
        </Link>
      </p>
    </section>
  );
}
