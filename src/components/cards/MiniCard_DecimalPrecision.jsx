import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { VBarPlot } from "../plots/VBarPlot.jsx";
import { CHART, FW, FF, C, CC } from "../../constants/tokens.js";


export function MiniCard_DecimalPrecision({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const name = result.name;
  const isAgg = result.groupsAssessed !== undefined;
  if (!details.length) return null;
  const maxDp = result.maxDecimalPlaces || Math.max(...details.map(d => parseInt(d.decimalPlaces) || 0));
  const allDps = Array.from({length: maxDp + 1}, (_, i) => i).filter(i => i > 0 || details.some(d => parseInt(d.decimalPlaces) === 0));
  const filledItems = allDps.map(dp => {
    const found = details.find(d => parseInt(d.decimalPlaces) === dp);
    return found ? {...found, count: parseInt(found.count) || 0, isGap: false, barColor: CC.OBS}
                 : {decimalPlaces: dp, count: 0, fraction: "0.0%", isGap: true, barColor: CHART.GAP};
  });
  const hasGap = filledItems.some(d => d.isGap);

  const gapCount = (result.details || []).filter(d => d.deficit === true || parseFloat(d.ratio) < 0.5).length;
  const implications = `${gapCount || "Some"} precision level${gapCount !== 1 ? "s" : ""} show${gapCount === 1 ? "s" : ""} fewer values than the trailing-zero model predicts. A dataset recorded by a single instrument at consistent settings typically shows one dominant precision level with a smooth tail from trailing-zero stripping. Gaps or deficits in this pattern can indicate values from different sources, manual editing, or changes in recording precision mid-experiment.`;

  return (
    <MiniCardLayout result={result}
      implications={implications}
      footer={result.flag !== "LOW" && result.flag !== "N/A"
        ? `mixed precision — ${details.length} levels, suggesting more than one source`
        : "consistent precision throughout"}
      lookFor={hasGap ? "A precision gap (e.g. values at 1dp and 3dp but none at 2dp) is impossible from a single instrument. It suggests values were transcribed from different sources or manually constructed with inconsistent rounding." : "Check whether the spread of precision levels is consistent with the stated instrument. A single instrument should produce values at one fixed precision (which then gets trailing-zero-stripped by Excel into 1–2 adjacent levels)."}>

      {/* S210 (single-surface): section heading dropped — the footer
          fragment (LEAD_HEAD in MiniCardLayout) heads this sole plot. */}
      <PlotLayout>
        <VBarPlot
          items={filledItems} xKey="decimalPlaces" obsKey="count"
          barColorKey="barColor"
          xlabel="Decimal places"
          ylabel="Count"/>
      </PlotLayout>

    </MiniCardLayout>
  );
}
