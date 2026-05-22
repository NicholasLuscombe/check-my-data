import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { RowMeanTrendPlot } from "../plots/RowMeanTrendPlot.jsx";
import { C, CC, FW, FF } from "../../constants/tokens.js";
import { fmtPBadge } from "../../constants/thresholds.js";
import { makeRowMapper } from "../shared/coordinates.js";
import { buildCondColorMap } from "../../constants/roles.js";
import { SUB_HEAD } from "../shared/styles.js";


// Match colours defined in RowMeanTrendPlot
const CROSSING_COLOR = "#4A3D8F";
const RUN_COLOR = "#A0A0CC";

export function MiniCard_RowMean({ result, importConfig, rowMap }) {
  const isAgg = result.groupsAssessed !== undefined;

// Condition label for the best sequence
const bestLabel = result.bestSequence?.replace(/^Cond:\s*/, "") || null;

// Coordinate mapping for original file row numbers.
// `toFileRow` for 1-indexed matrix-row strings (bestWindowRows range);
// `fileRow` for 0-indexed data-row indices (RowMeanTrendPlot's `rowIdxs`).
const { fileRow, toFileRow } = makeRowMapper(importConfig, rowMap);
// Producer would emit `bestWindowRows` as a 1-indexed matrix-row range
// "X–Y"; convert both endpoints so the inline footer note matches the §2
// highlight's `#` column. (Dead path under current rowMeanRuns.js, which
// does not emit `bestWindowRows`; conversion is defence-in-depth.)
const bestWindowRowsParts = String(result.bestWindowRows || "").match(/(\d+)\D+(\d+)/);
const bestWindowRowsDisplay = bestWindowRowsParts
  ? `${toFileRow(parseInt(bestWindowRowsParts[1]))}–${toFileRow(parseInt(bestWindowRowsParts[2]))}`
  : result.bestWindowRows;

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
  { color: CC.EXP_SOFT, label: "Simulated (permuted)", swatchType: "line" },
  { color: C.TEXT_3, label: "Grand mean", swatchType: "line", dashed: true, opacity: 0.70 },
];

// Condition colour for sub-heading
const condColorMap = buildCondColorMap(importConfig?.condPerCol);
const condColor = bestLabel ? condColorMap[bestLabel]?.text : null;

return (

  <MiniCardLayout result={result}
    footer={<>
      {result.firstPairSigns?.length||"?"} rows · {(result.firstPairRuns||1) - 1} crossings (expected <span style={{color:CC.EXP_SOFT}}>{(result.firstPairExp||1) - 1}</span>)
      {result.bestWindowRows && ` · anomaly: rows ${bestWindowRowsDisplay}`}
      {" · " + fmtPBadge(result.primaryP)}
    </>}
    lookFor="Long stretches where row means stay on the same side of the grand mean suggest sequential construction. Bold segments in the chart mark crossings — few crossings means the fabricator anchored each row's mean to the previous one. Compare the faint regions against the raw data: are the values suspiciously smooth or trending?"
    implications="Row averages that trend in blocks rather than fluctuating randomly can result from time-dependent biological processes or batch effects within a condition. Too many alternations — averages switching direction more than expected — can indicate values arranged to appear random rather than recorded in natural order.">

    {bestLabel && isAgg && <div style={{...SUB_HEAD, ...(condColor ? {color: condColor} : {})}}>{bestLabel}</div>}
    {mainPlot && <PlotLayout>{mainPlot}</PlotLayout>}
    {mainPlot && <ChartLegend items={legend} />}


  </MiniCardLayout>

);

}
