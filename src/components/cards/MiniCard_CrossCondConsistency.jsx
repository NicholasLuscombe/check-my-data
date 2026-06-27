/* ── MiniCard: Cross-Condition Consistency (Track D, Stage 1) ──
   @see docs/shared/TRACK-D-SPEC.md §"Evidence display"

   One card for the whole framework. Stage 1 registers P1 Trimmed span,
   P2 Dispersion (MAD), P3 CDF/KS — all with `forensicDirections =
   ["similar"]`.

   Amber-highlight invariant (must be preserved across any edits to this
   file or the driver):

       row.amber  ⇔  adj-p < ALPHA.NOTE
                  ∧  effect-size gate passed
                  ∧  not degenerate
                  ∧  direction ∈ property.forensicDirections

   The amber bar sits at ALPHA.NOTE (MODERATE) because BH-FDR adj-p at
   B=999 permutations cannot reach ALPHA.FLAG (HIGH) — see METHODOLOGY
   §1.9 ¶8. The card's `nAmber` footer count and the legend threshold
   both key on this band.

   Per-direction effect-size gate (S99)
   ------------------------------------
   The effect-size gate is direction-aware (see crossConditionProperties.js
   header). At min(N_a, N_b) ≥ 500:
     - direction = "different": absolute floor `d_obs ≥ differentThreshold`
     - direction = "similar":   relative ceiling
                                `d_obs / median(d_perm) ≤ similarRatio`
   Below N = 500 the gate always passes. The UI does not need to know which
   branch fired — `d.gatePassed` carries the result, and
   "Observed" / "Null median" columns let the investigator read the ratio.

   Non-forensic-direction pairs are shown in the evidence table for
   transparency but never amber-highlighted. Such rows render in a muted
   colour so the user can see the statistical signal exists without
   mistaking it for a forensic finding. Skipped / degenerate rows sink to
   the bottom. */

import { C, FS, FW, FF, SIGNAL } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { SUB_HEAD, LEAD_HEAD } from "../shared/styles.js";

// CHAT-COPY placeholders — Chat authors both heading strings. The split mounts
// the structure; the words are filled in editorially.
const FLAGGED_HEADING = "[ CHAT-COPY: flagged-table heading ]";
const TAIL_HEADING    = "[ CHAT-COPY: tail-table sub-heading ]";

const LOOK_FOR =
  "Note which pair of conditions flagged and on which property. Inspect those conditions in the raw data files and check whether the similarity has a recorded reason — shared controls, a common reference. Cross-reference Duplicate values and Offset copies: conditions that also share rows or a constant offset point to one built from another. Cross-reference Profile rank agreement and Baseline balance: these three read condition similarity from different angles, and a finding that holds across them is far harder to explain as biology than any one alone.";

const IMPLICATIONS =
  "Conditions that are more alike than independent measurement allows can arise when they genuinely share structure — the same control samples, a shared baseline. They can also indicate one condition copied from another, or several conditions generated from one template, leaving them matched on properties that real treatments would separate.";

