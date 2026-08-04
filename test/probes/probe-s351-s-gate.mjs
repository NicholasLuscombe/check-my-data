/* S351 Part 4 — does copy fidelity inflate the per-subject noise-scale estimate?

   Part 3 measured DS02 at s = 0.319 with its rescaled copy and 0.173 without.
   A copy makes two conditions share one noise realisation, so a subject carries
   fewer independent degrees of freedom than the bias correction assumes, and the
   estimator reads the shortfall as dispersion.

   If that generalises, the s-gate is dead as specified. The gate is the
   disposition's reinstatement route for Residual Spike Correlation — run below
   about 0.25, skip above. A copy that inflates measured s pushes a fabricated
   file above the threshold, so the gate would skip the test on exactly the files
   where the test works.

   This measures whether it is a curve. It decides nothing about P86.

   The estimator is imported, not re-derived. It is the same function that
   produced 0.041, 0.055, 0.162 and 0.199 on the clean paired fixtures and 0.319
   on DS02; a re-derivation would make every number here incomparable.

   Usage:
     node test/probes/probe-s351-s-gate.mjs
     SEEDS=20 node test/probes/probe-s351-s-gate.mjs
     DS11DIR=<dir> node test/probes/probe-s351-s-gate.mjs
       (<dir> from: python3 test/probes/gen-s351-ds11-ablation.py <dir>)
*/
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, validateMatrix } = await import('../../src/analysis/engine.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { testResidualSpikeCorrelation } = await import('../../src/tests/residualSpikeCorrelation.js');
const { ALPHA } = await import('../../src/constants/thresholds.js');
const { generate, residualScaleDispersion, DEFAULTS, KLADDER, SLADDER } =
  await import('../gen-copy-fidelity.mjs');

const RSC = 'Residual Spike Correlation';
const ASSAY = 'general';
const SEEDS = Math.max(1, Number(process.env.SEEDS) || 20);
const DS11DIR = process.env.DS11DIR || null;

// ── Engine-equivalent RSC call ─────────────────────────────────────────────
// Mirrors engine.js: validate, build the factory on the sanitised matrix, then
// dispatch on the VST matrix and context when a transform is active. Same shape
// the S350 copy-fidelity sweep used, so the two sets of numbers are comparable.
function prepFromCsv(csv) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  return { matrix, condCtx, vst: detectVST(matrix, ASSAY) };
}

