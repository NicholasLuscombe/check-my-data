# S351 — what a paired-data skip would cost

**Scope.** Measurement only. Nothing under `src/` changed. Neither the skip of Cross-Condition
Consistency nor the suspension of Residual Spike Correlation is implemented here.

**Instrument.** `test/probe-s351-paired-skip.mjs`, committed with this summary. It loads all 27
fixtures exactly the way `test/validate-batch.mjs` loads them, derives pairing from the data,
reconciles every baseline severity against `EXPECTED`, and measures severity four ways.

```bash
node test/probe-s351-paired-skip.mjs
```

```bash
SEEDS=8 node test/probe-s351-paired-skip.mjs
```

`SEEDS=N` sweeps PRNG offsets, and offset 0 is the shipped derived stream. So eight offsets is one
real draw plus seven counterfactuals, not eight independent draws.

---

## 1. The two tests, at source

### Cross-Condition Consistency has seven arms and one null

| Arm | Stage | What it compares, per condition then per pair | minN | Forensic directions |
|---|---|---|---|---|
| P1 Trimmed span (5–95%) | 1, `pool` | span of the pooled values; log-ratio distance | 30 | `similar` only |
| P2 Dispersion (MAD) | 1, `pool` | median absolute deviation of the pooled values; log-ratio | 30 | `similar` only |
| P3 CDF shape (KS) | 1, `pool` | the sorted pooled array itself; KS distance | 30 | `similar` only |
| P4 Residual SD | 2, `residual` | standard deviation of the row-centred residual pool; log-ratio | 30 | both |
| P5 Residual lag-1 AC | 2, `residual` | lag-1 autocorrelation per replicate position; Fisher-z gap | 50 | both |
| P6 Residual kurtosis | 2, `residual` | kurtosis of the residual pool; absolute gap | 100 | both |
| P9 Mean-variance slope | 3, `mvslope` | slope of per-row (log mean, log variance), pre-transform; absolute gap | own `applicable()` callback | both |

**Every arm draws from the same shuffle.** There is one Fisher–Yates per permutation, over row tuples
spanning all conditions (`crossConditionConsistency.js:458`). Pseudo-condition *k* takes whatever
tuples land in its position range. All three stages rebuild their inputs from that single permuted
order — pooled buffers at `:463`, residual bundles at `:477`, mean-variance bundles at `:485`.

So all seven arms permute rows across conditions, and none does anything else. There is no arm inside
this test with a different null to carve out.

One arm differs in a way that matters. `fillResidualBundle` walks permuted positions, so the shuffle
re-orders the residual series as well as reassigning conditions. Six arms sort, pool, or regress, so
the re-ordering is inert for them. P5 reads order. For P5 alone the shipped null moves two things at
once. This confirms the S350 record at arm resolution.

### Residual Spike Correlation has one arm, and its null is the opposite operation

The statistic is the maximum, over condition pairs, of the top-K overlap between each condition's set
of rows with the highest normalised mean absolute residual. K is `max(5, floor(rows × 0.10))`.

The null shuffles **each condition's residual vector independently**, inside a per-group loop
(`residualSpikeCorrelation.js:137-154`). Nothing moves between conditions.

The two constructions are opposites. Cross-Condition Consistency moves the condition tags across fixed
rows. Residual Spike Correlation moves the rows under fixed tags. Both destroy subject pairing, by
opposite operations.

### How the arms become one verdict

Cross-Condition Consistency: a two-sided permutation p per unit, then three separate BH-FDR calls, one
per stage (`:566-577`), then a per-unit effect-size gate that auto-passes below minN 500 unless the
property sets `gateAlwaysEvaluates`, then the forensic-direction filter. Units that fail the gate or
the direction filter are neutralised to 1.0. `primaryP` is the minimum of what survives (`:618-620`).

Residual Spike Correlation: `(exceedances + 1) / 1000`, straight to `flagFromP`. No BH, no gate, no
direction filter.

### Does either result record which arm drove the flag?

Cross-Condition Consistency: recoverable, but not recorded, and the field that looks like it is wrong
for the job. `details[]` carries property, pair, stage, adjusted p, direction, and both gate flags per
unit, so the driver can be recomputed. There is no field naming the driving stage or property.

`top` is not the driver. It is the minimum-adjusted-p unit over direction-forensic units only, with
gate status used as a tie-break rather than a filter (`:651-656`). When the lowest-p forensic unit
fails the effect-size gate, `top` names a unit that did not set `primaryP`. It exposes `gatePassed`, so
a consumer could detect the case, but nothing in the object states the actual driver.

Residual Spike Correlation: trivially, since there is one arm. It records `bestPair` and `bestPairIdx`.
`pairDetails` carries per-pair Spearman correlations that feed no verdict.

### The question this part was asked

