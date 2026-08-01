/* S340 step 3 — dump every test's flag + primaryP per fixture, plus severity,
   plus per-fixture wallclock. Mirrors test/validate-batch.mjs's import pipeline
   exactly (same preprocess / roles / VST / dataType / rowSemantics resolution).

   Run twice and diff to see what the N_PERM raise displaces through the shared
   createPRNG stream:

     node test/probes/probe-s340-pdump.mjs base
     node --import ./test/probes/s340-nperm-hook.mjs test/probes/probe-s340-pdump.mjs p4999
     node test/probes/probe-s340-pdiff.mjs base p4999

   Writes test/probes/out-s340/<label>.json. Reads src/, writes nothing in src/. */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';
const OUT = 'test/probes/out-s340';
const label = process.argv[2];
if (!label) { console.error('usage: probe-s340-pdump.mjs <label>'); process.exit(1); }

const out = {};
const wallStart = performance.now();

for (const [file, expected] of Object.entries(EXPECTED)) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
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
  const assay = expected.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false,
  });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';

  const t0 = performance.now();
  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics
  );
  const engineMs = performance.now() - t0;
  const { severity } = computeSeverity(results);

  const wa = results.find(r => r.name === 'Windowed Autocorrelation');
  out[file] = {
    nRows: matrix.length,
    nCols: matrix[0]?.length || 0,
    severity,
    engineMs: +engineMs.toFixed(1),
    waNPerm: wa ? (wa.nPerm ?? null) : null,
    waNWindows: wa ? (wa.nWindowsTotal ?? null) : null,
    waNPairs: wa ? (wa.nPairs ?? null) : null,
    tests: results.map(r => ({
      name: r.name,
      flag: r.flag,
      p: (typeof r.primaryP === 'number' && isFinite(r.primaryP)) ? r.primaryP : null,
    })),
  };
  console.log(`${file}: sev=${severity} ${matrix.length}x${matrix[0]?.length || 0} engine=${engineMs.toFixed(0)}ms WA nPerm=${out[file].waNPerm}`);
}

const totalMs = performance.now() - wallStart;
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, `${label}.json`), JSON.stringify({ label, totalMs: +totalMs.toFixed(1), fixtures: out }, null, 1));
console.log(`\ntotal ${totalMs.toFixed(0)} ms -> ${join(OUT, label + '.json')}`);
