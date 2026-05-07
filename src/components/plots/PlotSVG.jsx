import { FF } from "../../constants/tokens.js";

// Standard SVG container for all chart components.
// Sets default font (FF.UI), display mode, and overflow.
// Edit here to change chart container style for all plots at once.
export function PlotSVG({ W, H, children, overflow, responsive }) {
  return responsive
    ? <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",maxWidth:W,fontFamily:FF.UI,display:"block"}}>
        {children}
      </svg>
    : <svg width={W} height={H} style={{display:"block",fontFamily:FF.UI,
        overflow:overflow?"visible":undefined}}>
        {children}
      </svg>;
}
