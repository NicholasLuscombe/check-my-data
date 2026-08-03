# CCC null classification — S349 Part 4 audit

**Status:** S349 Part 4. **Owner:** Code. **Tracked.** **READ-ONLY audit — nothing under `src/` changed.**

`git status --porcelain -- src/` returned zero lines at every checkpoint. The per-unit fields are
exposed by an in-memory load hook (`test/probes/s349-unit-capture-hook.mjs`), which does the capture
edit only and leaves `B` at its shipped value.

**Scope.** This document classifies. It does not scope, design or sketch a fix. Where a claim is an
inference rather than a measurement, the mechanism it rests on is named.

**Regenerate.**

```bash
JSON_OUT=census.json node --import ./test/probes/s349-unit-capture-hook.mjs test/probes/probe-s349-corpus-census.mjs
```

Every fixture is run once at its own shipped seed and the shipped `B`. Nothing is substituted, so
every number below is the draw the batch actually sees.

---

## 1. Part 4a — the two branches

### 1.1 Row-grouped (established S349 Part 1, restated)

A condition is a **row subset**. `slices()` walks `rowConditions` and collects `matrix[r]` into the
group named by that row's condition label, keeping groups of ≥ 3 rows
(`conditionContext.js:123-135`). The slice carries `rowIndices` — the parent matrix row indices.

The permutation unit is a **whole row-tuple**: one slice row carrying all its non-null cells,
pre-computed residuals, and its pre-VST `(logMean, logVar)` pair. Fisher–Yates shuffles `permRow`
over every tuple in the file (`crossConditionConsistency.js:456-461`); pseudo-condition *k* then
takes the fixed index block `[rowStart[k], rowStart[k] + rowsPerCond[k])`.

Held fixed: per-condition row counts, each row's values, each row's intra-row cell pairings.

**No subject-level correspondence survives.** The shuffle is unconstrained over all tuples, so a
subject's rows in different conditions can land anywhere, including together.

### 1.2 Column-grouped

A condition is a **column subset of the same rows**. `buildGroups` (`aggregation.js:10-25`) partitions
the data columns by the two-row header's condition band and builds each group as

```js
matrix.map(row => g.matrixColIndices.map(ci => row[ci]))
      .filter(row => row.some(v => v !== null))
```

So **slice row *r* of every condition is the same subject** — the same parent matrix row, seen
through a different set of replicate columns. The correspondence is not incidental to one fixture's
construction; it is what column-grouping *is*.

CCC then treats those slices exactly as it treats row-grouped slices: one tuple per slice row, all
tuples in one pool, one unconstrained Fisher–Yates. A subject contributing three tuples (one per
condition) has those three scattered independently.

**The source states this as a decision, not an oversight.** `crossConditionConsistency.js:74-78`:

> column-grouped: `slice.matrix` is the column-subset for that group; each slice row is one subject's
> replicate tuple within that group. A subject that appears in multiple groups contributes one tuple
> per group — **these are independent permutation units**, same as under cell-based.

That sentence is the assertion the pairing finding contradicts. It is a claim about exchangeability,
and it is wrong for exactly the reason Part 3b measured on the row-grouped side: the observed
assignment puts every subject in every condition exactly once, and no free permutation can.

**Chat's weak expectation — that the column-grouped exposure is at least as large — is structurally
right, and I should be precise about why.** On the row-grouped side, pairing is a property of the
data a particular file happens to have. On the column-grouped side it is a property of the *layout*:
every column-grouped file is paired, always, with no identifier needed. Four of the 27 fixtures are
column-grouped and all four are perfectly aligned (measured, §4).

**A latent hazard, recorded not fixed.** `createConditionContext` sets `paired = true` unconditionally
whenever column groups exist (`conditionContext.js:60-62`). Nothing checks it. `buildGroups` applies
its `.filter(row => row.some(v => v !== null))` **per group**, so groups whose null patterns differ
end up with different row counts and the positional correspondence silently breaks. `slices()` for a
column-grouped context returns `colIndices` but **not** `rowIndices`, so no consumer can detect the
misalignment even in principle. All four column-grouped fixtures align today (35/35/35, 60/60/60,
35/35/35, 60/60/60), so this is a bound on the corpus, not a live defect in it.

### 1.3 Do Stages 2 and 3 share the shuffle

**Yes. Chat's expectation is confirmed.** One Fisher–Yates per permutation iteration produces one
`permRow` (`:457-461`), and all three stages read that same array in the same iteration:

