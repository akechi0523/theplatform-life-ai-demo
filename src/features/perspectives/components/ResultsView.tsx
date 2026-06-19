"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, DocumentDownload, Link21 } from "iconsax-reactjs";
import { toast } from "sonner";
import type { AnalysisResult, PerspectiveTypeAnalysis } from "../data/schema";
import { buildShareUrl } from "@/lib/share";
import { downloadAnalysisPdf } from "@/lib/pdf";
import { DetailPanel } from "./DetailPanel";
import { MyTypeSelector } from "./MyTypeSelector";
import { PerspectiveGrid } from "./PerspectiveGrid";

interface Props {
  result: AnalysisResult;
  selfType: number | null;
  onSelfTypeChange: (typeNumber: number | null) => void;
  onReset: () => void;
}

export function ResultsView({ result, selfType, onSelfTypeChange, onReset }: Props) {
  const [selected, setSelected] = useState<PerspectiveTypeAnalysis | null>(null);

  const byNumber = new Map(result.types.map((t) => [t.typeNumber, t]));

  // Auto-open the self-identified type's panel whenever new results load.
  useEffect(() => {
    if (selfType && byNumber.has(selfType)) {
      setSelected(byNumber.get(selfType)!);
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
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm font-medium transition hover:border-[var(--color-brand)]"
          >
            <Link21 size={16} color="#7c6cf0" variant="Linear" /> Copy link
          </button>
          <button
            onClick={() => downloadAnalysisPdf(result)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm font-medium transition hover:border-[var(--color-brand)]"
          >
            <DocumentDownload size={16} color="#7c6cf0" variant="Linear" /> Download PDF
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Scenario
        </p>
        <p className="mt-1 font-serif text-lg">{result.scenario}</p>
      </div>

      <div className="mb-5">
        <MyTypeSelector selfType={selfType} onChange={onSelfTypeChange} />
      </div>

      <PerspectiveGrid
        types={result.types}
        selfType={selfType}
        onSelect={(n) => setSelected(byNumber.get(n) ?? null)}
      />

      <DetailPanel type={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
