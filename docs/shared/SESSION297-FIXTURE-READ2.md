# Session 297 — §2.6 fixture second pre-build read

Read-only. No source changed, no fixture written, no batch touched. This settles the three source questions the Session 296 build stopped on, so the rebuild prompt can be surgical. Measurements come from a throwaway probe (`probe-s297.mjs` / `probe-s297-corpus.mjs`, worktree-local, not committed to src) that mirrors the batch pipeline: it parses the draft columns, runs the full analysis engine on chosen column subsets, and reads the same result fields the batch harness reads.

The two working carriers from the Session 296 build (`recur` → Duplicate Detection LOW; `recur`+`wide` → Benford span-borrowing HIGH) were not re-measured — they are correct on the branch.

---

## Question 1 — the Decimal-Precision deficit trip threshold, and whether it is the right carrier

### 1a. The exact trip condition

The test is `testDecimalPrecision` in `src/tests/decimalPrecision.js`. It pools every decimal-bearing value across all columns into one precision histogram (`vals = rawMatrix.flat()`, then counts trailing decimals per value). The model assumes a single instrument at precision K = the maximum decimal places seen, and predicts what fraction of values trailing-zero stripping would leave at each lower level:

```
// decimalPrecision.js:60-69
if (maxDp > 1 && nDistinct > 1) {
  for (let j = 1; j < maxDp; j++) {
    const expectedP = Math.pow(0.1, maxDp - j) * 0.9;   // P(apparent = j) under stripping
    const observed = prec[j] || 0;
    const expectedCount = expectedP * total;
    const p = observed >= total ? 1.0 : regIncBeta(total - observed, observed + 1, 1 - expectedP);
    perLevel.push({ dp: j, observed, expected: ..., expectedP, p });
  }
}
```

`p` is the one-tailed binomial **deficit** probability P(X ≤ observed | n = total, p = expectedP) at each intermediate level j (1 ≤ j < K). It is small only when the observed count at level j is *lower* than the model's expectation `expectedP × total`. BH-FDR is applied across the per-level p-values and `primaryP = min(adjusted)` (`:76-82`); `flag = flagFromP(primaryP)`. So MODERATE and HIGH are both reached the same way — a level whose adjusted deficit p crosses the shared `flagFromP` ladder — the only difference is how far below expectation the observed count sits. There is no separate MODERATE-vs-HIGH rule inside the test; the tier is whatever `flagFromP` returns for the smallest adjusted deficit p.

The comparison site that matters is the single line `const p = ... regIncBeta(total - observed, observed + 1, 1 - expectedP)`: this is the lower-tail binomial, and it is why a **surplus** at a level never fires (a surplus makes `observed` large, so P(X ≤ observed) → 1). This is exactly what defeated the Session 296 mixed file — every intermediate level was over-populated.

### 1b. What a triggering column pool looks like

The decisive measurement is on CORPUS-03 itself. Running `testDecimalPrecision` on its two data columns (`SL`, `Total.distance`), pooled versus each alone:

```
SL precision histogram:             { 1: 48,  2: 325 }                 (maxDp 2)
Total.distance histogram:           { 1: 2, 2: 39, 3: 280, 4: 42, 5: 10 }  (maxDp 5)

POOLED (SL + Total.distance):  MODERATE  p = 0.001665  maxDp = 5, total = 746
   dp=4  observed 42   expected 67.1   adjP = 1.665e-3   ← the deficit that fires
PER-COLUMN SL:                 LOW  p = 0.995
PER-COLUMN Total.distance:     LOW  p = 1.0   (dp=4 observed 42 vs expected 33.6 — a surplus)
```

So the triggering shape is not a single-column cliff. It is a **pooling artifact**: a high-precision column (`Total.distance`, maxDp 5) whose count at level maxDp−1 is genuine but modest (42 values at 4dp), pooled with a large lower-precision column (`SL`, all ≤ 2dp, 373 values) that roughly doubles the pooled `total` **without adding anything at the top levels**. Doubling `total` doubles the model's expected count at every level (dp=4 expectation goes 33.6 → 67.1), so a level that was a surplus in the high-precision column alone becomes a deficit in the pool. `SL` alone and `Total.distance` alone are both LOW; only the pool fires.

