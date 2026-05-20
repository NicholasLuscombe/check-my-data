/* ── FindingPill — Dataset-wide-patterns sticky-surface chip (S126b §1.5) ──
   One pill per HIGH/MOD/NOTED global finding. Renders the test display
   name on a severity-tinted background.

   Click → trigger pulse on this pill + its single test card, scroll the
   card into view. Globals have no spatial referent so no minimap-region
   pulse fires. Pulse from card-side click also lands here via the shared
   PulseProvider. */

import { C, FS, FW, FF, CR, SEV_VERDICT, MECH_COLOR } from "../../constants/tokens.js";
import { TEST_MECHANISM } from "../../constants/mechanisms.js";
import { MechIcon, mechIconSize } from "../shared/MechIcon.jsx";
import { usePulseTrigger } from "./pulseContext.jsx";
import { usePulseAnimation } from "./PulseStyle.jsx";

// S157: pill chrome mirrors FindingChip's icon-replaces-stripe pattern.
// 5px MECH stripe retires; 16px MechIcon at the leading position.
// SEV_VERDICT owns the background tint (globals don't emit LOW via
// buildFindings v1.0, so no cleared branch needed here).
const ICON_SIZE = 16;
function severityStyle(severity) {
  const sev = severity === "HIGH" ? SEV_VERDICT[3] : SEV_VERDICT[2];
  return {
    bg: sev.bg,
    color: C.TEXT,
    pulseColor: sev.color,
    sevColor: sev.color,
  };
}

// D1 sentence-case tier word.
const TIER_WORD = { HIGH: "High", MOD: "Moderate", LOW: "Clear" };

export function FindingPill({ finding, onActivate }) {
  const test = finding.tests[0];
  const dimKey = TEST_MECHANISM[test.testId];
  const mechColor = MECH_COLOR[dimKey];
  const sev = severityStyle(finding.severity);
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
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "3px 10px 3px 7px",
        background: sev.bg,
        // S163 fix-pass A item 2: mechanism-colour left stripe matches
        // the §3 test-card chrome. Same MECH_COLOR token, same 3 px
        // width — pills + chips both visually link to their §3 cards.
        border: "none",
        borderLeft: mechColor ? `3px solid ${mechColor}` : "none",
        borderRadius: CR.MD,
        color: sev.color,
        fontSize: FS.sm,
        fontFamily: FF.UI,
        fontWeight: FW.SEMI,
        cursor: "pointer",
        whiteSpace: "nowrap",
        // S163 fix-pass A items 3+4: pill shrinks within narrow lanes;
        // ellipsis-truncates at extreme widths rather than overflowing.
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <MechIcon mk={dimKey} size={mechIconSize(dimKey, ICON_SIZE)} color={mechColor} />
      <span>{test.displayName}</span>
      {tierWord && (
        <span style={{ color: sev.sevColor, fontWeight: FW.NORM }}>{" · "}{tierWord}</span>
      )}
    </span>
  );
}
