import { FLAG_STYLES } from "../../constants/thresholds.js";
import { CR, TF, FW, M } from "../../constants/tokens.js";

export function FlagBadge({ flag }) {
  const s=FLAG_STYLES[flag]||FLAG_STYLES["N/A"];
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:"5px",background:s.bg,border:"1px solid "+s.border,color:s.text,padding:"3px 10px",borderRadius:CR.MD,fontSize:TF.DETAIL,fontWeight:FW.BOLD,...M,letterSpacing:"0.06em",whiteSpace:"nowrap"}}>
      {flag==="ERROR"
        ? <span style={{fontSize:"10px",lineHeight:1,flexShrink:0}} aria-hidden="true">⚠</span>
        : <span style={{width:"7px",height:"7px",borderRadius:"50%",background:s.dot,flexShrink:0}}/>}
      {s.label}
    </span>
  );
}
