/* ── FindingDetailPanel — §2 sticky-surface data block (S163) ──
   Renders the active-region data view inside StickySurface — vertical
   minimap + horizontal minimap + ExcerptTable in compactMode — when
   the parent's Data toggle is open. The parent (StickySurface) gates
   the mount; this component does not own `dataExpanded` state.

   Layout (after fix-pass 2):
     ┌───────────────────────────────────────────┐
     │            horizontal minimap             │  ← col-axis scrubber
     ├────┬──────────────────────────────────────┤
     │ v  │ excerpt — windowed, no internal      │
     │ m  │ scroll                               │
     └────┴──────────────────────────────────────┘

   The vertical minimap drives windowRowStart; the horizontal minimap
   drives windowColStart. ExcerptTable in compactMode renders only the
   sliced rows × columns inside those windows. Chip-click activation
   in the chip lanes above writes windowRowStart + windowColStart to
   centre the active region.

   Two render modes (data-axis):
     - finding === null: aggregated overlap view. Vertical + horizontal
       minimaps show convergence shading from all findings; ExcerptTable
       windowed at current scrubber position with no
       region/activeTestKey props.
     - finding !== null: single-region view. Minimaps filter to the
       active finding's tests via `activeFindingTests`; ExcerptTable
       receives region + activeTestKey for cell-tint highlighting.
       Fallback findings (region.cells empty) fall through to the
       aggregated view — they have no per-cell evidence to filter on. */

import { useMemo } from "react";
import { GROUP_MARKERS, RANK_NUMS } from "../../constants/mechanisms.js";
import { MinimapStripVertical } from "./MinimapStripVertical.jsx";
import { MinimapStripHorizontal } from "./MinimapStripHorizontal.jsx";
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

// Build a matCol → visCol indirection map from the visColIndices
// array. visColIndices is the visible-col → matCol forward map; this
// inverts it so the horizontal minimap can map convergence-grid
// matCol keys to its strip-axis position.
function buildMatColToVisCol(visColIndices) {
  const map = new Map();
  if (!visColIndices) return map;
  for (let vi = 0; vi < visColIndices.length; vi++) {
    map.set(visColIndices[vi], vi);
  }
  return map;
}

export function FindingDetailPanel({
  finding,
  heatmapProps = null,
  onActivateRegion = null,
  windowRowStart = 0,
  windowRowSize = null,
  onWindowRowChange = null,
  windowColStart = 0,
  windowColSize = null,
  onWindowColChange = null,
}) {
  const groupMarkerMap = useMemo(
    () => buildGroupMarkerMap(heatmapProps?.convergence),
    [heatmapProps?.convergence]
  );

  // Single-test ID filter for the minimaps. Set is built from
  // finding.tests when the chip is localised; otherwise null
  // (no filter → aggregated overlap view).
  const activeFindingTests = useMemo(() => {
    if (!finding || !isLocalisedChip(finding)) return null;
    const ids = (finding.tests || []).map(t => t.testId).filter(Boolean);
    return ids.length ? new Set(ids) : null;
  }, [finding]);

  const matColToVisCol = useMemo(
    () => buildMatColToVisCol(heatmapProps?.visColIndices),
    [heatmapProps?.visColIndices]
  );

  if (!heatmapProps) return null;

  const localised = finding && isLocalisedChip(finding);
  const nVisRows = heatmapProps.rawData?.length || 0;
  const nVisCols = heatmapProps.visColIndices?.length || 0;

  return (
    <div style={{
      marginTop: "10px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      maxHeight: "364px",
    }}>
      {/* Horizontal minimap above the table — column-axis scrubber.
          Aligned to the right of the vertical minimap's width so the
          flag-density bars sit over the table body, not over the
          frozen index/label columns. */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ flexShrink: 0, width: 32 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <MinimapStripHorizontal
            convergence={heatmapProps.convergence}
            matColToVisCol={matColToVisCol}
            nVisCols={nVisCols}
            activeFindingTests={activeFindingTests}
            windowColStart={windowColStart}
            windowColSize={windowColSize}
            onWindowChange={onWindowColChange}
          />
        </div>
      </div>

      {/* Vertical minimap + table row */}
      <div style={{
        display: "flex",
        gap: "10px",
        alignItems: "stretch",
        maxHeight: "320px",
      }}>
        <div style={{ flexShrink: 0, height: "320px" }}>
          <MinimapStripVertical
            convergence={heatmapProps.convergence}
            rowMap={heatmapProps.rowMap}
            nVisRows={nVisRows}
            activeFindingTests={activeFindingTests}
            windowRowStart={windowRowStart}
            windowRowSize={windowRowSize}
            onWindowChange={onWindowRowChange}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden", maxHeight: "320px" }}>
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
            windowRowStart={windowRowStart}
            windowRowSize={windowRowSize}
            windowColStart={windowColStart}
            windowColSize={windowColSize}
          />
        </div>
      </div>
    </div>
  );
}