To reproduce: pool a high-maxDp column (values naturally reaching, say, 4–5 decimals, with a modest count at the level just below the max) with a much larger block of low-precision values (1–2 decimals) that contribute nothing to the high levels. The deficit lands at the (maxDp−1) level and the tier follows how far the observed count falls below `0.09 × total`.

### 1c. Is this the right axis-1 carrier? — Yes.

The pre-build intent was that the Decimal-Precision firing mirror the pooling artifact the axis-1 guard targets (unrelated columns falsely unified into one distribution). The measurement confirms it directly: CORPUS-03's MODERATE **is** a pooling artifact — neither `SL` nor `Total.distance` fires alone, and the firing exists only because `testDecimalPrecision` flattens both columns into a single histogram and the low-precision column inflates the shared `total`. This is the false unification, not a within-column defect. The carrier is testing the right thing.

Two corrections this settles for the rebuild:

- The Session 296 findings framed the fix as needing "a column with a genuine precision cliff." That is one way, but the faithful reproduction of CORPUS-03 is a **two-column pooling** construction (different native precisions), not a single engineered column.
- `recur` is a 2dp column, so it is compatible with — even reinforcing of — a Decimal-Precision cliff placed at a higher level. If the high-precision carrier reaches maxDp 4 or 5 with a modest count at maxDp−1, `recur`'s 120 2dp values inflate `total` (deepening the deficit at the high level) without touching it. The two carriers do not fight; the Session 296 mixed file failed only because its maxDp was 3 and `recur` filled the sole intermediate level (dp 2) to a surplus.

---

## Question 2 — a three-column control with Duplicate-Detection-inert fillers

### 2a. What a filler column must have to leave the four channels intact

`testDuplicates` combines four sub-tests by BH-FDR (`duplicateDetection.js:692-695`). Reading each channel's dependency on a filler column:

- **Collision (Test 1).** Null `p1` is the empirical HHI over all pooled cells for continuous data (`hhi = Σ (freq/N)²`, `:55`, `:136`); observed is the same-value pair count (`:168-173`). A filler with **distinct values within the column** adds no same-value pairs, so it does not raise the observed count. It does lower the pooled HHI, but only the reduction matters if it drops `p1` far enough that expected collisions fall below observed — measured below, it does not.
- **Row duplication (Test 2).** `pMatchRow = Π_c HHI_c` and the observed count `nRowDups` needs whole-row identity (`:621-638`). A filler whose values are unique per row makes that column's HHI ≈ 1/N and guarantees no identical rows, so `nRowDups = 0` → `rowDupPValueAdj = 1` (`:638`). Inert.
- **Within-row coincidence (Test 3).** Counts equal values sitting in two columns of the same row (`:232-233`). A filler whose value range is **disjoint from `recur`'s** (a different magnitude band) can never match `recur` within a row, and being disjoint from the other filler too means no cross-filler matches → `withinRowP = 1`. Inert.
- **Block copy (Test 4).** Needs contiguous identical row-blocks or column segments (`:342-543`). Unique per-row filler values produce no repeated blocks → `bestBlockP = 1`. Inert.

So the required filler property is: **values distinct within the column (no repeats) and lying in a magnitude band disjoint from `recur`.** That is exactly the "unique per row" shape the Session 296 findings already guessed at, and the source confirms it is sufficient for all four channels.

### 2b. Two such fillers coexist with `recur` — measured

Control candidate `[recur, filler1, filler2]`, both fillers distinct 2dp draws over `recur`'s own `[20.22, 28.96]` band (so they read as same-scale replicates):

```
recur + 2 same-scale distinct fillers:  DupDet LOW  primaryP = 1
   _rawPs = [collision 1, rowDup 1, withinRow 1, block 1]   collObs = 274   p1 = 7.01e-3
```

