import type { ApiMeta, NoticeListItem } from '@shared/api/types.ts';

/**
 * The home page's "notice boards last checked" time (ISO) or null to hide the line.
 * meta: undefined = still loading (hide, so the time doesn't jump), null = unavailable (a static
 * snapshot from before api/meta.json, or a failed request). Without a stored board check this
 * falls back to the newest crawledAt, as before incremental ingest.
 */
export function lastCheckedAt(meta: ApiMeta | null | undefined, notices: Pick<NoticeListItem, 'crawledAt'>[]): string | null {
  if (meta === undefined) return null;
  return meta?.lastCheckedAt ?? latestCrawl(notices);
}

export const latestCrawl = (notices: Pick<NoticeListItem, 'crawledAt'>[]): string | null =>
  notices.reduce<string | null>((max, n) => (!max || n.crawledAt > max ? n.crawledAt : max), null);
