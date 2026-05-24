import { useState } from "react";
import { C, FS, FW, FF, CR } from "../../constants/tokens.js";
import { TEST_METHODS } from "../../constants/mechanisms.js";
import { BANNER_STYLES } from "./styles.js";

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
export function CardFooter({ children }) {
  return <div style={{fontFamily:FF.UI,fontSize:FS.sm,color:C.TEXT_2,paddingLeft:"4px"}}>{children}</div>;
}

// Collapsible-section toggle row — sentence-case affordance, sm Semibold C.TEXT
// (co-consumes the Aside callout bullet-lead tuple). S150 (C.8 / B2): retuned
// from the pre-system 11px / C.TEXT_3 register. The leading chevron is an
// icon glyph and carries a hardcoded size to peer with the toggle text per
// TYPOGRAPHY-SYSTEM.md §"What this system does NOT cover".
const TOGGLE_TEXT = { fontSize: FS.sm, color: C.TEXT, cursor: "pointer", fontWeight: FW.SEMI, padding: 0, fontFamily: FF.UI };
const TOGGLE_CHEVRON = { fontSize: "14px", marginRight: "4px" };

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
export function MiniCardLayout({ result, lookFor, footer, children, implications }) {
  const [methodOpen, setMethodOpen] = useState(false);
  const [implOpen, setImplOpen] = useState(false);
  const [lookForOpen, setLookForOpen] = useState(false);
  const isFlagged = result.flag !== "LOW" && result.flag !== "N/A";
  const methodText = TEST_METHODS[result.name];
  return (
    <>
      {footer && (
        <div style={{marginBottom:"8px"}}>
          <CardFooter>{footer}</CardFooter>
        </div>
      )}
      {children}
      {methodText && (
        <div style={{marginTop:"8px",marginBottom:"8px"}}>
          <div onClick={() => setMethodOpen(o => !o)} style={TOGGLE_TEXT}>
            <span style={TOGGLE_CHEVRON}>{methodOpen ? "▾" : "▸"}</span>
            How this test works
          </div>
          {methodOpen && (
            <div style={{padding:"8px 12px",margin:"4px 0 0 0",background:C.BG_L,border:`1px solid ${C.BORDER_L}`,borderRadius:CR.MD,fontSize:FS.base,fontFamily:FF.UI,color:C.TEXT,lineHeight:"1.6"}}>
              {methodText}
            </div>
          )}
        </div>
      )}
      {isFlagged && implications && (
        <div style={{marginBottom:"8px"}}>
          <div onClick={() => setImplOpen(o => !o)} style={TOGGLE_TEXT}>
            <span style={TOGGLE_CHEVRON}>{implOpen ? "▾" : "▸"}</span>
            Implications
          </div>
          {implOpen && (
            <div style={{padding:"8px 12px",margin:"4px 0 0 0",background:C.BG_L,border:`1px solid ${C.BORDER_L}`,borderRadius:CR.MD,fontSize:FS.base,fontFamily:FF.UI,color:C.TEXT,lineHeight:"1.6"}}>
              {implications}
            </div>
          )}
        </div>
      )}
      {isFlagged && lookFor && (
        <div style={{marginBottom:"8px"}}>
          <div onClick={() => setLookForOpen(o => !o)} style={TOGGLE_TEXT}>
            <span style={TOGGLE_CHEVRON}>{lookForOpen ? "▾" : "▸"}</span>
            What to look for
          </div>
          {lookForOpen && (
            <div style={{padding:"8px 12px",margin:"4px 0 0 0",background:C.BG_L,border:`1px solid ${C.BORDER_L}`,borderRadius:CR.MD,fontSize:FS.base,fontFamily:FF.UI,color:C.TEXT,lineHeight:"1.6"}}>
              {lookFor}
            </div>
          )}
        </div>
      )}
    </>
  );
}
