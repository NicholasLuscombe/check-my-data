/* ── MinimapStripVertical — A1.D3 row-axis density strip (S163) ──
   Renders a vertical strip of per-vis-row flag-density shading driven
   by the convergence grid, plus an active-window highlight band that
   marks the currently-windowed row range in the bounded ExcerptTable
   below.

   S163 Phase 3a authored the component. Fix-pass 1 dropped the [N]
   numeric label on region badges (became coloured squares). Fix-pass 2
   retires the region anchor badges entirely (and the tick lines they
   anchored to) — the chip ring in the lane row carries the active-
   region cue, and the strip itself becomes the scrubber. Click +
   drag on the strip moves the windowed range in the table.

   Render contract:
     - SVG viewBox `0 0 ${STRIP_W} ${nVisRows}`
     - preserveAspectRatio="none" stretches the row axis to container
       height so 1 row = 1/nVisRows of container regardless of dataset
       row count.
     - Per-vis-row rects span the strip width (x=0, width=STRIP_W) and
       are 1 viewBox unit tall. Filled per buildPerVisRowMax via
       convergenceMinimapStyle.
     - Active-window highlight band: a translucent overlay rect at
       [windowRowStart, windowRowStart + windowRowSize) on the row
       axis. Spans the strip's full width.
     - Click + drag on the strip area writes windowRowStart via the
       parent's onWindowChange callback. clientY → fraction → row
       index, clamped so the window stays inside [0, nVisRows -
       windowRowSize].

   Shared row-axis helpers live in minimapDerivation.js (buildPerVisRowMax,
   deriveOverlays). deriveOverlays is retained for future surfaces but
   no longer consumed here — overlays render decisively retired from
   this component. */

import { useMemo, useCallback, useRef, useEffect } from "react";
import { C, CR } from "../../constants/tokens.js";
import { convergenceMinimapStyle } from "../shared/heatmapColors.js";
import { buildPerVisRowMax } from "./minimapDerivation.js";

const STRIP_W = 32;

export function MinimapStripVertical({
  convergence, rowMap, nVisRows,
  activeFindingTests = null,
  windowRowStart = 0,
  windowRowSize = null,
  onWindowChange = null,
}) {
  const grid = convergence?.grid || null;
  const perRow = useMemo(
    () => buildPerVisRowMax(grid, rowMap, nVisRows, activeFindingTests),
    [grid, rowMap, nVisRows, activeFindingTests]
  );

  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  // Convert a clientY to a windowRowStart value. Centres the window on
  // the click position and clamps to stay within [0, nVisRows - windowRowSize].
  const yToWindowStart = useCallback((clientY) => {
    const el = containerRef.current;
    if (!el || !onWindowChange || windowRowSize == null) return;
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return;
    const frac = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const stripH = Math.max(nVisRows, 1);
    const centre = frac * stripH;
    let start = Math.floor(centre - windowRowSize / 2);
    const maxStart = Math.max(0, nVisRows - windowRowSize);
    start = Math.max(0, Math.min(maxStart, start));
    onWindowChange(start);
  }, [onWindowChange, windowRowSize, nVisRows]);

  const handleMouseDown = useCallback((e) => {
    if (!onWindowChange) return;
    draggingRef.current = true;
    yToWindowStart(e.clientY);
  }, [yToWindowStart, onWindowChange]);

  useEffect(() => {
    if (!onWindowChange) return undefined;
    const onMove = (e) => {
      if (draggingRef.current) yToWindowStart(e.clientY);
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [yToWindowStart, onWindowChange]);

  if (perRow.size === 0 && (windowRowSize == null || nVisRows === 0)) return null;

  // Per-vis-row rect descriptors. ViewBox y = row index (1 row = 1
  // unit); preserveAspectRatio="none" stretches the row axis to
  // container height. For 540-row datasets in a 320 px-tall panel
  // the rows compress to ~0.6 px each — still visible as a vertical
  // density profile.
  const rects = [];
  for (const [ri, count] of perRow) {
    const rs = convergenceMinimapStyle(count);
    if (!rs) continue;
    rects.push({ ri, fill: rs.color, opacity: rs.opacity });
  }

  const stripH = Math.max(nVisRows, 1);
  const hasWindow = windowRowSize != null && windowRowSize > 0;
  const winStart = hasWindow ? Math.max(0, Math.min(nVisRows - 1, windowRowStart)) : 0;
  const winEnd = hasWindow ? Math.min(nVisRows, winStart + windowRowSize) : 0;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: "relative",
        width: STRIP_W,
        height: "100%",
        cursor: onWindowChange ? "pointer" : "default",
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
        {/* Active-window highlight band — translucent overlay marking
            the currently-rendered table window. Updates in real time
            as the user scrubs. */}
        {hasWindow && winEnd > winStart && (
          <rect
            x={0} y={winStart}
            width={STRIP_W} height={winEnd - winStart}
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
