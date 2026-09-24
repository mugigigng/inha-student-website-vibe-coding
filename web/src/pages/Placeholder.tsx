import { Link } from 'react-router-dom';
import { StateMessage } from '../components/StateMessage.tsx';
import { useLanguage } from '../lib/language.tsx';

/** Not-found / not-yet-built route. */
export function Placeholder() {
  const { t } = useLanguage();
  return (
    <section style={{ padding: '140px var(--gutter) 80px', maxWidth: 'var(--max)', margin: '0 auto' }}>
      <StateMessage title={t.common.notFoundPage}>{t.common.notFoundPageBody}</StateMessage>
      <p style={{ textAlign: 'center' }}>
        <Link to="/" className="pill">
          {t.common.backToList}
        </Link>
      </p>
    </section>
  );
}
