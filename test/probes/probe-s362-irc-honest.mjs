// S362 — what Inter-Replicate Correlation is responding to on an honest file.
//
// S361 measured the battery on 560 generated files with nothing planted in them
// and found Inter-Replicate Correlation firing on 15% of them at six replicates
// and 10% at four, flat across the whole condition-noise ladder and identical
// under both assay labels. This probe asks what the statistic is doing there.
//
// The routing question is whether a SINGLE FAMILY MEMBER's p is uniform.
//
//   member p uniform, family of one          -> a real calibration defect
//   member p uniform, family of several,
//     extreme taken without correction       -> the P104 multiplicity pattern
//   member p not uniform                     -> a fault in the null itself
//
// So the probe reports the two histograms separately: the p of one fixed family
// member across draws, and the p that actually decides the flag. It also splits
// the flags by tier, because a uniform member p behind an uncorrected minimum
// puts about one flagged file in five at HIGH (the tiers sit at 0.001 and 0.01)
// and a split far below that says the reported p has a compressed tail whatever
// the histogram looks like.
//
// Arms:
//
//   --base       200 draws at the generator's own settings: k = 1, sigmaS = 0,
//                condNoiseRatio = 1, 120 subjects, 6 replicates. Honest data.
//   --noeffect   the same, with effectFrac = 0. The generator plants a 1.5-fold
//                condition effect on a fifth of subjects; at sigmaS = 0 that is
//                the only between-subject structure in the file, so this arm
//                asks whether the statistic is reading it.
//   --reps       the same at 4 replicates and at 6, both arms.
//   --verify     direct-call-vs-engine check on a handful of draws. The direct
//                call must reproduce runFullAnalysis exactly or nothing else
//                here is measuring the shipped test.
//
// Datasets are ephemeral. Nothing is written to test/fixtures; regenerate from
// the parameters.
//
//   node test/probes/probe-s362-irc-honest.mjs --verify
//   node test/probes/probe-s362-irc-honest.mjs --base --noeffect
//   DRAWS=200 node test/probes/probe-s362-irc-honest.mjs --reps

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis, validateMatrix } = await import('../../src/analysis/engine.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { testPearsonUniformity } = await import('../../src/tests/interReplicateCorrelation.js');
const { ALPHA } = await import('../../src/constants/thresholds.js');
const { generate } = await import('../gen-copy-fidelity.mjs');

const DRAWS = Number(process.env.DRAWS) || 200;
const SUBJECTS = Number(process.env.SUBJECTS) || 120;
const SEED_BASE = Number(process.env.SEED_BASE) || 6200;
const ASSAY = process.env.ASSAY || 'general';

// ── load path ───────────────────────────────────────────────────────────
// Identical to probe-s361-ladder.mjs up to the point where the engine hands the
// matrix to a test, so the inputs are the ones the engine would build.
function inputs(csv) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, null);
  return extractAnalysisInputs({ data, roles, condPerCol: null, zeroAsMissing: false });
}

// Direct IRC call reproducing the engine's dispatch (engine.js:430). IRC is NOT
// on the VST list — it receives the plain matrix and the plain condCtx, which is
// why its rate is identical under both assay labels. The PRNG stream is keyed on
// the sanitised matrix and the dispatch-map key, per S340.
function ircDirect(csv) {
  const { matrix, condCtx } = inputs(csv);
  const validated = validateMatrix(matrix).matrix;
  const rngFor = createPRNGFactory(validated);
  return testPearsonUniformity(validated, condCtx.slices(),
    rngFor('Inter-Replicate Correlation'), 'ordered');
}

async function ircViaEngine(csv) {
  const { matrix, rawMatrix, condCtx } = inputs(csv);
  const vst = detectVST(matrix, ASSAY);
  const dataType = ASSAY_DATATYPE_MAP[ASSAY] || 'continuous';
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, ASSAY, null, vst, {}, dataType, 'ordered');
  return results.find((r) => r.name === 'Inter-Replicate Correlation');
}

const gen = (opts) => generate({ k: 1, sigmaS: 0, condNoiseRatio: 1, nSubjects: SUBJECTS, ...opts });

