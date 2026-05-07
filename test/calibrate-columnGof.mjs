// Column GoF per-fixture calibration dump
import { readFileSync } from 'fs';
import { join } from 'path';
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');

const FIXTURES = 'test/fixtures';
const FIXTURES_LIST = [
  ['01-densitometry-clean.csv',             'densitometry'],
  ['02-densitometry-fabricated.csv',        'densitometry'],
  ['03-qpcr-clean.csv',                     'qpcr'],
  ['04-qpcr-fabricated.csv',                'qpcr'],
  ['05-cellcount-clean.csv',                'cell_count'],
  ['06-cellcount-fabricated.csv',           'cell_count'],
  ['07-elisa-clean.csv',                    'elisa'],
  ['08-elisa-fabricated.csv',               'elisa'],
  ['09-proteomics-clean.csv',               'proteomics'],
  ['10-proteomics-fabricated.csv',          'proteomics'],
  ['11-rnaseq-multicondition.csv',          'genomics'],
  ['12a-uniform-mixture-clean.csv',         'general'],
  ['12b-uniform-mixture-fabricated.csv',    'general'],
  ['13-vfstest-cellcountest.csv',           'cell_count'],
  ['14-crctest-survey.csv',                 'survey'],
  ['15-missing-carlisle.csv',               'general'],
  ['16-densitometry-carlisle-overbalanced.csv','densitometry'],
  ['17-densitometry-carlisle-clean.csv',    'densitometry'],
  ['19-inheritance-fabricated.csv',         'general'],
];

console.log('| Fixture | primaryP | flag | tested | skipped | top-3 columns |');
console.log('|---|---|---|---|---|---|');

for (const [file, assay] of FIXTURES_LIST) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  const pp = preprocessRaw(raw); raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');

  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType);
  const cg = results.find(r => r.name === 'Column Goodness-of-Fit');
  if (!cg) { console.log(`| ${file} | — | MISSING | — | — | — |`); continue; }

  if (cg.flag === 'N/A') {
    const reasons = cg.skippedColumns || [];
    const reasonCounts = {};
    for (const r of reasons) {
      const key = r.reason.startsWith('Pre-skip') ? 'preskip(γ)' :
                  r.reason.includes('< 30') ? 'n<30' :
                  r.reason.includes('< 10') ? 'distinct<10' : 'other';
      reasonCounts[key] = (reasonCounts[key] || 0) + 1;
    }
    const breakdown = Object.entries(reasonCounts).map(([k,v])=>`${v} ${k}`).join(', ');
    console.log(`| ${file} | — | N/A | 0 | ${reasons.length} (${breakdown}) | — |`);
    continue;
  }

  const p = cg.primaryP != null ? cg.primaryP.toExponential(2) : '—';
  const tested = cg.nTested || 0;
  const skipped = cg.nSkipped || 0;
  const reasons = cg.skippedColumns || [];
  const reasonCounts = {};
  for (const r of reasons) {
    const key = r.reason.startsWith('Pre-skip') ? 'γ' :
                r.reason.includes('< 30') ? 'n<30' :
                r.reason.includes('< 10') ? 'distinct<10' : 'other';
    reasonCounts[key] = (reasonCounts[key] || 0) + 1;
  }
  const skipBreakdown = skipped > 0 ? ` (${Object.entries(reasonCounts).map(([k,v])=>`${v} ${k}`).join(', ')})` : '';

  // Top-3 columns by raw p (we need to re-sort by rawP for calibration, though adjP is what's flagged)
  const topCols = (cg.details || []).slice(0, 3).map(d =>
    `col${d.Col} ${d.Family}/${d.Direction.replace(' ', '-')} A²=${d.A2_obs} ratio=${d.Ratio} adjP=${typeof d.adjP === 'number' ? d.adjP.toExponential(2) : d.adjP}`
  ).join(' · ');

  console.log(`| ${file} | ${p} | ${cg.flag} | ${tested} | ${skipped}${skipBreakdown} | ${topCols || '(no flagged)'} |`);
}
