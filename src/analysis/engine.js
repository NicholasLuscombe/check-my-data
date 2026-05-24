// ── Analysis Engine ─────────────────────────────────────────────────
// Orchestrates the full 25-test forensic analysis pipeline.
// Extracted from App.jsx. Phase 8 additions: validateMatrix, per-test error boundaries.

import { createPRNG } from '../stats/prng.js';
import { flagRankOf } from '../constants/thresholds.js';
import { DATATYPE_SKIP } from '../constants/assays.js';
import { ROW_SEMANTICS_FULL_SKIP, ROW_SEMANTICS_SKIP_REASON } from '../import/rowSemantics.js';
import { aggregatePerGroup, buildGroups } from './aggregation.js';
import { createConditionContext } from './conditionContext.js';

// ── validateMatrix ────────────────────────────────────────────────
// Input validation for the numeric matrix before running tests.
// Sanitises non-finite values and rejects degenerate inputs.

export function validateMatrix(matrix) {
  const warnings = [];

  if (!Array.isArray(matrix) || matrix.length === 0) {
    return { valid: false, matrix, warnings: ["Matrix has no rows."] };
  }
  if (!Array.isArray(matrix[0]) || matrix[0].length === 0) {
    return { valid: false, matrix, warnings: ["Matrix has no columns."] };
  }

  // Sanitise non-finite values → null
  let sanitised = 0;
  const clean = matrix.map(row =>
    row.map(v => {
      if (v === null || v === undefined) return null;
      if (typeof v !== "number" || !isFinite(v)) { sanitised++; return null; }
      return v;
    })
  );
  if (sanitised > 0) {
    warnings.push(`Replaced ${sanitised} non-finite value${sanitised > 1 ? "s" : ""} (NaN/Infinity) with null.`);
  }

  // Check missing fraction
  const total = clean.length * clean[0].length;
  const missing = clean.flat().filter(v => v === null).length;
  if (missing / total > 0.5) {
    warnings.push(`Warning: ${(missing / total * 100).toFixed(0)}% of values are missing.`);
  }

  // Filter out all-null rows
  const filtered = clean.filter(row => row.some(v => v !== null));
  if (filtered.length === 0) {
    return { valid: false, matrix: clean, warnings: [...warnings, "All rows are empty after sanitisation."] };
  }

  // Check minimum viable size
  const numericCols = filtered[0].length;
  if (numericCols === 0) {
    return { valid: false, matrix: filtered, warnings: [...warnings, "No numeric columns found."] };
  }

  return { valid: true, matrix: filtered, warnings };
}

// ── 23 test functions ──────────────────────────────────────────────
import { testDuplicates } from '../tests/duplicateDetection.js';
import { testConstantOffset } from '../tests/constantOffset.js';
import { testSelectiveNoise } from '../tests/selectiveNoise.js';
import { testPearsonUniformity } from '../tests/interReplicateCorrelation.js';
import { testSpearmanCrossCondition } from '../tests/rankCorrelation.js';
import { testAutocorrelation } from '../tests/autocorrelation.js';
import { testWindowedAutocorrelation } from '../tests/windowedAutocorrelation.js';
import { testKurtosis } from '../tests/kurtosis.js';
import { testRuns } from '../tests/runs.js';
import { testRowMeanRuns } from '../tests/rowMeanRuns.js';
import { testTerminalDigits } from '../tests/terminalDigits.js';
import { testBenford } from '../tests/benford.js';
import { testDecimalPrecision } from '../tests/decimalPrecision.js';
import { testMeanVariance } from '../tests/meanVariance.js';
import { testRegionalNoise } from '../tests/regionalNoise.js';
import { testMahalanobisOutlier } from '../tests/mahalanobis.js';
import { testBlockedMahalanobis } from '../tests/blockedMahalanobis.js';
import { testBenford2 } from '../tests/benford2.js';
import { testValueFrequencySpike } from '../tests/valueFrequencySpike.js';