// ── flag-driver attribution ─────────────────────────────────────────────
// Re-derived from the result's own already-computed fields, following the
// branch order in interReplicateCorrelation.js:282-310. Nothing is recomputed
// from the data — this only names which comparison set the flag.
function attribute(res) {
  const pairs = res.details.filter((d) => d.source !== 'window');
  const adjPs = pairs.map((p) => (p.adjP != null ? p.adjP : 1));
  const minAdjP = adjPs.length ? Math.min(...adjPs) : 1;
  const scanP = res.windowScanP;
  const windowFlag = scanP < ALPHA.FLAG ? 'HIGH' : scanP < ALPHA.NOTE ? 'MODERATE' : null;
  const susp = pairs.filter((p) => p.suspicious);
  const bestSuspP = susp.length ? Math.min(...susp.map((p) => p.adjP)) : null;

  let arm = 'none', driverP = null;
  if (res.highSNRWarning) { arm = 'high-SNR'; }
  else if (susp.length) { arm = 'suspicious'; driverP = bestSuspP; }
  else if (minAdjP < ALPHA.FLAG) { arm = 'pair-promotion'; driverP = minAdjP; }
  // The windowed arm overrides whenever it outranks whatever the global arm set.
  const rank = (f) => (f === 'HIGH' ? 3 : f === 'MODERATE' ? 2 : f === 'LOW' ? 1 : 0);
  const globalFlagSoFar = arm === 'suspicious'
    ? (bestSuspP < ALPHA.FLAG ? 'HIGH' : bestSuspP < ALPHA.NOTE ? 'MODERATE' : 'LOW')
    : arm === 'pair-promotion' ? 'MODERATE' : 'LOW';
  if (!res.highSNRWarning && windowFlag && rank(windowFlag) > rank(globalFlagSoFar)) {
    arm = 'windowed-scan'; driverP = scanP;
  }
  if (arm === 'none' || (arm !== 'windowed-scan' && driverP === null)) driverP = Math.min(minAdjP, scanP);
  return { arm, driverP, minAdjP, scanP, minRawP: Math.min(...pairs.map((p) => (p.rawP == null ? 1 : p.rawP))),
    nPairs: pairs.length, nSusp: susp.length, windowFlag };
}

// ── reporting ───────────────────────────────────────────────────────────
const BINS = 10;
function hist(xs) {
  const c = new Array(BINS).fill(0);
  for (const x of xs) c[Math.min(BINS - 1, Math.floor(x * BINS))]++;
  return c;
}
function showHist(label, xs) {
  const c = hist(xs), n = xs.length || 1;
  const wide = Math.max(...c);
  console.log(`  ${label}   n=${xs.length}`);
  for (let i = 0; i < BINS; i++) {
    const lo = (i / BINS).toFixed(1), hi = ((i + 1) / BINS).toFixed(1);
    const bar = '#'.repeat(Math.round(40 * c[i] / (wide || 1)));
    console.log(`    [${lo},${hi})  ${String(c[i]).padStart(5)}  ${(100 * c[i] / n).toFixed(1).padStart(5)}%  ${bar}`);
  }
  const below = (a) => xs.filter((x) => x < a).length;
  console.log(`    tail: p<0.05 ${(100 * below(0.05) / n).toFixed(1)}%   ` +
    `p<0.01 (NOTE) ${(100 * below(0.01) / n).toFixed(1)}%   ` +
    `p<0.001 (FLAG) ${(100 * below(0.001) / n).toFixed(1)}%`);
  console.log('');
}

async function arm(label, opts) {
  const rows = [];
  const t0 = Date.now();
  for (let i = 0; i < DRAWS; i++) {
    const d = gen({ seed: SEED_BASE + i, ...opts });
    const res = ircDirect(d.rowGroupedCsv);
    const a = attribute(res);
    const pairs = res.details.filter((x) => x.source !== 'window');
    rows.push({
      flag: res.flag, primaryP: res.primaryP, ...a,
      // One FIXED family member across draws: the first replicate pair of the
      // first condition. Its p is the routing quantity — pooling members inside
      // a draw would mix in the dependence they share through the leave-one-out
      // baseline.
      memberRawP: pairs[0]?.rawP ?? null,
      memberAdjP: pairs[0]?.adjP ?? null,
      allRawP: pairs.map((p) => (p.rawP == null ? 1 : p.rawP)),
      nWindows: res.nWindowsTested, nPerm: res.nPerm,
    });
  }
  const ms = Date.now() - t0;
  const fired = rows.filter((r) => r.flag === 'HIGH' || r.flag === 'MODERATE');
  const high = rows.filter((r) => r.flag === 'HIGH').length;
  const mod = rows.filter((r) => r.flag === 'MODERATE').length;

  console.log(`\n=== ${label} ===`);
  console.log(`  ${DRAWS} draws, ${opts.nSubjects ?? SUBJECTS} subjects, ${opts.nReps ?? 6} replicates, ` +
    `effectFrac ${opts.effectFrac ?? 0.20}, ${(ms / 1000).toFixed(1)} s`);
  console.log(`  family size ${rows[0].nPairs} pairs, ${rows[0].nWindows} windows scanned, ` +
    `B = ${rows[0].nPerm}\n`);
  console.log(`  FIRE RATE  ${(100 * fired.length / DRAWS).toFixed(1)}%  ` +
    `(${high} HIGH, ${mod} MODERATE of ${DRAWS})`);
  if (fired.length) {
    console.log(`  tier split among flagged: ${(100 * high / fired.length).toFixed(0)}% HIGH ` +
      `(stated expectation ~20%)`);
  }
  const byArm = {};
  for (const r of fired) byArm[r.arm] = (byArm[r.arm] || 0) + 1;
  console.log(`  flag driver: ${Object.entries(byArm).map(([k, v]) => `${k} ${v}`).join(', ') || '(none)'}\n`);

  showHist('MEMBER p — one fixed replicate pair, uncorrected (rawP)',
    rows.map((r) => r.memberRawP).filter((x) => x != null));
  showHist('MEMBER p — all pairs pooled (dependent within a draw)',
    rows.flatMap((r) => r.allRawP));
  showHist('REPORTED p — primaryP = min(min adjP over pairs, scanP)',
    rows.map((r) => r.primaryP));
  showHist('ARM — min BH-adjusted p over the pair family',
    rows.map((r) => r.minAdjP));
  showHist('ARM — windowed permutation scan p',
    rows.map((r) => r.scanP));
  showHist('DRIVER p — the quantity whose threshold comparison set the flag',
    rows.map((r) => r.driverP).filter((x) => x != null));

  return { label, rows, fireRate: fired.length / DRAWS, high, mod };
}

