/**
 * Excel forensic metadata extraction via direct ZIP/XML parsing.
 *
 * Uses JSZip to open the .xlsx as a ZIP archive and parses the raw XML files
 * directly. This is intentionally NOT using SheetJS for metadata — the community
 * edition has unreliable cell style parsing.
 *
 * Signals extracted:
 * 1. Provenance — creator, lastModifiedBy, created, modified + temporal gap analysis
 * 2. Font anomalies — mixed font name/size/color within columns across all sheets
 * 3. Number format anomalies — mixed numFmt within columns (General vs Number vs explicit dp)
 * 4. Hidden sheets — sheets with state="hidden" or "veryHidden"
 * 5. External links / named ranges — references to other workbooks
 * 6. Formula residue — cells containing formulas in data that appears numeric
 *
 * This runs as a separate pre-analysis step, NOT part of runFullAnalysis.
 * Results are informational and do NOT feed into Fisher's aggregation.
 *
 * @module import/excelMeta
 */

/**
 * Extract forensic metadata from a .xlsx file.
 *
 * @param {ArrayBuffer} buf — the raw file bytes
 * @returns {Promise<object>} structured forensic metadata result
 */
export async function extractExcelMeta(buf) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);

  const provenance = await extractProvenance(zip);
  const stylesXml = await readFile(zip, "xl/styles.xml");
  const fonts = stylesXml ? parseFontTable(stylesXml) : [];
  const xfs = stylesXml ? parseCellXfs(stylesXml) : [];
  const numFmts = stylesXml ? parseNumFmtTable(stylesXml) : {};

  const sheetNames = await resolveSheetNames(zip);
  const fontAnomalies = await extractFontAnomalies(zip, fonts, xfs, sheetNames);
  const formatAnomalies = await extractFormatAnomalies(zip, xfs, numFmts, sheetNames);
  const hiddenSheets = await detectHiddenSheets(zip);
  const externalLinks = await detectExternalLinks(zip);
  const formulaResidue = await detectFormulaResidue(zip, sheetNames);
  const temporalFlags = analyseTemporalAnomalies(provenance);

  // Aggregate findings count for severity
  const findings = [];
  if (provenance.creatorMismatch) findings.push("creator-mismatch");
  if (temporalFlags.length > 0) findings.push("temporal");
  if (fontAnomalies.length > 0) findings.push("font");
  if (formatAnomalies.length > 0) findings.push("format");
  if (hiddenSheets.length > 0) findings.push("hidden");
  if (externalLinks.length > 0) findings.push("external");
  if (formulaResidue.length > 0) findings.push("formula");

  let flag = "LOW";
  if (findings.length >= 3) flag = "HIGH";
  else if (findings.length >= 1) flag = "MODERATE";

  return {
    provenance, temporalFlags,
    fontAnomalies, formatAnomalies,
    hiddenSheets, externalLinks, formulaResidue,
    flag, findings,
  };
}

// ── Provenance ──────────────────────────────────────────────────────────

async function extractProvenance(zip) {
  const xml = await readFile(zip, "docProps/core.xml");
  if (!xml) return { creator: null, lastModifiedBy: null, created: null, modified: null, creatorMismatch: false };

  const creator = extractTag(xml, "dc:creator");
  const lastModifiedBy = extractTag(xml, "cp:lastModifiedBy");
  const created = extractTag(xml, "dcterms:created");
  const modified = extractTag(xml, "dcterms:modified");

  const creatorMismatch = !!(
    creator && lastModifiedBy &&
    creator.trim().toLowerCase() !== lastModifiedBy.trim().toLowerCase()
  );

  return { creator, lastModifiedBy, created, modified, creatorMismatch };
}

// ── 1. Temporal anomalies ───────────────────────────────────────────────

