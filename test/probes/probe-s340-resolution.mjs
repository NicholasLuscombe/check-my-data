/* S340 — can each resampling test's p-grid resolve the thresholds it is judged
   against?

   A permutation p cannot resolve a threshold finer than its own grid step. The
   requirement is arithmetic; no property of the data enters it. This walks every
   resampling test, derives its achievable value set from the formula as written
   in source, and counts how many values fall below each threshold that test can
   actually reach.

   Three things make the question less uniform than it looks, all checked here
   rather than assumed:

     - The flag ladder has TWO thresholds, not three. flagFromP compares against
       ALPHA.FLAG = 0.001 and ALPHA.NOTE = 0.01. 0.05 appears inside several
       tests as a sub-unit significance marker and in display prose, but never
       sets a tier.
     - On per-condition routing the value flagFromP receives is NOT the reported
       primaryP. aggregation.js corrects the worst-group arm with Šidák, so the
       flag is decided on 1-(1-p)^G. That tightens the threshold the raw grid
       must resolve, by a factor of roughly G.
     - Where the reported p is a BH-adjusted minimum, the value sits on the raw
       grid multiplied by m/j for whichever rank j achieved the minimum. That
       multiplier is data-dependent, so it is measured here, not assumed.

     node test/probes/probe-s340-resolution.mjs

   Reads src/, writes nothing there. */
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { ALPHA } = await import('../../src/constants/thresholds.js');
const { sidakAdjust } = await import('../../src/stats/primitives.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';
const HIGH = ALPHA.FLAG, MOD = ALPHA.NOTE;

/* ── Per-test arithmetic, read from source ────────────────────────────────
   formula: how the raw per-unit p is built, quoted with its line.
   values(B): the achievable raw value set, ascending, as a generator of the
              first few — enough to count below a threshold.
   counts:   every count the test can take, with the branch condition.        */
const TESTS = {
  "Benford's Law (First Digit)": {
    file: 'src/tests/benford.js', line: 75,
    formula: 'pMAD = madExceedCount / N_SIM_BENFORD',
    kind: 'k/B', counts: [[5000, 'fixed']],
    reported: 'the raw simulation p, no adjustment',
  },
  "Benford's Law (Second Digit)": {
    file: 'src/tests/benford2.js', line: 115,
    formula: 'const pMAD = madExceedCount / N_SIM',
    kind: 'k/B', counts: [[5000, 'fixed']],
    reported: 'the raw simulation p, no adjustment',
  },
  'Residual Spike Correlation': {
    file: 'src/tests/residualSpikeCorrelation.js', line: 171,
    formula: 'const permP = (permExceed + 1) / (N_PERM + 1)',
    kind: '(k+1)/(B+1)', counts: [[999, 'fixed']],
    reported: 'the raw permutation p, no adjustment',
  },
  'Regional Noise Homogeneity': {
    file: 'src/tests/regionalNoise.js', line: 174,
    formula: 'const scanP = (exceedCount + 1) / (N_PERM + 1)',
    kind: '(k+1)/(B+1)',
    counts: [[4999, 'validRows <= 100'], [499, 'otherwise']],
    reported: 'the raw scan-max permutation p, no adjustment',
  },
  'Constant-Offset Blocks': {
    file: 'src/tests/constantOffset.js', line: 240,
    formula: 'const permP = (permExceed + 1) / (N_PERM + 1)',
    kind: '(k+1)/(B+1)',
    counts: [[999, 'nR <= 1000'], [499, 'nR > 1000'], [199, 'nR > 10000']],
    reported: 'min over 2 passes of the raw permutation p — still on the raw grid',
  },
  'Excess Kurtosis': {
    file: 'src/tests/kurtosis.js', line: 347,
    formula: 'kurtP = (nExceed + 1) / (simKurts.length + 1)   // adP likewise, line 359',
    kind: '(k+1)/(B+1)',
    counts: [[1999, 'full simulation'], [50, 'pilot early-exit gate fires']],
    reported: 'the raw simulation p (A-D at nC<=3, kurtosis otherwise)',
  },
  'Windowed Autocorrelation': {
    file: 'src/tests/windowedAutocorrelation.js', line: 140,
    formula: 'const rawP = (exceed[w] + 1) / (N_PERM + 1)',
    kind: '(k+1)/(B+1)',
    counts: [[999, 'nR <= 500'], [499, 'nR <= 5000'], [199, 'nR > 5000']],
    reported: 'min over pair x window units of the per-pair BH-adjusted p',
    bhAdjusted: true,
  },
  'Cross-Condition Consistency': {
    file: 'src/tests/crossConditionConsistency.js', line: 167,
    formula: 'per-unit permutation p, then BH-FDR per stage',
    kind: '(k+1)/(B+1)',
    counts: [[999, 'maxN <= 1000'], [499, 'maxN <= 10000'], [199, 'maxN > 10000']],
    reported: 'min over property x pair units of the BH-adjusted p, 3 stages',
    bhAdjusted: true,
  },
  'Blocked Mahalanobis': {
    file: 'src/tests/blockedMahalanobis.js', line: 588,
    formula: 'const rawMu = (ws.exceedTsq + 1) / (N_PERM + 1)',
    kind: '(k+1)/(B+1)',
    counts: [[4999, 'maxN <= 500'], [999, 'otherwise']],
    reported: 'min over 2 x nCond units of the BH-adjusted p',
    bhAdjusted: true,
  },
  'Entropy / Zipf Analysis': {
    file: 'src/tests/entropyTest.js', line: 103,
    formula: 'const rawP = Math.min(1.0, Math.min(pLow, pHigh) * 2)   // pLow = countLow/(1+B), countLow starts at 1',
    kind: '2(k+1)/(B+1)',
    counts: [[999, 'fixed']],
    reported: 'min over columns of the BH-adjusted p',
    bhAdjusted: true,
  },
  'Column Goodness-of-Fit': {
    file: 'src/tests/columnGof.js', line: 195,
    formula: 'const rawP = Math.min(1, Math.min(pLow, pHigh) * 2)   // pLow = cLow/(1+B), cLow starts at 1',
    kind: '2(k+1)/(B+1)',
    counts: [[2000, 'fixed']],
    reported: 'min over columns of the BH-adjusted p',
    bhAdjusted: true,
  },
  'Inter-Replicate Correlation': {
    file: 'src/tests/interReplicateCorrelation.js', line: 262,
    formula: 'scanP=(exceedCount+1)/(N_PERM+1)',
    kind: '(k+1)/(B+1)',
    counts: [[999, 'maxN <= 100'], [499, 'maxN <= 1000'], [199, 'maxN > 1000']],
    reported: 'min of an ANALYTIC per-pair BH arm and the permutation scan — the reported value is often off-grid',
    mixedArms: true,
  },
  'Runs Test': {
    file: 'src/tests/runs.js', line: 240,
    formula: 'scanP=(exceedCount+1)/(N_PERM+1)',
    kind: '(k+1)/(B+1)',
    counts: [[999, 'maxN <= 100'], [499, 'maxN <= 1000'], [199, 'maxN > 1000']],
    reported: 'min of 3 arms, two ANALYTIC and one permutation — often off-grid',
    mixedArms: true,
  },
  'LOESS Residual Analysis': {
    file: 'src/tests/loessResidual.js', line: 213,
    formula: 'const scanP = (exceedScan + 1) / (N_PERM + 1)   // cusumP likewise',
    kind: '(k+1)/(B+1)',
    counts: [[4999, 'pooled, validRows <= 100'], [499, 'pooled, otherwise'], [499, 'per-pair, PP_PERM fixed']],
    reported: 'min of the pooled scan/CUSUM p and up to 30 per-pair BH-adjusted p',
    bhAdjusted: true,
  },
};

/** Achievable raw values below `limit`, from the formula kind. */
function valuesBelow(kind, B, limit) {
  const out = [];
  if (kind === 'k/B') {
    for (let k = 0; k / B < limit && k <= B; k++) out.push(k / B);
  } else if (kind === '(k+1)/(B+1)') {
    for (let k = 0; (k + 1) / (B + 1) < limit && k <= B; k++) out.push((k + 1) / (B + 1));
  } else if (kind === '2(k+1)/(B+1)') {
    for (let k = 0; Math.min(1, 2 * (k + 1) / (B + 1)) < limit && k <= B; k++) out.push(2 * (k + 1) / (B + 1));
  }
  return out;
}
const stepOf = (kind, B) => kind === 'k/B' ? 1 / B : kind === '2(k+1)/(B+1)' ? 2 / (B + 1) : 1 / (B + 1);
const minOf = (kind, B) => kind === 'k/B' ? 0 : kind === '2(k+1)/(B+1)' ? 2 / (B + 1) : 1 / (B + 1);
const fmt = v => v === 0 ? '0' : v < 1e-4 ? v.toExponential(3) : String(Number(v.toPrecision(5)));

// ── Run the battery once, to measure counts, routing and reported values ──
function prepare(file, expected) {
  const raw = preprocessRaw(Papa.default.parse(readFileSync(join(FIXTURES, file), 'utf-8'), { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  return { matrix, rawMatrix, condCtx, assay, vst: detectVST(matrix, assay),
    dataType: ASSAY_DATATYPE_MAP[assay] || 'continuous',
    rowSemantics: suggestRowSemantics({ assay, longFormatDetected: !!detectLongFormat(headers, data) }).value || 'ordered' };
}

const observed = {};   // test → [{ file, p, flag, B, groups, sidak }]
for (const [file, exp] of Object.entries(EXPECTED)) {
  const p = prepare(file, exp);
  const results = await runFullAnalysis(p.matrix, p.rawMatrix, p.condCtx, p.assay, null, p.vst, {}, p.dataType, p.rowSemantics);
  for (const r of results) {
    if (!TESTS[r.name]) continue;
    if (!observed[r.name]) observed[r.name] = [];
    observed[r.name].push({
      file, flag: r.flag,
      p: (typeof r.primaryP === 'number' && isFinite(r.primaryP)) ? r.primaryP : null,
      B: [r.nPerm, r.nSimulations, r.B].find(v => typeof v === 'number' && isFinite(v)) ?? null,
      groups: r.groupsAssessed ?? null,
      sidak: r.multiplicityCorrected === true,
    });
  }
  process.stderr.write(`ran ${file}\n`);
}

// ── STEP 1 — the resolution table ──
console.log('S340 STEP 1 — resolution of every resampling test against the thresholds it is judged on');
console.log(`Ladder: flagFromP (thresholds.js:38) compares against HIGH p < ${HIGH} and MODERATE p < ${MOD}. Two thresholds, not three.`);
console.log('"below X" counts DISTINCT achievable raw values strictly below X, from the formula as written.\n');

const rows = [];
for (const [name, T] of Object.entries(TESTS)) {
  const obs = observed[name] || [];
  const seenB = [...new Set(obs.map(o => o.B).filter(v => v != null))].sort((a, b) => b - a);
  const sidakFixtures = obs.filter(o => o.sidak);
  console.log('─'.repeat(96));
  console.log(`${name}`);
  console.log(`  formula   ${T.formula}`);
  console.log(`            ${T.file}:${T.line}`);
  console.log(`  reported  ${T.reported}`);
  console.log(`  counts observed on the batch: ${seenB.length ? seenB.join(', ') : 'none published'}`);
  console.log(`  ${'count'.padStart(7)} ${'branch'.padEnd(28)} ${'step'.padStart(11)} ${'min p'.padStart(11)} ${'< 0.01'.padStart(8)} ${'< 0.001'.padStart(9)}`);
  for (const [B, cond] of T.counts) {
    const step = stepOf(T.kind, B), lo = minOf(T.kind, B);
    const nMod = valuesBelow(T.kind, B, MOD).length;
    const nHigh = valuesBelow(T.kind, B, HIGH).length;
    const note = nHigh === 0
      ? (T.mixedArms ? '   no HIGH FROM THIS ARM' : '   HIGH UNREACHABLE')
      : nHigh <= 2 ? '   thin' : '';
    console.log(`  ${String(B).padStart(7)} ${cond.padEnd(28)} ${fmt(step).padStart(11)} ${fmt(lo).padStart(11)} ${String(nMod).padStart(8)} ${String(nHigh).padStart(9)}${note}`);
    rows.push({ name, B, cond, step, lo, nMod, nHigh, kind: T.kind });
  }
  if (sidakFixtures.length) {
    const G = [...new Set(sidakFixtures.map(o => o.groups).filter(Boolean))];
    console.log(`  Šidák: the flag is decided on 1-(1-p)^G, not on the reported p — fired on ${sidakFixtures.length} fixture(s), G = ${G.join('/') || '?'}`);
    for (const g of G) {
      const tMod = 1 - Math.pow(1 - MOD, 1 / g), tHigh = 1 - Math.pow(1 - HIGH, 1 / g);
      console.log(`    at G=${g} the raw grid must resolve ${fmt(tMod)} for MODERATE and ${fmt(tHigh)} for HIGH:`);
      for (const [B] of T.counts) {
        console.log(`      B=${String(B).padStart(5)}  below MOD-equivalent ${String(valuesBelow(T.kind, B, tMod).length).padStart(4)}   below HIGH-equivalent ${String(valuesBelow(T.kind, B, tHigh).length).padStart(4)}`);
      }
    }
  }
  // Empirical grid check — is the reported value on the raw grid, and if not,
  // by what multiplier? That multiplier is BH's m/j and is data-dependent.
  if (obs.length) {
    const mults = new Map();
    for (const o of obs) {
      if (o.p == null || o.B == null) continue;
      const step = stepOf(T.kind, o.B);
      const ratio = o.p / step;
      const near = Math.round(ratio);
      const onGrid = Math.abs(ratio - near) < 1e-6;
      const key = onGrid ? `x${near <= 0 ? near : ''}on-grid` : 'off-grid';
      mults.set(onGrid ? 'on the raw grid' : 'off the raw grid', (mults.get(onGrid ? 'on the raw grid' : 'off the raw grid') || 0) + 1);
    }
    if (mults.size) console.log(`  observed reported values: ${[...mults].map(([k, v]) => `${v} ${k}`).join(', ')}`);
    // Measured reachability: whichever arm produced it, did the test ever land
    // HIGH on the batch? For the mixed-arm tests this is the only honest check,
    // because their analytic arm is off the permutation grid entirely.
    const highs = obs.filter(o => o.flag === 'HIGH');
    const mods = obs.filter(o => o.flag === 'MODERATE');
    console.log(`  observed on the batch: ${highs.length} HIGH, ${mods.length} MODERATE` +
      (highs.length ? ` — HIGH reached on ${highs.map(h => `${h.file.split('-')[0]} (p=${fmt(h.p)})`).slice(0, 4).join(', ')}` : ''));
    if (T.bhAdjusted) {
      console.log('  NOTE: the reported value is a BH-adjusted minimum, so the raw counts above are the BEST CASE.');
      console.log('        BH multiplies the driving unit by m/j; the floor is unchanged but typical spacing is coarser.');
    }
    if (T.mixedArms) {
      console.log('  NOTE: an ANALYTIC arm shares the minimum, so this test can reach HIGH off the grid entirely.');
      console.log('        The grid governs only the permutation arm\'s contribution.');
    }
  }
}

// ── STEP 2 — minimum B ──
console.log('\n' + '='.repeat(96));
console.log('S340 STEP 2 — smallest count putting at least 5 achievable values below the tightest threshold the test can reach');
console.log('5 is a working figure: it means the threshold is not decided by a single grid position.\n');
const CANDIDATES = [199, 499, 999, 1999, 2000, 4999, 9999, 19999, 49999, 99999];
console.log(`${'test'.padEnd(32)} ${'now'.padStart(6)} ${'<0.001 now'.padStart(11)} ${'min B for 5'.padStart(12)} ${'<0.001 there'.padStart(13)}  status`);
const needs = [];
for (const [name, T] of Object.entries(TESTS)) {
  const nowB = Math.max(...T.counts.map(c => c[0]));
  const nowHigh = valuesBelow(T.kind, nowB, HIGH).length;
  let minB = null;
  for (const B of CANDIDATES) { if (valuesBelow(T.kind, B, HIGH).length >= 5) { minB = B; break; } }
  const thereHigh = minB ? valuesBelow(T.kind, minB, HIGH).length : 0;
  const status = nowHigh >= 5 ? 'CLEARS at its current best count'
    : nowHigh === 0 ? 'cannot reach HIGH at this count'
    : `thin — ${nowHigh} value(s) below 0.001`;
  console.log(`${name.padEnd(32)} ${String(nowB).padStart(6)} ${String(nowHigh).padStart(11)} ${String(minB ?? '—').padStart(12)} ${String(thereHigh).padStart(13)}  ${status}`);
  if (nowHigh < 5) needs.push({ name, nowB, nowHigh, minB, kind: T.kind });
}
console.log(`\n${needs.length} of ${Object.keys(TESTS).length} resampling tests do not put 5 values below 0.001 at their current best count.`);
