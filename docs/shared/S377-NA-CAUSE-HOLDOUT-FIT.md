# S377 — `NA_CAUSE` fit for the P93 hold-out

**Status:** read-only census, S377 part 3. Owner: Code. Nothing was edited, no worktree, nothing
committed. Read at main `2d89d4c`, working tree clean, `src/` unchanged since `08f9ee3` (S374).

**Why this read exists.** S377 part 2 found that a hold-out does two things at once: six tests fall to
N/A on `nC < 3`, and every surviving pair family collapses from `C(4,2) = 6` to 1, where BH returns the
raw p unchanged. This establishes what the shipped `NA_CAUSE` enum can and cannot carry for each half.

**It does not rule on fit.** Where a fact bears on the decision, the decision is named and left to
Chat. Nothing here proposes a code, a field or a wording.

---

## 0. Expectations, written before the first read

| # | Expectation | Outcome |
|---|---|---|
| 1 | No existing code distinguishes user-caused shortfall from file-inherent shortfall | **Split** — §5.1 |
| 2 | At least two of the six tests share a single shortfall code | **Held, and it is all six** — §5.2 |
| 3 | Nothing anywhere records correction-family size on a result | **Broken** — §5.3 |
| 4 | One of the three unreached codes is closer to the hold-out case than any reached one | **Held** — §5.4 |

---

## 1. Part 3a — the enum as it ships

`src/constants/naCause.js`. **Seventeen codes** in three declared families, each with a source
comment. The file header states the design cut verbatim (`:9-20`):

> **Declines** — the data KIND or structure is wrong for the test. More data or a different grouping
> would not help. Not a sufficiency failure.
>
> **Shortfalls** — the test could run but there is not enough of something. The code names WHAT is
> short, never at what scale (whole-file vs one group) and never whether a different grouping would
> help. Three reads established the tool cannot compute scale from a return site, so this field does
> not claim to.
>
> One code stands apart: SCAN_CAP_EXCEEDED is a limit of the scan, hit when there is TOO MUCH data,
> not too little. It is neither a shortfall nor a decline.

### 1.1 Every code, verbatim with its source comment

**Declines (6)** — `naCause.js:44-49`

| Constant | Value | Source comment |
|---|---|---|
| `DATA_TYPE_MISMATCH` | `dataTypeMismatch` | ordinal / count / integer data the test cannot use |
| `COLUMNS_NOT_REPLICATES` | `columnsNotReplicates` | columns are separate conditions, not replicates |
| `ROW_ORDER_ARBITRARY` | `rowOrderArbitrary` | row order carries no meaning (long-format, gene lists) |
| `ASSAY_NOT_APPLICABLE` | `assayNotApplicable` | assay biology makes the test meaningless (genomics, cell count) |
| `PREMISE_VOID` | `premiseVoid` | the test's premise is void (conditions genuinely differ, no grouping, too-high missingness) |
| `SUBJECTS_SHARED_ACROSS_CONDITIONS` | `subjectsSharedAcrossConditions` | conditions hold the same subjects, so a null that breaks the row-to-row correspondence describes different data (P82) |

**Shortfalls (10)** — `naCause.js:52-61`

| Constant | Value | Source comment |
|---|---|---|
| `TOO_FEW_COLUMNS` | `tooFewColumns` | fewer replicate / feature columns than the minimum |
| `TOO_FEW_ROWS` | `tooFewRows` | fewer rows / valid rows / values than the minimum |
| `TOO_FEW_OBSERVATIONS` | `tooFewObservations` | fewer non-null observations per column (within a group) than the minimum |
| `TOO_FEW_DISTINCT` | `tooFewDistinct` | fewer distinct values than the minimum |
| `TOO_FEW_CONDITIONS` | `tooFewConditions` | fewer conditions / condition pairs than the minimum |
| `RANGE_OUT_OF_BAND` | `rangeOutOfBand` | value span / range outside the usable band — too narrow (Benford, Noise Scaling) or too wide (Value-Frequency Spike) |
| `SHAPE_NOT_COVERED` | `shapeNotCovered` | distribution shape (or scale/positivity) outside what the test's model covers |
| `SINGULAR_COMPUTATION` | `singularComputation` | a required computation is degenerate (singular covariance); only found by running |
| `MISSINGNESS_OUT_OF_BAND` | `missingnessOutOfBand` | missing-cell count / rate outside the testable band |
| `EMPTY_INPUT` | `emptyInput` | nothing usable produced (no data columns, no valid pairs / windows / digits) |

