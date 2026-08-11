# S367 — register disposition classification (read-only)

**Read-only audit.** Nothing was closed, renumbered, merged or deleted. `STATUS.md` was not edited;
`src/` and `test/` were not edited. The deliverable is the classification below.

Scope: all 89 rows of `STATUS.md` §Parked items — the register, lines 342–482 at the file state of
this session.

---

## Part 1 — the census

### Assertions, all measured

| assertion | result |
|---|---|
| 89 rows | **89** |
| P41–P129 contiguous | **holds** — min 41, max 129, 89 distinct ids |
| no gaps | **holds** — `comm -23` against `seq 41 129` returns empty |
| no duplicates | **holds** — 89 row lines, 89 distinct ids, `uniq -d` empty |
| 15 closed / 1 superseded / 73 open | **holds**, and 15 + 1 + 73 = 89 |

**Closed (15):** P48, P50, P51, P55, P57, P59, P69, P74, P76, P82, P86, P88, P94, P101, P105.
**Superseded (1):** P46.
**Open (73):** the remainder.

### The expression, and what it ran over

Row lines are matched by `^| \*\{0,2\}P[0-9]\{2,3\}\*\{0,2\} |` — 89 matches, **all** between lines
342 and 482, none elsewhere in the file, and all with exactly 5 pipe-delimited fields. The uniform
field count is what establishes that no cell contains a pipe and therefore that field 4 *is* the
state cell.

The state count then ran **over field 4 only**, stripping leading whitespace and `**`, matching the
**anchored first token**:

```bash
command grep '^| \*\{0,2\}P[0-9]\{2,3\}\*\{0,2\} |' STATUS.md | command awk -F'|' '{
  id=$2; gsub(/[ *]/,"",id);
  s=$4; sub(/^[ \t]+/,"",s); gsub(/\*\*/,"",s); sub(/^[ \t]+/,"",s);
  st = (s ~ /^closed/) ? "closed" : (s ~ /^superseded/) ? "superseded"
     : (s ~ /^open/) ? "open" : "UNPLACED";
  print st"\t"id }'
```

It returns **15 closed, 1 superseded, 72 open, 1 UNPLACED**. The unplaced row is **P66**; placing it
in `open` by reading gives 73. This is the same expression the triple is asserted against.

### The three trap rows: which the expression hit, which it survived

- **P66 — hit.** `large-`m` arm open` does not anchor, so the expression left it *unplaced* rather
  than misfiling it. It belongs in `open`.
- **P79 — survived.** Its cell begins `open.`; the quoted `12 closed / 1 superseded / 49 open` sits
  mid-cell and never anchors.
- **P88 — survived.** Its cell begins `closed`; the trailing `residue open` never anchors.

Anchoring is what buys P79 and P88 and exactly what costs P66. No single expression takes all three.

### The substring trap set is six rows, not three

Running an unanchored substring matcher over the same field, these rows match more than one state
keyword:

| row | phrase producing the false hit |
|---|---|
| P56 | "the fourth promote ran with the Code session **closed**" |
| P79 | quotes both `closed` and `superseded` |
| P88 | "**closed** as a question, residue **open**" |
| P118 | "the mechanism is **closed** form and confirmed" |
| P120 | "gap **closed** at S364" |
| P126 | "Chat's first **closed** form used a normal residual" |

Five of the six false hits are the phrases *closed form* or *gap closed*.

### The header's `grep -c closed` = 16 is unreachable

Measured on every plausible scope:

| scope | `closed` | `superseded` | `open` |
|---|---|---|---|
| register row lines (89) | **21** | 2 | 74 |
| state cell only (field 4) | **20** | 2 | 74 |
| whole section, lines 342–482 | 24 | 5 | 79 |
| whole file | 39 | 5 | 89 |

**16 is reachable on no scope measured.** The 21 row lines are the 15 genuinely-closed rows plus six
false hits: P56, P79, P118, P119, P120, P126. State-cell scope drops to 20 because P119's
*closed-form* sits in the item cell rather than the state cell — that single row is the whole
difference between 21 and 20.

