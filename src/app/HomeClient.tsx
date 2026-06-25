"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { AnalysisResult } from "@/features/perspectives/data/schema";
import type { ModelId } from "@/features/perspectives/data/models";
import { GRID_REVEAL_ORDER } from "@/features/perspectives/data/types";
import { useAnalysisStream } from "@/features/perspectives/hooks/useAnalysisStream";
import { useSynthesisStream } from "@/features/perspectives/hooks/useSynthesisStream";
import { ScenarioInput } from "@/features/perspectives/components/ScenarioInput";
import { SynthesisInput } from "@/features/perspectives/components/SynthesisInput";
import { SynthesisView } from "@/features/perspectives/components/SynthesisView";
import { LoadingState } from "@/features/perspectives/components/LoadingState";
import { ResultsView } from "@/features/perspectives/components/ResultsView";
import { FlowToggle, type Flow } from "@/features/perspectives/components/FlowToggle";
import { DashboardHeader } from "@/features/subscription/DashboardHeader";
import { ResourcesSection } from "@/features/subscription/ResourcesSection";
import { UpgradeModal } from "@/features/subscription/UpgradeModal";

export function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();

  const profileQuery = trpc.user.profile.useQuery();
  const [selfType, setSelfType] = useState<number | null>(null);
  const [modal, setModal] = useState<{ open: boolean; outOfTokens: boolean }>({
    open: false,
    outOfTokens: false,
  });

  const setSelfTypeMutation = trpc.user.setSelfIdentifiedType.useMutation();

  const analysis = useAnalysisStream();
  const synthesis = useSynthesisStream();
  const [flow, setFlow] = useState<Flow>("perspectives");

  const isPremium = profileQuery.data?.subscriptionStatus === "premium";

  // Token balance changes once a run finishes (consumed) or fails (refunded).
  useEffect(() => {
    if (analysis.status === "done" || analysis.status === "error") {
      void utils.user.profile.invalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.status]);

  useEffect(() => {
    if (synthesis.status === "done" || synthesis.status === "error") {
      void utils.user.profile.invalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synthesis.status]);

  // Surface errors: out-of-tokens opens the upgrade modal; everything else toasts.
  useEffect(() => {
    if (!analysis.error) return;
    if (analysis.error.code === "NO_TOKENS") {
      setModal({ open: true, outOfTokens: true });
    } else {
      toast.error(analysis.error.message || "Analysis failed. Please try again.");
    }
  }, [analysis.error]);

  // Synthesis (Flow 2) errors: premium-required or out-of-tokens open the upgrade
  // modal; anything else toasts. The server gates premium BEFORE consuming a token.
  useEffect(() => {
    if (!synthesis.error) return;
    if (synthesis.error.code === "PREMIUM_REQUIRED") {
      setModal({ open: true, outOfTokens: false });
    } else if (synthesis.error.code === "NO_TOKENS") {
      setModal({ open: true, outOfTokens: true });
    } else {
      toast.error(synthesis.error.message || "Synthesis failed. Please try again.");
    }
  }, [synthesis.error]);

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
      void analysis.start(scenario.trim());
      router.replace("/"); // clean the URL but keep the result in state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleAnalyze(scenario: string, modelId: ModelId) {
    void analysis.start(scenario, modelId);
  }

  function handleSynthesize(scenario: string, types: [number, number], modelId: ModelId) {
    void synthesis.start(scenario, types, modelId);
  }

  // Flow 2 launched from the Flow 1 results grid: premium runs it, free is sent
  // to the upgrade modal (the server enforces the same gate).
  function handleSynthesizeFromResults(types: [number, number]) {
    const scenario = analysis.result?.scenario ?? analysis.scenario;
    if (!scenario) return;
    if (!isPremium) {
      setModal({ open: true, outOfTokens: false });
      return;
    }
    void synthesis.start(scenario, types);
  }

  function handleSelfTypeChange(typeNumber: number | null) {
    setSelfType(typeNumber);
    setSelfTypeMutation.mutate({ typeNumber });
  }

  const profile = profileQuery.data;
  const isStreaming = analysis.status === "streaming";
  // Flow 2 owns the screen whenever a synthesis is streaming or complete.
  const showSynthesis = synthesis.status === "streaming" || synthesis.status === "done";

  // Reveal cards in the grid's reading order (left-to-right, row by row) rather
  // than the model's emission order: show only the contiguous prefix of
  // GRID_REVEAL_ORDER that has arrived, so a card never pops in out of sequence.
  const revealedTypes = useMemo(() => {
    const arrived = new Set(analysis.types.map((t) => t.typeNumber));
    let prefix = 0;
    while (prefix < GRID_REVEAL_ORDER.length && arrived.has(GRID_REVEAL_ORDER[prefix])) prefix++;
    const revealed = new Set(GRID_REVEAL_ORDER.slice(0, prefix));
    return analysis.types.filter((t) => revealed.has(t.typeNumber));
  }, [analysis.types]);

  // While streaming, show the revealed prefix; once done, show the full result.
  const liveResult: AnalysisResult | null = useMemo(() => {
    if (analysis.result) return analysis.result;
    if (analysis.scenario && revealedTypes.length > 0) {
      return { scenario: analysis.scenario, generatedAt: "", types: revealedTypes };
    }
    return null;
  }, [analysis.result, analysis.scenario, revealedTypes]);

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
        {showSynthesis ? (
          <SynthesisView
            scenario={synthesis.scenario ?? ""}
            types={synthesis.types ?? [1, 1]}
            sections={synthesis.sections}
            streaming={synthesis.status === "streaming"}
            metrics={synthesis.metrics}
            onReset={() => synthesis.reset()}
          />
        ) : isStreaming && !liveResult ? (
          <LoadingState />
        ) : liveResult ? (
          <ResultsView
            result={liveResult}
            streaming={isStreaming}
            streamedCount={revealedTypes.length}
            metrics={analysis.metrics}
            selfType={selfType}
            onSelfTypeChange={handleSelfTypeChange}
            onReset={() => analysis.reset()}
            onSynthesize={handleSynthesizeFromResults}
          />
        ) : (
          <div className="space-y-10">
            <FlowToggle flow={flow} onChange={setFlow} disabled={isStreaming} />
            {flow === "perspectives" ? (
              <ScenarioInput onAnalyze={handleAnalyze} disabled={isStreaming} />
            ) : (
              <SynthesisInput
                onSynthesize={handleSynthesize}
                disabled={synthesis.status === "streaming"}
                isPremium={isPremium}
                onLocked={() => setModal({ open: true, outOfTokens: false })}
              />
            )}
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
