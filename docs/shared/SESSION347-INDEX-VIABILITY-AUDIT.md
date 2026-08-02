# S347 — Index-viability audit

**Read-only audit of one claim.** `SESSION347-REGISTER-CENSUS-V1X.md` §8.4 says:

> nothing checks that every item has an index row. That check is one line of shell and it is a
> smaller job than the gate.

That holds only where an index exists. This audit measures whether one exists in each of the five
registers, whether it is complete, whether it carries state, and what a check would actually cost.
It also tests §8.4's second claim — that routed-not-deleted is "the same index check, read the
other way".

**It answers the question. It does not design the fix.** Part three is Chat's call.

**Batch: N/A.** Nothing under `src/` is touched.

```
$ git status --porcelain -- src/
(zero lines)
```

---

## §0 — Every number this document uses

Measured at `8ebd868` (this worktree, part A applied). Figures carried from either census are
marked **carried** and are not re-derived here — the precedent is the V1X census §10, which marks
119 as carried and not verified.

### 0.1 Register sizes

| # | Figure | What it counts | Command | Source |
|---|---|---|---|---|
| R1 | **89** | STATUS items — table rows with a P-number first cell, plus `- ` and `N. ` entries in every other section | node walk, §1.2 | measured here |
| R2 | **39** | of R1 that are parked-register rows | `command grep -cE '^\| \*{0,2}P[0-9]+' STATUS.md` | measured here |
| R3 | **50** | STATUS items outside the parked register | R1 − R2 | derived |
| R4 | **197** | BANKED top-level bullets | `command grep -c '^- ' BANKED.md` | measured here |
| R5 | **215** | BANKED census rows (197 + 18 prose-only) | part one §0.3 rule | **carried** |
| R6 | **108** | CLAUDE.md `## Active Conventions` top-level bullets | `command sed -n '98,259p' CLAUDE.md \| command grep -c '^- '` | measured here |
| R7 | **41** | METHODOLOGY-MAP future-work items | part one §0.3 rule | **carried** — six structural forms re-counted at 0.3 and they sum to 41 |
| R8 | **77** | V1X census rows | S347 census §0.3 rule | **carried** |
| R9 | **35** | V1X `###` subsections | `command grep -c '^### ' docs/shared/V1X-FUTURE-WORK.md` | measured here |

### 0.2 Index surfaces

| # | Figure | What it counts | Command |
|---|---|---|---|
| I1 | **2** | registers of 5 with an index under the definition at §1.1 | §2, enumerated |
| I2 | **24** | rows in V1X's `## 6. Cross-references` index (`:1181`–`:1204`) | `command sed -n '1175,1209p' … \| command grep -c '^\| '` → 25, less 1 header |
| I3 | **5** | rows in V1X's `## At a glance` (`:15`–`:19`) | same method on `:11,21` → 6, less 1 header |
| I4 | **39** | rows in STATUS's `## Parked items — the register` (`:127`–`:176`) | = R2 |
| I5 | **20** | V1X subsections holding **their own** index row | `awk -F'\|' '{print $2}'` over `:1181,1204`, `§N.M` extracted, sorted unique |
| I6 | **34** | V1X `###` subsections carrying a `N.M` number | `command grep -oE '^### [0-9]+\.[0-9]+b?'`, sorted unique |
| I7 | **1** | V1X `###` subsection carrying no number (`:639` "Evidence — three files, S334") | `command grep -n '^### [^0-9]'` |
| I8 | **15** | V1X subsections with no index row of their own | (I6 − I5) + I7 = 14 + 1 |
| I9 | **35** | V1X items an index would have to cover | I6 + I7 = R9 |
| I10 | **0** | V1X index rows pointing at a subsection that does not exist | `comm -23` of index against body |

### 0.3 Completeness and reachability

| # | Figure | What it counts | Command / derivation |
|---|---|---|---|
| C1 | **74** | STATUS items carrying a P-number | node walk, §1.2 |
| C2 | **35** | of R3 (outside the parked table) carrying a P-number | C1 − R2 |
| C3 | **15** | STATUS items outside the parked table with **no** P-number | R3 − C2; all 15 listed at §2.2 |
| C4 | **0** | P-numbers cited in STATUS's body that the parked table does not allocate | `comm -13` index against body |
| C5 | **21** | of R2 cited somewhere else in STATUS | `awk 'NR<127 \|\| NR>176' STATUS.md \| command grep -oE '\bP[0-9]{2}\b' \| sort -u \| wc -l` |
| C6 | **29** | of R2 reachable to case material **by P-number** in BANKED, V1X or STATUS's own body | union of three greps, `sort -u`, `comm` |
| C7 | **10** | of R2 with no case material reachable by P-number anywhere | R2 − C6; listed at §2.2 |
| C8 | **22** | P-numbers appearing in BANKED | `command grep -oE '\bP[4-7][0-9]\b' BANKED.md \| sort -u \| wc -l` |
| C9 | **2** | P-numbers appearing in V1X (P43, P45) | same, on V1X |
| C10 | **0** | P-numbers appearing in METHODOLOGY-MAP or CLAUDE.md | same, on each |
| C11 | **6** | structural forms METHODOLOGY-MAP's 41 items take | §2.5, each counted; 8 + 9 + 3 + 2 + 12 + 7 = 41 |

