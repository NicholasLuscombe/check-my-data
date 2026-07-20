# S327 — Corpus re-adjudication, round 1 (measurement)

Read-only. Nothing in `src/` changed. Probe: `test/probes/probe-s327-round1.mjs`,
committed at `3c7342f`. Reproduce with `node test/probes/probe-s327-round1.mjs`.

This reports what the engine returns now. It does not adjudicate and assigns no
Class letter. Every count below carries the sheet it is a property of.

---

## Sheet identification

| File | Sheet run | Basis |
|---|---|---|
| C16 | `Sheet1` | Single-sheet workbook — `Sheet1` is the only sheet. Spec §0.3 table (L231) also names `Sheet1`. No ambiguity to resolve. |
| CORPUS-01 | `Sheet1` | **Declared in `corpus-manifest.json`** (`"sheet": "Sheet1"`). Manifest also declares `assay: continuous`, `dataType: continuous` — both applied. |
| CORPUS-03 | `Clonal molly behavioral individ` | **Declared in `corpus-manifest.json`**. Manifest also declares `assay: general`, `dataType: continuous`, and the role override `Fish.ID → identifier` — all applied. |
| C14 | `Data` | Not in the manifest. Spec names it twice: §0.2 L153 and the §0.3 S322 correction at L245 ("its `Data` sheet (9,426 rows)"). Grouping-only target. |

Two of the four are manifest-declared, so the run protocol is satisfied without
inference. C16 needs no inference — one sheet exists. C14 is inferred from the
two spec lines quoted above.

**CORPUS-03's declared role override matters.** The manifest supplies
`Fish.ID → identifier`. Unaided inference misclassifies it as data, per the
standing entry's declared-structure footnote. This run is therefore *not* a test
of unaided role inference, exactly as the standing entry says.

---

## C16 — `Sheet1`

60 rows × 99 data columns. Assay `general` (auto), dataType `continuous`.

### 1. Battery by coverage state

Severity **3**. Coverage: ran 16 · notApplicable 9 · pending 4 · unassessed 0 · errored 0.

**ran (16)**

| Flag | p | Test |
|---|---|---|
| HIGH | 0.00e+0 | Autocorrelation |
| HIGH | 0.00e+0 | Benford's Law (First Digit) |
| HIGH | 0.00e+0 | Benford's Law (Second Digit) |
| HIGH | 1.10e-130 | Decimal Precision Consistency |
| HIGH | 0.00e+0 | Inter-Replicate Correlation |
| HIGH | 2.00e-4 | Regional Noise Homogeneity |
| HIGH | 0.00e+0 | Runs Test |
| HIGH | 1.99e-12 | Terminal Digit Uniformity |
| HIGH | 0.00e+0 | Value-Frequency Spike |
| MODERATE | 2.09e-3 | Sequential Duplication |
| MODERATE | 5.00e-3 | Windowed Autocorrelation |
| LOW | 5.49e-1 | Constant-Offset Blocks |
| LOW | 3.19e-2 | Exact Duplicate Detection |
| LOW | 5.00e-4 | Excess Kurtosis |
| LOW | 4.00e-3 | LOESS Residual Analysis |
| LOW | 1.00e+0 | Within-Row Variance |

**pending (4)** — Column Goodness-of-Fit, Entropy / Zipf Analysis,
Mahalanobis Row Outlier, Modality Test.

**notApplicable (9)** — Baseline Balance (needs ≥2 conditions with ≥3 rows);
Blocked Mahalanobis (needs ≥60 complete rows per condition, has 60 total);
Cross-Condition Consistency (needs ≥2 conditions with data); Cross-Condition Rank
Correlation (needs ≥2 conditions with ≥5 rows); Missing Data Pattern (missing
rate 0.0%, below the 1% floor); Noise Scaling (row means span 0.1 OOM, needs
≥1.0); Residual Spike Correlation (no condition grouping); Row-Mean Runs
(per-condition sequences too short); Selective Noise Partitioning (no conditions
with sufficient data).

### 2. Grouping

