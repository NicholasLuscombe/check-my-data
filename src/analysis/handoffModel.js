/* ── Shared handoff content model (S161, A1.D2) ──────────────────────────
 *
 * Pure-data structure built from engine results + importConfig. Two
 * consumers:
 *
 *   - src/analysis/promptBodyRenderer.js — §4 "Investigate further" prompt
 *     body string-rendered for clipboard copy
 *   - src/export/excelExport.js — header strings + finding summaries in the
 *     downloadable Excel report
 *
 * Single source of truth for the user-facing vocabulary (outcome label,
 * cluster phrasing, VST label, assay label, finding cluster headers) used
 * across the two surfaces. Pre-S161 each surface built its own strings
 * directly from results + constants, with implicit drift between Excel
 * vocabulary and §4 prompt-body vocabulary; the model unifies the source.
 *
 * Phase A scope: minimal per-finding content — `location` is the
 * testLocalisation-style summary mirroring src/export/excelExport.js:185
 * ("3 regions" / "5 blocks" / "Global"), `evidenceLines` is the
 * [r.interpretation, fmtP(r.primaryP)] pair. The DS08-rich form documented
 * in SESSION160-SUMMARY.md (per-test bespoke statistical phrasing) is
 * Phase B — author per-test composers in a future session and swap in
 * here.
 */

import { ASSAYS, DATA_TYPES } from "../constants/assays.js";
import {
  MECHANISMS,
  MECHANISM_ORDER,
  TEST_MECHANISM,
  TEST_METHODS,
} from "../constants/mechanisms.js";
import { VST_LABEL } from "../stats/vst.js";
import { computeSeverity } from "./severity.js";
import { classifyCoverage, clusterCoverageState, isWithheld, summarizeCoverage } from "./coverage.js";
import { fmtP } from "../constants/thresholds.js";
import { composeFinding } from "./findingComposers.js";
// S374 (P155) — the row mapper the cards already use. Imported rather than
// re-derived: `toFileRow(n) = n + skippedRows + headerRows`, and a second copy
// of that arithmetic here is how the prompt and the cards drift apart.
// excelExport.js already imports from this module, so a non-component consumer
// of it is the established shape.
import { makeRowMapper } from "../components/shared/coordinates.js";

// S156 D5 Outcome ladder (locked). Engine severity 0–3 → outcome positions
// 1–4 of 4. Renderer formats as "Outcome: {tier+1} of 4 — {label}".
const OUTCOME_LABEL = ["Proceed", "Review", "Investigate", "Investigate closely"];
const OUTCOME_HEADLINE = [
  "All checks passed",
  "Some findings warrant a closer look",
  "Multiple anomalies detected",
  "Significant anomalies detected",
];

/**
 * @typedef {Object} Finding
 * @property {string} testName        Canonical engine test name (e.g. "Benford's Law (First Digit)")
 * @property {string} clusterLabel    Lowercase bare noun phrase (e.g. "unusual digits"); renderer appends " cluster"
 * @property {string} methodVerbatim  TEST_METHODS source string, pasted as-is
 * @property {string} location        Phase A: localisation summary ("3 regions" / "Global" / "5 blocks")
 * @property {string[]} evidenceLines Phase A: [interpretation, p-value-line] — one entry per render line
 */

/**
 * @typedef {Object} FlaggedClusterClearedGroup
 * @property {string} clusterLabel    Lowercase bare noun phrase (renderer appends " cluster")
 * @property {string[]} clearedTests  Test names that cleared in this flagged cluster.
 *                                    Empty array signals the renderer to emit the
 *                                    "no other applicable tests in this cluster ran…"
 *                                    fallback line.
 */

/**
 * @typedef {Object} ClusterSummary
 * @property {string} clusterLabel    Pre-formatted title-case form: "Unusual digits cluster"
 * @property {number} testCount       Count of tests that ran in this cluster
 * @property {string[]} testNames     Canonical test names, in engine order
 */

