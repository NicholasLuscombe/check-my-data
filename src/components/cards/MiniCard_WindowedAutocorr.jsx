/* ── MiniCard: Windowed Autocorrelation ── */

import { C, SIGNAL, FW } from "../../constants/tokens.js";
import { fmtP, ALPHA } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { RegionalNoiseStrip } from "../plots/RegionalNoiseStrip.jsx";
import { makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";
import { LOCALISED_ROWS_CAPTION } from "../../constants/descriptions.js";


export function MiniCard_WindowedAutocorr({ result, importConfig, rowMap }) {
  // Per-condition routing path: aggregator rebuilds `details` as the
  // per-group summary, so the table binds to `subDetails` (per-row
  // evidence, prefixed with `group`) when aggregated. The strip stays
  // on `details` and renders nothing under aggregation (no per-row keys
  // in the per-group summary) — defensive landing pending a fixture
  // that fires per-condition. Matches MiniCard_Mahalanobis precedent.
  const isAgg = result.groupsAssessed !== undefined;
  const details = result.details || [];
  const sub = result.subDetails || [];
  const tableSource = isAgg ? sub : details;
  const { toFileRow } = makeRowMapper(importConfig, rowMap);

  // ── Position strip ── reuse RegionalNoiseStrip.
  // RegionalNoiseStrip expects details with { rows, anomCol, ratio }. Map
  // pair labels into "anomCol" slot and use |r| as the opacity-scaling ratio
  // (1 → faint, 2 → bright) so strong-r windows stand out.
  const nRows = importConfig?.data?.length || 0;
  let strip = null;
  if (nRows > 0 && details.length > 0) {
    // Reuse: one row per pair, showing flagged windows along the row span.
    // Synthesize a ratio from |r| via 1 + |r|·10 so opacityForRatio scales.
    const sig = details.filter(d => d.adjP < ALPHA.NOTE);
    if (sig.length) {
      // Build per-pair unique index. Pass to strip as anomCol=index+1 and
      // colNames map so the Y axis shows the pair label.
      const pairSet = [...new Set(sig.map(d => d.pair))];
      const colNames = { undefined: undefined };
      const idxByPair = {};
      pairSet.forEach((p, i) => { idxByPair[p] = i + 1; colNames[i + 1] = `pair ${p}`; });
      const stripDetails = sig.map(d => ({
        rows: d.rows,
        anomCol: String(idxByPair[d.pair]),
        ratio: (1 + Math.abs(parseFloat(d.r)) * 10).toFixed(2) + "×",
      }));
      strip = (
        <RegionalNoiseStrip details={stripDetails} nRows={nRows}
          colNames={colNames} toFileRow={toFileRow} />
      );
    }
  }

  // ── Evidence table ──
  // Note: under aggregation, the producer's startRow/endRow are relative to
  // the per-condition slice — toFileRow remap would be incorrect without
  // slice context. The aggregator does not propagate slice-row indices for
  // non-`Row`-keyed fields. WindowedAutocorr does not fire per-condition on
  // any current fixture, so the table-binding fix lands defensive; the row
  // remap would need attention if the test ever flags per-condition.
  let table = null;
  if (tableSource.length) {
    const rows = tableSource.slice(0, 20).map(d => {
      const sig = d.adjP < ALPHA.NOTE;
      const cell = v => sig ? { value: v, style: { color: SIGNAL.AMBER.text, fontWeight: FW.SEMI } } : v;
      const rowsLabel = `${toFileRow(d.startRow)}\u2013${toFileRow(d.endRow)}`;
      const base = [cell(d.pair), cell(rowsLabel), cell(d.r), cell(fmtP(d.adjP))];
      return isAgg ? [cell(d.group), ...base] : base;
    });
    const cols = isAgg
      ? [{label:"Condition"}, {label:"Pair"}, {label:"Rows"}, {label:"r"}, {label:"Adj. p"}]
      : [{label:"Pair"}, {label:"Rows"}, {label:"r"}, {label:"Adj. p"}];
    table = (
      <EvidenceTable
        columns={cols}
        rows={rows} identifierColumns={isAgg ? 3 : 2} compact
        footerText={result.flag === "LOW"
          ? "All windows are consistent with independent noise in each pair."
          : tableSource.length > 20
            ? `${LOCALISED_ROWS_CAPTION} Showing 20 of ${tableSource.length}.`
            : LOCALISED_ROWS_CAPTION}
      />
    );
  }

  // Footer: plain finding. When flagged, name the row range of the most
  // significant window (details pre-sorted adj-p ascending by the producer).
  const sigWins = details.filter(d => d.adjP < ALPHA.NOTE);
  const flaggedRange = sigWins.length
    ? `${toFileRow(sigWins[0].startRow)}\u2013${toFileRow(sigWins[0].endRow)}`
    : null;
  const footer = (result.flag === "LOW" || result.flag === "N/A")
    ? "No localised noise correlation"
    : flaggedRange
      ? `Noise correlates within rows ${flaggedRange}`
      : "Noise correlates within a localised window";

  return (
    <MiniCardLayout result={result}
      footer={footer}
      lookFor="Localised lag-1 autocorrelation means the replicate differences follow a predictable pattern in a stretch of rows — typically a template-copied region or a hand-jittered block. Check whether the flagged window rows correspond to an identifiable sub-experiment, plate segment, or batch. Compare the values against a fresh instrument export to rule out post-processing ordering."
      implications="Within-window serial structure can result from time-dependent biological processes affecting adjacent rows (e.g., temperature drift, a single plate read out-of-order). It can also indicate that values in that stretch were generated from a formula linking each row to its neighbour rather than recorded independently.">

      {strip && (
        <>
          {/* S210 (multi-surface): primary-surface heading dropped — the footer
              fragment (LEAD_HEAD in MiniCardLayout) heads this primary plot. */}
          <PlotLayout>{strip}</PlotLayout>
          <ChartLegend items={[
            { color: C.TEXT_3, label: "Row range of flagged window (darker = larger |r|)" },
          ]} />
        </>
      )}

      {table && (
        <>
          {/* S210 (multi-surface): heading demoted when the strip is present
              (secondary surface); dropped when the table is the sole surface
              (footer-lead heads it). */}
          {strip && <div style={{...SUB_HEAD, marginTop: BLOCK_GAP, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Windows by adj-p</div>}
          {table}
        </>
      )}

    </MiniCardLayout>
  );
}