Condition columns **Treat, Block, ZLev1** (3). `condCtx` row-grouped, count 60.
**60 groups, every one a singleton** — median 1, min 1, max 1. Groups of size ≥3:
**zero**. `rowGroups()` returns null.

Trigger: **arm 1 true** (≥3 condition columns) and **arm 2 true** (no usable
partition). **Pending.** Both arms, as spec L231 predicts.

### 3. Confirm path

Confirm card **appears**. Default ticked set: **Treat, Block, ZLev1** — all three
(`GroupingConfirmCard.jsx:55` ticks every condition column).

Before confirmation the four are pending, as above.

**After confirming the default tick set unchanged:**

| Flag | p | Test |
|---|---|---|
| N/A | — | Mahalanobis Row Outlier |
| MODERATE | 2.96e-3 | Entropy / Zipf Analysis |
| MODERATE | 4.94e-3 | Column Goodness-of-Fit |
| LOW | 3.95e-2 | Modality Test |

**This is the finding I would most want looked at.** C16's grouping is sixty
singletons. Confirming it produces two MODERATE verdicts and a LOW. Those are
**pooled** verdicts, not grouped ones — the grouping the user confirmed cannot
support a test, so the confirm path falls through to the ungrouped run.

This is a known, documented divergence, not a surprise. `confirmGrouping.js:22-27`
states it plainly:

> when `rowGroups()` returns null (a grouping of singletons), the engine returns
> the four tests as pending, but this path has dropped that guard and falls
> through to the pooled run. So a confirmed grouping of singletons is analysed
> pooled here where the engine would hold it. That is a confirm-card surface
> decision, held separately; it is not fixed by this module.

The measurement is that C16 is a live instance. A user who accepts the default on
this file converts four held tests into three verdicts computed on a basis they
did not agree to, with nothing on screen distinguishing them from grouped ones.
Whether that is acceptable is a surface decision and it is Chat's.

### 4. Skip and ceiling surface

Sequential Duplication 5,000-row guard: **not crossed** (60 rows).

| Test | B | p floor | HIGH | MODERATE |
|---|---|---|---|---|
| Constant-Offset Blocks | 999 | 0.0010 | **unreachable** | reachable |
| Windowed Autocorrelation | 999 | 0.0010 | **unreachable** | reachable |
| Entropy / Zipf Analysis | 999 | 0.0020 | **unreachable** | reachable |
| Cross-Condition Consistency | — | — | test not applicable (<2 slices) | — |

Constant-Offset returned LOW here, so the ceiling did not bind. Entropy is one of
the four pending tests; on confirmation it returned MODERATE, which is its
ceiling — **Entropy cannot return HIGH on this or any file**, so its MODERATE is
a top-of-range result, not a mid-range one.

### 5. Delta against the standing entry

**I cannot produce a test-by-test delta for C16.** The standing entry (§0.4 L116,
master row L39) does not enumerate per-test flags. It says "every flag that fired
is an applicability false positive" and "DupDet correctly LOW", and refers detail
out to `V1X-FUTURE-WORK.md` §2.9b and `C16-GROUNDTRUTH-BANK.md`, neither of which
is in the spec. Reporting the absence rather than diffing against prose.

What can be checked against the entry:

- **"DupDet correctly LOW" — holds.** Exact Duplicate Detection LOW, p = 3.19e-2.
- **The 60-singleton grouping — holds exactly.** Spec L231's figures reproduce.
- **The four row-grouped tests are now held, not silently pooled.** Spec L251
  described the old behaviour: "Sixty singleton groups, all dropped by the min-3
  guard … Nothing announces that the grouping produced nothing. A reader sees a
  file that looks assessed." That is fixed at the engine — they return pending.
  It is **not** fixed through confirmation, per §3 above.
- **Sequential Duplication fires MODERATE (p = 2.09e-3) and is new.** It did not
  exist when C16 was read. Its status is unadjudicated.

---

## CORPUS-01 — `Sheet1`

