import {
  synthesisResultSchema,
  synthesisSectionsSchema,
  type SynthesisResult,
  type SynthesisSections,
} from "@/features/perspectives/data/schema";
import { getModelOption } from "@/features/perspectives/data/models";
import { getPairing } from "@/features/perspectives/data/relationshipMatrix";
import {
  SYNTHESIS_JSON_SCHEMA,
  SYNTHESIS_SYSTEM_PROMPT,
  buildSynthesisUserPrompt,
} from "@/features/perspectives/synthesisPrompt";
import { streamLLM, type TokenUsage } from "./llm";
import { logPromptToFile, repairTruncatedJson } from "./llmJson";
import { SynthesisStreamParser } from "./synthesisStream";

/**
 * Event surface of the streaming synthesis. Each section's text streams in as
 * token-level fragments (`kind: "section"` carrying a `delta` the client appends
 * to that field), then a final `done` event carries the canonical, validated
 * result + token usage.
 */
export type SynthesisStreamEvent =
  | { kind: "section"; field: keyof SynthesisSections; delta: string }
  | { kind: "done"; result: SynthesisResult; usage?: TokenUsage };

/** Order the two types low→high so the lookup, echo, and prompt are stable. */
function normalizePair(typeA: number, typeB: number): [number, number] {
  return typeA <= typeB ? [typeA, typeB] : [typeB, typeA];
}

/**
 * Streams the two-type combined synthesis: weaves the pair into one essay,
 * grounded in the David Daniels Relationships Matrix entry for that pair.
 * Mirrors {@link analyzeScenarioStream} in shape — emit each section as it
 * completes, then a final `done` with the canonical result.
 */
export async function* synthesizePairStream(
  scenario: string,
  typeA: number,
  typeB: number,
  modelId?: string,
  signal?: AbortSignal,
): AsyncGenerator<SynthesisStreamEvent> {
  const [lo, hi] = normalizePair(typeA, typeB);
  const { provider, model } = getModelOption(modelId);
  const pairing = getPairing(lo, hi);
  const parser = new SynthesisStreamParser();
  let usage: TokenUsage | undefined;

  const trace = process.env.NODE_ENV !== "production";
  const startedAt = Date.now();
  let firstAt = 0;

  const userPrompt = buildSynthesisUserPrompt(scenario, lo, hi, pairing);
  await logPromptToFile("synthesis", scenario, model, SYNTHESIS_SYSTEM_PROMPT, userPrompt);

  for await (const chunk of streamLLM({
    messages: [
      { role: "system", content: SYNTHESIS_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 4000,
    provider,
    model,
    signal,
    jsonSchema: {
      name: "pair_synthesis",
      schema: SYNTHESIS_JSON_SCHEMA as unknown as Record<string, unknown>,
    },
  })) {
    if (chunk.usage) usage = chunk.usage;
    if (!chunk.delta) continue;
    if (trace) process.stdout.write(chunk.delta);

    for (const { field, delta } of parser.push(chunk.delta)) {
      if (!firstAt) {
        firstAt = Date.now();
        if (trace) {
          console.info(`\n[synthesis] ▸ first text (${field}) @ +${((firstAt - startedAt) / 1000).toFixed(2)}s`);
        }
      }
      yield { kind: "section", field, delta };
    }
  }

  // Final reconciliation: a whole-document repair+parse recovers a truncated
  // last section the incremental pass couldn't close, and validates the shape.
  let sections: SynthesisSections;
  try {
    sections = synthesisSectionsSchema.parse(JSON.parse(repairTruncatedJson(parser.raw())));
  } catch {
    // Fall back to whatever streamed cleanly; require at least a title + one body.
    const partial = parser.collected();
    const recovered = synthesisSectionsSchema.safeParse({
      title: partial.title ?? "",
      inScenario: partial.inScenario ?? "",
      underPressure: partial.underPressure ?? "",
      inSecurity: partial.inSecurity ?? "",
      sharedInvitation: partial.sharedInvitation ?? "",
    });
    if (!recovered.success || !partial.inScenario) {
      throw new Error("The synthesis engine returned data in an unexpected format. Please try again.");
    }
    sections = recovered.data;
  }

  if (trace) {
    const totalMs = Date.now() - startedAt;
    console.info(
      `\n[synthesis] ⏱ first section: ${firstAt ? ((firstAt - startedAt) / 1000).toFixed(2) + "s" : "n/a"} · ` +
        `full stream: ${(totalMs / 1000).toFixed(2)}s`,
    );
  }

  yield {
    kind: "done",
    usage,
    result: synthesisResultSchema.parse({
      scenario,
      types: [lo, hi],
      generatedAt: new Date().toISOString(),
      sections,
    }),
  };
}
