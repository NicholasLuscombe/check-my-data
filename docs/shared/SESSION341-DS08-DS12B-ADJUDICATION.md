# S341 — DS08 and DS12b undeclared firings, adjudicated

**Status:** read-only. `src/` untouched; `git diff main -- src/` empty. `TEST-GROUND-TRUTH.md`
not edited — recommendations only, Chat authors any revision.

**Construction source found.** `generate-test-datasets.py` (repo root, tracked) contains the
generator for both fixtures. This is a real construction record, not a reconstruction from data:
`gen_elisa_fabricated()` at `:258-303` and `gen_uniform_mixture_fabricated()` at `:542-597`.
Nothing in this document infers intent from the CSV.

**Correction to the brief's framing.** The brief describes the failures as "driven by LOESS
Residual Analysis and Regional Noise Homogeneity." On DS12b, **LOESS is declared** —
`batch-fixtures.mjs:96-97` carries `'LOESS Residual Analysis': ['MODERATE','HIGH']` with the
comment *"CUSUM changepoint row 196 = Genuine/Fabricated boundary."* On both fixtures the sole
undeclared channel is **Regional Noise Homogeneity**. LOESS is adjudicated here anyway because
it produces the DS12b band conflict.

**The two cases resolve in opposite directions.** DS08's firing is a true detection of a planted
mechanism through an undeclared channel. DS12b's is a false positive, and the fixture has a
larger problem behind it.

---

# DS08 — `08-elisa-fabricated.csv`

## Construction

`gen_elisa_fabricated()`, 65 data rows × 3 plates. Row indices below are 1-indexed data rows
(generator `rows[]` is header-at-0, so `rows[i]` is data row `i`, analyte `A{i:03d}`).

| # | component | rows | columns | strength | source |
|---|---|---|---|---|---|
| 1 | AR(1) on log-residuals | **1–65 (all)** | all 3 plates | φ = 0.55, σ = 0.09 | `:262-264` |
| 2 | Benford push — leading digit ≤3 rescaled ×U(2,3) | **1–24** | all 3 plates | up to 3× | `:275-285` |
| 3 | Constant offset — Plate2 = Plate1 × 1.047 exactly | **35–48** | Plate2 | exact, no noise | `:288-294` |
| 4 | Selective noise — Plate3 = mean(P1,P2)×(1+0.01·randn) | **50–64** | Plate3 | σ 0.01 vs 0.09 baseline | `:296-301` |

### What the ground-truth row omits — full set

`TEST-GROUND-TRUTH.md:28` describes DS08 as *"ELISA fabrication with plate-localised selective
noise reduction and multiplicative replicate offset"* — components 3 and 4 only.

**Component 1 (AR(1)) is absent from the row.** The brief reports S340 found "an AR(1) component
occupying about twelve of its 65 rows." **Denied on extent.** The AR(1) is applied at generation
inside the main row loop to every one of the 65 rows and all three plates; there is no windowed
AR block. Whatever S340 measured, the construction plants it globally.

**Component 2 (an explicit planted Benford manipulation) is absent from the row, and the row
attributes the Benford HIGH to the wrong cause.** The row argues at length that the leading-digit
distortion *"attributes to value concentration under the noise-reduction component."* It does
not. `:275-285` rescales every leading digit ≤3 by U(2.0, 3.0) across rows 1–24 — a direct,
deliberate first-digit manipulation. The row's Benford reasoning (including its DS07 adjudication)
reaches a defensible verdict — *true detection* — by an incorrect mechanism.

This is why a partial correction would be worse than none: the row is wrong about a component it
omits **and** wrong about the cause of a channel it declares.

**Not detected despite being planted:** Autocorrelation returns LOW at p = 0.0477 across 8 seeds,
against a φ = 0.55 AR(1). Explicable rather than defective — the AR(1) lives in log-residual
space at σ = 0.09 while `true_val` is drawn `uniform(-1.2, 3.2)` in log10, so the autocorrelated
component is swamped in the observed series. Recording it because the construction plants a
mechanism the battery cannot see.

## The undeclared firing: Regional Noise Homogeneity — MODERATE

