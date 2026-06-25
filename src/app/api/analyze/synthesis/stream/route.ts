import { NextResponse } from "next/server";
import { synthesizeInputSchema } from "@/features/perspectives/data/schema";
import { synthesizePairStream } from "@/server/services/synthesis";
import { resolveEffectiveModel } from "@/server/services/modelTier";
import { estimateCost } from "@/server/services/pricing";
import { consumeToken, getProfile, recordAnalysis, refundToken } from "@/server/services/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Needs Node (Postgres + Supabase server client). Streams NDJSON to the client.
export const runtime = "nodejs";

/** One NDJSON line per event: section (token-level delta) | done | error. */
type StreamEvent =
  | { event: "section"; field: string; delta: string }
  | { event: "done"; result: unknown; metrics: unknown }
  | { event: "error"; code: "SYNTHESIS_FAILED"; message: string };

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "Sign in to run a synthesis." }, { status: 401 });
  }

  // ── Validate input ──────────────────────────────────────────────────────────
  const parsed = synthesizeInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { code: "BAD_INPUT", message: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { scenario, types, modelId } = parsed.data;
  // Normalize the pair low→high so lookup/echo are stable.
  const [lo, hi] = types[0] <= types[1] ? [types[0], types[1]] : [types[1], types[0]];

  // ── Premium gate: Flow 2 is a paid-tier feature. Reject non-premium BEFORE
  // consuming a token so free users never reach the LLM. The client keys its
  // upgrade modal off this exact code. ────────────────────────────────────────
  const profile = await getProfile(user.id);
  const isPremium = profile?.subscriptionStatus === "premium";
  if (!isPremium) {
    return NextResponse.json(
      { code: "PREMIUM_REQUIRED", message: "Comparing two types is a premium feature. Upgrade to unlock it." },
      { status: 403 },
    );
  }

  const effective = resolveEffectiveModel(modelId);
  const { provider, model } = effective;

  // ── Token gate (atomic consume; refunded below if the synthesis fails) ───────
  const consumed = await consumeToken(user.id);
  if (!consumed.success) {
    return NextResponse.json(
      { code: consumed.reason === "no_tokens" ? "NO_TOKENS" : "FORBIDDEN", message: "Unable to start synthesis." },
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
        for await (const ev of synthesizePairStream(scenario, lo, hi, effective.id, req.signal)) {
          if (ev.kind === "section") {
            if (!firstAt) firstAt = Date.now();
            write({ event: "section", field: ev.field, delta: ev.delta });
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

          console.info("[synthesis]", JSON.stringify(metrics));
          write({ event: "done", result: ev.result, metrics });
        }
      } catch (err) {
        // Refund only if the user got nothing usable, so a glitch never eats their credit.
        if (!succeeded) await refundToken(user.id);
        const message =
          err instanceof Error && err.name === "AbortError"
            ? "Synthesis cancelled."
            : "The synthesis engine had a problem. Your credit was not used — please try again.";
        write({ event: "error", code: "SYNTHESIS_FAILED", message });
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
