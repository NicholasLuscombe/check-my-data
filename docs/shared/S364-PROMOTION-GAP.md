# S364 — P120, the promotion gap

Read-only. Nothing in `src/` changed, no batch gate, no threshold moved.

Instrument: `test/probes/probe-s364-promotion-gap.mjs`, two modes.
`--census` re-runs S363's grid — `general`/`plate_reader` × 4/6 replicates × r = 1/1.5/2.5 × 20 draws,
seeds 6100–6119, 240 draws — capturing every field of every condition-unit that bears on promotion.
`--derive` re-implements `kurtosis.js:401-449` outside `src/` on single draws.
Output in `test/probes/out-s364/` (gitignored).

**The census reproduces S363's counts exactly** — 478 condition-units, 30 floored, 45 in the MODERATE
band, 1 promotion, 1 draw returning no table. The two measurements are the same measurement, so the
classification below can be trusted to describe S363's thirty.

---

## The answer

**Twenty-eight of the thirty stop at one site: `kurtosis.js:476-477`.**

The per-condition `rawP` is **two-sided** — `obsDev = Math.abs(condK - simMedian)` at `:423`, counted
against `Math.abs(sk - simMedian) >= obsDev` at `:424`. The promotion family it feeds is **one-sided**:

```js
const platyFamily = bestResults.filter(c =>
  parseFloat(c.kurtDeviation) < 0 && c.rawP != null && isFinite(c.rawP) && c.rawP > 0);   // :476-477
```

A condition that is too **peaked** floors its p exactly as readily as one that is too **flat**, and
then never enters the family that could promote it. All 28 have strictly positive κDev, ranging
+0.1525 to +0.3163. **A two-sided p feeding a one-sided family is the whole gap.**

This is the dispatch's candidate B — a direction test distinct from `directionalSuppress` — and it is
not a second gate bolted on but the *same* forensic decision applied a second time: `:380` suppresses
the leptokurtic direction on the pooled arm at full precision, `:477` suppresses it on the
per-condition arm off a four-decimal string. Candidate A (a BH family) accounts for exactly one unit.
Candidate C (the tier ceiling) is real but binds on the one unit that did promote, not on the
twenty-nine.

---

## Step 1 — where each floored unit stops

Every gate a floored per-condition unit must clear to lift the **test** flag, in source order:

| site | file:line | test | effect on a floored unit |
|---|---|---|---|
| **A** | `kurtosis.js:476-477` | `parseFloat(c.kurtDeviation) < 0` | only platykurtic conditions join the promotion family |
| **B** | `kurtosis.js:479-482` | `bhFDR(platyFamily.map(rawP))[i] < ALPHA.FLAG` | BH across the platykurtic family, `m = platyFamily.length`, strict `<` |
| **C** | `kurtosis.js:484` | `flag === "LOW"` | aggregate promotion also requires the pooled arm to have produced no flag |
| **D** | `kurtosis.js:485`, `:508` | `promotedFlag: "MODERATE"` | the ceiling — a promotion can only ever produce MODERATE |

**30 floored condition-units (`rawP` < 0.001) over 240 draws, on 28 distinct draws.** The dispatch's
"roughly thirty draws" expectation held; two draws carry two floored units each.

| stopping site | units | share |
|---|---:|---:|
| **A** — not platykurtic, never joins the family | **28** | 93.3% |
| **B** — in the family, BH lifts `condAdjP` to ≥ 0.001 | **1** | 3.3% |
| **C** — family cleared but the pooled arm had already flagged | **0** | 0.0% |
| **D** — promoted, and capped at MODERATE | **1** | 3.3% |

Site C is empty because `directionalSuppress` fires on all 240 draws (S363 §1.1), so the pre-promotion
`flag` is `LOW` everywhere and `:484`'s condition is never the binding one on this grid.

### Site B, the one BH stop, and its arithmetic

`general`, 6 replicates, r = 1.5, seed 6102. CondA: κDev −0.1574, `rawP` = 1/2000, and it is one of
**two** platykurtic conditions that draw, so `m = 2`. BH at `primitives.js:235-247` gives the smallest
member `min(p₍₂₎·2/2, p₍₁₎·2/1)`; with `p₍₁₎ = 0.0005` the second term is **exactly 0.001**, and `:482`
tests `< ALPHA.FLAG` with `ALPHA.FLAG = 0.001`. **It lands on the threshold and the strict comparison
rejects it.**

