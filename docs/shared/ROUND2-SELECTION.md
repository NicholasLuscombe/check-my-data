# Round 2 — selection pass: cap check, fetch, sheet measurement

**S390. Read-only on `src/`.** No test ran, no verdict, flag or severity was computed, and
**no deposit's eligibility was decided here.** The ordering in §4 is arithmetic over measurements;
which sheets pass the shape filter, and therefore which deposits are eligible, is Chat's and Nick's
call from these numbers, recorded in `ROUND2-RUN-LOG.md`.

Worktree `s390-round2-selection-ec9255`, branch `claude/s390-round2-selection-ec9255`. Source read at
`705078f`.

**The headline.** Part 1 confirms the cap and clears the three provisional rejections — the cap is
50 MiB, it applies to CSV, and it cannot be dismissed. Part 2 **did not run**: Dryad's per-file
download endpoint — the `stash:download` href the dispatch names — answers `401 Unauthorized, must
have current bearer token` to an anonymous client, and the only unauthenticated alternatives are a
bot-detection challenge and the whole-deposit bundle the dispatch forbids. Parts 3 and 4 are built,
and are **proven on a control** rather than asserted: 2,214 field comparisons against the S373 census
baseline with zero differences, and the `groupingPending` read agreeing with the S379 battery run on
41 of 41 sheets.

---

## 0 — Superseded in part, S391

**Two of this script's three stages no longer exist.** `ROUND2-SPECIFICITY-SCREEN.md` §11.4 at
`268ce0a`; implementation at `ec5bf83`, merged `2cf8647`.

- **`--fetch` is superseded by `scripts/round2-fetch.mjs`.** It never ran: the 401 recorded in the
  headline above was never cleared, and `round2-selection.json` still reads `measure: []`,
  `ranking: []`. Acquisition ran instead through an OAuth2 bearer token — see `ROUND2-RUN-LOG.md` §6.
- **`--measure` is superseded by `scripts/corpus-run.mjs --inventory`**, which uses the runner's own
  `prepStructure` rather than a copy. The copied function is deleted.
- **`--rank` is retained**, reading the inventory. `rankDeposit` is byte-identical to its S390 form;
  only its input moved.

**Both retired flags exit 2.** They are refused, not ignored.

**The `R2-NN` layout is stale.** `round2-fetch.mjs` writes `<corpus-data>/round2/pos-NN/` and `--rank`
now groups by that. Every `R2-NN` path below is historical. Line 240's control is accurate as history:
it was built and run that way at S390.

**Stale invocations, named so nobody runs one:** lines 178–179, 356, 358, 364, 369 — as numbered
before this section was inserted; add 29 to relocate them now.

**§3's claim about the S373 census path is correct and stands.**
`test/probes/probe-s373-corpus-shape-census.mjs` is **S373 Part A** and is that path.
`ROUND2-SPECIFICITY-SCREEN.md` §10 wrongly withdrew that citation; §11 restores it. The error was
Chat's, not this document's.

---

## 1 — The import cap, verified before anything is rejected

`S381-HARNESS-APP-DIVERGENCE.md`, part 2b's `BatchView` sweep, row 1: `BatchView.jsx:41` "keeps
ImportView's extension whitelist, drops its 50 MB cap, and skips a rejected file silently with
`continue`". Part 1's census table, row 1 ("File admitted at all"), records the app side as
"Extension whitelist (csv/tsv/txt/xlsx/xls); 50 MB cap on both the File and the decoded text".

**Row 1 holds. Nothing halts. The three rejections stand.**

### 1.1 — What is the cap's actual value, and where is it defined?

**`50 * 1024 * 1024` = 52,428,800 bytes = 50 MiB.** It is not one constant but the same literal
written out at two sites, both in `ImportView.jsx`, and there is no named constant anywhere:

| Site | Guard | Quantity measured |
|---|---|---|
| [`ImportView.jsx:298`](src/components/views/ImportView.jsx:298) | `if (file.size > 50 * 1024 * 1024)` | the `File` object's on-disk byte length |
| [`ImportView.jsx:215`](src/components/views/ImportView.jsx:215) | `if (text.length > 50 * 1024 * 1024)` | the decoded text's length in UTF-16 code units |

