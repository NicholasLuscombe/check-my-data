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
import { fmtP, fmtPBadge, ALPHA } from "../../constants/thresholds.js";
import { MiniCardLayout } from "../shared/CardLayout.jsx";
import { EvidenceTable } from "../shared/EvidenceTable.jsx";
import { SUB_HEAD } from "../shared/styles.js";

const LOOK_FOR =
  "A 'too similar' flag between conditions that should produce different " +
  "biological responses suggests one condition's values may have been " +
  "derived from the other — the shape of their distributions is closer than " +
  "random re-assignment between pooled values would produce. Cross-reference " +
  "flagged pairs with Cross-Condition Rank Correlation and Baseline Balance " +
  "— convergent signals across Dim IV tests harden the finding. 'Too " +
  "different' pairs are shown as informational only: on location and scale " +
  "properties, real treatment effects produce large inter-condition " +
  "differences by design.";

const IMPLICATIONS =
  "Conditions that differ in biology will produce large inter-condition " +
  "span / MAD / CDF differences — that is the expected fingerprint of a " +
  "treatment effect on location or scale, not evidence of fabrication. For " +
  "Stage 1 properties this card flags only the reverse case: pairs that are " +
  "suspiciously close to each other on a property that honest conditions " +
  "generally distinguish. Interpret alongside experimental design and any " +
  "convergent signals from other cross-condition comparisons tests.";

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
  const primaryP = result.primaryP;
  const pStr = primaryP != null ? fmtPBadge(primaryP) : "p —";
  // S197 cleared-footer: with no amber-flagged unit on a cleared result, the
  // min-adjP describes a forensic-direction-neutralised unit and carries no
  // verdict meaning — the "0 flagged" count IS the verdict. Drop the trailing
  // p-badge in that state; flagged tiers keep it.
  const showP = !(nAmber === 0 && (result.flag === "LOW" || result.flag === "N/A"));
  const nRan = result.nUnitsRan || 0;
  // S168: driver clause from result.top — already computed by the producer
  // (crossConditionConsistency.js topInfo). similar → too similar;
  // different → diverge. Gate on flag and top presence.
  const top = result.top;
  const driverClause = (result.flag !== "LOW" && result.flag !== "N/A" && top)
    ? (top.direction === "similar"
        ? `conditions too similar on ${top.property}`
        : `conditions diverge on ${top.property}`)
    : null;
  const footerPieces = [
    `${result.nConditions || "?"} conditions · ${result.nPairs || 0} pair${result.nPairs === 1 ? "" : "s"} · ${result.nProperties || 0} properties`,
    `${nRan} unit${nRan === 1 ? "" : "s"} ran · ${nAmber} flagged`,
    ...(driverClause ? [driverClause] : []),
    `B=${result.B || "?"}`,
    ...(showP ? [pStr] : []),
  ];
  const footer = footerPieces.join(" · ");

  // ── Table shape ─────────────────────────────────────────────────
  // Flag column retired (S175): for forensic rows the amber tint encodes
  // the flag tier, and the muted-text styling on informational rows
  // distinguishes them from forensic-LOW. Dropping the column also
  // resolves the right-edge clip on narrow viewports.
  const columns = [
    { label: "Property", align: "left" },
    { label: "Pair",     align: "left" },
    { label: "Observed" },
    { label: "Null median" },
    { label: "Direction" },
    { label: "adj-p" },
  ];

  const AMBER_BG       = SIGNAL.AMBER.bg;
  const INFORMATIONAL_COLOR = C.TEXT_3; // muted secondary text
  const rows = ordered.map(d => {
    const amberHere = isAmberRow(d);
    // Style per cell is either amber-bg (amber row) or muted-color (informational row).
    // Ran-but-ran-forensic-LOW rows use the default EvidenceTable styling (no override).
    let cellStyle;
    if (amberHere) cellStyle = { background: AMBER_BG };
    else if (d.ran && !d.forensic) cellStyle = { color: INFORMATIONAL_COLOR };
    const cell = (v) => cellStyle ? { value: v, style: cellStyle } : v;

    const directionLabel = d.ran
      ? (d.fallback ? `${d.direction} (fallback)` : d.direction)
      : d.reason || "—";

    return [
      cell(d.property),
      cell(d.pair),
      cell(d.observed),
      cell(d.nullMedian),
      cell(directionLabel),
      cell(d.ran && d.adjP != null ? fmtP(d.adjP) : "—"),
    ];
  });

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

      {result.flag !== "N/A" && rows.length > 0 && (
        <>
          <div style={SUB_HEAD}>All property × pair comparisons</div>
          <EvidenceTable
            columns={columns}
            rows={rows}
            identifierColumns={identifierColumns}
            maxHeight={260}
          />
          <div style={legendStyle}>
            Amber-tinted rows meet the forensic criterion: adj-p &lt; {fmtP(ALPHA.NOTE)} AND
            the effect-size gate passes AND the direction is forensically actionable for
            that property (for Stage 1 properties, only "too similar" is actionable —
            honest conditions legitimately differ on span / MAD / CDF). Rows in muted
            text mark "informational" pairs: non-forensic-direction (typically "too
            different"), shown for transparency but not contributing to the flag.
            "Null median" is the median of the permutation distribution; "Direction"
            indicates which tail the observed distance sits in (similar = below median,
            different = above). HIGH (adj-p &lt; {fmtP(ALPHA.FLAG)}) is unreachable for
            this framework at B={result.B || "?"} permutations — see METHODOLOGY §1.9 ¶8
            (permutation-arithmetic limitation), so MODERATE is the strongest tier this
            test can report.
          </div>
        </>
      )}

    </MiniCardLayout>
  );
}
