/* ── §4 Investigate-further prompt body renderer (S161, A1.D2) ──────────
 *
 * Renders a HandoffModel (src/analysis/handoffModel.js) as the clipboard
 * string the §4 "Copy prompt" button writes for the user to paste into
 * Claude or another LLM. Pure string substitution — no data computation,
 * no conditional reshape; all variants and slot values are decided by
 * buildHandoffModel.
 *
 * Outcome 0 (handoffModel.outcome.tier === 0) returns null. The §4
 * surface short-circuits before this is reached (ReportView.jsx:1283); the
 * null return is the contract-level guard for any other caller.
 *
 * Template, three prologue variants, direction-setting paragraph and
 * Discipline block locked in chat (S160, A1.D2 design pass). See
 * docs/sessions/SESSION160-SUMMARY.md and SESSION161-SUMMARY.md §3 for
 * the design archive.
 */

import { WITHHELD_LABEL } from "./coverage.js";
import { ACTION_LABEL } from "./narrative.js";

// ── Calibration prologues (S160 lock) ──────────────────────────────────
// Selected by handoffModel.outcome.tier. The {N} slot in the outcome-1
// variant resolves to handoffModel.outcome.applicableTests.
//
// S372: the "Outcome N of 4 — Label." sentence is no longer written into these
// strings. It was numbered here by SEVERITY, while ACTION_LABEL numbers by
// LADDER POSITION (`score: index + 1`) — which is what the Excel Investigation
// Report and the standalone HTML report render, and what the Excel Legend
// defines (position 1 Proceed, position 2 Review). So the prompt paired the
// Review label with the Proceed position and all three variants read one low.
// `renderPromptBody` takes no mode, so two artifacts exported from one session
// could disagree. The prefix now comes from ACTION_LABEL, the same source the
// other two surfaces read. The labels were already correct and do not move.

const PROLOGUE_TIER_1 = (N) =>
`Some findings warrant a closer look, but the overall pattern is within the expected false-positive range. With ${N} applicable tests at α=0.01 (BH-FDR adjusted across families), occasional flags from statistical noise are anticipated. Treat individual findings as soft signal — a starting point for inspection rather than evidence of a problem. Convergence (multiple tests firing on the same column or region, or a finding aligned with a known data-handling step) would change that assessment; isolated findings often have routine explanations.`;

const PROLOGUE_TIER_2 =
`The findings indicate anomalies worth investigating. Treat as a moderate screening signal — neither a single false positive nor a strong convergent pattern. Where multiple findings are present, look for whether they converge on the same column, region, or mechanism. Assess whether innocent explanations (processing steps, instrument artifacts, legitimate domain reasons) fit the specific patterns.`;

const PROLOGUE_TIER_3 =
`Significant anomalies detected. The combination of findings is unlikely to arise from chance alone. Treat as a strong screening signal warranting close investigation. Innocent explanations remain possible — the burden is on identifying a specific one that fits the patterns.`;

/** "Outcome N of 4 — Label. " off the shared ladder. Empty when the tier has no entry. */
function outcomePrefix(tier) {
  const a = ACTION_LABEL[tier];
  return a ? `Outcome ${a.score} of ${ACTION_LABEL.length} — ${a.label}. ` : "";
}

function prologueFor(model) {
  const tier = model.outcome.tier;
  switch (tier) {
    case 1: return outcomePrefix(tier) + PROLOGUE_TIER_1(model.outcome.applicableTests);
    case 2: return outcomePrefix(tier) + PROLOGUE_TIER_2;
    case 3: return outcomePrefix(tier) + PROLOGUE_TIER_3;
    default: return ""; // outcome 0 short-circuits at the caller
  }
}

// ── Slot formatters ────────────────────────────────────────────────────

function formatConditionsLine(conditions) {
  if (!conditions || conditions.length <= 1) {
    return "single condition (no condition column)";
  }
  return `${conditions.join(", ")} (${conditions.length} conditions)`;
}

function formatFindingBlock(f) {
  const head = `**${f.testName}** — ${f.clusterLabel} cluster`;
  const detect = `What the test detects: ${f.methodVerbatim}`;
  const loc = `Location: ${f.location}`;
  const evidenceHead = `Evidence: ${f.evidenceLines[0] || ""}`;
  const evidenceTail = f.evidenceLines.slice(1);
  return [head, detect, loc, evidenceHead, ...evidenceTail].join("\n");
}