A third line, [`ImportView.jsx:216`](src/components/views/ImportView.jsx:216), is a 10 MB
`console.warn` only. It is not user-facing and it blocks nothing.

**S381's line citations have drifted by two.** Part 1 row 1 names `:292`, `:296` and `:213`; at
`705078f` the whitelist gate is `:294`–`:297` (its `setErr` on `:296`), the File cap is `:298` and
the text cap is `:215`. The substance is exactly as recorded — this is citation drift, not a wrong
reading, and it is the standing hazard CLAUDE.md's S247 note warns about.

### 1.2 — Does it apply to CSV as well as Excel, or only to one path?

**Both, and the two gates measure different quantities — which matters.**

`:298` sits in `onFile` **after** the extension whitelist and **before** the `xlsx`/`xls` branch, so
every admitted extension passes through it: `csv`, `tsv`, `txt`, `xlsx`, `xls`. On-disk bytes, one
rule, all five.

`:215` sits in `parseAndLoad`, which is reached two ways. For `csv`/`tsv`/`txt` its argument is the
`FileReader` text. For `xlsx`/`xls` its argument is `csvText` — the **CSV re-serialisation of the
chosen sheet** built at [`ImportView.jsx:280`](src/components/views/ImportView.jsx:280). So a
workbook is capped twice on two different numbers, and a compressed `.xlsx` comfortably under 50 MiB
on disk can serialise past 50 MiB and be refused at the second gate. A CSV cannot fail `:215` having
passed `:298`: UTF-8 never encodes a character in fewer bytes than it takes UTF-16 code units, so the
decoded `text.length` is bounded by the on-disk byte count.

**This is why the three rejections survive the check.** All three over-cap files are `.csv`, and the
gate that catches them is `:298` — the one that is not Excel-specific:

| Position | DOI | File | Size | Considered files in the deposit |
|---|---|---|---|---|
| 10 | `doi:10.5061/dryad.d2547d8b7` | `Porcine_data.csv` | 90,974,480 B = 86.8 MiB | 1, and it is this one |
| 13 | `doi:10.5061/dryad.nk98sf85b` | `interpolated_data_homing_id.csv` | 216,750,635 B = 206.7 MiB | 1, and it is this one |
| 24 | `doi:10.5061/dryad.sn02v6xfg` | `Mesopredator_Data.csv` | 151,272,386 B = 144.3 MiB | 1, and it is this one |

Had the cap been Excel-only, all three rejections would have been wrong. Each deposit's *only*
considered file is the over-cap one, so skipping the file empties the deposit — which is what makes
these three deposit-level and not merely file-level.

The MiB-versus-MB ambiguity in "50 MB" changes nothing here: every one of the three exceeds both
52,428,800 and 50,000,000.

### 1.3 — Is it a hard refusal or a warning the user can pass?

**A hard refusal.** Both sites are `setErr(...)` followed immediately by `return`. The message is
`"File exceeds 50 MB limit. Consider splitting into smaller files."` and it renders as a red banner at
[`ImportView.jsx:736`](src/components/views/ImportView.jsx:736). There is no confirm, no override, no
"load anyway" control and no environment or settings escape — a grep for the literal over `src/`
returns the two guard sites and nothing else. At `:298` the `return` fires *before* `:299` clears
`err`, so the banner persists; the only way forward is a different file.

The 10 MB line at `:216` is the one thing in this area that is passable, and it is passable because it
is not a gate: it writes to the console and execution continues.

### 1.4 — Confirm `BatchView` does not enforce it

**Confirmed.** [`BatchView.jsx:41`](src/components/views/BatchView.jsx:41) is
`if(!["csv","tsv","txt","xlsx","xls"].includes(ext)) continue;` — the whitelist, kept verbatim from
ImportView, and a silent `continue` where ImportView shows an error. `handleFiles`
([`:36`](src/components/views/BatchView.jsx:36)–[`:64`](src/components/views/BatchView.jsx:64)) then
reads every admitted file with no size test of any kind: `grep -n "size\|1024\|MB"` over
`BatchView.jsx` returns two hits, both in the results-table JSX at `:461` and `:466`, neither a guard.

Row 1's third clause is also true and worth restating, because it is the one that bites a batch
operator: a file `BatchView` rejects on extension leaves no trace at all.

### 1.5 — Halt condition

