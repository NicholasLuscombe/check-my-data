// S219 — synthetic over-cap assertion. Feeds each capping producer an input
// sized PAST its cap and asserts the count field the card reads is the
// PRE-slice total (not the post-slice length). No UI, no fixtures — pure unit
// assertions against the test functions.
//
// Pass criterion per producer: the surfaced count strictly EXCEEDS the cap
// (so it can only be the pre-slice length; a post-slice count would equal the
// cap exactly).

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { createPRNG } = await import('../src/stats/prng.js');
const { createConditionContext } = await import('../src/analysis/conditionContext.js');
const { testBlockedMahalanobis } = await import('../src/tests/blockedMahalanobis.js');
const { testValueFrequencySpike } = await import('../src/tests/valueFrequencySpike.js');
const { testConstantOffset } = await import('../src/tests/constantOffset.js');
const { testPearsonUniformity } = await import('../src/tests/interReplicateCorrelation.js');
const { testColumnGof } = await import('../src/tests/columnGof.js');
const { testEntropy } = await import('../src/tests/entropyTest.js');

// Deterministic LCG so runs are reproducible without Math.random.
let _s = 123456789;
const rand = () => { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; };
const randn = () => { let u = 0, v = 0; while (u === 0) u = rand(); while (v === 0) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
// Acklam inverse-normal CDF — for exact-quantile ("too-tight fit") columns.
function qnorm(p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425, ph = 1 - pl; let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= ph) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

const results = [];
const record = (producer, field, asserted, cap, pass, note) =>
  results.push({ producer, field, asserted, cap, pass, note });

// ── 1. BlockedMahalanobis — details.slice(0,30); field = nDetailRows ──────
// 16 row-grouped conditions × 60 rows × 3 replicate cols. units = 2 × 16 = 32;
// every unit pushes ≥1 window (its argmax), so detailRows ≥ 32 > 30 by
// construction regardless of the 5%-window count.
{
  const NCOND = 16, NROW = 60, NCOL = 3;
  const matrix = [];
  const rowConditions = [];
  for (let c = 0; c < NCOND; c++) {
    for (let r = 0; r < NROW; r++) {
      const latent = randn();               // shared signal → cross-col correlation
      matrix.push(Array.from({ length: NCOL }, () => latent + 0.5 * randn()));
      rowConditions.push(`C${c + 1}`);
    }
  }
  const condCtx = createConditionContext({ rowConditions, matrix });
  const rng = createPRNG(matrix);
  const result = await testBlockedMahalanobis(matrix, condCtx, rng, 'continuous');
  const n = result.nDetailRows;
  const shown = (result.details || []).length;
  // pass: count present, exceeds the 30 cap, and is strictly > the shown (post-slice) length
  const pass = Number.isInteger(n) && n > 30 && shown === 30 && n > shown;
  record('BlockedMahalanobis', 'nDetailRows', n, 30, pass,
    `details(post-slice)=${shown}; flag=${result.flag}`);
}

// ── 2. ValueFrequency — allSpikes.slice(0,15); field = nSpikes ────────────
// Bounded integer scale 1–300 (VFS rejects wide ranges). 19 spike values
// (every 15th) each repeated 40× over a uniform background → ~19 spikes > 15.
{
  const vals = [];
  for (let s = 15; s <= 285; s += 15) for (let i = 0; i < 40; i++) vals.push(s);
  for (let f = 0; f < 800; f++) vals.push(1 + Math.floor(rand() * 300));   // uniform background
  const matrix = vals.map(v => [v]);
  const result = testValueFrequencySpike(matrix);
  const n = result.nSpikes;
  const shown = (result.details || []).length;
  const pass = Number.isInteger(n) && n > 15 && shown === 15 && n > shown;
  record('ValueFrequency', 'nSpikes', n, 15, pass,
    `details(post-slice)=${shown}; flag=${result.flag}`);
}

// ── 3. ConstantOffset — found.slice(0,20); field = consecutiveEqualDiffs ──
// col1 = col0 + 5 across all 40 rows → 39 consecutive-equal-diff blocks > 20.
{
  const NROW = 40;
  const matrix = [];
  for (let r = 0; r < NROW; r++) matrix.push([r + 1, r + 1 + 5, 100 + randn()]);
  const rng = createPRNG(matrix);
  const result = testConstantOffset(matrix, rng);
  const n = result.consecutiveEqualDiffs;
  const shown = (result.details || []).length;
  const pass = Number.isInteger(n) && n > 20 && shown <= 20 && n > shown;
  record('ConstantOffset', 'consecutiveEqualDiffs', n, 20, pass,
    `details(post-slice)=${shown}; flag=${result.flag}`);
}

// ── 4. IRC — winIrcSig=allWinResults.slice(0,20); field = nWindowsTested ──
// 1 'All data' slice, 150 rows × 3 cols → 3 pairs × ~28 windows = ~72 > 20.
{
  const NROW = 150, NCOL = 3;
  const matrix = [];
  for (let r = 0; r < NROW; r++) {
    const latent = randn();
    matrix.push(Array.from({ length: NCOL }, () => latent + 0.6 * randn()));
  }
  const condCtx = createConditionContext({ matrix });   // no conditions → single 'All data' slice
  const rng = createPRNG(matrix);
  const result = testPearsonUniformity(matrix, condCtx.slices(), rng, 'ordered');
  const n = result.nWindowsTested;
  const shown = result.windowSigCount;   // winIrcSig.length, capped at 20
  const pass = Number.isInteger(n) && n > 20 && n > shown;
  record('IRC', 'nWindowsTested', n, 20, pass,
    `windowSigCount(post-slice cap)=${shown}; flag=${result.flag}`);
}

// ── 5. ColumnGoF — totalCount={nFlagged}; DataTable footer fires when > 20 ─
// 25 exact-normal-quantile columns — suspiciously perfect fits → all flag
// "Too-tight fit" (AD too small), none pre-skipped.
{
  const NROW = 150, NCOL = 25;
  const matrix = Array.from({ length: NROW }, () => new Array(NCOL));
  for (let c = 0; c < NCOL; c++) {
    const col = [];
    for (let i = 0; i < NROW; i++) col.push(qnorm((i + 0.5) / NROW) * (1 + c * 0.02));
    for (let i = col.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [col[i], col[j]] = [col[j], col[i]]; }
    for (let r = 0; r < NROW; r++) matrix[r][c] = col[r];
  }
  const rng = createPRNG(matrix);
  const result = testColumnGof(matrix, rng, 'continuous');
  const n = result.nFlagged;
  const footerFires = n > 20;  // DataTable: total(=nFlagged) > maxRows(20) → "Showing 20 of N."
  const pass = Number.isInteger(n) && n > 20 && footerFires;
  record('ColumnGoF', 'nFlagged', n, 20, pass,
    `footer fires (nFlagged>maxRows=20): ${footerFires}; flag=${result.flag}`);
}

// ── 6. Entropy — totalCount={nFlagged}; DataTable footer fires when > 20 ──
// 25 coarsely-discretized columns (~5 distinct values) → low-entropy flag on
// each → >20 flagged.
{
  const NROW = 120, NCOL = 25;
  const matrix = [];
  for (let r = 0; r < NROW; r++) matrix.push(Array.from({ length: NCOL }, (_, c) => Math.round(randn() * 0.5) + c * 0.001));
  const rng = createPRNG(matrix);
  const result = testEntropy(matrix, rng, 'continuous');
  const n = result.nFlagged;
  const footerFires = n > 20;
  const pass = Number.isInteger(n) && n > 20 && footerFires;
  record('Entropy', 'nFlagged', n, 20, pass,
    `footer fires (nFlagged>maxRows=20): ${footerFires}; flag=${result.flag}`);
}

// ── Report ────────────────────────────────────────────────────────────────
console.log('\nS219 over-cap assertions — count fields are PRE-slice totals\n');
let allPass = true;
for (const r of results) {
  const tag = r.pass ? 'PASS' : 'FAIL';
  if (!r.pass) allPass = false;
  console.log(`[${tag}] ${r.producer.padEnd(20)} ${r.field} = ${r.asserted} (cap ${r.cap}) — ${r.note}`);
}
console.log(`\n${allPass ? 'ALL PASS' : 'FAILURES PRESENT'} — ${results.filter(r => r.pass).length}/${results.length}\n`);
process.exit(allPass ? 0 : 1);
