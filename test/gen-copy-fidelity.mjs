// gen-copy-fidelity.mjs — the copy-fidelity effect-size instrument (S350 Part 10).
//
// Generates paired two-condition datasets in which condition B is a COPY of
// condition A degraded by a controlled amount of noise, then given a fake
// condition effect. Sweeping the copy noise gives an effect-size axis with
// units: the false-positive rate lives at one end and the perfect copy at the
// other, and any detector can be run along it.
//
// Deliberately NOT part of generate-test-datasets.py. That file writes the
// fixed 27-fixture corpus and carries a duplicate-definition defect (P85, now
// covering DS16 and DS17). Sweep data is ephemeral and regenerated from a seed;
// corpus fixtures are committed artefacts. Keeping them apart means a change
// here can never move a fixture.
//
// ── THE MODEL ──────────────────────────────────────────────────────────
//
// Everything is built on the log scale and exponentiated at the end, which is
// how the corpus generators model assay data and how the pipeline's own VST
// expects it.
//
//   subject level      L_s   ~ Normal(log(baseMedian), tau^2)
//   replicate noise    e_sr  ~ Normal(0, sigma^2)
//   condition A        log A_sr = L_s + e_sr
//
// Condition B is a variance-preserving interpolation between a perfect copy of
// A and a fresh, honest, independent replicate of the same design:
//
//   log B_sr = mu + rho*(L_s - mu) + sqrt(1-rho^2)*(L'_s - mu)      subject part
//                 + rho*e_sr       + sqrt(1-rho^2)*f_sr             residual part
//                 + log(effect_s)
//
// where L' and f are fresh independent draws from the same laws. Two properties
// make this the right shape for an effect-size axis, and both are checked at
// generation time rather than asserted:
//
//   1. The marginal law of log B equals that of log A for EVERY rho, so moving
//      along the axis does not smuggle in a spread difference that a
//      distribution-shape test would read as signal.
//   2. rho is exactly the matched-cell correlation between A and B. rho = 1 is
//      a perfect copy; rho = 0 is an independent honest condition.
//
// ── THE AXIS ───────────────────────────────────────────────────────────
//
// The swept parameter is k, the copy noise expressed as a multiple of the
// file's own within-condition replicate noise:
//
//   copy noise added to each residual = sqrt(1-rho^2) * sigma  =  k * sigma
//   so  k = sqrt(1-rho^2)  and  rho = sqrt(1-k^2),  k in [0, 1].
//
//   k = 0    perfect copy, no noise added
//   k = 1    the copy noise equals the replicate noise, rho = 0, and B is an
//            exact independent honest condition. This end is the clean case and
//            it is where the false-positive rate comes from.
//
// The same k also scales the subject-level perturbation, to sqrt(1-rho^2)*tau.
// One parameter degrades both levels together, because a fabricator jittering a
// copied dataset perturbs both and because degrading only one leaves whichever
// test reads the other with a flat curve.
//
// ── THE FAKE CONDITION EFFECT ──────────────────────────────────────────
//
// A copy with no effect added is not a plausible attack: a fabricator wants a
// difference to report. So a fraction of subjects get a multiplicative fold
// change in condition B only. Defaults: 20% of subjects at 1.5x.
//
// ── ASSUMPTIONS, STATED BECAUSE THEY ARE PART OF THE DELIVERABLE ───────
//
// A generator that inherits the tool's own assumptions flatters the tool for
// exactly the reason the fixed corpus does. These are the ones this file makes.
// They are defaults, all overridable, and the reader is meant to disagree with
// them rather than take them on trust.
//
//   Distributional family   log-normal. Subject levels and replicate noise are
//                           both normal on the log scale. Real assay data is
//                           heavier-tailed than this; every test in the battery
//                           that keys on distribution shape will find this data
//                           tidier than reality.
//   Noise model             multiplicative, homoscedastic on the log scale. The
//                           mean-variance slope is therefore 2 on the raw scale
//                           by construction and identical in both conditions,
//                           which is exactly what Stage 3 P9 tests for. P9 has
//                           no signal to find here either way.
//   Independence            replicate noise is independent across replicates
//                           and subjects. No batch structure, no plate effects,
//                           no drift, no serial correlation down the rows. Any
//                           test keying on row order sees nothing here.
//   Effect size             a fixed 1.5x fold change on a fixed 20% of
//                           subjects, applied to condition B only, identical
//                           across replicates. Real effects vary in size across
//                           subjects; this one does not.
//   Heterogeneity           subject levels span about two orders of magnitude
//                           (tau = 1.15 in natural log). The ratio of subject
//                           heterogeneity to replicate noise is 4.6, which is
//                           what makes a copy hard to degrade: adding noise the
//                           size of the assay's own repeatability moves rho
//                           only from 1.000 to 0.995.
//   Replicates              6 per subject per condition, equal for every
//                           subject. No missing values, no ragged rows.
//   Subjects                120, matched, present exactly once in each
//                           condition. No unpaired subjects, no dropouts.
//   Conditions              exactly 2. The max-over-pairs structure that gives
//                           Residual Spike Correlation its power at three
//                           conditions is therefore absent by construction.
//   Rounding                two decimals, as the corpus fixtures use.
//
// ── LAYOUTS ────────────────────────────────────────────────────────────
//
// Each dataset is emitted in both layouts, because the two branches differ in
// how pairing is reachable inside a test:
//
//   column-grouped   two-row header, one column block per condition, so matrix
//                    row r is subject r in both conditions and the pairing is
//                    structural. Cell [0][0] carries a label because
//                    preprocessRaw drops header rows with fewer than three
//                    non-empty cells, and a two-condition span row has only two.
//   row-grouped      SubjectID + Condition + replicate columns, subjects
//                    interleaved A then B, so each condition slice lists
//                    subjects in the same order. The pairing key is the
//                    SubjectID label column, which no test currently receives.
//
// ── USAGE ──────────────────────────────────────────────────────────────
//
//   import { generate, KLADDER, DEFAULTS } from './gen-copy-fidelity.mjs';
//   const d = generate({ k: 0.3, seed: 7 });
//   d.columnGroupedCsv   // string
//   d.rowGroupedCsv      // string
//   d.diagnostics        // measured rho, measured replicate noise, etc.
//
// As a script, writes a full sweep to a directory:
//   node test/gen-copy-fidelity.mjs --out /tmp/copyfid --reps 3
//
// Not named *.test.* or *.spec.*, so `vitest run` does not collect it.

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export const DEFAULTS = {
  nSubjects: 120,
  nReps: 6,
  baseMedian: 200,     // median subject level on the raw scale
  tau: 1.15,           // sd of the subject level, natural log
  sigma: 0.25,         // sd of the replicate noise, natural log (CV about 25%)
  effectFrac: 0.20,    // fraction of subjects given a fake condition effect
  effectFold: 1.5,     // the fold change those subjects get in condition B
  decimals: 2,
  condNames: ['CondA', 'CondB'],
  sharedSubjects: false, // see MODES below
};

