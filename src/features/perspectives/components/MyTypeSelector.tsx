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
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <Star1 size={15} color="#7c6cf0" variant="Bold" />
        I self-identified with
      </span>
      <select
        value={selfType ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="rounded-lg border border-[var(--color-line)] bg-transparent px-2 py-1 text-sm outline-none focus:border-[var(--color-brand)]"
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
