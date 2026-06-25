import type { SynthesisSections } from "@/features/perspectives/data/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Incremental extractor for the streamed synthesis JSON.
//
// The model streams one flat object: { "title": "…", "inScenario": "…", … }.
// We can't JSON.parse a partial document, so this scanner walks the growing
// buffer character-by-character (string-aware) and emits each top-level string
// VALUE the instant its closing quote arrives — so a section can render the
// moment it finishes, mirroring Flow 1's "reveal a unit as soon as it's ready".
//
// Order-agnostic: it keys on whatever field name precedes each value, so a model
// that reorders fields still streams correctly; the client merges by field name.
// ─────────────────────────────────────────────────────────────────────────────

const FIELDS = new Set<keyof SynthesisSections>([
  "title",
  "inScenario",
  "underPressure",
  "inSecurity",
  "sharedInvitation",
]);

export interface SynthesisField {
  field: keyof SynthesisSections;
  value: string;
}

/** JSON-unescape a quoted string slice (e.g. `"a\\nb"` → `a<newline>b`). */
function unquote(rawWithQuotes: string): string | null {
  try {
    const v = JSON.parse(rawWithQuotes);
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

export class SynthesisStreamParser {
  private buf = "";
  private i = 0;
  private depth = 0;
  private inString = false;
  private escape = false;
  private stringStart = -1;
  /** What the NEXT top-level string represents. */
  private expecting: "key" | "value" | "other" = "other";
  private pendingKey: string | null = null;
  private emitted = new Set<string>();
  private sections: Partial<SynthesisSections> = {};

  /** Feed the next text delta; returns any section values that just closed. */
  push(chunk: string): SynthesisField[] {
    this.buf += chunk;
    const out: SynthesisField[] = [];

    for (; this.i < this.buf.length; this.i++) {
      const ch = this.buf[this.i];

      if (this.inString) {
        if (this.escape) { this.escape = false; continue; }
        if (ch === "\\") { this.escape = true; continue; }
        if (ch !== '"') continue;

        // String closed.
        this.inString = false;
        const raw = this.buf.slice(this.stringStart, this.i + 1);
        if (this.expecting === "key") {
          this.pendingKey = unquote(raw);
          this.expecting = "other"; // await the colon
        } else if (this.expecting === "value") {
          const key = this.pendingKey;
          const val = unquote(raw);
          this.pendingKey = null;
          this.expecting = "other";
          if (key && val !== null && (FIELDS as Set<string>).has(key) && !this.emitted.has(key)) {
            const field = key as keyof SynthesisSections;
            this.emitted.add(key);
            this.sections[field] = val;
            out.push({ field, value: val });
          }
        }
        continue;
      }

      // Outside a string.
      if (ch === '"') {
        this.inString = true;
        this.stringStart = this.i;
        if (this.depth === 1 && this.expecting !== "value") this.expecting = "key";
        continue;
      }
      if (ch === "{" || ch === "[") {
        this.depth++;
        if (ch === "{" && this.depth === 1) this.expecting = "key";
        continue;
      }
      if (ch === "}" || ch === "]") {
        this.depth--;
        continue;
      }
      if (ch === ":" && this.depth === 1) { this.expecting = "value"; continue; }
      if (ch === "," && this.depth === 1) { this.expecting = "key"; continue; }
    }

    return out;
  }

  /** The full text accumulated so far (used for a final whole-document parse). */
  raw(): string {
    return this.buf;
  }

  /** Sections successfully streamed so far (for fallback recovery). */
  collected(): Partial<SynthesisSections> {
    return this.sections;
  }
}
