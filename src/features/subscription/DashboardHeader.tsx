"use client";

import { useRouter } from "next/navigation";
import { Crown1, LogoutCurve } from "iconsax-reactjs";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SubscriptionBadge } from "./SubscriptionBadge";

interface Props {
  status?: "free" | "premium";
  tokensRemaining?: number;
  renewalDate?: Date | null;
  /** True while the profile query is still loading; renders a skeleton for the dynamic bits. */
  loading?: boolean;
  onUpgradeClick: () => void;
}

export function DashboardHeader({
  status,
  tokensRemaining,
  renewalDate,
  loading,
  onUpgradeClick,
}: Props) {
  const router = useRouter();

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <span className="font-serif text-lg font-semibold">ThePlatform.life AI</span>

        <div className="flex items-center gap-4">
          {loading || !status ? (
            <span className="h-7 w-32 animate-pulse rounded-xl bg-[var(--color-line)]" />
          ) : (
            <SubscriptionBadge
              status={status}
              tokensRemaining={tokensRemaining ?? 0}
              renewalDate={renewalDate}
            />
          )}

          {status === "free" && (
            <button
              onClick={onUpgradeClick}
              className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
            >
              <Crown1 size={15} color="#ffffff" variant="Bold" /> Upgrade to Premium
            </button>
          )}

          <button
            onClick={signOut}
            aria-label="Sign out"
            className="rounded-xl p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-surface-muted)]"
          >
            <LogoutCurve size={18} color="#6f6962" variant="Linear" />
          </button>
        </div>
      </div>
    </header>
  );
}
