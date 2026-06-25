import type { SynthesisSections } from "@/features/perspectives/data/schema";
import { decodeJsonString } from "./jsonStream";

// ─────────────────────────────────────────────────────────────────────────────
// Incremental extractor for the streamed synthesis JSON.
//
// The model streams one flat object: { "title": "…", "inScenario": "…", … }.
// We can't JSON.parse a partial document, so this scanner walks the growing
// buffer character-by-character (string-aware) and emits TOKEN-LEVEL deltas of
// each recognized section's value AS IT STREAMS — so the long essay sections
// type out live instead of appearing only once each section closes.
//
// Order-agnostic: it keys deltas on whatever field name precedes each value, so
// a model that reorders fields still streams correctly; the client appends by
// field name.
// ─────────────────────────────────────────────────────────────────────────────

const FIELDS = new Set<keyof SynthesisSections>([
  "title",
  "inScenario",
  "underPressure",
  "inSecurity",
  "sharedInvitation",
]);

export interface SynthesisDelta {
  field: keyof SynthesisSections;
  /** Newly-decoded text appended to this section. */
  delta: string;
}

export class SynthesisStreamParser {
  private buf = "";
  private i = 0;
  private depth = 0;
  private inString = false;
  private escape = false;

  // Last structural delimiter at object level ('{', ',' or ':') — distinguishes
  // a key string (follows '{' or ',') from a value string (follows ':').
  private lastDelim = "";
  private collectingKey = false;
  private keyBuf = "";
  private currentKey = "";

  // Value-streaming state for the field currently being emitted.
  private inValue = false;
  private valueField: keyof SynthesisSections | null = null;
  private valueRaw = "";
  private valueEmitted = 0;

  /** Decoded text accumulated per field (for fallback recovery). */
  private sections: Partial<SynthesisSections> = {};

  /** Feed the next text delta; returns any newly-decoded section fragments. */
  push(chunk: string): SynthesisDelta[] {
    this.buf += chunk;
    const out: SynthesisDelta[] = [];

    const flush = () => {
      if (!this.valueField) return;
      const decoded = decodeJsonString(this.valueRaw);
      if (decoded.length > this.valueEmitted) {
        const delta = decoded.slice(this.valueEmitted);
        this.valueEmitted = decoded.length;
        this.sections[this.valueField] = (this.sections[this.valueField] ?? "") + delta;
        out.push({ field: this.valueField, delta });
      }
    };

    for (; this.i < this.buf.length; this.i++) {
      const ch = this.buf[this.i];

      // ── Inside a string: escapes + content accumulation ──
      if (this.escape) {
        this.escape = false;
        if (this.inValue) {
          this.valueRaw += ch;
          flush();
        } else if (this.collectingKey) {
          this.keyBuf += ch;
        }
        continue;
      }
      if (ch === "\\") {
        this.escape = true;
        if (this.inValue) this.valueRaw += "\\";
        continue;
      }
      if (ch === '"') {
        if (!this.inString) {
          this.inString = true;
          if (this.depth === 1) {
            const isValue = this.lastDelim === ":";
            if (isValue && this.currentKey && (FIELDS as Set<string>).has(this.currentKey)) {
              this.inValue = true;
              this.valueField = this.currentKey as keyof SynthesisSections;
              this.valueRaw = "";
              this.valueEmitted = 0;
            } else if (!isValue) {
              this.collectingKey = true;
              this.keyBuf = "";
            }
          }
        } else {
          this.inString = false;
          if (this.inValue) {
            flush();
            this.inValue = false;
            this.valueField = null;
          } else if (this.collectingKey) {
            this.currentKey = this.keyBuf;
            this.collectingKey = false;
          }
        }
        continue;
      }
      if (this.inString) {
        if (this.inValue) {
          this.valueRaw += ch;
          flush();
        } else if (this.collectingKey) {
          this.keyBuf += ch;
        }
        continue;
      }

      // ── Structural characters (outside any string) ──
      if (ch === "{" || ch === "[") {
        this.depth++;
        if (ch === "{" && this.depth === 1) this.lastDelim = "{";
        continue;
      }
      if (ch === "}" || ch === "]") {
        this.depth--;
        continue;
      }
      if (this.depth === 1) {
        if (ch === ":") this.lastDelim = ":";
        else if (ch === ",") this.lastDelim = ",";
      }
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
