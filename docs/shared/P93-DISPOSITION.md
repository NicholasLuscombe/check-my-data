# P93 disposition — replicate identity and the measurement axis

**Status:** drafted at S375 on the two-pass structural census, rewritten the same session after the
candidate-6 curve was read, landed at `2e85c8a`, and **corrected at S376.** Owner: Chat. Tracked file.

**What S376 changed.** The two figures §4 rested on were confirmed by measurement and the caveat asking
a reader to confirm them is gone. §3 carried a false sentence about the overlap region and it is
replaced with the census's own count. §10's corrections to other documents were checked at source and
three of the five were wrong about what those documents say. **A second correcting commit followed
the adversarial read** — see §11.

**The adversarial read has run and §3 and §6 both fell.** §4's measurements were not attacked. What
changed is the framing above them and the default below them: the third-category claim is demoted to a
description of this corpus, the pre-tick is dropped, and the ten-of-seventeen figure is restated as
what it is.

**Supersedes:** P93's framing as a design problem with no test cases, and its description as an
axis-plus-signal pair. **It also supersedes this document's own first draft**, which treated the
derived-coordinate pairs as an open item beside the fix. On this corpus they are not beside the fix —
they are every error the rule makes. Whether that holds anywhere else is §11's first named
measurement, and it does not exist.

---

## 1. What the defect is

Where a column group holds a measurement axis alongside a signal, the engine reads the two as
replicates of one measurand. Every replicate-based test then runs on a pair that was never a pair.

**The scope is exact and it is total.** All 138 columns across the fifteen column-grouped corpus sheets
carry `role === "data"` and all 138 enter `dataCols`. Sixty are measurement axes. **No mechanism
anywhere in the pipeline can hold one out.**

`dataCols` is built at `engine.js:113`, not `:109` as `V1X-DECIDED.md` states — `:109` is the leading
comment. The claim that it is the sole entry to the battery holds: `runFullAnalysis` takes the matrix
as a parameter and never builds one, and `confirmGrouping.js:72` routes through the same
`extractAnalysisInputs`, only ever demoting condition to label.

**The one rate P93 has, and it is not a false-positive rate.** Ten of seventeen paired sheets, on one
test — Residual Spike Correlation — from `probe-s352-field-dispersion.mjs`, recorded in
`docs/sessions/SESSION352-SUMMARY.md`. **Not ten tests, and the denominator is the paired set rather
than the corpus.**

**It is a firing rate.** Nobody has checked those ten firings against ground truth, so whether they are
artefacts of layout or genuine dependence is assumed rather than measured. **P93's entire cost argument
rests on that assumption**, which makes it dependent on step 3 of the road. Any statement of the figure
carries all three qualifications.

---

## 2. The evidence base, and how wide it is not

Fifteen column-grouped sheets: **twelve in C25, three in C15**. C15's three carry `Mean` and `SE`
columns and hold no axis at all, so **P93's evidence rests on twelve sheets in one instrument
workbook**. Two further C15 sheets are empty after preprocessing and were unreached.

Inside the fixture corpus the defect is present but different. **DS23 holds the claim in full** — three
mutually unrelated columns spanning 9.2× in mean and 188× in standard deviation, pairwise correlations
between −0.11 and 0.21, read as replicates of one measurand. **DS24 holds it only half:** its three
columns are mutually unrelated but scale-matched to within 2.2% in the mean and 6.5% in the standard
deviation. It is a P93 instance without the heterogeneity its citation describes.

The `vfs-*` trio stays undeterminable, now for a stated reason: each file's two columns are
scale-matched to within a percent, non-monotone, and mutually uncorrelated. **That is simultaneously
what replicates of a homogeneous process look like and what unrelated measurands from one physical law
look like**, and no measurement in this census separates them.

**Every count below is measured against an axis set authored from header text.** The set is
`AXIS_HEADERS` in `test/probes/probe-s375-p93-census.mjs`, six headers, and one of the six is the
contested `1/(KB*Tm) (eV-1)` that §3 argues is not an axis at all. There is no ground truth. The census
measures agreement with a labelling, and §3 is where that stops being a caveat and becomes the finding.

