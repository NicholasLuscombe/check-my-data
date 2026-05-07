// S127 Path 1 verification — pooled-vs-stratified per-fixture compare.
// Bypasses engine.js dispatch by calling the test producer directly with
// each path. Used to identify which fixtures shifted pre-S127 → post-S127
// and document the magnitude.

import { readFileSync } from "node:fs";
import { join } from "node:path";

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import("papaparse");
const { extractAnalysisInputs } = await import("../src/analysis/engine.js");
const { detectVST } = await import("../src/stats/vst.js");
const { inferRoles } = await import("../src/import/roles.js");
const { forwardFill, preprocessRaw, detectHeaderRows } = await import("../src/import/parser.js");
const { testMahalanobisOutlier } = await import("../src/tests/mahalanobis.js");
const { aggregatePerGroup } = await import("../src/analysis/aggregation.js");

const FIX_DIR = "test/fixtures";
const FIXTURES = [
  ["01-densitometry-clean.csv", "densitometry"],
  ["02-densitometry-fabricated.csv", "densitometry"],
  ["03-qpcr-clean.csv", "qpcr"],
  ["04-qpcr-fabricated.csv", "qpcr"],
  ["05-cellcount-clean.csv", "cell_count"],
  ["06-cellcount-fabricated.csv", "cell_count"],
  ["07-elisa-clean.csv", "elisa"],
  ["08-elisa-fabricated.csv", "elisa"],
  ["09-proteomics-clean.csv", "proteomics"],
  ["10-proteomics-fabricated.csv", "proteomics"],
  ["11-rnaseq-multicondition.csv", "genomics"],
  ["12a-uniform-mixture-clean.csv", "general"],
  ["12b-uniform-mixture-fabricated.csv", "general"],
  ["13-vfstest-cellcountest.csv", "cell_count"],
  ["14-crctest-survey.csv", "survey"],
  ["15-missing-carlisle.csv", "general"],
  ["16-densitometry-carlisle-overbalanced.csv", "densitometry"],
  ["17-densitometry-carlisle-clean.csv", "densitometry"],
  ["19-inheritance-fabricated.csv", "general"],
  ["20-bimodal-fab.csv", "general"],
  ["21-localised-ar.csv", "general"],
  ["22-covariance-block.csv", "general"],
];

console.log("Fixture                                     | mahalGroups | Pooled flag/p              | Stratified flag/p");
console.log("--------------------------------------------+-------------+---------------------------+--------------------------");

for (const [f, assay] of FIXTURES) {
  if (assay === "genomics") {
    console.log(`${f.padEnd(43)} | (genomics: N/A by gate)`);
    continue;
  }
  const csv = readFileSync(join(FIX_DIR, f), "utf-8");
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
  const vst = detectVST(matrix, assay);
  // Apply VST (mirror engine.js logic)
  let m = matrix;
  if (vst && vst.transform === "log") {
    m = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  } else if (vst && vst.transform === "anscombe") {
    m = matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  }
  const ctx = vst && vst.transform !== "raw" ? condCtx.withMatrix(m) : condCtx;

  // Pooled (full-matrix joint fit).
  const pooled = testMahalanobisOutlier(m, assay);
  const pFlag = pooled.flag.padEnd(8);
  const pP = pooled.primaryP != null ? Number(pooled.primaryP).toExponential(3) : "—";
  const pStr = `${pFlag} p=${String(pP).padEnd(10)} nOut=${pooled.nOutliers ?? "—"}`;

  // Stratified (per-condition).
  const groups = ctx?.rowGroups();
  let sStr;
  if (!groups) {
    sStr = "(no row-condition groups → stratification not applicable)";
  } else {
    const strat = await aggregatePerGroup(mm => testMahalanobisOutlier(mm, assay), groups);
    const sFlag = strat.flag.padEnd(8);
    const sP = strat.primaryP != null ? Number(strat.primaryP).toExponential(3) : "—";
    sStr = `${sFlag} p=${String(sP).padEnd(10)} gAssessed=${strat.groupsAssessed ?? "—"}`;
  }
  const groupStr = groups ? `${groups.length} cond` : "null";
  console.log(`${f.padEnd(43)} | ${groupStr.padEnd(11)} | ${pStr.padEnd(25)} | ${sStr}`);
}