**Neither (1)** — `naCause.js:64`

| `SCAN_CAP_EXCEEDED` | `scanCapExceeded` | scan skipped because the dataset is too LARGE — a limit of the scan, not a shortage |

### 1.2 Codes about column shortfall specifically

**One names columns as the short quantity: `TOO_FEW_COLUMNS`.** Its comment reads "fewer replicate /
feature columns than the minimum", so it already covers two different senses of column (a replicate of
one measurand, a feature in a balance test) under one code.

**`EMPTY_INPUT` is the degenerate neighbour** — its comment's first listed case is "no data columns".
It is the zero-column case rather than the below-minimum case.

No other code mentions columns as the shortfall. `COLUMNS_NOT_REPLICATES` names columns but is a
decline about what the columns *are*, not how many there are.

### 1.3 Count fields, and what they deliberately do not say

`naCause.js:22-40` documents `naObserved` / `naMinimum`, carried by the five count-based shortfall
codes when both are in scope at the return:

> The pair lets a reader compare the two — 12 against 30 — and judge for themselves whether they have
> a lever. **The tool asserts no remedy.** […] Absent on decline codes (a number implies a threshold a
> reader could cross, which is false for a wrong data kind).

So the enum already carries a two-number shortfall record, and already reasons about when a number
would imply something false.

### 1.4 The three unreached codes — measured, not cited

Measured directly from `test/flag-matrix.json`, which records every one of the 786 cells and stamps
`N/A:<cause>`: **270 N/A cells carrying 14 distinct causes.** The three absent are:

| Code | Emit site | What it would take to reach |
|---|---|---|
| `columnsNotReplicates` | `engine.js:337`, in `condSkip` | `isConditionsMode`, which is `condCtx.type === 'column-grouped' && !condCtx.paired` (`engine.js:216`) — reachable **only** via `conditionContext.js:63`, i.e. `colRelationship === 'conditions'` **and** no two-row-header groups **and** ≥2 columns. A two-row-header file sets `paired = true` and can never reach it. **The trigger is a user (or auto-suggest) setting at the import Col-Rel gate, not a property of the data.** No fixture sets it. |
| `singularComputation` | `mahalanobis.js:99` | `invertMatrix(cov, nC)` returning null — perfectly collinear data columns. Needs a fixture with an exactly dependent column. |
| `scanCapExceeded` | `sequentialDuplication.js:52` | `nR > BLOCK_SCAN_LIMIT`, and `BLOCK_SCAN_LIMIT = 5000` (`:43`). The corpus tops out at 1,501 rows; even the out-of-`FIXTURES` large clean fixture is 3,400. |

**Scope caveat on "unreached".** The flag matrix records the **top-level** result's cause. A code
emitted only on a per-column sub-result — the kind `dominantCause` rolls up in Column GoF, Entropy and
Modality — would not appear here unless it won the rollup. "Unreached" in this document means never the
top-level cause on the 27 fixtures at seed offset 0, which is the same scope the recorded figure uses.

### 1.5 Provenance — no code carries it, and two codes have user-settable triggers

**No code and no field distinguishes a shortfall the file arrived with from one a user action
produced.** There is no provenance field anywhere on an N/A result: the shape is `naCause` plus
optionally `naObserved` / `naMinimum` / `naCauseText` / `naTailText` / `naCauses`, and none of them
records who or what caused the state.

**But provenance is not absent from the enum's population — it is implicit in two codes' meanings.**
`COLUMNS_NOT_REPLICATES` fires on `colRelationship === 'conditions'` and `ROW_ORDER_ARBITRARY` fires on
the Row-Semantics gate. Both are import-view settings that a user can set or override, and both are
auto-suggested. So the enum already contains codes whose trigger is a user assertion about the data —
they simply state the assertion ("the columns are separate conditions") rather than its provenance.

