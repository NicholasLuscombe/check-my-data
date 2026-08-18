// ── Analysis Engine ─────────────────────────────────────────────────
// Orchestrates the full 25-test forensic analysis pipeline.
// Extracted from App.jsx. Phase 8 additions: validateMatrix, per-test error boundaries.

import { createPRNGFactory } from '../stats/prng.js';
import { flagRankOf } from '../constants/thresholds.js';
import { DATATYPE_SKIP, DATATYPE_CAUSE, TOO_FEW_REPLICATE_COLS_CAUSE, joinDeclineReason } from '../constants/assays.js';
import { NA_CAUSE } from '../constants/naCause.js';
import { ROW_SEMANTICS_FULL_SKIP, ROW_SEMANTICS_SKIP_REASON } from '../import/rowSemantics.js';
import { aggregatePerGroup, buildGroups, buildAllGroups } from './aggregation.js';
import { createConditionContext } from './conditionContext.js';
import { computeTrigger } from './groupingTrigger.js';
import { computeSubjectPairing, PAIRED_CAUSE, PAIRED_SKIP } from './subjectPairing.js';
import { noGroupMeetsMin } from './applicability.js';

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
import { testSequentialDuplication } from '../tests/sequentialDuplication.js';
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
import { testMahalanobisOutlier, MIN_COLS as MAHAL_MIN_COLS } from '../tests/mahalanobis.js';
import { testBlockedMahalanobis } from '../tests/blockedMahalanobis.js';
import { testBenford2 } from '../tests/benford2.js';
import { testValueFrequencySpike } from '../tests/valueFrequencySpike.js';

import { testResidualSpikeCorrelation } from '../tests/residualSpikeCorrelation.js';
import { testLoessResidual } from '../tests/loessResidual.js';
import { testWithinRowVariance } from '../tests/withinRowVariance.js';
import { testMissingDataPattern } from '../tests/missingDataPattern.js';
import { testCarlisleBalance } from '../tests/carlisleBalance.js';
import { testEntropy } from '../tests/entropyTest.js';
import { testColumnGof, MIN_OBS as GOF_MIN_OBS } from '../tests/columnGof.js';
import { testModality, MIN_N as MODALITY_MIN_N } from '../tests/modality.js';
import { testCrossConditionConsistency } from '../tests/crossConditionConsistency.js';

// ── tick — yield to the UI between tests ───────────────────────────
const tick = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

// ── PERF — opt-in per-test timing instrument ───────────────────────
// Gate: process.env.PERF === '1' (Node). Browser unaffected (process undef).
// When enabled, runFullAnalysis attaches `_perfTimings` (array of
// `{name, ms}`) and `_perfMeta` (capture date) to the returned results
// array. Logic-neutral — wraps existing dispatch calls in performance.now()
// only. No reordering, no arithmetic change.
const PERF_ENABLED = (typeof process !== 'undefined' && process.env && process.env.PERF === '1');

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
  // The same groups before the drop rule. Only the import view's hold-out guard
  // reads this; the analysis path uses `groups`.
  const allGroups = buildAllGroups(matrix, dataCols, condPerCol);

  // Unified condition context
  const condCtx = createConditionContext({ groups, rowConditions, rowConditionsCols, matrix, colRelationship, dataColHeaders });

  // S320 move 2 — grouping-enforcement trigger. Computed HERE because this is
  // the only scope holding the helper's raw inputs (data, roles, condCols,
  // filteredIndices); runFullAnalysis receives only matrix + condCtx, so the
  // result is stamped onto condCtx for the hook to read. On column-grouped data
  // the candidate set is empty, reproducing the old rowGroupsStatus hasGroups
  // guard (attempted:false → never pending). The confirm card calls the same
  // computeTrigger with the ticked column subset — one home for the arm logic.
  condCtx.groupingTrigger = computeTrigger({
    data, roles,
    condColSet: condCtx.type === 'column-grouped' ? [] : condCols,
    filteredIndices,
  });

  // P82 (S351) — subject pairing. Computed HERE for the same reason
  // groupingTrigger is: this is the only scope holding data, roles and
  // filteredIndices together, and the identifier column is dropped from the
  // matrix two statements above. runFullAnalysis receives only matrix +
  // condCtx, so the verdict is stamped onto condCtx for the dispatch to read.
  // Its own field, deliberately not condCtx.paired — see subjectPairing.js.
  // `headers` is not passed: extractAnalysisInputs receives dataColHeaders,
  // which indexes DATA columns, while the identifier index lives in raw-row
  // space alongside `roles`. Mixing the two would name the wrong column. The
  // verdict carries idColIndex; a caller holding raw headers can resolve it.
  condCtx.subjectPairing = computeSubjectPairing({ condCtx, data, roles, filteredIndices });

  // `groups` is the surviving column groups after aggregation.js's drop rule,
  // `allGroups` the same list before it. Returned so the import view can ask
  // whether a role change would lose one WITHOUT restating the rule — see
  // analysis/holdoutGuard.js.
  return { matrix, rawMatrix, filteredIndices, condCtx, groups, allGroups };
}

