// Battery-wide calibration probe.
//
// Asks the question probe-autocorr-calibration.mjs asks of one test, of every
// test at once: how often does each one fire on data whose row order carries
// no information, and is the observed result remarkable against that null?
//
// WHY THIS ONE RUNS THE WHOLE BATTERY
// -----------------------------------
// The single-test probe reproduces one dispatch expression by hand, which is
// fast but has to be re-derived per test — and getting it wrong silently
// reports confident numbers about a reimplementation. Every test has different
// wiring: Autocorrelation takes no rng, Runs takes an rng and a parent
// context, Inter-Replicate Correlation takes slices directly rather than going
// through runPairVST. Reproducing 29 of those is 29 chances to be wrong.
//
// So this probe calls `runFullAnalysis` itself. It is 500-6000x slower per
// iteration, and in exchange the dispatch is not reproduced at all: it IS the
// production path, for every test simultaneously. The faithfulness assertion
// the single-test probe makes explicitly is structural here — but the harness
// can still feed the engine wrong inputs, so the unpermuted run is checked
// against the fixture's expected severity before any permutation is reported.
//
// WHAT IS PERMUTED, AND WHERE
// ---------------------------
// One permutation of row order per iteration, applied identically to every
// column of both `matrix` and `rawMatrix`, so each row keeps its internal
// structure and only the sequence is destroyed. The condition context is
// rebuilt on the permuted matrix and the variance-stabilising transform is
// re-detected from it, so nothing is assumed to be invariant under the shuffle.
//
// WHAT THE NUMBERS MEAN
// ---------------------
// `MOD+` is the primary measure: how often the real dispatch returns MODERATE
// or higher on shuffled data. It is unambiguous because it is what the battery
// actually reports. The false-positive columns read `primaryP`, which for most
// tests is the deciding quantity but for some is a reported detail — where the
// two differ, trust MOD+.
//
// `emp p` is the fraction of shuffles whose primaryP is at least as small as
// the observed one. It is an empirical p-value for the test on that file. A
// test firing at p = 0.002 whose observed value is beaten by a fifth of all
// shuffles is reporting noise.
//
// Usage:
//   node test/probes/probe-battery-calibration.mjs [nPerm] [fixture ...]
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const B = new URL('../../', import.meta.url).pathname;
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import(B + 'src/analysis/engine.js');
const { computeSeverity } = await import(B + 'src/analysis/severity.js');
const { detectVST } = await import(B + 'src/stats/vst.js');
const { inferRoles } = await import(B + 'src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import(B + 'src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import(B + 'src/import/parser.js');
const { EXPECTED } = await import(B + 'test/batch-fixtures.mjs');

const FIX = join(B, 'test/fixtures');
const N_PERM = Number(process.argv[2]) || 500;
const ARG_FIX = process.argv.slice(3).filter(a => !a.startsWith('-'));
const ANCHORS = ARG_FIX.length ? ARG_FIX : [
  '02-densitometry-fabricated.csv',    // all three candidates fired here
  '17-densitometry-carlisle-clean.csv',// clean fixture — nothing to find
  '20-bimodal-fab.csv',                // pooled route, already characterised
];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function permutation(n, rnd) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
}

function prepare(file) {
  const raw = preprocessRaw(
    Papa.default.parse(readFileSync(join(FIX, file), 'utf-8'), { skipEmptyLines: true }).data
  ).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = EXPECTED[file]?.assay || 'general';
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  return { matrix, rawMatrix, condCtx, assay, dataType: ASSAY_DATATYPE_MAP[assay] || 'continuous' };
}

const analyse = (m, rm, ctx, assay, dataType) =>
  runFullAnalysis(m, rm, ctx, assay, null, detectVST(m, assay), { isPivoted: false }, dataType, 'ordered');

const isFlagged = f => f === 'MODERATE' || f === 'HIGH';
const pad = (s, n) => String(s).padEnd(n);
const pc = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : '—';