// ── verify ──────────────────────────────────────────────────────────────
async function verify() {
  console.log('S362 — direct call vs engine, Inter-Replicate Correlation\n');
  let ok = true;
  for (let i = 0; i < 4; i++) {
    const d = gen({ seed: SEED_BASE + i, nReps: i % 2 ? 4 : 6 });
    const a = ircDirect(d.rowGroupedCsv);
    const b = await ircViaEngine(d.rowGroupedCsv);
    const same = a.flag === b.flag && a.primaryP === b.primaryP &&
      a.windowScanP === b.windowScanP && a.nSuspicious === b.nSuspicious &&
      a.nPairs === b.nPairs;
    if (!same) ok = false;
    console.log(`  seed ${SEED_BASE + i}, ${i % 2 ? 4 : 6} reps: ` +
      `direct ${a.flag} p=${a.primaryP.toPrecision(6)} scanP=${a.windowScanP.toPrecision(6)} | ` +
      `engine ${b.flag} p=${b.primaryP.toPrecision(6)} scanP=${b.windowScanP.toPrecision(6)}  ` +
      `${same ? 'MATCH' : '*** DIFFER ***'}`);
  }
  console.log(`\n  ${ok ? 'all match — the direct call is the shipped test' : 'MISMATCH — do not trust the arms below'}`);
  return ok;
}

// ── describe ────────────────────────────────────────────────────────────
// What the per-pair statistic actually looks like. The member p is built from
// zStat = (atanh(r) - atanh(looMean)) / se with se = sqrt(k/((k-1)(n-3))), read
// against a standard normal. This prints that z's own moments and tail rates,
// which is the direct statement of whether the analytic null fits.
async function describe(opts = {}) {
  const zs = [];
  let fired = 0, shown = 0;
  for (let i = 0; i < DRAWS; i++) {
    const d = gen({ nReps: 6, seed: SEED_BASE + i, ...opts });
    const res = ircDirect(d.rowGroupedCsv);
    const pairs = res.details.filter((x) => x.source !== 'window');
    for (const p of pairs) if (Number.isFinite(p.zStat)) zs.push(p.zStat);
    if (i < 3) console.log(`  seed ${SEED_BASE + i}: flag ${res.flag}  meanR ${res.meanR}  ` +
      `ICC ${res.iccPredicted}  nSuspicious ${res.nSuspicious}  n/pair ${pairs[0].n}  se ${pairs[0].se.toFixed(5)}`);
    if (res.flag !== 'LOW') {
      fired++;
      const s = pairs.filter((p) => p.suspicious).sort((a, b) => a.adjP - b.adjP)[0];
      if (s && shown++ < 6) console.log(`    FIRED ${res.flag}: ${s.condition} pair ${s.pair}  ` +
        `r ${s.r}  loo ${s.iccExpected}  excess ${s.excess}  z ${s.zStat.toFixed(2)}  ` +
        `rawP ${s.rawP.toExponential(2)}  adjP ${s.adjP.toExponential(2)}`);
    }
  }
  const m = zs.reduce((a, b) => a + b, 0) / zs.length;
  const sd = Math.sqrt(zs.reduce((a, b) => a + (b - m) ** 2, 0) / (zs.length - 1));
  const kurt = zs.reduce((a, b) => a + ((b - m) / sd) ** 4, 0) / zs.length;
  const frac = (t) => (100 * zs.filter((z) => Math.abs(z) > t).length / zs.length);
  console.log(`\n  zStat over ${zs.length} pair-members: mean ${m.toFixed(4)}  sd ${sd.toFixed(4)}  ` +
    `kurtosis ${kurt.toFixed(2)} (standard normal = 3)`);
  console.log(`  |z| > 1.96  ${frac(1.96).toFixed(1)}% (nominal 5%)   ` +
    `|z| > 2.58  ${frac(2.58).toFixed(2)}% (nominal 1%)   ` +
    `|z| > 3.29  ${frac(3.29).toFixed(2)}% (nominal 0.1%)`);
}

// ── Step A — is the error in the estimator or in the pooling? ────────────
// The standard error the test uses, se = sqrt(k/((k-1)(n-3))), carries three
// assumptions:
//
//   (a) Var(atanh r) = 1/(n-3) for the WINSORIZED correlation
//   (b) the other k-1 pairs are mutually independent, so the leave-one-out
//       mean has variance 1/((k-1)(n-3))
//   (c) a pair and its own leave-one-out mean are uncorrelated, so the
//       difference carries no covariance term
//
// Taking one fixed pair and measuring the spread of atanh(r) for that pair
// alone separates (a) from (b)/(c): no leave-one-out term is involved, no
// family, no division by se. Around 1/sqrt(n-3) and (a) holds; wider and (a)
// is where the error lives.
//
// The winsorized r is read off the shipped test's own result (`rawR` on the
// pair detail), not recomputed — the module's winsorize/winPearsonR are
// internal and reimplementing them here would measure a copy. Plain Pearson is
// computed on the same rows the test used.
function pearsonOf(a, b) {
  const n = a.length;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}
