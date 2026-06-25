"use client";

import { Star1, TickCircle } from "iconsax-reactjs";
import type { PerspectiveTypeAnalysis } from "../data/schema";
import { getTriadForType } from "../data/types";
import { cn } from "@/lib/utils";

interface Props {
  type: PerspectiveTypeAnalysis;
  isSelf: boolean;
  onClick: () => void;
  /** True while the grid is in "compare two types" multi-select mode. */
  selecting?: boolean;
  /** True when this card is one of the picked two. */
  selected?: boolean;
}

export function PerspectiveCard({ type, isSelf, onClick, selecting = false, selected = false }: Props) {
  const triad = getTriadForType(type.typeNumber);

  return (
    <button
      onClick={onClick}
      aria-pressed={selecting ? selected : undefined}
      className={cn(
        "group animate-card-in relative w-full rounded-[var(--radius-compact)] bg-[var(--color-surface)] p-5 text-left transition duration-200",
        "hover:-translate-y-0.5",
        isSelf && !selecting && "ring-self",
        selected && "ring-self",
        selecting && !selected && "opacity-70 hover:opacity-100",
      )}
    >
      {selecting && selected && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-xl bg-[var(--color-obsidian)] px-2 py-0.5 text-[10px] font-semibold text-white">
          <TickCircle size={11} color="#ffffff" variant="Bold" /> Selected
        </span>
      )}

      {isSelf && !selecting && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-xl bg-[var(--color-obsidian)] px-2 py-0.5 text-[10px] font-semibold text-white">
          <Star1 size={11} color="#ffffff" variant="Bold" /> My Type
        </span>
      )}

      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold",
            triad.classes.badge,
          )}
        >
          {type.typeNumber}
        </span>
        <h3 className="font-serif text-base font-semibold leading-tight">{type.typeName}</h3>
      </div>

      {type.summary ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--color-muted)]">
          {type.summary}
        </p>
      ) : (
        <div className="mt-3 space-y-2" aria-label="Composing…">
          <div className="h-3 w-full animate-pulse-soft rounded bg-[var(--color-line)]" />
          <div className="h-3 w-4/5 animate-pulse-soft rounded bg-[var(--color-line)]" />
        </div>
      )}

      <span className="mt-3 inline-block text-xs font-semibold text-[var(--color-ink)] opacity-0 transition group-hover:opacity-100">
        View perspective →
      </span>
    </button>
  );
}
