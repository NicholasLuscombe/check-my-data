# S350 — the read that sizes the P82 fix

Read-only throughout. Nothing under `src/` was edited in any part. Four files were added
under `test/probes/` and `docs/shared/`, each named and justified where it is used. No
batch was run, because no `src/` file was touched and `validate-batch.mjs` scores engine
output only.

The question this read answers: Cross-Condition Consistency and Residual Spike
Correlation both build a permutation null that treats paired subjects as independent.
What does a correct null cost, and which units does it silence?

Written across three dispatches. Parts 1 to 3 were the first, off `626a8f7`, and settled
what the corrected null does to each test's units. Parts 4 and 5 were the second, off
`3127e43`: whether DS11's lost Residual Spike Correlation channel was firing inside the
fixture's planted mechanism, and whether any paired fabricated fixture has a
Cross-Condition Consistency flag to lose. Parts 6 to 8 were the third, off `1766618`, and
close the Residual Spike Correlation question on measurement: whether it ever fires on
clean paired data, whether DS16's construction anchor survives, and whether the
forensic-direction filter has been suppressing live results all along. Each part's
verification sits in the matching section at the end. Parts 9 to 11 were the fourth, off
`85d7d26`: how wide a paired-disable rule would reach, and a reusable copy-fidelity
generator swept against both tests under both nulls. Parts 12 and 13 were the fifth, off
`a1a89ba`: which independence mode produced the Residual Spike Correlation curve, and
whether its power survives per-subject noise-scale heterogeneity.

---

# Part 1 — three git facts

Reported verbatim. No interpretation.

## 1. Were S349 Part 5's census probe and matcher script committed?

`git show --stat 626a8f7`:

```
commit 626a8f78512a098a0f542f6f9bb74857a2c2da0f
Merge: dcf27b9 246555c
Author: Nicholas.Luscombe <nick@valleyofpigs.org>
Date:   Mon Aug 3 13:51:02 2026 +0900

    Merge claude/null-specification-census-639306: S349 Part 5: null-specification census

 docs/shared/S349-NULL-CENSUS.md | 405 ++++++++++++++++++++++++++++++++++++++++
 1 file changed, 405 insertions(+)
```

`git show --stat 246555c`:

```
commit 246555c3453c6b82842795db102d9dab49fe22e4
Author: Nicholas.Luscombe <nick@valleyofpigs.org>
Date:   Mon Aug 3 13:47:25 2026 +0900

    S349 Part 5: null-specification census — read-only

    Derives the set of tests receiving condition-partitioned data from the
    dispatch layer rather than from METHODOLOGY, then reads each member's
    null and classifies it.

    20 members of 29 dispatch entries. Class 1 = 2 (Cross-Condition
    Consistency, Residual Spike Correlation), Class 2 = 2 (Duplicate
    Detection, Missing Data Pattern), Class 3 = 15, and one test —
    Cross-Condition Rank Correlation — fits none of the three.

    Nothing under src/ changed; no batch run.

    Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>

 docs/shared/S349-NULL-CENSUS.md | 405 ++++++++++++++++++++++++++++++++++++++++
 1 file changed, 405 insertions(+)
```

Both carry `S349-NULL-CENSUS.md` and nothing else. The record is accurate.

`git ls-files test/probes/` returns 65 files. The six carrying an S349 name, with the
commit that added each (`git log --diff-filter=A`):

| file | added by |
|---|---|
| `test/probes/probe-s349-ccc-limit.mjs` | `1f2724f` |
| `test/probes/probe-s349-paired-null.mjs` | `1f2724f` |
| `test/probes/probe-s349-pairing-census.mjs` | `1f2724f` |
| `test/probes/s349-ccc-hook.mjs` | `1f2724f` |
| `test/probes/probe-s349-corpus-census.mjs` | `dcf27b9` (Part 4) |
| `test/probes/s349-unit-capture-hook.mjs` | `dcf27b9` (Part 4) |

**Untracked S349 probe, hook or matcher script on disk: none.** `find` over the repo
for `*s349*` returns eight paths — the six above plus `docs/shared/S349-CCC-LIMIT-DATA.md`
and `docs/shared/S349-NULL-CENSUS.md` — and `git ls-files | grep -i s349` returns all
eight. `git status --porcelain --ignored` across the main checkout lists no untracked or
ignored script file anywhere in the tree.

The matcher script the Part 5 census describes at `S349-NULL-CENSUS.md:45` — "The rule
was applied by a script that carves the `tests` array by its entry heads and tests each
entry body for the four markers" — is named nowhere in the doc and exists nowhere on
disk. It was not committed and was not kept. The census's 20-member set therefore rests
on the per-line re-reads the same paragraph describes, not on a re-runnable derivation.

## 2. Provenance of the "Paired / matched designs" bullet

Re-located before running anything: `docs/shared/METHODOLOGY.md:704` in the committed
tree. It reads:

> - **Paired / matched designs.** The permutation null assumes condition labels are
>   exchangeable across rows. Paired or matched designs violate this; interpretation on
>   such datasets is suspect.

`git log -L 704,704:docs/shared/METHODOLOGY.md` returns exactly one commit:

```
commit 9fc631dd6b6ebf7d225a1c2831e1a966e2d6863a
Author: Nicholas.Luscombe <nick@valleyofpigs.org>
Date:   2026-05-07 16:54:14 +0900

    Initial commit
```

**The line predates S349.** It was introduced by the initial commit on 2026-05-07 and
no commit since has touched it.

Note on the line number: the working copy in the main checkout has it at 720, because
`docs/shared/METHODOLOGY.md` carries uncommitted edits there. 704 is the committed
position and the one the line history is keyed to.

## 3. Repository state

```
$ git log -1 --oneline
626a8f7 Merge claude/null-specification-census-639306: S349 Part 5: null-specification census

$ git worktree list
/Users/hedgehog/Projects/check-my-data                                                626a8f7 [main]
/Users/hedgehog/projects/check-my-data/.claude/worktrees/s350-part-1-dispatch-986a68  626a8f7 [claude/s350-part-1-dispatch-986a68]

$ git status --porcelain
(empty)
```

The worktree is clean. The main checkout is not:

```
$ git -C /Users/hedgehog/Projects/check-my-data status --porcelain
 M docs/shared/METHODOLOGY.md
 M docs/shared/S348-SEED-SENSITIVITY.md
```

Both are Chat-owned tracked shared docs with edits in progress. They must be committed
to main before any close-promote, or the merge collides with them and aborts.

---

# Part 2 — within-pair invariance of the Cross-Condition Consistency units

## The premise, checked at source

The dispatch describes the column-grouped branch: each condition is a column subset of
the same rows, so row *r* is the same subject in every condition. That is correct —
`conditionContext.js:104-110` returns each group's column subset, and every slice shares
one row index space.

**But `09-proteomics-clean` is not on that branch.** Its header is
`ProteinID,Condition,Rep1..Rep6`, so `Condition` takes the COND role and the fixture
routes row-grouped (`conditionContext.js:66-68`; row-grouped slices at `:123-135`).
Running the committed pairing census confirms it:

```
── 09-proteomics-clean.csv  (400 x 6 data, proteomics) ──
   condition structure: row-grouped, 2 level(s) — Vehicle(200 rows), Treatment(200 rows)
   identifier "ProteinID": 200 distinct; exactly once in every condition: 200/200  -> FULLY PAIRED
```

The 200 matched pairs are real. They are matched by the `ProteinID` label column, not by
row index. The file alternates strictly — `P0001,Vehicle` / `P0001,Treatment` /
`P0002,Vehicle` / … — so both slices list subjects in the same order and slice position
*r* is the same subject in both.

This does not change the invariance algebra. On either branch a subject contributes
exactly one tuple per condition, and a within-subject swap exchanges two tuples between
two blocks. It changes what the fix costs, which the last section of this part takes up.

## What a unit is

A unit is one (property × pair). `condCtx.count = 2` here, so there is one pair and unit
count equals property count per stage. `test/dump-trackd.mjs` confirms all seven registry
properties run on this fixture:

```
## 09-proteomics-clean.csv  [clean, overall sev=0 / expected 0]
  flag=LOW  primaryP=0.0120  nConds=2  nPairs=1  nUnitsRan=7  nFlagged=0  bhM=7(S1=3/S2=3/S3=1)  B=499
```

## What the shipped null permutes

`crossConditionConsistency.js:197-265` builds one tuple per slice row, carrying that
row's cells, its pre-computed row-centred residuals, and its pre-VST (logMean, logVar).
`:456-461` is a single Fisher–Yates over `permRow` spanning **all** tuples of **all**
conditions; `:463-474` re-pools by position block. Nothing in that shuffle knows two
tuples belong to the same subject.

The candidate correct null replaces the global shuffle with an independent swap-or-keep
per subject.

## Stage 1 units

| unit | statistic, plainly | forensic direction (declared) | observed dir. | invariant under a within-subject swap? | statistic at |
|---|---|---|---|---|---|
| **P1** — Trimmed span (5–95%) | Gap between the 5th and 95th percentile of the condition's pooled values; the unit compares the two conditions by the absolute difference of their log spans. | `similar` only — `crossConditionProperties.js:278` | `similar` | **Not invariant.** Swapping one subject moves values between the two pooled multisets, and the quantiles are computed on those multisets. | `crossConditionProperties.js:279-282`; distance `:283` |
| **P2** — Dispersion (MAD) | Median absolute deviation from the median of the condition's pooled values; unit distance is the absolute log-ratio. | `similar` only — `:295` | `similar` | **Not invariant.** Same reason as P1 — the statistic is a function of the pooled multiset, which the swap changes. | `:296-305`; distance `:306` |
| **P3** — CDF shape (KS) | Largest vertical gap between the two conditions' empirical distribution functions (two-sample Kolmogorov–Smirnov). | `similar` only — `:317` | `similar` | **Not invariant.** The swap moves a subject's whole value tuple from one empirical CDF to the other, shifting both curves. | `:318` (returns the sorted pool); distance `:319`, `ksDistance` at `:158-174` |

The anchor holds. S349's arm-2 measurement corroborates all three at
`docs/shared/S349-CCC-LIMIT-DATA.md:222-227`: the within-pair-swap null has non-zero
spread on every Stage-1 property (P1 sd 0.007241, P2 sd 0.01295, P3 sd 0.003399), which
is impossible for an invariant statistic. P3's observed 0.0216667 sits at 0.070% of the
free null and 67.887% of the swap null.

## Stage 2 units

| unit | statistic, plainly | forensic direction (declared) | observed dir. | invariant under a within-subject swap? | statistic at |
|---|---|---|---|---|---|
| **P4** — Residual SD | Standard deviation of the row-centred replicate residuals pooled over the condition, on the generalised denominator Σ(n_rep−1); unit distance is the absolute log-ratio. | `similar` and `different` — `crossConditionProperties.js:345` | `similar` | **Not invariant.** The swap exchanges one subject's residual vector between the pools, moving each condition's sum of squares by the difference of the two subjects' sums. | `:351-357`; distance `:358` |
| **P5** — Residual lag-1 AC | For each replicate position, the lag-1 Pearson correlation of that position's residual series taken in row order, Fisher-z averaged across positions; unit distance is the absolute Fisher-z gap. | `similar` and `different` — `:371` | `different` | **Not invariant.** The swap substitutes one subject's residual at each series position, moving the lag-1 correlation at every position that subject touches. | `:377-393`; distance `:395`, `lag1Pearson` at `:178-196` |
| **P6** — Residual kurtosis | Excess kurtosis of the pooled row-centred residuals; unit distance is the absolute difference. | `similar` and `different` — `:427` | `similar` | **Not invariant.** Fourth-moment function of the pooled residual multiset, which the swap changes. | `:432-448`; distance `:449` |

Stage-2 judgements are structural reads. S349 measured Stage 1 only, so there is no
empirical arm-2 spread for P4/P5/P6 the way there is for P1/P2/P3.

Observed direction is assigned per unit at `crossConditionConsistency.js:532`
(`u.dObs <= u.permMedian ? "similar" : "different"`); the declared forensic set is what
gates the flag, at `:610`.

Stage 3 registers one further unit, P9 Mean-variance slope
(`crossConditionProperties.js:462-509`), outside the scope asked for. It reads the same
way: the swap exchanges a subject's pre-VST (logMean, logVar) pair between the two
regression bundles, so it is not invariant either.

## No halt

Every unit lands cleanly in "not invariant". None fits neither category.

**The correct null has non-zero power on all six units. It silences nothing.** What it
changes is the null's location, not its existence. Under free permutation a
pseudo-condition can collect both tuples of some subjects and neither of others — S349
measured a mean of 100.4 subjects landing one-per-side out of 200, against 200.0 under
the swap — which inflates every distance in the null and makes an ordinary observed
distance read as anomalously small. That is the whole of the P82 defect on Stage 1: a
bias in the reference distribution, not a broken statistic.

## What sizes the fix, and it is branch-dependent

On the **column-grouped** branch the pairing is free. Row index is the subject key, and
the swap can be written inside the driver with no new input.

