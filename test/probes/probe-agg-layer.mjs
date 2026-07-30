// What the condition-group aggregation layer does to a false-positive rate.
//
// Route 4's 6.2% on DS17 clean was not the scale estimate and not the -1/n
// bias. Three conditions each got a chance at a per-group rate that was itself
// twice nominal: Fisher's arm alone 2.2%, the worst-group arm alone 5.8%. That
// is a property of `aggregatePerGroup`, and every test dispatched per condition
// group goes through it. This measures the layer's contribution on its own,
// separated from whatever each test's own calibration happens to be.
//
// NOTHING IS REPRODUCED. Every number comes from `runFullAnalysis`. The layer
// already publishes everything the four rates need on its own result object:
//   details[i].flag   each group's own verdict
//   fisherP           the Fisher arm's p, at 4dp
//   flag              the aggregate as shipped
// So the per-group rate, the two arms and the aggregate are all read off one
// engine call per draw. The probe asserts `flag === max(fisher arm, worst arm)`
// on every draw; a single mismatch means the arms are being misread.
//
// WHAT THE ROW PERMUTATION IS A NULL FOR, and it differs by grouping kind.
// `useAggregate` is `condCtx.type === 'column-grouped' && condCtx.count >= 2`,
// so runPair and runPairVST aggregate ONLY on column-grouped data, where a
// group is a set of COLUMNS over all the rows. A whole-matrix row permutation
// leaves that membership exactly intact and destroys row order, which is the
// null for the order-dependent tests.
//   Mahalanobis Row Outlier, Entropy / Zipf, Column Goodness-of-Fit and
// Modality Test take a separate route: `aggregatePerGroup(fn, rowGroups)`,
// where a group is a set of ROWS. All four are order-invariant — they read
// per-column distributions or per-row distances, never the sequence — so a
// permutation WITHIN each group is exactly inert and carries no information.
// A whole-matrix permutation, which the dispatch worried would scramble
// membership, is for these four precisely the right null: it preserves every
// group's SIZE and randomises which rows compose it, which is the hypothesis
// that the conditions are exchangeable. `--null` verifies both halves of that
// claim by measurement rather than asserting it.
//
// Usage:
//   node test/probes/probe-agg-layer.mjs --structure
//   node test/probes/probe-agg-layer.mjs --null
//   PCAL=500 FILES=... node test/probes/probe-agg-layer.mjs --layer
//   PCAL=300 node test/probes/probe-agg-layer.mjs --groupcount
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const B = new URL('../../', import.meta.url).pathname;
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import(B + 'src/analysis/engine.js');
const { detectVST } = await import(B + 'src/stats/vst.js');
const { inferRoles } = await import(B + 'src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import(B + 'src/import/parser.js');
const { flagFromP } = await import(B + 'src/constants/thresholds.js');
const { EXPECTED, ASSAY_DATATYPE_MAP } = await import(B + 'test/batch-fixtures.mjs');

const FIX = join(B, 'test/fixtures');
const RANK = { 'N/A': 0, LOW: 1, MODERATE: 2, HIGH: 3 };
const WORD = ['N/A', 'LOW', 'MODERATE', 'HIGH'];
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const num = (x) => (x == null ? NaN : (typeof x === 'number' ? x : parseFloat(x)));
const pct = (n, d) => (d ? `${(100 * n / d).toFixed(2)}%` : '-');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function permutation(n, rnd) {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
}
// Permute only inside each condition block, so every row keeps its condition.
function withinGroupPermutation(rowConditions, n, rnd) {
  const byCond = new Map();
  for (let i = 0; i < n; i++) {
    const c = rowConditions?.[i] ?? '__none__';
    if (!byCond.has(c)) byCond.set(c, []);
    byCond.get(c).push(i);
  }
  const out = new Array(n);
  for (const idxs of byCond.values()) {
    const p = permutation(idxs.length, rnd);
    idxs.forEach((dest, k) => { out[dest] = idxs[p[k]]; });
  }
  return out;
}

function readCsv(text) {
  const raw = preprocessRaw(Papa.default.parse(text, { skipEmptyLines: true }).data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  return extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
}
const readFixture = (file) => readCsv(readFileSync(join(FIX, file), 'utf-8'));

async function analyse(base, assay, matrix, rawMatrix, condCtx) {
  const vst = detectVST(base.matrix, assay);
  return await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst,
    { isPivoted: false }, ASSAY_DATATYPE_MAP[assay] || 'continuous', 'ordered');
}

// The four rates, read off one aggregate result. `applicable` mirrors the
// layer's own filter: groups whose flag is not N/A.
function arms(r) {
  if (r?.groupsAssessed === undefined) return null;
  const groups = (r.details || []).filter(d => d.flag && d.flag !== 'N/A');
  if (!groups.length) return null;
  const worstRank = Math.max(...groups.map(d => RANK[d.flag] ?? 0));
  const fp = num(r.fisherP);
  const fisherFlag = Number.isFinite(fp) ? flagFromP(fp) : 'LOW';
  return {
    nGroups: groups.length,
    groupHits: groups.filter(d => RANK[d.flag] >= 2).length,
    worstHit: worstRank >= 2,
    fisherHit: RANK[fisherFlag] >= 2,
    aggHit: RANK[r.flag] >= 2,
    consistent: RANK[r.flag] === Math.max(RANK[fisherFlag], worstRank),
    fisherUsed: Number.isFinite(fp) && fp < 1,
  };
}

// Row counts per group discriminate the two grouping kinds without inferring
// it from the test name: a column-set group is tested on every row, a row-set
// group on its own slice.
function groupKind(r, nRows) {
  const gs = (r.details || []).filter(d => d.rows != null);
  if (!gs.length) return '?';
  const allFull = gs.every(d => d.rows === nRows);
  const sums = gs.reduce((s, d) => s + d.rows, 0);
  if (allFull && gs.length > 1) return 'column set';
  if (Math.abs(sums - nRows) <= gs.length) return 'row set';
  return allFull ? 'column set' : 'row set';
}

// ── Part 1: the structure, at source and as measured (--structure) ─────────
if (process.argv.includes('--structure')) {
  const { default: fs } = await import('fs');
  const aggSrc = readFileSync(B + 'src/analysis/aggregation.js', 'utf-8');
  const engSrc = readFileSync(B + 'src/analysis/engine.js', 'utf-8');

  console.log('### Part 1a — the aggregate expression, verbatim from src/analysis/aggregation.js\n');
  for (const pat of [
    /  const worstGroupFlag[\s\S]*?"LOW"\);/,
    /  const useFisher[\s\S]*?\n  \}/,
    /  \/\/ Scenario C: Fisher's can only promote\n[\s\S]*?: worstGroupFlag;/,
  ]) {
    const m = aggSrc.match(pat);
    if (m) console.log(m[0].split('\n').map(l => '    ' + l.trim()).join('\n') + '\n');
  }
  console.log('### Part 1b — the two dispatch gates, verbatim from src/analysis/engine.js\n');
  for (const pat of [
    /  const useAggregate = .*/,
    /  async function runPair\(testFn, parentCondCtx\) \{[\s\S]*?\n  \}/,
    /      const mahalGroups = .*/,
  ]) {
    const m = engSrc.match(pat);
    if (m) console.log(m[0].split('\n').map(l => '    ' + l.trim()).join('\n') + '\n');
  }

  console.log('### Part 1c — FISHER_EXEMPT membership and what each criterion addresses\n');
  const fe = aggSrc.match(/  const FISHER_EXEMPT = new Set\(\[[\s\S]*?\]\);/);
  console.log(fe[0].split('\n').map(l => '    ' + l.trim()).join('\n'));
  const crit = aggSrc.match(/\/\/ \(a\) the minimum[\s\S]*?is exempted from Fisher aggregation\./);
  console.log('\n  The four criteria as written:\n');
  if (crit) console.log(crit[0].split('\n').map(l => '    ' + l.replace(/^\s*\/\/ ?/, '')).join('\n'));

  console.log('\n\n### Part 1d — which tests actually reach the layer, per fixture (measured)\n');
  const files = readdirSync(FIX).filter(f => f.endsWith('.csv') && EXPECTED[f]).sort();
  const seen = new Map();   // test -> Map(kind -> Set(fixtures))
  console.log('  ' + 'fixture'.padEnd(42) + 'ctx'.padEnd(16) + 'conds'.padEnd(7) + 'aggregated tests (groups, kind)');
  console.log('  ' + '-'.repeat(126));
  for (const file of files) {
    const base = readFixture(file);
    const assay = EXPECTED[file].assay;
    const res = await analyse(base, assay, base.matrix, base.rawMatrix, base.condCtx);
    const agg = res.filter(r => r.groupsAssessed !== undefined);
    for (const r of agg) {
      const k = groupKind(r, base.matrix.length);
      if (!seen.has(r.name)) seen.set(r.name, new Map());
      if (!seen.get(r.name).has(k)) seen.get(r.name).set(k, new Set());
      seen.get(r.name).get(k).add(file);
    }
    const label = agg.length
      ? agg.map(r => `${r.name} (${r.groupsAssessed}, ${groupKind(r, base.matrix.length)})`).join('; ')
      : 'none';
    console.log('  ' + file.padEnd(42) + base.condCtx.type.padEnd(16) + String(base.condCtx.count).padEnd(7) + label);
  }

  const FISHER_EXEMPT = new Set(fe[0].match(/"[^"]+"/g).map(s => s.slice(1, -1)));
  console.log(`\n  ${seen.size} tests reach the layer on at least one fixture.\n`);
  console.log('  ' + 'test'.padEnd(30) + 'grouping kind'.padEnd(16) + 'Fisher exempt'.padEnd(15) + 'fixtures');
  console.log('  ' + '-'.repeat(120));
  for (const [name, kinds] of [...seen].sort()) {
    for (const [k, fset] of kinds) {
      console.log('  ' + name.padEnd(30) + k.padEnd(16) + (FISHER_EXEMPT.has(name) ? 'yes' : 'no').padEnd(15) +
        [...fset].map(f => f.replace(/-.*/, '')).join(' '));
    }
  }
  console.log('\n  Note on the Fisher arm: `validPs` filters on `p > 0`, so a group whose primaryP is exactly');
  console.log('  zero is DROPPED from the combination rather than dominating it. Structural observation only.');
  process.exit(0);
}