- Stage 1 pools cells from `tuples[permRow[t]]` (`:463-474`)
- Stage 2 calls `fillResidualBundle(permResidualBundles[k], tuples, permRow, start, end)` (`:480`)
- Stage 3 calls `fillMvslopeBundle(permMvslopeBundles[k], tuples, permRow, start, end)` (`:488`)

There is one null realisation per permutation, shared by every unit in every stage. A null change
therefore reaches all three stages at once — it is not separable by stage.

---

## 2. Part 4b — is pairing visible to the engine

**Chat's expectation was that no pairing information reaches Stage 1. That inverts, partially, and
the partial matters.**

### 2.1 The identifier role exists

`ROLE_KEYS = ["data", "label", "condition", "attribute", "ignore"]` (`src/constants/roles.js`). The
identifier role string is **`"label"`**.

It is **both inferred and user-declared**. `inferBaseRoles` (`src/import/roles.js:33-47`) assigns it
three ways: a non-numeric column that is not low-cardinality enough to be a condition (`:38`), a
header matching `/^(id|name|sample|subject|patient|well|row|res|residue|index|idx|num|no|n|number|#|pos|position|frame|step|time|timepoint|obs|gene|geneid|protein|accession)\b/i` (`:43`), or a
near-consecutive integer sequence (`:47`). The user can override any column's role in ImportView.

### 2.2 It does not reach CCC

`extractAnalysisInputs` (`engine.js:111-161`) builds `matrix` from `dataCols` only (`:112`, `:117`).
Label column **values** are never carried into `matrix`, `rawMatrix`, or `condCtx`. `condCtx` receives
`groups`, `rowConditions` and `rowConditionsCols` — condition labels, never identifier labels.
`runFullAnalysis` receives matrix + condCtx; CCC receives matrix + condCtx + rng + `{originalMatrix,
hasVST}`. CCC's source contains no reference to `label`, `rowIndices`, `colIndices` or any identifier.

**So the identifier string is dropped at the import → analysis boundary.** For the row-grouped branch,
a paired null cannot be computed from what CCC is handed today.

### 2.3 But a `paired` flag does reach it — and it is wrong where it is needed

`ConditionContext` already carries a **`paired` boolean**, documented at `conditionContext.js:19` as
"Rows aligned across conditions? (true for column-grouped)" and exported on the context object
(`:291`). It is set `true` for column-grouped-with-groups, `false` for conditions-mode, row-grouped,
and none (`:60-72`).

**It is read exactly once in all of `src/`** — `engine.js:203`, and only to detect conditions-mode
(`condCtx.type === 'column-grouped' && !condCtx.paired`). **No test reads it as a pairing signal.**
CCC never reads it.

So the state of play is:

| branch | is the data paired? | does `condCtx.paired` say so? | does CCC read it? |
|---|---|---|---|
| column-grouped (groups) | **yes, always, structurally** | **yes, `true`** | no |
| row-grouped | sometimes — 4 of 7 fixtures | **no, hard-coded `false`** | no |

The flag is present and correct for the branch where pairing is universal, and absent for the branch
where the measured defect was found. That is the useful half of the inversion: for column-grouped
data the information a paired null needs is already on the object CCC is handed.

### 2.4 Nothing tests identifier-per-condition uniqueness

A search of `src/` for any such check returns nothing. No code anywhere asks whether an identifier
appears exactly once per condition. The counts in §4 below were computed by this audit's probe, from
the fixtures, and exist nowhere in the product.

### 2.5 The column-grouped row index as a pairing key

The row index **is** the pairing key for column-grouped data — slice row *r* is subject *r* in every
condition. But `slices()` does not expose it: the column-grouped branch returns `{name, matrix,
colIndices}` with no `rowIndices` (`:104-110`), while the row-grouped branch **does** return
`rowIndices` (`:132-134`). Nothing uses the row index as a pairing key today.

---

## 3. Part 4c — corpus census, all 27 fixtures

Declared severity from `EXPECTED`. Grouping from the engine's import chain. Pairing **counted from
the fixture**. CCC values from a single run at each fixture's own shipped seed and shipped `B`.