On the **row-grouped** branch — the branch `09-proteomics-clean` actually takes — the
pairing key is not reachable from inside the test. `slices()` returns
`{ name, matrix, rowIndices }` for row-grouped (`conditionContext.js:132-134`), and the
dispatch at `engine.js:438` passes only `(matrix, condCtx, rng, opts)`. `ProteinID` is a
LABEL column; nothing threads it to `testCrossConditionConsistency`. A within-pair null
on this branch needs a new input plumbed through the condition context, not just a
different shuffle.

Two further notes for whoever scopes the build.

- **The shipped null randomises row order as well as condition membership, and P5 is
  order-dependent.** `fillResidualBundle` (`:776-802`) walks `permRow` positions in
  order, so under the global Fisher–Yates the per-replicate residual series is re-ordered
  every permutation, while the observed bundle is built at `:314-318` with `permRow`
  still the identity (`:269-270`). An in-place within-subject swap preserves position. So
  for P5 the two nulls differ in two ways at once, and only the correct null isolates the
  condition-assignment question the property is asking.
- **The shipped verdict on this fixture is already seed-fragile.** At the shipped stream
  `dump-trackd` reports `flag=LOW primaryP=0.0120`; S349's twenty-seed sweep has it
  alternating LOW and MODERATE. The MODERATE→LOW figure is the probe's B=9999 arms
  (`0.0048` free against `0.0384` within-pair, `S349-CCC-LIMIT-DATA.md` §3.3).

---

# Part 3 — the same read for Residual Spike Correlation

## Why this part was measured rather than reasoned

RSC's permutation unit is different in kind from CCC's, so the invariance question could
not be settled by the same argument.

`residualSpikeCorrelation.js:43` truncates to the shortest condition and matches subjects
**by row position**, on both branches — so unlike CCC, RSC already assumes the pairing.
Per group it takes each row's mean absolute residual, z-scores those within the group
(`:47-65`; the z-score is a strictly increasing affine map within the group, so ranks are
unaffected), takes the top 10% (`:80-91`), and the statistic is the **maximum pairwise
top-K overlap** across group pairs (`:93-108`). The null (`:135-154`) shuffles **each
group's residual vector independently across row positions** and never pools across
conditions. It is already a within-group null. What it destroys is the row-position
correspondence between groups — which is exactly the subject identity a paired design
carries.

## The probe

`test/probes/probe-s350-rsc-invariance.mjs` (added this session; see the note at the end
of this part). It rebuilds the residual profile from the module's own lines, parity-checks
its overlap against the module's `nOverlap` on every fixture, and draws 9,999 from each of
three arms:

- **arm 1** — the shipped null: each group's vector shuffled independently across
  positions.
- **arm 2** — a within-subject relabel of the condition assignment, row positions held
  fixed. At two conditions this is swap-or-keep.
- **arm 3** — one global relabel applied to every subject. A determinism check, not a
  null: the statistic is symmetric under relabelling the groups, so this must return the
  observed value.

Parity MATCHed and arm 3 returned the observed value on every fixture.

## Results

| fixture | conds | paired? | observed | arm 1 p (shipped) | arm 2 p (within-subject) | invariant? |
|---|---|---|---|---|---|---|
| `02-densitometry-fabricated` | 3, column-grouped | structural, 35/35/35 | 5 of K=5 | 0.0001 | **0.0009** | not invariant |
| `11-rnaseq-multicondition` | 3, row-grouped | GeneID 500/500 | 13 of K=50 | 0.0015 | **0.7683** | not invariant |
| `09-proteomics-clean` | 2, row-grouped | ProteinID 200/200 | 5 of K=20 | 0.0348 | 0.8722 | not invariant |
| `10-proteomics-fabricated` | 2, row-grouped | 200/200 | 3 of K=20 | 0.3256 | 0.5629 | not invariant |
| `17-densitometry-carlisle-clean` | 3, column-grouped | structural, 60/60/60 | 1 of K=6 | 0.8695 | 0.8898 | not invariant |

Arm 2 is non-degenerate on every fixture — four to six distinct values, sd 0.51 to 0.92 —
so no unit is invariant and there is no halt on the invariance question as asked.

Pairing on the two fixtures where RSC fires was checked, not assumed: DS02 is
column-grouped with slice row counts 35/35/35 of 35, so row index is the subject key;
DS11 has 500 distinct GeneIDs each appearing exactly once in every one of three
conditions, with slice row order identical across conditions.

## The answer that matters is not the invariance verdict

RSC has exactly two declared ground-truth channels in the batch —
`test/batch-fixtures.mjs:57` (DS02) and `:92` (DS11), both `['MODERATE','HIGH']`. The
correct null does opposite things to them.

- **DS02 survives.** 0.0001 → 0.0009. At the shipped 999 draws that lands on the
  `1/(N+1) = 0.001` floor, which is MODERATE under `flagFromP`'s strict `<`, inside the
  allow-set.
- **DS11 collapses to LOW** and would fail batch assertion (b). DS11 is severity 3
  carried by Autocorrelation HIGH, RSC MOD and Benford Second Digit HIGH. Whether
  severity 3 survives losing one channel is a diversity-count question this read did not
  resolve, because resolving it means building.

## Why they part — measured, not inferred

A subject extreme in *every* condition stays extreme in every condition under any
within-subject relabel, so its contribution to every pair is conserved and the null
cannot move it. The probe's membership diagnostic counts, for the observed data, how many
subjects sit in the top-K of exactly 1, 2, … conditions:

| fixture | in 1 cond | in 2 | in 3 | arm 2 outcome |
|---|---|---|---|---|
| `02-densitometry-fabricated` | 5 | 5 | **0** | null median 2 against observed 5 — power retained |
| `11-rnaseq-multicondition` | 105 | 9 | **9** | null median 13, exactly the observed — no power |
| `09-proteomics-clean` | 30 | 5 | — | one pair only; null median 5, exactly the observed — no power |
| `17-densitometry-carlisle-clean` | 16 | 1 | 0 | nothing to move either way |

DS02's overlap is carried entirely by subjects extreme in a *proper subset* of the
conditions, so a relabel scatters which pair they land on and the null median falls.
DS11's is carried substantially by subjects extreme in all three, whose contribution
survives any relabel.

## What this means for the fix

**A paired null is not a drop-in replacement for RSC.** Where RSC's signal rests on
subjects extreme in a proper subset of conditions, the paired null keeps the power. Where
it rests on subjects extreme in all of them, the paired null has no power at all — because
"the fabricator edited every condition" and "this subject is genuinely noisy everywhere"
are the same pattern in the quantity RSC measures, and no relabelling of conditions can
separate them.

That is a statement about the statistic, not about the null. Fixing RSC for paired designs
means changing what it measures, or accepting that it cannot speak to the all-conditions
case. CCC's fix and RSC's fix are not the same piece of work, even though the two tests
share a defect class.

## One latent finding

RSC position-matches on the row-grouped branch without checking that the positions
correspond. `residualSpikeCorrelation.js:43` truncates to the shortest condition and
matches by index. On `12a-uniform-mixture-clean.csv` — row-grouped, 2 conditions, 400
**distinct** `sample_id`s, recorded NOT fully paired by the S349 census — RSC still
truncates to 200 and matches row *r* of CondA to row *r* of CondB. Nothing verifies the
assumption anywhere, and `slices()` returns no subject identity for the test to check
against. Not scoped here; recorded so it is not rediscovered.

## Note on the added file

The dispatch named one output, this document. `test/probes/probe-s350-rsc-invariance.mjs`
was added because the Part 3 conclusion could not honestly be asserted from a source read
— the DS02-survives / DS11-collapses split is not visible in the code, only in the data —
and because Part 1 of this same dispatch flagged an uncommitted S349 matcher script as a
gap. It touches nothing under `src/`, changes no engine behaviour, and is committed so the
numbers above are re-runnable.

# Part 4 — DS11 adjudicated inside its planted region

DS11's Residual Spike Correlation finding is an engine record made under a null we now
believe is mis-specified. Losing it is not evidence of harm on its own. The fixture's
construction is the anchor; the engine's channel attribution is not.

## Step 1 — DS11 is regenerable

`gen_rnaseq_multicondition` is defined **exactly once**, at
`generate-test-datasets.py:447`. The writer list at `:1268` names
`11-rnaseq-multicondition.csv`, which is the file on disk. Neither half of the P85 shape
is present here.

`OUT` is `/tmp/dforensix-s108-fixtures` (`:7`), so running the generator cannot touch
`test/fixtures/`. Run and diffed: the regenerated DS11 is **byte-identical** to the
shipped fixture, md5 `e431e36e7b632ae08c1750efb3b90cf6` on both. The construction anchor
holds and the rest of this part is answerable.

**Noted in passing, out of scope.** The same writer list names
`16-carlisle-overbalanced.csv` and `17-carlisle-clean.csv`, while the fixtures on disk
are `16-densitometry-carlisle-overbalanced.csv` and `17-densitometry-carlisle-clean.csv`.
`gen_carlisle_overbalanced` and `gen_carlisle_clean` are also the only two functions in
the file defined twice. That is the P85 shape, on DS16 and DS17.

## Step 2 — the planted mechanism, from the generator

Written down before any engine output was consulted. Two flaws, both localised to named
genes, so the halt condition does not fire.

**Flaw 1 — correlated residual spikes. This is RSC's target.** Twenty genes. Per gene the
generator draws one replicate position and one magnitude
(`random.uniform(2.0, 4.0) * random.choice([-1, 1])`), then multiplies that replicate by
`1 + magnitude * 0.3` in **all three conditions** — same position, same magnitude every
time (`generate-test-datasets.py:474-506`).

Planted set, 0-indexed as the generator prints it:

```
7, 54, 61, 73, 83, 101, 105, 118, 177, 211, 239, 241, 342, 353, 393, 416, 423, 427, 458, 491
```

**Flaw 2 — inflated fold-change, a control.** Thirty other genes, disjoint from flaw 1,
get `fc = fc * random.uniform(2.5, 4.0)` in CondB only (`:487-489`). That scales the
condition mean, so under the log VST it is a shift and the row-centred residuals are
unchanged. Predicted invisible to RSC.

**The list was cross-checked against the fixture rather than trusted.** A flaw-1 gene
shares one replicate's spike across all three conditions, so its per-replicate residual
vectors should correlate across conditions. Measured: mean cross-condition residual
correlation **0.741** on the twenty planted genes against **−0.026** on the 450 unplanted
ones; 80% of planted genes clear 0.5 against 9% of unplanted. An argmax-agreement check
is weaker and is reported as context only — 14/20 planted against 24/450 unplanted,
chance 6.3% — because the spike is not always the largest residual: a 1.6× to 2.2×
multiplier is 0.47 to 0.79 on the log scale against a noise sd of 0.25.

## Step 3 — the RSC evidence mapped onto the planted set

Over all 500 genes, from `test/probes/probe-s350-ds11-adjudication.mjs`. K = 50.

|  | in the planted set | not in the planted set |
|---|---|---|
| in the top-K of all three conditions | **9** | **0** |
| in the top-K of a proper subset of conditions | 8 | 106 |
| in no top-K | 3 | 374 |
| total | 20 | 480 |

**Do the nine subjects extreme in all three conditions lie inside the planted region?
Yes — all nine.** Genes 54, 61, 73, 83, 101, 177, 241, 353, 427, every one on the flaw-1
list. The all-three cell has zero unplanted occupants, against a chance expectation of
about 0.5 genes at K/N = 0.1 over three conditions.

**And the four? No — none of them.** The statistic's best pair is CondA vs CondC with
overlap 13, decomposing as 9 genes extreme in all three conditions plus 4 extreme in that
pair only. The four are genes 38, 141, 351, 357, and **0 of 4** are planted.

Flaw 2 behaved as predicted: 0 of its 30 genes reach the all-three cell.

**The expectation is confirmed, and more sharply than "a real detection."** The nine are
not merely inside the planted region — they are the only things in that cell, and the
four the corrected null leaves standing are the ones that are not planted. The corrected
null does not trim noise off a real finding. It removes the finding and keeps the noise.

The reason is structural. The generator plants *the same residual pattern across all
conditions*, and a within-subject relabel of the condition labels preserves, by
definition, any pattern that is the same across conditions. **DS11's planted mechanism is
invariant under the corrected null by construction.** On this fixture the fabricator's
edit and a genuinely noisy gene are not merely hard to tell apart — they are the same
object.

## Step 4 — the assertion structure, reported not simulated

DS11's declared channels, `test/batch-fixtures.mjs:90-94`:

```js
'11-rnaseq-multicondition.csv': { severity: 3, assay: 'genomics', flags: {
  'Autocorrelation':              ['HIGH'],
  'Residual Spike Correlation':   ['MODERATE', 'HIGH'],
  "Benford's Law (Second Digit)": ['HIGH'],
} },
```

Assertion (b) is **per-channel, not a count over channels**. `test/validate-batch.mjs:138-148`:

```js
const cellMisses = [];
if (expected.flags) {
  const resultsByName = new Map(results.map(r => [r.name, r]));
  for (const [name, allow] of Object.entries(expected.flags)) {
    const r = resultsByName.get(name);
    if (!r) {
      cellMisses.push(`${name}: result not present (unresolved name binding?)`);
    } else if (!allow.includes(r.flag)) {
      cellMisses.push(`${name}: got ${r.flag}, expected ∈ [${allow.join(', ')}]`);
    }
  }
}
```

