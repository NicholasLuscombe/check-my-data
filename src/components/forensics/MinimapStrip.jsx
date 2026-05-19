/* ── MinimapStrip — Forensics §2 inline spatial-nav surface (S126c-a) ──
   Standalone horizontal row strip for the sticky surface beneath the
   chip lane. Renders shading per visible row (driven by convergence
   grid count), region [N] badges anchored at each numbered finding's
   first-row position, and the shared convergence ramp legend.

   Decoupling rationale (S126c-a recovery from S126b add-3 scoping):
   HotspotExcerpt bundled two surfaces with very different applicability —
   a lightweight minimap (works whether the flagged rows form a tight
   cluster or are spatially diffuse) and a deeper-look table excerpt
   (only meaningful at a clustered zoom location). Add-3 retired both
   together; users lost spatial information inline. S126c-a splits
   them: MinimapStrip always renders inline when localised findings
   exist, ExcerptTable defers to the S126c-b click-to-zoom modal.

   Render contract:
     - findings + convergence grid + rowMap → per-vis-row max count
     - findings filtered to localised + regionNumber + region.cells.length>0
       → region overlays with visRowStart/visRowEnd in vis-row coords.
       (The S126b add-8 fallback chip — empty raw[], rowRange spanning
       all rows — is filtered here so the badge doesn't claim a minimap
       position. The chip still surfaces in §2; only the minimap overlay
       is suppressed.)
     - returns null when there's nothing to draw (no shaded rows AND
       no overlays).

   Click model (spec §1.7 — ties into S126b shared pulse bus):
     - chip click  fires `region:<N>` pulse → MinimapStrip badge replays
                   the keyframe via usePulseAnimation (HTML element).
     - badge click fires `chip:<N>` + `region:<N>` pulses + invokes
                   `onActivateRegion(overlay)`. v1.0 inline: the
                   onActivateRegion handler is a stub (no modal yet);
                   S126c-b mounts the click-to-zoom modal there.

   The strip uses a horizontal layout (preserveAspectRatio="none" on the
   SVG so 1 row = 1 viewBox unit and the rect strip stretches to
   container width) — different from HotspotExcerpt's vertical
   SegmentMinimap, which was paired with a vertical table. Standalone
   below the chip lane, horizontal is more compact and reads as a
   timeline of the dataset's row axis. */

import { useMemo, useState, useEffect, useCallback } from "react";
import { C, FS, FW, FF, CR, SEV_VERDICT } from "../../constants/tokens.js";
import { MINIMAP_CALLOUT_TYPOGRAPHY } from "../shared/Section.jsx";
import { convergenceMinimapStyle, convergenceRampStyle, CONVERGENCE_RAMP } from "../shared/heatmapColors.js";
import { usePulseTrigger } from "./pulseContext.jsx";
import { usePulseAnimation } from "./PulseStyle.jsx";
import { buildPerVisRowMax, deriveOverlays } from "./minimapDerivation.js";

const STRIP_H = 32;
const BADGE_H = 18;
const BADGE_GAP = 4;
const TOTAL_H = STRIP_H + BADGE_H + BADGE_GAP;

const sevColor = (severity) =>
  severity === "HIGH" ? SEV_VERDICT[3].color
  : severity === "MOD" ? SEV_VERDICT[2].color
  : SEV_VERDICT[0].color;

