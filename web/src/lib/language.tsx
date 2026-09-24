import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translations, type Lang, type Translations } from './i18n.ts';

// The ONE source of truth for the app language. Every page/component reads it via useLanguage();
// no page keeps its own language state. Persisted in localStorage; Korean on the first visit.
// Switching only re-renders: it never fetches, translates or calls the AI.

export const LANGUAGE_KEY = 'appLanguage';

const isLang = (v: unknown): v is Lang => v === 'ko' || v === 'en';

function load(): Lang {
  try {
    const v = localStorage.getItem(LANGUAGE_KEY);
    return isLang(v) ? v : 'ko';
  } catch {
    return 'ko'; // private mode / blocked storage
  }
}

interface LanguageState {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** UI strings for the current language. */
  t: Translations;
}

const Ctx = createContext<LanguageState | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(load);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANGUAGE_KEY, l);
    } catch {
      /* storage unavailable: the choice still applies for this session */
    }
  }, []);

  // <html lang> for screen readers, fonts and hyphenation; tab title in the same language
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === 'en' ? `${translations.en.siteName} · ${translations.ko.siteName}` : `${translations.ko.siteName} · ${translations.en.siteName}`;
  }, [lang]);

  // keep other tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === LANGUAGE_KEY && setLangState(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return <Ctx.Provider value={{ lang, setLang, t: translations[lang] }}>{children}</Ctx.Provider>;
}

export function useLanguage(): LanguageState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