105 rows × 4 data columns. Manifest assay `continuous`, dataType `continuous`.

### 1. Battery by coverage state

Severity **3**. Coverage: ran 20 · notApplicable 7 · errored 2 · pending 0 · unassessed 0.

**ran — flagged (3)**

| Flag | p | Test |
|---|---|---|
| HIGH | 1.59e-6 | Decimal Precision Consistency |
| HIGH | 4.32e-7 | Missing Data Pattern |
| **HIGH** | **1.84e-6** | **Sequential Duplication** |

**ran — LOW (17)** Autocorrelation 5.85e-2 · Benford 2nd 2.18e-1 · Constant-Offset
1.00e+0 · Cross-Condition Consistency 1.87e-2 · Cross-Condition Rank Correlation
4.75e-2 · Exact Duplicate Detection 1.00e+0 · Excess Kurtosis 1.75e-1 ·
Inter-Replicate Correlation 4.09e-1 · LOESS 1.60e-2 · Regional Noise 8.87e-1 ·
Row-Mean Runs 4.38e-2 · Runs Test 1.12e-1 · Selective Noise 1.40e-1 · Terminal
Digit 1.29e-2 · Value-Frequency Spike 1.00e+0 · Windowed Autocorrelation 1.80e-2 ·
Within-Row Variance 1.00e+0.

**errored (2)** — Entropy / Zipf Analysis and Mahalanobis Row Outlier, both
"No group had sufficient data for this test."

**notApplicable (7)** — Baseline Balance (4 data columns, needs ≥5); Benford 1st
(OOM span 1.2 < 1.5); Blocked Mahalanobis (needs ≥60 complete rows per
condition); Column Goodness-of-Fit (no group has 30 values); Modality Test (no
group has 50 values); Noise Scaling (0.8 OOM, needs ≥1.0); Residual Spike
Correlation (<10 rows).

### 2. Grouping

Condition columns **Treatment, Genotype** (2). Row-grouped, 10 groups, all usable.
Median 10.5, **min 6**, max 15. Groups of size ≥3: 10. `rowGroups()` returns 10.

Trigger: arm 1 false (2 condition columns), arm 2 false (median 10.5 > 4, all
groups ≥3). **Not pending.**

### 3. Confirm path

Confirm card **does not appear** — the trigger is not pending. The default tick
set would be Treatment, Genotype.

The four row-grouped tests are not held. Two errored (Entropy, Mahalanobis) and
two are not applicable (Column Goodness-of-Fit, Modality). So all four produce no
verdict on this file, but for applicability and error reasons, not enforcement.
No confirmation is offered and none would change this.

### 4. Skip and ceiling surface

Sequential Duplication 5,000-row guard: **not crossed** (105 rows).

| Test | B | p floor | HIGH | MODERATE |
|---|---|---|---|---|
| Constant-Offset Blocks | 999 | 0.0010 | **unreachable** | reachable |
| Windowed Autocorrelation | 999 | 0.0010 | **unreachable** | reachable |
| Entropy / Zipf Analysis | 999 | 0.0020 | **unreachable** | reachable |
| Cross-Condition Consistency | 999 | 0.0020 | **unreachable** | reachable (maxN = 47) |

Constant-Offset returned LOW at p = 1.0, nowhere near its ceiling — the ceiling is
not why it is LOW here.

### 5. Delta against the standing entry

The standing entry is Class C: the tool **missed** the documented defect — "two
sets of 5 identical sequential values in the adhesive-removal column, shared
between SPF and ExGF mice" — because "the engine has no column-localised
sequential-duplication detector."

**That detector now exists and it fires HIGH at p = 1.84e-6.**

| Test | Standing | Now | Moved |
|---|---|---|---|
| Sequential Duplication | did not exist | **HIGH, p = 1.84e-6** | **new channel, fires** |
| Exact Duplicate Detection | LOW, p = 1 | LOW, p = 1.00e+0 | no |
| Constant-Offset Blocks | LOW, p = 1 | LOW, p = 1.00e+0 | no |
| Missing Data Pattern | HIGH (adjudicated B2) | HIGH, p = 4.32e-7 | no |
| Decimal Precision Consistency | not named in entry | **HIGH, p = 1.59e-6** | **fires, unaccounted** |

