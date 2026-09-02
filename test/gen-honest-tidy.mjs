/* S404 Part 8 — an HONEST TIDY generator.
 *
 * WHAT THIS IS FOR. Every one of the 27 sensitivity fixtures is a wide replicate
 * matrix: rows are subjects, columns are repeats of ONE quantity. The S404 Part 6
 * inspection found that 14 of 25 real round-2 deposits are the opposite shape —
 * each column is a DISTINCT VARIABLE and replication runs down the rows. Nothing
 * in the suite is that shape, so nothing in the suite can show what the battery
 * does to it. This fills that gap and nothing else.
 *
 * THE DESIGN IDEA. To demonstrate a false positive you do not need realistic
 * data, you need HONEST data. Every column here is drawn independently from its
 * own distribution. There is no relationship between any two columns, no
 * fabricated block, no copied cell, no planted effect. A test that fires here has
 * a false positive BY CONSTRUCTION, whatever the marginal distributions are and
 * however unlike a Dryad deposit the file looks.
 *
 * WHAT IT CANNOT GIVE YOU. A RATE. P258 stands: a rate measured on generated data
 * is a property of the generator until a real corpus agrees. The deliverable is
 * WHICH tests fire on data containing nothing to find, and WHAT MAKES THEM — never
 * a false-positive percentage.
 *
 * NOT TUNED. The parameters below were fixed before the first run and are not
 * adjusted toward any outcome. If a test fires that is the result; if it does not
 * that is equally the result. Fitting a generator until its output resembles the
 * corpus would be fitting a generator to a conclusion.
 *
 * WHY A NEW GENERATOR RATHER THAN AN EXTENSION. `test/gen-copy-fidelity.mjs` and
 * `test/gen-large-clean.mjs` both model subjects x conditions x REPLICATES, and
 * `generate-test-datasets.py` writes the same wide corpus. Their model IS
 * "columns are repeats of one quantity", which is the assumption this generator
 * exists to avoid. Extending either would mean removing its model.
 *
 * Run: node test/gen-honest-tidy.mjs --out <dir>
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/* Mulberry32 — the project's PRNG family, so a run is reproducible from its seed. */
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Box-Muller. One draw per call; the discarded second deviate costs nothing and
 * keeps the stream position a simple function of the number of draws. */
function randn(rnd) {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* Knuth for small lambda; normal approximation above 30 where Knuth's loop cost
 * becomes the dominant term. Both are honest count generators. */
function poisson(rnd, lambda) {
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * randn(rnd)));
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rnd(); } while (p > L);
  return k - 1;
}

/* The distribution menu. Each is drawn INDEPENDENTLY per cell — no latent factor
 * is shared between columns, which is what makes the file honest. */
export const DISTS = {
  normal:      (rnd, p) => p.mu + p.sd * randn(rnd),
  lognormal:   (rnd, p) => Math.exp(p.mu + p.sd * randn(rnd)),
  counts:      (rnd, p) => poisson(rnd, p.lambda),
  proportion:  (rnd, p) => rnd(),                     // bounded [0,1)
  uniform:     (rnd, p) => p.lo + (p.hi - p.lo) * rnd(),
};

/**
 * Build one honest tidy table.
 *
 * @param {object} o
 *   nRows      rows
 *   cols       array of {name, dist, params, dp}  — dp = decimal places emitted
 *   seed       PRNG seed
 *   idCol      emit a leading row-index identifier column
 *   groupCol   emit a categorical grouping column with `nGroups` levels
 * @returns {{headers: string[], rows: Array<Array<string|number>>}}
 */
export function generate(o) {
  const { nRows, cols, seed, idCol = false, groupCol = false, nGroups = 4 } = o;
  const rnd = mulberry32(seed);

  const headers = [];
  if (idCol) headers.push('SampleID');
  if (groupCol) headers.push('Site');
  for (const c of cols) headers.push(c.name);

  const rows = [];
  for (let r = 0; r < nRows; r++) {
    const row = [];
    if (idCol) row.push('S' + String(r + 1).padStart(5, '0'));
    if (groupCol) row.push('Site_' + String.fromCharCode(65 + (r % nGroups)));
    for (const c of cols) {
      const v = DISTS[c.dist](rnd, c.params || {});
      row.push(c.dp === 0 ? Math.round(v) : Number(v.toFixed(c.dp ?? 3)));
    }
    rows.push(row);
  }
  return { headers, rows };
}

