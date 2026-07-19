# S326 — Import width: what "real content" could mean (code read, read-only)

Read-only. Nothing was changed. This read enumerates the candidate definitions and measures
each against the corpus. It does not choose one, and it does not build anything.

**The headline measurement: every candidate rescues C15, and none of them moves anything else.**
Across 109 sheets in 22 corpus files, C15's `Data` sheet is the only sheet where any candidate
changes the surviving row count or the final column count. C11 does not move under any
candidate, on any of its 34 sheets.

## The source read

### One correction before anything else

The dispatch asks for the function that derives `sparseThresh`. `sparseThresh` is not the value
in question. There are two thresholds in `preprocessRaw` and they read different inputs:

| Value | Line | Expression | Reads | Governs |
|---|--:|---|---|---|
| `minCells` | 28 | `Math.max(3, Math.ceil(maxC*0.1))` | the **used-range width** | the row strip — this is what breaks C15 |
| `sparseThresh` | 39 | `Math.max(2, Math.floor(rows.length*0.05))` | the **surviving row count** | the empty-column drop |

`sparseThresh` never reads a width. A change aimed at it would touch the wrong line. Everything
below concerns `minCells`.

This also explains why the reverted reorder was a different kind of change from the one now
proposed. Moving the column drop ahead of the strip alters what `sparseThresh` reads, because the
pre-strip row count is not the post-strip row count. Trimming the width for `minCells` leaves
`sparseThresh` reading exactly what it reads today.

### Where the used-range width comes from

`src/import/excel.js:71-72`:

```js
const formatted = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });
const rawVals   = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true,  defval: null });
```

then `excel.js:77-80` computes `maxC` from that output and pads every row with
`new Array(maxC).fill(null)`. `sheet_to_json` honours the sheet's used range, so for C15 every
row arrives exactly 16,384 cells wide with nulls beyond column 26.

Because the pad makes every row the same length, `parser.js:27`'s
`maxC = raw.reduce((m,r)=>Math.max(m,r.length),0)` **is** the used-range width. The widest row and
the used range are the same number by construction on the Excel path.

### The strip predicate, verbatim

`src/import/parser.js:29-31`:

```js
const isSparse=row=>row.filter(v=>v!=null&&String(v).trim()!=="").length<minCells;
let s=0; while(s<raw.length&&isSparse(raw[s]))s++;
let e=raw.length-1; while(e>s&&isSparse(raw[e]))e--;
```

**The filled-cell test applied today, per cell:** `v != null && String(v).trim() !== ""`. So a
cell counts as filled unless it is null, undefined, an empty string, or whitespace only. The
number `0` counts as filled. The string `"n/a"` counts as filled. The boolean `false` counts as
filled.

Note that the strip only removes rows from the **leading and trailing** ends. It does not remove
interior rows. C15 fails because the walk from the front reaches the end before finding a
non-sparse row, so `s` passes `e` and `raw.slice(s, e+1)` is empty.

### What else depends on the same width

Nothing downstream reads the line-27 `maxC`. It feeds `minCells` on line 28 and nothing else.
Line 35 recomputes an independent `nC` from the surviving rows, and that is what the column drop
and the returned matrix use.

Five sites in the tree share the `ceil(width*0.1)` pattern:

| Site | Floor | Runs relative to `preprocessRaw` |
|---|--:|---|
| `src/import/parser.js:28` | 3 | **is** the row strip — the vulnerable one |
| `src/import/parser.js:59` (`blockSummary`) | 2 | preview surface, not the import path |
| `src/components/views/ImportView.jsx:149` (`loadBlock`) | 2 | after — called at line 189, downstream of line 185 |
| `src/components/views/BatchView.jsx:95` | 2 | after — `preprocessRaw` runs at line 85 |
| `scripts/corpus-run.mjs:157` | 2 | after — inherited from BatchView |

The four secondary strips are not independently vulnerable, because for any file that survives
`preprocessRaw` the phantom columns are already gone by line 42, so their `maxC` is the real
width. `blockSummary` would report a phantom width in the multi-block picker preview, but it does
not feed the matrix.

