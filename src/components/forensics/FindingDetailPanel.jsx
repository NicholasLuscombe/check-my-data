/* ── FindingDetailPanel — §2 sticky-surface data block (S163) ──
   Renders the active-region data view inside StickySurface — vertical
   minimap + ExcerptTable in compactMode — when the parent's Data
   toggle is open. The parent (StickySurface) gates the mount; this
   component does not own `dataExpanded` state.

   Phase 3b authored the scaffold (header + status placeholder + ✕).
   Phase 3c added the Show data toggle, three-case status copy via
   `TEST_RAW_VISIBILITY`, and the data block. Phase 3e folded the
   panel content inside the sticky surface as a non-sticky child.
   Fix-pass 1 (this rev) retires the header / status / ✕ row + Show
   data toggle from this surface — those concerns either retire
   entirely or move up to StickySurface. What remains here is the
   data block layout: vertical minimap on the left, ExcerptTable on
   the right, bounded at 320 px with internal table scroll.

   Two render modes:

     - finding === null: aggregated overlap view. Vertical minimap
       shows convergence shading from all findings; ExcerptTable
       scrolls to row 1 with no region/activeTestKey props.

     - finding !== null: single-region view. Vertical minimap filters
       to the active finding's tests via `activeFindingTests`;
       ExcerptTable scrolls to `finding.region` and tints cells per
       `finding.tests[0].testId`. Fallback findings (region.cells
       empty) fall through to the aggregated view — they have no
       per-cell evidence to filter on. */

import { useMemo } from "react";
import { GROUP_MARKERS, RANK_NUMS } from "../../constants/mechanisms.js";
import { MinimapStripVertical } from "./MinimapStripVertical.jsx";
import { ExcerptTable } from "./ExcerptTable.jsx";

// Chip-class predicate. Localised chips carry per-cell evidence
// (region.cells populated → the table excerpt has cells to tint).
// Fallback chips fired severity > LOW but produced no specific cells;
// the data view can't be filtered to their region.
function isLocalisedChip(finding) {
  return (finding?.region?.cells?.length || 0) > 0;
}

// Group-marker map derivation — DupDet exact-row groups + ConstOffset
// offset pairs flow from convergence.groups through this map into
// ExcerptTable via the optional `groupMarkerMap` prop, which renders
// rank / marker tokens in the table's leading column.
function buildGroupMarkerMap(convergence) {
  const groups = convergence?.groups || [];
  const map = new Map();
  const typeIdx = { exact: 0, offset: 0 };
  for (const g of groups) {
    const markers = GROUP_MARKERS[g.type] || RANK_NUMS;
    const idx = typeIdx[g.type] ?? 0;
    map.set(g.id, markers[idx] || `(${idx + 1})`);
    if (g.type in typeIdx) typeIdx[g.type]++;
  }
  return map;
}

export function FindingDetailPanel({ finding, heatmapProps = null, onActivateRegion = null }) {
  const groupMarkerMap = useMemo(
    () => buildGroupMarkerMap(heatmapProps?.convergence),
    [heatmapProps?.convergence]
  );

  // Single-test ID filter for the vertical minimap. The Set is built
  // from finding.tests when the chip is localised; otherwise null
  // (no filter → aggregated overlap view). useMemo so referential
  // identity stays stable across re-renders that don't change the
  // finding.
  const activeFindingTests = useMemo(() => {
    if (!finding || !isLocalisedChip(finding)) return null;
    const ids = (finding.tests || []).map(t => t.testId).filter(Boolean);
    return ids.length ? new Set(ids) : null;
  }, [finding]);

  if (!heatmapProps) return null;

  const localised = finding && isLocalisedChip(finding);

  return (
    <div style={{
      marginTop: "10px",
      display: "flex",
      gap: "10px",
      alignItems: "stretch",
      maxHeight: "320px",
    }}>
      <div style={{ flexShrink: 0, height: "320px" }}>
        <MinimapStripVertical
          convergence={heatmapProps.convergence}
          findings={heatmapProps.findings}
          rowMap={heatmapProps.rowMap}
          nVisRows={heatmapProps.rawData?.length || 0}
          onActivateRegion={onActivateRegion}
          activeFindingTests={activeFindingTests}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: "auto", maxHeight: "320px" }}>
        <ExcerptTable
          convergence={heatmapProps.convergence}
          rawData={heatmapProps.rawData}
          rowMap={heatmapProps.rowMap}
          colHeaders={heatmapProps.colHeaders}
          visColIndices={heatmapProps.visColIndices}
          dColMap={heatmapProps.dColMap}
          roles={heatmapProps.roles}
          coordCtx={heatmapProps.coordCtx}
          condPerCol={heatmapProps.condPerCol}
          findings={heatmapProps.findings}
          groupMarkerMap={groupMarkerMap}
          region={localised ? finding.region : null}
          activeTestKey={localised ? (finding.tests?.[0]?.testId || null) : null}
          compactMode={true}
        />
      </div>
    </div>
  );
}
