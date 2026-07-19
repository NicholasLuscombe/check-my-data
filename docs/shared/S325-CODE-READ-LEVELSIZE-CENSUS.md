# S325 — Grouping-key level-size census (code read, read-only)

Read-only. Nothing was changed. This census measures where a minimum-level-size clause would
sit. It does not choose the threshold and it does not build it. Every corpus sheet and every
batch fixture was run through a faithful mirror of `detectGroupAttributes`, and for each
grouping key that holds out at least one column the level sizes were recorded. Keys that hold
out nothing do not affect classification and are not tabled.

**The result up front: the failures and the legitimate holdouts do not overlap. Every failing
key has a median level size of one. Every legitimate holdout has a median of three or more. No
key sits at median two.** The gap is clean, and the only safe threshold is a median level size
of at least two — that is, reject a key whose median level holds a single row.

## The table

Two populations. All 256 keys with median level size one are collapsed per sheet in Table A —
they share the same signature and differ only in how many columns they empty. The 68 keys with
median two or more are listed in Table B, the preserved side.

### Table A — keys with median level size one (the false holdouts)

Every key here has median level size 1 and a single-level fraction of 0.92 to 1.0. These are the
keys a minimum-level clause would gate.

| File / sheet | median-1 keys | data cols after | outcome |
|---|--:|--:|---|
| C10 / B. cereus Experiment1 | 13 | 0 | zero — throws |
| C10 / B. cereus Experiment2 | 26 | 0 | zero — throws |
| C10 / B. pumilus Experiment1 | 15 | 0 | zero — throws |
| C10 / B. pumilus Experiment2 | 16 | 0 | zero — throws |
| C10 / Exiguobacterium Experiment1 | 14 | 0 | zero — throws |
| C10 / Exiguobacterium Experiment2 | 10 | 0 | zero — throws |
| C10 / P. megatetrium Experiment1 | 16 | 0 | zero — throws |
| C10 / P. megatetrium Experiment2 | 18 | 0 | zero — throws |
| C10 / P. megatetrium Experiment3 | 20 | 0 | zero — throws |
| C11 / Amplitudes_Fig 3j | 13 | 0 | zero — throws |
| C11 / Cell cycle scores_Fig 2d | 6 | 0 | zero — throws |
| C11 / DE class_Fig 4b | 8 | 0 | zero — throws |
| C11 / Process_Fig 4f | 8 | 0 | zero — throws |
| C15 / Data | 1 (`VT`) | 0 | zero — throws |
| C15 / Fig. 3 | 1 | 0 | zero — throws |
| C23 / Sheet1 | 6 | 0 | zero — throws |
| C25 / Fig. 3b-c | 4 | 0 | zero — throws |
| C25 / Fig. 3g | 3 | 0 | zero — throws |
| CORPUS-02 / ATPase Activity | 17 | 0 | zero — throws |
| C07 / Mastersheet | 15 | 21 | survives, loses ~20 cols |
| C07 / Fig3 | 4 | 2 | survives, loses 4 cols |
| C13 / Leaves to Soil | 1 | 13 | survives, loses 2 cols |
| C18 / chill coma recovery | 1 | 1 | survives, loses 5 cols |

Nineteen sheets reach zero data columns and throw. Four more (C07 twice, C13, C18) survive but
silently lose columns to the same singleton-level mechanism. C07 Mastersheet is the sharpest of
these: fifteen near-unique measurement columns each act as a key, each holds seventeen columns,
and about twenty real measurements are dropped while the sheet still limps on with twenty-one.
(The C07-update and C18-update files repeat their originals; counted once here.)

*Correction to the prior read: it reported twenty zero-data sheets. The measured count is
nineteen. C10 contributes nine sheets, not ten.*

### Table B — keys with median level size two or more (the preserved side)

These holdouts survive a median-≥2 clause. `sf` is the single-level fraction.

| File / sheet | key | levels | min | med | max | sf | holds |
|---|---|--:|--:|--:|--:|--:|--:|
| C07 / Mastersheet | Block | 6 | 12 | 12 | 12 | 0 | 2 |
| C07 / Mastersheet | Start | 2 | 36 | 36 | 36 | 0 | 1 |
| C07 / Mastersheet | Duration | 2 | 36 | 36 | 36 | 0 | 1 |
| C11 / Cell cycle Fig 2b | donor / sample / sample_order | 14 | 1 | 13 | 73 | 0.07 | 1 each |
| C11 / Cell cycle Fig 2b | seurat_clusters / integrated_snn | 2 | 119 | 157 | 196 | 0 | 1 each |
| C12 / Field survey-data | Site | 51 | 18 | 54 | 54 | 0 | 21 |
| C12 / Field survey-data | Region / Latitude / Longitude | 17 | 90 | 144 | 162 | 0 | 20–21 |
| C12 / Field survey-data | 15 WorldClim variables | 17 | 90 | 144 | 162 | 0 | 20 each |
| C12 / Field survey-Herbivory | Site / Region / Latitude / Longitude | 17–51 | 6 | 18–48 | 54 | 0 | 1–2 |
| C14 / Data | NewGrowthRate | 627 | 1 | 6 | 236 | 0.17 | 3 |
| C14 / Data | DBH cm / DBH in / Tree BA | 278 | 1 | 28 | 92 | 0.08 | 2 each |
| C14 / Data | HEIGHT ft | 114 | 1 | 43 | 306 | 0.12 | 1 |
| C14 / Data | RINGS / AveGrowth | 46 | 1 | 94 | 773 | 0.02 | 1 each |
| C14 / Data | Species | 20 | 76 | 290 | 2322 | 0 | 1 |
| C16 / Sheet1 | Lev / ZLev1 | 11–12 | 5 | 5 | 10 | 0 | 1–2 |
| C16 / Sheet1 | 8 richness columns | 3–6 | 2 | 10–24 | 34 | 0 | 1 each |
| C20 / Microcosm soil A/B | Taxa_combination / TAXA | 37–68 | 3 | 3 | 9 | 0 | 1 each |

