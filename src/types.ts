/** What every source module returns. Nothing in here is AI-generated. */
export interface RawNotice {
  /** Source key, e.g. "inha-main-notice". One per board/site. */
  source: string;
  /** The site's own article number, e.g. "45601". Dedup key together with `source`. */
  sourceNoticeId: string;
  sourceUrl: string;
  title: string;
  /** Normalized plain-text body (no HTML). */
  originalContent: string;
  /** Body HTML as served, kept so we can re-parse if the extractor turns out wrong. */
  rawHtml: string;
  /** ISO date (YYYY-MM-DD) from the page's 작성일 field, or null. */
  publishedAt: string | null;
  /** Board's own category label (분류), e.g. "모집/채용", or null. */
  boardCategory: string | null;
  author: string | null;
  /** Images and file attachments the text extractor did NOT read (posters, .hwp forms). */
  attachments: { kind: 'image' | 'file'; name: string; url: string }[];
  crawledAt: string;
}
