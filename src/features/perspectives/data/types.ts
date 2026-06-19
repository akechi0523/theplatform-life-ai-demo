// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the 360° of Perspectives — the 9 perspective types.
//
// Terminology rules (per the product brief):
//   • The word "Enneagram" appears NOWHERE — this is the "360° of Perspectives".
//   • Stress = the "shift" path (never "disintegration").
//   • Security = the "shift" path (never "integration").
//   • Describe states as "aware" / "unaware" (never "healthy" / "unhealthy").
//   • Always say "type" (never "Enneagram type").
// ─────────────────────────────────────────────────────────────────────────────

export type TriadKey = "heart" | "head" | "gut";

export interface TriadMeta {
  key: TriadKey;
  /** Column header label, e.g. "Heart Center" */
  label: string;
  /** Short description under the header */
  description: string;
  /** Ordered type numbers shown in this column (and PDF page) */
  typeNumbers: number[];
  /** Tailwind utility classes built on the CSS theme tokens */
  classes: {
    column: string;
    header: string;
    badge: string;
    cardAccent: string;
    chip: string;
  };
}

export interface PerspectiveTypeMeta {
  number: number;
  /** Display name, e.g. "Giver" */
  name: string;
  triad: TriadKey;
  /** Short trait list, e.g. "Generous · Demonstrative · People-Pleasing" */
  traits: string;
  /** The type number this type shifts TO under stress */
  stressShiftTo: number;
  /** The type number this type shifts TO in security */
  securityShiftTo: number;
}

/**
 * Canonical metadata for all 9 types.
 * Stress / security shift targets follow the standard movement lines —
 * including the type-4 and type-7 corrections called out in the brief:
 *   Type 4 stress → 2, security → 1   |   Type 7 stress → 1, security → 5
 */
export const PERSPECTIVE_TYPES: Record<number, PerspectiveTypeMeta> = {
  1: { number: 1, name: "Perfectionist", triad: "gut", traits: "Principled · Purposeful · Self-Controlled", stressShiftTo: 4, securityShiftTo: 7 },
  2: { number: 2, name: "Giver", triad: "heart", traits: "Generous · Demonstrative · People-Pleasing", stressShiftTo: 8, securityShiftTo: 4 },
  3: { number: 3, name: "Performer", triad: "heart", traits: "Adaptable · Excelling · Driven", stressShiftTo: 9, securityShiftTo: 6 },
  4: { number: 4, name: "Romantic", triad: "heart", traits: "Expressive · Dramatic · Self-Aware", stressShiftTo: 2, securityShiftTo: 1 },
  5: { number: 5, name: "Observer", triad: "head", traits: "Perceptive · Innovative · Secretive", stressShiftTo: 7, securityShiftTo: 8 },
  6: { number: 6, name: "Loyal Skeptic / Questioner", triad: "head", traits: "Engaging · Responsible · Vigilant", stressShiftTo: 3, securityShiftTo: 9 },
  7: { number: 7, name: "Epicure / Optimist", triad: "head", traits: "Spontaneous · Versatile · Acquisitive", stressShiftTo: 1, securityShiftTo: 5 },
  8: { number: 8, name: "Boss / Protector / Leader", triad: "gut", traits: "Self-Confident · Decisive · Willful", stressShiftTo: 5, securityShiftTo: 2 },
  9: { number: 9, name: "Mediator", triad: "gut", traits: "Receptive · Reassuring · Harmonizing", stressShiftTo: 6, securityShiftTo: 3 },
};

/**
 * The three centers, in display order: Heart, Head, Gut.
 * Column order and PDF page order both follow these typeNumbers:
 *   Heart → 2, 3, 4   |   Head → 5, 6, 7   |   Gut → 8, 9, 1
 */
export const TRIADS: TriadMeta[] = [
  {
    key: "heart",
    label: "Heart Center",
    description: "Emotion-driven · Types 2, 3, 4",
    typeNumbers: [2, 3, 4],
    classes: {
      column: "bg-[var(--color-surface-muted)]",
      header: "text-[var(--color-heart)]",
      badge: "bg-[var(--color-heart-soft)] text-[var(--color-heart)]",
      cardAccent: "group-hover:bg-[var(--color-heart)]",
      chip: "bg-[var(--color-heart-soft)] text-[var(--color-heart)]",
    },
  },
  {
    key: "head",
    label: "Head Center",
    description: "Fear-driven · Types 5, 6, 7",
    typeNumbers: [5, 6, 7],
    classes: {
      column: "bg-[var(--color-surface-muted)]",
      header: "text-[var(--color-head)]",
      badge: "bg-[var(--color-head-soft)] text-[var(--color-head)]",
      cardAccent: "group-hover:bg-[var(--color-head)]",
      chip: "bg-[var(--color-head-soft)] text-[var(--color-head)]",
    },
  },
  {
    key: "gut",
    label: "Gut Center",
    description: "Instinct-driven · Types 8, 9, 1",
    typeNumbers: [8, 9, 1],
    classes: {
      column: "bg-[var(--color-surface-muted)]",
      header: "text-[var(--color-gut)]",
      badge: "bg-[var(--color-gut-soft)] text-[var(--color-gut)]",
      cardAccent: "group-hover:bg-[var(--color-gut)]",
      chip: "bg-[var(--color-gut-soft)] text-[var(--color-gut)]",
    },
  },
];

/** Flat list of type numbers in the canonical Heart→Head→Gut order (used by the PDF + grid). */
export const ORDERED_TYPE_NUMBERS: number[] = TRIADS.flatMap((t) => t.typeNumbers);

/** PDF pages: 3 types per page, in triad order. */
export const PDF_PAGES: number[][] = TRIADS.map((t) => t.typeNumbers);

export function getTriad(triadKey: TriadKey): TriadMeta {
  return TRIADS.find((t) => t.key === triadKey)!;
}

export function getTriadForType(typeNumber: number): TriadMeta {
  return getTriad(PERSPECTIVE_TYPES[typeNumber].triad);
}

/** Human-readable shift path strings (no "disintegrate"/"integrate" wording). */
export function stressPathLabel(typeNumber: number): string {
  return `Type ${typeNumber} shifts toward Type ${PERSPECTIVE_TYPES[typeNumber].stressShiftTo} under stress`;
}

export function securityPathLabel(typeNumber: number): string {
  return `Type ${typeNumber} shifts toward Type ${PERSPECTIVE_TYPES[typeNumber].securityShiftTo} in security`;
}

/** Tagline used on cards/detail, e.g. "Gut Type · Principled, Purposeful, Self-Controlled". */
export function taglineFor(typeNumber: number): string {
  const meta = PERSPECTIVE_TYPES[typeNumber];
  const center = meta.triad.charAt(0).toUpperCase() + meta.triad.slice(1);
  return `${center} Type · ${meta.traits.replaceAll(" · ", ", ")}`;
}
