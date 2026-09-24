import { parseProfile, type Profile } from '@shared/profile.ts';
import { translations, type Lang } from './i18n.ts';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Local/demo profile: no accounts yet, so it lives in this browser's localStorage.
// Always validated on read; unusable data behaves like "no profile".

const KEY = 'inha-notices.profile.v1';

function load(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseProfile(JSON.parse(raw)) : null;
  } catch {
    return null; // private mode / blocked storage / corrupt JSON
  }
}

interface ProfileState {
  profile: Profile | null;
  save: (p: Profile) => void;
  clear: () => void;
}

const Ctx = createContext<ProfileState | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(load);

  // keep tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === KEY && setProfile(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = useCallback((p: Profile) => {
    setProfile(p);
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* storage unavailable: profile still works for this session */
    }
  }, []);
  const clear = useCallback(() => {
    setProfile(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return <Ctx.Provider value={{ profile, save, clear }}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}

/** "컴퓨터공학과 1학년" / "컴퓨터공학과, Year 1": only the label is localized; the major (user data) stays as stored. */
export const profileLabel = (p: Profile, lang: Lang = 'ko') => translations[lang].profile.label(p.major, p.year);
