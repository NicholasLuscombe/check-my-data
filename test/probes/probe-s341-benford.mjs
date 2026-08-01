/* S341 Phase B — Benford continuity correction, before/after.
   Captures per fixture per seed: both Benford tests' flag, pMAD/primaryP, MAD,
   nSimulations, and the aggregate-layer Fisher fields. `fisherDF` is the tell for
   the dropped-group question: aggregation.js:207 filters `p > 0`, and
   fisherDF = validPs.length * 2, so fisherDF < 2*groupsAssessed means a group was
   dropped for having p = 0.

     LABEL=before SEEDS=8 node --import ./test/probes/s341-seed-hook.mjs \
       test/probes/probe-s341-benford.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const LABEL = process.env.LABEL || 'before';
const N_SEEDS = Math.max(1, Number(process.env.SEEDS) || 8);

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
const OUT = 'test/probes/out-s341-benford';
const BEN = ["Benford's Law (First Digit)", "Benford's Law (Second Digit)"];

function prepare(file, expected) {
  const parsed = Papa.default.parse(readFileSync(join(FIXTURES, file), 'utf-8'), { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const hr = detectHeaderRows(raw);
  const cpc = hr >= 2 ? forwardFill(raw[0]) : null;
  const roles = inferRoles(raw.slice(hr), raw[hr - 1], cpc);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data: raw.slice(hr), roles, condPerCol: cpc, zeroAsMissing: false });
  return { matrix, rawMatrix, condCtx, assay: expected.assay, vst: detectVST(matrix, expected.assay),
    dataType: ASSAY_DATATYPE_MAP[expected.assay] || 'continuous',
    rowSemantics: suggestRowSemantics({ assay: expected.assay, longFormatDetected: !!detectLongFormat(raw[hr - 1], raw.slice(hr)) }).value || 'ordered' };
}

const prepared = {};
for (const [f, e] of Object.entries(EXPECTED)) prepared[f] = prepare(f, e);

const out = { label: LABEL, seeds: N_SEEDS, fixtures: {} };
for (let s = 0; s < N_SEEDS; s++) {
  globalThis.__S341_SEED = s;
  for (const [file, expected] of Object.entries(EXPECTED)) {
    const p = prepared[file];
    const results = await runFullAnalysis(p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics);
    const { severity } = computeSeverity(results);
    const F = (out.fixtures[file] ||= { expectedSeverity: expected.severity, severityBySeed: [], tests: {}, allFlags: [] });
    F.severityBySeed.push(severity);
    F.allFlags.push(Object.fromEntries(results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE').map(r => [r.name, r.flag])));
    for (const name of BEN) {
      const r = results.find(x => x.name === name);
      const T = (F.tests[name] ||= []);
      T.push(r ? {
        flag: r.flag, primaryP: r.primaryP, pMAD: r.pMAD, MAD: r.MAD,
        nSimulations: r.nSimulations, naCause: r.naCause,
        groupsAssessed: r.groupsAssessed, fisherDF: r.fisherDF, fisherP: r.fisherP,
        fisherChi: r.fisherChi, worstGroupFlagRaw: r.worstGroupFlagRaw,
        groupMinP: r.groupMinP, multiplicityCorrected: r.multiplicityCorrected,
      } : null);
    }
  }
  console.log(`[${LABEL}] seed ${s} done`);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, `${LABEL}.json`), JSON.stringify(out));
console.log(`-> ${join(OUT, LABEL + '.json')}`);
