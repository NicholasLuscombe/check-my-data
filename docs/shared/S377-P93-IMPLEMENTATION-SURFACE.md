# S377 — P93 implementation surface

**Status:** read-only census, S377 part 2. Owner: Code. Nothing under `src/` was edited, no worktree
was created, nothing was committed. Read at main `3026f72`, working tree clean, `src/` unchanged since
`08f9ee3` (S374).

**Scope.** `P93-DISPOSITION.md` decided the interface and not the implementation. This document reports
what is in the code today and what would have to move if a measurement axis were ever distinguished
from a signal column. **It designs nothing.** Where a fact bears on a decision, the decision is named
and left to Chat.

**Every line number here was read in this session.** Where the disposition or an earlier document cited
a line that has moved, the move is reported.

---

## 0. Expectations, written before the first read

Recorded to scratchpad as the first action of part 2, before `engine.js` was opened.

| # | Expectation | Outcome |
|---|---|---|
| 1 | `dataCols` has more than three readers | **Broken, and the inversion is the finding** — §5.1 |
| 2 | At least one test's correction family is sized from column count | **Held, and far wider than one** — §5.2 |
| 3 | The empty-group case has no dedicated path and falls through to a generic skip | **Split — held on "no dedicated path", broken on "generic skip"** — §5.3 |
| 4 | No per-column statistic is computed before the battery runs | **Broken** — §5.4 |

Two broke outright and one split. Only expectation 2 held as written, and it held far more strongly
than stated. The inversions matter more than the confirmations: §5.1 reverses what the propagation
risk is, and §5.3 finds three failure modes where one was predicted — the worst of them a throw
carrying a message about rows.

---

## 1. Part 2a — where the column set is decided

### 1.1 The construction

`src/analysis/engine.js:113`, inside `extractAnalysisInputs`, unchanged from the disposition's reading:

```js
const dataCols = roles.map((r,i)=>r==="data"?i:-1).filter(i=>i>=0);
```

`:109` is the second line of the leading comment block (`// Builds the numeric matrix, raw-string
matrix, column groups,`), which is what `S375-P93-STRUCTURAL-CENSUS.md:32` records. The disposition's
`:113` is correct and was re-confirmed here.

### 1.2 Every reader of the binding — there are three, and that is the finding

`dataCols` is **function-local**. It is never returned, never exported, never stamped onto `condCtx`.
The return at `engine.js:189` is `{ matrix, rawMatrix, filteredIndices, condCtx }` and carries no
original-column identity at all.

| Site | Read |
|---|---|
| `engine.js:119` | numeric `matrix` projection — `dataCols.map(ci => …)` per row |
| `engine.js:130` | `rawMatrix` projection, same shape |
| `engine.js:159` | passed to `buildGroups(matrix, dataCols, condPerCol)` |
| `aggregation.js:13` | the callee's own read of the parameter |

Three reads in scope, four counting the callee. **Expectation 1 predicted more than three and it is
wrong**, but the number is not the point — see §1.4.

**After line 130 the original column identity is gone from the analysis path.** `buildGroups`
(`aggregation.js:10-25`) consumes `dataCols` precisely to convert away from it:

```js
dataCols.forEach((origColIdx, matrixColIdx)=>{
  const cond=condPerCol[origColIdx]||"Ungrouped";
  …groups[cond].matrixColIndices.push(matrixColIdx);
});
```

It reads `condPerCol` at the original index and stores the **matrix** index. So every group, every
sub-matrix and every test downstream works in matrix-column space `0 … nDataCols−1`. No test module
anywhere can name an original column. The disposition's "sole entry to the entire battery" holds, and
the mechanism is stronger than the phrase suggests: it is not merely that nothing else builds a matrix,
it is that nothing downstream retains the coordinate that would let it.

### 1.3 Callers of `extractAnalysisInputs`

Five in shipped code — `App.jsx:39`, `BatchView.jsx:168`, `ImportView.jsx:525`, `confirmGrouping.js:72`,
and the definition itself. The remainder (about 100 sites) are `test/` and `scripts/`. `ImportView.jsx:525`
is a partial consumer: it builds a throwaway config purely to get `matrix` for `detectVST`, and
discards everything else.

### 1.4 Independent re-derivation — 21 sites outside the engine, in 13 files

This is 2a's third question and the answer is emphatically yes.

