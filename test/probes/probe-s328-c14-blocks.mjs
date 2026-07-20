// S328 — does a cardinality guard on the sequence scan lose any of C14's
// duplicate measurement blocks?
//
// The question is no longer whether one pair is worth the scan cost. Chat's
// adjudication found 239 duplicate blocks over 488 rows, most spanning different
// STAND_IDs. If excluding Tree ID and CROWNCLASS from the scan loses any of
// them, a guard built that way is not viable.
//
// Everything here is measured on the PIPELINE's view of the sheet, which is not
// the workbook's. Ten of twenty-four columns never reach the matrix: STAND_ID is
// a label, Species and DamageSev are conditions, and seven measurement columns
// (ring count, DBH, tree basal area and others) are held out as group
// attributes. So the pipeline agrees on fewer columns than a direct read does,
// and a difference from Chat's figures is expected.
//
// BLOCK_SCAN_LIMIT is lifted in a run-time copy of the real source so the scan
// completes on 9,398 rows. Nothing in src/ is modified.
//
// Usage: node test/probes/probe-s328-c14-blocks.mjs

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

import { extractAnalysisInputs } from '../../src/analysis/engine.js';
import { inferBaseRoles, detectGroupAttributes } from '../../src/import/roles.js';
import { preprocessRaw, detectHeaderRows, detectBlocks } from '../../src/import/parser.js';
import { parseExcel } from '../../src/import/excel.js';
import { detectAssay, ASSAY_DATATYPE_MAP } from '../../src/constants/assays.js';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const SRC = join(REPO, 'src', 'tests');
const PATH = '/Users/hedgehog/Projects/check-my-data/corpus-data/C14.xlsx';
const TMP = mkdtempSync(join(tmpdir(), 's328-blocks-'));

// The four columns Chat's census treated as identifiers.
const ID_NAMES = new Set(['STAND_ID', 'ACTIVITY_ID', 'PLOT_ID', 'Tree ID']);
// The two categorical columns a guard would target.
const CATEGORICAL = new Set(['Tree ID', 'CROWNCLASS']);

async function loadScan() {
  const src = readFileSync(join(SRC, 'sequentialDuplication.js'), 'utf-8');
  const needle = 'const BLOCK_SCAN_LIMIT = 5000;';
  if (src.split(needle).length - 1 !== 1) throw new Error('guard token not unique');
  const patched = src
    .replace(needle, 'const BLOCK_SCAN_LIMIT = Infinity;')
    .replace('sequences: kept.slice(0, 50),', 'sequences: kept.slice(0, 50), _allKept: kept,')
    .replace(/from ["']\.\.\/([^"']+)["']/g, (_, p) => `from "${pathToFileURL(join(SRC, '..', p)).href}"`);
  const out = join(TMP, 'scan.js'); writeFileSync(out, patched);
  return await import(pathToFileURL(out).href);
}

// ── Load, keeping the raw rows alongside so STAND_ID stays reachable ──
const { rows } = await parseExcel(new Blob([readFileSync(PATH)]), 'Data');
const prep = preprocessRaw(rows);
let br = prep.rows;
const bl = detectBlocks(br); if (bl.length > 1) br = bl[0];
const maxC = br.reduce((m, r) => Math.max(m, r.length), 0);
const pad = r => { const o = [...r]; while (o.length < maxC) o.push(null); return o; };
const hdrs = pad(br[0]).map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
const data = br.slice(1).map(pad);
const baseRoles = inferBaseRoles(data, hdrs, null);
const { roles } = detectGroupAttributes(data, baseRoles);
const auto = detectAssay(basename(PATH), hdrs);
const assay = auto ? auto.assay : 'general';
const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
const { matrix, filteredIndices } = extractAnalysisInputs({
  data, roles, hdrs, condPerCol: null, zeroAsMissing: false, assay, dataType,
  fileName: PATH, colRelationship: 'replicates', rowSemantics: 'ordered' });

