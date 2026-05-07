// ── ConditionContext ─────────────────────────────────────────────────
// Unified condition handling: normalizes column-grouped groups,
// row-level COND columns, and conditions-mode columns into a single
// interface threaded through the analysis engine.

/**
 * @typedef {Object} CondSlice
 * @property {string} name - Condition/group name
 * @property {number[][]} matrix - Sub-matrix for this condition
 * @property {number[]} [colIndices] - Original column indices (column-grouped only)
 * @property {number[]} [rowIndices] - Original row indices (row-grouped only)
 */

/**
 * @typedef {Object} ConditionContext
 * @property {'column-grouped'|'row-grouped'|'none'} type
 * @property {string[]} names - Condition names in order
 * @property {number} count - Number of conditions
 * @property {boolean} paired - Rows aligned across conditions? (true for column-grouped)
 * @property {boolean} has - Any conditions present?
 * @property {function(): CondSlice[]} slices - Sub-matrices per condition
 * @property {function(number=): Object[]|null} rowGroups - Row-partitioned groups for Mahalanobis
 * @property {function(CondSlice): ConditionContext} forSubMatrix - Child condCtx scoped to a group sub-matrix
 * @property {function(number[][]): ConditionContext} withMatrix - Same structure, different data (for VST)
 * @property {(string|null)[]|null} rowConditions - Per-row condition labels (scoped to current matrix)
 * @property {(string|null)[][]|null} rowConditionsCols - Per-COND-column label arrays (scoped)
 */

/**
 * Create a ConditionContext from whatever the import pipeline emits.
 *
 * @param {Object} opts
 * @param {Object[]|null} opts.groups - Column-grouped groups from two-row header.
 *   Each: {name, matrixColIndices, matrix}
 * @param {(string|null)[]|null} opts.rowConditions - Merged per-row condition labels from COND columns.
 * @param {(string|null)[][]|null} opts.rowConditionsCols - Per-COND-column label arrays for
 *   independent stratification (kurtosis).
 * @param {number[][]} opts.matrix - The full numeric matrix (rows x data columns).
 * @param {string} [opts.colRelationship='replicates'] - 'replicates' or 'conditions'.
 *   When 'conditions', each DATA column becomes its own condition group (paired=false).
 * @param {string[]|null} [opts.dataColHeaders=null] - Column headers for conditions-mode naming.
 * @returns {ConditionContext}
 */
