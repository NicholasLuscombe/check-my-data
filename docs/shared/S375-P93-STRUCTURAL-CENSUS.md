# S375 — P93 structural census

**What this is.** P93 is the absence of a replicate-identity check. Where a column group holds a
measurement axis beside a signal — a wavelength column next to an intensity column — the engine reads
the two as replicates of one measurand, and every replicate-based test then runs on a pair that was
never a pair.

This document measures what is there. It decides nothing and changes no behaviour. No rule is adopted,
nothing is ranked and no fix is proposed. The discriminator that would separate an axis from a replicate
is Chat's to choose; this census is the ground it would be chosen on.

**Instrument.** `test/probes/probe-s375-p93-census.mjs`. Read-only against `src/`. It imports the
product's own import and role-inference chain and stops at `extractAnalysisInputs`, before
`runFullAnalysis`. No test runs, so no verdict, flag or severity is computed at any point.

**Route.** Corpus sheets go through the route `probe-s373-corpus-shape-census.mjs` established, which is
`scripts/corpus-run.mjs`'s own: `parseExcel` → `preprocessRaw` → `detectBlocks` → `detectHeaderRows` →
`inferBaseRoles` → `detectGroupAttributes` → `extractAnalysisInputs`. The `prepStructure` helper is
copied from that probe rather than reimplemented. Fixtures go through `validate-batch.mjs`'s own
preparation block. Nothing here hand-builds a matrix or parses a sheet directly.

**Route control.** The S373 probe reproduces all twelve of the published §0.3 cross-check figures
exactly, on the same run that produced this census's sheet list.

---

## The unit, and the source confirmation it rests on

The unit is the **column** — not the sheet and not the group. The operative question for each column is
whether it enters the analysis matrix.

`V1X-DECIDED.md` records `engine.js:109` building `dataCols` from `role === "data"` as the sole entry to
the battery. Confirmed at source, with one correction:

* The construct is at **`src/analysis/engine.js:113`**, inside `extractAnalysisInputs`. Line 109 is the
  leading comment of the same block. The citation has drifted by four lines; the claim it makes is
  sound.
* `runFullAnalysis` takes the matrix as a parameter (`engine.js:196`) and never builds one.
* `confirmGrouping.js:72` calls the same `extractAnalysisInputs`, having demoted unticked condition
  columns to `label`. Data columns are untouched, so its matrix is the engine's.
* The three other places in `src/` that compare a role to `"data"` are not matrix entries.
  `subjectPairing.js:107` skips data columns while hunting a pairing identifier, `roles.js:123` is
  upstream role inference, and `summary.js:4` is a display summary.

So there is one entry point, and the census unit is right.

---

## Part 1 — the fifteen column-grouped sheets

### The enumeration gate

`REALWORLD-CORPUS-SPEC.md` states at lines 52 and 252 that the corpus holds fifteen column-grouped
sheets, twelve of them C25's and three C15's. The probe walks **every sheet of both files** and keeps the
ones the pipeline column-groups, so this is a re-count from the files rather than a re-read of that
claim.

**Gate passes.** Fifteen column-grouped sheets. Twelve in C25, three in C15.

| File | Column-grouped sheets |
|---|---|
| `C25.xlsx` | Fig. 2b, Fig. 2d, Fig. 2e, Fig. 2f, Fig. 3b-c, Fig. 3d, Fig. 3f, Fig. 3g, Fig. 4b, Fig. 4c, Fig. 4e, Fig. 4f |
| `C15.xlsx` | Fig. 2, Fig. 5, Fig. S1 |

Twenty-five sheet records in all: fifteen column-grouped, eight grouped some other way or not at all,
and two **unreached**. `C15.xlsx / Article information` and `C15.xlsx / Column name` both fail with
"Empty after preprocessing". They are recorded as a result, not as an absence.

### Extents, and the two trims

The trim has two stages and they are different quantities. **At parse** is `preprocessRaw` dropping
sparse rows before anything is parsed. **At matrix** is the completeness filter inside
`extractAnalysisInputs` dropping rows where every data cell is null. Reporting one number for "the trim"
hides which stage moved.