## The candidate definitions

Six, including the status quo as the baseline.

| # | Definition | Counts as content | Does not count |
|---|---|---|---|
| **A** | Widest row array length — **status quo** | any array slot, including padded nulls | nothing |
| **B** | Last column with any non-null cell | `""`, whitespace, `"n/a"`, `0` | `null` only |
| **C** | Last column with a cell non-empty after trim — **matches `parser.js:29`** | `"n/a"`, `0`, `false` | `null`, `""`, whitespace |
| **D** | As C, but over data rows only (skip row 0) | as C, in a data row | as C, plus header-only columns |
| **E** | As C, but placeholder tokens treated as absent | `0`, real text | as C, plus `n/a`, `-`, `null`, `none`, `nd` |
| **F** | Last column that would survive the existing column drop (`filled > sparseThresh`) | a column with enough filled cells | sparse columns, however real |

### The boundary cases, resolved against the actual data

Measured over all 3,434,541 cells in the corpus.

- **Empty string versus genuinely absent.** There are **zero** empty-string cells anywhere in the
  corpus. `defval: null` at `excel.js:71-72` guarantees that an empty Excel cell arrives as
  `null`, never `""`. So on the Excel path B and C cannot differ, and they do not — B equals C on
  all 109 sheets.
- **But the CSV path separates them.** PapaParse yields `""` for an empty field, not `null`.
  Measured on a three-column CSV with two trailing commas: candidate B computes width 5,
  candidate C computes width 3. `preprocessRaw` serves both the CSV and the Excel path, so this
  difference is live even though no corpus file exhibits it. A file with trailing commas on every
  row would defeat candidate B entirely.
- **Whitespace-only cells.** Nineteen exist, all in C11, spread across ten sheets. None is in a
  trailing column, so B and C agree anyway on this corpus.
- **A formula whose result is empty.** No such cell is present. Under `raw: false` an empty
  formula result would arrive as `""`, so it lands in the same bucket as the empty-string case
  above — invisible to B, trimmed by C.
- **Columns with a header and no data rows.** Exactly one instance in the corpus: `C24 / Sheet1`,
  where C computes 16 and D computes 15. No behavioural difference — both give `minCells` 3.
- **Literal placeholders such as `n/a`.** 27,252 such cells, concentrated in `C14 / Data`
  (25,533) and `C07 / Mastersheet` (864, which is the eighteen soil columns at 48 rows each).
  Despite that volume, **E equals C on all 109 sheets** — no placeholder column is the trailing
  column anywhere in the corpus.

## What each candidate does to the corpus

### Width differences

23 of 109 sheets compute a narrower width than the status quo under at least one candidate.
Twenty-two of those changes have **no** behavioural effect, because `minCells` is floored at 3 and
their widths are small enough that `ceil(width*0.1)` is 3 or less on both sides.

The floor is the reason. A width change can only move behaviour when `ceil(width*0.1)` exceeds 3
on one side of the change, which needs a width above 30. Thirteen sheets have a used range above
30. On twelve of them every candidate agrees with the status quo:

| Sheet | Used range (A) | Candidate C | `minCells` A → C |
|---|--:|--:|---|
| C07 / Mastersheet | 44 | 44 | 5 → 5 |
| C10 / B. pumilus Experiment1 | 31 | 31 | 4 → 4 |
| C10 / B. pumilus Experiment2 | 31 | 31 | 4 → 4 |
| C10 / P. megatetrium Experiment1 | 31 | 31 | 4 → 4 |
| C10 / B. cereus Experiment2 | 36 | 36 | 4 → 4 |
| C11 / Cell cycle scores_Fig 2b | 35 | 35 | 4 → 4 |
| C11 / Time courses_Fig 3h | 119 | 119 | 12 → 12 |
| C11 / DE class_Fig 4b | 34 | 34 | 4 → 4 |
| C11 / Neuroepithelium_Fig 5c | 31 | 31 | 4 → 4 |
| C12 / Field survey-data | 48 | 47 | 5 → 5 |
| C16 / Sheet1 | 113 | 113 | 12 → 12 |
| C25 / Fig. 3a | 34 | 34 | 4 → 4 |
| **C15 / Data** | **16,384** | **26** | **1,639 → 3** |

