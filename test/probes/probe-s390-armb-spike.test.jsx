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

/* ── §8.5 — a probe's patience is not a resource limit ──────────────────────
 *
 * No wait inside this probe may expire before §17.2's 24-hour run budget does.
 * A probe that gives up first manufactures a drivability finding out of a cost
 * one, and §8.1 routes "not drivable" to a hand-run, so an expiring wait does
 * not merely mislabel a deposit — it loses the outcome.
 *
 * ONE CONSTANT, and every import-or-run wait reads it. Raising the eight
 * call sites individually would leave the ninth able to inherit 20 s in
 * silence, so `waitFor`'s DEFAULT is the budget: a site that specifies nothing
 * gets the budget rather than a C10 figure.
 *
 * `ARMB_TIMEOUT` is retained as an alias — SESSION393-SUMMARY.md:117 documents
 * it as "overrides the 600 s verdict wait", and it now overrides every wait. */
const RUN_BUDGET_MS = +(process.env.ARMB_BUDGET || process.env.ARMB_TIMEOUT || 86400000);
const BUDGET_SOURCE = process.env.ARMB_BUDGET ? "ARMB_BUDGET"
                    : process.env.ARMB_TIMEOUT ? "ARMB_TIMEOUT (alias)"
                    : "§17.2 default";

/* §8.5's ONE named exception. `:557` waits for BatchView's drop zone after a
 * view switch — not an import and not a run. On the budget it would hang for
 * 24 hours on a broken button, so it keeps a short timeout, explicitly, where
 * it can be seen rather than inherited. */
const UI_WAIT_MS = 20000;

/* ── A refusal is detected ON SIGHT, never by expiry ────────────────────────
 *
 * FOUND BY RUNNING §8.5, not by reading it. `ImportView.jsx:936-938` renders
 * this sentence whenever `sum.nDC < 2`, and it is a §14 outcome — the PRODUCT
 * declining the sheet — which §8.1 routes to a hand-run. Both waits below used
 * to surface it by EXPIRING: the gate-card wait's catch block read the screen
 * after 30 s and said so. Under the budget that becomes a 24-hour wait on a
 * state that is already on screen and will never change.
 *
 * §8.5 forbids a probe that gives up before the budget because it manufactures
 * a drivability finding out of a cost one. The converse is just as wrong, and
 * this is it: waiting out the budget on a determinate refusal manufactures a
 * cost finding out of a drivability one. Patience is for something that might
 * still happen.
 *
 * IT BITES THE CSV PATH HARDEST, which is where round 2 lives. On a workbook
 * the picker resolves the first wait and the gate-card wait catches the
 * refusal. On a CSV there is no picker, so the FIRST wait is the one that
 * hangs — and pos-02, pos-44 and pos-47, the three round-2 refusals §15.1
 * measured, are all CSVs. Measured at 9c1f583 on `C22 :: Exp. ST`: four runs,
 * four expiries, ~30 s each. Under the budget and without this, that sheet
 * alone is four days. */
const FLOOR_REFUSAL = "Assign at least 2 data columns to proceed.";   // ImportView.jsx:938
const refusalError = (container) => new Error(
  `the PRODUCT is declining this sheet: the screen reads ${JSON.stringify(FLOOR_REFUSAL)} ` +
  `(ImportView.jsx:938). Detected on sight, not by expiry (ROUND2 §8.5). | screen: ` +
  (container.textContent || "").replace(/\s+/g, " ").slice(0, 400));

/* ── §8.5.1 — the ceiling, and a timeout that lies ──────────────────────────
 *
 * Node's setTimeout ceiling is 2^31-1 ms = 24.855 days. Above it, vitest 2.1.9
 * fails in about 1 ms while reporting "Test timed out in 3110400000ms" — a
 * 36-day wait that never happened — with the overflow warning on stderr where
 * a log grep never sees it. That is a MANUFACTURED NON-COMPLETION, the one
 * outcome §17.3 records as real.
 *
 * The two halves are a pair and neither works alone. `blockTimeout` CLAMPS, so
 * the `it` argument can never overflow and can never produce the lying message;
 * `assertUnderCeiling` then REFUSES at the top of the block, so a run that the
 * clamp could not honour does not start. Clamping without refusing would give a
 * truthful-looking timeout at 24.855 days on a job needing longer. */
const SETTIMEOUT_CEILING = 2 ** 31 - 1;
const blockTimeout = (arms) => Math.min(arms * RUN_BUDGET_MS, SETTIMEOUT_CEILING);
function assertUnderCeiling(arms, what) {
  if (arms * RUN_BUDGET_MS <= SETTIMEOUT_CEILING) return;
  throw new Error(
    `${what}: ${arms} arms x ${RUN_BUDGET_MS} ms = ${arms * RUN_BUDGET_MS} ms exceeds Node's ` +
    `setTimeout ceiling (${SETTIMEOUT_CEILING}). vitest would fail in ~1 ms while reporting a ` +
    `timeout that never elapsed. Invoke once per deposit through ARMB_MANIFEST (ROUND2 §8.5.2), ` +
    `which is how round 2's arm B is run and which also keeps the heap where S393 found it.`);
}

/* §8.5 — "The budget is printed, not merely set." Emitted once per process, at
 * the top of whichever `it` runs first, so a single-test invocation carries it
 * too: no §7 figure can be taken from a run without its budget beside it. */