| Sheet | Raw extent | Parsed | Valid rows | Trim at parse | Trim at matrix | Groups | Columns per group |
|---|---|---|---|---|---|---|---|
| C25 / Fig. 2b | 2003 × 11 | 401 × 8 | 401 | 1600 | 0 | 4 | 2 / 2 / 2 / 2 |
| C25 / Fig. 2d | 3602 × 8 | 3600 × 6 | 3600 | 0 | 0 | 3 | 2 / 2 / 2 |
| C25 / Fig. 2e | 302 × 8 | 300 × 6 | 300 | 0 | 0 | 3 | 2 / 2 / 2 |
| C25 / Fig. 2f | 25 × 20 | 22 × 14 | 22 | 1 | 0 | 7 | 2 × 7 |
| C25 / Fig. 3b-c | 3023 × 17 | 606 × 10 | 606 | 2415 | 0 | 5 | 2 × 5 |
| C25 / Fig. 3d | 399 × 14 | 395 × 10 | 395 | 2 | 0 | 5 | 2 × 5 |
| C25 / Fig. 3f | 309 × 8 | 307 × 6 | 307 | 0 | 0 | 3 | 2 / 2 / 2 |
| C25 / Fig. 3g | 1364 × 24 | 1362 × 20 | 1362 | 0 | 0 | 5 | 4 × 5 |
| C25 / Fig. 4b | 7 × 17 | 5 × 12 | 5 | 0 | 0 | 6 | 2 × 6 |
| C25 / Fig. 4c | 916 × 17 | 656 × 12 | 656 | 258 | 0 | 6 | 2 × 6 |
| C25 / Fig. 4e | 33 × 15 | 30 × 10 | 30 | 0 | 0 | 5 | 2 × 5 |
| C25 / Fig. 4f | 107 × 8 | 100 × 6 | 100 | 5 | 0 | 3 | 2 / 2 / 2 |
| C15 / Fig. 2 | 9 × 8 | 6 × 8 | 6 | 0 | 0 | 3 | 2 / 2 / 2 |
| C15 / Fig. 5 | 82 × 12 | 6 × 8 | 6 | 73 | 0 | 3 | 2 / 2 / 2 |
| C15 / Fig. S1 | 22 × 8 | 6 × 8 | 6 | 13 | 0 | 3 | 2 / 2 / 2 |

Across the fifteen sheets, **4,367 rows are dropped at parse and none at the matrix**. The 1,600-row
loss on `Fig. 2b` reproduces the figure the spec records, and it happens before the analysis matrix is
built. The completeness filter removes nothing anywhere.

### The parse trim truncates six columns, and nothing says so

Six columns hold a smaller range as analysed than as deposited.

| Sheet | Group | Column | As deposited | As analysed |
|---|---|---|---|---|
| C25 / Fig. 2b | Phosphorescence | Wavelength (nm) | 2001 values, 400 → 800 | 401 values, 400 → **480** |
| C25 / Fig. 2b | Phosphorescence | Intensity (a.u.) | 2001 values, 0.659 → 2352 | 401 values, 0.659 → **5.585** |
| C25 / Fig. 2f | TL curves (6 h) | Temperature (K) | 23 values, 303.7 → 400.3 | 22 values, 303.7 → 400.2 |
| C25 / Fig. 3b-c | TL curves, 2 K/min | Temperature (K) | 1512 values, 100.1 → 400 | 606 values, 100.1 → **220.1** |
| C25 / Fig. 3b-c | TL curves, 2 K/min | TL intensity (a.u.) | 1512 values, 0.0319 → 1.404 | 606 values, 0.0319 → **0.361** |
| C25 / Fig. 3d | Absorption of TPBi•+ | Wavelength (nm) | 397 values, 404 → 800 | 395 values, 404 → 798 |

On `Fig. 2b` all four wavelength axes span 400 to 800 nm in the deposit, at steps of 1, 0.2, 2 and 2 nm.
The trim keeps only the rows the coarser groups occupy, so the phosphorescence spectrum reaches the
battery cut off at 480 nm — its first fifth. On `Fig. 3b-c` the slowest heating rate loses its top three
quarters the same way. This is a consequence of the sparse-row rule meeting side-by-side series of
different lengths, and nothing announces it.

### Every column in every group enters the battery

**All 138 columns in all fifteen sheets carry `role === "data"` and all 138 enter `dataCols`.** No group
span holds a label, attribute or ignored column. There is no column the engine declines to treat as a
replicate.

That is the scope of P93 stated exactly: sixty axis columns are analysed as replicate measurements, and
the pipeline has no step at which any of them could have been held out.

