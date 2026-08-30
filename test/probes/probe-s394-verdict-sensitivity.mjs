/* S394 — does the role inversion move a verdict? Round 1, where the battery can run.
   READ-ONLY on src/. No src/ file is modified by this probe.

   Continues probe-s395-role-inversion.mjs (this session's pass 1) and
   probe-s396-inversion-incidence.mjs (pass 2). Those two committed filenames
   carry 395/396; there are no sessions 395 or 396 — all three passes are S394.

   Instrument. Same load-time hook, test/probes/s395-corpus-run-hook.mjs, which
   exposes scripts/corpus-run.mjs's own prepStructure / buildAnalysisConfig /
   readRawMatrix by replacing its CLI tail with an export list. Neither role
   predicate is reimplemented: inferBaseRoles and detectGroupAttributes are
   called and their inputs and outputs are read.

   The §2.8 counterfactual is NOT a patched rule. It is the shipped role array
   with `attribute` reverted to `data`, handed to the shipped
   buildAnalysisConfig -> extractAnalysisInputs -> runFullAnalysis. Shipped code,
   a different input.

   Modes:
     --pop round1|thirty|usable   population (round1 = every sheet of every file
                                  directly under corpus-data/; round2/ excluded)
     --incidence                  Part 1 table, the §3.2 shape
     --sensitivity                list the floor-passing inverted sheets
     --run                        Part 2: the battery, arms A / B / C / D
     --offsets N                  seed offsets to sweep in --run (default 1)
     --only <a,b,c>               restrict --run to labels matching any substring
     --cap <seconds>              per-run wall-clock cap (default 600)
     --out <path>                 write records as JSON
     --summarise <path>           read a --run artifact and report the counts
     --child <base64>             internal: one run in a child process

   Usage:
     node --import ./test/probes/s395-corpus-run-hook.mjs \
          test/probes/probe-s394-verdict-sensitivity.mjs --pop round1 --incidence
*/
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const flag = n => { const i = argv.indexOf('--' + n); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : undefined; };
const has = n => argv.includes('--' + n);
const CHILD = flag('child');

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// ── Child mode: one (sheet, arm, offset) run, JSON on stdout ─────────
// The seed hook is registered BEFORE any src import so it can reach prng.js.
if (typeof CHILD === 'string') {
  const job = JSON.parse(Buffer.from(CHILD, 'base64').toString('utf8'));
  if (job.offset) {
    const { registerSeedHook, setSeed } = await import(resolve(ROOT, 'test/seed-inject.mjs'));
    registerSeedHook();
    setSeed(job.offset);
  }
  const CRc = await import(resolve(ROOT, 'scripts/corpus-run.mjs'));
  const { extractAnalysisInputs, runFullAnalysis } = await import(resolve(ROOT, 'src/analysis/engine.js'));
  const { computeSeverity } = await import(resolve(ROOT, 'src/analysis/severity.js'));
  const { summarizeCoverage } = await import(resolve(ROOT, 'src/analysis/coverage.js'));
  const { detectVST } = await import(resolve(ROOT, 'src/stats/vst.js'));

  const entry = { path: resolve(ROOT, job.path), sheet: job.sheet };
  const { raw } = await CRc.readRawMatrix(entry);
  const s = CRc.prepStructure(raw, undefined);
  const roles = job.roles;                       // the arm's role array, verbatim
  if (roles.length !== s.roles.length) throw new Error('role array length changed under the child');
  const { config, assay, dataType, rowSemantics } = CRc.buildAnalysisConfig({
    entry, hdrs: s.hdrs, data: s.data, condPerCol: s.condPerCol, roles, longFormatDetected: s.longFormatDetected });
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs(config);
  const vst = detectVST(matrix, assay);
  const t0 = Date.now();
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst,
    { isPivoted: false }, dataType, rowSemantics);
  const ms = Date.now() - t0;
  process.stdout.write(JSON.stringify({
    ok: true, ms, assay, dataType, rowSemantics, vst: vst?.transform || 'raw',
    nRows: matrix.length, nCols: matrix[0]?.length || 0,
    condType: condCtx?.type ?? null, nConditions: condCtx?.count ?? null,
    severity: computeSeverity(results), cov: summarizeCoverage(results),
    flags: results.map(r => ({ n: r.name, f: r.flag, c: r.flag === 'N/A' ? (r.naCause || null) : null })),
  }));
  process.exit(0);
}

const CR = await import(resolve(ROOT, 'scripts/corpus-run.mjs'));
if (typeof CR.prepStructure !== 'function') {
  console.error('The hook did not load. Run with:\n  node --import ./test/probes/s395-corpus-run-hook.mjs ' +
                'test/probes/probe-s394-verdict-sensitivity.mjs --pop round1 --incidence');
  process.exit(2);
}
const { inferBaseRoles } = await import(resolve(ROOT, 'src/import/roles.js'));
const { extractAnalysisInputs } = await import(resolve(ROOT, 'src/analysis/engine.js'));
const { parseExcel, getSheetNames } = await import(resolve(ROOT, 'src/import/excel.js'));
const Papa = (await import('papaparse')).default;