The dispatch halts if the value differs, if it applies to only one file type, or if it can be
dismissed. **None of the three holds.** Part 2 was cleared to run.

---

## 2 — The fetch: blocked, and not by anything the script can fix

**Bytes fetched: 0 of the 247.3 MiB the plan would have pulled. Files fetched: 0 of 199.**

The predicted volume reproduces exactly from the manifest before any network call, so the dispatch's
own arithmetic is confirmed:

| | Files | Bytes | |
|---|---|---|---|
| Considered files across the 42 deposits | 202 | 718,324,530 | **685.0 MiB** — the dispatch's "685 MB" |
| Skipped, over the §1 cap | 3 | 458,997,501 | 437.7 MiB |
| **Planned fetch** | **199** | **259,327,029** | **247.3 MiB** |
| Actually fetched | 0 | 0 | |

### 2.1 — What happened

The script made two requests: the first fetch, and its one permitted retry. It then aborted by design
rather than making 198 more that would fail identically — a 401 on the first file is a credential
wall, not a per-file fault. (A handful of further single requests were made by hand to characterise
the routes in §2.2; they are the only other traffic this session sent to Dryad.)

```
FAIL R2-01/micro_data_compiled.xlsx: HTTP 401 Unauthorized
ABORTED: HTTP 401 on the first fetch (micro_data_compiled.xlsx). DRYAD_TOKEN is not set;
         /api/v2/files/<id>/download requires a bearer token.
```

The body is `{"error":"Unauthorized, must have current bearer token"}`.

### 2.2 — Three routes, characterised

| Route | Result | Usable? |
|---|---|---|
| `/api/v2/files/<id>/download` — the manifest's own `stash:download` href | **401**, bearer token required. Unchanged with a browser `User-Agent` or `Accept: */*`. | Needs a credential this session does not have |
| `/downloads/file_stream/<id>` — the web download link | **403** to a plain client; with a browser `User-Agent`, a **proof-of-work bot-detection challenge** (Anubis 1.24.0, `<title>Validating...</title>`) | **No — and deliberately not.** Solving it is bypassing bot detection, which is out of bounds regardless of purpose |
| `/api/v2/versions/<id>/download` — the whole-version bundle | **302 → a presigned lambda URL, 200, unauthenticated.** `Range` is ignored (a `0-99` request returns the whole entity with `200`, not `206`), so no per-member extraction | **No** — the dispatch forbids whole-deposit bundles, and see §2.3 |

The read-only API is unaffected: `/api/v2/search`, `/api/v2/versions/<id>/files` and
`/api/v2/files/<id>` all answer 200. **The block is specific to file bytes.** The enumeration that
produced `round2-manifest.json` would still reproduce today; only the download does not.

### 2.3 — The bundle route is worse than forbidden, it is infeasible

The dispatch forbids bundles because "one deposit is 8.9 GB in total storage and 6.9 MB in considered
files". The manifest says the real spread is far wider. `storageSize` equals the sum of the listed
file sizes exactly on every deposit checked, so these are internally consistent figures, not metadata
artefacts:

| Position | DOI | Total storage | Considered bytes | Ratio |
|---|---|---|---|---|
| 50 | `doi:10.5061/dryad.1rn8pk187` | 1,485,971,138,931 (**1.35 TiB**, 21 files) | 14,415 | 103,085,060× |
| 14 | `doi:10.5061/dryad.bvq83bkr6` | 24,754,355,338 (23.1 GiB, 31 files) | 222,117 | 111,447× |
| 32 | `doi:10.5061/dryad.9ghx3fg0p` | 9,300,454,957 (8.7 GiB, 14 files) | 7,054,101 | 1,318× |
| 34 | `doi:10.5061/dryad.m0cfxppgt` | 8,902,995,511 (8.3 GiB, 8 files) | 340,706 | 26,131× |

**Bundling the 39 fetchable deposits would move 1,425 GiB to obtain 247.3 MiB — 5,900× the payload.**
The instruction was right and is now quantified; position 50 alone rules the route out.

### 2.4 — What unblocks it

Two ways, and the choice is Nick's:

1. **A Dryad API token in `DRYAD_TOKEN`.** The script already sends
   `Authorization: Bearer $DRYAD_TOKEN` on every request, so `DRYAD_TOKEN=… node
   scripts/round2-select.mjs` runs the whole pass unchanged. Dryad issues tokens to account holders;
   obtaining one needs an account, which is not something I can create or hold.