### Per-column shape

Full per-column output — header, entry, monotonicity, first-difference coefficient of variation,
minimum, maximum, distinct count and null count — is in the probe's own report. The measurement
policies, each of which could reasonably be set the other way:

* Monotonicity and first differences are taken over consecutive **non-null** values in row order. A null
  is skipped, not treated as a break.
* Strictly increasing means every step is above zero. A single repeated value makes a column neither.
* The coefficient of variation of the first differences is the sample standard deviation over the
  absolute mean. It is undefined when the mean difference is zero.
* Distinct counts exact float values, and identity is exact float equality.

The headline shapes:

* **C25** runs an axis at position 1 of every group and a signal at position 2, except `Fig. 3g`, which
  runs four columns per group as two axis-and-signal pairs. Axis headers measured: `Wavelength (nm)`,
  `Time (s)`, `Decay time (s)`, `Temperature (K)`, `Magnetic field (mT)` and `1/(KB*Tm) (eV-1)`.
* **C15** runs `Mean` at position 1 and `SE` at position 2 in all three sheets. Neither is an axis.

### Cross-group identity

Measured two ways, reported separately. For each position within a group, whether that position's column
is value-identical across every group on the rows they share, and where it is not, the largest number of
leading rows on which they agree.

**Position 1 is identical across groups on four of the fifteen sheets** — `Fig. 3f`, `Fig. 4c`,
`Fig. 4e` and `Fig. 4f` — and not identical on the other eleven. **Position 2 is identical on none.**
`Fig. 3g`'s positions 3 and 4 are identical on none.

The four identical cases agree on every shared row: 307, 656, 30 and 100 rows respectively, with leading
agreement equal to the full length. Where identity fails it usually fails immediately — leading
agreement is 0 on most sheets and 1 on `Fig. 2b` and `Fig. 3g`, where every group starts at the same
value and diverges at the second row.

Repeating the same measurement on the pre-completeness-filter rows returns the same answers on every
sheet, which follows from the matrix trim being zero everywhere.

### The stated expectations

| | Expectation | Result |
|---|---|---|
| **E1** | Fifteen sheets, twelve C25 and three C15 | **held** — exactly |
| **E2** | C15's three column-grouped sheets are not `Data` | **held** — they are Fig. 2, Fig. 5 and Fig. S1; `Data` reads row-grouped through the same route |
| **E3** | Half of every C25 group's columns is an axis | **held** on all twelve C25 sheets, with one judgement call noted below |
| **E4** | C15's three sheets are not axis-plus-signal | **held** — they are `Mean` and `SE` |
| **E5** | Every axis column is strictly monotone with near-constant spacing | **INVERTED, on both halves** |
| **E6** | Cross-group value identity fails on `Fig. 2b` | **held** — but the stated mechanism is a misreading of the ground truth |

**E3, and the judgement it rests on.** Eleven C25 sheets run two columns per group with one axis;
`Fig. 3g` runs four with two. Half in every case. The judgement is `Fig. 4b`, whose two columns are
`1/(KB*Tm) (eV-1)` and `ln(Tm2/βh)` — the two sides of an Arrhenius fit. The first is the abscissa of
that plot, so it is an axis in the plotting sense, but it is derived from a measured peak temperature
rather than swept by an instrument. It is counted as an axis here and the tabulation in Part 3 is also
reported with it counted out, because the choice moves the numbers.

**E5 is the inversion, and it is the most useful thing Part 1 returns.**

* One axis column is **not strictly monotone at all**: `Fig. 3b-c`, group `TL curves (heating rate βh=
  50 K/min)`, `Temperature (K)`. It reads *neither*, with no repeated values among its 63 — the
  temperature record goes backwards somewhere in the sweep.
* **Thirty-four of the sixty axis columns carry a first-difference coefficient of variation at or above
  0.01**, so "near-constant spacing" is false of a clear majority. The axis population runs from exactly
  0.000 to 0.365, with a median of 0.019. The high end is `Fig. 4b`'s Arrhenius abscissa at 0.36,
  `Fig. 2f`'s `Temperature (K)` at 0.25 and `Fig. 3b-c`'s at 0.23.

So the cheapest candidate discriminator is not dead, but it is much weaker than stated, and a rule
written to "strictly monotone with even spacing" would miss most of the axes it exists to find.

