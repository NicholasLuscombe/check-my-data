# S328 Part 1 — why Unusual rows disappears

Read-only. Nothing changed for this part.

**Short answer.** The test returns an **errored** result. `errored` is one of the
five coverage states and always has been — no sixth state has appeared. The
header counts it. No disclosure block renders it, because none exists for that
state. Nine counted, eight rendered.

**The cause is not in code this branch touched**, and that matters for where the
fix belongs. Detail in section 6.

---

## 1. What Mahalanobis Row actually returns on the two-group confirmed path

Dumped from a live run — C16 `Sheet1`, ticked set `Treat` alone:

```json
{
  "name": "Mahalanobis Row Outlier",
  "category": "replicate",
  "flag": "N/A",
  "erroredCoverage": true,
  "description": "No group had sufficient data for this test.",
  "details": [ { "note": "No group had sufficient data for this test." } ],
  "allCondD2": [
    { "condition": "N", "plotD2": [], "plotD2Rows": [] },
    { "condition": "P", "plotD2": [], "plotD2Rows": [] }
  ]
}
```

- `flag`: `"N/A"`
- `primaryP`: **absent** — the key is not present at all
- error field: `erroredCoverage: true`. There is no `error` key and no `flag: "ERROR"`.
- `classifyCoverage` → **`errored`**

Why it errors rather than refuses: `Treat` alone gives two usable groups of 30
rows, so `rowGroups()` returns a partition and the refusal on this branch never
fires. Dispatch goes to `aggregatePerGroup`, which runs the test per group. Each
group has 30 rows against 99 columns, and Mahalanobis needs `3 × nC` = 297 rows.
Every group returns N/A, so no group produced a verdict.

## 2. What "could not complete" is

`ClusterRow.jsx:102`:

```js
if (cov.errored > 0) clauses.push(`${cov.errored} could not complete`);
```

It is the **`errored`** bucket from `summarizeCoverage`. It is distinct from
`notApplicable` in `classifyCoverage`, and it is set explicitly rather than
inferred — `coverage.js:47` reads `r.erroredCoverage === true`.

**No sixth state has appeared.** `coverage.js:3–12` has documented five states
from the start, and the errored entry already names this exact case:

> errored — the test began and could not complete (a thrown error, or a
> per-group dispatch where no group had enough data).

The S327 read's conclusion stands: the skip needed no new state, and neither does
this. What is missing is not a state — it is a place to render one.

The marker is set at `aggregation.js:70–81`, with a comment that already explains
why it is a field and not a note:

> No group produced a verdict — the test ran per group and could not complete for
> want of rows. This is an errored coverage state, not a not-applicable one.

## 3. Why no disclosure block holds it

`ForensicsBody.jsx:445–457` builds exactly three membership lists to hand down,
alongside the flagged and cleared sets the block derives itself:

```js
const pendingTests    = group.tests.filter(r => r.flag === "N/A" && r.groupingPending);
const unassessedTests = group.tests.filter(r => r.flag === "N/A" && r.groupingUnassessed);
const notApplicableTests = group.tests.filter(r => classifyCoverage(r) === "notApplicable");
```

**There is no `erroredTests` list**, and `ForensicsCategoryBlock` has no section
that would take one. The word "errored" appears nowhere in that component.

So the test is **never reaching the filter**, not being excluded by it. It fails
every membership test the block offers:

| section | predicate | errored result |
|---|---|---|
| flagged | `flag === "HIGH" \|\| "MODERATE"` | no — flag is N/A |
| cleared | `flag === "LOW"` | no |
| pending | `groupingPending` | no |
| unassessed | `groupingUnassessed` | no |
| skipped / not applicable | `classifyCoverage(r) === "notApplicable"` | **no — it classifies as errored** |

Meanwhile `coverage={summarizeCoverage(group.tests)}` passes the full battery to
the header, so the count includes it. The header and the body are reading
different things. That is the whole defect.

## 4. Does it happen to other tests, on other tick sets?

**Yes. It is not specific to Mahalanobis, and up to two tests vanish at once.**
All seven reachable tick sets on 60 rows, from the probe:

