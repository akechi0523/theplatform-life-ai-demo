# Client Call Prep — ThePlatform.life AI × respectforpeople.com

**Date:** 2026-06-19
**Goal of call:** Agree on how to ship the AI tool into respectforpeople.com (a static Squarespace site), and confirm scope + budget for the MVP.

---

## 1. The one thing to land first

The AI tool is **not a static site** — it's a full dynamic web app:

- Next.js 15 server (SSR + streaming)
- Server-side LLM calls with **secret API keys** (can never live in Squarespace)
- Postgres database (user profiles, scenario history)
- Supabase authentication (login, sessions)
- Stripe subscriptions + webhooks (free/premium tiers)

**Squarespace cannot host any of this.** It's a closed CMS that serves static pages with limited code injection. So the real question is *not* "build inside Squarespace vs rebuild" — it's **"how do we connect a separately-hosted app to the Squarespace site."**

> Plain-English version for the client: *"Your website stays exactly as it is. The tool runs as its own app under your domain, and we link them together so it feels like one brand."*

---

## 2. Recommendation: keep Squarespace, host the app on a subdomain

**Do NOT rebuild respectforpeople.com.** Rebuilding their marketing site in code is weeks of work, removes their ability to self-edit content, and adds zero MVP value. The app already exists.

| Option | What it is | Effort | Verdict |
|---|---|---|---|
| **A. Subdomain (recommended)** | Deploy app to `app.respectforpeople.com` (Vercel). Squarespace stays as-is; add a "Launch the tool" button. | **Low** | ✅ The MVP. Clean auth, payments, SEO. Fastest to ship. |
| **B. Embed via iframe** | Same deploy, embedded in a Squarespace page. | Low–Med | ⚠️ Only if they insist it lives "inside" the page. Caveats below. |
| **C. Full rebuild off Squarespace** | Recreate the whole site in Next.js. | **High** | ❌ Not an MVP. Only if they're leaving Squarespace anyway. |

**Iframe (B) caveats to raise if they push for it:** third-party-cookie login breakage on Safari/iOS, awkward mobile height/scroll, app content not SEO-indexed under their domain, and **Stripe Checkout cannot run inside an iframe** (must pop out). Option A avoids all of it.

---

## 3. Questions to ask the client

