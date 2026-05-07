import { useState, useContext, createContext } from "react";

export const HideHeadlineCtx = createContext(false);
import { C, TF, FW, FF, CR } from "../../constants/tokens.js";
import { HEADLINE_COLOR } from "../../constants/thresholds.js";
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

export function CardHeadline({ flag, children }) {
  const hide = useContext(HideHeadlineCtx);
  if (hide) return null;
  return (
    <div style={{fontFamily:FF.UI,fontSize:TF.DETAIL,color:HEADLINE_COLOR[flag]||C.TEXT_3,marginBottom:"6px",lineHeight:"1.7"}}>
      <span style={{fontSize:TF.DETAIL,fontWeight:FW.SEMI,color:C.TEXT_4,textTransform:"uppercase",letterSpacing:"0.04em"}}>Primary finding: </span>
      {children}
    </div>
  );
}

export function CardDesc({ children }) {
  const hide = useContext(HideHeadlineCtx);
  if (hide) return null;
  return <p style={{color:C.TEXT_3,fontSize:TF.BODY,lineHeight:"1.55",margin:"0 0 8px 0"}}>{children}</p>;
}

export function CardFooter({ children }) {
  return <div style={{fontFamily:FF.UI,fontSize:TF.DETAIL,color:C.TEXT_4,paddingLeft:"4px"}}>{children}</div>;
}

// Shared layout for all standard MiniCard components.
// Enforces uniform structure (Forensics mode, flagged tests):
//   Headline -> ▸ How this test works (collapsible, collapsed — in TestCardLayout)
//   -> ▸ Implications (collapsible, collapsed) -> ▸ What to look for (collapsible, collapsed)
//   -> [evidence] -> Footer.
// Edit here to change card layout for all 25 standard tests at once.
export function MiniCardLayout({ result, headline, desc, lookFor, footer, children, implications }) {
  const hideHeadline = useContext(HideHeadlineCtx);
  const [implOpen, setImplOpen] = useState(false);
  const [lookForOpen, setLookForOpen] = useState(false);
  const isFlagged = result.flag !== "LOW" && result.flag !== "N/A";
  return (
    <>
      {!hideHeadline && <CardHeadline flag={result.flag}>{headline}</CardHeadline>}
      {isFlagged && implications && (
        <div style={{marginBottom:"8px"}}>
          <div onClick={() => setImplOpen(o => !o)}
            style={{fontSize:TF.DETAIL,color:C.TEXT_3,cursor:"pointer",fontWeight:FW.SEMI,padding:0,fontFamily:FF.UI}}>
            <span style={{fontSize:TF.DETAIL,marginRight:"4px"}}>{implOpen ? "▾" : "▸"}</span>
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
          <div onClick={() => setLookForOpen(o => !o)}
            style={{fontSize:TF.DETAIL,color:C.TEXT_3,cursor:"pointer",fontWeight:FW.SEMI,padding:0,fontFamily:FF.UI}}>
            <span style={{fontSize:TF.DETAIL,marginRight:"4px"}}>{lookForOpen ? "▾" : "▸"}</span>
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
