// probe-s348-seed-sensitivity.mjs — S348.
//
// P69 measured a neighbour rate: change one of 09-proteomics-clean's 2,400 cells
// by one unit in its last decimal place and 6 of 60 such files come back "Minor
// anomalies detected". The data change is far too small to move any statistic,
// so the suspect is the seed — hashMatrix64 reads the parsed numeric matrix, so
// a one-unit nudge reseeds every test's stream.
//
// This probe separates the two by filling in the 2x2 square. Baseline is clean
// data at its own seed; the three passes supply the other cells, so the split
// between data and seed is measured rather than inferred.
//
//   MODE=paired  (default)  09-proteomics-clean, three passes of 60 runs:
//     pass A   perturbed data, each neighbour's own seed   — reproduces P69,
//              and records the seed each neighbour derives
//     pass B   clean data, each neighbour's seed           — the seed alone
//     pass C   perturbed data, the base file's own seed    — the data alone
//   MODE=fixtures           every clean fixture at the 60 seeds captured in pass
//                           A, plus one run at the fixture's OWN derived seed —
//                           none of the 60 is any other fixture's shipped draw,
//                           so the shipped verdict has to be placed in the
//                           distribution separately.
//
// READ-ONLY on src/. Seed substitution is a load-time source hook on
// test/probes/s348-hash-hook.mjs — nothing under src/ changes on disk.
//
// Usage:
//   node --import ./test/probes/s348-hash-hook.mjs test/probes/probe-s348-seed-sensitivity.mjs
//   MODE=fixtures node --import ./test/probes/s348-hash-hook.mjs test/probes/probe-s348-seed-sensitivity.mjs
//
// Env: N (default 60) — number of neighbours/seeds. FILE (default
// 09-proteomics-clean.csv) — the file the seeds are DERIVED from, in both modes.

import { readFileSync } from 'fs';
import { join } from 'path';

const MODE = process.env.MODE || 'paired';
const N = Math.max(1, Number(process.env.N) || 60);
const FILE = process.env.FILE || '09-proteomics-clean.csv';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis, validateMatrix } = await import('../../src/analysis/engine.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { VERDICT_TEXT } = await import('../../src/analysis/narrative.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');
const { chiSquaredP } = await import('../../src/stats/primitives.js');

if (!globalThis.__S348_HOOK) {
  throw new Error('probe-s348: the hash hook is not registered. Run with --import ./test/probes/s348-hash-hook.mjs');
}

const FIXTURES = 'test/fixtures';
const CCC = 'Cross-Condition Consistency';

// ── the import chain, copied verbatim from probe-s343-neighbours.mjs:44-63 ──
// so a seed derived here is the seed that harness derived.
function prepFromText(csv, assay) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';
  return { matrix, rawMatrix, condCtx, vst, dataType, rowSemantics, roles, headerRows, assay };
}

// One analysis run. Returns everything the promotion decision reads, plus the
// hash the engine derived on this run (null when a substitution was in force).
async function run(p) {
  globalThis.__S348_LAST = null;
  const results = await runFullAnalysis(
    p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics);
  const sev = computeSeverity(results);
  const firing = results
    .filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE')
    .map(r => ({ name: r.name, flag: r.flag, p: r.primaryP }));
  const ccc = results.find(r => r.name === CCC);
  return {
    severity: sev.severity,
    verdict: VERDICT_TEXT[sev.severity].headline,
    high: sev.high,
    mod: sev.mod,
    nDims: sev.nFlaggedDimensions,
    firing,
    cccP: ccc ? ccc.primaryP : null,
    cccFlag: ccc ? ccc.flag : null,
    derivedHash: globalThis.__S348_LAST,
  };
}

function withSeed(h, fn) {
  globalThis.__S348_HASH = h;
  return fn().finally(() => { globalThis.__S348_HASH = null; });
}

function hashLabel(h) {
  const hex = n => (n >>> 0).toString(16).padStart(8, '0');
  return `${hex(h.h1)}:${hex(h.h2)}`;
}

function firingLabel(f) {
  return f.length === 0 ? '—' : f.map(r => `${r.name}(${r.flag}, p=${r.p})`).join(' + ');
}

const ALPHA_NOTE = 0.010;

// ── The seed-rule gate, fixed BEFORE any run ─────────────────────────────────
// Chosen in advance and printed in the output header, because deciding a halt
// threshold after seeing the number is exactly what a halt condition exists to
// prevent.
//
// HALT at chi-square p < 0.01. SOFT FLAG between 0.01 and 0.05, which reports
// but stops nothing. The gate is protecting against a seed rule that is
// materially wrong, not against ordinary sampling noise at n = 60 — a 0.05 stop
// on a 60-row sample would halt in one agreeing world in twenty.
const GATE_HALT = 0.01;
const GATE_SOFT = 0.05;

/** 95% Wilson score interval for k successes in n trials. */
function wilson(k, n) {
  if (!n) return [0, 0];
  const z = 1.959963985, p = k / n, z2 = z * z;
  const d = 1 + z2 / n;
  const c = p + z2 / (2 * n);
  const h = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n));
  return [Math.max(0, (c - h) / d), Math.min(1, (c + h) / d)];
}

