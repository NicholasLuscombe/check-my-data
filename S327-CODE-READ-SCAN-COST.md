# S327 — what the sequence scan actually costs

Read-only. Nothing in `src/` changed. `BLOCK_SCAN_LIMIT` unchanged in both files.
Probes committed at `fc18568`:
`test/probes/probe-s327-scan-cost.mjs` (timings) and
`test/probes/probe-s327-scan-census.mjs` (census + mechanism).

**Machine:** Apple M3, Darwin arm64, Node v25.8.1. One warm-up run, then 3–7
timed runs per point (adaptive — the expensive points get fewer). Median with
min–max spread.

**How the guard was bypassed.** The probe reads each test module's real source at
run time and replaces the single token `const BLOCK_SCAN_LIMIT = 5000;` with a
chosen value, then imports the result. The replacement is asserted to match
exactly once. The timed code is the real source with one number changed.

**The headline, before the numbers.** The ceiling is on the wrong variable. Row
count does not predict the cost. Cardinality does. The same row count costs
61 ms on one dataset and 7.6 s on another, and the guard cannot tell them apart.

---

## 1. Timings — C14 `Data`, 9,398 rows × 14 data columns

| rows | Sequential Duplication | Duplicate Detection total | of which block scan |
|---:|---:|---:|---:|
| 1,250 | **133 ms** (127–302) | 562 ms | 537 ms |
| 2,500 | **649 ms** (637–687) | 1.15 s | 1.10 s |
| 5,000 | **7.56 s** (2.53–7.81) | 2.42 s | 2.31 s |
| 7,500 | **8.01 s** (7.45–8.32) | 3.82 s | 3.67 s |
| 9,398 | **14.37 s** (14.13–32.28) | 4.88 s | 4.67 s |

The spread at 9,398 is wide — 14.1 s to 32.3 s across runs. A separate
instrumented run measured 33.2 s at the same size. That variance is itself a
finding: the scan allocates enough to make garbage collection a visible term.

### The same scan on synthetic data of identical shape

Random values, 14 columns, same row counts:

| rows | Sequential Duplication |
|---:|---:|
| 1,000 | 21 ms |
| 2,500 | 33 ms |
| 5,000 | 61 ms |

**At 5,000 rows the scan costs 61 ms on random data and 7,560 ms on C14 — a
factor of 124 at identical size and shape.** A row-count ceiling cannot
distinguish these two cases, and that is the central problem with the constant.

---

## 2. Growth shape

Normalised to the 1,250-row point:

| rows factor | Sequential Duplication | DupDet block scan | linear would be |
|---:|---:|---:|---:|
| 1.00× | 1.00× | 1.00× | 1.00× |
| 2.00× | 4.89× | 2.04× | 2.00× |
| 4.00× | 56.9× | 4.30× | 4.00× |
| 6.00× | 60.3× | 6.83× | 6.00× |
| 7.52× | **108×** | **8.70×** | 7.52× |

**Sequential Duplication is quadratic.** 7.52× the rows costs 108× the time.

**Duplicate Detection's block scan is close to linear.** 7.52× the rows costs
8.70× the time — mildly super-linear, nothing like quadratic. Note this
contradicts its own comment at `duplicateDetection.js:367`, which claims
"O(n² × cols) in the verification step". Measured, it is not quadratic on this
data.

### Where the quadratic comes from — it is not the scan

I expected the scan loop, and that was wrong. The scan walk is linear. Measured
directly, without object construction:

| rows | runs of height ≥3 found | `nOppForHeight` inner iterations |
|---:|---:|---:|
| 1,250 | 16,058 | 3,211,600 |
| 2,500 | 37,425 | 7,485,000 |
| 5,000 | 79,160 | 15,832,000 |
| 7,500 | 120,551 | 24,110,200 |
| 9,398 | 150,464 | 30,092,800 |

Runs grow 9.4× for 7.5× rows — linear. `maxOffset` is capped at 200 above 500
rows (`sequentialDuplication.js:36`), so the walk is O(cols × 200 × rows),
linear in rows despite the comment's O(cols × offsets × rows) framing.

**The quadratic is the dominance dedup at `sequentialDuplication.js:115–121`:**