const dataCols = roles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);
const colName = mc => hdrs[dataCols[mc]];
const nR = matrix.length, nC = matrix[0].length;
const standIdCol = hdrs.indexOf('STAND_ID');
const standIdOf = mrow => data[filteredIndices[mrow]][standIdCol];
const FILE_ROW = 2;   // matrix row + 2 = sheet row (1 header, 1-indexed)

// Measurement columns: matrix columns that are not identifiers.
const measCols = [];
for (let c = 0; c < nC; c++) if (!ID_NAMES.has(colName(c))) measCols.push(c);

console.log('S328 — C14 duplicate measurement blocks, pipeline view');
console.log(`  sheet Data: ${data.length} data rows x ${maxC} columns`);
console.log(`  analysis matrix: ${nR} rows x ${nC} data columns (${data.length - nR} rows dropped at import)`);
console.log(`  columns the pipeline never sees: ${maxC - nC} of ${maxC}`);
console.log(`     ${hdrs.filter((h, i) => roles[i] !== 'data').map((h, i) => h).join(', ')}`);
console.log(`  measurement columns used for the census (${measCols.length}): ${measCols.map(colName).join(', ')}`);

// ── 1. Block census ────────────────────────────────────────────────
function census(cols) {
  const byKey = new Map();
  for (let r = 0; r < nR; r++) {
    // A row of all nulls across the measured columns is not evidence of anything.
    let anyVal = false;
    const key = cols.map(c => { const v = matrix[r][c]; if (v != null) anyVal = true; return v == null ? '~' : v; }).join('|');
    if (!anyVal) continue;
    let a = byKey.get(key); if (!a) { a = []; byKey.set(key, a); }
    a.push(r);
  }
  return [...byKey.values()].filter(g => g.length >= 2);
}

const blocks = census(measCols);
const sizes = {};
let covered = 0;
for (const b of blocks) { sizes[b.length] = (sizes[b.length] || 0) + 1; covered += b.length; }

let crossStand = 0, crossPlot = 0, crossTree = 0, adjacent = 0, maxGap = 0;
const plotCol = dataCols.indexOf(hdrs.indexOf('PLOT_ID'));
const treeCol = dataCols.indexOf(hdrs.indexOf('Tree ID'));
for (const b of blocks) {
  if (new Set(b.map(standIdOf)).size > 1) crossStand++;
  if (new Set(b.map(r => matrix[r][plotCol])).size > 1) crossPlot++;
  if (new Set(b.map(r => matrix[r][treeCol])).size > 1) crossTree++;
  const gaps = b.slice(1).map((r, i) => r - b[i]);
  if (gaps.every(g => g === 1)) adjacent++;
  maxGap = Math.max(maxGap, ...gaps);
}

