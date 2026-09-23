// Provider-agnostic contract for "prompt in, JSON text out". Providers only
// transport; schema validation and business checks live in analyze.ts, so
// every provider is held to the same rules.

export interface JsonRequest {
  system: string;
  user: string;
  /** Plain JSON Schema (draft 2020-12 subset) the reply must match. */
  jsonSchema: Record<string, unknown>;
}

export interface JsonResponse {
  /** Raw text as returned by the model; expected to be JSON. */
  text: string;
  /** Model version that actually answered (may be more specific than the requested id). */
  model: string;
  /** True if the model stopped early (token limit, safety block, refusal) so the JSON is unusable. */
  incomplete: boolean;
  /** Provider's own stop/finish reason, for error messages. */
  stopReason: string | null;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  /** Number of HTTP requests actually sent to the provider so far (if the provider tracks it). */
  readonly requestCount?: number;
  /** Throws AiApiError on transport/API failures. Never validates the JSON itself. */
  generateJson(req: JsonRequest): Promise<JsonResponse>;
}
