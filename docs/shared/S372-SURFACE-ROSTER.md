# S372 — P148 Part 1: the surface roster

Read-only over `src/`. Main at `4fc399c`. Nothing in `src/` was edited.

This part builds the grid the P148 census will run on. It classifies nothing.

---

## Question 0 — the view toggle changes rendering only

**Answer: rendering only. The dispatch continues.**

Read at source, not inferred from summary strings:

- `runFullAnalysis` is defined at `engine.js` and called from exactly two places —
  `App.jsx` (`handleAnalyse`) and `BatchView.jsx`. Its signature is
  `(matrix, rawMatrix, condCtx, assay, onProgress, vst, opts, dataType, rowSemantics, skipHeavy)`.
  **There is no mode parameter.** Neither call site passes one.
- `ReportView` receives `results` as a **prop** (`function ReportView({ results: baseResults, … })`).
  The only thing that ever replaces it is `confirmedResults`, from the grouping-confirm card —
  a user action on the data, not the toggle.
- `mode` is `useState("qc")` local to `ReportView`. Every read of it is inside a render branch,
  plus one pass into the Excel export.
- A `command grep` for `mode` across `src/analysis/` returns **zero** hits on the view switch.
  Every match is `model`, `renderMode`, `selection.mode`, `dev mode` or `conditions-mode`.

So one analysis feeds every presentation. View is an axis on the roster.

### Correction: it is three values, not two

`MODES` in `constants/guidance.js` and `MODE_ORDER` beside it:

| key | label | short | audience |
|---|---|---|---|
| `qc` | Check my data | QC | Researchers |
| `review` | Peer review | Review | Editors / integrity officers |
| `full` | Forensics | Expert | Forensic statisticians |

"QC view" and "forensic view" are the first and third. `review` is a third rendering with its
own branch in `ReportView` and its own `CategoryRow` mode.

---

## 1. The axes

### Expectation 5 is confirmed: view and mode are one switch

There is one `mode` state. The Excel export's `Analysis mode` row is
`rptAoa.push(["Analysis mode", MODES[mode]?.label || mode])` — it prints the label of the
same state the tabs set. There is no second switch. **Three axes, not four:**

1. **Surface** — real, and larger than the dispatch's list.
2. **Mode** — real, three values, rendering-only. "View" is this axis under another name.
3. **Display state** — real, but it reaches exactly one surface.

### Surface: seven, not six

The `⋯ Actions` menu carries four items, and two of them build different documents.

| # | Surface | Reached by | Mode-gated | Display-state |
|---|---|---|---|---|
| 1 | Test card | §3 of the in-app report | **yes** | n/a |
| 2 | Condition / per-unit tables | inside each MiniCard | inherits card | n/a |
| 3 | Report view §1–§5 | in-app document branch | **yes** | n/a |
| 4 | AI hand-off prompt (§4) | `promptBodyRenderer` | no | no |
| 5 | Standalone HTML report | `⋯ → 📊 Export report` | **no** | no |
| 6 | Excel workbook | `⋯ → 📥 Export to Excel` | **yes** | no |
| 7 | Browser print of the app DOM | `⋯ → 🖨 Print` | inherits 1–3 | **yes** |

**Surfaces 1 and 2 are separable and should stay separate rows.** The card's headline and its
tables read different fields and disagree — observation 1 below is exactly that disagreement.

**A naming trap, and it will bite a census.** `handleExportExcel` builds the **HTML report** —
it ends in `window.open("", "_blank")`. `handleExcelDownload` builds the **.xlsx**, via
`lazyExportToExcel`. The handler named for Excel is not the Excel one.

### Display state

Confirmed, and confined to surface 7. The app's print CSS is one line in `App.jsx`
(`@media print { button { display: none !important } … }`) and one in `ReportView`. Neither
builds a print layout. So `window.print()` puts the live DOM on paper and whatever was collapsed
stays collapsed.

Surface 5 is **not** the DOM on paper. It is a document assembled from `results` in
`handleExportExcel`, with its own `@media print` block and its own Print button. It is
display-state independent. **The dispatch's "the printable output is the app's DOM on paper" is
true of surface 7 and false of surface 5, and the two carry different content.** Establishing
which one an artifact came from is a precondition for reading any observation off it.

---

## 2. The field reads

### Tier word

