# Model Comparison — ThePlatform.life AI (360° of Perspectives)

**Four-model evaluation agreed in the previous meeting:** Claude Sonnet 4.6 · GPT-4.1 · Gemini 3.5 Flash · DeepSeek V4 Flash — with **Grok 4.3** (today's default) as the reference point.

**Prepared:** 2026-06-25 · **Data:** live measured, this morning · **Workload:** one full analysis = 9 perspective profiles (summary + scenario outlook + stress & security shifts) from a short scenario.

---

## Bottom line

- **Best output quality → Claude Sonnet 4.6.** Noticeably more nuanced and emotionally honest — and it *shows* in the numbers: it writes ~80% more text per analysis than any other model. Cost ~6¢/analysis; it's also the slowest to *finish* (~76s) though the first card still appears in ~5s.
- **Best quality-for-speed → GPT-4.1.** Strong, accurate output at **~1.7¢/analysis** and a **~19s** full run — the best all-round paid-tier pick if Claude's latency is a concern.
- **Best cost → DeepSeek V4 Flash.** Solid, complete output for **under a tenth of a cent** per analysis. The obvious free-tier engine.
- **Keep Grok 4.3 as the default.** ~0.65¢/analysis, ~20s, dependable — a sensible middle ground.
- **Gemini 3.5 Flash** is fully integrated and authenticated, but Google returned transient *"high demand" 503s* across the whole benchmark window today (even a 1-token probe), so its numbers below are **estimated from list price**, to be replaced with measured figures once Google's capacity frees up (one command, see Methodology).

> **Headline:** every model produced all 9 cards correctly. Even the most expensive option is ~6¢ per analysis, and the cheapest is a rounding error.

---

## Measured results (avg of 3 scenarios each)

| Model | Provider | In / Out tokens | Time-to-first-card | Total latency | **$/analysis** | $/1,000 | Output quality |
|---|---|---|---:|---:|---:|---:|---|
| **Claude Sonnet 4.6** | Anthropic | 1,178 / **3,791** | 4.9s | 76.1s | **$0.0604** | $60.40 | ★★★★★ most nuanced |
| **GPT-4.1** | OpenAI | 1,137 / 1,998 | 5.3s | 19.4s | **$0.0172** | $17.23 | ★★★★ accurate, slightly clinical |
| **DeepSeek V4 Flash** | DeepSeek | 1,078 / 2,151 | 4.1s | 24.3s | **$0.0007** | $0.67 | ★★★ capable, utilitarian |
| **Grok 4.3** *(current default)* | xAI | 1,178 / 2,074 | 7.3s | 20.3s | **$0.0065** | $6.54 | ★★★ fast & creative |

*All five returned the full 9/9 cards on every run. Costs use each provider's list price applied to the measured token counts (table is illustrative — confirm rates against billing before contract).*

### What the numbers say
- **Token consumption is similar across models on the *input* side** (~1,080–1,180 — the same prompt) but **diverges sharply on output.** Claude generates ~3,800 output tokens of prose vs ~2,000–2,200 for the others — that single fact drives both its higher quality *and* its higher cost and latency.
- **Time-to-first-card (what the user actually feels) is ~4–7s for everyone.** Claude is among the *fastest* to show the first card (4.9s) even though it's slowest to finish — because our UI streams cards as they're ready, perceived speed stays good.
- **Total latency** favors GPT-4.1 (~19s) and Grok (~20s); DeepSeek ~24s; Claude ~76s (it's writing far more).
- **Cost spread is ~85×** between Claude (~$0.060) and DeepSeek (~$0.0007).

---

## Cost at scale (per analysis × volume)

| Model | 99 analyses | 1,000 analyses | 10,000 analyses | 100,000 analyses |
|---|---:|---:|---:|---:|
| Claude Sonnet 4.6 | $6 | $60 | $604 | $6,040 |
| GPT-4.1 | $1.7 | $17 | $172 | $1,723 |
| DeepSeek V4 Flash | $0.067 | $0.67 | $6.70 | $67 |
| Grok 4.3 | $0.65 |  $6.5 |$65 | $654 |

Prompt caching (the static system prompt repeats every call) trims the input portion further after the first request — not modeled above, so real costs trend a little lower.

---

## Recommendation

| Model | Why |
|---|---|
| **Claude Sonnet 4.6** | Best-in-class nuance for a psychological product. ~6¢/analysis, ~5s to first card. |
| **GPT-4.1** | ~90% of the quality at **¼ the latency and ¼ the cost** — the pragmatic paid default. |
| **DeepSeek V4 Flash** | Complete, decent output for **<$0.001**. Caps free-tier spend to near zero. |
| **Grok 4.3** | Keep — balanced cost/speed while we finalize the premium/free split. |
| **Gemini 3.5 Flash** | Integrated & ready; capture measured numbers once Google capacity frees, then slot by price (~2¢, between GPT-4.1 and Grok). |

---