// ── runFullAnalysis ────────────────────────────────────────────────
// Runs all 24 forensic tests on the prepared data, with progress
// callbacks and VST-aware preprocessing.

export async function runFullAnalysis(matrix, rawMatrix, condCtx, assay, onProgress, vst, opts={}, dataType='continuous', rowSemantics='ordered', skipHeavy=false) {
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

  // Per-test PRNG streams (S340). One instance per test, derived from the data
  // hash and the test's DISPATCH-MAP KEY, so no test's draws depend on which
  // tests ran before it. Renaming a key below reseeds that test — see the
  // onboarding checklist in CLAUDE.md.
  const rngFor = createPRNGFactory(matrix);

  const isConditionsMode = condCtx.type === 'column-grouped' && !condCtx.paired;
  const useAggregate = condCtx.type === 'column-grouped' && condCtx.count >= 2;

  // S320 move 2 — grouping enforcement trigger. The decision is computed by the
  // shared helper (computeTrigger, src/analysis/groupingTrigger.js) up in
  // extractAnalysisInputs — the only scope holding the raw data/roles/
  // filteredIndices its locked signature takes — and stamped onto condCtx as
  // `groupingTrigger`. The same helper backs the confirm card, so the arm logic
  // lives in exactly one place. When a row-grouping can't be trusted, the four
  // row-grouped dispatch tests (Mahalanobis Row Outlier, Entropy/Zipf, Column
  // Goodness-of-Fit, Modality) return N/A pending user confirmation instead of
  // a pooled verdict a reader would mistake for a grouped pass. Two arms:
  //   Arm 1 (combinatorial merge)          — ≥3 columns tagged condition.
  //   Arm 2 (can't support a permutation)  — no usable partition, OR the
  //          partition is thin: median group size ≤ 4.
  // Supersedes the S318 announce-empty banner: the null/degenerate case is now
  // Arm 2, and the four tests suppress to N/A (a real verdict change) rather
  // than showing a pooled verdict tagged with a warning.
  const trigger = condCtx?.groupingTrigger || { pending: false };
  const groupingPending = !!trigger.pending;
  const groupingTrigger = {
    arm1: !!trigger.arm1,
    arm2: !!trigger.arm2,
    condCols: trigger.condCols ?? 0,
    nGroups: trigger.nGroups ?? null,
    medianSize: Number.isFinite(trigger.median) ? trigger.median : null,
    // Per-group sizes (helper already computes them) so the confirm card can
    // render the size distribution, not just count + median. Additive — no
    // test or severity code reads this; verdicts, batch, and census unchanged.
    sizes: Array.isArray(trigger.sizes) ? trigger.sizes : [],
  };
  function pendingResult(name, category) {
    return {
      name, category, flag: "N/A",
      description: "grouping unconfirmed — pending user confirmation",
      groupingPending: { ...groupingTrigger },
    };
  }

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

  // Data-type skip helper. The map holds the per-test tail; DATATYPE_CAUSE holds
  // the one sentence every test skipped for this data type shares. The result
  // carries all three: `description` is the joined pair, byte-identical to what
  // it has always been, and naCauseText / naTailText carry the halves so the
  // no-verdict panel can state the shared cause once instead of once per test.
  // Presence is a key test, not a truthiness test — a tail of "" is a real
  // entry, meaning the shared cause is the whole reason.
  const skipMap = DATATYPE_SKIP[dataType] || {};
  const skipCause = DATATYPE_CAUSE[dataType] || null;
  function dtSkip(testName, category) {
    if (!skipCause || !(testName in skipMap)) return null;
    const tail = skipMap[testName];
    return { name: testName, category, flag: "N/A", naCause: NA_CAUSE.DATA_TYPE_MISMATCH,
      description: joinDeclineReason(skipCause, tail), naCauseText: skipCause, naTailText: tail };
  }

  // Conditions-mode skip helper: replicate-comparison tests are N/A
  // when DATA columns represent separate conditions, not technical replicates.
  const COND_SKIP_REASON = "Not applicable because the columns are separate conditions, not repeats of the same measurement. These tests compare repeated measurements of one quantity, and columns holding different treatments, instruments, or time points are expected to differ.";
  function condSkip(testName, category) {
    if (!isConditionsMode) return null;
    return { name: testName, category, flag: "N/A", naCause: NA_CAUSE.COLUMNS_NOT_REPLICATES, description: COND_SKIP_REASON };
  }

  // Row-semantics gate (S118 Track H): full-test skip for the 8 sequential
  // / spatial tests when row order is arbitrary (long-format pivots, gene
  // lists, alphabetised protein IDs). Sub-unit suppression for IRC and
  // Within-Row Variance lives inside those test functions.
  const isArbitraryRowOrder = rowSemantics === 'arbitrary';
  function rsSkip(testName, category) {
    if (!isArbitraryRowOrder) return null;
    if (!ROW_SEMANTICS_FULL_SKIP.has(testName)) return null;
    return { name: testName, category, flag: "N/A", naCause: NA_CAUSE.ROW_ORDER_ARBITRARY, description: ROW_SEMANTICS_SKIP_REASON };
  }

  // Paired-design gate (P82, S351). A test whose null destroys the
  // correspondence between row r in one condition and row r in another cannot
  // run on a file whose conditions hold the same subjects — the reference
  // distribution it compares against describes data this file is not. The
  // verdict is computed in extractAnalysisInputs, the only scope that still has
  // the identifier column, and stamped onto condCtx.
  //
  // Two members. Cross-Condition Consistency (P82) has all seven of its arms
  // withheld together: they share one Fisher-Yates over permRow, so there is no
  // subset to spare. Residual Spike Correlation (P86) breaks the same
  // correspondence by the opposite operation — it shuffles each condition's
  // residual vector within itself rather than moving tags across conditions —
  // and is withheld for its own reason, an unbounded false-positive rate on
  // honest data. Per-test reasons live beside the wording in subjectPairing.js.
  //
  // Routes through the shared decline machinery: joinDeclineReason for
  // `description`, plus naCauseText / naTailText so groupNotApplicableByReason
  // states the shared cause once and indents the per-test line under it. The
  // result carries no p, no statistic and no numbers — a figure beside a skip
  // reads as evidence whatever label sits next to it.
  const isPairedDesign = !!condCtx?.subjectPairing?.paired;
  function pairedSkip(testName, category) {
    if (!isPairedDesign) return null;
    if (!(testName in PAIRED_SKIP)) return null;
    const tail = PAIRED_SKIP[testName];
    return { name: testName, category, flag: "N/A",
      naCause: NA_CAUSE.SUBJECTS_SHARED_ACROSS_CONDITIONS,
      description: joinDeclineReason(PAIRED_CAUSE, tail),
      naCauseText: PAIRED_CAUSE, naTailText: tail };
  }

  // Dev-only perf skip (S251): the two long-pole tests (Blocked Mahalanobis
  // ~38% of wall-clock, Excess Kurtosis ~21%) short-circuit to a cheap
  // N/A-shaped result when skipHeavy is set, so the local visual-check loop
  // renders fast. skipHeavy is computed in App.jsx (gated behind
  // import.meta.env.DEV + ?skipHeavy URL presence) and passed in; it defaults
  // false, so Node / the batch never take this path (no env, no window) and
  // stay byte-identical. The result rides the same N/A filter as an
  // applicability skip (no §3 card), but carries devSkipped:true to mark it
  // apart from a genuine non-applicable N/A for anyone inspecting results.
  // Math unchanged — the test body simply does not run.
  function devSkip(testName, category) {
    if (!skipHeavy) return null;
    return { name: testName, category, flag: "N/A", devSkipped: true,
      description: "Skipped in dev mode (skipHeavy) — test body not run." };
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
        flag: "N/A", naCause: NA_CAUSE.ASSAY_NOT_APPLICABLE, description: "Not applicable to cell-count data. When values come from a single counting process, their leading digits follow a pattern set by the average count, not Benford's law, which needs numbers drawn from many different processes across a wide range." };
      return testBenford(matrix, rngFor("Benford's Law"));
    }],
    ["Benford's Law (2nd Digit)",    () => {
      if (assay === "cell_count") return { name: "Benford's Law (Second Digit)", category: "digit",
        flag: "N/A", naCause: NA_CAUSE.ASSAY_NOT_APPLICABLE, description: "Not applicable to cell-count data. This is the same reason as the first-digit Benford test: counts from a single process do not follow Benford's law." };
      const allV = matrix.flat().filter(v => v != null && isFinite(v));
      const intFrac = allV.filter(v => Number.isInteger(v)).length / (allV.length || 1);
      if (intFrac > 0.9) return { name: "Benford's Law (Second Digit)", category: "digit",
        flag: "N/A", naCause: NA_CAUSE.DATA_TYPE_MISMATCH, description: "Not applicable to whole-number data. Round counts such as 10, 20, 100, or 200 pile their second digit on zero as a matter of course, so the test would flag an ordinary feature of integers rather than anything suspicious." };
      return testBenford2(matrix, rngFor("Benford's Law (2nd Digit)"));
    }],
    ["Terminal Digit Uniformity",    () => testTerminalDigits(matrix, assay)],
    ["Decimal Precision",            () => testDecimalPrecision(matrix, rawMatrix, assay)],
    ["Value-Frequency Spike",        () => testValueFrequencySpike(matrix, rawMatrix)],
    // --- Copy, Paste, Edit ---
    ["Inter-Replicate Correlation",  () => condSkip("Inter-Replicate Correlation","distributional") || dtSkip("Inter-Replicate Correlation","distributional") || testPearsonUniformity(matrix, condCtx.slices(), rngFor("Inter-Replicate Correlation"), rowSemantics)],
    // S318 — under conditions-mode (non-replicates) each data column is its own
    // single-column group, so runPair's aggregate branch would slice DupDet
    // per-column. On a one-column slice the full-row key degenerates to a single
    // value and row-duplication re-counts within-column value repetition as
    // spurious "N groups of duplicate rows" (value-collision already covers that
    // signal). DupDet is a whole-vector structural test — run it once on the full
    // matrix here, the way ConstOffset bypasses aggregatePerGroup. Gated on
    // isConditionsMode ONLY: the replicates column-grouped path (paired=true,
    // multi-column groups — DS02/DS11) keeps its per-group dispatch.
    ["Duplicate Detection",          async () => isConditionsMode
      ? testDuplicates(matrix, matrix, wrColGroup, assay)
      : await runPair((m) => testDuplicates(m, matrix, wrColGroup, assay))],
    ["Sequential Duplication",       () => testSequentialDuplication(matrix, assay)],
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
      return tagVST(testConstantOffset(hasVST ? vstMatrix : matrix, rngFor("Constant-Offset Blocks")));
    }],
    ["Residual Spike Correlation",   () => {
      // P86: withheld when the conditions hold the same subjects. Placed with the
      // other dispatch-level skips so nothing is computed on a file this test
      // cannot read honestly.
      const psRS = pairedSkip("Residual Spike Correlation","structural"); if (psRS) return psRS;
      const csRS = condSkip("Residual Spike Correlation","structural"); if (csRS) return csRS;
      const dtRS = dtSkip("Residual Spike Correlation","structural"); if (dtRS) return dtRS;
      const m = hasVST ? vstMatrix : matrix;
      const ctx = hasVST ? vstCondCtx : condCtx;
      const r = testResidualSpikeCorrelation(m, ctx, rngFor("Residual Spike Correlation"));
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
      // P82: withheld before anything is computed when the conditions hold the
      // same subjects. Placed ahead of the condition-count guard so a paired
      // file reports why it was withheld rather than a count it does meet.
      const psCC = pairedSkip("Cross-Condition Consistency", "group"); if (psCC) return psCC;
      const m = hasVST ? vstMatrix : matrix;
      const ctx = hasVST ? vstCondCtx : condCtx;
      if (!ctx || !ctx.has || ctx.count < 2) {
        return { name: "Cross-Condition Consistency", category: "group",
          flag: "N/A", naCause: NA_CAUSE.TOO_FEW_CONDITIONS, naObserved: ctx?.count ?? 0, naMinimum: 2, description: "Need ≥2 experimental conditions." };
      }
      const r = testCrossConditionConsistency(m, ctx, rngFor("Cross-Condition Consistency"), { originalMatrix: matrix, hasVST });
      if (hasVST) r.vstTransform = vstType;
      return r;
    }],
    ["Mahalanobis Row Outlier",      async () => {
      const csMH = condSkip("Mahalanobis Row Outlier","distributional"); if (csMH) return csMH;
      const dtMH = dtSkip("Mahalanobis Row Outlier","distributional"); if (dtMH) return dtMH;
      if (assay === "genomics") return { name: "Mahalanobis Row Outlier", category: "distributional",
        flag: "N/A", naCause: NA_CAUSE.ASSAY_NOT_APPLICABLE, description: "Not applicable to genomics data. This test flags rows that sit far from the rest, assuming the measurements follow a bell-shaped spread. Gene-expression counts do not, and normal biological variation puts many genes far out without anything being wrong." };
      if (groupingPending) return pendingResult("Mahalanobis Row Outlier", "replicate");
      // S324: the covariance distance needs at least MAHAL_MIN_COLS replicate
      // columns to be defined. Column count is a whole-dataset fact, so check it
      // here before any per-condition row split, rather than finding the
      // shortage once per group.
      if ((matrix[0]?.length || 0) < MAHAL_MIN_COLS) {
        // Same test as mahalanobis.js:30 but a different site, and the two have
        // always stated different purposes — an invertible covariance matrix
        // there, the row-distance measure here. Each keeps its own claim; only
        // one of the two can fire on a run.
        const colsTail = `This test needs at least ${MAHAL_MIN_COLS}, for the row-distance measure it uses.`;
        return { name: "Mahalanobis Row Outlier", category: "replicate", flag: "N/A", naCause: NA_CAUSE.TOO_FEW_COLUMNS, naObserved: matrix[0]?.length || 0, naMinimum: MAHAL_MIN_COLS,
          description: joinDeclineReason(TOO_FEW_REPLICATE_COLS_CAUSE, colsTail), naCauseText: TOO_FEW_REPLICATE_COLS_CAUSE, naTailText: colsTail };
      }
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
      const dsBM = devSkip("Blocked Mahalanobis","replicate"); if (dsBM) return dsBM;
      const csBM = condSkip("Blocked Mahalanobis","replicate"); if (csBM) return csBM;
      const dtBM = dtSkip("Blocked Mahalanobis","replicate"); if (dtBM) return dtBM;
      const rsBM = rsSkip("Blocked Mahalanobis","replicate"); if (rsBM) return rsBM;
      const m = hasVST ? vstMatrix : matrix;
      const ctx = hasVST ? vstCondCtx : condCtx;
      const bmIndex = tests.findIndex(t => t[0] === "Blocked Mahalanobis");
      const onPermProgress = onProgress
        ? (frac) => onProgress(`${bmIndex+1}/${tests.length} — Blocked Mahalanobis (perms ${Math.round(frac*100)}%)`)
        : null;
      const r = await testBlockedMahalanobis(m, ctx, rngFor("Blocked Mahalanobis"), dataType, onPermProgress);
      if (hasVST) r.vstTransform = vstType;
      return r;
    }],
    // --- Cross-Replicate Comparisons + Distribution Shapes ---
    ["Noise Scaling With Measurement Size",   () => condSkip("Noise Scaling With Measurement Size","instrument") || dtSkip("Noise Scaling With Measurement Size","instrument") || testMeanVariance(matrix, assay)],
    ["Kurtosis",                     async () => devSkip("Kurtosis","distributional") || condSkip("Kurtosis","distributional") || dtSkip("Kurtosis","distributional") || tagVST(await runPairVST((m, childCtx) => testKurtosis(m, childCtx, rngFor("Kurtosis")), condCtx))],
    // S179 A1: distribution-shape trio per-condition routing. Mirrors the
    // Mahalanobis Row Outlier S127 Path 1 shape — when condCtx.rowGroups()
    // returns ≥2 row-groups each ≥3 rows, dispatch per-condition via
    // aggregatePerGroup so per-column fits operate on within-condition row
    // subsets, not on the pooled mixture. Pooled fallback covers
    // single-condition / no-row-groups / column-grouped fixtures.
    ["Entropy / Zipf Analysis",      async () => {
      const dt = dtSkip("Entropy / Zipf Analysis","noise"); if (dt) return dt;
      if (groupingPending) return pendingResult("Entropy / Zipf Analysis", "shapes");
      const rg = condCtx?.rowGroups();
      if (rg) return await aggregatePerGroup(m => testEntropy(m, rngFor("Entropy / Zipf Analysis"), dataType), rg);
      return testEntropy(matrix, rngFor("Entropy / Zipf Analysis"), dataType);
    }],
    ["Column Goodness-of-Fit",       async () => {
      const dt = dtSkip("Column Goodness-of-Fit","shapes"); if (dt) return dt;
      if (groupingPending) return pendingResult("Column Goodness-of-Fit", "shapes");
      const rg = condCtx?.rowGroups();
      if (rg) {
        if (noGroupMeetsMin(rg, GOF_MIN_OBS)) {
          return { name: "Column Goodness-of-Fit", category: "shapes", flag: "N/A", naCause: NA_CAUSE.TOO_FEW_OBSERVATIONS, naObserved: Math.max(...rg.map(g => g.matrix.length)), naMinimum: GOF_MIN_OBS,
            description: `Not applicable — no condition group has the ${GOF_MIN_OBS} values this goodness-of-fit test needs to fit a distribution.` };
        }
        return await aggregatePerGroup(m => testColumnGof(m, rngFor("Column Goodness-of-Fit"), dataType), rg);
      }
      return testColumnGof(matrix, rngFor("Column Goodness-of-Fit"), dataType);
    }],
    ["Modality Test",                async () => {
      const dt = dtSkip("Modality Test","shapes"); if (dt) return dt;
      if (groupingPending) return pendingResult("Modality Test", "shapes");
      const rg = condCtx?.rowGroups();
      if (rg) {
        if (noGroupMeetsMin(rg, MODALITY_MIN_N)) {
          return { name: "Modality Test", category: "shapes", flag: "N/A", naCause: NA_CAUSE.TOO_FEW_OBSERVATIONS, naObserved: Math.max(...rg.map(g => g.matrix.length)), naMinimum: MODALITY_MIN_N,
            description: `Not applicable — no condition group has the ${MODALITY_MIN_N} values this modality test needs.` };
        }
        return await aggregatePerGroup(m => testModality(m, rngFor("Modality Test"), dataType), rg);
      }
      return testModality(matrix, rngFor("Modality Test"), dataType);
    }],
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
    ["Windowed Autocorrelation",     async () => {
      const cs = condSkip("Windowed Autocorrelation","replicate"); if (cs) return cs;
      const dt = dtSkip("Windowed Autocorrelation","replicate"); if (dt) return dt;
      // S317 — thread per-chunk permutation progress through onProgress, the
      // same wiring Blocked Mahalanobis uses. On the grouped path the fraction
      // resets per group (cosmetic); the verdict is unaffected.
      const wacIndex = tests.findIndex(t => t[0] === "Windowed Autocorrelation");
      const onWacPermProgress = onProgress
        ? (frac) => onProgress(`${wacIndex+1}/${tests.length} — Windowed Autocorrelation (perms ${Math.round(frac*100)}%)`)
        : null;
      return tagVST(await runPairVST((m) => testWindowedAutocorrelation(m, rngFor("Windowed Autocorrelation"), onWacPermProgress)));
    }],
    ["Runs Test",                    async () => condSkip("Runs Test","distributional") || dtSkip("Runs Test","distributional") || rsSkip("Runs Test","distributional") || tagVST(await runPairVST((m, childCtx) => testRuns(m, childCtx, rngFor("Runs Test")), condCtx))],
    ["Within-Row Variance",          () => {
      const csWR = condSkip("Within-Row Variance","noise"); if (csWR) return csWR;
      const dtWR = dtSkip("Within-Row Variance","noise"); if (dtWR) return dtWR;
      // Within-row biological-semantics skip retained on genomics: within-row
      // variance across technical replicates of the same gene is dominated by
      // biological expression heterogeneity. Independent of row order — kept
      // alongside the S118 sub-unit suppression (windowed scan only) below.
      if (assay === "genomics") return { name: "Within-Row Variance", category: "noise",
        flag: "N/A", naCause: NA_CAUSE.ASSAY_NOT_APPLICABLE, description: "Not applicable to genomics data. The spread across repeated measurements of one gene is driven by real biological differences, not by the measurement noise this test is built to check." };
      return testWithinRowVariance(matrix, rngFor("Within-Row Variance"), rowSemantics);
    }],
    // --- Cross-Replicate Comparisons (spatial / sectional) ---
    ["LOESS Residual Analysis",      async () => {
      // S118 Track H: genomics auto-routes to rowSemantics='arbitrary' at
      // import; the rsSkip lane subsumes the previous ad-hoc assay check.
      const csLO = condSkip("LOESS Residual Analysis","distributional"); if (csLO) return csLO;
      const dtLO = dtSkip("LOESS Residual Analysis","distributional"); if (dtLO) return dtLO;
      const rsLO = rsSkip("LOESS Residual Analysis","distributional"); if (rsLO) return rsLO;
      return tagVST(await runPairVST((m) => testLoessResidual(m, rngFor("LOESS Residual Analysis"))));
    }],
    ["Row-Mean Runs",                async () => {
      const csRM = condSkip("Row-Mean Runs","distributional"); if (csRM) return csRM;
      const dtRM = dtSkip("Row-Mean Runs","distributional"); if (dtRM) return dtRM;
      const rsRM = rsSkip("Row-Mean Runs","distributional"); if (rsRM) return rsRM;
      // S324: Row-Mean Runs looks for shifts within a condition's rows, so it
      // needs the rows labelled by condition. On column-grouped data there are
      // no row labels; check here and return not-applicable rather than fanning
      // the test over each column group, where every group returns N/A.
      if (!condCtx?.rowConditions) {
        return { name: "Row-Mean Runs", category: "replicate", flag: "N/A", naCause: NA_CAUSE.PREMISE_VOID,
          description: "Not applicable — the rows are not labelled by experimental condition, which this test requires. It looks for drift or sudden shifts in the row averages within one condition; without those labels, ordinary differences between samples would look like drift." };
      }
      return tagVST(await runPairVST((m, childCtx) => testRowMeanRuns(m, childCtx, rngFor("Row-Mean Runs")), condCtx));
    }],
    ["Selective Noise",              async () => condSkip("Selective Noise","structural") || dtSkip("Selective Noise","structural") || tagVST(await runPairVST((m, childCtx) => testSelectiveNoise(m, childCtx), condCtx))],
    ["Regional Noise Homogeneity",   async () => {
      // S118 Track H: genomics auto-routes to rowSemantics='arbitrary' at
      // import; the rsSkip lane subsumes the previous ad-hoc assay check.
      const csRN = condSkip("Regional Noise Homogeneity","instrument"); if (csRN) return csRN;
      const dtRN = dtSkip("Regional Noise Homogeneity","instrument"); if (dtRN) return dtRN;
      const rsRN = rsSkip("Regional Noise Homogeneity","instrument"); if (rsRN) return rsRN;
      return tagVST(await runPairVST((m) => testRegionalNoise(m, rngFor("Regional Noise Homogeneity"))));
    }],
    ["Missing Data Pattern",         () => testMissingDataPattern(matrix, condCtx, assay)],
  ];

  const results = [];
  const perfTimings = PERF_ENABLED ? [] : null;
  for (let i = 0; i < tests.length; i++) {
    const [name, fn] = tests[i];
    if (onProgress) onProgress(`${i+1}/${tests.length} — ${name}`);
    await tick();
    const tStart = PERF_ENABLED ? performance.now() : 0;
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
    if (PERF_ENABLED) perfTimings.push({ name, ms: performance.now() - tStart });
    await tick();
  }
  if (PERF_ENABLED) {
    results._perfTimings = perfTimings;
    results._perfMeta = { capturedAt: new Date().toISOString() };
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
