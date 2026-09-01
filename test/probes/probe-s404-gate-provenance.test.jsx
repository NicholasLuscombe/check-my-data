/* S404 regression — P248. Clicking a gate option that is ALREADY selected must
 * not change that gate's provenance.
 *
 * THE DEFECT. `ImportView.jsx`'s four gate handlers were bare
 * `setValue(); setAutoSet(false)` pairs with no equality check, so a click on
 * the option the tool had already chosen flipped the gate from auto to
 * user-set. The two auto-resolve effects (:413, :431) are each guarded on
 * `<value> === null || <flag>`, so with the flag false and the value non-null
 * neither guard passes and the flag never comes back — the freeze is permanent
 * for the session. `handleProceed` then writes `provenance.cols` / `.rows` as
 * 'user-set' (:625-626) and `ReportView.jsx:948` renders "(user-set)" over a
 * choice no human made.
 *
 * WHY NOTHING ELSE CATCHES IT. `validate-batch.mjs` and every other probe run
 * one shot with a fixed config, so no existing harness clicks anything twice.
 * The defect lives in click ORDER, which is a shape the suite could not see.
 * The batch is blind to it twice over: it never imports the React components,
 * and a provenance word never reaches a flag, a p-value or a severity.
 *
 * THE FIXTURE. `01-densitometry-clean.csv` auto-resolves BOTH gates, which is
 * what makes one file enough for two axes. Its two-row band header
 * (",Control,,,,Inhibitor_A,..." over "Residue,Rep1,...") populates
 * `condPerCol`, so `condStructureKind` is truthy and the column gate
 * auto-resolves to 'replicates' (:413-416). `densitometry` is in
 * `INSTRUMENT_ASSAYS` (`rowSemantics.js:23-26`), so `suggestRowSemantics`
 * returns 'ordered' with `auto: true` and the row gate auto-resolves too
 * (:431-434).
 *
 * BADGE COUNTING. Badges are `<span>`s whose TRIMMED text is exactly "Auto",
 * never a substring of the page or of a button. CLAUDE.md rules against the
 * substring method by name: the page carries several "Auto" substrings — the
 * Auto-cleaned prep notice, the role-assignment row's Auto button, Zone 3's
 * sub-text — and only one of them is a badge.
 *
 * DEFAULT LANE, deliberately. This is a regression test over a repo fixture,
 * not a corpus probe, so it carries no env gate and `npm test` runs it.
 *
 * Run: npx vitest run test/probes/probe-s404-gate-provenance.test.jsx
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import React from "react";

import { ImportView } from "../../src/components/views/ImportView.jsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "..", "fixtures", "01-densitometry-clean.csv");

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/* jsdom ships no ResizeObserver; ImportView's table chrome expects one. */
function stubResizeObserver() {
  if (typeof globalThis.ResizeObserver === "function") return;
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
}

async function waitFor(fn, { timeout = 20000, interval = 25, label = "condition" } = {}) {
  const t0 = Date.now();
  for (;;) {
    let v; try { v = fn(); } catch { v = null; }
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${label}`);
    await tick(interval);
  }
}

const buttons = (c) => [...c.querySelectorAll("button")];

/* Located by the product's own option copy, which is unique per option where
 * the button headings are not. Same anchors probe-s395-pos01-gates uses. */
const CONTROL = {
  replicates: "Columns measure the same thing",
  conditions: "Columns measure different things",
  ordered:    "Row order carries forensic meaning",
  arbitrary:  "Row order is not meaningful",
};
function control(container, key) {
  const hits = buttons(container).filter((b) => (b.textContent || "").includes(CONTROL[key]));
  if (hits.length !== 1) throw new Error(`control "${key}" matched ${hits.length} buttons`);
  return hits[0];
}

/* The AUTO badge, counted the one way CLAUDE.md allows. */
const autoBadges = (el) =>
  [...el.querySelectorAll("span")].filter((s) => (s.textContent || "").trim() === "Auto");

/* The gate's currently-selected option is the one carrying the badge. Reading
 * it off the screen rather than hardcoding 'replicates' / 'ordered' means the
 * test clicks whatever the product actually chose. */
function autoSelected(container, keyA, keyB, axis) {
  const hits = [keyA, keyB]
    .map((k) => control(container, k))
    .filter((b) => autoBadges(b).length === 1);
  if (hits.length !== 1) {
    throw new Error(`${axis} gate: expected exactly one AUTO-badged option, found ${hits.length}`);
  }
  return hits[0];
}

const RUN_LABELS = ["Run analyses",
                    "Select column relationship above to proceed",
                    "Select row order above to proceed"];
const runButton = (c) =>
  buttons(c).find((b) => RUN_LABELS.includes((b.textContent || "").trim())) || null;

afterEach(() => cleanup());

describe("S404 — P248: a no-change gate click must not flip provenance", () => {
  it("keeps both gates on (auto) after clicking the option already selected", async () => {
    stubResizeObserver();

    let handed = null;
    const { container } = render(
      <ImportView onProceed={(cfg) => { handed = cfg; }} onBatch={() => {}} />
    );

    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, {
      target: { files: [new File([readFileSync(FIXTURE)], "01-densitometry-clean.csv",
                                 { type: "text/csv" })] },
    });

    // Wait for the cards AND for the two auto-resolve effects to land. The
    // controls render as soon as `sum.nDC >= 2`, while the effects at :413 and
    // :431 apply on a later pass — so waiting on the buttons alone reads the
    // screen one render too early and finds no badge on either gate.
    await waitFor(() => {
      try {
        autoSelected(container, "replicates", "conditions", "column");
        autoSelected(container, "ordered", "arbitrary", "row");
        return true;
      } catch { return false; }
    }, { label: "both gates to auto-resolve and show their AUTO badge" });

    // Both gates must START auto-resolved, or the test is not exercising P248.
    const colBefore = autoSelected(container, "replicates", "conditions", "column");
    const rowBefore = autoSelected(container, "ordered", "arbitrary", "row");

    // -- the no-change clicks --------------------------------------------
    fireEvent.click(colBefore);
    await tick(0);
    fireEvent.click(rowBefore);
    await tick(0);

    // Assertion 1 -- the column axis is still auto.
    expect(
      autoBadges(autoSelected(container, "replicates", "conditions", "column")).length,
      "column gate lost its AUTO badge after a click on the option already selected"
    ).toBe(1);

    // Assertion 2 -- the row axis is still auto.
    expect(
      autoBadges(autoSelected(container, "ordered", "arbitrary", "row")).length,
      "row gate lost its AUTO badge after a click on the option already selected"
    ).toBe(1);

    // And the word that actually reaches ReportView. This is the payload the
    // badge is only a proxy for: `provenance.cols` / `.rows` are what
    // `provTag` renders as "(auto)" / "(user-set)" at ReportView.jsx:939,:948.
    const run = runButton(container);
    expect(run, "no run button on screen").toBeTruthy();
    expect(run.textContent.trim()).toBe("Run analyses");
    fireEvent.click(run);
    await waitFor(() => handed, { label: "handleProceed to hand up a config" });

    expect(handed.provenance.cols, "provenance.cols after a no-change click").toBe("auto");
    expect(handed.provenance.rows, "provenance.rows after a no-change click").toBe("auto");
  }, 30000);
});
