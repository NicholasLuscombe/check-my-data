// Permanent Track D debugging harness — per-dataset Cross-Condition Consistency
// unit-table dump (property × pair × direction × adj-p × gate × forensic × unitFlag).
// Sibling of test/calibrate-trackd.mjs: calibrate-trackd prints the top-line flag
// and top (property × pair) per fixture; dump-trackd prints the full per-unit
// grid. Re-run whenever a property is added (Stage 2 P4/P5/P6 shipped S102,
// Stage 3 P9 shipped S104; P7/P8 deferred) or a gate/threshold is retuned
// (e.g. STATUS parked items 13–14). Referenced from CLAUDE.md §Commands.
// Per-dataset header prints `bhM=<total>(S1=<s1>/S2=<s2>/S3=<s3>)`.
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');

const FIXTURES = 'test/fixtures';
const EXPECTED = {
  '01-densitometry-clean.csv':    { severity: 1, assay: 'densitometry', kind: 'clean' },
  '02-densitometry-fabricated.csv': { severity: 3, assay: 'densitometry', kind: 'fab' },
  '03-qpcr-clean.csv':            { severity: 0, assay: 'qpcr', kind: 'clean' },
  '04-qpcr-fabricated.csv':       { severity: 3, assay: 'qpcr', kind: 'fab' },
  '05-cellcount-clean.csv':       { severity: 1, assay: 'cell_count', kind: 'clean' },
  '06-cellcount-fabricated.csv':  { severity: 3, assay: 'cell_count', kind: 'fab' },
  '07-elisa-clean.csv':           { severity: 0, assay: 'elisa', kind: 'clean' },
  '08-elisa-fabricated.csv':      { severity: 3, assay: 'elisa', kind: 'fab' },
  '09-proteomics-clean.csv':      { severity: 0, assay: 'proteomics', kind: 'clean' },
  '10-proteomics-fabricated.csv': { severity: 3, assay: 'proteomics', kind: 'fab' },
  '11-rnaseq-multicondition.csv': { severity: 3, assay: 'genomics', kind: 'fab' },
  '12a-uniform-mixture-clean.csv':      { severity: 0, assay: 'general', kind: 'clean' },
  '12b-uniform-mixture-fabricated.csv':  { severity: 1, assay: 'general', kind: 'fab' },
  '13-vfstest-cellcountest.csv':  { severity: 2, assay: 'cell_count', kind: 'fab' },
  '14-crctest-survey.csv':        { severity: 3, assay: 'survey', kind: 'fab' },
  '15-missing-carlisle.csv':      { severity: 3, assay: 'general', kind: 'fab' },
  '16-densitometry-carlisle-overbalanced.csv': { severity: 2, assay: 'densitometry', kind: 'fab' },
  '17-densitometry-carlisle-clean.csv':        { severity: 0, assay: 'densitometry', kind: 'clean' },
  '19-inheritance-fabricated.csv': { severity: 3, assay: 'general', kind: 'fab' },
};

function fmt(v) {
  if (v == null || !isFinite(v)) return '—';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a < 1e-3 || a >= 1000) return v.toExponential(2);
  return v.toPrecision(3);
}

function fmtP(v) {
  if (v == null) return '—';
  if (v < 1e-4) return '<1e-4';
  return v.toFixed(4);
}

console.log('# Cross-Condition Consistency per-unit tables\n');

for (const [file, expected] of Object.entries(EXPECTED)) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  const pp = preprocessRaw(raw);
  raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false
  });
  const vst = detectVST(matrix, assay);
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType);
  const { severity } = computeSeverity(results);
  const r = results.find(x => x.name === 'Cross-Condition Consistency');

  console.log(`## ${file}  [${expected.kind}, overall sev=${severity} / expected ${expected.severity}]`);
  if (!r) { console.log('  (Cross-Cond Consistency missing from results)\n'); continue; }
  console.log(`  flag=${r.flag}  primaryP=${r.primaryP == null ? '—' : fmt(r.primaryP)}  ` +
              `nConds=${r.nConditions ?? '—'}  nPairs=${r.nPairs ?? '—'}  ` +
              `nUnitsRan=${r.nUnitsRan ?? 0}  nFlagged=${r.nFlagged ?? 0}  ` +
              `bhM=${r.bhM ?? '—'}(S1=${r.bhMStage1 ?? '—'}/S2=${r.bhMStage2 ?? '—'}/S3=${r.bhMStage3 ?? '—'})  B=${r.B ?? '—'}`);
  if (r.flag === 'N/A') { console.log(`  reason: ${r.description}\n`); continue; }
  const details = r.details || [];
  const cols = ['property', 'pair', 'direction', 'observed', 'nullMedian', 'ratio', 'adjP', 'nMin', 'gate', 'forensic', 'unitFlag'];
  console.log('  | ' + cols.join(' | ') + ' |');
  console.log('  |' + cols.map(() => '---').join('|') + '|');
  for (const d of details) {
    const ratio = (d.ran && d.nullMedian && d.observed && isFinite(parseFloat(d.nullMedian)) && parseFloat(d.nullMedian) > 0)
      ? (parseFloat(d.observed) / parseFloat(d.nullMedian))
      : null;
    const row = [
      d.property,
      d.pair,
      d.direction ?? '—',
      d.observed ?? '—',
      d.nullMedian ?? '—',
      ratio != null ? ratio.toPrecision(3) : '—',
      d.ran ? fmtP(d.adjP) : (d.reason || '—'),
      d.nMin ?? '—',
      d.ran ? (d.gatePassed ? '✓' : '✗') : '—',
      d.ran ? (d.forensic ? '✓' : '✗') : '—',
      d.unitFlag ?? '—',
    ];
    console.log('  | ' + row.join(' | ') + ' |');
  }
  console.log();
}
