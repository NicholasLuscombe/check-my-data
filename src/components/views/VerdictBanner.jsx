import { C, FS, FW, CR, SEV_VERDICT, MECH_COLOR } from "../../constants/tokens.js";
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

// Identity-row paired-fact register (typography system § Identity row pattern).
// Both label and value spans share family / size / weight / line-height; the
// colour split (C.TEXT_3 label, C.TEXT value) is the only differentiation.
// Left column (identityRows) and right column (settings) share this register.
const IDENTITY_ROW = { padding:"2px 0", fontSize:FS.base, lineHeight:"1.5" };

export function VerdictBanner({ severity, results, importConfig, nRows, nCols, mode, dataProfile }) {
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
  // HIGH or MOD finding. Each entry carries the worst-severity tier within
  // its category (3 = HIGH, 2 = MOD), used to colour the leading dot via
  // SEV_VERDICT (canonical severity-dot palette, same as the §1 dot row).
  // Sort: worst-first by tier, secondary by count descending within tier —
  // a screenshot crop of the strip leads with the tier that most demands
  // attention. (Pre-S133h: ordered by MECHANISM_ORDER, severity-silent.)
  const mechCounts = MECHANISM_ORDER
    .map(mk => {
      const g = groups[mk];
      const highCount = g?.highCount || 0;
      const modCount = g?.modCount || 0;
      const n = highCount + modCount;
      if (n === 0) return null;
      return { mk, n, tier: highCount > 0 ? 3 : 2 };
    })
    .filter(Boolean)
    .sort((a, b) => (b.tier - a.tier) || (b.n - a.n));

  return (
    <div style={{border:`2px solid ${v.color}`,borderRadius:CR.XL,overflow:"hidden"}}>
      {/* Main verdict — coloured header. S138 (Phase C.2): body padding
          unified to 22px (typography system § Phase C VerdictBanner
          instructions). */}
      <div style={{background:v.bg,padding:"22px"}}>
        {/* Row: headline left, severity dots right.
            S138: headline at FS.xl (32px) Bold tier — the typography system's
            verdict-headline register. lineHeight 1.2 retained from S133h. */}
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:FS.xl,fontWeight:FW.BOLD,color:v.color,lineHeight:"1.2"}}>{v.headline}</div>
          </div>
          {/* Severity dots — active filled, inactive grey. Dot fill pattern
              + tier colour carry the severity signal; the tier word that
              previously sat to the right retired in S133h FIX3 (redundant
              with headline naming severity in plain English on every tier). */}
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
          </div>
        </div>

        {/* Action one-liner — mode-agnostic ladder from VERDICT_TEXT.sub.
            Renders at all four severity levels (the screenshot of a clean
            verdict is a valid Bik-grade artefact too). Post-S133h FIX2 the
            sub is always non-empty across tiers; conditional retained as
            defensive only for hypothetical future tiers.
            S138: register is `base Regular C.TEXT_2` — verdict-sub row of
            the typography system register inventory. */}
        <div style={{fontSize:FS.base,color:C.TEXT_2,marginTop:"8px",lineHeight:"1.5"}}>
          {v.sub}
        </div>

        {/* Mechanism-count strip — one entry per flagged category, sorted
            worst-severity first. Each entry leads with a severity dot
            (canonical SEV_VERDICT colours, same render as §1 dot row above)
            coloured by the worst-severity finding within that category, so
            the strip carries severity alongside count and label.
            S138: outer + label at `base Regular C.TEXT_2`. Numeral keeps
            MECH_COLOR + FW.SEMI — documented exception to the typography
            system's "mechanism colours = chip stripes only" rule, since the
            count-strip is chip-adjacent and the colour carries category
            information that reads alongside the leading severity dot.
            Renders only at severity ≥ 1. */}
        {severity >= 1 && mechCounts.length > 0 && (
          <div style={{fontSize:FS.base,color:C.TEXT_2,marginTop:"8px",lineHeight:"1.5",display:"flex",flexWrap:"wrap",gap:"4px 6px",alignItems:"center"}}>
            {mechCounts.map(({mk, n, tier}, i) => {
              const dotColor = SEV_VERDICT[tier].color;
              return (
                <span key={mk} style={{whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:"6px"}}>
                  <span style={{
                    display:"inline-block",width:10,height:10,borderRadius:"50%",
                    background:dotColor,
                    border:`1.5px solid ${dotColor}`,
                    flexShrink:0,
                  }}/>
                  {/* MECH_COLOR exception — see comment above. */}
                  <span style={{color:MECH_COLOR[mk],fontWeight:FW.SEMI}}>{n}</span>
                  <span>{MECHANISM_STRIP_LABEL[mk] || MECHANISMS[mk]?.label || mk}</span>
                  {i < mechCounts.length - 1 && <span style={{color:C.TEXT_3,marginLeft:"4px"}}>·</span>}
                </span>
              );
            })}
          </div>
        )}

        {/* False-positive context — renders only at severity 1 or 2. The 1–2
            expected-false-positives figure comes from {nApplicable} tests at
            ALPHA.FLAG = 0.01 (≈ 0.28-test expected at 28 applicable tests).
            Severity 0 needs no context (no flags); severity 3 supersedes
            (the count itself rules out chance-only explanation).
            S138: promoted to footnote register `sm Regular C.TEXT_2` — the
            9px / C.TEXT_3 register pre-S138 undersold the claim. */}
        {(severity === 1 || severity === 2) && (
          <div style={{fontSize:FS.sm,color:C.TEXT_2,marginTop:"6px",lineHeight:"1.5"}}>
            {severity === 1
              ? <>With {nApplicable} tests applied, 1–2 flags by chance would be expected even on clean data — this dataset showed {K}.</>
              : <>With {nApplicable} tests applied, 1–2 flags by chance would be expected even on clean data — this dataset showed {K}, suggesting genuine signal.</>}
          </div>
        )}
      </div>
      {/* Data profile — neutral background body, two-column grid with
          a vertical hairline divider between columns.
          S138 + S138-fix1: both columns render the identity-row paired-
          fact register — base Regular sans, label C.TEXT_3 + value
          C.TEXT colour split per typography system. The colon between
          label and value sits in the JSX template, not the data; both
          columns share the same span-pair structure. Per-row tokens
          (padding, size, line-height) are byte-identical between
          columns so rows sit at the same vertical positions and the
          divider reads as a clean rule between two parallel content
          stacks. */}
      {dataProfile && dataProfile.identityRows && dataProfile.identityRows.length > 0 && (
        <div style={{
          padding:"10px 16px",
          borderTop:`1px solid ${C.BORDER_L}`,
          background:C.WHITE,
          display:"grid",
          gridTemplateColumns:"1fr 1fr",
          gap:"4px 0",
        }}>
          <div style={{paddingRight:"12px",borderRight:`1px solid ${C.BORDER_L}`}}>
            {dataProfile.identityRows.map(([label, value], i) => (
              <div key={i} style={IDENTITY_ROW}>
                <span style={{color:C.TEXT_3}}>{label}: </span>
                <span style={{color:C.TEXT}}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{paddingLeft:"12px"}}>
            {(dataProfile.settings || []).map(({ label, value }, i) => (
              <div key={i} style={IDENTITY_ROW}>
                <span style={{color:C.TEXT_3}}>{label}: </span>
                <span style={{color:C.TEXT}}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Reference-convention note — centred below the two-column body,
          tier-invariant frame-setting statement for the whole report.
          No divider line above (whitespace only).
          S138: footnote register `sm Regular C.TEXT_2` — pre-S138 was at
          the body register (TF.BODY / C.TEXT) which over-stated a quietly
          tier-invariant convention statement. */}
      <div style={{padding:"8px 16px 10px",background:C.WHITE,textAlign:"center"}}>
        <span style={{fontSize:FS.sm,fontWeight:FW.NORM,color:C.TEXT_2}}>Row numbers and column labels are displayed as in uploaded file</span>
      </div>
    </div>
  );
}
