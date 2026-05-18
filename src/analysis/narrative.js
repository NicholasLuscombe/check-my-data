import { SEV_VERDICT } from "../constants/tokens.js";

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
// 0–3 maps to user-facing outcome positions 1–4 of 4. Consumed at §4
// prompt body header (S161: via HandoffModel.outcome —
// src/analysis/handoffModel.js) and the Excel report header
// (src/export/excelExport.js). Engine severity is the array index; the
// rendered score is index + 1.
export const ACTION_LABEL = [
  { score: 1, label: "Proceed" },
  { score: 2, label: "Review" },
  { score: 3, label: "Investigate" },
  { score: 4, label: "Investigate closely" },
];

// S161 (A1.D2): `buildConsultationPrompt` retired. §4 prompt body now
// constructed via the HandoffModel pipeline:
//   buildHandoffModel(results, importConfig, nRows, nCols) → renderPromptBody(model)
// See src/analysis/handoffModel.js + src/analysis/promptBodyRenderer.js.
