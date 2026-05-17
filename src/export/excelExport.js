/**
 * Excel export — generates a self-contained forensic investigation .xlsx workbook.
 *
 * Uses SheetJS (dynamic import) for workbook structure + JSZip (dynamic import)
 * for post-processing cell fills into the .xlsx ZIP.
 *
 * SheetJS community edition (0.18.5) does NOT persist cell styles on write,
 * so we: (1) build the workbook with SheetJS, (2) serialise to ArrayBuffer,
 * (3) open with JSZip, (4) patch xl/styles.xml to add fill entries,
 * (5) patch worksheet XML to assign style indices to coloured cells + legend,
 * (6) inject frozen panes, (7) save as Blob → download.
 *
 * @module export/excelExport
 */

import { MECHANISMS, MECHANISM_ORDER, TEST_MECHANISM, DISPLAY_NAMES } from "../constants/mechanisms.js";
import { C, ACCENT } from "../constants/tokens.js";
import { buildMechanismGroups } from "../analysis/localization.js";
import { buildConvergence } from "../analysis/convergence.js";
import { computeSeverity } from "../analysis/severity.js";
import { ACTION_LABEL } from "../analysis/narrative.js";
import { fmtP, FLAG_STYLES } from "../constants/thresholds.js";
import { MODES, SEVERITY_TEXT, CATEGORY_GUIDANCE, HOTSPOT_PATTERNS, QC_NO_HOTSPOT } from "../constants/guidance.js";
import { ASSAYS } from "../constants/assays.js";
import { originalFileRow } from "../components/shared/coordinates.js";

// ── Colour helpers ──────────────────────────────────────────────────


function intensityOpacity(count) {
  if (count <= 0) return 0;
  if (count === 1) return 0.15;
  if (count === 2) return 0.30;
  if (count === 3) return 0.50;
  return 0.70;
}

/** Blend category colour with white at given opacity → solid ARGB */
function blendWithWhite(hex, opacity) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const blend = (c) => Math.round(c * opacity + 255 * (1 - opacity));
  const toHex = (n) => n.toString(16).padStart(2, "0").toUpperCase();
  return "FF" + toHex(blend(r)) + toHex(blend(g)) + toHex(blend(b));
}

function dominantCategory(cell) {
  if (!cell || !cell.categories.length) return null;
  return cell.categories[0];
}

// ── Lazy loaders ────────────────────────────────────────────────────

let _XLSX = null;
let _JSZip = null;

async function getXLSX() {
  if (!_XLSX) _XLSX = await import("xlsx");
  return _XLSX;
}

async function getJSZip() {
  if (!_JSZip) {
    const mod = await import("jszip");
    _JSZip = mod.default || mod;
  }
  return _JSZip;
}

// ── Column letter helper ────────────────────────────────────────────

function colLetter(n) {
  let s = "";
  let c = n;
  while (true) {
    s = String.fromCharCode(65 + (c % 26)) + s;
    c = Math.floor(c / 26) - 1;
    if (c < 0) break;
  }
  return s;
}

// ── Build convergence colour map ────────────────────────────────────

/**
 * Build a map of visRow,visCol → { argb, count } from the convergence grid.
 * Also builds rowFlagCounts: visRow → total flag count across all columns.
 */
