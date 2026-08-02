# S343 — Which seed does `09-proteomics-clean` derive?

Read-only session. Nothing under `src/` changed.

---

## The short answer, first

**The derived seed lands clean.** `09-proteomics-clean` returns severity 0 — "All checks passed",
"Proceed with dataset" — in the shipped tool today. So do the other seven clean fixtures at their own
derived seeds. There is no live false positive.

**But the eight-seed sweep was never eight seeds.** The sweep injects an XOR offset into the PRNG's
starting state, and offset 0 is the identity. So sweep seed 0 *is* the derived seed, and sweep seeds
1–7 are seven counterfactual streams the file cannot produce. "Three of eight" was really "the real
draw came back clean, and three of seven made-up ones did not".

**The instability is one test, and it is one permutation.** Across 300 offsets, 51 came back non-clean
— 17.0%, every single one driven by Cross-Condition Consistency at MODERATE and nothing else, and
none ever reaching severity 2. CCC's adjusted p on this file can only take the values 0.006 or 0.012:
a permutation null of 499 draws, BH-FDR at m = 3, so the grid is 3/500 apart. The
MODERATE boundary is 0.01 — it falls in the gap. **The verdict turns on whether one permutation out
of 499 exceeds the observed statistic.**

**And the file next door already fails.** Change one of the 2400 cells by one unit in its own last
decimal place — 0.01 on a proteomics intensity — and re-run. **Six of sixty such neighbours come back
as "Minor anomalies detected".** Those are files a user could really have. Seven of the eight clean
fixtures show none of this; `09` is the outlier, not the pattern.

---

## 0. State read

Run from the main checkout at session open:

```
$ git log -1 --oneline
280508d Merge claude/band-counterfactual-s342: S342: band counterfactual, the 34 non-running cells, and the split test

$ git worktree list
/Users/hedgehog/Projects/check-my-data                                                      280508d [main]
/Users/hedgehog/projects/check-my-data/.claude/worktrees/proteomics-seed-derivation-32ee6c  280508d [claude/proteomics-seed-derivation-32ee6c]

$ git status --short
 M docs/shared/V1X-FUTURE-WORK.md
```

**Two contradictions to the expected state.** Main is *not* clean — `docs/shared/V1X-FUTURE-WORK.md`
carries an uncommitted modification, 44 insertions and 11 deletions. That is a Chat-owned tracked doc,
so this session left it alone. It does not block the promote: `promote.sh` runs its `git add -A`
inside the worktree, and this session touches no file that the pending edit touches, so the merge does
not collide. It is flagged because it is live uncommitted Chat work sitting in main, not because it is
in the way. And a worktree *does* exist: this session's own, created by the SessionStart hook before
the state read could run. The tip commit is `280508d` on both, so S342 did close at `280508d` as
recorded.

Worktree guard before the first write: `pwd` =
`/Users/hedgehog/Projects/check-my-data/.claude/worktrees/proteomics-seed-derivation-32ee6c`,
`git branch --show-current` = `claude/proteomics-seed-derivation-32ee6c`. Both correct. The first
write landed in the worktree and not in main (checked by absence in the main checkout).

---

## 1. How the seed is actually derived

### 1.1 The derivation

`src/stats/prng.js:34` — `hashMatrix64(matrix)`.

It walks the **parsed numeric matrix**, row-major, and hashes **every non-null value** as its raw
eight IEEE-754 bytes, through two independent FNV-1a lanes:

```
prng.js:40-52    for each row, for each column, skip null,
                 write the number into a Float64Array, read back two int32s,
                 fold each into lane h1 (prime 0x01000193) and lane h2 (prime 0x27220a95)
prng.js:53       return { h1, h2 }   — two signed 32-bit integers
```

What it does **not** read: file bytes, the CSV text, column names, row labels, condition labels,
dimensions, delimiters, line endings, or the number of decimal places a value was written with. The
matrix it hashes is the *data-role columns only* — `extractAnalysisInputs` (`engine.js:112-125`)
selects `roles[i] === "data"`, coerces each cell with `Number()`, and drops rows that are entirely
null. `runFullAnalysis` then sanitises non-finite values to null (`engine.js:19-53`) and hashes the
sanitised result at `engine.js:201`.

