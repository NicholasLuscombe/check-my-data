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
 * @param {Map<string, {count:number}>|null} grid - convergence.grid
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
