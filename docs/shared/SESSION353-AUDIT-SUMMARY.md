# S353 — can any surface say a test was withheld?

**Read-only audit. Nothing was fixed.** Every defect below is a row, not a patch.

**The finding.** The battery has five test states and the vocabulary has four. `withheld by decision` —
a test that applies, would have run, and is deliberately not reported — is encoded only in
`naCause`/`naCauseText`. Every summary surface but one classifies on `flag` instead, and `flag` for a
withheld test is `"N/A"`, indistinguishable from not-applicable.

**One cause, not several counting bugs.** Confirmed. See §3.

---

## Expectations

| # | Expectation | Result |
|---|---|---|
| 1 | More surfaces render a test's state than the six in the dispatch | **held** — 15 found, and that is a floor |
| 2 | Exactly one expresses the withheld state correctly | **held** for product surfaces — §5's grouped panel. The batch runner also expresses it, but only because a bespoke record was hand-written at S352; it has no category either |
| 3 | The wrong renderings share one cause | **held** — and the cause is precise, see §3 |
| 4 | The outcome-calibration line counts a withheld test among its applicable tests | **inverted** — it *excludes* it. `applicableTests` filters `r.flag !== "N/A"` |
| 5 | The empty-expand defect has a different cause | **held** — and it is far wider than the withheld question |

---

## 1. The surface catalogue

Derived from the code, not from the screenshots. Searched with `command grep` across `src/`, `scripts/`
and `test/`.

**How withheld is encoded.** One site: `engine.js:377` stamps
`naCause: NA_CAUSE.SUBJECTS_SHARED_ACROSS_CONDITIONS`, plus `naCauseText` / `naTailText`. The `flag` is
`"N/A"`, identical to a genuine not-applicable. **Exactly one consumer in `src/` reads `naCause` for
grouping** — `groupNotApplicableByReason` — and that is the one surface that gets it right.

| # | Surface | Renders | States it can express | Fifth falls back to |
|---|---|---|---|---|
| 1 | `analysis/coverage.js` `classifyCoverage` | the classification itself | ran, notApplicable, unassessed, errored, pending | **notApplicable** — the root |
| 2 | `shared/ClusterRow.jsx` | group header word + `X of Y` | 4 of 5 | notApplicable, and it leaves *both* sides of the ratio |
| 3 | `shared/CategoryRow.jsx` | QC and peer-review group header | forwards to ClusterRow | same |
| 4 | `forensics/ForensicsCategoryBlock.jsx` | expand body, `N tests cleared` row | flagged, cleared, pending, unassessed | **renders nothing at all** |
| 5 | `analysis/handoffModel.js` `buildOutcome` | `applicableTests` | ran vs not | excluded from applicable |
| 6 | `analysis/handoffModel.js` `otherClustersAllClear` | "all applicable tests cleared" | ran vs not | excluded, so the cluster reads complete |
| 7 | `analysis/handoffModel.js` `notRun` | the not-run list + verbatim reason | ran vs not | listed, with its true reason |
| 8 | `analysis/promptBodyRenderer.js` | §4 prompt text | renders 5–7 | inherits |
| 9 | `views/VerdictBanner.jsx` | `With N tests applied…` chance line | ran vs not | excluded from N |
| 10 | `views/VerdictBanner.jsx` | `N of 29 tests completed` sub-line | ran vs battery | silent, but honest |
| 11 | `export/excelExport.js` | legend row + severity-0 narrative | 4 flags | **`N/A` legend asserts "not applicable"** |
| 12 | `views/BatchView.jsx` | per-file applicable count, flag label map | 4 flags | excluded / labelled `N/A` |
| 13 | `scripts/build-test-display-map.mjs` | per-test fire column | fired / `— latent` | **`— latent`** |
| 14 | `test/validate-batch.mjs` | allow-set assertion + `SUSPENDED` print | 4 flags **+ suspended** | expresses it — by hand-written record |
| 15 | `views/ReportView.jsx` §5 grouped panel | `ran/total` per cluster + reason groups | **all five** | **expresses it correctly** |

Plus `ReportView.jsx` §5's headline sentence (`N of 29 completed, M not run`), which is honest and
undistinguished.

