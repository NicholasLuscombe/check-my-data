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

import { C, TF, FW, FF, CR, SEV_VERDICT, MECH_COLOR } from "../../constants/tokens.js";
import { MECHANISMS } from "../../constants/mechanisms.js";
import { usePulseTrigger } from "./pulseContext.jsx";
import { usePulseAnimation } from "./PulseStyle.jsx";

// S126b add-7: chip chrome derives from SEV_VERDICT — same token family
// as test card verdict badges (TestCardLayout's `flColor`). Pre-add-7 the
// chip routed through FLAG_STYLES → SIGNAL.[hue] which produced visibly
// different hex per severity from the badges. LOW-only neutral chrome
// (spec §1.6) preserved — LOW chips intentionally don't compete with
// HIGH/MOD via colour saturation.
function chipStyle(severity) {
  if (severity === "HIGH" || severity === "MOD") {
    const sev = severity === "HIGH" ? SEV_VERDICT[3] : SEV_VERDICT[2];
    return {
      bg: sev.bg,
      border: sev.color,
      text: sev.color,
      pulseColor: sev.color,
    };
  }
  // LOW-only neutral chrome (spec §1.6) — not green-tinted.
  return {
    bg: C.BG_L,
    border: C.BORDER,
    text: C.TEXT_2,
    pulseColor: SEV_VERDICT[0].color,
  };
}

export function FindingChip({ finding, onActivate, showRegionNumber = false }) {
  const sev = chipStyle(finding.severity);
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
  // S133f: 4px left-edge stripe in MECH_COLOR[dimKey] adds a second axis to the
  // severity-coloured chrome — severity remains in bg + border + text, mechanism
  // moves to the stripe. dimKey resolves through buildFindings (line 166: dim =
  // TEST_MECHANISM[r.name]) so single-test chips read the test's mechanism and
  // the rare multi-test chip reads the dominant dimension. If MECH_COLOR has no
  // entry for the resolved key (defensive — every test in MECHANISM_ORDER is
  // keyed today), the stripe is omitted and the chip falls through to its
  // pre-S133f severity-only chrome.
  const mechColor = MECH_COLOR[dimKey];
  const stripeShadow = mechColor ? `inset 4px 0 0 ${mechColor}` : "none";

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
        padding: mechColor ? "3px 10px 3px 14px" : "3px 10px",
        background: sev.bg,
        border: `1px solid ${sev.border}`,
        borderRadius: CR.MD,
        boxShadow: stripeShadow,
        color: sev.color,
        fontSize: TF.DETAIL,
        fontFamily: FF.UI,
        fontWeight: FW.SEMI,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {showRegionNumber && N != null && (
        <span style={{ fontWeight: FW.BOLD, color: sev.color }}>[{N}]</span>
      )}
      <span>{chipLabel}</span>
      {otherDims > 0 && (
        <span style={{ color: C.TEXT_3, fontWeight: FW.NORM }}>+{otherDims}</span>
      )}
    </span>
  );
}
