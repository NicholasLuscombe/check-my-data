# What quantity sets Cross-Condition Consistency's `B`

Read-only measurement. Nothing in `src/` changed, so no verdict can have moved and no batch was run.

**Baseline:** commit `4248cd5` plus the unmerged S356 report commit `0a3ad47`, Node v25.8.1, darwin
arm64. Every source line quoted below is from that tree.

**Answer in one line.** Cross-Condition Consistency scales its permutation count on a count of
**values in a condition**, not rows. Rider 2 of `PERMUTATION-COUNT-FEASIBILITY.md` holds. It is the
only test in the battery that counts values; seven other tests scale their counts too, and all seven
count rows.

---

## Summary — the five expectations

| # | Expectation | Verdict |
|---|---|---|
| 1 | The quantity is a count of values — rows times data columns within a condition — not rows | **Held**, with one correction to the wording. It is the count of finite cells in the condition's own sub-matrix, maximised over conditions. On a row-grouped file that is rows-in-condition × data columns. On a column-grouped file it is all rows × the columns in that group |
| 2 | At least one fixture already sits below the top branch, so the corpus is not blind to P71 | **Split.** The first half holds — 8 of 27 sit on the middle branch. The second half does not follow: P71 is about the *lowest* branch, and no fixture reaches it. The corpus is still blind to P71 |
| 3 | Only the lowest branch is floor-blocked; the middle branch can still flag | **Held for the family floor, inverted for the ordinary case.** The middle branch can reach MODERATE only when at least two units tie at the floor. With one unit at the floor it returns 0.012 and cannot flag |
| 4 | No single row number states P71, because the row equivalent moves with width | **Held.** 10,000 rows at 1 column, 1,667 at 6, 1,250 at 8 — and it is rows in the largest condition, not rows in the file |
| 5 | CCC is the only site choosing a count from the data | **Inverted.** Eight sites choose a count from the data. CCC is alone only in *what* it counts |

---

## Part 1 — the branch expression, at source

### The expression

`src/tests/crossConditionConsistency.js:166-167`:

```js
  const maxN = Math.max(...conditionN);
  const B = maxN <= 1000 ? 999 : maxN <= 10000 ? 499 : 199;
```

`conditionN` is built 24 lines above, at `:134-142`:

```js
  const conditionNames = slices.map(s => s.name);
  const conditionVals  = slices.map(s => {
    const out = [];
    for (const row of s.matrix) {
      for (const v of row) if (v != null && isFinite(v)) out.push(v);
    }
    return out;
  });
  const conditionN = conditionVals.map(v => v.length);
```

### What the quantity computes

It counts **finite cells**, not rows. One entry per non-null value in the condition's sub-matrix.
`maxN` then takes the largest condition. So the branch is per condition, not across the whole matrix,
and the file's total row count never enters it.

What "the condition's sub-matrix" means depends on layout. `slices()` in
`src/analysis/conditionContext.js:103-138` returns three shapes:

| layout | slice | `conditionN` equals |
|---|---|---|
| column-grouped (`:104-110`) | all rows × that group's columns | rows × columns in that group |
| conditions-mode (`:111-121`) | one column, non-null rows only | non-null rows in that column |
| row-grouped (`:123-134`) | that condition's rows × all data columns | rows in the condition × data columns |

So the same file re-laid-out can land on a different branch. On a row-grouped file, widening from four
replicates to eight halves the row count at which the branch changes.

### Thresholds and counts

| condition holds | `B` |
|---|---|
| up to 1,000 values | 999 |
| 1,001 to 10,000 values | 499 |
| more than 10,000 values | 199 |

One resample count in the module. `grep` returns a single `B` and a single permutation loop
(`:456`, `for (let perm = 0; perm < B; perm++)`).

### The p is doubled

`src/tests/crossConditionConsistency.js:517-528`:

```js
  // ── Two-sided p-value + direction tag ───────────────────────────────
  for (const u of running) {
    const perm = u.permDist;
    let nUpper = 0, nLower = 0;
    for (let k = 0; k < B; k++) {
      const d = perm[k];
      if (d >= u.dObs) nUpper++;
      if (d <= u.dObs) nLower++;
    }
    const pUpper = (1 + nUpper) / (B + 1);
    const pLower = (1 + nLower) / (B + 1);
    u.p2 = Math.min(1, 2 * Math.min(pUpper, pLower));
```

Each tail carries the Phipson–Smyth `+1` on both sides, then the smaller tail doubles. The raw floor
is therefore `2/(B+1)`, not `1/(B+1)`.

### Thresholds the p meets

`primaryP` is the minimum BH-adjusted p over units that pass the direction filter and the effect-size
gate (`:619-620`):

```js
  const primaryP = effAdjPs.length ? Math.min(...effAdjPs) : 1;
  const flag     = flagFromP(primaryP);
```

