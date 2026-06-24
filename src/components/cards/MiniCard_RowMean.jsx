import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { SignStripPlot } from "../plots/SignStripPlot.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { CC, FW, FF, SIGN, OBS } from "../../constants/tokens.js";
import { fmtP, ALPHA } from "../../constants/thresholds.js";
import { makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";


// Strip colours — observed-blue / salient-navy two-tone (S246), shared with
// SignStripPlot. The runs test is on the sign of the DETRENDED row mean, so a
// block is a run of rows holding above (+1) or below (−1) the fitted trend.
const SIGN_POS = SIGN.POS; // Oxford navy (+1) — above the fitted trend
const SIGN_NEG = CC.OBS;   // observed blue (−1) — below the fitted trend

export function MiniCard_RowMean({ result, importConfig, rowMap }) {
  // Coordinate mapping for original file row numbers (strip x-axis).
  const { fileRow } = makeRowMapper(importConfig, rowMap);
  const nMatrixRows = importConfig?.data?.length || 0;
  const firstFileRow = nMatrixRows > 0 ? fileRow(0) : 1;
  const lastFileRow = nMatrixRows > 0 ? fileRow(nMatrixRows - 1) : null;

  // Per-condition sign sequences (engine, S247). Every condition is shown — the
  // contrast between a streaky condition and a clean one IS the evidence.
  const condSeqs = result.condSignSeqs || [];
  const stripName = (label) => label.replace(/^Cond:\s*/, "");
  const stripSeqs = condSeqs.map(c => ({
    group: stripName(c.label),
    signs: c.signs,
    pos: c.pos,
    runs: c.runs,
    expected: c.expected,
  }));

  // Run-length evidence table. The per-condition p is the raw runs-test p — the
  // global verdict gates on the smallest of these — so the header is a bare `p`.
  // The Finding word fires when that p clears ALPHA.NOTE; the z sign names the
  // direction (fewer runs = streaks, more runs = over-alternation).
  const etRows = condSeqs.map(c => {
    const flagged = c.p < ALPHA.NOTE;
    const finding = !flagged
      ? "As expected"
      : parseFloat(c.z) < 0 ? "Fewer than expected" : "More than expected";
    return [
      { value: stripName(c.label), style: { fontFamily: FF.UI } },
      c.runs,
      c.expected,
      c.z,
      fmtP(c.p),
      { value: finding, style: { fontFamily: FF.UI } },
    ];
  });

  const footerContent = (result.flag !== "LOW" && result.flag !== "N/A")
    ? "Row averages run in streaks rather than alternating"
    : "Row averages alternate as expected";

  return (
    <MiniCardLayout result={result}
      footer={footerContent}
      lookFor="Long stretches where row means stay on the same side of the trend suggest sequential construction. Each block of one colour in the strip is a run of rows holding above or below the fitted trend — few, long runs mean the fabricator anchored each row's mean to the previous one. Compare those runs against the raw data: are the values suspiciously smooth or evenly spaced?"
      implications="Row averages that hold in blocks rather than fluctuating randomly can result from time-dependent biological processes or batch effects within a condition. Too many alternations — averages switching side of the trend more than expected — can indicate values arranged to appear random rather than recorded in natural order.">

      {/* What the test does — keeps the strips from reading as observed-vs-expected. */}
      <div style={{ ...SUB_HEAD, fontWeight: FW.NORM }}>
        Each condition's row averages are tested on their own for streaks against the
        number of runs expected by chance; the card flags if any one condition clumps.
      </div>

      {/* Per-condition sign strips — one block per run, fed by the detrended sign
          sequence. The framing line above already establishes these are
          per-condition tests, so no strip-group caption. */}
      {stripSeqs.length > 0 && (<>
        <PlotLayout fitContent>
          <SignStripPlot
            groupSignSeqs={stripSeqs}
            blocks
            fileRow={fileRow}
            firstFileRow={firstFileRow}
            lastFileRow={lastFileRow}
          />
        </PlotLayout>
        <ChartLegend items={[
          { color: SIGN_POS, label: "Above trend", opacity: 0.8 },
          { color: SIGN_NEG, label: "Below trend", opacity: OBS.strip.fillOpacity },
        ]} />
      </>)}

      {/* Run-length evidence table — observed vs expected runs per condition. */}
      {etRows.length > 0 && (
        <div style={{ marginTop: BLOCK_GAP }}>
          <div style={{ ...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT }}>Runs by condition</div>
          <EvidenceTable
            columns={["Condition", "Runs", "Expected", "z", "p", "Finding"]}
            rows={etRows}
            identifierColumns={1}
          />
        </div>
      )}

    </MiniCardLayout>
  );
}
