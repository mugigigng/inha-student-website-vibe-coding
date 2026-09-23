import { ApiError, FinishReason, GoogleGenAI } from '@google/genai';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { AiApiError } from '../errors.ts';
import type { AiProvider, JsonRequest, JsonResponse } from './provider.ts';

// Statuses where another model may succeed (overload / quota).
const FALLBACK_STATUSES = new Set([429, 500, 503, 504]);
const OVERLOAD_COOLDOWN_MS = 30_000;
const RATE_LIMIT_COOLDOWN_MS = 60_000; // free-tier limits are per minute
/** Longest we'll pause a run waiting for a rate-limited model to come back. */
const MAX_WAIT_MS = 65_000;
/** Cooldowns at least this long (daily quota) are saved so the next run doesn't re-discover them. */
const PERSIST_MIN_MS = 3600_000;

export interface GeminiOptions {
  fallbackModels?: string[];
  log?: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
  /** JSON file remembering daily-quota cooldowns across runs; omit to keep them in memory only. */
  cooldownFile?: string;
}

export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  /** Actual HTTP requests sent to Gemini (every attempt, every model). */
  requestCount = 0;
  private readonly client: GoogleGenAI;
  /** model -> epoch ms until which it is skipped (rate-limited / overloaded). */
  private readonly cooldownUntil = new Map<string, number>();

  private readonly fallbackModels: string[];
  private readonly log: (line: string) => void;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly cooldownFile?: string;

  constructor(
    apiKey: string,
    readonly model: string,
    opts: GeminiOptions = {},
  ) {
    this.fallbackModels = opts.fallbackModels ?? [];
    this.log = opts.log ?? console.log;
    this.sleep = opts.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
    this.cooldownFile = opts.cooldownFile;
    this.loadCooldowns();
    // No SDK-level retries: they re-hit a rate-limited model several times, silently.
    // Retrying is done here by moving to the next model and remembering cooldowns.
    this.client = new GoogleGenAI({ apiKey });
  }

  private loadCooldowns() {
    if (!this.cooldownFile) return;
    let saved: Record<string, number>;
    try {
      saved = JSON.parse(readFileSync(this.cooldownFile, 'utf8'));
    } catch {
      return; // no file yet / unreadable -> start fresh
    }
    const now = Date.now();
    for (const [model, until] of Object.entries(saved)) {
      if (until > now) {
        this.cooldownUntil.set(model, until);
        this.log(`[AI] ${model} benched until ${new Date(until).toISOString()} (daily quota hit in an earlier run)`);
      }
    }
  }

  private setCooldown(model: string, ms: number) {
    this.cooldownUntil.set(model, Date.now() + ms);
    if (!this.cooldownFile || ms < PERSIST_MIN_MS) return;
    const long = Object.fromEntries([...this.cooldownUntil].filter(([, until]) => until - Date.now() >= PERSIST_MIN_MS));
    mkdirSync(dirname(this.cooldownFile), { recursive: true });
    writeFileSync(this.cooldownFile, JSON.stringify(long, null, 2));
  }

  async generateJson(req: JsonRequest): Promise<JsonResponse> {
    const chain = [this.model, ...this.fallbackModels.filter((m) => m !== this.model)];
    const failures: string[] = [];
    let lastError: unknown;

    // Try every model not cooling down; if all are, wait once (if short) and try again.
    let resumeAt = 0; // after a wait, treat models whose cooldown ended by then as available
    let waited = false;
    for (;;) {
      const now = Math.max(Date.now(), resumeAt);
      const available = chain.filter((m) => (this.cooldownUntil.get(m) ?? 0) <= now);
      if (available.length === 0) {
        resumeAt = Math.min(...chain.map((m) => this.cooldownUntil.get(m)!));
        const waitMs = resumeAt - now;
        if (waited || waitMs > MAX_WAIT_MS) break;
        this.log(`[AI] All Gemini models rate-limited; waiting ${Math.ceil(waitMs / 1000)}s`);
        await this.sleep(waitMs);
        waited = true;
        continue;
      }
      for (const [i, model] of available.entries()) {
        try {
          this.requestCount++;
          this.log(`[AI] Gemini request made (model=${model})`);
          return await this.call(model, req);
        } catch (err) {
          lastError = err;
          if (!(err instanceof ApiError) || !FALLBACK_STATUSES.has(err.status)) throw toAiApiError(err, failures);
          const cooldown = cooldownFor(err);
          this.setCooldown(model, cooldown);
          failures.push(`${model}: ${err.status}`);
          const next = available[i + 1];
          this.log(
            `[AI] ${model} unavailable (HTTP ${err.status}); skipping it for ${Math.round(cooldown / 1000)}s` +
              (next ? `; falling back to ${next}` : ''),
          );
        }
      }
      if (waited) break; // already waited once and it still failed; give up for this notice
    }
    throw lastError
      ? toAiApiError(lastError, failures.slice(0, -1))
      : new AiApiError('All Gemini models are benched after rate limits (daily quota); no request sent', { status: 429, noRequestSent: true });
  }

  private async call(model: string, { system, user, jsonSchema }: JsonRequest): Promise<JsonResponse> {
    const res = await this.client.models.generateContent({
      model,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
        responseJsonSchema: jsonSchema,
        temperature: 0,
      },
    });
    const candidate = res.candidates?.[0];
    const finish = candidate?.finishReason ?? null;
    const blocked = res.promptFeedback?.blockReason;
    return {
      text: res.text ?? '',
      model: res.modelVersion ?? model,
      incomplete: Boolean(blocked) || !candidate || finish !== FinishReason.STOP,
      stopReason: blocked ? `prompt blocked: ${blocked}` : finish,
    };
  }
}

/** Uses Google's own retry hint when present; daily quota exhaustion benches the model until the reset. */
function cooldownFor(err: ApiError): number {
  if (err.status !== 429) return OVERLOAD_COOLDOWN_MS;
  if (/PerDay/i.test(err.message)) return msUntilPacificMidnight() + 60_000;
  const retryDelay = err.message.match(/retryDelay\\?"?\s*:\s*\\?"(\d+(?:\.\d+)?)s/);
  return retryDelay ? Math.ceil(Number(retryDelay[1]) * 1000) + 1000 : RATE_LIMIT_COOLDOWN_MS;
}

/** Gemini's per-day quotas reset at midnight Pacific time. */
export function msUntilPacificMidnight(now = new Date()): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(now)
      .map((p) => [p.type, Number(p.value)]),
  );
  const elapsed = ((parts.hour % 24) * 3600 + parts.minute * 60 + parts.second) * 1000;
  return 24 * 3600_000 - elapsed;
}

function toAiApiError(err: unknown, earlierFailures: string[]): AiApiError {
  const tried = earlierFailures.length ? ` (after fallbacks failed: ${earlierFailures.join(', ')})` : '';
  if (err instanceof ApiError) {
    const daily = err.status === 429 && /PerDay/i.test(err.message);
    const hint = err.status === 429 ? (daily ? ' (free-tier DAILY quota exhausted)' : ' (free-tier rate limit)') : '';
    return new AiApiError(`Gemini API error ${err.status}${hint}${tried}: ${err.message}`, { cause: err, status: err.status });
  }
  return new AiApiError(`Could not reach Gemini API${tried}: ${(err as Error).message}`, { cause: err });
}
