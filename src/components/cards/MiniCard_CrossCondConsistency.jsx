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

import { C, FW, FF, SIGNAL } from "../../constants/tokens.js";
import { fmtP } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";

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
  // Column width set. Pair sized for the 26-char max ("Treatment_A vs
  // Treatment_B" / "Inhibitor_A vs Inhibitor_B", confirmed rendering on DS01/02/
  // 16/17). Pair and Finding both carry a per-cell whiteSpace override (below) so
  // long pairs and skip-reason strings wrap within their width rather than clip;
  // Finding carries NO width — under tableLayout:fixed it absorbs the leftover.
  // Five declared widths sum to 535px.
  const columns = [
    { label: "Property",    align: "left", width: "160px" },
    { label: "Pair",        align: "left", width: "140px" },
    { label: "Observed",                   width: "75px"  },
    { label: "Null median",                width: "90px"  },
    { label: "Adj. p",                     width: "70px"  },
    { label: "Finding",     align: "left"                 },
  ];

  const INFORMATIONAL_COLOR = C.TEXT_3; // muted secondary text
  const buildRow = (d) => {
    const amberHere = isAmberRow(d);
    // Style per cell: amber text + Semibold on flagged rows (the shared MiniCard
    // flagged-row treatment — matches Autocorrelation / Blocked Mahalanobis /
    // Windowed Autocorrelation), muted colour on informational rows. Ran-but-
    // forensic-LOW rows use the default EvidenceTable styling (no override).
    let cellStyle;
    if (amberHere) cellStyle = { color: SIGNAL.AMBER.text, fontWeight: FW.SEMI };
    else if (d.ran && !d.forensic) cellStyle = { color: INFORMATIONAL_COLOR };
    const cell = (v) => cellStyle ? { value: v, style: cellStyle } : v;
    // Pair holds a "{condA} vs {condB}" label up to 26 chars ("Treatment_A vs
    // Treatment_B"); whiteSpace:"normal" lets it wrap within its 140px column
    // rather than overflow-clip under tableLayout:fixed. Preserves the row's
    // amber-bg / muted-colour styling.
    const cellPair = (v) => ({ value: v, style: { ...(cellStyle || {}), whiteSpace: "normal" } });
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
      cellPair(d.pair),
      cell(d.observed),
      cell(d.nullMedian),
      cell(d.ran && d.adjP != null ? fmtP(d.adjP) : "—"),
      cellFinding(finding),
    ];
  };

  // One table, amber-first. `ordered` is [...amber, ...forensicLow,
  // ...informational, ...skipped], so flagged rows sort to the top and stay in
  // view; the amber per-cell shade (buildRow) marks them. No separate flagged
  // table — the shade does what a second header chrome would have duplicated.
  const rows = ordered.map(buildRow);

  const identifierColumns = 2; // Property, Pair — sans-serif

  return (
    <MiniCardLayout result={result}
      footer={footer}
      lookFor={LOOK_FOR}
      implications={IMPLICATIONS}>

      {result.flag !== "N/A" && rows.length > 0 && (
        // maxHeight 300px ≈ 12 single-line rows: the common 7-row tables (incl.
        // both flagged fixtures) render in full, while the three-condition
        // fixtures (21 rows, no amber) cap into a scroll rather than a wall.
        // Amber sorts to the top, so flagged rows stay above any scroll.
        <EvidenceTable
          columns={columns}
          rows={rows}
          identifierColumns={identifierColumns}
          maxHeight={300}
          footerText={amber.length > 0
            ? "Highlighted rows are the condition pairs flagged as too alike; lowest adjusted p first."
            : undefined}
        />
      )}

    </MiniCardLayout>
  );
}
