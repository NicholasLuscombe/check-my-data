# S350 Part 1 — the read that sizes the P82 fix

Read-only. Nothing under `src/` was edited. One file was added under `test/probes/`,
named and justified in Part 3. No batch was run, because no `src/` file was touched
and `validate-batch.mjs` scores engine output only.

The question this read answers: Cross-Condition Consistency and Residual Spike
Correlation both build a permutation null that treats paired subjects as
independent. What does a correct null cost, and which units does it silence?

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

---

# Verification

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
