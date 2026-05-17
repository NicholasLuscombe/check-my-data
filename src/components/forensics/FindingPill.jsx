/* ── FindingPill — Dataset-wide-patterns sticky-surface chip (S126b §1.5) ──
   One pill per HIGH/MOD/NOTED global finding. Renders the test display
   name on a severity-tinted background.

   Click → trigger pulse on this pill + its single test card, scroll the
   card into view. Globals have no spatial referent so no minimap-region
   pulse fires. Pulse from card-side click also lands here via the shared
   PulseProvider. */

import { C, FS, FW, FF, CR, SEV_VERDICT, MECH_COLOR } from "../../constants/tokens.js";
import { TEST_MECHANISM } from "../../constants/mechanisms.js";
import { usePulseTrigger } from "./pulseContext.jsx";
import { usePulseAnimation } from "./PulseStyle.jsx";

// S156 (A1.D0c-bis D6 lock): parallel encoding — MECH_COLOR moves from the
// 4px left-edge stripe to the full pill border; SEV_VERDICT moves from
// border+text to background tint only. Pill text stays plain (C.TEXT) per
// the colour-on-chrome / words-stay-plain rule. Globals don't emit LOW
// findings via buildFindings v1.0 so no LOW branch needed here.
function severityStyle(severity, mechColor) {
  const sev = severity === "HIGH" ? SEV_VERDICT[3] : SEV_VERDICT[2];
  return {
    bg: sev.bg,
    border: mechColor || sev.color,
    color: C.TEXT,
    pulseColor: sev.color,
  };
}

// D1 sentence-case tier word.
const TIER_WORD = { HIGH: "High", MOD: "Moderate", LOW: "Clear" };

export function FindingPill({ finding, onActivate }) {
  const test = finding.tests[0];
  const dimKey = TEST_MECHANISM[test.testId];
  const mechColor = MECH_COLOR[dimKey];
  const sev = severityStyle(finding.severity, mechColor);
  const tierWord = TIER_WORD[finding.severity];
  const ref = usePulseAnimation(`pill:${test.testId}`, sev.pulseColor);
  const trigger = usePulseTrigger();

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
        padding: "3px 10px",
        background: sev.bg,
        border: `1px solid ${sev.border}`,
        borderRadius: CR.MD,
        color: sev.color,
        fontSize: FS.sm,
        fontFamily: FF.UI,
        fontWeight: FW.SEMI,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {test.displayName}{tierWord && <>{" · "}{tierWord}</>}
    </span>
  );
}
