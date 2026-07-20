# S328 — C14's duplicate blocks against a cardinality guard

Read-only. Nothing in `src/` changed. No guard built.

**The answer is no. The guard loses blocks, and it loses them to nothing.**

Excluding `Tree ID` and `CROWNCLASS` from the sequence scan drops **40** duplicate
blocks out of what Sequential Duplication can point at. **32 of those are found
by nothing else in the battery**, checked against Duplicate Detection with its
evidence caps lifted. That kills P26 as currently scoped.

---

## What the pipeline actually sees

This matters before any count, because the pipeline's view is not the workbook's.

**Ten of twenty-four columns never reach the analysis matrix.** `STAND_ID` is
tagged `label`. `Species` and `DamageSev` are conditions. Seven measurement
columns are held out as group attributes: `RINGS / in`, `AveGrowth`, `DBH (cm)`,
`DBH (in)`, `Adj DBH slope`, `Tree BA (cm2)`, `Height (m)`.

Twenty-eight rows are dropped at import, leaving 9,398 of 9,426. The surviving
indices are contiguous, so **sheet row = matrix row + 2**.

So the census here agrees on **11 measurement columns**, where a direct read of
the workbook agrees on about twenty. Fewer columns to match on means more rows
collide, and that is the whole of the gap in section 1.

**A consequence worth stating on its own.** The adjudication rests on ring count
and DBH being identical. The tool cannot see either — both are attributes. And
`STAND_ID`, the column whose difference makes the pair a defect rather than a
repeat, is dropped as a label. The tool can say two rows are identical. It cannot
say they are supposedly different stands.

---

## 1. Block census, pipeline view

| | pipeline | Chat, openpyxl |
|---|---:|---:|
| duplicate blocks | **253** | 239 |
| rows covered | **516** | 488 |
| pairs | 244 | 230 |
| triples | 8 | 8 |
| quadruples | 1 | 1 |
| span different `STAND_ID` | **190** | 176 |
| span different `PLOT_ID` | **175** | 164 |
| span different `Tree ID` | **20** | 12 |
| fully adjacent | **8** | 8 |
| largest gap | **1,783 rows** | 1,783 |

**The figures agree in shape and differ in the direction expected.** The pipeline
finds 14 more blocks and 28 more rows, because it agrees on 11 columns rather
than 20. Triples, the quadruple, the adjacent count and the largest gap match
exactly. Chat's census reproduces; the surplus is the columns the pipeline cannot
see, not a disagreement about the data.

The adjudicated pair at sheet rows 262 and 263 is present.

## 2 and 4. What the two categorical columns are carrying

**First, a correction to how "covered" has to be counted.** Sequential
Duplication keeps 83,502 sequences, some spanning 46 rows. On that density,
*overlap* between a sequence and a two-row block happens almost everywhere by
chance — measured that way, all 253 blocks look covered, which is meaningless.

So coverage here means the sequence **explains** the block: its offset equals the
gap between two members, one member sits in the source range and the other in the
destination range. That is the scan actually mapping one row onto the other.

| | blocks |
|---|---:|
| merely touched by some sequence | 253 of 253 (chance) |
| **actually explained by a sequence** | **196 of 253** |
| never mapped by the scan at all | 57 |

With `Tree ID` and `CROWNCLASS` excluded:

| | blocks |
|---|---:|
| explained, all columns | **196** |
| explained, two columns removed | **156** |
| **lost** | **40** |
| whose only explanation was those two columns | 40 |

All 40 lost blocks are pairs. **36 of the 40 span different `STAND_ID`s** — the
signature the PubPeer entry describes. The loss is concentrated in exactly the
population the adjudication cares about.

## 3. What the tool reports today, and one thing it does not

Sequential Duplication: `HIGH`, `primaryP` 7.916861666816705e-69, 83,502 kept
sequences. It explains 196 of the 253 blocks.

**The adjudicated pair is not one of them.** Rows 262 and 263 are explained by no
sequence, with every column in play. The scan needs a run of at least three
consecutive rows recurring at a fixed offset; an isolated adjacent duplicate pair
is a run of one, and falls under the floor.

Duplicate Detection catches it instead — reported as a two-row exact group at
matrix rows 260 and 261. Column by column, the two rows are **identical across
all 14 matrix columns**. The only column in the entire sheet that differs is
`STAND_ID`, which never reaches the matrix.

So a cardinality guard on the sequence scan would not touch the adjudicated pair
either way. It was never the sequence scan's catch.

## The question that decides it: does Duplicate Detection cover the loss?

A block lost from the sequence scan only matters if nothing else finds it.
Duplicate Detection is unaffected by a guard on the sequence scan, so this is the
test. Run with its evidence caps lifted, because the shipped return caps
`groups` and `partialRowLocs` at 20 and `withinRowLocs` at 200 — capped, the
answer would be about what gets printed rather than what gets found.

| | |
|---|---:|
| detected: rows in exact row-duplicate groups | 32 |
| detected: partial-row pairs | 2,485 |
| blocks identical across all 14 columns, so reachable by exact row-dup | **32** |
| blocks differing on an ID column, so unreachable by exact row-dup | **221** |

**Of the 40 blocks the guard would lose:**

