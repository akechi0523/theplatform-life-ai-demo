# ThePlatform.life AI

A multi-perspective consulting demo. Describe a real-life scenario or decision and the
**360° of Perspectives** engine reveals how each of the 9 perspective types would *perceive,
feel, and respond* — including their **stress** and **security** responses.

> Clean, modular rebuild of the original Manus-generated prototype. Built as a reference demo
> for Dr. Rice.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) + React 19 |
| API | tRPC v11 (+ superjson) |
| Styling | Tailwind CSS v4 |
| Icons | `iconsax-reactjs` |
| Database | Supabase Postgres + Drizzle ORM |
| Auth | Supabase Auth (email + password) |
| Billing | Stripe Checkout (subscriptions, test mode) |
| Hosting | Vercel |
| LLM | OpenAI-compatible adapter (OpenAI · DeepSeek · xAI, switchable via env) |

## Architecture

```
src/
  app/                         # routes only (thin)
    page.tsx                   # → HomeClient (input → loading → results)
    login/page.tsx             # email + password auth
    api/trpc/[trpc]/route.ts   # tRPC fetch handler
    api/stripe/webhook/route.ts# grants/revokes premium
    layout.tsx · providers.tsx · globals.css
  middleware.ts                # session refresh + route guard
  server/
    trpc/                      # trpc, context, root, routers/{analysis,subscription,user}
    services/                  # llm, analysis, profile (tokens), stripe
    db/                        # schema.ts (drizzle) · index.ts (client)
  features/
    perspectives/
      data/                    # types (9 types, triads, paths) · schema (zod) · mockData
      prompt.ts                # LLM prompt builder (no "Enneagram" wording)
      components/              # Grid · Card · DetailPanel · ScenarioInput · LoadingState · ResultsView · MyTypeSelector
    subscription/              # DashboardHeader · UpgradeModal · ResourcesSection · SubscriptionBadge
  lib/
    supabase/                  # server · client · admin
    trpc/client.ts · pdf.ts · share.ts · utils.ts
```

**Single source of truth:** all type names, triads (Heart=yellow / Head=green / Gut=red), and
the corrected stress/security shift paths live in `src/features/perspectives/data/types.ts`.
The mock data, LLM prompt, UI, and PDF all derive from it.

## Product rules baked in

- The word **"Enneagram" appears nowhere** — this is the *360° of Perspectives*.
- States are **"aware" / "unaware"** (never healthy/unhealthy); movement is a **"shift"**.
- Triad columns: **Heart (2,3,4) · Head (5,6,7) · Gut (8,9,1)**.
- **Free tier:** 1 analysis / month (resets on the 1st). **Premium:** unlimited ($9/mo · $99/yr).
- Token gate runs **before** analysis; running out opens the upgrade modal.
- **PDF** exports 3 perspectives per page in triad order.
- **Share links** (`?scenario=…`) auto-run the analysis on arrival.
- **My Type** highlight: self-identified type gets a glowing ring and auto-opens on new results.

---

## Local setup

### 1. Install
```bash
npm install
```

### 2. Environment
Copy `.env.example` → `.env.local` and fill in. The committed `.env.local` already has the
Supabase + Stripe publishable + LLM keys; you still need to add:

- `DATABASE_URL` — Supabase → Settings → Database → Connection string (URI). Use the pooled
  port (6543) for serverless.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API.
- `STRIPE_SECRET_KEY` — Stripe → Developers → API keys (test).
- `STRIPE_WEBHOOK_SECRET` — from `npm run stripe:listen` (see below).
- `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` — create two recurring prices ($9/mo, $99/yr).

> ⚠️ The OpenAI / DeepSeek / xAI keys shipped in `.env.local` were shared in plaintext — **rotate
> them** in each provider dashboard before any real use.

### 3. Database
```bash
npm run db:generate   # generate the migration from schema.ts
npm run db:migrate    # apply it to Supabase Postgres
```
Then run `drizzle/0000_auth_and_rls.sql` in the Supabase SQL editor to add the `auth.users`
foreign keys and Row Level Security policies.

In Supabase → Authentication → Providers, enable **Email**. For the smoothest demo, disable
"Confirm email" so sign-up creates a session immediately.

### 4. Stripe webhook (local)
```bash
npm run stripe:listen
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET, then restart `npm run dev`
```

### 5. Run
```bash
npm run dev    # http://localhost:3000
```

Use Stripe test card `4242 4242 4242 4242`, any future expiry/CVC, to complete an upgrade.

---

## Deploy (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add every variable from `.env.example` in **Project → Settings → Environment Variables**
   (set `NEXT_PUBLIC_APP_URL` to your Vercel URL).
3. In Stripe → Developers → Webhooks, add an endpoint:
   `https://<your-app>.vercel.app/api/stripe/webhook` for the events
   `checkout.session.completed` and `customer.subscription.deleted`. Copy its signing secret
   into `STRIPE_WEBHOOK_SECRET`.
4. In Supabase → Authentication → URL Configuration, add your Vercel URL to the redirect allow-list.
5. Deploy. `vercel.json` sets longer function timeouts for the LLM and webhook routes.

## Switching LLM provider
Set in `.env.local`:
```
LLM_PROVIDER=openai      # or deepseek | xai
LLM_MODEL=gpt-4o         # provider-appropriate model id
```
The sample "buying a house" scenario returns curated mock data instantly (no API call); any
other scenario calls the configured provider with strict JSON-schema structured output.

## Scripts
| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle |
| `npm run stripe:listen` | Forward Stripe webhooks locally |
