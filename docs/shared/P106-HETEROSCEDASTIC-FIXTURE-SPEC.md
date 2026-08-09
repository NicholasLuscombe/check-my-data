# P106 — honest heteroscedasticity: instrument spec

**Amended S361, after the first version was committed at `feb7f1c`.** Two corrections, both to this
document rather than to anything measured.

- **§5's centring was wrong.** It specified `sigma/√r` and `sigma·√r`, which holds the geometric mean of
  the two condition sigmas fixed but lets the file's total replicate noise grow as `(r + 1/r)/2`. A test
  could then fire at a high ratio because the file got noisier, not because the conditions differ — the
  confound the ladder exists to avoid. The correct form is in §5 and it matches the centring `sigmaS`
  already uses. **The error was reaching for the tidier-looking formula while the correct pattern sat
  quoted one section above.**
- **Every line number cited into `METHODOLOGY.md` was wrong**, because they were read from a snapshot
  sixteen lines behind the live file. The quotes were all accurate. Re-anchored in §0.

---

## 0. How this document cites METHODOLOGY

**Section names are the anchor. Line numbers are a convenience and they have already broken once.**

Every number below is against a **1,935-line `METHODOLOGY.md`**. If the file is a different length, treat
the numbers as stale and locate by the quoted text instead. That stamp is the whole freshness gate: a
citation that cannot say what it was measured against cannot be checked.

| Quote | Section | Line |
|---|---|---|
| "Replicate noise structure is an assay property…" | §1.9 Stage 2 — Residual-structure properties | 814 |
| "…rarely exceeds ±20–30% post-VST" | §1.9 Stage 2, the P4 paragraph | 832 |
| "…condition effects dominate total row variance…" | Variance-Stabilizing Transform preprocessing | 231 |
| "Why pool-level properties are one-sided" | §1.9 Stage 1 — Pool-level properties | 810 |
| "Residual-structure properties on non-VST'd heteroscedastic data" | §1.9 framework limitations | 793 |
| "dispersion of a per-subject log-normal multiplier" | §1.7 Cross-group Residual Spike Correlation | 720 |

---

**Owner:** Chat. **Destination:** `docs/shared/`, tracked. Route (a): build the instrument, measure the
rate, let the number narrow what the tool claims. Route (b) — a fixture whose honest variance change
carries a feature a better detector could use — was refused, because it presupposes a discriminator
nobody has specified and would tune the instrument on the answer.

## 1. What this decides

Several tests in the battery respond to a change in noise scale. Every fixture that carries such a
change also carries a fabrication, so **for the whole family a variance change and a fabrication are the
same object in the corpus.** Specificity is unmeasured, not measured-and-good.

The instrument separates them: generate honest data whose noise scale varies, hold everything else
fixed, report what the battery does. **It is not a fixture and not a regression case.** Its output is a
curve.

**The sharpest single target is one number.** Cross-Condition Consistency P4's different-direction gate
sits at 0.5 in log ratio, about 1.65×, and the P4 paragraph anchors it against cross-condition noise
variation that "rarely exceeds ±20–30% post-VST". That anchor is a belief about honest data with nothing
measured behind it, and it decides where a flag falls. This instrument either validates it or refutes
it.

## 2. The assumption under test, quoted where it lives

§1.9's Stage 2 introduction, the load-bearing claim for that stage's two-sided design:

> Replicate noise structure is an assay property, not a condition property — in honest data it is
> preserved across conditions regardless of treatment.

Nothing measures this. Same shape as the permutation arithmetic that was wrong for the life of the
project: **a stated derivation with no test behind it.**

Stage 1 faced the same problem and solved it correctly. P1, P2 and P3 fold location and scale together,
so they are one-sided on "similar" only, and a genuine dispersion difference goes to the informational
section rather than to a flag. **Stage 2 declined that route, and the sentence above is the reason it
gave.**

A second and distinct claim sits in the framework's limitations: on data the variance transform does not
reach, P4 can flag legitimate mean-dependent scale variation, and the transform is named as the control.
That one is already documented as a conditional limitation. It is a different measurement, and §3 keeps
them apart.

## 3. Two kinds of heteroscedasticity, and they are not interchangeable

| | Mechanism | Survives the log transform? | Which claim it probes |
|---|---|---|---|
| **Removable** | proportional noise, conditions at different means; per-condition gain | **No** — removed exactly | the framework limitation, which has a named control |
| **Irreducible** | conditions with different replicate noise scale at the same mean | **Yes** | Stage 2's assumption, and P4's ±20–30% anchor |

Step 0 established that the existing generator draws replicate noise on the log scale at constant
`sigma`. Under that model a condition mean shift changes no log-scale variance at all — and the
generator already plants a mean shift (`effectFrac: 0.20`, `effectFold: 1.5`) while asserting that the
two conditions' marginal spreads match.