---

## 3. `Fig. 4b` is a derived-coordinate pair, and its columns are what the rule gets wrong

`Fig. 4b` holds six column groups whose two columns are an Arrhenius pair — `1/(KB*Tm) (eV-1)` against
`ln(Tm2/βh)`, both derived from the same five peak-temperature-and-heating-rate measurements. Five rows
each, so every statistic there rests on four differences. **Both headers occur nowhere else in the
corpus**, so excluding the sheet and excluding the two headers are the same exclusion, and the
contested membership above cannot reach any figure in §4.

**Neither column is a replicate of the other and neither is an independent measurement.** They are two
transforms of one quantity. The reference set labels one an axis and one a signal, and that labelling
is an artefact of which one got plotted horizontally.

**Both ends of the overlap region are `Fig. 4b`, and every non-axis column inside it is `Fig. 4b`.**
The axis population's maximum, 0.3646, is an Arrhenius abscissa. The non-axis population's minimum,
0.1499, is an Arrhenius ordinate. Twenty columns lie inside `[0.1499, 0.3646]` — six non-axis and
fourteen axis. **All six non-axis columns are `Fig. 4b` ordinates**, spanning 0.1499 to 0.1976.

The fourteen axis columns are counted and they are mostly not `Fig. 4b`:

| Header | Columns | Range |
|---|--:|---|
| `Temperature (K)` | 8 | 0.1568 – 0.2506 |
| `Time (s)` | 1 | 0.1984 |
| `1/(KB*Tm) (eV-1)` | 5 | 0.2490 – 0.3646 |

**Five `Fig. 4b` abscissae, and nine columns from other sheets.** The sixth abscissa sits below 0.1499,
outside the interval. **Those nine are not errors** — the rule is meant to select axis columns, and
inside the overlap it still does. The single `Time (s)` at 0.1984 is the column §7 flags for null
handling.

**So every column the rule gets wrong is one sheet.** That is a description of this corpus, and it was
drafted as more than that. Six five-row groups from one figure in one paper cannot establish a third
column category; they establish that on these twelve sheets the exceptions are localised and physically
explicable. **The reasoning that an Arrhenius pair holds no replicate is domain reasoning about a
deterministic transform, not a measurement in this document.** §4 presented it the other way round and
no longer does. What generalises is the discriminator. What does not is the taxonomy.

*(S375's census stated the twenty-column split correctly in both places it appears, and counted the
fourteen by header. The claim that the overlap was `Fig. 4b` on both sides was this document's, written
directly above the correct sentence, and it propagated to `STATUS.md` from here.)*

---

## 4. What the candidates cost

### Strict monotonicity is dead, and it fails on a property rather than on a count

It selects 59 of 60 axis columns, 8 of 78 non-axis sheet columns, and 0 of 160 fixture data columns.
The eight look like a small price. They are not why it fails.

**`Fig. 4e` is why.** It records one OLED decay five times on one time grid. The five luminance columns
have first-difference coefficients of variation of 2.654, 2.659, 2.673, 2.681 and 2.708 — the same
column five times by any measure — and **only cycles 2 and 5 are strictly monotone.** The other three
each carry a genuine uptick, none of them a tie.

Whether a column is monotone is decided by measurement noise, not by what kind of column it is. **A
property that varies across replicates of one physical thing cannot classify that thing.**

It fails symmetrically in the same workbook. Two headers split on monotonicity within their own sheet:
`Fig. 3b-c`'s `Temperature (K)`, an axis, monotone in four groups of five; `Fig. 4e`'s `Luminance`, a
signal, monotone in two of five. **One axis leaks out and one signal leaks in.**

### First-difference variation separates on a wide plateau

| Population | n | min | 25th | 50th | 75th | max |
|---|--:|--:|--:|--:|--:|--:|
| axis sheet | 60 | 0 | 0.000134 | 0.0191 | 0.130 | **0.365** |
| non-axis sheet | 78 | **0.150** | 2.66 | 12.1 | 40.1 | 8,062 |
| fixture data | 159 | **14.4** | 55.8 | 169 | 843 | 133,800 |