**This count is a floor.** It would rise if a surface renders state through a prop already classified
upstream, or builds a string my greps did not match. I read the main render paths; I did not read all 26
MiniCards, which render per-test state rather than aggregate state.

---

## 2. Classification

### Class A — renders something false. A reader is misinformed.

| Surface | What it renders on DS02 | Why it is false |
|---|---|---|
| `ClusterRow` header | `Clear · 3 of 3` on Copy-paste/edit | The cluster has **4** members. `couldRun = total − notApplicable − errored` removes the withheld test from numerator **and** denominator, so the ratio reports completeness that was not achieved. Its own comment says a not-applicable test "was never on the table for this data" — the one thing that is not true of a withheld test |
| `ClusterRow` header | `Not applicable` on Cross-condition | One of the three members was withheld, not inapplicable |
| `CategoryRow` | same, in QC and peer-review modes | Same renderer, two more modes |
| `handoffModel` → `promptBodyRenderer` | "Copy-paste/edit cluster — all applicable tests cleared (3 tests)" **and** lists Residual Spike Correlation under "Tests not run" | The same document asserts the cluster is complete and names the missing member. Measured on DS02: contradiction present |
| `handoffModel.buildOutcome` | `applicableTests = 16` of a 29-test battery | Two applicable tests were withheld and are not counted |
| `VerdictBanner` chance line | "With 16 tests applied, 1–2 flags by chance would be expected" | Understates the multiple-comparison denominator |
| `excelExport` legend | `N/A — Test not applicable to this dataset (insufficient data, wrong data type, etc.)` | Flatly false for a withheld test, and it is the legend the whole export keys to |
| `build-test-display-map.mjs` | `Residual Spike Correlation … — latent` | The doc's own text glosses latent as "no fixture declares a HIGH or MOD". It fired on DS02 and DS11 and was withdrawn by decision. **Cross-Condition Consistency is unaffected** — DS15 and DS19 are unpaired, so it still fires there |
| `BatchView` | applicable count per file | Same `flag !== "N/A"` proxy, and it ships to users |

### Class B — omits without asserting anything false.

- `ForensicsCategoryBlock` expand — the withheld test simply does not appear. The `3 tests cleared` row
  is true as far as it goes; it is the header above it that makes the omission read as completeness.
- `handoffModel.notRun` — lists the test with its true reason. It cannot say *why this is different from
  the other declines*, but it says nothing false.
- `VerdictBanner` sub-line and `ReportView` §5 headline — "N of 29 completed, M not run". True.

### Class C — wording or cosmetics.

None found. Every defect is a count or a claim, not a phrasing.

### Correct

- **`ReportView` §5 grouped panel.** Its ratio is `{ranTests.length}/{g.tests.length}` — the full member
  list, so the withheld test stays in the denominator. And `groupNotApplicableByReason` keys on
  `naCauseText`, so the withheld test gets its own reason heading rather than joining the
  not-applicable pile. It is right for a reason: it is the only surface that reads the field the state is
  actually encoded in.
- **`validate-batch.mjs`**, but by construction rather than by category. It expresses the state only
  because S352 hand-wrote a `SUSPENDED` record and an `['N/A']` allow-set. Give it a third withheld test
  and it says nothing until a human writes another entry.

---

## 3. The shared cause — named, and it holds

**One cause.** Every wrong rendering uses one of two proxies for "did this test apply":

- `classifyCoverage(r)`, whose only fallback is `notApplicable`;
- `r.flag !== "N/A"`, used directly in `handoffModel`, `VerdictBanner`, `BatchView` and `ReportView`.

Both collapse withheld into not-applicable, and both do so for the same reason: **the state is carried in
`naCause` and nothing but `groupNotApplicableByReason` reads it.** The one surface that reads that field
is the one surface that is correct. That is not a coincidence, and it is the test of the hypothesis.

So a single fix reaches all of Class A: give the classifier a sixth state, return it when `naCause` is
the withheld code, and have the surfaces that currently subtract `notApplicable` subtract the new state
separately or not at all. The dispatch's alternative — four independent counting bugs — is ruled out:
they are not four predicates, they are two, and both are downstream of one missing field read.

