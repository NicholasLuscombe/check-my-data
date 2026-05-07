#!/usr/bin/env node
// Generates DS15: Missing Data Pattern + Carlisle Balance test dataset.
// 160 rows (80 Control + 80 Treatment), 6 replicate DATA columns + COND column.
// Plants three missingness signals + one Carlisle balance signal.
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mulberry32 PRNG (same as app)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function randn(rng) {
  const u1 = rng(), u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const rng = mulberry32(20260325);

// 80 features with base means spanning 15–190, SHUFFLED to avoid monotonic row ordering
// (ordered means → runs test false positive from structured row-mean sequence)
const _orderedMeans = Array.from({ length: 80 }, (_, i) => 15 + (175 * i / 79));
const baseMeans = [..._orderedMeans];
for (let i = baseMeans.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [baseMeans[i], baseMeans[j]] = [baseMeans[j], baseMeans[i]];
}

// Generate Control values: proportional Gaussian noise, CV ~15%
const controlData = baseMeans.map(mu =>
  Array.from({ length: 6 }, () => Math.max(0.1, mu + randn(rng) * mu * 0.15))
);

// Generate Treatment values (independent draws from same distribution)
const treatmentData = baseMeans.map(mu =>
  Array.from({ length: 6 }, () => Math.max(0.1, mu + randn(rng) * mu * 0.15))
);

// ── Carlisle signal: shift Treatment column means to match Control exactly ──
for (let c = 0; c < 6; c++) {
  const cMean = controlData.reduce((s, row) => s + row[c], 0) / 80;
  const tMean = treatmentData.reduce((s, row) => s + row[c], 0) / 80;
  const delta = cMean - tMean;
  for (let r = 0; r < 80; r++) treatmentData[r][c] += delta;
}

// ── Missing data signals ──
// Using Sets of "r,c" keys for each condition half (0-indexed within that half).

const controlMissing = new Set();
const treatmentMissing = new Set();

// (a) Pairwise missingness association: 8 Control rows where BOTH Rep1 AND Rep2 missing.
// No rows where only one of Rep1/Rep2 is missing.
const pairwiseRows = [5, 12, 18, 25, 33, 42, 55, 67];
for (const r of pairwiseRows) {
  controlMissing.add(`${r},0`);
  controlMissing.add(`${r},1`);
}

// (c) Block missingness: Treatment rows 40–51, Rep3+Rep4+Rep5 → all missing (12×3 = 36 cells).
for (let r = 40; r < 52; r++) {
  treatmentMissing.add(`${r},2`);
  treatmentMissing.add(`${r},3`);
  treatmentMissing.add(`${r},4`);
}

// (b) Condition-dependent missingness on Rep6:
//     Treatment: 15% missing (12 rows, all outside block region 40-51)
//     Control:   2.5% missing (2 rows)
const treatRep6Missing = [3, 8, 15, 22, 28, 35, 53, 58, 62, 66, 72, 77];
for (const r of treatRep6Missing) treatmentMissing.add(`${r},5`);
const controlRep6Missing = [20, 60];
for (const r of controlRep6Missing) controlMissing.add(`${r},5`);

// Background MCAR: 8 scattered cells in non-signal regions
const mcarControl = [[7, 2], [14, 3], [28, 4], [35, 2]];
const mcarTreatment = [[5, 2], [18, 3], [63, 4], [70, 2]];
for (const [r, c] of mcarControl) controlMissing.add(`${r},${c}`);
for (const [r, c] of mcarTreatment) treatmentMissing.add(`${r},${c}`);

// ── Generate CSV ──
const header = 'COND,Rep1,Rep2,Rep3,Rep4,Rep5,Rep6';
const lines = [header];

for (let r = 0; r < 80; r++) {
  const vals = controlData[r].map((v, c) =>
    controlMissing.has(`${r},${c}`) ? '' : v.toFixed(2)
  );
  lines.push(`Control,${vals.join(',')}`);
}
for (let r = 0; r < 80; r++) {
  const vals = treatmentData[r].map((v, c) =>
    treatmentMissing.has(`${r},${c}`) ? '' : v.toFixed(2)
  );
  lines.push(`Treatment,${vals.join(',')}`);
}

const outPath = join(__dirname, 'fixtures', '15-missing-carlisle.csv');
writeFileSync(outPath, lines.join('\n') + '\n');

const totalMissing = controlMissing.size + treatmentMissing.size;
console.log(`Generated DS15: ${outPath}`);
console.log(`Control missing: ${controlMissing.size} cells`);
console.log(`Treatment missing: ${treatmentMissing.size} cells`);
console.log(`Total missing: ${totalMissing} / ${160 * 6} = ${(totalMissing / 960 * 100).toFixed(1)}%`);
