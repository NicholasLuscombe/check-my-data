# Session 298 — scoping the continuous collision-null replacement (READ-ONLY)

Read-only. No source changed, no fixture written, no batch run. This scopes the pending fix for the Exact Duplicate Detection collision test: replacing its empirical Herfindahl-index null on continuous columns with a collision probability read off a value-density model, integrated at the recording grid. It does not implement anything.

All line citations are from live source (`src/tests/duplicateDetection.js` unless noted). The design docs cite these sites three inconsistent ways across the two prior fixture reads; the numbers below are what the current file actually says. One measurement comes from a throwaway probe (worktree-local, not committed) that mirrors the batch pipeline — it parses fixture 23, runs the full engine to obtain the exact matrix the collision test sees, then recomputes the collision baseline by density integration and re-runs the same survival, correction, and flag chain.

---

## 1. The live collision null on the continuous branch

**Where the empirical index is computed.** The pooled concentration index over every cell is one line:

```
line 55:  const hhi = Object.values(globalFreq).reduce((s,c)=>s+(c/N)**2, 0);
```

`globalFreq` is the value-frequency map built over the per-group matrix at lines 26–31 (`k = v.toFixed(4)`), and `N` is the pooled cell count. This is the Herfindahl index of the pooled multiset — the probability two random cells carry the same value.

**Where it becomes the null.** The collision baseline `p1` is assigned in a three-way branch. On the continuous branch it takes the index directly:

```
line 147:  p1 = hhi;   (p1Source = "empirical", line 148)
```

**Where the observed count is computed and consumed.** The observed same-value-pair count and its test are lines 179–184:

```
lines 179-182:  collisionObs = Σ_v C(freq(v), 2) over all distinct values
line 183:       collisionNPairs = N*(N-1)/2
line 184:       collisionP = binomialSurvival(collisionObs, collisionNPairs, p1)
```

So the whole collision test is: observed pair count (`collisionObs`) against a binomial with pair-count `collisionNPairs` and per-pair probability `p1 = hhi`. `p1` is consumed nowhere else — only at line 184, plus two display fields (the description string at line 711 and the `p1` field at line 712). Confirmed by grep: `p1` appears only at its assignments (125, 130, 147), the survival call (184), and display (711–712).

**The branch point.** The continuous and integer paths are separated by a runtime condition on decimal precision:

```
line 54:   const isInteger = dominantDp===0;
line 58:   if (isInteger && N <= 5000) { ... Poisson/NB parametric fit ... }   // Math.round + discrete PMF
line 127:  } else if (isInteger) { p1 = hhi; }                                 // large-N integer, empirical
line 132:  } else { ... p1 = hhi; }                                            // continuous, empirical (line 147)
```

The integer path with the `Math.round`-and-discrete-PMF fit is the moderate-N arm, lines 58–126: it rounds each value (`Math.round(val)`, lines 90/98) and fits Poisson and negative-binomial by moments, integrating the squared PMF over the integer range for `pMatch`. The continuous branch is the final `else` (132–149). So yes — the two are separated by a runtime condition, `dominantDp===0` at line 54, and the continuous branch is where the replacement lands.

---

## 2. The recording-precision grid

The grid step is computed near the top of the function, before the branch:

```
line 38:  dominantDp = <most common trailing-decimal count across all cells>
line 39:  const step = Math.pow(10, -dominantDp);
```

Both `dominantDp` and `step` are already in scope at the point `p1` is built (lines 54–149 all sit below line 39), so the replacement needs no threading — the grid the design calls for is already a local. One caveat the replacement must decide, not inherit: `dominantDp` and `step` are computed over the **pooled** multiset (all columns together), so on a mixed-precision file the step is set by whichever precision is most common across the pool, not by the column carrying the recurrence. On fixture 23 the pool is dominated by the 3-decimal filler columns, so `step = 0.001` even though the recurrence column records at 2 decimals. Whether the null integrates per column at each column's own step, or once over the pool at the pooled step, is a design choice with real consequences (Section 4 below).

---

## 3. Blast radius of a density-integration replacement

A null of the form "collision probability = grid step × integral of squared value-density" needs three inputs. Each already exists in the function except the density model:

| Input | Already provided by | Site |
| --- | --- | --- |
| Value vector | `allVals`, the pooled cell list | built lines 26–31 |
| Grid step | `step` | line 39 |
| Density estimate | **not present** — this is the new piece | — |

Today the "density" is the empirical multiset itself, read as `globalFreq` / `hhi` (lines 27–30, 55). The replacement swaps that empirical concentration for a smooth density evaluated on `allVals` and integrated over the grid. The value vector and the step are ready; only the estimator is new.

**Call sites.** The continuous collision null is not called directly — it is internal to `testDuplicates`, which has exactly one call site:

```
engine.js:323:  testDuplicates(m, matrix, wrColGroup, assay)   (via runPair)
```

One dispatch, one test. The change's reach outside the function is that single line, and it only matters when a column is continuous (`dominantDp > 0`).

---

## 4. Can the null be built provisionally and defer the estimator lock?

**Yes.** The verdict on the defect direction does not depend on the estimator choice, so a provisional Silverman-bandwidth kernel estimate is correct enough to fire on the structured recurrence and to gate the fix, with the final estimator lock deferred.