Declared channels (`batch-fixtures.mjs:74-80`): Selective Noise Partitioning, LOESS, Inter-Replicate
Correlation, Constant-Offset Blocks, Benford 1st. Acknowledged: Mahalanobis Row Outlier
(`:233-235`). Everything the fixture fires is on one of those two lists except Regional Noise.

**Where it fires.** `bestWindow = rows 31–45`, `bestAnomCol = 2` (Plate2), `bestVarRatio = 9.80×`,
p = 5.6e-3 – 9.0e-3. Identical window, column and ratio at all 8 seeds.

That is **component 3**, the constant-offset block at rows 35–48 in Plate2 — 11 of the window's
15 rows sit inside it. It is not component 4, which the ground-truth row emphasises.

**Engine-independent confirmation.** SD of `log(Plate2/Plate1)` computed directly from the CSV,
no engine involved:

| region | SD |
|---|---|
| inside rows 35–48 | **1.693e-4** |
| outside | **2.799e-1** |

A 1650× collapse — as constructed, since `P2 = P1 × 1.047` exactly makes the log-ratio a constant
and the residual 1.7e-4 is decimal-formatting rounding alone. The lowest-variance 15-row window
in the whole fixture is **rows 34–48**. Regional Noise's reported window is the correct answer.

**Slice test** (8 seeds each, direct `testRegionalNoise` on row subsets):

| slice | n | flag | p | window | col |
|---|---|---|---|---|---|
| full 1–65 | 65 | MODERATE | 2.8e-3 – 4.2e-3 | 31–45 | 2 |
| **before block, 1–34** | 34 | **LOW** | **8.26e-1 – 8.44e-1** | 6–20 | 1 |
| block only, 35–48 | 14 | N/A (too few rows) | — | — | — |
| selective-noise excised, 1–49 | 49 | MODERATE | 1.0e-3 – 2.4e-3 | 31–45 | 2 |
| block excised, 1–34 + 49–65 | 51 | **HIGH** | 2.0e-4 | 36–50 | **3** |

Removing the offset block takes p from ~3e-3 to **0.83**. Removing the selective-noise block
instead leaves the finding untouched. The signal is the offset block and nothing else.

The last row is worth its own note: with the offset block excised, rows 49–65 splice onto row 34
and Regional Noise fires **HIGH on column 3** — component 4, the selective-noise block, in spliced
coordinates. Regional Noise has *two* planted targets on this fixture and reports only its best
window; the offset block masks the selective-noise block in the full file. (Splicing makes rows
34 and 49 adjacent, so that window index is in spliced space, not fixture space.)

**Eight-seed behaviour, shipped counts only** (65 rows → `validRows.length ≤ 100` → nPerm = 4999,
the fine side; no branch to vary, and the forced-high arm reproduces it identically):
MODERATE at 8/8, p ∈ {5.6, 6.6, 7.0, 7.8, 8.2, 9.0}×10⁻³, window/column/ratio invariant.

## Recommendation — DS08

**Declare `Regional Noise Homogeneity: ['MODERATE']` on DS08.**

Evidence: it localises to a planted mechanism (rows 31–45 / Plate2 vs planted 35–48 / Plate2);
the mechanism is a measured 1650× variance collapse confirmed without the engine; the signal
vanishes (p → 0.83) when that block is removed and survives when the other block is removed; and
it is stable at 8/8 seeds in window, column, ratio and tier. This is a detection of a mechanism
the ground-truth row already describes ("multiplicative replicate offset") through a channel the
row does not list.

**Also recommended, and independent of the above:** the row's Benford mechanism claim should be
corrected to cite the planted manipulation at `generate-test-datasets.py:275-285`, and the AR(1)
component added to the construction description. Chat's call, and both belong in the same edit —
correcting one without the other leaves the row misleading in a different way.

---

# DS12b — `12b-uniform-mixture-fabricated.csv`

## Construction

`gen_uniform_mixture_fabricated()`, 400 data rows × 6 replicate columns, two **row-grouped**
conditions sharing per-row base means:

| # | component | rows | columns | strength | source |
|---|---|---|---|---|---|
| 1 | "Genuine" — log-normal multiplicative noise | **1–200** | rep1–6 | CV ≈ 18% | `:578-583` |
| 2 | "Fabricated" — uniform noise on the same bases | **201–400** | rep1–6 | ±40% of base | `:587-594` |