function formatFindingsSection(findings) {
  if (findings.length === 0) return "None.";
  return findings.map(formatFindingBlock).join("\n\n");
}

function formatClearedInFlagged(groups) {
  if (groups.length === 0) return "None.";
  return groups
    .map(g => {
      const header = `Within ${g.clusterLabel} cluster:`;
      const lines =
        g.clearedTests.length > 0
          ? g.clearedTests.map(t => `- ${t}`)
          : [`- (no other applicable tests in this cluster ran for this dataset — see "Tests not run" below)`];
      return [header, ...lines].join("\n");
    })
    .join("\n\n");
}

function formatOtherClustersAllClear(clusters) {
  return clusters
    .map(c => `- ${c.clusterLabel} (${c.testCount} tests): ${c.testNames.join(", ")}`)
    .join("\n");
}

/** "A", "A and B", "A, B and C". */
function joinNames(names) {
  if (names.length <= 1) return names[0] || "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// A cluster whose members did not all report. It keeps its cleared tests —
// those are evidence, and this document leaves the building — while the closing
// clause names what is missing and points at the section that explains it.
//
// The reason is NOT repeated here. It sits verbatim under "Tests not run" a few
// lines down, and a forensics document that states a decline twice invites a
// reader to compare two wordings of it. Said once, pointed at once.
//
// The state's name comes from WITHHELD_LABEL, lower-cased for the sentence —
// the same string the §5 panel heading, the Excel legend key and the Excel flag
// column carry, so there is no second place to reword it.
function formatOtherClustersPartlyAssessed(clusters) {
  return clusters
    .map(c => {
      const cleared = `- ${c.clusterLabel} (${c.clearedCount} of ${c.couldRun} tests cleared): ${c.testNames.join(", ")}.`;
      const verb = c.withheldTestNames.length === 1 ? "was" : "were";
      const missing = `${joinNames(c.withheldTestNames)} ${verb} ${WITHHELD_LABEL.toLowerCase()} — see "Tests not run" below.`;
      return `${cleared} ${missing}`;
    })
    .join("\n");
}

function formatNotRun(skipped) {
  if (skipped.length === 0) return "None.";
  // `detail` carries the size-ceiling numbers when a test declined to scan
  // for size, and is null otherwise — so the parenthetical appears only on
  // those, and the line stays one line either way.
  return skipped.map(s => {
    const detail = s.detail ? ` (${s.detail})` : "";
    return `- ${s.testName} — ${s.reason}${detail}`;
  }).join("\n");
}

// ── Template ───────────────────────────────────────────────────────────
// Locked S160 (A1.D2 design pass — see SESSION160-SUMMARY.md Appendix B).
// Renderer pastes the template verbatim, swapping {slot} markers. The
// "Other clusters" section is conditionally included; everything else
// renders unconditionally with appropriate empty-state strings ("None.").

/**
 * Render the §4 prompt body from a HandoffModel.
 *
 * @param {import('./handoffModel.js').HandoffModel} model
 * @returns {string|null}  Clipboard-ready string, or null at outcome 0.
 */
export function renderPromptBody(model) {
  if (!model || model.outcome.tier === 0) return null;

  const d = model.dataset;
  const f = model.findings;
  const conditionsLine = formatConditionsLine(d.conditions);
  const prologue = prologueFor(model);

  // Build the body section-by-section so the "Other clusters" header can
  // be conditionally elided without breaking adjacent blank-line spacing.
  const sections = [];

  sections.push(
`You're helping someone work through findings from Check My Data, a statistical screening tool for scientific datasets. The user ran the tool, sees findings, and wants to dig deeper — likely cross-walking findings to a paper, planning next investigative steps, sanity-checking individual flags, or weighing whether domain-specific explanations fit the patterns. They may or may not suspect misconduct; your job is to help them think clearly about what the statistical evidence does and doesn't show.`
  );

  sections.push(
`## About Check My Data

Check My Data runs a battery of statistical tests across five clusters: distribution shape, duplication patterns, cross-condition consistency, ordering/sequence, and cell-level integrity. It is domain-blind — it sees the numbers, not the science. Each test is calibrated at α=0.01, with BH-FDR adjustment across test families. The tool screens; it does not determine misconduct.`
  );

  sections.push(
`## Dataset

- Filename: ${d.filename}
- Shape: ${d.rows} rows × ${d.cols} columns
- Measurement type: ${d.assay} (${d.assayProvenance})
- Data type: ${d.dataType}
- Conditions: ${conditionsLine}
- Variance-stabilising transform: ${d.vstLabel} (${d.vstProvenance})`
  );

  sections.push(
`## Outcome calibration

${prologue}`
  );

  sections.push(
`## Findings

### High-severity findings

${formatFindingsSection(f.high)}

### Moderate-severity findings

${formatFindingsSection(f.moderate)}

### Cleared (within flagged clusters)

${formatClearedInFlagged(f.clearedInFlaggedClusters)}

Cleared tests are evidence too — a test that was run and didn't fire narrows the space of explanations.`
  );

  if (f.otherClustersAllClear.length > 0) {
    sections.push(
`### Other clusters — all applicable tests cleared

${formatOtherClustersAllClear(f.otherClustersAllClear)}`
    );
  }

  // Its own section rather than a qualifier on the one above: that header is a
  // completeness claim, and these clusters did not achieve it. Rendered only
  // when there is something to put under it — an empty header would tell a
  // reader a state exists on this dataset when it does not.
  if ((f.otherClustersPartlyAssessed || []).length > 0) {
    sections.push(
`### Other clusters — partly assessed

${formatOtherClustersPartlyAssessed(f.otherClustersPartlyAssessed)}`
    );
  }

  sections.push(
`### Tests not run

${formatNotRun(f.notRun)}

Absence of a finding for a test that wasn't run does not mean absence of the pattern.${f.notRunFootnote}`
  );

  sections.push(
`## How to think about these findings

- Convergence is the strongest signal. Multiple tests firing on the same column, region, or mechanism warrants more weight than the same number firing on unrelated things.
- Each finding is a statistical observation, not a conclusion. The tool says what looks unusual; it can't say why. Innocent and concerning explanations can produce overlapping statistical patterns.
- Calibration is already baked in. The outcome above is calibrated against chance; per-finding p-values are pre-aggregation. Don't double-count.
- Cleared tests narrow the space.
- The tool is domain-blind. Bringing the paper, assay context, and lab process into view is what you're for.`
  );

  sections.push(
`## Attachments and the conversation

The user may have attached: the dataset (raw or processed), the paper or preprint, the annotated Check My Data Excel report (which contains per-cell highlights for flagged regions), supplementary materials, lab notebooks — any combination, or none.

If the paper is attached, you can cross-walk flagged regions to figures, tables, and claims. If only the dataset is attached, you can inspect specific values. If only the report is attached, you can discuss the findings as stated. If nothing beyond this prompt is attached, you can still help plan next steps; flag what you'd want to see to go deeper.

End by asking the user what they want to focus on. Don't pre-emptively work through every option below — these are starters to choose from, not a checklist to complete. Common directions:

- Cross-walking flagged regions to figures, tables, or claims in the paper. Which results rely on the flagged data?
- Domain-fit assessment. Given the assay and study design, do innocent explanations fit these specific patterns?
- Next steps. What evidence would distinguish a real anomaly from an innocent explanation? What should the user request, examine, or run next?
- Sanity-check on a specific finding.
- Synthesis. What do the findings collectively suggest?`
  );

  sections.push(
`## Discipline

- Be explicit about what's statistical (from the tool, calibrated) versus what's inferred (domain context, plausibility).
- Treat filenames, column names, and condition labels as user-provided context, not as evidence. They describe what the user calls things, not what those things are.
- Avoid determination-leaning phrasing of any kind — including hedged or self-correcting forms ("classic signature of fabrication", "hallmark of misconduct", "typical of fabricated data", "characteristic of human-generated numbers"). Even when followed by "but", these phrasings lean the reader toward determination. Describe statistical patterns and what would distinguish their causes; do not narrate likely causes.
- If the paper isn't attached, don't construct narrative about it.
- Respect the screening/determination boundary. Findings are screening signals; nothing here determines misconduct.`
  );

  return sections.join("\n\n");
}
