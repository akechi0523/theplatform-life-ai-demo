"use client";

import { Crown1, Flash } from "iconsax-reactjs";

interface Props {
  status: "free" | "premium";
  tokensRemaining: number;
  renewalDate?: Date | null;
}

export function SubscriptionBadge({ status, tokensRemaining, renewalDate }: Props) {
  if (status === "premium") {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-obsidian)] px-3 py-1 font-semibold text-white">
          <Crown1 size={15} color="#ffffff" variant="Bold" /> Premium
        </span>
        <span className="hidden text-[var(--color-muted)] sm:inline">Unlimited analyses</span>
        {renewalDate && (
          <span className="hidden text-xs text-[var(--color-muted)] md:inline">
            Renews {new Date(renewalDate).toLocaleDateString()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-graphite)] px-3 py-1 font-medium text-[var(--color-graphite)]">
        Free
      </span>
      <span className="inline-flex items-center gap-1 text-[var(--color-muted)]">
        <Flash size={14} color="#ca8a04" variant="Bold" />
        <strong className="text-[var(--color-ink)]">{tokensRemaining}</strong> analysis left this
        month
      </span>
    </div>
  );
}
