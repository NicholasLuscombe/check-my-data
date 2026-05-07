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
    // Copy, Paste, Edit (Dim I)
    {name:"Duplicate Detection",    fam:"copied",    ok:s.nDC>=2},
    {name:"Constant-Offset Blocks", fam:"copied",    ok:!isCond&&s.nDC>=2&&s.nR>=4},
    {name:"Residual Spike Corr.",   fam:"copied",    ok:!isCond&&s.nC>=2&&s.nR>=10},
    // Unusual Digits (Dim II)
    {name:"Terminal Digit",         fam:"digits",    ok:s.total>=50},
    {name:"Benford First Digit",    fam:"digits",    ok:s.total>=100&&(s.span||0)>=1.0},
    {name:"Benford Second Digit",   fam:"digits",    ok:s.total>=100&&(s.span||0)>=1.0},
    {name:"Decimal Precision",      fam:"digits",    ok:s.total>=30&&s.intF<0.9},
    {name:"Value-Frequency Spike",  fam:"digits",    ok:s.total>=30},
    // Distribution Shapes (Dim V)
    {name:"Entropy / Zipf",         fam:"shapes",    ok:s.nDC>=1&&s.nR>=20},
    {name:"Column Goodness-of-Fit", fam:"shapes",    ok:s.nDC>=1&&s.nR>=30},
    {name:"Modality",               fam:"shapes",    ok:s.nDC>=1&&s.nR>=50},
    // Cross-Replicate Comparisons (Dim III)
    {name:"Inter-Replicate Corr.",  fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=10},
    {name:"Autocorrelation",        fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=10},
    {name:"Windowed Autocorrelation",fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=30},
    {name:"Excess Kurtosis",        fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=20},
    {name:"Runs Test",              fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=10},
    {name:"Noise Scaling",          fam:"replicate", ok:!isCond&&s.nR>=5&&s.nDC>=3},
    {name:"Within-Row Variance",    fam:"replicate", ok:!isCond&&s.nDC>=3&&s.nR>=40},
    {name:"Column Noise Dist.",     fam:"replicate", ok:!isCond&&s.nDC>=3&&s.nR>=10},
    {name:"LOESS Residual",         fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=30},
    {name:"Row-Mean Runs",          fam:"replicate", ok:!isCond&&s.nDC>=2&&s.nR>=10&&s.condSource==="row"},
    {name:"Regional Noise",         fam:"replicate", ok:!isCond&&s.nDC>=3&&s.nR>=20},
    {name:"Mahalanobis Row Outlier",fam:"replicate", ok:!isCond&&s.nDC>=3&&s.nR>=3*s.nDC},
    {name:"Blocked Mahalanobis",    fam:"replicate", ok:!isCond&&s.nDC>=3&&s.nR>=60},
    {name:"Missing Data Pattern",   fam:"replicate", ok:s.nDC>=2&&s.nR>=10}, // interim (S95)
    // Cross-Group Comparisons (Dim IV)
    {name:"Cross-Cond. Rank Corr.", fam:"group",     ok:xCondOk&&s.nR>=10},
    {name:"Baseline Balance",       fam:"group",     ok:isCond?(s.nDC>=5):(s.nC>=2&&s.nR>=10)},
    {name:"Cross-Cond. Consistency",fam:"group",     ok:xCondOk&&s.total>=60}, // ≥2 conditions × ≥30 values per cond (P1/P2/P3 minN)
  ];
}
