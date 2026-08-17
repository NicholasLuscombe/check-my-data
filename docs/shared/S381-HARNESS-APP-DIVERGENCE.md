# S381 Part 1 — harness-versus-app divergence

Read-only census. No `src/` change, no batch, no run.
Worktree `harness-app-divergence-4371ed`, branch `claude/harness-app-divergence-4371ed`.

Two identical copies, because `docs/sessions` is gitignored at `.gitignore:45` and has never carried
a commit: `docs/sessions/S381-HARNESS-APP-DIVERGENCE.md` is the dispatch's landing path, and
`docs/shared/S381-HARNESS-APP-DIVERGENCE.md` is the tracked one that carries the commit hash.

---

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

**33 decision points. 10 same, 23 divergent** — 15 `differs`, 8 `absent one side`.

## Predictions, scored

**1. "More than one divergence." Held, by a wide margin.** 23 of 33 rows diverge. The upper end was
unpredicted; the answer is 23.

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

## Verification

Every site above was opened and read in this session; no line number is carried over from the
dispatch or from memory. `ImportView.jsx:632` was re-located and confirmed. Nothing was executed —
no batch, no corpus run, no probe. The `same` rows that rest on identical function calls (15, 27,
28, 30) were checked at the definition: `roles.js:25` shows `inferRoles` is exactly `inferBaseRoles`
followed by `applyGroupAttributes`, which is the pair the harness calls at `corpus-run.mjs:191-192`.

## Not done

Part 2 — Class A/B/C classification, and which S379 and S380 figures sit downstream of each
Class A — is not started.
