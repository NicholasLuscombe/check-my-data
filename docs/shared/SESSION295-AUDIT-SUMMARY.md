# Session 295 — Poolability-predicate source read (V1X §2.6 fix-scoping gate)

**Read-only.** No `src/` file was edited. No batch was run. Nothing in the engine changed. This artifact answers the one empirical question that gates the axis-1 fix shape — whether the three cross-column-pooling tests share a single "are these columns poolable?" predicate or three different ones — plus the axis-2 independence check, the standing-fixture spec, and two banked one-liners. All line references are against the origin checkout as read this session.

The whole deliverable turns on one finding, so it goes first: **the three axis-1 tests do not share a poolability predicate. They pool on three orthogonal axes of column homogeneity. A single shared input-assembly guard would force a false unification; the fix shape is per-test applicability checks.**

---

## Axis-1 — the three poolability predicates, quoted from source

### 1. Benford pooled-span — `src/tests/benford.js`

- **What it pools.** `const allVals=matrix.flat().filter(v=>v!=null&&isFinite(v)&&v!==0);` (`benford.js:13`) — every finite non-zero value across *all* columns, flattened into one list. The guard set and the scored set are both this pooled list.
- **The guards, computed on the pooled list.** Positivity: `const positivityFrac = allVals.filter(v => v > 0).length / allVals.length; if (positivityFrac < 0.80) return … N/A` (`:21-22`). Span: `const absVals=allVals.map(Math.abs)…; const actualSpan=robustLogSpan(absVals); if(actualSpan<1.5) return … N/A` (`:23-25`). The comment at `:17-20` states the assumption verbatim: *"Benford's Law requires a positive-scale, scale-invariant multiplicative process."*
- **What breaks the leading-digit regime.** Pooling columns drawn from different generative processes or different scales. The pooled distribution can clear the ≥1.5-OOM span as a *mixture* span even though no single column spans 1.5 OOM on its own, and a mixture of unrelated leading-digit distributions has no reason to follow log₁₀(1+1/d). CORPUS-03: `Total.distance` (span 1.69) carries the pooled set past the guard while `SL` alone (span 0.095) would be N/A.
- **Poolability predicate this test actually needs:** *every pooled column is a draw from one common positive-scale, scale-invariant multiplicative process — i.e. each column individually satisfies the Benford applicability regime (positive-scale, ≥1.5-OOM intra-process span).* The span the guard reads must be an intra-process span, not a cross-column mixture span. This is a predicate about **generative scale-regime homogeneity**.

### 2. Empirical-HHI collision null — `src/tests/duplicateDetection.js`

