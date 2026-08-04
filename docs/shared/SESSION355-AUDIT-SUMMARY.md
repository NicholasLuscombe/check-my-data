# S355 — can the label-only register rows be recovered?

**Read-only audit. Nothing was fixed.** No edit to `src/`, to any register, or to any Chat-owned doc.
Every finding below is a row in a report.

**The finding.** Seven of the eight recover to a claim a stranger could act on, and the eighth recovers
its subject and its state but has no claim anywhere. The material was never lost — it is in
`docs/sessions/`, which is gitignored and outside Chat's reach. **The root cause is a routing failure, not
a drafting failure.** Two consecutive sessions wrote a `§BANKED additions` block headed *"(→ main
BANKED)"* and the block never reached `BANKED.md`. The P-number made the trip to `STATUS.md`; the
sentence that defined it did not.

**Every search in this audit used `command grep`.** The shell wrapper carries `--ignore-files` and
silently skips `docs/sessions/`, `STATUS.md`, `BANKED.md`, `CLAUDE.md` and `docs/shared/archive/` — which
is where all eight answers live. A plain recursive grep returns nothing here and the nothing is an
artefact.

---

## Expectations

| # | Expectation | Result |
|---|---|---|
| 1 | Fewer than four of the eight recover to a claim | **inverted** — seven recover, one is partial |
| 2 | `STATUS.md` and `BANKED.md` have no git history whatsoever | **held** — and stronger than stated, see §0 |
| 3 | Each of the eight has an allocating session summary that names it | **held** — S339 (three), S340 (one), S341 (four) |
| 4 | P26 and P32 predate the P41 floor and were renumbered rather than closed | **half held, half inverted** — both predate it; neither was renumbered. P26 was killed on evidence, P32 was split and both halves resolved under a different number |
| 5 | The dangling citations number more than two | **held** — three distinct numbers, seven occurrences, and the third sits in shipped `src/` |

---

## 0. Expectation 2, settled rather than assumed

`.gitignore:36–38` ignores `CLAUDE.md`, `STATUS.md`, `BANKED.md`; `:45` ignores `docs/sessions`; `:48`
ignores `docs/shared/archive`.

Three independent checks, all negative:

```
git log --all -- STATUS.md BANKED.md                    →  0 lines
git log --all --full-history -- STATUS.md BANKED.md     →  0 lines
git rev-list --all --objects | grep -E '(STATUS|BANKED)\.md$'  →  0 hits
```

The third is the one that settles it: across **887 commits**, no blob under either name has ever entered
the object database. Not "no history on the current path" — never committed, under any path, on any
branch. `git log -S` against them is not merely unproductive, it is undefined.

**Consequence for the rest of this audit.** Anything either file ever said and no longer says is gone
unless a session summary copied it. That is why `docs/sessions/` is the whole recovery surface.

---

## 1. The eight rows

**Two allocation mechanisms, and they fail differently.**

- **S339 and S340 (P41, P42, P44, P47)** allocated in a **carry-in roster** — a homing table whose cell
  is `| subject | state | P-number |`. No item text was ever authored. The roster line *is* the item, and
  it is one grade richer than STATUS's row because it carries a state word ("design open",
  "undiagnosed", "programme"). Their claims exist in the same sessions' bodies, on the same subject,
  untagged.
- **S341 (P49, P51, P54, P58)** allocated in a **`§BANKED additions` block**, each entry a tagged,
  finished paragraph with the number in bold at its head. These are the four cleanest recoveries in the
  audit, and they were written to be transferred and never were.

