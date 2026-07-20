# S327 — what drives C14's Sequential Duplication verdict

Read-only. Nothing in `src/` changed. `BLOCK_SCAN_LIMIT` raised only inside a
run-time copy of the source. Probe committed at `de8894e`:
`test/probes/probe-s327-cardinality.mjs`.

**The answer is no.** The categorical columns do not drive the verdict. They
generate 95% of the cost and contribute nothing to the p-value. This is a
performance problem, not a correctness one — the opposite of the expectation the
dispatch went in with.

---

## How `primaryP` decomposes

`primaryP = min(pAdj)` over kept sequences (`sequentialDuplication.js:128`), and

```
pAdj = min(1, colHHI[c]^h × nOppForHeight(h))
```

`colHHI[c]` depends only on column `c`. `nOppForHeight` depends only on `nR` and
the offset cap. Neither depends on the column count, and the dominance dedup is
already per column.

So the arithmetic **does** decompose per column, cleanly: each column contributes
its own minimum `pAdj`, and the verdict is the minimum across those. It is a
min-over-columns, not a pool. Every counterfactual below is therefore **exact**,
computed by filtering one run's kept list — not a re-estimate.

---

## Per-column table — C14 `Data`, 9,398 rows × 14 data columns

Sorted by contribution, strongest first.

| col | name | distinct | HHI | max share | kept seqs | **min pAdj** | top run |
|---:|---|---:|---:|---:|---:|---:|---|
| 0 | ACTIVITY_ID | 65 | 0.0242 | 6.3% | 190 | **7.92e-69** | h=46 d=100 |
| 12 | Biomass (kg) | 7779 | 0.0001 | 0.1% | 27 | 2.11e-63 | h=18 d=18 |
| 13 | Carbon (kg) | 7779 | 0.0001 | 0.1% | 27 | 2.13e-63 | h=18 d=18 |
| 8 | Crtd BA Incr | 7569 | 0.0002 | 0.1% | 29 | 1.52e-62 | h=18 d=18 |
| 6 | OLD BA Increment | 3934 | 0.0004 | 0.1% | 29 | 2.24e-55 | h=18 d=18 |
| 9 | Crtd BA Incr % | 7569 | 0.0023 | 0.1% | 29 | 6.69e-42 | h=18 d=18 |
| 7 | OLD % BA Growth | 3355 | 0.0025 | 0.2% | 29 | 3.54e-41 | h=18 d=18 |
| 5 | NewGrowthRate | 627 | 0.0069 | 2.5% | 460 | 2.53e-33 | h=18 d=18 |
| 11 | HEIGHT (ft) | 113 | 0.0184 | 3.3% | 73 | 1.11e-25 | h=18 d=18 |
| 1 | PLOT_ID | 90 | 0.0430 | 8.6% | 3,090 | 2.04e-20 | h=19 d=87 |
| **2** | **Tree ID** | **16** | 0.3361 | 43.8% | **49,097** | **2.11e-4** | h=21 d=18 |
| **10** | **CROWNCLASS** | **5** | 0.3852 | 51.3% | **30,252** | **5.47e-4** | h=23 d=144 |
| 4 | Stand BA m2/ha | 34 | 0.0798 | 14.2% | 170 | 4.80e-1 | h=6 d=17 |
| 3 | Stand Av DBH cm | 559 | 0.0023 | 1.0% | 0 | — | — |

**Overall: flag HIGH, primaryP 7.917e-69, 83,502 kept sequences.**

The two categorical columns carry **95% of the kept sequences and the two weakest
non-null p-values in the file**. They sit 65 orders of magnitude below the driver.

**The HHI null is working as designed.** A column that repeats itself constantly
gets a high HHI (0.385 for CROWNCLASS), so `HHI^h` decays slowly and long runs
are priced as unremarkable. A near-unique column gets a tiny HHI (0.0001 for
Biomass), so a run of 18 is astronomically improbable. The pricing already
discounts the categorical columns. It is doing the job the guard would be
built to do — it just does it *after* paying the cost, not before.

**One nuance worth not glossing.** Both categorical columns still clear
`ALPHA.FLAG = 0.001` on their own — 2.11e-4 and 5.47e-4 both flag HIGH. So they
are not innocent, they are merely not the driver. On a file where they were the
only columns, they would produce a HIGH by themselves. That is a separate
question from the one asked here, and I have not pursued it.

---

## Counterfactual

Exact, since dropping a column cannot change another column's `pAdj`.

