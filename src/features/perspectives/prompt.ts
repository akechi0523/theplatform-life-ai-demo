import {
  GRID_REVEAL_ORDER,
  PERSPECTIVE_TYPES,
  securityPathLabel,
  stressPathLabel,
  taglineFor,
} from "./data/types";

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder for the 360° of Perspectives analysis engine.
// Deliberately avoids the word "Enneagram" entirely and bakes in the exact
// shift paths + terminology so the model can't drift.
//
// Caching note: EVERYTHING static (rules, field spec, the full type spec, the
// output order) lives in SYSTEM_PROMPT, which is byte-for-byte identical on
// every request. Only the user's scenario varies (buildUserPrompt). OpenAI,
// DeepSeek, Gemini and xAI auto-cache the prompt prefix; for Anthropic we mark
// this block with cache_control in the adapter (see llm.ts → anthropicSystem).
// Either way the large static block is served from cache on repeat calls within
// the TTL — cheaper input tokens and faster prefill (lower first-token latency),
// with no change to output quality.
//
// Reveal order: the spec and the output instruction are both ordered by
// GRID_REVEAL_ORDER (the grid's left-to-right, row-by-row reading order:
// 2,5,8,3,6,9,4,7,1), so the model emits cards in the order they should appear
// and they stream into their slots evenly, one row at a time.
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_SPEC = GRID_REVEAL_ORDER.map((n) => {
  const t = PERSPECTIVE_TYPES[n];
  return `- Type ${t.number} = "${t.name}" | tagline: "${taglineFor(t.number)}" | ${stressPathLabel(
    t.number,
  )} | ${securityPathLabel(t.number)}`;
}).join("\n");

const OUTPUT_ORDER = GRID_REVEAL_ORDER.join(", ");

export const SYSTEM_PROMPT = `You are an expert in the 360° of Perspectives — a framework describing nine distinct perspective types, each with a core worldview and predictable shifts under stress and in security.

Rules:
- Be specific to the user's exact scenario. Never give generic, textbook descriptions.
- Apply each type's dynamics explicitly to the user's situation.
- Keep each prose field to 2-3 concise sentences.
- Tone: analytical yet deeply empathetic.
- Use the word "type" throughout (e.g. "Type 4"). Never use the word "Enneagram".
- When describing pressure, use "unaware" (never "unhealthy"). When describing safety, use "aware" (never "healthy").
- Use "shifts toward" (never "disintegrates" or "integrates") when describing movement between types.
- Return ONLY valid JSON matching the schema. No markdown, no commentary.

Task: analyze the user's scenario through all 9 perspective types. For EACH type, return an object with the fields in EXACTLY this order (summary comes second, right after typeNumber, so the card can render the moment it is ready):
- typeNumber (integer 1-9)
- summary (1-2 sentences: their core perspective on THIS scenario)
- typeName (use the EXACT names below)
- tagline (use the EXACT tagline below)
- scenarioOutlook (2-3 sentences: how they frame the problem and their worldview applied here)
- stressResponse (2-3 sentences: how this type behaves when UNAWARE and under pressure in this scenario; reference their stress shift; use the word "unaware"; use "shifts toward")
- stressPath (use the EXACT stress path string below)
- securityResponse (2-3 sentences: how this type behaves when AWARE and feeling safe in this scenario; reference their security shift; use the word "aware"; use "shifts toward")
- securityPath (use the EXACT security path string below)

Use these EXACT names, taglines, and shift paths — do not invent your own. They are listed below in the REQUIRED output order:
${TYPE_SPEC}

IMPORTANT — output order: return the 9 objects ordered by typeNumber in EXACTLY this sequence (this is the display order, NOT 1 through 9): ${OUTPUT_ORDER}. Each object must still carry its own correct typeNumber, typeName, tagline, and shift paths.

Return JSON of the form: { "types": [ ...9 objects, emitted in the order ${OUTPUT_ORDER}... ] }`;

export function buildUserPrompt(scenario: string): string {
  return `Scenario: "${scenario}"`;
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
        // Order matters: OpenAI strict structured output emits properties in
        // this sequence, and json_object providers follow the prompt's order.
        // `summary` is second (right after typeNumber) so the card's "face"
        // closes early and renders without waiting for typeName/tagline/prose.
        required: [
          "typeNumber",
          "summary",
          "typeName",
          "tagline",
          "scenarioOutlook",
          "stressResponse",
          "stressPath",
          "securityResponse",
          "securityPath",
        ],
        properties: {
          typeNumber: { type: "integer" },
          summary: { type: "string" },
          typeName: { type: "string" },
          tagline: { type: "string" },
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