export function createConditionContext({
  groups = null,
  rowConditions = null,
  rowConditionsCols = null,
  matrix,
  colRelationship = 'replicates',
  dataColHeaders = null,
}) {
  const hasGroups = groups && groups.length >= 2;
  const hasRowConds = rowConditions && rowConditions.some(c => c);
  const isConditionsMode = colRelationship === 'conditions';

  // Determine type
  // Column groups take priority. If no groups but conditions-mode,
  // build column-grouped with paired=false. Otherwise fall back to row-grouped or none.
  let type, paired;
  if (hasGroups) {
    type = 'column-grouped';
    paired = true;
  } else if (isConditionsMode && matrix[0]?.length >= 2) {
    type = 'column-grouped';
    paired = false; // columns are separate conditions, not replicates
  } else if (hasRowConds) {
    type = 'row-grouped';
    paired = false;
  } else {
    type = 'none';
    paired = false;
  }

  const has = type !== 'none';

  // Build condition names
  let names;
  if (hasGroups) {
    names = groups.map(g => g.name);
  } else if (isConditionsMode && matrix[0]?.length >= 2) {
    const nC = matrix[0].length;
    names = [];
    for (let ci = 0; ci < nC; ci++) {
      names.push(dataColHeaders?.[ci] || `Condition ${ci + 1}`);
    }
  } else if (hasRowConds) {
    // Preserve order of first appearance
    const seen = new Set();
    names = [];
    for (const c of rowConditions) {
      if (c && !seen.has(c)) { seen.add(c); names.push(c); }
    }
  } else {
    names = [];
  }

  const count = names.length;

  // ── slices() ──────────────────────────────────────────────────────
  // Returns sub-matrices per condition. Column-grouped → column subsets.
  // Row-grouped → row subsets. Conditions-mode → single-column groups.

  function slices() {
    if (hasGroups) {
      return groups.map(g => ({
        name: g.name,
        matrix: g.matrix,
        colIndices: g.matrixColIndices,
      }));
    }
    if (isConditionsMode && matrix[0]?.length >= 2) {
      const nC = matrix[0].length;
      const result = [];
      for (let ci = 0; ci < nC; ci++) {
        const name = dataColHeaders?.[ci] || `Condition ${ci + 1}`;
        const subMatrix = matrix.map(row => [row[ci]]).filter(row => row[0] !== null);
        if (subMatrix.length >= 3) {
          result.push({ name, matrix: subMatrix, colIndices: [ci] });
        }
      }
      return result;
    }
    if (hasRowConds) {
      const rg = {};
      for (let r = 0; r < matrix.length && r < rowConditions.length; r++) {
        const c = rowConditions[r];
        if (!c) continue;
        if (!rg[c]) rg[c] = { name: c, rows: [], rowIndices: [] };
        rg[c].rows.push(matrix[r]);
        rg[c].rowIndices.push(r);
      }
      return Object.values(rg)
        .filter(g => g.rows.length >= 3)
        .map(g => ({ name: g.name, matrix: g.rows, rowIndices: g.rowIndices }));
    }
    // No conditions — single group with full matrix
    return [{ name: 'All data', matrix }];
  }

  // ── rowGroups() ───────────────────────────────────────────────────
  // Row-partitioned groups for Mahalanobis stratification.
  // Only available for row-grouped data (no column groups).

  function rowGroups(minPerGroup = 3) {
    if (hasGroups || !hasRowConds) return null;
    const rg = {};
    for (let r = 0; r < matrix.length && r < rowConditions.length; r++) {
      const c = rowConditions[r];
      if (!c) continue;
      if (!rg[c]) rg[c] = [];
      rg[c].push(r);
    }
    const condNames = Object.keys(rg);
    if (condNames.length < 2 || !condNames.every(c => rg[c].length >= minPerGroup)) return null;
    return condNames.map(c => ({
      name: c,
      matrix: rg[c].map(r => matrix[r]),
      rowIndices: rg[c],
    }));
  }

  // ── forSubMatrix(slice) ───────────────────────────────────────────
  // Create a child condCtx scoped to a group sub-matrix.
  // Remaps rowConditions to match the sub-matrix's row space.
  // This fixes the known bug where full-dataset rowConditions were
  // passed to tests operating on column-subset sub-matrices.

  function forSubMatrix(slice) {
    if (!hasRowConds) {
      return createConditionContext({
        groups: null,
        rowConditions: null,
        rowConditionsCols: null,
        matrix: slice.matrix,
      });
    }

    // For column-grouped groups, the sub-matrix was built by:
    //   matrix.map(row => colIndices.map(ci => row[ci]))
    //         .filter(row => row.some(v => v !== null))
    // We replay this filter to find which parent rows survived.
    const colIndices = slice.colIndices || slice.matrixColIndices;
    if (!colIndices) {
      // Row-grouped slice — rowConditions don't apply (already partitioned)
      return createConditionContext({
        groups: null,
        rowConditions: null,
        rowConditionsCols: null,
        matrix: slice.matrix,
      });
    }

    const subRowConds = [];
    const subRowCondsCols = rowConditionsCols
      ? rowConditionsCols.map(() => [])
      : null;

    for (let r = 0; r < matrix.length; r++) {
      // Replay the filter: does this row have ≥1 non-null in group's columns?
      const hasValue = colIndices.some(ci => matrix[r][ci] !== null);
      if (hasValue) {
        subRowConds.push(r < rowConditions.length ? rowConditions[r] : null);
        if (subRowCondsCols) {
          rowConditionsCols.forEach((col, colIdx) => {
            subRowCondsCols[colIdx].push(r < col.length ? col[r] : null);
          });
        }
      }
    }

    return createConditionContext({
      groups: null,
      rowConditions: subRowConds.some(c => c) ? subRowConds : null,
      rowConditionsCols: subRowCondsCols?.some(col => col.some(c => c)) ? subRowCondsCols : null,
      matrix: slice.matrix,
    });
  }

  // ── withMatrix(newMatrix) ─────────────────────────────────────────
  // Same condition structure, different data. For VST transforms.
  // Column indices stay the same; sub-matrices are rebuilt from newMatrix.

  function withMatrix(newMatrix) {
    let newGroups = null;
    if (hasGroups) {
      newGroups = groups.map(g => ({
        name: g.name,
        matrixColIndices: g.matrixColIndices,
        matrix: newMatrix.map(row => g.matrixColIndices.map(ci => row[ci]))
                         .filter(row => row.some(v => v !== null)),
      })).filter(g => g.matrix.length >= 4 && g.matrix[0].length >= 2);
    }

    return createConditionContext({
      groups: newGroups,
      rowConditions,
      rowConditionsCols,
      matrix: newMatrix,
      colRelationship,
      dataColHeaders,
    });
  }

  return {
    type,
    names,
    count,
    paired,
    has,
    slices,
    rowGroups,
    forSubMatrix,
    withMatrix,
    rowConditions: hasRowConds ? rowConditions : null,
    rowConditionsCols: rowConditionsCols || null,
  };
}
