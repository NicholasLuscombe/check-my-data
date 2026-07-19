# S326 — The C14 duplication-detector discrepancy (code read, read-only)

Read-only. Nothing was changed.

**The cause is transcription.** Sequential Duplication has never returned High on C14, at any
commit, since the test was written. It cannot: the file is 9,398 rows and the test skips its
scan above 5,000, returning Low at p = 1 without measuring anything. The S325 sentence names a
test that no run has ever flagged on this file.

## The measurements

### What the S325 census says

Line 122 of `docs/shared/S325-CODE-READ-ECOLOGY-CENSUS.md`, quoted verbatim:

> **Coverage.** Ran 23, not applicable 2, pending 4, errored 0. Severity 3 (High).
> Completed and flagged High: thirteen tests, including **both duplication detectors**, both
> Benford digits, Terminal Digit, Value-Frequency Spike, Inter-Replicate Correlation,
> Blocked Mahalanobis, Autocorrelation, Runs, Within-Row Variance, Selective Noise, Missing
> Data. Moderate: Constant-Offset Blocks, Cross-Condition Rank Correlation, LOESS, Regional
> Noise.

The bold is added. The named items sum to exactly thirteen, matching the stated count, so the
list reads as exhaustive rather than illustrative.

### What the code returns

Both tests, run directly on C14's `Data` sheet at both commits:

| Test | at `37d2f45` (S325-era) | at `fa64ee9` (current HEAD) |
|---|---|---|
| Sequential Duplication | **LOW**, primaryP = 1 | **LOW**, primaryP = 1 |
| Exact Duplicate Detection | HIGH, primaryP = 0 | HIGH, primaryP = 0 |
| Row-Mean Runs | HIGH, primaryP = 0 | HIGH, primaryP = 0 |

Inputs, identical at both commits: matrix 9,398 rows by 14 columns, sheet `Data`, roles from
inference with seven attribute columns held out, assay `general`.

Sequential Duplication's own description string at both commits, verbatim:

```
Sequence scan skipped for large dataset (9398 rows > 5000).
```

### What produces p = 1

It is a size guard, not a statistic. `src/tests/sequentialDuplication.js:38-42`:

```js
if (nR > BLOCK_SCAN_LIMIT) {
  return { name: "Sequential Duplication", category: "copied", flag: "LOW", primaryP: 1,
    sequences: [], nSequences: 0,
    description: `Sequence scan skipped for large dataset (${nR} rows > ${BLOCK_SCAN_LIMIT}).` };
}
```

`BLOCK_SCAN_LIMIT` is 5,000. The return is a literal `primaryP: 1` with an empty sequence list.
Nothing is computed. This is why the value is exactly 1 rather than near 1 — it is a constant in
a early-return branch, not the output of a test that found nothing.

**The constant has never had another value.** Checked at four commits — current HEAD, the
S325-era `37d2f45`, `ca62e80` (S319), and `2883517` (S303, the commit that created the test):

```
HEAD       const BLOCK_SCAN_LIMIT = 5000;
37d2f45    const BLOCK_SCAN_LIMIT = 5000;
ca62e80    const BLOCK_SCAN_LIMIT = 5000;
2883517    const BLOCK_SCAN_LIMIT = 5000;
```

So from the moment Sequential Duplication existed, any file over 5,000 rows has taken this
branch. C14 has been over 5,000 rows throughout.

### Which commit produced the S325 entry, and how that was derived

`37d2f45`, derived from `git worktree list` rather than from the report's own text.