import { testResidualSpikeCorrelation } from '../tests/residualSpikeCorrelation.js';
import { testLoessResidual } from '../tests/loessResidual.js';
import { testWithinRowVariance } from '../tests/withinRowVariance.js';
import { testMissingDataPattern } from '../tests/missingDataPattern.js';
import { testCarlisleBalance } from '../tests/carlisleBalance.js';
import { testEntropy } from '../tests/entropyTest.js';
import { testColumnGof } from '../tests/columnGof.js';
import { testModality } from '../tests/modality.js';
import { testCrossConditionConsistency } from '../tests/crossConditionConsistency.js';

// ── tick — yield to the UI between tests ───────────────────────────
const tick = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

// ── extractAnalysisInputs ──────────────────────────────────────────
// Builds the numeric matrix, raw-string matrix, column groups,
// row-level conditions, and filtered indices from imported data.

export function extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing, colRelationship, dataColHeaders }) {
  const dataCols = roles.map((r,i)=>r==="data"?i:-1).filter(i=>i>=0);
  const condCols = roles.map((r,i)=>r==="condition"?i:-1).filter(i=>i>=0);

  // Build numeric matrix (data cols only)
  const filteredIndices = [];
  const matrix = data.map(row =>
    dataCols.map(ci => {
      const v=row[ci];
      if(v==null||v==="") return null;
      const n=Number(v); if(isNaN(n)) return null;
      if(n===0&&zeroAsMissing) return null;
      return n;
    })
  ).filter((row,i)=>{ const keep=row.some(v=>v!==null); if(keep)filteredIndices.push(i); return keep; });

  // Raw string matrix (same shape, preserves trailing zeros for precision analysis)
  const rawMatrix = filteredIndices.map(i => data[i]).map(row =>
    dataCols.map(ci => {
      const v=row[ci];
      if(v==null||v==="") return null;
      const n=Number(v); if(isNaN(n)) return null;
      if(n===0&&zeroAsMissing) return null;
      return String(v).trim();
    })
  );

  // Row-level conditions from condition columns
  let rowConditions=null;
  let rowConditionsCols=null; // per-column: array of per-COND-col condition arrays
  if(condCols.length){
    const rc=data.map(row=>{
      const parts=condCols.map(ci=>row[ci]!=null&&String(row[ci]).trim()?String(row[ci]).trim():null).filter(Boolean);
      return parts.join(" | ")||null;
    });
    if(rc.some(c=>c)) rowConditions=filteredIndices.map(i=>rc[i]||null);
    // Per-column arrays (for independent stratification in kurtosis etc.)
    if(condCols.length>1){
      rowConditionsCols=condCols.map(ci=>{
        const col=data.map(row=>row[ci]!=null&&String(row[ci]).trim()?String(row[ci]).trim():null);
        const filtered=filteredIndices.map(i=>col[i]||null);
        return filtered.some(c=>c)?filtered:null;
      }).filter(Boolean);
    }
  }

  // Build column groups (for group-aware pair tests)
  const groups = buildGroups(matrix, dataCols, condPerCol);

  // Unified condition context
  const condCtx = createConditionContext({ groups, rowConditions, rowConditionsCols, matrix, colRelationship, dataColHeaders });

  return { matrix, rawMatrix, filteredIndices, condCtx };
}

// ── runFullAnalysis ────────────────────────────────────────────────
// Runs all 24 forensic tests on the prepared data, with progress
// callbacks and VST-aware preprocessing.

