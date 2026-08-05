# Can we just raise the permutation count?

Read-only feasibility read on the three routes named for the verdict-stability blocker. Nothing in
`src/` changed; the two count changes measured here were made by load-time source hooks that already
ship in `test/probes/`, so there was nothing to revert.

**Baseline for every number below:** commit `4248cd5`, Node v25.8.1, darwin arm64, batch **27/28 with
`12b-uniform-mixture-fabricated.csv` the sole failure**, `PERF=1` total wallclock **48.65 s**.

---

## Summary — the five expectations

| # | Expectation | Verdict |
|---|---|---|
| 1 | Counts are independently adjustable now; changing one test's `B` moves only that test | **Held.** Measured on two arms. Every other test byte-identical on every fixture |
| 2 | The neighbour rate is 6 of 60 on one fixture, and "one in five" is a different measurement | **Inverted, both halves.** They are the same measurement at two sample sizes. And the rate at `4248cd5` is **0 of 60** |
| 3 | All three METHODOLOGY reasons are lapsed | **Two of three.** Parity and Compute are lapsed against named things. Necessity is unrefuted — it is out of scope, which is not the same |
| 4 | Raising `B` on the affected test alone removes the one-permutation flip | **Inverted, twice.** There is no "the affected test" — an eight-offset sweep finds unstable cells on **three** tests. And on the one whose severity actually moves, `B = 5999` leaves the flip rate exactly where `B = 999` had it; it takes `B = 39999` |
| 5 | The runtime cost is small enough not to bear on the decision | **Held at the `B` the arithmetic asks for, not at the `B` that works.** +7.3 s on a 48.65 s batch at `B = 5999`; **+52.7 s at `B = 39999`**, which more than doubles the batch and puts 11.7 s of one test on one file |

**Two findings sit outside the list.**

**The fixture the blocker is written about no longer exhibits the instability**, because the channel
that produced it was withheld there two arcs ago. The instability did not go away — it is now on
fabricated fixtures, which reverses its sign from false positive to missed detection. Part 2 carries
this.

**The shipped tree fails its own multi-seed gate.** `SEEDS=8` at `4248cd5` reports one fixture with
seed-unstable severity (`15-missing-carlisle`, 3 → 2 on one offset) and three unstable flag cells
across three different tests. That is the blocker, measured on the corpus as it stands, and it is
larger than the single channel STATUS names. Part 4 carries this.

---

## Part 1 — are resample counts independently adjustable?

**Yes. Measured, not argued.**

The instrument is the pair already in `test/probes/`: `probe-s340-pdump.mjs` dumps every test's `flag`
and `primaryP` on all 27 fixtures through the same import pipeline `validate-batch.mjs` uses, and
`probe-s340-pdiff.mjs` diffs two dumps at `1e-12`. The count change is made by
`s340-one-b-hook.mjs`, a load-time source substitution that throws if its anchor line has moved.

Two arms, each **exactly one extra draw** on every fixture the test runs on, chosen so the count is a
bare constant rather than a row-count ternary.

