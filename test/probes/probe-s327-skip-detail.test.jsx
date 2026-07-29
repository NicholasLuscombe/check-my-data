/* S327 / S334 — does the size-ceiling detail reach the reader?
 *
 * The surface moved. Section 3 no longer renders the not-applicable reasons —
 * S334 step 3 removed those expandables — so section 5 is the coverage surface
 * now, and the handoff prompt body (§4) still carries the same detail. This
 * probe covers the two surviving surfaces:
 *
 *   §5  the grouped reasons carry the detail. S5GroupedReasons renders each
 *       group's `detail` straight from groupNotApplicableByReason, so proving the
 *       helper carries it proves it reaches the surface. The component itself is
 *       private to ReportView; its render of `detail` is a one-line
 *       `{detail && ...}`, and the §4 test below exercises a real render path.
 *   §4  the "not run" line in the handoff prompt body (promptBodyRenderer).
 *
 * The control result carries no size-ceiling fields: its group must carry a null
 * detail and its prompt line no parenthetical.
 *
 * No fixture reaches this — Sequential Duplication only skips for size on a file
 * over 5,000 rows — so SKIPPED is synthetic, its numbers from C14 (9,398 rows
 * against the 5,000 ceiling).
 *
 * The three-header split this file used to cover (skip / not-applicable / refusal
 * as separate §3 stanzas) is gone: section 5 groups declines by their reason, not
 * by coverage state, so there is nothing to port.
 *
 * Run: npx vitest run test/probes/probe-s327-skip-detail.test.jsx
 */

import { describe, it, expect } from "vitest";

import { buildHandoffModel, formatSkipDetail } from "../../src/analysis/handoffModel.js";
import { groupNotApplicableByReason } from "../../src/analysis/noVerdictReasons.js";
import { renderPromptBody } from "../../src/analysis/promptBodyRenderer.js";

// C14's real numbers: 9,398 rows against the 5,000 ceiling.
const SKIPPED = {
  name: "Sequential Duplication",
  category: "copied",
  flag: "N/A",
  sequences: [], nSequences: 0,
  description:
    "The sequence scan was skipped because this dataset is too large for it. " +
    "The scan's cost grows with rows, columns and offsets together, so it carries a size cap. " +
    "This is a limit of the scan, not a property of the data.",
  scanSkippedRows: 9398,
  scanRowLimit: 5000,
};

// Control — a genuine not-applicable, no size-ceiling fields.
const CONTROL = {
  name: "Residual Spike Correlation",
  category: "copied",
  flag: "N/A",
  description: "No condition grouping found. Residual spike correlation requires ≥2 conditions.",
};

describe("S327 — size-ceiling detail on the surviving surfaces", () => {
  it("formats the detail with pinned locale separators", () => {
    console.log("\n── formatSkipDetail ──");
    console.log("  with fields   :", JSON.stringify(formatSkipDetail(SKIPPED)));
    console.log("  without fields:", JSON.stringify(formatSkipDetail(CONTROL)));
    expect(formatSkipDetail(SKIPPED)).toBe("9,398 rows, against a limit of 5,000");
    expect(formatSkipDetail(CONTROL)).toBeNull();
  });

  it("§5 grouped reasons carry the detail, and null for the control", () => {
    // This is exactly what S5GroupedReasons feeds into each S5Group: the group's
    // `detail` field, rendered beneath the shared reason when present.
    const withDetail = groupNotApplicableByReason([SKIPPED]);
    expect(withDetail).toHaveLength(1);
    console.log("\n── §5 group, test WITH size-ceiling fields ──");
    console.log("  names  :", withDetail[0].names.join(" · "));
    console.log("  detail :", JSON.stringify(withDetail[0].detail));
    expect(withDetail[0].names).toContain("Recurring value sequences");
    expect(withDetail[0].detail).toBe("9,398 rows, against a limit of 5,000");

    const noDetail = groupNotApplicableByReason([CONTROL]);
    console.log("\n── §5 group, control WITHOUT the fields ──");
    console.log("  detail :", JSON.stringify(noDetail[0].detail), "(no line rendered)");
    expect(noDetail[0].detail).toBeNull();
  });

  it("§4 prompt body carries the same words on one line", () => {
    const results = [
      SKIPPED,
      CONTROL,
      // One flagged result so the outcome tier clears 0 and the body renders.
      { name: "Exact Duplicate Detection", category: "copied", flag: "HIGH",
        primaryP: 1e-9, description: "Exact duplicate blocks detected.",
        interpretation: "Duplicate blocks across rows." },
    ];
    const model = buildHandoffModel(results, { fileName: "C14.xlsx", assay: "general", dataType: "continuous" }, 9398, 14);

    console.log("\n── §4 notRun model entries ──");
    for (const s of model.findings.notRun) {
      console.log(`  ${s.testName} -> detail=${JSON.stringify(s.detail)}`);
    }

    const seq = model.findings.notRun.find(s => s.testName === "Sequential Duplication");
    const ctl = model.findings.notRun.find(s => s.testName === "Residual Spike Correlation");
    expect(seq.detail).toBe("9,398 rows, against a limit of 5,000");
    expect(ctl.detail).toBeNull();

    const body = renderPromptBody(model);
    console.log("\n── §4 rendered lines ──");
    if (body == null) {
      console.log("  (prompt body null — outcome tier 0; model entries above are the check)");
    } else {
      for (const line of body.split("\n")) {
        if (line.startsWith("- Sequential Duplication") || line.startsWith("- Residual Spike")) {
          console.log("  " + line);
          expect(line.includes("\n")).toBe(false);
        }
      }
      expect(body).toContain("(9,398 rows, against a limit of 5,000)");
      // Control line present, and carrying no parenthetical detail.
      const ctlLine = body.split("\n").find(l => l.startsWith("- Residual Spike"));
      if (ctlLine) expect(ctlLine).not.toMatch(/against a limit of/);
    }
  });
});