export async function runFullAnalysis(matrix, rawMatrix, condCtx, assay, onProgress, vst, opts={}, dataType='continuous', rowSemantics='ordered') {
  // Validate and sanitise input matrix
  const validation = validateMatrix(matrix);
  if (!validation.valid) {
    throw new Error(`Invalid input matrix: ${validation.warnings.join(" ")}`);
  }
  if (validation.warnings.length > 0) {
    console.warn("[validateMatrix]", validation.warnings.join(" "));
  }
  // Use sanitised matrix (non-finite values replaced with null)
  matrix = validation.matrix;
  // Re-create condCtx if validation changed the matrix (e.g. sanitised NaN → null → all-null row removed)
  if (matrix !== validation.matrix) condCtx = condCtx.withMatrix(matrix);

  // Create PRNG instance from data for deterministic results (Web Worker safe)
  const rng = createPRNG(matrix);

  const isConditionsMode = condCtx.type === 'column-grouped' && !condCtx.paired;
  const useAggregate = condCtx.type === 'column-grouped' && condCtx.count >= 2;

  async function runPair(testFn, parentCondCtx) {
    return useAggregate
      ? await aggregatePerGroup(testFn, condCtx.slices(), parentCondCtx || null)
      : testFn(matrix, parentCondCtx || null);
  }

  // ── VST preprocessing ──────
  // Transform determined at import by detectVST(). Reconciled test-input
  // split (S111 Phase 1 Target B against engine.js dispatch; see
  // METHODOLOGY-MAP.md §"Test-input routing"):
  //
  // Applied to (13 tests, via `hasVST ? vstMatrix : matrix` or runPairVST):
  //   Constant-Offset Blocks, Residual Spike Correlation, Cross-Condition
  //   Consistency (Stages 1/2; Stage 3 P9 overrides via opts.originalMatrix),
  //   Mahalanobis Row Outlier, Blocked Mahalanobis, Excess Kurtosis,
  //   Autocorrelation, Windowed Autocorrelation, Runs Test, Row-Mean Runs,
  //   LOESS Residual Analysis, Selective Noise, Regional Noise Homogeneity.
  //
  // NOT applied to (with rationale):
  //   - Duplicate Detection (exact match on originals)
  //   - Digit-level tests: Terminal Digits, Benford 1st/2nd, Decimal
  //     Precision, Value-Frequency Spike (operate on original precision)
  //   - Mean-Variance Noise Scaling (§4.1 — IS the VST-legitimacy
  //     detector; circular if fed VST'd input, confirmed S111 Phase 1)
  //   - Inter-Replicate Correlation (§2.5 — winsorized Pearson r absorbs
  //     leverage outliers from scale differences; windowed scan uses raw
  //     Pearson deliberately because every point carries signal at 8-15
  //     row windows)
  //   - Shannon Entropy (§3.6 — forensic target is raw-scale value-
  //     frequency concentration on modal-precision-discretised values)
  //   - Within-Row Variance (§4.3 — internalises variance stabilisation
  //     via Step-2 binned MV fit + local-MAD dispersion floor; external
  //     VST would redefine the forensic target)
  //   - Cross-Condition Rank Correlation, Baseline Balance (rank-based
  //     or distance-based on originals)
  //   - Column Goodness-of-Fit, Modality (§3.7/§3.8 — distributional
  //     shape targets on the raw scale)
  //   - Missing Data Pattern (structural; values not relevant)
  const vstType = vst?.transform || 'raw';
  let vstMatrix = null;
  if (vstType === 'log') {
    vstMatrix = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  } else if (vstType === 'anscombe') {
    vstMatrix = matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  }
  const hasVST = vstMatrix !== null;

  // VST-transformed condCtx (same condition structure, VST-transformed data)
  const vstCondCtx = hasVST ? condCtx.withMatrix(vstMatrix) : null;

  async function runPairVST(testFn, parentCondCtx) {
    if (hasVST) {
      const vstCtx = parentCondCtx ? (vstCondCtx || parentCondCtx) : null;
      return useAggregate
        ? await aggregatePerGroup(testFn, vstCondCtx.slices(), vstCtx)
        : testFn(vstMatrix, vstCtx);
    }
    return await runPair(testFn, parentCondCtx);
  }
  function tagVST(r) { if (hasVST) { r.vstTransform = vstType; } return r; }

  // Data-type skip helper
  const skipMap = DATATYPE_SKIP[dataType] || {};
  function dtSkip(testName, category) {
    const reason = skipMap[testName];
    if (!reason) return null;
    return { name: testName, category, flag: "N/A", description: reason };
  }

  // Conditions-mode skip helper: replicate-comparison tests are N/A
  // when DATA columns represent separate conditions, not technical replicates.
  const COND_SKIP_REASON = "Not applicable when columns are non-replicates. This test compares replicate measurements of the same quantity — columns representing different treatments, instruments, or time points are expected to differ.";
  function condSkip(testName, category) {
    if (!isConditionsMode) return null;
    return { name: testName, category, flag: "N/A", description: COND_SKIP_REASON };
  }

  // Row-semantics gate (S118 Track H): full-test skip for the 8 sequential
  // / spatial tests when row order is arbitrary (long-format pivots, gene
  // lists, alphabetised protein IDs). Sub-unit suppression for IRC and
  // Within-Row Variance lives inside those test functions.
  const isArbitraryRowOrder = rowSemantics === 'arbitrary';
  function rsSkip(testName, category) {
    if (!isArbitraryRowOrder) return null;
    if (!ROW_SEMANTICS_FULL_SKIP.has(testName)) return null;
    return { name: testName, category, flag: "N/A", description: ROW_SEMANTICS_SKIP_REASON };
  }

  // Build column→group mapping for within-row breakdown (duplicate detection).
  // Derived from condCtx slices: each group's columns get a group index.
  const wrColGroup = new Int8Array(matrix[0]?.length||0).fill(-1);
  if (useAggregate) {
    condCtx.slices().forEach((s, gi) => {
      const ci = s.colIndices || s.matrixColIndices;
      if (ci) ci.forEach(c => { wrColGroup[c] = gi; });
    });
  } else {
    for (let i = 0; i < wrColGroup.length; i++) wrColGroup[i] = 0;
  }

  const tests = [
    // --- Unusual Digits ---
    ["Benford's Law",                () => {
      if (assay === "cell_count") return { name: "Benford's Law (First Digit)", category: "digit",
        flag: "N/A", description: "Not applicable to cell count data. Poisson count data from a single counting process has a mathematically determined leading-digit distribution that depends on λ, not Benford's law. Benford applicability requires data spanning multiple orders of magnitude from heterogeneous natural processes." };
      return testBenford(matrix, rng);
    }],
    ["Benford's Law (2nd Digit)",    () => {
      if (assay === "cell_count") return { name: "Benford's Law (Second Digit)", category: "digit",
        flag: "N/A", description: "Not applicable to cell count data. See Benford's First Digit for rationale." };
      const allV = matrix.flat().filter(v => v != null && isFinite(v));
      const intFrac = allV.filter(v => Number.isInteger(v)).length / (allV.length || 1);
      if (intFrac > 0.9) return { name: "Benford's Law (Second Digit)", category: "digit",
        flag: "N/A", description: "Not applicable to integer/count data. Count values naturally concentrate second significant digits at 0 (e.g. 10, 20, 100, 200) — this is an intrinsic property of integer distributions, not a meaningful signal." };
      return testBenford2(matrix, rng);
    }],
    ["Terminal Digit Uniformity",    () => testTerminalDigits(matrix, assay)],
    ["Decimal Precision",            () => testDecimalPrecision(matrix, rawMatrix, assay)],
    ["Value-Frequency Spike",        () => testValueFrequencySpike(matrix, rawMatrix)],
    // --- Copy, Paste, Edit ---
    ["Inter-Replicate Correlation",  () => condSkip("Inter-Replicate Correlation","distributional") || dtSkip("Inter-Replicate Correlation","distributional") || testPearsonUniformity(matrix, condCtx.slices(), rng, rowSemantics)],
    ["Duplicate Detection",          async () => await runPair((m) => testDuplicates(m, matrix, wrColGroup, assay))],
    ["Constant-Offset Blocks",       async () => {
      // S95 Track A Item 5: ConstOffset expanded to ALL column pairs including
      // cross-condition. The permutation null (row-shuffle, consecutive
      // equal-difference count) is valid for any column pair. Bypasses
      // aggregatePerGroup (which would restrict to within-group pairs only).
      // S118 Track H: NOT rsSkip-gated — the row-shuffle permutation null
      // renders arbitrary-order noise inert by construction (genomic
      // autocorrelation present equally in shuffled orderings → high permP
      // → LOW). Self-gating; see METHODOLOGY §1.2.
      const cs = condSkip("Constant-Offset Blocks","structural"); if (cs) return cs;
      const dt = dtSkip("Constant-Offset Blocks","structural"); if (dt) return dt;
      return tagVST(testConstantOffset(hasVST ? vstMatrix : matrix, rng));
    }],
    ["Residual Spike Correlation",   () => {
      const csRS = condSkip("Residual Spike Correlation","structural"); if (csRS) return csRS;
      const dtRS = dtSkip("Residual Spike Correlation","structural"); if (dtRS) return dtRS;
      const m = hasVST ? vstMatrix : matrix;
      const ctx = hasVST ? vstCondCtx : condCtx;
      const r = testResidualSpikeCorrelation(m, ctx, rng);
      if (hasVST) r.vstTransform = vstType;
      return r;
    }],
    // --- Cross-Condition Comparisons + Cross-Replicate (row outliers) ---
    ["Baseline Balance",             () => testCarlisleBalance(matrix, condCtx)],
    ["Cross-Condition Rank Corr.",   () => testSpearmanCrossCondition(matrix, condCtx)],
    ["Cross-Condition Consistency",  () => {
      // Track D framework test. Permutation null, VST-aware (Stages 1/2
      // operate on VST-transformed values when active, per spec §"VST note").
      // Stage 3 P9 mean-variance slope uses the ORIGINAL (pre-VST) matrix
      // because VST is designed to flatten mean-variance slope (spec §1.9
      // Stage 3 "Not VST-aware"); the driver dispatches per-property based
      // on the registry's useOriginalValues flag.
      const m = hasVST ? vstMatrix : matrix;
      const ctx = hasVST ? vstCondCtx : condCtx;
      if (!ctx || !ctx.has || ctx.count < 2) {
        return { name: "Cross-Condition Consistency", category: "group",
          flag: "N/A", description: "Need ≥2 experimental conditions." };
      }
      const r = testCrossConditionConsistency(m, ctx, rng, { originalMatrix: matrix, hasVST });
      if (hasVST) r.vstTransform = vstType;
      return r;
    }],
    ["Mahalanobis Row Outlier",      async () => {
      const csMH = condSkip("Mahalanobis Row Outlier","distributional"); if (csMH) return csMH;
      const dtMH = dtSkip("Mahalanobis Row Outlier","distributional"); if (dtMH) return dtMH;
      if (assay === "genomics") return { name: "Mahalanobis Row Outlier", category: "distributional",
        flag: "N/A", description: "Not applicable to genomics data. Count distributions violate the multivariate normality assumption required for χ²-based D² thresholds. Biological expression heterogeneity produces widespread outliers that are not anomalous." };
      // S127 Path 1 dispatch: METHODOLOGY.md §2.6 step 1 specifies
      // per-condition (μ, Σ). When the dataset is row-grouped with ≥2
      // conditions each ≥3 rows (mahalGroups non-null), stratification
      // is well-defined and is the sole correct path — pooled (μ, Σ)
      // computed over the joint distribution would conflate
      // treatment-effect rows with fabrication, inflating D² for
      // legitimate biology and firing the verdict on real condition
      // differences. Pre-S127: both pooled and stratified were computed
      // and arbitrated by more-severe, so pooled-driven-FLAG slipped
      // through on multi-condition row-grouped fixtures (DS15 candidate
      // surfaced via S126b add-5b audit).
      //
      // Single-condition / no-group / column-grouped fixtures still use
      // the pooled path: when there's only one group, pooled IS
      // per-condition by construction (rowGroups() returns null and the
      // joint distribution coincides with the single-condition one).
      // Column-grouped data is handled by useAggregate=true inside
      // runPairVST, which itself stratifies per group.
      const mahalCtx = hasVST ? vstCondCtx : condCtx;
      const mahalGroups = mahalCtx?.rowGroups();
      if (mahalGroups) {
        const stratResult = tagVST(await aggregatePerGroup(m => testMahalanobisOutlier(m, assay), mahalGroups));
        // Per-condition D² data with full-matrix row indices for chart
        // rendering (per-condition series + outlier threshold lines).
        const allCondD2 = mahalGroups.map(g => {
          const r = testMahalanobisOutlier(g.matrix, assay);
          const mapped = (r.plotD2Rows || []).map(si =>
            si < g.rowIndices.length ? g.rowIndices[si] : si
          );
          return { condition: g.name, plotD2: r.plotD2 || [], plotD2Rows: mapped, plotThreshold: r.plotThreshold, outlierThreshold: r.outlierThreshold };
        });
        stratResult.allCondD2 = allCondD2;
        return stratResult;
      }
      return tagVST(await runPairVST(m => testMahalanobisOutlier(m, assay)));
    }],
    ["Blocked Mahalanobis", async () => {
      // S110 Track E (a): block-localised covariance/mean anomaly detection.
      // Sibling of §2.6 Mahalanobis Row Outlier; targets the gap where a
      // factor-model injection or block copy-paste leaves row-level D² within
      // χ²(p) tail while cross-replicate covariance within the block diverges
      // from the condition background. Internally aggregates with BH-FDR
      // across (pass × condition).
      //
      // VST routing: runs on the post-VST matrix, same as §2.6 Mahalanobis.
      // S118 Track H: genomics auto-routes to rowSemantics='arbitrary' at
      // import; the rsSkip lane subsumes the previous ad-hoc assay check.
      // S169: testBlockedMahalanobis is async and yields between permutation
      // chunks. The dispatch loop already awaits fn() at engine.js:460, so
      // an async wrapper is transparent. onPermProgress threads the per-chunk
      // fraction back through the same onProgress hook used for the
      // top-level test progress, with a "(perms NN%)" suffix.
      const csBM = condSkip("Blocked Mahalanobis","replicate"); if (csBM) return csBM;
      const dtBM = dtSkip("Blocked Mahalanobis","replicate"); if (dtBM) return dtBM;
      const rsBM = rsSkip("Blocked Mahalanobis","replicate"); if (rsBM) return rsBM;
      const m = hasVST ? vstMatrix : matrix;
      const ctx = hasVST ? vstCondCtx : condCtx;
      const bmIndex = tests.findIndex(t => t[0] === "Blocked Mahalanobis");
      const onPermProgress = onProgress
        ? (frac) => onProgress(`${bmIndex+1}/${tests.length} — Blocked Mahalanobis (perms ${Math.round(frac*100)}%)`)
        : null;
      const r = await testBlockedMahalanobis(m, ctx, rng, dataType, onPermProgress);
      if (hasVST) r.vstTransform = vstType;
      return r;
    }],
    // --- Cross-Replicate Comparisons + Distribution Shapes ---
    ["Noise Scaling With Measurement Size",   () => condSkip("Noise Scaling With Measurement Size","instrument") || dtSkip("Noise Scaling With Measurement Size","instrument") || testMeanVariance(matrix, assay)],
    ["Kurtosis",                     async () => condSkip("Kurtosis","distributional") || dtSkip("Kurtosis","distributional") || tagVST(await runPairVST((m, childCtx) => testKurtosis(m, childCtx, rng), condCtx))],
    ["Entropy / Zipf Analysis",      () => dtSkip("Entropy / Zipf Analysis","noise") || testEntropy(matrix, rng, dataType)],
    ["Column Goodness-of-Fit",       () => dtSkip("Column Goodness-of-Fit","shapes") || testColumnGof(matrix, rng, dataType)],
    ["Modality Test",                () => dtSkip("Modality Test","shapes") || testModality(matrix, rng, dataType)],
    // S118 Track H: §2.1 NOT rsSkip-gated — Tier 2 effect-size floor
    // |mean r| ≥ 0.25 at N ≥ 500 renders arbitrary-order co-regulation
    // background inert (r ≈ 0.10–0.15); fabrication-grade r continues to
    // flag on arbitrary-order data. DS11 generator leakage (r=0.55) is the
    // canonical positive case. See METHODOLOGY §2.1.
    ["Autocorrelation",              async () => condSkip("Autocorrelation","distributional") || dtSkip("Autocorrelation","distributional") || tagVST(await runPairVST(testAutocorrelation))],
    // S118 Track H: §2.1b NOT rsSkip-gated — within-pair row-shuffle
    // permutation null self-handles arbitrary-order baseline; real localised
    // serial structure in the delivered order continues to flag. See
    // METHODOLOGY §2.1b.
    ["Windowed Autocorrelation",     async () => condSkip("Windowed Autocorrelation","replicate") || dtSkip("Windowed Autocorrelation","replicate") || tagVST(await runPairVST((m) => testWindowedAutocorrelation(m, rng)))],
    ["Runs Test",                    async () => condSkip("Runs Test","distributional") || dtSkip("Runs Test","distributional") || rsSkip("Runs Test","distributional") || tagVST(await runPairVST((m, childCtx) => testRuns(m, childCtx, rng), condCtx))],
    ["Within-Row Variance",          () => {
      const csWR = condSkip("Within-Row Variance","noise"); if (csWR) return csWR;
      const dtWR = dtSkip("Within-Row Variance","noise"); if (dtWR) return dtWR;
      // Within-row biological-semantics skip retained on genomics: within-row
      // variance across technical replicates of the same gene is dominated by
      // biological expression heterogeneity. Independent of row order — kept
      // alongside the S118 sub-unit suppression (windowed scan only) below.
      if (assay === "genomics") return { name: "Within-Row Variance", category: "noise",
        flag: "N/A", description: "Not applicable to genomics data. Within-row variance across technical replicates of the same gene has different semantics — biological expression heterogeneity dominates." };
      return testWithinRowVariance(matrix, rng, rowSemantics);
    }],
    // --- Cross-Replicate Comparisons (spatial / sectional) ---
    ["LOESS Residual Analysis",      async () => {
      // S118 Track H: genomics auto-routes to rowSemantics='arbitrary' at
      // import; the rsSkip lane subsumes the previous ad-hoc assay check.
      const csLO = condSkip("LOESS Residual Analysis","distributional"); if (csLO) return csLO;
      const dtLO = dtSkip("LOESS Residual Analysis","distributional"); if (dtLO) return dtLO;
      const rsLO = rsSkip("LOESS Residual Analysis","distributional"); if (rsLO) return rsLO;
      return tagVST(await runPairVST((m) => testLoessResidual(m, rng)));
    }],
    ["Row-Mean Runs",                async () => condSkip("Row-Mean Runs","distributional") || dtSkip("Row-Mean Runs","distributional") || rsSkip("Row-Mean Runs","distributional") || tagVST(await runPairVST((m, childCtx) => testRowMeanRuns(m, childCtx, rng), condCtx))],
    ["Selective Noise",              async () => condSkip("Selective Noise","structural") || dtSkip("Selective Noise","structural") || tagVST(await runPairVST((m, childCtx) => testSelectiveNoise(m, childCtx), condCtx))],
    ["Regional Noise Homogeneity",   async () => {
      // S118 Track H: genomics auto-routes to rowSemantics='arbitrary' at
      // import; the rsSkip lane subsumes the previous ad-hoc assay check.
      const csRN = condSkip("Regional Noise Homogeneity","instrument"); if (csRN) return csRN;
      const dtRN = dtSkip("Regional Noise Homogeneity","instrument"); if (dtRN) return dtRN;
      const rsRN = rsSkip("Regional Noise Homogeneity","instrument"); if (rsRN) return rsRN;
      return tagVST(await runPairVST((m) => testRegionalNoise(m, rng)));
    }],
    ["Missing Data Pattern",         () => testMissingDataPattern(matrix, condCtx, assay)],
  ];

  const results = [];
  for (let i = 0; i < tests.length; i++) {
    const [name, fn] = tests[i];
    if (onProgress) onProgress(`${i+1}/${tests.length} — ${name}`);
    await tick();
    try {
      results.push(await fn());
    } catch (err) {
      console.error(`[${name}] failed:`, err);
      results.push({
        name,
        flag: "ERROR",
        primaryP: null,
        description: `Test failed: ${err.message}`,
        error: true,
      });
    }
    await tick();
  }
  // Post-process: pivot-aware Selective Noise caveat
  // When data arrives via long-format pivot, columns = experimental groups, not
  // technical replicates. Variance differences between groups are expected by design
  // (different volumes, run conditions, etc.) — not a fabrication signal.
  if (opts.isPivoted) {
    const sn = results.find(r => r.name && r.name.includes('Selective Noise'));
    if (sn && sn.flag !== 'N/A') {
      sn.flag = 'LOW';
      sn.primaryP = 1.0;
      sn.pivotNote = true;
      sn.description = sn.description +
        ' Note: columns represent distinct experimental groups from a long-format pivot — ' +
        'inter-group variance differences are expected by design and are not a meaningful signal.';
    }
  }

  return results;
}
