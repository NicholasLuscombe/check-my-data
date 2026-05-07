// S112 Target B — 22-fixture × {W=30, 60, 100} Blocked Mahalanobis regression scan
// at B_perm=999. Reports per-fixture per-scale flag + primaryP under v1.0-style
// pooled BH across (pass × condition) at m = 2·nCond (single-scale BH at each W
// independently). Flags any ≥MOD signal at W>30 that wasn't present at W=30 —
// the key FP concern. Also characterises DS15 Carlisle scale-dependence.

import {
  runScale, loadConditionSlices, createPRNG, bhFDR, flagFromP,
} from './diag-s112-bm-core.mjs';

const SCALES = [30, 60, 100];
const B_PERM = 999;

const DATASETS = [
  { file: '01-densitometry-clean.csv',           assay: 'densitometry' },
  { file: '02-densitometry-fabricated.csv',      assay: 'densitometry' },
  { file: '03-qpcr-clean.csv',                   assay: 'qpcr' },
  { file: '04-qpcr-fabricated.csv',              assay: 'qpcr' },
  { file: '05-cellcount-clean.csv',              assay: 'cell_count' },
  { file: '06-cellcount-fabricated.csv',         assay: 'cell_count' },
  { file: '07-elisa-clean.csv',                  assay: 'elisa' },
  { file: '08-elisa-fabricated.csv',             assay: 'elisa' },
  { file: '09-proteomics-clean.csv',             assay: 'proteomics' },
  { file: '10-proteomics-fabricated.csv',        assay: 'proteomics' },
  { file: '11-rnaseq-multicondition.csv',        assay: 'genomics' },
  { file: '12a-uniform-mixture-clean.csv',       assay: 'general' },
  { file: '12b-uniform-mixture-fabricated.csv',  assay: 'general' },
  { file: '13-vfstest-cellcountest.csv',         assay: 'cell_count' },
  { file: '14-crctest-survey.csv',               assay: 'survey' },
  { file: '15-missing-carlisle.csv',             assay: 'general' },
  { file: '16-densitometry-carlisle-overbalanced.csv', assay: 'densitometry' },
  { file: '17-densitometry-carlisle-clean.csv',  assay: 'densitometry' },
  { file: '19-inheritance-fabricated.csv',       assay: 'general' },
  { file: '20-bimodal-fab.csv',                  assay: 'general' },
  { file: '21-localised-ar.csv',                 assay: 'general' },
  { file: '22-covariance-block.csv',             assay: 'general' },
];

function runScaleAt(slices, rng, W) {
  const { units, stride } = runScale(slices, rng, W, B_PERM);
  if (!units.length) return { flag: 'N/A', primaryP: null, stride, nUnits: 0 };
  const adj = bhFDR(units.map(u => u.rawP));
  units.forEach((u, i) => u.adjP = adj[i]);
  const primaryP = Math.min(...units.map(u => u.adjP));
  return {
    flag: flagFromP(primaryP), primaryP, stride, nUnits: units.length,
    topUnit: units.reduce((best, u) => u.adjP < best.adjP ? u : best, units[0]),
  };
}

console.log('='.repeat(100));
console.log(`S112 TARGET B — 22-fixture × W ∈ {30, 60, 100} regression scan (B_perm=${B_PERM})`);
console.log('='.repeat(100));
console.log();
console.log('Fixture                                        W=30                    W=60                    W=100');
console.log('                                               flag  primaryP          flag  primaryP          flag  primaryP');
console.log('-'.repeat(130));

const rows = [];
for (const { file, assay } of DATASETS) {
  try {
    const { slices, skip, matrix } = loadConditionSlices(file, assay);
    if (skip) {
      console.log(`${file.padEnd(46)} — skipped (dataType/genomics)`);
      rows.push({ file, assay, w30: { flag: 'N/A' }, w60: { flag: 'N/A' }, w100: { flag: 'N/A' } });
      continue;
    }
    if (!slices.length) {
      console.log(`${file.padEnd(46)} — insufficient rows per condition`);
      rows.push({ file, assay, w30: { flag: 'N/A' }, w60: { flag: 'N/A' }, w100: { flag: 'N/A' } });
      continue;
    }
    const rng = createPRNG(matrix);
    // Fresh rng state per scale ensures identical permutation seeds semantically —
    // production runs a single scale, so a fresh rng mirrors the single-scale case.
    const w30 = runScaleAt(slices, createPRNG(matrix), 30);
    const w60 = runScaleAt(slices, createPRNG(matrix), 60);
    const w100 = runScaleAt(slices, createPRNG(matrix), 100);
    const fmt = r => r.flag === 'N/A'
      ? 'N/A'.padEnd(24)
      : `${r.flag.padEnd(5)} ${(r.primaryP ?? 0).toFixed(5).padEnd(16)}`;
    console.log(`${file.padEnd(46)} ${fmt(w30)} ${fmt(w60)} ${fmt(w100)}`);
    rows.push({ file, assay, w30, w60, w100 });
  } catch (e) {
    console.log(`${file.padEnd(46)} ERROR: ${e.message}`);
    rows.push({ file, assay, error: e.message });
  }
}