**The header therefore carries a stale count.** No explanation of *how* it became stale is offered
here: `STATUS.md` is gitignored and has no history, so no claim about what the file looked like when
the header was written can be checked. **Reported, not fixed — STATUS is Chat's.**

### The 73 open rows

**Ev** — `loc` names a file/commit/probe, `part` gives figures but no location, `—` names neither.
**src/test** — `yes` / `no` (the change lies outside `src/` and `test/`) / `?` not determinable from
the row. **Ans** — does the row already record an answer.

| P | claim | Ev | src/test | Ans |
|---|---|---|---|---|
| P41 | Fisher's arm of `aggregatePerGroup` over-fires on clean data; needs a corrected null, not removal | loc | yes, no line | no |
| P42 | LOESS calibration is undiagnosed | loc | ? | no |
| P43 | detection margin | — | ? | no |
| P44 | the clean-file tier rate is not a battery FPR; 15 order-invariant nulls untested | loc | yes, test/ | part |
| P45 | gate fallback | — | ? | no |
| P47 | counts are fixed-per-test and uncoupled; adaptive-B costed and dropped | loc | no | yes |
| P49 | the convergence rule has no stated basis once tiers differ per test | loc | ? | no |
| P52 | condition-card display split | — | ? | no |
| P53 | Excess Kurtosis pooling inverts the sign of its own statistic | loc | yes | yes |
| P54 | `KURTOSIS_DEV` is constant above N ≈ 2300 | loc | yes | yes |
| P56 | `promote.sh` takes the worktree name, hardcodes `claude/`, merges+pushes before an unchecked teardown | loc | **no** — `scripts/` | yes |
| P58 | a one-sided p on a two-sided statistic; LOESS's CUSUM is a fresh instance | loc | yes | part |
| P60 | Baseline Balance takes an uncorrected minimum over two correlated statistics | — | yes by shape | no |
| P61 | DS12b adjudication, narrowed to CCC alone | loc | yes | yes |
| P62 | `esGateMode` | — | ? | no |
| P63 | `(ack)` is marked from the absence of an allow-set, never from `ACKNOWLEDGED` | loc | **no** — `scripts/` | yes |
| P64 | `FIXTURES` lists 24 against `EXPECTED`'s 27 | loc | yes, test/ | yes |
| P65 | held-out corpus needs a contamination control; its answer is one-sided | — | yes, test/ | part |
| P66 | multiplicity structure at large `m` | — | ? | part |
| P67 | per-site floor assertions; 16 shuffle sites remain | loc | yes, test/ | part |
| P68 | `ALPHA.FLAG` has no recorded provenance | — | ? | part |
| P70 | doc residues | — | no | no |
| P71 | CCC's `B` comes from finite cells, not rows; `B=499` cannot flag one floored unit | loc | yes | part |
| P72 | per-stage BH arithmetic — the arithmetic case is void | — | no | yes |
| P73 | two counts sit one draw short of a tier | loc | yes if counts move | part |
| P75 | vitest collects from `.claude/worktrees/`; `probe-*.mjs` never collected | part | **no** — `vite.config.js` | yes |
| P77 | Kurtosis early-exit denominator divergence, latent | part | yes | part |
| P78 | `BANKED:486` write-target | loc | no | no |
| P79 | dead schemes, freshness gates, index decay across many surfaces | loc | yes, in part | part |
| P80 | ask whether BANKED has readers before designing a gate for it | loc | no | yes |
| P81 | bound the remaining six clean fixtures at n = 500 | — | yes, test/ | no |
| P83 | `aggregatePerGroup` combines correlated p; Šidák and Fisher fail in opposite directions | — | yes | no |
| P84 | Cross-Condition Rank Correlation asserts a correspondence | — | ? | no |
| P85 | DS16 and DS17 are not regenerable | — | **no** | yes |
| P87 | the `similar`-only direction filter, evidence base emptied by P82 | loc | ? | yes |
| P89 | a card can name a non-driver or carry evidence contradicting its flag | — | yes | no |
| P90 | the scattered row copy is invisible to the battery | — | yes | no |
| P91 | the replicate-df ceiling | — | ? | no |
| P92 | `TEST-GROUND-TRUTH.md` reconciliation sweep, now smaller | loc | no | part |
| P93 | no replicate-identity check — an x/y pair reads as two replicates | — | yes | no |
| P95 | a cluster with no verdicts expands to nothing | — | yes | no |
| P96 | the pattern-correlation successor test, one member of P97's family | — | yes | part |
| P97 | paired data has its own fabrication signatures; the battery has no test for them | loc | yes | no |
| P98 | a fourth outcome for a test whose null is wrong | — | yes | no |
| P99 | the `N ≥ 500` gate is a conjunction whose halves move in opposite directions | loc | yes | part |
| P100 | a threshold is attainable exactly when `α(B+1)/c` is an integer | loc | yes if counts move | yes |
| P102 | the batch checks the number and never the attribution | loc | yes, test/ | yes |
| P103 | the Severity-1 figure assumes independence; two Chat docs contradict on a rendered string | loc | possible | yes |
| P104 | fourteen of 29 tests take an uncorrected extreme over correlated arms | loc | yes, gated | yes |
| P106 | no instrument tests honest heteroscedasticity on either axis | loc | yes, test/ | part |
| P107 | the κ-spread selector has no null, and fails open and silent on a rounded tie | loc | yes | yes |
| P108 | Runs and Autocorrelation walk past the effect-size gate | loc | yes | no |
| P109 | Value-Frequency Spike's deep-tail BH family is unpopulated on every fixture | loc | yes, either side | yes |
| P110 | two floors have no resampling basis; neither defensible by the lattice argument | part | yes | part |
| P111 | HIGH does not exist for five tests; ten branches cannot return it | loc | yes for six | yes |
| P112 | the two heteroscedasticity axes need opposite layouts | loc | yes, one line | yes |
| P113 | honest log-normal data on the raw scale fires two tests at 75–90% | loc | **no** — doc change | yes |
| P114 | IRC's SE is wrong by a data-dependent factor; all three assumptions fail | loc | yes | yes |
| P115 | arm 1's suspicious gate and the HIGH threshold are the same constant | loc | yes | yes |
| P116 | the reachable-tier register has no vocabulary for a per-arm tier cap | loc | yes, test/ | yes |
| P117 | the leave-one-out baseline takes `atanh` of a mean, not the mean of `atanh` | loc | yes, one line | yes |
| P118 | six not-transformed tests read raw values against normal-theory nulls | loc | yes | yes |
| P119 | pooling unequal-noise conditions manufactures excess kurtosis, closed form | loc | yes | yes |
| P120 | the per-condition statistic is mis-centred against its null across its range | loc | yes | yes |
| P121 | Selective Noise reports a literal 1.0 at six replicates, blind at four | loc | yes | yes |
| P122 | the condition card renders HIGH from the raw p beside the adjusted p | loc | yes | yes |
| P123 | the permission mode can be neither set from the prompt nor read in-session | loc | **no** — harness | yes |
| P124 | the normaliser is computed from the values it normalises | loc | yes | yes |
| P125 | §2.2's autocorrelation limitation may be a sixth pooled-dependence instance | loc | **no** — doc | part |
| P126 | Anderson-Darling's reference scale is absolute; its null is scale-blind | loc | yes | yes |
| P127 | an arm the docs call blind is all that stands between a floored `adP` and HIGH | loc | yes | yes |
| P128 | five fixtures run in the batch with no source stating their contents | loc | part — trio fixed forever | yes |
| P129 | `ACKNOWLEDGED` whitelists a name and asserts nothing about the tier | loc | yes, test/ | yes |

