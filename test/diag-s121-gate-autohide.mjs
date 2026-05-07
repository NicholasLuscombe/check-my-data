// S121 — Import gate auto-hide regression diagnostic.
// Read-only. Drives the actual import pipeline modules on DS01 and DS14 to
// resolve the runtime state behind the render decisions in ImportView.jsx.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

import {
  preprocessRaw,
  detectHeaderRows,
  forwardFill,
  detectBlocks,
} from "../src/import/parser.js";
import { detectLongFormat } from "../src/import/longFormat.js";
import { inferRoles } from "../src/import/roles.js";
import { detectAssay, ASSAY_DATATYPE_MAP } from "../src/constants/assays.js";
import { suggestRowSemantics } from "../src/import/rowSemantics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "fixtures");

// Replay ImportView.applyHeaders exactly enough to surface the state we need.
function applyHeadersReplay(raw, nH) {
  if (!raw || !raw.length) return { h: [], d: [], condPerCol: null };
  const maxC = raw.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = r => {
    const o = [...r];
    while (o.length < maxC) o.push(null);
    return o;
  };
  let h, d, cpc = null;
  if (nH === 0) {
    h = Array.from({ length: maxC }, (_, i) => "Col " + (i + 1));
    d = raw.map(pad);
  } else if (nH === 1) {
    h = pad(raw[0]).map((v, i) =>
      v != null && String(v).trim() ? String(v).trim() : "Col " + (i + 1));
    d = raw.slice(1).map(pad);
  } else {
    const rawGR = pad(raw[0]), nameRow = pad(raw[1]);
    const subNames = nameRow.map(v => v != null ? String(v).trim() : "");
    const counts = {};
    subNames.forEach(s => { if (s) counts[s] = (counts[s] || 0) + 1; });
    const repeatedName = subNames.find(s => s && counts[s] > 1);
    let groupStarts = [];
    if (repeatedName) subNames.forEach((s, i) => { if (s === repeatedName) groupStarts.push(i); });
    cpc = new Array(maxC).fill(null);
    if (groupStarts.length >= 2) {
      for (let g = 0; g < groupStarts.length; g++) {
        const gS = groupStarts[g], gE = g + 1 < groupStarts.length ? groupStarts[g + 1] - 1 : maxC - 1;
        let cn = null;
        for (let c = gS; c <= gE; c++) {
          const v = rawGR[c] != null ? String(rawGR[c]).trim() : "";
          if (v) { cn = v; break; }
        }
        if (!cn) for (let c = gS - 1; c >= Math.max(0, gS - 2); c--) {
          const v = rawGR[c] != null ? String(rawGR[c]).trim() : "";
          if (v) { cn = v; break; }
        }
        if (cn) for (let c = gS; c <= gE; c++) cpc[c] = cn;
      }
    } else {
      const filled = forwardFill(rawGR);
      cpc = filled.map(v => v ? String(v).trim() || null : null);
    }
    h = nameRow.map((v, i) => {
      const nm = v != null && String(v).trim() ? String(v).trim() : "Col " + (i + 1);
      const grp = cpc[i] || "";
      return grp ? grp + " · " + nm : nm;
    });
    d = raw.slice(2).map(pad);
  }
  d = d.filter(r => r.some(v => v != null && v !== ""));
  return { h, d, condPerCol: cpc };
}

