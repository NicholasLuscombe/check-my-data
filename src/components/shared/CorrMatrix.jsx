import { C, TF, FF, CF, FW, CR } from "../../constants/tokens.js";
import { SUB_HEAD } from "./styles.js";

// Lower-triangle correlation matrix heatmap.
// Used by IRC (replicate correlations) and RSC (residual correlations).
// labels: array of row/column names.
// getValue(rowLabel, colLabel): returns any value (number, object, or null).
// formatCell(val): returns display string. Default: val.toFixed(2) for numbers.
// cellBg(val), cellText(val), cellBold(val): appearance functions on getValue's return.
// cellSize: override; defaults to responsive sizing based on label count.
// labelNum: show numeric index instead of full label in headers (for wide matrices).
export function CorrMatrix({ labels, getValue, formatCell, cellBg, cellText, cellBold, cellSize: cellSizeOverride, labelNum, title }) {
  if (!labels || labels.length < 2) return null;
  const n = labels.length;
  const CELL = cellSizeOverride || (n > 8 ? 26 : n > 5 ? 32 : 40);
  const fmt = formatCell || (v => v != null && typeof v === "number" ? v.toFixed(2) : "");
  // Rotate column headers when many labels to prevent overlap
  const rotateCol = n > 5;
  const colHeaderStyle = rotateCol
    ? { width:CELL, fontSize:CF.SMALL, color:C.TEXT_3, fontFamily:FF.UI, fontWeight:FW.SEMI, padding:0, verticalAlign:"bottom", height: n > 8 ? 48 : 36 }
    : { width:CELL, textAlign:"center", fontSize:CF.SMALL, color:C.TEXT_3, fontFamily:FF.UI, fontWeight:FW.SEMI, padding:"0 0 2px" };
  // Abbreviate label for column headers when rotated and long
  const colLabel = (lbl) => {
    if (!rotateCol || lbl.length <= 10) return lbl;
    const parts = lbl.split(/[\s_+·-]+/);
    if (parts.length >= 2) return parts.map(p => p.slice(0, 4)).join(" ");
    return lbl.slice(0, 9) + "…";
  };
  return (
    <div>
      {title && <div style={SUB_HEAD}>{title}</div>}
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"separate",borderSpacing:"2px"}}>
          <thead><tr>
            <th/>
            {labels.slice(0,-1).map((lbl,i) => (
              <th key={i} style={colHeaderStyle} title={lbl}>
                {rotateCol ? (
                  <div style={{transform:"rotate(-50deg)",transformOrigin:"bottom left",whiteSpace:"nowrap",marginLeft:CELL*0.6,marginBottom:2}}>
                    {labelNum ? i+1 : colLabel(lbl)}
                  </div>
                ) : (labelNum ? i+1 : lbl)}
              </th>
            ))}
          </tr></thead>
          <tbody>
            {labels.slice(1).map((rowL,ri) => (
              <tr key={rowL}>
                <td style={{fontSize:CF.SMALL,color:C.TEXT_2,fontFamily:FF.UI,fontWeight:FW.SEMI,
                  textAlign:"right",paddingRight:"4px",whiteSpace:"nowrap"}}>
                  {labelNum ? <><span style={{color:C.TEXT_4,marginRight:"3px"}}>{ri+2}</span>{rowL}</> : rowL}
                </td>
                {labels.slice(0,ri+1).map((colL,ci) => {
                  const val = getValue(rowL, colL);
                  return (
                    <td key={ci} style={{
                      width:CELL,height:CELL,textAlign:"center",verticalAlign:"middle",
                      background:cellBg(val),
                      fontSize:CF.SMALL,fontFamily:FF.MONO,borderRadius:CR.SM,
                      fontWeight:cellBold(val)?FW.BOLD:FW.NORM,
                      color:cellText(val)
                    }}>
                      {fmt(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