The import layer *does* track that provenance, and keeps it outside the enum: `rowSemanticsAuto`
distinguishes auto-set from user-set for the Row-Semantics pill on two display surfaces. It never
reaches `naCause`.

### 1.6 What else sits outside the enum, as `groupingPending` does

`classifyCoverage` (`coverage.js:73-89`) resolves six states, and **four of them read stamps that are
not enum members**:

| Stamp | Set at | State |
|---|---|---|
| `groupingPending` | `engine.js:235`, `:251` | `pending` |
| `groupingUnassessed` | engine / UI | `unassessed` |
| `erroredCoverage` | `aggregation.js:101` | `errored` |
| `error` / `flag === "ERROR"` | engine thrown-test path | `errored` |

Only `withheld` reads the enum, through `isWithheld` (`coverage.js:64-66`), and only for
`SUBJECTS_SHARED_ACROSS_CONDITIONS`. The module's own comment (`:27-35`) states the division: *"ran /
notApplicable / pending / unassessed read the flag and the engine's own stamps […] withheld reads
`naCause`."*

**A fifth out-of-enum marker is nearer to this dispatch's second half.** `subunitsSuppressed`
(`interReplicateCorrelation.js:341`, `withinRowVariance.js:176`) records `['windowed-scan']` on a test
that **ran and returned a p** — a stamp saying part of the procedure did not execute, on a non-N/A
result. It is the only existing thing of that shape; §3 returns to it.

### 1.7 One stale line in the file's own header

`naCause.js:5` reads *"This build only stamps the code; nothing reads it yet."* That was true at P39
step 1 and is now false. Live readers: `coverage.js:65` (withheld classification),
`aggregation.js:99` (per-group rollup into `naCauses`), `noVerdictReasons.js:149-152` (decline copy),
the `dominantCause` rollups in `columnGof.js:214`, `entropyTest.js:119` and `modality.js:234`,
`excelExport.js:704`, and `validate-batch.mjs:106`, which builds the flag matrix's `N/A:<cause>` cell
value. A `src/` comment, so Chat's to fix; reported, not touched.

---

## 2. Part 3b — the six tests that would fall

### 2.1 All six return the same code, and the same sentence

| Test | Guard | Site | Code | `naObserved` / `naMinimum` |
|---|---|---|---|---|
| Noise Scaling With Measurement Size | `nC<3` | `meanVariance.js:19` | `TOO_FEW_COLUMNS` | `nC` / 3 |
| Regional Noise Homogeneity | `nC < 3` | `regionalNoise.js:36` | `TOO_FEW_COLUMNS` | `nC` / 3 |
| Selective Noise Partitioning | `nC < 3` | `selectiveNoise.js:240` | `TOO_FEW_COLUMNS` | `nC` / 3 |
| Within-Row Variance | `nC < 3` | `withinRowVariance.js:38` | `TOO_FEW_COLUMNS` | `nC` / 3 |
| Mahalanobis Row Outlier | `nC < MIN_COLS` (3) | `mahalanobis.js:34` **and** `engine.js:504` | `TOO_FEW_COLUMNS` | `nC` / 3 |
| Blocked Mahalanobis | `nC < MIN_NC` (3) | `blockedMahalanobis.js:426` | `TOO_FEW_COLUMNS` | `nC` / `MIN_NC` |

Every one composes its description the same way — `joinDeclineReason(TOO_FEW_REPLICATE_COLS_CAUSE,
COLS_TAIL)` — so all six share one cause sentence and differ only in the per-test tail. The shared
cause is `assays.js:109-110`, verbatim:

> **"Not applicable — this file does not have enough replicate columns."**

The six tails (`COLS_TAIL` in each module):

- Noise Scaling — "This test needs at least 3, to estimate within-row variance."
- Regional Noise — "This test needs at least 3."
- Selective Noise — "This test needs at least 3."
- Within-Row Variance — "This test needs at least 3, for a meaningful within-row standard deviation."
- Mahalanobis — "This test needs at least 3, for an invertible covariance matrix." (module site) /
  "This test needs at least 3, for the row-distance measure it uses." (engine site)
