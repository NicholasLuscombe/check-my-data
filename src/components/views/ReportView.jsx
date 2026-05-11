import React, { useState, useMemo } from "react";
import { extractLocalizations, buildMechanismGroups } from "../../analysis/localization.js";
import { buildConvergenceFromFindings } from "../../analysis/convergence.js";
import { buildFindings } from "../../analysis/findings.js";
import { computeSeverity } from "../../analysis/severity.js";
import { VerdictBanner } from "./VerdictBanner.jsx";
import { buildConsultationPrompt } from "../../analysis/narrative.js";
import { CategoryRow } from "../shared/CategoryRow.jsx";
import { HotspotExcerptList } from "./HotspotExcerptList.jsx";
import { PulseProvider } from "../forensics/pulseContext.jsx";
import { PulseStyle } from "../forensics/PulseStyle.jsx";
import { ForensicsBody } from "../forensics/ForensicsBody.jsx";
import { C, FF, FW, TF, FS, CR, UI, BADGE, SIGNAL, ACCENT, SEV_VERDICT, SEVERITY_WORD, DUP_GROUP_PALETTE } from "../../constants/tokens.js";
import { FLAG_STYLES, ALPHA, fmtP } from "../../constants/thresholds.js";
import { MECHANISMS, MECHANISM_ORDER, DISPLAY_NAMES, TEST_DESCRIPTIONS, TEST_MECHANISM, GLOBAL_TESTS } from "../../constants/mechanisms.js";
import { ASSAYS, DATA_TYPES } from "../../constants/assays.js";
import { ROLES } from "../../constants/roles.js";
import { Section } from "../shared/Section.jsx";
import { ExcelMetaCard } from "../cards/ExcelMetaCard.jsx";
import { TestCard } from "../cards/TestCard.jsx";
import { KeyFindings } from "../shared/KeyFindings.jsx";
import { MODE_ORDER, MODES, CATEGORY_GUIDANCE, QC_HOTSPOT_NARRATIVE } from "../../constants/guidance.js";
import { CATEGORY_SHORT_DESCRIPTIONS, QC_CATEGORY_DESCRIPTIONS } from "../../constants/descriptions.js";
import { originalFileRow, colToExcelLetter, buildOriginalColMap } from "../shared/coordinates.js";
// Dynamic import: export module + SheetJS + JSZip loaded only when user clicks Export
const lazyExportToExcel = async (opts) => {
  const { exportToExcel } = await import("../../export/excelExport.js");
  return exportToExcel(opts);
};

const SEV_COLORS={3:SEV_VERDICT[3].color,2:SEV_VERDICT[2].color,1:SEV_VERDICT[1].color,0:SEV_VERDICT[0].color,"SKIP":ROLES.condition.color,"ERROR":SIGNAL.RED.dot};

