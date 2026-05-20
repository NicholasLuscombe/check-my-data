/* ── MinimapStripHorizontal — A1.D3 column-axis density + viewport band (S163) ──
   Column-axis sibling of MinimapStripVertical. Renders a horizontal
   strip of per-vis-col flag-density shading driven by the convergence
   grid, plus a viewport-indicator band that tracks the scrollLeft of
   the table below. Click + drag writes scrollLeft on the table.

   Authored S163 fix-pass 2 as a scrubber (clientX → windowColStart).
   The S163 virtualisation rework swaps the scrubber model for the
   bidirectional scrollLeft ↔ viewport-band coordination mirroring
   the internal ColMinimap pattern.

   Render contract:
     - SVG viewBox `0 0 ${nVisCols} ${STRIP_H}` with
       preserveAspectRatio="none". Stretches the col axis to container
       width.
     - Per-vis-col rects filled per buildPerVisColMax. filterTests
       narrows to the active finding's tests when supplied.
     - Viewport band: translucent rect at `[viewFrac[0]*stripW,
       viewFrac[1]*stripW)` driven by tableRef.scrollLeft /
       scrollWidth + clientWidth / scrollWidth.
     - Click + drag → tableRef.scrollLeft = frac * scrollableW so the
       click position lands at the viewport's left edge. */

import { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { C, CR } from "../../constants/tokens.js";
import { convergenceMinimapStyle } from "../shared/heatmapColors.js";
import { buildPerVisColMax } from "./minimapDerivation.js";

const STRIP_H = 18;

export function MinimapStripHorizontal({
  convergence, matColToVisCol, nVisCols,
  activeFindingTests = null,
  tableEl = null,
}) {
  const grid = convergence?.grid || null;
  const perCol = useMemo(
    () => buildPerVisColMax(grid, matColToVisCol, nVisCols, activeFindingTests),
    [grid, matColToVisCol, nVisCols, activeFindingTests]
  );

  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const [viewFrac, setViewFrac] = useState([0, 1]);

  const rafRef = useRef(null);
  const updateViewFrac = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!tableEl) return;
      const scrollableW = tableEl.scrollWidth;
      const viewportW = tableEl.clientWidth;
      if (scrollableW <= 0 || viewportW <= 0 || scrollableW <= viewportW) {
        setViewFrac([0, 1]);
        return;
      }
      const scrollLeft = Math.max(0, tableEl.scrollLeft);
      const start = scrollLeft / scrollableW;
      const end = Math.min(1, (scrollLeft + viewportW) / scrollableW);
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

  const scrollToX = useCallback((clientX) => {
    const strip = containerRef.current;
    if (!tableEl || !strip) return;
    const rect = strip.getBoundingClientRect();
    if (rect.width <= 0) return;
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const scrollableW = tableEl.scrollWidth;
    tableEl.scrollLeft = frac * scrollableW;
  }, [tableEl]);

  const handleMouseDown = useCallback((e) => {
    if (!tableEl) return;
    draggingRef.current = true;
    scrollToX(e.clientX);
  }, [scrollToX, tableEl]);

  useEffect(() => {
    if (!tableEl) return undefined;
    const onMove = (e) => {
      if (draggingRef.current) scrollToX(e.clientX);
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [scrollToX, tableEl]);

  if (perCol.size === 0 && nVisCols === 0) return null;

  const rects = [];
  for (const [ci, count] of perCol) {
    const rs = convergenceMinimapStyle(count);
    if (!rs) continue;
    rects.push({ ci, fill: rs.color, opacity: rs.opacity });
  }

  const stripW = Math.max(nVisCols, 1);
  const bandLeftUnits = viewFrac[0] * stripW;
  const bandWidthUnits = Math.max((viewFrac[1] - viewFrac[0]) * stripW, 1);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "relative",
        width: "100%",
        height: STRIP_H,
        cursor: tableEl ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      <svg
        width="100%" height={STRIP_H}
        viewBox={`0 0 ${stripW} ${STRIP_H}`}
        preserveAspectRatio="none"
        style={{
          display: "block",
          border: `1px solid ${C.BORDER_L}`,
          borderRadius: CR.SM,
          background: C.WHITE,
        }}
      >
        {rects.map(({ ci, fill, opacity }) => (
          <rect
            key={ci}
            x={ci} y={0}
            width={1} height={STRIP_H}
            fill={fill}
            opacity={opacity}
          />
        ))}
        {/* Viewport-indicator band — translucent overlay tracking the
            table's scrollLeft. Updates in real time on scroll. */}
        <rect
          x={bandLeftUnits} y={0}
          width={bandWidthUnits} height={STRIP_H}
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
