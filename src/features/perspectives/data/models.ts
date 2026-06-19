// ─────────────────────────────────────────────────────────────────────────────
// Selectable analysis models.
//
// This is the single source of truth shared by the UI (the model picker), the
// input schema (allowlist validation), and the server (which provider/model to
// call). It contains NO secrets — API keys are resolved server-side in
// `src/server/services/llm.ts` from the provider's `apiKeyEnv`.
// ─────────────────────────────────────────────────────────────────────────────

export type LlmProvider = "openai" | "deepseek" | "xai";

export interface ModelOption {
  /** Stable id used by the picker + schema (NOT necessarily the API model id). */
  id: string;
  /** Short label shown in the dropdown. */
  label: string;
  /** One-line helper text shown under/next to the label. */
  description: string;
  provider: LlmProvider;
  /** Exact model id sent to the provider's /chat/completions endpoint. */
  model: string;
}

export const MODEL_OPTIONS = [
  {
    id: "gpt-4o",
    label: "GPT-4o",
    description: "OpenAI · balanced & reliable",
    provider: "openai",
    model: "gpt-4o",
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    description: "OpenAI · fastest, lightweight",
    provider: "openai",
    model: "gpt-4o-mini",
  },
  {
    id: "deepseek-chat",
    label: "DeepSeek V3",
    description: "DeepSeek · strong reasoning, low cost",
    provider: "deepseek",
    model: "deepseek-chat",
  },
  {
    id: "grok-4.3",
    label: "Grok 4.3",
    description: "xAI · fast & creative",
    provider: "xai",
    model: "grok-4.3",
  },
  {
    id: "grok-4-reasoning",
    label: "Grok 4.20 (reasoning)",
    description: "xAI · deeper, slower reasoning",
    provider: "xai",
    model: "grok-4.20-0309-reasoning",
  },
] as const satisfies readonly ModelOption[];

export type ModelId = (typeof MODEL_OPTIONS)[number]["id"];

/** Non-empty tuple of ids for `z.enum(...)`. */
export const MODEL_IDS = MODEL_OPTIONS.map((m) => m.id) as [ModelId, ...ModelId[]];

// NOTE: defaulted to a Grok model because (as of setup) only the xAI key is valid.
// Switch back to "gpt-4o" once a valid OPENAI_API_KEY is in place.
export const DEFAULT_MODEL_ID: ModelId = "grok-4.3";

/** Resolves a picker id to its option, falling back to the default for unknown/empty ids. */
export function getModelOption(id: string | undefined | null): ModelOption {
  return (
    MODEL_OPTIONS.find((m) => m.id === id) ??
    MODEL_OPTIONS.find((m) => m.id === DEFAULT_MODEL_ID)!
  );
}
