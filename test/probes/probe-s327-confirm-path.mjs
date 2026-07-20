// S327 — the confirm path on C16.
//
// C16's default grouping is sixty singletons. rowGroups() returns null, so the
// four confirmed tests take their pooled fallback and come back with verdicts
// computed on a basis the user did not confirm.
//
// Reports, for every non-empty tick subset of C16's three condition columns:
//   - the group structure that subset produces
//   - whether rowGroups() yields a usable partition
//   - what each of the four tests returns after confirming that subset
//
// Enumerating all seven subsets answers the second question the dispatch asks:
// is there ANY tick set on this file that supports the tests, or does the user
// face a choice with no good option?
//
// Usage: node test/probes/probe-s327-confirm-path.mjs

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { extractAnalysisInputs } from '../../src/analysis/engine.js';
import { runConfirmedGroupedTests } from '../../src/analysis/confirmGrouping.js';
import { computeTrigger } from '../../src/analysis/groupingTrigger.js';
import { classifyCoverage } from '../../src/analysis/coverage.js';
import { detectVST } from '../../src/stats/vst.js';
import { inferBaseRoles, detectGroupAttributes } from '../../src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } from '../../src/import/parser.js';
import { detectLongFormat } from '../../src/import/longFormat.js';
import { suggestRowSemantics } from '../../src/import/rowSemantics.js';
import { summarize } from '../../src/import/summary.js';
import { parseExcel } from '../../src/import/excel.js';
import { detectAssay, ASSAY_DATATYPE_MAP } from '../../src/constants/assays.js';
import { MIN_OBS as GOF_MIN_OBS } from '../../src/tests/columnGof.js';
import { MIN_N as MODALITY_MIN_N } from '../../src/tests/modality.js';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const PATH = '/Users/hedgehog/Projects/check-my-data/corpus-data/C16.xlsx';
const FOUR = ['Mahalanobis Row Outlier', 'Entropy / Zipf Analysis', 'Column Goodness-of-Fit', 'Modality Test'];

function prepStructure(raw) {
  const prep = preprocessRaw(raw);
  const preprocessed = prep.rows;
  if (!preprocessed || !preprocessed.length) throw new Error('empty after preprocessing');
  const blocks = detectBlocks(preprocessed);
  let blockRows = blocks.length > 1 ? blocks[0] : preprocessed;
  const maxC0 = blockRows.reduce((m, r) => Math.max(m, r.length), 0);
  const minCells0 = Math.max(2, Math.ceil(maxC0 * 0.1));
  while (blockRows.length > 2) {
    const nb = blockRows[0].filter(v => v != null && String(v).trim() !== '').length;
    if (nb < minCells0) blockRows = blockRows.slice(1); else break;
  }
  const nH = detectHeaderRows(blockRows);
  const maxC = blockRows.reduce((m, r) => Math.max(m, r.length), 0);
  const pad = r => { const o = [...r]; while (o.length < maxC) o.push(null); return o; };
  let hdrs, data, condPerCol = null;
  if (nH === 0) {
    hdrs = Array.from({ length: maxC }, (_, i) => 'Col ' + (i + 1));
    data = blockRows.map(pad);
  } else if (nH === 1) {
    hdrs = pad(blockRows[0]).map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(1).map(pad);
  } else {
    const rawGR = pad(blockRows[0]), nameRow = pad(blockRows[1]);
    const groups = forwardFill(rawGR);
    condPerCol = new Array(maxC).fill(null);
    for (let i = 0; i < maxC; i++) {
      const g = groups[i] != null ? String(groups[i]).trim() : '';
      if (g) condPerCol[i] = g;
    }
    hdrs = nameRow.map((v, i) => v != null && String(v).trim() ? String(v).trim() : 'Col ' + (i + 1));
    data = blockRows.slice(2).map(pad);
  }
  const longFormatDetected = !!detectLongFormat(hdrs, data);
  const baseRoles = inferBaseRoles(data, hdrs, condPerCol);
  const { roles } = detectGroupAttributes(data, baseRoles);
  return { hdrs, data, condPerCol, roles, longFormatDetected };
}

const { rows, sheetName } = await parseExcel(new Blob([readFileSync(PATH)]), undefined);
const { hdrs, data, condPerCol, roles, longFormatDetected } = prepStructure(rows);

