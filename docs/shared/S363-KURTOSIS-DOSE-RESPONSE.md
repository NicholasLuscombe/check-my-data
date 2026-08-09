# S363 — the Excess Kurtosis dose-response

**Read-only over `src/`. Nothing changed, no batch gate, no threshold moved.**
Instrument: `test/probes/probe-s363-kurtosis-dose.mjs`, same load path, same generator parameters and
same seeds as `probe-s361-ladder.mjs`, so every number here is comparable cell-for-cell with
`S361-CONDITION-NOISE-LADDER.md`.

```
node test/probes/probe-s363-kurtosis-dose.mjs --gate
node test/probes/probe-s363-kurtosis-dose.mjs --strat --selnoise
```

240 files per grid run: 3 rungs (r = 1, 1.5, 2.5) × 2 replicate counts × 2 assay labels × 20 draws,
120 subjects, `k = 1`, `sigmaS = 0`. Honest data throughout.

**The four median-p cells reproduce the S361 table exactly** — 0.468 / 0.0143 / 0.000500,
0.403 / 0.00175 / 0.000500, 0.526 / 0.0175 / 0.000500, 0.424 / 0.000750 / 0.000500. The dose-response
is real and it is not a transcription artefact.

---

## The one-line answer

**The dose-response is the pooling, and it is arithmetic.** Neither condition's kurtosis moves across
the whole ladder; the pooled figure moves by 0.77 to 0.83. The rise is the closed-form excess kurtosis
of a 50/50 mixture of two normals at the realised scale ratio, to within 1–13% on every cell. On 92 of
the 101 draws whose pooled p reaches the floor, the directional gate is the only thing between that p
and a HIGH flag on data with nothing planted.

---

## Step 1 — the suppression, read at source

### 1.1 Which gate

`kurtosis.js:383`:

```js
const flag = !Number.isFinite(pooledP) ? "N/A" : (esGate ? "LOW" : flagFromP(pooledP));
```

`esGate` is the OR at `:382` of two arms defined at `:380-381`:

```js
const directionalSuppress = kurtDeviation >= 0;
const effectSizeSuppress  = Math.abs(kurtDeviation) < adaptiveThreshold;
```

**It is the directional suppression** — the arm named in METHODOLOGY's Pooled Dependence section as
instance 4, and in METHODOLOGY-TESTS.md §2.2 as "leptokurtic is informational only". Not the pilot gate at `:314`, not the
early exit at `:240`; both of those are live on this data and neither touches a floored p (§1.3).

Counted over all 240 draws, evaluating both arms independently of `esGateMode` — which reports only
the first true arm (`:545-547`, P62) and so cannot answer this question by itself:

| assay | reps |  r  | directional only | effect-size only | both | neither |
|---|---:|---:|---:|---:|---:|---:|
| general | 4 | 1 | 0 | 12 | 8 | 0 |
| general | 4 | 1.5 | 1 | 0 | 19 | 0 |
| general | 4 | 2.5 | **20** | 0 | 0 | 0 |
| general | 6 | 1 | 0 | 12 | 8 | 0 |
| general | 6 | 1.5 | 1 | 0 | 19 | 0 |
| general | 6 | 2.5 | **20** | 0 | 0 | 0 |
| plate_reader | 4 | 1 | 0 | 8 | 12 | 0 |
| plate_reader | 4 | 1.5 | 3 | 0 | 17 | 0 |
| plate_reader | 4 | 2.5 | **20** | 0 | 0 | 0 |
| plate_reader | 6 | 1 | 0 | 5 | 15 | 0 |
| plate_reader | 6 | 1.5 | 7 | 0 | 13 | 0 |
| plate_reader | 6 | 2.5 | **20** | 0 | 0 | 0 |

**`neither` is zero in every cell**: the gate suppresses on all 240 draws, so no flag anywhere on the
grid comes from the pooled arm. At r = 2.5 the effect-size arm is false on every draw
(|κDev| ≈ 0.8 against a threshold of 0.253 at four replicates and 0.200 at six), so **directional
suppression is the sole gate holding back an 80-draw block of floored p-values.**

