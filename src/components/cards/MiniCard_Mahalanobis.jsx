import { MiniCardLayout, CardBanner } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { MahalanobisDistPlot } from "../plots/MahalanobisDistPlot.jsx";
import { C, CC, FW, FF, OBS } from "../../constants/tokens.js";
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
  const condColorMap = buildCondColorMap(importConfig);

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
      legendItems.push({ color, label: cd.condition, swatchType: "dot", opacity: OBS.dot.fillOpacity });
    });
  } else if (hasSinglePlot) {
    legendItems.push({ color: CC.OBS, label: "Normal", swatchType: "dot", opacity: OBS.dot.fillOpacity });
  }
  // S267: the plot drops both marks in the zero-survivor state (outlierThreshold
  // === null → no threshold line, empty outlierRows → no dots). Gate the keys on
  // the same survivor count so the legend never lists an undrawn mark.
  if (totalOutliers > 0) {
    legendItems.push({ color: CC.THRESH, label: "Outlier", swatchType: "dot", opacity: 0.85 });
    legendItems.push({ color: CC.THRESH, label: "Significance threshold", swatchType: "line", dashed: true, opacity: 0.7 });
  }

  return (
    <MiniCardLayout result={result}
      footer={(result.flag !== "LOW" && result.flag !== "N/A")
        ? `${totalOutliers} row${totalOutliers !== 1 ? "s have" : " has"} an unusual combination of values`
        : "No unusual rows"}
      lookFor="The test names the specific rows. Inspect those rows in the raw data files and check whether each is a recorded anomaly — a known bad sample, a flagged well — or has no explanation. Cross-reference the other row-level tests: a row that also flags for smoothness or duplication is more than a lone outlier. Cross-reference Covariance anomalies as well — a row that sits inside a block flagged there is part of a structured anomaly, not a stray point, which the per-row view alone cannot tell you."
      implications="A row sitting far from its condition's centre can be a genuine biological outlier — a sample that really did behave differently. It can also indicate a row built or edited to values that do not sit naturally with the rest, such as a figure transcribed into the wrong row or a fabricated entry that ignores how the replicates normally move together.">

      {result.plateNote && <CardBanner type="caution">{result.plateNote}</CardBanner>}
      {(hasAllCond || hasSinglePlot) && (<>
        {/* S210 (multi-surface): primary-surface heading dropped — the footer
            fragment (LEAD_HEAD in MiniCardLayout) heads this primary plot. */}
        <PlotLayout fitContent>
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
        // S217: fixed declared columns (was Object.keys-derived). Producer emits
        // {Row, Distance, "p-value"}; the aggregator prepends group → Condition.
        const keys = isAgg ? ["group", "Row", "Distance", "p-value"] : ["Row", "Distance", "p-value"];
        const etCols = isAgg
          ? [{label:"Condition"}, {label:"Row"}, {label:"Distance"}, {label:"p"}]
          : [{label:"Row"}, {label:"Distance"}, {label:"p"}];
        const etRows = outlierList.slice(0, 100).map(row => keys.map(k => {
          // Remap Row from 1-indexed matrix position to original file row
          if (k === "Row" && typeof row[k] === "number") return fileRow(row[k] - 1);
          return row[k];
        }));
        return (
          <div style={{marginTop: BLOCK_GAP}}>
            {/* S210 (multi-surface): secondary-surface heading kept but demoted
                (Regular weight) to read clearly below the footer-lead. */}
            <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Outlier rows</div>
            <EvidenceTable columns={etCols} rows={etRows} identifierColumns={isAgg ? 2 : 1}
              footerText={outlierList.length > 100 ? `Showing 100 of ${outlierList.length}.` : undefined} />
          </div>
        );
      })()}
    </MiniCardLayout>
  );
}