The range is the full signed 32-bit integer range, twice over. It is a hash, not an index into
anything.

### 1.2 The two layers

**Matrix layer.** `createPRNGFactory(matrix)` (`prng.js:149-165`) calls `hashMatrix64` once and keeps
`{h1, h2}`.

**Per-test layer.** `rngFor(testId)` (`prng.js:152-164`) derives that test's own starting state:

```
prng.js:156    t = hashString(testId)              FNV-1a over the dispatch-map key
prng.js:159    s = h1 ^ imul(t, 0x9e3779b1)
prng.js:160    s = s ^ imul(h2 ^ (t >>> 15), 0x85ebca6b)
prng.js:161    createPRNGFromSeed(fmix32(s))       Murmur3 finaliser, then Mulberry32
```

Instances are memoised per identifier, so a test invoked once per condition keeps one advancing
stream.

There is also a legacy single-stream entry point, `createPRNG(matrix)` (`prng.js:82-84`), which folds
the two lanes with `fmix32(h1 ^ h2)`. **The engine does not use it** — only diagnostic probes do. So
there is no single "the file's seed" in the running engine; there is a 64-bit pair and one derived
seed per dispatch key.

### 1.3 The derived values for `09-proteomics-clean`

Matrix: 400 rows × 6 data columns (file columns 2–7, `Rep1`…`Rep6`), 2400 non-null values.

| quantity | value |
|---|---|
| lane `h1` | `466889170` (`0x1bd429d2`) |
| lane `h2` | `2035083564` (`0x794ce92c`) |
| `createPRNG` fold (legacy path only) | `2117236674` (`0x7e3277c2`) |

Per-test derived seeds, the 17 dispatch keys that call `rngFor`:

| dispatch key | derived seed |
|---|---|
| `Benford's Law` | `-772654321` |
| `Benford's Law (2nd Digit)` | `-2022601925` |
| `Inter-Replicate Correlation` | `-572069625` |
| `Constant-Offset Blocks` | `710465694` |
| `Residual Spike Correlation` | `535523395` |
| `Cross-Condition Consistency` | `-1095941312` |
| `Blocked Mahalanobis` | `-73755241` |
| `Kurtosis` | `-1926228464` |
| `Entropy / Zipf Analysis` | `2007951999` |
| `Column Goodness-of-Fit` | `-1558496732` |
| `Modality Test` | `774396138` |
| `Windowed Autocorrelation` | `-19072195` |
| `Runs Test` | `1066697130` |
| `Within-Row Variance` | `468928437` |
| `LOESS Residual Analysis` | `-1978470277` |
| `Row-Mean Runs` | `1917918673` |
| `Regional Noise Homogeneity` | `1945833211` |

None is in 0–7. None is anywhere near 0–7. **Chat's expectation 1 holds on the numbers** — but see
§1.5, because the reason it holds is not the reason the expectation assumed.

The matrix-level lanes for all eight clean fixtures are in `test/probes/probe-s343-seed-derive.mjs`
output. Every one of these values was checked against the live module: the probe re-implements the
three private functions and then asserts that `createPRNG(matrix).random()` and
`createPRNGFactory(matrix)(key).random()` equal one Mulberry32 step from the recomputed seed, for
every fixture and every key. All checks passed.

### 1.4 Every entry point — the browser and the batch agree

`runFullAnalysis` is reached from three places: `App.jsx:53` (the browser, single file),
`BatchView.jsx:199` (the browser, batch mode), and `validate-batch.mjs:123` (the harness). All three
call `extractAnalysisInputs` first and all three hand the result straight to `runFullAnalysis`, so
the derivation code is literally one call site — `engine.js:201`. The only way they could differ is
by handing `extractAnalysisInputs` different `data` / `roles` / `condPerCol` / `zeroAsMissing`.