### Field tallies

| field | breakdown |
|---|---|
| names where evidence lives | 49 yes · 3 partial (figures, no location) · **21 name neither** |
| needs a `src/` or `test/` change | 49 yes · 13 no (outside both) · 11 not determinable from the row |
| already records an answer | **36 yes** · 16 partial · 21 no |

**21 of 73 name no evidence location**, against the register's own S355 rule that a row "names where
its evidence lives." Nearly all are the short early rows (P43, P45, P52, P62, P70, P91) plus the
unscoped later ones.

### Five citations that did not hold at source

1. **P79's own citation has decayed into an instance of P79.** `validate-batch.mjs:135-136` is cited
   for "a false comment." Those lines are `misses.push(...)` and `return misses;` — no comment. The
   nearest comments are `:100-103`, `:109-111`, `:146-147`. The row about index decay has index-decayed.
2. **P129 undercounts `ACKNOWLEDGED` by two.** The row says "Six acknowledged entries exist, four on
   DS23 and two on DS24." DS23 = 4 and DS24 = 2 are exact, but `06-cellcount-fabricated.csv` and
   `08-elisa-fabricated.csv` each carry one more (`Mahalanobis Row Outlier`). **Eight entries across
   four files, not six across two.**
3. **P124's docstring residue is already discharged.** The row says the stale `primitives.js`
   docstring "is owed and needs a dispatch," then its own tail says corrected at `9c4f563`. At source
   the docstring reads "Shared by Kurtosis, LOESS Residual, Regional Noise," and a caller grep returns
   exactly those three.
