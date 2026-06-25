"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Magicpen } from "iconsax-reactjs";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MODEL_ID,
  MODEL_OPTIONS,
  type ModelId,
  type ModelOption,
} from "../data/models";
import { PERSPECTIVE_TYPES, TRIADS, getTriadForType, taglineFor } from "../data/types";

const EXAMPLES = [
  "Buying a house for the first time with a fiancé",
  "Starting a new business with a close friend",
  "Co-parenting after a separation",
  "Deciding whether to merge two teams at work",
];

interface Props {
  onSynthesize: (scenario: string, types: [number, number], modelId: ModelId) => void;
  disabled?: boolean;
  /** Flow 2 is premium-only; free users see a locked CTA that opens the upgrade modal. */
  isPremium?: boolean;
  /** Called when a non-premium user tries to run — opens the upgrade modal. */
  onLocked?: () => void;
}

export function SynthesisInput({ onSynthesize, disabled, isPremium = false, onLocked }: Props) {
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [modelId, setModelId] = useState<ModelId>(DEFAULT_MODEL_ID);

  const providersQuery = trpc.analysis.availableProviders.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const availableModels = useMemo(() => {
    const providers = providersQuery.data;
    if (!providers) return MODEL_OPTIONS;
    return MODEL_OPTIONS.filter((m) => providers.includes(m.provider));
  }, [providersQuery.data]);

  // Premium users pick any available model; everything is premium-tier here, so
  // snap to the default (or first available) when the current one disappears.
  useEffect(() => {
    if (availableModels.length === 0) return;
    if (availableModels.some((m) => m.id === modelId)) return;
    const next = availableModels.find((m) => m.id === DEFAULT_MODEL_ID) ?? availableModels[0];
    setModelId(next.id);
  }, [availableModels, modelId]);

  const noModels = providersQuery.isSuccess && availableModels.length === 0;
  const isLocked = (m: ModelOption) => !isPremium && m.tier === "premium";

  function togglePicked(n: number) {
    setPicked((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (prev.length >= 2) return [prev[1], n];
      return [...prev, n];
    });
  }

  const ready = value.trim().length >= 5 && picked.length === 2 && !noModels;

  function submit() {
    if (!ready) return;
    if (!isPremium) {
      onLocked?.();
      return;
    }
    onSynthesize(value.trim(), [picked[0], picked[1]], modelId);
  }

  return (
    <div className="mx-auto w-full max-w-2xl text-center animate-fade-up">
      <h1 className="font-serif text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
        Compare two perspectives
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--color-muted)]">
        Pick any two of the nine types and describe a shared scenario. ThePlatform.life AI weaves
        them into a single combined synthesis — how they meet, clash, and grow together, through
        stress and security.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-8"
      >
        {/* Two-type picker */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-left">
          <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ash)]">
            Choose two types {picked.length > 0 && `· ${picked.length}/2`}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TRIADS.map((triad) => (
              <div key={triad.key} className="space-y-2">
                <p className={cn("px-1 text-[11px] font-semibold", triad.classes.header)}>
                  {triad.label}
                </p>
                {triad.typeNumbers.map((n) => {
                  const meta = PERSPECTIVE_TYPES[n];
                  const selected = picked.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={disabled}
                      aria-pressed={selected}
                      onClick={() => togglePicked(n)}
                      title={taglineFor(n)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition",
                        selected
                          ? "border-[var(--color-obsidian)] ring-self"
                          : "border-[var(--color-line)] hover:border-[var(--color-graphite)]",
                        "disabled:opacity-50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                          getTriadForType(n).classes.badge,
                        )}
                      >
                        {n}
                      </span>
                      <span className="font-serif font-semibold leading-tight">{meta.name}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Scenario + model + submit */}
        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 transition focus-within:border-[var(--color-graphite)]">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={disabled}
            placeholder="Describe the shared scenario both types are facing."
            className="w-full resize-none bg-transparent p-3 text-sm outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-muted)]">{value.length}/500</span>
              {noModels ? (
                <span className="text-xs text-[var(--color-danger,#dc2626)]">No models configured</span>
              ) : (
                <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                  <span className="hidden sm:inline">Model</span>
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value as ModelId)}
                    disabled={disabled || availableModels.length <= 1}
                    aria-label="Synthesis model"
                    className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand)] disabled:opacity-50"
                  >
                    {availableModels.map((m) => {
                      const locked = isLocked(m);
                      return (
                        <option key={m.id} value={m.id} disabled={locked} title={m.description}>
                          {locked ? `🔒 ${m.label} (Premium)` : m.label}
                        </option>
                      );
                    })}
                  </select>
                </label>
              )}
            </div>
            <button
              type="submit"
              disabled={disabled || !ready}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
            >
              <Magicpen size={16} color="#ffffff" variant="Bold" />
              {isPremium ? "Generate synthesis" : "Unlock with Premium"}
              <ArrowRight size={16} color="#ffffff" variant="Linear" />
            </button>
          </div>
        </div>
      </form>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={disabled}
            onClick={() => setValue(ex)}
            className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition hover:border-[var(--color-graphite)] hover:text-[var(--color-ink)] disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
