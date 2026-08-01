/* S340 step 2 — the fragility census.

   Two different faults produce a flag that changes across seeds, and they want
   different treatments.

     small B        the true p sits clearly off the threshold, and only the
                    coarseness of the estimate carries it across. More draws
                    fix it, and we can already say which side it lands on.
     p on the line  the true p sits inside the Monte Carlo interval of the
                    threshold. More draws stop the flicker but do not decide
                    the verdict, because the quantity itself is on the line.

   Discriminating between them needs an estimate of the true p, and eight seeds
   at B draws each is 8B draws of exactly that. So the census pools the eight
   estimates to size an interval on the true p, and reports whether THAT still
   straddles the threshold. The eight individual values stay on screen — the
   pooling estimates a parameter, it is not a summary of the finding.

   Also reports, as asked: the interval on the shipped-seed p at the cell's
   current count, and the projection at the next count anyone would pay for.

     SEEDS=8 SEEDS_JSON=test/probes/out-s340-gate/seeds8.json node test/validate-batch.mjs
     node test/probes/probe-s340-fragility-census.mjs test/probes/out-s340-gate/seeds8.json

   Sizes the fix; does not do it. */
import { readFileSync } from 'fs';

const { ALPHA } = await import('../../src/constants/thresholds.js');
const path = process.argv[2] || 'test/probes/out-s340-gate/seeds8.json';
const S = JSON.parse(readFileSync(path, 'utf8'));

const Z = 1.959963985;
const MOD = ALPHA.NOTE;

/* Step-1 classification, read from each test at source. A minimum over units is
   expected to spread wider than a single p at the same count, so a straddling
   interval on one of those is a weaker signal than on a single-p test. */
const CLASS = {
  'Regional Noise Homogeneity':   'single p — one scan-max permutation, no minimum taken',
  'Residual Spike Correlation':   'single p',
  "Benford's Law (First Digit)":  'single p',
  "Benford's Law (Second Digit)": 'single p',
  'Excess Kurtosis':              'single p',
  'Inter-Replicate Correlation':  'min over 2 arms — per-pair analytic, and a scan-max permutation',
  'Cross-Condition Consistency':  'min over property × pair units, three BH-FDR stages',
  'Windowed Autocorrelation':     'min over pair × window units, per-pair BH-FDR',
  'Runs Test':                    'min over 3 arms, only one of which resamples',
  'LOESS Residual Analysis':      'min over pooled scan/CUSUM and up to 30 per-pair units',
  'Constant-Offset Blocks':       'min over 2 passes',
  'Column Goodness-of-Fit':       'min over columns',
  'Entropy / Zipf Analysis':      'min over columns',
  'Blocked Mahalanobis':          'min over pass × condition units',
};

/* Counts the result does not publish, read from source instead. Marked as such
   wherever they are used. */
const B_FROM_SOURCE = {
  'Inter-Replicate Correlation': (nRows) => nRows <= 100 ? 999 : nRows <= 1000 ? 499 : 199,
  'Runs Test': (nRows) => nRows <= 100 ? 999 : nRows <= 1000 ? 499 : 199,
};
// Row counts of the fixtures the census touches, needed for the branch above.
const N_ROWS = {
  '02-densitometry-fabricated.csv': 35,
  '10-proteomics-fabricated.csv': 400,
};

const nextCount = B => (B < 4999 ? 4999 : 49999);
const fmt = v => v === 0 ? '0' : Math.abs(v) < 1e-4 ? v.toExponential(2) : String(Number(v.toPrecision(4)));
const straddles = ([lo, hi], t) => lo < t && hi >= t;

