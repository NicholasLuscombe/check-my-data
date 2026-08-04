# Paired-design disposition — Cross-Condition Consistency and Residual Spike Correlation

**Status:** decided at S350. Implementation not yet dispatched.
**Owner:** Chat. Tracked file; must land as a commit.
**Supersedes:** P82's framing as one defect with one fix across two tests.

---

## 1. What was measured

Two tests build a permutation null that shuffles rows freely across conditions. On matched-pairs data
that destroys the pairing the design imposes, so permuted pseudo-conditions differ more than the real
matched pair does.

**Cross-Condition Consistency.** On `09-proteomics-clean` — 200 pairs matched by `ProteinID`, which is
a **row-grouped** fixture, so the pairing key is a label column rather than the row index — the
shipped null flags on 20 of 20 seeds at 9,999 permutations. Changing only the null moves the driving
statistic from the 0.07th percentile of its reference distribution to the 67.9th and the flag goes
away. Every unit was checked for invariance under a within-subject swap and none is invariant, so the
corrected null relocates the reference rather than flattening it.

Against a copy-fidelity attack, with copy noise *k* expressed as a multiple of the file's own replicate
noise:

| null | detection |
|---|---|
| corrected, within-subject | 0 of 20 at every fidelity, including a perfect copy |
| shipped, free | 100% at a perfect copy, 10% one step along, zero thereafter |

**Residual Spike Correlation.** The same shared mis-specification, opposite consequences. Under the
free null, detection runs 100% out to *k* = 0.4, then 95%, 55%, reaching zero where the copy reaches
independence. Under the corrected null, zero everywhere, median *p* = 1.000 against a perfect copy.

Its detection is real where it fires. On `11-rnaseq-multicondition` the nine flagged genes are all
planted and are the sole occupants of that cell, against a chance expectation of about half a gene.

But its false-positive rate under the free null depends on a property of the data. Writing *s* for the
dispersion of a per-subject log-normal multiplier on replicate noise — how much subjects differ in
intrinsic noisiness, after row-centring removes differences in level:

| *s* | 0 | 0.15 | 0.3 | 0.5 | 0.75 | 1.0 |
|---|---|---|---|---|---|---|
| false-positive rate on honest data, nominal 1% | 0% | 0% | 25% | 85% | 100% | 100% |

Above *s* ≈ 0.5 the output carries no fidelity information at all. The corrected null is immune to this
failure mode and also has no power.

**The corpus anchor, and its limit.** The four clean paired fixtures measure *s* = 0.041, 0.055, 0.162
and 0.199, the last being `09-proteomics-clean`, the only one with enough subjects to resolve. All sit
at or below 0.2 and the knee falls between 0.2 and 0.3. **These are fixtures our own generators built,
with no reason to include noise-scale heterogeneity, so finding them homoscedastic is close to
circular.** It locates our corpus. It says nothing about real deposits.

---

## 2. Decision — Cross-Condition Consistency is skipped on paired data

Neither null offers a usable operating point. The corrected null has no power at any fidelity. The free
null detects only a noiseless copy — which a hash comparison or a scatterplot finds more reliably — and
produces a measured false positive on honest paired data.

**Scope of the claim.** This is established for pairwise copy attacks. Designs with three or more
conditions admit copy patterns two conditions cannot express, and those are untested. State the result
that way; do not state it universally.

**Cost: zero.** The two fixtures declaring a Cross-Condition Consistency channel are both unpaired, so
no batch assertion breaks.

---

## 3. Decision — Residual Spike Correlation is suspended on paired data, pending a bound on *s*

**The reason is unbounded risk, not invalid calibration.** An earlier draft of this section argued that
a p-value drawn from a null the data violates is not the quantity it claims, so RSC's output is
illegitimate whatever its performance. That argument is true and its scope is wrong, and the error is
worth recording because it looked identical to correct reasoning.

Applied consistently it does not remove two tests. The S349 census found twenty condition-partitioned
dispatch entries — seven permutation, three simulation, ten **analytic**, and an analytic null assuming
independent samples on paired data is the same flaw by a different mechanism. P83 adds that
`aggregatePerGroup` combines by Fisher and Šidák, both exact only under independence, on a branch where
the groups are the same subjects. On a paired file the calibration objection reaches nearly everything
the tool emits, including tests where no defect has been measured. Removing two while keeping eighteen
is not that argument being applied; it is that argument being cited where a measurement had already
done the work.

**It is also the wrong criterion for a screening instrument.** What decides whether a screen may ship
is its operating characteristics — false-positive rate on honest data, detection rate on fabricated
data — and those are measurable whether or not the nominal p is calibrated. For RSC we have them, and
they are not marginal:

- Below *s* ≈ 0.2: 100% detection out to *k* = 0.4, zero false positives. Excellent.
- Above *s* ≈ 0.3: false positives at 25%, rising to 100% on wholly honest data by *s* = 0.75.