```
[a-z]*roles(…)\.(map|filter|reduce)\(… === "data"
```

returns **22 sites across 14 files**; one is `engine.js:113` itself, leaving **21 independent
re-derivations**.

| File | Sites |
|---|--:|
| `components/views/ReportView.jsx` | 5 |
| `components/cards/MiniCard_DuplicateDetection.jsx` | 5 |
| `components/cards/` — SequentialDuplication, SelectiveNoise, Runs, RegionalNoise, MissingDataPattern, InterReplicateCorrelation, Entropy, ColumnGoF, CarlisleBalance | 1 each |
| `export/excelExport.js` | 1 |
| `import/summary.js` | 1 |

They exist because §1.2 threw the coordinate away: a card holding a matrix-space column index and
needing a file-space one must rebuild the map. Two of the five in `MiniCard_DuplicateDetection.jsx`
are not index maps at all but **counts** — `:234` and `:243` render `roles.filter(r=>r==="data").length`
as the denominator of "N of M columns".

**They all re-derive from the same `roles` array, so today they agree with `dataCols` by construction.**
That is the load-bearing fact for the wiring question, and it cuts both ways:

- A hold-out expressed **as a change to `roles`** propagates to all 22 sites with no further work.
  Every display surface, the Excel export and the import summary follow automatically.
- A hold-out expressed **as a filter on `dataCols` alone** at `engine.js:113` desynchronises 21 sites
  silently. The engine would analyse *n−k* columns while every card, the export and the summary still
  counted *n*. Nothing would report the divergence — this is exactly the shape CLAUDE.md records for
  the S325 confirm-path guard divergence, where the batch stayed green while two surfaces disagreed
  about the same data.

**This is not a recommendation of the role route.** §8 of the disposition explicitly leaves open what
role a held-out column takes, and notes `attribute` "may not fit". The finding is only that the two
routes have very different blast radii, and that the wider one is invisible to every existing gate.

### 1.5 `confirmGrouping.js:72` cannot alter the column set

Confirmed at source. `confirmGrouping.js:71`:

```js
const confirmedRoles = roles.map((r, i) => (r === 'condition' && !set.has(i)) ? 'label' : r);
```

The map is total on `condition` and identity on everything else, so a `data` role is unreachable from
this path in either direction. The comment two lines above says so itself — *"Data columns are
untouched, so the matrix is byte-identical to the engine's."* The disposition's claim that this path
"only ever demot[es] condition to label" is exact.

**Consequence for a hold-out.** The confirm path re-enters `extractAnalysisInputs` with its own roles
array. Any hold-out state that lives outside `roles` would have to be threaded through this call
explicitly or it would be dropped on the confirm path — which recomputes four tests (Mahalanobis,
Entropy, Column GoF, Modality) and would then disagree with the main run. Not a defect today, because
no such state exists.

---

## 2. Part 2b — what reads column count

**23 of the 29 test modules read the column count.** Counting occurrences of `matrix[0].length`,
`nCols`, `nC`, `cols.length` or `colCount` per module in `src/tests/`: Excess Kurtosis 26, Mahalanobis
24, Regional Noise 19, Missing Data 18, Duplicate Detection 15, Selective Noise 13, Residual Spike 9,
IRC 8, and so on down to Mean-Variance and Within-Row Variance at 2 each.

The count alone says nothing. What matters is **what the number decides**, and it decides four
different things.

### 2.1 Minimum-column preconditions — the test runs or it does not

Every one emits `NA_CAUSE.TOO_FEW_COLUMNS` with `naObserved` and `naMinimum`, so the shortfall is
already a first-class, displayable decline reason. Nine share the wording constant
`TOO_FEW_REPLICATE_COLS_CAUSE` + `COLS_TAIL` through `joinDeclineReason`.

| Minimum | Tests | Site |
|--:|---|---|
| `nC < 2` | Autocorrelation, Constant-Offset, Excess Kurtosis, LOESS, Missing Data Pattern, Row-Mean Runs, Runs, Windowed Autocorrelation | `:29`, `:32`, `:85`, `:37`, `:32`, `:29`, `:21`, `:79` |
| `nC < 3` | Mean-Variance Noise Scaling, Regional Noise, Selective Noise, Within-Row Variance | `:19`, `:36`, `:240`, `:38` |
| `nC < 3` | Mahalanobis Row Outlier (`MIN_COLS = 3`), Blocked Mahalanobis (`MIN_NC = 3`) | `mahalanobis.js:12`, `blockedMahalanobis.js:43` |
| `nC < 5` | Baseline Balance | `carlisleBalance.js:54` |