const ABBR = { data: 'Data', label: 'Label', condition: 'Cond', attribute: 'Attr', ignore: 'ign' };
const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);
const UNIQ_CAP = 5000;
// Verbatim from probe-s396-inversion-incidence.mjs. Stated, not inferred:
// Number() returns NaN for every one, so each counts as non-numeric.
const MISSING = new Set(['NA', 'na', 'N/A', 'n/a', '#N/A', 'NaN', 'nan', 'NULL', 'null', 'None', 'none',
                         '.', '-', '--', 'missing', 'MISSING', '?', 'ND', 'nd', 'n.d.', 'Inf', '-Inf']);

// ── Populations ──────────────────────────────────────────────────────
// round1: every sheet of every data file directly under corpus-data/. round2/
// is a subdirectory and is skipped by construction — this dispatch does not
// touch that population.
const DATA_EXT = new Set(['.csv', '.tsv', '.txt', '.xlsx', '.xls']);
async function readRound1() {
  const dir = resolve(ROOT, 'corpus-data');
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) continue;            // skips round2/
    if (!DATA_EXT.has(extname(name).toLowerCase())) continue;
    const ext = extname(name).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      let names;
      try { names = await getSheetNames(new Blob([readFileSync(abs)])); }
      catch (e) { out.push({ file: name, sheet: null, path: `corpus-data/${name}`, fileError: e.message }); continue; }
      names.forEach((sh, i) => out.push({ file: name, sheet: sh, sheetIndex1: i + 1, sheetTotal: names.length, path: `corpus-data/${name}` }));
    } else {
      out.push({ file: name, sheet: name, sheetIndex1: 1, sheetTotal: 1, path: `corpus-data/${name}` });
    }
  }
  return out;
}
function readThirty() {
  const doc = readFileSync(resolve(ROOT, 'docs/shared/ROUND2-RUN-LOG.md'), 'utf8');
  const start = doc.indexOf('## 4 — The thirty'), end = doc.indexOf('## 5 — Counts');
  const out = [];
  for (const line of doc.slice(start, end).split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(doi:[^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\/\s*(\d+)\s*\|/);
    if (!m) continue;
    out.push({ position: Number(m[1]), file: m[3], sheet: m[4], sheetIndex1: Number(m[5]), sheetTotal: Number(m[6]),
               path: `corpus-data/round2/pos-${String(m[1]).padStart(2, '0')}/${m[3]}` });
  }
  return out;
}
function readUsable() {
  const inv = JSON.parse(readFileSync(resolve(ROOT, 'corpus-out/round2-inventory.json'), 'utf8'));
  const out = [];
  for (const f of inv.files) for (const s of f.sheets || []) {
    if (!s.passed || !(s.validRows > 0 && s.nNumericDataCols > 0)) continue;
    out.push({ position: Number((f.path.match(/pos-(\d+)/) || [])[1]), file: f.file, sheet: s.sheet,
               sheetIndex1: s.sheetIndex + 1, sheetTotal: s.sheetTotal, path: f.path });
  }
  return out;
}

async function rawOf(entry) {
  const abs = resolve(ROOT, entry.path);
  const ext = extname(abs).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    const { rows } = await parseExcel(new Blob([readFileSync(abs)]), entry.sheet);
    return rows;
  }
  return Papa.parse(readFileSync(abs, 'utf-8'), { header: false, skipEmptyLines: false }).data;
}

// ── Per-column measurement, verbatim from the pass-2 probe ───────────
function colStats(data, c) {
  const sample = data.slice(0, 40).map(r => r[c]).filter(v => v != null && v !== '');
  const sampleNf = sample.length ? sample.filter(v => !isNaN(Number(v))).length / sample.length : null;
  const sampleUniq = new Set(sample.map(String)).size;
  let nonEmpty = 0, numeric = 0;
  const set = new Set(); let capped = false;
  for (const r of data) {
    const v = r[c];
    if (v == null || v === '') continue;
    nonEmpty++;
    if (!isNaN(Number(v))) numeric++;
    if (!capped) { set.add(String(v)); if (set.size >= UNIQ_CAP) capped = true; }
  }
  let topTok = null, topN = 0;
  if (nonEmpty && numeric < nonEmpty) {
    const counts = new Map();
    for (const r of data) {
      const v = r[c];
      if (v == null || v === '' || !isNaN(Number(v))) continue;
      const k = String(v); const n = (counts.get(k) || 0) + 1; counts.set(k, n);
      if (n > topN) { topN = n; topTok = k; }
      if (counts.size > 50000) break;
    }
  }
  return { nSample: sample.length, sampleNf, sampleUniq, nonEmpty,
           fullNf: nonEmpty ? numeric / nonEmpty : null,
           fullUniq: capped ? UNIQ_CAP : set.size, fullUniqCapped: capped,
           popFrac: data.length ? nonEmpty / data.length : null,
           topTok, topTokFrac: nonEmpty ? topN / nonEmpty : null };
}

