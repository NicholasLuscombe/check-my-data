# S368 — the ecology cluster's second gate, read at last

Read-only. No `src/` line moved. One batch run at seed offset 0, as a measurement.

The first gate — the §2.10 enforcement stack — was discharged at S367. This session reads the
second one: the display reconciliation against `METHODOLOGY.md` §Applicability, named in three
places in `REALWORLD-CORPUS-SPEC.md` and never opened. Seven corpus files turn on it.

---

## Part 1 — what the second gate actually says

### Where it is named

`REALWORLD-CORPUS-SPEC.md` names the gate in three places, and all three were located by string.
**Neither line citation in the dispatch resolves**: `command grep -rn "1248\|:1246"` over
`docs/shared/*.md` returns nothing. The numbers had already decayed off the text they pointed at, so
what follows is anchored on strings only.

- **The openers**, the `> **S317 — READ §0.3 BEFORE RUNNING ANY FILE.**` block:

  > *"one display reconciliation against `METHODOLOGY.md` §Applicability is named in §0.3 and has not been read."*

- **§0.2's cluster block**, the `**THE ECOLOGY CLUSTER IS BLOCKED (S317).**` paragraph, S367 tail:

  > *"What remains is the display reconciliation against `METHODOLOGY.md` §Applicability, which is unread, so the cluster is undetermined rather than blocked."*

- **The blockers section** — `## Open items`, the `**ROW-GROUPING — BLOCKS SIX FILES AND THE WHOLE ECOLOGY CLUSTER (S317).**` bullet, S367 tail. This is the row-grouping bullet the dispatch asks for:

  > *"The display reconciliation against `METHODOLOGY.md` §Applicability is now the only named gate and is unread."*

**One cross-reference in the openers is wrong.** It says the reconciliation is "named in §0.3". §0.3
does not name it. §0.3's only mention of METHODOLOGY is the **Guards** paragraph citing a per-group
*size* assumption, which is the grouping contract, not the applicability one. The pointer resolves
in §0.2 and in Open items, not in the section the openers send a reader to. Chat-owned; flagged, not
edited.

### The sentence that states the demand

`V1X-FUTURE-WORK.md` §2.10 does not carry the demand itself — it hands it off, twice, in the S322
build note:

> *"Two findings came out of that round and are recorded in METHODOLOGY, not here: … and the coverage denominator (`X of Y ran`) which the applicability contract has since made provisional."*

The demand is stated in `METHODOLOGY.md` §Applicability and Coverage Reporting Contract, final
**Status** paragraph, verbatim:

> **"The contract is stated and cross-validated. It governs no shipped behaviour yet — the vocabulary the display uses for each sense, and the structured field that would carry the distinction, remain to be built. Until then the category coverage denominators, the §5 coverage line, and the clean-result copy are provisional; the denominator form currently shipped (`X of Y ran` per category) predates this contract and has not been reconciled with it."**

**What it demands, in one line:** that three named display surfaces — the category coverage
denominators, the §5 coverage line, and the clean-result copy — be measured against the contract's
stated rules, because the shipped `X of Y ran` form predates the contract and no one has checked it.

**It matches Part 2's checks.** The three named surfaces are checks 1–4; the structured field it
says remains to be built is check 5; the vocabulary for each sense is check 6; the message defect the
same section records is check 7. No substitution was needed and there is no stop condition. Proceeding.

---

## Part 2 — the shipped display, measured at source

Every answer read from `src/` at current file state. The contract was authored 46 sessions ago and
**four of its seven claims about the engine are now false** — noted per check.

### 1. The coverage line — does any surface render both numbers?

**No. Nothing ships the contract's form.** Eight ratio-rendering sites exist and not one pairs
applicable-ran-over-applicable with applicable-over-29:

| Site | What it renders | Shape |
|---|---|---|
| [VerdictBanner.jsx:94](src/components/views/VerdictBanner.jsx:94) | `${cov.ran} of ${BATTERY_SIZE} tests completed${errClause}` | ran / 29 |
| [ReportView.jsx:1611](src/components/views/ReportView.jsx:1611) | `{cov.ran} of {cov.total} tests completed…` (§5) | ran / 29 |
| [ReportView.jsx:1537](src/components/views/ReportView.jsx:1537) | `All ${cov.ran} of ${BATTERY_SIZE} tests completed.` (§4) | ran / 29 |
| [ReportView.jsx:248](src/components/views/ReportView.jsx:248) | `(${cov.ran} of ${BATTERY_SIZE} completed — …)` (text summary) | ran / 29 |
| [excelExport.js:171](src/export/excelExport.js:171) | `${nCompleted} of 29 tests completed — …` | ran / **literal 29** |
| [excelExport.js:724](src/export/excelExport.js:724) | `battery of 29 … ${nCompleted} completed` | ran / **literal 29** |
| [coverage.js:181](src/analysis/coverage.js:181) | `${cov.ran} of ${couldRun}` (cluster clause) | ran / **couldRun** |
| [promptBodyRenderer.js:106](src/analysis/promptBodyRenderer.js:106) | `${c.clearedCount} of ${c.couldRun} tests cleared` | cleared / **couldRun** |

The one site that computes an applicable count into a ratio is
[BatchView.jsx:261](src/components/views/BatchView.jsx:261) — `${r.nApplicable}/${r.nTests}`, where
`nApplicable = cov.ran + cov.withheld` ([:209](src/components/views/BatchView.jsx:209)) and `nTests`
is 29. That is *applicable over 29*, the contract's **second** number, standing alone in a
markdown-copy line — never beside the first, and never on screen.
[VerdictBanner.jsx:85](src/components/views/VerdictBanner.jsx:85) computes `nApplicable` too, but
spends it on the false-positive sentence at [:210](src/components/views/VerdictBanner.jsx:210), not
on coverage.

**Expectation held: absent.**

### 2. The denominator — fixed at 29 on every path?

**No. It splits by surface, and the moving half is the half the contract forbids.**

- **Dataset-level surfaces are fixed at 29** and correct on this rule. `BATTERY_SIZE` is
  `Object.keys(TEST_MECHANISM).length` ([mechanisms.js:75](src/constants/mechanisms.js:75)),
  confirmed `= 29` by direct import. `cov.total` at §5 is the same figure by construction.
  Two Excel sites hardcode the literal `29` instead of importing `BATTERY_SIZE` — a drift hazard, not
  a contract breach.
- **Category and cluster surfaces report against applicable tests alone**, which the contract states
  in bold is **forbidden**. [coverage.js:135](src/analysis/coverage.js:135) —
  `couldRun = cov.total - cov.notApplicable - cov.errored` — then
  [:181](src/analysis/coverage.js:181) renders `ran of couldRun`. The denominator moves with the data,
  which is exactly the failure Gemini/Grok/Sonnet independently broke the first draft on.
- One more, unrelated to the denominator but on the same line:
  [ReportView.jsx:260](src/components/views/ReportView.jsx:260)'s text summary counts completed as
  `group.tests.filter(t => t.flag !== "N/A")`. That is the retired `flag !== "N/A"` proxy that
  [coverage.js:56-57](src/analysis/coverage.js:56) names as the defect the module exists to prevent —
  it drops withheld tests and counts errored ones as completed.

**Measured effect of the moving denominator, on the ordinary fixture corpus.** Across the 27
fixtures, **69 of 135 cluster instances** lose at least one member from `couldRun`. Worked examples
of the header a reader actually sees, all on **clean** files:

```
01-densitometry-clean.csv   Unusual digits                word="Clear"  clause="2 of 2"   couldRun=2 of 5
01-densitometry-clean.csv   Cross-replicate comparisons   word="Clear"  clause="9 of 9"   couldRun=9 of 14
02-densitometry-fabricated  Unusual digits                word="Clear"  clause="2 of 2"   couldRun=2 of 5
03-qpcr-clean.csv           Unusual digits                word="Clear"  clause="3 of 3"   couldRun=3 of 5
```

A green **"Clear · 2 of 2"** over a five-member cluster that examined two. Every word true; the
proportion worthless. This is the contract's own worked argument, shipped.

**Expectation held: the two-number line is absent — and the denominator is worse than expected, not
merely unreconciled.**

