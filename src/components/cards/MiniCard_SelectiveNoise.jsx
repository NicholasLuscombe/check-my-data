/* ── MiniCard: Selective Noise ── */

import { C, FW, FF, CC } from "../../constants/tokens.js";
import { MiniCardLayout, CardBanner } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { HBarPlot } from "../plots/HBarPlot.jsx";
import { NoiseSpreadPlot } from "../plots/NoiseSpreadPlot.jsx";
import { fmtP } from "../../constants/thresholds.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";


export function MiniCard_SelectiveNoise({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const isAgg = result.groupsAssessed !== undefined;
const pivotBanner = result.pivotNote ? (
  <CardBanner type="info">
    ⤵ <strong>Pivot mode:</strong> columns represent distinct experimental groups — variance differences between groups are expected by design. Flag suppressed.
  </CardBanner>
) : null;
// Resolve column names from importConfig
const dataHeaders = importConfig?.hdrs || [];
const roles = importConfig?.roles || [];
const dColMap = roles.map((rl,ci)=>rl==="data"?ci:-1).filter(ci=>ci>=0);
const cn = (di) => dataHeaders[dColMap[di]] || `Column ${di+1}`;

// Per-column Levene results (available on single-run path)
const perCol = result.perColumnResults || [];
const flaggedCols = new Set(perCol.filter(c => c.flagged).map(c => c.col));
const flaggedNames = [...flaggedCols].map(c => cn(c - 1));

// Identify the worst outlier for the lookFor / footer copy (from per-column results if available, else heuristic)
const cds = result.colDetails || [];
let outlierName = "", outlierDir = "";
if (flaggedNames.length === 1) {
  outlierName = flaggedNames[0];
  const fc = perCol.find(c => c.flagged);
  outlierDir = fc?.direction || "anomalous";
} else if (flaggedNames.length > 1) {
  outlierName = flaggedNames.join(", ");
  outlierDir = "anomalous";
} else if (cds.length >= 2) {
  // Legacy heuristic fallback (aggregated path or no per-column results)
  const vars = cds.map(d => ({ col: d.col, v: Math.pow(parseFloat(d.residualStd)||0, 2) }));
  vars.sort((a,b) => a.v - b.v);
  const medianV = vars[Math.floor(vars.length/2)].v;
  const maxV = vars[vars.length-1].v, minV = vars[0].v;
  const maxRatio = medianV > 0 ? maxV / medianV : 0;
  const minRatio = minV > 0 ? medianV / minV : 0;
  if (maxRatio >= minRatio) {
    outlierName = cn(vars[vars.length-1].col - 1);
    outlierDir = "noisier";
  } else {
    outlierName = cn(vars[0].col - 1);
    outlierDir = "quieter";
  }
}

// outlierName / outlierDir (computed above) now feed only the lookFor copy
// below — the footer no longer names a column. The footer-register sweep
// (S209) retired the per-column naming: the flag derives from the omnibus
// Bartlett statistic, not the display-only per-column Levene, so a named
// column could fire on a global-only result the engine never localised.
const isCleared = result.flag === "LOW" || result.flag === "N/A";
const footerText = isCleared
  ? "Noise levels are even across columns"
  : "Noise levels differ across columns more than expected";
const namesColumn = flaggedCols.size > 0;
const lookForText = !namesColumn
  ? `Look for one or more columns whose noise differs from the rest — some appearing smoother or rounder, or one noticeably more variable, at similar signal levels. Compare each replicate column's raw values against the instrument output file to check whether any column was smoothed, averaged, or had noise added.`
  : outlierDir === "quieter"
  ? `${outlierName || "One column"} has less noise than the others — this can happen when a column's values were smoothed, averaged, or manually adjusted. Compare the flagged column's raw values against the instrument output file. Check whether the quiet column's values are rounder or less variable than the others at similar signal levels.`
  : `${outlierName || "One column"} has more noise than the others — this can happen when noise was added to one column to disguise data concerns, or when that column was measured under different conditions. Check whether the noisy column corresponds to a different instrument, operator, or date.`;
const implicationsText = "Unequal variability across replicate columns can result from different instruments, operators, or measurement conditions per column — for example, one plate reader producing noisier readings than another. It can also indicate that one column's values have a different origin from the others — for example, one replicate measured and the others constructed.";

if(isAgg) {
  const items=details.map(d=>({...d, ratio:parseFloat(d.varRatio)||0}));
  return (
    <MiniCardLayout result={result}
      footer={footerText} lookFor={lookForText} implications={implicationsText}>
      {pivotBanner}
      <PlotLayout>
          <HBarPlot items={items} accessor={d=>d.ratio}
            xlabel="Max/min residual variance ratio across replicates"
            maxOverride={Math.max(4,...items.map(d=>d.ratio))}/>
      </PlotLayout>
    </MiniCardLayout>
  );
}
if(result.colDetails?.length) {
  const labelledCols = result.colDetails.map(d => ({...d, label: cn(d.col - 1)}));
  return (
    <MiniCardLayout result={result}
      footer={footerText} lookFor={lookForText} implications={implicationsText}>
      {pivotBanner}
      {/* S210 (multi-surface): primary-surface heading dropped — the footer
          fragment (LEAD_HEAD in MiniCardLayout) heads this primary plot. */}
      <PlotLayout>
          <NoiseSpreadPlot colDetails={labelledCols}
            flaggedCols={flaggedCols.size > 0 ? flaggedCols : undefined}
            flag={result.flag}/>
      </PlotLayout>
      <ChartLegend items={[
        ...(result.flag !== "LOW" ? [{ color: CC.EXP, label: "Expected", opacity: 0.25 }] : []),
        { color: CC.OBS, label: "Consistent with rest", swatchType: "line" },
        { color: CC.THRESH, label: "Differs from rest", swatchType: "line" },
      ]} />
      {perCol.length > 0 && result.flag !== "LOW" && result.flag !== "N/A" && (
        <div style={{marginTop: BLOCK_GAP}}>
          {/* S210 (multi-surface): secondary-surface heading kept but demoted
              (Regular weight) to read clearly below the footer-lead. */}
          <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Spread compared to expected, per column</div>
          {(() => {
            const sds = perCol.map(d => d.residualStd);
            const sorted = [...sds].sort((a, b) => a - b);
            const medianSD = sorted[sorted.length >> 1];
            return <EvidenceTable
              columns={["Column", "Observed SD", "Expected SD", "Ratio", "Adj. p", "Finding"]}
              identifierColumns={1}
              rows={perCol.map(d => {
                const ratio = medianSD > 0 ? d.residualStd / medianSD : 1;
                // S218: Finding word follows per-column significance — the same
                // flagged field (adjP < ALPHA.FLAG) that colours the plot — with the
                // per-column direction supplying the high/low word. The SD-ratio band
                // is retired from the word; effect size stays visible in the Observed
                // SD and Ratio columns.
                const finding = !d.flagged
                  ? "As expected"
                  : d.direction === "quieter" ? "Quieter" : "Noisier";
                return [
                  { value: cn(d.col - 1), style: { fontFamily: FF.UI } },
                  d.residualStd.toFixed(4),
                  medianSD.toFixed(4),
                  ratio.toFixed(2) + "×",
                  fmtP(d.adjP),
                  { value: finding, style: { fontFamily: FF.UI } },
                ];
              })}
            />;
          })()}
        </div>
      )}
    </MiniCardLayout>
  );
}
return pivotBanner;
}
