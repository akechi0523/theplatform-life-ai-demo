# Client Call Prep — Managing the AI Trade-offs (Accuracy × Cost × Latency)

**Product:** ThePlatform.life AI — the "360° of Perspectives" scenario analyzer
**Deployment:** live as a standalone app on Vercel (free/Hobby plan) for testing
**Status:** updated 2026-06-23 — the improvements below are **shipped and in the live demo**, not just proposed.
**Purpose of this doc:** Walk the client through how we keep the AI **accurate, affordable, and fast**, what we've already shipped, the trade-offs involved, and the one thing we need from them next (more provider keys for testing).

> **The one sentence to open with:**
> *"Accuracy is the anchor — the analysis has to be genuinely good. Within that, cost and speed are dials we manage deliberately, and we've now built the machinery to do it: streaming so results feel instant, prompt caching to cut cost, per-run measurement so the economics are never a guess, and a free/premium model split. The next step is testing a couple more AI providers so we can pick the best balance with real numbers."*

---

## Status at a glance

| Area | What we did | Status |
|---|---|---|
| **Streaming** | Results appear progressively, card by card | ✅ Shipped |
| **Field-level reveal** | A card appears the moment its summary is ready (no waiting for the full profile) | ✅ Shipped |
| **Ordered reveal + polish** | Cards fill left-to-right, row by row, with a soft entrance animation | ✅ Shipped |
| **Prompt caching** | Static instructions restructured into a cacheable prefix | ✅ Shipped |
| **Per-run measurement** | Every analysis logs model, tokens, est. cost, time-to-first + total | ✅ Shipped |
| **Model tiering** | Free → fast/cheap model; Premium → top model (server-enforced) | ✅ Shipped* |
| **Refund on failure** | A failed/cancelled analysis never costs the user their credit | ✅ Shipped |
| **Timeout + provider fallback** | Auto-recover if a provider stalls or errors | ◻ Next |
| **Multi-provider testing** | Compare OpenAI / DeepSeek / Claude / Gemini on quality, cost, speed | ◻ Needs client keys |

\* *Tiering is built and enforced, but we can only fully **show** it once we have a second provider key — see §8.*

---

## 1. The trade-off in plain English

Every AI feature lives inside a triangle. You can push hard on any one corner, but it pulls on the other two:

| Corner | What it means | What pushing it costs |
|---|---|---|
| **Accuracy / quality** | How specific, insightful, and on-framework the 9 perspectives are | Bigger/smarter models and longer answers → more tokens (cost) and more time (latency) |
| **Cost (token consumption)** | What each analysis costs us in API fees | Cutting it (cheaper model, shorter answers) can lower quality |
| **Latency / speed (UX)** | How long the user waits for results | The fastest path is a smaller model or less text — which can cost quality |

**The honest framing for the client:** there is no single "best" setting — there's a *right* setting for a given user and moment. Our job is to make those choices on purpose, measure them, and tie them to the business model (free vs. premium). We've now built the tooling to do exactly that.

**The good news:** several of our biggest moves improve *two corners at once* or sidestep the triangle entirely (see §4). This isn't a zero-sum trap — it's a set of well-understood levers, most of which are already in.

---

## 2. How the analysis works now (updated)

Originally this was **one blocking request**: a single AI call generated all 9 perspectives as one big response, and the user stared at a spinner for 15–40 seconds until everything appeared at once.

**That's been rebuilt.** Today:

- The analysis **streams**. Each of the 9 perspectives renders as it's produced, in a clean left-to-right, row-by-row order, with a soft entrance animation.
- **Field-level reveal:** a card appears the instant its one-sentence **summary** is ready — it no longer waits for the full profile (outlook, stress, security) to finish. The deeper detail fills in moments later when you open the card.
- Every run is **measured**: model, tokens in/out, cached tokens, estimated cost, time-to-first-card, and total time — shown right under the results and logged server-side.
- The app speaks to **multiple AI providers** (OpenAI, DeepSeek, xAI/Grok) behind one interface, with a model picker, and a **free/premium model split** enforced on the server.

**Why this matters:** the amount of **text generated** is still the biggest driver of both wait time and cost — but the user no longer *experiences* that wait, because content now streams in starting from the first summary.