console.log(`\n${'='.repeat(70)}\n1. BLOCK CENSUS (pipeline view)\n${'='.repeat(70)}`);
console.log(`  duplicate blocks           : ${blocks.length}`);
console.log(`  rows covered               : ${covered}`);
console.log(`  size distribution          : ${Object.entries(sizes).sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${v}x size ${k}`).join(', ')}`);
console.log(`  span different STAND_IDs   : ${crossStand}`);
console.log(`  span different PLOT_IDs    : ${crossPlot}`);
console.log(`  span different Tree IDs    : ${crossTree}`);
console.log(`  fully adjacent             : ${adjacent}`);
console.log(`  largest gap between members: ${maxGap} rows`);

// The adjudicated pair, in sheet rows.
const adjPair = blocks.find(b => b.some(r => r + FILE_ROW === 262) && b.some(r => r + FILE_ROW === 263));
console.log(`  adjudicated pair 262<->263 present: ${adjPair ? 'YES' : 'no'}`);

// ── Sequence scan ──────────────────────────────────────────────────
const scan = await loadScan();
const res = scan.testSequentialDuplication(matrix, assay);
const kept = res._allKept;

// Two predicates, because the loose one is misleading and the difference is the
// finding. With 83,502 kept sequences spanning up to 46 rows each, mere overlap
// with a 2-row block happens by chance almost everywhere — "touched" says the
// tool reported something near the block, not that it reported the block.
//
// TOUCHES: any member row falls inside the sequence's source or destination
//   range. Reported for contrast only.
// EXPLAINS: the sequence's offset equals the gap between two members, AND one
//   member sits in the source range while the other sits in the destination
//   range. That is the sequence actually mapping one member onto the other —
//   the tool pointing at this duplicate rather than past it.
function coverageByColumn(excludeCols, mode) {
  const excl = new Set(excludeCols);
  const live = kept.filter(s => !excl.has(s.col));
  const blockCols = blocks.map(() => new Set());
  for (const s of live) {
    for (let bi = 0; bi < blocks.length; bi++) {
      const rowsB = blocks[bi];
      let hit = false;
      if (mode === 'touches') {
        hit = rowsB.some(r =>
          (r >= s.srcRows[0] && r <= s.srcRows[1]) || (r >= s.dstRows[0] && r <= s.dstRows[1]));
      } else {
        for (let a = 0; a < rowsB.length && !hit; a++) {
          for (let b = a + 1; b < rowsB.length && !hit; b++) {
            const m1 = rowsB[a], m2 = rowsB[b];
            if (s.offset !== m2 - m1) continue;
            if (m1 >= s.srcRows[0] && m1 <= s.srcRows[1] &&
                m2 >= s.dstRows[0] && m2 <= s.dstRows[1]) hit = true;
          }
        }
      }
      if (hit) blockCols[bi].add(s.col);
    }
  }
  return blockCols;
}

const catCols = [];
for (let c = 0; c < nC; c++) if (CATEGORICAL.has(colName(c))) catCols.push(c);

console.log(`\n${'='.repeat(70)}\n3. WHAT THE TOOL REPORTS, AND WHICH BLOCKS IT TOUCHES\n${'='.repeat(70)}`);
console.log(`  Sequential Duplication: flag=${res.flag} primaryP=${res.primaryP} kept sequences=${res.nSequences}`);
const looseAll = coverageByColumn([], 'touches');
const covAll = coverageByColumn([], 'explains');
const touchedAll = looseAll.filter(s => s.size > 0).length;
const explainedAll = covAll.filter(s => s.size > 0).length;
console.log(`  blocks merely TOUCHED by some sequence  : ${touchedAll} of ${blocks.length}   (loose — near-certain by chance)`);
console.log(`  blocks actually EXPLAINED by a sequence : ${explainedAll} of ${blocks.length}   (offset matches the member gap)`);
console.log(`  blocks the scan never maps              : ${blocks.length - explainedAll}`);

console.log(`\n${'='.repeat(70)}\n2 + 4. WITH Tree ID AND CROWNCLASS EXCLUDED\n${'='.repeat(70)}`);
console.log(`  excluded columns: ${catCols.map(colName).join(', ')}`);
const covNoCat = coverageByColumn(catCols, 'explains');
const touchedNoCat = covNoCat.filter(s => s.size > 0).length;
let lost = 0; const lostRows = [];
for (let i = 0; i < blocks.length; i++) {
  if (covAll[i].size > 0 && covNoCat[i].size === 0) { lost++; if (lostRows.length < 12) lostRows.push(blocks[i].map(r => r + FILE_ROW)); }
}
console.log(`  blocks explained with all columns  : ${explainedAll}`);
console.log(`  blocks explained without the two   : ${touchedNoCat}`);
console.log(`  blocks LOST by excluding them      : ${lost}`);
if (lost) console.log(`  first lost blocks (sheet rows)     : ${lostRows.map(b => b.join('+')).join(', ')}`);

// How many touched blocks depend on the pair at all.
let onlyCat = 0;
for (let i = 0; i < blocks.length; i++) {
  if (covAll[i].size === 0) continue;
  const cols = [...covAll[i]];
  if (cols.every(c => catCols.includes(c))) onlyCat++;
}
console.log(`  blocks whose only cover is those two columns: ${onlyCat}`);

// The adjudicated pair specifically — which columns explain it, and does it
// survive the exclusion? This is the block the adjudication turned on.
const adjIdx = blocks.findIndex(b => b.some(r => r + FILE_ROW === 262) && b.some(r => r + FILE_ROW === 263));
console.log(`\n  adjudicated pair, sheet rows 262 and 263:`);
if (adjIdx < 0) {
  console.log('     not present as a duplicate block on the pipeline view');
} else {
  const withAll = [...covAll[adjIdx]].map(colName);
  const without = [...covNoCat[adjIdx]].map(colName);
  console.log(`     explained by columns : ${withAll.length ? withAll.join(', ') : '(none — scan never maps it)'}`);
  console.log(`     after excluding the two: ${without.length ? without.join(', ') : 'LOST — nothing explains it'}`);
}

// Size profile of what is lost, so the loss is not read as all-pairs.
const lostSizes = {};
for (let i = 0; i < blocks.length; i++) {
  if (covAll[i].size > 0 && covNoCat[i].size === 0) {
    const n = blocks[i].length; lostSizes[n] = (lostSizes[n] || 0) + 1;
  }
}
console.log(`\n  size profile of the lost blocks: ${Object.entries(lostSizes).sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${v}x size ${k}`).join(', ') || 'none'}`);
let lostCrossStand = 0;
for (let i = 0; i < blocks.length; i++) {
  if (covAll[i].size > 0 && covNoCat[i].size === 0 && new Set(blocks[i].map(standIdOf)).size > 1) lostCrossStand++;
}
console.log(`  of the lost blocks, spanning different STAND_IDs: ${lostCrossStand}`);

