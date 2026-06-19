import { PERSPECTIVE_TYPES, securityPathLabel, stressPathLabel, taglineFor } from "./data/types";

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder for the 360° of Perspectives analysis engine.
// Deliberately avoids the word "Enneagram" entirely and bakes in the exact
// shift paths + terminology so the model can't drift.
// ─────────────────────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are an expert in the 360° of Perspectives — a framework describing nine distinct perspective types, each with a core worldview and predictable shifts under stress and in security.

Rules:
- Be specific to the user's exact scenario. Never give generic, textbook descriptions.
- Apply each type's dynamics explicitly to the user's situation.
- Keep each prose field to 2-3 concise sentences.
- Tone: analytical yet deeply empathetic.
- Use the word "type" throughout (e.g. "Type 4"). Never use the word "Enneagram".
- When describing pressure, use "unaware" (never "unhealthy"). When describing safety, use "aware" (never "healthy").
- Use "shifts toward" (never "disintegrates" or "integrates") when describing movement between types.
- Return ONLY valid JSON matching the schema. No markdown, no commentary.`;

const TYPE_SPEC = Object.values(PERSPECTIVE_TYPES)
  .map((t) => {
    return `- Type ${t.number} = "${t.name}" | tagline: "${taglineFor(t.number)}" | ${stressPathLabel(
      t.number,
    )} | ${securityPathLabel(t.number)}`;
  })
  .join("\n");

export function buildUserPrompt(scenario: string): string {
  return `Scenario: "${scenario}"

Analyze this scenario through all 9 perspective types. For EACH type, return an object with exactly these fields:
- typeNumber (integer 1-9)
- typeName (use the EXACT names below)
- tagline (use the EXACT tagline below)
- summary (1-2 sentences: their core perspective on THIS scenario)
- scenarioOutlook (2-3 sentences: how they frame the problem and their worldview applied here)
- stressResponse (2-3 sentences: how this type behaves when UNAWARE and under pressure in this scenario; reference their stress shift; use the word "unaware"; use "shifts toward")
- stressPath (use the EXACT stress path string below)
- securityResponse (2-3 sentences: how this type behaves when AWARE and feeling safe in this scenario; reference their security shift; use the word "aware"; use "shifts toward")
- securityPath (use the EXACT security path string below)

Use these EXACT names, taglines, and shift paths — do not invent your own:
${TYPE_SPEC}

Return JSON of the form: { "types": [ ...9 objects, one per type, ordered 1 through 9... ] }`;
}

/** JSON schema handed to the LLM for structured output (OpenAI-compatible). */
export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["types"],
  properties: {
    types: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "typeNumber",
          "typeName",
          "tagline",
          "summary",
          "scenarioOutlook",
          "stressResponse",
          "stressPath",
          "securityResponse",
          "securityPath",
        ],
        properties: {
          typeNumber: { type: "integer" },
          typeName: { type: "string" },
          tagline: { type: "string" },
          summary: { type: "string" },
          scenarioOutlook: { type: "string" },
          stressResponse: { type: "string" },
          stressPath: { type: "string" },
          securityResponse: { type: "string" },
          securityPath: { type: "string" },
        },
      },
    },
  },
} as const;
