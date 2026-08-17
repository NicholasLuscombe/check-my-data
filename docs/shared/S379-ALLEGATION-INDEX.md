# S379 — the allegation index, and the sheet-level contrast

**Written while the run is in flight, after 13 of 49 sheets were visible and before the artifact
exists.** That ordering is stated because it is the whole protection this file offers. The
classification below is decidable from sheet names and column headers alone. It never looks at a flag.

**This is a secondary read. It is not the pre-registered measurement** and must never be reported as
one. The measurement is `S379-MEASUREMENT-SELECTION-RULE.md`: twelve deposits, one observation each.

---

## 1. Why this is worth doing at all

The deposit-level number is heading for 12 of 12 at severity 3, and §5 of the selection rule already
ruled that uninterpretable — every one of the twelve carries a live allegation of the exact defect
class the battery detects, so a flag might be correct.

**The sheet level can remove that confound for most of the corpus.** Each allegation names one sheet,
sometimes explicitly. C10's names the *P. megatetrium* Experiment 1 tab, and C10 has nine sheets.
C15 has eleven and the allegation touches one. Across the twelve deposits, roughly two thirds of the
49 sheets have never had a complaint made about them.

**If sheets nobody has alleged anything about fire as hard as the alleged ones, the confound is gone
and the number becomes interpretable.** Not as a rate — as a specificity statement about the tool on
real deposited data. That is a stronger result than any interval n = 12 can buy, and it runs in the
opposite direction from comfort.

## 2. The rule, fixed now

Every sheet takes one of three states, decided from **deposit ID, sheet name and column headers only**.

- **A — alleged.** The PubPeer text names this sheet, or names columns that appear in it.
- **U — unalleged.** The sheet holds none of the named columns and is not named.
- **? — undecidable.** Cannot be settled from the spec plus headers without judgement.

**The `?` bucket is reported, never forced.** A sheet pushed from `?` into `U` after the flags are
known is exactly the fitting this file exists to prevent.

**The `or` clause is under-specified, and S379 found its failure case twice.** "Names columns that
appear in it" makes any sheet sharing a header with the alleged sheet automatically alleged.
`C20 :: Environmental gradient` carries `Glucose_IR`, `Lignin_IR` and `Basal_respiration` verbatim
while the thread scopes the complaint to "the microcosm soil data"; `C22 :: Exp. OA` carries `pH` and
`week8` while the thread names the WA experiment. Both went to `?`. **The rule was not repaired once
its failure cases were visible, because repairing a classification rule after seeing what it gets
wrong is fitting.** A successor corpus states the scope test first: a named experiment or tab bounds
the column test rather than standing as an alternative to it.

## 3. What the contrast can and cannot support

**It cannot carry an interval.** Sheets in a workbook share a lab, an instrument, a pipeline and an
author. That non-independence is precisely why S378 fixed the unit as the deposit, and it does not stop
being true here. **No Clopper-Pearson at sheet level, at any point, for any reason.**

**It cannot show that an unalleged sheet is honest.** Nobody examined it. Absence of an allegation on
sheet 7 of 9 almost always means nobody opened sheet 7. That is the point — it is closer to an
unexamined file than anything else the corpus holds — but it is not a clean label.

**It can show whether the firing tracks the alleged defect.** That is a contrast between two groups
measured on the same instrument, and it needs no independence assumption at all.

## 4. The allegation index — where each deposit's complaint actually points

