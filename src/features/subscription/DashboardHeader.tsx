"use client";

import { useRouter } from "next/navigation";
import { Crown1, LogoutCurve } from "iconsax-reactjs";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SubscriptionBadge } from "./SubscriptionBadge";

interface Props {
  status: "free" | "premium";
  tokensRemaining: number;
  renewalDate?: Date | null;
  onUpgradeClick: () => void;
}

export function DashboardHeader({ status, tokensRemaining, renewalDate, onUpgradeClick }: Props) {
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
          <SubscriptionBadge
            status={status}
            tokensRemaining={tokensRemaining}
            renewalDate={renewalDate}
          />

          {status === "free" && (
            <button
              onClick={onUpgradeClick}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Crown1 size={15} color="#ffffff" variant="Bold" /> Upgrade to Premium
            </button>
          )}

          <button
            onClick={signOut}
            aria-label="Sign out"
            className="rounded-lg p-2 text-[var(--color-muted)] transition hover:bg-[var(--color-line)]"
          >
            <LogoutCurve size={18} color="#6f6962" variant="Linear" />
          </button>
        </div>
      </div>
    </header>
  );
}