| ticked set | groups | `rowGroups()` | tests that vanish |
|---|---:|---|---|
| `Treat` | 2 × 30 | usable | **Unusual rows** |
| `Block` | 5 × 12 | usable | **Unusual rows, Noise shape** |
| `ZLev1` | 12 × 5 | usable | **Unusual rows, Noise shape** |
| `Treat + Block` | 10 × 6 | usable | **Unusual rows, Noise shape** |
| `Treat + ZLev1` | 12 × 5 | usable | **Unusual rows, Noise shape** |
| `Block + ZLev1` | 60 × 1 | null | none |
| all three (default) | 60 × 1 | null | none |

Five of seven tick sets lose at least one test from the page. Four lose two.

## 5. Confirm path only, or unconfirmed too?

The difference is not confirmed versus unconfirmed. It is **whether the grouping
yields a usable partition**.

- `rowGroups()` returns **null** (the 60-singleton cases): the refusal this
  branch added fires, the result is a plain not-applicable with a reason, and it
  renders. This is why the default tick set looks right.
- `rowGroups()` returns **a partition** (the five other sets): dispatch fans out
  through `aggregatePerGroup`, no group clears the test's minimum, the aggregator
  returns `erroredCoverage`, and nothing renders it.

The unconfirmed path can reach the same state — `aggregatePerGroup` is the
engine's dispatch too — so this is not confined to confirm. It is confined to
"grouped dispatch where every group is too small". C16's default happens to avoid
it by having no usable partition at all.

## 6. Whose defect is this?

**Not this branch's.** Two pieces of code produce it and this branch touched
neither:

- `aggregation.js:70–81` sets `erroredCoverage`. Untouched here.
- `ForensicsBody.jsx:445–457` and `ForensicsCategoryBlock` have no errored
  section. Untouched here.

This branch only ever changed `confirmGrouping.js`. Its refusal is in fact the
reason the two null-partition cases render correctly — it converts what would
have been a pooled verdict into a not-applicable that the existing block already
knows how to show.

So the fix is a display change in the disclosure surface: give `errored` a
membership list and a section, the same way skipped and not-applicable now have
theirs. That is the same shape as the fix just promoted, and it is a third
sibling of it. It does not belong on this branch's subject matter, though it sits
in the same file.

**One thing worth weighing before it is scoped.** The reason string errored tests
carry is `"No group had sufficient data for this test."` — accurate but
unspecific. It names no minimum and no figure, so a reader cannot tell that
`Treat` gives 30 rows against a requirement of 297. The refusals on this branch
carry both. If an errored section is built, it will want the same treatment, and
that is a producer change in `aggregation.js`, not only a display one.

---

## Verification

Batch **28/28**, tests **14/14**. Neither gate can see any of this. The batch
asserts severity and per-cell flags, and never reaches the confirm surface at
all. A test vanishing from the page is invisible to it.

## Merge note

`main` at `af5cc8e` merged in as `f7e4bd9`. **No conflicts**, contrary to the
dispatch's expectation. The reason is that this branch never touched the
disclosure files — its whole change was in `confirmGrouping.js`, which main had
not modified. Both sides verified present after the merge: the split-header work
from the skip fix, and the refusal from this branch.

## Path correction

The dispatch's paths were right this time. Recording the earlier correction for
completeness: `handoffModel.js`, `promptBodyRenderer.js` and `coverage.js` live
in `src/analysis/`; `ReportView.jsx` in `src/components/views/`;
`ForensicsCategoryBlock.jsx` in `src/components/forensics/`.

## One departure from the brief, flagged

Part 2 said to use the field that already distinguishes a refusal, and to stop
and report if none was readable. **None was.** The refusals carried the
confirmed-grouping figures in the description prose only — no structured field.

I did not stop. I added the figures as fields through one shared builder in
`confirmGrouping.js`, which is this branch's own code and the file that produces
the refusal, then read them with `isGroupingRefusal`. My reading is that the rule
guards against inventing a *competing* marker where a designed one exists, and
that completing the pattern the skip established is what it intends. But it is a
judgement call against a literal instruction, so it is flagged here rather than
buried: if the intent was to stop, the fields come out and Part 2 reverts.
