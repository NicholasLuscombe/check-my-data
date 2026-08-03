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
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { VERDICT_TEXT } = await import('../../src/analysis/narrative.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

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

function neighbourPlan(lines, basePrep) {
  const dataColIdx = basePrep.roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
  const firstDataLine = basePrep.headerRows;
  const cells = [];
  for (let L = firstDataLine; L < lines.length; L++) {
    const f = lines[L].split(',');
    for (const c of dataColIdx) {
      if (f[c] != null && f[c].trim() !== '' && Number.isFinite(Number(f[c]))) cells.push([L, c, f[c].trim()]);
    }
  }
  const stride = Math.max(1, Math.floor(cells.length / N)) + 1;
  const plan = [];
  for (let k = 0; k < N; k++) {
    const [L, c, val] = cells[(k * stride) % cells.length];
    plan.push({ k, line: L, col: c, from: val, to: nudge(val, k % 2 === 0) });
  }
  return { plan, nCells: cells.length, stride, nDataCols: dataColIdx.length };
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

  console.log(`S348 part 4 — ${NS} seeds per fixture, unperturbed matrices only (pass-B shape)\n`);
  console.log(`Seed rule: for i = 0..${NS - 1},  h1 = mix32(i ^ 0x9E3779B9),  h2 = mix32(~i ^ 0x85EBCA6B),`);
  console.log(`where mix32 is the Murmur3 finaliser — a bijection on 32 bits, so the pairs are distinct`);
  console.log(`by construction rather than by check. The neighbour-stride rule is deliberately NOT`);
  console.log(`extended to this size: gcd(5, 2400) = 5, so it repeats after 480 and the last twenty`);
  console.log(`samples would duplicate earlier ones.`);
  console.log(`\nThis rests on the assumption already underwriting the three offset hooks — that a`);
  console.log(`well-mixed pair is as good as a real file's. These are NOT seeds any file is known to`);
  console.log(`derive, and the result is a property of the seed distribution, not of a corpus of files.\n`);

  const sweep = Array.from({ length: NS }, (_, i) => sweepSeed(i));
  const uniq = new Set(sweep.map(s => `${s.h1}:${s.h2}`));
  if (uniq.size !== NS) throw new Error(`probe-s348: seed rule gave ${uniq.size} distinct pairs, expected ${NS}.`);
  console.log(`${uniq.size} distinct {h1, h2} pairs confirmed.\n`);

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
  console.log(`wall time total ${((Date.now() - t0) / 1000).toFixed(1)}s`);

} else {
  throw new Error(`unknown MODE "${MODE}" — use paired, fixtures or sweep.`);
}
