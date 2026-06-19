"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Framing your scenario through 9 distinct worldviews…",
  "Mapping how each type perceives and feels…",
  "Tracing stress and security shifts…",
  "Composing each perspective…",
];

/** Pulsing placeholder grid + rotating progress text while the analysis runs. */
export function LoadingState() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="animate-fade-up">
      <p className="mb-6 text-center text-sm font-medium text-[var(--color-muted)]">
        {MESSAGES[msgIndex]}
      </p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[0, 1, 2].map((col) => (
          <div
            key={col}
            className="space-y-3 rounded-[var(--radius-card)] bg-[var(--color-surface-muted)] p-4"
          >
            <div className="h-5 w-28 animate-pulse-soft rounded-lg bg-[var(--color-line)]" />
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="animate-pulse-soft rounded-[var(--radius-compact)] bg-[var(--color-surface)] p-5"
                style={{ animationDelay: `${(col * 3 + row) * 120}ms` }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-[var(--color-line)]" />
                  <div className="h-4 w-24 rounded bg-[var(--color-line)]" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-[var(--color-line)]" />
                  <div className="h-3 w-5/6 rounded bg-[var(--color-line)]" />
                  <div className="h-3 w-4/6 rounded bg-[var(--color-line)]" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
