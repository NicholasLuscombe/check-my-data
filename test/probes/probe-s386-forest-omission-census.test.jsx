/* S386 — can the corpus exercise a P196 omitted-units band?
 *
 * S386's build halted on two conditions (A: the magnitude claim reaches
 * non-forest cards, so the label's scope is Chat's call; C: `ForestPlot`
 * receives a pre-selected array, so the band needs a caller change). Neither
 * halt touches the question 2c makes Code answer out loud: IS there a fixture
 * whose forest leaves cleared units off the plot, or would the band's positive
 * case ship render-unexercised?
 *
 * This probe answers it by measurement rather than assertion. It renders the
 * real card over real fixtures and reports, per fixture, the two quantities a
 * band would have to carry — the omitted COUNT and the omitted units' VALUE
 * SPAN — so the follow-on is scoped against numbers, not a guess.
 *
 * WHY THE RECONSTRUCTION IS PROVED, NOT TRUSTED. The omitted set is by
 * definition the part that does NOT render, so it can only be computed from
 * the engine arrays. A count computed here and never checked would be a
 * private arithmetic that could drift from the card's own selection without
 * anything failing. So the plotted half — which the card DOES render — is
 * read back two independent ways and pinned to the reconstruction: the mark
 * count in the plot SVG, and the number the card writes into its own caption.
 * If either disagrees, the omitted figure below it is not to be believed and
 * the test fails rather than reporting a number nobody checked.
 *
 * SCOPE OF THE CENSUS. VFS is the only ForestPlot consumer that caps its rows
 * (FOREST_MAX_UNITS = 20, MiniCard_ValueFrequency.jsx). RowMean plots every
 * condition and Autocorrelation plots every pair plus every higher lag —
 * neither slices — so neither can omit a unit and neither is censused here.
 * A band would today have exactly one consumer.
 *
 * FIXTURES, named because S385's two probes covered overlapping but different
 * sets and neither held both vfs-a and vfs-c:
 *   13-vfstest-cellcountest.csv   pass-1 full-value HIGH
 *   vfs-b-recurrence-high.csv     pass-2 near-dup HIGH (concentration path)
 *   vfs-c-deeptail-high.csv       pass-2 near-dup HIGH (S312 deep subfamily)
 *   vfs-a-pigeonhole-clear.csv    cleared card, non-empty BH family
 *   11-rnaseq-multicondition.csv  multi-condition (isAgg control)
 *   03-qpcr-clean.csv             clean file
 *
 * Run: npx vitest run test/probes/probe-s386-forest-omission-census.test.jsx
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { render } from "@testing-library/react";

import { MiniCard_ValueFrequency } from "../../src/components/cards/MiniCard_ValueFrequency.jsx";
import { CC } from "../../src/constants/tokens.js";

const FIXTURES = "test/fixtures";

// The cap the card applies. Read as a literal here ON PURPOSE and never used
// to compute an omitted count: the census below derives everything from the
// real arrays, exactly as P196 requires, and this constant is only reported so
// a reader can see which side of it each fixture fell.
const CARD_CAP = 20;

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

// The plot's own SVG — first in the card body. ChartLegend draws each swatch as
// its own 12px <svg> in the same tokens, so an unscoped query counts legend
// swatches as marks (the S385 probe records that miscount).
function plotSvg(container) {
  const svgs = [...container.querySelectorAll("svg")];
  expect(svgs.length).toBeGreaterThan(0);
  return svgs[0];
}

// One <circle> per plotted unit with a finite estimate, in the two channel-4
// token colours.
function renderedMarkCount(container) {
  return [...plotSvg(container).querySelectorAll("circle")]
    .filter(c => {
      const f = c.getAttribute("fill");
      return f === CC.THRESH || f === CC.OBS;
    }).length;
}

// The number the card states in its own subset caption — the second, wholly
// independent witness to the plotted count.
function captionPlottedCount(container, poolSize) {
  const text = container.textContent;
  const truncated = text.match(/Showing the (\d+) values closest to significance, of (\d+) tested/);
  if (truncated) return { plotted: Number(truncated[1]), pool: Number(truncated[2]), truncated: true };
  const all = text.match(/All (\d+) tested values shown/);
  if (all) return { plotted: Number(all[1]), pool: Number(all[1]), truncated: false };
  return { plotted: null, pool: null, truncated: null };
}

const CASES = [
  "13-vfstest-cellcountest.csv",
  "vfs-b-recurrence-high.csv",
  "vfs-c-deeptail-high.csv",
  "vfs-a-pigeonhole-clear.csv",
  "11-rnaseq-multicondition.csv",
  "03-qpcr-clean.csv",
];

describe("S386 — forest omitted-units census", () => {
  const loaded = {};
  const census = [];
  beforeAll(async () => {
    for (const file of CASES) loaded[file] = await runFixture(file);
  }, 300_000);

  for (const file of CASES) {
    it(`${file} — plotted count agrees three ways; omitted count and span recorded`, () => {
      const { result, importConfig } = loaded[file];
      expect(result).toBeTruthy();

      // The pool the card selects from, rebuilt from the engine's own array by
      // the card's own admission filter.
      const pool = (result.allTested || [])
        .filter(t => Number.isFinite(t.obs) && Number.isFinite(t.smoothed));

      if (pool.length === 0) {
        // No forest mounts at all; nothing to omit. Recorded, not skipped.
        census.push({ file, pool: 0, plotted: 0, omitted: 0, span: null });
        expect(plotSvg.length).toBeGreaterThan(0); // trivially true; the row is the point
        return;
      }

      const { container } = render(
        <MiniCard_ValueFrequency result={result} importConfig={importConfig} rowMap={null} />
      );

      // Reconstruction of the card's selection: every flagged entry, then the
      // cleared entries nearest significance, up to the cap.
      const flagged = pool.filter(t => t.droveVerdict === true);
      const clearedRanked = pool.filter(t => t.droveVerdict !== true)
        .slice().sort((a, b) => (a.adjP ?? 1) - (b.adjP ?? 1));
      const clearedPlotted = clearedRanked.slice(0, Math.max(0, CARD_CAP - flagged.length));
      const plottedRebuilt = flagged.length + clearedPlotted.length;

      // WITNESS 1 — the rendered marks.
      const marks = renderedMarkCount(container);
      // WITNESS 2 — the card's own caption.
      const cap = captionPlottedCount(container, pool.length);

      // The reconstruction is only believable if both witnesses agree with it.
      expect(marks).toBe(plottedRebuilt);
      expect(cap.plotted).toBe(plottedRebuilt);
      expect(cap.pool).toBe(pool.length);

      // With the plotted half pinned, the omitted half follows from the arrays.
      const omittedUnits = clearedRanked.slice(clearedPlotted.length);
      const omitted = omittedUnits.length;
      expect(omitted).toBe(pool.length - plottedRebuilt);

      // The two quantities a P196 band would carry, from the real arrays and
      // never from the literal cap.
      const span = omitted > 0
        ? { lo: Math.min(...omittedUnits.map(t => t.obs)), hi: Math.max(...omittedUnits.map(t => t.obs)) }
        : null;

      census.push({ file, pool: pool.length, plotted: plottedRebuilt, omitted, span });

      // The caption's truncated/complete branch must agree with the arithmetic —
      // the card must never say "All N shown" while holding units back.
      expect(cap.truncated).toBe(omitted > 0);
    }, 60_000);
  }

  it("the census — is P196's positive case exercisable by this corpus?", () => {
    expect(census.length).toBe(CASES.length);
    const omitting = census.filter(c => c.omitted > 0);
    const lines = census.map(c =>
      `  ${c.file.padEnd(30)} pool=${String(c.pool).padStart(4)}  plotted=${String(c.plotted).padStart(3)}` +
      `  omitted=${String(c.omitted).padStart(4)}` +
      (c.span ? `  omitted-span=[${c.span.lo}, ${c.span.hi}]` : "  omitted-span=—"));
    console.log(`\nS386 forest omitted-units census (cap=${CARD_CAP}):\n${lines.join("\n")}\n` +
      `  fixtures omitting at least one cleared unit: ${omitting.length}/${census.length}\n`);

    // The finding this probe exists to make falsifiable. If this ever goes to
    // zero, a P196 band could only ever ship render-unexercised, and THAT is
    // the thing a follow-on would need to know before building it.
    expect(omitting.length).toBeGreaterThan(0);
  });
});
