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

import { C, CC, FS, FW, FF } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { DataTable } from "../shared/DataTable.jsx";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";
import { ColumnStatBar } from "../plots/ColumnStatBar.jsx";
import { DIP_GATE } from "../../tests/modality.js";

export function MiniCard_Modality({ result, importConfig, rowMap }) {
  const nFlagged = result.nFlagged || 0;

  // On the aggregated (per-condition) path the aggregator rebuilds `details`
  // as the per-group summary with no `.Col` field — the per-column labels live
  // in `subDetails`. Read the per-column source on whichever path is active.
  const flaggedColLabels = ((result.groupsAssessed !== undefined ? result.subDetails : result.details) || [])
    .map(d => `Col ${d.Col}`)
    .filter(Boolean);
  const flaggedColStr = flaggedColLabels.length
    ? flaggedColLabels.join(", ")
    : "flagged columns";

  // Implications copy renders only when the card is flagged (gated by
  // MiniCardLayout on isFlagged), so the only meaningful branch is the
  // nFlagged > 0 one.
  const implications = `Values in ${flaggedColStr} have more than one peak or a gap too deep for a single-peaked distribution. This can arise from real sub-populations within a condition: e.g., multiple populations or batches that behave differently. It can also indicate two separate sources — e.g., different cohorts, runs, or conditions — combined and presented as one declared condition.`;

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
        : "All columns single-peaked"}
      lookFor="Check whether the flagged columns carry the key results. Inspect the histogram to confirm two distinct peaks rather than one skewed spread, then check whether the two groups map onto a recorded split — a batch, plate, or date. Two peaks that cut across a single declared condition with no recorded reason are the concern; two that line up with a known sub-group are likely genuine. Cross-reference the Distribution-shape test, which flags the same columns when the extra peak distorts the overall shape."
      implications={implications}>

      {(barItems.length > 0 || skippedItems.length > 0) && (
        <ColumnStatBar items={barItems} skipped={skippedItems} cardFlag={result.flag}
          isAggregated={isAgg}
          refValue={DIP_GATE} refLabel="Multimodality threshold" refColor={CC.THRESH}
          valueAxisLabel="Dip statistic"
          skippedClause="near-uniform shape — too flat to test for peaks" />
      )}

      {isAgg && sub.length > 0 && (() => {
        const cols = Object.keys(sub[0]);
        const headerMap = { group: "Condition", adjP: "Adj. p" };
        const dtCols = cols.map(k => ({
          header: headerMap[k] || k,
          render: k === "adjP" ? (d => fmtP(d[k])) : (d => d[k]),
        }));
        return (
          <div style={{ marginTop: BLOCK_GAP }}>
            {/* S210 (multi-surface): secondary-surface heading kept but demoted
                (Regular weight) to read clearly below the footer-lead. */}
            <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Flagged columns</div>
            <DataTable data={sub} maxRows={20} compact identifierColumns={2} columns={dtCols} />
          </div>
        );
      })()}

      {!isAgg && rows.length > 0 && (
        <div style={{ marginTop: BLOCK_GAP }}>
          {/* S210 (multi-surface): secondary-surface heading kept but demoted
              (Regular weight) to read clearly below the footer-lead. */}
          <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Flagged columns</div>
          <DataTable data={rows} maxRows={20} compact identifierColumns={1} totalCount={result.nFlagged} columns={[
            { header: "Col", bold: true, render: d => d.Col },
            { header: "Dip", bold: true, render: d => d.Dip },
            { header: "Adj. p", render: d => fmtP(d.adjP) },
          ]} />
        </div>
      )}

    </MiniCardLayout>
  );
}
