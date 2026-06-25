// ─────────────────────────────────────────────────────────────────────────────
// One-time generator: parses the client's "2023 Relationships Matrix David
// Daniels.pdf" into a static, typed data file the app injects as grounding for
// the Flow 2 (two-type synthesis) prompt. Run from the repo root:
//
//   node scripts/parseRelationshipMatrix.mjs
//
// Requires `pdftotext` on PATH (poppler; ships with Git-for-Windows mingw64).
// The PDF is NEVER read at runtime — only this generated .ts is.
//
// Source structure (verified): 45 pairing headings ("Type N, the X, and Type M,
// the Y" / "...with another Type N"); each has a "Synergies and Challenges |
// Key Conflicts" paragraph and one or two "Relationship Development for X with
// Y" blocks, each with three "•" bullets (Acknowledge / Appreciate / Key Tasks).
// Same-type pairings have a single self-with-self block, mirrored into both
// directions so every output entry is uniformly two-direction.
// ─────────────────────────────────────────────────────────────────────────────

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const PDF = "2023 Relationships Matrix David Daniels.pdf";
const OUT = join("src", "features", "perspectives", "data", "relationshipMatrix.ts");

// Type display-name (singular, lowercased) → number. Matched by substring so
// plurals ("Givers") and multiword names ("Loyal Skeptics") resolve too.
const NAME_TO_NUMBER = [
  ["perfectionist", 1],
  ["giver", 2],
  ["performer", 3],
  ["romantic", 4],
  ["observer", 5],
  ["loyal skeptic", 6],
  ["epicure", 7],
  ["protector", 8],
  ["mediator", 9],
];

function nameToNumber(phrase) {
  const p = phrase.toLowerCase();
  for (const [name, num] of NAME_TO_NUMBER) if (p.includes(name)) return num;
  return null;
}

