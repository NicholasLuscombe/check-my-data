import React, { useState, useMemo } from "react";
import { extractLocalizations, buildMechanismGroups } from "../../analysis/localization.js";
import { buildConvergenceFromFindings } from "../../analysis/convergence.js";
import { buildFindings } from "../../analysis/findings.js";
import { computeSeverity } from "../../analysis/severity.js";
import { summarizeCoverage, classifyCoverage } from "../../analysis/coverage.js";
import { groupNotApplicableByReason, groupErroredByReason } from "../../analysis/noVerdictReasons.js";
import { VerdictBanner } from "./VerdictBanner.jsx";
import { ACTION_LABEL } from "../../analysis/narrative.js";
import { buildHandoffModel } from "../../analysis/handoffModel.js";
import { renderPromptBody } from "../../analysis/promptBodyRenderer.js";
import { CategoryRow } from "../shared/CategoryRow.jsx";
import { HotspotExcerptList } from "./HotspotExcerptList.jsx";
import { PulseProvider } from "../forensics/pulseContext.jsx";
import { PulseStyle } from "../forensics/PulseStyle.jsx";
import { ForensicsBody } from "../forensics/ForensicsBody.jsx";
import { C, FF, FW, FS, CR, BADGE, SIGNAL, ACCENT, SEV_VERDICT, DUP_GROUP_PALETTE, MECH_COLOR } from "../../constants/tokens.js";
import { FLAG_STYLES, ALPHA, fmtP } from "../../constants/thresholds.js";
import { MECHANISMS, MECHANISM_ORDER, DISPLAY_NAMES, TEST_DESCRIPTIONS, TEST_MECHANISM, GLOBAL_TESTS, BATTERY_SIZE } from "../../constants/mechanisms.js";
import { ASSAYS, DATA_TYPES } from "../../constants/assays.js";
import { ROLES } from "../../constants/roles.js";
import { Section } from "../shared/Section.jsx";
import { AsideCallout } from "../shared/AsideCallout.jsx";
import { ExcelMetaCard } from "../cards/ExcelMetaCard.jsx";
import { TestCard } from "../cards/TestCard.jsx";
import { MODE_ORDER, MODES, CATEGORY_GUIDANCE, QC_HOTSPOT_NARRATIVE } from "../../constants/guidance.js";
import { CATEGORY_SHORT_DESCRIPTIONS, QC_CATEGORY_DESCRIPTIONS } from "../../constants/descriptions.js";
import { originalFileRow, colToExcelLetter, buildOriginalColMap } from "../shared/coordinates.js";
// Dynamic import: export module + SheetJS + JSZip loaded only when user clicks Export
const lazyExportToExcel = async (opts) => {
  const { exportToExcel } = await import("../../export/excelExport.js");
  return exportToExcel(opts);
};

const SEV_COLORS={3:SEV_VERDICT[3].color,2:SEV_VERDICT[2].color,1:SEV_VERDICT[1].color,0:SEV_VERDICT[0].color,"SKIP":ROLES.condition.color,"ERROR":SIGNAL.RED.dot};

// §5 Test coverage battery — surface-specific handwritten phrasings (NOT
// DISPLAY_NAMES). Each row maps a canonical engine test name (r.name in
// results[]) to the §5-local conversational label. Order within category
// = engine execution / display order from TEST_MECHANISM. Applicability
// dimming (S139b): per-test skipped marker is r.flag === "N/A"; category
// dims when every member is skipped.
const METHOD_BATTERY = [
  { label: "Copy, paste, edit", tests: [
    ["Exact Duplicate Detection",          "Duplicate detection"],
    ["Sequential Duplication",             "recurring value sequences"],
    ["Constant-Offset Blocks",             "constant-offset blocks"],
    ["Residual Spike Correlation",         "residual spike correlation"],
  ]},
  { label: "Unusual digits", tests: [
    ["Terminal Digit Uniformity",          "Terminal digit preference"],
    ["Benford's Law (First Digit)",        "Benford 1st digit"],
    ["Benford's Law (Second Digit)",       "Benford 2nd digit"],
    ["Decimal Precision Consistency",      "decimal precision clustering"],
    ["Value-Frequency Spike",              "value-frequency spikes"],
  ]},
  { label: "Distribution shapes", tests: [
    ["Entropy / Zipf Analysis",            "Entropy / Zipf analysis"],
    ["Column Goodness-of-Fit",             "column goodness-of-fit"],
    ["Modality Test",                      "modality test"],
  ]},
  { label: "Cross-replicate comparisons", tests: [
    ["Inter-Replicate Correlation",        "Inter-replicate correlation"],
    ["Excess Kurtosis",                    "kurtosis + Anderson-Darling"],
    ["Autocorrelation",                    "autocorrelation"],
    ["Windowed Autocorrelation",           "windowed autocorrelation"],
    ["Runs Test",                          "runs test"],
    ["Noise Scaling With Measurement Size","noise scaling"],
    ["Within-Row Variance",                "within-row variance"],
    ["Selective Noise Partitioning",       "selective noise"],
    ["Regional Noise Homogeneity",         "regional noise"],
    ["LOESS Residual Analysis",            "LOESS + CUSUM noise changepoint"],
    ["Row-Mean Runs",                      "row-mean runs"],
    ["Mahalanobis Row Outlier",            "Mahalanobis unusual rows"],
    ["Blocked Mahalanobis",                "blocked Mahalanobis"],
    ["Missing Data Pattern",               "missing data patterns"],
  ]},
  { label: "Cross-condition comparisons", tests: [
    ["Cross-Condition Rank Correlation",   "Cross-condition Spearman rank"],
    ["Baseline Balance",                   "Carlisle condition balance"],
    ["Cross-Condition Consistency",        "cross-condition consistency"],
  ]},
];

/* ── S334 TEMPORARY — section-5 form comparison ────────────────────────────
   Throwaway. Two candidate replacements for the §5 strike list, plus the strike
   list itself, on one screen so the choice is a screenshot judgment. Delete with
   the losing candidates once the form is chosen. Reasons compose through
   noVerdictReasons.js; display names come from DISPLAY_NAMES (the source §3
   uses); errored reasons come from naCause, never from `description`. */

// Group the full result set by mechanism cluster, in display order. Two tests
// carry a dispatch-label name when skipped ("Kurtosis", "Selective Noise") that
// TEST_MECHANISM does not key; both belong to the replicate cluster, which is
// the fallback here (the same fallback the import screen uses).
function s5ClusterGroups(results) {
  const byMech = {};
  for (const r of results) {
    const mk = TEST_MECHANISM[r.name] || "replicate";
    (byMech[mk] = byMech[mk] || []).push(r);
  }
  return MECHANISM_ORDER
    .map(mk => ({ mk, label: MECHANISMS[mk].label, color: MECH_COLOR[mk], tests: byMech[mk] || [] }))
    .filter(g => g.tests.length);
}

// One test's "why it produced no verdict" line, composed through
// noVerdictReasons.js. Errored routes through groupErroredByReason (naCause);
// not-applicable through groupNotApplicableByReason (its exact reason plus any
// size-ceiling detail). Returns null for a test that ran.
function s5ReasonFor(r) {
  const cov = classifyCoverage(r);
  if (cov === "ran") return null;
  if (cov === "errored") return { reason: groupErroredByReason([r])[0].reason, detail: null };
  if (cov === "unassessed") return { reason: "Not assessed — grouping left unconfirmed.", detail: null };
  if (cov === "pending") return { reason: "Grouping needs confirmation.", detail: null };
  const g = groupNotApplicableByReason([r])[0];
  return { reason: g.reason, detail: g.detail };
}