/**
 * @typedef {Object} PartlyAssessedCluster
 * @property {string} clusterLabel        Pre-formatted title-case form: "Copy-paste/edit cluster"
 * @property {number} clearedCount        Tests that ran and cleared
 * @property {number} couldRun            Tests that were on the table — cleared plus withheld.
 *                                        Read from clusterCoverageState so the fraction is the
 *                                        same number the §3 cluster header renders, not a
 *                                        second derivation of it.
 * @property {string[]} testNames         Canonical names of the cleared tests, engine order
 * @property {string[]} withheldTestNames Canonical names of the withheld tests, engine order
 */

/**
 * @typedef {Object} SkippedTest
 * @property {string} testName
 * @property {string} reason          Engine-emitted r.description, verbatim
 */

/**
 * @typedef {Object} HandoffModel
 * @property {{filename:string,rows:number,cols:number,assay:string,assayProvenance:string,dataType:string,conditions:string[]|null,vstLabel:string,vstProvenance:string}} dataset
 * @property {{tier:0|1|2|3,label:string,headline:string,applicableTests:number,flaggedCount:number,notedCount:number}} outcome
 * @property {{high:Finding[],moderate:Finding[],clearedInFlaggedClusters:FlaggedClusterClearedGroup[],otherClustersAllClear:ClusterSummary[],otherClustersPartlyAssessed:PartlyAssessedCluster[],notRun:SkippedTest[],notRunFootnote:string}} findings
 */

function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Phase A location summary. Mirrors src/export/excelExport.js:185
// `testLocalisation` shape — kept here without row-mapping (rowMap is an
// excel-specific concern; the prompt body uses dataset-relative counts).
// S162b dispatches `composeFinding(r, ctx)` first; this remains the
// fallback for tests with no bespoke composer entry in
// findingComposers.js's FINDING_COMPOSERS registry.
function locationOf(r) {
  if (r.blockCopies?.length) {
    const n = r.blockCopies.length;
    return `${n} block${n > 1 ? "s" : ""}`;
  }
  if (r.rowDupGroupList?.length) {
    const n = r.rowDupGroupList.length;
    return `${n} duplicate group${n > 1 ? "s" : ""}`;
  }
  if (r.details?.length && r.details[0]?.rows) {
    const n = r.details.length;
    return `${n} region${n > 1 ? "s" : ""}`;
  }
  if (r.details?.length && r.details[0]?.Row !== undefined) {
    const n = r.details.length;
    return `${n} row${n > 1 ? "s" : ""}`;
  }
  return "Global";
}

// Phase A evidence shape: [interpretation, primaryP line]. S162b dispatches
// per-test composers ahead of this; the fallback fires when the test has no
// composer entry. Tests that emit no `interpretation` field fall through to
// a primaryP-only line under Phase A — Phase B composers fix this for every
// fired test.
function evidenceOf(r) {
  const lines = [];
  if (r.interpretation) lines.push(r.interpretation);
  if (r.primaryP != null && !Number.isNaN(r.primaryP)) {
    lines.push(`primaryP = ${fmtP(r.primaryP)}`);
  }
  return lines.length > 0
    ? lines
    : ["(no further detail emitted by the engine for this test)"];
}

function clusterKeyOf(r) {
  return TEST_MECHANISM[r.name] || "replicate";
}

function buildFinding(r, ctx) {
  const key = clusterKeyOf(r);
  const composed = composeFinding(r, ctx);
  return {
    testName: r.name,
    clusterLabel: MECHANISMS[key]?.clusterLabel || key,
    methodVerbatim: TEST_METHODS[r.name] || "",
    location: composed ? composed.location : locationOf(r),
    evidenceLines: composed ? composed.evidenceLines : evidenceOf(r),
  };
}