| Surface | Field | Vocabulary |
|---|---|---|
| Test card | `result.flag` via `TestCardLayout` `flLabel` | **mode-dependent** — `qc` gives `FLAGGED` / `NOTED` / `CLEAR`; `review` and `full` give `High` / `Moderate` / `Clear` |
| Report view | same component | same |
| HTML report | `FLAG_STYLES[r.flag].label` | sentence case, mode-independent |
| Excel Investigation Report | `ACTION_LABEL[severity]` for the dataset; cluster words from `clusterCoverageState` | sentence case |
| Excel Test Details | `isWithheld(r) ? WITHHELD_LABEL : FLAG_STYLES[r.flag].label` | sentence case |
| AI prompt | hardcoded prologue strings, plus `findings.high` / `findings.moderate` split | sentence case |

### p-value

| Surface | Field | Gate |
|---|---|---|
| Test card badge | `result.primaryP` | `showPValue = mode === "full"`, and the badge is suppressed at LOW |
| Condition tables | per-test, e.g. `fmtP(c.rawP)` | none |
| HTML report `Key metric` | `r.primaryP` | **`if (r.primaryP != null)` only — prints at every tier, including LOW** |
| Excel Test Details | `r.primaryP` | **whole sheet gated on `mode === "full"`** |
| Excel Annotated Data / Investigation Report / Legend | none | — |
| AI prompt | per-composer, via `formatPClause` | none |

**The HTML report and the test card disagree about when a p is shown, and neither states which
quantity it is.** The card withholds p below `full` and at LOW; the HTML report prints it always.

### Effect size — and this is the worst of the three

There is **no shared field, no shared unit, and no label anywhere.** The dispatch's
`7.83×` against `2.80×` is real, it is on **one card**, and both sit under a column
header reading `Ratio`.

Regional Noise, all from one result object:

| Rendered as | Field | Unit |
|---|---|---|
| `Anomalous windows` → `Ratio` | `d.sdRatio` = `Math.sqrt(w.maxRatio)` | **SD ratio** |
| `Regional noise by condition` → `Ratio` | `c.bestRatio` ← `result.bestVarRatio` | **variance ratio** |
| card headline direction | `result.bestVarRatio` | variance ratio |

`2.80² = 7.84`. The producer publishes both units deliberately — `bestVarRatio` and
`bestSDRatio` sit adjacent in the return object, and `details[]` carries both `ratio`
(variance) and `sdRatio`. The two consumers each picked one and used the same word.

LOESS adds a third `Ratio` column, `regionComparison[].ratio = obsSD / expSD` — an **SD ratio**.

**So three columns named `Ratio` across two cards carry two different units, and nothing on any
surface says which.** A contract governing p and tier while leaving this unlabelled is not a
contract, and the census needs an effect-size column.

---

## 3. The card inventory

| count | what |
|---|---|
| 29 | tests dispatched in `engine.js` |
| 29 | keys in `MINIPLOT_REGISTRY` (`components/cards/MiniPlot.jsx`) |
| **28** | distinct card components |

**No test lacks a card. No test has two.** One component serves two tests: `MiniCard_Benford`
is registered against both `Benford's Law (First Digit)` and `Benford's Law (Second Digit)`.

The card count is therefore **28 components covering 29 tests** — the dispatch was right that it
is not 29, but the shortfall is a shared component rather than a gap.

`CLAUDE.md`'s "26 MiniCards" in the directory tree and "All 25 MiniCards use it" under
MiniCardLayout are both stale. Corrected in this session's `CLAUDE.md` pass.

Registry keys are `result.name`, which differs from the dispatch name for six tests
(`Kurtosis` → `Excess Kurtosis`, `Duplicate Detection` → `Exact Duplicate Detection`,
`Benford's Law` → `Benford's Law (First Digit)`, `Cross-Condition Rank Corr.` →
`Cross-Condition Rank Correlation`, `Selective Noise` → `Selective Noise Partitioning`,
`Decimal Precision` → `Decimal Precision Consistency`). A census keyed on the wrong one silently
misses those six.

---

## 4. The eight observations

| # | Claim | Verdict |
|---|---|---|
| 1 | Regional Noise headline contradicts its table | **Confirmed — real defect, structural** |
| 2 | Ratio-unit collision | **Confirmed — real defect** |
| 3 | Row ranges shift by one between surfaces | **Confirmed, and wider than stated** |
| 4 | LOESS rates regions "As expected" beside Moderate | **Confirmed — real defect** |
| 5 | Outcome position disagrees | **Confirmed — the prompt is wrong, not the Excel** |
| 6 | Excel prints no p-values | **Refuted as a defect — it is the mode axis** |
| 7 | `NOTED` against `Moderate` | **Refuted as a defect — it is the mode axis** |
| 8 | Cluster denominator differs | **Cannot settle — no second denominator exists in `src/`** |

