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
  /* S404 Part 9 — integers over a SMALL range. The continuous families above
   * essentially never repeat a value, which is not what real deposits look
   * like: counts, scores, presence/absence and category codes make two equal
   * values an arithmetic near-certainty rather than evidence of copying. The
   * range is the factor; nothing else about the draw changes. */
  lowint:      (rnd, p) => p.lo + Math.floor(rnd() * (p.hi - p.lo + 1)),
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
  if (o.dateCol) headers.push('SurveyDate');
  for (const c of cols) headers.push(c.name);

  const rows = [];
  for (let r = 0; r < nRows; r++) {
    const row = [];
    if (idCol) row.push('S' + String(r + 1).padStart(5, '0'));
    if (groupCol) row.push('Site_' + String.fromCharCode(65 + (r % nGroups)));
    /* A date-like column drawn independently of everything else, so sorting on
     * it is a pure re-ordering rather than a proxy for any measured value. */
    if (o.dateCol) {
      const day = 1 + Math.floor(rnd() * 365);
      const d = new Date(Date.UTC(2024, 0, day));
      row.push(d.toISOString().slice(0, 10));
    }
    for (const c of cols) {
      const v = DISTS[c.dist](rnd, c.params || {});
      row.push(c.dp === 0 ? Math.round(v) : Number(v.toFixed(c.dp ?? 3)));
    }
    rows.push(row);
  }

  /* S404 Part 9 — ROW ORDER. Real deposits arrive sorted by site, date or
   * individual; rows above are iid. Sorting introduces NO relationship between
   * columns and fabricates nothing, so the file stays honest — but it does
   * create genuine serial structure down the rows, which is what the
   * sequential tests look for. A fire under sorting is the test reading order
   * the depositor imposed, which is not the same as an invented signal.
   * `sortBy` names a header; ties keep their draw order (Array.sort is stable
   * in V8), so the factor is the ordering and nothing else. */
  if (o.sortBy) {
    const ci = headers.indexOf(o.sortBy);
    if (ci < 0) throw new Error(`sortBy: no column named "${o.sortBy}" in [${headers.join(', ')}]`);
    rows.sort((a, b) => {
      const x = a[ci], y = b[ci];
      return (typeof x === 'number' && typeof y === 'number')
        ? x - y
        : String(x).localeCompare(String(y));
    });
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

/* S404 Part 9 — k columns of integers over [0, hi], the low-cardinality shape.
 * Every column is drawn independently, so repeated values arise from the range
 * alone. With nRows rows and hi+1 possible values, the expected number of
 * equal pairs within a column is C(nRows,2)/(hi+1) — at 200 rows and hi=5 that
 * is about 3,300 by arithmetic, with nothing copied. */
export function lowIntCols(k, hi) {
  const NAMES = ['count_a', 'count_b', 'score_1', 'score_2', 'presence', 'stage',
                 'brood_n', 'rank_ord', 'visits', 'cohort', 'band_n', 'plot_n'];
  return Array.from({ length: k }, (_, i) => ({
    name: i < NAMES.length ? NAMES[i] : `int_${i + 1}`,
    dist: 'lowint',
    params: { lo: 0, hi },
    dp: 0,
  }));
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

  const PART9 = argv.includes('--part9');

  /* PART 2 — the base set. Five seeds at one fixed shape, so "does it fire" is
   * not read off a single draw. Shape chosen to sit in the middle of the real
   * deposits' range (Part 6 measured 21 to 52,589 rows, 5 to 204 columns). */
  const BASE = { nRows: 200, seed: 0, idCol: true, groupCol: true };
  if (!PART9) for (let s = 0; s < 5; s++) {
    emit(`base-seed${s}`, { ...BASE, seed: 41000 + s, cols: baseCols(8) });
  }

  /* PART 3 — one factor at a time, all against base-seed0's settings. */
  const F = { ...BASE, seed: 41000 };
  if (!PART9) {
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
  }

  /* ── S404 Part 9 — repeats and row order, ONE FACTOR PER FILE ──────────
   * Emitted under --part9 so Part 8's set stays exactly as it was and the two
   * are never mixed in one directory. */
  if (argv.includes('--part9')) {
    /* Part 1 — low-cardinality integers, rows left iid. Range is the factor;
     * row count, column count and seed are held fixed. */
    for (const hi of [5, 20, 100])
      emit(`p9-lowint-hi${String(hi).padStart(3, '0')}`, { ...F, cols: lowIntCols(8, hi) });
    /* A continuous control at the same shape, so "integers" is the difference
     * and not "eight columns at seed 41000". */
    emit('p9-lowint-control-continuous', { ...F, cols: baseCols(8) });

    /* Part 2 — sorting, on its own, over the base mixed-continuous file. The
     * first is Part 8's run repeated verbatim: an instrument just extended is
     * not a witness until it reproduces something already measured. */
    const S = { ...F, dateCol: true, cols: baseCols(8) };
    emit('p9-sort-none', S);
    emit('p9-sort-by-measured', { ...S, sortBy: 'body_mass_g' });
    emit('p9-sort-by-id', { ...S, sortBy: 'SampleID' });
    emit('p9-sort-by-date', { ...S, sortBy: 'SurveyDate' });
    emit('p9-sort-by-group', { ...S, sortBy: 'Site' });

    /* Part 3 — both at once, the ordinary ecological/survey shape. */
    for (const hi of [5, 20])
      emit(`p9-both-hi${String(hi).padStart(3, '0')}`,
           { ...F, dateCol: true, cols: lowIntCols(8, hi), sortBy: 'count_a' });

    /* Byte-identical reproduction of Part 8's `sorted-by-col`: no date column,
     * so the PRNG draw order matches. `dateCol` consumes one draw per row, so
     * the arms above are mutually comparable but are NOT the same data Part 8
     * saw — this arm is, and it is what the reproduction claim rests on. */
    emit('p9-repro-part8-sorted', { ...F, cols: baseCols(8), sortBy: 'body_mass_g' });

    /* Held-out Part 3 configuration, added AFTER the first three arms had been
     * read, so the prediction recorded against it is a genuine pre-registration
     * rather than a description. Different cardinality and a different sort
     * column from the arms above. */
    emit('p9-heldout-both-hi050',
         { ...F, dateCol: true, cols: lowIntCols(8, 50), sortBy: 'score_1' });
  }

  writeFileSync(join(outDir, 'manifest.json'),
    JSON.stringify(written.map(w => ({ label: w.label, path: w.path })), null, 1));
  console.log(`\n${written.length} files -> ${outDir}`);
}
