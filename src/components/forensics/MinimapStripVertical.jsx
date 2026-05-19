/* ── MinimapStripVertical — A1.D3 panel-internal row minimap (S163 Phase 3a) ──
   Sibling to MinimapStrip.jsx, axis-rotated. Renders a vertical strip
   of per-vis-row shading driven by convergence-grid flag counts, with
   region [N] badges anchored at each numbered finding's first-row
   position along the vertical axis.

   Render contract:
     - SVG viewBox `0 0 ${STRIP_W} ${nVisRows}` — row axis on Y, strip
       width on X. Mirror of MinimapStrip's axis assignment.
     - preserveAspectRatio="none" stretches the row axis to container
       height so 1 row = 1/nVisRows of container height regardless of
       the dataset's row count.
     - Per-vis-row rects span the strip width (x=0, width=STRIP_W) and
       are 1 viewBox unit tall.
     - Region [N] badges live in an HTML span layer to the right of the
       SVG, vertically anchored by `top: ${visRowStart/nVisRows*100}%`.
     - Click target maps clientY → vis-row fraction, finds the nearest
       overlay, fires the same `chip:N + region:N` pulse pair as the
       horizontal sibling, and invokes onActivateRegion(overlay).

   Caption + convergence ramp legend that live below the horizontal
   MinimapStrip are NOT rendered here. The A1.D3 panel may surface them
   at panel scope (Chat call during Phase 3c visual review) — keeping
   them out of this component means the panel owns the decision.

   No consumer mount in Phase 3a. The component must build clean; the
   panel-side mount lands at Phase 3c.

   Data-derivation helpers (buildPerVisRowMax, deriveOverlays) are
   shared with the horizontal sibling via minimapDerivation.js. */

import { useMemo, useCallback } from "react";
import { C, FW, FF, CR, SEV_VERDICT } from "../../constants/tokens.js";
import { convergenceMinimapStyle } from "../shared/heatmapColors.js";
import { usePulseTrigger } from "./pulseContext.jsx";
import { usePulseAnimation } from "./PulseStyle.jsx";
import { buildPerVisRowMax, deriveOverlays } from "./minimapDerivation.js";

const STRIP_W = 32;
const BADGE_H = 18;
const BADGE_GAP = 4;
// Total component width = strip + gap + badge column. Height is
// determined by the container; the SVG stretches to fill.
const TOTAL_W = STRIP_W + BADGE_GAP + BADGE_H;

const sevColor = (severity) =>
  severity === "HIGH" ? SEV_VERDICT[3].color
  : severity === "MOD" ? SEV_VERDICT[2].color
  : SEV_VERDICT[0].color;

// Region badge — HTML span absolutely positioned to the right of the
// strip, vertically anchored to its row position. Mirror of
// MinimapStrip's RegionBadge with the axis-swapped layout.
function RegionBadge({ overlay, topPct, onActivate }) {
  const color = sevColor(overlay.severity);
  const ref = usePulseAnimation(`region:${overlay.regionNumber}`, color);
  const trigger = usePulseTrigger();
  const handleClick = (e) => {
    e.stopPropagation();
    // Symmetric pulse: badge → chip + region. Same bus targets as the
    // horizontal sibling so chip/badge clicks pulse together regardless
    // of which minimap surface is mounted.
    trigger(`region:${overlay.regionNumber}`, `chip:${overlay.regionNumber}`);
    onActivate?.(overlay);
  };
  const tooltip = overlay.tests.map(t => t.displayName).join(", ");
  return (
    <span
      ref={ref}
      onClick={handleClick}
      title={tooltip}
      style={{
        position: "absolute",
        // Anchor at the badge centre so a region at row 0 doesn't clip
        // off the top edge. Shift by half BADGE_H to centre the pill on
        // its row position.
        top: `calc(${topPct}% - ${BADGE_H / 2}px)`,
        left: STRIP_W + BADGE_GAP,
        height: BADGE_H,
        minWidth: BADGE_H,
        padding: "0 6px",
        background: color,
        borderRadius: CR.SM,
        color: C.WHITE,
        // Chart annotation glyph — TYPOGRAPHY-SYSTEM.md §"What this system
        // does NOT cover" carve-out (chart annotations are a separate sizing
        // system). Hardcoded pending that system's land; do NOT promote to
        // text-register tokens.
        fontSize: "10px",
        fontFamily: FF.UI,
        fontWeight: FW.BOLD,
        lineHeight: `${BADGE_H}px`,
        textAlign: "center",
        cursor: "pointer",
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        userSelect: "none",
        zIndex: 1,
      }}
    >
      {overlay.regionNumber}
    </span>
  );
}