- Blocked Mahalanobis — "This test needs at least 3, for a non-degenerate covariance estimate."

Because `groupNotApplicableByReason` keys on the cause when one is present, **all six would render as
a single §5 cluster under that one sentence**, with the tails indented beneath it. Fourteen test
modules define a `COLS_TAIL` against this same cause, so the cluster is not exclusive to these six.

**The sentence is a claim about the file.** Under a hold-out it would be false: the file has the
columns; the user set some aside. This document does not rule on whether that matters — it reports that
the string asserts a file property and that all six emit it.

### 2.2 Would the same code be returned under a hold-out? Yes, by construction

The code path, traced:

1. The hold-out changes which columns reach `dataCols` (`engine.js:113`), by either route in part 2 §1.4.
2. `engine.js:119` projects the matrix to the surviving columns.
3. Each test computes its own width from the matrix it was handed — `matrix[0]?.length`.
4. The guard compares that number to a literal and returns `TOO_FEW_COLUMNS`.

**No test function receives anything that could distinguish the two cases.** The signature is
`testFn(matrix, ctx, …)`; the matrix is a plain array of arrays, and `condCtx` carries no
provenance field. So the returned object — code, `naObserved`, `naMinimum`, description, cause text,
tail — is **byte-identical** whether the columns were never in the file or were held out a moment ago.

Two consequences worth stating because they are properties of the mechanism rather than opinions:

- `naObserved` would report the **post-hold-out** count. A user who held out two of four sees
  "2 against 3" with nothing recording that it had been 4.
- `naCause.js:31-33` says the `naObserved` / `naMinimum` pair exists so a reader can "judge for
  themselves whether they have a lever", and that **"The tool asserts no remedy."** In the hold-out
  case the lever is the user's own click, one screen away, and the pair reads the same as when there
  is no lever at all.

### 2.3 The six are not dispatched alike, and the premise decides how many fall

This qualifies the count, and the qualification is structural.

| Test | Dispatch | Matrix it measures |
|---|---|---|
| Selective Noise | `runPairVST(…)` (`engine.js:678`) | **per column group** |
| Regional Noise | `runPairVST(…)` (`engine.js:685`) | **per column group** |
| Noise Scaling | `testMeanVariance(matrix, assay)` (`engine.js:580`) | whole matrix |
| Within-Row Variance | `testWithinRowVariance(matrix, …)` (`engine.js:654`) | whole matrix |
| Blocked Mahalanobis | `testBlockedMahalanobis(m, ctx, …)` (`engine.js:575`), `m` = whole VST or raw matrix | whole matrix |
| Mahalanobis Row Outlier | engine-level guard at `engine.js:504` on `matrix[0].length`, before any per-condition split | whole matrix |

So **"a four-column *sheet* loses two" and "a four-column *group* loses two" are different cases.**
On a single-group sheet of four columns they coincide and all six fall — which is what part 2 §2.4
reported. On a multi-group sheet, holding two out of each four-column group takes the whole matrix from
4G to 2G, so at two or more groups **only Selective Noise and Regional Noise cross their gate**; the
other four keep enough total columns and continue to run.

The engine's own comment at `engine.js:500-503` states the assumption that makes this so:

> **Column count is a whole-dataset fact**, so check it here before any per-condition row split, rather
> than finding the shortage once per group.

That is true of the file as imported. A per-group hold-out would make column count a per-group fact
while this site keeps reading it as a whole-dataset one. Reported; not ruled on.

### 2.4 Mahalanobis emits the code from three sites, and the third is on the confirm path

`engine.js:504` and `mahalanobis.js:34` are the two the engine comment describes — *"Each keeps its own
claim; only one of the two can fire on a run."* There is a **third**: `confirmGrouping.js:149-151`,
which repeats the same guard with its own hand-written sentence rather than `joinDeclineReason`, so its
wording does not share the cause constant and would not join the §5 cluster. Any change to what this
code asserts has three sites, not one.

