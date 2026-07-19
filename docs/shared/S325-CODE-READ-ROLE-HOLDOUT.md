# S325 — Role inference empties C15's data columns (code read, read-only)

Read-only. Nothing was changed. This read establishes the fix. It does not make it.

## Summary up front

- **The group-attribute pass judges a column's grouping levels without checking how many
  rows each level holds.** A column qualifies as a grouping key on its distinct-value count
  alone. When those levels are single rows, "constant within the level" is vacuously true for
  every other column, so every measurement is held out.
- **C15's `VT` is the sparse case.** It carries three real values over sixty rows — vegetation-
  type section headers, one non-null cell per section. The constancy walk skips the fifty-seven
  null rows, leaving three levels of one row each. Every one of the eighteen data columns is
  trivially constant within a single row, so all eighteen are held out and the matrix is empty.
- **Forward-filling `VT` makes the holdout vanish.** Filled into its real three levels of 31,
  19 and 10 rows, the measurements genuinely vary within each vegetation type, no column is
  constant, and all eighteen data columns survive. So `VT` is not a genuine grouping key in its
  deposited form — it is a section header the pass mistook for one.
- **C15 is not alone, and not even the worst.** The pass drives twenty sheets across six files
  to zero data columns, from the opposite cardinality extreme too: high-cardinality numeric
  columns whose distinct count lands just under half the row count also produce near-singleton
  levels. C10's ten experiment sheets all zero out this way.
- **The engine's failure names the wrong axis.** The state is "no data columns survived role
  inference," knowable at the `dataCols` line. Nothing checks it there; the empty matrix
  collapses to zero rows and the engine reports "Matrix has no rows."

## `detectGroupAttributes` at source

`src/import/roles.js`, lines 79 to 165.

**Eligibility as a grouping key** (lines 123 to 126). Any column whose role is not `ignore`,
whose distinct-value count is at least 2 and at most `maxLevels`, where
`maxLevels = Math.floor(nRows * MAX_LEVEL_FRACTION)` and `MAX_LEVEL_FRACTION = 0.5` (line 14).
So a column with anywhere from 2 up to just under half the row count in distinct values is a
candidate key. Numeric or text, dense or sparse — the only gate is the distinct count.

**The constancy test** (lines 128 to 149). For a candidate grouping column `g`, walk the rows.
Two lines carry the defect:

- **Line 138.** `const gv = key[g][r]; if (gv == null) continue;` — rows where the grouping
  column is null are skipped entirely. A sparse column contributes only its non-null rows.
- **Line 144 to 147.** For each attribute candidate, the first numeric value seen in a level is
  recorded; a later, different value in the same level marks the candidate inconsistent. Null
  candidate cells are skipped (line 144, "null is vacuously consistent"). A level that is ever
  visited by only one row can never record a second value, so no candidate is ever marked
  inconsistent against it.

**What it returns.** `{ roles, groupings }` (lines 163 to 164). `roles` is the array with every
held-out column re-roled `attribute`; `groupings` is the provenance, one entry per grouping
column that excluded something. **The caller** on the engine path is `applyGroupAttributes`
(lines 75 to 77), which returns only `roles`. The engine then reads role `data` at
`engine.js:110` to build the matrix; an `attribute` column is not a `data` column and never
enters it.

## Whether sparsity is tested

No. Eligibility is the distinct-value count against the row count (lines 125 to 126), nothing
else. There is no fill-rate test, no distinct-against-non-null-count test, and no run-length
test. The constancy walk actively removes sparsity from view by skipping null grouping-key rows
(line 138), so a column with three real values over sixty-one rows is admitted on the same
terms as a fully populated three-level column — and behaves worse, because its three visited
rows are three separate levels of one row each.

The missing check is not fill rate as such but **level size**. Nothing requires a grouping level
to hold more than one row. Both failure modes below are the same defect seen from two ends: a
sparse column and a near-unique column both produce single-row levels, and single-row levels
make the constancy test vacuous.

## Whether forward-fill happens before or after

Before role inference runs, the data columns are **not** forward-filled. `forwardFill`
(`parser.js:1`) is applied only to the group row of a two-row header, feeding `condPerCol`; the
data columns themselves are never filled. So `detectGroupAttributes` always sees a column in its
raw form, and for `VT` that is the sparse, section-header form.

This is the opposite of the hazard the prompt raised. `VT` is not filled and then judged on
content the file lacks — it is left sparse, and the null rows are then discarded by the walk, so
the judgement runs on three rows and ignores fifty-seven. The consequence is direct, and I
measured it both ways:

- `VT` as deposited (three singleton levels): 18 data columns → **0**. `VT` holds all 18.
- `VT` forward-filled (levels of 31, 19, 10 rows): 18 data columns → **18**. `VT` holds none.

So filling `VT` into the three-level key the data intends does not cause the problem — it cures
it, because within a real thirty-one-row vegetation type the measurements vary and constancy
fails. The defect lives entirely in judging the unfilled column.

## The holdout arithmetic on C15

