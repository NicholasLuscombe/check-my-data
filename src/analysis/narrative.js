import { SEV_VERDICT } from "../constants/tokens.js";
import { fmtP } from "../constants/thresholds.js";
import { MECHANISMS, MECHANISM_ORDER } from "../constants/mechanisms.js";
import { buildMechanismGroups } from "./localization.js";

// Keys MUST match `MECHANISM_ORDER` in `mechanisms.js`:
//   copied · digits · shapes · replicate · group
// Prior key set {copied, digits, perfect, noise, uneven} was renamed upstream;
// `perfect` → `group`, `noise` → `replicate` carried their prior prose cleanly
// (same semantic meaning, renamed category). `shapes` (Entropy-only) prose
// landed in S105; consumers still guard on missing `.short` defensively.
export const MECHANISM_FINDINGS = {
  copied: {
    short: "Same numbers repeat where they shouldn't",
    detail: "Multiple tests detect patterns consistent with copying — identical rows, constant offsets between replicates, correlated residual patterns across groups, or excess inter-replicate correlation suggesting partial data sharing.",
    lookFor: "Open the highlighted rows in a spreadsheet. Look for rows that are identical to each other, or where the difference between replicate columns is suspiciously constant. Try subtracting one column from another — if you see the same difference repeating across consecutive rows, that's worth flagging.",
    innocent: "Some instruments report a fixed value at detection limits. Batch corrections applied uniformly can also produce constant offsets. In highly constrained biological systems, genuinely low variation may look like copying."
  },
  digits: {
    short: "Number patterns don't match instrument recording",
    detail: "The distribution of digits, decimal places, or specific integer values is inconsistent with machine-generated data. Instruments produce characteristic digit patterns that manually entered data deviates from.",
    lookFor: "Filter the spreadsheet to the highlighted values. Look for numbers that seem too round or too neat, repeated favourite values, or gaps in decimal precision (e.g. some values to 3 decimal places, others to 1). If specific integers are over-represented, check whether they fall in keyboard-adjacent patterns (e.g. 67, 78, 89).",
    innocent: "Some instruments truncate or round their output. Legitimate re-entry of data from paper records or handwritten lab notebooks will also produce these patterns. Coded categorical values mixed in with measurements can trigger this too."
  },
  // Chat-authored prose landed S105. Covers Shannon Entropy (v1.0) and generalises
  // to Column GoF + Modality when Track E lands.
  shapes: {
    short: "Value distributions within columns don't match real measurements",
    detail: "The distribution of values within a column deviates from what an instrument of this kind usually produces — either too few distinct values (suggesting coarsened precision or value clustering) or too many distinct values (suggesting precision beyond what the instrument natively records).",
    lookFor: "Sort the highlighted column and scan for repeated runs of the same few values — a column that should be continuous but shows only a handful of distinct values suggests precision loss or clustering. Compare decimal-place consistency across columns: if one column has noticeably more decimal places than others of the same measurement type, check whether the extra precision actually matches the instrument's readout.",
    innocent: "Export, averaging, or manual transcription can collapse distinct values without any intent to deceive. Instruments with digital displays truncate at fixed precision. Computational derivations (ratios, log transforms, normalisations) can also inflate the distinct-value count beyond what the raw instrument provided."
  },
  replicate: {
    short: "Random variation doesn't behave like real measurements",
    detail: "The statistical properties of replicate-to-replicate variation are inconsistent with what real instruments produce — noise shape, autocorrelation, run patterns, variance scaling, or value entropy deviate from expected distributions.",
    lookFor: "These patterns are not visible by scanning individual cells — the values look plausible one at a time, but their collective behaviour is unusual. The recommended next step is to ask the authors for the original instrument output files and lab notebook entries, then compare those against the submitted dataset.",
    innocent: "If the wrong assay type was selected above, re-run with the correct setting. Data that was pre-processed, normalised, or averaged before upload can also trigger these flags, as can batch effects between experimental runs."
  },
  group: {
    short: "Results are more consistent than experiments produce",
    detail: "Individual data points or treatment effects are statistically implausible given overall dataset variability — rows fit their group too precisely, or conditions are more balanced than chance allows.",
    lookFor: "Each highlighted row looks plausible on its own, but together they form an unlikely pattern. Check whether the flagged rows come from the study's key experimental comparison. Compare treatment effects in flagged versus unflagged rows within the same condition — if the flagged rows consistently show larger effects, that's worth investigating.",
    innocent: "Genuine biological outliers do occur, as do technical outliers from sample handling errors. In highly variable biological systems, large effects may be expected. Consider whether the flagged rows come from a known high-variability condition."
  }
};

