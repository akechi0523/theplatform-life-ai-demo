# AI Model Comparison — ThePlatform.life AI (360° of Perspectives)

**Use case:** psychological-style perspective profiling (9 types + stress/security shifts) from a short user scenario.
**Prepared:** 2026-06-23 · **Pricing verified:** June 2026 (sources below — confirm before contract).

> **Bottom line:** For the *quality* of this product, **Claude (Sonnet 4.6 or Opus 4.8) is the best fit** — Anthropic's models are strongest at nuanced, emotionally honest profiling. For *cost control on the free tier*, run a cheap model (**GPT-4o mini, DeepSeek, or Grok Fast**). That's the free/premium split the app already supports.

---

## The comparison (per-million-token prices)

| Model | Provider | Input $/M | Output $/M | Context | Fit for *this* use case | Speed |
|---|---|---:|---:|---:|---|---|
| **Claude Opus 4.8** | Anthropic | $5.00 | $25.00 | 1M | ★★★★★ Most nuanced & emotionally honest | Moderate |
| **Claude Sonnet 4.6** ⭐ | Anthropic | $3.00 | $15.00 | 1M | ★★★★★ Excellent — best value for quality | Fast |
| Claude Haiku 4.5 | Anthropic | $1.00 | $5.00 | 200K | ★★★★ Good, lighter nuance | Very fast |
| GPT-4.1 | OpenAI | $2.00 | $8.00 | ~1M | ★★★★ Very accurate, slightly clinical tone | Fast |
| GPT-4o | OpenAI | $2.50 | $10.00 | 128K | ★★★★ Very good (prior flagship) | Fast |
| **GPT-4o mini** | OpenAI | $0.15 | $0.60 | 128K | ★★★ Solid basics — free-tier option | Very fast |
| Gemini 3.1 Pro | Google | $2.00 | $12.00 | 1M | ★★★★ Strong reasoning, can over-format | Fast |
| Gemini 3.5 Flash | Google | $1.50 | $9.00 | 1M | ★★★ Good value, less depth | Very fast |
| **DeepSeek V4 Flash** | DeepSeek | $0.14 | $0.28 | 1M | ★★★ Capable & ultra-cheap — free-tier option | Fast |
| DeepSeek V4 Pro | DeepSeek | $0.44 | $0.87 | 1M | ★★★★ Stronger reasoning, utilitarian tone | Slower |
| **Grok 4.3** *(current default)* | xAI | $1.25 | $2.50 | 256K | ★★★ Fast & creative, less consistent nuance | Fast |
| Grok 4.1 Fast | xAI | $0.20 | $0.50 | 2M | ★★ Fast/cheap — free-tier option | Very fast |

⭐ = recommended premium model · **bold** = recommended free-tier candidates · current default = what we run today.

---

## What one analysis actually costs

**Now measured, not estimated.** A live Grok 4.3 run on 2026-06-23 used **1,177 input + 1,865 output tokens** (3,520 total incl. reasoning). Output dominates, as predicted — we generate 9 profiles. The estimate below is right; the real numbers just confirm it. Token use is broadly similar across models, so the costs below apply those measured counts (1,177 in / 1,865 out) at each provider's real rate. **Prompt caching** cuts the input portion further after the first call.

> **Measured run (Grok 4.3, our current default):** time-to-first-card **8.3s** · total **17.7s** · 1,177 in / 1,865 out tokens. (Grok is one of the slower models — a faster model is a key reason to test others.)

| Model | Provider | Est. cost / analysis | Per 1,000 analyses |
|---|---|---:|---:|
| Claude Opus 4.8 | Anthropic | ~$0.0525 | ~$52.50 |
| **Claude Sonnet 4.6** ⭐ | Anthropic | ~$0.0315 | ~$31.50 |
| Claude Haiku 4.5 | Anthropic | ~$0.0105 | ~$10.50 |
| GPT-4.1 | OpenAI | ~$0.0173 | ~$17.30 |
| GPT-4o | OpenAI | ~$0.0216 | ~$21.60 |
| **GPT-4o mini** | OpenAI | ~$0.0013 | ~$1.30 |
| Gemini 3.1 Pro | Google | ~$0.0247 | ~$24.70 |
| Gemini 3.5 Flash | Google | ~$0.0186 | ~$18.60 |
| **DeepSeek V4 Flash** | DeepSeek | ~$0.0007 | ~$0.70 |
| DeepSeek V4 Pro | DeepSeek | ~$0.0021 | ~$2.10 |
| **Grok 4.3** *(current, measured)* | xAI | ~$0.0061 | ~$6.10 |
| Grok 4.1 Fast | xAI | ~$0.0012 | ~$1.20 |

**Takeaway:** even the most expensive option is a nickel per analysis. At MVP volume, **model cost is not the binding constraint** — quality and free-tier abuse protection matter more. The right play is *quality model for paying users, cheap model for free users*.

> *Note on the in-app figure:* the app currently displays ~$0.0315 for that Grok run because its built-in cost table uses a placeholder rate ($3/$15) pending real per-provider rates. At Grok 4.3's actual price ($1.25/$2.50) the run is ~$0.006 — the table above uses the real rates. We'll point the in-app estimator at confirmed rates once keys are in.

---

## Recommended setup

| | **Free tier** | **Premium tier** |
|---|---|---|
| **Model** | GPT-4o mini / DeepSeek V4 Flash (~$1/1k runs) | **Claude Sonnet 4.6** (or Opus 4.8 for the richest output) |
| **Why** | Caps cost on the non-paying tier | Best nuance — the reason to upgrade |
| **Already supported?** | ✅ Tiering enforced in the app | ✅ — Claude needs a small adapter (different API) |

---

## Three corrections to the earlier research (all minor)

1. **"Claude 3.7 / 4.6 Sonnet" → it's just Claude Sonnet 4.6 now.** 3.7 is retired; the **$3 in / $15 out** figure was exactly right for the current Sonnet 4.6.
2. **Gemini 3.1 Pro output is ~$12/M, not $5/M.** The input ($2/M) was right; output was understated. Still a fine option, just costlier than it first looked.
3. **Anthropic's "Artifacts" is a feature of the Claude *chat app*, not the API.** Our app calls the API and already renders the side-by-side card layout itself — so we get that benefit with *any* provider.

---

*Sources (June 2026): [OpenAI pricing](https://openai.com/api/pricing/), [Google Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing), [xAI Grok pricing](https://x.ai/api), Anthropic model pricing (Opus 4.8 $5/$25, Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5). Per-analysis costs use the measured token counts from a live 2026-06-23 Grok 4.3 run (1,177 in / 1,865 out) applied at each provider's real rate; actuals will vary slightly per scenario and model.*
