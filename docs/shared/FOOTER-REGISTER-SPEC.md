# Footer-register rule + cross-card consistency sweep plan

*Rule locked S206. Living arc spec — fold into METHODOLOGY once the sweep proves
the rules.*

Locked from the S206 visual pass (footers observed live `813bc65` across the
digits / replicate / condition clusters; shapes cluster inferred, verified during
the sweep). This is the spec for the **footer-register + legend-vocabulary +
label-casing cross-card consistency arc** — the copy axis the S199
information-budget sweep never ran. Chat-owned. Lock the rules here; the sweep
applies them card-by-card.

---

## The footer register is a latent split, not drift

The S206 finding first read as undisciplined drift (fragments vs sentences). On
the evidence it is a **latent rule that was never made explicit**: footers split
by whether the test localises to a countable set of flagged things.

**Observed across five clusters (every cluster except shapes):**

| Footer | Test | Register |
|---|---|---|
| "3 rows are exact duplicates" | Duplicated Data | count-led |
| "3 digit combinations recur more often than chance allows" | Over-used numbers (VFS) | count-led |
| "1 row has an unusual combination of values" | Unusual rows (Mahalanobis) | count-led |
| "leading digits depart from the expected pattern" | First-Digit Frequencies | property-fragment |
| "second digits depart from the expected pattern" | Second-Digit Frequencies | property-fragment |
| "one column quieter than the rest" | Column-to-column noise | property-fragment |
| "replicates correlate more closely than expected" | Inter-Replicate Correlation | property-fragment |
| "balance as expected" | Baseline Balance (cleared) | property-fragment |
| "conditions differ normally" | Overall condition similarity (cleared) | property-fragment |
| "noise scaling doesn't match this assay" | Noise scaling (Mean-Variance) | property-fragment |

**Shapes leg confirmed (DS06).** Noise scaling — a global/dataset-wide shapes test
— takes the property-fragment register as predicted, closing the coverage caveat.
The split is now empirically clean across all five clusters (digits, replicate,
condition, shapes; copy/paste via DupDet). No rule revision needed.

## Rule (locked)

1. **Count-led** when the test localises to a countable set of flagged units
   (rows, cells, values, blocks): lead with the count — `N <units> <finding>`
   ("3 rows are exact duplicates"). The count IS the finding's shape.

2. **Property-fragment** when the test reports a dataset- or property-level signal
   with no countable flagged set (global/scan tests): a bare descriptive fragment
   naming the property's state ("leading digits depart from the expected
   pattern"). No invented count.

3. **Lowercase-start throughout** — both registers. Confirmed deliberate: every
   observed footer starts lowercase; the count-led ones only *look* sentence-cased
   because they lead with a numeral. The sweep enforces lowercase-start uniformly
   (a numeral start is still lowercase-register).

4. **Sibling construction frames hold.** Where tests are siblings on a shared
   surface they share a frame: the two Benford footers are identical-frame
   ("<ordinal> digits depart from the expected pattern"); the skippedClause
   captions are identical-frame ("near-uniform shape — too flat to <consequence>").
   The sweep preserves sibling frames, doesn't homogenise across non-siblings.

## Diagnostic for the sweep

For each card's footer, ask: **does this test produce a count of flagged units?**
- Yes → footer must be count-led, lowercase, lead with N.
- No → footer must be a property-fragment, lowercase, no count.
A footer that violates its test's category is the fix target. The rule respects
what is already there; it does not flatten the two registers into one.

---

## Second footer surface: the §2 chip caption (parallel system)

The card footer is NOT the only footer-like surface. The §2 data-table chip
captions are a **parallel per-tier caption system** with their own construction
frames, also observed consistent within themselves:

- **dataset-wide** → "<Test> applies across the whole dataset — see the test card
  for the evidence." (First-Digit, Second-Digit)
- **unscoped** → "<Test> flagged the data but couldn't isolate specific rows. See
  the test card for the statistical detail." (Column-to-column noise)
- **statistical-localised** → "<Test>: this pattern is statistical — it won't be
  visible in the individual values. See the test card." (IRC, Unusual rows)