// One band table for ONE experiment. Never pool two experiments into one table:
// 60 near-identical files each at its own seed, and one file across 60 seeds,
// are different things and a rate over their union estimates neither. Whatever
// passes are run, the effective sample is the number of DISTINCT SEEDS.
//
// The flag test is `p < ALPHA`, so for ALPHA in (g_i, g_i+1] exactly the draws
// at or below g_i flag. Each band is one reachable behaviour; alpha chooses a
// band, not a rate.
function bandTable(label, ps) {
  const grid = [...new Set(ps)].sort((a, b) => a - b);
  console.log(`\n${label}  (n = ${ps.length})`);
  let cum = 0;
  for (let i = 0; i <= grid.length; i++) {
    const lo = i === 0 ? null : grid[i - 1];
    const hi = i < grid.length ? grid[i] : null;
    const band = lo == null ? `alpha <= ${hi}` : hi == null ? `alpha > ${lo}` : `${lo} < alpha <= ${hi}`;
    const holdsNote = (lo == null || ALPHA_NOTE > lo) && (hi == null || ALPHA_NOTE <= hi);
    const [wl, wh] = wilson(cum, ps.length);
    console.log(`  ${band.padEnd(42)} ${String(cum).padStart(4)}/${ps.length} = ${(100 * cum / ps.length).toFixed(1).padStart(5)}%` +
      `  [95% Wilson ${(100 * wl).toFixed(1)}-${(100 * wh).toFixed(1)}%]` +
      (holdsNote ? '   <-- ALPHA.NOTE = 0.010 is here' : ''));
    if (hi != null) cum += ps.filter(p => p === hi).length;
  }
}

// Are two seed sets drawing from the same p distribution on the same file?
//
// MODE=sweep's seeds are constructed by mixing a counter, and the claim that
// they stand in for real file hashes is an assumption, not a measurement. It is
// testable: pass B's seeds came from real one-cell-neighbour matrices, so if the
// constructed seeds reproduce pass B's distribution over the p grid on the same
// file, the assumption holds empirically for that file.
//
// Reported as proportions per grid point, with the Wilson interval placed on
// the SMALLER sample — that is the noisy one, and the question is whether it is
// consistent with the precise estimate, not the reverse. Per-point containment
// is descriptive only: at k grid points and 95% each, some will fall outside by
// chance, so the verdict rests on a chi-square of homogeneity over the 2 x k
// table. Columns whose expected count falls below 5 in either row are pooled,
// because the approximation is not trustworthy on sparse cells; if too few
// columns survive, the comparison declines to adjudicate rather than guessing.
function compareGrids(labA, gA, nA, labB, gB, nB) {
  const keys = [...new Set([...Object.keys(gA), ...Object.keys(gB)])].sort((x, y) => Number(x) - Number(y));
  // Interval on whichever sample is smaller.
  const bOnB = nB <= nA;
  console.log(`\n   ${labA} (n = ${nA})  vs  ${labB} (n = ${nB})`);
  console.log(`   ${'p'.padEnd(P_W)}${'A prop'.padEnd(10)}${'B prop'.padEnd(10)}` +
    `${`95% Wilson on ${bOnB ? 'B' : 'A'} (n=${bOnB ? nB : nA})`.padEnd(28)}${bOnB ? 'A' : 'B'} inside?`);
  let outside = 0;
  for (const k of keys) {
    const a = gA[k] || 0, b = gB[k] || 0;
    const pa = a / nA, pb = b / nB;
    const [lo, hi] = bOnB ? wilson(b, nB) : wilson(a, nA);
    const other = bOnB ? pa : pb;
    const inside = other >= lo && other <= hi;
    if (!inside) outside++;
    console.log(`   ${k.padEnd(P_W)}${pa.toFixed(4).padEnd(10)}${pb.toFixed(4).padEnd(10)}` +
      `${(lo.toFixed(4) + '-' + hi.toFixed(4)).padEnd(28)}${inside ? 'yes' : 'NO'}`);
  }
  console.log(`   ${keys.length - outside} of ${keys.length} grid points contain the other sample's proportion (descriptive only).`);

  // Pool sparse columns, then chi-square of homogeneity.
  const cols = keys.map(k => [gA[k] || 0, gB[k] || 0]);
  const total = nA + nB;
  const keep = [], pooled = [0, 0];
  cols.forEach(c => {
    const cs = c[0] + c[1];
    if ((cs * nA) / total >= 5 && (cs * nB) / total >= 5) keep.push(c);
    else { pooled[0] += c[0]; pooled[1] += c[1]; }
  });
  if (pooled[0] + pooled[1] > 0) keep.push(pooled);
  if (keep.length < 2) {
    console.log(`   too few columns survive pooling for a chi-square — DECLINED TO ADJUDICATE.`);
    console.log(`   Read the proportions directly; do not treat this as agreement.`);
    return null;
  }
  let chi2 = 0;
  for (const c of keep) {
    const cs = c[0] + c[1];
    const eA = (cs * nA) / total, eB = (cs * nB) / total;
    chi2 += (c[0] - eA) ** 2 / eA + (c[1] - eB) ** 2 / eB;
  }
  const df = keep.length - 1;
  const p = chiSquaredP(chi2, df);
  console.log(`   chi-square of homogeneity: X2 = ${chi2.toFixed(3)}, df = ${df}, p = ${p.toFixed(4)}` +
    `  (${keep.length} columns after pooling)`);
  if (p < GATE_HALT) {
    console.log(`   HALT (p < ${GATE_HALT}) — a finding about the seed rule, NOT a better estimate.`);
    console.log(`   Do not treat the constructed-seed figure as superseding the real-hash one.`);
  } else if (p < GATE_SOFT) {
    console.log(`   SOFT FLAG (${GATE_HALT} <= p < ${GATE_SOFT}) — reported, stops nothing.`);
  } else {
    console.log(`   No gross disagreement detected (p >= ${GATE_SOFT}).`);
  }

  // What this test could actually have caught. A non-significant chi-square at
  // n = 60 is NOT equivalence — the smaller sample has little power against a
  // small shift, so the honest reading is a bound, not a match. Reported on the
  // cell that matters: the flagging proportion below ALPHA.NOTE.
  const sumBelow = g => keys.filter(k => Number(k) < ALPHA_NOTE).reduce((s, k) => s + (g[k] || 0), 0);
  const belowA = sumBelow(gA), belowB = sumBelow(gB);
  const pbar = (belowA + belowB) / (nA + nB);
  const se = Math.sqrt(pbar * (1 - pbar) * (1 / nA + 1 / nB));
  const mdd = (2.575829304 + 0.8416212336) * se;   // two-sided 0.01, 80% power
  console.log(`   POWER — on the flag cell (p < ${ALPHA_NOTE}): A ${belowA}/${nA} = ${(100 * belowA / nA).toFixed(1)}%, B ${belowB}/${nB} = ${(100 * belowB / nB).toFixed(1)}%.`);
  console.log(`   At n = ${nA} vs ${nB} and the ${GATE_HALT} threshold, the smallest shift detectable at 80% power`);
  console.log(`   is about ${(100 * mdd).toFixed(1)} percentage points. Agreement means NO GROSS DISAGREEMENT, not equivalence.`);

  return p >= GATE_HALT;
}