const sdOf = (xs) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const meanOf = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

async function stepA(opts = {}) {
  const nReps = opts.nReps ?? 6;
  const zW = [], zP = [], rW = [], rP = [];
  const zLoo = [], zDiff = [], zStat0 = [];
  const drawMeanZ = [], allZ = [];
  let n = null, kPairs = null, kSe = null, seUsed = null;

  for (let i = 0; i < DRAWS; i++) {
    const d = gen({ nReps, seed: SEED_BASE + i, ...opts });
    const { matrix, condCtx } = inputs(d.rowGroupedCsv);
    const validated = validateMatrix(matrix).matrix;
    const slices = condCtx.slices();
    const res = testPearsonUniformity(validated, slices,
      createPRNGFactory(validated)('Inter-Replicate Correlation'), 'ordered');
    const pairs = res.details.filter((x) => x.source !== 'window');
    const p0 = pairs[0];                       // slice 0, columns 0 and 1

    // Plain Pearson on exactly the rows the test kept for that pair.
    const m0 = slices[0].matrix;
    const a = [], b = [];
    for (let r = 0; r < m0.length; r++) if (m0[r][0] != null && m0[r][1] != null) { a.push(m0[r][0]); b.push(m0[r][1]); }
    const rPlain = pearsonOf(a, b);

    if (n === null) {
      n = p0.n; kPairs = pairs.length; seUsed = p0.se;
      // The k in the SE is the pair count WITHIN the condition, not the BH
      // family across conditions: se = sePair * sqrt(k/(k-1)) inverts to k.
      const ratio = (p0.se * Math.sqrt(n - 3)) ** 2;
      kSe = Math.round(ratio / (ratio - 1));
    }
    rW.push(p0.rawR); rP.push(rPlain);
    zW.push(p0.zObs);
    zLoo.push(p0.zNull);
    zDiff.push(p0.zObs - p0.zNull);
    zStat0.push(p0.zStat);
    zP.push(0.5 * Math.log((1 + rPlain) / (1 - rPlain)));

    // Step C item 1: the per-draw mean of the 30 zStat values. Draws are
    // independent of one another; the pairs inside a draw are not.
    const zs = pairs.map((p) => p.zStat).filter(Number.isFinite);
    drawMeanZ.push(meanOf(zs));
    allZ.push(...zs);
  }

  const fisher = 1 / Math.sqrt(n - 3);
  console.log(`\n=== STEP A — one fixed pair, ${DRAWS} draws, ${nReps} replicates ===`);
  console.log(`  pair: slice 0, columns 1-2.  n = ${n} complete rows, ` +
    `family k = ${kPairs} pairs, se used by the test = ${seUsed.toFixed(5)}`);
  console.log(`  Fisher reference 1/sqrt(n-3) = ${fisher.toFixed(5)}\n`);
  console.log('  correlation      mean r     sd of atanh(r)    ratio to Fisher');
  console.log(`  winsorized 5%    ${meanOf(rW).toFixed(4)}     ${sdOf(zW).toFixed(5)}           ${(sdOf(zW) / fisher).toFixed(3)}x`);
  console.log(`  plain Pearson    ${meanOf(rP).toFixed(4)}     ${sdOf(zP).toFixed(5)}           ${(sdOf(zP) / fisher).toFixed(3)}x`);
  console.log(`\n  predicted before measuring: winsorized ~0.1184 (assumption (a) fails),`);
  console.log(`                              ~0.0925 means (a) holds and (b) or (c) fails.`);

  // Decomposition. The SE assumes three things at once; each has its own
  // observable, so the whole thing can be read term by term rather than
  // inferred from the net error. All four quantities come off the shipped
  // result's own fields for the same fixed pair.
  const corr = pearsonOf(zW, zLoo);
  const assumedLoo = fisher / Math.sqrt(kSe - 1);
  console.log(`\n  decomposition, same fixed pair (k in the SE is the WITHIN-condition pair count = ${kSe};`);
  console.log(`  the BH family across conditions is ${kPairs}):`);
  console.log('    term                                   assumed     observed    ratio');
  console.log(`    sd of atanh(r)                         ${fisher.toFixed(5)}     ${sdOf(zW).toFixed(5)}     ${(sdOf(zW) / fisher).toFixed(3)}x`);
  console.log(`    sd of atanh(leave-one-out mean)        ${assumedLoo.toFixed(5)}     ${sdOf(zLoo).toFixed(5)}     ${(sdOf(zLoo) / assumedLoo).toFixed(3)}x`);
  console.log(`    correlation between the two            0.00000     ${corr.toFixed(5)}     —`);
  console.log(`    sd of the difference (the numerator)   ${seUsed.toFixed(5)}     ${sdOf(zDiff).toFixed(5)}     ${(sdOf(zDiff) / seUsed).toFixed(3)}x`);
  console.log(`    sd of zStat (numerator / se)           1.00000     ${sdOf(zStat0).toFixed(5)}     ${sdOf(zStat0).toFixed(3)}x`);

  // Step C item 1.
  const seMean = sdOf(drawMeanZ) / Math.sqrt(DRAWS);
  console.log(`\n  Step C(1) — zStat mean over ${allZ.length} pooled members: ${meanOf(allZ).toFixed(4)}`);
  console.log(`    independent units: ${DRAWS} draws. Between-draw sd of the per-draw mean z: ` +
    `${sdOf(drawMeanZ).toFixed(4)}`);
  console.log(`    standard error of the mean: ${seMean.toFixed(4)}  ->  ` +
    `${Math.abs(meanOf(allZ) / seMean).toFixed(1)} SE from zero`);
  return { nReps, n, kPairs, sdW: sdOf(zW), sdP: sdOf(zP), fisher };
}