IRC's is a per-group `continue` rather than a whole-test decline (`interReplicateCorrelation.js:76`,
`nCols<2||nRows<6`), so a group below the minimum vanishes from the run without its own N/A.

### 2.2 Family sizes — the correction denominator is a function of column count

**Six tests build a C(nC, 2) pair family and BH-correct over it.** All confirmed at source:

| Test | Pair loop | BH over it |
|---|---|---|
| Autocorrelation | `:39` | `:56` |
| Runs Test | `:30`, `:111` | `:75`, `:259` |
| Excess Kurtosis | `:109`, `:183`, `:411` | `:132` |
| Constant-Offset | `:38`, `:55` | `:244` |
| Inter-Replicate Correlation | `:87` | `:143` |
| Windowed Autocorrelation | `:96` | `:193` |

LOESS (`:370`) and Residual Spike Correlation (`:96`, `:159`, `:200`) iterate the same pair set;
LOESS BH-corrects at `:446` and caps at `MAX_LOESS_PAIRS = 30`. Kurtosis caps its simulation pairs at
`MAX_SIM_PAIRS = 30`.

**Five tests build a per-column family of size nC** — Column GoF `:224`, Entropy/Zipf `:128`, Modality
`:243`, Selective Noise `:140`, Decimal Precision `:101`, plus Regional Noise's per-column arm `:177`
and Value-Frequency Spike `:474`. Column GoF's comment is explicit that skipped columns leave the
denominator: *"BH-FDR across applicable columns only (skipped columns excluded from denominator)."*

### 2.3 Column count as a distributional parameter

- **Mahalanobis** compares `D²` against **`χ²(nC)`** (`mahalanobis.js:16`, `:116`). The reference
  distribution *is* the column count. Its row minimum is also `nR < 3 * nC` (`:36`, `:50`), so removing
  columns **loosens** the row requirement.
- **Blocked Mahalanobis** sets its window width `W = Math.max(30, 3 * p)` (`:470`) from the column
  count, and `blockedMahalanobis.js:379` documents the row precondition as depending on it.
- **Windowed Autocorrelation** sizes its permutation budget `(nC * (nC - 1) / 2) * N_PERM` (`:94`).

### 2.4 What changes when a four-column sheet loses two

This is the question the dispatch says decides display-vs-methodology. **It is decisively
methodology, and it moves in two opposite directions at once.**

**Six tests stop running.** Every `nC < 3` gate in §2.1 crosses between 4 and 2, so Mean-Variance Noise
Scaling, Regional Noise Homogeneity, Selective Noise Partitioning, Within-Row Variance, Mahalanobis Row
Outlier and Blocked Mahalanobis all return `flag: "N/A"` with `NA_CAUSE.TOO_FEW_COLUMNS`. Baseline
Balance was already N/A at four (it needs five). **Six of the battery's detectors go silent**, and
`computeSeverity` counts only `r.flag`, so their disappearance costs whatever they were contributing.

**Every surviving pair-family test loses its multiplicity correction entirely.** C(4,2) = 6 pairs
becomes C(2,2) = 1. A BH family of one returns the raw p unchanged — rank-1 BH is `p · m/j = p · 1/1`.
So Autocorrelation, Runs, Excess Kurtosis, Constant-Offset, IRC and Windowed Autocorrelation each go
from a six-member correction to none. **Their adjusted p-values fall**, which moves them *toward*
flagging.

**Per-column families halve**, 4 → 2, so Column GoF, Entropy/Zipf, Modality, Decimal Precision,
Selective Noise's column arm and VFS all correct half as hard.

**One Duplicate Detection family member dies silently.** `PARTIAL_ROW_MIN_COLS = 4`
(`duplicateDetection.js:731`) gates Test 5 at `wrR >= 2 && wrC >= PARTIAL_ROW_MIN_COLS` (`:738`). At
two columns that gate is false, `partialRowP` keeps its initialiser `1` from `:734`, and it still
enters the five-member family at `:807`. The test does not shrink to four members — it carries a fifth
that is a literal. CLAUDE.md already records this shape for DupDet: *"a family member that never ran is
indistinguishable from one that ran and found nothing."* A hold-out reaching four columns would make it
reachable on ordinary data rather than only at the edge.