// ── One sheet's role measurement ─────────────────────────────────────
async function measure(entry) {
  if (entry.fileError) return { ...entry, error: entry.fileError, imports: false };
  const raw = await rawOf(entry);
  const rec = { ...entry, rawRows: raw.length, rawCols: raw.reduce((m, r) => Math.max(m, r.length), 0) };
  const s = CR.prepStructure(raw, undefined);
  const cfg = CR.buildAnalysisConfig({ entry: { path: resolve(ROOT, entry.path) }, hdrs: s.hdrs, data: s.data,
    condPerCol: s.condPerCol, roles: s.roles, longFormatDetected: s.longFormatDetected });
  const { matrix } = extractAnalysisInputs(cfg.config);
  rec.validRows = matrix.length;
  rec.nNumericDataCols = matrix[0]?.length || 0;
  rec.imports = rec.validRows > 0 && rec.nNumericDataCols > 0;

  const base = inferBaseRoles(s.data, s.hdrs, s.condPerCol);
  const stride = Math.max(1, Math.floor(s.data.length / 40));
  const strided = stride > 1 ? s.data.filter((_, i) => i % stride === 0) : s.data;
  const baseStride = inferBaseRoles(strided, s.hdrs, s.condPerCol);

  rec.nH = s.nH; rec.nBlocks = s.nBlocks; rec.nRows = s.data.length; rec.nCols = s.hdrs.length;
  rec.assay = cfg.assay; rec.dataType = cfg.dataType; rec.longFormatDetected = s.longFormatDetected;
  rec.hdrs = s.hdrs.map(String); rec.roles = s.roles; rec.base = base; rec.baseStride = baseStride;

  rec.cols = []; rec.m1 = []; rec.m1A = []; rec.m1B = []; rec.m1missing = []; rec.m1stride = [];
  for (let c = 0; c < s.hdrs.length; c++) {
    const st = colStats(s.data, c);
    rec.cols.push(st);
    let fullBranch = null;
    if (st.fullNf != null) {
      fullBranch = st.fullNf >= 0.5 ? 'not-this-branch'
        : (st.fullUniq <= 20 && st.nonEmpty && st.fullUniq / st.nonEmpty < 0.3) ? 'condition' : 'label';
    }
    st.fullBranch = fullBranch;
    const firedHere = base[c] === 'condition' && st.sampleNf != null && st.sampleNf < 0.5;
    if (firedHere && fullBranch && fullBranch !== 'condition') {
      rec.m1.push(c);
      (fullBranch === 'not-this-branch' ? rec.m1A : rec.m1B).push(c);
      if (st.topTok != null && MISSING.has(String(st.topTok).trim())) rec.m1missing.push(c);
    }
    if (base[c] === 'condition' && baseStride[c] === 'data') rec.m1stride.push(c);
  }

  rec.groupings = (s.groupings || []).map(g => ({ groupCol: g.groupCol, groupHdr: String(s.hdrs[g.groupCol]),
    nLevels: g.nLevels, attrCols: g.attrCols, attrHdrs: g.attrCols.map(a => String(s.hdrs[a])) }));
  rec.m2 = s.roles.map((r, i) => r === 'attribute' ? i : -1).filter(i => i >= 0);
  const revert = s.roles.map(r => r === 'attribute' ? 'data' : r);
  rec.dataColsWith = s.roles.filter(r => r === 'data').length;
  rec.dataColsWithout = revert.filter(r => r === 'data').length;
  rec.revertMatchesBase = rec.dataColsWithout === base.filter(r => r === 'data').length;
  rec.dataColsNeither = rec.dataColsWithout + rec.m1stride.length;

  // The three role arrays Part 2 runs. B and C are built here so the record
  // carries exactly what was handed to the shipped config builder.
  rec.rolesA = s.roles.slice();
  rec.rolesB = revert;
  rec.rolesC = revert.slice();
  for (const c of rec.m1missing) rec.rolesC[c] = baseStride[c];
  // Arm D is an ADDITION beyond the dispatch, and it exists because arm C can be
  // degenerate: a missing-marker column whose second window returns the same
  // role has nothing to move. D moves EVERY M1 column to its second-window role,
  // so mechanism 1 has a counterfactual even where C has none. Reported apart,
  // never merged into C.
  rec.rolesD = revert.slice();
  for (const c of rec.m1) rec.rolesD[c] = baseStride[c];
  rec.bDiffers = JSON.stringify(rec.rolesB) !== JSON.stringify(rec.rolesA);
  rec.cDiffers = JSON.stringify(rec.rolesC) !== JSON.stringify(rec.rolesB);
  rec.dDiffers = JSON.stringify(rec.rolesD) !== JSON.stringify(rec.rolesC);
  return rec;
}