Is "skip on paired data" a whole-test statement, or does it reach only the arms whose null shuffles
rows across conditions?

As a whole-test instruction it is well-formed for both tests. Each has one file-level p and one flag.

The narrower reading is not available. "Skip the arms whose null shuffles rows across conditions"
reaches all seven Cross-Condition Consistency arms, because they share one null and there is no subset
to spare, and it reaches **zero** Residual Spike Correlation arms, because that test never shuffles
across conditions. A rule phrased that way would disable one test entirely and leave the other
untouched. The code offers no intermediate scope. Which reading is wanted is Chat's call.

---

## 2. The declaration census

**Rule.** A fixture declares a channel for a test when `EXPECTED[<file>].flags` has that test as an own
key. Comments do not count. `ACKNOWLEDGED` does not count. Mechanism prose does not count.

`EXPECTED` carries 27 entries. `FIXTURES` carries 24 — the three `vfs-*` regression fixtures appear in
`EXPECTED` only.

| Test | Fixtures declaring a channel | Where |
|---|---|---|
| Cross-Condition Consistency | `15-missing-carlisle.csv`, `19-inheritance-fabricated.csv` | `batch-fixtures.mjs:111`, `:142` |
| Residual Spike Correlation | `02-densitometry-fabricated.csv`, `11-rnaseq-multicondition.csv` | `batch-fixtures.mjs:57`, `:92` |

All four allow-sets are `['MODERATE', 'HIGH']`. Neither test appears anywhere in `ACKNOWLEDGED`.

### Where the two registers disagree

**Cross-Condition Consistency on DS21.** The ground truth names a channel; the batch declares none.
`TEST-GROUND-TRUTH.md:46` reads, in part: "Primary intended: Windowed Autocorrelation (Dim III) +
Cross-Cond Consistency Stage 2 P5 (Dim IV)", and later "P5 adj-p=0.012 lands as LOW under
`ALPHA.NOTE=0.01` … P5 added as convergent attribution channel at LOW". The ground truth names the
channel at LOW. The batch declares only MODERATE and HIGH cells. So the two registers are not
necessarily in conflict, but they do not match, and reconciling them is not this dispatch's call.

`batch-fixtures.mjs:158` carries the same claim as a comment — "Primary targets Windowed Autocorr
(Dim III) + Cross-Cond Consistency Stage 2 (Dim IV)" — with no matching `flags` entry.

**Residual Spike Correlation on DS02.** The batch declares a channel; the ground-truth row does not
name it. `TEST-GROUND-TRUTH.md:27` reads in full: "Rescaled-copy fabrication (Inhibitor_A = Control ×
0.58); localised block copy; localised near-linear replicate dependence." It attributes no tests at
all.

DS15, DS19 and DS11 agree across both registers.

---

## 3. The pairing census, all 27 fixtures

**Rule applied.** Column-grouped is paired structurally — each condition is a column subset of the same
rows. Row-grouped is paired only on evidence: some identifier column must have every subject appearing
exactly once in every condition, with identical subject sets across conditions. Everything else is
unpaired, and absent evidence defaults to unpaired.

Evidence is read over the slices the tests actually consume, so a group dropped by the 3-row floor
cannot silently change the answer.

| Fixture | Branch | Paired | Identifier column | Conditions | Rows per condition |
|---|---|---|---|---|---|
| DS01 | column-grouped | **yes** | row index | 3 | 35 / 35 / 35 |
| DS02 | column-grouped | **yes** | row index | 3 | 35 / 35 / 35 |
| DS03 | row-grouped | **yes** | `Target` | 2 | 25 / 25 |
| DS04 | row-grouped | **yes** | `Target` | 2 | 25 / 25 |
| DS05 | none | no | — | 0 | — |
| DS06 | none | no | — | 0 | — |
| DS07 | none | no | — | 0 | — |
| DS08 | none | no | — | 0 | — |
| DS09 | row-grouped | **yes** | `ProteinID` | 2 | 200 / 200 |
| DS10 | row-grouped | **yes** | `ProteinID` | 2 | 200 / 200 |
| DS11 | row-grouped | **yes** | `GeneID` | 3 | 500 / 500 / 500 |
| DS12a | row-grouped | no | — | 2 | 200 / 200 |
| DS12b | row-grouped | no | — | 2 | 200 / 200 |
| DS13 | none | no | — | 0 | — |
| DS14 | none | no | — | 0 | — |
| DS15 | row-grouped | no | — | 2 | 80 / 80 |
| DS16 | column-grouped | **yes** | row index | 3 | 60 / 60 / 60 |
| DS17 | column-grouped | **yes** | row index | 3 | 60 / 60 / 60 |
| DS19 | row-grouped | no | — | 2 | 600 / 600 |
| DS20 | row-grouped | no | — | 2 | 150 / 150 |
| DS21 | row-grouped | no | — | 2 | 200 / 200 |
| DS22 | row-grouped | no | — | 2 | 200 / 200 |
| DS23 | none | no | — | 0 | — |
| DS24 | none | no | — | 0 | — |
| vfs-a | none | no | — | 0 | — |
| vfs-b | none | no | — | 0 | — |
| vfs-c | none | no | — | 0 | — |