The planted mechanism is a **noise-distribution** difference, not a localised anomaly, and it is
condition-stratified rather than row-windowed. Its row-order footprint is an artefact of the
generator emitting all Genuine rows before all Fabricated rows.

The docstring (`:544-567`) states the expected detections explicitly:

> Kurtosis (condition-stratified): Fabricated κDev << −0.5 [PLAT], Genuine ≈ 0 → MODERATE …
> **Overall: MODERATE or SERIOUS (kurtosis is primary signal)**

`TEST-GROUND-TRUTH.md:33` is a single line — severity 1, *"Uniform-on-shared-bases fabrication;
narrow-fab within-column distributional shift"* — with no channel list.

## The undeclared firing: Regional Noise Homogeneity — MODERATE|LOW

**Where it fires.** `bestWindow = rows 51–65`, `bestAnomCol = 6`, `bestVarRatio = 7.83×`.

Rows 51–65 lie **entirely inside the Genuine half**. The planted region is rows 201–400.

**Slice test** (8 seeds each):

| slice | rows | n | flag | p |
|---|---|---|---|---|
| **inside the planted region** | 201–400 | 200 | **LOW** | **0.792 – 0.840** |
| outside (clean Genuine half) | 1–200 | 200 | LOW | 0.216 – 0.288 |
| whole fixture | 1–400 | 400 | MODERATE\|LOW | 0.006 – 0.010 |

Inside the mechanism the test is as null as it gets — p ≈ 0.81. In the clean half alone, rows
51–65 remain its argmax window (ratio 4.30×) but reach only p ≈ 0.25. The MODERATE exists **only**
when both noise regimes are pooled into one permutation null: mixing CV-18% log-normal rows with
uniform ±40% rows inflates the pooled variance heterogeneity, and an ordinary clean window then
scores extreme against it.

This is the S340 DS22 shape precisely — a channel returning a null p inside the planted window
while carrying a tier from rows outside it. The mechanism is heterogeneous pooling, the same one
behind the known Benford pooling false positives.

**Eight-seed behaviour, both arms:**

| arm | nPerm | flag | p |
|---|---|---|---|
| shipped | 499 | MODERATE\|LOW | 6.0e-3 – 1.0e-2 |
| forced-high | 4999 | **MODERATE\|LOW** | 7.0e-3 – 1.0e-2 |

**Forced-high does not stabilise it** — confirmed here specifically, as the brief asked. A 10×
resample increase leaves the tier split. The instability is therefore **not a resolution problem**:
the true p sits on `ALPHA.NOTE = 0.01` and the tier flips as the estimate straddles it. More
resolution measures the straddle more precisely; it cannot move the value off the threshold.

## The band conflict

Forced-high moves DS12b from band **1 → 2** at 8/8 seeds, against a declared expectation of 1.

**The HIGH is `LOESS Residual Analysis`**, and it is produced entirely by the CUSUM arm:

| arm | flag | cusumP | scanP | changepointRow |
|---|---|---|---|---|
| shipped (nPerm 499) | MODERATE | 2.0e-3 | ≈ 0.58 | **196** |
| forced-high (nPerm 4999) | **HIGH** | **2.0e-4** | ≈ 0.58 | **196** |

`cusumP = 2.0e-4` is exactly `1/(4999+1)` — the floor. The branch is the whole story: at 499 the
floor is 2.0e-3 (MODERATE ceiling); at 4999 it is 2.0e-4, which clears `ALPHA.FLAG`. The window
scan is null in both arms (p ≈ 0.58), so `bestWindow 289–308` is the argmax of a non-significant
scan and carries nothing.

**Does the HIGH sit inside the planted region?** At its edge. Changepoint row 196 against a
condition boundary at row 200/201 — it detects the *onset* of the planted condition, four rows
early. Within either half alone LOESS is LOW (inside p = 0.24–0.28, outside p = 0.27–0.38), so the
signal exists only at the join. It is a real feature of the file, but what it detects is *"this
file is sorted by condition and the conditions differ in noise character"* — a row-order property.
Held at 8/8 seeds in both arms.