Because a family here has at most two members, the rule on this grid is exact: *a floored platykurtic
unit promotes iff it is the only platykurtic condition, or both conditions are platykurtic and both
floored.*

| `m` = `platyFamily.length` | floored units | `condAdjP` seen | any < 0.001 |
|---:|---:|---|:--|
| 0 | 17 | — (not in family) | false |
| 1 | 12 | — , 0.0005 | true |
| 2 | 1 | 0.001 | false |

### Site D, the promotion

`general`, 6 replicates, r = 1.5, seed 6101 — the one S363 already reported. CondA κDev −0.1510,
`rawP` 1/2000, `m = 1` so BH is the identity, `condAdjP` 0.0005, pooled pre-promotion flag `LOW`,
`finalFlag` **MODERATE**, `primaryP` 0.0005. The ceiling binds: a floored per-condition unit that
clears every gate still produces MODERATE, never HIGH — `promotedFlag: "MODERATE"` at `:485`, applied
at `:508`. That is P104's Class A2 as `S360-EXTREME-STATISTIC-CENSUS.md` §2 defines it, and CLAUDE.md's
sub-unit BH-FDR escalation rule states the same ceiling for nine tests.

---

## Reconciling the two numbers

**They describe two different surfaces, and neither is wrong.**

- **6.3% is a rate on condition-units.** `c.flag` is `flagFromP(c.rawP)` at `:426` and the promotion
  arm never touches it. All 30 floored units read **HIGH on their own condition card** — the surface
  P52 files. Nothing in Step 1 stops that.
- **1-in-240 is a rate on test-level flags**, which additionally requires clearing sites A, B and C.
  28 units fail A, 1 fails B, 1 survives.

So P120's claim stands as stated — a false-positive rate on the condition-card tier — and was never a
claim about the test flag. **The open gap in P120's STATUS entry is closed by site A.**

One thing found while counting this: the displayed per-condition `p` is overwritten with `pAdjFull`
at `:499-502` (BH over the *full* condition set, the S248 display correction) while `flag` still comes
from the unadjusted `rawP` at `:426`. **26 of the 30 floored units render a displayed p ≥ 0.001 beside
a HIGH tier.** Reported, not scoped.

---

## Step 2 — what the 6.3% should be compared against

### 2.1 The denominator — the step-3 explanation held

| quantity | value |
|---|---|
| draws on the grid | 240 |
| conditions per draw when a table is returned | 2 |
| draws returning no condition table at all | **1** (`general`, 6 reps, r = 2.5, seed 6105) |
| condition-units | 240 × 2 − 2 = **478** |

**The unit is a (draw × condition) pair** — one row of `condKurtosis`, one row of the condition table
on the card. The dispatch stated in advance that step 3 would explain the gap, and it does: **one draw
carried no table at all, so it contributed zero units rather than one.** Neither falsifier fired — the
missing draw did not carry a one-condition table (that would give 479), and no second draw dropped a
unit. **478 and the missing draw are one fact, not two.**

### 2.2 The nominal, derived rather than assumed

```js
const obsDev  = Math.abs(condK - simMedian);                                    // :423
const nExceed = simKurts.filter(sk => Math.abs(sk - simMedian) >= obsDev).length; // :424
const condP   = (nExceed + 1) / (simKurts.length + 1);                          // :425
```

- `B` = `simKurts.length`, capped by `N_SIM = 1999` at `:167`. On this grid `B` ∈ {50, 1999}; **on
  every floored unit `B` = 1999.** (`B = 50` is the S159d pilot early-exit path, whose floor 1/51 ≈
  0.0196 cannot reach the threshold at all.)
- The p therefore takes values `k/2000`, k = 1…2000, floor `1/2000 = 0.0005`.
- The comparison is **strict**: `flagFromP` at `thresholds.js:38-41`, `ALPHA.FLAG = 0.001` at `:23`.
  `2/2000 = 0.001` is **not** `< 0.001`.
- So `rawP < 0.001` is satisfiable **only at `1/2000`**. Measured: the set of distinct `rawP` among
  the 30 floored units is `{0.0005}` — a single value.