function buildDataset(importConfig, nRows, nCols) {
  const assayEntry = ASSAYS.find(a => a.v === importConfig.assay);
  const dataTypeEntry = DATA_TYPES.find(
    d => d.v === (importConfig.dataType || "continuous")
  );
  const conditions =
    importConfig.summary?.cNames?.length > 0
      ? importConfig.summary.cNames.slice()
      : null;
  const vstTransform = importConfig.vst?.transform || "raw";
  return {
    filename: importConfig.fileName || "uploaded",
    rows: nRows,
    cols: nCols,
    assay: assayEntry?.l || importConfig.assay || "general",
    // Three states, not two: 'auto' (something computed it from the data),
    // 'user-set' (a human answered), 'assumed' (a default supplied it —
    // nothing computed it and nobody chose it). A boolean cannot carry the
    // third, and this text goes to an LLM that reasons in the words it is
    // given: told "(auto)", it treats a hardcoded default as a measurement.
    // Same precedence the banner's provTag uses — provenance wins where a
    // surface supplies it, the older boolean decides otherwise.
    assayProvenance:
      importConfig.provenance?.assay ||
      (importConfig.assayAutoDetected ? "auto" : "user-set"),
    dataType: dataTypeEntry?.l || "Continuous",
    conditions,
    vstLabel: VST_LABEL[vstTransform] || vstTransform,
    vstProvenance: importConfig.vst?.reason || "",
  };
}

function buildOutcome(severity, results) {
  // applicableTests is the multiple-comparison denominator the outcome-1
  // prologue quotes ("With N applicable tests at α=0.01…"). It counts the tests
  // that applied to this data: the ones that ran, plus the ones that were
  // withheld by decision. A withheld test was on the table — the battery took
  // that chance whether or not the result is reported — so excluding it
  // understates the denominator. The old `flag !== "N/A"` form could not see the
  // difference, because a withheld test's flag is "N/A" like any decline.
  const cov = summarizeCoverage(results);
  return {
    tier: severity,
    label: OUTCOME_LABEL[severity] || "Unknown",
    headline: OUTCOME_HEADLINE[severity] || "",
    applicableTests: cov.ran + cov.withheld,
    flaggedCount: results.filter(r => r.flag === "HIGH" || r.flag === "MODERATE")
      .length,
    notedCount: results.filter(r => r.flag === "MODERATE").length,
  };
}

