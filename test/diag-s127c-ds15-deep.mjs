// S127c audit — deeper DS15 Mahalanobis dump.
// Captures per-group binomP, stratified result top-level, and the
// MiniCard's would-be footer string assembly to nail down where 0.0019
// could come from.

import { readFileSync } from "node:fs";
import { join } from "node:path";

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import("papaparse");
const { extractAnalysisInputs, runFullAnalysis } = await import("../src/analysis/engine.js");
const { detectVST } = await import("../src/stats/vst.js");
const { inferRoles } = await import("../src/import/roles.js");
const { forwardFill, preprocessRaw, detectHeaderRows } = await import("../src/import/parser.js");
const { detectLongFormat } = await import("../src/import/longFormat.js");
const { suggestRowSemantics } = await import("../src/import/rowSemantics.js");
const { testMahalanobisOutlier } = await import("../src/tests/mahalanobis.js");
const { aggregatePerGroup } = await import("../src/analysis/aggregation.js");

const csv = readFileSync("test/fixtures/15-missing-carlisle.csv", "utf-8");
const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
let raw = parsed.data;
const pp = preprocessRaw(raw);
raw = pp.rows;
const headerRows = detectHeaderRows(raw);
let condPerCol = null;
if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
const headers = raw[headerRows - 1];
const data = raw.slice(headerRows);
const roles = inferRoles(data, headers, condPerCol);

const { matrix, condCtx } = extractAnalysisInputs({
  data, roles, condPerCol, zeroAsMissing: false,
});
const assay = "general";
const vst = detectVST(matrix, assay);

console.log("=== Setup ===");
console.log(`Total data rows after preprocess: ${data.length}`);
console.log(`Matrix rows: ${matrix.length} × cols: ${matrix[0]?.length}`);
console.log(`condCtx type: ${condCtx?.type}, count: ${condCtx?.count}`);
console.log(`VST: ${vst?.transform || "raw"}`);

const groups = condCtx?.rowGroups();
console.log(`\n=== rowGroups() output ===`);
if (groups) {
  groups.forEach((g, i) => {
    console.log(`  group ${i}: name=${g.name}, matrix rows=${g.matrix.length}, rowIndices.length=${g.rowIndices.length}`);
  });
} else {
  console.log("  (null)");
}

console.log(`\n=== Per-group testMahalanobisOutlier output ===`);
if (groups) {
  for (const g of groups) {
    const r = testMahalanobisOutlier(g.matrix, assay);
    console.log(`  ${g.name}: flag=${r.flag} primaryP=${r.primaryP?.toExponential(4) ?? r.primaryP} binomP=${r.binomP} nOutliers=${r.nOutliers} nRows=${r.nRows} nExceedP01=${r.nExceedP01} expectedExceedP01=${r.expectedExceedP01} details=${r.details?.length ?? 0}`);
  }
}

console.log(`\n=== aggregatePerGroup output (stratified) ===`);
const strat = await aggregatePerGroup(m => testMahalanobisOutlier(m, assay), groups);
console.log(`  flag: ${strat.flag}`);
console.log(`  primaryP: ${strat.primaryP}`);
console.log(`  fisherChi: ${strat.fisherChi} fisherDF: ${strat.fisherDF} fisherP: ${strat.fisherP}`);
console.log(`  groupsAssessed: ${strat.groupsAssessed}, groupsFlagged: ${strat.groupsFlagged}`);
console.log(`  details (per-group table):`);
(strat.details || []).forEach(d => console.log(`    ${JSON.stringify(d)}`));
console.log(`  subDetails length: ${(strat.subDetails || []).length}`);
console.log(`  nRows (top-level spread): ${strat.nRows}`);
console.log(`  nOutliers (top-level spread): ${strat.nOutliers}`);
console.log(`  binomP (top-level spread): ${strat.binomP}`);

console.log(`\n=== Pooled testMahalanobisOutlier output (full matrix) ===`);
const pooled = testMahalanobisOutlier(matrix, assay);
console.log(`  flag: ${pooled.flag}`);
console.log(`  primaryP: ${pooled.primaryP?.toExponential(4) ?? pooled.primaryP}`);
console.log(`  binomP: ${pooled.binomP}`);
console.log(`  nOutliers: ${pooled.nOutliers}`);
console.log(`  nRows: ${pooled.nRows}`);
console.log(`  nExceedP01: ${pooled.nExceedP01}`);

console.log(`\n=== Full runFullAnalysis Mahalanobis result ===`);
const dataType = "continuous";
const lfDet = detectLongFormat(headers, data);
const rs = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || "ordered";
const results = await runFullAnalysis(matrix, /*rawMatrix*/null, condCtx, assay, null, vst, {}, dataType, rs);
const m = results.find(r => r.name === "Mahalanobis Row Outlier");
console.log(`  flag: ${m.flag}`);
console.log(`  primaryP: ${m.primaryP?.toExponential(4) ?? m.primaryP}`);
console.log(`  nRows (top-level): ${m.nRows}`);
console.log(`  nOutliers: ${m.nOutliers}`);
console.log(`  groupsAssessed: ${m.groupsAssessed}`);
console.log(`  details: ${m.details?.length ?? 0} entries`);
console.log(`  subDetails: ${m.subDetails?.length ?? 0} entries`);
console.log(`  binomP (top-level): ${m.binomP}`);
console.log(`  fisherChi: ${m.fisherChi} fisherP: ${m.fisherP}`);

const detailsArr = m.details || [];
const totalRowsMiniCard = (m.groupsAssessed !== undefined) && detailsArr.length > 0
  ? detailsArr.reduce((s, d) => s + (d.nRowsTested || d.rows || 0), 0)
  : (m.nRows || 0);
console.log(`\n=== MiniCard footer simulation ===`);
console.log(`  totalRows: ${totalRowsMiniCard}`);
console.log(`  totalOutliers: ${(m.groupsAssessed !== undefined) ? (m.subDetails || []).length : (m.nOutliers || 0)}`);
console.log(`  primaryP for footer: ${m.primaryP}`);
console.log(`  flag drives headline branch: ${m.flag === "LOW" ? "LOW (\"All rows fit\")" : m.flag === "HIGH" ? "HIGH" : "default (FLAGGED-style)"}`);