4. **P64 is exact to the filename.** `FIXTURES` 24, `EXPECTED` 27, set difference precisely
   `vfs-a-pigeonhole-clear.csv`, `vfs-b-recurrence-high.csv`, `vfs-c-deeptail-high.csv`, with nothing
   in `FIXTURES` absent from `EXPECTED`.
5. **P75 is exact, including the discriminator.** `vite.config.js`'s `test` block has no `include` or
   `exclude`, so defaults apply; 4 files collected, and a single worktree duplicates all 4 to 8. And
   `probe-s327-skip-detail.test.jsx` *is* collected despite the `probe-` prefix — the `.mjs`
   extension is the discriminator, exactly as the row implies.

**One apparent anomaly resolved, not a defect.** P53 and P119 both call themselves pooled-dependence
*instance 4*. `METHODOLOGY.md` §Pooled Dependence tags instance 4 as **"(P53, P119)"** jointly — one
instance, two register rows, the same arithmetic with opposite signs (P53 the silenced detector on
DS12b, P119 the suppressed false positive on honest data).

---

## Part 2 — the disposition

### Bucket definitions applied

- **A** — a user-visible output (verdict, tier, card) or the shipped methodology document is wrong or
  misleading today.
- **B** — the row's remaining product is text. No code change intended, not merely deferred.
- **C** — real work remains: code, test, fixture, doc reconciliation, or a pending decision.
  Schedulable, not a ship gate.
- **D** — answered and **nothing follows**. No code, no test, no doc, no decision.

### The assignment

| bucket | n | rows |
|---|---|---|
| **A** | **7** | P71, P96, P97, P99, P106, P111, P122 |
| **B** | **3** | P103, P113, P125 |
| **C** | **57** | P41–P45, P47, P49, P52–P54, P56, P58, P60–P63, P65–P68, P70, P73, P75, P77–P81, P83, P84, P89–P93, P95, P98, P100, P102, P104, P107–P110, P112, P114–P121, P124, P126, P127, P129 |
| **D** | **6** | P64, P72, P85, P87, P123, P128 |

7 + 3 + 57 + 6 = 73.

**D in full** — P64 (the 24-vs-27 hole is exactly the three `vfs-*`, fully accounted); P72
(arithmetic case void); P85 (DS16/DS17 not regenerable); P87 (evidence base emptied by P82,
unanswerable as posed); P123 (permission mode answered, historical question unmeasurable because the
state file is unflushed); P128 (both halves dispositioned — DS23/DS24 rows written, the `vfs` trio
recorded permanently unavailable at `b98d1a9`).

### Bucket A against STATUS's own blocker list

The list is **four bullets carrying six distinct P-numbers**, one of them ambiguous.

| P | STATUS | this audit | note |
|---|---|---|---|
| P71 | bullet 1 | A | agree |
| P99 | bullet 2 (§5.4) | A | agree |
| P97 | bullet 3 | A | agree |
| P96 | bullet 3 | A | agree |
| P106 | **clause inside** bullet 3 | A | **ambiguous — reported, not decided** |
| P111 | bullet 4 | A | agree on placement; **the bullet disagrees with the list** |
| P122 | — | **A** | **addition** |

