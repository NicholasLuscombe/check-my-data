# S358 — P101 gate lanes, read from the code

Read-only audit of the batch gate. No `src/` file was touched. No behaviour changed.

P101 says the gate checks a tier in one lane of three. This reads the lane rules out of
`test/validate-batch.mjs` and `test/batch-fixtures.mjs`, counts each lane, and answers per lane
what it would take for the gate to fail when a detection is lost.

The short version: the gate iterates its declarations in one lane and its output in the other two.
That single difference decides everything below.

---

## Part 1 — the lane rules

### 1. The accounting block

Cited at `validate-batch.mjs:158-174` in the dispatch. It now reads at **`validate-batch.mjs:151-177`** —
the comment at 151–157, the code at 158–177. Verbatim:

```js
    // S183 Phase 2 — completeness gate. The allow-set check above catches a
    // declared channel that goes quiet or fires the wrong tier; this gate
    // catches the other half — a MOD/HIGH firing that no cell or
    // ACKNOWLEDGED entry accounts for. On a positive fixture (severity ≥ 1)
    // every MOD/HIGH must be in expected.flags (tier-asserted) or
    // ACKNOWLEDGED[file] (named-and-reasoned). On a clean fixture
    // (severity === 0) any MOD/HIGH is a false positive.
    const ackForFile = ACKNOWLEDGED[file] || {};
    const firingNames = results
      .filter(r => r.flag === 'MODERATE' || r.flag === 'HIGH')
      .map(r => r.name);
    const completenessMisses = [];
    if (expected.severity === 0) {
      if (firingNames.length > 0) {
        completenessMisses.push(`clean fixture fired ${firingNames.join(', ')} — false positive`);
      }
    } else {
      const accountedNames = new Set([
        ...Object.keys(expected.flags || {}),
        ...Object.keys(ackForFile),
      ]);
      const undeclared = firingNames.filter(n => !accountedNames.has(n));
      if (undeclared.length > 0) {
        completenessMisses.push(`undeclared MOD/HIGH firing(s): ${undeclared.join(', ')} — declare a cell in expected.flags or add to ACKNOWLEDGED with a reason`);
      }
    }
    const completenessOk = completenessMisses.length === 0;
```

The declared-cell check sits just above it, at **`validate-batch.mjs:137-149`**:

```js
    const cellMisses = [];
    if (expected.flags) {
      const resultsByName = new Map(results.map(r => [r.name, r]));
      for (const [name, allow] of Object.entries(expected.flags)) {
        const r = resultsByName.get(name);
        if (!r) {
          cellMisses.push(`${name}: result not present (unresolved name binding?)`);
        } else if (!allow.includes(r.flag)) {
          cellMisses.push(`${name}: got ${r.flag}, expected ∈ [${allow.join(', ')}]`);
        }
      }
    }
    const cellsOk = cellMisses.length === 0;
```

The two combine at **`validate-batch.mjs:179`**:

```js
    const ok = severity === expected.severity && cellsOk && completenessOk;
```

### 2. The acknowledged structure

Cited at `batch-fixtures.mjs:286`. That line still lands, and it lands on the exact cell this
dispatch is about. `ACKNOWLEDGED` is declared at **`batch-fixtures.mjs:270`** and runs to **293**.

One `expected.flags` entry with an allow-set — `batch-fixtures.mjs:113-117`:

```js
  '15-missing-carlisle.csv':      { severity: 3, assay: 'general', flags: {
    'Missing Data Pattern':         ['HIGH'],                 // GT line 29, structural HIGH
    'Blocked Mahalanobis':          ['MODERATE', 'HIGH'],     // FISHER_EXEMPT → widened
    'Cross-Condition Consistency':  ['MODERATE', 'HIGH'],     // p≈9e-3; GT-named severity channel (S182), declared S183 Phase 2
```

One acknowledged entry with its prose reason — **`batch-fixtures.mjs:286`**:

```js
    'Column Goodness-of-Fit': "recur's normal-fit shape mismatch from the 5×10 recurrence; intrinsic to the recurrence carrier (S297)",
```

The value is a string. There is no tier in it, and nothing parses it.

### 3. The membership rule for each lane

Derived from the code, not from any document. A **cell** is one (fixture, test-name) pair.

