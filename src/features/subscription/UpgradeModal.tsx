"use client";

import { useState } from "react";
import { CloseCircle, Crown1, TickCircle } from "iconsax-reactjs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** True when the modal opened because the user ran out of tokens. */
  outOfTokens?: boolean;
}

const PLANS = [
  { id: "monthly" as const, label: "Monthly", price: "$9", period: "per month" },
  { id: "annual" as const, label: "Annual", price: "$99", period: "per year", badge: "Save 8%" },
];

const BENEFITS = [
  "Unlimited “Describe a real-life scenario or decision.” Analyze Scenario generations every month",
  "Full 9-perspective breakdowns with stress & security responses",
  "Share links and PDF exports for every analysis",
];

export function UpgradeModal({ open, onClose, outOfTokens }: Props) {
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const checkout = trpc.subscription.createCheckout.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err) => toast.error(err.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-[var(--color-surface)] p-6 shadow-2xl animate-fade-up">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
        >
          <CloseCircle size={24} color="#6f6962" variant="Linear" />
        </button>

        <div className="mb-1 flex items-center gap-2">
          <Crown1 size={22} color="#7c6cf0" variant="Bold" />
          <h2 className="font-serif text-2xl font-semibold">ThePlatform.life Premium</h2>
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          {outOfTokens
            ? "You've used your free analysis for this month. Upgrade for unlimited access."
            : "Unlock unlimited perspective analyses."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlan(p.id)}
              className={cn(
                "relative rounded-xl border p-4 text-left transition",
                plan === p.id
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                  : "border-[var(--color-line)] hover:border-[var(--color-brand)]",
              )}
            >
              {p.badge && (
                <span className="absolute right-2 top-2 rounded-full bg-[var(--color-head-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-head)]">
                  {p.badge}
                </span>
              )}
              <div className="text-sm font-medium text-[var(--color-muted)]">{p.label}</div>
              <div className="mt-1 font-serif text-2xl font-bold">{p.price}</div>
              <div className="text-xs text-[var(--color-muted)]">{p.period}</div>
            </button>
          ))}
        </div>

        <ul className="mt-5 space-y-2">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <TickCircle size={18} color="#16a34a" variant="Bold" className="mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => checkout.mutate({ plan })}
          disabled={checkout.isPending}
          className="mt-6 w-full rounded-lg bg-[var(--color-brand)] py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {checkout.isPending ? "Redirecting to checkout…" : "Subscribe Now"}
        </button>
        <p className="mt-2 text-center text-[11px] text-[var(--color-muted)]">
          Secure checkout via Stripe · test mode
        </p>
      </div>
    </div>
  );
}
