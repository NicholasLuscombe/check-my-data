/* ── confirmGrouping — run the four grouped tests on a confirmed grouping ──
   S321 move 2, round 3 (the confirm action).

   When the grouping-enforcement trigger is pending, the engine returns the four
   row-grouped tests as N/A pending. The confirm card lets the user accept a
   grouping (a ticked subset of the condition columns); on confirm, those four
   tests must RUN on that grouping and produce real verdicts. This runs exactly
   those four — and only those four — on a chosen ticked set. No other test, no
   battery. The S321 confirm-cost read measured this at ~0.19 s on C09.

   KEEP IN SYNC with engine.js. This mirrors the engine's four-test dispatch:
     Mahalanobis Row Outlier  engine.js:430-479
     Entropy / Zipf Analysis  engine.js:519-525
     Column Goodness-of-Fit   engine.js:526-538
     Modality Test            engine.js:539-556
   plus the VST prep (engine.js:276-297) and the PRNG seed (engine.js:197). It
   reuses the SAME test functions, aggregatePerGroup, and extractAnalysisInputs
   the engine uses. As of S325 it also carries the SAME upfront applicability
   checks as the engine, from the shared src/analysis/applicability.js — so it
   drops only the groupingPending guard, which is the point of confirm.

   One divergence remains, and it is a known open gap, not a caveat: when
   rowGroups() returns null (a grouping of singletons), the engine returns the
   four tests as pending, but this path has dropped that guard and falls through
   to the pooled run. So a confirmed grouping of singletons is analysed pooled
   here where the engine would hold it. That is a confirm-card surface decision,
   held separately; it is not fixed by this module.

   If the engine's four-test dispatch changes, update this to match. */

import { extractAnalysisInputs } from './engine.js';
import { aggregatePerGroup } from './aggregation.js';
import { createPRNG } from '../stats/prng.js';
import { DATATYPE_SKIP } from '../constants/assays.js';
import { noGroupMeetsMin } from './applicability.js';
import { testMahalanobisOutlier, MIN_COLS as MAHAL_MIN_COLS } from '../tests/mahalanobis.js';
import { testEntropy } from '../tests/entropyTest.js';
import { testColumnGof, MIN_OBS as GOF_MIN_OBS } from '../tests/columnGof.js';
import { testModality, MIN_N as MODALITY_MIN_N } from '../tests/modality.js';

/**
 * Run the four grouped tests on a confirmed grouping.
 *
 * @param {Object} args
 * @param {any[][]} args.data - Raw imported rows (importConfig.data).
 * @param {string[]} args.roles - Per-column role map (importConfig.roles).
 * @param {number[]} args.condColSet - Ticked condition-column indices to group on.
 * @param {boolean} [args.zeroAsMissing] - Import zero-as-missing flag.
 * @param {string} args.assay
 * @param {string} [args.dataType='continuous']
 * @param {Object} [args.vst] - The VST decision (importConfig.vst); reused, not re-detected.
 * @returns {Promise<Object[]>} the four result objects (Mahalanobis, Entropy, Column GoF, Modality).
 */
