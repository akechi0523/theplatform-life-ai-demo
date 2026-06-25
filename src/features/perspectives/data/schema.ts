import { z } from "zod";
import { MODEL_IDS } from "./models";

// ─────────────────────────────────────────────────────────────────────────────
// The analysis contract — shared by the tRPC procedure, the LLM structured
// output, and the UI. One schema, validated everywhere.
// ─────────────────────────────────────────────────────────────────────────────

export const perspectiveTypeAnalysisSchema = z.object({
  typeNumber: z.number().int().min(1).max(9),
  /** 1-2 sentence summary shown on the card — emitted 2nd so the card renders early */
  summary: z.string(),
  typeName: z.string(),
  tagline: z.string(),
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

// ─────────────────────────────────────────────────────────────────────────────
// Flow 2 — two-type combined synthesis ("Compare Two Types"). The user picks two
// of the nine types and gets one flowing essay woven from both, grounded in the
// David Daniels Relationships Matrix. Five titled sections, streamed field-by-field.
// ─────────────────────────────────────────────────────────────────────────────

export const synthesisSectionsSchema = z.object({
  /** Essay title, e.g. "The Giver and the Observer buying a home together". */
  title: z.string(),
  /** "In the shared scenario" — both types' core worldview applied here. */
  inScenario: z.string(),
  /** "Under pressure — when unaware" — both stress shifts woven together. */
  underPressure: z.string(),
  /** "In security — when aware" — both security shifts woven together. */
  inSecurity: z.string(),
  /** "The shared invitation" — closing synthesis. */
  sharedInvitation: z.string(),
});

export type SynthesisSections = z.infer<typeof synthesisSectionsSchema>;

export const synthesisResultSchema = z.object({
  scenario: z.string(),
  /** The two types compared, normalized to sorted [lo, hi] ([n, n] for same-type). */
  types: z.tuple([z.number().int().min(1).max(9), z.number().int().min(1).max(9)]),
  generatedAt: z.string(),
  sections: synthesisSectionsSchema,
});

export type SynthesisResult = z.infer<typeof synthesisResultSchema>;

/** Input accepted by the synthesis route. Same-type pairs are allowed. */
export const synthesizeInputSchema = z.object({
  scenario: z.string().min(5, "Please describe your scenario in a little more detail.").max(500),
  types: z.tuple([z.number().int().min(1).max(9), z.number().int().min(1).max(9)]),
  modelId: z.enum(MODEL_IDS).optional(),
});

export type SynthesizeInput = z.infer<typeof synthesizeInputSchema>;