| | blocks |
|---|---:|
| also found by Duplicate Detection | 8 |
| **found by nothing afterwards** | **32** |

Stranded blocks, sheet rows: 255+290, 259+287, 316+320, 317+321, 1326+1329,
1327+1330, 1328+1334, 1370+1380, 2431+2467, 2434+2469, 2435+2470, 2974+3001, and
twenty more.

Lifting the caps moved the stranded count from 34 to 32. **The caps were not the
explanation** — the answer is robust to them, which is the point of having
checked.

## 5. The precedent predicate, applied here

`PARTIAL_ROW_CARD_FRAC = 0.02` at `duplicateDetection.js:731` holds a column out
when its largest value group covers more than 2% of rows. Applied to C14's 14
matrix columns:

| col | name | distinct | largest share | verdict |
|---:|---|---:|---:|---|
| 0 | ACTIVITY_ID | 65 | 6.30% | **held out** |
| 1 | PLOT_ID | 90 | 8.61% | **held out** |
| 2 | Tree ID | 16 | 43.76% | **held out** |
| 3 | Stand Av DBH cm | 559 | 1.01% | kept |
| 4 | Stand BA m2/ha | 34 | 14.21% | **held out** |
| 5 | NewGrowthRate | 627 | 2.51% | **held out** |
| 6 | OLD BA Increment | 3,934 | 0.15% | kept |
| 7 | OLD % BA Growth | 3,355 | 0.16% | kept |
| 8 | Crtd BA Incr | 7,569 | 0.09% | kept |
| 9 | Crtd BA Incr % | 7,569 | 0.09% | kept |
| 10 | CROWNCLASS | 5 | 51.25% | **held out** |
| 11 | HEIGHT (ft) | 113 | 3.34% | **held out** |
| 12 | Biomass (kg) | 7,779 | 0.07% | kept |
| 13 | Carbon (kg) | 7,779 | 0.07% | kept |

It would exclude both target columns — and **five others**, seven of fourteen in
total. Among them `ACTIVITY_ID`, which is the current driver of the HIGH verdict
at pAdj 7.92e-69.

**So a guard built on this shape is worse than the one already measured**, not
better. It removes the two categorical columns, the strongest column in the file,
and four more besides. The predicate is calibrated for a different job: holding a
column out of *candidate generation* in a pairwise scan, where a common value
makes a pair uninformative. Reused as a filter on which columns may carry
sequence evidence, it discards evidence.

---

## What this means for P26

As scoped — exclude the low-cardinality columns from the sequence scan — **it does
not survive the measurement.** 40 blocks leave the scan's reach, 32 leave the
battery's reach entirely, and 36 of the 40 carry the cross-stand signature the
adjudication turned on. The performance case was real, and the cost of taking it
this way is evidence.

Three things sit underneath that and are worth separating, because they are not
the same problem:

**The scan's floor, not its cardinality.** The adjudicated pair is invisible to
Sequential Duplication because a two-row duplicate is a run of one against a
floor of three. 57 of 253 blocks are unmapped for the same reason. That is a
coverage boundary and no guard changes it.

**The columns the pipeline discards.** Ring count, DBH, tree basal area and four
more are held out as attributes, and `STAND_ID` is dropped as a label. The tool
is working from 11 measurement columns where the adjudication used about twenty,
and it cannot see the one field that makes the pair a defect. Whether the
group-attribute pass should be holding those out on this file is a separate
question, and a larger one than P26.

**The cost is still real.** Nothing here contradicts the S327 measurement: those
two columns carry 95% of the kept sequences. What has changed is that they are
not idle — they are carrying 40 blocks nothing else finds. Any future attempt
will have to buy the time somewhere that is not the evidence.

I have not proposed a replacement, and this read does not license one.

---

## Caveats

**A number I did not chase.** `duplicateRows` returns 32 and my count of blocks
identical across all 14 columns is also 32. Those are plausibly the same set
counted the same way, but `nRowDups` may count groups, rows, or excess rows per
group, and I did not read far enough to be sure. Reported side by side rather
than asserted as equal.

**Blocks are defined on the pipeline's 11 measurement columns**, which include
`CROWNCLASS`. Chat's census ignored four identifier columns and kept everything
else, so `CROWNCLASS` was in that definition too. Consistent, but it does mean a
"duplicate measurement block" here can be two rows agreeing on a categorical code
among other things.

**Everything is C14.** That the guard loses blocks here does not establish it
would elsewhere, and the corpus sweep in the S327 read found low-cardinality
columns are the norm but only bite at scale. C14 is the only sheet where both
conditions hold.

---

## Worktree

`/Users/hedgehog/Projects/cmd-s328-c14-blocks`, branch `s328-c14-blocks`, cut off
main at `e12c978`.

Tip at close: **`2618fa1`** — the probe. This report commits on top.

Spec grep, for the record and not edited: `REALWORLD-CORPUS-SPEC.md:153` reads
"rows 260↔261 are byte-identical across all twelve non-null columns". On the
pipeline's view the identical pair is at **sheet rows 262 and 263**, matrix rows
260 and 261 — so the spec's figures are matrix rows labelled as sheet rows.
Chat's correction is right.
