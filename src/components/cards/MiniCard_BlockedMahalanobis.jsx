/* ── MiniCard: Blocked Mahalanobis ──
   Sibling of §2.6 Mahalanobis Row Outlier. Lists flagged (pass × condition)
   units with their argmax block row-range, observed scan statistic, and
   BH-adjusted p. Optional position strip shows where flagged blocks sit. */

import { C, SIGNAL, FW } from "../../constants/tokens.js";
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
          colNames={colNames} toFileRow={r => r} />
      );
    }
  }

  // ── Evidence table ──
  let table = null;
  if (details.length) {
    const rows = details.slice(0, 30).map(d => {
      const sig = d.significant;
      const cell = v => sig
        ? { value: v, style: { color: SIGNAL.AMBER.text, fontWeight: FW.SEMI } }
        : v;
      const rowsLabel = `${toFileRow(d.startRow)}–${toFileRow(d.endRow)}`;
      const statLabel = `${d.statType} = ${d.stat}`;
      return [cell(d.pass), cell(d.condition), cell(rowsLabel), cell(statLabel), cell(fmtP(d.rawP)), cell(fmtP(d.adjP))];
    });
    table = (
      <EvidenceTable
        columns={[{label:"Pass"}, {label:"Condition"}, {label:"Rows"}, {label:"Statistic"}, {label:"p"}, {label:"adj p"}]}
        rows={rows} identifierColumns={3} compact
        footerText={result.flag === "LOW"
          ? "All windows are consistent with a single condition-wide covariance / mean structure."
          : LOCALISED_ROWS_CAPTION}
      />
    );
  }

  // S168: winning unit from details[0] — already sorted adj-p asc by the
  // producer (blockedMahalanobis.js). Names the flagged block’s row range.
  const driverBest = (result.flag !== "LOW" && result.flag !== "N/A" && details[0]) ? details[0] : null;
  const footer = driverBest
    ? `rows ${toFileRow(driverBest.startRow)}\u2013${toFileRow(driverBest.endRow)} shift together as a block`
    : "no shifted blocks";

  return (
    <MiniCardLayout result={result}
      footer={footer}
      lookFor="Row-range blocks where the covariance pattern across replicate columns shifts from the surrounding condition, or where the block mean differs from the condition-wide mean. Factor-model copy-paste with noise perturbation, block copies across replicates, and unrecorded localised batch effects all produce this signature. Cross-reference flagged blocks against sample collection logs or plate layouts."
      implications="A block-covariance flag indicates rows where replicate values covary differently from the rest of the condition — consistent with copy-paste-with-jitter fabrication, a data-generation error confined to a row stretch, or an unrecorded batch effect. A block-mean flag indicates a stretch of rows whose mean differs from the condition background. Both pass independently — cross-reference between passes and against §2.6 Mahalanobis Row Outlier to distinguish joint-row anomalies from block-structural anomalies.">

      {strip && (
        <>
          {/* S210 (multi-surface): primary-surface heading dropped — the footer
              fragment (LEAD_HEAD in MiniCardLayout) heads this primary plot. */}
          <PlotLayout>{strip}</PlotLayout>
          <ChartLegend items={[
            { color: C.TEXT_3, label: "Row range of flagged block (darker = larger scan statistic)" },
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