**So the mechanism this spec first leaned on lives entirely on the raw scale.** It is the case the
transform was built for. Measuring with it and finding nothing would say the transform works, not that
the assumption holds.

**Corrected lean: irreducible first.** It is what Stage 2 claims cannot happen and what P4's anchor
prices. Removable is the second arm, in §7.

Honest mechanisms producing the irreducible kind, either of which a reviewer would accept:

- **A treatment that changes variability.** Subjects respond heterogeneously, so the treated arm has
  larger residual spread at matched mean. Ordinary biology.
- **A condition measured at a different instrument setting**, where amplification changes the ratio of
  noise to signal rather than the signal alone.

**Lean: the first.** It needs no assumption about instrumentation and it is the case a reviewer raises
first.

## 4. The subject axis, and what already exists

Two axes, independent, and the register row names only one.

| Axis | What varies | What it unblocks |
|---|---|---|
| **Condition-level** | noise scale differs between conditions | specificity for the variance-change family; Stage 2's assumption; P4's anchor |
| **Subject-level (`s`)** | noise scale differs between subjects within a condition | P96 and P97's acceptance fixture |

`s` is defined in §1.7 as the dispersion of a per-subject log-normal multiplier on replicate noise,
after row-centring removes differences in level. The suspended test's false-positive rate on honest data
runs 0, 0, 25, 85, 100, 100 percent at `s` = 0, 0.15, 0.3, 0.5, 0.75, 1.0 against a nominal 1 percent.
The four clean paired fixtures read 0.041, 0.055, 0.162 and 0.199.

**The subject axis needs no build.** Step 0 found it whole:

- **`test/gen-copy-fidelity.mjs`** — the generator, tracked and committed. `sigmaS`, default 0.
  `SLADDER = [0, 0.15, 0.3, 0.5, 0.75, 1.0]`. Multiplier `exp(sigmaS·Z − sigmaS²)`, centred so the mean
  squared multiplier is 1 and pooled replicate noise stays at `sigma` however large `sigmaS` gets.
  Layout `SubjectID, Condition, Rep1..RepR` — the DS11 shape, 120 subjects per condition, exactly two
  conditions by design.
- **`test/s-dispersion.mjs`** — the estimator, tracked.
- **`probe-s351-s-gate.mjs`** and **`probe-s350-heterogeneity-grid.mjs`** — the drivers.

Nothing was landed-not-marked. What was missing is a `docs/shared/` pointer, and its absence cost a
round trip. **This section is that pointer.**

The `s` axis writes no datasets; both probes call `generate()` in memory. Result tables were kept, no
dataset was. That convention holds here.

## 5. What the generator needs, as an amendment

One new parameter beside `sigmaS`, defaulting off.

**`condNoiseRatio`** — the ratio `r` of replicate noise scale between the two conditions, applied on the
log scale so it survives the transform. Named as a ratio rather than `sigmaC` because it is a fixed
ratio between two conditions, not a dispersion across many subjects, and it should not borrow a name
that implies a symmetry it does not have.

```
sigmaA = sigma · √(2 / (1 + r²))
sigmaB = r · sigmaA
```

**The centring is the load-bearing part.** `sigmaA² + sigmaB² = 2·sigma²` at every `r`, so the file's
total replicate noise is fixed and only its split between the conditions moves. That matches what
`sigmaS` already does and it is what makes the ladder a clean instrument: the ratio is the only thing
varying, so a firing at a high rung cannot be a response to the file simply being noisier.

**The rejected form, recorded so it is not reintroduced:** `sigmaA = sigma/√r`, `sigmaB = sigma·√r`.
It holds the geometric mean of the sigmas fixed and lets pooled noise grow as `(r + 1/r)/2` — 1.25× at
`r = 2`, 1.45× at `r = 2.5`. Every rung would then differ from the control in two ways at once.

**At `r = 1` the generator must reproduce its current output exactly.** Same seed, same everything. That
is the negative control and it is cheap.

**This reverses a documented design decision and must be written as an amendment, not a silent
parameter.** The generator excludes a per-condition scale on the grounds that it would not be persistent
subject structure and would not produce the failure mode. That is correct and it is specific to P86. It
does not bind P106, whose failure mode is the other one. Amend the comment to say both things.

**Instrument negative control, and it is a stop condition.** Run `s-dispersion.mjs` at `sigmaS = 0`
across the `condNoiseRatio` ladder. **If the measured `s` moves with `r`, the two axes are separable in
the generator and not in the readout**, and no joint measurement is trustworthy until that is
understood. The precedent is exact: S351 found copy fidelity alone driving this same estimator across
its knee. An estimator can be contaminated by the thing it would gate, and this one already has been
once.

## 6. The instrument is a ladder

A single file returns a single verdict, and one verdict cannot tell a correctly quiet detector from a
lucky one. Sweep and report a curve.

