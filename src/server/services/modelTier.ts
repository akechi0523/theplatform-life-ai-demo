import { MODEL_OPTIONS, resolveModelForTier, type ModelOption } from "@/features/perspectives/data/models";
import { configuredProviders, isProviderConfigured } from "./llm";

/**
 * Resolves the model that should actually run for a (requested id, tier) pair,
 * with a graceful fallback: if the tier-appropriate model's provider has no API
 * key configured, pick any configured model (preferring one allowed for this
 * tier) instead of throwing. Server-side source of truth shared by both the
 * Flow 1 (analyze) and Flow 2 (synthesis) routes.
 */
export function resolveEffectiveModel(
  modelId: string | undefined,
  isPremium: boolean,
): ModelOption {
  let effective = resolveModelForTier(modelId, isPremium);
  if (!isProviderConfigured(effective.provider)) {
    const configured = configuredProviders();
    const alt =
      MODEL_OPTIONS.find((m) => configured.includes(m.provider) && (isPremium || m.tier === "free")) ??
      MODEL_OPTIONS.find((m) => configured.includes(m.provider));
    if (alt) effective = alt;
  }
  return effective;
}