// Position A — tick grid. Matches the import screen's applicability shape: a
// cluster header (dot + label + ran-count), each test on its own line marked ran
// (✓) or not (✗). A not-ran line reveals its reason on tap; a ran line does not.
// Errored lines carry a muted "not run" tag and compose their reason from
// naCause via s5ReasonFor.
function S5TickGrid({ results, open, setOpen }) {
  const groups = s5ClusterGroups(results);
  return (
    <div>
      {groups.map(g => {
        const ran = g.tests.filter(r => classifyCoverage(r) === "ran").length;
        return (
          <div key={g.mk} style={{ marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: g.color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: FS.base, color: C.TEXT, fontWeight: FW.SEMI }}>{g.label}</span>
              <span style={{ fontSize: FS.sm, color: C.TEXT_3 }}>{ran}/{g.tests.length}</span>
            </div>
            <div style={{ paddingLeft: "14px" }}>
              {/* Errored tests sink to the end of the cluster so they read as
                  their own group; a stable sort keeps battery order otherwise. */}
              {[...g.tests].sort((a, b) => (classifyCoverage(a) === "errored" ? 1 : 0) - (classifyCoverage(b) === "errored" ? 1 : 0)).map(r => {
                const cov = classifyCoverage(r);
                const didRun = cov === "ran";
                const name = DISPLAY_NAMES[r.name] || r.name;
                const isOpen = !!open[r.name];
                const why = didRun ? null : s5ReasonFor(r);
                return (
                  <div key={r.name} style={{ marginBottom: "2px" }}>
                    <div
                      onClick={didRun ? undefined : () => setOpen(o => ({ ...o, [r.name]: !o[r.name] }))}
                      style={{ fontSize: FS.sm, color: didRun ? C.TEXT_2 : C.TEXT_3, display: "flex", alignItems: "center", gap: "4px", cursor: didRun ? "default" : "pointer" }}
                    >
                      <span style={{ color: didRun ? g.color : C.TEXT_3, width: "10px", flexShrink: 0 }}>{didRun ? "✓" : "✗"}</span>
                      <span>{name}</span>
                      {cov === "errored" && <span style={{ color: C.TEXT_3, fontSize: FS.xs }}>· not run</span>}
                      {!didRun && <span style={{ color: C.TEXT_3, fontSize: FS.xs, marginLeft: "2px" }}>{isOpen ? "▾" : "▸"}</span>}
                    </div>
                    {!didRun && isOpen && why && (
                      <div style={{ paddingLeft: "14px", marginTop: "2px", marginBottom: "4px" }}>
                        <div style={{ fontSize: FS.sm, color: C.TEXT_3, lineHeight: "1.5" }}>{why.reason}</div>
                        {why.detail && <div style={{ fontSize: FS.xs, color: C.TEXT_3, marginTop: "2px" }}>{why.detail}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Position B — reasons. Every declined test with its full "why" shown, grouped
// by cluster, no tap. Ran tests collapse to one compact line so the section
// still reads as coverage; errored tests form their own "Not run" group per
// cluster, composed from naCause. Long by design on the survey file — that
// length is the point of the comparison, so it is not abbreviated.
function S5Reasons({ results }) {
  const groups = s5ClusterGroups(results);
  return (
    <div>
      {groups.map(g => {
        const ranTests = g.tests.filter(r => classifyCoverage(r) === "ran");
        const erroredTests = g.tests.filter(r => classifyCoverage(r) === "errored");
        const declinedTests = g.tests.filter(r => {
          const c = classifyCoverage(r);
          return c !== "ran" && c !== "errored";
        });
        return (
          <div key={g.mk} style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: g.color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: FS.base, color: C.TEXT, fontWeight: FW.SEMI }}>{g.label}</span>
              <span style={{ fontSize: FS.sm, color: C.TEXT_3 }}>{ranTests.length}/{g.tests.length}</span>
            </div>
            {ranTests.length > 0 && (
              <div style={{ fontSize: FS.sm, color: C.TEXT_3, marginBottom: "6px", paddingLeft: "14px", lineHeight: "1.5" }}>
                Ran: {ranTests.map(r => DISPLAY_NAMES[r.name] || r.name).join(", ")}.
              </div>
            )}
            {declinedTests.map(r => {
              const why = s5ReasonFor(r);
              return (
                <div key={r.name} style={{ paddingLeft: "14px", marginBottom: "8px" }}>
                  <div style={{ fontSize: FS.sm, fontWeight: FW.MED, color: C.TEXT_2 }}>{DISPLAY_NAMES[r.name] || r.name}</div>
                  <div style={{ fontSize: FS.sm, color: C.TEXT_3, lineHeight: "1.5", marginTop: "2px" }}>{why.reason}</div>
                  {why.detail && <div style={{ fontSize: FS.xs, color: C.TEXT_3, marginTop: "2px" }}>{why.detail}</div>}
                </div>
              );
            })}
            {erroredTests.length > 0 && (
              <div style={{ paddingLeft: "14px", marginTop: "4px" }}>
                <div style={{ fontSize: FS.xs, fontWeight: FW.SEMI, color: C.TEXT_3, marginBottom: "4px" }}>Not run</div>
                {erroredTests.map(r => {
                  const why = s5ReasonFor(r);
                  return (
                    <div key={r.name} style={{ marginBottom: "8px" }}>
                      <div style={{ fontSize: FS.sm, fontWeight: FW.MED, color: C.TEXT_2 }}>{DISPLAY_NAMES[r.name] || r.name}</div>
                      <div style={{ fontSize: FS.sm, color: C.TEXT_3, lineHeight: "1.5", marginTop: "2px" }}>{why.reason}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ReportView({ results: baseResults, importConfig, matrix, rowMap, onBack, onChangeFile }) {
  // S321 move 2, round 3 — confirmed grouping. When the user confirms a grouping
  // on the confirm card, the four grouped tests run on that ticked set and their
  // real results replace the four N/A-pending ones. Everything downstream reads
  // `results`, so the whole report (§1 severity, §3 cards) stays consistent.
  // Only the four swap — every dataset-wide test result object is unchanged.
  // Session-only state; nothing persisted. `groupingPendingBase` (from the
  // engine's stamp on the untouched base results) keeps the confirm card mounted
  // after confirm so the user can re-untick and re-confirm.
  const [confirmedResults, setConfirmedResults] = useState(null);
  const results = useMemo(() => {
    if (!confirmedResults) return baseResults;
    return baseResults.map(r => confirmedResults.find(c => c.name === r.name) || r);
  }, [baseResults, confirmedResults]);
  const groupingPendingBase = useMemo(() => baseResults.some(r => r.groupingPending), [baseResults]);

  const { severity, high, mod, nFlaggedDimensions } = computeSeverity(results);
  const sevColor=SEV_COLORS[severity];
  const assayLabel=ASSAYS.find(a=>a.v===importConfig.assay)?.l||importConfig.assay;
  const nRows = matrix?.length || importConfig.nRows || 0;
  const nCols = matrix?.[0]?.length || importConfig.nCols || 0;

  // ── S126a: findings[] is the canonical aggregator over results ──
  // Convergence grid + the individual-localising-findings filter all read
  // from this one structure.
  // Engine producers untouched; this is a transform layer over r.flag /
  // r.primaryP / extractCellFlags(r) outputs.
  const findings = useMemo(
    () => buildFindings(results, nRows, nCols, {
      colHeaders: importConfig?.hdrs,
    }),
    [results, nRows, nCols, importConfig?.hdrs]
  );
  const convergence = useMemo(
    () => buildConvergenceFromFindings(findings, results, nRows, nCols),
    [findings, results, nRows, nCols]
  );
  const locs = useMemo(() => extractLocalizations(results, nRows, nCols, matrix), [results, nRows, nCols, matrix]);

  // Render-mode flag (S126a §2c). v1.0 ships 'document' only; 'exploration'
  // is reserved for v1.1 Shape F (map-as-page) and is not wired.
  // Branching here lets S126b add the visible D-lite layout under the
  // 'document' branch without rewriting ReportView's entry point, and
  // lets v1.1 plug an exploration branch in without touching this one.
  const renderMode = "document";

  const [copied,setCopied]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [mode,setMode]=useState("qc");
  const nApplicable = results.filter(r => r.flag !== "N/A").length;
  const handleExcelDownload = async () => {
    setExporting(true);
    try { await lazyExportToExcel({results,importConfig,matrix,rowMap,mode}); }
    catch(e) { console.error("Excel export failed:",e); alert("Export failed: "+e.message); }
    finally { setExporting(false); }
  };
  const generateTextSummary = () => {
    const lines=[];
    const cov = summarizeCoverage(results);
    const flagLabel = f => ({HIGH:"FLAGGED",MODERATE:"NOTED",LOW:"CLEAR","N/A":"N/A"}[f]||f);
    lines.push(`=== Check My Data v0.8 ===`);
    lines.push(`File: ${importConfig.fileName||"uploaded"} | ${nRows} rows × ${nCols} cols | Measurement type: ${assayLabel} | Data: ${DATA_TYPES.find(d=>d.v===(importConfig.dataType||"continuous"))?.l||"Continuous"}${importConfig.colRelationship==='conditions'?' | Columns: Non-replicates':''} | Severity: ${severity}`);
    if(importConfig.zeroAsMissing) lines.push(`Zeros excluded.`);
    if(importConfig.vst && importConfig.vst.transform !== 'raw')
      lines.push(`VST: ${importConfig.vst.transform} — ${importConfig.vst.reason}`);
    lines.push(``);
    // Clean-case coverage verdict (severity 0). A dataset-level statement that
    // replaces the per-cluster "(X/Y applicable — clear)" form as the clean
    // signal — it references the full battery, so it is one line, not per
    // cluster. Says nothing when nothing completed.
    if (severity === 0) {
      lines.push(cov.ran === 0
        ? `No tests could run on this data. This report says nothing about it.`
        : `(${cov.ran} of ${BATTERY_SIZE} completed — no signals above threshold. This report does not establish that the data is genuine.)`);
      lines.push(``);
    }
    // Mechanism-grouped output (matches UI)
    const groups = buildMechanismGroups(results);
    for(const mechKey of MECHANISM_ORDER){
      const group = groups[mechKey];
      if(!group.tests.length) continue;
      const completed = group.tests.filter(t=>t.flag!=="N/A").length;
      const flagSummary = group.highCount || group.modCount
        ? ` — ${group.highCount} FLAGGED, ${group.modCount} NOTED`
        : ` — clear`;
      lines.push(`── ${group.label.toUpperCase()} (${completed}/${group.tests.length} completed${flagSummary}) ──`);
      for(const r of group.tests){
        // Main flag line
        let detail="";
        if(r.flag==="N/A"){
          lines.push(`  N/A      ${r.name}`);
          if(r.description) lines.push(`           ${r.description.slice(0,150)}`);
          continue;
        }
        // -- Duplicate Detection --
        if(r.name?.includes("Duplicate")){
          // Every location a sub-test emits is in filtered-matrix coordinates;
          // translate to the source sheet's own rows and column letters so the
          // dump agrees with the card and the user's spreadsheet. Mapping already
          // exists (dataColMap for columns, originalFileRow for rows); applied here.
          const _roles=importConfig?.roles||[];
          const _dataColMap=_roles.map((rr,i)=>rr==="data"?i:-1).filter(i=>i>=0);
          const _origColMap=buildOriginalColMap((importConfig?.hdrs||[]).length, importConfig?.removedCols);
          const _srcRow=(mi)=>originalFileRow(rowMap?(rowMap[mi]??mi):mi, importConfig?.skippedRows||0, importConfig?.headerRows||0);
          const _srcCol=(mc)=>colToExcelLetter(_origColMap[_dataColMap[mc]] ?? _dataColMap[mc] ?? mc);
          if(r.duplicateRows!=null) detail+=` dupRows=${r.duplicateRows} rowP=${r.rowDupPValue||"?"}`;
          if(r.withinRowMatches!=null) {
            detail+=` wrTotal=${r.withinRowMatches} wrExp=${r.withinRowExpected} wrRatio=${r.withinRowExpected>0?(r.withinRowMatches/parseFloat(r.withinRowExpected)).toFixed(1)+"×":"—"} wrZ=${r.withinRowZ} wrP=${r.withinRowP}`;
            // Only show within/cross breakdown when multiple groups exist
            if(parseFloat(r.wrCrossExp)>0) {
              if(r.wrWithinObs!=null) detail+=` | within=${r.wrWithinObs} exp=${r.wrWithinExp} ratio=${r.wrWithinRatio}×`;
              if(r.wrCrossObs!=null) detail+=` | cross=${r.wrCrossObs} exp=${r.wrCrossExp} ratio=${r.wrCrossRatio}×`;
            }
            if(r.withinColObs!=null) detail+=` | colCtrl=${r.withinColObs} exp=${r.withinColExp} ratio=${r.withinColRatio}×`;
            if(r.blockCopies?.length) detail+=` | blocks=${r.blockCopies.length} largest=${r.blockCopies[0].height}×${r.blockCopies[0].width} blockP=${r.bestBlockP||"?"}`;
          }
          if(r.partialRowSkipped) detail+=` | partialRow=skipped(dataset too large)`;
          else if(r.partialRowPairs!=null) detail+=` | partialRow=${r.partialRowPairs} pair${r.partialRowPairs===1?"":"s"} p=${r.partialRowP||"?"}`;
          if(r.nBins!=null) detail+=` nBins=${r.nBins} nDistinct=${r.nDistinct||"?"} isInt=${r.isInteger||"?"} null=${r.p1Source||"?"}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.blockCopies?.length){
            for(const blk of r.blockCopies.slice(0,5)){
              const s1=_srcRow(blk.srcRows[0]), s2=_srcRow(blk.srcRows[1]);
              const d1=_srcRow(blk.dstRows[0]), d2=_srcRow(blk.dstRows[1]);
              lines.push(`           block: ${blk.height}×${blk.width} rows ${s1}–${s2} ↔ ${d1}–${d2} cols=[${blk.cols.slice(0,8).map(_srcCol).join(",")}${blk.cols.length>8?"…":""}]`);
            }
          }
          if(r.rowDupGroupList?.length){
            for(const g of r.rowDupGroupList.slice(0,5)){
              const rowNums=g.rows.slice(0,10).map(ri=>_srcRow(ri)).join(", ");
              lines.push(`           dupGroup: ${g.count}× rows=[${rowNums}${g.rows.length>10?"…":""}] vals=${g.values?.slice(0,60)||""}`);
            }
          } else if(r.details?.length){
            const dups=r.details.filter(d=>d.type==="duplicate-row").slice(0,3);
            for(const d of dups) lines.push(`           dupRow: ${d.rows} vals=${d.values?.slice(0,60)||""}`);
          }
          if(r.partialRowLocs?.length){
            for(const l of r.partialRowLocs.slice(0,5)){
              lines.push(`           partialRow: rows ${_srcRow(l.srcRow)} & ${_srcRow(l.dstRow)} — ${l.nCols} cols agree, ${l.offset} apart, cols=[${l.cols.slice(0,8).map(_srcCol).join(",")}${l.cols.length>8?"…":""}]`);
            }
          }
          continue;
        }
        // -- Constant-Offset --
        if(r.name?.includes("Constant-Offset")){
          detail+=` blocks=${r.consecutiveEqualDiffs} exp=${r.expectedByChance} z=${r.excessZ} rate=${r.blockRate}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.condConstOffset?.length>=2){
            for(const c of r.condConstOffset){
              lines.push(`           cond: ${c.condition} blocks=${c.blocks} rate=${c.blockRate} p=${fmtP(c.rawP)} flag=${c.flag}`);
            }
            if(r.condConstOffset.promoted) lines.push(`           [promoted: differs between conditions]`);
          }
          continue;
        }
        // -- Selective Noise --
        if(r.name?.includes("Selective Noise")){
          detail+=` ratio=${r.maxMinVarianceRatio}`;
          if(r.bartlettChi!=null) detail+=` bartlettχ²=${r.bartlettChi} p=${r.pBartlett}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.colDetails?.length && !r.groupsAssessed) lines.push(`           cols: ${r.colDetails.map(d=>`${d.col||"?"}=${parseFloat(d.residualStd||0).toFixed(4)}`).slice(0,8).join(", ")}`);
          else if(r.details?.length && r.groupsAssessed) lines.push(`           groups: ${r.details.map(d=>`${d.group||"?"}=${d.varRatio||"?"}`).slice(0,8).join(", ")}`);
          continue;
        }
        // -- Cross-Condition tests --
        if(r.name?.includes("Cross-Condition")){
          if(r.meanRho!=null) detail+=` ρ=${r.meanRho} suspicious=${r.nSuspicious||0}/${r.nConditionPairs||0}`;
          else if(r.nConditionPairs!=null) detail+=` pairs=${r.nConditionPairs}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          continue;
        }
        // -- Windowed Autocorrelation (own template; exact-match so it no longer
        //    falls into the Autocorrelation branch and prints an absent pooledP) --
        if(r.name==="Windowed Autocorrelation"){
          detail+=` primaryP=${r.primaryP} sig=${r.nSig05||0}/${r.nWindowsTotal||0} (${r.nSig01||0} @ .01) pairs=${r.nPairs} win=${r.windowSize}/${r.stride} nPerm=${r.nPerm}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          const wDetails = r.groupsAssessed ? (r.subDetails||[]) : (r.details||[]);
          for(const d of wDetails.filter(d=>d.significant).slice(0,3)) lines.push(`           window: ${d.group?d.group+" ":""}${d.pair||"?"} rows ${d.rows??"?"} r=${d.r??"?"} adjP=${fmtP(d.adjP)}`);
          continue;
        }
        // -- Autocorrelation --
        if(r.name==="Autocorrelation"){
          detail+=` meanR1=${r.pooledMeanR1} pooledT=${r.pooledT} pooledP=${r.pooledP} ${r.nSignificant||0}/${r.nPairs||0} sig`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.decayCurve?.length) lines.push(`           decay: ${r.decayCurve.slice(0,5).map(v=>v.toFixed(3)).join(", ")}...`);
          if(r.groupsAssessed && r.details?.length>1) lines.push(`           pairs: ${r.details.slice(0,6).map(d=>`${d.group||"?"}:${d.sigPairs!=null?d.sigPairs+"/"+d.ofPairs+"sig":"flag="+d.flag}`).join(", ")}`);
          else if(r.details?.length>1) lines.push(`           pairs: ${r.details.slice(0,6).map(d=>`${d.group||d.pair}:r1=${d.lag1}`).join(", ")}`);
          if(r.condAutocorr?.length>=2){
            for(const c of r.condAutocorr){
              lines.push(`           cond: ${c.condition} pairs=${c.nPairs} meanR1=${c.meanR1.toFixed(4)} p=${fmtP(c.rawP)} flag=${c.flag}`);
            }
            if(r.condAutocorr.promoted) lines.push(`           [promoted: differs between conditions]`);
          }          continue;
        }
        // -- Kurtosis --
        if(r.name?.includes("Kurtosis")){
          detail+=` κObs=${r.pooledKurtosis!=null?(typeof r.pooledKurtosis==='number'?r.pooledKurtosis.toFixed(3):r.pooledKurtosis):"?"} κSim=${r.simKurtosis!=null?(typeof r.simKurtosis==='number'?r.simKurtosis.toFixed(3):r.simKurtosis):"?"} κDev=${r.kurtDeviation} pooledP=${r.pooledP}`;
          if(r._kurtosisP) detail+=` kurtP=${r._kurtosisP} adP=${r._andersonDarlingP||"?"}`;
          detail+=` ${r.nPlatykurtic||0} plat, ${r.nSignificant||0}/${r.nPairs||0} sig`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.condKurtosis?.length>=2){
            for(const c of r.condKurtosis){
              lines.push(`           cond: ${c.condition} n=${c.n} κDev=${c.kurtDeviation} p=${c.p}${c.platykurtic?" [PLAT]":""}`);
            }
          }
          continue;
        }
        // -- Row-Mean Runs --
        if(r.name?.includes("Row-Mean")){
          detail+=` globalP=${r.globalP} best=${r.bestSequence||"?"} runs=${r.bestRuns||"?"} exp=${r.bestExpected||"?"} z=${r.bestZ||"?"}`;
          detail+=` seqs=${r.nSequences||0} winSig=${r.windowSigCount||0}/${r.nWindowsTested||0}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          continue;
        }
        // -- Runs Test --
        if(r.name?.includes("Runs")){
          detail+=` pooledZ=${r.pooledMeanZ} pooledP=${r.pooledP} ${r.nSignificant||0}/${r.nPairs||0} sig`;
          if(r.firstPairRuns!=null) detail+=` R1-R2:${r.firstPairRuns}runs exp=${r.firstPairExp}`;
          if(r.windowScanP!=null&&r.windowScanP<1) detail+=` winScanP=${r.windowScanP.toFixed(4)} winN=${r.nWindowsTested||0}`;
          else detail+=` winScanP=1 winN=${r.nWindowsTested||0}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.mostExtremePair) lines.push(`           worst: ${r.mostExtremePair}`);
          if(r.condRuns?.length>=2){
            for(const c of r.condRuns){
              lines.push(`           cond: ${c.condition} pairs=${c.nPairs} meanZ=${c.meanZ.toFixed(3)} p=${fmtP(c.rawP)} flag=${c.flag}`);
            }
            if(r.condRuns.promoted) lines.push(`           [promoted: differs between conditions]`);
          }
          continue;
        }
        // -- Inter-Replicate Correlation --
        if(r.name?.includes("Inter-Replicate")){
          detail+=` meanR=${r.meanR} icc=${r.iccPredicted} suspicious=${r.nSuspicious||0}/${r.nPairs||0} highSNR=${r.highSNRWarning}`;
          if(r.windowScanP!=null&&r.windowScanP<1) detail+=` winScanP=${r.windowScanP.toFixed(4)} winN=${r.nWindowsTested||0}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.nSuspicious>0&&r.details?.length){
            const sus=r.details.filter(d=>d.suspicious).slice(0,3);
            for(const d of sus) lines.push(`           suspicious: ${d.condition} ${d.pair} r=${d.r} excess=${d.excess} adjP=${d.adjP?.toFixed(4)||"?"}`);
          }
          if(r.windowScanP<0.01&&r.details?.length){
            const wins=r.details.filter(d=>d.source==="window").slice(0,3);
            for(const w of wins) lines.push(`           window: ${w.condition} ${w.pair} rows ${w.startRow}-${w.endRow} r=${w.rWin} excess=${w.excess}`);
          }
          continue;
        }
        // -- Terminal Digit --
        if(r.name?.includes("Terminal")){
          detail+=` χ²=${r.chiSquared} df=${r.df} p=${r.p} n=${r.nValues}`;
          if(r.trailingZeroWarning) detail+=` trailingZeroSuppression=true`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.details?.length) lines.push(`           digits: ${r.details.map(d=>`${d.digit}:${d.observed}`).join(" ")}`);
          continue;
        }
        // -- Benford --
        if(r.name?.includes("Benford")){
          detail+=` χ²=${r.chiSquared} MAD=${r.MAD}${r.MADConformity?` (${r.MADConformity} — Nigrini conformity band)`:""} pMAD=${r.pMAD} n=${r.nValues}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.details?.length) lines.push(`           digits: ${r.details.map(d=>`${d.digit}:${d.observedPct}`).join(" ")}`);
          continue;
        }
        // -- Value-Frequency Spike --
        if(r.name?.includes("Value-Frequency")){
          detail+=` nSpikes=${r.nSpikes} nTested=${r.nTested} nDistinct=${r.nDistinct} window=${r.smoothingWindow} keyboard=${r.keyboardPattern} bestP=${r.bestAdjP}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.details?.length){
            for(const d of r.details.slice(0,8)){
              lines.push(`           spike: val=${d.value} obs=${d.observed} exp=${d.expected} ratio=${d.ratio} adjP=${d.adjP}`);
            }
          }
          continue;
        }
        // -- Decimal Precision --
        if(r.name?.includes("Precision")){
          detail+=` dom=${r.dominantDecimalPlaces}dp ${r.dominantFraction} gaps=${r.gapsDetected||0}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          continue;
        }
        // -- Mean-Variance --
        if(r.name?.includes("Noise Scaling")){
          detail+=` slope=${r.observedSlope} exp=${r.expectedSlope} assay=${r.assay} n=${r.nPoints}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          continue;
        }
        // -- Regional Noise --
        if(r.name?.includes("Regional Noise")){
          detail+=` scanP=${typeof r.scanP==='number'?r.scanP.toFixed(4):r.scanP} bestWindow=${r.bestWindowRows} ratio=${r.bestVarRatio} anomCol=${r.bestAnomCol||"—"} nWin=${r.nWindows}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          const winDetails = r.groupsAssessed ? (r.subDetails||[]) : (r.details||[]);
          if(winDetails.length){
            const top=winDetails.filter(d=>d.rows && d.ratio).slice(0,3);
            for(const d of top) lines.push(`           window: rows ${d.rows} ratio=${d.ratio} col=${d.anomCol}`);
          }
          continue;
        }
        // -- Blocked Mahalanobis (own template; exact-match so it no longer falls
        //    into the Mahalanobis Row Outlier branch and prints absent binomP/nCols) --
        if(r.name==="Blocked Mahalanobis"){
          detail+=` primaryP=${r.primaryP} conds=${r.nConditions} units=${r.nUnits} nWin=${r.nWindowsTotal} win=${r.windowSize}/${r.stride} nPerm=${r.nPerm}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          for(const d of (r.details||[]).filter(d=>d.significant).slice(0,3)) lines.push(`           block: ${d.pass||""} ${d.condition||"?"} rows ${d.rows??"?"} ${d.statType||""}=${d.stat??"?"} adjP=${fmtP(d.adjP)}`);
          continue;
        }
        // -- Mahalanobis Row Outlier --
        if(r.name==="Mahalanobis Row Outlier"){
          const outlierSource = r.groupsAssessed ? (r.subDetails||[]) : (r.details||[]);
          const mTotalOut = outlierSource.filter(d => d.Distance !== undefined).length;
          const mTotalRows = r.groupsAssessed && r.details?.length
            ? r.details.reduce((s, d) => s + (d.nRowsTested || d.rows || 0), 0)
            : (r.nRows || 0);
          const mExpected = (mTotalRows * 0.01).toFixed(1);
          const mFrac = mTotalRows > 0 ? ((mTotalOut / mTotalRows) * 100).toFixed(1) + "%" : "0%";
          detail+=` nOut=${mTotalOut}/${mTotalRows} frac=${mFrac} expected=${mExpected} binomZ=${r.binomZ} binomP=${r.binomP} nCols=${r.nCols}${r.internalLogApplied?" [intLog]":""}${r.groupsAssessed?" groups="+r.groupsAssessed:""}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          const outliers = outlierSource.filter(d => d.Distance !== undefined).slice(0,5);
          for(const d of outliers) lines.push(`           outlier: ${d.group?d.group+" ":""}row ${d.Row} D²=${d.Distance} p=${d["p-value"]}`);
          continue;
        }
        // -- Residual Spike Correlation --
        if(r.name?.includes("Residual Spike")){
          detail+=` overlap=${r.nOverlap} exp=${r.expectedOverlap} K=${r.topK} permP=${r.permP} nPerm=${r.nPerm} groups=${r.nGroups}`;
          if(r.bestPair) detail+=` bestPair=${r.bestPair}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.pairDetails?.length){
            for(const d of r.pairDetails) lines.push(`           pair: ${d.pair} ρ=${d.r} n=${d.n}`);
          }
          if(r.details?.length){
            const top=r.details.slice(0,5);
            for(const d of top) lines.push(`           coordRow: row ${d.row} score=${d.coordScore} residuals=[${d.residuals}]`);
          }
          continue;
        }
        // -- LOESS Residual Analysis --
        if(r.name?.includes("LOESS")){
          detail+=` scanP=${typeof r.scanP==='number'?r.scanP.toFixed(4):r.scanP} cusumP=${typeof r.cusumP==='number'?r.cusumP.toFixed(4):r.cusumP||"—"} bestWindow=${r.bestWindowRows} ratio=${r.bestVarRatio} direction=${r.bestDirection||"—"} span=${r.loessSpan||"—"} nWin=${r.nWindows}`;
          if(r.changepointRow) detail+=` cp=${r.changepointRow}(${r.changepointDirection})`;
          if(r.changepoint2Row) detail+=` cp2=${r.changepoint2Row}(${r.changepoint2Direction})`;
          if(r.pairPromoted) detail+=` pairPromoted=true`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          const winDetails = r.groupsAssessed ? (r.subDetails||[]) : (r.details||[]);
          if(winDetails.length){
            const cps=winDetails.filter(d=>d.type==="changepoint").slice(0,2);
            for(const d of cps) lines.push(`           changepoint: row ${d.rows} ${d.direction} (p=${d.cusumP})`);
            const wins=winDetails.filter(d=>d.type==="window"||(!d.type && d.rows && d.ratio)).slice(0,3);
            for(const d of wins) lines.push(`           window: rows ${d.rows} ratio=${d.ratio} ${d.direction||""}`);
          }
          if(r.pairResults?.length){
            const sig = r.pairResults.filter(pr => pr.adjP != null && pr.adjP < ALPHA.FLAG);
            for(const pr of sig.slice(0,5)){
              lines.push(`           pair: cols ${pr.pair} scanP=${pr.scanP.toFixed(4)} cusumP=${pr.cusumP.toFixed(4)} adjP=${pr.adjP<0.0001?"<0.0001":pr.adjP.toFixed(4)}`);
            }
          }
          continue;
        }
        // -- Within-Row Variance --
        if(r.name?.includes("Within-Row Variance")){
          detail+=` nOut=${r.nOutliers}/${r.nValid} exp=${r.expectedOutliers} globalP=${r.globalP} winScanP=${r.windowScanP} sigWin=${r.windowSigCount}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.details?.length){
            const top=r.details.slice(0,5);
            for(const d of top) lines.push(`           row ${d.Row}: z=${d.z} ${d.Direction} SD=${d.SD} exp=${d.Expected}`);
          }
          continue;
        }
        // -- Missing Data Pattern --
        if(r.name?.includes("Missing Data Pattern")){
          detail+=` missing=${r.nMissing} (${r.missRate}) pairwise=${r.nPairwiseHits||0} cond=${r.nCondHits||0} blocks=${r.nBlockHits||0}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.blockHits?.length) for(const b of r.blockHits.slice(0,3)) lines.push(`           block: rows ${b.startRow}–${b.endRow} cols ${b.cols.join(",")} ${b.height}×${b.width} adjP=${b.adjP<0.0001?"<0.0001":b.adjP?.toFixed(4)}`);
          continue;
        }
        // -- Baseline Balance --
        if(r.name?.includes("Baseline Balance")){
          detail+=` features=${r.nFeatures} excess=${r.nExcess}/${r.nFeatures} exp=${r.expectedExcess} binomP=${r.binomP} KS_D=${r.ksD} KS_p=${r.ksP} dir=${r.direction}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          continue;
        }
        // -- Entropy / Zipf Analysis --
        if(r.name?.includes("Entropy")){
          detail+=` tested=${r.nTested} flagged=${r.nFlagged} (${r.nLow} low, ${r.nHigh} high)`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          // S318: on the aggregated path (row/column-grouped dispatch) details is
          // the per-group summary; per-column entries live in subDetails.
          const entDetails = r.groupsAssessed ? (r.subDetails||[]) : (r.details||[]);
          for(const d of entDetails.slice(0,5)) lines.push(`           col ${d.Col}: ${d.group?d.group+" ":""}${d.Direction} H=${d.H_obs} exp=${d.H_expected} ratio=${d.Ratio} adjP=${fmtP(d.adjP)}`);
          continue;
        }
        // Fallback
        lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
      }
      lines.push(``);
    }
    return lines.join("\n");
  };

  const handleCopySummary = async () => {
    const text=generateTextSummary();
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }
    catch(e) { /* fallback: select a textarea */ const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); setCopied(true); setTimeout(()=>setCopied(false),2000); }
  };

  // ── Coloured Excel export ──
  const handleExportExcel = () => {
    const rawData = importConfig?.data || [];
    const hdrs = importConfig?.hdrs || [];
    const roles = importConfig?.roles || [];
    const toOrigRow = (mi) => rowMap ? (rowMap[mi] ?? mi) : mi;
    const dataColMap = roles.map((r,i)=>r==="data"?i:-1).filter(i=>i>=0);

    // Build per-cell annotation grid directly from test results
    // Two layers: cellBg[origRow][rawCol] = "#hex", cellFg[origRow][rawCol] = "#hex"
    // Colours match evidence table styling
    const cellBg = {};
    const cellFg = {};
    const setBg = (origRow, rawCol, color) => {
      if (origRow < 0 || rawCol == null) return;
      if (!cellBg[origRow]) cellBg[origRow] = {};
      if (!cellBg[origRow][rawCol]) cellBg[origRow][rawCol] = color;
    };
    const setFg = (origRow, rawCol, color) => {
      if (origRow < 0 || rawCol == null) return;
      if (!cellFg[origRow]) cellFg[origRow] = {};
      if (!cellBg[origRow]?.[rawCol]) cellFg[origRow][rawCol] = color;
    };

    for (const r of results) {
      if (r.flag === "LOW" || r.flag === "N/A") continue;

      // ── DupDet — match evidence table exactly ──
      if (r.name === "Exact Duplicate Detection") {
        // Block copies → red bg on specific matched columns (matches evidence table red highlight)
        if (r.blockCopies?.length) {
          for (const blk of r.blockCopies.slice(0, 10)) {
            const rawCols = blk.cols.map(c => dataColMap[c]);
            for (let i = blk.srcRows[0]; i <= blk.srcRows[1]; i++) {
              const origR = toOrigRow(i);
              rawCols.forEach(rc => setBg(origR, rc, FLAG_STYLES.HIGH.bg));
            }
            for (let i = blk.dstRows[0]; i <= blk.dstRows[1]; i++) {
              const origR = toOrigRow(i);
              rawCols.forEach(rc => setBg(origR, rc, FLAG_STYLES.HIGH.bg));
            }
          }
        }
        // Row dup groups → amber bg on full row (matches evidence table alternating highlight)
        if (r.rowDupGroupList?.length) {
          for (const grp of r.rowDupGroupList) {
            for (const mi of grp.rows) {
              const origR = toOrigRow(mi);
              dataColMap.forEach(rc => setBg(origR, rc, FLAG_STYLES.MODERATE.bg));
            }
          }
        }
        // Within-row coincidences → colour-coded bg on specific cells (matches evidence table groups)
        const groupColors = DUP_GROUP_PALETTE.map(p => p.bg);
        if (r.withinRowLocs?.length) {
          for (const dup of r.withinRowLocs.slice(0, 200)) {
            const origR = toOrigRow((dup.row || 1) - 1);
            (dup.groups || []).forEach((g, gi) => {
              const color = groupColors[gi % groupColors.length];
              g.cols.forEach(mc => setBg(origR, dataColMap[mc], color));
            });
          }
        }
      }

      // ── Constant-Offset → skip in export (too broad, shown in evidence table) ──

      // ── RSC: coordinated spike rows → bold text on data cells ──
      if (r.name === "Residual Spike Correlation" && r.details?.length) {
        for (const d of r.details) {
          const ri = parseInt(d.row) - 1;
          if (ri >= 0) dataColMap.forEach(rc => setFg(ri, rc, SIGNAL.RED.dot));
        }
      }

      // ── Regional Noise / LOESS: row ranges → light teal border-left ──
      if ((r.name === "Regional Noise Homogeneity" || r.name === "LOESS Residual Analysis") && r.details?.length) {
        for (const d of r.details.slice(0, 3)) {
          if (d.window) {
            const m = String(d.window).match(/rows?\s*(\d+)[–-](\d+)/i);
            if (m) {
              const s = parseInt(m[1]) - 1, e = parseInt(m[2]) - 1;
              for (let ri = s; ri <= e && ri < nRows; ri++) {
                dataColMap.forEach(rc => { if (!cellBg[ri]?.[rc]) setBg(ri, rc, FLAG_STYLES.LOW.bg); });
              }
            }
          }
        }
      }

      // ── Mahalanobis outlier rows → light pink bg ──
      if (r.name === "Mahalanobis Row Outlier" && r.details?.length) {
        for (const d of r.details.slice(0, 10)) {
          const ri = parseInt(d.Row) - 1;
          if (ri >= 0) dataColMap.forEach(rc => { if (!cellBg[ri]?.[rc]) setBg(ri, rc, SIGNAL.RED.bg); });
        }
      }
    }

    // Escape HTML entities
    const esc = s => String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

    // Build data sheet HTML
    const colLtr = (n) => { let s=""; while(true){s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26)-1;if(n<0)break;} return s; };
    let dataHtml = `<table class="data-table" border="1" cellpadding="3" style="border-collapse:collapse;font-family:${FF.MONO};font-size:${FS.xs}">`;
    // Row 1: Excel column letters
    dataHtml += `<tr><th style="background:${C.BORDER_L};color:${C.TEXT_3};font-size:${FS.xs};text-align:center;padding:2px 6px;min-width:36px">#</th>`;
    let letterIdx = 0;
    for (let ci = 0; ci < hdrs.length; ci++) {
      if (roles[ci] === "ignore") continue;
      dataHtml += `<th style="background:${C.BORDER_L};color:${C.TEXT_3};font-size:${FS.xs};text-align:center;padding:2px 6px">${colLtr(letterIdx)}</th>`;
      letterIdx++;
    }
    dataHtml += '</tr>\n';
    // Row 2: Column names
    dataHtml += `<tr><th style="background:${C.TEXT};color:${C.WHITE};font-weight:${FW.BOLD};text-align:center;padding:4px 8px;min-width:36px">Row</th>`;
    for (let ci = 0; ci < hdrs.length; ci++) {
      if (roles[ci] === "ignore") continue;
      dataHtml += `<th style="background:${C.TEXT};color:${C.WHITE};font-weight:${FW.BOLD};text-align:center;padding:4px 8px">${esc(hdrs[ci])}</th>`;
    }
    dataHtml += '</tr>\n';
    // Data rows
    for (let ri = 0; ri < rawData.length; ri++) {
      const row = rawData[ri];
      if (!row) continue;
      dataHtml += '<tr>';
      dataHtml += `<td style="background:${C.BG_L};color:${C.TEXT_3};font-weight:${FW.BOLD};text-align:center;padding:2px 6px;font-size:${FS.xs}">${ri+1}</td>`;
      for (let ci = 0; ci < hdrs.length; ci++) {
        if (roles[ci] === "ignore") continue;
        const bg = cellBg[ri]?.[ci] || null;
        const fg = cellFg[ri]?.[ci] || null;
        let style = "padding:2px 6px";
        if (bg) style = `background:${bg};${style}`;
        if (fg && !bg) style = `color:${fg};font-weight:${FW.BOLD};${style}`;
        dataHtml += `<td style="${style}">${esc(row[ci])}</td>`;
      }
      dataHtml += '</tr>\n';
    }
    dataHtml += '</table>';

    // Build summary sheet HTML. flagLabel reads FLAG_STYLES[f].label directly
    // per S156 D1 lock — local mapping retired in favour of the single
    // source of truth.
    const flagLabel = f => FLAG_STYLES[f]?.label || f;
    const groups = buildMechanismGroups(results);
    let summHtml = `<table border="1" cellpadding="4" style="border-collapse:collapse;font-family:${FF.UI};font-size:${FS.xs}">`;
    summHtml += `<tr><td colspan="4" style="background:${C.TEXT};color:${C.WHITE};font-size:${FS.md};font-weight:${FW.BOLD};padding:8px">Check My Data Report — Severity ${severity}</td></tr>`;
    summHtml += `<tr><td colspan="4" style="padding:6px;color:${C.TEXT_3}">File: ${esc(importConfig.fileName||"uploaded")} | ${nRows} rows × ${nCols} cols | Measurement type: ${esc(assayLabel)}</td></tr>`;
    summHtml += '<tr><td colspan="4"></td></tr>';
    summHtml += `<tr style="background:${C.BG_L}"><th style="text-align:left;padding:4px 8px">Category</th><th style="text-align:left;padding:4px 8px">Test</th><th style="text-align:center;padding:4px 8px">Result</th><th style="text-align:left;padding:4px 8px">Key metric</th></tr>`;
    for (const mechKey of MECHANISM_ORDER) {
      const group = groups[mechKey];
      if (!group.tests.length) continue;
      for (const r of group.tests) {
        const rName = DISPLAY_NAMES[r.name] || r.name;
        const fl = flagLabel(r.flag);
        const flagBg = FLAG_STYLES[r.flag]?.bg||FLAG_STYLES.LOW.bg;
        const flagColor = FLAG_STYLES[r.flag]?.text||FLAG_STYLES.LOW.text;
        let metric = "";
        if (r.primaryP != null) metric = `p=${fmtP(r.primaryP)}`;
        summHtml += `<tr><td style="padding:4px 8px;color:${C.TEXT_3}">${esc(group.label)}</td><td style="padding:4px 8px">${esc(rName)}</td><td style="background:${flagBg};color:${flagColor};font-weight:${FW.BOLD};text-align:center;padding:4px 8px">${fl}</td><td style="padding:4px 8px;font-family:${FF.MONO};font-size:${FS.xs}">${esc(metric)}</td></tr>`;
      }
    }
    summHtml += '</table>';

    // Build styled HTML report and open in new tab. S156 D5: outcome
    // ladder consumes ACTION_LABEL (engine severity 0–3 → outcome 1–4 of 4).
    const action = ACTION_LABEL[severity] || { score: severity + 1, label: "Unknown" };
    const sevBg = {0:FLAG_STYLES.LOW.bg,1:FLAG_STYLES.MODERATE.bg,2:FLAG_STYLES.MODERATE.bg,3:FLAG_STYLES.HIGH.bg}[severity]||C.WHITE;
    const sevFg = {0:FLAG_STYLES.LOW.text,1:FLAG_STYLES.MODERATE.text,2:FLAG_STYLES.MODERATE.text,3:FLAG_STYLES.HIGH.text}[severity]||C.TEXT;
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Check My Data Report — ${esc(importConfig.fileName||"uploaded")}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:${FF.UI}; color:${C.TEXT}; background:${C.BG_L}; padding:24px; }
  .container { max-width:1200px; margin:0 auto; }
  h1 { font-size:${FS.xl}; font-weight:${FW.BOLD}; margin-bottom:4px; }
  .subtitle { font-size:${FS.base}; color:${C.TEXT_3}; margin-bottom:16px; }
  .sev-badge { display:inline-block; font-size:${FS.base}; font-weight:${FW.BOLD}; padding:4px 14px; border-radius:${CR.LG}; }
  .section { margin:24px 0; }
  .section h2 { font-size:${FS.lg}; font-weight:${FW.SEMI}; color:${C.TEXT}; margin-bottom:8px; border-bottom:2px solid ${C.BORDER_L}; padding-bottom:6px; }
  table { border-collapse:collapse; width:100%; font-size:${FS.xs}; }
  th { background:${C.TEXT}; color:${C.WHITE}; font-weight:${FW.SEMI}; text-align:left; padding:6px 10px; position:sticky; top:0; z-index:1; }
  td { padding:4px 8px; border-bottom:1px solid ${C.BORDER_L}; font-variant-numeric:tabular-nums; }
  .data-table { font-family:${FF.MONO}; font-size:${FS.xs}; }
  .data-table td { white-space:nowrap; }
  .data-table td:first-child, .data-table th:first-child { position:sticky; left:0; z-index:2; }
  .data-table thead tr:first-child th { position:sticky; top:0; z-index:3; }
  .data-table thead tr:nth-child(2) th { position:sticky; top:24px; z-index:3; }
  .data-table thead tr:first-child th:first-child,
  .data-table thead tr:nth-child(2) th:first-child { z-index:4; }
  .summ-table th { font-size:${FS.xs}; }
  .flag-HIGH { background:${SIGNAL.RED.bg}; color:${SIGNAL.RED.text}; font-weight:${FW.BOLD}; text-align:center; }
  .flag-MODERATE { background:${SIGNAL.AMBER.bg}; color:${SIGNAL.AMBER.text}; font-weight:${FW.BOLD}; text-align:center; }
  .flag-LOW { background:${SIGNAL.GREEN.bg}; color:${SIGNAL.GREEN.text}; text-align:center; }
  .flag-NA { color:${C.TEXT_3}; text-align:center; }
  .legend { display:flex; gap:12px; flex-wrap:wrap; margin-top:12px; font-size:${FS.xs}; }
  .legend-item { display:flex; align-items:center; gap:6px; }
  .legend-swatch { width:20px; height:14px; border-radius:${CR.SM}; border:1px solid ${C.BORDER}; }
  @media print { body { padding:8px; } th { position:static; } .no-print { display:none; } }
</style>
</head><body>
<div class="container">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h1>Check My Data report</h1>
      <div class="subtitle">${esc(importConfig.fileName||"uploaded")} · ${nRows} rows × ${nCols} columns · Measurement type: ${esc(assayLabel)}</div>
    </div>
    <div>
      <span class="sev-badge" style="background:${sevBg};color:${sevFg}">Outcome: ${action.score} of 4 — ${action.label}</span>
      <button class="no-print" onclick="window.print()" style="margin-left:12px;padding:6px 16px;border:1px solid ${C.BORDER};border-radius:${CR.MD};background:${C.WHITE};cursor:pointer;font-size:${FS.xs}">🖨 Print</button>
    </div>
  </div>

  <div class="section">
    <h2>Annotated data</h2>
    <div class="legend">
      <div class="legend-item"><div class="legend-swatch" style="background:${SIGNAL.RED.bg};border-color:${SIGNAL.RED.border}"></div>Block copy (matched columns)</div>
      <div class="legend-item"><div class="legend-swatch" style="background:${SIGNAL.AMBER.bg};border-color:${SIGNAL.AMBER.border}"></div>Duplicated row</div>
      <div class="legend-item"><div class="legend-swatch" style="background:${ACCENT.BLUE.bg};border-color:${ACCENT.BLUE.border}"></div><div class="legend-swatch" style="background:${ACCENT.PURPLE.bg};border-color:${ACCENT.PURPLE.border}"></div><div class="legend-swatch" style="background:${ACCENT.TEAL.bg};border-color:${ACCENT.TEAL.border}"></div>Within-row coincidence groups</div>
      <div class="legend-item"><div class="legend-swatch" style="background:${SIGNAL.RED.bg};border-color:${SIGNAL.RED.border}"></div>Outlier row</div>
      <div class="legend-item"><div class="legend-swatch" style="background:${ACCENT.TEAL.bg};border-color:${ACCENT.TEAL.border}"></div>Suspicious region</div>
    </div>
    <div style="overflow:auto;max-height:70vh;margin-top:8px;border:1px solid ${C.BORDER_L};border-radius:${CR.LG}">
      ${dataHtml.replace('class="data-table"','')}
    </div>
  </div>

  <div class="section">
    <h2>Test summary</h2>
    ${summHtml}
  </div>
</div>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    else { /* popup blocked fallback — download as HTML */
      const blob = new Blob([html], {type:"text/html"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${(importConfig.fileName||"check-my-data").replace(/\.[^.]+$/,"")}_report.html`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const reportLink = (label) => <span onClick={handleExcelDownload} style={{display:"inline-block",padding:"1px 8px",background:ACCENT.BLUE.color+"18",border:`1px solid ${ACCENT.BLUE.color}`,borderRadius:CR.SM,color:ACCENT.BLUE.color,fontWeight:FW.SEMI,cursor:exporting?"wait":"pointer",fontSize:FS.xs,verticalAlign:"middle"}}>{exporting?"exporting…":label}</span>;
  const [actionsOpen, setActionsOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const toggleCat = (mk) => setExpandedCats(prev => ({...prev, [mk]: !prev[mk]}));
  // Idempotent expand — used by chip/pill click to guarantee the parent
  // dimension is open before the scroll target lands. Returns same-state
  // identity when the key is already true so React skips a wasted re-render.
  const ensureCatExpanded = (mk) =>
    setExpandedCats(prev => prev[mk] ? prev : ({...prev, [mk]: true}));
  const [expandedTech, setExpandedTech] = useState({});
  const toggleTech = (mk) => setExpandedTech(prev => ({...prev, [mk]: !prev[mk]}));
  // Detailed mode state
  const [fullExpandedLookFor, setFullExpandedLookFor] = useState({});
  const [fullExpandedClearTests, setFullExpandedClearTests] = useState({});
  const [fullCatExpanded, setFullCatExpanded] = useState({});
  const [expandedTestEvidence, setExpandedTestEvidence] = useState({}); // per-test evidence expand in forensics
  // S126b add-6: idempotent set-to-true for a specific test card's
  // expansion. Used by chip/pill click so the activation flow lands on
  // a visible test card body, not just a visible dimension wrapper.
  // Identity-preserving (returns prev unchanged when already true) so a
  // click on an already-expanded card doesn't trigger a wasted re-render.
  const ensureTestCardExpanded = (testName) =>
    setExpandedTestEvidence(prev => prev[testName] ? prev : ({...prev, [testName]: true}));
  const [showMethodBattery, setShowMethodBattery] = useState(false);
  // S334 TEMPORARY — §5 form comparison. Which candidate is on screen ("A"/"B"/
  // "C") and, for A, which not-ran rows are tapped open. Delete with the views.
  const [s5Form, setS5Form] = useState("A");
  const [s5Open, setS5Open] = useState({});
  const [aiCopied, setAiCopied] = useState(false);
  // S161 (A1.D2): §4 prompt body now sourced from the shared HandoffModel
  // via renderPromptBody. handoffModel construction is memoized so the
  // §4 surface render + copy-button click read the same object.
  // renderPromptBody returns null at outcome 0; the §4 chrome short-
  // circuits earlier (severity === 0 branch at ~line 1283) so the null
  // path is the contract-guard, not the user-visible path.
  const handoffModel = useMemo(
    () => buildHandoffModel(results, importConfig, nRows, nCols),
    [results, importConfig, nRows, nCols],
  );
  const promptBody = useMemo(() => renderPromptBody(handoffModel), [handoffModel]);
  const handleAIConsult = async () => {
    const prompt = promptBody ?? "";
    if (!prompt) return;
    try { await navigator.clipboard.writeText(prompt); } catch(e) {
      const ta = document.createElement("textarea"); ta.value = prompt;
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setAiCopied(true); setTimeout(() => setAiCopied(false), 3000);
  };

  // Data profile — passed to VerdictBanner for rendering inside the card.
  //
  // Shape (S133h FIX2): two parallel collections rendered side-by-side in
  // a two-column body. `identityRows` carries dataset-defining facts
  // (Measurement type, Table size, Conditions); `settings` carries
  // configuration entries one per line (column-axis, row order, transform,
  // precision). The pre-FIX2 single `footer` string (`· `-joined entries
  // rendered below identity) collapsed into the right column; settings
  // entries are now individual strings on their own lines.
  //
  // Conditions row is conditional on the dataset having declared
  // condition names — datasets without condition columns drop to a
  // 2-row identity block.
  //
  // Provenance tags `(user-set)` / `(auto)` reflect actual plumbing.
  // Four importConfig boolean fields are threaded by
  // ImportView.handleProceed (ImportView.jsx:440) and by BatchView
  // per-result rows: `assayAutoDetected` (Measurement type identity
  // row), `colRelAutoSet` (Columns settings row), `rowSemanticsAuto`
  // (Row order settings row), `vstAutoSet` (Transform settings row).
  // Truthy → "(auto)", otherwise → "(user-set)". S153 A4 closed the
  // parked-#13 plumbing gap; BatchView path retains its
  // `rowSemanticsAuto` write at BatchView.jsx:179.
  const dataProfile = (() => {
    const s = importConfig.summary;
    const precKeys = s ? Object.keys(s.prec).map(Number).sort((a,b)=>a-b) : [];
    const precValue = precKeys.length === 1
      ? `${precKeys[0]} decimal places`
      : precKeys.length > 1
        ? `mixed (${precKeys[0]}–${precKeys[precKeys.length-1]} dp)`
        : "integer";

    const colsValue = importConfig.colRelationship === 'conditions'
      ? "conditions"
      : "replicates";

    // S138-fix1: settings carries `{ label, value }` pairs so the right
    // column mirrors the identity-row paired-fact split. Provenance tag
    // (user-set / auto) on Row order preserves S133h hard-coding —
    // STATUS parked #13 (provenance plumbing) is the real fix.
    let rowsPair = null;
    if (importConfig.rowSemantics) {
      const tag = importConfig.rowSemanticsAuto ? "(auto)" : "(user-set)";
      rowsPair = { label: "Row order", value: `${importConfig.rowSemantics} ${tag}` };
    }

    const tf = importConfig.vst?.transform;
    const transformValue = tf === 'log'         ? "log"
                          : tf && tf !== 'raw'  ? "Anscombe"
                          : "raw";

    const colsTag = importConfig.colRelAutoSet ? "(auto)" : "(user-set)";
    const transformTag = importConfig.vstAutoSet ? "(auto)" : "(user-set)";
    const assayTag = importConfig.assayAutoDetected ? "(auto)" : "(user-set)";

    const settings = [{ label: "Columns", value: `${colsValue} ${colsTag}` }];
    if (rowsPair) settings.push(rowsPair);
    settings.push(
      { label: "Transform", value: `${transformValue} ${transformTag}` },
      { label: "Precision", value: precValue },
    );

    const identityRows = [
      ["Measurement type", `${assayLabel} ${assayTag}`],
      ["Table size", `${nRows} rows × ${nCols} data columns`],
    ];
    if (s && s.cNames?.length > 0) {
      identityRows.push(["Conditions", s.cNames.join(", ")]);
    }

    return { identityRows, settings };
  })();


  return (
    <div>
      {/* Unified file bar + mode tabs */}
      <div style={{background:C.WHITE,border:`1px solid ${C.BORDER}`,borderRadius:CR.MD,marginBottom:"12px"}}>
        {/* Row 1: navigation + filename + change file. S137 (Phase C.1):
            registers re-pointed to the typography system —
            Button: base Medium C.TEXT; Filename: base Semibold C.TEXT. */}
        <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 16px",fontSize:FS.base}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,padding:0}}>← Back</button>
          <span style={{color:C.BORDER}}>|</span>
          <span style={{color:C.TEXT,fontWeight:FW.SEMI,fontSize:FS.base}}>{importConfig.fileName||"Uploaded file"}</span>
          <span style={{flex:1}}/>
          <label style={{cursor:"pointer",padding:"0 12px",height:"30px",background:C.BG,border:`1px solid ${C.BORDER}`,borderRadius:CR.SM,color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,display:"inline-flex",alignItems:"center",lineHeight:"normal",boxSizing:"border-box"}}>
            Change file
            <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={e=>{const f=e.target.files?.[0]; if(f) onChangeFile(f);}} style={{display:"none"}}/>
          </label>
        </div>
        <div style={{borderTop:`1px solid ${C.BORDER_L}`,margin:"0 16px"}}/>
        {/* Row 2: mode tabs + ⋯ actions. S137 (Phase C.1): tabs onto
            Tab (active) = base Semibold C.TEXT, Tab (inactive) = base
            Medium C.TEXT_2; letter-spacing retired. Actions trigger and
            menu items onto Button = base Medium C.TEXT. */}
        <div style={{display:"flex",alignItems:"center",padding:"8px 16px",gap:"6px"}}>
          {MODE_ORDER.map(mk=>{
            const m=MODES[mk];const active=mode===mk;
            return <button key={mk} onClick={()=>setMode(mk)} style={{
              padding:"6px 14px",fontSize:FS.base,fontWeight:active?FW.SEMI:FW.MED,
              background:"none",color:active?C.TEXT:C.TEXT_2,
              border:"none",borderBottom:active?`2px solid ${C.TEXT}`:"2px solid transparent",
              cursor:"pointer",fontFamily:FF.UI,whiteSpace:"nowrap",
              transition:"all 0.15s"
            }}>{m.label}</button>;
          })}
          <span style={{flex:1}}/>
          {/* ⋯ actions menu */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setActionsOpen(v=>!v)} style={{padding:"0 12px",height:"30px",background:"none",border:`1px solid ${C.BORDER}`,borderRadius:CR.SM,color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,cursor:"pointer",lineHeight:"normal",display:"inline-flex",alignItems:"center",gap:"3px",boxSizing:"border-box"}}>
              ⋯ Actions
            </button>
            {actionsOpen && (
              <div style={{position:"absolute",top:"100%",right:0,marginTop:4,zIndex:50,background:C.WHITE,border:`1px solid ${C.BORDER}`,borderRadius:CR.LG,boxShadow:"0 8px 24px rgba(0,0,0,.1)",minWidth:200,padding:"4px 0"}}
                onMouseLeave={()=>setActionsOpen(false)}>
                <button onClick={()=>{window.print();setActionsOpen(false)}} style={{display:"block",width:"100%",padding:"8px 16px",background:"none",border:"none",textAlign:"left",color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,cursor:"pointer",fontFamily:FF.UI}}>🖨 Print</button>
                <button onClick={()=>{handleCopySummary();setActionsOpen(false)}} style={{display:"block",width:"100%",padding:"8px 16px",background:"none",border:"none",textAlign:"left",color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,cursor:"pointer",fontFamily:FF.UI}}>{copied?"✓ Copied":"Copy summary"}</button>
                <button onClick={()=>{handleExportExcel();setActionsOpen(false)}} style={{display:"block",width:"100%",padding:"8px 16px",background:"none",border:"none",textAlign:"left",color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,cursor:"pointer",fontFamily:FF.UI}}>📊 Export report</button>
                <button onClick={()=>{setActionsOpen(false);handleExcelDownload()}} disabled={exporting} style={{display:"block",width:"100%",padding:"8px 16px",background:"none",border:"none",textAlign:"left",color:exporting?C.TEXT_3:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,cursor:exporting?"wait":"pointer",fontFamily:FF.UI}}>
                  {exporting?"⏳ Exporting…":"📥 Export to Excel"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screening-aid disclaimer — report-level preamble above §1.
          S139c original (was inline UI.INFO.callout chrome) → S161 AsideCallout
          extraction. Body register unchanged. */}
      <AsideCallout tone="info">
        Check My Data flags statistical patterns. Please interpret them using domain knowledge.
      </AsideCallout>

      {/* Replicate-structure advisory: when many ungrouped columns are treated as replicates
          AND user has not explicitly classified them via the column relationship gate,
          warn that tests assume columns are replicates. Suppressed when colRelationship
          was explicitly set (user made an informed choice). S137 (Phase C.1):
          status/warning aside-callout. S161 (A1.D2) → AsideCallout extraction; body
          register unchanged. */}
      {(() => {
        const nDC = nCols;
        const hasConds = importConfig.condPerCol?.some(c=>c) || false;
        const userChose = importConfig.colRelationship; // explicit choice via gate
        if(userChose === 'conditions') return null; // conditions mode — note not needed
        if(nDC > 6 && !hasConds && !userChose) return (
          <AsideCallout tone="warn" strongLabel="⚠ Column structure note">
            All {nDC} data columns are being treated as replicates of a single condition.
            If these are different biological samples, conditions, or time points, structural tests
            (duplicates, constant-offset, selective noise) and distributional tests (autocorrelation, runs, kurtosis, inter-replicate correlation)
            will flag inter-sample variation as anomalous. Use "Revise import" to assign condition groups if applicable.
            {importConfig.assay==="genomics" && " For raw RNA-seq counts, library size differences between samples naturally produce variance heterogeneity — normalize counts before forensic screening, or interpret Selective Noise with caution."}
          </AsideCallout>
        );
        return null;
      })()}

      {/* Excel file forensics card — shown only for .xlsx input, not in full mode (it moves into the verdict card) */}
      {importConfig.excelMeta && mode !== "full" && <ExcelMetaCard meta={importConfig.excelMeta} />}

      {/* === INVESTIGATION VIEW  === */}
      {(() => {
        // locs and convergence are memoized at component level
        // Remap localizations from matrix coords → rawData coords
        const rawDataArr = importConfig?.data || [];
        const rawRoles = importConfig?.roles || [];
        const rawHdrs = importConfig?.hdrs || [];
        const visColIndices = rawHdrs.map((_,ci) => ci).filter(ci => rawRoles[ci] !== "ignore");
        const dColMap = rawRoles.map((rl,ci)=>rl==="data"?ci:-1).filter(ci=>ci>=0);
        const dataColSet = new Set(dColMap);
        // Map matrix col → position in visible columns
        const matColToVisCol = {};
        dColMap.forEach((rawCI, matCI) => {
          const visIdx = visColIndices.indexOf(rawCI);
          if (visIdx >= 0) matColToVisCol[matCI] = visIdx;
        });
        const toOrigRow = (mi) => rowMap ? (rowMap[mi] ?? mi) : mi;
        const rawNRows = rawDataArr.length;
        const rawNCols = visColIndices.length;
        const remappedLocs = locs.map(loc => {
          const out = { ...loc };
          // Remap rows
          if (out.rows && Array.isArray(out.rows)) {
            if (out.type === "rowRange" || out.type === "block") {
              out.rows = [toOrigRow(out.rows[0]), toOrigRow(out.rows[1])];
            } else {
              out.rows = out.rows.map(r => toOrigRow(r));
            }
          }
          // Remap cols from matrix indices → visible column indices
          if (out.cols) {
            out.cols = out.cols.map(c => matColToVisCol[c]).filter(c => c != null);
          }
          // Remap cells
          if (out.cells) {
            out.cells = out.cells.map(([r, c]) => [toOrigRow(r), matColToVisCol[c]]).filter(([r,c]) => c != null);
          }
          // For row-type without cols, expand to data columns only (not label/cond)
          if ((out.type === "rows" || out.type === "rowRange" || out.type === "block") && !out.cols) {
            out.cols = dColMap.map(rc => visColIndices.indexOf(rc)).filter(i => i >= 0);
          }
          return out;
        });
        const hasFlaggedLocs = remappedLocs.length > 0;
        const dataColVis = new Set(dColMap.map(rc => visColIndices.indexOf(rc)).filter(i => i >= 0));

        // Original-file coordinate context — used by heatmap, hotspots, panels, export
        const skippedRows = importConfig.skippedRows || 0;
        const cfgHeaderRows = importConfig.headerRows || 0;
        const removedColIndices = importConfig.removedCols || [];
        const origColMap = buildOriginalColMap(rawHdrs.length, removedColIndices);
        const coordCtx = {
          skippedRows,
          headerRows: cfgHeaderRows,
          removedCols: removedColIndices,
          origColMap,           // dataCol[i] → original file col (0-based)
          headerContent: importConfig.headerContent || [],
          /** data row index → original file row (1-indexed) */
          fileRow: (dataRowIdx) => originalFileRow(dataRowIdx, skippedRows, cfgHeaderRows),
          /** data col index → Excel letter */
          fileCol: (dataColIdx) => colToExcelLetter(origColMap[dataColIdx] ?? dataColIdx),
          /** vis col index → Excel letter (via visColIndices) */
          fileColVis: (visIdx) => colToExcelLetter(origColMap[visColIndices[visIdx]] ?? visColIndices[visIdx]),
        };

        const heatmapProps = {
          convergence, rawData: rawDataArr, rowMap,
          colHeaders: visColIndices.map(ci => rawHdrs[ci]),
          visColIndices, dColMap, roles: rawRoles,
          coordCtx, condPerCol: importConfig?.condPerCol || null,
          // S126a: pass findings[] alongside convergence so consumers
          // (HotspotExcerpt, WhereToLookSection) can read finding-level
          // metadata without re-deriving from results.
          findings,
          // Content-aware column widths — per raw-column-index max
          // formatted-string length, computed at import time in
          // summary.js. ExcerptTable threads these onto per-column
          // `width` fields via colWidthFromMaxLen() so columns size to
          // actual content (no forensic-precision truncation on wide
          // values like "-0.595138"). Spans all roles, so role-state
          // doesn't change widths.
          colMaxLen: importConfig?.summary?.colMaxLen || null,
        };

        // Hotspot range formatter
        const hotspotRange = (h) => {
          const c0 = coordCtx?.fileColVis?.(h.colStart) || String(h.colStart + 1);
          const r0 = coordCtx?.fileRow?.(h.rowStart) ?? (h.rowStart + 1);
          const c1 = coordCtx?.fileColVis?.(h.colEnd) || String(h.colEnd + 1);
          const r1 = coordCtx?.fileRow?.(h.rowEnd) ?? (h.rowEnd + 1);
          return `${c0}${r0}\u2013${c1}${r1}`;
        };
        // Map hotspots to categories (excluding single-cell in QC mode)
        const hotspotsByCat = {};
        if (convergence?.hotspots) {
          for (const h of convergence.hotspots) {
            if (mode === "qc" && h.rowStart === h.rowEnd && h.colStart === h.colEnd) continue;
            const cat = h.categories[0];
            if (!hotspotsByCat[cat]) hotspotsByCat[cat] = [];
            hotspotsByCat[cat].push(h);
          }
        }

        // ── Detailed mode helpers ──────────────────────────────────────
        // Primary finding one-liner (replicates MechanismGroupPanel subtitle logic)
        const getPrimaryFinding = (r) => {
          const mf = (mr) => {
            const dr = rowMap ? (rowMap[mr] ?? mr) : mr;
            return coordCtx?.fileRow?.(dr) ?? (dr + 1);
          };
          let sub = r.interpretation || null;
          if (r.name?.includes("Inter-Replicate Correlation") || r.name?.includes("LOESS")) sub = null;
          if (r.name?.includes("Duplicate Detection")) {
            const blks = r.blockCopies || [];
            const wrTotal = r.withinRowMatches || 0;
            const wrExp = parseFloat(r.withinRowExpected) || 0;
            const dHdrs = importConfig?.hdrs || [];
            const dRoles = importConfig?.roles || [];
            const dCM = dRoles.map((rl,ci)=>rl==="data"?ci:-1).filter(ci=>ci>=0);
            const cn = (mi) => dHdrs[dCM[mi]] || `Col ${mi+1}`;
            const sBlks = blks.filter(b => !(b.isFullRow && b.height === 1));
            if (sBlks.length > 0) {
              const b = sBlks[0];
              if (b.isColumnMatch) sub = `${cn(b.srcCol ?? b.cols[0])} and ${cn(b.dstCol ?? b.cols[1])} are identical for ${b.height} consecutive rows`;
              else if (b.isFullRow) sub = `Rows ${mf(b.srcRows[0])}\u2013${mf(b.srcRows[1])} are identical to rows ${mf(b.dstRows[0])}\u2013${mf(b.dstRows[1])}`;
              else sub = `${b.height}\u00d7${b.width} block copied \u2014 rows ${mf(b.srcRows[0])}\u2013${mf(b.srcRows[1])} \u2194 ${mf(b.dstRows[0])}\u2013${mf(b.dstRows[1])}`;
            } else if ((r.rowDupGroupList||[]).length > 0) {
              const nDR = r.rowDupGroupList.reduce((s,g) => s + g.count - 1, 0);
              const nPt = r.rowDupGroupList.length;
              sub = nDR === 1 ? `1 row is an exact copy of another row` : `${nDR} rows are exact copies (${nPt} pattern${nPt>1?"s":""})`;
            } else if (wrTotal > wrExp * 1.5) {
              sub = `Data entries duplicated within-row ${(wrTotal/Math.max(wrExp,1)).toFixed(0)}\u00d7 more often than expected`;
            }
          }
          if (!sub && r.name?.includes("Kurtosis")) {
            const kp = r.pooledKurtosis;
            sub = kp < 0 ? "Replicate noise is unusually uniform \u2014 values too evenly spaced to be random"
              : kp > 0 ? "Replicates agree too closely most of the time, with occasional large discrepancies"
              : "Replicate noise shape differs from expected";
          }
          if (!sub && r.name?.includes("Mahalanobis")) {
            const n = r.nOutliers || 0;
            sub = n === 0 ? "All rows fit the dataset\u2019s overall pattern"
              : parseFloat(r.exceedFrac) > 5
                ? `${n} row${n>1?"s":""} (${r.outlierFraction}) don\u2019t fit the dataset\u2019s pattern \u2014 far more than expected`
                : `${n} row${n>1?"s":""} ha${n>1?"ve":"s"} unusual values not matching the rest`;
          }
          if (!sub && r.name?.includes("Residual Spike")) {
            const ov = r.nOverlap || 0; const ex = parseFloat(r.expectedOverlap) || 0; const rt = ex > 0 ? ov / ex : 0;
            sub = ov === 0 ? "No rows share elevated residuals across groups"
              : rt >= 3 ? `${ov} rows share elevated residuals \u2014 ${rt >= 10 ? rt.toFixed(0) : rt.toFixed(1)}\u00d7 more than expected`
              : `${ov} rows share elevated residuals across groups`;
          }
          if (!sub && r.name?.includes("Selective Noise")) {
            const cds = r.colDetails || [];
            if (cds.length >= 2) {
              const vs = cds.map(d => ({ col: d.col, v: Math.pow(parseFloat(d.residualStd)||0, 2) })).sort((a,b)=>a.v-b.v);
              const med = vs[Math.floor(vs.length/2)].v;
              const maxR = med > 0 ? vs[vs.length-1].v / med : 0; const minR = vs[0].v > 0 ? med / vs[0].v : 0;
              const dcm = (importConfig?.roles||[]).map((rl,ci)=>rl==="data"?ci:-1).filter(ci=>ci>=0);
              const hdr = (di) => (importConfig?.hdrs||[])[dcm[di]] || `Col ${di+1}`;
              sub = maxR >= minR
                ? `${hdr(vs[vs.length-1].col-1)} is ${maxR>=2?Math.round(maxR)+"\u00d7 ":""}noisier than the other columns`
                : `${hdr(vs[0].col-1)} is ${minR>=2?Math.round(minR)+"\u00d7 ":""}quieter than the other columns`;
            } else sub = "Noise differs significantly between columns";
          }
          if (r.name?.includes("Noise Scaling")) {
            const obs = parseFloat(r.observedSlope) || 0; const exp = r.expectedSlope !== "\u2014" ? parseFloat(r.expectedSlope) : null;
            const aLbl = r.assay === "general" ? "this measurement type" : (ASSAYS.find(a=>a.v===r.assay)?.l || r.assay).toLowerCase();
            sub = !exp ? "Select an assay type to compare noise scaling"
              : `${obs < 0 ? "Noise decreases with measurement size" : obs < 0.3 ? "Noise is nearly constant" : obs > 2.5 ? "Noise grows much faster than expected" : obs < exp ? "Noise grows more slowly than expected" : "Noise grows faster than expected"} \u2014 unusual for ${aLbl}`;
          }
          if (!sub && r.name?.includes("Inter-Replicate Correlation")) {
            const ns = r.nSuspicious || 0; const wins = (r.details||[]).filter(d=>d.source==="window");
            if (r.highSNRWarning) sub = "High-SNR data \u2014 limited discriminating power";
            else if (wins.length > 0 && ns === 0) { const tw = wins[0]; sub = `Cols ${tw.pair} rows ${mf(tw.startRow)}\u2013${mf(tw.endRow)} show unusually high correlation (r=${tw.rWin})`; }
            else if (ns >= 2) sub = `${ns} replicate pairs correlate more closely than the others predict`;
            else if (ns === 1) sub = "One replicate pair correlates more closely than the others predict";
            else sub = "Replicate correlation consistent with signal-to-noise ratio";
          }
          if (!sub && r.name?.includes("LOESS")) {
            const cp = r.changepointRow;
            if (r.flag === "LOW" || r.flag === "N/A") sub = "Noise character consistent across all rows";
            else if (r.pairPromoted) { const bp = r.pairResults?.reduce((a,b) => ((a.adjP||1)<(b.adjP||1)?a:b), {adjP:1,pair:"?"}); sub = `Pair cols ${bp.pair} shows localised noise inconsistency (promoted)`; }
            else if (cp != null && r.bestWindowRows) sub = `Noise character changes at row ${mf(cp)} \u2014 rows ${r.bestWindowRows||"?"} have ${r.bestDirection||"different"} noise`;
            else if (r.bestWindowRows) sub = `Rows ${r.bestWindowRows||"?"} have ${r.bestDirection||"different"} noise (${r.bestVarRatio||"?"} variance ratio)`;
            else if (cp != null) sub = `Noise level shifts at row ${mf(cp)}`;
            else sub = "Noise character varies across the dataset";
          }
          return sub;
        };

        // Category summaries (sorted by flag count, for evidence section)
        const nAppD = results.filter(r=>r.flag!=="N/A").length;
        const mgFull = buildMechanismGroups(results);
        const catSummaries = MECHANISM_ORDER.map(mk => {
          const group = mgFull[mk];
          const flagged = group.tests.filter(r=>r.flag==="HIGH");
          const noted = group.tests.filter(r=>r.flag==="MODERATE");
          const clear = group.tests.filter(r=>r.flag==="LOW");
          const applicable = group.tests.filter(r=>r.flag!=="N/A");
          const worst = flagged[0]||noted[0]||null;
          return { mk, group, flagged, noted, clear, applicable, isFlagged: flagged.length>0||noted.length>0, worst };
        }).sort((a,b) => (b.flagged.length-a.flagged.length)||(b.noted.length-a.noted.length));
        const activeCatsD = catSummaries.filter(c=>c.isFlagged);
        const cleanCatsD = catSummaries.filter(c=>!c.isFlagged);

        // ── QC mode ──
        if (mode === "qc") return (
          <>
            <Section number={1} title="Summary">
              <VerdictBanner severity={severity} results={results} importConfig={importConfig} nRows={nRows} nCols={nCols} mode={mode} dataProfile={dataProfile}/>
            </Section>

            <Section number={2} title="What was checked">
              {(() => {
                const catDescs = CATEGORY_SHORT_DESCRIPTIONS;
                const qcDescriptions = QC_CATEGORY_DESCRIPTIONS;
                const mechanismGroups = buildMechanismGroups(results);
                return MECHANISM_ORDER.map((mk, idx) => {
                  const group = mechanismGroups[mk];
                  const hasHigh = group && group.highCount > 0;
                  const hasMod = group && group.modCount > 0;
                  const isFl = hasHigh || hasMod;
                  const catResults = results.filter(r => TEST_MECHANISM[r.name] === mk && r.flag !== "N/A");
                  return (
                    <div key={mk}>
                      {idx > 0 && <div style={{borderTop:`1px solid ${C.BORDER_L}`,margin:"8px 0"}}/>}
                      <CategoryRow mk={mk} mode="qc"
                        label={MECHANISMS[mk]?.label || mk} isFlagged={isFl} hasHigh={hasHigh}
                        description={catDescs[mk]} isLast
                        coverage={summarizeCoverage(group?.tests || [])}
                        isExpanded={expandedCats[mk]} onToggle={()=>toggleCat(mk)} alwaysExpandable={false}
                        testResults={catResults} isTechExpanded={expandedTech[mk]} onToggleTech={()=>toggleTech(mk)}
                        qcDescription={qcDescriptions[mk]}
                      />
                    </div>
                  );
                });
              })()}
            </Section>

            <Section number={3} title="What next">
              <div style={{fontSize:FS.base,color:C.TEXT,lineHeight:"1.6",paddingTop:"2px"}}>
                {severity === 0 && <>Your data passed all checks. No further action needed. You can download a {reportLink("summary report")} if you'd like to keep a record.</>}
                {severity === 1 && <>One check found a minor pattern. This is common and usually has an innocent explanation — review the flagged category above to see what was found. You can download the {reportLink("annotated report")} for details.</>}
                {severity === 2 && <>
                  <div style={{marginBottom:"10px"}}>Some patterns were flagged across your data. Review the flagged categories above to understand what was found.</div>
                  <div style={{borderTop:`1px solid ${C.BORDER}`,margin:"10px 0 10px"}}/>
                  <div style={{fontWeight:FW.SEMI,color:C.TEXT,marginBottom:"6px"}}>Recommended steps:</div>
                  <ol style={{margin:0,paddingLeft:"20px",lineHeight:"1.8"}}>
                    <li>Download the {reportLink("annotated report")} to see exactly what data points were flagged</li>
                    <li>Go back to your original data source and verify the flagged values</li>
                    <li>Check if anything unusual happened when collecting them</li>
                  </ol>
                </>}
                {severity >= 3 && <>
                  <div style={{marginBottom:"10px"}}>Several unusual patterns were detected in the dataset. This doesn't necessarily mean there's a problem but it's worth checking what was flagged.</div>
                  <div style={{borderTop:`1px solid ${C.BORDER}`,margin:"10px 0 10px"}}/>
                  <div style={{fontWeight:FW.SEMI,color:C.TEXT,marginBottom:"6px"}}>Recommended steps:</div>
                  <ol style={{margin:0,paddingLeft:"20px",lineHeight:"1.8"}}>
                    <li>Download the {reportLink("annotated report")} to see exactly what data points were flagged</li>
                    <li>Go back to your original data source and verify the flagged values</li>
                    <li>Check if anything unusual happened when collecting them</li>
                    <li>If the patterns can't be explained, consider repeating the affected measurements</li>
                    <li>Discuss with colleagues or collaborators if unsure</li>
                  </ol>
                </>}
              </div>
            </Section>
          </>
        );

        // ── Review mode ──
        if (mode === "review") {
          const reviewGuidance = {
            0: "No anomalies detected. No action needed.",
            1: "These flags are likely false positives. No action needed unless other concerns exist.",
            2: <>
              <div style={{marginBottom:"8px"}}>Request the original instrument output files for the flagged regions. Specific questions to ask the authors:</div>
              <ul style={{margin:0,paddingLeft:"20px",display:"flex",flexDirection:"column",gap:"4px"}}>
                <li>Was data processed or transformed before submission?</li>
                <li>Do the flagged rows correspond to a specific experimental batch or session?</li>
                <li>Can you provide the raw instrument output for the highlighted regions?</li>
              </ul>
            </>,
            3: <>
              <div style={{marginBottom:"8px"}}>This dataset shows anomalies across multiple categories. Consider the following investigation steps:</div>
              <ul style={{margin:0,paddingLeft:"20px",display:"flex",flexDirection:"column",gap:"4px"}}>
                <li>Request raw instrument output files and lab notebooks for the relevant dates</li>
                <li>Ask for an explanation of any data processing steps applied to the raw data</li>
                <li>Ask for the experimental timeline — when were these samples collected, and by whom?</li>
                <li>Consider requesting independent replication of key results</li>
                <li>Consider whether other datasets from this group warrant screening</li>
              </ul>
            </>,
          };
          // Review mode category descriptions (finding-focused, investigation language)
          const catDescsR = CATEGORY_SHORT_DESCRIPTIONS;

          return (
          <>
            {/* ── 1. Summary ── */}
            <Section number={1} title="Summary">
              <VerdictBanner severity={severity} results={results} importConfig={importConfig} nRows={nRows} nCols={nCols} mode={mode} dataProfile={dataProfile}/>
            </Section>

            {/* ── 2. What was found / What was checked ── */}
            <Section number={2} title={severity > 0 ? "What was found" : "What was checked"}>
              {severity > 0 && (
                <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",fontSize:FS.xs,color:C.TEXT_3,marginBottom:8,paddingLeft:13}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                    <span style={{color:SEV_VERDICT[3].color,fontSize:"13px",lineHeight:1}}>{"\u26A0\uFE0E"}</span>
                    <span>High-severity flag</span>
                  </span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                    <span style={{color:SEV_VERDICT[2].color,fontSize:"13px",lineHeight:1}}>{"\u26A0\uFE0E"}</span>
                    <span>Moderate flag</span>
                  </span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                    <span style={{color:SEV_VERDICT[0].color,fontSize:"13px",lineHeight:1}}>{"\u2713\uFE0E"}</span>
                    <span>Clear</span>
                  </span>
                </div>
              )}
              {MECHANISM_ORDER.map((mk, idx) => {
                const cat = catSummaries.find(c => c.mk === mk);
                if (!cat) return null;
                const { group, flagged, applicable, isFlagged } = cat;
                return (
                  <div key={mk}>
                    {idx > 0 && <div style={{borderTop:`1px solid ${C.BORDER_L}`,margin:"8px 0"}}/>}
                    <CategoryRow mk={mk} mode="review"
                      label={group.label} isFlagged={isFlagged} hasHigh={flagged.length > 0}
                      description={catDescsR[mk]} isLast
                      coverage={summarizeCoverage(group.tests)}
                      isExpanded={expandedCats[mk]} onToggle={()=>toggleCat(mk)} alwaysExpandable={true}
                      testResults={applicable} isTechExpanded={expandedTech[mk]} onToggleTech={()=>toggleTech(mk)}
                      guidance={CATEGORY_GUIDANCE[mk]?.review}
                      expandedTestEvidence={expandedTestEvidence}
                      onToggleTestEvidence={(name,defaultOpen)=>setExpandedTestEvidence(prev=>{const cur = name in prev ? prev[name] : defaultOpen; return {...prev,[name]:!cur};})}
                      getPrimaryFinding={getPrimaryFinding}
                    />
                  </div>
                );
              })}
            </Section>

            {/* ── 3. Where to look ── */}
            {severity > 0 && (
              <Section number={3} title="Where to look">
                <HotspotExcerptList {...heatmapProps} />
              </Section>
            )}

            {/* ── 4. What to ask / What next ── */}
            <Section number={severity > 0 ? 4 : 3} title={severity > 0 ? "What to ask" : "What next"}>
              <div style={{fontSize:FS.base,color:C.TEXT,lineHeight:"1.6",paddingTop:"2px"}}>
                {reviewGuidance[severity]}
              </div>
              {severity > 0 && (
                <div style={{marginTop:"12px",fontSize:FS.base,color:C.TEXT_2}}>
                  Download the {reportLink("annotated report")} to share with colleagues or include in your review.
                </div>
              )}
              {severity === 0 && (
                <div style={{marginTop:"8px",fontSize:FS.base,color:C.TEXT_2}}>
                  You can download a {reportLink("summary report")} if you'd like to keep a record.
                </div>
              )}
            </Section>
          </>
        );
        }

        // ── Detailed analysis mode (Forensics) ──
        // renderMode flag (S126a §2c): the entry-point split for the v1.1
        // Shape F (map-as-page exploration) layout. v1.0 hard-pins
        // renderMode='document' so every forensics path flows through the
        // standard scrollable layout below; the 'exploration' branch is
        // reserved unwired and will be plugged in alongside Shape F.
        if (renderMode === "exploration") {
          // Reserved — Shape F entry point. Unwired in v1.0.
          return null;
        }

        // ── Document branch (renderMode === 'document') ──
        // S126b add-3: clean (severity===0) and flagged (severity>0)
        // share the same §1-§5 structure. ForensicsBody handles the
        // clean-state §2 body internally (no findings → "all checks
        // passed"); §3 DETAILED TEST RESULTS renders the dimension-
        // grouped cards (which collapse to the CLEAR summary line in
        // the clean case via ForensicsCategoryBlock).

        return (
          <PulseProvider>
            <PulseStyle />
            {/* ── §1 SUMMARY ── */}
            <Section number={1} title="Summary">
              <VerdictBanner severity={severity} results={results} importConfig={importConfig} nRows={nRows} nCols={nCols} mode="full" dataProfile={dataProfile}/>
            </Section>
            {/* Excel forensics — below verdict card in Detailed mode */}
            {importConfig.excelMeta && <ExcelMetaCard meta={importConfig.excelMeta} />}

            {/* ── §2 WHAT WAS FOUND + §3 DETAILED TEST RESULTS ── */}
            <ForensicsBody
              findings={findings} results={results}
              catSummaries={catSummaries}
              expandedCats={expandedCats} toggleCat={toggleCat}
              ensureCatExpanded={ensureCatExpanded}
              expandedTestEvidence={expandedTestEvidence}
              setExpandedTestEvidence={setExpandedTestEvidence}
              ensureTestCardExpanded={ensureTestCardExpanded}
              importConfig={importConfig} rowMap={rowMap}
              severity={severity}
              heatmapProps={heatmapProps}
              groupingPendingBase={groupingPendingBase}
              confirmedActive={!!confirmedResults}
              onConfirmGrouping={setConfirmedResults}
              onClearConfirmGrouping={() => setConfirmedResults(null)}
            />

            {/* ── §4 INVESTIGATE FURTHER ── */}
            <Section number={4} title="Investigate further">
              {severity === 0 ? (
                (() => {
                  // Clean-result copy is coverage-aware: a severity-0 verdict says
                  // nothing about the tests that did not run, so the coverage
                  // buckets pick the sentence. Selection order is pending, then
                  // unassessed, then not-applicable, then the all-ran state.
                  // Pending leads because it is the only state the reader can act
                  // on from here — confirm the grouping above. The errored count
                  // is appended to whichever state fires. Strings are authored
                  // copy, verbatim, each with a singular variant for a count of
                  // one (the verb and pronoun change, not only the noun).
                  const cov = summarizeCoverage(results);
                  // One "not run" figure across the page. The applicability case
                  // and the errored case both mean the test did not run; the
                  // detail sections below carry the per-test reason. Merging them
                  // replaces the old pair of sentences that gave "not run" two
                  // meanings side by side. classifyCoverage assigns each result
                  // exactly one bucket, so notApplicable and errored never overlap
                  // and the sum is clean.
                  const notRun = cov.notApplicable + cov.errored;
                  const notRunClause = notRun === 1
                    ? `1 test was not run — see the detail sections for why.`
                    : `${notRun} tests were not run — see the detail sections for why.`;
                  const lead = `No signal above threshold in the ${cov.ran} tests that completed. `;
                  let text;
                  if (cov.pending > 0) {
                    const p = cov.pending === 1
                      ? `1 test is waiting on grouping confirmation — confirm above to run it.`
                      : `${cov.pending} tests are waiting on grouping confirmation — confirm above to run them.`;
                    text = lead + p + (notRun > 0 ? " " + notRunClause : "");
                  } else if (cov.unassessed > 0) {
                    const u = cov.unassessed === 1
                      ? `1 test was left unassessed because grouping was not confirmed — this screen says nothing about it.`
                      : `${cov.unassessed} tests were left unassessed because grouping was not confirmed — this screen says nothing about them.`;
                    text = lead + u + (notRun > 0 ? " " + notRunClause : "");
                  } else if (notRun > 0) {
                    text = lead + notRunClause;
                  } else {
                    text = `All ${cov.ran} of ${BATTERY_SIZE} tests completed. None returned a signal above threshold.`;
                  }
                  return (
                    <div style={{fontSize:FS.base,color:C.TEXT_3,padding:"4px 0"}}>{text}</div>
                  );
                })()
              ) : (
                <>
                  <div style={{fontSize:FS.base,color:C.TEXT,lineHeight:"1.6",marginBottom:"12px"}}>
                    Copy the prompt below and paste it into an AI assistant. You can attach the dataset, paper, or annotated Excel report alongside it for a deeper cross-walk.
                  </div>
                  {/* S161 (A1.D2) — confidentiality callout. Neutral grey
                      UI.FRAME.callout register. Two-line copy, em-dash on
                      line 1, persistent (no dismiss state, no icon). */}
                  <AsideCallout tone="frame">
                    Check My Data runs in your browser — your data stays on your machine.<br/>
                    Anything you paste or upload to an LLM is subject to that service's terms. Review them before uploading sensitive or unpublished data.
                  </AsideCallout>
                  <div style={{background:C.BG_L,border:`1px solid ${C.BORDER}`,borderRadius:CR.MD,padding:"12px 16px",fontSize:FS.sm,fontWeight:FW.NORM,color:C.TEXT,lineHeight:"1.6",fontFamily:FF.MONO,whiteSpace:"pre-wrap",maxHeight:"180px",overflow:"auto",marginBottom:"10px"}}>
                    {promptBody}
                  </div>
                  <button onClick={handleAIConsult}
                    onMouseEnter={e => { if (!aiCopied) e.currentTarget.style.background = C.BG_L; }}
                    onMouseLeave={e => { if (!aiCopied) e.currentTarget.style.background = C.BG; }}
                    style={{padding:"8px 18px",background:aiCopied?SIGNAL.GREEN.dot:C.BG,border:aiCopied?"none":`1px solid ${C.BORDER}`,borderRadius:CR.MD,color:aiCopied?C.WHITE:C.TEXT,fontWeight:FW.MED,fontSize:FS.base,cursor:"pointer",transition:"background 0.2s"}}>
                    {aiCopied ? "✓ Copied to clipboard" : "Copy prompt"}
                  </button>
                </>
              )}
            </Section>

            {/* ── §5 TEST COVERAGE ──
                Post-S139c surface: count line + battery-details expandable. Nothing else.
                Screening-aid disclaimer relocated to report-top (above §1) as a report-
                level preamble; references retired (partial list — full citations live in
                METHODOLOGY.md). §5 spec-complete on copy, rendering, and structure.
                S139 (Phase C.3): typography-system migration — test-count line on Body
                (FS.base C.TEXT); battery body on Footnote/reference (FS.sm C.TEXT);
                disclosure toggle on Button (FS.base FW.MED C.TEXT); per-category labels
                explicit FW.SEMI.
                S139b: section renamed "Methodology" → "Test coverage" (lowered reader
                expectation to match the surface's count-line + battery scope). Battery list
                rebuilt from canonical METHOD_BATTERY (module-top) — per-test applicability
                dimming (Shape A). Category header dims when every member is skipped.
                Labels are §5-local handwritten phrasings; DO NOT substitute DISPLAY_NAMES.
                S139b-fix1: contrast pushed from one-step to two-step — applied at C.TEXT,
                skipped at C.TEXT_3. Per-span colour explicit on both states; wrapper colour
                C.TEXT so inherited punctuation (':' / ', ') aligns with the dominant tone.
                S139b-fix2: strikethrough added on skipped tests + all-skipped category
                headers (textDecoration "line-through" + textDecorationThickness "1.5px").
                Decoration colour inherits naturally from each span's color. */}
            {(()=>{
              // Completed count against the full battery, not the old
              // non-N/A-over-total form that undercounted and over-reported at
              // once. "completed" replaces "applied": an errored test applied and
              // then failed, so "applied" was wrong for a figure that excludes it.
              // A single "not run" clause carries the applicability and errored
              // counts together — the figure §4 shows — so the page reads one
              // vocabulary. notApplicable is no longer the implicit remainder; it
              // is named here as part of "not run". Unassessed stays its own clause.
              const cov = summarizeCoverage(results);
              // Un-struck means "completed". Key on the completed result names,
              // not on the N/A names: a test skipped through dtSkip/condSkip/rsSkip
              // is stamped with its dispatch label ("Kurtosis", "Selective Noise"),
              // which differs from the battery's result name for two tests, so an
              // N/A-name check leaves those two wrongly un-struck. The completed
              // set always carries the result name a running test stamps.
              const completedNames = new Set(results.filter(r=>classifyCoverage(r)==="ran").map(r=>r.name));
              const notRun = cov.notApplicable + cov.errored;
              const coverageExtra = [];
              if (notRun > 0) coverageExtra.push(notRun === 1 ? `1 not run` : `${notRun} not run`);
              if (cov.unassessed > 0) coverageExtra.push(`${cov.unassessed} left unassessed`);
              return (
                <Section number={5} title="Test coverage">
                  <div style={{fontSize:FS.base,color:C.TEXT,marginBottom:"12px"}}>
                    {cov.ran} of {cov.total} tests completed, spanning 5 investigation categories.{coverageExtra.length > 0 ? ` ${coverageExtra.join(", ")}.` : ""}
                  </div>
                  {/* Battery */}
                  <button onClick={()=>setShowMethodBattery(v=>!v)} style={{background:"none",border:"none",padding:0,cursor:"pointer",color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,fontFamily:FF.UI,display:"flex",alignItems:"center",gap:"4px",marginBottom:"4px"}}>
                    <span>{showMethodBattery?"▾":"▸"}</span>
                    <span>Test battery details</span>
                  </button>
                  {showMethodBattery && (
                    <div style={{padding:"10px 14px",background:C.BG_L,borderRadius:CR.SM,fontSize:FS.sm,color:C.TEXT}}>
                      {/* S334 TEMPORARY — three-way form comparison for §5.
                          A tick grid (import-screen shape) · B reasons · C the
                          current strike list. Remove with the losing candidates
                          once the form is chosen. */}
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px",flexWrap:"wrap"}}>
                        <span style={{fontSize:FS.xs,color:C.TEXT_3}}>Temporary — comparing forms:</span>
                        {[["A","A · Tick grid"],["B","B · Reasons"],["C","C · Current"]].map(([k,lbl])=>{
                          const active=s5Form===k;
                          return (
                            <button key={k} onClick={()=>setS5Form(k)}
                              style={{fontSize:FS.sm,fontFamily:FF.UI,fontWeight:active?FW.MED:FW.NORM,padding:"3px 10px",borderRadius:CR.SM,cursor:"pointer",
                                background:active?C.TEXT_2:C.WHITE,color:active?C.WHITE:C.TEXT_2,border:`1px solid ${active?C.TEXT_2:C.BORDER}`}}>
                              {lbl}
                            </button>
                          );
                        })}
                      </div>
                      {s5Form==="A" && <S5TickGrid results={results} open={s5Open} setOpen={setS5Open} />}
                      {s5Form==="B" && <S5Reasons results={results} />}
                      {s5Form==="C" && (
                        <div>
                          {METHOD_BATTERY.map((cat,ci)=>{
                            const allSkipped=cat.tests.every(([n])=>!completedNames.has(n));
                            const isLast=ci===METHOD_BATTERY.length-1;
                            return (
                              <div key={cat.label} style={isLast?undefined:{marginBottom:"4px"}}>
                                <span style={{fontWeight:FW.SEMI,color:allSkipped?C.TEXT_3:C.TEXT,...(allSkipped&&{textDecoration:"line-through",textDecorationThickness:"1.5px"})}}>{cat.label}:</span>{" "}
                                {cat.tests.flatMap(([n,label],i)=>{
                                  const sk=!completedNames.has(n);
                                  const span=<span key={n} style={{color:sk?C.TEXT_3:C.TEXT,...(sk&&{textDecoration:"line-through",textDecorationThickness:"1.5px"})}}>{label}</span>;
                                  return i===0?[span]:[", ",span];
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Section>
              );
            })()}
          </PulseProvider>
        );
      })()}
    </div>
  );
}