**Paired: 9 of 27.** Four column-grouped — DS01, DS02, DS16, DS17. Five row-grouped — DS03, DS04,
DS09, DS10, DS11.

This is the disposition's figure exactly, in count and in the four-plus-five split. The members also
match the set recoverable from the S350 record, where DS02, DS04, DS10, DS11 and DS16 are the paired
fabricated fixtures and DS01, DS03, DS09 and DS17 the clean paired ones.

### Two things the table hides

**The identifier is not always the first label column.** DS03 and DS04 carry two label columns. `ID`
holds 25 distinct values per condition and the two conditions share none of them. `Target` holds 25
distinct values per condition and the sets are identical. The fixtures qualify on `Target`. A census
that tested only the first label column would return seven paired fixtures, not nine.

**The disqualifying shape is always the same one.** Every row-grouped fixture that fails does so the
same way: an identifier with one value per row, distinct within each condition, and disjoint across
conditions. DS12a, DS12b, DS19, DS20, DS21 and DS22 all fail like that. DS15 fails differently — it has
no identifier column at all, only a `COND` column.

### DS19 is paired by construction and unpaired by evidence

DS19's generator builds Treatment as Control plus a small jitter, row for row. It is the most paired
data in the corpus by design. Its `ID` column runs `S0001`–`S0600` for Control and `S0601`–`S1200` for
Treatment. The sets are disjoint, so the file records no correspondence between a Treatment subject and
a Control subject.

The rule returns unpaired. The disposition's own clause — default unpaired when evidence is absent —
makes that the correct answer. So the rule as written spares DS19, and the data's actual design does
not.

---

## 4. What the skip costs

### Method

The engine ran once per fixture, unchanged. Severity was then recomputed from the result list with the
relevant entries removed, using the engine's own `computeSeverity`. Suppression is a filter over
results, never an edit to a test or a dispatch. Every PRNG stream and every other test's p is identical
across the four columns.

### What the severity function reads

`computeSeverity` reads exactly two things: each result's `flag`, and `TEST_MECHANISM[r.name]` for the
cross-dimension diversity count. **It takes no count of tests run and no count of tests attempted.** So
a filtered result list is a sound input, and removing a test removes exactly its own flag plus, when it
was the last of its mechanism family to flag, that family's contribution to the diversity term.

The diversity term does move, and on two of the three fixtures that change it is the term doing the
work rather than the flag count. Severity is also monotone under removal — it can never rise.

### The table, at the shipped stream

| Fixture | Paired | EXPECTED | As shipped | No CCC | No RSC | Neither | CCC | RSC |
|---|---|---|---|---|---|---|---|---|
| DS01 | yes | 0 | 0 | 0 | 0 | 0 | LOW 0.036 | LOW 1.000 |
| DS02 | yes | 3 | 3 | 3 | **1** | **1** | LOW 0.116 | MOD 0.0010 |
| DS03 | yes | 0 | 0 | 0 | 0 | 0 | LOW 0.168 | LOW 0.024 |
| DS04 | yes | 3 | 3 | 3 | 3 | 3 | LOW 0.078 | LOW 1.000 |
| DS09 | yes | 0 | 0 | 0 | 0 | 0 | LOW 0.012 | LOW 0.034 |
| DS10 | yes | 3 | 3 | 3 | 3 | 3 | LOW 0.144 | LOW 0.343 |
| DS11 | yes | 3 | 3 | 3 | **3** | **3** | LOW 0.072 | MOD 0.0030 |
| DS16 | yes | 2 | 2 | 2 | 2 | 2 | LOW 0.048 | LOW 0.285 |
| DS17 | yes | 0 | 0 | 0 | 0 | 0 | LOW 0.599 | LOW 0.882 |
| DS15 | no | 3 | 3 | **2** | 3 | **2** | MOD 0.0090 | LOW 1.000 |
| DS19 | no | 1 | 1 | **0** | 1 | **0** | MOD 0.0060 | LOW 1.000 |

Every baseline reconciles against `EXPECTED`. The gate did not trip.

### Which flags carried the three that move

**DS02, 3 → 1 when Residual Spike Correlation goes.** Before: Inter-Replicate Correlation MODERATE
(replicate) and Residual Spike Correlation MODERATE (copied). One high, zero. Two moderates across two
dimensions, which is the clause that reaches severity 3. After: Inter-Replicate Correlation alone, one
moderate in one dimension, which reaches 1. The fixture loses two tiers.