```js
sequences.sort((a, b) => (b.height - a.height) || (a.pAdj - b.pAdj));
const kept = [];
for (const s of sequences) {
  const dominated = kept.some(big =>
    big.col === s.col && …);
  if (!dominated) kept.push(s);
}
```

For every sequence it scans the whole `kept` array. Kept sizes, measured:

| rows | sequences kept | time |
|---:|---:|---:|
| 1,250 | 8,282 | 296 ms |
| 2,500 | 19,366 | 628 ms |
| 5,000 | 43,993 | 3,136 ms |
| 7,500 | 65,639 | 7,885 ms |
| 9,398 | 83,502 | 33,182 ms |

`kept` grows **10.1×** across the range — linear in rows. Time grows **112×**.
And 10.1² = 102, against 112 observed. **The cost is quadratic in the number of
kept sequences, and kept is linear in rows, so the whole test is quadratic in
rows.** On C14 that means roughly 3.5 billion comparisons at the top size.

---

## 3. Do the two scans cost the same?

**No, and not remotely.** At 5,000 rows on C14: Sequential Duplication 7.56 s,
Duplicate Detection's block scan 2.31 s. At 1,250 rows the ordering reverses —
133 ms against 537 ms.

They cross over between 2,500 and 5,000 rows, because one is linear and the
other quadratic. Below the crossover the block scan is the expensive one; above
it, the sequence scan runs away.

**One constant serving both is wrong on its own terms.** They are different
algorithms with different growth, and 5,000 is not a meaningful boundary for
either. For the block scan it is conservative — 2.31 s at the limit, still
linear, comfortable headroom. For the sequence scan it is far too generous on
low-cardinality data (7.56 s at the limit, quadratic and climbing) and far too
strict on high-cardinality data (61 ms at the same size).

---

## 4. Where the cost becomes unacceptable for a browser

**What I am treating as unacceptable, and why.** This runs client-side and blocks
the main thread — no worker, no yield. Sequential Duplication is one of 29 tests
in a battery the user waits on. I am using the conventional interaction budget:
under 1 s keeps the user in flow, 10 s is the outer limit of held attention. For
a single test out of 29, I would call **1 s the point where it stops being free
and 5 s the point where it is unacceptable on its own.**

Against that, **on C14-shaped data**:

- 1 s is crossed between **2,500 and 5,000 rows** (649 ms → 7.56 s).
- 5 s is crossed before **5,000 rows** — the current ceiling already permits a
  7.5 s single test.
- At 9,398 rows it is 14–33 s, which would look like a hang.

**On high-cardinality data**, 5,000 rows costs 61 ms and the ceiling could rise
by more than an order of magnitude before anything is felt.

So the honest answer to "where does it become unacceptable" is that **it depends
on the data, not the size**, and the current constant is simultaneously too high
and too low. Blocked Mahalanobis already solved this shape — it is async and
yields via `setTimeout` every 50 permutations (CLAUDE.md, S169). That mechanism
exists in this codebase and this scan does not use it.

---

## 5. Corpus impact — how many files sit above the ceiling

**Raw sheet extent is not the analysis row count**, and this matters a lot.
Preprocessing strips sparse rows and `detectBlocks` takes the first block, so a
43,202-row sheet can analyse as 3,600. The ceiling applies to the analysis
matrix. Measured through the real pipeline:

| raw rows | analysis rows | cols | file / sheet |
|---:|---:|---:|---|
| 16,522 | 400 | 20 | C10.xlsx / "B. cereus Experiment1" |
| 5,848 | **5,847** | 5 | C11.xls / "CFTRinh172 effect_Fig 2f" ← over |
| 14,436 | **14,432** | 2 | C11.xls / "DE expression_Fig 4a" ← over |
| 9,279 | 3 | 16 | C11.xls / "snRNA-seq_Fig 7" |
| 16,661 | **16,657** | 2 | C11.xls / "RNA-seq_Fig S4" ← over |
| 5,577 | 8 | 1 | C11.xls / "snRNA-seq_Fig S7" |
| 9,427 | **9,398** | 14 | C14.xlsx / "Data" ← over |
| 16,396 | 0 | 0 | C14.xlsx / "Metadata" |
| 43,202 | 3,600 | 4 | C25.xlsx / "Fig. 2c" |

