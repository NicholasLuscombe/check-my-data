/* S395 read two — what the PRODUCT does with pos-01's two import gates.
 * READ-ONLY, and it stops before either gate is answered.
 *
 * NEITHER GATE IS ANSWERED AND NEITHER ARM IS RUN. The probe mounts `App`,
 * hands `ImportView` the deposit's real bytes, picks the §6.2-selected sheet
 * from the product's own picker, and then READS the screen. It clicks no gate
 * button and no run button. §14.3 and the S395 dispatch both forbid answering;
 * a screen read is not an answer.
 *
 * Instrument. Same mechanics as `probe-s390-armb-spike.test.jsx`, which ROUND2
 * §8 pre-registers as arm B — the two jsdom polyfills, the real `File`, the
 * sheet picker, and controls located by the product's OWN option copy. Nothing
 * is ported: the probe sets no state and rebuilds no config.
 *
 * NAMING HAZARD. `s395-corpus-run-hook.mjs` and `probe-s395-role-inversion.mjs`
 * are S394's. This file, `probe-s395-pos01-structure.mjs` and
 * `probe-s395-pos01-trigger.mjs` are S395's.
 *
 * NOT IN A DEFAULT LANE. Gated on GATES=1 so `npm test` collects and skips it.
 *
 * Run: GATES=1 npx vitest run test/probes/probe-s395-pos01-gates.test.jsx
 */
import { describe, it, expect } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import React from "react";

import CheckMyData from "../../src/App.jsx";
import { GroupingConfirmCard } from "../../src/components/forensics/GroupingConfirmCard.jsx";

const ENABLED = !!process.env.GATES;
const SHEET = "1300-3";

function corpusDir() {
  if (process.env.CORPUS_DIR) return process.env.CORPUS_DIR;
  const common = execSync("git rev-parse --path-format=absolute --git-common-dir",
    { encoding: "utf-8" }).trim();
  return join(dirname(common), "corpus-data");
}
const DEPOSIT = join(corpusDir(), "round2", "pos-01", "micro_data_compiled.xlsx");