**DS15, 3 → 2 when Cross-Condition Consistency goes.** Before: Missing Data Pattern HIGH (replicate),
Blocked Mahalanobis MODERATE (replicate), Cross-Condition Consistency MODERATE (group). One high across
two dimensions reaches 3. After: one high across one dimension reaches 2. The high flag survives
untouched — what drops the tier is the diversity term, because Cross-Condition Consistency was the only
`group`-mechanism flag on the file.

**DS19, 1 → 0 when Cross-Condition Consistency goes.** Cross-Condition Consistency is the only flag
above LOW on the whole file. Removing it leaves nothing, and the fixture loses its verdict entirely.

### The eight-offset sweep, whole paired set plus DS15 and DS19

| Fixture | As shipped, offsets 0–7 | No CCC | No RSC |
|---|---|---|---|
| DS01 | 0 every offset | 0 | 0 |
| DS02 | 3 every offset | 3 | **1 every offset** |
| DS03 | 0 every offset | 0 | 0 |
| DS04 | 3 every offset | 3 | 3 |
| DS09 | 0,0,0,**1**,0,0,**1**,**1** | **0 every offset** | unchanged from baseline |
| DS10 | 3 every offset | 3 | 3 |
| DS11 | 3 every offset | 3 | **3 every offset** |
| DS16 | 2 every offset | 2 | 2 |
| DS17 | 0 every offset | 0 | 0 |
| DS15 | 3,3,**2**,3,3,3,3,3 | **2 every offset** | unchanged from baseline |
| DS19 | 1 every offset | **0 every offset** | unchanged from baseline |

**DS09 is the finding here.** It is a clean fixture, EXPECTED 0, and it is paired. Cross-Condition
Consistency fires MODERATE on three of the eight offsets and is the sole cause of the file leaving
severity 0. Suppressing it returns DS09 to 0 on every offset. So on the paired set the skip does not
only cost nothing — it removes a seed-dependent false positive on clean paired data, which is exactly
the S341-recorded instability.

Read the counts the right way: offset 0 is the shipped derived stream, so DS09's "three of eight" is
zero of one real draw plus three of seven counterfactuals. The shipped stream is one of the five that
do not fire.

**No paired fixture drops to severity 0.** DS02 falls two tiers but lands at 1. DS04, DS10, DS11 and
DS16 hold. DS01, DS03, DS09 and DS17 are already 0. The only fixture that loses its verdict outright is
DS19, and DS19 is unpaired.

### DS19, the named question

- **Pairing status: unpaired**, under the disposition's own rule. Its identifier column carries disjoint
  value sets across the two conditions.
- **Cross-Condition Consistency carries its severity, alone.** It is the only flag above LOW on the file,
  and severity 1 comes from that one moderate.
- **The four conditions: 1, 0, 1, 0.** Stable on all eight offsets.
- **DS19 is not paired, so it does not lose its verdict under the disposition as written.** It loses it
  only if the rule changes to count construction-level pairing, which the file gives no way to detect.

---

## 5. Figures that disagree with what I measured

**Confirmed, quoted for the record.**

> "Reach: 9 of 27 fixtures — 4 column-grouped, 5 row-grouped and fully paired."
> — `S350-PAIRED-DESIGN-DISPOSITION.md` §4

Confirmed exactly, count and split, and the membership matches.

> "Cost: zero. The two fixtures declaring a Cross-Condition Consistency channel are both unpaired, so no
> batch assertion breaks."
> — `S350-PAIRED-DESIGN-DISPOSITION.md` §2

Confirmed. DS15 and DS19 are both unpaired. No paired fixture's severity moves when Cross-Condition
Consistency is suppressed, on any of eight offsets — except DS09, which moves in the helpful direction.

**Incomplete rather than wrong.**

> "Cost: both of its declared channels. `02-densitometry-fabricated` and `11-rnaseq-multicondition` are
> both paired, so both lose an asserted channel and the batch will fail on assertion (b) until the
> declarations are revised."
> — `S350-PAIRED-DESIGN-DISPOSITION.md` §3

The pairing claim is confirmed and the flag-assertion claim is confirmed. The sentence names assertion
(b) only. **DS02's severity also drops, 3 to 1, on all eight offsets**, so assertion (a) fails too, and
the revision reaches DS02's declared severity and not only its declared flag. DS11's severity holds at
3 on all eight offsets, carried by Benford's Law (Second Digit) and Autocorrelation, so DS11 needs a
flag-declaration revision and no severity revision.

**A figure that should not be read as shipped behaviour.**

> "the shipped null flags on 20 of 20 seeds at 9,999 permutations"
> — `S350-PAIRED-DESIGN-DISPOSITION.md` §1, on `09-proteomics-clean`