One fixture column has no defined value — `14-crctest-survey.csv / Q1`, mean first difference exactly
zero.

**What separates is the axis population, not the sheets.** Every sheet column with a defined value is
at or below 8,062 and every fixture column at or above 14.4, so those two ranges overlap heavily. It is
only the axis maximum of 0.3646 that clears the fixture minimum, by a factor of forty. **The rule
distinguishes axes from everything else. It does not distinguish real data from synthetic.**

The measured curve: `< 0.3` selects 57 axis, 6 non-axis, 0 fixture. `< 0.5` selects 60, 6, 0. `< 1`
selects 60, 7, 0. All sixty axis columns are below 0.5, and the seventh non-axis column is the only one
added between 0.5 and 1. **So the 60 / 6 / 0 plateau runs from just above 0.3646 to 0.8481** — both
edges now measured. A plateau that wide is not a tuned threshold.

### Removing `Fig. 4b` separates the populations, and that shows less than it looks

**Remove `Fig. 4b` and the two sheet populations separate completely.** The sheet holds twelve columns,
six of each label, and removing it leaves 54 axis and 72 non-axis columns with no undefined value in
either.

- **Highest remaining axis column: 0.2506.** `C25.xlsx` / `Fig. 2f` / group `TL curves (2 h)` /
  `Temperature (K)`.
- **Lowest remaining non-axis column: 0.8481.** `C15.xlsx` / `Fig. 5` / group `βDON`, the first of
  three / `Mean`.
- **Nothing lies between them.** Zero columns of either population, strictly inside.
- **That column is also the seventh** — the one the `< 1` threshold adds. The two are one column, not
  two, which the earlier draft assumed without checking.

*(All four confirmed at S376 by re-running `test/probes/probe-s375-p93-census.mjs` against expectations
stated in advance. The flagless invocation is the only one that emits both the candidate table and the
candidate-6 curve; `--tabulate` and `--pass2` each emit one.)*

**What the gap is not.** `Fig. 4b` supplies both overlap endpoints and all six non-axis members, so
removing it and finding separation is close to a tautology — the gap's existence is near-guaranteed by
construction. **Its width is not.** The next non-axis column could have sat at 0.26. It sits at 0.8481,
a factor of 3.4 clear of the highest remaining axis column. That is a real measurement, and what it
measures is how localised the exceptions are, not that they form a category. **The category claim rests
on §3's physics and not on this gap.**

So the rule's six errors are six columns that are not replicates either. **On this corpus, at a
threshold in the plateau, every column the rule selects is a column that should not be treated as a
replicate.** That is a statement about twelve sheets in one file, and it is not evidence that the same
holds anywhere else.

---

## 5. The consequence nobody has specified: a hold-out can empty a group

At any threshold in the plateau the rule selects **both** columns of all six `Fig. 4b` groups — the
abscissae all sit below 0.3646 and the ordinates are the six named non-axis selections. **Six groups
lose every column they have.**

For a five-row Arrhenius fit that is arguably the honest answer. But the tool must then say so.

**METHODOLOGY has already ruled on this exact situation:** grouping that produces no usable structure
must announce it, because a silent fall-through renders as a clean verdict on a file the tests never
assessed. That is C16's failure and it is recorded as one. **A hold-out that empties a group is the
same failure arriving by a new route**, and the disposition inherits the rule rather than restating it.

---

## 6. The decision

**A suggester with disclosure, not a silent exclusion.** Precedent: the condition-grouping trigger,
promoted at `07887a5`. The situation is the one `METHODOLOGY` already ruled on for factor against
stratum — the distinction lives in the paper's methods section, not in the data, and any rule the tool
applies is a heuristic standing in for knowledge it does not have.

1. Compute first-difference variation per column within each column group.
2. Columns below the threshold are **named**, with a reason, in the import view. **The suggestion is
   not pre-ticked.**
3. Holding a column out takes an affirmative click. Doing nothing holds nothing out.
4. **The report states which columns were held out and why.** A held-out column is never dropped
   silently.
