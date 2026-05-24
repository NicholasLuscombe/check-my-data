/* ── MiniCard: Windowed Autocorrelation ── */

import { C, SIGNAL, FW } from "../../constants/tokens.js";
import { fmtP, fmtPBadge } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { RegionalNoiseStrip } from "../plots/RegionalNoiseStrip.jsx";
import { makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD } from "../shared/styles.js";


export function MiniCard_WindowedAutocorr({ result, importConfig, rowMap }) {
  const details = result.details || [];
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
    const sig = details.filter(d => d.significant);
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
  let table = null;
  if (details.length) {
    const rows = details.slice(0, 20).map(d => {
      const sig = d.significant;
      const cell = v => sig ? { value: v, style: { color: SIGNAL.AMBER.text, fontWeight: FW.SEMI } } : v;
      const rowsLabel = `${toFileRow(d.startRow)}\u2013${toFileRow(d.endRow)}`;
      return [cell(d.pair), cell(rowsLabel), cell(d.r), cell(fmtP(d.rawP)), cell(fmtP(d.adjP))];
    });
    table = (
      <EvidenceTable
        columns={[{label:"Pair"}, {label:"Rows"}, {label:"r"}, {label:"p"}, {label:"adj p"}]}
        rows={rows} identifierColumns={2} compact
        footerText={result.flag === "LOW"
          ? "All windows are consistent with independent noise in each pair (BH-FDR at α = 0.05)."
          : "Rows with adj-p < 0.05 are highlighted. Sorted by adj-p ascending (most localised first)."}
      />
    );
  }

  const driverClause = (result.flag !== "LOW" && result.flag !== "N/A") ? " \u00B7 localised serial structure" : "";
  const footer = `${result.nPairs} pair${result.nPairs !== 1 ? "s" : ""} \u00B7 ${result.nWindowsTotal} windows (size ${result.windowSize}, stride ${result.stride}) \u00B7 B=${result.nPerm}${driverClause} \u00B7 ${fmtPBadge(result.primaryP)}`;

  return (
    <MiniCardLayout result={result}
      footer={footer}
      lookFor="Localised lag-1 autocorrelation means the replicate differences follow a predictable pattern in a stretch of rows — typically a template-copied region or a hand-jittered block. Check whether the flagged window rows correspond to an identifiable sub-experiment, plate segment, or batch. Compare the values against a fresh instrument export to rule out post-processing ordering."
      implications="Within-window serial structure can result from time-dependent biological processes affecting adjacent rows (e.g., temperature drift, a single plate read out-of-order). It can also indicate that values in that stretch were generated from a formula linking each row to its neighbour rather than recorded independently.">

      {strip && (
        <>
          <div style={SUB_HEAD}>Flagged windows by pair</div>
          <PlotLayout>{strip}</PlotLayout>
          <ChartLegend items={[
            { color: C.TEXT_3, label: "Row range of flagged window (darker = larger |r|)" },
          ]} />
        </>
      )}

      {table && (
        <>
          <div style={{...SUB_HEAD, marginTop: strip ? "12px" : "0"}}>Windows by adj-p</div>
          {table}
        </>
      )}

    </MiniCardLayout>
  );
}
