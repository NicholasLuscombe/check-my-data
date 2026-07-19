# S325 — Phantom column width at import (code read, read-only)

Read-only. Nothing was changed. This read establishes the fix. It does not make it. The
lean — trim the used range before computing the sparsity threshold — is tested against
source below, not argued for.

## Summary up front

- **The untrimmed width has exactly one consumer.** In `preprocessRaw`, the raw column
  count `maxC` (line 27) feeds only `minCells` (line 28), and `minCells` feeds only the
  leading and trailing sparse-row strip (lines 29 to 31). Nothing else in the function, and
  nothing downstream, reads the untrimmed width.
- **The tool already drops phantom columns — one step too late.** Lines 40 to 42 of the same
  function remove empty columns. But they run after the row strip, and on C15 the row strip
  has already thrown every row away, so the column drop never runs. For a file that survives
  the strip, the column drop cleans the phantom columns and the returned matrix is already
  trimmed.
- **So trimming is not redundant with the existing column drop — it is the precondition for
  it.** Trimming the width for the row-strip threshold lets a phantom-wide file survive to
  reach the column drop that was always there. The final matrix width is unchanged either
  way, because the column drop normalises it.
- **The problem is real and recurs, but only C15 breaks.** Three sheets across two corpus
  files carry a used range wider than their content. C08's two sheets are inflated by 16 and
  8 columns and import fine, because the inflation is too small to push `minCells` above
  their real row fill. C15's Data sheet is inflated by 16,358 columns and fails.
- **Feasibility: trimming is clean, with no downstream width effect.** It changes which files
  survive the row strip. It does not change the width any surviving file presents to the rest
  of the pipeline.

## `preprocessRaw` at source

`src/import/parser.js`, lines 25 to 44. The sparsity path in order:

- **Line 27.** `const maxC = raw.reduce((m,r)=>Math.max(m,r.length),0)`. The widest row in the
  raw array. For C15 every row is padded to the sheet's used range, so `maxC` is 16,384.
- **Line 28.** `const minCells = Math.max(3, Math.ceil(maxC*0.1))`. A row must carry at least a
  tenth of the widest row's cells, floored at three, to count as real. For C15 this is 1,639.
- **Lines 29 to 31.** `isSparse` marks any row with fewer than `minCells` filled cells.
  Leading sparse rows are skipped (`s`), trailing sparse rows are trimmed (`e`). C15's rows
  carry about 26 values each, all below 1,639, so every row is sparse.
- **Line 32 to 33.** `rows = raw.slice(s, e+1)`; if nothing survives, return empty. **C15
  exits here.** Its caller then reports "Empty after preprocessing."
- **Line 35.** `const nC = rows.reduce(...)`. The width is recomputed from the surviving rows.
  This is a separate value from the line-27 `maxC`; the line-27 `maxC` is not reused here.
- **Lines 39 to 42.** The column drop. `sparseThresh = Math.max(2, Math.floor(rows.length*0.05))`
  — a different threshold from `minCells`. Any column filled at or below `sparseThresh` is
  added to `emptyC`, and if some but not all columns are empty they are filtered out. This is
  the phantom-column handler. It never runs for C15.

**Where `maxC` (line 27) is read.** Only line 28. Confirmed by reading the function through:
the later width work uses the independent `nC` at line 35. So the untrimmed width's entire
blast radius is the row-strip threshold.

**What the 0.1 factor is doing, and whether its origin is recorded.** It sets the bar for
"this row is too empty to be data" at a tenth of the widest row. Its origin is **not recorded
anywhere.** There is no comment on line 28 and no reference in the shared docs. The only
comment in the sparsity region (lines 36 to 38) explains the 5 percent column threshold, not
the 10 percent row threshold. The same bare `Math.ceil(maxC*0.1)` appears twice more —
`blockSummary` at line 59 and the BatchView preamble strip described below — each undocumented.

## Every other reader of the raw width

After `preprocessRaw` returns, nothing depends on the untrimmed column count. Each downstream
site recomputes width from the already-column-trimmed output. The readers:

- **`ImportView.jsx:185`.** Destructures `{rows: cleaned, removedCols, skippedRows,
  trimmedRows}` and works from `cleaned`, which is column-trimmed. `removedCols` is stored in
  `prepInfo` and used for coordinate mapping (below). No untrimmed width crosses this line.
- **`BatchView.jsx:85`.** Takes `prepResult.rows` (column-trimmed). Then at lines 93 to 95 it
  runs its **own** preamble strip with the same pattern: `maxC0 = blockRows.reduce(...)`,
  `minCells0 = Math.max(2, Math.ceil(maxC0*0.1))`, strip while the first row is below it. This
  is a second copy of the 0.1-factor rule. It is not independently vulnerable, because by the
  time it runs `preprocessRaw` has already dropped the phantom columns, so `maxC0` is the real
  width. The census probe and `corpus-run.mjs` carry the same second strip, inherited from
  BatchView.
