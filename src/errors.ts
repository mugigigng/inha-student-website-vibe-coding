// One error class per failure mode the POC must surface. The CLI prints the
// class name + message so no failure is silently swallowed.

export class PocError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** DNS failure, connection refused, timeout. */
export class NetworkError extends PocError {}

/** Non-200 status, non-HTML response, or page structure we can't parse. */
export class InvalidResponseError extends PocError {}

/** Page parsed but the notice body is empty / too short to be a real notice. */
export class EmptyContentError extends PocError {}

/** AI provider call failed (auth, rate limit, overload, network). `status` is the HTTP status when known. */
export class AiApiError extends PocError {
  constructor(message: string, options?: { cause?: unknown; status?: number; noRequestSent?: boolean }) {
    super(message, options);
    this.status = options?.status;
    this.noRequestSent = options?.noRequestSent ?? false;
  }
  readonly status?: number;
  /** True when the provider refused locally (e.g. all models benched) without calling the API. */
  readonly noRequestSent: boolean;
}

/** Model replied, but not with JSON matching our schema. */
export class InvalidAiJsonError extends PocError {
  constructor(message: string, readonly rawResponse: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

/** The notice is already in the database. Not fatal; reported to the user. */
export class DuplicateNoticeError extends PocError {
  constructor(readonly noticeId: number, readonly contentChanged: boolean) {
    super(
      `Notice already stored (notices.id=${noticeId})` +
        (contentChanged ? '; the page content has CHANGED since first crawl (original kept, not overwritten)' : ''),
    );
  }
}
