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
import { hexToRgb } from "../../constants/thresholds.js";
import { MECHANISMS } from "../../constants/mechanisms.js";
import { usePulseTrigger } from "./pulseContext.jsx";
import { usePulseAnimation } from "./PulseStyle.jsx";

// S156-fix1 (refinement to S156 D6): chip chrome reshape after screenshot
// review. The S156 full-border MECH treatment lost hue separation at chip
// scale on adjacent dark-blue/dark-purple clusters (Copy/paste/edit ↔
// Cross-replicate). Restore the pre-S156 left-edge MECH stripe — at 5px
// (between original 4px stripe and the 3px cluster-header borderLeft) for
// higher visual weight at chip scale — and retire the full-border treatment.
// SEV_VERDICT still owns the background tint (HIGH/MOD); cleared-tier chips
// render the stripe at 0.4 opacity. Tier word colour update lives at the
// render call site (consumes SEV_VERDICT[severity] colour, plain weight).
const STRIPE_W = 5;
const FADE_ALPHA = 0.4;
function fadeHex(hex) {
  if (!hex) return null;
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${FADE_ALPHA})`;
}
function chipStyle(severity, mechColor) {
  if (severity === "HIGH" || severity === "MOD") {
    const sev = severity === "HIGH" ? SEV_VERDICT[3] : SEV_VERDICT[2];
    return {
      bg: sev.bg,
      stripe: mechColor || sev.color,
      color: C.TEXT,
      pulseColor: sev.color,
      sevColor: sev.color,
    };
  }
  // Cleared-tier chip: MECH stripe at reduced opacity, no SEV background.
  return {
    bg: C.WHITE,
    stripe: fadeHex(mechColor) || C.BORDER,
    color: C.TEXT_2,
    pulseColor: SEV_VERDICT[0].color,
    sevColor: SEV_VERDICT[0].color,
  };
}

// Tier word — D1 sentence-case canon. "HIGH" / "MOD" / "LOW" → "High" /
// "Moderate" / "Clear".
const TIER_WORD = { HIGH: "High", MOD: "Moderate", LOW: "Clear" };

export function FindingChip({ finding, onActivate, showRegionNumber = false }) {
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
  const sev = chipStyle(finding.severity, mechColor);
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
        display: "inline-flex", alignItems: "center", gap: "4px",
        padding: `3px 10px 3px ${STRIPE_W + 8}px`,
        background: sev.bg,
        border: "none",
        borderRadius: CR.MD,
        boxShadow: `inset ${STRIPE_W}px 0 0 ${sev.stripe}`,
        color: sev.color,
        fontSize: FS.sm,
        fontFamily: FF.UI,
        fontWeight: FW.SEMI,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
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