function buildColourMap(convergence, rowMap, dColMap, visColIndices) {
  const { grid } = convergence;
  if (!grid || grid.size === 0) return { colours: new Map(), rowFlagCounts: {} };

  const matColToVisCol = {};
  dColMap.forEach((rawCI, matCI) => {
    const visIdx = visColIndices.indexOf(rawCI);
    if (visIdx >= 0) matColToVisCol[matCI] = visIdx;
  });

  const colours = new Map();
  const rowFlagCounts = {};

  for (const [key, cell] of grid) {
    const [mr, mc] = key.split(",").map(Number);
    const visRow = rowMap ? (rowMap[mr] ?? mr) : mr;
    const visCol = matColToVisCol[mc];
    if (visCol == null || visRow < 0) continue;

    const cat = dominantCategory(cell);
    const hex = MECHANISMS[cat]?.color || C.TEXT_3;
    const opacity = intensityOpacity(cell.count);
    if (opacity <= 0) continue;

    const argb = blendWithWhite(hex, opacity);
    const nk = `${visRow},${visCol}`;
    if (!colours.has(nk)) {
      colours.set(nk, argb);
    }

    // Accumulate per-row flag count (max across cols, not sum)
    rowFlagCounts[visRow] = Math.max(rowFlagCounts[visRow] || 0, cell.count);
  }

  return { colours, rowFlagCounts };
}

// ── Hotspot deduplication ───────────────────────────────────────────

