/* S396 — incidence of the two role-inversion mechanisms.
   READ-ONLY. No src/ file is modified by this probe and none is written.

   Continues test/probes/probe-s395-role-inversion.mjs. Same instrument: the
   census path's own source text, exposed by test/probes/s395-corpus-run-hook.mjs.
   Neither predicate is reimplemented — `inferBaseRoles` and
   `detectGroupAttributes` are called, and this probe reports their INPUTS and
   OUTPUTS.

   Mechanism 1 (base pass, a 40-row sample). Stated before it is applied:
       a column carries M1 when its SHIPPED base role is `condition`, the
       40-row sample it was decided on has numeric fraction < 0.5, and the
       branch's OWN TWO TESTS evaluated on the FULL column do not return
       `condition`.
     The branch is `nf < 0.5` then `uniq <= 20 && uniq/n < 0.3 ? condition :
     label`. BOTH tests have to be carried to the full column: a first draft of
     this probe carried only `nf >= 0.5` and read 0 on pos-47, whose own columns
     are 68% the literal string "NA" so that even the full column has nf < 0.5.
     What the 40-row window misrepresents there is the DISTINCT COUNT, not the
     numeric fraction.
     Two sub-cases, reported separately because their consequences differ:
       m1A  full nf >= 0.5 — the branch would not fire at all, and the column
            would very likely be `data`.
       m1B  full nf < 0.5 but the distinct test fails — the branch still fires
            and returns `label`. The matrix does not gain a column; what goes
            away is a fabricated condition level.
     `inferBaseRoles` cannot be pointed at a full column — it slices to 40 rows
     — so those two tests are restated here. The SHIPPED-function corroboration
     is a second call on a stride-sampled copy of the same rows: a different
     40-row window, same code, reported separately and never merged.

   Mechanism 2 (§2.8, the whole column). A column held out as `attribute`
   because it is constant within some grouping key's levels. Read from
   `detectGroupAttributes`' own `groupings` provenance. The without-hold-out
   data-column count is obtained by REVERTING `attribute` to `data` on the
   shipped roles, never by re-deriving the rule.

   Modes:
     --pop thirty | usable   which population to walk (required)
     --detail                per-sheet dump
     --m1cols                every M1 column, with its numbers
     --out <path>            write the per-sheet records as JSON

   Usage:
     node --import ./test/probes/s395-corpus-run-hook.mjs \
          test/probes/probe-s396-inversion-incidence.mjs --pop thirty --detail
*/
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const flag = n => { const i = argv.indexOf('--' + n); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : undefined; };
const has = n => argv.includes('--' + n);

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const CR = await import(resolve(ROOT, 'scripts/corpus-run.mjs'));
if (typeof CR.prepStructure !== 'function') {
  console.error('The hook did not load. Run with:\n  node --import ./test/probes/s395-corpus-run-hook.mjs ' +
                'test/probes/probe-s396-inversion-incidence.mjs --pop thirty');
  process.exit(2);
}
const { inferBaseRoles } = await import(resolve(ROOT, 'src/import/roles.js'));
const { preprocessRaw, detectBlocks } = await import(resolve(ROOT, 'src/import/parser.js'));
const { parseExcel, getSheetNames } = await import(resolve(ROOT, 'src/import/excel.js'));
const Papa = (await import('papaparse')).default;

const ABBR = { data: 'Data', label: 'Label', condition: 'Cond', attribute: 'Attr', ignore: 'ign' };
const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);
const FILLED = v => v != null && String(v).trim() !== '';
// ImportView's own all-blank-row predicate, ImportView.jsx:188, applied to
// prepStructure's output. Note it tests `v!==""` and NOT trimmed-empty.
const IV_ROW_KEEP = r => r.some(v => v != null && v !== '');
const UNIQ_CAP = 5000;