**Arc obligation:** the card footer and the §2 caption for the same test must not
contradict in register or claim. The §2 captions use the *canonical test name*
("Second-Digit Frequencies", "Duplicated Data") while the card title uses the
*display name* — verify that's intended (it currently is, per the dataset-wide
chip naming), but flag any case where the two surfaces name the same test
differently in a way that reads as inconsistent rather than register-appropriate.

---

## Legend-vocabulary rule (locked)

Baseline/reference swatches naming the comparison expectation must use a single
vocabulary. **"Median spread" (Column-to-column noise) and "Expected" (IRC) name
the same conceptual role** — the baseline the series are compared against.

**Locked:** the baseline swatch reads **"Expected"** (or "Expected <noun>", e.g.
"Expected spread") wherever the swatch represents the under-null reference. "Median
spread" is renamed. Where the band is genuinely a median (not an expectation), the
caption must tie it to the expectation explicitly rather than leave "median"
standing alone. Sweep all plot legends for baseline-swatch vocabulary.

**Positive anchor (DS06).** Noise scaling (Mean-Variance) already obeys this: its
legend reads "Expected slope 1 (Poisson)" — the expectation swatch says "Expected".
The fix brings outliers (Column-to-column noise's "Median spread") up to the
register the better cards already use; it does not invent a new vocabulary.

## Third footer surface: the cleared-group summary caption

Beyond the card footer and the §2 chip caption, the **cleared-group collapsed
summary** is a third footer-like surface — e.g. "9 tests cleared — Inter-Replicate
Correlation, Noise distribution, Noise correl…" and the empty-category line
"Cross-condition comparisons (0 tests) — do the conditions look un… Clear" (DS06).
The "(0 tests)" empty-category case especially wants a register check — confirm it
reads right when a whole category has nothing. Sweep these alongside card footers
and §2 captions; all three surfaces must harmonise.

## Label-casing rule (locked)

The adjusted-p column header is inconsistent: **"Adj. p"** (Column-to-column noise)
vs **"adj-p"** (Overall condition similarity). **Locked: "Adj. p"** (period,
capital A, lowercase p) everywhere. Sweep all EvidenceTable headers for the
adjusted-p column and any other shared-field header casing drift surfaced en route.

---

## Sweep plan

1. **Enumerate every card's footer string** at source (Code read-only, or Chat
   from the card-text-arc working docs) — the canonical footer per test, per
   reachable state (flagged states; cleared footers are a third register sampled
   but not the focus).
2. **Classify each footer** count-led vs property-fragment by the diagnostic.
3. **Flag violators** — wrong register for the test's category, sentence-case
   starts, broken sibling frames.
4. **Cross-check the §2 caption** for each test against its card footer for
   register/claim contradiction.
5. **Sweep legends** for baseline-swatch vocabulary → "Expected".
6. **Sweep EvidenceTable headers** for adjusted-p casing → "Adj. p".
7. Chat authors the corrected strings; Code applies (surgical, shared constants,
   22-fixture batch). Footers + legends + labels land together as one arc.

**Coverage note:** the shapes cluster (Column GoF, Mean-Variance, Modality) was
not eyeballed this pass. Expectation: shapes footers are property-fragment
("near-uniform shape — too flat to…" is the skippedClause sibling frame already).
Verify during the sweep; if a shapes footer breaks the split, revisit the rule
before applying.

---

## New finding logged alongside (NOT a copy issue)

**#6 — VFS EvidenceTable "Adj P" column truncated (DS04).** On Over-used numbers
the per-value table overflows its width: the rightmost **Adj P** column values are
clipped ("0.001…", "0.004…", "0.007…" all cut at the right edge). Layout finding
(table-width / PlotLayout bounds), not copy. Note also the header here reads
"Adj P" (no period) — a third casing variant alongside "Adj. p" / "adj-p", folds
into the label-casing sweep, but the *truncation* is a separate layout fix. Logged
in TESTCARD-FINDINGS S206 batch.