- That event's null probability is `1/2000` = **0.05%**.

**Observed 30/478 = 6.28%. Against 0.05% that is 126-fold**; against the 0.1% S363 assumed, 63-fold.
**The dispatch's first bullet is the correct one, and its stated-in-advance correction to the S363
close holds: the multiplier moves by a factor of two and the rate does not dissolve.** The earlier
draft's prediction — that the lattice would turn the finding into an arithmetic consequence — is
falsified here as the dispatch already anticipated: 1/2000 is a genuine tail event on either formula.

Two supporting readings:

- **The MODERATE band's 0.9% was right.** `0.001 ≤ rawP < 0.01` covers k = 2…19, i.e. 18/2000 = 0.9%
  exactly. Observed **45/478 = 9.41%, 10.5-fold.**
- **The strictness does not rescue anything either way.** Eight further units sit at exactly `2/2000`.
  Read non-strictly, k ∈ {1,2} against a nominal 2/2000 = 0.1% gives 38/478 = 7.95%, **80-fold.** Every
  reading of the comparison lands between 63× and 126×.

### 2.3 The distribution of `rawP` across all 478 units

| `rawP` band | count | share | uniform |
|---|---:|---:|---:|
| exactly `1/2000` (the floor) | **30** | 6.3% | 0.05% |
| exactly `2/2000` | 8 | 1.7% | 0.05% |
| (0.001, 0.005] | 23 | 4.8% | 0.40% |
| (0.005, 0.01] | 16 | 3.3% | 0.50% |
| (0.01, 0.05] | 41 | 8.6% | 4.00% |
| (0.05, 0.1] | 52 | 10.9% | 5.00% |
| (0.1, 0.2] | 44 | 9.2% | 10.00% |
| (0.2, 0.3] | 47 | 9.8% | 10.00% |
| (0.3, 0.4] | 40 | 8.4% | 10.00% |
| (0.4, 0.5] | 23 | 4.8% | 10.00% |
| (0.5, 0.6] | 32 | 6.7% | 10.00% |
| (0.6, 0.7] | 25 | 5.2% | 10.00% |
| (0.7, 0.8] | 37 | 7.7% | 10.00% |
| (0.8, 0.9] | 26 | 5.4% | 10.00% |
| (0.9, 1] | 34 | 7.1% | 10.00% |

Deciles: 0.0005 · 0.0020 · 0.0310 · 0.0735 · 0.1373 · 0.2560 · 0.3725 · 0.5340 · 0.7059 · 0.8325 ·
0.9980. Mass below 0.5: **324/478 = 67.8%** against a uniform 50%.

**It is both.** There is a genuine spike on the floor — 30 units at one value, 126× its own
probability — *and* the whole distribution is shifted left: every band below 0.1 is over-represented,
every band above 0.1 under-represented, and the median sits at 0.256 rather than 0.5. **The tail is
not a separate population sitting on a well-calibrated body.** The statistic is mis-centred against
its null across the whole range, and the floor count is the visible end of that.

### 2.4 Does the transform reach this arm

**Routing: yes.** `engine.js:581` registers Excess Kurtosis through `runPairVST`; `runPairVST` passes
`testFn(vstMatrix, vstCtx)` at `engine.js:310`; `testKurtosis` builds the per-condition differences
from `matrix[r][c1]` at `kurtosis.js:411-418` — the same `matrix` argument the pooled arm reads at
`:109-122`. There is no separate input path for the per-condition arm. Confirmed numerically by
`--derive`: on `general` the shipped per-condition κ (−0.5511 / −0.4846) matches the re-derivation on
the **transformed** matrix and not the raw one (−0.4761 / −0.4180).

**But what `detectVST` returns splits this grid, and the dispatch's falsification condition is
half-met:**

| assay | `detectVST` | draws | units | floored | rate | vs 0.05% | median pooled κDev |
|---|---|---:|---:|---:|---:|---:|---:|
| `general` | `log` | 120 | 238 | 7 | 2.9% | **59×** | 0.1470 |
| `plate_reader` | `raw` | 120 | 240 | 23 | 9.6% | **192×** | 0.1670 |

