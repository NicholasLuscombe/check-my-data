# S280 — Finding-class column audit

Read-only catalogue of the descriptor-word column ("Finding" / direction / band /
verdict word) on every test card that carries one. The columns are not assumed
uniform; this records exactly how each one differs so a battery-wide convention can
be locked from real content.

Verbatim column arrays below are taken from each card's render code (the
`columns=` / `EvidenceTable columns` / `DataTable columns` array), left-to-right in
render order. Where a card has more than one table, each table is listed separately.

Threshold reference (`src/constants/thresholds.js`): `ALPHA.FLAG = 0.001` (→ HIGH),
`ALPHA.NOTE = 0.01` (→ MODERATE).

"Adj. p" vs "raw p" below means the literal label rendered in that table's p-column,
and which p the descriptor word actually gates on (often a different threshold from
the one shown).

---

## The catalogue

| # | Card / file | Full column array (render order) | Descriptor header | Source field / function | Value word set (literals) | Raw number for same quantity adjacent? | Descriptor position · p shown · what it gates on |
|---|-------------|----------------------------------|-------------------|-------------------------|---------------------------|----------------------------------------|--------------------------------------------------|
| 1 | **Column Goodness-of-Fit** — `MiniCard_ColumnGoF.jsx` (single-matrix table) | `Col`, `Finding`, `Ratio`, `Adj. p` | `Finding` | `findingText(d.Direction, d.Family)` (lines 29–38). `d.Direction` is set by the producer (`columnGof.js:226`) to `"Shape mismatch"` (fit too poor) or `"Too-tight fit"`; family slug → label via `FAMILY_LABEL` | `Doesn't fit Normal` · `Doesn't fit Poisson` · `Doesn't fit Negative Binomial` · `Fits Normal too tightly` · `Fits Poisson too tightly` · `Fits Negative Binomial too tightly`. (Fallback passes `direction` through verbatim, but the producer only ever emits the two mapped strings, so the fallback is unreached.) | Yes — `Ratio` (the A² ratio the word bands) sits at position 3 | Position **2**. Shows **Adj. p** only. Word is set per flagged detail row from `Direction`; the row is in `details` only because it cleared flagging, so the word never reads benign. |
| 2 | **Entropy / Zipf** — `MiniCard_Entropy.jsx` (single-matrix table) | `Col`, `Finding`, `Excess`, `Adj. p` | `Finding` | Inline ternary on `d.Direction` (line 85). `d.Direction` set by producer (`entropyTest.js:154`) to `"Low entropy"` / `"High entropy"` | `Too few distinct values` (Low entropy) · `Too many distinct values` (High entropy). (Else-branch echoes `d.Direction`, unreached for the same reason as ColumnGoF.) | Yes — `Excess` at position 3 is `(Ratio − 1)` as a signed percentage, derived from the entropy `Ratio` the word bands | Position **2**. Shows **Adj. p** only. Word follows `Direction`; rows are pre-filtered to flagged columns, so never benign. |
| 3 | **Kurtosis** — `MiniCard_Kurtosis.jsx` (per-condition "Noise shape by condition" table) | `Condition`, `Rows`, `Observed κ`, `Expected κ`, `adj. p`, `Finding` | `Finding` | `shapeLabel` (lines 84–88), built from the κ-deviation band `c.platykurtic`, the lepto flag `c.isLeptokurtic`, the per-condition promotion `c.condPromoted` (BH-adjusted across conditions), and the verdict `c.verdict === "flagged"` | `Too uniform` · `Possibly uniform` · `Too peaked` · `Possibly peaked` · `Normal` | Yes — `Observed κ` (pos 3) and `Expected κ` (pos 4); the deviation between them is what the word bands | Position **6**. Shows **adj. p** (per-condition `c.p`, raw per-condition p). The platy/uniform word gates on `c.condPromoted` (BH-adjusted), the lepto word on `c.verdict==="flagged"`; the p column is shown for context, not as the word's gate. **Can read benign beside a significant p — see Note A.** |
| 4 | **Within-Row Variance** — `MiniCard_WithinRowVariance.jsx` (outlier-rows table) | single-matrix: `Row`, `z`, `SD`, `Expected`, `Finding` · aggregated: `Condition`, `Row`, `z`, `SD`, `Expected`, `Finding` | `Finding` | `d.Direction` rendered verbatim (line 111); producer sets `direction = z < 0 ? "too smooth" : "too noisy"` (`withinRowVariance.js:96`) | `too smooth` · `too noisy` | Yes — `z` (pos 2), plus `SD` and `Expected`; the z magnitude is what the word bands | Position **5** (single-matrix) / **6** (aggregated). **No p column at all.** Each table row is an outlier (`|z| > Z_THRESH`), so the word always reads as a finding; never benign. |
| 5 | **Cross-Condition Consistency** — `MiniCard_CrossCondConsistency.jsx` (single evidence table) | `Property`, `Pair`, `Observed`, `Null median`, `Adj. p`, `Finding` | `Finding` | `finding` (lines 143–151): `isAmberRow(d)` gate (`adjP < ALPHA.NOTE` ∧ gate-passed ∧ forensic-direction ∧ not degenerate) selects the word; `d.direction` and `d.fallback` supply the text | not ran → `d.reason` string (or `—`) · ran-but-not-amber → `As expected` · amber + similar → `Too similar` · amber + different → `Too different` · with fallback suffix → `Too similar (fallback)` / `Too different (fallback)` | Yes — `Observed` (pos 3) and `Null median` (pos 4); their ratio is the effect the word bands | Position **6**. Shows **Adj. p**. Word gates on `isAmberRow` (band = `ALPHA.NOTE`, MODERATE — the test cannot reach `ALPHA.FLAG` at B=999 permutations). **Can read "As expected" beside a small adj. p — see Note A.** |
| 6 | **Selective Noise** — `MiniCard_SelectiveNoise.jsx` (per-column "Spread compared to expected" table) | `Column`, `Observed SD`, `Expected SD`, `Ratio`, `Adj. p`, `Finding` | `Finding` | `finding` (lines 90–92): `d.flagged` (per-column `adjP < ALPHA.FLAG`) gates; `d.direction` supplies the word | `As expected` (not flagged) · `Quieter` (direction `quieter`) · `Noisier` (direction `noisier`) | Yes — `Ratio` (pos 4, the variance/SD ratio) plus `Observed SD` / `Expected SD` | Position **6**. Shows **Adj. p**. Word gates on `d.flagged` (`adjP < ALPHA.FLAG`, HIGH band), while the p column shows the same `adjP` — so a column with a NOTE-range p reads "As expected". **Possible benign-beside-significant — see Note A.** |
| 7 | **Mahalanobis Row Outlier** — `MiniCard_Mahalanobis.jsx` (outlier-rows table) | single-matrix: `Row`, `Distance`, `p` · aggregated: `Condition`, `Row`, `Distance`, `p` | — (no descriptor column) | n/a — the per-row table is purely numeric; the verdict words live only in the footer (`"… rows have an unusual combination of values"`) | n/a | n/a (`Distance` is the quantity; there is no word to band it) | No descriptor column. p column labelled `p` (raw per-row `p-value` from the producer). Listed because the prompt named it as a carrier; at source it carries none. |
| 8 | **Runs** — `MiniCard_Runs.jsx` — **Table 1** ("All replicate pairs") | without group: `Pair`, `Runs`, `Expected`, `z`, `Adj. p`, `Finding` · with group: `Condition`, `Pair`, `Runs`, `Expected`, `z`, `Adj. p`, `Finding` | `Finding` | `finding` (lines 151–155): `flaggedPair = parseFloat(p.adjP) < ALPHA.NOTE` gates; sign of `z` supplies the word | `As expected` · `Fewer than expected` (z < 0) · `More than expected` (z ≥ 0) | Yes — `z` (pos 4 / 5) plus `Runs` / `Expected` | Position **6** (no group) / **7** (with group). Shows **Adj. p**. Word gates on `adjP < ALPHA.NOTE`; the card verdict's per-pair promotion is stricter (`ALPHA.FLAG`). **A pair can read "As expected" while the card flags — see Note A.** |
| 9 | **Runs** — `MiniCard_Runs.jsx` — **Table 2** (`ConditionTable` "Runs test by condition") | `Condition`, `Pairs`, `Mean z`, `p` | — (no descriptor column) | n/a — numeric per-condition summary | n/a | n/a | No descriptor column. p column labelled `p` (raw per-condition `c.rawP`). |
| 10 | **Carlisle Baseline Balance** — `MiniCard_CarlisleBalance.jsx` (per-feature table) | `Feature`, `Condition means`, `Spread (CV)`, `p` | — (no descriptor column) | n/a — the verdict word lives only in the footer (`"Differences … smaller than chance across most features"`) | n/a | n/a | No descriptor column. p column labelled `p` (raw `ANOVA p`). Listed because the prompt named it; at source it carries none. |
| 11 | **Value Frequency Spike** — `MiniCard_ValueFrequency.jsx` (spike table) | `Value`, `Pass`, `Rows`, `Observed`, `Expected`, `Ratio`, `Adj. p` | `Pass` | `d.pass === "digit" ? "digit substring" : "full value"` (line 100) | `full value` · `digit substring` | Yes — `Observed`, `Expected`, `Ratio` carry the spike magnitude | Position **2**. Shows **Adj. p**. `Pass` is a **detection-method label** (which scan pass fired), not a verdict word — **see Note B.** |
| 12 | **Row-Mean Runs** — `MiniCard_RowMean.jsx` (per-condition "Runs by condition" table) — *not in the prompt's known list* | `Condition`, `Runs`, `Expected`, `z`, `p`, `Finding` | `Finding` | `finding` (lines 42–45): `flagged = c.p < ALPHA.NOTE` gates; sign of `c.z` supplies the word | `As expected` · `Fewer than expected` (z < 0) · `More than expected` (z ≥ 0) | Yes — `z` (pos 4) plus `Runs` / `Expected` | Position **6**. Shows **raw p** (header `p`, the raw per-condition runs-test p; the global verdict gates on the smallest of these). Word gates on raw `c.p < ALPHA.NOTE`. A condition can read "As expected" while the card flags on another condition — same pooled/per-unit gap as Runs. |
| 13 | **LOESS Residual** — `MiniCard_LOESS.jsx` ("Region comparison" table) — *not in the prompt's known list* | `Region`, `Rows`, `Observed SD`, `Expected SD`, `Ratio`, `Finding` | `Finding` | `r.finding` rendered verbatim; producer bands the SD ratio (`loessResidual.js:325–326`): `ratio > 1.5 → "Noisier"`, `ratio < 0.67 → "Quieter"`, else `"As expected"` | `Noisier` · `Quieter` · `As expected` | Yes — `Ratio` (pos 5, the SD ratio the word bands) plus `Observed SD` / `Expected SD` | Position **6**. **No p column** in this table. Word gates purely on the SD-ratio band, not on p. The table only renders when the card flag ≠ LOW/N/A, so a region can read "As expected" on a flagged card — **see Note A.** |
| 14 | **Regional Noise** — `MiniCard_RegionalNoise.jsx` — **Table 1** ("Anomalous windows") — *not in the prompt's known list* | `Rows`, `Column`, `Observed SD`, `Expected SD`, `Ratio`, `Finding` | `Finding` | `dir` (line 82): `d.direction === "reduced" → "Quieter"`, `"elevated" → "Noisier"`, else `"Anomalous"` (producer sets `reduced`/`elevated`/`anomalous` in `regionalNoise.js:121`) | `Quieter` · `Noisier` · `Anomalous` | Yes — `Ratio` (pos 5, `sdRatio`) plus `Observed SD` / `Expected SD` | Position **6**. **No p column** in this table. Word gates on `d.direction` only. Table renders only when the card flag ≠ LOW/N/A and only over already-flagged windows, so it never reads benign. |
| 15 | **Regional Noise** — `MiniCard_RegionalNoise.jsx` — **Table 2** (`ConditionTable` "Regional noise by condition") | `Condition`, `Best window`, `Ratio`, `p` | — (no descriptor column) | n/a — numeric per-condition summary | n/a | n/a | No descriptor column. p column labelled `p` (raw `c.rawP`). |

