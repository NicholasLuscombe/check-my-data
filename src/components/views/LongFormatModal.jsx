import React, { useState } from "react";
import { C, FF, FW, TF, CR, CC, UI, ACCENT } from "../../constants/tokens.js";
import { FLAG_STYLES } from "../../constants/thresholds.js";
import { LONG_FORMAT_EXPLAINER } from "../../constants/descriptions.js";

export function LongFormatModal({ detection, headers, onConfirm, onDismiss }) {
  const [measureCol, setMeasureCol] = useState(detection.primaryMeasureCol.ci);
  const [condCol, setCondCol] = useState(detection.primaryCondCol.ci);
  const [idCol, setIdCol] = useState(null);

  const activeCond = detection.condCandidates.find(c => c.ci === condCol) || detection.primaryCondCol;
  const activeId = idCol != null ? detection.idCandidates.find(c => c.ci === idCol) : null;
  const nConds = activeCond.nUniq;
  const nRows = detection.primaryMeasureCol.vals.length;
  const estimatedRows = Math.round(nRows / nConds);
  const previewRows = activeId ? activeId.nUniq : estimatedRows;
  const condNamesPreview = activeCond.uniqVals.slice(0, 4).join(", ") + (activeCond.nUniq > 4 ? ", \u2026" : "");

  // Assay-aware column hints — keyed on lowercase column name patterns
  const COLUMN_HINTS = {
    // qPCR primary
    ct: "⭐ Primary — Ct/Cq cycle threshold, main measurement column",
    cq: "⭐ Primary — Cq cycle threshold, main measurement column",
    // qPCR secondary
    tm1: "Secondary — Melt curve peak 1, instrument QC",
    tm2: "Secondary — Melt curve peak 2, instrument QC",
    tm:  "Secondary — Melting temperature, instrument QC",
    eff: "Secondary — Amplification efficiency, instrument QC",
    efficiency: "Secondary — Amplification efficiency, instrument QC",
    cpd1: "Secondary — Cp/Cq derivative peak 1",
    cpd2: "Secondary — Cp/Cq derivative peak 2",
    // Generic
    od: "⭐ Primary — Optical density measurement",
    absorbance: "⭐ Primary — Absorbance measurement",
    fluorescence: "⭐ Primary — Fluorescence intensity",
    rfu: "⭐ Primary — Relative fluorescence units",
    intensity: "⭐ Primary — Signal intensity",
    count: "Primary — Count measurement",
  };
  function getHint(colName) {
    const k = String(colName).toLowerCase().replace(/[^a-z0-9]/g,"");
    return COLUMN_HINTS[k] || null;
  }

  const iB = { padding:"10px", border:"none", borderRadius:CR.LG, fontSize:TF.BODY, fontWeight:FW.BOLD, cursor:"pointer", fontFamily:FF.UI };
  const sB = { display:"block", fontSize:TF.BODY, fontWeight:FW.SEMI, color:C.TEXT, marginBottom:"4px", fontFamily:FF.UI };
  const sel = { width:"100%", padding:"7px 10px", border:`1px solid ${C.BORDER}`, borderRadius:CR.MD, fontSize:TF.BODY, fontFamily:FF.UI };

  const activeHint = getHint(detection.measureCandidates.find(c=>c.ci===measureCol)?.h || "");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.WHITE,borderRadius:CR.XL,padding:"28px 32px",maxWidth:"520px",width:"94%",boxShadow:"0 8px 40px rgba(0,0,0,0.18)",fontFamily:FF.UI}}>
        <div style={{fontSize:TF.TITLE,fontWeight:FW.BOLD,color:C.TEXT,marginBottom:"6px"}}>Long-format data detected</div>
        <div style={{fontSize:TF.BODY,color:C.TEXT_2,marginBottom:"20px",lineHeight:1.55}}>
          {LONG_FORMAT_EXPLAINER.map((p, i) => (
            <p key={i} style={{margin: i === LONG_FORMAT_EXPLAINER.length - 1 ? 0 : "0 0 8px"}}>{p}</p>
          ))}
        </div>

        <div style={{marginBottom:"4px"}}>
          <label style={sB}>Which column holds your data values? <span style={{fontWeight:FW.NORM,color:C.TEXT_3}}>(required)</span></label>
          <select value={measureCol} onChange={e=>setMeasureCol(Number(e.target.value))} style={sel}>
            {detection.measureCandidates.map(c=>{
              const hint = getHint(c.h);
              const isPrimary = hint?.startsWith("⭐");
              return (
                <option key={c.ci} value={c.ci}>
                  {c.h}{hint ? ` — ${hint.replace("⭐ ","").split(" — ")[0]}` : ` (${c.nUniq} unique values)`}
                </option>
              );
            })}
          </select>
        </div>
        {activeHint && (
          <div style={{fontSize:TF.DETAIL,color:activeHint.startsWith("⭐")?FLAG_STYLES.LOW.text:C.TEXT_3,background:activeHint.startsWith("⭐")?FLAG_STYLES.LOW.bg:C.BG,border:`1px solid ${activeHint.startsWith("⭐")?FLAG_STYLES.LOW.border:C.BORDER_L}`,borderRadius:CR.MD,padding:"5px 10px",marginBottom:"14px"}}>
            {activeHint}
          </div>
        )}
        {!activeHint && <div style={{marginBottom:"14px"}}/>}

        <div style={{marginBottom:"14px"}}>
          <label style={sB}>Which column tells you which condition each row is in? <span style={{fontWeight:FW.NORM,color:C.TEXT_3}}>(required)</span></label>
          <select value={condCol} onChange={e=>setCondCol(Number(e.target.value))} style={sel}>
            {detection.condCandidates.map(c=>(
              <option key={c.ci} value={c.ci}>{c.h} ({c.nUniq} groups: {c.uniqVals.slice(0,4).join(", ")}{c.nUniq>4?"…":""})</option>
            ))}
          </select>
        </div>

        <div style={{marginBottom:"20px"}}>
          <label style={sB}>Which column identifies which subject or sample each row belongs to? <span style={{fontWeight:FW.NORM,color:C.TEXT_3}}>(optional — only needed for paired designs)</span></label>
          <select value={idCol??""} onChange={e=>setIdCol(e.target.value===""?null:Number(e.target.value))}
            style={{...sel, border:`1px solid ${C.BORDER}`, outline:"none", boxShadow:"none"}}>
            <option value="">— none —</option>
            {detection.idCandidates.map(c=>(
              <option key={c.ci} value={c.ci}>{c.h} ({c.nUniq} unique)</option>
            ))}
          </select>
        </div>

        <div style={{background:UI.INFO.bg,border:`1px solid ${ACCENT.BLUE.border}`,borderRadius:CR.MD,padding:"8px 12px",fontSize:TF.BODY,color:CC.OBS,marginBottom:"20px"}}>
          After pivoting, your data will have about <strong>{previewRows}</strong> rows{idCol!=null?" (one per subject)":""} and <strong>{nConds}</strong> condition column{nConds===1?"":"s"} (<strong>{condNamesPreview}</strong>), each holding measurement values.
        </div>

        <div style={{display:"flex",gap:"10px"}}>
          <button onClick={()=>onConfirm({measureCol,condCol,idCol})} style={{...iB,flex:1,background:CC.OBS,color:C.WHITE}}>
            Pivot data from long-format to wide format
          </button>
          <button onClick={onDismiss} style={{...iB,padding:"10px 18px",background:C.WHITE,border:`1px solid ${C.BORDER}`,color:C.TEXT_2,fontWeight:FW.NORM}}>
            Leave data as-is
          </button>
        </div>
      </div>
    </div>
  );
}