// ── Part 2: is the null valid, per grouping kind (--null) ─────────────────
// Three claims, all measured over several draws rather than one, because a
// discrete statistic can coincide across two permutations by chance and a
// single match would read as inertness.
//   (1) On a column-grouped fixture a whole-matrix row permutation must leave
//       group membership intact. Checked on the group names and row counts.
//   (2) A test the permutation cannot move carries no false-positive rate under
//       it. Counted as the number of draws whose flag and p both equal the
//       observed pair; all draws matching means inert.
//   (3) The permutation reseeds the engine's PRNG, because `createPRNG(matrix)`
//       hashes the matrix. So for a simulation-based test the null varies the
//       seed as well as the row order. That is what production does too — a
//       different dataset gets a different seed — but it means "moves" does not
//       by itself prove the test reads row order.
if (process.argv.includes('--null')) {
  const NDRAW = Number(process.env.NDRAW) || 10;
  const files = (process.env.FILES || '17-densitometry-carlisle-clean.csv,02-densitometry-fabricated.csv,' +
    '09-proteomics-clean.csv,12a-uniform-mixture-clean.csv,03-qpcr-clean.csv,11-rnaseq-multicondition.csv').split(',');
  console.log(`### Part 2 — is the permutation a valid null, per grouping kind?  ${NDRAW} draws each\n`);
  console.log('  "moved" counts draws whose (flag, p) differs from the unpermuted result. 0 means the null');
  console.log('  cannot move this test at all, so it carries no measurable rate under it.\n');
  console.log('  ' + 'fixture'.padEnd(36) + 'ctx'.padEnd(16) + 'test'.padEnd(28) + 'kind'.padEnd(13) +
              'within-group moved'.padEnd(20) + 'whole-matrix moved');
  console.log('  ' + '-'.repeat(132));
  for (const file of files) {
    const base = readFixture(file);
    const assay = EXPECTED[file].assay;
    const rc = base.condCtx.rowConditions || null;
    const obs = await analyse(base, assay, base.matrix, base.rawMatrix, base.condCtx);
    const permRun = async (perm) => {
      const m = perm.map(i => base.matrix[i]);
      const rm = perm.map(i => base.rawMatrix[i]);
      return await analyse(base, assay, m, rm, base.condCtx.withMatrix(m));
    };
    const same = (a, b) => a && b && a.flag === b.flag && num(a.primaryP) === num(b.primaryP);
    const rndW = mulberry32(0xC0FFEE), rndH = mulberry32(0xBEEF);
    const movedW = new Map(), movedH = new Map();
    let memb = null;
    for (let d = 0; d < NDRAW; d++) {
      const wg = await permRun(withinGroupPermutation(rc, base.matrix.length, rndW));
      const wm = await permRun(permutation(base.matrix.length, rndH));
      for (const r of obs.filter(x => x.groupsAssessed !== undefined)) {
        const w = wg.find(x => x.name === r.name), h = wm.find(x => x.name === r.name);
        if (!same(r, w)) movedW.set(r.name, (movedW.get(r.name) || 0) + 1);
        if (!same(r, h)) movedH.set(r.name, (movedH.get(r.name) || 0) + 1);
      }
      if (d === 0 && base.condCtx.type === 'column-grouped') {
        const gs = (n) => (n?.details || []).map(x => `${x.group}:${x.rows}`).join(',');
        const ref = obs.filter(x => x.groupsAssessed !== undefined)[0];
        memb = [gs(ref), gs(wm.find(x => x.name === ref?.name))];
      }
    }
    for (const r of obs.filter(x => x.groupsAssessed !== undefined)) {
      const mw = movedW.get(r.name) || 0, mh = movedH.get(r.name) || 0;
      console.log('  ' + file.padEnd(36) + base.condCtx.type.padEnd(16) + r.name.padEnd(28) +
        groupKind(r, base.matrix.length).padEnd(13) +
        `${mw}/${NDRAW}${mw === 0 ? ' INERT' : ''}`.padEnd(20) + `${mh}/${NDRAW}${mh === 0 ? ' INERT' : ''}`);
    }
    if (memb) {
      console.log('  ' + ''.padEnd(36) + 'group membership under the whole-matrix permutation: ' +
        (memb[0] === memb[1] ? `UNCHANGED (${memb[0]})` : `CHANGED (${memb[0]} -> ${memb[1]})`));
    }
  }
  process.exit(0);
}