- **Condition ratio `r`:** 1.0, 1.15, 1.3, 1.5, 1.65, 2.0, 2.5. Dense where the decisions are — 1.3 is
  the top of P4's stated anchor and 1.65 is its gate. 1.0 is the negative control.
- **Subject `s`:** the existing six rungs, unchanged, so the numbers compose with the S350 table rather
  than starting a second one.
- **Replicates:** 4 and 6, matching deposited practice. 12 and 24 only if resolution is questioned —
  `S350-PAIRED-DESIGN-DISPOSITION.md` shows replicates buy resolution and subjects do not.
- **Draws per rung:** 20, matching S351, so the spread is reported and not a point.

Output is one table: flag rate and median p per test per rung. **The headline number is the lowest
honest ratio at which any test in the family leaves LOW.**

## 7. The removable arm, and why it is in scope

The framework's limitations name the variance transform as what controls P4's exposure to mean-dependent
scale variation. Whether it is active is decided by `detectVST`, and the transform section records that
its slope test cannot do that job here:

> in multi-condition datasets, condition effects dominate total row variance, pushing the slope toward
> 0 regardless of the true within-replicate noise structure

The slope test only ever promotes to log; it never asserts raw. On a multi-condition file the
transform's state therefore falls back to the assay label. **Whether the stated control is active is
decided by a string in the header, not by the data.**

Make it a measurement rather than an argument: **emit each rung twice, under two assay labels, one that
defaults the transform on and one that defaults it off.** The gap between the two curves is the
control's actual effect.

**Step 0 changes this from optional to structural.** Because the generator's noise is constant-CV, the
removable mechanism is close to a no-op with the transform on and is the entire signal with it off.
There is no version of this measurement where the transform's state is a nuisance parameter. It is the
axis.

## 8. Which tests this exercises

Named from source, and **this list is a floor.**

- Selective Noise Partitioning (§1.3) — Bartlett homogeneity across columns
- Regional Noise Homogeneity (§4.2) — the test with a live adjudicated false positive from pooling
  across two noise regimes
- LOESS Residual Analysis (§2.7)
- Mean-Variance Noise Scaling (§4.1)
- Within-Row Variance (§4.3)
- Cross-Condition Consistency Stage 2 P4 — the primary target
- Cross-Condition Consistency Stage 3 P9

**To confirm, not assume:** Excess Kurtosis, where pooling across conditions of unequal variance can
invert the sign of its own statistic (P53), and Blocked Mahalanobis, which is covariance-based but
dispatches per condition and may be immune.

**One thing to check before the run, not after.** The generator emits 120 subjects × 2 conditions = 240
rows. Selective Noise Partitioning's effect-size gate engages at N ≥ 500, and P99 has that gate as a
conjunction whose halves move apart with N. **Report which side of it the instrument sits on**, because
a measurement taken below the gate describes a different regime from the deposits it is meant to speak
about.

## 9. Where the output lands

**Outside `FIXTURES` and outside `EXPECTED`.** P64 records the large clean fixture as deliberately
outside both, and that is the precedent. A severity-0 file the battery flags would otherwise fail the
batch, and **turning the batch red by adding a correct measurement is the wrong instrument** — as is the
mirror error of suppressing the flag to keep it green.

Instrument convention throughout: generator and probes under `test/`, result tables kept, datasets
ephemeral and regenerated from parameters. No ground-truth row is owed, because nothing asserts a
severity.

## 10. What this cannot settle

- **A rate from a generator is conditional on the generator's assumptions.** This bounds the
  false-positive rate under a stated noise model. It is not the field rate.
- **The corpus cannot measure the calibration of a tool shaped around it**
  (`TEST-GROUND-TRUTH.md` §Conventions). A file we also wrote narrows that problem and does not remove
  it.
- **The measurement is one-sided.** A firing on honest data convicts — the detector's claim must narrow.
  Silence at every rung exonerates only within the model. That direction is stated before the run, not
  after.

## 11. Decisions

1. **Mechanism — leaned, not yet exercised.** Irreducible, via a treatment that changes variability. The
   earlier lean on proportional noise is withdrawn: it probes the framework limitation, not Stage 2's
   assumption. Nothing built so far depends on it.
2. **One generator — settled.** `condNoiseRatio` beside `sigmaS` in `gen-copy-fidelity.mjs`, with the
   existing comment amended rather than overwritten. Dispatched at S361.
3. **The two-assay-label arm — still open.** Structural rather than optional per §7, but not in the S361
   dispatch, which builds the parameter and runs the contamination check only.
4. **What the result is allowed to change — settled at S361.** The number narrows what METHODOLOGY
   claims those tests mean. **No threshold moves on the strength of it.** Retiring P4's
   different-direction arm remains available as a design change, on the Stage 1 precedent, if that arm
   turns out to have no defensible null on honest data. The ±20–30% anchor is the sentence most likely
   to move.
