"use client";

import { useCallback, useRef, useState } from "react";
import type { AnalysisResult, PerspectiveTypeAnalysis } from "../data/schema";
import type { ModelId } from "../data/models";

export type StreamStatus = "idle" | "streaming" | "done" | "error";

/** Per-run measurement surfaced for the results readout (exact tokens, est. cost). */
export interface AnalysisMetrics {
  provider: string;
  model: string;
  timeToFirstMs: number | null;
  totalMs: number | null;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedPromptTokens: number;
  } | null;
  estCostUsd: number | null;
  cacheSavingsUsd: number | null;
}

export interface StreamError {
  code: string;
  message: string;
}

interface State {
  status: StreamStatus;
  scenario: string | null;
  types: PerspectiveTypeAnalysis[];
  result: AnalysisResult | null;
  metrics: AnalysisMetrics | null;
  error: StreamError | null;
}

const INITIAL: State = {
  status: "idle",
  scenario: null,
  types: [],
  result: null,
  metrics: null,
  error: null,
};

/**
 * Drives the NDJSON streaming analysis endpoint: perspectives populate as they
 * arrive, then a `done` frame carries the canonical result + metrics. Token
 * errors (403) surface via `error.code` so the caller can open the upgrade modal.
 */
export function useAnalysisStream() {
  const [state, setState] = useState<State>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL);
  }, []);

  const start = useCallback(async (scenario: string, modelId?: ModelId) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL, status: "streaming", scenario });

    try {
      const res = await fetch("/api/analyze/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario, modelId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as StreamError | null;
        setState((s) => ({
          ...s,
          status: "error",
          error: { code: body?.code ?? "ERROR", message: body?.message ?? "Analysis failed." },
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
            | { event: "perspective"; data: PerspectiveTypeAnalysis; complete: boolean }
            | { event: "summary"; typeNumber: number; delta: string }
            | { event: "done"; result: AnalysisResult; metrics: AnalysisMetrics }
            | { event: "error"; code: string; message: string };
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }

          if (evt.event === "perspective") {
            // Upsert by typeNumber: the shell renders the card, summary deltas
            // type the summary in, then the complete event merges the prose.
            // Merge so a late shell never clobbers already-streamed summary text.
            setState((s) => {
              const idx = s.types.findIndex((t) => t.typeNumber === evt.data.typeNumber);
              if (idx === -1) {
                return {
                  ...s,
                  types: [...s.types, evt.data].sort((a, b) => a.typeNumber - b.typeNumber),
                };
              }
              const existing = s.types[idx];
              const next = s.types.slice();
              // Keep the longer summary (streamed text vs. an incoming empty shell).
              const merged = { ...existing, ...evt.data };
              if (!evt.data.summary && existing.summary) merged.summary = existing.summary;
              next[idx] = merged;
              return { ...s, types: next };
            });
          } else if (evt.event === "summary") {
            // Append the decoded summary fragment to its card.
            setState((s) => {
              const idx = s.types.findIndex((t) => t.typeNumber === evt.typeNumber);
              if (idx === -1) return s;
              const next = s.types.slice();
              next[idx] = { ...next[idx], summary: next[idx].summary + evt.delta };
              return { ...s, types: next };
            });
          } else if (evt.event === "done") {
            setState((s) => ({
              ...s,
              status: "done",
              result: evt.result,
              types: evt.result.types,
              metrics: evt.metrics,
            }));
          } else if (evt.event === "error") {
            setState((s) => ({ ...s, status: "error", error: { code: evt.code, message: evt.message } }));
          }
        }
      }
    } catch (err) {
      // Aborts are intentional (reset/unmount) — don't surface them as errors.
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
