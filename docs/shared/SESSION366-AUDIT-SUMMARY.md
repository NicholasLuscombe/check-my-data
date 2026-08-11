# Session 366 — ground-truth provenance for the five unlabelled fixtures

Read-only. No `src/` file was edited, no fixture was written, no batch was run, and
`docs/shared/TEST-GROUND-TRUTH.md` was not touched. No ground-truth row is written here — that is
Chat's, after this returns.

Five fixtures run in the batch and have no row in `TEST-GROUND-TRUTH.md`:
`vfs-a-pigeonhole-clear`, `vfs-b-recurrence-high`, `vfs-c-deeptail-high`,
`23-recurrence-null-mixed`, `24-recurrence-null-control`. S365 established why that matters: all
five sit on Excess Kurtosis's `nC ≤ 3` branch, where `pooledP` **is** `adP`, and four of the six
fixtures flooring `adP` at `0.0005` are among them. Without labels, P126 cannot be promoted or
closed and P127's gate decision is argued rather than measured.

This audit collects what the record actually states. It does not interpret beyond it.

---

## Part 0 — live state

| Command | Returned |
|---|---|
| `git log -1 --oneline` | `9289eac Merge claude/s365-p124-census: S365: P124 exposure census, the sigma-hat falsifier, and the retransformation closed form` |
| `git worktree list` | main at `9289eac`; this session's worktree at `9289eac` on `claude/five-unlabelled-fixtures-provenance-715891` |
| `git status --short` | empty |
| `md5 STATUS.md` | `e78a51229e0b033d6714c52698d0e4a8` |

**S365's promote ran.** `9289eac` is a merge commit whose parents are `95d47c1` (main's last
docs-only commit) and `0a160c5` (the tip of `claude/s365-p124-census`, the fifth and last branch
commit STATUS names). `origin/main` sits on the same commit and `status -sb` prints no
ahead/behind marker.

STATUS does not contradict that. Its "five commits on `claude/s365-p124-census`, **unpromoted at
close**" describes the moment the session closed; four lines later the same paragraph records "The
session closed, then the promote ran, and `branch -d` accepted at `0a160c5`." The opener read the
first clause without the second.

Two live-state notes, recorded not acted on: `git worktree list` returns two entries rather than
STATUS's one, the second being this session's own; and the two entries print different path forms
(`/Users/hedgehog/Projects/…` for main, `/Users/hedgehog/projects/…` for the worktree). The branch
name is the guard and reads correctly.

---

## Part 1 — does the provenance exist at all?

All five resolve to `test/fixtures/<name>.csv` and all five exist on disk.

| Fixture | Lines (`wc -l`) | md5 |
|---|---|---|
| `vfs-a-pigeonhole-clear` | 180 | `d17979501742020e3f9ea9fd6bddc213` |
| `vfs-b-recurrence-high` | 120 | `3f4535993eeee63f425825b91c3427fe` |
| `vfs-c-deeptail-high` | 180 | `a24ac1c17731b77de39a1f5092612e98` |
| `23-recurrence-null-mixed` | 121 | `215e33ec0a39895e4f2215c5da759139` |
| `24-recurrence-null-control` | 121 | `455b161d490665965dfb02dd52006a77` |

`wc -l` counts newlines and the three `vfs-*` files carry no trailing one, so the 180/120/180 here
and the 181/121/181 in S308's file list are the same files. Not drift.

### The four questions

