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
The split is empirically clean across all five clusters (digits, replicate,
condition, shapes; copy/paste via DupDet).

**The discriminator was reworded S208 (six-model cross-lock).** The split is real,
but "countable set of flagged units" was a presentation symptom, not the boundary —
every model could manufacture a count for the property-fragment tests (Benford →
"N of 9 bins deviate"). The boundary is the finding's **cognitive object**: a subset
of units to inspect vs a property/pattern of the dataset. The observed table above is
unchanged by the rewording — it just now classifies for the right reason. See the
revised rule below.

## Rule (locked — revised S208 after six-model cross-lock)

*Cross-model lock: Sonnet / Gemini / GPT / Copilot / Deepseek / Grok — unanimous on the
core boundary. All six independently relocated the discriminator from "countability" to
the cognitive object of the finding; "countable set of flagged units" was a presentation
symptom, not the boundary. One classification (Column-to-column noise) deferred to an
engine + affordance source-check — see end of section.*

### The discriminator: cognitive object, not cardinality

1. **Count-led** when the finding's primary cognitive object IS a subset of units —
   rows, cells, columns, blocks, values that are individually meaningful to inspect.
   The units ARE the finding. Lead with the count: `N <units> <finding>`
   ("3 rows are exact duplicates"). **Deletion test:** strip the count — if the
   conclusion collapses because the units WERE the conclusion, it's count-led.

2. **Property-fragment** when the finding's primary cognitive object is a property,
   pattern, or relationship describing the dataset's structure as a whole — even when a
   subsidiary diagnostic could enumerate contributing units. A bare descriptive fragment
   naming the property's state ("leading digits depart from the expected pattern"). No
   invented count. **Deletion test:** strip any count — if the substantive conclusion
   survives, it's property-fragment. (Benford CAN report "N of 9 bins deviate"; the
   finding is the distribution shape, the bin count is an implementation detail — stays
   property-fragment.)

3. **NOT cardinality. NOT N≥2.** The discriminator is the cognitive object, not the
   count's value. "1 row has an unusual combination of values" is count-led at N=1 — the
   row is the finding. "one column quieter than the rest" is property-fragment despite
   naming one unit — the column is an *anchor for a pattern* (relative cross-column
   noise), not the payload. A sharp reader defaults to "count-led when N≥2" (Grok did);
   the rule explicitly overrides that. Cardinality is not the test.

### The genuine-ambiguity class: the affordance decides, not a default

4. When a test produces BOTH a global signal AND an enumerable contributor set, there is
   **no defensible statistical default** — two coherent models split opposite ways (Grok
   resolved toward count-led on actionability; the other five toward property-fragment on
   the count being threshold-contingent). They are the SAME rule once conditioned on the
   card's actual affordance:
   - The card's evidence table **isolates** the specific units (user can view/select/
     filter them) → **count-led**. The units are actionable, so the count is the object.
   - The card only renders a **distribution/relationship plot or summary** with no
     per-unit isolation → **property-fragment**. The pattern is the object.

   Read the affordance from the live card, not from design intent. This is the
   falsifiability guardrail (see meta-rule): "what the card lets the user do" is
   observable; "the mental model we want" is assertable and would make the rule
   unfalsifiable. The register follows the affordance we set deliberately — a choice,
   but an *observable* one.

### Cleared state

5. **Cleared inherits the active register, polarity flipped — no third register.** A
   null result is the same linguistic shape as its flagged counterpart, reversed; a
   separate "cleared register" would encode statistical outcome rather than linguistic
   shape (the weaker organizing principle — 6/6). A property test clears
   property-fragment ("balance as expected"). A count-led test clears with the **negative
   determiner** ("no rows are exact duplicates" / "no unusual rows detected") — NOT the
   zero numeral ("0 rows…", which all six flag as robotic) and NOT a property fragment.
   This is a count of zero rendered as "no", preserving the sibling frame across the
   pass/fail boundary (rule 7).

### Casing

