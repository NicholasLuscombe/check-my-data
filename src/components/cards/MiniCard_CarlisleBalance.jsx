/* ── MiniCard: Carlisle Baseline Balance ── */

import { C, CC, CF, FS, FW, FF, SIGNAL } from "../../constants/tokens.js";
import { fmtP, fmtPBadge } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { DataTable } from "../shared/DataTable.jsx";

import { PlotLayout } from "../shared/PlotLayout.jsx";
import { PlotSVG } from "../plots/PlotSVG.jsx";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";

export function MiniCard_CarlisleBalance({ result, importConfig, rowMap }) {
  const nFeatures = result.nFeatures || 0;
  const direction = result.direction || "normal";

  // P-value histogram (10 bins, expected uniform)
  const histBins = result.histBins || [];
  let histPlot = null;
  if (histBins.length === 10 && nFeatures > 0) {
    const W = 280, H = 80, padL = 2, padR = 2, padT = 2, padB = 14;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const barW = plotW / 10;
    const maxC = Math.max(...histBins, 1);
    const expectedPerBin = nFeatures / 10;

    histPlot = (
      <PlotSVG width={W} height={H} style={{ display: "block", margin: "4px auto" }}>
        {histBins.map((count, i) => {
          const x = padL + i * barW;
          const h = (count / maxC) * plotH;
          const isExcess = i === 9 && count > expectedPerBin * 2; // last bin (0.9–1.0) excess
          const isDeficit = i === 0 && count > expectedPerBin * 2; // first bin excess
          const fill = isExcess ? SIGNAL.RED.dot : isDeficit ? SIGNAL.AMBER.dot : C.TEXT_3;
          return <rect key={i} x={x} y={padT + plotH - h} width={barW - 1} height={h}
            fill={fill} fillOpacity="0.35" stroke={fill} strokeWidth="1" />;
        })}
        {/* Expected uniform line */}
        {(() => {
          const ey = padT + plotH - (expectedPerBin / maxC) * plotH;
          return <line x1={padL} y1={ey} x2={padL + plotW} y2={ey}
            stroke={CC.EXP} strokeWidth={1} strokeDasharray="4,3" opacity={0.6} />;
        })()}
        <text x={padL + plotW / 2} y={H - 1} textAnchor="middle" fontSize={CF.SMALL} fill={C.TEXT_3}>
          Per-feature p-value distribution (10 bins)
        </text>
      </PlotSVG>
    );
  }

  const details = result.details || [];

  return (
    <MiniCardLayout result={result}
      footer={result.flag !== "LOW" && result.flag !== "N/A"
        ? "Differences between conditions smaller than chance across most features"
        : "Balance as expected"}
      lookFor="If most p-values cluster near 1.0, the conditions are suspiciously identical — as if someone fabricated the data to ensure perfect balance. In clinical trials, this is a hallmark of Carlisle-type fabrication. If p-values cluster near 0, allocation may not be random."
      implications="Groups that match more closely than random assignment predicts can occasionally occur by chance, particularly with small sample sizes or when stratified randomisation was used. Consistently near-perfect balance across many features, however, is unlikely under genuine random assignment and may indicate that group allocations were adjusted after the data was observed.">

      {histPlot && <>
        <PlotLayout>
          {histPlot}
        </PlotLayout>
        <div style={{fontSize:FS.sm,fontFamily:FF.UI,color:C.TEXT_2,marginTop:"4px"}}>
          Bar height = count of features per p-value bin. Dashed line = expected under uniform.
          {direction === "too balanced" && " Highlighted bar = excess p-values near 1.0 (too balanced)."}
          {` How far the bars sit from the dashed expected line: ${fmtPBadge(result.ksP)}.`}
        </div>
      </>}

      {details.length > 0 && (
        <div style={{ marginTop: histPlot ? BLOCK_GAP : 0 }}>
          {/* S210 (multi-surface): secondary-surface heading demoted (Regular
              weight) when the plot is present; dropped when the table is the
              sole surface (footer-lead heads it). */}
          {histPlot && <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Balance across conditions, per feature</div>}
          <DataTable data={details} maxRows={20} compact identifierColumns={1} totalCount={nFeatures} columns={[
            { header: "Feature", bold: true, render: d => d.Feature },
            { header: "p", render: d => d["ANOVA p"] },
            { header: "Condition means", render: d => d.Means },
          ]} />
        </div>
      )}

    </MiniCardLayout>
  );
}
