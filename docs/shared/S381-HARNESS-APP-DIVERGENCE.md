# S381 — harness-versus-app divergence

No `src/` change, no batch, no full analysis run.
Worktree `harness-app-divergence-4371ed`, branch `claude/harness-app-divergence-4371ed`.

This is the one address for S381. `docs/sessions/` is gitignored at `.gitignore:45` and has never
carried a commit — ruled at S352, recorded at `BANKED.md:741`. Part 1 briefly left a second copy
there; it was byte-identical and has been removed.

- **Part 1 — the census.** 33 decision points, app against harness.
- **Part 2a — the disposition.** Which side is right on each of the 25 divergent rows.
- **Part 2b — the BatchView sweep and incidence.** Which rows are shipped product inconsistencies,
  and which fire on the corpus. Instrument: `test/probes/probe-s381-divergence-incidence.mjs`.

**The one-line result.** On **40 of 41** imported corpus sheets `ImportView.jsx` would have refused
to run until a human answered a gate. The one sheet that clears both gates meets the
grouping-confirm card instead. And `BatchView.jsx` — the app's other shipping import surface — sides
with the harness on 17 of the 25 divergent rows and with ImportView on 2.

---

# Part 1 — the census

## Why this exists

Every corpus number the project holds — all of S379 and S380 — came out of `scripts/corpus-run.mjs`.
A user's file goes through `ImportView.jsx` and `App.jsx`. One divergence was known:
`ImportView.jsx:632` forces `raw` on ordinal data before `detectVST` is consulted, and the harness
has no such branch. Nobody had counted the rest. Until that count exists, every corpus figure may
describe a tool that is not the one we ship.

## Premise check — the premise holds

`scripts/corpus-run.mjs` is the harness behind the S379 run. Its own header says it "reproduces
BatchView's prep-and-run loop in Node" (`:6-8`). It calls the app's *engine* —
`extractAnalysisInputs` at `:258` and `runFullAnalysis` at `:278` — and it reuses the app's import
*primitives*: `preprocessRaw`, `detectBlocks`, `detectHeaderRows`, `forwardFill`, `inferBaseRoles`,
`detectGroupAttributes`, `detectLongFormat`, `suggestRowSemantics`, `summarize`, `parseExcel`,
`detectAssay`, `detectVST`.

But it does **not** call the app's import path. `prepStructure` (`corpus-run.mjs:146-195`) is a
hand-written port of the prep stage; `ImportView.jsx` is the app's. Two separate bodies of code make
the same class of decisions, and they do not make all of them the same way. So Part 1 proceeds.

`ImportView.jsx:632` was re-located and confirmed rather than quoted: `if(dataType==='ordinal'){`.

## The table

One row per decision point about the analysis object, in pipeline order.

Last-column convention: where App and Harness agree, the entry reads `same` if
`test/validate-batch.mjs` agrees too. `third` means the batch runner does a third thing.

