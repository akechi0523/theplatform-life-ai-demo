"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { AnalysisResult } from "@/features/perspectives/data/schema";
import type { ModelId } from "@/features/perspectives/data/models";
import { ScenarioInput } from "@/features/perspectives/components/ScenarioInput";
import { LoadingState } from "@/features/perspectives/components/LoadingState";
import { ResultsView } from "@/features/perspectives/components/ResultsView";
import { DashboardHeader } from "@/features/subscription/DashboardHeader";
import { ResourcesSection } from "@/features/subscription/ResourcesSection";
import { UpgradeModal } from "@/features/subscription/UpgradeModal";

export function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();

  const profileQuery = trpc.user.profile.useQuery();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selfType, setSelfType] = useState<number | null>(null);
  const [modal, setModal] = useState<{ open: boolean; outOfTokens: boolean }>({
    open: false,
    outOfTokens: false,
  });

  const setSelfTypeMutation = trpc.user.setSelfIdentifiedType.useMutation();

  const analyze = trpc.analysis.analyze.useMutation({
    onSuccess: (data) => {
      setResult(data);
      void utils.user.profile.invalidate(); // token count changed
    },
    onError: (err) => {
      if (err.message === "NO_TOKENS") {
        setModal({ open: true, outOfTokens: true });
      } else {
        toast.error(err.message || "Analysis failed. Please try again.");
      }
    },
  });

  // Hydrate the self-identified type from the profile once it loads.
  useEffect(() => {
    if (profileQuery.data) setSelfType(profileQuery.data.selfIdentifiedType ?? null);
  }, [profileQuery.data]);

  // Handle Stripe redirect outcomes.
  useEffect(() => {
    const upgrade = searchParams.get("upgrade");
    if (upgrade === "success") {
      toast.success("Welcome to Premium! You now have unlimited analyses.");
      void utils.user.profile.invalidate();
      router.replace("/");
    } else if (upgrade === "cancelled") {
      toast.info("Checkout cancelled.");
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-load shared links: ?scenario=... triggers the analysis once.
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (autoLoaded.current) return;
    const scenario = searchParams.get("scenario");
    if (scenario && scenario.trim().length >= 5) {
      autoLoaded.current = true;
      analyze.mutate({ scenario: scenario.trim() });
      router.replace("/"); // clean the URL but keep the result in state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleAnalyze(scenario: string, modelId: ModelId) {
    setResult(null);
    analyze.mutate({ scenario, modelId });
  }

  function handleSelfTypeChange(typeNumber: number | null) {
    setSelfType(typeNumber);
    setSelfTypeMutation.mutate({ typeNumber });
  }

  const profile = profileQuery.data;
  const isLoading = analyze.isPending;

  return (
    <div className="min-h-screen">
      <DashboardHeader
        loading={!profile}
        status={profile?.subscriptionStatus}
        tokensRemaining={profile?.monthlyTokensRemaining}
        renewalDate={profile?.renewalDate}
        onUpgradeClick={() => setModal({ open: true, outOfTokens: false })}
      />

      <main className="mx-auto max-w-6xl px-4 py-10">
        {isLoading ? (
          <LoadingState />
        ) : result ? (
          <ResultsView
            result={result}
            selfType={selfType}
            onSelfTypeChange={handleSelfTypeChange}
            onReset={() => setResult(null)}
          />
        ) : (
          <div className="space-y-10">
            <ScenarioInput onAnalyze={handleAnalyze} disabled={isLoading} />
            <div className="mx-auto max-w-2xl">
              <ResourcesSection />
            </div>
          </div>
        )}
      </main>

      <UpgradeModal
        open={modal.open}
        outOfTokens={modal.outOfTokens}
        onClose={() => setModal({ open: false, outOfTokens: false })}
      />
    </div>
  );
}