`flagFromP` is `src/constants/thresholds.js:38-41`:

```js
export function flagFromP(p) {
  if (!Number.isFinite(p)) return "N/A";
  return p < ALPHA.FLAG ? "HIGH" : p < ALPHA.NOTE ? "MODERATE" : "LOW";
}
```

and the constants are `:22-25`:

```js
export const ALPHA = {
  FLAG: 0.001,   // p < this → HIGH (displayed as "FLAGGED")
  NOTE: 0.01,    // p < this → MODERATE (displayed as "NOTED")
};
```

**Both comparisons are strict.** A p of exactly 0.01 is LOW. That matters at the lowest branch, where
the floor lands on 0.010 exactly.

The direction filter and the per-property effect-size gates also use thresholds, but they decide which
units enter the minimum. They are not compared against the reported p.

---

## Part 2 — where the 27 fixtures land

Quantity computed by reproducing `:134-142` on each fixture, through the same import pipeline
`validate-batch.mjs` uses, after `validateMatrix` and after the engine's own VST construction
(`engine.js:293-303`).

| fixture | rows | data cols | conditions | layout | values per condition | max | branch |
|---|---:|---:|---:|---|---|---:|---:|
| `01-densitometry-clean` | 35 | 12 | 3 | column-grouped | 140, 140, 140 | 140 | **999** |
| `02-densitometry-fabricated` | 35 | 12 | 3 | column-grouped | 140, 140, 140 | 140 | **999** |
| `03-qpcr-clean` | 50 | 3 | 2 | row-grouped | 75, 75 | 75 | **999** |
| `04-qpcr-fabricated` | 50 | 3 | 2 | row-grouped | 75, 75 | 75 | **999** |
| `05-cellcount-clean` | 55 | 4 | 1 | — | 220 | — | never reached |
| `06-cellcount-fabricated` | 55 | 4 | 1 | — | 220 | — | never reached |
| `07-elisa-clean` | 65 | 3 | 1 | — | 195 | — | never reached |
| `08-elisa-fabricated` | 65 | 3 | 1 | — | 195 | — | never reached |
| `09-proteomics-clean` | 400 | 6 | 2 | row-grouped | 1200, 1200 | 1200 | **499** |
| `10-proteomics-fabricated` | 400 | 6 | 2 | row-grouped | 1200, 1200 | 1200 | **499** |
| `11-rnaseq-multicondition` | 1500 | 4 | 3 | row-grouped | 2000, 2000, 2000 | 2000 | **499** |
| `12a-uniform-mixture-clean` | 400 | 6 | 2 | row-grouped | 1200, 1200 | 1200 | **499** |
| `12b-uniform-mixture-fabricated` | 400 | 6 | 2 | row-grouped | 1200, 1200 | 1200 | **499** |
| `13-vfstest-cellcountest` | 120 | 4 | 1 | — | 480 | — | never reached |
| `14-crctest-survey` | 80 | 6 | 1 | — | 480 | — | never reached |
| `15-missing-carlisle` | 160 | 6 | 2 | row-grouped | 458, 428 | 458 | **999** |
| `16-densitometry-carlisle-overbalanced` | 60 | 18 | 3 | column-grouped | 360, 360, 360 | 360 | **999** |
| `17-densitometry-carlisle-clean` | 60 | 18 | 3 | column-grouped | 360, 360, 360 | 360 | **999** |
| `19-inheritance-fabricated` | 1200 | 1 | 2 | row-grouped | 600, 600 | 600 | **999** |
| `20-bimodal-fab` | 300 | 8 | 2 | row-grouped | 1200, 1200 | 1200 | **499** |
| `21-localised-ar` | 400 | 8 | 2 | row-grouped | 1600, 1600 | 1600 | **499** |
| `22-covariance-block` | 400 | 7 | 2 | row-grouped | 1400, 1400 | 1400 | **499** |
| `23-recurrence-null-mixed` | 120 | 3 | 1 | — | 360 | — | never reached |
| `24-recurrence-null-control` | 120 | 3 | 1 | — | 360 | — | never reached |
| `vfs-a-pigeonhole-clear` | 180 | 2 | 1 | — | 360 | — | never reached |
| `vfs-b-recurrence-high` | 120 | 2 | 1 | — | 240 | — | never reached |
| `vfs-c-deeptail-high` | 180 | 2 | 1 | — | 360 | — | never reached |

**Tally.**

- `B = 999` — **8** fixtures.
- `B = 499` — **8** fixtures.
- `B = 199` — **0** fixtures.
- Branch never reached, one condition only — **11** fixtures. The engine's dispatch guard at
  `engine.js:486` returns N/A before the test is called, so `maxN` is never computed. The test carries
  its own equivalent guard at `crossConditionConsistency.js:161`.

