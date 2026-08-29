# P184 — the cross-model pass, reconciled

**S387.** Four models — Claude, Gemini, ChatGPT, Grok — answered the same prompt independently, none
shown any other's answer. The prompt is `S387-CROSS-MODEL-P184.md`; it carried no lean, because a
pass that states its expected answer collects four agreements rather than four reads.

**Four models agreeing is evidence about an argument, not about a tool.** What follows is recorded as
the outcome of a review, and the measurements in §5 are what would settle it against data.

---

## 1 — Unanimous, and it closes the question P184 asked

**A point null with no derivation behind it cannot support a HIGH verdict.** No dissent and no hedging
in either direction across four models.

**No principled rule exists for choosing a single β on a two-regime noise model. That is the finding,
not a failure to answer.** Plate reader and genomics share one qualitative shape — Poisson-like at low
mean, quadratic at high — and are currently assigned opposite endpoints with no stated criterion.
A rule that always takes the low endpoint, or always the high, is equally arbitrary once data spans
both.

**Two models derived the same closed form by different routes.** For a variance function
`Var = aμ + bμ²`, the local log-log slope is

```
β(μ) = 1 + bμ / (a + bμ)
```

equivalently `(1 + 2μ/k)/(1 + μ/k)` for a negative binomial with dispersion `k`. It is 1 at μ ≪ k,
**exactly 1.5 at μ = k**, and 2 at μ ≫ k. Verified at S387.

**The consequence is the reframing.** P184's register row states the defect as a table with no
recorded basis. The pass says the derivation is the smaller problem: **the correct β is a property of
the dataset's dynamic range, not of the assay label**, so a constant chosen at the label is a claim
about data the label cannot carry. A perfectly sourced constant would still be the wrong kind of
object.

## 2 — The strongest single argument, and it is constructible

**A point null against an approximate constant has an asymptotic false-positive rate of 1.** The true
slope always differs from β₀ by something, because real instruments are mixtures, so rejection
probability goes to 1 as rows accumulate. At 2,021 rows with SE = 0.031, a slope discrepancy of 0.31
is a 10σ departure — scientifically negligible, reported at the tool's strongest tier.

**A test with that structure cannot be held to a sub-1% false-positive tolerance at any N, because
its error rate is a function of sample size rather than of the data's honesty.**

**Cell count makes this a proof rather than an argument.** For a binomial proportion the log-log slope
is `1 − p/(1−p)`: near 1 as p → 0, **exactly 0 at p = ½**, unbounded below as p → 1. A proportions
dataset centred near a half returns β̂ ≈ 0 against β₀ = 1 at whatever precision N affords. **That is a
guaranteed HIGH flag on honest data, derivable with no dataset in hand.** One constructible top-tier
false positive disqualifies the construction; how often it occurs in practice is a second question.

**Note where it sits.** Cell count is labelled single-regime in the assay table, so a fix triggered on
"more than one regime" does not reach it. The same applies to physiological, which names Normal or
log-normal and takes β = 0, fitting Normal only.

## 3 — The disagreement, and it is the live decision

| Model | Position |
|---|---|
| Claude | Interval nulls for **every** named assay, plus an effect-size floor. Ship the [0, 2] band immediately as the only option needing no new work. Argues explicitly against the MODERATE cap. |
| Gemini | Withdraw the named-assay path, route everything to the [0, 2] band. MODERATE cap only as a fallback if point nulls are retained. |
| ChatGPT | **Cap at MODERATE. Do not ship the band** — it is itself a new test nobody has validated, and the binomial case shows [0, 2] does not represent that variance law either. Expose the estimate and uncertainty as diagnostic while refusing the tier. |
| Grok | MODERATE **or** the band; does not choose between them. |

**Against the MODERATE cap** (Claude): a MODERATE false positive still fires, still contributes to
file severity, and still costs the researcher who has to answer it. It treats tier as a confidence
dial when the defect is a misspecified null. And the multi-regime trigger misses cell count and
physiological, which is where the closed-form counterexample lives.

**Against the band** (ChatGPT): it is an unvalidated test substituted for a bad one, and [0, 2] is not
justified for every model in the table.

### The fact that neither side had

**On C10, β̂ spans 2.31–2.85 — outside [0, 2] entirely.** With those standard errors the band
rejects too. **Withdrawing to the band does not rescue the deposit that motivated the question.**

This cuts both ways and settles neither position outright: the band is not a fix for the observed
case, and a MODERATE cap leaves seven flags standing as MODERATEs. **Recorded here because both
positions were argued without it.**

