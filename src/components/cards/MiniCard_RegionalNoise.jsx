import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { ConditionTable } from "../shared/ConditionTable.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { buildCondColorMap } from "../../constants/roles.js";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { RegionalNoiseStrip } from "../plots/RegionalNoiseStrip.jsx";
import { C, CC, FW, FF } from "../../constants/tokens.js";
import { fmtP, fmtPBadge } from "../../constants/thresholds.js";
import { makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD } from "../shared/styles.js";


export function MiniCard_RegionalNoise({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const sub = result.subDetails || [];
  const isAgg = result.groupsAssessed !== undefined;
  const condColorMap = buildCondColorMap(importConfig?.condPerCol);

  // Coordinate mapping
  const { fileRow, toFileRow } = makeRowMapper(importConfig, rowMap);

  // Column name mapping: anomCol is 1-indexed matrix column = data column index + 1
  const dataHeaders = importConfig?.hdrs || [];
  const roles = importConfig?.roles || [];
  const dColMap = roles.map((rl, ci) => rl === "data" ? ci : -1).filter(ci => ci >= 0);
  const cn = (anomCol1) => {
    const di = anomCol1 - 1;
    return dataHeaders[dColMap[di]] || `Column ${anomCol1}`;
  };

  // Build colNames map for strip chart (1-indexed anomCol → display name)
  const colNames = {};
  for (const d of details) {
    const c = parseInt(d.anomCol);
    if (c > 0 && !colNames[c]) colNames[c] = cn(c);
  }

  const bestRows = result.bestWindowRows || "—";
  const bestCol = result.bestAnomCol || "—";
  const bestVarRatio = result.bestVarRatio || "—";
  // Single-sourced SD ratio (Fix S192): the producer computes sqrt(variance
  // ratio) once (result.bestSDRatio / detail.sdRatio) so the footer and the
  // evidence table never diverge by double-rounding. Fall back to the legacy
  // sqrt(bestVarRatio) only if the producer field is absent.
  const bestSDRatio = Number.isFinite(result.bestSDRatio)
    ? result.bestSDRatio.toFixed(2) + "×"
    : (() => {
        const v = parseFloat(bestVarRatio);
        return isNaN(v) ? "—" : Math.sqrt(v).toFixed(2) + "×";
      })();

  const bestRowsParts = String(bestRows).match(/(\d+)\D+(\d+)/);
  const bestRowsDisplay = bestRowsParts
    ? `${toFileRow(parseInt(bestRowsParts[1]))}–${toFileRow(parseInt(bestRowsParts[2]))}`
    : bestRows;
  const bestColName = typeof bestCol === "number" || /^\d+$/.test(bestCol) ? cn(parseInt(bestCol)) : bestCol;

  return (
    <MiniCardLayout result={result}
      footer={`${result.nWindows||"?"} windows scanned · worst: ${bestColName} rows ${bestRowsDisplay} (${(details[0]?.direction) || "anomalous"}, SD ratio ${bestSDRatio}) · scan ${fmtPBadge(result.primaryP)}`}
      lookFor={`${bestColName} in rows ${bestRowsDisplay} has unusually ${parseFloat(bestVarRatio) > 1 ? "high" : "low"} noise compared to its own average. Examine that column in that region — are the values smoother, rounder, or more variable than the rest of the column? If multiple windows flag the same column, that column may have been selectively edited in those rows.`}
      implications="A region that is noisier or quieter than the column average can result from plate edge effects, batch boundaries, or changes in sample quality across the run. It can also indicate that a stretch of values in one column was smoothed or replaced while the rest was left intact.">

      {result.flag !== "LOW" && result.flag !== "N/A" && (() => {
        const windowData = isAgg ? sub : details;
        if (!windowData.length) return null;
        return <>
          <div style={SUB_HEAD}>Noise by region</div>
          <PlotLayout>
            <RegionalNoiseStrip details={windowData} nRows={result.nRows}
              colNames={colNames} toFileRow={toFileRow} />
          </PlotLayout>
          <ChartLegend gradient={{
            from: "rgba(239,68,68,0.15)", to: "rgba(239,68,68,0.7)",
            startLabel: "Low divergence", endLabel: "High divergence", width: 100,
          }} />
          <div style={{marginTop:"8px"}}>
            <div style={SUB_HEAD}>Anomalous windows</div>
            <EvidenceTable
              columns={["Rows", "Column", "Observed SD", "Expected SD", "SD ratio", "Finding"]}
              identifierColumns={2}
              rows={windowData.map(d => {
                const rowParts = String(d.rows).match(/(\d+)\D+(\d+)/);
                const rowsDisplay = rowParts
                  ? `${toFileRow(parseInt(rowParts[1]))}–${toFileRow(parseInt(rowParts[2]))}`
                  : d.rows;
                const colNum = parseInt(d.anomCol);
                const colDisplay = colNum > 0 ? cn(colNum) : d.anomCol;
                const dir = d.direction === "reduced" ? "Quieter" : d.direction === "elevated" ? "Noisier" : "Anomalous";
                // Single-sourced SD ratio (Fix S192): read the producer's raw
                // sdRatio = sqrt(variance ratio) and format identically to the
                // footer. Fall back to the legacy SD-division only if absent.
                const sdRatio = Number.isFinite(d.sdRatio)
                  ? d.sdRatio.toFixed(2) + "×"
                  : (() => {
                      const wSD = parseFloat(d.windowSD), gSD = parseFloat(d.globalSD);
                      return (wSD > 0 && gSD > 0)
                        ? (dir === "Quieter" ? (gSD / wSD).toFixed(2) + "×" : (wSD / gSD).toFixed(2) + "×")
                        : d.ratio;
                    })();
                return [
                  rowsDisplay,
                  { value: colDisplay, style: { fontFamily: FF.UI } },
                  d.windowSD || "—",
                  d.globalSD || "—",
                  sdRatio,
                  { value: dir, style: { fontFamily: FF.UI } },
                ];
              })}
            />
          </div>
        </>;
      })()}
      <ConditionTable data={result.condRegionalNoise} condColorMap={condColorMap} title="Regional noise by condition" columns={[
        {header:"Condition",align:"left",render:c=>c.condition},
        {header:"Best window",align:"left",render:c=>{
          const parts = String(c.bestRows).match(/(\d+)\D+(\d+)/);
          const rows = parts ? `${toFileRow(parseInt(parts[1]))}–${toFileRow(parseInt(parts[2]))}` : c.bestRows;
          const col = parseInt(c.bestCol) > 0 ? cn(parseInt(c.bestCol)) : c.bestCol;
          return `rows ${rows}, ${col}`;
        }},
        {header:"Ratio",bold:true,render:c=>c.bestRatio},
        {header:"p",render:c=>fmtP(c.rawP)},
      ]} />

    </MiniCardLayout>
  );
}
