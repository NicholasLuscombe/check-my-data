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

import { C, FS, FF } from "../../constants/tokens.js";
import { fmtP, fmtPBadge } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { DataTable } from "../shared/DataTable.jsx";
import { SUB_HEAD } from "../shared/styles.js";

export function MiniCard_Modality({ result, importConfig, rowMap }) {
  const nFlagged = result.nFlagged || 0;

  const flaggedColLabels = (result.details || [])
    .map(d => `Col ${d.Col}`)
    .filter(Boolean);
  const flaggedColStr = flaggedColLabels.length
    ? flaggedColLabels.join(", ")
    : "flagged columns";

  const implications = nFlagged > 0
    ? `Values in ${flaggedColStr} are non-unimodal — the distribution shows multiple peaks or a dip exceeding the uniform-reference ceiling. Hartigan's dip statistic exceeding the uniform null is a strong fingerprint of mixture fabrication: two genuinely different sources (different cohorts, batches, or instrument runs) combined and presented as a single declared condition. Examine the column histograms for two or more peaks separated by a clear gap.`
    : `No columns produced multi-modal evidence above the uniform-reference null.`;

  const rows = (result.details || []).slice(0, 20);

  return (
    <MiniCardLayout result={result}
      footer={<>
        {result.nTested} column{result.nTested !== 1 ? "s" : ""} tested
        {" · "}{nFlagged} flagged
        {result.fewColumnsNote && ` · ${result.fewColumnsNote}`}
        {" · " + fmtPBadge(result.primaryP)}
      </>}
      lookFor="Flagged columns have a Hartigan dip statistic exceeding the uniform-reference null — a unimodal distribution cannot produce dip values that high. Examine the column histogram: look for two or more peaks separated by a clear gap, or for asymmetry consistent with mixing two distributions of different mean or scale."
      implications={implications}>

      {rows.length > 0 && (
        <div style={{ marginTop: "8px" }}>
          <div style={SUB_HEAD}>Flagged columns</div>
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
