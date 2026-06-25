import { MODEL_OPTIONS, getModelOption, type ModelOption } from "@/features/perspectives/data/models";
import { configuredProviders, isProviderConfigured } from "./llm";

/**
 * Resolves the model that should actually run for a requested picker id. Every
 * model is selectable by every user (no tier lock), so we honor the request and
 * only override when the requested model's provider has no API key configured —
 * in which case we fall back to any configured model rather than throwing.
 * Server-side source of truth shared by the analyze and synthesis routes.
 */
export function resolveEffectiveModel(modelId: string | undefined): ModelOption {
  const requested = getModelOption(modelId);
  if (isProviderConfigured(requested.provider)) return requested;

  const configured = configuredProviders();
  return MODEL_OPTIONS.find((m) => configured.includes(m.provider)) ?? requested;
}
