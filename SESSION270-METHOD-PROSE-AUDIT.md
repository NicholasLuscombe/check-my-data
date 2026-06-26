# SESSION270 — Method-Prose Audit (READ-ONLY)

**Scope.** Establish the genuine unit count for the deferred "Arc B — method-prose pass (OPEN)"
sub-theme: the ~16 walk rows tagging the "How this test works" prose (and, where named,
Implications) as too-long / jargon-heavy / methodology.md-citing. No edits, no batch, no commits —
classification only, grounded in the **live** source string, not the walk's one-line description.

## Method

- **"How this test works" body** renders from `TEST_METHODS[result.name]` in
  `src/constants/mechanisms.js` — confirmed at `src/components/shared/CardLayout.jsx:75` / `:81`
  (`const methodText = TEST_METHODS[result.name]` → disclosure labelled "How this test works").
  `TEST_DESCRIPTIONS` is a *different* constant (the ~5-word compact-list blurb) and is **not** the
  expander body — the walk's target is `TEST_METHODS`.
- **Implications** prose lives per-card on the `implications` prop inside each
  `src/components/cards/MiniCard_*.jsx`, not in `mechanisms.js`. Quoted from source for the two rows
  that name it (2a, 8a).
- Canonical test names + `DISPLAY_NAMES` from `mechanisms.js`.

## Two findings that reframe the whole pass

**1. The methodology.md-citation defect is extinct.** `grep -rniE "methodology\.md|see methodology|
methodology doc" src/` returns only `@see METHODOLOGY.md §…` **code comments** inside `src/tests/*.js`
and `src/analysis/*.js` (developer cross-refs, never rendered). **Zero** user-facing strings —
`TEST_METHODS`, Implications, or otherwise — cite methodology.md. The three walk rows that complain
about it (7a, 8a, 15b) are all **stale**: the citations were removed before/at the Arc B
transcription. No card carries this defect today.

**2. Body prose is uniformly plain; the only "jargon" is a deliberate house-style parenthetical.**
Every one of the 28 `TEST_METHODS` strings now ends (or carries inline) a parenthetical naming the
formal statistical test — e.g. `(Spearman correlation, permutation test)`,
`(Anderson–Darling against a fitted family)`, `(Wald–Wolfowitz runs test)`,
`(Hartigan dip statistic against a uniform-reference null)`. The *body* sentences outside that
parenthetical read in plain English across the board. So the walk's "jargony" complaints are
really about the **bracketed formal-test names**, which are consistent and intentional. That makes
de-jargoning a **suite-wide convention decision** (keep / soften / drop the parenthetical on all 28),
**not** a per-card defect — and it is the *inverse* of the cross-test umbrella's stated concern (the
umbrella wanted consistency; the parenthetical is now present on all 28, i.e. consistent).

The net effect: most walk tags read **STALE / ALREADY-ACCEPTABLE** because Arc B (and interim edits)
already shortened and de-cited the prose. The genuine residue is a small set of **too-long** blocks.

---

## Per-row classification

Defect legend: **L** = too-long · **J** = body-jargon (outside the house parenthetical) ·
**M** = cites methodology.md. Status: **STILL-OPEN** (carries ≥1 defect) ·
**ALREADY-ACCEPTABLE** (walk tag now stale) · **ROUTES-ELSEWHERE** (row points at a non-how-it-works
surface).

### 2a — Constant-Offset Blocks (`Offset copies`)
**How-it-works** (`mechanisms.js:164`), 2 sentences / ~62 words:
> "For each row, takes the difference between replicate pairs and checks whether the same difference
> repeats in neighbouring rows more often than it would if the row order were shuffled at random,
> producing a block of rows all offset by the same amount (consecutive-difference run count,
> permutation null). A second pass checks for offsets by a constant ratio."