### The only sheet that moves

`minCells` changes on exactly one sheet in the corpus:

| Sheet | A | B | C | D | E | F |
|---|--:|--:|--:|--:|--:|--:|
| C15 / Data — width | 16,384 | 26 | 26 | 26 | 26 | 26 |
| C15 / Data — `minCells` | 1,639 | 3 | 3 | 3 | 3 | 3 |
| C15 / Data — surviving rows | **0** | 61 | 61 | 61 | 61 | 61 |
| C15 / Data — final columns | **0** | 26 | 26 | 26 | 26 | 26 |

Every candidate rescues C15 identically: 61 rows and 26 columns, the phantom columns removed by
the existing column drop exactly as the S325 read predicted.

**No candidate moves any other sheet.** Surviving row count and final column count are unchanged
from the status quo on all 108 remaining sheets, under all five candidates.

### C11 specifically

The reverted reorder cost C11 eleven real columns. **No candidate here costs it anything.** All
34 sheets, all six candidates: zero change to surviving rows and zero change to final columns.

This holds even for candidate F, which computes drastically narrower widths on seven C11 sheets:

| C11 sheet | A | F | rows A → F | cols A → F |
|---|--:|--:|---|---|
| Cell cycle scores_Fig 2d | 19 | 10 | 53 → 53 | 15 → 15 |
| Latency to suckle_Fig 3b | 11 | 8 | 10 → 10 | 8 → 8 |
| Amplitudes_Fig 3j | 22 | 14 | 77 → 77 | 20 → 20 |
| DE expression_Fig 4a | 10 | 4 | 14,434 → 14,434 | 3 → 3 |
| snRNA-seq_Fig 7 | 18 | **0** | 35 → 35 | 18 → 18 |
| RNA-seq_Fig S4 | 11 | 3 | 16,658 → 16,658 | 3 → 3 |
| snRNA-seq_Fig S7 | 9 | 3 | 5,575 → 5,575 | 3 → 3 |

The reason C11 was hurt by the reorder and is untouched here is structural. The reorder changed
what the **column drop** saw. A width trim changes only `minCells`, and `minCells` only governs
which leading and trailing rows are stripped. The column drop's inputs — `nC` from line 35 and
`sparseThresh` from the surviving row count — are not touched by any candidate.

### The sixteen sheets

**They cannot be identified from the S325 summary.** It records that the reorder "moved sixteen
corpus sheets" and names only two of them, C11 and C10. There is no enumeration in the summary,
the chat summary, or the landed read reports. Per the dispatch, the full corpus was measured
instead — 109 sheets across 22 files, listed above by effect rather than by the reorder's
membership.

### Where two candidates give the same answer

On this corpus, **B, C, D and E are indistinguishable**. Every one of them computes the same width
on 108 of 109 sheets, and the single exception (C24 / Sheet1, where D is one narrower) has no
behavioural effect. That is a finding about the corpus, not about the candidates: this corpus
contains no empty-string cell, no trailing whitespace column, and no trailing placeholder column,
so the three distinctions those candidates draw never arise in it.

F is the only candidate that separates itself, on ten sheets, and on none of them does the
separation change behaviour.

## Where the change would sit

**In `preprocessRaw`, computing a trimmed width for line 28 only.** Not upstream in `excel.js`.

Trimming in `excel.js` would change the padded array itself, which would change the column indices
the column drop reports in `removedCols`, which `buildOriginalColMap` (`coordinates.js:66`) uses to
map display columns back to file columns. That is the class of breakage the reorder produced on
C10 — a `removedCols` and `rows` mismatch. Computing the width locally for the threshold touches
nothing else, because nothing else reads line-27 `maxC`.