---

## 3. Part 3c — the collapsed-family case

A test running with a one-member BH family is not N/A. It returns a p, a flag and an evidence table.
`NA_CAUSE` cannot reach it at all — the enum's whole population is `flag: "N/A"` returns.

**The prediction that nothing records family size is wrong, and the correction is worth more than the
prediction was.** Most of the affected tests already publish it.

### 3.1 Family size is published, under unit names

For each, the published count and the array `bhFDR` is actually called on:

| Test | Published field | BH family | Identical? |
|---|---|---|---|
| Autocorrelation | `nPairs: res.length` (`:194`) | `bhFDR(res.map(r=>r.rawP))` (`:56`) | **yes, same array** |
| Runs Test | `nPairs: res.length` (`:309`) | `bhFDR(res.map(r=>r.rawP))` (`:75`) | **yes** |
| Excess Kurtosis | `nPairs: res.length` (`:549`) | `bhFDR(res.map(r=>r.rawP))` (`:132`) | **yes** |
| Inter-Replicate Correlation | `nPairs: allPairs.length` (`:336`) | `bhFDR(iccRawPs)` (`:143`) | yes for the ICC family |
| Windowed Autocorrelation | `nPairs`, `nWindowsTotal` (`:235-236`) | `bhFDR(pairUnits…)` (`:193`) | window family published |
| Column GoF / Entropy / Modality | `nTested: tested.length` (`:268` / `:182` / `:276`) | `bhFDR(tested.map(c=>c.rawP))` | **yes, same array** |
| Blocked Mahalanobis | `nUnits: units.length` (`:675`) | `bhFDR(units.map(u=>u.rawP))` (`:593`) | **yes** |
| Cross-Condition Consistency | `nUnitsRan`, `nUnitsTotal` (`:745-746`) | three per-stage `bhFDR` calls | partly — per stage, not published per stage |
| Cross-Condition Rank Corr. | `nConditionPairs` (`:107`) | `bhFDR(looResults…)` (`:93`) | yes |
| Value-Frequency Spike | `nTested`, `nTestedPass1/2` (`:716-718`) | `bhFDR(rawPs)` (`:474`) | yes for the union family |

**The one exception among the six pair-family tests is Constant-Offset.** Its return (`:109-122`)
carries `totalConsecutivePairs`, which is a count of **row** pairs, not the column-pair family; the
column-pair family built at `:243` and BH-corrected at `:244` has **no published size**. So a reader of
a Constant-Offset result cannot recover its family size at all.

Note what these fields are: the number of units *that survived each test's own per-unit minimum*, not
`C(nC, 2)`. Autocorrelation's `res` skips any pair with fewer than 10 usable differences (`:42`). That
makes them the true denominator, and it also means the published number already moves for reasons
other than a hold-out.

### 3.2 The display renders it, and one card names the correction explicitly

- **The badge does not.** `TestCardLayout.jsx:132` renders `flLabel` plus `fmtPBadge(result.primaryP)`
  and nothing else. No family size, no correction, on any card.