const auto = detectAssay(basename(PATH), hdrs);
const assay = auto ? auto.assay : 'general';
const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
const sum = summarize(data, roles, condPerCol, false);
const zeroAsMissing = false;
const rowSemantics = suggestRowSemantics({ assay, longFormatDetected }).value || 'ordered';

const config = { data, roles, hdrs, condPerCol, zeroAsMissing, assay, dataType,
  fileName: PATH, colRelationship: 'replicates', rowSemantics };
const { matrix, condCtx, filteredIndices } = extractAnalysisInputs(config);
const vst = detectVST(matrix, assay);

const condIdx = roles.map((r, i) => r === 'condition' ? i : -1).filter(i => i >= 0);
const condNames = condIdx.map(i => hdrs[i]);

console.log('S327 — confirm path on C16');
console.log(`  sheet                : ${JSON.stringify(sheetName)}`);
console.log(`  analysis matrix      : ${matrix.length} rows x ${matrix[0]?.length || 0} data cols`);
console.log(`  condition columns    : ${condNames.join(', ')}`);
console.log(`  declared minimums    : Column Goodness-of-Fit ${GOF_MIN_OBS} obs/group · Modality ${MODALITY_MIN_N} obs/group`);
console.log(`                         Entropy has no exported minimum (hardcoded per-column < 20, entropyTest.js:47)`);
console.log(`                         Mahalanobis MIN_COLS=3 is a COLUMN minimum, checked dataset-level`);

function sizesFor(set) {
  const t = computeTrigger({ data, roles, condColSet: set, filteredIndices });
  const s = [...t.sizes].sort((a, b) => a - b);
  const median = s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
  return { n: t.nGroups, median, min: s[0] ?? null, max: s[s.length - 1] ?? null };
}

// Usable partition for a tick set, as rowGroups() defines it.
function usableGroups(set) {
  const confirmedRoles = roles.map((r, i) => (r === 'condition' && !set.includes(i)) ? 'label' : r);
  const { condCtx: cc } = extractAnalysisInputs({
    data, roles: confirmedRoles, condPerCol: null, zeroAsMissing,
    colRelationship: 'replicates', dataColHeaders: null,
  });
  return cc?.rowGroups() || null;
}

// All non-empty subsets of the condition columns, smallest first.
const subsets = [];
for (let mask = 1; mask < (1 << condIdx.length); mask++) {
  const set = condIdx.filter((_, b) => mask & (1 << b));
  subsets.push(set);
}
subsets.sort((a, b) => a.length - b.length);

for (const set of subsets) {
  const names = set.map(i => hdrs[i]).join(' + ');
  const isDefault = set.length === condIdx.length;
  const st = sizesFor(set);
  const rg = usableGroups(set);
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`tick set: ${names}${isDefault ? '   ← DEFAULT (all condition columns ticked)' : ''}`);
  console.log(`  groups ${st.n}  ·  size median ${st.median} / min ${st.min} / max ${st.max}`);
  console.log(`  rowGroups() usable  : ${rg ? `${rg.length} groups of >=3 rows` : 'null — no usable partition'}`);
  if (rg) {
    const ok30 = rg.filter(g => (g.matrix?.length || 0) >= GOF_MIN_OBS).length;
    const ok50 = rg.filter(g => (g.matrix?.length || 0) >= MODALITY_MIN_N).length;
    console.log(`  groups >= ${GOF_MIN_OBS} rows (GoF) : ${ok30}`);
    console.log(`  groups >= ${MODALITY_MIN_N} rows (Modality): ${ok50}`);
  }
  const four = await runConfirmedGroupedTests({
    data, roles, condColSet: set, zeroAsMissing, assay, dataType, vst });
  console.log(`  after confirming this set:`);
  for (const n of FOUR) {
    const r = four.find(x => x.name === n);
    const p = typeof r?.primaryP === 'number' ? r.primaryP.toExponential(2) : '—';
    const state = classifyCoverage(r);
    const why = r?.flag === 'N/A' && r?.description ? `  — ${r.description}` : '';
    console.log(`     ${(r?.flag ?? '?').padEnd(9)} ${state.padEnd(14)} p=${String(p).padStart(9)}  ${n}${why}`);
  }
}
console.log('');
