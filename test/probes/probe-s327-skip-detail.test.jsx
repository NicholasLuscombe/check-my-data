/* S327 render probe — does the size-ceiling detail actually reach both surfaces?
 *
 * Dumps what a reader would see for a not-run test that declined to scan for
 * size, on the two surfaces that render the not-applicable reason:
 *
 *   §3  the expanded not-applicable stanza (ForensicsCategoryBlock)
 *   §4  the "not run" line in the handoff prompt body (promptBodyRenderer)
 *
 * This mounts the real component and clicks the real toggle — it does not
 * re-implement the render. It is cheaper than a screenshot round and it is
 * NOT a substitute for one: it proves the strings and the conditional, and
 * says nothing about spacing, hierarchy or whether the line reads well in
 * place. That still needs Nick's eyes on C14.
 *
 * The control result carries no size-ceiling fields. Its stanza must render
 * exactly as it does today — no detail line, no empty slot, no separator.
 *
 * Run: npx vitest run test/probes/probe-s327-skip-detail.test.jsx
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ForensicsCategoryBlock } from "../../src/components/forensics/ForensicsCategoryBlock.jsx";
import { buildHandoffModel, formatSkipDetail } from "../../src/analysis/handoffModel.js";
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

function renderBlock(naTests) {
  return render(
    <ForensicsCategoryBlock
      mk="copied"
      label="Copy, Paste, Edit"
      description="Whether values were copied, pasted or edited."
      isFlagged={false}
      hasHigh={false}
      testResults={[]}
      notApplicableTests={naTests}
      coverage={{ ran: 0, notApplicable: naTests.length, unassessed: 0, errored: 0, pending: 0, total: naTests.length }}
      isExpanded={true}
      onToggle={() => {}}
      expandedTestEvidence={{}}
      onToggleTestEvidence={() => {}}
      importConfig={{}}
      rowMap={null}
    />
  );
}

// Expand the collapsed "N tests not applicable" row so the stanzas mount.
// Match the count span specifically — the bare words "Not applicable" also
// appear as the cluster header word, which is a different control. The click
// bubbles from the span to the row's onClick.
function openStanzas() {
  fireEvent.click(screen.getByText(/^\d+ tests? not applicable$/i));
}

describe("S327 — size-ceiling detail on both surfaces", () => {
  it("formats the detail with pinned locale separators", () => {
    console.log("\n── formatSkipDetail ──");
    console.log("  with fields   :", JSON.stringify(formatSkipDetail(SKIPPED)));
    console.log("  without fields:", JSON.stringify(formatSkipDetail(CONTROL)));
    expect(formatSkipDetail(SKIPPED)).toBe("9,398 rows, against a limit of 5,000");
    expect(formatSkipDetail(CONTROL)).toBeNull();
  });

  it("§3 stanza shows the detail beneath the reason", () => {
    const { container } = renderBlock([SKIPPED]);
    openStanzas();
    const text = container.textContent;
    console.log("\n── §3 stanza, test WITH size-ceiling fields ──");
    console.log("  reason :", SKIPPED.description);
    console.log("  detail :", "9,398 rows, against a limit of 5,000");
    console.log("  names  :", "Recurring value sequences");
    expect(text).toContain("9,398 rows, against a limit of 5,000");
    expect(text).toContain("Recurring value sequences");
  });

  it("§3 stanza renders no detail slot for a test without the fields", () => {
    const { container } = renderBlock([CONTROL]);
    openStanzas();
    const text = container.textContent;
    console.log("\n── §3 stanza, control WITHOUT the fields ──");
    console.log("  reason :", CONTROL.description);
    console.log("  detail : (none — no line rendered)");
    expect(text).toContain(CONTROL.description);
    expect(text).not.toMatch(/against a limit of/);
    expect(text).not.toMatch(/\brows,\s*against\b/);
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
