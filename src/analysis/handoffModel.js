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
import { fmtP } from "../constants/thresholds.js";
import { composeFinding } from "./findingComposers.js";

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
 * @typedef {Object} SkippedTest
 * @property {string} testName
 * @property {string} reason          Engine-emitted r.description, verbatim
 */

/**
 * @typedef {Object} HandoffModel
 * @property {{filename:string,rows:number,cols:number,assay:string,assayProvenance:string,dataType:string,conditions:string[]|null,vstLabel:string,vstProvenance:string}} dataset
 * @property {{tier:0|1|2|3,label:string,headline:string,applicableTests:number,flaggedCount:number,notedCount:number}} outcome
 * @property {{high:Finding[],moderate:Finding[],clearedInFlaggedClusters:FlaggedClusterClearedGroup[],otherClustersAllClear:ClusterSummary[],notRun:SkippedTest[],notRunFootnote:string}} findings
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
    assayProvenance: importConfig.assayAutoDetected ? "auto" : "user-set",
    dataType: dataTypeEntry?.l || "Continuous",
    conditions,
    vstLabel: VST_LABEL[vstTransform] || vstTransform,
    vstProvenance: importConfig.vst?.reason || "",
  };
}

function buildOutcome(severity, results) {
  return {
    tier: severity,
    label: OUTCOME_LABEL[severity] || "Unknown",
    headline: OUTCOME_HEADLINE[severity] || "",
    applicableTests: results.filter(r => r.flag !== "N/A").length,
    flaggedCount: results.filter(r => r.flag === "HIGH" || r.flag === "MODERATE")
      .length,
    notedCount: results.filter(r => r.flag === "MODERATE").length,
  };
}

function buildFindings(results, dataset) {
  // ctx shape (S162b): minimal dataset slice the composers consume.
  // Conditions are the only branching signal used today (IRC's multi-
  // condition naming, SelNoise's per-condition narration). Threading the
  // full dataset slot keeps the door open for nRows / nCols / vstLabel
  // usage as composers extend.
  const ctx = { dataset };
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

  // Non-flagged clusters where every applicable test cleared. These DO
  // follow canonical MECHANISM_ORDER — they didn't appear in the flagged
  // sections above, so the reader sees them for the first time here.
  const otherClustersAllClear = [];
  const flaggedKeySet = new Set(flaggedClusterKeys);
  for (const mechKey of MECHANISM_ORDER) {
    if (flaggedKeySet.has(mechKey)) continue;
    const clusterResults = results.filter(
      r => (TEST_MECHANISM[r.name] || "") === mechKey
    );
    const ran = clusterResults.filter(r => r.flag !== "N/A");
    if (ran.length === 0) continue;
    const allClear = ran.every(r => r.flag === "LOW");
    if (!allClear) continue;
    otherClustersAllClear.push({
      clusterLabel: `${capFirst(MECHANISMS[mechKey]?.clusterLabel || mechKey)} cluster`,
      testCount: ran.length,
      testNames: ran.map(r => r.name),
    });
  }

  // Tests not run — flag === "N/A" carries r.description as engine reason.
  // Reason strings are passed through verbatim.
  const notRun = results
    .filter(r => r.flag === "N/A")
    .map(r => ({
      testName: r.name,
      reason: r.description || "",
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
export function buildHandoffModel(results, importConfig, nRows, nCols) {
  const { severity } = computeSeverity(results);
  const dataset = buildDataset(importConfig, nRows, nCols);
  return {
    dataset,
    outcome: buildOutcome(severity, results),
    findings: buildFindings(results, dataset),
  };
}