### Position / header / value summary at a glance

- **Header string.** Eleven descriptor columns use the header **`Finding`** (rows 1–6, 8, 12–14). One uses **`Pass`** (row 11, ValueFrequency — and it is not a verdict word). Mahalanobis, Carlisle, and the two per-condition `ConditionTable`s carry **no descriptor column**.
- **Position.** Two cards place the descriptor at **position 2** (ColumnGoF, Entropy — and ValueFrequency's `Pass` is also at position 2). The rest place it **last**, at position 5, 6, or 7 (after the numeric evidence and the p column).
- **p gating mismatch is common.** Several "Finding" words gate on a *different* threshold than the p the table shows, or on no p at all: Kurtosis (band/promotion, not the shown p), Selective Noise (gates at `ALPHA.FLAG` while showing the same `adjP`), Runs / Row-Mean (gate at `ALPHA.NOTE`, stricter card verdict at `ALPHA.FLAG`), Within-Row Variance / LOESS / Regional Noise (no p column — gate on a z- or SD-ratio band).

---

## Note A — cards where the descriptor can read benign beside a significant (or flagged) state

These are the cards where a reader can see a benign word — `Normal`, `As expected` — in the
same row as a small p, or on a card whose overall verdict flagged. None is being fixed here;
this records where the convention has to decide whether the word follows the row's own p, the
card's verdict, or a separate band.

- **Kurtosis** (`MiniCard_Kurtosis.jsx`). The clearest, and self-documented: the card prints a
  caption above the per-condition table (line 72) reading *"a small p beside 'Normal' means a
  reliable but slight departure."* The word follows the κ-deviation band and the BH-adjusted
  promotion, while the `adj. p` column shows the raw per-condition p — so `Normal` /
  `Possibly uniform` / `Possibly peaked` can each sit beside a small p. Fixture: the
  per-condition section renders whenever `condK` has ≥2 conditions and the card is HIGH or any
  condition is non-clear; the specific fixtures were not re-run in this read-only pass.
- **Cross-Condition Consistency** (`MiniCard_CrossCondConsistency.jsx`). Non-forensic-direction
  ("informational") rows always read `As expected` even when their `adjP` is small, because the
  word gates on `isAmberRow` (which additionally requires a forensic direction). The card mutes
  those rows to `C.TEXT_3` to signal the statistic-without-finding state. So a row reading
  `As expected` beside a sub-`ALPHA.NOTE` adj. p is by design. Fixture: any Track-D fixture with
  a significant non-forensic-direction pair; not source-confirmed here.
- **Runs Table 1** and **Row-Mean Runs**. Both gate the per-pair / per-condition word at
  `ALPHA.NOTE` while the card verdict is the pooled test (Runs prints its own caption, line 234:
  *"a pair can read 'as expected' while the pooled pattern is flagged"*). A row reading
  `As expected` on a flagged card is the pooled-vs-per-unit gap, not a contradiction. Fixture:
  any fixture where the pooled Runs verdict flags but individual pairs/conditions clear; not
  re-run here.
- **Selective Noise** (`MiniCard_SelectiveNoise.jsx`). The word gates at `ALPHA.FLAG` (0.001)
  while the `Adj. p` column shows the same `adjP`, so a column with a p in the `[0.001, 0.01)`
  band reads `As expected` beside a p the reader may consider significant. Lower-risk than the
  others (the card-level flag itself uses `ALPHA.FLAG`), but the per-row word and the per-row p
  can still disagree visually.
- **LOESS Residual** (`MiniCard_LOESS.jsx`). The "Region comparison" table only renders on a
  flagged card, yet an individual region can band to `As expected` (SD ratio in `[0.67, 1.5]`).
  So a flagged card can show a region row reading `As expected`. There is no p column to
  reconcile against; the word is a pure SD-ratio band.

## Note B — ValueFrequency "Pass" column

Confirmed: the `Pass` column (`MiniCard_ValueFrequency.jsx`, position 2) is a **detection-method
label, not a verdict descriptor**. It renders `d.pass === "digit" ? "digit substring" : "full
value"` — i.e. which of the two-pass scan (pass 1 = whole integer-value spikes, pass 2 =
fractional-digit substrings, per the VFS dual-pass design) found the spike. It does not encode
direction, magnitude, or a benign/flagged verdict; every row in the table is an emitted spike.
The verdict wording for the card is in the footer, not this column. So if the standardisation
treats the "Finding"-class column as the verdict-word slot, ValueFrequency does **not** carry one
— `Pass` is a provenance tag and should be excluded from that vocabulary.

## Note C — ColumnGoF / Entropy position-2 mirror

Confirmed on both counts:

- **Both arrays put the descriptor at position 2.** Single-matrix ColumnGoF table is
  `[Col, Finding, Ratio, Adj. p]`; single-matrix Entropy table is `[Col, Finding, Excess,
  Adj. p]`. `Finding` is the second column in each. (On the aggregated / per-condition path
  neither card renders the `Finding` word — both fall back to auto-derived numeric columns from
  `subDetails` — so the position-2 mirror is a property of the single-matrix table only.)
- **ColumnGoF's header comment still says it mirrors Entropy.** The file-top block comment reads
  *"Mirrors MiniCard_Entropy structure: per-flagged-column DataTable + footer"* (lines 1–2), and
  the `findingText` helper comment reads *"Mirrors MiniCard_Entropy's Direction → text mapping"*
  (lines 27–28). Both are present and current.

  One structural difference worth flagging for the convention, even though the mirror comment
  holds: the two cards format the band number differently in the column beside `Finding`.
  ColumnGoF shows the raw `Ratio` (the A² ratio) directly; Entropy shows `Excess`, a derived
  signed percentage `(Ratio − 1) × 100`. Same underlying quantity, two presentations — relevant
  if the convention wants the adjacent raw-number column standardised alongside the descriptor.
