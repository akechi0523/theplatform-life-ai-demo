// ─────────────────────────────────────────────────────────────────────────────
// LLM adapter.
// OpenAI, DeepSeek, xAI, and Gemini all expose the same /chat/completions API
// (Gemini via Google's OpenAI-compatible endpoint), so a single client switches
// between them via env (LLM_PROVIDER / LLM_MODEL). Anthropic has no compatible
// endpoint, so Claude is handled by a dedicated branch using the official SDK —
// it returns the same normalized shapes, so callers don't care which path ran.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
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
  /**
   * Whether the provider accepts `stream_options: { include_usage: true }` to
   * append a token-usage frame to the stream. OpenAI/DeepSeek do; some
   * OpenAI-compatible APIs reject unknown params, so we only send it when known
   * safe — otherwise the stream still works, just without usage/cost numbers.
   */
  supportsStreamUsage: boolean;
}

const PROVIDERS: Record<LlmProvider, ProviderConfig> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    defaultModel: "gpt-4o",
    supportsJsonSchema: true,
    supportsStreamUsage: true,
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-chat",
    supportsJsonSchema: false,
    supportsStreamUsage: true,
  },
  xai: {
    baseUrl: "https://api.x.ai/v1",
    apiKeyEnv: "XAI_API_KEY",
    defaultModel: "grok-4.3",
    supportsJsonSchema: false,
    // Conservatively off: avoids a 400 if this OpenAI-compatible API rejects the
    // param. Flip to true once verified against the live xAI endpoint.
    supportsStreamUsage: true,
  },
  gemini: {
    // Google's OpenAI-compatible surface — same /chat/completions shape.
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKeyEnv: "GEMINI_API_KEY",
    defaultModel: "gemini-3.5-flash",
    supportsJsonSchema: false,
    supportsStreamUsage: true,
  },
  anthropic: {
    // Anthropic has no /chat/completions endpoint — Claude is served by the
    // dedicated SDK branch below, so baseUrl is unused here. This entry exists so
    // isProviderConfigured / configuredProviders / defaults work uniformly.
    baseUrl: "https://api.anthropic.com",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    defaultModel: "claude-sonnet-4-6",
    supportsJsonSchema: false,
    supportsStreamUsage: false,
  },
};

/** The active provider: explicit override wins, else env default, else openai. */
function resolveProviderName(override?: LlmProvider): LlmProvider {
  return override ?? ((process.env.LLM_PROVIDER ?? "openai") as LlmProvider);
}

/**
 * Resolves which provider/model/key to use. An explicit `override` (from the
 * user's model picker) wins; otherwise falls back to the env defaults.
 */
