/* ── Role inference & assay plausibility ─────────────────────────── */

// Minimum rows before the group-attribute pass runs (V1X §2.8). Group
// attributes are a property of long, grouped tables — field surveys, repeated
// measures. Small wide-format replicate files have no grouping key, so the pass
// would only add cost and false-exclusion risk. Below this the roles come
// straight from per-column inference.
const MIN_ROWS_FOR_GROUPING = 50;

// A grouping column may not partition the rows too finely. If its distinct-value
// count exceeds half the row count its levels average fewer than two rows, and
// it reads as an identifier or a measurement, not a grouping key. This is the
// "materially smaller than the row count" clause.
const MAX_LEVEL_FRACTION = 0.5;

// A grouping key's levels must hold more than one row on average. A level of one
// row cannot test constancy — "constant within the level" is vacuously true, so
// every measurement is held out and real data columns are dropped. The S325
// level-size census pinned the threshold against the whole corpus: every false
// holdout has a median level size of 1, C20's legitimate Taxa key sits at 3, and
// no key sits at 2. Below this, the candidate is not a grouping key.
export const MIN_LEVEL_SIZE = 2;

export function inferRoles(data,hdrs,condPerCol) {
  return applyGroupAttributes(data, inferBaseRoles(data,hdrs,condPerCol));
}