// Murmur3 finaliser, reimplemented here as a SEED GENERATOR for MODE=sweep. It
// never touches a matrix and re-derives nothing in src/. It is a bijection on 32
// bits, so distinct i give distinct h1 and therefore distinct pairs.
function mix32(h) {
  h |= 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h | 0;
}
const sweepSeed = i => ({ h1: mix32(i ^ 0x9E3779B9), h2: mix32(~i ^ 0x85EBCA6B) });

// Column width for a printed p. Wide enough for the longest float JS prints for
// these values (0.018000000000000002 — 20 chars) plus separation. Anything
// narrower silently overflows and the printed table stops being machine-
// readable; every reported figure is recounted from these rows, so this is
// load-bearing rather than cosmetic.
const P_W = 22;

// ── P69's cell selection, reconstructed ─────────────────────────────────────
// probe-s343-neighbours.mjs:74-89, :103, :110, :114. cells[] is row-major over
// every data-role cell; stride = floor(cells.length/N) + 1 so the samples cycle
// columns; sample k is cells[(k*stride) % cells.length], nudged up on even k and
// down on odd k by one unit in the value's OWN last decimal place.
function nudge(s, up) {
  const dot = s.indexOf('.');
  const dp = dot < 0 ? 0 : s.length - dot - 1;
  const step = Math.pow(10, -dp);
  return (Number(s) + (up ? step : -step)).toFixed(dp);
}

// count defaults to the module-level N and stride to the S343 formula, so a
// paired run reproduces P69 exactly. MODE=sweep passes both explicitly: the
// S343 stride collides at 500 (it lands on 5, and gcd(5, 2400) = 5, so it
// repeats after 480), and a stride coprime to the cell count does not.
function neighbourPlan(lines, basePrep, count = N, strideOverride = null) {
  const dataColIdx = basePrep.roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
  const firstDataLine = basePrep.headerRows;
  const cells = [];
  for (let L = firstDataLine; L < lines.length; L++) {
    const f = lines[L].split(',');
    for (const c of dataColIdx) {
      if (f[c] != null && f[c].trim() !== '' && Number.isFinite(Number(f[c]))) cells.push([L, c, f[c].trim()]);
    }
  }
  const stride = strideOverride ?? (Math.max(1, Math.floor(cells.length / count)) + 1);
  const plan = [];
  for (let k = 0; k < count; k++) {
    const [L, c, val] = cells[(k * stride) % cells.length];
    plan.push({ k, line: L, col: c, from: val, to: nudge(val, k % 2 === 0) });
  }
  return { plan, nCells: cells.length, stride, nDataCols: dataColIdx.length };
}

/** Greatest common divisor, for the stride-collision assertion. */
const gcd = (a, b) => b ? gcd(b, a % b) : a;

