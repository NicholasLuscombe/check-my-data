# P93 disposition — replicate identity and the measurement axis

**Status:** drafted at S375 on the two-pass structural census and rewritten the same session after the
candidate-6 curve was read. **Not yet cross-model validated and not yet promoted.** Owner: Chat.
Tracked file; must land as a commit.

**Supersedes:** P93's framing as a design problem with no test cases, and its description as an
axis-plus-signal pair. **It also supersedes this document's own first draft**, which treated the
derived-coordinate category as an open item beside the fix. It is not beside the fix. It is the whole
of what makes the fix hard.

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

**The one rate P93 has.** Ten of seventeen paired sheets, on one test — Residual Spike Correlation —
from `probe-s352-field-dispersion.mjs`, recorded in `docs/sessions/SESSION352-SUMMARY.md`. **Not ten
tests, and the denominator is the paired set rather than the corpus.** Any statement of the figure
carries both.

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

**Every count below is measured against an axis set authored from header text.** There is no ground
truth. The census measures agreement with a labelling, and §3 is where that stops being a caveat and
becomes the finding.

---

## 3. There are three categories, and the third is the whole problem

`Fig. 4b` holds six column groups whose two columns are an Arrhenius pair — `1/(KB*Tm)` against
`ln(Tm2/βh)`, both derived from the same five peak-temperature-and-heating-rate measurements. Five rows
each, so every statistic there rests on four differences.

**Neither column is a replicate of the other and neither is an independent measurement.** They are two
transforms of one quantity. The reference set labels one an axis and one a signal, and that labelling
is an artefact of which one got plotted horizontally.

**Every column in the overlap region is from that sheet, on both sides.** The axis population's maximum,
0.3646, is an Arrhenius abscissa. The non-axis population's minimum, 0.1499, is an Arrhenius ordinate.
Six non-axis and fourteen axis columns sit inside `[0.1499, 0.3646]`, and the six are all `Fig. 4b`.

**So the discrimination problem is not axis against signal. It is derived coordinates against
everything else.** §4 gives the numbers.

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

The measured curve: `< 0.3` selects 57 axis, 6 non-axis, 0 fixture. `< 0.5` selects 60, 6, 0. `< 1`
selects 60, 7, 0. **So 60 / 6 / 0 holds across the whole band from just above 0.3646 to wherever the
seventh non-axis column sits, between 0.5 and 1.** A plateau that wide is not a tuned threshold.

### And the six it takes are the third category, not signals

**Remove `Fig. 4b` and the two sheet populations separate completely.** The highest remaining axis
column is 0.2506, a `Temperature (K)`. The lowest remaining non-axis column is above 0.5 — by the
per-column dump it is C15's `Fig. 5` group 1 `Mean` at 0.8481. **An empty band from 0.2506 to 0.8481,
holding nothing.**

*(The separation and the identity of the seventh column are Chat's arithmetic over the probe's own
output, not figures the probe reported. Confirm both before this promotes.)*

So the rule's six errors are six columns that are not replicates either. **On this corpus, at a
threshold in the plateau, every column the rule selects is a column that should not be treated as a
replicate.** That is a stronger result than the first draft claimed, and it rests on twelve sheets in
one file.

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
2. Columns below the threshold are **named**, with a reason, in the import view.
3. The user confirms or overrides. Confirming re-runs.
4. **The report states which columns were held out and why.** A held-out column is never dropped
   silently.
5. **A hold-out that leaves a group with no columns announces that**, per §5.
6. **If nothing is suggested, behaviour is unchanged.** The fallback is current behaviour, not a silent
   drop — the same self-validating property the group-attribute rule was built on.

**One thing must be said plainly rather than left to the word "confirmation".** A pre-ticked suggestion
that informs rather than gates, on a user who does not engage, **is automatic exclusion with
disclosure.** The confirmation supplies an override, not a gate. That should be the description in the
methodology.

**The asymmetry is why the pre-tick is defensible.** Leaving an axis in produces false positives at a
measured ten of seventeen on one test. Taking a real column out hides fabrication in a measurement
column and nothing announces it. Those harms are not equal — but in the plateau the rule takes 60 of 60
axes, 0 of 160 fixture replicates, and 6 columns that §3 argues are not replicates either. **Precision
that high, plus disclosure, carries the pre-tick. Lower precision does not, and the threshold must be
set before this is wired.**

**The rejected alternative** is automatic exclusion with no surface. Cheaper. On six `Fig. 4b` groups it
would have removed every column and produced nothing, and no reader would have known why.

---

## 7. What must be specified before implementation

- **The threshold.** The plateau's lower edge is 0.3646 and its upper edge is not pinned. Setting it
  above the fixture minimum of 14.4 would start taking genuine replicates.
- **Null handling, and it is not a detail.** `Fig. 3g` position 3 carries 11, 503, 823, 949 and 1,020
  nulls across five groups of the same time column, with variation of 0.037, 0.198, 0.106, 0.072 and
  0.053. **One of them is the single `Time (s)` inside the overlap.** The relation across the five is
  not clean, so no mechanism is claimed here — what is claimed is that the statistic depends on whether
  differences are taken across gaps, and nobody has chosen.
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
with nothing announcing it, on user files as much as on this one. It belongs here as a caveat about
what the rule computes on, not as an exposure.

---

## 10. Corrections this census forces elsewhere

- **`STATUS`** — "C25's fifteen column-grouped sheets" is twelve of fifteen, C15 holding three; "no
  test cases and now has fifteen" is wrong on both halves, since DS23 and DS24 are instances; "ten
  MODERATEs on real spectra" is one test on ten of seventeen paired sheets.
- **`STATUS`** on DS24, half-refuted, and on its citation, which describes a four-column pre-rebuild
  file that no longer exists.
- **The charter's "widest fixture is 1,501 rows × 19 cols"** — two maxima from two files, and both are
  raw counts. In analysis terms it is 1,500 rows (DS11, 4 data columns) and 18 data columns (DS16, 60
  rows).
- **`V1X-DECIDED.md`** — `engine.js:109` is `:113`.
- **`REALWORLD-CORPUS-SPEC.md`** — the `Fig. 2b` wavelength reading. All four columns start at 400.0
  and differ in step and span, at 1, 0.2, 2 and 2 nm. **414.2 is a sample within the phosphorescence
  column, not its start**, which is consistent with the authors' admission that the data were pasted
  into wrong wavelength positions.