They reach it by different routes. The batch does `Papa.parse(csv, {skipEmptyLines: true})` →
`preprocessRaw` → `detectHeaderRows` → `slice` → `inferRoles`. The browser does
`Papa.parse(text.trim(), {skipEmptyLines: false})` (`ImportView.jsx:227`) → `preprocessRaw` (`:238`)
→ `detectBlocks` (`:241`) → `detectHeaderRows` (`:245`) → `applyHeaders` (`:151`, which pads short
rows to the widest, drops all-blank rows, and builds `condPerCol` from row 0) → `inferRoles` (`:189`).

`test/probes/probe-s343-entrypoint-parity.mjs` replays the browser chain headless against the real
modules and compares the resulting stream to the batch chain's, fixture by fixture:

> **27 of 27 CSV fixtures: same matrix shape, same seed.** Including all eight clean ones.

**So the batch has been testing the seed a user gets.** Chat's expectation 4 holds.

Two caveats that are real but do not apply to the clean corpus:

- **Long-format files diverge if the user pivots.** `19-inheritance-fabricated.csv` trips
  `detectLongFormat` in the browser and opens the pivot modal (`ImportView.jsx:255-259`). Accepting
  the pivot rebuilds the matrix from a different shape, which moves the seed. The batch never pivots.
  No clean fixture is long-format.
- **Multi-block files mount block 1 only.** `detectBlocks` returning more than one block sends the
  browser down `loadBlock` (`ImportView.jsx:242`), which trims and re-detects headers on the first
  block alone. No fixture in the corpus has more than one block.

Anything the user changes on the import screen that alters which columns carry the `data` role, or
the zero-as-missing toggle, moves the matrix and therefore the seed. That is a user action, not a
divergence between entry points.

### 1.5 How the S342 sweep injected its eight seeds — and why "three in eight" is not what it reads as

`test/seed-inject.mjs` (used by `validate-batch.mjs` under `SEEDS=N`) rewrites one line of
`prng.js` at module-load time:

```
seed-inject.mjs:27   FROM   let _state = seed | 0;
seed-inject.mjs:28   TO     let _state = (seed ^ Math.imul((globalThis.__S340_SEED | 0), 0x9E3779B1)) | 0;
```

That line is inside `createPRNGFromSeed` (`prng.js:89`) — the single private constructor every
instance passes through. So the injected value is **an XOR offset applied on top of the derived
seed**, uniformly across all 17 per-test streams, at exactly the layer the derivation ends.

The consequence, spelled out because it inverts the framing of the question:

- **Offset 0 XORs nothing.** Sweep seed 0 reproduces the shipped stream byte for byte — the hook's own
  header says so (`seed-inject.mjs:13-14`), and `test/probes/probe-s340-seedcheck.mjs` verifies it.
- **Sweep seed 0 IS the derived seed.** Not a ninth draw, not a neighbouring value: the same one.
- **Sweep seeds 1–7 are counterfactuals.** They are streams `09-proteomics-clean` cannot produce,
  because its data determines its stream.

So the override entered at the same layer the derivation ends, which means the eight-seed figures and
the derived-seed figure *are* measuring the same thing — the eight-seed run just already contained the
answer at index 0. "Three of eight" decomposes as: one real draw, clean; seven counterfactuals, three
of which flag.

Reproduced this session, offsets 0–7 on `09-proteomics-clean`:

```
non-clean 3/8   severity counts  0:5  1:3  2:0  3:0
flagging offsets: 3, 6, 7 — all severity 1, all Cross-Condition Consistency [MODERATE]
```

Exactly S342's number, and the derived run is one of the five clean ones.

### 1.6 What moves the derived value without changing the data

Measured on `09-proteomics-clean` (`probe-s343-seed-derive.mjs`, sensitivity block). "SAME" means the
seed is byte-identical to the baseline `2117236674`.

| change | seed |
|---|---|
| trailing newline added or removed | **SAME** |
| CRLF instead of LF | **SAME** |
| delimiter changed (comma → semicolon) | **SAME** |
| `1.234` rewritten as `1.2340` (same double) | **SAME** |
| a column renamed, a label column edited | **SAME** (not hashed at all) |
| the VST decision changed | **SAME** (hash runs at `engine.js:201`, `vstMatrix` is built at `:281`) |
| one value nudged by one ULP | MOVED |
| two rows swapped | MOVED |
| two data columns swapped | MOVED |
| one data column dropped (or unticked in the importer) | MOVED |
| one row dropped | MOVED |
| one cell blanked to empty | MOVED |
| transposed / pivoted | MOVED |

