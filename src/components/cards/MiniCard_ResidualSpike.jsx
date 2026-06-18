import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { CoordResidualProfile } from "../plots/CoordResidualProfile.jsx";
import { buildCondColorMap } from "../../constants/roles.js";
import { DataTable } from "../shared/DataTable.jsx";
import { makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";
import { FW } from "../../constants/tokens.js";

// Display threshold: bestPair ρ above this → global correlation mode (ρ matrix prominent).
// Below → coordinated extremes mode (ρ matrix de-emphasized).
const RHO_DISPLAY_THRESHOLD = 0.3;

export function MiniCard_ResidualSpike({ result, importConfig, rowMap }) {
  const condColorMap = buildCondColorMap(importConfig);
  const overlapN = result.nOverlap || 0;
  const isFlagged = result.flag !== "LOW" && result.flag !== "N/A";
  const overlapRows = result.details || [];
  const { toFileRow } = makeRowMapper(importConfig, rowMap);

  // Find ρ of the best overlap pair
  const bestPairRho = getBestPairRho(result);
  const isGlobalMode = bestPairRho > RHO_DISPLAY_THRESHOLD;

  const lookFor = isGlobalMode
    ? "Blue shading shows where each condition has high residual noise. When multiple strips light up at the same row, that noise is coordinated. The heatmap below shows pairwise ρ — high values (≥ 0.4) between conditions that should be biologically independent suggest shared construction."
    : "Blue shading shows where each condition has high residual noise. When multiple strips light up at the same row, that noise is coordinated. Focus on the strip alignment, not the ρ matrix — overall correlation is low because the signal is concentrated in a subset of rows.";

  return (
    <MiniCardLayout result={result}
      footer={result.flag !== "LOW" && result.flag !== "N/A"
        ? `The ${overlapN} noisiest rows are shared by ${result.bestPair} — the pair with the most overlap`
        : "No shared noisy rows"}
      lookFor={lookFor}
      implications="Rows that are noisy in one condition and noisy in others can reflect genuine biological covariates — for example, an outlier sample that affects all measurements. They can also indicate that specific rows were edited across multiple conditions, leaving correlated residual patterns even if the edits differ in magnitude.">

      {/* S210: section heading dropped — the footer fragment (LEAD_HEAD in
          MiniCardLayout) heads this primary surface. */}
      <CoordResidualProfile
        allProfiles={result.allProfiles}
        nRows={result.nRows || 0}
        pairDetails={result.pairDetails}
        condColorMap={condColorMap}
        importConfig={importConfig}
        showRhoMatrix={isGlobalMode}
      />

      {/* Overlap rows — rows shared in the top-K of the best-pair conditions
          (engine emits row, coordScore, per-condition residual (z) in details).
          Gated on the flagged state; residual values list in the strip's
          condition order. */}
      {isFlagged && overlapRows.length > 0 && (
        <div style={{ marginTop: BLOCK_GAP }}>
          <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Overlap rows</div>
          <DataTable
            data={overlapRows}
            maxRows={20}
            totalCount={result.nOverlap}
            compact
            identifierColumns={1}
            columns={[
              { header: "Row", bold: true, render: d => toFileRow(d.row) },
              { header: "Shared spike strength", render: d => d.coordScore },
              { header: "Per-condition residual (z)", align: "left", render: d => d.residuals },
            ]}
          />
        </div>
      )}

    </MiniCardLayout>
  );
}

/** Extract ρ of the best overlap pair from pairDetails. */
function getBestPairRho(result) {
  if (!result.pairDetails?.length || !result.bestPair) return 0;
  const match = result.pairDetails.find(p => p.pair === result.bestPair);
  return match ? Math.abs(parseFloat(match.r) || 0) : 0;
}
