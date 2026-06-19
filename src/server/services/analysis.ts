import {
  analysisResultSchema,
  llmTypesSchema,
  type AnalysisResult,
} from "@/features/perspectives/data/schema";
import { PERSPECTIVE_TYPES } from "@/features/perspectives/data/types";
import { getModelOption } from "@/features/perspectives/data/models";
import {
  ANALYSIS_JSON_SCHEMA,
  SYSTEM_PROMPT,
  buildUserPrompt,
} from "@/features/perspectives/prompt";
import { invokeLLM } from "./llm";

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

  const types = [...result.data.types];
  if (types.length === 0) {
    throw new Error("The analysis engine returned no perspectives. Please try again.");
  }

  // Keep only valid 1-9, dedupe, and order canonically.
  const byNumber = new Map<number, (typeof types)[number]>();
  for (const t of types) {
    if (PERSPECTIVE_TYPES[t.typeNumber] && !byNumber.has(t.typeNumber)) {
      byNumber.set(t.typeNumber, t);
    }
  }
  const ordered = [...byNumber.values()].sort((a, b) => a.typeNumber - b.typeNumber);

  return analysisResultSchema.parse({
    scenario,
    generatedAt: new Date().toISOString(),
    types: ordered,
  });
}