Not contradicted — it is a B = 9999 measurement. At the shipped permutation ladder the same fixture
flags on three of eight offsets, and is LOW on the shipped stream at p = 0.012. Anyone reading 20 of 20
as the shipped incidence will over-state it.

**A question this dispatch answers.**

> "Severity effects of skipping two tests on 9 of 27 files. Nothing guards the exit from severity 0.
> Measure before implementing."
> — `STATUS.md:224`

Measured. Nothing exits severity 0 on the paired set. The only fixture that reaches 0 is DS19, which is
unpaired and therefore out of the skip's reach. `computeSeverity` is monotone under result removal, so
no fixture can move upward either.

**A claim in the S351 dispatch that the repository contradicts.**

The dispatch states that the S349 census matcher "was not [committed], and its result is now
unreproducible." `test/probes/probe-s349-pairing-census.mjs` is tracked and was committed at `1f2724f`
("S349: CCC Stage-1 limit measurement, paired-null probe, pairing census"). It still runs, and on the
fixtures it covers it agrees with this session's census — DS09 fully paired on `ProteinID`, DS12a not
paired on `sample_id`, DS17 structurally paired.

---

## 6. Expectations, stated in advance

| # | Expectation | Result |
|---|---|---|
| 1 | DS11 holds at severity 3 without Residual Spike Correlation | **Confirmed.** 3 on all eight offsets |
| 2 | DS09 stabilises at 0 without Cross-Condition Consistency | **Confirmed.** 0 on all eight offsets, against 3 of 8 firing as shipped |
| 3 | The paired set is not the nine the disposition names | **Wrong.** It is exactly those nine |
| 4 | DS19 moves 1 → 0 when Cross-Condition Consistency is suppressed | **Confirmed** — but DS19 is unpaired, so the skip never reaches it |
| 5 | More than two fixtures declare a Cross-Condition Consistency channel | **Wrong.** Exactly two |

Two of five inverted. Expectation 4 is the interesting one: the arithmetic holds and the conclusion
does not follow, because the fixture it names sits outside the rule's reach.

---

## 7. What I could not determine

- **Whether DS15 and DS19 are paired in fact.** Both are almost certainly paired by construction. Neither
  file records the correspondence, so no rule reading the file can recover it. This is a property of the
  fixtures, not of the rule.
- **Whether the identifier-evidence rule generalises.** It was applied to 27 fixtures our own generators
  built. Real deposits may key subjects in ways this rule misses — a composite key across two columns,
  or an ordering convention with no key at all. Nothing here bounds that.
- **Behaviour beyond eight offsets.** Eight offsets is one real draw and seven counterfactuals. DS09 at
  3 of 8 and DS15 at 1 of 8 are small-sample rates.
- **Anything about three-or-more-condition partial copies.** DS11 and the three column-grouped
  three-condition fixtures were measured as they are; no copy attack was constructed.
- **Whether suppressing either test changes any surface other than severity.** Only severity was
  measured. Convergence regions, findings, chips and the report body were not.

---

## 8. Ownership note

This file follows the precedent of `SESSION343-AUDIT-SUMMARY.md`, `SESSION349-AUDIT-SUMMARY.md` and
`SESSION350-AUDIT-SUMMARY.md` — Code-authored audit summaries, tracked, committed on the Code branch,
and cited from `CLAUDE.md`. It creates a new file rather than editing any Chat-owned document. If Chat
would rather these lived elsewhere, say so and the next one moves.

---
---

# Part 3 — is Residual Spike Correlation's DS02 firing a true detection?

**Scope.** Measurement only. Nothing under `src/` changed. P86's disposition is Chat's and this settles
nothing about it.

**Why it was asked.** The disposition adjudicated the test's DS11 firing against construction and found
it real. It never adjudicated DS02. Part 1 then measured that suspending the test drops DS02 from
severity 3 to 1, so what the suspension costs turns on this answer.

**Instruments**, both committed here:

```bash
python3 test/probes/gen-s351-ds02-ablations.py /tmp/s351-ablations
```

```bash
ABLATIONS=/tmp/s351-ablations node test/probes/probe-s351-ds02-rsc.mjs
```

**Answer, stated first.** The firing is a **true detection**. It reads the rescaled copy, and it
collapses when and only when that copy is removed. Suspending the test on paired data gives up two real
catches, not one, and drops a rescaled-copy fabrication from *Investigate closely* to *Review*.

---

## 9. What DS02 actually contains

**Provenance, checked before anything was built on it.** The shipped
`02-densitometry-fabricated.csv` is **byte-identical** to what `generate-test-datasets.py` produces.
So is `01-densitometry-clean.csv`, which has to be regenerated first because both draw from one
Mersenne Twister seeded at 7741 and DS02 runs second. This is not the DS16/DS17 situation — here the
generator is a valid anchor. `gen-s351-ds02-ablations.py` re-implements both functions and refuses to
emit an ablation unless both files reproduce exactly, so a mis-copied constant cannot reach a
measurement.

