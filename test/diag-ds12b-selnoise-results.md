# DS12b Selective Noise Diagnostic — Results

**Date:** 2026-03-26
**Dataset:** `test/fixtures/12b-uniform-mixture-fabricated.csv`
**Issue:** SelNoise reports HIGH (p=1.37e-6), ground truth expects LOW
**Script:** `test/diag-ds12b-selnoise.mjs`

---

## Q1: Import Pipeline

- **Headers:** sample_id, condition, rep1, rep2, rep3, rep4, rep5, rep6
- **Rows:** 400 (200 Genuine + 200 Fabricated)
- **Roles:** sample_id=label, condition=condition, rep1-rep6=data
- **DATA columns:** 6 (rep1 through rep6)
- **CONDITION column:** 1 (condition)
- **Matrix dimensions:** 400 x 6
- **condCtx.type:** row-grouped
- **condCtx.paired:** false
- **condCtx.count:** 2 (Genuine, Fabricated)

## Q2: SelNoise Input Matrix

SelNoise receives the **full 400 x 6 matrix** (both conditions pooled).

Routing: `condCtx.type === 'row-grouped'` so `useAggregate = false`. The `runPairVST(testSelectiveNoise)` call passes no `parentCondCtx`, so `runPair` calls `testSelectiveNoise(matrix, null)` — a single call on the full pooled matrix.

SelNoise is **not** condition-aware and does **not** split by row conditions.

## Q3: Per-Column Residual Variances (Full Pooled Matrix)

| Column | Residual Variance | Residual SD |
|--------|-------------------|-------------|
| rep1   | 53.968            | 7.346       |
| rep2   | 42.730            | 6.537       |
| rep3   | 73.592            | 8.579       |
| rep4   | 61.699            | 7.855       |
| rep5   | 52.875            | 7.272       |
| rep6   | 48.163            | 6.940       |

**Max/min variance ratio: 1.722** (rep3 / rep2)

## Q4: Bartlett Test Result

- **chi-squared:** 36.737 (df=5)
- **p-value:** 1.37e-6
- **Flag:** HIGH
- **Variance ratio:** 1.722

The effect-size gate (ratio >= 3.0 at N >= 500) does NOT activate because N=400 < 500.

## Q5: Per-Condition Split

### Genuine (200 rows)

| Column | Residual Variance | Residual SD |
|--------|-------------------|-------------|
| rep1   | 51.807            | 7.198       |
| rep2   | 28.424            | 5.331       |
| rep3   | 65.250            | 8.078       |
| rep4   | 50.342            | 7.095       |
| rep5   | 30.527            | 5.525       |
| rep6   | 26.502            | 5.148       |

**Max/min ratio: 2.462** (rep3 / rep6)
**Bartlett chi-squared:** 71.226, **p:** ~0, **Flag:** HIGH

### Fabricated (200 rows)

| Column | Residual Variance | Residual SD |
|--------|-------------------|-------------|
| rep1   | 56.366            | 7.508       |
| rep2   | 57.154            | 7.560       |
| rep3   | 82.238            | 9.069       |
| rep4   | 73.220            | 8.557       |
| rep5   | 75.243            | 8.674       |
| rep6   | 69.826            | 8.356       |

**Max/min ratio: 1.459** (rep3 / rep1)
**Bartlett chi-squared:** 11.497, **p:** 0.042, **Flag:** LOW

## Q6: Engine Routing

- SelNoise call: `runPairVST(testSelectiveNoise)` (engine.js line 241)
- No `parentCondCtx` argument passed
- `useAggregate = false` because condCtx.type is `row-grouped` (not `column-grouped`)
- Result: `testSelectiveNoise(matrix)` called **once** on the **full 400-row pooled matrix**
- SelNoise is **not** routed through conditionContext at all

---

## Root Cause Analysis

The SelNoise false positive on the pooled matrix is **NOT caused by pooling** itself. The pooled vs per-condition residual variances are nearly identical (diff < 0.15 per column), confirming that mixing two conditions with similar means does not create a Simpson's-paradox artifact.

**The real issue: the Genuine condition alone has genuine column variance heterogeneity.**

The generator uses `base * exp(0.18 * randn())` for Genuine noise. This is **multiplicative log-normal noise**, where the residual variance (after subtracting row means) scales with the base mean. However, the row means are computed from all 6 replicates — and with only 6 draws from a log-normal, the sample mean is a noisy estimator. The key insight:

The 200 shared base values (drawn from `exp(3.0 + 0.8*randn())`) are the same for both conditions. Each Genuine row draws 6 log-normal replicates. Due to the **multiplicative** noise model `base * exp(0.18 * N(0,1))`, the residual variance after subtracting the row mean is proportional to base^2. With only 200 rows, random variation in which base values happen to produce extreme residuals in which columns creates **real column-level variance heterogeneity** — Genuine alone shows max/min ratio = 2.46 and Bartlett p essentially 0.

The Fabricated condition's uniform noise U(0.6*base, 1.4*base) also has variance proportional to base^2, but the uniform distribution's bounded support means extreme outliers are impossible, so the per-column variance is more stable (ratio = 1.46, p = 0.042 LOW).

When pooled, the Genuine heterogeneity dominates: ratio = 1.72, chi-sq = 36.7, p = 1.37e-6.

**This is a property of the dataset generator, not a bug in SelNoise.** The test correctly detects real column variance heterogeneity. The ground truth expectation of LOW was based on the assumption that "symmetric noise shouldn't produce column differences" — but with a multiplicative noise model and finite samples, it does.

## Possible Fixes (for future session)

1. **Fix the generator:** Use a seeded PRNG and verify column variance homogeneity before accepting the Genuine sample. Or increase n_rows to 500+ so the effect-size gate activates.
2. **Make SelNoise condition-aware:** Run Bartlett per condition when row-grouped conditions exist. Fabricated condition would get LOW; Genuine would get HIGH but that's a false positive from the noise model, not fabrication.
3. **Adjust the ground truth:** Accept that DS12b legitimately triggers SelNoise HIGH due to the multiplicative noise model's inherent column variance structure.
4. **Increase the effect-size gate:** Lower the N threshold from 500 to 300, or raise the ratio threshold from 3.0 to something like 2.0. At ratio=1.72, the signal is forensically uninteresting.

Option 4 is the most principled: a 1.72x variance ratio is not forensically meaningful. Real selective noise fabrication produces ratios of 3-13x (DS06=12.9, DS08=3.5). An effect-size gate that activates at N >= 200 with ratio < 2.0 would correctly suppress this false positive without affecting true positives.
