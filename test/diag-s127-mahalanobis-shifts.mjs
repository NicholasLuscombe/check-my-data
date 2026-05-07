// S127 Path 1 diagnostic — per-fixture Mahalanobis Row Outlier flag dump.
// Reports: flag, primaryP, nOutliers, groupsAssessed.
// Confirms the dispatch correction on multi-condition row-grouped fixtures
// (DS15 candidate). Mirrors validate-batch.mjs's import + setup so the
// diag agrees with the GT pipeline.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import("papaparse");
const { extractAnalysisInputs, runFullAnalysis } = await import("../src/analysis/engine.js");
const { detectVST } = await import("../src/stats/vst.js");
const { inferRoles } = await import("../src/import/roles.js");
const { detectAssay } = await import("../src/constants/assays.js");
const { forwardFill, preprocessRaw, detectHeaderRows } = await import("../src/import/parser.js");
const { detectLongFormat } = await import("../src/import/longFormat.js");
const { suggestRowSemantics } = await import("../src/import/rowSemantics.js");

const FIX_DIR = "test/fixtures";

// Mirror validate-batch.mjs's per-fixture assay map (canonical).
const ASSAY = {
  "01-densitometry-clean.csv": "densitometry",
  "02-densitometry-fabricated.csv": "densitometry",
  "03-qpcr-clean.csv": "qpcr",
  "04-qpcr-fabricated.csv": "qpcr",
  "05-cellcount-clean.csv": "cell_count",
  "06-cellcount-fabricated.csv": "cell_count",
  "07-elisa-clean.csv": "elisa",
  "08-elisa-fabricated.csv": "elisa",
  "09-proteomics-clean.csv": "proteomics",
  "10-proteomics-fabricated.csv": "proteomics",
  "11-rnaseq-multicondition.csv": "genomics",
  "12a-uniform-mixture-clean.csv": "general",
  "12b-uniform-mixture-fabricated.csv": "general",
  "13-vfstest-cellcountest.csv": "cell_count",
  "14-crctest-survey.csv": "survey",
  "15-missing-carlisle.csv": "general",
  "16-densitometry-carlisle-overbalanced.csv": "densitometry",
  "17-densitometry-carlisle-clean.csv": "densitometry",
  "19-inheritance-fabricated.csv": "general",
  "20-bimodal-fab.csv": "general",
  "21-localised-ar.csv": "general",
  "22-covariance-block.csv": "general",
};

const files = readdirSync(FIX_DIR).filter(f => f.endsWith(".csv")).sort();

console.log("Fixture                                     | Mahal flag | primaryP   | nOut | groupsAssessed");
console.log("--------------------------------------------+------------+------------+------+--------------------");

for (const f of files) {
  const assay = ASSAY[f];
  if (!assay) continue;

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

  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false,
  });
  const vst = detectVST(matrix, assay);
  const dataType = assay === "survey" ? "survey" : (assay === "cell_count" ? "count" : "continuous");
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || "ordered";

  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics
  );

  const m = results.find(r => r.name === "Mahalanobis Row Outlier");
  if (!m) { console.log(`${f.padEnd(43)} | (not in results)`); continue; }
  const flag = (m.flag || "").padEnd(10);
  const p = m.primaryP != null && Number.isFinite(Number(m.primaryP))
    ? Number(m.primaryP).toExponential(3)
    : (m.primaryP ?? "—");
  const nOut = m.nOutliers ?? "—";
  const ca = m.groupsAssessed ?? "—";
  console.log(`${f.padEnd(43)} | ${flag} | ${String(p).padEnd(10)} | ${String(nOut).padEnd(4)} | ${ca}`);
}