export async function runConfirmedGroupedTests({ data, roles, condColSet, zeroAsMissing = false, assay, dataType = 'continuous', vst }) {
  // Group on the TICKED set only. A condition column the user unticked drops to
  // 'label' — out of the grouping key, still out of the numeric matrix. Data
  // columns are untouched, so the matrix is byte-identical to the engine's.
  const set = new Set(condColSet || []);
  const confirmedRoles = roles.map((r, i) => (r === 'condition' && !set.has(i)) ? 'label' : r);
  const { matrix, condCtx } = extractAnalysisInputs({
    data, roles: confirmedRoles, condPerCol: null, zeroAsMissing,
    colRelationship: 'replicates', dataColHeaders: null,
  });

  // VST prep — mirrors engine.js:276-297. Reuse the import-time decision.
  const vstType = vst?.transform || 'raw';
  let vstMatrix = null;
  if (vstType === 'log') vstMatrix = matrix.map(row => row.map(v => v != null && v > 0 ? Math.log(v) : null));
  else if (vstType === 'anscombe') vstMatrix = matrix.map(row => row.map(v => v != null && v >= 0 ? Math.sqrt(v + 0.375) : null));
  const hasVST = vstMatrix !== null;
  const vstCondCtx = hasVST ? condCtx.withMatrix(vstMatrix) : null;

  const rng = createPRNG(matrix);
  const skipMap = DATATYPE_SKIP[dataType] || {};
  const dtSkip = (name, category) => { const reason = skipMap[name]; return reason ? { name, category, flag: 'N/A', description: reason } : null; };
  const tagVST = (r) => { if (hasVST && r) r.vstTransform = vstType; return r; };

  // ── Mahalanobis Row Outlier (engine.js:430-479) ──
  const mahal = await (async () => {
    const dt = dtSkip('Mahalanobis Row Outlier', 'distributional'); if (dt) return dt;
    if (assay === 'genomics') return { name: 'Mahalanobis Row Outlier', category: 'distributional', flag: 'N/A',
      description: 'Not applicable to genomics data. Count distributions violate the multivariate normality assumption required for χ²-based D² thresholds. Biological expression heterogeneity produces widespread outliers that are not anomalous.' };
    if ((matrix[0]?.length || 0) < MAHAL_MIN_COLS) {
      return { name: "Mahalanobis Row Outlier", category: "replicate", flag: "N/A",
        description: `Not applicable with fewer than ${MAHAL_MIN_COLS} replicate columns — the row-distance measure this test uses needs at least that many.` };
    }
    const mahalCtx = hasVST ? vstCondCtx : condCtx;
    const mahalGroups = mahalCtx?.rowGroups();
    if (mahalGroups) {
      const stratResult = tagVST(await aggregatePerGroup(m => testMahalanobisOutlier(m, assay), mahalGroups));
      const allCondD2 = mahalGroups.map(g => {
        const r = testMahalanobisOutlier(g.matrix, assay);
        const mapped = (r.plotD2Rows || []).map(si => si < g.rowIndices.length ? g.rowIndices[si] : si);
        return { condition: g.name, plotD2: r.plotD2 || [], plotD2Rows: mapped, plotThreshold: r.plotThreshold, outlierThreshold: r.outlierThreshold };
      });
      stratResult.allCondD2 = allCondD2;
      return stratResult;
    }
    // Pooled fallback (single group / no row-groups): engine.js:478 runPairVST.
    return tagVST(hasVST ? testMahalanobisOutlier(vstMatrix, assay) : testMahalanobisOutlier(matrix, assay));
  })();

  // ── Entropy / Zipf (engine.js:519-525) — no upfront check on either path ──
  const entropy = await (async () => {
    const dt = dtSkip('Entropy / Zipf Analysis', 'noise'); if (dt) return dt;
    const rg = condCtx?.rowGroups();
    if (rg) return await aggregatePerGroup(m => testEntropy(m, rng, dataType), rg);
    return testEntropy(matrix, rng, dataType);
  })();

  // ── Column Goodness-of-Fit (engine.js:526-538) ──
  const colgof = await (async () => {
    const dt = dtSkip('Column Goodness-of-Fit', 'shapes'); if (dt) return dt;
    const rg = condCtx?.rowGroups();
    if (rg) {
      if (noGroupMeetsMin(rg, GOF_MIN_OBS)) {
        return { name: "Column Goodness-of-Fit", category: "shapes", flag: "N/A",
          description: `Not applicable — no condition group has the ${GOF_MIN_OBS} values this goodness-of-fit test needs to fit a distribution.` };
      }
      return await aggregatePerGroup(m => testColumnGof(m, rng, dataType), rg);
    }
    return testColumnGof(matrix, rng, dataType);
  })();

  // ── Modality (engine.js:539-556) ──
  const modality = await (async () => {
    const dt = dtSkip('Modality Test', 'shapes'); if (dt) return dt;
    const rg = condCtx?.rowGroups();
    if (rg) {
      if (noGroupMeetsMin(rg, MODALITY_MIN_N)) {
        return { name: "Modality Test", category: "shapes", flag: "N/A",
          description: `Not applicable — no condition group has the ${MODALITY_MIN_N} values this modality test needs.` };
      }
      return await aggregatePerGroup(m => testModality(m, rng, dataType), rg);
    }
    return testModality(matrix, rng, dataType);
  })();

  return [mahal, entropy, colgof, modality];
}