/** Collapse hard-wrapped lines into flowing prose; trim footer/page noise. */
function clean(s) {
  return s
    .replace(/\r/g, "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

function extractDirection(part) {
  // part looks like: "Perfectionists with Givers:\n\n  • What to Acknowledge…"
  const headMatch = part.match(/^\s*([A-Za-z ]+?)\s+with\s+([A-Za-z ]+?)\s*[:\n]/i);
  const selfType = headMatch ? nameToNumber(headMatch[1]) : null;
  const otherType = headMatch ? nameToNumber(headMatch[2]) : null;

  const bullets = part.split("•").slice(1); // drop the heading chunk
  let acknowledgeSelf = "";
  let appreciateOther = "";
  let keyTasks = "";
  for (const b of bullets) {
    if (/What to Acknowledge/i.test(b)) {
      acknowledgeSelf = stripLabel(b, /What to Acknowledge[^.:\n]*[.:]/i);
    } else if (/What to Appreciate/i.test(b)) {
      appreciateOther = stripLabel(b, /What to Appreciate[^.:\n]*[.:]/i);
    } else if (/Key Tasks/i.test(b)) {
      keyTasks = stripLabel(b, /Key Tasks[^.:\n]*[.:]/i);
    }
  }
  return { selfType, otherType, acknowledgeSelf, appreciateOther, keyTasks };
}

function stripLabel(bullet, labelRe) {
  const m = bullet.match(labelRe);
  const body = m ? bullet.slice(m.index + m[0].length) : bullet;
  return clean(body);
}

function main() {
  const raw = execFileSync("pdftotext", ["-enc", "UTF-8", "-layout", PDF, "-"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });

  // Headings carry stray \r/\f between words; strip those first, drop the
  // repeated copyright footer and the TOC dotted-leader lines, then collapse
  // runs of spaces so each heading sits on one clean line for matching.
  const text = raw
    .replace(/\r/g, "")
    .replace(/\f/g, "\n")
    .split("\n")
    .filter((l) => !/All Rights Reserved \| David Daniels/.test(l))
    .filter((l) => !/\.\s*\.\s*\.\s*\./.test(l)) // TOC dotted leaders
    .join("\n")
    .replace(/[^\S\n]+/g, " "); // collapse all non-newline whitespace (incl. nbsp/tabs)

  // Body pairing headings. Case-SENSITIVE "Type" (Title-case) avoids the
  // ALL-CAPS TOC; captures (firstType, secondType-distinct | secondType-same).
  const headingRe =
    /^ ?Type (\d)[^\n]*?(?:and Type (\d)|with another(?: Type)? (\d))[^\n]*$/gim;

  const headings = [];
  let m;
  while ((m = headingRe.exec(text)) !== null) {
    const a = Number(m[1]);
    const b = Number(m[2] ?? m[3]);
    headings.push({ index: m.index, headingLen: m[0].length, a, b, text: m[0].trim() });
  }

  if (headings.length !== 45) {
    console.error(`Expected 45 pairing headings, found ${headings.length}:`);
    for (const h of headings) console.error(`  [${h.a},${h.b}] ${h.text}`);
    process.exit(1);
  }

  const matrix = {};
  let totalDirectionBlocks = 0;

  headings.forEach((h, i) => {
    const start = h.index + h.headingLen;
    const end = i + 1 < headings.length ? headings[i + 1].index : text.length;
    const block = text.slice(start, end);

    const synMatch = block.match(
      /Synergies and Challenges[^|\n]*\|\s*Key Conflicts:?\s*([\s\S]*?)(?=Relationship Development for)/i,
    );
    const synergiesAndChallenges = synMatch ? clean(synMatch[1]) : "";

    const parts = block.split(/Relationship Development for /i).slice(1);
    totalDirectionBlocks += parts.length;
    const directions = parts.map(extractDirection);

    // Same-type pairings carry one self-with-self block → mirror it into both.
    if (directions.length === 1) directions.push({ ...directions[0] });

    const lo = Math.min(h.a, h.b);
    const hi = Math.max(h.a, h.b);
    // Order directions [lo→hi, hi→lo] for stable rendering.
    directions.sort((x, y) => (x.selfType ?? 0) - (y.selfType ?? 0));

    matrix[`${lo}-${hi}`] = {
      key: `${lo}-${hi}`,
      typeA: lo,
      typeB: hi,
      heading: h.text,
      synergiesAndChallenges,
      directions: directions.slice(0, 2),
    };
  });

  // ── Assertions ──────────────────────────────────────────────────────────────
  const keys = Object.keys(matrix);
  assert(keys.length === 45, `Expected 45 unique pairings, got ${keys.length}`);
  assert(
    totalDirectionBlocks === 81,
    `Expected 81 source direction-blocks (36×2 + 9×1), got ${totalDirectionBlocks}`,
  );
  const problems = [];
  for (const [k, p] of Object.entries(matrix)) {
    if (!p.synergiesAndChallenges) problems.push(`${k}: empty synergies`);
    if (p.directions.length !== 2) problems.push(`${k}: ${p.directions.length} directions`);
    p.directions.forEach((d, di) => {
      if (!d.acknowledgeSelf) problems.push(`${k} dir${di}: empty acknowledgeSelf`);
      if (!d.appreciateOther) problems.push(`${k} dir${di}: empty appreciateOther`);
      if (!d.keyTasks) problems.push(`${k} dir${di}: empty keyTasks`);
      if (!d.selfType || !d.otherType) problems.push(`${k} dir${di}: unresolved type name`);
    });
  }
  if (problems.length) {
    console.warn(`⚠ ${problems.length} field(s) need a hand-fix in ${OUT}:`);
    for (const p of problems) console.warn(`   - ${p}`);
  }

  writeFileSync(OUT, render(matrix), "utf8");
  console.info(
    `✓ Wrote ${OUT}: ${keys.length} pairings, ${totalDirectionBlocks} source blocks` +
      (problems.length ? ` (${problems.length} field(s) flagged above)` : ", all fields populated"),
  );
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

function render(matrix) {
  const sorted = Object.values(matrix).sort(
    (a, b) => a.typeA - b.typeA || a.typeB - b.typeB,
  );
  const entries = sorted
    .map((p) => {
      const dirs = p.directions
        .map(
          (d) =>
            `      { selfType: ${d.selfType}, otherType: ${d.otherType}, ` +
            `acknowledgeSelf: ${q(d.acknowledgeSelf)}, ` +
            `appreciateOther: ${q(d.appreciateOther)}, ` +
            `keyTasks: ${q(d.keyTasks)} }`,
        )
        .join(",\n");
      return (
        `  "${p.key}": {\n` +
        `    key: "${p.key}", typeA: ${p.typeA}, typeB: ${p.typeB},\n` +
        `    heading: ${q(p.heading)},\n` +
        `    synergiesAndChallenges: ${q(p.synergiesAndChallenges)},\n` +
        `    directions: [\n${dirs},\n    ],\n` +
        `  },`
      );
    })
    .join("\n");

  return `// AUTO-GENERATED by scripts/parseRelationshipMatrix.mjs — DO NOT EDIT BY HAND.
// Source: "2023 Relationships Matrix David Daniels.pdf" (© 2015 David Daniels, M.D.).
// 45 type-pairings keyed by sorted "lo-hi"; every entry has two directions
// (same-type pairings mirror their single self-with-self block).

export interface PairingDirection {
  /** The type this guidance is written for. */
  selfType: number;
  /** The partner type. */
  otherType: number;
  /** "What to Acknowledge about Self". */
  acknowledgeSelf: string;
  /** "What to Appreciate in <Other>". */
  appreciateOther: string;
  /** "Key Tasks for Building and Sustaining Relationship". */
  keyTasks: string;
}

export interface RelationshipPairing {
  /** Sorted "lo-hi" key, e.g. "2-5"; same-type "8-8". */
  key: string;
  typeA: number; // lower
  typeB: number; // higher (== typeA for same-type)
  heading: string;
  synergiesAndChallenges: string;
  /** Always two directions (same-type are mirrored). */
  directions: [PairingDirection, PairingDirection];
}

export const RELATIONSHIP_MATRIX: Record<string, RelationshipPairing> = {
${entries}
};

/** Sorted composite key so getPairing(a,b) === getPairing(b,a). */
export function pairKey(a: number, b: number): string {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return \`\${lo}-\${hi}\`;
}

/** Deterministic lookup of the matrix entry for an unordered type pair. */
export function getPairing(a: number, b: number): RelationshipPairing | null {
  return RELATIONSHIP_MATRIX[pairKey(a, b)] ?? null;
}
`;
}

/** JSON-string-quote for safe embedding in the generated TS. */
function q(s) {
  return JSON.stringify(s ?? "");
}

main();
