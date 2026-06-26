# Meeting Prep — Brian / ThePlatform.life AI · 2026-06-23

**Attendee (client):** Brian (respectforpeople.com / ThePlatform.life)
**Product:** the "360° of Perspectives" AI scenario analyzer (Next.js app, live on Vercel)
**This doc:** everything for today's call — what's shipped, the model decision, answers to Brian's email, and the one ask. Pairs with [MODEL_COMPARISON_ONEPAGER.md](MODEL_COMPARISON_ONEPAGER.md) (shareable) and [AI_TRADEOFFS_CALL_PREP.md](AI_TRADEOFFS_CALL_PREP.md) (the trade-off deep-dive).

---

## 0. Read of where Brian is

He sent a researched, engaged email: a model-comparison table, a token analysis, three "areas to consider," and three output-format ideas (A/B/C). **This is a strong buying signal** — he's collaborating on *how* to build, not deciding *whether* to. He's leaning toward **Claude** for the psychological use case, which is the right instinct.

**Your three jobs on this call:**
1. Show you're **ahead of his research** (you already built 2 of his 3 "areas to consider").
2. Turn his model question into a **concrete recommendation + the free/premium split** the app already supports.
3. Land the **one ask**: provider API keys, so the next call has measured numbers.

**Tone:** collaborative and confident. He's done homework — meet it, sharpen it, don't contradict it.

---

## 1. The opener (lead with this)

> *"Thanks for the detailed notes — really helpful. Good news first: two of the three things you flagged to harden, we've already built. And on the model question, I agree Claude is the right call for the quality of this product — I'll show you exactly where it fits and what it costs. The main thing I need from you to finish the comparison is a couple of API keys."*

That sets up all three jobs in 20 seconds.

---

## 2. The power move — you've already built 2 of his 3 "areas to consider"

Brian's **"Missing Important Areas":**

| Brian's item | Status | What to say |
|---|---|---|
| **Prompt Caching** (background rules stay the same → cut input cost) | ✅ **Shipped** | "We restructured the prompt so the fixed rule-block is a stable, cacheable prefix. On Claude, cached input bills at ~10% of normal; on OpenAI ~50%. Only touches the repeated rules, never quality." |
| **System Persona Separation** (system prompt vs. user prompt) | ✅ **Shipped** | "All 9-type definitions and rules now live in the system prompt; the user message is just the scenario. This is the same change that enables caching — and it stops the model ever 'forgetting' the type rules as inputs grow." |
| **Context Window Memory** (paste a 10-page transcript) | ◻ **New feature, not a fix** | "That's a different product — analyzing a long conversation transcript. It's a great Phase-2 idea and needs a big-context model (Claude 1M, Gemini 2M). I'd scope it separately." (See §6.) |

> **One-liner:** *"You flagged three things; two are already live, and they were actually the same underlying change. The third is a new feature worth its own scope."*

---

## 3. What's shipped since last time (the demo)

Walk the live app and point these out:

- **Streaming** — results appear progressively, not after a 15–40s blank spinner.
- **Field-level reveal** — each card shows the moment its summary is ready (first content in ~1–2s on a fast model, vs. waiting for the whole profile).
- **Ordered, animated reveal** — cards fill left-to-right, row by row, with a soft entrance.
- **Per-run measurement** — every analysis logs model, tokens (incl. cached), est. cost, time-to-first-card, total time. Shown under the results.
- **Free/premium model tiering** — enforced server-side; premium models locked in the picker for free users.
- **Refund-on-failure** — a failed/cancelled analysis never costs the user their credit.

> See [AI_TRADEOFFS_CALL_PREP.md](AI_TRADEOFFS_CALL_PREP.md) §4 for the lever-by-lever detail and the measured Grok/Vercel latency baseline.

---

## 4. The trade-off frame (the spine of the conversation)

Every AI choice lives in a triangle — **accuracy ↔ cost ↔ latency**. The honest framing:

- **Accuracy is the anchor.** This product's value *is* the nuance of the analysis. So we fix quality first, then optimize cost and speed within it.
- **Cost and speed are dials** we manage deliberately and tie to free vs. premium.
- **Several wins sidestep the triangle entirely:** streaming and field-level reveal improve *felt* speed at zero quality/cost cost; caching cuts cost at zero quality cost.

> **Say:** *"We're not trading quality to save money or time. We use a few free wins, then one clear policy: best model for paying users, cheap model for free users, measured so the economics are never a guess."*

---

## 5. The model decision (have [MODEL_COMPARISON_ONEPAGER.md](MODEL_COMPARISON_ONEPAGER.md) open)

### 5a. Sharpen Brian's table — 3 gentle corrections (makes you look sharp)
1. **"Claude 3.7 / 4.6 Sonnet" → just Claude Sonnet 4.6.** 3.7 is retired; his **$3/$15** figure is exactly right for the current Sonnet 4.6.
2. **Gemini 3.1 Pro output is ~$12/M, not $5/M** (input $2/M was right). Still fine, just costlier than it looked.
3. **"Artifacts" is a claude.ai *chat-app* feature, not the API.** Our app already builds the side-by-side card UI itself — we get that with any provider.

### 5b. Current verified pricing (June 2026)
| Model | In $/M | Out $/M | Context | Note |
|---|---:|---:|---:|---|
| Claude Opus 4.8 | 5 | 25 | 1M | top quality |
| **Claude Sonnet 4.6** ⭐ | 3 | 15 | 1M | best value-for-quality |
| Claude Haiku 4.5 | 1 | 5 | 200K | cheaper Claude |
| GPT-4.1 | 2 | 8 | ~1M | OpenAI's current recommended flagship |
| GPT-4o mini | 0.15 | 0.60 | 128K | free-tier candidate |
| Gemini 3.1 Pro | 2 | 12 | 2M | strong, can over-format |
| DeepSeek V4 Flash | 0.14 | 0.28 | 1M | free-tier candidate (cheapest) |
| Grok 4.3 *(our default)* | 1.25 | 2.50 | 256K | fast/creative, less nuance |

### 5c. The recommendation (agrees with Brian)
- **Premium tier → Claude Sonnet 4.6** (Opus 4.8 if he wants the richest output). Claude *is* best for nuanced, emotionally honest profiling.
- **Free tier → GPT-4o mini or DeepSeek V4 Flash** (~$1 per 1,000 analyses). Caps free-tier cost.
- **Cost is tiny either way** — at our measured token use, even Opus is ~5.3¢/analysis (Sonnet ~3.2¢; free-tier models well under a cent). So *quality and free-tier abuse protection matter more than per-token price.*

### 5d. The honest caveat
> *"Our app currently speaks one API format shared by OpenAI, DeepSeek, and xAI. Claude's API is different, so adding it is a small, dedicated integration — modest work, not a rebuild. Gemini's the same. OpenAI and DeepSeek drop straight in."*

---

## 6. Brian's A/B/C output options — what they actually mean

**The core idea:** A/B/C is one question — *"how deep should each perspective go, and structured how?"* It's a **depth/format dial**, not three separate features. Think: quick glance → full profile → synthesized comparison. The key strategic point: **A and B are depth levels of the thing you've already built; C is a genuinely new thing.**

### A — Short basic output (2–3 sentences per type)
- **What it is:** each of the 9 types gets a brief 2–3 sentence take on the scenario. No stress/security breakdown.
- **In our app:** this *is* the **card `summary`** — the line that appears the instant a card pops in. **Already live.**
- **Example** (Type 8 "The Challenger," scenario = *"my co-founder wants to delay launch"*): *"You'd read the delay as hesitation that invites being walked over. Your instinct is to push for a decision now and take control of the timeline rather than wait for consensus."*
- **Cost:** cheapest — lowest output tokens. Brian's "token-comparable to the base response" is correct.