| # | Decision | App site | App behaviour | Harness site | Harness behaviour | Verdict | Batch runner |
|---|---|---|---|---|---|---|---|
| 1 | File admitted at all | `ImportView.jsx:292`, `:296`, `:213` | Extension whitelist (csv/tsv/txt/xlsx/xls); 50 MB cap on both the File and the decoded text | `corpus-run.mjs:115-122` | Any path; `.xlsx`/`.xls` go to SheetJS, everything else is read as UTF-8 text; no size cap | absent one side (app-only) | harness |
| 2 | Which sheet | `ImportView.jsx:302-310` | One sheet loads directly; two or more raise a picker and wait for a click | `corpus-run.mjs:118` → `excel.js:51` | `entry.sheet` from the manifest, else sheet 1, silently | differs | N/A (CSV fixtures only) |
| 3 | Excel cells → rows | `ImportView.jsx:270`, `:280-281` | `parseExcel`, then re-serialise every row to CSV text and re-parse it through PapaParse | `corpus-run.mjs:118-119` | `parseExcel` rows used as they come | differs | N/A |
| 4 | CSV parse call | `ImportView.jsx:227` | `Papa.parse(text.trim(), {skipEmptyLines:false})` | `corpus-run.mjs:122` | `Papa.parse(text, {header:false, skipEmptyLines:false})` — no whole-text trim | differs | third (`validate-batch.mjs:157`, `skipEmptyLines:true`, no trim) |
| 5 | Edge-row strip + sparse-column drop | `ImportView.jsx:238` | `preprocessRaw` | `corpus-run.mjs:147` | `preprocessRaw` | same | same |
| 6 | Which block | `ImportView.jsx:241-242` | `detectBlocks`; more than one raises a picker, pre-loaded on block 1, and the reader can switch | `corpus-run.mjs:152-153` | `blocks[0]` when more than one; no switch | differs (same default, app-only override) | third (never calls `detectBlocks`) |
| 7 | Second preamble strip | `ImportView.jsx:203` | The `minCells0` leading-row loop runs **only on the multi-block branch**, inside `loadBlock` | `corpus-run.mjs:156-161` | The same loop runs on **every** file | differs | app (its single-block arm — never strips) |
| 8 | Drop columns empty within the block | `ImportView.jsx:204-207` | Drops all-empty columns, multi-block branch only | absent | — | absent one side (app-only) | harness |
| 9 | How many header rows | `ImportView.jsx:245`, override `:777` | `detectHeaderRows` on the **un-stripped** block; reader can force 0/1/2 | `corpus-run.mjs:163` | `detectHeaderRows` on the **stripped** block; no override | differs (same function, different input; app-only override) | third (`:165` on raw, then `headers = raw[headerRows-1]`, no padding, no `Col N` fill) |
| 10 | Two-row header → `condPerCol` | `ImportView.jsx:161-180` | Finds the repeated sub-header name, takes its positions as group starts, reads each group's label from within its own span (and up to 2 columns left); falls back to `forwardFill` only when fewer than 2 starts | `corpus-run.mjs:176-182` | `forwardFill` only | differs | harness (`:170` `forwardFill`, without the blank→null map) |
| 11 | Header strings | `ImportView.jsx:181` | `"<group> · <name>"` | `corpus-run.mjs:183` | Bare name | differs (feeds `detectAssay`, row 17) | third (`:172`, bare, no `Col N` fill) |
| 12 | Drop blank data rows | `ImportView.jsx:186` | Rows with no filled cell are dropped before roles, summary and grouping see them | absent | Blank rows stay in `data` | absent one side (app-only) | harness |
| 13 | Long-format detection | `ImportView.jsx:251-254` | Runs only on the single-block branch; inputs are raw row 0 and `cleaned.slice(nH)` | `corpus-run.mjs:187` | Runs on every file including multi-block; inputs are the resolved headers and data | differs | harness (`:200`, unconditional) |
| 14 | Long-format pivot | `ImportView.jsx:327-357` | Modal; on confirm `pivotLongToWide` reshapes the table, `colRelationship` becomes `conditions`, `condition` roles are re-stamped `data`, assay is re-detected on the pre-pivot headers | absent | Never reshapes | absent one side (app-only) | harness |
| 15 | Column role inference | `ImportView.jsx:189` | `inferRoles` | `corpus-run.mjs:191-192` | `inferBaseRoles` + `detectGroupAttributes` — `roles.js:25` shows these compose to `inferRoles` | same | same (`:176`) |
| 16 | Role override | `ImportView.jsx:886`, `:854` | Header click cycles the role; Auto / All data / All off | `corpus-run.mjs:193` | `conditionsHint.roles` from the manifest | differs (different actor, comparable power) | third (no override) |
| 17 | Assay | `ImportView.jsx:192`, `:195`; dropdown `:807` | `detectAssay(fileName, composedHeaders)`; high **or** low confidence applies; reader can override | `corpus-run.mjs:237-240` | `entry.assay`, else `detectAssay(basename, bareHeaders)`, else `general` | differs (same rule, different header input — row 11) | third (`:177` takes the declared `expected.assay`; no detection) |
| 18 | Data type | `ImportView.jsx:195`/`:807`; select `:817-819` | `ASSAY_DATATYPE_MAP`; the select is **locked** unless the assay is `general` | `corpus-run.mjs:243` | `entry.dataType`, else `ASSAY_DATATYPE_MAP[assay]`, else `continuous` | differs (same default, different override) | harness (`:192`, no override) |
| 19 | Treat 0 as missing | `ImportView.jsx:53`, `:912`, `:921` | Default false. Genomics/cell-count with zeros gets a **recommendation**; the reader must click | `corpus-run.mjs:247-249` | Auto-enabled whenever the assay is genomics or cell_count **and** zeros exceed 10% of cells | differs — the harness nulls cells the app keeps | app (`:181`, hardcoded false) |
| 20 | Column relationship | `ImportView.jsx:394`, `:406-411`, `:944`/`:955`; gate `:1232`; `App.jsx:40` | Auto-`replicates` when condition structure exists; otherwise **Run is blocked** until the reader picks replicates or non-replicates | `corpus-run.mjs:256` | Hardcoded `'replicates'` | differs — `conditions` is unreachable in the harness | harness (omits it; `conditionContext.js:49` defaults to `replicates`) |
| 21 | Condition names in conditions-mode | `App.jsx:36-38`, `:40` | Builds `dataColHeaders` from roles and headers | absent | Not passed | absent one side (app-only); consumed at `conditionContext.js:84`/`:115`, reachable only through row 20 | harness |
| 22 | Row semantics | `ImportView.jsx:417-430`, `:435`; gate `:1232` | `suggestRowSemantics`; when it returns `null` (general / proteomics / survey on wide-format input) **Run is blocked** until the reader picks | `corpus-run.mjs:251-252` | `rsSuggestion.value \|\| 'ordered'` — resolves silently what the app refuses to resolve | differs | harness (`:201-202`) |
| 23 | Transform detection | `ImportView.jsx:525-526` | `detectVST(matrix, assay)` on the extracted matrix | `corpus-run.mjs:274` | `detectVST(matrix, assay)` | same | same (`:185`) |
| 24 | Ordinal transform bypass | `ImportView.jsx:632-635` | Ordinal data forces `{transform:'raw'}` before any proposal is consulted | absent | `detectVST` runs on ordinal data. Integer Likert reaches `vst.js:139` and returns **anscombe** | absent one side (app-only). Recorded independently at `assays.js:152-157` | harness |
| 25 | Transform override | `ImportView.jsx:641-644`, `:648` → `App.jsx:44` | The card's choice; "Keep raw" declines the proposal; no proposal falls through to a second `detectVST` | `corpus-run.mjs:266-272` | `--vst` / `entry.vst`, validated against `raw\|log\|anscombe` | differs (different actor, comparable power) | harness (no override) |
| 26 | Minimum data-column gate | `ImportView.jsx:1229`, message `:896` | The Run button does not render below 2 data columns | absent | No minimum | absent one side (app-only) | harness |
| 27 | Matrix validation | `engine.js:198` (shared) | `validateMatrix` | `engine.js:198` (shared) | same | same | same |
| 28 | Grouping-enforcement trigger | `engine.js:171` (shared, inside `extractAnalysisInputs`) | `computeTrigger` | same | same | same | same |
| 29 | Grouping confirmation | `ReportView.jsx:188` → `GroupingConfirmCard.jsx:89` → `confirmGrouping.js:66` | The reader ticks a grouping and the four pending tests **re-run** and produce real verdicts | `corpus-run.mjs:348` | Records `groupingPending` and stops. The four tests stay `N/A` | absent one side (app-only) | harness |
| 30 | Subject pairing | `engine.js:187` (shared) | `computeSubjectPairing` | same | same | same | same |
| 31 | Seed / PRNG stream | `engine.js:214` (shared) | `createPRNGFactory(matrix)`, derived from the data hash; neither path sets a seed | same | same | same | third (`validate-batch.mjs:31-38` registers a seed hook under `SEEDS>1`; default 1 is the shipped stream) |
| 32 | Permutation counts / `B` | none | Neither path passes any; every count is a per-test constant | none | same | same (absent both) | N/A |
| 33 | Engine call and options | `App.jsx:53-57` | `runFullAnalysis(matrix, rawMatrix, condCtx, assay, setRunProgress, vst, {isPivoted:!!config.isPivoted}, dataType, rowSemantics, skipHeavy)` | `corpus-run.mjs:278-281` | Same function; `null` progress; `{isPivoted:false}`; no `skipHeavy` | differs (`isPivoted` hardcoded false — downstream of row 14; progress and `skipHeavy` are inert in the production build, `App.jsx:52`) | third (`:205-207`, `{}` for opts) |

