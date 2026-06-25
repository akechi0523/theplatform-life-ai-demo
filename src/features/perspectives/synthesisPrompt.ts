import { PERSPECTIVE_TYPES, securityPathLabel, stressPathLabel, taglineFor } from "./data/types";
import type { RelationshipPairing } from "./data/relationshipMatrix";

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder for Flow 2 — the two-type combined synthesis.
//
// Unlike Flow 1 (nine independent cards), this produces ONE flowing essay that
// weaves two types together for the user's scenario, in five titled sections.
// The static rules + section spec live in SYNTHESIS_SYSTEM_PROMPT (byte-stable
// for prompt-cache benefit); the per-request facts — the two types' canonical
// names/shift paths and the David Daniels Relationships Matrix grounding for
// this exact pair — go in the user prompt.
//
// Same terminology guardrails as Flow 1: never "Enneagram"; "unaware"/"aware";
// "shifts toward"; "Type N".
// ─────────────────────────────────────────────────────────────────────────────

export const SYNTHESIS_SYSTEM_PROMPT = `You are an expert in the 360° of Perspectives — a framework describing nine distinct perspective types, each with a core worldview and predictable shifts under stress and in security.

Your task here is different from a per-type breakdown: given a scenario and TWO types, write a single, flowing COMBINED SYNTHESIS that weaves the two types together — how they meet, clash, and complement each other in this specific scenario. Treat them as two people (or two facets) in the same situation, not as two separate analyses placed side by side.

Rules:
- Be specific to the user's exact scenario. Never give generic, textbook descriptions.
- Weave the two types together in every section — compare, contrast, and show their interplay.
- Write rich, flowing prose (one to three substantial paragraphs per section). This is an essay, not bullet points.
- Tone: analytical yet deeply empathetic and humane.
- Use the word "type" throughout (e.g. "Type 4"). Never use the word "Enneagram".
- When describing pressure, use "unaware" (never "unhealthy"). When describing safety, use "aware" (never "healthy").
- Use "shifts toward" (never "disintegrates" or "integrates") when describing movement between types.
- A "Relationship dynamics reference" grounded in source material is provided. Let it inform the synergies, tensions, and growth tasks you describe, but DO NOT quote it verbatim or list its bullets — absorb it into the prose.
- Return ONLY valid JSON matching the schema. No markdown, no commentary.

Return an object with these fields, in EXACTLY this order:
- title (a short, evocative title naming both types and the scenario, e.g. "The Giver and the Observer buying a home together")
- inScenario (section "In the shared scenario": each type's core worldview as it shows up in THIS scenario, and how the two orientations meet)
- underPressure (section "Under pressure — when unaware": weave BOTH types' stress shifts together; reference each type's stress shift explicitly; use the word "unaware" and "shifts toward")
- inSecurity (section "In security — when aware": weave BOTH types' security shifts together; reference each type's security shift explicitly; use the word "aware" and "shifts toward")
- sharedInvitation (section "The shared invitation": the growth task this pairing shares, approached from each side — a hopeful, grounded close)

Return JSON of the form: { "title": "…", "inScenario": "…", "underPressure": "…", "inSecurity": "…", "sharedInvitation": "…" }`;

function typeFacts(n: number): string {
  const t = PERSPECTIVE_TYPES[n];
  return `Type ${n} = "${t.name}" | tagline: "${taglineFor(n)}" | core traits: ${t.traits} | ${stressPathLabel(
    n,
  )} | ${securityPathLabel(n)}`;
}

function groundingBlock(pairing: RelationshipPairing | null, typeA: number, typeB: number): string {
  if (!pairing) {
    return "Relationship dynamics reference: (none on file — rely on the two types' core dynamics above.)";
  }

  const sameType = typeA === typeB;
  const lines: string[] = [
    "Relationship dynamics reference (grounding — absorb into the prose, do NOT quote verbatim):",
    `Synergies & key conflicts: ${pairing.synergiesAndChallenges}`,
  ];

  if (sameType) {
    const d = pairing.directions[0];
    lines.push(
      `Both people share Type ${typeA}; describe how two Type-${typeA} people mirror and amplify each other.`,
      `What each needs to acknowledge in themselves: ${d.acknowledgeSelf}`,
      `What each can appreciate in the other: ${d.appreciateOther}`,
      `Key tasks for the relationship: ${d.keyTasks}`,
    );
  } else {
    for (const d of pairing.directions) {
      const self = PERSPECTIVE_TYPES[d.selfType]?.name ?? `Type ${d.selfType}`;
      const other = PERSPECTIVE_TYPES[d.otherType]?.name ?? `Type ${d.otherType}`;
      lines.push(
        `For the ${self} (Type ${d.selfType}) relating to the ${other} (Type ${d.otherType}):`,
        `  • Acknowledge in self: ${d.acknowledgeSelf}`,
        `  • Appreciate in the other: ${d.appreciateOther}`,
        `  • Key tasks: ${d.keyTasks}`,
      );
    }
  }
  return lines.join("\n");
}

export function buildSynthesisUserPrompt(
  scenario: string,
  typeA: number,
  typeB: number,
  pairing: RelationshipPairing | null,
): string {
  const sameType = typeA === typeB;
  const header = sameType
    ? `Two people who both lead with Type ${typeA} in this scenario.`
    : `Two types to synthesize: Type ${typeA} and Type ${typeB}.`;

  return [
    `Scenario: "${scenario}"`,
    "",
    header,
    typeFacts(typeA),
    ...(sameType ? [] : [typeFacts(typeB)]),
    "",
    groundingBlock(pairing, typeA, typeB),
  ].join("\n");
}

/** JSON schema handed to the LLM for structured output (OpenAI-compatible). */
export const SYNTHESIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  // Order matters: title first so the heading renders the instant it closes;
  // sections then stream in reading order.
  required: ["title", "inScenario", "underPressure", "inSecurity", "sharedInvitation"],
  properties: {
    title: { type: "string" },
    inScenario: { type: "string" },
    underPressure: { type: "string" },
    inSecurity: { type: "string" },
    sharedInvitation: { type: "string" },
  },
} as const;