### 1. Regional Noise's headline is structurally incapable of saying "quieter"

The scan statistic folds direction away:

```
const r = Math.max(wvBuf[c] / globalColVars[c], globalColVars[c] / wvBuf[c]);
```

`maxRatio` is therefore **always ≥ 1 by construction**. `bestRatio` is the best window's
`maxRatio`, and `bestVarRatio` is its string form.

The card headline then asks:

```
`One region ${parseFloat(bestVarRatio) > 1 ? "noisier" : "quieter"} than the rest — …`
```

A quantity that cannot fall below 1, tested against 1. **The headline reads "noisier" on every
flagged dataset**, whatever the data did. "Quieter" is reachable only at an exact 1.00 tie or an
unparseable value, and both would then be wrong too.

The table is right. It reads a separate, correctly signed field computed one line later:
`direction = wvBuf[anomCol] < globalColVars[anomCol] ? "reduced" : "elevated"`, rendered as
`Quieter` / `Noisier` / `Anomalous`.

So both strings are in one document because they come from two fields, one of which discarded
the sign before the card ever saw it. Ground truth agreeing with the table is what you would
expect: the table's field is the one that kept the information.

This is the S288 lesson recorded in `CLAUDE.md` — *a distance/ratio axis folds opposite verdict
directions onto one side* — recurring in a card that was never audited against it.

**Not fixed, per the read-only rule. The correct direction is already published**: the best
window is `details[0]` (details are built from `sortedWindows`), which carries `direction`. No
producer change is needed. Recorded, not acted on.

### 2. The ratio-unit collision

Covered in section 2. Both values are correct; the label is the defect. Neither card says
whether its `Ratio` is a variance ratio or an SD ratio, and one card prints both under that name.

### 3. Row conventions — three of them, and the prompt is the outlier

`findingComposers.js` contains **zero** occurrences of `toFileRow` or `fileRow`. `handoffModel.js`
builds `const ctx = { dataset }` and passes nothing else to `composeFinding`.

**So the §4 AI prompt prints 1-indexed matrix rows on every row-emitting composer**, not just
LOESS. That is a surface-wide break of the convention the report itself states, and it is the
surface most likely to be pasted somewhere the reader cannot check.

The three conventions:

| Convention | Where | DS12b LOESS regions |
|---|---|---|
| 0-indexed matrix row | producers internally | 0–194, 195–399 |
| 1-indexed matrix row | producer output; the AI prompt | 1–195, 196–400 |
| file row (`toFileRow`) | test cards, condition tables | 2–196, 197–401 |

The cards are correct. Regional Noise's `51–65` against `52–66` is the same one-step: the
producer emits `w.startRow` already 1-indexed, and the card adds the header row.

`CLAUDE.md` records that three **keyFindingTemplates** take `toFileRow`. That is a different
path from `findingComposers`, which is the §4 prompt's composer registry and takes no mapper at
all. Both exist; only one converts.

### 4. LOESS's Finding column is a hardcoded threshold with no link to the verdict

```
const finding = ratio > 1.5 ? "Noisier" : ratio < 0.67 ? "Quieter" : "As expected";
```

`ratio` is `obsSD / expSD`. The verdict is `flagFromP` on the Šidák-corrected `combinedP`, plus
the pair-promotion arm. **Nothing connects them.** A region at 1.45× lands in the "As expected"
band while the test reports Moderate, and the card asserts the region is normal beside a verdict
saying it is not.

`CLAUDE.md`'s rule is met head-on: *a companion descriptive measure is honest beside a verdict
only if it cannot contradict the flag*. This one can and does.

A second fault sits in the same block. `expSD` falls back to `globalMeanNoise` when fewer than
half the region's rows have a predicted sigma — so the column headed `Expected SD` can be the
dataset's own mean noise, making the comparison a self-comparison. This is the S365 finding about
`predSigma` reaching the display, arriving from the display side.

### 5. The outcome position — the prompt is off by one, on all three strings

`ACTION_LABEL` in `narrative.js` sets `score: index + 1`, so severity 1 → `2 of 4 — Review`.
`OUTCOME_LABEL` in `handoffModel.js` is the same ladder indexed by severity. The Excel and the
HTML report both render `score`, so both read `Outcome 2 of 4 — Review` at severity 1, matching
the Legend's definition of position 2.

