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

   S327 — refuse, do not fall back. When the confirmed grouping yields no
   usable partition (rowGroups() null — the sixty-singleton case on C16), each
   of the four tests returns not-applicable naming its OWN minimum against what
   the grouping actually gives. It does NOT fall through to the pooled run.
   A pooled verdict returned after the user confirmed a grouping is a verdict
   computed on a basis they did not confirm, and nothing downstream
   distinguishes it from a grouped one — the S317 defect, one surface on.

   The refusal is per test, not per grouping: a group set can clear one test's
   minimum and not another's (Column Goodness-of-Fit needs 30 per group,
   Modality 50), so each test is asked separately. The four reason strings are
   deliberately distinct — groupNotApplicableByReason keys on exact match, and
   collapsing them would hide which test needs what.

   The refusal fires only when a grouping was ATTEMPTED and came back unusable.
   An empty ticked set is a different state (the user grouped on nothing) and
   keeps the pooled path.

   If the engine's four-test dispatch changes, update this to match. */

import { extractAnalysisInputs } from './engine.js';
import { aggregatePerGroup } from './aggregation.js';
import { createPRNGFactory } from '../stats/prng.js';
import { DATATYPE_SKIP, DATATYPE_CAUSE, joinDeclineReason } from '../constants/assays.js';
import { NA_CAUSE } from '../constants/naCause.js';
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

  // Per-test streams (S340), same scheme as engine.js. The identifiers are the
  // engine's dispatch-map keys, so a test seeded here and the same test seeded
  // by the engine agree whenever they see the same matrix.
  const rngFor = createPRNGFactory(matrix);
  // Same three-field emit as engine.js's dtSkip, joined through the same
  // helper so the two can't drift. Presence is a key test — a tail of "" is a
  // real entry whose whole reason is the shared cause.
  const skipMap = DATATYPE_SKIP[dataType] || {};
  const skipCause = DATATYPE_CAUSE[dataType] || null;
  const dtSkip = (name, category) => {
    if (!skipCause || !(name in skipMap)) return null;
    const tail = skipMap[name];
    return { name, category, flag: 'N/A', naCause: NA_CAUSE.DATA_TYPE_MISMATCH,
      description: joinDeclineReason(skipCause, tail), naCauseText: skipCause, naTailText: tail };
  };
  const tagVST = (r) => { if (hasVST && r) r.vstTransform = vstType; return r; };

  // ── S327 refusal ──
  // rowGroupsStatus() is rowGroups()' diagnostic sibling: same null conditions,
  // plus the counts that explain them. `attempted && !usable` is exactly "the
  // user confirmed a grouping and it cannot support a grouped test".
  const rgStatus = condCtx?.rowGroupsStatus?.() || { attempted: false, usable: false };
  const groupingUnusable = !!(rgStatus.attempted && !rgStatus.usable);
  // Shared opening clause — what the confirmed grouping actually gives. Each
  // caller appends its own minimum, so the four strings never collide.
  //
  // The clause no longer opens "Not applicable". A refusal is not a
  // not-applicable: the data shape supports the test, and the grouping the user
  // confirmed does not. The display now carries that distinction in the header,
  // so repeating a wrong word in the body would only contradict it.
  const givesClause = () => {
    const n = rgStatus.nGroups ?? 0, mx = rgStatus.maxSize ?? 0;
    return `The confirmed grouping gives ${n} ${n === 1 ? "group" : "groups"}, ` +
           `the largest with ${mx} ${mx === 1 ? "row" : "rows"}`;
  };
  // One builder for all four refusals so the marker fields cannot drift apart.
  // The figures were only ever in the prose; carrying them as fields is what
  // lets the display tell a refusal from a settled not-applicable without
  // parsing a sentence. Same shape the skip uses for its size-ceiling figures.
  // All four refusals read one rgStatus, so givesClause() hands each of them the
  // same sentence on any given run. That made the opener shared in fact but not
  // in code: with no cause field every refusal keyed on its whole description and
  // rendered its own block. Emitting the cause and the tail puts them in the
  // cause key space, where groupNotApplicableByReason states the opener once and
  // indents the four minimums under it. description is composed through
  // joinDeclineReason and stays byte-identical to the string it always was.
  const refuse = (name, category, needClause, naCause, naMinimum) => {
    const cause = `${givesClause()}.`;
    return {
      name, category, flag: "N/A", naCause,
      naObserved: rgStatus.maxSize ?? 0, naMinimum,
      description: joinDeclineReason(cause, needClause),
      naCauseText: cause,
      naTailText: needClause,
      confirmedGroups: rgStatus.nGroups ?? 0,
      confirmedLargestGroup: rgStatus.maxSize ?? 0,
    };
  };

  // ── Mahalanobis Row Outlier (engine.js:430-479) ──
  const mahal = await (async () => {
    const dt = dtSkip('Mahalanobis Row Outlier', 'distributional'); if (dt) return dt;
    if (assay === 'genomics') return { name: 'Mahalanobis Row Outlier', category: 'distributional', flag: 'N/A', naCause: NA_CAUSE.ASSAY_NOT_APPLICABLE,
      description: 'Not applicable to genomics data. This test flags rows that sit far from the rest, assuming the measurements follow a bell-shaped spread. Gene-expression counts do not, and normal biological variation puts many genes far out without anything being wrong.' };
    if ((matrix[0]?.length || 0) < MAHAL_MIN_COLS) {
      return { name: "Mahalanobis Row Outlier", category: "replicate", flag: "N/A", naCause: NA_CAUSE.TOO_FEW_COLUMNS, naObserved: matrix[0]?.length || 0, naMinimum: MAHAL_MIN_COLS,
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
    if (groupingUnusable) {
      const nCols = matrix[0]?.length || 0;
      return refuse("Mahalanobis Row Outlier", "replicate",
        `This test needs ${3 * nCols} rows in one group to estimate a stable covariance across ${nCols} columns.`, NA_CAUSE.TOO_FEW_ROWS, 3 * nCols);
    }
    // Pooled fallback (single group / no row-groups): engine.js:478 runPairVST.
    return tagVST(hasVST ? testMahalanobisOutlier(vstMatrix, assay) : testMahalanobisOutlier(matrix, assay));
  })();

  // ── Entropy / Zipf (engine.js:519-525) — no upfront check on either path ──
  const entropy = await (async () => {
    const dt = dtSkip('Entropy / Zipf Analysis', 'noise'); if (dt) return dt;
    const rg = condCtx?.rowGroups();
    if (rg) return await aggregatePerGroup(m => testEntropy(m, rngFor('Entropy / Zipf Analysis'), dataType), rg);
    if (groupingUnusable) {
      return refuse("Entropy / Zipf Analysis", "shapes",
        "No group is large enough to analyse — this test needs at least 20 values in a column within a group.", NA_CAUSE.TOO_FEW_OBSERVATIONS, 20);
    }
    return testEntropy(matrix, rngFor('Entropy / Zipf Analysis'), dataType);
  })();

  // ── Column Goodness-of-Fit (engine.js:526-538) ──
  const colgof = await (async () => {
    const dt = dtSkip('Column Goodness-of-Fit', 'shapes'); if (dt) return dt;
    const rg = condCtx?.rowGroups();
    if (rg) {
      if (noGroupMeetsMin(rg, GOF_MIN_OBS)) {
        return { name: "Column Goodness-of-Fit", category: "shapes", flag: "N/A", naCause: NA_CAUSE.TOO_FEW_OBSERVATIONS, naObserved: Math.max(...rg.map(g => g.matrix.length)), naMinimum: GOF_MIN_OBS,
          description: `Not applicable — no condition group has the ${GOF_MIN_OBS} values this goodness-of-fit test needs to fit a distribution.` };
      }
      return await aggregatePerGroup(m => testColumnGof(m, rngFor('Column Goodness-of-Fit'), dataType), rg);
    }
    if (groupingUnusable) {
      return refuse("Column Goodness-of-Fit", "shapes",
        `This test needs ${GOF_MIN_OBS} values in a group to fit a distribution.`, NA_CAUSE.TOO_FEW_OBSERVATIONS, GOF_MIN_OBS);
    }
    return testColumnGof(matrix, rngFor('Column Goodness-of-Fit'), dataType);
  })();

  // ── Modality (engine.js:539-556) ──
  const modality = await (async () => {
    const dt = dtSkip('Modality Test', 'shapes'); if (dt) return dt;
    const rg = condCtx?.rowGroups();
    if (rg) {
      if (noGroupMeetsMin(rg, MODALITY_MIN_N)) {
        return { name: "Modality Test", category: "shapes", flag: "N/A", naCause: NA_CAUSE.TOO_FEW_OBSERVATIONS, naObserved: Math.max(...rg.map(g => g.matrix.length)), naMinimum: MODALITY_MIN_N,
          description: `Not applicable — no condition group has the ${MODALITY_MIN_N} values this modality test needs.` };
      }
      return await aggregatePerGroup(m => testModality(m, rngFor('Modality Test'), dataType), rg);
    }
    if (groupingUnusable) {
      return refuse("Modality Test", "shapes",
        `This test needs ${MODALITY_MIN_N} values in a group.`, NA_CAUSE.TOO_FEW_OBSERVATIONS, MODALITY_MIN_N);
    }
    return testModality(matrix, rngFor('Modality Test'), dataType);
  })();

  return [mahal, entropy, colgof, modality];
}
