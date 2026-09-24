import { LANGS } from '../lib/i18n.ts';
import { useLanguage } from '../lib/language.tsx';
import './LanguageToggle.css';

/**
 * [ 한국어 | English ] — controls the single global app language (lib/language.tsx).
 * Shown on the notice pages only (list + detail), but it drives the app-wide language, so the
 * choice applies to every page.
 * Switching never fetches or translates anything.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useLanguage();
  return (
    <div className={`lang${className ? ` ${className}` : ''}`} role="group" aria-label={t.langGroup}>
      {LANGS.map((l) => (
        <button key={l.value} type="button" className="lang__btn" aria-pressed={lang === l.value} lang={l.value} onClick={() => setLang(l.value)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