| P | verdict | the recovered claim | source |
|---|---|---|---|
| P41 | **Recovered** | Fisher's arm of `aggregatePerGroup` runs far above nominal on clean data and needs a corrected null rather than removal. | `SESSION339-SUMMARY.md:83`, `SESSION339-CHAT-SUMMARY.md:44`, `:130` |
| P42 | **Partial** | Subject and state only: LOESS's calibration, recorded as undiagnosed. No claim, no measurement, no scope anywhere. | `SESSION339-CHAT-SUMMARY.md:131` |
| P44 | **Recovered** | The battery's clean-file tier rate is not a battery false-positive rate: the row shuffle reaches only order-dependent tests, and fifteen order-invariant nulls are untested. | `test/probes/probe-battery-calibration.mjs:340–344`, `SESSION339-CHAT-SUMMARY.md:73`, `:133` |
| P47 | **Recovered** (linkage by adjacency) | Resample counts land fixed-per-test and uncoupled across tests; adaptive-B was costed and dropped. Choosing the counts is unblocked technically and blocked on the HIGH-tier decision. | `SESSION340-CHAT-SUMMARY.md:67`, `:176` |
| P49 | **Recovered** | The convergence rule has no stated basis once tiers differ per test — nothing says what makes cards combinable. | `SESSION341-CHAT-SUMMARY.md:102` |
| P51 | **Recovered** | The analytic SE is invalid for a multiplicity-adjusted minimum; per-file empirical estimation is unaffordable; ship instability as methodology, not as a per-file number. | `SESSION341-CHAT-SUMMARY.md:108` |
| P54 | **Recovered** | `EFFECT_SIZE.KURTOSIS_DEV` is a constant above N ≈ 2300, so the "N-adaptive" gate is a hard ceiling on any large file. | `SESSION341-CHAT-SUMMARY.md:121` |
| P58 | **Recovered** | Replace the doubling with a one-sided p on a two-sided statistic — min-tail-probability or centred-deviation against the null already in hand. | `SESSION341-CHAT-SUMMARY.md:135` |

### The sources, verbatim

**P41 — Fisher combination.** The homing line, `docs/sessions/SESSION339-CHAT-SUMMARY.md:130`:

> `| Fisher's corrected null | design open | P41 |`

The claim, `docs/sessions/SESSION339-SUMMARY.md:83–85`:

> **Fisher's arm is the remaining half.** On DS02 LOESS's Fisher arm alone runs
> 19.20% against a worst-group arm of 7.80%; at six groups 26.00% against 11.00%.
> Untouched by design — it needs a corrected null rather than removal.

What blocks on it, `SESSION339-CHAT-SUMMARY.md:44`:

> the union runs 6.2% on DS17 clean, and
> the cause is the aggregation layer rather than the route. Blocked on P41.

A second measurement of the same arm survives in tracked source, `test/probes/probe-agg-layer.mjs:4–5`:

> Three conditions each got a chance at a per-group rate that was itself
> twice nominal: Fisher's arm alone 2.2%, the worst-group arm alone 5.8%.

STATUS's own row already says "case material for P83", and that pointer is sound —
`METHODOLOGY.md:686` states the same defect from P83's side. **P41 is not undefined; it is the measured
half of P83.**

**P42 — LOESS. Partial, and the only one.** The entire record, `SESSION339-CHAT-SUMMARY.md:131`:

> `| LOESS calibration | undiagnosed | P42 |`

Searched: all 485 files in `docs/sessions/`; all of `docs/shared/` including 28 files ever deleted from
it, via `git log --all --diff-filter=D`; `git log --all -S "LOESS calibration" -- docs/` (zero commits);
`src/`, `test/`, `scripts/` comments; `docs/archive/`; `docs/shared/archive/`; `STATUS.md`, `BANKED.md`,
`CLAUDE.md`, `project-instructions.md`. No per-test LOESS calibration figure exists anywhere in the
repository. The word "undiagnosed" is doing real work — it records that no diagnosis was made, not that
one was made and lost.

**One trap for whoever picks this up.** `docs/shared/SESSION346-REGISTER-CENSUS.md:145` cross-references
P42 to `BANKED:91`. That line is a *different LOESS question* — region-comparison detail admitted at
`cusumP < 0.05` under a 0.001/0.01 verdict, a display-disclosure item. Subject match, not item match.
Following the census's pointer lands on the wrong problem.

**P44 — order-invariant nulls.** The homing line, `SESSION339-CHAT-SUMMARY.md:133`:

> `| Fifteen order-invariant nulls | programme | P44 |`

The claim, in tracked source, `test/probes/probe-battery-calibration.mjs:340–344`:

> LIMITATION, stated in the report too: the row shuffle only reaches tests that
> read row order. Order-invariant tests contribute their observed flags
> unchanged — LOW on a clean fixture — so the tier fires seen here are
> attributable to the order-dependent tests. This is not a false-positive rate
> for the battery; the fifteen order-invariant nulls are untested.

The phrase "fifteen order-invariant nulls" is a word-for-word match with the roster cell, so the linkage
is exact rather than inferred. The governing principle sits in the same session's untagged banked block,
`SESSION339-CHAT-SUMMARY.md:73–77`:

> **A calibration number is only valid where the null preserves the structure the test reads.**
> Whole-matrix row permutation is valid on column-grouped fixtures and scrambles condition composition on
> row-grouped ones. Within-group permutation is exactly inert for order-invariant tests. Some tests have
> no valid row-permutation null at all.

