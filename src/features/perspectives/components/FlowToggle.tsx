"use client";

import { cn } from "@/lib/utils";

export type Flow = "perspectives" | "synthesis";

interface Props {
  flow: Flow;
  onChange: (flow: Flow) => void;
  disabled?: boolean;
}

const OPTIONS: { value: Flow; label: string }[] = [
  { value: "perspectives", label: "9 Perspectives" },
  { value: "synthesis", label: "Compare Two Types" },
];

/** Segmented control that switches between Flow 1 (nine cards) and Flow 2 (pair synthesis). */
export function FlowToggle({ flow, onChange, disabled }: Props) {
  return (
    <div className="mx-auto flex w-fit items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1 animate-fade-up">
      {OPTIONS.map((opt) => {
        const active = flow === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50",
              active
                ? "bg-[var(--color-obsidian)] text-white"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
