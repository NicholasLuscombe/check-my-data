# Session 300 — block-copy sub-test reach on a single-column recurrence (READ-ONLY)

Read-only. No source, fixture, or batch change. This traces the block-copy sub-test of Exact Duplicate Detection (Test 4) at source and answers one question: on a single continuous column carrying a value repeated in a structured run — the shape the real-world SL column has — which of the three block-detection passes can fire, and does any of them fire when the matrix is reduced to exactly one column.

All line citations are from live `src/tests/duplicateDetection.js`. Block-copy scans `wrMatrix`, which is `fullMatrix || matrix` (line 20) — the full multi-column matrix passed to the test, not a per-group slice. The engine dispatch is `engine.js:323`, `testDuplicates(m, matrix, wrColGroup, assay)` via `runPair`, where `matrix` (all columns) becomes `fullMatrix` and therefore `wrMatrix`. So the number of columns the passes see is the number of columns in the scored matrix.

---

## 1. What "SL-alone" referenced, and where the measurement lives

The p ≈ 3.6e-14 measurement is not from any in-tree harness on live data. The CORPUS-03 dataset is gitignored (`corpus-data/` and `corpus-out/` are absent from the tree; `.gitignore` lines 60–61), and the tracked runner `scripts/corpus-run.mjs` builds the full multi-column matrix from a file — it has no single-column isolation path. The SL-alone figure comes from the earlier audit reads, which recorded a throwaway probe:

- The value: "Scored on `SL` alone, the block-copy sub-test rates HIGH (p≈3.6e-14)." (`docs/shared/SESSION295-AUDIT-SUMMARY.md:55`)
- The same measurement restated: "Exact Duplicate Detection (`recur` scored alone) — LOW → **HIGH** — block-copy / collision fire once the real column is removed." (`SESSION295-AUDIT-SUMMARY.md:85`)
- The contrast: "The block-copy sub-test still rated CORPUS-03's `SL` alone as HIGH … in the pooled two-column dispatch the co-present real column breaks it." (`SESSION294-AUDIT-SUMMARY.md:88`)

So "SL-alone" means a **one-column matrix** — the SL (or `recur`) column scored in isolation with the real second column (`Total.distance`) removed. It is not multi-column with SL merely carrying the defect; the whole point of the measurement is that the second column is gone. The shape of that column is a genuine block copy confined to one column: about 84 distinct values with fourfold and eightfold replication, described as "the fish 1 to fish 4 block copy" (`SESSION296-AXIS2-ESTIMATOR-READ.md:18`, `:38`). That is contiguous rows copied, not scattered singletons — the distinction turns out to be decisive (Section 4).

---

## 2. The three passes — matching unit, minimum width, column precondition

Block-copy assembles candidate blocks in three passes, then prices each block with one null (Section 4). The passes differ in what counts as a repeated unit.

### Pass 1 — full-row hash (Step 1–2, lines 368–437)

Each row is hashed across every column into one key:

```
line 372:  for (let c = 0; c < wrC; c++) {
line 373:    const v = wrMatrix[i][c];
line 374:    const s = v != null ? v.toFixed(4) : "∅";
line 375:    for (let j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = Math.imul(h, 16777619); }
```

Windows of `h` consecutive rows are grouped by their sequence of row-hashes (lines 385–390), equality-verified across all columns (lines 401–405), and recorded when two or more positions share the window. The only structural gate is on height:

```
line 380:  const maxH = Math.min(10, Math.floor(wrR / 2));
line 413:  if (h === 1) continue;   // Skip height=1 full-row matches — handled by rowDupGroupList
```

- **Matching unit:** a whole row (all `wrC` columns), matched against a **second row-position** at some offset. Recorded blocks carry `cols: Array.from({length: wrC}, …)`, `width: wrC`, `isFullRow: true` (lines 428–430).
- **Minimum width:** the full row. There is **no `w ≥ 2` column guard** — width is whatever `wrC` is.
- **Minimum height:** `h ≥ 2` (line 413 skips height 1; those go to the row-duplicate sub-test, Test 2).
- **Column precondition:** none. Pass 1 needs whole-row identity at two row-positions, but "whole row" is however many columns the matrix has. On one column it is one cell.

### Pass 2 — partial-column offset scan (Step 3, lines 438–477)

