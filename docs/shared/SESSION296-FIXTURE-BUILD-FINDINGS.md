# Session 296 — §2.6 fix-verification fixture: build stopped, findings

**Status: stopped and reporting, per the build prompt's own rule.** The fixture columns were built and probed through the engine pipeline. One of the three carrier mechanisms did not reproduce, and the single-column control cannot be processed by the import pipeline at all. The prompt directed: if a carrier does not reproduce, stop and report rather than tune the fixture or touch the engine — a mismatch is a design finding, not a fixture tweak. Two carriers reproduced cleanly; two blockers need a Chat design pass before the fixture can land. No manifest entry was written. The 23-fixture batch remains 23/23 (the two draft CSVs are inert — not in the manifest).

The two draft CSVs are committed to this worktree branch for inspection (`test/fixtures/23-recurrence-null-mixed.csv`, `test/fixtures/24-recurrence-null-control.csv`); they are provisional and should not promote to main until the design questions below are settled. The deterministic generator recipe is at the end of this doc.

---

## What reproduced

**Carrier 1 — the axis-2 recurrence suppression (recur → Duplicate Detection LOW). Reproduced.** On the mixed multi-column file, Exact Duplicate Detection returns LOW with `primaryP = 1` and all four sub-channel p-values at 1.0 (`_rawPs = [collision 1, rowDup 1, withinRow 1, block 1]`). Collision count 228 against 114960 pairs, `p1 = 4.06e-3` (empirical HHI). This is exactly the circularity the axis-2 fix targets, and it is broader than the collision channel alone: the row-duplication and block-copy nulls also multiply by the empirical HHI (`pMatchRow *= hhi` at `duplicateDetection.js:633`; `pRow *= wrColHHI[c]` at `:673`), so the structured recurrence inflates every DupDet sub-test's null and suppresses all four. The current engine rates the structured recurrence LOW; the fixed null must rate it HIGH. This is the column the held fixture exists to carry, and it behaves as the pre-build read predicted.

**Carrier 2 — the Benford span-borrowing false positive (Benford First Digit → HIGH). Reproduced.** On the mixed file, Benford's Law (First Digit) fires HIGH at `p = 0`. The `recur` column alone spans only 0.16 orders of magnitude (all values in `[20.22, 28.96]`, every leading digit 2) and individually fails Benford's 1.5-orders-of-magnitude span gate (`benford.js:25`), so on its own it would return N/A. Pooled with the wide column (2.6 orders of magnitude), the pool clears the span gate and Benford then reads the recur column's concentrated leading-2 excess as a first-digit anomaly. This mirrors the CORPUS-03 `[SL, Total.distance]` span-borrowing that fired Benford HIGH on real data.

## What did not reproduce, and why

**Carrier 3 — the Decimal-Precision false positive (predicted HIGH, observed LOW). Did not reproduce.** On the mixed file, Decimal Precision Consistency returns LOW with `p = 1`. The reason is structural, not a tuning miss. The test is a one-tailed *deficit* test: under a single-instrument model with true precision K equal to the maximum decimal places seen, trailing-zero stripping predicts a geometric fraction of values at each lower precision level (`P(j) = (1/10)^(K-j) x (9/10)`), and it flags when the observed count at an intermediate level is significantly *lower* than that model predicts (`decimalPrecision.js`, the trailing-zero binomial model, active only when `maxDp > 1 && nDistinct > 1`). The mixed fixture pools columns at 1, 2 and 3 decimals with large blocks at each — 120 values at 1 decimal (precA), 120 at 2 decimals (recur), 240 at 3 decimals (precB and wide). With K = 3 the model expects roughly 0.9% of values at 1 decimal and 9% at 2 decimals; the fixture instead has a large *surplus* at both low levels. A deficit test does not fire on a surplus, so simply mixing precisions across columns does not trip it. The CORPUS-03 decimal-precision firing (which was MODERATE, not HIGH — see the note below) must arise from an actual deficit signature, not from precision heterogeneity per se. Reproducing it needs a column whose precision distribution has a genuine cliff (for example values recorded to a fixed number of decimals with no trailing-zero decay, so intermediate levels are deficient relative to the stripping model), which is a design decision about the column's construction, not a value tweak.