**33 decision points. 8 same, 25 divergent** — 17 `differs`, 8 `absent one side`.

> **Corrected at Part 2a.** This line first read "10 same, 23 divergent — 15 `differs`". The column
> was counted by eye and two of the three numbers were wrong. Recounted by parsing the table:
> `same` = rows 5, 15, 23, 27, 28, 30, 31, 32; `differs` = rows 2, 3, 4, 6, 7, 9, 10, 11, 13, 16,
> 17, 18, 19, 20, 22, 25, 33; `absent one side` = rows 1, 8, 12, 14, 21, 24, 26, 29. **No table row
> changed** — only the tally. The commit message on `58a94f7` carries the old numbers.

## Predictions, scored

**1. "More than one divergence." Held, by a wide margin.** 25 of 33 rows diverge. The upper end was
unpredicted; the answer is 25.

**2. "At least one is Class A, likeliest the grouping or column-relationship choice." Held, and the
named candidate is one of them.** Row 20 is exactly the predicted shape — the app has a click there
and the harness cannot click, so the harness hardcodes `replicates` and `conditions` is unreachable
in every corpus figure. Rows 10, 14, 19, 22, 24, 26 and 29 are the other candidates that change what
the engine analyses. Formal classification is Part 2 and is not done here.

**3. "The harness is the more permissive path." Held on balance — and the inversion also exists, on
three rows. Prediction 3 is not clean, and that is the finding.**

The harness-permissive direction is the larger one. Seven guards live in the app and nowhere in the
harness: the extension whitelist and the size cap (row 1), the empty-column drop (row 8), the
blank-row drop (row 12), the two-data-column minimum (row 26), and the two blocking gates on column
relationship and row order (rows 20, 22).

Three rows run the other way. By prediction 3's own reasoning these are the more important result:

- **Row 7.** The harness strips preamble rows on every file. The app strips them only when the file
  split into more than one block. On a single-block file the harness removes rows the app keeps —
  and because the strip runs before `detectHeaderRows` (row 9), it can also change how many header
  rows are found.
- **Row 13.** The harness runs long-format detection on every file, including multi-block files
  where the app never runs it at all. A detection there sets `rowSemantics` to `arbitrary`, which
  takes five tests to `N/A` and suppresses two sub-unit scans. The harness withholds analysis the
  app would run.
- **Row 19.** The harness nulls every zero on genomics and cell-count files above a 10% threshold.
  The app only recommends it. Not a guard, but it is the harness altering the analysis object where
  the app leaves it alone.

