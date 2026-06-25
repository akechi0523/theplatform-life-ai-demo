// ─────────────────────────────────────────────────────────────────────────────
// Selectable analysis models.
//
// This is the single source of truth shared by the UI (the model picker), the
// input schema (allowlist validation), and the server (which provider/model to
// call). It contains NO secrets — API keys are resolved server-side in
// `src/server/services/llm.ts` from the provider's `apiKeyEnv`.
//
// Every model is selectable by every user — there is no per-model tier lock.
// (Cost is still bounded by the per-run token gate; the synthesis feature has
// its own premium gate. Neither is about model choice.)
// ─────────────────────────────────────────────────────────────────────────────

export type LlmProvider = "openai" | "deepseek" | "xai" | "anthropic" | "gemini";

export interface ModelOption {
  /** Stable id used by the picker + schema (NOT necessarily the API model id). */
  id: string;
  /** Short label shown in the dropdown. */
  label: string;
  /** One-line helper text shown under/next to the label. */
  description: string;
  provider: LlmProvider;
  /** Exact model id sent to the provider's API. */
  model: string;
}

// The five models under comparison. Grok 4.3 stays as the current default; the
// other four are the models agreed with the client for the comparison.
export const MODEL_OPTIONS = [
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    description: "Anthropic · most nuanced & emotionally honest",
    provider: "anthropic",
    model: "claude-sonnet-4-6",
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    description: "OpenAI · accurate, slightly clinical tone",
    provider: "openai",
    model: "gpt-4.1",
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    description: "Google · fast, good value",
    provider: "gemini",
    model: "gemini-3.5-flash",
  },
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    description: "DeepSeek · capable & ultra-cheap",
    provider: "deepseek",
    model: "deepseek-chat",
  },
  {
    id: "grok-4.3",
    label: "Grok 4.3",
    description: "xAI · fast & creative (current default)",
    provider: "xai",
    model: "grok-4.3",
  },
] as const satisfies readonly ModelOption[];

export type ModelId = (typeof MODEL_OPTIONS)[number]["id"];

/** Non-empty tuple of ids for `z.enum(...)`. */
export const MODEL_IDS = MODEL_OPTIONS.map((m) => m.id) as [ModelId, ...ModelId[]];

// Current default — what we run today unless the user picks another model.
export const DEFAULT_MODEL_ID: ModelId = "grok-4.3";

/** Resolves a picker id to its option, falling back to the default for unknown/empty ids. */
export function getModelOption(id: string | undefined | null): ModelOption {
  return (
    MODEL_OPTIONS.find((m) => m.id === id) ??
    MODEL_OPTIONS.find((m) => m.id === DEFAULT_MODEL_ID)!
  );
}