function analyseTemporalAnomalies(provenance) {
  const flags = [];
  const created = provenance.created ? new Date(provenance.created) : null;
  const modified = provenance.modified ? new Date(provenance.modified) : null;

  if (created && modified && !isNaN(created) && !isNaN(modified)) {
    const gapYears = (modified - created) / (365.25 * 24 * 60 * 60 * 1000);
    if (gapYears > 5) {
      flags.push({
        type: "large-gap",
        description: `Modified ${gapYears.toFixed(1)} years after creation — unusually long gap between creation and last edit`,
      });
    }
    if (modified < created) {
      flags.push({
        type: "backwards",
        description: `Modified date (${provenance.modified}) is before created date (${provenance.created}) — metadata may have been tampered with`,
      });
    }
  }

  if (created && !isNaN(created)) {
    const age = (Date.now() - created) / (365.25 * 24 * 60 * 60 * 1000);
    if (age > 20) {
      flags.push({
        type: "very-old",
        description: `File created ${age.toFixed(0)} years ago (${provenance.created}) — predates modern Excel .xlsx format (2007)`,
      });
    }
  }

  return flags;
}

// ── 2. Font anomalies (across all sheets) ───────────────────────────────

async function extractFontAnomalies(zip, fonts, xfs, sheetNames) {
  const sheetFiles = zip.file(/^xl\/worksheets\/sheet\d+\.xml$/);
  if (!sheetFiles.length || !fonts.length) return [];

  const xfFontIds = xfs.map(xf => xf.fontId);
  const multiSheet = sheetFiles.length > 1;
  const allAnomalies = [];

  for (const sheetFile of sheetFiles) {
    const sheetXml = await sheetFile.async("string");
    const cellFontMap = parseCellFonts(sheetXml, xfFontIds, fonts);
    const anomalies = detectColumnAnomalies(cellFontMap);

    if (multiSheet && anomalies.length > 0) {
      const sheetLabel = getSheetLabel(sheetFile.name, sheetNames);
      for (const a of anomalies) a.column = sheetLabel + "!" + a.column;
    }
    allAnomalies.push(...anomalies);
  }

  return allAnomalies;
}

// ── 3. Number format anomalies ──────────────────────────────────────────

function parseNumFmtTable(xml) {
  const fmts = {};
  // Built-in formats
  fmts[0] = "General";
  fmts[1] = "0"; fmts[2] = "0.00"; fmts[3] = "#,##0"; fmts[4] = "#,##0.00";
  fmts[9] = "0%"; fmts[10] = "0.00%";
  fmts[11] = "0.00E+00"; fmts[14] = "m/d/yyyy";
  fmts[49] = "@"; // text

  // Custom formats from <numFmts>
  const block = xml.match(/<numFmts[^>]*>([\s\S]*?)<\/numFmts>/);
  if (block) {
    const entries = block[1].match(/<numFmt\s+[^>]*>/g) || [];
    for (const entry of entries) {
      const idM = entry.match(/numFmtId="(\d+)"/);
      const codeM = entry.match(/formatCode="([^"]+)"/);
      if (idM && codeM) fmts[parseInt(idM[1], 10)] = codeM[1];
    }
  }
  return fmts;
}

async function extractFormatAnomalies(zip, xfs, numFmts, sheetNames) {
  const sheetFiles = zip.file(/^xl\/worksheets\/sheet\d+\.xml$/);
  if (!sheetFiles.length || !xfs.length) return [];

  const multiSheet = sheetFiles.length > 1;
  const allAnomalies = [];

  for (const sheetFile of sheetFiles) {
    const sheetXml = await sheetFile.async("string");
    const colFmtMap = parseCellFormats(sheetXml, xfs, numFmts);
    const anomalies = detectFormatColumnAnomalies(colFmtMap);

    if (multiSheet && anomalies.length > 0) {
      const sheetLabel = getSheetLabel(sheetFile.name, sheetNames);
      for (const a of anomalies) a.column = sheetLabel + "!" + a.column;
    }
    allAnomalies.push(...anomalies);
  }

  return allAnomalies;
}

