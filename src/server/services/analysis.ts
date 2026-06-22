import {
  analysisResultSchema,
  llmTypesSchema,
  perspectiveTypeAnalysisSchema,
  type AnalysisResult,
  type PerspectiveTypeAnalysis,
} from "@/features/perspectives/data/schema";
import { PERSPECTIVE_TYPES } from "@/features/perspectives/data/types";
import { getModelOption } from "@/features/perspectives/data/models";
import {
  ANALYSIS_JSON_SCHEMA,
  SYSTEM_PROMPT,
  buildUserPrompt,
} from "@/features/perspectives/prompt";
import { invokeLLM, streamLLM, type TokenUsage } from "./llm";
import { PerspectiveStreamParser } from "./jsonStream";

/** Recovers a truncated JSON string by closing any open structures. */
function repairTruncatedJson(raw: string): string {
  let s = raw.trim();
  // Strip markdown fences if a model wrapped the JSON.
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*$/, "");

  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }
  if (inString) s += '"';
  s = s.replace(/,\s*$/, "");
  for (let i = 0; i < brackets; i++) s += "]";
  for (let i = 0; i < braces; i++) s += "}";
  return s;
}

/**
 * Produces a complete 9-type analysis for the scenario by calling the LLM,
 * then repairing/validating the JSON and ordering the types canonically.
 */
export async function analyzeScenario(
  scenario: string,
  modelId?: string,
): Promise<AnalysisResult> {
  const { provider, model } = getModelOption(modelId);

  const raw = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(scenario) },
    ],
    maxTokens: 6000,
    provider,
    model,
    jsonSchema: {
      name: "perspective_analysis",
      schema: ANALYSIS_JSON_SCHEMA as unknown as Record<string, unknown>,
    },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = JSON.parse(repairTruncatedJson(raw));
  }

  const result = llmTypesSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("The analysis engine returned data in an unexpected format. Please try again.");
  }

  if (result.data.types.length === 0) {
    throw new Error("The analysis engine returned no perspectives. Please try again.");
  }

  return analysisResultSchema.parse({
    scenario,
    generatedAt: new Date().toISOString(),
    types: orderTypes(result.data.types),
  });
}

/** Keep only valid 1-9, dedupe by type number, and order canonically. */
function orderTypes(types: PerspectiveTypeAnalysis[]): PerspectiveTypeAnalysis[] {
  const byNumber = new Map<number, PerspectiveTypeAnalysis>();
  for (const t of types) {
    if (PERSPECTIVE_TYPES[t.typeNumber] && !byNumber.has(t.typeNumber)) {
      byNumber.set(t.typeNumber, t);
    }
  }
  return [...byNumber.values()].sort((a, b) => a.typeNumber - b.typeNumber);
}

/** Event surface of the streaming analysis: each ready perspective, then a final summary. */
export type AnalysisStreamEvent =
  | { kind: "perspective"; data: PerspectiveTypeAnalysis }
  | { kind: "done"; result: AnalysisResult; usage?: TokenUsage };

/**
 * Streaming counterpart of {@link analyzeScenario}. Yields each perspective as
 * soon as the model finishes it (for progressive rendering), then a final
 * `done` event carrying the canonical, ordered result and token usage.
 */
export async function* analyzeScenarioStream(
  scenario: string,
  modelId?: string,
  signal?: AbortSignal,
): AsyncGenerator<AnalysisStreamEvent> {
  const { provider, model } = getModelOption(modelId);
  const parser = new PerspectiveStreamParser();
  const seen = new Set<number>();
  const collected: PerspectiveTypeAnalysis[] = [];
  let usage: TokenUsage | undefined;

  for await (const chunk of streamLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(scenario) },
    ],
    maxTokens: 6000,
    provider,
    model,
    signal,
    jsonSchema: {
      name: "perspective_analysis",
      schema: ANALYSIS_JSON_SCHEMA as unknown as Record<string, unknown>,
    },
  })) {
    if (chunk.usage) usage = chunk.usage;
    if (!chunk.delta) continue;

    for (const rawObject of parser.push(chunk.delta)) {
      let candidate: unknown;
      try {
        candidate = JSON.parse(rawObject);
      } catch {
        continue; // Incomplete/garbled slice — the final pass will recover it.
      }
      const parsed = perspectiveTypeAnalysisSchema.safeParse(candidate);
      if (!parsed.success) continue;
      const t = parsed.data;
      if (!PERSPECTIVE_TYPES[t.typeNumber] || seen.has(t.typeNumber)) continue;
      seen.add(t.typeNumber);
      collected.push(t);
      yield { kind: "perspective", data: t };
    }
  }

  // Reconcile: a final whole-document parse recovers anything the incremental
  // pass missed (e.g. a truncated last object the repair can close).
  let finalTypes = collected;
  if (finalTypes.length < 9) {
    try {
      const whole = JSON.parse(repairTruncatedJson(parser.raw()));
      const validated = llmTypesSchema.safeParse(whole);
      if (validated.success) {
        for (const t of validated.data.types) {
          if (!seen.has(t.typeNumber)) {
            seen.add(t.typeNumber);
            finalTypes.push(t);
            yield { kind: "perspective", data: t };
          }
        }
      }
    } catch {
      /* keep whatever streamed successfully */
    }
  }

  finalTypes = orderTypes(finalTypes);
  if (finalTypes.length === 0) {
    throw new Error("The analysis engine returned no perspectives. Please try again.");
  }

  yield {
    kind: "done",
    usage,
    result: analysisResultSchema.parse({
      scenario,
      generatedAt: new Date().toISOString(),
      types: finalTypes,
    }),
  };
}
