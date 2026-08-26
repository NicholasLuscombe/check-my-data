/* S386 part 2 — P195: does the legend label actually change on screen, and does
 * it change ONLY where the split behind it is a decision?
 *
 * `validate-batch.mjs` imports no display component and no engine `description`
 * composes a legend string, so neither the batch nor the description dump can
 * see this change. This probe is the only instrument that can: it runs the real
 * engine over real fixtures, renders the real cards, and reads the rendered
 * output.
 *
 * THE GUARD IS THE POINT. Three `src/` surfaces carried "Within expected range"
 * over three different predicates and a fourth carried it over a real magnitude
 * test. A sweep of all four would have replaced a correct label with a wrong
 * one. So this probe asserts the negative cases POSITIVELY — the two surfaces
 * that must still say the old words are checked for saying them, not merely
 * left alone. A test that only checks what changed cannot fail when someone
 * later "finishes the job".
 *
 * FIXTURES, one named per assertion (S385's probes covered overlapping sets and
 * a question asked of the wrong one returns a silence that reads as a null):
 *
 *   Not-flagged renders (the shared forest legend, all three consumers):
 *     Value-Frequency Spike        13-vfstest-cellcountest.csv    (HIGH)
 *     Row-Mean Runs                21-localised-ar.csv            (HIGH)
 *     Autocorrelation              11-rnaseq-multicondition.csv   (HIGH)
 *   Not-flagged renders (the non-forest card changed with them):
 *     Cross-Condition Rank Corr.   11-rnaseq-multicondition.csv   (see note)
 *   Old wording MUST survive (the guard):
 *     Within-Row Variance          03-qpcr-clean.csv              (LOW)
 *     Inter-Replicate Correlation  03-qpcr-clean.csv              (LOW)
 *
 * NOTE ON RANK CORRELATION. Measured at S386: the test returns `flag: "N/A"` on
 * every fixture in the battery, and `MiniPlot` returns null for an N/A result,
 * so this card never reaches the screen through the normal dispatch. Its label
 * change is therefore render-unexercised by the corpus in the ordinary path.
 * The assertion below renders `MiniCard_RankCorrelation` DIRECTLY, bypassing
 * MiniPlot's N/A gate but not the card's own `hasMatrix` gate, on a real engine
 * result carrying three real condition pairs. That is a genuine render of the
 * real component on real data — it is not a props check — but it is reached by
 * a path the app does not currently take, and it is recorded here as such
 * rather than quietly counted as coverage.
 *
 * WHY IRC IS IN THE GUARD LIST AND NOT THE CHANGE LIST. Halt condition B fired
 * at S386 part 2. IRC's split is `isPromotionTrigger`, and the card renders a
 * second flag surface below the heatmap: the windowed arm, whose table writes
 * the word "Flagged" off `w.significant`. The card even carries a connector for
 * the case — "No single replicate pair is anomalous overall — the verdict is
 * driven by the localised row windows shown below" — which renders precisely
 * when every heatmap cell is cleared while flagged windows sit underneath. In
 * that branch "Not flagged" on the blue key would be false on its face, so IRC
 * keeps the old words until it gets a label that is true of both surfaces.
 *
 * Run: npx vitest run test/probes/probe-s386-legend-label.test.jsx
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { render } from "@testing-library/react";

import { MiniPlot } from "../../src/components/cards/MiniPlot.jsx";
import { MiniCard_RankCorrelation } from "../../src/components/cards/MiniCard_RankCorrelation.jsx";
import { CC } from "../../src/constants/tokens.js";

const FIXTURES = "test/fixtures";

const OLD_LABEL = "Within expected range";
const NEW_LABEL = "Not flagged";

async function runFixture(file) {
  const Papa = await import("papaparse");
  const { extractAnalysisInputs, runFullAnalysis } = await import("../../src/analysis/engine.js");
  const { detectVST } = await import("../../src/stats/vst.js");
  const { inferRoles } = await import("../../src/import/roles.js");
  const { ASSAY_DATATYPE_MAP } = await import("../../src/constants/assays.js");
  const { forwardFill, preprocessRaw, detectHeaderRows } = await import("../../src/import/parser.js");
  const { detectLongFormat } = await import("../../src/import/longFormat.js");
  const { suggestRowSemantics } = await import("../../src/import/rowSemantics.js");
  const { EXPECTED } = await import("../batch-fixtures.mjs");

  const csv = readFileSync(join(FIXTURES, file), "utf-8");
  let raw = Papa.default.parse(csv, { skipEmptyLines: true }).data;
  raw = preprocessRaw(raw).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = EXPECTED[file].assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || "continuous";
  const lf = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lf }).value || "ordered";
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);
  return {
    results,
    importConfig: { fileName: file, assay, hdrs: headers, roles, condPerCol, headerRows, skippedRows: 0, data },
  };
}

const FILES = [
  "13-vfstest-cellcountest.csv",
  "21-localised-ar.csv",
  "11-rnaseq-multicondition.csv",
  "03-qpcr-clean.csv",
  // S386 part 3 — IRC's two unit classes, one fixture each. Both measured, not
  // assumed: 02 carries 20 flagged WINDOWS with nSuspicious = 0 (so no pair is
  // flagged and the red key is not even shown), and 08 carries one suspicious
  // PAIR with no windows at all. Between them the two surfaces are exercised
  // separately, which is the whole point of scoping the words.
  "02-densitometry-fabricated.csv",
  "08-elisa-fabricated.csv",
];

// Cards whose legend the S386 label change reaches, each with the fixture that
// mounts its surface. The first three inherit the change from the shared
// `forestLegendItems`; Rank Correlation carries its own copy of the key.
const CHANGED = [
  { test: "Value-Frequency Spike",             file: "13-vfstest-cellcountest.csv",  flag: "HIGH" },
  { test: "Row-Mean Runs",                     file: "21-localised-ar.csv",          flag: "HIGH" },
  { test: "Autocorrelation",                   file: "11-rnaseq-multicondition.csv", flag: "HIGH" },
];

// Cards that must NOT have been swept. Their splits are not the forest's.
const GUARDED = [
  {
    test: "Within-Row Variance", file: "03-qpcr-clean.csv",
    why: "split is Math.abs(z) > Z_THRESH — an actual magnitude test, so the words are true",
  },
  // RE-REGISTERED AT S386 PART 3, in the open rather than silently.
  //
  // Part 2 pinned a second guard here, verbatim:
  //
  //     { test: "Inter-Replicate Correlation", file: "03-qpcr-clean.csv",
  //       why: "halt B — isPromotionTrigger, with a second flag surface
  //             (the windowed arm) below" },
  //
  // It asserted that IRC still read "Within expected range", because halt B had
  // stopped the rename there. Part 3 lifts that halt by giving IRC words that
  // name their own unit class, so this guard began failing BY DESIGN — the
  // definition it pinned was deliberately changed. It is retired here and
  // replaced by the two IRC assertions at the foot of this file, which pin the
  // new scoped wording on the two fixtures that exercise the two surfaces
  // separately. The old text is kept above so the change is legible rather than
  // silent; a check must never be edited merely to make a failure go away.
];

describe("S386 — P195 legend label", () => {
  const loaded = {};
  beforeAll(async () => {
    for (const f of FILES) loaded[f] = await runFixture(f);
  }, 600_000);

  // Same render, returning the container rather than its text — the P197
  // assertion reads a rendered ATTRIBUTE, which textContent cannot carry.
  const textForContainer = (test, file) => {
    const { results, importConfig } = loaded[file];
    const result = results.find(r => r.name === test);
    expect(result, `${test} produced no result on ${file}`).toBeTruthy();
    return render(
      <MiniPlot result={result} importConfig={importConfig} rowMap={null} />
    ).container;
  };

  const textFor = (test, file) => {
    const { results, importConfig } = loaded[file];
    const result = results.find(r => r.name === test);
    expect(result, `${test} produced no result on ${file}`).toBeTruthy();
    const { container } = render(
      <MiniPlot result={result} importConfig={importConfig} rowMap={null} />
    );
    return { text: container.textContent || "", result };
  };

  for (const { test, file, flag } of CHANGED) {
    it(`${test} on ${file} — legend reads "${NEW_LABEL}", never "${OLD_LABEL}"`, () => {
      const { text, result } = textFor(test, file);
      expect(result.flag).toBe(flag);
      expect(text).toContain(NEW_LABEL);
      expect(text).not.toContain(OLD_LABEL);
      // Case-insensitive too: the VFS caption carried the claim in lower case,
      // which the capitalised search would have walked straight past.
      expect(text.toLowerCase()).not.toContain(OLD_LABEL.toLowerCase());
    }, 60_000);
  }

  it(`Value-Frequency Spike on 13-vfstest-cellcountest.csv — the caption states the decision, not a distance`, () => {
    const { text } = textFor("Value-Frequency Spike", "13-vfstest-cellcountest.csv");
    // The caption's old clause asserted that a unit failing the effect-size or
    // near-duplicate gate "reads as within expected range" — the legend's
    // magnitude claim restated in prose, on a forest surface.
    expect(text).toContain("reads as not flagged, however far it sits from its expected count");
    expect(text.toLowerCase()).not.toContain("reads as within expected range");
  }, 60_000);

  it(`Cross-Condition Rank Correlation on 11-rnaseq-multicondition.csv — legend reads "${NEW_LABEL}" (direct render; see header note)`, () => {
    const { results, importConfig } = loaded["11-rnaseq-multicondition.csv"];
    const result = results.find(r => r.name === "Cross-Condition Rank Correlation");
    expect(result).toBeTruthy();

    // Recorded, not glossed: the corpus never routes this card to the screen.
    expect(result.flag).toBe("N/A");
    expect(render(<MiniPlot result={result} importConfig={importConfig} rowMap={null} />)
      .container.textContent).toBe("");

    // Real component, real engine result, three real condition pairs — reached
    // by bypassing MiniPlot's N/A gate, not the card's own hasMatrix gate.
    expect(result.nConditionPairs).toBeGreaterThanOrEqual(2);
    const { container } = render(
      <MiniCard_RankCorrelation result={result} importConfig={importConfig} rowMap={null} />
    );
    const text = container.textContent || "";
    expect(text).toContain(NEW_LABEL);
    expect(text).not.toContain(OLD_LABEL);
  }, 60_000);

  for (const { test, file, why } of GUARDED) {
    it(`GUARD — ${test} on ${file} still reads "${OLD_LABEL}" (${why})`, () => {
      const { text } = textFor(test, file);
      // Asserted positively. If a later sweep takes this label, this fails.
      expect(text).toContain(OLD_LABEL);
      expect(text).not.toContain(NEW_LABEL);
    }, 60_000);
  }
  // ── S386 part 3 ──────────────────────────────────────────────────────────
  //
  // The legend's reference swatch. ChartLegend draws every swatch as its own
  // <svg height="12">, while the plot's own SVG height is computed from the row
  // count — so filtering on that height isolates legend glyphs from plot marks,
  // which are the same token colour and would otherwise be counted as legend.
  const refSwatchLines = (container) =>
    [...container.querySelectorAll("svg")]
      .filter(s => s.getAttribute("height") === "12")
      .map(s => s.querySelector("line"))
      .filter(l => l && l.getAttribute("stroke") === CC.EXP);

  it("P197 — the forest's reference swatch follows referenceMode, dashed only in zero mode", () => {
    // STORED mode: MiniCard_ValueFrequency on 13-vfstest-cellcountest.csv.
    // The plot draws one short solid tick per row, so the sample is a solid
    // tick. Asserted on the rendered stroke, not on props: the dash is a render
    // attribute and a props check cannot see it, which is P197's whole content.
    const stored = textForContainer("Value-Frequency Spike", "13-vfstest-cellcountest.csv");
    const storedLines = refSwatchLines(stored);
    expect(storedLines.length).toBeGreaterThan(0);
    const storedRef = storedLines[0];
    expect(storedRef.getAttribute("stroke-dasharray")).toBeNull();
    // and it is a TICK: vertical, so both x co-ordinates agree.
    expect(storedRef.getAttribute("x1")).toBe(storedRef.getAttribute("x2"));
    expect(storedRef.getAttribute("y1")).not.toBe(storedRef.getAttribute("y2"));

    // ZERO mode: MiniCard_Autocorrelation on 11-rnaseq-multicondition.csv.
    // The plot draws one dashed line spanning it, so the sample stays dashed.
    // This card renders a SECOND teal legend swatch further down (the per-lag
    // decay chart's own "Expected r = 0" key), which is also dashed; the forest
    // is Surface 1 so its swatch is the first, and that is the one read here.
    const zero = textForContainer("Autocorrelation", "11-rnaseq-multicondition.csv");
    const zeroLines = refSwatchLines(zero);
    expect(zeroLines.length).toBeGreaterThan(0);
    const zeroRef = zeroLines[0];
    expect(zeroRef.getAttribute("stroke-dasharray")).toBe("4,3");
    // and it is a LINE: horizontal, so both y co-ordinates agree.
    expect(zeroRef.getAttribute("y1")).toBe(zeroRef.getAttribute("y2"));

    // The two modes must actually differ — the assertion that makes this a test
    // of the branch rather than of one arm.
    expect(storedRef.getAttribute("stroke-dasharray"))
      .not.toBe(zeroRef.getAttribute("stroke-dasharray"));
  }, 60_000);

  it("IRC on 02-densitometry-fabricated.csv — pair key and window word name their own units", () => {
    // The halt-B case made concrete. Measured on this fixture: nSuspicious = 0
    // and no pair is a promotion trigger, so EVERY heatmap cell is cleared —
    // while 20 row windows read flagged in the table below. An unscoped "Not
    // flagged" on the blue key would have asserted, on this very card, that
    // nothing is flagged, directly above twenty flagged windows.
    const { text, result } = textFor("Inter-Replicate Correlation", "02-densitometry-fabricated.csv");
    expect(result.flag).toBe("MODERATE");
    expect(result.nSuspicious).toBe(0);
    const wins = (result.details || []).filter(d => d.source === "window");
    expect(wins.filter(w => w.significant === true).length).toBeGreaterThan(0);

    expect(text).toContain("Pair not flagged");
    expect(text).toContain("Window flagged");
    // The red PAIR key is gated on nSuspicious > 0, so it is absent here.
    expect(text).not.toContain("Pair flagged");
    // No unscoped survivor of either word.
    expect(text).not.toContain("Within expected range");
    // The connector renders in exactly this branch and still reads correctly.
    expect(text).toContain("No single replicate pair is anomalous overall");
  }, 60_000);

  it("IRC on 08-elisa-fabricated.csv — the red pair key reads 'Pair flagged'", () => {
    // The complementary fixture: one suspicious PAIR, no windows at all. The
    // red key renders here and nowhere else in the corpus.
    const { text, result } = textFor("Inter-Replicate Correlation", "08-elisa-fabricated.csv");
    expect(result.flag).toBe("HIGH");
    expect(result.nSuspicious).toBeGreaterThan(0);
    expect((result.details || []).filter(d => d.source === "window").length).toBe(0);

    expect(text).toContain("Pair flagged");
    expect(text).toContain("Pair not flagged");
    expect(text).not.toContain("Highly correlated (outlier pair)");
    expect(text).not.toContain("Within expected range");
  }, 60_000);
});