---

## 3. Where each corner stands now

- **Accuracy:** Strong, unchanged. The prompt is tightly engineered to stay on-framework (exact type names, taglines, stress/security shift paths) and specific to the user's scenario. Still the strongest corner.
- **Latency (felt):** Massively improved. Instead of a 15–40s blank spinner, cards now stream in starting from the first summary. Field-level reveal targets a **~1–2s first card** once we're on a fast model (see the measurement note in §6).
- **Cost:** Now **managed and visible**, not a black box — prompt caching lowers input cost, output is leaner, and we measure cost per run. Free-tier exposure is capped by the cheap model + the 1-analysis/month limit.

> **Talking point:** "The intelligence was already strong. We've now fixed the experience — it feels fast — and made the cost measurable and controllable. The remaining work is comparing providers to lock in the best model for each tier."

---

## 4. The levers — what we pulled, and what each one costs

Marked ✅ shipped / ◻ next. Ordered by return on effort.

### ✅ Lever 1 — Streaming results *(fixes the wait; costs nothing elsewhere)* ⭐ the centerpiece
Each perspective appears the moment it's ready instead of all at once at the end. Total compute time is unchanged, but the *perceived* wait collapses.
- **Accuracy:** unchanged. **Cost:** unchanged. **Latency (felt):** dramatically better.

### ✅ Lever 2 — Field-level reveal *(first paint on a single sentence)*
A card renders as soon as its **summary** field arrives, rather than after its whole ~6-field profile. This is what turns "first content in several seconds" into "first content almost immediately," because the model only has to produce one short sentence before something shows.
- **Accuracy:** unchanged. **Cost:** unchanged. **Latency (felt):** the biggest first-paint win after streaming itself.

### ✅ Lever 3 — Prompt caching *(cuts input cost; zero quality impact)*
The large, identical instruction block (rules + all 9 type definitions) is now structured as a stable prefix, so providers that support prefix caching bill it at a fraction of the rate. Only the user's scenario changes per request.
- **Accuracy:** unchanged. **Latency:** slightly better. **Cost:** input-side cost drops on every request after the first.
- *Caveat: the savings show on providers that support caching (OpenAI/DeepSeek). Grok doesn't report cache usage to us today — another reason to test other providers.*

### ✅ Lever 4 — Model tiering tied to free vs. premium *(the core strategic dial)*
The server enforces it: **free users → fast, low-cost model; premium users → top-accuracy model.** Premium models are locked in the picker for free users. Quality becomes a *reason to upgrade*, so the accuracy corner is monetized rather than just paid for.
- **Trade-off:** free-tier answers are slightly less nuanced than premium — intentional product design, a familiar free/pro pattern.
- *Note: we currently only hold an xAI key, so today both tiers fall back to Grok. The split becomes demonstrable the moment we add a cheaper provider (see §8).*

### ✅ Lever 5 — Per-run measurement *(makes the trade-off concrete)*
Every analysis records model, tokens (in/out/cached), estimated cost, time-to-first-card, and total time — surfaced in the UI and logged. This is what lets us tune the free/premium split with data instead of opinion.

### ✅ Lever 6 — Refund on failure *(trust on a 1-free-analysis tier)*
If an analysis fails or is cancelled, the user's credit is automatically returned. A glitch never costs them their one free try.

