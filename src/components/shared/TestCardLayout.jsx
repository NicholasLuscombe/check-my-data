/* ── TestCardLayout — white card wrapper for individual tests ──
   Renders inside a CategoryRow's expanded content.
   Three visual tiers: grey category → white test card → evidence content.
   Mode-aware: QC shows name+status only, Review adds subtitle,
   Forensics adds p-value and method line. */

import { useState } from "react";
import { C, FS, FW, FF, CR, SEV_VERDICT, MECH_COLOR } from "../../constants/tokens.js";
import { DISPLAY_NAMES, TEST_DESCRIPTIONS, TEST_METHODS } from "../../constants/mechanisms.js";
import { fmtPBadge } from "../../constants/thresholds.js";

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
 * @param {function} [props.onSeverityBadgeClick] - S126b: badge-only click
 *   (forensics pulse). Receives the click event; caller must stopPropagation.
 *   When set, the badge becomes interactive without overriding the row's
 *   expand/collapse onToggle.
 * @param {string|JSX.Element} [props.footer] - summary line below evidence
 * @param {JSX.Element} [props.children] - evidence content (EvidenceTable, plots, etc.)
 */
export function TestCardLayout({ result, mode, mk, expanded, onToggle, onSeverityBadgeClick, footer, children }) {
  const [methodOpen, setMethodOpen] = useState(false);
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
  const showMethod = mode === "full" && expanded;
  const expandable = hasEvidence && mode !== "qc";
  const methodText = TEST_METHODS[result.name];

  // S156-fix3: optional mechanism stripe on the card's left edge. Width
  // matches the ClusterRow header stripe (3px) so the user reads a
  // continuous mechanism anchor scrolling from header into card. Padding-
  // left grows to accommodate the stripe (existing 16px → stripe + 8px
  // breathing room).
  const mechStripe = mk ? MECH_COLOR[mk] : null;
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      ...(mechStripe ? { borderLeft: `3px solid ${mechStripe}` } : {}),
      borderRadius: "6px",
      padding: mechStripe ? "8px 16px 8px 11px" : "8px 16px",
      fontFamily: FF.UI,
    }}>
      {/* ── Header line ── */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: expandable ? "pointer" : "default" }}
        onClick={expandable ? onToggle : undefined}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px", overflow: "hidden", minWidth: 0 }}>
          <span style={{ fontSize: FS.base, fontWeight: FW.SEMI, color: C.TEXT, whiteSpace: "nowrap" }}>
            {DISPLAY_NAMES[result.name] || result.name}
          </span>
          {showSubtitle && TEST_DESCRIPTIONS[result.name] && (
            <span style={{ fontSize: FS.base, fontWeight: FW.NORM, color: C.TEXT_3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {" · "}{TEST_DESCRIPTIONS[result.name]}
            </span>
          )}
        </span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0, marginLeft: "8px" }}>
          <span
            onClick={onSeverityBadgeClick}
            style={{
              fontWeight: FW.SEMI, fontSize: FS.xs, color: flColor,
              cursor: onSeverityBadgeClick ? "pointer" : undefined,
            }}
          >
            {flLabel}{showPValue && fl !== "LOW" && result.primaryP != null ? ` ${fmtPBadge(result.primaryP)}` : ""}
          </span>
          {expandable && <span style={{ color: C.TEXT_3, fontSize: FS.base }}>{expanded ? "▾" : "▸"}</span>}
        </div>
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div style={{ marginTop: "10px" }}>
          {showMethod && methodText && (
            <div style={{marginBottom:"8px"}}>
              {/* Collapsible toggle — sm Semibold C.TEXT (B2 lock, co-consumes
                  Aside callout bullet-lead tuple). Chevron is an icon glyph at
                  a hardcoded literal per the §"What this system does NOT
                  cover" carve-out. */}
              <div onClick={() => setMethodOpen(o => !o)}
                style={{fontSize:FS.sm,color:C.TEXT,cursor:"pointer",fontWeight:FW.SEMI,padding:0,fontFamily:FF.UI}}>
                <span style={{fontSize:"14px",marginRight:"4px"}}>{methodOpen ? "▾" : "▸"}</span>
                How this test works
              </div>
              {methodOpen && (
                <div style={{padding:"8px 12px",margin:"4px 0 0 0",background:C.BG,border:`1px solid ${C.BORDER_L}`,borderRadius:CR.MD,fontSize:FS.base,fontFamily:FF.UI,color:C.TEXT_2,lineHeight:"1.6"}}>
                  {methodText}
                </div>
              )}
            </div>
          )}
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