So both exposures are real. Users can get analysis the corpus has never exercised — through
`conditions` mode (row 20), a pivot (row 14), a confirmed grouping (row 29), a declined transform
(row 25), and `arbitrary` row order chosen by hand (row 22). And the corpus can carry analysis a
user would never get — a stripped preamble (row 7), an `arbitrary` verdict nobody chose (row 13),
zeros deleted (row 19), an Anscombe transform on Likert data (row 24), and files the app would
refuse outright (rows 1, 26).

## Method

Each path was walked forward from its own entry point to the engine call, and the list was built
from the source. The dispatch's checklist was then applied as a coverage check: parse (rows 3, 4),
sheet selection (2), header detection (9), preamble and sparse-row trimming (5, 7), column role
inference and its overrides (15, 16), the column-relationship choice and grouping confirmation
(20, 29), transform selection (23, 24, 25), condition context and subject pairing (21, 28, 30),
minimum-width and minimum-row gates (26, 27), seed / RNG / `B` (31, 32), and the engine call with
its options (33). Every checklist item is covered.

## Part 1 verification

Every site above was opened and read in this session; no line number is carried over from the
dispatch or from memory. `ImportView.jsx:632` was re-located and confirmed. Nothing was executed —
no batch, no corpus run, no probe. The `same` rows that rest on identical function calls (15, 27,
28, 30) were checked at the definition: `roles.js:25` shows `inferRoles` is exactly `inferBaseRoles`
followed by `applyGroupAttributes`, which is the pair the harness calls at `corpus-run.mjs:191-192`.

---

# Part 2a — the disposition

Part 1 treated the app as the reference and said nothing about which side is right. That files at
least one row backwards. Part 2a fixes the disposition per divergent row: which path is correct,
whether the difference reaches the engine, and whether a predicate can decide per file that the two
branch apart.

Read-only. Nothing executed against the engine.

## Two lookups

**P179's closing sentence holds, and the reason it holds is not the reason it gives.**
P179 (`STATUS.md:767`) says `corpus-run.mjs:137`'s `hdrs.indexOf(header)` takes the first matching
header only, so a declared role lands on one of N repeated axis columns. It closes *"No published
figure is known to depend on it"*, on the ground that CORPUS-03's `Fish.ID` is a unique header.
That ground is not needed. **The S379 run was not hint-driven.**
`test/probes/s379-corpus-manifest.json` holds 49 entries and the only keys any entry uses are
`path`, `sheet` and `label` — zero `conditionsHint`, zero `assay`, zero `dataType`, zero `vst`.
`applyRoleHint` (`corpus-run.mjs:131-133`) returns immediately when the hint is not an object
carrying `.roles`, so the defective line never executed. P179 stays open and stays Chat's.

**Row 29's four tests.** Held at `N/A` with `groupingPending` when the trigger fires, and re-run by
`runConfirmedGroupedTests` on confirm:

| Test | Engine site | Confirm site |
|---|---|---|
| Mahalanobis Row Outlier | `engine.js:499` | `confirmGrouping.js:145` |
| Entropy / Zipf Analysis | `engine.js:590` | `confirmGrouping.js:175` |
| Column Goodness-of-Fit | `engine.js:597` | `confirmGrouping.js:187` |
| Modality Test | `engine.js:610` | `confirmGrouping.js:205` |

## The disposition table

**What `app` means in the Right-side column — it means `ImportView.jsx`, and that is one of two
shipping import surfaces.** `BatchView.jsx` is the other, and `corpus-run.mjs` reproduces
*BatchView's* loop, not ImportView's — the harness's own header says so at `:6-8`. Row 19 is the
confirmed instance: the auto-null threshold traces to `BatchView.jsx:158`, so on that row the
harness is not diverging from the app at all. It is copying one of the app's two answers. Row 20's
hardcoded `replicates` has the same shape. **How many of the other rows are that story is
unmeasured**, and it changes what a row costs: a harness artifact costs nothing, while an app
surface disagreeing with itself is a v1.0 candidate. Four paths exist — `ImportView.jsx`,
`BatchView.jsx`, `test/validate-batch.mjs`, `scripts/corpus-run.mjs`. This document covers the first
and the last, with a lookup column for the third. **BatchView is uncovered.** The BatchView sweep
belongs to 2b; the dispositions below stand as written until it runs.

25 rows, Part 1 numbering, not renumbered. `unavoidable` means the app's behaviour depends on a
click and no harness reproduces it — a real category, and not a defect on either side. `undecided`
means the answer is a design call rather than a source fact; those are marked and left for Nick.
`Changes: object` means the engine receives a different matrix, condition context, transform or row
semantics.