// Region-number badge — HTML span absolutely positioned over the strip
// container. Pulse is driven by the shared bus (`region:<N>`) via
// usePulseAnimation; chip click fires the same target so chip ↔ badge
// pulses stay in lock-step.
function RegionBadge({ overlay, leftPct, onActivate }) {
  const color = sevColor(overlay.severity);
  const ref = usePulseAnimation(`region:${overlay.regionNumber}`, color);
  const trigger = usePulseTrigger();
  const handleClick = (e) => {
    e.stopPropagation();
    // Symmetric pulse: badge → chip + region. onActivateRegion is the
    // S126c-b modal-open hook; null-safe stub today.
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
        // off the left edge. Shift by half BADGE_H to centre the pill.
        left: `calc(${leftPct}% - ${BADGE_H / 2}px)`,
        top: 0,
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

export function MinimapStrip({
  convergence, findings, rowMap, nVisRows,
  onActivateRegion = null,
  caption = true,
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

  // Pulse trigger for strip-area clicks (badge clicks fire their own
  // pulse via RegionBadge.handleClick; strip-area clicks fire the same
  // chip:N + region:N trigger pair so visual feedback matches whether
  // the user lands on a badge or anywhere else on the strip).
  const trigger = usePulseTrigger();

  // S126c-b: whole-strip click target. Spec §1.3 says "click anywhere
  // on inline MinimapStrip → modal opens, pre-zoomed to region nearest
  // click". Compute click x in viewBox-row units (strip width spans
  // viewBox 0..stripW), find the overlay whose visRowStart minimises
  // |distance to clickedRow|, fire chip+region pulse, and invoke
  // onActivateRegion(overlay). RegionBadge clicks call stopPropagation
  // so direct badge clicks bypass this strip handler — no double-fire.
  // No-op when there are no overlays to navigate to (defensive: would
  // open the modal to nothing). Also no-op when onActivateRegion is
  // null — caller controls whether the strip is interactive.
  const handleStripClick = useCallback((e) => {
    if (!onActivateRegion || overlays.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickFrac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const stripW = Math.max(nVisRows, 1);
    const clickedVisRow = clickFrac * stripW;
    let nearest = overlays[0];
    let bestDist = Math.abs(nearest.visRowStart - clickedVisRow);
    for (let i = 1; i < overlays.length; i++) {
      const d = Math.abs(overlays[i].visRowStart - clickedVisRow);
      if (d < bestDist) { bestDist = d; nearest = overlays[i]; }
    }
    trigger(`chip:${nearest.regionNumber}`, `region:${nearest.regionNumber}`);
    onActivateRegion(nearest);
  }, [overlays, onActivateRegion, nVisRows, trigger]);

  // Render only when there's actual content. Caller is welcome to
  // mount the component unconditionally — this guard keeps the chrome
  // out of the layout for findings without spatial content (clean
  // fixtures, global-only flagged fixtures).
  if (perRow.size === 0 && overlays.length === 0) return null;

  // Build per-visible-row rect descriptors. ViewBox x = row index
  // (1 row = 1 unit); preserveAspectRatio="none" stretches to
  // container width. For datasets with nVisRows large (e.g. DS11 at
  // 540 rows over a ~1000px-wide strip ≈ 1.85px/row), individual row
  // rects are thin but visible.
  const rects = [];
  for (const [ri, count] of perRow) {
    const rs = convergenceMinimapStyle(count);
    if (!rs) continue;
    rects.push({ ri, fill: rs.color, opacity: rs.opacity });
  }

  const stripW = Math.max(nVisRows, 1);

  return (
    <div style={{ width: "100%", marginTop: 10 }}>
      {caption && (
        <div style={{ marginBottom: 6, lineHeight: 1.5 }}>
          <span style={{ ...MINIMAP_CALLOUT_TYPOGRAPHY, fontWeight: FW.SEMI }}>Where flags are concentrated.</span>{" "}
          <span style={MINIMAP_CALLOUT_TYPOGRAPHY}>Each segment is a row of your data, shaded by how many tests flag any cell in that row.</span>
        </div>
      )}
      <div
        onClick={onActivateRegion && overlays.length > 0 ? handleStripClick : undefined}
        style={{
          position: "relative", height: TOTAL_H, width: "100%",
          cursor: onActivateRegion && overlays.length > 0 ? "pointer" : "default",
        }}
      >
        {/* Region [N] badges — HTML spans positioned by left%. */}
        {overlays.map(ov => {
          const leftPct = (ov.visRowStart / stripW) * 100;
          return (
            <RegionBadge
              key={ov.regionNumber}
              overlay={ov}
              leftPct={leftPct}
              onActivate={onActivateRegion}
            />
          );
        })}
        {/* Shaded row strip — proportional via viewBox. */}
        <svg
          width="100%" height={STRIP_H}
          viewBox={`0 0 ${stripW} ${STRIP_H}`}
          preserveAspectRatio="none"
          style={{
            display: "block",
            position: "absolute",
            left: 0, right: 0,
            bottom: 0,
            border: `1px solid ${C.BORDER_L}`,
            borderRadius: CR.SM,
            background: C.WHITE,
          }}
        >
          {rects.map(({ ri, fill, opacity }) => (
            <rect
              key={ri}
              x={ri} y={0}
              width={1} height={STRIP_H}
              fill={fill}
              opacity={opacity}
            />
          ))}
          {/* Region anchor markers — vertical lines at each overlay's
              first-row position, rendered with non-scaling stroke so
              they stay 2px wide regardless of strip width. Tie the
              [N] badge above to the row position below. */}
          {overlays.map(ov => (
            <line
              key={`tick-${ov.regionNumber}`}
              x1={ov.visRowStart} y1={0}
              x2={ov.visRowStart} y2={STRIP_H}
              stroke={sevColor(ov.severity)}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              opacity={0.6}
            />
          ))}
        </svg>
      </div>
      {/* Convergence ramp legend — same swatches as HotspotExcerpt. */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginTop: 8,
        fontSize: FS.sm, color: C.TEXT_2, flexWrap: "wrap",
      }}>
        <span>Tests flagging each cell:</span>
        {CONVERGENCE_RAMP.slice(1).map((color, i) => {
          const count = i + 1;
          const rs = convergenceRampStyle(count);
          const isLast = count === CONVERGENCE_RAMP.length - 1;
          const label = isLast ? `${count}+` : String(count);
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{
                display: "inline-block", width: 12, height: 12, borderRadius: 2,
                background: color, opacity: rs?.opacity ?? 1,
                border: `1px solid ${C.BORDER_L}`,
              }} />
              <span>{label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