The walk quoted the *old* string ("Checks for clusters of constant offsets. … Significance assessed
by shuffling row order (permutation test).") — that version is gone. Live string is plain, 2
sentences, no jargon in body, no citation. → **ALREADY-ACCEPTABLE.**

**Implications** (`MiniCard_ConstantOffset.jsx:42`), 2 sentences:
> "A constant difference or ratio between replicates across consecutive rows can arise from a batch
> correction or a drift adjustment applied evenly to a stretch of rows. It can also indicate that
> one column was copied into another and a fixed amount added, subtracted, or multiplied — turning a
> copied column into a \"replicate\" that looks different while staying locked to the original."

Plain, no jargon, no citation. → **ALREADY-ACCEPTABLE.**

### 3a — Residual Spike Correlation (`Shared noisy rows`)
**How-it-works** (`mechanisms.js:168`), 2 sentences / ~40 words:
> "Finds rows that are unusually noisy between replicate pairs, then checks whether those rows are
> similarly noisy across several conditions. Tests whether the overlap is greater than if rows were
> randomly shuffled (Spearman correlation, permutation test)."

The walk quoted a **6-sentence** version (cross-refs to Noise correlation / Noise sign-pattern,
"rank correlation (Spearman ρ)", etc.). That is gone; live is 2 plain sentences. → **ALREADY-ACCEPTABLE.**

### 3b — Residual Spike Correlation (clear-state anchor)
Same test, same `TEST_METHODS` key → **identical** string to 3a (the body is keyed by test name, not
flag state). → **ALREADY-ACCEPTABLE** (same basis as 3a).

### 7a — Decimal Precision Consistency (`Decimal precision`)
**How-it-works** (`mechanisms.js:177`), 3 sentences / ~78 words:
> "A single instrument records every value in a column at the same precision, and export tools then
> strip trailing zeros at predictable rates, leaving a smooth tail of shorter values. Within each
> column, this test checks whether the decimal places follow that pattern, or whether some precision
> levels are oddly underused (one-tailed binomial deficit test against the trailing-zero model). It
> tests each column separately and names the columns that fall short."

Walk complaint was "overly long **and cites methodology doc**." The citation is **gone** (defect M
extinct). Length is 3 moderate sentences — defensible, not egregious. Body is plain; only the
parenthetical carries the formal test. → **ALREADY-ACCEPTABLE** (mild length; flag for the
convention only if the pass also trims 3-sentence blocks).

### 8a — Value-Frequency Spike (`Over-used numbers`)
**How-it-works** (`mechanisms.js:179`), 3 sentences / ~55 words:
> "Checks whether any value appears far more often than the values immediately around it (Poisson
> tail test against a local smoothed expectation). A second pass checks whether the same digits after
> the decimal point recur across unrelated whole numbers. It runs on mostly-whole-number data, where
> hand entry leaves the clearest trace."

Walk complaint was "overly long and cites methodology doc … same for implications." Citation **gone**.
Length moderate. → **ALREADY-ACCEPTABLE.**

**Implications** (`MiniCard_ValueFrequency.jsx:74`), 2 sentences:
> "A value that appears far more often than its neighbours can reflect a natural mode in the data,
> such as a detection limit many samples reach. It can also indicate values entered by hand: e.g.,
> spikes at adjacent numpad keys point to manual entry, and the same fractional part recurring across
> unrelated rows points to a copied template."

Plain, no jargon, no citation. → **ALREADY-ACCEPTABLE.**

### 10a — Column Goodness-of-Fit (`Column Goodness-of-Fit`)
**How-it-works** (`mechanisms.js:208`), 3 sentences / ~52 words:
> "Fits each column to the distribution shape its mean and variance predict, then measures how
> closely the column's actual shape matches it (Anderson–Darling against a fitted family). Each
> column is tested separately. Does not run on whole-number counts or ordinal scales, where fitted
> shapes do not apply."

Walk complaint "too long and jargony." Live is short (3 sentences). Body is plain; the only stumbling
term, "Anderson–Darling against a fitted family", sits in the house-style parenthetical. → **ALREADY-ACCEPTABLE**
on length; the parenthetical-jargon question is the suite-wide decision, not a 10a-specific defect.

### 11b — Modality Test (`Number of peaks`)
**How-it-works** (`mechanisms.js:210`), 3 sentences / ~33 words:
> "Measures how far each column's distribution sits from a single-peaked shape (Hartigan dip
> statistic against a uniform-reference null). Each column is tested separately. Does not run on
> whole-number counts or ordinal scales."

Short, body plain. → **ALREADY-ACCEPTABLE.**
Note: 11b's *substantive* walk complaint (`WALK-FINDINGS.md:85`) is "the dipstatistic is
non-intuitive (0.01 means what?)" — that targets the **footer/verdict statistic**, not the
how-it-works prose. → that sub-row **ROUTES-ELSEWHERE** (footer-copy, not this pass).

### 12a — Inter-Replicate Correlation (`Inter-Replicate Correlation`)
**How-it-works** (`mechanisms.js:166`), 2 sentences / ~47 words:
> "Checks whether replicate columns correlate more closely than expected. Compares a pair's
> correlation against the average of all other pairs in the same condition, both across the whole
> column and in a sliding window that highlights any correlated stretch (winsorised Pearson
> correlation)."