**Arm A — Benford's Law (First Digit), `src/tests/benford.js:56`, `N_SIM_BENFORD` 5000 → 5001.**
This is the **first** entry in `engine.js`'s `tests` array (`:412`), so under the pre-S340 single
stream every other test in the battery was downstream of it. (The array's total is under dispute at
P79 — 29 against METHODOLOGY-MAP's 28 — so it is not cited here.)

| result | value |
|---|---|
| severity changes | **0** |
| flag (tier) changes | **0** |
| tests whose `primaryP` moved on any fixture | **1** — Benford's Law (First Digit), on 6 fixtures |
| tests byte-identical on every fixture | **30** |

The one test that moved moved only through its own denominator. Its exceedance counts are unchanged
on all six: `1/5001 → 1/5002` (`08-elisa-fabricated`, `09-proteomics-clean`,
`23-recurrence-null-mixed`), `3/5001 → 3/5002` (`10-proteomics-fabricated`), `16/5001 → 16/5002`
(`11-rnaseq-multicondition`), `241/5001 → 241/5002` (`07-elisa-clean`). The extra simulated batch
changed the grid, not the ranking.

**Arm B — Residual Spike Correlation, `src/tests/residualSpikeCorrelation.js:113`, `N_PERM` 999 → 1000.**
A permutation test rather than a simulation, and one that sits mid-dispatch.

| result | value |
|---|---|
| severity changes | **0** |
| flag (tier) changes | **0** |
| tests whose `primaryP` moved on any fixture | **1** — Residual Spike Correlation, on 5 fixtures |
| tests byte-identical on every fixture | **30** |

**The standing objection does not survive S340.** `createPRNG` as a single stream consumed in
dispatch order is no longer what runs: `engine.js:210` builds `createPRNGFactory(matrix)` and every
dispatch site draws from a stream keyed on the data hash plus its own dispatch-map key. Changing a
count changes how many draws that test takes from its own stream and nothing else. The architectural
statement was already in `CLAUDE.md`; this is the measurement behind it.

Reproduce:

```sh
node test/probes/probe-s340-pdump.mjs base
S340_TEST=benford S340_B=5001 node --import ./test/probes/s340-one-b-hook.mjs \
  test/probes/probe-s340-pdump.mjs benford5001
node test/probes/probe-s340-pdiff.mjs base benford5001
```

---

## Part 2 — the neighbour rate at source

### The probe and the measurement

**The probe is `test/probes/probe-s343-neighbours.mjs`**, committed at `df8f821` (S343) and unmodified
since. `test/probes/probe-s348-seed-sensitivity.mjs` and its hook `test/probes/s348-hash-hook.mjs`
were committed across `ade4fd4` … `5d800cf` (S348). All three are tracked and all three still run.

| question | answer |
|---|---|
| which fixture | `09-proteomics-clean.csv`, 400 × 6, two conditions of 200 rows |
| how many neighbours | 60, each differing from the fixture in exactly one cell, nudged one unit in that value's own last decimal place |
| how many returned a non-clean verdict | **6 of 60** at S343/S348 |
| what drove every one of them | Cross-Condition Consistency, MODERATE, adjusted p = 0.006. Across the 480+ runs S348 made on clean fixtures, no other test in the battery ever reached MODERATE or HIGH |
| is the probe committed and still running | **Yes — and it now returns 0 of 60** |

### "One in five" is not a different measurement

`SESSION348-SUMMARY.md:124` is explicit. Pass B's 7 of 60 "carries a 95% Wilson interval of roughly
**6% to 22%**, which spans 'one run in seventeen' to 'one run in five'." **"One in five" is the upper
end of a confidence interval on the same experiment**, not a second experiment.

S348 then resolved that interval by running 500 instead of 60. Part 5 built 500 real one-cell
neighbours, hashed each and discarded the matrix, and reports **93/500 = 18.60%, 95% Wilson
15.43–22.25%** — stating in the same paragraph that this figure "supersedes both the 7/60 and the
500-constructed figure." So the point estimate did land near one in five, from the same design at a
larger `n`. The factor of two between "6 of 60" and "one in five" is sample size, not two different
things being counted: the two designs measured at `n = 60` differed by 6/60 against 7/60.

**Which of the two figures the evidence supports: neither, as a statement about the shipped tool.**
Both are correct as measurements at the commits where they were taken. Neither describes `4248cd5`.

### The rate today is zero, and the reason is not the count

Re-run unmodified at `4248cd5`:

```
$ N=60 node test/probes/probe-s343-neighbours.mjs
baseline severity 0 (HIGH 0, MOD 0)
60 neighbours run, each differing from the fixture in exactly one cell.
non-clean 0/60 = 0.0%   severity counts 0:60 1:0 2:0 3:0
```

S348's own instrument agrees. Re-run at `4248cd5`, `MODE=paired N=60`, all three passes:

| pass | data | seed | non-clean, S348 | non-clean, `4248cd5` |
|---|---|---|---|---|
| A | perturbed | each neighbour's own | 6/60 | **0/60** |
| B | clean | each neighbour's | 7/60 | **0/60** |
| C | perturbed | the base file's own | 0/60 | **0/60** |

Its own baseline line now reads `CCC p=undefined [N/A]`, and its identity check still passes.

Cross-Condition Consistency is the sole flip channel, and on `09-proteomics-clean` it is now
**withheld** — the P82 paired-design skip, decided at S350 and landed at S351 `ee2fe48`, fires before
anything is computed (`engine.js:483`). The fixture is row-grouped and paired on `ProteinID`, so it
is one of the nine the skip reaches. The batch dump confirms `flag: "N/A"`, `primaryP: null`.

S348 measured the rate at S348. The next arc removed the channel from that fixture.

**One qualification on the re-run, and it is a defect in the instrument — see rider 3.** Ten of the
sixty samples are not one-cell neighbours; they are files with one record destroyed, because the probe
strips the carriage return from any nudge that lands in the file's last column and the fixture is
CRLF. Those ten are also the only ten where Cross-Condition Consistency runs at all today — losing a
row makes the condition sizes unequal, which fails the pairing evidence and lifts the skip. All ten
returned LOW (adj-p 0.012 ×7, 0.024 ×2, 0.036 ×1) and severity 0. So the 0/60 holds on both readings:
zero of the fifty genuine neighbours and zero of the ten corrupted ones.

### What that leaves on the clean corpus

Of the eight severity-0 fixtures, Cross-Condition Consistency now runs on exactly **one**:

| clean fixture | CCC state at `4248cd5` |
|---|---|
| `01-densitometry-clean` | withheld (paired) |
| `03-qpcr-clean` | withheld (paired) |
| `05-cellcount-clean` | N/A — CCC does not run |
| `07-elisa-clean` | N/A — CCC does not run |
| `09-proteomics-clean` | **withheld (paired)** |
| `12a-uniform-mixture-clean` | **runs — LOW, adj-p 0.516** |
| `17-densitometry-carlisle-clean` | withheld (paired) |
| `vfs-a-pigeonhole-clear` | N/A — CCC does not run |

`12a` sits at 0.516 against a threshold of 0.010, more than forty grid steps away at its own `B = 499`
and `m = 3`. **There is currently no clean fixture whose verdict turns on a single permutation.**
That is a property of this corpus after the
paired skip, not a property of the tool: the mechanism is untouched and any unpaired file landing in
the same band inherits it.

---

## Part 3 — METHODOLOGY's three reasons for refusing to raise `B`

The live text, `docs/shared/METHODOLOGY.md:136–140`, verbatim:

```
:136  The v0.8 version rejected raising `B` on three grounds. All three have lapsed:
:137
:138  - **Parity.** "All battery permutation tests share `B = 999`" was already untrue when
      written — the row-count scaling rule emits 4999, 2000, 1999, 999, 499 and 199 across the
      battery. And until S340 the counts were genuinely coupled, because `createPRNG` was one
      stream consumed in dispatch order, so any raise displaced every test after it. Per-test
      streams landed at S340. **Counts are now independently adjustable, and changing one
      changes nothing else.**
:139  - **Compute.** The `B > 50,000` figure came from the `m`-multiplied floor and does not
      survive its correction.
:140  - **Necessity.** That argument is about reaching HIGH on a single channel. It says nothing
      about whether MODERATE is decided by a single resample, which is the live problem.
```

(Wrapped for width; the three bullets are single lines in the file.)

**Those three lines are the rebuttals, not the reasons.** The reasons were rewritten out of the file at
S343 and survive verbatim in git at `27ce2fd^:docs/shared/METHODOLOGY.md:78`:

```
Raising `B` to reach HIGH is rejected for three reasons: (a) parity — all battery permutation
tests share `B = 999`, and diverging one test breaks interpretability; (b) compute — the ceiling
gets worse with more properties or more pairs, so raising `B` enough to reach HIGH at Stages 2/3
of a framework test would require `B > 50,000`; (c) necessity — the tool's overall severity
posture already requires convergence across tests for severity 3, so single-channel HIGH was
never the target.
```

Both are quoted because the assessment below is of the reasons, and the live file no longer states
them.

### (a) Parity — **lapsed**, against two specific things

The factual premise was false when written and is false now. Census of every resample-count constant in
`src/tests/` — fourteen tests, fifteen sites, because LOESS sets its scan and its per-pair counts
separately:

| count | sites |
|---|---|
| 5000 | `benford.js:56`, `benford2.js:88` |
| 4999 / 999 | `blockedMahalanobis.js:510` (row-count) |
| 4999 / 499 | `loessResidual.js:179`, `regionalNoise.js:148` (row-count) |
| 2000 | `columnGof.js:48` |
| 1999 | `kurtosis.js:167` |
| 999 | `entropyTest.js:37`, `residualSpikeCorrelation.js:113` |
| 999 / 499 / 199 | `constantOffset.js:173`, `crossConditionConsistency.js:167`, `interReplicateCorrelation.js:244`, `runs.js:224`, `windowedAutocorrelation.js:87` |
| 499 | `loessResidual.js:357` (`PP_PERM`) |

**Seven distinct values ship, not six.** METHODOLOGY:138's own list omits 5000 and attributes the
fixed constants (5000, 2000, 1999) to "the row-count scaling rule", which emits none of them. The
correction strengthens the lapse rather than weakening it.

The mechanical half — "diverging one test" displacing others — is superseded by **S340 per-test PRNG
streams**, and Part 1 measures it: two arms, 30 tests byte-identical on every fixture.

### (b) Compute — **lapsed**, against S343's step-up correction

The `B > 50,000` figure is the rank-1 form `p_(1) · m`. At `m = 18` (the largest Stage-1+2 single-family
denominator S102 recorded) and `c = 2`, reaching `< 0.001` needs `36/(B+1) < 0.001`, i.e. `B > 35,999`;
at larger `m` it passes 50,000. Under what `bhFDR` actually returns — a Benjamini–Hochberg step-up with
monotonicity enforcement, `adj-p_min = min_j ( p_(j) · m / j )` — the reachable floor is `c/(B+1)`
independent of `m`, so HIGH on a doubled construction needs `B ≥ 2000` and nothing more. The named
supersession is S343's rewrite of §Permutation-Test Arithmetic Constraints, sourced to
`SESSION343-GATE-PROVENANCE-AUDIT.md` Part 2 and corrected in four places by
`SESSION344-FLOOR-SITE-CENSUS.md`.

**One qualification.** The reason is labelled *compute* and its content is arithmetic. The arithmetic
is void; the wallclock it gestured at had never been costed. Part 4 costs it, and it is small. So the
reason is lapsed and the concern behind its label is answered — but by this dispatch, not by S343.

### (c) Necessity — **not lapsed**

Nothing superseded it and nothing refuted it. "The tool's overall severity posture already requires
convergence across tests for severity 3, so single-channel HIGH was never the target" is still true of
the shipped severity model: `computeSeverity` reads flags plus the `TEST_MECHANISM` diversity count,
and severity 3 still needs convergence.

What changed is the question. Reason (c) answers *do we need HIGH on one channel?* The live problem is
whether MODERATE is decided by one resample, which reason (c) never addressed. METHODOLOGY:140 says
exactly this, and then files it under "all three have lapsed."

**That is a category error worth keeping out of the design conversation.** A reason that is out of
scope can come back into scope; a reason that has been refuted cannot. Reason (c) will bear again the
moment anyone proposes reaching HIGH on a single permutation channel — which is precisely what
`B = 9999` does to DS19 in Part 4. Recording it as lapsed would have let that pass unexamined.

---

## Part 4 — what would it take, and what would it cost

### Which tests carry the instability — measured, not derived

`SEEDS=8` re-runs the whole battery at eight PRNG offsets. Per `CLAUDE.md`, offset 0 **is** the shipped
stream, so this is one real draw and seven counterfactuals, not eight independent samples.

**At `4248cd5` the shipped tree fails its own multi-seed gate.** Three of 783 test × fixture cells are
not flag-constant, and one fixture's severity moves:

| fixture / test | flag across offsets 0–7 | `primaryP` across offsets | grid | consequence |
|---|---|---|---|---|
| `15-missing-carlisle` / **Cross-Condition Consistency** (declared channel) | MOD MOD **LOW** MOD MOD MOD MOD MOD | 0.009 0.006 **0.012** 0.006 0.009 0.006 0.009 0.006 | `B = 999`, `c = 2`, `m = 3` | **severity 3 → 2 on offset 2** |
| `12b-uniform-mixture-fabricated` / **Regional Noise Homogeneity** | MOD MOD MOD **LOW** MOD **LOW** MOD **LOW** | 0.008 0.006 0.006 **0.010** 0.008 **0.010** 0.008 **0.010** | `B = 499`, `c = 1` | severity constant at 1; this is the undeclared firing the batch already fails on |
| `23-recurrence-null-mixed` / **Column Goodness-of-Fit** | HIGH HIGH **MOD** HIGH HIGH HIGH HIGH **MOD** | 0.0009995 ×6, **0.001999** ×2 | `B = 2000`, `c = 2` | severity constant at 3 |

**Three tests, not one, and the blocker names none of them.** The instability is not a property of
Cross-Condition Consistency; it is a property of any test whose reported p lands within a grid step of
a threshold, and the corpus exhibits it on three different tests at three different `B` values.

`23-recurrence-null-mixed` / Column Goodness-of-Fit is the sharpest instance in the battery. `B = 2000`
was chosen so the doubled floor `2/2001 = 0.00099950` clears `ALPHA.FLAG = 0.001` — by five parts in
ten thousand. HIGH is therefore reachable **only at the exact floor**, so one exceedance out of 2 000
moves it to `4/2001 = 0.001999` and MODERATE. Two of eight offsets do. A test that clears a gate only
at its floor has no margin at all, by construction.

`15-missing-carlisle` / Cross-Condition Consistency is the one that moves a verdict. Its channel is
declared at `batch-fixtures.mjs:116` as a GT-named severity channel, and losing it takes the fixture
from severity 3 to 2. **This is the P69-shaped problem, alive, on a fabricated fixture** — so its sign
is a missed detection rather than a false alarm.

### And the case that looks unstable and is not

`19-inheritance-fabricated` is worth separating, because the arithmetic and the measurement disagree
about it and the measurement is right.

Its whole severity-1 verdict is a single Cross-Condition Consistency MODERATE at adj-p 0.006 — the only
MOD/HIGH firing on the fixture, declared `['MODERATE','HIGH']` at `batch-fixtures.mjs:147`. That 0.006
is `3 × 2/1000`: the rank-1 image of the raw floor, meaning its driving unit has **exceedance count
zero**. On the arithmetic, one permutation the other way sends it to 0.012 and severity 0.

It never happens. The cell is flag-constant across all eight offsets, and raising `B` shows why:

Cross-Condition Consistency `primaryP` at offset 0, `B` forced uniform (DS19 and DS15 sit on the 999
arm already; DS21 ships on the 499 arm, where it reads 0.024 LOW):

| `B` | `19-inheritance` | `15-missing-carlisle` | `21-localised-ar` |
|---|---|---|---|
| 999 | 0.006 MODERATE | 0.009 MODERATE | 0.012 LOW |
| 9 999 | **0.0006 HIGH** | 0.0054 MODERATE | **0.0018 MODERATE** |
| 39 999 | **0.00015 HIGH** | 0.007725 MODERATE | **0.0018 MODERATE** |

DS19's count stays at zero through 39 999 permutations, so its true tail probability is under
1/40 000 and the shipped grid was **concealing a HIGH**, not balancing on a knife edge. DS21's LOW is
concealment too, of a MODERATE that settles at 0.0018 and stays there. DS15's is the opposite: its
value converges near 0.006–0.008, genuinely on the MODERATE side but only about 0.002 clear of the
threshold, which is less than one grid step at `B = 999`.

**A p sitting one step from a threshold does not tell you which of these you have.** That is
METHODOLOGY's own point about step size, and the corpus now carries one instance of each.

### The `B` the floor arithmetic asks for

`step = (m/j) × c/(B+1)`, with `c = 2` — Cross-Condition Consistency is one of the battery's three
doubled constructions.

**The assumption behind `j`.** `j` is the rank supplying the step-up minimum: how many family members
are tied at the reported value. It is a property of the run, not of the test, so it has to be read per
fixture rather than assumed. `m` is not: Stage 1 is three pool properties on one condition pair, so
`m = 3` on every fixture that runs it here, verified on all seven. DS19 runs at `j = 1` (one unit at
the floor), DS15 at `j = 2` (two units tied at raw 0.006). **The worst case, `j = 1`, is not
hypothetical on this corpus** — so the `B` below is quoted at `j = 1` unless stated.

The binding fixture is DS15, because it is the only one whose converged value sits near a threshold at
all. Its distance from `ALPHA.NOTE` is about **0.002**.

| criterion | requirement at `m = 3`, `c = 2` | `B` |
|---|---|---|
| METHODOLOGY's own "discreteness immaterial" line — `step ≤ 0.1 α` — at the worst case `j = 1` | `6/(B+1) ≤ 0.001` | **`B ≥ 5999`** |
| the same at DS15's observed `j = 2` | `3/(B+1) ≤ 0.001` | `B ≥ 2999` |
| the same with the whole family at the floor, `j = m = 3` | `2/(B+1) ≤ 0.001` | `B ≥ 1999` |
| DS15's converged value stands **more than one step** clear of `α`, at `j = 1` | `6/(B+1) < 0.002` | `B ≥ 3000` |
| HIGH reachable at all on a doubled construction | `2/(B+1) < 0.001` | `B ≥ 2000` |

**`B = 5999` is the answer to Part 4's question as asked**: it is the smallest of the declared-shape
counts that puts the worst case the corpus exhibits — DS15 at `j = 1` — more than two grid steps from
the tier boundary, and it is what METHODOLOGY's own coarseness criterion asks for without any appeal
to the fixture's value. Nothing here was chosen by looking for a `B` that makes a fixture come out a
particular way; the arithmetic was run first and the arms were run to check it.

### What a raise actually does — single-offset arms

Whole-batch arms, Cross-Condition Consistency only, via `s340-one-b-hook.mjs`. The hook collapses
CCC's three arms to one value, so fixtures on the 499 arm move further than a single-arm raise would —
these are an upper bound on a targeted change.

| arm | batch | CCC total ms | batch wallclock | what moved |
|---|---|---|---|---|
| shipped (999/499/199) | 27/28 | 794 | 48.65 s | — |
| `B = 999` uniform | 27/28 | 1 371 | 48.80 s | nothing |
| `B = 1999` | 26/28 | 2 722 | 49.92 s | `21-localised-ar` CCC → MODERATE (undeclared; trips the completeness gate) |
| `B = 5999` | 26/28 | 8 047 | 56.64 s | same |
| `B = 9999` | 25/28 | 13 590 | 63.98 s | same, **plus `19-inheritance-fabricated` CCC → HIGH, severity 1 → 2** |

The two fixtures that move are both concealment cases, and the verdict is **promoted, not stabilised
where it stood**. DS19's unit sits at exceedance count zero; at `B = 9999` the doubled floor is
`2/10000` and its rank-1 image is `0.0006`, under `ALPHA.FLAG`. That is the shape S349 recorded on
`09-proteomics-clean` before the skip — at `B = 9999` it flagged 20 of 20 at 0.0036, so the coarse
lattice had been *concealing* a settled answer rather than manufacturing an unsettled one. DS15, the
fixture whose severity actually moves, is absent from this table at every arm: it holds MODERATE at
offset 0 throughout, and its instability only shows under the offset sweep above.

Three consequences the design conversation should carry, because none is a regression:

- **A raise changes what the battery reports on fixtures that were never unstable.** DS21 and DS19 both
  move tier. Neither was flipping; both were being under-reported. Whether that is wanted is a
  calibration decision, not a side effect to absorb quietly.
- **The batch's expectations are calibrated to the shipped grid.** DS19's declared allow-set already
  contains HIGH, but its `expected.severity: 1` does not survive the promotion. DS21's new MODERATE is
  undeclared. A raise is a re-derivation of the declarations for that test, not a constant change —
  the same rule `CLAUDE.md` states for renaming a dispatch key.
- **Reason (c) comes back.** `B = 9999` gives Cross-Condition Consistency a single-channel HIGH, which
  is what the v0.8 necessity argument was about. It is unrefuted (Part 3) and it applies.

### `B = 5999` does not settle it. `B = 39999` does.

The arithmetic asked for 5999. The eight-offset sweep at 5999 says it does not work.

| arm | `15-missing-carlisle` CCC adj-p, offsets 0–7 | flips | severity |
|---|---|---|---|
| `B = 999` (shipped) | 0.009 0.006 **0.012** 0.006 0.009 0.006 0.009 0.006 | **1 of 8** | 3 → **2** on one offset |
| `B = 5999` | 0.0055 **0.010** 0.008 0.003 0.0075 0.007 0.0085 0.009 | **1 of 8** | 3 → **2** on one offset |
| `B = 39999` | flag-constant MODERATE | **0 of 8** | **constant 3** |

Six times the permutations bought nothing: same flip rate, same severity failure. The grid step fell
from 0.006 to 0.001 and the *observed spread widened* in grid units — three reachable values became
eight strewn between 0.003 and 0.010. Forty times the permutations does settle it, and the multi-seed
gate passes for severity at that arm.

**The quantity deciding DS15's tier is not the grid step. It is the Monte-Carlo standard error of the
p estimate, and the two shrink at different rates.** The grid falls as `1/B`; the standard error of an
exceedance count falls as `1/√B`. Writing `π` for the driving unit's true one-tail exceedance rate, the
reported value is `(m/j) × 2(k+1)/(B+1)` with `k ~ Binomial(B, π)`, so

    SD(adj-p) ≈ (m/j) × 2 √(π/B)

DS15's converged adj-p is about 0.0072, which at `m/j = 3` puts `π ≈ 0.0012`; its distance from
`ALPHA.NOTE` is about 0.0028. That gives 1.0 σ of margin at `B = 5999` and 2.7 σ at `B = 39999` — a
one-in-six flip rate against a one-in-a-hundred, which is what the two sweeps measured. **Requiring
two standard errors needs `B ≳ 22 000`**, and no smaller count does it, because the criterion is
`√B`-shaped and the grid criterion that gave 5999 is `B`-shaped.

**This is the sharpest result here and it inverts expectation 4.** Raising `B` fixes the *concealment*
cases cheaply — DS19 to a settled HIGH and DS21 to a settled MODERATE, both by `B = 9999`. Fixing the
*straddle* case costs forty times the shipped count and buys margin only as `√B`, and it fixes nothing
on the other two unstable cells because those belong to other tests. **The three named routes are not
three ways at one problem: more permutations answers concealment; a different statistic or an analytic
null is what answers a straddle.** Choosing between them means asking, per channel, which of the two
it is — and METHODOLOGY's own section already says the p alone cannot tell you.

### Runtime

Cost is linear in `B` to within 2% — 1.372, 1.362, 1.341, 1.359 ms per 1 000 permutations across the
batch at the four arms. Against the shipped mix:

| arm | CCC delta | batch delta | worst single file (CCC alone) |
|---|---|---|---|
| `B = 1999` | +1.9 s | +1.27 s (+2.6%) | ~0.6 s |
| `B = 5999` | +7.3 s | +7.99 s (+16.4%) | **1.78 s** (`21-localised-ar`, from 296 ms) |
| `B = 9999` | +12.8 s | +15.33 s (+31.5%) | ~3.0 s |
| `B = 39999` | +52.7 s | +55.01 s (+113%) | **11.7 s** (`21-localised-ar`, measured) |

**The last row is the one that matters, because 39 999 is the count that actually settles DS15.** It
more than doubles the batch, and it puts 11.7 seconds of a single test onto one file — against a
whole-battery cost of 11.7 s for that fixture today. At that point the cost has stopped being free and
starts trading against the other two routes.

The batch delta runs a little above the CCC delta at the two large arms (+15.3 s against +12.8 s at
`B = 9999`). That gap is run-to-run wallclock variance on a 49-second batch measured once per arm, not
a second cost — the attributable figure is the per-test total, which the instrument keys on the
dispatch name and reports directly.

Per-file is what a user feels. At `B = 5999` the worst case is 1.78 s on a fixture whose whole battery
already costs 11.7 s — negligible beside Blocked Mahalanobis at 18.3 s across the batch, with
Cross-Condition Consistency eleventh at 794 ms. **At `B = 5999` the cost does not bear on the
decision; at `B = 39999` it does.** `docs/PERF-BASELINE.md` holds the standing baseline and this run
reproduces its shape.

### Where no reachable `B` helps

Confirmed at source and in the corpus, as METHODOLOGY states. Windowed Autocorrelation runs BH per pair
over that pair's windows (`windowedAutocorrelation.js:189`), with `WIN = 15`, `STRIDE = 5`. On
`11-rnaseq-multicondition` (1 500 rows) the batch dump records 1 788 windows over 6 pairs — **`m = 298`
per pair**, matching `(1500 − 15)/5 + 1`. The construction is one-sided: `rawP = (exceed + 1)/(N_PERM + 1)`
on `|r|` folded into a single tail, so `c = 1`. `N_PERM` is 499 there, giving a worst-case step of
`298/500 = 0.596` — sixty times `ALPHA.NOTE`. Getting that under `0.1 α` needs `B + 1 > 298 000`.

The distinction that matters for the design conversation: **the two cases fail differently.** CCC's
`m` is 3 and fixed by its own spec, so `B` is the whole lever. WA's `m` is set by the file's length, so
no constant reaches it and the multiplicity structure has to change instead.

---

## Riders — things found in passing, none scoped

1. **METHODOLOGY:138's count list is incomplete.** It names 4999, 2000, 1999, 999, 499, 199 and omits
   **5000**, which two tests use (`benford.js:56`, `benford2.js:88`). It also attributes 5000, 2000 and
   1999 to "the row-count scaling rule"; all three are bare constants. Chat owns the file.

2. **Cross-Condition Consistency's `B` scales on VALUES, not rows, and three documents read it as rows.**
   `crossConditionConsistency.js:142` builds `conditionN` by pushing every finite cell of every row in
   the slice, so `maxN` at `:166` is a value count. METHODOLOGY:105 says "any dataset whose largest
   condition exceeds 10,000 **rows**", METHODOLOGY:696 repeats it, and `STATUS.md:162` carries P71 as
   "CCC locked to LOW above 10,000 rows". On a 6-replicate file the 199 arm — where the test cannot
   flag at any effect size — arrives at about **1,667 rows**, not 10,000. The corpus already shows this:
   `09-proteomics-clean` has 200 rows per condition and is on the **499** arm, because 200 × 6 = 1 200
   exceeds 1 000. **P71 and the large-clean-fixture prerequisite are both priced against the wrong
   number**, and the fixture STATUS needs to exercise the 199 arm is roughly six times smaller than the
   row-count reading implies. Chat owns both files; flagged, not edited.

3. **The one-cell-neighbour probe corrupts one sample in six, and S348 recorded the symptom under the
   wrong cause.** `test/fixtures/09-proteomics-clean.csv` is CRLF, as are 20 of the 29 files in
   `test/fixtures/`. `probe-s343-neighbours.mjs:66` splits the file on `\n`, so every line's **last**
   field carries a trailing `\r` (`:112`); `:114` then writes the nudged value back without it. Papa has
   detected `\r\n` as the line break, so that record no longer terminates and **merges with the next
   one** — 401 parsed records become 400, `preprocessRaw` reports `removedCols=[8..14]` from the
   15-field row, and the matrix arrives 399 × 6 instead of 400 × 6. The affected samples are exactly
   those landing in the last data column: with `stride = 41` over six data columns that is
   `k ≡ 1 (mod 6)`, ten of sixty, and the ten observed match the arithmetic exactly.

   **This is the "Rep6 confound" S348 recorded and diagnosed as a stride/parity artefact**
   (`SESSION348-SUMMARY.md`, "The data's whole contribution" and "Two things recorded rather than
   fixed"). Its stated remedy — "a direction rule that is not a function of `k`" — would not have
   touched it; the cause is the carriage return, not the parity. The fix is to write the field back
   with its terminator preserved, or to split on `/\r?\n/` and rejoin with the file's own line break.

   **What it does and does not invalidate.** The headline 6/60 and 7/60 survive: the six flips were at
   `k = 17, 36, 53, 57, 58, 59`, none of which is `≡ 1 (mod 6)`, so no flip was ever a corrupted
   sample. What does not survive is S348's reading of the data's contribution — those movements are a
   destroyed record, not a one-unit nudge. And the defect is louder now than it was then: losing a row
   makes the two conditions unequal in size, which fails the pairing evidence and **lifts the P82
   skip**, so the corrupted ten are the only samples in the re-run where the test runs at all.

4. **`STATUS.md:207–210`'s blocker text is stale in its subject.** "One clean fixture's verdict turns on
   a single permutation out of 499, so a one-digit edit anywhere in the file can flip it. Measured at
   S348 and unscoped since." The measurement was right and the fixture no longer does this — the
   channel was withheld there at S351. The blocker is still real and it is larger than the row says:
   `SEEDS=8` finds unstable cells on three tests, and one of them moves a declared severity. The "499"
   is also right for a reason neither document states (rider 2).

5. **The multi-seed gate is failing on `main` and nothing carries it.** `SEEDS=8` at `4248cd5` ends
   `MULTI-SEED: FAILED — 1 fixture(s) with seed-unstable severity, 3 unstable cell(s)`. The
   single-seed batch is the mode CI runs and the mode every close reports, so "27/28, DS12b the sole
   failure" is true and does not reach this. It is not a new regression — it is the blocker itself,
   already instrumented, in a mode nobody runs at close. Worth a line in the close-out state block
   rather than a rediscovery next session.

---

## Reproduction

```sh
# Part 1 — independence, two arms
node test/probes/probe-s340-pdump.mjs base
S340_TEST=benford       S340_B=5001 node --import ./test/probes/s340-one-b-hook.mjs test/probes/probe-s340-pdump.mjs benford5001
S340_TEST=residualSpike S340_B=1000 node --import ./test/probes/s340-one-b-hook.mjs test/probes/probe-s340-pdump.mjs rsc1000
node test/probes/probe-s340-pdiff.mjs base benford5001
node test/probes/probe-s340-pdiff.mjs base rsc1000

# Part 2 — the neighbour rate, unmodified probe
N=60 node test/probes/probe-s343-neighbours.mjs
MODE=paired N=60 node --import ./test/probes/s348-hash-hook.mjs test/probes/probe-s348-seed-sensitivity.mjs

# Part 4 — which cells are unstable, and whether a raise settles them
SEEDS=8 node test/validate-batch.mjs
for B in 5999 39999; do
  SEEDS=8 S340_TEST=crossCondConsistency S340_B=$B node --import ./test/probes/s340-one-b-hook.mjs test/validate-batch.mjs
done

# Part 4 — cost and single-offset behaviour at raised B
for B in 999 1999 5999 9999 39999; do
  S340_TEST=crossCondConsistency S340_B=$B PERF=1 node --import ./test/probes/s340-one-b-hook.mjs test/validate-batch.mjs
done
```

`B`, the per-stage BH denominators and the per-unit adjusted p-values quoted in Part 4 are read
straight off the Cross-Condition Consistency result object — `r.B`, `r.bhMStage1`, `r.details[].adjP`
— on any engine run; no probe is needed beyond dumping those fields.

---

## What this leaves for the design conversation

Stated as premises, since that is what the dispatch was for.

1. **More permutations is live as a route** — counts are independently adjustable, measured, and cheap
   at the counts the floor arithmetic asks for. Nothing in the way of trying it.
2. **The price is set by the case that is actually failing, and it is forty times the shipped count.**
   DS15 flips at the same rate at `B = 5999` as at `B = 999`, and settles at `B = 39999`. Its binding
   constraint is sampling error, which falls as `1/√B`, not the grid step, which falls as `1/B` — so
   the floor arithmetic in METHODOLOGY under-prices the route by roughly an order of magnitude.
3. **There is more than one channel.** Three tests carry unstable cells and they sit at three different
   `B` values, so any fix scoped to one test is scoped to a third of the problem.
4. **Concealment and straddle are different faults and need different routes.** Raising `B` converts
   DS19's concealed HIGH and DS21's concealed MODERATE into settled verdicts by `B = 9999`, cheaply.
   A straddle costs four times that and buys margin only as `√B`. Deciding per channel which one you
   have is the first step, and it needs a step-size or standard-error reading beside the p — which no
   test currently emits (P67).
5. **The neighbour rate no longer measures anything about the shipped tool**, and the instrument that
   measures it has a defect in one sample in six. Both need settling before any figure from it goes
   into the design.

## Gate

- No batch gate — nothing in `src/` changed. Batch run for the `PERF=1` figure: **27/28,
  `12b-uniform-mixture-fabricated.csv` the sole failure**, matching the state at session open, which
  confirms every hooked arm was in-memory only and left the tree clean.
- `SEEDS=8` **fails** at `4248cd5` — see rider 5. That is the pre-existing state of the branch point,
  not something this read changed.
- `npm test`: 4 files, 17 tests, all passing.
- No preview — no rendering surface.
