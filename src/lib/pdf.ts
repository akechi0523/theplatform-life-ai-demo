import { jsPDF } from "jspdf";
import type { AnalysisResult, PerspectiveTypeAnalysis } from "@/features/perspectives/data/schema";
import { PDF_PAGES } from "@/features/perspectives/data/types";

// ─────────────────────────────────────────────────────────────────────────────
// PDF export. Per the brief, each page holds exactly 3 perspectives in triad
// order:  Page 1 → Giver, Performer, Romantic (2,3,4)
//         Page 2 → Observer, Loyal Skeptic, Epicure (5,6,7)
//         Page 3 → Boss, Mediator, Perfectionist (8,9,1)
// ─────────────────────────────────────────────────────────────────────────────

const MARGIN = 48;
const LINE = 15;

export function downloadAnalysisPdf(result: AnalysisResult) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;

  const byNumber = new Map(result.types.map((t) => [t.typeNumber, t]));

  PDF_PAGES.forEach((typeNumbers, pageIndex) => {
    if (pageIndex > 0) doc.addPage();
    let y = MARGIN;

    // ── Header ────────────────────────────────────────────────────────────────
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.text("ThePlatform.life AI", MARGIN, y);
    y += LINE + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    const scenarioLines = doc.splitTextToSize(`Scenario: ${result.scenario}`, contentWidth);
    doc.text(scenarioLines, MARGIN, y);
    y += scenarioLines.length * 12 + 10;
    doc.setTextColor(20);

    // ── The three perspectives on this page ─────────────────────────────────────
    typeNumbers.forEach((n) => {
      const t = byNumber.get(n);
      if (!t) return;
      y = renderType(doc, t, MARGIN, y, contentWidth, pageHeight);
      y += 14;
    });

    // ── Footer ──────────────────────────────────────────────────────────────────
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `360° of Perspectives · Page ${pageIndex + 1} of ${PDF_PAGES.length}`,
      MARGIN,
      pageHeight - 24,
    );
    doc.setTextColor(20);
  });

  const safe = result.scenario.slice(0, 40).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`perspectives-${safe || "analysis"}.pdf`);
}

function renderType(
  doc: jsPDF,
  t: PerspectiveTypeAnalysis,
  x: number,
  startY: number,
  width: number,
  pageHeight: number,
): number {
  let y = startY;

  const para = (label: string, body: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(label, x, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(body, width);
    doc.text(lines, x, y);
    y += lines.length * 11 + 6;
  };

  // Title
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text(`Type ${t.typeNumber} · ${t.typeName}`, x, y);
  y += 13;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(110);
  doc.text(t.tagline, x, y);
  doc.setTextColor(20);
  y += 14;

  para("Scenario-Specific Outlook on Life", t.scenarioOutlook);
  para(`Stress Response  (${t.stressPath})`, t.stressResponse);
  para(`Security Response  (${t.securityPath})`, t.securityResponse);

  // Light divider
  doc.setDrawColor(225);
  doc.line(x, y - 2, x + width, y - 2);

  return Math.min(y, pageHeight - MARGIN);
}
