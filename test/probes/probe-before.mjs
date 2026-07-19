// S326 throwaway probe — re-runs the S325 ecology census on the current tree.
// Mirrors scripts/corpus-run.mjs prep + run, and adds the coverage classifier,
// the grouping trigger, and the confirm path. Read-only.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

import { extractAnalysisInputs, runFullAnalysis } from './src/analysis/engine.js';
import { computeSeverity } from './src/analysis/severity.js';
import { detectVST } from './src/stats/vst.js';
import { inferBaseRoles, detectGroupAttributes } from './src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows, detectBlocks } from './src/import/parser.js';
import { detectLongFormat } from './src/import/longFormat.js';
import { suggestRowSemantics } from './src/import/rowSemantics.js';
import { summarize } from './src/import/summary.js';
import { parseExcel } from './src/import/excel.js';
import { detectAssay, ASSAY_DATATYPE_MAP } from './src/constants/assays.js';
import { classifyCoverage, summarizeCoverage } from './src/analysis/coverage.js';
import { computeTrigger } from './src/analysis/groupingTrigger.js';
import { runConfirmedGroupedTests } from './src/analysis/confirmGrouping.js';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const DIR = '/Users/hedgehog/Projects/check-my-data/corpus-data';
const ENTRIES = [
  { label: 'C07', path: `${DIR}/C07.xlsx`, sheet: 'Mastersheet' },
  { label: 'C14', path: `${DIR}/C14.xlsx`, sheet: 'Data' },
];

const GROUPED4 = ['Mahalanobis Row Outlier', 'Entropy / Zipf Analysis', 'Column Goodness-of-Fit', 'Modality Test'];

async function readRawMatrix(entry) {
  const blob = new Blob([readFileSync(entry.path)]);
  const { rows, sheetName } = await parseExcel(blob, entry.sheet);
  return { raw: rows, sheetUsed: sheetName };
}

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
  const { roles, groupings } = detectGroupAttributes(data, baseRoles);
  return { hdrs, data, condPerCol, roles, groupings, longFormatDetected };
}

async function runOne(entry) {
  const out = { label: entry.label };
  const { raw, sheetUsed } = await readRawMatrix(entry);
  out.sheet = sheetUsed;
  const { hdrs, data, condPerCol, roles, groupings, longFormatDetected } = prepStructure(raw);

  const auto = detectAssay(basename(entry.path), hdrs);
  const assay = auto ? auto.assay : 'general';
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const sum = summarize(data, roles, condPerCol, false);
  const isGenomics = assay === 'genomics' || assay === 'cell_count';
  const zeroAsMissing = isGenomics && sum.zeros > sum.total * 0.1;
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected });
  const rowSemantics = rsSuggestion.value || 'ordered';

  const config = { data, roles, hdrs, condPerCol, zeroAsMissing, assay, dataType,
                   fileName: entry.path, colRelationship: 'replicates', rowSemantics };
  const { matrix, rawMatrix, filteredIndices, condCtx } = extractAnalysisInputs(config);
  const vst = detectVST(matrix, assay);

  const nameOf = c => (hdrs[c] != null && String(hdrs[c]).trim()) ? String(hdrs[c]).trim() : `Col ${c + 1}`;
  const condCols = roles.map((r, i) => r === 'condition' ? i : -1).filter(i => i >= 0);

  out.assay = assay; out.dataType = dataType; out.vst = vst?.transform || 'raw';
  out.rowSemantics = rowSemantics;
  out.nRows = matrix.length; out.nCols = matrix[0]?.length || 0;
  out.condColHeaders = condCols.map(nameOf);
  out.nAttributes = roles.filter(r => r === 'attribute').length;
  out.attributes = roles.map((r, c) => r === 'attribute' ? nameOf(c) : null).filter(Boolean);
  out.conditionType = condCtx?.type ?? null;

  // ── Trigger, read directly ──
  out.trigger = computeTrigger({ data, roles, condColSet: condCols, filteredIndices });

  // ── Engine run ──
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst,
                                        { isPivoted: false }, dataType, rowSemantics);
  out.severity = computeSeverity(results).severity;
  out.coverage = summarizeCoverage(results);
  out.tests = results.map(r => ({
    name: r.name, flag: r.flag, coverage: classifyCoverage(r),
    p: typeof r.primaryP === 'number' ? r.primaryP : null,
    note: r.description || null,
  }));

  // ── Confirm path, full condition set ──
  try {
    const confirmed = await runConfirmedGroupedTests({
      data, roles, condColSet: condCols, zeroAsMissing, assay, dataType, vst });
    out.confirm = confirmed.map(r => ({
      name: r.name, flag: r.flag, coverage: classifyCoverage(r),
      p: typeof r.primaryP === 'number' ? r.primaryP : null,
      note: r.description || null,
      groupsAssessed: r.groupsAssessed ?? null,
    }));
  } catch (e) { out.confirmError = e.message; }

  return out;
}

const all = [];
for (const entry of ENTRIES) {
  process.stdout.write(`\n▶ ${entry.label} (sheet "${entry.sheet}")\n`);
  try {
    const d = await runOne(entry);
    all.push(d);
    console.log(`  shape: ${d.nRows}×${d.nCols}  conditions: [${d.condColHeaders.join(', ')}]  type=${d.conditionType}`);
    console.log(`  held out ${d.nAttributes} attribute col(s)`);
    const t = d.trigger;
    console.log(`  trigger: arm1=${t.arm1} arm2=${t.arm2} pending=${t.pending} | condCols=${t.condCols} nGroups=${t.nGroups} median=${t.median}`);
    console.log(`  severity ${d.severity}  coverage: ran=${d.coverage.ran} n/a=${d.coverage.notApplicable} pending=${d.coverage.pending} errored=${d.coverage.errored} unassessed=${d.coverage.unassessed} total=${d.coverage.total}`);
    for (const g of GROUPED4) {
      const e = d.tests.find(x => x.name === g);
      const c = d.confirm?.find(x => x.name === g);
      console.log(`    ${g.padEnd(26)} engine=${(e?.coverage||'?').padEnd(14)}${(e?.flag||'').padEnd(10)} | confirm=${(c?.coverage||'?').padEnd(14)}${c?.flag||''}`);
    }
    const flagged = d.tests.filter(x => x.flag === 'HIGH' || x.flag === 'MODERATE');
    console.log(`  HIGH: ${d.tests.filter(x=>x.flag==='HIGH').map(x=>x.name).join(' | ') || '(none)'}`);
    console.log(`  MOD:  ${d.tests.filter(x=>x.flag==='MODERATE').map(x=>x.name).join(' | ') || '(none)'}`);
    if (d.coverage.errored) console.log(`  ERRORED: ${d.tests.filter(x=>x.coverage==='errored').map(x=>`${x.name} — ${x.note}`).join(' ;; ')}`);
    if (d.confirmError) console.log(`  confirm threw: ${d.confirmError}`);
  } catch (e) {
    console.log(`  ✗ ERROR: ${e.message}`);
    all.push({ label: entry.label, error: e.message, stack: e.stack });
  }
}
writeFileSync('/Users/hedgehog/Projects/cmd-s326-before/probe-before-out.json', JSON.stringify(all, null, 2));
console.log('\nWrote probe-s326-out.json');
