// Calibration harness for Track D Stage 1 — prints Cross-Cond Consistency
// flag and top (property × pair) for every fixture, plus full property ×
// pair summary rows (direction, adj-p, gate, flag).

import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');

const FIXTURES = 'test/fixtures';
const CLEAN = [
  ['01-densitometry-clean.csv', 'densitometry'],
  ['03-qpcr-clean.csv', 'qpcr'],
  ['05-cellcount-clean.csv', 'cell_count'],
  ['07-elisa-clean.csv', 'elisa'],
  ['09-proteomics-clean.csv', 'proteomics'],
  ['12a-uniform-mixture-clean.csv', 'general'],
  ['13-vfstest-cellcountest.csv', 'cell_count'],
  ['17-densitometry-carlisle-clean.csv', 'densitometry'],
];
const FAB = [
  ['02-densitometry-fabricated.csv', 'densitometry'],
  ['04-qpcr-fabricated.csv', 'qpcr'],
  ['06-cellcount-fabricated.csv', 'cell_count'],
  ['08-elisa-fabricated.csv', 'elisa'],
  ['10-proteomics-fabricated.csv', 'proteomics'],
  ['11-rnaseq-multicondition.csv', 'genomics'],
  ['12b-uniform-mixture-fabricated.csv', 'general'],
  ['14-crctest-survey.csv', 'survey'],
  ['15-missing-carlisle.csv', 'general'],
  ['16-densitometry-carlisle-overbalanced.csv', 'densitometry'],
  ['19-inheritance-fabricated.csv', 'general'],
];

async function runOne(file, assay) {
  try {
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
    const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
      data, roles, condPerCol, zeroAsMissing: false,
    });
    const vst = detectVST(matrix, assay);
    const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
    const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType);
    return results.find(r => r.name === 'Cross-Condition Consistency');
  } catch (err) {
    console.error(`  ERR in ${file}:`, err.message);
    return null;
  }
}

function short(r, file) {
  if (!r) return `${file}: (missing)`;
  if (r.flag === 'N/A') return `${file}: N/A — ${r.description}`;
  const top = r.top ? `${r.top.pair} / ${r.top.property} / ${r.top.direction} / adj-p=${r.top.adjP?.toExponential(2)}` : 'no top';
  return `${file}: flag=${r.flag} B=${r.B} units=${r.nUnitsRan}/${r.nUnitsTotal} flagged=${r.nFlagged} pairs=${r.nFlaggedPairs} · top: ${top}`;
}

function detail(r, file) {
  if (!r || r.flag === 'N/A') return '';
  const lines = [];
  lines.push(`  ${file} — conditions: [${(r.conditionNames || []).join(', ')}], Ns: [${(r.conditionN || []).join(', ')}]`);
  for (const d of r.details) {
    const flagMark = d.ran && d.unitFlag !== 'LOW' && d.gatePassed && !d.degenerate ? '*' : ' ';
    const adjStr = d.ran && d.adjP != null ? d.adjP.toExponential(2) : '—';
    const gate = d.ran ? (d.gatePassed ? 'gate✓' : 'gate✗') : '—';
    lines.push(`    ${flagMark} ${d.property.padEnd(24)} | ${d.pair.padEnd(40)} | obs=${String(d.observed).padEnd(10)} med=${String(d.nullMedian).padEnd(10)} dir=${d.direction.padEnd(11)} adj-p=${adjStr.padEnd(10)} ${gate} → ${d.unitFlag}${d.fallback ? ' (fallback)' : ''}`);
  }
  return lines.join('\n');
}

console.log('━━━ ROUND 1: CLEAN DATASETS (expect all LOW) ━━━\n');
let r1Fails = 0;
for (const [file, assay] of CLEAN) {
  const res = await runOne(file, assay);
  console.log(short(res, file));
  if (process.argv.includes('-v')) console.log(detail(res, file));
  if (res && res.flag !== 'LOW' && res.flag !== 'N/A') r1Fails++;
}
console.log(`\n  Round 1: ${CLEAN.length - r1Fails}/${CLEAN.length} clean datasets LOW or N/A`);

console.log('\n━━━ ROUND 2: FABRICATED DATASETS ━━━\n');
for (const [file, assay] of FAB) {
  const res = await runOne(file, assay);
  console.log(short(res, file));
  if (process.argv.includes('-v')) console.log(detail(res, file));
}
