/* ── FindingDetailPanel — §2 sticky-surface data block (S163) ──
   Renders the active-region data view inside StickySurface — vertical
   minimap + horizontal minimap + full data table (compactMode) — when
   the parent's Data toggle is open. The parent (StickySurface) gates
   the mount; this component does not own `dataExpanded` state.

   Layout (S163 virtualisation rework):
     ┌───────────────────────────────────────────┐
     │            horizontal minimap             │  ← scroll position band
     ├────┬──────────────────────────────────────┤
     │ v  │ full table — real scroll, visible    │
     │ m  │ scrollbars, virtualisation above     │
     │    │ 500 rows. Cmd-F works below thresh.  │
     └────┴──────────────────────────────────────┘

   The vertical minimap reads the table's scrollTop; the horizontal
   minimap reads its scrollLeft. Both render viewport-indicator bands.
   Click + drag either minimap writes back to the table's
   scrollTop / scrollLeft. The scroll container is height-bounded
   (~320 px) — ScrollTable's internal overflow + virtualisation
   handle whatever the dataset size requires.

   Pre-rework (fix-pass 2): the minimaps were SCRUBBERS — clicked to
   slice a 10-row × 8-col window into the table, no real scroll. The
   virtualisation audit (SESSION163-VIRTUALISATION-AUDIT-SUMMARY.md)
   ratified scroll-based navigation; this file is the consumer-side
   of that lock.

   Two render modes (data-axis):
     - finding === null: aggregated overlap view. Both minimaps show
       full-dataset convergence shading; ExcerptTable scrolled to top
       with no region/activeTestKey props.
     - finding !== null: single-region view. Minimaps filter shading
       to the active finding's tests via `activeFindingTests`;
       ExcerptTable receives region + activeTestKey so cell-tint
       highlighting fires. Fallback findings (region.cells empty)
       fall through to the aggregated view — they have no per-cell
       evidence to filter on. */

import { useMemo, useState, useCallback } from "react";
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

// Invert visColIndices into a matCol → visCol lookup. The horizontal
// minimap uses it to position convergence-grid keys (matCol space)
// on its strip-axis (visCol space).
function buildMatColToVisCol(visColIndices) {
  const map = new Map();
  if (!visColIndices) return map;
  for (let vi = 0; vi < visColIndices.length; vi++) {
    map.set(visColIndices[vi], vi);
  }
  return map;
}

const DATA_BLOCK_HEIGHT = 320;

export function FindingDetailPanel({
  finding,
  heatmapProps = null,
  hotspotScrollRef = null,
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

  // Shared scroll-container DOM element. ExcerptTable announces its
  // internal scroll container via `onScrollContainerReady` once
  // mounted; both minimaps consume the element directly for
  // viewport-band coordination + click/drag scroll writers.
  // State (vs ref) so the minimaps re-render when the element
  // arrives — a ref-mirror would lose the race with child effects
  // that fire before ExcerptTable's announce callback.
  const [scrollEl, setScrollEl] = useState(null);
  const onScrollContainerReady = useCallback((el) => setScrollEl(el), []);

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
    }}>
      {/* Horizontal minimap above the table — viewport band tracks
          table.scrollLeft. Aligned to the right of the vertical
          minimap's width so the flag-density bars sit over the table
          body, not over the frozen index/label columns. */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ flexShrink: 0, width: 32 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <MinimapStripHorizontal
            convergence={heatmapProps.convergence}
            matColToVisCol={matColToVisCol}
            nVisCols={nVisCols}
            activeFindingTests={activeFindingTests}
            tableEl={scrollEl}
          />
        </div>
      </div>

      {/* Vertical minimap + scrollable table row. Total height
          bounded so the sticky-surface budget is predictable.
          ScrollTable's internal scroll + virtualisation handle
          larger datasets within this budget. */}
      <div style={{
        display: "flex",
        gap: "10px",
        alignItems: "stretch",
        height: DATA_BLOCK_HEIGHT,
      }}>
        <div style={{ flexShrink: 0, height: DATA_BLOCK_HEIGHT }}>
          <MinimapStripVertical
            convergence={heatmapProps.convergence}
            rowMap={heatmapProps.rowMap}
            nVisRows={nVisRows}
            activeFindingTests={activeFindingTests}
            tableEl={scrollEl}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, height: DATA_BLOCK_HEIGHT }}>
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
            onScrollContainerReady={onScrollContainerReady}
            hotspotScrollRef={hotspotScrollRef}
          />
        </div>
      </div>
    </div>
  );
}