For each row offset `d`, it finds which columns match between row `i` and row `i+d`, and keeps runs where a **subset of columns** matches consistently:

```
line 462:  for (let c = 0; c < wrC; c++) {
line 463:    if (wrMatrix[i][c] != null && wrMatrix[i + d][c] != null && wrMatrix[i][c] === wrMatrix[i + d][c]) {
line 464:      matchCols.push(c);
line 467:  const matchKey = matchCols.length >= 2 ? matchCols.join(",") : "";
```

and closes a block only if it is partial-width and clears the size guards:

```
line 448:  const fullRow = w === wrC;
line 450:  if (!fullRow && bh >= 2 && w >= 2 && bh * w >= MIN_BLOCK_CELLS) {   // MIN_BLOCK_CELLS = 6 (line 357)
```

- **Matching unit:** a partial-width block (a subset of ≥2 columns) copied to a row offset `d`, same columns.
- **Minimum width:** `w ≥ 2` (line 450), and strictly less than the full row (`!fullRow`, line 448); full-row cases are left to Pass 1.
- **Minimum height:** `bh ≥ 2`; **minimum area:** `bh × w ≥ 6` (line 450).
- **Column precondition:** at least two columns must match at the same offset — `matchCols.length >= 2` (line 467) is required even to open a candidate. One column can never produce a `matchKey`.

### Pass 3 — column-segment hash (Step 4, lines 478–537)

For each starting row it hashes every column's values downward and groups columns whose value-sequences coincide over a row range — "does this column's values appear in any other column over the same rows?" (lines 481–484):

```
line 486:  const minColStreak = 3;
line 505:  const groups = {};
line 506:  for (let c = 0; c < wrC; c++) { … groups[k].push(c); }
line 511:  for (const cols of Object.values(groups)) {
line 512:    if (cols.length < 2) continue;
```

Recorded as column-to-column blocks with `width: 2` and `isColumnMatch: true` (lines 542–551).

- **Matching unit:** a column segment (a run of rows in one column) that equals **another column** over the same rows.
- **Minimum width:** two columns (the matching pair).
- **Minimum height:** `minColStreak = 3` (line 486).
- **Column precondition:** at least two columns must share the segment — `cols.length < 2` is skipped (line 512). Cross-column by construction.

---

## 3. Single-column reachability

Reduce the scored matrix to exactly one column (`wrC = 1`).

- **Pass 1 — reachable.** The full-row hash (line 372) runs `c = 0` only, so the row hash is just the single value. Two row-positions whose `h`-row value-sequences coincide form a block, and any block with `h ≥ 2` is recorded. The whole-row requirement collapses to same-column identity at an offset. Its one gate (line 413) is about height, not column count.
- **Pass 2 — unreachable.** With one column, `matchCols` holds at most one entry, so `matchCols.length >= 2` (line 467) is never true and no candidate opens; `w >= 2` (line 450) would fail regardless.
- **Pass 3 — unreachable.** With one column, each hash group holds one column, so `cols.length < 2` (line 512) skips everything.

So of the three passes, only Pass 1 survives a one-column matrix, and only for `h ≥ 2` — a contiguous run of at least two identical rows recurring at two or more positions. A value repeated at scattered single positions is height-1 and is dropped at line 413 (it is scored by the row-duplicate sub-test, Test 2, not by Test 4).

---

## 4. Decisive answer

**The SL-alone block HIGH is Pass 1 (full-row hash).** Passes 2 and 3 both require a two-column match unit — a second column to match against — which a one-column matrix cannot supply, so neither can contribute to `bestBlockP` on SL alone. Pass 1 requires whole-row identity at a second row-position; on one column that whole row is the SL value itself, so a copied contiguous block of the recurring value is a full-row block copy and Pass 1 records it.

**The exact precondition that decides this** is the difference between three gates:

- Pass 1's only structural gate is `if (h === 1) continue;` (line 413) — a **second row-position** (height ≥ 2, same column). No column minimum.
- Pass 2's gate is `matchCols.length >= 2` (line 467) plus `w >= 2` (line 450) — a **second column**.
- Pass 3's gate is `cols.length < 2 → continue` (line 512) — a **second column**.

Only Pass 1's gate can be met by one column, because its matching axis is rows, not columns.