function enginePair(prep) {
  const m0 = validateMatrix(prep.matrix).matrix;
  const rngFor = createPRNGFactory(m0);
  const t = prep.vst?.transform || 'raw';
  let vm = null;
  if (t === 'log') vm = m0.map(r => r.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (t === 'anscombe') vm = m0.map(r => r.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const hasVST = vm !== null;
  return { rngFor, m: hasVST ? vm : m0, ctx: hasVST ? prep.condCtx.withMatrix(vm) : prep.condCtx };
}

function runRsc(csv) {
  const ep = enginePair(prepFromCsv(csv));
  return testResidualSpikeCorrelation(ep.m, ep.ctx, ep.rngFor(RSC));
}

const q = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return NaN;
  const i = p * (s.length - 1), lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const f3 = x => (x == null || !isFinite(x)) ? '  —  ' : x.toFixed(3);

console.log('S351 Part 4 — copy fidelity against planted noise-scale dispersion\n');

// ══ Part 1 — what the instrument can vary ══════════════════════════════════
console.log('== Part 1 — the generator ==\n');
console.log(`  copy fidelity   k in [0,1], units = copy noise as a multiple of the file's own`);
console.log(`                  replicate noise. k=0 perfect copy, k=1 exact independence,`);
console.log(`                  rho = sqrt(1-k^2). Ladder: [${KLADDER.join(', ')}]`);
console.log(`  planted s       sigmaS, default ${DEFAULTS.sigmaS}. Ladder: [${SLADDER.join(', ')}]`);
console.log(`  defaults        subjects ${DEFAULTS.nSubjects}, reps ${DEFAULTS.nReps}, conditions ${DEFAULTS.condNames.length},`);
console.log(`                  tau ${DEFAULTS.tau}, sigma ${DEFAULTS.sigma}, effect ${DEFAULTS.effectFold}x on ${DEFAULTS.effectFrac * 100}% of subjects,`);
console.log(`                  ${DEFAULTS.decimals} decimals, sharedSubjects ${DEFAULTS.sharedSubjects}`);
console.log(`  planted s = 0 is settable and is the default — the control the sweep rests on.\n`);

// Consistency: the estimator fed the generator's own arrays must agree with the
// estimator fed the matrix the pipeline parses out of the CSV. DS02 was measured
// the second way; the sweep uses the first.
{
  const d = generate({ k: 0.3, seed: 1, sigmaS: 0.3 });
  const direct = residualScaleDispersion([d.A, d.B]).corrected;
  const prep = prepFromCsv(d.columnGroupedCsv);
  const nR = DEFAULTS.nReps;
  const viaCsv = residualScaleDispersion([
    prep.matrix.map(r => r.slice(0, nR)),
    prep.matrix.map(r => r.slice(nR, 2 * nR)),
  ]).corrected;
  console.log(`  cross-check: estimator on the generator's arrays ${direct.toFixed(4)} vs on the parsed CSV ${viaCsv.toFixed(4)}`);
  console.log(`  ${Math.abs(direct - viaCsv) < 1e-9 ? 'identical — the sweep may use either path' : 'DIFFER — investigate before reading anything below'}\n`);
}

// Modes: sharedSubjects pins the subject LEVEL. The estimator centres within
// condition, so level should be invisible to it. Verified rather than assumed.
{
  const a = residualScaleDispersion(((d) => [d.A, d.B])(generate({ k: 0, seed: 3, sigmaS: 0 }))).corrected;
  const b = residualScaleDispersion(((d) => [d.A, d.B])(generate({ k: 0, seed: 3, sigmaS: 0, sharedSubjects: true }))).corrected;
  console.log(`  sharedSubjects check at k=0: default ${a.toFixed(4)}, shared ${b.toFixed(4)} — ${Math.abs(a - b) < 1e-9 ? 'identical, level is invisible to the estimator' : 'DIFFER'}\n`);
}

// ══ Part 2 — the sweep ═════════════════════════════════════════════════════
console.log(`== Part 2 — measured s across copy fidelity x planted s, ${SEEDS} datasets per cell ==\n`);
const S_GRID = [0, 0.15, 0.3, 0.5];
const cells = new Map();

for (const sig of S_GRID) {
  for (const k of KLADDER) {
    const sVals = [], flags = [], ps = [];
    for (let seed = 0; seed < SEEDS; seed++) {
      const d = generate({ k, seed: seed + 1, sigmaS: sig });
      sVals.push(residualScaleDispersion([d.A, d.B]).corrected);
      const r = runRsc(d.columnGroupedCsv);
      flags.push(r.flag);
      ps.push(r.primaryP);
    }
    const fired = flags.filter(f => f === 'HIGH' || f === 'MODERATE').length;
    cells.set(`${sig}|${k}`, {
      sig, k, sVals,
      med: q(sVals, 0.5), lo: Math.min(...sVals), hi: Math.max(...sVals),
      fired, pMed: q(ps, 0.5),
    });
  }
}

for (const sig of S_GRID) {
  console.log(`  planted s = ${sig}`);
  console.log(`    k      measured s: median [min..max]        RSC fires   median p`);
  for (const k of KLADDER) {
    const c = cells.get(`${sig}|${k}`);
    console.log(`    ${String(k).padEnd(5)}  ${f3(c.med)}  [${f3(c.lo)}..${f3(c.hi)}]${' '.repeat(10)}${String(c.fired).padStart(3)}/${SEEDS}      ${c.pMed.toFixed(4)}`);
  }
  console.log('');
}

// Question 1 — does measured s rise with copy fidelity on honest-variance data?
{
  const row = KLADDER.map(k => cells.get(`0|${k}`));
  const atCopy = row[0], atIndep = row[row.length - 1];
  console.log('  Q1 — on data planted at s = 0, measured s across the fidelity axis:');
  console.log(`       perfect copy (k=0) median ${f3(atCopy.med)}   independence (k=1) median ${f3(atIndep.med)}`);
  let mono = true;
  for (let i = 1; i < row.length; i++) if (row[i].med > row[i - 1].med + 1e-9) mono = false;
  console.log(`       monotone decreasing as the copy degrades: ${mono ? 'yes' : 'no'}`);
  console.log('  Q2 — does a perfect copy on s = 0 data cross the 0.2-0.3 knee?');
  const over = atCopy.sVals.filter(v => v >= 0.25).length;
  console.log(`       ${over}/${SEEDS} datasets at or above 0.25; median ${f3(atCopy.med)}`);
}

// Question 3 — can one threshold separate the two populations?
// Population H: honest data the test false-positives on — high planted s, no copy.
// Population F: copy-fabricated data the test works on — good copy, no planted s.
{
  console.log('\n  Q3 — two populations, measured s:');
  const H = [], F = [];
  for (const sig of [0.3, 0.5]) H.push(...cells.get(`${sig}|1`).sVals);
  for (const k of [0, 0.1, 0.2, 0.3, 0.4]) F.push(...cells.get(`0|${k}`).sVals);
  const desc = (a, n) => `${n}: n=${a.length}  median ${f3(q(a, 0.5))}  range [${f3(Math.min(...a))}..${f3(Math.max(...a))}]`;
  console.log(`       ${desc(H, 'honest-heteroscedastic, k=1, planted s in {0.3,0.5}')}`);
  console.log(`       ${desc(F, 'copy-fabricated, planted s=0, k in {0..0.4}   ')}`);
  const hLo = Math.min(...H), fHi = Math.max(...F);
  const overlapLo = Math.max(Math.min(...H), Math.min(...F));
  const overlapHi = Math.min(Math.max(...H), Math.max(...F));
  if (overlapHi >= overlapLo) {
    const hIn = H.filter(v => v >= overlapLo && v <= overlapHi).length;
    const fIn = F.filter(v => v >= overlapLo && v <= overlapHi).length;
    console.log(`       ranges OVERLAP on [${f3(overlapLo)}..${f3(overlapHi)}] — ${hIn}/${H.length} honest and ${fIn}/${F.length} fabricated fall inside it`);
    console.log(`       no single threshold separates them`);
  } else {
    console.log(`       ranges are DISJOINT: honest from ${f3(hLo)}, fabricated to ${f3(fHi)} — a threshold exists`);
  }
}

// ══ Part 3 — resolution: subject count or estimator? ═══════════════════════
console.log('\n== Part 3 — estimator spread at 120 subjects and at 35, identical planted s ==\n');
console.log('  Measured at k=1 (independence) so no copy contamination enters. Replicates');
console.log('  held at 6 and conditions at 2, so df per subject is 10 in both arms and the');
console.log('  only thing that moves is how many subjects the spread is taken over.\n');
console.log('    subjects  planted s   measured s: median [min..max]   spread');
for (const nSubjects of [120, 35]) {
  for (const sig of [0, 0.3]) {
    const vals = [];
    for (let seed = 0; seed < 24; seed++) {
      const d = generate({ k: 1, seed: 500 + seed, sigmaS: sig, nSubjects });
      vals.push(residualScaleDispersion([d.A, d.B]).corrected);
    }
    const lo = Math.min(...vals), hi = Math.max(...vals);
    console.log(`    ${String(nSubjects).padStart(8)}  ${String(sig).padEnd(9)}   ${f3(q(vals, 0.5))}  [${f3(lo)}..${f3(hi)}]           ${f3(hi - lo)}`);
  }
}
console.log('\n  DS02 sits at 35 subjects with 3 conditions x 4 reps, so df 9 rather than 10.');

// If subject count barely moves the spread, the binding constraint is the df
// each subject contributes. Replicates are the only other way to raise it.
console.log('\n  Same question against replicates per subject, 120 subjects held fixed:\n');
console.log('    reps  df/subj  planted s   measured s: median [min..max]   spread');
for (const nReps of [6, 12, 24]) {
  for (const sig of [0, 0.3]) {
    const vals = [];
    for (let seed = 0; seed < 24; seed++) {
      const d = generate({ k: 1, seed: 700 + seed, sigmaS: sig, nReps });
      vals.push(residualScaleDispersion([d.A, d.B]).corrected);
    }
    const lo = Math.min(...vals), hi = Math.max(...vals);
    console.log(`    ${String(nReps).padStart(4)}  ${String(2 * (nReps - 1)).padStart(7)}  ${String(sig).padEnd(9)}   ${f3(q(vals, 0.5))}  [${f3(lo)}..${f3(hi)}]           ${f3(hi - lo)}`);
  }
}

// The obvious remedy: estimate the scale from ONE condition, so a copy cannot
// contaminate it. That halves the df each subject contributes, so it trades
// contamination for resolution. Measured rather than assumed.
console.log('\n  Single-condition estimator — immune to a copy by construction, 120 subjects:\n');
console.log('    reps  df/subj  planted s   measured s: median [min..max]   spread');
for (const nReps of [6, 12]) {
  for (const sig of [0, 0.3]) {
    const vals = [];
    for (let seed = 0; seed < 24; seed++) {
      const d = generate({ k: 0, seed: 900 + seed, sigmaS: sig, nReps });   // perfect copy
      vals.push(residualScaleDispersion([d.A]).corrected);                  // condition A only
    }
    const lo = Math.min(...vals), hi = Math.max(...vals);
    console.log(`    ${String(nReps).padStart(4)}  ${String(nReps - 1).padStart(7)}  ${String(sig).padEnd(9)}   ${f3(q(vals, 0.5))}  [${f3(lo)}..${f3(hi)}]           ${f3(hi - lo)}`);
  }
}
console.log('    (run at k=0, a perfect copy — a two-condition estimator is maximally');
console.log('     contaminated there, so any value above 0 here is resolution, not the copy.)');

// ══ Part 4 — DS11 ══════════════════════════════════════════════════════════
if (DS11DIR && existsSync(DS11DIR)) {
  console.log('\n== Part 4 — DS11, shipped against spikes-ablated ==\n');
  // Row-grouped: GeneID, Condition, Rep1-4. Rebuild per-condition gene x rep
  // arrays keyed on GeneID so the estimator sees matched subjects.
  function condArraysDS11(path) {
    const rows = Papa.default.parse(readFileSync(path, 'utf-8'), { skipEmptyLines: true }).data;
    const head = rows[0];
    const iG = head.indexOf('GeneID'), iC = head.indexOf('Condition');
    const repCols = head.map((h, i) => /^Rep/.test(h) ? i : -1).filter(i => i >= 0);
    const byCond = new Map();
    for (const r of rows.slice(1)) {
      if (!byCond.has(r[iC])) byCond.set(r[iC], new Map());
      byCond.get(r[iC]).set(r[iG], repCols.map(i => Number(r[i])));
    }
    const conds = [...byCond.keys()];
    const genes = [...byCond.get(conds[0]).keys()];
    return { conds, genes, arrays: conds.map(c => genes.map(g => byCond.get(c).get(g))) };
  }
  for (const [label, sub] of [['shipped', 'shipped'], ['spikes ablated', 'ablated']]) {
    const p = join(DS11DIR, sub, '11-rnaseq-multicondition.csv');
    if (!existsSync(p)) { console.log(`  ${p} missing`); continue; }
    const { conds, genes, arrays } = condArraysDS11(p);
    const d = residualScaleDispersion(arrays);
    const r = runRsc(readFileSync(p, 'utf-8'));
    console.log(`  ${label.padEnd(16)} s = ${d.corrected.toFixed(4)}  (raw ${d.raw.toFixed(4)}, df ${d.df.toFixed(1)}, ${genes.length} genes, ${conds.length} conditions)`);
    console.log(`  ${' '.repeat(16)} RSC ${r.flag}  p = ${r.primaryP}  overlap ${r.nOverlap}  K ${r.topK}  best pair ${r.bestPair}`);
  }
  console.log(`\n  (RSC here runs on the file as loaded, without the row-semantics gate the`);
  console.log(`   engine applies to DS11 — the comparison is shipped against ablated, both same path.)`);
}

console.log(`\nALPHA.FLAG = ${ALPHA.FLAG}, ALPHA.NOTE = ${ALPHA.NOTE}`);
