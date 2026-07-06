# Multiplicity-distribution separation on tracked fixtures

## Purpose

The continuous-recurrence fix in §2.6 has closed three routes (the count null, and
the block-copy arrangement and longest-run reads). The surviving lead is a
multiplicity-distribution statistic: the corpus defect makes every distinct value
recur the same number of times, so the histogram of per-value repeat counts spikes
at one multiplicity — a shape no clean column should produce. This measurement
decides whether that spike separates from clean data, and in particular from
*clustered* clean data (coarse precision over a bounded range, carrying many
coincidental low-multiplicity repeats) — the same clean shape that closed the count
null.

Everything here is a pure count over each column's values. No engine call, no
engine change, no batch change. Nothing is asserted into the pass gate.

## The quantities

For one column, over its distinct values:

- **multiplicity** of a distinct value = how many times it occurs.
- **multiplicity histogram** = how many distinct values sit at multiplicity 1, 2, 3, …
- **modalMult / modalFrac** = the most common multiplicity and the fraction of
  distinct values at it. For clean data this is almost always multiplicity 1.
- **concentrationAboveOne** = fraction of distinct values with multiplicity ≥ 2.
- **modalFrac≥2** = among the values with multiplicity ≥ 2, the fraction that share
  their single most common multiplicity. This is the quantity the route hangs on:
  the defect drives all its ≥2 mass to one multiplicity (≈1.0); clustered clean is
  meant to spread it across 2s and 3s (well below 1.0).

I also report **modal≥2 value** — the multiplicity at which the ≥2 mass
concentrates — because it turns out to be the real separator and neither named
quantity encodes it.

## Per-column results

### Arm 1 — defect shape (`fix-A-contiguous-run.csv`, column `val`)

Five distinct values, each ×24.

- nRows 120, nDistinct 5. Histogram: multiplicity 24 → 5 values.
- concentrationAboveOne 1.000, modalFrac≥2 1.000, modal≥2 value 24.

### Arm 4 — in-tree defect fixture (`23-recurrence-null-mixed.csv`, column `recur`)

The realistic shape: five injected values each ×10, diluted by a clean singleton
background.

- nRows 120, nDistinct 75. Histogram: multiplicity 1 → 70 values, multiplicity 10 → 5 values.
- concentrationAboveOne 0.067, modalFrac≥2 1.000, modal≥2 value 10.
- The other two columns of this fixture (`wide`, `hiprec`) are pure singletons —
  120 distinct at multiplicity 1, concentrationAboveOne 0.

### Arm 2 — dispersed clean (`09-proteomics-clean.csv`, column `Rep1`)

High-precision continuous measurement, essentially no repeats.

- nRows 400, nDistinct 400. Histogram: multiplicity 1 → 400 values.
- concentrationAboveOne 0.000, modalFrac≥2 undefined (no ≥2 values), modal≥2 none.
- `07-elisa-clean` (Plate1/2/3, all 65 singletons) and `03-qpcr-clean` (Ct_1/2/3,
  all 50 singletons) behave identically: no multiplicity structure at all.

### Arm 3 — clustered clean, the hard case

For each of the three count-null breakers, the column with the most coincidental
repeats (highest concentrationAboveOne):

- **`11-rnaseq-multicondition.csv`, `Rep1`** (1dp counts, the genuinely clustered
  column and the decisive hard case): nRows 1500, nDistinct 1184. Histogram:
  multiplicity 1 → 1002, 2 → 110, 3 → 36, 4 → 22, 5 → 9, 6 → 1, 7 → 3, 10 → 1.
  concentrationAboveOne 0.154, modalFrac≥2 0.604, modal≥2 value 2, tail reaching
  multiplicity 10.
- **`12a-uniform-mixture-clean.csv`, `rep5`** (2dp, bounded range): nRows 400,
  nDistinct 379. Histogram: multiplicity 1 → 358, 2 → 21. concentrationAboveOne
  0.055, modalFrac≥2 1.000, modal≥2 value 2.
- **`09-proteomics-clean.csv`, `Rep5`** (barely clusters at all): nRows 400,
  nDistinct 396. Histogram: multiplicity 1 → 392, 2 → 4. concentrationAboveOne
  0.010, modalFrac≥2 1.000, modal≥2 value 2. This column is effectively dispersed
  clean, not clustered — 09-proteomics is high-precision and carries almost no
  coincidental repeats.