// ── Drive ────────────────────────────────────────────────────────────
const POP = flag('pop');
if (!POP || !['round1', 'thirty', 'usable'].includes(POP)) {
  console.error('Pass --pop round1 | --pop thirty | --pop usable');
  process.exit(2);
}
const entries = POP === 'round1' ? await readRound1() : POP === 'thirty' ? readThirty() : readUsable();
const recs = [];
for (const e of entries) {
  try { recs.push(await measure(e)); }
  catch (err) { recs.push({ ...e, error: err.message, imports: false }); }
}
const imported = recs.filter(r => r.imports);
const FLOOR = 2;

// The sensitivity population: floor-passing sheets carrying either mechanism.
const sens = imported.filter(r => r.dataColsWith >= FLOOR && (r.m1.length > 0 || r.m2.length > 0));

if (has('incidence')) {
  const carries1 = imported.filter(r => r.m1.length > 0);
  const carries2 = imported.filter(r => r.m2.length > 0);
  const both = imported.filter(r => r.m1.length > 0 && r.m2.length > 0);
  const neither = imported.filter(r => r.m1.length === 0 && r.m2.length === 0);
  const passFloor = imported.filter(r => r.dataColsWith >= FLOOR);
  const refusal = imported.filter(r => r.dataColsNeither >= FLOOR && r.dataColsWith < FLOOR);
  const m1colsAll = imported.flatMap(r => r.m1.map(c => r.cols[c]));

  console.log(`POPULATION: ${POP}\n`);
  console.log('PART 1 — the population');
  console.log(`  files walked                             : ${new Set(recs.map(r => r.file)).size}`);
  console.log(`  sheets enumerated                        : ${recs.length}`);
  console.log(`  ... import (validRows>0 and nDC>0)       : ${imported.length}`);
  console.log(`  ... do not                               : ${recs.length - imported.length}`);
  console.log('\nPART 1 — incidence, the §3.2 shape\n');
  console.log(`  sheets measured                          : ${imported.length}`);
  console.log(`  carry mechanism 1                        : ${carries1.length}`);
  console.log(`    ... m1A (full column majority-numeric) : ${imported.filter(r => r.m1A.length).length} sheets, ${imported.reduce((a, r) => a + r.m1A.length, 0)} columns`);
  console.log(`    ... m1B (reads label on the full column): ${imported.filter(r => r.m1B.length).length} sheets, ${imported.reduce((a, r) => a + r.m1B.length, 0)} columns`);
  console.log(`    ... missing-marker columns             : ${imported.filter(r => r.m1missing.length).length} sheets, ${imported.reduce((a, r) => a + r.m1missing.length, 0)} columns`);
  console.log(`  carry mechanism 2 (§2.8 hold-out)        : ${carries2.length}`);
  console.log(`  carry both                               : ${both.length}`);
  console.log(`  carry neither                            : ${neither.length}`);
  console.log(`  shipped 2nd window: Cond -> data         : ${imported.filter(r => r.m1stride.length).length} sheets, ${imported.reduce((a, r) => a + r.m1stride.length, 0)} columns`);
  console.log('');
  console.log(`  pass the floor (nDC >= ${FLOOR} as shipped)      : ${passFloor.length}`);
  console.log(`  ... of those, inverted by either mechanism: ${sens.length}   <-- SENSITIVITY POPULATION`);
  console.log(`        M1 only : ${passFloor.filter(r => r.m1.length && !r.m2.length).length}` +
              `   M2 only : ${passFloor.filter(r => !r.m1.length && r.m2.length).length}` +
              `   both : ${passFloor.filter(r => r.m1.length && r.m2.length).length}`);
  console.log(`  ... losing at least one DATA column      : ${passFloor.filter(r => r.m2.length > 0 || r.m1stride.length > 0).length}`);
  console.log(`  ... gaining a fabricated condition only  : ${sens.length - passFloor.filter(r => r.m2.length > 0 || r.m1stride.length > 0).length}`);
  console.log(`  inverted INTO refusal                    : ${refusal.length}`);
  console.log(`  ... of which §2.8 alone is the cause     : ${refusal.filter(r => r.dataColsWithout >= FLOOR).length}`);
  console.log('');
  console.log(`  total columns carrying M1                : ${imported.reduce((a, r) => a + r.m1.length, 0)}`);
  console.log(`  total columns held out by §2.8           : ${imported.reduce((a, r) => a + r.m2.length, 0)}`);
  console.log(`  condition columns as shipped             : ${imported.reduce((a, r) => a + r.roles.filter(x => x === 'condition').length, 0)}`);
  console.log(`  M1 cols with any numeric content         : ${m1colsAll.filter(x => x.fullNf > 0).length} of ${m1colsAll.length}`);
  console.log(`  revert == base data count on every sheet : ${imported.every(r => r.revertMatchesBase) ? 'yes' : 'NO'}`);
  // §2.8 cannot run below MIN_ROWS_FOR_GROUPING = 50. Reported so a low M2 rate
  // can be read against how many sheets the pass could reach at all, rather
  // than attributed to the data's shape without measuring the gate.
  const reach28 = imported.filter(r => r.nRows >= 50);
  console.log(`  sheets reaching §2.8's row floor (>= 50)  : ${reach28.length} of ${imported.length}` +
              `   (${(100 * reach28.length / imported.length).toFixed(1)}%)`);
  console.log(`  ... of those, §2.8 held something out     : ${reach28.filter(r => r.m2.length).length}` +
              `   (${(100 * reach28.filter(r => r.m2.length).length / (reach28.length || 1)).toFixed(1)}%)`);

  if (recs.length !== imported.length) {
    console.log('\nSHEETS THAT DO NOT IMPORT\n');
    for (const r of recs.filter(x => !x.imports)) {
      console.log(`  ${pad(r.file + (r.sheet && r.sheet !== r.file ? ` [${r.sheet}]` : ''), 56)} ${r.error ? 'threw: ' + r.error : `validRows ${r.validRows} nDC ${r.nNumericDataCols}`}`);
    }
  }
}

