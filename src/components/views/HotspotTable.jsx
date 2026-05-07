/* ── HotspotTable — Review mode hotspot display ──────────────────────
   Table with convergence metrics, contributing categories, click-to-scroll.
   No p-values, no mini-plots. Category badges visible. */

import { C, TF, FW, CR, SIGNAL } from "../../constants/tokens.js";
import { MECHANISMS } from "../../constants/mechanisms.js";
import { CATEGORY_GUIDANCE } from "../../constants/guidance.js";


const RANK_COLORS = [SIGNAL.RED.dot, SIGNAL.AMBER.dot, "#DAA520"];
const RANK_LABELS = ["Start investigation here", "Secondary region of concern", "Additional region"];

/** Format hotspot location as Excel-style range */
function fmtLoc(hotspot, coordCtx) {
  const fr = coordCtx?.fileRow || ((r) => r + 1);
  const fc = coordCtx?.fileColVis || ((c) => String(c + 1));
  return `${fc(hotspot.colStart)}${fr(hotspot.rowStart)}\u2013${fc(hotspot.colEnd)}${fr(hotspot.rowEnd)}`;
}

function HotspotRow({ hotspot, rank, onScrollTo, coordCtx }) {
  const rankColor = RANK_COLORS[Math.min(rank, 2)];
  const label = rank < 3 ? RANK_LABELS[rank] : RANK_LABELS[2];

  return (
    <div
      onClick={() => onScrollTo && onScrollTo(hotspot)}
      style={{
        padding: "14px 16px",
        borderBottom: `1px solid ${C.BORDER_L}`,
        cursor: onScrollTo ? "pointer" : "default",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = C.BG_L}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Header line */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ color: rankColor, fontSize: TF.BODY }}>{"\u25CF"}</span>
        <span style={{ fontSize: TF.BODY, fontWeight: FW.SEMI, color: C.TEXT }}>
          Cells {fmtLoc(hotspot, coordCtx)}
        </span>
      </div>

      {/* Convergence metrics */}
      <div style={{ fontSize: TF.DETAIL, color: C.TEXT_2, marginBottom: 6, marginLeft: 22 }}>
        {hotspot.tests.length} test{hotspot.tests.length !== 1 ? "s" : ""}, {hotspot.categories.length} categor{hotspot.categories.length !== 1 ? "ies" : "y"} converging
      </div>

      {/* Category badges */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: 22, marginBottom: 6 }}>
        {hotspot.categories.map(cat => (
          <span key={cat} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: TF.DETAIL, color: MECHANISMS[cat]?.color || C.TEXT_3,
            fontWeight: FW.SEMI,
          }}>
            <span style={{
              display: "inline-block", width: 8, height: 8,
              borderRadius: 2, background: MECHANISMS[cat]?.color || C.TEXT_4,
            }} />
            {MECHANISMS[cat]?.label || cat}
          </span>
        ))}
      </div>

      {/* Priority label */}
      <div style={{ fontSize: TF.DETAIL, color: C.TEXT_3, fontStyle: "italic", marginLeft: 22 }}>
        {label}
      </div>
    </div>
  );
}

function InvestigationGuidance({ hotspot, coordCtx }) {
  const cat = hotspot.categories[0];
  const guidance = CATEGORY_GUIDANCE[cat]?.review;
  if (!guidance) return null;
  const loc = fmtLoc(hotspot, coordCtx);

  return (
    <div style={{
      padding: "12px 16px", marginTop: 8,
      background: C.BG_L, borderRadius: CR.SM,
      fontSize: TF.DETAIL, color: C.TEXT_2, lineHeight: "1.6",
    }}>
      <div style={{ fontWeight: FW.SEMI, marginBottom: 6 }}>Recommended actions:</div>
      <div style={{ marginLeft: 8 }}>
        {"\u2022"} Open cells {loc} in the original spreadsheet
      </div>
      <div style={{ marginLeft: 8 }}>{"\u2022"} {guidance.detail}</div>
      <div style={{ marginLeft: 8 }}>{"\u2022"} {guidance.lookFor}</div>

      <div style={{ fontWeight: FW.SEMI, marginTop: 10, marginBottom: 6 }}>Innocent explanations to consider:</div>
      <div style={{ marginLeft: 8 }}>{"\u2022"} {guidance.innocent}</div>
    </div>
  );
}

export function HotspotTable({ hotspots, severity, onScrollTo, pattern, coordCtx }) {
  // No hotspots but severity > 0: note about global tests
  if (!hotspots || hotspots.length === 0) {
    if (severity === 0) return null;
    return (
      <div style={{
        padding: "16px 20px", marginTop: 16,
        background: C.BG_L, border: `1px solid ${C.BORDER_L}`,
        borderRadius: CR.LG, fontSize: TF.BODY, color: C.TEXT_2,
        lineHeight: "1.6",
      }}>
        No spatially localised hotspots detected. Flags are from dataset-wide statistical tests rather than localised regions.
      </div>
    );
  }

  const topHotspot = hotspots[0];

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: TF.TITLE, fontWeight: FW.SEMI, color: C.TEXT, marginBottom: 8 }}>
        Hotspot Analysis
        <span style={{ fontSize: TF.DETAIL, fontWeight: FW.NORM, color: C.TEXT_3, marginLeft: 8 }}>
          {hotspots.length} region{hotspots.length !== 1 ? "s" : ""} detected
        </span>
      </div>

      {/* Hotspot rows */}
      <div style={{
        border: `1px solid ${C.BORDER}`, borderRadius: CR.MD,
        overflow: "hidden", background: C.WHITE,
      }}>
        {hotspots.map((h, i) => (
          <HotspotRow key={i} hotspot={h} rank={i} onScrollTo={onScrollTo} coordCtx={coordCtx} />
        ))}
      </div>

      {/* Investigation guidance for top hotspot */}
      {topHotspot && <InvestigationGuidance hotspot={topHotspot} coordCtx={coordCtx} />}
    </div>
  );
}
