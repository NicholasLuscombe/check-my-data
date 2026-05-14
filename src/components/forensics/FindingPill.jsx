/* ── FindingPill — Dataset-wide-patterns sticky-surface chip (S126b §1.5) ──
   One pill per HIGH/MOD/NOTED global finding. Renders the test display
   name on a severity-tinted background.

   Click → trigger pulse on this pill + its single test card, scroll the
   card into view. Globals have no spatial referent so no minimap-region
   pulse fires. Pulse from card-side click also lands here via the shared
   PulseProvider. */

import { FS, FW, FF, CR, SEV_VERDICT, MECH_COLOR } from "../../constants/tokens.js";
import { TEST_MECHANISM } from "../../constants/mechanisms.js";
import { usePulseTrigger } from "./pulseContext.jsx";
import { usePulseAnimation } from "./PulseStyle.jsx";

// S126b add-7: pill chrome derives from SEV_VERDICT — the same token
// family the test card verdict badges use (TestCardLayout's `flColor`).
// Pre-add-7 pills routed through FLAG_STYLES → SIGNAL.[hue].text/border
// which resolved to a desaturated text colour and a yellow-tinted border
// for the AMBER severity, visually distinct from the vivid orange the
// badges paint. Unifying on SEV_VERDICT eliminates the cross-surface
// hue/saturation drift. Globals don't emit LOW findings via buildFindings
// v1.0 so no LOW branch needed here.
function severityStyle(severity) {
  const sev = severity === "HIGH" ? SEV_VERDICT[3] : SEV_VERDICT[2];
  return {
    bg: sev.bg,
    border: sev.color,
    text: sev.color,
    pulseColor: sev.color,
  };
}

export function FindingPill({ finding, onActivate }) {
  const test = finding.tests[0];
  const sev = severityStyle(finding.severity);
  const ref = usePulseAnimation(`pill:${test.testId}`, sev.pulseColor);
  const trigger = usePulseTrigger();
  // S133f: 4px left-edge stripe in MECH_COLOR keyed off the test's primary
  // mechanism — same encoding as FindingChip. Pills are always single-test
  // (HIGH/MOD globals only), so dimensions[0] from buildFindings carries the
  // test's mechanism unambiguously. TEST_MECHANISM[testId] is the equivalent
  // direct lookup; preferring it here keeps the pill self-contained against
  // the finding's dimensions[] shape (which carries fallback logic in
  // buildFindings). Stripe omitted when MECH_COLOR has no matching key.
  const dimKey = TEST_MECHANISM[test.testId];
  const mechColor = MECH_COLOR[dimKey];
  const stripeShadow = mechColor ? `inset 4px 0 0 ${mechColor}` : "none";

  const handleClick = () => {
    // Pulse self + the test card. Scroll handling lives on the parent
    // (ReportView) via onActivate. S126b add-6: pass the full finding
    // so the activation path can expand the test card body in addition
    // to the dimension wrapper. Pills are always single-test so this
    // collapses to the previous testId-only behaviour.
    trigger(`pill:${test.testId}`, `card:${test.testId}`);
    onActivate?.(finding);
  };

  return (
    <span
      ref={ref}
      onClick={handleClick}
      title={test.displayName}
      style={{
        display: "inline-flex", alignItems: "center",
        padding: mechColor ? "3px 10px 3px 14px" : "3px 10px",
        background: sev.bg,
        border: `1px solid ${sev.border}`,
        borderRadius: CR.MD,
        boxShadow: stripeShadow,
        color: sev.color,
        fontSize: FS.sm,
        fontFamily: FF.UI,
        fontWeight: FW.SEMI,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {test.displayName}
    </span>
  );
}
