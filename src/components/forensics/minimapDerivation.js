/* ── minimapDerivation — shared axis-agnostic helpers for minimap renders ──
   S163 Phase 3a. Extracted from MinimapStrip.jsx (the horizontal sticky-
   surface inline strip) so the new MinimapStripVertical sibling can
   consume the same data-derivation path. Both helpers are pure functions
   of their inputs and carry no horizontal- or vertical-specific
   geometry — only matrix-to-vis-row indirection and finding-shape
   filtering.

   Consumers today:
     - MinimapStrip.jsx (horizontal, inline §2 sticky-surface slot)
     - MinimapStripVertical.jsx (vertical, A1.D3 panel-internal — no
       consumer mount in Phase 3a; lands at Phase 3c).
*/

/**
 * Per-visible-row max flag count derived from the convergence grid.
 *
 * The grid keys are matrix coords as `"matRow,matCol"` strings;
 * rowMap[matRow] = visRow maps matrix to vis-row space. Rows outside
 * the [0, nVisRows) range are dropped (defensive against rowMap entries
 * that filter rows out of the display).
 *
 * S163 B2d G1: the `filterTests` per-test filter param retires. The
 * convergence grid is now re-keyed on the active selection upstream
 * (FindingDetailPanel's `activeConvergence` memo); the grid IS the
 * filter source, and a redundant filter param at the consumer was a
 * stale-gate hazard (per the guardrail banked from B2c's
 * `overflow.horizontal` issue — don't keep null-passed live params).
 *
 * @param {Map<string, {count:number, tests:string[]}>|null} grid - convergence.grid (already filtered to active selection upstream)
 * @param {number[]|null} rowMap - matRow → visRow indirection (identity fallback when null/undefined)
 * @param {number} nVisRows - visible row count, used as upper bound
 * @returns {Map<number, number>} visRow → max flag count across cells in that row
 */
export function buildPerVisRowMax(grid, rowMap, nVisRows) {
  const map = new Map();
  if (!grid) return map;
  for (const [key, cell] of grid) {
    const [mr] = key.split(",").map(Number);
    const visRow = rowMap ? (rowMap[mr] ?? mr) : mr;
    if (visRow < 0 || visRow >= nVisRows) continue;
    const cur = map.get(visRow) || 0;
    if (cell.count > cur) map.set(visRow, cell.count);
  }
  return map;
}

/**
 * Per-visible-col max flag count derived from the convergence grid.
 *
 * Column-axis sibling of buildPerVisRowMax. The grid keys are matrix
 * coords as `"matRow,matCol"` strings; matColToVisCol[matCol] = visCol
 * maps matrix-col to vis-col space. Cols outside [0, nVisCols) drop out
 * (defensive against entries that filter cols out of the display).
 *
 * S163 B2d G1: `filterTests` retired (see buildPerVisRowMax above for
 * the rationale — single-source-of-truth grid filtering upstream).
 *
 * @param {Map<string, {count:number, tests:string[]}>|null} grid - convergence.grid (already filtered to active selection upstream)
 * @param {Map<number, number>|object|null} matColToVisCol - matCol → visCol map (or array-like indirection)
 * @param {number} nVisCols - visible col count, used as upper bound
 * @returns {Map<number, number>} visCol → max flag count across cells in that col
 */
export function buildPerVisColMax(grid, matColToVisCol, nVisCols) {
  const map = new Map();
  if (!grid) return map;
  const lookup = (mc) => {
    if (!matColToVisCol) return mc;
    if (typeof matColToVisCol.get === "function") {
      const v = matColToVisCol.get(mc);
      return v == null ? mc : v;
    }
    return matColToVisCol[mc] ?? mc;
  };
  for (const [key, cell] of grid) {
    const [, mc] = key.split(",").map(Number);
    const visCol = lookup(mc);
    if (visCol < 0 || visCol >= nVisCols) continue;
    const cur = map.get(visCol) || 0;
    if (cell.count > cur) map.set(visCol, cell.count);
  }
  return map;
}

/**
 * Region overlay descriptors derived from the findings array.
 *
 * Localised findings with both a `regionNumber` and populated
 * `region.cells` produce one overlay each. The S126b add-8 fallback
 * shape (chip-only finding with empty `region.cells`) is filtered out —
 * such findings have no minimap position to claim. Findings without a
 * `region.rowRange` are also filtered (defensive).
 *
 * Output is sorted by `regionNumber` so the consumer can iterate in
 * stable order regardless of finding-array order.
 *
 * @param {object[]|null} findings - finding objects (type, regionNumber, region, severity, tests)
 * @param {number[]|null} rowMap - matRow → visRow indirection
 * @returns {{regionNumber:number, severity:string, visRowStart:number, visRowEnd:number, tests:object[]}[]}
 */
export function deriveOverlays(findings, rowMap) {
  const out = [];
  for (const f of (findings || [])) {
    if (f.type !== "localised") continue;
    if (f.regionNumber == null) continue;
    if (!f.region?.cells?.length) continue;
    if (!f.region?.rowRange) continue;
    const matStart = f.region.rowRange[0];
    const matEnd = f.region.rowRange[1];
    const visStart = rowMap ? (rowMap[matStart] ?? matStart) : matStart;
    const visEnd = rowMap ? (rowMap[matEnd] ?? matEnd) : matEnd;
    out.push({
      regionNumber: f.regionNumber,
      severity: f.severity,
      visRowStart: visStart,
      visRowEnd: visEnd,
      tests: f.tests || [],
    });
  }
  out.sort((a, b) => a.regionNumber - b.regionNumber);
  return out;
}
