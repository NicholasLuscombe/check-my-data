/* S385 — does the VFS forest actually render, and does it mark the right units?
 *
 * `validate-batch.mjs` never imports a card, so a green batch says nothing
 * about a display build. This probe is the instrument that does: it runs the
 * real engine over real fixtures, hands the result to the real
 * `MiniCard_ValueFrequency`, and reads the rendered SVG.
 *
 * What it pins:
 *   1. The forest mounts, in stored-reference mode — one per-unit reference
 *      tick per plotted unit, drawn in the expected-value teal.
 *   2. Colour follows PLOT-COLOUR-SEMANTICS channel 4 off the tokens, with no
 *      third state: every mark is CC.THRESH or CC.OBS, never grey, never green.
 *   3. The marks are the units the VERDICT promoted on — the count of red marks
 *      equals the count of `droveVerdict === true` entries in the engine's own
 *      BH family, not the count of entries that merely clear a p threshold. On
 *      the pigeonhole fixture those two numbers come apart: the near-dup gate
 *      suppresses tails that clear `adjP < ALPHA.NOTE`, so a display-time
 *      threshold re-derivation would paint marks the card's verdict does not
 *      carry. That fixture is in the set below for exactly that reason.
 *   4. A cleared card still draws its forest, all-blue.
 *   5. The row cap is stated rather than silent.
 *   6. The EvidenceTable survives underneath.
 *
 * Run: npx vitest run test/probes/probe-s385-vfs-forest-render.test.jsx
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { render } from "@testing-library/react";

import { MiniCard_ValueFrequency } from "../../src/components/cards/MiniCard_ValueFrequency.jsx";
import { CC } from "../../src/constants/tokens.js";
import { ALPHA } from "../../src/constants/thresholds.js";

const FIXTURES = "test/fixtures";

// One engine run per fixture, shared across that fixture's assertions.
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
    result: results.find(r => r.name === "Value-Frequency Spike"),
    importConfig: { fileName: file, assay, hdrs: headers, roles, condPerCol, headerRows, skippedRows: 0, data },
  };
}

// The plot's own SVG. ChartLegend draws each swatch as its own 12px <svg>, in
// the same two token colours as the marks and the same teal as the reference
// ticks, so an unscoped query counts the legend as data — it read 22 marks for
// 20 units, and one red mark on a card with none. The plot is the first <svg>
// in the card body; the legend renders after it.
function plotSvg(container) {
  const svgs = [...container.querySelectorAll("svg")];
  expect(svgs.length).toBeGreaterThan(0);
  return svgs[0];
}

// The rendered marks: ForestPlot draws one <circle> per unit with a finite
// estimate, filled CC.THRESH when flagged and CC.OBS when cleared.
function readMarks(container) {
  const circles = [...plotSvg(container).querySelectorAll("circle")];
  return {
    total: circles.length,
    red: circles.filter(c => c.getAttribute("fill") === CC.THRESH).length,
    blue: circles.filter(c => c.getAttribute("fill") === CC.OBS).length,
    other: circles.filter(c => {
      const f = c.getAttribute("fill");
      return f !== CC.THRESH && f !== CC.OBS;
    }).length,
  };
}

// Stored-mode per-unit reference ticks — short teal verticals, one per unit
// with a finite reference. Distinguished from the axis and its tick marks,
// which are C.AXIS, by the CC.EXP stroke.
function countReferenceTicks(container) {
  return [...plotSvg(container).querySelectorAll("line")]
    .filter(l => l.getAttribute("stroke") === CC.EXP).length;
}

// The four fixtures that make the marking rule falsifiable: a pass-1
// full-value HIGH, a pass-2 near-dup HIGH, the pigeonhole file where the
// near-dup gate suppresses entries that clear the significance cut, and a
// clean file with no spike at all.
const CASES = [
  { file: "13-vfstest-cellcountest.csv", flag: "HIGH" },
  { file: "vfs-b-recurrence-high.csv",   flag: "HIGH" },
  { file: "vfs-a-pigeonhole-clear.csv",  flag: "LOW"  },
  { file: "03-qpcr-clean.csv",           flag: "LOW"  },
];

describe("S385 — VFS per-unit forest", () => {
  const loaded = {};
  beforeAll(async () => {
    for (const { file } of CASES) loaded[file] = await runFixture(file);
  }, 300_000);

  for (const { file, flag } of CASES) {
    it(`${file} — forest mounts, marks track droveVerdict, no third colour state`, () => {
      const { result, importConfig } = loaded[file];
      expect(result).toBeTruthy();
      expect(result.flag).toBe(flag);

      const family = result.allTested || [];
      expect(family.length).toBeGreaterThan(0);

      const { container } = render(
        <MiniCard_ValueFrequency result={result} importConfig={importConfig} rowMap={null} />
      );

      // 1 — the forest is there.
      expect(container.querySelector("svg")).toBeTruthy();

      const marks = readMarks(container);
      const droveCount = family.filter(t => t.droveVerdict === true).length;
      const expectedRows = Math.min(
        Math.max(droveCount, 20),
        family.filter(t => Number.isFinite(t.obs) && Number.isFinite(t.smoothed)).length
      );

      // 2 — every mark is one of the two channel-4 states.
      expect(marks.other).toBe(0);
      expect(marks.total).toBe(expectedRows);
      expect(marks.red + marks.blue).toBe(marks.total);

      // 3 — the marks are the verdict's units, not a re-derived threshold's.
      expect(marks.red).toBe(droveCount);

      // 4 — stored mode: a reference tick per plotted unit.
      expect(countReferenceTicks(container)).toBe(expectedRows);

      // 5 — the row cap is stated, never silent.
      const text = container.textContent;
      if (expectedRows < family.length) {
        expect(text).toContain(`of ${family.length} tested`);
      } else {
        expect(text).toContain(`All ${family.length} tested values shown`);
      }

      // 6 — the evidence table survives underneath, when there is one.
      if ((result.details || []).length > 0) {
        expect(text).toContain("Observed");
        expect(text).toContain("Ratio");
      }
    }, 60_000);
  }

  it("vfs-a-pigeonhole-clear.csv — a re-derived p threshold would mark units the verdict does not", () => {
    // The load-bearing case for gating on `droveVerdict`. This fixture's BH
    // family contains entries below ALPHA.NOTE that the near-dup keep-gate
    // suppressed, so the card reads LOW. If the forest gated on `adjP <
    // ALPHA.NOTE` it would paint red marks on a cleared card. The assertion is
    // that the two counts genuinely differ here — if they ever stop differing,
    // this probe has lost its teeth and should be re-pointed, not deleted.
    const { result, importConfig } = loaded["vfs-a-pigeonhole-clear.csv"];
    const family = result.allTested || [];
    const wouldFlagOnP = family.filter(t => t.adjP < ALPHA.NOTE).length;
    const actuallyDrove = family.filter(t => t.droveVerdict === true).length;

    expect(result.flag).toBe("LOW");
    expect(actuallyDrove).toBe(0);
    expect(wouldFlagOnP).toBeGreaterThan(0);

    const { container } = render(
      <MiniCard_ValueFrequency result={result} importConfig={importConfig} rowMap={null} />
    );
    expect(readMarks(container).red).toBe(0);
  }, 60_000);
});