// Does the OTHER detector cover what the sequence scan would lose? A block lost
// from Sequential Duplication is only a real loss if Duplicate Detection does
// not report it too. Duplicate Detection is unaffected by a guard on the
// sequence scan, so this is what decides whether the loss matters.
// Load a run-time copy with the evidence caps lifted. The capped return would
// only tell us what a reader sees; the question here is what the detector
// actually found, so the uncapped lists are what settle it. src/ is unmodified.
const ddSrc = readFileSync(join(SRC, 'duplicateDetection.js'), 'utf-8')
  .replace('partialRowLocs:partialRowLocs.slice(0,20),', 'partialRowLocs:partialRowLocs, _allPartial:partialRowLocs,')
  .replace('rowDupGroupList:rowDupGroupList.slice(0,20), withinRowLocs:withinRowLocs.slice(0,200),',
           'rowDupGroupList:rowDupGroupList, withinRowLocs:withinRowLocs,')
  .replace('groups:rowDupGroupList.slice(0,20).map(', 'groups:rowDupGroupList.map(')
  .replace(/from ["']\.\.\/([^"']+)["']/g, (_, q) => `from "${pathToFileURL(join(SRC, '..', q)).href}"`);
const ddOut = join(TMP, 'dd.js'); writeFileSync(ddOut, ddSrc);
const { testDuplicates } = await import(pathToFileURL(ddOut).href);
const dd = testDuplicates(matrix, matrix, null, assay);
const ddRows = new Set();
for (const g of (dd.groups || [])) for (const r of (g.rows || [])) ddRows.add(r);
for (const d of (dd.partialRowLocs || [])) { if (d.rowA != null) ddRows.add(d.rowA); if (d.rowB != null) ddRows.add(d.rowB); }
for (const d of (dd.withinRowLocs || [])) if (d.row != null) ddRows.add(d.row);