// ── Step B — does the scale error move with k or with n? ─────────────────
// Reports the sd of zStat, not the fire rate. The rate is a coarse readout of
// the sd and cannot separate a 5% shift from a 30% one.
async function stepB(label, opts) {
  const allZ = [];
  let n = null, kPairs = null, seUsed = null;
  for (let i = 0; i < DRAWS; i++) {
    const d = gen({ nReps: 6, seed: SEED_BASE + i, ...opts });
    const res = ircDirect(d.rowGroupedCsv);
    const pairs = res.details.filter((x) => x.source !== 'window');
    if (n === null) { n = pairs[0].n; kPairs = pairs.length; seUsed = pairs[0].se; }
    for (const p of pairs) if (Number.isFinite(p.zStat)) allZ.push(p.zStat);
  }
  const sd = sdOf(allZ);
  console.log(`  ${label.padEnd(30)} n=${String(n).padStart(4)}  k=${String(kPairs).padStart(3)}  ` +
    `se=${seUsed.toFixed(5)}   sd(z) = ${sd.toFixed(4)}   implied effective n = ` +
    `${(3 + (n - 3) / (sd * sd)).toFixed(1)}`);
  return { label, n, kPairs, sd };
}

// ── Half 1 — separate marginal shape from correlation ────────────────────
// This half builds its OWN data. It is a statement about the standard-error
// formula and about nothing else — not about the tool's behaviour on any real
// file, and not about any deposit.
//
// 120 rows, 6 columns, exchangeable correlation, two marginal shapes. The
// latent field is g_j = sqrt(a)*u + sqrt(1-a)*e_j, so every pair of columns
// shares one common draw. For the log-normal arm the emitted value is
// exp(SIGMA_LN * g), and `a` is solved so the correlation ON THE OBSERVED
// SCALE hits the target — otherwise the two marginal arms would sit at
// different correlations and the comparison would be worthless.
//
// SIGMA_LN is matched to the real generator's marginal log-sd,
// sqrt(tau^2 + sigma^2) = sqrt(1.15^2 + 0.25^2), so the log-normal cell is a
// like-for-like stand-in for the marginal the fixture actually carries.
const SIGMA_LN = Math.sqrt(1.15 ** 2 + 0.25 ** 2);

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function normalDraw(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
// Latent exchangeable correlation that lands the OBSERVED-scale Pearson
// correlation on `target`. Identity for the normal arm; for the log-normal arm
// corr(exp(s*gi), exp(s*gj)) = (exp(a*s^2) - 1) / (exp(s^2) - 1).
function latentCorr(target, marginal) {
  if (marginal === 'normal') return target;
  const s2 = SIGMA_LN ** 2;
  return Math.log(1 + target * (Math.exp(s2) - 1)) / s2;
}
function synthMatrix(rand, nRows, nCols, target, marginal) {
  const a = latentCorr(target, marginal);
  const wu = Math.sqrt(a), we = Math.sqrt(1 - a);
  const m = [];
  for (let r = 0; r < nRows; r++) {
    const u = normalDraw(rand);
    const row = [];
    for (let c = 0; c < nCols; c++) {
      const g = wu * u + we * normalDraw(rand);
      row.push(marginal === 'normal' ? g : Math.exp(SIGMA_LN * g));
    }
    m.push(row);
  }
  return m;
}

// One synthetic cell, run through the SHIPPED test. Returns both the
// standard-error terms (Half 1's question — what the formula does) and the
// verdict (Half 2 item 1's question — what the tool does).
function synthCell(marginal, rho, nRows, nCols = 6) {
  const fisher = 1 / Math.sqrt(nRows - 3);
  const kSe = (nCols * (nCols - 1)) / 2;
  const assumedLoo = fisher / Math.sqrt(kSe - 1);
  const zObs = [], zNull = [], rs = [], zStat = [], allZ = [];
  let high = 0, mod = 0, highSNR = 0;
  const arms = {};
  const reportedP = [];
  for (let i = 0; i < DRAWS; i++) {
    const rand = mulberry32(SEED_BASE * 977 + i * 7919 + Math.round(rho * 1000) * 31 +
      (marginal === 'normal' ? 0 : 5) + nRows * 13);
    const m = synthMatrix(rand, nRows, nCols, rho, marginal);
    const validated = validateMatrix(m).matrix;
    const res = testPearsonUniformity(validated, null,
      createPRNGFactory(validated)('Inter-Replicate Correlation'), 'ordered');
    const pairs = res.details.filter((x) => x.source !== 'window');
    const p0 = pairs[0];
    if (res.highSNRWarning) highSNR++;
    if (res.flag === 'HIGH') high++; else if (res.flag === 'MODERATE') mod++;
    if (res.flag !== 'LOW') { const a = attribute(res); arms[a.arm] = (arms[a.arm] || 0) + 1; }
    reportedP.push(res.primaryP);
    for (const p of pairs) if (Number.isFinite(p.zStat)) allZ.push(p.zStat);
    if (p0.zNull === null) continue;
    rs.push(p0.rawR); zObs.push(p0.zObs); zNull.push(p0.zNull); zStat.push(p0.zStat);
  }
  return {
    marginal, rho, nRows, kSe, meanR: meanOf(rs),
    A: sdOf(zObs) / fisher, B: sdOf(zNull) / assumedLoo, C: pearsonOf(zObs, zNull),
    sdZfixed: sdOf(zStat), sdZpooled: sdOf(allZ), meanZpooled: meanOf(allZ),
    high, mod, highSNR, arms, reportedP, fisher, assumedLoo,
  };
}

async function half1() {
  const nRows = 120, nCols = 6;
  const fisher = 1 / Math.sqrt(nRows - 3);
  const kSe = (nCols * (nCols - 1)) / 2;          // 15 pairs, one group
  const assumedLoo = fisher / Math.sqrt(kSe - 1);

  console.log('\n=== HALF 1 — synthetic data, marginal shape against correlation ===');
  console.log(`  ${nRows} rows x ${nCols} columns, one group, k = ${kSe} pairs, ${DRAWS} draws per cell.`);
  console.log(`  Winsorized correlation throughout, because that is what ships.`);
  console.log(`  log-normal arm: exp(${SIGMA_LN.toFixed(4)} * g), latent correlation solved so the`);
  console.log(`  OBSERVED-scale correlation matches the normal arm's target.`);
  console.log(`  Fisher reference 1/sqrt(n-3) = ${fisher.toFixed(5)};  ` +
    `leave-one-out reference 1/sqrt((k-1)(n-3)) = ${assumedLoo.toFixed(5)}\n`);
  console.log('  THIS IS A STATEMENT ABOUT THE FORMULA, NOT ABOUT ANY REAL FILE.\n');

  console.log('  marginal      rho    mean r     (a) sd atanh(r)   (b) sd atanh(loo)   (c) corr   sd(z)');
  const out = [];
  for (const marginal of ['normal', 'log-normal']) {
    for (const rho of [0, 0.5, 0.93]) {
      const zObs = [], zNull = [], rs = [], zStat = [];
      for (let i = 0; i < DRAWS; i++) {
        // One stream per cell per draw, so a cell is reproducible on its own.
        const rand = mulberry32(SEED_BASE * 977 + i * 7919 + Math.round(rho * 1000) * 31 + (marginal === 'normal' ? 0 : 5));
        const m = synthMatrix(rand, nRows, nCols, rho, marginal);
        const validated = validateMatrix(m).matrix;
        const res = testPearsonUniformity(validated, null,
          createPRNGFactory(validated)('Inter-Replicate Correlation'), 'ordered');
        const p0 = res.details.filter((x) => x.source !== 'window')[0];
        if (p0.zNull === null) continue;
        rs.push(p0.rawR); zObs.push(p0.zObs); zNull.push(p0.zNull); zStat.push(p0.zStat);
      }
      const A = sdOf(zObs) / fisher, B = sdOf(zNull) / assumedLoo, C = pearsonOf(zObs, zNull);
      out.push({ marginal, rho, meanR: meanOf(rs), A, B, C, sdZ: sdOf(zStat) });
      console.log(`  ${marginal.padEnd(12)} ${String(rho).padStart(5)}   ${meanOf(rs).toFixed(4)}     ` +
        `${A.toFixed(3)}x            ${B.toFixed(3)}x             ${C.toFixed(3)}     ${sdOf(zStat).toFixed(3)}`);
    }
  }

  const ctrl = out.find((o) => o.marginal === 'normal' && o.rho === 0);
  console.log(`\n  CONTROL, rho = 0 with normal marginals. Predicted 1.0 / 1.0 / 0.0.`);
  console.log(`    observed ${ctrl.A.toFixed(3)} / ${ctrl.B.toFixed(3)} / ${ctrl.C.toFixed(3)}`);
  return out;
}

// ── Half 2 item 1 — turn the conservative arm into a verdict ─────────────
// Half 1 measured the formula. This measures the tool: the same synthetic
// cells, through the shipped test, reporting the flag rather than the terms.
function item1(nRows = 120) {
  console.log(`\n=== HALF 2 ITEM 1 — the verdict on synthetic data, ${nRows} rows ===`);
  console.log(`  6 columns, one group so the BH family is 15 pairs (the fixture's is 30 across`);
  console.log(`  two conditions). ${DRAWS} draws per cell. Still a statement about the test, not`);
  console.log(`  about any real file.\n`);
  console.log('  marginal      rho    mean r    fire     HIGH  MOD   sd(z) engine   Half 1 formula   highSNR');
  const cells = [];
  for (const marginal of ['normal', 'log-normal']) {
    const c = synthCell(marginal, 0.93, nRows);
    cells.push(c);
    const fire = (100 * (c.high + c.mod) / DRAWS).toFixed(1) + '%';
    const ref = marginal === 'normal' ? '0.730' : '1.244';
    console.log(`  ${marginal.padEnd(12)}  0.93   ${c.meanR.toFixed(4)}   ${fire.padStart(6)}   ` +
      `${String(c.high).padStart(4)}  ${String(c.mod).padStart(3)}   ${c.sdZpooled.toFixed(4)}` +
      `          ${ref}            ${c.highSNR}`);
  }
  for (const c of cells) {
    const n = c.reportedP.length;
    const below = (a) => (100 * c.reportedP.filter((x) => x < a).length / n).toFixed(1);
    console.log(`\n  ${c.marginal}: reported p tail  <0.05 ${below(0.05)}%  <0.01 ${below(0.01)}%  <0.001 ${below(0.001)}%`);
    console.log(`    flag driver: ${Object.entries(c.arms).map(([k, v]) => `${k} ${v}`).join(', ') || '(nothing fired)'}`);
  }
  return cells;
}

// ── Half 2 item 3 — the transform order ─────────────────────────────────
// :109 takes atanh of the MEAN of the other r values. Recompute z the other
// way — the mean of their atanh values — on the same fixture draws, and
// rebuild the flag from it. Only the null's transform order changes: the
// effect-size `excess` gate stays on the r scale, exactly as it ships, and the
// windowed arm is untouched because it never sees atanh.
async function item3() {
  const { bhFDR } = await import('../../src/stats/primitives.js');
  const { zToP } = await import('../../src/stats/primitives.js');
  const atanh = (r) => 0.5 * Math.log((1 + r) / (1 - r));
  const shipZ = [], altZ = [];
  let shipHigh = 0, shipMod = 0, altHigh = 0, altMod = 0;
  // The two arms run on the SAME draws, so the comparison is paired and the
  // discordant count is what carries the uncertainty — not the two rates.
  let onlyShip = 0, onlyAlt = 0;

  for (let i = 0; i < DRAWS; i++) {
    const d = gen({ nReps: 6, seed: SEED_BASE + i });
    const res = ircDirect(d.rowGroupedCsv);
    const pairs = res.details.filter((x) => x.source !== 'window');
    if (res.flag === 'HIGH') shipHigh++; else if (res.flag === 'MODERATE') shipMod++;
    for (const p of pairs) if (Number.isFinite(p.zStat)) shipZ.push(p.zStat);

    // Rebuild the per-pair z with the mean taken on the atanh scale. Pairs are
    // grouped by condition, and the leave-one-out mean is within-condition.
    const byCond = new Map();
    pairs.forEach((p, idx) => {
      if (!byCond.has(p.condition)) byCond.set(p.condition, []);
      byCond.get(p.condition).push(idx);
    });
    const rawP2 = new Array(pairs.length).fill(1);
    const z2 = new Array(pairs.length).fill(null);
    for (const idxs of byCond.values()) {
      const zs = idxs.map((j) => atanh(pairs[j].rawR));
      for (let a = 0; a < idxs.length; a++) {
        const others = zs.filter((_, b) => b !== a);
        const zNullAlt = meanOf(others);
        const j = idxs[a];
        z2[j] = (atanh(pairs[j].rawR) - zNullAlt) / pairs[j].se;
        rawP2[j] = zToP(z2[j]);
      }
    }
    for (const z of z2) if (Number.isFinite(z)) altZ.push(z);

    // Rebuild the flag from the recomputed family. Same branch order as
    // interReplicateCorrelation.js:282-310; `excess` and scanP are unchanged.
    const adj2 = bhFDR(rawP2);
    const susp = pairs.map((p, j) => !res.highSNRWarning && adj2[j] < ALPHA.FLAG &&
      parseFloat(p.excess) > (p.n >= 500 ? 0.05 : 0.01));
    let flag2 = 'LOW';
    if (res.highSNRWarning) flag2 = 'LOW';
    else if (susp.some(Boolean)) {
      const best = Math.min(...adj2.filter((_, j) => susp[j]));
      flag2 = best < ALPHA.FLAG ? 'HIGH' : best < ALPHA.NOTE ? 'MODERATE' : 'LOW';
    } else if (adj2.some((a) => a < ALPHA.FLAG)) flag2 = 'MODERATE';
    const scanP = res.windowScanP;
    const winFlag = scanP < ALPHA.FLAG ? 'HIGH' : scanP < ALPHA.NOTE ? 'MODERATE' : null;
    const rank = (f) => (f === 'HIGH' ? 3 : f === 'MODERATE' ? 2 : 1);
    if (!res.highSNRWarning && winFlag && rank(winFlag) > rank(flag2)) flag2 = winFlag;
    if (flag2 === 'HIGH') altHigh++; else if (flag2 === 'MODERATE') altMod++;
    const firedShip = res.flag !== 'LOW', firedAlt = flag2 !== 'LOW';
    if (firedShip && !firedAlt) onlyShip++;
    if (!firedShip && firedAlt) onlyAlt++;
  }

  console.log(`\n=== HALF 2 ITEM 3 — atanh of the mean, against the mean of the atanh ===`);
  console.log(`  ${DRAWS} fixture draws, 6 replicates. Only the null's transform order changes.\n`);
  console.log(`  as shipped   mean z ${meanOf(shipZ).toFixed(4)}   sd ${sdOf(shipZ).toFixed(4)}   ` +
    `fire ${(100 * (shipHigh + shipMod) / DRAWS).toFixed(1)}%  (${shipHigh} HIGH, ${shipMod} MOD)`);
  console.log(`  atanh first  mean z ${meanOf(altZ).toFixed(4)}   sd ${sdOf(altZ).toFixed(4)}   ` +
    `fire ${(100 * (altHigh + altMod) / DRAWS).toFixed(1)}%  (${altHigh} HIGH, ${altMod} MOD)`);
  console.log(`\n  paired comparison, same ${DRAWS} draws: ${onlyShip} fired only as shipped, ` +
    `${onlyAlt} fired only under the recomputation`);
  console.log(`\n  predicted in advance: bias about 0.145 in z units; fire rate moves by only a`);
  console.log(`  few percent of itself.`);
}

// ── main ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--half1')) await half1();
if (args.includes('--item1')) item1(120);
if (args.includes('--item3')) await item3();
if (args.includes('--item4')) {
  console.log(`\n=== HALF 2 ITEM 4 — the same two cells at n = 480 ===\n`);
  console.log('  marginal      rho   n     mean r    (a)      (b)      (c)      sd(z)');
  for (const nRows of [120, 480]) {
    for (const marginal of ['normal', 'log-normal']) {
      const c = synthCell(marginal, 0.93, nRows);
      console.log(`  ${marginal.padEnd(12)}  0.93  ${String(nRows).padStart(3)}   ${c.meanR.toFixed(4)}   ` +
        `${c.A.toFixed(3)}x   ${c.B.toFixed(3)}x   ${c.C.toFixed(3)}    ${c.sdZfixed.toFixed(3)}`);
    }
  }
}
if (args.includes('--verify')) await verify();
if (args.includes('--describe')) await describe();
if (args.includes('--stepa')) await stepA();
if (args.includes('--stepb')) {
  console.log(`\n=== STEP B — sd of zStat, ${DRAWS} draws per row ===\n`);
  console.log('  replicate count (moves k, holds n):');
  const r4 = await stepB('4 replicates', { nReps: 4 });
  const r6 = await stepB('6 replicates', { nReps: 6 });
  console.log(`    observed sd ratio 4-rep / 6-rep = ${(r4.sd / r6.sd).toFixed(4)}`);
  console.log(`    k/(k-1) factor predicts sqrt((6/5)/(15/14)) = ${Math.sqrt((6 / 5) / (15 / 14)).toFixed(4)}`);
  console.log('\n  subject count (moves n, holds k):');
  const rows = [];
  for (const S of [30, 60, 120, 240, 480]) rows.push(await stepB(`${S} subjects`, { nSubjects: S }));
  const flat = rows.map((r) => r.sd);
  console.log(`    sd(z) across subject counts: ${flat.map((x) => x.toFixed(4)).join('  ')}`);
  console.log(`    spread ${(Math.max(...flat) / Math.min(...flat)).toFixed(3)}x  ` +
    `(flat means the n-3 term is right and the error is a constant multiplier)`);
}

const out = [];
if (args.includes('--base')) out.push(await arm('BASE — 6 replicates, effect present (generator default)', { nReps: 6 }));
if (args.includes('--noeffect')) out.push(await arm('NO EFFECT — 6 replicates, effectFrac = 0', { nReps: 6, effectFrac: 0 }));
if (args.includes('--reps')) {
  out.push(await arm('4 replicates, effect present', { nReps: 4 }));
  out.push(await arm('4 replicates, effectFrac = 0', { nReps: 4, effectFrac: 0 }));
  out.push(await arm('6 replicates, effect present', { nReps: 6 }));
  out.push(await arm('6 replicates, effectFrac = 0', { nReps: 6, effectFrac: 0 }));
}
if (args.includes('--subjects')) {
  for (const S of [60, 120, 240]) out.push(await arm(`${S} subjects, 6 replicates`, { nReps: 6, nSubjects: S }));
}

if (out.length > 1) {
  console.log('\n=== summary ===');
  console.log('  arm'.padEnd(52) + 'fire    HIGH  MOD');
  for (const o of out) {
    console.log(`  ${o.label.padEnd(50)}${(100 * o.fireRate).toFixed(1).padStart(5)}%  ${String(o.high).padStart(4)}  ${String(o.mod).padStart(3)}`);
  }
}
if (!args.length) console.log('pass --verify, --base, --noeffect, --reps and/or --subjects');