The measurement, on fixture 23's recurrence column (120 values, 75 distinct, 225 same-value pairs):

- Empirical index (current null): `hhi = 3.96e-2` → collision p ≈ **0.9999** → LOW. This is the defect the fixture carries.
- Silverman-bandwidth Gaussian kernel, integrated at the column's own 2-decimal grid: `p1 = 1.54e-3` → collision p ≈ **9.0e-206** → **HIGH**.

Recombined through the real correction and flag chain (the other three sub-tests stay at p = 1, see below), the Duplicate Detection verdict flips **LOW → HIGH**. Integrating over the pooled multiset at the pooled 3-decimal step instead gives an even smaller baseline (`p1 = 8.4e-6`) and the same HIGH — but that pooled figure is amplified by the wide filler column's range, not purely by the recurrence, which is why the per-column number (1.54e-3) is the honest one to quote.

This matches what the earlier corpus read found on the real fish-length column: a Normal fit, a naive kernel estimate, and a recurrence-flattened kernel estimate all landed within about 10% of each other and all roughly eight-fold below the broken empirical index. On the defect direction the estimators are near-indistinguishable — the integral's result does depend on the estimator, but not by enough to change whether the column fires. What the estimator choice actually separates is the *benign* direction (a legitimately quantised clean column that should not fire) and the *concentrated-recurrence* direction (many copies of a few values rather than a few copies of many) — and neither the current data nor fixture 23 exercises those. So the provisional build is safe to fire and gate now; the estimator lock is the thing to defer until a quantised-clean fixture and a concentrated-recurrence fixture exist to discriminate the candidates.

The number to report: **the Silverman-bandwidth density-integration null rates the recurrence HIGH** — collision p ≈ 9e-206 on the recurrence column (p1 = 1.54e-3 against an empirical-index p1 of 3.96e-2).

---

## 5. Does the replacement touch the other three sub-channels?

The prior fixture read stated the empirical index "multiplies into all four sub-channels." That is true of the *method* — every channel builds its null from a concentration index — but not of the *variable*. There are four separate index computations over different scopes, and the global `hhi` at line 55 feeds only the collision test:

- **Test 1 (collision).** Global pooled index, line 55 → `p1`, line 147 → line 184. This is the only consumer of the line-55 index.
- **Test 2 (row duplication).** `pMatchRow` recomputes a *per-column* index in its own loop (`let hhi=0` at line 642, accumulated 643, `pMatchRow *= hhi` at 644) — a different local variable, not the line-55 pool. Result at lines 648–649.
- **Test 3 (within-row coincidence).** Uses bin-local frequency overlaps (lines 306–307); its within-column control uses yet another index, `globalHHI` computed over the full matrix at lines 332–334. Result at line 347.
- **Test 4 (block copies).** Uses `wrColHHI`, a per-column index over the full matrix computed at lines 219–224 and consumed as `pRow *= wrColHHI[c]` at line 684 (plus a cross-column overlap for column-to-column blocks, 667–676).
- **Combine.** All four raw p-values are corrected together and the minimum taken: `rawPs` at line 703, correction at 704, `combinedP` at 705, `flag` at 706.

So replacing the line-55 computation (and its assignment at 147) is **code-isolated to Test 1**. The comment at lines 140–146 reads as though the same index is multiplied into Tests 2 and 4; it is not — those channels recompute their own per-column indices at lines 642 and 219, and would keep using the empirical concentration unless separately rewritten.

For the current recurrence fixtures this isolation is also *behaviourally* complete: on fixture 23 the other three sub-tests sit at p = 1 for structural reasons, not index inflation — there are no duplicated whole rows (so the row-duplicate p is forced to 1 at line 649), no repeated blocks (block p stays 1), and no within-row coincidences. The flip to HIGH therefore comes entirely through Test 1, and replacing only the collision null is both necessary and sufficient here.

The general caveat: a future recurrence carrier that *also* produced whole-row duplicates or copied blocks would have Tests 2 and 4 self-inflate through their own per-column indices, and a collision-only replacement would not cure those. The line-55 fix cleans the collision channel; whether the same density idea should replace the per-column indices at lines 642 and 219 is a separate scope, out of reach of this fix.

---

## Summary

- The continuous collision null is the empirical Herfindahl index at line 55, assigned to `p1` at line 147, tested against the observed same-value-pair count at lines 179–184. Continuous and integer paths split on `isInteger` (line 54); the integer moderate-N path is the `Math.round`/discrete-PMF fit at lines 58–126.
- The recording grid (`step`, line 39, from `dominantDp`, line 38) is already in scope where the null is built. Its one open question is per-column versus pooled precision.
- The replacement needs a value vector (ready, lines 26–31), a grid step (ready, line 39), and a density estimate (new). One call site: engine.js:323.
- A provisional Silverman-bandwidth kernel estimate flips fixture 23 LOW → HIGH decisively (collision p ≈ 9e-206). The estimator lock can be deferred; the defect direction does not discriminate the candidates, and the directions that do are not yet in the data.
- The change is code-isolated to Test 1. The row-duplicate and block channels recompute their own per-column indices (lines 642, 219) and are untouched by a collision-only replacement — an isolation that is complete for the current fixtures and partial in principle.

Dev server (not needed for a read): `./scripts/dev.sh awesome-almeida-9917d4`