All eighteen columns are held out for **one** reason, not eighteen. `VT` has three non-null
cells (`Korean pine…`, `Ermans birch…`, `Alpine tundra`), each appearing once. The walk visits
those three rows; each is a distinct level; each level records the first value of every
candidate and never sees a second (line 146 sets `firsts[a]`, line 147 never fires). Every
candidate ends the walk still marked consistent, so every candidate is re-roled `attribute`.
The eighteen columns do not pass a real constancy test — they pass a test that cannot fail when
every level is one row.

## Whether anything guards the outcome

No. `detectGroupAttributes` returns unconditionally (lines 163 to 164); it never checks whether
applying the holdout leaves any `data` column standing. `applyGroupAttributes` (lines 75 to 77)
adds no check. The engine does not check before building the matrix.

Two natural places for a guard, reported without preference:

- **In eligibility (lines 123 to 126)** — require a grouping level to hold more than one row, or
  require the levels to cover most of the non-null rows, so a singleton-level column cannot be a
  key. This addresses the cause: a column that does not actually partition the rows is not a
  grouping key.
- **Before returning (line 163)** — a backstop: if the union of held-out columns would leave
  zero `data` columns, return the roles unchanged. This is blunt but names the invariant the
  engine assumes.

## How wide the problem is

Measured across every corpus sheet and every batch fixture, listing each where the pass re-roles
at least one column. No batch fixture re-roles; the effect is entirely on the real-world corpus.

**Zero data columns after the pass — the state that throws** (20 sheets, 6 files):

| File | Sheets at zero | Trigger |
|---|---|---|
| C10 | all 10 experiment sheets | high-cardinality numeric key (distinct just under half the rows) |
| C11 | Cell cycle Fig 2d, Amplitudes 3j, DE class 4b, Process 4f | mixed near-unique keys |
| C15 | Data, Fig. 3 | sparse section-header key (`VT`, `Vegetation types`) |
| C23 | Sheet1 | near-unique numeric key |
| C25 | Fig. 3b-c, Fig. 3g | near-unique numeric key |
| CORPUS-02 | ATPase Activity | plate-layout key |

**Partial holdout, data columns survive** (some correct, some not):

| File / sheet | base → final data cols | note |
|---|---|---|
| C12 Field survey-data | 36 → 15 | **the design case** — Site (51 levels, ~47 rows each) and the WorldClim variables are genuinely constant within site; this is what the pass exists to catch |
| C07 Mastersheet | 41 → 21 | 25-level keys over 72 rows — borderline, near-singleton |
| C14 Data | 21 → 14 | mixed |
| C16 Sheet1 | 109 → 99 | Z-transformed richness constant within its raw level — plausibly correct |
| C18 | 6 → 1 | 14-to-55-level keys |
| C13, C20 | small holdout | 1–2 columns |

Two triggers, one root cause. A **sparse** column (C15's `VT`, three non-null over sixty) and a
**near-unique** column (C10's OD columns, ~900 distinct over ~1,800 rows, just under the
`maxLevels` cap) both produce single-row levels, and single-row levels make constancy vacuous.
The pass is not wrong to exist — C12 shows it doing exactly its job, removing joined site
attributes that would otherwise read as duplication. What is wrong is that its eligibility admits
keys that do not partition the rows.

A caution on the count: several zero-data sheets are secondary figure sheets a user would not
select, and CORPUS-02 was run and adjudicated successfully in the past (from its CSV form, which
carries a different layout). The audit measures the role-inference outcome per sheet as
reconstructed from the deposited workbook; it does not assert all twenty are imported in
practice. C15's primary Data sheet is a genuine, load-bearing zero.

## Whether the engine's throw is the right failure

No. The state is "zero data columns survived role inference." It is knowable at `engine.js:110`,
where `dataCols = roles.map(...).filter(i=>i>=0)` is empty. Nothing checks it there. The matrix
build at lines 115 to 123 maps every row through the empty `dataCols` to an empty array, and the
`.filter(row => row.some(v => v!==null))` at line 123 drops every empty row — so `matrix` becomes
`[]`, zero rows. `validateMatrix` then hits its first branch, `matrix.length === 0`, and returns
"Matrix has no rows" (`engine.js:21`), which `runFullAnalysis` throws at line 185.

So a column-shaped cause is reported as a row-shaped failure. The `.some` filter at line 123 is
what converts "no columns" into "no rows." `validateMatrix` even carries better-fitting messages
— "Matrix has no columns" and "No numeric columns found" — but they are unreachable here because
the row collapse fires first. The distinguishable point is `engine.js:110`: a check for
`dataCols.length === 0` there would name the real cause before the matrix is built.

## What did not fit

The prompt asked whether `VT` might genuinely be a grouping key, so that C15 needs a role
override rather than an engine change. The measurement answers it: `VT` is a grouping key only
in the sense that a section header is — three labels marking where three blocks begin. Filled,
it partitions the sixty rows into 31, 19 and 10, and holds nothing out. Unfilled, it partitions
nothing and holds everything out. A role override at import (mark `VT` a label, or fill it into
a real key) would fix C15 specifically. But the same singleton-level admission empties C10, C23,
C25 and CORPUS-02 through columns no override was going to catch, so the general defect sits in
`detectGroupAttributes`, not only in C15's roles.

---

`./scripts/dev.sh cmd-s325-role-holdout`