let headerDone = false;
function runHeader() {
  if (headerDone) return;
  headerDone = true;
  const h = (RUN_BUDGET_MS / 3600000).toFixed(2);
  console.log(`\n[hdr] ROUND2 §8.5 — run budget ${RUN_BUDGET_MS} ms (${h} h), from ${BUDGET_SOURCE}` +
              (BUDGET_SOURCE === "§17.2 default" ? "" : "  <-- OVERRIDDEN"));
  console.log(`[hdr] every import/run wait takes it; the batch drop-zone wait keeps ${UI_WAIT_MS} ms ` +
              `(§8.5's named exception)`);
  console.log(`[hdr] §8.5.1 ceiling ${SETTIMEOUT_CEILING} ms -> at most ` +
              `${Math.floor(SETTIMEOUT_CEILING / RUN_BUDGET_MS)} full-budget arms per it; ` +
              `round 2 runs one deposit per process (§8.5.2)`);
}

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

/* ── The second environment gap, also jsdom's, also reported not buried ──────
 * §3's `FindingDetailPanel` constructs a `ResizeObserver`
 * (FindingDetailPanel.jsx:346). jsdom ships none, so mounting the document
 * branch throws straight into `AnalysisErrorBoundary` and the Forensics tab
 * renders nothing. This is the same class as the `arrayBuffer` polyfill above
 * and is declared the same way: a standard browser API jsdom omits.
 *
 * WHAT THE STUB SUPPRESSES, EXACTLY. The observer drives one thing — an
 * `overflow` flag comparing scrollHeight/clientHeight and scrollWidth/clientWidth
 * (FindingDetailPanel.jsx:334-349), which paints a scroll affordance. Two
 * reasons it is inert for this measurement. First, the effect calls
 * `evalOverflow()` itself before constructing the observer (:345), so the
 * initial evaluation still runs; the stub only drops re-evaluation on resize.
 * Second, every layout metric in jsdom is 0, so the comparison yields
 * false/false whether or not the observer ever fires, and nothing resizes in a
 * headless run regardless.
 *
 * It is presentational either way, and ROUND2 §8.4 already scopes this probe
 * out of anything about what a reader sees. It is recorded here because a
 * second non-shipped surface is a fact about the instrument, not a detail. */
function stubResizeObserver() {
  if (typeof globalThis.ResizeObserver === "function") return "already present";
  globalThis.ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
  return "stubbed (jsdom ships no ResizeObserver)";
}

/* Poll the DOM for a condition the product reaches asynchronously (FileReader,
 * dynamic import of SheetJS, the analysis itself). No fake timers: the engine's
 * Blocked-Mahalanobis loop yields on real setTimeout. */