| # | fixture | GT sev | branch | pairing | CCC | primaryP | driver stage / units | gate-suppressed |
|---|---|---|---|---|---|---|---|---|
| DS01 | `01-densitometry-clean` | 0 clean | column | structural 35/35/35 | LOW | 0.0360 | S2 P6 `different` | 2 |
| DS02 | `02-densitometry-fabricated` | 3 fab | column | structural 35/35/35 | LOW | 0.116 | S1 P1+P2 `similar` | 2 |
| DS03 | `03-qpcr-clean` | 0 clean | row | **paired** `Target` 25/25 | LOW | 0.168 | S1 P2 `similar` | 1 |
| DS04 | `04-qpcr-fabricated` | 3 fab | row | **paired** `Target` 25/25 | LOW | 0.078 | S1 P1 `similar` | 0 |
| DS05 | `05-cellcount-clean` | 0 clean | none | n/a | N/A | — | — | — |
| DS06 | `06-cellcount-fabricated` | 3 fab | none | n/a | N/A | — | — | — |
| DS07 | `07-elisa-clean` | 0 clean | none | n/a | N/A | — | — | — |
| DS08 | `08-elisa-fabricated` | 3 fab | none | n/a | N/A | — | — | — |
| DS09 | `09-proteomics-clean` | 0 clean | row | **paired** `ProteinID` 200/200 | LOW | 0.012 | S1 P3 `similar` | 2 |
| DS10 | `10-proteomics-fabricated` | 3 fab | row | **paired** `ProteinID` 200/200 | LOW | 0.144 | S3 P9 `similar` | 2 |
| DS11 | `11-rnaseq-multicondition` | 3 fab | row | **paired** `GeneID` 500/500 ×3 cond | LOW | 0.0720 | S1 P3 `similar` | 5 |
| DS12a | `12a-uniform-mixture-clean` | 0 clean | row | unpaired (400 distinct, 0 shared) | LOW | 0.516 | S2 P5 `different` | 5 |
| DS12b | `12b-uniform-mixture-fabricated` | 1 fab | row | unpaired (400 distinct, 0 shared) | LOW | 0.024 | S3 P9 `similar` | **4 — see §5** |
| DS13 | `13-vfstest-cellcountest` | 2 fab | none | n/a | N/A | — | — | — |
| DS14 | `14-crctest-survey` | 2 fab | none | n/a | N/A | — | — | — |
| DS15 | `15-missing-carlisle` | 3 fab | row | **unpaired — no label column at all** | **MODERATE** | 0.00900 | S1 P1+P3 `similar` | 0 |
| DS16 | `16-densitometry-carlisle-overbalanced` | 2 fab | column | structural 60/60/60 | LOW | 0.0480 | S1 P1+P3 `similar` | 0 |
| DS17 | `17-densitometry-carlisle-clean` | 0 clean | column | structural 60/60/60 | LOW | 0.599 | S1 P1+P2+P3 `similar` | 2 |
| DS19 | `19-inheritance-fabricated` | 1 fab | row | **unpaired** (1200 distinct IDs, 1 row each) | **MODERATE** | 0.006 | S1 P3 `similar` | 0 |
| DS20 | `20-bimodal-fab` | 3 fab | row | unpaired (300 distinct, 0 shared) | LOW | 0.252 | S1 P2 `similar` | 3 |
| DS21 | `21-localised-ar` | 3 fab | row | unpaired (400 distinct, 0 shared) | LOW | 0.024 | S2 P5 `different` | 4 |
| DS22 | `22-covariance-block` | 1 fab | row | unpaired (400 distinct, 0 shared) | LOW | 0.044 | S3 P9 `similar` | 3 |
| DS23 | `23-recurrence-null-mixed` | 3 fab | none | n/a | N/A | — | — | — |
| DS24 | `24-recurrence-null-control` | 3 fab | none | n/a | N/A | — | — | — |
| — | `vfs-a-pigeonhole-clear` | 0 clean | none | n/a | N/A | — | — | — |
| — | `vfs-b-recurrence-high` | 2 fab | none | n/a | N/A | — | — | — |
| — | `vfs-c-deeptail-high` | 2 fab | none | n/a | N/A | — | — | — |

### 3.1 Counts

- **CCC returns N/A on 11 of 27** — every one for want of conditions. Stage 1 never runs on them.
- **CCC runs on 16.** Nine are paired (four structurally via column-grouping, five by identifier),
  seven are unpaired.
- **CCC reaches MODERATE or HIGH on exactly 2 of 27**: DS15 and DS19. Nothing reaches HIGH.
- `primaryP` comes from Stage 1 on 10 of the 16, Stage 2 on 3, Stage 3 on 3.
- **12 of the 16 have at least one gate-suppressed unit** — a forensic-direction unit whose
  effect-size gate failed, so its p was never consulted. P61's shape is routine, not exotic.
