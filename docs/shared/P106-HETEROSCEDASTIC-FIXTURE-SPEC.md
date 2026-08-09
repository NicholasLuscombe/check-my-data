# P106 — honest heteroscedasticity: instrument spec

**Owner:** Chat. **Destination:** `docs/shared/`, tracked, lands as a docs-only commit to main.
**Written S361, amended S361 after Step 0 returned.** Route (a): build the instrument, measure the rate,
let the number narrow what the tool claims. Route (b) — a fixture whose honest variance change carries a
feature a better detector could use — was refused, because it presupposes a discriminator nobody has
specified and would tune the instrument on the answer.

**On the citations below.** Line numbers into `METHODOLOGY.md` are a convenience and they go stale — the
file is 1,919 lines and Chat-owned, so any edit moves them. **The quoted text is the anchor.** Re-locate
by the quote or the section name; do not trust a number from this document once METHODOLOGY has changed.

---

## 1. What this decides

Several tests in the battery respond to a change in noise scale. Every fixture that carries such a
change also carries a fabrication, so **for the whole family a variance change and a fabrication are the
same object in the corpus.** Specificity is unmeasured, not measured-and-good.

The instrument separates them: generate honest data whose noise scale varies, hold everything else
fixed, report what the battery does. **It is not a fixture and not a regression case.** Its output is a
curve.

**The sharpest single target is one number.** Cross-Condition Consistency P4's different-direction gate
sits at 0.5 in log ratio, about 1.65×, and `METHODOLOGY.md:813` anchors it against cross-condition noise
variation "which rarely exceeds ±20–30% post-VST". That anchor is a belief about honest data with
nothing measured behind it, and it decides where a flag falls. This instrument either validates it or
refutes it.

## 2. The assumption under test, quoted where it lives

`METHODOLOGY.md:798`, the load-bearing claim for the two-sided design of Stage 2:

> Replicate noise structure is an assay property, not a condition property — in honest data it is
> preserved across conditions regardless of treatment.

Nothing measures this. Same shape as the permutation arithmetic that was wrong for the life of the
project: **a stated derivation with no test behind it.**

Stage 1 faced the same problem and solved it correctly. P1, P2 and P3 fold location and scale together,
so they are one-sided on "similar" only, and a genuine dispersion difference goes to the informational
section rather than to a flag (`:794`). **Stage 2 declined that route, and the sentence above is the
reason it gave.**

A second and distinct claim sits at `:777`: on data the variance transform does not reach, P4 can flag
legitimate mean-dependent scale variation, and the transform is named as the control. That one is
already documented as a conditional limitation. It is a different measurement, and §3 keeps them apart.

## 3. Two kinds of heteroscedasticity, and they are not interchangeable

| | Mechanism | Survives the log transform? | Which claim it probes |
|---|---|---|---|
| **Removable** | proportional noise, conditions at different means; per-condition gain | **No** — removed exactly | `:777`, a documented limitation with a named control |
| **Irreducible** | conditions with different replicate noise scale at the same mean | **Yes** | `:798`, the unmeasured assumption, and P4's ±20–30% anchor |

Step 0 established that the existing generator draws replicate noise on the log scale at constant
`sigma`. Under that model a condition mean shift changes no log-scale variance at all — and the
generator already plants a mean shift (`effectFrac: 0.20`, `effectFold: 1.5`) while asserting that the
two conditions' marginal spreads match.

**So the mechanism this spec first leaned on lives entirely on the raw scale.** It is the case the
transform was built for. Measuring with it and finding nothing would say the transform works, not that
the assumption holds.

**Corrected lean: irreducible first.** It is what `:798` claims cannot happen and what P4's anchor
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
| **Condition-level** | noise scale differs between conditions | specificity for the variance-change family; `:798`; P4's anchor |
| **Subject-level (`s`)** | noise scale differs between subjects within a condition | P96 and P97's acceptance fixture |

`s` is defined at `METHODOLOGY.md:704`. The suspended test's false-positive rate on honest data runs
0, 0, 25, 85, 100, 100 percent at `s` = 0, 0.15, 0.3, 0.5, 0.75, 1.0 against a nominal 1 percent. The
four clean paired fixtures read 0.041, 0.055, 0.162 and 0.199.

**The subject axis needs no build.** Step 0 found it whole:

- **`test/gen-copy-fidelity.mjs`** — the generator, tracked and committed. `sigmaS` at `:148`, default
  0. `SLADDER = [0, 0.15, 0.3, 0.5, 0.75, 1.0]` at `:175`. Multiplier `exp(sigmaS·Z − sigmaS²)` at
  `:290`, centred so pooled replicate noise stays at `sigma` and only its distribution between subjects
  moves. Layout `SubjectID, Condition, Rep1..RepR` at `:358` — the DS11 shape, 120 subjects per
  condition, exactly two conditions by design at `:101`.
- **`test/s-dispersion.mjs`** — the estimator, tracked.
- **`probe-s351-s-gate.mjs`** and **`probe-s350-heterogeneity-grid.mjs`** — the drivers.

Nothing was landed-not-marked. What was missing is a `docs/shared/` pointer, and its absence cost a
round trip. **This section is that pointer.**

The `s` axis writes no datasets; both probes call `generate()` in memory. Result tables were kept, no
dataset was. That convention holds here.

## 5. What the generator needs, as an amendment

One new parameter beside `sigmaS`, defaulting off.

**`sigmaC`** — a per-condition multiplier on replicate noise scale, applied on the log scale so it
survives the transform. Centred the way `sigmaS` is: for a ratio `r` across the two conditions, set the
condition sigmas to `sigma/√r` and `sigma·√r`, so their geometric mean stays at `sigma` and the ratio is
the only thing that moves. **At `r = 1` the generator must reproduce its current output exactly.** That
is the negative control and it is cheap.

**This reverses a documented design decision and must be written as an amendment, not a silent
parameter.** `gen-copy-fidelity.mjs:180` excludes a per-condition scale on the grounds that it would not
be persistent subject structure and would not produce the failure mode. That is correct and it is
specific to P86. It does not bind P106, whose failure mode is the other one. Amend the comment to say
both things.

**Instrument negative control, and it is a stop condition.** Run `s-dispersion.mjs` at `sigmaS = 0`
across the `sigmaC` ladder. **If the measured `s` moves with `sigmaC`, the two axes are separable in the
generator and not in the readout**, and no joint measurement is trustworthy until that is understood.
The precedent is exact: S351 found copy fidelity alone driving this same estimator across its knee. An
estimator can be contaminated by the thing it would gate, and this one already has been once.

## 6. The instrument is a ladder

A single file returns a single verdict, and one verdict cannot tell a correctly quiet detector from a
lucky one. Sweep and report a curve.

- **Condition ratio `r`:** 1.0, 1.15, 1.3, 1.5, 1.65, 2.0, 2.5. Dense where the decisions are — 1.3 is
  the top of P4's stated anchor and 1.65 is its gate. 1.0 is the negative control.
- **Subject `s`:** the existing six rungs, unchanged, so the numbers compose with the S350 table rather
  than starting a second one.
- **Replicates:** 4 and 6, matching deposited practice. 12 and 24 only if resolution is questioned —
  `S350-PAIRED-DESIGN-DISPOSITION.md:190` shows replicates buy resolution and subjects do not.
- **Draws per rung:** 20, matching S351, so the spread is reported and not a point.

Output is one table: flag rate and median p per test per rung. **The headline number is the lowest
honest ratio at which any test in the family leaves LOW.**

## 7. The removable arm, and why it is in scope

`METHODOLOGY.md:777` names the variance transform as what controls P4's exposure to mean-dependent
scale variation. Whether it is active is decided by `detectVST`, and `:215` records that its slope test
cannot do that job here:

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
  (`TEST-GROUND-TRUTH.md:147`). A file we also wrote narrows that problem and does not remove it.
- **The measurement is one-sided.** A firing on honest data convicts — the detector's claim must narrow.
  Silence at every rung exonerates only within the model. That direction is stated before the run, not
  after.

## 11. Decisions needed from Nick

1. **Mechanism.** Lean corrected to irreducible, via a treatment that changes variability. The earlier
   lean on proportional noise is withdrawn — it tests `:777`, not `:798`.
2. **One generator.** Default resolved by Step 0: amend `gen-copy-fidelity.mjs` with `sigmaC` beside
   `sigmaS`, and amend the comment at `:180` rather than overwrite it.
3. **The two-assay-label arm is in scope from the start.** No longer a cost question — with constant-CV
   noise it decides whether the removable arm has anything to measure.
4. **What the result is allowed to change.** Untouched by Step 0 and still worth settling before a
   number exists. If a test fires at an honest ratio of 1.5, route (a) says the outcome is an edit to
   what METHODOLOGY claims that test means. It is not a threshold change, and P4's ±20–30% anchor is the
   sentence most likely to move.