- **What it pools.** `globalFreq` is built over every cell of the collision matrix: `for(let r=0;r<nR;r++) for(let c=0;c<nC;c++){ … globalFreq[k]=(globalFreq[k]||0)+1; }` (`:28-31`), then `const hhi = Object.values(globalFreq).reduce((s,c)=>s+(c/N)**2, 0);` (`:55`). For continuous data the null is that pooled index: the `else` branch sets `p1 = hhi; p1Source = "empirical";` (`:136-137`). The observed collision count is pooled the same way — `for (const cnt of Object.values(globalFreq)) { if (cnt >= 2) collisionObs += cnt * (cnt - 1) / 2; }` (`:169-171`) — and scored against `p1` at `collisionP = … binomialSurvival(collisionObs, collisionNPairs, p1)` (`:173`).
- **The safe-claim comment (falsified).** `:133-135` reads verbatim: `// Continuous (float) data: empirical HHI. Uniform-bins null assumes equal / probability across the range, which is wrong for any realistic distribution. / HHI circularity is not a concern for float data (high precision → many bins).`
- **What breaks its null.** Two distinct failure modes, only one of which is a pooling question. (a) *Self-conditioning circularity:* HHI is estimated from the same data whose collisions are being tested, so any true excess recurrence inflates `hhi`, the expected collision count rises to meet the observed count, and `collisionP → ~1`. The `:135` claim that high precision defeats this is false when a continuous column carries structured recurrence at coarse precision — CORPUS-03 `SL` (two decimals, values recurring exactly four times) is the counterexample. (b) *Mixture:* pooling columns with different value distributions makes the pooled HHI a mixture statistic that describes no single column's collision probability.
- **Poolability predicate this test actually needs:** *the pooled value multiset is a sample from one value-generating distribution whose true collision probability is estimable independently of the observed collisions* — either a parametric null (the integer branch's Poisson/NB at `:58-126`) or a value alphabet fine enough that no genuine value repeats. This is a predicate about **value-frequency-distribution homogeneity plus a non-circularity condition**, and the non-circularity half is not a cross-column question at all: a single column (SL alone) violates it with no pooling involved.

### 3. Decimal Precision Consistency — `src/tests/decimalPrecision.js`

- **What it flattens.** `const vals = rawMatrix ? rawMatrix.flat().filter(v => v != null) : matrix.flat().filter(v => v != null && isFinite(v));` (`:26-28`), then decimal-place counts are tallied per value across the whole flattened list into `prec` (`:36-40`). Guard: `if (withDec.length < 30) return … N/A` (`:32`); the binomial model runs only when `if (maxDp > 1 && nDistinct > 1)` (`:60`).
- **What the flatten assumes.** The model comment at `:1-12` and `:49-55` is explicit: *"If true instrument precision is K decimal places, trailing-zero stripping … produces apparent precision j < K with probability P(apparent = j) = (1/10)^(K-j) × (9/10)."* K is a **single** number, `maxDp`, for the entire flattened set. The whole decimal-place histogram is modelled as one binomial trailing-zero-stripping process off one instrument.
- **What breaks it.** Pooling columns recorded at different true precisions (one column at 2dp, another at 4dp) yields a multi-modal decimal-place histogram. The single-K binomial reads the intermediate-level counts as a deficit and flags "precision distribution inconsistent with any single fixed-precision source" (`:98-101`) — which is literally true (multiple sources) but is heterogeneous provenance, not fabrication.
- **Poolability predicate this test actually needs:** *every flattened column shares one true recording precision K (one instrument or one export pipeline), so the pooled decimal-place histogram is a single trailing-zero-stripping process.* This is a predicate about **decimal-recording-precision homogeneity**.

### Verdict: three different predicates → per-test checks, not a shared guard

| Test | Homogeneity axis the predicate demands |
|---|---|
| Benford pooled-span | generative scale-regime (positive-scale multiplicative process, ≥1.5-OOM intra-process span) |
| Empirical-HHI collision null | value-frequency distribution **+** null-estimation non-circularity (the latter not a cross-column property) |
| Decimal Precision Consistency | decimal-recording precision (single K) |

The three share only a surface form — "the pooled columns must be homogeneous." The *dimension* of homogeneity is orthogonal in each case, and a column set can satisfy one while violating another:

- Two columns from one 2dp instrument spanning different magnitudes satisfy predicate (3) but violate predicate (1).
- Two columns of one scale regime recorded at 2dp and 4dp satisfy predicate (1) but violate predicate (3).
- Predicate (2)'s circularity half is violated by a *single* column with no pooling — no cross-column guard could ever catch it.

A shared "are these columns poolable?" input-assembly guard would have to pick one axis. Tuned to any one, it passes column sets that break the other two, and it cannot express (2)'s single-column circularity failure at all. **A shared guard would force a false unification of three orthogonal predicates. The honest fix shape is per-test applicability checks** — each test guarding on its own homogeneity axis (Benford: per-column span/positivity before pooling; DecPrec: per-column precision agreement before flattening; Duplicate collision: extend the parametric null to the continuous branch, which addresses the circularity half directly rather than via a poolability gate).

---

## Axis-2 — independence of the self-calibrating null and the multi-column dispatch

Both sites confirmed. They are independent code paths; one fix does not touch the other's.

- **(i) Self-calibrating null.** `p1 = hhi` at `duplicateDetection.js:136` (continuous branch) and `:130` (large-N integer branch), where `hhi` is computed once at `:55` from the pooled `globalFreq`. It is consumed only by **Test 1** (collision), at `collisionP = … binomialSurvival(collisionObs, collisionNPairs, p1)` (`:173`), which enters the BH-FDR family as the first element of `rawPs` (`:692`). A defect that repeats values inflates `hhi` and self-cancels its own collision signal.
- **(ii) Multi-column dispatch.** Engine dispatch at `engine.js:323`: `["Duplicate Detection", async () => await runPair((m) => testDuplicates(m, matrix, wrColGroup, assay))]`. `runPair` decides which columns constitute the scored matrix `m`; the full matrix is passed as `fullMatrix`. **Tests 2/3/4** need whole-row / whole-block identity: row-dup `pMatchRow *= hhi` across columns (`:621-635`) with `rowDupPValue` at `:637`; within-row coincidence; block copy `bestBlockP` over `sparseFilteredBlocks` (`:649-682`). A co-present real column (`Total.distance`) whose values are *not* duplicated breaks whole-row and whole-block identity, so tests 2/3/4 are neutralised even though `SL`'s recurrence is a genuine column-local copy. Scored on `SL` alone, the block-copy sub-test rates HIGH (p≈3.6e-14).

**Independence — confirmed.** Extending the integer-branch parametric collision-null (`:58-126`) to the continuous `dp>0` branch (`:132-137`) changes only how `p1`/`collisionP` (Test 1) is computed. It does not alter which columns feed `m`, nor how row-dup/within-row/block-copy compute identity — tests 2/3/4 are untouched. Conversely, changing the dispatch scope (score the named column alone, or run a per-column block scan) changes the matrix composition and the block/row-identity path but never reads or rewrites the `p1` HHI branch. Neither fix touches the other's path. This confirms the lean recorded in the entry: **not either/or — scope the parametric continuous-branch null first (it removes the false negative for the isolated column), and track the dispatch suppression separately (it is what hides a real column-local copy when a clean column is co-present).**

---

## Standing regression fixture — spec input (report, do not build)

Every axis here is batch-invisible: the 23-fixture batch never exercises cross-column pooling heterogeneity or continuous structured recurrence. One mixed-magnitude, mixed-precision, multi-column fixture, supplied as a clean/defect pair, can make all three axis-1 tests **and** the axis-2 null visibly misbehave. What it must contain:

**Columns (four data columns minimum):**

1. **`recur` — continuous, narrow-magnitude, coarse-precision, with structured recurrence.** Values at 2dp confined to under 1.5 OOM (e.g. 1.00–1.20). In the *defect* member, inject the CORPUS-03 pattern: a set of ~20 distinct values each appearing exactly four times (structured exact recurrence). In the *clean* member, the same column with no injected recurrence (draws that do not repeat beyond chance). This column is simultaneously the Benford narrow-span target (span < 1.5 alone → N/A alone) and the axis-2 recurrence carrier.
2. **`wide` — continuous, wide-magnitude, real values.** 2dp, spanning ≥1.5 OOM (e.g. 5–500), distinct non-repeating values. Supplies the pooled span that lets Benford clear its guard, and is the co-present real column that neutralises duplicate tests 2/3/4 (its rows/blocks are never identical).
3. **`precA` — 2dp instrument precision.** Ordinary measurements recorded to exactly two decimals.
4. **`precB` — 4dp instrument precision.** Ordinary measurements recorded to exactly four decimals, from a nominally different instrument/export. Together with the 2dp columns, the pooled decimal-place histogram is bimodal.

**Spreads and thresholds to clear:**
- *Magnitude spread:* at least one column under 1.5 OOM (`recur`) and one at or above 1.5 OOM (`wide`), so Benford's span-borrowing is exercised.
- *Precision spread:* at least two distinct true precisions across columns (2dp and 4dp), so DecPrec's single-K model breaks; ≥30 pooled non-integer values, `maxDp>1`, `nDistinct>1`.
- *Structured-recurrence pattern:* in `recur`, distinct values each repeated exactly (the four-times pattern) at coarse 2dp — high pooled `collisionObs` with an HHI that inflates to match.
- *Row count:* ≥100 rows, to clear Benford's ≥100 pooled non-zero values / ≥50 leading digits and give the collision null enough pairs.

**Expected pre-fix verdict per test:**

| Test | Clean member | Defect member (pre-fix) | Failure class |
|---|---|---|---|
| Benford (First Digit) | N/A or LOW | **MODERATE/HIGH** — flags on the pooled set though `recur` alone is N/A (span < 1.5) | false positive (axis 1) |
| Decimal Precision Consistency | LOW | **MODERATE/HIGH** — reads the bimodal 2dp/4dp histogram as inconsistent-with-single-source | false positive (axis 1; true-but-benign heterogeneity) |
| Exact Duplicate Detection (full matrix) | LOW | **LOW / not flagged** — Test 1 collision suppressed by the self-conditioned HHI; Tests 2/3/4 neutralised by co-present `wide` | false negative (axis 2) |
| Exact Duplicate Detection (`recur` scored alone) | LOW | **HIGH** — block-copy / collision fire once the real column is removed | confirms the dispatch-suppression half of axis 2 |

The `recur`-alone row is the control that separates axis-2's two halves: it stays HIGH under the parametric-null fix path and drops the false negative, while the full-matrix row stays LOW until the dispatch is also addressed. That contrast is what makes the fixture able to regression-test each fix independently.

---

## Banked one-liners

- **`duplicateDetection.js:135` comment is verbatim as quoted and is the falsified safe-claim.** Confirmed at source: line 135 reads `// HHI circularity is not a concern for float data (high precision → many bins).` — falsified by CORPUS-03 `SL` (continuous, two decimals, four-times structured recurrence). This is the owed Code one-liner correction site; the correction rides the next implementation dispatch, not this read.
- **The five pruned-out seed axes remain out of scope.** (1) *Tier-mapping comparability* — the uniform p-to-tier map (`flagFromP`, `thresholds.js:38`) applied across non-comparable large-N p-values is the §5.4 large-N tier blocker already on the roadmap; homed, not re-audited. (2) *Shared-helper divergence* — variance/standard-deviation estimators meaning different things across cards is the §3 variance-estimator catalogue; homed there. (3) *Convergence-laundering* — `severity.js:15-22` takes each test's flag at face value, so it is the propagation stage of axes 1 and 2, not a separate axis. (4) *Determinism / order dependence* — randomness is seeded from matrix content (`createPRNG(matrix)`, `prng.js:40`) and row order is handled by the Row Semantics Gate; not real, no fresh instance. (5) *Boundary handling* (zero/tie/negative/missing) — real and pointable but no case is shown to flip a verdict; remains a fixture-gated overlay, not a lead axis.
