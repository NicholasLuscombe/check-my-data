/* ── TestCardLayout — white card wrapper for individual tests ──
   Renders inside a CategoryRow's expanded content.
   Three visual tiers: grey category → white test card → evidence content.
   Mode-aware: QC shows name+status only, Review adds subtitle,
   Forensics adds p-value and method line. */

import { C, FS, FW, FF, SEV_VERDICT, MECH_COLOR } from "../../constants/tokens.js";
import { DISPLAY_NAMES, TEST_DESCRIPTIONS, MECHANISMS } from "../../constants/mechanisms.js";
import { fmtPBadge } from "../../constants/thresholds.js";
import { MechIcon, mechIconSize } from "./MechIcon.jsx";
import { BLOCK_GAP, RAIL_GUTTER } from "./styles.js";

/**
 * @param {object} props
 * @param {object} props.result - test result object (must have .name, .flag, .primaryP)
 * @param {"qc"|"review"|"full"} props.mode
 * @param {boolean} props.expanded
 * @param {string} [props.mk] - mechanism cluster key. When supplied, the card
 *   renders a 3px left stripe in MECH_COLOR[mk] mirroring the parent
 *   cluster-header stripe (S156-fix3). Carries mechanism context into the
 *   card body. Omitted callers fall through to the legacy 1px C.BORDER_L
 *   left edge.
 * @param {function} [props.onToggle] - click handler for expand/collapse
 * @param {string|JSX.Element} [props.footer] - summary line below evidence
 * @param {JSX.Element} [props.children] - evidence content (EvidenceTable, plots, etc.)
 */