The S325 census session's worktree still exists at
`.claude/worktrees/s325-code-prompt-ecology-720ac0`. Its HEAD is `37d2f45` ("Spec 7.6: the
not-applicable surface", 2026-07-19 12:06:33), its branch carries no commits beyond main, and
`git status` in it is clean.

Two independent checks agree with that. The census describes the confirm path as missing the
upfront applicability checks S324 added to the engine; those checks reached the confirm path in
`cc838a6` at 12:58:11, and reached the engine in `3b5fa7f` merged at 11:53:43. A run that sees
the engine with the guards and the confirm path without them must sit between 11:53 and 12:58.
`37d2f45` at 12:06 sits in that window. The census also states it measured C07 before `99f75de`
(17:35:45), which `37d2f45` precedes.

### The S325 probe itself

**Gone.** The census describes "a throwaway probe" and it was not kept. The S325 worktree is
clean — `git status --short` returns nothing, so no probe script and no output artifact survive
there. Nothing at that worktree's root matches a probe. The `test/diag-*.mjs` files present are
tracked historical diagnostics from earlier sessions, not this census's probe.

The probe's source was therefore not read. What it executed was established from its output
instead: the census's C14 entry records shape, trigger arms, group count, group size range,
median, coverage counts, severity and the full Moderate list, and **every one of those matches
this run exactly**. Those fields pin the sheet, the role inference and the matrix. They do not
pin the sentence in dispute.

## The cause

**Transcription.** Candidate 1.

The measurement and the report disagree, and the code establishes which is right. Sequential
Duplication returns Low at p = 1 on C14 at the S325-era commit, at current HEAD, and at every
commit since the test was written, because a 9,398-row file cannot reach its scan. No run has
ever produced the result the sentence claims.

Four things support transcription over the other two candidates.

**The other two candidates are ruled out at source.** An input difference (candidate 2) would
have to change the sheet, the roles or the matrix, and all three are pinned by the fields that do
match — 9,398 by 14, seven held out, 236 groups, median 4, sizes 1 to 1,671, coverage 23 / 2 / 4 /
0, severity 3, and an identical four-test Moderate list. Both of C14's sheets exceed 5,000 rows
anyway (`Data` 9,427 raw, `Metadata` 16,396), so no sheet choice lets the test run. A moved
verdict (candidate 3) would need one of the two modules to have changed; `git diff --stat
37d2f45..HEAD -- src/` touches exactly four files — `applicability.js`, `confirmGrouping.js`,
`engine.js`, `roles.js` — and neither `sequentialDuplication.js` nor `rowMeanRuns.js` is among
them.

**The sentence is one substitution away from the measurement.** Replace "both duplication
detectors" with "Exact Duplicate Detection" and add "Row-Mean Runs", and the list becomes exactly
the thirteen this run measures. The count of thirteen was right the whole time; only the
membership was wrong.

**The shorthand appears exactly once in the census.** "both duplication detectors" occurs on line
122 and nowhere else. Every other entry names the two tests individually — C07 at line 71, C16 at
line 164, C20 at lines 183–184, C22 at line 202 all write out "Exact Duplicate Detection" and
"Sequential Duplication" as separate items. C14 is the only file where the pair was collapsed into
a phrase, and it is the only file where the pair's members disagree.

**Row-Mean Runs was known to the writer.** It is named in the census's own C07 entry, line 72, in
that file's Moderate list. It was not an unfamiliar test that got overlooked everywhere; it was
omitted from one list.

This is a report error, not an engine error. Nothing in `src/` needs a fix and this dispatch
proposes none.

## What did not fit

- **The two duplication detectors do not behave alike above 5,000 rows, which is likely what made
  the shorthand feel safe.** Both carry a `BLOCK_SCAN_LIMIT` of 5,000, but they spend it
  differently. Sequential Duplication returns early and computes nothing
  (`sequentialDuplication.js:38`). Exact Duplicate Detection gates only its block-detection
  sub-test — the comment at `duplicateDetection.js:366-369` says "row-dup grouping and within-row
  coincidences still run" — and it also switches its match-probability model above N = 5,000
  (`duplicateDetection.js:58`). So on C14 one detector returns High at p = 0 and the other never
  looks. Treating them as a unit is safe on small files and wrong on large ones. The census's
  other four running files are 60 to 204 rows, where the pair does move together.
- **The batch could not have caught this, and still cannot.** The largest fixture in
  `test/fixtures/` is 1,501 lines; nothing crosses 5,000. Sequential Duplication's large-dataset
  skip branch is therefore unexercised by the entire 22-fixture batch — no fixture has ever taken
  it. This is not a gap the batch missed by chance; there is no fixture of the required shape.
- **Three corpus files cross the guard, not one.** Measured across `corpus-data/`: C10 (`B.
  cereus Experiment1`, 16,522 rows), C14 (`Data` 9,427, `Metadata` 16,396) and C25 (`Fig. 2c`,
  43,202 rows). On each, Sequential Duplication returns Low at p = 1 without measuring. Any read
  of those files that treats a Low from this test as evidence of absence would be reading a skip
  as a result. Named here because it is the same shape as the C14 sentence, not because anything
  is known to be wrong in those files' entries.
- **Only the C14 sentence is affected.** Every other per-file High and Moderate list in the census
  was checked against the S326 re-run and matches. C07 matches its own pre-fix measurement
  exactly; C09, C16, C20 and C22 match the current run exactly. This is one sentence, not a
  pattern.
- **The census's stated count was never wrong.** Thirteen High is correct at both commits. A
  reader who took the count and ignored the list would not have been misled.

---

`./scripts/dev.sh cmd-s326-c14-discrepancy`