## Does the construction support severity 1?

**No.** The fixture's stated primary signal is not present in the statistic designed to measure it.

Measured Excess Kurtosis on DS12b (whole fixture, shipped):

| field | value |
|---|---|
| `pooledKurtosis` | −0.5674 |
| `simKurtosis` | −0.6043 |
| **`kurtDeviation`** | **+0.0369** |
| `kurtosisP` | 0.2475 |
| `nPlatykurtic` / `nPairs` | **0 / 15** |
| `esGateMode` | `directional (leptokurtic, informational)` |

The docstring predicts κDev ≪ −0.5. The measured deviation is **+0.037 — the wrong sign** — and
`directionalSuppress` (`kurtosis.js:380`) then forces LOW regardless of p. `nPlatykurtic = 0`
across all 15 pairs: no pair shows it either.

**This is absence of signal, not absence of routing.** `condCtx` resolves correctly —
`type: "row-grouped"`, `names: ["Genuine","Fabricated"]`, `count: 2` — so the condition-stratified
path had what it needed.

Every other predicted channel is silent too: Selective Noise p = 1.000, Terminal Digit p = 0.400,
Benford 1st N/A, Column GoF N/A. The clean comparator DS12a fires nothing at all.

So DS12b's complete non-LOW output is:

- LOESS MODERATE — detecting the condition-order boundary, not the noise distribution;
- Regional Noise MODERATE|LOW — a pooling false positive in the clean half.

Both are in the `replicate` mechanism dimension, so `nFlaggedDimensions = 1`, branch 5 of
`severity.js` cannot fire, and the ladder lands on `mod>=1 → 1`.

**The declared severity of 1 is a transcription of tool output, not a derivation from the
construction.** The planted mechanism — uniform replicate noise — is detected by nothing in the
battery, and the band it carries is produced by one boundary artefact and one false positive.

## Recommendation — DS12b

**`Regional Noise Homogeneity` on DS12b is a false positive. Do not declare it.**

Evidence: p ≈ 0.81 inside the planted region; its reported window lies wholly in the clean half
and reaches only p ≈ 0.25 there; the tier exists only under pooled-null heterogeneity; and it is
seed-unstable at both 499 and 4999, so it is not a resolution artefact that a count change would
resolve. Suppressing it via `ACKNOWLEDGED` would record it as incidental collateral, which it is
not — it is a firing on clean rows, and the DS10 entry two lines above it in the same file sets
the opposite precedent by requiring per-slice localisation *inside* the fabricated range.

**DS12b's severity expectation is indeterminate as declared, and the fixture needs a decision
above the level of this pass.** What would settle it, in ascending order of scope:

1. **Confirm the kurtosis prediction is dead.** Re-derive κDev for the Fabricated slice alone in
   residual space. If it really is ≈ 0, the docstring's design premise failed and the fixture
   never tested what it was built to test.
2. **If so, decide what DS12b is for.** Either regenerate it so the uniform-noise signature is
   measurable by the channel that claims it, or re-scope it as a clean-ish comparator with an
   expectation of 0 and accept that LOESS's boundary detection is the only true positive.
3. **Either way the band should not be restated from tool output.** That is how it reached 1.

Not resolved here. Recorded for Chat.

---

## Cross-fixture note

Both fixtures were adjudicated by the same method — locate the firing, compare it to the
construction, then slice the fixture so the planted region is isolated — and it separated them
cleanly in opposite directions. The method is the DS10 per-slice precedent already encoded at
`batch-fixtures.mjs:88`. It is worth applying to the remaining `ACKNOWLEDGED` entries, which were
dispositioned before this method existed and none of which carry a slice measurement.

## Artefacts

| file | note |
|---|---|
| `test/probes/probe-s341-adjudicate.mjs` | whole-fixture + inside/outside slices, both arms, 8 seeds |
| `test/probes/probe-s341-ds08-offset.mjs` | DS08 offset-block isolation; carries the engine-independent log-ratio variance check |

Both reuse `s341-count-hook.mjs` / `s341-seed-hook.mjs`. Raw dumps under
`test/probes/out-s341-adjudicate/` are not committed, per the convention that no probe output
directory is tracked.
