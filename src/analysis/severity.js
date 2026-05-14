// ── Severity & Applicability ─────────────────────────────────────────
// Extracted from App.jsx — pure functions.

import { TEST_MECHANISM } from "../constants/mechanisms.js";

export function computeSeverity(results) {
  const high=results.filter(r=>r.flag==="HIGH").length;
  const mod=results.filter(r=>r.flag==="MODERATE").length;
  // Mechanism-category keys (copied/digits/shapes/replicate/group) are 1:1 with
  // the five METHODOLOGY-MAP dimensions — this Set is the cross-dimension diversity count.
  // Test-emitted r.category is stale (structural/distributional/etc.) — use TEST_MECHANISM mapping.
  const flaggedDimensions=new Set(results.filter(r=>r.flag==="HIGH"||r.flag==="MODERATE").map(r=>TEST_MECHANISM[r.name]||r.category));
  const nFlaggedDimensions=flaggedDimensions.size;
  // 0=clean, 1=minor flags, 2=single anomaly, 3=multiple anomalies
  const severity=high>=3?3:
    high>=2?3:
    (high>=1&&nFlaggedDimensions>=2)?3:
    high>=1?2:
    (mod>=2&&nFlaggedDimensions>=2)?3:  // 2+ MODs cross-dimension
    mod>=3?1:
    mod>=1?1:0;
  return { severity, high, mod, nFlaggedDimensions };
}

export function getApplicabilityTests(s, colRel) {
  const isCond = colRel === 'conditions';
  // In conditions mode: replicate-comparison tests are N/A, cross-condition tests
  // use columns as conditions (nDC columns = nDC conditions).
  const xCondOk = isCond ? s.nDC >= 2 : s.nC >= 2; // cross-condition minimum
  // fam values match MECHANISM_ORDER keys from mechanisms.js (S95 Track C).
  return [
    // Copy, paste, edit (Dim I)
    {name:"Duplicate detection",    fam:"copied",    ok:s.nDC>=2},
    {name:"Constant-offset blocks", fam:"copied",    ok:!isCond&&s.nDC>=2&&s.nR>=4},
    {name:"Residual spike corr.",   fam:"copied",    ok:!isCond&&s.nC>=2&&s.nR>=10},
    // Unusual digits (Dim II)
    {name:"Terminal digit",         fam:"digits",    ok:s.total>=50},
    {name:"Benford first digit",    fam:"digits",    ok:s.total>=100&&(s.span||0)>=1.0},
    {name:"Benford second digit",   fam:"digits",    ok:s.total>=100&&(s.span||0)>=1.0},
    {name:"Decimal precision",      fam:"digits",    ok:s.total>=30&&s.intF<0.9},
    {name:"Value-frequency spike",  fam:"digits",    ok:s.total>=30},
    // Distribution shapes (Dim V)
    {name:"Entropy / Zipf",         fam:"shapes",    ok:s.nDC>=1&&s.nR>=20},
    {name:"Column goodness-of-fit", fam:"shapes",    ok:s.nDC>=1&&s.nR>=30},
    {name:"Modality",               fam:"shapes",    ok:s.nDC>=1&&s.nR>=50},
    // Cross-replicate comparisons (Dim III)
    {name:"Inter-replicate corr.",  fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=10},
    {name:"Autocorrelation",        fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=10},
    {name:"Windowed autocorrelation",fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=30},
    {name:"Excess kurtosis",        fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=20},
    {name:"Runs test",              fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=10},
    {name:"Noise scaling",          fam:"replicate", ok:!isCond&&s.nR>=5&&s.nDC>=3},
    {name:"Within-row variance",    fam:"replicate", ok:!isCond&&s.nDC>=3&&s.nR>=40},
    {name:"Column noise dist.",     fam:"replicate", ok:!isCond&&s.nDC>=3&&s.nR>=10},
    {name:"LOESS residual",         fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=30},
    {name:"Row-mean runs",          fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=10&&s.condSource==="row"},
    {name:"Regional noise",         fam:"replicate", ok:!isCond&&s.nDC>=3&&s.nR>=20},
    {name:"Mahalanobis row outlier",fam:"replicate", ok:!isCond&&s.nDC>=3&&s.nR>=3*s.nDC},
    {name:"Blocked Mahalanobis",    fam:"replicate", ok:!isCond&&s.nDC>=3&&s.nR>=60},
    {name:"Missing data pattern",   fam:"replicate", ok:s.nDC>=2&&s.nR>=10}, // interim (S95)
    // Cross-group comparisons (Dim IV)
    {name:"Cross-cond. rank corr.", fam:"group",     ok:xCondOk&&s.nR>=10},
    {name:"Baseline balance",       fam:"group",     ok:isCond?(s.nDC>=5):(s.nC>=2&&s.nR>=10)},
    {name:"Cross-cond. consistency",fam:"group",     ok:xCondOk&&s.total>=60}, // ≥2 conditions × ≥30 values per cond (P1/P2/P3 minN)
  ];
}
