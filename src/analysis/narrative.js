import { SEV_VERDICT } from "../constants/tokens.js";
import { fmtP } from "../constants/thresholds.js";

// `sub` carries the action one-liner shown under the headline + severity-dot row.
// Mode-agnostic across QC / Review / Forensics: the headline differentiates voice
// per mode (via SEVERITY_TEXT in guidance.js); the action one-liner does not.
// All four tiers carry both headline + sub (S133h FIX2) — sub is parallel
// noun-phrase + verb-phrase: head names the finding, sub names the action.
export const VERDICT_TEXT = {
  0: { headline: "All checks passed",              sub: "Proceed with dataset",                          color: SEV_VERDICT[0].color, bg: SEV_VERDICT[0].bg, border: SEV_VERDICT[0].border },
  1: { headline: "Minor anomalies detected",       sub: "Review dataset at your discretion",             color: SEV_VERDICT[1].color, bg: SEV_VERDICT[1].bg, border: SEV_VERDICT[1].border },
  2: { headline: "Anomalies detected",             sub: "Review dataset carefully before proceeding",    color: SEV_VERDICT[2].color, bg: SEV_VERDICT[2].bg, border: SEV_VERDICT[2].border },
  3: { headline: "Significant anomalies detected", sub: "Investigate dataset before proceeding",         color: SEV_VERDICT[3].color, bg: SEV_VERDICT[3].bg, border: SEV_VERDICT[3].border },
};

// S156 (A1.D0c-bis D5 lock): dataset-level action ladder. Engine severity
// 0–3 maps to user-facing outcome positions 1–4 of 4. Rendered as
// "Outcome: N of 4 — Label" at §4 emit body + Excel export only — §1 chrome
// keeps the headline + dot strip pair and does not consume this table.
// Engine severity is the array index; the rendered score is index + 1.
export const ACTION_LABEL = [
  { score: 1, label: "Proceed" },
  { score: 2, label: "Review" },
  { score: 3, label: "Investigate" },
  { score: 4, label: "Investigate closely" },
];

export function buildConsultationPrompt(results, importConfig, nRows, nCols, severity) {
  const lines = [];
  // S156 (A1.D0c-bis D5 lock): Outcome row replaces raw "Severity: N" with
  // the action ladder ("Outcome: N of 4 — Label"). Engine severity 0–3 maps
  // to outcome positions 1–4 of 4 via ACTION_LABEL. Severity 0 never
  // reaches this code path (chrome short-circuit at ReportView.jsx:1280),
  // so only outcomes 2 of 4 / 3 of 4 / 4 of 4 render here; severity-0
  // "1 of 4 — Proceed" renders at Excel only.
  const action = ACTION_LABEL[severity] || { score: severity + 1, label: "Unknown" };
  lines.push("I'm investigating a dataset flagged by Check My Data, a statistical forensics screening tool. Help me interpret the results and decide next steps.");
  lines.push("");
  lines.push(`Dataset: ${importConfig.fileName || "uploaded"} | ${nRows} rows × ${nCols} cols | Measurement type: ${importConfig.assay || "general"} | Data type: ${importConfig.dataType || "continuous"} | Outcome: ${action.score} of 4 — ${action.label}`);
  lines.push("");
  // S156 D1 canon: sentence-case "High" / "Moderate" / "Clear" replaces
  // ALL CAPS FLAGGED / NOTED. PASSING line retitled to "Cleared:" matching
  // the §3 strip past-tense canon.
  lines.push("Tests that flagged:");
  for (const r of results.filter(r => r.flag === "HIGH" || r.flag === "MODERATE")) {
    const flagLabel = r.flag === "HIGH" ? "High" : r.flag === "MODERATE" ? "Moderate" : r.flag;
    let d = `  ${flagLabel}: ${r.name}`;
    if (r.primaryP != null) d += ` (P=${fmtP(r.primaryP)})`;
    if (r.interpretation) d += ` — ${r.interpretation}`;
    lines.push(d);
  }
  lines.push("");
  lines.push("Cleared: " + results.filter(r => r.flag === "LOW").map(r => r.name).join(", "));
  lines.push("");
  lines.push("Questions: (1) Most likely explanations, both innocent and concerning? (2) Which flags are most concerning? (3) What evidence should I request from data authors? (4) What would clear them vs confirm the concern? (5) Additional analyses to run?");
  return lines.join("\n");
}
