import { ROLES } from "../../constants/roles.js";
import { CR, TF, FW } from "../../constants/tokens.js";

export function RoleBadge({ role }) {
  const r=ROLES[role]||ROLES.data;
  return <span style={{display:"inline-block",background:r.bg,border:"1px solid "+r.border,color:r.color,padding:"2px 0",minWidth:"52px",textAlign:"center",borderRadius:CR.SM,fontSize:TF.DETAIL,fontWeight:FW.BOLD,letterSpacing:"0.05em",userSelect:"none"}}>{r.label}</span>;
}
