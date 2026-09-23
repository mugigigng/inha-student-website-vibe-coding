import * as cheerio from 'cheerio';
import { EmptyContentError, InvalidResponseError, NetworkError } from '../errors.ts';
import type { RawNotice } from '../types.ts';

// Source: 인하대학교 대표 홈페이지 공지사항 (www.inha.ac.kr, board 8).
// Article pages have stable URLs: https://www.inha.ac.kr/bbs/kr/8/{id}/artclView.do
// Adding another Inha board later = another module in src/sources/ returning RawNotice.

export const SOURCE = 'inha-main-notice';
const ORIGIN = 'https://www.inha.ac.kr';
const URL_PATTERN = /^https:\/\/www\.inha\.ac\.kr\/bbs\/kr\/8\/(\d+)\/artclView\.do$/;
const USER_AGENT = 'inha-notice-poc/0.1 (student project; contact: repo owner)';
const TIMEOUT_MS = 15_000;
const MIN_CONTENT_CHARS = 30;

export function parseNoticeUrl(url: string): { sourceNoticeId: string; canonicalUrl: string } {
  const clean = url.trim().replace(/^http:/, 'https:').split(/[?#]/)[0];
  const m = clean.match(URL_PATTERN);
  if (!m) throw new InvalidResponseError(`Not an ${SOURCE} article URL: ${url}`);
  return { sourceNoticeId: m[1], canonicalUrl: clean };
}

export async function fetchNotice(url: string): Promise<RawNotice> {
  const { sourceNoticeId, canonicalUrl } = parseNoticeUrl(url);
  const html = await fetchHtml(canonicalUrl);
  return parseNoticeHtml(html, { sourceNoticeId, canonicalUrl });
}

/** One row of the board's list page. Only the ID/URL is trusted; details come from the article page. */
export interface ListedNotice {
  sourceNoticeId: string;
  url: string;
  title: string;
  /** 작성일 shown in the list, YYYY-MM-DD. */
  listedDate: string | null;
  /** Pinned "일반공지" rows repeat on every page and can be old. */
  pinned: boolean;
}

/** Reads list pages 1..pages and returns unique notices in page order. */
export async function listNotices({ pages = 1 }: { pages?: number } = {}): Promise<ListedNotice[]> {
  const seen = new Map<string, ListedNotice>();
  for (let page = 1; page <= pages; page++) {
    const html = await fetchHtml(`${ORIGIN}/bbs/kr/8/artclList.do?page=${page}`);
    const rows = parseListHtml(html);
    if (rows.length === 0) throw new InvalidResponseError(`List page ${page} has no notice rows (layout changed or site error page)`);
    for (const row of rows) if (!seen.has(row.sourceNoticeId)) seen.set(row.sourceNoticeId, row);
  }
  return [...seen.values()];
}

export function parseListHtml(html: string): ListedNotice[] {
  const $ = cheerio.load(html);
  const rows: ListedNotice[] = [];
  $('table.artclTable tbody tr').each((_, tr) => {
    const href = $(tr).find('a.artclLinkView').attr('href');
    const m = href?.match(/\/bbs\/kr\/8\/(\d+)\/artclView\.do/);
    if (!m) return;
    const title = normalizeInline($(tr).find('a.artclLinkView').clone().children().remove().end().text());
    rows.push({
      sourceNoticeId: m[1],
      url: `${ORIGIN}/bbs/kr/8/${m[1]}/artclView.do`,
      title,
      listedDate: parseKoreanDate($(tr).find('._artclTdRdate').text()),
      pinned: $(tr).hasClass('headline'),
    });
  });
  return rows;
}

async function fetchHtml(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ko' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new NetworkError(`Request to ${url} failed: ${(err as Error).message}`, { cause: err });
  }
  if (!res.ok) throw new InvalidResponseError(`HTTP ${res.status} ${res.statusText} from ${url}`);
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new InvalidResponseError(`Expected HTML, got "${contentType}" from ${url}`);
  }
  return res.text();
}

export function parseNoticeHtml(
  html: string,
  { sourceNoticeId, canonicalUrl }: { sourceNoticeId: string; canonicalUrl: string },
): RawNotice {
  const $ = cheerio.load(html);

  const title = normalizeInline($('.artclViewTitle').first().text());
  const body = $('.artclView').first();
  if (!title || body.length === 0) {
    throw new InvalidResponseError(
      `Page structure not recognized (title=${Boolean(title)}, body=${body.length > 0}). ` +
        `The notice may have been deleted or the site layout changed.`,
    );
  }

  // Header metadata is a list of <dl><dt>label</dt><dd>value</dd></dl>.
  const meta = new Map<string, string>();
  $('.artclViewHead dl').each((_, dl) => {
    meta.set(normalizeInline($(dl).find('dt').text()), normalizeInline($(dl).find('dd').text()));
  });

  const attachments: RawNotice['attachments'] = [];
  body.find('img[src]').each((_, img) => {
    const src = new URL($(img).attr('src')!, ORIGIN).href;
    attachments.push({ kind: 'image', name: decodeURIComponent(src.split('/').pop() ?? src), url: src });
  });
  $('a[href*="/download.do"]').each((_, a) => {
    attachments.push({ kind: 'file', name: normalizeInline($(a).text()), url: new URL($(a).attr('href')!, ORIGIN).href });
  });

  const rawHtml = body.html() ?? '';
  const originalContent = htmlToText(rawHtml);
  if (originalContent.length < MIN_CONTENT_CHARS) {
    throw new EmptyContentError(
      `Notice body has only ${originalContent.length} chars of text` +
        (attachments.length ? ` (content is probably in ${attachments.length} image/file attachment(s))` : ''),
    );
  }

  return {
    source: SOURCE,
    sourceNoticeId,
    sourceUrl: canonicalUrl,
    title,
    originalContent,
    rawHtml,
    publishedAt: parseKoreanDate(meta.get('작성일')),
    boardCategory: meta.get('분류') || null,
    author: meta.get('작성자') || null,
    attachments,
    crawledAt: new Date().toISOString(),
  };
}

/** Block-level tags become line breaks; inline tags are removed; whitespace collapsed per line. */
function htmlToText(html: string): string {
  const $ = cheerio.load(`<div id="root">${html.replace(/<br\s*\/?>/gi, '\n')}</div>`);
  $('script, style').remove();
  $('p, div, li, tr, h1, h2, h3, h4, h5, h6').each((_, el) => {
    $(el).append('\n');
  });
  return $('#root')
    .text()
    .replace(/ /g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function normalizeInline(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** "2026.09.22." -> "2026-09-22" */
function parseKoreanDate(s: string | undefined): string | null {
  const m = s?.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
}