- The forensic-direction filter bars Stage-1 units on 5 fixtures, and bars **all nine** on DS01 and
  **all three** on DS22.

---

## 4. The A / B / C classification

**Definitional note, stated rather than silently resolved.** "The result would plausibly change"
is read here as *the flag changes on some reachable draw*, not *the shipped draw's flag changes*.
DS09's shipped draw is already LOW; what changes is its behaviour across seeds. Under the narrower
reading Class A would also be empty, which would be a true statement about one seed and a misleading
one about the tool. The wider reading is used throughout and flagged here so it can be overruled.

**The classes carve the corpus cleanly. Every fixture fits exactly one. No halt.**

### Class A — clean file, result would change. **1 fixture.**

| fixture | basis |
|---|---|
| **DS09** `09-proteomics-clean` | **Measured.** S349 Part 3b: the same observed distances give Stage-1 adjusted p 0.0342–0.0390 (LOW) under a within-pair null against 0.0036–0.0060 (MODERATE) under the free null, and the engine flags on 20/20 seeds at `B = 9999`. Pairing counted from the fixture: 200 `ProteinID`s, each exactly once in each condition. |

This is the defect, and it is one fixture.

### Class B — fabricated file, result would change. **EMPTY.**

**This is the inversion Chat named, and it rests on a measurement, not a judgement.**

CCC produces exactly two MOD/HIGH results in the whole corpus, and **both sit on files where no
pairing exists to respect**:

- **DS15** `15-missing-carlisle` — header is `COND,Rep1..Rep6`. **There is no identifier column at
  all.** Counted, not assumed. Nothing in the file matches a Control row to a Treatment row.
- **DS19** `19-inheritance-fabricated` — header is `ID,COND,value`. 1200 rows, 1200 distinct IDs,
  each appearing exactly **once in total**: 600 Control then 600 Treatment, no ID in both. Each row
  is a distinct subject measured once.

For both, free permutation of rows across condition labels **is** the correct exchangeability. A
paired null is not merely unnecessary — it is undefined, because there are no pairs. Neither flag can
be lost to a paired-null correction.

No paired fabricated fixture has a CCC flag to lose. DS02, DS04, DS10, DS11 and DS16 are all LOW, and
CCC contributes nothing to any of their severities today.

**Two secondary lines, both inferences, with their mechanisms named:**

1. On paired files, a correction can only push `similar`-direction units *away* from flagging.
   Mechanism: free permutation scatters matched partners, so the free null is more dispersed than the
   correct one; an observation in its lower tail moves toward the body when the null tightens. Measured
   on DS09 only (Part 3b: P3's percentile moved 0.07% → 67.9%, P2's 11.6% → 47.4%). **Not measured on
   DS02, DS04, DS10, DS11 or DS16.** DS16 is the closest to a threshold of the five — nine
   `similar`-direction Stage-1 units, raw p down to 0.006 — and it moves further from flagging under
   this mechanism, not closer.
2. A `different`-direction unit could in principle *gain* significance when the null tightens, which
   would be a gain on a fabricated file rather than a cost. On the fixtures where it could matter the
   gate blocks it anyway: the `different`-direction gates are **absolute floors on `dObs`** that no
   null change moves (`makeGate` in `crossConditionProperties.js:222-231`; P5's is a structural SE
   floor). DS10's P4 sits at `dObs = 0.066` against a floor of 0.5; DS12b's P4 at 0.288 against 0.5
   and P6 at 0.670 against 1.0.

### Class C — unaffected. **26 fixtures.**

| sub-class | count | fixtures | basis |
|---|---|---|---|
| **C1** no conditions — CCC N/A, Stage 1 never runs | 11 | DS05, DS06, DS07, DS08, DS13, DS14, DS23, DS24, vfs-a, vfs-b, vfs-c | Structural. Measured from the fixture. |
| **C2** unpaired — free permutation is already the correct null | 7 | DS12a, DS12b, DS15, DS19, DS20, DS21, DS22 | Measured: identifier counted per condition, none shared. |
| **C3** paired, but CCC contributes no flag and the correction moves `similar` units away from threshold | 8 | DS01, DS02, DS03, DS04, DS10, DS11, DS16, DS17 | Mixed. Pairing and current flag **measured**; direction of movement is the §4 Class-B inference (1). |

11 + 7 + 8 = 26 in Class C, plus DS09 alone in Class A and nothing in Class B = 27.