| # | Right side | Why | Changes | Countable |
|---|---|---|---|---|
| 1 | undecided | Whether a headless runner should carry the browser's extension whitelist and 50 MB cap is a design call; a manifest-driven runner has a different threat model | object | yes |
| 2 | unavoidable | The app's multi-sheet picker is a click. The manifest names a sheet on all 49 entries, so the harness had an answer and the app has none without a reader | object | yes |
| 3 | harness | The app re-serialises `parseExcel` rows to CSV and re-parses them. A round-trip can only lose or alter what direct use preserves | object | yes |
| 4 | undecided | `text.trim()` against no trim — both defensible, and `preprocessRaw` removes most of what separates them | object | yes |
| 6 | unavoidable | Same default, block 1. The app's block switch is a click | object | yes |
| 7 | **harness** | The strip removes the title and legend rows a block carries. Nothing about that purpose is specific to multi-block files, and the app runs it only inside `loadBlock`. **The app's placement is the defect** | object | yes |
| 8 | undecided | An all-empty column is `ignore` under `inferBaseRoles` either way, so dropping it is tidiness. Whether the app should also do it on single-block input is a design call | reporting | yes |
| 9 | harness | Follows row 7. If the strip belongs on every file, `detectHeaderRows` belongs on the stripped block | object | yes |
| 10 | app | The app's group-start rule reads each group's label from within its own span. `forwardFill` alone mislabels every layout whose label does not sit on the group's first column | object | yes |
| 11 | harness | A group label is not instrument signal. Prefixing it onto the header lets `detectAssay` score on "Control" or "Plate 1". Role inference is unaffected — `roles.js:41` short-circuits numeric grouped columns before the keyword pass | object | yes |
| 12 | app | A wholly blank row is not an observation. Keeping it inflates `data.length`, the input to `detectGroupAttributes`' `MIN_ROWS_FOR_GROUPING = 50` and `MAX_LEVEL_FRACTION` | object | yes |
| 13 | harness | Long format is not a property of block count. The app runs the detector only on the single-block branch, which is incidental to what it detects | object | yes |
| 14 | unavoidable | The pivot is a modal and a click | object | yes |
| 16 | unavoidable | The app's override is a header click; the harness's is a manifest hint. Neither is wrong and neither reproduces the other | object | no |
| 17 | harness | Consequence of row 11 — same `detectAssay`, different header input. The manifest declared no assay, so the harness ran pure detection | object | yes |
| 18 | undecided | Same default from `ASSAY_DATATYPE_MAP`. Whether a headless runner may override a field the app locks is a design call | object | yes |
| 19 | undecided | The harness copies **BatchView** (`BatchView.jsx:158`), not ImportView. The app auto-applies on one surface and only recommends on the other, so the app disagrees with itself | object | yes |
| 20 | unavoidable | The app blocks Run on a click when no condition structure exists. The harness hardcodes `'replicates'` at `:256`, which is BatchView's constant | object | yes |
| 21 | app | `dataColHeaders` is information the engine can use and the harness withholds — but `conditionContext.js:84`/`:115` consume it only as condition **names** | reporting | no |
| 22 | unavoidable | The block is a click. `'ordered'` is the documented batch default (`rowSemantics.js` — the conservative default keeps sequential tests live) | object | yes |
| 24 | app | The bypass is deliberate and documented. `assays.js:152-157` names the headless runner as the place where the absence is reachable | object | yes |
| 25 | unavoidable | The card's "Keep raw" is a click. Both sides otherwise land on `detectVST` | object | yes |
| 26 | app | A one-data-column file is not what the battery is for, and `aggregation.js:24`'s width filter shows what narrow input does downstream | object | yes |
| 29 | unavoidable | The confirm is a tick and a click. The harness records `groupingPending` and stops | object | yes |
| 33 | unavoidable | `isPivoted:false` is row 14's consequence, not a decision of its own. `onProgress` and `skipHeavy` are inert in the production build | object | no |

**Right side: 6 harness, 5 app, 9 unavoidable, 5 undecided.**
**Changes: 23 object, 2 reporting, 0 neither.**
**Countable: 22 yes, 3 no.**

## What the dispositions say

**The app is not ground truth.** Six rows resolve to the harness. Two of them — 7 and 9 — are one
defect: the preamble strip sits inside `loadBlock`, so it fires only when `detectBlocks` split the
file, and the header-row count then reads a different block. Rows 3, 11, 13 and 17 are the rest.

**This reframes Part 1's prediction-3 conclusion.** Part 1 called rows 7, 13 and 19 an inversion —
the harness being stricter than the app. Disposed, two of those three are cases where **the harness
is right and the app is wrong**, not cases of harness over-reach. The third, row 19, is the app
disagreeing with itself across its two surfaces. The inversion is real, and it is mostly an app
defect wearing an inversion's shape.

**Nine rows are unavoidable, and that is the floor.** Rows 2, 6, 14, 16, 20, 22, 25, 29 and 33 all
turn on a click. No harness reproduces them, so no amount of harness work closes them. The corpus
can only ever describe the machine's default answer at those nine points, and rows 20, 22 and 29 are
where that default is load-bearing.

**Almost everything reaches the engine.** 23 of 25 change the analysis object. Only rows 8 and 21
are reporting-only, and row 21 is unreachable in the harness anyway.

**Five rows come to Nick**: 1, 4, 8, 18, 19.

## 2b feasibility, found while checking the Countable column

`corpus-out/s379-honest-run.json` **is on disk** in the main checkout — 8.1 MB, 49 datasets, 41
imported, 8 import failures, generated by `scripts/corpus-run.mjs` on Node v25.8.1. CLAUDE.md warns
the artifact is gitignored and that its regeneration should be budgeted; it does not need
regenerating.