### 3. The thin-file sentence

**Does not exist.** `command grep -rn -i "\bthin\b" src/` returns thirteen hits and **none is a
user-facing statement about a file's amenability to screening**. Every hit is either an internal
comment about group size ([groupingTrigger.js:10](src/analysis/groupingTrigger.js:10),
[engine.js:230](src/analysis/engine.js:230),
[ForensicsCategoryBlock.jsx:202](src/components/forensics/ForensicsCategoryBlock.jsx:202)), a
grouping-card arm reason about groups rather than files
([GroupingConfirmCard.jsx:81,83](src/components/forensics/GroupingConfirmCard.jsx:81)), the
typographic "thin spaces", or unrelated prose. The contract's clean-data baseline of 15–26 applicable
tests appears nowhere in `src/`, and nothing computes a comparison against it.

**Expectation held: absent.**

### 4. The completeness disclaimer

**In a section below it, not on the same surface as the clean claim.** The contract requires: *"a
clean result says so on the same surface as the clean claim, not in a section below it."*

- **The clean claim is §1**, `VerdictBanner`. On severity 0 it renders headline *"No signals found"*
  ([VerdictBanner.jsx:90](src/components/views/VerdictBanner.jsx:90)) with the sub-line at
  [:94](src/components/views/VerdictBanner.jsx:94) — `ran of 29 tests completed`, plus an errored
  clause only. **`unassessed`, `pending`, `withheld` and `notApplicable` appear nowhere in that
  component** other than in the `nApplicable` comment. A clean §1 says nothing about applicable
  tests that went unassessed.
- **The disclaimer lives in §4**, [ReportView.jsx:1519-1536](src/components/views/ReportView.jsx:1519),
  and it is well built — it selects pending → unassessed → not-run in that order, with singular
  variants, and *"this screen says nothing about them."* But §4 is three sections below the banner.
- §3 cluster headers carry a coverage-aware word ("Clear so far" when `unassessed + pending > 0`,
  [coverage.js:162](src/analysis/coverage.js:162)), which is honest but is a per-cluster word, not
  the clean claim.

So the honest sentence exists and is nowhere near the claim it must qualify.

### 5. The N/A result shape — is it still `{name, category, flag, primaryP, description}`?

**No. This claim is false at the current file state, and the "single exception" framing is false
twice over.** Measured over all 270 N/A results on the 27 fixtures (scratchpad probe, read-only):

```
N/A results: 270
  name / category / flag / naCause   270 each   ← naCause is on EVERY ONE
  description                        270
  naCauseText / naTailText           102 each
  naObserved / naMinimum              76 each
  primaryP                            43        ← present on only 16% of them
  details                             19
  erroredCoverage                      3
  naCauses                             3
  (+ vstTransform, skippedColumns, nValues, pass1Status, pass2Status,
     insufficientPairs, nConditionPairs, nSuspicious)
```

Three corrections to the contract:

1. **The enum exists and it is universal.** `NA_CAUSE`
   ([src/constants/naCause.js](src/constants/naCause.js)) is a 17-code enum, landed at
   **`8253eb8` — "S331 P39 step 1: structured naCause codes on N/A return sites"**, nine sessions
   after the contract was written. It is stamped on 270 of 270. The contract says "no reason code, no
   applicability field, and no enum."