## 4 — What the standard errors are actually measuring

Independently raised by two models and it is sharper than the register's statement.

Across C10's nine sheets the slope estimate spans 2.31–2.85, a factor of 1.23. The standard error
spans 0.031–1.311, a factor of 42.8, **uncorrelated with row count across 400–2,021 rows.**

So the SE is not measuring sampling precision. It is measuring whether Cochran's Q rejected linearity
— that is, whether the mean-variance relation is single-regime. **The test therefore fires hardest
exactly when the data most cleanly obeys one power law that happens not to be the tabulated one, and
goes quiet when the relation is messy.** The block-robust SE, documented as the defence against a
multi-regime law overpowering a point null, works on two sheets of nine over data of one shape
because it is a linearity detector wearing a precision estimate's clothes.

**Fixing the null without fixing this leaves the flag decided by the wrong quantity.**

### An unverified pairing, flagged before it is quoted

One model computed z = 10 to 27 by pairing the smallest SE with the extremes of β̂. **The prompt gave
the SE range and the β̂ range separately across nine sheets and never said those were the same
sheets.** The conclusion likely survives, but the arithmetic asserts a pairing it does not have.
Do not quote those z values until §5's first measurement runs.

## 5 — Three measurements, none needing a new deposit

1. **Which sheets carry the small standard errors.** Settles the pairing above and tests directly
   whether precision and estimate are aligned or crossed on the nine.
2. **Fit `Var = aμ + bμ²` per sheet on the nine plate-reader sheets and compute each implied local
   slope.** If those track the observed 2.31–2.85, the point null is falsified constructively and the
   flags are explained by dynamic range. **Fit within-condition rather than pooled** — slopes above 2
   are predicted by no regime in the table, and pooling across conditions at different scales is the
   obvious candidate for the excess.
3. **Simulate honest datasets from each documented noise model across realistic dynamic ranges,
   compute the β̂ distribution, and ask whether the tabulated β₀ lies inside it.** If β₀ falls outside
   the honest β̂ distribution, the constant is falsified directly. **Plate reader and genomics first.**
   This is the instrument that settles the question without any corpus at all.

**A further observation, unverified and worth testing in (3):** absorbance and fluorescence readings
in ordinary use sit above the photon-limited regime, where pipetting and well-to-well CV dominate and
the slope should be near 2 rather than 1. If so, the nine sheets are evidence that plate reader's
β = 1 is simply the wrong endpoint, independent of everything else.

## 6 — The copy question is not resolved

Three of four answers failed the brief in different ways, and the failures are informative.

- **Gemini's** names the mismatch but tells the reader nothing to do about it, and addresses a
  statistician rather than the researcher whose data was flagged.
- **Claude's** is honest and runs to three paragraphs, which is itself a measure of how much the
  current null asks the prose to absorb.
- **Grok's** is close but generic.
- **ChatGPT's is the only one both honest and shippable**, and it is written for plate reader rather
  than as a template:

> Plate reader measurements may follow different noise behavior at low and high measurement levels;
> this test uses a single reference slope and may therefore be sensitive to the range of measurements
> in the dataset. A flagged result is a reason to inspect the variance–mean relationship, not evidence
> of data fabrication.

**One rule all four converge on and it should be canon regardless of how §3 resolves: never show a
multi-regime noise-model phrase beside a single-value test without naming the mismatch.** The
interface currently does exactly that — a plate-reader user reads *Poisson at low, proportional at
high* next to a test that assumed the low regime.

**The copy cannot be finalised before §3 is decided**, because the honest sentence differs by option.
Under an interval null it collapses to something much shorter: *measured rate 2.4, inside the range
1–2 expected for plate readers once both regimes are allowed for — no flag.*

---

## What this pass changes

**Closed.** The point null cannot carry HIGH. No rule exists for two-regime assays. Cell count admits
a constructible top-tier false positive on honest data.

**Open.** MODERATE cap against interval null against the [0, 2] band — with the C10-outside-the-band
fact now on the table, which no model had.

**Unblocked once §3 lands.** P184's `ASSAYS` two-regime prose, which is the last copy item on the ship
gate's condition 2.

---

## Register rows moved from STATUS, S392

STATUS is gitignored and has no git history, so a register row is the only copy of
whatever it holds. These bodies are moved here verbatim; the register row keeps its
claim and points at this section.

### P184 — **the expected slope is a point where the noise model it encodes has two regimes**

