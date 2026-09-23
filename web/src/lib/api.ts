import { useEffect, useState } from 'react';
import type { ApiError, NoticeDetail, NoticeListItem } from '@shared/api/types.ts';

// Thin client for src/server.ts. Types come from the backend — no duplicated shapes.
// Static hosting (GitHub Pages) has no server: `npm run export` writes the same responses
// as JSON files, and VITE_STATIC_API=1 points the client at them instead.

const STATIC = import.meta.env.VITE_STATIC_API === '1';
const BASE = import.meta.env.BASE_URL; // '/' in dev, '/<repo>/' on GitHub Pages

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal });
  // A static host answers unknown files with an HTML page (404, or 200 via SPA fallback).
  if (STATIC && (res.status === 404 || !res.headers.get('content-type')?.includes('json'))) {
    throw new Error('Notice not found');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  notices: (signal?: AbortSignal) => getJson<NoticeListItem[]>(STATIC ? `${BASE}api/notices.json` : '/api/notices', signal),
  notice: (id: number, signal?: AbortSignal) =>
    getJson<NoticeDetail>(STATIC ? `${BASE}api/notices/${id}.json` : `/api/notices/${id}`, signal),
};

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string; retry: () => void }
  | { status: 'ok'; data: T };

/**
 * Fetch on mount / when `key` changes; aborts on unmount. Also refetches quietly when the
 * tab regains focus, so newly ingested analyses appear without a manual reload.
 */
export function useApi<T>(load: (signal: AbortSignal) => Promise<T>, key: unknown = null): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    load(ctrl.signal).then(
      (data) => setState({ status: 'ok', data }),
      (err: Error) => {
        if (ctrl.signal.aborted) return;
        setState({ status: 'error', error: err.message, retry: () => setAttempt((n) => n + 1) });
      },
    );
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      load(new AbortController().signal).then((data) => setState({ status: 'ok', data }), () => {}); // keep showing old data on failure
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}
