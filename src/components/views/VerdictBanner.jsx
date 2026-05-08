import { C, TF, FW, CR, SEV_VERDICT, MECH_COLOR } from "../../constants/tokens.js";
import { MECHANISMS, MECHANISM_ORDER } from "../../constants/mechanisms.js";
import { VERDICT_TEXT } from "../../analysis/narrative.js";
import { buildMechanismGroups } from "../../analysis/localization.js";
import { SEVERITY_TEXT } from "../../constants/guidance.js";

// Compact plain-English category labels for the mechanism-count strip.
// MECHANISMS[mk].label carries the longer dimension titles used in §3 dimension
// headers ("Cross-Replicate Comparisons" etc.); the strip needs shorter forms
// that read as a horizontal one-line summary.
const MECHANISM_STRIP_LABEL = {
  copied:    "Copy or duplication",
  digits:    "Digit pattern",
  shapes:    "Distribution shape",
  replicate: "Replicate inconsistency",
  group:     "Cross-group pattern",
};

const SEVERITY_WORD = ["Clean", "Low", "Medium", "High"];

export function VerdictBanner({ severity, results, importConfig, nRows, nCols, narrative, mode, dataProfile }) {
  const vFull = VERDICT_TEXT[severity] || VERDICT_TEXT[0];
  // Headline differentiates voice per mode (QC / Review). Forensics ('full')
  // falls through to VERDICT_TEXT. The action one-liner (`vFull.sub`) is
  // mode-agnostic and rendered uniformly across all three modes.
  const modeText = (mode && mode !== "full" && SEVERITY_TEXT[mode]) ? SEVERITY_TEXT[mode][severity] : null;
  const v = modeText ? { ...vFull, headline: modeText.headline } : vFull;
  const groups = buildMechanismGroups(results);
  const nApplicable = results.filter(r => r.flag !== "N/A").length;
  // K = HIGH + MOD count; LOW excluded to match the chip-layer CLEAR-collapse
  // rule (S126b: chips emit at HIGH/MOD only).
  const K = results.filter(r => r.flag === "HIGH" || r.flag === "MODERATE").length;

  // Mechanism-count strip entries — one per category with at least one
  // HIGH or MOD finding, ordered by MECHANISM_ORDER.
  const mechCounts = MECHANISM_ORDER
    .map(mk => ({ mk, n: (groups[mk]?.highCount || 0) + (groups[mk]?.modCount || 0) }))
    .filter(x => x.n > 0);

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
              {SEVERITY_WORD[severity]}
            </span>
          </div>
        </div>

        {/* Action one-liner — mode-agnostic ladder from VERDICT_TEXT.sub.
            Renders at all four severity levels (the screenshot of a clean
            verdict is a valid Bik-grade artefact too). */}
        {v.sub && (
          <div style={{fontSize:TF.BODY,color:C.TEXT_2,marginTop:"8px",lineHeight:"1.5"}}>
            {v.sub}
          </div>
        )}

        {/* Mechanism-count strip — one entry per flagged category, numerals
            coloured by mechanism per MECH_COLOR. Renders only at severity ≥ 1. */}
        {severity >= 1 && mechCounts.length > 0 && (
          <div style={{fontSize:TF.BODY,color:C.TEXT_2,marginTop:"8px",lineHeight:"1.5",display:"flex",flexWrap:"wrap",gap:"4px 6px",alignItems:"baseline"}}>
            {mechCounts.map(({mk, n}, i) => (
              <span key={mk} style={{whiteSpace:"nowrap"}}>
                <span style={{color:MECH_COLOR[mk],fontWeight:FW.SEMI}}>{n}</span>
                {" "}
                <span>{MECHANISM_STRIP_LABEL[mk] || MECHANISMS[mk]?.label || mk}</span>
                {i < mechCounts.length - 1 && <span style={{color:C.TEXT_4,marginLeft:"6px"}}>·</span>}
              </span>
            ))}
          </div>
        )}

        {/* False-positive context — renders only at severity 1 or 2. The 1–2
            expected-false-positives figure comes from {nApplicable} tests at
            ALPHA.FLAG = 0.01 (≈ 0.28-test expected at 28 applicable tests).
            Severity 0 needs no context (no flags); severity 3 supersedes
            (the count itself rules out chance-only explanation). */}
        {(severity === 1 || severity === 2) && (
          <div style={{fontSize:TF.SMALL,color:C.TEXT_3,marginTop:"6px",lineHeight:"1.5"}}>
            {severity === 1
              ? <>With {nApplicable} tests applied, 1–2 flags by chance would be expected even on clean data — this dataset showed {K}.</>
              : <>With {nApplicable} tests applied, 1–2 flags by chance would be expected even on clean data — this dataset showed {K}, suggesting genuine signal.</>}
          </div>
        )}
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