// ── Parts 3 and 5: the layer's contribution, arm by arm (--layer) ─────────
// PASS CONDITION, stated before running. The layer is sound if the aggregate
// rate is at most about 1.2 times one group's own rate — the aggregation adding
// at most a fifth to a single group's exposure. It inflates by uncorrected
// multiplicity if the ratio sits near the group count. Both arms are reported
// alone so the union's own contribution is separated from either.
//
// The ratio is bounded above by 1 / per-group rate, because the aggregate
// cannot exceed 100%. A test with a large per-group rate therefore shows a
// compressed ratio for arithmetic reasons, not because the layer treated it
// better. The per-group rate is printed alongside so that is visible.
if (process.argv.includes('--layer')) {
  const PCAL = Number(process.env.PCAL) || 500;
  const files = (process.env.FILES || '01-densitometry-clean.csv,02-densitometry-fabricated.csv,' +
    '16-densitometry-carlisle-overbalanced.csv,17-densitometry-carlisle-clean.csv').split(',');
  const WITHIN = process.env.WITHIN === '1';   // permute inside each condition instead

  console.log(`### Parts 3 and 5 — the layer's contribution. ${PCAL} permutations per fixture.`);
  console.log(`    null: ${WITHIN ? 'within-group row permutation' : 'whole-matrix row permutation'}\n`);
  console.log('  Rates are MODERATE-or-higher. "per group" counts over draws x groups; every other column');
  console.log('  counts over draws. "ratio" is aggregate over per group — the layer\'s contribution.\n');
  console.log('  ' + 'fixture'.padEnd(43) + 'test'.padEnd(28) + 'grps'.padEnd(6) +
              'per group'.padEnd(11) + 'worst arm'.padEnd(11) + 'Fisher arm'.padEnd(12) +
              'aggregate'.padEnd(11) + 'ratio'.padEnd(8) + 'distinct'.padEnd(10) + 'arms agree');
  console.log('  ' + '-'.repeat(128));

  for (const file of files) {
    const base = readFixture(file);
    const assay = EXPECTED[file].assay;
    const rc = base.condCtx.rowConditions || null;
    const rnd = mulberry32(0xC0FFEE);
    const acc = new Map();
    const t0 = Date.now();
    for (let k = 0; k < PCAL; k++) {
      const perm = WITHIN ? withinGroupPermutation(rc, base.matrix.length, rnd)
                          : permutation(base.matrix.length, rnd);
      const m = perm.map(i => base.matrix[i]);
      const rm = perm.map(i => base.rawMatrix[i]);
      const res = await analyse(base, assay, m, rm, base.condCtx.withMatrix(m));
      for (const r of res) {
        const a = arms(r);
        if (!a) continue;
        if (!acc.has(r.name)) acc.set(r.name, { gu: 0, gh: 0, w: 0, f: 0, ag: 0, n: 0, bad: 0, ng: 0, fu: 0, seen: new Set() });
        const s = acc.get(r.name);
        s.n++; s.gu += a.nGroups; s.gh += a.groupHits; s.ng = a.nGroups;
        s.seen.add(`${r.flag}|${num(r.primaryP)}`);
        if (a.worstHit) s.w++;
        if (a.fisherHit) s.f++;
        if (a.aggHit) s.ag++;
        if (!a.consistent) s.bad++;
        if (a.fisherUsed) s.fu++;
      }
    }
    const secs = (Date.now() - t0) / 1000;
    for (const [name, s] of [...acc].sort()) {
      const pg = s.gh / s.gu, ag = s.ag / s.n;
      console.log('  ' + file.replace('.csv', '').padEnd(43) + name.padEnd(28) + String(s.ng).padEnd(6) +
        pct(s.gh, s.gu).padEnd(11) + pct(s.w, s.n).padEnd(11) +
        (s.fu ? pct(s.f, s.n) : 'not used').padEnd(12) + pct(s.ag, s.n).padEnd(11) +
        (pg > 0 ? `${(ag / pg).toFixed(2)}x` : '-').padEnd(8) +
        (s.seen.size === 1 ? 'INERT' : String(s.seen.size)).padEnd(10) +
        (s.bad ? `*** ${s.bad}/${s.n} MISREAD ***` : 'yes'));
    }
    console.log(`  ${file.replace('.csv', '')}: ${PCAL} draws in ${secs.toFixed(0)}s\n`);
  }
  process.exit(0);
}

