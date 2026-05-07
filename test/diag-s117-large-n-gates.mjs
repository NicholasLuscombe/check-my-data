// S117 Phase 1 — large-N gate audit diagnostic (read-only).
// Iterates the 22-fixture batch (same fixture list and engine scaffold as
// test/validate-batch.mjs), runs the engine once per fixture, and emits
// three CSV tables of per-fixture diagnostics for Runs Test (§2.3),
// Row-Mean Runs (§2.4), and Terminal Digit Uniformity (§3.1).
//
// Extracts only what the engine emits — no post-hoc computation.
// Unresolved fields are emitted empty and listed in a final
// "### Missing fields" block.

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');

const FIXTURES = 'test/fixtures';
const FIXTURE_LIST = [
  ['DS01',  '01-densitometry-clean.csv',                 'densitometry'],
  ['DS02',  '02-densitometry-fabricated.csv',            'densitometry'],
  ['DS03',  '03-qpcr-clean.csv',                         'qpcr'],
  ['DS04',  '04-qpcr-fabricated.csv',                    'qpcr'],
  ['DS05',  '05-cellcount-clean.csv',                    'cell_count'],
  ['DS06',  '06-cellcount-fabricated.csv',               'cell_count'],
  ['DS07',  '07-elisa-clean.csv',                        'elisa'],
  ['DS08',  '08-elisa-fabricated.csv',                   'elisa'],
  ['DS09',  '09-proteomics-clean.csv',                   'proteomics'],
  ['DS10', '10-proteomics-fabricated.csv',               'proteomics'],
  ['DS11', '11-rnaseq-multicondition.csv',               'genomics'],
  ['DS12a','12a-uniform-mixture-clean.csv',              'general'],
  ['DS12b','12b-uniform-mixture-fabricated.csv',         'general'],
  ['DS13', '13-vfstest-cellcountest.csv',                'cell_count'],
  ['DS14', '14-crctest-survey.csv',                      'survey'],
  ['DS15', '15-missing-carlisle.csv',                    'general'],
  ['DS16', '16-densitometry-carlisle-overbalanced.csv',  'densitometry'],
  ['DS17', '17-densitometry-carlisle-clean.csv',         'densitometry'],
  ['DS19', '19-inheritance-fabricated.csv',              'general'],
  ['DS20', '20-bimodal-fab.csv',                         'general'],
  ['DS21', '21-localised-ar.csv',                        'general'],
  ['DS22', '22-covariance-block.csv',                    'general'],
];