// ── MODES, and why there are two ────────────────────────────────────────
//
// The default mode degrades BOTH the subject level and the residual with the
// same k, so at k = 1 condition B is an independent honest condition with
// independent subjects. That end is "two unrelated experiments".
//
// It is NOT an honest PAIRED experiment. In a real paired design the same
// subject appears in both conditions, so the subject level is shared and only
// the measurement noise is independent. That distinction is the whole of P82:
// the free permutation null is mis-specified precisely because it scatters
// subjects that are in fact matched. A clean case with independent subject
// levels cannot exhibit that defect, so a false-positive rate measured there
// answers a different question.
//
//   sharedSubjects: false  (default)  subject level interpolates with k too.
//                                     k = 1 is two unrelated experiments.
//   sharedSubjects: true              subject level is IDENTICAL in both
//                                     conditions at every k; only the residual
//                                     interpolates. k = 1 is an honest paired
//                                     experiment with a real condition effect,
//                                     and k = 0 is the residual-copy attack.
//
// The fresh subject draw is taken in both modes so the random stream stays
// aligned: condition A is byte-identical between the two modes at the same
// (k, seed), which makes them directly comparable.

// Ten points, denser where a copy is still good, ending at exact independence.
export const KLADDER = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.65, 0.8, 0.9, 1.0];