**E6 held, and the ground truth behind it has been read wrong.** Position-1 identity on `Fig. 2b` fails:
1 of 201 shared rows agree, leading agreement 1 row. But the reason is not the one the expectation gives.
The spec's C25 entry records the author admission as *"the phosphorescence spectrum in Fig. 2b genuinely
started at 414.2 nm, not 400.0 like the other three"*. In the deposited file **all four wavelength
columns start at exactly 400.0**, and the phosphorescence column's 414.2 is simply one of its samples,
at raw row 73 on its 0.2 nm grid. That is consistent with the admission rather than against it: the same
paragraph records that the phosphorescence data *"were pasted into wrong wavelength positions"*, which is
precisely why the deposited column begins at 400. The four axes are four different axes because their
**step and span** differ — 1 nm, 0.2 nm, 2 nm and 2 nm — not because their starts do. The sparse-row trim
did not remove an offset; there was no offset in the file to remove.

### Sizes checked against the spec

All of the spec's stated sizes reproduce: C25 holds 14 sheets; eight C25 sheets column-group above 100
valid rows; `Fig. 2d` reaches 3,600 rows over 3 groups; eight exceed three groups; `Fig. 2f` runs seven.

---

## Part 2 — the fixture control

A discriminator measured only where it should fire cannot be shown to be safe. The 27 fixtures are the
only genuine replicate matrices in the project, so the same per-column measurements were run over all of
them, not only the four that column-group.

**160 data columns across 27 fixtures.** Four column-group; nine row-group; fourteen group not at all.
No fixture loses a row at either trim stage.

| Grouping | Fixtures |
|---|---|
| column-grouped | DS01 and DS02 at 35 rows, three groups of four; DS16 and DS17 at 60 rows, three groups of six |
| row-grouped | DS03, DS04, DS09, DS10, DS11, DS12a, DS12b, DS15, DS19, DS20, DS21, DS22 |
| none | DS05, DS06, DS07, DS08, DS13, DS14, DS23, DS24 and the three `vfs-*` files |

For a fixture that does not column-group, the group is the single implicit block of every data column —
which is the shape every replicate-based test actually sees there.

### What the fixture columns look like

* **Not one of the 160 is strictly monotone.** Every column reads *neither*.
* First-difference coefficients of variation run from **14.4 to 133,800**, median 169. Not one is below
  1, let alone below 0.01.
* **Cross-group identity fails at every position on all four column-grouped fixtures** — 0 agreeing rows
  of 35, 35, 60 and 60, leading agreement 0 everywhere.
* One column has **no defined coefficient of variation**: `14-crctest-survey.csv / Q1`, whose mean first
  difference is exactly zero. Any rule keyed on that quantity has an undefined case inside its own
  control, and how the rule treats "undefined" decides whether it selects that column.

### Sub-question 1 — DS23 and DS24

`STATUS` records these as three unrelated columns at different scales that the engine reads as
replicates of one measurand, citing `docs/shared/archive/SESSION296-FIXTURE-BUILD-FINDINGS.md:27`. That
line reads: *"the engine reads the four columns as replicate measurements of one quantity, and four
unrelated columns at four different scales look like heterogeneous, variance-mismatched, spiky
replicates."* It describes a **four-column pre-rebuild file**; both shipped fixtures carry three columns.

Measured on the shipped data:

| Fixture | Column | Mean | SD | CV | Min | Max | Distinct |
|---|---|---|---|---|---|---|---|
| DS23 | recur | 23.32 | 1.741 | 0.075 | 20.29 | 26.85 | 75 |
| DS23 | wide | 215.3 | 327.7 | 1.522 | 3.021 | 1261 | 120 |
| DS23 | hiprec | 61.93 | 18.27 | 0.295 | 30.18 | 89.97 | 120 |
| DS24 | recur | 23.32 | 1.741 | 0.075 | 20.29 | 26.85 | 75 |
| DS24 | r1 | 22.82 | 1.853 | 0.081 | 19.18 | 27.63 | 120 |
| DS24 | r2 | 23.15 | 1.785 | 0.077 | 19.82 | 27.26 | 120 |

Pairwise Pearson correlation between the columns the engine treats as replicates is near zero on both
files: −0.112, −0.017 and 0.209 on DS23; −0.084, 0.012 and −0.102 on DS24.