1. **Does the tool need to look visually identical to respectforpeople.com?** (If yes → we theme the app's CSS to match. Still Option A.)
2. **What's their Squarespace plan?** (Business or higher is needed for any code/embed.)
3. **Who owns the domain DNS?** (We need to add the `app.` subdomain record.)
4. **Do they have / want their own accounts** for OpenAI / Anthropic / Stripe, or do we manage keys? (Affects who pays the LLM bill.)
5. **What's the launch timeline and budget envelope?**
6. **Free vs paid model** — confirm the 1-free-analysis/month + premium pricing is what they want.

---

## 4. Technical health — what I found in the code (be ready to discuss)

Frame this as *"the core works; here's what we harden before real users touch it."* Don't alarm them — position it as standard pre-launch hardening.

### 🔒 Security
- **Token quota race condition** — free users can bypass the limit with parallel requests (`consumeToken` is read-then-write, not atomic).
- **Shared `?scenario=` links auto-spend a token on page load** — a link can silently drain someone's monthly credit.
- **Raw internal errors leak to the browser** — should be logged server-side, generic message to user.
- **No Row-Level Security** on the database tables (defense-in-depth).
- **Free tier is farmable** — 1 free LLM call per account, unlimited accounts. Needs email verification / bot check.
- **No rate limiting** beyond the monthly quota — a premium/compromised account can run up unbounded LLM cost.

### ⚠️ Risk / Reliability
- **A failed analysis still burns the user's token** (no refund) — top trust risk for a 1-token free tier.
- **No timeout on the LLM call** — a hung provider stalls the request.
- **Single LLM provider = single point of failure** (currently defaults to one provider with no fallback).
- **Stripe webhook handles too few events** — a *failed renewal* never downgrades the user (they keep premium for free); no idempotency guard against Stripe's retries.

### 🎨 UX
- **15–40s spinner** with no feedback during analysis → stream results progressively (biggest perceived-quality win for the demo).
- **History is stored but never shown** → easy, high-value "your past analyses" feature.
- **Lost-token + cryptic error** combine into a "the product ate my one try" experience.

---

## 5. Proposed scope (phased)

**Phase 1 — Integration MVP** *(ship the tool live under their domain)*
- Production deploy to Vercel + `app.respectforpeople.com` DNS
- Production Supabase + Stripe live keys + env config
- Theme app to match respectforpeople.com branding
- "Launch the tool" CTA wired into Squarespace

**Phase 2 — Security & reliability hardening** *(before real users / payments)*
- Atomic token consumption + refund-on-failure
- Fix auto-run token drain
- Server-side error handling, RLS policies
- Stripe webhook: idempotency + payment-failure/downgrade events
- LLM timeout + provider fallback
- Rate limiting + signup abuse protection

**Phase 3 — UX enhancements** *(optional, post-MVP)*
- Streaming analysis results
- "Past analyses" history view
- Input/error-copy polish

---

## 6. Quote (market-researched, June 2026)

> This is **integration + hardening of an existing app**, not a from-scratch SaaS build. A full AI-SaaS MVP from zero runs **$35k–$70k** at agencies — that's *not* what this is, and saying so positions the price as a bargain.

**Market rates (2026, US):** senior freelance full-stack/Next.js devs bill **$67–$95/hr**; agencies blend **$100–$150/hr**; offshore/mid-level **$35–$55/hr**.

### Effort estimate

| Phase | Scope | Est. hours |
|---|---|---|
| 1 | Integration MVP (deploy, domain, theming, CTA) | 12–20 |
| 2 | Security & reliability hardening | 20–30 |
| 3 | UX enhancements (optional) | 16–24 |
| | **Total (Phases 1–2, the true MVP)** | **32–50** |
| | **Total (all three phases)** | **48–74** |

### Price by engagement type

| Tier | Rate | MVP (Ph 1–2) | All phases |
|---|---|---|---|
| Offshore / mid | ~$45/hr | **$1.5k–$2.3k** | $2.2k–$3.3k |
| **Senior freelance (recommended)** | ~$80/hr | **$2.6k–$4.0k** | $3.8k–$5.9k |
| Agency | ~$125/hr | $4.0k–$6.3k | $6.0k–$9.3k |

### Recommended offer to the client
- **Fixed price for the MVP (Phases 1–2): ~$3,500–$4,500**, delivered in ~2–3 weeks.
- **Phase 3 as an optional add-on: ~$1,500–$2,000.**
- Quote the work **fixed-price per phase**, not hourly — clients prefer certainty and it protects you on scope.
- **Excluded / passed through:** LLM API usage (OpenAI/Anthropic), Stripe fees, Supabase/Vercel hosting — the client pays these directly on their own accounts.

---

## 7. Anticipated client questions

- **"Can't it just live on our website?"** → It runs *under* your domain (`app.respectforpeople.com`) and is themed to match — same brand, but it needs its own app because of login, payments, and AI.
- **"Why not rebuild the whole site?"** → Slower, costlier, and you'd lose your Squarespace self-editing. No MVP benefit.
- **"Is it secure / ready for users?"** → Core is solid; we do a short hardening pass (Phase 2) before launch — standard practice.
- **"Who pays the AI bills?"** → You do, on your own accounts; usage scales with users. We can set spend caps.
- **"How long?"** → MVP live in ~2–3 weeks.

---

## 8. Next steps to propose on the call
1. Confirm Option A (subdomain) and whether theming-to-match is required.
2. Get DNS access + confirm Squarespace plan tier.
3. Set up client-owned OpenAI/Anthropic + Stripe + Supabase accounts.
4. Sign off on the Phase 1–2 fixed price; schedule kickoff.

*Sources: lemon.io, index.dev, ziprecruiter, ideas2it, semnexus, designrevision (2026 rate guides).*
