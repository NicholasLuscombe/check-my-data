// S354 — the withheld state, before/after instrument.
//
// The batch cannot see this session's change: none of the surfaces it touches
// is imported by validate-batch.mjs, so a green batch proves verdicts did not
// move and nothing else. This probe is the surface-side instrument. Run it
// before the change and after, and diff.
//
// Per fixture it dumps:
//   - every test's coverage bucket (classifyCoverage) beside its flag
//   - the six-bucket sum against the battery
//   - handoffModel's applicableTests
//   - handoffModel's otherClustersAllClear set
//   - per cluster the §3 header word with its ran/total ratio
//
// Every bucket is read through `?? 0`, so the dump's SHAPE is the same before
// and after the sixth bucket exists. A file whose lines move is a file whose
// state changed; a file that does not move is untouched by the change. Nine
// fixtures carry a withheld test (P82 Cross-Condition Consistency and P86
// Residual Spike Correlation, both on paired designs) — exactly those nine
// should move, and the other eighteen should be byte-identical.
//
// The header word is read from clusterCoverageState in src/analysis/coverage.js
// — the same function ClusterRow renders — not from a copy of its derivation
// here. A probe that reimplements the logic it measures measures its own copy.
//
// Pipeline (parse → roles → extractAnalysisInputs → VST → dataType →
// rowSemantics → runFullAnalysis) mirrors validate-batch.mjs exactly, so the
// results are the batch's own results at the shipped seed.
//
// Usage: node test/probes/probe-s354-withheld-state.mjs [> dump.txt]

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import Papa from 'papaparse';

import { extractAnalysisInputs, runFullAnalysis } from '../../src/analysis/engine.js';
import { classifyCoverage, summarizeCoverage, clusterCoverageState } from '../../src/analysis/coverage.js';
import { buildHandoffModel } from '../../src/analysis/handoffModel.js';
import { buildMechanismGroups } from '../../src/analysis/localization.js';
import { detectVST } from '../../src/stats/vst.js';
import { inferRoles } from '../../src/import/roles.js';
import { forwardFill, preprocessRaw, detectHeaderRows } from '../../src/import/parser.js';
import { detectLongFormat } from '../../src/import/longFormat.js';
import { suggestRowSemantics } from '../../src/import/rowSemantics.js';
import { ASSAY_DATATYPE_MAP } from '../../src/constants/assays.js';
import { MECHANISM_ORDER, MECHANISMS } from '../../src/constants/mechanisms.js';
import { EXPECTED } from '../batch-fixtures.mjs';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const FIXTURES_DIR = 'test/fixtures';

// The bucket names, in the order the dump prints them. Listed here rather than
// read off the summary object so the dump's shape does not depend on which
// buckets the classifier happens to know about — that is the whole point of the
// before/after diff.
const BUCKETS = ['ran', 'notApplicable', 'withheld', 'unassessed', 'errored', 'pending'];

function pad(s, n) { return String(s).padEnd(n); }

for (const [file, expected] of Object.entries(EXPECTED)) {
  const csv = readFileSync(join(FIXTURES_DIR, file), 'utf-8');
  let raw = Papa.parse(csv, { skipEmptyLines: true }).data;
  raw = preprocessRaw(raw).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false,
  });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';
  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics,
  );

  const nRows = matrix.length;
  const nCols = matrix[0]?.length || 0;
  const importConfig = { fileName: file, assay, dataType, vst, summary: {} };
  const model = buildHandoffModel(results, importConfig, nRows, nCols);

  const cov = summarizeCoverage(results);
  const summed = BUCKETS.reduce((n, b) => n + (cov[b] ?? 0), 0);

  console.log(`── ${file} ──`);
  console.log(`  buckets: ${BUCKETS.map(b => `${b}=${cov[b] ?? 0}`).join(' ')} total=${cov.total}`);
  console.log(`  six-bucket sum: ${summed} vs battery ${cov.total} — ${summed === cov.total ? 'holds' : 'BROKEN'}`);
  console.log(`  applicableTests: ${model.outcome.applicableTests}`);
  const oc = model.findings.otherClustersAllClear;
  console.log(`  otherClustersAllClear: ${oc.length === 0 ? '(none)' : oc.map(c => `${c.clusterLabel} (${c.testCount})`).join('; ')}`);
  console.log('  per test:');
  for (const r of results) {
    console.log(`    ${pad(classifyCoverage(r), 14)} ${pad(r.flag, 9)} ${r.name}`);
  }
  console.log('  clusters:');
  const groups = buildMechanismGroups(results);
  for (const mk of MECHANISM_ORDER) {
    const g = groups[mk];
    if (!g || !g.tests.length) continue;
    const gcov = summarizeCoverage(g.tests);
    const state = clusterCoverageState(gcov, {
      isFlagged: g.highCount > 0 || g.modCount > 0,
      hasHigh: g.highCount > 0,
    });
    const clauses = state.clauses.length ? state.clauses.join(' · ') : '(none)';
    console.log(`    ${pad(MECHANISMS[mk].label, 30)} ${pad(state.word, 16)} ran/total=${gcov.ran}/${gcov.total} couldRun=${state.couldRun} clauses=${clauses}`);
  }
  console.log('');
}