**P47 — count choice per test.** The homing line, `SESSION340-CHAT-SUMMARY.md:176`:

> `| P47 — count choice per test | STATUS parked | New. Unblocked technically, blocked on the tier decision. |`

The claim, `SESSION340-CHAT-SUMMARY.md:64–67`, under the heading *"Adaptive B, considered and dropped"*:

> Escalating any cell landing within k standard errors of a threshold saves about a third of the budget
> against a flat raise, and buys a data-dependent resample count in exchange. That needs its own
> correctness argument — the count becomes a function of the data, so the null the count was chosen under
> is not the null reported against. Not worth making for a third. **Fixed-but-uncoupled per test is the
> landing point.**

**Attribution basis, stated because it is weaker than the others.** That paragraph is not tagged P47. It
sits in the same session that allocated P47, under a heading on P47's subject, and it is the only text in
the repository that decides the shape of the count. I am reading the linkage off adjacency and subject,
not off a tag. The claim sentence itself is quoted verbatim, not constructed. Read against
`SESSION339-SUMMARY.md:105–110`, which records the constraint any count choice inherits — `createPRNG` is
one stream consumed in dispatch order, so changing one test's count displaces every downstream test's
p-values.

**P49, P51, P54, P58 — S341, tagged and finished.** These need no reconstruction. From
`docs/sessions/SESSION341-CHAT-SUMMARY.md`, `§BANKED additions`:

> `:102` — **P49 — the convergence rule has no stated basis once tiers differ per test.** Two MODERATEs
> across dimensions reach the top band. Both cross-validation models dismantled uniform FPR and neither
> said what makes cards combinable. This is the live methodology question.

> `:108` — **P51 — empirical Monte Carlo uncertainty at calibration time.** The analytic SE is invalid
> here (the reported p is a multiplicity-adjusted minimum over correlated sub-units, not a binomial
> proportion). Per-file empirical estimation is unaffordable — k seeds on a 10,000-row file at 103 s is
> minutes. The affordable version measures which cells and tests carry unstable regions across the corpus
> and ships that as methodology rather than as a per-file estimate.

> `:121` — **P54 — `EFFECT_SIZE.KURTOSIS_DEV` is a hard ceiling, not an adaptive gate.**
> `max(0.20, 1.96·√(24/N))` — the adaptive term only exceeds 0.20 below N ≈ 2300, so on any large file
> the "N-adaptive" gate is a constant. An effect at κDev −0.14 with p 0.0045 cannot be reported at any
> sample size.

> `:135` — **P58 — the doubling replacement, reshaped.** Not "remove the doubling" but "one-sided p on a
> two-sided statistic" — a min-tail-probability or centred-deviation statistic against the null already
> in hand. Halves the floor, preserves two-sidedness, dominates both alternatives. Supersedes P46 as
> posed.

That last sentence also answers STATUS's `**P46** | **never allocated or lost — do not reuse without
checking**`. **P46 was allocated, and it was superseded by P58 at S341.** `SESSION341-CHAT-SUMMARY.md:205`
says it in its own words — *"P46 as posed. Superseded by P58."* The row is recoverable and the register
does not know it.

### The routing failure — the actual root cause

`SESSION341-CHAT-SUMMARY.md:95` heads the block `## §BANKED additions`. `SESSION339-CHAT-SUMMARY.md:53`
heads its own the same way, with the routing slip *"(→ main BANKED)"*. **Neither block reached
`BANKED.md`.** Sampled by distinctive string, `command grep -c` against `BANKED.md`:

| string | S | BANKED hits |
|---|---|---|
| `KURTOSIS_DEV` | 341 | 0 |
| `Monte Carlo` | 341 | 0 |
| `doubling` | 341 | 0 |
| `convergence rule` | 341 | 0 |
| `one-sided p on a` | 341 | 0 |
| `A calibration number is only valid` | 339 | 0 |
| `Pooled dependence is one design pattern` | 339 | 0 |
| `sizes exposure, not incidence` | 339 | 0 |

Eight for eight, across two sessions, both blocks entire. `command grep -E '\bP(41|42|44|47|49|51|54|58)\b'`
returns **zero hits in `BANKED.md`, zero in `CLAUDE.md`, zero in `project-instructions.md`** — so within
Chat's reach the row genuinely is all there is, exactly as the dispatch said.

This is a larger finding than the eight rows. Two whole sessions' banked material was written, routed and
dropped. What survives of S339 and S341 survives because the session summary is on disk, and the session
summary is gitignored.