export function ReportView({ results, importConfig, matrix, rowMap, onBack, onChangeFile }) {
  const { severity, high, mod, nFlaggedDimensions } = computeSeverity(results);
  const sevColor=SEV_COLORS[severity];
  const assayLabel=ASSAYS.find(a=>a.v===importConfig.assay)?.l||importConfig.assay;
  const nRows = matrix?.length || importConfig.nRows || 0;
  const nCols = matrix?.[0]?.length || importConfig.nCols || 0;

  // ── S126a: findings[] is the canonical aggregator over results ──
  // Convergence grid + GlobalKeyFindings + LocalKeyFindings + the
  // individual-localising-findings filter all read from this one structure.
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
    const flagLabel = f => ({HIGH:"FLAGGED",MODERATE:"NOTED",LOW:"CLEAR","N/A":"N/A"}[f]||f);
    lines.push(`=== Check My Data v0.8 ===`);
    lines.push(`File: ${importConfig.fileName||"uploaded"} | ${nRows} rows × ${nCols} cols | Assay: ${assayLabel} | Data: ${DATA_TYPES.find(d=>d.v===(importConfig.dataType||"continuous"))?.l||"Continuous"}${importConfig.colRelationship==='conditions'?' | Columns: Non-replicates':''} | Severity: ${severity}`);
    if(importConfig.zeroAsMissing) lines.push(`Zeros excluded.`);
    if(importConfig.vst && importConfig.vst.transform !== 'raw')
      lines.push(`VST: ${importConfig.vst.transform} — ${importConfig.vst.reason}`);
    lines.push(``);
    // Mechanism-grouped output (matches UI)
    const groups = buildMechanismGroups(results);
    for(const mechKey of MECHANISM_ORDER){
      const group = groups[mechKey];
      if(!group.tests.length) continue;
      const applicable = group.tests.filter(t=>t.flag!=="N/A").length;
      const flagSummary = group.highCount || group.modCount
        ? ` — ${group.highCount} FLAGGED, ${group.modCount} NOTED`
        : ` — clear`;
      lines.push(`── ${group.label.toUpperCase()} (${applicable}/${group.tests.length} applicable${flagSummary}) ──`);
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
          if(r.nBins!=null) detail+=` nBins=${r.nBins} nDistinct=${r.nDistinct||"?"} isInt=${r.isInteger||"?"} null=${r.p1Source||"?"}`;
          lines.push(`  ${flagLabel(r.flag).padEnd(8)} ${r.name}${detail}`);
          if(r.blockCopies?.length){
            for(const blk of r.blockCopies.slice(0,5)){
              const s1=(rowMap?rowMap[blk.srcRows[0]]:blk.srcRows[0])+1, s2=(rowMap?rowMap[blk.srcRows[1]]:blk.srcRows[1])+1;
              const d1=(rowMap?rowMap[blk.dstRows[0]]:blk.dstRows[0])+1, d2=(rowMap?rowMap[blk.dstRows[1]]:blk.dstRows[1])+1;
              lines.push(`           block: ${blk.height}×${blk.width} rows ${s1}–${s2} ↔ ${d1}–${d2} cols=[${blk.cols.slice(0,8).join(",")}${blk.cols.length>8?"…":""}]`);
            }
          }
          if(r.rowDupGroupList?.length){
            for(const g of r.rowDupGroupList.slice(0,5)){
              const rowNums=g.rows.slice(0,10).map(ri=>(rowMap?rowMap[ri]:ri)+1).join(", ");
              lines.push(`           dupGroup: ${g.count}× rows=[${rowNums}${g.rows.length>10?"…":""}] vals=${g.values?.slice(0,60)||""}`);
            }
          } else if(r.details?.length){
            const dups=r.details.filter(d=>d.type==="duplicate-row").slice(0,3);
            for(const d of dups) lines.push(`           dupRow: ${d.rows} vals=${d.values?.slice(0,60)||""}`);
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
        // -- Autocorrelation --
        if(r.name?.includes("Autocorrelation")){
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
          detail+=` χ²=${r.chiSquared} MAD=${r.MAD} ${r.MADConformity||""} pMAD=${r.pMAD} n=${r.nValues}`;
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
        // -- Mahalanobis Row Outlier --
        if(r.name?.includes("Mahalanobis")){
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
          if(r.details?.length) for(const d of r.details.slice(0,5)) lines.push(`           col ${d.Col}: ${d.Direction} H=${d.H_obs} exp=${d.H_expected} ratio=${d.Ratio} adjP=${fmtP(d.adjP)}`);
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
    let dataHtml = `<table class="data-table" border="1" cellpadding="3" style="border-collapse:collapse;font-family:${FF.MONO};font-size:${TF.DETAIL}">`;
    // Row 1: Excel column letters
    dataHtml += `<tr><th style="background:${C.BORDER_L};color:${C.TEXT_4};font-size:${TF.SMALL};text-align:center;padding:2px 6px;min-width:36px">#</th>`;
    let letterIdx = 0;
    for (let ci = 0; ci < hdrs.length; ci++) {
      if (roles[ci] === "ignore") continue;
      dataHtml += `<th style="background:${C.BORDER_L};color:${C.TEXT_4};font-size:${TF.SMALL};text-align:center;padding:2px 6px">${colLtr(letterIdx)}</th>`;
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
      dataHtml += `<td style="background:${C.BG_L};color:${C.TEXT_3};font-weight:${FW.BOLD};text-align:center;padding:2px 6px;font-size:${TF.DETAIL}">${ri+1}</td>`;
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

    // Build summary sheet HTML
    const flagLabel = f => ({HIGH:"FLAGGED",MODERATE:"NOTED",LOW:"CLEAR","N/A":"N/A"}[f]||f);
    const groups = buildMechanismGroups(results);
    let summHtml = `<table border="1" cellpadding="4" style="border-collapse:collapse;font-family:${FF.UI};font-size:${TF.DETAIL}">`;
    summHtml += `<tr><td colspan="4" style="background:${C.TEXT};color:${C.WHITE};font-size:${TF.TITLE};font-weight:${FW.BOLD};padding:8px">Check My Data Report — Severity ${severity}</td></tr>`;
    summHtml += `<tr><td colspan="4" style="padding:6px;color:${C.TEXT_3}">File: ${esc(importConfig.fileName||"uploaded")} | ${nRows} rows × ${nCols} cols | Assay: ${esc(assayLabel)}</td></tr>`;
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
        summHtml += `<tr><td style="padding:4px 8px;color:${C.TEXT_3}">${esc(group.label)}</td><td style="padding:4px 8px">${esc(rName)}</td><td style="background:${flagBg};color:${flagColor};font-weight:${FW.BOLD};text-align:center;padding:4px 8px">${fl}</td><td style="padding:4px 8px;font-family:${FF.MONO};font-size:${TF.DETAIL}">${esc(metric)}</td></tr>`;
      }
    }
    summHtml += '</table>';

    // Build styled HTML report and open in new tab
    const sevLabel = SEVERITY_WORD[severity] || "Unknown";
    const sevBg = {0:FLAG_STYLES.LOW.bg,1:FLAG_STYLES.MODERATE.bg,2:FLAG_STYLES.MODERATE.bg,3:FLAG_STYLES.HIGH.bg}[severity]||C.WHITE;
    const sevFg = {0:FLAG_STYLES.LOW.text,1:FLAG_STYLES.MODERATE.text,2:FLAG_STYLES.MODERATE.text,3:FLAG_STYLES.HIGH.text}[severity]||C.TEXT;
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Check My Data Report — ${esc(importConfig.fileName||"uploaded")}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:${FF.UI}; color:${C.TEXT}; background:${C.BG_L}; padding:24px; }
  .container { max-width:1200px; margin:0 auto; }
  h1 { font-size:${TF.HERO}; font-weight:${FW.BOLD}; margin-bottom:4px; }
  .subtitle { font-size:${TF.BODY}; color:${C.TEXT_3}; margin-bottom:16px; }
  .sev-badge { display:inline-block; font-size:${TF.BODY}; font-weight:${FW.BOLD}; padding:4px 14px; border-radius:${CR.LG}; }
  .section { margin:24px 0; }
  .section h2 { font-size:${TF.BODY}; font-weight:${FW.BOLD}; color:${C.TEXT}; margin-bottom:8px; border-bottom:2px solid ${C.BORDER_L}; padding-bottom:6px; }
  table { border-collapse:collapse; width:100%; font-size:${TF.DETAIL}; }
  th { background:${C.TEXT}; color:${C.WHITE}; font-weight:${FW.SEMI}; text-align:left; padding:6px 10px; position:sticky; top:0; z-index:1; }
  td { padding:4px 8px; border-bottom:1px solid ${C.BORDER_L}; font-variant-numeric:tabular-nums; }
  .data-table { font-family:${FF.MONO}; font-size:${TF.DETAIL}; }
  .data-table td { white-space:nowrap; }
  .data-table td:first-child, .data-table th:first-child { position:sticky; left:0; z-index:2; }
  .data-table thead tr:first-child th { position:sticky; top:0; z-index:3; }
  .data-table thead tr:nth-child(2) th { position:sticky; top:24px; z-index:3; }
  .data-table thead tr:first-child th:first-child,
  .data-table thead tr:nth-child(2) th:first-child { z-index:4; }
  .summ-table th { font-size:${TF.DETAIL}; }
  .flag-HIGH { background:${SIGNAL.RED.bg}; color:${SIGNAL.RED.text}; font-weight:${FW.BOLD}; text-align:center; }
  .flag-MODERATE { background:${SIGNAL.AMBER.bg}; color:${SIGNAL.AMBER.text}; font-weight:${FW.BOLD}; text-align:center; }
  .flag-LOW { background:${SIGNAL.GREEN.bg}; color:${SIGNAL.GREEN.text}; text-align:center; }
  .flag-NA { color:${C.TEXT_4}; text-align:center; }
  .legend { display:flex; gap:12px; flex-wrap:wrap; margin-top:12px; font-size:${TF.DETAIL}; }
  .legend-item { display:flex; align-items:center; gap:6px; }
  .legend-swatch { width:20px; height:14px; border-radius:${CR.SM}; border:1px solid ${C.BORDER}; }
  @media print { body { padding:8px; } th { position:static; } .no-print { display:none; } }
</style>
</head><body>
<div class="container">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h1>Check My Data Report</h1>
      <div class="subtitle">${esc(importConfig.fileName||"uploaded")} · ${nRows} rows × ${nCols} columns · Assay: ${esc(assayLabel)}</div>
    </div>
    <div>
      <span class="sev-badge" style="background:${sevBg};color:${sevFg}">Severity ${severity} — ${sevLabel}</span>
      <button class="no-print" onclick="window.print()" style="margin-left:12px;padding:6px 16px;border:1px solid ${C.BORDER};border-radius:${CR.MD};background:${C.WHITE};cursor:pointer;font-size:${TF.DETAIL}">🖨 Print</button>
    </div>
  </div>

  <div class="section">
    <h2>Annotated Data</h2>
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
    <h2>Test Summary</h2>
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

  const reportLink = (label) => <span onClick={handleExcelDownload} style={{display:"inline-block",padding:"1px 8px",background:ACCENT.BLUE.color+"18",border:`1px solid ${ACCENT.BLUE.color}`,borderRadius:CR.SM,color:ACCENT.BLUE.color,fontWeight:FW.SEMI,cursor:exporting?"wait":"pointer",fontSize:TF.DETAIL,verticalAlign:"middle"}}>{exporting?"exporting…":label}</span>;
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
  const [showMethodRefs, setShowMethodRefs] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const handleAIConsult = async () => {
    const prompt = buildConsultationPrompt(results, importConfig, nRows, nCols, severity);
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
  // Provenance tags `(user-set)` / `(auto)` reflect actual plumbing:
  // - Row semantics: `importConfig.rowSemanticsAuto` is set on the
  //   BatchView path (long-format / genomics / assay reasons) and left
  //   undefined on the standalone ImportView path; auto truthy → tag
  //   "(auto)", otherwise tag "(user-set)".
  // - Column axis + transform: the in-ImportView auto-set flags
  //   (`colRelAutoSet`, `vstAutoSet`) are NOT threaded through
  //   `importConfig`, so provenance is unknown at this surface. Per
  //   S133h spec we emit untagged rather than fabricate `(auto)` /
  //   `(user-set)`. Plumbing gap parked #15.
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

    const settings = [{ label: "Columns", value: colsValue }];
    if (rowsPair) settings.push(rowsPair);
    settings.push(
      { label: "Transform", value: transformValue },
      { label: "Precision", value: precValue },
    );

    const identityRows = [
      ["Measurement type", assayLabel],
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
                <button onClick={()=>{handleCopySummary();setActionsOpen(false)}} style={{display:"block",width:"100%",padding:"8px 16px",background:"none",border:"none",textAlign:"left",color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,cursor:"pointer",fontFamily:FF.UI}}>{copied?"✓ Copied":"📋 Copy summary"}</button>
                <button onClick={()=>{handleExportExcel();setActionsOpen(false)}} style={{display:"block",width:"100%",padding:"8px 16px",background:"none",border:"none",textAlign:"left",color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,cursor:"pointer",fontFamily:FF.UI}}>📊 Export report</button>
                <button onClick={()=>{setActionsOpen(false);handleExcelDownload()}} disabled={exporting} style={{display:"block",width:"100%",padding:"8px 16px",background:"none",border:"none",textAlign:"left",color:exporting?C.TEXT_3:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,cursor:exporting?"wait":"pointer",fontFamily:FF.UI}}>
                  {exporting?"⏳ Exporting…":"📥 Export to Excel"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replicate-structure advisory: when many ungrouped columns are treated as replicates
          AND user has not explicitly classified them via the column relationship gate,
          warn that tests assume columns are replicates. Suppressed when colRelationship
          was explicitly set (user made an informed choice). S137 (Phase C.1): rebuilt
          as a status/warning aside-callout per typography system — light-amber bg
          (UI.WARN.callout.bg) + 3px amber left rule (UI.WARN.callout.rule), bullet-lead
          Semibold + body Regular at FS.sm sentence case. Pre-S137 chrome was a bordered
          banner with a mono ALL CAPS Bold label. */}
      {(() => {
        const nDC = nCols;
        const hasConds = importConfig.condPerCol?.some(c=>c) || false;
        const userChose = importConfig.colRelationship; // explicit choice via gate
        if(userChose === 'conditions') return null; // conditions mode — note not needed
        if(nDC > 6 && !hasConds && !userChose) return (
          <div style={{background:UI.WARN.callout.bg,borderLeft:`3px solid ${UI.WARN.callout.rule}`,borderRadius:"0 4px 4px 0",
            padding:"14px 18px",marginBottom:"12px",fontSize:FS.sm,color:C.TEXT,lineHeight:"1.6",fontFamily:FF.UI}}>
            <span style={{fontWeight:FW.SEMI}}>⚠ Column structure note</span>
            <span style={{marginLeft:"8px"}}>
              All {nDC} data columns are being treated as replicates of a single condition.
              If these are different biological samples, conditions, or time points, structural tests
              (duplicates, constant-offset, selective noise) and distributional tests (autocorrelation, runs, kurtosis, inter-replicate correlation)
              will flag inter-sample variation as anomalous. Use "Revise import" to assign condition groups if applicable.
              {importConfig.assay==="genomics" && " For raw RNA-seq counts, library size differences between samples naturally produce variance heterogeneity — normalize counts before forensic screening, or interpret Selective Noise with caution."}
            </span>
          </div>
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
                      {idx > 0 && <div style={{borderTop:"1px solid #E0E0E0",margin:"8px 0"}}/>}
                      <CategoryRow mk={mk} mode="qc"
                        label={MECHANISMS[mk]?.label || mk} isFlagged={isFl} hasHigh={hasHigh}
                        description={catDescs[mk]}
                        checkCount={catResults.length} isLast
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
              <div style={{fontSize:TF.BODY,color:C.TEXT,lineHeight:"1.6",paddingTop:"2px"}}>
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
                <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",fontSize:TF.SMALL,color:C.TEXT_3,marginBottom:8,paddingLeft:13}}>
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
                    {idx > 0 && <div style={{borderTop:"1px solid #E0E0E0",margin:"8px 0"}}/>}
                    <CategoryRow mk={mk} mode="review"
                      label={group.label} isFlagged={isFlagged} hasHigh={flagged.length > 0}
                      description={catDescsR[mk]}
                      checkCount={applicable.length} isLast
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
              <div style={{fontSize:TF.BODY,color:C.TEXT,lineHeight:"1.6",paddingTop:"2px"}}>
                {reviewGuidance[severity]}
              </div>
              {severity > 0 && (
                <div style={{marginTop:"12px",fontSize:TF.BODY,color:C.TEXT_2}}>
                  Download the {reportLink("annotated report")} to share with colleagues or include in your review.
                </div>
              )}
              {severity === 0 && (
                <div style={{marginTop:"8px",fontSize:TF.BODY,color:C.TEXT_2}}>
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
            />

            {/* ── §4 INVESTIGATE FURTHER ── */}
            <Section number={4} title="Investigate further">
              {severity === 0 ? (
                <div style={{fontSize:TF.BODY,color:C.TEXT_3,padding:"4px 0"}}>No anomalies were detected. No further investigation is needed.</div>
              ) : (
                <>
                  <div style={{fontSize:TF.BODY,color:C.TEXT_2,lineHeight:"1.6",marginBottom:"12px"}}>
                    Copy the prompt below and paste it into Claude or another AI assistant for help interpreting these findings and planning next steps.
                  </div>
                  <div style={{background:C.BG_L,border:`1px solid ${C.BORDER}`,borderRadius:CR.MD,padding:"12px 16px",fontSize:TF.DETAIL,color:C.TEXT_3,lineHeight:"1.6",fontFamily:"monospace",whiteSpace:"pre-wrap",maxHeight:"180px",overflow:"auto",marginBottom:"10px"}}>
                    {buildConsultationPrompt(results, importConfig, nRows, nCols, severity)}
                  </div>
                  <button onClick={handleAIConsult} style={{padding:"8px 18px",background:aiCopied?SIGNAL.GREEN.dot:ACCENT.BLUE.color,border:"none",borderRadius:CR.MD,color:C.WHITE,fontWeight:FW.SEMI,fontSize:TF.BODY,cursor:"pointer",transition:"background 0.2s"}}>
                    {aiCopied ? "✓ Copied to clipboard" : "📋 Copy prompt"}
                  </button>
                </>
              )}
            </Section>

            {/* ── §5 METHODOLOGY ──
                S139 (Phase C.3): full sweep onto the typography system. Test-count line at
                Body prose register (FS.base FW.NORM C.TEXT). Screening-aid disclaimer promoted
                to a trust-aside-callout (UI.INFO.callout) mirroring S137's WARN callout for
                the column-structure note. Disclosure toggles on the Button register (FS.base
                FW.MED C.TEXT). Battery + references body on the Footnote/reference register
                (FS.sm FW.NORM C.TEXT_2). Per-category labels promoted to explicit FW.SEMI. */}
            {(()=>{
              const nApp=results.filter(r=>r.flag!=="N/A").length;
              return (
                <Section number={5} title="Methodology">
                  <div style={{fontSize:FS.base,color:C.TEXT,marginBottom:"12px"}}>
                    {nApp} of {results.length} tests applied, spanning 5 investigation categories.
                  </div>
                  <div style={{background:UI.INFO.callout.bg,borderLeft:`3px solid ${UI.INFO.callout.rule}`,borderRadius:"0 4px 4px 0",
                    padding:"14px 18px",marginBottom:"12px",fontSize:FS.sm,color:C.TEXT,fontFamily:FF.UI}}>
                    This report is a screening aid, not a determination of misconduct. Flagged patterns require expert interpretation in context.
                  </div>
                  {/* Battery */}
                  <button onClick={()=>setShowMethodBattery(v=>!v)} style={{background:"none",border:"none",padding:0,cursor:"pointer",color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,fontFamily:FF.UI,display:"flex",alignItems:"center",gap:"4px",marginBottom:"4px"}}>
                    <span>{showMethodBattery?"▾":"▸"}</span>
                    <span>Test battery details</span>
                  </button>
                  {showMethodBattery && (
                    <div style={{padding:"10px 14px",background:C.BG_L,borderRadius:CR.SM,fontSize:FS.sm,color:C.TEXT_2,marginBottom:"8px"}}>
                      <div style={{marginBottom:"4px"}}><span style={{fontWeight:FW.SEMI,color:C.TEXT_2}}>Copy, paste, edit:</span> Duplicate detection, constant-offset blocks, residual spike correlation</div>
                      <div style={{marginBottom:"4px"}}><span style={{fontWeight:FW.SEMI,color:C.TEXT_2}}>Unusual digits:</span> Terminal digit preference, Benford 1st &amp; 2nd digit, decimal precision clustering, value-frequency spikes</div>
                      <div style={{marginBottom:"4px"}}><span style={{fontWeight:FW.SEMI,color:C.TEXT_2}}>Distribution shapes:</span> Entropy / Zipf analysis, column goodness-of-fit, modality test</div>
                      <div style={{marginBottom:"4px"}}><span style={{fontWeight:FW.SEMI,color:C.TEXT_2}}>Cross-replicate comparisons:</span> Inter-replicate correlation, kurtosis + Anderson-Darling, autocorrelation, runs test, noise scaling, within-row variance, selective noise, regional noise, LOESS + CUSUM noise changepoint, row-mean runs, Mahalanobis unusual rows, missing data patterns</div>
                      <div><span style={{fontWeight:FW.SEMI,color:C.TEXT_2}}>Cross-group comparisons:</span> Cross-condition Spearman rank, Carlisle condition balance</div>
                    </div>
                  )}
                  {/* References */}
                  <button onClick={()=>setShowMethodRefs(v=>!v)} style={{background:"none",border:"none",padding:0,cursor:"pointer",color:C.TEXT,fontSize:FS.base,fontWeight:FW.MED,fontFamily:FF.UI,display:"flex",alignItems:"center",gap:"4px"}}>
                    <span>{showMethodRefs?"▾":"▸"}</span>
                    <span>References</span>
                  </button>
                  {showMethodRefs && (
                    <div style={{padding:"10px 14px",background:C.BG_L,borderRadius:CR.SM,fontSize:FS.sm,color:C.TEXT_2,marginTop:"4px"}}>
                      Simonsohn (2013); Al-Marzouki et al. (2005); Carlisle (2017); Bik et al. (2016); Nigrini (2012); Mosimann et al. (2002); Wald &amp; Wolfowitz (1940); Efron (2007); Mahalanobis (1936)
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
