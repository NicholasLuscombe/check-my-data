/* ── MiniCard: Cross-Condition Consistency (Track D, Stage 1) ──
   @see docs/shared/TRACK-D-SPEC.md §"Evidence display"

   One card for the whole framework. Stage 1 registers P1 Trimmed span,
   P2 Dispersion (MAD), P3 CDF/KS — all with `forensicDirections =
   ["similar"]`.

   Amber-highlight invariant (must be preserved across any edits to this
   file or the driver):

       row.amber  ⇔  adj-p < ALPHA.FLAG
                  ∧  effect-size gate passed
                  ∧  not degenerate
                  ∧  direction ∈ property.forensicDirections

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
   transparency but never amber-highlighted. Their Flag column reads
   "informational" in a muted colour so the user can see the statistical
   signal exists without mistaking it for a forensic finding. LOW rows
   (forensic or not) show as LOW. Skipped / degenerate rows sink to the
   bottom. */

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

  // ── Footer ─────────────────────────────────────────────────────
  const primaryP = result.primaryP;
  const pStr = primaryP != null ? fmtPBadge(primaryP) : "p —";
  const nRan = result.nUnitsRan || 0;
  const footerPieces = [
    `${result.nConditions || "?"} conditions · ${result.nPairs || 0} pair${result.nPairs === 1 ? "" : "s"} · ${result.nProperties || 0} properties`,
    `${nRan} unit${nRan === 1 ? "" : "s"} ran · ${result.nFlagged || 0} flagged`,
    `B=${result.B || "?"}`,
    pStr,
  ];
  const footer = footerPieces.join(" · ");

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

  // ── Table shape ─────────────────────────────────────────────────
  const columns = [
    { label: "Property", align: "left" },
    { label: "Pair",     align: "left" },
    { label: "Observed" },
    { label: "Null median" },
    { label: "Direction" },
    { label: "adj-p" },
    { label: "Flag" },
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

    // Flag label derivation
    let flagLabel;
    if (!d.ran) {
      flagLabel = d.unitFlag; // "N/A" or "degenerate"
    } else if (!d.forensic) {
      flagLabel = "informational";
    } else if (!d.gatePassed && (d.unitFlag === "HIGH" || d.unitFlag === "MODERATE")) {
      // Technically unreachable: unit-flag derivation in the driver already
      // demotes gate-failed units to LOW. Kept for defensive clarity.
      flagLabel = `${d.unitFlag} (below effect gate)`;
    } else {
      flagLabel = d.unitFlag; // HIGH / MODERATE / LOW
    }

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
      cell(flagLabel),
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
            Amber-tinted rows meet the forensic criterion: adj-p &lt; {fmtP(ALPHA.FLAG)} AND
            the effect-size gate passes AND the direction is forensically actionable for
            that property (for Stage 1 properties, only "too similar" is actionable —
            honest conditions legitimately differ on span / MAD / CDF). Rows in muted
            text mark "informational" pairs: non-forensic-direction (typically "too
            different"), shown for transparency but not contributing to the flag.
            "Null median" is the median of the permutation distribution; "Direction"
            indicates which tail the observed distance sits in (similar = below median,
            different = above).
          </div>
        </>
      )}

    </MiniCardLayout>
  );
}
