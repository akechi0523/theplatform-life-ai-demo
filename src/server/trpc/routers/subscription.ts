import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createCheckoutSession } from "@/server/services/stripe";
import { getProfile } from "@/server/services/profile";
import { protectedProcedure, router } from "../trpc";

export const subscriptionRouter = router({
  /**
   * Creates a Stripe Checkout Session and returns its URL.
   * The client redirects the browser to this URL; the webhook grants premium
   * once payment completes.
   */
  createCheckout: protectedProcedure
    .input(z.object({ plan: z.enum(["monthly", "annual"]) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await getProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found." });

      if (profile.subscriptionStatus === "premium") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You're already on Premium." });
      }

      try {
        const url = await createCheckoutSession({
          userId: ctx.user.id,
          email: profile.email,
          plan: input.plan,
          stripeCustomerId: profile.stripeCustomerId,
        });
        return { url };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Could not start checkout.",
        });
      }
    }),
});
