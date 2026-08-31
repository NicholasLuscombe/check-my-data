/* S397 Part B — does the block picker render, and is a header BAND what triggers it?
 *
 * READ-ONLY. No gate is answered, no run button is clicked, no arm is run. The
 * probe loads a deposit through the product's own file input, picks the §6.2
 * sheet from the product's own picker where there is one, and then READS the
 * screen for the block picker's own copy.
 *
 * THE QUESTION. S395's structure census records SPANNING HEADER BANDS on four
 * round-2 deposits — pos-01 (3), pos-14 (4), pos-35 (4), pos-43 (2). Whether a
 * band is what raises the block picker had not been confirmed. `detectBlocks`
 * (parser.js:62-72) splits on FULLY BLANK ROWS and returns `[rows]` unless two
 * or more runs of >= 2 rows survive; a band is a spanning label ACROSS columns.
 * Different axes. This drives it rather than arguing it.
 *
 * pos-43 is the positive control: the committed ranking artifact records
 * `detectBlocksSplit: true` for it and false for the other three, so a run that
 * finds the picker nowhere would be measuring a broken probe.
 *
 * NOT IN A DEFAULT LANE. Gated on BLOCKS=1 so `npm test` collects and skips it.
 * Run: BLOCKS=1 npx vitest run test/probes/probe-s397-block-picker.test.jsx
 */
import { describe, it, expect } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import React from "react";

import CheckMyData from "../../src/App.jsx";

const ENABLED = !!process.env.BLOCKS;

function corpusDir() {
  if (process.env.CORPUS_DIR) return process.env.CORPUS_DIR;
  const common = execSync("git rev-parse --path-format=absolute --git-common-dir",
    { encoding: "utf-8" }).trim();
  return join(dirname(common), "corpus-data");
}

/* The four the census gives bands to, plus their band count, plus what the
 * committed ranking artifact says `detectBlocks` did on the harness path. */
const CASES = [
  { pos: "pos-01", file: "micro_data_compiled.xlsx",                 sheet: "1300-3",   bands: 3, harnessSplit: false },
  { pos: "pos-14", file: "Rawdata_Figures_Tables_TSA.xlsx",          sheet: "Figure 2", bands: 4, harnessSplit: false },
  { pos: "pos-35", file: "AgeRelatedChangesInAcousticCues_data.csv", sheet: null,       bands: 4, harnessSplit: false },
  { pos: "pos-43", file: "Isoodon_data_raw_only.csv",                sheet: null,       bands: 2, harnessSplit: true  },
];

const PICKER = "Multiple data blocks detected";   // ImportView.jsx:760
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const buttons = (c) => [...c.querySelectorAll("button")];

function polyfillArrayBuffer() {
  if (typeof Blob.prototype.arrayBuffer === "function") return "already present";
  Object.defineProperty(Blob.prototype, "arrayBuffer", {
    configurable: true, writable: true,
    value: function () {
      return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result); r.onerror = () => rej(r.error);
        r.readAsArrayBuffer(this);
      });
    },
  });
  return "polyfilled (jsdom omits Blob.prototype.arrayBuffer)";
}
function stubResizeObserver() {
  if (typeof globalThis.ResizeObserver === "function") return "already present";
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  return "stubbed (jsdom ships no ResizeObserver)";
}
async function waitFor(fn, { timeout = 180000, interval = 50, label = "condition" } = {}) {
  const t0 = Date.now();
  for (;;) {
    let v; try { v = fn(); } catch { v = null; }
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${label}`);
    await tick(interval);
  }
}

describe("S397 Part B — the block picker, driven", () => {
  it.skipIf(!ENABLED)("reads whether a band raises the block picker", async () => {
    console.log("   env:", "arrayBuffer", polyfillArrayBuffer(), "| ResizeObserver", stubResizeObserver());
    const out = [];
    for (const c of CASES) {
      const path = join(corpusDir(), "round2", c.pos, c.file);
      expect(existsSync(path), `deposit missing: ${path}`).toBe(true);
      const { container } = render(<CheckMyData />);
      fireEvent.change(container.querySelector('input[type="file"]'),
        { target: { files: [new File([readFileSync(path)], c.file)] } });

      // Sheet picker where the workbook has one; CSVs go straight through.
      const state = await waitFor(() => (
        container.textContent.includes("Select sheet") ? "picker"
        : container.textContent.includes(PICKER) ? "blocks"
        : container.textContent.includes("Review columns") ? "loaded"
        : container.textContent.includes("import error") ? "error" : null
      ), { label: `${c.pos}: the import to settle` });
      if (state === "error") throw new Error(`${c.pos}: product reported an import error`);
      if (state === "picker") {
        const b = buttons(container).find((x) => (x.textContent || "").trim() === c.sheet);
        expect(b, `${c.pos}: sheet "${c.sheet}" not offered`).toBeTruthy();
        fireEvent.click(b);
        await waitFor(() => container.textContent.includes("Review columns") ||
                            container.textContent.includes(PICKER),
                      { label: `${c.pos}: the sheet to load` });
      }
      await tick(200);

      const t = container.textContent || "";
      const shown = t.includes(PICKER);
      /* Each block button renders "Block N" then "<dataRows> data rows, <cols> cols"
       * then a preview (ImportView.jsx:766-770). Captured, because the count alone
       * does not say what selecting block 1 costs — and block 1 is what the product
       * pre-selects (`loadBlock(det[0])`, :751) and what `prepStructure` takes. */
      const blockBtns = buttons(container)
        .map((b) => (b.textContent || "").trim())
        .filter((t) => /^Block \d+/.test(t));
      out.push({ ...c, shown, nBlocks: blockBtns.length, blockBtns });
      cleanup();
    }

    console.log("\n   pos      bands  harness detectBlocksSplit   picker rendered?   Block buttons");
    for (const r of out) {
      console.log("   " + r.pos.padEnd(9) + String(r.bands).padStart(3) + "    " +
        String(r.harnessSplit).padEnd(22) + String(r.shown).padEnd(19) + r.nBlocks +
        (r.shown === r.harnessSplit ? "" : "   <-- SHIPPED PATH DISAGREES WITH THE HARNESS"));
    }
    for (const r of out) if (r.blockBtns.length)
      console.log(`   ${r.pos} blocks, as the picker labels them:\n      ` +
        r.blockBtns.map((t) => t.replace(/\s+/g, " ")).join("\n      "));
    const byBands = [...out].sort((a, b) => b.bands - a.bands);
    console.log("\n   bands descending:", byBands.map((r) => `${r.pos}(${r.bands} bands, picker=${r.shown})`).join("  "));
    console.log("   => a band is what triggers the picker:",
      byBands.every((r, i) => i === 0 || (byBands[i - 1].shown || !r.shown)) && out.every(r => r.shown === (r.bands >= 2)));

    // The positive control must fire, or the whole table is a broken probe.
    expect(out.find((r) => r.pos === "pos-43").shown,
      "pos-43 is the positive control and the picker did not render").toBe(true);
  }, 900000);
});
