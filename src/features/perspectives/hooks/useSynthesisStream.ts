"use client";

import { useCallback, useRef, useState } from "react";
import type { SynthesisResult, SynthesisSections } from "../data/schema";
import type { ModelId } from "../data/models";
import type { AnalysisMetrics, StreamError, StreamStatus } from "./useAnalysisStream";

interface State {
  status: StreamStatus;
  scenario: string | null;
  types: [number, number] | null;
  /** Filled field-by-field as each section streams in. */
  sections: Partial<SynthesisSections>;
  result: SynthesisResult | null;
  metrics: AnalysisMetrics | null;
  error: StreamError | null;
}

const INITIAL: State = {
  status: "idle",
  scenario: null,
  types: null,
  sections: {},
  result: null,
  metrics: null,
  error: null,
};

type SectionField = keyof SynthesisSections;

/**
 * Drives the NDJSON streaming synthesis endpoint (Flow 2). Sections populate as
 * they arrive, then a `done` frame carries the canonical result + metrics.
 * Premium/token errors (403) surface via `error.code` (`PREMIUM_REQUIRED` /
 * `NO_TOKENS`) so the caller can open the upgrade modal.
 */
export function useSynthesisStream() {
  const [state, setState] = useState<State>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL);
  }, []);

  const start = useCallback(async (scenario: string, types: [number, number], modelId?: ModelId) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL, status: "streaming", scenario, types });

    try {
      const res = await fetch("/api/analyze/synthesis/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario, types, modelId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as StreamError | null;
        setState((s) => ({
          ...s,
          status: "error",
          error: { code: body?.code ?? "ERROR", message: body?.message ?? "Synthesis failed." },
        }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;

          let evt:
            | { event: "section"; field: SectionField; delta: string }
            | { event: "done"; result: SynthesisResult; metrics: AnalysisMetrics }
            | { event: "error"; code: string; message: string };
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }

          if (evt.event === "section") {
            // Append the decoded fragment so the section types out live.
            setState((s) => ({
              ...s,
              sections: { ...s.sections, [evt.field]: (s.sections[evt.field] ?? "") + evt.delta },
            }));
          } else if (evt.event === "done") {
            setState((s) => ({
              ...s,
              status: "done",
              result: evt.result,
              sections: evt.result.sections,
              metrics: evt.metrics,
            }));
          } else if (evt.event === "error") {
            setState((s) => ({ ...s, status: "error", error: { code: evt.code, message: evt.message } }));
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState((s) => ({
        ...s,
        status: "error",
        error: { code: "NETWORK", message: "Connection interrupted. Please try again." },
      }));
    }
  }, []);

  return { ...state, start, reset };
}