Two things need saying separately.

**The Class C gap has a candidate closure.** The named defect family is exactly
what Sequential Duplication was built for, and it fires HIGH. But I have not
opened the deposit to check that the flagged runs are the documented ones, because
adjudication against source is Chat's. **What is measured is that the channel
fires; what is not measured is that it fires on the right rows.** Do not record
this as a catch until someone reads the evidence against the adhesive-removal
column.

**Decimal Precision HIGH is unaccounted.** It is not mentioned anywhere in the
standing entry, which names only one HIGH (Missing Data, B2). Either it is new
since the adjudication or it was present and unrecorded. I cannot tell which from
the spec. It needs adjudicating alongside the rest.

**Two errored tests are also unaccounted.** The standing entry does not mention
Entropy or Mahalanobis erroring. "No group had sufficient data" on ten groups of
6–15 rows is plausible for Mahalanobis (needs ≥3 columns and ≥3× that in rows; the
file has 4 data columns) but I have not traced it, and the coverage vocabulary
distinguishes errored from not-applicable deliberately. Worth a look.

---

## CORPUS-03 — `Clonal molly behavioral individ`

373 rows × 2 data columns. Manifest assay `general`, dataType `continuous`,
`Fish.ID → identifier` applied.

### 1. Battery by coverage state

Severity **3**. Coverage: ran 20 · notApplicable 9 · pending 0 · unassessed 0 · errored 0.

**ran — flagged (11)**

| Flag | p | Test |
|---|---|---|
| HIGH | 0.00e+0 | Benford's Law (First Digit) |
| HIGH | 0.00e+0 | Benford's Law (Second Digit) |
| **HIGH** | **1.47e-35** | **Sequential Duplication** |
| HIGH | 3.69e-4 | Terminal Digit Uniformity |
| HIGH | 1.03e-6 | Value-Frequency Spike |
| MODERATE | 3.90e-9 | Autocorrelation |
| MODERATE | 2.00e-3 | Column Goodness-of-Fit |
| MODERATE | 1.67e-3 | Decimal Precision Consistency |
| MODERATE | 4.00e-3 | Entropy / Zipf Analysis |
| MODERATE | 2.00e-3 | LOESS Residual Analysis |
| MODERATE | 1.12e-3 | Row-Mean Runs |

**ran — LOW (9)** Constant-Offset 1.00e+0 · Cross-Condition Consistency 8.75e-1 ·
Exact Duplicate Detection 1.00e+0 · Excess Kurtosis 5.00e-4 · Inter-Replicate
Correlation 1.00e+0 · Modality Test 9.91e-1 · Residual Spike Correlation 2.72e-1 ·
Runs Test 3.26e-1 · Windowed Autocorrelation 2.88e-1.

**notApplicable (9)** — Baseline Balance (2 data columns, needs ≥5); Blocked
Mahalanobis (needs ≥3 replicate columns, has 2); Cross-Condition Rank Correlation
(<4 condition pairs); Mahalanobis Row Outlier (<3 replicate columns); Missing Data
Pattern (missing rate 0.0%); Noise Scaling (needs ≥3 replicate columns); Regional
Noise (needs ≥3 columns and ≥20 rows); Selective Noise (no conditions with
sufficient data); Within-Row Variance (needs ≥3 replicate columns).

### 2. Grouping

Condition column **Trt** (1). Row-grouped, 3 groups, all usable. Median 124,
min 121, max 128. Groups of size ≥3: 3. `rowGroups()` returns 3.

Trigger: arm 1 false (1 condition column), arm 2 false. **Not pending.**

### 3. Confirm path

Confirm card **does not appear**. Default tick set would be Trt.

The four row-grouped tests: Mahalanobis not applicable (2 data columns); Entropy
MODERATE, Column Goodness-of-Fit MODERATE, Modality LOW — all three ran normally.
No confirmation offered, none needed.