`promptBodyRenderer.js` hardcodes its prologues and numbers them by **severity**, not position:

- `PROLOGUE_TIER_1` — "Outcome 1 of 4 — Review"
- `PROLOGUE_TIER_2` — "Outcome 2 of 4 — Investigate"
- `PROLOGUE_TIER_3` — "Outcome 3 of 4 — Investigate closely"

All three labels are correct and all three positions are one low. `Proceed` has no prologue —
tier 0 returns `null` — which is how position 1 came to be reused.

**This is not a view difference.** `renderPromptBody` takes no mode. The two artifacts can come
from the same session and still disagree.

### 6. The Excel p-values — the mode axis, exactly as expected

The `p-value` column exists on **Sheet 3, Test Details, only**, and that sheet is built inside
`if (mode === "full")` and appended by `if (ws3) book_append_sheet(…)`. A workbook with three
sheets was exported in `qc` or `review`.

S370's note that `excelExport.js:633` reads `primaryP` "unconditionally" needs one qualifier:
unconditional **on the flag**, conditional **on the mode**. Re-located, the read is
`const pVal = r.primaryP != null ? fmtP(r.primaryP) : "—"` inside the `full` block.

### 7. `NOTED` against `Moderate` — the mode axis

`TestCardLayout`:

```
const flLabel = mode === "qc"
  ? (isFl ? "FLAGGED" : isNt ? "NOTED" : "CLEAR")
  : (isFl ? "High" : isNt ? "Moderate" : "Clear");
```

One surface, one result, two modes. The QC branch carries its own comment marking it stale and
out of scope for the S156 sentence-case canon, so the divergence is known and deliberate.

Worth keeping on the roster as a **vocabulary axis**, though: QC is the default mode, so the
ALL-CAPS ladder is what a first-time user sees, and no other surface speaks it.

### 8. The cluster denominator — I cannot confirm this one

`clusterCoverageState` is the only place a cluster fraction is computed, and it has exactly two
consumers: `ClusterRow.jsx` for the §3 header, and `handoffModel.js` for the §4 prompt. The
latter's comment says so explicitly — the fraction is read straight off `clusterCoverageState`
"so this fraction and the §3 cluster header are one number computed once".

`couldRun = cov.total - cov.notApplicable - cov.errored`. Withheld stays in the denominator by
design.

**There is no second denominator in `src/` for the two to disagree about.** And there is no
`console.log` anywhere in `src/` — the grep returns nothing — so the console dump is not a
product surface. Both observation 7's and observation 8's "console dump" readings came from a
developer instrument outside `src/`.

**What I need to settle it: which instrument produced that dump.** If it is `validate-batch.mjs`
or a probe, then `13 of 14` is that instrument's own arithmetic and is not a product defect, and
neither is the raw `NOTED`.

---

## 5. What this read could not settle

1. **The source of the console dump** (observations 7 and 8). Not in `src/`. Named above.
2. **Which print artifact each screenshot came from** — surface 5 or surface 7. They carry
   different content, and observation 1 says "the printable output" without distinguishing them.
   The Regional Noise headline appears on surfaces 1, 3 and 7 but **not** on surface 5, whose
   summary table has only Category / Test / Result / Key metric — so observation 1's artifact was
   surface 7. Stated as inference, not as a read of the artifact.
3. **Whether `review` mode has display defects of its own.** It has its own `ReportView` branch
   and its own `CategoryRow` path, and nothing in this session exercised it. The census must
   carry all three modes, not two.
4. **The effect-size field per test.** Section 2 establishes that no shared field exists and
   settles Regional Noise and LOESS. The other 27 tests are unread; that is Part 2's cost, and it
   is larger than a p-and-tier census would have been.

---

## 6. What this changes for Parts 2 and 3

- A census row is **test × surface × mode**, three axes, with display state a footnote on one
  surface. Not test × surface.
- The row must carry an **effect-size** column with its unit, not just tier and p.
- Two of the eight observations dissolve into the mode axis. Three are confirmed display defects
  (1, 2, 4), one is a confirmed prompt defect (5), one is a confirmed convention break spanning a
  whole surface (3).
- **None of the five confirmed defects is a verdict defect.** Every flag in the eight
  observations is correct; what is wrong is the number, word or row printed beside it. P122
  remains the only candidate verdict defect and it was not in scope here.