Read as a rule: **the hash is a fingerprint of the numbers and their order, and of nothing else.** It
is insensitive to every formatting and encoding change that does not alter a parsed double, and
sensitive to every change that does — including changes far below the precision the values were
recorded at.

---

## 2. What the tool produces at the derived seed

All eight clean fixtures, unhooked runs — what the deployed application shows a user who uploads the
file:

| fixture | severity | band | outcome |
|---|---|---|---|
| `01-densitometry-clean.csv` | 0 | All checks passed | 1/4 Proceed |
| `03-qpcr-clean.csv` | 0 | All checks passed | 1/4 Proceed |
| `05-cellcount-clean.csv` | 0 | All checks passed | 1/4 Proceed |
| `07-elisa-clean.csv` | 0 | All checks passed | 1/4 Proceed |
| **`09-proteomics-clean.csv`** | **0** | **All checks passed** | **1/4 Proceed** |
| `12a-uniform-mixture-clean.csv` | 0 | All checks passed | 1/4 Proceed |
| `17-densitometry-carlisle-clean.csv` | 0 | All checks passed | 1/4 Proceed |
| `vfs-a-pigeonhole-clear.csv` | 0 | All checks passed | 1/4 Proceed |

Zero HIGH, zero MODERATE, on every one. **No clean fixture is reported as carrying minor flags in the
shipped tool today.**

**Case B holds.** The derived seed lands clean, and the finding is that the file sits close enough to
a verdict boundary that a counterfactual draw — or, as §3.3 shows, a real neighbouring file — lands on
the other side.

### 2.1 How close 09 actually sits

The three smallest p-values it reports:

| test | p | tier | why it is not a flag |
|---|---|---|---|
| Benford's Law (First Digit) | 2.0e-4 | LOW | below `ALPHA.FLAG` = 0.001, held down by the MAD effect-size gate (the S341/S342 finding) |
| Blocked Mahalanobis | 1.04e-2 | LOW | not a near-miss — this is the LOW-path early-exit sentinel (`blockedMahalanobis.js:544-573`), the value the test stops at once no future permutation can pull it under `ALPHA.NOTE`. The same 1.04e-2 appears on 07, 12a and 17. |
| **Cross-Condition Consistency** | **1.2e-2** | LOW | a genuine near-miss: `ALPHA.NOTE` is 1.0e-2 |

Only the third is real proximity, and it is the one that moves.

---

## 3. The sweep

Eight draws cannot size this, and the dispatch is right that three of eight is a point estimate with a
wide interval. **300 offsets ran**, 926 seconds. Offset 0 is the derived stream; offsets 1–299 are
counterfactuals.

### 3.1 `09-proteomics-clean` over 300 offsets

```
non-clean 51/300 = 17.0%    severity counts  0:249  1:51  2:0  3:0
driver:  51 of 51  Cross-Condition Consistency [MODERATE]
```

- **17.0%**, with a 95% interval of roughly 13% to 21%. The 3/8 = 37.5% point estimate was high, and
  17% sits inside its interval — eight draws could not have told the two apart.
- **The driver never moves.** All 51 flagging offsets are Cross-Condition Consistency at MODERATE.
  Not one other test reached MODERATE or HIGH at any of the 300 offsets.
- **The ceiling is severity 1.** No offset produced severity 2 or 3. One MODERATE in one dimension is
  all this file can reach.

So this is one unstable test at its resample count, not a diffuse instability. That is the narrower
and more fixable of the two shapes.

#### Why it moves — the arithmetic, from the result object

Cross-Condition Consistency on this fixture: 2 conditions (Vehicle, Treatment), 1 pair, 7 properties,
B = **499** permutations, Stage-1 BH denominator m = **3**. Its `primaryP` is the minimum adjusted p
across the three per-stage BH families, and the minimum is Stage 1's leading unit — "CDF shape (KS)",
direction *similar*.

A permutation p is `(exceedances + 1) / (B + 1)`, so on the grid of 1/500. BH at rank 1 with m = 3
multiplies by 3. The adjusted p of the leading unit can therefore only take the values:

| exceedances in 499 permutations | adjusted p | tier |
|---|---|---|
| 0 | **0.006** | MODERATE |
| 1 | **0.012** | LOW |
| 2 | 0.018 | LOW |

`ALPHA.NOTE` is **0.01**. It falls in the gap between 0.006 and 0.012 — a value the grid cannot
represent. There is no "close call" available: the verdict is decided by whether a single one of 499
permutations exceeds the observed KS statistic.

Measured across offsets 0–7, `primaryP` takes exactly two values and nothing else:

```
offset 0  LOW       p=0.012      <- the derived stream, one exceedance
offset 1  LOW       p=0.012
offset 2  LOW       p=0.012
offset 3  MODERATE  p=0.006      <- zero exceedances
offset 4  LOW       p=0.012
offset 5  LOW       p=0.012
offset 6  MODERATE  p=0.006
offset 7  MODERATE  p=0.006
```

The gates are not involved. `primaryPUngated` equals `primaryP` at 0.012, so nothing is being held
down here — this is the raw ladder.

### 3.2 The other seven clean fixtures

60 offsets each, same method:

| fixture | non-clean | severity counts |
|---|---|---|
| `01-densitometry-clean.csv` | 0/60 | 0:60 |
| `03-qpcr-clean.csv` | 0/60 | 0:60 |
| `05-cellcount-clean.csv` | 0/60 | 0:60 |
| `07-elisa-clean.csv` | 0/60 | 0:60 |
| **`09-proteomics-clean.csv`** | **10/60 = 16.7%** | 0:50 **1:10** |
| `12a-uniform-mixture-clean.csv` | 0/60 | 0:60 |
| `17-densitometry-carlisle-clean.csv` | 0/60 | 0:60 |
| `vfs-a-pigeonhole-clear.csv` | 0/60 | 0:60 |

**`09` is unusual, not typical.** Seven of eight clean fixtures never left severity 0 across 60
counterfactual streams each. Sixty draws is a weak upper bound rather than proof of zero — it puts
each of those seven below about 5% with 95% confidence — but the contrast with 09 is unambiguous.
09's own 60-offset figure, 16.7%, agrees with its 300-offset figure of 17.0%.

### 3.3 The reachable version of the same question

A counterfactual stream is a stream `09-proteomics-clean` cannot produce. The stronger question is
whether a file a user could *actually have* lands on the other side. So: take the fixture, change one
cell by one unit in its own last recorded decimal place — 0.01 on a proteomics intensity, well inside
measurement noise — and re-run unhooked. Every such file derives its own seed, exactly as an upload
would.

60 neighbours, each differing from the fixture in exactly one of 2400 cells:

```
non-clean 6/60 = 10.0%    severity counts  0:54  1:6  2:0  3:0
driver:  6 of 6  Cross-Condition Consistency [MODERATE], every one at p = 0.006
```

The six:

```
line   5 col 3    16.11 ->    16.10
line 118 col 3  1182.09 ->  1182.08
line 248 col 2   637.23 ->   637.24
line 364 col 3   145.97 ->   145.96
line 391 col 5    63.17 ->    63.16
line 398 col 4   958.88 ->   958.89
```

**About one in ten single-cell neighbours of a clean file is reported as "Minor anomalies detected —
review dataset at your discretion".** Not because the data changed in any way a reviewer could
defend, but because a different seed drew a different permutation null and the exceedance count fell
from one to zero.

That is the finding this session was written to look for, in its reachable form. It is not a live
false positive on this fixture; it is a live false positive on roughly a tenth of the files one
rounding step away from it, and a user shown one has no way to tell.

*Method note, stated because it caught me once.* The first neighbour run sampled cells at a stride of
`2400/60`, which is a multiple of the six-column row stride, so all 40 samples landed in the same
data column. That run returned 5/40 = 12.5%, all in column `Rep1`. The stride was changed to cycle
columns and the run repeated at N = 60; the figure above (6/60 across five different columns) is the
corrected one. Both runs agree on the driver and on the p-value.

---

## 4. Gates

