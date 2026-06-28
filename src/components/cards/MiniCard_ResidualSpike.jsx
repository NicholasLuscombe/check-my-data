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
    ? "The heat-map marks each condition's noisiest rows, and the matrix below shows how much those sets overlap between conditions. The signal is the high overlap between conditions that should be independent. Check which rows and conditions are highlighted, and inspect the raw data files for those rows to confirm they were measured independently in each condition."
    : "The heat-map marks each condition's noisiest rows; the matrix below shows how much those sets overlap. The signal is the unusually high noise in a few shared rows. The number of overlapping rows is small and the overall correlation between conditions is low. Find the noisiest rows across multiple conditions and inspect the raw data files to confirm that they were measured independently in each condition.";

  return (
    <MiniCardLayout result={result}
      footer={result.flag !== "LOW" && result.flag !== "N/A"
        ? `The ${overlapN} noisiest rows are shared by ${result.bestPair} — the pair with the most overlap`
        : "No shared noisy rows"}
      lookFor={lookFor}
      implications="In typical data, the noisy rows differ from one condition to the next. The same rows being noisy everywhere suggests shared structure. This can arise when an outlier sample or outlier rows affect every measurement. It can also indicate that specific rows were edited across several conditions at once, leaving the same fingerprint of noise across conditions.">

      {/* S210: section heading dropped — the footer fragment (LEAD_HEAD in
          MiniCardLayout) heads this primary surface. */}
      <CoordResidualProfile
        allProfiles={result.allProfiles}
        nRows={result.nRows || 0}
        pairDetails={result.pairDetails}
        condColorMap={condColorMap}
        importConfig={importConfig}
        showRhoMatrix={isGlobalMode}
        cleared={!isFlagged}
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
