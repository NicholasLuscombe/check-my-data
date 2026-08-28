# The known-failure register

**The pass condition is exit 0 with zero undeclared failures.** It is not a count. The runner's
check total moves with the seed offset; the condition does not.

## What this document is, and one correction first

The S389 dispatch that produced this document was written to *build* a known-failure register,
on the premise that `test/validate-batch.mjs` had been red for more than twelve sessions on
DS12b's undeclared Regional Noise MODERATE.

**That premise is false at `38429c9`, and the inversion is the first finding.** The register
already exists. `test/known-failures.mjs` landed at S384 — the runner imports it, matches on a
three-part signature, tolerates a declared failure, fails on an undeclared one, and fails again on
a declared failure that stopped firing. A baseline run at seed offset 0 before this session
changed anything **exits 0**.

So this session did not build the mechanism. It did three things instead:

1. **Verified the existing mechanism actually works** — all three branches, on real runs, with
   exit codes. The dispatch's H3 demanded this and it had not been done.
2. **Closed the two genuine gaps** the dispatch identified, which are the anti-rot half:
   a `reviewTrigger` field, a `provenance` field, and an unconditional register print.
3. **Re-measured the seed table**, which had not been re-run since S358.

Nothing in `src/` was touched. `test/flag-matrix.json` and `MATRIX_EXCEPTIONS` were not touched —
H1 forbids it, and putting this firing in either of them would be *declaring* it.

## Why the firing is tolerated and not declared

DS12b's Regional Noise Homogeneity MODERATE is an adjudicated false positive. The fixture is 200
honest rows of log-normal noise at σ = 0.18 followed by 200 fabricated rows of uniform ±40% noise
on the same base means. Neither half flags alone — the genuine half reads 4.89× at p = 0.092, the
fabricated half 2.64× at p = 0.778 — and pooled they give 7.83× at p = 0.010. The firing localises
to rows 51–65, wholly inside the honest half, with no overlap with the plant. It is produced by
pooling one permutation null across two noise regimes.

**Declaring it would pin an adjudicated false positive into the matrix as expected behaviour**,
which is the DS23/DS24 pattern, and it would make the real defect invisible rather than merely
loud. The register is a *separate file* for exactly this reason: a tolerated failure and a
declared expectation must be structurally distinct, not distinguished by convention.

Provenance: adjudicated at S341
(`docs/shared/SESSION341-DS08-DS12B-ADJUDICATION.md`), settled across eight offsets at S358
(`docs/shared/SEEDS8-STRADDLE.md`). Register row: STATUS P61, the Regional Noise half — *"settled
as a pooling false positive (S358)"*.

## Signature granularity — and why the H2 fallback was not needed

The dispatch allowed a fallback to fixture + gate if the completeness gate did not expose the
failing test, with a halt if that coarser key could hide a second failure on the same fixture.

**It does expose it.** `validate-batch.mjs` builds the completeness signature as
`sig(file, 'completeness', m.test)` — the specific failing test name, taken from the value the gate
just compared, never parsed back out of its own printed line. All six gates do the same;
`severity` and `cross-shape routing` pass `null` because they reject the whole check rather than
one test inside it.

So the key is the full three-part signature: **check + gate + test**. H2 did not fire and the
fallback was not taken. The register file's own header already states the reason: a fixture name
alone *"would rebuild the same blind spot one level down, because the declared red would go on
hiding a second, different failure inside the same fixture."*

## The `seedDependent` fork — the lean was not taken, and why

The dispatch leaned toward: strict by default (an unmatched toleration fails the run), with a
`seedDependent: true` flag downgrading the DS12b entry to an informational line, because that entry
legitimately does not fire on three of eight offsets.

**The strict half is already built.** `validate-batch.mjs` exits on
`newFailed > 0 || unexpectedPasses.length > 0 || seedFailed > 0`, so an unmatched toleration fails
the run with no exception.

**The `seedDependent` escape is not built, and the existing design solves the same problem more
cleanly.** The register is judged at seed offset 0 only. Under `SEEDS>1` the extra offsets report
through the multi-seed section and do not feed the list. The file's header states the reason
directly: DS12b's cell is LOW at three of eight offsets, *"so at those offsets the completeness
gate does not fire at all. Judging the list across offsets would read that silence as a fix."*

That keeps the strict rule universal instead of carving out a per-entry exception, so a stale
toleration can never hide behind a boolean. The dispatch said to build the lean *unless Step 1
turned up something that contradicts it*. It did. **The reading taken is the existing one**, and no
`seedDependent` field was added.

## The seed table, re-measured at `38429c9`

`SEEDS=8 node test/validate-batch.mjs`. All three of the dispatch's expectations held; the DS15
question it said it could not answer is answered.

| Offset | DS12b Regional Noise | Batch state at that offset |
|---|---|---|
| 0 | MODERATE (p 0.008) | DS12b sole failure, completeness gate |
| 1 | MODERATE (p 0.006) | as offset 0 |
| 2 | MODERATE (p 0.006) | **DS12b *and* DS15** |
| 3 | **LOW** (p 0.01) | fully green |
| 4 | MODERATE (p 0.008) | as offset 0 |
| 5 | **LOW** (p 0.01) | fully green |
| 6 | MODERATE (p 0.008) | as offset 0 |
| 7 | **LOW** (p 0.01) | fully green |

