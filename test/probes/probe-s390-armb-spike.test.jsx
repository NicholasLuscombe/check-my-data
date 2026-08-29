/* S390 — arm-B spike: can arm B be produced by driving `ImportView`, or is it
 * thirty hand-runs?
 *
 * ROUND 2 §6.5 leaves one thing open before acquisition: how arm B is executed.
 * Arm B is the same deposit with grouping and row semantics answered from the
 * file's own structure, "as a user at ImportView would answer them". Either a
 * probe can drive those controls or thirty deposits are thirty browser sessions.
 *
 * THE RULE THIS PROBE IS WRITTEN UNDER — toggle, do not port. It drives the
 * product's own controls and reads the product's own rendered verdict. It does
 * NOT set component state, does NOT call setRoles/setColRelationship, and does
 * NOT rebuild the config `ImportView` composes at its `handleProceed`
 * (ImportView.jsx:588-655). A probe adjudicating two implementations must not
 * become a third.
 *
 * WHY IT MOUNTS `App` AND NOT `ImportView`. `ImportView` hands its config to an
 * `onProceed` prop; the run itself lives in App.jsx's `handleProceed`
 * (App.jsx:29-67) — dataColHeaders derivation, the `colRelationship||'replicates'`
 * fallback, the `vstDecision !== undefined` branch, the runFullAnalysis call.
 * Mounting `ImportView` alone and re-creating those eight lines in the probe
 * would be a port of the run wiring. Mounting `App` ports nothing: the product
 * imports the file, builds its own config, runs its own analysis and renders its
 * own verdict, and the probe only clicks and reads.
 *
 * WHAT IS READ. §1's VerdictBanner (VerdictBanner.jsx:179-198). Its action
 * one-liner is `VERDICT_TEXT[severity].sub`, which is mode-agnostic and 1:1 with
 * severity, and its count clause prints "N high-severity finding(s) and M
 * moderate finding(s)" verbatim. Severity is recovered by matching the rendered
 * sub against the product's own VERDICT_TEXT table — a lookup in the same
 * constant the banner rendered from, not a re-derivation.
 *
 * CORPUS. `corpus-data/` is gitignored (.gitignore:61), so it exists in the MAIN
 * CHECKOUT and in no worktree. Resolved via the git common dir; override with
 * CORPUS_DIR.
 *
 * NOT IN A DEFAULT LANE. Gated on ARMB=1 so `npm test` collects and skips it.
 *
 * Run: ARMB=1 npx vitest run test/probes/probe-s390-armb-spike.test.jsx
 */
import { describe, it, expect } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import React from "react";

import CheckMyData from "../../src/App.jsx";
import { VERDICT_TEXT } from "../../src/analysis/narrative.js";

const ENABLED = !!process.env.ARMB;

/* corpus-data lives in the main checkout only. */
function corpusDir() {
  if (process.env.CORPUS_DIR) return process.env.CORPUS_DIR;
  const common = execSync("git rev-parse --path-format=absolute --git-common-dir", {
    encoding: "utf-8",
  }).trim();
  return join(dirname(common), "corpus-data");
}

/* A real File, carrying the bytes off disk. The browser hands ImportView a File
 * whose .arrayBuffer() resolves; whether jsdom's does is an environment fact and
 * is asserted in step 0 below rather than assumed. */