5. **A hold-out that leaves a group with no columns announces that**, per §5.
6. **If nothing is suggested, behaviour is unchanged.** The fallback is current behaviour, not a silent
   drop — the same self-validating property the group-attribute rule was built on.

**The pre-tick was proposed at S375 and is dropped at S376.** A pre-ticked suggestion that informs
rather than gates, on a user who does not engage, **is automatic exclusion with disclosure.** This
document conceded that and then overrode its own concession with the plateau's precision.

**That precision is in-sample.** 60 / 6 / 0 is measured on the corpus the threshold was chosen on and
on which the six errors were identified. It is not evidence of robustness anywhere else, so it cannot
carry a default that removes data.

Take it away and the concession stands unopposed. **The asymmetry is real and it does not run the way
the pre-tick needed.** Leaving an axis in produces firings that are visible and countable. Taking a
real column out hides fabrication in a measurement column and nothing announces the lost power. For a
fabrication screen, **the burden of the click belongs on the side that risks hiding fabrication.**
Unticked costs one click and loses nothing that has been measured.

**What would reverse this:** an out-of-sample precision figure, on a corpus whose axis labels were
assigned independently of the threshold. Round 2 acquisition is the only instrument that could produce
one.

**The rejected alternative** is automatic exclusion with no surface. Cheaper. On six `Fig. 4b` groups it
would have removed every column and produced nothing, and no reader would have known why.

**This section and §3 are the two the adversarial read must attack.** They are argument. Everything in
§4 is measurement.

---

## 7. What must be specified before implementation

- **The threshold.** The plateau runs from just above 0.3646 to 0.8481, both edges measured. Anywhere
  inside gives 60 / 6 / 0. Setting it above the fixture minimum of 14.4 would start taking genuine
  replicates.
- **Null handling, and it is not a detail.** `Fig. 3g` position 3 carries 11, 503, 823, 949 and 1,020
  nulls across five groups of the same time column, with variation of 0.037, 0.198, 0.106, 0.072 and
  0.053. **One of them is the single `Time (s)` inside the overlap**, at 0.1984. The relation across
  the five is not clean, so no mechanism is claimed here — what is claimed is that the statistic
  depends on whether differences are taken across gaps, and nobody has chosen.
- **Undefined variation.** One fixture column has a mean first difference of exactly zero. The rule
  needs a branch, not a crash.
- **Which matrix it computes on.** Post-trim, since that is what the battery sees.

---

## 8. What this does not decide

- **The wiring** — where the computation sits, and what role a held-out column takes. Not `label`, not
  `ignore`; the `attribute` role proposed for group attributes is the nearest existing vocabulary and
  may not fit.
- **The fixture consequences.** DS23 and DS24 carry the defect. Reclassifying a fixture column moves
  the flag matrix, and that needs a declared lane before implementation. **`WRITE_MATRIX=1` must not be
  used to absorb it.**
- **The `vfs-*` trio**, which no measurement here separates.
- **C25's Benford adjudication**, whose 5.82 OOM pooled span was measured on the surviving fifth of at
  least one column. Not claimed to move. Not checked.

---

## 9. The truncation, correctly sized

Six columns reach the battery with a smaller range than deposited, and `Fig. 2b`'s phosphorescence
intensity reads 13.71 as analysed against 10,270 as deposited — a factor of 750.

**It is not a threat to this rule, and the first draft said it was.** The six are disjoint from the
eight monotone columns; neither overlap endpoint is truncated; the affected columns sit far from any
plausible threshold at both ends; and no percentile boundary moves when they are excluded. Eight
interior percentiles shift slightly.

**It remains a real defect and it stays recorded** — a measurement silently cut to a fifth of its range
with nothing announcing it, on user files as much as on this one. It is register row P169. It belongs
here as a caveat about what the rule computes on, not as an exposure.

---

## 10. Corrections this census forces elsewhere

**Every entry below was checked at source at S376.** Three of the original five were wrong about what
the target document says, and those three are struck.