### 0.4 Generatability — can index rows be produced mechanically?

| # | Figure | What it counts | Command |
|---|---|---|---|
| G1 | **161** | BANKED top-level bullets with a bold lead phrase | `^- \*\*(.+?)\*\*` capture, node |
| G2 | **161** | of G1 that are **distinct** — zero collisions | `new Set(...).size` |
| G3 | **36** | BANKED top-level bullets with no bold lead phrase | R4 − G1 |
| G4 | **108** | CLAUDE.md Active Conventions bullets with a bold lead phrase | same capture over `:98,259` |
| G5 | **108** | of G4 that are distinct — zero collisions | `new Set(...).size` |
| G6 | **15** | METHODOLOGY-MAP bullets with a bold lead phrase | same capture, whole file |
| G7 | **160 / 107** | the same two counts under `^- \*\*[^*]+\*\*` instead | see the notation note below |

**Notation note, and it is a live instance of a rule this project already carries.** `G1 = 161`
and `G4 = 108` use a non-greedy capture. The character-class form `^- \*\*[^*]+\*\*` returns
**160** and **107** — it drops any bullet whose bold lead contains nested emphasis, such as
CLAUDE.md's *"Measure what a figure is a figure \*of\* before asserting anything with it"*. Two
regexes that read as equivalent differ by one row each. **A sweep searches the quantity, not the
notation** — the figures above name their regex.

### 0.5 Routing

| # | Figure | What it counts | Command |
|---|---|---|---|
| T1 | 1 / 90 / 23 / 28 / 35 | `→` occurrences in STATUS / BANKED / CLAUDE.md / M-MAP / V1X | `command grep -c '→' <file>` |
| T2 | **14** | bullets in BANKED's `## Relocation-pending rules` (`:348`–`:394`) | `command sed -n '348,394p' BANKED.md \| command grep -c '^- '` |
| T3 | **2** | numbered consolidation flags in that section (`:353`, `:354`) | read at source |
| T4 | **0.041** | Jaccard similarity of BANKED:506's distinctive tokens against CLAUDE.md:110's | node, §4.2 |
| T5 | **4 of 59** | BANKED:506 tokens (≥5 chars) shared with CLAUDE.md:110 | same |

### 0.6 Figures that are judgment, not measurement

Named separately so they are never cited as measured.

- **Every cost estimate at §2.3, §2.4 and §2.5.** These are judgments about work not yet done.
  Each states its basis — an item count and a structural obstacle — but the estimate itself is a
  guess and the obstacle is the part worth reading, not the number.
- **The index definition at §1.1.** Applying "separate from the items themselves" to STATUS's
  parked register is a judgment call, and §2.2 states the case both ways before taking one.
- **Whether CLAUDE.md:110 is BANKED:506's landing.** Part one recorded it as landed there. T4
  measures 4 shared tokens of 59. §4.2 gives a verdict and says it is a verdict.
- **R5, R7, R8 are carried**, not re-derived. R7's six structural forms were re-counted and sum to
  41, which is a consistency check on the carried figure, not an independent re-derivation.
- **C6 measures reachability by P-number, not by content.** §2.2 gives a worked counter-example
  where case material exists and the identifier cannot find it.

---

## §1 — Method

### 1.1 The definition of an index, stated once and applied throughout

> **An index is a surface that lists a register's own items in one place, separate from the items
> themselves.**

Three clauses, each load-bearing:

