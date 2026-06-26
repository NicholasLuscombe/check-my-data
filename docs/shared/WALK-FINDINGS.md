# Walk Findings Log

> **⚠ VERIFY BEFORE REPLACING.** This full file = the source `docs/shared/WALK-FINDINGS.md`
> reconciled at **S266 close**. Drift check at S266: tracked copy's last commit was
> `98ce344` (18 Jun 2026, the S252 routing pass) — no drift since, confirmed before this
> reconciliation. **S266 reconciled the routing column against three arcs that shipped since the
> S252 pass without the column being updated:** Arc B (walk copy, S261–262, `111e5d6`), the Arc A
> wrapper sub-arc (S265 — every plot hugs), and the Arc A axis sub-arc (S266, `411ab3c` —
> ColumnStatBar rotate). Headline finding: the wrapper rows are all DONE, but **Arc B closed its copy
> transcription without addressing the how-it-works / method-prose length sub-theme** — ~16 rows
> re-tagged "Arc B — method-prose pass (OPEN)" and banked, because the bare "Arc B" tag read as
> closed once the arc closed. Before overwriting the tracked copy, re-confirm it has not drifted:
> `git log -1 -- docs/shared/WALK-FINDINGS.md` and diff. If findings were appended after this read,
> merge rather than overwrite. "Committed" ≠ "content-current."
>
> *(Prior S252 pass, retained for provenance: routed the six possible-engine rows (3a, 10a, 16a, 18b,
> 20a, 24b) and the three α-consistency rows (14b, 15b, 17a) via two read-only triages — no engine
> defect; corrected 10a's test identity to Column Goodness-of-Fit.)*

One line per finding, appended as you walk. The screenshot is the same id (`test11a` → `test11a.png` in this folder) — no embedding, the name is the link. Paste the image into chat when you want my eyes on it; this file is the durable record.

**Tags:** FLAG (real defect) · QUESTION (spec ambiguity) · DEFER (belongs to a later arc) · STOP (crash/data-leak, interrupts).

**Routing / status (Routed-to column):** a finding is unresolved while its routing column is blank. As findings are worked, the column records where each went and whether it is closed:
- `DONE S<N> <hash>` — fixed and on main.
- `Arc A` / `Arc B` / `Arc C` — routed to a named arc, not yet fixed.
- `NOT-A-DEFECT — <reason>` — investigated, conforms to spec / intended behaviour.
- `OPEN <carry-in>` — confirmed real, scoped, not yet fixed; homed as a carry-in.
- blank — not yet routed; needs a per-card structure-first read at source before routing (do NOT route a substantive or possible-engine finding from its one-line description — that is the S244 mistake).

The walk is "cleared" when every finding row carries a routing entry.

**Format — copy this line, fill it, append below:**

```
testNx | TAG | one-line description | [date]
```

Date optional; useful if the walk spans days. Routing (which arc each goes to) is left blank — I fill it when the walk closes.

---

## Findings

| Test id | Tag | Finding | Routed to |
|---------|-----|---------|-----------|
| _example_ test11a | QUESTION | header says "13 noisiest rows", gradient plot gives no way to verify the count | _(example)_ |
| Test1a | Many | DS06 - The font hirearchy is off, with 1 copied block (12 rows) and 32 duplicate pairs etc being large. <br />DS04, DS10 - Duplicate Groups Table is very red, so aesthetically a bit off (test1a-3) . <br />DS14 - the header of 24 rows are exact duplicates and 2 columns are identical doesn:t give an accurate description of the findings (test1a-4). |  |
| Test 1b | Display balance | Text feels a bit repetitive. Aesthetically the card is a bit unbalanced. |  |
| Test 2a | Data | Should table show before and after and offset? It feels incomplete without showing the data itself. Maybe should be a bit like the display in duplicate data. <br /><br />With DS08, the offset is confusing because it is logged. <br /><br /> |  |
| Test 2a | How this test works text, implications etc | "Checks for clusters of constant offsets. For each row, computes the difference between replicate pairs and checks whether that difference repeats in neighbouring rows. Significance assessed by shuffling row order (permutation test)." - the description is confusing. Also does it just test copy paste across columns? It could also happen that you copy an entire row copied? This affects all the descriptions. <br /><br />AImplications -> constant difference between replicates over consecutive rows can result from batch corrections or instrument drift adjustments applied uniformly to a block. It can also indicate that one row was copied and a fixed value added or subtracted to create neighbouring rows. | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works / implications length + de-jargon + drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test2b | Display balance | Fine - except for the same balance/clarity issue in test1b. |  |
| Test3a | Verdict text | DS02 - The 5 noisiest rows are the same in every condition verdict seems wrong. Inhibitor_B is not correlated at all. Also which are the five noiseiest rows? It seems the correlation is throughout, rather than in spikes. | DONE S252 — CONFIRMED-DISPLAY (verdict-honesty), no engine defect. Flag gates on max pairwise top-K overlap (the best pair), not an all-conditions intersection (residualSpikeCorrelation.js:78 rejects the all-groups intersection as too stringent). Footer over-claimed "the same in every condition" while the statistic is one best pair — reworded to name the max-overlap pair ("shared by {bestPair} — the pair with the most overlap"). Inhibitor_B's low correlation is correct and does not enter the verdict (per-condition ρ is informational). The withheld row list now renders as the Overlap rows table (Row / Shared spike strength / Per-condition residual (z)); header corrected from "|
| Test 3a | How this test works. | too wordy. Identifies which rows are unusually variable between replicate pairs and tests whether the same rows are noisy across multiple conditions. In typical data, noisy rows vary independently across conditions — coordinated residual spikes suggest shared structure. Significance assessed by shuffling row order (permutation test). The correlation between each row pair's residuals is measured as a rank correlation (Spearman ρ), so it responds to consistent co-movement rather than the size of individual spikes. This is distinct from Noise correlation and Noise sign-pattern, which look at how a single replicate pair behaves from one row to the next. This test instead asks whether the same rows are the noisiest ones across several different conditions — coincidence that points to a shared edited region rather than to genuine measurement noise. | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works / implications length + de-jargon + drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test3a | What to look for | Description mismatch - Blue shading shows where each condition has high residual noise. When multiple strips light up at the same row, that noise is coordinated. The heatmap below shows pairwise ρ — high values (≥ 0.4) between conditions that should be biologically independent suggest shared construction. |  |
| Test3b | How this test works | Same issue re How this test works text but otherwise the testcard looks fine. | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works length / de-jargon / drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test4a | Verdict text | -> Leading digits are not distributed as expected? |  |
| Test4a | Plot wrapper | Wrapper doesnt hug the sides of the plot | DONE S265 — Arc A wrapper sub-arc (every plot in the suite hugs; mode = fitContent, caps at intrinsic width) |
| Test4b | Verdict text | -> Leading digits are distributed as expected? |  |
| Test4b | Plot wrapper | Wrapper doesnt hug the sides of the plot | DONE S265 — Arc A wrapper sub-arc (every plot in the suite hugs; mode = fitContent, caps at intrinsic width) |
| Test5a | Verdict text | -> Second digits are not distributed as expected? |  |
| Test5a | Plot wrapper | Wrapper doesnt hug the sides of the plot | DONE S265 — Arc A wrapper sub-arc (every plot in the suite hugs; mode = fitContent, caps at intrinsic width) |
| Test5b | Verdict text | Second digits as expected -> Second digits are distributed as expected? |  |
| Test5b | Plot wrapper | Wrapper doesnt hug the sides of the plot | DONE S265 — Arc A wrapper sub-arc (every plot in the suite hugs; mode = fitContent, caps at intrinsic width) |
| Test6a | Verdict text | Last digits are not evenly spread -> Last digits are not distibuted as expected? Why is this text here? 9-digit test (digit 0 excluded) -> and 0 shown in the plot. |  |
| Test6a | Plot wrapper | Wrapper doesnt hug the sides of the plot | DONE S265 — Arc A wrapper sub-arc (every plot in the suite hugs; mode = fitContent, caps at intrinsic width) |
| Test6b | Verdict text | Last digits evenly spread · 9-digit test (digit 0 excluded) -> Last digits are distributed as expected? Should 0 be excluded from the plot? |  |
| Test6b | Plot wrapper | Wrapper doesnt hug the sides of the plot | DONE S265 — Arc A wrapper sub-arc (every plot in the suite hugs; mode = fitContent, caps at intrinsic width) |
| Test7a | How this test works | How this test works description is overly long and cites methodology doc which is an internal document. | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works length / de-jargon / drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test7b | Verdict | Consistent precision throughout -> Consistent decimal precision throughout dataset? |  |
| Test7b | Plot wrapper | Wrapper doesnt hug the sides of the plot | DONE S265 — Arc A wrapper sub-arc (every plot in the suite hugs; mode = fitContent, caps at intrinsic width) |
| Test8a | Verdict text | 2 numbers appear more often than chance allows -> 2 numbers appear more often than expected? |  |
| Test8a | Table | What does "Pass" mean? Shouldn:t there be a verdict column consistent with other tables? |  |
| Test8a | How this test works | How this test works description is overly long and cites methodology doc which is an internal document - same for implications etc | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works / implications length + de-jargon + drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test8b | Verdict text | No number over-represented -> No numbers appear more often than expected? |  |
| Test9a | NA |  | no-anchor (fixture gap) |
| Test9b | DS01 | Distinct numbers is categorised under Distribution shapes. Legend is off. Expected line is grey, column labels clash. Would it be useful to have the table also? | Reference-line arc S245 (grey expected line → teal null per channel-3 amendment, in the retoken); legend/labels → legend-vocab convergence |
| Test10a | DS10 | Non-intuitive legend explanation. <br />Null median (ratio = 1)<br/>Col 6 skipped — near-uniform shape — too flat to fit a distribution<br/>Bar shows a single condition; full per-condition detail in the table below. |  |
| Test10a | DS10 | Is the test working properly if the expected is ratio =1 and observed are >50. Seems a misfit of null. Also each column has mis of control and treatment, so it seems you are mixing conditions? | NOT-A-DEFECT (engine) S252 — TEST IDENTITY: this is Column Goodness-of-Fit (the S252 dispatch mislabelled it rankCorrelation; the ρ-matrix rank card has no ratio/Direction/bars — the engine path is columnGof.js). (1) "Mixing conditions" is false at source: DS10 is row-grouped, the shapes-trio dispatch routes per-condition via aggregatePerGroup (engine.js:454), so each fit is on one condition's row subset, not the pooled mixture. (2) "Ratio=1 expected, observed >50 = misfit": the ratio is an effect size (A²_obs / null median), not a fit residual — 1 = a column matching its null, large = strong shape mismatch; 50 is what a flagged column looks like. (3) The flag is a TRUE POSITIVE per DS10 ground-truth: col5 carries seeded fabrication (γ₁=1.497 past the pre-skip, AD ratio 105×, credited since S107). No fixture run needed — ground truth is the verification. Residual display gap (explain the ratio + make per-condition fit legible) → Arc B. **S266 deepened:** read-only reconciliation + clean-counterpart contrast confirmed GENUINE TRUE POSITIVE — the γ-pre-skip routes authentic log-normal proteomics to N/A (clean DS09 uniformly γ-skipped, silent); DS10's fabrication flattened the Vehicle cols to γ₁≈1.45 (admit zone) where they fit neither Normal nor the real log-normal tail. Also resolved a STALE CALIBRATION RECORD (doc's pooled col5/105× → per-condition 5 Vehicle cols ~55×, Treatment N/A; METHODOLOGY + TEST-GROUND-TRUTH edits S266). The "Expected (ratio=1)" reference line hugging the baseline under ~55× bars is scale-inherent, NOT a defect → parked #9 (reference-line semantics). |
| Test10a | DS10 | Table the Direction is in the wrong place - that usually comes at the end of the table columns? |  |
| Test10a | DS10 | How this test works etc are too long and jargony. | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works length / de-jargon / drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test10a | DS20 | Similar comments to DS10, though the test seems to work more sensibly.I don:t understand the explanation for the skipped column. (screenshot test10a-3) |  |
| Test10b | DS01 | Many cols so plot x-axis labels clash - maybe make diagonal? Expeced null is shown in grey - is that supposed to be green? Lagend is in the wrong place. Would the table be useful here too? Would it be useful to have a CI? | Reference-line arc S245 (grey expected null → teal, NOT green — it's a null, channel-3 amendment); x-axis clash → DONE S266 `411ab3c` (same ColumnStatBar rotate-when-crowded fix as 19a — "make diagonal" is exactly the rotate(−45) treatment; render-unexercised on current fixtures); legend → legend-vocab / S267 read-only |
| Test11a | NA |  | no-anchor (fixture gap) |
| Test11b | DS17 | All columns single peaked but the dipstatistic is non-intuitive (0.01 means what?). Expected or threshold? eitherway should it be grey? Legend positioned wrongly. | Reference-line arc S245 (it's a THRESHOLD not a null → faded/dashed RED per channel-3 amendment, not grey, not teal); dipstatistic meaning → Arc B; legend → legend-vocab |
| Test11b | DS17 | How this test works etc is non-intuitive. | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works length / de-jargon / drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test13a | NA |  | no-anchor (fixture gap) |
| Test13b | DS01 | Visual Walk includes it under section C. Shouldn:t it be Section D?<br />Does not fire on DS01. In fact name Noise Distribution doesn:t appear on the 28 test list Screenshot test13b-1 | DEFER display-name review (section placement CONFIRMED CORRECT S245 — card renders under Cross-replicate comparisons, screenshot test13b-1; the name "Noise distribution" pulls the eye to "Distribution shapes" by adjacency, and is absent from the §5 battery list which calls it "kurtosis + Anderson-Darling". Both resolve when the name does — rename to disambiguate from cat-3 + propagate to METHOD_BATTERY) |
| Test13b           | (S245)                                     | Per-condition table column headed bare "p"; on a cleared card Inhibitor_B/Treatment_B shows p below 0.01 yet Finding "Normal". Is it raw or adj-p; does Finding read off it or off the FISHER_EXEMPT effect-size gate? | RESOLVED — stale, predates S248. S267 read-only confirmed at source: S248 already (i) relabelled the header bare "p" → "adj. p" (`MiniCard_Kurtosis.jsx:76`), (ii) overwrote the displayed value with the BH-FDR-adjusted p (`kurtosis.js:489–492`), (iii) added a caption annotating the split (`:72`). Finding branches on the κDev effect-size floor (\|κDev\|≤ 0.20 → "Normal", `kurtosis.js:424` / `thresholds.js:31`), independent of `c.p` — so "small adj. p + Normal" is consistent by design, not a contradiction. The walk's "p below 0.01" was the pre-S248 raw value (DS01/Inhibitor_B raw 0.0070 → adjusted 0.0210). No build. One latent label edge case parked #28. |
| Test12a | DS08 | Plot label in the wrong place | Arc A/C — label-position (not wrapper). Plot-title/label placement; confirm at the S267 legend+label read whether this is a current defect or already moved. |
| Test12a | DS08 | "No localised row ranges detected — elevated correlation is uniform across all rows." seems to be in the wrong place. Its a verdict normally there is a table below but in the absence its misplaced. Also font size is too bit for hierarchy. | DONE S243 (IRC render order data-driven, 201d98d) |
| Test12a | DS08 | How this works text etc, rather than tracked, would be better to say correlate? | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works length / de-jargon / drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test12a | DS02 | Plot wrapper doesn:t hug. Plot verdict could be -> Replicates for Inhibitor_B correlate...<br />Table shoul dhave p-values? What is the point of showing only 20 rows out of 51 - where should the user find the other 51? (screenshot test12a-3) | DONE S265 (wrapper) + blank (table/p-value substantive — needs its own read) |
| Test12b | DS01 | DS01 flaggs elevated replicates but test clears... (screenshot test12b-1) | DONE S243 (un-gated amber tier dropped, 201d98d) |
| Test14a | DS11 | Plot y-axis labels nearly overlap. Wrapper doesn:t hug width.<br / | DONE S265 (wrapper) + NOT-A-DEFECT S266 (axis): AutocorrDecayPlot carries mature y-tick logic (span-keyed tickStep, niceHalfSpan); the S266 axis read found no defect. Both halves resolved. |
| Test14a | DS11 | The line shows lag-k means across pairs; dots are per-lag values. The mean ± 95% CI marker at lag 1 carries the verdict — average serial correlation across pairs is reliably above zero when the interval excludes the dashed reference. - length text after the plot. | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works / implications length + de-jargon + drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test14a | DS11 | What is the pooled autocorrelation? Table content is non-intuitive and text after table is also non-intuitive. |  |
| Test14a | DS11 | Long explanatory text in how this test works. | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works length / de-jargon / drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test14b | DS01 | Similar comments as for test 14a. Previous comment CI should be centered on the expected line. Expected line is grey? Also CI should be 99% no, since alpha is 0.01. | Reference-line arc S245 (grey r=0 → teal null + PooledR1Marker brought to full treatment + legend key — the CI-vs-r=0 overlap IS the verdict); CI/α-consistency RESOLVED S252 α-read: STALE — this is Autocorrelation, and the card already shows 99.9% CI (3.29·SE), not the "95%" the walk quoted. No engine inconsistency (verdict gates at 0.001/0.01 uniformly). A 99.9% band beside a 0.01 test is not wrong (band and threshold are independent), but the level is a bare 3.29 literal labelled precision-style → CI-band semantics, parked #9 (S253 classification: VERDICT-EDGE in intent but bare-literal; lean = derive from gating α like Runs). |
| Test15a | NA |  | no-anchor (fixture gap) |
| Test15b | DS01 | Looks fine. Is there a useful plot that could be shown? Also BH-FDR alpha at 0.05 - isn:t is 0.01 on all other test cards? | RESOLVED S252 α-read: PARTLY STALE — this is Windowed Autocorrelation. The "BH-FDR at α=0.05" footer text is GONE from current source; the verdict gates on flagFromP(minAdjP) at 0.001/0.01, consistent with the suite. The 0.05 survives only as a per-window display marker (windowedAutocorrelation.js:178) painting amber (the signal colour) at a looser threshold than the verdict → READS-AS-VERDICT (S253 classification, Axis 4). Routed → parked #9 0.05-marker disposition (gate-to-verdict-α or mark-as-non-verdict). One of only two READS-AS-VERDICT cards (with Missing Data); not the five originally feared. |
| Test15b | DS01 | All windows are consistent with independent noise in each pair (BH-FDR at α = 0.05). - this text is poorly placed. Should be together with the table title to explain whats in the table. | Arc B (text placement) — note the "(BH-FDR at α = 0.05)" parenthetical the walk quoted is no longer in source (see 15b row above); the placement point stands for the current cleared-state footer. |
| Test15b | DS01 | How this test works is too long and refers to methodology.md. | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works length / de-jargon / drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test16a | DS22 | Strange result. Noise signs clump plot shows Rep1-Rep5 but then in the table below rep1-rep5 adj p is as expected. No explanation of what the x is indicating. | DONE S252 triage — CONFIRMED-DISPLAY (engine correct, pooled-by-design). This is the Runs Test. The verdict gates on the pooled mean-z across all pairs (runs.js:207); the strip plots the single most-extreme pair (runs.js:306), which reads "as expected" in the table because the table shows each pair's whole-column adj-p — three different views, no contradiction. No "x" glyph exists; the "x" is the unlabelled row axis. Card already carries the right sentence (MiniCard_Runs.jsx:234). Routed: caption dedup → RESOLVED S253 (parked #9b). The pooled-vs-per-pair sentence was relocated to the card caption (`MiniCard_Runs.jsx:234`) and the investigation-header duplicate cut — removal documented in source at `FindingDetailPanel.jsx:107-109`; the header line is now generic and non-duplicating (`:110`). Confirmed at source S267: exact-phrase grep finds the sentence in one live location only (the card caption); no doubling on `13f5e7b`. No build — walk row predates S253. Strip axis label → Arc A (unchanged). |
| Test16a | DS22 | Again How this works text is too long. | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works length / de-jargon / drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test16b | DS01 | Looks good except the test by condition was unexpected. Is it an aggregate p-value per condition? Shouldn:t that be shown even if its only one condition as in DS22? |  |
| Test16b | DS01 | I though all the plots were going to use consistent colouring, but they still differ between testcards - the blue here isn't standard. | Two-tone arc S245 (root cause: SignStrip Cambridge pale-blue `#A3C1DA` sits close to `CC.OBS` and reads as a wrong observed-blue; → `CC.OBS` + Oxford navy. Observed blue itself already 100% on `CC.OBS` — audit found no stray observed blue) |
| Test17a | DS06 | Looks good. But CI should be 99%? | RESOLVED S252 α-read: STALE — this is Noise Scaling With Measurement Size, and the caption already says 99.9% CI band (3.29·SE, card-side), not the "95%" the walk implied. No engine inconsistency. The S253 classification reclassified this band as a PRECISION band (uncertainty around the observed slope; the verdict is a separate z-test of slope vs expected), so it is legitimately NOT verdict-edge and the numeric level need not match an α — the fix is to label it clearly as precision, not to change the level → parked #9 CI-band semantics. |
| Test17a | DS06 | Each dot = one row (55 rows). Solid line = observed fit with 95% CI band. Dashed = expected for cell counting / viability. - non-standard legend. | Legend-vocab convergence (parked #9, Axis 1). Note: the live caption reads 99.9% CI band, not the "95%" transcribed here (the walk text predates the S-update). |
| Test17b | DS03 | Looks good similar comments to test 17a. |  |
| Test18a | NA |  | no-anchor (fixture gap) |
| Test18b | DS03 | Plot is very strange with no axes and unexplained threshold. what is each datapoint? How do you show unusually low spread? | DONE S252 — CONFIRMED-DISPLAY (correctness), no engine defect. The plot drew its threshold at ±3.5 while the engine flags at \|z\|>4.0 — a genuine plot-vs-verdict mismatch (a displayed boundary the verdict doesn't use). Fixed: Z_THRESH lifted to a module export in withinRowVariance.js, threaded to the card; the two threshold lines, the bin colouring, and the legend now read the constant (renders "Outside ±4σ threshold"). Each datapoint is a histogram bar = count of rows in that z-bin; low spread is the left tail. Remaining axis/datapoint-cue gaps → Arc A. |
| Test19a | DS20 | Plot x-axis labvels nearly clash. wrapper Doesn:t hug. Table looks good. | DONE S265 (wrapper) + DONE S266 `411ab3c` (x-clash): ColumnStatBar rotate-when-crowded (lift of SvgAxis heuristic). Render-unexercised on current fixtures (crowding triggers ~10 cols; DS20 ColGoF is 7) — rotate branch verified-by-geometry, no-crowd path byte-identical. |
| Test19b | DS01 | Distribtuion Shapes and Cross replicate Comparisons, Cross-condition cluster names have unusually large gap to icon.  (its probably when the title name text wraps) |  |
| Test19b | DS01 | Why does this switch to bar chart from whisker plot? The different data presentation is surprising. |  |
| Test20a | DS21 | One region noisier than the rest — rows 82–96 but plot shows two regions. Wrapper not hugging. Columns y-axis label is cut off. | DONE S265 (wrapper) + NOT-A-DEFECT S266 (y-axis cutoff): RegionalNoiseStrip uses content-sized reserve (max(floor,content)); the S266 axis read found no tick/reserve defect. Region-count copy DONE-routed S252 (CONFIRMED-DISPLAY, flag sound — footer reads bestWindowRows regionalNoise.js:218, plot reads every window ≥50%·max :197; reconcile copy → Arc B). |
| Test20b | DS01 | I don:t really understand what the table is showing. Condition Best window, Ratio. Not so meaningful in this case. |  |
| Test21a | DS08 | Looks pretty good and straightforward. | NOT-A-DEFECT — clean |
| Test21b | DS01 | Shows a change point even though its even throughout. | DONE S243 (changepoint marker gated on flag, 4079be7) |
| Test22a | DS21 | Row averages run in streaks of what? I guess the expected is 0 and its spending too much time above or below? Plot is quite messy. Should you mark the blocks with shades? Should there be a table? | DONE S247 `f6c9614` — RowMean redesigned: `RowMeanTrendPlot` retired; per-condition `SignStripPlot` block-width render (one rect per run, width ∝ run length — the "mark the blocks" ask) + run-length evidence table (the "should there be a table" ask). Streaks now legible: DS21 Control fat-block streak vs Treatment even comb. Screenshot-gated. |
| Test22a | DS21 | Good How this test works explanation | DONE S247 `f6c9614` — prior "clean" tag was a missed baseline error: the explainer described crossings of the "condition-wide mean" (grand mean), but the statistic signs residuals around the fitted OLS trend. Rewritten to fitted trend + Wald-Wolfowitz + expected-runs formula `1 + 2·n₊·n₋/n`. Caught at the S247 human-read gate. |
| Test22b | DS03 | The plot still shows a lot of jagged lines, so it doesn't convey how it is clear. | DONE S247 `f6c9614` — same component as Test22a (confirmed via read-only); same fix. DS03 (clear) now renders WT/KO as sparse fat-block alternation reading as "correctly not streaky", not dense jaggedness; the framing line orients that the clean read is correct. Screenshot-gated. |
| Test23a | DS06 | Looks pretty clean | NOT-A-DEFECT — clean |
| Test23b | DS01 | Good clean. Legend includes outlier and significance threshold not shown on plot. Should they be there? Wrapper doesn:t hug. | DONE S265 (wrapper) + Arc C (legend keys-vs-marks): legend lists outlier + significance-threshold keys; whether they have drawn marks is in scope of the S267 legend center-under-panel read-only. |
| Test24a | DS21 | Very similar to Test20. Plot row should start at 2? |  |
| Test24b | DS17 | Looks fine. But All windows are consistent with a single condition-wide covariance / mean structure. text after table doesn:t feel right. Should table be ordered by condition when not significant? SHould myu and sigma be in same table? | DONE S252 triage — CONFIRMED-DISPLAY, verdict untouched. DS17 is clean; the verdict is correctly LOW. The "text after table" is the clean-state footerText sitting under a table of specific windows, so it reads as if those windows were findings rather than a clean summary (copy/placement → Arc B). Adj-p ordering on a clean card carries little meaning; condition grouping would read better → Arc A/B layout. μ and σ are interleaved in one table distinguished by a Pass column; whether to split is a layout decision → Arc A. All three are presentation choices; nothing touches the verdict or statistic. |
| Test25a | DS16 | Differences between conditions smaller than chance across most features but then plot shows a tall bar. I:m not sure how to interpret. | DONE S244 e8389d5 (sorted table + CV explain the tall bar) |
| Test25a | DS16 | Plot right hand 1.00 truncated. Y-axis not labelled. | DONE S244 e8389d5 (Count axis labelled) + DONE S265 (wrapper-hug) + Arc A residual (x-axis 1.00 truncation): the S266 axis read confirmed Carlisle's count axis is already titled (S212) and this is the inline-histogram family; the 1.00 right-edge truncation is the one residual axis item — eyes-on at the next axis touch to confirm it's a live clip vs already-reserved. |
| Test25a | DS16 | Bar height = count of features per p-value bin. Dashed line = expected under uniform. Highlighted bar = excess p-values near 1.0 (too balanced). How far the bars sit from the dashed expected line: p < 0.0001. - long txt description with no legend. | DONE S244 e8389d5 (ChartLegend added, caption gated + tightened) |
| Test25a | DS16 | Not clear how the table helps by listing each row. Also content not very useful. Better to show diff or something? | DONE S244 e8389d5 (CV column + signal-sort + file-row labels, column-grouped) |
| Test25a | DS16 | How this test works description is way too long. | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works length / de-jargon / drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test25a | (S244) | "Col N" label on the row-grouped branch is raw matrix column index, not a file column — wrong on proteomics/uniform fixtures. colIdx now emitted; no toFileCol; colHeaders/dColMap not threaded to the card. Right label is an open question (header name vs file column vs Excel letter). | OPEN carry-in |
| Test25b | DS17 | Mainly same comments. Grey bars look gloomy. I thought we were standardising with blue. | SUPERSEDED → Data-model arc S245. The S243/S244 NOT-A-DEFECT ruling (grey because a p-value histogram isn't observed data) is OVERTURNED: under the channel-4 data model the bars ARE observed marks and carry the verdict colour — non-driving bins blue `CC.OBS`, 0.90–1.0 driving tail red region. The user's "we were standardising with blue" was right |
| Test26a | DS19 | Minimap doesn't show significance |  |
| Test26a | DS19 | Testcard content too complicated to interpret. and Column Finding have to scroll a long way. |  |
| Test26a | DS19 | Amber rows are more alike across conditions than chance usually produces. Muted rows differ between conditions — which is what real treatments normally do — so they're shown for context, not flagged. 'Finding' reads off the corrected significance test — flagged pairs show 'Too similar', the rest read 'As expected'; 'Null median' is the midpoint of the chance range. - text too long | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works / implications length + de-jargon + drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test26a | DS19 | How it works etc too long | Arc B — method-prose pass (OPEN): Arc B copy transcription shipped S262 `111e5d6` (CCR card, locality-in-prose, cross-refs, parentheticals, verdict text), but the how-it-works length / de-jargon / drop-methodology.md-citation sub-theme was NOT in that scope. Still open. → BANKED as the Arc B method-prose follow-up. |
| Test26b | DS01 | Same comments as test26a |  |
| Test27 | NA |  | no-anchor (fixture gap) |
| Test28 | DS15 | Is missing data pattern a cross-replicate issue? You could have missing data within a replicate? Is it the right test cluster? Plot shows replicates. |  |
| Test28 | DS15 | Test card is pretty clear. Wrapper doesn:t hug plot. Legend in wrong location. | DONE S265 (wrapper) + Arc C (legend location): the S267 legend read-only scopes whether MissingDataHeatmap's legend sits adjacent per the Bik crop standard. |
| Cross test | | Some test descriptions (How this test works) has the statistical test mentioned. Others not. There is some inconsistency in the description content for these tests. | Arc B — method-prose pass (OPEN): the description-consistency umbrella for the how-it-works cluster; NOT shipped by the S262 copy transcription. → BANKED as the Arc B method-prose follow-up. |

---

## Routing notes (S244 first-pass)

This pass routed the rows whose arc is unambiguous from the description, and left the rest blank.
**Blank rows are not unrouted-by-oversight — they need a per-card structure-first read at source
before routing**, because routing a substantive finding from its one-line description is the same
mistake as scoping a card from the opener (the S244 lesson). The blank rows fall into three kinds:

- **Verdict-text rephrasing** (3a, 4a/4b, 5a/5b, 6a/6b, 7b, 8a/8b verdict rows) — likely a
  verdict-phrasing template (Arc B), but several carry a substantive question inside the rephrase
  (e.g. 6a/6b "should digit 0 be in the plot?", 3a "the verdict seems wrong"). Read each before routing.
- **Possible-engine / methodology** — 10a ("is the test working if expected ratio=1 and observed >50;
  are you mixing conditions?"), 16a ("plot shows Rep1-Rep5 but table adj-p as expected"), 18b
  ("plot strange, no axes"), 24b ("ordering / table structure"). These may be engine, not display.
- **CI / α-consistency** — 14b, 15b, 17a ("CI should be 99% since α=0.01?", "BH-FDR at 0.05 vs 0.01
  elsewhere?"). Real statistical questions touching α-consistency; route after a methodology read.

Already-closed rows from earlier arcs are tagged: 12a/12b (S243 IRC), 21b (S243 LOESS),
25a/25b (S244 Carlisle). The seven no-anchor rows (9a, 11a, 13a, 15a, 18a, 27 — and the example
11a) close as a documented fixture gap, not failures.

## Routing notes (S252 — possible-engine + α clusters cleared)

The two clusters the S244 note left blank are now routed via two read-only triages
(`SESSION252-TRIAGE-READONLY.md`, `SESSION252-ALPHA-READONLY.md`). **No engine defect in any row.**

- **Possible-engine (3a, 10a, 16a, 18b, 20a, 24b):** all CONFIRMED-DISPLAY or NOT-A-DEFECT.
  3a (footer over-claim + withheld row list) and 18b (plot threshold ±3.5 ≠ engine 4.0) were
  display-correctness defects — both fixed and shipped S252. 10a is a true positive per DS10
  ground-truth (col5 seeded fab); its only gap is display legibility. 16a/20a/24b are
  copy/chrome, routed to existing arcs and parked #9. The 10a dispatch mislabel (rankCorrelation
  → Column Goodness-of-Fit) is corrected in its row.
- **α-consistency (14b, 15b, 17a):** mostly stale — the cards moved since the walk (14b and 17a
  already show 99.9% CI, 15b's α=0.05 footer text is gone). Verdict α is uniform at 0.001/0.01
  suite-wide; no inconsistency. Real residual content (CI-band level semantics; the live 0.05
  per-window marker on Windowed Autocorr) routed to parked #9, informed by the S253
  display-significance classification.

This clears the possible-engine and α-consistency kinds entirely. The remaining blank rows are
verdict-text rephrasings (4a/4b, 5a/5b, 6a/6b, 7b, 8a/8b) and assorted display rows still routed
through Arc A/B and the reference-line/two-tone arcs.

---

## Routing notes (S266 — three shipped arcs reconciled into the column)

The routing column had not been touched since the S252 pass, so three arcs that shipped in the
interval were unmarked. This pass reconciled them. No new walk findings were taken — this is a
status reconciliation, not a walk.

- **Arc A wrapper sub-arc (S265) — all wrapper rows now DONE.** The sub-arc closed with "every plot
  in the suite hugs" (mode = `fitContent`, caps at intrinsic width). The seven pure-wrapper rows
  (4a/4b/5a/5b/6a/6b/7b) and the wrapper half of the mixed rows (12a-DS02, 14a, 19a, 20a, 23b, 28)
  are marked DONE S265. Where a mixed row had a non-wrapper sibling, only the wrapper half closed —
  the sibling kept its own routing (legend → Arc C / S267 read-only; axis → see below).

- **Arc A axis sub-arc (S266, `411ab3c`) — one fix, the rest resolved-or-deferred at source.** The
  structure read dissolved the "seven plots × three families" framing: there is no shared numeric
  axis component and most plots carry mature tick logic. ColumnStatBar rotate-when-crowded shipped
  (covers the 19a and 10b x-axis-clash rows; render-unexercised on the current fixture set —
  crowding triggers ~10 cols, the flagged Distribution-Shapes fixtures top out at 7). Axis rows
  resolved as NOT-A-DEFECT by the read: 14a (AutocorrDecayPlot mature y-ticks), 20a (RegionalNoise
  content-sized reserve). Carlisle count axis confirmed already-titled (S212), so 25a's residual is
  only the 1.00 x-truncation — eyes-on at the next axis touch. The eyes-on tail (NoiseProfile
  x-step; DotStrip 4-tick) and the 16a/18b residual axis-cue items stay open — Nick's live render
  first.

- **Arc B (S261–262, `111e5d6`) — copy transcription DONE, but the method-prose sub-theme was NOT in
  scope. THE FINDING OF THIS PASS.** Arc B shipped: the CCR/28th card, locality-in-prose, three
  cross-reference pairings, parenthetical reconciliation, and the verdict-text transcription. It did
  NOT shorten the how-it-works prose, de-jargon it, or drop the methodology.md citations — those ~16
  rows ("How this test works too long / jargony / cites internal doc", across 2a, 3a, 3b, 7a, 8a,
  10a, 11b, 12a, 14a, 15b, 16a, 25a, 26a, plus the cross-test description-consistency umbrella) were
  bare "Arc B" and read as closed once Arc B closed. Re-tagged "Arc B — method-prose pass (OPEN)" and
  banked as the Arc B method-prose follow-up. This sub-theme is otherwise unhomed in STATUS — the arc
  reads as complete without it.

- **10a (DS10 Column-GoF) — S266 deepened the S252 NOT-A-DEFECT ruling.** Confirmed genuine true
  positive via clean-counterpart contrast (DS09 silent), and resolved a stale calibration record
  (pooled col5/105× → per-condition 5 Vehicle cols ~55×; METHODOLOGY + TEST-GROUND-TRUTH edits S266).
  The "Expected (ratio=1)" reference line hugging the baseline is scale-inherent, → parked #9.

**Still genuinely open after this pass:** the verdict-text rephrasings (4a/4b, 5a/5b, 6a/6b, 7b,
8a/8b — blank, likely a verdict-phrasing template); the Arc B method-prose cluster (above); Arc C
legend keys (S267 read-only); the axis eyes-on tail; the two OPEN carry-ins (13b bare-"p",
25a "Col N" label); and the assorted reference-line / two-tone / data-model rows routed to S245 arcs.

---

## Clean rows (verified, no finding)

Optional running tally so you can see coverage without scrolling the sheet. Tick the id as you shoot-and-clear it; or skip this block and trust the sheet's checkboxes. Whichever's less friction.

```
test1a  test1b  test2a  test2b  test3a  test3b
test4a  test4b  test5a  test5b  test6a  test6b
test7a  test7b  test8a  test8b  test9a  test9b
test10a test10b test11a test11b test13a test13b
test12a test12b test14a test14b test15a test15b
test16a test16b test17a test17b test18a test18b
test19a test19b test20a test20b test21a test21b
test22a test22b test23a test23b test24a test24b
test25a test25b test26a test26b test27   test28
```

---

## At close

I take this log, route every finding to its arc (card-surface residual / performance / methodology pass / export / parked #), lock the FLAG set into scoped fixes batched by arc, and confirm the S223/S225 pendings. The seven no-anchor rows (7a, 9a, 11a, 13a, 15a, 18a, 27) close as a documented fixture gap, not failures.