// ── Part 4: does it scale with the number of groups (--groupcount) ────────
// The fixture suite carries only three-condition column-grouped data — DS01,
// DS02, DS16 and DS17 all have exactly three — so the scaling cannot be read
// off fixtures. These are synthetic column-grouped matrices in the same shape
// as those fixtures, written as CSV and read back through the real import
// pipeline, so the grouping is built the way the app builds it rather than
// assembled by hand.
//
// Under independence between groups an uncorrected maximum over G groups gives
// 1 - (1 - p)^G, so the ratio to the per-group rate should track G and fall
// away from it as p grows. That is the signature to look for.
if (process.argv.includes('--groupcount')) {
  const PCAL = Number(process.env.PCAL) || 300;
  const GS = (process.env.GS || '2,3,4,6').split(',').map(Number);
  const REPS_PER_GROUP = Number(process.env.RPG) || 6;   // replicate columns per condition
  const NROWS = Number(process.env.NROWS) || 60;         // matches DS16 / DS17
  const TMP = join(B, 'test/probes/.tmp-agg-layer');
  mkdirSync(TMP, { recursive: true });

  console.log(`### Part 4 — does the inflation scale with the group count?`);
  console.log(`    ${PCAL} whole-matrix row permutations per matrix; ${NROWS} rows, ${REPS_PER_GROUP} replicates per condition.`);
  console.log(`    Synthetic, because every column-grouped fixture in the suite has exactly three conditions.\n`);
  console.log('  ' + 'G'.padEnd(4) + 'cols'.padEnd(6) + 'test'.padEnd(28) + 'per group'.padEnd(11) +
              'worst arm'.padEnd(11) + 'Fisher arm'.padEnd(12) + 'aggregate'.padEnd(11) +
              'ratio'.padEnd(8) + '1-(1-p)^G'.padEnd(11) + 'arms agree');
  console.log('  ' + '-'.repeat(132));

  for (const G of GS) {
    // Independent lognormal columns, no cross-column or serial structure, so
    // the data itself is null before the permutation is applied.
    const rndData = mulberry32(0x1234 + G);
    let spare = null;
    const nrm = () => { if (spare !== null) { const v = spare; spare = null; return v; }
      let u = 0, v = 0, s = 0;
      do { u = rndData() * 2 - 1; v = rndData() * 2 - 1; s = u * u + v * v; } while (s === 0 || s >= 1);
      const f = Math.sqrt(-2 * Math.log(s) / s); spare = v * f; return u * f; };
    const nC = G * REPS_PER_GROUP;
    // The corner cell carries a label rather than being blank, which the real
    // fixtures leave empty. It has to: `preprocessRaw` strips any leading row
    // holding fewer than max(3, ceil(width/10)) filled cells, so at two
    // conditions a blank corner leaves the group-header row with only two filled
    // cells and the row is dropped, taking the grouping with it. That is why no
    // two-condition column-grouped fixture exists in the suite. Measured, not
    // assumed — the first attempt at G=2 imported as `none` with 0 conditions.
    const head1 = ['Condition'], head2 = ['Feature'];
    for (let g = 0; g < G; g++) for (let j = 0; j < REPS_PER_GROUP; j++) {
      head1.push(j === 0 ? `Cond${g + 1}` : '');
      head2.push(`Rep${j + 1}`);
    }
    const lines = [head1.join(','), head2.join(',')];
    for (let r = 0; r < NROWS; r++) {
      const row = [`F${r + 1}`];
      for (let c = 0; c < nC; c++) row.push(Math.exp(5 + 0.35 * nrm()).toFixed(2));
      lines.push(row.join(','));
    }
    const path = join(TMP, `synth-G${G}.csv`);
    writeFileSync(path, lines.join('\n') + '\n');
    const base = readCsv(readFileSync(path, 'utf-8'));
    if (base.condCtx.type !== 'column-grouped' || base.condCtx.count !== G) {
      console.log(`  G=${G}: import produced ${base.condCtx.type} with ${base.condCtx.count} conditions — skipped`);
      continue;
    }
    const rnd = mulberry32(0xC0FFEE);
    const acc = new Map();
    for (let k = 0; k < PCAL; k++) {
      const perm = permutation(base.matrix.length, rnd);
      const m = perm.map(i => base.matrix[i]);
      const rm = perm.map(i => base.rawMatrix[i]);
      const res = await analyse(base, 'densitometry', m, rm, base.condCtx.withMatrix(m));
      for (const r of res) {
        const a = arms(r);
        if (!a) continue;
        if (!acc.has(r.name)) acc.set(r.name, { gu: 0, gh: 0, w: 0, f: 0, ag: 0, n: 0, bad: 0, fu: 0 });
        const s = acc.get(r.name);
        s.n++; s.gu += a.nGroups; s.gh += a.groupHits;
        if (a.worstHit) s.w++;
        if (a.fisherHit) s.f++;
        if (a.aggHit) s.ag++;
        if (!a.consistent) s.bad++;
        if (a.fisherUsed) s.fu++;
      }
    }
    for (const [name, s] of [...acc].sort()) {
      const pg = s.gh / s.gu, ag = s.ag / s.n;
      const indep = 1 - Math.pow(1 - pg, G);
      console.log('  ' + String(G).padEnd(4) + String(nC).padEnd(6) + name.padEnd(28) +
        pct(s.gh, s.gu).padEnd(11) + pct(s.w, s.n).padEnd(11) +
        (s.fu ? pct(s.f, s.n) : 'not used').padEnd(12) + pct(s.ag, s.n).padEnd(11) +
        (pg > 0 ? `${(ag / pg).toFixed(2)}x` : '-').padEnd(8) +
        `${(100 * indep).toFixed(2)}%`.padEnd(11) +
        (s.bad ? `*** ${s.bad}/${s.n} MISREAD ***` : 'yes'));
    }
    console.log('');
  }
  console.log(`  Synthetic CSVs left at test/probes/.tmp-agg-layer/ — delete with rm -rf, they are not tracked.`);
  process.exit(0);
}

console.log('Pick a mode: --structure, --null, --layer, --groupcount');
process.exit(1);
