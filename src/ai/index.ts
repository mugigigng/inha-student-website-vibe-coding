import { AiApiError } from '../errors.ts';
import { AnthropicProvider } from './anthropic.ts';
import { GeminiProvider } from './gemini.ts';
import { OpenRouterProvider } from './openrouter.ts';
import type { AiProvider } from './provider.ts';

export type { AiProvider } from './provider.ts';

// Switch providers with AI_PROVIDER (+ that provider's key/model env vars).
// Adding a provider = one file implementing AiProvider + one case here.
export function createProvider(env = process.env): AiProvider {
  const name = env.AI_PROVIDER || 'gemini';
  switch (name) {
    case 'gemini':
      return new GeminiProvider(requireKey(env, 'GEMINI_API_KEY'), env.GEMINI_MODEL || 'gemini-3.8-flash', {
        fallbackModels: (env.GEMINI_FALLBACK_MODELS ?? 'gemini-3.7-flash,gemini-3.6-flash').split(',').map((m) => m.trim()).filter(Boolean),
        cooldownFile: env.GEMINI_COOLDOWN_FILE ?? 'data/gemini-cooldown.json',
      });
    case 'openrouter':
      return new OpenRouterProvider(requireKey(env, 'OPENROUTER_API_KEY'), env.OPENROUTER_MODEL || 'openrouter/free');
    case 'anthropic':
      return new AnthropicProvider(requireKey(env, 'ANTHROPIC_API_KEY'), env.ANTHROPIC_MODEL || 'claude-sonnet-5');
    default:
      throw new AiApiError(`Unknown AI_PROVIDER "${name}" (expected "gemini", "openrouter" or "anthropic")`);
  }
}

function requireKey(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) throw new AiApiError(`${key} is not set (add it to .env)`);
  return value;
}
