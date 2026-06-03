import { MiniCardLayout, CardBanner } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { MahalanobisDistPlot } from "../plots/MahalanobisDistPlot.jsx";
import { C, CC, FW, FF } from "../../constants/tokens.js";
import { COND_COLORS, buildCondColorMap } from "../../constants/roles.js";
import { makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";


export function MiniCard_Mahalanobis({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const sub = result.subDetails || [];
  const isAgg = result.groupsAssessed !== undefined;
  const totalOutliers = isAgg ? sub.length : (result.nOutliers || 0);

  // Coordinate mapping
  const { fileRow } = makeRowMapper(importConfig, rowMap);

  // Condition colours
  const condColorMap = buildCondColorMap(importConfig?.condPerCol);

  // Show per-condition chart only when stratified result won (isAgg).
  // When pooled wins, show single "All data" series to match pooled table/flag.
  const hasAllCond = isAgg && result.allCondD2?.length > 0;
  const hasSinglePlot = result.plotD2?.length > 0;

  // Outlier-row membership the plot colours from — bound to the SAME set the
  // table and footer use (S207), never re-derived from a distance threshold.
  // Coordinates align with each series' plotD2Rows (0-indexed):
  //   pooled   — details[].Row is 1-indexed validIdx → −1.
  //   per-cond — subDetails[].Row is dataset-relative 1-indexed → −1, keyed by condition.
  const pooledOutlierRows = !isAgg
    ? details.filter(d => typeof d.Row === "number").map(d => d.Row - 1)
    : [];
  const outlierRowsByCond = {};
  if (isAgg) {
    sub.forEach(s => {
      if (typeof s.Row === "number") (outlierRowsByCond[s.group] ||= []).push(s.Row - 1);
    });
  }

  // Build legend — dot swatches for conditions, dashed line for threshold
  const legendItems = [];
  if (hasAllCond) {
    result.allCondD2.forEach((cd, ci) => {
      const color = condColorMap[cd.condition]?.text || COND_COLORS[ci % COND_COLORS.length].text;
      legendItems.push({ color, label: cd.condition, swatchType: "dot" });
    });
  } else if (hasSinglePlot) {
    legendItems.push({ color: CC.OBS, label: "Normal", swatchType: "dot", opacity: 0.55 });
  }
  legendItems.push({ color: CC.THRESH, label: "Outlier", swatchType: "dot" });
  legendItems.push({ color: CC.THRESH, label: "Significance threshold", swatchType: "line", dashed: true, opacity: 0.7 });

  return (
    <MiniCardLayout result={result}
      footer={totalOutliers > 0
        ? `${totalOutliers} row${totalOutliers !== 1 ? "s have" : " has"} an unusual combination of values`
        : "No unusual rows"}
      lookFor="Outlier rows have values that don't fit the multivariate pattern of the rest of the data — they may have been manually edited, transcribed from a different source, or constructed independently. Check whether the flagged rows correspond to key experimental results (e.g. the treatment group showing the desired effect). Look at the specific values in those rows: are they rounder, more regular, or inconsistent with the instrument's precision?"
      implications="Rows that are multivariate outliers — plausible individually but unusual in combination — can result from genuine biological outlier samples or heavy-tailed distributions. They can also indicate rows where values were generated independently rather than drawn from the same multivariate distribution as the rest of the data.">

      {result.plateNote && <CardBanner type="caution">{result.plateNote}</CardBanner>}
      {(hasAllCond || hasSinglePlot) && (<>
        {/* S210 (multi-surface): primary-surface heading dropped — the footer
            fragment (LEAD_HEAD in MiniCardLayout) heads this primary plot. */}
        <PlotLayout>
          <MahalanobisDistPlot
            allCondD2={hasAllCond ? result.allCondD2 : undefined}
            condColorMap={condColorMap}
            plotD2={hasSinglePlot ? result.plotD2 : undefined}
            plotD2Rows={hasSinglePlot ? result.plotD2Rows : undefined}
            plotThreshold={result.plotThreshold}
            outlierThreshold={result.outlierThreshold}
            outlierRowsByCond={outlierRowsByCond}
            pooledOutlierRows={pooledOutlierRows}
            fileRow={fileRow}
          />
        </PlotLayout>
        <ChartLegend items={legendItems} />
      </>)}
      {(() => {
        const outlierList = isAgg ? sub : details;
        if (!outlierList.length) return null;
        const cols = Object.keys(outlierList[0]);
        const headerMap = { group: "Condition" };
        const etCols = cols.map(k => ({ label: headerMap[k] || k.charAt(0).toUpperCase() + k.slice(1) }));
        const etRows = outlierList.slice(0, 100).map(row => cols.map(k => {
          // Remap Row from 1-indexed matrix position to original file row
          if (k === "Row" && typeof row[k] === "number") return fileRow(row[k] - 1);
          return row[k];
        }));
        return (
          <div style={{marginTop: BLOCK_GAP}}>
            {/* S210 (multi-surface): secondary-surface heading kept but demoted
                (Regular weight) to read clearly below the footer-lead. */}
            <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Outlier rows</div>
            <EvidenceTable columns={etCols} rows={etRows} identifierColumns={isAgg ? 2 : 1} />
          </div>
        );
      })()}
    </MiniCardLayout>
  );
}