**Cross-check against the engine.** Of the 16 fixtures with two or more conditions, 9 are withheld by
the paired-design skip before anything is computed, so the engine reports no `B` for them. On the
remaining 7 the engine's own `r.B` was read from a full `runFullAnalysis` run and matches the census
on every one: `12a` 499, `12b` 499, `15` 999, `19` 999, `20` 499, `21` 499, `22` 499. The census is a
reimplementation, so this is the check that it reimplements the right thing.

**Reach, stated plainly.** Only 7 of 27 fixtures ever compute a `B` in the shipped engine. Eleven stop
at the condition-count guard, nine more at the paired skip.

**Where the two branches separate.** The split at 1,000 values falls between `15-missing-carlisle`
(458) and `09-proteomics-clean` (1,200). Nothing in the corpus sits near it. The distance to the second
split is much larger: the highest fixture is `11-rnaseq-multicondition` at 2,000, one fifth of the way
to 10,000.

---

## Part 3 — what each branch can reach

### The floor

The raw floor is `2/(B+1)`. `bhFDR` is a step-up with monotonicity enforcement, so the smallest
adjusted p a family can report equals the raw floor when every member sits there, and `(m/j)` times it
otherwise — `j` being how many members tie at the reported rank. Stage 1 on a two-condition file has
`m = 3`: three pool properties on one pair.

| branch | raw floor `2/(B+1)` | best case, whole family at the floor | one unit at the floor (`m = 3`, `j = 1`) |
|---|---|---|---|
| `B = 999` | 0.002 | 0.002 → **MODERATE** | 0.006 → **MODERATE** |
| `B = 499` | 0.004 | 0.004 → **MODERATE** | 0.012 → **LOW** |
| `B = 199` | 0.010 | 0.010 → **LOW** | 0.030 → **LOW** |

`m = 3` is the smallest Stage-1 family the test can have. `stage1Units` holds one unit per property ×
pair, so a three-condition file has three pairs and `m = 9`, and the rightmost column gets three times
worse. The table is the best case for `m`, not the typical one.

### Which branches can flag

- **`B = 999` reaches MODERATE, and reaches it in the ordinary case.** Even with a single unit at the
  floor the reported value is 0.006, comfortably under 0.01.
- **`B = 499` reaches MODERATE only when at least two of the three units tie at the floor.** With one
  unit at the floor the reported value is 0.012 and the test returns LOW. This is the correction to
  expectation 3: the middle branch is not floor-blocked, but it is blocked in the single-signal case,
  which is the common one.
- **`B = 199` cannot flag at any effect size.** The floor is 0.010 and `flagFromP` needs strictly less
  than 0.01. There is no arrangement of exceedance counts that clears it.

**HIGH is unreachable on all three branches.** It needs `2/(B+1) < 0.001`, so `B ≥ 2000`, and the rule
emits nothing above 999.

### Which fixtures sit in a branch that cannot flag

**None.** The 199 branch is empty on this corpus. The nearest fixture, `11-rnaseq-multicondition`, is
at 2,000 values against a threshold of 10,000.

### P71, restated

The current wording — "CCC locked to LOW above 10,000 rows" — names the right behaviour and the wrong
quantity. The threshold is 10,000 **values in the largest condition**. Two things follow.

**A single row number cannot state it.** The row equivalent is `10,000 ÷ (columns in the condition's
sub-matrix)`, and the corpus's per-condition widths run from 1 to 8:

| columns in the condition | corpus example | rows in the largest condition that reach `B = 199` | rows in the largest condition that reach `B = 499` |
|---|---|---:|---:|
| 1 | `19-inheritance-fabricated` | more than 10,000 | more than 1,000 |
| 6 | `09-proteomics-clean`, `15-missing-carlisle` | more than 1,667 | more than 167 |
| 8 | `20-bimodal-fab`, `21-localised-ar` | more than 1,250 | more than 125 |

**And it is rows in the largest condition, not rows in the file.** A two-condition file with an even
split needs roughly twice these numbers overall. On a six-replicate, two-condition deposit that is
about 3,300 file rows, not 10,000.

A wording that survives both corrections:

> Cross-Condition Consistency cannot flag at any effect size once the largest condition holds more
> than 10,000 non-null values. On a six-replicate file that is about 1,667 rows in that condition —
> roughly 3,300 rows in an evenly split two-condition file. No fixture in the corpus reaches it; the
> highest is `11-rnaseq-multicondition` at 2,000 values.

**The corpus is still blind to P71.** The middle branch being occupied does not change that: the
middle branch can flag, and P71 is about the branch that cannot. What *has* changed is the size of the
file needed to exercise it — a large clean fixture built to test P71 needs about 1,700 rows per
condition at six replicates, not 10,000.

---

## Part 4 — the general case

