/* S340 step 3 premise — is createPRNG's seed hash a sound basis to derive
   per-test streams from?

   hashMatrix is FNV-1a over the first 500 non-null values, in row-major order,
   folded to 32 bits. Per-test derivation inherits whatever this collides on, so
   two properties matter:

     1. Does it separate the fixtures we have?
     2. Does it separate files it OUGHT to separate — in particular a file and a
        longer file sharing its first 500 values, since the hash stops at 500?

   The second is the one to worry about. A dataset exported twice with extra
   rows appended, or a file next to its own truncation, are ordinary things.

   node test/probes/probe-s340-hash-basis.mjs   (no hook needed) */
import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { createPRNG } = await import('../../src/stats/prng.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';

/* hashMatrix is not exported, so recover its output through the only thing that
   depends on it: the first draw of a fresh instance is a pure function of the
   seed. Two matrices with the same first draw share a seed state. */
const seedProbe = matrix => {
  const r = createPRNG(matrix);
  return [r.random(), r.random(), r.random()].map(v => v.toFixed(12)).join('|');
};

function matrixOf(file, assay) {
  const raw = preprocessRaw(Papa.default.parse(readFileSync(join(FIXTURES, file), 'utf-8'), { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  return extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false }).matrix;
}

console.log('S340 — is the seed hash a sound basis for per-test derivation?');
console.log('hashMatrix: FNV-1a over the first 500 non-null values, row-major, folded to 32 bits.\n');

// ── 1. Do the 27 fixtures separate? ──
const seeds = new Map();
for (const [file, exp] of Object.entries(EXPECTED)) {
  const m = matrixOf(file, exp.assay);
  const s = seedProbe(m);
  if (!seeds.has(s)) seeds.set(s, []);
  seeds.get(s).push(`${file} (${m.length}x${m[0].length})`);
}
const collided = [...seeds.values()].filter(v => v.length > 1);
console.log(`1. Across the 27 fixtures: ${seeds.size} distinct seeds, ${collided.length} collision group(s).`);
for (const g of collided) console.log(`     COLLIDE: ${g.join('  ==  ')}`);

// ── 2. Does a file separate from a longer file sharing its prefix? ──
// Take each fixture, append copies of its own rows, and check the seed. Any
// fixture whose first 500 non-null values are already consumed before the end
// of the file will hash identically however much is appended.
console.log('\n2. A file against the same file with rows appended (the hash stops at 500 values):');
console.log(`   ${'fixture'.padEnd(42)} ${'cells'.padStart(7)} ${'500 reached at row'.padStart(19)}  seed changes when rows are appended?`);
let blindCount = 0;
for (const [file, exp] of Object.entries(EXPECTED)) {
  const m = matrixOf(file, exp.assay);
  // Row at which the 500th non-null value is read, in the same row-major walk.
  let count = 0, rowAt = null;
  for (let r = 0; r < m.length && rowAt === null; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (m[r][c] != null) { count++; if (count === 500) { rowAt = r + 1; break; } }
    }
  }
  const totalCells = m.reduce((s, row) => s + row.filter(v => v != null).length, 0);
  const appended = m.concat(m.map(row => row.slice()));   // duplicate every row
  const same = seedProbe(m) === seedProbe(appended);
  if (same) blindCount++;
  console.log(
    `   ${file.padEnd(42)} ${String(totalCells).padStart(7)} ${String(rowAt ?? 'never (<500 cells)').padStart(19)}  ${same ? 'NO — identical seed' : 'yes'}`
  );
}
console.log(`\n   ${blindCount} of ${Object.keys(EXPECTED).length} fixtures hash identically to a version of themselves with every row duplicated.`);

// ── 3. Does a change beyond the 500th value move the seed at all? ──
console.log('\n3. Editing one cell, at the front versus past the 500-value cut:');
for (const file of ['11-rnaseq-multicondition.csv', '09-proteomics-clean.csv', '08-elisa-fabricated.csv']) {
  const exp = EXPECTED[file];
  const m = matrixOf(file, exp.assay);
  const base = seedProbe(m);
  const front = m.map(r => r.slice()); front[0][0] = (front[0][0] ?? 0) + 1;
  const back = m.map(r => r.slice());
  const lastRow = back.length - 1; back[lastRow][0] = (back[lastRow][0] ?? 0) + 1;
  console.log(`   ${file.padEnd(42)} first cell changed: ${seedProbe(front) !== base ? 'seed moves' : 'SEED UNCHANGED'};  last row changed: ${seedProbe(back) !== base ? 'seed moves' : 'SEED UNCHANGED'}`);
}
