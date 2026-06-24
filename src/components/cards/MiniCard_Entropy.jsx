/* ── MiniCard: Entropy / Zipf Analysis ── */

import { C, FS, FW, FF } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { DataTable } from "../shared/DataTable.jsx";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";
import { ColumnStatBar } from "../plots/ColumnStatBar.jsx";


export function MiniCard_Entropy({ result, importConfig, rowMap }) {
  const nFlagged = result.nFlagged || 0;
  const nLow = result.nLow || 0;
  const nHigh = result.nHigh || 0;

  // On the aggregated (per-condition) path the aggregator rebuilds `details`
  // as the per-group summary with no per-column field — the per-column rows
  // live in `subDetails`. Read the per-column source on whichever path is active.
  const flaggedCols = ((result.groupsAssessed !== undefined ? result.subDetails : result.details) || []).filter(d => d.flag === "HIGH" || d.flag === "MODERATE").map(d => d.column || d.col).filter(Boolean);
  const flaggedColStr = flaggedCols.length ? flaggedCols.join(", ") : "flagged columns";
  const entropyImplications = nLow > 0 && nHigh === 0
    ? `Fewer distinct values than expected: entries in ${flaggedColStr} repeat more than the distribution predicts. This can arise from instrument resolution limits or heavy rounding. It can also indicate values entered by hand: e.g., reuse of a small set of favourite numbers rather than the full spread a typical measurement generates.`
    : nHigh > 0 && nLow === 0
    ? `More distinct values or more even spacing between values than expected: entries in ${flaggedColStr} are spread more evenly than the distribution predicts. This can arise from a high-resolution instrument. It can also indicate generated values: e.g., a random-number source that produces more evenly spaced values than a typical measurement.`
    : `Some columns show too few distinct values whereas others show too many. This can arise from combining data from different sources. It can also indicate values entered by hand in some columns — e.g., reuse of a small set of favourite numbers — and generated values in others — e.g., a random-number source with evenly spaced values.`;

  // Per-condition routing path: aggregator rebuilds `details` as the
  // per-group summary, so we bind the table to `subDetails` (per-row
  // evidence, prefixed with `group`) when aggregated. Single-matrix path
  // keeps the existing DataTable. Matches MiniCard_Mahalanobis.
  // Entropy producer does not emit `skippedColumns`; the bar's skipped
  // surface stays empty for this card.
  const isAgg = result.groupsAssessed !== undefined;
  const sub = result.subDetails || [];
  const rows = (result.details || []).slice(0, 20);

  // Per-column bar items: all tested columns, flagged + unflagged.
  const barItems = (result.colRatios || []).map(c => ({
    colLabel: `Col ${c.col}`,
    value: c.ratio,
    flagged: !!c.flagged,
  }));

  return (
    <MiniCardLayout result={result}
      footer={nFlagged > 0
        ? (nFlagged === 1
            ? "1 column has too few or too many distinct numbers"
            : `${nFlagged} columns have too few or too many distinct numbers`)
        : "Value variety normal across columns"}
      lookFor="Check whether flagged columns carry the key results or a particular treatment group. For a low-diversity column, cross-reference the Over-used-numbers test — if the same columns flag there, the case for hand entry is stronger. For a high-diversity column, look for values spaced more finely than the instrument's precision should allow."
      implications={entropyImplications}>

      {barItems.length > 0 && (
        <ColumnStatBar items={barItems} cardFlag={result.flag}
          isAggregated={isAgg}
          refValue={1} refLabel="Expected (ratio = 1)"
          valueAxisLabel="Entropy ratio" />
      )}

      {isAgg && sub.length > 0 && (() => {
        const cols = Object.keys(sub[0]);
        const headerMap = { group: "Condition", adjP: "Adj. p", H_obs: "H", H_expected: "H expected", Ratio: "Ratio" };
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
          <DataTable data={rows} maxRows={20} compact identifierColumns={2} totalCount={result.nFlagged} columns={[
            { header: "Col", bold: true, render: d => d.Col },
            { header: "Finding", render: d => d.Direction === "Low entropy" ? "Too few distinct values" : d.Direction === "High entropy" ? "Too many distinct values" : d.Direction },
            { header: "Excess", bold: true, render: d => { const r = parseFloat(d.Ratio); if (isNaN(r)) return d.Ratio; const pct = Math.round((r - 1) * 100); return (pct >= 0 ? "+" : "") + pct + "%"; } },
            { header: "Adj. p", render: d => fmtP(d.adjP) },
          ]} />
        </div>
      )}

    </MiniCardLayout>
  );
}