---

## 2. The two dead references

Both predate the P41 floor. **Neither was renumbered.** Both were resolved — by different routes, and
both resolutions are recorded outside the register.

### P26 — the cardinality guard. Closed on evidence at S328.

The corpus spec answers its own citation. `docs/shared/REALWORLD-CORPUS-SPEC.md:1252`:

> **The cardinality guard is dead, killed on evidence S328 (was STATUS P26).**

Independently, `docs/sessions/SESSION328-SUMMARY.md:153` and `SESSION328-CHAT-SUMMARY.md:25` both carry
the heading **"P26 is killed, not deferred"**, and `SESSION329-CHAT-SUMMARY.md:81` closes it out:

> P26 dead (do not re-derive). C14 rows 262↔263 defect settled. Cost bought at P27 async yielding, not a guard.

**Disposition: closed, correctly, and the citation is a historical note rather than a live pointer.**
`:1252` reads "was STATUS P26" in the past tense and is self-explaining. It is the least urgent of the
three dangling numbers.

### P32 — "the vanishing test". Split in two; both halves resolved under other numbers.

`SESSION329-CHAT-SUMMARY.md:70` is the fullest statement:

> **P32 — the vanishing test.** Sharpest open display defect. C16 with `Treat` alone: Mahalanobis Row
> errors, header counts it, body has no `erroredTests` list to hold it (`ForensicsBody.jsx:445–457`). Two
> parts: display (add an `errored` section) + producer (errored results carry no minimum figure —
> `aggregation.js`).

**The display half** was built at S330 — `SESSION330-CHAT-SUMMARY.md:23` records it committed at
`54874ba` on `claude/p32-errored-section`, **unpromoted**. That commit is *not* an ancestor of `main`
(`git merge-base --is-ancestor 54874ba main` fails) and the branch no longer exists; the object survives
only as a dangling commit. The function shipped by a different route: the S333 split moved not-applicable
and errored out of §3 into §5, and `groupErroredByReason` at `src/analysis/noVerdictReasons.js:166` now
gives errored tests their own "Could not complete" group.

**The producer half** became **P39**. `SESSION331-SUMMARY.md:5` states P39's scope as *"give the 'Not
run' coverage state a real reason on screen, replacing the bare 'Incomplete' count and the false 'No
group had sufficient data' sentence"* — which is P32's producer half word for word. It shipped:
`src/constants/naCause.js` carries the structured codes, and its `:22` block adds `naObserved` /
`naMinimum`, the two numbers `:1138` complains are missing. `src/analysis/aggregation.js:99–101` now rolls
`distinctCauses` off `perGroup` onto the errored result instead of discarding it.

**Disposition: substantively closed, but the corpus spec does not know it, and the instruction at `:1138`
is live and wrong.** It reads:

> Cite this file when P32's producer half is scoped.

The producer half was scoped, built and shipped at S331–S333 under P39. A reader following that
instruction is sent to scope work that already exists. `:1264` carries the same stale framing —
*"STATUS P32's producer half, and this file is the concrete citation for it"*.

**This is the one live defect in Part 2, and it ships.** `REALWORLD-CORPUS-SPEC.md` is tracked. Chat owns
it; nothing was authored here.

### Where P1–P40 went

The register was **truncated, not renumbered**. `SESSION339-CHAT-SUMMARY.md:145` and
`SESSION340-CHAT-SUMMARY.md:183` both carry `| P36, P40 | STATUS parked | Unchanged. |` — so at S339–S340
the table still held rows below P41. From S341 onward those rows are gone from every record, and
`docs/shared/SESSION347-BANKED-IDENTIFIER-AUDIT.md:485` states the consequence flatly:

> STATUS's current register starts at P41 with no crosswalk to the old numbering. `#49` and `P49` are
> different items in different schemes.

Note the second sentence names a *third* scheme — BANKED's bare `#N` items — which is neither the old
P-series nor the current one.

**The P-series itself is continuous.** P26, P32, P36, P39, P40, P41 are one sequence; only the table's
floor moved. So "P26" and "P32" are not from a different numbering system that was mapped onto the
current one — they are earlier rows of the same system that fell off the bottom of the table.

---

## 3. The citation census

