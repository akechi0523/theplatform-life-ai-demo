"use client";

import { useEffect, useState } from "react";

// Phrased as the four real stages of the analysis, so the rotating line reads
// like genuine progress rather than filler.
const PHASES = [
  "Framing your scenario through nine worldviews",
  "Mapping how each type perceives and feels",
  "Tracing stress and security shifts",
  "Composing each perspective",
];

// The skeleton previews the real Heart / Head / Gut triad columns, so the
// layout doesn't jump when the first cards land.
const TRIAD_COLUMNS = [
  { label: "Heart", color: "var(--color-heart)" },
  { label: "Head", color: "var(--color-head)" },
  { label: "Gut", color: "var(--color-gut)" },
];

/** Spinner + live phase text + a shimmer triad skeleton while the first card streams. */
export function LoadingState() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPhase((i) => (i + 1) % PHASES.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="animate-fade-up">
      {/* ── Hero: spinning triad ring + live status ─────────────────────────── */}
      <div className="mb-9 flex flex-col items-center text-center">
        <div className="relative mb-5 h-14 w-14" role="status" aria-label="Analyzing">
          <div className="triad-spinner h-full w-full" />
          {/* A soft core gives the ring some depth. */}
          <span className="absolute inset-0 m-auto h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[var(--color-graphite)]" />
        </div>

        <h2 className="font-serif text-xl font-semibold text-[var(--color-ink)]">
          Analyzing your scenario
        </h2>

        {/* Keyed so the line re-mounts and fades in on every phase change. */}
        <p key={phase} className="animate-fade-up mt-1.5 min-h-5 text-sm text-[var(--color-muted)]">
          {PHASES[phase]}…
        </p>

        {/* Step progress: past + current filled, current widened. */}
        <div className="mt-4 flex items-center gap-1.5" aria-hidden>
          {PHASES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{
                width: i === phase ? "1.25rem" : "0.375rem",
                backgroundColor: i <= phase ? "var(--color-graphite)" : "var(--color-line)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Skeleton triad grid — mirrors the final layout ──────────────────── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {TRIAD_COLUMNS.map((col, ci) => (
          <div
            key={col.label}
            className="space-y-3 rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-4"
          >
            <div className="flex items-center gap-2 px-1.5 pt-0.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ash)]">
                {col.label}
              </span>
            </div>
            {[0, 1, 2].map((row) => {
              // Ripple the shimmer across the grid so the sweep feels directional.
              const delay = `${(ci * 3 + row) * 110}ms`;
              return (
                <div
                  key={row}
                  className="rounded-[var(--radius-compact)] bg-[var(--color-surface)] p-5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="skeleton-shimmer h-8 w-8 rounded-xl"
                      style={{ animationDelay: delay }}
                    />
                    <div
                      className="skeleton-shimmer h-4 w-24 rounded"
                      style={{ animationDelay: delay }}
                    />
                  </div>
                  <div className="space-y-2">
                    <div
                      className="skeleton-shimmer h-3 w-full rounded"
                      style={{ animationDelay: delay }}
                    />
                    <div
                      className="skeleton-shimmer h-3 w-5/6 rounded"
                      style={{ animationDelay: delay }}
                    />
                    <div
                      className="skeleton-shimmer h-3 w-4/6 rounded"
                      style={{ animationDelay: delay }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
