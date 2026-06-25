"use client";

import type { PerspectiveTypeAnalysis } from "../data/schema";
import { TRIADS } from "../data/types";
import { PerspectiveCard } from "./PerspectiveCard";

interface Props {
  types: PerspectiveTypeAnalysis[];
  selfType: number | null;
  onSelect: (typeNumber: number) => void;
  /** When set, cards render in multi-select mode (Flow 2 "compare two types"). */
  selectable?: { selected: number[] };
}

/**
 * Three columns grouped by center: Heart (2,3,4), Head (5,6,7), Gut (8,9,1).
 * Column accent colors: Heart=yellow, Head=green, Gut=red.
 */
export function PerspectiveGrid({ types, selfType, onSelect, selectable }: Props) {
  const byNumber = new Map(types.map((t) => [t.typeNumber, t]));

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {TRIADS.map((triad) => (
        <section
          key={triad.key}
          className={`rounded-[var(--radius-card)] p-4 ${triad.classes.column}`}
        >
          <header className="mb-4 px-2">
            <h2 className={`font-serif text-xl font-semibold ${triad.classes.header}`}>
              {triad.label}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-[var(--color-muted)]">
              {triad.description}
            </p>
          </header>

          <div className="space-y-3">
            {triad.typeNumbers.map((n) => {
              const type = byNumber.get(n);
              if (!type) return null;
              return (
                <PerspectiveCard
                  key={n}
                  type={type}
                  isSelf={selfType === n}
                  onClick={() => onSelect(n)}
                  selecting={!!selectable}
                  selected={selectable?.selected.includes(n) ?? false}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
