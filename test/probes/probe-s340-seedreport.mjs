/* S340 step 2 — read the seed sweep.

   usage: node test/probes/probe-s340-seedreport.mjs

   Reports, per test x fixture: the p at every seed, the spread, the flags, and
   whether the flag is constant. Then the two summaries that matter — every cell
   whose flag is not constant across seeds, and every single-p cell whose
   observed spread exceeds the Monte Carlo standard error its resample count
   implies.

   CLASS comes from reading each test at source (S340 step 1), not from output:
     'single'   one permutation / simulation p, no minimum taken. sd is
                comparable to sqrt(p(1-p)/B) and the ratio is meaningful.
     'min'      a minimum over units (pairs / windows / columns / passes),
                usually after a multiplicity adjustment. Expected wider than
                the single-p figure; no ratio is computed for these.
     'analytic' no resampling at all. Expected spread exactly zero.
   B_RULE records where the resample count comes from when the result does not
   publish one. */
import { readFileSync } from 'fs';

const S = JSON.parse(readFileSync('test/probes/out-s340-seed/sweep.json', 'utf8'));

const CLASS = {
  "Benford's Law (First Digit)":   ['single',   'simulation p = exceedCount/5000, no smoothing'],
  "Benford's Law (Second Digit)":  ['single',   'simulation p = exceedCount/5000, no smoothing'],
  'Residual Spike Correlation':    ['single',   'one permutation p on max pairwise top-K overlap'],
  'Regional Noise Homogeneity':    ['single',   'one scan-max permutation p; no minimum taken'],
  'Excess Kurtosis':               ['single',   'simulation p (A-D at nC<=3, kurtosis otherwise); min over 2 only when per-condition promotion fires'],
  'Kurtosis':                      ['single',   'as Excess Kurtosis'],
  'Constant-Offset Blocks':        ['min',      'min over 2 passes (additive, multiplicative) of a pooled permutation p'],
  'Inter-Replicate Correlation':   ['min',      'min of (per-pair BH-adjusted analytic p) and (scan-max permutation p)'],
  'Cross-Condition Consistency':   ['min',      'min over property x pair units of BH-adjusted permutation p, 3 BH stages'],
  'Blocked Mahalanobis':           ['min',      'min over 2 x nCond units of BH-adjusted scan-max permutation p'],
  'Entropy / Zipf Analysis':       ['min',      'min over columns of BH-adjusted bootstrap p'],
  'Column Goodness-of-Fit':        ['min',      'min over columns of BH-adjusted refit-bootstrap p'],
  'Windowed Autocorrelation':      ['min',      'min over pair x window units of per-pair BH-adjusted permutation p'],
  'Runs Test':                     ['min',      'min of 3: per-pair BH analytic, scan-max permutation, per-window BH analytic'],
  'LOESS Residual Analysis':       ['min',      'min of pooled min(scanP,cusumP) and up to 30 per-pair BH-adjusted p'],
  'Terminal Digit Uniformity':     ['analytic', ''],
  'Decimal Precision Consistency': ['analytic', ''],
  'Value-Frequency Spike':         ['analytic', ''],
  'Exact Duplicate Detection':     ['analytic', ''],
  'Sequential Duplication':        ['analytic', ''],
  'Baseline Balance':              ['analytic', ''],
  'Cross-Condition Rank Correlation': ['analytic', ''],
  'Mahalanobis Row Outlier':       ['analytic', ''],
  'Noise Scaling With Measurement Size': ['analytic', ''],
  'Autocorrelation':               ['analytic', ''],
  'Modality Test':                 ['analytic', 'dip p from lookup table; rng argument unused'],
  'Within-Row Variance':           ['analytic', 'binomial tail + BH; rng argument unused'],
  'Row-Mean Runs':                 ['analytic', 'Wald-Wolfowitz z + BH; rng drives a display sequence only'],
  'Selective Noise':               ['analytic', 'Bartlett'],
  'Selective Noise Partitioning':  ['analytic', 'Bartlett'],
  'Missing Data Pattern':          ['analytic', ''],
};

const sd = xs => {
  const n = xs.length;
  if (n < 2) return 0;
  const m = xs.reduce((s, x) => s + x, 0) / n;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1));
};
const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const fmt = v => v == null ? 'null' : (v === 0 ? '0' : v < 1e-4 ? v.toExponential(2) : Number(v.toPrecision(4)).toString());

const cells = [];
for (const [file, F] of Object.entries(S.fixtures)) {
  for (const [name, T] of Object.entries(F.tests)) {
    const ps = T.ps;
    const finite = ps.filter(p => p != null);
    const [cls, note] = CLASS[name] || ['UNCLASSIFIED', ''];
    const flags = T.flags;
    const flagConstant = new Set(flags).size === 1;
    const cnts = T.counts.filter(Boolean).map(c => c.value);
    const B = cnts.length ? (new Set(cnts).size === 1 ? cnts[0] : `varies ${[...new Set(cnts)].join('/')}`) : null;
    const Bfield = T.counts.find(Boolean)?.field || null;
    cells.push({
      file, name, cls, note, ps, flags, flagConstant,
      B, Bfield,
      min: finite.length ? Math.min(...finite) : null,
      max: finite.length ? Math.max(...finite) : null,
      mean: finite.length ? mean(finite) : null,
      sd: finite.length > 1 ? sd(finite) : 0,
      moved: finite.length > 1 && new Set(finite).size > 1,
    });
  }
}

console.log(`=== S340 seed sweep — ${S.seeds.length} seeds x ${Object.keys(S.fixtures).length} fixtures, ${(S.totalMs / 1000).toFixed(0)} s ===`);
console.log(`seeds: ${S.seeds.join(', ')} (0 = the shipped stream)\n`);

