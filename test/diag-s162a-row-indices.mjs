// S162a diag: verify the new `flaggedRowIndices` field on Mahalanobis Row
// Outlier + Within-Row Variance result objects across a representative
// fixture sample. Cross-checks against the existing row-count field, the
// dataset row range, and the 1-indexing convention.
//
// Fixture sample:
//   DS01 — clean densitometry (single condition, pooled Mahalanobis path)
//   DS08 — fabricated ELISA  (multi-condition, stratified Mahalanobis path)
//   DS11 — RNA-seq multi-condition (genomics → both N/A; verify absence)
//   DS21 — localised AR fabrication (within-row variance flagged)

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');

const FIXTURES = 'test/fixtures';
const CASES = [
  ['01-densitometry-clean.csv',      'densitometry'],
  ['08-elisa-fabricated.csv',        'elisa'],
  ['11-rnaseq-multicondition.csv',   'genomics'],
  ['21-localised-ar.csv',            'general'],
];

const TARGET_TESTS = new Set(["Mahalanobis Row Outlier", "Within-Row Variance"]);

function indexFieldFor(test) {
  return Array.isArray(test.flaggedRowIndices) ? test.flaggedRowIndices : null;
}

function expectedCountField(test) {
  if (test.name === "Mahalanobis Row Outlier") return test.nOutliers;
  if (test.name === "Within-Row Variance")     return test.nOutliers;
  return null;
}

let failed = 0;
function assert(cond, msg) { if (!cond) { console.error('  ✗', msg); failed++; } }

for (const [file, assay] of CASES) {
  console.log(`\n── ${file} (${assay}) ──`);
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
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';

  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics,
  );
  const nRows = matrix.length;

  for (const r of results) {
    if (!TARGET_TESTS.has(r.name)) continue;
    const idxs = indexFieldFor(r);
    const expectedCount = expectedCountField(r);
    const idxsPreview = idxs ? (idxs.length > 12
      ? `[${idxs.slice(0, 12).join(', ')}, … (${idxs.length} total)]`
      : `[${(idxs || []).join(', ')}]`) : '(field absent)';
    console.log(`  ${r.name} — flag=${r.flag} nOutliers=${expectedCount ?? '—'} flaggedRowIndices=${idxsPreview}`);

    if (r.flag === 'N/A') {
      // N/A path: expect no flaggedRowIndices, or [] if test errored early
      // after the field declaration. Pooled Mahalanobis returns early before
      // building outlierRows; Within-Row Variance also returns early. So the
      // field should be ABSENT (undefined) on N/A results.
      assert(idxs === null, `${file}/${r.name}: flaggedRowIndices present on N/A (expected absent)`);
      continue;
    }

    // Field must be present on non-N/A runs.
    assert(idxs !== null, `${file}/${r.name}: flaggedRowIndices missing on non-N/A run`);
    if (idxs === null) continue;

    // Count parity with the existing row-count field.
    assert(idxs.length === expectedCount,
      `${file}/${r.name}: flaggedRowIndices length ${idxs.length} ≠ nOutliers ${expectedCount}`);

    // 1-indexed + within dataset row range.
    for (const ri of idxs) {
      assert(Number.isInteger(ri), `${file}/${r.name}: non-integer index ${ri}`);
      assert(ri >= 1 && ri <= nRows,
        `${file}/${r.name}: index ${ri} out of dataset row range [1..${nRows}]`);
    }

    // Cross-check vs the capped details array — every index in details should
    // appear in flaggedRowIndices (details is a subset capped at 50/100).
    const detailRows = (r.details || [])
      .map(d => d.Row ?? d.row)
      .filter(v => Number.isInteger(v));
    for (const dr of detailRows) {
      assert(idxs.includes(dr),
        `${file}/${r.name}: details row ${dr} not in flaggedRowIndices`);
    }
  }
}

console.log(failed === 0 ? '\n✓ all assertions passed' : `\n✗ ${failed} assertion(s) failed`);
process.exit(failed === 0 ? 0 : 1);
