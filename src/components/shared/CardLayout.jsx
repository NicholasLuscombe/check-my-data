import { useState } from "react";
import { C, TF, FS, FW, FF, CR } from "../../constants/tokens.js";
import { BANNER_STYLES } from "./styles.js";

export function CardBanner({ type="info", children }) {
  const s = BANNER_STYLES[type] || BANNER_STYLES.info;
  return (
    <div style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:CR.MD,
      padding:"6px 10px",marginBottom:"6px",fontSize:TF.DETAIL,color:s.color,lineHeight:"1.5"}}>
      {children}
    </div>
  );
}

export function CardFooter({ children }) {
  return <div style={{fontFamily:FF.UI,fontSize:TF.DETAIL,color:C.TEXT_3,paddingLeft:"4px"}}>{children}</div>;
}

// Collapsible-section toggle row — sentence-case affordance, sm Semibold C.TEXT
// (co-consumes the Aside callout bullet-lead tuple). S150 (C.8 / B2): retuned
// from the pre-system TF.DETAIL / C.TEXT_3 register. The leading chevron is an
// icon glyph and carries a hardcoded size to peer with the toggle text per
// TYPOGRAPHY-SYSTEM.md §"What this system does NOT cover".
const TOGGLE_TEXT = { fontSize: FS.sm, color: C.TEXT, cursor: "pointer", fontWeight: FW.SEMI, padding: 0, fontFamily: FF.UI };
const TOGGLE_CHEVRON = { fontSize: "14px", marginRight: "4px" };

// Shared layout for all standard MiniCard components.
// Enforces uniform structure (Forensics mode, flagged tests):
//   ▸ Implications (collapsible, collapsed) -> ▸ What to look for (collapsible, collapsed)
//   -> [evidence] -> Footer.
// Edit here to change card layout for all 25 standard tests at once.
//
// S150 (C.8 / A2): headline and desc retired. Pre-S150, MiniCardLayout
// accepted headline + desc props and wrapped them in CardHeadline / CardDesc.
// Both rendered behind HideHeadlineCtx (CardLayout's own context, always set
// to true by the single mounted TestCard consumer), so the headline and desc
// paths never reached the screen. Retired with the wrapping components and
// the HEADLINE_COLOR per-tier text colour that fed CardHeadline.
export function MiniCardLayout({ result, lookFor, footer, children, implications }) {
  const [implOpen, setImplOpen] = useState(false);
  const [lookForOpen, setLookForOpen] = useState(false);
  const isFlagged = result.flag !== "LOW" && result.flag !== "N/A";
  return (
    <>
      {isFlagged && implications && (
        <div style={{marginBottom:"8px"}}>
          <div onClick={() => setImplOpen(o => !o)} style={TOGGLE_TEXT}>
            <span style={TOGGLE_CHEVRON}>{implOpen ? "▾" : "▸"}</span>
            Implications
          </div>
          {implOpen && (
            <div style={{padding:"8px 12px",margin:"4px 0 0 0",background:C.BG_L,border:`1px solid ${C.BORDER_L}`,borderRadius:CR.MD,fontSize:TF.BODY,fontFamily:FF.UI,color:C.TEXT_2,lineHeight:"1.6"}}>
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
            <div style={{padding:"8px 12px",margin:"4px 0 0 0",background:C.BG_L,border:`1px solid ${C.BORDER_L}`,borderRadius:CR.MD,fontSize:TF.BODY,fontFamily:FF.UI,color:C.TEXT_2,lineHeight:"1.6"}}>
              {lookFor}
            </div>
          )}
        </div>
      )}
      {children}
      {footer && <CardFooter>{footer}</CardFooter>}
    </>
  );
}
