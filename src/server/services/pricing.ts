import type { TokenUsage } from "./llm";

// ─────────────────────────────────────────────────────────────────────────────
// Approximate per-model prices for *demo cost estimates only*.
//
// Token COUNTS reported by the app are exact (straight from the provider's usage
// frame). The dollar figure is an estimate derived from this editable table —
// update these to your account's actual list prices. Values are USD per 1M
// tokens. Cached input tokens are billed at a fraction of the input rate by
// providers that support prefix caching, approximated here by `cachedFactor`.
// ─────────────────────────────────────────────────────────────────────────────

interface ModelPrice {
  /** USD per 1M input (prompt) tokens. */
  input: number;
  /** USD per 1M output (completion) tokens. */
  output: number;
  /** Fraction of the input price charged for cache-hit prompt tokens. */
  cachedFactor: number;
}

// Keyed by the exact API model id sent to the provider (see data/models.ts).
// Rates are USD per 1M tokens, verified June 2026 — confirm against your own
// account's billing page before quoting a client.
const PRICES: Record<string, ModelPrice> = {
  "claude-sonnet-4-6": { input: 3, output: 15, cachedFactor: 0.1 },
  "gpt-4.1": { input: 2, output: 8, cachedFactor: 0.25 },
  "gemini-3.5-flash": { input: 1.5, output: 9, cachedFactor: 0.25 },
  "deepseek-chat": { input: 0.14, output: 0.28, cachedFactor: 0.1 },
  "grok-4.3": { input: 1.25, output: 2.5, cachedFactor: 0.25 },
};

export interface CostEstimate {
  usd: number;
  /** USD that prompt caching saved on this call (0 if no cache hits / unknown). */
  cacheSavingsUsd: number;
}

/** Estimates the USD cost of one completion from exact token counts. Null if the model is unpriced. */
export function estimateCost(model: string, usage: TokenUsage): CostEstimate | null {
  const price = PRICES[model];
  if (!price) return null;

  const cached = Math.min(usage.cachedPromptTokens, usage.promptTokens);
  const fullInput = usage.promptTokens - cached;

  const inputCost = (fullInput * price.input + cached * price.input * price.cachedFactor) / 1_000_000;
  const outputCost = (usage.completionTokens * price.output) / 1_000_000;
  // What those cached tokens would have cost at full input price, minus what they did cost.
  const cacheSavingsUsd = (cached * price.input * (1 - price.cachedFactor)) / 1_000_000;

  return { usd: inputCost + outputCost, cacheSavingsUsd };
}
