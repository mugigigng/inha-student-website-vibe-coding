// Response shapes of the read-only HTTP API (src/server.ts), shared with the web frontend.
// Type-only imports: nothing here pulls AI or DB code into the browser bundle.
import type { Analysis, AnalysisEn } from '../analyze.ts';
import type { RawNotice } from '../types.ts';

/**
 * ready   = analysis made from the notice's current text
 * stale   = the notice changed after it was analyzed (analysis shown, but flagged)
 * pending = not analyzed yet (new, failed, or deferred by AI quota)
 */
export type AnalysisStatus = 'ready' | 'stale' | 'pending';

export type { AnalysisEn };

export type NoticeAnalysis = Omit<Analysis, 'en'> & {
  /** English rendering (prompt v3+). null for older analyses — the UI must fall back to Korean. */
  en: AnalysisEn | null;
  provider: string;
  model: string;
  promptVersion: string;
  validationWarnings: string[];
  analyzedAt: string;
};

export interface NoticeListItem {
  id: number;
  sourceNoticeId: string;
  title: string;
  /** Official notice URL — always shown so users can verify. */
  sourceUrl: string;
  publishedAt: string | null;
  boardCategory: string | null;
  crawledAt: string;
  contentUpdatedAt: string | null;
  analysisStatus: AnalysisStatus;
  analysis: NoticeAnalysis | null;
}

export interface NoticeDetail extends NoticeListItem {
  author: string | null;
  attachments: RawNotice['attachments'];
  originalContent: string;
}

export interface ApiError {
  error: string;
}