- **`blockSummary` (`parser.js:56-64`).** Recomputes `maxC` on a block and reuses
  `Math.ceil(maxC*0.1)`. Called from `ImportView.jsx:619` to preview candidate blocks in the
  multi-block picker. On a phantom-wide block it would report `cols = maxC` (the phantom width)
  in the preview and could mis-skip preview rows, but it is a preview surface, not the import
  path, and does not feed the matrix.
- **`excel.js:77-80`.** This is the **source** of the phantom width, not a reader. `parseExcel`
  computes `maxC` from `sheet_to_json` output — which honours the sheet's used range — and pads
  every row to it. That is why C15's rows arrive 16,384 wide.
- **`coordinates.js:66` `buildOriginalColMap`.** Maps trimmed data columns back to original file
  columns using `removedCols`. It iterates `dataColCount` (about 26 for C15), walking a pointer
  past removed indices via a `Set`. A trailing block of 16,358 removed columns costs nothing —
  the pointer only reaches the phantom range after the last real column, so the loop never
  walks it. The map is built in about 26 steps regardless.

## Column-grouped files

Trimming does not affect column grouping, the column-grouped tests, or the confirm card's
column list. The reason is structural: the matrix and its column roles are built from the
column-trimmed rows, and the phantom columns are already gone by line 42 for any file that
survives. Trimming only changes **whether** a phantom-wide file survives — it does not change
the column set of a surviving file.

For a file with an honest width, trimming finds the real last column, `maxC` is unchanged,
`minCells` is unchanged, and behaviour is identical. So no currently-importing file — column
grouped or not — sees any change to its columns. C15 is the only file whose column set would
appear at all where before there was none, and that set is its real 26 columns, phantom
columns already dropped.

## Whether phantom columns are handled elsewhere

Yes, in the same function, at lines 40 to 42 — the column drop. That is the point worth being
precise about. The phantom columns **are** handled; they are just handled after the row strip
that they break. C08 proves the handler works: its DATA sheet arrives 22 wide with 16 empty
phantom columns, survives the row strip because `minCells` is only 3, and the column drop
removes the 16, leaving 6 real columns. C15 never reaches the handler.

So trimming the width for the row-strip threshold is **not redundant** with the column drop —
it is what lets the column drop run. And because the column drop already produces the trimmed
final width, trimming adds nothing downstream of it. The two changes address different points
on the same path: trimming rescues survival, the existing drop cleans the columns.

This also surfaces a second candidate fix that falls out of the source, reported without
endorsement: drop the empty columns **before** the row strip, reusing the existing lines 40 to
42 logic, so the row strip sees the real width. It reuses code the function already trusts. Its
one caveat is that `sparseThresh` currently reads the post-strip `rows.length`; moving the
column drop ahead of the strip would compute it on the pre-strip row count, a small behaviour
change that would need its own check. Trimming the threshold width avoids that by leaving the
order alone.

## How wide the problem is

Measured across every corpus file and sheet: used-range width against real content width (the
last column carrying any value).

| File / sheet | Used range | Real content | Inflation | Imports? |
|---|---|---|---|---|
| C15 / Data | 16,384 | 26 | +16,358 | **No — fails** |
| C08 / DATA | 22 | 6 | +16 | Yes |
| C08 / Analysis data | 13 | 5 | +8 | Yes |

Every other sheet in the corpus has a used range equal to its content. So C15 is **not alone**
in carrying a phantom used range — C08 carries one on two sheets — but it is alone in this
corpus in having enough inflation to break import. The threshold for breakage is exact: import
fails when `ceil(usedWidth*0.1)` exceeds a real row's filled-cell count. C08's real rows carry
6 values against a `minCells` of 3, so they survive. C15's carry 26 against a `minCells` of
1,639, so they do not. The gap between "silently handled" and "hard failure" is only the
degree of inflation, which is set by editing history the uploader did not control.

## Feasibility verdict on trimming

**Clean, with no downstream width effect.**

- The untrimmed width feeds one thing, the row-strip threshold. Trimming changes that threshold
  and nothing else.
- For every file that imports today, trimming is a no-op: an honest width trims to itself, so
  `minCells` is unchanged and the same rows survive. C08's two phantom sheets already survive
  and would continue to, with an unchanged `minCells` of 3.
- For C15, trimming lets the rows survive the strip and reach the existing column drop, which
  removes the 16,358 phantom columns. The returned matrix is 26 wide — the same width the
  column drop produces for any surviving file — so nothing downstream sees the phantom width.
- Coordinate mapping absorbs the large `removedCols` in linear time over the real column count.
- One cost to name: computing the real last column is a full scan of the padded array, about a
  million cell reads for C15. The function already pays one such scan at line 41 for the column
  drop, so this is a second pass of the same order. Bounded and small; worth merging with the
  existing scan if the fix is ever built, but not a blocker.

The two alternatives, reported plainly. Capping `minCells` at an absolute ceiling would also
rescue C15, but it is a magic number with a narrow safe range — too high and C15 still fails,
too low and it weakens the preamble strip on legitimately wide files — and it leaves
`blockSummary` and the BatchView second strip untouched. Improving only the message leaves the
import broken. Neither reuses the column-drop logic the way trimming or a reorder does.

---

`./scripts/dev.sh cmd-s325-import-width`