Restricted to the **101 draws whose `pooledP` is at the floor**, directional is true on all 101 and
effect-size on 9. (Counted on `primaryP` instead the figures are 102 and 10 — the extra draw is the
promotion in §1.2, whose `primaryP` comes from a condition rather than from the pool.)

### 1.2 Is the floored p the one the flag reads

**On 239 of 240 draws, yes.** `pooledP = nC <= 3 ? adP : kurtP` (`:367`) and nC is 4 or 6 throughout,
so `pooledP === kurtP`; `primaryP` (`:540-542`) equals `pooledP` whenever the per-condition arm has
not promoted, and it does not, on 239 draws.

**On one draw it is a different quantity, and that draw is the only flag Excess Kurtosis produces
anywhere in the S361 ladder.** `general`, 6 replicates, r = 1.5, seed 6101:

| field | value |
|---|---|
| pooled `kurtDeviation` | +0.0918 → suppressed, `flag` = LOW |
| `pooledP` (= `kurtP`) | 0.033 |
| CondA `kurtDeviation` / `rawP` / `condAdjP` | **−0.151** / 0.0005 / 0.0005 → `condPromoted` |
| CondB `kurtDeviation` / `rawP` | +0.0095 / 0.8175 |
| `finalFlag` (`:508`) | **MODERATE** |
| `primaryP` (`:540-542`) | `min(0.033, 0.0005)` = **0.0005** |

That is the 5% cell in the S361 flag table. **Its p and its flag come from different arms**: the
median-p column is the pooled statistic, the flag is the per-condition promotion arm. P104 files that
arm as Class A2; this is what it does on honest data.

The rest of the dispatch's questions assume the two are the same quantity. They are, on the 102
floored draws — the exception is a promotion at r = 1.5, not at the floor.

### 1.3 Which `B`

**1999, everywhere the p is small.** `nSimulations` is `simKurts.length` (`:535`), and the floor
0.000500 = 1/2000 requires it to be 1999. Read, not inferred:

| cell | B = 1999 | B = 50 |
|---|---:|---:|
| general 4rep r=1 | 15 | **5** |
| general 6rep r=1 | 15 | **5** |
| plate_reader 4rep r=1 | 13 | **7** |
| plate_reader 6rep r=1 | 20 | 0 |
| every cell at r = 1.5 and r = 2.5 (8 cells) | 20 | 0 |

**P77's truncation is live, and only at rung 1.** The pilot gate at `:314` fires on 17 of 80
honest-control draws and freezes `simKurts` at 50. It cannot fire anywhere else on this ladder,
because the gate condition is that the observed statistic sits inside the null body and by r = 1.5 it
does not. On every truncated draw `kurtP` is overridden to 1.0 at `:341`, so the `1/51` floor is never
published. **All 102 floored p-values sit on B = 1999.**

---

## Step 2 — the three figures

`kurtDeviation` for all three columns is `kurtosis − simKurtosis`, the same subtrahend
(`:330` pooled, `:421` per condition), so the columns are directly comparable. Medians over 20 draws.
Per-condition rows are selected **by condition name** — `condKurtosis` is sorted ascending by
`kurtDeviation` (`:438`), so index 0 is not CondA.

### assay `general` (log transform)

| reps |  r  | κDev CondA | κDev CondB | κDev **pooled** | median primaryP |
|---:|----:|-----------:|-----------:|----------------:|----------------:|
| 4 | 1 | −0.0261 | −0.0224 | −0.0161 | 0.468 |
| 4 | 1.5 | −0.0199 | −0.0258 | **+0.1638** | 0.0143 |
| 4 | 2.5 | −0.0235 | −0.0280 | **+0.8168** | 0.000500 |
| 6 | 1 | −0.0163 | −0.0085 | −0.0050 | 0.403 |
| 6 | 1.5 | −0.0192 | +0.0001 | **+0.1265** | 0.00175 |
| 6 | 2.5 | −0.0152 | +0.0070 | **+0.7690** | 0.000500 |