// `sub` carries the action one-liner shown under the headline + severity-dot row.
// Mode-agnostic across QC / Review / Forensics: the headline differentiates voice
// per mode (via SEVERITY_TEXT in guidance.js); the action one-liner does not.
export const VERDICT_TEXT = {
  0: { headline: "All checks passed", sub: "No flags raised — proceed.", color: SEV_VERDICT[0].color, bg: SEV_VERDICT[0].bg, border: SEV_VERDICT[0].border },
  1: { headline: "Minor flags detected", sub: "Worth a closer look.", color: SEV_VERDICT[1].color, bg: SEV_VERDICT[1].bg, border: SEV_VERDICT[1].border },
  2: { headline: "Anomaly detected", sub: "Review carefully before relying on this data.", color: SEV_VERDICT[2].color, bg: SEV_VERDICT[2].bg, border: SEV_VERDICT[2].border },
  3: { headline: "Multiple anomalies detected", sub: "Investigate before relying on this data.", color: SEV_VERDICT[3].color, bg: SEV_VERDICT[3].bg, border: SEV_VERDICT[3].border },
};

export function generateNarrativeFallback(results) {
  const groups = buildMechanismGroups(results);
  const parts = [];
  for (const mechKey of MECHANISM_ORDER) {
    const g = groups[mechKey];
    const flagged = g.tests.filter(r => r.flag === "HIGH" || r.flag === "MODERATE");
    if (!flagged.length) continue;
    const finding = MECHANISM_FINDINGS[mechKey];
    const mech = MECHANISMS[mechKey];
    if (!finding || !mech) continue; // prose not yet authored for this category
    parts.push(mech.label + ": " + finding.short + ".");
  }
  if (!parts.length) return VERDICT_TEXT[0].sub;
  return parts.join(" ");
}

export function buildConsultationPrompt(results, importConfig, nRows, nCols, severity) {
  const lines = [];
  lines.push("I'm investigating a dataset flagged by Check My Data, a statistical forensics screening tool. Help me interpret the results and decide next steps.");
  lines.push("");
  lines.push(`Dataset: ${importConfig.fileName || "uploaded"} | ${nRows} rows × ${nCols} cols | Assay: ${importConfig.assay || "general"} | Data type: ${importConfig.dataType || "continuous"} | Severity: ${severity}`);
  lines.push("");
  lines.push("FLAGGED TESTS:");
  for (const r of results.filter(r => r.flag === "HIGH" || r.flag === "MODERATE")) {
    const flagLabel = r.flag === "HIGH" ? "FLAGGED" : r.flag === "MODERATE" ? "NOTED" : r.flag;
    let d = `  ${flagLabel}: ${r.name}`;
    if (r.primaryP != null) d += ` (P=${fmtP(r.primaryP)})`;
    if (r.interpretation) d += ` — ${r.interpretation}`;
    lines.push(d);
  }
  lines.push("");
  lines.push("PASSING: " + results.filter(r => r.flag === "LOW").map(r => r.name).join(", "));
  lines.push("");
  lines.push("Questions: (1) Most likely explanations, both innocent and concerning? (2) Which flags are most concerning? (3) What evidence should I request from data authors? (4) What would clear them vs confirm the concern? (5) Additional analyses to run?");
  return lines.join("\n");
}
