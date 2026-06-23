import { NextResponse } from "next/server";
import { analyzeInputSchema } from "@/features/perspectives/data/schema";
import { MODEL_OPTIONS, resolveModelForTier } from "@/features/perspectives/data/models";
import { analyzeScenarioStream } from "@/server/services/analysis";
import { configuredProviders, isProviderConfigured } from "@/server/services/llm";
import { estimateCost } from "@/server/services/pricing";
import { consumeToken, getProfile, recordAnalysis, refundToken } from "@/server/services/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Needs Node (Postgres + Supabase server client). Streams NDJSON to the client.
export const runtime = "nodejs";

/** One NDJSON line per event: perspective | done | error. */
type StreamEvent =
  | { event: "perspective"; data: unknown; complete: boolean }
  | { event: "done"; result: unknown; metrics: unknown }
  | { event: "error"; code: "ANALYSIS_FAILED"; message: string };

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "Sign in to run an analysis." }, { status: 401 });
  }

  // ── Validate input ──────────────────────────────────────────────────────────
  const parsed = analyzeInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { code: "BAD_INPUT", message: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { scenario, modelId } = parsed.data;

  // ── Tier policy: free users are clamped to a fast/low-cost model; premium
  // unlocks the strongest one. Enforced here so the client can't bypass it. ────
  const profile = await getProfile(user.id);
  const isPremium = profile?.subscriptionStatus === "premium";
  let effective = resolveModelForTier(modelId, isPremium);
  // Graceful fallback: if the chosen model's provider has no key, pick any
  // configured model (preferring one allowed for this tier) instead of throwing.
  if (!isProviderConfigured(effective.provider)) {
    const configured = configuredProviders();
    const alt =
      MODEL_OPTIONS.find((m) => configured.includes(m.provider) && (isPremium || m.tier === "free")) ??
      MODEL_OPTIONS.find((m) => configured.includes(m.provider));
    if (alt) effective = alt;
  }
  const { provider, model } = effective;

  // ── Token gate (atomic consume; refunded below if the analysis fails) ────────
  const consumed = await consumeToken(user.id);
  if (!consumed.success) {
    // The client keys the upgrade modal off this exact code.
    return NextResponse.json(
      { code: consumed.reason === "no_tokens" ? "NO_TOKENS" : "FORBIDDEN", message: "Unable to start analysis." },
      { status: 403 },
    );
  }
  const encoder = new TextEncoder();
  const startedAt = Date.now();
  let firstAt = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const write = (e: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      let succeeded = false;

      try {
        for await (const ev of analyzeScenarioStream(scenario, effective.id, req.signal)) {
          if (ev.kind === "perspective") {
            // First face = the user's first visible content; that's the metric.
            if (!firstAt) firstAt = Date.now();
            write({ event: "perspective", data: ev.data, complete: ev.complete });
            continue;
          }

          // ── done: persist history, assemble metrics, log, emit ──────────────
          succeeded = true;
          await recordAnalysis(user.id, scenario);

          const finishedAt = Date.now();
          const cost = ev.usage ? estimateCost(model, ev.usage) : null;
          const metrics = {
            provider,
            model,
            timeToFirstMs: firstAt ? firstAt - startedAt : null,
            totalMs: finishedAt - startedAt,
            usage: ev.usage ?? null,
            estCostUsd: cost?.usd ?? null,
            cacheSavingsUsd: cost?.cacheSavingsUsd ?? null,
          };

          // Server-side measurement log (the "we measure every run" story).
          console.info("[analysis]", JSON.stringify(metrics));
          write({ event: "done", result: ev.result, metrics });
        }
      } catch (err) {
        // Refund only if the user got nothing usable, so a glitch never eats their credit.
        if (!succeeded) await refundToken(user.id);
        const message =
          err instanceof Error && err.name === "AbortError"
            ? "Analysis cancelled."
            : "The analysis engine had a problem. Your credit was not used — please try again.";
        write({ event: "error", code: "ANALYSIS_FAILED", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