Every declared cell is asserted independently against its own allow-set. There is no
threshold on how many channels hold. Severity is a separate assertion at `:128`, and the
completeness gate a third at `:158-176`.

---

# Part 5 — Class B, bounded

## Membership, derived

**The committed census cannot answer this as written.**
`test/probes/probe-s349-pairing-census.mjs` applies the right pairing rule, but over a
hardcoded list of eight **clean** fixtures (`:28-37`). Its intersection with "fabricated"
is empty for scope reasons, not corpus reasons. The rule at `:54-105` was ported into
`test/probes/probe-s350-classb-bound.mjs` and applied across every fixture in
`test/batch-fixtures.mjs`. "Fabricated" is read as `EXPECTED[file].severity >= 1`.

**The measured list is five, and it is S349's five.**

| fixture | sev | structure | pairing key | subjects | alignment |
|---|---|---|---|---|---|
| `02-densitometry-fabricated` | 3 | column-grouped ×3 | row index (structural) | 35 | ok |
| `04-qpcr-fabricated` | 3 | row-grouped ×2 | `Target` | 25 | ok |
| `10-proteomics-fabricated` | 3 | row-grouped ×2 | `ProteinID` | 200 | ok |
| `11-rnaseq-multicondition` | 3 | row-grouped ×3 | `GeneID` | 500 | ok |
| `16-densitometry-carlisle-overbalanced` | 2 | column-grouped ×3 | row index (structural) | 60 | ok |

Nine fixtures are paired in total — four column-grouped (DS01, DS02, DS16, DS17) and five
by identifier (DS03, DS04, DS09, DS10, DS11) — which reproduces S349's count exactly. The
four paired clean fixtures are DS01, DS03, DS09 and DS17.

"Alignment ok" is a second check the paired null needs and cannot make from inside the
test: no slice row is dropped by the tuple builder's all-null skip, all slices have the
same row count, and on row-grouped fixtures the slices list subjects in the same order.
All five members pass, so all five are sweepable. A member failing either check would
have been reported and not swept.

## How the corrected null was installed

`test/probes/s350-paired-null-hook.mjs`, an ESM load-time source hook on
`src/tests/crossConditionConsistency.js` — the route `s349-ccc-hook.mjs` established.
Three edits: an optional `B` override, the per-unit capture at the `primaryP` site
(anchors verbatim from the S349 hook), and the null itself. When `__S350_PAIRED` is set,
the global Fisher–Yates over all row-tuples (`:456-461`) is replaced by an independent
relabel of each subject's own condition assignment, with row positions held fixed. Every
anchor must match exactly once or the hook throws, so a silent no-op run is impossible.

CCC is called directly rather than through `runFullAnalysis`, because the other 28 tests
cost far more than the one under study. Since S340 each test draws from its own stream
keyed on the data hash plus its dispatch name, so the direct call sees the stream the
engine would hand it. Verified rather than assumed: on `02-densitometry-fabricated` at
seed 0 the direct call returns `primaryP 0.0945 flag LOW B 999` and `runFullAnalysis`
returns the same three values.

Seeds are the S348 Part 5 rule — one-unit neighbours of `09-proteomics-clean.csv` at
stride 7, hashed and substituted, with the perturbed matrix discarded and never scored.

## The primary result — Class B is empty and bounded

Twenty seeds, two nulls, five fixtures: 200 runs, and **nothing flags in any of them.**

| fixture | free null, `primaryP` min–max | flags | corrected null, `primaryP` min–max | flags |
|---|---|---|---|---|
| `02-densitometry-fabricated` | 0.0923 – 0.133 | 0/20 | 0.0923 – 0.122 | 0/20 |
| `04-qpcr-fabricated` | 0.0540 – 0.120 | 0/20 | 0.120 – 0.198 | 0/20 |
| `10-proteomics-fabricated` | 0.100 – 0.224 | 0/20 | 0.144 – 0.210 | 0/20 |
| `11-rnaseq-multicondition` | 0.0360 – 0.108 | 0/20 | 0.494 – 0.602 | 0/20 |
| `16-densitometry-carlisle-overbalanced` | 0.0180 – 0.0540 | 0/20 | 0.162 – 0.468 | 0/20 |

Split by direction: **zero of 94 `similar`-direction (fixture × unit × arm) records and
zero of 44 `different`-direction records flag on any seed.** Per-unit tables for every
fixture, both arms, are in `docs/shared/S350-CLASSB-SWEEP-DATA.md`.

The closest approach under the free null is DS16 at adjusted p 0.0180, 1.8× the
threshold; under the corrected null that unit moves to 0.162. DS11 and DS16 were re-run
at `B = 9999` to rule out the shipped lattice hiding movement near the threshold, and the
picture holds — DS11's free-null minimum is 0.0198 and DS16's 0.0216, both still LOW.

**S349's claim survives the widening.** No paired fabricated fixture has a
Cross-Condition Consistency flag to lose, now at twenty seeds per fixture and two
permutation counts rather than one draw.

## The inversion, and it is the larger finding

The prediction was that a `different`-direction unit could become **more** sensitive when
the null tightens. That is exactly what happens, and it is not marginal.

DS11, median adjusted p across twenty seeds at `B = 9999`:

| DS11 Stage-1 unit | free null | corrected null | direction | contributes to the flag? |
|---|---|---|---|---|
| P3 CDF shape (KS), **CondB vs CondC** | 0.717 | **0.0018** | `different` 20/20 | **no — filtered** |
| P3 CDF shape (KS), **CondA vs CondB** | 0.717 | **0.0090** | `different` 20/20 | **no — filtered** |
| P2 Dispersion (MAD), **CondA vs CondB** | 0.911 | 0.0153 | `different` 20/20 | no — filtered |
| P3 CDF shape (KS), CondA vs CondC | 0.0306 | 0.990 | `different` 20/20 | no — filtered |
| P2 Dispersion (MAD), CondA vs CondC | 0.717 | 0.744 | `different` 20/20 | no — filtered |

The two units that cross `ALPHA.NOTE` are the two pairs **involving CondB**. CondA vs
CondC moves the other way, to 0.99. DS11's flaw 2, read from the generator in Part 4, is
thirty genes with an inflated fold-change **in CondB only**.

**The corrected null surfaces DS11's second planted mechanism at adjusted p = 0.0018 on
all twenty seeds, and the forensic-direction filter discards it.** Stage-1 properties
declare `forensicDirections: ["similar"]` (`crossConditionProperties.js:278`, `:295`,
`:317`), so a `different`-direction Stage-1 unit contributes nothing at any p — the
neutralisation is at `crossConditionConsistency.js:610` and `:618`. Under the free null
the same signal reads 0.717, so the mis-specified null is not only inflating the
`similar` tail on clean paired data; it is **masking a true condition difference on
fabricated paired data**.

Stated precisely, because the two halves pull opposite ways:

1. **As shipped, the corrected null gains nothing and costs nothing on these five.** The
   probe's explicit gain check — does any unit flag on more seeds under the corrected
   null? — returns none. This is a measurement of the shipped machinery, filter included.
2. **The gain exists in the statistics and is barred by a filter, not by the data.** It is
   0.0018, MODERATE by `flagFromP` with room to spare, and it points at a genuinely
   planted mechanism. That is a counterfactual about a filter change nobody has made, and
   it is reported as one.

The secondary line S349 recorded — that on paired files a correction can only push
`similar`-direction units away from flagging — is now measured on all five rather than
inferred. Across the shipped-B run, 29 of 40 `similar`-direction units move away from the
threshold and 11 move toward it, with the closest "toward" unit landing at 0.108, 10.8×
the threshold. S349's other secondary line, that `different`-direction gates are absolute
floors that no null change moves, holds as an account of the **gate** but is not the
binding constraint on DS11: there the units are barred by the direction **filter**, which
runs regardless of the gate, and their adjusted p moves by nearly three orders of
magnitude.

# Part 6 — does Residual Spike Correlation fire on clean paired data?

The decision this part serves: whether to touch RSC's null at all. Its measured cost is
one true detection, DS11's, established in Part 4. Its measured benefit is whatever false
positives it removes. If RSC never fires on clean paired data, there are none, and the
case closes on measurement.

## Membership, derived

Part 5's rule, applied across all 27 fixtures, then filtered to paired AND clean
(`EXPECTED[file].severity === 0`). Nine fixtures are paired; five are fabricated;
**the complement is four.**

| fixture | assay | structure | pairing key | subjects | alignment |
|---|---|---|---|---|---|
| `01-densitometry-clean` | densitometry | column-grouped ×3 | row index (structural) | 35 | ok |
| `03-qpcr-clean` | qpcr | row-grouped ×2 | `Target` | 25 | ok |
| `09-proteomics-clean` | proteomics | row-grouped ×2 | `ProteinID` | 200 | ok |
| `17-densitometry-carlisle-clean` | densitometry | column-grouped ×3 | row index (structural) | 60 | ok |

## Does RSC reach them?

Asked of the engine rather than re-derived from the dispatch gates: one full
`runFullAnalysis` per fixture, and RSC's own result read out of it.

| fixture | RSC result at the shipped seed |
|---|---|
| `01-densitometry-clean` | RUNS — LOW, `permP` 1.0000, overlap 0 of K=5 |
| `03-qpcr-clean` | RUNS — LOW, `permP` 0.0240, overlap 3 of K=5 |
| `09-proteomics-clean` | RUNS — LOW, `permP` 0.0340, overlap 5 of K=20 |
| `17-densitometry-carlisle-clean` | RUNS — LOW, `permP` 0.8820, overlap 1 of K=6 |

**RSC runs on all four.** No gate fires, no `N/A`. So there is no fixture here that the
test never reaches and that would otherwise pad the clean count without carrying any
exposure.

## The sweep — twenty seeds, both nulls

160 runs. Nothing flags in any of them.

| fixture | free null p: min / median / max | flags | corrected null p: min / median / max | flags |
|---|---|---|---|---|
| `01-densitometry-clean` | 1.000 / 1.000 / 1.000 | 0/20 | 1.000 / 1.000 / 1.000 | 0/20 |
| `03-qpcr-clean` | 0.0270 / 0.0365 / 0.0520 | 0/20 | 0.849 / 0.873 / 0.888 | 0/20 |
| `09-proteomics-clean` | 0.0240 / 0.0335 / 0.0480 | 0/20 | 0.850 / 0.868 / 0.887 | 0/20 |
| `17-densitometry-carlisle-clean` | 0.842 / 0.874 / 0.894 | 0/20 | 0.869 / 0.886 / 0.911 | 0/20 |

`09-proteomics-clean`'s full spread under the shipped null is **0.0240 to 0.0480**, median
0.0335. The single draw of 0.0348 reported in Part 3 sits in the middle of it. The closest
any fixture comes to `ALPHA.NOTE` is 0.0240 — **2.4 times the threshold**, on the one seed
of twenty where it runs lowest.

## The membership diagnostic explains the two shapes

| fixture | conditions | in top-K of every condition | in a proper subset | observed overlap vs expected |
|---|---|---|---|---|
| `01-densitometry-clean` | 3 | **0** | 15 | 0 of K=5, expected 0.7 |
| `17-densitometry-carlisle-clean` | 3 | **0** | 17 | 1 of K=6, expected 0.6 |
| `03-qpcr-clean` | 2 | 3 | 4 | 3 of K=5, expected 1.0 |
| `09-proteomics-clean` | 2 | 5 | 30 | 5 of K=20, expected 2.0 |

On the two three-condition fixtures no subject is extreme everywhere, so the corrected
null keeps its power — and finds nothing, because the observed overlap is at or below the
independence expectation.

On the two two-condition fixtures the diagnostic is degenerate by construction: with one
pair, every overlapping subject is by definition in "every" condition. The corrected null
therefore has essentially no power against the overlap statistic there. **Their p moving
from about 0.03 to about 0.87 is not a false positive being removed — it is the test
becoming uninformative.** That is Part 3's finding seen from the clean side.

## What this settles, and what it does not

**Settles.** RSC's measured cost from correcting its null is one true detection, firing
inside DS11's planted region. Its measured benefit across every clean paired fixture in
the corpus, at twenty seeds and both nulls, is **zero flags removed, because there were
none to remove.**

**Does not settle.** This bounds RSC's false-positive exposure on the fixtures we have. It
does not measure incidence. The four clean paired fixtures carry 25 to 200 subjects, three
of the four have K ≤ 6 so the overlap statistic takes only a handful of distinct values,
and every fixture is generated at a single planted strength with no strength sweep behind
it. A corpus this narrow sizes exposure in both directions: it can no more show the rate
is low on real data than it could have shown it was high.

---

# Part 7 — is DS16 regenerable?

DS16 is a Class B member. If its construction anchor is gone, one of the five fixtures
Part 5 bounded cannot be adjudicated against its own construction the way Part 4
adjudicated DS11.

## The check

`generate-test-datasets.py` defines `gen_carlisle_overbalanced` twice — at `:676` (dead)
and `:877` (live, the one Python keeps). `OUT` is `/tmp/dforensix-s108-fixtures` (`:7`),
confirmed before running anything, so the generator cannot write into `test/fixtures/`.

Two builds were produced: the script as-is, and a scratch copy with the second definitions
renamed so the first ones survive. Both wrote to temp directories.