**A correction to the target tiers.** The build prompt and pre-build read described the axis-1 false positives as Decimal-Precision "fires HIGH." The actual CORPUS-03 engine run rates Decimal Precision MODERATE (`p = 0.00167`), not HIGH, and rates both Benford First and Second Digit HIGH (`p = 0`). So the axis-1 target set on real data is Benford First HIGH, Benford Second HIGH, Decimal Precision MODERATE — worth reconciling into whatever ground truth the fixture eventually asserts.

## The second blocker — the single-column control cannot be processed

**File 2 as specified (a single `recur` column) is stripped to zero rows by the importer.** `preprocessRaw` sets `minCells = Math.max(3, ceil(maxC * 0.1))` (`parser.js:28`) and treats any row with fewer than `minCells` filled cells as sparse, trimming leading and trailing sparse rows. For a single-column file `maxC = 1`, so `minCells = 3`, so every one-cell row is sparse and the whole file trims to zero rows before analysis. A one-column (or two-column) fixture cannot exist in this suite — the import floor is three columns per row. The control's stated purpose (isolate the axis-2 null from the multi-column dispatch by removing every other column) is therefore not achievable as a single-column CSV. Any control has to carry at least three columns, which reintroduces some multi-column dispatch — so the control's design needs a Chat pass to decide how to isolate the recurrence null within a three-column-minimum file (for example two inert filler columns whose values are unique per row so they cannot themselves duplicate, which is close to what the mixed file already does).

## Collateral firing on the mixed file (context, not necessarily a defect)

The mixed file also fires Value-Frequency Spike HIGH, Noise Scaling with Measurement Size HIGH, Selective Noise Partitioning HIGH, Entropy MODERATE and Column Goodness-of-Fit MODERATE, lifting its severity to 3. This is because the engine reads the four columns as replicate measurements of one quantity, and four unrelated columns at four different scales look like heterogeneous, variance-mismatched, spiky replicates. It is worth noting that CORPUS-03 itself fires this same broad set (Selective Noise HIGH, Noise Scaling MODERATE, Value-Frequency Spike HIGH, Entropy MODERATE, Column Goodness-of-Fit MODERATE, and more), so the collateral is not obviously a fixture defect — it mirrors how the real messy dataset behaves. But it does mean the fixture is not a clean minimal carrier of only the three intended mechanisms, and the held entry's report would show a wide firing set. Whether that is acceptable or the columns should be made to look like genuine replicates (to quiet the Dim III tests) is a design choice for Chat.

## What a design pass has to settle

1. **Decimal-Precision carrier.** Build the precision column as a genuine deficit signature (a cliff in the precision distribution), not merely mixed precisions across columns, or drop the Decimal-Precision false positive from this fixture's scope and let it ride a separate construction. On current evidence, mixed precision alone does not trip the deficit test.
2. **Control fixture shape.** A single-column control is impossible (three-column import floor). Decide the minimal multi-column control that still isolates the recurrence null.
3. **Target tiers.** Reconcile the axis-1 targets to the real CORPUS-03 tiers: Benford First HIGH, Benford Second HIGH, Decimal Precision MODERATE.
4. **Collateral scope.** Decide whether the mixed file's broad Dim III firing is acceptable for a held fixture or the columns should be shaped to read as clean replicates.

Carriers 1 and 2 are solid and can be reused as-is once the above are settled.

---

## Reproduction recipe (deterministic)

Both CSVs were generated with a seeded Mulberry32 PRNG (seed `0x2960001`), N = 120, over the CORPUS-03 SL range `[20.22, 28.96]`.

- **recur** (both files): 5 values `[21.34, 22.87, 23.51, 25.09, 26.78]` each repeated 10 times, plus 70 distinct 2-decimal draws from `N(22.907, 1.726)` clipped to the range and de-duplicated; the 120 values are shuffled so no identical rows are contiguous. All leading digit 2. This is Shape B from the pre-build read (5x10 concentrated recurrence).
- **wide** (mixed file): `10^uniform(log10(3), log10(1300))`, 3 decimals — 2.6 orders of magnitude, lends Benford its span.
- **precA** (mixed file): `uniform(15, 480)`, 1 decimal.
- **precB** (mixed file): `uniform(0.1, 95)`, 3 decimals.

Per-column decimal formatting is exact (`toFixed(1/2/3)`) because Decimal Precision reads raw strings and counts trailing decimals.
