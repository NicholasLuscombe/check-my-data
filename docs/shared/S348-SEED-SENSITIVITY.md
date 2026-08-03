# Seed Sensitivity on Clean Fixtures — S348

**Status:** S348. **Owner:** Chat. **Tracked** — lives in `docs/shared/` and rides git.

**Purpose:** the durable record of the S348 measurements. `docs/sessions/` is gitignored, so the
session summary produces no git object and the run outputs live in a temporary scratchpad. This file
and the committed probe are the only lasting record. It carries the raw grids and counts, not only
the conclusions, so a reader can recount rather than re-run.

**Companion artifacts**, all on `claude/seed-sensitivity-fixtures-64e304`:
`test/probes/probe-s348-seed-sensitivity.mjs`, `test/probes/s348-hash-hook.mjs`, and
`docs/shared/S348-SEED-SENSITIVITY-DATA.md` — 674 lines of per-seed rows, committed at `14ce58b`.

---

## 1. The question and the answer

**Question.** P69 recorded that changing one of `09-proteomics-clean`'s 2,400 cells by one unit in
its last decimal place flips the verdict for 6 of 60 such files. `hashMatrix64` derives the
pseudo-random seed from the parsed numeric matrix, so that perturbation changes the seed as well as
the data. Which one moves the verdict?

**Answer. The seed carries the whole effect and the data carries none of it.**

| pass | data | seed | non-clean |
|---|---|---|---|
| baseline | clean | own | 0 |
| A | perturbed | each neighbour's own | 6/60 = 10.0% |
| B | clean | each neighbour's | 7/60 = 11.7% |
| **C** | **perturbed** | **base file's own** | **0/60 = 0.0%** |

Pass A reproduces P69 exactly. Pass B's seven flips are a strict superset of pass A's six —
`k = 17, 36, 53, 57, 58, 59` in both, with B adding `k = 25`. The two agree cell for cell on 59 of
60, and the single disagreement runs against a data explanation: the perturbed file was clean at
that seed and the base data flipped.

**Consequence for a false-positive rate.** A clean file's verdict is a property of the run, not of
the file. Any specificity measurement has to say which seed it used, and a single run per file is
not a measurement.

---

## 2. The reported rate, and why no threshold fixes it

**`09-proteomics-clean`, 500 real neighbour-derived seeds: 93/500 = 18.60% non-clean, 95% Wilson
15.43–22.25%.**

This is the reported figure. It rests on no equivalence assumption — the seeds are ones real files
actually derive. Grid: `0.006 × 93`, `0.012 × 353`, `0.018 × 29`, `0.024 × 25`. No test other than
Cross-Condition Consistency reached MODERATE or HIGH in any of the 500 runs.

Cross-Condition Consistency's `primaryP` on this file sits on a coarse grid with spacing 0.006, and
`ALPHA.NOTE = 0.010` falls in the gap between the two points carrying almost all the mass.

| alpha | flags | rate |
|---|---|---|
| ≤ 0.006 | 0/500 | 0.0% |
| 0.006 < α ≤ 0.012 | **93/500** | **18.6%** ← `ALPHA.NOTE` |
| 0.012 < α ≤ 0.018 | 446/500 | 89.2% |

**Three reachable behaviours and nothing between them.** Nothing flags, or about one clean run in
five, or about nine in ten. `ALPHA.NOTE = 0.010` is already the best available choice and still
flags roughly one clean run in five. **This is not a calibration that can be tuned. Only more
resolution or a different statistic changes it.** That is P66's evidence, now measured rather than
argued.

The structure survives resolution unchanged: the same three bands appear at n = 60 and at n = 500,
with only the middle rate moving.

---

## 3. The n = 60 record

Kept because P69's figure and the pass A/B/C square are all at this size.

**Grid counts at n = 60:**

| p | pass A | pass B |
|---|---|---|
| 0.006 | 6 | 7 |
| 0.012 | 44 | 46 |
| 0.018 | 4 | 4 |
| 0.024 | 5 | 3 |
| 0.036 | 1 | 0 |

**Pass B — one clean file, 60 seeds.** 0/60 · 7/60 (11.7%) · 53/60 (88.3%) across the three bands.

**Pass A — 60 near-identical clean files, each at its own seed.** 0/60 · 6/60 (10.0%) · 50/60
(83.3%).

These are two experiments and must not be pooled into a single rate. The effective sample is 60
distinct seeds however many passes run over them. Pass B's 11.7% and the 500-seed 18.6% are
consistent — 7/60 carries a Wilson interval of 5.8–22.1% — and the 500-seed figure supersedes it.

---

## 4. All estimates in hand

