// S327 probe — Missing Data Pattern on C16, the file whose column count crosses
// the pairwise-scan gate at missingDataPattern.js:58 (`if (nC <= 50)`).
//
// C16 is single-sheet, so the gate fires on the analysed sheet unambiguously.
// Dumps the returned object, the skip fields, and the narrative strings both
// consumers build, so the skipped path can be read rather than inferred.
//
// Also prints the verdict tier. The sweep will read that number, and it is
// worth having measured rather than recalled.
//
// Usage: node test/probes/probe-s327-missing-gate.mjs

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { extractAnalysisInputs } from '../../src/analysis/engine.js';
import { testMissingDataPattern } from '../../src/tests/missingDataPattern.js';
import { inferBaseRoles, detectGroupAttributes } from '../../src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } from '../../src/import/parser.js';
import { detectLongFormat } from '../../src/import/longFormat.js';
import { suggestRowSemantics } from '../../src/import/rowSemantics.js';
import { summarize } from '../../src/import/summary.js';
import { parseExcel } from '../../src/import/excel.js';
import { detectAssay, ASSAY_DATATYPE_MAP } from '../../src/constants/assays.js';
import { keyFinding } from '../../src/constants/keyFindingTemplates.js';
import { composeFinding } from '../../src/analysis/findingComposers.js';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Override with argv[2] to point at a sibling deposit (e.g. C16-update.xlsx).
const PATH = process.argv[2] || '/Users/hedgehog/Projects/check-my-data/corpus-data/C16.xlsx';
const GATE = 50;   // missingDataPattern.js:58

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
const isGenomics = assay === 'genomics' || assay === 'cell_count';
const zeroAsMissing = isGenomics && sum.zeros > sum.total * 0.1;
const rowSemantics = suggestRowSemantics({ assay, longFormatDetected }).value || 'ordered';

const { matrix, condCtx } = extractAnalysisInputs({
  data, roles, hdrs, condPerCol, zeroAsMissing,
  assay, dataType, fileName: PATH, colRelationship: 'replicates', rowSemantics,
});

const nR = matrix.length, nC = matrix[0]?.length || 0;

console.log('S327 probe — Missing Data Pattern on C16');
console.log(`  sheet                : ${JSON.stringify(sheetName)}`);
console.log(`  analysis matrix      : ${nR} rows x ${nC} data cols`);
console.log(`  assay / dataType     : ${assay} / ${dataType}`);
console.log(`  pairwise gate (<= ${GATE}) : ${nC > GATE ? `CROSSED — scan does not run (${nC} cols)` : 'not crossed — scan runs'}`);
console.log(`  condition context    : ${condCtx?.type || 'none'}, count=${condCtx?.count ?? 0}`);

// Direct null census on the analysis matrix — confirms the missing-rate gate
// reading is real and not an artefact of preprocessing or zeroAsMissing.
let nulls = 0, zeros = 0, finite = 0;
for (const row of matrix) for (const v of row) {
  if (v === null || v === undefined) nulls++;
  else if (v === 0) { zeros++; finite++; }
  else finite++;
}
console.log('\n── direct null census on the analysis matrix ──');
console.log(`  cells                : ${nR * nC}`);
console.log(`  null / undefined     : ${nulls}  (${(100 * nulls / (nR * nC)).toFixed(2)}%)`);
console.log(`  present              : ${finite}  (of which exact zeros: ${zeros})`);
console.log(`  zeroAsMissing        : ${zeroAsMissing}`);
console.log(`  missing-rate gate    : needs >= 1% and <= 50% to proceed past line 48/49`);

const r = testMissingDataPattern(matrix, condCtx, assay);

console.log('\n── verdict ──');
console.log(`  flag                 : ${r.flag}`);
console.log(`  primaryP             : ${r.primaryP}`);
console.log(`  nMissing / missRate  : ${r.nMissing} / ${r.missRate}`);

console.log('\n── sub-signal hit counts ──');
console.log(`  nPairwiseHits        : ${r.nPairwiseHits}`);
console.log(`  nCondHits            : ${r.nCondHits}`);
console.log(`  nBlockHits           : ${r.nBlockHits}`);

console.log('\n── skip-surfacing fields ──');
console.log(`  pairwiseScanSkipped  : ${JSON.stringify(r.pairwiseScanSkipped)}`);
console.log(`  pairwiseScanCols     : ${JSON.stringify(r.pairwiseScanCols)}`);
console.log(`  pairwiseScanColLimit : ${JSON.stringify(r.pairwiseScanColLimit)}`);

console.log('\n── narrative ──');
console.log(`  interpretation       : ${JSON.stringify(r.interpretation)}`);
console.log(`  description          : ${r.description}`);

console.log('\n── key-finding template (§3 summary) ──');
console.log(`  ${JSON.stringify(keyFinding(r, (x) => x))}`);

const composed = composeFinding(r, {});
console.log('\n── finding composer (§4 body) ──');
if (composed) {
  console.log(`  location : ${composed.location}`);
  for (const l of composed.evidenceLines) console.log(`  evidence : ${l}`);
} else {
  console.log('  (composer returned null)');
}
console.log('');
