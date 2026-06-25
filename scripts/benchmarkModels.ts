// ─────────────────────────────────────────────────────────────────────────────
// Live model benchmark for the client comparison.
//
// Drives the REAL production pipeline (`analyzeScenarioStream`) for each model ×
// scenario, measuring time-to-first-card, total latency, token usage, and cost.
// Writes a JSON + Markdown summary.
//
// Run:  node --env-file=.env.local --import tsx scripts/benchmarkModels.ts
// ─────────────────────────────────────────────────────────────────────────────

// Silence the dev stream trace + prompt-file logging inside analysis.ts.
Object.assign(process.env, { NODE_ENV: "production" });

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeScenarioStream } from "../src/server/services/analysis";
import { estimateCost } from "../src/server/services/pricing";
import { getModelOption, type ModelId } from "../src/features/perspectives/data/models";

const SCENARIOS = [
  "Buying a house for the first time with a fiancé",
  "Starting a new business with a close friend",
  "Deciding whether to accept a major job promotion",
];

const ALL_MODELS: ModelId[] = [
  "claude-sonnet-4-6",
  "gpt-4.1",
  "gemini-3.5-flash",
  "deepseek-v4-flash",
  "grok-4.3",
];

// Optional CLI filter: `... benchmarkModels.ts gemini-3.5-flash,grok-4.3`.
const FILTER = process.argv.slice(2).join(",").split(",").map((s) => s.trim()).filter(Boolean);
const MODELS: ModelId[] = FILTER.length ? (FILTER as ModelId[]) : ALL_MODELS;
const OUT_SUFFIX = FILTER.length ? `-${FILTER.join("_").replace(/[^a-z0-9_.-]/gi, "")}` : "";

const RUN_TIMEOUT_MS = 120_000;

interface RunResult {
  modelId: string;
  label: string;
  apiModel: string;
  scenario: string;
  ok: boolean;
  error?: string;
  timeToFirstCardMs?: number;
  totalMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedPromptTokens?: number;
  estCostUsd?: number | null;
  cardCount?: number;
}

async function runOne(modelId: ModelId, scenario: string): Promise<RunResult> {
  const opt = getModelOption(modelId);
  const base: RunResult = { modelId, label: opt.label, apiModel: opt.model, scenario, ok: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
  const startedAt = Date.now();
  let firstAt = 0;
  const seen = new Set<number>();
  let usage: { promptTokens: number; completionTokens: number; totalTokens: number; cachedPromptTokens: number } | undefined;

  try {
    for await (const ev of analyzeScenarioStream(scenario, modelId, controller.signal)) {
      if (ev.kind === "perspective") {
        if (!firstAt) firstAt = Date.now();
        seen.add(ev.data.typeNumber);
      } else if (ev.kind === "done") {
        usage = ev.usage;
      }
    }
    const totalMs = Date.now() - startedAt;
    const cost = usage ? estimateCost(opt.model, usage) : null;
    return {
      ...base,
      ok: true,
      timeToFirstCardMs: firstAt ? firstAt - startedAt : undefined,
      totalMs,
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      totalTokens: usage?.totalTokens,
      cachedPromptTokens: usage?.cachedPromptTokens,
      estCostUsd: cost?.usd ?? null,
      cardCount: seen.size,
    };
  } catch (err) {
    return { ...base, ok: false, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

function avg(nums: Array<number | undefined>): number | null {
  const vals = nums.filter((n): n is number => typeof n === "number");
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function fmtMs(ms: number | null): string {
  return ms == null ? "—" : `${(ms / 1000).toFixed(1)}s`;
}
function fmtUsd(v: number | null): string {
  return v == null ? "—" : `$${v.toFixed(4)}`;
}
function fmtNum(v: number | null): string {
  return v == null ? "—" : Math.round(v).toString();
}

async function main() {
  console.log(`Benchmarking ${MODELS.length} models × ${SCENARIOS.length} scenarios…\n`);
  const results: RunResult[] = [];

  for (const modelId of MODELS) {
    for (const scenario of SCENARIOS) {
      process.stdout.write(`  ${getModelOption(modelId).label.padEnd(20)} · ${scenario.slice(0, 32).padEnd(32)} … `);
      const r = await runOne(modelId, scenario);
      results.push(r);
      if (r.ok) {
        console.log(`ok  first ${fmtMs(r.timeToFirstCardMs ?? null)} · total ${fmtMs(r.totalMs ?? null)} · ${r.promptTokens}/${r.completionTokens} tok · ${fmtUsd(r.estCostUsd ?? null)} · ${r.cardCount}/9`);
      } else {
        console.log(`FAIL  ${r.error}`);
      }
    }
  }

  // ── Per-model averages ──
  const summary = MODELS.map((modelId) => {
    const rs = results.filter((r) => r.modelId === modelId && r.ok);
    const opt = getModelOption(modelId);
    return {
      modelId,
      label: opt.label,
      apiModel: opt.model,
      runs: rs.length,
      avgTimeToFirstCardMs: avg(rs.map((r) => r.timeToFirstCardMs)),
      avgTotalMs: avg(rs.map((r) => r.totalMs)),
      avgPromptTokens: avg(rs.map((r) => r.promptTokens)),
      avgCompletionTokens: avg(rs.map((r) => r.completionTokens)),
      avgCostUsd: avg(rs.map((r) => r.estCostUsd ?? undefined)),
      avgCards: avg(rs.map((r) => r.cardCount)),
    };
  });

  // ── Markdown table ──
  let md = `# Model benchmark — measured\n\n`;
  md += `_${SCENARIOS.length} scenarios × ${MODELS.length} models, via the production analysis pipeline._\n\n`;
  md += `| Model | Provider model | Avg in / out tokens | Time-to-first-card | Total latency | $/analysis | $/1k | Cards |\n`;
  md += `|---|---|---|---:|---:|---:|---:|---:|\n`;
  for (const s of summary) {
    const inOut = s.avgPromptTokens != null ? `${fmtNum(s.avgPromptTokens)} / ${fmtNum(s.avgCompletionTokens)}` : "—";
    const perK = s.avgCostUsd != null ? `$${(s.avgCostUsd * 1000).toFixed(2)}` : "—";
    md += `| ${s.label} | \`${s.apiModel}\` | ${inOut} | ${fmtMs(s.avgTimeToFirstCardMs)} | ${fmtMs(s.avgTotalMs)} | ${fmtUsd(s.avgCostUsd)} | ${perK} | ${s.avgCards != null ? s.avgCards.toFixed(1) : "—"}/9 |\n`;
  }
  md += `\n## Per-run detail\n\n`;
  md += `| Model | Scenario | First | Total | In | Out | $/run | Cards | Status |\n`;
  md += `|---|---|---:|---:|---:|---:|---:|---:|---|\n`;
  for (const r of results) {
    md += `| ${r.label} | ${r.scenario.slice(0, 30)} | ${fmtMs(r.timeToFirstCardMs ?? null)} | ${fmtMs(r.totalMs ?? null)} | ${r.promptTokens ?? "—"} | ${r.completionTokens ?? "—"} | ${fmtUsd(r.estCostUsd ?? null)} | ${r.cardCount ?? "—"} | ${r.ok ? "ok" : "FAIL: " + r.error} |\n`;
  }

  const outDir = join(process.cwd(), "scripts");
  writeFileSync(join(outDir, `benchmark-results${OUT_SUFFIX}.json`), JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2));
  writeFileSync(join(outDir, `benchmark-results${OUT_SUFFIX}.md`), md);

  console.log(`\n${md}`);
  console.log(`\nWrote scripts/benchmark-results${OUT_SUFFIX}.json and .md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
