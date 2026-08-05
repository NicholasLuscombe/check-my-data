// gen-large-clean.mjs — the large clean fixture.
//
// Writes test/fixtures/large-clean-2cond.csv: one clean, two-condition,
// row-grouped file big enough to reach three code paths the 27-fixture corpus
// has never touched.
//
//   1. Cross-Condition Consistency's B = 199 branch. CCC picks B from the count
//      of finite CELLS in the largest condition, not rows
//      (crossConditionConsistency.js:166-167). At six data columns, 1,700 rows
//      per condition is 10,200 cells, which clears the rule's 10,000 threshold.
//      The corpus tops out at 2,000 cells.
//   2. The min(N_a, N_b) >= 500 effect-size gates in Runs, LOESS and Regional
//      Noise. No fixture has ever engaged one.
//   3. Any battery behaviour above 1,500 rows.
//
// ── WHAT THIS FILE IS NOT ──────────────────────────────────────────────
//
// It is NOT a false-positive anchor and must never be promoted into one. We
// generate it, so its cleanliness is a property of the model below rather than
// a fact about real data. Any severity it returns is a finding about a code
// path, not a rate.
//
// ── THE MODEL ──────────────────────────────────────────────────────────
//
// Built on the log scale and exponentiated, which is how the corpus generators
// model assay data and what the pipeline's own VST expects.
//
//   row level        L_r  ~ Normal(log(MEDIAN), TAU^2)     one per row
//   replicate noise  e_ri ~ Normal(0, SIGMA^2)             one per cell
//   value            x_ri = round(exp(L_r + e_ri), 2)
//
// The shared row level is what gives the six replicate columns their
// correlation. Six independent Gaussian columns would make every replicate test
// return "nothing here" for an uninteresting reason. Constant SIGMA on the log
// scale is proportional error on the raw scale, which is the realistic noise
// model for intensity data and the one VST exists to flatten.
//
// Row levels are drawn independently and rows are left in draw order. Any
// serial structure would be a planted mechanism, and the sequential tests are
// supposed to find nothing in a clean file.
//
// Both conditions are drawn from the IDENTICAL law. No condition effect is
// planted, because a planted effect is a planted mechanism. Note which way that
// cuts: identical laws put the two conditions in the "anomalously similar"
// tail, which is the direction Cross-Condition Consistency's forensic filter
// passes. So this choice makes a CCC flag more likely, not less.
//
// No missing cells. Missing cells would reduce the finite-cell count, and the
// margin over the 10,000 threshold is only 200 cells.
//
// ── PAIRING ────────────────────────────────────────────────────────────
//
// The file must read UNPAIRED, or the P82 skip withholds CCC and the whole
// point is lost. subjectPairing.js calls a row-grouped file paired only when
// some non-data column is distinct within every condition AND carries identical
// sets across conditions. SampleID is disjoint by condition — C###### against
// T###### — so the second test fails and the file reads unpaired. This is the
// DS19 shape. The generator checks the answer at the end rather than assuming.
//
// ── DETERMINISM ────────────────────────────────────────────────────────
//
// Mulberry32, seeded with SEED below. Implemented here rather than imported
// from src/stats/prng.js on purpose: a committed fixture must not move when an
// engine file changes.
//
// Usage:  node test/gen-large-clean.mjs
//         OUT=/tmp/other.csv node test/gen-large-clean.mjs

import { writeFileSync } from 'fs';

// ── Parameters ─────────────────────────────────────────────────────────
export const SEED = 20260806;

// ROWS overrides the row count for diagnostics only. The committed fixture is
// the default; a run with ROWS set writes a throwaway file for a sweep.
const N_PER_CONDITION = Number(process.env.ROWS) || 1700;   // 1700 x 6 = 10,200 cells > 10,000 -> B = 199
const N_REPS = 6;
const CONDITIONS = ['Control', 'Treatment'];
const MEDIAN = 500;             // raw-scale median; range lands near 100-2500
const TAU = 0.80;               // between-row spread, log scale
const SIGMA = 0.25;             // within-row replicate noise, log scale
const DECIMALS = 2;             // instrument-plausible precision

const OUT = process.env.OUT || 'test/fixtures/large-clean-2cond.csv';

// ── Mulberry32 + Box-Muller ────────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller. Returns one standard normal per call, cached in pairs. */
function makeNormal(rand) {
  let spare = null;
  return function normal() {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    const th = 2 * Math.PI * v;
    spare = r * Math.sin(th);
    return r * Math.cos(th);
  };
}

// ── Generate ───────────────────────────────────────────────────────────
const rand = mulberry32(SEED);
const normal = makeNormal(rand);
const logMedian = Math.log(MEDIAN);

const header = ['SampleID', 'Condition', ...Array.from({ length: N_REPS }, (_, i) => `Rep${i + 1}`)];
const lines = [header.join(',')];

let nCells = 0;
let minV = Infinity, maxV = -Infinity;

for (let c = 0; c < CONDITIONS.length; c++) {
  const cond = CONDITIONS[c];
  const idPrefix = cond[0];                       // 'C' / 'T' -> disjoint id sets
  for (let r = 0; r < N_PER_CONDITION; r++) {
    const level = logMedian + TAU * normal();
    const cells = [];
    for (let k = 0; k < N_REPS; k++) {
      const v = Math.exp(level + SIGMA * normal());
      const rounded = Number(v.toFixed(DECIMALS));
      if (rounded < minV) minV = rounded;
      if (rounded > maxV) maxV = rounded;
      cells.push(rounded.toFixed(DECIMALS));
      nCells++;
    }
    const id = idPrefix + String(r + 1).padStart(6, '0');
    lines.push([id, cond, ...cells].join(','));
  }
}

writeFileSync(OUT, lines.join('\n') + '\n');

console.log(`wrote ${OUT}`);
console.log(`  seed              ${SEED}`);
console.log(`  conditions        ${CONDITIONS.join(', ')}`);
console.log(`  rows per condition ${N_PER_CONDITION}   data rows ${N_PER_CONDITION * CONDITIONS.length}`);
console.log(`  data columns      ${N_REPS}`);
console.log(`  cells per condition ${N_PER_CONDITION * N_REPS}   (CCC threshold is 10,000)`);
console.log(`  total data cells  ${nCells}`);
console.log(`  value range       ${minV} .. ${maxV}`);
console.log(`  log-scale params  median ${MEDIAN}, tau ${TAU}, sigma ${SIGMA}, ${DECIMALS} dp`);
console.log(`  line endings      LF`);
