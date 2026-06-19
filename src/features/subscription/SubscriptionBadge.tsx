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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-soft)] px-3 py-1 font-semibold text-[var(--color-brand)]">
          <Crown1 size={15} color="#7c6cf0" variant="Bold" /> Premium
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-3 py-1 font-medium text-[var(--color-muted)]">
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
