// probe-s343-run.mjs — S343 part 3. What does the tool actually produce?
//
// Two jobs:
//   MODE=derived  run all eight clean fixtures at the DERIVED seed (the stream
//                 the shipped engine produces for that file — the seed hook's
//                 offset 0 is the identity, so this is a plain unhooked run)
//   MODE=sweep    sweep PRNG offsets on one fixture and report the fraction
//                 that come back non-clean, plus which test drives each flag
//
// The offset injected by test/seed-inject.mjs XORs into createPRNGFromSeed's
// starting state. Offset 0 changes nothing, so offset 0 IS the derived stream
// and offsets 1..N are counterfactual streams the file itself cannot produce.
// A sweep therefore measures how close this file sits to a verdict boundary,
// with the derived run as one observed draw from that same distribution.
//
// READ-ONLY on src/. The hook rewrites prng.js at load time, in memory only.
//
// Usage:
//   MODE=derived node test/probes/probe-s343-run.mjs
//   MODE=sweep FILE=09-proteomics-clean.csv N=300 node test/probes/probe-s343-run.mjs
//   MODE=sweep ALLCLEAN=1 N=40 node test/probes/probe-s343-run.mjs

import { readFileSync } from 'fs';
import { join } from 'path';

const MODE = process.env.MODE || 'derived';
const N = Math.max(1, Number(process.env.N) || 100);
const FILE = process.env.FILE || '09-proteomics-clean.csv';
const ALLCLEAN = process.env.ALLCLEAN === '1';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// The hook must be registered before anything pulls in src/stats/prng.js.
let setSeed = () => {};
if (MODE === 'sweep') {
  const seedInject = await import('../seed-inject.mjs');
  seedInject.registerSeedHook();
  setSeed = seedInject.setSeed;
}

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { VERDICT_TEXT, ACTION_LABEL } = await import('../../src/analysis/narrative.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';

// One fixture's engine inputs, built exactly as validate-batch.mjs:74-125 does.
// (probe-s343-entrypoint-parity.mjs establishes the browser path produces the
// same matrix, so this is also the browser's input.)
function prep(file) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = EXPECTED[file].assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';
  return { matrix, rawMatrix, condCtx, assay, vst, dataType, rowSemantics };
}

async function run(p) {
  const results = await runFullAnalysis(
    p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics
  );
  const sev = computeSeverity(results);
  return { results, ...sev };
}

const CLEAN = Object.entries(EXPECTED).filter(([, e]) => e.severity === 0).map(([f]) => f).filter(f => f.endsWith('.csv'));

// ── MODE=derived ────────────────────────────────────────────────────────
if (MODE === 'derived') {
  console.log('S343 — the eight clean fixtures at their own derived seed\n');
  console.log('Unhooked run. This is what the deployed tool shows a user who uploads the file.\n');
  for (const file of CLEAN) {
    const t0 = Date.now();
    const { results, severity, high, mod, nFlaggedDimensions } = await run(prep(file));
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    const firing = results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE');
    console.log(`${file}`);
    console.log(`  severity ${severity}   band "${VERDICT_TEXT[severity].headline}" / "${VERDICT_TEXT[severity].sub}"   outcome ${ACTION_LABEL[severity].score}/4 ${ACTION_LABEL[severity].label}`);
    console.log(`  HIGH ${high}  MODERATE ${mod}  dimensions ${nFlaggedDimensions}   (${secs}s)`);
    if (firing.length) {
      for (const r of firing) {
        console.log(`    FIRES  ${r.flag.padEnd(9)} ${r.name}   p=${r.primaryP}`);
        const ds = (r.details || []).slice(0, 6);
        for (const d of ds) console.log(`             detail: ${JSON.stringify(d).slice(0, 220)}`);
        const sd = (r.subDetails || []).slice(0, 6);
        for (const d of sd) console.log(`             subDetail: ${JSON.stringify(d).slice(0, 220)}`);
      }
    } else {
      console.log('    no MODERATE or HIGH firing');
    }
    // near-boundary view: the smallest primaryP values, flagged or not
    const near = results
      .filter(r => Number.isFinite(Number(r.primaryP)))
      .map(r => ({ n: r.name, p: Number(r.primaryP), f: r.flag }))
      .sort((a, b) => a.p - b.p).slice(0, 4);
    console.log('    closest to the ladder: ' + near.map(x => `${x.n} p=${x.p.toExponential(2)} (${x.f})`).join('; '));
    console.log('');
  }
}

// ── MODE=sweep ──────────────────────────────────────────────────────────
if (MODE === 'sweep') {
  const files = ALLCLEAN ? CLEAN : [FILE];
  console.log(`S343 — PRNG offset sweep, ${N} offsets (0..${N - 1}) per fixture`);
  console.log('Offset 0 is the identity: it IS the derived stream the shipped tool uses.\n');
  for (const file of files) {
    const p = prep(file);
    const bySeverity = { 0: 0, 1: 0, 2: 0, 3: 0 };
    const driverCount = {};
    const flagSeeds = [];
    const t0 = Date.now();
    for (let s = 0; s < N; s++) {
      setSeed(s);
      const { results, severity } = await run(p);
      bySeverity[severity]++;
      if (severity > 0) {
        const firing = results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE');
        for (const r of firing) {
          const k = `${r.name} [${r.flag}]`;
          driverCount[k] = (driverCount[k] || 0) + 1;
        }
        flagSeeds.push(`${s}:sev${severity}(${firing.map(r => r.name).join('+')})`);
      }
    }
    const nonClean = N - bySeverity[0];
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`${file}   ${secs}s for ${N} offsets`);
    console.log(`  non-clean ${nonClean}/${N} = ${(100 * nonClean / N).toFixed(1)}%   severity counts 0:${bySeverity[0]} 1:${bySeverity[1]} 2:${bySeverity[2]} 3:${bySeverity[3]}`);
    if (nonClean) {
      console.log('  drivers (test [tier] -> how many of the flagging offsets):');
      for (const [k, v] of Object.entries(driverCount).sort((a, b) => b[1] - a[1])) console.log(`    ${String(v).padStart(4)}  ${k}`);
      console.log('  flagging offsets: ' + flagSeeds.slice(0, 40).join(', ') + (flagSeeds.length > 40 ? ` … (+${flagSeeds.length - 40})` : ''));
    }
    console.log('');
  }
}