Every site in the battery that picks a resample or simulation count from a property of the data.

| test | file:line | quantity | what it counts | thresholds → counts |
|---|---|---|---|---|
| Blocked Mahalanobis | `blockedMahalanobis.js:510` | `max(ws.N)` at `:509`; `ws.N = ws.rows.length` (`:475-478`) | rows in the largest condition's complete-row set | `≤ 500` → 4999, else 999 |
| Constant-Offset Blocks | `constantOffset.js:173` | `nR = matrix.length` (`:31`) | rows in the whole matrix | `> 10000` → 199, `> 1000` → 499, else 999 |
| **Cross-Condition Consistency** | `crossConditionConsistency.js:167` | `max(conditionN)` (`:142`) | **finite values in the largest condition** | `≤ 1000` → 999, `≤ 10000` → 499, else 199 |
| Inter-Replicate Correlation | `interReplicateCorrelation.js:245` | `max(sp.n)`; `n = rv.aVals.length` (`:183`) | rows where the replicate pair is complete, largest pair | `≤ 100` → 999, `≤ 1000` → 499, else 199 |
| LOESS Residual Analysis | `loessResidual.js:179` | `validRows.length` (`:43`) | rows with at least two usable values | `≤ 100` → 4999, else 499 |
| Regional Noise Homogeneity | `regionalNoise.js:148` | `validRows.length` (`:54`) | rows complete across all columns | `≤ 100` → 4999, else 499 |
| Runs Test | `runs.js:224` | `max(s.diffs.length)` over scan sequences (`:165`) | rows where the pair is complete, longest sequence | `≤ 100` → 999, `≤ 1000` → 499, else 199 |
| Windowed Autocorrelation | `windowedAutocorrelation.js:87` | `nR = matrix.length` (`:78`) | rows in the whole matrix | `≤ 500` → 999, `≤ 5000` → 499, else 199 |

**Eight sites, and CCC is not alone in scaling.** It is alone in what it scales on. The other seven
all count rows: whole-matrix rows, per-condition rows, per-pair complete rows, or usable rows. CCC is
the only one whose count multiplies by the file's width.

For completeness, the counts that do **not** vary with the data:

| test | file:line | count |
|---|---|---|
| Benford's Law (First Digit) | `benford.js:56` | 5000 |
| Benford's Law (Second Digit) | `benford2.js:88` | 5000 |
| Column Goodness-of-Fit | `columnGof.js:48` | 2000 |
| Entropy / Zipf Analysis | `entropyTest.js:37` | 999 |
| Excess Kurtosis | `kurtosis.js:167` | 1999 |
| LOESS Residual Analysis, per-pair arm | `loessResidual.js:357` | 499 |
| Residual Spike Correlation | `residualSpikeCorrelation.js:113` | 999 |

Two footnotes on that list. LOESS carries one count of each kind — its scan count scales, its per-pair
count does not. And Excess Kurtosis holds `N_SIM` fixed but subsamples to 500 rows per batch above 500
valid rows, so its work varies with the data even though its count does not.

---

## Riders

1. **`detectVST` returns a decision, not a matrix.** Its return carries `transform` and `reason` and
   no `hasVST` flag and no transformed matrix; `engine.js:293-303` builds both itself. A probe that
   reads `vst.hasVST` gets `undefined` and silently measures the raw matrix. The first version of the
   census here did exactly that. It was caught before reporting and the corrected probe returns
   identical numbers on all 27 fixtures, because no fixture loses a value under its own transform —
   but on a file with non-positive cells under `log` the two would differ, and the failure is silent.

2. **Layout decides the row equivalent, and for column-grouped files the width is columns per group,
   not data columns.** `16-densitometry-carlisle-clean` has 18 data columns but three groups of six,
   so its condition holds 60 × 6 = 360 values. Reading its width as 18 would understate the row
   equivalent threefold.

3. **Main is not at the S356 promote.** `git worktree list` puts main at `4248cd5`; the S356 report
   commit `0a3ad47` is still on `claude/prompt-permutation-feasibility-2e3e0e` and unmerged. This
   report sits on top of it on the same branch, so one promote carries both.

---

## Reproduction

The census reproduces `crossConditionConsistency.js:134-142` over each fixture through
`validate-batch.mjs`'s import pipeline, then applies `validateMatrix` and the VST construction from
`engine.js:293-303`. The cross-check reads `r.B` off a full `runFullAnalysis` run. Neither probe was
kept — both were scratch, and the numbers they produce are recoverable from the quoted source plus the
fixture shapes in the Part 2 table. The one figure that needs the engine is the `r.B` cross-check, and
`r.B` is on the result object of any run.

## Gate

- **No batch.** Nothing in `src/` changed, so no verdict can move and a batch would only re-report the
  known `4248cd5` state.
- No preview and no screenshots — no rendering surface.
