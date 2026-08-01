/* S340 step 2 — seed sweep. Runs the full battery over every fixture at N
   seeds, changing nothing but the PRNG's starting state.

   The engine has no seed parameter (createPRNG hashes the data), so the seed
   is injected by s340-seed-hook.mjs. Seed 0 is the shipped stream.

     node --import ./test/probes/s340-seed-hook.mjs test/probes/probe-s340-seedsweep.mjs [nSeeds]

   Writes test/probes/out-s340-seed/sweep.json. Reads src/, writes nothing there.

   Per test per fixture it records flag, primaryP, and whatever resample count
   the result exposes (nPerm / nSimulations / B / nSim), so the report can use
   a measured B where one is published rather than an assumed one. */
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
const OUT = 'test/probes/out-s340-seed';
const N_SEEDS = Number(process.argv[2] || 8);

/* Import pipeline mirrors test/validate-batch.mjs exactly. Hoisted out of the
   seed loop: it consumes no randomness, so preparing each fixture once keeps
   the seed the only thing that varies. */
function prepare(file, expected) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const pp = preprocessRaw(parsed.data);
  const raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
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
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';
  return { matrix, rawMatrix, condCtx, assay, vst, dataType, rowSemantics };
}

const prepared = {};
for (const [file, expected] of Object.entries(EXPECTED)) prepared[file] = prepare(file, expected);

/** First published resample count on a result, or null. Measured, not assumed. */
function resampleCount(r) {
  for (const k of ['nPerm', 'nSimulations', 'B', 'nSim', 'nBoot']) {
    if (typeof r[k] === 'number' && isFinite(r[k])) return { field: k, value: r[k] };
  }
  return null;
}

const seeds = Array.from({ length: N_SEEDS }, (_, i) => i);
const out = { seeds, fixtures: {} };
const t0 = performance.now();

for (const seed of seeds) {
  globalThis.__S340_SEED = seed;
  const tSeed = performance.now();
  for (const [file, expected] of Object.entries(EXPECTED)) {
    const p = prepared[file];
    const results = await runFullAnalysis(
      p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics
    );
    const { severity } = computeSeverity(results);
    if (!out.fixtures[file]) {
      out.fixtures[file] = {
        nRows: p.matrix.length, nCols: p.matrix[0]?.length || 0,
        expectedSeverity: expected.severity, severityBySeed: [], tests: {},
      };
    }
    const F = out.fixtures[file];
    F.severityBySeed.push(severity);
    for (const r of results) {
      if (!F.tests[r.name]) F.tests[r.name] = { flags: [], ps: [], counts: [] };
      const T = F.tests[r.name];
      T.flags.push(r.flag);
      T.ps.push((typeof r.primaryP === 'number' && isFinite(r.primaryP)) ? r.primaryP : null);
      T.counts.push(resampleCount(r));
    }
  }
  console.log(`seed ${seed}: ${((performance.now() - tSeed) / 1000).toFixed(1)} s`);
}

out.totalMs = +(performance.now() - t0).toFixed(1);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'sweep.json'), JSON.stringify(out));
console.log(`\n${seeds.length} seeds x ${Object.keys(EXPECTED).length} fixtures in ${(out.totalMs / 1000).toFixed(0)} s -> ${join(OUT, 'sweep.json')}`);