**The two directions do not cancel and nothing reports either.** Six detectors go quiet while the
survivors get less conservative. The flag matrix would show both as ordinary cell changes with no
indication that the column set moved.

### 2.5 The display side is layout only

`MiniCard_DuplicateDetection.jsx:235` switches to a stacked layout above 8 data columns;
`FindingDetailPanel.jsx:294-310` and `ExcerptTable.jsx:822` derive widths and frozen-column counts;
`ColumnHeaders` and `ScrollTable` size the colgroup. None of these changes a claim. The one exception
is a **denominator in rendered prose**: `MiniCard_DuplicateDetection.jsx:243` renders
`` `${blk.cols.length} of ${roles.filter(r=>r==="data").length} columns` ``, so "3 of 4 columns" would
become "3 of 2 columns" if the engine's set were narrowed without `roles` following — the §1.4
divergence, surfacing as an impossible sentence.

---

## 3. Part 2c — the empty-group case

The disposition's §5 says that at any threshold in the plateau the rule takes **both** columns of all
six `Fig. 4b` groups, so six groups lose every column they have. What the engine does today depends on
how far the emptying goes, and there are **three distinct outcomes, none of which announces itself**.

### 3.1 An emptied group is never empty — it is absent

`buildGroups` (`aggregation.js:10-25`) builds the group map by iterating `dataCols`:

```js
dataCols.forEach((origColIdx, matrixColIdx)=>{
  const cond=condPerCol[origColIdx]||"Ungrouped";
  if(!groups[cond]) groups[cond]={name:cond, matrixColIndices:[]};
  …
});
```

A group key is **created only when some column maps to it**. A group whose every column left `dataCols`
therefore never enters the map at all. There is no empty group to detect — the name simply does not
appear. Nothing counts groups before and after.

A group reduced to **one** column does get created, and is then removed by the trailing filter at
`aggregation.js:24`:

```js
.filter(g=>g.matrix.length>=4&&g.matrix[0].length>=2);
```

Both routes end the same way: the group is gone from `groups` with **no result object, no `flag`, no
`naCause`, and no record that it ever existed.**

### 3.2 Below two surviving groups, the file silently changes type

`conditionContext.js:52`:

```js
const hasGroups = groups && groups.length >= 2;
```

If the survivors fall below two, `hasGroups` is false and the type resolution at `:59-72` falls to
`row-grouped` if row conditions exist, otherwise to **`none`**. `names` becomes `[]` and `count`
becomes 0. `useAggregate` (`engine.js:217`) is `condCtx.type === 'column-grouped' && condCtx.count >= 2`, so the
per-group dispatch collapses to pooled for all twelve tests that route through it, and Fisher's
combination never runs. **The file is analysed as an ungrouped sheet and the report says nothing about
the change.**

### 3.3 The `Fig. 4b` case as described is a throw, not a fall-through

`Fig. 4b` is six groups of two columns — twelve columns, and §5 has the rule taking all twelve. Then
`dataCols` is empty, and the projection at `engine.js:118-127` produces an empty row per data row;
`row.some(v=>v!==null)` on an empty array is `false`, so **every row is filtered out and `matrix` is
`[]`**. Confirmed by executing the projection in isolation.

`runFullAnalysis` calls `validateMatrix` first (`engine.js:198`), which returns
`{ valid: false, warnings: ["Matrix has no rows."] }` at `engine.js:23-25`, and `:199-201` throws
`Invalid input matrix: Matrix has no rows.`

Note the message names **rows**, because the row filter empties before the column check at `:26-28`
is reached. A user who held out every column would be told the file has no rows.

**This is conditional on the hold-out being implemented as removal from `dataCols`** — §1.4's two
routes both produce it, since both end at that projection. A hold-out implemented some other way would
take a different path, and no such path exists to read.

### 3.4 There is a dedicated path, and it sits one step past where this route fails

`aggregatePerGroup` **does** have a purpose-built empty-coverage path (`aggregation.js:68-106`). When
every surviving group returns N/A it composes a result with `erroredCoverage: true`, rolls the
per-group `naCause` codes up (single code when they agree, `naCauses` set when they disagree), and
`coverage.js:83` classifies it as `errored` rather than not-applicable. The block's comment is careful
about exactly this distinction: *"This is an errored coverage state, not a not-applicable one."*