**One caveat on scope.** `classifyCoverage`'s docstring states an invariant the report leans on —
`ran + notApplicable + unassessed + errored + pending === battery` — and `summarizeCoverage` warns to the
console if it breaks. A sixth state changes that invariant, so every consumer of the five-bucket sum has
to be revisited in the same change. That is 8 call sites across `ReportView`, `ForensicsBody`,
`VerdictBanner` and `ClusterRow`.

---

## 4. The empty expand — a different defect, and much wider

**Predicate, from the code.** `ForensicsCategoryBlock` renders exactly four member groups in its expand:
`flaggedTests` (HIGH/MODERATE), `clearTests` (LOW), `pendingTests`, `unassessedTests`. Not-applicable
and errored deliberately render nowhere — the block carries an explicit comment saying the S333 split
moved them to §5 to remove duplication. So the expand is empty whenever
`ran + pending + unassessed === 0`, and `ForensicsBody` mounts the block regardless.

**Reach, measured across all 27 fixtures:**

- **23 empty-expand groups, across 17 of 27 files.**
- **Only 5 of the 23 contain a withheld test.**
- 9 files carry a withheld test at all.

| File | Cluster | Members | Withheld |
|---|---|---|---|
| DS01, DS02, DS03, DS04 | Cross-condition comparisons | 3 | 1 each |
| DS11 | Cross-condition comparisons | 3 | 1 |
| DS05, DS06, DS07, DS08, DS13, DS23, DS24, vfs-a, vfs-b, vfs-c | Cross-condition comparisons | 3 | 0 |
| DS05, DS06, DS11, DS13, DS14 | Distribution shapes | 3 | 0 |
| DS14 | Unusual digits | 5 | 0 |
| DS14 | Cross-condition comparisons | 3 | 0 |
| DS19 | Cross-replicate comparisons | 14 | 0 |

**It is a different defect.** It predates P82 and P86 — 18 of the 23 have nothing to do with the paired
skip, and it is live on ordinary uploads, not only paired ones. DS19's is the sharpest: a 14-member
cluster that expands to nothing. Fixing the state vocabulary would not make any of these non-empty; the
block needs an empty state, or the row needs to stop being expandable when it has no children.

The two do interact on the five paired cases: the header says `Not applicable` (Class A) *and* the expand
is empty (this defect). Fixing either alone still leaves the cluster unreadable.

**This count is exact for the 27 fixtures at the shipped seed and the batch's own import config.** It
would rise on files with different role assignments, different data types, or a confirmed-grouping path.

---

## 5. The three fixture numbers — reported, not fixed

| Number | Where it comes from | Hardcoded? |
|---|---|---|
| **24** | `FIXTURES.length` in `test/batch-fixtures.mjs`. The generator walks it at `build-test-display-map.mjs:61` and `:95` | no — derived |
| **22** | A string literal: `build-test-display-map.mjs:125` writes `'…over the shared 22-fixture set…'` | **yes** |
| **27** | `Object.keys(EXPECTED).length`. `validate-batch.mjs` iterates `EXPECTED`, which carries the three `vfs-*` regression fixtures that `FIXTURES` omits | no — derived |

The generator's own completion line at `:231` prints `${FIXTURES.length}`, so the script reports 24 to
stderr while the document it writes says 22. A second literal sits at `:189` — `'Seven tests are
— latent'` — also uncomputed, and the latent set has since changed.

So the doc under-reports its own coverage by two, the generator under-walks the batch by three, and
neither number is derived from the other.

---

## 6. What would raise every count here

- **15 surfaces** — a surface that renders state from a prop classified upstream, or builds its string in
  a way my greps missed. The 26 MiniCards were not read individually; they render per-test state, not
  aggregate state, so they are the likeliest omission.
- **9 Class A rows** — same reason, plus any surface whose falsehood only appears on data the corpus does
  not contain.
- **23 empty groups** — other files, other role assignments, other data types.

Nothing here is asserted from a truncated read. Where output was long I re-ran narrowed rather than
concluding from what was visible.
