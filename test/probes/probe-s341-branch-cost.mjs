/* S341 — measure what the row-count resample-count branch costs in verdicts.

   Runs the full battery over every fixture at N seeds, under one of three arms
   (see s341-count-hook.mjs). Records per test per fixture per seed: flag,
   primaryP, and the resample count the result publishes where it publishes one.

     S341_ARM=shipped SEEDS=8 node --import ./test/probes/s341-count-hook.mjs \
       --import ./test/probes/s340-seed-hook.mjs test/probes/probe-s341-branch-cost.mjs

   Writes test/probes/out-s341-branch/<arm>.json. Reads src/, writes nothing there.
   Import pipeline is copied verbatim from probe-s340-seedsweep.mjs so the two
   are comparable and the only difference between arms is the pinned count. */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const ARM = process.env.S341_ARM || 'shipped';
const N_SEEDS = Math.max(1, Number(process.env.SEEDS) || 8);
const ONLY = process.env.ONLY_FIXTURE || null;

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
const OUT = 'test/probes/out-s341-branch';

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

const files = Object.entries(EXPECTED).filter(([f]) => !ONLY || f === ONLY);
const prepared = {};
for (const [file, expected] of files) prepared[file] = prepare(file, expected);

function resampleCount(r) {
  for (const k of ['nPerm', 'nSimulations', 'B', 'nSim', 'nBoot']) {
    if (typeof r[k] === 'number' && isFinite(r[k])) return r[k];
  }
  return null;
}

const seeds = Array.from({ length: N_SEEDS }, (_, i) => i);
const out = { arm: ARM, seeds, fixtures: {}, perTestMs: {} };
const t0 = performance.now();

for (const seed of seeds) {
  globalThis.__S341_SEED = seed;
  const tSeed = performance.now();
  for (const [file, expected] of files) {
    const p = prepared[file];
    const tFix = performance.now();
    const results = await runFullAnalysis(
      p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics
    );
    const fixMs = performance.now() - tFix;
    const { severity } = computeSeverity(results);
    if (!out.fixtures[file]) {
      out.fixtures[file] = {
        nRows: p.matrix.length, nCols: p.matrix[0]?.length || 0,
        expectedSeverity: expected.severity, severityBySeed: [], msBySeed: [], tests: {},
      };
    }
    const F = out.fixtures[file];
    F.severityBySeed.push(severity);
    F.msBySeed.push(+fixMs.toFixed(1));
    for (const r of results) {
      if (!F.tests[r.name]) F.tests[r.name] = { flags: [], ps: [], counts: [] };
      const T = F.tests[r.name];
      T.flags.push(r.flag);
      T.ps.push((typeof r.primaryP === 'number' && isFinite(r.primaryP)) ? r.primaryP : null);
      T.counts.push(resampleCount(r));
    }
  }
  console.log(`[${ARM}] seed ${seed}: ${((performance.now() - tSeed) / 1000).toFixed(1)} s`);
}

out.totalMs = +(performance.now() - t0).toFixed(1);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, `${ARM}.json`), JSON.stringify(out));
console.log(`\n[${ARM}] ${seeds.length} seeds x ${files.length} fixtures in ${(out.totalMs / 1000).toFixed(0)} s -> ${join(OUT, ARM + '.json')}`);