**The claim holds in full for DS23 and only half for DS24.** DS23's means span a factor of 9.2 and its
standard deviations a factor of 188 — three unrelated columns at different scales, exactly as recorded.
DS24's three columns are **mutually unrelated but scale-matched**: means within 2.2 percent of each other
and standard deviations within 6.5 percent. The S297 rebuild gave the control two filler columns drawn on
`recur`'s own scale. So DS24 is an instance of P93 in the sense that matters — the engine calls three
independent draws replicates of one measurand — and it is not an instance of the heterogeneity the cited
line describes.

### Sub-question 2 — the `vfs-*` trio

Recorded as having replicate status that cannot be established. Measured:

| Fixture | Column | Mean | SD | CV | Min | Max | Pearson r |
|---|---|---|---|---|---|---|---|
| vfs-a | m1 / m2 | 118.5 / 118.2 | 36.64 / 35.98 | 0.309 / 0.305 | 11.47 / 17.47 | 198.6 / 222.5 | 0.012 |
| vfs-b | m1 / m2 | 118.3 / 120.5 | 31.36 / 37.77 | 0.265 / 0.313 | 46.36 / 5.540 | 194.7 / 192.3 | 0.037 |
| vfs-c | m1 / m2 | 15.33 / 15.23 | 5.973 / 6.426 | 0.390 / 0.422 | 2.380 / 2.382 | 29.38 / 31.39 | −0.005 |

**The status is still undeterminable after measuring them, and now for a stated reason.** Each file's two
columns are scale-matched to within a percent in the mean and a few percent in the spread, neither is
monotone, and the two are mutually uncorrelated. That is simultaneously what two replicates of a
homogeneous process look like and what two unrelated measurands drawn from one law look like. No
structural measurement in this census can separate those, and there is no construction record to appeal
to — the trio has no builder anywhere in the repository.

What the census *can* say is narrower and still useful: nothing about these columns would trip any of the
five candidate discriminators in Part 3, so whichever rule is chosen, the trio's treatment does not
change.

### The stated expectations

| | Expectation | Result |
|---|---|---|
| **E7** | Four fixtures column-group — DS01, DS02, DS16, DS17 — at 35 and 60 rows; the widest fixture is 1,501 rows by 19 columns | **held on the first clause**; the second describes no single fixture |
| **E8** | No fixture data column is strictly monotone with even spacing | **held, and stronger than stated** |

**E7.** The four column-grouped fixtures and their row counts are exact. The "1,501 rows by 19 columns"
figure is two different files: 1,501 raw rows is `11-rnaseq-multicondition.csv`, which is 6 raw columns
wide; 19 raw columns is DS16 and DS17, which are 62 raw rows tall. Read as two separate corpus maxima the
statement is correct; read as one fixture it is not. Through the pipeline the tallest is DS11 at 1,500
valid rows over 4 data columns, and the widest is DS16 at 18 data columns over 60 valid rows.

**E8 held, and by a wide margin.** Not one of the 160 fixture data columns is strictly monotone, so the
question of even spacing never arises. The two populations do not come close to touching: every axis
column in Part 1 has a first-difference coefficient of variation at or below 0.365, and every fixture
column with a defined one is at or above 14.4 — a factor of forty between the two.

---

## Part 3 — the discriminator tabulation

Arithmetic over what Parts 1 and 2 returned. No new reads. Nothing is ranked and no rule is recommended.

**The reference axis set is authored, not measured.** It is a list of header strings read off the fifteen
sheets' own columns: `Wavelength (nm)`, `Time (s)`, `Decay time (s)`, `Temperature (K)`,
`Magnetic field (mT)` and the contested `1/(KB*Tm) (eV-1)`. It has to be authored, because "which column
is the axis" is exactly the question no measurement in the battery answers — that is P93. **Candidate 4
is therefore partly circular against it**, since it reads the same header text the reference set was
built from.

That gives 60 axis columns and 78 non-axis columns among the 138 sheet columns, against 160 fixture data
columns as the control.

| Candidate | Axis selected (of 60) | Non-axis sheet columns wrongly selected (of 78) | Fixture columns wrongly selected (of 160) |
|---|---|---|---|
| 1. Strictly monotone | 59 | 8 | **0** |
| 2. Strictly monotone and first-difference CV below 0.01 | 26 | 0 | **0** |
| 3. Value-identical to the same-position column in every other group | 17 | 0 | **0** |
| 4. Header matches `time`, `wavelength`, `nm`, `s`, `cycle`, `index` | 39 | 0 | **0** |
| 5. First column position within its group | 55 | 9 | **35** |