function deduplicateHotspots(hotspots, rowMap) {
  const seen = new Set();
  const deduped = [];
  for (const h of hotspots) {
    const r0 = rowMap ? (rowMap[h.rowStart] ?? h.rowStart) : h.rowStart;
    const r1 = rowMap ? (rowMap[h.rowEnd] ?? h.rowEnd) : h.rowEnd;
    const key = `${r0}-${r1}|${h.tests.sort().join(",")}|${h.categories.sort().join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ ...h, _r0: r0, _r1: r1 });
  }
  return deduped;
}

// ── Active categories (only those flagged in dataset) ───────────────

function getActiveCategories(convergence) {
  const cats = new Set();
  for (const [, cell] of convergence.grid) {
    for (const c of cell.categories) cats.add(c);
  }
  return [...cats];
}

// ── Narrative generation ────────────────────────────────────────────

function generateNarrative(severity, pattern, activeCategories, nApplicable, mode) {
  const modeKey = mode === "full" ? "review" : mode;
  const sevText = SEVERITY_TEXT[modeKey]?.[severity];

  if (severity === 0) {
    return sevText
      ? `${sevText.headline}. ${sevText.sub} The data is consistent with genuine instrument-recorded measurements.`
      : "No anomalies detected. The data is consistent with genuine instrument-recorded measurements.";
  }

  const catNames = activeCategories.map(c => MECHANISMS[c]?.label || c);
  const patternDesc = HOTSPOT_PATTERNS[pattern]?.description || "";
  const headline = sevText?.headline || `Severity ${severity} detected`;
  const sub = sevText?.sub || "";

  let narrative = `${headline}. ${sub}`;
  if (activeCategories.length > 0) {
    narrative += ` ${activeCategories.length} categor${activeCategories.length === 1 ? "y" : "ies"} of anomaly ${activeCategories.length === 1 ? "is" : "are"} present: ${catNames.join(", ")}.`;
  }
  if (patternDesc) {
    narrative += ` Pattern: ${patternDesc}`;
  }
  narrative += ` ${nApplicable} independent statistical tests were run.`;
  return narrative;
}

// ── Test localisation summary ───────────────────────────────────────

/** Get a brief localisation string for a test result */
function testLocalisation(r, rowMap, fileRowFn) {
  const fr = (matIdx) => {
    const dataRow = rowMap ? (rowMap[matIdx] ?? matIdx) : matIdx;
    return fileRowFn ? fileRowFn(dataRow) : dataRow + 1;
  };
  // Tests with spatial localisation
  if (r.blockCopies?.length) {
    const blk = r.blockCopies[0];
    return `Rows ${fr(blk.srcRows[0])}–${fr(blk.srcRows[1])} (${r.blockCopies.length} block${r.blockCopies.length > 1 ? "s" : ""})`;
  }
  if (r.rowDupGroupList?.length) {
    const grp = r.rowDupGroupList[0];
    const rows = grp.rows.slice(0, 3).map(ri => fr(ri));
    return `Rows ${rows.join(", ")}${grp.rows.length > 3 ? "…" : ""} (${r.rowDupGroupList.length} group${r.rowDupGroupList.length > 1 ? "s" : ""})`;
  }
  if (r.details?.length && r.details[0]?.rows) {
    return `${r.details.length} region${r.details.length > 1 ? "s" : ""}`;
  }
  if (r.details?.length && r.details[0]?.Row !== undefined) {
    const rows = r.details.slice(0, 3).map(d => d.Row);
    return `Rows ${rows.join(", ")}${r.details.length > 3 ? "…" : ""}`;
  }
  // Non-localising (global) tests
  return "Global";
}

// ── Flag sort order ─────────────────────────────────────────────────

const FLAG_SORT = { HIGH: 0, MODERATE: 1, LOW: 2, "N/A": 3, ERROR: 4 };

// ── Style injection via JSZip ───────────────────────────────────────

/**
 * Patch a SheetJS-generated xlsx buffer to add cell fill colours and frozen panes.
 *
 * @param {ArrayBuffer} xlsxBuf
 * @param {Map<string, string>} colourMap - "visRow,visCol" → ARGB fill
 * @param {Object} legendFills - { cellRef: argb } for legend cells on sheet 1
 * @param {number} dataStartRow - 1-based xlsx row where data starts (after legend)
 * @param {number} freezeRow - 1-based xlsx row for freeze (ySplit)
 * @returns {Promise<Blob>}
 */
async function injectStyles(xlsxBuf, colourMap, legendFills, dataStartRow, freezeRow) {
  const JSZip = await getJSZip();
  const zip = await JSZip.loadAsync(xlsxBuf);

  const sheetPath = "xl/worksheets/sheet1.xml";
  let sheetXml = await zip.file(sheetPath).async("string");

  // ── Frozen panes: column A + legend/header rows ──
  const frozenPane = `<sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane xSplit="1" ySplit="${freezeRow}" topLeftCell="B${freezeRow + 1}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="B${freezeRow + 1}" sqref="B${freezeRow + 1}"/></sheetView></sheetViews>`;
  sheetXml = sheetXml.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/, frozenPane);

  // Collect all fills: data cells + legend cells
  const allCellFills = new Map(); // cellRef → argb

  // Data cells
  for (const [key, argb] of colourMap) {
    const [vr, vc] = key.split(",").map(Number);
    const xlRow = vr + dataStartRow; // data starts at dataStartRow
    const xlCol = vc + 2; // +2: col A = Flags, col B = Row num, data starts at C
    const ref = colLetter(xlCol) + xlRow;
    allCellFills.set(ref, argb);
  }

  // Legend fills
  for (const [ref, argb] of Object.entries(legendFills)) {
    allCellFills.set(ref, argb);
  }

  if (allCellFills.size === 0) {
    zip.file(sheetPath, sheetXml);
    return await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  // ── Collect unique fills ──
  const uniqueFills = [...new Set(allCellFills.values())];
  const fillIndexBase = 2;

  // ── Patch xl/styles.xml ──
  const stylesPath = "xl/styles.xml";
  let stylesXml = await zip.file(stylesPath).async("string");

  const fillEntries = uniqueFills.map(argb =>
    `<fill><patternFill patternType="solid"><fgColor rgb="${argb}"/><bgColor indexed="64"/></patternFill></fill>`
  ).join("");

  const fillCountMatch = stylesXml.match(/<fills count="(\d+)"/);
  if (fillCountMatch) {
    const oldCount = parseInt(fillCountMatch[1]);
    stylesXml = stylesXml.replace(
      `<fills count="${oldCount}"`,
      `<fills count="${oldCount + uniqueFills.length}"`
    );
  }
  stylesXml = stylesXml.replace("</fills>", fillEntries + "</fills>");

  const xfEntries = uniqueFills.map((_, i) =>
    `<xf numFmtId="0" fontId="0" fillId="${fillIndexBase + i}" borderId="0" xfId="0" applyFill="1"/>`
  ).join("");

  const xfCountMatch = stylesXml.match(/<cellXfs count="(\d+)"/);
  let xfBase = 1;
  if (xfCountMatch) {
    xfBase = parseInt(xfCountMatch[1]);
    stylesXml = stylesXml.replace(
      `<cellXfs count="${xfBase}"`,
      `<cellXfs count="${xfBase + uniqueFills.length}"`
    );
  }
  stylesXml = stylesXml.replace("</cellXfs>", xfEntries + "</cellXfs>");

  zip.file(stylesPath, stylesXml);

  // ── Build ARGB → style index map ──
  const argbToStyleIdx = {};
  uniqueFills.forEach((argb, i) => {
    argbToStyleIdx[argb] = xfBase + i;
  });

  // ── Build cellRef → style index ──
  const cellStyles = new Map();
  for (const [ref, argb] of allCellFills) {
    cellStyles.set(ref, argbToStyleIdx[argb]);
  }

  // ── Patch worksheet XML ──
  sheetXml = sheetXml.replace(/<c r="([A-Z]+\d+)"([^>]*?)>/g, (match, ref, rest) => {
    const styleIdx = cellStyles.get(ref);
    if (styleIdx == null) return match;
    if (rest.includes(' s="')) {
      return match.replace(/ s="\d+"/, ` s="${styleIdx}"`);
    }
    return `<c r="${ref}" s="${styleIdx}"${rest}>`;
  });

  zip.file(sheetPath, sheetXml);

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ── Main export function ────────────────────────────────────────────

/**
 * Generate and download a self-contained forensic investigation .xlsx report.
 */
export async function exportToExcel({ results, importConfig, matrix, rowMap, mode }) {
  const XLSX = await getXLSX();

  const rawData = importConfig?.data || [];
  const hdrs = importConfig?.hdrs || [];
  const roles = importConfig?.roles || [];
  const fileName = importConfig?.fileName || "check-my-data";
  const assay = importConfig?.assay || "general";
  const assayLabel = ASSAYS.find(a => a.v === assay)?.l || assay;
  const nRows = matrix?.length || 0;
  const nCols = matrix?.[0]?.length || 0;
  const { severity } = computeSeverity(results);
  const nApplicable = results.filter(r => r.flag !== "N/A").length;

  const visColIndices = hdrs.map((_, ci) => ci).filter(ci => roles[ci] !== "ignore");
  const dColMap = roles.map((rl, ci) => rl === "data" ? ci : -1).filter(ci => ci >= 0);

  const skippedRows = importConfig?.skippedRows || 0;
  const cfgHeaderRows = importConfig?.headerRows || 0;
  const fileRowFn = (dataRowIdx) => originalFileRow(dataRowIdx, skippedRows, cfgHeaderRows);

  const convergence = buildConvergence(results, nRows, nCols);
  const { colours: colourMap, rowFlagCounts } = buildColourMap(convergence, rowMap, dColMap, visColIndices);
  const activeCategories = getActiveCategories(convergence);
  const hotspots = deduplicateHotspots(convergence.hotspots || [], rowMap);
  const groups = buildMechanismGroups(results);
  const modeKey = mode === "full" ? "review" : mode;

  // ════════════════════════════════════════════════════════════════════
  // Sheet 1: Annotated Data (with legend block)
  // ════════════════════════════════════════════════════════════════════

  const LEGEND_ROWS = 5; // rows 1–5 are legend, row 6 is header, row 7+ is data
  const HEADER_ROW = LEGEND_ROWS + 1; // row 6
  const DATA_START = LEGEND_ROWS + 2; // row 7
  const dataAoa = [];

  // Row 1: Title
  dataAoa.push(["", "Check My Data — Annotated Data"]);
  // Row 2: Description
  dataAoa.push(["", "Cell colours indicate regions flagged by independent statistical tests."]);
  // Row 3: Intensity legend (placeholders — fills injected via JSZip)
  dataAoa.push(["", "Intensity:", "", "1 test", "", "2 tests", "", "3+ tests"]);
  // Row 4: Category legend (placeholders — fills injected via JSZip)
  const catLegendRow = ["", "Categories:"];
  for (const cat of activeCategories) {
    catLegendRow.push(""); // fill cell
    catLegendRow.push(MECHANISMS[cat]?.label || cat);
  }
  if (activeCategories.length === 0) catLegendRow.push("None flagged");
  dataAoa.push(catLegendRow);
  // Row 5: blank separator
  dataAoa.push([]);

  // Row 6: Header (Flags | Row | visible columns)
  const headerRow = ["Flags", "Row", ...visColIndices.map(ci => hdrs[ci])];
  dataAoa.push(headerRow);

  // Row 7+: Data rows
  for (let ri = 0; ri < rawData.length; ri++) {
    const row = rawData[ri];
    if (!row) continue;
    const flagCount = rowFlagCounts[ri] || "";
    const dataRow = [flagCount === "" ? "" : flagCount, ri + 1];
    for (const ci of visColIndices) {
      const val = row[ci];
      if (val != null && val !== "" && !isNaN(Number(val))) {
        dataRow.push(Number(val));
      } else {
        dataRow.push(val ?? "");
      }
    }
    dataAoa.push(dataRow);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(dataAoa);

  // Column widths: Flags (6) + Row (6) + data columns
  const colWidths = [{ wch: 6 }, { wch: 6 }];
  for (const ci of visColIndices) {
    const maxLen = Math.max(
      (hdrs[ci] || "").length,
      ...rawData.slice(0, 50).map(r => String(r?.[ci] ?? "").length)
    );
    colWidths.push({ wch: Math.min(Math.max(maxLen + 2, 8), 20) });
  }
  ws1["!cols"] = colWidths;

  // Build legend fill map (cell refs for JSZip injection)
  const legendFills = {};

  // Row 3 intensity swatches: columns D, F, H (0-indexed: 3, 5, 7) → xlsx row 3
  // Use "copied" blue as the base colour for intensity demo
  const intensityBase = MECHANISMS.copied?.color || ACCENT.BLUE.color;
  const intensityCols = [3, 5, 7]; // D, F, H in 0-based
  const intensityCounts = [1, 2, 3];
  for (let i = 0; i < intensityCounts.length; i++) {
    const argb = blendWithWhite(intensityBase, intensityOpacity(intensityCounts[i]));
    const ref = colLetter(intensityCols[i]) + "3"; // xlsx row 3
    legendFills[ref] = argb;
  }

  // Row 4 category swatches: every other column starting at C
  for (let i = 0; i < activeCategories.length; i++) {
    const cat = activeCategories[i];
    const hex = MECHANISMS[cat]?.color || C.TEXT_3;
    const argb = blendWithWhite(hex, 0.5);
    const colIdx = 2 + i * 2; // C=2, E=4, G=6...
    const ref = colLetter(colIdx) + "4"; // xlsx row 4
    legendFills[ref] = argb;
  }

  // ════════════════════════════════════════════════════════════════════
  // Sheet 2: Investigation Report
  // ════════════════════════════════════════════════════════════════════

  const rptAoa = [];
  // S156 (A1.D0c-bis D5 lock): sevLabels = ["CLEAN", "LOW", "ELEVATED",
  // "CRITICAL"] retired; outcome ladder consumes ACTION_LABEL.
  const action = ACTION_LABEL[severity] || { score: severity + 1, label: "Unknown" };

  // Section 1: Header
  rptAoa.push(["Check My Data — Investigation Report"]);
  rptAoa.push([]);
  rptAoa.push(["File", fileName]);
  rptAoa.push(["Dimensions", `${nRows} rows x ${nCols} columns`]);
  rptAoa.push(["Measurement type", assayLabel]);
  rptAoa.push(["Analysis mode", MODES[mode]?.label || mode]);
  rptAoa.push(["Outcome", `${action.score} of 4 — ${action.label}`]);
  rptAoa.push(["Date", new Date().toISOString().split("T")[0]]);
  rptAoa.push([]);

  // Section 2: Overall Assessment
  rptAoa.push(["OVERALL ASSESSMENT"]);
  const narrative = generateNarrative(severity, convergence.pattern, activeCategories, nApplicable, mode);
  rptAoa.push([narrative]);
  rptAoa.push([]);
  rptAoa.push([]);

  // Section 3: Investigation Guide (hotspots)
  rptAoa.push(["INVESTIGATION GUIDE"]);

  if (hotspots.length > 0) {
    rptAoa.push(["Rank", "Location", "Depth", "Diversity", "Tests", "Categories"]);

    for (let i = 0; i < hotspots.length; i++) {
      const h = hotspots[i];
      const location = `Rows ${fileRowFn(h._r0)}–${fileRowFn(h._r1)}`;
      const cats = h.categories.map(c => MECHANISMS[c]?.label || c).join(", ");
      const tests = h.tests.join(", ");
      rptAoa.push([i + 1, location, h.depth || h.tests.length, h.categories.length, tests, cats]);

      // Guidance rows for each contributing category
      const uniqueCats = [...new Set(h.categories)];
      const guidanceParts = { means: [], check: [], innocent: [] };
      for (const cat of uniqueCats) {
        const g = CATEGORY_GUIDANCE[cat]?.[modeKey];
        if (g) {
          guidanceParts.means.push(`${MECHANISMS[cat]?.label || cat}: ${g.short}. ${g.detail}`);
          guidanceParts.check.push(g.lookFor);
          guidanceParts.innocent.push(g.innocent);
        }
      }

      if (guidanceParts.means.length > 0) {
        rptAoa.push(["", "What this means:", guidanceParts.means.join(" ")]);
        rptAoa.push(["", "What to check:", guidanceParts.check.join(" ")]);
        rptAoa.push(["", "Innocent explanations:", guidanceParts.innocent.join(" ")]);
      }
      rptAoa.push([]); // blank separator between hotspot blocks
    }
  } else {
    const noHotMsg = mode === "qc"
      ? (QC_NO_HOTSPOT[severity] || "No hotspots detected.")
      : "No spatially convergent hotspots detected.";
    rptAoa.push([noHotMsg]);
    rptAoa.push([]);
  }

  // Section 4: Dataset-wide anomalies (non-localising flagged tests)
  const globalTests = results.filter(r => {
    if (r.flag !== "HIGH" && r.flag !== "MODERATE") return false;
    const loc = testLocalisation(r, rowMap, fileRowFn);
    return loc === "Global";
  });

  if (globalTests.length > 0) {
    rptAoa.push(["DATASET-WIDE ANOMALIES"]);
    rptAoa.push(["These findings apply to the dataset as a whole and cannot be localised to specific cells:"]);
    rptAoa.push([]);
    // Group by category — one row per category, not per test
    const catMap = new Map();
    for (const r of globalTests) {
      const cat = TEST_MECHANISM[r.name] || "replicate";
      if (!catMap.has(cat)) catMap.set(cat, { tests: [], flags: [] });
      catMap.get(cat).tests.push(r);
      catMap.get(cat).flags.push(r.flag);
    }
    for (const [cat, { tests, flags }] of catMap) {
      const catLabel = MECHANISMS[cat]?.label || cat;
      const g = CATEGORY_GUIDANCE[cat]?.[modeKey];
      const desc = g ? `${g.short}. ${g.lookFor}` : "";
      // Worst flag in group — S156 D1 canon: emit user-facing sentence-case
      // word via FLAG_STYLES.label rather than the raw HIGH/MODERATE
      // identifier (audit C2).
      const worstFlagKey = flags.includes("HIGH") ? "HIGH" : "MODERATE";
      const worstFlag = FLAG_STYLES[worstFlagKey]?.label || worstFlagKey;
      const testNames = tests.map(t => DISPLAY_NAMES[t.name] || t.name).join(", ");
      if (mode === "qc") {
        rptAoa.push([catLabel, worstFlag, desc]);
      } else {
        rptAoa.push([catLabel, worstFlag, testNames, desc]);
      }
    }
    rptAoa.push([]);
  }

  // Section 5: Category Summary
  rptAoa.push(["CATEGORY SUMMARY"]);
  rptAoa.push(["Category", "Flagged Tests", "Test Names"]);
  for (const mechKey of MECHANISM_ORDER) {
    const group = groups[mechKey];
    if (!group.tests.length) continue;
    const flagged = group.tests.filter(t => t.flag === "HIGH" || t.flag === "MODERATE");
    rptAoa.push([
      group.label,
      flagged.length,
      flagged.map(t => DISPLAY_NAMES[t.name] || t.name).join(", ") || "—",
    ]);
  }
  rptAoa.push([]);

  // Section 6: Footer
  rptAoa.push(["Generated by Check My Data v0.8. This report is based on automated statistical analysis. Flagged anomalies warrant investigation but are not proof of misconduct. Always consider innocent explanations."]);

  const ws2 = XLSX.utils.aoa_to_sheet(rptAoa);
  ws2["!cols"] = [{ wch: 20 }, { wch: 28 }, { wch: 50 }, { wch: 12 }, { wch: 40 }, { wch: 30 }];

  // ════════════════════════════════════════════════════════════════════
  // Sheet 3: Test Details (Full Analysis mode only)
  // ════════════════════════════════════════════════════════════════════

  let ws3 = null;
  if (mode === "full") {
    // Collect all tests, sorted by flag level then category
    const allTests = [];
    for (const mechKey of MECHANISM_ORDER) {
      const group = groups[mechKey];
      for (const r of group.tests) {
        allTests.push({ ...r, _category: group.label, _mechKey: mechKey });
      }
    }
    allTests.sort((a, b) => {
      const fa = FLAG_SORT[a.flag] ?? 9;
      const fb = FLAG_SORT[b.flag] ?? 9;
      if (fa !== fb) return fa - fb;
      return MECHANISM_ORDER.indexOf(a._mechKey) - MECHANISM_ORDER.indexOf(b._mechKey);
    });

    const detailAoa = [];
    detailAoa.push(["Test Name", "Category", "Flag", "p-value", "Localisation", "Description"]);
    for (const r of allTests) {
      const displayName = DISPLAY_NAMES[r.name] || r.name;
      const pVal = r.primaryP != null ? fmtP(r.primaryP) : "—";
      const loc = testLocalisation(r, rowMap, fileRowFn);
      const desc = (r.description || "").slice(0, 100);
      // S156 D1: emit FLAG_STYLES.label sentence-case rather than the raw
      // HIGH/MODERATE/LOW identifier (audit C3).
      const flagLabel = (r.flag && FLAG_STYLES[r.flag]?.label) || r.flag || "—";
      detailAoa.push([displayName, r._category, flagLabel, pVal, loc, desc]);
    }
    ws3 = XLSX.utils.aoa_to_sheet(detailAoa);
    ws3["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 24 }, { wch: 60 }];

    // Add cell comments for full descriptions (truncated in column)
    for (let i = 0; i < allTests.length; i++) {
      const r = allTests[i];
      if (r.description && r.description.length > 100) {
        const cellRef = `F${i + 2}`; // F column, row i+2 (header is row 1)
        if (!ws3[cellRef]) continue;
        ws3[cellRef].c = [{ t: r.description, a: "Check My Data" }];
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // Sheet 4: Legend (always included)
  // ════════════════════════════════════════════════════════════════════

  const legendAoa = [];
  legendAoa.push(["Check My Data — Legend"]);
  legendAoa.push([]);

  // Category colour key
  legendAoa.push(["CATEGORY COLOUR KEY"]);
  legendAoa.push(["Colour", "Category", "Description"]);
  for (const mechKey of MECHANISM_ORDER) {
    const g = CATEGORY_GUIDANCE[mechKey]?.[modeKey];
    legendAoa.push(["", MECHANISMS[mechKey]?.label || mechKey, g?.short || ""]);
  }
  legendAoa.push([]);

  // Intensity scale
  legendAoa.push(["INTENSITY SCALE"]);
  legendAoa.push(["Colour", "Meaning"]);
  legendAoa.push(["", "1 test flagged this cell"]);
  legendAoa.push(["", "2 tests flagged this cell"]);
  legendAoa.push(["", "3+ tests flagged this cell"]);
  legendAoa.push([]);

  // Flag level definitions — S156 D1 canon: single sentence-case ladder
  // (High / Moderate / Clear / N/A). Pre-S156 dual labelling
  // ("FLAGGED (HIGH)" etc.) retired now that chrome + emit + export share
  // one word per tier.
  legendAoa.push(["FLAG LEVEL DEFINITIONS"]);
  legendAoa.push(["Flag", "Meaning"]);
  legendAoa.push(["High",     "Statistical evidence of anomaly (p < 0.001 after correction)"]);
  legendAoa.push(["Moderate", "Borderline evidence warranting attention (p < 0.01 after correction)"]);
  legendAoa.push(["Clear",    "No evidence of anomaly at this threshold"]);
  legendAoa.push(["N/A",      "Test not applicable to this dataset (insufficient data, wrong data type, etc.)"]);
  legendAoa.push([]);

  // Outcome ladder — S156 D5 canon: dataset-level outcome rendered as
  // "N of 4 — Label" (ACTION_LABEL). Pre-S156 ladder ["CLEAN", "LOW",
  // "ELEVATED", "CRITICAL"] retired alongside the local sevLabels const.
  legendAoa.push(["OUTCOME SCALE"]);
  legendAoa.push(["Position", "Label", "Description"]);
  const sevDesc = SEVERITY_TEXT.review || {};
  for (let s = 0; s < 4; s++) {
    const a = ACTION_LABEL[s];
    legendAoa.push([`${a.score} of 4`, a.label, sevDesc[s]?.sub || ""]);
  }
  legendAoa.push([]);

  // Methodology note
  legendAoa.push(["METHODOLOGY"]);
  legendAoa.push([`Check My Data runs ${nApplicable} independent statistical tests on raw experimental data. Tests are grouped into 5 observation categories: ${MECHANISM_ORDER.map(k => MECHANISMS[k]?.label || k).join(", ")}. The convergence heatmap on the Annotated Data sheet highlights regions where multiple independent tests flag the same cells. Darker shading indicates more tests converging on that region.`]);
  legendAoa.push([]);
  legendAoa.push(["This report is a screening aid, not a determination of misconduct."]);

  const ws4 = XLSX.utils.aoa_to_sheet(legendAoa);
  ws4["!cols"] = [{ wch: 20 }, { wch: 24 }, { wch: 80 }];

  // ════════════════════════════════════════════════════════════════════
  // Assemble workbook
  // ════════════════════════════════════════════════════════════════════

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "Annotated Data");
  XLSX.utils.book_append_sheet(wb, ws2, "Investigation Report");
  if (ws3) XLSX.utils.book_append_sheet(wb, ws3, "Test Details");
  XLSX.utils.book_append_sheet(wb, ws4, "Legend");

  // ── Write to buffer ──
  const xlsxBuf = XLSX.write(wb, { type: "array", bookType: "xlsx", cellStyles: true });

  // ── Inject styles: cell fills + frozen panes ──
  const freezeRow = HEADER_ROW; // freeze after row 6 (header)
  const blob = await injectStyles(xlsxBuf, colourMap, legendFills, DATA_START, freezeRow);

  // ── Download ──
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const dlName = `${baseName}_CheckMyData.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dlName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
