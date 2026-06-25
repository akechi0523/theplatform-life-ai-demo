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
  | { kind: "summary"; typeNumber: number; delta: string }
  | { kind: "done"; result: AnalysisResult; usage?: TokenUsage };

/**
 * Builds an empty card "shell" for a type the instant its typeNumber is known —
 * the name, tagline and shift paths come from local metadata, so the card can
 * render immediately while its `summary` streams in (kind: "summary" deltas) and
 * the prose fields fill on the later `complete` event.
 */
function shellPerspective(num: number): PerspectiveTypeAnalysis | null {
  const meta = PERSPECTIVE_TYPES[num];
  if (!meta) return null;
  return {
    typeNumber: num,
    typeName: meta.name,
    tagline: taglineFor(num),
    summary: "",
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

    const { started, summaryDeltas, completed } = parser.push(chunk.delta);

    // Shells first: render the card skeleton the instant typeNumber is known —
    // before the summary even finishes (~1s sooner than waiting for the field).
    for (const num of started) {
      if (facesSeen.has(num)) continue;
      const shell = shellPerspective(num);
      if (!shell) continue;
      facesSeen.add(num);
      if (!firstAt) firstAt = Date.now();
      if (trace) {
        console.info(`\n[analysis] ▸ SHELL type ${num} @ +${((firstAt - startedAt) / 1000).toFixed(2)}s`);
      }
      yield { kind: "perspective", data: shell, complete: false };
    }

    // Summary text streams in as it is decoded, so the card visibly types out.
    for (const d of summaryDeltas) {
      yield { kind: "summary", typeNumber: d.typeNumber, delta: d.text };
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