| fixture | seeds | non-clean | 95% Wilson |
|---|---|---|---|
| `09-proteomics-clean` | **500 real neighbour-derived** | **93/500 = 18.60%** | **15.43–22.25%** |
| `09-proteomics-clean` | 500 constructed | 81/500 = 16.20% | 13.23–19.69% |
| `09-proteomics-clean` | 60 real (pass B) | 7/60 = 11.67% | 5.77–22.18% |
| `01-densitometry-clean` | 500 constructed | 0/500 | upper bound 0.76% |

`09`'s grid at 500 constructed seeds: 81 / 363 / 31 / 24 / 1.

---

## 5. The seed-rule comparisons, and what they could not see

Constructed seeds were compared against real neighbour-derived hashes under a gate declared before
any result: chi-square below 0.01 halts, 0.01 to 0.05 is a soft flag, at or above 0.05 is no gross
disagreement detected.

| comparison | X² | df | p | min. detectable shift | observed gap |
|---|---|---|---|---|---|
| 500 constructed vs 60 real | 0.832 | 2 | 0.6596 | 17.0 pp | 4.5 pp |
| 500 real vs 500 constructed | 2.054 | 4 | 0.7258 | 8.2 pp | 2.4 pp |

Neither halts. **Both passes are weak and must be reported as such.** Power roughly doubled with the
larger comparison, but 8.2 points is still coarse against a 2.4-point gap, so the reading is a bound:
no gross disagreement detected, not equivalence. The single differing grid point is 0.036, at 1/500
against 0/500.

**The reported rate is the real-hash one because of what its seeds are, not because it passed a
comparison.** The comparison is retained as a check on the constructed-seed rule, which no reported
figure now depends on.

---

## 6. One fixture in eight, and why

**Eight clean fixtures, 60 seeds each, 480 runs.** Only `09-proteomics-clean` ever flips — 7/60,
independently reproducing pass B. Across all 480 runs the only test to reach MODERATE or HIGH is
Cross-Condition Consistency on that one fixture. Every fixture's shipped draw is typical of its own
distribution; `09`'s sits at the mode.

Fixtures: `01-densitometry-clean`, `03-qpcr-clean`, `05-cellcount-clean`, `07-elisa-clean`,
`09-proteomics-clean`, `12a-uniform-mixture-clean`, `17-densitometry-carlisle-clean`,
`vfs-a-pigeonhole-clear`.

**Coarseness alone is not the defect.** `01-densitometry-clean` has the coarsest grid of any fixture
that runs the test — spacing 0.009, measured at 500 seeds, against `09`'s 0.006 — and never flags,
because its whole distribution sits above the threshold. It is also the nearest of the seven, its
lowest p at 0.018.
**`09` is unstable because its distribution straddles the threshold while the grid is too coarse to
resolve which side it is on.** Position and resolution together, not either alone.

**The seven are not observed to flag; they are not established as clean.** Zero of 60 bounds a rate
at about 5%, and a fixture whose true rate is 2% returns zero flips at n = 60 about a third of the
time. `01` at 0/500 tightens its own bound to under 0.76%, and its grid resolves from 7 values to 11
with its lowest p unchanged at 0.018 — more resolution, no new mass below the threshold. So the
straddle explanation survives resolution on the nearest case rather than being an artifact of small
n. The other six remain bounded at about 5%.

The 500-seed run also corrects `01`'s spacing: uniform 0.009 from 0.036 upward, with a single 0.018
gap at the bottom where 0.027 is unobserved. The n = 60 reading of "about 0.018" averaged over two
0.009 steps already present in that sample. The contrast with `09` is 1.5× rather than 3×, and the
conclusion holds at the smaller margin.

---

## 7. What the data contributed, and a confound no stride can fix

Six of the 60 perturbations moved Cross-Condition Consistency's p at all — `k = 1, 19, 25, 49` where
pass A differs from pass B, and `k = 43, 55` where pass C differs from baseline. **All six are on
`Rep6`, and every one moves p away from significance.**

**Column and nudge direction cannot be separated by any stride that samples all six columns.** Cells
are row-major over six data columns, so column is `i mod 6`. Sample `k` takes cell
`(k × stride) mod 2400`, and because 6 divides 2400 that reduces to `(k × stride) mod 6`. Direction
alternates on `k` parity.

2400 = 2⁵ · 3 · 5², so any stride coprime to 2400 is automatically coprime to 6. **That coprimality
is the cause, not the cure:** it makes the stride invertible mod 6, so the column slot recovers
`k mod 6`, and because 2 divides 6 that fixes `k mod 2`.

The complete statement: **a stride samples all six columns exactly when it is coprime to 6, and
those are exactly the strides that confound.** Strides sharing a factor with 6 split, and only half
of them decouple:

| gcd(stride, 6) | columns reached | columns with both directions |
|---|---|---|
| 1 — coprime (7, 41, …) | 6 | 0 |
| 2 — even (2, 4, 8, 10, 16) | 3 | 3 |
| 3 — odd multiples of 3 (3, 9, 15, 21, …) | 2 | 0 |
| 6 — (6, 12) | 1 | 1 |

The gcd = 3 family reaches two columns and stays confounded: `3k mod 6` is 0 on even `k` and 3 on odd
`k`, so the slot still fixes the parity. Only the even family genuinely decouples, at the cost of
half the columns.

Measured across twelve coprime strides — 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 49 — zero of six
columns receive both directions in every case. Stride 7 is not a worst case; it is identical to the
rest, and Part 2's stride 41 has the same structure.

**The remedy is a direction rule that is not a function of `k`.** Draw direction independently of the
sample index, or sample each cell twice and run both directions.

**This affects no result recorded here.** Part 5 hashes each neighbour and discards the matrix, so no
perturbed data reaches the analysis and the seeds are indifferent to which cell produced them. Part
2's confound was recorded and not chased, because pass C returning 0/60 settles the question that
mattered. The note exists so a future run that *does* analyse perturbed data does not inherit the
design.

---

## 8. What this is not

- **Not a battery false-positive rate.** One test fired. This is Cross-Condition Consistency's
  specificity on condition-grouped data.
- **Not a rate over files.** One fixture is unstable and the variation measured is over seeds, not
  over data.
- **Not a rate an editor would see.** These are constructed fixtures, and every threshold and gate
  in the tool was chosen while watching them. P65 still needs its own instrument.
- **Not an equivalence result anywhere a null appears.** Every zero here is a bound with a sample
  size attached.
- **Not a characterisation of any grid.** An observed spacing is an upper bound on the true spacing:
  a sample can miss reachable values but never invent them. `01`'s read as 0.018 at n = 60 and is
  0.009 at n = 500, and the error ran in the direction that flattered the argument it supported.

---

## 9. Verification

- **Three independent reproductions of 6/60, 7/60, 0/60** — pass A against S343's hookless harness,
  the regenerated run, and the seeds-file regeneration.
- **Pass B is the positive control on the hash substitution.** Sixty foreign hashes into the
  unperturbed matrix produced 7 flips across four grid points; an inert shim returns the baseline
  sixty times identically. The own-hash identity check is a necessary condition only — it is equally
  consistent with a faithful shim and an inert one.
- **Pass A agreeing with S343 is an independent check on the hook's record mode**, since S343's
  harness carried no hook.
- **The derivation shortcut is verified, not assumed.** Part 5 hashes each neighbour and discards
  the matrix; that shortcut matched 60/60 exactly against seeds a genuine analysis run recorded. The
  hash is taken after `validateMatrix`, which is where `runFullAnalysis` takes it.
- **Three assertions throw rather than warn** in Part 5: stride coprime to the cell count (tested —
  `NEI_STRIDE=5` throws, naming the 480 repeat), 500 distinct cells, 500 distinct `{h1, h2}` pairs.
- **Every reported figure was recounted from raw rows** by an independent pass, matching the probe's
  own summaries. The data file was recounted again after being written: 500 rows, 93 flips, 18.60%,
  grid 93 / 353 / 29 / 25.
- **The tool path and the recount agree digit for digit** on the 500-versus-60 comparison. Both use
  the probe's `chiSquaredP` and Wilson implementations, so this establishes that the seeds file and
  raw rows were read consistently. **It does not check the arithmetic** — a bug in either function
  reproduces identically in both.
- **Nothing under `src/` moved.** `git status --porcelain -- src/` returned zero lines at every
  checkpoint, across six commits on the branch, `ade4fd4` through `14ce58b`.

---

## 10. Consequences

**P66 is measured.** The CCC coarseness case now has evidence: no threshold setting avoids roughly
one clean run in five on this file, and the fix is resolution or a different statistic.

**P69 is answered.** The neighbour rate is a seed-sensitivity result. The data contributes nothing to
the flips.

**P65 is reordered behind the blockers.** A specificity measurement cannot be anchored to a quantity
this unstable, and raising the resolution moves the number rather than measuring it better. The
generator-versus-deposits decision now sits after P66, not before it.

**A doc residue for P70.** `vfs-a-pigeonhole-clear` is not carried in `TEST-GROUND-TRUTH` as a GT 0
row; the header at `:15` records it as owed.

**Per-run costs, for scoping future sweeps.** `09-proteomics-clean` 2.85–2.87 s per analysis; 500
runs about 23 minutes. `01-densitometry-clean` 500 runs in 261 s. Part 3's 480 runs across eight
fixtures took roughly 10 minutes.