export function TestCardLayout({ result, mode, mk, expanded, onToggle, footer, children }) {
  const fl = result.flag || "LOW";
  const isFl = fl === "HIGH" || fl === "FLAGGED";
  const isNt = fl === "MODERATE" || fl === "NOTED";
  const hasEvidence = isFl || isNt;
  const flColor = isFl ? SEV_VERDICT[3].color : isNt ? SEV_VERDICT[2].color : SEV_VERDICT[0].color;
  // S156 (A1.D0c-bis D1 lock): Forensics/Review tier canon → sentence-case
  // `High` / `Moderate` / `Clear`. QC ALL CAPS branch unchanged (out of scope
  // for the canon migration; stale pending a QC-mode session).
  const flLabel = mode === "qc"
    ? (isFl ? "FLAGGED" : isNt ? "NOTED" : "CLEAR")
    : (isFl ? "High" : isNt ? "Moderate" : "Clear");

  const showSubtitle = mode !== "qc";
  const showPValue = mode === "full";
  // S196: cleared/LOW cards are expandable too (Tier-2 reachability mount).
  // hasEvidence still admits flagged tiers; `|| fl === "LOW"` adds the
  // cleared/LOW tier without admitting N/A (fl === "N/A" stays out). Inner
  // section gating in MiniCardLayout (Implications / What-to-look-for on
  // isFlagged) is untouched — those stay withheld on cleared cards.
  const expandable = (hasEvidence || fl === "LOW") && mode !== "qc";

  // S156-fix3: optional mechanism stripe on the card's left edge. Width
  // matches the ClusterRow header stripe (3px) so the user reads a
  // continuous mechanism anchor scrolling from header into card. Padding-
  // left grows to accommodate the stripe (existing 16px → stripe + 8px
  // breathing room).
  const mechStripe = mk ? MECH_COLOR[mk] : null;
  // S156-fix5: cluster-name breadcrumb above the test-name line. Renders
  // when `mk` is supplied AND maps to a known cluster — defensive skip
  // when mk is null/undefined (non-Forensics modes, custom card surfaces
  // outside cluster context). Cleared-tier cards drop opacity to 0.4,
  // matching the S156-fix1 chip stripe treatment so the mechanism handle
  // reads as muted alongside flagged-tier cards.
  const isCleared = !isFl && !isNt;
  const clusterLabel = mk && MECHANISMS[mk] ? MECHANISMS[mk].label : null;
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      ...(mechStripe ? { borderLeft: `3px solid ${mechStripe}` } : {}),
      borderRadius: "6px",
      padding: mechStripe ? "8px 16px 8px 10px" : "8px 16px",
      fontFamily: FF.UI,
    }}>
      {/* ── Cluster-name breadcrumb (S156-fix5 + S157 icon) ── */}
      {/* S210: gated on `expanded`. Its scroll-anchor role only applies on an
          open card (where the §3 cluster header may be off-screen); on a
          collapsed card the cluster header sits directly above, so the
          breadcrumb is scan-time repetition. Collapsed = two lines
          (name+verdict·p / question); expanded restores it above the name. */}
      {clusterLabel && expanded && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: FS.sm,
          fontWeight: FW.NORM,
          color: mechStripe,
          opacity: isCleared ? 0.4 : 1,
          lineHeight: "1.2",
          marginBottom: "2px",
        }}>
          <MechIcon mk={mk} size={mechIconSize(mk, 14)} color={mechStripe} />
          <span>{clusterLabel}</span>
        </div>
      )}
      {/* ── Header line (S210: two stacked rows) ── */}
      {/* The whole block owns expand/collapse. Row 1 carries the test name with
          verdict·p right-aligned (the verdict no longer competes with the
          question for the right edge); row 2 drops the sub-header question to
          its own full-width line so it reads in full on expansion. Mechanism
          breadcrumb above renders only when expanded (S210). */}
      <div
        style={{ cursor: expandable ? "pointer" : "default" }}
        onClick={expandable ? onToggle : undefined}
      >
        {/* Row 1 — test name (left) · verdict·p (right) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 0, overflow: "hidden", minWidth: 0 }}>
            {/* S210: disclosure triangle sits in the fixed-width gutter so the
                test name lands on the shared §3 rail — aligned with the cluster
                label, the cleared-strip text, and the sub-header question
                below. Glyph is the icon-glyph carve-out (TYPOGRAPHY-SYSTEM.md). */}
            <span style={{ width: RAIL_GUTTER, flexShrink: 0, display: "inline-flex", alignItems: "center" }}>
              {expandable && <span style={{ color: C.TEXT_3, fontSize: FS.base, flexShrink: 0 }}>{expanded ? "▾" : "▸"}</span>}
            </span>
            <span style={{ fontSize: FS.base, fontWeight: FW.SEMI, color: C.TEXT, whiteSpace: "nowrap" }}>
              {DISPLAY_NAMES[result.name] || result.name}
            </span>
          </span>
          {/* S195: verdict pill is inert text — no onClick, no pointer cursor.
              The whole header block owns expand/collapse; the pill sits alone
              on the right of row 1. */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0, marginLeft: "8px" }}>
            <span
              style={{
                fontWeight: FW.MED, fontSize: FS.base, color: flColor,
              }}
            >
              {flLabel}{showPValue && fl !== "LOW" && result.primaryP != null ? ` ${fmtPBadge(result.primaryP)}` : ""}
            </span>
          </div>
        </div>
        {/* Row 2 — sub-header question, full-width on its own line. Truncates
            on the collapsed card (teaser); wraps and reads in full on expand. */}
        {showSubtitle && TEST_DESCRIPTIONS[result.name] && (
          <div style={{
            paddingLeft: RAIL_GUTTER,
            fontSize: FS.sm, fontWeight: FW.NORM, color: C.TEXT_3,
            overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: expanded ? "normal" : "nowrap",
          }}>
            {TEST_DESCRIPTIONS[result.name]}
          </div>
        )}
      </div>

      {/* ── Expanded content ── */}
      {/* S168: disclosure stack relocated to MiniCardLayout. TestCardLayout
          is now pure chrome — children own the body layout (footer-on-top,
          evidence, How this test works, Implications, What to look for).
          The `footer` prop slot is preserved but unused by any current
          consumer; banked for separate cleanup (diagnostic finding S168). */}
      {expanded && (
        <div style={{ marginTop: BLOCK_GAP }}>
          {children}
          {footer && (
            <div style={{ fontSize: FS.xs, fontFamily: FF.UI, color: C.TEXT_3 }}>
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