// ── CSV formatting ──────────────────────────────────────────────────
function fmt(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    if (!isFinite(v) || Number.isNaN(v)) return '';
    return String(v);
  }
  const s = String(v);
  if (s === '') return '';
  if (/[,"\s]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ── N/A reason mapping (description → canonical tag) ───────────────
function naReasonRuns(desc) {
  if (!desc) return 'na:unknown';
  const d = String(desc);
  if (/≥2 replicate columns/.test(d) || /\u22652 replicate columns/.test(d)) return 'na:<2 replicate columns';
  if (/columns are non-replicates/.test(d)) return 'na:conditions-mode';
  if (/ordinal data/i.test(d)) return 'na:ordinal-datatype';
  if (/No group had sufficient data/.test(d)) return 'na:no-group-applicable';
  return 'na:other';
}

function naReasonRowMeanRuns(desc, condType) {
  if (!desc) return 'na:unknown';
  const d = String(desc);
  if (/≥2 replicate columns and ≥10 rows/.test(d) || /\u22652 replicate columns and \u226510 rows/.test(d)) return 'na:<2 cols or <10 rows';
  if (/row-level condition labels/.test(d)) {
    return condType === 'column-grouped' ? 'na:column-grouped' : 'na:no COND column';
  }
  if (/sequences too short/.test(d)) return 'na:sequences too short';
  if (/No group had sufficient data/.test(d)) return 'na:column-grouped';
  if (/columns are non-replicates/.test(d)) return 'na:conditions-mode';
  if (/ordinal data/i.test(d)) return 'na:ordinal-datatype';
  return 'na:other';
}

function naReasonTermDigit(desc) {
  if (!desc) return 'na:unknown';
  const d = String(desc);
  if (/need ≥50 values/.test(d) || /need \u226550 values/.test(d) || /Insufficient data/.test(d)) return 'na:<50 decimal values';
  if (/integer values/.test(d)) return 'na:>95% integer';
  if (/No valid terminal digits/.test(d)) return 'na:no-terminal-digits';
  return 'na:other';
}

// ── Per-fixture extraction ─────────────────────────────────────────
const rowsA = [];
const rowsB = [];
const rowsC = [];
const missing = [];

for (const [fid, file, assay] of FIXTURE_LIST) {
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

  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType
  );

  const byName = name => results.find(r => r.name === name);

  // ── Table A: Runs Test ──
  {
    const r = byName('Runs Test');
    if (!r || r.flag === 'N/A' || r.flag === 'ERROR') {
      rowsA.push([fid, r && r.flag !== 'N/A' ? 'na:error' : naReasonRuns(r?.description), '', '', '', '', '', r?.flag ?? 'N/A']);
    } else {
      const pooledZ          = r.pooledMeanZ ?? '';
      const obsOverExp       = r.obsOverExp ?? r.runsRatio ?? '';
      const globalP          = r.pooledP ?? '';
      const windowedBestAdjP = r.windowedBestAdjP ?? r.windowBestAdjP ?? '';
      const pooledN          = r.pooledN ?? '';

      if (obsOverExp === '')       missing.push(['Runs Test', 'obsOverExp', fid]);
      if (windowedBestAdjP === '') missing.push(['Runs Test', 'windowedBestAdjP', fid]);
      if (pooledN === '')          missing.push(['Runs Test', 'pooledN', fid]);

      rowsA.push([fid, 'ran', pooledZ, obsOverExp, globalP, windowedBestAdjP, pooledN, r.flag]);
    }
  }

  // ── Table B: Row-Mean Runs ──
  {
    const r = byName('Row-Mean Runs');
    if (!r || r.flag === 'N/A' || r.flag === 'ERROR') {
      rowsB.push([fid, r && r.flag !== 'N/A' ? 'na:error' : naReasonRowMeanRuns(r?.description, condCtx.type), '', '', '', '', '', r?.flag ?? 'N/A']);
    } else {
      const bestCondition = r.bestSequence ?? '';
      // perConditionN: walk details/subDetails for the entry matching bestSequence
      let perConditionN = '';
      const entries = [...(r.subDetails || []), ...(r.details || [])];
      const seqEntry = entries.find(d =>
        d && d.sequence === r.bestSequence && d.source !== 'window' && d.n != null
      );
      if (seqEntry) perConditionN = seqEntry.n;

      const pooledZ          = r.bestZ ?? '';
      const globalP          = r.globalP ?? r.primaryP ?? '';
      const windowedBestAdjP = r.windowedBestAdjP ?? '';

      if (perConditionN === '')    missing.push(['Row-Mean Runs', 'perConditionN', fid]);
      if (windowedBestAdjP === '') missing.push(['Row-Mean Runs', 'windowedBestAdjP', fid]);

      rowsB.push([fid, 'ran', bestCondition, perConditionN, pooledZ, globalP, windowedBestAdjP, r.flag]);
    }
  }

  // ── Table C: Terminal Digit Uniformity ──
  {
    const r = byName('Terminal Digit Uniformity');
    if (!r || r.flag === 'N/A' || r.flag === 'ERROR') {
      rowsC.push([fid, r && r.flag !== 'N/A' ? 'na:error' : naReasonTermDigit(r?.description), '', '', '', '', r?.flag ?? 'N/A']);
    } else {
      const decimalN = r.nValues ?? '';
      // k: 9 if trailing-zero suppression was detected (df=8), else 10 (df=9).
      // df is the engine-emitted encoding of the digit set; k = df + 1.
      let k = '';
      if (typeof r.df === 'number') k = r.df + 1;
      else if (typeof r.trailingZeroWarning === 'boolean') k = r.trailingZeroWarning ? 9 : 10;
      const chi2Stat = r.rawChiSq ?? r.chiSquared ?? '';
      const chi2P    = r.rawPReported ?? r.p ?? '';
      rowsC.push([fid, 'ran', decimalN, k, chi2Stat, chi2P, r.flag]);
    }
  }
}

// ── Emit tables ─────────────────────────────────────────────────────
function emit(title, header, rows) {
  console.log(`# ${title}`);
  console.log(header.join(','));
  for (const row of rows) console.log(row.map(fmt).join(','));
  console.log('');
}

emit(
  'Table A — Runs Test (§2.3)',
  ['fixtureId', 'applicability', 'pooledZ', 'obsOverExp', 'globalP', 'windowedBestAdjP', 'pooledN', 'flag'],
  rowsA,
);

emit(
  'Table B — Row-Mean Runs Test (§2.4)',
  ['fixtureId', 'applicability', 'bestCondition', 'perConditionN', 'pooledZ', 'globalP', 'windowedBestAdjP', 'flag'],
  rowsB,
);

emit(
  'Table C — Terminal Digit Uniformity (§3.1)',
  ['fixtureId', 'applicability', 'decimalN', 'k', 'chi2Stat', 'chi2P', 'flag'],
  rowsC,
);

if (missing.length) {
  // Deduplicate (test, field) — each pair is emitted once with the list of fixtures
  const grouped = new Map();
  for (const [test, field, fixture] of missing) {
    const key = `${test}::${field}`;
    if (!grouped.has(key)) grouped.set(key, { test, field, fixtures: [] });
    grouped.get(key).fixtures.push(fixture);
  }
  console.log('### Missing fields');
  for (const { test, field, fixtures } of grouped.values()) {
    console.log(`${test}, ${field}, ${fixtures.join('|')}`);
  }
}