function fileFrom(path) {
  return new File([readFileSync(path)], path.split("/").pop(),
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/* The two jsdom gaps, declared exactly as S390 declares them: standard browser
 * APIs jsdom omits, restored so the product's own path runs unmodified. */
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

async function waitFor(fn, { timeout = 30000, interval = 25, label = "condition" } = {}) {
  const t0 = Date.now();
  for (;;) {
    let v; try { v = fn(); } catch { v = null; }
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${label}`);
    await tick(interval);
  }
}
const buttons = (c) => [...c.querySelectorAll("button")];

/* Located by the product's own option copy (ImportView.jsx:993, :1004, :1052,
 * :1063), which is unique per option where the button headings are not. */
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
/* The card a control sits in: the smallest element containing both of that
 * card's option strings AND that card's own question text. Read per card so a
 * REQUIRED badge is attributed to the card that rendered it rather than to the
 * page.
 *
 * The question anchor is load-bearing and was added after a first version got
 * it wrong. Matching on the two option strings ALONE returns the inner
 * button-row div (ImportView.jsx:985, :1042), which is smaller than the card
 * and contains neither the question, the REQUIRED badge (:981, :1038) nor the
 * tail (:1009, :1068) — so every one of those read absent on a screen that may
 * well be showing them. Anchor on something the card has and the button row
 * does not. */
const QUESTION = {
  col: "DATA columns",       // ImportView.jsx:980
  row: "Is the row order",   // ImportView.jsx:1037
};
function cardFor(container, keyA, keyB, qKey) {
  const a = CONTROL[keyA], b = CONTROL[keyB], q = QUESTION[qKey];
  const hits = [...container.querySelectorAll("div")].filter((d) => {
    const t = d.textContent || "";
    return t.includes(a) && t.includes(b) && t.includes(q);
  });
  if (!hits.length) throw new Error(`no card containing "${a}", "${b}" and "${q}"`);
  return hits.reduce((m, d) => (d.textContent.length < m.textContent.length ? d : m), hits[0]);
}
/* The run button, by the three labels ImportView.jsx:1273-1277 can give it. */
const RUN_LABELS = ["Run analyses",
                    "Select column relationship above to proceed",
                    "Select row order above to proceed"];
function runButton(container) {
  return buttons(container).find((b) => RUN_LABELS.includes((b.textContent || "").trim())) || null;
}
/* A button reads as SELECTED when the product put its check glyph or an Auto
 * badge on it — ImportView.jsx:1049/:1050 and :1060/:1061 for row semantics,
 * :991/:992 and :1001/:1002 for the column gate. */
const selected = (btn) => /✓/.test(btn.textContent || "");
const autoBadged = (btn) => /Auto/.test(btn.textContent || "");

const log = (...a) => console.log("   ", ...a);

describe("S395 read two — pos-01's two import gates, as the product renders them", () => {
  it.skipIf(!ENABLED)("reads the gates without answering either", async () => {
    expect(existsSync(DEPOSIT), `deposit missing: ${DEPOSIT}`).toBe(true);
    log("environment:", "arrayBuffer", polyfillArrayBuffer(), "| ResizeObserver", stubResizeObserver());
    log("deposit:", DEPOSIT);

    const { container } = render(<CheckMyData />);
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [fileFrom(DEPOSIT)] } });

    // The sheet picker. Choosing the §6.2-selected sheet is not one of the
    // three gates; it is which sheet is being read.
    const state = await waitFor(() => (
      container.textContent.includes("Select sheet") ? "picker"
      : container.textContent.includes("import error") ? "error" : null
    ), { label: "the sheet picker" });
    expect(state).toBe("picker");
    const sheetBtn = buttons(container).find((b) => (b.textContent || "").trim() === SHEET);
    expect(sheetBtn, `sheet "${SHEET}" not offered`).toBeTruthy();
    log(`sheet picker offered the workbook's sheets; clicked "${SHEET}"`);
    fireEvent.click(sheetBtn);

    // Wait for BOTH gate cards, or say what the screen says instead (S393).
    try {
      await waitFor(() => {
        try { control(container, "replicates"); control(container, "ordered"); return true; }
        catch { return false; }
      }, { label: "the two gate cards" });
    } catch (e) {
      const t = (container.textContent || "").replace(/\s+/g, " ");
      const floor = t.includes("Assign at least 2 data columns to proceed.")
        ? ' — the screen reads "Assign at least 2 data columns to proceed." (ImportView.jsx:938): the PRODUCT is declining this sheet'
        : "";
      throw new Error(e.message + floor + " | screen: " + t.slice(0, 400));
    }

    // ── the read, with nothing clicked ──────────────────────────────────
    const colCard = cardFor(container, "replicates", "conditions", "col");
    const rowCard = cardFor(container, "ordered", "arbitrary", "row");
    const bRep = control(container, "replicates"), bCon = control(container, "conditions");
    const bOrd = control(container, "ordered"),    bArb = control(container, "arbitrary");
    const run = runButton(container);

    const obs = {
      colCardRendered: true,
      colCardRequired: /REQUIRED/.test(colCard.textContent || ""),
      colCardTail: /Select the column relationship before running analysis\./.test(colCard.textContent || ""),
      colPreselected: selected(bRep) || selected(bCon),
      colAutoBadge: autoBadged(bRep) || autoBadged(bCon),
      rowCardRendered: true,
      rowCardRequired: /REQUIRED/.test(rowCard.textContent || ""),
      rowCardTail: /Select the row order before running analysis\./.test(rowCard.textContent || ""),
      rowPreselected: selected(bOrd) || selected(bArb),
      rowAutoBadge: autoBadged(bOrd) || autoBadged(bArb),
      rowAutoSubText: /Auto: (long-format detected|genomics assay|instrument assay)/.exec(rowCard.textContent || "")?.[0] ?? null,
      // TWO numbers, because they are two things and the smaller one is the
      // badge count. A substring scan of the page text also matches "Auto"
      // inside longer copy, so it over-reports; the badge is a <span> whose
      // own trimmed text is exactly "Auto" (ImportView.jsx:1050, :1061, :992,
      // :1002 and the Zone 3 selector).
      autoBadgeSpans: [...container.querySelectorAll("span")]
        .filter((el) => (el.textContent || "").trim() === "Auto").length,
      autoSubstringHits: (container.textContent.match(/Auto/g) || []).length,
      runButtonPresent: !!run,
      runButtonDisabled: run ? !!run.disabled : null,
      runButtonLabel: run ? (run.textContent || "").trim() : null,
    };
    log("");
    log("THE SCREEN, WITH NOTHING CLICKED:");
    for (const [k, v] of Object.entries(obs)) log(`  ${k.padEnd(20)} ${JSON.stringify(v)}`);

    // The column-relationship question text carries the data-column count.
    const q = /Are the (\d+) DATA columns/.exec(colCard.textContent || "");
    log("");
    log(`  column card question names ${q ? q[1] : "?"} DATA columns (ImportView.jsx:980)`);
    log(`  column card question, verbatim: ${JSON.stringify((colCard.textContent || "").slice(0, 90))}`);
    log(`  row card question, verbatim   : ${JSON.stringify((rowCard.textContent || "").slice(0, 90))}`);

    // A bare "4 Auto badges on the page" says nothing about WHERE. Name each
    // one's nearest labelled ancestor, so the two gates can be shown clear of
    // them rather than merely counted around.
    const autos = [...container.querySelectorAll("span")]
      .filter((el) => (el.textContent || "").trim() === "Auto");
    log("");
    log(`  every "Auto" badge on the page (${autos.length}), by nearest labelled ancestor:`);
    for (const el of autos) {
      let a = el.parentElement, label = "(none)";
      for (let i = 0; i < 6 && a; i++, a = a.parentElement) {
        const t = (a.textContent || "").replace(/\s+/g, " ").trim();
        if (t.length > 12) { label = t.slice(0, 70); break; }
      }
      const inCol = colCard.contains(el), inRow = rowCard.contains(el);
      log(`    ${inCol ? "[col gate] " : inRow ? "[row gate] " : "[elsewhere] "}${JSON.stringify(label)}`);
    }
    log(`  inside the column gate card : ${autos.filter((e) => colCard.contains(e)).length}`);
    log(`  inside the row gate card    : ${autos.filter((e) => rowCard.contains(e)).length}`);

    // The substring count is larger than the badge count. Say where the
    // difference comes from rather than leaving a number that looks like badges.
    const pageText = (container.textContent || "");
    const ctx = [];
    for (let i = pageText.indexOf("Auto"); i >= 0; i = pageText.indexOf("Auto", i + 1)) {
      ctx.push(pageText.slice(Math.max(0, i - 22), i + 26).replace(/\s+/g, " "));
    }
    log("");
    log(`  "Auto" as a SUBSTRING of the page text (${ctx.length}), in context:`);
    for (const c of ctx) log(`    ${JSON.stringify(c)}`);

    // Zone 3's variance-stabilising transform. Not one of the three gates, and
    // recorded because it is a decision the product DOES supply on this screen
    // while supplying neither gate answer — which is the §8.2 distinction the
    // log row turns on.
    // Selection here is NOT the ✓ glyph: the gate buttons only draw that when
    // the choice is not auto (ImportView.jsx:1049, :1060), so an auto-selected
    // option shows no check. The product marks selection by background and
    // dims the loser to opacity 0.65 (:1102-1105). Read those.
    const vstBtns = buttons(container).filter((b) => /Apply log transform|Keep raw/i.test(b.textContent || ""));
    log("");
    log(`  Zone 3 transform controls (${vstBtns.length}) — selection read from style, not from a ✓:`);
    for (const b of vstBtns) {
      const t = (b.textContent || "").replace(/\s+/g, " ").trim();
      const op = b.style.opacity || "(unset)";
      const dimmed = op !== "" && op !== "1" && op !== "(unset)";
      log(`    ${/Auto/.test(t) ? "[Auto] " : "[    ] "}opacity ${String(op).padEnd(8)}` +
          `${dimmed ? "dimmed -> NOT selected" : "full    -> selected   "}  ${JSON.stringify(t.slice(0, 60))}`);
    }

    // The product's own preamble-strip notice (ImportView.jsx:727-728). It is
    // an independent read of what prepStructure did, off the screen rather than
    // off the census path.
    const flat = (container.textContent || "").replace(/\s+/g, " ");
    const clean = /Auto-cleaned: stripped \d+ preamble rows?/.exec(flat);
    log("");
    log(`  the product's own prep notice: ${clean ? JSON.stringify(clean[0]) : "(none rendered)"}`);
    // Bounded to the sentence: there is no full stop after it, so an open-ended
    // quantifier runs straight into the next control's copy.
    const vstSub = /Auto: log transform for .+?(?= ?Keep raw|$)/.exec(flat);
    log(`  Zone 3 auto sub-text          : ${vstSub ? JSON.stringify(vstSub[0].trim()) : "(none)"}`);
    const slope = /slope = [-\d.]+, 95% CI \[[^\]]*\]/.exec(flat);
    log(`  Zone 3 evidence line          : ${slope ? JSON.stringify(slope[0]) : "(none)"}`);

    // What the product asserts, as assertions rather than prose.
    expect(obs.colCardRendered).toBe(true);
    expect(obs.rowCardRendered).toBe(true);
    expect(obs.runButtonPresent).toBe(true);
    expect(obs.runButtonDisabled).toBe(true);

    // ── the confirm card, driven on its own gate ────────────────────────
    // The trigger probe drives `pending: false`; this drives the last link.
    // Nothing is run to get here, which is why the card is rendered directly.
    const { container: c2 } = render(
      <GroupingConfirmCard results={[]} groupingPendingBase={false} />);
    log("");
    log(`  GroupingConfirmCard with groupingPendingBase=false renders ` +
        `${c2.innerHTML.length === 0 ? "NOTHING (returns null at :72)" : "SOMETHING — unexpected"}`);
    expect(c2.innerHTML).toBe("");

    cleanup();
  }, 120000);
});