6. **Casing is a production rule, not a perceptible register.** A leading numeral has no
   case — "3 rows…" is neither upper- nor lowercase-start; the rule is vacuous but
   satisfied. What it actually enforces: use numerals (not spelled-out numbers) when
   leading with a count; apply no title or sentence case to either register. It rules out
   "Three rows…" and "3 Rows Are…", which is all it can. **Sweep watch-item:**
   lowercase-start collides with proper nouns / acronyms at the head of a property
   fragment (a footer that would open "Benford…" or "ANOVA…"); flag for rephrase rather
   than force an awkward lowercase proper noun.

### Siblings

7. **Sibling construction frames hold.** Tests sharing a surface share a frame: the two
   Benford footers are identical-frame ("<ordinal> digits depart from the expected
   pattern"); the skippedClause captions are identical-frame ("near-uniform shape — too
   flat to <consequence>"). Preserve sibling frames, don't homogenise across non-siblings
   — and (per rule 5) the frame holds across a test's own flagged/cleared states too.

### Meta-rule (the honest framing)

The register reflects the mental model the card is built to give the user — which is a
design choice, not a mathematical inevitability (the same test can sit in either register
depending on productisation). This is not a weakness; it serves user cognition. The
guardrail that keeps it falsifiable: the choice is **read off the card's actual
affordance**, never asserted from intent. Where ontology and affordance agree the rule is
mechanical; the ambiguity class (rule 4) is where affordance does the deciding.

### Register stability across runs

8. **Register is a property of the test across its whole output range, not of a single
   footer.** A footer is a snapshot; the lock must hold for every dataset the test can
   fire on. Count-led therefore requires the count be **always available** — if the test
   localises to an enumerable actionable set on some datasets but yields only a global
   signal with no identifiable units on others, it stays **property-fragment**. It cannot
   promise the count without flipping register between runs, and a card that reads
   count-led on one dataset and fragment on the next destroys scan-ability. Priority when
   they conflict: **stability > localisation > sibling-frame** — once a test *reliably*
   localises across its whole range, that stable localisation severs a surface sibling
   frame (rule 7) rather than violating it; but a test that only *sometimes* localises
   does not earn count-led on the strength of the datasets where it happens to. (Added
   S208 follow-up; the six-model lock induced from single-instance footers and could not
   see the across-runs axis. Inter-Replicate Correlation is the canonical case: it can
   localise to over-correlated pairs on some data, so it stays property-fragment unless
   the count is shown to be always available.)

## Diagnostic for the sweep

For each card's footer, ask: **is the flagged unit set the finding, or is a property
state the finding?** Apply the deletion test if unsure — strip the count, see if the
conclusion survives.
- Units ARE the finding → count-led, lead with N, numerals not words.
- Property state is the finding → property-fragment, no invented count.
- Both (ambiguity class) → read the card's affordance: isolates units → count-led;
  plot/summary only → property-fragment.
- Count-led also requires the count be **always available** across the test's output
  range (rule 8) — if the test only localises on some datasets, it stays
  property-fragment. Check the test across fixtures, not one footer.
- Cleared state → same register as the test's flagged footer, polarity flipped
  ("no <units>…" for count-led, never "0").
A footer that violates its test's category is the fix target. The rule respects what is
already there; it does not flatten the registers into one, and does not default
ambiguous cases by cardinality.

**One classification deferred to source (S208).** "one column quieter than the rest"
(Column-to-column noise) is currently property-fragment and is the rule's sharpest edge
(all six models flagged it; Gemini/Grok leaned reclassify-count-led, the other four held
property-fragment). The deletion test is soft here, so it routes to a two-part
source-check: (a) is the engine per-column binary classification or a relative/omnibus
spread comparison; (b) does the card's evidence table isolate the flagged column or only
render the cross-column spread plot. Engine + affordance should agree. See the read-only
prompt. The sweep does not classify this footer until source reports back.

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
   reachable state (flagged states; cleared footers sampled to confirm they
   inherit the active register with polarity flipped, per rule 5).
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
