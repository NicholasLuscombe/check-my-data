/**
 * Coordinate helpers — map internal data indices to original file positions.
 *
 * The import pipeline strips preamble rows, header rows, and sparse separator
 * columns. These helpers reconstruct the original file coordinates so the user
 * can open their spreadsheet and go directly to flagged cells.
 */

/**
 * Convert a 0-based column index to an Excel-style letter (A, B, ... Z, AA, AB...).
 * @param {number} idx — 0-based column index
 * @returns {string}
 */
export function colToExcelLetter(idx) {
  let s = "";
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/**
 * Convert an ImportView.data row index to the original file row number (1-indexed).
 * @param {number} dataRowIndex — 0-based row in importConfig.data
 * @param {number} skippedRows — preamble rows stripped by preprocessRaw
 * @param {number} headerRows — header rows consumed by applyHeaders (0, 1, or 2)
 * @returns {number} 1-indexed file row number
 */
export function originalFileRow(dataRowIndex, skippedRows, headerRows) {
  return dataRowIndex + (skippedRows || 0) + (headerRows || 0) + 1;
}

/**
 * Build row-mapping helpers from importConfig + optional rowMap.
 *
 * Returns:
 *   fileRow(dataRowIdx)   — 0-based data row → 1-indexed file row
 *   toOrigRow(matrixIdx)  — apply rowMap (condition-context mapping), identity if no rowMap
 *   toFileRow(matrixRow1) — 1-indexed matrix row → 1-indexed file row (chains toOrigRow + fileRow)
 *
 * @param {object} importConfig — { skippedRows, headerRows }
 * @param {number[]|null} [rowMap] — condition-context row index mapping
 */
export function makeRowMapper(importConfig, rowMap) {
  const skip = importConfig?.skippedRows || 0;
  const hdr  = importConfig?.headerRows || 0;
  const fileRow    = (dataRowIdx) => originalFileRow(dataRowIdx, skip, hdr);
  const toOrigRow  = (matrixIdx) => rowMap ? (rowMap[matrixIdx] ?? matrixIdx) : matrixIdx;
  const toFileRow  = (matrixRow1) => fileRow(toOrigRow(matrixRow1 - 1));
  return { fileRow, toOrigRow, toFileRow };
}

/**
 * Build a mapping from ImportView.data column indices to original file column
 * indices, accounting for sparse separator columns removed by preprocessRaw.
 *
 * Example: if original file had columns [A, B, C_sparse, D, E] and C was removed,
 * removedCols=[2]. Data col 0→orig 0, data col 1→orig 1, data col 2→orig 3, etc.
 *
 * @param {number} dataColCount — number of columns in importConfig.data
 * @param {number[]} removedCols — original column indices removed (sorted ascending)
 * @returns {number[]} dataCol[i] → original file column index (0-based)
 */
export function buildOriginalColMap(dataColCount, removedCols) {
  if (!removedCols || removedCols.length === 0) {
    return Array.from({ length: dataColCount }, (_, i) => i);
  }
  const removed = new Set(removedCols);
  const map = [];
  let origIdx = 0;
  for (let di = 0; di < dataColCount; di++) {
    while (removed.has(origIdx)) origIdx++;
    map.push(origIdx);
    origIdx++;
  }
  return map;
}

/**
 * Build condition spans from a condPerCol array.
 * Groups consecutive columns sharing the same condition name.
 * @param {string[]|null} condPerCol — per-column condition names (from importConfig)
 * @returns {Array<{name:string, start:number, end:number, len:number}>}
 */
export function buildCondSpans(condPerCol) {
  if (!condPerCol) return [];
  const spans = [];
  let cur = null, start = 0;
  for (let i = 0; i < condPerCol.length; i++) {
    const c = condPerCol[i] || "";
    if (c !== cur) {
      if (cur !== null) spans.push({ name: cur, start, end: i - 1, len: i - start });
      cur = c; start = i;
    }
  }
  if (cur !== null) spans.push({ name: cur, start, end: condPerCol.length - 1, len: condPerCol.length - start });
  return spans;
}

/**
 * Build condition spans for visible columns (ignoring "ignore"-role columns).
 * Returns spans indexed against the filtered column array (as used by ColumnHeaders).
 * @param {string[]|null} condPerCol — per-hdrs-index condition names
 * @param {string[]} roles — per-hdrs-index roles ("data","label","cond","ignore")
 * @returns {Array<{name:string, len:number}>}
 */
export function buildCondSpansForColumns(condPerCol, roles) {
  if (!condPerCol || !roles) return [];
  // Filter to non-ignored columns, preserving order
  const visible = [];
  for (let i = 0; i < roles.length; i++) {
    if (roles[i] !== "ignore") visible.push(condPerCol[i] || "");
  }
  if (visible.length === 0) return [];
  const spans = [];
  let cur = visible[0], len = 1;
  for (let i = 1; i < visible.length; i++) {
    if (visible[i] === cur) { len++; }
    else { spans.push({ name: cur, len }); cur = visible[i]; len = 1; }
  }
  spans.push({ name: cur, len });
  // Only return spans if there are real condition groups (at least one non-empty name)
  return spans.some(s => s.name) ? spans : [];
}

/**
 * Strip condition prefix from a header name.
 * "Anc4+ LII +A+B · R2" → "R2"; "Rep_A" → "Rep_A" (no prefix)
 * @param {string} name
 * @returns {string}
 */
export function shortColName(name) {
  return name.includes(" · ") ? name.split(" · ").pop() : name;
}