Walk complaint (`:92`): "rather than tracked, would be better to say correlate?" — the live
how-it-works already uses **"correlate"**, not "tracked". The word "tracked" survives only in the
card *footer driver clause* ("replicates track closely", per CLAUDE.md), a different surface. So the
how-it-works tag is **ALREADY-ACCEPTABLE**; the "tracked→correlate" point, if still wanted, →
**ROUTES-ELSEWHERE** (footer clause).

### 14a — Autocorrelation (`Noise correlation`) — **STILL-OPEN [L]**
**How-it-works** (`mechanisms.js:193`), 3 long sentences / ~95 words:
> "Takes the difference between each replicate pair and checks whether that difference is correlated
> from one row to the next — in independent measurements, one row's difference tells you nothing
> about the next (lag-1 autocorrelation, one-sample t-test). It pools all rows into a single
> dataset-wide measure, rather than locating where the correlation sits; a pattern confined to one
> stretch is the windowed test's job. It runs only when the rows are in a meaningful order — plate
> position, run sequence, or time — which you set at import; in an arbitrary order, such as a gene
> list or an alphabetised index, row-to-row correlation has no meaning."

Genuinely long — three compound sentences, ~95 words, with two parenthetical asides plus the
row-order caveat. Walk "Long explanatory text" stands. → **STILL-OPEN (L)**. Body prose itself is
plain (no J); no M.
Note: 14a's other walk row (`:96`, "The line shows lag-k means across pairs… 95% CI marker… length
text after the plot") is the **AutocorrDecayPlot caption**, not how-it-works. → **ROUTES-ELSEWHERE**
(plot caption / Arc A).

### 15b — Windowed Autocorrelation (`Local noise correlation`)
**How-it-works** (`mechanisms.js:195`), 2 sentences / ~62 words:
> "Slides a 15-row window across the data and checks whether the difference between replicates is
> correlated from one row to the next within any window — a pattern confined to one stretch is
> detected here even when the dataset as a whole clears (windowed lag-1 autocorrelation, permutation
> null within each replicate pair). Like the whole-dataset test, it runs only when the rows are in a
> meaningful order set at import."

Walk complaint "too long and **refers to methodology.md**." Citation **gone** (M extinct). Length is
2 sentences — the first is long but it is a single coherent thought. → **ALREADY-ACCEPTABLE**
(borderline-long; include only if the convention trims first-sentence length).

### 16a — Runs Test (`Noise sign-pattern`)
**How-it-works** (`mechanisms.js:199`), 2 sentences / ~58 words:
> "For each replicate pair, tracks which replicate is larger at each row and counts how often the
> lead changes, comparing that against the number of changes the values would give if shuffled at
> random (Wald–Wolfowitz runs test). It looks only at which replicate leads, not how large the
> difference is, and runs only when the rows are in a meaningful order set at import."

Walk "too long." Live is 2 sentences, comparable to others marked acceptable. Body plain. →
**ALREADY-ACCEPTABLE** (borderline — see note in tally).

### 25a — Baseline Balance / Carlisle (`Baseline Balance`) — **STILL-OPEN [L]**
**How-it-works** (`mechanisms.js:218`), 3 sentences / ~103 words:
> "Tests each measured variable — each baseline characteristic, such as age, weight, or a marker
> level — for a difference between the conditions, then checks the spread of those results across all
> of them. Under honest random allocation the differences vary feature to feature; a set of features
> that are all too well matched between conditions is the signal (per-feature ANOVA across conditions,
> then a test for an excess of near-perfect matches against the uniform spread honest allocation
> produces). It looks for overall over-balance, not for any single matched variable."

Longest of the *tagged* set — ~103 words, three long sentences, a dense parenthetical embedding two
nested tests. Walk "way too long" stands. → **STILL-OPEN (L)**. Mild body-jargon "per-feature ANOVA"
/ "uniform spread" — secondary to length.

### 26a — Cross-Condition Consistency (`Overall condition similarity`) — **STILL-OPEN [L]**
**How-it-works** (`mechanisms.js:220`), 2 very long sentences / ~92 words:
> "Compares conditions against each other on a set of properties — their spread, their shape, their
> digit patterns, the way noise scales with signal — and checks whether any pair is more alike, or
> for some properties more different, than independent conditions should be (pairwise comparison
> across conditions, permutation null, corrected across all property-and-pair comparisons). For
> spread and shape, only unusual similarity counts as a forensic signal, since real treatments are
> expected to differ; for properties that should hold across conditions regardless of treatment, both
> too-similar and too-different count."