With the contested Arrhenius abscissa moved out of the axis set, the sheet columns go 54 axis and 84
non-axis, and the two rules that move are candidate 1 (53 axis, 14 non-axis) and candidate 5 (49 axis,
15 non-axis). Candidates 2, 3 and 4 are unchanged.

**Where the wrong selections fall.**

* Candidate 1 picks up six `ln(Tm2/βh)` columns on `Fig. 4b` — the Arrhenius ordinate, monotone by
  construction — and two `Luminance (mcd/m2)` columns on `Fig. 4e`, where a decay curve happens to
  descend without a single tie.
* Candidate 5 picks up all nine `Mean` columns across C15's three sheets, and 35 fixture columns: one
  `Rep1`-equivalent per group on every fixture, three each on the four column-grouped ones.

**Notes on the arithmetic, offered as measurements rather than advice.**

* Candidate 4's misses are systematic, not scattered. It finds every wavelength and time column and none
  of the twelve `Temperature (K)`, three `Magnetic field (mT)` or six Arrhenius columns, because none of
  those headers contains a keyword. The keyword match is word-level after splitting on non-alphanumeric
  characters; a substring match on `s` would select nearly everything.
* Candidate 3 reaches only four of the fifteen sheets. It requires every group's axis to be sampled
  identically, and on eleven sheets they are not — which is the same fact E5 inverted on, seen from the
  other side.
* Candidate 2's threshold sits far below the gap the census actually measures. Axis columns top out at
  0.365 and fixture columns start at 14.4, so any threshold in that range separates the two populations
  completely. At 0.01 the rule selects 26 of 60 axes. The axis and non-axis populations *within* the
  sheets do overlap, however: six `ln(Tm2/βh)` columns sit between 0.150 and 0.198, inside the axis
  range.
* The perfect zero in the fixture column for candidates 1 through 4 is a real separation, but it rests on
  a measurement that does not vary inside the control — see below.

---

## Part 4 — where the ten-MODERATE figure comes from

`STATUS` states four times that ten MODERATEs on real spectra trace to P93, at lines 180, 771, 889 and
942. The question was whether that figure has a source on disk.

**It does.** The source is `docs/sessions/SESSION352-SUMMARY.md`, in three places:

* `:225` — a corpus table row reading `| shipped test's verdict | MODERATE on **10 of 17**, all C25 |`
* `:285` — expectation 4 of that session, *"The shipped test flags on at least one paired corpus sheet"*,
  recorded as **held — MODERATE on 10 of 17**
* `:302` — *"the shipped test returns MODERATE at p = 0.001 on ten C25 sheets built from spectra"*

The instrument is `test/probes/probe-s352-field-dispersion.mjs`, which imports
`testResidualSpikeCorrelation` at `:56`, comments the call site at `:121` as "the shipped test's verdict
on this sheet", and prints the count at `:332`.

**Two things the compression drops.**

1. **It is one test on ten sheets, not ten tests.** The shipped test is **Residual Spike Correlation**.
   "Ten MODERATEs" reads as ten channels; it is one channel firing on ten of the seventeen measured
   paired corpus sheets, all of them C25.
2. **The denominator is seventeen paired sheets, not the corpus.** S352 measured 18 paired sheets and
   could run 17; C11's `snRNA-seq_Fig 7` carries one replicate per subject and did not run.

**What was searched.** A claim that something is unrecoverable is a claim about a search, so:

* `corpus-out/` — listed in full. Eight files: CORPUS-01, CORPUS-02 and CORPUS-03 results from 30 June,
  plus a `corpus-results.json` from 13 July whose single dataset is a failed C12 load. A grep for `C25`
  and `C15` across the directory returns nothing. **There is no C25 or C15 battery output on disk at
  all**, so the figure could not have come from there.
* Whole repository, including gitignored paths, for the phrase in every case and spacing variant
  (`(ten|10) +moderate`, `moderates? on real`, `[0-9]+ moderates`). Four hits, all in `STATUS.md`.
* Whole repository for the underlying figure (`10 of 17`, `ten C25`, `10 C25`). Three hits, all in
  `SESSION352-SUMMARY.md`.