2. **Download by hand and point the script at the files.** `--measure --rank` never touches the
   network. Files placed at `<corpus-data>/round2/R2-NN/<original filename>` are picked up as-is; the
   fetch stage re-verifies anything already on disk against the manifest's size and sha-256 and skips
   re-pulling it, so a mixed manual/automatic run is safe.

The fetch stage is otherwise complete and was exercised end-to-end: `--dry-run` produces the full
199-file plan with the 3 cap skips and no network call; the live path throttles at 1,200 ms between
files, retries once and no more, verifies each file's byte count **and its sha-256** against the
manifest, and reports size and digest mismatches individually as "the deposit moved under us".

---

## 3 — Measurement: built, and proven against the census it claims to be

§6.2 names the S373 census path. `scripts/round2-select.mjs --measure` **is** that path, not a second
one:

- `prepStructure` is copied **byte-for-byte** from
  `test/probes/probe-s373-corpus-shape-census.mjs`, which copied it from `scripts/corpus-run.mjs`.
  Neither can be imported — both are scripts that parse `argv` and run at load. Identity is checkable,
  and checks clean:

  ```bash
  diff <(sed -n '/^function prepStructure(raw) {$/,/^}$/p' test/probes/probe-s373-corpus-shape-census.mjs) <(sed -n '/^function prepStructure(raw) {$/,/^}$/p' scripts/round2-select.mjs)
  ```

- The CSV read is `corpus-run.mjs`'s `readRawMatrix` parse call —
  `Papa.parse(text, { header: false, skipEmptyLines: false })`. That is **BatchView's** form, not
  ImportView's: the app trims the whole text first and the harness does not (S381 row 4). §6.2 names
  the census path, and this is the census path's call.
- Everything else is a call into a shipped `src/` module: `parseExcel`, `getSheetNames`,
  `preprocessRaw`, `detectBlocks`, `detectHeaderRows`, `forwardFill`, `detectLongFormat`,
  `inferBaseRoles`, `detectGroupAttributes`, `summarize`, `detectAssay`, `ASSAY_DATATYPE_MAP`,
  `extractAnalysisInputs`. The run stops there. `runFullAnalysis` is never called.

**Nothing in `src/` was modified, including to make anything reachable.**

### 3.1 — What is recorded per sheet

File, sheet name, sheet index and total, raw rows × columns, header rows detected, valid data rows,
data columns, every column's inferred role (with the by-role name lists and counts), whether
`detectBlocks` split the sheet (`nBlocks`, `detectBlocksSplit`), whether `groupingPending` was set
(with its arm, condition-column count, group count and median size), the assay and datatype, the
grouping outcome and group sizes, `zeroAsMissing`, `longFormatDetected`, and any import error
verbatim.

**`groupingPending` needs no test run.** The trigger is computed inside `extractAnalysisInputs`
([`engine.js:174`](src/analysis/engine.js:174)–[`:178`](src/analysis/engine.js:178), via
`computeTrigger`) and stamped onto `condCtx`; `runFullAnalysis` only *reads* it at
[`:242`](src/analysis/engine.js:242). The script reads the same field at the census stopping point.
That is a field read, not a re-derivation of the arm logic.

One field is recorded **outside** the census pipeline and marked as such: `capTextLength`, the length
of the text `ImportView.jsx:215`'s second cap would measure — the CSV re-serialisation for a workbook
sheet, the decoded file text for a CSV. The serialisation expression is copied verbatim from
`ImportView.jsx:280`; it is token-identical to `BatchView.jsx:44`. Nothing downstream reads it. It
exists because §1.2 found that a sheet can clear the on-disk cap and fail the text cap, and that is
not visible from file sizes alone.

### 3.2 — The control, because there are no round-2 files to measure