**So the basis for suspension is narrower and more contingent.** The false-positive rate turns on a
property of the data we cannot yet bound in the field, and above the knee it reaches certainty on
honest files. Unbounded risk in that direction disqualifies it from shipping. That is a fact about what
we have measured, not a principle about p-values, and it comes with its own remedy: **measure *s* in
real deposits and the suspension lifts or becomes permanent on evidence.**

**Suspended means skipped, not reported descriptively.** A bare statistic in a forensics report is read
as evidence by the people this tool is built for. The skip must not read as a pass either: the correct
statement is *not evaluated*, not *clean*.

**Cost: both of its declared channels.** `02-densitometry-fabricated` and `11-rnaseq-multicondition`
are both paired, so both lose an asserted channel and the batch will fail on assertion (b) until the
declarations are revised. That revision rests on construction-level adjudication of what was planted,
not on making the batch green — but note the precedent runs the other way at S339, where a channel came
out because it fired outside its planted window. Here a **true detection** is being suspended because
its risk profile is unbounded, and the declarations should record it as suspended rather than deleted.

RSC then runs only on unpaired data, where nothing in the corpus validates it. Recorded in section 6.

**The *s*-gate is the reinstatement route, not a rejected option.** Gate RSC on measured *s* — run below
the knee, skip above it. It is not shippable today because the threshold is fitted from one generator,
the estimator's resolution floor is about 0.055, and the corpus's largest value sits at 0.199 against a
knee at 0.2 to 0.3. Every one of those is a measurement problem with a known fix, not a design
objection.

---

## 4. Establishing pairing

Two different jobs, and only one needs a mechanism.

**Column-grouped: pairing is structural and universal.** Each condition is a column subset of the same
rows, so row *r* is the same subject in every condition. No detection, no gate, no flag.

**Row-grouped: pairing must be evidenced.** It requires an identifier column in which every subject
appears exactly once in every condition, with identical subject sets across conditions. That identifier
is discarded by `extractAnalysisInputs` before either test sees the data and has to be plumbed through
the condition context.

**Default unpaired when the evidence is absent.** A false *unpaired* inflates the null and produces
false accusations. A false *paired* builds a null that is too tight and hides fabrication. Both are
bad; only one lets a fabricator through.

**Do not wire any of this to `condCtx.paired`.** It has one reader in all of `src/`, it is `false` on
the row-grouped branch, and `forSubMatrix` rebuilds children with `groups: null` so every child reads
`false`. An implementation built on it looks complete and leaves the measured defect in place.

**Reach: 9 of 27 fixtures** — 4 column-grouped, 5 row-grouped and fully paired. Both tests run on 16
and both lose the same 9.

---

## 5. The register split

P82 carried two tests, one shared assumption and an implied shared fix. The assumption is shared; the
fixes and the costs are not. Splitting it.

- **P82** — Cross-Condition Consistency on paired data. Decided in section 2. Blocker until implemented.
- **P86** *(new)* — Residual Spike Correlation on paired data. Suspended in section 3, not retired.
  Blocker until implemented, and **its resolution is a measurement rather than a redesign**: bound *s*
  in real deposits and the *s*-gate either ships or the suspension becomes permanent. A successor
  statistic — separating "the same residual pattern across conditions" from "extreme in every
  condition", building on DS11's 0.741 against −0.026 — is the fallback if the bound comes back bad,
  not the primary route.
- **P87** *(new)* — the `similar`-only direction filter on Stage-1 properties. Five floor-censored
  `different`-direction units were measured being discarded on `02-densitometry-fabricated`. **DS02 is
  paired, so section 2 removes the only observed instance.** The question survives on unpaired data
  with an empty evidence base, and direction was measured to be a property of the null rather than of
  the unit.
- **P88** *(new)* — does a null the data violates disqualify a test's inferential output, battery-wide?
  Raised and then withdrawn as the basis for section 3. It is a real question and it is not RSC's: it
  reaches P83's combiner and the twenty condition-partitioned entries, ten of which are analytic. Until
  it is decided, **the argument should not be cited anywhere** — not for a test we want to keep and not
  for one we want to drop.

The shared assumption links P82 and P86 and belongs in the methodology, not in either entry.

---

## 6. Not decided here

- **Is real deposited data's per-subject noise-scale dispersion below about 0.25?** This is the whole of
  RSC's field safety and it now decides a shipped behaviour rather than informing one: below the knee
  a working detector goes back in, above it the suspension stands. It belongs to P65, and it converts
  P65 from a validation programme into the specific measurement that settles P86. My expectation is
  that real data sits above the knee, since replicate variance commonly scales with abundance — but
  that is a prediction, and predictions have fared badly this session.
- **Does RSC earn a place on unpaired data with no ground truth?** Section 3 removes both of its
  validating fixtures.
- **Severity effects of removing two tests on 9 of 27 files.** Nothing guards the exit from severity
  zero. Measure before shipping.
- **Three-or-more-condition partial-copy attacks** against Cross-Condition Consistency.
- **P84**, Cross-Condition Rank Correlation asserting a correspondence rather than destroying one.
  Untouched.
