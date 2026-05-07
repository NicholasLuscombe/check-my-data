// S127b fold-in diagnostic — full DS15 Mahalanobis result dump.
// Confirms what flag the engine actually returns for DS15 Mahalanobis,
// to identify why the chip renders despite Phase 2 showing LOW.

import { readFileSync } from "node:fs";

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import("papaparse");
const { extractAnalysisInputs, runFullAnalysis } = await import("../src/analysis/engine.js");
const { detectVST } = await import("../src/stats/vst.js");
const { inferRoles } = await import("../src/import/roles.js");
const { forwardFill, preprocessRaw, detectHeaderRows } = await import("../src/import/parser.js");
const { detectLongFormat } = await import("../src/import/longFormat.js");
const { suggestRowSemantics } = await import("../src/import/rowSemantics.js");
const { buildFindings } = await import("../src/analysis/findings.js");

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

const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
  data, roles, condPerCol, zeroAsMissing: false,
});
const assay = "general";
const vst = detectVST(matrix, assay);
const dataType = "continuous";
const lfDet = detectLongFormat(headers, data);
const rs = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || "ordered";

const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rs);

const m = results.find(r => r.name === "Mahalanobis Row Outlier");
console.log("\n=== Mahalanobis Row Outlier full result ===");
console.log("flag:               ", JSON.stringify(m.flag));
console.log("primaryP:           ", m.primaryP);
console.log("nOutliers:          ", m.nOutliers);
console.log("nRows:              ", m.nRows);
console.log("groupsAssessed: ", m.groupsAssessed);
console.log("groupsFlagged:  ", m.groupsFlagged);
console.log("category:           ", m.category);
console.log("subDetails length:  ", (m.subDetails || []).length);
console.log("details length:     ", (m.details || []).length);
console.log("---");
console.log("subDetails sample (first 3):");
console.log(JSON.stringify((m.subDetails || []).slice(0, 3), null, 2));

console.log("\n=== buildFindings output for DS15 ===");
const findings = buildFindings(results, matrix.length, matrix[0]?.length || 0, {});
const localFindings = findings.filter(f => f.type === "localised");
for (const f of localFindings) {
  console.log(`  ${f.id} | sev=${f.severity} | regNum=${f.regionNumber} | tests=${f.tests.map(t => t.testId).join(",")} | region.cells.length=${f.region?.cells?.length ?? "(no region)"}`);
}