### 4. Skip and ceiling surface

Sequential Duplication 5,000-row guard: **not crossed** (373 rows).

| Test | B | p floor | HIGH | MODERATE |
|---|---|---|---|---|
| Constant-Offset Blocks | 999 | 0.0010 | **unreachable** | reachable |
| Windowed Autocorrelation | 999 | 0.0010 | **unreachable** | reachable |
| Entropy / Zipf Analysis | 999 | 0.0020 | **unreachable** | reachable |
| Cross-Condition Consistency | 999 | 0.0020 | **unreachable** | reachable (maxN = 256) |

**Three of the eleven flagged results sit at or near a ceiling and must not be
read as mid-range.** Entropy MODERATE at 4.00e-3 and Column Goodness-of-Fit
MODERATE at 2.00e-3 are both capped — neither can reach HIGH. LOESS at 2.00e-3
and Autocorrelation at 3.90e-9 are not on the list above because their
permutation counts key off internal per-pair counts this probe cannot read from
outside; Autocorrelation's value is far below any floor so it is unaffected.

### 5. Delta against the standing entry

The standing entry is Class A detection / limitation on severity: the pattern was
detected by Exact Duplicate Detection "but severity was under-called to LOW
(p=1.0)", because "the collision null is the empirical Herfindahl index of the
column's own value frequencies, so a defect that repeats every value four times
inflates its own baseline and the p-value collapses."

| Test | Standing | Now | Moved |
|---|---|---|---|
| Exact Duplicate Detection | LOW, p = 1.0 (under-call) | LOW, p = 1.00e+0 | **no — under-call persists** |
| Sequential Duplication | did not exist | **HIGH, p = 1.47e-35** | **new channel, fires hard** |
| Benford 1st / 2nd | not named | HIGH / HIGH, both 0.00e+0 | fires, unaccounted |
| Terminal Digit Uniformity | not named | HIGH, 3.69e-4 | fires, unaccounted |
| Value-Frequency Spike | not named | HIGH, 1.03e-6 | fires, unaccounted |

**The under-call is unchanged.** The null-circularity defect the standing entry
describes is still there on the channel it describes — Exact Duplicate Detection
still returns p = 1.0 on data where every value repeats four times. The spec's
V1X §2.6 null fix has not landed and this measurement confirms it.

**A different channel now calls it decisively.** Sequential Duplication returns
HIGH at p = 1.47e-35, the largest effect in this round. Whether it is detecting
the same join-scramble the entry describes, or something else, is an adjudication
question — the pattern is order-structured and the entry describes a scramble, so
they are plausibly the same thing seen from a different angle. **I have not
verified that.**

**Six flagged channels are unaccounted by the standing entry.** The entry names
one detection and one under-call. The file now returns five HIGH and six
MODERATE. The Benford pair at p = 0 on a two-column behavioural file is exactly
the heterogeneous-pooling false-positive shape the spec predicts at L278 for
multi-variable sheets — worth checking whether that prediction extends here — but
that is adjudication and I am not doing it.

---

## C14 — grouping, settled

Sheet `Data`. 9,427 raw rows → **9,398 rows × 14 data columns**.

- **Condition columns inference tags:** `Species`, `DamageSev` — **2 columns**.
- **Group count: 236.**
- **Median group size 4. Minimum 1. Maximum 1671.**
- Groups of size ≥3: **140**.
- `rowGroups()` returns **null** — no usable partition.
- Trigger: arm 1 **false** (2 condition columns, needs ≥3). Arm 2 **true**
  (median 4 ≤ 4, and not every group has ≥3 rows). **Pending, on arm 2 only.**

**This reconciles the spec contradiction and my own earlier number.**

- Spec L154 / L245 — "236 groups, min size 1 → Arm 2" — is **correct on every
  figure**, including the arm.
- Spec L1208 — "**C14 does not row-group** — no condition columns" — is **wrong**.
  It contradicts L245 directly, and L245's own text flags the earlier bucketing as
  a mis-classification it corrected.