// Per-column base role inference — the 40-row sample and header-keyword pass
// that runs before group-attribute recognition. Split out from inferRoles so
// the audit harness can show the roles as they stood before §2.8 re-roled any
// column. Behaviour is unchanged: inferRoles is exactly the base pass followed
// by applyGroupAttributes, as before.
export function inferBaseRoles(data,hdrs,condPerCol) {
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

// ── Group-attribute recognition (V1X §2.8) ───────────────────────────
// A group attribute is a numeric column constant within every level of some
// grouping column: a site's latitude, a subject's age, a batch's date. It
// repeats across the rows of its group by construction, so every test that
// reads repetition as a signal fires on it — and a genuine finding can be
// buried under that noise. The engine has no notion of grouping.
//
// The grouping column is not named in the data — in the real cases nothing is
// tagged 'condition'; the site key, its latitude, and the measurement are all
// 'data'. So the grouping column is inferred structurally, never by header
// keyword (keyword matching is the shortcut that misclassifies non-English or
// differently-named columns):
//   1. it partitions the rows into levels, materially fewer than the row count;
//   2. at least one OTHER numeric data column is constant within every one of
//      its levels while varying between them.
// Clause 2 is self-validating: a column is a grouping column only if something
// is constant within it. When no column qualifies, nothing is re-roled and the
// tool behaves exactly as before. That safe fallback is what lets the pass run
// in batch, where there is no human to override it.
//
// Detected attributes are re-roled 'attribute'. They then fall out of the
// analysis matrix at the engine's single dataCols line (role === "data"), which
// removes them from the whole battery at once. The exclusion is blunt on
// purpose: a site attribute is not a measurement of the row under any test.
//
// detectGroupAttributes returns both the re-roled array and the provenance —
// one entry per grouping column that produced an exclusion, naming the columns
// held constant within it. The provenance is what makes a corpus run auditable:
// "column 17 was excluded because it is constant within the 50 levels of column
// 3." applyGroupAttributes is the thin wrapper the engine path uses; it returns
// only the roles, byte-identical to before this split.
export function applyGroupAttributes(data, roles) {
  return detectGroupAttributes(data, roles).roles;
}

export function detectGroupAttributes(data, roles) {
  const nRows = data.length;
  const nCols = roles.length;
  if (nRows < MIN_ROWS_FOR_GROUPING || nCols < 2) return { roles, groupings: [] };

  // Parse every cell once. num[c][r] is the numeric value or null; key[c][r] is
  // the raw trimmed string used as a level label (any column, numeric or text,
  // can serve as a grouping key).
  const num = Array.from({ length: nCols }, () => new Array(nRows).fill(null));
  const key = Array.from({ length: nCols }, () => new Array(nRows).fill(null));
  for (let r = 0; r < nRows; r++) {
    const row = data[r];
    if (!row) continue;
    for (let c = 0; c < nCols; c++) {
      const v = row[c];
      if (v == null || v === "") continue;
      const s = String(v).trim();
      key[c][r] = s;
      const n = Number(s);
      if (!isNaN(n)) num[c][r] = n;
    }
  }

  // Distinct level counts per column. Bounds which columns can be grouping keys,
  // and confirms an attribute candidate actually varies — a globally constant
  // column is not evidence of grouping and is left alone.
  const distinct = key.map(col => {
    const set = new Set();
    for (const v of col) if (v != null) set.add(v);
    return set.size;
  });

  // Attribute candidates: columns currently entering the matrix (role 'data')
  // that hold at least two distinct values.
  const attrCand = [];
  for (let c = 0; c < nCols; c++) {
    if (roles[c] === "data" && distinct[c] >= 2) attrCand.push(c);
  }
  if (!attrCand.length) return { roles, groupings: [] };

  const maxLevels = Math.floor(nRows * MAX_LEVEL_FRACTION);
  const isAttribute = new Array(nCols).fill(false);
  const groupings = []; // provenance: { groupCol, nLevels, attrCols[] } per grouping column that excluded something

  for (let g = 0; g < nCols; g++) {
    if (roles[g] === "ignore") continue;
    const nLevels = distinct[g];
    if (nLevels < 2 || nLevels > maxLevels) continue;

    // Minimum level size (S325). Count the rows in each level exactly as the
    // constancy walk below sees them — grouped by the non-null key value, with
    // null-key rows skipped (they are not a level). A key whose median level
    // holds fewer than MIN_LEVEL_SIZE rows is not a grouping key.
    const levelSizes = new Map();
    for (let r = 0; r < nRows; r++) {
      const gv = key[g][r];
      if (gv == null) continue;
      levelSizes.set(gv, (levelSizes.get(gv) || 0) + 1);
    }
    const sizes = [...levelSizes.values()].sort((a, b) => a - b);
    const mid = sizes.length >> 1;
    const medLevel = sizes.length % 2 ? sizes[mid] : (sizes[mid - 1] + sizes[mid]) / 2;
    if (medLevel < MIN_LEVEL_SIZE) continue;

    // Test each attribute candidate for constancy within every level of g. A
    // candidate stays consistent until some level shows it two different
    // values. A column is never its own attribute.
    const consistent = attrCand.map(c => c !== g);
    let liveCount = consistent.reduce((a, b) => a + (b ? 1 : 0), 0);
    if (!liveCount) continue;

    const firstByLevel = new Map(); // levelKey -> per-candidate first value seen
    for (let r = 0; r < nRows && liveCount > 0; r++) {
      const gv = key[g][r];
      if (gv == null) continue;
      let firsts = firstByLevel.get(gv);
      if (!firsts) { firsts = new Array(attrCand.length).fill(undefined); firstByLevel.set(gv, firsts); }
      for (let a = 0; a < attrCand.length; a++) {
        if (!consistent[a]) continue;
        const val = num[attrCand[a]][r];
        if (val == null) continue; // null is vacuously consistent
        const first = firsts[a];
        if (first === undefined) firsts[a] = val;
        else if (first !== val) { consistent[a] = false; liveCount--; }
      }
    }

    // Mark every column that stayed constant within g's levels. Marking only
    // happens when such a column exists, so clause 2 is satisfied by
    // construction. The union across all grouping columns catches
    // mutually-constant pairs — latitude constant within longitude's levels and
    // longitude constant within latitude's.
    const attrCols = [];
    for (let a = 0; a < attrCand.length; a++) {
      if (consistent[a]) { isAttribute[attrCand[a]] = true; attrCols.push(attrCand[a]); }
    }
    if (attrCols.length) groupings.push({ groupCol: g, nLevels, attrCols });
  }

  if (!isAttribute.some(Boolean)) return { roles, groupings };
  return { roles: roles.map((r, c) => isAttribute[c] ? "attribute" : r), groupings };
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
