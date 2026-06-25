"use client";

import type { AnalysisMetrics } from "../hooks/useAnalysisStream";

/** Compact, human-readable summary of one run's measured cost/latency. */
export function MetricsBar({
  metrics,
  firstLabel = "first perspective",
}: {
  metrics: AnalysisMetrics;
  /** What the time-to-first measurement is called (e.g. "first section"). */
  firstLabel?: string;
}) {
  const parts: string[] = [];
  if (metrics.totalMs != null) parts.push(`Streamed in ${(metrics.totalMs / 1000).toFixed(1)}s`);
  if (metrics.timeToFirstMs != null)
    parts.push(`${firstLabel} in ${(metrics.timeToFirstMs / 1000).toFixed(1)}s`);
  if (metrics.usage) parts.push(`${metrics.usage.totalTokens.toLocaleString()} tokens`);
  if (metrics.estCostUsd != null) parts.push(`~$${metrics.estCostUsd.toFixed(4)} est.`);
  if (metrics.cacheSavingsUsd && metrics.cacheSavingsUsd > 0)
    parts.push(`cache saved ~$${metrics.cacheSavingsUsd.toFixed(4)}`);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-ash)]">
      <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 font-medium text-[var(--color-muted)]">
        {metrics.model}
      </span>
      <span>{parts.join(" · ")}</span>
    </div>
  );
}
