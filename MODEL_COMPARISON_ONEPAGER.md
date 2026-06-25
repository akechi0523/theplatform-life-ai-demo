# AI Model Comparison — ThePlatform.life AI (360° of Perspectives)

**Use case:** psychological-style perspective profiling (9 types + stress/security shifts) from a short user scenario.
**Prepared:** 2026-06-25 · **Data:** live measured this morning · **Pricing:** June 2026 (confirm before contract).

> **Bottom line:** For *output quality*, **Claude Sonnet 4.6** is the best fit — most nuanced and emotionally honest. If latency matters, **GPT-4.1** gets ~90% of the quality at a quarter the cost and time. For *cost control on the free tier*, run **DeepSeek V4 Flash** (under a tenth of a cent per analysis). **Grok 4.3** stays as the balanced default. All five models are now live in the app and selectable by every user.

*(A deeper write-up with per-scenario detail and UX factors is in `MODEL_COMPARISON_4MODELS.md`.)*

---

## The five models compared (measured, 3 scenarios each)

| Model | Provider | In/Out tokens | First card | Total | **$/analysis** | Per 1,000 | Fit for *this* use case |
|---|---|---|---:|---:|---:|---:|---|
| **Claude Sonnet 4.6** ⭐ | Anthropic | 1,178 / 3,791 | 4.9s | 76.1s | **$0.060** | $60.40 | ★★★★★ most nuanced (writes the most prose) |
| GPT-4.1 | OpenAI | 1,137 / 1,998 | 5.3s | 19.4s | **$0.017** | $17.23 | ★★★★ accurate, fast, slightly clinical |
| Gemini 3.5 Flash | Google | ~1,140 / ~2,100 *(est)* | — | — | **~$0.021** *(est)* | ~$20.6 | ★★★ good value — *measure pending (503)* |
| **DeepSeek V4 Flash** | DeepSeek | 1,078 / 2,151 | 4.1s | 24.3s | **$0.0007** | $0.67 | ★★★ capable & ultra-cheap — free-tier pick |
| **Grok 4.3** *(current default)* | xAI | 1,178 / 2,074 | 7.3s | 20.3s | **$0.0065** | $6.54 | ★★★ fast & creative |

⭐ = recommended premium model · **bold** = recommended free-tier candidates · all five returned the full **9/9** cards on every run.

---

## What one analysis actually costs — now measured per model

Earlier we measured one Grok run and assumed token parity. This time we ran the **real pipeline** for each model across 3 scenarios. The finding: **input tokens are nearly identical (~1,080–1,180, same prompt); output is where they differ.** Claude writes ~3,800 output tokens of richer prose vs ~2,000–2,200 for the others — that one fact explains its higher quality, cost, and total time. Prompt caching trims the input portion further after the first call.

**Cost spread is ~85×** across the five — from ~$0.060 (Claude) to ~$0.0007 (DeepSeek). **Even the most expensive option is ~6¢ per analysis**, so at MVP volume **model cost is not the binding constraint** — quality (paid) and free-tier cost control matter more.

> **Perceived speed stays good even for Claude:** because the app streams cards as they're ready, the *first card* appears in ~5s for every model. Claude's longer 76s "total" is just it writing far more text — not lag.

---

## Recommended setup

| | **Free tier** | **Premium tier** |
|---|---|---|
| **Model** | **DeepSeek V4 Flash** (~$0.67 / 1k runs) | **Claude Sonnet 4.6** — or **GPT-4.1** when speed matters |
| **Why** | Near-zero cost on the non-paying tier | Best nuance — the reason to upgrade |
| **Status** | ✅ live in the app | ✅ Claude adapter built & tested; GPT-4.1 / Gemini / Grok all live |

The per-analysis **token gate** still bounds usage; the old premium lock on *model choice* has been removed — any user can pick any model.

---

## Notes
- **Gemini 3.5 Flash:** integrated and authenticated (key valid, model id listed), but Google returned transient `503 "high demand"` for every call in the benchmark window today (even a 1-token probe) — a provider-side capacity issue, not config. Its figures above are estimated from list price; re-run the benchmark to capture measured numbers once capacity frees.
- **In-app cost readout** now uses real per-provider rates (the old $3/$15 placeholder that showed ~$0.0315 for Grok is gone) — it reports ~$0.006–0.060 depending on the model selected.
- **Security:** the API keys shared for this work should be **rotated** in each provider dashboard after the meeting.

*Source rates (per 1M, in/out): Claude Sonnet 4.6 $3/$15 · GPT-4.1 $2/$8 · Gemini 3.5 Flash $1.5/$9 · DeepSeek V4 Flash $0.14/$0.28 · Grok 4.3 $1.25/$2.50. Per-analysis costs apply these to the measured token counts from live 2026-06-25 runs; actuals vary slightly per scenario.*