**Declared.** The cell's test name is a key of `EXPECTED[file].flags`. The lane's check iterates
those keys (`:140`), looks each one up in the full result list (`:142`), and fails if the result's
flag is outside the allow-set (`:144`) or the name does not resolve at all (`:141-143`).

**Acknowledged.** The cell's test name is a key of `ACKNOWLEDGED[file]`. The lane contributes names
to `accountedNames` (`:170`) and nothing else. Its values are never read by the gate.

**Undeclared.** The cell is not in either map, and its test currently reports MODERATE or HIGH. It
is a residual, computed at `:172` as `firingNames.filter(n => !accountedNames.has(n))`. The lane
has no map. A cell enters it by firing and leaves it by going quiet.

**The load-bearing difference is the direction of iteration.** The declared lane walks the
declaration and asks the output about each entry. The other two lanes walk the output
(`:159-161`) and ask the maps about each firing. A cell that stops firing is still in the
declaration; it is not in the output.

**Can one pair fall in two lanes at once?** Declared and acknowledged can, in principle — nothing in
either file guards against a name appearing in both, and `accountedNames` is a `Set`, so a duplicate
would simply dedup while the declared loop still asserted its tier. Measured across all 27 fixtures:
**zero** such overlaps. Undeclared cannot overlap either, by construction — it is the complement of
their union.

A fourth structure, `SUSPENDED` (`batch-fixtures.mjs:244-261`), overlaps the declared lane **by
design**: both its cells are also declared, asserting `['N/A']`. Measured — zero suspended names
that are not also declared. `SUSPENDED` is an annexe to a declared cell, not a lane.

### 4. Cell counts

Counted by loading `test/batch-fixtures.mjs` and summing key counts per fixture. A cell is one
(fixture, test-name) pair.

| lane | cells | fixtures | how counted |
|---|---|---|---|
| Declared | **53** | 20 | `Σ Object.keys(EXPECTED[f].flags ?? {}).length` |
| Acknowledged | **8** | 4 | `Σ Object.keys(ACKNOWLEDGED[f]).length` |
| Undeclared | **1 at offset 0** | 1 | read off the live run — it has no map to count |
| (Suspended) | 2 | 2 | `Σ Object.keys(SUSPENDED[f]).length` — annexe, not a lane |

The suite is **27 fixtures** (`Object.keys(EXPECTED).length`), not the 22 or 17 the file headers
still say. `FIXTURES` lists 24; the three `vfs-*` regression files are in `EXPECTED` only. The
runner reports 28 checks: 27 fixtures plus the DS01 cross-shape check at `:293-362`, which is not
folded into any fixture count here. No fixture carries `pending: true`, so nothing sits on the
pending lane.

The battery is **29 tests** (`engine.js:410-688`), so the full cell space is 27 × 29 = **783** — the
denominator S357 used. The three lanes cover **62** of those 783 at offset 0.

Allow-set widths across the 53 declared cells: 31 single-tier, 22 two-tier. 12 declare no flagging
tier at all — they assert the test stays quiet (8 × `['LOW']`, 2 × `['N/A']`, 2 × `['LOW','N/A']`).

---

## Part 2 — where the three unstable cells sit

Derived by reading the maps, not the S357 summary.

| cell | in `expected.flags`? | in `ACKNOWLEDGED`? | lane |
|---|---|---|---|
| DS12b / Regional Noise Homogeneity | no | no | **Undeclared** |
| DS15 / Cross-Condition Consistency | yes — `['MODERATE','HIGH']` | no | **Declared** |
| DS23 / Column Goodness-of-Fit | no | yes — line 286 | **Acknowledged** |

One per lane.

---

## Part 3 — what each lane would need

For each lane: (a) a declared or expected flag drops a tier but still fires; (b) it stops firing
entirely; (c) a flag appears that was not expected.

### Declared lane

| | fails? | the line that decides it |
|---|---|---|
| (a) tier drop, still firing | **depends on the allow-set** | `:144` `else if (!allow.includes(r.flag))` |
| (b) stops firing entirely | **yes** | `:140` iterates the declaration; `:144` fails it |
| (c) unexpected flag appears | **yes** | `:172` (or `:144` if the name is a declared quiet cell) |

(a) is not one answer. A cell declared `['HIGH']` fails on a drop to MODERATE. A cell declared
`['MODERATE','HIGH']` does not. 22 of the 53 declared cells carry the two-tier form and absorb a
tier drop silently.