function wilson(k, B) {
  const c = (k + Z * Z / 2) / (B + Z * Z);
  const h = (Z / (B + Z * Z)) * Math.sqrt((k * (B - k)) / B + Z * Z / 4);
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

const cells = [];
for (const [file, F] of Object.entries(S.fixtures)) {
  for (const [name, T] of Object.entries(F.tests)) {
    if (new Set(T.flags).size === 1) continue;
    cells.push({ file, name, T, declared: (S.declared?.[file] || []).includes(name) });
  }
}

console.log(`S340 fragility census — ${cells.length} seed-unstable cells over ${S.seeds.length} seeds`);
console.log(`MODERATE threshold ${MOD}\n`);

const verdicts = [];
for (const c of cells) {
  const ps = c.T.ps.filter(v => v != null);
  const shipped = c.T.ps[0];
  let B = c.T.B, Bsrc = c.T.Bfield ? `published as result.${c.T.Bfield}` : null;
  if (typeof B !== 'number' && B_FROM_SOURCE[c.name] && N_ROWS[c.file]) {
    B = B_FROM_SOURCE[c.name](N_ROWS[c.file]);
    Bsrc = `not published; read from source at ${N_ROWS[c.file]} rows`;
  }

  console.log('─'.repeat(78));
  console.log(`${c.file} / ${c.name}${c.declared ? '   [declared channel]' : ''}`);
  console.log(`  class            ${CLASS[c.name] || '(unclassified)'}`);
  console.log(`  flags            ${c.T.flags.join(' ')}`);
  console.log(`  p                ${c.T.ps.map(v => v == null ? '—' : fmt(v)).join(' ')}`);
  console.log(`  shipped-seed p   ${fmt(shipped)}    range across seeds [${fmt(Math.min(...ps))}, ${fmt(Math.max(...ps))}]`);
  if (typeof B !== 'number') {
    console.log('  no resample count available — no interval computed.');
    verdicts.push({ ...c, verdict: 'no resample count available' });
    continue;
  }
  console.log(`  resample count   B = ${B}  (${Bsrc})`);

  // Asked-for pair: interval on the shipped-seed p now, and projected at the
  // next count, holding p-hat fixed.
  const kShip = Math.max(0, Math.round(shipped * (B + 1) - 1));
  const nowI = wilson(kShip, B);
  const B2 = nextCount(B);
  const projI = wilson(Math.round(shipped * (B2 + 1) - 1), B2);
  console.log(`  interval on the shipped-seed p`);
  console.log(`    at B=${String(B).padEnd(5)}       [${fmt(nowI[0])}, ${fmt(nowI[1])}]  ${straddles(nowI, MOD) ? 'straddles 0.01' : 'clear of 0.01'}`);
  console.log(`    at B=${String(B2).padEnd(5)} (proj) [${fmt(projI[0])}, ${fmt(projI[1])}]  ${straddles(projI, MOD) ? 'straddles 0.01' : 'clear of 0.01'}   projection at the same p-hat, not a measurement`);

  // The discriminator: pool the eight seeds into one estimate of the true p.
  const kTotal = ps.reduce((s, v) => s + Math.max(0, Math.round(v * (B + 1) - 1)), 0);
  const Btotal = B * ps.length;
  const pooled = kTotal / Btotal;
  const pooledI = wilson(kTotal, Btotal);
  console.log(`  pooled over ${ps.length} seeds — ${kTotal} exceedances in ${Btotal} draws, p-hat ${fmt(pooled)}`);
  console.log(`    95% interval    [${fmt(pooledI[0])}, ${fmt(pooledI[1])}]  ${straddles(pooledI, MOD) ? 'STRADDLES 0.01' : 'clear of 0.01'}`);

  let verdict;
  if (straddles(pooledI, MOD)) {
    verdict = 'p ON THE LINE — 8×B draws still cannot say which side of 0.01 it sits on; no affordable count decides the verdict';
  } else {
    const side = pooledI[1] < MOD ? 'below 0.01 (MODERATE)' : 'above 0.01 (LOW)';
    verdict = `SMALL B — the true p is ${side}; raising ${B} to ${B2} stops the flicker and lands it there`;
  }
  console.log(`  → ${verdict}`);
  verdicts.push({ ...c, verdict });
}

console.log('\n' + '='.repeat(78));
console.log('SUMMARY');
for (const v of verdicts) {
  console.log(`  ${(v.file + ' / ' + v.name).padEnd(58)}`);
  console.log(`      ${v.verdict}`);
}