export function toCSV({ headers, rows }) {
  const esc = (v) => {
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n') + '\n';
}

/* A column set of DISTINCT variables at DISTINCT scales — the tidy shape. Names
 * are deliberately ordinary field-biology variables so the assay detector has
 * something plausible to chew on; nothing depends on the names. */
export function baseCols(k, { dp = 3, dist = null, scaleSpread = false } = {}) {
  const MENU = [
    { name: 'body_mass_g',      dist: 'lognormal',  params: { mu: 3.0, sd: 0.4 } },
    { name: 'tarsus_mm',        dist: 'normal',     params: { mu: 22, sd: 1.5 } },
    { name: 'clutch_size',      dist: 'counts',     params: { lambda: 4 } },
    { name: 'wing_chord_mm',    dist: 'normal',     params: { mu: 78, sd: 3 } },
    { name: 'fat_score',        dist: 'counts',     params: { lambda: 2 } },
    { name: 'survival_prob',    dist: 'proportion', params: {} },
    { name: 'bill_depth_mm',    dist: 'normal',     params: { mu: 9.5, sd: 0.6 } },
    { name: 'territory_ha',     dist: 'lognormal',  params: { mu: 0.5, sd: 0.7 } },
    { name: 'arrival_doy',      dist: 'normal',     params: { mu: 120, sd: 8 } },
    { name: 'parasite_load',    dist: 'counts',     params: { lambda: 6 } },
    { name: 'temp_c',           dist: 'normal',     params: { mu: 14, sd: 3 } },
    { name: 'rainfall_mm',      dist: 'lognormal',  params: { mu: 2.5, sd: 0.9 } },
  ];
  const out = [];
  for (let i = 0; i < k; i++) {
    const m = MENU[i % MENU.length];
    const c = { ...m, name: i < MENU.length ? m.name : `${m.name}_${Math.floor(i / MENU.length) + 1}`, dp };
    if (dist) { c.dist = dist; c.params = DIST_DEFAULTS[dist]; }
    if (scaleSpread) {
      /* Push each column onto its own order of magnitude, holding shape fixed. */
      const mult = Math.pow(10, i % 6);
      if (c.dist === 'normal') c.params = { mu: c.params.mu * mult, sd: c.params.sd * mult };
      if (c.dist === 'lognormal') c.params = { mu: c.params.mu + Math.log(mult), sd: c.params.sd };
      if (c.dist === 'counts') c.params = { lambda: c.params.lambda * mult };
    }
    out.push(c);
  }
  return out;
}

export const DIST_DEFAULTS = {
  normal:     { mu: 50, sd: 10 },
  lognormal:  { mu: 3, sd: 0.5 },
  counts:     { lambda: 8 },
  proportion: {},
  uniform:    { lo: 0, hi: 1 },
};

/* ── CLI ───────────────────────────────────────────────────────────────── */
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const outDir = arg('--out', 'corpus-out/honest-tidy');
  mkdirSync(outDir, { recursive: true });

  const written = [];
  const emit = (label, spec) => {
    const csv = toCSV(generate(spec));
    const path = join(outDir, label + '.csv');
    writeFileSync(path, csv);
    written.push({ label, path, nRows: spec.nRows, nCols: spec.cols.length });
    console.log(`${label.padEnd(34)} ${spec.nRows} x ${spec.cols.length}`);
  };

  /* PART 2 — the base set. Five seeds at one fixed shape, so "does it fire" is
   * not read off a single draw. Shape chosen to sit in the middle of the real
   * deposits' range (Part 6 measured 21 to 52,589 rows, 5 to 204 columns). */
  const BASE = { nRows: 200, seed: 0, idCol: true, groupCol: true };
  for (let s = 0; s < 5; s++) {
    emit(`base-seed${s}`, { ...BASE, seed: 41000 + s, cols: baseCols(8) });
  }

  /* PART 3 — one factor at a time, all against base-seed0's settings. */
  const F = { ...BASE, seed: 41000 };
  for (const k of [3, 5, 8, 12, 24])
    emit(`ncols-${String(k).padStart(2, '0')}`, { ...F, cols: baseCols(k) });
  for (const n of [50, 100, 200, 500, 2000])
    emit(`nrows-${String(n).padStart(4, '0')}`, { ...F, nRows: n, cols: baseCols(8) });
  for (const d of ['normal', 'lognormal', 'counts', 'proportion'])
    emit(`dist-${d}`, { ...F, cols: baseCols(8, { dist: d }) });
  /* Mixed decimal precision — the census named this as Terminal Digit's real
   * defect, distinct from commensurability. */
  emit('dp-uniform-3', { ...F, cols: baseCols(8, { dp: 3 }) });
  emit('dp-uniform-0', { ...F, cols: baseCols(8, { dp: 0 }) });
  emit('dp-mixed', { ...F, cols: baseCols(8).map((c, i) => ({ ...c, dp: [0, 1, 2, 3][i % 4] })) });
  emit('id-none', { ...F, idCol: false, cols: baseCols(8) });
  emit('group-none', { ...F, groupCol: false, cols: baseCols(8) });
  emit('id-none-group-none', { ...F, idCol: false, groupCol: false, cols: baseCols(8) });
  emit('scale-spread', { ...F, cols: baseCols(8, { scaleSpread: true }) });

  writeFileSync(join(outDir, 'manifest.json'),
    JSON.stringify(written.map(w => ({ label: w.label, path: w.path })), null, 1));
  console.log(`\n${written.length} files -> ${outDir}`);
}
