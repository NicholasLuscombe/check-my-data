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