if (has('sensitivity')) {
  console.log(`\nSENSITIVITY POPULATION — floor-passing and inverted (${sens.length})\n`);
  for (const r of sens) {
    const nm = r.file + (r.sheet && r.sheet !== r.file ? ` [${r.sheet}]` : '');
    console.log(`  ${nm}`);
    console.log(`      ${r.nRows} rows x ${r.nCols} cols   data cols ${r.dataColsWith} shipped / ${r.dataColsWithout} without §2.8 / ${r.dataColsNeither} without either` +
                `   assay ${r.assay}/${r.dataType}`);
    if (r.m2.length) {
      console.log(`      M2 holds out ${r.m2.length}: ${r.m2.map(c => r.hdrs[c]).join(', ')}`);
      for (const g of r.groupings) console.log(`        key ${g.groupHdr} (${g.nLevels} levels) holds ${g.attrHdrs.join(', ')}`);
    }
    if (r.m1.length) {
      console.log(`      M1 ${r.m1.length} column(s): ` + r.m1.map(c => {
        const st = r.cols[c];
        return `${r.hdrs[c]}(fullNf ${st.fullNf.toFixed(2)}, top "${st.topTok}", 2ndWin ${ABBR[r.baseStride[c]]}${r.m1missing.includes(c) ? ', MISSING-MARKER' : ''})`;
      }).join('; '));
    }
    console.log(`      arms: B differs from A ${r.bDiffers ? 'yes' : 'no'};  C differs from B ${r.cDiffers ? 'yes' : 'no'};  D differs from C ${r.dDiffers ? 'yes' : 'no'}`);
  }
}

// ── Part 2 — run the battery ─────────────────────────────────────────
const CAP_MS = Number(flag('cap') || 600) * 1000;
const OFFSETS = Number(flag('offsets') || 1);

