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

import { useMemo, useState, useCallback, useLayoutEffect } from "react";
import { GROUP_MARKERS, RANK_NUMS, TEST_RAW_VISIBILITY, DISPLAY_NAMES } from "../../constants/mechanisms.js";
import { FW } from "../../constants/tokens.js";
import { MINIMAP_CALLOUT_TYPOGRAPHY } from "../shared/Section.jsx";
import { buildConvergenceGridFromFindings } from "../../analysis/convergence.js";
import { MinimapStripVertical } from "./MinimapStripVertical.jsx";
import { MinimapStripHorizontal } from "./MinimapStripHorizontal.jsx";
import { ExcerptTable } from "./ExcerptTable.jsx";

// S163 B2a W3: guidance caption above the data block, active-finding-
// only. Reads TEST_RAW_VISIBILITY for the active test plus the
// finding's locality, then picks the matching one-liner. The caption
// reinforces what the highlight extent already shows visually — the
// visual leads; this is the plain-English handshake.
//
// Wording locked to four plain cases (S163 B2c F7 added the
// whole-table branch):
//   dataset-wide — applies across the whole dataset; no specific cells
//                  to point at. The evidence lives in the test card.
//   unscoped     — flagged but couldn't isolate a position
//   visible      — pattern is in the cells themselves
//   statistical  — pattern is computed, not eyeballable
//
// The dataset-wide / unscoped branch takes precedence over the
// visible / statistical split: when the locality is whole-table, the
// table treatment is the wash (no flagged cells) — the
// "look at the cells but they're unreadable" statistical caption is
// wrong because there ARE no flagged cells to look at. Pre-B2c the
// statistical caption fired by default on dataset-wide findings via
// TEST_RAW_VISIBILITY's "statistical" classification; B2c splits the
// two so dataset-wide gets a positive "see the test card for the
// evidence" framing instead.
//
// S163 B2d G5: caption names its finding inline. Pre-B2d the four
// caption strings were generic ("This applies across the whole
// dataset...") — readers couldn't tell which finding the caption
// referred to when multiple chips were active and the lastAdded was
// the implicit subject. Naming the finding makes each caption self-
// evidently specific: "<display name> applies across the whole
// dataset...". Falls back to "This pattern" when display name
// resolution fails (defensive against missing DISPLAY_NAMES entry).
//
// Pre-active-finding state: no caption row at all (returns null) so the
// sticky surface stays as light as before at rest.
function guidanceCaption(finding) {
  if (!finding) return null;
  const testName = finding.tests?.[0]?.testId;
  const displayName = (testName && DISPLAY_NAMES[testName]) || testName || "This finding";
  if (finding.locality === "dataset-wide") {
    return `${displayName} applies across the whole dataset — see the test card for the evidence.`;
  }
  if (finding.locality === "unscoped") {
    return `${displayName} flagged the data but couldn't isolate specific rows. See the test card for the statistical detail.`;
  }
  const visibility = TEST_RAW_VISIBILITY[testName];
  if (visibility === "visible") {
    return `${displayName}: the flagged cells show the pattern directly — compare the highlighted values.`;
  }
  return `${displayName}: this pattern is statistical — it won't be visible in the individual values. See the test card.`;
}

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

// S163 A1.D3 final pass: data block bounded so the §3 test card has
// materially more room than the prior 320 px state. Budget breakdown:
// header stack ~80 px (letter + condition span + name+chip rows in
// compactMode) + 7 body rows × 22.5 px = 157.5 + paddingBottom 14 +
// 1 px border ≈ 252 px total. Slight overshoot to 250 covers the case
// where compactMode header chip retires (item 3) and the header stack
// drops to ~60 px — giving ~8 visible body rows on chip-free fixtures.
const DATA_BLOCK_HEIGHT = 250;

