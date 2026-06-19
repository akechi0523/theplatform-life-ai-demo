import { TRPCError } from "@trpc/server";
import { analyzeInputSchema, analysisResultSchema } from "@/features/perspectives/data/schema";
import { analyzeScenario } from "@/server/services/analysis";
import { configuredProviders } from "@/server/services/llm";
import { consumeToken, recordAnalysis } from "@/server/services/profile";
import { protectedProcedure, router } from "../trpc";

export const analysisRouter = router({
  /** Providers that have an API key configured — used to filter the model picker. */
  availableProviders: protectedProcedure.query(() => configuredProviders()),

  analyze: protectedProcedure
    .input(analyzeInputSchema)
    .output(analysisResultSchema)
    .mutation(async ({ ctx, input }) => {
      // ── Token gate ──────────────────────────────────────────────────────────
      const consumed = await consumeToken(ctx.user.id);
      if (!consumed.success) {
        throw new TRPCError({
          code: "FORBIDDEN",
          // The client keys the upgrade modal off this exact message.
          message: consumed.reason === "no_tokens" ? "NO_TOKENS" : "Unable to start analysis.",
        });
      }

      try {
        const result = await analyzeScenario(input.scenario, input.modelId);
        await recordAnalysis(ctx.user.id, input.scenario);
        return result;
      } catch (err) {
        // The token was already spent; surface a clean error.
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Analysis failed. Please try again.",
        });
      }
    }),
});