| build | shape | cell [0][0] | md5 |
|---|---|---|---|
| **shipped** `16-densitometry-carlisle-overbalanced.csv` | 60 features × 3 conditions × 6 reps | empty | `c983bc5736dd6ec03bc9fe9b9188cf40` |
| live second definition (`:877`) | 60 features × **2 conditions × 4 reps** | empty | `4ef56de078c0f781e2196adabf91a20a` |
| dead first definition (`:676`) | 60 features × 3 conditions × 6 reps | `Condition` | `68905046c87c29b20d9e03cca5c11370` |

**Neither reproduces it.** The live definition builds a different dataset entirely —
`Control / Treatment`, four replicates. The dead first definition builds the right shape,
the right condition names (`Control / Treatment_A / Treatment_B`), the right feature
labels, and different values: shipped `F1` runs 114.71 to 233.93, the rebuild 231.97 to
487.62.

**Which definition does the shipped fixture match?** Its design matches the **dead first**
one and not the live one. But not its bytes, and not its header either: the current first
definition writes `Condition` into cell [0][0] and explains in its own docstring why that
cell has to be non-empty, while the shipped file leaves it blank. So the generator was
edited after the fixture was written. Git gives no separation — fixture and generator both
arrived in the initial commit. `generate-ui-datasets.py` writes to `test-data/` and
produces neither.

DS17 fails identically: same design match, same `Condition` cell divergence, different
values.

## The anchor is not entirely gone

Byte-exact replay is lost. The described mechanism is still testable from the shipped
bytes. The dead definition's accept-reject loop (`:779-805`) targets `n_target_high = 48`
of 60 features accepted at a one-way ANOVA p above 0.95 across the three conditions, and
DS17 is its comparator built the same way without the cherry-picking. Measured with the
app's own ANOVA (`carlisleBalance.js:236-271`):

| fixture | above 0.50 | 0.80 | 0.90 | **0.95** | 0.99 | median p |
|---|---|---|---|---|---|---|
| DS16 | 56 | 51 | 48 | **48** | 7 | 0.9614 |
| DS17 | 18 | 6 | 4 | **3** | 0 | 0.2778 |

**DS16 carries exactly 48 features above 0.95 — the dead definition's target number,
exactly.** Chance under a uniform null is 3.0, which is exactly what DS17 gives. The
identical counts at 0.90 and 0.95 are the accept-reject loop's own fingerprint: it breaks
the moment p clears 0.95, so accepted rows pile up just above it.

So DS16 is not byte-regenerable and its Part 5 measurement stands regardless, because that
measured the shipped file. What was at risk — adjudicating a DS16 finding against its
intended construction — is recoverable at the mechanism level. DS16's one declared channel
is `'Baseline Balance': ['MODERATE', 'HIGH']` (`test/batch-fixtures.mjs:118-120`), and
Baseline Balance is the ANOVA-p test this check runs.

---

# Part 8 — testing the claim that the direction filter has never been load-bearing

The claim under test: the `similar`-only restriction on Stage-1 properties has never been
load-bearing, because it suppressed an arm with no power under the free null, and
correcting the null makes it load-bearing for the first time.

This is a read-out of `docs/shared/S350-CLASSB-SWEEP-DATA.md`, which Part 5 committed. No
new measurement.

## A parse gap, reported because it changed the answer

The first pass matched unit rows with `\s{2,}` before the `dir` field. The producer pads
the pair column to 26 characters, so a pair whose name is exactly 26 —
`Inhibitor_A vs Inhibitor_B`, `Treatment_A vs Treatment_B` — is followed by one space, not
two, and was dropped silently. That cost 36 of 216 records and understated the answer.

The probe now parses the `per running unit (N)` count each block declares and halts if the
parse does not reproduce it. **Fourteen declared blocks, all fourteen matched.** Everything
below is the complete read.

## The distribution, shipped B ladder, five fixtures

66 Stage-1 unit records — 27 majority-`different`, 39 majority-`similar`, 3 splitting their
seeds across both directions. A unit is bucketed by the direction the majority of its
twenty seeds resolved to; the mixed ones are counted but not silently folded in.

| | free null | corrected null |
|---|---|---|
| majority-`different` Stage-1 units | 8 | 19 |
| adjusted p — min / median / max | 0.0036 / 0.0036 / 0.928 | 0.0036 / 0.108 / 0.984 |
| **below `ALPHA.NOTE`** | **5 of 8** | 5 of 19 |

## The claim does not survive

**Five `different`-direction Stage-1 units already sit below the threshold under the free
null.** All on `02-densitometry-fabricated`, all at adjusted p **0.0036 on every one of
twenty seeds**, all `forensic 0/20` and therefore contributing nothing:

- P1 Trimmed span, Control vs Inhibitor_B
- P1 Trimmed span, Inhibitor_A vs Inhibitor_B
- P3 CDF shape, Control vs Inhibitor_A
- P3 CDF shape, Control vs Inhibitor_B
- P3 CDF shape, Inhibitor_A vs Inhibitor_B

0.0036 is not near the threshold, it is at the arithmetic floor. DS02 runs at `B = 999`, so
the raw two-sided floor is 2/1000, and the Stage-1 family is m = 9; five units tied at that
floor give exactly `0.002 × 9/5 = 0.0036`. **All five are censored at the permutation
floor** — the observed distance beats all 999 draws. They are as significant as the
machinery can report, and the filter discards every one.

So the restriction has been load-bearing under the shipped null all along, on a fabricated
fixture, at the floor. Correcting the null does not make it load-bearing for the first
time. It makes it load-bearing on a second fixture.

## The crossing count is zero, and that number is a lattice artefact

| shipped B ladder, on the 8 units present in both arms | count |
|---|---|
| above → below when the null is corrected | **0** |
| below → above | 0 |
| below under both nulls | 5 |

Taken alone that reads as "correcting the null creates no new sub-threshold `different`
units". The `B = 9999` run in the same file says otherwise. There, DS11's P3 CDF shape on
CondB vs CondC lands at adjusted p **0.0018** and on CondA vs CondB at **0.0090**, against
0.911-and-above under the free null. At `B = 499` those units were pinned at the raw
permutation floor with a BH image of 0.012 and 0.018 — just above `ALPHA.NOTE = 0.01`. The
crossing exists; the shipped permutation count cannot resolve it. Same reachability class
METHODOLOGY records under permutation-test arithmetic constraints.

## One thing the read-out surfaces that was not asked for

Eleven Stage-1 units flip majority direction between the arms, and every one flips the same
way, `similar` to `different` — nine of them on DS11. Correcting the null does not merely
move p-values along a fixed direction assignment. It re-resolves which tail each unit is
in. Any design that keeps a direction filter has to say what that filter means when the
direction itself depends on which null is believed.

# Part 9 — how much of the corpus would a paired-disable rule silence?

Column-grouped data is paired by construction: every condition is a column subset of the
same rows, so row *r* is the same subject in every condition and no identifier is needed.
A rule that skips a test whenever pairing is structural or evidenced therefore reaches
every column-grouped fixture automatically. Nobody had counted how wide that is.

The pairing rule is the one `probe-s349-pairing-census.mjs` established and
`probe-s350-classb-bound.mjs` ported. Whether a test actually runs came from one full
`runFullAnalysis` per fixture rather than from re-deriving the dispatch gates, because the
two tests carry different ones — Residual Spike Correlation has a conditions-mode skip and
a data-type skip, Cross-Condition Consistency has neither.

## Routing over all 27 fixtures

| | count |
|---|---|
| column-grouped | **4** — all four paired by construction |
| row-grouped | **12** — of which **5** are fully paired by the census rule |
| no conditions at all | 11 |
| **paired in total** | **9** |

## What each test would lose

Both tests run on the same 16 of 27 fixtures, and a paired-disable rule silences the same
9 of those 16 — DS01, DS02, DS03, DS04, DS09, DS10, DS11, DS16, DS17. That is 56% of where
either test runs. Seven fixtures survive for both: DS12a, DS12b, DS15, DS19, DS20, DS21,
DS22.

The consequence is completely asymmetric between them.

| | Cross-Condition Consistency | Residual Spike Correlation |
|---|---|---|
| runs on | 16 of 27 | 16 of 27 |
| silenced by the rule | 9 | 9 |
| declared channels in `batch-fixtures.mjs` | 2 — DS15, DS19 | 2 — DS02, DS11 |
| of those, silenced | **0** | **2** |
| batch assertions broken | **0** | **2**, both currently MODERATE |

**Cross-Condition Consistency's two declared channels sit on DS15 and DS19, and both are
unpaired.** DS15 has no identifier column at all; DS19 has 1200 distinct IDs each appearing
once. Free permutation is already the correct exchangeability on both. So disabling CCC on
paired data costs nine fixtures of coverage and breaks nothing the batch asserts.

**Residual Spike Correlation's two declared channels are DS02 and DS11, and both are
paired.** Disabling RSC on paired data removes its entire ground-truth footprint. It would
be left running on seven fixtures with no asserted positive anywhere in the corpus.

The two tests should not be decided together. The reviewers' bottom line lands cheaply on
one and expensively on the other.

---

# Part 10 — the copy-fidelity generator

`test/gen-copy-fidelity.mjs`. Standalone, seeded, parameterised, and deliberately not part
of `generate-test-datasets.py` — that file writes the fixed corpus and carries the P85
duplicate-definition defect, while sweep data is ephemeral and regenerated from a seed.
Keeping them apart means a change here can never move a fixture.

## The model

Everything is built on the log scale and exponentiated, which is how the corpus generators
model assay data and what the pipeline's own transform expects.

```
subject level   L_s   ~ Normal(log baseMedian, tau^2)
replicate noise e_sr  ~ Normal(0, sigma^2)
condition A     log A_sr = L_s + e_sr
```

Condition B is a variance-preserving interpolation between a perfect copy of A and a fresh
independent honest replicate of the same design:

```
log B_sr = mu + rho*(L_s - mu) + sqrt(1-rho^2)*(L'_s - mu)     subject part
              + rho*e_sr       + sqrt(1-rho^2)*f_sr            residual part
              + log(effect_s)
```

Two properties make this the right shape for an effect-size axis, and both were checked
from the emitted values rather than asserted. The marginal law of `log B` equals that of
`log A` at every `rho`, so moving along the axis smuggles in no spread difference a
distribution-shape test could read as signal. And `rho` is exactly the matched-cell
correlation, so `rho = 1` is a perfect copy and `rho = 0` an independent condition.

## The axis

The swept parameter is `k`, the copy noise as a multiple of the file's own within-condition
replicate noise: `k = sqrt(1 - rho^2)`, so `k` runs from 0 to 1. `k = 0` is a perfect copy.
`k = 1` is exact independence, and that end is where the false-positive rate comes from.
Ten points, denser where a copy is still good: 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.65, 0.8, 0.9,
1.0.

A fabricator wants a difference to report, so a copy with no effect is not a plausible
attack: 20% of subjects get a 1.5× fold change in condition B only.

## Confirming the far end, and a false alarm on the way

At five seeds condition B's spread appeared to dip at mid-`k` and recover — the signature
of a systematic spread difference between conditions, which is exactly what would
contaminate a distribution-shape test. At forty seeds it is flat.

| k | rho | measured cell correlation | spread B − A |
|---|---|---|---|
| 0 | 1.0000 | 0.9908 ± 0.0002 | +0.0137 ± 0.0022 |
| 0.3 | 0.9539 | 0.9442 ± 0.0015 | +0.0121 ± 0.0055 |
| 0.65 | 0.7599 | 0.7502 ± 0.0056 | +0.0108 ± 0.0115 |
| 1.0 | 0.0000 | **−0.0051 ± 0.0130** | +0.0143 ± 0.0169 |

The B − A spread difference is constant at about +0.012 across the whole axis; that is the
fake effect adding a little variance, not a fidelity artefact. The five-seed dip was
sampling noise. **Independence at the far end is confirmed** — matched-cell correlation
−0.0051 ± 0.0130, indistinguishable from zero.

Cell correlation at `k = 0` is 0.9908 rather than 1 because the fake effect adds a
per-subject offset to a fifth of subjects. The "perfect copy" end of this axis is a perfect
copy *plus the attack*.

## Two modes, and why the second one had to be added

The default mode degrades both the subject level and the residual with the same `k`, so
`k = 1` is an independent honest condition with independent subjects: *two unrelated
experiments*. That is not an honest **paired** experiment. In a real paired design the same
subject appears in both conditions, so the subject level is shared and only the measurement
noise is independent — and that is the whole of P82, because the free permutation null is
mis-specified precisely when subjects are matched. A false-positive rate measured on data
with independent subject levels answers a different question.

So the generator carries a second mode. `sharedSubjects: true` holds the subject level
identical in both conditions at every `k`; only the residual interpolates. `k = 1` is then
an honest paired experiment with a real condition effect, and `k = 0` is the residual-copy
attack. Condition A is byte-identical between the modes at the same `(k, seed)`.

## Assumptions

A generator that inherits the tool's own assumptions flatters the tool for exactly the
reason the fixed corpus does. The curve is only readable next to these, so they are part of
the deliverable. All are defaults and all are overridable.

