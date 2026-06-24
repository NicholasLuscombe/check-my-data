import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { NoiseProfilePlot } from "../plots/NoiseProfilePlot.jsx";
import { CC, FF, FW, OBS, CS } from "../../constants/tokens.js";
import { makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";


export function MiniCard_LOESS({ result, importConfig, rowMap }) {
  // Coordinate mapping
  const { fileRow, toFileRow } = makeRowMapper(importConfig, rowMap);

  const cpRow = result.changepointRow;
  const hasCP = cpRow != null && cpRow !== "—" && String(result.cusumP) !== "—";
  // S243 21b: the changepoint marker reads as a signal, so it gates on the
  // verdict's significance — not on existence of the argmax-CUSUM row. Draw the
  // marker (and its legend swatch) only when a changepoint exists AND the verdict
  // fired, matching the footer / region-table flag gate below.
  const showChangepoint = hasCP && result.flag !== "LOW" && result.flag !== "N/A";
  const regions = result.regionComparison || [];

  return (
    <MiniCardLayout result={result}
      footer={result.flag !== "LOW" && result.flag !== "N/A"
        ? (hasCP ? "Noise level changes partway through" : "Noise level varies along the data")
        : "Noise level steady throughout"}
      lookFor="Note the flagged stretch of rows and the changepoint. Check whether the boundary lines up with a batch, plate, or run break. Inspect those rows in the raw data files and compare their noise against the rest of the column — a region that is too smooth, or whose values follow a curve, is the concern."
      implications="A stretch where the noise level shifts can arise from a real change partway through — a reagent change, a recalibration, a different operator for part of the run. It can also indicate a region that was smoothed, extrapolated, or built from a curve, where the noise stops behaving like the rest of the data.">


      {result.noiseProfile?.length > 0 && <>
        {/* S210 (multi-surface): primary-surface heading dropped — the footer
            fragment (LEAD_HEAD in MiniCardLayout) heads this primary plot. */}
        <PlotLayout fitContent>
          <NoiseProfilePlot noiseProfile={result.noiseProfile}
            changepointRow={showChangepoint ? cpRow : null}
            secondaryRow={result.secondaryRow || null}
            toFileRow={toFileRow}/>
        </PlotLayout>
        <ChartLegend items={[
          { color: CC.OBS, label: "Row noise", opacity: OBS.line.strokeOpacity, swatchType: "line", strokeWidth: CS.DATA.w },
          { color: CC.OBS, label: "LOESS trend", opacity: OBS.line.strokeOpacity, swatchType: "line", strokeWidth: CS.FIT.w, showDot: false },
          ...(showChangepoint ? [{ color: CC.THRESH, label: "Changepoint", swatchType: "line" }] : []),
        ]} />
      </>}
      {regions.length > 0 && result.flag !== "LOW" && result.flag !== "N/A" && (
        <div style={{marginTop: BLOCK_GAP}}>
          {/* S210 (multi-surface): secondary-surface heading demoted (Regular weight). */}
          <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Region comparison</div>
          <EvidenceTable
            columns={["Region", "Rows", "Observed SD", "Expected SD", "Ratio", "Finding"]}
            identifierColumns={2}
            rows={regions.map(r => {
              // Map rows to file coordinates
              const rowParts = String(r.rows).match(/(\d+)\D+(\d+)/);
              const rowsDisplay = rowParts
                ? `${toFileRow(parseInt(rowParts[1]))}–${toFileRow(parseInt(rowParts[2]))}`
                : r.rows;
              return [
                { value: r.region, style: { fontFamily: FF.UI } },
                rowsDisplay,
                r.observedNoise,
                r.expectedNoise,
                r.ratio,
                { value: r.finding, style: { fontFamily: FF.UI } },
              ];
            })}
          />
        </div>
      )}

    </MiniCardLayout>
  );
}
