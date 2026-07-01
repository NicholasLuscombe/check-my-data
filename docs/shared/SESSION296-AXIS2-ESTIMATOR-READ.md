# Session 296 — Axis-2 density-estimator behaviour read (READ-ONLY)

**Read-only.** No `src/` file was edited and no batch was run. A throwaway analysis script loaded the relevant columns and computed descriptive statistics; it is measurement, not an engine change, and is not committed to `src/`. This gathers the empirical behaviour that separates the two candidate density estimators for the continuous collision null — a parametric fit versus a recurrence-robust kernel estimate. It does not choose one. The closing section states which estimator each observation favours as evidence toward a decision Chat will make.

The continuous collision null replaces the empirical Herfindahl index (`duplicateDetection.js:55`, assigned `p1 = hhi` in the continuous branch) with a collision probability read off a density model, integrated at the recording grid `step = 10^-dominantDp` (`:39`). For the CORPUS-03 fish-length column that grid is `step = 0.01` (dominant precision is two decimals). Throughout, `p1` is the per-value match probability that feeds `binomialSurvival(collisionObs, collisionNPairs, p1)` (`:173`); a smaller `p1` means a lower collision baseline and a verdict that is easier to reach.

---

## Observation 1 — the CORPUS-03 SL column shape (the defect case)

The fish standard-length column as the engine parses it:

- **N = 373** values, **84 distinct**, average multiplicity **4.44**.
- **Recurrence structure:** 72 distinct values appear exactly 4 times, 10 appear 8 times, one appears twice and one three times. The source of the ×4 is structural: the dataset is 94 fish measured across four behavioural observation rows each, so a fish's length is carried down its four rows; the ×8 values are lengths shared between two fish. The block structure is literal in places — fish 1 and fish 4 carry the identical length sequence `21.08, 20.48, 22.58, 22.18`.
- **Distribution shape:** unimodal, bounded on `[20.22, 28.96]`, right-skewed (skewness 0.87, excess kurtosis 0.80). The 12-bin histogram rises to a mode around 22–23 and tails off to the right with a thin upper tail.
- **Recording grid:** dominant decimal precision 2, so `step = 0.01`. The value range spans about 875 grid cells, of which only 84 are ever occupied.

The empirical Herfindahl index this column produces is **HHI ≈ 1.30e-2**, which is essentially `1 / (number of distinct values) ≈ 1/84`. That identity is the whole problem in one line: the current null's collision baseline is the reciprocal of the distinct-value count, and the defect being tested (block copying that confines the column to 84 distinct values) is exactly what drives the distinct-value count down. The estimator that replaces it must rate this column's collision baseline low enough for the verdict to fire.

## Observation 2 — a clean quantised comparison column (does not exist in current data)

The estimator must not fire on a continuous column whose values recur legitimately through coarse quantisation. Searching the corpus and the clean fixtures for such a column returns nothing usable:

- CORPUS-03 `Total.distance`: 373 values, all 373 distinct (multiplicity 1.00).
- qPCR clean `Ct` replicate columns: 50 values each, all distinct; pooled across the three replicate columns, 150 values with 147 distinct (three incidental collisions, maximum frequency 2).
- ELISA clean plate columns: 65 values each, all distinct.

Every clean continuous column in the current data is effectively collision-free — legitimate quantisation heavy enough to make values genuinely recur is simply not present. **This is itself a finding:** the benign direction of the estimator's behaviour (whether a smooth-but-tight density over-suppresses a legitimately quantised clean column, which is the false-positive risk Constraint 3 of the null-constraints read named) cannot be tested against real data as it stands. Testing it requires authoring a quantised clean column — for example a bounded reading recorded to one decimal, where values recur because the instrument steps coarsely rather than because anything was copied — which folds into the fixture work already noted for the fix. Until that fixture exists, the two estimators can only be separated on the defect direction, not the benign one.

## Observation 3 — parametric-fit misspecification probe

Fitting a Normal to the SL column (mean 22.91, standard deviation 1.73) and measuring goodness of fit:

- **KS distance = 0.081**, against a 5% critical value of about 0.070. The Normal is rejected at the 5% level, but only marginally, and the KS test overstates the rejection here because the 373 values are not independent — they are 94 fish replicated four times, so the effective sample size is closer to 84 and the true critical value is larger. The honest reading is a mediocre fit, not a decisive one.
- **Where it misses:** the empirical-versus-fitted density ratio wanders from about 0.53 to 1.75 across the interior. The Normal underweights the mode near 21.75 (empirical density runs ~1.4× the fit) and the right shoulder near 27 (~1.75×), while overweighting the 23–24.5 region (~0.55×). It misses the right skew, as expected for a symmetric family on a skewed bounded variable.
- **What matters for the fix:** despite the imperfect shape, the collision baseline a Normal produces is **p1 ≈ 1.6e-3**, against the broken empirical HHI of 1.30e-2 — roughly an **8× reduction**. That baseline sits well inside the region where the verdict fires. So on this real column the parametric misfit yields a defensible collision baseline, not a misleading one: the density integral `∫f²` that sets `p1` is governed by the peak height and the spread, both of which a moment fit captures adequately even when it misses the skew.