function buildFindings(results, dataset, toFileRow) {
  // ctx shape (S162b): minimal dataset slice the composers consume.
  // Conditions are the only branching signal used today (IRC's multi-
  // condition naming, SelNoise's per-condition narration). Threading the
  // full dataset slot keeps the door open for nRows / nCols / vstLabel
  // usage as composers extend.
  //
  // S374 (P155): ctx also carries toFileRow. Producers emit 1-indexed MATRIX
  // rows; the cards convert and this prompt did not, so the two disagreed by
  // (skippedRows + headerRows) on every fixture. Composers apply it at each
  // coordinate they print — never as a wrapper over the whole string, because
  // the same findings also print row COUNTS, which must not move.
  const ctx = { dataset, toFileRow };
  const conditions = dataset.conditions;
  const high = results.filter(r => r.flag === "HIGH").map(r => buildFinding(r, ctx));
  const moderate = results.filter(r => r.flag === "MODERATE").map(r => buildFinding(r, ctx));

  // Flagged clusters = clusters with at least one HIGH or MODERATE finding.
  // Ordered by **first appearance** in the combined HIGH→MODERATE finding
  // list (mirrors the locked DS08 template ordering — clusters appear in
  // the order their findings first emerge, not by MECHANISM_ORDER). This
  // keeps the "Cleared (within flagged clusters)" block aligned with the
  // sequence the reader has already encountered in the HIGH / MODERATE
  // sections above.
  const flaggedClusterKeys = [];
  const seenClusters = new Set();
  for (const r of results) {
    if (r.flag !== "HIGH" && r.flag !== "MODERATE") continue;
    const key = clusterKeyOf(r);
    if (seenClusters.has(key)) continue;
    seenClusters.add(key);
    flaggedClusterKeys.push(key);
  }
  // HIGH-then-MODERATE pre-sort: results array preserves engine order, but
  // HIGH and MODERATE intermingle. The renderer emits HIGH findings first,
  // then MODERATE; pre-sort flaggedClusterKeys to match that emission
  // order so a cluster that has only MODERATE findings doesn't lead the
  // cleared list over a HIGH-led cluster.
  flaggedClusterKeys.sort((a, b) => {
    const aH = results.some(r => r.flag === "HIGH" && clusterKeyOf(r) === a);
    const bH = results.some(r => r.flag === "HIGH" && clusterKeyOf(r) === b);
    if (aH && !bH) return -1;
    if (!aH && bH) return 1;
    return 0;
  });

  // Cleared (LOW) tests grouped by flagged cluster. One entry per flagged
  // cluster, always emitted; empty `clearedTests` array signals the
  // renderer to emit the "(no other applicable tests in this cluster ran
  // for this dataset — see 'Tests not run' below)" fallback line.
  const clearedInFlaggedClusters = flaggedClusterKeys.map(key => ({
    clusterLabel: MECHANISMS[key]?.clusterLabel || key,
    clearedTests: results
      .filter(r => r.flag === "LOW" && clusterKeyOf(r) === key)
      .map(r => r.name),
  }));

  // Non-flagged clusters where everything that ran cleared, split two ways.
  // These DO follow canonical MECHANISM_ORDER — they didn't appear in the
  // flagged sections above, so the reader sees them for the first time here.
  //
  // A cluster holding a withheld test goes to the second list, and the
  // renderer's section headers are why: "all applicable tests cleared" is a
  // completeness claim, and a withheld test is applicable and did not clear.
  // Under that header the same document asserted the cluster complete and named
  // the missing member under "Tests not run" a few lines later. Under its own
  // header the cluster reports the gap and keeps its cleared tests, which are
  // evidence a reader would otherwise never see — the whole document goes to a
  // third party, and an omission there cannot be corrected downstream.
  //
  // Both loops run only over non-flagged clusters, so `allClear` is true by
  // construction here; it is kept as the explicit statement of what these
  // sections claim rather than relied on as an accident of the filter above.
  //
  // A cluster where nothing ran is in NEITHER list. "Partly assessed" needs a
  // part, and with no cleared tests the entry would carry an empty name list
  // and a "0 of 1" fraction. That cluster's withheld member is in "Tests not
  // run", which is the honest home for it — and it is the same cut the §3
  // cluster header makes, where the word goes to "Not evaluated" rather than
  // "Partly assessed" at zero.
  const otherClustersAllClear = [];
  const otherClustersPartlyAssessed = [];
  const flaggedKeySet = new Set(flaggedClusterKeys);
  for (const mechKey of MECHANISM_ORDER) {
    if (flaggedKeySet.has(mechKey)) continue;
    const clusterResults = results.filter(
      r => (TEST_MECHANISM[r.name] || "") === mechKey
    );
    const ran = clusterResults.filter(r => classifyCoverage(r) === "ran");
    if (ran.length === 0) continue;
    const allClear = ran.every(r => r.flag === "LOW");
    if (!allClear) continue;
    const clusterLabel = `${capFirst(MECHANISMS[mechKey]?.clusterLabel || mechKey)} cluster`;
    const withheld = clusterResults.filter(isWithheld);
    if (withheld.length > 0) {
      otherClustersPartlyAssessed.push({
        clusterLabel,
        clearedCount: ran.length,
        // Straight off clusterCoverageState, so this fraction and the §3 cluster
        // header's "3 of 4" are one number computed once.
        couldRun: clusterCoverageState(summarizeCoverage(clusterResults)).couldRun,
        testNames: ran.map(r => r.name),
        withheldTestNames: withheld.map(r => r.name),
      });
    } else {
      otherClustersAllClear.push({
        clusterLabel,
        testCount: ran.length,
        testNames: ran.map(r => r.name),
      });
    }
  }

  // Tests not run — flag === "N/A" carries r.description as engine reason.
  // Reason strings are passed through verbatim. `detail` is null on every
  // result that does not carry the size-ceiling fields, and both consumers
  // omit the slot entirely when it is null.
  const notRun = results
    .filter(r => r.flag === "N/A")
    .map(r => ({
      testName: r.name,
      reason: r.description || "",
      detail: formatSkipDetail(r),
    }));

  // Footnote appended after the "Absence of a finding for a test that
  // wasn't run does not mean absence of the pattern." line. Renders only
  // when the dataset has a structural reason worth flagging. Phase A
  // trigger: single-condition dataset with ≥1 cross-condition (group)
  // cluster test skipped. Leading space included in the slot string.
  const groupSkipCount = notRun.filter(
    s => (TEST_MECHANISM[s.testName] || "") === "group"
  ).length;
  const isSingleCondition = !conditions || conditions.length <= 1;
  const notRunFootnote =
    isSingleCondition && groupSkipCount > 0
      ? ` In particular, this dataset has a single condition, so the cross-condition cluster (${groupSkipCount} tests) and condition-dependent tests in other clusters did not run.`
      : "";

  return {
    high,
    moderate,
    clearedInFlaggedClusters,
    otherClustersAllClear,
    otherClustersPartlyAssessed,
    notRun,
    notRunFootnote,
  };
}