### B — Deeper dive / follow-up (the full profile)
- **What it is:** the short take **plus** the richer breakdown — scenario outlook, **stress response** (behavior under pressure), **security response** (behavior when healthy/safe). The full psychological picture.
- **In our app:** card summary **+ the detail panel** (Outlook · Stress · Security). **Mostly built** — we show the summary first, then the deeper detail.
- **The one refinement:** today we generate all prose for all 9 types every run. The smarter version is **"generate the deep detail only when a card is opened"** — a small add that *also lowers cost* (we don't pay for prose nobody reads).
- **Cost:** highest — this is where Brian's "+70% from adding stress/security" comes from; output tokens roughly double vs. A.

### C — Two perspectives + an integrated summary (NEW)
- **What it is:** instead of 9 independent profiles, the user picks **two types** and the model writes a **combined, synthesized** read — how those two perspectives compare, conflict, or complement on this one scenario.
- **In our app:** **does not exist yet.** Needs a new **prompt** (compare-and-synthesize two types, not profile nine) *and* new **UI** (a two-type picker + combined-summary view instead of the 9-card grid). A genuinely new feature.
- **Example** (Type 8 + Type 9 on the launch delay): *"The Challenger sees the delay as weakness to override; the Peacemaker sees it as space to keep everyone aligned. The tension is speed vs. cohesion — pushing hard now wins the timeline but risks the co-founder relationship the Peacemaker is protecting…"*
- **Cost:** mostly a **build** cost (new prompt + new screen), *not* a token cost — per run it's actually cheaper than B (two types, not nine).

| Option | What it is | Status in our app | Per-run cost |
|---|---|---|---|
| **A** | 2–3 sentence take per type | ✅ **Live** (card summary) | Lowest |
| **B** | Full profile (outlook + stress + security) | 🟡 **Mostly built** (detail panel) | Highest (~+70%) |
| **C** | Two types, one synthesized comparison | ◻ **New feature** — new prompt + new UI | Mid (build cost, not tokens) |

> **Say:** *"A is live. B is mostly there — the only refinement is generating the deep detail on-demand when a card is opened, which also saves tokens. C is a different product: a 'compare two perspectives' mode with its own prompt and screen, so I'd scope and quote it separately."*

> **Why this framing matters:** it stops Option C from getting silently absorbed into the current price. A and B are depth dials on what exists; C is its own line item.

---

## 7. Brian's token analysis — validate, then one-up with real numbers

His estimate (≈150 in / 650 out; +70% from adding stress/security) makes **exactly the right point: output tokens dominate.** He's directionally correct. Affirm it, then show the **measured** run:

> **Measured run — Grok 4.3, 2026-06-23:** **1,177 input · 1,865 output · 3,520 total** tokens · 128 cached · time-to-first-card **8.3s** · total **17.7s**.

Two things this tells Brian (both reinforce your points):
- **Output dominates, confirmed** — 1,865 out vs. 1,177 in. His instinct was right; we now *measure* it per run instead of estimating.
- **Real input is ~8× his 150 estimate** — because the full 9-type rulebook lives in the system prompt. That's not waste: it's *exactly* what prompt caching is for. The fixed rulebook is the cacheable prefix, so after the first call we pay a fraction of that input.

> *"Your model is right — output drives cost. Two refinements from real data: input is bigger than 150 because the whole 9-type rulebook is in the system prompt, and that's precisely the part we cache. And we now read exact input/output/cached tokens and cost on every single run, so the economics are measured, not guessed."*

**Per-analysis cost at these measured tokens** (real provider rates — full table in [MODEL_COMPARISON_ONEPAGER.md](MODEL_COMPARISON_ONEPAGER.md)):

| Model | Cost / analysis | Per 1,000 |
|---|---:|---:|
| Claude Opus 4.8 | ~$0.053 | ~$53 |
| Claude Sonnet 4.6 ⭐ | ~$0.032 | ~$32 |
| GPT-4o mini *(free-tier)* | ~$0.0013 | ~$1.30 |
| DeepSeek V4 Flash *(free-tier)* | ~$0.0007 | ~$0.69 |
| Grok 4.3 *(current, measured)* | ~$0.0061 | ~$6.10 |

> **Heads-up on the live demo:** the in-app cost readout was fixed to use real rates ([pricing.ts](src/server/services/pricing.ts)). It previously showed ~$0.0315 for a Grok run because of a placeholder $3/$15 rate; it now shows ~$0.006 at Grok 4.3's real $1.25/$2.50. If Brian saw the old number anywhere, that's the explanation.

---

## 8. Scope flags — protect the quote

Name these so they don't get absorbed into the current price:
1. **Option C** (two-perspective integrated summary) — new feature.
2. **"Paste a 10-page chat transcript"** — a different product (communication analysis over a long transcript); needs a big-context model and new flow. Exciting **Phase-2** opportunity, separately scoped.

---

## 9. THE ASK — provider API keys

This is the one concrete thing to leave the call with:

> *"To finish the comparison with real numbers — not estimates — I need keys for the providers we want to test. **OpenAI and DeepSeek drop straight in; Claude and Gemini each need a small adapter** since their APIs differ. Even one or two keys lets me run the same scenarios side-by-side and bring you measured quality/cost/speed at the next call. Right now we only have the xAI/Grok key, which is also why the free/premium split and the caching savings aren't fully demoable yet."*

Why it matters (if pressed): Grok is the only key we hold; the free tier needs a *cheap* model (needs OpenAI/DeepSeek), and caching savings only show on providers that report them.

---

## 10. Anticipated questions → answers

- **"Is Claude really better here?"** → Yes for nuance/emotional honesty — a genuine Anthropic strength, and why I'd make it the premium model. Free tier runs a cheaper model.
- **"How much will the AI cost us?"** → Cents per analysis even at the top end; we measure every run. Free tier is capped by a cheap model + the 1-analysis/month limit; premium is covered by the subscription.
- **"What stops the bill exploding?"** → Cheap free-tier model, the monthly free limit, prompt caching, lean output, and provider-level spend caps. You own the accounts, so you see and control spend.
- **"Why does Claude need extra work but DeepSeek doesn't?"** → Our three current providers share one API; Claude's is different — a small dedicated adapter, not a rebuild.
- **"Can we make it faster?"** → It already streams; first card in ~1–2s on a fast model. The remaining time is the model's own speed — another reason to test faster providers.
- **"Will caching/streaming hurt quality?"** → No. Streaming changes *when* text appears; caching changes how repeated rules are *billed*. Output is identical.
- **"Which model do you recommend?"** → Claude Sonnet 4.6 for premium, a cheap model for free — confirmed with measured numbers once I have keys.

---

## 11. What to leave the call with (decisions)

1. ✅ **Sign-off that Claude is the premium model**, cheap model for free tier.
2. 🔑 **One or two provider keys** (OpenAI / DeepSeek first; Claude/Gemini if he wants them compared).
3. 📋 **Agree Option C and the transcript feature are separate scope** (future quotes).
4. 🗓️ **Next step:** with keys in hand, return with the measured cost/latency/quality table and lock per-tier models.

> **Closing line:** *"We've made it fast, measured, and cost-controlled — that's live. Give me a key or two and I'll come back with hard numbers on the best model for each tier, and we lock the choices from there."*

---

### Appendix — pricing source note
All competitor figures verified June 2026 from provider/aggregator pricing pages (OpenAI, Google AI, DeepSeek docs, xAI). Claude figures are Anthropic's current rates (Opus 4.8 $5/$25, Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5). Per-analysis costs use the measured token counts from a live 2026-06-23 Grok 4.3 run (1,177 in / 1,865 out) at each provider's real rate. Full table + sources in [MODEL_COMPARISON_ONEPAGER.md](MODEL_COMPARISON_ONEPAGER.md).