**Method.** Walked the repository for `P<digits>` with a non-word-character prefix, over `.md .js .jsx
.mjs .py .sh`, excluding `node_modules`, `dist`, `.git`, `.claude/worktrees`, `corpus-data`, `corpus-out`,
`test/fixtures`, `docs/paper` and `docs/test-artefacts`. The register rows were parsed out of
`STATUS.md` rather than typed — **56 rows, P41–P96**, matching the table's own header.

**Two scopes, because they mean different things.** *Live* is what a reader consults today. *Historical*
is `docs/sessions/`, `docs/shared/archive/`, `docs/archive/` — where a citation to a retired number is a
correct record of its own time, not a dead pointer.

| | occurrences | files |
|---|---|---|
| Total, code + docs | 2,575 | 156 |
| **Live scope** | **1,531** | |
| — resolves to a register row | 587 | |
| — dangling (parked-item form, no row) | **7** | 2 |
| — collision (different job) | 935 | |
| — identifier-string artefact of the pattern | 2 | |
| Historical scope | 1,044 | |

### 3.1 Resolves — 587 live occurrences

Of these, **390 sit in tracked files**, spanning **50 distinct P-numbers** across **32 tracked files**.
Every one points at a register that is gitignored and has never been committed. A reader who clones this
repository can resolve none of them.

| tracked file | citations |
|---|---|
| `docs/shared/SESSION346-REGISTER-CENSUS.md` | 132 |
| `docs/shared/SESSION347-INDEX-VIABILITY-AUDIT.md` | 58 |
| `docs/shared/SESSION347-REGISTER-CENSUS-V1X.md` | 47 |
| `docs/shared/S350-PAIRED-DESIGN-DISPOSITION.md` | 17 |
| `docs/shared/SESSION344-FLOOR-SITE-CENSUS.md` | 14 |
| `docs/shared/S348-SEED-SENSITIVITY.md` | 13 |
| `docs/shared/METHODOLOGY.md` | 11 |
| `docs/shared/SESSION347-BANKED-IDENTIFIER-AUDIT.md` | 10 |
| `test/probes/probe-s348-seed-sensitivity.mjs` | 8 |
| `docs/shared/SESSION350-AUDIT-SUMMARY.md` | 8 |
| `docs/shared/SESSION351-AUDIT-SUMMARY.md` | 8 |
| `src/analysis/engine.js` | 6 |
| `test/batch-fixtures.mjs` | 5 |
| `docs/shared/SESSION349-AUDIT-SUMMARY.md` | 5 |
| 18 further tracked files | 1–3 each |

**On Chat's figure of "about 32".** Derived independently, and it is *exact* for the four files Chat
named — `METHODOLOGY.md` 11 + `S350-PAIRED-DESIGN-DISPOSITION.md` 17 + `V1X-FUTURE-WORK.md` 2 +
`SESSION353-AUDIT-SUMMARY.md` 2 = **32**. The count is right; the **reach** is not. It is 32 *files*, not
32 citations, and 12× the volume.

**A fair reading of the 390.** 250 of them sit in the five S346/S347 register-audit documents, which are
*about* the register — citing it there is the point. The substantive remainder is **140 citations across
27 tracked files**, including **16 in shipped `src/`** (`engine.js` 6, `subjectPairing.js` 3,
`selectiveNoise.js` 3, `crossConditionConsistency.js` 2, `valueFrequencySpike.js` 2) and 3 in
`docs/shared/TEST-GROUND-TRUTH.md`.

### 3.2 Dangling — 3 numbers, 7 occurrences, 2 files

| P | file:line | tracked? | status |
|---|---|---|---|
| P32 | `docs/shared/REALWORLD-CORPUS-SPEC.md:1138` (×2) | tracked | **live and wrong** — instructs a reader to scope work that shipped |
| P26 | `docs/shared/REALWORLD-CORPUS-SPEC.md:1252` | tracked | historical note, self-explaining |
| P32 | `docs/shared/REALWORLD-CORPUS-SPEC.md:1264` | tracked | stale framing — "open as a display item" |
| P39 | `src/constants/naCause.js:1` | tracked | **shipped source** |
| P39 | `src/constants/naCause.js:22` | tracked | **shipped source** |
| P39 | `src/analysis/noVerdictReasons.js:103` | tracked | **shipped source** |

**P39 is the third dangling number and it was not on the dispatch's list.** Three module-header comments
in shipped source key their own design to a number below the register floor:

> `/* ── Structured shortfall / decline codes for N/A results (P39 step 1) ── ...`
> `── Count fields (P39 step 2b) ──`
> `// ── "Not run" reason composition (P39 step 3) ──`

