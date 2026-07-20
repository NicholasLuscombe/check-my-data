// S327 round 1 — corpus re-adjudication measurement.
//
// Re-runs the current engine on a corpus sheet and reports what it returns
// NOW, for comparison against §0.4 adjudications assigned against an older
// engine. Measurement only — no adjudication, no Class letters.
//
// Reports per file:
//   1. every test + flag, grouped by classifyCoverage (not by a hand reading)
//   2. the grouping: condition columns, group count, median/min size, trigger arms
//   3. the confirm path: default tick set, the four tests before and after confirm
//   4. skip + severity-ceiling surface
//
// Sheet selection is explicit per target. Row/column/group counts are properties
// of the sheet named beside them, never of the workbook.
//
// Usage: node test/probes/probe-s327-round1.mjs [targetKey]

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import { extractAnalysisInputs, runFullAnalysis } from '../../src/analysis/engine.js';
import { runConfirmedGroupedTests } from '../../src/analysis/confirmGrouping.js';
import { computeTrigger } from '../../src/analysis/groupingTrigger.js';
import { classifyCoverage, summarizeCoverage } from '../../src/analysis/coverage.js';
import { computeSeverity } from '../../src/analysis/severity.js';
import { detectVST } from '../../src/stats/vst.js';
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

// Sheet basis is declared per target and printed with the result. Manifest
// entries carry `manifest: true`; inferred entries carry the quoted basis.
const TARGETS = {
  C16: {
    file: 'C16.xlsx', sheet: 'Sheet1',
    basis: 'single-sheet workbook — Sheet1 is the only sheet; spec §0.3 table (L231) also names Sheet1',
    manifest: false,
  },
  'CORPUS-01': {
    file: 'CORPUS-01.xlsx', sheet: 'Sheet1',
    basis: 'declared in corpus-manifest.json (sheet: "Sheet1")',
    manifest: true, assay: 'continuous', dataType: 'continuous',
  },
  'CORPUS-03': {
    file: 'CORPUS-03.xlsx', sheet: 'Clonal molly behavioral individ',
    basis: 'declared in corpus-manifest.json (sheet: "Clonal molly behavioral individ")',
    manifest: true, assay: 'general', dataType: 'continuous',
    roleHint: { 'Fish.ID': 'identifier' },
  },
  C14: {
    file: 'C14.xlsx', sheet: 'Data',
    basis: 'spec §0.3 (L245) and §0.2 (L153) both name the Data sheet; grouping-only measurement',
    manifest: false, groupingOnly: true,
  },
};

const SEQDUP_LIMIT = 5000;

function prepStructure(raw, roleHint) {
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
  const { roles, groupings } = detectGroupAttributes(data, baseRoles);
  // Declarative role override, as corpus-run.mjs applies it.
  if (roleHint) {
    for (const [header, vocab] of Object.entries(roleHint)) {
      const idx = hdrs.indexOf(header);
      if (idx >= 0) roles[idx] = vocab === 'identifier' ? 'label' : vocab;
    }
  }
  return { hdrs, data, condPerCol, roles, groupings, longFormatDetected };
}

function stats(sizes) {
  if (!sizes.length) return { median: null, min: null, max: null };
  const s = [...sizes].sort((a, b) => a - b);
  const median = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  return { median, min: s[0], max: s[s.length - 1] };
}