// A block counts as covered by Duplicate Detection when EVERY member row is
// named somewhere in its evidence — a pair is only reported if both halves are.
const ddCovers = blocks.map(b => b.every(r => ddRows.has(r)));

console.log(`\n${'='.repeat(70)}\nDOES DUPLICATE DETECTION COVER THE LOSS?\n${'='.repeat(70)}`);
console.log(`  Duplicate Detection: flag=${dd.flag} primaryP=${dd.primaryP}`);
// The returned evidence arrays are capped (groups and partialRowLocs at 20,
// withinRowLocs at 200), so what it REPORTS is far narrower than what it
// DETECTS. Both are given: detection decides whether a defect is found, the
// reported evidence decides whether a reader can see which rows.
console.log(`  detected, uncapped: ${dd.duplicateRows} rows in exact row-duplicate groups, ${dd.partialRowPairs} partial-row pairs`);
console.log(`  reported, capped  : ${ddRows.size} distinct rows across groups(<=20), partialRowLocs(<=20), withinRowLocs(<=200)`);
// Exact row-duplicate needs identity across ALL 14 matrix columns, ID columns
// included. A block that differs in PLOT_ID or Tree ID cannot be caught by it,
// however identical its measurements are. That is the structural limit.
let fullRowIdentical = 0;
for (const b of blocks) {
  const r0 = b[0];
  if (b.every(r => { for (let c = 0; c < nC; c++) if (matrix[r][c] !== matrix[r0][c]) return false; return true; })) fullRowIdentical++;
}
console.log(`  of the ${blocks.length} blocks, identical across ALL 14 columns (reachable by exact row-dup): ${fullRowIdentical}`);
console.log(`  the other ${blocks.length - fullRowIdentical} differ on an ID column, so exact row-dup cannot reach them`);
console.log(`  of all ${blocks.length} blocks, fully named in the capped evidence: ${ddCovers.filter(Boolean).length}`);
let lostAndUncovered = 0, lostButCovered = 0;
const stranded = [];
for (let i = 0; i < blocks.length; i++) {
  if (!(covAll[i].size > 0 && covNoCat[i].size === 0)) continue;
  if (ddCovers[i]) lostButCovered++;
  else { lostAndUncovered++; if (stranded.length < 12) stranded.push(blocks[i].map(r => r + FILE_ROW).join('+')); }
}
console.log(`\n  of the ${lostButCovered + lostAndUncovered} blocks the guard would lose from the sequence scan:`);
console.log(`     also reported by Duplicate Detection : ${lostButCovered}`);
console.log(`     reported by NOTHING afterwards       : ${lostAndUncovered}`);
if (stranded.length) console.log(`     stranded blocks (sheet rows): ${stranded.join(', ')}`);

// ── 5. Precedent predicate ─────────────────────────────────────────
console.log(`\n${'='.repeat(70)}\n5. THE DUPLICATE-DETECTION PREDICATE, APPLIED HERE\n${'='.repeat(70)}`);
console.log('  PARTIAL_ROW_CARD_FRAC = 0.02 — hold a column out when its largest');
console.log('  value group covers more than 2% of rows. Applied to every column:');
console.log('   col  name                       distinct   largest share   over 2%?');
for (let c = 0; c < nC; c++) {
  const freq = new Map(); let n = 0;
  for (let r = 0; r < nR; r++) { const v = matrix[r][c]; if (v == null) continue; freq.set(v, (freq.get(v) || 0) + 1); n++; }
  let maxG = 0; for (const k of freq.values()) if (k > maxG) maxG = k;
  const share = n ? maxG / n : 0;
  console.log(`   ${String(c).padStart(3)}  ${colName(c).slice(0,25).padEnd(26)} ${String(freq.size).padStart(7)}   ${(share*100).toFixed(2).padStart(11)}%   ${share > 0.02 ? 'HELD OUT' : 'kept'}`);
}
console.log('');