- **lists the register's own items** — a table indexing the *test battery* (METHODOLOGY-MAP's
  coverage tables) or the *codebase* (CLAUDE.md's Directory Structure) is not an index of the
  register. It indexes something else that the register describes.
- **in one place** — a state recorded inline against each item is not an index. An index is a
  surface you can read without reading the items.
- **separate from the items themselves** — a list where the row *is* the item is the register, not
  an index of it.

A **revision history** is not an index: it is ordered by edit, not by item, and it lists changes
rather than items. Part one already found METHODOLOGY-MAP's register and its own revision history
contradicting each other 80 lines apart, which is what a non-index looks like when it is used as
one.

### 1.2 The STATUS item rule

STATUS uses three item forms in different sections: `- ` bullets, `N. ` numbered entries (Known
bugs, Next priorities), and `| P.. |` table rows. R1 counts all three, folding continuation lines
into their parent item. Without the numbered form the walk reports 0 items for Known bugs and Next
priorities — both of which are entirely numbered — and undercounts R1 by 19.

### 1.3 `command grep` throughout

The shell `grep` is a ugrep wrapper carrying `--ignore-files`, and `BANKED.md`, `STATUS.md`,
`CLAUDE.md` and `project-instructions.md` are gitignored. **Where a pointer's status mattered, the
filesystem was checked as well as git** — the V1X census sprang that trap twice inside the section
that reports it.

---

## §2 — Per register

### 2.1 V1X-FUTURE-WORK.md — an index, 57% complete, carrying state

**Index: yes.** `## 6. Cross-references — source-of-truth for each topic`, `:1175`–`:1209`, 24 data
rows (I2). A second, weaker surface — `## At a glance`, `:11`–`:21`, 5 rows (I3) — summarises the
eight numbered sections rather than listing items, and is not counted as an index under §1.1's
first clause.

**Complete? No, and the gap is larger than the census reported.**

```bash
V=docs/shared/V1X-FUTURE-WORK.md
command grep -oE '^### [0-9]+\.[0-9]+b?' $V | sed 's/^### //' | sort -u > /tmp/body.txt
command sed -n '1181,1204p' $V | awk -F'|' '{print $2}' \
  | command grep -oE '§[0-9]+\.[0-9]+b?' | sed 's/§//' | sort -u > /tmp/idx.txt
comm -13 /tmp/idx.txt /tmp/body.txt      # in body, no index row
comm -23 /tmp/idx.txt /tmp/body.txt      # in index, no body
```

Real output:

```
in body, no index row:  2.13 2.14 2.15 2.3 2.9b 3.1 3.2 3.3 4.1 4.2 4.3 4.4 4.5 4.6   (14)
in index, no body:      (empty)
```

Plus `:639` "Evidence — three files, S334", which carries no number and **the check cannot see at
all** (I7). **15 of 35 subsections have no index row of their own — 43%.** The reverse direction is
clean: **zero index rows point at a section that does not exist** (I10).

**The census's §6.4 figure of 6 was correct at its stated scope and is not the whole number.** It
counted §2 only. Widening to the document gives 15, and the extra nine split two ways:

| group | subsections | why the census's scope missed them |
|---|---|---|
| §4.1–§4.6 | 6 | covered by one parent row, "AI Screening mode (§4)" — indexed as a section, not as items |
| §3.1–§3.3 | 3 | mentioned **inside a prose cell** of the §3 row, not given rows of their own |

**§3.1–§3.3 expose the check's sensitivity to where a reference sits.** A looser command that
matches `§N.M` anywhere in an index row scores them as indexed and returns 11 rather than 15. They
appear in the *role* column of the `Variance-estimator unification (§3)` row — real prose, not a
row. **The stricter form reads only the Topic column and is the one to use**, because the question
is whether an item has a row, not whether its number appears somewhere on the page.

**State or location? State, and substantially.** §6's third column carries the discharge for four
of the six landings the census found — `BUILT S315 (531e180)`, `BUILT S316 (e751523)`,
`trigger + confirm card BUILT S320–S321 … twelve fixes unpromoted`, `Superseded by §5.9 (S340)`.
This index is not a locator. It is a second copy of the state.

### 2.2 STATUS.md — an index, and the only one that is complete in the direction that matters

**Index: yes, with a judgment.** `## Parked items — the register`, `:127`–`:176`, 39 rows (I4). Its
own header states the role: *"This list allocates P-numbers. Nothing else does. Every number lives
here with one line and a state. BANKED, V1X and METHODOLOGY-MAP hold case material and point at
it."*

**The judgment, stated both ways.** Against §1.1's third clause the parked table is arguably not an
index — for the 39 P-numbers themselves, the row *is* the item and there is no separate body.
Counted as an index it is one over two different bodies: STATUS's own other sections, and the case
material in the other registers. **Taken as an index here**, because it is read that way in
practice and because measuring it that way produces the useful result below. A reader who prefers
the strict reading should treat §2.2's figures as a cross-file reachability measurement rather than
an index-completeness one; the numbers do not change.

**Complete? In one direction, perfectly. In the other, no.**

```bash
command grep -oE '^\| \*{0,2}P[0-9]+' STATUS.md | command grep -oE 'P[0-9]+' | sort -u > /tmp/idx.txt
awk 'NR<127 || NR>176' STATUS.md | command grep -oE '\bP[0-9]{2}\b' | sort -u > /tmp/body.txt
comm -13 /tmp/idx.txt /tmp/body.txt   # cited in body, not allocated
comm -23 /tmp/idx.txt /tmp/body.txt   # allocated, never cited in body
```

Real output:

```
cited in body, not allocated:  (empty)
allocated, never cited in body: P42 P43 P44 P45 P46 P47 P48 P49 P50 P51 P54 P55
                                P58 P64 P68 P72 P74 P78   (18)
```

**C4 = 0 is the strongest single result in this audit.** Every P-number STATUS cites anywhere in
its own body is allocated in its own table. Not one dangling pointer, against 39 allocations and 21
citations. **This is the only namespace in the five registers with no dead pointer in it.**

The other direction, measured per section:

| STATUS section | items | carrying a P-number |
|---|---|---|
| Cross-validation | 4 | 3 |
| Known bugs | 13 | **13** |
| Accepted limitations | 17 | **6** |
| Parked items — the register | 39 | 39 |
| Pending verification | 7 | 5 |
| v1.0 blockers | 3 | 2 |
| Next priorities | 6 | **6** |
| **total** | **89** | **74** |

**35 of the 50 non-parked items carry a P-number (70%). Accepted limitations carries 6 of 17** and
is the whole of the shortfall — nine of its twelve unnumbered items are the constants-and-counts
observations banked at S343–S345, which read as findings rather than as work and were never
allocated. The two sections that route work — Known bugs and Next priorities — are at 100%.

**Case-material reachability, and the limit of any identifier check.** Of the 39 allocations, **29
are reachable by P-number** to case material in BANKED, V1X or STATUS's own body. **10 are not**:
P42, P44, P46, P47, P48, P49, P51, P54, P55, P58. Three of those are legitimately empty (P50 and
P55 closed, P46 unknown), leaving **seven open allocations whose one-line row is the only record
anywhere**.

**P48 is not one of them, and that is the finding.** Part one recorded P48's case material at
`BANKED:516`. That line reads *"(S342, P61) The Cross-Condition Consistency gate suppresses a
detection inside DS12b's planted mechanism"* — it carries **P61**, not P48, because STATUS's own
row says P48 is *"carried by P61"*. **The material exists and the identifier cannot reach it.** An
index check measures identifier reachability; content reachability needs a reader. C6 is therefore
a floor on how much case material exists, not a count of it.

**State or location? State.** The third column is a state column: 18 rows read `open`, and the rest
carry `closed at 280508d`, `unknown`, `part one landed 29fb543 — 7 of 23 plus bhFDR; 16 shuffle
sites open`, and six other qualified variants. Like V1X's, this index is a second copy of the state.

### 2.3 BANKED.md — no index

**Index: none.** 41 `##` sections, no contents block, no summary table. The opener at `:3` describes
the file's purpose and does not list its items.

**Completeness check: not possible, and the reason is stated in the register's own opener.**
BANKED:3 reads: *"No dates and no line numbers — both drift; filename plus 'next X-touching
session' is enough to relocate."* **BANKED explicitly refuses the only identifier an index could
key on**, and it holds no other — C8 shows 22 P-numbers across 197 bullets, so fewer than one
bullet in eight carries a stable name. Every external citation of a BANKED item, including both
censuses and STATUS's own duplicate-of column, addresses it as `BANKED:<line>` — the exact form the
file says it will not use.

**Cost, and it is judgment (§0.6).** 215 rows under part one's rule (R5), of which 161 carry a
distinct bold lead phrase and 36 carry none (G1, G3). A row would need the lead phrase, the section,
a state and a routing target. **The generation is cheap and the residue is not:**

```bash
command grep -cE '^- \*\*[^*]+\*\*' BANKED.md      # 160 rows generated in one line
```

- **161 of 197 top-level bullets generate cleanly**, with **zero collisions** (G2) — the lead
  phrases are already unique, so they would work as identifiers today.
- **36 bullets have no bold lead** and would each need a name written by hand. They are the older
  surface-residual entries (`- Raw-integer \`Severity ${...}\` residue …`, `- excelExport case
  consistency …`) whose first clause is a description, not a title.
- **18 prose-only items** carry no bullet at all and cannot be reached by any bullet regex.
- **Three bullets open a bold span that does not close on the same line** (`:417`, `:462`, `:470`),
  so a line-oriented capture drops them silently rather than erroring.

**The obstacle is not the 36 or the 18. It is that adding identifiers reverses a stated editorial
decision** — and that is a Chat call, not a shell job.

### 2.4 CLAUDE.md — no index, and it is the cheapest of the five to give one

**Index: none.** 12 `##` sections. `## Directory Structure` (`:17`–`:40`) indexes `src/`, and
`## Test → display map` points at a generated file about the battery — neither indexes CLAUDE.md's
own items, so both fail §1.1's first clause.

**Completeness check: not possible today.**

**Cost, and it is judgment (§0.6).** 108 items (R6), and the structural obstacle is **absent**:

```bash
command sed -n '98,259p' CLAUDE.md | command grep -cE '^- \*\*[^*]+\*\*'    # 107
```

- **108 of 108 Active Conventions bullets carry a bold lead phrase, all 108 distinct, zero
  collisions** (G4, G5). Not one exception in the whole section.
- The generated rows read as titles already — `STOP AND CHECK: Am I over-analyzing?`, `Surgical
  changes only.`, `Dead-code prune discipline.`, `Plan multi-step work.`, `Write in plain English.`

**CLAUDE.md is the one register where an index is genuinely one line of shell.** But §3 shows why
building one would not help with the failure class this audit exists for: all 108 of its items are
decision records, none is work owed, and part one found CLAUDE.md holds **zero P-numbers** (C10).
An index of it would be a locator with nothing to say about landing, because nothing in it lands.

### 2.5 METHODOLOGY-MAP.md — no index, and the most expensive to give one

**Index: none.** Part one said so and it re-measures true. The file carries 25 tables; every one
indexes the battery, the dimensions or the archetypes. `## Revision history` (`:581`) is ordered by
edit and is not an index under §1.1.

**Completeness check: not possible today.**

**Cost, and it is judgment (§0.6).** 41 items (R7) — but **no single command enumerates them,
because they take six different structural forms** (C11):

| form | section | items |
|---|---|---|
| table rows | Gap audit (`:307`–`:323`) | 8 |
| bolded-numbered entries `**N. Title.**` plus lettered `(a)/(b)/(c)` sub-entries | Inconsistencies to fix (`:492`–`:520`) | 9 |
| `- ` bullets | Tolerable inconsistencies (`:521`–`:528`) | 3 |
| `###` subsections | Planned tests (`:529`–`:540`) | 2 |
| bolded Tracks `**Track X — …**` plus Track A's five numbered sub-items | Implementation sequencing (`:541`–`:568`) | 12 |
| `N. ` numbered list | Open questions (`:569`–`:578`) | 7 |
| **total** | | **41** |

`command grep -cE '^- \*\*[^*]+\*\*'` returns **15** against 41 items (G6) — the bullet form covers
under a fifth of them.

**This is why part one had to invent a counting rule mid-census, and it is the same obstacle.** An
index here needs either six extraction rules or a structural normalisation of the register first.
**Of the three registers with no index, METHODOLOGY-MAP is both the one that most needs one — 21 of
its 41 items landed and 19 of the 21 say nothing about it — and the one where the check is least
like one line of shell.**

### 2.6 Summary

| register | index? | where | items | indexed | complete? | carries |
|---|---|---|---|---|---|---|
| **V1X-FUTURE-WORK.md** | **yes** | `## 6.` `:1175`–`:1209`, 24 rows | 35 | 20 | **no — 15 missing (43%)**; reverse clean | **state** + location |
| **STATUS.md** | **yes** | `## Parked items` `:127`–`:176`, 39 rows | 89 | 74 carry a P-number | **partial — 15 of 50 non-parked items unnumbered**; **zero dangling** | **state** + location |
| **BANKED.md** | no | — | 215 | — | n/a | — |
| **CLAUDE.md** | no | — | 108 | — | n/a | — |
| **METHODOLOGY-MAP.md** | no | — | 41 | — | n/a | — |

---

## §3 — What this does to §8.4's claim

**"That check is one line of shell" is true of two registers and false of three, and the split is
not where it looks.**

The check ran as one command on V1X and on STATUS, and both produced a real completeness figure.
It cannot run on the other three — **not because they lack identifiers, but because they have no
index to check against.** That distinction matters for part three:

| register | has an index | could generate one mechanically | would it help with landed-not-marked |
|---|---|---|---|
| V1X | yes | — | yes, and demonstrably does |
| STATUS | yes | — | yes, and it is the only namespace with zero dangling pointers |
| CLAUDE.md | no | **yes — 108 of 108, zero collisions** | **no — all 108 items are decision records; nothing lands** |
| BANKED | no | partly — 161 of 197, plus 36 by hand and 18 unreachable | yes, and it holds the most unsettled work |
| METHODOLOGY-MAP | no | **no — six structural forms, no single rule** | **yes, and most urgently — 19 of its 21 landings are unmarked** |

**The two registers where an index would help most are the two where it is hardest to build.** The
one where it is trivial is the one where it would do nothing. That inverse relationship is the
audit's main result, and it is not something §8.4 anticipated.

**Redundancy's benefit is bounded by index completeness, and V1X's index is 57% complete.** The
V1X census measured redundant marking taking landed-but-unmarked from METHODOLOGY-MAP's 90% down to
25%, with no tooling. This audit locates the residue: **both of V1X's two unmarked landings sit in
the 43% of subsections that have no index row.** §2.3 has no row because the row that should be its
own points at §2.2 instead; §2.4 has a row, and its landing is recorded only in the section body,
which the index row does not repeat. The mechanism works where it is applied and the 43% is exactly
where it is not.

**Both indexes carry state, and that cuts both ways.** The prediction was that at most one would,
and that state in an index is a second place for a landing to go stale. Both do carry state. But
V1X's redundancy measurably worked, so on this evidence the second-place-to-notice effect dominates
the second-place-to-go-stale risk — with the qualification that it only operates over the 57% the
index covers. **A state-carrying index is not free: it is a second copy, and the V1X census already
found the two copies disagreeing** (`:1182` says *"Most of Track A landed S95"* while §2.3's body
says *"some of which may not have landed"*). The index was right and the section was wrong, which
is the good case. Nothing guarantees the direction.

---

## §4 — The second question: routed-not-deleted

§8.4 calls this "the same index check, read the other way" and does not measure it. **It is not the
same check, and an index cannot detect it. Measured, not asserted.**

### 4.1 Routing is everywhere and it is not indexed

`→` occurrences: STATUS 1, BANKED 90, CLAUDE.md 23, METHODOLOGY-MAP 28, V1X 35 (T1). The closest
thing to a routing register in the five is **BANKED's `## Relocation-pending rules` (`:348`–`:394`)
— 14 bullets and 2 consolidation flags** (T2, T3), whose own heading reads *"homed elsewhere when
the destination edit lands"*. It lists routed items. It records no landing.

### 4.2 Why an index cannot detect either failure — the measurement

Part one found routing drift running both ways. Re-measured against CLAUDE.md today:

| item | part one's finding | grepped in CLAUDE.md now |
|---|---|---|
| `BANKED:577` "A verification grep tests content and line-wrapping at once" | routed → CLAUDE.md, never landed | **0 hits** |
| `BANKED:579` "A directory under `.claude/worktrees/` is not a worktree" | routed → CLAUDE.md, never landed | **0 hits** |
| `BANKED:506` "Workbook extent is not analysis row count" | landed at CLAUDE.md:110, source never deleted | **0 hits** |
| consolidation flag 2 (`BANKED:354`) "Read source over the summary" | landed at CLAUDE.md:116, source never deleted | **1 hit** |

**A landed item and an unlanded item return the same number.** `BANKED:506` is recorded as landed
and greps zero, exactly like the two that did not land.

The reason, measured:

```
BANKED:506 distinctive tokens (≥5 chars): 59
shared with CLAUDE.md:110               :  4   ->  column figure different because
Jaccard                                 :  0.041
```

**Routing lands as a rewrite, not a copy.** CLAUDE.md:110 carries a different pair of worked
examples entirely — the sequence-scan dedup prediction and the C14 slice count — where BANKED:506
carries the C25 and C10 workbook-extent instances. They share a session tag and a genus. **Whether
that counts as the same item landing is a judgment (§0.6), and my verdict is: the general rule
landed, the four instances did not.** Part one's "landed at CLAUDE.md:110" is defensible at the
level of the rule and overstated at the level of the content.

**Either way the audit result is the same, and it does not depend on which verdict you take:** no
text-matching check can distinguish the two states, because the landed case and the unlanded case
produce identical output.

### 4.3 The answer, plainly

**An index cannot detect routed-not-deleted, in either of its two forms.**

- **An index is a claim about this file's items. Routing is a claim about another file's contents.**
  An index can record *that* an item was routed and *where* — V1X's §6 already has a
  source-of-truth column doing exactly this. It cannot check whether the destination now holds it,
  because that is not a fact about the indexed register.
- **Even given the destination, matching fails**, because routing rewrites. §4.2 is the measurement:
  4 shared tokens of 59.

**What would detect it.** Not an index, and not a grep. The only mechanism that survives a rewrite
is one that does not depend on the text: **the routing entry carries the destination and the commit
that landed it, and the check verifies the commit touched the destination file.** `BANKED:506`
already does half of this — it ends *"→ REALWORLD-CORPUS-SPEC §0.4 run protocol (landed S327),
CLAUDE.md verification"*, naming two destinations and marking one landed inline. The other
destination is unmarked, and that unmarked half is the one still sitting in BANKED. **The register
already knows the shape of the fix and applies it to one destination out of two.**

**This is a genuine "cannot", and it changes part three's shape.** Landed-not-marked and
routed-not-deleted do not share an instrument. Redundant marking addresses the first and is
measurably effective where an index covers the item. It does nothing for the second.

---

## §5 — Expectations

**1. Two registers have an index and three do not — HELD on the count, wrong on the membership.**
Two of five: V1X and **STATUS**. The prediction named V1X yes, METHODOLOGY-MAP no, and the other
three unknown. STATUS's parked register is the second index, and it is the better of the two on the
direction that matters — **zero dangling pointers against 39 allocations** (C4).

**2. The one-line check works on V1X and on nothing else — PARTIALLY INVERTED.** It works on two,
not one, and a single command does **not** work across all five. But the reason it fails on the
other three is not the one predicted. CLAUDE.md's flat list turns out to be the **most** indexable
surface of the five — 108 of 108 bullets, zero collisions — and BANKED's bullets carry 161 distinct
lead phrases. **Neither is blocked by identifiers. Both are blocked by not having an index.** The
one register genuinely blocked at the identifier level is METHODOLOGY-MAP, at six structural forms.

**3. Every index carries location, and at most one carries state — INVERTED. Both carry state.**
STATUS's parked table has an explicit state column; V1X's §6 carries the discharge for four of six
landings in its role column. The predicted consequence — a second place for a landing to go stale —
is real and has already occurred once (`V1X:1182` against §2.3's body). On the evidence the
second-place-to-notice effect still dominates, but only across the 57% of V1X's subsections the
index actually covers.

**4. An index cannot detect routed-not-deleted — HELD, and measured rather than argued.** §4.2
shows a landed item and two unlanded items all returning 0 hits, and gives the mechanism: routing
rewrites, Jaccard 0.041. §4.3 names what would work instead — a destination plus a landing commit —
and notes that `BANKED:506` already does it for one of its two destinations.

**5. Nothing under `src/` changes — HELD.** Zero lines.

**A sixth result the dispatch did not predict.** **The registers that most need an index are the
ones where it is hardest to build, and the one where it is trivial does not need it.**
METHODOLOGY-MAP has 19 of 21 landings unmarked and six structural forms; BANKED holds 88 unsettled
task rows and an editorial rule against identifiers; CLAUDE.md indexes in one line and holds no work
at all. §8.4's "one line of shell" is true, and true of the wrong register.

---

## §6 — The number sweep

Every integer in this document's prose and tables, checked against §0. Line references, commit
hashes, section numbers, session tags and percentages derived in place are excluded and listed at
the foot.

| figure | appears as | §0 entry or in-place derivation | verdict |
|---|---|---|---|
| 89 · 39 · 50 | STATUS items / parked rows / non-parked | R1, R2, R3 = R1−R2 | ✓ |
| 197 · 215 | BANKED bullets / census rows | R4 measured; **R5 carried** | ✓ |
| 108 | CLAUDE.md Active Conventions | R6 | ✓ |
| 41 | METHODOLOGY-MAP items | **R7 carried**; six forms re-counted at C11 and sum to 41 | ✓ |
| 77 · 35 | V1X census rows / `###` subsections | **R8 carried**; R9 measured | ✓ |
| 2 · 3 | registers with / without an index | I1; 5 − I1 | ✓ |
| 24 · 5 | V1X index rows / At-a-glance rows | I2, I3 | ✓ |
| 20 · 34 · 1 · 15 · 14 | own index row / numbered / unnumbered / missing / missing-and-numbered | I5, I6, I7, I8 = (I6−I5)+I7 | ✓ |
| 43% · 57% | V1X index incompleteness / coverage | 15/35 and 20/35 | ✓ |
| 0 | index rows pointing at no section | I10 | ✓ |
| 11 · 6 · 9 · 3 | looser-check result / census §6.4 scope / the difference / §3.x prose-indexed | §2.1, each derived in place | ✓ |
| 74 · 35 · 15 · 0 · 21 · 29 · 10 · 7 | STATUS P-coverage figures | C1, C2, C3, C4, C5, C6, C7; 7 = C7 − 3 empty rows | ✓ |
| 22 · 2 · 0 | P-numbers in BANKED / V1X / M-MAP+CLAUDE | C8, C9, C10 | ✓ |
| 70% · 100% | non-parked P-coverage / Known bugs and Next priorities | 35/50; 13/13 and 6/6 from §2.2's table | ✓ |
| 13 · 17 · 6 · 4 · 3 · 7 · 5 | STATUS per-section item and P counts | §2.2 table, node walk of §1.2 | ✓ |
| 161 · 36 · 108 · 15 | bold lead phrases: BANKED / BANKED without / CLAUDE / M-MAP | G1, G3, G4, G6 | ✓ |
| 160 · 107 | the same two under the character-class regex | G7, with the notation note at 0.4 | ✓ |
| 18 · 3 | BANKED prose-only items / unclosed-bold lines | R5 − R4 = 18; three listed at §2.3 | ✓ |
| 6 · 8 · 9 · 3 · 2 · 12 · 7 | M-MAP structural forms and their item counts | C11, table at §2.5, sums to 41 | ✓ |
| 1 · 90 · 23 · 28 · 35 | `→` per register | T1 | ✓ |
| 14 · 2 | Relocation-pending bullets / consolidation flags | T2, T3 | ✓ |
| 0.041 · 4 · 59 | Jaccard / shared tokens / total tokens | T4, T5 | ✓ |
| 0 · 1 | grep hits for the four routed items | §4.2 table, each command shown | ✓ |
| 12 · 25 | CLAUDE.md `##` sections / M-MAP tables | `command grep -c '^## ' CLAUDE.md`; `command grep -cE '^\|-{2,}'` on M-MAP | ✓ |
| 19 · 21 · 90% · 25% · 88 | METHODOLOGY-MAP landings / total / unmarked fractions / BANKED unsettled task rows | **all carried** — part one §6.1 and the V1X census §5.4, §9 | **⚠ carried, not verified** |
| 80 | lines between METHODOLOGY-MAP's register and its revision history | **carried** from part one §5.2 | **⚠ carried, not verified** |
| 8 | of BANKED's 22 — "fewer than one bullet in eight" | 22/197 ≈ 1 in 9; stated as a bound | ✓ |

**Figures carried without re-measurement, listed together so they are not read as measured here:**
R5 (215), R7 (41), R8 (77), METHODOLOGY-MAP's 19-of-21 and 90%, V1X's 25%, BANKED's 88 unsettled
task rows, and the 80-line distance inside METHODOLOGY-MAP. Every one comes from part one or the
V1X census and is cited as theirs.

**Excluded from the sweep:** line references (`:1182`, `:348`–`:394`, …), commit hashes, section
numbers (§2.9b, 4.2.1, …), session tags (S327, S345), P-numbers, and the `.gitignore` line numbers.

**Corrected during the sweep**, recorded rather than silently applied:

- An earlier pass gave V1X's unindexed count as **11**, from a command matching `§N.M` anywhere in
  an index row. That form scores §3.1–§3.3 as indexed because they appear inside a prose cell. The
  strict form — Topic column only — gives **14 numbered plus 1 unnumbered = 15**. Both commands are
  shown at §2.1 so the difference is visible rather than asserted.
- An earlier pass gave BANKED's bold-lead count as **164** from `command grep -coE '^- \*\*'`. That
  counts lines that *open* a bold span, including three that never close it. The capture-based rule
  gives **161**. Both figures appear at 0.4 with their rules.
- An earlier pass said METHODOLOGY-MAP carries **20** tables. Measured with `command grep -cE
  '^\|-{2,}'` it is **25**. The 20 was counted off a truncated `head -20` listing and never
  re-run without the truncation — a figure taken from a display limit rather than from the file.
- An earlier pass reported STATUS as having **0 items** in Known bugs and Next priorities, because
  the walk matched only `- ` bullets. Both sections are numbered. The corrected walk (§1.2) finds
  13 and 6, and R1 moves from 70 to **89**.

---

## §7 — Verification

**`git status --porcelain -- src/`** → zero lines, actual output empty.
**Batch: N/A.** Nothing under `src/` is touched.

**The index definition** is at §1.1, stated once and applied to all five registers.

**Per register** — index or none with line range, completeness both directions, state or location,
the check with its real output, and the cost estimate where there is none: §2.1 through §2.5,
summarised at §2.6.

**The completeness checks, as commands, with real output:**

```bash
# V1X — 14 numbered subsections with no index row; reverse direction empty
V=docs/shared/V1X-FUTURE-WORK.md
command grep -oE '^### [0-9]+\.[0-9]+b?' $V | sed 's/^### //' | sort -u > /tmp/body.txt
command sed -n '1181,1204p' $V | awk -F'|' '{print $2}' \
  | command grep -oE '§[0-9]+\.[0-9]+b?' | sed 's/§//' | sort -u > /tmp/idx.txt
comm -13 /tmp/idx.txt /tmp/body.txt
#   2.13 2.14 2.15 2.3 2.9b 3.1 3.2 3.3 4.1 4.2 4.3 4.4 4.5 4.6
comm -23 /tmp/idx.txt /tmp/body.txt
#   (empty)
command grep -n '^### [^0-9]' $V
#   639:### Evidence — three files, S334        <- the check cannot see this one

# STATUS — zero dangling; 18 allocations never cited elsewhere in the file
command grep -oE '^\| \*{0,2}P[0-9]+' STATUS.md | command grep -oE 'P[0-9]+' | sort -u > /tmp/idx.txt
awk 'NR<127 || NR>176' STATUS.md | command grep -oE '\bP[0-9]{2}\b' | sort -u > /tmp/body.txt
comm -13 /tmp/idx.txt /tmp/body.txt
#   (empty)
comm -23 /tmp/idx.txt /tmp/body.txt
#   P42 P43 P44 P45 P46 P47 P48 P49 P50 P51 P54 P55 P58 P64 P68 P72 P74 P78

# BANKED / CLAUDE.md / METHODOLOGY-MAP — no index exists, so no check runs.
# What a generator would produce, and what it would miss:
command grep -cE '^- \*\*[^*]+\*\*' BANKED.md                            # 160 of 197
command sed -n '98,259p' CLAUDE.md | command grep -cE '^- \*\*[^*]+\*\*' # 107 of 108
command grep -cE '^- \*\*[^*]+\*\*' docs/shared/METHODOLOGY-MAP.md       #  15 of  41
```

**The routed-not-deleted answer** is at §4.3: **an index cannot detect it**, in either form, and
§4.2 is the measurement rather than the argument — a landed item and two unlanded items all return
0 hits, because routing rewrites (Jaccard 0.041, 4 shared tokens of 59). What would detect it is a
destination plus a landing commit, and `BANKED:506` already writes that for one of its two
destinations.

**The number sweep** is at §6, with three corrections recorded.

**Nothing renders.** No preview, no screenshot.

---

## Provenance

Read-only audit, S347, measured at `8ebd868`. No register was edited. No fix was applied, designed
or proposed. Part three is not scoped here — this audit settles one input to it: whether redundant
marking generalises. **It does not. It works on the two registers that already have an index, and
the two that need it most are the two where building one is not one line of shell.**

**No CLAUDE.md convention change is proposed.** One candidate surfaced and is reported rather than
landed: the notation note at §0.4 — two regexes that read as equivalent returning 161/108 against
160/107 — is a fresh instance of the existing rule *"A sweep searches the quantity, not the
notation"* (CLAUDE.md `:109`), not a new rule. It needs no amendment.