function fileFrom(path) {
  const buf = readFileSync(path);
  const name = path.split("/").pop();
  return new File([buf], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/* ── The one environment gap, and it is jsdom's, not the product's ──────────
 * A browser File carries `.arrayBuffer()`. jsdom 25's does not, so
 * `getSheetNames(file)` (excel.js:30) throws and ImportView renders its own
 * "Excel import error: file.arrayBuffer is not a function". This restores the
 * browser behaviour on Blob.prototype using the FileReader jsdom DOES ship, so
 * the product's import path runs unmodified.
 *
 * This is environment plumbing, not a port: it re-creates a standard browser API
 * jsdom omits. It changes nothing in src/ and reimplements nothing ImportView
 * does. It is reported as a finding, not buried. */
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

/* Poll the DOM for a condition the product reaches asynchronously (FileReader,
 * dynamic import of SheetJS, the analysis itself). No fake timers: the engine's
 * Blocked-Mahalanobis loop yields on real setTimeout. */
async function waitFor(fn, { timeout = 20000, interval = 25, label = "condition" } = {}) {
  const t0 = Date.now();
  for (;;) {
    let v;
    try { v = fn(); } catch (e) { v = null; }
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${label}`);
    await tick(interval);
  }
}

const buttons = (c) => [...c.querySelectorAll("button")];

/* Controls are located by the product's OWN description copy, which is unique
 * per option and cannot be confused the way "Replicates" / "Non-replicates" can:
 *   ImportView.jsx:993   "Columns measure the same thing"      → replicates
 *   ImportView.jsx:1004  "Columns measure different things"    → non-replicates
 *   ImportView.jsx:1052  "Row order carries forensic meaning"  → ordered
 *   ImportView.jsx:1063  "Row order is not meaningful"         → arbitrary */
const CONTROL = {
  replicates: "Columns measure the same thing",
  conditions: "Columns measure different things",
  ordered: "Row order carries forensic meaning",
  arbitrary: "Row order is not meaningful",
};

function control(container, key) {
  const needle = CONTROL[key];
  const hits = buttons(container).filter((b) => (b.textContent || "").includes(needle));
  if (hits.length !== 1) {
    throw new Error(`control "${key}" matched ${hits.length} buttons (expected 1)`);
  }
  return hits[0];
}

/* Recover severity by matching the banner's rendered action one-liner against
 * the product's own VERDICT_TEXT table. VerdictBanner.jsx:181 renders
 * `v.sub` verbatim and `sub` is mode-agnostic and 1:1 with severity. This is a
 * lookup in the constant the banner rendered from, not a re-derivation. */
function readVerdict(container) {
  const text = container.textContent || "";
  let severity = null;
  for (const k of [3, 2, 1, 0]) {
    if (text.includes(VERDICT_TEXT[k].sub)) { severity = k; break; }
  }
  if (severity === null) return null;
  // VerdictBanner.jsx:185-193 — three branches, all read here.
  let high = 0, mod = 0;
  const both = text.match(/(\d+) high-severity finding(?:s)? and (\d+) moderate finding/);
  const hOnly = text.match(/(\d+) high-severity finding(?:s)? across/);
  const mOnly = text.match(/(\d+) moderate finding(?:s)? across/);
  if (both) { high = +both[1]; mod = +both[2]; }
  else if (hOnly) { high = +hOnly[1]; }
  else if (mOnly) { mod = +mOnly[1]; }
  return { severity, high, mod };
}

/* One arm, end to end, entirely through the product's own controls.
 * `colRel` / `rowSem` null means "leave whatever the product resolved". */
async function runArm({ path, sheet, colRel, rowSem, log = () => {} }) {
  polyfillArrayBuffer();
  const t0 = Date.now();
  const { container } = render(<CheckMyData />);

  // 1 — load the file through the shipped input
  const input = container.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [fileFrom(path)] } });

  // 2 — sheet picker (multi-sheet workbooks only)
  const needsPicker = await waitFor(
    () => (container.textContent.includes("Select sheet") ? "picker"
        : container.textContent.includes("Run analyses") ? "loaded"
        : container.textContent.includes("Select column relationship") ? "loaded"
        : container.textContent.includes("import error") ? "error" : null),
    { label: "sheet picker or loaded data" });
  if (needsPicker === "error") throw new Error("product reported an import error: " + container.textContent.slice(0, 300));
  /* The picker renders `wb.SheetNames` in order (ImportView.jsx:746), so this
   * is a direct read of the workbook's sheet order — which is what ROUND2 §7
   * asks to be recorded per deposit alongside the chosen sheet. */
  let sheetNames = null, sheetIndex = null;
  if (needsPicker === "picker") {
    const opts = [...container.querySelectorAll("button")]
      .filter((b) => b.closest("div") && /Select sheet/.test(container.textContent))
      .map((b) => (b.textContent || "").trim());
    const start = opts.indexOf(opts.find((o) => o.length));
    sheetNames = opts.slice(start).filter((o) => o && !/^(Upload file|Batch analysis)$/.test(o));
    sheetIndex = sheetNames.indexOf(sheet);
    const b = buttons(container).find((x) => (x.textContent || "").trim() === sheet);
    if (!b) throw new Error(`sheet "${sheet}" not offered; offered: ${sheetNames.join(" | ")}`);
    fireEvent.click(b);
  } else {
    sheetIndex = 0; // single-sheet workbook / csv — no picker shown
  }

  // 3 — wait for the gate cards to exist at all
  await waitFor(() => {
    try { control(container, "replicates"); control(container, "ordered"); return true; }
    catch { return false; }
  }, { label: "the two gate cards" });

  const preRun = container.textContent;
  log("gates as the product resolved them (before any click): " +
      `colRel=${/Columns measure the same thing/.test(preRun) ? "card present" : "absent"}` +
      ` | Auto badges on screen: ${(preRun.match(/Auto/g) || []).length}` +
      ` | run label: "${(byRunLabel(container) || {}).textContent || "<no run button>"}"`);

  // 4 — answer the two gates by clicking the product's buttons
  if (colRel) fireEvent.click(control(container, colRel));
  if (rowSem) fireEvent.click(control(container, rowSem));

  // 5 — start the run the way a user does
  const runBtn = byRunLabel(container);
  if (!runBtn) throw new Error("no run button rendered");
  if (runBtn.disabled) throw new Error(`run button disabled: "${runBtn.textContent}"`);
  const runLabel = runBtn.textContent;
  fireEvent.click(runBtn);

  // 6 — read the product's own verdict off §1
  const verdict = await waitFor(() => readVerdict(container), { label: "the rendered verdict" });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  cleanup();
  return { ...verdict, runLabel, secs: +secs, sheetIndex, nSheets: sheetNames ? sheetNames.length : 1 };
}

const byRunLabel = (c) => buttons(c).find((b) =>
  /^(Run analyses|Select column relationship above to proceed|Select row order above to proceed)$/
    .test((b.textContent || "").trim()));

const C10 = () => join(corpusDir(), "C10.xlsx");
const SHEET = "Exiguobacterium sp. Experiment1";

/* The batch arm, also entirely through the product: ImportView's own
 * "Batch analysis" button → BatchView's own file input → its own "Run All".
 * BatchView takes SheetNames[0] and never asks (excel.js:51, BatchView.jsx:44),
 * so no sheet is chosen here — which is the point of the arm. Its results table
 * renders severity / Flagged / Noted as its own columns (BatchView.jsx:455-461). */
async function runBatchArm({ path, log = () => {} }) {
  polyfillArrayBuffer();
  const t0 = Date.now();
  const { container } = render(<CheckMyData />);

  const toBatch = buttons(container).find((b) => /^Batch analysis$/.test((b.textContent || "").trim()));
  if (!toBatch) throw new Error("no Batch analysis button on the import screen");
  fireEvent.click(toBatch);

  await waitFor(() => container.textContent.includes("Batch analysis") &&
    container.querySelector('input[type="file"][multiple]'), { label: "batch drop zone" });
  const input = container.querySelector('input[type="file"][multiple]');
  fireEvent.change(input, { target: { files: [fileFrom(path)] } });

  const runAll = await waitFor(
    () => buttons(container).find((b) => /^Run All/.test((b.textContent || "").trim())),
    { label: "Run All button" });
  log(`queued: "${runAll.textContent.trim()}"`);
  fireEvent.click(runAll);

  const row = await waitFor(() => {
    const tr = [...container.querySelectorAll("tbody tr")]
      .find((r) => (r.textContent || "").includes("C10.xlsx"));
    if (!tr) return null;
    const tds = [...tr.querySelectorAll("td")];
    if (tds.length < 6) return null;
    const sev = (tds[3].textContent || "").trim();
    if (!/^[0-3]$|^ERROR$/.test(sev)) return null;
    return { sev, high: (tds[4].textContent || "").trim(), mod: (tds[5].textContent || "").trim(),
             tests: (tds[6].textContent || "").trim() };
  }, { label: "the batch results row" });

  const secs = +(((Date.now() - t0) / 1000).toFixed(1));
  cleanup();
  return {
    severity: row.sev === "ERROR" ? "ERROR" : +row.sev,
    high: row.high === "\u2014" ? 0 : +row.high,
    mod: row.mod === "\u2014" ? 0 : +row.mod,
    flaggedTests: row.tests, secs,
  };
}

describe.skipIf(!ENABLED)("S390 — arm-B spike", () => {
  it("part 1 — mounts App and loads a real file through the shipped input", async () => {
    const path = C10();
    expect(existsSync(path), `corpus file missing: ${path}`).toBe(true);
    console.log("[p1] Blob.arrayBuffer:", polyfillArrayBuffer());
    const file = fileFrom(path);
    console.log("[p1] File ctor:", file.constructor.name, "| size:", file.size,
      "| has arrayBuffer:", typeof file.arrayBuffer === "function");

    const { container } = render(<CheckMyData />);
    const input = container.querySelector('input[type="file"]');
    expect(input, "no file input rendered").toBeTruthy();
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => container.textContent.includes("Select sheet"), { label: "sheet picker" });
    const sheets = buttons(container).filter((b) => /Experiment\d/.test(b.textContent || ""));
    console.log("[p1] sheet picker offered", sheets.length, "sheets:",
      sheets.map((b) => b.textContent).join(" | "));
    expect(sheets.length).toBe(9);
    cleanup();
  }, 60000);

  it("part 2 — drives both gates and the run button as a user does", async () => {
    /* THE NEGATIVE CONTROL. A probe that reached a verdict without the clicks
     * mattering would be measuring a default and reporting it as an answer. So
     * the blocked state is asserted BEFORE any gate is clicked, and the released
     * state after — the click is shown to be load-bearing rather than assumed. */
    polyfillArrayBuffer();
    const { container } = render(<CheckMyData />);
    fireEvent.change(container.querySelector('input[type="file"]'),
      { target: { files: [fileFrom(C10())] } });
    await waitFor(() => container.textContent.includes("Select sheet"), { label: "sheet picker" });
    fireEvent.click(buttons(container).find((b) => (b.textContent || "").trim() === SHEET));
    await waitFor(() => { try { control(container, "replicates"); return true; } catch { return false; } },
      { label: "gate cards" });

    const before = byRunLabel(container);
    console.log("[p2] before any click — run button:",
      JSON.stringify(before.textContent.trim()), "| disabled:", before.disabled);
    expect(before.disabled, "run button was NOT blocked before the gates were answered").toBe(true);
    expect(before.textContent.trim()).toBe("Select column relationship above to proceed");

    fireEvent.click(control(container, "conditions"));
    const after = byRunLabel(container);
    console.log("[p2] after clicking Non-replicates — run button:",
      JSON.stringify(after.textContent.trim()), "| disabled:", after.disabled);
    expect(after.disabled).toBe(false);
    expect(after.textContent.trim()).toBe("Run analyses");
    cleanup();

    const log = (m) => console.log("[p2]", m);
    const r = await runArm({ path: C10(), sheet: SHEET, colRel: "conditions", rowSem: "ordered", log });
    console.log("[p2] verdict:", JSON.stringify(r));
    expect(r.severity).not.toBeNull();
  }, 300000);

  it("part 3 — reproduces S383's four runs on C10 :: Exiguobacterium sp. Experiment1", async () => {
    /* S383 / P186, as recorded. The probe agrees with the hand measurement or it
     * does not; nothing here is adjusted to make it agree.
     * C10 is NOT adjudicated. These numbers say what the tool returns under four
     * sets of answers. They say nothing about whether the deposit is sound. */
    const RECORDED = [
      { arm: "1 batch default",              sev: 3, high: null, mod: null },
      { arm: "2 ImportView replicates/ordered", sev: 3, high: null, mod: null },
      { arm: "3 ImportView non-replicates",     sev: 1, high: 0,    mod: 1 },
      { arm: "4 arm 3, row semantics varied",   sev: 1, high: 0,    mod: 1 },
    ];

    const got = [];
    got.push({ ...(await runBatchArm({ path: C10(), log: (m) => console.log("[p3]", m) })),
               arm: "1 batch default", answers: "none — BatchView asks nothing" });
    got.push({ ...(await runArm({ path: C10(), sheet: SHEET, colRel: "replicates", rowSem: "ordered" })),
               arm: "2 ImportView replicates/ordered", answers: "replicates + ordered" });
    got.push({ ...(await runArm({ path: C10(), sheet: SHEET, colRel: "conditions", rowSem: "ordered" })),
               arm: "3 ImportView non-replicates", answers: "non-replicates + ordered" });
    got.push({ ...(await runArm({ path: C10(), sheet: SHEET, colRel: "conditions", rowSem: "arbitrary" })),
               arm: "4 arm 3, row semantics varied", answers: "non-replicates + arbitrary" });

    console.log("\n[p3] " + "arm".padEnd(34) + "answers".padEnd(30) +
      "recorded".padEnd(22) + "probe".padEnd(22) + "s");
    const rows = [];
    for (let i = 0; i < got.length; i++) {
      const g = got[i], r = RECORDED[i];
      const rec = `sev ${r.sev}` + (r.high === null ? "" : `  H=${r.high} M=${r.mod}`);
      const obs = `sev ${g.severity}  H=${g.high} M=${g.mod}`;
      const agree = g.severity === r.sev &&
        (r.high === null || (g.high === r.high && g.mod === r.mod));
      rows.push({ ...g, recorded: rec, observed: obs, agree });
      console.log("[p3] " + g.arm.padEnd(34) + g.answers.padEnd(30) +
        rec.padEnd(22) + obs.padEnd(22) + g.secs + (agree ? "" : "   <-- DISAGREES"));
    }
    console.log("[p3] arm 1 flagged tests as the batch table printed them:",
      JSON.stringify(got[0].flaggedTests));
    console.log("[p3] arms 3 and 4 identical:",
      got[2].severity === got[3].severity && got[2].high === got[3].high && got[2].mod === got[3].mod);
    console.log("[p3] total wall clock for four arms:",
      got.reduce((a, g) => a + g.secs, 0).toFixed(1), "s");

    for (const r of rows) expect(r.agree, `${r.arm}: recorded ${r.recorded}, probe ${r.observed}`).toBe(true);
  }, 600000);

  it("part 4 — cost, and thirty runs as a loop rather than thirty edits", async () => {
    /* The sheet and the two answers are already inputs to runArm. This drives a
     * manifest — the same shape ROUND2 §6.2/§7 needs per deposit — to show that
     * scaling is a longer list, not a longer probe. Override with
     * ARMB_MANIFEST=<file.json>; the default is three C10 sheets so the spike
     * stays cheap and still proves the loop. */
    const manifest = process.env.ARMB_MANIFEST
      ? JSON.parse(readFileSync(process.env.ARMB_MANIFEST, "utf-8"))
      : [
          { label: "C10 :: Exiguobacterium sp. Experiment1", file: "C10.xlsx",
            sheet: "Exiguobacterium sp. Experiment1", colRel: "conditions", rowSem: "ordered" },
          { label: "C10 :: B. pumilus Experiment1", file: "C10.xlsx",
            sheet: "B. pumilus Experiment1", colRel: "conditions", rowSem: "ordered" },
          { label: "C10 :: B. cereus Experiment1", file: "C10.xlsx",
            sheet: "B. cereus Experiment1", colRel: "replicates", rowSem: "ordered" },
        ];

    console.log("\n[p4] " + "deposit".padEnd(42) + "answers".padEnd(30) +
      "sheet".padEnd(10) + "arm B".padEnd(22) + "s");
    let total = 0;
    for (const e of manifest) {
      const r = await runArm({ path: join(corpusDir(), e.file), sheet: e.sheet,
                               colRel: e.colRel, rowSem: e.rowSem });
      total += r.secs;
      console.log("[p4] " + e.label.padEnd(42) +
        `${e.colRel}/${e.rowSem}`.padEnd(30) +
        `${r.sheetIndex}/${r.nSheets}`.padEnd(10) +
        `sev ${r.severity}  H=${r.high} M=${r.mod}`.padEnd(22) + r.secs);
      expect(r.severity).not.toBeNull();
    }
    const mean = total / manifest.length;
    console.log(`[p4] ${manifest.length} arm-B runs in ${total.toFixed(1)} s; mean ${mean.toFixed(1)} s/run`);
    console.log(`[p4] projection — 30 deposits, arm B only: ${(mean * 30 / 60).toFixed(1)} min`);
  }, 900000);
});
