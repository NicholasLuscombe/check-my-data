import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { VBarPlot } from "../plots/VBarPlot.jsx";
import { CHART, FW, FF, C, CC } from "../../constants/tokens.js";
import { regIncBeta } from "../../stats/primitives.js";

// 99.9% level for the deficit band and the per-level deficit count (HIGH gate).
const DECPREC_BAND_ALPHA = 0.001;

// Largest integer count k in [0, total] for which P(X ≤ k | total, p) ≤ alpha,
// using the same one-tailed binomial CDF the engine evaluates at decimalPrecision.js:67
// (P(X ≤ k) = regIncBeta(total−k, k+1, 1−p), monotone increasing in k). This is the
// 99.9% deficit floor: a bar at or below it is a significant deficit. Clamped to ≥ 0
// (when even a count of 0 is not significant, the band simply reaches the axis).
function lowerDeficitBound(total, expectedP, alpha = DECPREC_BAND_ALPHA) {
  if (!(total > 0)) return 0;
  let lo = 0, hi = total, best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cdf = mid >= total ? 1.0 : regIncBeta(total - mid, mid + 1, 1 - expectedP);
    if (cdf <= alpha) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  return Math.max(0, best);
}

export function MiniCard_DecimalPrecision({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const name = result.name;
  const isAgg = result.groupsAssessed !== undefined;
  if (!details.length) return null;
  const total = result.nDecimalValues || 0;
  // Per-level binomial statistics live on result.perLevel ({ dp, expected, expectedP,
  // adjP, ... }) for intermediate levels 1…maxDp−1 only — dp = 0 and the dominant top
  // bar carry no entry by construction (the trailing-zero model predicts intermediate
  // levels only). Join by dp so the expected line + deficit band reach the plot.
  const perLevelByDp = new Map((result.perLevel || []).map(l => [l.dp, l]));
  const maxDp = result.maxDecimalPlaces || Math.max(...details.map(d => parseInt(d.decimalPlaces) || 0));
  const allDps = Array.from({length: maxDp + 1}, (_, i) => i).filter(i => i > 0 || details.some(d => parseInt(d.decimalPlaces) === 0));
  const filledItems = allDps.map(dp => {
    const found = details.find(d => parseInt(d.decimalPlaces) === dp);
    const item = found ? {...found, count: parseInt(found.count) || 0, isGap: false, barColor: CC.OBS}
                       : {decimalPlaces: dp, count: 0, fraction: "0.0%", isGap: true, barColor: CHART.GAP};
    const lvl = perLevelByDp.get(dp);
    if (lvl) {
      item.expected = lvl.expected;
      item.loBound = lowerDeficitBound(total, lvl.expectedP);
    }
    return item;
  });
  const hasGap = filledItems.some(d => d.isGap);

  const gapCount = (result.perLevel || []).filter(l => l.adjP < DECPREC_BAND_ALPHA).length;
  const implications = `${gapCount || "Some"} precision level${gapCount !== 1 ? "s" : ""} show${gapCount === 1 ? "s" : ""} fewer values than the trailing-zero model predicts. A dataset recorded by a single instrument at consistent settings typically shows one dominant precision level with a smooth tail from trailing-zero stripping. Gaps or deficits in this pattern can indicate values from different sources, manual editing, or changes in recording precision mid-experiment.`;

  return (
    <MiniCardLayout result={result}
      implications={implications}
      footer={result.flag !== "LOW" && result.flag !== "N/A"
        ? `Mixed precision — ${details.length} levels, suggesting more than one source`
        : "Consistent precision throughout"}
      lookFor={hasGap ? "A precision gap (e.g. values at 1dp and 3dp but none at 2dp) is impossible from a single instrument. It suggests values were transcribed from different sources or manually constructed with inconsistent rounding." : "Check whether the spread of precision levels is consistent with the stated instrument. A single instrument should produce values at one fixed precision (which then gets trailing-zero-stripped by Excel into 1–2 adjacent levels)."}>

      {/* S210 (single-surface): section heading dropped — the footer
          fragment (LEAD_HEAD in MiniCardLayout) heads this sole plot. */}
      <PlotLayout>
        <VBarPlot
          items={filledItems} xKey="decimalPlaces" obsKey="count"
          barColorKey="barColor"
          expKey="expected" loKey="loBound"
          xlabel="Decimal places"
          ylabel="Count"/>
      </PlotLayout>

    </MiniCardLayout>
  );
}
