# S325 — Confirm-path guard divergence (code read, read-only)

Read-only. Nothing was changed. This read establishes what the fix should be. It does not
make it. The lean offered in the prompt — move the upfront checks into one shared module
both dispatch sites call — is tested against source below, not assumed.

## Summary up front

- **There are two divergences between the engine path and the confirm path, not one.**
  The prompt names both. They have different causes and different fixes.
- **Divergence one — errored instead of not-applicable.** On a grouping whose groups are
  usable but too small, the engine returns a clean not-applicable for Column Goodness-of-Fit
  and Modality. The confirm path errors both, because it lacks the upfront
  `noGroupMeetsMin` check the engine gained at S324. This is the half the shared-helper lean
  fixes.
- **Divergence two — pooling instead of holding.** On a grouping whose groups are
  singletons, `rowGroups()` returns null, and both paths contain the same fall-through to a
  pooled run. The engine never reaches it, because a null partition always trips the trigger
  and the four tests return pending first. The confirm path drops the pending guard by
  design, reaches the fall-through, and pools. **No applicability check fixes this**, because
  the check sits inside the `if (rowGroups)` branch that a null partition skips.
- **Feasibility verdict: the shared helper covers divergence one cleanly and does not touch
  divergence two.** Two fixes are needed. The shared helper is the better structure for the
  first. The second is a confirm-only decision about what confirming an unusable grouping
  should mean, and no version of the applicability module answers it.

## The engine's upfront checks at source

The prompt asks for all four. All four live inside `runFullAnalysis` in
`src/analysis/engine.js`. They are not one check repeated — they are four different
predicates over three different inputs.

**Row-Mean Runs** (`engine.js:604-618`). Asserts that the data carries row-level condition
labels: `if (!condCtx?.rowConditions)`. Returns a not-applicable naming the shape problem
("Not applicable without row-level condition labels…"). The caller returns that object in
place of dispatching the test. Input: `condCtx.rowConditions`, a presence flag.