- **`STATUS.md`** — the sheet split, the test-case claim and the "ten MODERATEs" figure. **Applied —
  three sites in the S375 rewrite, the fourth at S377.** The previous version of this bullet claimed the wide overlap sentence reached STATUS's P93 row and road item 2. **That was asserted without reading either.** The P93 row carried the correct narrow form. Road item 2 was read at S376 and did carry the wide sentence, and **S376's own STATUS rewrite corrected it** — road item 2 now states the narrow form and names this document as the source of the wide wording. `S376-CHAT-OPENER.md` carried it too and is spent.
- **`STATUS.md`'s register count** — the table held 129 rows to P169 against a counting paragraph
  saying 128 to P168. Corrected at S376, which replaced the paragraph's arithmetic with a
  regenerating matcher. The table now holds 131 rows to P171. **Not caused by this census**, but
  found alongside it, and it is the third instance of the pattern P79's own row records.
- **`V1X-DECIDED.md`** — `engine.js:109` is `:113`, **and the string occurs twice**, at the choke-point
  claim and again in a source-provenance line. The routing slip called it one line.
- ~~**The charter's "widest fixture is 1,501 rows × 19 cols"**~~ — **the figure is not in
  `project-instructions.md` at all.** It occurs in thirteen files: five in `docs/shared/archive/`, two
  session summaries, the S375 census (where it is already corrected), this document, `BANKED.md` twice,
  and `METHODOLOGY.md` and `METHODOLOGY-TESTS.md` once each. Archive and session files are history and
  do not get rewritten. **The two live sites say only "the corpus tops out at 1,501 rows"** against a
  10,000-row threshold, where the raw count is the right count and 1,500 would change nothing. **No
  repository edit is owed.** The compound form is a Chat artifact's, and that is where it is fixed.
- ~~**`REALWORLD-CORPUS-SPEC.md` — the `Fig. 2b` wavelength reading**~~ — **the spec is not wrong.**
  It says the phosphorescence *spectrum* genuinely started at 414.2 nm, which is the authors' own
  admission, and then explains that the data were pasted into wrong wavelength positions. The census
  measured that all four *columns in the deposited file* start at 400.0, differing in step and span at
  1, 0.2, 2 and 2 nm. Both are true about different objects, and the paste error is why they differ.
  **What is owed is an addition, not a correction:** state the deposited column start beside the true
  spectrum start, so a reader of the file is not surprised.
- ~~**`REALWORLD-CORPUS-SPEC.md` — the C25/C15 sheet split**~~ — **already applied**, in two places.
- **Anywhere the ten-of-seventeen figure is called a false-positive rate.** It is a firing rate, per
  §1. Not swept. `STATUS.md`, `METHODOLOGY*.md` and `BANKED.md` all need checking.

---

## 11. The adversarial read

Run at S376 on §3 and §6, the two sections this document nominated as argument. **Both fell.** §4 was
not attacked and stands.

**Accepted in full.**

- The empty band is near-tautological as evidence for a category. §4 now says so.
- The plateau's precision is in-sample and cannot carry a default that removes data. §6 now says so,
  and the pre-tick is gone.
- Ten of seventeen is a firing rate never checked against ground truth. §1 now says so, and it makes
  P93's cost argument dependent on step 3 of the road.

**Rejected.** That changing the taxonomy detaches a measured rate from the sheets it was measured on.
A firing rate attaches to files, not to labels. The read reached the right conclusion — the rate is
uninterpreted — by a route that does not work, then reached it properly as its third point.

**Not usable.** Recognising derived-coordinate pairs by header semantics, transform signatures or user
annotation needs knowledge the tool does not have. That is why the discriminator exists.

**Two measurements are named and neither exists.**

- **A second corpus** holding several distinct derived-coordinate constructions — Arrhenius pairs,
  transformed time axes, calibration curves — whose first-difference variation falls in the same band,
  with replicate-based tests firing on them at comparable rates. **Round 2 acquisition.**
- **An out-of-sample precision figure**, on axis labels assigned independently of the threshold.
  **Round 2 acquisition.** Until it exists the threshold is defensible and a removing default is not.