// Derive the seed each one-cell neighbour would produce, WITHOUT running any
// analysis on perturbed data. The matrices are built, hashed, and discarded;
// only the {h1, h2} pairs survive into the run. validateMatrix is applied first
// because that is what the engine hashes — createPRNGFactory is called after it
// in runFullAnalysis, so hashing the raw prep matrix could differ on a file
// where sanitisation bites.
function deriveNeighbourSeeds(lines, basePrep, assay, plan) {
  const seeds = [];
  for (const s of plan) {
    const f = lines[s.line].split(',');
    f[s.col] = s.to;
    const mutated = lines.slice(); mutated[s.line] = f.join(',');
    const p = prepFromText(mutated.join('\n') + '\n', assay);
    const v = validateMatrix(p.matrix);
    globalThis.__S348_LAST = null;
    createPRNGFactory(v.valid ? v.matrix : p.matrix);
    if (!globalThis.__S348_LAST) throw new Error('probe-s348: no hash recorded while deriving a neighbour seed.');
    seeds.push({ k: s.k, line: s.line, col: s.col, from: s.from, to: s.to, ...globalThis.__S348_LAST });
  }
  return seeds;
}

const t0 = Date.now();

// ═══════════════════════════════════════════════════════════════════════════
if (MODE === 'paired') {
// ═══════════════════════════════════════════════════════════════════════════
  const assay = EXPECTED[FILE].assay;
  const original = readFileSync(join(FIXTURES, FILE), 'utf-8');
  const lines = original.replace(/\n+$/, '').split('\n');
  const basePrep = prepFromText(original, assay);
  const { plan, nCells, stride, nDataCols } = neighbourPlan(lines, basePrep);

  console.log(`S348 — paired-seed design on ${FILE}`);
  console.log(`matrix ${basePrep.matrix.length} x ${basePrep.matrix[0].length}, ${nDataCols} data columns, ${nCells} perturbable cells`);
  console.log(`P69 cell selection reconstructed: stride ${stride}, samples cells[(k*${stride}) % ${nCells}], k = 0..${N - 1}, nudge up on even k\n`);

  const base = await run(basePrep);
  const baseHash = base.derivedHash;
  if (!baseHash) throw new Error('probe-s348: no hash recorded on the unsubstituted baseline run — the hook rewrote nothing.');
  console.log(`baseline (unperturbed, own seed ${hashLabel(baseHash)}): severity ${base.severity} "${base.verdict}"  CCC p=${base.cccP} [${base.cccFlag}]`);

  // Identity check — a necessary condition, not the evidence that the shim
  // works. It is equally consistent with a faithful substitution and with an
  // inert one, since both return the baseline. The evidence that the shim is
  // live is pass B: 60 foreign hashes go into the unperturbed matrix and produce
  // flips across several grid points, which an inert shim could not do.
  const ident = await withSeed(baseHash, () => run(basePrep));
  if (ident.derivedHash !== null) throw new Error('probe-s348: substitution did not take — the real hash still ran.');
  const identOK = ident.severity === base.severity && String(ident.cccP) === String(base.cccP) &&
    firingLabel(ident.firing) === firingLabel(base.firing);
  console.log(`identity check (own hash substituted): ${identOK ? 'PASS — byte-identical verdict, CCC p and firing set' : 'FAIL'}`);
  if (!identOK) throw new Error('probe-s348: identity check failed; the substitution is not equivalent to the derivation.');
  console.log('');

  // The 2x2 square. Baseline is clean data at its own seed; the three passes
  // fill the other cells, so data and seed are separated by measurement rather
  // than by inference.
  //   pass A  perturbed data, each neighbour's own seed   (= P69, reproduced)
  //   pass B  clean data,     each neighbour's seed       (seed alone)
  //   pass C  perturbed data, the base file's own seed    (data alone)
  const preps = plan.map(s => {
    const f = lines[s.line].split(',');
    f[s.col] = s.to;
    const mutated = lines.slice(); mutated[s.line] = f.join(',');
    return prepFromText(mutated.join('\n') + '\n', assay);
  });

  // ── pass A: the 60 neighbours, each at its own derived seed ───────────────
  console.log('── pass A: the 60 neighbours at their own seeds (reproduces P69, and records each seed) ──\n');
  const tA = Date.now();
  const A = [];
  for (let i = 0; i < plan.length; i++) A.push({ ...plan[i], ...(await run(preps[i])) });
  const msA = Date.now() - tA;

  // ── pass B: the unperturbed file under each of pass A's 60 seeds ──────────
  console.log('── pass B: the UNPERTURBED file under each of those 60 seeds ──\n');
  const tB = Date.now();
  const B = [];
  for (const a of A) B.push({ k: a.k, ...(await withSeed(a.derivedHash, () => run(basePrep))) });
  const msB = Date.now() - tB;

  // ── pass C: the 60 perturbed files, all under the BASE file's own seed ────
  console.log('── pass C: the 60 PERTURBED files, all at the base file\'s own seed ──\n');
  const tC = Date.now();
  const C = [];
  for (let i = 0; i < preps.length; i++) C.push({ k: plan[i].k, ...(await withSeed(baseHash, () => run(preps[i]))) });
  const msC = Date.now() - tC;

  // ── the raw table ─────────────────────────────────────────────────────────
  const cellCol = (r) => `sev ${r.severity} CCC p=${String(r.cccP).padEnd(P_W)} ${String(r.cccFlag).padEnd(8)}`;
  console.log(`  k  ${'cell'.padEnd(14)}  ${'edit'.padEnd(18)}  ${'seed'.padEnd(17)} | ` +
    `${'A: perturbed @ own seed'.padEnd(38)} | ${'B: clean @ that seed'.padEnd(38)} | C: perturbed @ base seed`);
  console.log('  ' + ''.padEnd(160, '-'));
  for (let i = 0; i < A.length; i++) {
    const a = A[i], b = B[i], c = C[i];
    const cell = `L${a.line + 1}:c${a.col}`;
    const edit = `${a.from}->${a.to}`;
    const notes = [];
    if (a.severity !== b.severity) notes.push('A!=B');
    if (a.severity !== c.severity) notes.push('A!=C');
    console.log(
      `  ${String(a.k).padStart(2)}  ${cell.padEnd(14)}  ${edit.padEnd(18)}  ${hashLabel(a.derivedHash)} | ` +
      `${cellCol(a)} | ${cellCol(b)} | ${cellCol(c)}` +
      (notes.length ? '  <-- ' + notes.join(' ') : ''));
  }

  const flipA = A.filter(r => r.severity > 0);
  const flipB = B.filter(r => r.severity > 0);
  const flipC = C.filter(r => r.severity > 0);
  const agree = A.filter((a, i) => (a.severity > 0) === (B[i].severity > 0)).length;

  console.log(`\n── result ──\n`);
  console.log(`pass A  perturbed data, own seed   (= P69):  ${flipA.length}/${N} non-clean = ${(100 * flipA.length / N).toFixed(1)}%`);
  console.log(`pass B  clean data, A's seeds      (seed):   ${flipB.length}/${N} non-clean = ${(100 * flipB.length / N).toFixed(1)}%`);
  console.log(`pass C  perturbed data, base seed  (data):   ${flipC.length}/${N} non-clean = ${(100 * flipC.length / N).toFixed(1)}%`);
  console.log(`baseline (clean data, own seed): severity ${base.severity}`);
  console.log(`\nA vs B — cell-for-cell agreement on clean/non-clean: ${agree}/${N}`);
  console.log(`A vs B — identical severity: ${A.filter((a, i) => a.severity === B[i].severity).length}/${N}`);
  console.log(`A vs B — identical CCC primaryP: ${A.filter((a, i) => String(a.cccP) === String(B[i].cccP)).length}/${N}`);
  console.log(`A vs C — identical severity: ${A.filter((a, i) => a.severity === C[i].severity).length}/${N}`);
  console.log(`C vs baseline — identical CCC primaryP: ${C.filter(c => String(c.cccP) === String(base.cccP)).length}/${N}`);

  for (const [label, set] of [['pass A', flipA], ['pass B', flipB], ['pass C', flipC]]) {
    console.log(`\n${label} — every flip, with its driver:`);
    if (!set.length) console.log('  (none)');
    for (const r of set) {
      const a = A[r.k];
      console.log(`  k=${String(r.k).padStart(2)}  L${a.line + 1}:c${a.col} ${a.from}->${a.to}  sev ${r.severity} "${r.verdict}"  high ${r.high} mod ${r.mod} dims ${r.nDims}`);
      console.log(`        ${firingLabel(r.firing)}`);
    }
  }

  // ── the CCC p grid ────────────────────────────────────────────────────────
  const tally = rows => rows.reduce((g, r) => (g[r.cccP] = (g[r.cccP] || 0) + 1, g), {});
  const gridA = tally(A), gridB = tally(B), gridC = tally(C);
  const allP = [...new Set([...Object.keys(gridA), ...Object.keys(gridB), ...Object.keys(gridC)])]
    .sort((x, y) => Number(x) - Number(y));
  console.log(`\nCross-Condition Consistency primaryP, distinct values across all three passes:`);
  console.log(`  ${'p'.padEnd(P_W)}${'pass A'.padEnd(9)}${'pass B'.padEnd(9)}pass C`);
  for (const p of allP) {
    console.log(`  ${p.padEnd(P_W)}${String(gridA[p] || 0).padEnd(9)}${String(gridB[p] || 0).padEnd(9)}${gridC[p] || 0}`);
  }
  const nums = allP.map(Number).filter(Number.isFinite).sort((x, y) => x - y);
  if (nums.length > 1) {
    const gaps = nums.slice(1).map((v, i) => v - nums[i]);
    console.log(`  ${nums.length} distinct values, min ${nums[0]}, max ${nums[nums.length - 1]}, adjacent gaps: ${gaps.map(g => g.toPrecision(3)).join(', ')}`);
  }

  // ── the threshold arithmetic ──────────────────────────────────────────────
  // Threshold arithmetic, ONE TABLE PER EXPERIMENT. Passes A and B are not
  // pooled: A is N near-identical files each at its own natural seed, B is one
  // file across N seeds. A rate over their union estimates neither. Pass C gets
  // no table — all its runs sit on one seed, so it is not an independent set.
  console.log(`\nThreshold arithmetic — what each choice of alpha buys. The effective sample is ${N} distinct seeds,`);
  console.log(`however many passes are run over them; the two passes are separate experiments and are not pooled.`);
  bandTable('pass B — one clean file, N seeds. The seed-sensitivity result.',
    B.map(r => Number(r.cccP)).filter(Number.isFinite));
  bandTable('pass A — N near-identical clean files, each at its own seed. The closer thing to a false-positive rate over files.',
    A.map(r => Number(r.cccP)).filter(Number.isFinite));
  console.log(`\n  Nothing between the grid points is reachable, so no alpha lands between two bands.`);

  console.log(`\nwall time: pass A ${(msA / 1000).toFixed(1)}s, pass B ${(msB / 1000).toFixed(1)}s, pass C ${(msC / 1000).toFixed(1)}s, total ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Hand pass A's seeds to MODE=fixtures without re-running pass A.
  const outPath = process.env.SEEDS_OUT;
  if (outPath) {
    const { writeFileSync } = await import('fs');
    writeFileSync(outPath, JSON.stringify({
      file: FILE, n: N, stride,
      baseHash,
      // Pass B's p distribution travels with the seeds so MODE=sweep can test
      // its constructed seeds against a real-hash sample on the same file.
      passB: { n: B.length, grid: gridB },
      seeds: A.map(a => ({ k: a.k, line: a.line, col: a.col, from: a.from, to: a.to, h1: a.derivedHash.h1, h2: a.derivedHash.h2 })),
    }, null, 2));
    console.log(`seeds written to ${outPath}`);
  }

// ═══════════════════════════════════════════════════════════════════════════
} else if (MODE === 'fixtures') {
// ═══════════════════════════════════════════════════════════════════════════
  const seedsPath = process.env.SEEDS_IN;
  if (!seedsPath) throw new Error('MODE=fixtures needs SEEDS_IN=<path> from a MODE=paired run with SEEDS_OUT set.');
  const S = JSON.parse(readFileSync(seedsPath, 'utf-8'));
  const seeds = S.seeds.slice(0, N);

  const CLEAN = Object.entries(EXPECTED).filter(([, e]) => e.severity === 0).map(([f]) => f);
  console.log(`S348 — every clean fixture at the ${seeds.length} seeds derived from ${S.file}'s one-cell neighbours\n`);
  console.log(`clean fixtures enumerated from test/batch-fixtures.mjs EXPECTED (severity 0): ${CLEAN.length}`);
  for (const f of CLEAN) console.log(`  ${f}`);
  console.log('');

  for (const file of CLEAN) {
    const assay = EXPECTED[file].assay;
    const csv = readFileSync(join(FIXTURES, file), 'utf-8');
    const prep = prepFromText(csv, assay);
    const tF = Date.now();
    const own = await run(prep);
    const rows = [];
    for (const s of seeds) {
      rows.push(await withSeed({ h1: s.h1, h2: s.h2 }, () => run(prep)));
    }
    const flips = rows.filter(r => r.severity > 0);
    const ms = Date.now() - tF;

    console.log(`── ${file}  (${prep.matrix.length} x ${prep.matrix[0].length}, ${assay}) ──`);
    console.log(`   ${flips.length}/${rows.length} non-clean at the 60 foreign seeds = ${(100 * flips.length / rows.length).toFixed(1)}%   ${(ms / 1000).toFixed(1)}s`);

    // The fixture's SHIPPED draw. None of the 60 seeds is this file's own — they
    // all come from 09-proteomics-clean's neighbours — so the verdict a user
    // actually sees has to be run separately and placed in the distribution.
    console.log(`   own (shipped) seed ${hashLabel(own.derivedHash)}: severity ${own.severity} "${own.verdict}"  CCC p=${own.cccP} [${own.cccFlag}]  firing: ${firingLabel(own.firing)}`);
    const ps = rows.map(r => Number(r.cccP)).filter(Number.isFinite).sort((x, y) => x - y);
    const ownP = Number(own.cccP);
    if (Number.isFinite(ownP) && ps.length) {
      const below = ps.filter(p => p < ownP).length;
      const equal = ps.filter(p => p === ownP).length;
      const where = ownP < ps[0] ? 'BELOW every one of the 60'
        : ownP > ps[ps.length - 1] ? 'ABOVE every one of the 60'
        : `${below} of ${ps.length} below it, ${equal} equal to it`;
      console.log(`      shipped p against the 60-seed distribution: ${where}  [range ${ps[0]} .. ${ps[ps.length - 1]}]`);
    } else {
      console.log(`      shipped p is not comparable — Cross-Condition Consistency did not run on this fixture.`);
    }

    const grid = {};
    for (const r of rows) grid[r.cccP] = (grid[r.cccP] || 0) + 1;
    const gp = Object.entries(grid).sort((a, b) => Number(a[0]) - Number(b[0]));
    console.log(`   CCC primaryP grid over the 60: ${gp.length} distinct — ${gp.map(([p, n]) => `${p}x${n}`).join('  ')}`);

    // Raw per-seed rows. Every reported figure for this fixture is recounted
    // from these, never from the summary lines above.
    console.log(`   raw rows:`);
    for (let i = 0; i < rows.length; i++) {
      console.log(`     k=${String(seeds[i].k).padStart(2)}  seed ${hashLabel(seeds[i])}  sev ${rows[i].severity}  ` +
        `CCC p=${String(rows[i].cccP).padEnd(P_W)} ${String(rows[i].cccFlag).padEnd(8)}  ` +
        `high ${rows[i].high} mod ${rows[i].mod} dims ${rows[i].nDims}  ${firingLabel(rows[i].firing)}`);
    }
    console.log('');
  }
  console.log(`wall time total ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// ═══════════════════════════════════════════════════════════════════════════
} else if (MODE === 'sweep') {
// ═══════════════════════════════════════════════════════════════════════════
  // Part 4. Pass-B shape at higher resolution: unperturbed matrices only, many
  // seeds, so the interval on the flip rate tightens.
  const files = (process.env.FILES || '09-proteomics-clean.csv,01-densitometry-clean.csv')
    .split(',').map(s => s.trim()).filter(Boolean);
  const NS = Math.max(1, Number(process.env.SWEEP) || 500);
  const SOURCE = process.env.SEED_SOURCE || 'constructed';
  const NEI_STRIDE = Math.max(1, Number(process.env.NEI_STRIDE) || 7);
  // Comparison reference. SEEDS_IN takes a MODE=paired seeds file (pass B's
  // 60-run grid); GRID_IN takes a grid written by an earlier sweep via GRID_OUT,
  // which is how a 500-vs-500 comparison is assembled without re-running either.
  const REF = process.env.SEEDS_IN ? JSON.parse(readFileSync(process.env.SEEDS_IN, 'utf-8')) : null;
  const GRID_REF = process.env.GRID_IN ? JSON.parse(readFileSync(process.env.GRID_IN, 'utf-8')) : null;
  const gridOut = {};

  console.log(`S348 — ${NS} seeds per fixture, unperturbed matrices only (pass-B shape)\n`);

  // ── where the seeds come from ────────────────────────────────────────────
  // SEED_SOURCE=neighbours replaces the well-mixed-pair assumption with a
  // measurement. The assumption was avoidable rather than merely testable: the
  // stride collision came from the stride, not from any shortage of real seeds.
  // 2,400 cells x 2 nudge directions = 4,800 distinct one-unit neighbours exist,
  // so 500 real hashes are free. Only the 500 runs cost anything.
  let sweep, sourceLabel;
  if (SOURCE === 'neighbours') {
    const src = process.env.SEED_FILE || files[0];
    const assay = EXPECTED[src].assay;
    const lines = readFileSync(join(FIXTURES, src), 'utf-8').replace(/\n+$/, '').split('\n');
    const basePrep = prepFromText(lines.join('\n') + '\n', assay);
    const { plan, nCells, stride } = neighbourPlan(lines, basePrep, NS, NEI_STRIDE);
    if (gcd(NEI_STRIDE, nCells) !== 1) {
      throw new Error(`probe-s348: stride ${NEI_STRIDE} is not coprime to ${nCells} cells — the sample would repeat after ${nCells / gcd(NEI_STRIDE, nCells)}.`);
    }
    const cellKeys = new Set(plan.map(s => `${s.line}:${s.col}`));
    if (cellKeys.size !== NS) throw new Error(`probe-s348: ${cellKeys.size} distinct cells, expected ${NS}.`);
    console.log(`Seed source: REAL one-unit neighbours of ${src}.`);
    console.log(`  cells[(k * ${stride}) % ${nCells}] for k = 0..${NS - 1}, row-major over data-role cells as`);
    console.log(`  probe-s343-neighbours.mjs builds them. gcd(${stride}, ${nCells}) = 1, so the ${NS} cells are distinct.`);
    console.log(`  Nudge direction: UP on even k, DOWN on odd k — the S343 convention, stated because tying`);
    console.log(`  direction to the sample index is what produced the Rep6 confound in part 2.`);
    console.log(`  Each neighbour matrix is built, hashed through validateMatrix + createPRNGFactory, and`);
    console.log(`  DISCARDED. Nothing perturbed enters the analysis — the runs are pass-B shape throughout.`);
    console.log(`  These rest on no equivalence assumption: they are seeds real files actually derive.\n`);
    sweep = deriveNeighbourSeeds(lines, basePrep, assay, plan);
    sourceLabel = `${NS} real neighbour-derived hashes`;
  } else {
    console.log(`Seed source: CONSTRUCTED. For i = 0..${NS - 1},  h1 = mix32(i ^ 0x9E3779B9),  h2 = mix32(~i ^ 0x85EBCA6B),`);
    console.log(`where mix32 is the Murmur3 finaliser — a bijection on 32 bits, so the pairs are distinct`);
    console.log(`by construction rather than by check. The neighbour-stride rule is deliberately NOT`);
    console.log(`extended to this size at its S343 value: gcd(5, 2400) = 5, so it repeats after 480.`);
    console.log(`\nThis rests on the assumption already underwriting the three offset hooks — that a`);
    console.log(`well-mixed pair is as good as a real file's. These are NOT seeds any file is known to`);
    console.log(`derive. SEED_SOURCE=neighbours removes the assumption entirely.\n`);
    sweep = Array.from({ length: NS }, (_, i) => sweepSeed(i));
    sourceLabel = `${NS} constructed seeds`;
  }

  const uniq = new Set(sweep.map(s => `${s.h1}:${s.h2}`));
  if (uniq.size !== NS) throw new Error(`probe-s348: seed source gave ${uniq.size} distinct {h1,h2} pairs, expected ${NS}.`);
  console.log(`${uniq.size} distinct {h1, h2} pairs confirmed.\n`);

  if (REF || GRID_REF) {
    console.log(`── seed-rule gate, declared before any result ──`);
    console.log(`Reference set: ${GRID_REF ? `${GRID_REF.label} (n = ${GRID_REF.n})` :
      REF.passB ? `${REF.passB.n} real neighbour-derived hashes` : '(none)'} from ${GRID_REF ? GRID_REF.file : REF.file}.`);
    console.log(`Statistic: chi-square of homogeneity over the 2 x k p-grid table, columns with expected < 5 pooled.`);
    console.log(`  p <  ${GATE_HALT}          HALT. The seed rule is materially wrong; the constructed-seed`);
    console.log(`                      figure does NOT supersede the real-hash one.`);
    console.log(`  ${GATE_HALT} <= p < ${GATE_SOFT}   SOFT FLAG. Reported, stops nothing.`);
    console.log(`  p >= ${GATE_SOFT}         No gross disagreement detected. This is a bound, not equivalence —`);
    console.log(`                      the minimum detectable shift is printed with the result.`);
    console.log(`If too few columns survive pooling, the comparison DECLINES TO ADJUDICATE rather than`);
    console.log(`reporting an agreement it has not established.\n`);
  }

  for (const file of files) {
    if (!EXPECTED[file]) throw new Error(`probe-s348: ${file} is not in EXPECTED.`);
    const assay = EXPECTED[file].assay;
    const prep = prepFromText(readFileSync(join(FIXTURES, file), 'utf-8'), assay);
    const tF = Date.now();
    const own = await run(prep);
    const rows = [];
    for (const s of sweep) rows.push(await withSeed(s, () => run(prep)));
    const ms = Date.now() - tF;

    const flips = rows.filter(r => r.severity > 0).length;
    const ps = rows.map(r => Number(r.cccP)).filter(Number.isFinite);
    const below = ps.filter(p => p < ALPHA_NOTE).length;
    const [fl, fh] = wilson(flips, rows.length);
    const [bl, bh] = wilson(below, rows.length);

    console.log(`── ${file}  (${prep.matrix.length} x ${prep.matrix[0].length}, ${assay}) ──`);
    console.log(`   own (shipped) seed ${hashLabel(own.derivedHash)}: severity ${own.severity} "${own.verdict}"  CCC p=${own.cccP} [${own.cccFlag}]`);
    console.log(`   non-clean:              ${String(flips).padStart(4)}/${rows.length} = ${(100 * flips / rows.length).toFixed(2)}%  [95% Wilson ${(100 * fl).toFixed(2)}-${(100 * fh).toFixed(2)}%]`);
    console.log(`   CCC p < ALPHA.NOTE:     ${String(below).padStart(4)}/${rows.length} = ${(100 * below / rows.length).toFixed(2)}%  [95% Wilson ${(100 * bl).toFixed(2)}-${(100 * bh).toFixed(2)}%]`);
    console.log(`   wall time ${(ms / 1000).toFixed(1)}s`);

    const grid = {};
    for (const r of rows) grid[r.cccP] = (grid[r.cccP] || 0) + 1;
    const gp = Object.entries(grid).sort((a, b) => Number(a[0]) - Number(b[0]));
    console.log(`   CCC primaryP grid: ${gp.length} distinct — ${gp.map(([p, n]) => `${p}x${n}`).join('  ')}`);
    if (ps.length) bandTable(`   threshold arithmetic, ${file}`, ps);

    // The well-mixed-pair assumption, tested rather than asserted. Only possible
    // on the file the real-hash sample was drawn from.
    gridOut[file] = { label: sourceLabel, file, n: rows.length, grid };
    if (GRID_REF && GRID_REF.file === file) {
      compareGrids(sourceLabel, grid, rows.length, GRID_REF.label, GRID_REF.grid, GRID_REF.n);
    } else if (REF && REF.file === file && REF.passB) {
      compareGrids(sourceLabel, grid, rows.length, `pass B, ${REF.passB.n} real neighbour hashes`, REF.passB.grid, REF.passB.n);
    } else if (REF || GRID_REF) {
      console.log(`\n   no comparison for ${file} — the reference set was drawn from ${GRID_REF ? GRID_REF.file : REF.file}.`);
    }

    const other = new Set();
    for (const r of rows) for (const f of r.firing) if (f.name !== CCC) other.add(`${f.name} [${f.flag}]`);
    console.log(`\n   tests other than Cross-Condition Consistency reaching MOD/HIGH: ${other.size ? [...other].join(', ') : 'none'}`);

    console.log(`   raw rows:`);
    for (let i = 0; i < rows.length; i++) {
      console.log(`     i=${String(i).padStart(3)}  seed ${hashLabel(sweep[i])}  sev ${rows[i].severity}  ` +
        `CCC p=${String(rows[i].cccP).padEnd(P_W)} ${String(rows[i].cccFlag).padEnd(8)}  ${firingLabel(rows[i].firing)}`);
    }
    console.log('');
  }
  if (process.env.GRID_OUT) {
    const { writeFileSync } = await import('fs');
    const target = process.env.GRID_FILE || files[0];
    writeFileSync(process.env.GRID_OUT, JSON.stringify(gridOut[target], null, 2));
    console.log(`grid for ${target} written to ${process.env.GRID_OUT}`);
  }
  console.log(`wall time total ${((Date.now() - t0) / 1000).toFixed(1)}s`);

} else {
  throw new Error(`unknown MODE "${MODE}" — use paired, fixtures or sweep.`);
}
