# Test card findings — Phase A2 input queue

Living document. Test card findings surfaced during chrome walkthroughs.
Each cluster section feeds the corresponding A2.x design pass as input.
Append future walkthrough findings here rather than creating new files.

Surfaced during S133g chrome walkthrough (DS01, DS02, DS04, DS21).

---

## Cross-cluster (apply across multiple test cards)

- **Help blocks push evidence out of view when expanded.** "How this
  test works / Implications / What to look for" expand inline above the
  plot, displacing the evidence below the fold. Two options for A2
  cross-cluster pass: popup/help-window, or move help blocks below the
  plot. Surfaced on every fixture.

- **Footnote position.** Verdict-defining footnote (e.g. "6 pairs tested ·
  positive autocorrelation · mean |r| = 0.161 · p = 0.0179") sits at
  bottom of card. Should sit at top so the result is visible immediately
  on card open. Surfaced on Inter-Replicate Correlation, Noise
  Predictability, Row-Order Randomness.

- **Mechanism colour bridge to category headers.** Chip mechanism stripes
  (5-colour) don't visually link to §3 category headers, even though
  category and mechanism are 1:1. Reader cannot bridge chip → which
  category to scroll to.

- **Excerpt-table wrapper consolidation.** Duplicated Data uses its own
  table component, distinct from the shared excerpt table used in the
  modal. Different red shading, different column headers, different
  scrollability indication. Fold into shared system.

- **Plot wrapper.** The shrunken blue background around the
  Inter-Replicate Correlation matrix on DS02 reads well. Consider
  promoting to a shared token applied to all evidence plots.

- **Test-card subhead phrasing pass.** Several test subheads are
  technically accurate but non-intuitive ("Same rows anomalous across
  conditions", "Adjacent noise values too predictable"). Plain-English
  pass per cluster.

- **Help-block content review.** "How this test works", "Implications",
  "What to look for" copy across all test cards needs review for
  plain-English-for-intelligent-reader voice.

---

## Clone / duplication cluster

### Duplicated Data
- Subhead "Rows, blocks, or column segments copied" — readable. ✓
- "3 duplicated rows in 3 groups" misleading — actually 3 *pairs* of
  duplicates, 6 rows involved. (DS04)
- First column of duplicate-rows table has no header. (DS04)
- Column header colours D-F shown red — design call: flag column via
  header, or keep neutral with cells alone. (DS04)
- Within-row duplicates table uses a different red shade than cross-row
  duplicates table. Same finding type, two reds. (DS04)
- "Duplicate values within a row — 2 coincidences (0 expected)" —
  "coincidences" is odd; "duplicates" or "duplicate pairs". (DS04)
- "Expected" column: present on within-row table, absent on cross-row.
  Consistency call. (DS04)
- Table scrollability not visually obvious. (DS04)

---

## Cross-condition consistency cluster

### Correlated Residuals
- Subhead "Same rows anomalous across conditions" — non-intuitive.
  Plain-English alternative needed. (DS02)
- Pairwise correlation matrix axis order: Control should be on vertical
  axis, Inhibitor_A and Inhibitor_B on horizontal. Currently reversed. (DS02)
- Residual-noise heatmap reads well. ✓ (DS02)

---

## Distribution shape cluster

### Last-Digit Frequencies
- Plot surfaces overrepresented digit (6) clearly; missing digits
  (0, 5) read as background. Surface absences explicitly. (DS04)
- Legend "Uniform expected" → "Expected". (DS04)

### Repeated Digits
- Column labels Value / Pass / Observed / Expected unclear. "Value" →
  "Sequence" or "Digit pattern". "Pass" opaque. "Observed" / "Expected"
  need units (counts? percentages?). (DS04)
- Decimal point in `.96 / .91 / .56` — meaningful but not explained on
  the surface. (DS04)
- Subhead "Some digit sequences appear too often" — readable. ✓ (DS04)

---

## Spread / heteroscedasticity cluster

### Inter-Replicate Correlation
- Subhead "Replicates track too closely" — readable. ✓ (DS02)
- Pairwise correlation matrix wrapper (shrunken blue background) works
  well. (DS02)
- Legend "Elevated condition" → "Elevated replicates"? (DS02)
- "High-correlation windows" → "Highly correlated row windows"? (DS02)
- Modal excerpt table not highlighting the row windows from the
  high-correlation table (rows 16–26 etc.) — possible bug or
  modal-redesign issue. Diagnosis needed. (DS02)

---

## Ordering / sequence cluster (beta-blocker)

### Noise Predictability
- Subhead "Adjacent noise values too predictable" — non-intuitive. (DS02, DS21)
- Plot calibration: per-pair confidence band shown against
  pooled-statistic dots; all dots inside band despite Flagged verdict.
  Plot is calibrated to the wrong thing. (DS02, DS21 — same beta-blocker
  pattern banked at S133f)
- Severity-language inconsistency on one card: chrome HIGH (red), footer
  says "promoted to MODERATE", lookFor opens "Moderate autocorrelation
  can arise from several sources." Three different severity claims. (DS21)
- "Lag 1 is the primary statistic; lags 2–5 are sub-unit evidence
  (promotion requires pooled adj p < 0.001 plus ≥ 2 pairs at per-pair
  adj p < 0.05)." — non-intuitive footnote. (DS02)
- Pooled autocorrelation table: significant rows not visually
  distinguished from non-significant. (DS02)

### Row-Order Randomness
- Plot-vs-verdict mismatch: only Control condition is per-condition
  significant; plot shows non-significant-looking pooled view. (DS02)
- "All replicate pairs" table: no indication which condition each pair
  belongs to. (DS02)
- Subhead "Noise values not randomly ordered" — readable. ✓ (DS02)

---

## Cell-level cluster

(none surfaced this session)

---

## Coverage table (which fixture surfaces which test cleanly)

To be filled in as walkthroughs continue.

| Test                        | Anchor fixture | Notes                              |
| --------------------------- | -------------- | ---------------------------------- |
| Duplicated Data             | DS04           | Three duplicate groups, clean.     |
| Last-Digit Frequencies      | DS04           | Digit 6 spike, missing 0/5.        |
| Repeated Digits             | DS04           | Three over-represented digit seqs. |
| Correlated Residuals        | DS02           | Cross-condition residual map.      |
| Inter-Replicate Correlation | DS02           | Inhibitor_B row-window cluster.    |
| Noise Predictability        | DS02, DS21     | DS21 beta-blocker case stronger.   |
| Row-Order Randomness        | DS02           | Cross-condition runs disagreement. |