**Column Goodness-of-Fit** (`engine.js:535-546`). Asserts that at least one group clears the
test's observation minimum: `if (noGroupMeetsMin(rg, GOF_MIN_OBS))`, where `GOF_MIN_OBS = 30`
(exported from `src/tests/columnGof.js:49`). Returns a not-applicable ("no condition group
has the 30 values this goodness-of-fit test needs…"). The check sits **inside** the
`if (rg) { … }` branch; when it passes the caller runs `aggregatePerGroup`. Input: `rg` (the
`rowGroups()` object) and the constant.

**Modality Test** (`engine.js:548-560`). Same shape as Column Goodness-of-Fit:
`if (noGroupMeetsMin(rg, MODALITY_MIN_N))`, where `MODALITY_MIN_N = 50`
(`src/tests/modality.js:62`). Returns a not-applicable ("…the 50 values this modality test
needs"). Also inside the `if (rg)` branch. Input: `rg` and the constant.

**Mahalanobis Row Outlier** (`engine.js:449-452`). Asserts the whole-dataset column count:
`if ((matrix[0]?.length || 0) < MAHAL_MIN_COLS)`, where `MAHAL_MIN_COLS = 3`
(`src/tests/mahalanobis.js:7`). Returns a not-applicable ("Not applicable with fewer than 3
replicate columns…"). This sits **before** any group split, not inside an `if (rg)` branch.
Input: `matrix`, a whole-dataset fact.

`noGroupMeetsMin` itself is at `engine.js:312-314`:

```js
function noGroupMeetsMin(rowGroups, minRows) {
  return !Array.isArray(rowGroups) || !rowGroups.some(g => (g.matrix?.length || 0) >= minRows);
}
```

It is a local function declared inside `runFullAnalysis`. It is not exported, so it is not
importable as it stands; sharing it would mean lifting it to a module.

**Two gaps the prompt names, confirmed at source.**

- **Entropy has no upfront check.** `engine.js:528-534` dispatches Entropy straight to
  `aggregatePerGroup` when `rg` is present, with no `noGroupMeetsMin` in front. So on tiny
  groups the engine errors Entropy too — both paths agree here, and there is nothing to
  share.
- **Mahalanobis's upfront check covers columns only.** It catches a column shortage before
  the split. It does not catch the rows-against-columns shortage (`nR < 3 * nC`), which is a
  per-group fact discovered inside `testMahalanobisOutlier` (`mahalanobis.js:31`). So the
  engine errors Mahalanobis on a row-short grouping regardless — the upfront check does not
  reach that case.

## The confirm path's dispatch at source

`src/analysis/confirmGrouping.js`, `runConfirmedGroupedTests`. It builds `matrix` and
`condCtx` from `extractAnalysisInputs`, preps the VST, seeds the PRNG, then dispatches the
four tests. Order within each test:

- **Mahalanobis** (`confirmGrouping.js:69-88`): `dtSkip` → genomics not-applicable →
  `mahalGroups = mahalCtx.rowGroups()` → `if (mahalGroups)` stratified `aggregatePerGroup`,
  else pooled `testMahalanobisOutlier`. **No column-count check.**
- **Entropy** (`:90-96`): `dtSkip` → `rg = condCtx.rowGroups()` → `if (rg)` aggregate, else
  pooled. Matches the engine (neither has an upfront check).
- **Column Goodness-of-Fit** (`:98-104`): `dtSkip` → `rg` → `if (rg)` aggregate, else pooled.
  **No `noGroupMeetsMin`.**
- **Modality** (`:106-112`): `dtSkip` → `rg` → `if (rg)` aggregate, else pooled.
  **No `noGroupMeetsMin`.**

Where the engine's checks would have to sit to have the same effect:

- Column Goodness-of-Fit and Modality: a `noGroupMeetsMin(rg, min)` guard **inside the
  `if (rg)` branch, before `aggregatePerGroup`**, exactly where the engine has it.
- Mahalanobis: a `matrix[0].length < 3` guard **before the group split**.
- Entropy: nothing — it already matches.

One tell that the mirror drifted: the confirm path's own comments cite the engine at
`engine.js:517-523` (Column Goodness-of-Fit) and `:524-530` (Modality). The real dispatch is
now at `:535-546` and `:548-560`. The mirror was written against an older engine and was not
re-synced when S324 inserted the checks and shifted the lines.

## Whether the two sites take the same inputs

Mostly yes.

- **`rg`.** Both sites compute `condCtx.rowGroups()` and hold it in a local `rg` before
  dispatch. A shared `noGroupMeetsMin(rg, min)` is directly callable at both, same argument,
  no new plumbing.
- **`matrix`.** Both sites have the analysis matrix from `extractAnalysisInputs`. The
  Mahalanobis column check reads `matrix[0].length` and is callable at both.
- **The min constants.** The engine imports `GOF_MIN_OBS`, `MODALITY_MIN_N`, `MAHAL_MIN_COLS`
  from the test modules. The confirm path imports the test functions but not the constants.
  It would need to add those imports. Trivial, but it is the one input the confirm site does
  not currently hold.
- **One input the confirm site does not need.** The Row-Mean Runs check reads
  `condCtx.rowConditions`, but Row-Mean Runs is not one of the four tests the confirm path
  runs. So of the four engine checks, only three have a second caller; the Row-Mean Runs
  check would stay single-caller even inside a shared module.

## The pooling fall-through

Both dispatch sites end each of the four tests with the same shape:

```js
const rg = condCtx?.rowGroups();
if (rg) return aggregatePerGroup(...);   // grouped
return test(matrix, ...);                // pooled — reached when rg is null
```

`rowGroups()` returns null when the partition is not usable: fewer than two groups, or any
group below three rows. So a singleton-heavy grouping (C14, C16) makes `rg` null and routes
all four tests to the pooled call.

**Reachability differs between the two paths, and this is the load-bearing point.**

- **Engine.** The four tests hit `if (groupingPending) return pendingResult(...)` before the
  `rg` dispatch. The trigger's Arm 2 fires whenever the partition is not usable — and "not
  usable" is the exact condition under which `rowGroups()` returns null. So on any
  row-grouped file where `rg` would be null, the engine has already returned pending. The
  engine reaches its own pooling fall-through only when `rg` is null for a non-trigger
  reason: column-grouped data, or no conditions at all. There, pooling is the correct
  single-distribution path.
- **Confirm.** It drops the pending guard — that is the stated point of confirm. So it
  reaches the `rg` dispatch, finds `rg` null, and pools. It pools a grouping the engine would
  have held.

So the pooling of a row-grouped file is reachable **only from the confirm path**. From the
engine it is reachable only on data that is genuinely not row-grouped, where it is right.

## Feasibility verdict on the shared helper

**It covers some. Here is the remainder.**

- **Covered cleanly — divergence one.** The errored-versus-not-applicable split on Column
  Goodness-of-Fit and Modality is a single predicate, `noGroupMeetsMin(rg, min)`, differing
  only in a constant. Both sites hold `rg`. Lifting `noGroupMeetsMin` to a module and calling
  it from both dispatch sites removes the divergence and removes the second copy that caused
  it. Mahalanobis's column check can ride the same module for parity, though the ecology
  cluster never exercises it — every file there has at least three columns, so both paths
  already error Mahalanobis on the row shortage. Entropy needs nothing. So the shared module
  meaningfully covers two of the four tests, with a third along for parity and a fourth
  (Row-Mean Runs) that gains a home but no second caller.

- **Not covered — divergence two.** The pooling of a singleton grouping is untouched by any
  applicability check, and here is why precisely: `noGroupMeetsMin` lives inside the
  `if (rg)` branch. When `rg` is null, that branch is skipped and the code falls through to
  the pooled call before any check runs. Even if the confirm path adopted the engine's Column
  Goodness-of-Fit and Modality dispatch verbatim, it would still pool on C14 and C16, because
  the engine's own dispatch pools when `rg` is null. The engine avoids pooling there only via
  the pending guard the confirm path deliberately drops. So closing divergence two is not a
  matter of sharing a check. It is a confirm-specific decision: when a confirmed grouping
  yields no usable partition, the confirm path must do something other than pool — return
  not-applicable, or route back to pending — and that decision has no counterpart in the
  engine to share.

**On the shared helper versus copying the guards in.** For divergence one, either fixes the
symptom. The shared module is the better structure, because two copies of one rule is what
produced this defect and a copy leaves the same trap for the next check that shifts. For
divergence two, the choice is moot: neither a shared module nor a copy addresses it, so it
must be scoped on its own regardless of how the checks are organised.

## The byte-identical header claim

`confirmGrouping.js:11-21`, verbatim:

> "KEEP IN SYNC with engine.js. This mirrors the engine's four-test dispatch: … It reuses the
> SAME test functions, aggregatePerGroup, and extractAnalysisInputs the engine uses, so a
> confirmed result is byte-identical to what the engine would have produced for that grouping
> had the trigger not fired. The only thing it drops is the groupingPending guard (that is the
> point of confirm)."

The claim is false as written, in two ways.

- "The only thing it drops is the groupingPending guard." It also drops the S324 upfront
  checks — `noGroupMeetsMin` for Column Goodness-of-Fit and Modality, and the column check
  for Mahalanobis. Those are not the pending guard.
- "Byte-identical to what the engine would have produced… had the trigger not fired." Run the
  engine on C07 with the trigger absent and Column Goodness-of-Fit and Modality return a
  clean not-applicable; the confirm path errors them. The outputs differ, so they are not
  byte-identical.

For the claim to become true, the confirm path would need the three missing upfront checks
(the two `noGroupMeetsMin` calls and the Mahalanobis column check), and its "had the trigger
not fired" clause would need the pooling caveat spelled out — because when the trigger would
have fired on a null partition, "what the engine would have produced" is a pending result,
not a pooled one, and the confirm path produces neither the pending nor a not-applicable but
a pooled verdict. Adding the three checks fixes the first way the claim is false. The pooling
caveat is the second, and it is the same divergence-two gap: it is not reconcilable by making
the dispatch match, because the engine's matching dispatch never runs on that input.

---

`./scripts/dev.sh cmd-s325-confirm-guards`