Duplicate Detection stays LOW, and all four sub-channels sit at p = 1 — the suppression is intact and the fillers add no signal of their own. `collObs = 274` is `recur`'s own recurrence pairs; the collision p stays 1 because the empirical HHI (`p1`) predicts more collisions than observed (expected ≈ C(360,2) × 7.01e-3 ≈ 453 > 274). That self-inflated null is precisely the axis-2 circularity the fixture exists to isolate, and the control shows it operating with `recur` present. A no-`recur` version (three same-scale fillers) also holds DupDet LOW with `collObs = 43`, confirming the fillers contribute nothing.

So a three-column control **does** exist: `recur` plus two distinct-value, same-band fillers isolates the recurrence null (DupDet LOW driven by `recur`'s HHI inflation, not by the multi-column dispatch), and the fillers are inert on every DupDet channel. The single-column impossibility (import floor `minCells = max(3, …)`, `parser.js:28`) is worked around exactly as the Session 296 findings anticipated.

### 2c. The caveat that makes this a partial finding

The control isolates the DupDet null cleanly, but it is **not collateral-free**: the same run fires Value-Frequency Spike HIGH and Entropy / Column-Goodness-of-Fit MODERATE. Those are `recur`'s own intrinsic shadow (Question 3), not the fillers' doing — they appear in every configuration that contains `recur` and vanish the moment it is removed. My probe's fillers also raised a stray Runs / Kurtosis MODERATE, but that is an artifact of the uniform LCG draw I used, not a property of the control concept; a distribution-matched, shuffled filler quiets it. The control's allow-set therefore has to declare `recur`'s intrinsic collateral (VFS / Entropy / ColGoF), the same way the mixed file will (Question 3). The control isolates the *dispatch* variable, not the *collateral* variable.

---

## Question 3 — surgical-collateral feasibility

### 3a. Collateral attribution (measured, leave-one-out on the mixed file)

Baseline mixed `[recur, wide, precA, precB]` fires, beyond the carriers: VFS HIGH, Noise Scaling HIGH, Selective Noise HIGH, Entropy MODERATE, Column-Goodness-of-Fit MODERATE. Dropping each column in turn, and swapping the scale-spread fillers for same-band ones, attributes them:

| Collateral firing | Driver (measured) | Class |
| --- | --- | --- |
| Value-Frequency Spike HIGH | `recur`. VFS `drivingPass = digit`; the spikes are `.51 / .09 / .78 / .87 / .34` — the 2-decimal endings of `recur`'s five repeated values (23.51, 25.09, 26.78, 22.87, 21.34), each ×10. Vanishes on drop-`recur`. | Intrinsic to `recur` |
| Entropy / Zipf MODERATE | `recur`'s low-entropy concentrated column. Vanishes on drop-`recur`; present with any fillers. | Intrinsic to `recur` |
| Column Goodness-of-Fit MODERATE | `recur`. `colRatios` flags column 1 only, A² = 1.84 vs null median 0.35 (5.3× — normal-fit shape mismatch from the 5×10 recurrence). Vanishes on drop-`recur`. | Intrinsic to `recur` |
| Selective Noise Partitioning HIGH | Variance spread across columns. `colDetails` residual-std: `recur` 0.58 (low), `wide` 1.35 (high) → maxMin ratio 5.36 drives the Bartlett. Goes LOW with same-band fillers; HIGH whenever a wide-span column is present. | Coupled to the Benford span column |
| Noise Scaling with Measurement Size HIGH | Mean–variance slope across the four different-scale columns. Needs several scale tiers — quiet in `recur + wide + one filler` (only two tiers). | Coupled to multi-tier scale spread |

### 3b. A fully surgical construction does not exist — finding

Two of the three carriers cast collateral that cannot be reshaped away while the carrier is present:

- **`recur` necessarily fires VFS HIGH + Entropy MODERATE + Column-GoF MODERATE.** These are the digit and distribution shadow of a concentrated 2dp recurrence. They appear in the control, in the mixed file, and in every `recur` configuration measured; they disappear only when `recur` is deleted — i.e. only when the axis-2 defect the fixture exists to carry is removed. This confirms the S295 axis-2 prediction (the recurrence has a digit shadow) and extends it to Entropy and Column-GoF.
- **The Benford carrier necessarily fires Selective Noise HIGH.** Benford span-borrowing needs a column of ≥ 1.5 orders of magnitude (`benford.js` span gate); any column with that span is a variance outlier against `recur` and the same-band fillers, which is exactly what trips Selective Noise's Bartlett. Measured: `recur + wide + one filler` still fires Selective Noise HIGH. The span that makes Benford fire and the variance outlier that makes Selective Noise fire are the same column property.

Noise Scaling is the one genuinely removable collateral — it needs several scale tiers and goes quiet with two — but removing it does not buy a surgical fixture, because VFS / Entropy / ColGoF / Selective Noise remain.

So "surgical" in the zero-collateral sense is **not achievable** for this fixture. The cleanest construction that still carries all three verdicts (`recur` for DupDet LOW, a wide-span column for Benford HIGH, a pooled precision cliff for Decimal-Precision MODERATE) will also fire, at minimum: VFS HIGH, Entropy MODERATE, Column-GoF MODERATE, Selective Noise HIGH. That is four declared collateral firings — very close to the set CORPUS-03 itself fires, which is consistent with the fixture faithfully reproducing the real dataset's behaviour.

### 3c. Consequence for policy

Per the build prompt's own item 3: because the collateral is intrinsic (VFS / Entropy / ColGoF to `recur`) and coupled (Selective Noise to the Benford span carrier), the fixture must **declare** that collateral in its allow-set through the `ACKNOWLEDGED` mechanism rather than suppress it. This reshapes the "surgical" policy Chat locked. Chat has to choose between:

1. **Accept declared collateral.** Keep the mixed carrier and list VFS / Entropy / ColGoF / Selective Noise (and possibly Noise Scaling) in `ACKNOWLEDGED[file]` with the reason that they are the intrinsic shadow of the recurrence and the span carrier. The fixture then asserts three carrier verdicts plus a named, reasoned collateral set — the same discipline the batch already uses for CORPUS-like fixtures.
2. **Split the carriers across separate fixtures.** Even this does not deliver zero collateral: a `recur`-only fixture (the Question 2 control) still fires VFS / Entropy / ColGoF, because those are `recur`'s own shadow. Splitting only removes the Benford-coupled Selective Noise from the DupDet fixture; it cannot make any fixture containing `recur` collateral-free.

There is no third option that keeps the recurrence defect and produces no Dimension-III collateral.

---

## Closing — is the rebuild fully specifiable?

- **Question 1 (Decimal-Precision carrier): fully specifiable.** The trip condition is the intermediate-level binomial deficit; CORPUS-03's MODERATE is confirmed a pooling artifact, so the carrier is correct; the reproduction is a two-column pooling construction (high-maxDp column + large low-precision block inflating the total), and it is compatible with `recur`.
- **Question 2 (control shape): fully specifiable.** `recur` plus two distinct-value, same-band fillers isolates the DupDet recurrence null; all four DupDet channels stay inert to the fillers. The control's allow-set must declare `recur`'s intrinsic collateral.
- **Question 3 (surgical collateral): returns a finding that needs a Chat design pass.** A zero-collateral fixture is impossible while the carriers are present — VFS / Entropy / Column-GoF are intrinsic to `recur`, and Selective Noise is coupled to the Benford span column. Chat must decide whether to accept a declared collateral set (`ACKNOWLEDGED`) or to split the carriers (which still cannot remove `recur`'s own shadow). This is a policy decision, not a measurement gap.

The rebuild is buildable on Questions 1 and 2 as soon as Question 3's collateral policy is decided. The one design decision outstanding is that policy choice.
