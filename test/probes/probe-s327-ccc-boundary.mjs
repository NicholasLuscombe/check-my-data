// S327 probe A — does any of C10 / C14 / C25 cross the Cross-Condition
// Consistency permutation tier boundary at crossConditionConsistency.js:166?
//
//   const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;
//
// maxN is the largest per-condition count of NON-NULL VALUES (conditionN), not
// the file's row count — so the question cannot be answered from row counts.
// Two-sided p2 = min(1, 2 * min(pUpper, pLower)), each side floored at
// 1/(B+1), so the attainable floor is 2/(B+1). Against ALPHA.NOTE = 0.01,
// B = 199 gives a floor of exactly 0.01, and 0.01 < 0.01 is false — MODERATE
// becomes unreachable. At B = 499 the floor is 0.004, MODERATE reachable.
//
// Sheets are the PubPeer-flagged ones per REALWORLD-CORPUS-SPEC.md's run
// protocol (§ "Run protocol (settled at C25)"), NOT the widest sheet in each
// workbook. That distinction is the whole point: C10's widest sheet is 16,522
// rows but its flagged tab is far smaller.
//
// Reports measurements only. Draws no conclusion the numbers do not carry.
//
// Usage: node test/probes/probe-s327-ccc-boundary.mjs

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { extractAnalysisInputs } from '../../src/analysis/engine.js';
import { inferBaseRoles, detectGroupAttributes } from '../../src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } from '../../src/import/parser.js';
import { detectLongFormat } from '../../src/import/longFormat.js';
import { suggestRowSemantics } from '../../src/import/rowSemantics.js';
import { summarize } from '../../src/import/summary.js';
import { parseExcel } from '../../src/import/excel.js';
import { detectAssay, ASSAY_DATATYPE_MAP } from '../../src/constants/assays.js';
import { ALPHA } from '../../src/constants/thresholds.js';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const CORPUS = '/Users/hedgehog/Projects/check-my-data/corpus-data';

// Flagged sheet per REALWORLD-CORPUS-SPEC.md:
//   C10 — PubPeer names "the tab for P. megatetrium Experiment 1" (spec L33)
//   C14 — "Data" sheet (spec L153, L245)
//   C25 — "Fig. 2b" (spec L271: "Flagged sheet: Fig. 2b")
const TARGETS = [
  { file: 'C10.xlsx', sheet: 'P. megatetrium Experiment1' },
  { file: 'C14.xlsx', sheet: 'Data' },
  { file: 'C25.xlsx', sheet: 'Fig. 2b' },
];

const SEQDUP_BLOCK_SCAN_LIMIT = 5000;   // sequentialDuplication.js

// Port of corpus-run.mjs prepStructure — same calls, same order, so roles and
// grouping match the real pipeline rather than an approximation of it.
function prepStructure(raw) {
  const prep = preprocessRaw(raw);
  const preprocessed = prep.rows;
  if (!preprocessed || !preprocessed.length) throw new Error('Empty after preprocessing.');

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

async function run(target) {
  const path = `${CORPUS}/${target.file}`;
  const blob = new Blob([readFileSync(path)]);
  const { rows, sheetName } = await parseExcel(blob, target.sheet);

  const { hdrs, data, condPerCol, roles, longFormatDetected } = prepStructure(rows);

  const auto = detectAssay(basename(path), hdrs);
  const assay = auto ? auto.assay : 'general';
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';

  const sum = summarize(data, roles, condPerCol, false);
  const isGenomics = assay === 'genomics' || assay === 'cell_count';
  const zeroAsMissing = isGenomics && sum.zeros > sum.total * 0.1;

  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected }).value || 'ordered';

  const config = {
    data, roles, hdrs, condPerCol, zeroAsMissing,
    assay, dataType, fileName: path, colRelationship: 'replicates', rowSemantics,
  };
  const { matrix, condCtx } = extractAnalysisInputs(config);

  console.log(`\n=== ${target.file} — sheet ${JSON.stringify(sheetName)} ===`);
  console.log(`  raw rows from sheet            : ${rows.length}`);
  console.log(`  analysis matrix                : ${matrix.length} rows x ${matrix[0]?.length || 0} data cols`);
  console.log(`  assay / dataType (auto)        : ${assay} / ${dataType}`);
  console.log(`  Seq-Dup guard (nR > ${SEQDUP_BLOCK_SCAN_LIMIT})       : ` +
    `${matrix.length > SEQDUP_BLOCK_SCAN_LIMIT ? 'CROSSED — scan skipped' : 'not crossed — scan runs'}`);

  // Condition structure, exactly as testCrossConditionConsistency sees it.
  if (!condCtx || !condCtx.has || condCtx.count < 2) {
    console.log(`  condition context              : ${condCtx?.type || 'none'}, count=${condCtx?.count ?? 0}`);
    console.log('  CCC verdict                    : N/A — "Need ≥2 experimental conditions."');
    console.log('  maxN / B / MODERATE reachable  : n/a (test does not run)');
    return;
  }

  const slices = condCtx.slices();
  if (!slices || slices.length < 2) {
    console.log(`  condition context              : ${condCtx.type}, count=${condCtx.count}, slices=${slices?.length ?? 0}`);
    console.log('  CCC verdict                    : N/A — "Need ≥2 conditions with data."');
    return;
  }

  // conditionN — non-null value count per condition (CCC lines 133-141).
  const conditionN = slices.map(s => {
    let n = 0;
    for (const row of s.matrix) for (const v of row) if (v != null && isFinite(v)) n++;
    return n;
  });

  const kept = conditionN.filter(n => n >= 2);
  const maxN = Math.max(...conditionN);
  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;
  const p2Floor = 2 / (B + 1);
  const modReachable = p2Floor < ALPHA.NOTE;
  const highReachable = p2Floor < ALPHA.FLAG;

  const sorted = [...conditionN].sort((a, b) => b - a);
  console.log(`  condition context              : ${condCtx.type}, ${slices.length} slices`);
  console.log(`  conditions kept (n >= 2)       : ${kept.length}`);
  console.log(`  per-condition N (top 5)        : ${sorted.slice(0, 5).join(', ')}${sorted.length > 5 ? ` … (${sorted.length} total)` : ''}`);
  console.log(`  maxN (largest per-condition N) : ${maxN}`);
  console.log(`  crosses 10,000?                : ${maxN > 10000 ? 'YES' : 'no'}`);
  console.log(`  B (permutation count)          : ${B}`);
  console.log(`  two-sided p floor = 2/(B+1)    : ${p2Floor}`);
  console.log(`  MODERATE reachable (p < ${ALPHA.NOTE})  : ${modReachable ? 'YES' : 'NO — capped at LOW'}`);
  console.log(`  HIGH reachable (p < ${ALPHA.FLAG})    : ${highReachable ? 'YES' : 'no'}`);
}

console.log('S327 probe A — Cross-Condition Consistency tier boundary');
console.log(`ALPHA.NOTE = ${ALPHA.NOTE}, ALPHA.FLAG = ${ALPHA.FLAG}`);

for (const t of TARGETS) {
  try { await run(t); }
  catch (e) { console.log(`\n=== ${t.file} — FAILED: ${e.message}`); }
}
console.log('');
