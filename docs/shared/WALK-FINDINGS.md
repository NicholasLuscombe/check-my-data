# Walk Findings Log

> **⚠ VERIFY BEFORE REPLACING.** This full file = the source `docs/shared/WALK-FINDINGS.md` read at
> S247 close; the S246 RowMean deferrals (Test22a + Test22b) are retagged `DONE S247 f6c9614` this
> pass — the RowMean plot-legibility redesign that resolved them shipped in S247. Before overwriting the
> tracked copy, confirm it has not drifted since: `git log -1 -- docs/shared/WALK-FINDINGS.md` and diff.
> If findings were appended to the tracked copy after this read, merge them in rather than overwriting —
> a full replace would clobber them. "Committed" ≠ "content-current."

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
| Test 2a | How this test works text, implications etc | "Checks for clusters of constant offsets. For each row, computes the difference between replicate pairs and checks whether that difference repeats in neighbouring rows. Significance assessed by shuffling row order (permutation test)." - the description is confusing. Also does it just test copy paste across columns? It could also happen that you copy an entire row copied? This affects all the descriptions. <br /><br />AImplications -> constant difference between replicates over consecutive rows can result from batch corrections or instrument drift adjustments applied uniformly to a block. It can also indicate that one row was copied and a fixed value added or subtracted to create neighbouring rows. | Arc B |
| Test2b | Display balance | Fine - except for the same balance/clarity issue in test1b. |  |
| Test3a | Verdict text | DS02 - The 5 noisiest rows are the same in every condition verdict seems wrong. Inhibitor_B is not correlated at all. Also which are the five noiseiest rows? It seems the correlation is throughout, rather than in spikes. |  |
| Test 3a | How this test works. | too wordy. Identifies which rows are unusually variable between replicate pairs and tests whether the same rows are noisy across multiple conditions. In typical data, noisy rows vary independently across conditions — coordinated residual spikes suggest shared structure. Significance assessed by shuffling row order (permutation test). The correlation between each row pair's residuals is measured as a rank correlation (Spearman ρ), so it responds to consistent co-movement rather than the size of individual spikes. This is distinct from Noise correlation and Noise sign-pattern, which look at how a single replicate pair behaves from one row to the next. This test instead asks whether the same rows are the noisiest ones across several different conditions — coincidence that points to a shared edited region rather than to genuine measurement noise. | Arc B |
| Test3a | What to look for | Description mismatch - Blue shading shows where each condition has high residual noise. When multiple strips light up at the same row, that noise is coordinated. The heatmap below shows pairwise ρ — high values (≥ 0.4) between conditions that should be biologically independent suggest shared construction. |  |
| Test3b | How this test works | Same issue re How this test works text but otherwise the testcard looks fine. | Arc B |
| Test4a | Verdict text | -> Leading digits are not distributed as expected? |  |
| Test4a | Plot wrapper | Wrapper doesnt hug the sides of the plot | Arc A |
| Test4b | Verdict text | -> Leading digits are distributed as expected? |  |
| Test4b | Plot wrapper | Wrapper doesnt hug the sides of the plot | Arc A |
| Test5a | Verdict text | -> Second digits are not distributed as expected? |  |
| Test5a | Plot wrapper | Wrapper doesnt hug the sides of the plot | Arc A |
| Test5b | Verdict text | Second digits as expected -> Second digits are distributed as expected? |  |
| Test5b | Plot wrapper | Wrapper doesnt hug the sides of the plot | Arc A |
| Test6a | Verdict text | Last digits are not evenly spread -> Last digits are not distibuted as expected? Why is this text here? 9-digit test (digit 0 excluded) -> and 0 shown in the plot. |  |
| Test6a | Plot wrapper | Wrapper doesnt hug the sides of the plot | Arc A |
| Test6b | Verdict text | Last digits evenly spread · 9-digit test (digit 0 excluded) -> Last digits are distributed as expected? Should 0 be excluded from the plot? |  |
| Test6b | Plot wrapper | Wrapper doesnt hug the sides of the plot | Arc A |
| Test7a | How this test works | How this test works description is overly long and cites methodology doc which is an internal document. | Arc B |
| Test7b | Verdict | Consistent precision throughout -> Consistent decimal precision throughout dataset? |  |
| Test7b | Plot wrapper | Wrapper doesnt hug the sides of the plot | Arc A |
| Test8a | Verdict text | 2 numbers appear more often than chance allows -> 2 numbers appear more often than expected? |  |
| Test8a | Table | What does "Pass" mean? Shouldn:t there be a verdict column consistent with other tables? |  |
| Test8a | How this test works | How this test works description is overly long and cites methodology doc which is an internal document - same for implications etc | Arc B |
| Test8b | Verdict text | No number over-represented -> No numbers appear more often than expected? |  |
| Test9a | NA |  | no-anchor (fixture gap) |
| Test9b | DS01 | Distinct numbers is categorised under Distribution shapes. Legend is off. Expected line is grey, column labels clash. Would it be useful to have the table also? | Reference-line arc S245 (grey expected line → teal null per channel-3 amendment, in the retoken); legend/labels → legend-vocab convergence |
| Test10a | DS10 | Non-intuitive legend explanation. <br />Null median (ratio = 1)<br/>Col 6 skipped — near-uniform shape — too flat to fit a distribution<br/>Bar shows a single condition; full per-condition detail in the table below. |  |
| Test10a | DS10 | Is the test working properly if the expected is ratio =1 and observed are >50. Seems a misfit of null. Also each column has mis of control and treatment, so it seems you are mixing conditions? |  |
| Test10a | DS10 | Table the Direction is in the wrong place - that usually comes at the end of the table columns? |  |
| Test10a | DS10 | How this test works etc are too long and jargony. | Arc B |
| Test10a | DS20 | Similar comments to DS10, though the test seems to work more sensibly.I don:t understand the explanation for the skipped column. (screenshot test10a-3) |  |
| Test10b | DS01 | Many cols so plot x-axis labels clash - maybe make diagonal? Expeced null is shown in grey - is that supposed to be green? Lagend is in the wrong place. Would the table be useful here too? Would it be useful to have a CI? | Reference-line arc S245 (grey expected null → teal, NOT green — it's a null, channel-3 amendment); x-axis clash → Arc A; legend → legend-vocab |
| Test11a | NA |  | no-anchor (fixture gap) |
| Test11b | DS17 | All columns single peaked but the dipstatistic is non-intuitive (0.01 means what?). Expected or threshold? eitherway should it be grey? Legend positioned wrongly. | Reference-line arc S245 (it's a THRESHOLD not a null → faded/dashed RED per channel-3 amendment, not grey, not teal); dipstatistic meaning → Arc B; legend → legend-vocab |
| Test11b | DS17 | How this test works etc is non-intuitive. | Arc B |
| Test13a | NA |  | no-anchor (fixture gap) |
| Test13b | DS01 | Visual Walk includes it under section C. Shouldn:t it be Section D?<br />Does not fire on DS01. In fact name Noise Distribution doesn:t appear on the 28 test list Screenshot test13b-1 | DEFER display-name review (section placement CONFIRMED CORRECT S245 — card renders under Cross-replicate comparisons, screenshot test13b-1; the name "Noise distribution" pulls the eye to "Distribution shapes" by adjacency, and is absent from the §5 battery list which calls it "kurtosis + Anderson-Darling". Both resolve when the name does — rename to disambiguate from cat-3 + propagate to METHOD_BATTERY) |
| Test13b | (S245) | Per-condition table column headed bare "p"; on a cleared card Inhibitor_B/Treatment_B shows p below 0.01 yet Finding "Normal". Is it raw or adj-p; does Finding read off it or off the FISHER_EXEMPT effect-size gate? | OPEN — structure-first read-only (drafted S245, not dispatched): if a correction is applied and the cell shows adjusted value, header → "adj. p"; if no correction and Finding reads off the effect-size gate, bare "p" is correct |
| Test12a | DS08 | Plot label in the wrong place | Arc A |
| Test12a | DS08 | "No localised row ranges detected — elevated correlation is uniform across all rows." seems to be in the wrong place. Its a verdict normally there is a table below but in the absence its misplaced. Also font size is too bit for hierarchy. | DONE S243 (IRC render order data-driven, 201d98d) |
| Test12a | DS08 | How this works text etc, rather than tracked, would be better to say correlate? | Arc B |
| Test12a | DS02 | Plot wrapper doesn:t hug. Plot verdict could be -> Replicates for Inhibitor_B correlate...<br />Table shoul dhave p-values? What is the point of showing only 20 rows out of 51 - where should the user find the other 51? (screenshot test12a-3) | Arc A (wrapper) + blank (table/p-value substantive) |
| Test12b | DS01 | DS01 flaggs elevated replicates but test clears... (screenshot test12b-1) | DONE S243 (un-gated amber tier dropped, 201d98d) |
| Test14a | DS11 | Plot y-axis labels nearly overlap. Wrapper doesn:t hug width.<br / | Arc A |
| Test14a | DS11 | The line shows lag-k means across pairs; dots are per-lag values. The mean ± 95% CI marker at lag 1 carries the verdict — average serial correlation across pairs is reliably above zero when the interval excludes the dashed reference. - length text after the plot. | Arc B |
| Test14a | DS11 | What is the pooled autocorrelation? Table content is non-intuitive and text after table is also non-intuitive. |  |
| Test14a | DS11 | Long explanatory text in how this test works. | Arc B |
| Test14b | DS01 | Similar comments as for test 14a. Previous comment CI should be centered on the expected line. Expected line is grey? Also CI should be 99% no, since alpha is 0.01. | Reference-line arc S245 (grey r=0 → teal null + PooledR1Marker brought to full treatment + legend key — the CI-vs-r=0 overlap IS the verdict); CI/α-consistency → blank (possible methodology, route after methodology read) |
| Test15a | NA |  | no-anchor (fixture gap) |
| Test15b | DS01 | Looks fine. Is there a useful plot that could be shown? Also BH-FDR alpha at 0.05 - isn:t is 0.01 on all other test cards? |  |
| Test15b | DS01 | All windows are consistent with independent noise in each pair (BH-FDR at α = 0.05). - this text is poorly placed. Should be together with the table title to explain whats in the table. |  |
| Test15b | DS01 | How this test works is too long and refers to methodology.md. | Arc B |
| Test16a | DS22 | Strange result. Noise signs clump plot shows Rep1-Rep5 but then in the table below rep1-rep5 adj p is as expected. No explanation of what the x is indicating. |  |
| Test16a | DS22 | Again How this works text is too long. | Arc B |
| Test16b | DS01 | Looks good except the test by condition was unexpected. Is it an aggregate p-value per condition? Shouldn:t that be shown even if its only one condition as in DS22? |  |
| Test16b | DS01 | I though all the plots were going to use consistent colouring, but they still differ between testcards - the blue here isn't standard. | Two-tone arc S245 (root cause: SignStrip Cambridge pale-blue `#A3C1DA` sits close to `CC.OBS` and reads as a wrong observed-blue; → `CC.OBS` + Oxford navy. Observed blue itself already 100% on `CC.OBS` — audit found no stray observed blue) |
| Test17a | DS06 | Looks good. But CI should be 99%? |  |
| Test17a | DS06 | Each dot = one row (55 rows). Solid line = observed fit with 95% CI band. Dashed = expected for cell counting / viability. - non-standard legend. |  |
| Test17b | DS03 | Looks good similar comments to test 17a. |  |
| Test18a | NA |  | no-anchor (fixture gap) |
| Test18b | DS03 | Plot is very strange with no axes and unexplained threshold. what is each datapoint? How do you show unusually low spread? |  |
| Test19a | DS20 | Plot x-axis labvels nearly clash. wrapper Doesn:t hug. Table looks good. | Arc A |
| Test19b | DS01 | Distribtuion Shapes and Cross replicate Comparisons, Cross-condition cluster names have unusually large gap to icon.  (its probably when the title name text wraps) |  |
| Test19b | DS01 | Why does this switch to bar chart from whisker plot? The different data presentation is surprising. |  |
| Test20a | DS21 | One region noisier than the rest — rows 82–96 but plot shows two regions. Wrapper not hugging. Columns y-axis label is cut off. | Arc A (wrapper + axis) + blank (region-count substantive) |
| Test20b | DS01 | I don:t really understand what the table is showing. Condition Best window, Ratio. Not so meaningful in this case. |  |
| Test21a | DS08 | Looks pretty good and straightforward. | NOT-A-DEFECT — clean |
| Test21b | DS01 | Shows a change point even though its even throughout. | DONE S243 (changepoint marker gated on flag, 4079be7) |
| Test22a | DS21 | Row averages run in streaks of what? I guess the expected is 0 and its spending too much time above or below? Plot is quite messy. Should you mark the blocks with shades? Should there be a table? | DONE S247 `f6c9614` — RowMean redesigned: `RowMeanTrendPlot` retired; per-condition `SignStripPlot` block-width render (one rect per run, width ∝ run length — the "mark the blocks" ask) + run-length evidence table (the "should there be a table" ask). Streaks now legible: DS21 Control fat-block streak vs Treatment even comb. Screenshot-gated. |
| Test22a | DS21 | Good How this test works explanation | DONE S247 `f6c9614` — prior "clean" tag was a missed baseline error: the explainer described crossings of the "condition-wide mean" (grand mean), but the statistic signs residuals around the fitted OLS trend. Rewritten to fitted trend + Wald-Wolfowitz + expected-runs formula `1 + 2·n₊·n₋/n`. Caught at the S247 human-read gate. |
| Test22b | DS03 | The plot still shows a lot of jagged lines, so it doesn't convey how it is clear. | DONE S247 `f6c9614` — same component as Test22a (confirmed via read-only); same fix. DS03 (clear) now renders WT/KO as sparse fat-block alternation reading as "correctly not streaky", not dense jaggedness; the framing line orients that the clean read is correct. Screenshot-gated. |
| Test23a | DS06 | Looks pretty clean | NOT-A-DEFECT — clean |
| Test23b | DS01 | Good clean. Legend includes outlier and significance threshold not shown on plot. Should they be there? Wrapper doesn:t hug. | Arc A (wrapper) + Arc C (legend keys not on plot) |
| Test24a | DS21 | Very similar to Test20. Plot row should start at 2? |  |
| Test24b | DS17 | Looks fine. But All windows are consistent with a single condition-wide covariance / mean structure. text after table doesn:t feel right. Should table be ordered by condition when not significant? SHould myu and sigma be in same table? |  |
| Test25a | DS16 | Differences between conditions smaller than chance across most features but then plot shows a tall bar. I:m not sure how to interpret. | DONE S244 e8389d5 (sorted table + CV explain the tall bar) |
| Test25a | DS16 | Plot right hand 1.00 truncated. Y-axis not labelled. | DONE S244 e8389d5 (Count axis labelled) + Arc A (x-axis 1.00 truncation, wrapper-hug) |
| Test25a | DS16 | Bar height = count of features per p-value bin. Dashed line = expected under uniform. Highlighted bar = excess p-values near 1.0 (too balanced). How far the bars sit from the dashed expected line: p < 0.0001. - long txt description with no legend. | DONE S244 e8389d5 (ChartLegend added, caption gated + tightened) |
| Test25a | DS16 | Not clear how the table helps by listing each row. Also content not very useful. Better to show diff or something? | DONE S244 e8389d5 (CV column + signal-sort + file-row labels, column-grouped) |
| Test25a | DS16 | How this test works description is way too long. | Arc B |
| Test25a | (S244) | "Col N" label on the row-grouped branch is raw matrix column index, not a file column — wrong on proteomics/uniform fixtures. colIdx now emitted; no toFileCol; colHeaders/dColMap not threaded to the card. Right label is an open question (header name vs file column vs Excel letter). | OPEN carry-in |
| Test25b | DS17 | Mainly same comments. Grey bars look gloomy. I thought we were standardising with blue. | SUPERSEDED → Data-model arc S245. The S243/S244 NOT-A-DEFECT ruling (grey because a p-value histogram isn't observed data) is OVERTURNED: under the channel-4 data model the bars ARE observed marks and carry the verdict colour — non-driving bins blue `CC.OBS`, 0.90–1.0 driving tail red region. The user's "we were standardising with blue" was right |
| Test26a | DS19 | Minimap doesn't show significance |  |
| Test26a | DS19 | Testcard content too complicated to interpret. and Column Finding have to scroll a long way. |  |
| Test26a | DS19 | Amber rows are more alike across conditions than chance usually produces. Muted rows differ between conditions — which is what real treatments normally do — so they're shown for context, not flagged. 'Finding' reads off the corrected significance test — flagged pairs show 'Too similar', the rest read 'As expected'; 'Null median' is the midpoint of the chance range. - text too long | Arc B |
| Test26a | DS19 | How it works etc too long | Arc B |
| Test26b | DS01 | Same comments as test26a |  |
| Test27 | NA |  | no-anchor (fixture gap) |
| Test28 | DS15 | Is missing data pattern a cross-replicate issue? You could have missing data within a replicate? Is it the right test cluster? Plot shows replicates. |  |
| Test28 | DS15 | Test card is pretty clear. Wrapper doesn:t hug plot. Legend in wrong location. | Arc A (wrapper) + Arc C (legend) |
| Cross test | | Some test descriptions (How this test works) has the statistical test mentioned. Others not. There is some inconsistency in the description content for these tests. | Arc B (description-consistency) |

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