Its per-sheet `structure` block records `assay`, `assaySource`, `dataType`, `rowSemantics`,
`rowSemanticsSource`, `vst`, `vstSource`, `longFormatDetected`, `zeroAsMissing`, `nRows`, `nCols`,
`nConditions`, `conditionType`, `nCondCols`, `rowGroupStatus`, `groupingPending`, `headers`, `roles`
and `attributes`. Those are the values the published figures were computed from, so reading them is
entering through the harness's own dispatch rather than re-deriving it. Rows 13, 17, 18, 19, 22, 24,
25, 26 and 29 become directly readable off it.

The eight import failures, for the denominator: C07::Fig2_PCA_group, C09::Sheet2, C14::Metadata,
C15::Article information, C15::Column name, C20::Microcosm metadata, C20::Env. gradient metadata,
C22::Info.

## Part 2a verification

- Repo state read directly with `git`, not taken from the dispatch.
- The Part 1 tally was recounted by parsing the committed table, not by eye. Rows 22 and 25 escape a
  pipe inside a cell and so fall out of a naive column split; both were confirmed by reading those
  two lines directly.
- The four `groupingPending` tests were read at all eight sites.
- The P179 finding was read by parsing the committed manifest: 49 entries, key set
  `{path, sheet, label}`, zero hints.
- `condStructureKind` (`coordinates.js:100`) was checked to be a pure function with no browser
  imports, which is what makes row 20 countable from Node in 2b.
- Nothing was executed against the engine — no `runFullAnalysis`, no batch, no corpus run. The one
  artifact read was a field-set confirmation. It printed incidental tallies, which are deliberately
  not reported here: they carry no per-row denominator and no app-side counterfactual, and that is
  the whole of 2b's design.

---

# Part 2b — the BatchView sweep, and incidence

Two questions. Which of the 25 divergent rows actually fire on the corpus, because a divergence at
zero incidence is a documentation item. And which of them are really ImportView-versus-BatchView — a
shipped product inconsistency — rather than app-versus-harness, which costs a user nothing.

Instrument: `test/probes/probe-s381-divergence-incidence.mjs`. It calls no engine function and never
regenerates the artifact.

## The BatchView sweep

`corpus-run.mjs` reproduces BatchView's loop rather than ImportView's — its own header says so at
`:6-8` — and BatchView ships. One lookup per divergent row.

| # | BatchView | Site | Reads as |
|---|---|---|---|
| 1 | third | `BatchView.jsx:41` | neither — keeps ImportView's extension whitelist, drops its 50 MB cap, and skips a rejected file silently with `continue` |
| 2 | harness | `:44` — `parseExcel(file)` with no sheet argument → `excel.js:51` | product inconsistency |
| 3 | ImportView | `:45` — the same CSV re-serialise expression as `ImportView.jsx:280` | harness artifact |
| 4 | harness | `:82` — `Papa.parse(file.text, …)`, no `.trim()` | product inconsistency |
| 6 | harness | `:92-93` | product inconsistency |
| 7 | **harness** | `:96-98` — the strip runs on every file | **product inconsistency** |
| 8 | harness | absent — `:95`'s comment says "remove empty columns" and `:96-98` does not | product inconsistency |
| 9 | harness | `:101` — `detectHeaderRows` on the stripped block | product inconsistency |
| 10 | harness | `:115-122` — `forwardFill` only; `:114` calls it "simplified version" | product inconsistency |
| 11 | harness | `:123` — bare name, no group prefix | product inconsistency |
| 12 | harness | absent — no blank-row filter at `:109`/`:112`/`:124` | product inconsistency |
| 13 | third | `:133-138` — the harness's inputs, plus an `nH>0` gate but no single-block gate | product inconsistency |
| 14 | absent | absent — `:127-132` records the decision to route rather than pivot | product inconsistency |
| 16 | absent | absent | neither |
| 17 | harness | `:152` — `detectAssay(file.name, hdrs)` on bare headers | product inconsistency |
| 18 | absent | `:167` — same default, no override surface at all | neither |
| 19 | **harness** | `:158` | **product inconsistency** |
| 20 | **harness** | `:161` — `const batchColRel = 'replicates'` | **product inconsistency** |
| 21 | harness | `:167-168` — no `dataColHeaders` | neither — unreachable, `:161` hardcodes conditions-mode away |
| 22 | **harness** | `:166` — `rsSuggestion.value \|\| 'ordered'` | **product inconsistency** |
| 24 | **harness** | `:170` — `detectVST` with no ordinal bypass | **product inconsistency** |
| 25 | absent | `:170`; `:196`'s comment states nothing on this path can override it | neither |
| 26 | harness | absent — no data-column minimum | product inconsistency |
| 29 | ImportView | `:335` → `ReportView` → `GroupingConfirmCard`; `:309-311` supplies `data`, `roles`, `hdrs` | harness artifact |
| 33 | harness | `:200` — `null` progress, no `skipHeavy` | neither — the differences are inert in the production build |

**BatchView sides with the harness on 17 rows and with ImportView on 2.** Third on 2, absent on 4.

