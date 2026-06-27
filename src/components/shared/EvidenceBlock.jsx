/* ── Shared: EvidenceBlock — card evidence section wrapper (sub-heading + description + scroll container) ── */

import { C, FS, FW, FF, CR } from "../../constants/tokens.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "./styles.js";

// Evidence section with sub-heading + description.
// S210 (multi-surface): the lead block's heading drops — the footer
// fragment (LEAD_HEAD in MiniCardLayout) heads it; the secondary block
// keeps a demoted (Regular weight) heading below the footer-lead.
export const EvidenceBlock = ({label, detail, children, lead=false}) => (
  <div style={{marginTop: lead ? 0 : BLOCK_GAP}}>
    {!lead && <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>{label}</div>}
    {detail && <div style={{fontSize:FS.sm,fontFamily:FF.UI,color:C.TEXT_2,marginBottom:"8px"}}>{detail}</div>}
    <div style={{border:`1px solid ${C.BORDER_L}`,borderRadius:CR.MD,padding:0,overflowX:"auto",overflowY:"auto",maxHeight:"200px",background:C.WHITE,position:"relative"}}>{children}</div>
  </div>
);
