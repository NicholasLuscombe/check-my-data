/* ── MinimapStripHorizontal — A1.D3 column-axis density strip (S163) ──
   Column-axis sibling of MinimapStripVertical. Renders a horizontal
   strip of per-vis-col flag-density shading driven by the convergence
   grid, plus an active-window highlight band that marks the currently
   windowed column range in the bounded ExcerptTable below.

   Authored S163 fix-pass 2 as part of the windowed-render + scrubber
   navigation reshape: the strip is the column-axis scrubber. Click +
   drag moves the windowed range in the table.

   Render contract:
     - SVG viewBox `0 0 ${nVisCols} ${STRIP_H}`
     - preserveAspectRatio="none" stretches the col axis to container
       width so 1 col = 1/nVisCols of container regardless of dataset
       col count.
     - Per-vis-col rects span the strip height (y=0, height=STRIP_H)
       and are 1 viewBox unit wide. Filled per buildPerVisColMax via
       convergenceMinimapStyle.
     - Active-window highlight band: a translucent overlay rect at
       [windowColStart, windowColStart + windowColSize) on the col
       axis. Spans the strip's full height.
     - Click + drag on the strip area writes windowColStart via the
       parent's onWindowChange callback. clientX → fraction → col
       index, clamped so the window stays inside [0, nVisCols -
       windowColSize]. */

import { useMemo, useCallback, useRef, useEffect } from "react";
import { C, CR } from "../../constants/tokens.js";
import { convergenceMinimapStyle } from "../shared/heatmapColors.js";
import { buildPerVisColMax } from "./minimapDerivation.js";

const STRIP_H = 18;

export function MinimapStripHorizontal({
  convergence, matColToVisCol, nVisCols,
  activeFindingTests = null,
  windowColStart = 0,
  windowColSize = null,
  onWindowChange = null,
}) {
  const grid = convergence?.grid || null;
  const perCol = useMemo(
    () => buildPerVisColMax(grid, matColToVisCol, nVisCols, activeFindingTests),
    [grid, matColToVisCol, nVisCols, activeFindingTests]
  );

  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  const xToWindowStart = useCallback((clientX) => {
    const el = containerRef.current;
    if (!el || !onWindowChange || windowColSize == null) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const stripW = Math.max(nVisCols, 1);
    const centre = frac * stripW;
    let start = Math.floor(centre - windowColSize / 2);
    const maxStart = Math.max(0, nVisCols - windowColSize);
    start = Math.max(0, Math.min(maxStart, start));
    onWindowChange(start);
  }, [onWindowChange, windowColSize, nVisCols]);

  const handleMouseDown = useCallback((e) => {
    if (!onWindowChange) return;
    draggingRef.current = true;
    xToWindowStart(e.clientX);
  }, [xToWindowStart, onWindowChange]);

  useEffect(() => {
    if (!onWindowChange) return undefined;
    const onMove = (e) => {
      if (draggingRef.current) xToWindowStart(e.clientX);
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [xToWindowStart, onWindowChange]);

  if (perCol.size === 0 && (windowColSize == null || nVisCols === 0)) return null;

  const rects = [];
  for (const [ci, count] of perCol) {
    const rs = convergenceMinimapStyle(count);
    if (!rs) continue;
    rects.push({ ci, fill: rs.color, opacity: rs.opacity });
  }

  const stripW = Math.max(nVisCols, 1);
  const hasWindow = windowColSize != null && windowColSize > 0;
  const winStart = hasWindow ? Math.max(0, Math.min(nVisCols - 1, windowColStart)) : 0;
  const winEnd = hasWindow ? Math.min(nVisCols, winStart + windowColSize) : 0;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "relative",
        width: "100%",
        height: STRIP_H,
        cursor: onWindowChange ? "pointer" : "default",
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
        {/* Active-window highlight band — translucent overlay marking
            the currently-rendered table column range. Updates in real
            time as the user scrubs. */}
        {hasWindow && winEnd > winStart && (
          <rect
            x={winStart} y={0}
            width={winEnd - winStart} height={STRIP_H}
            fill={C.TEXT}
            opacity={0.12}
            stroke={C.TEXT_3}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}
