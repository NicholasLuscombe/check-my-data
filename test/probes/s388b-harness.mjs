/* S388 part 2 — shared fixture harness for the export-surface dump.
 *
 * Reproduces the REAL import path: ImportView's `handleProceed` config object
 * (src/components/views/ImportView.jsx) plus App.jsx's `{...config, vst}`, so
 * the `importConfig` the exports receive carries the fields they actually read
 * — vst, dataType, summary, provenance, headerRows, skippedRows, removedCols.
 * A probe that builds its config from the parse alone renders defaults for all
 * six and cannot see a change that reaches a surface through any of them.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const FIXTURES = 'test/fixtures';

export async function buildFixture(file, assay) {
  const Papa = await import('papaparse');
  const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
  const { detectVST } = await import('../../src/stats/vst.js');
  const { inferRoles } = await import('../../src/import/roles.js');
  const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
  const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
  const { detectLongFormat } = await import('../../src/import/longFormat.js');
  const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
  const { summarize } = await import('../../src/import/summary.js');

  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const rawRows0 = Papa.default.parse(csv, { skipEmptyLines: true }).data;
  const pp = preprocessRaw(rawRows0);
  const raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const hdrs = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, hdrs, condPerCol);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const longFormatDetected = !!detectLongFormat(hdrs, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected }).value || 'ordered';

  const dataColHeaders = roles.map((r, i) => r === 'data' ? (hdrs?.[i] || `Col ${i + 1}`) : null).filter(h => h !== null);
  const { matrix, rawMatrix, filteredIndices, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false, colRelationship: 'replicates', dataColHeaders,
  });
  const vst = detectVST(matrix, assay);

  let summary = null;
  try { summary = summarize(data, roles, condPerCol, false); } catch (e) { summary = null; }

  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics
  );

  const importConfig = {
    data, roles, hdrs, condPerCol, zeroAsMissing: false,
    assay, assayAutoDetected: false, dataType, fileName: file,
    isPivoted: false, colRelationship: 'replicates', colRelAutoSet: true,
    rowSemantics, rowSemanticsAuto: true, vstAutoSet: true, excelMeta: null,
    skippedRows: pp?.skippedRows || 0,
    headerRows: headerRows || 0,
    removedCols: pp?.removedCols || [],
    headerContent: rawRows0 ? rawRows0.slice(0, headerRows || 0) : [],
    summary,
    longFormatDetected,
    provenance: { cols: 'auto', rows: 'auto', assay: 'auto', transform: 'auto' },
    vst,
  };

  return { results, importConfig, matrix, rowMap: filteredIndices };
}