export function MinimapStripVertical({
  convergence, findings, rowMap, nVisRows,
  onActivateRegion = null,
}) {
  const grid = convergence?.grid || null;
  const perRow = useMemo(
    () => buildPerVisRowMax(grid, rowMap, nVisRows),
    [grid, rowMap, nVisRows]
  );
  const overlays = useMemo(
    () => deriveOverlays(findings, rowMap),
    [findings, rowMap]
  );

  const trigger = usePulseTrigger();

  // Whole-strip click target. Same nearest-overlay-by-row-distance model
  // as MinimapStrip, axis-flipped: read clientY (not clientX), divide by
  // rect.height (not rect.width). RegionBadge clicks call
  // stopPropagation so direct badge clicks bypass this handler.
  const handleStripClick = useCallback((e) => {
    if (!onActivateRegion || overlays.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.height <= 0) return;
    const clickFrac = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const stripH = Math.max(nVisRows, 1);
    const clickedVisRow = clickFrac * stripH;
    let nearest = overlays[0];
    let bestDist = Math.abs(nearest.visRowStart - clickedVisRow);
    for (let i = 1; i < overlays.length; i++) {
      const d = Math.abs(overlays[i].visRowStart - clickedVisRow);
      if (d < bestDist) { bestDist = d; nearest = overlays[i]; }
    }
    trigger(`chip:${nearest.regionNumber}`, `region:${nearest.regionNumber}`);
    onActivateRegion(nearest);
  }, [overlays, onActivateRegion, nVisRows, trigger]);

  if (perRow.size === 0 && overlays.length === 0) return null;

  // Per-vis-row rect descriptors. ViewBox y = row index (1 row = 1
  // unit); preserveAspectRatio="none" stretches the row axis to
  // container height. For 540-row datasets in a 400px-tall panel the
  // rows compress to ~0.74px each — visible but tight; the
  // convergence-grid shading still reads as a vertical density profile.
  const rects = [];
  for (const [ri, count] of perRow) {
    const rs = convergenceMinimapStyle(count);
    if (!rs) continue;
    rects.push({ ri, fill: rs.color, opacity: rs.opacity });
  }

  const stripH = Math.max(nVisRows, 1);

  return (
    <div
      onClick={onActivateRegion && overlays.length > 0 ? handleStripClick : undefined}
      style={{
        position: "relative",
        width: TOTAL_W,
        height: "100%",
        cursor: onActivateRegion && overlays.length > 0 ? "pointer" : "default",
      }}
    >
      <svg
        width={STRIP_W} height="100%"
        viewBox={`0 0 ${STRIP_W} ${stripH}`}
        preserveAspectRatio="none"
        style={{
          display: "block",
          position: "absolute",
          left: 0, top: 0, bottom: 0,
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
        {/* Region anchor markers — horizontal lines at each overlay's
            first-row position, non-scaling-stroke so the line stays 2px
            tall regardless of strip height. Ties the [N] badge to the
            right to the matching row position on the strip. */}
        {overlays.map(ov => (
          <line
            key={`tick-${ov.regionNumber}`}
            x1={0} y1={ov.visRowStart}
            x2={STRIP_W} y2={ov.visRowStart}
            stroke={sevColor(ov.severity)}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            opacity={0.6}
          />
        ))}
      </svg>
      {overlays.map(ov => {
        const topPct = (ov.visRowStart / stripH) * 100;
        return (
          <RegionBadge
            key={ov.regionNumber}
            overlay={ov}
            topPct={topPct}
            onActivate={onActivateRegion}
          />
        );
      })}
    </div>
  );
}