The measurement and ranking stages were run against the round-1 corpus (`corpus-data/`, 28 `.xlsx` +
2 `.xls` = 30 workbooks), laid out in `R2-NN/` folders exactly as round 2 will be — same code path, no special case.
**134 sheets attempted, 123 measured, 11 import errors recorded verbatim and not retried** ("Empty
after preprocessing", "Sheet is empty"). A second, smaller tree mixed CSV fixtures and multiple files
per deposit into the same run to exercise the CSV read and the file-name tie-break.

**Control 1 — the census path.** Per-sheet output compared against
`probe-s373-corpus-shape-census.mjs`'s own JSON, generated in this worktree in the same session
(which itself reproduces §0.3's published S317/S322 figures 12 of 12):

> **123 (file, sheet) pairs; 2,214 field comparisons; 0 differences.** The key sets match in both
> directions — 0 baseline pairs missing from this run, 0 of this run's pairs absent from the
> baseline — so this is a complete match, not a sampled overlap.

Fields compared: `rawRows`, `rawCols`, `headerRows`, `nBlocks`, `parsedRows`, `parsedCols`, `assay`,
`dataType`, `zeroAsMissing`, `longFormatDetected`, `nNumericDataCols`, `validRows`, the whole
`roleCounts` object, and `grouping.{kind,nGroups,min,median,max}`.

**Control 2 — `groupingPending`, the one field the S373 census does not carry.** Compared against
`corpus-out/s379-honest-run.json`, where the full battery recorded the four held tests:

> **41 of 49 run entries carry a sheet name; on all 41, the census-point read agrees with the battery
> run. 0 disagreements.** Nine of those 41 fire — reproducing S381's and
> `S390-GROUPING-PENDING-READ-ONLY.md`'s "9 of 41 sheets", on the same nine: C09/Sheet1, C14/Data,
> C15/Data, C15/Fig. 6, C20/Microcosm soil A, C20/Microcosm soil B, C22/Exp. OA, C22/Exp. WA,
> C22/Exp. ST.

The eight entries without a sheet name are the run's non-workbook inputs and are outside this census's
unit.

---

## 4 — §6.2's arithmetic, and only its arithmetic

`--rank` sorts every measured sheet by cell count = valid rows × data columns, tie-broken on data
columns, then valid rows, then file name ascending, then sheet index ascending. It reports the whole
ordering per deposit with the numbers behind each rank, the sheets that did not import, and **which
clause separated rank 1 from rank 2**.

**No sheet is marked passing or failing, and no deposit is marked eligible or ineligible.** §6.2's
"among the sheets that pass the shape filter" is the human's set to choose; the ranking says what the
arithmetic does with a candidate set, not what the set is.

**"Data columns" carries no judgement call.** `matrix` rows are built as `dataCols.map(...)` in
`extractAnalysisInputs`, so the matrix width and the count of columns role-tagged `data` are the same
number by construction whenever any row survives. Both are recorded (`dataCols`, `roleDataCols`); the
ranking uses the matrix width, and where a sheet has zero valid rows the cell count is zero either
way.

### 4.1 — The ordering on the control, including §6.2's own named tie

For round 2 this section will hold one block per deposit. With no round-2 files, here is the control's
output — which happens to include the exact case §6.2 was written for.

Across the 30 one-file deposits, **2 were decided by a tie-break and 28 by cell count**; 4 carried a
cell-count tie somewhere in the ordering, and 4 sheets ranked at cell count 0. Both tie-break cases
needed clause 4.

**§6.2 says: "C20 produced a tie in round 1 and the census called either choice defensible. A
defensible tie before the data is a free choice after it."** The ranking reproduces that tie and
resolves it by the pre-registered rule:

```
C20.xlsx  — 5 sheet(s) measured
   1. Microcosm soil A            cells 3468 =  204r x  17c   sheet 1/5  groupingPending
   2. Microcosm soil B            cells 3468 =  204r x  17c   sheet 2/5  groupingPending
   3. Environmental gradient      cells  989 =   43r x  23c   sheet 4/5
   4. Microcosm metadata          cells    0 =    0r x   0c   sheet 3/5
   5. Env. gradient metadata      cells    0 =    0r x   0c   sheet 5/5
      rank 1 decided by: tie-break 4: sheet index ascending
```

Equal on cell count, equal on data columns, equal on valid rows, same file — all three of the first
tie-breaks exhausted, and **sheet index ascending** decides it: `Microcosm soil A`. That is the free
choice §6.2 removed, and the rule removes it. C08 ties the same way and resolves the same way
(`DATA` and `Analysis data`, both 1,050 = 350 × 3; `DATA` wins on sheet index).

A third tie, of a different kind, appears in the mixed tree, where two files sit in one deposit:

```
R2-01 (C07.xlsx + C07-update.xlsx)  — 8 sheet(s) measured
   1. C07-update.xlsx / Mastersheet        cells 2808 =   72r x  39c   sheet 1/5
   2. C07.xlsx / Mastersheet               cells 2808 =   72r x  39c   sheet 1/5
   ...
   --  C07-update.xlsx / Fig2_PCA_group: DID NOT IMPORT: Empty after preprocessing.
   --  C07.xlsx / Fig2_PCA_group: DID NOT IMPORT: Empty after preprocessing.
      rank 1 decided by: tie-break 3: file name ascending
```

Here the first two tie-breaks are exhausted and **file name ascending** decides:
`C07-update.xlsx` < `C07.xlsx`. Worth flagging for round 2: file-name ascending is a *lexical* rule,
so a deposit carrying both an original and a revision, tied on shape, selects the revision on a string
comparison. That is what §6.2 says to do. It is noted, not changed.

Four sheets in the control imported cleanly to an empty matrix and so rank at cell count 0
(e.g. `C11.xls / Neuroepithelium_Fig 5b`, 0r × 0c). They are ranked last and left in the list rather
than dropped: a sheet that imports without error but yields nothing is a measurement, and dropping it
would be an eligibility decision.

---

## 5 — Predictions scored

| | Prediction | Outcome |
|---|---|---|
| **P1** | moderate — "The cap is 50 MB and applies to both CSV and Excel. Basis is one sentence in the S381 census; I have not opened `BatchView.jsx:41`." | **Correct, and refined.** 50 MiB (`50 * 1024 * 1024`), both file types. The refinement is that it is two gates on two different quantities, not one — and the second can refuse a workbook that passed the first. Row 1 also proved accurate on `BatchView.jsx:41` itself. |
| **P2** | low — "Every fetched file imports without error." | **Unscorable — nothing was fetched.** The only evidence is indirect, and it runs *against* the prediction: on the 30-file round-1 corpus — files already known to be usable — **11 of 134 sheets did not import** ("Empty after preprocessing", "Sheet is empty"), an 8% per-sheet failure rate. Across 202 files from 42 unrelated deposits a clean sweep would be surprising. Recorded as unresolved, and the prediction's own "low" confidence looks right. |
| **P3** | moderate — "At least one deposit's selection turns on a tie-break." | **Unscorable for round 2 — nothing was measured.** On the 30-deposit control, 2 were decided by a tie-break — one of them §6.2's own named C20 case — and a third turned up in the mixed tree. All three needed clause 3 or 4, never 1 or 2. Evidence that the deep tie-break clauses are live and reachable on real deposits; not a score of P3. |

Two of three predictions cannot be scored because part 2 did not run. That is the honest state, and
they carry forward unchanged.

---

## 6 — Reproduction

```bash
node scripts/round2-select.mjs --fetch --dry-run   # the 199-file plan + 3 cap skips, no network
DRYAD_TOKEN=... node scripts/round2-select.mjs     # the whole pass, once a token exists
node scripts/round2-select.mjs --measure --rank    # never touches the network
```

`corpus-data/` is gitignored (`.gitignore:61`) and lives in the **main checkout**, not in a worktree;
the script resolves it via `CORPUS_DIR`, then `./corpus-data`, then a walk up to the main checkout —
the same resolver `probe-s373-corpus-shape-census.mjs` uses. Round 2 lands at
`<corpus-data>/round2/R2-NN/`, beside round 1, so it survives worktree teardown. Override with `ROOT`.

The control in §3.2 and §4.1 is rebuilt with:

```bash
CD=/Users/hedgehog/Projects/check-my-data/corpus-data; i=1; for f in $CD/*.xlsx $CD/*.xls; do d=/tmp/r2ctl/R2-$(printf %02d $i); mkdir -p $d; ln -sf "$f" "$d/"; i=$((i+1)); done; ROOT=/tmp/r2ctl node scripts/round2-select.mjs --measure --rank
```

`docs/shared/round2-raw/round2-selection.json` currently records the fetch block and an empty
measurement set — the true state. It is overwritten whole on every non-`--dry-run` run.

---

**No eligibility decision was made anywhere in this pass: no deposit was marked eligible or
ineligible, no sheet was marked passing or failing, and no test was run.**