| ID | Sheets | The allegation names | Expected split |
|---|---|---|---|
| C07 | 5 | total / organic / inorganic phosphorus columns; no sheet named | 1 A, 4 U, headers decide |
| C09 | 2 | SLA, LA, LM columns; no sheet named | 1 A, 1 U |
| C10 | **9** | **the *P. megatetrium* Experiment 1 tab**, columns `OD 1.0_4` and `OD 1.0_5` | **1 A, 8 U — the strongest case in the corpus** |
| C13 | 2 | `Leave 13C atom`, `Branches 13C atom`, and separately `0-15 Soil 13C‰` / `15-30 Soil 13C‰` | possibly 2 A, 0 U |
| C14 | 2 | growth rows in `Tree-DBH-BA_and_BM_Growth-Data-BySps.xlsx`; no sheet named | 1 A, 1 U |
| C15 | **11** | soil nitrogen-form and leaf concentration values for named plots and species | **1 A, 10 U** |
| C17 | 5 | **the Neural data sheet**, FPN / CON / DMN pre and post | 1 A, 4 U |
| C18 | 2 | **Sheet 2, `chill coma recovery duration(s)`** — and it is a **count mismatch, not a duplication** | 1 A, 1 U |
| C19 | 1 | total carbon, total nitrogen, C/N at timepoints 3 and 4 | 1 A, 0 U |
| C20 | 5 | **the microcosm soil data**, `Glucose_IR`, `Lignin_IR`, `Basal_respiration` | 2 A (soil A and B), 3 U |
| C22 | 4 | **the WA experiment**, pH at week 8 | 1 A, 3 U |
| C24 | 1 | windscreen splatter counts, 2001 and 2005 | 1 A, 0 U |

**Roughly 13 alleged against 34 unalleged, with the split resting on header reads for C07, C09, C13,
C14, C15 and C20.** Three deposits — C19, C24 and possibly C13 — contribute no unalleged sheet and drop
out of the contrast.

**On C10's two `OD` columns, and the reasoning matters as much as the answer.** They are generic
instrument labels present on all nine tabs, and the thread names a single tab and scopes the columns to
it. **A label appearing on every sheet identifies none of them.** The decision follows from the rule
alone. **No consequence for the contrast was weighed, and none may be** — "treating them otherwise
would destroy the contrast" is an outcome-based reason and disqualifies itself, even where the
decision it defends is right.

**C18 is the sharpest single sheet in the corpus and it is easy to lose.** Its allegation is a count
mismatch against the methods section, not a duplication. So even its *alleged* sheet is an honest trial
for every duplication test in the battery.

## 5. What I expect, and why it is worth little

**I expect the unalleged sheets to fire nearly as hard as the alleged ones.** State plainly why that
carries no weight: I have already seen thirteen sheets at severity 3 spanning more than one deposit,
so this is not a blind prediction and must not be scored as one.

**The inversion is the valuable half.** If unalleged sheets sit materially below the alleged ones, the
deposit-level saturation is being driven by the real defects, the tool looks considerably better than
12 of 12 suggests, and the corpus has told us something a bound could not.

## 6. What the run actually returned — written after the artifact, and marked as such

**The run saturated: 12 of 12 deposits at severity 3.** But the contrast did not carry the reading §1
hoped for and §5 expected.

**Raw, the gap looks large.** 56.4% of applicable tests fired on alleged sheets against 26.5% on
unalleged, a ratio of 2.13× after normalising for the fact that alleged sheets are systematically
bigger and run more applicable tests.

**Within a workbook it mostly disappears.** Seven deposits hold both an A and a U sheet: five run
higher on A, **two invert** (C07 at 43% against 78%, C17 at 19% against 39%), and one of the five rests
on a U sheet with a single column and four applicable tests. **C10 — nine homogeneous tabs, one
alleged, the cleanest test the corpus offered and the case §4 called strongest — is flat at 21%
against 18%.** Dropping C10 and C15, which supply 15 of the 23 U sheets between them, takes the ratio
from 2.13× to 1.47×. The between-group gap is largely C15's small derived figure tabs not firing:
**a raw-versus-derived difference wearing the contrast's clothes.**

**So the honest conclusion is not the specificity headline this section was drafted to carry, and it is
not a rate either.** This corpus cannot measure specificity at any n. Every deposit is present because
somebody reported something, so *not yet adjudicated* is not *honest*, and no split of it yields an
honest arm. **C10 being flat is equally consistent with the whole workbook being defective and the
commenter having checked one tab. Nothing here distinguishes those, and nothing will.**

**The instrument that can is a corpus drawn without reference to any allegation.** That is Round 2
acquisition, and it is now a v1.0 blocker rather than a horizon item.
