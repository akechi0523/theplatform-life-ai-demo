import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getProfile, setSelfIdentifiedType } from "@/server/services/profile";
import { protectedProcedure, router } from "../trpc";

export const userRouter = router({
  /** Current user's profile (subscription status, tokens, self-identified type). */
  profile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getProfile(ctx.user.id);
    if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found." });
    return {
      email: profile.email,
      subscriptionStatus: profile.subscriptionStatus,
      monthlyTokensRemaining: profile.monthlyTokensRemaining,
      renewalDate: profile.renewalDate,
      selfIdentifiedType: profile.selfIdentifiedType,
    };
  }),

  /** Pin / unpin the user's self-identified perspective type (the "My Type" highlight). */
  setSelfIdentifiedType: protectedProcedure
    .input(z.object({ typeNumber: z.number().int().min(1).max(9).nullable() }))
    .mutation(async ({ ctx, input }) => {
      await setSelfIdentifiedType(ctx.user.id, input.typeNumber);
      return { success: true };
    }),
});
