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
       convergenceMinimapStyle. activeFindingTests Set narrows to a
       single test when supplied.
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

export function MinimapStripVertical({
  convergence, rowMap, nVisRows,
  activeFindingTests = null,
  tableEl = null,
}) {
  const grid = convergence?.grid || null;
  const perRow = useMemo(
    () => buildPerVisRowMax(grid, rowMap, nVisRows, activeFindingTests),
    [grid, rowMap, nVisRows, activeFindingTests]
  );

  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const [viewFrac, setViewFrac] = useState([0, 1]);

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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
            width={STRIP_W} height={1}
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