Two sentences but each is a paragraph-length compound — ~92 words. Walk "too long" stands. →
**STILL-OPEN (L)**.
Note: 26a's other walk row (`:136`, "Amber rows are more alike across conditions… Muted rows differ…
text too long") is the **plot/legend caption**, not how-it-works. → **ROUTES-ELSEWHERE** (caption).

### Cross-test umbrella — description-consistency
Walk (`:142`): "Some test descriptions have the statistical test mentioned. Others not. There is some
inconsistency." Against current source this is **stale**: all 28 `TEST_METHODS` strings now carry the
formal-test parenthetical (verified by reading every entry). Consistency is achieved. →
**ALREADY-ACCEPTABLE** as stated. *Open re-reading:* if Chat's intent was actually "drop the
formal-test name everywhere" rather than "make it consistent," that's a suite-wide de-jargon decision
(all 28), which finding #2 above flags as the real lever.

---

## Untagged blocks carrying the same defect (walk may have missed)

Judged by the same too-long / body-jargon test, against the full `TEST_METHODS` list:

- **Row-Mean Runs (Test22, `mechanisms.js:186`) — longest in the suite, ~140 words, includes a
  formula** (`1 + 2·n₊·n₋ / n … about 101`). By the raw too-long criterion this is the worst case.
  **But** it was deliberately rewritten/expanded at S247 (`f6c9614`) to fix a baseline error, and the
  walk explicitly tagged it "Good How this test works explanation" (`:121`, DONE). So it is
  *intentionally* detailed. Flagging it as a **convention conflict to adjudicate**: the method-prose
  pass's "shorter is better" rule collides with S247's "this one needed the detail" ruling. Chat
  decides which wins; do not silently trim.
- **Noise Scaling With Measurement Size (Test17, `mechanisms.js:201`) — ~80 words + body-jargon**
  ("log-log slope of variance against mean"). The walk's 17a rows were about the CI band (stale) and
  legend — its how-it-works was never tagged, yet it is long-and-technical. Candidate **[L + J]**.
- **Benford's Law (Second Digit) (Test5, `mechanisms.js:175`) — ~78 words.** Untagged; moderately
  long with a trailing "Most powerful on large datasets…" clause. Minor candidate **[L]**.

## Tally — the real unit size for the CARD-COPY convention pass

Of the ~16 tagged blocks (13 how-it-works rows + 2 named Implications [2a, 8a] + 1 umbrella ≈ 16):

| Disposition | Count | Blocks |
|---|---|---|
| **STILL-OPEN — too-long (L)** | **3** | 14a Autocorrelation · 25a Baseline Balance · 26a Cross-Condition Consistency |
| **STILL-OPEN — body-jargon (J)** | 0 | — (body prose plain everywhere; jargon only in the house parenthetical) |
| **STILL-OPEN — cites methodology.md (M)** | 0 | — (defect extinct; 7a/8a/15b stale) |
| **ALREADY-ACCEPTABLE** (tag stale) | 11 | 2a (how + impl) · 3a · 3b · 7a · 8a (how + impl) · 10a · 11b · 12a · 15b · 16a · umbrella |
| **ROUTES-ELSEWHERE** (non-how-it-works surface) | 4 sub-rows | 11b footer dip-stat · 12a "tracked" footer clause · 14a plot caption · 26a bar/legend caption |
| **Untagged candidates found** | 3 | Row-Mean Runs (intentional — adjudicate) · Noise Scaling (L+J) · Benford 2nd Digit (L) |

**Bottom line.** The pass is **not** 16 cards. The genuine residue is **3 confirmed too-long
how-it-works blocks** (14a, 25a, 26a), optionally **+2 borderline** (7a, 15b, 16a if the convention
trims to ≤2 short sentences), plus **2 untagged candidates** (Noise Scaling, Benford 2nd Digit) and
**1 adjudication** (Row-Mean Runs vs S247). Every methodology.md-citation tag is dead, and "jargon"
collapses to a single suite-wide decision about the formal-test parenthetical rather than per-card
edits. A realistic CARD-COPY convention pass touches **~3–6 cards**, not ~16.

*Read-only — no source changed. All quotes verbatim from the worktree source at
`1f1e9c0`.*