async function waitFor(fn, { timeout = RUN_BUDGET_MS, interval = 25, label = "condition" } = {}) {
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
  /* ── S393: the loop above CANNOT return 0, and that is a gap in the arm-B
   * instrument, not a detail of this session. ──────────────────────────────
   * VerdictBanner gates the whole action one-liner on `severity > 0`
   * (VerdictBanner.jsx:180), and the severity-0 branch puts its own headline in
   * the slot instead (composed :86-93, rendered :137). So VERDICT_TEXT[0].sub,
   * "Proceed with dataset", is never in the DOM at severity 0 — the loop falls
   * through, readVerdict returns null, and the caller waits until it times out.
   *
   * S390 never met it: every C10 arm was severity >= 1. ROUND2 §8 pre-registers
   * this probe as how arm B is executed, and a SPECIFICITY screen expects clean
   * deposits — so the first clean deposit in round 2 would have hung it.
   *
   * The clean headline the product actually renders, matched as copy exactly
   * like every other control in this file:
   *   VerdictBanner.jsx:88  "No tests could run on this data. This report says nothing about it."  (cov.ran === 0)
   *   VerdictBanner.jsx:90  "No signals found" (qc / full)  ·  "No unusual patterns found" (review)
   * Checked only after the sub loop, so a severity > 0 verdict always wins. At
   * severity 0 there is no count clause, so high and mod stay 0 by construction. */
  if (severity === null) {
    const CLEAN = [
      "No signals found",
      "No unusual patterns found",
      "No tests could run on this data. This report says nothing about it.",
    ];
    if (CLEAN.some((h) => text.includes(h))) severity = 0;
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

/* ── S393 additions: the grouping confirm, and the surfaces it is read from ──
 *
 * SAME RULE AS THE REST OF THIS FILE — toggle, do not port. Everything below
 * clicks the product's own controls and reads the product's own rendered text.
 * Nothing sets component state and nothing in `src/` changed.
 *
 * THE CARD'S OWN COPY, and the mode tabs, located the way the gate controls
 * already are: by a product string, asserting EXACTLY ONE match and throwing on
 * 0 or 2.
 *   GroupingConfirmCard.jsx:284   "Confirm this grouping and run the grouped tests"
 *   GroupingConfirmCard.jsx:296   "Leave these tests unassessed"
 *   ReportView.jsx:1005-1012      mode tabs, labels from MODES (guidance.js:6-10)
 *
 * WHY A MODE TAB IS INVOLVED AT ALL. `GroupingConfirmCard` is mounted by
 * `ForensicsBody` (ForensicsBody.jsx:385-395), and `ForensicsBody` is mounted at
 * exactly one site — ReportView.jsx:1492, inside the document branch, reached
 * only after `mode === "qc"` (:1295) and `mode === "review"` (:1361) both fall
 * through. `mode` initialises to "qc" (:222). So the card is on the ImportView
 * path but not in the state a bare run leaves the DOM in.
 */
const CARD = {
  confirm: "Confirm this grouping and run the grouped tests",
  unassessed: "Leave these tests unassessed",
};
/* The settled state each click lands in — GroupingConfirmCard.jsx:240-271.
 * `confirmedActive ? (exitedUnassessed ? <Reconsider…> : <✓ confirmed…>) : <two buttons>`.
 * Waited on rather than slept through: the confirm runs four tests. */
const CARD_SETTLED = {
  confirm: "✓ Grouping confirmed — the grouped tests ran on it.",
  unassessed: "Reconsider the grouping",
};
const TAB = { qc: "Check my data", forensics: "Forensics" };

function exactlyOne(container, pred, label) {
  const hits = buttons(container).filter(pred);
  if (hits.length !== 1) throw new Error(`${label} matched ${hits.length} buttons (expected 1)`);
  return hits[0];
}
const byExactLabel = (s) => (b) => (b.textContent || "").trim() === s;
const cardButton = (c, key) => exactlyOne(c, byExactLabel(CARD[key]), `card button "${key}"`);
const modeTab   = (c, key) => exactlyOne(c, byExactLabel(TAB[key]),  `mode tab "${key}"`);
const cardPresent = (c) => buttons(c).some(byExactLabel(CARD.confirm));

/* The four grouping-guarded tests (engine.js:506, :597, :604, :617), with the
 * display names every report surface renders them under
 * (mechanisms.js:98/104/105/106). */
const GUARDED = [
  { name: "Mahalanobis Row Outlier", display: "Unusual rows" },
  { name: "Entropy / Zipf Analysis", display: "Distinct numbers" },
  { name: "Column Goodness-of-Fit",  display: "Column Goodness-of-Fit" },
  { name: "Modality Test",           display: "Number of peaks" },
];

/* §5 Test coverage (ReportView.jsx:1622).
 *
 * WHICH FIELD, NAMED ONCE. The headline sentence at :1624 renders
 * `{cov.ran} of {cov.total} tests completed` and, at :1618-1620, a not-run
 * clause over `cov.notApplicable + cov.withheld + cov.errored + cov.pending`.
 * `cov.ran` is NOT `BatchView`'s `nApplicable = cov.ran + cov.withheld`
 * (BatchView.jsx:208-209) — those are different quantities, and pending is a
 * sixth coverage state (coverage.js:77) counted in neither. What this returns
 * as `covRan` is cov.ran, off the product's own sentence, and the table and the
 * scoring say so.
 *
 * The expandable ("Which tests ran, and why", :1628) renders S5GroupedReasons
 * (:1633): a `Ran: <display names>.` line per cluster, then every declined test
 * under the product's own reason sentence — which for a pending test is the
 * engine's own `description`, "grouping unconfirmed — pending user
 * confirmation" (engine.js:255), because groupNotApplicableByReason keys on
 * `description` when there is no naCauseText (noVerdictReasons.js:78-83). */
function readS5(container) {
  const text = container.textContent || "";
  const m = text.match(/(\d+) of (\d+) tests completed/);
  const nr = text.match(/(\d+) not run\./);
  return {
    covRan: m ? +m[1] : null,
    covTotal: m ? +m[2] : null,
    notRun: nr ? +nr[1] : (m ? 0 : null),
  };
}

/* The reason stanza each guarded test sits under in §5's expanded panel.
 * S5Group (ReportView.jsx:97-119) has two shapes; both put the name in its own
 * div and the reason in a sibling div, so read the name div and take the
 * nearest following reason text. Returns display name -> reason sentence, and
 * "(ran)" for a test named in a cluster's `Ran:` line. */
function readS5Reasons(container) {
  const out = {};
  const text = container.textContent || "";
  for (const g of GUARDED) {
    for (const m of text.matchAll(/Ran: ([^.]+)\./g)) {
      if (m[1].split(",").map((s) => s.trim()).includes(g.display)) { out[g.display] = "(ran)"; break; }
    }
  }
  for (const div of container.querySelectorAll("div")) {
    if (div.children.length) continue;
    const t = (div.textContent || "").trim();
    const names = t.split(" · ").map((s) => s.trim());
    const hits = GUARDED.filter((g) => names.includes(g.display));
    if (!hits.length) continue;
    const sib = div.nextElementSibling;
    const reason = sib ? (sib.textContent || "").trim() : null;
    if (!reason) continue;
    for (const h of hits) if (!out[h.display]) out[h.display] = reason;
  }
  return out;
}

/* Open §5's own disclosure, and nothing else.
 *
 * WHY SCOPED. The first build clicked every collapsed "▸" in the report — the
 * cluster headers (ClusterRow.jsx:88-98), the nested collapsed-summary rows
 * (ForensicsCategoryBlock.jsx:265) and §5's button alike — to reach §3's
 * per-test rows and test-card tier words. MEASURED COST: fine on C09 (53
 * expansions, 3.7 s a run) and catastrophic on a large sheet — C20 :: Microcosm
 * soil A ran 56 minutes without finishing a single run, at 80% CPU, re-rendering
 * a DOM that each click made bigger. The reader was the cost, not the battery.
 *
 * WHAT WAS GIVEN UP, AND WHY IT COSTS NOTHING HERE. §3's grouping-hold row and
 * the test card's tier word are gone. §5's reason stanza already names every
 * state this measurement distinguishes, in the product's own words and from the
 * product's own data:
 *   pending      "grouping unconfirmed — pending user confirmation"   engine.js:255
 *   unassessed   "Grouping left unconfirmed — these tests were not…"  GroupingConfirmCard.jsx:117
 *   N/A other    the test's own decline sentence
 *   ran          named in the cluster's "Ran: …" line
 * The one thing lost is the per-test HIGH/MODERATE/LOW tier of a test that ran.
 * The banner's own H and M counts carry that in aggregate, which is what the
 * severity expectations are about; a per-test tier is not read, and the record
 * says so rather than implying it was.
 *
 * ReportView.jsx:1628 renders the button as <span>▸</span><span>Which tests ran,
 * and why</span>, so it is matched on the copy and clicked once. */
function expandAll(container) {
  const b = buttons(container).find((x) => /Which tests ran, and why/.test(x.textContent || ""));
  if (!b) return 0;
  if (!/▸/.test(b.textContent || "")) return 0;   // already open
  fireEvent.click(b);
  return 1;
}

/* The verdict wait, shared by both read points.
 *
 * TIMEOUT. `waitFor`'s old 20 s default was a C10 figure. A row-grouped sheet
 * dispatches per condition group — C14 :: Data carries 236 groups
 * (S390-GROUPING-PENDING-READ-ONLY.md §Part 2) — and the battery takes far
 * longer than that under `replicates`. Measured at S393: sheets that timed out
 * at 20 s under replicates completed under conditions in seconds, so the 20 s
 * was reading as "not drivable" what was only "not finished".
 *
 * AN ERROR IS A RESULT, NOT AN ABSENCE. App.jsx:64-66 catches an analysis throw,
 * renders "Error: <message>" and falls back to the import screen after 3 s.
 * Waiting for a verdict through that is a timeout reporting the wrong cause, so
 * the error is matched and raised by name. `waitFor` swallows exceptions thrown
 * inside its predicate, so the branch is returned and raised outside it. */
/* S397: the 600 s that replaced the 20 s is itself a figure, and §8.5 retires
 * it. Both sites below now name RUN_BUDGET_MS rather than take the default —
 * they are the two RUN waits and saying so at the site is worth the repetition. */
async function readVerdictOrThrow(container, label) {
  const got = await waitFor(() => {
    const v = readVerdict(container);
    if (v) return { v };
    const m = (container.textContent || "").match(/Error: ([^\n]{1,200})/);
    return m ? { err: m[1] } : null;
  }, { timeout: RUN_BUDGET_MS, label });
  if (got.err) throw new Error("the product reported an analysis error: " + got.err);
  return got.v;
}

/* One arm, end to end, entirely through the product's own controls.
 * `colRel` / `rowSem` null means "leave whatever the product resolved".
 *
 * S393 ADDS TWO OPTIONS AND CHANGES NOTHING ELSE. Both default to the old
 * behaviour, so every existing call site — parts 1 to 4, including the
 * four-of-four calibration against S383's hand measurement — is unchanged, and
 * with `confirm: 'none', inspect: false` not one extra click is fired.
 *
 *   confirm: 'none' | 'confirm' | 'unassessed'
 *     'none'        the arm as this probe has always produced it.
 *     'confirm'     the pre-ticked grouping confirmed, via the card's own button.
 *     'unassessed'  the four tests explicitly declined, via the other one.
 *
 *   inspect: false | true
 *     true visits the Forensics tab to read §3's per-test rows and §5's own
 *     coverage sentence, then returns to qc. Read-only.
 *
 * THE READ PATH IS THE SAME ON EVERY RUN, WHICH IS THE POINT. Severity is read
 * off the qc-mode VerdictBanner, once before any tab click and again after
 * returning to qc. Both are returned:
 *
 *   confirm 'none'  — `pre` and `post` bracket a read-only Forensics visit, so
 *                     pre === post ASSERTS the visit is inert rather than
 *                     assuming it. S390-GROUPING-PENDING-READ-ONLY.md §3
 *                     establishes by reading that GroupingConfirmCard has no
 *                     useEffect, no timer and no auto-confirm, and that
 *                     confirmedResults stays null absent a click; this drives it.
 *   'confirm' /     `pre` is the pre-click verdict, which must equal the same
 *   'unassessed'    sheet's confirm-'none' verdict — if it does not, the
 *                     comparison is contaminated by something other than the
 *                     confirm. `post` is the measurement.
 *
 * VerdictBanner renders in all three branches (ReportView.jsx:1298, :1391,
 * :1486) and both things readVerdict matches are mode-invariant — `v` swaps
 * only `headline`, gated on mode !== "full" (VerdictBanner.jsx:68-69), and the
 * count clause (:185-196) has no mode gate. So the read WOULD survive being
 * taken in the document branch. It is taken in qc anyway, on every run: the
 * table must not depend on that argument holding.
 */
async function runArm({ path, sheet, colRel, rowSem, confirm = "none", inspect = false, log = () => {} }) {
  polyfillArrayBuffer();
  stubResizeObserver();
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
        : container.textContent.includes("import error") ? "error"
        : container.textContent.includes(FLOOR_REFUSAL) ? "refused" : null),
    { label: "sheet picker or loaded data" });
  if (needsPicker === "error") throw new Error("product reported an import error: " + container.textContent.slice(0, 300));
  if (needsPicker === "refused") throw refusalError(container);
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

  // 3 — wait for the gate cards to exist at all.
  //     S393: when they never appear, say WHAT THE SCREEN SAYS instead of only
  //     that the wait expired. ImportView renders the column-relationship card
  //     at `sum.nDC >= 2` (ImportView.jsx:974) and the whole run-button zone at
  //     the same floor (:1268-1269); below it the screen carries "Assign at
  //     least 2 data columns to proceed." (:936-938) and there is nothing to
  //     click. A timeout alone reads as a probe limit; the screen text tells
  //     you it is the product declining.
  const gate = await waitFor(() => {
    /* Cards first: the two states are mutually exclusive (`nDC >= 2` against
     * `nDC < 2`), and asking for the answer before the refusal keeps it that
     * way if they ever stop being. */
    try { control(container, "replicates"); control(container, "ordered"); return "cards"; }
    catch { /* not yet */ }
    return (container.textContent || "").includes(FLOOR_REFUSAL) ? "refused" : null;
  }, { timeout: RUN_BUDGET_MS, label: "the two gate cards" });
  if (gate === "refused") throw refusalError(container);

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

  // 6 — read the product's own verdict off §1, in qc, before any tab click
  const pre = await readVerdictOrThrow(container, "the rendered verdict");

  let post = pre, s5 = null, reasons = null;
  let cardSeen = null, expanded = null;
  if (confirm !== "none" || inspect) {
    // 7 — the Forensics tab: the only mode that mounts ForensicsBody, and so
    //     the only one that mounts the card (ReportView.jsx:1492).
    fireEvent.click(modeTab(container, "forensics"));
    await waitFor(() => container.textContent.includes("Test coverage"),
      { timeout: RUN_BUDGET_MS, label: "the Forensics body" });
    cardSeen = cardPresent(container);

    // 8 — the confirm decision, through the card's own button
    if (confirm !== "none") {
      if (!cardSeen) throw new Error(`confirm "${confirm}" requested but the grouping card is not on screen`);
      fireEvent.click(cardButton(container, confirm));
      await waitFor(() => container.textContent.includes(CARD_SETTLED[confirm]),
        { label: `the card's settled state after "${confirm}"` });
    }

    // 9 — per-test rows and the coverage sentence, read where they render
    if (inspect) {
      expanded = expandAll(container);
      await tick(0);
      s5 = readS5(container);
      reasons = readS5Reasons(container);
    }

    // 10 — back to qc, so severity is read off one surface in one mode on
    //      every run in the table.
    fireEvent.click(modeTab(container, "qc"));
    post = await readVerdictOrThrow(container, "the verdict after returning to qc");
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  cleanup();
  return { ...post, pre, post, confirm, cardSeen, s5, reasons, expanded,
           runLabel, secs: +secs, sheetIndex, nSheets: sheetNames ? sheetNames.length : 1 };
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
  stubResizeObserver();
  const t0 = Date.now();
  const { container } = render(<CheckMyData />);

  const toBatch = buttons(container).find((b) => /^Batch analysis$/.test((b.textContent || "").trim()));
  if (!toBatch) throw new Error("no Batch analysis button on the import screen");
  fireEvent.click(toBatch);

  await waitFor(() => container.textContent.includes("Batch analysis") &&
    container.querySelector('input[type="file"][multiple]'),
    { timeout: UI_WAIT_MS, label: "batch drop zone" });
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
    runHeader();
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
  }, blockTimeout(1));   // one import, no run

  it("part 2 — drives both gates and the run button as a user does", async () => {
    runHeader();
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
  }, blockTimeout(2));   // one bare import for the control, then one arm

  it("part 3 — reproduces S383's four runs on C10 :: Exiguobacterium sp. Experiment1", async () => {
    runHeader();
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
  }, blockTimeout(4));   // one batch arm plus three ImportView arms

  /* The sheet and the two answers are already inputs to runArm. This drives a
   * manifest — the same shape ROUND2 §6.2/§7 needs per deposit — to show that
   * scaling is a longer list, not a longer probe. Override with
   * ARMB_MANIFEST=<file.json>; the default is three C10 sheets so the spike
   * stays cheap and still proves the loop.
   *
   * S397: RESOLVED HERE RATHER THAN IN THE BODY, because the `it` timeout is an
   * argument to `it` and must know the arm count before the body runs. A bad
   * ARMB_MANIFEST path would then throw during COLLECTION and take parts 1, 2,
   * 3 and 5 down with it, so the read is caught and the error re-raised inside
   * part 4 where it belongs. */
  let manifest = [], manifestError = null;
  try {
    manifest = process.env.ARMB_MANIFEST
      ? JSON.parse(readFileSync(process.env.ARMB_MANIFEST, "utf-8"))
      : [
          { label: "C10 :: Exiguobacterium sp. Experiment1", file: "C10.xlsx",
            sheet: "Exiguobacterium sp. Experiment1", colRel: "conditions", rowSem: "ordered" },
          { label: "C10 :: B. pumilus Experiment1", file: "C10.xlsx",
            sheet: "B. pumilus Experiment1", colRel: "conditions", rowSem: "ordered" },
          { label: "C10 :: B. cereus Experiment1", file: "C10.xlsx",
            sheet: "B. cereus Experiment1", colRel: "replicates", rowSem: "ordered" },
        ];
    if (!Array.isArray(manifest)) throw new Error("ARMB_MANIFEST must be a JSON array");
  } catch (e) { manifestError = e.message; manifest = []; }

  it("part 4 — cost, and thirty runs as a loop rather than thirty edits", async () => {
    runHeader();
    if (manifestError) throw new Error(`ARMB_MANIFEST: ${manifestError}`);
    /* §8.5.1 — refuse at the top rather than run. One arm per entry. */
    assertUnderCeiling(manifest.length, "part 4");

    /* ── S397: `confirm` and `inspect` join the manifest ────────────────────
     *
     * They were already inputs to `runArm` (:420) and hardcoded at this call
     * site alone, so thirteen of the 27 answered round-2 deposits — the ones
     * that render the grouping-confirm gate — could not be given an answer
     * without editing the probe.
     *
     * THE DEFAULT IS NOT RESTATED HERE. A key absent from the entry is a key
     * absent from the call, so `runArm`'s own signature defaults supply it.
     * Writing `e.confirm ?? "none"` would put "none" in a second place and let
     * the two drift; this cannot. Every entry that omits both fields — every
     * entry in the default manifest below, and every ARMB_MANIFEST written
     * before today — therefore calls `runArm` with byte-identical arguments.
     *
     * VALIDATED BEFORE THE FIRST RUN, WHICH IS THE POINT. Both fields already
     * fail loudly on a bad value: `confirm: "confrim"` reaches `cardButton`
     * (:510), matches zero buttons and throws. But it throws at step 8, AFTER
     * the import, the run and the verdict read — on `pos-41` that is hours
     * spent to report a typo. The whole manifest is checked here instead, so
     * a bad entry costs nothing and a thirty-entry loop cannot die on entry
     * thirty. The legal set is read off `CARD` rather than written out, so a
     * third card action would be admitted automatically. */
    const CONFIRM_VALUES = ["none", ...Object.keys(CARD)];
    const bad = [];
    manifest.forEach((e, i) => {
      const at = `entry ${i} (${e.label || e.file || "?"})`;
      if (e.confirm !== undefined && !CONFIRM_VALUES.includes(e.confirm))
        bad.push(`${at}: confirm ${JSON.stringify(e.confirm)} — expected one of ${CONFIRM_VALUES.join(" | ")}`);
      if (e.inspect !== undefined && typeof e.inspect !== "boolean")
        bad.push(`${at}: inspect ${JSON.stringify(e.inspect)} — expected a boolean`);
    });
    expect(bad.join("\n"), "manifest field values").toBe("");

    console.log("\n[p4] " + "deposit".padEnd(42) + "answers".padEnd(30) +
      "sheet".padEnd(10) + "arm B".padEnd(22) + "s");
    let total = 0;
    for (const e of manifest) {
      const opts = { path: join(corpusDir(), e.file), sheet: e.sheet,
                     colRel: e.colRel, rowSem: e.rowSem };
      if (e.confirm !== undefined) opts.confirm = e.confirm;
      if (e.inspect !== undefined) opts.inspect = e.inspect;
      const r = await runArm(opts);
      total += r.secs;
      /* The line an entry using neither field prints is unchanged to the byte.
       * A field that did nothing must not read like one that worked, so an
       * entry that used one gets its evidence appended: the pre-confirm
       * verdict beside the post-confirm one, which is the delta the confirm
       * field exists to measure, and §5's own coverage figure where `inspect`
       * went and read it. */
      const extra = [
        opts.confirm && opts.confirm !== "none"
          ? `confirm=${opts.confirm} pre sev ${r.pre.severity} H=${r.pre.high} M=${r.pre.mod} card=${r.cardSeen}`
          : null,
        opts.inspect ? `covRan ${r.s5?.covRan}/${r.s5?.covTotal}` : null,
      ].filter(Boolean).join("  ");
      console.log("[p4] " + e.label.padEnd(42) +
        `${e.colRel}/${e.rowSem}`.padEnd(30) +
        `${r.sheetIndex}/${r.nSheets}`.padEnd(10) +
        `sev ${r.severity}  H=${r.high} M=${r.mod}`.padEnd(22) + r.secs +
        (extra ? "  " + extra : ""));
      expect(r.severity).not.toBeNull();
    }
    const mean = total / manifest.length;
    console.log(`[p4] ${manifest.length} arm-B runs in ${total.toFixed(1)} s; mean ${mean.toFixed(1)} s/run`);
    console.log(`[p4] projection — 30 deposits, arm B only: ${(mean * 30 / 60).toFixed(1)} min`);
  }, blockTimeout(Math.max(1, manifest.length)));   // one arm per manifest entry

  /* ── S393 — does confirming the grouping move the verdict, and by how much ──
   *
   * THE NINE round-1 `groupingPending` sheets, as
   * S390-GROUPING-PENDING-READ-ONLY.md §Part 2 identifies them off
   * `corpus-out/s379-honest-run.json` (main checkout, gitignored, opened
   * read-only and never written). Four tests were N/A-pending on all nine and
   * nothing has ever run them.
   *
   * FOUR RUNS PER SHEET. Runs a/b/c hold both gates at replicates/ordered and
   * vary ONLY the confirm, so the confirm is the sole moving part. THAT IS ARM
   * A'S CONFIGURATION — corpus-run.mjs:246 hardcodes colRelationship
   * 'replicates' — AND IT IS NOT AN ARM-B ANSWER SET. It must not be recorded
   * as one.
   *
   * Run d is the Q3 drive. Q3 concluded from reading branches that a sheet
   * pends under 'replicates' and cannot pend under 'conditions': conditionContext
   * .js:63-65 claims a conditions-mode file as 'column-grouped' at width >= 2,
   * engine.js:176 then passes an EMPTY condColSet, and computeTrigger returns
   * attempted:false / pending:false at groupingTrigger.js:84-86. Run d drives
   * that instead of asserting it. A sheet that still pends refutes the
   * derivation and is the more important result.
   *
   * NOTHING HERE TOUCHES A ROUND-2 DEPOSIT. All nine are round-1 corpus data,
   * so ROUND2 §6.4 does not gate this.
   */
  const PENDING_NINE = [
    { label: "C09 :: Sheet1",           file: "C09.xlsx", sheet: "Sheet1" },
    { label: "C14 :: Data",             file: "C14.xlsx", sheet: "Data" },
    { label: "C15 :: Data",             file: "C15.xlsx", sheet: "Data" },
    { label: "C15 :: Fig. 6",           file: "C15.xlsx", sheet: "Fig. 6" },
    { label: "C20 :: Microcosm soil A", file: "C20.xlsx", sheet: "Microcosm soil A" },
    { label: "C20 :: Microcosm soil B", file: "C20.xlsx", sheet: "Microcosm soil B" },
    { label: "C22 :: Exp. OA",          file: "C22.xlsx", sheet: "Exp. OA" },
    { label: "C22 :: Exp. WA",          file: "C22.xlsx", sheet: "Exp. WA" },
    { label: "C22 :: Exp. ST",          file: "C22.xlsx", sheet: "Exp. ST" },
  ];

  const RUNS = [
    { key: "a", confirm: "none",       colRel: "replicates", rowSem: "ordered",
      what: "arm B as the probe produces it today" },
    { key: "b", confirm: "confirm",    colRel: "replicates", rowSem: "ordered",
      what: "the pre-ticked grouping confirmed" },
    { key: "c", confirm: "unassessed", colRel: "replicates", rowSem: "ordered",
      what: "the tests explicitly declined" },
    { key: "d", confirm: "none",       colRel: "conditions", rowSem: "ordered",
      what: "Q3 driven — the conditions answer" },
  ];

  const sameVerdict = (x, y) =>
    !!x && !!y && x.severity === y.severity && x.high === y.high && x.mod === y.mod;
  const fmtV = (v) => (v ? `sev ${v.severity} H=${v.high} M=${v.mod}` : "—");
  /* The engine's own pending description (engine.js:255), which §5 renders
   * verbatim as the reason stanza because groupNotApplicableByReason keys on
   * `description` when there is no naCauseText (noVerdictReasons.js:78-83). */
  const PENDING_DESC = "grouping unconfirmed — pending user confirmation";

  /* S397: hoisted for the same reason as part 4's manifest — the `it` timeout
   * is an argument to `it`, so the sheet count has to be known before the body
   * runs. RUNS.length arms per sheet. */
  const p5only = process.env.S393_SHEETS
    ? process.env.S393_SHEETS.split("|").map((s) => s.trim())
    : null;
  const p5sheets = p5only ? PENDING_NINE.filter((s) => p5only.includes(s.label)) : PENDING_NINE;

  it("part 5 — the grouping confirm's cost on the nine round-1 pending sheets", async () => {
    runHeader();
    const sheets = p5sheets;
    expect(sheets.length, "no sheets selected").toBeGreaterThan(0);
    /* §8.5.1 — refuse at the top rather than run. */
    assertUnderCeiling(sheets.length * RUNS.length, "part 5");

    const rows = [];
    const notDrivable = [];
    for (const dep of sheets) {
      const path = join(corpusDir(), dep.file);
      if (!existsSync(path)) { notDrivable.push({ dep: dep.label, why: `corpus file missing: ${path}` }); continue; }
      const got = {};
      for (const r of RUNS) {
        try {
          got[r.key] = await runArm({ path, sheet: dep.sheet, colRel: r.colRel,
            rowSem: r.rowSem, confirm: r.confirm, inspect: true });
        } catch (e) {
          got[r.key] = { failed: e.message };
          console.log(`[p5] ${dep.label} run ${r.key}: DID NOT DRIVE — ${e.message}`);
        }
      }
      if (Object.values(got).some((g) => g.failed)) {
        notDrivable.push({ dep: dep.label,
          why: RUNS.filter((r) => got[r.key].failed).map((r) => `${r.key}: ${got[r.key].failed}`).join(" | ") });
      }
      rows.push({ dep: dep.label, got });

      // Per-sheet console block, printed as each sheet finishes so a long run
      // is legible while it is still going.
      console.log(`\n[p5] ${dep.label}`);
      for (const r of RUNS) {
        const g = got[r.key];
        if (g.failed) { console.log(`[p5]   ${r.key} ${r.confirm.padEnd(11)} DID NOT DRIVE`); continue; }
        /* Per-test state, from the surface that carries it. §3's grouping-hold
         * row (three exact strings) where the test is held; the test card's own
         * tier word where it ran; otherwise the flag is N/A and §5's reason
         * stanza below says why. "?" means no surface named it, which is a
         * defect in this reader, not a state. */
        /* Per-test state, from §5's own reason stanza — the product's sentence,
         * not a re-derivation. "ran" means the test is named in its cluster's
         * "Ran:" line; its TIER IS NOT READ (see expandAll). "?" means no
         * surface named it, which is a defect in this reader, not a state. */
        const four = GUARDED.map((t) => {
          const why = g.reasons?.[t.display];
          const state = why === "(ran)" ? "ran"
            : why?.startsWith("grouping unconfirmed") ? "pending"
            : why?.startsWith("Grouping left unconfirmed") ? "unassessed"
            : why ? "N/A" : "?";
          return `${t.display}=${state}`;
        }).join("  ");
        console.log(`[p5]   ${r.key} ${r.confirm.padEnd(11)} ${`${r.colRel}/${r.rowSem}`.padEnd(22)}` +
          ` pre ${fmtV(g.pre).padEnd(20)} post ${fmtV(g.post).padEnd(20)}` +
          ` covRan ${String(g.s5?.covRan).padStart(3)}/${g.s5?.covTotal}  card=${g.cardSeen}  exp=${g.expanded}  ${g.secs}s`);
        console.log(`[p5]        four: ${four}`);
        for (const t of GUARDED) {
          const why = g.reasons?.[t.display];
          if (why && why !== "(ran)") console.log(`[p5%s]        §5 reason for ${t.display}: ${JSON.stringify(why)}`.replace("%s",""));
        }
      }
    }

    // ── Instrument-integrity checks. These are not predictions. ──
    // Addition 1 — the pre-confirm read on b and c must equal a's verdict on the
    // same sheet, or the confirm comparison is contaminated by something other
    // than the confirm. Reported per sheet whether or not it passes.
    // Addition 2 — on the non-confirm runs, pre and post bracket a read-only
    // Forensics visit; identical, or the visit is not a read-only act.
    console.log("\n[p5] === instrument integrity ===");
    const integrity = [];
    for (const { dep, got } of rows) {
      const a = got.a?.failed ? null : got.a;
      for (const k of ["b", "c"]) {
        const g = got[k]; if (!g || g.failed || !a) continue;
        const ok = sameVerdict(g.pre, a.post);
        integrity.push({ dep, check: `pre-confirm(${k}) === a`, ok,
          detail: `${fmtV(g.pre)} vs ${fmtV(a.post)}` });
      }
      for (const k of ["a", "d"]) {
        const g = got[k]; if (!g || g.failed) continue;
        const ok = sameVerdict(g.pre, g.post);
        integrity.push({ dep, check: `forensics-visit inert(${k})`, ok,
          detail: `${fmtV(g.pre)} vs ${fmtV(g.post)}` });
      }
    }
    for (const c of integrity) {
      console.log(`[p5] ${c.ok ? "PASS" : "FAIL"}  ${c.dep.padEnd(26)} ${c.check.padEnd(26)} ${c.detail}`);
    }

    // ── The four expectations, scored. A disagreeing number is a finding. ──
    console.log("\n[p5] === expectations, scored ===");
    const score = { e1: [], e2: [], e3: [], amend: [] };
    for (const { dep, got } of rows) {
      const { a, b, c, d } = got;
      if (a && b && c && !a.failed && !b.failed && !c.failed) {
        score.e1.push({ dep, ok: sameVerdict(a.post, c.post), detail: `a ${fmtV(a.post)} | c ${fmtV(c.post)}` });
        score.e2.push({ dep, ok: b.post.severity >= a.post.severity, detail: `a sev ${a.post.severity} -> b sev ${b.post.severity}` });
        const da = a.s5?.covRan, db = b.s5?.covRan;
        score.e3.push({ dep, ok: da != null && db != null && db - da === 4,
          detail: `cov.ran ${da} -> ${db} (delta ${da != null && db != null ? db - da : "?"})` });
      }
      if (d && !d.failed) {
        // Amendment 1's prediction: no guarded test reports the pending
        // description under the conditions answer.
        const pending = GUARDED.filter((t) => {
          const why = d.reasons?.[t.display];
          return !!why && why.includes(PENDING_DESC);
        }).map((t) => t.display);
        score.amend.push({ dep, ok: pending.length === 0 && d.cardSeen === false,
          detail: `card=${d.cardSeen} pendingTests=${pending.length ? pending.join(",") : "none"}` });
      }
    }
    const report = (label, arr) => {
      const n = arr.filter((x) => x.ok).length;
      console.log(`[p5] ${label}: ${n}/${arr.length} held`);
      for (const x of arr) console.log(`[p5]    ${x.ok ? "held " : "BROKE"} ${x.dep.padEnd(26)} ${x.detail}`);
    };
    report("E1  (a) and (c) identical", score.e1);
    report("E2  sev(b) >= sev(a)", score.e2);
    report("E3  cov.ran rises by 4, a -> b  [FIELD: cov.ran, ReportView.jsx:1624 — NOT BatchView's ran+withheld]", score.e3);
    report("AM1 no pending under the conditions answer", score.amend);
    console.log("[p5] E4 — how often (b) differs from (a) at all: " +
      `${score.e1.length ? score.e2.filter((_, i) => {
        const r = rows[i]; return r && r.got.a && r.got.b && !sameVerdict(r.got.a.post, r.got.b.post);
      }).length : 0} of ${score.e2.length} sheets. No rate was predicted.`);

    if (notDrivable.length) {
      console.log("\n[p5] NOT DRIVABLE:");
      for (const n of notDrivable) console.log(`[p5]   ${n.dep}: ${n.why}`);
    }

    // Only instrument integrity is asserted. The expectations are scored above
    // and reported; a disagreeing number is a finding, not a failure to tune.
    const droveSomething = rows.some(({ got }) => Object.values(got).some((g) => !g.failed));
    expect(droveSomething, "no run drove on any sheet — the table would be empty and this must not read as a pass").toBe(true);
    const broken = integrity.filter((c) => !c.ok);
    expect(broken.map((c) => `${c.dep} ${c.check}: ${c.detail}`).join("; ")).toBe("");
  }, blockTimeout(Math.max(1, p5sheets.length) * RUNS.length));
});
