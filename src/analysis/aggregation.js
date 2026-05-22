// ── Aggregation helpers: per-group aggregation, Fisher's combination, summary ──
// Extracted from App.jsx — pure extraction, no logic changes.

import { flagFromP, flagRankOf } from '../constants/thresholds.js';
import { chiSquaredP, kurtosis, trimmedKurtosis } from '../stats/primitives.js';

/** Yield to the browser between groups to prevent kill-dialog. */
const tick = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

function buildGroups(matrix, dataCols, condPerCol) {
  if(!condPerCol||!condPerCol.some(c=>c)) return null;
  const groups={};
  dataCols.forEach((origColIdx, matrixColIdx)=>{
    const cond=condPerCol[origColIdx]||"Ungrouped";
    if(!groups[cond]) groups[cond]={name:cond, matrixColIndices:[]};
    groups[cond].matrixColIndices.push(matrixColIdx);
  });
  return Object.values(groups).map(g=>({
    name:g.name,
    matrixColIndices:g.matrixColIndices,
    // Build sub-matrix: keep only rows with ≥1 non-null value in this group's columns
    matrix:matrix.map(row=>g.matrixColIndices.map(ci=>row[ci]))
                 .filter(row=>row.some(v=>v!==null))
  })).filter(g=>g.matrix.length>=4&&g.matrix[0].length>=2);
}

/**
 * Extract the primary p-value from a test result for Fisher's method aggregation.
 * All tests return a standardized `primaryP` field.
 */
function extractPrimaryP(result) {
  if(result.primaryP !== undefined && result.primaryP !== null) return result.primaryP;
  return null;
}

/**
 * Run testFn on each group's sub-matrix, aggregate into one result.
 * Detail rows from each group get a 'group' prefix column.
 */