2. **The enum already carries the contract's own two senses.** Its header splits the codes into
   **Declines** ("the data KIND or structure is wrong… More data or a different grouping would not
   help") and **Shortfalls** ("the test could run but there is not enough of something") — the same
   cut the contract calls *not applicable* versus *not assessed*, authored independently.
3. **`primaryP: null` is not the shape.** Most N/A results omit the field entirely rather than
   nulling it.

**The second structured markers, named.** `groupingPending` is no longer alone. Alongside it:
`naCause` (universal), `naCauses` (the mixed-bucket rollup,
[aggregation.js:103](src/analysis/aggregation.js:103)), `erroredCoverage`
([aggregation.js:101](src/analysis/aggregation.js:101)), `groupingUnassessed` (the S322 N/A exit),
plus the count pair `naObserved` / `naMinimum` and the text pair `naCauseText` / `naTailText`.

**And here is the finding that matters.** The structured field the contract says "remains to be
built" **is built** — and `classifyCoverage` does not read it. Every N/A that is not pending,
unassessed, errored or withheld falls through to `notApplicable` at
[coverage.js:88](src/analysis/coverage.js:88), whatever its cause. Measured:

> **145 of 270 N/A results classify as `notApplicable` while carrying a SHORTFALL cause** — 33
> `rangeOutOfBand`, 33 `tooFewConditions`, 30 `tooFewColumns`, 25 `missingnessOutOfBand`, 10
> `tooFewRows`, 6 `tooFewObservations`, 5 `shapeNotCovered`, 2 `emptyInput`, 1 `tooFewDistinct`.
> Only 104 carry a genuine decline cause.

The contract says fuzzy cases **default to not assessed**, "because that never lets a real gap hide
as a non-event." The shipped classifier defaults them the other way — and `notApplicable` is
subtracted from `couldRun`, so each one silently shrinks a cluster denominator. That is the
mechanism behind the "Clear · 2 of 2" figures in check 2: the two halves of this contract fail
*together*, and the field that would fix it is already on every result.

**Expectation inverted.** `groupingPending` is not the only structured marker; the marker set is
large, universal, and load-bearing everywhere except the one classifier that decides coverage.

### 6. The two N/A senses on the four grouping-held cards

**The pending sense ships and renders distinctly. The settled sense no longer renders on that
surface at all.**

`PendingRow` ([ForensicsCategoryBlock.jsx:205-215](src/components/forensics/ForensicsCategoryBlock.jsx:205))
renders three distinct strings in an amber attention register (`UI.WARN` background, border, 3px left
rule):

- `"N/A — grouping needs confirmation"` (pending, neither arm 2)
- `"N/A — groups too small to test"` (pending, arm 2)
- `"N/A — not assessed (grouping left unconfirmed)"` (the S322 N/A exit)

The settled counterpart is a different matter. The comment at
[:200-201](src/components/forensics/ForensicsCategoryBlock.jsx:200) still describes `PendingRow` as
*"visually distinct … from a settled `N/A — not applicable`"* — **but that row was moved out of §3 at
S333.** [ForensicsBody.jsx:454-457](src/components/forensics/ForensicsBody.jsx:454) records it:
*"Not-applicable and errored tests are no longer surfaced here — section 5 lists every declined test
grouped by reason."* The literal string `"N/A — not applicable"` **does not exist anywhere in
`src/`** — the only `N/A —` strings are the three above.

So the two senses *are* distinguishable, but not by contrast on one surface: pending/unassessed are
amber rows in §3, settled declines are reason-grouped entries in §5 via
`groupNotApplicableByReason`. A reader comparing them is comparing across two sections, and the
in-source comment asserts a same-surface contrast that has not existed for 35 sessions.

**One more thing this check turned up, and it is why the gate could sit unread so long: the batch
cannot see any of it.** `groupingPending` results across all 27 fixtures: **0**.
`groupingUnassessed`: **0**. No fixture exercises the pending path. The four grouping-held cards have
**zero fixture coverage**, so a green batch says nothing whatever about check 6.

**Expectation partly inverted.** Both enforcement parts are on main and the pending strings do ship
and do render distinctly — that half held. But the settled string they are supposed to contrast with
is not on that surface, and no fixture drives the path.

### 7. The known message defect

**Not live. Fixed, and the contract's fixture list was wrong about the tests as well as the count.**

Probe over all 27 fixtures, matching `/No DATA columns\./` on the descriptions of Column
Goodness-of-Fit, Modality and Entropy: **zero hits**.

`aggregatePerGroup` no longer inherits the empty-matrix probe's self-description. It takes only
`name` and `category` from the prototype and composes its own reason
([aggregation.js:98-106](src/analysis/aggregation.js:98)), with the comment naming the exact defect:
*"The probe hits each test's `nC < 1` guard, whose 'No DATA columns.' message is false about a
dataset that does have columns."* It also stamps `erroredCoverage: true` so the classifier reads a
field rather than the note. The three per-test `nC < 1` guards
([columnGof.js:72](src/tests/columnGof.js:72), [entropyTest.js:35](src/tests/entropyTest.js:35),
[modality.js:175](src/tests/modality.js:175)) still return `"No DATA columns."`, which is correct —
that is the genuinely empty-input case.

**The five fixtures, measured individually:**

| Fixture | Column GoF | Modality | Entropy |
|---|---|---|---|
| DS03 | N/A · **notApplicable** · `tooFewObservations` · *"…no condition group has the 30 values…"* | N/A · notApplicable · `tooFewObservations` | **LOW — ran** |
| DS04 | N/A · notApplicable · `tooFewObservations` | N/A · notApplicable · `tooFewObservations` | **LOW — ran** |
| DS09 | N/A · **errored** · `shapeNotCovered` · *"No group had sufficient data for this test."* | **LOW — ran** | **LOW — ran** |
| DS12a | N/A · errored · `shapeNotCovered` | **LOW — ran** | **LOW — ran** |
| DS12b | N/A · errored · `shapeNotCovered` | **LOW — ran** | **LOW — ran** |

So the defect's real footprint today is **one test on three fixtures**, not three tests on five — and
on that footprint the description and `details[0].note` are now the same accurate sentence. On DS03
and DS04 the aggregator path is not taken at all; those two tests decline earlier with an accurate,
count-bearing sentence. Entropy is not involved on any of the five.

**Expectation inverted.** The defect is not live on all five fixtures; it is not live anywhere.

---

## Part 3 — the verdict

**Runnable with a named caveat.**

The caveat: **the §3 category coverage denominator moves with the data, so a cluster header can read
a green "Clear · N of N" over a cluster where members were dropped from the denominator.** Read the
ecology cluster's coverage off §5 (`ran of 29`, plus the "N not run" clause) and §4; never off a §3
cluster header, and never quote a cluster ratio in an adjudication.

The evidence, in three lines:

1. **No verdict moves.** Every defect found is coverage presentation. Test-level flags, p-values and
   the four grouping-held cards' own copy are unaffected, the pending/unassessed strings ship and
   render distinctly (check 6), the §5 line and every dataset-level clean claim use a fixed 29
   (checks 1–2), and the message defect that would have mislabelled three tests is already fixed
   (check 7).
2. **The one real breach is corpus-wide, not cluster-specific.** The moving denominator fires on 69
   of 135 cluster instances across the ordinary fixtures — including `01-densitometry-clean` — and
   145 of 270 N/A results are filed as `notApplicable` on shortfall causes. Running the ecology
   cluster does not create this and holding it does not avoid it; blocking on it would retroactively
   block every run the tool has already made.
3. **The gate's own demand is now discharged as a read.** The three surfaces METHODOLOGY named
   provisional have been measured: the §5 line reconciles on the denominator rule, the clean-result
   copy reconciles on the denominator and fails the same-surface rule, and the category denominators
   do not reconcile at all. That is a stated, bounded caveat a reader can carry — not an
   uninterpretable output.

**My advance lean was right and its stated ground was wrong.** I leaned runnable because the
enforcement stack has been on main forty-four sessions. That is not the reason — an old stack can
ship an old defect, and this one did. The reason is (2): the defect is uniform across the corpus, so
it changes nothing about the *cluster* relative to every other file. Recorded because the dispatch
asked for the lean to be checkable, and the ground moved even though the verdict did not.

**Not fixed. Not scoped.** The fix is a separate dispatch and Nick's call. If it is taken, the two
halves are one change: `classifyCoverage` reading `naCause`'s existing decline/shortfall split, and
`couldRun` losing its `- cov.notApplicable` term. The field is already on all 270 results.

---

## Part 4 — the batch, at seed offset 0

`node test/validate-batch.mjs`, one run, no tuning, no re-baseline, `WRITE_MATRIX` untouched.

**The runner prints: `27/28 passed — 1 FAILED`.**

**DS12b is the sole failure, and it fails the completeness gate** — assertion (c), the undeclared-firing
lane:

```
✗ 12b-uniform-mixture-fabricated.csv: severity=1 [LOESS Residual Analysis:MODERATE, Regional Noise Homogeneity:MODERATE]
    ↳ completeness gate — undeclared MOD/HIGH firing(s): Regional Noise Homogeneity — declare a cell in expected.flags or add to ACKNOWLEDGED with a reason
```

Three qualifications on that failure:

- **Severity is not the failure.** DS12b returned `severity=1`, which matches `expected.severity`.
  The severity assertion passed.
- **The flag matrix is not the failure either.** `test/flag-matrix.json` loaded (37 KB, 27 fixture
  keys) and the comparison printed no divergence. DS12b's cells are pinned there as
  `LOESS Residual Analysis => MODERATE` and `Regional Noise Homogeneity => MODERATE` — the firing is
  recorded, stable, and matches. What is missing is its *declaration* in
  `expected.flags` / `ACKNOWLEDGED` in `test/batch-fixtures.mjs`. This is a bookkeeping gap, not a
  moving detection.
- **`METHODOLOGY.md` is right and the "28/28" surfaces are wrong.** One run settles it: at seed
  offset 0 the batch is 27/28. `CLAUDE.md:301` already records the correct reading and its
  seed-dependence — *"On seeds 3, 5 and 7 DS12b's Regional Noise goes LOW … the batch is fully
  green; on seed 2 there are two failures."* Any surface asserting a bare 28/28 has dropped the
  offset.

---

## What moved in `CLAUDE.md`

One line. [CLAUDE.md:564](CLAUDE.md:564), the close-out step-2 instruction, offered `28/28` as the
steady-state batch figure a session should expect to still see. At seed offset 0 that is false and
has been for some time; it also contradicts `CLAUDE.md:301`, which states the seed-0 reading
correctly. Corrected to name 27/28 at offset 0 and to point at the P101 seed-dependence note. No
other CLAUDE.md claim was falsified by this read — `:301` and `:536` (270 N/A cells, all carrying a
cause) were both **confirmed** by measurement.

`STATUS.md` untouched (Chat's). `METHODOLOGY.md`, `REALWORLD-CORPUS-SPEC.md` and
`V1X-FUTURE-WORK.md` untouched (Chat's) — the four corrections they need are listed below for Chat
to resolve.

---

## For Chat — corrections found in Chat-owned docs, not applied

1. **`REALWORLD-CORPUS-SPEC.md` openers** — "named in §0.3" does not resolve; §0.3 does not name the
   applicability reconciliation. It resolves in §0.2's cluster block and in Open items.
2. **`METHODOLOGY.md` §Applicability, "The engine does not currently carry the distinction"** —
   false at current source. `NA_CAUSE` is a 17-code enum on 270 of 270 N/A results since `8253eb8`
   (S331), it already splits declines from shortfalls, and `groupingPending` is one of at least six
   structured markers. `primaryP: null` is also not the shape — the field is absent on 84% of them.
3. **`METHODOLOGY.md` §Applicability, "One known message defect"** — fixed. Zero `"No DATA columns."`
   hits across the 27 fixtures; the aggregator composes its own reason and stamps `erroredCoverage`.
   The footprint was also mis-stated: one test (Column GoF) on three fixtures (DS09, DS12a, DS12b),
   never Modality or Entropy, never DS03 or DS04.
4. **`METHODOLOGY.md` §Applicability, Status** — the paragraph's own framing is now stale in the
   useful direction: the structured field it says "remains to be built" is built and shipped. What
   remains is one consumer — `classifyCoverage` reading it.

---

## Provenance

- Batch: `node test/validate-batch.mjs`, seed offset 0, one run, `WRITE_MATRIX` unset.
- Checks 5 and 7 measured by two read-only scratchpad probes mirroring `validate-batch.mjs`'s fixture
  setup exactly (same `preprocessRaw` → `detectHeaderRows` → `inferRoles` → `extractAnalysisInputs`
  → `detectVST` → `suggestRowSemantics` → `runFullAnalysis` chain, same `EXPECTED` map). Probes live
  in the session scratchpad and are deliberately **not** committed — nothing was added to
  `test/probes/`, and no `src/` line moved.
- Checks 1–4 and 6 read at source; every line number above was re-located by string in this session.
- No screenshots, no browser verification, no dev server.