console.log();
console.log('='.repeat(100));
console.log('Cross-scale regression flags');
console.log('='.repeat(100));

// Rank flags for "max severity by scale" comparison.
const RANK = { 'N/A': -1, LOW: 0, MOD: 1, HIGH: 2 };
const rankFlag = f => RANK[f] ?? -1;

const newFlagsAtLargerScale = [];
const lostFlagsAtLargerScale = [];
for (const r of rows) {
  if (r.error) continue;
  const f30 = r.w30.flag, f60 = r.w60.flag, f100 = r.w100.flag;
  const maxLarger = Math.max(rankFlag(f60), rankFlag(f100));
  if (maxLarger >= 1 && rankFlag(f30) < 1) {
    newFlagsAtLargerScale.push({ file: r.file, f30, f60, f100,
      p60: r.w60.primaryP, p100: r.w100.primaryP });
  }
  if (rankFlag(f30) >= 1 && maxLarger < 1) {
    lostFlagsAtLargerScale.push({ file: r.file, f30, f60, f100,
      p30: r.w30.primaryP });
  }
}

if (newFlagsAtLargerScale.length) {
  console.log(`\n⚠ ${newFlagsAtLargerScale.length} fixture(s) gain ≥MOD at W>30 but were LOW/NA at W=30 (FP concern on clean, rescue on DS22+):`);
  for (const r of newFlagsAtLargerScale) {
    console.log(`  ${r.file}: W=30 ${r.f30} → W=60 ${r.f60} (p=${r.p60?.toFixed(5)}) / W=100 ${r.f100} (p=${r.p100?.toFixed(5)})`);
  }
} else {
  console.log(`\n✓ No new ≥MOD flags at W ∈ {60, 100} beyond W=30 baseline.`);
}

if (lostFlagsAtLargerScale.length) {
  console.log(`\n↓ ${lostFlagsAtLargerScale.length} fixture(s) DROP from ≥MOD at W=30 to LOW at both W=60 and W=100:`);
  for (const r of lostFlagsAtLargerScale) {
    console.log(`  ${r.file}: W=30 ${r.f30} (p=${r.p30?.toFixed(5)}) → W=60 ${r.f60}, W=100 ${r.f100}`);
  }
}

// DS15 Carlisle scale-dependence narrative.
const ds15 = rows.find(r => r.file.startsWith('15-'));
if (ds15 && !ds15.error) {
  console.log();
  console.log('DS15 Carlisle Control rows 1-40 scale-dependence:');
  console.log(`  W=30:   ${ds15.w30.flag}  primaryP=${(ds15.w30.primaryP ?? 0).toFixed(5)}`);
  console.log(`  W=60:   ${ds15.w60.flag}  primaryP=${(ds15.w60.primaryP ?? 0).toFixed(5)}`);
  console.log(`  W=100:  ${ds15.w100.flag}  primaryP=${(ds15.w100.primaryP ?? 0).toFixed(5)}`);
  console.log('  Carlisle injection spans rows 1-40. Signal localisation:');
  console.log('    • if W=60 dilutes (W=60 window covers rows 1-40 + 20 clean) the signature sits inside the 40-row block');
  console.log('    • if W=100 persists the covariance structure extends beyond rows 1-40');
}

// DS22 primary target.
const ds22 = rows.find(r => r.file.startsWith('22-'));
if (ds22 && !ds22.error) {
  console.log();
  console.log('DS22 covariance-block K/N=0.15 scan:');
  console.log(`  W=30:   ${ds22.w30.flag}  primaryP=${(ds22.w30.primaryP ?? 0).toFixed(5)}`);
  console.log(`  W=60:   ${ds22.w60.flag}  primaryP=${(ds22.w60.primaryP ?? 0).toFixed(5)}`);
  console.log(`  W=100:  ${ds22.w100.flag}  primaryP=${(ds22.w100.primaryP ?? 0).toFixed(5)}`);
}