**P106 is ambiguous and is not decided here.** It appears only as a clause inside the P97 bullet —
"which is P106's subject axis reaching the blocker list from a second direction." Read as a blocker,
P106's subject axis is a prerequisite for the acceptance fixture P97 needs; read as a
cross-reference, P106 is C. Assigned A on the transitive reading; the list's own grammar does not
settle it.

**Disagreement, direction one — P122 added.** The condition card renders HIGH from the unadjusted raw
p at `kurtosis.js:426` while `:499-502` overwrites the displayed p with `pAdjFull`. All 30 floored
units render HIGH on their own card, including the 28 the engine refuses twice over, and 26 of the 30
show a displayed p at or above 0.001 **beside a HIGH tier**. Both lines read at source. A fabrication
tool that shows a scientist HIGH next to a non-significant p is shipping a wrong answer on its
most-read surface.

**Disagreement, direction two — none.** Nothing STATUS lists is dropped. But bullet 4 contradicts
itself: it lists P111 as a v1.0 blocker and then says *"Not a v1.0 blocker for the code, which ships
correct arithmetic; a blocker for the document."*

**One near-miss not added: P61.** `METHODOLOGY.md` §Pooled Dependence states Regional Noise's
cross-regime pooling "is unfixed and is why DS12b still fails the batch's completeness gate at seed
offset 0." A live red gate would make P61 an A. **Unverified — the dispatch forbids the batch gate.**
P61 stays C with the claim flagged.

### Both expectations moved, in the same direction

**Expectation 1 — B and D together hold more than half of the 73. Missed, heavily.**
B + D = **9 of 73, 12%**, against an expected 37+.

**Expectation 2 — bucket D is at least ten rows. Missed.** D = **6**. Not the two-or-three that
would refute the closure-route diagnosis outright, but well under the threshold.

**Neither was tuned toward.** The buckets were defined before assignment and are stated above.

### Reconciling the 36 with the 6

Part 1 found 36 open rows already recording an answer. That number does not survive contact with D's
definition, because *answered* and *nothing follows* are different tests:

| where Part 1's 36 "answered" rows went | n |
|---|---|
| D — answered, nothing follows | 6 |
| B — answered, becomes text | 2 (P103, P113) |
| A — answered, and blocks | 2 (P111, P122) |
| **C — answered, and the fix is unbuilt** | **26** |

**Twenty-six rows are diagnostically complete and engineering-incomplete.** With the 11
partially-answered rows also in C, 37 of C's 57 carry real settled content behind them. P114, P118,
P119, P120 and P124 are the type cases, and so are P104, P107, P115, P117, P121, P126, P127 and P129.

**The register is not mostly mis-filed answers. It is mostly real deferred work that has already been
diagnosed.** The growth is the programme, not a filing defect. P69's and P88's improvisations were
real, but they are two rows; a fifth state for "answered, nothing follows" would close six rows, not
the register.

The closure-route diagnosis survives in a narrower form: **"something got fixed" is the only closure
route, and that is correct, because for 57 of 73 rows something does have to get fixed.** The
constraint is build capacity, not vocabulary.

### Rows that do not fit one bucket

Named rather than forced. Each was still assigned.

**Genuine duals — the bucket is a choice, not a reading:**

1. **P53 + P119** — one pooled-dependence instance across two rows. The scientific product is
   finished paper text (closed form, no fitted parameter, observed/predicted 0.940–1.128; METHODOLOGY
   calls the pattern "the review paper's finding") — that is B. The engineering residue is a
   **coupled two-site fix**: the same directional rule lives at `kurtosis.js:380` on the pooled
   statistic at full precision and at `:477` on the per-condition statistic off a four-decimal
   string, and neither copy moves alone. Assigned C on the residue.
2. **P106** — condition axis is B by explicit ruling ("no threshold moves on the strength of it");
   subject axis is A. Assigned A.
3. **P111** — the code is correct, so the document correction is B; the methodology decision for the
   four tests with no performance route, plus "gates step 3", is A. Assigned A.