function parseCellFormats(sheetXml, xfs, numFmts) {
  const colMap = new Map(); // col → [{ row, fmt }]
  const cellPattern = /<c\s+[^>]*?>/g;
  let match;
  while ((match = cellPattern.exec(sheetXml)) !== null) {
    const tag = match[0];
    const rMatch = tag.match(/r="([A-Z]+)(\d+)"/);
    if (!rMatch) continue;

    // Skip string-type cells (t="s") — format variation on text is uninteresting
    if (/\bt="s"/.test(tag)) continue;

    const col = rMatch[1];
    const row = parseInt(rMatch[2], 10);
    const sMatch = tag.match(/\bs="(\d+)"/);
    const styleIdx = sMatch ? parseInt(sMatch[1], 10) : 0;
    const numFmtId = styleIdx < xfs.length ? xfs[styleIdx].numFmtId : 0;
    const fmt = numFmts[numFmtId] || `#${numFmtId}`;

    if (!colMap.has(col)) colMap.set(col, []);
    colMap.get(col).push({ row, fmt });
  }
  return colMap;
}

function detectFormatColumnAnomalies(colFmtMap) {
  const anomalies = [];
  for (const [col, cells] of colFmtMap) {
    if (cells.length < 3) continue;
    const freq = {};
    for (const { fmt } of cells) freq[fmt] = (freq[fmt] || 0) + 1;
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    if (entries.length < 2) continue;

    const [domFmt, domCount] = entries[0];
    const anomalousCount = cells.length - domCount;
    if (anomalousCount >= 2 && anomalousCount <= cells.length * 0.5) {
      const minorityFmts = entries.slice(1).map(([f, n]) => `"${f}" (${n})`).join(", ");
      anomalies.push({
        column: col,
        rows: cells.filter(c => c.fmt !== domFmt).map(c => c.row),
        description: `Mixed number formats: majority "${domFmt}" (${domCount}), but also ${minorityFmts}`,
      });
    }
  }
  return anomalies;
}

// ── 4. Hidden sheets ────────────────────────────────────────────────────

async function detectHiddenSheets(zip) {
  const xml = await readFile(zip, "xl/workbook.xml");
  if (!xml) return [];

  const hidden = [];
  const re = /<sheet\s+[^>]*>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const tag = m[0];
    const stateM = tag.match(/state="([^"]+)"/);
    if (stateM && (stateM[1] === "hidden" || stateM[1] === "veryHidden")) {
      const nameM = tag.match(/name="([^"]+)"/);
      hidden.push({
        name: nameM ? nameM[1] : "unknown",
        state: stateM[1],
        description: stateM[1] === "veryHidden"
          ? "Very hidden sheet (not visible in Excel UI without VBA) — may contain intermediate calculations or original data"
          : "Hidden sheet — may contain intermediate calculations or original data",
      });
    }
  }
  return hidden;
}

// ── 5. External links / named ranges ────────────────────────────────────

async function detectExternalLinks(zip) {
  const findings = [];

  // Check for xl/externalLinks/ directory
  const extLinkFiles = zip.file(/^xl\/externalLinks\//);
  if (extLinkFiles.length > 0) {
    for (const f of extLinkFiles) {
      if (!f.name.endsWith(".xml")) continue;
      const xml = await f.async("string");
      // Extract the external file reference
      const targetM = xml.match(/Target="([^"]+)"/i) || xml.match(/<externalBook[^>]*>/);
      findings.push({
        type: "external-link",
        source: f.name,
        description: targetM
          ? `External workbook reference: ${targetM[1] || "linked workbook"}`
          : "External workbook link found",
      });
    }
  }

  // Check for xl/externalLinks in relationships
  const relsXml = await readFile(zip, "xl/_rels/workbook.xml.rels");
  if (relsXml) {
    const extRe = /Target="[^"]*external[^"]*"/gi;
    let rm;
    while ((rm = extRe.exec(relsXml)) !== null) {
      const targetM = rm[0].match(/Target="([^"]+)"/);
      if (targetM && !findings.some(f => f.description.includes(targetM[1]))) {
        findings.push({
          type: "external-link",
          source: "workbook.xml.rels",
          description: `External reference: ${targetM[1]}`,
        });
      }
    }
  }

  // Check definedNames in workbook.xml for external references
  const wbXml = await readFile(zip, "xl/workbook.xml");
  if (wbXml) {
    const dnBlock = wbXml.match(/<definedNames>([\s\S]*?)<\/definedNames>/);
    if (dnBlock) {
      const dnEntries = dnBlock[1].match(/<definedName[^>]*>([^<]*)<\/definedName>/g) || [];
      for (const dn of dnEntries) {
        const nameM = dn.match(/name="([^"]+)"/);
        const value = dn.match(/>([^<]*)</)?.[1] || "";
        // External references contain [filename] or full paths
        if (/\[.*\]/.test(value) || /\\\\|\/\/|[A-Z]:\\/.test(value)) {
          findings.push({
            type: "named-range-external",
            source: nameM ? nameM[1] : "unnamed",
            description: `Named range "${nameM?.[1] || "?"}" references external file: ${value.substring(0, 100)}`,
          });
        }
      }
    }
  }

  return findings;
}

