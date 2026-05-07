/* ── Role inference & assay plausibility ─────────────────────────── */

export function inferRoles(data,hdrs,condPerCol) {
  return hdrs.map((h,c)=>{
    const sample=data.slice(0,40).map(r=>r[c]).filter(v=>v!=null&&v!=="");
    if(!sample.length) return "ignore";
    const nf=sample.filter(v=>!isNaN(Number(v))).length/sample.length;
    if(nf<0.5){const uniq=new Set(sample.map(String));return uniq.size<=20&&uniq.size/sample.length<0.3?"condition":"label";}
    // If condPerCol already captures condition grouping for this column (two-row header),
    // and the column is numeric, it's DATA — don't let header keywords like "Control" override.
    if(condPerCol&&condPerCol[c]&&nf>=0.5) return "data";
    if(h){const lo=String(h).toLowerCase().trim();
      if(/^(id|name|sample|subject|patient|well|row|res|residue|index|idx|num|no|n|number|#|pos|position|frame|step|time|timepoint|obs|gene|geneid|protein|accession)\b/i.test(lo)) return "label";
      if(/^(group|condition|treatment|dose|conc|ctrl|control|type|category|class|arm|genotype|strain)\b/.test(lo)) return "condition";
    }
    const nums=sample.map(Number).filter(n=>!isNaN(n));
    if(nums.length>=4&&nums.every(n=>Number.isInteger(n))){let seq=0;for(let i=1;i<nums.length;i++)if(nums[i]===nums[i-1]+1)seq++;if(seq/(nums.length-1)>0.85)return "label";}
    return "data";
  });
}
/* Assay–data plausibility check.
   Returns {level:"warn"|"info", text} when the selected assay is inconsistent
   with the data summary — a UI prompt only, not a forensic flag.
   "warn" = hard physical constraint violated; "info" = softer shape mismatch. */
export function assayPlausibilityHint(assay, sum) {
  if(!sum||assay==="general") return null;
  const {intF, mn, mx, span} = sum;
  const nonIntF = 1-(intF||0);

  if(assay==="cell_count"){
    if(mn!=null&&mn<0)
      return {level:"warn",text:"Negative values found — cell counts cannot be negative. Check for normalised or log-transformed data."};
    if(nonIntF>0.1)
      return {level:"warn",text:`${(nonIntF*100).toFixed(0)}% of values are non-integer — raw cell counts should be whole numbers. Are these normalised counts (CPM etc.) rather than raw counts?`};
  }
  if(assay==="qpcr"){
    if(intF>0.9)
      return {level:"warn",text:"Values appear to be integers — Ct values are typically reported to 2 decimal places. Check assay type."};
    if(mn!=null&&mx!=null&&(mn<5||mx>45))
      return {level:"warn",text:`Value range ${mn?.toFixed(1)}–${mx?.toFixed(1)} extends outside the physical Ct range (10–40). Values outside this range are instrument artefacts or suggest data manipulation.`};
    if((span||0)>2)
      return {level:"info",text:`Span of ${span?.toFixed(1)} orders of magnitude is unusually wide for Ct values (typically < 1.5 orders). Confirm this is not plate-reader or ELISA data.`};
  }
  if(assay==="densitometry"){
    if(mx!=null&&mx>50)
      return {level:"info",text:`Maximum value ${mx?.toFixed(1)} is high for densitometry (typically 0–5 AU normalised). Check whether these are raw pixel intensities needing normalisation.`};
    if(intF>0.9)
      return {level:"info",text:"Values appear to be integers — densitometry data is typically floating-point. Check whether these are raw pixel counts rather than normalised band intensities."};
  }
  if(assay==="elisa"){
    if(mn!=null&&mn<0)
      return {level:"warn",text:"Negative values found — ELISA concentrations cannot be negative. Check for background-subtracted or log-transformed data."};
    if((span||0)<1)
      return {level:"info",text:`Span of ${span?.toFixed(1)} orders of magnitude is narrow for ELISA data (typically ≥ 2 orders). The proportional noise model (slope ≈ 2) may not apply across this range.`};
  }
  if(assay==="plate_reader"){
    if(mx!=null&&mx>4.5)
      return {level:"info",text:`Maximum OD ${mx?.toFixed(2)} exceeds the linear range of most plate readers (typically < 3.5). High-OD values may not follow the expected noise model.`};
  }
  if(assay==="genomics"){
    if(nonIntF>0.05&&(span||0)<2)
      return {level:"info",text:"Non-integer values with narrow range — if these are normalised counts (TPM/FPKM), the negative-binomial noise model does not apply. Consider using General."};
  }
  return null;
}
