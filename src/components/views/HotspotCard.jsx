/* ── HotspotCard — QC mode hotspot display ───────────────────────────
   Plain-language cards for "Check my data" mode.
   No test names, no p-values, no category keys.
   Same-category hotspots collapsed into a single card with multiple locations. */

import { useState } from "react";
import { C, TF, FW, FF, CR, SIGNAL } from "../../constants/tokens.js";
import { MECHANISMS } from "../../constants/mechanisms.js";
import { CATEGORY_GUIDANCE, QC_HOTSPOT_NARRATIVE, QC_NO_HOTSPOT } from "../../constants/guidance.js";


/** Format a hotspot bounding box as an Excel-style range string */
function hotspotRange(h, coordCtx) {
  const c0 = coordCtx?.fileColVis?.(h.colStart) || String(h.colStart + 1);
  const r0 = coordCtx?.fileRow?.(h.rowStart) ?? (h.rowStart + 1);
  const c1 = coordCtx?.fileColVis?.(h.colEnd) || String(h.colEnd + 1);
  const r1 = coordCtx?.fileRow?.(h.rowEnd) ?? (h.rowEnd + 1);
  return `${c0}${r0}\u2013${c1}${r1}`;
}

/** Check if a hotspot is a single cell */
function isSingleCell(h) {
  return h.rowStart === h.rowEnd && h.colStart === h.colEnd;
}

function GroupedCard({ cat, hotspots, coordCtx }) {
  const [expanded, setExpanded] = useState(false);
  const color = MECHANISMS[cat]?.color || C.TEXT_3;
  const guidance = CATEGORY_GUIDANCE[cat]?.qc;
  const narrative = QC_HOTSPOT_NARRATIVE[cat] || "Check this region for anomalies.";
  const mechLabel = MECHANISMS[cat]?.label || cat;

  return (
    <div style={{
      background: C.WHITE, border: `1px solid ${C.BORDER}`,
      borderLeft: `4px solid ${color}`,
      borderRadius: CR.MD, padding: "16px 20px", marginBottom: 10,
    }}>
      {/* Header — category name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: TF.TITLE, fontWeight: FW.SEMI, color: C.TEXT }}>
          {"\u26A0"} {mechLabel}
        </span>
      </div>

      {/* Guidance short */}
      {guidance && (
        <div style={{ fontSize: TF.BODY, color: C.TEXT_2, lineHeight: "1.6", marginBottom: 8 }}>
          {guidance.short}
        </div>
      )}

      {/* Narrative */}
      <div style={{ fontSize: TF.BODY, color: C.TEXT, lineHeight: "1.6", marginBottom: 12 }}>
        {narrative}
      </div>

      {/* Location pills */}
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: TF.DETAIL, fontWeight: FW.SEMI, color: C.TEXT_2, marginRight: 8 }}>
          Location{hotspots.length !== 1 ? "s" : ""}:
        </span>
        {hotspots.map((h, i) => (
          <span key={i} style={{
            display: "inline-block", padding: "2px 8px", marginRight: 4, marginBottom: 4,
            background: C.BG_L, border: `1px solid ${C.BORDER_L}`,
            borderRadius: CR.SM, fontSize: TF.DETAIL, color: C.TEXT_2,
            fontFamily: FF.UI,
          }}>
            {hotspotRange(h, coordCtx)}
          </span>
        ))}
      </div>

      {/* What to look for */}
      {guidance && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: TF.DETAIL, fontWeight: FW.SEMI, color: C.TEXT_2, marginBottom: 4 }}>
            What to look for
          </div>
          <div style={{ fontSize: TF.DETAIL, color: C.TEXT_3, lineHeight: "1.5" }}>
            {guidance.lookFor}
          </div>
        </div>
      )}

      {/* Innocent explanations */}
      {guidance && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: TF.DETAIL, fontWeight: FW.SEMI, color: C.TEXT_2, marginBottom: 4 }}>
            Innocent explanations
          </div>
          <div style={{ fontSize: TF.DETAIL, color: C.TEXT_3, lineHeight: "1.5" }}>
            {guidance.innocent}
          </div>
        </div>
      )}

      {/* Show details toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none", border: "none", padding: 0,
          color: C.TEXT_3, fontSize: TF.DETAIL, cursor: "pointer",
          fontFamily: FF.UI,
        }}
      >
        {expanded ? "\u25BE Hide details" : "\u25B8 Show details"}
      </button>
      {expanded && (
        <div style={{
          marginTop: 8, padding: "10px 12px",
          background: C.BG_L, borderRadius: CR.SM,
          fontSize: TF.DETAIL, color: C.TEXT_3, lineHeight: "1.5",
        }}>
          {hotspots.map((h, i) => (
            <div key={i} style={{ marginBottom: i < hotspots.length - 1 ? 6 : 0 }}>
              <div style={{ fontWeight: FW.SEMI }}>{hotspotRange(h, coordCtx)}</div>
              <div>{h.tests.length} test{h.tests.length !== 1 ? "s" : ""}: {h.tests.join(", ")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HotspotCards({ hotspots, severity, nApplicable, coordCtx, mode }) {
  // No hotspots — show appropriate message
  if (!hotspots || hotspots.length === 0) {
    const msg = QC_NO_HOTSPOT[severity] || QC_NO_HOTSPOT[0];
    return (
      <div style={{
        padding: "20px 24px", marginTop: 16,
        background: severity === 0 ? SIGNAL.GREEN.bg : C.BG_L,
        border: `1px solid ${severity === 0 ? SIGNAL.GREEN.border : C.BORDER_L}`,
        borderRadius: CR.LG, fontSize: TF.BODY, color: C.TEXT_2,
        lineHeight: "1.6",
      }}>
        {msg}
      </div>
    );
  }

  // Fix 46: filter single-cell hotspots in QC mode
  const isQC = mode === "qc";
  const filtered = isQC ? hotspots.filter(h => !isSingleCell(h)) : hotspots;

  if (filtered.length === 0) {
    return (
      <div style={{
        padding: "20px 24px", marginTop: 16,
        background: C.BG_L, border: `1px solid ${C.BORDER_L}`,
        borderRadius: CR.LG, fontSize: TF.BODY, color: C.TEXT_2,
        lineHeight: "1.6",
      }}>
        Some individual cells were flagged but no broader patterns were found.
      </div>
    );
  }

  // Fix 45: Group hotspots by dominant category
  const groups = {};
  const shown = filtered.length <= 5 ? filtered : filtered.slice(0, 5);
  for (const h of shown) {
    const cat = h.categories[0]; // dominant category
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(h);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: TF.TITLE, fontWeight: FW.SEMI, color: C.TEXT, marginBottom: 10 }}>
        Areas to check
      </div>
      {Object.entries(groups).map(([cat, hs]) => (
        <GroupedCard key={cat} cat={cat} hotspots={hs} coordCtx={coordCtx} />
      ))}
      {filtered.length > 5 && (
        <div style={{ fontSize: TF.DETAIL, color: C.TEXT_3, marginTop: 4 }}>
          {filtered.length - 5} additional region{filtered.length - 5 !== 1 ? "s" : ""} detected. Switch to Detailed analysis for the complete list.
        </div>
      )}
    </div>
  );
}
