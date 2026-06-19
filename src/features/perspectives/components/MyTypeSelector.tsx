"use client";

import { Star1 } from "iconsax-reactjs";
import { PERSPECTIVE_TYPES, ORDERED_TYPE_NUMBERS } from "../data/types";
import { cn } from "@/lib/utils";

interface Props {
  selfType: number | null;
  onChange: (typeNumber: number | null) => void;
}

/** Persistent "I self-identified with Type ___" selector. */
export function MyTypeSelector({ selfType, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--radius-compact)] bg-[var(--color-surface)] px-5 py-3.5">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <Star1 size={15} color="#18181b" variant="Bold" />
        I self-identified with
      </span>
      <select
        value={selfType ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="rounded-xl border border-[var(--color-line)] bg-transparent px-3 py-1.5 text-sm outline-none transition focus:border-[var(--color-graphite)]"
      >
        <option value="">— select your type —</option>
        {ORDERED_TYPE_NUMBERS.map((n) => (
          <option key={n} value={n}>
            Type {n} · {PERSPECTIVE_TYPES[n].name}
          </option>
        ))}
      </select>
      {selfType && (
        <button
          onClick={() => onChange(null)}
          className={cn("text-xs text-[var(--color-muted)] underline hover:text-[var(--color-ink)]")}
        >
          clear
        </button>
      )}
    </div>
  );
}
