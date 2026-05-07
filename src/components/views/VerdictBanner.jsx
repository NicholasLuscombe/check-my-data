import { useState } from "react";
import { C, TF, FW, CR, CC, SIGNAL, SEV_VERDICT, UI } from "../../constants/tokens.js";
import { MECHANISMS, MECHANISM_ORDER } from "../../constants/mechanisms.js";
import { VERDICT_TEXT, buildConsultationPrompt, MECHANISM_FINDINGS } from "../../analysis/narrative.js";
import { buildMechanismGroups } from "../../analysis/localization.js";
import { SEVERITY_TEXT } from "../../constants/guidance.js";

export function VerdictBanner({ severity, results, importConfig, nRows, nCols, narrative, mode, dataProfile }) {
  const [consultCopied, setConsultCopied] = useState(false);
  const vFull = VERDICT_TEXT[severity] || VERDICT_TEXT[0];
  // Mode-specific headline/sub overrides
  const modeText = (mode && mode !== "full" && SEVERITY_TEXT[mode]) ? SEVERITY_TEXT[mode][severity] : null;
  const v = modeText ? { ...vFull, headline: modeText.headline, sub: modeText.sub } : vFull;
  const groups = buildMechanismGroups(results);
  const flaggedMechs = MECHANISM_ORDER.filter(m => groups[m].highCount > 0 || groups[m].modCount > 0);
  const nApplicable = results.filter(r => r.flag !== "N/A").length;
  const showConsult = false; // Removed: review mode now has its own category rows + "What to ask" section

  const handleConsult = async () => {
    const prompt = buildConsultationPrompt(results, importConfig, nRows, nCols, severity);
    try { await navigator.clipboard.writeText(prompt); } catch(e) {
      const ta = document.createElement("textarea"); ta.value = prompt;
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setConsultCopied(true); setTimeout(() => setConsultCopied(false), 3000);
  };

  return (
    <div style={{border:`2px solid ${v.color}`,borderRadius:CR.XL,overflow:"hidden"}}>
      {/* Main verdict — coloured header */}
      <div style={{background:v.bg,padding:"20px 16px"}}>
        {/* Row: headline left, severity dots right */}
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:TF.HERO,fontWeight:FW.BOLD,color:v.color,lineHeight:"1.2"}}>{v.headline}</div>
          </div>
          {/* Severity dots — active filled, inactive grey */}
          <div style={{display:"flex",alignItems:"center",gap:"4px",flexShrink:0}}>
            {[0,1,2,3].map(s=>{
              const active = severity === s;
              const c = SEV_VERDICT[s].color;
              return <span key={s} style={{
                display:"inline-block",width:10,height:10,borderRadius:"50%",
                background:active?c:"transparent",
                border:`1.5px solid ${c}`,
                flexShrink:0
              }}/>;
            })}
            <span style={{fontSize:TF.DETAIL,fontWeight:FW.SEMI,color:SEV_VERDICT[severity].color,letterSpacing:"0.02em",whiteSpace:"nowrap",marginLeft:"2px"}}>
              {["Clean","Low","Medium","High"][severity]}
            </span>
          </div>
        </div>

        {/* Anomaly type cards — no longer needed: all modes have their own category sections */}
        {false && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"8px",margin:"4px 0 0 0"}}>
          {MECHANISM_ORDER.map(mechKey => {
            const isFlagged = flaggedMechs.includes(mechKey);
            const mech = MECHANISMS[mechKey];
            const info = MECHANISM_FINDINGS[mechKey];
            const group = groups[mechKey];
            const handleClick = () => {
              const el = document.getElementById(`mech-${mechKey}`);
              if (el) el.scrollIntoView({behavior:"smooth",block:"start"});
            };
            return (
              <div key={mechKey} onClick={handleClick} style={{
                padding:"8px 12px",borderRadius:CR.MD,cursor:"pointer",
                background:isFlagged ? mech.color+"10" : C.BG,
                border:"1px solid "+(isFlagged ? mech.color+"44" : C.BORDER_L),
                borderLeft:"3px solid "+(isFlagged ? mech.color : C.TEXT_4),
                transition:"box-shadow 0.15s"
              }}>
                <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"3px"}}>
                  <span style={{fontSize:TF.SMALL,color:isFlagged ? mech.color : C.TEXT_4}}>{"\u25CF"}</span>
                  <span style={{fontWeight:isFlagged?700:500,color:isFlagged?mech.color:C.TEXT_3,fontSize:TF.BODY,flex:1}}>{mech.label}</span>
                  {!isFlagged && <span style={{fontSize:TF.DETAIL,color:SIGNAL.GREEN.dot,fontWeight:FW.SEMI}}>Clean</span>}
                </div>
                {isFlagged && <div style={{fontSize:TF.DETAIL,color:C.TEXT_3,lineHeight:"1.4",marginBottom:"4px"}}>{info.short}</div>}
                {/* Mini test boxes */}
                <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
                  {group.tests.filter(t=>t.flag!=="N/A").map(t=>(
                    <span key={t.name} title={t.name === "Exact Duplicate Detection" ? "Exact Duplicates" : t.name} style={{
                      display:"inline-block",width:"8px",height:"8px",borderRadius:CR.XS,
                      background:t.flag==="HIGH"?CC.THRESH:t.flag==="MODERATE"?SIGNAL.AMBER.dot:SIGNAL.GREEN.dot
                    }}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* FP context for minor results — now shown inline in review mode verdict sub text */}
        {false && (
          <p style={{color:C.TEXT_3,fontSize:TF.BODY,lineHeight:"1.5",margin:"10px 0 0 0"}}>
            With {nApplicable} applicable tests at {"\u03B1"}=0.01, expect ~{(nApplicable * 0.01).toFixed(1)} false positives by chance.
          </p>
        )}

        {/* Action buttons — only render wrapper when there are buttons */}
        {showConsult && <div style={{display:"flex",gap:"10px",marginTop:"14px",flexWrap:"wrap"}}>
          {(
            <button onClick={handleConsult} style={{padding:"8px 16px",background:consultCopied?UI.OK.bg:C.WHITE,
              border:"1px solid "+(consultCopied?UI.OK.border:C.BORDER),borderRadius:CR.MD,
              color:consultCopied?UI.OK.text:C.TEXT_2,fontSize:TF.BODY,cursor:"pointer"}}>
              {consultCopied ? "\u2713 Copied \u2014 paste this into an AI assistant together with the data file" : "Get AI help interpreting these results"}
            </button>
          )}
        </div>}
      </div>
      {/* Data profile — inside the verdict card, neutral background body */}
      {dataProfile && dataProfile.length > 0 && (
        <div style={{padding:"8px 16px",borderTop:`1px solid ${C.BORDER_L}`,background:C.WHITE}}>
          {dataProfile.map(([label, value], i) => (
            <div key={i} style={{display:"flex",gap:"12px",padding:"3px 0",fontSize:TF.BODY}}>
              <span style={{color:C.TEXT_3,minWidth:"80px",flexShrink:0}}>{label}</span>
              <span style={{color:C.TEXT}}>{value}</span>
            </div>
          ))}
        </div>
      )}
      {/* Coordinate reference note */}
      <div style={{padding:"5px 16px",borderTop:`1px solid ${C.BORDER_L}`,background:C.WHITE}}>
        <span style={{fontSize:TF.NOTE,color:C.TEXT_4}}>All row and column references match original file positions.</span>
      </div>
    </div>
  );
}