export function MiniCard_CrossCondConsistency({ result }) {
  const details = result.details || [];

  // ── Evidence-table row ordering ─────────────────────────────────
  //   1) Amber rows (forensic-direction + flag-level + gate-passed) by adj-p asc
  //   2) Forensic-direction LOW rows by adj-p asc
  //   3) Non-forensic-direction rows ("informational") by adj-p asc
  //   4) Skipped / degenerate rows last
  const running = details.filter(d => d.ran);
  const skipped = details.filter(d => !d.ran);
  const isAmberRow = (d) =>
    d.ran && d.forensic && d.gatePassed && !d.degenerate
    && (d.unitFlag === "HIGH" || d.unitFlag === "MODERATE");
  const byAdjP = (a, b) => (a.adjP ?? 1) - (b.adjP ?? 1);
  const amber       = running.filter(d => isAmberRow(d)).sort(byAdjP);
  const forensicLow = running.filter(d => d.forensic && !isAmberRow(d)).sort(byAdjP);
  const informational = running.filter(d => !d.forensic).sort(byAdjP);
  const ordered = [...amber, ...forensicLow, ...informational, ...skipped];
  // nAmber: count surfaced in the footer. Derived from the same predicate
  // that tints rows amber, so footer / table / verdict agree. Engine's
  // result.nFlagged keys on ALPHA.FLAG (HIGH-only) and reads 0 here because
  // BH-FDR at B=999 cannot reach that band — use card-side count instead.
  const nAmber = amber.length;

  // ── Footer ─────────────────────────────────────────────────────
  const nRan = result.nUnitsRan || 0;
  const topDir = result.top?.direction;
  const footer = (result.flag !== "LOW" && result.flag !== "N/A")
    ? (topDir === "different"
        ? `Two conditions diverge across ${nAmber} of ${nRan} measures`
        : `Two conditions alike across ${nAmber} of ${nRan} measures`)
    : "Conditions differ normally";

  // ── Table shape ─────────────────────────────────────────────────
  // Flag column retired (S175): for forensic rows the amber tint encodes
  // the flag tier, and the muted-text styling on informational rows
  // distinguishes them from forensic-LOW. Dropping the column also
  // resolves the right-edge clip on narrow viewports.
  // Shared width set — both stacked tables declare the SAME five widths so their
  // columns register vertically. Pair sized for the 26-char max ("Treatment_A vs
  // Treatment_B" / "Inhibitor_A vs Inhibitor_B", confirmed rendering on DS01/02/
  // 16/17). Finding carries NO width — under tableLayout:fixed it absorbs the
  // leftover and wraps long skip-reason strings (per-cell whiteSpace override
  // below). Five declared widths sum to 640px.
  const columns = [
    { label: "Property",    align: "left", width: "180px" },
    { label: "Pair",        align: "left", width: "195px" },
    { label: "Observed",                   width: "85px"  },
    { label: "Null median",                width: "105px" },
    { label: "Adj. p",                     width: "75px"  },
    { label: "Finding",     align: "left"                 },
  ];

  const AMBER_BG       = SIGNAL.AMBER.bg;
  const INFORMATIONAL_COLOR = C.TEXT_3; // muted secondary text
  const buildRow = (d) => {
    const amberHere = isAmberRow(d);
    // Style per cell is either amber-bg (amber row) or muted-color (informational row).
    // Ran-but-ran-forensic-LOW rows use the default EvidenceTable styling (no override).
    let cellStyle;
    if (amberHere) cellStyle = { background: AMBER_BG };
    else if (d.ran && !d.forensic) cellStyle = { color: INFORMATIONAL_COLOR };
    const cell = (v) => cellStyle ? { value: v, style: cellStyle } : v;
    // Finding is a non-contiguous text column (past identifierColumns); force
    // FF.UI so it reads sans-serif like every other card's Finding word, while
    // preserving the row's amber-bg / muted-colour styling. whiteSpace:"normal"
    // overrides EvidenceTable's default nowrap so long skip-reason strings wrap
    // within Finding's leftover share under tableLayout:fixed (rather than
    // overflowing and clipping). The five fixed columns are unaffected.
    const cellFinding = (v) => ({ value: v, style: { ...(cellStyle || {}), fontFamily: FF.UI, whiteSpace: "normal" } });

    // S219 (per-unit principle, INVESTIGATION-DISPLAY-SPEC:525): the Finding word
    // follows the corrected significance the verdict uses (isAmberRow — the
    // BH-adjusted forensic flag), not the raw similar/different direction tag.
    // Direction supplies the descriptor only once the corrected gate has flagged
    // the pair; ran-but-unflagged pairs read "As expected". The raw direction
    // stays legible in the Observed / Null median columns.
    let finding;
    if (!d.ran) {
      finding = d.reason || "—";
    } else if (!amberHere) {
      finding = "As expected";
    } else {
      const word = d.direction === "similar" ? "Too similar" : "Too different";
      finding = d.fallback ? `${word} (fallback)` : word;
    }

    return [
      cell(d.property),
      cell(d.pair),
      cell(d.observed),
      cell(d.nullMedian),
      cell(d.ran && d.adjP != null ? fmtP(d.adjP) : "—"),
      cellFinding(finding),
    ];
  };

  // ── Partition into two stacked tables ───────────────────────────
  // Same predicate that drives the amber tint (isAmberRow) decides membership,
  // so the split matches the existing highlight exactly. Flagged rows stay in
  // view (un-capped); the tail (forensic-LOW + informational + skipped) scrolls.
  const flaggedDetails = ordered.filter(d => isAmberRow(d));
  const tailDetails    = ordered.filter(d => !isAmberRow(d));
  const flaggedRows = flaggedDetails.map(buildRow);
  const tailRows    = tailDetails.map(buildRow);

  const identifierColumns = 2; // Property, Pair — sans-serif

  const legendStyle = {
    fontSize: FS.sm,
    fontFamily: FF.UI,
    color: C.TEXT_2,
    marginTop: "4px",
    lineHeight: "1.5",
  };

  return (
    <MiniCardLayout result={result}
      footer={footer}
      lookFor={LOOK_FOR}
      implications={IMPLICATIONS}>

      {result.flag !== "N/A" && (flaggedRows.length > 0 || tailRows.length > 0) && (
        <>
          {/* Flagged table — un-capped (never scrolls), so the point of the card
              stays in view. Lead-tier heading. Collapse guard: when no rows are
              flagged this whole block drops and only the tail table renders,
              exactly as the single-table card did before the split. */}
          {flaggedRows.length > 0 && (
            <>
              {/* CHAT-COPY: flagged-table heading (lead-tier, names the flagged set) */}
              <div style={{ ...LEAD_HEAD, marginBottom: "8px" }}>{FLAGGED_HEADING}</div>
              <EvidenceTable
                columns={columns}
                rows={flaggedRows}
                identifierColumns={identifierColumns}
                maxHeight={0}
              />
            </>
          )}
          {/* Tail table — capped + scrolls (context / as-expected / skipped). The
              demoted sub-heading appears only when the flagged table is also
              present; in the collapse case the tail renders headingless. */}
          {tailRows.length > 0 && (
            <>
              {flaggedRows.length > 0 && (
                /* CHAT-COPY: tail-table sub-heading (demoted, sentence case) */
                <div style={{ ...SUB_HEAD, marginTop: "12px" }}>{TAIL_HEADING}</div>
              )}
              <EvidenceTable
                columns={columns}
                rows={tailRows}
                identifierColumns={identifierColumns}
                maxHeight={260}
              />
            </>
          )}
          <div style={legendStyle}>
            Amber rows flagged: two conditions more alike than expected. Muted rows compare conditions that real treatments separate, so they're never flagged.
          </div>
        </>
      )}

    </MiniCardLayout>
  );
}
