"use client";

import { ArrowLeft, Eye, Flash, Heart, Link21, Magicpen, Send2 } from "iconsax-reactjs";
import { toast } from "sonner";
import type { SynthesisSections } from "../data/schema";
import type { AnalysisMetrics } from "../hooks/useAnalysisStream";
import {
  PERSPECTIVE_TYPES,
  getTriadForType,
  securityPathLabel,
  stressPathLabel,
  taglineFor,
} from "../data/types";
import { buildShareUrl } from "@/lib/share";
import { cn } from "@/lib/utils";
import { MetricsBar } from "./MetricsBar";

interface Props {
  scenario: string;
  types: [number, number];
  sections: Partial<SynthesisSections>;
  streaming?: boolean;
  metrics?: AnalysisMetrics | null;
  onReset: () => void;
}

export function SynthesisView({ scenario, types, sections, streaming = false, metrics = null, onReset }: Props) {
  const [a, b] = types;
  const sameType = a === b;
  // Path chips: for a same-type pair both shift identically, so show one set.
  const stressChips = sameType ? [stressPathLabel(a)] : [stressPathLabel(a), stressPathLabel(b)];
  const securityChips = sameType ? [securityPathLabel(a)] : [securityPathLabel(a), securityPathLabel(b)];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(buildShareUrl(scenario));
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
              Composing synthesis…
            </span>
          ) : (
            <button
              onClick={copyLink}
              className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
            >
              <Link21 size={16} color="#3f3f46" variant="Linear" /> Copy link
            </button>
          )}
        </div>
      </div>

      {/* Scenario + the two types being compared */}
      <div className="mb-5 rounded-[var(--radius-compact)] bg-[var(--color-surface)] p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ash)]">
          Scenario
        </p>
        <p className="mt-1.5 font-serif text-xl font-semibold">{scenario}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(sameType ? [a] : [a, b]).map((n) => (
            <span
              key={n}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-line)] px-3 py-1.5"
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold",
                  getTriadForType(n).classes.badge,
                )}
              >
                {n}
              </span>
              <span className="text-left">
                <span className="block font-serif text-sm font-semibold leading-tight">
                  {PERSPECTIVE_TYPES[n].name}
                </span>
                <span className="block text-[10px] text-[var(--color-muted)]">{taglineFor(n)}</span>
              </span>
            </span>
          ))}
          {sameType && (
            <span className="text-xs text-[var(--color-muted)]">two people who both lead with Type {a}</span>
          )}
        </div>
        {metrics && <MetricsBar metrics={metrics} firstLabel="first section" />}
      </div>

      {/* The flowing synthesis */}
      <article className="space-y-8 rounded-[var(--radius-card)] bg-[var(--color-surface)] p-6 md:p-8">
        <TitleBlock title={sections.title} />
        <Section
          icon={<Heart size={18} color="#7c6cf0" variant="Bold" />}
          title="In the shared scenario"
          body={sections.inScenario}
        />
        <Section
          icon={<Flash size={18} color="#dc2626" variant="Bold" />}
          title="Under pressure — when unaware"
          chips={stressChips}
          chipClass="bg-[var(--color-gut-soft)] text-[var(--color-gut)]"
          body={sections.underPressure}
        />
        <Section
          icon={<Eye size={18} color="#16a34a" variant="Bold" />}
          title="In security — when aware"
          chips={securityChips}
          chipClass="bg-[var(--color-head-soft)] text-[var(--color-head)]"
          body={sections.inSecurity}
        />
        <Section
          icon={<Send2 size={18} color="#3f3f46" variant="Bold" />}
          title="The shared invitation"
          body={sections.sharedInvitation}
        />
      </article>
    </div>
  );
}

function TitleBlock({ title }: { title?: string }) {
  if (!title) {
    return (
      <div className="flex items-center gap-2 text-[var(--color-muted)]">
        <Magicpen size={20} color="#a39b90" variant="Bold" />
        <div className="h-6 w-2/3 animate-pulse-soft rounded bg-[var(--color-line)]" />
      </div>
    );
  }
  return (
    <h1 className="flex items-start gap-2.5 font-serif text-3xl font-bold leading-tight tracking-tight">
      <Magicpen size={24} color="#3f3f46" variant="Bold" className="mt-1 shrink-0" />
      {title}
    </h1>
  );
}

function Section({
  icon,
  title,
  body,
  chips,
  chipClass,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
  chips?: string[];
  chipClass?: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h2 className="font-serif text-xl font-semibold">{title}</h2>
      </div>
      {chips && chips.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className={cn("inline-block rounded-xl px-2.5 py-1 text-xs font-medium", chipClass)}
            >
              {c}
            </span>
          ))}
        </div>
      )}
      {body ? (
        <div className="space-y-3 text-[15px] leading-relaxed text-[var(--color-ink)]/90">
          {body.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      ) : (
        <div className="space-y-2" aria-label="Composing…">
          <div className="h-3 w-full animate-pulse-soft rounded bg-[var(--color-line)]" />
          <div className="h-3 w-11/12 animate-pulse-soft rounded bg-[var(--color-line)]" />
          <div className="h-3 w-4/5 animate-pulse-soft rounded bg-[var(--color-line)]" />
        </div>
      )}
    </section>
  );
}