| | value | what it costs |
|---|---|---|
| distributional family | log-normal | real assay data is heavier-tailed; every distribution-shape test finds this data tidier than reality |
| noise model | multiplicative, homoscedastic on the log scale | the mean-variance slope is 2 by construction and identical in both conditions, which is exactly what Stage 3 P9 tests — P9 has nothing to find here either way |
| independence | replicate noise independent across replicates and subjects | no batch structure, no plate effects, no drift, **no serial correlation down the rows**, so every row-order test is blind here by construction |
| effect size | fixed 1.5× on a fixed 20% of subjects, identical across replicates | real effects vary in size across subjects; this one does not |
| heterogeneity | subject levels span about two orders of magnitude, `tau = 1.15` | the ratio of subject heterogeneity to replicate noise is 4.6, which is what makes a copy hard to degrade — noise the size of the assay's own repeatability moves `rho` only from 1.000 to 0.995 |
| replicates | 6 per subject per condition, equal | no missing values, no ragged rows |
| subjects | 120, matched, exactly once per condition | no unpaired subjects, no dropouts |
| conditions | exactly 2 | **the max-over-pairs structure that gives Residual Spike Correlation its power at three conditions is absent by construction** |
| rounding | two decimals | as the corpus fixtures use |

The last two are the ones that bite. Any result here about Residual Spike Correlation is a
result about the two-condition case only.

## Layouts

Each dataset is emitted in both, because the branches differ in how pairing is reachable
inside a test. Column-grouped uses a two-row header with one column block per condition, so
matrix row *r* is subject *r* in both and the pairing is structural; cell [0][0] carries a
label because `preprocessRaw` drops a header row with fewer than three non-empty cells and
a two-condition span row has only two. Row-grouped uses `SubjectID` + `Condition` +
replicate columns with subjects interleaved, so each slice lists them in the same order.

Both were verified through the engine import chain: column-grouped routes 120 × 12,
`paired true`, slices CondA(120 × 6) and CondB(120 × 6); row-grouped routes 240 × 6 with
the same slices. The transform is log on both. Neither test is data-type skipped.

---

# Part 11 — the sweep

Grid: 10 fidelity points × 20 independent datasets × 2 layouts × 2 nulls × 2 tests, run
twice over the two generator modes. Nothing was cut; the full grid takes 104 seconds.

A "seed" is an independent dataset, not a permutation-seed offset. A detection rate needs
data replication; seed offsets would measure the null's own noise. This is a deliberate
departure from how "twenty seeds" was read in Parts 5 and 6.

The per-unit record was built in from the first run rather than back-filled, so no number
here was computed before the record existed. Full-mode grid run twice; the second run
reproduced the first exactly.

Raw tables in `docs/shared/S350-COPY-FIDELITY-SWEEP.md`. Per-unit records, 6400 rows each,
in `docs/shared/S350-COPY-FIDELITY-UNITS.csv` and `-UNITS-SHARED.csv`.

## Layout makes no difference to either test

Every number is identical between the column-grouped and row-grouped runs, for both tests,
under both nulls, at every `k`. That is not a null result to explain away: both tests
consume `condCtx.slices()`, and the two layouts produce the same slices from the same
values. **Layout decides whether the pairing key is reachable, not what the test computes.**
The tables below therefore report one layout; the other is identical and is in the raw file.

## Cross-Condition Consistency

Detection rate at `ALPHA.NOTE`, twenty datasets per point. "Shipped" is the engine's own
`primaryP`; "lifted" drops the `similar`-only direction filter and keeps the effect-size
gate.

| k | free, shipped | free, lifted | corrected, shipped | corrected, lifted |
|---|---|---|---|---|
| 0 (perfect copy) | **100%** | **100%** | **0%** | **0%** |
| 0.1 | 10% | 10% | 0% | 0% |
| 0.2 | 0% | 0% | 0% | 0% |
| 0.3 | 0% | 0% | 0% | 0% |
| 0.4 | 0% | 0% | 0% | 0% |
| 0.5 | 0% | 0% | 0% | 0% |
| 0.65 | 0% | 0% | 0% | 0% |
| 0.8 | 5% | 5% | 0% | 5% |
| 0.9 | 0% | 0% | 0% | 0% |
| 1.0 (independent) | 0% | 0% | 0% | 0% |

Median `p` at `k = 0` under the free null is 0.002000 on every dataset — the arithmetic
floor, `2/1000 × 3/3` with all three Stage-1 units tied at the raw permutation floor. The
test is saturated there.

**The reviewers' central claim is confirmed.** Under the corrected null Cross-Condition
Consistency has no power against this attack at any fidelity, including a perfect copy. The
curve is not merely weaker; it is flat at zero.

Under the free null the curve runs the normal way — detection rises as the copy improves —
but it is a cliff, not a slope: 100% at a perfect copy, 10% one step along, nothing after.
The test detects a copy only when the copy is nearly exact.

**False-positive rate at the clean end, at the same threshold**, and this is where the two
generator modes separate:

| clean case | free null | corrected null |
|---|---|---|
| two unrelated experiments (`k = 1`, full mode) | 0% (0/20) | 0% (0/20) |
| **an honest paired experiment** (`k = 1`, shared-subjects mode) | **5% (1/20)** | 0% (0/20) |

One flag in twenty at a nominal 1% is a point estimate with a wide interval — consistent
with anything from nominal to badly inflated — so it is evidence of the direction of the
free null's defect, not a measurement of its size. It does confirm that the defect needs
shared subject levels to appear at all: with independent subjects the free null is
correctly calibrated here.

## Residual Spike Correlation

| k | free null | corrected null |
|---|---|---|
| 0 (perfect copy) | **100%** | **0%** |
| 0.1 | 100% | 0% |
| 0.2 | 100% | 0% |
| 0.3 | 100% | 0% |
| 0.4 | 100% | 0% |
| 0.5 | 95% | 0% |
| 0.65 | 55% | 0% |
| 0.8 | 5% | 0% |
| 0.9 | 10% | 0% |
| 1.0 (independent) | **0%** | 0% |

False-positive rate at `k = 1`: **0% under the free null in both modes**, 0% under the
corrected null.

**This is the only configuration in the whole grid with a usable power curve.** Under the
free null, Residual Spike Correlation holds 100% detection out to `k = 0.4`, degrades
through 95% and 55%, and reaches zero exactly where the copy does — with no false positives
at either clean end, including the honest paired one.

Under the corrected null it has no power anywhere. Median `p` at a perfect copy is 1.000 on
every dataset: the observed overlap is matched or exceeded by every one of 999 draws. That
is Part 3's structural finding measured on a full axis — a subject extreme in every
condition keeps its contribution under any within-subject relabel, and with two conditions
every overlapping subject is such a subject.

Both statements are about the two-condition case. The generator emits two conditions, so
the max-over-pairs mechanism that gave RSC surviving power on DS02 at three conditions is
absent here by construction.

## Direction, and the amendment's second question

Resolved direction of the Stage-1 units, counted over unit × dataset, three units per
dataset:

| k | free: similar/different | corrected: similar/different | units flipping |
|---|---|---|---|
| 0 | 59 / 1 | 23 / 37 | **36 of 60** |
| 0.1 | 59 / 1 | 23 / 37 | 36 of 60 |
| 0.2 | 57 / 3 | 16 / 44 | 41 of 60 |
| 0.3 | 54 / 6 | 18 / 42 | 36 of 60 |
| 0.4 | 45 / 15 | 20 / 40 | 25 of 60 |
| 0.5 | 41 / 19 | 24 / 36 | 17 of 60 |
| 0.65 | 35 / 25 | 25 / 35 | 10 of 60 |
| 0.8 | 30 / 30 | 26 / 34 | 6 of 60 |
| 0.9 | 28 / 32 | 26 / 34 | 2 of 60 |
| 1.0 | 24 / 36 | 24 / 36 | **2 of 60** |

**Direction disagreement between the two nulls is maximal exactly where the attack is
strongest and vanishes where the data is clean.** At a perfect copy the free null calls 59
of 60 units `similar` and the corrected null calls 37 of 60 `different`; more than half the
units change tail. At independence the two nulls agree completely.

That settles the amendment's premise on this data: direction is a property of the null, not
of the unit, and it is most a property of the null precisely at the attack.

## What the filter-lifted arm says

Almost nothing, on this data. The lifted and shipped columns are identical at every `k` in
three of the four Cross-Condition Consistency arms, and differ by one dataset in the
fourth. **On the copy attack the direction filter is not the binding constraint — the null
is.**

That does not contradict Part 8, where the filter *was* binding on
`02-densitometry-fabricated`: there, five `different`-direction Stage-1 units sat censored
at the permutation floor while contributing nothing. The two findings describe different
regimes. Where a fabrication makes conditions anomalously *similar*, the units land in the
`similar` tail and the filter passes them; where it makes them anomalously *different*, the
filter discards them at any `p`. This generator plants the first kind, DS02 carries the
second.

## What this does and does not establish

It establishes that on two-condition paired data with these assumptions, Cross-Condition
Consistency has no power against a copy attack under the corrected null at any fidelity,
and a cliff-shaped power curve under the free null; and that Residual Spike Correlation has
a genuine power curve with no false positives under the free null and none at all under the
corrected one.

It does not establish anything about three or more conditions, about heavier-tailed data,
about effects that vary across subjects, or about any fabrication that leaves serial
structure in the rows. The generator has none of those, by construction and on purpose, and
the assumptions table above is the list of what a different generator could change.

# Part 12 — which independence mode produced the Residual Spike Correlation curve

Answered as a fact about the code before anything is drawn from it.

## What ran

`probe-s350-copy-fidelity-sweep.mjs:73` reads
`MODE = process.env.MODE === 'shared-subjects' ? 'shared-subjects' : 'full'`, so the
default run is **full mode**, the fully-independent end. Both modes were run and both are
committed in `docs/shared/S350-COPY-FIDELITY-SWEEP.md`, so the side-by-side is a read-out
and no re-run was needed.

## The two curves are identical

Residual Spike Correlation, free null, detection rate at each `k`:

| k | 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.65 | 0.8 | 0.9 | 1.0 |
|---|---|---|---|---|---|---|---|---|---|---|
| mode `full` | 100% | 100% | 100% | 100% | 100% | 95% | 55% | 5% | 10% | 0% |
| mode `shared-subjects` | 100% | 100% | 100% | 100% | 100% | 95% | 55% | 5% | 10% | 0% |

Only the median `p` wobbles by permutation noise — 0.005 against 0.006 at `k = 0.65`.

## Why they are identical, at source

`sharedSubjects` reaches exactly one place: `gen-copy-fidelity.mjs:251-252`, where `rhoS`
enters `subjB` — the subject **level**. Residual Spike Correlation row-centres before it
computes anything (`residualSpikeCorrelation.js:53-57`), so the subject level never reaches
its statistic. **The mode is invisible to this test by construction.**

## What that does to the counter-argument

The counter was that subject heterogeneity is held fixed at 4.6× replicate noise across the
whole axis while detection falls from 100% to zero, so detection must be tracking copy
fidelity rather than subject structure.

The 4.6 is `tau / sigma` = 1.15 / 0.25. **That is subject *level* heterogeneity, and it is
exactly the quantity the test removes by row-centring.** It is not a quantity the test can
see, in either mode, at any `k`.

The quantity the artefact claim is about is per-subject **noise-scale** heterogeneity — a
subject whose replicates scatter more than its neighbours', which makes it extreme in every
condition with no fabrication at all. In the instrument as it shipped that was
`p.sigma` at `gen-copy-fidelity.mjs:254-255`: **one global constant applied identically to
every subject, in both modes, at every `k`.** Per-subject noise-scale dispersion was
exactly zero everywhere on the first sweep.

So before Part 13, neither side had been tested. The counter rested on a quantity the test
cannot see. The artefact claim was equally untested, because the instrument contained no
noise-scale heterogeneity for the test to be fooled by.

One thing does survive from the counter, and it is not nothing: detection falls from 100%
to zero along `k` while every subject-*level* property is held constant, which rules out a
confound with level structure. It says nothing about scale structure.

---

# Part 13 — the falsification grid

`sigmaS` was added to the generator: a per-subject log-normal multiplier on the replicate
noise, dispersion `s` on the log scale, **the same in both conditions** because a scale
redrawn per condition would not be persistent subject structure. The multiplier is centred
so the pooled replicate noise does not change with `s` — raising `s` redistributes noise
between subjects without changing how much there is, which is what lets the two effects be
told apart.

Grid: 10 fidelity points × 6 heterogeneity points × 20 independent datasets, free null,
plus a corrected-null control at `k = 1` for each `s`. 30 seconds.

**Cuts, and why.** Residual Spike Correlation only, because the question is about its
curve. Free null only with a control row, because Part 11 measured the corrected null flat
at zero across the whole fidelity axis. One layout, because Part 11 measured every number
identical column-grouped and row-grouped.

**Consistency check.** The `s = 0` row reproduces the committed Part 11 curve exactly —
100, 100, 100, 100, 100, 95, 55, 5, 10, 0. Adding the axis left the original instrument
undisturbed.

## The estimator, validated before it was used

Reading the `s` axis needs an estimator that recovers a known `s`, so
`residualScaleDispersion` was checked against the generator rather than assumed. With six
replicates the per-subject scale is estimated noisily enough that perfectly homoscedastic
data shows a raw dispersion of about 0.23; `Var(log sd_hat) ≈ 1/(2·df)` is subtracted
before the square root.