**What this classification cannot establish.** Each fixture was run **once**, at its own shipped seed.
S348 measured that a clean paired file's CCC verdict is seed-dependent, so a single draw is a sample
of size one per fixture. The MOD/HIGH count of 2-in-27 is that draw's count, not a rate. Only DS09 and
DS01 have multi-seed evidence (500 seeds each, from S348); every other fixture's flag is bounded at
n = 1. A fixture currently LOW at 0.024 or 0.044 could reach MODERATE on another seed, and three do
sit in that band: DS12b (0.024), DS21 (0.024), DS22 (0.044). All three are **unpaired**, so they stay
in Class C whichever way their seed falls.

---

## 5. DS12b and P61

P61 records a gate-suppressed CCC detection inside DS12b's planted mechanism. Measured, at the shipped
seed and shipped `B = 499`:

DS12b is row-grouped on two conditions, `Genuine` and `Fabricated`, 400 rows, `sample_id` unique per
row — **unpaired**, counted. `primaryP = 0.024` from Stage 3 P9, LOW. Seven units ran, and **four are
gate-suppressed**. Two of them would have been MODERATE:

| unit | stage | direction | dObs | null median | raw p | adj p | gate that failed |
|---|---|---|---|---|---|---|---|
| **P4 Residual SD** | 2 | `different` | 0.2878 | 0.01936 | **0.004** | **0.006** | absolute floor `dObs ≥ 0.5` |
| **P6 Residual kurtosis** | 2 | `different` | 0.6705 | 0.08050 | **0.004** | **0.006** | absolute floor `dObs ≥ 1.0` |
| P5 Residual lag-1 AC | 2 | `different` | 0.03788 | 0.02934 | 0.788 | 0.788 | absolute floor `dObs ≥ SE` |
| P3 CDF shape (KS) | 1 | `similar` | 0.03083 | 0.05833 | 0.072 | 0.216 | ratio `dObs / permMedian ≤ 0.5` — actual 0.529 |

So the suppressed detection is **Stage 2, `different`-direction, on residual structure** — P4 and P6,
each at raw p 0.004 and adjusted p 0.006, comfortably inside MODERATE. Both were stopped by an
absolute effect-size floor, not by their p. P4's observed distance is 15× its null median and P6's is
8× — large relative to the null, small relative to the fixed floor.

**What the detection would rest on if the null changed.** Nothing, and this is the load-bearing point.
DS12b is unpaired, so a paired null is undefined for it — its permutation would be unchanged, its
`dObs` unchanged, its raw p unchanged, and its gate unchanged. **P61 is untouched by any null
correction.** It is a gate-calibration finding, and it stays exactly where it is.

The Stage-1 P3 row is worth noting separately: it is `similar`-direction, it failed the ratio gate at
0.529 against a ceiling of 0.5, and the ratio gate's denominator **is** the null median. That is the
one quantity in DS12b a null change would move — but only for a paired file, which DS12b is not.

---

## 6. Recorded, not fixed

Findings surfaced by this audit and by S349 Part 3. Each is left in place.

1. **DS17 is not regenerable.** `generate-test-datasets.py` defines `gen_carlisle_clean` twice, at
   `:816` and `:924`; Python keeps the second. The shipped fixture (3 conditions × 6 reps, 60
   features, `Condition` header row) matches the **first**. The second produces 2 conditions × 4 reps.
   The writer list at `:1273` also names the output `17-carlisle-clean.csv`, while the file on disk is
   `17-densitometry-carlisle-clean.csv`. Re-running the generator today would neither reproduce the
   shipped DS17 nor overwrite it.
2. **`condCtx.paired` is a claim, never a check.** Set `true` for every column-grouped context
   (`conditionContext.js:60-62`); `buildGroups` filters rows per group, so differing null patterns can
   leave groups with different row counts and silently break the positional correspondence the flag
   asserts. `slices()` does not expose `rowIndices` on the column-grouped branch, so no consumer can
   detect it. All four column-grouped fixtures align today — a bound on this corpus, not a guarantee.
3. **`01-densitometry-clean` cannot serve as a Stage-1 negative control**, though it is used as CCC's
   negative control. All nine of its Stage-1 units are `different`-direction on every seed measured,
   so the forensic-direction filter bars every one of them from contributing. Its CCC p is a Stage-2
   number (P6 Residual kurtosis, `different`).
4. **The effect-size gate suppresses a forensic-direction unit on 12 of the 16 fixtures where CCC
   runs.** P61 named one instance; it is the common case, not the exception.
