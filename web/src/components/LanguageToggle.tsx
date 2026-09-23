import { LANGS, type Lang } from '../lib/i18n.ts';
import './LanguageToggle.css';

/** Compact 🇰🇷/🇺🇸 switch. Pure UI state: switching never fetches or translates anything. */
export function LanguageToggle({ value, onChange, label }: { value: Lang; onChange: (l: Lang) => void; label: string }) {
  return (
    <div className="lang" role="group" aria-label={label}>
      {LANGS.map((l) => (
        <button key={l.value} type="button" className="lang__btn" aria-pressed={value === l.value} lang={l.value} onClick={() => onChange(l.value)}>
          <span aria-hidden>{l.flag}</span> {l.label}
        </button>
      ))}
    </div>
  );
}