`git diff 280508d HEAD -- src/` — **empty.** `git status --short src/` — **empty.** Nothing under
`src/` was read-modified; the two seed hooks rewrite `prng.js` in memory at load time and never touch
disk.

Batch: not applicable, per the dispatch. It was not run.

---

## 5. Chat's four expectations

| # | expectation | verdict |
|---|---|---|
| 1 | derived seed sits outside 0–7, so the sweep is a sample not an enumeration | **Half right, and the half that is wrong matters more.** The derived per-test seeds are nine- and ten-digit integers, nowhere near 0–7. But the sweep was never sampling from that space: it applies an XOR *offset*, and offset 0 is the identity. Sweep seed 0 is the derived seed. So the sweep is one real draw plus seven counterfactuals, not eight draws from a space. |
| 2 | derived seed lands clean; the finding is boundary arbitrariness | **Correct.** Severity 0, "All checks passed", on 09 and on all seven other clean fixtures. |
| 3 | the sweep returns a non-clean rate well below 3/8 | **Correct on the number, and the number is still not small.** 51/300 = 17.0% against 37.5% — less than half, and the eight-draw sample was indeed unlucky. But one in six is not a rounding error, and the reachable version (§3.3) puts one in ten single-cell neighbours of this clean file into the "Minor anomalies detected" band. |
| 4 | browser and `validate-batch.mjs` use the same derivation | **Correct.** Same call site, and the two import chains produce byte-identical matrices on all 27 CSV fixtures. |

---

## 6. Probes

All under `test/probes/`, all read-only on `src/`, all stdout-only — nothing is written to disk, so
there is no output to gitignore.

| probe | what it does |
|---|---|
| `probe-s343-seed-derive.mjs` | derives the seed for all eight clean fixtures, verifies against the live module, and runs the sensitivity table |
| `probe-s343-entrypoint-parity.mjs` | replays the browser import chain headless and compares seeds with the batch chain, all 27 CSV fixtures |
| `probe-s343-run.mjs` | `MODE=derived` runs the clean corpus unhooked; `MODE=sweep` sweeps PRNG offsets |
| `probe-s343-neighbours.mjs` | perturbs one cell by one unit in its last decimal place and re-runs, unhooked |
| `probe-s343-ccc.mjs` | dumps the Cross-Condition Consistency result across offsets |

---

## 7. What this leaves open — for Chat

Read-only session, so these are handed over rather than acted on.

1. **A boundary that no reachable p-value can sit near is a calibration bug, not a close call.** On
   `09-proteomics-clean`, Cross-Condition Consistency's Stage-1 leading unit can report 0.006 or
   0.012 and nothing between, against a boundary of 0.010. Whether MODERATE fires is a single
   Bernoulli trial. That property follows from `B` and the BH denominator, both of which are known at
   run time — so it is checkable in general, not just here. The shape to look for: `m × 1/(B+1)` and
   `m × 2/(B+1)` straddling `ALPHA.NOTE`, or the same pair straddling `ALPHA.FLAG`. Any test with a
   small BH family on a permutation null can land in it.
2. **`B` is chosen from row count, not from where the p lands.** `crossConditionConsistency.js:167`
   sets `B = 499` for this file because its largest condition holds 1200 cells. The METHODOLOGY note
   at `:551` already records that raising `B` was ruled out once on arithmetic grounds for a
   different fixture. Whether the right fix is more permutations, a different BH denominator, or a
   boundary that is not a bare `<`, is a methodology decision and Chat's.
3. **The one-cell-neighbour rate is a measurable quantity nobody has been measuring.** 10% on this
   fixture. It is cheap — 60 runs, three minutes — and it says something the batch structurally
   cannot: how stable a verdict is under edits that change no scientific fact. It is a better
   stability gate than a seed sweep, because every point in it is a file that could exist.
4. **The eight-seed sweep should stop being described as eight seeds.** It is one real draw and seven
   counterfactual ones. Anywhere a doc reads "3 of 8 seeds", the accurate statement is "clean at the
   seed this file derives; 3 of 7 counterfactual streams flag". `V1X-FUTURE-WORK.md` and the S342
   summaries carry the old phrasing.
