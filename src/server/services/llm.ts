// ─────────────────────────────────────────────────────────────────────────────
// OpenAI-compatible LLM adapter.
// OpenAI, DeepSeek, and xAI all expose the same /chat/completions API, so a
// single client switches between them via env (LLM_PROVIDER / LLM_MODEL).
// ─────────────────────────────────────────────────────────────────────────────

import type { LlmProvider } from "@/features/perspectives/data/models";

export type { LlmProvider };

interface ProviderConfig {
  baseUrl: string;
  apiKeyEnv: string;
  /** Sensible default model if LLM_MODEL is unset. */
  defaultModel: string;
  /**
   * Whether the provider supports OpenAI's strict `json_schema` response format.
   * DeepSeek/xAI only support `{ type: "json_object" }`, so we fall back to that
   * and rely on the prompt + JSON repair for those.
   */
  supportsJsonSchema: boolean;
}

const PROVIDERS: Record<LlmProvider, ProviderConfig> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    defaultModel: "gpt-4o",
    supportsJsonSchema: true,
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-chat",
    supportsJsonSchema: false,
  },
  xai: {
    baseUrl: "https://api.x.ai/v1",
    apiKeyEnv: "XAI_API_KEY",
    defaultModel: "grok-4.3",
    supportsJsonSchema: false,
  },
};

/**
 * Resolves which provider/model/key to use. An explicit `override` (from the
 * user's model picker) wins; otherwise falls back to the env defaults.
 */
function resolveProvider(override?: {
  provider?: LlmProvider;
  model?: string;
}): { config: ProviderConfig; model: string; apiKey: string } {
  const provider = override?.provider ?? ((process.env.LLM_PROVIDER ?? "openai") as LlmProvider);
  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unknown LLM provider "${provider}". Use openai | deepseek | xai.`);
  }
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) {
    throw new Error(`${config.apiKeyEnv} is not set for provider "${provider}".`);
  }
  const model = override?.model?.trim() || process.env.LLM_MODEL?.trim() || config.defaultModel;
  return { config, model, apiKey };
}

/** True if the provider's API key env var is set (presence check, not validity). */
export function isProviderConfigured(provider: LlmProvider): boolean {
  const config = PROVIDERS[provider];
  return !!config && !!process.env[config.apiKeyEnv]?.trim();
}

/** The providers that currently have an API key configured. */
export function configuredProviders(): LlmProvider[] {
  return (Object.keys(PROVIDERS) as LlmProvider[]).filter(isProviderConfigured);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface InvokeOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** JSON schema for strict structured output. */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  /** Override the env-default provider (from the user's model picker). */
  provider?: LlmProvider;
  /** Override the env-default model id (from the user's model picker). */
  model?: string;
}

interface ChatCompletion {
  choices: Array<{
    message: { content: string | null };
    finish_reason: string | null;
  }>;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 600;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Calls the configured provider's chat-completions endpoint with retries. */
export async function invokeLLM(opts: InvokeOptions): Promise<string> {
  const { config, model, apiKey } = resolveProvider({
    provider: opts.provider,
    model: opts.model,
  });

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? 6000,
    temperature: opts.temperature ?? 0.7,
  };

  if (opts.jsonSchema) {
    // OpenAI enforces the schema strictly; DeepSeek/xAI only guarantee valid
    // JSON via json_object, so we lean on the prompt + repair for those.
    body.response_format = config.supportsJsonSchema
      ? {
          type: "json_schema",
          json_schema: { name: opts.jsonSchema.name, strict: true, schema: opts.jsonSchema.schema },
        }
      : { type: "json_object" };
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // Retry transient 429/5xx; fail fast on 4xx config errors.
        if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
          await sleep(BASE_DELAY_MS * 2 ** attempt);
          continue;
        }
        throw new Error(`LLM request failed: ${res.status} ${res.statusText} – ${text}`);
      }

      const json = (await res.json()) as ChatCompletion;
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM returned an empty response.");
      return content;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("LLM request failed.");
}
