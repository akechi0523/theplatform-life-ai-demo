import {
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle schema (Supabase Postgres).
//
// `profiles.id` mirrors Supabase `auth.users.id` (the authenticated user's UUID).
// We don't declare a cross-schema FK in Drizzle; a trigger/SQL FK to auth.users
// is added in the migration notes (see README → Database).
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionStatusEnum = pgEnum("subscription_status", ["free", "premium"]);

export const profiles = pgTable("profiles", {
  /** Equals auth.users.id */
  id: uuid("id").primaryKey(),
  email: text("email"),

  // ── Subscription ──────────────────────────────────────────────────────────
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("free"),
  /** Free: 1 per month (resets on the 1st). Premium: 999999 (effectively unlimited). */
  monthlyTokensRemaining: integer("monthly_tokens_remaining").notNull().default(1),
  /** When tokens were last reset; used to detect a new calendar month. */
  tokenResetDate: timestamp("token_reset_date", { withTimezone: true }).notNull().defaultNow(),
  /** Next billing renewal date (informational; set on upgrade). */
  renewalDate: timestamp("renewal_date", { withTimezone: true }),

  // ── Stripe ──────────────────────────────────────────────────────────────────
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),

  // ── Self-identified perspective (the "My Type" highlight) ────────────────────
  selfIdentifiedType: smallint("self_identified_type"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

/** History of scenario analyses run by each user. */
export const scenarioAnalyses = pgTable("scenario_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  scenario: text("scenario").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ScenarioAnalysis = typeof scenarioAnalyses.$inferSelect;