**Multiple claims wearing one number:**

4. **P56** — four distinct defects: branch derived from the worktree name, hardcoded `claude/` prefix
   at `:33`, merge-and-push before an unchecked teardown, and the session-lock ordering rule. Three
   are script defects; the fourth is an operational rule already in force.
5. **P79** — omnibus. Absorbs display-map literals, P39 citations, six routing arrows, four stale
   fixture counts, `validate-batch.mjs`'s comment and the register gate, plus its own S359 instance.
6. **P118** — base claim plus three separately-landed S364 results (matched-n, the closed form, and
   the two exact corrections a future comparison must carry).
7. **P120** — base claim plus four S364 addenda, each with its own document and commit.
8. **P121** — self-identified: *"Two different states wearing one number"* — a literal 1.0 placeholder
   at six replicates, and blind-by-construction at four.
9. **P66** — the cell reads "large-`m` arm open", implying a closed small-`m` arm and recording
   nothing whatever about it.

**Rows with nothing to bucket:**

10. **P43, P45, P52, P62, P70, P91** — topic-only. No claim, no evidence, nothing determinable. All
    six assigned C, but the assignment is inferred from the title, not from the row. These are the
    S355 rule's clearest surviving violations.

**Candidate-D that nobody dispositioned — the closest thing to a real filing defect:**

11. **P54, P66, P68, P73, P77** — each records a measurement and states no consequence. *Is
    `KURTOSIS_DEV` being constant above N ≈ 2300 a defect or a clamp working as designed?* The row
    does not say. These read as answered but nobody wrote down whether anything follows, so they
    cannot be assigned D on their own text. **Five rows, and this — not a missing state — is the
    filing gap the census actually exposes.**

---

## Verification

**Which expression produced the counts.** One expression, quoted in full in Part 1 §"The expression":
an anchored first-token match on field 4 of the 89 row lines. Every state figure in this document
comes from it. The scope was established first — 89 row lines, all inside 342–482, all with 5
pipe-delimited fields, which is what licenses treating field 4 as the state cell. The `grep -c` table
was produced by re-running the same row matcher and piping to `grep -c` at four different scopes,
each named beside its figure.

**Read at source versus taken from the row's own text.** Read at source this session:
`kurtosis.js` `:99`, `:379-383`, `:426`, `:441`, `:476-477`, `:499-502`;
`interReplicateCorrelation.js` `:109` and `:114`; `engine.js` `:266-283`, `:300`, `:312`;
`loessResidual.js:294`; `regionalNoise.js:41`; `primitives.js` docstring; `valueFrequencySpike.js`
`deepBucket`/`span > 10000`; `promote.sh:33`; `build-test-display-map.mjs` `:46` and `:115-120`;
`validate-batch.mjs` `:210`, `:240`, `:250-257`, `:275`; `vite.config.js` `test` block;
`test/batch-fixtures.mjs` `FIXTURES`/`EXPECTED`/`ACKNOWLEDGED` by module import;
`METHODOLOGY.md` §Pooled Dependence; and the absence of `build-s297*` from the repository.
Everything else in the 73-row table is taken from the row's own text and is labelled as such — in
particular, the "claim" column paraphrases the row and does not independently verify it.

`:312` was checked to be exactly the `runPair` fall-through rather than approximately it, and the
`fitPredictedSigma` caller set was re-derived by grep rather than read off the docstring.

**Expectations.** Both moved. B + D = 9 of 73 (12%) against "more than half"; D = 6 against "at least
ten". Reported before the reconciliation that explains them, and not tuned toward.

**Batch gate.** Not run — the dispatch excludes it. No preview, no screenshots. The one place a batch
result would have changed an assignment (P61, and whether DS12b still fails the completeness gate at
seed offset 0) is flagged as unverified rather than assumed in either direction.

**No source changes.** `git diff --stat -- src/` and `-- test/` both return empty; asserted in the
close-out state block. `STATUS.md` was not edited: the stale header count, P79's drifted citation,
P129's undercount and P124's discharged residue are all reported here and left in place.
