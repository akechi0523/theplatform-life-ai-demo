// ─────────────────────────────────────────────────────────────────────────────
// Incremental extractor for the streamed analysis JSON.
//
// The model streams one object of the shape: { "types": [ {…}, {…}, … ] }.
// We can't JSON.parse a partial document, so this scanner walks the growing
// buffer character-by-character and surfaces THREE things per type object:
//
//   • `started`  — the type's number, the instant `typeNumber` (the 1st field)
//                  is known. The card shell can render immediately (name,
//                  tagline and shift paths are filled from local metadata),
//                  ~1s before the summary even finishes.
//   • `summaryDeltas` — decoded text of the `summary` value as it streams in,
//                  so the card's summary visibly types out instead of popping in
//                  fully formed.
//   • `completed` — the fully-closed type object, for the canonical prose.
//
// Depth model (whitespace-insensitive, string-aware):
//   root `{`            → depth 1
//   `"types": [`        → depth 2   (the array level)
//   a type object `{`   → depth 3   (its fields are flat strings/numbers)
//
// Field order is fixed by the schema/prompt: typeNumber, summary, typeName, …
// so the 1st object-level comma terminates `typeNumber`, and `summary` is the
// first string VALUE that follows.
// ─────────────────────────────────────────────────────────────────────────────

export interface StreamParseOutput {
  /** Type numbers whose `typeNumber` just became known (render the shell now). */
  started: number[];
  /** Newly-decoded `summary` text fragments, keyed by type number. */
  summaryDeltas: Array<{ typeNumber: number; text: string }>;
  /** JSON strings of fully-closed type objects (canonical prose). */
  completed: string[];
}

/** Decodes a (possibly partial) JSON string body — stops before a trailing incomplete escape. */
export function decodeJsonString(raw: string): string {
  let out = "";
  for (let k = 0; k < raw.length; k++) {
    const c = raw[k];
    if (c !== "\\") {
      out += c;
      continue;
    }
    const n = raw[k + 1];
    if (n === undefined) break; // incomplete escape — wait for more input
    switch (n) {
      case '"': out += '"'; k++; break;
      case "\\": out += "\\"; k++; break;
      case "/": out += "/"; k++; break;
      case "n": out += "\n"; k++; break;
      case "t": out += "\t"; k++; break;
      case "r": out += "\r"; k++; break;
      case "b": out += "\b"; k++; break;
      case "f": out += "\f"; k++; break;
      case "u": {
        const hex = raw.slice(k + 2, k + 6);
        if (hex.length < 4) return out; // incomplete \uXXXX — wait
        out += String.fromCharCode(parseInt(hex, 16));
        k += 5;
        break;
      }
      default: out += n; k++; break;
    }
  }
  return out;
}

export class PerspectiveStreamParser {
  private buf = "";
  private i = 0;
  private depth = 0;
  private inString = false;
  private escape = false;

  private objStart = -1;
  private objCommas = 0;
  private currentType: number | null = null;
  private startedEmitted = false;

  // Last structural delimiter at object level ('{', ',' or ':') — distinguishes
  // a key string (follows '{' or ',') from a value string (follows ':').
  private lastDelim = "";
  private collectingKey = false;
  private keyBuf = "";
  private currentKey = "";

  // Summary-value streaming state.
  private inSummaryValue = false;
  private summaryRaw = "";
  private summaryEmitted = 0;

  /** Feed the next text delta; returns any shells/summary-text/objects now available. */
  push(chunk: string): StreamParseOutput {
    this.buf += chunk;
    const started: number[] = [];
    const summaryDeltas: Array<{ typeNumber: number; text: string }> = [];
    const completed: string[] = [];

    const flushSummary = () => {
      if (this.currentType == null) return;
      const decoded = decodeJsonString(this.summaryRaw);
      if (decoded.length > this.summaryEmitted) {
        summaryDeltas.push({ typeNumber: this.currentType, text: decoded.slice(this.summaryEmitted) });
        this.summaryEmitted = decoded.length;
      }
    };

    for (; this.i < this.buf.length; this.i++) {
      const ch = this.buf[this.i];

      // ── Inside a string: handle escapes + content accumulation ──
      if (this.escape) {
        this.escape = false;
        if (this.inSummaryValue) {
          this.summaryRaw += ch;
          flushSummary();
        } else if (this.collectingKey) {
          this.keyBuf += ch;
        }
        continue;
      }
      if (ch === "\\") {
        this.escape = true;
        if (this.inSummaryValue) this.summaryRaw += "\\";
        continue;
      }
      if (ch === '"') {
        if (!this.inString) {
          this.inString = true;
          if (this.depth === 3 && this.objStart !== -1) {
            const isValue = this.lastDelim === ":";
            if (isValue && this.currentKey === "summary") {
              this.inSummaryValue = true;
              this.summaryRaw = "";
              this.summaryEmitted = 0;
            } else if (!isValue) {
              this.collectingKey = true;
              this.keyBuf = "";
            }
          }
        } else {
          this.inString = false;
          if (this.inSummaryValue) {
            flushSummary();
            this.inSummaryValue = false;
          } else if (this.collectingKey) {
            this.currentKey = this.keyBuf;
            this.collectingKey = false;
          }
        }
        continue;
      }
      if (this.inString) {
        if (this.inSummaryValue) {
          this.summaryRaw += ch;
          flushSummary();
        } else if (this.collectingKey) {
          this.keyBuf += ch;
        }
        continue;
      }

      // ── Structural characters (outside any string) ──
      if (ch === "{" || ch === "[") {
        this.depth++;
        if (ch === "{" && this.depth === 3 && this.objStart === -1) {
          this.objStart = this.i;
          this.objCommas = 0;
          this.currentType = null;
          this.startedEmitted = false;
          this.currentKey = "";
          this.lastDelim = "{";
        }
        continue;
      }
      if (ch === "}" || ch === "]") {
        this.depth--;
        if (ch === "}" && this.depth === 2 && this.objStart !== -1) {
          completed.push(this.buf.slice(this.objStart, this.i + 1));
          this.objStart = -1;
          this.currentType = null;
        }
        continue;
      }
      if (this.depth === 3 && this.objStart !== -1) {
        if (ch === ",") {
          this.objCommas++;
          this.lastDelim = ",";
          // The 1st object-level comma closes `typeNumber` — extract it and
          // signal that the card shell can render.
          if (this.objCommas === 1 && !this.startedEmitted) {
            const m = this.buf.slice(this.objStart, this.i).match(/"typeNumber"\s*:\s*(\d+)/);
            if (m) {
              this.currentType = parseInt(m[1], 10);
              this.startedEmitted = true;
              started.push(this.currentType);
            }
          }
        } else if (ch === ":") {
          this.lastDelim = ":";
        }
        continue;
      }
    }

    return { started, summaryDeltas, completed };
  }

  /** The full text accumulated so far (used for a final whole-document parse). */
  raw(): string {
    return this.buf;
  }
}
