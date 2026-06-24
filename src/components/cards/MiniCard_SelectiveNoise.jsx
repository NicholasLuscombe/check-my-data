/* ── MiniCard: Selective Noise ── */

import { C, FW, FF, CC, EXP } from "../../constants/tokens.js";
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

const isCleared = result.flag === "LOW" || result.flag === "N/A";
const footerText = isCleared
  ? "Noise levels are even across columns"
  : "Noise levels differ across columns more than expected";
const lookForText = "Identify which column is the outlier and whether it is quiet or noisy. Inspect the raw data files for that column and compare it against the others to confirm it was measured the same way.";
const implicationsText = "A column varying more or less than the others can arise from a real difference in how a replicate was run: e.g., a different operator, instrument, or day. It can also indicate a fabricated column: e.g., values typed with too little noise come out quieter than real replicates, and values padded with added noise come out louder.";

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
      <PlotLayout fitContent>
          <NoiseSpreadPlot colDetails={labelledCols}
            flaggedCols={flaggedCols.size > 0 ? flaggedCols : undefined}
            flag={result.flag}/>
      </PlotLayout>
      <ChartLegend items={[
        ...(result.flag !== "LOW" ? [{ color: EXP.band.fill, label: "Expected", opacity: EXP.band.fillOpacity }] : []),
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
