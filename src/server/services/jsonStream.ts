// ─────────────────────────────────────────────────────────────────────────────
// Incremental extractor for the streamed analysis JSON.
//
// The model streams one object of the shape: { "types": [ {…}, {…}, … ] }.
// We can't JSON.parse a partial document, so this scanner walks the growing
// buffer character-by-character and surfaces two things per type object:
//
//   • a "face" — the leading fields up to and including `summary`, emitted the
//     moment `summary` closes, so a card can render without waiting for the
//     heavier prose fields (scenarioOutlook / stress / security) that follow.
//   • the "completed" object — once it fully closes, for the canonical result.
//
// Depth model (whitespace-insensitive, string-aware):
//   root `{`            → depth 1
//   `"types": [`        → depth 2   (the array level)
//   a type object `{`   → depth 3   (its fields are flat strings/numbers)
//
// Field order is fixed by the schema/prompt:
//   typeNumber, summary, typeName, tagline, scenarioOutlook, …
// `summary` is deliberately the 2nd field (typeName/tagline are filled locally
// from metadata), so the 2nd object-level comma (one not inside a string)
// terminates `summary` — the face closes as early as possible.
// ─────────────────────────────────────────────────────────────────────────────

/** Object-level commas seen once `summary` (the 2nd field) is complete. */
const COMMAS_THROUGH_SUMMARY = 2;

export interface StreamParseOutput {
  /** JSON strings of objects whose face (through `summary`) just became available. */
  faces: string[];
  /** JSON strings of fully-closed type objects. */
  completed: string[];
}

export class PerspectiveStreamParser {
  private buf = "";
  private i = 0;
  private depth = 0;
  private inString = false;
  private escape = false;
  private objStart = -1;
  private objCommas = 0;
  private faceEmitted = false;

  /** Feed the next text delta; returns any faces/objects that became available. */
  push(chunk: string): StreamParseOutput {
    this.buf += chunk;
    const faces: string[] = [];
    const completed: string[] = [];

    for (; this.i < this.buf.length; this.i++) {
      const ch = this.buf[this.i];

      if (this.escape) {
        this.escape = false;
        continue;
      }
      if (ch === "\\") {
        this.escape = true;
        continue;
      }
      if (ch === '"') {
        this.inString = !this.inString;
        continue;
      }
      if (this.inString) continue;

      if (ch === "{" || ch === "[") {
        this.depth++;
        if (ch === "{" && this.depth === 3 && this.objStart === -1) {
          this.objStart = this.i;
          this.objCommas = 0;
          this.faceEmitted = false;
        }
        continue;
      }
      if (ch === "}" || ch === "]") {
        this.depth--;
        if (ch === "}" && this.depth === 2 && this.objStart !== -1) {
          completed.push(this.buf.slice(this.objStart, this.i + 1));
          this.objStart = -1;
        }
        continue;
      }
      if (ch === "," && this.depth === 3 && this.objStart !== -1) {
        this.objCommas++;
        // The comma after `summary` means the face fields are all complete.
        if (this.objCommas === COMMAS_THROUGH_SUMMARY && !this.faceEmitted) {
          this.faceEmitted = true;
          // Slice up to (not including) this comma and close the object.
          faces.push(this.buf.slice(this.objStart, this.i) + "}");
        }
        continue;
      }
    }

    return { faces, completed };
  }

  /** The full text accumulated so far (used for a final whole-document parse). */
  raw(): string {
    return this.buf;
  }
}