**Seventeen rows are shipped product inconsistencies.** Five are inherent to an unattended surface —
rows 2, 6, 14, 20 and 22 need a human answer that batch mode has no way to ask for. **The other
twelve have no such excuse.** Rows 4, 7, 8, 9, 10, 11, 12, 13, 17, 19, 24 and 26 are places where
BatchView could match ImportView on the same file and does not. Row 13's `nH>0` gate is its only
ImportView inheritance, and `detectHeaderRows` returns 0 only on a file under two rows, so that gate
cannot separate the two in practice.

**Only two rows are pure harness artifacts.** Row 3 — both app surfaces round-trip Excel through CSV,
and only the harness reads `parseExcel` rows directly. Row 29 — both app surfaces reach the
grouping-confirm card, and only the harness stops at `groupingPending`.

## Incidence

**Denominators.** 41 imported sheets out of 49 attempted, across 12 workbooks. Rows whose unit is the
file are counted against 12. The 8 import failures are C07::Fig2_PCA_group, C09::Sheet2,
C14::Metadata, C15::Article information, C15::Column name, C20::Microcosm metadata,
C20::Env. gradient metadata, C22::Info.

### Rows that change the matrix

| # | Predicate | Denominator | Count | Sheets | Matrix shape |
|---|---|---|---|---|---|
| 3 | a cell differs between `parseExcel` rows and `Papa.parse(serialise(rows))` | 41 sheets | **0** | — | identical on all 41; zero cells differ |
| 4 | `Papa.parse` differs with and without ImportView's whole-text `.trim()` | 41 sheets | **0** | — | identical on all 41 |
| 7 | the second preamble strip removes ≥ 1 row | 41 sheets | **0** | — | **identical on all 41 — no row removed anywhere** |
| 9 | `detectHeaderRows(stripped) ≠ detectHeaderRows(un-stripped)` | 41 sheets | **0** | — | identical; follows from row 7 |
| 10 | `nH ≥ 2` and the name row repeats a value at ≥ 2 positions, so ImportView's group-start rule can leave `forwardFill` | 41 sheets | **3** | C15::Fig. 2, C15::Fig. 5, C15::Fig. S1 | **unmeasured** — see below |
| 11 | composed `"group · name"` headers differ from bare | 41 sheets | **3** | same three | n/a — headers, not the matrix |
| 12 | a wholly blank row survives into the data region | 41 sheets | **0** | — | identical on all 41 |

**Row 7 fires on nothing, and the probe computes why rather than asserting it.** `preprocessRaw`
strips leading rows below `max(3, ceil(contentWidth × 0.1))`; the second loop strips below
`max(2, ceil(maxRowLength × 0.1))`. The second threshold is stricter than the first on **0 of 41**
sheets, so `preprocessRaw` has already removed everything the loop could reach. `preprocessRaw` did
strip leading rows on 8 sheets, at most 2 each. The loop then removed none anywhere, so the matrix is
identical either way on every sheet — a computation, not an inference.

**Row 10's effect is unmeasured, and the rule is the reason.** Deciding whether ImportView's
`condPerCol` actually differs from `forwardFill`'s needs ImportView's group-start loop
(`ImportView.jsx:169-176`) run against the harness's. That is a port, not a toggle. The count above is
the upper bound — the sheets where the two rules *can* differ.

### Rows that change how the matrix is analysed

