import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { CoordResidualProfile } from "../plots/CoordResidualProfile.jsx";
import { C, TF, FW, FF } from "../../constants/tokens.js";

import { fmtP } from "../../constants/thresholds.js";
import { buildCondColorMap } from "../../constants/roles.js";
import { SUB_HEAD } from "../shared/styles.js";

// Display threshold: bestPair ρ above this → global correlation mode (ρ matrix prominent).
// Below → coordinated extremes mode (ρ matrix de-emphasized).
const RHO_DISPLAY_THRESHOLD = 0.3;

export function MiniCard_ResidualSpike({ result, importConfig, rowMap }) {
  const condColorMap = buildCondColorMap(importConfig?.condPerCol);
  const overlapN = result.nOverlap || 0;
  const expN = parseFloat(result.expectedOverlap) || 0;
  const ratio = expN > 0 ? (overlapN / expN) : 0;
  const permPNum = typeof result.permP === "string" ? parseFloat(result.permP) : (result.permP ?? 1);

  // Find ρ of the best overlap pair
  const bestPairRho = getBestPairRho(result);
  const isGlobalMode = bestPairRho > RHO_DISPLAY_THRESHOLD;

  let headline;
  if (result.flag === "LOW") {
    headline = overlapN === 0
      ? "No rows share elevated residuals across groups."
      : `${overlapN} rows share elevated residuals across groups — within chance expectation.`;
  } else if (isGlobalMode) {
    // Global correlation — ρ is the signal
    const [condA, condB] = (result.bestPair || "").split(" vs ");
    headline = condA && condB
      ? `Residual noise in ${condA} and ${condB} follows the same pattern (ρ = ${bestPairRho.toFixed(2)}).`
      : `Residual noise is correlated across conditions (ρ = ${bestPairRho.toFixed(2)}).`;
  } else {
    // Coordinated extremes — overlap count is the signal
    headline = ratio >= 3
      ? `${overlapN} rows share elevated residuals across groups — ${ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1)}× more overlap than expected by chance.`
      : `${overlapN} rows share elevated residuals across groups — more than the ${expN.toFixed(0)} expected by chance.`;
  }

  const desc = isGlobalMode
    ? "When specific rows are edited in multiple experimental groups, the noise at those rows becomes correlated across groups — even if the edits differ in size. The heatmap shows pairwise residual correlation between conditions. High ρ between biologically independent conditions is hard to explain without shared construction."
    : "When specific rows are edited in multiple experimental groups, the noise at those rows becomes correlated across groups — even if the edits differ in size. The chart shows the noise magnitude for each row in each condition. The permutation test checks whether the noisiest rows overlap across conditions more than chance predicts.";

  const lookFor = isGlobalMode
    ? "Blue shading shows where each condition has high residual noise. When multiple strips light up at the same row, that noise is coordinated. The heatmap below shows pairwise ρ — high values (≥ 0.4) between conditions that should be biologically independent suggest shared construction."
    : "Blue shading shows where each condition has high residual noise. When multiple strips light up at the same row, that noise is coordinated. Focus on the strip alignment, not the ρ matrix — overall correlation is low because the signal is concentrated in a subset of rows.";

  return (
    <MiniCardLayout result={result} headline={headline}
      desc={desc}
      footer={`${result.nGroups} conditions · ${overlapN} rows with coordinated noise (${expN.toFixed(1)} expected) · permutation p = ${fmtP(permPNum)}`}
      lookFor={lookFor}
      implications="Rows that are noisy in one condition and noisy in others can reflect genuine biological covariates — for example, an outlier sample that affects all measurements. They can also indicate that specific rows were edited across multiple conditions, leaving correlated residual patterns even if the edits differ in magnitude.">

      <div style={SUB_HEAD}>Residual noise by condition</div>
      <CoordResidualProfile
        allProfiles={result.allProfiles}
        nRows={result.nRows || 0}
        pairDetails={result.pairDetails}
        condColorMap={condColorMap}
        importConfig={importConfig}
        showRhoMatrix={isGlobalMode}
      />

    </MiniCardLayout>
  );
}

/** Extract ρ of the best overlap pair from pairDetails. */
function getBestPairRho(result) {
  if (!result.pairDetails?.length || !result.bestPair) return 0;
  const match = result.pairDetails.find(p => p.pair === result.bestPair);
  return match ? Math.abs(parseFloat(match.r) || 0) : 0;
}
