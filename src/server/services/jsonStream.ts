// ─────────────────────────────────────────────────────────────────────────────
// Incremental extractor for the streamed analysis JSON.
//
// The model streams one object of the shape: { "types": [ {…}, {…}, … ] }.
// We can't JSON.parse a partial document, so this scanner walks the growing
// buffer character-by-character and slices out each top-level element of the
// `types` array the moment it closes — letting the route emit perspectives as
// they arrive instead of waiting for the whole payload.
//
// Depth model (whitespace-insensitive, string-aware):
//   root `{`            → depth 1
//   `"types": [`        → depth 2   (the array level)
//   a type object `{`   → depth 3   (its fields are flat strings/numbers)
// So a complete type object is the slice between a `{` that takes us 2→3 and the
// matching `}` that brings us 3→2.
// ─────────────────────────────────────────────────────────────────────────────

export class PerspectiveStreamParser {
  private buf = "";
  private i = 0;
  private depth = 0;
  private inString = false;
  private escape = false;
  private objStart = -1;

  /**
   * Feed the next text delta; returns the raw JSON strings of any type objects
   * that became complete in this chunk (zero or more). Callers parse/validate.
   */
  push(chunk: string): string[] {
    this.buf += chunk;
    const out: string[] = [];

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
        // A `{` that opens at the array level begins a type object.
        if (ch === "{" && this.depth === 3 && this.objStart === -1) {
          this.objStart = this.i;
        }
        continue;
      }
      if (ch === "}" || ch === "]") {
        this.depth--;
        // A `}` that returns us to the array level closes a type object.
        if (ch === "}" && this.depth === 2 && this.objStart !== -1) {
          out.push(this.buf.slice(this.objStart, this.i + 1));
          this.objStart = -1;
        }
        continue;
      }
    }

    return out;
  }

  /** The full text accumulated so far (used for a final whole-document parse). */
  raw(): string {
    return this.buf;
  }
}
