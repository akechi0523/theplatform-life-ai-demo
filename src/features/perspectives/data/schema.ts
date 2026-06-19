import { z } from "zod";
import { MODEL_IDS } from "./models";

// ─────────────────────────────────────────────────────────────────────────────
// The analysis contract — shared by the tRPC procedure, the LLM structured
// output, and the UI. One schema, validated everywhere.
// ─────────────────────────────────────────────────────────────────────────────

export const perspectiveTypeAnalysisSchema = z.object({
  typeNumber: z.number().int().min(1).max(9),
  typeName: z.string(),
  tagline: z.string(),
  /** 1-2 sentence summary shown on the card */
  summary: z.string(),
  /** How this type frames the scenario / their worldview applied here */
  scenarioOutlook: z.string(),
  /** Behavior under pressure — references the stress shift, uses "unaware" */
  stressResponse: z.string(),
  /** e.g. "Type 4 shifts toward Type 2 under stress" */
  stressPath: z.string(),
  /** Behavior when safe — references the security shift, uses "aware" */
  securityResponse: z.string(),
  /** e.g. "Type 4 shifts toward Type 1 in security" */
  securityPath: z.string(),
});

export type PerspectiveTypeAnalysis = z.infer<typeof perspectiveTypeAnalysisSchema>;

export const analysisResultSchema = z.object({
  scenario: z.string(),
  generatedAt: z.string(),
  types: z.array(perspectiveTypeAnalysisSchema),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

/** Input accepted by the analyze procedure. */
export const analyzeInputSchema = z.object({
  scenario: z.string().min(5, "Please describe your scenario in a little more detail.").max(500),
  /** Optional model picker selection; server falls back to the default if omitted. */
  modelId: z.enum(MODEL_IDS).optional(),
});

/** Just the array the LLM is asked to produce. */
export const llmTypesSchema = z.object({
  types: z.array(perspectiveTypeAnalysisSchema),
});