/** Mulberry32 — the same generator family the engine uses, seeded here. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Box-Muller, one value per call. */
function makeNormal(rand) {
  return function () {
    let u = 0; while (u === 0) u = rand();
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
function sd(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}
function pearson(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return NaN;
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  const d = Math.sqrt(sxx * syy);
  return d > 1e-20 ? sxy / d : NaN;
}

/**
 * One swept dataset.
 * @param {{k:number, seed:number}} opts plus any DEFAULTS override.
 * @returns {{ k, rho, params, A, B, columnGroupedCsv, rowGroupedCsv, diagnostics }}
 *   A and B are nSubjects x nReps arrays of raw (exponentiated, rounded) values.
 */
export function generate(opts = {}) {
  const p = { ...DEFAULTS, ...opts };
  const k = opts.k ?? 0;
  if (!(k >= 0 && k <= 1)) throw new Error(`gen-copy-fidelity: k must be in [0, 1], got ${k}`);
  const rho = Math.sqrt(Math.max(0, 1 - k * k));
  const rand = mulberry32((opts.seed ?? 0) * 2654435761 + 12345);
  const randn = makeNormal(rand);

  const mu = Math.log(p.baseMedian);
  const S = p.nSubjects, R = p.nReps;

  // Which subjects carry the fake condition effect. Drawn from the same stream
  // so the whole dataset is a function of (k, seed) alone.
  const nEffect = Math.round(S * p.effectFrac);
  const order = Array.from({ length: S }, (_, i) => i);
  for (let i = S - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = order[i]; order[i] = order[j]; order[j] = t;
  }
  const effectSet = new Set(order.slice(0, nEffect));

  const logA = [], logB = [];
  for (let s = 0; s < S; s++) {
    const L = mu + p.tau * randn();          // subject level, condition A
    const Lp = mu + p.tau * randn();         // fresh independent subject level
    const rowA = [], rowB = [];
    const logEffect = effectSet.has(s) ? Math.log(p.effectFold) : 0;
    // In shared-subjects mode the subject level is carried over untouched; the
    // fresh draw Lp is still taken so the stream stays aligned between modes.
    const rhoS = p.sharedSubjects ? 1 : rho;
    const subjB = mu + rhoS * (L - mu) + Math.sqrt(1 - rhoS * rhoS) * (Lp - mu) + logEffect;
    for (let r = 0; r < R; r++) {
      const e = p.sigma * randn();           // replicate noise, condition A
      const f = p.sigma * randn();           // fresh independent replicate noise
      rowA.push(L + e);
      rowB.push(subjB + rho * e + Math.sqrt(1 - rho * rho) * f);
    }
    logA.push(rowA); logB.push(rowB);
  }

  const round = (v) => Number(Math.exp(v).toFixed(p.decimals));
  const A = logA.map(r => r.map(round));
  const B = logB.map(r => r.map(round));

  // ── diagnostics, measured from the emitted values, not from the model ──
  const flatA = [], flatB = [];
  for (let s = 0; s < S; s++) for (let r = 0; r < R; r++) { flatA.push(Math.log(A[s][r])); flatB.push(Math.log(B[s][r])); }
  const meanA = A.map(r => mean(r.map(Math.log)));
  const meanB = B.map(r => mean(r.map(Math.log)));
  // Within-condition replicate noise, pooled: sd of row-centred residuals.
  const residSd = (M) => {
    const res = [];
    for (const row of M) { const m = mean(row.map(Math.log)); for (const v of row) res.push(Math.log(v) - m); }
    // n-1 per row summed: R-1 df per row
    const ss = res.reduce((s, v) => s + v * v, 0);
    return Math.sqrt(ss / (M.length * (M[0].length - 1)));
  };
  const diagnostics = {
    cellCorr: pearson(flatA, flatB),          // matched-cell correlation, should track rho
    subjectCorr: pearson(meanA, meanB),       // subject-wise correlation, the independence check
    replicateNoiseA: residSd(A),              // the file's own within-condition noise
    replicateNoiseB: residSd(B),
    spreadA: sd(flatA), spreadB: sd(flatB),   // marginal spread, should match at every k
    nEffectSubjects: nEffect,
  };

  // ── layouts ───────────────────────────────────────────────────────────
  const [cA, cB] = p.condNames;
  const repHdr = Array.from({ length: R }, (_, i) => `Rep${i + 1}`);

  // Column-grouped. Cell [0][0] carries a label: preprocessRaw drops a header
  // row with fewer than three non-empty cells, and a two-condition span row has
  // only two. Same reason the corpus's own three-condition fixtures get away
  // without one.
  const cg = [];
  cg.push(['Condition', cA, ...Array(R - 1).fill(''), cB, ...Array(R - 1).fill('')].join(','));
  cg.push(['Feature', ...repHdr, ...repHdr].join(','));
  for (let s = 0; s < S; s++) cg.push([`F${s + 1}`, ...A[s], ...B[s]].join(','));

  // Row-grouped. Subjects interleaved so each condition slice lists them in the
  // same order, which is what an in-place within-subject relabel needs.
  const rg = [];
  rg.push(['SubjectID', 'Condition', ...repHdr].join(','));
  for (let s = 0; s < S; s++) {
    rg.push([`S${String(s + 1).padStart(4, '0')}`, cA, ...A[s]].join(','));
    rg.push([`S${String(s + 1).padStart(4, '0')}`, cB, ...B[s]].join(','));
  }

  return {
    k, rho, params: p, A, B,
    columnGroupedCsv: cg.join('\n') + '\n',
    rowGroupedCsv: rg.join('\n') + '\n',
    diagnostics,
  };
}

// ── script mode ─────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, dflt) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
  };
  const out = arg('out', '/tmp/copy-fidelity');
  const reps = Number(arg('reps', 3));
  mkdirSync(out, { recursive: true });
  console.log(`copy-fidelity sweep -> ${out}   ${KLADDER.length} k values x ${reps} seed(s) x 2 layouts\n`);
  console.log('    k     rho    cell corr   subj corr   repl noise A/B   spread A/B');
  for (const k of KLADDER) {
    const rows = [];
    for (let seed = 0; seed < reps; seed++) {
      const d = generate({ k, seed });
      rows.push(d.diagnostics);
      const tag = `k${String(k).replace('.', 'p')}_s${seed}`;
      writeFileSync(join(out, `cg_${tag}.csv`), d.columnGroupedCsv);
      writeFileSync(join(out, `rg_${tag}.csv`), d.rowGroupedCsv);
    }
    const avg = (f) => mean(rows.map(f));
    console.log(`  ${String(k).padStart(4)}  ${Math.sqrt(1 - k * k).toFixed(4)}   ` +
      `${avg(d => d.cellCorr).toFixed(4)}      ${avg(d => d.subjectCorr).toFixed(4)}     ` +
      `${avg(d => d.replicateNoiseA).toFixed(4)}/${avg(d => d.replicateNoiseB).toFixed(4)}    ` +
      `${avg(d => d.spreadA).toFixed(4)}/${avg(d => d.spreadB).toFixed(4)}`);
  }
  console.log(`\nWritten. Datasets are ephemeral — regenerate from (k, seed), do not commit them.`);
}
