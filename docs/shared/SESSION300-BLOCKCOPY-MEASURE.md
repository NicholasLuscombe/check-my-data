# Block-copy Pass 1 reach on tracked one-column fixtures

## Purpose

Before the arrangement statistic in §2.4 is locked, confirm on tracked data whether
the duplicate-detection block-copy pass (Pass 1, the full-row hash) fires on a
single-column recurrence, and what specifically drives it. The claim under test:
Pass 1 detects a contiguous single-column run but stays silent on scattered
single-column recurrence, so §2.4's statistic is Pass 1's null re-scoped.

Everything here is measurement. No engine or batch change. `duplicateDetection.js`
and all `src/` logic are untouched. Two new one-column fixtures were added and run
through `testDuplicates` as a strictly one-column matrix (the same entry path the
engine uses, single column in).

## The fixtures

Both are one column (header `val`), 120 rows, continuous two-decimal values. Both
carry the **identical value multiset** — five distinct values, each appearing 24
times: `12.34, 12.51, 12.67, 12.88, 13.02`. The marginal is therefore identical
across the two, and so is any HHI-based null: the per-column HHI is
`5 × (24/120)² = 0.2` for both. The only difference is arrangement.

- `test/fixtures/fix-A-contiguous-run.csv` — the five values in contiguous blocks:
  rows 1–24 all `12.34`, rows 25–48 all `12.51`, … rows 97–120 all `13.02`.
- `test/fixtures/fix-B-scattered-recurrence.csv` — the same 120 values in
  round-robin order: `12.34, 12.51, 12.67, 12.88, 13.02` repeated for 24 cycles.
  Same multiset, same marginal, no contiguous run of length ≥ 2 for any value.

These are measurement fixtures only. They are **not** wired into
`batch-fixtures.mjs` `EXPECTED` and assert nothing into the pass gate.

## Results

| Fixture | `bestBlockP` | `pRow` (HHI) | block height `h` | `pBlock = pRow^h` | pass that fired | verdict on block p alone |
|---|---|---|---|---|---|---|
| fix-A (contiguous) | 0.0006251520 | 0.2 | 10 | 1.024e-7 | Pass 1 (full-row hash) | HIGH |
| fix-B (round-robin) | 0.0006251520 | 0.2 | 10 | 1.024e-7 | Pass 1 (full-row hash) | HIGH |

The two block p-values are bit-identical. The overall duplicate-detection verdict
(the BH-FDR combination across the four sub-tests, from the block p alone as the
only live signal) is **MODERATE** for both, at combined p = 0.0025.

### How the block p is built (exact, from source)

For a full-row block the price is `pAdj = min(1, pRow^h × nOpp)`, where:

- `pRow = wrColHHI[0] = 0.2` (identical for both fixtures — identical marginal).
- `h = 10`. This is the recorded block height, which equals the scan cap
  `maxH = min(10, floor(wrR/2)) = 10`. The true run in fix-A is 24 rows tall, but
  the hash pass never records above 10, so 10 is the height that reaches the p.
- `pBlock = 0.2^10 = 1.024e-7`.
- `nOpp = Σ_{d=1}^{119} max(0, 120 − d − 10 + 1) = Σ_{k=1}^{110} k = 6105`
  (full-row opportunity count: every offset × every starting position).
- `pAdj = min(1, 1.024e-7 × 6105) = 6.25152e-4`, which is the measured
  `bestBlockP` for both fixtures.

## The decisive line

fix-A fires, and fix-B fires too — at the **same** block p, the **same** height
`h = 10`, on **identical marginals**. Contiguity is not the sole driver. **This
breaks the re-scope claim as stated.**

The reason: the full-row hash pass does not look for a run of the same *value*. It
looks for a *sequence of rows that recurs*. A round-robin arrangement is periodic
with period 5, so every window of ten consecutive rows is identical to another
window ten, fifteen, twenty… rows away. The hash finds those recurring
ten-row windows exactly as readily as it finds a contiguous block — in fact fix-B
records more occurrences per block (23 vs 15) because the periodic pattern repeats
across the whole column rather than being confined inside a 24-row band.

So the height that reaches significance is driven by arrangement *regularity*, not
by contiguity specifically. Contiguity is one way to make a tall recurring window;
periodicity is another, and it prices the same.

### Confirming the true silent case (probe, not a tracked fixture)

To locate where Pass 1 actually goes silent, the same value multiset was run once
more in a genuinely random, non-periodic order (a seeded shuffle; not written to
disk as a fixture). There the marginal and HHI are still 0.2, but the tallest
recurring window is only `h = 5` and it recurs just twice by chance. That prices at
`pAdj = min(1, 0.2^5 × 6670) = 1` — capped out — so the block p is 1.0 and the
verdict is **LOW**. Pass 1 is silent on genuinely scattered recurrence.

Putting the three arrangements side by side, marginal held identical throughout:

| Arrangement | tallest recurring window `h` | `bestBlockP` | block-p verdict |
|---|---|---|---|
| Contiguous blocks (fix-A) | 10 (cap) | 6.25e-4 | HIGH |
| Round-robin / periodic (fix-B) | 10 (cap) | 6.25e-4 | HIGH |
| Random / aperiodic (probe) | 5 | 1.0 | LOW |

## What this means for §2.4

Pass 1's null is arrangement-sensitive but **not** contiguity-specific. It fires
whenever an h-row window recurs with `h` large enough that `HHI^h × nOpp` clears
the flag threshold — and both a contiguous block and a periodic arrangement produce
such a window. Only genuinely aperiodic scatter keeps `h` small enough to stay
silent.

So if §2.4 re-scopes Pass 1's null, it inherits this behaviour: it will treat a
regular periodic arrangement the same as a contiguous copy, and it will separate
both from random scatter. If the intent of §2.4 is specifically to catch
*contiguous copy-paste* and to pass over other regular arrangements, Pass 1's null
is the wrong statistic to re-scope, because it does not make that distinction. If
the intent is to catch arrangement *regularity* of any kind (contiguous or
periodic) against a scattered baseline, Pass 1's null is a fair basis, and the
value that matters is the tallest recurring window height.

The p ≈ 3.6e-14 figure that grounded the earlier reasoning came from a throwaway
one-column probe on gitignored data; it is not reproduced here. On these tracked
120-row fixtures the reachable block p is 6.25e-4 (MODERATE overall), because the
hash pass caps the recorded height at 10.

## Accounting

- Worktree: `intelligent-elion-986667`
  (`/Users/hedgehog/Projects/check-my-data/.claude/worktrees/intelligent-elion-986667`).
- No engine change, no batch change. `duplicateDetection.js` and all `src/` logic
  untouched. Nothing added to the pass gate.
- Two new fixture files: `test/fixtures/fix-A-contiguous-run.csv` and
  `test/fixtures/fix-B-scattered-recurrence.csv`.
- One measurement doc: this file.
- Commit disposition: see the close note below.
