// Resample resolution across the battery.
//
// Šidák assumes a continuous null. A test whose p sits on a coarse grid has no
// value between firing and not firing once the grid is multiplied by the group
// count, so the correction over-shoots. This censuses every test whose p comes
// from a permutation, bootstrap or simulation, and asks one question per test:
// which severity tiers can it still reach?
//
// THE FLOOR IS NOT ALWAYS A COUNT. Two tests in the battery have a floor set by
// something a resample count cannot move, and the census names them rather than
// bumping a constant that cannot reach the problem:
//   Modality Test — the bootstrap was retired and replaced by an analytical dip
//     p, but a hardcoded `P_FLOOR = 0.001` clamp was kept to preserve the old
//     calibration. There is no count to raise.
//   Selective Noise Partitioning — Bartlett's chi-squared and a per-column
//     Levene, both analytical. It has no resample null at all.
//
// Two numbers per test, and they answer different questions. The ARITHMETIC
// floor is what the test could return on maximally extreme data, read from the
// constant at source. The OBSERVED minimum is the smallest primaryP the test
// actually produces anywhere in the fixture suite. The ratio between them is
// the multiplier the test's own internal BH imposes, measured rather than
// assumed — BH at rank i of m returns the floor unchanged when every unit sits
// at the floor, and floor × m / k when only k units do.
//
// Usage: node test/probes/probe-resample-census.mjs [--observed]
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const B = new URL('../../', import.meta.url).pathname;
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import(B + 'src/analysis/engine.js');
const { detectVST } = await import(B + 'src/stats/vst.js');
const { inferRoles } = await import(B + 'src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import(B + 'src/import/parser.js');
const { flagFromP, ALPHA } = await import(B + 'src/constants/thresholds.js');
const { sidakAdjust } = await import(B + 'src/stats/primitives.js');
const { EXPECTED, ASSAY_DATATYPE_MAP } = await import(B + 'test/batch-fixtures.mjs');
const FIX = join(B, 'test/fixtures');
const num = (x) => (x == null ? NaN : (typeof x === 'number' ? x : parseFloat(x)));

// Read at source. `count` is the resample count the test uses; where it varies
// with data size every branch is listed, smallest first, because the smallest
// count is the one that sets the worst floor.
const CENSUS = [
  { name: "Benford's Law (First Digit)",  konst: 'N_SIM_BENFORD', at: 'benford.js:56',                counts: [5000],           floor: n => 1 / n,        note: 'exceed / N, no +1' },
  { name: "Benford's Law (Second Digit)", konst: 'N_SIM',         at: 'benford2.js:88',               counts: [5000],           floor: n => 1 / n,        note: 'exceed / N, no +1' },
  { name: 'Column Goodness-of-Fit',       konst: 'B',             at: 'columnGof.js:36',              counts: [999],            floor: n => 2 / (1 + n),  note: 'counters start at 1, two-sided doubling' },
  { name: 'Entropy / Zipf Analysis',      konst: 'B',             at: 'entropyTest.js:37',            counts: [999],            floor: n => 2 / (1 + n),  note: 'counters start at 1, two-sided doubling' },
  { name: 'Excess Kurtosis',              konst: 'N_SIM',         at: 'kurtosis.js:167',              counts: [1999],           floor: n => 1 / (1 + n),  note: '' },
  { name: 'Inter-Replicate Correlation',  konst: 'N_PERM',        at: 'interReplicateCorrelation.js:241', counts: [199, 499, 999], floor: n => 1 / (1 + n), note: 'by max rows' },
  { name: 'Regional Noise Homogeneity',   konst: 'N_PERM',        at: 'regionalNoise.js:148',         counts: [499, 4999],      floor: n => 1 / (1 + n),  note: 'by valid rows' },
  { name: 'Residual Spike Correlation',   konst: 'N_PERM',        at: 'residualSpikeCorrelation.js:113', counts: [999],          floor: n => 1 / (1 + n),  note: '' },
  { name: 'Windowed Autocorrelation',     konst: 'N_PERM',        at: 'windowedAutocorrelation.js:87', counts: [199, 499, 999],  floor: n => 1 / (1 + n),  note: 'by rows' },
  { name: 'Blocked Mahalanobis',          konst: 'N_PERM',        at: 'blockedMahalanobis.js:510',    counts: [999, 4999],      floor: n => 1 / (1 + n),  note: 'by max rows' },
  { name: 'Constant-Offset Blocks',       konst: 'N_PERM',        at: 'constantOffset.js:173',        counts: [199, 499, 999],  floor: n => 1 / (1 + n),  note: 'by rows' },
  { name: 'Runs Test',                    konst: 'N_PERM',        at: 'runs.js:221',                  counts: [199, 499, 999],  floor: n => 1 / (1 + n),  note: 'window scan only; minAdjP is analytical' },
  { name: 'LOESS Residual Analysis',      konst: 'N_PERM',        at: 'loessResidual.js:179',         counts: [499, 4999],      floor: n => 1 / (1 + n),  note: 'by valid rows' },
  { name: 'Cross-Condition Consistency',  konst: 'B',             at: 'crossConditionConsistency.js:167', counts: [199, 499, 999], floor: n => 1 / (1 + n), note: 'by max rows' },
];
// Floors a resample count cannot move.
const NOT_A_COUNT = [
  { name: 'Modality Test',               at: 'modality.js:68',      floor: 0.001, why: 'hardcoded P_FLOOR clamp on an analytical dip p; the bootstrap was retired' },
  { name: 'Selective Noise Partitioning', at: 'selectiveNoise.js:92', floor: 0,    why: 'analytical Bartlett chi-squared plus per-column Levene; no resample null exists' },
];

const tiers = (p) => {
  const f = flagFromP(p);
  return f === 'HIGH' ? 'HIGH MOD' : f === 'MODERATE' ? 'MOD only' : 'none';
};

console.log(`### Part 1 — the census. Thresholds: HIGH p < ${ALPHA.FLAG}, MODERATE p < ${ALPHA.NOTE}.\n`);
console.log('  Floor columns are arithmetic, from the constant at source. "BH best" is the floor when every');
console.log('  unit in the test\'s internal family sits at it, which leaves it unchanged. "BH k=1" and "k=2"');
console.log('  are the floor when only one or two units do, at the family size m shown.\n');
console.log('  ' + 'test'.padEnd(31) + 'const'.padEnd(16) + 'count'.padEnd(17) + 'raw floor'.padEnd(11) +
            'x Sidak G=2'.padEnd(13) + 'G=3'.padEnd(11) + 'G=6'.padEnd(11) + 'tiers at G=2');
console.log('  ' + '-'.repeat(128));
for (const c of CENSUS) {
  const n = c.counts[0];                    // smallest count = worst floor
  const f = c.floor(n);
  console.log('  ' + c.name.padEnd(31) + c.konst.padEnd(16) + c.counts.join('/').padEnd(17) +
    f.toPrecision(3).padEnd(11) +
    sidakAdjust(f, 2).toPrecision(3).padEnd(13) + sidakAdjust(f, 3).toPrecision(3).padEnd(11) +
    sidakAdjust(f, 6).toPrecision(3).padEnd(11) + tiers(sidakAdjust(f, 2)));
}
console.log('\n  Floors no resample count can move:\n');
for (const c of NOT_A_COUNT) {
  console.log('  ' + c.name.padEnd(31) + c.at.padEnd(28) + `floor ${c.floor}`.padEnd(13) +
    `tiers ${c.floor > 0 ? tiers(c.floor) : 'continuous, no floor'}`);
  console.log('  ' + ''.padEnd(31) + c.why);
}

// ── measured: the smallest primaryP each test actually reaches ─────────────
if (process.argv.includes('--observed')) {
  console.log('\n\n### Observed — the smallest primaryP each test reaches anywhere in the 27-fixture suite.\n');
  console.log('  The ratio to the arithmetic floor is the multiplier the test\'s own internal BH imposes on');
  console.log('  the fixture where it drives hardest. Measured, not assumed.\n');
  const best = new Map();
  for (const file of readdirSync(FIX).filter(f => f.endsWith('.csv') && EXPECTED[f]).sort()) {
    const raw = preprocessRaw(Papa.default.parse(readFileSync(join(FIX, file), 'utf-8'), { skipEmptyLines: true }).data).rows;
    const hr = detectHeaderRows(raw);
    const cpc = hr >= 2 ? forwardFill(raw[0]) : null;
    const data = raw.slice(hr);
    const roles = inferRoles(data, raw[hr - 1], cpc);
    const base = extractAnalysisInputs({ data, roles, condPerCol: cpc, zeroAsMissing: false });
    const assay = EXPECTED[file].assay;
    const res = await runFullAnalysis(base.matrix, base.rawMatrix, base.condCtx, assay, null,
      detectVST(base.matrix, assay), { isPivoted: false }, ASSAY_DATATYPE_MAP[assay] || 'continuous', 'ordered');
    for (const r of res) {
      if (!r.flag || r.flag === 'N/A') continue;
      const p = num(r.primaryP);
      if (!Number.isFinite(p)) continue;
      const cur = best.get(r.name);
      if (!cur || p < cur.p) best.set(r.name, { p, file, flag: r.flag });
    }
  }
  const arith = new Map(CENSUS.map(c => [c.name, c.floor(c.counts[0])]));
  for (const c of NOT_A_COUNT) arith.set(c.name, c.floor);
  console.log('  ' + 'test'.padEnd(31) + 'min primaryP'.padEnd(15) + 'on'.padEnd(38) +
              'flag'.padEnd(10) + 'arith floor'.padEnd(13) + 'BH multiplier');
  console.log('  ' + '-'.repeat(126));
  for (const [name, b] of [...best].sort()) {
    const a = arith.get(name);
    console.log('  ' + name.padEnd(31) + b.p.toPrecision(3).padEnd(15) + b.file.padEnd(38) +
      b.flag.padEnd(10) + (a != null ? a.toPrecision(3) : 'analytical').padEnd(13) +
      (a > 0 && b.p > 0 ? `${(b.p / a).toFixed(2)}x` : '-'));
  }
}