// ── Severity ─────────────────────────────────────────────────────────
const sevMoves = [];
for (const [file, F] of Object.entries(S.fixtures)) {
  if (new Set(F.severityBySeed).size > 1) sevMoves.push(`${file}: ${F.severityBySeed.join(' ')} (expected ${F.expectedSeverity})`);
}
console.log(`SEVERITY changes across seeds: ${sevMoves.length}`);
sevMoves.forEach(s => console.log('  ' + s));

// ── Headline: non-constant flags ─────────────────────────────────────
const unstable = cells.filter(c => !c.flagConstant);
console.log(`\n=== HEADLINE — test x fixture cells whose FLAG is not constant across all ${S.seeds.length} seeds: ${unstable.length} ===`);
for (const c of unstable.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name))) {
  console.log(`\n  ${c.file} / ${c.name}   [${c.cls}${c.B ? `, B=${c.B} (${c.Bfield})` : ''}]`);
  console.log(`    flags  ${c.flags.join(' ')}`);
  console.log(`    p      ${c.ps.map(fmt).join(' ')}`);
  console.log(`    min ${fmt(c.min)}  max ${fmt(c.max)}  sd ${fmt(c.sd)}`);
}

// ── Analytic tests must not move at all ──────────────────────────────
const analyticMoved = cells.filter(c => c.cls === 'analytic' && c.moved);
console.log(`\n=== analytic (no-resampling) cells that moved anyway: ${analyticMoved.length} ===`);
analyticMoved.forEach(c => console.log(`  ${c.file} / ${c.name}: ${c.ps.map(fmt).join(' ')}`));
const unclassified = [...new Set(cells.filter(c => c.cls === 'UNCLASSIFIED').map(c => c.name))];
if (unclassified.length) console.log(`  !! unclassified test names: ${unclassified.join(', ')}`);

// ── Single-p cells: observed spread vs implied Monte Carlo error ──────
console.log(`\n=== single-p cells — observed sd vs implied Monte Carlo sd sqrt(p(1-p)/B) ===`);
console.log('  ratio > ~1.5 at 8 seeds is worth a look; ~8x is the discrepancy this pass was called to find.');
console.log(`\n${'fixture / test'.padEnd(58)} ${'B'.padStart(6)} ${'mean p'.padStart(9)} ${'obs sd'.padStart(9)} ${'MC sd'.padStart(9)} ${'ratio'.padStart(7)}  flag`);
const singles = cells.filter(c => c.cls === 'single' && c.moved && typeof c.B === 'number');
const rows = singles.map(c => {
  const pbar = Math.max(c.mean, 1 / c.B);           // floor at one draw so p=0 cells stay finite
  const mc = Math.sqrt(pbar * (1 - pbar) / c.B);
  return { c, mc, ratio: mc > 0 ? c.sd / mc : Infinity };
}).sort((a, b) => b.ratio - a.ratio);
for (const { c, mc, ratio } of rows) {
  console.log(
    `${(c.file + ' / ' + c.name).padEnd(58)} ${String(c.B).padStart(6)} ${fmt(c.mean).padStart(9)} ${fmt(c.sd).padStart(9)} ${fmt(mc).padStart(9)} ${ratio.toFixed(2).padStart(7)}  ${c.flagConstant ? c.flags[0] : 'UNSTABLE ' + [...new Set(c.flags)].join('/')}`
  );
}
const noB = cells.filter(c => c.cls === 'single' && c.moved && typeof c.B !== 'number');
if (noB.length) {
  console.log(`\n  single-p cells with no published resample count (ratio not computed): ${noB.length}`);
  noB.forEach(c => console.log(`    ${c.file} / ${c.name}: B=${c.B}`));
}

// ── min-over-units cells: spread reported, no ratio ───────────────────
const mins = cells.filter(c => c.cls === 'min' && c.moved);
console.log(`\n=== min-over-units cells that moved: ${mins.length} — spread reported, expected-wider, no ratio ===`);
console.log(`${'fixture / test'.padEnd(58)} ${'B'.padStart(12)} ${'min'.padStart(9)} ${'max'.padStart(9)} ${'sd'.padStart(9)}  flag`);
for (const c of mins.sort((a, b) => b.sd - a.sd)) {
  console.log(
    `${(c.file + ' / ' + c.name).padEnd(58)} ${String(c.B ?? '-').padStart(12)} ${fmt(c.min).padStart(9)} ${fmt(c.max).padStart(9)} ${fmt(c.sd).padStart(9)}  ${c.flagConstant ? c.flags[0] : 'UNSTABLE ' + [...new Set(c.flags)].join('/')}`
  );
}

// ── Per-test rollup ──────────────────────────────────────────────────
console.log(`\n=== per-test rollup ===`);
console.log(`${'test'.padEnd(38)} ${'class'.padEnd(9)} ${'cells'.padStart(6)} ${'moved'.padStart(6)} ${'unstable flag'.padStart(14)}`);
const byTest = {};
for (const c of cells) {
  if (!byTest[c.name]) byTest[c.name] = { cls: c.cls, n: 0, moved: 0, unstable: 0 };
  byTest[c.name].n++;
  if (c.moved) byTest[c.name].moved++;
  if (!c.flagConstant) byTest[c.name].unstable++;
}
for (const [name, v] of Object.entries(byTest).sort((a, b) => b[1].moved - a[1].moved || a[0].localeCompare(b[0]))) {
  console.log(`${name.padEnd(38)} ${v.cls.padEnd(9)} ${String(v.n).padStart(6)} ${String(v.moved).padStart(6)} ${String(v.unstable).padStart(14)}`);
}
