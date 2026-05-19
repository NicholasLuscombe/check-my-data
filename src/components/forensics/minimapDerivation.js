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
 * When `filterTests` is supplied (a Set of test-name strings), the
 * cell's effective flag count is the size of the intersection between
 * `cell.tests` and `filterTests`. Cells with no overlap drop out of
 * the per-row max. This is the "filtered minimap" mode used by the
 * §2 vertical minimap when a chip is active — the strip shows only
 * the active finding's tests, not the aggregate across all tests.
 *
 * @param {Map<string, {count:number, tests:string[]}>|null} grid - convergence.grid
 * @param {number[]|null} rowMap - matRow → visRow indirection (identity fallback when null/undefined)
 * @param {number} nVisRows - visible row count, used as upper bound
 * @param {Set<string>|null} [filterTests] - when non-null, restrict to cells whose tests overlap this set; count = overlap size
 * @returns {Map<number, number>} visRow → max flag count across cells in that row
 */
export function buildPerVisRowMax(grid, rowMap, nVisRows, filterTests = null) {
  const map = new Map();
  if (!grid) return map;
  for (const [key, cell] of grid) {
    const [mr] = key.split(",").map(Number);
    const visRow = rowMap ? (rowMap[mr] ?? mr) : mr;
    if (visRow < 0 || visRow >= nVisRows) continue;
    let count = cell.count;
    if (filterTests) {
      let overlap = 0;
      for (const t of cell.tests || []) {
        if (filterTests.has(t)) overlap++;
      }
      if (overlap === 0) continue;
      count = overlap;
    }
    const cur = map.get(visRow) || 0;
    if (count > cur) map.set(visRow, count);
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
