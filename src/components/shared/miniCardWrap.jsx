import { C, CR } from "../../constants/tokens.js";

export const miniCardWrap = (child, bg=C.BG) => (
  <div style={{margin:"8px 0 6px",padding:"10px 12px",background:bg,
    border:`1px solid ${C.BORDER_L}`,borderRadius:CR.MD,overflowX:"auto"}}>
    {child}
  </div>
);
