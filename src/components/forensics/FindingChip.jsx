/* ── FindingChip — Localised-patterns sticky-surface chip (S126b §1.6) ──
   One chip per localised finding. Composition (post add-6, inline):
     Single-test finding:
       <test-display-name>
       — chip carries the test name directly.
     Multi-test finding:
       <dominant-dimension-label> +M
       — chip carries the dimension label + +M counter for other
       dimensions touched at the region.

   The [N] region-number prefix is hidden inline (`showRegionNumber`
   prop defaults to false in S126b add-6) because the region badge it
   referenced — the [N] overlay on the minimap row strip — exited
   inline render in S126b add-3 and returns in S126c modal. Inline,
   the [N] is meaningless noise. Modal callers pass `showRegionNumber`
   true to re-show.

   - [N] = finding.regionNumber (assigned by buildFindings).
   - dominant-dimension-label = MECHANISMS[finding.dimensions[0]].label.
   - +M = count of OTHER dimensions touched at the region; segment hidden
     when M === 0.

   Severity tinting: HIGH → red FLAG_STYLES, MOD/NOTED → amber, LOW-only
   → neutral chrome (C.BORDER over C.BG_L) so LOW chips don't compete.

   Click → trigger pulse on this chip + every relevant test card +
   matching minimap region overlay. Scroll handling lives in ReportView
   via onActivate(firstTestId). */

import { C, FS, FW, FF, CR, SEV_VERDICT, MECH_COLOR } from "../../constants/tokens.js";
import { MECHANISMS } from "../../constants/mechanisms.js";
import { MechIcon, mechIconSize } from "../shared/MechIcon.jsx";
import { IDENTITY_BORDER } from "../shared/heatmapColors.js";
import { usePulseTrigger } from "./pulseContext.jsx";
import { usePulseAnimation } from "./PulseStyle.jsx";

// S157: mechanism iconography. The S156-fix1 left-edge MECH stripe
// retires entirely; a 16px MechIcon at the chip-leading position
// carries the mechanism handle. The icon does compact-scale
// identification (resolving the slate-blue ↔ violet adjacency that
// the stripe alone couldn't separate); the icon's MECH_COLOR hue
// keeps the broader family suggestion. SEV_VERDICT still owns the
// chip background tint (HIGH/MOD); cleared-tier chips render the
// icon at 0.4 opacity (matching the previous stripe-opacity rule).
// Tier word colour update lives at the render call site.
const ICON_SIZE = 16;
const CLEARED_OPACITY = 0.4;
function chipStyle(severity) {
  if (severity === "HIGH" || severity === "MOD") {
    const sev = severity === "HIGH" ? SEV_VERDICT[3] : SEV_VERDICT[2];
    return {
      bg: sev.bg,
      color: C.TEXT,
      pulseColor: sev.color,
      sevColor: sev.color,
    };
  }
  // Cleared-tier chip: no SEV background; icon rendered at reduced opacity.
  return {
    bg: C.WHITE,
    color: C.TEXT_2,
    pulseColor: SEV_VERDICT[0].color,
    sevColor: SEV_VERDICT[0].color,
  };
}

// Tier word — D1 sentence-case canon. "HIGH" / "MOD" / "LOW" → "High" /
// "Moderate" / "Clear".
const TIER_WORD = { HIGH: "High", MOD: "Moderate", LOW: "Clear" };

