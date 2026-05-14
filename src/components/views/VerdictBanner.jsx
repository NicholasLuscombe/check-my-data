import { C, FS, FW, CR, SEV_VERDICT } from "../../constants/tokens.js";
import { MECHANISMS, MECHANISM_ORDER } from "../../constants/mechanisms.js";
import { VERDICT_TEXT } from "../../analysis/narrative.js";
import { buildMechanismGroups } from "../../analysis/localization.js";
import { SEVERITY_TEXT } from "../../constants/guidance.js";

// Identity-row paired-fact register (typography system § Identity row pattern).
// Both label and value spans share family / size / weight / line-height; the
// colour split (C.TEXT_3 label, C.TEXT value) is the only differentiation.
// Left column (identityRows) and right column (settings) share this register.
const IDENTITY_ROW = { padding:"2px 0", fontSize:FS.base, lineHeight:"1.5" };

// Column title — sits at the top of each two-column-body column, signalling
// the purpose of the stack below ("Dataset properties" / "Data import
// settings"). Sub-heading register (md Semibold C.TEXT) — same tuple as
// the test card title role; matches site-wide "headings are larger-or-
// equal than the rows they organise" pattern. S138-fix4 promoted from
// the fix3 sm Semibold landing (smaller than the base-size rows below,
// inverting hierarchy) to the canonical md Semibold sub-heading slot.
const COLUMN_TITLE = { fontSize:FS.md, fontWeight:FW.SEMI, color:C.TEXT, marginBottom:"8px" };

// Oxford-comma join. Used by the action-sub count sentence to list §3
// category names when severity > 0.
function joinCategories(cats) {
  if (cats.length === 0) return "";
  if (cats.length === 1) return cats[0];
  if (cats.length === 2) return `${cats[0]} and ${cats[1]}`;
  return `${cats.slice(0, -1).join(", ")}, and ${cats[cats.length - 1]}`;
}

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

  // Flagged §3 category names in MECHANISM_ORDER concreteness order —
  // canonical "Copy, paste, edit" / "Unusual digits" / "Distribution
  // shapes" / "Cross-replicate comparisons" / "Cross-group comparisons"
  // labels from `MECHANISMS[mk].label`. Drives the action-sub count
  // sentence on severity > 0. Restores §1↔§3 vocabulary parity — the
  // pre-fix2 count strip carried a parallel mechanism taxonomy with
  // shorter labels that didn't match §3 headers.
  const flaggedCategories = MECHANISM_ORDER
    .filter(mk => {
      const g = groups[mk];
      return ((g?.highCount || 0) + (g?.modCount || 0)) > 0;
    })
    .map(mk => MECHANISMS[mk].label);

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

        {/* Action one-liner — mode-agnostic ladder from VERDICT_TEXT.sub
            (e.g. "Investigate dataset before proceeding") with a count
            sentence appended on severity > 0: "<actionText>. K tests
            flagged across <category-list>." Category list reads §3
            category names in MECHANISM_ORDER concreteness order with
            Oxford-comma join. Single register throughout — no in-paragraph
            weight or colour accents; the verdict headline above carries
            the visual emphasis. Pre-fix2 a separate count strip carried
            mech-coloured numerals + a parallel taxonomy; S138-fix2
            retired the strip and folded the summary here to restore
            §1↔§3 vocabulary parity.
            Register: `base Regular C.TEXT_2`. */}
        <div style={{fontSize:FS.base,color:C.TEXT_2,marginTop:"8px",lineHeight:"1.5"}}>
          {v.sub}
          {severity > 0 && flaggedCategories.length > 0 && (
            <>. {K} test{K === 1 ? "" : "s"} flagged across {joinCategories(flaggedCategories)}.</>
          )}
        </div>

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
          stacks.
          S138-fix2: column titles ("Dataset properties" / "Data import
          settings") added at the top of each column to signal the
          right column's purpose as user-revisable import settings.
          Titles render unconditionally on any severity. */}
      {dataProfile && dataProfile.identityRows && dataProfile.identityRows.length > 0 && (
        <div style={{
          padding:"10px 16px",
          borderTop:`1px solid ${C.BORDER_L}`,
          background:C.WHITE,
          display:"grid",
          // S138-fix3: 60/40 left-heavier split (was 1fr 1fr). Left column
          // holds compound nouns ("Western Blot Densitometry") that wrap
          // mid-name at 50/50; right column holds atomic value strings with
          // slack to spare. Vertical divider follows the new split point.
          gridTemplateColumns:"3fr 2fr",
          gap:"4px 0",
        }}>
          <div style={{paddingRight:"12px",borderRight:`1px solid ${C.BORDER_L}`}}>
            <div style={COLUMN_TITLE}>Dataset properties</div>
            {dataProfile.identityRows.map(([label, value], i) => (
              <div key={i} style={IDENTITY_ROW}>
                <span style={{color:C.TEXT_3}}>{label}: </span>
                <span style={{color:C.TEXT}}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{paddingLeft:"12px"}}>
            <div style={COLUMN_TITLE}>Data import settings</div>
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
          S138-fix2: demoted to fine-print register `xs Regular C.TEXT_3`
          per TYPOGRAPHY-SYSTEM.md § Register inventory. Pre-fix2 was at
          the footnote register (sm / C.TEXT_2) which over-stated a
          one-time disclosure. */}
      <div style={{padding:"8px 16px 10px",background:C.WHITE,textAlign:"center"}}>
        <span style={{fontSize:FS.xs,fontWeight:FW.NORM,color:C.TEXT_3}}>Row numbers and column labels are displayed as in uploaded file</span>
      </div>
    </div>
  );
}