function traceFile(label, filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const result = Papa.parse(text.trim(), { skipEmptyLines: false });
  const raw = result.data;
  const { rows: cleaned, removedCols, skippedRows } = preprocessRaw(raw);
  const blocks = detectBlocks(cleaned);
  const multiBlock = blocks.length > 1;
  const forBlock = multiBlock ? blocks[0] : cleaned;
  const nH = detectHeaderRows(forBlock);

  // detectLongFormat: run on raw header+rows (matches ImportView's autoDetect path)
  let lfDet = null;
  if (forBlock.length > 20 && nH > 0) {
    const hdrRow = forBlock[0].map(v => v != null ? String(v).trim() : "");
    const dataRows = forBlock.slice(nH);
    lfDet = detectLongFormat(hdrRow, dataRows);
  }
  const longFormatDetected = !!lfDet;

  const { h, d, condPerCol } = applyHeadersReplay(forBlock, nH);
  const roles = d.length && h.length ? inferRoles(d, h, condPerCol) : [];

  // detectAssay runs after applyHeaders in ImportView: fileName + finalised h
  const fileName = path.basename(filePath);
  const det = detectAssay(fileName, h);

  // Replay the conditional from ImportView:
  //   if(det&&(confidence==="high"||confidence==="low")){ setAssay(det.assay); ... }
  //   else { setAssay("general"); ... }
  let assay = "general";
  let assayAutoDetected = false;
  let assaySuggestion = null;
  if (det && (det.confidence === "high" || det.confidence === "low")) {
    assay = det.assay;
    assayAutoDetected = det.confidence === "high";
    assaySuggestion = det.confidence === "low" ? det.assay : null;
  }

  // suggestRowSemantics in ImportView fires whenever assay or longFormatDetected changes
  const rowSemSuggestion = suggestRowSemantics({ assay, longFormatDetected });

  // Replay the useEffect:
  //   if (rowSemSuggestion.value && (rowSemantics === null || rowSemAutoSet)) {
  //     setRowSemantics(rowSemSuggestion.value); setRowSemAutoSet(true);
  //   }
  // At first evaluation rowSemantics === null, so the guard passes whenever value != null.
  let rowSemantics = null;
  let rowSemAutoSet = false;
  if (rowSemSuggestion.value) {
    rowSemantics = rowSemSuggestion.value;
    rowSemAutoSet = true;
  }

  // hasCondStructure
  const uniqGrps = condPerCol ? [...new Set(condPerCol.filter(Boolean))] : [];
  let hasCondStructure = false;
  if (uniqGrps.length >= 2) hasCondStructure = "header";
  else if (roles.some(r => r === "condition")) hasCondStructure = "cond";

  // effective* + required flags (ImportView.jsx:332, 355-356)
  const effectiveColRel = hasCondStructure ? "replicates" : /* colRelationship */ null;
  const effectiveRowSem = rowSemantics || "ordered";
  const rowSemRequired = !rowSemantics && d.length > 0 && roles.length > 0
                         && rowSemSuggestion.value === null;

  // Summary nDC
  const nDC = roles.filter(r => r === "data").length;

  // Render conditions from ImportView.jsx
  const colRelGateRenders   = nDC >= 2 && !hasCondStructure;            // :726
  const rowSemGateRenders   = nDC >= 1 && !rowSemAutoSet;                // :771
  const vstGateRenders      = "runtime — depends on detectVST(matrix, assay)";

  const runEnabled = !!effectiveColRel && !rowSemRequired && nDC >= 2;   // :974

  console.log(`──── ${label}: ${fileName} ────`);
  console.log(`  raw rows                       : ${raw.length}`);
  console.log(`  cleaned rows                   : ${cleaned.length}  (skipped=${skippedRows}, removedCols=${removedCols.length})`);
  console.log(`  detectBlocks → blocks.length   : ${blocks.length}`);
  console.log(`  detectHeaderRows(nH)           : ${nH}`);
  console.log(`  detectLongFormat → result      : ${lfDet ? "TRUTHY" : "null"}`);
  console.log(`  longFormatDetected state       : ${longFormatDetected}`);
  console.log(`  headers (first 6)              : ${JSON.stringify(h.slice(0, 6))}`);
  console.log(`  condPerCol                     : ${JSON.stringify(condPerCol)}`);
  console.log(`  uniqGrps.length                : ${uniqGrps.length}  (→ hasCondStructure = ${JSON.stringify(hasCondStructure)})`);
  console.log(`  roles                          : ${JSON.stringify(roles)}`);
  console.log(`  nDC (data column count)        : ${nDC}`);
  console.log(`  detectAssay(fileName, h)       : ${JSON.stringify(det)}`);
  console.log(`  assay state (post-applyHeaders): ${assay}`);
  console.log(`  assayAutoDetected              : ${assayAutoDetected}`);
  console.log(`  assaySuggestion                : ${JSON.stringify(assaySuggestion)}`);
  console.log(`  suggestRowSemantics output     : ${JSON.stringify(rowSemSuggestion)}`);
  console.log(`  rowSemantics state             : ${JSON.stringify(rowSemantics)}`);
  console.log(`  rowSemAutoSet                  : ${rowSemAutoSet}`);
  console.log(`  effectiveColRel                : ${JSON.stringify(effectiveColRel)}`);
  console.log(`  effectiveRowSem                : ${effectiveRowSem}`);
  console.log(`  rowSemRequired                 : ${rowSemRequired}`);
  console.log("");
  console.log(`  RENDER: Column Relationship Gate (nDC>=2 && !hasCondStructure)     → ${colRelGateRenders}`);
  console.log(`  RENDER: Row Semantics Gate (nDC>=1 && !rowSemAutoSet)              → ${rowSemGateRenders}`);
  console.log(`  RENDER: VST selector card                                          → ${vstGateRenders}`);
  console.log(`  Run Analyses button enabled (effectiveColRel && !rowSemRequired)   → ${runEnabled}`);
  console.log("");
  return {
    nDC, hasCondStructure, longFormatDetected, assay, assayAutoDetected,
    rowSemSuggestion, rowSemAutoSet, colRelGateRenders, rowSemGateRenders,
    effectiveColRel, rowSemRequired, runEnabled,
  };
}

console.log("===================================================================");
console.log("S121 — Import gate auto-hide regression: runtime state on DS01/DS14");
console.log("===================================================================");
console.log("");

const ds01 = traceFile("DS01", path.join(fixtures, "01-densitometry-clean.csv"));
const ds14 = traceFile("DS14", path.join(fixtures, "14-crctest-survey.csv"));

console.log("──── Divergence summary ────");
const fields = [
  "nDC", "hasCondStructure", "longFormatDetected", "assay",
  "rowSemSuggestion", "rowSemAutoSet",
  "colRelGateRenders", "rowSemGateRenders",
  "effectiveColRel", "rowSemRequired", "runEnabled",
];
for (const k of fields) {
  const a = JSON.stringify(ds01[k]);
  const b = JSON.stringify(ds14[k]);
  const mark = a === b ? "  " : "≠ ";
  console.log(`  ${mark}${k.padEnd(22)} DS01=${a.padEnd(28)} DS14=${b}`);
}