function resolveProvider(override?: {
  provider?: LlmProvider;
  model?: string;
}): { config: ProviderConfig; model: string; apiKey: string } {
  const provider = resolveProviderName(override?.provider);
  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unknown LLM provider "${provider}". Use openai | deepseek | xai | anthropic | gemini.`);
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

/** Token accounting for one completion, normalized across providers. */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Prompt tokens served from the provider's prefix cache (0 if none/unknown). */
  cachedPromptTokens: number;
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
  /** Abort signal — propagated to fetch so a hung/aborted request unblocks. */
  signal?: AbortSignal;
}

interface ChatCompletion {
  choices: Array<{
    message: { content: string | null };
    finish_reason: string | null;
  }>;
  usage?: RawUsage;
}

/** Provider-shaped usage; field names vary, so we normalize via `normalizeUsage`. */
interface RawUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  /** OpenAI cache hit count. */
  prompt_tokens_details?: { cached_tokens?: number };
  /** DeepSeek cache hit count. */
  prompt_cache_hit_tokens?: number;
}

function normalizeUsage(raw: RawUsage | undefined): TokenUsage | undefined {
  if (!raw) return undefined;
  return {
    promptTokens: raw.prompt_tokens ?? 0,
    completionTokens: raw.completion_tokens ?? 0,
    totalTokens: raw.total_tokens ?? 0,
    cachedPromptTokens: raw.prompt_tokens_details?.cached_tokens ?? raw.prompt_cache_hit_tokens ?? 0,
  };
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 600;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Calls the configured provider's chat-completions endpoint with retries. */
export async function invokeLLM(opts: InvokeOptions): Promise<string> {
  if (resolveProviderName(opts.provider) === "anthropic") return invokeAnthropic(opts);

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
        signal: opts.signal,
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

// ─────────────────────────────────────────────────────────────────────────────
// Streaming variant — yields text deltas as the model produces them, plus a
// final usage record (when the provider reports one). Used by the streaming
// analysis route so perspectives can render as they arrive.
// ─────────────────────────────────────────────────────────────────────────────

export interface LlmStreamChunk {
  /** A piece of generated text. */
  delta?: string;
  /** Final token accounting (arrives on the last SSE frame, if supported). */
  usage?: TokenUsage;
}

interface StreamChunkJson {
  choices?: Array<{ delta?: { content?: string | null } }>;
  usage?: RawUsage;
}

/**
 * Streams a chat completion from the configured provider via SSE. Connection
 * setup (DNS/handshake/non-2xx) is retried with backoff; once bytes start
 * flowing we don't retry (can't un-yield partial output). `include_usage` asks
 * OpenAI/DeepSeek to append a usage frame so we can log cost.
 */
export async function* streamLLM(opts: InvokeOptions): AsyncGenerator<LlmStreamChunk> {
  if (resolveProviderName(opts.provider) === "anthropic") {
    yield* streamAnthropic(opts);
    return;
  }

  const { config, model, apiKey } = resolveProvider({ provider: opts.provider, model: opts.model });

  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? 6000,
    temperature: opts.temperature ?? 0.7,
    stream: true,
  };

  // Only request a usage frame where the provider is known to accept the param.
  if (config.supportsStreamUsage) {
    body.stream_options = { include_usage: true };
  }

  if (opts.jsonSchema) {
    body.response_format = config.supportsJsonSchema
      ? {
          type: "json_schema",
          json_schema: { name: opts.jsonSchema.name, strict: true, schema: opts.jsonSchema.schema },
        }
      : { type: "json_object" };
  }

  // ── Establish the connection (retry transient failures before any output) ──
  let res: Response | undefined;
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: opts.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
          await sleep(BASE_DELAY_MS * 2 ** attempt);
          continue;
        }
        throw new Error(`LLM stream failed: ${res.status} ${res.statusText} – ${text}`);
      }
      break;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      throw lastError instanceof Error ? lastError : new Error("LLM stream failed.");
    }
  }

  if (!res?.body) throw new Error("LLM stream returned no body.");

  // ── Parse the SSE frames: lines of `data: {json}` terminated by `data: [DONE]`.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line; process complete lines only.
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const json = JSON.parse(data) as StreamChunkJson;
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield { delta };
          if (json.usage) {
            const usage = normalizeUsage(json.usage);
            if (usage) yield { usage };
          }
        } catch {
          // Ignore keep-alive comments / partial frames; the buffer loop retries.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic (Claude) adapter — uses the official SDK, not /chat/completions.
// Maps to/from the same ChatMessage / LlmStreamChunk / TokenUsage shapes the
// OpenAI-compatible path uses, so analysis/synthesis callers are unchanged.
// JSON output relies on the prompt + repair pass (like deepseek/xai), and
// thinking is disabled so the stream is pure JSON text the parser can read.
// ─────────────────────────────────────────────────────────────────────────────

/** Splits our flat messages into Anthropic's top-level `system` + user/assistant turns. */
function toAnthropicMessages(messages: ChatMessage[]): {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const turns = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  return { system, messages: turns };
}

/**
 * Wraps the (large, static) system prompt as a cache-marked block so Anthropic
 * serves it from its prefix cache on repeat calls — the input portion then bills
 * at ~10% and prefill is faster (lower time-to-first-token). The user message
 * (the scenario) stays uncached after the breakpoint. Returns undefined for an
 * empty system so we don't send an invalid empty text block.
 */
function anthropicSystem(system: string): Anthropic.TextBlockParam[] | undefined {
  if (!system) return undefined;
  return [{ type: "text", text: system, cache_control: { type: "ephemeral" } }];
}

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

function normalizeAnthropicUsage(u: AnthropicUsage | undefined): TokenUsage | undefined {
  if (!u) return undefined;
  // Anthropic reports `input_tokens` as the UNCACHED remainder only; cached and
  // freshly-cached tokens are separate fields. Sum them so `promptTokens` is the
  // full prompt size (matching OpenAI's semantics, where cached ⊆ prompt_tokens),
  // and report the cache-READ portion as `cachedPromptTokens` so cost/savings
  // math in pricing.ts works the same across providers.
  const uncached = u.input_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const cacheCreation = u.cache_creation_input_tokens ?? 0;
  const promptTokens = uncached + cacheRead + cacheCreation;
  const completionTokens = u.output_tokens ?? 0;
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    cachedPromptTokens: cacheRead,
  };
}

async function invokeAnthropic(opts: InvokeOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set for provider "anthropic".');
  const client = new Anthropic({ apiKey });
  const model = opts.model?.trim() || PROVIDERS.anthropic.defaultModel;
  const { system, messages } = toAnthropicMessages(opts.messages);

  const msg = await client.messages.create(
    {
      model,
      max_tokens: opts.maxTokens ?? 6000,
      temperature: opts.temperature ?? 0.7,
      thinking: { type: "disabled" },
      system: anthropicSystem(system),
      messages,
    },
    { signal: opts.signal },
  );

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text) throw new Error("Claude returned an empty response.");
  return text;
}

async function* streamAnthropic(opts: InvokeOptions): AsyncGenerator<LlmStreamChunk> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set for provider "anthropic".');
  const client = new Anthropic({ apiKey });
  const model = opts.model?.trim() || PROVIDERS.anthropic.defaultModel;
  const { system, messages } = toAnthropicMessages(opts.messages);

  const stream = client.messages.stream(
    {
      model,
      max_tokens: opts.maxTokens ?? 6000,
      temperature: opts.temperature ?? 0.7,
      thinking: { type: "disabled" },
      system: anthropicSystem(system),
      messages,
    },
    { signal: opts.signal },
  );

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield { delta: event.delta.text };
    }
  }

  const final = await stream.finalMessage();
  const usage = normalizeAnthropicUsage(final.usage);
  if (usage) yield { usage };
}
