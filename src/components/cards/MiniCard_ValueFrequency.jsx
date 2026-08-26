import { MiniCardLayout, CardBanner } from "../shared/CardLayout.jsx";
import { FW } from "../../constants/tokens.js";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { PlotLayout } from "../shared/PlotLayout.jsx";
import { ChartLegend } from "../shared/ChartLegend.jsx";
import { ForestPlot, forestLegendItems } from "../plots/ForestPlot.jsx";

import { fmtP } from "../../constants/thresholds.js";
import { VFS_NEARDUP_GENERATORS } from "../../constants/mechanisms.js";
import { makeRowMapper } from "../shared/coordinates.js";
import { SUB_HEAD, BLOCK_GAP, BLOCK_GAP_TIGHT } from "../shared/styles.js";

// Forest row budget. The BH family runs from 11 to 198 entries across the
// fixture set (measured S385), so an uncapped forest would be a 3,500px column
// on DS05 — the plot would stop reading as one object. Twenty rows at the
// primitive's 18px pitch is a ~360px plot area, roughly square against the
// 420px standard chart width. The cap applies to the CLEARED fill only: every
// flagged unit is plotted whatever the count, so the marks the verdict rests on
// can never be the rows that got dropped.
const FOREST_MAX_UNITS = 20;

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

  // Footer is the one-line result headline: name the finding, verdict-free. The
  // digit branch names the recurring fractional tail (not "digit combinations")
  // so it reads as a near-duplicate candidate; the candidate/verify framing
  // itself lives in the lookFor / implications blocks below (S312).
  const footerText = (result.flag === "LOW" || result.flag === "N/A")
    ? "No numbers appear more often than expected"
    : result.drivingPass === "digit"
      ? `${nSpikes} fractional tail${nSpikes !== 1 ? "s" : ""} recur${nSpikes !== 1 ? "" : "s"} more often than expected`
      : `${nSpikes} number${nSpikes !== 1 ? "s" : ""} appear${nSpikes !== 1 ? "" : "s"} more often than expected`;

  // ── Per-unit forest (Surface 1, S385): the verdict geometry. The unit is a
  //    single value — an integer (pass 1) or a fractional-digit substring
  //    (pass 2) — sitting at its observed count against the leave-one-out
  //    ±halfW neighbour mean, which is the Poisson λ the test read it against.
  //    The ±halfW neighbourhood is the smoothing window that COMPUTES that
  //    reference, not the unit, and there is no row or position axis: the data
  //    axis is the value axis. So the honest primitive is a forest on the value
  //    axis, not a spatial strip (S290-PER-UNIT-OBJECT-AUDIT §9 and finding 2,
  //    read from source; TIER-A-CI-DRAW-SPEC §2.2's "VFS is windowed → strip"
  //    is superseded by that audit, which §2.2 itself defers to).
  //
  //    The cleared background is the point of the surface, and it comes from
  //    `allTested` — the full BH family the engine retained at S288 precisely
  //    so a per-unit display would have it. `details` holds only the spike
  //    subset, so a forest built from `details` would plot marks with nothing
  //    to read them against.
  //
  //    MARKING. `flagged` reads `droveVerdict`, the per-unit boolean the engine
  //    writes at its own flag-decision site, and NOT a threshold comparison
  //    re-derived here. Re-deriving one would land wrong in both directions:
  //    a pass-2 tail suppressed by the near-dup keep-gate clears `adjP <
  //    ALPHA.NOTE` yet did not promote the card, and the gate cannot be
  //    reconstructed from the tail's adjP alone (the engine says so at the site
  //    where it sets the field). A mark that agreed with the verdict would be
  //    agreeing by coincidence.
  //
  //    ADJ-P ACROSS TWO FAMILIES. Where a depth-admitted deep bucket exists
  //    (S312) `allTested` is the union of two SEPARATELY corrected BH families,
  //    so the adjusted p-values it carries are not on one scale. That is inert
  //    here: the axis plots counts, and the mark reads `droveVerdict`, so no
  //    rendered quantity compares adj-p across the two.
  //
  //    NO `!isAgg` GATE, deliberately. The S283 suppression exists for tests
  //    that route `aggregatePerGroup` on column-grouped data, where the verdict
  //    is combined across conditions and no per-unit can clear. VFS is
  //    dispatched on the single matrix (`engine.js`, the `tests` table — not
  //    via `runPair`), so it never takes that path; `groupsAssessed` is
  //    undefined on every fixture in the battery. Were it ever routed there,
  //    the aggregated result is a fresh object that carries no `allTested`, so
  //    the mount below falls away on its own — the gate would be dead code that
  //    reads as a live constraint.
  //
  //    Selection and ordering run on the engine's own entries, before the unit
  //    tuple is built, so the tuple carries nothing but the contract's fields.
  //    Every `filter` below returns a fresh array, so `result.allTested` is
  //    never sorted in place.
  const forestPool = (result.allTested || [])
    .filter(t => Number.isFinite(t.obs) && Number.isFinite(t.smoothed));
  // SELECTION takes every flagged entry plus the cleared entries nearest
  // significance, because those are the background a reader compares the marks
  // against. ORDERING is by value, not by adj-p: this is a forest, where the x
  // axis carries the effect and row position must assert nothing. A p-ranked
  // row order is the strip register (§2.3/§2.4) and would invite an effect
  // reading the ranking does not support. Mixed-pass families sort full-value
  // entries ahead of digit-substring ones — two value spaces, not one ramp.
  const forestFlagged = forestPool.filter(t => t.droveVerdict === true);
  const forestCleared = forestPool.filter(t => t.droveVerdict !== true)
    .sort((a, b) => (a.adjP ?? 1) - (b.adjP ?? 1))
    .slice(0, Math.max(0, FOREST_MAX_UNITS - forestFlagged.length));
  const forestUnits = [...forestFlagged, ...forestCleared]
    .sort((a, b) => a.pass === b.pass
      ? a.value - b.value
      : (a.pass === "full" ? -1 : 1))
    .map(t => ({
      unitLabel: t.pass === "digit" ? `.${t.valueStr}` : String(t.value),
      estimate: t.obs,
      reference: t.smoothed,
      referenceMode: "stored",
      adjP: t.adjP,
      flagged: t.droveVerdict === true,
      // No `span`: a value is not a located window — VFS has no row axis.
    }));
  const forestTruncated = forestUnits.length < forestPool.length;

  // The scan pass (digit substring vs full value) reads the same on every row
  // of a given fixture, so it carries no per-row information. It is lifted to a
  // heading note above the table (read from drivingPass) rather than spent as a
  // column, which frees the width for the table to fit the card body.
  const passNote = result.drivingPass === "digit"
    ? "Matches on digit substrings"
    : "Matches on full values";

  // Column order: Value · Rows · Observed · Expected · Ratio · Adj P
  // Leading text cols (identifier): Value, Rows → identifierColumns=2.
  // Trailing numeric cols (mono): Observed, Expected, Ratio, Adj P.
  // Per-row cell count is duplicative of Observed by construction (full-value:
  // occurrences == flagged cells; digit-substring: substring matches ==
  // flagged cells), so no separate "Cells" column. Aggregate cell spread
  // still surfaces in the footer's "across N cells" segment.
  // Width hints sum to 555px (down from 665) so the table fits the card body
  // without horizontal scroll. EvidenceTable wrapper's overflow:auto handles
  // narrow viewports.
  return (
    <MiniCardLayout result={result}
      footer={footerText}
      lookFor={`Check whether the over-used values are round numbers or sit on adjacent numpad keys. For a recurring fractional tail, verify whether the column is ${VFS_NEARDUP_GENERATORS} — any can reproduce a shared tail. Cross-reference Last-digit pattern — if both flag, the case for manual entry is stronger. Check whether the over-used values cluster in particular rows or conditions, or run throughout.`}
      implications={`A value that appears far more often than its neighbours can reflect a natural mode in the data, such as a detection limit many samples reach. It can also indicate values entered by hand: spikes at adjacent numpad keys point to manual entry. A fractional tail shared across rows is a near-duplicate candidate, not a confirmed copy — verify whether the column is ${VFS_NEARDUP_GENERATORS}.`}>

      {/* Banner ahead of the surfaces, the placement Mahalanobis, Rank
          Correlation and IRC already use for a caution callout. */}
      {details.length > 0 && result.keyboardPattern && (
        <CardBanner type="caution">
          <strong>Adjacent-key pattern detected</strong> — spike values include numpad diagonal entries (12, 23, 34, 45…). Consistent with keyboard entry rather than instrument output.
        </CardBanner>
      )}

      {/* Surface 1: per-unit forest — each tested value's observed count against
          its own neighbour-average expectation, spikes marked. Leads the card;
          the footer fragment (LEAD_HEAD in MiniCardLayout) heads it, so no
          heading here. Renders on a cleared card too: an all-blue forest is the
          "nothing to see here" reading the channel-4 data model is built on,
          and the cleared values are the same evidence the flag rests on not
          having found.
          NO multiplicityNote. §2.1's carve-out omits the note wherever the
          plotted rows are not the correction family, so that a reader who
          counts the rows cannot find a different number underneath them. The
          forest plots at most twenty of a family that reaches 198, so the note
          would contradict the visible rows on nearly every fixture; the caption
          below states the subset and its denominator instead, and the family
          size is already in the test's own description text. */}
      {forestUnits.length > 0 && (<>
        <PlotLayout fitContent>
          <ForestPlot units={forestUnits} effectAxisLabel="Occurrences observed" />
        </PlotLayout>
        <ChartLegend items={forestLegendItems("Expected (neighbouring values)")} />
        {/* The subset is stated, never silent: a reader must not take twenty
            rows for the whole tested family. */}
        <div style={{...SUB_HEAD, marginTop: BLOCK_GAP_TIGHT, marginBottom: 0, fontWeight: FW.NORM}}>
          {forestTruncated
            ? `Showing the ${forestUnits.length} values closest to significance, of ${forestPool.length} tested. `
            : `All ${forestPool.length} tested values shown. `}
          A value is marked only when its own spike set the card's verdict — one that
          clears the significance cut but not the effect-size or near-duplicate gate
          reads as not flagged, however far it sits from its expected count.
        </div>
      </>)}

      {details.length > 0 && (<>
        {/* Surface 2: the spike evidence table, demoted below the forest but
            unchanged. S282: the scan-pass note carries the one fixture-constant
            bit the dropped Pass column used to hold. */}
        <div style={{...SUB_HEAD, fontWeight: FW.NORM, marginTop: forestUnits.length > 0 ? BLOCK_GAP : 0, marginBottom: BLOCK_GAP_TIGHT}}>{passNote}</div>
        <EvidenceTable
          columns={[
            {label:"Value",    width:"85px"},
            {label:"Rows",     width:"170px"},
            {label:"Observed", width:"75px"},
            {label:"Expected", width:"75px"},
            {label:"Ratio",    width:"65px"},
            {label:"Adj. p",    width:"85px"},
          ]}
          identifierColumns={2}
          rows={details.map(d => {
            const g = cellsByKey.get(spikeKeyFromDetail(d));
            const rowList = g ? compactRowList([...g.rows]) : "—";
            return [
              {value:d.value, style:{fontWeight:FW.BOLD}},
              rowList,
              d.observed,
              d.expected,
              d.ratio,
              fmtP(parseFloat(d.adjP)),
            ];
          })}
          footerText={details.length < result.nSpikes ? `Showing ${details.length} of ${result.nSpikes}.` : undefined}
        />
      </>)}

    </MiniCardLayout>
  );
}