### 6. (b) for the declared lane, read at the loop

**It fails. The allow-set is not what catches it — the direction of iteration is.**

`:140` iterates `Object.entries(expected.flags)`, so the comparison is reached once per *declared
cell*, whether or not that test fired. `:142` looks the name up in `resultsByName`, which is built
at `:139` from the **whole** result list — `runFullAnalysis` pushes one entry per test at
`engine.js:698`, including every skip and every N/A, so a quiet test is present with flag `LOW` or
`N/A`, not absent. `:144` then finds `LOW ∉ ['MODERATE','HIGH']` and pushes a miss.

The absent-name case is handled separately and also fails, at `:141-143`. So both paths a lost
detection could take end in a miss. There is no silent mode in this lane.

That answer is read off the loop, not inferred from the allow-set's existence. Two things in the
file could have led the other way, and one of them is wrong:

- The comment at `:135-136` says *"A non-resolving key (typo or producer rename) silently never
  asserts; the bind-at-source name binding above guards against that."* The first clause is false of
  the code as it stands — `:141-143` pushes an explicit miss — and there is no bind-at-source name
  binding above it; the import at `:53` is a plain destructure. A reader trusting this comment would
  conclude the declared lane has the silent mode it does not have.
- The comment at `:151-152` says the allow-set check *"catches a declared channel that goes quiet or
  fires the wrong tier."* That one matches the code.

### Acknowledged lane

| | fails? | the line that decides it |
|---|---|---|
| (a) tier drop, still firing | **no** | `:160` admits MODERATE and HIGH alike; `:172` finds the name accounted |
| (b) stops firing entirely | **no** | `:159-161` — the name leaves `firingNames` and nothing else reads `ACKNOWLEDGED` |
| (c) unexpected flag appears | **yes** | `:172` |

The lane's values are prose (`batch-fixtures.mjs:286`). There is nothing to compare a tier against,
so (a) could not be checked even if the loop reached it.

### Undeclared lane

| | fails? | the line that decides it |
|---|---|---|
| (a) tier drop, still firing | **yes** — but it was already failing | `:160` admits both tiers; `:172` still finds it unaccounted |
| (b) stops firing entirely | **no** | `:159-161` — it leaves `firingNames`, `undeclared` goes empty, the run turns green |
| (c) unexpected flag appears | **yes** | `:172` |

This lane is inverted. Failing is its normal state and passing is the loss. DS12b is exactly this:
at offset 0 the batch fails on Regional Noise firing; at the offsets where the detection is lost the
batch is fully green.

### A partial backstop that cuts across all three

`:179` also asserts `severity === expected.severity`. That can catch a lost detection when the loss
moves the fixture's tier — DS15 does move (S356 records severity 3 → 2 on one offset), so that cell
is caught twice. DS12b does not: its severity 1 is carried by LOESS, so Regional Noise can go quiet
with the number unchanged. The severity check is real coverage, but it is coverage of the fixture,
not of the cell.

### 7. What each lane would need to answer yes to both (a) and (b)

**Declared — data only.** (b) already holds. For (a) the lane needs a narrower assertion than the
two-tier allow-set: an expected tier per cell, plus an explicit marker on the cells where a range is
permitted *because instability was measured* rather than because widening was convenient. No
structural change. The 22 widened cells are the work.

**Acknowledged — data and structure.** Data: a tier or tier range per cell, which the prose values
cannot carry. Structure: a second loop that iterates the acknowledged names the way `:140` iterates
the declared ones. Without that loop, adding tiers to the map changes nothing, because the lane
never enumerates a cell that is not firing.

**Undeclared — data, structure, and it stops being this lane.** There is no map, so a cell only
exists once it fires. Answering (b) means asserting that a named cell is *still* firing, which means
naming it in advance, which means giving it a map entry and the declaration-iterating loop. A lane
that can do both is the declared lane. So the undeclared lane is not fixable in place. The fix is to
empty it — every cell that fires gets moved into a named lane, and the residual at `:172` stays only
as the catch-all that flags anything nobody has named yet.

### 8. What the gate checks on the eight clean fixtures

The eight are DS01, DS03, DS05, DS07, DS09, DS12a, DS17 and `vfs-a-pigeonhole-clear.csv`.

Beyond severity 0 the gate checks **one further thing on seven of them, and two on one**:

1. `severity === expected.severity` at `:179` — for these fixtures, that *is* the severity-0 check.
2. `firingNames.length > 0` at `:163-166` — no test may report MODERATE or HIGH. This is a separate
   assertion from the severity number, not a restatement of it.
3. On `vfs-a-pigeonhole-clear.csv` only, one declared cell: `'Value-Frequency Spike': ['LOW','N/A']`.
   It is the sole clean fixture carrying `flags`.

Nothing else. No LOW or N/A cell is asserted on the other seven, no p-value is checked, no count of
tests that ran is checked. A clean fixture where half the battery silently returned N/A would keep
severity 0, keep `firingNames` empty, and pass. The clean lane cannot tell "the battery ran and
cleared" from "the battery did not run."

---

## Part 4 — could the three maps be one map?

**Nothing structural stops it.** This is a feasibility read of the data model. No design follows.

What was checked:

- **Key spaces do not collide.** Measured across all 27 fixtures: zero names shared between
  `EXPECTED[f].flags` and `ACKNOWLEDGED[f]`. So a merge is a union, not a reconciliation.
- **The three value shapes are subsumable.** Declared is an array of tier strings; acknowledged is a
  string; suspended is already an object with four fields (`was`, `decision`, `reason`,
  `severityCost`). One object-valued shape holds all three. `SUSPENDED` is the existence proof — it
  is a per-cell record with several fields, sitting in the same per-file-per-name key space, and it
  works today.
- **Adding a "measured unstable" marker is additive.** Nothing consumes such a field now. The one
  place that would naturally read it, `:442`, already computes a declared/undeclared distinction by
  hand (`EXPECTED[f].flags && name in EXPECTED[f].flags`) for a label in the multi-seed report.
- **The undeclared lane has no map to merge.** It is the residual at `:172`. A merged map can hold a
  disposition for every cell someone names; the residual still has to exist as the catch-all for
  cells nobody has named.

Two consumers would have to move, and neither is a structural bar:

- `validate-batch.mjs` reads `expected.flags` at `:138`, `:140`, `:169`, `:442`, `:452` and
  `ACKNOWLEDGED` at `:158`, `:170`.
- `scripts/build-test-display-map.mjs:46` imports `EXPECTED`, `FIXTURES` and `ASSAY_DATATYPE_MAP`
  only. It reads `EXPECTED[file]?.flags?.[name]` at `:115` and — this is worth recording — **it does
  not import `ACKNOWLEDGED` at all.** At `:115-120` it marks a live fire as `(ack)` whenever no
  declared allow-set exists for it. So the generated lookup table already conflates the acknowledged
  and undeclared lanes: DS12b's Regional Noise and DS23's Column GoF would both render `(ack)`,
  though only one of them has ever been adjudicated. Its prose at `:220` still tells the reader the
  acknowledged fires come from the `ACKNOWLEDGED` side-map. They do not.

That second point cuts toward the merge rather than against it: one map with a per-cell disposition
would remove the need for a consumer to infer a lane from an absence.

---

## Part 5 — the seed mechanism and its cost

### 10. How the runner takes an offset

- **Environment variable:** `SEEDS`, read at `validate-batch.mjs:31` as
  `Math.max(1, Number(process.env.SEEDS) || 1)`. `MULTI` is `SEEDS > 1` at `:32`.
- **Invocation:** `SEEDS=8 node test/validate-batch.mjs`. Optional sidecar via
  `SEEDS_JSON=<path>` (`:450-466`).
- **Where the offset enters:**
  1. `:34-38` — under `MULTI`, imports `./seed-inject.mjs` and calls `registerSeedHook()`. This
     must happen before the first import of `engine.js` at `:42`, because that import graph pulls in
     `src/stats/prng.js`.
  2. `seed-inject.mjs:36-55` — a `node:module` load hook rewrites `src/stats/prng.js` in memory as
     it loads, replacing `let _state = seed | 0;` with
     `let _state = (seed ^ Math.imul((globalThis.__S340_SEED | 0), 0x9E3779B1)) | 0;`
     (`seed-inject.mjs:26-29`). Nothing on disk changes. The hook throws if the anchor line has
     moved, so a sweep cannot silently run eight identical offsets.
  3. `:67` — `SEED_LIST = Array.from({ length: SEEDS }, (_, i) => i)`, so `SEEDS=8` sweeps offsets
     **0 through 7**.
  4. `:69-71` — the whole fixture loop is wrapped in `for (const SEED of SEED_LIST)`, and `:71`
     calls `setSeed(SEED)`, which sets `globalThis.__S340_SEED` (`seed-inject.mjs:58-60`).
  5. `:213` — `if (!PRIMARY) continue;` keeps the per-fixture console output, the pass/fail tally
     and PERF on offset 0 only.
  6. `:267` — `setSeed(0)` before the DS01 cross-shape check, which runs once and is not part of the
     sweep.

