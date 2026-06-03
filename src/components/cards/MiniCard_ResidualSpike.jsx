import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { CoordResidualProfile } from "../plots/CoordResidualProfile.jsx";
import { buildCondColorMap } from "../../constants/roles.js";

// Display threshold: bestPair ρ above this → global correlation mode (ρ matrix prominent).
// Below → coordinated extremes mode (ρ matrix de-emphasized).
const RHO_DISPLAY_THRESHOLD = 0.3;

export function MiniCard_ResidualSpike({ result, importConfig, rowMap }) {
  const condColorMap = buildCondColorMap(importConfig?.condPerCol);
  const overlapN = result.nOverlap || 0;

  // Find ρ of the best overlap pair
  const bestPairRho = getBestPairRho(result);
  const isGlobalMode = bestPairRho > RHO_DISPLAY_THRESHOLD;

  const lookFor = isGlobalMode
    ? "Blue shading shows where each condition has high residual noise. When multiple strips light up at the same row, that noise is coordinated. The heatmap below shows pairwise ρ — high values (≥ 0.4) between conditions that should be biologically independent suggest shared construction."
    : "Blue shading shows where each condition has high residual noise. When multiple strips light up at the same row, that noise is coordinated. Focus on the strip alignment, not the ρ matrix — overall correlation is low because the signal is concentrated in a subset of rows.";

  return (
    <MiniCardLayout result={result}
      footer={result.flag !== "LOW" && result.flag !== "N/A"
        ? `the ${overlapN} noisiest rows are the same in every condition`
        : "no shared noisy rows"}
      lookFor={lookFor}
      implications="Rows that are noisy in one condition and noisy in others can reflect genuine biological covariates — for example, an outlier sample that affects all measurements. They can also indicate that specific rows were edited across multiple conditions, leaving correlated residual patterns even if the edits differ in magnitude.">

      {/* S210 (single-surface): section heading dropped — the footer
          fragment (LEAD_HEAD in MiniCardLayout) heads this sole surface. */}
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
