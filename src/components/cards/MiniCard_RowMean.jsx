import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { RowMeanTrendPlot } from "../plots/RowMeanTrendPlot.jsx";
import { C, CC, FW, FF, SIGN } from "../../constants/tokens.js";
import { makeRowMapper } from "../shared/coordinates.js";
import { buildCondColorMap } from "../../constants/roles.js";
import { SUB_HEAD } from "../shared/styles.js";


// Match colours defined in RowMeanTrendPlot (S246: navy crossing / observed-blue run)
const CROSSING_COLOR = SIGN.POS;
const RUN_COLOR = CC.OBS;

export function MiniCard_RowMean({ result, importConfig, rowMap }) {
  const isAgg = result.groupsAssessed !== undefined;

// Condition label for the best sequence
const bestLabel = result.bestSequence?.replace(/^Cond:\s*/, "") || null;

// Coordinate mapping for original file row numbers.
// `fileRow` for 0-indexed data-row indices (RowMeanTrendPlot's `rowIdxs`).
const { fileRow } = makeRowMapper(importConfig, rowMap);

// Row means trend plot (preferred) or null if data not available
const hasRowMeans = result.bestRowMeans?.length > 0 && result.bestGrandMean != null;
const mainPlot = hasRowMeans ? (
  <RowMeanTrendPlot
    rowMeans={result.bestRowMeans}
    simMeans={result.bestSimMeans}
    rowIdxs={result.bestRowIdxs}
    grandMean={result.bestGrandMean}
    fileRow={fileRow}
  />
) : null;

const legend = [
  { color: CROSSING_COLOR, label: "Observed", swatchType: "line" },
  { color: CC.EXP, label: "Simulated (permuted)", swatchType: "line" },
  { color: CC.EXP, label: "Grand mean", swatchType: "line", dashed: true, opacity: 0.70 },
];

// Condition colour for sub-heading
const condColorMap = buildCondColorMap(importConfig?.condPerCol);
const condColor = bestLabel ? condColorMap[bestLabel]?.text : null;

return (

  <MiniCardLayout result={result}
    footer={result.flag !== "LOW" && result.flag !== "N/A"
      ? "Row averages run in streaks rather than alternating"
      : "Row averages alternate as expected"}
    lookFor="Long stretches where row means stay on the same side of the grand mean suggest sequential construction. Bold segments in the chart mark crossings — few crossings means the fabricator anchored each row's mean to the previous one. Compare the faint regions against the raw data: are the values suspiciously smooth or trending?"
    implications="Row averages that trend in blocks rather than fluctuating randomly can result from time-dependent biological processes or batch effects within a condition. Too many alternations — averages switching direction more than expected — can indicate values arranged to appear random rather than recorded in natural order.">

    {bestLabel && isAgg && <div style={{...SUB_HEAD, ...(condColor ? {color: condColor} : {})}}>{bestLabel}</div>}
    {mainPlot && <PlotLayout>{mainPlot}</PlotLayout>}
    {mainPlot && <ChartLegend items={legend} />}


  </MiniCardLayout>

);

}