**DS15's failure at offset 2, which the dispatch did not know:** Cross-Condition Consistency drops
to LOW (p 0.012 against 0.006–0.009 elsewhere), which fails **two** gates at once — the per-test
flag gate, because that cell is declared `['MODERATE','HIGH']`, and the **severity gate**, because
losing it takes the fixture from severity 3 to 2 against a declared 3.

Three of 783 cells are seed-unstable in total: DS12b / Regional Noise, DS15 / Cross-Condition
Consistency, and DS23 / Column Goodness-of-Fit (HIGH at six offsets, MODERATE at 2 and 7). All
three carry a `MATRIX_EXCEPTIONS` entry under P101.

**`SEEDS=8` exits 1**, and that is the multi-seed gate reporting the instability above — not the
register mis-firing. The two are separate exit conditions.

## The seed trio is not runnable, and what was demonstrated instead

The dispatch's Step 3 asked for three runs at three different offsets. **That is not runnable
against this runner, and the reason is structural: there is no single-offset knob.**

The only seed control is `SEEDS=N`, which runs offsets `0…N-1` in one process and feeds only
offset 0 to the register. There is no `SEED_OFFSET`. (The dispatch's claim that "`SEEDS>1` is
refused with exit 2" is also not right: the `exit(2)` guard is `WRITE_MATRIX && MULTI` — `SEEDS>1`
on its own works fine and is how the table above was produced.)

Rather than halt on H3, the three branches were demonstrated **directly**, which isolates each one
instead of relying on seed drift to reach it. Every arm was checked before it ran.

### The three runs

**A — tolerated path.** Register at one entry, unmodified.

- Arm check before running: `entries: 1 | reviewTrigger: true | provenance: true`
- `27 passed · 1 failed in a way already known about and declared · 0 failed in a way nothing declares`
- Register printed with `[fired this run]`, its `reviewTrigger` and its `provenance`
- `This run is clean: zero undeclared failures.`
- **`DEMO_A_EXIT=0`**

**B — undeclared-failure path.** Register temporarily emptied, so DS12b's real firing has nothing
to match.

- Arm check before running: `entries: 0`
- `27 passed · 0 failed in a way already known about and declared · 1 failed in a way nothing declares`
- `NEW FAILURE — completeness, Regional Noise Homogeneity. Nothing in test/known-failures.mjs accounts for it.`
- Register printed empty: `0 entries … (empty — every failure this runner sees fails the run)`
- `This run is NOT clean: 1 check failed in a way nothing declares.`
- **`DEMO_B_EXIT=1`**

**C — strict unexpected-pass branch.** The real entry left intact, plus a temporary second entry
keyed to a check that does not exist.

- Arm check before running: `entries: 2`, second is
  `S389-STRICT-BRANCH-PROBE-does-not-exist.csv | severity | null`
- The real entry fires and is tolerated; the temporary one does not
- `Declared known failures that did not fail this time:` names it, with
  `No check by that name ran at all, so the entry may be misspelled.`
- Register printed with both entries, the second marked `[did NOT fire this run]`
- `This run is NOT clean: 1 declared failure did not fire.`
- **`DEMO_C_EXIT=1`**

**The temporary entry was removed before commit**, and the removal was verified by content hash
rather than by eye: `test/known-failures.mjs` reads `f43a9ac57b9ee3ae247d83a9858e7bd9` both before
the demonstrations and after the removal, the probe string greps to zero, and the register parses
back to one entry.

Demo C is what covers the strict branch. The DS12b entry cannot exercise it, because at offset 0 —
the only offset the register is judged at — it always fires. **A branch that has never executed is
not a branch anyone can vouch for**, which is why a synthetic entry was used and then withdrawn.

## What this session changed

Two files, both under `test/`.

**`test/known-failures.mjs`** — the DS12b entry gains `provenance` (where it was adjudicated, plus
the STATUS register row) and `reviewTrigger` (the one thing that would close it: the Regional Noise
cross-regime pooling fix). The header gains a field register documenting all five fields and why
`reviewTrigger` exists.

**`test/validate-batch.mjs`** — the register now prints on **every** run, whether or not anything
matched, with the entry count, each entry's fired / did-not-fire state, its `reviewTrigger` and its
`provenance`. Before this, only *fired* entries printed, so a run where nothing matched said
nothing about what the runner is tolerating. The summary line now states the pass condition in the
words it is judged in — *zero undeclared failures* — with no ratio beside it.

The unconditional print is the anti-rot half. A toleration nobody sees becomes permanent; BANKED
went forty sessions with a correct entry nobody opened, and this list must not go the same way.

## What was not done

- **No `src/` change.** The Regional Noise cross-regime pooling fix is the real defect and it is a
  separate, larger piece of work.
- **No batch gate run as a pass criterion.** Three full runs were made *as the instrument*, but no
  `src/` file moved, so the runner has nothing to assert about engine behaviour and a green batch
  here would certify nothing.
- **`WRITE_MATRIX=1` was never run.**
- **No `seedDependent` field**, for the reason in the fork section above.