DS02 is column-grouped: 35 rows, 3 conditions, 4 replicates each. Matrix row *r* is the same subject in
every condition, so the "subjects" the test ranks are rows. Data columns 0–3 are Control, 4–7
Inhibitor_A, 8–11 Inhibitor_B.

| # | Mechanism | Generator lines | What it writes | Rows (1-indexed) | Matrix columns |
|---|---|---|---|---|---|
| M1 | rescaled copy | 80–83 | `Inhibitor_A[rep] = Control[rep] × 0.58 + 0.008·N(0,1)` | all 35 | 4–7 |
| M2 | scattered row copy | 94–101 | `Inhibitor_B[rep] = Control[rep] × 0.35 + 0.002·N(0,1)` | 1, 16, 28, 31, 34 | 8–11 |
| M3 | replicate lock | 105–108 | `Inhibitor_A Rep2 = Rep1 × 1.003 + 0.0015` | 19–28 | 5 |

M2's five rows come from `random.sample(range(35), 5)`. They were recovered two independent ways and
the two agree: by capturing the generator's own call in memory, and by reading the data back out (a
copied row has all four Inhibitor_B / Control ratios sitting on 0.35 within 0.02, an honest row's
scatter).

### Where the ground-truth row and the generator part company

The row reads, in full: "Rescaled-copy fabrication (Inhibitor_A = Control × 0.58); localised block
copy; localised near-linear replicate dependence."

- **"Localised block copy" is neither localised nor a block.** M2 writes five rows drawn uniformly at
  random — 1, 16, 28, 31, 34. Nothing is contiguous. This matters for more than accuracy: it is the
  reason the test cannot see M2 at all, below.
- The row does not say M2 copies **Control into Inhibitor_B**, nor at scale 0.35, nor that its noise
  term is 0.002 — near-noiseless.
- The row does not say M3 lands on **Inhibitor_A Rep2 over rows 19–28**.
- "Inhibitor_A = Control × 0.58" omits the `+ 0.008·N(0,1)` term.
- **M3 is nested inside M1**, which the row does not say. It overwrites ten cells M1 wrote, and it
  reads M1's output as its source. So the two are not independent plants.

Nothing is planted that the row omits entirely. The count of three is right; three of the three
descriptions are imprecise about where.

---

## 10. What the test selects, and where it lands

K = `max(5, floor(35 × 0.10))` = **5**. Chance pairwise overlap is `K²/nR` = **0.714 rows**.

| Condition | Top-5 rows, 1-indexed |
|---|---|
| Control | 5, 13, 15, 18, 24 |
| Inhibitor_A | 5, 13, 15, 18, 24 |
| Inhibitor_B | 1, 2, 12, 22, 25 |

| Pair | Overlap | Rows |
|---|---|---|
| Control vs Inhibitor_A | **5 of 5** | 5, 13, 15, 18, 24 |
| Control vs Inhibitor_B | 0 | — |
| Inhibitor_A vs Inhibitor_B | 0 | — |

Control and Inhibitor_A select the **same five rows**, differing only in rank order. That is the whole
flag: `p = 0.001`, max overlap 5, best pair Control vs Inhibitor_A.

**Against the planted regions.** For the one non-empty overlap, n = 5:

| Region | Observed | Expected under chance |
|---|---|---|
| M2's five copied rows | **0** | 0.71 |
| M3's rows 19–28 | 1 (row 24) | 1.43 |
| M1 | all 5 — but M1 covers every row, so the count carries no information |

**Sole occupancy: no.** None of the five selected rows is an M2 row, and none of the five M2 rows is
selected. The DS11 shape — flagged units that are all planted and are the sole occupants of their cell
— does not repeat here, because M1's region is the entire condition and a positional test against it is
vacuous. The ablation is what carries this adjudication instead.

---

## 11. Ablation

Each variant consumes the same random draws in the same order as the full construction, so a difference
between two rows is the mechanism and not a reseeded stream.

Two replacements for M1 were run. The first generates Inhibitor_A the way DS01's clean sibling does.
That arm confounds "not a copy" with "different row-to-row amplitude", so a second draws Inhibitor_A
independently from **Control's own law scaled by 0.58** — identical marginal distribution to what M1
produces, with only the shared noise realisation removed. The two agree throughout, which is what makes
the conclusion safe.

