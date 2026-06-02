import { MiniCardLayout, CardBanner } from "../shared/CardLayout.jsx";
import { FW } from "../../constants/tokens.js";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";

import { fmtP } from "../../constants/thresholds.js";
import { SUB_HEAD } from "../shared/styles.js";
import { makeRowMapper } from "../shared/coordinates.js";

// Compose the per-detail join key into a result._spikeCells group.
// Pass-1 cells carry the raw matrix value; pass-1 detail rows carry the
// same value. Pass-2 cells carry fracStr (e.g. "5678") while pass-2 detail
// rows carry ".5678" — strip the leading "." to join.
function spikeKeyFromDetail(d) {
  return d.pass === "digit"
    ? `digit|${String(d.value).startsWith(".") ? String(d.value).slice(1) : d.value}`
    : `full|${d.value}`;
}
function spikeKeyFromCell(c) {
  return c.pass === "digit" ? `digit|${c.fracStr}` : `full|${c.value}`;
}

// Compact row list: group sorted unique file rows into consecutive ranges,
// cap at 3 ranges inline then "+K more" — mirrors the ColumnStatBar
// skipped-col inline-cap precedent (composeSkippedLine, ≤3 then "N more").
function compactRowList(fileRows) {
  if (!fileRows.length) return "—";
  const sorted = [...new Set(fileRows)].sort((a, b) => a - b);
  const ranges = [];
  let s = sorted[0], e = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === e + 1) e = sorted[i];
    else { ranges.push(s === e ? `${s}` : `${s}–${e}`); s = sorted[i]; e = sorted[i]; }
  }
  ranges.push(s === e ? `${s}` : `${s}–${e}`);
  if (ranges.length <= 3) return ranges.join(", ");
  return `${ranges.slice(0, 3).join(", ")}, +${ranges.length - 3} more`;
}

export function MiniCard_ValueFrequency({ result, importConfig, rowMap }) {
  const details = result.details || [];
  const spikeCells = result._spikeCells || [];
  const nSpikes = result.nSpikes || 0;

  const { fileRow } = makeRowMapper(importConfig, rowMap);

  // Group _spikeCells by join key → instance count + file-row set.
  const cellsByKey = new Map();
  for (const c of spikeCells) {
    const k = spikeKeyFromCell(c);
    let g = cellsByKey.get(k);
    if (!g) { g = { count: 0, rows: new Set() }; cellsByKey.set(k, g); }
    g.count++;
    g.rows.add(fileRow(c.row));
  }

  const footerText = nSpikes === 0
    ? "no number over-represented"
    : result.drivingPass === "digit"
      ? `${nSpikes} digit combination${nSpikes !== 1 ? "s" : ""} recur${nSpikes !== 1 ? "" : "s"} more often than chance allows`
      : `${nSpikes} number${nSpikes !== 1 ? "s" : ""} appear${nSpikes !== 1 ? "" : "s"} more often than chance allows`;

  // Column order: Value · Pass · Rows · Observed · Expected · Ratio · Adj P
  // Leading text cols (identifier): Value, Pass, Rows → identifierColumns=3.
  // Trailing numeric cols (mono): Observed, Expected, Ratio, Adj P.
  // Per-row cell count is duplicative of Observed by construction (full-value:
  // occurrences == flagged cells; digit-substring: substring matches ==
  // flagged cells), so no separate "Cells" column. Aggregate cell spread
  // still surfaces in the footer's "across N cells" segment.
  // Width hints sum to ~635px to fit typical Forensics card-body widths.
  // EvidenceTable wrapper's overflow:auto handles narrow viewports.
  return (
    <MiniCardLayout result={result}
      footer={footerText}
      lookFor="Check whether the over-represented values are round numbers (10, 50, 100) or follow a numpad pattern (12, 23, 34). For digit-pass spikes, look at whether the same fractional substring repeats across otherwise-unrelated rows — template-copied fabrication. Cross-reference with the terminal digit test — if both flag, the evidence for manual entry is stronger. Look at where these values appear in the dataset: are they clustered in specific rows or conditions?"
      implications="Individual values that spike above their neighbours can reflect natural modes in the data — for example, a detection limit that many samples hit. They can also indicate keyboard-entry patterns, where certain values are typed more often due to motor habits or cognitive biases. Spikes at adjacent numpad values (e.g. 67 and 78) are particularly characteristic of manual entry. A digit-substring spike (same fractional digits across differing integer parts) is characteristic of template-copied fabrication.">

      {details.length > 0 && (<>
        {result.keyboardPattern && (
          <CardBanner type="caution">
            <strong>Adjacent-key pattern detected</strong> — spike values include numpad diagonal entries (12, 23, 34, 45…). Consistent with keyboard entry rather than instrument output.
          </CardBanner>
        )}
        <div style={SUB_HEAD}>Over-represented values</div>
        <EvidenceTable
          columns={[
            {label:"Value",    width:"85px"},
            {label:"Pass",     width:"110px"},
            {label:"Rows",     width:"170px"},
            {label:"Observed", width:"75px"},
            {label:"Expected", width:"75px"},
            {label:"Ratio",    width:"65px"},
            {label:"Adj. p",    width:"85px"},
          ]}
          identifierColumns={3}
          rows={details.map(d => {
            const g = cellsByKey.get(spikeKeyFromDetail(d));
            const rowList = g ? compactRowList([...g.rows]) : "—";
            return [
              {value:d.value, style:{fontWeight:FW.BOLD}},
              d.pass === "digit" ? "digit substring" : "full value",
              rowList,
              d.observed,
              d.expected,
              d.ratio,
              fmtP(parseFloat(d.adjP)),
            ];
          })}
        />
      </>)}

    </MiniCardLayout>
  );
}