function runChild(job) {
  return new Promise(res => {
    const payload = Buffer.from(JSON.stringify(job)).toString('base64');
    const child = spawn(process.execPath, [
      '--max-old-space-size=8192',
      '--import', './test/probes/s395-corpus-run-hook.mjs',
      'test/probes/probe-s394-verdict-sensitivity.mjs',
      '--pop', 'round1', '--child', payload,
    ], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '', done = false;
    const timer = setTimeout(() => { if (!done) { done = true; child.kill('SIGKILL'); res({ ok: false, capped: true }); } }, CAP_MS);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('close', code => {
      if (done) return;
      done = true; clearTimeout(timer);
      if (code !== 0) return res({ ok: false, code, err: err.slice(-600) });
      try { res(JSON.parse(out.trim())); }
      catch (e) { res({ ok: false, parse: e.message, out: out.slice(0, 300), err: err.slice(-600) }); }
    });
  });
}

const flagVec = r => r.flags.map(x => `${x.n}=${x.f}${x.c ? ':' + x.c : ''}`);
function diffFlags(a, b) {
  const A = new Map(a.flags.map(x => [x.n, x])), B = new Map(b.flags.map(x => [x.n, x]));
  const moves = [];
  for (const [n, x] of A) {
    const y = B.get(n);
    if (!y) { moves.push({ n, from: x.f, to: '(absent)' }); continue; }
    if (x.f !== y.f || (x.c || null) !== (y.c || null)) moves.push({ n, from: x.f + (x.c ? ':' + x.c : ''), to: y.f + (y.c ? ':' + y.c : '') });
  }
  for (const [n] of B) if (!A.has(n)) moves.push({ n, from: '(absent)', to: B.get(n).f });
  return moves;
}

if (has('run')) {
  // --only takes a comma-separated list of substrings; a sheet is run if it
  // matches any of them. Sequential invocations would work too, but one process
  // keeps every arm of every sheet in one artifact.
  const only = flag('only');
  const onlyList = typeof only === 'string' ? String(only).split(',').map(x => x.trim()).filter(Boolean) : null;
  const targets = sens.filter(r => !onlyList || onlyList.some(o => (r.file + ' ' + (r.sheet || '')).includes(o)));
  if (onlyList && !targets.length) { console.error(`--only matched no sheet: ${onlyList.join(' | ')}`); process.exit(2); }
  console.log(`\nPART 2 — the battery, both ways.  ${targets.length} sheet(s), cap ${CAP_MS / 1000}s, offsets 0..${OFFSETS - 1}\n`);
  const out = [];
  for (const r of targets) {
    const nm = r.file + (r.sheet && r.sheet !== r.file ? ` [${r.sheet}]` : '');
    const arms = [['A', r.rolesA]];
    if (r.bDiffers) arms.push(['B', r.rolesB]);
    if (r.cDiffers) arms.push(['C', r.rolesC]);
    if (r.dDiffers) arms.push(['D', r.rolesD]);
    const rec = { label: nm, path: r.path, sheet: r.sheet, arms: {}, offsets: {} };
    for (let off = 0; off < OFFSETS; off++) {
      rec.offsets[off] = {};
      for (const [name, roles] of arms) {
        const res = await runChild({ path: r.path, sheet: r.sheet, roles, offset: off });
        rec.offsets[off][name] = res;
        const tag = `${pad(nm.slice(0, 44), 45)} off${off} arm${name}`;
        if (!res.ok) { console.log(`  ${tag}  ${res.capped ? 'CAPPED — unmeasured' : 'FAILED: ' + (res.err || res.code || res.parse || '').toString().split('\n').pop()}`); continue; }
        console.log(`  ${tag}  sev ${res.severity.severity} (H${res.severity.high} M${res.severity.mod} D${res.severity.nFlaggedDimensions})` +
                    `  ran ${res.cov.ran} n/a ${res.cov.notApplicable} wh ${res.cov.withheld}` +
                    `  ${res.nRows}x${res.nCols} ${res.condType || 'none'}/${res.nConditions ?? 0}  ${(res.ms / 1000).toFixed(0)}s`);
      }
    }
    // Offset-0 comparison, reported per arm pair.
    const a0 = rec.offsets[0]?.A;
    for (const k of ['B', 'C', 'D']) {
      const x0 = rec.offsets[0]?.[k];
      if (!a0?.ok || !x0?.ok) continue;
      const moves = diffFlags(a0, x0);
      rec.arms[k] = { sevA: a0.severity.severity, sev: x0.severity.severity, moves };
      console.log(`      A->${k}: severity ${a0.severity.severity} -> ${x0.severity.severity}` +
                  `   H ${a0.severity.high}->${x0.severity.high}  M ${a0.severity.mod}->${x0.severity.mod}` +
                  `   ran ${a0.cov.ran}->${x0.cov.ran}   ${moves.length} test(s) move`);
      for (const m of moves) console.log(`         ${pad(m.n, 34)} ${m.from} -> ${m.to}`);
    }
    out.push(rec);
  }
  const outPath = flag('out');
  if (typeof outPath === 'string') {
    writeFileSync(resolve(ROOT, outPath), JSON.stringify({ population: POP, offsets: OFFSETS, records: out }, null, 1));
    console.log(`\nwrote ${outPath}`);
  }
}

const recOut = flag('out');
if (typeof recOut === 'string' && !has('run')) {
  writeFileSync(resolve(ROOT, recOut), JSON.stringify({ population: POP, records: recs }, null, 1));
  console.log(`\nwrote ${recOut}`);
}

// ── --summarise <artifact.json> — the counts that decide the question ─
// Reads a --run artifact and reports severity moves, tier crossings, the tests
// and families that account for them, and the distance from each sheet to a
// tier boundary. Kept in the probe rather than in a scratch file so the
// instrument that produced the record is the committed one.
if (has('summarise')) {
  const artifact = flag('summarise');
  if (typeof artifact !== 'string') { console.error('--summarise needs a path to a --run artifact'); process.exit(2); }
  const { TEST_MECHANISM, MECHANISMS } = await import(resolve(ROOT, 'src/constants/mechanisms.js'));
  const j = JSON.parse(readFileSync(resolve(ROOT, artifact), 'utf8'));
  const rows = [];
  for (const rec of j.records) {
    const offs = Object.keys(rec.offsets).map(Number).sort((a, b) => a - b);
    for (const off of offs) {
      const a = rec.offsets[off].A;
      for (const k of ['B', 'C', 'D']) {
        const x = rec.offsets[off][k];
        if (!x) continue;
        rows.push({ label: rec.label, off, arm: k, a, x, ok: !!(a?.ok && x?.ok) });
      }
    }
  }

  const at0 = rows.filter(r => r.off === 0);
  const okRows = at0.filter(r => r.ok);
  const capped = at0.filter(r => !r.ok);

  function moves(a, x) {
    const A = new Map(a.flags.map(t => [t.n, t])), X = new Map(x.flags.map(t => [t.n, t]));
    const out = [];
    for (const [n, t] of A) {
      const y = X.get(n);
      const fa = t.f + (t.c ? ':' + t.c : ''), fx = y ? y.f + (y.c ? ':' + y.c : '') : '(absent)';
      if (fa !== fx) out.push({ n, from: fa, to: fx, fFrom: t.f, fTo: y ? y.f : '(absent)' });
    }
    return out;
  }

  const RANK = { 'N/A': -1, LOW: 0, MODERATE: 1, HIGH: 2 };

  // Distance to a tier boundary, in flagged cells removed. Derived from
  // computeSeverity's own four arms rather than brute-forced:
  //   severity < 3 requires the flagged set to occupy at most ONE dimension
  //     (D>=2 with any HIGH is 3, and D>=2 with 2+ MODERATE is 3, and two
  //      surviving dimensions means at least two surviving flags), and within
  //     that one dimension at most one HIGH (high>=2 is 3).
  //   severity 0 requires every flag gone.
  // So dist3 = min over dimensions d of [ flags outside d + max(0, high_d - 1) ].
  function distances(res) {
    const perDim = new Map();
    let H = 0, M = 0;
    for (const t of res.flags) {
      if (t.f !== 'HIGH' && t.f !== 'MODERATE') continue;
      const d = TEST_MECHANISM[t.n] || '(unmapped)';
      const e = perDim.get(d) || { h: 0, m: 0 };
      if (t.f === 'HIGH') { e.h++; H++; } else { e.m++; M++; }
      perDim.set(d, e);
    }
    const total = H + M;
    let dist3 = total;                       // remove everything always works
    for (const [, e] of perDim) {
      const cost = (total - e.h - e.m) + Math.max(0, e.h - 1);
      if (cost < dist3) dist3 = cost;
    }
    return { H, M, total, dist3, dist0: total, dims: perDim.size };
  }
  console.log('OFFSET 0 — per sheet, per arm\n');
  console.log(`${pad('sheet', 42)}${pad('arm', 4)}${pad('sev', 9)}${pad('H', 9)}${pad('M', 9)}${pad('D', 7)}${pad('ran', 9)}${pad('n/a', 9)}moves`);
  for (const r of at0) {
    if (!r.ok) { console.log(`${pad(r.label.slice(0, 41), 42)}${pad(r.arm, 4)}UNMEASURED (capped or failed)`); continue; }
    const m = moves(r.a, r.x);
    console.log(`${pad(r.label.slice(0, 41), 42)}${pad(r.arm, 4)}` +
      `${pad(r.a.severity.severity + '->' + r.x.severity.severity, 9)}` +
      `${pad(r.a.severity.high + '->' + r.x.severity.high, 9)}` +
      `${pad(r.a.severity.mod + '->' + r.x.severity.mod, 9)}` +
      `${pad(r.a.severity.nFlaggedDimensions + '->' + r.x.severity.nFlaggedDimensions, 7)}` +
      `${pad(r.a.cov.ran + '->' + r.x.cov.ran, 9)}` +
      `${pad(r.a.cov.notApplicable + '->' + r.x.cov.notApplicable, 9)}${m.length}`);
  }

  console.log('\nTHE COUNTS THAT DECIDE IT (offset 0, arm B unless noted)\n');
  const b0 = at0.filter(r => r.arm === 'B' && r.ok);
  const sevMoved = b0.filter(r => r.a.severity.severity !== r.x.severity.severity);
  const anyMoved = b0.filter(r => moves(r.a, r.x).length > 0);
  const nothing = b0.filter(r => moves(r.a, r.x).length === 0 && r.a.severity.severity === r.x.severity.severity);
  const cross = b0.filter(r => (r.a.severity.severity === 0) !== (r.x.severity.severity === 0));
  console.log(`  sheets measured on arm B                 : ${b0.length} of ${at0.filter(r => r.arm === 'B').length}`);
  console.log(`  change severity at all                   : ${sevMoved.length}`);
  console.log(`     up: ${sevMoved.filter(r => r.x.severity.severity > r.a.severity.severity).length}   down: ${sevMoved.filter(r => r.x.severity.severity < r.a.severity.severity).length}`);
  console.log(`  cross the clean/flagged boundary         : ${cross.length}`);
  console.log(`  change at least one test flag            : ${anyMoved.length}`);
  console.log(`  change NOTHING (severity and every flag) : ${nothing.length}`);
  console.log(`  H rises / falls / holds                  : ${b0.filter(r => r.x.severity.high > r.a.severity.high).length} / ${b0.filter(r => r.x.severity.high < r.a.severity.high).length} / ${b0.filter(r => r.x.severity.high === r.a.severity.high).length}`);
  console.log(`  M rises / falls / holds                  : ${b0.filter(r => r.x.severity.mod > r.a.severity.mod).length} / ${b0.filter(r => r.x.severity.mod < r.a.severity.mod).length} / ${b0.filter(r => r.x.severity.mod === r.a.severity.mod).length}`);
  console.log(`  cov.ran rises / falls / holds            : ${b0.filter(r => r.x.cov.ran > r.a.cov.ran).length} / ${b0.filter(r => r.x.cov.ran < r.a.cov.ran).length} / ${b0.filter(r => r.x.cov.ran === r.a.cov.ran).length}`);

  console.log('\nDISTANCE TO A TIER BOUNDARY — flagged cells that would have to go\n');
  console.log(`${pad('sheet', 42)}${rpad('sevA', 5)}${rpad('distA<3', 9)}${rpad('distA=0', 9)}  |${rpad('sevB', 5)}${rpad('distB<3', 9)}${rpad('distB=0', 9)}${rpad('delta<3', 9)}`);
  let near = 0;
  for (const r of b0) {
    const da = distances(r.a), dx = distances(r.x);
    if (da.dist3 <= 2) near++;
    console.log(`${pad(r.label.slice(0, 41), 42)}${rpad(r.a.severity.severity, 5)}${rpad(da.dist3, 9)}${rpad(da.dist0, 9)}  |` +
      `${rpad(r.x.severity.severity, 5)}${rpad(dx.dist3, 9)}${rpad(dx.dist0, 9)}${rpad((dx.dist3 - da.dist3 >= 0 ? '+' : '') + (dx.dist3 - da.dist3), 9)}`);
  }
  console.log(`\n  sheets within 2 removals of dropping below severity 3 (arm A): ${near} of ${b0.length}`);

  console.log('\nWHICH TESTS ACCOUNT FOR THE MOVES (arm B, offset 0)\n');
  const perTest = new Map();
  for (const r of b0) for (const m of moves(r.a, r.x)) {
    const k = m.n;
    const e = perTest.get(k) || { n: 0, up: 0, down: 0, toNA: 0, fromNA: 0, sheets: [] };
    e.n++; e.sheets.push(r.label);
    if (m.fTo === 'N/A') e.toNA++;
    else if (m.fFrom === 'N/A') e.fromNA++;
    else if (RANK[m.fTo] > RANK[m.fFrom]) e.up++;
    else e.down++;
    perTest.set(k, e);
  }
  console.log(`${pad('test', 36)}${pad('family', 12)}${rpad('n', 4)}${rpad('up', 5)}${rpad('down', 6)}${rpad('->N/A', 7)}${rpad('N/A->', 7)}`);
  for (const [k, e] of [...perTest.entries()].sort((a, b) => b[1].n - a[1].n)) {
    const fam = TEST_MECHANISM[k] || '(unmapped)';
    console.log(`${pad(k.slice(0, 35), 36)}${pad(fam, 12)}${rpad(e.n, 4)}${rpad(e.up, 5)}${rpad(e.down, 6)}${rpad(e.toNA, 7)}${rpad(e.fromNA, 7)}`);
  }
  console.log('\nBY FAMILY\n');
  const perFam = new Map();
  for (const [k, e] of perTest) {
    const fam = TEST_MECHANISM[k] || '(unmapped)';
    const f = perFam.get(fam) || { n: 0, up: 0, down: 0, toNA: 0, fromNA: 0 };
    f.n += e.n; f.up += e.up; f.down += e.down; f.toNA += e.toNA; f.fromNA += e.fromNA;
    perFam.set(fam, f);
  }
  for (const [fam, f] of [...perFam.entries()].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`  ${pad(fam, 12)}${pad(MECHANISMS?.[fam]?.label || '', 30)}n ${rpad(f.n, 3)}  up ${rpad(f.up, 3)} down ${rpad(f.down, 3)} ->N/A ${rpad(f.toNA, 3)} N/A-> ${rpad(f.fromNA, 3)}`);
  }

  if (capped.length) {
    console.log('\nUNMEASURED\n');
    for (const r of capped) console.log(`  ${r.label}  arm ${r.arm}`);
  }

  // Multi-offset view, when present.
  const offs = [...new Set(rows.map(r => r.off))].sort((a, b) => a - b);
  if (offs.length > 1) {
    console.log(`\nSEED STABILITY — offsets ${offs.join(',')}\n`);
    for (const label of [...new Set(rows.map(r => r.label))]) {
      for (const arm of ['B', 'C', 'D']) {
        const rs = rows.filter(r => r.label === label && r.arm === arm && r.ok);
        if (!rs.length) continue;
        const sevA = [...new Set(rs.map(r => r.a.severity.severity))];
        const sevX = [...new Set(rs.map(r => r.x.severity.severity))];
        const mv = rs.map(r => moves(r.a, r.x).length);
        // Within-arm-A churn: how much arm A's own flag vector moves across seeds.
        const base = rs[0].a;
        const churnA = rs.map(r => moves(base, r.a).length);
        const churnX = rs.map(r => moves(rs[0].x, r.x).length);
        console.log(`  ${pad(label.slice(0, 44), 45)} arm${arm}  n=${rs.length}` +
          `  sevA {${sevA.join(',')}}  sev${arm} {${sevX.join(',')}}` +
          `  A->${arm} moves ${Math.min(...mv)}-${Math.max(...mv)}` +
          `  seed churn within A ${Math.max(...churnA)}  within ${arm} ${Math.max(...churnX)}`);
      }
    }
  }
}