async function aggregatePerGroup(testFn, groups, parentCondCtx) {
  const perGroup=[];
  for (const g of groups) {
    const childCtx = parentCondCtx ? parentCondCtx.forSubMatrix(g) : null;
    const r=testFn(g.matrix, childCtx);
    // Remap row numbers when group is a row-subset (row-condition stratification).
    // Tests report rows as 1-indexed within the matrix they receive. When the matrix
    // is a row subset, map back to original dataset row numbers.
    if (g.rowIndices && r.details) {
      for (const d of r.details) {
        if (d.Row != null) {
          const idx = parseInt(d.Row) - 1; // 0-indexed within subset
          if (idx >= 0 && idx < g.rowIndices.length) d.Row = g.rowIndices[idx] + 1;
        }
      }
    }
    // S162a: parallel remap for the additive flaggedRowIndices field on
    // tests that emit it (Mahalanobis Row Outlier). Keeps the field's
    // semantics dataset-relative across pooled and stratified dispatch
    // when the worst-group spread below propagates it upward.
    if (g.rowIndices && Array.isArray(r.flaggedRowIndices)) {
      r.flaggedRowIndices = r.flaggedRowIndices.map(row1 => {
        const idx = row1 - 1;
        return (idx >= 0 && idx < g.rowIndices.length) ? g.rowIndices[idx] + 1 : row1;
      });
    }
    perGroup.push({group:g.name, n:g.matrix.length, flag:r.flag, result:r});
    await tick(); // yield between groups to prevent browser kill dialog
  }
  const applicable=perGroup.filter(r=>r.flag!=="N/A");
  if(!applicable.length){
    const proto=testFn([]);  // get name/category/description via N/A result
    return{...proto, flag:"N/A",
      details:[{note:"No group had sufficient data for this test."}]};
  }

  // ── Fisher's method for combining per-group evidence ──
  // Replaces vote-counting (worst-flag-wins + 2-MODERATE→HIGH) with a
  // principled meta-analytic combination. χ² = −2 Σ ln(p_i) ~ χ²(2k).
  // Clean groups contribute p ≈ 0.5 (weak), fabricated groups
  // contribute p ≈ 0.001 (strong) — signal isn't diluted by clean data.
  //
  // Scenario C: flag = max(Fisher's flag, worst group flag).
  // Fisher's can only promote, never demote. A fabricator who poisons one
  // group can't hide behind clean groups in the same experiment.
  const worstGroupFlag = applicable.reduce((worst, r) =>
    flagRankOf(r.flag) > flagRankOf(worst) ? r.flag : worst, "LOW");

  // Extract primary p-value from each group's test result
  const groupPs = applicable.map(r => extractPrimaryP(r.result));
  let fisherFlag = "LOW";
  let fisherP = 1;
  let fisherChi = 0;
  // Skip Fisher's combination for tests whose group-level primaryP is
  // systematically stochastically smaller than Uniform(0,1) under H0 — Fisher's
  // method assumes uniform nulls, so a shifted input distribution inflates Type I.
  // Forward-compatible rule (METHODOLOGY.md Design Rationale "Fisher's-
  // combination exemptions"): any test whose primaryP under H0 is
  // (a) the minimum of an internal BH-FDR-adjusted family,
  // (b) arithmetic-floor-truncated by a finite permutation count,
  // (c) derived from a shared simulation/bootstrap denominator across
  //     groups, or
  // (d) the survival p of a model-fit binomial whose null distribution is
  //     mis-calibrated under non-conforming inputs (e.g. a χ² null that
  //     assumes multivariate normality run against heavy-tailed raw data),
  // is exempted from Fisher aggregation. Per-group aggregation uses
  // worstGroupFlag only (no Fisher promotion). Current members:
  //   • Excess Kurtosis (§2.2) — shared simKurt denominator across groups.
  //   • Windowed Autocorrelation (§2.1b, S109 Part 2) — min per-pair BH adj-p
  //     is floor-truncated at ~1/(N_PERM+1) × nWindows ≈ 0.01 under H0.
  //     Surfaced on DS16 (3 clean groups Fisher-promoted to MOD).
  //   • Blocked Mahalanobis (§2.6b, S110) — min BH adj-p across (pass ×
  //     condition) with m = 2·nCond. Under H0 the shared within-condition
  //     permutation null across column-grouped groups makes per-group
  //     primaryP non-uniform and floor-truncated at ≈ m/(N_PERM+1).
  //   • Mahalanobis Row Outlier (§2.6, S127c) — primaryP = binomP from the
  //     dataset-level binomial on rows exceeding χ²(p, 0.99). The χ² null
  //     assumes multivariate normality; under heavy-tailed raw data the
  //     exceedance count exceeds the binomial null even when zero rows
  //     survive Stage-2 BH-FDR α=0.001 (per-group add-5b verdict gate
  //     `nOut === 0 → LOW` correctly returns LOW per-group). Fisher's
  //     combination on per-group binomP overrides the per-group
  //     verdict gate by combining stochastically small primaryP values into
  //     a HIGH aggregate. SESSION127c-AUDIT.md §3 documents the full
  //     mechanism + DS15 raw-routing reproduction (per-group: Control
  //     binomP 0.0019, Treatment binomP 0.000001 → Fisher's chi 41.13 →
  //     fisherP ≈ 0 → aggregate HIGH despite both per-group LOW).
  const FISHER_EXEMPT = new Set([
    "Excess Kurtosis",
    "Windowed Autocorrelation",
    "Blocked Mahalanobis",
    "Mahalanobis Row Outlier",
  ]);
  const proto=applicable[0].result;
  const useFisher = applicable.length >= 2 && !FISHER_EXEMPT.has(proto.name);
  const validPs = groupPs.filter(p => p !== null && p > 0 && isFinite(p));
  if(useFisher && validPs.length >= 2) {
    fisherChi = -2 * validPs.reduce((s, p) => s + Math.log(Math.max(p, 1e-300)), 0);
    const fisherDF = 2 * validPs.length;
    fisherP = chiSquaredP(fisherChi, fisherDF);
    fisherFlag = flagFromP(fisherP);
  }

  // Scenario C: Fisher's can only promote
  const flag = flagRankOf(fisherFlag) >= flagRankOf(worstGroupFlag)
    ? fisherFlag : worstGroupFlag;

  // Build per-group summary table (top-level details)

  const details=perGroup.map(r=>({
    group:r.group,
    rows:r.n,
    nRowsTested: r.result.nRows || r.n, // valid rows actually tested (e.g. after null removal)
    flag:r.result.flag,
    ...(r.result.flag!=="N/A"?
      // pick the most informative numeric field per test
      pickSummaryNums(r.result) :
      {note:"N/A"})
  }));

  // Collect sub-details from all applicable groups.
  // Even LOW groups may have individual outlier rows worth investigating
  // (e.g. Mahalanobis: binomial test LOW but specific rows are extreme).
  const subDetails=applicable
    .flatMap(r=>(r.result.details||[]).slice(0,50).map(d=>({group:r.group,...d})));

  // Collect decay curves if present (autocorrelation test)
  const decayCurves = applicable
    .filter(r=>r.result.decayCurve)
    .map(r=>({group:r.group, curve:r.result.decayCurve}));

  // Collect per-group autocorrelation stats (for condition table)
  const condAutocorr = applicable
    .filter(r=>r.result.pooledMeanR1!==undefined)
    .map(r=>({
      condition:r.group,
      meanR1: typeof r.result.pooledMeanR1 === 'number' ? r.result.pooledMeanR1 : parseFloat(r.result.pooledMeanR1),
      pooledT: r.result.pooledT,
      p: r.result.pooledP,
      rawP: r.result.primaryP,
      nPairs: r.result.nPairs,
      flag: r.result.flag
    }));
  // Mark if conditions differ (worst individually flagged but not all)
  if(condAutocorr.length >= 2) {
    const fRank = f => f==="HIGH"?3:f==="MODERATE"?2:f==="LOW"?1:0;
    const worstCond = Math.max(...condAutocorr.map(c=>fRank(c.flag)));
    const bestCond = Math.min(...condAutocorr.map(c=>fRank(c.flag)));
    if(worstCond > bestCond && worstCond >= 2) condAutocorr.promoted = true;
  }

  // Pool normalised differences if present (kurtosis test)
  const allNorm = applicable
    .filter(r=>r.result.normDiffs?.length)
    .flatMap(r=>r.result.normDiffs);
  const allSim = applicable
    .filter(r=>r.result.simDiffs?.length)
    .flatMap(r=>r.result.simDiffs);

  // Collect per-group kurtosis stats (for condition table)
  // When column-grouped groups exist, each group's kurtosis is computed
  // independently. Assemble into condKurtosis format for the MiniCard table.
  const condKurtosis = applicable
    .filter(r=>r.result.pooledKurtosis!==undefined && r.result.pooledKurtosis!==null)
    .map(r=>{
      const kDev = parseFloat(r.result.kurtDeviation) || 0;
      return {
        condition: r.group,
        n: r.n,
        nDiffs: r.result.pooledN || 0,
        kurtosis: typeof r.result.pooledKurtosis === 'number' ? r.result.pooledKurtosis.toFixed(4) : r.result.pooledKurtosis,
        kurtDeviation: typeof kDev === 'number' ? kDev.toFixed(4) : r.result.kurtDeviation,
        p: r.result.pooledP,
        rawP: r.result.primaryP,
        platykurtic: kDev < -0.20,
        normDiffs: r.result.normDiffs || []
      };
    })
    .sort((a, b) => parseFloat(a.kurtDeviation) - parseFloat(b.kurtDeviation));

  // Collect sign sequences per group (runs test strip plot)
  const groupSignSeqs = applicable
    .filter(r=>r.result.firstPairSigns?.length)
    .map(r=>({
      group: r.group,
      signs: r.result.firstPairSigns,
      runs: r.result.firstPairRuns,
      expected: r.result.firstPairExp,
      label: r.result.worstPairLabel,
    }));

  // Collect per-group runs test stats (for condition table)
  const condRuns = applicable
    .filter(r=>r.result.pooledMeanZ!==undefined)
    .map(r=>({
      condition:r.group,
      meanZ: typeof r.result.pooledMeanZ === 'number' ? r.result.pooledMeanZ : parseFloat(r.result.pooledMeanZ),
      nPairs: r.result.nPairs,
      rawP: r.result.primaryP,
      flag: r.result.flag,
      mostExtreme: r.result.mostExtremePair
    }));
  if(condRuns.length >= 2) {
    const fRank = f => f==="HIGH"?3:f==="MODERATE"?2:f==="LOW"?1:0;
    const worstCond = Math.max(...condRuns.map(c=>fRank(c.flag)));
    const bestCond = Math.min(...condRuns.map(c=>fRank(c.flag)));
    if(worstCond > bestCond && worstCond >= 2) condRuns.promoted = true;
  }

  // Collect per-group constant-offset stats (for condition table)
  const condConstOffset = applicable
    .filter(r=>r.result.consecutiveEqualDiffs!==undefined)
    .map(r=>({
      condition:r.group,
      blocks: parseInt(r.result.consecutiveEqualDiffs) || 0,
      blockRate: r.result.blockRate,
      rawP: r.result.primaryP,
      flag: r.result.flag
    }));
  if(condConstOffset.length >= 2) {
    const fRank = f => f==="HIGH"?3:f==="MODERATE"?2:f==="LOW"?1:0;
    const worstCond = Math.max(...condConstOffset.map(c=>fRank(c.flag)));
    const bestCond = Math.min(...condConstOffset.map(c=>fRank(c.flag)));
    if(worstCond > bestCond && worstCond >= 2) condConstOffset.promoted = true;
  }

  // Collect per-group regional noise stats (for condition table)
  const condRegionalNoise = applicable
    .filter(r=>r.result.bestWindowRows!==undefined && r.result.bestWindowRows !== "—")
    .map(r=>({
      condition:r.group,
      bestRows: r.result.bestWindowRows,
      bestRatio: r.result.bestVarRatio,
      bestCol: r.result.bestAnomCol,
      rawP: r.result.primaryP,
      flag: r.result.flag
    }));
  if(condRegionalNoise.length >= 2) {
    const fRank = f => f==="HIGH"?3:f==="MODERATE"?2:f==="LOW"?1:0;
    const worstCond = Math.max(...condRegionalNoise.map(c=>fRank(c.flag)));
    const bestCond = Math.min(...condRegionalNoise.map(c=>fRank(c.flag)));
    if(worstCond > bestCond && worstCond >= 2) condRegionalNoise.promoted = true;
  }

  return{
    name:proto.name, category:proto.category, description:proto.description,
    flag,
    groupsAssessed:applicable.length,
    groupsFlagged:applicable.filter(r=>r.flag==="HIGH"||r.flag==="MODERATE").length,
    fisherChi:fisherChi.toFixed(2), fisherDF:validPs.length*2, fisherP:fisherP.toFixed(4),
    // Propagate test-specific metrics from the worst-flagged group so that
    // display code and copy-summary can read them at the top level.
    // S166 A6/A7: also surface the worst group's NAME as `worstGroup` so
    // condition-grouped MiniCards (Runs Test footer / "All replicate pairs"
    // table) can name the condition whose data the spread carries — closes
    // the DS02 "pooled" mislabel where the worst group's metrics were
    // top-level without identification.
    ...(() => {
      const worst = [...applicable].sort((a,b) => flagRankOf(b.flag)-flagRankOf(a.flag))[0];
      if(!worst) return {};
      const skip = new Set(["name","category","flag","description","details","interpretation"]);
      const out = { worstGroup: worst.group };
      for(const [k,v] of Object.entries(worst.result)) { if(!skip.has(k)) out[k]=v; }
      return out;
    })(),
    details,
    subDetails:subDetails.slice(0,100),
    ...(decayCurves.length ? {perGroupDecay:decayCurves} : {}),
    ...(condAutocorr.length >= 2 ? {condAutocorr} : {}),
    ...(condRuns.length >= 2 ? {condRuns} : {}),
    ...(condConstOffset.length >= 2 ? {condConstOffset} : {}),
    ...(condRegionalNoise.length >= 2 ? {condRegionalNoise} : {}),
    ...(condKurtosis.length >= 2 ? {condKurtosis} : {}),
    ...(allNorm.length ? {normDiffs:allNorm} : {}),
    ...(allSim.length ? {simDiffs:allSim, simKurtosis:allSim.length>=3000?trimmedKurtosis(allSim):kurtosis(allSim)} : {}),
    ...(groupSignSeqs.length ? {groupSignSeqs} : {})
  };
}

function pickSummaryNums(r) {
  // Return 1-2 key numeric stats depending on test type
  if(r.consecutiveEqualDiffs!==undefined)
    return{blocks:r.consecutiveEqualDiffs, rate:r.blockRate};
  if(r.maxMinVarianceRatio!==undefined)
    return{varRatio:r.maxMinVarianceRatio};
  if(r.nSignificant!==undefined)
    return{sigPairs:r.nSignificant, ofPairs:r.nPairs, platykurtic:r.nPlatykurtic};
  if(r.bestRuns!==undefined)
    return{runs:r.bestRuns, expected:r.bestExpected, z:r.bestZ};
  return{};
}

export { buildGroups, extractPrimaryP, aggregatePerGroup, pickSummaryNums };
