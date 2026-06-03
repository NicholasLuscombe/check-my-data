/* ── MiniCard: Modality Test ──
   Mirrors MiniCard_ColumnGoF structure: per-flagged-column DataTable +
   footer. Producer (src/tests/modality.js) emits
   `details: [{Col, Dip, adjP}]` for flagged columns and `colDips`
   for the full per-column tested set; this card surfaces them.

   S129: created to fill the empty-card-body gap surfaced by the S128
   audit (parked #39). Pre-S129 there was no entry for "Modality Test"
   in MINIPLOT_REGISTRY (MiniPlot.jsx) so when the test fires above
   LOW the card body would render nothing under the title + verdict
   badge. */

import { C, FS, FW, FF } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { DataTable } from "../shared/DataTable.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";
import { ColumnStatBar } from "../plots/ColumnStatBar.jsx";
import { DIP_GATE } from "../../tests/modality.js";

export function MiniCard_Modality({ result, importConfig, rowMap }) {
  const nFlagged = result.nFlagged || 0;

  const flaggedColLabels = (result.details || [])
    .map(d => `Col ${d.Col}`)
    .filter(Boolean);
  const flaggedColStr = flaggedColLabels.length
    ? flaggedColLabels.join(", ")
    : "flagged columns";

  // Implications copy renders only when the card is flagged (gated by
  // MiniCardLayout on isFlagged), so the only meaningful branch is the
  // nFlagged > 0 one.
  const implications = `Values in ${flaggedColStr} are non-unimodal — the distribution shows multiple peaks or a dip exceeding the uniform-reference ceiling. Hartigan's dip statistic exceeding the uniform null is a strong fingerprint of mixture fabrication: two genuinely different sources (different cohorts, batches, or instrument runs) combined and presented as a single declared condition. Examine the column histograms for two or more peaks separated by a clear gap.`;

  // Per-condition routing path: aggregator rebuilds `details` as the
  // per-group summary, so we bind the table to `subDetails` (per-row
  // evidence, prefixed with `group`) when aggregated. Single-matrix path
  // keeps the existing DataTable. Matches MiniCard_Mahalanobis.
  const isAgg = result.groupsAssessed !== undefined;
  const sub = result.subDetails || [];
  const rows = (result.details || []).slice(0, 20);

  // Per-column bar items: all tested columns, flagged + unflagged.
  const barItems = (result.colDips || []).map(c => ({
    colLabel: `Col ${c.col}`,
    value: c.dip,
    flagged: !!c.flagged,
  }));
  const skippedItems = (result.skippedColumns || []).map(s => ({
    col: s.col, colLabel: `Col ${s.col}`, reason: s.reason,
  }));

  return (
    <MiniCardLayout result={result}
      footer={nFlagged > 0
        ? (nFlagged === 1
            ? "1 column has more than one peak"
            : `${nFlagged} columns have more than one peak`)
        : "all columns single-peaked"}
      lookFor="Flagged columns have a Hartigan dip statistic exceeding the uniform-reference null — a unimodal distribution cannot produce dip values that high. Examine the column histogram: look for two or more peaks separated by a clear gap, or for asymmetry consistent with mixing two distributions of different mean or scale."
      implications={implications}>

      {(barItems.length > 0 || skippedItems.length > 0) && (
        <ColumnStatBar items={barItems} skipped={skippedItems} cardFlag={result.flag}
          isAggregated={isAgg}
          refValue={DIP_GATE} refLabel="Multimodality threshold"
          valueAxisLabel="Dip statistic"
          skippedClause="near-uniform shape — too flat to test for peaks" />
      )}

      {isAgg && sub.length > 0 && (() => {
        const cols = Object.keys(sub[0]);
        const headerMap = { group: "Condition", adjP: "adj. p" };
        const etCols = cols.map(k => ({ label: headerMap[k] || k }));
        const etRows = sub.slice(0, 20).map(row => cols.map(k => {
          if (k === "adjP") return fmtP(row[k]);
          return row[k];
        }));
        return (
          <div style={{ marginTop: BLOCK_GAP }}>
            {/* S210 (multi-surface): secondary-surface heading kept but demoted
                (Regular weight) to read clearly below the footer-lead. */}
            <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Flagged columns</div>
            <EvidenceTable columns={etCols} rows={etRows} identifierColumns={2} compact />
            {sub.length > 20 && <div style={{ fontFamily: FF.UI, fontSize: FS.xs, color: C.TEXT_3, marginTop: "3px" }}>…and {sub.length - 20} more</div>}
          </div>
        );
      })()}

      {!isAgg && rows.length > 0 && (
        <div style={{ marginTop: BLOCK_GAP }}>
          {/* S210 (multi-surface): secondary-surface heading kept but demoted
              (Regular weight) to read clearly below the footer-lead. */}
          <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Flagged columns</div>
          <DataTable data={rows} maxRows={20} compact identifierColumns={1} columns={[
            { header: "Col", bold: true, render: d => d.Col },
            { header: "Dip", bold: true, render: d => d.Dip },
            { header: "adj. p", render: d => fmtP(d.adjP) },
          ]} />
          {nFlagged > 20 && <div style={{ fontFamily: FF.UI, fontSize: FS.xs, color: C.TEXT_3, marginTop: "3px" }}>…and {nFlagged - 20} more</div>}
        </div>
      )}

    </MiniCardLayout>
  );
}