If the value moved upstream, the readers to update would be the five sites tabled above. Four of
them would be unaffected in practice, because they run after `preprocessRaw` and already see
trimmed widths.

## My lean

**Candidate C — the last column holding a cell that is non-null and non-empty after trimming.**
Stated as a lean, not a decision.

The measurement does not distinguish C from B, D or E on this corpus, so the argument for C is not
that it measures better. It is that C is the predicate the function already applies, character for
character, at `parser.js:29` and again at `parser.js:41`. Adopting it introduces no new notion of
content, and the width computation and the strip it feeds would agree by construction rather than
by coincidence. A future reader would not have to ask why the width test and the fill test differ.

Two candidates I would set aside, with the measurement behind each:

- **B fails on the CSV path**, which the Excel corpus cannot show. PapaParse emits `""` for an
  empty field, so a CSV with trailing commas keeps its phantom width under B — measured above at
  width 5 against C's 3. `preprocessRaw` serves both paths, so this is a live gap, not a
  hypothetical.
- **F is the fragile one.** It is the only candidate that can return a width of zero, and three
  sheets do — `C10 / B. cereus Experiment1`, `C11 / snRNA-seq_Fig 7`, `C14 / Metadata`. Zero is a
  nonsense width that survives today only because `Math.max(3, …)` catches it. It also couples the
  row strip to the column-drop threshold, reintroducing the ordering entanglement that sank the
  reorder.

D and E are defensible and cost nothing measurable. I would not reach for them, because each adds
a rule — skip the header row, maintain a placeholder list — that buys nothing on the evidence and
has to be justified to the next reader.

**No candidate rescues C15 with collateral movement, so the dispatch's central-finding section is
empty.** There is no sheet to report under it. That is the measurement, not an absence of looking:
all 109 sheets were run through the full `preprocessRaw` under all six definitions and compared on
surviving rows, final columns and `removedCols` count.

## What did not fit

- **The floor of 3 is doing all the protective work, and nothing records why it is 3.** Twenty-two
  of the twenty-three width changes are absorbed by `Math.max(3, …)`. Had the floor been 1, several
  of those sheets would move. The floor's origin is not documented, and neither is the `0.1`
  factor — the S325 read established that and it is still true. The safety margin this whole
  measurement rests on is an undocumented constant.
- **The batch is blind to this and would stay blind.** The widest fixture in `test/fixtures/` is 19
  columns, and no fixture carries a used range wider than its content. No fixture can reach a
  `minCells` above 3, so no fixture exercises the path at all. A change here would be batch-green
  by construction, which is not evidence about it. Any check would need a new fixture with a
  phantom used range, and building one is the only way the batch could ever cover this.
- **C08 carries the same defect and survives it.** `C08 / DATA` has a used range of 22 against 6
  columns of content, and `C08 / Analysis data` 13 against 5. Both import today because their
  `minCells` is already at the floor. They are the same bug as C15 at a survivable magnitude, and
  under every candidate they continue to import unchanged. The difference between silent handling
  and hard failure is only the degree of inflation.
- **C15's `Fig. 5` and `Fig. S3` are also inflated** (12 against 8, and 6 against 5) and also
  survive. C15 is not a file with one bad sheet; it is a file whose sheets are inflated
  throughout, with one inflated far enough to break.
- **Rescuing the import is not the same as making C15 analysable.** The S325 summary records that
  when the reorder cleared import, C15 then threw on role inference. That blocker was fixed by
  `99f75de`, and the S326 ecology re-run measured role inference on the trimmed sheet yielding 18
  data columns and 5 condition columns. So the downstream path now appears clear. This read did
  not run the full engine on a width-trimmed C15, so that is an expectation from two separate
  measurements rather than something established end to end here.
- **The probe.** `probe-width.mjs`, `probe-boundary.mjs` and `probe-width-out.json` are left
  untracked in the worktree root as the evidence behind every number above. They are throwaways.

---

`./scripts/dev.sh cmd-s326-import-width`