for (const file of ANCHORS) {
  const { matrix, rawMatrix, condCtx, assay, dataType } = prepare(file);
  const observed = await analyse(matrix, rawMatrix, condCtx, assay, dataType);
  const obsSev = computeSeverity(observed).severity;

  // The harness must feed the engine what production feeds it. If the
  // unpermuted severity disagrees with the fixture's expected value, the
  // inputs are wrong and every number below describes the harness.
  const wantSev = EXPECTED[file]?.severity;
  const ok = wantSev === undefined || obsSev === wantSev;

  console.log('='.repeat(112));
  console.log(`${file}   ${matrix.length} rows x ${matrix[0].length} cols   assay=${assay}   conditions: ${condCtx.type} x${condCtx.count}`);
  console.log(`  severity check: observed ${obsSev}, fixture expects ${wantSev} -> ${ok ? 'MATCHES' : '*** MISMATCH — numbers below are untrustworthy ***'}`);

  const obs = new Map();
  for (const r of observed) obs.set(r.name, { flag: r.flag, p: Number(r.primaryP) });

  const acc = new Map();
  for (const r of observed) acc.set(r.name, { mod: 0, lt01: 0, lt001: 0, atLeast: 0, ran: 0, seen: new Set() });

  const rnd = mulberry32(0xC0FFEE);
  const t0 = Date.now();
  for (let k = 0; k < N_PERM; k++) {
    const p = permutation(matrix.length, rnd);
    const m = p.map(i => matrix[i]);
    const rm = rawMatrix ? p.map(i => rawMatrix[i]) : rawMatrix;
    const res = await analyse(m, rm, condCtx.withMatrix(m), assay, dataType);
    for (const r of res) {
      const a = acc.get(r.name); if (!a) continue;
      if (r.flag === 'N/A') continue;
      a.ran++;
      if (isFlagged(r.flag)) a.mod++;
      const pv = Number(r.primaryP);
      a.seen.add(Number.isFinite(pv) ? pv.toPrecision(12) : String(r.flag));
      if (Number.isFinite(pv)) {
        if (pv < 0.01) a.lt01++;
        if (pv < 0.001) a.lt001++;
        const o = obs.get(r.name)?.p;
        if (Number.isFinite(o) && pv <= o) a.atLeast++;
      }
    }
  }
  const secs = (Date.now() - t0) / 1000;
  console.log(`  ${N_PERM} row-order permutations of the full battery in ${secs.toFixed(0)}s (${(1000*secs/N_PERM).toFixed(0)} ms per run)\n`);

  // A common row permutation moves whole rows, so a test whose statistic does
  // not read row ORDER is unaffected by it and the rates below are not a
  // calibration measurement — they just restate the observed result. Two
  // caveats on the "varies" column:
  //
  //  1. createPRNG seeds from an FNV-1a hash folded over the matrix IN ROW
  //     ORDER, so permuting reseeds every simulation and permutation null.
  //     A simulation-based test can therefore wobble under the shuffle without
  //     its statistic reading row order at all. "varies" means the reported p
  //     moved, not that the test is sequence-sensitive.
  //  2. The tell for an order-invariant test is a rate pinned near 0% or 100%
  //     tracking its own observed flag, because every shuffle reproduces the
  //     observed result. Intermediate rates indicate genuine order sensitivity.
  console.log('  ' + pad('test', 34) + pad('observed', 20) + pad('MOD+', 9) + pad('p<0.01', 9) + pad('p<0.001', 9) + pad('emp p', 8) + 'varies under shuffle?');
  console.log('  ' + '-'.repeat(118));
  const rows = [...acc.entries()]
    .map(([name, a]) => ({ name, a, o: obs.get(name) }))
    .filter(r => r.a.ran > 0)
    .sort((x, y) => (y.a.mod / y.a.ran) - (x.a.mod / x.a.ran));
  for (const { name, a, o } of rows) {
    const oStr = `${o.flag}${Number.isFinite(o.p) ? ` p=${o.p < 1e-4 ? o.p.toExponential(1) : o.p.toFixed(4)}` : ''}`;
    const emp = Number.isFinite(o.p) ? (a.atLeast / a.ran).toFixed(3) : '—';
    const varies = a.seen.size > 1;
    console.log('  ' + pad(name, 34) + pad(oStr, 20) +
                pad(varies ? pc(a.mod, a.ran) : '—', 9) +
                pad(varies ? pc(a.lt01, a.ran) : '—', 9) +
                pad(varies ? pc(a.lt001, a.ran) : '—', 9) +
                pad(varies && isFlagged(o.flag) ? emp : '', 8) +
                (varies ? 'varies' : 'CONSTANT - shuffle is a no-op here'));
  }
  const live = rows.filter(r => r.a.seen.size > 1);
  const grossly = live.filter(r => r.a.mod / r.a.ran > 0.05);
  console.log(`\n  ${rows.length} tests ran; ${live.length} varied under the shuffle (see caveats above before reading these as calibration).`);
  console.log(`  Of those, firing MODERATE+ on more than 5% of shuffles: ${grossly.length}` +
              (grossly.length ? ` (${grossly.map(r => `${r.name} ${pc(r.a.mod, r.a.ran)}`).join(', ')})` : ''));
}