| scope | flag | primaryP | kept | driver |
|---|---|---:|---:|---|
| **all 14 columns (current)** | HIGH | **7.917e-69** | 83,502 | ACTIVITY_ID (h=46 d=100) |
| **excluding col 2 and col 10** | HIGH | **7.917e-69** | 4,153 | ACTIVITY_ID (h=46 d=100) |

**Identical to the last digit.** Removing the two columns that generate 95% of
the work removes 79,349 sequences and moves the p-value not at all.

### Series over distinct-value cutoffs

I chose the series to bracket the two categorical columns (5 and 16 distinct) and
then continue up through the next tiers present in the file — 34, 65, 90, 113,
559, 627 — so the shape is visible either side of them. It is a probe of where
the verdict moves, not a candidate threshold.

| cutoff | columns dropped | flag | primaryP | kept | driver |
|---:|---:|---|---:|---:|---|
| < 6 | 1 | HIGH | 7.917e-69 | 53,250 | ACTIVITY_ID |
| < 17 | 2 | HIGH | 7.917e-69 | 4,153 | ACTIVITY_ID |
| < 35 | 3 | HIGH | 7.917e-69 | 3,983 | ACTIVITY_ID |
| < 66 | 4 | HIGH | 2.114e-63 | 3,793 | Biomass (kg) |
| < 100 | 5 | HIGH | 2.114e-63 | 703 | Biomass (kg) |
| < 200 | 6 | HIGH | 2.114e-63 | 630 | Biomass (kg) |
| < 600 | 7 | HIGH | 2.114e-63 | 630 | Biomass (kg) |
| < 1000 | 8 | HIGH | 2.114e-63 | 170 | Biomass (kg) |

**The HIGH is extremely robust.** It survives dropping eight of fourteen columns.
The verdict only shifts driver once — when ACTIVITY_ID itself is excluded at the
< 66 cutoff — and even then it stays HIGH by 60 orders of magnitude. Nothing in
this series takes C14 below HIGH.

The cost, by contrast, collapses immediately: the < 17 cutoff removes 95% of the
kept sequences while leaving `primaryP` untouched.

---

## The documented defects

Row mapping: one header row, no preamble stripped, 9,398 of 9,426 rows surviving
the sparse filter, and the surviving indices are contiguous — the 28 dropped rows
are trailing. So **file row = matrix row + 2**. I checked *overlap* with each
named range rather than exact endpoints, which is robust to a ±1 or ±2 error in
how PubPeer counts rows. I did not verify PubPeer's convention.

| defect | overlapping kept seqs | in col 2/10 | elsewhere | best outside the categorical columns |
|---|---:|---:|---:|---|
| PubPeer run A — file rows 696–706 → 707–718 | 72 | 62 | **10** | col 12 Biomass (kg), h=11 d=11, pAdj 1.37e-36 |
| PubPeer run B — file rows 4921–4930 → 4974–4983 | 92 | 81 | **11** | col 12 Biomass (kg), h=10 d=53 pAdj 9.27e-33 |
| Spec L153 — file rows 260 ↔ 261 | 10 | 10 | **0** | **nothing** |

**Both PubPeer runs survive.** Each is independently caught in `Biomass (kg)` at
pAdj 1.37e-36 and 9.27e-33 — far below any flag threshold, and entirely outside
the categorical columns. Note the geometry matches the documented claim: run A is
h=11 at d=11, which is an eleven-row block recurring eleven rows later, exactly
the "11 rows identical" shape the entry describes.

**The spec L153 pair does not.** Rows 260↔261 are covered only by col 2 and col
10. Excluding those columns loses it entirely. That said, its adjudication is
explicitly open — spec L153 asks whether adjacent identical forestry records are
a defect or a repeated-measures convention — so what is lost is a finding nobody
has decided is a finding. Reporting it as a real cost, not discounting it.

---

## Duplicate Detection's cardinality guard

`duplicateDetection.js:731`:

```js
const PARTIAL_ROW_CARD_FRAC = 0.02;  // hold a column out of the prefilter if one value covers >2% of rows
```

**It is not a distinct-count threshold.** It keys on the largest single-value
share, which is a different instrument from distinct-value count. The recorded
reasoning (`:714–720`) is verbatim:

> Cardinality guard (load-bearing): a column whose largest value-group covers
> more than PARTIAL_ROW_CARD_FRAC of the rows is uninformative when two rows
> match there — one row in a handful agrees by construction — and a single such
> column generates millions of candidate pairs (measured: a 9,398-row table with
> a five-value column produced 36M pairs and exceeded the map). So it is held OUT
> of prefilter accumulation. It still counts in the exact agreeing set and in the
> null; it just does not generate candidates.

