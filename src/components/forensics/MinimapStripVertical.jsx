/* ── MinimapStripVertical — A1.D3 row-axis density + viewport band (S163) ──
   Renders a vertical strip of per-vis-row flag-density shading driven
   by the convergence grid, plus a viewport-indicator band that tracks
   the scroll position of the table to its right. Click + drag on the
   strip writes scrollTop on the table, scrolling it to that position.

   S163 Phase 3a authored the component. Fix-pass 1 dropped the [N]
   numeric label on region badges. Fix-pass 2 turned the strip into a
   scrubber (clientY → windowRowStart). The virtualisation rework
   replaces the scrubber model with the bidirectional scrollTop ↔
   viewport-band coordination that internal SegmentMinimap uses — the
   table-coupled VS-Code-minimap idiom.

   Render contract:
     - SVG viewBox `0 0 ${STRIP_W} ${nVisRows}` with
       preserveAspectRatio="none". Stretches the row axis to container
       height so 1 row = 1/nVisRows of container regardless of dataset
       row count.
     - Per-vis-row rects filled per buildPerVisRowMax →
       convergenceMinimapStyle. The convergence grid is re-keyed on
       the active selection upstream (FindingDetailPanel's
       activeConvergence memo — S163 B2d G1), so this strip's
       density automatically reflects the active findings.
     - Viewport band: translucent rect at `[viewFrac[0]*stripH,
       viewFrac[1]*stripH)` driven by tableRef.scrollTop /
       scrollHeight + clientHeight / scrollHeight.
     - Click + drag → tableRef.scrollTop = frac * scrollableH so the
       click position lands at the viewport top. */

import { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { C, CR } from "../../constants/tokens.js";
import { convergenceMinimapStyle } from "../shared/heatmapColors.js";
import { buildPerVisRowMax } from "./minimapDerivation.js";

const STRIP_W = 32;
// Minimum on-screen height (px) for a flagged-row density band. The SVG
// stretches a viewBox nVisRows units tall into the strip's pixel height
// (preserveAspectRatio="none"), so at high row counts a one-unit row
// collapses sub-pixel; this floors each flagged row to a visible band.
// Starting value — tunable on screen.
const MIN_BAND_PX = 2;

export function MinimapStripVertical({
  convergence, rowMap, nVisRows,
  tableEl = null,
}) {
  const grid = convergence?.grid || null;
  const perRow = useMemo(
    () => buildPerVisRowMax(grid, rowMap, nVisRows),
    [grid, rowMap, nVisRows]
  );

  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const [viewFrac, setViewFrac] = useState([0, 1]);
  const [stripHeightPx, setStripHeightPx] = useState(0);

  // Track the table's scrollTop → viewport-band fraction. rAF-throttled
  // so rapid scroll events don't trigger setState storms; mirrors
  // ScrollTable's listener pattern.
  const rafRef = useRef(null);
  const updateViewFrac = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!tableEl) return;
      const scrollableH = tableEl.scrollHeight;
      const viewportH = tableEl.clientHeight;
      if (scrollableH <= 0 || viewportH <= 0 || scrollableH <= viewportH) {
        setViewFrac([0, 1]);
        return;
      }
      const scrollTop = Math.max(0, tableEl.scrollTop);
      const start = scrollTop / scrollableH;
      const end = Math.min(1, (scrollTop + viewportH) / scrollableH);
      setViewFrac([start, end]);
    });
  }, [tableEl]);

  useEffect(() => {
    if (!tableEl) return undefined;
    tableEl.addEventListener("scroll", updateViewFrac, { passive: true });
    updateViewFrac();
    return () => {
      tableEl.removeEventListener("scroll", updateViewFrac);
      // Null the ref after cancelling. Without this, the cancelled rAF
      // ID stays in `rafRef.current` (truthy), and the next mount's
      // `updateViewFrac()` short-circuits at its `if (rafRef.current)
      // return;` guard — stranding viewFrac at its initial [0,1] state.
      // React.StrictMode (src/main.jsx:6) double-invokes useEffect in
      // dev, firing this exact race on every component mount.
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [tableEl, updateViewFrac]);

  // Click / drag → set tableEl.scrollTop. Click position lands at the
  // viewport top (not centred) so the gesture reads as "scroll to
  // here" rather than "centre this". Matches SegmentMinimap precedent.
  const scrollToY = useCallback((clientY) => {
    const strip = containerRef.current;
    if (!tableEl || !strip) return;
    const rect = strip.getBoundingClientRect();
    if (rect.height <= 0) return;
    const frac = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const scrollableH = tableEl.scrollHeight;
    tableEl.scrollTop = frac * scrollableH;
  }, [tableEl]);

  const handleMouseDown = useCallback((e) => {
    if (!tableEl) return;
    draggingRef.current = true;
    scrollToY(e.clientY);
  }, [scrollToY, tableEl]);

  useEffect(() => {
    if (!tableEl) return undefined;
    const onMove = (e) => {
      if (draggingRef.current) scrollToY(e.clientY);
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [scrollToY, tableEl]);

  // Measure the strip's rendered pixel height so a flagged row's band can
  // carry a true on-screen minimum despite the preserveAspectRatio="none"
  // viewBox stretch — 2 px back-converts to viewBox units at render below.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const measure = () => setStripHeightPx(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (perRow.size === 0 && nVisRows === 0) return null;

  // Per-vis-row rect descriptors. ViewBox y = row index (1 row = 1
  // unit); preserveAspectRatio="none" stretches the row axis to
  // container height.
  const rects = [];
  for (const [ri, count] of perRow) {
    const rs = convergenceMinimapStyle(count);
    if (!rs) continue;
    rects.push({ ri, fill: rs.color, opacity: rs.opacity });
  }

  const stripH = Math.max(nVisRows, 1);
  // Flagged-row band floor in viewBox units: MIN_BAND_PX on screen back-
  // converted through the viewBox→pixel stretch. The natural one-row
  // height (1 unit) is the lower bound, so fixtures whose rows already
  // exceed the floor are unchanged.
  const minBandUnits = stripHeightPx > 0
    ? Math.max(1, (MIN_BAND_PX * stripH) / stripHeightPx)
    : 1;
  const bandTopUnits = viewFrac[0] * stripH;
  const bandHeightUnits = Math.max((viewFrac[1] - viewFrac[0]) * stripH, 1);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "relative",
        width: STRIP_W,
        height: "100%",
        cursor: tableEl ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      <svg
        width={STRIP_W} height="100%"
        viewBox={`0 0 ${STRIP_W} ${stripH}`}
        preserveAspectRatio="none"
        style={{
          display: "block",
          border: `1px solid ${C.BORDER_L}`,
          borderRadius: CR.SM,
          background: C.WHITE,
        }}
      >
        {rects.map(({ ri, fill, opacity }) => (
          <rect
            key={ri}
            x={0} y={ri}
            width={STRIP_W} height={minBandUnits}
            fill={fill}
            opacity={opacity}
          />
        ))}
        {/* Viewport-indicator band — translucent overlay tracking the
            table's scrollTop. Updates in real time on scroll. */}
        <rect
          x={0} y={bandTopUnits}
          width={STRIP_W} height={bandHeightUnits}
          fill={C.TEXT}
          opacity={0.12}
          stroke={C.TEXT_3}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
