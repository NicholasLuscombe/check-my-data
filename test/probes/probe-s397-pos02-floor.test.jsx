/* S397 Part B — pos-02 at the import floor. A SCREEN READ, not an arm.
 *
 * NO GATE IS ANSWERED AND NO ARM IS RUN. The probe mounts `App`, hands
 * `ImportView` pos-02's real bytes through the product's own file input, and
 * then READS the screen. It clicks nothing. The quantity wanted is
 * `sum.nDC` — which the product renders directly as Zone 4's "Data cols"
 * stat (`ImportView.jsx:1152`), so it is read off the surface rather than
 * recomputed.
 *
 * Instrument mechanics copied from `probe-s395-pos01-gates.test.jsx` (the two
 * jsdom polyfills, the real `File`, controls located by the product's own
 * copy). pos-02 is a CSV, so there is no sheet picker.
 *
 * NOT IN A DEFAULT LANE. Gated on FLOOR=1 so `npm test` collects and skips it.
 * Run: FLOOR=1 npx vitest run test/probes/probe-s397-pos02-floor.test.jsx
 */
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import React from "react";

import CheckMyData from "../../src/App.jsx";

const ENABLED = !!process.env.FLOOR;

function corpusDir() {
  if (process.env.CORPUS_DIR) return process.env.CORPUS_DIR;
  const common = execSync("git rev-parse --path-format=absolute --git-common-dir",
    { encoding: "utf-8" }).trim();
  return join(dirname(common), "corpus-data");
}
const DEPOSIT = join(corpusDir(), "round2", "pos-02", "os_cells_new.csv");

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function polyfillArrayBuffer() {
  if (typeof Blob.prototype.arrayBuffer === "function") return "already present";
  Object.defineProperty(Blob.prototype, "arrayBuffer", {
    configurable: true, writable: true,
    value: function () {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
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

async function waitFor(fn, { timeout = 180000, interval = 100, label = "condition" } = {}) {
  const t0 = Date.now();
  for (;;) {
    let v; try { v = fn(); } catch { v = null; }
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${label}`);
    await tick(interval);
  }
}

/* Zone 4's stat grid: <div title?><span>LABEL </span><span>VALUE</span></div>
 * (ImportView.jsx:1163-1167). Anchor on the label span's exact trimmed text so
 * "Data cols" cannot be matched by a containing element. */
function stat(container, label) {
  for (const d of container.querySelectorAll("div")) {
    const spans = d.querySelectorAll(":scope > span");
    if (spans.length !== 2) continue;
    if ((spans[0].textContent || "").trim() === label) return (spans[1].textContent || "").trim();
  }
  return null;
}

const log = (...a) => console.log("   ", ...a);

describe("S397 Part B — pos-02's sum.nDC, as the product renders it", () => {
  it.skipIf(!ENABLED)("reads the import floor without answering any gate", async () => {
    expect(existsSync(DEPOSIT), `deposit missing: ${DEPOSIT}`).toBe(true);
    log("environment:", "arrayBuffer", polyfillArrayBuffer(), "| ResizeObserver", stubResizeObserver());
    const bytes = readFileSync(DEPOSIT);
    log("deposit:", DEPOSIT, `(${bytes.length} bytes)`);

    const { container } = render(<CheckMyData />);
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, {
      target: { files: [new File([bytes], "os_cells_new.csv", { type: "text/csv" })] },
    });

    // Zone 4 renders on `sum` alone (ImportView.jsx:1136), so its appearance
    // is the signal that summarize() ran — independent of any gate.
    await waitFor(() => stat(container, "Data cols") != null ||
                        (container.textContent || "").includes("error"),
                  { label: 'Zone 4 "Data cols"' });
    await tick(250);

    const nDC = stat(container, "Data cols");
    const nR  = stat(container, "Rows");
    const vals = stat(container, "Values");
    const nonNum = stat(container, "Non-numeric");
    const t = (container.textContent || "").replace(/\s+/g, " ");

    log("── the screen ──");
    log(`Zone 4  Rows = ${nR} | Data cols (sum.nDC) = ${nDC} | Values = ${vals} | Non-numeric = ${nonNum}`);
    log(`refusal sentence present ("Assign at least 2 data columns to proceed."): ` +
        t.includes("Assign at least 2 data columns to proceed."));
    log(`column-relationship card present (nDC >= 2, "DATA columns"):            ` +
        /Are the \d+ DATA columns/.test(t));
    log(`row-semantics card present (nDC >= 1, "Is the row order"):              ` +
        t.includes("Is the row order"));
    log(`run-button zone present (nDC >= 2):                                     ` +
        [...container.querySelectorAll("button")].some((b) =>
          ["Run analyses", "Select column relationship above to proceed",
           "Select row order above to proceed"].includes((b.textContent || "").trim())));

    // Corroboration only — the role badges the header row draws, tallied.
    const badges = {};
    for (const el of container.querySelectorAll("th")) {
      const s = (el.textContent || "").trim().toUpperCase();
      if (["DATA", "LABEL", "CONDITION", "ATTRIBUTE", "IGNORE", "OFF"].includes(s))
        badges[s] = (badges[s] || 0) + 1;
    }
    log("role badges in the preview header row:", JSON.stringify(badges));

    expect(nDC).not.toBeNull();
  }, 300000);
});