| Variant | RSC | RSC *p* | Max overlap | IRC | IRC *p* | Severity | *s* |
|---|---|---|---|---|---|---|---|
| all three (= shipped) | MODERATE | 0.001 | 5 | MODERATE | 0.0040 | 3 | 0.319 |
| M1 off, DS01-style | LOW | 0.938 | 1 | LOW | 0.150 | 1 | 0.173 |
| **M1 off, variance-matched** | **LOW** | **0.914** | **1** | LOW | 0.131 | 1 | 0.173 |
| M2 off | MODERATE | 0.001 | 5 | MODERATE | 0.0070 | 3 | 0.271 |
| M3 off | MODERATE | 0.001 | 5 | LOW | 0.315 | 1 | 0.311 |
| all off, DS01-style | LOW | 0.925 | 1 | LOW | 0.168 | 1 | 0.176 |
| **all off, variance-matched** | LOW | 0.930 | 1 | LOW | 0.174 | **0** | 0.176 |

Read the RSC column:

- **Remove M1 and the detection is gone.** *p* goes from 0.001 to 0.914, the overlap from 5 to 1 — one
  row, against a chance expectation of 0.71. The variance-matched arm gives the same answer as the
  DS01-style one, so this is the copy's removal and not the replacement's shape.
- **Remove M2 and nothing moves.** Same flag, same *p*, the same five rows.
- **Remove M3 and nothing moves.** Same flag, same *p*, the same five rows.

That is the textbook result: the detection collapses when its own mechanism goes and survives the other
two.

**The negative control is clean.** With all three mechanisms removed and Inhibitor_A variance-matched,
the entire battery goes silent — severity 0, no flag above LOW anywhere. So every flag DS02 carries is
mechanism-driven, not a property of the shape.

**DS01, the clean counterpart.** Same assay, same 35 × 3 × 4 shape, same generator family. RSC returns
LOW at *p* = 1.000, max overlap 0, and **all three pairs overlap zero rows**. The three top-5 sets are
disjoint.

### M2 is invisible to the whole battery

Removing M2 changes no flag, no *p* worth reporting, and no severity. The only thing that moves is the
dispersion estimate. DS02's second planted mechanism is detected by nothing the tool runs.

The reason generalises and is worth recording. The test ranks rows by residual magnitude and cuts at the
top 10%. A copied row inherits its source row's residual magnitude, so it enters the target condition's
top-K only if the source row was already in the source's top-K. M2's rows were drawn uniformly at random
with respect to noise, so the expected intersection is exactly `K²/nR` = 0.71 rows — the test has
essentially no power against it. **A partial row copy is detectable this way only when the copied rows
are among the noisiest.** DS11's detection worked because there the planted spikes *are* the noisy rows
by construction. DS02's are not.

---

## 12. The heteroscedasticity number

The estimator is the one that produced 0.041, 0.055, 0.162 and 0.199 on the four clean paired fixtures.
**DS01 reads 0.0549 here against S350's recorded 0.055**, so it is being used the same way.

| File | raw | corrected *s* | df/subject | subjects |
|---|---|---|---|---|
| DS02 | 0.3970 | **0.3194** | 9 | 35 |
| DS01 | 0.2420 | 0.0549 | 9 | 35 |

The bias term is `sqrt(1/(2·9))` = 0.2357; a raw value below that returns a corrected 0.

**Taken alone, DS02 sits above the 0.2–0.3 knee.** Three further measurements say not to read it that
way.

**First, the resolution.** Twelve independently seeded honest files of DS02's exact shape read:

```
0.000  0.000  0.000  0.049  0.075  0.117  0.120  0.130  0.136  0.158  0.194  0.199
min 0.000   median 0.120   max 0.199   mean 0.098
```

Honest, homoscedastic data on 35 subjects at 9 df lands anywhere in [0, 0.20]. DS02's 0.319 is above all
twelve — so the value is not *un*resolvable, but nothing finer than that band is.

**Second, the copy produces the elevation.** Remove M1 and *s* falls from 0.319 to 0.173, inside the
honest band, on both replacement arms. Remove M2 and it falls to 0.271; remove M3 and it barely moves.
The estimator pools each subject's residuals across conditions, and M1 makes Control and Inhibitor_A
share one noise realisation, so a subject has roughly six independent df where the correction assumes
nine. The estimator is reading the fabrication.

**Third, DS02 has no heteroscedasticity to find.** Its generator gives every row the same 0.12
proportional coefficient of variation. There is no per-subject noise-scale term in the construction at
all.

So the failure mode the knee encodes — the test firing on honest data because intrinsically noisy
subjects reach the top-K of every condition — **cannot be what is happening on DS02**. The knee was
calibrated on data where *s* is a property of the generating process. Here it is a symptom of the
attack, measured on the same axis the test reads.

---

## 13. What carries DS02's verdict

As shipped: severity 3, zero HIGH, two MODERATE, two dimensions.

| Flag | Dimension | *p* |
|---|---|---|
| Inter-Replicate Correlation | replicate | 0.0040 |
| Residual Spike Correlation | copied | 0.0010 |