| Fixture | Generator definition | Regenerates byte-identically | Introducing session | `batch-fixtures.mjs` entry |
|---|---|---|---|---|
| `vfs-a-pigeonhole-clear` | **None** | **No regeneration path exists** | `SESSION308-CODE-SUMMARY.md:30` — **S308**, sole commit `d22df9f` | `EXPECTED` **only** (`:217-219`); severity 0, `general`, `Value-Frequency Spike: ['LOW','N/A']` |
| `vfs-b-recurrence-high` | **None** | **No regeneration path exists** | `SESSION308-CODE-SUMMARY.md:31` — **S308**, `d22df9f` | `EXPECTED` **only** (`:220-222`); severity 2, `Value-Frequency Spike: ['HIGH']` |
| `vfs-c-deeptail-high` | **None** | **No regeneration path exists** | `SESSION308-CODE-SUMMARY.md:32` — **S308**, `d22df9f` | `EXPECTED` **only** (`:223-225`); severity 2, `Value-Frequency Spike: ['HIGH']` |
| `23-recurrence-null-mixed` | **None** | **No regeneration path exists** | Draft at `SESSION296-SUMMARY.md:29` (**S296**, `e1b09bd`); shipped bytes from the rebuild at `SESSION297-SUMMARY.md:17`, `:37` (**S297**, `f22ea8a`) | **Both** — `FIXTURES:45` as DS23; `EXPECTED:201-207` severity 3, five declared + four `ACKNOWLEDGED` |
| `24-recurrence-null-control` | **None** | **No regeneration path exists** | Draft at `SESSION296-SUMMARY.md:30` (**S296**, `e1b09bd`); rebuild at `SESSION297-SUMMARY.md:19`, `:38` (**S297**, `f22ea8a`) | **Both** — `FIXTURES:46` as DS24; `EXPECTED:208-211` severity 3, two declared + two `ACKNOWLEDGED` |

### Findings

**The document-exists stop condition does not fire.** `TEST-GROUND-TRUTH.md:15-17` asks for the
generator *and* the introducing session. None of the five is in the generator; every one has an
introducing session summary. Provenance exists, and it is entirely session-summary provenance.

**`generate-test-datasets.py` emits 20 files and none of them is one of these five.** The
`datasets` list at `:1258-1277` runs `01`…`22` with `13`, `14`, `18`, `23`, `24` absent and no
`vfs-*` entry. `command grep` for `vfs`, `recurrence`, `pigeonhole`, `deeptail` and `recur` across
the whole generator returns nothing at all. `generate-ui-datasets.py` writes only
`ui-review-clear.csv` and `ui-review-flagged.csv` (`:318-319`).

**The P85 duplicate-definition shape is confined to the two fixtures P85 already names.** Checked
rather than assumed: the only duplicated top-level `def` names in the generator are
`gen_carlisle_overbalanced` (`:676`, `:877`) and `gen_carlisle_clean` (`:816`, `:924`) — DS16 and
DS17 exactly. No third duplicate exists, and the shape cannot reach these five regardless, since
none has even one definition.

**No construction script was ever committed for any of the five.** The introducing commits carry
the CSVs as data and nothing that builds them — `d22df9f` touches `valueFrequencySpike.js`,
`batch-fixtures.mjs` and three CSVs; `e1b09bd` one findings doc and two CSVs; `f22ea8a`
`duplicateDetection.js`, `batch-fixtures.mjs` and two CSVs. So "does it regenerate byte-identically"
has no second run to compare against for any of the five. `git log --follow` shows no fixture
touched since its introducing commit.

**P64 confirmed at source, and it is why the `vfs-*` trio runs at all.** `validate-batch.mjs:155`
iterates `Object.entries(EXPECTED)`, not `FIXTURES`. `FIXTURES` holds 24 entries, `EXPECTED` holds
27, and the difference is exactly the three `vfs-*` files; nothing is in `FIXTURES` and missing
from `EXPECTED`. `FIXTURES` is what `scripts/build-test-display-map.mjs` reads, so the trio is in
the batch and absent from the generated display map.

**A correction owed to `TEST-GROUND-TRUTH.md`.** Its `:15` names the missing fixtures as
"`vfs-a-pigeonhole-clear`, DS23 and DS24" — three. The count is five; `vfs-b-recurrence-high` and
`vfs-c-deeptail-high` are equally absent from the table and equally present in the batch. Chat owns
that file. Not edited.

---

## Part 2 — construction records, classified

The stop condition as first written tested whether a document exists. The rule at
`TEST-GROUND-TRUTH.md:15-17` needs a document that states the **construction** — what was planted,
where, at what strength, drawn from what. `"new, 181 lines"` passes the first test and satisfies
nothing the row needs. Part 2 is the test Part 1 could not run.

Classes: **A** construction stated; **B** intent or target stated only; **C** manifest only.