// ── 6. Formula residue ──────────────────────────────────────────────────

async function detectFormulaResidue(zip, sheetNames) {
  const sheetFiles = zip.file(/^xl\/worksheets\/sheet\d+\.xml$/);
  if (!sheetFiles.length) return [];

  const multiSheet = sheetFiles.length > 1;
  const allResidue = [];

  for (const sheetFile of sheetFiles) {
    const sheetXml = await sheetFile.async("string");

    // Find cells with <f> (formula) tags — these contain formulas
    // Match <c r="..." ...><f>...</f><v>...</v></c>
    const formulaPattern = /<c\s+([^>]*)>\s*<f>([^<]*)<\/f>/g;
    const formulaCells = [];
    let fm;
    while ((fm = formulaPattern.exec(sheetXml)) !== null) {
      const attrs = fm[1];
      const formula = fm[2];
      const rM = attrs.match(/r="([A-Z]+)(\d+)"/);
      if (rM) {
        formulaCells.push({ col: rM[1], row: parseInt(rM[2], 10), formula });
      }
    }

    if (formulaCells.length === 0) continue;

    // Group by column
    const colFormulas = new Map();
    for (const c of formulaCells) {
      if (!colFormulas.has(c.col)) colFormulas.set(c.col, []);
      colFormulas.get(c.col).push(c);
    }

    // Count total data cells per column to determine formula fraction
    const colTotals = new Map();
    const cellP = /<c\s+[^>]*?>/g;
    let cm;
    while ((cm = cellP.exec(sheetXml)) !== null) {
      const rM = cm[0].match(/r="([A-Z]+)/);
      if (rM) colTotals.set(rM[1], (colTotals.get(rM[1]) || 0) + 1);
    }

    for (const [col, cells] of colFormulas) {
      const total = colTotals.get(col) || cells.length;
      const pct = ((cells.length / total) * 100).toFixed(0);
      const sheetLabel = multiSheet ? getSheetLabel(sheetFile.name, sheetNames) + "!" : "";

      // Sample formulas for display
      const samples = [...new Set(cells.slice(0, 5).map(c => c.formula))];

      // Describe row location concisely
      const rows = cells.map(c => c.row);
      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      let rowNote;
      if (cells.length <= 3 && maxRow <= 2) {
        rowNote = `header row${cells.length > 1 ? "s" : ""} only (row ${rows.join(", ")})`;
      } else if (maxRow - minRow + 1 === cells.length) {
        rowNote = `rows ${minRow}–${maxRow}`;
      } else {
        rowNote = `${pct}% of column`;
      }

      allResidue.push({
        column: sheetLabel + col,
        count: cells.length,
        total,
        percentage: pct,
        rows,
        samples,
        rowNote,
        description: `${cells.length} formula${cells.length > 1 ? "s" : ""} (${rowNote}) — e.g. ${samples[0]?.substring(0, 60) || "?"}`,
      });
    }
  }

  return allResidue;
}

// ── Font parsing helpers ────────────────────────────────────────────────

function parseFontTable(xml) {
  const fonts = [];
  const fontsBlock = xml.match(/<fonts[^>]*>([\s\S]*?)<\/fonts>/);
  if (!fontsBlock) return fonts;

  const fontEntries = fontsBlock[1].match(/<font>([\s\S]*?)<\/font>/g) || [];
  for (const entry of fontEntries) {
    const sig = { name: null, size: null, colorSource: null, colorValue: null, bold: false, italic: false };

    const nameMatch = entry.match(/<name\s+val="([^"]+)"/);
    if (nameMatch) sig.name = nameMatch[1];

    const szMatch = entry.match(/<sz\s+val="([^"]+)"/);
    if (szMatch) sig.size = szMatch[1];

    const colorMatch = entry.match(/<color\s+([^/]*?)\/>/);
    if (colorMatch) {
      const attrs = colorMatch[1];
      const rgbM = attrs.match(/rgb="([^"]+)"/);
      const themeM = attrs.match(/theme="([^"]+)"/);
      const indexedM = attrs.match(/indexed="([^"]+)"/);
      if (rgbM) { sig.colorSource = "rgb"; sig.colorValue = rgbM[1]; }
      else if (themeM) { sig.colorSource = "theme"; sig.colorValue = themeM[1]; }
      else if (indexedM) { sig.colorSource = "indexed"; sig.colorValue = indexedM[1]; }
    }

    if (/<b\s*\/>|<b>/.test(entry)) sig.bold = true;
    if (/<i\s*\/>|<i>/.test(entry)) sig.italic = true;

    fonts.push(sig);
  }
  return fonts;
}