**Four sheets across the whole corpus exceed 5,000 analysis rows, and three of
them are C11.** Raising the ceiling to 10,000 unblocks C14 `Data` and C11
"CFTRinh172 effect_Fig 2f" — two sheets. Raising it to 20,000 unblocks all four.

The three C11 sheets are 2 and 5 columns wide. Cost scales with columns, so they
are far cheaper per row than C14's 14 columns — but I did not time them, because
C11 is a legacy `.xls` with 34 sheets and none of the four is the PubPeer-flagged
one. **Saying so rather than extrapolating.**

Worth noting for whoever sets the number: **C14 `Data` is the only corpus sheet
that is both over the ceiling and has enough columns to be expensive.** The
decision is close to being about one file.

---

## 6. An obvious cheap optimisation

Yes, and it is where the quadratic lives. Reporting, not implementing.

**Bucket the dominance dedup by column.** The `.some()` at
`sequentialDuplication.js:118` already tests `big.col === s.col` as its first
clause, so every comparison against a different column is wasted work. Keeping
`kept` in a `Map` keyed by column would restrict each scan to one column's
entries. On C14 that is roughly a 14× cut at a stroke, and more where sequences
concentrate in a few columns — which is exactly the low-cardinality case that
makes the scan expensive. It does not remove the quadratic, it divides it.

**Memoise `nOppForHeight`.** `sequentialDuplication.js:64` carries the comment
"Depends only on h and the (capped) offset range, so precompute per h" — and then
does not. It is an arrow function recomputing a 200-iteration loop on every call,
once per kept run. On C14 at 9,398 rows that is 30 million inner iterations that
should be a handful of cache lookups, since `h` takes few distinct values. Small
next to the dedup, but the comment already promises the fix.

**A cardinality guard.** Duplicate Detection has one — `PARTIAL_ROW_CARD_FRAC`
holds high-cardinality columns out of candidate generation, added after C14's
`CROWNCLASS` column (5 distinct values over 9,398 rows) produced 16.9 million
pairs. The sequence scan has no equivalent and is defeated by the same column.
C14's measured cardinalities include one column with **5 distinct values** and
another with **16**, against 9,398 rows. Whether a low-cardinality column should
be in this scan at all is a methodology question, not an engineering one, and it
is Chat's.

I have not implemented or benchmarked any of these. The estimates above are
arithmetic from the measured counts, not measurements.

---

## 7. Things that did not fit

**The comment in `duplicateDetection.js:367` is wrong.** It claims the block scan
is "O(n² × cols) in the verification step". Measured, it grows 8.70× for 7.52×
the rows — linear with a small super-linear term. Not a defect, but anyone
sizing that constant from the comment would size it wrongly.

**The comment in `sequentialDuplication.js:33` is also misleading.** It calls the
scan "O(cols × offsets × rows)", which describes the walk correctly and misses
the quadratic dedup that dominates it. The stated complexity is the cheap half.

**`maxOffset` capped at 200 is load-bearing and undocumented as such.** Both files
cap it above 500 rows. Without the cap the walk would be genuinely quadratic and
the ceiling would be the least of the problems. Worth stating explicitly wherever
the constant is next discussed.

**What I could not establish cheaply.** I did not time the three C11 sheets — the
file is a 34-sheet legacy `.xls` and none of the over-ceiling sheets is the
flagged one, so loading and adjudicating which to run costs more than the answer
is worth at this stage. I did not measure memory, only inferred allocation
pressure from the run-to-run variance. And I did not test whether the quadratic
dedup ever changes the verdict — whether `kept` at 83,502 produces a different
`primaryP` than a bucketed version would — because that requires changing the
scan, which this dispatch forbids.

**No batch gate.** Nothing in `src/` changed. The batch could not see any of this
regardless: the widest fixture is 1,501 rows, three and a half times below the
ceiling, and on fixture-shaped data the scan costs milliseconds.

**Unmerged branches untouched**, as instructed: `s327-skip-fix` (`05b5e94`),
`s327-missing-gate` (`4b4717a`), `s327-round1` (`d0a7c41`),
`s327-confirm-path` (`86f615b`). Not merged, rebased or built on.