| # | Predicate | Denominator | Count | Sheets |
|---|---|---|---|---|
| 13 | ImportView's `detectLongFormat` result differs from the harness's | 41 sheets | **0** | — (both false on all 41) |
| 17 | `detectAssay` returns a different assay on composed vs bare headers | 41 sheets | **0** | — (row 11's three sheets keep the same assay) |
| 18 | the manifest overrides `dataType` | 41 sheets | **0** | — (no entry of 49 declares one) |
| 19 | the harness auto-enabled zero-as-missing | 41 sheets | **0** | — |
| 20 | `condStructureKind(condPerCol, roles)` falsy — ImportView would block Run | 41 sheets | **21** | all 21 read `conditionType: none` |
| 22 | `suggestRowSemantics(…).value === null` — ImportView would block Run | 41 sheets | **31** | 29 `general`, 2 `survey` |
| 24 | ordinal data carrying a transform ImportView forbids | 41 sheets | **1** | C17::Training Feasibility Survey — harness `anscombe`, ImportView forces `raw` |
| 25 | a non-raw transform is proposed, so ImportView's card renders and a click can decline it | 41 sheets | **16** | 13 `log`, 3 `anscombe` |
| 29 | `groupingPending` is set — four tests held at `N/A` | 41 sheets | **9** | C09::Sheet1, C14::Data, C15::Data, C15::Fig. 6, C20::Microcosm soil A, C20::Microcosm soil B, C22::Exp. OA, C22::Exp. WA, C22::Exp. ST |

Row 24 note: two sheets are `ordinal`. On C17::Behaviors `detectVST` already returns `raw`, so both
paths agree there and the divergence does not fire.

### The rest

| # | Predicate | Denominator | Count | Sheets |
|---|---|---|---|---|
| 1 | extension outside the whitelist, or size over 50 MB | 12 workbooks | **0** | all `.xlsx`/`.xls`; largest 2.38 MB |
| 2 | the workbook holds more than one sheet | 12 workbooks | **10** | all but C19.xlsx and C24.xls |
| 6 | `detectBlocks(…).length > 1` | 41 sheets | **2** | C15::Fig. 6, C15::Fig. S2 |
| 8 | multi-block, and a column all-empty within block 1 | 41 sheets | **0** | — |
| 14 | ImportView would offer a long-format pivot | 41 sheets | **0** | — |
| 16 | the manifest declares a role hint | 41 sheets | **0** | — (no entry of 49 declares one) |
| 21 | — | — | **unmeasured** | no independent predicate; conditions-mode is unreachable while row 20 hardcodes `replicates` |
| 26 | fewer than two data columns | 41 sheets | **1** | C22::Exp. ST, at 1 |
| 33 | — | — | **unmeasured** | no independent predicate; it is row 14, which is 0 |

## The load-bearing finding

**On 40 of 41 imported sheets, ImportView would have refused to run until a human answered at least
one gate.** Row 20 alone on 9 sheets, row 22 alone on 19, both on 12, neither on 1.

The one sheet that clears both is **C14::Data** — and it carries `groupingPending`, so ImportView
would have met the reader with the grouping-confirm card instead. **On 41 of 41 sheets the app asks a
question that the corpus answered with a literal.**

The two literals are `corpus-run.mjs:256` (`colRelationship: 'replicates'`) and `:252`
(`rsSuggestion.value || 'ordered'`), copied from `BatchView.jsx:161` and `:166`. So this is not a
harness artifact. It is what the shipped batch surface does too.

And on the nine `groupingPending` sheets the four tests named at 2a — Mahalanobis Row Outlier,
Entropy / Zipf Analysis, Column Goodness-of-Fit, Modality Test — were `N/A` in every published corpus
figure. **Every firing count on those nine sheets is a lower bound.** Eight of the nine also sit
inside the 40.

## Part 2b predictions, scored

1. **Held, overwhelmingly.** BatchView sides with the harness on 17 rows and with ImportView on 2.
   Most of the 25 are shipped product inconsistencies, and twelve of the seventeen have no
   unattended-operation excuse. The read does change what it is about.
2. **Missed, and it is the cleanest disagreement here.** Row 7 was predicted to fire on more sheets
   than any other row. It fires on **0 of 41** — joint-lowest, not highest. The deposits do carry
   legend rows and `preprocessRaw` removed some on 8 sheets, but it removes them first and its
   threshold is never looser than the strip's on any sheet. Row 7 stays an ImportView defect by 2a's
   disposition; it is a defect with zero measured incidence on this corpus.
3. **Held.** Row 19 fires on 0 of 41. The live-inversion worry was worth checking — the assay is
   detected rather than declared — and no sheet detected as `genomics` or `cell_count`.
4. **Held.** Row 24 fires on 1 of 41.
5. **Held.** Row 29 fires on 9 of 41, and the lower-bound consequence follows.
6. Reported rather than predicted, as asked: `condStructureKind` is falsy on 21 of 41.

Ranked by incidence: **row 22 at 31/41, row 20 at 21/41, row 25 at 16/41, row 29 at 9/41, row 2 at
10/12 workbooks.** Everything else is 3 or fewer, and eleven rows are exactly 0.

## Part 2b verification — which dispatch each value entered through

- **Harness side**: `corpus-out/s379-honest-run.json`'s per-sheet `structure` block, which is
  `scripts/corpus-run.mjs`'s own recorded output. It supplies `headers`, `roles`, `assay`, `dataType`,
  `rowSemantics`, `vst`, `longFormatDetected`, `zeroAsMissing`, `nCols`, `conditionType` and
  `groupingPending`. Opened read-only; never written, never regenerated. Size and mtime unchanged
  after the run.
- **Run inputs**: `test/probes/s379-corpus-manifest.json`, the committed manifest for that run.
- **Shared primitives, called directly**: `parseExcel`, `getSheetNames`; `preprocessRaw`,
  `detectBlocks`, `detectHeaderRows`, `forwardFill`, `contentWidth`, `isFilledCell`;
  `detectLongFormat`; `suggestRowSemantics`; `detectAssay`; `condStructureKind`; `Papa.parse`.
- **Two verbatim transcriptions, both toggled rather than ported, both marked in the probe**: the
  preamble strip (`corpus-run.mjs:156-161`) and the CSV serialiser (`ImportView.jsx:280`, identical at
  `BatchView.jsx:45`).
- **One reconstruction, and it proved itself.** Rebuilding the harness's `hdrs` from the shared
  primitives produced arrays **byte-identical to `structure.headers` on 41 of 41 sheets**, zero
  mismatches. That is what licenses treating the reconstructed `condPerCol` as the harness's own
  answer rather than a third implementation's, and it is what rows 10, 11, 17 and 20 rest on. A sheet
  failing the check would have been excluded from those four rows; none did.
- **Not called**: `runFullAnalysis`, `extractAnalysisInputs`, `computeSeverity`, the batch runner.
  No corpus re-run, no `src/` change.
- **Unmeasured, with reasons stated**: row 10's effect, and rows 21 and 33.

## Not done

The five `undecided` rows from 2a — 1, 4, 8, 18, 19 — are design calls and are Nick's. The twelve
excuse-free ImportView-versus-BatchView inconsistencies are reported, not fixed.
