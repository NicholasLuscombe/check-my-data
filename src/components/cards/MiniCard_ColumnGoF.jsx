/* ── MiniCard: Column Goodness-of-Fit ──
   Mirrors MiniCard_Entropy structure: per-flagged-column DataTable +
   footer. Producer (src/tests/columnGof.js) emits
   `details: [{Col, Family, Direction, A2_obs, A2_null_median, Ratio,
   adjP}]` for flagged columns; this card surfaces it.

   S126b add-9: created to fill the empty-card-body gap surfaced by
   DS11 verification. Pre-add-9 there was no entry for "Column
   Goodness-of-Fit" in MINIPLOT_REGISTRY (MiniPlot.jsx) so the test
   card body rendered nothing under the title + verdict badge. */

import { C, FS, FW, FF } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { DataTable } from "../shared/DataTable.jsx";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";
import { ColumnStatBar } from "../plots/ColumnStatBar.jsx";

// Family slugs come from the producer in lowercase ("normal" / "poisson"
// / "nb"). Render with their conventional statistics formatting.
const FAMILY_LABEL = {
  normal: "Normal",
  poisson: "Poisson",
  nb: "Negative Binomial",
};

// Convert producer's Direction + family into a user-facing finding
// string. Mirrors MiniCard_Entropy's Direction → text mapping.
function findingText(direction, family) {
  const fam = FAMILY_LABEL[family] || family;
  if (direction === "Shape mismatch") {
    return `Doesn't fit ${fam}`;
  }
  if (direction === "Too-tight fit") {
    return `Fits ${fam} too tightly`;
  }
  return direction;
}

export function MiniCard_ColumnGoF({ result, importConfig, rowMap }) {
  const nFlagged = result.nFlagged || 0;
  const nHigh = result.nHigh || 0;
  const nLow = result.nLow || 0;

  // On the aggregated (per-condition) path the aggregator rebuilds `details`
  // as the per-group summary with no `.Col` field — the per-column labels live
  // in `subDetails`. Read the per-column source on whichever path is active.
  const flaggedColLabels = ((result.groupsAssessed !== undefined ? result.subDetails : result.details) || [])
    .map(d => `Col ${d.Col}`)
    .filter(Boolean);
  const flaggedColStr = flaggedColLabels.length
    ? flaggedColLabels.join(", ")
    : "flagged columns";

  const implications = nHigh > 0 && nLow === 0
    ? `Values in ${flaggedColStr} do not match the shape their mean and variance predict: heavier-tailed, multi-peaked, or otherwise off-shape. This can arise from mixing genuinely different sources. It can also indicate copied or hand-entered values: e.g., hand-typed numbers keep roughly the right mean and variance but get the tail shape wrong, because how often extreme values occur is not intuitive to fabricate.`
    : nLow > 0 && nHigh === 0
    ? `Values in ${flaggedColStr} match their predicted shape more closely than measurement noise usually allows. This can happen occasionally by chance. It more often indicates values generated from an underlying distribution: e.g., a random-number source drawing from the exact fitted shape.`
    : `Some columns are off-shape — heavier-tailed, multi-peaked, or otherwise not matching the shape their mean and variance predict — while others fit their predicted shape more closely than measurement noise allows. The off-shape columns can come from mixed sources or hand entry; the too-close columns from values generated to fit. Together this points to a dataset assembled from more than one origin.`;

  const lookForText = nHigh > 0 && nLow === 0
    ? `Check whether the flagged columns carry the key results. Inspect each column's histogram — the average and spread will look normal, so focus on the tails and any extra peaks or clustering, where the signal sits. Cross-reference the Multiple-peaks test, which catches the bimodal case directly.`
    : nLow > 0 && nHigh === 0
    ? `Check whether the flagged columns carry the key results. Compare them against the raw data files: values matching their predicted shape this closely are hard to obtain by measurement. Cross-reference the Value-diversity test — generated values that fit too cleanly often also show unnaturally even spacing.`
    : `Check whether the flagged columns carry the key results. For the off-shape columns, inspect each histogram — the average and spread will look normal, so focus on the tails and any extra peaks or clustering — and cross-reference the Multiple-peaks test, which catches the bimodal case directly. For the too-close columns, compare them against the raw data files, since values matching their predicted shape this closely are hard to obtain by measurement; cross-reference the Value-diversity test, as generated values often also show unnaturally even spacing.`;

  // Per-condition routing path: aggregator rebuilds `details` as the
  // per-group summary (one row per condition), so we bind the table to
  // `subDetails` (per-row evidence flattened across groups, prefixed with
  // `group`) when aggregated. Single-matrix path keeps the existing
  // DataTable. Matches the Mahalanobis generic-subDetails precedent.
  const isAgg = result.groupsAssessed !== undefined;
  const sub = result.subDetails || [];
  const rows = (result.details || []).slice(0, 20);

  // Per-column bar items: all tested columns, flagged + unflagged.
  const barItems = (result.colRatios || []).map(c => ({
    colLabel: `Col ${c.col}`,
    value: c.ratio,
    flagged: !!c.flagged,
  }));
  const skippedItems = (result.skippedColumns || []).map(s => ({
    col: s.col, colLabel: `Col ${s.col}`, reason: s.reason,
  }));

  return (
    <MiniCardLayout result={result}
      footer={nFlagged > 0
        ? (nFlagged === 1
            ? "1 column doesn't fit its expected shape"
            : `${nFlagged} columns don't fit their expected shape`)
        : "All columns fit their expected shape"}
      lookFor={lookForText}
      implications={implications}>

      {(barItems.length > 0 || skippedItems.length > 0) && (
        <ColumnStatBar items={barItems} skipped={skippedItems} cardFlag={result.flag}
          isAggregated={isAgg}
          refValue={1} refLabel="Expected (ratio = 1)"
          valueAxisLabel="A² ratio"
          skippedClause="near-uniform shape — too flat to fit a distribution" />
      )}

      {isAgg && sub.length > 0 && (() => {
        // Aggregated (per-condition) path — render the flat per-row evidence
        // from subDetails with auto-derived columns and a Condition column
        // (group → Condition). Matches MiniCard_Mahalanobis.
        const cols = Object.keys(sub[0]);
        const headerMap = { group: "Condition", adjP: "Adj. p", A2_obs: "A²", A2_null_median: "A² null median", Ratio: "Ratio" };
        const dtCols = cols.map(k => ({
          header: headerMap[k] || k,
          render: k === "adjP" ? (d => fmtP(d[k]))
                : k === "Family" ? (d => FAMILY_LABEL[d[k]] || d[k])
                : (d => d[k]),
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
          <DataTable data={rows} maxRows={20} compact identifierColumns={2} totalCount={result.nFlagged} columns={[
            { header: "Col", bold: true, render: d => d.Col },
            { header: "Finding", render: d => findingText(d.Direction, d.Family) },
            { header: "Ratio", bold: true, render: d => d.Ratio },
            { header: "Adj. p", render: d => fmtP(d.adjP) },
          ]} />
        </div>
      )}

    </MiniCardLayout>
  );
}