Two things worth carrying forward, without proposing anything. The guard is
argued on **both** grounds — uninformative *and* expensive. And the column it was
measured against is C14's CROWNCLASS. The `max share` column in my table above
reports the same quantity: Tree ID at 43.8% and CROWNCLASS at 51.3% against a
2% bar, with the next highest being Stand BA at 14.2% and PLOT_ID at 8.6%.

---

## Are the two columns genuinely categorical?

**CROWNCLASS — yes, unambiguously.** Five distinct values, `1, 2, 3, 4, 5`, all
integers, perfectly consecutive from 1. A crown-class code.

**Tree ID — categorical, but not a clean code range.** Sixteen distinct values:
`1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 21`. All integers, consecutive
1–15, then a gap to 21. It reads as a within-plot tree number rather than a
measurement — an identifier that role inference tagged as data. The gap at 16–20
is unexplained by anything I measured.

Neither is a measurement. Both are labels stored as numbers.

---

## Other corpus sheets with the same shape

Many. Sheets the sequence scan runs on (analysis matrix ≥ 4 rows) carrying at
least one numeric column with ≤ 20 distinct values:

- **C07** / Mastersheet (72×39) — 5 low-cardinality, incl. Depth(2), Block(6)
- **C07** / Fig2_PCA_property (24×4) — 4
- **C11** — the worst affected, 18 sheets, several where *every* column is low
  cardinality: "Latency to suckle_Fig 3b" (8 of 8), "Birth weights_Fig 3e" (8 of
  8), "OMP count_Fig 3f" (9 of 9), "ORs_Fig 4i" (23 of 23), "Neuroepithelium_Fig
  5c" (8 of 8), "CFTR_Fig S2" (13 of 13)
- **C12** / Field survey-Herbiory (804×10) — 7, insect count columns
- **C14** / Data (9398×14) — 2, the subject of this read
- **C15** — 8 sheets, incl. Data (60×18) with plot_ID(9), IV(19)
- **C16** / Sheet1 (60×99) — **14**, incl. AB_Rich(4–5), FF_Rich(5) — the richness
  columns named in C16's own PubPeer entry
- **C17** — 6 sheets, incl. Behaviors (24×20) where all 20 are low cardinality
- **C18** / chill coma recovery (99×6) — 1
- **C19** / Sheet3 (18×16) — 16, all of them

**The shape is the corpus norm, not a C14 quirk.** But note the size interaction:
low cardinality is only expensive when the row count is large, and almost all of
these sheets are small — 72, 24, 8, 60 rows. C14 at 9,398 rows is the only one
where the combination bites. C16's 60 rows × 99 columns with 14 low-cardinality
columns is the nearest thing to a second case, and 60 rows is nowhere near
enough to be slow.

---

## Things that did not fit

**This inverts the framing.** The dispatch's premise was that a recurring run in
a five-value column is not duplication evidence, and that if it drove the verdict
this would be a correctness problem. It does not drive the verdict, and the
reason is that the HHI pricing already handles it correctly. The cost is real and
the signal contribution is nil, which makes it cleanly a performance question.

**What that means for a guard is not mine to say**, and I am not saying it. But
the measurement that matters for whoever scopes one is on the record: on C14,
excluding both categorical columns costs **zero** verdict signal and removes 95%
of the work — except for the spec L153 pair, whose status is undecided.

**A caveat on generalising from one file.** Everything above is C14. That the
categorical columns contribute nothing *here* does not establish that they never
would. On a file where a categorical column carried the only anomaly — which is
what spec L153's rows 260↔261 look like in miniature — excluding it would lose
the finding. I measured one file because that is what the dispatch asked; the
general claim would need the corpus.

**What I could not establish cheaply.** Whether PubPeer's row numbers are
spreadsheet rows or data rows — I used file row = matrix row + 2 and checked
overlap rather than exact endpoints, which absorbs a small offset error but would
not survive a large one. And I did not check whether the `Tree ID` gap at 16–20
means anything; it is visible in the value list and unexplained.

**No batch gate.** Nothing in `src/` changed. The batch could not see this
regardless — no fixture has C14's shape, and the widest is 1,501 rows.

**Unmerged branches untouched**, as instructed: `s327-skip-fix` (`05b5e94`),
`s327-missing-gate` (`4b4717a`), `s327-round1` (`d0a7c41`),
`s327-confirm-path` (`86f615b`), `s327-scan-cost` (`54d49a0`),
`s327-dedup` (`df4eb37`).
