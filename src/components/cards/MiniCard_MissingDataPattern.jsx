/* ── MiniCard: Missing Data Pattern ── */

import { C, CC, FW, FF, CF, CP, CS, SIGNAL } from "../../constants/tokens.js";
import { fmtPBadge } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { PlotSVG } from "../plots/PlotSVG.jsx";
import { MissingDataHeatmap } from "../plots/MissingDataHeatmap.jsx";
import { shortColName, makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD } from "../shared/styles.js";

const MISSING_FILL = "rgba(239, 68, 68, 0.45)";

export function MiniCard_MissingDataPattern({ result, importConfig, rowMap }) {
  const nPairwise = result.nPairwiseHits || 0;
  const nCond = result.nCondHits || 0;
  const nBlock = result.nBlockHits || 0;

  // Column setup
  const hdrs = importConfig?.hdrs || [];
  const roles = importConfig?.roles || [];
  const rawData = importConfig?.data || [];
  const dataColMap = roles.map((r, i) => r === "data" ? i : -1).filter(i => i >= 0);
  const colRates = result.colMissRates || [];
  const colNames = colRates.map((_, i) => shortColName(hdrs[dataColMap[i]] || `Col ${i + 1}`));

  // Coordinate mapping
  const { fileRow } = makeRowMapper(importConfig, rowMap);

  // ── Per-column missing rate bar chart (compact) ──
  let colBarPlot = null;
  if (colRates.length > 0 && colRates.length <= 50) {
    const n = colRates.length;
    const W = CP.W;
    const PL = 52, PR = 8, PT = 6, PB = 30;
    const plotW = W - PL - PR, plotH = 36;
    const H = PT + plotH + PB;
    const barW = Math.max(4, (plotW / n) - 2);
    const barGap = (plotW - n * barW) / (n + 1);
    const maxRate = Math.max(...colRates.map(r => r * 100), 10);
    const yNice = maxRate <= 10 ? 5 : maxRate <= 30 ? 10 : 20;
    const yMax = Math.ceil(maxRate / yNice) * yNice;
    const py = (pct) => PT + plotH - (pct / yMax) * plotH;
    const bx = (i) => PL + barGap + i * (barW + barGap + (barGap > 0 ? 0 : 2));

    const yTicks = [];
    for (let v = 0; v <= yMax; v += yNice) yTicks.push(v);

    colBarPlot = (
      <PlotSVG W={W} H={H}>
        {yTicks.map(v => (
          <line key={v} x1={PL} y1={py(v)} x2={PL + plotW} y2={py(v)}
            stroke={C.BORDER_L} strokeWidth={CS.GRID.w} />
        ))}
        <line x1={PL} y1={PT} x2={PL} y2={PT + plotH}
          stroke={C.BORDER} strokeWidth={CS.GRID.w} />
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PL - 3} y1={py(v)} x2={PL} y2={py(v)}
              stroke={C.BORDER} strokeWidth={CS.GRID.w} />
            <text x={PL - 5} y={py(v) + 3} fontSize={CF.SMALL} fill={C.TEXT_3}
              textAnchor="end" fontFamily={FF.MONO}>{v}%</text>
          </g>
        ))}
        <text x={10} y={PT + plotH / 2} fontSize={CF.SMALL} fill={C.TEXT_3}
          textAnchor="middle" fontFamily={FF.UI}
          transform={`rotate(-90,10,${PT + plotH / 2})`}>Missing %</text>
        {colRates.map((rate, i) => {
          const pct = rate * 100;
          const x = bx(i);
          const h = (pct / yMax) * plotH;
          return <rect key={i} x={x} y={py(pct)} width={barW} height={Math.max(h, 0.5)}
            fill={CC.OBS} fillOpacity="0.35" stroke={CC.OBS} strokeWidth="1" />;
        })}
        <line x1={PL} y1={PT + plotH} x2={PL + plotW} y2={PT + plotH}
          stroke={C.BORDER} strokeWidth={CS.GRID.w} />
        {colRates.map((_, i) => (
          <text key={i} x={bx(i) + barW / 2} y={PT + plotH + 12} fontSize={CF.SMALL}
            fill={C.TEXT_3} textAnchor="end" fontFamily={FF.UI}
            transform={`rotate(-45,${bx(i) + barW / 2},${PT + plotH + 12})`}>
            {colNames[i]}
          </text>
        ))}
      </PlotSVG>
    );
  }

  // ── Spatial missing data heatmap with block annotations ──
  let heatmap = null;
  const blockItems = result.blockHits || [];
  if (rawData.length > 0 && dataColMap.length > 0 && result.nMissing > 0) {
    const missGrid = rawData.map(row =>
      dataColMap.map(ci => row[ci] === null || row[ci] === undefined || row[ci] === "")
    );
    const fileRows = rawData.map((_, ri) => fileRow(ri));
    heatmap = (
      <MissingDataHeatmap
        missGrid={missGrid}
        colNames={colNames}
        fileRows={fileRows}
        blocks={blockItems}
      />
    );
  }

  return (
    <MiniCardLayout result={result}
      footer={<>
        {result.nMissing} missing cells ({result.missRate})
        {nPairwise > 0 && ` · ${nPairwise} pairwise`}
        {nCond > 0 && ` · ${nCond} condition-dependent`}
        {nBlock > 0 && ` · ${nBlock} block${nBlock !== 1 ? "s" : ""}`}
        {" · " + fmtPBadge(result.primaryP)}
      </>}
      lookFor="Check if missing data clusters in specific conditions, rows, or column groups. Block missingness — where a rectangular region is entirely empty — is a strong indicator of selective deletion. If missingness is condition-dependent (e.g., more missing in the treatment group), this may indicate data was removed to change results."
      implications="Missing values that cluster spatially can result from systematic instrument failures — for example, a plate reader losing signal in adjacent wells, or a sample batch that failed processing. They can also indicate selective deletion, where inconvenient values were removed rather than reported.">

      {colBarPlot && <>
        <div style={SUB_HEAD}>Per-column missing rate</div>
        <PlotLayout>{colBarPlot}</PlotLayout>
      </>}

      {heatmap && <>
        <div style={{...SUB_HEAD, marginTop: "8px"}}>Spatial distribution</div>
        <PlotLayout>{heatmap}</PlotLayout>
        <ChartLegend items={[
          { color: MISSING_FILL, label: "Missing cell" },
          ...(blockItems.length > 0 ? [{ color: "transparent", label: "Significant block", stroke: SIGNAL.RED.dot }] : []),
        ]} />
      </>}

    </MiniCardLayout>
  );
}