Offset 0 XORs nothing, so it is the shipped stream byte for byte (`seed-inject.mjs:13-14`). These
are **offsets, not independent seeds**: offset 0 is the real derived stream and the other seven are
counterfactuals against it.

### 11. Wall-clock cost

Measured here, one offset, this machine:

```
27/28 passed — 1 FAILED
real 47.43
user 46.30
sys  0.34
```

That 47.4 s covers Node startup, the 27-fixture loop, and the once-only DS01 cross-shape check.

An eight-offset run repeats **only** the fixture loop eight times — the cross-shape block sits
outside the seed loop at `:293-362`, and the multi-seed report at `:373-476` is print-only.
Taking the fixture loop at roughly 45 s of the 47.4:

**8 × 45 s + ~3 s ≈ 363 s ≈ 6.1 minutes.**

Call it about six minutes. Eight offsets were not run for this dispatch.

---

## Stated expectations

**E1 — the three unstable cells sit one per lane, DS15 declared / DS12b undeclared / DS23
acknowledged. HELD.** Derived from the maps in `batch-fixtures.mjs`, independently of the S357
summary. Table in Part 2.

**E2 — declared lane 53 cells; acknowledged lane 8 cells across 4 fixtures; undeclared is whatever
else fires at MODERATE or HIGH. HELD, all three parts.** 53 declared cells across 20 fixtures; 8
acknowledged cells across DS06, DS08, DS23 and DS24; the undeclared lane is exactly the residual at
`:172` and holds one cell at offset 0.

**E3 — the declared lane fails both on a tier drop and on a flag disappearing. HELD on the
disappearance, PARTIAL on the tier drop.**

This was the expectation you were least sure of, and the uncertainty was warranted in one direction
but not the one feared. A flag disappearing **does** fail, and the reason is structural rather than
incidental: `:140` iterates the declaration, so the comparison is reached for a cell that did not
fire. The declared lane carries no silent mode.

The tier drop is the softer half. `:144` tests membership in the allow-set, and 22 of the 53
declared cells are widened to `['MODERATE','HIGH']`, which absorbs a HIGH → MODERATE drop without a
word. So the declared lane fails on a *loss* and is selectively blind to a *weakening*.

The consequence for P101's row: **all three lanes do not carry a silent mode.** Two do — acknowledged
and undeclared. The declared lane's gap is narrower and different in kind. P101's row does not
understate the problem in the way E3 feared; it states it correctly if it names the lanes.

**E4 — nothing structural stops the three maps becoming one; the shapes are accumulated history.
HELD.** Key spaces are disjoint (measured, zero collisions), the value shapes are subsumable by the
object shape `SUSPENDED` already uses, and an unstable marker is additive. The obstacles are two
consumer updates. Part 4 also found that one of those consumers,
`scripts/build-test-display-map.mjs`, already infers the acknowledged lane from an absence rather
than reading the map — which is the accumulated-history shape showing up a second time.

**E5 — if every lane asserted a tier, exactly three cells would fail somewhere across the eight
offsets. COULD NOT BE SETTLED AS STATED. It holds under one reading and inverts under the other,
and the expectation does not say which.**

The reasoning is sound as far as it goes: S357 measured 3 non-constant cells of 783, and 783 is the
whole battery (27 × 29 — confirmed here from `engine.js:410-688`), so a cell that never moves cannot
fail an assertion pinned to what it does at offset 0.

What the expectation leaves open is the **width** of the assertion:

- **If every cell asserted its single observed tier**, exactly the three unstable cells would fail
  somewhere. E5 holds.
- **If cells were asserted in the repo's actual widened style**, they would not. DS23's Column GoF
  moves HIGH ↔ MODERATE; an allow-set of `['MODERATE','HIGH']` never fails on it. DS15's CCC is
  already declared that way and fails only because its move reaches LOW. So the count would be one
  or two, not three.

