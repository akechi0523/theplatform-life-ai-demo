"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Magicpen } from "iconsax-reactjs";
import { trpc } from "@/lib/trpc/client";
import { SAMPLE_SCENARIO } from "../data/mockData";
import { DEFAULT_MODEL_ID, MODEL_OPTIONS, type ModelId } from "../data/models";

const EXAMPLES = [
  SAMPLE_SCENARIO,
  "Deciding whether to leave a stable job to start my own business",
  "Confronting a close friend who keeps cancelling plans",
  "Moving across the country for a partner's career",
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

  // If the current selection isn't among the available models, snap to a valid one.
  useEffect(() => {
    if (availableModels.length === 0) return;
    if (!availableModels.some((m) => m.id === modelId)) {
      const preferred = availableModels.find((m) => m.id === DEFAULT_MODEL_ID);
      setModelId((preferred ?? availableModels[0]).id);
    }
  }, [availableModels, modelId]);

  const noModels = providersQuery.isSuccess && availableModels.length === 0;

  function submit(scenario: string) {
    const trimmed = scenario.trim();
    if (trimmed.length < 5 || noModels) return;
    onAnalyze(trimmed, modelId);
  }

  return (
    <div className="mx-auto w-full max-w-2xl text-center animate-fade-up">
      <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">
        ThePlatform.life AI
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-[var(--color-muted)]">
        Describe a real-life scenario or decision. Our AI ThePlatform.life will reveal how each of
        the 9 perspectives within the 360° of Perspectives would perceive, feel, and respond —
        including their stress and security responses.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="mt-8"
      >
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-sm focus-within:border-[var(--color-brand)]">
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
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Magicpen size={16} color="#ffffff" variant="Bold" />
              Analyze Scenario
              <ArrowRight size={16} color="#ffffff" variant="Linear" />
            </button>
          </div>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={disabled}
            onClick={() => {
              setValue(ex);
              submit(ex);
            }}
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
