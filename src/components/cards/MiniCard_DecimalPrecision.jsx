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

  const implications = "A shortfall at an intermediate precision level can arise from a change in recording precision partway through a study, or from an instrument that re-ranges automatically. It can also indicate values from more than one source merged into one column: e.g., hand-entered numbers rarely follow the trailing-zero pattern a single instrument produces.";

  return (
    <MiniCardLayout result={result}
      implications={implications}
      footer={result.flag !== "LOW" && result.flag !== "N/A"
        ? `Mixed precision — ${details.length} levels, suggesting more than one source`
        : "Consistent precision throughout"}
      lookFor={hasGap ? "A precision gap — values at one and three decimal places but none at two — cannot come from a single instrument. Inspect the raw data files to check whether the values were transcribed from more than one source or entered by hand." : "The precision levels fall short of the single-instrument pattern without a clean gap. Inspect the raw data files to check whether the precision matches the stated instrument — one instrument should produce a single dominant precision, stripped into one or two adjacent levels."}>

      {/* S210 (single-surface): section heading dropped — the footer
          fragment (LEAD_HEAD in MiniCardLayout) heads this sole plot. */}
      <PlotLayout>
        <VBarPlot
          items={filledItems} xKey="decimalPlaces" obsKey="count"
          barColorKey="barColor"
          xlabel="Decimal places"
          ylabel="Count" flag={result.flag}/>
      </PlotLayout>

    </MiniCardLayout>
  );
}