export function FindingChip({ finding, onActivate, showRegionNumber = false, isActive = false }) {
  const tests = finding.tests || [];
  const isSingleTest = tests.length === 1;
  // Single-test chips use the test display name in place of the
  // dimension label. Multi-test chips keep the dominant-dimension label
  // + +M counter. Defensive: a single-test finding with multi-dimension
  // metadata shouldn't be possible under MECHANISM_ORDER (1 test → 1
  // dimension), but log if encountered so the assumption stays explicit.
  if (isSingleTest && (finding.dimensions?.length || 0) > 1 && typeof console !== "undefined") {
    console.warn("FindingChip: single-test finding with >1 dimension", finding);
  }
  const dimKey = finding.dimensions[0];
  const dimLabel = MECHANISMS[dimKey]?.label || dimKey;
  const chipLabel = isSingleTest ? (tests[0]?.displayName || dimLabel) : dimLabel;
  const otherDims = isSingleTest ? 0 : Math.max(0, (finding.dimensions?.length || 0) - 1);
  const N = finding.regionNumber;
  const mechColor = MECH_COLOR[dimKey];
  const sev = chipStyle(finding.severity);
  const isCleared = finding.severity === "LOW";
  // D3: single-test chip carries tier word; multi-test chip omits (M tests
  // may span tiers, no single word applies).
  const tierWord = isSingleTest ? TIER_WORD[finding.severity] : null;

  const ref = usePulseAnimation(`chip:${N}`, sev.pulseColor);
  const trigger = usePulseTrigger();

  const handleClick = () => {
    // Pulse self + region overlay + every related test card. S126b
    // add-6: pass the full finding to onActivate so multi-test chips
    // expand every relevant test card body, not just the first.
    const cardKeys = (finding.tests || []).map(t => `card:${t.testId}`);
    trigger(`chip:${N}`, `region:${N}`, ...cardKeys);
    onActivate?.(finding);
  };

  const tooltip = (finding.tests || []).map(t => t.displayName).join(", ");

  return (
    <span
      ref={ref}
      onClick={handleClick}
      title={tooltip}
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "3px 10px 3px 7px",
        background: sev.bg,
        // S163 fix-pass A item 2: restore the left-hand mechanism-colour
        // stripe (3 px) so the chip visually echoes the §3 test-card
        // mechanism stripe (TestCardLayout's `borderLeft: 3px solid
        // MECH_COLOR[mk]`). Same source token, same width — links a chip
        // to its matching test card by colour. Other edges stay none.
        border: "none",
        borderLeft: mechColor ? `3px solid ${mechColor}` : "none",
        borderRadius: CR.MD,
        color: sev.color,
        fontSize: FS.sm,
        fontFamily: FF.UI,
        fontWeight: FW.SEMI,
        cursor: "pointer",
        whiteSpace: "nowrap",
        // S163 fix-pass A items 3+4: chip can shrink within a narrow
        // flex container; overflow: hidden + textOverflow: ellipsis
        // gracefully truncate the chip's tail at extreme-narrow widths
        // rather than overflowing the lane row. At normal widths the
        // chip sizes to its content (nowrap, no shrink needed) — these
        // properties only fire below the layout breakpoint.
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        // S163 B2b W4: active chip rings in the deeper-purple
        // IDENTITY_BORDER (same purple that paints the cell borders
        // in the data block). Visually wires the chip to its
        // highlight — purple ring above → purple region in the table
        // — instead of the previous severity-colour ring that
        // double-encoded severity (already carried by chip bg + tier
        // word). The 3px mechanism-colour left stripe (fix-pass A,
        // borderLeft above) is preserved as-is — it remains the
        // chip↔§3-card mechanism connector. Outline (not border)
        // avoids layout shift. Co-existence with the mechanism
        // stripe is a noted visual-review item.
        outline: isActive ? `2px solid ${IDENTITY_BORDER}` : "none",
        outlineOffset: isActive ? "1px" : 0,
      }}
    >
      <MechIcon mk={dimKey} size={mechIconSize(dimKey, ICON_SIZE)} color={mechColor} opacity={isCleared ? CLEARED_OPACITY : 1} />
      {showRegionNumber && N != null && (
        <span style={{ fontWeight: FW.BOLD }}>[{N}]</span>
      )}
      <span>{chipLabel}</span>
      {tierWord && (
        <span style={{ color: sev.sevColor, fontWeight: FW.NORM }}>{" · "}{tierWord}</span>
      )}
      {otherDims > 0 && (
        <span style={{ color: C.TEXT_3, fontWeight: FW.NORM }}>+{otherDims}</span>
      )}
    </span>
  );
}
