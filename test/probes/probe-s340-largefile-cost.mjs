/* S340 step 3 — what an engine run costs above 1 500 rows.

   No fixture exceeds 1 500 rows, so every resample tier below the top is
   inferred rather than measured, and so is the wallclock. This synthesises
   wide-and-tall files and times a full engine run on each, at the shipped
   counts and (under the flat-B hook) at one uncoupled count.

     node test/probes/probe-s340-largefile-cost.mjs
     S340_FLAT_B=4999 node --import ./test/probes/s340-flat-b-hook.mjs test/probes/probe-s340-largefile-cost.mjs

   Synthetic data, deliberately clean: the point is the clock, not the verdict.
   Reads src/, writes nothing there. */
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');

/* Deterministic log-normal replicate data, no PRNG from src/ involved. */
function synth(nRows, nCols) {
  let s = 12345;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const rows = [];
  for (let r = 0; r < nRows; r++) {
    const base = Math.exp(1 + 3 * rnd());
    const row = [];
    for (let c = 0; c < nCols; c++) row.push(String((base * Math.exp(0.15 * (rnd() * 2 - 1))).toFixed(4)));
    rows.push(row);
  }
  return rows;
}

const SHAPES = [[1500, 4], [5000, 4], [10000, 4], [10000, 8]];
console.log(`engine wallclock on synthetic files  (${process.env.S340_FLAT_B ? `flat B = ${process.env.S340_FLAT_B}` : 'shipped counts'})`);
console.log(`${'rows'.padStart(7)} ${'cols'.padStart(5)} ${'cells'.padStart(9)} ${'engine ms'.padStart(11)}  slowest three tests`);
for (const [nRows, nCols] of SHAPES) {
  const data = synth(nRows, nCols);
  const roles = Array(nCols).fill('data');
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol: null, zeroAsMissing: false });
  const vst = detectVST(matrix, 'general');
  process.env.PERF = '1';
  const t0 = performance.now();
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, 'general', null, vst, {}, 'continuous', 'ordered');
  const ms = performance.now() - t0;
  const timings = (results._perfTimings || []).slice().sort((a, b) => b.ms - a.ms).slice(0, 3);
  console.log(
    `${String(nRows).padStart(7)} ${String(nCols).padStart(5)} ${String(nRows * nCols).padStart(9)} ${ms.toFixed(0).padStart(11)}  ` +
    (timings.length ? timings.map(t => `${t.name} ${t.ms.toFixed(0)}ms`).join(', ') : '(PERF not enabled at import time)')
  );
}
