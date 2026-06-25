import {
  analysisResultSchema,
  llmTypesSchema,
  perspectiveTypeAnalysisSchema,
  type AnalysisResult,
  type PerspectiveTypeAnalysis,
} from "@/features/perspectives/data/schema";
import {
  PERSPECTIVE_TYPES,
  securityPathLabel,
  stressPathLabel,
  taglineFor,
} from "@/features/perspectives/data/types";
import { getModelOption } from "@/features/perspectives/data/models";
import {
  ANALYSIS_JSON_SCHEMA,
  SYSTEM_PROMPT,
  buildUserPrompt,
} from "@/features/perspectives/prompt";
import { invokeLLM, streamLLM, type TokenUsage } from "./llm";
import { PerspectiveStreamParser } from "./jsonStream";
import { logPromptToFile, repairTruncatedJson } from "./llmJson";

/**
 * Produces a complete 9-type analysis for the scenario by calling the LLM,
 * then repairing/validating the JSON and ordering the types canonically.
 */
export async function analyzeScenario(
  scenario: string,
  modelId?: string,
): Promise<AnalysisResult> {
  const { provider, model } = getModelOption(modelId);

  const userPrompt = buildUserPrompt(scenario);
  await logPromptToFile("analysis", scenario, model, SYSTEM_PROMPT, userPrompt);

  const raw = await invokeLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
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

/**
 * Event surface of the streaming analysis. A perspective is emitted twice: a
 * `complete: false` "face" the moment its summary is ready (so the card can
 * render), then `complete: true` once its prose fields finish. The client
 * merges by typeNumber. A final `done` event carries the canonical result.
 */
export type AnalysisStreamEvent =
  | { kind: "perspective"; data: PerspectiveTypeAnalysis; complete: boolean }
  | { kind: "done"; result: AnalysisResult; usage?: TokenUsage };

/**
 * Builds a renderable card from a face slice (typeNumber + summary). The fields
 * we already know locally (name, tagline, shift paths) are filled from metadata;
 * the heavier prose fields stay empty until the `complete` event replaces them.
 */
function faceToPerspective(raw: unknown): PerspectiveTypeAnalysis | null {
  if (typeof raw !== "object" || raw === null) return null;
  const f = raw as Record<string, unknown>;
  const num = typeof f.typeNumber === "number" ? f.typeNumber : Number(f.typeNumber);
  if (!Number.isInteger(num) || !PERSPECTIVE_TYPES[num]) return null;
  if (typeof f.summary !== "string" || f.summary.length === 0) return null;

  const meta = PERSPECTIVE_TYPES[num];
  return {
    typeNumber: num,
    typeName: typeof f.typeName === "string" && f.typeName ? f.typeName : meta.name,
    tagline: typeof f.tagline === "string" && f.tagline ? f.tagline : taglineFor(num),
    summary: f.summary,
    scenarioOutlook: "",
    stressResponse: "",
    stressPath: stressPathLabel(num),
    securityResponse: "",
    securityPath: securityPathLabel(num),
  };
}

/**
 * Streaming counterpart of {@link analyzeScenario}. Emits each card's face as
 * soon as its summary is ready, then the full perspective when its prose
 * completes, then a final `done` event with the canonical, ordered result.
 */
export async function* analyzeScenarioStream(
  scenario: string,
  modelId?: string,
  signal?: AbortSignal,
): AsyncGenerator<AnalysisStreamEvent> {
  const { provider, model } = getModelOption(modelId);
  const parser = new PerspectiveStreamParser();
  const facesSeen = new Set<number>();
  const seen = new Set<number>();
  const collected: PerspectiveTypeAnalysis[] = [];
  let usage: TokenUsage | undefined;

  // Dev aid: trace the stream so the growing JSON can be watched live in the
  // server terminal and diffed against the rendered cards.
  const trace = process.env.NODE_ENV !== "production";
  const startedAt = Date.now();
  let firstAt = 0;

  const userPrompt = buildUserPrompt(scenario);
  await logPromptToFile("analysis", scenario, model, SYSTEM_PROMPT, userPrompt);

  for await (const chunk of streamLLM({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
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

    // Echo each raw text delta with no newline, so the JSON document visibly
    // assembles itself in the terminal exactly as the model emits it.
    if (trace) process.stdout.write(chunk.delta);

    const { faces, completed } = parser.push(chunk.delta);

    // Faces first: render the card the instant its summary lands.
    for (const rawFace of faces) {
      let candidate: unknown;
      try {
        candidate = JSON.parse(rawFace);
      } catch {
        continue;
      }
      const face = faceToPerspective(candidate);
      if (!face || facesSeen.has(face.typeNumber)) continue;
      facesSeen.add(face.typeNumber);
      if (!firstAt) firstAt = Date.now();
      if (trace) {
        const t0 = firstAt - startedAt;
        console.info(
          `\n[analysis] ▸ FACE  type ${face.typeNumber} @ +${(t0 / 1000).toFixed(2)}s — "${face.summary.slice(0, 60)}…"`,
        );
      }
      yield { kind: "perspective", data: face, complete: false };
    }

    // Then the fully-formed objects with their prose fields.
    for (const rawObject of completed) {
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
      if (trace) console.info(`\n[analysis] ■ FULL  type ${t.typeNumber} (${t.typeName}) — prose complete`);
      yield { kind: "perspective", data: t, complete: true };
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
            yield { kind: "perspective", data: t, complete: true };
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

  // Dev aid: dump the raw model JSON so it can be diffed against the rendered
  // cards in local testing, plus the two headline latencies.
  if (trace) {
    const totalMs = Date.now() - startedAt;
    const firstMs = firstAt ? firstAt - startedAt : null;
    console.info(
      `\n[analysis] ⏱ first perspective: ${firstMs != null ? (firstMs / 1000).toFixed(2) + "s" : "n/a"} · ` +
        `full stream: ${(totalMs / 1000).toFixed(2)}s · ${finalTypes.length} types`,
    );
    console.info(`[analysis] raw LLM JSON (${finalTypes.length} types):\n${parser.raw()}`);
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