- **Evidence tables** carry per-unit `Adj. p` columns (part 2's label census found all thirteen honest).
  Runs' table has an explicit `{header:"Pairs", render:c=>c.nPairs}` column (`MiniCard_Runs.jsx:246`),
  per condition.
- **The §4 prompt narrates the family**, across at least ten composers — "`${nSig} of ${nPairs} pairs
  reach adjusted significance`" (`findingComposers.js:959`), "`${nFlagged} of ${nTested} columns reject
  unimodality at BH-FDR adjusted p < 0.01`" (`:1206`), and similar for Column GoF, Entropy, Blocked
  Mahalanobis and CCC.
- **`ForestPlot` has a dedicated slot for exactly this.** `ForestPlot.jsx:36-37` documents
  `multiplicityNote` as *"the correction applied, shown so the reader sees the units were corrected"*.
  **One card passes it** — `MiniCard_Autocorrelation.jsx:142`, `` `Across ${nPairs} pairs and lags 1–5` ``.
  And `MiniCard_RowMean.jsx:73-75` documents why it deliberately omits one: *"NO multiplicityNote: the
  decision is a raw per-condition p […] there is no BH family across conditions, so no correction count
  to name."*

So the display layer already has a named contract for "the correction applied", already reasons about
when a card does and does not have one, and uses it on one card.

### 3.3 What is genuinely absent

Family size is recorded. **The collapse is not**, and three specific things are missing:

1. **No counterfactual.** Nothing records what the family size *would have been*. `nPairs: 1` is
   published and is true; nothing says it was 6 before a column was held out, because no result field
   carries a pre-hold-out width.
2. **No statement that m = 1 is no correction.** BH at rank 1 with m = 1 returns `p · 1/1`. Every
   surface would keep the heading `Adj. p` over a column of raw p-values, and the heading would be
   formally correct — an adjusted p at m = 1 *is* the raw p. Part 2's label census found every `Adj. p`
   heading honest; at m = 1 it stays honest and stops being informative.
3. **No cross-test view.** The collapse would hit six tests at once from one cause. Nothing aggregates
   family sizes across tests, so there is no surface on which a simultaneous collapse could appear as
   one event rather than six unrelated small numbers.

**The half `NA_CAUSE` cannot reach is real, but it is narrower than "nothing records it".** The
quantity is on the result object for nine of the ten affected tests and is rendered on at least three
surfaces. What is missing is any marker that the quantity *changed because of a user action*, which is
the same provenance gap §1.5 found on the N/A side — appearing here on results that ran.

---

## 4. Part 3d — what METHODOLOGY's contract already binds

The section is **`METHODOLOGY.md:533`, "Applicability and Coverage Reporting Contract (v1.x, S322 —
cross-validated, revised)"**, running to `:586`. Reported, not ruled on.

### 4.1 On adding a code — the contract says nothing

There is no rule in this section about adding an `NA_CAUSE` member, no naming convention and no
admission criterion. Searching the section for `add`, `new code`, `extend` or `member` returns only
paragraphs about what already shipped.

**The binding constraints on a new code live in `naCause.js`'s own header, not in METHODOLOGY.** Three
are explicit (`:9-20`, quoted in full at §1): a code belongs to one of two families or is the stated
one-off; a decline means "more data or a different grouping would not help"; a shortfall "could run but
there is not enough of something". The file also derives its code set from a site classification —
`docs/shared/archive/S331-CODE-READ-NA-SITE-CLASSIFICATION.md` — which is gitignored and therefore
absent from a clone.

### 4.2 On what a cause may assert — three explicit prohibitions

All three are in `naCause.js`, and all three are refusals to claim something the tool cannot compute.

> The code names WHAT is short, **never at what scale (whole-file vs one group) and never whether a
> different grouping would help.** Three reads established the tool cannot compute scale from a return
> site, so this field does not claim to. (`:14-17`)

> The pair lets a reader compare the two — 12 against 30 — and judge for themselves whether they have a
> lever. **The tool asserts no remedy.** (`:31-33`)

> Absent on decline codes (**a number implies a threshold a reader could cross, which is false for a
> wrong data kind**). (`:36-37`)

METHODOLOGY adds a fourth, aimed at the label rather than the code:

> …labelling its absence "not applicable" risks neutralising a signal with clinical terminology: it
> tells a reader the tool looked and found the question inapposite, when the reader should be asking
> why the raw values are absent. Undifferentiated N/A at least prompts *why did this not run?*; a
> confident "not applicable" answers and closes that question. […] **this contract's "not applicable"
> label must not be read as exculpatory.** (`:554`)

### 4.3 On the enum's cut against `classifyCoverage`'s six states — they cross, and it is measured

> **The engine also ships more states than this contract names:** `classifyCoverage` returns six, of
> which this contract describes two. `subjectsSharedAcrossConditions` (18 results) files as `withheld`,
> a state the contract predates entirely and nowhere accounts for. (`:556`)

> **The enum's cut is not this contract's cut, and the two cross.** […] `classifyCoverage` does not
> read `NA_CAUSE`, and **145 of 270** N/A results file as *not applicable* on causes the enum calls
> shortfalls. That is not 145 misfilings. **Three of the worked not-applicable examples above are enum
> shortfalls** — one replicate column, a single-condition file, a half-order-of-magnitude range — and
> they carry **96 of the 145**, every one filed correctly. […] **The residue is 24, spread across five
> codes, and every one is unsettled** under the fuzzy-case paragraph above. (`:558`)

Two structural facts follow from that, both already stated by the contract:

- **The enum is a two-family cut (decline / shortfall, plus one one-off); `classifyCoverage` is a
  six-state cut; and only one state reads the enum** — `withheld`, via `isWithheld`. The contract
  itself describes only two of the six.
- **"One replicate column" is a named worked example of *not applicable* that is an enum *shortfall*
  (`:539`, `:558`).** That is the closest existing precedent to the six tests' `TOO_FEW_COLUMNS`, and
  the contract files it as correctly not-applicable.

### 4.4 What the contract requires of anything that would fit

Stated as requirements, not as a verdict on fit:

1. **It must resolve to exactly one of the two senses**, or fall to the not-assessed default. `:537`:
   *"Every N/A result belongs to exactly one"*; `:542`: *"Where source does not settle it, classify as
   **not assessed**. […] The direction of the default is the load-bearing part."*
2. **It must not move the denominator.** `:544` and `:548`: *"Coverage is reported against all 29
   tests. […] **Reporting coverage against applicable tests alone is forbidden**, because it lets the
   denominator move with the data."*
3. **It must not assert scale, remedy, or that a different grouping would help** (§4.2).
4. **It must not let a clean verdict claim completeness.** `:552`: *"Where applicable tests went
   unassessed, a clean result says so on the same surface as the clean claim, not in a section below
   it."*
5. **It must not read as exculpatory** (`:554`).

**One live-state caveat for whoever weighs this.** The same section records at `:32` of its own body
that the display's consumption of `NA_CAUSE` *"has never been built"*, that the two-number coverage
line does not ship in the contract's form, and that `coverage.js:135` / `:181` render `ran of couldRun`
— the moving denominator requirement 2 forbids — on **69 of 135** cluster instances. So requirement 2
is a contract requirement that the shipped display does not currently meet, independently of anything
P93 does.

---

## 5. Part 3e — the four expectations

### 5.1 No existing code distinguishes user-caused from file-inherent shortfall — **SPLIT**

**Held on the field.** There is no provenance field anywhere on an N/A result. The shape is `naCause`
plus optionally `naObserved`, `naMinimum`, `naCauseText`, `naTailText`, `naCauses`, and none records
what produced the state. Nothing in the enum, and nothing beside it, separates "the file arrived this
way" from "a user did this a moment ago".

**Broken on the population.** The enum already contains codes whose trigger *is* a user action.
`COLUMNS_NOT_REPLICATES` fires on the import Col-Rel setting and `ROW_ORDER_ARBITRARY` on the
Row-Semantics gate; both are user-settable and auto-suggested. They do not *distinguish* provenance —
they assert what the data is ("the columns are separate conditions") and leave who decided that
unrecorded — but the enum is not, as predicted, populated exclusively by data properties.

The import layer does track that provenance and keeps it outside the enum: `rowSemanticsAuto`
separates auto-set from user-set for a display pill, and never reaches `naCause`.

### 5.2 At least two of the six share a single shortfall code — **HELD, and it is all six**

All six return `TOO_FEW_COLUMNS`, all six carry `naObserved` / `naMinimum`, and all six compose their
description from the same shared constant, so they share **one sentence** as well as one code:
*"Not applicable — this file does not have enough replicate columns."* Fourteen test modules define a
tail against that same cause. Under `groupNotApplicableByReason` the six would render as a single §5
cluster.

### 5.3 Nothing anywhere records correction-family size — **BROKEN**

Nine of the ten affected tests publish the family size, and for several it is provably the same array
`bhFDR` was called on (Autocorrelation, Runs, Kurtosis, Blocked Mahalanobis, and the three shape tests'
`nTested`). **Constant-Offset is the sole exception** — its `totalConsecutivePairs` counts row pairs,
and its column-pair family has no published size.

The display renders it too: Runs' evidence table has a `Pairs` column, the §4 prompt narrates
"`N of M pairs reach adjusted significance`" across at least ten composers, and **`ForestPlot` carries
a documented `multiplicityNote` slot — *"the correction applied, shown so the reader sees the units
were corrected"*** — used by Autocorrelation, with Row-Mean Runs documenting why it deliberately has
none. The badge is the one surface that shows nothing but `primaryP`.

**The correction is real and it narrows the gap rather than closing it.** What is absent is not the
family size but any record that the size *changed*, any statement that `m = 1` is no correction, and
any surface on which six simultaneous collapses would read as one event.

### 5.4 One unreached code is closer to the hold-out case than any reached one — **HELD**

`columnsNotReplicates` is closer on both axes that matter, and this is a statement about its
properties, not a ruling on fit:

- **Trigger.** It is one of two codes fired by a user setting rather than by a data property, and the
  only one of those two that is unreached.
- **Subject.** It is about the *replicate status of columns* — "columns are separate conditions, not
  replicates" — which is the same assertion a hold-out makes, at column granularity rather than
  whole-file.
- **Family.** It is a **decline**, so by the enum's own cut it claims that more data would not help and
  it carries no counts. Every reached alternative for this case is a **shortfall** asserting the file
  is short of something.
- **Position.** `condSkip` runs first in the dispatch chain, before the test — the same position a
  per-test hold-out marker would occupy. It is already first for Selective Noise, Regional Noise,
  Within-Row Variance, Mahalanobis and Blocked Mahalanobis.

Against that, one property cuts the other way and is stated so the comparison is complete: its wording
asserts the columns are *separate conditions*, which a held-out measurement axis is not.

---

## 6. Summary of what the enum can and cannot carry

**The N/A half.** The enum can carry it — six tests already emit one code with one shared sentence, and
the code path is identical whether the columns were absent or held out. What it cannot do today is say
*which*: no field records provenance, `naObserved` reports the post-hold-out count, and the shared
sentence asserts a property of the file that a hold-out makes false.

**The collapsed-family half.** `NA_CAUSE` cannot reach it, because those results are not N/A. But the
quantity is not missing — nine of ten tests publish their family size and three surfaces render it. The
gap is the same one as on the N/A side: nothing marks that the number moved because of a user action.

**Four decisions named and left to Chat.** Whether a shortfall sentence asserting a file property may
stand when a user action produced the shortfall; whether provenance belongs in the enum, beside it (as
`groupingPending` and `rowSemanticsAuto` sit), or nowhere; whether the collapsed-family half needs a
marker at all given what is already published; and whether `columnsNotReplicates`' properties make it a
precedent or a false friend.

**Line numbers.** Every citation here was read at `2d89d4c`. One correction to this document's own
first draft: `isConditionsMode` (`engine.js:216`) is `column-grouped && !paired`, which is narrower
than `colRelationship === 'conditions'` — a two-row-header file sets `paired = true` and cannot reach
`condSkip` at all. `naCause.js:5`'s "nothing reads it yet" is stale against nine live readers (§1.7).

---

## Register rows moved from STATUS, S392

STATUS is gitignored and has no git history, so a register row is the only copy of
whatever it holds. These bodies are moved here verbatim; the register row keeps its
claim and points at this section.

### P174 — **the shipped display fails `naCause`'s fixed-denominator requirement on 69 of 135 cluster instances**

open, **allocated S377**. `naCause.js`'s own header binds anything composing a cause: a cause may not assert scale, may not assert a remedy, and may not assert that a different grouping would help. **The fixed-denominator requirement is already failed by the shipped display on 69 of 135 §5 cluster instances**, independently of P93 and of anything S377 touched. Found while reading the contract to see whether a hold-out cause could fit it. **The figure is Code's, from the S377 part 3 read, and has not been independently reproduced.** Not a P93 blocker — it is a live defect in a contract P93 would have to satisfy, so it is worth knowing before P93 composes anything new. `docs/shared/S377-NA-CAUSE-HOLDOUT-FIT.md`