A parametric fit is also nearly immune to the recurrence by construction. The ×4 and ×8 replication enters only through the sample mean and variance, which barely move under near-uniform replication (the fish 1 to fish 4 block copy doubles four values' weight and shifts the moments negligibly). This is the opposite of the empirical HHI, which is fully coupled to the recurrence.

## Observation 4 — KDE recurrence-inflation probe

A naive Gaussian kernel estimate built on the full multiset was compared against a recurrence-flattened estimate built on the 84 distinct values (Silverman bandwidth in each case: 0.465 naive, 0.644 flattened):

- **Density at the recurring values:** at the ×8 values the naive-over-flattened inflation is 1.00 to 1.12; at sampled ×4 values it runs 0.85 to 1.17. The theorised inflation is present in direction but small in magnitude.
- **Collision baseline:** naive KDE gives **p1 ≈ 1.68e-3**, flattened KDE **p1 ≈ 1.55e-3** — a naive-over-flattened inflation of only **1.08×**. Both land beside the Normal's 1.6e-3 and roughly 8× below the empirical HHI.
- **Bandwidth sensitivity:** the small inflation is not a bandwidth artefact. Shrinking the bandwidth from the Silverman value of 0.465 down toward the recording step (0.02, twice the step) moves the naive-over-flattened ratio only from 1.03 to 1.05. It stays small across the whole range.

The reason the inflation stays small is structural, and it reframes the concern. CORPUS-03's recurrence is **near-uniform** — almost every distinct value appears the same number of times (4, with ten exceptions at 8). A near-uniform multiplicity means the full multiset is close to a scaled copy of the distinct set, so reweighting from one to the other barely changes the density anywhere, and the recurrence-flattening correction has almost nothing to correct. The empirical HHI is not broken here because a few values spike; it is broken because the column occupies only 84 of ~875 available grid cells, and HHI reads that discreteness directly as `1/84`. Any density estimator — parametric or kernel — cures that by spreading mass across the grid it can plausibly reach, which is why all three model-based baselines converge near 1.6e-3. On this column a naive uncorrected KDE already recovers about seven-eighths of the fix on its own, and the flattening correction is the residual eighth.

The caveat is that this benign behaviour of the naive KDE is specific to near-uniform recurrence. A defect that concentrated many copies onto a few values (rather than a few copies onto many values) would push the naive-over-flattened inflation up, and the flattening correction would then carry real weight. CORPUS-03 does not exercise that regime, so how fragile the correction becomes under concentrated recurrence is, like the benign column of Observation 2, currently untestable on real data.

---

## Evidence toward the decision (Chat makes the choice)

Stated as which estimator each observation favours, not as a recommendation.

- **The common ground first.** On CORPUS-03 the estimator choice barely moves the collision baseline: a Normal fit gives 1.6e-3, a naive KDE 1.68e-3, a flattened KDE 1.55e-3 — all within about 10% of each other and all roughly 8× below the broken empirical HHI of 1.30e-2. Whichever estimator is chosen, the verdict this column should carry is recovered. The decision is therefore not "which one fixes CORPUS-03" — both do — but which one is safer across the columns the corpus does not yet contain.

- **Observation 3 favours neither cleanly but softens the case against parametric.** The Normal misfit on SL is real (KS marginally over the 5% line, density ratios from 0.53 to 1.75) yet the collision baseline it produces is defensible rather than misleading, because that baseline depends on peak height and spread more than on the skew the Normal misses. A parametric fit is also almost entirely recurrence-immune. The open risk it carries is the one this column cannot show: a biological column whose true shape is far from any simple family, where the misfit would distort `∫f²` enough to matter. That risk is a misspecification argument, and it is untestable here for the same reason Observation 2 is.

- **Observation 4 favours the kernel estimate, with a smaller-than-expected margin.** The circularity a naive KDE was feared to reintroduce is only 1.08× on this column, and it survives even at bandwidths near the recording step, because the recurrence is near-uniform. A kernel estimate makes no distributional assumption and needs only a modest, mechanically simple flattening correction (estimate on distinct values, or weight by inverse multiplicity) to remove even that. Its exposure is the mirror image of the parametric one: concentrated rather than uniform recurrence, which would enlarge the inflation and make the correction load-bearing — again untestable on current data.

- **Which is the more tractable problem on this real data.** Both are tractable on CORPUS-03 and neither is disqualified. The KDE inflation is the smaller and more mechanically contained of the two: it is quantified (about 8% on the baseline), it is bounded across bandwidth, and its correction is a one-line reweighting. The parametric misfit is also modest here but its residual risk — misspecification on a genuinely non-standard column — is qualitative and cannot be bounded from this column alone. So on the evidence available, the kernel estimate's failure mode is the one that has been measured and found small, while the parametric estimate's failure mode is the one that remains a matter of judgement. That asymmetry is the substantive input to the choice; it is not a recommendation.

- **The gap that outranks the estimator choice.** The single most consequential finding is Observation 2: the current data contains no column that exercises either estimator's benign or concentrated-recurrence failure direction. Both estimators pass the defect direction on CORPUS-03. The direction that actually separates them — a legitimately quantised clean column, and a concentrated-recurrence defect — is not present. Choosing between the two estimators with confidence needs those fixtures authored first; without them the choice rests on the defect direction alone, where the two are near-indistinguishable.
