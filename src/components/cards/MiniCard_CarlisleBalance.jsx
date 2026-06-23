/* ── MiniCard: Carlisle Baseline Balance ── */

import { C, CC, CF, CS, FS, FW, FF, OBS, SIGNAL } from "../../constants/tokens.js";
import { fmtP, fmtPBadge } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { DataTable } from "../shared/DataTable.jsx";
import { makeRowMapper } from "../shared/coordinates.js";

import { PlotLayout } from "../shared/PlotLayout.jsx";
import { PlotSVG } from "../plots/PlotSVG.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";

// Round-interval step for the count axis (~4 intervals over [0, max]),
// floored at 1 so integer-count axes never get a fractional tick.
function niceStep(max) {
  const raw = (max / 4) || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

export function MiniCard_CarlisleBalance({ result, importConfig, rowMap }) {
  const nFeatures = result.nFeatures || 0;
  // Verdict gate shared by the red bin, the legend swatch, and the caption,
  // so colour and explanation always move together.
  const isFlagged = result.flag !== "LOW" && result.flag !== "N/A";
  // Maps a raw matrix row index to the file row the investigator sees in their
  // spreadsheet (accounts for stripped header and preamble rows). Used for the
  // column-grouped path's "Row N" labels.
  const mapper = makeRowMapper(importConfig, rowMap);

  // P-value histogram (10 bins, expected uniform)
  const histBins = result.histBins || [];
  let histPlot = null;
  if (histBins.length === 10 && nFeatures > 0) {
    // Axis gutters added S212: left for the count scale, bottom for the
    // p-value tick row plus the existing caption line.
    const W = 280, H = 104, padL = 30, padR = 8, padT = 6, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const barW = plotW / 10;
    const maxC = Math.max(...histBins, 1);
    const expectedPerBin = nFeatures / 10;
    const baselineY = padT + plotH;
    const xForP = p => padL + p * plotW;          // x is the literal [0,1] bin range
    const yForCount = c => baselineY - (c / maxC) * plotH;

    // Count-axis ticks — round intervals over [0, maxC], always labelling 0
    // and the top (bars stay scaled to maxC, so the top tick is the tallest
    // bar). Drop a near-top round tick that would collide with the top label.
    const cStep = Math.max(1, niceStep(maxC));
    const yTicks = [];
    for (let t = 0; t <= maxC - cStep * 0.99; t += cStep) yTicks.push(Math.round(t));
    yTicks.push(maxC);
    // p-axis ticks — clean quarter marks; p = 1.0 sits under the excess bin.
    const xTicks = [0, 0.25, 0.5, 0.75, 1];

    histPlot = (
      <PlotSVG W={W} H={H}>
        {/* count-axis gridlines + labels (behind the bars) */}
        {yTicks.map(t => (
          <g key={`y${t}`}>
            {t > 0 && (
              <line x1={padL} y1={yForCount(t)} x2={padL + plotW} y2={yForCount(t)}
                stroke={C.BORDER_L} strokeWidth={CS.GRID.w} />
            )}
            <text x={padL - 4} y={yForCount(t) + 3} fontSize={CF.TICK} fill={C.TEXT_3}
              textAnchor="end" fontFamily={FF.MONO}>{t}</text>
          </g>
        ))}
        {/* y-axis + x-axis baseline */}
        <line x1={padL} y1={padT} x2={padL} y2={baselineY} stroke={C.BORDER} strokeWidth={CS.GRID.w} />
        <line x1={padL} y1={baselineY} x2={padL + plotW} y2={baselineY} stroke={C.BORDER} strokeWidth={CS.GRID.w} />
        {/* count-axis title — vertical, reading bottom-to-top. Matches the
            axis-text colour (C.TEXT_3) used by the tick and p-axis labels. */}
        <text x={8} y={padT + plotH / 2} transform={`rotate(-90 8 ${padT + plotH / 2})`}
          textAnchor="middle" fontSize={CF.SMALL} fill={C.TEXT_3}>Count</text>
        {histBins.map((count, i) => {
          const x = padL + i * barW;
          const h = (count / maxC) * plotH;
          // Data model (channel 4): observed bars are blue when clear. The
          // 0.9–1.0 driving decile renders red when the verdict flags (red
          // region); every other bin sits at observed-blue.
          const fill = (i === 9 && isFlagged) ? SIGNAL.RED.dot : CC.OBS;
          return <rect key={i} x={x} y={padT + plotH - h} width={barW - 1} height={h}
            fill={fill} fillOpacity={OBS.areaFill.fillOpacity} stroke={fill} strokeWidth="1" />;
        })}
        {/* Expected uniform line */}
        {(() => {
          const ey = padT + plotH - (expectedPerBin / maxC) * plotH;
          return <line x1={padL} y1={ey} x2={padL + plotW} y2={ey}
            stroke={CC.EXP} strokeWidth={CS.REF.w} strokeDasharray={CS.REF.dash} opacity={CS.REF.opacity} />;
        })()}
        {/* p-value axis tick marks + labels */}
        {xTicks.map(p => (
          <g key={`x${p}`}>
            <line x1={xForP(p)} y1={baselineY} x2={xForP(p)} y2={baselineY + 3}
              stroke={C.BORDER} strokeWidth={CS.GRID.w} />
            <text x={xForP(p)} y={baselineY + 13} fontSize={CF.SMALL} fill={C.TEXT_3}
              textAnchor="middle" fontFamily={FF.MONO}>{p.toFixed(2)}</text>
          </g>
        ))}
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
      lookFor="This is a screening signal across the whole table, not a single feature. Confirm the conditions are meant to be randomised groups — a comparison where balance is not expected is the most common innocent cause. If they are, inspect the raw data files and the reported per-variable results, and weigh the finding alongside the other tests rather than on its own. Cross-reference Profile rank agreement and Cross-condition similarity: these three read condition similarity from different angles, and groups that look engineered across all three are far harder to explain as careful randomisation than any one alone."
      implications="Groups that are too evenly matched across many features can arise from careful stratified randomisation or a large, well-balanced study. They can also indicate baselines adjusted to look matched — the signature of groups tuned after the fact, where real random allocation would leave more feature-to-feature variation.">

      {histPlot && <>
        <PlotLayout fitContent>
          {histPlot}
        </PlotLayout>
        <ChartLegend items={[
          { color: CC.OBS, label: "Features per p-value bin", opacity: OBS.areaFill.fillOpacity },
          ...(isFlagged ? [{ color: SIGNAL.RED.dot, label: "Excess balanced features", opacity: OBS.areaFill.fillOpacity }] : []),
          { color: CC.EXP, label: "Expected under uniform", swatchType: "line", dashed: true },
        ]} />
        <div style={{fontSize:FS.sm,fontFamily:FF.UI,color:C.TEXT_2,marginTop:"4px"}}>
          Bar height = count of features per p-value bin. Dashed line = expected under uniform.
          {isFlagged && ` The verdict counts features with a between-condition p-value above 0.95 and flags when at least half exceed it (test significance ${fmtPBadge(result.primaryP)}). The red bin marks the 0.90–1.0 decile.`}
        </div>
      </>}

      {details.length > 0 && (
        <div style={{ marginTop: histPlot ? BLOCK_GAP : 0 }}>
          {/* S210 (multi-surface): secondary-surface heading demoted (Regular
              weight) when the plot is present; dropped when the table is the
              sole surface (footer-lead heads it). */}
          {histPlot && <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Balance across conditions, per feature</div>}
          {/* Column order follows the EvidenceTable convention: identifier →
              evidence → p. The condition means and their spread (CV) are the
              evidence for "too balanced", so they sit together before the p. */}
          <DataTable data={details} maxRows={20} compact identifierColumns={1} totalCount={nFeatures}
            moreLabel={(n, t) => `Top ${n} of ${t} by balance`} columns={[
            // rowIdx present → column-grouped record: map to the file row.
            // colIdx present → row-grouped "Col N" record: pass the string
            // through (its file mapping is scoped separately).
            { header: "Feature", bold: true, render: d => d.rowIdx != null ? `Row ${mapper.toFileRow(d.rowIdx + 1)}` : d.Feature },
            { header: "Condition means", render: d => d.Means },
            { header: "Spread (CV)", render: d => d.CV ?? "—" },
            { header: "p", render: d => d["ANOVA p"] },
          ]} />
        </div>
      )}

    </MiniCardLayout>
  );
}
