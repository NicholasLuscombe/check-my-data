/* probe-seeds8-straddle.mjs
 *
 * Instruments the cells that `SEEDS=8` reports as flag-unstable, so each one can
 * be classified rather than described. For every seed offset it captures, per
 * cell: the adjusted p at full precision, the family size, `B` and the branch
 * that picked it, the raw floor, and the IDENTITY of the unit driving the
 * minimum — so a change of driver shows up as a change of driver rather than as
 * a jump in the number.
 *
 * Reads fixtures through the same import pipeline validate-batch.mjs uses and
 * never writes to them, so the CRLF hazard in the neighbour probe does not
 * apply here.
 *
 * READ-ONLY on src/. The seed offset is applied by test/seed-inject.mjs, a
 * load-time source hook; nothing under src/ changes on disk.
 *
 * Usage: node test/probes/probe-seeds8-straddle.mjs
 *        SEEDS=8 FILES=15-missing-carlisle.csv node test/probes/probe-seeds8-straddle.mjs
 */
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// The hook must be registered before anything pulls in prng.js.
const seedInject = await import('../seed-inject.mjs');
seedInject.registerSeedHook();

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { ALPHA } = await import('../../src/constants/thresholds.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const SEEDS = Math.max(1, Number(process.env.SEEDS) || 8);

/* The three cells SEEDS=8 reports. Overridable so the probe can be pointed at a
   different set if the enumeration changes. */
const DEFAULT_CELLS = [
  ['15-missing-carlisle.csv', 'Cross-Condition Consistency'],
  ['12b-uniform-mixture-fabricated.csv', 'Regional Noise Homogeneity'],
  ['23-recurrence-null-mixed.csv', 'Column Goodness-of-Fit'],
];
const CELLS = process.env.CELLS
  ? process.env.CELLS.split(';').map(s => s.split('|'))
  : DEFAULT_CELLS;
const FILES = [...new Set(CELLS.map(c => c[0]))];

function prep(file) {
  const csv = readFileSync(join('test/fixtures', file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const assay = EXPECTED[file].assay;
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lf = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lf }).value || 'ordered';
  return { matrix, rawMatrix, condCtx, assay, vst, dataType, rowSemantics };
}

/* Per-test driver extraction. Each returns a flat record for one seed. */
function readCCC(r) {
  if (!r || r.flag === 'N/A') return { flag: r?.flag ?? '-', p: null, note: r?.naCause ?? '' };
  const units = (r.details || []).filter(u => u.forensic && u.gatePassed);
  const eps = 1e-12;
  const drivers = units.filter(u => Math.abs(Number(u.adjP) - Number(r.primaryP)) < eps);
  return {
    flag: r.flag, p: r.primaryP,
    B: r.B, c: 2, floor: 2 / (r.B + 1),
    m: `s1=${r.bhMStage1} s2=${r.bhMStage2} s3=${r.bhMStage3}`,
    driver: drivers.length
      ? drivers.map(u => `s${u.stage}:${u.property}`).join(' + ')
      : '(no gate-passed forensic unit at primaryP)',
    nDrivers: drivers.length,
    extra: (r.details || []).filter(u => u.stage === 1)
      .map(u => `${u.property}=${Number(u.adjP).toPrecision(6)}`).join(' '),
  };
}

function readRegionalNoise(r) {
  if (!r || r.flag === 'N/A') return { flag: r?.flag ?? '-', p: null, note: r?.naCause ?? '' };
  const nPerm = r.nPerm;
  const floor = 1 / (nPerm + 1);
  const promoted = (r.colPromoters || []).filter(c => c.promoted);
  const scanTier = r.primaryP < ALPHA.FLAG ? 'HIGH' : r.primaryP < ALPHA.NOTE ? 'MODERATE' : 'LOW';
  const gated = /suppressed by effect-size gate/.test(r.interpretation || '');
  return {
    flag: r.flag, p: r.primaryP,
    B: nPerm, c: 1, floor,
    m: `cols=${(r.colPromoters || []).length}`,
    driver: gated ? 'effect-size gate (forced LOW)'
      : scanTier !== 'LOW' ? `scan p -> ${scanTier}`
        : promoted.length ? `column promotion: ${promoted.map(c => `col${c.col}`).join(',')}`
          : 'scan p -> LOW, no promotion',
    nDrivers: promoted.length,
    extra: `exceed=${Math.round(r.primaryP * (nPerm + 1)) - 1} bestVarRatio=${r.bestVarRatio} ` +
      `minColAdjP=${(r.colPromoters || []).length ? Math.min(...r.colPromoters.map(c => c.adjP)).toPrecision(6) : '-'}`,
  };
}

function readColumnGof(r) {
  if (!r || r.flag === 'N/A') return { flag: r?.flag ?? '-', p: null, note: r?.naCause ?? '' };
  const d0 = (r.details || [])[0];
  return {
    flag: r.flag, p: r.primaryP,
    B: r.nPerm, c: 2, floor: 2 / (r.nPerm + 1),
    m: `tested=${r.nTested}`,
    driver: d0 ? `col${d0.Col} ${d0.Family} ${d0.Direction} adjP=${Number(d0.adjP).toPrecision(6)}` : '(no flagged column)',
    nDrivers: r.nFlagged,
    extra: `nFlagged=${r.nFlagged} flagDriverP=${d0 ? Number(d0.adjP).toPrecision(17) : '-'}`,
  };
}

const READERS = {
  'Cross-Condition Consistency': readCCC,
  'Regional Noise Homogeneity': readRegionalNoise,
  'Column Goodness-of-Fit': readColumnGof,
};

console.log(`thresholds read at source: ALPHA.FLAG=${ALPHA.FLAG}  ALPHA.NOTE=${ALPHA.NOTE}`);
console.log(`flagFromP (constants/thresholds.js:38-41) compares STRICTLY: p < ALPHA.FLAG, p < ALPHA.NOTE\n`);

const rows = {};                 // "file|test" -> per-seed records
const sevBySeed = {};            // file -> [severity per seed]

for (const file of FILES) sevBySeed[file] = [];

for (let s = 0; s < SEEDS; s++) {
  seedInject.setSeed(s);
  for (const file of FILES) {
    const p = prep(file);
    const results = await runFullAnalysis(
      p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics
    );
    sevBySeed[file].push(computeSeverity(results).severity);
    for (const [f, testName] of CELLS) {
      if (f !== file) continue;
      const r = results.find(x => x.name === testName);
      const key = `${file}|${testName}`;
      (rows[key] ||= []).push(READERS[testName](r));
    }
  }
  process.stderr.write(`  seed ${s} done\n`);
}

for (const file of FILES) {
  console.log(`${file.padEnd(42)} severity across seeds: ${sevBySeed[file].join(' ')}` +
    (new Set(sevBySeed[file]).size > 1 ? '   NOT CONSTANT' : ''));
}

for (const [f, testName] of CELLS) {
  const recs = rows[`${f}|${testName}`];
  console.log(`\n${'='.repeat(78)}\n${f}  /  ${testName}\n${'='.repeat(78)}`);
  const r0 = recs.find(r => r.p != null);
  if (r0) {
    console.log(`  B=${r0.B} (c=${r0.c})   raw floor c/(B+1) = ${r0.floor.toPrecision(17)}   family: ${r0.m}`);
  }
  console.log(`\n  seed  flag       adjusted p (full precision)      p/floor    driver`);
  recs.forEach((r, i) => {
    const ratio = r.p != null && r.floor ? (r.p / r.floor).toFixed(4) : '-';
    console.log(`  ${String(i).padEnd(5)} ${String(r.flag).padEnd(10)} ${r.p == null ? '-' : Number(r.p).toPrecision(17).padEnd(24)} ${String(ratio).padEnd(10)} ${r.driver ?? ''}`);
  });
  const ps = recs.map(r => r.p).filter(v => v != null);
  if (ps.length > 1) {
    const mean = ps.reduce((a, b) => a + b, 0) / ps.length;
    const sd = Math.sqrt(ps.reduce((a, b) => a + (b - mean) ** 2, 0) / (ps.length - 1));
    const distFlag = Math.abs(mean - ALPHA.FLAG) / (sd || Infinity);
    const distNote = Math.abs(mean - ALPHA.NOTE) / (sd || Infinity);
    console.log(`\n  mean p ${mean.toPrecision(10)}   sd ${sd.toPrecision(10)}   distinct values ${new Set(ps).size}`);
    console.log(`  |mean - ALPHA.NOTE| / sd = ${distNote.toFixed(3)}      |mean - ALPHA.FLAG| / sd = ${distFlag.toFixed(3)}`);
    const exactNote = ps.filter(v => v === ALPHA.NOTE).length;
    const exactFlag = ps.filter(v => v === ALPHA.FLAG).length;
    console.log(`  seeds where p EXACTLY equals a threshold: ALPHA.NOTE ${exactNote}, ALPHA.FLAG ${exactFlag}`);
    console.log(`  drivers seen: ${[...new Set(recs.map(r => r.driver))].join('  |  ')}`);
  }
  console.log(`\n  per-seed detail:`);
  recs.forEach((r, i) => console.log(`    seed ${i}: ${r.extra ?? ''}`));
}