### assay `plate_reader` (raw)

| reps |  r  | κDev CondA | κDev CondB | κDev **pooled** | median primaryP |
|---:|----:|-----------:|-----------:|----------------:|----------------:|
| 4 | 1 | +0.0042 | +0.0095 | +0.0182 | 0.526 |
| 4 | 1.5 | −0.0085 | +0.0047 | **+0.1532** | 0.0175 |
| 4 | 2.5 | −0.0171 | +0.0102 | **+0.8510** | 0.000500 |
| 6 | 1 | +0.0440 | +0.0299 | +0.0315 | 0.424 |
| 6 | 1.5 | +0.0154 | +0.0514 | **+0.1651** | 0.000750 |
| 6 | 2.5 | −0.0028 | +0.0792 | **+0.8353** | 0.000500 |

**Span across the whole ladder, per column:**

| block | CondA | CondB | pooled |
|---|---:|---:|---:|
| general 4rep | 0.006 | 0.006 | **0.833** |
| general 6rep | 0.004 | 0.016 | **0.774** |
| plate_reader 4rep | 0.021 | 0.006 | **0.833** |
| plate_reader 6rep | 0.047 | 0.049 | **0.804** |

**Neither constituent moves. The pool moves by nearly one full unit of kurtosis.** On the log arm both
conditions sit within ±0.03 of zero at every rung — there is no per-condition signal at all, in either
direction, anywhere on the ladder. On the raw arm they drift by up to 0.05 and in *opposite*
directions (CondA down, CondB up), which is the raw-scale skew of log-normal data responding to its own
noise scale; it is at least 16× smaller than the pooled movement and does not track it.

Median **per-draw** gap between the pooled figure and the larger of that draw's two constituents —
the quantity the medians above cannot be composed into:

| block | r = 1 | r = 1.5 | r = 2.5 |
|---|---:|---:|---:|
| general 4rep | −0.0477 | +0.1097 | **+0.7651** |
| general 6rep | −0.0311 | +0.1076 | **+0.7573** |
| plate_reader 4rep | −0.0572 | +0.1005 | **+0.7356** |
| plate_reader 6rep | −0.0434 | +0.0657 | **+0.7192** |

At rung 1 the pooled figure typically sits *below* both constituents. It has left them by r = 1.5 and
by r = 2.5 it stands roughly three quarters of a kurtosis unit above the higher one.

### The mechanism, checked against closed form

A 50/50 mixture of two zero-mean normals at sd ratio *q* has excess kurtosis
`6(1+q⁴)/(1+q²)² − 3` exactly. The normalisation is condition-blind by construction:
`fitPredictedSigma` (`primitives.js`) regresses log-variance on the **row mean** only, so both
conditions get the same σ̂ law and the normalised difference pool becomes a two-component scale
mixture. The simulation null generates one scale per row and so contains no mixture.

Untrimmed kurtosis of the published `normDiffs`, paired by seed against the same seed's rung-1 value.
The shipped `pooledKurtosis` is 2%-trimmed at nR ≥ 200 (`:139`), which removes exactly the tail the
mixture lives in — hence the untrimmed reading for this check.

| assay | reps |  r  | realised q | observed rise from r=1 | closed form | ratio |
|---|---:|---:|---:|---:|---:|---:|
| general | 4 | 1.5 | 1.5284 | 0.4735 | 0.4801 | **0.986** |
| general | 4 | 2.5 | 2.5474 | 1.5640 | 1.6106 | **0.971** |
| general | 6 | 1.5 | 1.4880 | 0.4022 | 0.4279 | **0.940** |
| general | 6 | 2.5 | 2.4800 | 1.5071 | 1.5562 | **0.968** |
| plate_reader | 4 | 1.5 | 1.5284 | 0.4725 | 0.4801 | **0.984** |
| plate_reader | 4 | 2.5 | 2.5474 | 1.5472 | 1.6106 | **0.961** |
| plate_reader | 6 | 1.5 | 1.4880 | 0.4753 | 0.4279 | **1.111** |
| plate_reader | 6 | 2.5 | 2.4800 | 1.7552 | 1.5562 | **1.128** |

