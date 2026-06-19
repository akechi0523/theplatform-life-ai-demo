"use client";

import { useEffect } from "react";
import { CloseCircle, Eye, Flash, Heart } from "iconsax-reactjs";
import type { PerspectiveTypeAnalysis } from "../data/schema";
import { getTriadForType } from "../data/types";
import { cn } from "@/lib/utils";

interface Props {
  type: PerspectiveTypeAnalysis | null;
  onClose: () => void;
}

/** Slide-in panel with the three styled sections: Outlook · Stress · Security. */
export function DetailPanel({ type, onClose }: Props) {
  // Close on Escape.
  useEffect(() => {
    if (!type) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [type, onClose]);

  const triad = type ? getTriadForType(type.typeNumber) : null;

  // Don't render the panel (or its off-canvas backdrop) unless a type is selected.
  // Keeping it mounted and translated off-screen caused horizontal overflow.
  if (!type || !triad) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 transition-opacity"
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col rounded-l-[var(--radius-card)] bg-[var(--color-surface)] shadow-2xl">
        <header className="flex items-start justify-between border-b border-[var(--color-line)] p-6">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold",
                    triad.classes.badge,
                  )}
                >
                  {type.typeNumber}
                </span>
                <div>
                  <h2 className="font-serif text-2xl font-semibold leading-tight">
                    {type.typeName}
                  </h2>
                  <p className="text-xs text-[var(--color-muted)]">{type.tagline}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1 text-[var(--color-muted)] transition hover:bg-[var(--color-line)]"
              >
                <CloseCircle size={26} color="#6f6962" variant="Linear" />
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <Section
                icon={<Heart size={18} color="#7c6cf0" variant="Bold" />}
                title="Scenario-Specific Outlook on Life"
                body={type.scenarioOutlook}
              />
              <Section
                icon={<Flash size={18} color="#dc2626" variant="Bold" />}
                title="Stress Response"
                pathLabel={type.stressPath}
                pathClass="bg-[var(--color-gut-soft)] text-[var(--color-gut)]"
                body={type.stressResponse}
              />
              <Section
                icon={<Eye size={18} color="#16a34a" variant="Bold" />}
                title="Security Response"
                pathLabel={type.securityPath}
                pathClass="bg-[var(--color-head-soft)] text-[var(--color-head)]"
                body={type.securityResponse}
              />
            </div>
      </aside>
    </>
  );
}

function Section({
  icon,
  title,
  body,
  pathLabel,
  pathClass,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  pathLabel?: string;
  pathClass?: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
      </div>
      {pathLabel && (
        <span
          className={cn("mb-2 inline-block rounded-xl px-2.5 py-1 text-xs font-medium", pathClass)}
        >
          {pathLabel}
        </span>
      )}
      <p className="text-sm leading-relaxed text-[var(--color-ink)]/90">{body}</p>
    </section>
  );
}
