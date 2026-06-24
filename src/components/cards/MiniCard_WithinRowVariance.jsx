/* ── MiniCard: Within-Row Variance ── */

import { C, CC, CF, CS, FW, FF, OBS, SIGNAL } from "../../constants/tokens.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";

import { ChartLegend } from "../shared/ChartLegend.jsx";
import { PlotSVG } from "../plots/PlotSVG.jsx";
import { makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";
import { Z_THRESH } from "../../tests/withinRowVariance.js";

export function MiniCard_WithinRowVariance({ result, importConfig, rowMap }) {
  // Producer emits 1-indexed matrix rows in d.Row; render file rows so the
  // card matches the §2 highlight's `#` column.
  const { toFileRow } = makeRowMapper(importConfig, rowMap);
  const nOut = result.nOutliers || 0;

  // Z-score histogram
  const zScores = result.zScores || [];
  let histPlot = null;
  if (zScores.length > 10) {
    const bins = 40;
    const zMin = Math.min(-5, Math.min(...zScores));
    const zMax = Math.max(5, Math.max(...zScores));
    const binW = (zMax - zMin) / bins;
    const counts = new Array(bins).fill(0);
    for (const z of zScores) {
      const bi = Math.min(bins - 1, Math.max(0, Math.floor((z - zMin) / binW)));
      counts[bi]++;
    }
    const maxC = Math.max(...counts, 1);
    const W = 280, H = 80, padL = 2, padR = 2, padT = 2, padB = 14;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const barW = plotW / bins;

    histPlot = (
      <PlotSVG W={W} H={H}>
        {counts.map((c, i) => {
          const x = padL + i * barW;
          const h = (c / maxC) * plotH;
          const zMid = zMin + (i + 0.5) * binW;
          const isOutlier = Math.abs(zMid) > Z_THRESH;
          const fill = isOutlier ? SIGNAL.RED.dot : CC.OBS;
          return <rect key={i} x={x} y={padT + plotH - h} width={barW - 0.5} height={h}
            fill={fill} fillOpacity={OBS.areaFill.fillOpacity} stroke={fill} strokeWidth="1" />;
        })}
        {/* Threshold lines at ±Z_THRESH */}
        {[-Z_THRESH, Z_THRESH].map(z => {
          const x = padL + ((z - zMin) / (zMax - zMin)) * plotW;
          return x > padL && x < W - padR ? (
            <line key={z} x1={x} y1={padT} x2={x} y2={padT + plotH}
              stroke={SIGNAL.RED.dot} strokeWidth={1} strokeDasharray="3,2" opacity={CS.REF.opacity} />
          ) : null;
        })}
        {/* Labels */}
        <text x={padL + plotW / 2} y={H - 1} textAnchor="middle" fontSize={CF.SMALL} fill={C.TEXT_3}>z-score (SD vs expected)</text>
      </PlotSVG>
    );
  }

  // Per-condition routing path: aggregator rebuilds `details` as the
  // per-group summary, so the table binds to `subDetails` (per-row evidence
  // prefixed with `group`) when aggregated. The aggregator already
  // dataset-remaps `d.Row` for row-keyed tests, so toFileRow continues to
  // work on subDetails. Matches MiniCard_Mahalanobis precedent.
  const isAgg = result.groupsAssessed !== undefined;
  const sub = result.subDetails || [];
  const tableSource = isAgg ? sub : (result.details || []);
  const rows = tableSource.slice(0, 20);

  return (
    <MiniCardLayout result={result}
      footer={nOut > 0
        ? (nOut === 1
            ? "1 row has unusual spread across its replicates"
            : `${nOut} rows have unusual spread across their replicates`)
        : "No rows with unusual spread"}
      lookFor="Identify the flagged rows and inspect them in the raw data files: replicates that match exactly, or differ only in the last digit, are the concern. Check whether the smooth rows cluster in particular conditions or a stretch of the dataset, which points to a fabricated block rather than scattered chance. Cross-reference Noise distribution: if the dataset's replicate differences are also too flat in shape, the two together point to noise drawn from a uniform range rather than measured — the same fabrication seen as too-alike rows here and as the wrong noise shape there."
      implications={`Rows whose replicates are too alike point to a single value entered and then copied across the replicates with little or no added noise. It is the signature of "type a number, then fill the replicates." Real replicates of the same sample differ by at least the measurement's own noise.`}>

      {histPlot && <>
        <PlotLayout fitContent>
          {histPlot}
        </PlotLayout>
        <ChartLegend items={[
          { color: SIGNAL.RED.dot, label: `Outside ±${Z_THRESH}σ threshold`, opacity: OBS.areaFill.fillOpacity },
          { color: CC.OBS, label: "Within expected range", opacity: OBS.areaFill.fillOpacity },
        ]} />
      </>}

      {rows.length > 0 && (
        <div style={{ marginTop: histPlot ? BLOCK_GAP : 0 }}>
          {/* S210 (multi-surface): secondary-surface heading demoted (Regular
              weight) when the plot is present; dropped when the table is the
              sole surface (footer-lead heads it). */}
          {histPlot && <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Outlier rows</div>}
          <EvidenceTable
            columns={isAgg
              ? [{label:"Condition"},{label:"Row"},{label:"z"},{label:"SD"},{label:"Expected"},{label:"Finding"}]
              : [{label:"Row"},{label:"z"},{label:"SD"},{label:"Expected"},{label:"Finding"}]}
            identifierColumns={isAgg ? 2 : 1}
            compact
            rows={rows.slice(0,20).map(d => {
              const base = [
                {value: toFileRow(d.Row), style:{fontWeight:FW.BOLD}},
                {value: d.z, style:{fontWeight:FW.BOLD}},
                d.SD,
                d.Expected,
                {value: d.Direction, style:{fontFamily:FF.UI}},
              ];
              return isAgg ? [{value: d.group, style:{fontFamily:FF.UI}}, ...base] : base;
            })}
            footerText={nOut > 20 ? `Showing 20 of ${nOut}.` : undefined}
          />
        </div>
      )}

    </MiniCardLayout>
  );
}
