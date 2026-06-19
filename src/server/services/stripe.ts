import Stripe from "stripe";

let stripeClient: Stripe | undefined;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
    stripeClient = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeClient;
}

export type Plan = "monthly" | "annual";

export function priceIdForPlan(plan: Plan): string {
  const id = plan === "monthly" ? process.env.STRIPE_PRICE_MONTHLY : process.env.STRIPE_PRICE_ANNUAL;
  if (!id) {
    throw new Error(`Missing Stripe price ID for "${plan}" plan (set STRIPE_PRICE_* in env).`);
  }
  return id;
}

/**
 * Creates a Checkout Session for the given user/plan.
 * The user's UUID is stored in client_reference_id + metadata so the webhook
 * can map the completed payment back to the profile.
 */
export async function createCheckoutSession(params: {
  userId: string;
  email: string | null;
  plan: Plan;
  stripeCustomerId: string | null;
}): Promise<string> {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceIdForPlan(params.plan), quantity: 1 }],
    client_reference_id: params.userId,
    customer: params.stripeCustomerId ?? undefined,
    customer_email: params.stripeCustomerId ? undefined : params.email ?? undefined,
    metadata: { userId: params.userId, plan: params.plan },
    subscription_data: { metadata: { userId: params.userId } },
    success_url: `${appUrl}/?upgrade=success`,
    cancel_url: `${appUrl}/?upgrade=cancelled`,
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}
