/* S341 — DS08 follow-up. Regional Noise localises to rows 31-45 / col 2, which is
   the constant-offset block (data rows 35-48, Plate2 = Plate1 x 1.047), not the
   selective-noise block (50-64, Plate3) the fixture's GT row emphasises.

   Two independent checks:
     (a) direct data: per-window variance of the Plate2/Plate1 log-ratio, computed
         from the CSV with no engine involvement;
     (b) targeted slices: does the Regional Noise signal survive removal of the
         offset block? */
import { readFileSync } from 'fs';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs } = await import('../../src/analysis/engine.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { createPRNGFactory } = await import('../../src/stats/prng.js');
const { testRegionalNoise } = await import('../../src/tests/regionalNoise.js');

const csv = readFileSync('test/fixtures/08-elisa-fabricated.csv', 'utf-8');
const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
const pp = preprocessRaw(parsed.data);
const raw = pp.rows;
const hr = detectHeaderRows(raw);
const condPerCol = hr >= 2 ? forwardFill(raw[0]) : null;
const roles = inferRoles(raw.slice(hr), raw[hr - 1], condPerCol);
const { matrix } = extractAnalysisInputs({ data: raw.slice(hr), roles, condPerCol, zeroAsMissing: false });

/* (a) direct: log-ratio Plate2/Plate1 per data row, then rolling SD over 15 rows */
console.log('=== (a) direct data — SD of log(Plate2/Plate1), rolling 15-row windows ===');
const lr = matrix.map((r) => (r[0] > 0 && r[1] > 0) ? Math.log(r[1] / r[0]) : null);
const sd = (a) => { const v = a.filter((x) => x !== null); if (v.length < 2) return NaN;
  const m = v.reduce((x, y) => x + y, 0) / v.length;
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); };
const wins = [];
for (let s = 0; s + 15 <= lr.length; s += 1) wins.push({ start: s + 1, end: s + 15, sd: sd(lr.slice(s, s + 15)) });
const sorted = [...wins].sort((a, b) => a.sd - b.sd);
console.log('  five LOWEST-variance windows (1-indexed data rows):');
for (const w of sorted.slice(0, 5)) console.log(`    rows ${w.start}-${w.end}  sd=${w.sd.toExponential(3)}`);
console.log('  five HIGHEST:');
for (const w of sorted.slice(-5).reverse()) console.log(`    rows ${w.start}-${w.end}  sd=${w.sd.toExponential(3)}`);
console.log(`  planted offset block is data rows 35-48 (Plate2 = Plate1 x 1.047 exactly).`);
console.log(`  sd inside 35-48: ${sd(lr.slice(34, 48)).toExponential(3)}   outside: ${sd(lr.filter((_, i) => i < 34 || i >= 48)).toExponential(3)}`);

/* (b) targeted slices */
console.log('\n=== (b) Regional Noise on row subsets, 8 seeds ===');
const SL = {
  'full 1-65':                     matrix,
  'before block 1-34':             matrix.slice(0, 34),
  'block only 35-48':              matrix.slice(34, 48),
  'after block 49-65':             matrix.slice(48, 65),
  'block excised 1-34 + 49-65':    [...matrix.slice(0, 34), ...matrix.slice(48, 65)],
  'selnoise excised 1-49':         matrix.slice(0, 49),
};
for (const [label, sub] of Object.entries(SL)) {
  const flags = [], ps = [], winsx = [], cols = [];
  for (let s = 0; s < 8; s++) {
    globalThis.__S341_SEED = s;
    try {
      const r = testRegionalNoise(sub, createPRNGFactory(sub)('Regional Noise Homogeneity'));
      flags.push(r.flag); ps.push(r.primaryP); winsx.push(r.bestWindowRows); cols.push(r.bestAnomCol);
    } catch (e) { flags.push('ERR:' + e.message); }
  }
  const u = (a) => [...new Set(a)];
  const pv = ps.filter((p) => typeof p === 'number');
  console.log(`  ${label.padEnd(30)} n=${String(sub.length).padStart(2)}  flag=${u(flags).join('|').padEnd(14)} p=${pv.length ? `${Math.min(...pv).toExponential(2)}–${Math.max(...pv).toExponential(2)}` : '—'}  win=${u(winsx).join('|')} col=${u(cols).join('|')}`);
}