Severity 3 comes from the two-moderates-across-two-dimensions clause. Dropping either one gives severity
1 — symmetric under the formula.

**But the two flags are not independent, and that answers the question the dispatch asked.** Inter-
Replicate Correlation needs M1 present as well: with the copy removed its *p* goes from 0.0040 to 0.131,
and with M3 removed it goes to 0.315. It fires only on the **conjunction** of the copy and the replicate
lock. Residual Spike Correlation needs only the copy, and survives M3's removal unchanged.

So it is not that the severity formula happens to need a second dimension. Both of DS02's moderates
trace to the rescaled copy, and Residual Spike Correlation is the only test that reads it directly.
Suspending it removes the sole direct reading of DS02's primary mechanism, and the surviving flag is one
that would itself go quiet if the copy were the only thing removed.

**I did not determine why Inter-Replicate Correlation requires the copy.** The obvious explanation —
that M1 compresses Inhibitor_A's row-to-row amplitude and makes the locked window stand out — is ruled
out, because the variance-matched arm preserves that amplitude and the flag still goes. Named as
undetermined rather than guessed at.

---

## 14. Expectations

| # | Expectation | Result |
|---|---|---|
| 1 | The top-K rows intersect the planted block-copy region well above chance | **Wrong.** 0 observed against 0.71 expected. Zero intersection, and the region is undetected by anything |
| 2 | DS02's *s* sits below the knee, like the four clean paired fixtures | **Wrong.** 0.319, above the knee and above all twelve honest replicates — but the copy causes it |
| 3 | The rescaled copy, not the block copy, is what the test reads | **Confirmed**, decisively, with a variance-matched control |
| 4 | Ablating the block copy alone does not remove the firing | **Confirmed.** Identical flag, *p* and rows |

The dispatch set 1 against 3 and 4 deliberately. 3 and 4 won.

---

## 15. The adjudication

**Residual Spike Correlation's DS02 firing is a true detection of the rescaled copy.** The evidence:

1. It collapses when and only when M1 is removed — *p* 0.001 → 0.914 against a variance-matched control
   that changes nothing else about Inhibitor_A's distribution.
2. Removing either other mechanism leaves the flag, the *p* and the five selected rows untouched.
3. The clean sibling of the same assay, shape and generator family returns *p* = 1.000 with zero overlap
   on all three pairs.
4. With all three mechanisms removed the battery is completely silent — severity 0.
5. The heteroscedasticity failure mode cannot explain it: the construction is homoscedastic, and the
   elevated *s* is itself produced by the copy.

The detection mechanism is exactly the one the test is built on. A linear rescale preserves the residual
rank order, so the noisiest rows of Control are the noisiest rows of Inhibitor_A — and a top-K
intersection of 5 out of 5 against a chance expectation of 0.71 is what that looks like.

**Two qualifications, neither of which changes the verdict.**

- It detects the **whole-condition rescale**, not the row-level partial copy the ground-truth row leads
  with. The positional adjudication that settled DS11 is vacuous here, because M1's region is every row.
  The ablation is what carries it.
- Suspension therefore costs **two** true detections rather than one, and on DS02 it moves the file from
  *Investigate closely* to *Review* (`OUTCOME_LABEL[severity]`, `handoffModel.js:183`). It also removes
  the only direct reading of the fixture's primary mechanism, leaving a flag that depends on that same
  mechanism indirectly.

**What this does not settle.** Whether the test earns its place is P86's question and rests on the
unbounded false-positive risk above the knee in the field, which no measurement here touches. This
establishes only that DS02's firing is not an instance of that failure mode, and that the declaration
should be recorded as suspended rather than deleted — the same conclusion the disposition already
reached for DS11, now on evidence for DS02 too.

---

## 16. What I could not determine

- **Why Inter-Replicate Correlation needs the copy** as well as the replicate lock. Measured, not
  explained; the amplitude explanation is ruled out.
- **Whether M2's invisibility is worth fixing.** A partial row copy chosen independently of noise is
  outside what a top-K rank intersection can reach. Whether any test in the battery should cover it is a
  coverage question, not this dispatch's.
- **Anything about real deposits.** The twelve honest replicates come from DS02's own generator and
  bound the estimator's resolution on that shape only.
- **Whether the five selected rows are the noisiest rows for a reason.** They are Control's five highest
  mean-absolute-residual rows; no check was made that this is ordinary sampling rather than something
  the generator induces.

**Incidental, outside scope and not acted on beyond a `CLAUDE.md` correction.** `SEVERITY_WORD` is
described in `CLAUDE.md` as live and exported from `tokens.js`. It was retired at S156 —
`tokens.js:282` carries only the retirement comment, and `grep` returns no other hit in `src/`. The
dataset-level vocabulary is `ACTION_LABEL` / `OUTCOME_LABEL`.
