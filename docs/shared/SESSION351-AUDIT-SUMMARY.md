# S351 — what a paired-data skip would cost

**Scope.** Measurement only. Nothing under `src/` changed. Neither the skip of Cross-Condition
Consistency nor the suspension of Residual Spike Correlation is implemented here.

**Instrument.** `test/probes/probe-s351-paired-skip.mjs`, committed with this summary. It loads all 27
fixtures exactly the way `test/validate-batch.mjs` loads them, derives pairing from the data,
reconciles every baseline severity against `EXPECTED`, and measures severity four ways.

```bash
node test/probes/probe-s351-paired-skip.mjs
```

```bash
SEEDS=8 node test/probes/probe-s351-paired-skip.mjs
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

**Two S349 instruments, and only one of them exists. Corrected at S351 Part 2.**

The S351 Part 1 dispatch said the S349 census matcher "was not [committed], and its result is now
unreproducible," and this section originally answered that by pointing at
`test/probes/probe-s349-pairing-census.mjs`, which is tracked and was committed at `1f2724f`. That
answer was about the wrong instrument.

`STATUS.md:81` Known bug 9 reads: "**The S349 census matcher was never committed and was not kept.**
Six S349 probes are tracked; the script that carved the `tests` array and applied the four-marker rule
exists nowhere. The census's twenty members rest on a prose description no one can re-run." That is the
**condition-partitioned dispatch-entry census** — the twenty-member one. **It is still missing and
Known bug 9 still stands.** Nothing in this summary retires it.

The instrument that does exist is a different one: a **pairing** census over fixtures. Its agreement
with Part 1's census is real but narrow. It walks eight fixtures, all clean — DS01, DS03, DS05, DS07,
DS09, DS12a, DS17 and vfs-a — of which **four sit in the paired nine** (DS01, DS03, DS09, DS17). It
could not structurally have reached DS02, DS04, DS10, DS11 or DS16, since none of them is in its list.
So it corroborates four of nine members and is silent on the other five. It is not a cross-check of the
census.

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

---
---

# Part 4 — does copy fidelity inflate *s*?

**Scope.** Measurement only. Nothing under `src/` changed. This decides nothing about P86, whose
suspension rests on unbounded field risk that no measurement here touches. It decides whether the
reinstatement route is buildable.

**Why it was asked.** Part 3 measured DS02 at *s* = 0.319 with its rescaled copy and 0.173 without. A
copy makes two conditions share one noise realisation, so a subject carries fewer independent degrees of
freedom than the bias correction assumes and the estimator reads the shortfall as dispersion. If that
generalises, the gate and the detector read the same signal in opposite directions.

**Instruments**, both committed here:

```bash
python3 test/probes/gen-s351-ds11-ablation.py /tmp/s351-ds11
```

```bash
SEEDS=20 DS11DIR=/tmp/s351-ds11 node test/probes/probe-s351-s-gate.mjs
```

**Answer, stated first.** It is a curve, not a fixture artefact. **The *s*-gate is not buildable as
specified.** Measured *s* rises monotonically with copy fidelity on data planted at zero dispersion; at a
perfect copy it sits above the threshold on the majority of files; the honest and fabricated populations
overlap with no separating threshold; and **both of the test's adjudicated true detections sit above the
knee because of their own fabrication.**

---

## 17. The instrument

`test/gen-copy-fidelity.mjs`, unchanged since S350 — `git log --follow` returns exactly two commits,
`f343cdd` (S350 Parts 9–11) and `3321e70` (S350 Parts 12–13), and nothing after.

| | |
|---|---|
| Copy fidelity | `k` in [0, 1]. Units: copy noise as a multiple of the file's own within-condition replicate noise. `k = 0` perfect copy, `k = 1` exact independence, `rho = sqrt(1-k²)`. Ladder `[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.65, 0.8, 0.9, 1.0]` |
| Planted dispersion | **`sigmaS`, settable, default 0.** Ladder `[0, 0.15, 0.3, 0.5, 0.75, 1.0]` |

**Planted *s* = 0 is settable and is the default**, so the control the whole sweep rests on exists: any
*s* the estimator reads on such a file is estimator noise or copy-induced and nothing else. The halt
condition is cleared.

Assumptions, from the file's own header, all defaults and all overridable: log-normal on the log scale;
multiplicative homoscedastic noise; independent replicates with no batch, plate, drift or serial
structure; a fixed 1.5× effect on a fixed 20% of subjects; `tau` 1.15 against `sigma` 0.25, so subject
levels span about two orders of magnitude; 6 replicates; 120 matched subjects; **exactly two
conditions**; two decimals. The two-condition limit matters — the max-over-pairs structure that gives
the test its power at three conditions is absent by construction.

Two checks before using it, both passed:

- The estimator fed the generator's own arrays and fed the matrix parsed back out of its CSV return
  **identical** values, so the sweep's numbers and DS02's are on the same footing.
- `sharedSubjects` pins the subject level, and the estimator centres within condition. Measured
  **identical** with the mode on and off, confirming subject level is invisible to it. The sweep runs in
  the default mode.

The estimator is imported, not re-derived — the same function that produced 0.041, 0.055, 0.162 and
0.199 on the clean paired fixtures and 0.319 on DS02.

---

## 18. The sweep

Twenty independently generated datasets per cell. "RSC fires" counts MODERATE or HIGH under the shipped
free null.

**Planted *s* = 0 — the control**

| `k` | measured *s*, median [min..max] | RSC fires | median *p* |
|---|---|---|---|
| 0 (perfect copy) | **0.261** [0.215..0.312] | 20/20 | 0.0010 |
| 0.1 | 0.255 [0.214..0.317] | 20/20 | 0.0010 |
| 0.2 | 0.247 [0.209..0.315] | 20/20 | 0.0010 |
| 0.3 | 0.244 [0.203..0.304] | 20/20 | 0.0010 |
| 0.4 | 0.232 [0.182..0.285] | 20/20 | 0.0010 |
| 0.5 | 0.215 [0.158..0.264] | 19/20 | 0.0010 |
| 0.65 | 0.180 [0.117..0.230] | 11/20 | 0.0055 |
| 0.8 | 0.143 [0.053..0.202] | 1/20 | 0.0825 |
| 0.9 | 0.107 [0.000..0.177] | 2/20 | 0.3425 |
| 1 (independence) | **0.050** [0.000..0.138] | 0/20 | 0.5425 |

**The other three rows of the grid**, medians only:

| planted *s* | `k`=0 | 0.2 | 0.4 | 0.65 | 0.8 | 1 |
|---|---|---|---|---|---|---|
| 0 | 0.261 | 0.247 | 0.232 | 0.180 | 0.143 | 0.050 |
| 0.15 | 0.289 | 0.283 | 0.267 | 0.232 | 0.204 | 0.150 |
| 0.3 | 0.386 | 0.380 | 0.370 | 0.341 | 0.325 | 0.289 |
| 0.5 | 0.544 | 0.540 | 0.536 | 0.518 | 0.502 | 0.480 |

The diagonal check holds: at `k` = 1 the estimator recovers 0.050, 0.150, 0.289 and 0.480 against
planted 0, 0.15, 0.3 and 0.5. It is measuring what it claims to when nothing is copied.

### Q1 — is it a curve?

**Yes, and strictly monotone.** On data planted at zero dispersion, measured *s* falls from 0.261 at a
perfect copy to 0.050 at independence, decreasing at every one of the ten rungs. The DS02 result was not
fixture-specific. Copy fidelity alone moves the estimate by 0.21 with no dispersion planted at any point.

The inflation is largest exactly where the copy is best — the same place the detector works.

### Q2 — does a perfect copy cross the knee?

**Yes, on the majority of files.** At `k` = 0 with zero planted dispersion, the median is **0.261** and
**13 of 20** datasets read at or above 0.25. Every one of those 20 files fires the test at *p* = 0.001.

So the gate would skip the test on most instances of the cleanest detection case it has.

### Q3 — can one threshold separate the two populations?

**No.**

| Population | n | median | range |
|---|---|---|---|
| Honest-heteroscedastic — `k`=1, planted *s* in {0.3, 0.5}, where the test false-positives | 40 | 0.384 | [0.245..0.553] |
| Copy-fabricated — planted *s* = 0, `k` in {0, 0.1, 0.2, 0.3, 0.4}, where the test works | 100 | 0.253 | [0.182..0.317] |

The ranges **overlap on [0.245, 0.317]**. Fourteen of the forty honest files and fifty-three of the
hundred fabricated ones fall inside that band. No single threshold separates them, and the overlap is
not a tail effect — it contains over half the fabricated population.

---

## 19. Resolution — subject count or estimator?

Measured at `k` = 1 so no copy contamination enters, replicates held at 6 and conditions at 2 so df per
subject is 10 in both arms.

| Subjects | planted *s* | measured *s*, median [min..max] | spread |
|---|---|---|---|
| 120 | 0 | 0.072 [0.000..0.140] | 0.140 |
| 35 | 0 | 0.076 [0.000..0.156] | 0.156 |
| 120 | 0.3 | 0.304 [0.265..0.380] | 0.115 |
| 35 | 0.3 | 0.282 [0.174..0.357] | 0.183 |

**Expectation 4 inverts.** Tripling the subject count buys almost nothing — the spread at zero planted
dispersion falls from 0.156 to 0.140, about a tenth, where pure sampling on a standard deviation would
predict a factor of `sqrt(120/35)` ≈ 1.85. **Resolution is not a subject-count problem.**

Replicates are the binding constraint, and they fix it. At 120 subjects:

| Replicates | df/subject | planted *s* | measured *s*, median [min..max] | spread |
|---|---|---|---|---|
| 6 | 10 | 0 | 0.076 [0.000..0.141] | 0.141 |
| 12 | 22 | 0 | 0.000 [0.000..0.084] | 0.084 |
| 24 | 46 | 0 | 0.000 [0.000..0.052] | 0.052 |
| 6 | 10 | 0.3 | 0.313 [0.244..0.358] | 0.115 |
| 12 | 22 | 0.3 | 0.303 [0.252..0.337] | 0.084 |
| 24 | 46 | 0.3 | 0.295 [0.254..0.344] | 0.090 |

The median at planted 0.3 stays near 0.30 throughout, so the estimator is unbiased at every replicate
count. Only its noise floor moves. **The remedy is replicates per subject, not subjects** — and
replicate count is a property of the deposited experiment, not something a corpus or a gate can choose.

This corrects a figure in the disposition. `S350-PAIRED-DESIGN-DISPOSITION.md:116` reads "the estimator's
resolution floor is about 0.055". The floor is not a point: on honest, zero-dispersion data at 120
subjects and 6 replicates, individual files read anywhere from 0.000 to 0.140.

---

## 20. The obvious remedy, measured

Estimate the scale from **one condition only**, so a copy cannot contaminate it. That halves the df each
subject contributes, trading contamination for resolution. Run at `k` = 0, a perfect copy, where a
two-condition estimator is maximally contaminated — so anything above zero here is resolution.

| Replicates | df/subject | planted *s* | measured *s*, median [min..max] | spread |
|---|---|---|---|---|
| 6 | 5 | 0 | **0.151** [0.000..0.214] | 0.214 |
| 12 | 11 | 0 | 0.079 [0.000..0.115] | 0.115 |
| 6 | 5 | 0.3 | 0.344 [0.244..0.416] | 0.172 |
| 12 | 11 | 0.3 | 0.307 [0.233..0.407] | 0.174 |

At six replicates the copy-immune estimator reads up to **0.214 on data with zero dispersion** — inside
the 0.2–0.3 knee. It cannot resolve the threshold it would be gating on. At twelve it can.

So the two routes are blocked by one budget. The two-condition estimator has the df but is contaminated
by the thing it is meant to be independent of; the single-condition estimator is clean but needs about
twelve replicates per subject to resolve the knee. The corpus's paired fixtures carry four (DS02, DS11)
or six (DS09).

---

## 21. DS11 — the second real data point

**Provenance first.** DS11 reproduces **byte-identically** from `generate-test-datasets.py`. It is the
eleventh generator and all of them draw from one Mersenne Twister seeded at 7741, so the ablation runs
the real file with a single in-memory source substitution rather than re-implementing eleven generators.
The substitution disables only the line that *writes* the spike; both draws that decide one —
`spike_rep` and `spike_magnitude` — happen outside the replicate loop and are left in place, and the
multiplication consumes no randomness. The ablated run therefore draws exactly what the shipped run
draws. It changes 60 of 1501 lines: 20 genes × 3 conditions, which is the plant exactly.

| | *s* | raw | RSC | *p* | overlap | K |
|---|---|---|---|---|---|---|
| shipped | **0.2716** | 0.3596 | MODERATE | 0.003 | 13 | 50 |
| spikes ablated | **0.0000** | 0.2237 | LOW | 0.139 | 9 | 50 |

**Expectation 5 confirmed, and more sharply than DS02.** DS11's entire measured dispersion is the plant.
Twenty genes out of 500 — four per cent of subjects — carrying a shared residual spike take the file from
0.000 to 0.272. Ablated, the raw value of 0.2237 falls below the bias floor `sqrt(1/(2·9))` = 0.2357 and
the corrected value clamps to exactly zero.

The mechanism differs from DS02's. DS02 rescales a whole condition; DS11 spikes one replicate position
in every condition on selected genes. **Both inflate the estimate, so the contamination is a property of
planted cross-condition structure rather than of rescaling specifically.** That is the companion the
dispatch asked for.

### Both adjudicated detections sit above the knee, and their own fabrication puts them there

| Fixture | *s* as shipped | *s* with the plant removed | RSC as shipped |
|---|---|---|---|
| DS02 | 0.319 | 0.173 | MODERATE, *p* 0.001 |
| DS11 | 0.272 | 0.000 | MODERATE, *p* 0.003 |

Against a knee at 0.2–0.3 and a working threshold of about 0.25, both are above. DS02 sits above the
whole band. A gate built as specified would skip Residual Spike Correlation on **both** files it is known
to be right about.

---

## 22. Expectations

| # | Expectation | Result |
|---|---|---|
| 1 | Measured *s* rises monotonically with copy fidelity on data planted at *s* = 0 | **Confirmed.** 0.050 → 0.261, monotone at all ten rungs |
| 2 | At a perfect copy it crosses the knee, so the gate excludes its own best case | **Confirmed.** Median 0.261, 13/20 at or above 0.25, all 20 firing at *p* 0.001 |
| 3 | The two populations overlap and no single threshold separates them | **Confirmed.** Overlap on [0.245, 0.317], containing 53 of 100 fabricated files |
| 4 | The spread is much tighter at 120 subjects than at 35, so resolution is a subject-count problem | **Wrong.** 0.140 against 0.156 — a tenth. Replicates are the constraint, not subjects |
| 5 | DS11's *s* drops on ablation, as DS02's did | **Confirmed**, to exactly zero |

Expectations 1–3 stood or fell together and all three stood, so the DS02 finding is general.

---

## 23. Is the gate buildable?

**Not as specified.** Four measured reasons, any one of which is sufficient:

1. The contamination is a curve. Copy fidelity alone moves measured *s* by 0.21 on data with no
   dispersion planted at any point.
2. At the cleanest detection case the estimate crosses the threshold on 13 of 20 files, so the gate would
   skip the test on the majority of its best cases.
3. The honest and fabricated populations overlap on [0.245, 0.317], and no threshold separates them.
4. Both of the test's adjudicated true detections read above the threshold, and removing their plants
   drops them to 0.173 and 0.000.

**What would have to change.** A gate needs an estimator that cannot be moved by the thing it is gating
on. Estimating the scale from a single condition achieves that, and it is measured: clean, but needing
about twelve replicates per subject to resolve a 0.25 threshold, against the four or six the paired
fixtures carry. So the honest statement is that the gate needs both a different estimator and more
replicates than the corpus has — not a better-fitted threshold.

**This also answers the question the dispatch raised about P65.** A field measurement of *s* on real
deposits needs a contamination control before it is worth running. Measured with the shipped estimator on
deposits of unknown status, a fabricated file reads high for the same reason a heteroscedastic honest one
does, and the two cannot be told apart in the overlap band. Running P65 without that control would
produce a number that means neither thing.

---

## 24. What this does not settle

- **P86's disposition.** The suspension rests on unbounded false-positive risk in the field above the
  knee. Nothing here touches that. This says the reinstatement route as written does not work, not that
  the suspension should lift or stand.
- **The field value of *s*.** Every number here comes from one generator carrying its own assumptions —
  log-normal, homoscedastic, no serial structure, a fixed effect on a fixed fraction, exactly two
  conditions. It locates the instrument, not real deposits.
- **Whether some other gating quantity exists.** Only *s* was measured. Nothing here rules out a
  different statistic separating the two populations.
- **Three-or-more-condition behaviour.** The generator emits exactly two conditions, so the max-over-pairs
  structure the test relies on at three is absent throughout. DS11 is the only three-condition datum here
  and it is a single file.
- **Whether the single-condition estimator behaves at three conditions**, where a per-condition estimate
  could be pooled across conditions with the copy structure still excluded. Not measured.

---
---

# Part 2 (P82) — Cross-Condition Consistency is skipped on paired data

**This part changes `src/`.** It is the first `src/` change since S345; the four earlier S351 commits
were measurement only.

**What decided it.** Part 1 measured that suppressing this test moves no severity on any of the nine
paired fixtures — DS01, DS03, DS09 and DS17 stay 0, DS02, DS04, DS10 and DS11 stay 3, DS16 stays 2 —
and that neither fixture declaring a channel for it (DS15, DS19) is paired. The cost is zero and it was
measured before it was implemented.

**P86 is untouched.** Residual Spike Correlation ships exactly as before. It is not in the skip map.

---

## 25. The scope rule, corrected

A test is skipped on paired data when **its null destroys the correspondence between row *r* in one
condition and row *r* in another**. Direction-agnostic.

The earlier wording — "shuffles rows across conditions" — reaches all seven Cross-Condition Consistency
arms and zero Residual Spike Correlation arms, which is not what the disposition decided. The two tests
break the same correspondence by opposite operations: one moves the condition tags under fixed rows, the
other moves the rows under fixed tags. The corrected rule is the one written into the code, the comments
and the disposition.

All seven arms are withheld together. They share one Fisher–Yates over `permRow`, so there is no subset
to spare.

---

## 26. Where the verdict lives

| | |
|---|---|
| **Computed** | `extractAnalysisInputs` (`engine.js`), by `computeSubjectPairing` in the new `src/analysis/subjectPairing.js` |
| **Stored** | `condCtx.subjectPairing` — `{ paired, basis, idColumn, idColIndex, nConditions }` |
| **Read by** | one consumer: the `pairedSkip` closure in `runFullAnalysis`, which the Cross-Condition Consistency dispatch calls before anything else |

It is computed in `extractAnalysisInputs` for the same reason `groupingTrigger` is: that is the only
scope holding `data`, `roles` and `filteredIndices` together, and **the identifier column is dropped
from the matrix two statements earlier**. `runFullAnalysis` receives only the matrix and the context, so
the verdict is stamped onto the context, exactly as the S320 trigger is.

**Not wired to `condCtx.paired`.** That field has one reader in all of `src/`, it is `false` on the
row-grouped branch, and `forSubMatrix` rebuilds children with `groups: null` so every child reads
`false`. The verdict carries its own name.

**One hole closed rather than relied on.** `withMatrix` builds a transformed child for the VST path, and
a plain rebuild would drop the stamp. `runFullAnalysis:208` already calls it on a branch that is
currently unreachable — but a consumer reading the verdict off a transformed context would silently see
`undefined` and treat a paired file as unpaired, which is the direction that runs a test it should not.
`withMatrix` now carries the verdict onto the child, because pairing is a property of which subjects sit
in which condition and a transform cannot change it. `forSubMatrix` deliberately does not: this test is
never dispatched through `aggregatePerGroup`, and a column-group child is a different pairing question.

The rule itself is Part 1's census, unchanged: column-grouped is paired structurally; row-grouped needs
an identifier column where every subject appears exactly once in every condition with identical sets
across them; everything else is unpaired. **Every non-data column is tested, not the first label
column** — DS03 and DS04 are paired on their second one, and a first-column reading returns seven where
the corpus has nine, silently.

---

## 27. The decline census

Prior counts of these wordings went 11 → 16 → 17. Both figures below differ from all three, so neither
was carried forward from a doc.

| Census | Count | What it counts |
|---|---|---|
| **Empirical** | **84** distinct wordings | Every decline that actually reaches a card across the 27 fixtures, including the per-test strings returned from inside test modules |
| **Static** | **22** distinct wordings | What the constants define — the two shared-cause families plus the two whole-description constants — whether or not the corpus exercises them |

Neither substitutes for the other. The static census cannot see a reason no constant holds; the
empirical one cannot see a wording no fixture fires.

The register's grammar, read off the census rather than assumed: `"Not applicable — <reason>."` for the
whole-description constants, `"Not applicable to <kind> data. <per-test tail>"` for the shared-cause
family, `"Not applicable because <reason>."` for the two engine-level constants, and a handful of terse
forms like `"Need ≥2 experimental conditions."`

### The string

Two constants mirroring the `DATATYPE_*` pair, joined by the existing `joinDeclineReason`:

- `PAIRED_CAUSE` — `Not evaluated — the same subjects appear in every condition.`
- `PAIRED_SKIP["Cross-Condition Consistency"]` — the per-test tail.

The card reads:

> Not evaluated — the same subjects appear in every condition. This check compares each pair of
> conditions against a reference it builds by reshuffling subjects between them, which only describes a
> study where the conditions hold different subjects. Here they hold the same ones, so the comparison is
> withheld rather than reported: a result from it would not mean what it appears to mean.

It keeps the register's em-dash-then-explanation shape but opens **"Not evaluated"** rather than "Not
applicable", because the three constraints were not negotiable and the first of them requires it. All
three hold: it says not evaluated and never reads as a pass; it carries **no p, no distance and no
percentile** — the skip returns before anything is computed, so there is no number to suppress; and it
explains itself without the word "paired" doing the work.

**Routed through the existing machinery, not a second path.** The result carries `description` (the
joined pair), `naCauseText` and `naTailText`, which is the whole contract
`groupNotApplicableByReason` reads — it keys on the cause when present and indents the per-test tail
under it. No registry entry was needed anywhere. `getApplicabilityTests` needs no change either: this
test already sits in `RUN_ONLY_TESTS`, which is exactly right for a decline only knowable by running.

A new decline code, `NA_CAUSE.SUBJECTS_SHARED_ACROSS_CONDITIONS`, joins the decline family — the data's
structure is wrong for the test and more data would not help.

---

## 28. Verification

**1. Severity — byte-identical.** All 27 fixtures return the severity they returned before, and each
matches `EXPECTED`. Nothing moved.

**2. String dump — the diff is exactly the predicted one.** Every result's name, flag, `primaryP` and
`description` was dumped across all 27 fixtures before and after: 783 rows each time.

| | |
|---|---|
| Rows differing | **18** — nine rows, before and after |
| Fixtures affected | **DS01, DS02, DS03, DS04, DS09, DS10, DS11, DS16, DS17** — exactly the paired nine |
| Tests affected | **one**, Cross-Condition Consistency |
| Transition | LOW → N/A on all nine |

Not byte-identical, so the skip fired. Not wider than one test, so it stayed in scope.

**3. PRNG — measured, not argued.** The description dump cannot answer this, because most tests never
put a number in their description. So `primaryP` was carried in the dump at 18 significant digits, the
`src/` changes were stashed to reproduce the pre-change tree, and the two runs were compared on the
p-column alone with Cross-Condition Consistency excluded: **515 p-values across every other test and
every fixture, identical.** That is the empirical confirmation. The architectural reason is S340's
per-test streams — each instance derives from the data hash plus its own dispatch-map key and is
memoised per identifier, so never calling `rngFor("Cross-Condition Consistency")` cannot displace an
instance no other test shares.

**4. Full batch — 27/28, DS12b the sole failure.** Unchanged from before this dispatch. DS12b fails the
completeness gate on an undeclared Regional Noise Homogeneity firing; it is unpaired, its row in the
dump did not move, and nothing here touches it.

**5. Build and serve.** `npm run build` succeeds in 1.35 s. `npm run dev` serves: index 200, entry
module 200, and the new `src/analysis/subjectPairing.js` compiles and serves at 200. No visual
verification was attempted — that is Nick's.

---

## 29. The disposition edit

`docs/shared/S350-PAIRED-DESIGN-DISPOSITION.md` §1's opening two sentences were replaced with the
corrected scope rule, verbatim as specified. The uniqueness check on the anchor returned **exactly one
line** before the edit. Afterwards `git diff` shows one hunk, 9 insertions and 3 deletions, and deleting
the replaced lines from both versions leaves the two files byte-identical — so nothing outside the
anchor moved.

No other change was made to that file. Its §3, §5 and §6 need corrections from the s-gate sweep and
those are Chat's, landing separately.

---

## 30. Where METHODOLOGY states the general case — read only, no edit

The general rule lives in **`## Condition Grouping Contract (v1.x, S318)`**, and its `**Motivation.**`
paragraph is the statement the new rule generalises:

> **Motivation.** The permutation nulls in the row-grouped tests all rest on one assumption:
> **conditions are exchangeable at the row level.** Rows within a condition are interchangeable draws
> from the same distribution, so shuffling condition labels across rows generates a valid null.

That section already names one way the assumption fails — the factor-versus-stratum mismatch, framed as
observational unit against experimental unit. **A paired design is a second, independent way it fails,
and the section does not mention it.** The paragraph immediately after the one quoted above is where the
observational/experimental-unit distinction is developed, so a paired-design clause sits naturally
either directly after the Motivation paragraph or as a sibling of the `**Factor versus stratum.**`
subsection that follows.

Two further places already carry the specific case and would only need a pointer, not a restatement: the
`### 1.9 Cross-Condition Consistency Framework` heading block, whose opening line already announces the
S350 decision and names the disposition as authoritative, and the same section's paired-designs bullet,
which already reads "the framework is skipped on paired data" and gives the 9-of-27 reach. Residual Spike
Correlation's §1.7 note carries its own suspension paragraph.

Candidate insertion points reported; the general-case edit is Chat's to author.

---

## 31. Corrections to this dispatch's premises

- **The S349-census claim was not in `CLAUDE.md`.** It was in §5 of this summary. `CLAUDE.md` never
  carried it. Corrected in place, and §5 now records that Known bug 9 concerns a different, still-missing
  instrument and still stands.
- **`groupNotApplicableByReason` is not in `src/constants/assays.js`.** It lives in
  `src/analysis/noVerdictReasons.js`. The rest of the decline machinery is where the dispatch said.
- **`PAIRED_CAUSE` and `PAIRED_SKIP` were not put in `assays.js`.** They key on neither assay nor data
  type, so they live beside the detection in `subjectPairing.js` — the same reasoning that puts
  `ROW_SEMANTICS_SKIP_REASON` in the row-semantics module. The machinery they route through is the
  shared one either way.

## 32. Expectations

| # | Expectation | Result |
|---|---|---|
| 1 | Every severity byte-identical across all 27 fixtures | **Confirmed** |
| 2 | The dump changes this test's description on exactly nine fixtures and nothing else anywhere | **Confirmed** — 18 diff lines, nine fixtures, one test |
| 3 | The decline census returns a different count from any figure in the docs | **Confirmed** — 84 empirical and 22 static, against 11/16/17 |
| 4 | The pairing verdict needs a new field; nothing existing carries it correctly | **Confirmed** — `condCtx.paired` is false on the row-grouped branch and on every `forSubMatrix` child |