* `docs/shared/` including `docs/shared/archive/` — no hits for the phrase or the figure.
* The C25 adjudication in `REALWORLD-CORPUS-SPEC.md:293–320`. This confirms the dispatch's reading: it
  describes a spectral-shape cluster of four tests — Autocorrelation, Within-Row Variance, a Missing-Data
  block and Excess Kurtosis — and assigns no tiers to them. It is not the source, and four is not ten.

All searches used `command grep`, because `STATUS.md`, `BANKED.md`, `CLAUDE.md`, `docs/sessions/` and
`docs/shared/archive/` are gitignored and the shell wrapper carries `--ignore-files`.

Nothing was rerun to reconstruct the number.

**One legibility hazard, for Chat rather than for this census.** `CLAUDE.md:173` records that C11's
`Cell cycle scores_Fig 2b` is *"the only place in the whole corpus where that test is recorded firing"*.
That sentence is accurate — it is a claim about the documentary record, and S352's own prompt 1 phrases
it the same way. But it sits three lines from the note citing the probe that measured the same test at
MODERATE on ten sheets, and the two read as contradicting one another unless "recorded" is given full
weight.

---

## Measurements that do not vary

Reported because a measurement that returns the same value on every unit cannot discriminate anything,
and will look like a clean result.

**Constant across all 138 sheet columns:**

* `entersDataCols` is `true` on every one.
* `role` is `"data"` on every one.

**Constant across all fifteen sheets:**

* `trimmedAtMatrix` is 0 on every one. The completeness filter removes nothing; the whole trim is at
  parse.

**Constant across all 160 fixture columns:**

* `entersDataCols` is `true` on every one.
* `monotone` is `"neither"` on every one.

The first two are the census's central structural finding stated as a degeneracy: there is no column
anywhere in the fifteen sheets that the pipeline declines, so no existing mechanism could be extended to
hold an axis out.

The last one needs care. Monotonicity varies across the sheet columns — 59 of 138 are monotone — and does
not vary across the fixture control. **That is what makes it look like a clean separator, and it is also
what stops the control from calibrating it.** The fixtures can confirm that a monotonicity rule returns
zero on known replicates. They cannot say how close to firing it came, because nothing in the control
approaches the boundary. The same holds for the first-difference coefficient of variation, where the
nearest fixture column sits forty times above the highest axis column.

---

## What this census does not settle

* **Which columns are axes.** The reference set in Part 3 is authored from header text. Any tabulation
  against it inherits that judgement, and candidate 4 inherits it twice.
* **Whether the ten Residual Spike Correlation MODERATEs are false positives.** This census establishes
  where the figure comes from and what it counts. Adjudicating the firings is a different piece of work.
* **Whether the `vfs-*` trio's columns are replicates.** Measured and still undeterminable, for the
  reason given in Part 2.
* **Anything about a rule.** No discriminator is ranked, scored or recommended. A header-keyword rule
  fails on any file not written in English, which is the shortcut `V1X-DECIDED.md` already rejected for
  role inference; that consideration and others like it live outside what this census holds.

---

## Reproduction

```bash
# all three parts, with the full per-column record written out
JSON_OUT=out.json node test/probes/probe-s375-p93-census.mjs

node test/probes/probe-s375-p93-census.mjs --sheets     # Part 1 only
node test/probes/probe-s375-p93-census.mjs --fixtures   # Part 2 only
node test/probes/probe-s375-p93-census.mjs --tabulate   # Part 3, running 1 and 2 first
```

`corpus-data/` is gitignored, so it exists in the main checkout and in no worktree. The probe walks up to
find it and prints which directory it used; `CORPUS_DIR` overrides. If it cannot find the corpus it
reports Part 1 as **unreached** rather than empty.

**Tracked status of the files this census reads**, taken from `git log -- <path>` rather than asserted:

| Path | Status |
|---|---|
| `corpus-data/C25.xlsx`, `corpus-data/C15.xlsx` | untracked, no git history |
| `corpus-out/*` | untracked, no git history |
| `docs/sessions/SESSION352-SUMMARY.md` | untracked, no git history |
| `docs/shared/REALWORLD-CORPUS-SPEC.md` | tracked, 20 commits |
| `docs/shared/V1X-DECIDED.md` | tracked, 3 commits |
| `test/probes/probe-s352-field-dispersion.mjs` | tracked, 1 commit |
| `test/fixtures/*.csv` | tracked |