| Fixture | Class | Strongest record | Missing for a row |
|---|---|---|---|
| `23-recurrence-null-mixed` | **A** | `archive/SESSION296-FIXTURE-BUILD-FINDINGS.md:42-49` + `SESSION297-SUMMARY.md:17` | `hiprec`'s value distribution; the rebuild seed |
| `24-recurrence-null-control` | **A** | Same recipe for `recur`, + `SESSION297-SUMMARY.md:19` | The rebuild seed |
| `vfs-a-pigeonhole-clear` | **B** | `SESSION308-CODE-SUMMARY.md:30` | Everything — what is planted, where, at what strength, and the marginal |
| `vfs-b-recurrence-high` | **B** | `SESSION308-CODE-SUMMARY.md:31` | Location, strength beyond a multiplicity, the marginal |
| `vfs-c-deeptail-high` | **B** | `SESSION308-CODE-SUMMARY.md:32` + `SESSION311-SPAN-SKIP-READ.md:76-79` | Integer-part distribution; location of the shared tail |

No fixture is class C.

### The class-A record

`docs/shared/archive/SESSION296-FIXTURE-BUILD-FINDINGS.md:40-49`, verbatim:

> ## Reproduction recipe (deterministic)
>
> Both CSVs were generated with a seeded Mulberry32 PRNG (seed `0x2960001`), N = 120, over the
> CORPUS-03 SL range `[20.22, 28.96]`.
>
> - **recur** (both files): 5 values `[21.34, 22.87, 23.51, 25.09, 26.78]` each repeated 10 times,
> plus 70 distinct 2-decimal draws from `N(22.907, 1.726)` clipped to the range and de-duplicated;
> the 120 values are shuffled so no identical rows are contiguous. All leading digit 2. This is
> Shape B from the pre-build read (5x10 concentrated recurrence).
> - **wide** (mixed file): `10^uniform(log10(3), log10(1300))`, 3 decimals — 2.6 orders of
> magnitude, lends Benford its span.
> - **precA** (mixed file): `uniform(15, 480)`, 1 decimal.
> - **precB** (mixed file): `uniform(0.1, 95)`, 3 decimals.
>
> Per-column decimal formatting is exact (`toFixed(1/2/3)`) because Decimal Precision reads raw
> strings and counts trailing decimals.

