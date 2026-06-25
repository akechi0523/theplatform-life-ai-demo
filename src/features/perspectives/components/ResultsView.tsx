"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, DocumentDownload, Link21, Magicpen } from "iconsax-reactjs";
import { toast } from "sonner";
import type { AnalysisResult } from "../data/schema";
import type { AnalysisMetrics } from "../hooks/useAnalysisStream";
import { buildShareUrl } from "@/lib/share";
import { downloadAnalysisPdf } from "@/lib/pdf";
import { DetailPanel } from "./DetailPanel";
import { MetricsBar } from "./MetricsBar";
import { MyTypeSelector } from "./MyTypeSelector";
import { PerspectiveGrid } from "./PerspectiveGrid";

interface Props {
  result: AnalysisResult;
  selfType: number | null;
  onSelfTypeChange: (typeNumber: number | null) => void;
  onReset: () => void;
  /** True while perspectives are still streaming in. */
  streaming?: boolean;
  /** How many of the 9 perspectives have arrived (for the live progress pill). */
  streamedCount?: number;
  /** Per-run measurement, shown once the analysis completes. */
  metrics?: AnalysisMetrics | null;
  /**
   * Flow 2 entry point from the results grid: when provided, a "Compare two
   * types" affordance lets the user pick two cards and request a combined
   * synthesis. The handler decides premium gating (run vs. open upgrade modal).
   */
  onSynthesize?: (types: [number, number]) => void;
}

export function ResultsView({
  result,
  selfType,
  onSelfTypeChange,
  onReset,
  streaming = false,
  streamedCount = 0,
  metrics = null,
  onSynthesize,
}: Props) {
  // Track the selected type by NUMBER, not a snapshot, so the open panel always
  // reflects the latest streamed data (prose filling in after the face).
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  // Flow 2 "compare two" mode: when active, clicking cards toggles a selection
  // of up to two types instead of opening the detail panel.
  const [compareMode, setCompareMode] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);

  function togglePicked(n: number) {
    setPicked((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (prev.length >= 2) return [prev[1], n]; // keep the most recent two
      return [...prev, n];
    });
  }

  function exitCompare() {
    setCompareMode(false);
    setPicked([]);
  }

  const byNumber = new Map(result.types.map((t) => [t.typeNumber, t]));
  const selected = selectedNumber != null ? (byNumber.get(selectedNumber) ?? null) : null;

  // Auto-open the self-identified type's panel once per analysis, as soon as
  // that card appears — not on every streaming update (which would re-pop it).
  const autoOpenedFor = useRef<string | null>(null);
  useEffect(() => {
    if (autoOpenedFor.current !== result.scenario) autoOpenedFor.current = null;
    if (!selfType || autoOpenedFor.current === result.scenario) return;
    if (byNumber.has(selfType)) {
      setSelectedNumber(selfType);
      autoOpenedFor.current = result.scenario;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, selfType]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(buildShareUrl(result.scenario));
      toast.success("Share link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
        >
          <ArrowLeft size={16} color="#6f6962" variant="Linear" /> New scenario
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {streaming ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
              <span className="h-2 w-2 animate-pulse-soft rounded-full bg-[var(--color-brand,#3f3f46)]" />
              Revealing perspectives… {streamedCount}/9
            </span>
          ) : compareMode ? (
            <>
              <span className="inline-flex items-center rounded-full bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
                {picked.length < 2 ? `Pick two types — ${picked.length}/2` : "Two types selected"}
              </span>
              <button
                onClick={() => picked.length === 2 && onSynthesize?.([picked[0], picked[1]])}
                disabled={picked.length !== 2}
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold disabled:opacity-45"
              >
                <Magicpen size={16} color="#ffffff" variant="Bold" /> Generate synthesis
              </button>
              <button
                onClick={exitCompare}
                className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {onSynthesize && (
                <button
                  onClick={() => setCompareMode(true)}
                  className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
                >
                  <Magicpen size={16} color="#3f3f46" variant="Linear" /> Compare two types
                </button>
              )}
              <button
                onClick={copyLink}
                className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
              >
                <Link21 size={16} color="#3f3f46" variant="Linear" /> Copy link
              </button>
              <button
                onClick={() => downloadAnalysisPdf(result)}
                className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
              >
                <DocumentDownload size={16} color="#3f3f46" variant="Linear" /> Download PDF
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-5 rounded-[var(--radius-compact)] bg-[var(--color-surface)] p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ash)]">
          Scenario
        </p>
        <p className="mt-1.5 font-serif text-xl font-semibold">{result.scenario}</p>
        {metrics && <MetricsBar metrics={metrics} />}
      </div>

      <div className="mb-5">
        <MyTypeSelector selfType={selfType} onChange={onSelfTypeChange} />
      </div>

      <PerspectiveGrid
        types={result.types}
        selfType={selfType}
        onSelect={(n) => (compareMode ? togglePicked(n) : setSelectedNumber(n))}
        selectable={compareMode ? { selected: picked } : undefined}
      />

      <DetailPanel type={compareMode ? null : selected} onClose={() => setSelectedNumber(null)} />
    </div>
  );
}