// ── Populations ──────────────────────────────────────────────────────
// The thirty come from ROUND2-RUN-LOG.md §4, parsed rather than transcribed.
function readThirty() {
  const doc = readFileSync(resolve(ROOT, 'docs/shared/ROUND2-RUN-LOG.md'), 'utf8');
  const start = doc.indexOf('## 4 — The thirty');
  const end = doc.indexOf('## 5 — Counts');
  if (start < 0 || end < 0) throw new Error('ROUND2-RUN-LOG.md §4 or §5 heading not found.');
  const out = [];
  for (const line of doc.slice(start, end).split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(doi:[^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\/\s*(\d+)\s*\|/);
    if (!m) continue;
    out.push({ position: Number(m[1]), doi: m[2], file: m[3], sheet: m[4],
               sheetIndex1: Number(m[5]), sheetTotal: Number(m[6]),
               path: `corpus-data/round2/pos-${String(m[1]).padStart(2, '0')}/${m[3]}` });
  }
  return out;
}

// The 238 usable sheets: §12.4's first class, re-derived from the inventory
// rather than transcribed — passed, a numeric matrix, at least one valid row.
function readUsable() {
  const inv = JSON.parse(readFileSync(resolve(ROOT, 'corpus-out/round2-inventory.json'), 'utf8'));
  const out = [];
  for (const f of inv.files) {
    for (const s of f.sheets || []) {
      if (!s.passed) continue;
      if (!(s.validRows > 0 && s.nNumericDataCols > 0)) continue;
      out.push({ position: Number((f.path.match(/pos-(\d+)/) || [])[1]),
                 file: f.file, sheet: s.sheet, sheetIndex1: s.sheetIndex + 1,
                 sheetTotal: s.sheetTotal, path: f.path });
    }
  }
  return out;
}

// ── Read a sheet's raw matrix the way the census path does ───────────
async function rawOf(entry) {
  const abs = resolve(ROOT, entry.path);
  const ext = extname(abs).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    const blob = new Blob([readFileSync(abs)]);
    const { rows } = await parseExcel(blob, entry.sheet);
    // ImportView's own raw matrix for this sheet: S381 row 3 then row 4.
    const csvText = rows.map(r => r.map(v => v == null ? '' : (/[,"\n\r]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\n');
    const ivRaw = Papa.parse(csvText.trim(), { skipEmptyLines: false }).data;
    return { raw: rows, ivRaw, isExcel: true, abs };
  }
  const text = readFileSync(abs, 'utf-8');
  return { raw: Papa.parse(text, { header: false, skipEmptyLines: false }).data,
           ivRaw: Papa.parse(text.trim(), { skipEmptyLines: false }).data,
           isExcel: false, abs, text };
}

// ── ImportView's own raw matrix, replayed and MEASURED ───────────────
// Two S381 rows change the raw matrix before any shared code runs:
//   row 3  — loadExcelSheet (ImportView.jsx:280-283) re-serialises parseExcel's
//            rows to CSV text and re-parses them through PapaParse.
//   row 4  — parseAndLoad parses `text.trim()`; the harness parses `text`.
// Neither is in the census doc's §0.5 list of four; both are in S381's 33-row
// census, and S381 measured row 3 at zero differing cells on 41 sheets.
// Replaying two expressions is not a reimplementation of a rule, and the
// comparison below is what makes each a measurement rather than a class.
function excelRoundTrip(rows) {
  const csvText = rows.map(r => r.map(v => v == null ? '' : (/[,"\n\r]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(',')).join('\n');
  const back = Papa.parse(csvText.trim(), { skipEmptyLines: false }).data;
  let exact = rows.length === back.length, predicate = exact;
  const nR = Math.min(rows.length, back.length);
  for (let r = 0; r < nR; r++) {
    const a = rows[r] || [], b = back[r] || [];
    const nC = Math.max(a.length, b.length);
    for (let c = 0; c < nC; c++) {
      const av = a[c] == null ? '' : String(a[c]);
      const bv = b[c] == null ? '' : String(b[c]);
      if (av !== bv) { exact = false; if (FILLED(a[c]) !== FILLED(b[c]) || av.trim() !== bv.trim()) predicate = false; }
    }
  }
  return { exact, predicate, rowsBack: back.length };
}

// ── Per-column measurement ───────────────────────────────────────────
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
  // Dominant non-numeric token, measured. On pos-47 this is "NA" — the reason
  // both the window and the whole column read as non-numeric.
  let topTok = null, topN = 0;
  if (!capped) { for (const v of set) { /* set is values, not counts */ } }
  const counts = new Map();
  if (nonEmpty && numeric < nonEmpty) {
    for (const r of data) {
      const v = r[c];
      if (v == null || v === '' || !isNaN(Number(v))) continue;
      const k = String(v);
      const n = (counts.get(k) || 0) + 1;
      counts.set(k, n);
      if (n > topN) { topN = n; topTok = k; }
      if (counts.size > 50000) break;
    }
  }
  return { nSample: sample.length, sampleNf, sampleUniq,
           nonEmpty, fullNf: nonEmpty ? numeric / nonEmpty : null,
           fullUniq: capped ? UNIQ_CAP : set.size, fullUniqCapped: capped,
           popFrac: data.length ? nonEmpty / data.length : null,
           topTok, topTokFrac: nonEmpty ? topN / nonEmpty : null };
}

// ── One sheet ────────────────────────────────────────────────────────
async function measure(entry) {
  const { raw, ivRaw, isExcel } = await rawOf(entry);
  const rec = { ...entry, isExcel, rawRows: raw.length,
                rawCols: raw.reduce((m, r) => Math.max(m, r.length), 0) };

  // Shipped intermediates, so the preamble strip can be measured by arithmetic
  // over shipped outputs rather than by re-running its loop.
  const preprocessed = preprocessRaw(raw).rows;
  const blocks = detectBlocks(preprocessed);
  const blockRows = blocks.length > 1 ? blocks[0] : preprocessed;

  const s = CR.prepStructure(raw, undefined);
  const cfg = CR.buildAnalysisConfig({ entry: { path: resolve(ROOT, entry.path) }, hdrs: s.hdrs,
    data: s.data, condPerCol: s.condPerCol, roles: s.roles, longFormatDetected: s.longFormatDetected });
  const base = inferBaseRoles(s.data, s.hdrs, s.condPerCol);

  // Second window through the SHIPPED function: a stride sample of the same
  // rows, so inferBaseRoles' own slice(0,40) sees a spread window.
  const stride = Math.max(1, Math.floor(s.data.length / 40));
  const strided = stride > 1 ? s.data.filter((_, i) => i % stride === 0) : s.data;
  const baseStride = inferBaseRoles(strided, s.hdrs, s.condPerCol);

  rec.nH = s.nH; rec.nBlocks = s.nBlocks; rec.nRows = s.data.length;
  rec.nCols = s.hdrs.length; rec.assay = cfg.assay; rec.dataType = cfg.dataType;
  rec.longFormatDetected = s.longFormatDetected;
  rec.hdrs = s.hdrs.map(String);
  rec.base = base; rec.roles = s.roles; rec.baseStride = baseStride;
  rec.stride = stride;

  // ── Mechanism 1 ──
  rec.cols = [];
  rec.m1 = []; rec.m1A = []; rec.m1B = []; rec.m1stride = []; rec.strideMoved = [];
  for (let c = 0; c < s.hdrs.length; c++) {
    const st = colStats(s.data, c);
    rec.cols.push(st);
    // The branch's own two tests, carried to the full column.
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
    }
    // Shipped-function corroboration: a second 40-row window.
    if (base[c] === 'condition' && baseStride[c] !== 'condition') rec.strideMoved.push(c);
    if (base[c] === 'condition' && baseStride[c] === 'data') rec.m1stride.push(c);
  }

  // ── Mechanism 2 ──
  // groupings is detectGroupAttributes' own provenance; the without count is a
  // revert of the shipped roles, not a re-derivation.
  rec.groupings = (s.groupings || []).map(g => ({ groupCol: g.groupCol, groupHdr: String(s.hdrs[g.groupCol]),
    nLevels: g.nLevels, attrCols: g.attrCols, attrHdrs: g.attrCols.map(a => String(s.hdrs[a])) }));
  rec.attrCols = s.roles.map((r, i) => r === 'attribute' ? i : -1).filter(i => i >= 0);
  rec.m2 = rec.attrCols;
  const revert = s.roles.map(r => r === 'attribute' ? 'data' : r);
  rec.dataColsWith = s.roles.filter(r => r === 'data').length;
  rec.dataColsWithout = revert.filter(r => r === 'data').length;
  rec.baseDataCols = base.filter(r => r === 'data').length;
  rec.revertMatchesBase = rec.dataColsWithout === rec.baseDataCols;

  // ── Joint: which mechanism moved each column away from `data` ──
  // M1 moves a column that would otherwise be data at the base pass; M2 moves a
  // base-`data` column to `attribute`. They cannot both move the same column.
  rec.movedByM1 = rec.m1.length;
  rec.movedByM2 = rec.m2.length;
  rec.carries = (rec.m1.length ? 1 : 0) + (rec.m2.length ? 2 : 0); // 0 neither, 1 M1, 2 M2, 3 both

  // Data columns if NEITHER mechanism had moved anything. The M1 term is the
  // SHIPPED function's answer on a second window — never `m1.length`, because an
  // m1B column reads `label` on a fuller window and is not a data column either
  // way. m1A is reported beside it as the upper bound.
  rec.dataColsNeither = rec.dataColsWithout + rec.m1stride.length;
  rec.dataColsNeitherUpper = rec.dataColsWithout + rec.m1A.length;

  // ── Reachability classes (Part 2) ──
  const allBlankRows = s.data.filter(r => !IV_ROW_KEEP(r)).length;
  const preambleStripped = (blockRows.length - s.nH) - s.data.length;
  let blockBlankCols = 0;
  if (s.nBlocks > 1) {
    const maxC = blockRows.reduce((m, r) => Math.max(m, r.length), 0);
    for (let c = 0; c < maxC; c++) {
      let any = false;
      for (const r of blockRows) { if (FILLED(r[c])) { any = true; break; } }
      if (!any) blockBlankCols++;
    }
  }
  rec.div = {
    a_blankRowDrop: allBlankRows > 0,
    b1_preambleStripSingleBlock: s.nBlocks === 1 && preambleStripped > 0,
    b2_blankColDropMultiBlock: s.nBlocks > 1 && blockBlankCols > 0,
    c_twoRowHeader: s.nH === 2,
    d_longFormat: !!s.longFormatDetected && s.data.length > 20 && s.nH > 0,
    e_excelCsvRoundTrip: isExcel,
  };
  // Class (a) measured rather than classified: apply ImportView's own row filter
  // to prepStructure's output, re-run BOTH shipped predicates, compare roles.
  if (allBlankRows > 0) {
    const filtered = s.data.filter(IV_ROW_KEEP);
    const aBase = inferBaseRoles(filtered, s.hdrs, s.condPerCol);
    const { detectGroupAttributes } = await import(resolve(ROOT, 'src/import/roles.js'));
    const aFinal = detectGroupAttributes(filtered, aBase).roles;
    rec.aInert = JSON.stringify(aFinal) === JSON.stringify(s.roles) && JSON.stringify(aBase) === JSON.stringify(base);
  } else rec.aInert = null;
  rec.allBlankRows = allBlankRows;
  rec.preambleStripped = preambleStripped;
  rec.blockBlankCols = blockBlankCols;
  if (isExcel) rec.rt = excelRoundTrip(raw);
  // Classes e and f both hand a possibly-different RAW matrix to the same prep.
  // Measure at ROLE level, not cell level: run the shipped prepStructure on
  // ImportView's own raw matrix and compare what the census would report.
  let ivSame = null;
  try {
    const ivPrep = CR.prepStructure(ivRaw, undefined);
    ivSame = JSON.stringify(ivPrep.roles) === JSON.stringify(s.roles)
          && JSON.stringify(ivPrep.hdrs.map(String)) === JSON.stringify(s.hdrs.map(String))
          && ivPrep.nH === s.nH && ivPrep.data.length === s.data.length;
  } catch (e) { ivSame = false; rec.ivPrepError = e.message; }
  rec.ivSame = ivSame;
  rec.div.f_csvTrim = !isExcel;                 // S381 row 4, every CSV
  rec.eInert = isExcel ? ivSame : null;         // S381 row 3 + row 4, role level
  rec.fInert = isExcel ? null : ivSame;         // S381 row 4 alone, role level
  rec.divergentClasses = Object.entries(rec.div)
    .filter(([k, v]) => v
      && !(k === 'e_excelCsvRoundTrip' && rec.eInert)
      && !(k === 'f_csvTrim' && rec.fInert)
      && !(k === 'a_blankRowDrop' && rec.aInert))
    .map(([k]) => k);
  rec.divergent = rec.divergentClasses.length > 0;
  return rec;
}

// ── Drive ────────────────────────────────────────────────────────────
// The 27 batch fixtures, so the same corrected predicates are re-run over the
// population S395 Part 1 already read. A cross-check, not a new population.
async function readFixtures() {
  const { EXPECTED } = await import(resolve(ROOT, 'test/batch-fixtures.mjs'));
  return Object.keys(EXPECTED).map(n => ({ file: n, sheet: n, sheetIndex1: 1, sheetTotal: 1,
                                           path: `test/fixtures/${n}` }));
}

const POP = flag('pop');
if (!POP || !['thirty', 'usable', 'fixtures'].includes(POP)) {
  console.error('Pass --pop thirty | --pop usable | --pop fixtures'); process.exit(2);
}
const entries = POP === 'thirty' ? readThirty() : POP === 'usable' ? readUsable() : await readFixtures();
console.log(`POPULATION: ${POP} — ${entries.length} sheets\n`);
if (POP === 'thirty' && entries.length !== 30) { console.error(`§4 parsed ${entries.length} rows, expected 30.`); process.exit(2); }
if (POP === 'usable' && entries.length !== 238) { console.error(`usable derived ${entries.length}, §12.4 records 238.`); process.exit(2); }
if (POP === 'fixtures' && entries.length !== 27) { console.error(`fixtures derived ${entries.length}, expected 27.`); process.exit(2); }

const recs = [];
for (const e of entries) {
  try { recs.push(await measure(e)); }
  catch (err) { console.log(`  ✗ ${e.path} [${e.sheet}]: ${err.message}`); recs.push({ ...e, error: err.message }); }
}
const ok = recs.filter(r => !r.error);

// ── Part 2 report ────────────────────────────────────────────────────
console.log('PART 2 — reachability: does the census path speak for the screen\n');
const CLASSES = [
  ['a_blankRowDrop', 'all-blank data row dropped by ImportView, kept by prepStructure'],
  ['b1_preambleStripSingleBlock', 'preamble strip acts, single block — prepStructure only'],
  ['b2_blankColDropMultiBlock', 'all-blank column in the block, multi-block — ImportView only'],
  ['c_twoRowHeader', 'two-row header — different condPerCol construction'],
  ['d_longFormat', 'long-format detected — ImportView returns before inferring roles'],
  ['e_excelCsvRoundTrip', 'S381 row 3 — Excel re-serialised to CSV and re-parsed, then row 4'],
  ['f_csvTrim', 'S381 row 4 — the app parses text.trim(), the harness parses text'],
];
for (const [k, desc] of CLASSES) {
  const n = ok.filter(r => r.div[k]).length;
  const extra = k === 'e_excelCsvRoundTrip'
    ? `  (of which prepStructure output identical: ${ok.filter(r => r.div[k] && r.eInert).length})`
    : k === 'f_csvTrim'
    ? `  (of which prepStructure output identical: ${ok.filter(r => r.div[k] && r.fInert).length})`
    : k === 'a_blankRowDrop'
    ? `  (of which roles identical after applying ImportView's own filter: ${ok.filter(r => r.div[k] && r.aInert).length})` : '';
  console.log(`  ${pad(k, 30)} ${rpad(n, 4)}  ${desc}${extra}`);
}
const divergent = ok.filter(r => r.divergent);
const onDivergentPath = ok.filter(r => Object.values(r.div).some(Boolean));
console.log(`\n  on a divergent PATH (any class fires)        : ${onDivergentPath.length} / ${ok.length}`);
console.log(`  ... measured inert (classes a, e, f)         : ${onDivergentPath.length - divergent.length}`);
console.log(`  census speaks for the screen : ${ok.length - divergent.length} / ${ok.length}`);
console.log(`  DIVERGENT                    : ${divergent.length} / ${ok.length}  (${(100 * divergent.length / ok.length).toFixed(1)}%)`);
if (divergent.length) {
  console.log('  divergent sheets:');
  for (const r of divergent) console.log(`    ${pad((r.position != null ? 'pos-' + String(r.position).padStart(2, '0') + ' ' : '') + r.file + ' [' + r.sheet + ']', 62)} ${r.divergentClasses.join(', ')}`);
}

// ── Part 3 report ────────────────────────────────────────────────────
const FLOOR = 2;
const carries1 = ok.filter(r => r.m1.length > 0);
const carries2 = ok.filter(r => r.m2.length > 0);
const both = ok.filter(r => r.m1.length > 0 && r.m2.length > 0);
const neither = ok.filter(r => r.m1.length === 0 && r.m2.length === 0);
const passFloor = ok.filter(r => r.dataColsWith >= FLOOR);
const passFloorInverted = passFloor.filter(r => r.m1.length > 0 || r.m2.length > 0);
const invertedIntoRefusal = ok.filter(r => r.dataColsNeither >= FLOOR && r.dataColsWith < FLOOR);
const refusalByM2Only = invertedIntoRefusal.filter(r => r.dataColsWithout >= FLOOR);

console.log('\nPART 3 — incidence\n');
console.log(`  sheets measured                          : ${ok.length}${recs.length !== ok.length ? ` (${recs.length - ok.length} threw)` : ''}`);
console.log(`  carry mechanism 1 (mis-sampled column)   : ${carries1.length}`);
console.log(`    ... sub-case m1A (full column majority-numeric): ${ok.filter(r => r.m1A.length > 0).length} sheets, ${ok.reduce((a, r) => a + r.m1A.length, 0)} columns`);
console.log(`    ... sub-case m1B (would read \`label\` on the full column): ${ok.filter(r => r.m1B.length > 0).length} sheets, ${ok.reduce((a, r) => a + r.m1B.length, 0)} columns`);
console.log(`  carry mechanism 2 (§2.8 hold-out)        : ${carries2.length}`);
console.log(`  carry both                               : ${both.length}`);
console.log(`  carry neither                            : ${neither.length}`);
console.log(`  shipped 2nd window: base Cond -> data    : ${ok.filter(r => r.m1stride.length > 0).length} sheets, ${ok.reduce((a, r) => a + r.m1stride.length, 0)} columns`);
console.log(`  shipped 2nd window: base Cond -> anything : ${ok.filter(r => r.strideMoved.length > 0).length} sheets, ${ok.reduce((a, r) => a + r.strideMoved.length, 0)} columns`);
console.log('');
console.log(`  data columns >= ${FLOOR} as shipped (pass the floor) : ${passFloor.length}`);
console.log(`  ... of those, inverted by either mechanism        : ${passFloorInverted.length}   <-- PRICES ARM B`);
console.log(`        M1 only : ${passFloor.filter(r => r.m1.length && !r.m2.length).length}` +
            `   M2 only : ${passFloor.filter(r => !r.m1.length && r.m2.length).length}` +
            `   both : ${passFloor.filter(r => r.m1.length && r.m2.length).length}`);
console.log(`      ... of those, losing at least one DATA column     : ${passFloor.filter(r => r.m2.length > 0 || r.m1stride.length > 0).length}`);
console.log(`      ... the rest gain a fabricated condition level only: ${passFloorInverted.length - passFloor.filter(r => r.m2.length > 0 || r.m1stride.length > 0).length}`);
console.log(`  inverted INTO refusal (>=${FLOOR} without, <${FLOOR} with)      : ${invertedIntoRefusal.length}`);
console.log(`      (upper bound using m1A instead of the 2nd window) : ${ok.filter(r => r.dataColsNeitherUpper >= FLOOR && r.dataColsWith < FLOOR).length}`);
console.log(`  ... of which §2.8 alone is the cause              : ${refusalByM2Only.length}`);
console.log('');
console.log('');
console.log('  WHAT M1 COSTS, split — a column read `condition` that the full column reads');
console.log('  `label` never enters the matrix either way. What it does is fabricate a');
console.log('  condition level. Only a column with real numeric content is a lost measurement.');
const m1cols = ok.flatMap(r => r.m1.map(c => r.cols[c]));
console.log(`    M1 columns, total                      : ${m1cols.length}`);
console.log(`    ... with zero numeric content (fullNf 0): ${m1cols.filter(x => x.fullNf === 0).length}`);
console.log(`    ... with any numeric content (fullNf > 0): ${m1cols.filter(x => x.fullNf > 0).length}`);
console.log(`    ... majority-numeric (fullNf >= 0.5)    : ${m1cols.filter(x => x.fullNf >= 0.5).length}`);
const condWith = ok.reduce((a, r) => a + r.roles.filter(x => x === 'condition').length, 0);
console.log(`    condition columns as shipped            : ${condWith}`);
console.log(`    ... of which carry M1                   : ${ok.reduce((a, r) => a + r.m1.length, 0)}`);
// Missing-marker census. The list is stated here rather than inferred: these are
// the tokens a spreadsheet or an R export writes for a missing cell, and
// Number() returns NaN for every one, so each counts as non-numeric.
const MISSING = new Set(['NA', 'na', 'N/A', 'n/a', '#N/A', 'NaN', 'nan', 'NULL', 'null', 'None', 'none',
                         '.', '-', '--', 'missing', 'MISSING', '?', 'ND', 'nd', 'n.d.', 'Inf', '-Inf']);
const m1missing = m1cols.filter(x => x.topTok != null && MISSING.has(String(x.topTok).trim()));
console.log(`    ... whose dominant non-numeric token is a`);
console.log(`        missing marker (NA, NULL, ., -, ND …)  : ${m1missing.length}`);
console.log('');
console.log(`  total columns carrying M1                : ${ok.reduce((a, r) => a + r.m1.length, 0)}`);
console.log(`  total columns held out by §2.8           : ${ok.reduce((a, r) => a + r.m2.length, 0)}`);
console.log(`  revert == base data count on every sheet : ${ok.every(r => r.revertMatchesBase) ? 'yes' : 'NO — ' + ok.filter(r => !r.revertMatchesBase).length + ' disagree'}`);

if (has('detail')) {
  console.log('\nPER SHEET\n');
  console.log(`${pad('sheet', 56)}${rpad('rows', 7)}${rpad('cols', 5)}${rpad('nH', 3)}${rpad('blk', 4)}${rpad('dCols', 6)}${rpad('w/o', 5)}${rpad('nei', 5)}${rpad('M1', 4)}${rpad('M2', 4)}  div`);
  for (const r of ok) {
    const nm = (r.position != null ? 'pos-' + String(r.position).padStart(2, '0') + ' ' : '') + r.file + (r.sheet !== r.file ? ` [${r.sheet}]` : '');
    console.log(`${pad(nm.slice(0, 55), 56)}${rpad(r.nRows, 7)}${rpad(r.nCols, 5)}${rpad(r.nH, 3)}${rpad(r.nBlocks, 4)}` +
      `${rpad(r.dataColsWith, 6)}${rpad(r.dataColsWithout, 5)}${rpad(r.dataColsNeither, 5)}${rpad(r.m1.length, 4)}${rpad(r.m2.length, 4)}  ${r.divergentClasses.join(',') || '-'}`);
  }
}

if (has('m1cols')) {
  console.log('\nEVERY COLUMN CARRYING MECHANISM 1\n');
  console.log(`${pad('sheet', 44)}${pad('column', 22)}${rpad('nS', 4)}${rpad('sNf', 7)}${rpad('sUniq', 7)}${rpad('fullNf', 8)}${rpad('fullUniq', 10)}${rpad('pop', 6)}  ${pad('fullBranch', 16)}${pad('2ndWin', 6)}top non-numeric token`);
  for (const r of ok) {
    for (const c of r.m1) {
      const st = r.cols[c];
      const nm = (r.position != null ? 'pos-' + String(r.position).padStart(2, '0') + ' ' : '') + r.file;
      console.log(`${pad(nm.slice(0, 43), 44)}${pad(String(r.hdrs[c]).slice(0, 21), 22)}${rpad(st.nSample, 4)}` +
        `${rpad(st.sampleNf.toFixed(2), 7)}${rpad(st.sampleUniq, 7)}${rpad(st.fullNf.toFixed(2), 8)}` +
        `${rpad(st.fullUniq + (st.fullUniqCapped ? '+' : ''), 10)}${rpad(st.popFrac.toFixed(2), 6)}  ` +
        `${pad(st.fullBranch, 16)}${pad(ABBR[r.baseStride[c]], 6)}${st.topTok == null ? '' : `"${String(st.topTok).slice(0, 12)}" ${(100 * st.topTokFrac).toFixed(0)}%`}`);
    }
  }
}

if (has('m1cols')) {
  const anyA = ok.some(r => r.m1A.length) || ok.some(r => r.m1stride.length);
  if (anyA) {
    console.log('\nSUB-CASE m1A (full column majority-numeric) AND 2nd-window-says-data\n');
    for (const r of ok) {
      for (const c of r.m1A) {
        const st = r.cols[c];
        console.log(`  m1A   ${pad((r.position != null ? 'pos-' + String(r.position).padStart(2, '0') + ' ' : '') + r.file, 46)}${pad(String(r.hdrs[c]).slice(0, 24), 25)} fullNf ${st.fullNf.toFixed(2)}  2ndWin ${ABBR[r.baseStride[c]]}  top "${st.topTok}"`);
      }
      for (const c of r.m1stride) {
        const st = r.cols[c];
        console.log(`  win   ${pad((r.position != null ? 'pos-' + String(r.position).padStart(2, '0') + ' ' : '') + r.file, 46)}${pad(String(r.hdrs[c]).slice(0, 24), 25)} fullNf ${st.fullNf.toFixed(2)}  2ndWin data  top "${st.topTok}"`);
      }
    }
  }
}

if (has('refusal')) {
  console.log('\nSHEETS INVERTED INTO REFUSAL (>= 2 data columns without the mechanism, < 2 with)\n');
  for (const r of invertedIntoRefusal) {
    const nm = (r.position != null ? 'pos-' + String(r.position).padStart(2, '0') + ' ' : '') + r.file + (r.sheet !== r.file ? ` [${r.sheet}]` : '');
    console.log(`  ${pad(nm.slice(0, 60), 62)} data cols ${r.dataColsWith} shipped / ${r.dataColsWithout} without §2.8 / ${r.dataColsNeither} without either`);
    for (const g of r.groupings) console.log(`      ${g.groupHdr} (${g.nLevels} levels) holds: ${g.attrHdrs.join(', ')}`);
  }
}

if (has('m2detail')) {
  console.log('\nEVERY GROUPING KEY THAT FIRES\n');
  for (const r of ok) {
    if (!r.groupings.length) continue;
    const nm = (r.position != null ? 'pos-' + String(r.position).padStart(2, '0') + ' ' : '') + r.file + (r.sheet !== r.file ? ` [${r.sheet}]` : '');
    console.log(`${nm}   data cols ${r.dataColsWith} with / ${r.dataColsWithout} without`);
    for (const g of r.groupings) console.log(`    ${g.groupHdr} (${g.nLevels} levels) holds: ${g.attrHdrs.join(', ')}`);
  }
}

const outPath = flag('out');
if (typeof outPath === 'string') {
  writeFileSync(resolve(ROOT, outPath), JSON.stringify({ population: POP, generatedBy: 'test/probes/probe-s396-inversion-incidence.mjs', records: recs }, null, 1));
  console.log(`\nwrote ${outPath}`);
}