The block is then priced by the row-to-row null (lines 681–688): `pRow = Π wrColHHI[c]` over the block's columns (line 684) — on one column, `wrColHHI[0]`, the column's own Herfindahl index — raised to the block height, `pBlock = pRow^h` (line 685), times the offset-search volume (lines 686–688). The height exponent is what drives the significance: a tall copied run sends `pRow^h` far below the null even though the recurrence also inflates `wrColHHI[0]`. That is why the SL block copy reaches p ≈ 3.6e-14 while the collision channel, which has no such height leverage, stays suppressed by the same inflated index. The exact block height behind the 3.6e-14 figure cannot be pinned down here — the SL data is out of tree — but the mechanism is unambiguous: single-column full-row identity, priced by height.

**So the HIGH does not survive because a second column co-participates — the reverse.** A second, genuinely distinct column (`Total.distance`, all values unique) is added into the row hash at line 372, so two rows that shared the SL value no longer hash equal; Pass 1's whole-row match breaks, and Passes 2 and 3 find no second matching column either. The two-column pool therefore drives block-copy to `bestBlockP = 1`. This is exactly the audit note: "in the pooled two-column dispatch the co-present real column breaks it" (`SESSION294-AUDIT-SUMMARY.md:88`); "A co-present real column whose values are not duplicated breaks whole-row and whole-block identity, so tests 2/3/4 are neutralised" (`SESSION295-AUDIT-SUMMARY.md:55`). The detection lives on the single-column matrix and is suppressed by adding the real column, not the other way round.

---

## 5. Two cross-checks

**The in-tree recurrence fixtures do not exercise this pass.** Fixtures 23 and 24 reproduce the axis-2 collision-null suppression, and their recurrence column's block channel is inert: the live result carries `_rawPs = [collision 1, rowDup 1, withinRow 1, block 1]` (`SESSION296-FIXTURE-BUILD-FINDINGS.md:11`), and the earlier read notes "Block copy (Test 4) … Unique per-row filler values produce no repeated blocks → bestBlockP = 1" (`SESSION297-FIXTURE-READ2.md:70`). That matches the block value observed in the collision-null read of the prior session (fixture 23 block p = 1.0). Those fixtures carry **scattered** recurrence, which Pass 1 skips at line 413 — so they reproduce the collision-channel defect but not the single-column block-copy HIGH. The real CORPUS-03 SL column fired block-copy because its recurrence is a **contiguous** block copy, which the fixtures do not carry. Any future check of the single-column block reach needs a fixture with a contiguous repeated run, not the existing scattered-recurrence pair.

**Same-null coupling, different escape.** All three DupDet structural channels build their match probability from the empirical Herfindahl index — collision `p1 = hhi` (line 147), row-duplicate `pMatchRow *= hhi` (line 644), block `pRow *= wrColHHI[c]` (line 684) — so a recurrence that inflates the index suppresses the collision and row-duplicate channels (the axis-2 circularity). The block channel escapes that suppression only through its height exponent, and only when the recurrence is contiguous enough to form a tall block. It is a narrow escape hatch, gated entirely by Pass 1's height-2 minimum and the single-column collapse of whole-row identity.

---

## Summary

- "SL-alone" is a one-column matrix (the recurrence column scored with the real column removed); the p ≈ 3.6e-14 figure is from a throwaway probe recorded in the audit reads, not an in-tree harness — the CORPUS-03 data is gitignored and absent.
- Of the three block-detection passes, only Pass 1 (full-row hash, lines 368–437) can fire on one column; Pass 2 (line 467, `matchCols.length >= 2`) and Pass 3 (line 512, `cols.length < 2`) both require a second column.
- Pass 1 produces the SL-alone HIGH: on one column, whole-row identity is single-column identity, and a contiguous repeated run of height ≥ 2 (past the `h === 1` skip at line 413) is a full-row block copy, priced by `pRow^h` (lines 684–685) whose height exponent carries it to significance.
- The HIGH depends on the matrix being one column, not on a second column co-participating. Adding a distinct real column into the row hash (line 372) breaks the match and suppresses the block channel to 1 — the observed two-column behaviour.
- The in-tree recurrence fixtures (23/24) have scattered recurrence and block p = 1; they do not exercise this single-column block-copy path.

Scratch/no-build read. Nothing written outside this doc.