| true `sigmaS` | 0 | 0.15 | 0.3 | 0.5 | 0.75 | 1.0 |
|---|---|---|---|---|---|---|
| raw dispersion | 0.231 | 0.271 | 0.369 | 0.536 | 0.764 | 1.000 |
| **corrected** | **0.055** | **0.150** | **0.293** | **0.487** | **0.730** | **0.975** |
| pooled replicate noise | 0.250 | 0.250 | 0.248 | 0.244 | 0.239 | 0.230 |

Recovery is good from `s = 0.15` up. The residual 0.055 at `s = 0` is the correction's own
floor and is the resolution limit of the anchor below.

## Q1 — does detection still track copy fidelity at every heterogeneity level?

Detection rate, free null, twenty datasets per cell.

| `s` \ `k` | 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.65 | 0.8 | 0.9 | 1.0 |
|---|---|---|---|---|---|---|---|---|---|---|
| **0** | 100% | 100% | 100% | 100% | 100% | 95% | 55% | 5% | 10% | **0%** |
| **0.15** | 100% | 100% | 100% | 100% | 95% | 95% | 55% | 15% | 5% | **0%** |
| **0.3** | 100% | 100% | 100% | 100% | 100% | 100% | 80% | 60% | 30% | **25%** |
| **0.5** | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 90% | 80% | **85%** |
| **0.75** | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | **100%** |
| **1.0** | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | **100%** |

**Detection does not track `k` at every `s`.** It tracks cleanly at `s = 0` and `s = 0.15`,
degrades to a partial slope at 0.3 and 0.5, and is **completely flat at 100% from `s = 0.75`
upward** — including at `k = 1`, where no copying has occurred at all.

The stated expectation was that detection would track `k` at every `s`. It does not. Above
about `s = 0.5` the curve carries no information about copy fidelity whatsoever.

What survives is narrower and worth stating precisely: **within the range the corpus
occupies, detection does track `k`.** That is not the general claim the counter made.

## Q2 — the false-positive rate on honest data

`k = 1`, no copy at all, same threshold as Q1.

| `s` | measured dispersion | free null FPR | median `p` | corrected null FPR |
|---|---|---|---|---|
| 0 | 0.055 | **0%** (0/20) | 0.540 | 0% |
| 0.15 | 0.150 | **0%** (0/20) | 0.350 | 0% |
| 0.3 | 0.293 | **25%** (5/20) | 0.026 | 0% |
| 0.5 | 0.487 | **85%** (17/20) | 0.0020 | 0% |
| 0.75 | 0.730 | **100%** (20/20) | 0.0010 | 0% |
| 1.0 | 0.975 | **100%** (20/20) | 0.0010 | 5% |

**The prediction is confirmed, and not marginally.** At a nominal 1%, the free null's
false-positive rate on honest data with no fabrication reaches 25% by `s = 0.3` and 100% by
`s = 0.75`.

**And the corrected null is immune to it.** 0% at every heterogeneity level except a single
dataset at `s = 1`. That is new: until now the corrected null's only measured property was
that it has no power. It also has no false-positive exposure to the failure mode that
destroys the free null.

The mechanism, made visible. Mean subjects in the top-12 of **both** conditions at `k = 1`,
where nothing has been copied, against an independence expectation of 1.2:

| `s` | 0 | 0.15 | 0.3 | 0.5 | 0.75 | 1.0 |
|---|---|---|---|---|---|---|
| subjects in both | 1.50 | 2.05 | 3.50 | 5.65 | 7.00 | 8.10 |

Heteroscedasticity manufactures exactly the co-occurrence the statistic counts. The test is
not being fooled by something incidental; it is measuring persistent subject structure, and
copying is only one of the things that produces it.

## The anchor — where our corpus sits

Same estimator, run over the four clean paired fixtures.

| fixture | conditions | subjects | reps | df | raw | **corrected** |
|---|---|---|---|---|---|---|
| `17-densitometry-carlisle-clean` | 3 | 60 | 6 | 15 | 0.187 | **0.041** |
| `01-densitometry-clean` | 3 | 35 | 4 | 9 | 0.242 | **0.055** |
| `03-qpcr-clean` | 2 | 25 | 3 | 4 | 0.389 | **0.162** |
| `09-proteomics-clean` | 2 | 200 | 6 | 10 | 0.299 | **0.199** |

**These are our own generated fixtures. The anchor says where our corpus sits. It does not
say where real deposits sit, and that question belongs to P65.**

Reading them against the ladder: DS17 and DS01 sit at or below the estimator's floor, so
they are homoscedastic as far as this can resolve. DS03 sits near `s = 0.15`. DS09 sits
near `s = 0.20`, and it is the most trustworthy of the four — 200 subjects against 25 to 60,
so its estimate has by far the least sampling error. DS01 and DS03 have few subjects and
low degrees of freedom and should be read as indicative only.

**The corpus occupies `s` ≤ 0.2, and the false-positive rate turns on between `s = 0.2` and
`s = 0.3`.** The four clean fixtures sit just below the knee.

## What this settles

**The artefact reading is correct as a mechanism.** Persistent subject noise-scale structure
produces the same signature as copying, the free null cannot separate them, and above
`s ≈ 0.5` the test's output is a measurement of heterogeneity with no fidelity information
left in it.

**The counter is dead as a general claim** and survives only as a statement about the
low-heterogeneity regime. It rested on level heterogeneity, which the test cannot see.

**The clean record is a property of the corpus, not of the test.** The four clean paired
fixtures sit at `s ≤ 0.2`; the false-positive rate at `s ≤ 0.15` is 0 of 20 and at `s = 0.3`
is 5 of 20. Zero flags in the corpus is what this test does at this heterogeneity, not what
it does in general.

**The question has a number attached now.** "Is Residual Spike Correlation's power real?"
becomes "is real deposited data's per-subject noise-scale dispersion below about 0.25?" —
measurable, with a threshold, and answerable only by measuring real deposits.

## What this does not settle

Two conditions only, so nothing here speaks to the max-over-pairs behaviour at three or
more. Log-normal, homoscedastic-in-the-log noise, no batch or serial structure, a fixed
effect on a fixed fraction of subjects: the Part 10 assumptions table applies unchanged. And
the anchor measures our generated fixtures, which were built by generators that had no
reason to include noise-scale heterogeneity in the first place — so finding them
homoscedastic is close to circular and should not be read as evidence about real data.

---

# Verification — Parts 1 to 3

## Commands run

```bash
git log -1 --oneline
git worktree list
git status --porcelain
git -C /Users/hedgehog/Projects/check-my-data status --porcelain
git show --stat 626a8f7
git show --stat 246555c
git ls-files test/probes/
git ls-files | grep -i s349
git log --oneline --diff-filter=A -- <each of the eight S349 paths>
find . -iname '*s349*'                      # excluding .git and node_modules
git status --porcelain --ignored            # main checkout, whole tree
grep -n "Paired / matched designs" docs/shared/METHODOLOGY.md
grep -n "exchangeable" docs/shared/METHODOLOGY.md
git log -L 704,704:docs/shared/METHODOLOGY.md --date=iso
git log -L 704,704:docs/shared/METHODOLOGY.md --oneline
head -3 test/fixtures/09-proteomics-clean.csv
wc -l test/fixtures/09-proteomics-clean.csv
awk -F, 'NR>1{print $2}' test/fixtures/09-proteomics-clean.csv | uniq -c | head -6
head -2 test/fixtures/02-densitometry-fabricated.csv
head -2 test/fixtures/11-rnaseq-multicondition.csv
node test/probes/probe-s349-pairing-census.mjs
node test/dump-trackd.mjs
node test/probes/probe-s350-rsc-invariance.mjs
FILES=10-proteomics-fabricated.csv,12a-uniform-mixture-clean.csv,12b-uniform-mixture-fabricated.csv node test/probes/probe-s350-rsc-invariance.mjs
FILES=09-proteomics-clean.csv,02-densitometry-fabricated.csv,11-rnaseq-multicondition.csv,17-densitometry-carlisle-clean.csv,10-proteomics-fabricated.csv node test/probes/probe-s350-rsc-invariance.mjs
```

An inline `node --input-type=module` script was also run to check pairing on DS02 and
DS11 through the engine import chain — same logic as
`probe-s349-pairing-census.mjs:88-105`, plus a check that slice row order is identical
across conditions.

## Files and lines read

**Source under `src/`** (read only; nothing edited)

- `src/tests/crossConditionProperties.js` — whole file, 510 lines. Cited: helper
  definitions `:126-269` (`quantileOfSorted`, `medianOfSorted`, `logRatioDistance`
  `:146-155`, `ksDistance` `:158-174`, `lag1Pearson` `:178-196`, `fisherZGapDistance`
  `:200-207`, `absGapDistance` `:210-215`, `makeGate` `:222-231`, `p5StructuralMetrics`
  `:238-254`, `p5ResolvabilityFloor` `:262-269`); registry `:271-510`; per-property
  `forensicDirections` at `:278`, `:295`, `:317`, `:345`, `:371`, `:427`, `:466`;
  per-property `statistic` at `:279-282`, `:296-305`, `:318`, `:351-357`, `:377-393`,
  `:432-448`, `:487-503`; per-property `distance` at `:283`, `:306`, `:319`, `:358`,
  `:395`, `:449`, `:504`.
- `src/tests/crossConditionConsistency.js` — whole file, 847 lines. Cited: permutation-unit
  header `:63-86`; pooled values `:129-154`; tuple construction `:169-265`; `permRow`
  identity init `:269-270`; observed sorted arrays `:283-289`; observed residual bundles
  `:307-319`; observed mvslope bundles `:333-344`; observed statistics `:346-359`; unit
  enumeration and applicability `:371-437`; permutation loop `:447-515`; two-sided p and
  direction tag `:517-535`, direction assigned at `:532`; per-stage BH `:563-577`;
  effect-size gate and forensic filter `:578-611`, `u.forensic` at `:610`; primary flag
  `:613-620`; details `:668-719`; `fillResidualBundle` `:776-802`; `fillMvslopeBundle`
  `:816-833`.
- `src/tests/residualSpikeCorrelation.js` — whole file, 243 lines. Cited: header method
  summary `:12-19`; slice handling and the position-matching truncation `:33-45`,
  especially `:43`; profile construction `:47-65`; top-K and overlap `:70-110`, `K_FRAC`
  and `K` at `:80-81`, top-K sets `:84-91`, pairwise overlaps `:93-106`, `maxPairOverlap`
  `:108`; permutation null `:112-171`, within-group Fisher–Yates `:143-147`, exceedance
  `:168`, `permP` `:171`; flag `:207`.
- `src/analysis/conditionContext.js` — `:19-24` (typedef, `paired`), `:44-72` (type and
  `paired` determination; row-grouped at `:66-68`), `:76-97` (names), `:99-138`
  (`slices()`; column-grouped `:104-110`, conditions-mode `:111-122`, row-grouped
  `:123-135`), `:140-160` (`rowGroups()`), `:262-270` (`withMatrix`), `:291-297` (returned
  interface).
- `src/analysis/engine.js` — `:94` (CCC import), `:276-290` (VST matrix construction and
  `vstCondCtx`), `:413-421` (RSC dispatch), `:425-441` (CCC dispatch, call at `:438`).
