// Modality per-fixture calibration dump (Phase 3).
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
  ['01-densitometry-clean.csv',              'densitometry'],
  ['02-densitometry-fabricated.csv',         'densitometry'],
  ['03-qpcr-clean.csv',                      'qpcr'],
  ['04-qpcr-fabricated.csv',                 'qpcr'],
  ['05-cellcount-clean.csv',                 'cell_count'],
  ['06-cellcount-fabricated.csv',            'cell_count'],
  ['07-elisa-clean.csv',                     'elisa'],
  ['08-elisa-fabricated.csv',                'elisa'],
  ['09-proteomics-clean.csv',                'proteomics'],
  ['10-proteomics-fabricated.csv',           'proteomics'],
  ['11-rnaseq-multicondition.csv',           'genomics'],
  ['12a-uniform-mixture-clean.csv',          'general'],
  ['12b-uniform-mixture-fabricated.csv',     'general'],
  ['13-vfstest-cellcountest.csv',            'cell_count'],
  ['14-crctest-survey.csv',                  'survey'],
  ['15-missing-carlisle.csv',                'general'],
  ['16-densitometry-carlisle-overbalanced.csv','densitometry'],
  ['17-densitometry-carlisle-clean.csv',     'densitometry'],
  ['19-inheritance-fabricated.csv',          'general'],
];

console.log('| Fixture | primaryP | flag | tested | skipped | top-3 columns (col, dip, adjP) |');
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
  const md = results.find(r => r.name === 'Modality Test');
  if (!md) { console.log(`| ${file} | — | MISSING | — | — | — |`); continue; }

  if (md.flag === 'N/A') {
    const reasons = md.skippedColumns || [];
    const reasonCounts = {};
    for (const r of reasons) {
      const key = r.reason.startsWith('Pre-skip') ? 'γ' :
                  r.reason.includes('< 50') ? 'n<50' :
                  r.reason.includes('< 15') ? 'distinct<15' : 'other';
      reasonCounts[key] = (reasonCounts[key] || 0) + 1;
    }
    const breakdown = Object.entries(reasonCounts).map(([k,v])=>`${v} ${k}`).join(', ');
    console.log(`| ${file} | — | N/A | 0 | ${reasons.length} (${breakdown}) | — |`);
    continue;
  }

  const p = md.primaryP != null ? md.primaryP.toExponential(2) : '—';
  const tested = md.nTested || 0;
  const skipped = md.nSkipped || 0;

  // Top-3 by dip (from colDips), regardless of flag, so we see signal strength everywhere.
  const allCols = (md.colDips || []).slice().sort((a, b) => b.dip - a.dip).slice(0, 3);
  const topCols = allCols.map(c => `col${c.col} dip=${c.dip.toFixed(4)}${c.flagged ? ' [FLAG]' : ''}`).join(' · ');

  console.log(`| ${file} | ${p} | ${md.flag} | ${tested} | ${skipped} | ${topCols || '(no tested)'} |`);
}