(C16 and C20 appear once each; both `.xlsx` and `-update` copies measured identically.)

## The separation

**Where the failures sit, and where C12 sits.** Every one of the 215 keys on the nineteen
zero-data sheets has median level size **1**, minimum level size **1**, and single-level
fraction **1.0**. C12's legitimate keys — Site and the site attributes — have median level size
**54 to 144**, minimum **18 to 90**, and single-level fraction **0**. They are at opposite ends
with nothing between.

**Is there a clean gap? Yes.** Counting keys by median level size:

- median 1 — 256 keys, on 26 sheets (all 19 zero sheets plus the 4 partial-loss sheets).
- median 2 — **zero keys.**
- median 3 — 4 keys, on 2 sheets (C20's Taxa columns), none at zero.

The widest gap is between median 1 and median 3, and it is empty at median 2. The margin is one
row on each side: the worst legitimate key (C20's Taxa, median 3) and the best false key (any of
the 256, median 1) are two apart, with the boundary at exactly 2. **The only safe threshold is a
median level size of at least 2.** A threshold of 3 would gate C20's Taxa key, which holds out
`Richness_bacteria` — a real property of a taxa combination — so 3 costs a legitimate holdout. 2
is the sole value that rescues every failure and keeps every legitimate holdout.

**Which measure separates best.**

- **Median level size — best.** Failures at 1, legitimate holdouts at 3 and above, clean gap at
  2. It is the tightest boundary and the most interpretable: a level that holds one row cannot
  test constancy.
- **Minimum level size — does not separate.** Failures have minimum 1, but so do legitimate
  keys: C11's donor (minimum 1, median 13), and every C14 measurement key (minimum 1, median 6
  to 290). A single small level sits on both sides, so no minimum-level threshold divides them.
- **Single-level fraction — separates, but with overlap at the top.** Legitimate keys carry a
  fraction of 0 to 0.17; failing and partial-loss keys carry 0.92 to 1.0; the band from 0.17 to
  0.92 is empty. So a fraction test also works. But it does not distinguish a total failure
  (1.0) from C07's near-total false holdout (0.92 to 0.98), and it need not — both should be
  gated. It is a workable second choice with a looser boundary.

In this corpus median and single-level fraction agree on every key, because no key is
near-singleton with a median above one. Median gives the cleaner cut.

**The two triggers converge — one clause covers both.** The prior read named two triggers: a
sparse column (C15's `VT`, three values over sixty rows) and a near-unique numeric column
(C10's density readings, hundreds of near-distinct values). They look different — one leaves 57
rows unassigned, the other leaves none — but they produce the **same** level-size signature:
median level size 1, single-level fraction 1.0. They do not separate at different thresholds.
One median-≥2 clause catches both.

## Classification changes under a median-≥2 clause

- **Rescued from zero (19 sheets):** the nineteen in Table A that throw today would gain their
  data columns back. Every one is rescued at any threshold in the gap.
- **False partial holdout corrected (4 sheets):** C07 Mastersheet, C07 Fig3, C13 Leaves to Soil,
  C18 chill coma. These analyse today but silently drop columns; the clause restores them. C18
  in particular climbs from one data column to six.
- **Legitimate holdouts preserved (no change):** C12 (both sheets), C16, C20, C11 Fig 2b, C14.
  All hold on keys with median 3 or more and are untouched.
- **Batch fixtures:** none. No batch fixture has a holding-out key at all, so no fixture changes
  under any threshold. A change here is invisible to the batch, and its silence is not evidence.

## What did not fit

**C14's `NewGrowthRate`.** It survives a median-≥2 clause (median 6) but is the one key whose
legitimacy the level size does not settle. It is a growth measurement with 627 near-distinct
values, a 17 percent singleton fraction, and it holds out three columns. C14's other keys are
clearer: DBH in centimetres and inches are unit conversions of each other, and Tree basal area
is derived from diameter, so holding one out as constant within another is arguably correct.
`NewGrowthRate` is murkier — a measurement pressed into service as a key. No level-size threshold
in the clean gap resolves it, and its single-level fraction (0.17) is too low for a fraction
test to catch either. If it is a false holdout, it needs a different signal than level size. It
is the residual the census cannot classify, and it changes nothing today because C14 analyses
with fourteen data columns regardless.

**The `MAX_LEVEL_FRACTION` cap is the upstream cause of the near-unique trigger.** A column with
distinct-value count just under half the row count clears the existing eligibility cap and then
has mostly singleton levels. A median-≥2 clause catches the symptom. Tightening the cap would
catch the same columns nearer the source. The census does not choose between them; both land on
the same keys.

---

`./scripts/dev.sh cmd-s325-levelsize`
