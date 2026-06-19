"use client";

import { Star1 } from "iconsax-reactjs";
import type { PerspectiveTypeAnalysis } from "../data/schema";
import { getTriadForType } from "../data/types";
import { cn } from "@/lib/utils";

interface Props {
  type: PerspectiveTypeAnalysis;
  isSelf: boolean;
  onClick: () => void;
}

export function PerspectiveCard({ type, isSelf, onClick }: Props) {
  const triad = getTriadForType(type.typeNumber);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-[var(--radius-card)] border border-l-4 bg-[var(--color-surface)] p-4 text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:shadow-md",
        triad.classes.cardAccent,
        isSelf && "ring-self",
      )}
    >
      {isSelf && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-brand)]">
          <Star1 size={11} color="#7c6cf0" variant="Bold" /> My Type
        </span>
      )}

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
            triad.classes.badge,
          )}
        >
          {type.typeNumber}
        </span>
        <h3 className="font-serif text-base font-semibold leading-tight">{type.typeName}</h3>
      </div>

      <p className="mt-2 line-clamp-3 text-sm text-[var(--color-muted)]">{type.summary}</p>

      <span className="mt-3 inline-block text-xs font-medium text-[var(--color-brand)] opacity-0 transition group-hover:opacity-100">
        View perspective →
      </span>
    </button>
  );
}