function parseCellXfs(xml) {
  const xfBlock = xml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/);
  if (!xfBlock) return [];

  const xfEntries = xfBlock[1].match(/<xf\s+[^>]*>/g) || [];
  return xfEntries.map(xf => {
    const fontM = xf.match(/fontId="(\d+)"/);
    const fmtM = xf.match(/numFmtId="(\d+)"/);
    return {
      fontId: fontM ? parseInt(fontM[1], 10) : 0,
      numFmtId: fmtM ? parseInt(fmtM[1], 10) : 0,
    };
  });
}

function parseCellFonts(sheetXml, xfFontIds, fonts) {
  const colMap = new Map();
  const cellPattern = /<c\s+[^>]*?>/g;
  let match;
  while ((match = cellPattern.exec(sheetXml)) !== null) {
    const tag = match[0];
    const rMatch = tag.match(/r="([A-Z]+)(\d+)"/);
    if (!rMatch) continue;
    const col = rMatch[1];
    const row = parseInt(rMatch[2], 10);
    const sMatch = tag.match(/\bs="(\d+)"/);
    const styleIdx = sMatch ? parseInt(sMatch[1], 10) : 0;
    const fontId = styleIdx < xfFontIds.length ? xfFontIds[styleIdx] : 0;
    const fontSig = fontId < fonts.length ? fonts[fontId] : null;
    if (!fontSig) continue;
    if (!colMap.has(col)) colMap.set(col, []);
    colMap.get(col).push({ row, fontSig });
  }
  return colMap;
}