## Side by side

| Arm | Fixture · column | nDistinct | concentrationAboveOne | modalFrac≥2 | modal≥2 value |
|---|---|---|---|---|---|
| 1 defect (pure ×k) | fix-A · val | 5 | 1.000 | 1.000 | 24 |
| 4 defect (diluted ×k) | 23 · recur | 75 | 0.067 | 1.000 | 10 |
| 2 dispersed clean | 09 · Rep1 | 400 | 0.000 | — | — |
| 3 clustered clean (hard) | 11-rnaseq · Rep1 | 1184 | 0.154 | 0.604 | 2 (tail to 10) |
| 3 clustered clean | 12a · rep5 | 379 | 0.055 | 1.000 | 2 |
| 3 clustered clean | 09 · Rep5 | 396 | 0.010 | 1.000 | 2 |

## The decisive line

The two named quantities do **not** cleanly separate the defect from clustered
clean. Read honestly:

**concentrationAboveOne fails outright.** The pure defect (fix-A) sits at 1.0, but
the realistic diluted defect (fixture 23's carrier, five values ×10 against a
singleton background) sits at 0.067 — *below* clustered-clean 11-rnaseq at 0.154.
A defect diluted to realistic proportions carries less ≥2 mass than a genuinely
clustered clean column. This quantity anti-separates for the realistic case.

**modalFrac≥2 separates the defect from the count-null breaker, but not from all
clustered clean.** Against 11-rnaseq — the column that actually broke the count
null — it works: the defect is 1.0, 11-rnaseq is 0.60, with its ≥2 mass spread
across multiplicities 2 through 10. But 12a clustered clean reaches modalFrac≥2 =
1.000, tying the defect exactly, because all of its coincidental repeats are pairs
sitting at multiplicity 2. So a coarse-precision clean column *does* drive most of
its ≥2 values to a single multiplicity, and modalFrac≥2 alone cannot tell that
apart from the defect's spike.

**The only thing that actually separates them is the multiplicity value at which
the mass concentrates** — the defect at 10 or 24, clustered clean at 2 — and
neither named quantity encodes it. modalFrac≥2 measures how tight the concentration
is, not where it sits.

**And even the multiplicity value overlaps in the hard case.** 11-rnaseq carries a
coincidental clean repeat at multiplicity 10 (and one of its sibling columns
reaches 11). The in-tree defect (fixture 23) is exactly k = 10. So a statistic that
keyed on "a tight spike at some multiplicity ≥ threshold" would have to distinguish
the defect's five values at multiplicity 10 from 11-rnaseq's one coincidental value
at multiplicity 10 — a distinction of degree, not of kind, at that k.

## Verdict on the route

The multiplicity statistic as scoped is **necessary but not sufficient, and fragile
at realistic defect strength.** A viable version would have to combine three
conditions at once — a tight concentration (modalFrac≥2 near 1), that concentration
sitting at a high multiplicity well above the coincidental-pair floor, and that
multiplicity being shared by several distinct values — and even then it clears
clustered clean only when the defect's k is large. fix-A at k = 24 separates from
everything measured. The realistic in-tree defect at k = 10 does not clear
11-rnaseq's coincidental tail, and its concentrationAboveOne falls below clustered
clean.

So this route does not cleanly survive the hard case. It joins the count null,
block-copy arrangement, and longest-run reads as unable to separate the diluted
single-column defect from clustered clean by any single scoped quantity. Unless the
real corpus defect is known to use a large k (larger than the coincidental
multiplicity a coarse clean column reaches, which these fixtures show can be as high
as 10–11), the multiplicity route lands where the others did, and §2.6 becomes a
disclosed single-column miss in the paper.

## Accounting

- Worktree: `intelligent-elion-986667`
  (`/Users/hedgehog/Projects/check-my-data/.claude/worktrees/intelligent-elion-986667`).
- No engine change, no batch change. `duplicateDetection.js` and all `src/` logic
  untouched. Nothing added to the pass gate.
- One measurement doc: this file. The measurement script is a scratch file kept
  outside the tree (not committed to `src/`); the numbers above reproduce from the
  tracked fixtures directly. No new committed fixture is required — fix-A and
  fixture 23 are already tracked.
- Commit disposition: this doc committed to the worktree branch; see close note.
