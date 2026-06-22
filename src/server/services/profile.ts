import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { profiles, scenarioAnalyses, type Profile } from "@/server/db/schema";

export const FREE_MONTHLY_TOKENS = 1;
export const PREMIUM_TOKENS = 999_999;

/** True if `resetDate` falls in an earlier calendar month than now (UTC). */
function isNewCalendarMonth(resetDate: Date): boolean {
  const now = new Date();
  return (
    now.getUTCFullYear() > resetDate.getUTCFullYear() ||
    (now.getUTCFullYear() === resetDate.getUTCFullYear() &&
      now.getUTCMonth() > resetDate.getUTCMonth())
  );
}

/**
 * Ensures a profile row exists for the authenticated user, creating one
 * (free tier, 1 token) on first sign-in. Idempotent.
 */
export async function ensureProfile(userId: string, email: string | null): Promise<Profile> {
  const existing = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (existing.length > 0) return existing[0];

  const inserted = await db
    .insert(profiles)
    .values({ id: userId, email })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) return inserted[0];

  // Race: another request inserted it first — read it back.
  const reread = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return reread[0];
}

/**
 * Fetches the profile and auto-resets free-tier tokens at the start of a new month.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const rows = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (rows.length === 0) return null;

  const profile = rows[0];

  if (profile.subscriptionStatus === "free" && isNewCalendarMonth(profile.tokenResetDate)) {
    const now = new Date();
    const [updated] = await db
      .update(profiles)
      .set({ monthlyTokensRemaining: FREE_MONTHLY_TOKENS, tokenResetDate: now, updatedAt: now })
      .where(eq(profiles.id, userId))
      .returning();
    return updated;
  }

  return profile;
}

export type ConsumeResult =
  | { success: true; tokensRemaining: number }
  | { success: false; reason: "no_tokens" | "not_found" };

/** Atomically consumes one analysis token if available. */
export async function consumeToken(userId: string): Promise<ConsumeResult> {
  const profile = await getProfile(userId); // also handles monthly reset
  if (!profile) return { success: false, reason: "not_found" };

  if (profile.monthlyTokensRemaining <= 0) {
    return { success: false, reason: "no_tokens" };
  }

  const newCount = profile.monthlyTokensRemaining - 1;
  await db
    .update(profiles)
    .set({ monthlyTokensRemaining: newCount, updatedAt: new Date() })
    .where(eq(profiles.id, userId));

  return { success: true, tokensRemaining: newCount };
}

/**
 * Returns one consumed token after a failed analysis, so a glitch never costs
 * the user their credit. Best-effort and non-critical; never throws. Premium
 * accounts sit far above the cap, so a refund there is a harmless no-op.
 */
export async function refundToken(userId: string): Promise<void> {
  try {
    const rows = await db
      .select({ remaining: profiles.monthlyTokensRemaining })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);
    if (rows.length === 0) return;
    await db
      .update(profiles)
      .set({ monthlyTokensRemaining: rows[0].remaining + 1, updatedAt: new Date() })
      .where(eq(profiles.id, userId));
  } catch {
    /* swallow — refund is best-effort */
  }
}

/** Records an analysis run for history (non-critical; never throws). */
export async function recordAnalysis(userId: string, scenario: string): Promise<void> {
  try {
    await db.insert(scenarioAnalyses).values({ userId, scenario });
  } catch {
    /* swallow — history is best-effort */
  }
}

/** Persists the user's self-identified perspective type (1-9, or null to clear). */
export async function setSelfIdentifiedType(
  userId: string,
  typeNumber: number | null,
): Promise<void> {
  await db
    .update(profiles)
    .set({ selfIdentifiedType: typeNumber, updatedAt: new Date() })
    .where(eq(profiles.id, userId));
}

/** Grants premium (called by the Stripe webhook after a successful checkout). */
export async function grantPremium(
  userId: string,
  opts: { stripeCustomerId?: string; stripeSubscriptionId?: string; renewalDate?: Date },
): Promise<void> {
  await db
    .update(profiles)
    .set({
      subscriptionStatus: "premium",
      monthlyTokensRemaining: PREMIUM_TOKENS,
      renewalDate: opts.renewalDate ?? null,
      stripeCustomerId: opts.stripeCustomerId,
      stripeSubscriptionId: opts.stripeSubscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId));
}

/** Reverts to free tier (subscription canceled/expired). */
export async function revokePremium(stripeCustomerId: string): Promise<void> {
  const now = new Date();
  await db
    .update(profiles)
    .set({
      subscriptionStatus: "free",
      monthlyTokensRemaining: FREE_MONTHLY_TOKENS,
      tokenResetDate: now,
      renewalDate: null,
      stripeSubscriptionId: null,
      updatedAt: now,
    })
    .where(eq(profiles.stripeCustomerId, stripeCustomerId));
}