open, **allocated S380, and found from source with no corpus.** Noise Scaling's null is `ASSAY_EXPECTED_SLOPE[assay]`, one β per assay. **Five of ten assays describe something a point β cannot represent.** METHODOLOGY-TESTS §4.1 gives plate reader *Poisson at low, proportional at high* and takes β = 1, the low regime; its own prose fourteen lines below describes genomics identically and its row takes β = 2, the high one — **two two-regime models resolved in opposite directions with no stated rule.** `physiological` names two families and takes Normal. `proteomics` states proportional error in prose while the code declines a slope. **`cell_count` names binomial proportions, which have no power law at all**: variance `p(1−p)/n` against mean `p` gives a log-log slope of `1 − p/(1−p)` — 1 near zero, 0 at a half, unbounded below near one — so a proportion dataset centred near a half reads slope 0 against a null of 1, **a flag derivable from arithmetic with no deposit.** The table's only recorded basis is one general reference. **Observed consequence: C10's seven Noise Scaling HIGHs.** Slope near 2.5 at every dilution level of nine independent experiments. Two sheets sit at distance 1, where the flag is half of the `high >= 2` arm; the deposit stays at 3 and misses by ten further removals. **C10 is not adjudicated and must not be quoted as fabricated.** **The flag is decided by the standard error, not by the estimate, and that is the mechanism half of this row.** Across the nine sheets the slope estimate spans 2.31–2.85, a factor of 1.23; **the standard error implied by the reported intervals spans 0.031 to 1.311, a factor of 42.8, and is uncorrelated with row count** (r = −0.15 against 400–2,021 rows). The two non-flagging sheets do not have different data — they have error bars an order of magnitude wider, because Cochran's Q rejected linearity there and the block-robust SE took over. **§4.1's own *Why block-robust SE* paragraph says that machinery exists precisely to stop a multi-regime mean-variance law overpowering a point null.** On C10 it does that on two sheets of nine and fails on seven, over data of one shape throughout — so the tool already carries a partial defence against this defect and it fires on a power criterion rather than on whether the null's shape is right. **Corrected counterfactual, and it replaces this row's first draft.** Chat wrote that no repair to the value clears the flags. That was asserted, not computed. Recomputing each sheet's z against the high-regime null of 2 gives **5 HIGH, 1 MODERATE, 1 LOW in place of 7 HIGH** — and the sheet it demotes, Exiguobacterium Experiment1, is one of the two whose severity is load-bearing, so **resolving plate reader to β = 2 would move one C10 sheet verdict.** A value change is therefore not inert; it is merely insufficient, and five HIGHs survive every null in [0, 2]. **Derived by Chat from the intervals in Code's S380 Part 5 report on the stated ±1.96×SE basis, not measured — Exiguobacterium Experiment1 lands at p ≈ 0.0103 against a 0.01 boundary, so its demoted tier is within rounding. Confirm at source before quoting.** **Scope: the continuous path.** `vst.js:159` restricts CI promotion to `general`, so an assay supplying a point null is one whose transform a measurement cannot overturn; the integer path at `:138` has no assay term and the coupling vanishes. **Not "wrong by construction".** Also here: the `inconclusive` wording composed by the fallback branch regardless of the interval, which reaches the §4 clipboard body through `handoffModel.js` and `promptBodyRenderer.js` — one decision settles the wording, the point null and the undocumented restriction together. **THE CROSS-MODEL PASS RAN AT S387 — `docs/shared/P184-CROSS-MODEL-RECONCILIATION.md`, `bdf071b`.** **Unanimous across four models: a point null with no derivation cannot support a HIGH verdict, and no principled rule exists for choosing β on a two-regime model — that is the finding, not a failure to answer.** **The reframing this row now takes: the defect is not that the table is unsourced but that a constant is the wrong kind of object.** The local slope is `1 + bμ/(a + bμ)`, so the correct β is a property of the dataset's dynamic range, not of the assay label. **Cell count is the proof — a binomial proportion's log-log slope is `1 − p/(1−p)`, exactly 0 at p = ½, so a proportions dataset centred near a half is a guaranteed HIGH on honest data, derivable with no dataset in hand.** **The remedy is open three ways** — MODERATE cap, the [0, 2] band, or interval nulls with an effect-size floor — **and C10's β̂ of 2.31–2.85 sits outside the band, so withdrawing to it does not rescue the deposit that raised the question. No model had that fact.** **Three measurements would decide it and none needs a new deposit: which sheets carry the small standard errors; a `Var = aμ + bμ²` fit per sheet on the nine, within-condition not pooled; and a simulation asking whether each tabulated β₀ lands inside the honest β̂ distribution.** Incidence unmeasured