- `src/stats/vst.js` — `:1-70` export surface (`detectVST` at `:70`; confirmed no
  `applyVST` export, hence the engine's inline transform was mirrored in the probe).

**Tests and fixtures**

- `test/batch-fixtures.mjs` — `:53-58` (DS02 expected flags; RSC at `:57`), `:90-94`
  (DS11 expected flags; RSC at `:92`), `:95-98` (DS12a/b).
- `test/validate-batch.mjs` — `:52-55` (fixture set import and `FIXTURES` path).
- `test/dump-trackd.mjs` — `:1-30` (purpose and import chain).
- `test/probes/probe-s349-pairing-census.mjs` — whole file, 107 lines.
- `test/fixtures/09-proteomics-clean.csv` — header row and first six data rows; row count
  401 including header; `Condition` column alternation over the whole file.
- `test/fixtures/02-densitometry-fabricated.csv` — first two rows (two-row header,
  column-grouped).
- `test/fixtures/11-rnaseq-multicondition.csv` — first two rows.

**Docs**

- `CLAUDE.md` — whole file, 332 lines.
- `docs/shared/METHODOLOGY.md` — `:346-367` (exchangeability motivation, factor vs
  stratum), `:668` (the S349 known-defect paragraph, P82), `:686` (CCC permutation null
  and B ladder), `:704` (the Known Limitations bullet under audit).
- `docs/shared/S349-NULL-CENSUS.md` — `:1-23` (scope), `:26-49` (membership rule; the
  unnamed matcher script at `:45-46`), `:50-66` (the count), `:153-186` (the
  `condCtx.paired` finding), `:187-218` (census table rows for CCC and RSC).
- `docs/shared/S349-CCC-LIMIT-DATA.md` — `:19-57` (run commands, structure read, VST
  table), `:60-105` (Part 3a parity gate), `:200-260` (paired-null probe: structural axis,
  arm 1 / arm 2 blocks, Monte Carlo stability, BH step-up per arm).
- `docs/TEST-DISPLAY-MAP.md` — `:52` (RSC row: fires on DS02 and DS11).

## Batch

Not run, and deliberately. No file under `src/` was touched, and `validate-batch.mjs`
scores engine output only — it would assert nothing about this read. The one file added,
`test/probes/probe-s350-rsc-invariance.mjs`, is a probe: it imports the engine but no
engine code path imports it.

## Dev server

Not started. Nothing under `src/` was edited, so there is no rendering surface to check.
For reference the command would be:

```bash
./scripts/dev.sh s350-part-1-dispatch-986a68
```

---

# Verification — Parts 4 and 5

Run from the worktree `.claude/worktrees/s350-part-2-dispatch`, branch
`claude/s350-part-2-dispatch`, off `3127e43`.

## Commands run

```bash
git worktree add .claude/worktrees/s350-part-2-dispatch -b claude/s350-part-2-dispatch main
./scripts/init-worktree-symlinks.sh .claude/worktrees/s350-part-2-dispatch
git worktree list

# Part 4 — is DS11 regenerable?
git ls-files | grep -i '\.py$'
grep -n "^def " generate-test-datasets.py | awk '{print $2}' | sed 's/(.*//' | sort | uniq -c | sort -rn
grep -n -i "rnaseq|11-|multicondition|GeneID" generate-test-datasets.py
grep -n "random.seed|OUT =" generate-test-datasets.py
python3 generate-test-datasets.py                       # writes only to /tmp/dforensix-s108-fixtures
diff -q /tmp/dforensix-s108-fixtures/11-rnaseq-multicondition.csv test/fixtures/11-rnaseq-multicondition.csv
md5 -q /tmp/dforensix-s108-fixtures/11-rnaseq-multicondition.csv test/fixtures/11-rnaseq-multicondition.csv

# Part 4 — the adjudication
node test/probes/probe-s350-ds11-adjudication.mjs

# Part 4 — assertion structure
grep -n "expected.flags|ACKNOWLEDGED|allow-set" test/validate-batch.mjs
grep -n "11-rnaseq" -A 5 test/batch-fixtures.mjs

# Part 5 — membership
sed -n '27,38p' test/probes/probe-s349-pairing-census.mjs      # the committed FILES list
MEMBERSHIP=1 node --import ./test/probes/s348-hash-hook.mjs \
  --import ./test/probes/s350-paired-null-hook.mjs \
  test/probes/probe-s350-classb-bound.mjs

# Part 5 — cost and parity, then the sweep
COST=1 PARITY=1 node --import ./test/probes/s348-hash-hook.mjs \
  --import ./test/probes/s350-paired-null-hook.mjs \
  test/probes/probe-s350-classb-bound.mjs
PARITY=1 node --import ./test/probes/s348-hash-hook.mjs \
  --import ./test/probes/s350-paired-null-hook.mjs \
  test/probes/probe-s350-classb-bound.mjs
S350_B=9999 FILES=11-rnaseq-multicondition.csv,16-densitometry-carlisle-overbalanced.csv \
  node --import ./test/probes/s348-hash-hook.mjs \
       --import ./test/probes/s350-paired-null-hook.mjs \
       test/probes/probe-s350-classb-bound.mjs

# vitest collection check
cat vite.config.js ; grep -n '"test"' package.json
npx vitest list
```

## Files and lines read

**Generator**

- `generate-test-datasets.py` — `:1-20` (imports, `random.seed(7741)`, `OUT`, `randn`),
  `:444-509` (`gen_rnaseq_multicondition`; flaw-1 target draw `:458-459`, the printed
  target lists `:462-463`, gene bases `:465-469`, the shared spike pattern `:474-478`,
  flaw-2 CondB inflation `:487-489`, the spike application `:500-506`), `:1256-1276`
  (the writer list; DS11 at `:1268`), `:1290-1300` (the ground-truth print block).
- The duplicate-definition census over the whole file: `gen_carlisle_clean` and
  `gen_carlisle_overbalanced` occur twice, every other generator once.

**Source under `src/`** (read only; nothing edited)

- `src/analysis/engine.js` — `:185-201` (validate, then `createPRNGFactory` on the
  sanitised raw matrix), `:276-290` (VST matrix and `vstCondCtx`), `:413-421` (RSC
  dispatch), `:425-441` (CCC dispatch).
- `src/tests/crossConditionConsistency.js` — `:456-461` (the Fisher–Yates block replaced
  by the hook), `:610` and `:618` (the forensic-direction neutralisation), plus the
  anchors the hook matches.
- `src/tests/crossConditionProperties.js` — `:278`, `:295`, `:317` (Stage-1
  `forensicDirections: ["similar"]`), `:222-231` (`makeGate`).
- `src/tests/residualSpikeCorrelation.js` — `:47-65` (the profile, reproduced in the
  adjudication probe), `:80-91` (top-K), `:93-108` (pairwise overlap).
- `src/analysis/conditionContext.js` — `:99-138` (`slices()`), `:140-160` (`rowGroups()`).
- `src/stats/vst.js` — `:70` (`detectVST`).

**Tests and probes**

- `test/validate-batch.mjs` — `:130-149` (assertion (b), the per-channel allow-set loop),
  `:151-177` (the completeness gate), `:128` (severity).
- `test/batch-fixtures.mjs` — `:90-94` (DS11's declared channels), and `EXPECTED` in full
  for the membership pass.
- `test/probes/probe-s349-pairing-census.mjs` — `:27-37` (the hardcoded clean-only FILES
  list), `:54-105` (the pairing rule, ported).
- `test/probes/probe-s349-ccc-limit.mjs` — `:58-72` (`prepFromText`), `:75-107`
  (`neighbourPlan`), `:109-123` (`deriveNeighbourSeeds`), `:135-147` (the seed set-up and
  its guards). All reused.
- `test/probes/s349-ccc-hook.mjs` — whole file; its two anchors are reused verbatim.
- `test/probes/s348-hash-hook.mjs` — whole file.
- `vite.config.js` `:14-19` and `package.json` `:10` — no `test.include` override, so
  vitest's default `**/*.{test,spec}.?(c|m)[jt]s?(x)` applies.

**Fixtures**

- `test/fixtures/11-rnaseq-multicondition.csv` — regenerated and diffed in full.
- All 27 fixtures in `test/batch-fixtures.mjs` — parsed through the engine import chain
  for the membership pass.

## Files added

Three probes and one data file. None is under `src/`.

- `test/probes/s350-paired-null-hook.mjs` — the load-time hook that swaps CCC's null.
- `test/probes/probe-s350-ds11-adjudication.mjs` — Part 4.
- `test/probes/probe-s350-classb-bound.mjs` — Part 5.
- `docs/shared/S350-CLASSB-SWEEP-DATA.md` — the raw per-unit sweep tables.

**None is collected by `npm test`.** `vitest run` uses the default include pattern —
`vite.config.js` sets no `test.include` — which matches only `*.test.*` and `*.spec.*`.
All three probes are plain `.mjs` with neither infix. Confirmed by running `npx vitest
list`: the collected set is unchanged and contains no `probe-s350-*` entry.

## Batch

Not run, and deliberately. No file under `src/` was touched. `validate-batch.mjs` scores
engine output and would assert nothing about this read. The corrected null exists only
inside a load-time hook that no engine code path imports.

## Dev server

Not started. Nothing under `src/` was edited, so there is no rendering surface. For
reference:

```bash
./scripts/dev.sh s350-part-2-dispatch
```

---

# Verification — Parts 6, 7 and 8

Run from the worktree `.claude/worktrees/s350-part-3-dispatch`, branch
`claude/s350-part-3-dispatch`, off `1766618`.

## Commands run

```bash
git worktree add .claude/worktrees/s350-part-3-dispatch -b claude/s350-part-3-dispatch main
./scripts/init-worktree-symlinks.sh .claude/worktrees/s350-part-3-dispatch
git worktree remove .claude/worktrees/s350-part-2-dispatch
git branch -d claude/s350-part-2-dispatch
git worktree list

# Part 6 — membership, RSC reach, then the sweep
MEMBERSHIP=1 node --import ./test/probes/s348-hash-hook.mjs \
  --import ./test/probes/s350-rsc-null-hook.mjs \
  test/probes/probe-s350-rsc-clean.mjs
node --import ./test/probes/s348-hash-hook.mjs \
  --import ./test/probes/s350-rsc-null-hook.mjs \
  test/probes/probe-s350-rsc-clean.mjs

# Part 7 — is DS16 regenerable?
grep -n "^def gen_carlisle_overbalanced|^def gen_carlisle_clean" generate-test-datasets.py
grep -n "^OUT" generate-test-datasets.py            # /tmp/dforensix-s108-fixtures, outside test/fixtures/
grep -n "carlisle" generate-test-datasets.py         # the writer list entries
python3 generate-test-datasets.py                    # as-is: the live second definitions run
md5 -q /tmp/dforensix-s108-fixtures/16-carlisle-overbalanced.csv test/fixtures/16-densitometry-carlisle-overbalanced.csv
md5 -q /tmp/dforensix-s108-fixtures/17-carlisle-clean.csv        test/fixtures/17-densitometry-carlisle-clean.csv
# scratch variant: second definitions renamed so the first ones survive, OUT redirected
python3 <scratch>/gen-firstdef.py
md5 -q /tmp/dforensix-s350-firstdef/16-carlisle-overbalanced.csv test/fixtures/16-densitometry-carlisle-overbalanced.csv
md5 -q /tmp/dforensix-s350-firstdef/17-carlisle-clean.csv        test/fixtures/17-densitometry-carlisle-clean.csv
diff /tmp/dforensix-s350-firstdef/16-carlisle-overbalanced.csv test/fixtures/16-densitometry-carlisle-overbalanced.csv
git log --format='%h %ad %s' --date=short -- test/fixtures/16-densitometry-carlisle-overbalanced.csv
git log --format='%h %ad %s' --date=short -- generate-test-datasets.py
grep -n -i "carlisle|^OUT|def gen_" generate-ui-datasets.py
node test/probes/probe-s350-ds16-provenance.mjs

# Part 8 — read-out of the committed sweep data
node test/probes/probe-s350-direction-readout.mjs

# vitest collection check
npx vitest list
```

The scratch variant of the generator lives in the session scratchpad, not in the repo. It
is one mechanical edit — the two second definitions renamed to `*_SECOND_UNUSED` and `OUT`
pointed at `/tmp/dforensix-s350-firstdef` — applied by a script that first asserts lines
877 and 924 hold the expected `def` statements and refuses to write otherwise.

## Files and lines read

**Generator**

- `generate-test-datasets.py` — `:7` (`OUT`), `:676-815` (the dead first
  `gen_carlisle_overbalanced`: docstring `:677-701`, `rng = random.Random(333)` `:703`,
  parameters `:704-708`, `_randn` / `_anova_p` / `_reg_inc_beta` `:710-767`, the two-row
  header with the `Condition` cell `:769-776`, the accept-reject loop `:779-805`),
  `:816-876` (the dead first `gen_carlisle_clean`, `random.Random(77)` at `:828`),
  `:877-923` and `:924-...` (the live second definitions), `:1271-1273` (the writer list
  entries for DS15 / DS16 / DS17), `:1306` and `:1311` (the DS16 / DS17 ground-truth print
  headings).
- `generate-ui-datasets.py` — `:3`, `:8` (writes to `test-data/`), `:56`, `:135` (the two
  generators it defines; neither is DS16 or DS17).

**Source under `src/`** (read only; nothing edited)

- `src/tests/residualSpikeCorrelation.js` — `:12-19` (method summary), `:33-45` (slices,
  the position-matching truncation at `:43`, the `nFeatures < 10` gate), `:47-65` (the
  profile), `:80-91` (K and the top-K sets), `:93-108` (pairwise overlap), `:113`
  (`N_PERM = 999`), `:134-171` (the permutation loop; `:137-154` is the block the hook
  replaces), `:171` (`permP`), `:207` (the flag), `:223-242` (the returned shape, which is
  where `allProfiles`, `topK`, `nOverlap` and `expectedOverlap` come from).
- `src/analysis/engine.js` — `:185-201` (validate, then the PRNG factory on the sanitised
  raw matrix), `:276-290` (VST matrix and context), `:312-317` (`dtSkip`), `:319-325`
  (`condSkip`), `:327-336` (`rsSkip`), `:413-421` (the RSC dispatch and its two guards).
- `src/tests/carlisleBalance.js` — `:1` (imports), `:13` (the per-feature ANOVA step),
  `:236-271` (the one-way ANOVA the Part 7 probe reproduces).
- `src/stats/primitives.js` — `:225` (`regIncBeta`).
- `src/constants/thresholds.js` — `ALPHA.NOTE` and `ALPHA.FLAG`, read at runtime by both
  new probes.

**Tests, probes and data**

- `test/batch-fixtures.mjs` — `:39-40` (the DS16 / DS17 rows), `:118-121` (DS16's declared
  channel and DS17's clean entry), and `EXPECTED` in full for the membership pass.
- `test/probes/s348-hash-hook.mjs` — whole file, reused unchanged.
- `test/probes/probe-s350-classb-bound.mjs` — `:129-193` (the pairing and alignment rule,
  ported again for Part 6), `:75-127` (the prep chain and neighbour-seed derivation).
- `docs/shared/S350-CLASSB-SWEEP-DATA.md` — parsed in full for Part 8: 216 unit records
  across 14 `(run, fixture, arm)` blocks, every block's declared count matched.

**Fixtures**

- `test/fixtures/16-densitometry-carlisle-overbalanced.csv` and
  `17-densitometry-carlisle-clean.csv` — both compared line by line against two rebuilds,
  and both parsed for the ANOVA-p distribution.
- The four clean paired fixtures — parsed through the engine import chain and run through
  RSC 40 times each.
- All 27 fixtures — parsed through the engine import chain for the membership pass.

## Files added

Four probes. None is under `src/`.

- `test/probes/s350-rsc-null-hook.mjs` — the load-time hook that swaps RSC's null.
- `test/probes/probe-s350-rsc-clean.mjs` — Part 6.
- `test/probes/probe-s350-ds16-provenance.mjs` — Part 7's mechanism check.
- `test/probes/probe-s350-direction-readout.mjs` — Part 8.

**None is collected by `npm test`.** `vite.config.js` sets no `test.include`, so vitest's
default `**/*.{test,spec}.?(c|m)[jt]s?(x)` applies, and all four are plain `.mjs` with
neither infix. Confirmed again with `npx vitest list`: the collected set holds no
`probe-s350-*` entry.

## Batch

Not run. No file under `src/` was touched. `validate-batch.mjs` scores engine output and
would assert nothing about this read. Both corrected nulls exist only inside load-time
hooks that no engine code path imports.

## Dev server

Not started. Nothing under `src/` was edited, so there is no rendering surface. For
reference:

```bash
./scripts/dev.sh s350-part-3-dispatch
```

---

# Verification — Parts 9, 10 and 11

Run from the worktree `.claude/worktrees/s350-part-4-copyfidelity`, branch
`claude/s350-part-4-copyfidelity`, off `85d7d26`.

**A note on the state this dispatch assumed.** It was written against main at `1766618`
and said Parts 6, 7 and 8 had not run. They had — they merged as `85d7d26` before this
dispatch began. The dispatch said the numbering gap was deliberate and either order works,
so this ran off current main. One consequence is load-bearing and good: the RSC null hook
Part 6 built was already available, so Part 11 did not have to rebuild it.

## Commands run

```bash
git worktree remove .claude/worktrees/s350-part-3-dispatch
git branch -d claude/s350-part-3-dispatch
git worktree add .claude/worktrees/s350-part-4-copyfidelity -b claude/s350-part-4-copyfidelity main
./scripts/init-worktree-symlinks.sh .claude/worktrees/s350-part-4-copyfidelity

# Part 9 — scope of a paired-disable rule
node test/probes/probe-s350-disable-scope.mjs

# Part 10 — the generator, and its diagnostics
node test/gen-copy-fidelity.mjs --out /tmp/copy-fidelity --reps 5
# forty-seed check on the apparent spread dip, and on independence at the far end
node --input-type=module -e "<inline: 40 seeds per k, mean and se of spreadA, spreadB, cellCorr>"
# both layouts through the engine import chain
node --input-type=module -e "<inline: prep + roles + condCtx + slices + detectVST on cg_ and rg_>"
node --input-type=module -e "<inline: DATATYPE_SKIP.continuous membership for both tests>"

# Part 11 — the sweep
COST=1 node --import ./test/probes/s348-hash-hook.mjs \
  --import ./test/probes/s350-paired-null-hook.mjs \
  --import ./test/probes/s350-rsc-null-hook.mjs \
  test/probes/probe-s350-copy-fidelity-sweep.mjs
node --import ./test/probes/s348-hash-hook.mjs \
  --import ./test/probes/s350-paired-null-hook.mjs \
  --import ./test/probes/s350-rsc-null-hook.mjs \
  test/probes/probe-s350-copy-fidelity-sweep.mjs            # run 1, mode full
node --import ... test/probes/probe-s350-copy-fidelity-sweep.mjs   # run 1 again, reproducibility
MODE=shared-subjects node --import ... test/probes/probe-s350-copy-fidelity-sweep.mjs

# vitest collection check
npx vitest list --filesOnly
```

The three inline `node --input-type=module` scripts are diagnostics, not deliverables:
they call the committed generator and the committed import chain and compute summary
statistics. Nothing they do is relied on beyond the numbers quoted in Part 10.

## Files and lines read

**Source under `src/`** (read only; nothing edited)

- `src/analysis/engine.js` — `:185-201` (validate, then `createPRNGFactory` on the
  sanitised raw matrix), `:280-290` (VST matrix and context), `:312-317` (`dtSkip`),
  `:319-325` (`condSkip`), `:413-421` (RSC dispatch), `:425-441` (CCC dispatch). The
  sweep's `enginePair` mirrors these.
- `src/tests/crossConditionConsistency.js` — `:456-461` (the block the CCC hook replaces),
  `:517-535` (direction assignment), `:563-577` (the three per-stage BH calls, which is
  where `bhMStage1/2/3` come from), `:610`, `:618` (the forensic filter and `primaryP`).
- `src/tests/residualSpikeCorrelation.js` — `:43` (the position-matching truncation),
  `:47-65` (the profile), `:80-91` (K), `:93-108` (overlap), `:113` (`N_PERM = 999`),
  `:137-154` (the block the RSC hook replaces), `:171` (`permP`).
- `src/analysis/conditionContext.js` — `:44-72` (routing and `paired`), `:99-138`
  (`slices()`), `:140-160` (`rowGroups()`).
- `src/constants/assays.js` — `ASSAY_DATATYPE_MAP`, `DATATYPE_SKIP`; `general` maps to
  `continuous`, whose skip map is empty, so neither test is data-type skipped.
- `src/constants/thresholds.js` — `ALPHA.NOTE`, `ALPHA.FLAG`, read at runtime.
- `src/stats/vst.js` — `detectVST`, which returns `log` on the generated data.

**Tests, probes and data**

- `test/batch-fixtures.mjs` — `EXPECTED` in full for the Part 9 pass; the declared-channel
  maps for both tests.
- `test/probes/s348-hash-hook.mjs`, `s350-paired-null-hook.mjs`, `s350-rsc-null-hook.mjs` —
  all three reused unchanged. Both null hooks target different files and compose.
- `test/probes/probe-s350-classb-bound.mjs` — `:129-193`, the pairing and alignment rule,
  ported into the Part 9 probe.
- `.gitignore` — `:67`, `test/probes/out-*/`, which is why the Part 9 engine cache is not
  committed.

**Fixtures** — all 27 parsed through the engine import chain and run through
`runFullAnalysis` once each for the Part 9 pass. The results are cached to
`test/probes/out-s350-scope/engine-cache.json`, which is gitignored.

## Files added

Two probes, one generator, three data files. Nothing under `src/`.

- `test/gen-copy-fidelity.mjs` — the generator. Durable tooling, not a probe.
- `test/probes/probe-s350-disable-scope.mjs` — Part 9.
- `test/probes/probe-s350-copy-fidelity-sweep.mjs` — Part 11.
- `docs/shared/S350-COPY-FIDELITY-SWEEP.md` — the summary tables for both modes.
- `docs/shared/S350-COPY-FIDELITY-UNITS.csv` and `-UNITS-SHARED.csv` — the per-unit record
  the amendment asked for, 6400 rows each.

**The generated datasets are not committed.** They are ephemeral and regenerate from
`(k, seed)`; the script writes them to a temp directory.

**Nothing here is collected by `npm test`.** `vite.config.js` sets no `test.include`, so
vitest's default `**/*.{test,spec}.?(c|m)[jt]s?(x)` applies, and both probes and the
generator are plain `.mjs` with neither infix. Confirmed with `npx vitest list --filesOnly`:
four files collected, none of them `s350` or `gen-copy-fidelity`.

## Batch

Not run. No file under `src/` was touched. Both corrected nulls exist only inside load-time
hooks that no engine code path imports, and the generator writes outside the fixture
directory.

## Dev server

Not started. Nothing under `src/` was edited, so there is no rendering surface. For
reference:

```bash
./scripts/dev.sh s350-part-4-copyfidelity
```

---

# Verification — Parts 12 and 13

Run from the worktree `.claude/worktrees/s350-part-5-heterogeneity`, branch
`claude/s350-part-5-heterogeneity`, off `a1a89ba`.

## Commands run

```bash
git worktree remove .claude/worktrees/s350-part-4-copyfidelity
git branch -d claude/s350-part-4-copyfidelity
git worktree add .claude/worktrees/s350-part-5-heterogeneity -b claude/s350-part-5-heterogeneity main
./scripts/init-worktree-symlinks.sh .claude/worktrees/s350-part-5-heterogeneity

# Part 12 — which mode ran, as a fact about the code
grep -n "MODE|sharedSubjects" test/probes/probe-s350-copy-fidelity-sweep.mjs
grep -n "sharedSubjects|rhoS|const rho =|p.sigma" test/gen-copy-fidelity.mjs
awk '/^## Run 1/,/^## Run 2/' docs/shared/S350-COPY-FIDELITY-SWEEP.md   # RSC free-null block
awk '/^## Run 2/,/^## Generator/' docs/shared/S350-COPY-FIDELITY-SWEEP.md

# Part 13 — estimator recovery before use
node --input-type=module -e "<inline: generate at each SLADDER point, 20 seeds, compare
                             trueScaleDispersion / raw / corrected / pooled noise>"

# Part 13 — the grid
COST=1 node --import ./test/probes/s348-hash-hook.mjs \
  --import ./test/probes/s350-rsc-null-hook.mjs \
  test/probes/probe-s350-heterogeneity-grid.mjs
node --import ./test/probes/s348-hash-hook.mjs \
  --import ./test/probes/s350-rsc-null-hook.mjs \
  test/probes/probe-s350-heterogeneity-grid.mjs

# vitest collection check
npx vitest list --filesOnly
```

The one inline script is a diagnostic, not a deliverable: it calls the committed generator
and reports summary statistics. The numbers it produced are the estimator-recovery table in
Part 13.

## Files and lines read

**Source under `src/`** (read only; nothing edited)

- `src/tests/residualSpikeCorrelation.js` — `:47-65`, the profile construction. `:53-57` is
  the row-centring that makes subject level invisible to the test and is the whole of Part
  12's answer. Also `:80-91` (top-K), `:93-108` (overlap), `:113` (`N_PERM`), `:171`
  (`permP`), `:223-242` (the returned shape, which supplies `allProfiles` and `topK` for
  the membership diagnostic).
- `src/analysis/engine.js` — `:185-201`, `:280-290`, `:413-421`. The grid's `enginePair`
  mirrors these.
- `src/analysis/conditionContext.js` — `:99-138`, `slices()`.
- `src/constants/thresholds.js` — `ALPHA.NOTE`, read at runtime.
- `src/stats/vst.js` — `detectVST`.

**Test-side**

- `test/gen-copy-fidelity.mjs` — read in full before editing; `:251-252` (the one place
  `sharedSubjects` reaches) and `:254-255` (the single global `sigma`) are the two lines
  Part 12 turns on.
- `test/probes/probe-s350-copy-fidelity-sweep.mjs` — `:73`, `:126`, the mode switch and
  where it is passed.
- `test/probes/s348-hash-hook.mjs`, `s350-rsc-null-hook.mjs` — reused unchanged.
- `test/batch-fixtures.mjs` — `EXPECTED`, for the four clean paired fixtures' assay.
- `docs/shared/S350-COPY-FIDELITY-SWEEP.md` — both runs' RSC free-null blocks, compared
  line by line.

**Fixtures** — the four clean paired fixtures parsed through the engine import chain for
the anchor: `01-densitometry-clean.csv`, `03-qpcr-clean.csv`, `09-proteomics-clean.csv`,
`17-densitometry-carlisle-clean.csv`.

## Files changed and added

- `test/gen-copy-fidelity.mjs` — **modified.** Adds `sigmaS` (per-subject noise-scale
  dispersion), the `SLADDER` export, the exported `residualScaleDispersion` estimator, and
  three diagnostics. The `s = 0` behaviour is unchanged: the grid's `s = 0` row reproduces
  the committed Part 11 curve exactly.
- `test/probes/probe-s350-heterogeneity-grid.mjs` — new, Part 13.
- `docs/shared/S350-HETEROGENEITY-GRID.md` — the grid tables.
- `docs/shared/S350-HETEROGENEITY-UNITS.csv` — the per-unit record, 1320 rows, carrying
  `p`, the BH fields (empty for this test, which has one statistic and no family), the
  membership counts and the measured dispersion per dataset.

**The generated datasets are not committed.** They regenerate from `(k, s, seed)`.

**Nothing here is collected by `npm test`.** `vite.config.js` sets no `test.include`, so
vitest's default applies and both files are plain `.mjs` with neither `.test.` nor
`.spec.`. Confirmed with `npx vitest list --filesOnly`: four files collected, none of them
`s350` or `gen-copy-fidelity`.

## Batch

Not run. No file under `src/` was touched. The corrected null exists only inside a
load-time hook that no engine code path imports, and the generator writes outside the
fixture directory.

## Dev server

Not started. Nothing under `src/` was edited, so there is no rendering surface.

```bash
./scripts/dev.sh s350-part-5-heterogeneity
```
