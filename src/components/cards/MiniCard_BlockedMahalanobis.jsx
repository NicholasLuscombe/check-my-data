/* ── MiniCard: Blocked Mahalanobis ──
   Sibling of §2.6 Mahalanobis Row Outlier. Lists flagged (pass × condition)
   units with their argmax block row-range, observed scan statistic, and
   BH-adjusted p. Optional position strip shows where flagged blocks sit. */

import { C, CC, SEV_VERDICT, FW } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { RegionalNoiseStrip } from "../plots/RegionalNoiseStrip.jsx";
import { makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";
import { LOCALISED_ROWS_CAPTION } from "../../constants/descriptions.js";

export function MiniCard_BlockedMahalanobis({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const { toFileRow } = makeRowMapper(importConfig, rowMap);

  // ── Position strip ── reuse RegionalNoiseStrip: one "row" per (pass × cond).
  // Only show significant blocks on the strip to keep visual signal clean.
  const nRows = importConfig?.data?.length || 0;
  let strip = null;
  if (nRows > 0 && details.length > 0) {
    const sig = details.filter(d => d.significant);
    if (sig.length) {
      // Build per (pass × cond) row index. colNames maps index → label.
      const passCondSet = [];
      const seen = new Set();
      for (const d of sig) {
        const key = `${d.pass} · ${d.condition}`;
        if (!seen.has(key)) { seen.add(key); passCondSet.push(key); }
      }
      const colNames = {};
      const idxByKey = {};
      passCondSet.forEach((k, i) => { idxByKey[k] = i + 1; colNames[i + 1] = k; });
      // Ratio: encode statistic magnitude so opacity scales with effect size.
      // Normalise within the list so the most extreme block reads darkest.
      const maxStat = Math.max(...sig.map(d => parseFloat(d.stat) || 1));
      const stripDetails = sig.map(d => {
        const stat = parseFloat(d.stat) || 1;
        const norm = maxStat > 1 ? 1 + (stat / maxStat) * 9 : 2;
        const startFile = toFileRow(d.startRow);
        const endFile = toFileRow(d.endRow);
        return {
          rows: `${startFile}–${endFile}`,
          anomCol: String(idxByKey[`${d.pass} · ${d.condition}`]),
          ratio: norm.toFixed(2) + "×",
        };
      });
      strip = (
        <RegionalNoiseStrip details={stripDetails} nRows={nRows}
          colNames={colNames} toFileRow={r => r} yAxisTitle={null} />
      );
    }
  }

  // ── Evidence table ──
  let table = null;
  if (details.length) {
    // S276: flagged row marked by a 2px left edge in the card's verdict-tier
    // colour, from the same SEV_VERDICT scale the verdict word uses. Numerals
    // stay body colour; Semibold is the cue.
    const flagColor = result.flag === "HIGH" ? SEV_VERDICT[3].color : SEV_VERDICT[2].color;
    const rows = details.slice(0, 30).map(d => {
      const sig = d.significant;
      const cell = v => sig
        ? { value: v, style: { fontWeight: FW.SEMI } }
        : v;
      const rowsLabel = `${toFileRow(d.startRow)}–${toFileRow(d.endRow)}`;
      const statLabel = `${d.statType} = ${d.stat}`;
      const row = [cell(d.pass), cell(d.condition), cell(rowsLabel), cell(statLabel), cell(fmtP(d.adjP))];
      if (sig) row[0] = { ...row[0], style: { ...row[0].style, borderLeft: `2px solid ${flagColor}` } };
      return row;
    });
    table = (
      <EvidenceTable
        columns={[{label:"Pass"}, {label:"Condition"}, {label:"Rows"}, {label:"Statistic"}, {label:"Adj. p"}]}
        rows={rows} identifierColumns={3} compact
        footerText={result.flag === "LOW"
          ? "All windows are consistent with a single condition-wide covariance / mean structure."
          : result.nDetailRows > rows.length
            ? `${LOCALISED_ROWS_CAPTION} Showing ${rows.length} of ${result.nDetailRows}.`
            : LOCALISED_ROWS_CAPTION}
      />
    );
  }

  // S168: winning unit from details[0] — already sorted adj-p asc by the
  // producer (blockedMahalanobis.js). Names the flagged block’s row range.
  const driverBest = (result.flag !== "LOW" && result.flag !== "N/A" && details[0]) ? details[0] : null;
  const footer = driverBest
    ? `Rows ${toFileRow(driverBest.startRow)}\u2013${toFileRow(driverBest.endRow)} shift together as a block`
    : "No shifted blocks";

  return (
    <MiniCardLayout result={result}
      footer={footer}
      lookFor="Note which block of rows is identified and whether it flagged on average or on correlation. Inspect those rows in the raw data files and check whether the block lines up with a batch, plate, or run. A correlation difference with no recorded batch reason is the stronger signal — compare the block's replicate relationships against the rest of the condition. Cross-reference Unusual rows: if individual rows in the block also flag there, the block is anomalous both point by point and as a whole; if none do, the signal is purely structural — values that look ordinary alone but carry the wrong joint behaviour."
      implications="A block that differs in average can arise from a real batch effect or a recording change for that stretch. A block that differs in how the replicates move together is harder to produce by accident: it points to values injected from a model or copied with added noise, which carries its own correlation structure rather than the experiment's. The per-row test misses this: a stretch of fabricated rows can each look unremarkable on their own while the block as a whole carries the wrong average or correlation structure.">

      {strip && (
        <>
          {/* S210 (multi-surface): primary-surface heading dropped — the footer
              fragment (LEAD_HEAD in MiniCardLayout) heads this primary plot. */}
          <PlotLayout fitContent>{strip}</PlotLayout>
          <ChartLegend items={[
            { color: CC.THRESH, label: "Row range of flagged block (darker = larger scan statistic)" },
          ]} />
        </>
      )}

      {table && (
        <>
          {/* S210 (multi-surface): heading demoted when the strip is present
              (secondary surface); dropped when the table is the sole surface
              (footer-lead heads it). */}
          {strip && <div style={{...SUB_HEAD, marginTop: BLOCK_GAP, fontWeight: FW.NORM, marginBottom: BLOCK_GAP_TIGHT}}>Blocks by adj-p</div>}
          {table}
        </>
      )}

    </MiniCardLayout>
  );
}