Those comments are the clearest surviving statement of what that arc was and how it was staged, and the
identifier at their head resolves to nothing. Unlike P26 and P32 they carry no "was STATUS" hedge — a
reader takes P39 for a live number and looks it up.

**All seven dangling occurrences are in tracked files.** None is in a gitignored working doc.

### 3.3 Collision — five families, not three, and none touches the register range

| family | notation | where |
|---|---|---|
| Cross-Condition Consistency framework properties | P1–P9 | `METHODOLOGY.md` (86), `METHODOLOGY-MAP.md` (69), `S350-CLASSB-SWEEP-DATA.md` (264), `S349-CCC-LIMIT-DATA.md` (186), `src/tests/crossCondition*.js` (72), ~15 probes, `CLAUDE.md:60` |
| Percentile bounds | `P99−P1` | `docs/shared/V1X-DECIDED.md:104` |
| Corpus plot identifiers | P200, P275 | `REALWORLD-CORPUS-SPEC.md` (5), `BANKED.md:330` (2) |
| **Build-phase / polish-pass numbers** — new | P1, P2 | `INVESTIGATION-DISPLAY-SPEC.md:2050` "Visual polish P1 — report views", `:2065` "Report view P2 items still pending" |
| **Deposit and fixture identifier strings** — new | `P0080`, `P0120`, `P0206` | `TEST-GROUND-TRUTH.md:35` and `test/batch-fixtures.mjs:93` (ProteinIDs); `REALWORLD-CORPUS-SPEC.md:513–516` (`P0206>FoxO WT`, a *Drosophila* GAL4 driver genotype) |

The two new families were found by the census, not predicted. The fifth is the one that will bite a
future automated sweep: `P0206` differs from a parked-item citation only by a leading zero, and a
naive integer parse reads it as P206.

**The strongest single result: no collision numerically overlaps the register.** Counting distinct
integers used anywhere in the repository, **exactly 56 fall inside P41–P96 — the same 56 the table
allocates.** Every collision family sits below P41 (properties, phases, percentile bound) or above P96
(P99, P200, P206, P275). Every non-register integer used at all: 1–9, 16–20, 25–27, 30–32, 34–40, 99,
120, 200, 206, 275 — the 16–40 band being the truncated old register, the rest the collision families.
**The current register's range is uncontested, and the "continue the numbering, do not renumber"
instruction at `STATUS.md:122` is what has kept it that way.**

### 3.4 Historical scope — reported, not enumerated

1,044 occurrences in `docs/sessions/`, `docs/shared/archive/` and `docs/archive/`; 642 cite a number with
no current row. These are not defects. A session summary citing P26 in S328 is a correct record of what
S328 was working on. They are listed here only so the live figures above are not mistaken for repository
totals.

---

## 4. What this audit found that was not asked for

- **P46's row is wrong.** STATUS says *"never allocated or lost — do not reuse without checking"*. It was
  allocated, and `SESSION341-CHAT-SUMMARY.md:135` and `:205` both record it superseded by P58. Chat owns
  the row; this is the check the row asks for.
- **Two whole `§BANKED additions` blocks never landed** (S339, S341), eight distinctive strings sampled,
  zero hits. The eight thin rows are a symptom of that, and the loss is wider than them.
- **`SESSION346-REGISTER-CENSUS.md:145` cross-references P42 to the wrong LOESS item.** Subject match,
  not item match.
- **S347 already measured this defect and named its own limit.**
  `SESSION347-INDEX-VIABILITY-AUDIT.md:266` reports *"seven open allocations whose one-line row is the
  only record anywhere"* — P42, P44, P47, P49, P51, P54, P58, which is this dispatch's eight minus P41.
  The same audit states why it could not go further: *"An index check measures identifier reachability;
  content reachability needs a reader."* This audit is that reader, and the answer is that six of those
  seven are recoverable in full.
- **`docs/sessions/` is load-bearing and gitignored.** Every recovery in Part 1 came from it. A clone of
  this repository cannot reproduce a single one.

---

## Verification

- `npm test` — 17/17 across 4 files. Nothing in `src/` was touched; the run confirms that.
- No batch (nothing in `src/` changed), no preview (no rendering surface).
- Register rows parsed from `STATUS.md` at audit time, not transcribed: 56 rows, P41–P96, matching the
  table's own header line.
- Every search in this audit used `command grep`. Where a negative is reported, the search set is named
  in the row.
- Worktree `s355-register-recovery`, branch `claude/s355-register-recovery`, cut from `main` at `0b8d0e7`.