**That path cannot fire for a dropped group**, because a group removed at `buildGroups`' filter never
reaches `aggregatePerGroup` to return the N/A that would trigger it. The machinery for announcing
"no group could be assessed" exists and is well made; the emptied-group route arrives upstream of it.

`groupsAssessed` (`aggregation.js:378`) is `applicable.length` — a count of groups that produced a
verdict. Fifteen cards read it, and **every one reads it as `!== undefined`**, i.e. purely as a
boolean discriminator for the aggregated layout. No surface renders it as a numerator against an
expected group count, so a group that vanished before the layer cannot show up as a shortfall.

### 3.5 The METHODOLOGY rule, quoted at source

`docs/shared/METHODOLOGY.md:473`, clause 2 of the grouping contract:

> **Grouping that produces no usable structure must say so.** When the grouping key is unique or
> near-unique per row — every group a singleton, or the group count approaching the row count —
> `rowGroups()` returns null and the row-grouped tests fall through to their ungrouped path or return
> N/A. **The output must announce that grouping produced nothing.** A silent fall-through renders as a
> clean verdict on a file the grouped tests never assessed. […] This holds unconditionally,
> independent of everything below.

**Does this route reach it?** Reporting the facts and leaving the ruling to Chat:

- The clause's **stated mechanism is the row-grouped path** — it names `rowGroups()`, singleton
  grouping keys and row-grouped tests. The emptied-group route is column-grouped and reaches none of
  those.
- Its **final sentence is unconditional** and is about the failure mode rather than the mechanism —
  "a clean verdict on a file the grouped tests never assessed" describes §3.2 exactly.
- The **live enforcement is not this clause**. `METHODOLOGY.md:525` records that Point 2's
  announce-empty banner was **retired at S320**, superseded by Point 3's grouping-confirm trigger,
  "since every file the banner fired on is caught by the trigger's Arm 2". That trigger's arms are
  ≥3 condition columns (Arm 1) and `rowGroups()` null or median group size ≤4 (Arm 2) — **both on the
  row-grouped side.** A column-group emptied by hold-out trips neither.

So the principle is stated unconditionally and the only shipped enforcement of it is on a path this
route does not touch. Whether the clause extends here is the disposition's call, not this document's.

---

## 4. Part 2d — where a suggestion could live

**The seam exists, it is fully built, and something already travels it.** `src/import/roles.js`
implements the group-attribute rule, which is the same shape as the disposition's §6 procedure —
compute a per-column derived property before the battery, hold columns out on it, carry provenance,
fall back to current behaviour when nothing qualifies.

### 4.1 The module that owns the stage

`detectGroupAttributes(data, roles)` (`roles.js:87`), reached from `inferRoles` at `roles.js:25` via
the thin wrapper `applyGroupAttributes` (`:83`). It runs at import scan, before anything analytical.
Its own header comment (`:72-82`) states the mechanism:

> Detected attributes are re-roled 'attribute'. They then fall out of the analysis matrix at the
> engine's single dataCols line (role === "data"), which removes them from the whole battery at once.
> The exclusion is blunt on purpose […] detectGroupAttributes returns both the re-roled array and the
> provenance — one entry per grouping column that produced an exclusion […] The provenance is what
> makes a corpus run auditable.

`:69-71` states the fallback in the disposition's own terms: *"Clause 2 is self-validating […] When no
column qualifies, nothing is re-roled and the tool behaves exactly as before."* That is §6 point 6.

**`attribute` is not a proposal.** It is a first-class role — `ROLE_KEYS = ["data", "label",
"condition", "attribute", "ignore"]` (`constants/roles.js:15`) with its own chip label `Attr` and teal
token at `:12`. Disposition §8 lists it as "the nearest existing vocabulary and may not fit"; the fact
to weigh against that is that it already ships and already holds columns out of this exact matrix.

**The affirmative click also already exists.** `ImportView.jsx:886` cycles a column's role on header
click through `ROLE_KEYS`, so a user can already move any column to `attribute` or `ignore` by hand.
What does not exist is a *suggestion* — nothing proposes a column, and nothing states a reason.

### 4.2 Per-column statistics before the battery — expectation 4 is broken, narrowly

Two stages compute per-column arrays before `runFullAnalysis`:

1. **`roles.js:90-116`** transposes the whole sheet — `num[c][r]` numeric and `key[c][r]` string, per
   column — then derives `distinct[c]`, a per-column cardinality, and per-level constancy across
   candidate grouping columns. This is a genuine per-column derived property already driving a
   role decision.
2. **`summary.js:17-26`** computes `colMaxLen[ci]`, one entry per column **across all roles**, indexed
   by full column index, in a single pass. Its comment records that it was added by extending a scan
   the summary loop already performed.

**But nothing statistical is per-column.** Everything else `summarize` returns — `total`, `miss`,
`zeros`, `ints`, `prec`, `mn`, `mx`, `span` — is **pooled across every data cell of every column**
(`summary.js:27-34` iterates `for(const row of data) for(const ci of dI)` into shared accumulators).
So there is no per-column mean, spread or distribution anywhere before the battery, and the corpus-wide
`span` P93's Benford discussion cites is a pooled figure by construction.

Expectation 4 said no per-column statistic is computed pre-battery. **Broken** — two per-column arrays
exist. The useful correction is that both are structural (cardinality, string width) rather than
distributional, so a first-difference statistic would be the first of its kind at that stage, but not
the first per-column array.

### 4.3 The interface model can carry the field, with precedent

- `summarize` output is memoised in `ImportView.jsx:380` as `sum` and threaded into the view. It
  **already carries a per-column array indexed by full column index** (`colMaxLen`), consumed by the
  preview table and by the forensics `ExcerptTable` for content-aware widths. A second per-column
  array in the same return object would follow an established path.
- `importConfig` is spread through unchanged — `App.jsx:39` calls
  `extractAnalysisInputs({...config, colRelationship, dataColHeaders})` — so additive config fields
  survive to the engine without signature changes.
- `BatchView.jsx:156` calls `summarize` on the same signature, so a batch run would see the same field.

### 4.4 Two frictions in the seam, reported not resolved

**The provenance channel is built and discarded.** `detectGroupAttributes` returns
`{ roles, groupings }`, and `groupings` — `[{ groupCol, nLevels, attrCols }]`, the thing its comment
calls "what makes a corpus run auditable" — has **zero consumers in `src/`**. The only caller is
`applyGroupAttributes`, which returns `.roles` and drops it. Disposition §6 point 4 requires the report
to state which columns were held out and why; the existing hold-out already fails that, and the channel
to fix it is already returned.

**The stage and the matrix disagree, and §7 names the matrix.** §7 says the statistic computes
post-trim, "since that is what the battery sees". The role stage runs on `data` as passed to
`inferRoles` (`ImportView.jsx:189`) — header-stripped and all-empty-rows dropped, but **before**
`extractAnalysisInputs` drops rows with no non-null *data* cell (`filteredIndices`), applies
`zeroAsMissing`, and coerces to numbers. First-difference variation depends on the row set and its
order, so the two stages would not compute the same number. Whether the property therefore belongs at
the role stage, at the summary stage, or at a third place is a design question this document does not
answer — but the two candidate homes see different matrices, and that is a constraint on the choice
rather than a detail.

---

## 5. Part 2e — the four expectations

### 5.1 `dataCols` has more than three readers — **BROKEN**

Three reads in scope (`engine.js:119`, `:130`, `:159`), four counting `buildGroups`' read of the
parameter. The binding is function-local and never escapes.

**The inversion is the finding, and it reverses what the risk is.** The narrow binding does not mean
the column set is narrowly held — it means the opposite. Because `extractAnalysisInputs` discards the
original column coordinate at `:130`, **21 sites in 13 files rebuild the set independently from
`roles`** (§1.4). So the hazard in a hold-out is not "find every reader of `dataCols` and update it";
there are three and they are adjacent. It is "21 derivations agree today only because they read one
array, and a change that does not go through that array desynchronises all of them silently."

### 5.2 At least one test's correction family is sized from column count — **HELD, and far wider than one**