function detectColumnAnomalies(colMap) {
  const anomalies = [];
  for (const [col, cells] of colMap) {
    if (cells.length < 3) continue;

    const sigs = cells.map(c => fontSigString(c.fontSig));

    // Check mixed color sources: explicit (RGB/indexed) vs theme
    const sourceCounts = { rgb: 0, theme: 0, indexed: 0, none: 0 };
    for (const c of cells) sourceCounts[c.fontSig.colorSource || "none"]++;

    const hasExplicit = sourceCounts.rgb > 0 || sourceCounts.indexed > 0;
    const hasTheme = sourceCounts.theme > 0;
    if (hasExplicit && hasTheme) {
      const explicitCount = sourceCounts.rgb + sourceCounts.indexed;
      const minority = explicitCount <= sourceCounts.theme ? "explicit" : "theme";
      const minorityRows = cells
        .filter(c => {
          const src = c.fontSig.colorSource || "none";
          return minority === "explicit" ? (src === "rgb" || src === "indexed") : src === "theme";
        })
        .map(c => c.row);
      anomalies.push({
        column: col, rows: minorityRows,
        description: `Mixed font color sources: ${explicitCount} explicit (RGB/indexed), ${sourceCounts.theme} theme — possible paste artefact`,
      });
      continue;
    }

    // General font signature inconsistency (name, size, bold, etc.)
    const freq = {};
    for (const s of sigs) freq[s] = (freq[s] || 0) + 1;
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    if (entries.length < 2) continue;

    const [domSig, domCount] = entries[0];
    const anomalousCount = cells.length - domCount;
    if (anomalousCount > 0 && anomalousCount <= cells.length * 0.5 && anomalousCount >= 2) {
      const anomalousRows = cells.filter((c, i) => sigs[i] !== domSig).map(c => c.row);
      // Build specific description of what differs
      const domFont = cells.find((_, i) => sigs[i] === domSig)?.fontSig;
      const anomFont = cells.find((_, i) => sigs[i] !== domSig)?.fontSig;
      const desc = describeFontDiff(domFont, anomFont, domCount, anomalousCount, cells.length);
      anomalies.push({
        column: col, rows: anomalousRows, description: desc,
      });
    }
  }
  return anomalies;
}

function fontSigString(sig) {
  if (!sig) return "null";
  const parts = [];
  if (sig.name) parts.push(sig.name);
  if (sig.size) parts.push("sz:" + sig.size);
  if (sig.colorSource) parts.push(sig.colorSource + ":" + (sig.colorValue || "?"));
  if (sig.bold) parts.push("B");
  if (sig.italic) parts.push("I");
  return parts.join("|") || "default";
}

/** Build a human-readable description of what differs between two font signatures. */
function describeFontDiff(dom, anom, domCount, anomCount, total) {
  if (!dom || !anom) return `${anomCount} of ${total} cells have different font properties than the column majority`;
  const diffs = [];
  if (dom.name && anom.name && dom.name !== anom.name) diffs.push(`font "${anom.name}" vs majority "${dom.name}"`);
  if (dom.size && anom.size && dom.size !== anom.size) diffs.push(`size ${anom.size}pt vs majority ${dom.size}pt`);
  if (dom.colorSource !== anom.colorSource) diffs.push(`color source ${anom.colorSource || "none"} vs majority ${dom.colorSource || "none"}`);
  else if (dom.colorValue !== anom.colorValue) diffs.push(`color ${anom.colorSource}:${anom.colorValue} vs majority ${dom.colorSource}:${dom.colorValue}`);
  if (dom.bold !== anom.bold) diffs.push(anom.bold ? "bold vs majority non-bold" : "non-bold vs majority bold");
  if (dom.italic !== anom.italic) diffs.push(anom.italic ? "italic vs majority non-italic" : "non-italic vs majority italic");
  if (diffs.length === 0) return `${anomCount} of ${total} cells have different font properties than the column majority`;
  return `${anomCount} of ${total} cells: ${diffs.join(", ")} — possible paste artefact`;
}

// ── Shared helpers ──────────────────────────────────────────────────────

async function resolveSheetNames(zip) {
  const xml = await readFile(zip, "xl/workbook.xml");
  if (!xml) return [];
  const names = [];
  const re = /<sheet\s+name="([^"]+)"/g;
  let m;
  while ((m = re.exec(xml)) !== null) names.push(m[1]);
  return names;
}

function getSheetLabel(fileName, sheetNames) {
  const idx = fileName.match(/sheet(\d+)\.xml$/);
  return idx ? (sheetNames[parseInt(idx[1], 10) - 1] || fileName) : fileName;
}

async function readFile(zip, path) {
  const f = zip.file(path);
  return f ? f.async("string") : null;
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`);
  const m = xml.match(re);
  return m ? m[1].trim() || null : null;
}