A second gap: "every lane asserted a tier" is not "every cell asserted a tier". The three lanes
cover 62 cells of 783 at offset 0. All three unstable cells happen to fall inside that 62, so the
distinction does not change the count here — but it is the reason the figure is 3 of 783 and not 3
of 62, and the two denominators are not interchangeable.

---

## Defects found, not fixed

Read-only dispatch. All recorded, none touched.

1. **`validate-batch.mjs:135-136` — stale comment asserting a silent mode the code does not have.**
   It says a non-resolving key "silently never asserts", and credits a "bind-at-source name binding
   above" that is not there. `:141-143` pushes an explicit miss. The comment at `:151-152` describes
   the same code correctly. A reader trusting the first comment would conclude the declared lane is
   blind to a lost detection; it is not.
2. **`scripts/build-test-display-map.mjs` never imports `ACKNOWLEDGED`.** `:46` imports `EXPECTED`,
   `FIXTURES`, `ASSAY_DATATYPE_MAP` only, and `:115-120` marks a fire `(ack)` from the absence of a
   declared allow-set. The generated lookup table therefore cannot distinguish an adjudicated
   acknowledgement from an unaccounted firing. Its own prose at `:220` says the acknowledged fires
   come from the `ACKNOWLEDGED` side-map.
3. **Three stale fixture counts.** `validate-batch.mjs:1` says "all 17 CSV datasets";
   `validate-batch.mjs:507` prints "Per-test totals across 22 fixtures";
   `batch-fixtures.mjs:1` says "the 22-fixture suite"; `build-test-display-map.mjs:144` says
   "the shared 22-fixture set". The suite is 27.

---

## Verification

**Read, with the line ranges read at:**

- `test/validate-batch.mjs` — whole file, 542 lines. Declared-cell check `:137-149`; completeness
  gate `:151-177`; combined verdict `:179`; multi-seed collector `:182-209`; seed plumbing `:31-38`,
  `:67`, `:69-71`, `:213`, `:267`; DS01 cross-shape check `:293-362`; multi-seed report `:373-476`.
- `test/batch-fixtures.mjs` — whole file, 293 lines. `FIXTURES` `:22-47`; `EXPECTED` `:53-226`;
  `SUSPENDED` `:244-261`; `ACKNOWLEDGED` `:270-293`, with the cited line 286 confirmed as the DS23
  Column Goodness-of-Fit entry.
- `test/seed-inject.mjs` — whole file, 60 lines. Rewrite constants `:26-29`; hook `:36-55`;
  `setSeed` `:58-60`.
- `src/analysis/engine.js` — `tests` array `:410-688` (29 entries, counted by bracket depth); result
  push loop `:690-711`, where `:698` pushes one entry per test unconditionally and `:701-707`
  pushes an `ERROR` entry on throw.
- `scripts/build-test-display-map.mjs` — imports `:46`; `firesCell` `:95-125`; prose `:144`, `:220`.
- `CLAUDE.md` — whole file, read first as the dispatch requires.

**Counted, and how:**

- Lane cell counts, fixture counts, allow-set widths, key-space collisions and the clean-fixture set
  were all computed by importing `test/batch-fixtures.mjs` in a throwaway script and summing
  `Object.keys(...)` per fixture — not read by eye. A cell is one (fixture, test-name) pair.
  Declared 53 / 20 fixtures; acknowledged 8 / 4; suspended 2 / 2; collisions 0; clean fixtures 8, of
  which 1 carries a declared cell.
- Battery size 29 counted from `engine.js` by scanning bracket depth across the `tests` array, not
  from the "29 tests" figure in `CLAUDE.md`. 27 × 29 = 783 reconciles with the denominator S357
  reported.
- The undeclared lane has no map, so its count of 1 was read off the live run, not from source.

**Run:**

- `node test/validate-batch.mjs` at seed offset 0, once. Result `27/28 passed — 1 FAILED`, the
  failure being DS12b's undeclared Regional Noise Homogeneity MODERATE. Wall clock `real 47.43`.
  No eight-offset run, per the dispatch.

**Not done:** no `src/` edit, no `CLAUDE.md` edit, no `STATUS.md` edit, no batch gate as a
regression check, no preview, no screenshots, no promote, no worktree.