export function FindingDetailPanel({
  // S163 B2b: the panel now operates on multi-select state.
  //   activeFindings  — array of currently-active findings (drives the
  //                     data-block compositing via spec.localityCompose).
  //   focusFinding    — the last-added finding; drives the panel chrome
  //                     (caption + activeTestKey for any per-test
  //                     specialised builder). null when the active set
  //                     is empty (subset mode, no selection) or when
  //                     none of the active findings is "last-added"
  //                     (all-on mode at panel-expand time).
  //   selectionMode   — 'all' | 'subset'. dimUncovered fires in subset
  //                     mode with at least one selected finding;
  //                     all-on suppresses dim so the message reads as
  //                     "show me everything".
  activeFindings = null,
  focusFinding = null,
  selectionMode = "all",
  heatmapProps = null,
  hotspotScrollRef = null,
}) {
  const groupMarkerMap = useMemo(
    () => buildGroupMarkerMap(heatmapProps?.convergence),
    [heatmapProps?.convergence]
  );

  // S163 B2d G1: re-key the convergence grid on the active selection.
  // Pre-B2d, `heatmapProps.convergence` was built once from ALL findings
  // in ReportView and threaded immutably to the three panel consumers
  // (ExcerptTable cell-fill heat, MinimapStripVertical density,
  // MinimapStripHorizontal density). Selection state updated cleanly
  // via B2b Model B; the grid the render reads did not — three symptoms
  // share that one root: stale cell fill on deselect, stale minimap
  // density on Clear all, horizontal-strip / cell-fill mismatch under
  // subset selection.
  //
  // The fix derives an `activeConvergence` that rebuilds the grid from
  // `activeFindings` (the load-bearing slice of selection state), keeps
  // every other field on the convergence object from the original
  // (`hotspots`, `pattern`, `groups`, `nRows`, `nCols` describe the
  // dataset's full forensic state, not the active selection — they
  // continue to come from `heatmapProps.convergence`), and threads
  // `activeConvergence` to the three consumers in place of the raw
  // convergence.
  //
  // Guardrail 1 — `mode='all'` early-return PRESERVED. The default
  // resting state (every finding active) early-returns the original
  // convergence object as-is — no recompute, no allocation. This is
  // what keeps the 22-fixture batch parity intact: at mode='all', the
  // rendered grid is byte-identical to the pre-B2d grid.
  const activeConvergence = useMemo(() => {
    if (!heatmapProps?.convergence) return heatmapProps?.convergence ?? null;
    // mode='all' → resting state. Reuse the original grid; no allocation.
    if (selectionMode === "all") return heatmapProps.convergence;
    // mode='subset' (selected may be empty or populated) →
    // rebuild the grid from active findings. Empty active set yields
    // an empty grid (no cells touched), which is what makes Clear all
    // visibly clear.
    const nRows = heatmapProps.convergence.nRows ?? 0;
    const nCols = heatmapProps.convergence.nCols ?? 0;
    const activeGrid = buildConvergenceGridFromFindings(activeFindings || [], nRows, nCols);
    return { ...heatmapProps.convergence, grid: activeGrid };
  }, [selectionMode, activeFindings, heatmapProps?.convergence]);

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

  // Overflow gates for the two panel minimaps (S163 A1.D3 final pass +
  // sign-clip fix). Render each axis's minimap only when that axis
  // actually scrolls. Pre-fix, this was a single-shot useLayoutEffect
  // that captured overflow once on scrollEl arrival — the captured
  // state went stale as soon as the table's layout settled (e.g. when
  // content-aware widths flowed through, when minWidth:100% distributed
  // flex, on viewport resize). Post-fix uses a ResizeObserver on
  // scrollEl so the gate re-evaluates whenever the scroller's
  // dimensions OR content size change. Threshold > 1 px tolerates
  // sub-pixel rounding (Retina half-pixel residue from the density
  // pass's 22.5 row height).
  const [overflow, setOverflow] = useState({ vertical: false, horizontal: false });
  useLayoutEffect(() => {
    if (!scrollEl) {
      setOverflow({ vertical: false, horizontal: false });
      return undefined;
    }
    const evalOverflow = () => {
      const v = scrollEl.scrollHeight - scrollEl.clientHeight > 1;
      const h = scrollEl.scrollWidth  - scrollEl.clientWidth  > 1;
      setOverflow(prev => (prev.vertical === v && prev.horizontal === h) ? prev : { vertical: v, horizontal: h });
    };
    evalOverflow();
    const ro = new ResizeObserver(evalOverflow);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [scrollEl]);

  if (!heatmapProps) return null;

  // Focus drives the panel chrome: caption + region scroll + per-test
  // specialised builder key (activeTestKey). The data block composites
  // the FULL active selection, but only the last-added finding gets
  // its caption / per-test paint highlighted — consistent with the
  // scroll-on-add-only model and avoids stacking N captions when
  // multiple findings are active.
  const focusLocalised = focusFinding && isLocalisedChip(focusFinding);
  const nVisRows = heatmapProps.rawData?.length || 0;
  const nVisCols = heatmapProps.visColIndices?.length || 0;
  const caption = guidanceCaption(focusFinding);
  // dimUncovered: subset mode + at least one selection. Threaded to
  // buildHighlightSpec via ExcerptTable's ctx so cells outside the
  // active coverage demote when the user has narrowed focus, but
  // stay full-strength when the message is "show me everything".
  const dimUncovered = selectionMode === "subset" && (activeFindings?.length || 0) > 0;

  return (
    <div style={{
      marginTop: "10px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    }}>
      {/* S163 B2a W3: active-finding guidance caption. Reinforces the
          visual extent the table is painting. Rendered ONLY when a
          finding is active — at rest the sticky surface keeps its
          pre-B2a vertical footprint (no permanent status row). */}
      {caption && (
        <div style={{
          ...MINIMAP_CALLOUT_TYPOGRAPHY,
          fontWeight: FW.NORM,
          lineHeight: 1.5,
        }}>
          {caption}
        </div>
      )}

      {/* Horizontal strip above the table. S163 B2c F4: the
          `overflow.horizontal &&` gate retires. The strip carries
          flag DENSITY (information, not navigation) — it must
          render whenever there are flags to show, independent of
          whether the column axis overflows. The
          `MinimapStripHorizontal.jsx:111` internal null-return
          (`perCol.size === 0 && nVisCols === 0`) is the single
          source of truth for "nothing to draw" — a second gate
          here would be redundant and a future stale-logic hazard.
          The viewport-band rendering is a no-op when scrollWidth
          equals clientWidth (band spans the full strip = visually
          inert) — the band logic stays for the actual-overflow
          case regardless. */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {/* Left spacer matches the vertical minimap's width (32 px)
            when it's rendered, so the horizontal strip's flag-
            density bars sit over the table body — not over the
            frozen # / Label columns. When the vertical minimap is
            suppressed (small fixture, no row overflow), the spacer
            also retires so the horizontal strip starts at the
            table's actual left edge. */}
        {overflow.vertical && <div style={{ flexShrink: 0, width: 32 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* S163 B2d G1: read `activeConvergence`, NOT the raw
              heatmapProps.convergence. The grid is now re-keyed on
              the active selection (rebuild on subset mode change;
              the same object on mode='all'); `activeFindingTests`
              retired per guardrail 3 — the grid IS the filter
              source, a redundant filter param would be a stale-
              gate hazard. */}
          <MinimapStripHorizontal
            convergence={activeConvergence}
            matColToVisCol={matColToVisCol}
            nVisCols={nVisCols}
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
        {/* Vertical minimap rendered only when the row axis actually
            overflows. Small fixtures whose rows fit in the visible
            window get no strip — the row drops out and the table
            takes the full width (vertical minimap's slot retires).
            The table sits inside its own flex:1 column already, so
            this column simply disappearing shifts the table left. */}
        {overflow.vertical && (
          <div style={{ flexShrink: 0, height: DATA_BLOCK_HEIGHT }}>
            {/* S163 B2d G1: read activeConvergence; activeFindingTests prop retires. */}
            <MinimapStripVertical
              convergence={activeConvergence}
              rowMap={heatmapProps.rowMap}
              nVisRows={nVisRows}
              tableEl={scrollEl}
            />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, height: DATA_BLOCK_HEIGHT }}>
          {/* S163 B2d G1: read activeConvergence; the cell-fill heat
              path in ExcerptTable's renderCell reads
              `cell = visGrid.get(...)` where visGrid is the remap of
              this convergence's grid. Re-keying the grid on the active
              selection means cells outside that selection get no
              heat fill — clears the deselect residue at source. */}
          <ExcerptTable
            convergence={activeConvergence}
            rawData={heatmapProps.rawData}
            rowMap={heatmapProps.rowMap}
            colHeaders={heatmapProps.colHeaders}
            visColIndices={heatmapProps.visColIndices}
            dColMap={heatmapProps.dColMap}
            roles={heatmapProps.roles}
            coordCtx={heatmapProps.coordCtx}
            condPerCol={heatmapProps.condPerCol}
            findings={heatmapProps.findings}
            colMaxLen={heatmapProps.colMaxLen}
            groupMarkerMap={groupMarkerMap}
            // region drives the auto-scroll-to-rowRange on mount. Use
            // the focused finding so the panel lands on the last-added
            // finding's region when a new chip joins the active set.
            region={focusLocalised ? focusFinding.region : null}
            // activeTestKey points the per-test specialised builders
            // (RSC, IRC, LOESS, DupDet, Mahalanobis) at the focused
            // finding — when those builders fire (modal-era / back-
            // compat shim path), the focused finding's per-test colour
            // wins. In the panel mount these builders degenerate to
            // EMPTY_SPEC anyway (no `results` threaded), but threading
            // a value here keeps the dim-uncovered predicate firing.
            activeTestKey={focusFinding ? (focusFinding.tests?.[0]?.testId || null) : null}
            activeFindings={activeFindings}
            dimUncovered={dimUncovered}
            compactMode={true}
            onScrollContainerReady={onScrollContainerReady}
            hotspotScrollRef={hotspotScrollRef}
          />
        </div>
      </div>
    </div>
  );
}