/**
 * Build the shared handoff content model.
 *
 * @param {Array} results        Engine results array (per-test result objects)
 * @param {Object} importConfig  Import-time configuration object
 * @param {number} nRows         Row count of the input matrix
 * @param {number} nCols         Column count of the input matrix
 * @returns {HandoffModel}
 */

/* Size-ceiling detail for a not-run test. A test that declined to scan for
   size carries the file's row count and the ceiling it crossed; every other
   not-run result carries neither and gets null here, which both consumers
   read as "render no detail slot at all".

   Shared by the §3 not-applicable stanza (ForensicsCategoryBlock) and the §4
   prompt body (promptBodyRenderer) so the screen and the clipboard cannot
   drift apart on wording or on number formatting. Locale is pinned so the
   thousands separator does not vary by machine. */
/* True when a test declined because the grouping the user CONFIRMED cannot
   support it. Distinct from a settled not-applicable, where the data shape
   itself is wrong, and from a skip, where the scan declined on cost. A reader
   can act on this one — unticking a condition column changes the grouping.

   Reads the figures the refusal carries, the same way the skip is recognised by
   its size-ceiling figures. No coverage state and no extra boolean: the fields
   that describe the refusal are what identify it. */
export function isGroupingRefusal(r) {
  return typeof r?.confirmedGroups === "number"
      && typeof r?.confirmedLargestGroup === "number";
}

export function formatSkipDetail(r) {
  const rows = r?.scanSkippedRows, limit = r?.scanRowLimit;
  if (typeof rows !== "number" || typeof limit !== "number") return null;
  return `${rows.toLocaleString("en-US")} rows, against a limit of ${limit.toLocaleString("en-US")}`;
}

export function buildHandoffModel(results, importConfig, nRows, nCols) {
  const { severity } = computeSeverity(results);
  const dataset = buildDataset(importConfig, nRows, nCols);
  // No rowMap here: the §4 prompt reports against the matrix the battery ran
  // on, which is the same basis the cards pass when they hold no rowMap.
  const { toFileRow } = makeRowMapper(importConfig, null);
  return {
    dataset,
    outcome: buildOutcome(severity, results),
    findings: buildFindings(results, dataset, toFileRow),
  };
}