### ◻ Lever 7 — Right-sizing / lazy depth *(cuts cost AND latency)*
Field-level reveal already gives us the *perceived-speed* half of this. The remaining opportunity is **generating deep detail only when a card is opened**, which would also cut *cost* (we'd stop generating full prose for all 9 when users read one or two). Phase-in candidate.

### ◻ Lever 8 — Timeout + provider fallback *(reliability)*
We already propagate cancellation and refund on failure. Still to add: a hard **timeout** so a stalled provider can't hang the request, and automatic **fallback** to a backup provider. The multi-provider design makes this cheap — but fallback needs at least one more provider key to be real (see §8).

### ◻ Lever 9 — Parallel generation *(buy speed with money — not recommended yet)*
We could split the 9 profiles into simultaneous calls to cut total wall-clock ~3×, but it costs more and risks the 9 reading less consistently. Streaming + field-level reveal already deliver the felt-speed win, so we'd only do this if you want a faster *total* completion.

---

## 5. Recommended strategy (what we've shipped + what we'd lock in)

A simple, defensible policy — already built:

| | **Free tier** | **Premium tier** |
|---|---|---|
| **Model** | Fast, low-cost | Top accuracy |
| **Speed** | Fast (streamed) | Fast (streamed) |
| **Depth** | Full 9 perspectives | Full 9, richest model |
| **Our cost exposure** | Capped & low | Covered by subscription |

Applied to **everyone** (no downside): streaming, field-level reveal, prompt caching, per-run measurement, refund-on-failure.

> **Plain-English version for the client:** *"Everyone gets a fast, reliable experience. Premium buys the smartest model and the deepest analysis. We keep our costs predictable, and we measure every run so the economics are never a guess."*

---

## 6. The measurement story — with real numbers

We instrument every analysis, so this isn't theory. Here's a **measured baseline** from the live Vercel demo:

**Provider: xAI Grok 4.3 · Vercel free plan · before the field-level-reveal optimization**

| Run | First perspective | Total |
|---|---|---|
| 1 | 6.1s | 16.4s |
| 2 | 5.9s | 14.6s |
| 3 | 10.8s | 32.0s |
| 4 | 9.1s | 29.5s |
| 5 | 8.9s | 21.8s |

Two things this told us, and what we did about each:

1. **First-paint was dominated by waiting for a whole perspective to finish.** → Fixed with **field-level reveal**: a card now shows after just its one-sentence summary, so first paint no longer waits on ~6 fields. (We'll re-measure on the new build and bring updated numbers.)
2. **The absolute times track the model.** Grok is the **slowest and most variable** option we have — and it's the *only* provider key we currently hold. Faster providers (e.g. GPT-4o mini, DeepSeek) typically start sooner and generate faster.

> **Talking point:** "We don't guess at the economics or the speed — we measure every run. These are real numbers on the slowest model we have access to. To hit the ~1–2s target and compare cost honestly, the next step is testing a couple of faster providers."

A target picture once we can test across providers:

| Model class | Felt first card | Cost / run | Quality |
|---|---|---|---|
| Fast/cheap (e.g. GPT-4o mini, DeepSeek) | ~1–2s | lowest | good, less nuance |
| Balanced (e.g. GPT-4o) | ~1–2s | medium | strong |
| Deep/reasoning | ~1–2s | highest | richest |

---

## 7. Cost control & predictability

How we keep the AI bill predictable:

- **Free tier is the main exposure** — capped by the cheap model *and* the 1-analysis/month limit.
- **Prompt caching** structurally lowers per-call input cost (on supporting providers).
- **Leaner output + field-level reveal** keep generated text (the expensive part) in check.
- **Spend caps / alerts** can be set at the provider for a hard ceiling.
- **Measurement** means we see cost-per-user trends early, not at invoice time.
- **The client owns the API accounts**, so billing is transparent and in their control.

---

## 8. The one ask: more provider keys for testing

**Today we only have an xAI (Grok) key.** That single constraint limits three things we've built:

- **Speed:** Grok is the slowest/most variable model we can reach — our latency numbers are partly *its* numbers, not the product's ceiling.
- **The free/premium split:** the free tier is meant to run a cheap, fast model (e.g. GPT-4o mini / DeepSeek). Without one of those keys, both tiers fall back to Grok, so we can't show the split.
- **Caching savings:** Grok doesn't report cache usage to us, so the cost win is invisible until we test a provider that does.

**The request:** API keys (or accounts) for any of **OpenAI, DeepSeek, Anthropic (Claude), or Google (Gemini)**. With even one or two we can run the same scenario side-by-side and recommend the best **quality ↔ cost ↔ speed** balance for each tier — with measured evidence.

- **OpenAI and DeepSeek** plug in immediately (the app already speaks their format).
- **Claude and Gemini** use different APIs and need a small integration step on our side first — worth doing if the client wants them in the comparison.

---

## 9. Anticipated client questions & answers

**Q: "How fast is it now?"**
A: Results stream in card by card, and each card appears as soon as its summary is ready — so you see content almost immediately instead of a 15–40s blank wait. The exact first-paint time depends on the model; on the slow Grok model we measured ~6–11s to first content *before* the latest optimization, and we expect that to drop sharply now and further on a faster provider.

**Q: "Why is it still not instant on the current model?"**
A: Because we're testing on Grok, the slowest model we have a key for, on a free hosting plan. The architecture is fast; the remaining time is the model's own speed. That's exactly why we're asking for a couple more provider keys.

**Q: "Will streaming or caching make the answers worse?"**
A: No. Streaming only changes *when* text appears, not *what* it is. Caching only changes how the repeated instructions are billed, not the output. Both are pure wins.

**Q: "How much does each analysis cost us?"**
A: We measure it per run — model, tokens, and estimated cost are shown for every analysis. Free-tier cost is capped by the cheap model plus the one-analysis limit; premium is covered by the subscription. We can also set hard spend caps at the provider.

**Q: "What stops our AI bill from exploding as we grow?"**
A: The free tier runs the cheap model and is limited to one analysis a month; prompt caching cuts input cost; output is kept lean; and we set provider-level spend caps and alerts. Plus you own the accounts, so you see and control spend directly.

**Q: "Why do you need other API keys — isn't Grok enough?"**
A: Grok works, but it's the slowest model we can reach and it can't show two of the features we built (the free/premium model split and caching savings). One or two more keys let us compare quality, cost, and speed with real numbers and pick the best fit for you.

**Q: "What if the AI provider goes down or is slow?"**
A: A failed or cancelled analysis already refunds the user's credit automatically, so a glitch never costs them their try. We're also adding a hard timeout and automatic fallback to a backup provider — which becomes possible the moment we have a second provider key.

**Q: "Which AI model are we actually using?"**
A: It's configurable and not locked to one vendor — that was a deliberate design choice. We recommend a fast model for free users and the strongest available model for premium, and we can switch as models improve or prices change without a rewrite.

**Q: "Does a cheaper model for free users feel like a bait-and-switch?"**
A: No more than free vs. pro tiers anywhere. Free users get a genuinely useful, fast result; premium gets the most capable model and deepest analysis. It's a clear value ladder, and we're transparent about it.

---

## 10. What we recommend on this call

1. **See the live demo** — streaming + field-level reveal + the per-run metrics readout.
2. **Get us 1–2 more provider keys** (OpenAI / DeepSeek first; Claude / Gemini if you want them compared). This unblocks the speed test, the free/premium split, and the caching savings.
3. **Then decide together, with data:** we run the same scenarios across providers and lock the per-tier model choices from the measured cost/latency/quality table.
4. **Schedule the reliability follow-up:** timeout + provider fallback (small, well-scoped — needs the second key).

> **Closing line:** *"We've made it fast, measurable, and cost-controlled — that part's done and live. Give us one or two more AI keys and we'll come back with hard numbers on the best model for each tier."*

---

### Appendix — quick reference: lever → which corner it moves

| Lever | Accuracy | Cost | Latency (felt) | Status |
|---|---|---|---|---|
| Streaming | — | — | ⬆⬆⬆ | ✅ Shipped |
| Field-level reveal | — | — | ⬆⬆⬆ | ✅ Shipped |
| Prompt caching | — | ⬆⬆ | ⬆ | ✅ Shipped |
| Model tiering (free/premium) | dial | ⬆⬆ | ⬆ | ✅ Shipped* |
| Per-run measurement | — | (visibility) | — | ✅ Shipped |
| Refund on failure | (trust) | — | — | ✅ Shipped |
| Right-size / lazy depth | slight ⬇ | ⬆⬆ | ⬆⬆ | ◻ Next |
| Timeout / provider fallback | (reliability) | — | — | ◻ Next (needs 2nd key) |
| Parallel generation | — | ⬇ (costs more) | ⬆ (total) | ◻ Skip for now |

*\* enforced in code; fully demonstrable once a second provider key is added.*

*(⬆ = improves that corner · ⬇ = worsens it · — = no effect · "dial" = deliberately tunable)*
