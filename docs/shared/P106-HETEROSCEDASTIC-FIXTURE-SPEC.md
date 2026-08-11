# P106 — honest heteroscedasticity: instrument spec

**Amended twice at S361. The second amendment follows the ladder and is the substantive one.**

**After the ladder ran (`7f35e75`).** The instrument was built, the negative control fired, the ladder
ran on 560 files, and the result partitioned the question rather than answering it. Three defects in
this document, all of them scope rather than arithmetic:

- **The layout it specifies cannot reach the target it names.** §1 makes P4 the primary target and §8
  lists P4 and P9 among the tests exercised. Both live in Cross-Condition Consistency, which the
  paired-design skip withholds whenever subjects are shared across conditions — which is exactly the
  layout §4 and §5 specify. **The two axes need opposite layouts and no single file carries both.**
- **Two more tests in §8's list are unreachable for their own reasons**, one structural and one
  unexplained. Recorded in §8.
- **§7 was filed as the second arm and is where every result landed.** Recorded in §7.

**Before the first version was committed at `feb7f1c`.** Two corrections, both to this document rather
than to anything measured.

- **§5's centring was wrong.** It specified `sigma/√r` and `sigma·√r`, which holds the geometric mean of
  the two condition sigmas fixed but lets the file's total replicate noise grow as `(r + 1/r)/2`. A test
  could then fire at a high ratio because the file got noisier, not because the conditions differ — the
  confound the ladder exists to avoid. The correct form is in §5 and it matches the centring `sigmaS`
  already uses. **The error was reaching for the tidier-looking formula while the correct pattern sat
  quoted one section above.**
- **Every citation into the methodology docs was wrong**, in two rounds. First the line numbers, read
  from a stale snapshot. Then the filename: the document was split, and five of six quotes had moved to
  `METHODOLOGY-TESTS.md` while this spec still named `METHODOLOGY.md` and stamped itself against a
  1,935-line file that no longer exists. Re-anchored in §0.

---

## 0. How this document cites the methodology docs

**Section names and quoted text are the anchor. Filenames and line numbers have both broken once.**

`METHODOLOGY.md` was split. The framework file is **741 lines** and holds preprocessing and the
cross-cutting properties; the test battery lives in **`METHODOLOGY-TESTS.md`**. **Always qualify a
section reference with a filename** — both files number sections in the same style, so `§2.7` alone is
ambiguous.

| Quote | File | Section | Line |
|---|---|---|---|
| "Replicate noise structure is an assay property…" | `METHODOLOGY-TESTS.md` | §1.9 Stage 2 — Residual-structure properties | 340 |
| "…rarely exceeds ±20–30% post-VST" | `METHODOLOGY-TESTS.md` | §1.9 Stage 2, the P4 paragraph | 358 |
| "Why pool-level properties are one-sided" | `METHODOLOGY-TESTS.md` | §1.9 Stage 1 — Pool-level properties | 336 |
| "Residual-structure properties on non-VST'd heteroscedastic data" | `METHODOLOGY-TESTS.md` | §1.9 framework limitations | 319 |
| "dispersion of a per-subject log-normal multiplier" | `METHODOLOGY-TESTS.md` | §1.7 Cross-group Residual Spike Correlation | 246 |
| "…condition effects dominate total row variance…" | `METHODOLOGY.md` | Variance-Stabilizing Transform preprocessing | 256 |

**Stamped against `METHODOLOGY-TESTS.md` at 1,269 lines and `METHODOLOGY.md` at 741.** If either file is
a different length, treat its numbers as stale and locate by the quoted text.

All six quotes were read at source and are verbatim. **Every section named here was correct before the
line numbers were available**, which is the argument for anchoring on sections and quotes rather than
numbers: the sections survived a file split that invalidated every number and one of the two
filenames.

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

**The two axes need opposite layouts, and this was not seen until the ladder ran.** The subject axis
measures dispersion between subjects and requires the same subjects in every condition. The condition
axis requires them disjoint: a shared subject identifier makes the file paired, and the paired-design
skip then withholds Cross-Condition Consistency, which carries both P4 and P9. **A condition-axis
instrument therefore needs a disjoint-subject emitter — the DS19 shape** — reported as a one-line
change to the generator's row-grouped emitter. One generator, two emitters, not one file.

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

**Instrument negative control — run at S361, and it fired.** At `sigmaS = 0` with nothing planted,
median `s` rises with `r`: 0.1444 → 0.2635 at 4 replicates, 0.0863 → 0.1799 at 6, over `r` = 1.0 → 2.5.
The top of the ladder sits inside the 0.245–0.317 band the gate was meant to discriminate on.

**The contamination is entirely the cross-condition pooling.** The same estimator reading one condition
is flat to four decimal places across the whole ladder. Two conditions of unequal variance make a
subject's residuals a two-component mixture, and the single-scale bias correction under-subtracts.

**So the pooled `s` readout is unusable on any file carrying a condition ratio.** The single-condition
readout is immune and has no resolution at deposited replicate counts — floor 0.229 at 4, 0.159 at 6.
That is S350's degrees-of-freedom conclusion reached from the variance side rather than the copy side,
and it hardens an existing finding rather than opening one. An estimator can be contaminated by the
thing it would gate, and this one now has two independent contaminants.

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