- My earlier S327 figure of "140 slices" was **not a contradiction** — it was a
  different quantity. `condCtx.slices()` filters to groups of ≥3 rows
  (`conditionContext.js:132`); the trigger counts all groups including singletons.
  236 total, 140 of size ≥3. Both numbers are right. I should have named which
  one I was reporting; that ambiguity was mine.

The number for round 2 is **236 groups, median 4, min 1**, and the trigger fires
on **arm 2 alone** — not both arms.

---

## Spec contradictions found

Reported, not edited. `REALWORLD-CORPUS-SPEC.md` is Chat's.

1. **C14 row-grouping — L1208 versus L154/L245.** L1208 states C14 has no
   condition columns and does not row-group, and uses that to conclude it "is not
   blocked by the item above". L245's S322 correction states the opposite and
   explicitly calls the earlier bucketing wrong. **L245 matches measurement;
   L1208 is stale and its conclusion about C14 not being blocked does not follow.**

2. **CORPUS-01 minimum group size — L240 versus measurement.** The §0.3 table
   gives `105 | 10 | 10.5 | 10` (rows, groups, median, min). Rows, group count and
   median all reproduce exactly. **The minimum does not: measured minimum is 6,
   maximum 15.** A median of 10.5 across 10 groups is consistent with a min of 6,
   so the median is not in doubt — only the min. Cheap to re-derive; I have not
   guessed at which is intended.

3. **C15 "does not import" — L243 may be stale.** Not one of my targets, so not
   measured this round. But in the S327 column-width probe C15's `Data` sheet
   imported and resolved to 18 data columns, which reads as contradicting
   "Every row is stripped." The entry itself says the state was "Measured S325"
   and is conditional on "until the import-width trim lands" — and the trim is in
   main at `275256f`. Likely already superseded; flagging rather than asserting,
   since I have not re-run C15.

---

## Things that did not fit

**Constant-Offset Blocks can never return HIGH — on any input, at any size.**
This is stronger than my S327 read stated and I want to correct that record.
Source: `constantOffset.js:231` computes `permP = (permExceed + 1) / (N_PERM + 1)`,
and `N_PERM` is 999 / 499 / 199 by row count (L164). The best attainable p is
therefore 1/1000 = 0.001 at the most generous tier. `flagFromP` (thresholds.js:40)
requires `p < 0.001` for HIGH, and `0.001 < 0.001` is false. So the test's top
tier is arithmetically unreachable everywhere, not merely above 1,000 rows as I
previously reported. It returned LOW on all three files here, so nothing in this
round is affected — but any past or future reading of "Constant-Offset did not
reach HIGH" carries no information.

**Entropy / Zipf Analysis is capped at MODERATE the same way** (B fixed at 999,
two-sided floor 0.002). Its MODERATE on C16-after-confirm and on CORPUS-03 are
top-of-range results.

**Windowed Autocorrelation is capped at MODERATE on all three files** at these row
counts. Its own source comment (`windowedAutocorrelation.js:174-177`) already
documents this, so it is known.

**The batch could not have caught any of this.** No fixture exceeds 19 columns or
1,501 rows, so every ceiling, the 5,000-row skip branch, and the entire grouping
and confirm surface are dark to it. There is no batch result to report because
nothing in `src/` changed; had one run it would have been silent on all of the
above.

**Unmerged branches left untouched**, as instructed: `s327-skip-fix` at `05b5e94`
and `s327-missing-gate` at `4b4717a`. Neither merged, rebased, nor built on. Note
that both carry fixes relevant to this round — the Sequential Duplication
not-applicable routing in particular — so a later re-run on that branch could
differ from these numbers on the skip path. These measurements are against
**main at `d4c38b5`**.

**CLAUDE.md:143 fixed** — `SUB_HEAD` now reads `fontSize: FS.sm`, matching
`styles.js:15`, with a note that the `TF.*` scaffold was retired at S151 C.9.
Same defect class as the chart-caption line fixed last dispatch.
