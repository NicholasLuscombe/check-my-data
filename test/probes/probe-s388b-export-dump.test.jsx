/* S388 part 2 — the export surfaces, dumped through their REAL composition paths.
 *
 * `22132e4` moved five card headings onto the engine's uncapped totals and left
 * the exports reading the capped array lengths, so on `14-crctest-survey.csv`
 * the card said 42 repeated blocks and the Copy Summary said `blocks=20`. This
 * probe is the PRE/POST instrument for closing that.
 *
 * Four surfaces, each reached the way the product reaches it — no
 * reimplementation, no hand-built importConfig:
 *
 *   1. Copy Summary        — render ReportView, open the actions menu, click
 *                            "Copy summary", read the stubbed clipboard.
 *                            `generateTextSummary` is a closure inside the
 *                            component, so a render is the only real path.
 *   2. HTML report         — same render, click "Export report", capture the
 *                            document written to the stubbed window.open.
 *   3. .xlsx workbook      — call the exported `exportToExcel`, capture the
 *                            Blob at the stubbed URL.createObjectURL, read the
 *                            workbook back and dump every sheet cell.
 *   4. §4 hand-off prompt  — buildHandoffModel + renderPromptBody, the S374 path.
 *
 * The fields each change lives in: `blockCopyTotal` and `rowDupGroupTotal` on
 * `Exact Duplicate Detection` (added at 22132e4), plus the pre-existing
 * `duplicateRows`. Every surface above is dumped verbatim, so any line naming
 * any of them is in the diff.
 *
 * Run: DUMP=1 npx vitest run test/probes/probe-s388b-export-dump.test.jsx
 */
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { writeFileSync } from "fs";
import React from "react";

import { ReportView } from "../../src/components/views/ReportView.jsx";
import { exportToExcel } from "../../src/export/excelExport.js";
import { buildHandoffModel } from "../../src/analysis/handoffModel.js";
import { renderPromptBody } from "../../src/analysis/promptBodyRenderer.js";
import { EXPECTED } from "../batch-fixtures.mjs";
import { buildFixture } from "./s388b-harness.mjs";

const OUT = process.env.OUT || "out-s388b-exports.txt";
const ONLY = process.env.ONLY || null;

function emit(lines, file, surface, text) {
  const body = String(text ?? "<none>").split("\n");
  for (const l of body) lines.push(`${file} | ${surface} | ${l}`);
}

describe("S388 part 2 — export-surface dump", () => {
  it("dumps every export surface for every fixture", async () => {
    const files = ONLY ? [ONLY] : Object.keys(EXPECTED);
    const lines = [];

    for (const file of files) {
      const assay = EXPECTED[file].assay;
      const { results, importConfig, matrix, rowMap } = await buildFixture(file, assay);

      // ── 4. §4 hand-off prompt (no render needed) ──
      const model = buildHandoffModel(results, importConfig, matrix.length, matrix[0]?.length || 0);
      emit(lines, file, "PROMPT", renderPromptBody(model) ?? "<null — outcome 0>");

      // ── 1 + 2. Copy Summary and HTML report, through a real render ──
      let copyText = null, htmlDoc = null;
      const origClip = global.navigator.clipboard;
      const origOpen = global.window.open;
      Object.defineProperty(global.navigator, "clipboard", {
        value: { writeText: async (t) => { copyText = t; } }, configurable: true,
      });
      global.window.open = () => ({
        document: { write: (h) => { htmlDoc = h; }, close: () => {} },
        focus: () => {},
      });
      try {
        const { container } = render(
          <ReportView results={results} importConfig={importConfig} matrix={matrix}
                      rowMap={rowMap} onBack={() => {}} onChangeFile={() => {}} />
        );
        // Both buttons live inside the "⋯ Actions" menu, and each one closes it
        // on click — so the menu is reopened between them.
        const btn = (re) => [...container.querySelectorAll("button")]
          .find(b2 => re.test(b2.textContent || ""));
        const openMenu = () => { const o = btn(/Actions/); if (o) fireEvent.click(o); };
        openMenu();
        const copyBtn = btn(/^Copy summary$/);
        if (!copyBtn) throw new Error("Copy summary button not found");
        await fireEvent.click(copyBtn);
        openMenu();
        const expBtn = btn(/Export report/);
        if (!expBtn) throw new Error("Export report button not found");
        fireEvent.click(expBtn);
      } catch (e) {
        emit(lines, file, "RENDER-ERROR", e.message);
      }
      Object.defineProperty(global.navigator, "clipboard", { value: origClip, configurable: true });
      global.window.open = origOpen;
      emit(lines, file, "COPY", copyText);
      emit(lines, file, "HTML", htmlDoc);

      // ── 3. .xlsx workbook ──
      let sheetDump = null;
      const origCreate = global.URL.createObjectURL;
      const origRevoke = global.URL.revokeObjectURL;
      let blob = null;
      global.URL.createObjectURL = (b) => { blob = b; return "blob:stub"; };
      global.URL.revokeObjectURL = () => {};
      try {
        await exportToExcel({ results, importConfig, matrix, rowMap, mode: "full" });
        if (blob) {
          const XLSX = await import("xlsx");
          // jsdom Blob has no arrayBuffer(), and Response stringifies it —
          // FileReader is the read jsdom actually implements.
          const buf = await new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(new Uint8Array(fr.result));
            fr.onerror = rej;
            fr.readAsArrayBuffer(blob);
          });
          const wb = XLSX.read(buf, { type: "array" });
          const out = [];
          for (const name of wb.SheetNames) {
            if (name === "Annotated Data") continue; // the raw sheet, unrelated
            out.push(`[sheet] ${name}`);
            for (const row of XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 })) {
              out.push(row.map(c => (c === undefined || c === null) ? "" : String(c)).join(" ¦ "));
            }
          }
          sheetDump = out.join("\n");
        }
      } catch (e) {
        sheetDump = `<xlsx error: ${e.message}>`;
      }
      global.URL.createObjectURL = origCreate;
      global.URL.revokeObjectURL = origRevoke;
      emit(lines, file, "XLSX", sheetDump);
    }

    writeFileSync(OUT, lines.join("\n") + "\n");
    expect(lines.length).toBeGreaterThan(0);
  }, 1800000);
});