On `plate_reader` the arm does read raw values — not because the routing skips the transform, but
because `detectVST` returns `raw` for that assay label, so `hasVST` is false (`engine.js:300`) and
`runPairVST` falls through to `runPair` at `engine.js:312`. Against a null simulated from Gaussian
draws (`kurtosis.js:269`, `:280`), that is **P118's shape reached by a different route**, and it
carries the larger share of the excess — 23 of the 30.

**It does not dissolve P120.** The `general` block *is* log-transformed and its per-condition arm
still floors at 2.9%, **59× nominal**, on data with nothing planted. The transform explains part of
the split *between* the two assays and none of the excess remaining *inside* the transformed one.

### Not asked, one line, because it sharpens what remains

S363 left the cause "worth its own measurement". The two sample sizes are readable at source and are
not equal: a null batch is built over **all** valid rows (`validRowIdxs`, `:176-179`, consumed at
`:265`/`:276`), the observed per-condition κ over **one condition's** rows (`:411-418`). At 240 rows ×
6 columns that is 3600 values in each null batch against 1800 in the observed. The null is built from
twice the data it is used to judge.

---

## Step 3 — the draw that returned no condition table

`general`, 6 replicates, r = 2.5, seed 6105, with a healthy null of 1999 batches. The mechanism
reproduces exactly. Only one condition array is available (`condCtx.rowConditionsCols` is null, so
`condArraysToTest` has length 1 at `:396-398`, and the merged-labels second pass at `:451` requires
length > 1 and does not run). Within that single array both conditions compute cleanly — 120 rows and
1800 differences each — with unrounded κDev of **−0.043450778252003386** (CondA) and
**−0.043496490361020990** (CondB). Both round to the string `"-0.0435"` at `:430`. The sort at `:438`
compares `parseFloat` of those strings, ties, and leaves insertion order; `spread` at `:447` is then
`parseFloat("-0.0435") − parseFloat("-0.0435") = 0`; `bestSpread` is initialised to `0` at `:443`; and
`0 > 0` is false at `:448`. `bestResults` stays null, `:459` is never entered, and `condKurtosis` is
returned as `null` with no diagnostic. **A tie is neither resolved nor skipped — it silently drops the
entire condition table**, and it does so on the four-decimal string rather than on the statistic: the
unrounded spread is 4.6 × 10⁻⁵, non-zero, and had the selector compared unrounded values the table
would have survived. This is P107's selector (`Class E`, a family chosen by a criterion that is not a
p-value and has no null) failing open rather than failing loud.

**Yes — that draw accounts for the 480-against-478 gap in step 2.1.** It is the only draw on the grid
returning no table, it costs two units rather than one, and 480 − 2 = 478.

---

## What this changes

- **P120's open gap closes.** 28 of 30 stop at `kurtosis.js:476-477`; 1 at the BH threshold; 1
  promotes and is capped at MODERATE. The 6.3% and the 1-in-240 measure different surfaces — the
  condition-card tier and the test flag — and both readings are correct.
- **P120's multiplier is 126×, not 63×.** The nominal is `1/2000` = 0.05%, because strict `< 0.001`
  against a `k/2000` lattice is satisfiable only at the floor. S363's MODERATE-band nominal of 0.9%
  needs no correction.
- **P120 is not fully explained by P118's shape.** The untransformed assay carries 23 of the 30, but
  the transformed one still runs at 59× nominal.
- **P119's disposition, which was waiting on this.** The 38% (92 of 240 honest files reading HIGH with
  `directionalSuppress` removed) is **entirely the pooled arm's**. The per-condition arm cannot reach
  HIGH at all — Class A2 caps it at MODERATE — and on honest data it reaches even MODERATE once in
  240. The two arms do not back each other up. What this session adds is that **the directional
  suppression P119 calls load-bearing exists twice**: `:380` on the pooled statistic at full
  precision, `:477` on the per-condition statistic off a four-decimal string. They are one design
  decision at two levels, and 28 of P120's thirty are the second level doing exactly what the first
  one does. Touching either without the other splits a rule that is currently consistent.
- **P107 gains a reproduction.** S363 named the tie as "the only reachable path, not a confirmed
  reproduction". It is now confirmed, with both unrounded κDev values.
