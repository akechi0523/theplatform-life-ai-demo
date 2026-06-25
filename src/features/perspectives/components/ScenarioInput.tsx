"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Magicpen } from "iconsax-reactjs";
import { trpc } from "@/lib/trpc/client";
import { DEFAULT_MODEL_ID, MODEL_OPTIONS, type ModelId } from "../data/models";

const EXAMPLES = [
  "Buying a house for the first time with a fiancé",
  "Starting a new business with a close friend",
  "Navigating a difficult conversation with a parent",
  "Deciding whether to accept a major job promotion",
  "Moving to a new city alone for the first time",
  "Ending a long-term relationship",
];

interface Props {
  onAnalyze: (scenario: string, modelId: ModelId) => void;
  disabled?: boolean;
  initialValue?: string;
}

export function ScenarioInput({ onAnalyze, disabled, initialValue = "" }: Props) {
  const [value, setValue] = useState(initialValue);
  const [modelId, setModelId] = useState<ModelId>(DEFAULT_MODEL_ID);

  // Only offer models whose provider has an API key configured server-side.
  // While the query is loading we optimistically show all, then reconcile.
  const providersQuery = trpc.analysis.availableProviders.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const availableModels = useMemo(() => {
    const providers = providersQuery.data;
    if (!providers) return MODEL_OPTIONS;
    return MODEL_OPTIONS.filter((m) => providers.includes(m.provider));
  }, [providersQuery.data]);

  // Snap to a selectable model if the current one isn't available.
  useEffect(() => {
    if (availableModels.length === 0) return;
    if (availableModels.some((m) => m.id === modelId)) return;
    const next = availableModels.find((m) => m.id === DEFAULT_MODEL_ID) ?? availableModels[0];
    setModelId(next.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels, modelId]);

  const noModels = providersQuery.isSuccess && availableModels.length === 0;

  function submit(scenario: string) {
    const trimmed = scenario.trim();
    if (trimmed.length < 5 || noModels) return;
    onAnalyze(trimmed, modelId);
  }

  return (
    <div className="mx-auto w-full max-w-2xl text-center animate-fade-up">
      <h1 className="font-serif text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
        ThePlatform<span className="text-[var(--color-ash)]">.life</span> AI
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[var(--color-muted)]">
        Describe a real-life scenario or decision. Our AI ThePlatform.life will reveal how each of
        the 9 perspectives within the 360° of Perspectives would perceive, feel, and respond —
        including their stress and security responses.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="mt-10"
      >
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 transition focus-within:border-[var(--color-graphite)]">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={disabled}
            placeholder="Describe a real-life scenario or decision."
            className="w-full resize-none bg-transparent p-3 text-sm outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-muted)]">{value.length}/500</span>
              {noModels ? (
                <span className="text-xs text-[var(--color-danger,#dc2626)]">
                  No analysis models configured
                </span>
              ) : (
                <label className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                  <span className="hidden sm:inline">Model</span>
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value as ModelId)}
                    disabled={disabled || availableModels.length <= 1}
                    aria-label="Analysis model"
                    className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand)] disabled:opacity-50"
                  >
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id} title={m.description}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <button
              type="submit"
              disabled={disabled || value.trim().length < 5 || noModels}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
            >
              <Magicpen size={16} color="#ffffff" variant="Bold" />
              Analyze Scenario
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
