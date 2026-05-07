/* ── Mode-specific guidance constants for three-mode presentation ── */
/* See INVESTIGATION-DISPLAY-SPEC.md v3.0 §Three-Mode Presentation. */

// ── Mode definitions ─────────────────────────────────────────────────

export const MODES = {
  qc:     { key: "qc",     label: "Check my data",    short: "QC",     audience: "Researchers" },
  review: { key: "review", label: "Peer review",        short: "Review", audience: "Editors / integrity officers" },
  full:   { key: "full",   label: "Forensics",           short: "Expert", audience: "Forensic statisticians" },
};

export const MODE_ORDER = ["qc", "review", "full"];

// ── Severity headlines per mode ──────────────────────────────────────

export const SEVERITY_TEXT = {
  qc: {
    0: { headline: "All checks passed", action: "", sub: "" },
    1: { headline: "A few minor patterns were noted", action: "Worth a quick check", sub: "" },
    2: { headline: "Some patterns in your data need attention", action: "Check your data before proceeding", sub: "" },
    3: { headline: "Several unusual patterns detected", action: "Investigate your data before proceeding", sub: "" },
  },
  review: {
    0: { headline: "All checks passed",                                        sub: "No unusual patterns found across any tests." },
    1: { headline: "Minor flags detected \u2014 likely false positives",       sub: "A small number of tests flagged, consistent with expected false positive rates." },
    2: { headline: "Anomalies detected \u2014 warrants further review",        sub: "Multiple tests detected unusual patterns. Further investigation recommended." },
    3: { headline: "Multiple anomalies detected \u2014 investigation recommended", sub: "Tests flagged across multiple categories. This dataset needs to be investigated." },
  },
  // Detailed analysis uses existing VERDICT_TEXT from narrative.js — not duplicated here
};

// ── Category guidance per mode ───────────────────────────────────────

export const CATEGORY_GUIDANCE = {
  copied: {
    qc: {
      short: "Some values repeat unexpectedly",
      detail: "Check for sample swaps or plate mislabelling",
      lookFor: "Compare flagged rows \u2014 are values identical or offset by a constant?",
      innocent: "Instrument memory effects, legitimate biological similarity",
    },
    review: {
      short: "Values are repeated or offset by fixed amounts",
      detail: "Open highlighted rows in spreadsheet, look for identical rows or constant differences between columns",
      lookFor: "Sort by flagged columns and look for blocks of identical or near-identical values",
      innocent: "Instrument carry-over, biological replicates with genuinely low variance",
    },
  },
  digits: {
    qc: {
      short: "Number patterns look unusual",
      detail: "Check that values were exported directly from instrument software, not manually entered or transcribed",
      lookFor: "Look for too-round numbers, repeated trailing digits, or inconsistent decimal places",
      innocent: "Manual transcription from paper records, unit conversion, software rounding",
    },
    review: {
      short: "Digit patterns don't match instrument recording",
      detail: "Filter to highlighted values, look for too-round numbers, repeated favourites, gaps in decimal precision",
      lookFor: "Compare digit distribution to expected instrument output characteristics",
      innocent: "Manual transcription, unit conversion artifacts, mixed instrument firmware versions",
    },
  },
  uneven: {
    qc: {
      short: "One part of your data looks different",
      detail: "Check whether flagged rows correspond to a different experimental batch, plate, day, or operator",
      lookFor: "Compare variation within flagged section to 20\u201330 rows above and below",
      innocent: "Batch effects, reagent lot changes, instrument recalibration, temperature drift",
    },
    review: {
      short: "One section of the dataset has different statistical properties",
      detail: "Compare variation within flagged section to surrounding rows. Check experimental logs for batch boundaries.",
      lookFor: "Noise level, mean shifts, or variance changes at the flagged boundary",
      innocent: "Batch effects, reagent lot changes, plate edge effects",
    },
  },
  noise: {
    qc: {
      short: "Random variation looks unusual",
      detail: "The pattern of measurement noise doesn't match what instruments typically produce. This can indicate manual data entry or post-processing.",
      lookFor: "Cannot verify by scanning individual cells. Compare to a known-good dataset from the same instrument.",
      innocent: "Post-processing (normalisation, batch correction), mixed instruments, software export artifacts",
    },
    review: {
      short: "Noise structure inconsistent with instrument-recorded data",
      detail: "Cannot verify by scanning cells. Request original instrument output files and lab notebooks.",
      lookFor: "Ask whether data was exported directly from instrument software or processed/transcribed",
      innocent: "Post-processing pipeline artifacts, mixed instrument firmware, legitimate biological autocorrelation",
    },
  },
  perfect: {
    qc: {
      short: "Some results look too consistent",
      detail: "Your replicates or conditions match more closely than typical experiments produce. Check for accidental sample duplication.",
      lookFor: "Compare within-group variance to between-group variance in flagged rows",
      innocent: "Highly optimised protocol, very homogeneous samples, small effect sizes",
    },
    review: {
      short: "Results are more internally consistent than experiments typically produce",
      detail: "Check if flagged rows come from the study's key experimental comparison. Compare effects in flagged vs unflagged rows.",
      lookFor: "Excessive baseline balance, multivariate outlier rows, cross-condition correlation",
      innocent: "Highly controlled experiments, small biological variance, well-optimised protocols",
    },
  },
};

// ── Hotspot pattern descriptions ─────────────────────────────────────

export const HOTSPOT_PATTERNS = {
  sparse:    { label: "Localised hotspots",   description: "One or two rectangles, rest clear. The clean regions provide contrast." },
  saturated: { label: "Saturated pattern",    description: "Most of the grid is flagged. Wholesale fabrication or severe instrument issues." },
  scattered: { label: "Scattered flags",      description: "Isolated flagged cells, no connected regions. Probably noise / false positives." },
  clean:     { label: "Clean",                description: "No cells flagged by multiple tests." },
};

// ── QC hotspot narrative templates ───────────────────────────────────
// Keyed by dominant category; used in HotspotCard for plain-language framing.

export const QC_HOTSPOT_NARRATIVE = {
  copied:  "These replicates show a consistent offset or identical values. Check whether these samples were run on a different day or plate.",
  digits:  "Your digit distribution doesn't match typical instrument output. Check that values were exported directly from instrument software.",
  uneven:  "Measurement variability changes here. Check for a reagent change, new pipette tips, or temperature shift.",
  noise:   "The pattern of random variation doesn't match what instruments typically produce. This can indicate manual data entry or post-processing.",
  perfect: "These rows have unusually little variation. Check for pipetting errors or accidentally using the same sample.",
};

// ── QC no-hotspot messages by severity ───────────────────────────────

export const QC_NO_HOTSPOT = {
  0: "No overlapping issues found. Your data passed all checks.",
  1: "No overlapping issues found. The minor flags detected are likely false positives.",
  2: "No spatially overlapping issues found, but dataset-wide patterns were detected. See observations below.",
  3: "Flags are from dataset-wide tests rather than localised regions. See observations below.",
};