**Run at S361 over 560 files, and the headline number is degenerate.** It reads 1.0, and below 1.3, but
only because the floor fires — not because anything responds to the ratio. **Every rate is flat from
1.0 to 2.5**, on both assay labels and both replicate counts. Inter-Replicate Correlation reads 15% at
all seven rungs, Selective Noise 75% at all seven, Noise Scaling 85–95%.

**Rung 1.0 is not quiet, and that is the result.** On honest, homoscedastic, unfabricated data: under
the log transform, Inter-Replicate Correlation 15% and both Benfords 5%; on the raw arm, Noise Scaling
90%, Selective Noise 75%, LOESS 10%, Inter-Replicate Correlation 15%.

Full table at `docs/shared/S361-CONDITION-NOISE-LADDER.md`, `7f35e75`, regenerable from
`test/probes/probe-s361-ladder.mjs`.

**A ladder cannot be read on a floor like this whatever the layout.** Fixing the emitter and re-running
would produce a second degenerate table. The floor is now the more valuable object.

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

**Step 0 changed this from optional to structural. The measurement went further: it is where every
result landed.**

Run at S361 with `general` giving the log transform and `plate_reader` giving raw, both continuous, so
only the transform differs. **Bartlett and the mean-variance slope both read honest log-normal data on
the raw scale as grossly anomalous — 75% and 90% — and both go silent once it is logged.**

Neither test is malfunctioning. Raw log-normal data genuinely has mean-variance coupling and genuinely
has unequal column variances. **The defect is that a true property of honest data is surfaced as a
fabrication signal**, and decision 4 already governs what follows: the number narrows what those tests
claim, and no threshold moves.

**On this generator the transform's state decides whether the battery is usable at all.** That is not a
side-control, and §7's original framing as "the second arm" was wrong about which arm mattered.

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

### What the ladder found about this list

**Five of 29 tests return not-applicable on the shared-subject layout**, and two of them are on the list
above:

| Test | Cause |
|---|---|
| **Cross-Condition Consistency** — carries P4 and P9 | `subjectsSharedAcrossConditions` |
| **Residual Spike Correlation** | `subjectsSharedAcrossConditions` |
| Column Goodness-of-Fit | `shapeNotCovered` |
| Cross-Condition Rank Correlation | `premiseVoid` |
| Missing Data Pattern | `missingnessOutOfBand` |

**Selective Noise Partitioning is structurally blind to this axis**, gate or no gate. Bartlett compares
columns *within* a condition while `condNoiseRatio` varies noise *between* conditions, so the measured
ratio of 1.195 is sampling noise across six columns. On the gate question: **`N` is the residual count,
not rows** (`selectiveNoise.js:82`) — 720 per condition at 6 replicates, above the 500 threshold and
suppressed; 480 at 4 replicates, below it and active. Both counts are worth measuring for P99's sake,
but neither makes the test see this axis.

**Regional Noise Homogeneity reads zero at every rung and nothing yet explains it.** One cheap read
would settle it: whether the generator emits condition rows blocked or interleaved. If interleaved,
every sliding window holds both conditions in equal measure and the test cannot see a between-condition
difference by construction. **That is a hypothesis, not a finding.**

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

1. **Mechanism — settled and superseded by the result.** `condNoiseRatio` is the irreducible mechanism
   and it is built. Nothing responds to it on the layout tested, so the mechanism is not what is in
   question.
2. **One generator — settled, with a correction.** One generator, **two emitters**: shared subjects for
   the `s` axis, disjoint subjects for the condition axis. The single-file version was never possible.
3. **The two-assay-label arm — settled by running it.** It was not the second arm. It is where the
   result is.
4. **What the result is allowed to change — settled at S361, before the numbers existed.** The
   measurement narrows what `METHODOLOGY-TESTS.md` claims those tests mean. **No threshold moves on the strength of
   it.** That ruling now has something to govern: Noise Scaling at 90% and Selective Noise at 75% on
   honest raw log-normal data are documentation changes, not threshold changes.

## 12. What this instrument cannot do, learned by running it

- **It cannot reach P4 or P9**, which §1 named as the primary target. That needs the disjoint-subject
  emitter.
- **It cannot read a ladder while the floor fires.** Whatever the layout, a rate that is already 75% at
  rung 1.0 has no room to report a response to the ratio.
- **It cannot say whether any of this happens in the field.** §10 said so before the numbers existed,
  which is the only reason it can be said now without sounding like a hedge. These rates bound the
  false-positive rate under a log-normal noise model from a generator we wrote.

**The one number that survives all three caveats is Inter-Replicate Correlation at 15%.** It fires on
honest data with no copy, no dispersion and no ratio, at the same rate under both assay labels — so the
log-normal story does not explain it, and there is no transform state to blame and no true property
being mislabelled. The costing run caught one at p = 0.00033, HIGH, severity 2. **A test that calls HIGH
on roughly one honest file in seven is a different class of problem from the raw-arm two**, and it is
the open question this instrument produced.