**The entire dose-response is that formula.** Nothing about the shape of either condition's noise
changed; only the split did, and the pooled fourth moment reports the split.

### Which world

The dispatch stated the discriminator in advance.

- **World 1 shape — "the pooled value crossing to the other side or moving far past both, and the gap
  widening with r": HELD, decisively.** The pooled figure leaves both constituents between r = 1 and
  r = 1.5 and is 6–30× the larger of them by r = 2.5.
- **World 2 shape — "the pooled value between or near the constituents, all three moving together":
  REFUSED.** It is between them at rung 1 only, and the constituents do not move at all.
- **One clause of the world-1 description does not hold.** "Both constituents on one side of zero"
  with the pooled value crossing over is DS12b's picture, where a genuine platykurtic signal in each
  condition was destroyed by the pooling. Here **there is no constituent signal to destroy** — both sit
  at zero. Nothing is being suppressed that would otherwise flag.

**So the register instance this matches is 5, not 4.** Instance 4 is pooling *silencing* a detector;
instance 5 (Regional Noise on DS12b) is pooling *manufacturing* a flag. The arithmetic is the same
arithmetic — mixing conditions at different residual scales adds kurtosis — but the direction is the
opposite one. **The prediction named the right mechanism and the wrong direction.**

**And the gate is not saving the tool by accident.** `κDev ≥ 0` fires because the pooled distribution
is genuinely leptokurtic, which is precisely the case METHODOLOGY-TESTS.md §2.2 designed the arm for ("too noisy is
biological heavy-tailedness, informational only"). It fires for its stated reason, on a signal that is
simultaneously a true property of the pooled residual set and a pure consequence of pooling two honest
conditions. **What is new is that the arm is load-bearing on honest data.** 101 of the 240 draws carry
`pooledP` at the floor; the effect-size arm catches 9 of them; **remove the directional arm alone and
92 of 240 honest files read HIGH.** No draw anywhere on the grid would read MODERATE by that route —
the pooled p is either at the floor or well above `ALPHA.NOTE`.

---

## Step 3 — Selective Noise's frozen p

**Both, one per replicate count — and the axis is invisible to the flag either way.**

**At four replicates it is blind by construction.** Bartlett's statistic is exactly scale-invariant:
multiplying every column variance within a condition by a common λ adds `dfTotal·lnλ` to the first
term and subtracts `Σ(nᶜ−1)·lnλ = dfTotal·lnλ` from the second. `condNoiseRatio` applies exactly one
such λ per condition (`gen-copy-fidelity.mjs:351-352`, `:367-370`), so on the log arm the per-condition
p cannot move at all. Measured:

| r | pBartlett CondA | pBartlett CondB | variance ratio CondA | median primaryP |
|--:|----------------:|----------------:|---------------------:|----------------:|
| 1 | 0.6337 | 0.6990 | 1.2665 | 0.458697 |
| 1.5 | 0.63335 | 0.6989 | 1.2665 | 0.459131 |
| 2.5 | 0.63345 | 0.69905 | 1.2665 | 0.459007 |

Per seed at 17 significant digits: identical for some seeds, and differing in the **fourth significant
digit** for others (seed 6100: 0.093200000000000005 / 0.093399999999999997 / 0.093100000000000002).
That residue is the emitter's two-decimal rounding (`gen-copy-fidelity.mjs:377`), not the axis. This is
the S361 table's flat `0.459`, and it is a real p-value that is mathematically forbidden to move.

**At six replicates it is reading a constant.** `N` is the residual count, 120 × 6 = 720, above the
`N >= 500` threshold at `selectiveNoise.js:182`, so `esGate` fires on both conditions and each
contributes the literal `1.0` placeholder to the BH family at `:184`. `nGateSuppressed` is 2 on every
draw and `primaryP` is 1.00000 at every rung. **The S361 table's `1.00` is not a p-value.**

**The one quantity that does respond is display-only.** The whole-matrix Bartlett moves
0.5507 → 0.4107 → 0.3727 at four replicates and 0.6426 → 0.4527 → 0.2212 at six — it can see the axis,
weakly, and it never reaches the flag (`:222` publishes it as `pBartlett`; `primaryP` is the
per-condition BH minimum).

---

## Found in passing

Three things this grid settles that were not asked for. None is scoped and none is a fix.

- **The per-condition arm's p is grossly anti-conservative on honest data.** Over 478 condition-units
  returned across 240 draws with nothing planted: **30 (6.3%) read `rawP` below 0.001** — which on this
  test means the condition's κ fell outside all 1999 simulated nulls, since the floor is 1/2000 — and a
  further **45 (9.4%) land in the MODERATE band**, against nominal rates of 0.1% and 0.9%. Those tiers
  are rendered on the condition cards (P52). **Candidate cause, read at source but not settled here:**
  the per-condition κ is computed on one condition's rows (`:411-418`) and ranked against `simKurts`,
  whose batches are built from *all* valid rows (`:176-179`, `:422-425`), so the null is narrower than
  the statistic. The measured sd ratios are consistent — CondA reads 1.70–2.31× its null's sd in every
  one of twelve cells — but the pooled control at rung 1 reads 0.82–1.62 rather than a clean 1.0, so
  the factor is not isolated. Worth its own measurement.
- **One draw in 240 returned no condition table at all** (`general`, 6 reps, r = 2.5, seed 6105) with a
  healthy null of 1999 batches. The only path to that at source is `:448`'s `spread > bestSpread` with
  `bestSpread` initialised to 0 and the spread computed from `parseFloat` of two **four-decimal
  strings** (`:430`, `:447`) — an exact tie at four decimals deletes `condKurtosis` silently. Stated as
  the only reachable path, not as a confirmed reproduction.
- **The generator emits condition rows interleaved, strictly A/B/A/B** (`gen-copy-fidelity.mjs:429-432`,
  with the reason in the comment above it). That confirms STATUS's standing hypothesis for why Regional
  Noise Homogeneity reads zero at every rung of the S361 ladder: every sliding window holds both
  conditions in equal measure, so a between-condition variance difference is invisible to it by
  construction. One read, and the hypothesis becomes a finding.

---

## What this changes and what it does not

- **P106's disposition reopens, narrowly.** `P106-HETEROSCEDASTIC-FIXTURE-SPEC.md` §12 records that the instrument "cannot read a ladder while
  the floor fires". That is true of Inter-Replicate Correlation, Noise Scaling and Selective Noise, and
  it is **false of Excess Kurtosis**, whose floor does not fire — 0% at 27 of 28 cells — which is
  exactly why its median-p column is readable end to end. The instrument did reach a target; it reached
  it through the one test whose flag rate gave no reason to look.
- **That spec's §8 "to confirm, not assume" line is now confirmed with its sign corrected.** Pooling across
  conditions of unequal variance does move Excess Kurtosis's statistic on this axis, by three orders of
  magnitude in p. It does not invert a sign here, because there is no sign to invert.
- **This is not a false negative.** A false negative needs something true to miss. Both conditions are
  honest and both read κDev ≈ 0; the pooled leptokurtosis is created by combining them. The correct
  description is a **suppressed false positive with a measured dose-response** — the detector responds
  cleanly and monotonically to a structure that is not fabrication, and one gate arm absorbs all of it.
- **No threshold moves on the strength of this**, per P106 Decision 4. The directional arm is doing its
  designed job and the finding is a documentation change, not a calibration change.
- **A rate from a generator is not a field rate.** This bounds behaviour under a log-normal noise model
  on files we wrote, with 120 subjects and two equal-sized conditions. The 50/50 mixture arithmetic
  above depends on the equal split; unequal conditions give a different curve.
