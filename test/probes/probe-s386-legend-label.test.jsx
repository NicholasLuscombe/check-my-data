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
  {
    test: "Inter-Replicate Correlation", file: "03-qpcr-clean.csv",
    why: "halt B — isPromotionTrigger, with a second flag surface (the windowed arm) below",
  },
];

describe("S386 — P195 legend label", () => {
  const loaded = {};
  beforeAll(async () => {
    for (const f of FILES) loaded[f] = await runFixture(f);
  }, 600_000);

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
});