Not one test — **six** build a C(nC, 2) pair family and BH-correct over it (Autocorrelation, Runs,
Excess Kurtosis, Constant-Offset, IRC, Windowed Autocorrelation), **seven more** build a per-column
family of size nC (Column GoF, Entropy/Zipf, Modality, Decimal Precision, Selective Noise, Regional
Noise's column arm, VFS), and two use the count as a distributional parameter rather than a family
size — Mahalanobis compares against `χ²(nC)`, Blocked Mahalanobis sets `W = max(30, 3·p)`.

So the expectation's consequent holds emphatically: **removing columns changes p-values, not only
displays.** §2.4 gives the four-to-two case — six tests fall to N/A on their `nC < 3` gates, six
surviving pair-family tests lose their multiplicity correction entirely (a BH family of one returns
the raw p), per-column families halve, and Duplicate Detection carries a fifth family member frozen at
the literal `1` because `PARTIAL_ROW_MIN_COLS = 4` can no longer be met.

**A hold-out is a methodology change.** That is settled, and it is settled in both directions at once —
some detectors go silent while the survivors become less conservative.

### 5.3 The empty-group case has no dedicated path and falls through to a generic skip — **HELD on the first clause, BROKEN on the second**

No dedicated path: correct. "Falls through to a generic skip": wrong in three separate ways, and each
is worse than a skip.

1. **The group is absent, not skipped.** `buildGroups` creates a key only when a column maps to it, so
   an emptied group never exists; a one-column group is removed by the filter at `aggregation.js:24`.
   Either way there is no result, no `flag`, no `naCause` and nothing rendered.
2. **Below two survivors the file changes type.** `hasGroups = groups && groups.length >= 2`
   (`conditionContext.js:52`) sends it to `row-grouped` or `none`, and the whole per-group dispatch
   collapses to pooled.
3. **The case the disposition actually describes throws.** All twelve `Fig. 4b` columns held out gives
   an empty `dataCols`, every row filtered away, and `validateMatrix` failing with **"Matrix has no
   rows."** — a message about rows, for a file whose rows are intact.

**And the machinery exists one step downstream.** `aggregatePerGroup`'s `erroredCoverage` path
(`aggregation.js:68-106`) is purpose-built for "no group could be assessed", rolls up per-group
`naCause` codes, and is classified as `errored` at `coverage.js:83`. It cannot fire here, because a
group removed at `buildGroups` never reaches the layer that would return the N/A that triggers it.

### 5.4 No per-column statistic is computed before the battery — **BROKEN, narrowly**

Two per-column arrays already exist pre-battery: `distinct[c]` and the full `num`/`key` transposition
in `roles.js:90-116`, and `colMaxLen[ci]` in `summary.js:17-26`. Both feed live behaviour — the first
drives the `attribute` re-role, the second drives content-aware column widths on two surfaces.

**The correction that matters is what kind.** Both are *structural* — a cardinality and a string
width. Nothing distributional is computed per column anywhere before the battery; `summarize`'s
statistical fields are all pooled across every data cell of every column (`summary.js:27-34`). A
first-difference variation would be the first per-column *statistic*, but it would not be the first
per-column array, and it would not be the first per-column property to hold a column out of the
matrix.

---

## 6. What this document does not do

It does not choose a route, a role, a threshold, a stage or a null-handling rule. Four decisions are
named and left open: which of §1.4's two propagation routes a hold-out takes; whether METHODOLOGY:473
extends to the column-grouped route (§3.5); which matrix the property computes on, given that the two
candidate stages see different ones (§4.4); and whether the `attribute` role fits, now that it is
established as shipped rather than proposed (§4.1).

**Line numbers cited by earlier documents, re-checked here.** `engine.js:113` is correct and unmoved.
`METHODOLOGY.md:473` and `:525` are as cited. CLAUDE.md's Duplicate Detection notes check out —
`rawPs` at `:807`, `bhFDR` at `:808`, `partialRowP`'s initialiser at `:734` and its only write at
`:785`, with the gate that guards it at `:738`. No stale line number was found in the material this
dispatch touched.

---

## Register rows moved from STATUS, S392

STATUS is gitignored and has no git history, so a register row is the only copy of
whatever it holds. These bodies are moved here verbatim; the register row keeps its
claim and points at this section.

### P172 — **the `groupings` provenance channel has no consumers in `src/`**

open, **allocated S377**. `detectGroupAttributes` returns `groupings`, recording which columns were held out and why, and its own comment calls that what makes a corpus run auditable. **Nothing in `src/` reads it.** The shipped hold-out therefore already fails P93 disposition §6 point 4 — a column is dropped, the reason is recorded, and nothing surfaces it. **Any P93 interface work inherits this rather than introducing it.** Found in the S377 implementation-surface read, `docs/shared/S377-P93-IMPLEMENTATION-SURFACE.md`