async function run(key) {
  const t = TARGETS[key];
  const path = `${CORPUS}/${t.file}`;
  const { rows, sheetName } = await parseExcel(new Blob([readFileSync(path)]), t.sheet);
  const { hdrs, data, condPerCol, roles, longFormatDetected } = prepStructure(rows, t.roleHint);

  const auto = detectAssay(basename(path), hdrs);
  const autoAssay = auto ? auto.assay : 'general';
  const assay = t.assay || autoAssay;
  const dataType = t.dataType || ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const sum = summarize(data, roles, condPerCol, false);
  const isGenomics = assay === 'genomics' || assay === 'cell_count';
  const zeroAsMissing = isGenomics && sum.zeros > sum.total * 0.1;
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected }).value || 'ordered';

  const config = { data, roles, hdrs, condPerCol, zeroAsMissing, assay, dataType,
    fileName: path, colRelationship: 'replicates', rowSemantics };
  const { matrix, rawMatrix, condCtx, filteredIndices } = extractAnalysisInputs(config);
  const nR = matrix.length, nC = matrix[0]?.length || 0;

  console.log(`\n${'='.repeat(72)}`);
  console.log(`${key} — sheet ${JSON.stringify(sheetName)}`);
  console.log(`  sheet basis          : ${t.basis}`);
  console.log(`  sheet basis source   : ${t.manifest ? 'corpus manifest (declared)' : 'inferred — see basis'}`);
  console.log(`${'='.repeat(72)}`);
  console.log(`  raw rows from sheet  : ${rows.length}`);
  console.log(`  analysis matrix      : ${nR} rows x ${nC} data cols   [sheet ${JSON.stringify(sheetName)}]`);
  console.log(`  assay / dataType     : ${assay} (${t.assay ? 'manifest override' : 'auto'}) / ${dataType}`);
  console.log(`  rowSemantics         : ${rowSemantics}`);

  // ── 2. Grouping ────────────────────────────────────────────────────
  // condIdx mirrors engine.js:112 exactly.
  const condIdx = roles.map((r, i) => r === 'condition' ? i : -1).filter(i => i >= 0);
  const condNames = condIdx.map(i => hdrs[i]);
  // The engine stamps its own trigger onto condCtx — read that rather than a
  // second derivation, so the reported arms are the ones the engine acted on.
  const trigger = condCtx.groupingTrigger;
  // Cross-check: recompute on the probe's condIdx and confirm agreement.
  const recheck = computeTrigger({ data, roles, condColSet: condIdx, filteredIndices });
  const agrees = recheck.pending === trigger.pending && recheck.nGroups === trigger.nGroups;
  const st = stats(trigger.sizes);

  console.log(`\n── 2. grouping [sheet ${JSON.stringify(sheetName)}] ──`);
  console.log(`  condition columns    : ${condNames.length ? condNames.join(', ') : '(none)'}  [${condIdx.length} cols]`);
  console.log(`  condCtx type / count : ${condCtx?.type || 'none'} / ${condCtx?.count ?? 0}`);
  console.log(`  rowGroups() usable   : ${condCtx?.rowGroups() ? condCtx.rowGroups().length + ' groups' : 'null (no usable partition)'}`);
  console.log(`  trigger.attempted    : ${trigger.attempted}`);
  console.log(`  group count          : ${trigger.nGroups ?? 'n/a'}`);
  console.log(`  group size med/min/max: ${st.median ?? 'n/a'} / ${st.min ?? 'n/a'} / ${st.max ?? 'n/a'}`);
  // slices() filters to groups of >=3 rows (conditionContext.js:132); rowGroups()
  // additionally needs >=2 such groups. Reported separately because the three
  // counts differ and the spec quotes them interchangeably.
  const nSlices = condCtx?.has ? condCtx.slices().length : 0;
  console.log(`  groups of size >= 3  : ${nSlices}  (condCtx.slices(); the trigger count above includes singletons)`);
  console.log(`  arm1 (>=3 cond cols) : ${trigger.arm1}`);
  console.log(`  arm2 (thin/unusable) : ${trigger.arm2}`);
  console.log(`  trigger PENDING      : ${trigger.pending}`);
  console.log(`  (cross-check on probe-derived cond cols agrees: ${agrees})`);

  if (t.groupingOnly) { console.log('\n  (grouping-only target — battery not run)\n'); return; }

  // ── 1. Battery ─────────────────────────────────────────────────────
  const vst = detectVST(matrix, assay);
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst,
    { isPivoted: false }, dataType, rowSemantics);
  const { severity } = computeSeverity(results);
  const cov = summarizeCoverage(results);

  const buckets = { ran: [], notApplicable: [], unassessed: [], errored: [], pending: [] };
  for (const r of results) buckets[classifyCoverage(r)].push(r);

  console.log(`\n── 1. battery [sheet ${JSON.stringify(sheetName)}] ──`);
  console.log(`  severity             : ${severity}`);
  console.log(`  coverage             : ran=${cov.ran} notApplicable=${cov.notApplicable} unassessed=${cov.unassessed} errored=${cov.errored} pending=${cov.pending} total=${cov.total}`);
  for (const state of ['ran', 'pending', 'unassessed', 'errored', 'notApplicable']) {
    const list = buckets[state];
    if (!list.length) continue;
    console.log(`\n  [${state}] ${list.length}`);
    const order = { HIGH: 0, MODERATE: 1, LOW: 2, 'N/A': 3 };
    for (const r of [...list].sort((a, b) => (order[a.flag] ?? 9) - (order[b.flag] ?? 9) || a.name.localeCompare(b.name))) {
      const p = typeof r.primaryP === 'number' ? r.primaryP.toExponential(2) : '—';
      const note = (state === 'notApplicable' || state === 'errored') && r.description ? `  — ${r.description.slice(0, 110)}` : '';
      console.log(`     ${r.flag.padEnd(9)} p=${String(p).padStart(9)}  ${r.name}${note}`);
    }
  }

  // ── 3. Confirm path ────────────────────────────────────────────────
  const FOUR = ['Mahalanobis Row Outlier', 'Entropy / Zipf Analysis', 'Column Goodness-of-Fit', 'Modality Test'];
  console.log(`\n── 3. confirm path [sheet ${JSON.stringify(sheetName)}] ──`);
  console.log(`  confirm card appears : ${trigger.pending ? 'YES — trigger pending' : 'no — trigger not pending'}`);
  console.log(`  default ticked set   : ${condNames.length ? condNames.join(', ') : '(none)'}  (GroupingConfirmCard.jsx:55 ticks all condition columns)`);
  console.log(`  the four BEFORE confirmation:`);
  for (const n of FOUR) {
    const r = results.find(x => x.name === n);
    console.log(`     ${(r?.flag ?? '(absent)').padEnd(9)} ${classifyCoverage(r).padEnd(14)} ${n}`);
  }
  if (trigger.pending) {
    try {
      const confirmed = await runConfirmedGroupedTests({
        data, roles, condColSet: condIdx, zeroAsMissing, assay, dataType, vst });
      console.log(`  the four AFTER confirming the default tick set unchanged:`);
      for (const n of FOUR) {
        const r = confirmed.find(x => x.name === n);
        const p = typeof r?.primaryP === 'number' ? r.primaryP.toExponential(2) : '—';
        console.log(`     ${(r?.flag ?? '(absent)').padEnd(9)} p=${String(p).padStart(9)}  ${n}`);
      }
    } catch (e) {
      console.log(`  confirm run FAILED: ${e.message}`);
    }
  }

  // ── 4. Skip + ceiling surface ──────────────────────────────────────
  console.log(`\n── 4. skip + severity-ceiling surface [sheet ${JSON.stringify(sheetName)}] ──`);
  console.log(`  Seq-Dup 5,000-row guard : ${nR > SEQDUP_LIMIT ? `CROSSED (${nR} rows) — scan skipped` : `not crossed (${nR} rows)`}`);

  const ceilings = [];
  // Permutation-count ceilings that are a pure function of nR (computable here).
  const coPerm = nR > 10000 ? 199 : nR > 1000 ? 499 : 999;
  ceilings.push(['Constant-Offset Blocks', coPerm, 1 / (coPerm + 1), `nR=${nR}`]);
  const waPerm = nR <= 500 ? 999 : nR <= 5000 ? 499 : 199;
  ceilings.push(['Windowed Autocorrelation', waPerm, 1 / (waPerm + 1), `nR=${nR}`]);
  ceilings.push(['Entropy / Zipf Analysis', 999, 2 / 1000, 'B fixed at 999']);
  // maxN-driven ceilings: maxN is the largest per-condition non-null VALUE count.
  const slices = condCtx?.has && condCtx.count >= 2 ? condCtx.slices() : null;
  if (slices && slices.length >= 2) {
    const condN = slices.map(s => {
      let n = 0; for (const row of s.matrix) for (const v of row) if (v != null && isFinite(v)) n++; return n;
    });
    const maxN = Math.max(...condN);
    const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;
    ceilings.push(['Cross-Condition Consistency', B, 2 / (B + 1), `maxN=${maxN} (largest per-condition value count)`]);
  } else {
    ceilings.push(['Cross-Condition Consistency', null, null, 'not applicable — <2 condition slices']);
  }
  for (const [name, B, floor, why] of ceilings) {
    if (B == null) { console.log(`  ${name.padEnd(28)} — ${why}`); continue; }
    const hi = floor < ALPHA.FLAG, mod = floor < ALPHA.NOTE;
    console.log(`  ${name.padEnd(28)} B=${String(B).padStart(4)} floor=${floor.toFixed(4)}  HIGH ${hi ? 'reachable' : 'UNREACHABLE'} · MODERATE ${mod ? 'reachable' : 'UNREACHABLE'}   (${why})`);
  }
  console.log(`  note: Inter-Replicate Correlation, Runs, LOESS and Regional Noise also tier their`);
  console.log(`  permutation counts, but on internal per-pair / valid-row counts this probe cannot`);
  console.log(`  read from outside the test. Not reported rather than guessed.`);
  console.log('');
}

const only = process.argv[2];
for (const key of Object.keys(TARGETS)) {
  if (only && key !== only) continue;
  try { await run(key); }
  catch (e) { console.log(`\n${key} — FAILED: ${e.message}\n${e.stack}`); }
}
