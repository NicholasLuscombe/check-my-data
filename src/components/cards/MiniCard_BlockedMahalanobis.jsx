/* ── MiniCard: Blocked Mahalanobis ──
   Sibling of §2.6 Mahalanobis Row Outlier. Lists flagged (pass × condition)
   units with their argmax block row-range, observed scan statistic, and
   BH-adjusted p. Optional position strip shows where flagged blocks sit. */

import { C, SIGNAL, FW } from "../../constants/tokens.js";
import { fmtP, fmtPBadge } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { RegionalNoiseStrip } from "../plots/RegionalNoiseStrip.jsx";
import { makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD } from "../shared/styles.js";

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
          : "Rows with adj-p < 0.01 are highlighted. Sorted by adj-p ascending (most localised first)."}
      />
    );
  }

  const passLabel = `W=${result.windowSize}, stride=${result.stride}`;
  const footer = `${result.nConditions || 0} condition${result.nConditions === 1 ? "" : "s"} · ${result.nWindowsTotal || 0} windows (${passLabel}) · B=${result.nPerm} · ${fmtPBadge(result.primaryP)}`;

  return (
    <MiniCardLayout result={result}
      footer={footer}
      lookFor="Row-range blocks where the covariance pattern across replicate columns shifts from the surrounding condition, or where the block mean differs from the condition-wide mean. Factor-model copy-paste with noise perturbation, block copies across replicates, and unrecorded localised batch effects all produce this signature. Cross-reference flagged blocks against sample collection logs or plate layouts."
      implications="A block-covariance flag indicates rows where replicate values covary differently from the rest of the condition — consistent with copy-paste-with-jitter fabrication, a data-generation error confined to a row stretch, or an unrecorded batch effect. A block-mean flag indicates a stretch of rows whose mean differs from the condition background. Both pass independently — cross-reference between passes and against §2.6 Mahalanobis Row Outlier to distinguish joint-row anomalies from block-structural anomalies.">

      {strip && (
        <>
          <div style={SUB_HEAD}>Flagged blocks by pass and condition</div>
          <PlotLayout>{strip}</PlotLayout>
          <ChartLegend items={[
            { color: C.TEXT_3, label: "Row range of flagged block (darker = larger scan statistic)" },
          ]} />
        </>
      )}

      {table && (
        <>
          <div style={{...SUB_HEAD, marginTop: strip ? "12px" : "0"}}>Blocks by adj-p</div>
          {table}
        </>
      )}

    </MiniCardLayout>
  );
}
