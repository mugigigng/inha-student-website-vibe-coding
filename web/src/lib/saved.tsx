import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// "캘린더에 추가": notices the student added to their in-app calendar ("내 일정").
// No accounts yet, so the list of notice ids lives in this browser's localStorage.
// The calendar still shows every analyzed notice; saved ones are marked and can be shown alone.

const KEY = 'inha-notices.saved.v1';

function load(): number[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? [...new Set(v.filter((x): x is number => Number.isInteger(x)))] : [];
  } catch {
    return []; // private mode / blocked storage / corrupt JSON
  }
}

interface SavedState {
  saved: ReadonlySet<number>;
  isSaved: (id: number) => boolean;
  add: (id: number) => void;
  remove: (id: number) => void;
}

const Ctx = createContext<SavedState | null>(null);

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<number[]>(load);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === KEY && setIds(load());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const write = useCallback((update: (cur: number[]) => number[]) => {
    setIds((cur) => {
      const next = update(cur);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: still works for this session */
      }
      return next;
    });
  }, []);

  const add = useCallback((id: number) => write((cur) => (cur.includes(id) ? cur : [...cur, id])), [write]);
  const remove = useCallback((id: number) => write((cur) => cur.filter((x) => x !== id)), [write]);
  const saved = new Set(ids);

  return <Ctx.Provider value={{ saved, isSaved: (id) => saved.has(id), add, remove }}>{children}</Ctx.Provider>;
}

export function useSaved(): SavedState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSaved must be used inside <SavedProvider>');
  return ctx;
}