`precA` and `precB` belong to the S296 draft and are not in the shipped file. The shipped columns
are covered by `SESSION297-SUMMARY.md:17` (`hiprec` — "120 distinct high-precision values,
precision histogram modelled on CORPUS-03 `Total.distance` (bulk at 3dp, 16 values at 4dp, 3 at 5dp
so maxDp = 5 makes dp=4 an intermediate tested level)") and `:19` (`r1`, `r2` — "distinct 2dp draws
from `recur`'s own distribution (N(22.907, 1.726)), shuffled, same band").

### The class-B record

`SESSION308-CODE-SUMMARY.md:30-32` is the whole of it:

> - `test/fixtures/vfs-a-pigeonhole-clear.csv` — new, 181 lines (2dp pigeonhole → VFS LOW, sev 0)
> - `test/fixtures/vfs-b-recurrence-high.csv` — new, 121 lines (2dp recurrence → VFS HIGH
> concentration, sev 2)
> - `test/fixtures/vfs-c-deeptail-high.csv` — new, 181 lines (6dp deep tail → VFS HIGH depth, sev 2)

`:21` adds only "Three held regression fixtures registered in `EXPECTED`."
`SESSION308-CHAT-SUMMARY.md` never names them. `vfs-c` alone gains one later construction
statement, `SESSION311-SPAN-SKIP-READ.md:76-79`: "Its tails are deliberately banded in `38xxxx`,
so it **sidesteps the skip by construction**."

### A source outside the audit's list, reported and not relied on

`test/batch-fixtures.mjs` carries per-fixture comments saying more about content than S308 does —
`:218` "busiest tail .47 obs 19 across 19 DISTINCT whole parts"; `:221` "137.42 ×15 → concentration
keep (domFrac 1.0, 1 distinct)"; `:224` ".385732 shared across 7 DISTINCT integers". This is
neither the generator nor a session summary, and it sits inside the `EXPECTED` block — the artifact
`TEST-GROUND-TRUTH.md:17` names as the thing a row must not be sourced from. It does not lift any
class. Even at face value it states a spike and a multiplicity, not a marginal or a draw.

### Corroboration of the class-A record against the shipped bytes

Confirming a stated construction, not discovering an unstated one.

- `recur` is byte-identical between DS23 and DS24 (`diff` of the two first columns is empty),
  confirming S297's "byte-identical to the locked carriers".
- `recur` holds exactly the five recipe values `21.34 / 22.87 / 23.51 / 25.09 / 26.78`, each
  exactly ten times, and exactly five values in the column repeat at all — 75 distinct over 120
  rows, the recipe's 5 + 70. Every value has leading digit 2. Observed range 20.29–26.85, inside
  the stated `[20.22, 28.96]`.
- All 360 of `vfs-c`'s data cells sit in the `.38` tail band, confirming S311.

### Structural facts, read from the CSVs

| Fixture | Data rows | Columns | Header | Identifier | Conditions | `nC` |
|---|---|---|---|---|---|---|
| `vfs-a-pigeonhole-clear` | 180 | 3 | `id,m1,m2` | `id` (180 distinct) | **none** | **2** |
| `vfs-b-recurrence-high` | 120 | 3 | `id,m1,m2` | `id` (120 distinct) | **none** | **2** |
| `vfs-c-deeptail-high` | 180 | 3 | `id,m1,m2` | `id` (180 distinct) | **none** | **2** |
| `23-recurrence-null-mixed` | 120 | 3 | `recur,wide,hiprec` | none | **none** | **3** |
| `24-recurrence-null-control` | 120 | 3 | `recur,r1,r2` | none | **none** | **3** |

None is ragged; all five are LF-terminated, so the CRLF hazard does not apply.

**S365's `nC` assignment is confirmed** — 2 for the three `vfs-*`, 3 for DS23 and DS24 — and the
quantity it counts is now named: with no condition column anywhere, `nC` is the data-column count
of the single implicit group. **No fixture has a condition column**, so the
contiguous-versus-interleaved question is void for all five. An independent prior read agrees:
`docs/shared/S349-CCC-LIMIT-DATA.md:285` records `vfs-a-pigeonhole-clear` as "no generator in the
repo; no condition column, CCC returns N/A".

### Did a build script exist outside the repo?

**Yes for DS23 and DS24, and it is named.** `SESSION297-SUMMARY.md:41`:

> Throwaway generator/probe (`build-s297.mjs`, `probe-s297*.mjs`) removed; never committed to src.

The rebuild that produced the shipped bytes ran from a script that no longer exists. `recur` and
`wide` survive that loss because S296 wrote their recipe and seed down; `hiprec`, `r1` and `r2` are
described to the level of a precision histogram and a distribution but carry no seed — re-specifiable,
not reproducible.

**For the `vfs-*` trio the record is silent.** No builder is named in either S308 summary or
anywhere else. Whether one existed is unanswered, and either way the three are permanently frozen
as data.

---

## Part 3 — purpose

A recipe says how a file was made. It does not say whether what was made is meant to represent
honest data or fabricated data, and a ground-truth row has to state the second.

### Why the two files were built

`archive/SESSION296-FIXTURE-PREBUILD-READ.md:5`:

> The §2.6 fixture is unusual: for its recurrence columns it asserts a verdict the current engine
> gets wrong. The correct collision null rates structured value recurrence HIGH, but the current
> empirical-Herfindahl null rates it LOW at p = 1.0 (the circularity the axis-2 fix removes). So
> the fixture is correct against its target and failing against today's engine, and it cannot enter
> the live pass gate until the fix lands.

`SESSION297-SUMMARY.md:25`:

> **DupDet LOW is the pre-fix behaviour.** The §2.6 continuous-null fix will flip `recur` from LOW
> to HIGH. The `EXPECTED` entries assert LOW now (matching current engine); whoever lands the fix
> flips both to HIGH. This is exactly the regression anchor the fixture exists to be.

They gate a pending fix to Duplicate Detection's continuous collision null, pinning the tool's
current *wrong* answer so the fix's arrival is visible.

### Honest, or fabricated?

**Neither word appears.** No document says these files are honest, null, unfabricated or clean, and
none says fabricated, planted or seeded. That vocabulary is not used of them.

**The documents settle it in different words, and against the "honest by design" reading.** Four
call `recur` a *defect*, in the specific sense of the thing the fixture exists to carry:

`archive/SESSION296-FIXTURE-PREBUILD-READ.md:78`:

> five values each appearing ten times among ~370 rows reads as a plausible block-copy defect

`archive/SESSION297-FIXTURE-READ2.md:111`:

> they disappear only when `recur` is deleted — i.e. only when the axis-2 defect the fixture exists
> to carry is removed.

`archive/SESSION297-FIXTURE-READ2.md:125`:

> There is no third option that keeps the recurrence defect and produces no Dimension-III collateral.

`SESSION297-SUMMARY.md:66`, identical at `SESSION297-CHAT-SUMMARY.md:14`:

> VFS HIGH / Entropy MODERATE / ColGoF MODERATE are `recur`'s intrinsic digit-and-distribution
> shadow (vanish only if the defect is deleted)

**The same documents settle the other columns the opposite way.** `wide` and `hiprec` exist to make
the tool fire on structure that is not a defect. `archive/SESSION296-FIXTURE-BUILD-FINDINGS.md:13`:

> **Carrier 2 — the Benford span-borrowing false positive (Benford First Digit → HIGH). Reproduced.**

`archive/SESSION297-FIXTURE-READ2.md:52`:

> CORPUS-03's MODERATE **is** a pooling artifact — neither `SL` nor `Total.distance` fires alone,
> and the firing exists only because `testDecimalPrecision` flattens both columns into a single
> histogram and the low-precision column inflates the shared `total`. This is the false unification,
> not a within-column defect.

**So "mixed" in the filename names the two axes, not a mixture distribution.** DS23 carries one
planted defect the tool wrongly clears (axis 2, a false negative) and two honest structures the
tool wrongly flags (axis 1, false positives). **"recurrence-null" is the collision null used for
recurrence — the object under test — not a claim that the data is null.**

### CORPUS-03's role

Reproducing its behaviour **was the purpose**, not a side effect. `test/batch-fixtures.mjs:190-192`:

> // §2.6 fix-verification fixtures. Reproduce CORPUS-03's axis-1 (false
> // unification by pooling unrelated columns) and axis-2 (recurrence null
> // suppressing Duplicate Detection) behaviour so the batch gates the fix.

What the artifact is, measured on the real deposit — `archive/SESSION297-FIXTURE-READ2.md:46`:

> So the triggering shape is not a single-column cliff. It is a **pooling artifact**: a
> high-precision column (`Total.distance`, maxDp 5) whose count at level maxDp−1 is genuine but
> modest (42 values at 4dp), pooled with a large lower-precision column (`SL`, all ≤ 2dp, 373
> values) that roughly doubles the pooled `total` **without adding anything at the top levels**.

`:52` adds "The carrier is testing the right thing."

### What "control" means for DS24

Control for the **multi-column dispatch**, and nothing else.
`archive/SESSION297-FIXTURE-READ2.md:85`:

> So a three-column control **does** exist: `recur` plus two distinct-value, same-band fillers
> isolates the recurrence null (DupDet LOW driven by `recur`'s HHI inflation, not by the
> multi-column dispatch), and the fillers are inert on every DupDet channel.

The scope limit is stated at `:89`: "The control isolates the *dispatch* variable, not the
*collateral* variable." DS24 is **not** a clean counterpart to DS23 — it contains the same planted
`recur` and removes only the other columns. It has three columns rather than one because a
single-column CSV strips to zero rows at `parser.js:28`'s `minCells = Math.max(3, …)`
(`archive/SESSION296-FIXTURE-BUILD-FINDINGS.md:23`).

### What `ACKNOWLEDGED` does mechanically

Read at `test/validate-batch.mjs`. It does exactly one thing.

- **Severity is computed before it and without it.** `:210` — `computeSeverity(results)`;
  `severity.js:8` takes `results` alone and counts `r.flag`. Nothing in that path can see
  `ACKNOWLEDGED`. **An acknowledged firing contributes to severity in full.**
- **Its only read is into `accountedNames`.** `:240` builds `ackForFile`; `:250-253` unions its
  keys with `expected.flags`'s; `:254-257` reports a completeness miss for any MOD/HIGH name
  outside that union. That is the whole of its effect.
- **The verdict at `:275`** is `severity === expected.severity && cellsOk && completenessOk &&
  matrixOk`, so it can only ever change `completenessOk`. It cannot rescue a wrong severity, a
  wrong declared tier, or a flag-matrix difference.
- **Name-checked, never tier-checked.** `:250-253` reads only keys; the reason strings are prose
  and are never compared. An acknowledged channel may move MODERATE ↔ HIGH, or fall to LOW and
  leave `firingNames` entirely, unnoticed. This is `CLAUDE.md`'s P101 note, confirmed at source.
- **It does not annotate output.** `:276` prints every MOD/HIGH result regardless of status.

So it does **not** suppress a failure, **not** exclude a channel from severity, and **not** merely
annotate. It admits a name to a completeness whitelist.

**Consequence for reading `EXPECTED` severity 3.** DS23's severity is the union of its declared and
acknowledged firings, and that union contains two channels the documents call false positives
(Benford span-borrowing, Decimal-Precision pooling) plus four acknowledged collateral firings.
Severity 3 is what the tool returns on this file. It is not a count of planted mechanisms.

**Reasons are recorded for all six acknowledged channels**, in the `ACKNOWLEDGED` strings and again
in `archive/SESSION297-FIXTURE-READ2.md:99-105`'s measured leave-one-out attribution table —
`recur` for VFS / Entropy / Column-GoF, the span column for Selective Noise. `:107` states the
finding they rest on: "A fully surgical construction does not exist."

---

## What this settles, and what it does not

**The "honest by design" reading is refuted for both DS23 and DS24.** Four documents call `recur` a
defect, one of them "a plausible block-copy defect", and the fixture's stated job is to pin the
tool's failure to detect it. Neither file is honest data.

**P127 is not promoted.** Its promotion needed a fixture built to be honest that returns `adP` on
the permutation floor. The antecedent does not hold for DS23, so the conditional does not fire.
This audit produces no measured false positive behind the effect-size gate.

**DS23 cannot serve as a P127 instrument in the other direction either.**
`archive/SESSION296-FIXTURE-BUILD-FINDINGS.md:27`, of the four-column draft:

> This is because the engine reads the four columns as replicate measurements of one quantity, and
> four unrelated columns at four different scales look like heterogeneous, variance-mismatched,
> spiky replicates.

The three-column rebuild narrowed this to two scale tiers (`SESSION297-SUMMARY.md:27`) but did not
remove it. A floored `adP` on a file whose columns are not replicates of anything has a documented
mundane explanation predating and independent of P126 and P127. That is a limit on the instrument,
not a measurement of the gate.

**P126 is untouched.** Nothing here bears on the scale factor, as was stated in advance.

**The `vfs` trio is untouched.** Class B, no builder named, permanently frozen as data. In
particular `vfs-a-pigeonhole-clear`'s record never states what distribution `m1` and `m2` were
drawn from, and that is exactly the quantity separating "a clean fixture flooring `adP`" from "a
fixture with a deliberately atypical marginal flooring for an unrelated reason". Neither reading is
confirmed and neither is excluded.

### One thing worth Chat's attention, not scoped here

DS24 is the closer of the two to honest replicate structure — its three columns are same-band 2dp
draws from one distribution, built so they "read as same-scale replicates"
(`archive/SESSION297-FIXTURE-READ2.md:76`). It still contains the planted `recur`, so it is not a
clean fixture; but its confound is one column rather than three unrelated scales.

### A correction made during this audit

Part 2 of this audit called DS23 and DS24 "severity-3 fabricated files". That label was sourced
from batch `EXPECTED`, which is precisely the artifact `TEST-GROUND-TRUTH.md:17` forbids — the same
rule this audit applied correctly to the `vfs` comments two paragraphs earlier in the same report.
Withdrawn and replaced by the document-sourced reading above: one planted defect plus two
honest-structure false positives.

---

## Verification

**Read at source.** `generate-test-datasets.py` (all `def` sites, the `datasets` writer list at
`:1258-1277`); `generate-ui-datasets.py:318-319`; `test/batch-fixtures.mjs` (`FIXTURES`,
`EXPECTED`, `ACKNOWLEDGED`, `SUSPENDED`); `test/validate-batch.mjs:150-280`;
`src/analysis/severity.js:8-20`; the five fixture CSVs; `docs/shared/TEST-GROUND-TRUTH.md:1-30`;
`docs/shared/S349-CCC-LIMIT-DATA.md:275-295`; `docs/sessions/SESSION296-SUMMARY.md`,
`SESSION296-CHAT-SUMMARY.md`, `SESSION297-SUMMARY.md`, `SESSION297-CHAT-SUMMARY.md`,
`SESSION308-CODE-SUMMARY.md`, `SESSION308-CHAT-SUMMARY.md`, `SESSION311-SPAN-SKIP-READ.md`,
`SESSION312-CODE-SUMMARY.md`, `SESSION337-SUMMARY.md`, `SESSION348-SUMMARY.md`; and
`docs/shared/archive/SESSION296-FIXTURE-PREBUILD-READ.md`,
`SESSION296-FIXTURE-BUILD-FINDINGS.md`, `SESSION297-FIXTURE-READ2.md` **at the main checkout** —
`docs/shared/archive/` is gitignored and does not exist inside a worktree. The main-checkout path
was resolved with `git rev-parse --path-format=absolute --git-common-dir`, not assumed.
`command grep` throughout; the shell wrapper carries `--ignore-files` and would have skipped
`docs/sessions/` and `docs/shared/archive/` silently.

**Quoted verbatim.** The S296 reproduction recipe (`:40-49`); `SESSION297-SUMMARY.md:17`, `:19`,
`:25`, `:41`, `:66`; `SESSION308-CODE-SUMMARY.md:30-32`; `SESSION311-SPAN-SKIP-READ.md:76-79`;
`archive/SESSION296-FIXTURE-PREBUILD-READ.md:5`, `:78`;
`archive/SESSION296-FIXTURE-BUILD-FINDINGS.md:13`, `:27`;
`archive/SESSION297-FIXTURE-READ2.md:46`, `:52`, `:85`, `:89`, `:111`, `:125`;
`test/batch-fixtures.mjs:190-192`, `:201-211`, `:283-292`.

**Class per fixture.** DS23 **A**, DS24 **A**, `vfs-a` **B**, `vfs-b` **B**, `vfs-c` **B**. None C.
Purpose additionally settles at class A for DS23 and DS24; the `vfs` trio has no purpose statement
beyond its target test.

**Expectations that held or moved.**

- The first stop condition (does a document exist) passed all five; the corrected one (does it
  state the construction) passes two. That correction was made mid-audit and is recorded.
- The tidier story was checked hardest and failed twice. `vfs-a` is not decidable — its marginal is
  unstated. DS23 is not honest by design — four documents call its carrier a defect.
- S365's `nC` assignment held: 2/2/2 and 3/3, re-derived from the files rather than from the table.
- P64 held exactly: the three `vfs-*` are in `EXPECTED` only.
- P85's duplicate-definition shape turned out to be confined to DS16 and DS17, which was checked
  rather than assumed.
- A build script outside the repo turned out to exist and to be named for DS23/DS24, and to be
  unrecorded for the `vfs` trio. That was an open question, not an expectation.
- `ACKNOWLEDGED` turned out to be weaker than any of the four candidate behaviours: a name-keyed
  completeness whitelist, with acknowledged firings still driving severity in full.

**Not done, deliberately.** No ground-truth row written. `docs/shared/TEST-GROUND-TRUTH.md` not
edited. No `src/` edit — `git diff --stat -- src/` is empty. No batch, no preview, no screenshots;
nothing here changes engine output, so a batch would gate nothing.

**Dev server:** not started. Read-only audit with no rendering surface.
