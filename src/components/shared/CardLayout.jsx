import { useState } from "react";
import { C, FS, FW, FF, CR } from "../../constants/tokens.js";
import { TEST_METHODS } from "../../constants/mechanisms.js";
import { BANNER_STYLES, LEAD_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "./styles.js";

// S150 (C.8 / B3): fontSize lifted 11px -> FS.sm 14px. Chrome shape
// preserved (bordered box + CR.MD radius); typography only retune. Five
// consumers across MiniCard_InterReplicateCorrelation, MiniCard_Mahalanobis,
// MiniCard_RankCorrelation, MiniCard_SelectiveNoise, MiniCard_ValueFrequency.
export function CardBanner({ type="info", children }) {
  const s = BANNER_STYLES[type] || BANNER_STYLES.info;
  return (
    <div style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:CR.MD,
      padding:"6px 10px",marginBottom:"6px",fontSize:FS.sm,color:s.color,lineHeight:"1.5"}}>
      {children}
    </div>
  );
}

// S150 (C.8): retuned to Footnote/reference register sm Regular C.TEXT_2 sans.
// Pre-S150: 11px / C.TEXT_3 (Session 1 dropped C.TEXT_4 alias here).
// S210: no longer consumed — MiniCardLayout's footer now renders as LEAD_HEAD
// (body lead header), not this footnote register. Export retained, banked for
// separate cleanup.
export function CardFooter({ children }) {
  return <div style={{fontFamily:FF.UI,fontSize:FS.sm,color:C.TEXT_2,paddingLeft:"4px"}}>{children}</div>;
}

// S210 (card composition): the three disclosures are one quiet inline row,
// recessive (sm Regular C.TEXT_2) — lighter than SUB_HEAD content headings so
// the set reads as secondary affordances rather than competing as content.
// The chevron is an icon glyph and carries a hardcoded size per
// TYPOGRAPHY-SYSTEM.md §"What this system does NOT cover".
const DISCLOSURE_TOGGLE = { display: "inline-flex", alignItems: "center", fontSize: FS.sm, color: C.TEXT_2, cursor: "pointer", fontWeight: FW.NORM, fontFamily: FF.UI };
const DISCLOSURE_CHEVRON = { fontSize: "12px", marginRight: "4px", color: C.TEXT_3 };
// Accordion panel — opens below the label row (not the individual label), so a
// wrapped two-line row's panels still stack beneath the whole row.
const DISCLOSURE_PANEL = { marginTop: BLOCK_GAP_TIGHT, padding: "8px 12px", background: C.BG_L, border: `1px solid ${C.BORDER_L}`, borderRadius: CR.MD, fontSize: FS.base, fontFamily: FF.UI, color: C.TEXT, lineHeight: "1.6" };

// Shared layout for all standard MiniCard components.
// Enforces uniform structure (Forensics mode, expanded tests):
//   Footer (one-line result) -> [evidence] -> ▸ How this test works
//   -> ▸ Implications -> ▸ What to look for.
// Edit here to change card layout for all 25 standard tests at once.
//
// S168 (A2 cross-cluster reorder): footer promoted to TOP as the one-line
// result. The "How this test works" disclosure relocated here from
// TestCardLayout so all three disclosure blocks live in one wrapper. Gates
// preserved (not unified): How-it-works is ungated except for the
// TEST_METHODS entry check (descriptive — true regardless of flag);
// Implications + What-to-look-for stay `isFlagged`-gated (finding-specific
// — only meaningful when the test fired). PR mode never mounts this
// component (CategoryRow review branch routes children to a finding-string
// div), so the relocated How-it-works remains Forensics-only by inheritance.
//
// S150 (C.8 / A2): headline and desc retired. Pre-S150, MiniCardLayout
// accepted headline + desc props and wrapped them in CardHeadline / CardDesc.
// Both rendered behind HideHeadlineCtx (CardLayout's own context, always set
// to true by the single mounted TestCard consumer), so the headline and desc
// paths never reached the screen. Retired with the wrapping components and
// the HEADLINE_COLOR per-tier text colour that fed CardHeadline.
//
// S210 (card composition): footer promoted from CardFooter footnote register to
// LEAD_HEAD — the body's lead header, the bridge from the header line to the
// first surface. The three disclosures collapse from three stacked
// heading-weight rows into one quiet inline row (DISCLOSURE_TOGGLE); each label
// toggles an accordion panel that opens below the row-as-a-block, panels
// stacking in row order. Independent toggles preserved — multiple may be open
// at once (not tabbed). Inter-block rhythm via BLOCK_GAP / BLOCK_GAP_TIGHT.
export function MiniCardLayout({ result, lookFor, footer, children, implications }) {
  const [methodOpen, setMethodOpen] = useState(false);
  const [implOpen, setImplOpen] = useState(false);
  const [lookForOpen, setLookForOpen] = useState(false);
  const isFlagged = result.flag !== "LOW" && result.flag !== "N/A";
  const methodText = TEST_METHODS[result.name];

  // Gates unchanged (not unified): How-it-works on a TEST_METHODS entry
  // (descriptive — flagged or not); Implications + What-to-look-for on isFlagged
  // (finding-specific). Order in the row matches the prior stacked order.
  const disclosures = [];
  if (methodText) disclosures.push({ key: "method", label: "How this test works", open: methodOpen, toggle: () => setMethodOpen(o => !o), body: methodText });
  if (isFlagged && implications) disclosures.push({ key: "impl", label: "Implications", open: implOpen, toggle: () => setImplOpen(o => !o), body: implications });
  if (isFlagged && lookFor) disclosures.push({ key: "lookFor", label: "What to look for", open: lookForOpen, toggle: () => setLookForOpen(o => !o), body: lookFor });

  return (
    <>
      {footer && (
        <div style={{ ...LEAD_HEAD, marginBottom: BLOCK_GAP }}>{footer}</div>
      )}
      {children}
      {disclosures.length > 0 && (
        <div style={{ marginTop: BLOCK_GAP }}>
          {/* One quiet inline row of toggles; wraps gracefully at narrow widths. */}
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: "16px", rowGap: BLOCK_GAP_TIGHT }}>
            {disclosures.map(d => (
              <span key={d.key} onClick={d.toggle} style={DISCLOSURE_TOGGLE}>
                <span style={DISCLOSURE_CHEVRON}>{d.open ? "▾" : "▸"}</span>
                {d.label}
              </span>
            ))}
          </div>
          {/* Open panels stack below the row in row order — anchored to the row,
              not the individual label. */}
          {disclosures.filter(d => d.open).map(d => (
            <div key={d.key} style={DISCLOSURE_PANEL}>{d.body}</div>
          ))}
        </div>
      )}
    </>
  );
}
