# Paired-design disposition — Cross-Condition Consistency and Residual Spike Correlation

**Status:** decided at S350. §1 corrected and §3, §4, §5, §6 revised at S351 on measurement.
Cross-Condition Consistency **implemented** at `ee2fe48`. Residual Spike Correlation **not implemented**.
**Owner:** Chat. Tracked file; must land as a commit.
**Supersedes:** P82's framing as one defect with one fix across two tests, and its own S350 statement
that P86 resolves by measurement rather than redesign.

---

## 1. What was measured

Two tests build a permutation null that destroys the correspondence the design imposes between row *r*
in one condition and row *r* in another. They do it by opposite operations. Cross-Condition Consistency
shuffles row tuples across conditions, so the condition tags move under fixed rows, and all seven of its
arms share that one shuffle. Residual Spike Correlation shuffles each condition's residual vector within
itself, so the rows move under fixed tags. Either way the matched pair is broken, and permuted
pseudo-conditions differ more than the real matched pair does. **The scope rule is the destroyed
correspondence, not the direction of the shuffle** — a rule phrased as "shuffles rows across conditions"
reaches all of Cross-Condition Consistency and none of Residual Spike Correlation. *(Corrected S351 from
the arm-level read of both tests' nulls.)*

**Cross-Condition Consistency.** On `09-proteomics-clean` — 200 pairs matched by `ProteinID`, which is a
**row-grouped** fixture, so the pairing key is a label column rather than the row index — the shipped
null flags on 20 of 20 seeds at 9,999 permutations. Changing only the null moves the driving statistic
from the 0.07th percentile of its reference distribution to the 67.9th and the flag goes away. Every unit
was checked for invariance under a within-subject swap and none is invariant, so the corrected null
relocates the reference rather than flattening it.

*S351 addendum: at the shipped resample ladder rather than at B = 9,999, the same fixture flags on three
of eight offsets and is LOW on the shipped stream at p = 0.012. The defect is the same; its rate depends
on the count.*

Against a copy-fidelity attack, with copy noise *k* expressed as a multiple of the file's own replicate
noise:

| null | detection |
|---|---|
| corrected, within-subject | 0 of 20 at every fidelity, including a perfect copy |
| shipped, free | 100% at a perfect copy, 10% one step along, zero thereafter |

**Residual Spike Correlation.** The same shared mis-specification, opposite consequences. Under the free
null, detection runs 100% out to *k* = 0.4, then 95%, 55%, reaching zero where the copy reaches
independence. Under the corrected null, zero everywhere, median *p* = 1.000 against a perfect copy.

Its detection is real where it fires, and **both firings have now been adjudicated against construction.**
On `11-rnaseq-multicondition` the nine flagged genes are all planted and are the sole occupants of that
cell, against a chance expectation of about half a gene. On `02-densitometry-fabricated` the firing
collapses when and only when the rescaled copy is removed, against a variance-matched control that
preserves the marginal distribution and removes only the shared noise realisation; the clean sibling
`01-densitometry-clean` returns *p* = 1.000 with zero overlap on all three pairs.

But its false-positive rate under the free null depends on a property of the data. Writing *s* for the
dispersion of a per-subject log-normal multiplier on replicate noise — how much subjects differ in
intrinsic noisiness, after row-centring removes differences in level:

| *s* | 0 | 0.15 | 0.3 | 0.5 | 0.75 | 1.0 |
|---|---|---|---|---|---|---|
| false-positive rate on honest data, nominal 1% | 0% | 0% | 25% | 85% | 100% | 100% |

Above *s* ≈ 0.5 the output carries no fidelity information at all. The corrected null is immune to this
failure mode and also has no power.

**The corpus anchor, and its limit.** The four clean paired fixtures measure *s* = 0.041, 0.055, 0.162
and 0.199. All sit at or below 0.2 and the knee falls between 0.2 and 0.3. **These are fixtures our own
generators built, with no reason to include noise-scale heterogeneity, so finding them homoscedastic is
close to circular.** It locates our corpus. It says nothing about real deposits.

---

## 2. Decision — Cross-Condition Consistency is skipped on paired data

**Implemented at S351 (`ee2fe48`).**

Neither null offers a usable operating point. The corrected null has no power at any fidelity. The free
null detects only a noiseless copy — which a hash comparison or a scatterplot finds more reliably — and
produces a measured false positive on honest paired data.

**Scope of the claim.** This is established for pairwise copy attacks. Designs with three or more
conditions admit copy patterns two conditions cannot express, and those are untested. State the result
that way; do not state it universally.

**Cost: zero, now measured rather than asserted.** The two fixtures declaring a Cross-Condition
Consistency channel are `15-missing-carlisle` and `19-inheritance-fabricated`, derived from
`test/batch-fixtures.mjs` rather than from prose, and both are unpaired. Across all nine paired fixtures
the skip moved no severity at all. On `09-proteomics-clean` it removes a recorded false positive: the
file left severity 0 on three of eight offsets and returns to 0 on every offset with the test skipped.

**DS19 is the case worth recording.** It is a genuine cross-condition inheritance fabrication whose only
real channel is this test, so a skip reaching it would take a fabricated fixture to severity 0. It does
not: its `ID` column runs disjoint across conditions, so the file records no correspondence and the
default-unpaired clause makes *unpaired* the correct answer. **A fabricator controls the pairing
evidence.** The remedy is not to keep the free null but that the noiseless-copy case belongs to a direct
copy detector, which this section already notes finds it more reliably.

---

## 3. Decision — Residual Spike Correlation is suspended on paired data

**Not implemented.** The suspension stands. What changed at S351 is its cost, which is higher, and its
reinstatement route, which is gone.

**The reason is unbounded risk, not invalid calibration.** An earlier draft of this section argued that a
p-value drawn from a null the data violates is not the quantity it claims, so the output is illegitimate
whatever its performance. That argument is true and its scope is wrong, and the error is worth recording
because it looked identical to correct reasoning.

Applied consistently it does not remove two tests. The S349 census found twenty condition-partitioned
dispatch entries — seven permutation, three simulation, ten **analytic**, and an analytic null assuming
independent samples on paired data is the same flaw by a different mechanism. P83 adds that
`aggregatePerGroup` combines by Fisher and Šidák, both exact only under independence, on a branch where
the groups are the same subjects. On a paired file the calibration objection reaches nearly everything
the tool emits, including tests where no defect has been measured. Removing two while keeping eighteen is
not that argument being applied; it is that argument being cited where a measurement had already done the
work.

**It is also the wrong criterion for a screening instrument.** What decides whether a screen may ship is
its operating characteristics — false-positive rate on honest data, detection rate on fabricated data —
and those are measurable whether or not the nominal p is calibrated. For this test we have them, and they
are not marginal:

- Below *s* ≈ 0.2: 100% detection out to *k* = 0.4, zero false positives. Excellent.
- Above *s* ≈ 0.3: false positives at 25%, rising to 100% on wholly honest data by *s* = 0.75.

**So the basis for suspension is narrow and contingent.** The false-positive rate turns on a property of
the data we cannot yet bound in the field, and above the knee it reaches certainty on honest files.
Unbounded risk in that direction disqualifies it from shipping. That is a fact about what we have
measured, not a principle about p-values.

**Cost: two adjudicated true detections, and two severity tiers on one of them.** Both declaring
fixtures — `02-densitometry-fabricated` and `11-rnaseq-multicondition` — are paired, and both firings
have been adjudicated against construction and found real. Suspension therefore breaks batch assertion
(b) on both, **and assertion (a) on DS02**, whose severity falls 3 → 1 on all eight offsets. A
rescaled-copy fabrication would read *Review* rather than *Investigate closely*.

The severity structure is worth stating because it is not a formula artefact. DS02's severity 3 comes
from two MODERATEs across two dimensions: Inter-Replicate Correlation on `replicate` and this test on
`copied`. The two are not independent — Inter-Replicate Correlation fires only on the conjunction of the
copy and the replicate lock, while this test needs only the copy. **It is load-bearing because it is the
sole direct reading of the fixture's primary mechanism**, not because the formula happens to want a
second dimension.

**The declarations record as suspended, not deleted.** The precedent runs the other way at S339, where a
channel came out because it fired outside its planted window. Here true detections are being withdrawn
for an unbounded risk profile, and the record should say so.

The test then runs only on unpaired data, where nothing in the corpus validates it. Recorded in §6.

### The *s*-gate is not buildable as specified

**This retires the S350 statement that gating on measured *s* is the reinstatement route.**

Gating meant: measure *s*, run below the knee, skip above. The S351 sweep — 20 datasets per cell on
generator data planted at *s* = 0, so any reading is estimator noise or copy-induced and nothing else —
found that **copy fidelity alone drives the estimator across the knee.**

| *k* | measured *s*, median [min..max] | fires | median *p* |
|---|---|---|---|
| 0 (perfect copy) | **0.261** [0.215..0.312] | 20/20 | 0.0010 |
| 0.2 | 0.247 [0.209..0.315] | 20/20 | 0.0010 |
| 0.5 | 0.215 [0.158..0.264] | 19/20 | 0.0010 |
| 0.8 | 0.143 [0.053..0.202] | 1/20 | 0.0825 |
| 1 (independence) | **0.050** [0.000..0.138] | 0/20 | 0.5425 |

Strictly monotone at all ten rungs. Copy fidelity moves the estimate by 0.21 with nothing planted,
because a copy makes two conditions share one noise realisation and a subject then carries fewer
independent degrees of freedom than the correction assumes. The estimator reads the shortfall as
dispersion. **The gate and the detector read the same signal in opposite directions.**

Four reasons the gate fails, any one sufficient:

1. **The contamination is a curve**, not a fixture quirk.
2. **At a perfect copy, 13 of 20 files read at or above 0.25 while all 20 fire at p = 0.001.** The gate
   would skip the test on the majority of its best case.
3. **No threshold separates the populations.** Honest-heteroscedastic files span [0.245..0.553];
   copy-fabricated span [0.182..0.317]. They overlap on [0.245, 0.317], and that band holds 53 of 100
   fabricated files. Not a tail effect.
4. **Both adjudicated true detections read above the threshold because of their own fabrication.** DS02
   goes 0.319 → 0.173 when the rescale is removed; DS11 goes 0.2716 → 0.0000 when twenty planted genes
   out of five hundred are ablated. Two different mechanisms, the same inflation.

**Correction to this section's own figure.** It previously called the estimator's resolution floor "about
0.055", which states a point where the measurement gives a spread: honest zero-dispersion files at 120
subjects and 6 replicates read anywhere in [0.000, 0.140].

**And the resolution problem is not fixable by choosing which files to gate.** Tripling subjects from 35
to 120 narrows the spread by about a tenth, where sampling on an SD predicts 1.85×. Replicates are what
buy resolution: 6 → 12 → 24 takes the spread 0.141 → 0.084 → 0.052, with the median unbiased throughout.
**Replicate count is a property of the deposited experiment.**

**The obvious remedy is measured and also blocked.** Estimating the scale within one condition is immune
to a copy by construction, but reads up to 0.214 on zero-dispersion data at 6 replicates — inside the
knee it would gate on. It needs about 12 replicates per subject; the paired fixtures carry 4 or 6. Both
routes are blocked by one degrees-of-freedom budget, so the gate needs a different estimator **and** more
replicates than deposits generally carry — not a better-fitted threshold.

---

## 4. Establishing pairing

**Implemented at S351.** `computeSubjectPairing` in `src/analysis/subjectPairing.js`, called from
`extractAnalysisInputs` because that is the only scope holding the data, the roles and the filtered
indices together, and the identifier is dropped from the matrix two statements later. Stored as
`condCtx.subjectPairing`, its own field. `withMatrix` carries it onto transformed children.

**Column-grouped: pairing is structural and universal.** Each condition is a column subset of the same
rows, so row *r* is the same subject in every condition. No detection, no gate, no flag.

**Row-grouped: pairing must be evidenced.** It requires an identifier column in which every subject
appears exactly once in every condition, with identical subject sets across conditions.

**The identifier is not the first label column.** DS03 and DS04 carry two. `ID` is distinct within each
condition and disjoint across them; `Target` is distinct within and identical across. They qualify on
`Target`. A rule reading only the first label column returns seven fixtures rather than nine, **and it
fails silently**, because the disqualifying shape is uniform across the corpus.

**Default unpaired when the evidence is absent.** A false *unpaired* inflates the null and produces false
accusations. A false *paired* builds a null that is too tight and hides fabrication. Both are bad; only
one lets a fabricator through.

**Do not wire any of this to `condCtx.paired`.** It has one reader in all of `src/`, it is `false` on the
row-grouped branch, and `forSubMatrix` rebuilds children with `groups: null` so every child reads
`false`. An implementation built on it looks complete and leaves the measured defect in place.

**Reach: 9 of 27 fixtures**, confirmed by independent derivation over all 27 rather than over a clean
subset. Column-grouped: DS01, DS02, DS16, DS17. Row-grouped with identifier evidence: DS03 and DS04 on
`Target`, DS09 and DS10 on `ProteinID`, DS11 on `GeneID`. Both tests run on 16 and both lose the same 9.

**Skip semantics.** *Not evaluated*, never *clean*, and no bare statistic — a number in a forensics
report is read as evidence whatever label sits beside it. The shipped skip returns before anything is
computed, so no number exists to suppress.

---

## 5. The register split

P82 carried two tests, one shared assumption and an implied shared fix. The assumption is shared; the
fixes and the costs are not.

- **P82** — Cross-Condition Consistency on paired data. Decided in §2, **implemented at S351, closed.**
- **P86** — Residual Spike Correlation on paired data. Suspended in §3, not retired. Blocker until
  implemented. **Its route is a redesign, not a measurement.** *(This reverses the S350 ordering, on the
  S351 sweep.)* A successor statistic — separating "the same residual pattern across conditions" from
  "extreme in every condition", building on DS11's 0.741 against −0.026 — is the **primary** route,
  because the defect is that noisy subjects occupy the top-K in every condition, so co-occurrence tracks
  noise scale. A pattern statistic is immune to scale heterogeneity by construction: an honestly noisy
  subject has an independent pattern in each condition. It needs its own null, and §1's scope rule
  applies to it.
- **P87** — the `similar`-only direction filter on Stage-1 properties. Five floor-censored
  `different`-direction units were measured being discarded on `02-densitometry-fabricated`. **DS02 is
  paired and §2 has shipped, so the only observed instance is gone.** The question survives on unpaired
  data with an empty evidence base, and direction was measured to be a property of the null rather than
  of the unit.
- **P88** — does a null the data violates disqualify a test's inferential output, battery-wide? Raised
  and then withdrawn as the basis for §3. It is a real question and it is not this test's: it reaches
  P83's combiner and the twenty condition-partitioned entries, ten of which are analytic. Until it is
  decided, **the argument should not be cited anywhere** — not for a test we want to keep and not for one
  we want to drop.

The shared assumption links P82 and P86 and belongs in the methodology. `METHODOLOGY`'s Condition
Grouping Contract states the general rule — conditions are exchangeable at the row level — and names one
way it fails. **A paired design is a second, independent way, and the section does not mention it.** That
edit lands with P86.

---

## 6. Not decided here

- **Is real deposited data's per-subject noise-scale dispersion below about 0.25?** Still worth
  measuring, but it no longer feeds a per-file gate and its answer is one-sided. Contamination only
  inflates, so **a low field reading genuinely rules the risk out; a high one cannot distinguish honest
  heteroscedasticity from fabrication in the sample.** The measurement can exonerate; it cannot convict.
  Whether a global exoneration is enough for a forensics tool is a separate decision. It belongs to P65
  and P65's design now needs a contamination control.
- **Does a pattern-correlation successor statistic work, and against what null?** The primary route for
  P86 and unbuilt.
- **Does this test earn a place on unpaired data with no ground truth?** §3 removes both of its
  validating fixtures.
- **Three-or-more-condition partial-copy attacks** against Cross-Condition Consistency.
- **P84**, Cross-Condition Rank Correlation asserting a correspondence rather than destroying one.
  Untouched.
- **What replicate count any within-subject scale estimator needs**, and whether deposits carry it. The
  corpus's paired fixtures carry 4 or 6. (P91)
