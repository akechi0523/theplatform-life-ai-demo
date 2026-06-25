// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers for working with streamed/partial LLM JSON. Used by both the
// Flow 1 (analysis.ts) and Flow 2 (synthesis.ts) services so the truncation
// repair and the dev prompt-logging live in exactly one place.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Recovers a truncated JSON string by closing any open structures. */
export function repairTruncatedJson(raw: string): string {
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
 * Dev aid: dump the exact system + user prompt sent to the LLM into a .txt file
 * under `logs/` so it can be inspected verbatim. No-op in production and never
 * throws (best-effort logging must not break a request).
 */
export async function logPromptToFile(
  label: string,
  scenario: string,
  model: string,
  system: string,
  user: string,
) {
  if (process.env.NODE_ENV === "production") return;
  try {
    const dir = join(process.cwd(), "logs");
    await mkdir(dir, { recursive: true });
    // Windows filenames can't contain ":" — use a filesystem-safe timestamp.
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const body = [
      `# LLM PROMPT DUMP (${label})`,
      `timestamp: ${new Date().toISOString()}`,
      `model:     ${model}`,
      `scenario:  ${scenario}`,
      ``,
      `===== SYSTEM PROMPT (${system.length} chars) =====`,
      system,
      ``,
      `===== USER PROMPT (${user.length} chars) =====`,
      user,
      ``,
    ].join("\n");
    await writeFile(join(dir, `${label}-${stamp}.txt`), body, "utf8");
    console.info(`[${label}] prompt written to logs/${label}-${stamp}.txt`);
  } catch (err) {
    console.warn(`[${label}] failed to write prompt log:`, err);
  }
}
