# S347 — Register census, P76 part two: V1X

**Read-only census of `docs/shared/V1X-FUTURE-WORK.md`, the fifth and largest future-work
register.** Part two of two; part one (`SESSION346-REGISTER-CENSUS.md`) censused STATUS, BANKED,
CLAUDE.md and METHODOLOGY-MAP. Scoped by that document's §13. Its §0 rules apply here.

One row per item, no merging, no deduplication, no reprioritisation. Every figure carries its
counting rule and the command that produced it (§0). No register was edited.

**Batch: N/A.** Nothing under `src/` is touched.

```
$ git status --porcelain -- src/
(zero lines)
```

---

## §0 — Every number this document uses

Each row names the figure, what it counts, and the command that produced it. Where two figures
are produced by different rules they are in different rows, never one column. All commands run
from the worktree at `cb672a0`.

### 0.1 Part-one registers, re-measured

| # | Figure | What it counts | Command | Result |
|---|---|---|---|---|
| M1 | **39** | STATUS parked rows with a P-number first cell | `command grep -cE '^\| \*{0,2}P[0-9]+' STATUS.md` | P41–P79 contiguous |
| M2 | **4** | of M1 whose state cell says `closed` | `command grep -nE '^\| \*{0,2}P[0-9]+.*closed' STATUS.md` | P50, P55, P59, P74 |
| M3 | **1** | of M1 whose state cell is `unknown` | `command grep -nE '^\| \*{0,2}P[0-9]+.*\| unknown \|' STATUS.md` | P46 |
| M4 | **34** | of M1 open | M1 − M2 − M3 | STATUS's own header line agrees |
| M5 | **197** | BANKED top-level bullets | `command grep -c '^- ' BANKED.md` | |
| M6 | **215** | BANKED bullets at **any indent** | `command grep -c '^ *- ' BANKED.md` | **not** the census figure — see 0.5 |
| M7 | **18** | BANKED prose-only items | part one §3.9, enumerated by line | judgment, not measurement |
| M8 | **215** | BANKED **census rows** | M5 + M7 | **not** M6 — see 0.5 |
| M9 | **615** | BANKED lines | `awk 'END{print NR}' BANKED.md` | |
| M10 | **108** | CLAUDE.md top-level bullets in `## Active Conventions` | `command sed -n '98,259p' CLAUDE.md \| command grep -c '^- '` | 159 at any indent |
| M11 | **41** | METHODOLOGY-MAP future-work items under part one's §0.3 rule | enumerated in part one §5 | no grep produces it |
| M12 | **403** | part-one census rows | M1 + M8 + M10 + M11 | 39 + 215 + 108 + 41 |

### 0.2 V1X structural figures

| # | Figure | What it counts | Command |
|---|---|---|---|
| V1 | **1,228** | lines in V1X | `awk 'END{print NR}' docs/shared/V1X-FUTURE-WORK.md` |
| V2 | **135** | V1X top-level bullets | `command grep -c '^- ' docs/shared/V1X-FUTURE-WORK.md` — **not** the item count |
| V3 | **139** | V1X bullets at any indent | `command grep -c '^ *- ' docs/shared/V1X-FUTURE-WORK.md` — **not** the item count |
| V4 | **9** | `##` headings | `command grep -c '^## '` — eight numbered sections **plus** `## At a glance` |
| V5 | **35** | `###` subsections | `command grep -c '^### '` |
| V6 | **28** | `####` sub-blocks | `command grep -c '^#### '` |
| V7 | **9** | tables | `command grep -cE '^\|-{2,}'` (separator rows) |
| V8 | **80** | table rows, data only | 89 `^\| ` lines − V7 header rows |
| V9 | **4** | nested bullets (V3 − V2) | all four at `:143`–`:146`, inside §2.4's gate spec |

### 0.3 The counting rule for V1X, stated before the first row

Part one had to invent a rule mid-census for METHODOLOGY-MAP because no grep reproduced the
circulating figure. The rule for V1X is stated here, before §2's first row, and applied
throughout.

**An item is a unit of work or a record carrying its own leading marker at V1X's own item
level.** For V1X that means:

| # | source | rows |
|---|---|---|
| V10 | a row in §1's mirror table | **6** |
| V11 | a `###` subsection under §2, §3, §4 or §5 | **35** |
| V12 | **less §4.2**, counted as its five `####` test specs instead of as a parent | **−1 + 5 = +4** |
| V13 | a row in §6's cross-reference table | **24** |
| V14 | a bullet under §7 | **7** |
| V15 | a bullet under §8 | **1** |
| **V16** | **census rows** | **77** |

**What the rule excludes, and why.** Nested and top-level bullets *inside* a subsection are
elaborations of a parent, not rows — §4.2.1's five `What / Why / Statistic / Catches / Effort`
bullets describe one test spec, not five items. The five `## At a glance` table rows summarise
the eight numbered sections and are not separate items. §2's other tables (`:319`, `:337`,
`:612`) and §5.9's (`:706`, `:722`, `:1005`) are evidence inside a subsection, not registers.

**§4.2 is treated as part one treated METHODOLOGY-MAP's Track A** — counted as its sub-items and
not additionally as a parent, because each of its five `####` blocks is a separately
dischargeable new test with its own effort estimate.

### 0.4 The rule gives more than one defensible figure — all are stated

Part one gave 41 / 38 / 37 for METHODOLOGY-MAP rather than asserting one. The same applies here.

| # | figure | rule variant |
|---|---|---|
| V16 | **77** | as stated in 0.3 (primary, used throughout) |
| V17 | **73** | §4.2 counted as one parent rather than five test specs |
| V18 | **53** | §6's cross-reference table treated as navigation rather than items |
| V19 | **49** | both variants together |

**V2 = 135 and V3 = 139 are not any of these.** They are bullet counts, recorded so they are
never confused with an item count — the same caveat part one attached to METHODOLOGY-MAP's
44 bullets.

### 0.5 The 215 / 215 collision, named before it is cited

M6 and M8 are both **215** and they are **different quantities**. M6 counts every `- ` bullet at
any indent. M8 counts 197 top-level bullets plus 18 prose-only items under part one's rule. They
agree by coincidence.

This matters because a coincidence of exactly this shape already cost a correction: part one's
retired all-kind landed count and its live task-only count were both **42**, six words apart in
the same paragraph, and a reader could rebuild the retired error from the document's own text.
`STATUS.md` already carries this warning under P79. **Every citation of 215 in this document
names its rule.**

### 0.6 Figures that are judgment, not measurement

Named separately so they are never cited as measured.

- **V16 = 77 and its three variants** depend on the rule at 0.3. No grep reproduces any of them.
- **Every kind and every state cell in §2.** V1X has no state column and no kind column. Part
  one machine-parsed 182 of its 386 rows from BANKED's state and kind columns and from STATUS's
  table; **this census parses none of its 77.** All 154 cells are judged from the section's own
  text, then checked at source wherever a landing is claimed. That is the largest single
  confidence difference between part one and part two and it is stated here rather than buried.
- **"Discharged" (§5)** is evidenced per item — a commit that resolves, a `src/` symbol that
  exists, or a moved-to file that exists. The denominator of 39 work subsections is
  rule-dependent (V11 + V12).
- **M7 = 18** carries forward part one's judgment, unre-derived here.
- **The three "dead" file pointers (§6.2)** are judged dead on three negatives: absent from the
  working tree, absent from `git log --all --diff-filter=A`, and absent from a `find` over the
  whole repository. A fourth hiding place cannot be excluded.
- Every `state` cell marked **unknown** would be a refusal to guess. **There are none** — see
  §7.

### 0.7 Source-of-truth figures used as landing evidence

| Figure | Value | Command |
|---|---|---|
| files in `src/tests/` | 30 | `ls src/tests/*.js \| wc -l` |
| `sequentialDuplication.js` exists | yes | `ls src/tests/` |
| its engine dispatch | `engine.js:399` | `command grep -n 'equentialDup' src/analysis/engine.js` |
| ConstOffset all-pairs dispatch | `engine.js:411` | `command grep -n -A2 'testConstantOffset' src/analysis/engine.js` |
| Mahalanobis row BH-FDR | `mahalanobis.js:162` | `command grep -n 'bhFDR(rowPvals)' src/tests/mahalanobis.js` |
| CCR LOO null | `rankCorrelation.js:59` | `command grep -n 'ρ₀' src/tests/rankCorrelation.js` |
| Runs sub-unit BH-FDR | `runs.js:75`, `:259` | `command grep -n 'bhFDR' src/tests/runs.js` |
| Modality card still plots the dip | `MiniCard_Modality.jsx:50` | `command grep -n 'dip' src/components/cards/MiniCard_Modality.jsx` |
| archived ROADMAP | blob, 311 lines | `git cat-file -t ad270a8:docs/shared/ROADMAP.md` |

---

## §1 — Method

Read-only. No register was edited, including part one's stale headings (§8.2). `command grep`
with explicit paths throughout, because the shell `grep` carries `--ignore-files` and
`BANKED.md`, `STATUS.md`, `CLAUDE.md` and `project-instructions.md` are all gitignored — a
recursive grep skips every one of them silently.

**Evidence standard.** `landed` is written only where a commit, a shipped file or a `src/` symbol
can be pointed at. Every commit cited by V1X was checked with `git log -1`; all twelve resolve.
Every claim that an item is still open was checked at source where a `src/` symbol could settle
it.

**Part one's figures were re-measured, not copied.** Two independent confirmations that
METHODOLOGY-MAP and V1X did not move between part one and part two: `git log` shows
METHODOLOGY-MAP last touched at `793c1c9` (S230) and V1X at `27ce2fd` (S343), both **before**
part one's census commit. M11 and V1–V3 are measurements of the same bytes part one read.

---

## §2 — The 77 rows

Format follows part one: register and location, the item in its own words, kind, state
evidenced, duplicate-of, P-number.

### 2.1 §1 — Methodology gaps, the METHODOLOGY-MAP mirror (6 rows)

`V1X:27`–`:34`. Diffed against its source in §3.

| line | item (verbatim gap cell) | kind | state, evidenced | duplicate-of | P |
|---|---|---|---|---|---|
| 29 | 2D spatial plate variance (Moran's I) | task | open | METHODOLOGY-MAP:318; :577 (open question 7) | — |
| 30 | Non-linear cross-replicate dependence | task | open, low justification | METHODOLOGY-MAP:319 | — |
| 31 | Distribution skewness | task | open, low priority | METHODOLOGY-MAP:320 | — |
| 32 | Row-matched near-duplicates across conditions | task | open | METHODOLOGY-MAP:321; :575; BANKED:285 | — |
| 33 | Cross-condition missing data pattern | task | open | METHODOLOGY-MAP:322; :576 | — |
| 34 | Per-condition pooled entropy / GoF / modality | task | open | METHODOLOGY-MAP:323; :571, :574 | — |

**All six rows appear twice in the source register already** (part one finding S5-a: four of the
six reappear verbatim in METHODOLOGY-MAP's own "Open questions" section, 259 lines away). With
V1X's mirror that makes three copies of four items across two files.

### 2.2 §2 — Test additions (17 rows)

| line | item (verbatim heading) | kind | state, evidenced | duplicate-of | P |
|---|---|---|---|---|---|
| 44 | 2.1 Rectangular Blocked Mahalanobis | task | open | V1X:1184 (own index) | — |
| 67 | 2.2 Blocked Mahalanobis genuine-block detection | task | open | **V1X:1182 mis-points at this section — §6.4** | — |
| 79 | 2.3 Coherence-cleanup residue from Track A | task | **landed S95, all four cleanups** — `mahalanobis.js:162`; `rankCorrelation.js:59`; `runs.js:75`,`:259`; `engine.js:411` | METHODOLOGY-MAP:498–:517 (part one §5.2); `ad270a8:ROADMAP.md:282` | — |
| 89 | 2.4 Column-localised sequential duplication detector | task | **landed** — `src/tests/sequentialDuplication.js`, `engine.js:399`; V1X's own `:125` says so | V1X:1185 | — |
| 155 | 2.5 Role and condition inference for real-world column shapes | task | open, corpus-blocking | V1X:1186 | — |
| 192 | 2.6 Suite-wide test-consistency audit — DESIGN PROGRAMME COMPLETE — moved to `V1X-DECIDED.md` | task | **complete**, marked; `docs/shared/V1X-DECIDED.md` exists | V1X:1187, :16 | — |
| 204 | 2.7 Arbitrary-offset block duplication detector | task | open | V1X:1188 | — |
| 227 | 2.8 Group-attribute column recognition — BUILT S315 (`531e180`) — moved to `V1X-DECIDED.md` | task | **landed**, marked — `531e180` resolves | V1X:1189, :16 | — |
| 235 | 2.9b C16 — the applicability-saturation exhibit | finding | open — read-characterised only, blocked behind grouping enforcement | **absent from V1X's own index** | — |
| 260 | 2.9 Scattered partial-row duplication — BUILT S316 (`e751523`) — moved to `V1X-DECIDED.md` | task | **landed**, marked — `e751523` resolves | V1X:1190, :16 | — |
| 267 | 2.10 Row-grouping produces units the tests were not designed for | task | **part-landed**, marked — six commits resolve; twelve fixes unpromoted | V1X:1191, :16; `REALWORLD-CORPUS-SPEC.md` §0.3 | — |
| 470 | 2.11 Engine correctness — shared choke points and the null-loop cost model | task | **part-landed**, marked MIXED — `4dd88c4` resolves; yield helper, `N_PERM`, `entropy:142` open | V1X:1192; BANKED:498 (`entropy:142`) | — |
| 512 | 2.12 Structural omission as a signal | finding | open, no capability | V1X:1193 | — |
| 530 | 2.13 Cost ceilings measure the wrong variable (S327) | finding | open | **absent from index**; BANKED:492, :496 | — |
| 550 | 2.14 The sequence-duplication null already prices categorical columns (S327) | finding | open; its cardinality guard **KILLED S328** (`:543`) | **absent from index**; BANKED:496 | — |
| 599 | 2.15 One question, two owners — applicability is decided twice | finding | open | **absent from index**; BANKED:498 | — |
| 639 | Evidence — three files, S334 | finding | recorded | **absent from index** | — |

### 2.3 §3 — Variance-estimator unification (3 rows)

| line | item | kind | state, evidenced | duplicate-of | P |
|---|---|---|---|---|---|
| 665 | 3.1 Catalogue | task | open — deliverable `docs/shared/VARIANCE-ESTIMATORS.md` not built | V1X:1183; ROADMAP Track F | — |
| 673 | 3.2 Scoped sub-refactors | task | open | V1X:1183 | — |
| 685 | 3.3 Original Track F scope — Unified SD Scan | task | open | V1X:1183; `ad270a8:ROADMAP.md:251` | — |

### 2.4 §4 — AI Screening mode (10 rows)

§4.2 is counted as its five `####` test specs (rule 0.3, V12).

| line | item | kind | state, evidenced | duplicate-of | P |
|---|---|---|---|---|---|
| 699 | 4.1 Existing-test AI-detection efficacy ranking | task | open | V1X:1194 | — |
| 740 | 4.2.1 Round-number frequency | task | open — no such test in `src/tests/` (30 files) | V1X:1194 | — |
| 748 | 4.2.2 Anchor-value detection | task | open — no such test | V1X:1194 | — |
| 756 | 4.2.3 Conditional-independence test | task | open — no such test | V1X:1194 | — |
| 765 | 4.2.4 Compressibility / Kolmogorov-complexity proxy | task | open — no such test | V1X:1194 | — |
| 774 | 4.2.5 Membership-inference test | task | open — no such test, "Probably v1.2+" | V1X:1194 | — |
| 782 | 4.3 Mode surfacing | task | open | V1X:1194 | — |
| 800 | 4.4 Implementation phases | task | open | V1X:1194 | — |
| 810 | 4.5 Validation requirement | task | open — four AI fixtures named, none authored | V1X:1194 | — |
| 822 | 4.6 Risks | decision record | recorded | V1X:1194 | — |

### 2.5 §5 — Calibration / methodology audits banked (9 rows)

Declared source: STATUS parked items. Diffed in §4.

| line | item (verbatim heading) | kind | state, evidenced | duplicate-of | P |
|---|---|---|---|---|---|
| 835 | 5.1 Permutation calibration B = 999 → 9999 — SUPERSEDED by §5.9 (S340) | task | **superseded**, marked | V1X:1195, §5.9; "STATUS parked #8" — **dead scheme** | — |
| 849 | 5.2 Severity-formula diversity metric reconsideration | task | open | V1X:1197, §5.5 | — |
| 853 | 5.3 Modality test plot upgrade | task | open — `MiniCard_Modality.jsx:50` still `value: c.dip` | V1X:1198; "STATUS parked #7" — **dead scheme, orphaned** | — |
| 857 | 5.4 Large-N effect-size gate audit — PROMOTED to v1.0 blocker (S187) | task | open, v1.0 blocker; promotion marked | **V1X:1199 ↔ STATUS:199** — the one live pointer pair | — |
| 897 | 5.5 Assay-aware severity weighting | task | open | V1X:1200; `ad270a8:ROADMAP.md:133` (Item 5) | — |
| 910 | 5.6 LOESS Residual full-recursive binary segmentation | task | open | V1X:1201; ROADMAP Item 6c | — |
| 920 | 5.7 Terminal Digit directional statistic | task | open | V1X:1202; ROADMAP Item 6a | — |
| 928 | 5.8 Genomics raw-count normalization advisory | task | open | V1X:1203; ROADMAP Item 6e | — |
| 936 | 5.9 Tier reachability — five mechanisms, not one (S340, substantially corrected S341) | finding | open | STATUS **P43** (`:1166`), **P45** (`:1148`); BANKED:530, :549, :553 | P43, P45 |

**§5.9 is the only subsection of §5 that cites a live P-number, and §6 declares it "This doc |
Single source" — not a mirror.** Every mirrored subsection carries zero.

### 2.6 §6 — Cross-references (24 rows)

Every row is a `mirror` by kind: a pointer from a topic to its source-of-truth. State is
`recorded` throughout — an index row has no open/closed axis of its own; it inherits the state of
the item it points at.

| lines | rows | pointing at |
|---|---|---|
| 1181–1204 | 24 | §1 ×1 · §2 ×11 · §3 ×1 · §4 ×1 · §5 ×9 · Archetype 4 ×1 |

Source-of-truth column, tallied with
`command sed -n '1181,1204p' … | awk -F'|' '{print $3}' | sort | uniq -c`:

| source-of-truth cell | rows |
|---|---|
| `This doc` | **19** |
| `METHODOLOGY-MAP.md §"Gap audit"` | 1 |
| `METHODOLOGY-MAP.md §"Inconsistencies to fix"` | 1 |
| `STATUS.md §v1.0 blockers` | 1 |
| `STATUS parked #7` | 1 |
| `STATUS parked #12` | 1 |
| **rows** | **24** |

**19 of 24 index rows say the source of truth is this document itself.** Only 5 point outward,
and 2 of those 5 point through the dead scheme. Findings at §6.4.

### 2.7 §7 — What's deliberately NOT in this doc (7 rows)

All seven are `decision record` / `recorded` — exclusion decisions with a routing target.

| line | item (verbatim bold phrase) | routes to | pointer live? |
|---|---|---|---|
| 1212 | **v1.0 work in progress.** | STATUS.md | yes (unnumbered) |
| 1213 | **v1.0 UI polish backlog.** | STATUS.md parked items | yes (unnumbered) |
| 1214 | **Implementation details for tests that have landed.** | METHODOLOGY.md | yes |
| 1215 | **Real-data benchmark + lab beta tracks.** | STATUS.md parked **#5, #6** | **no — dead scheme, orphaned** |
| 1216 | **Onboarding / Phase C-lite.** | STATUS.md parked **#2** (blocker) | **no — dead scheme, orphaned** |
| 1217 | **Review-mode redesign (Phase B).** | STATUS.md parked **#3** | **no — dead scheme, orphaned** |
| 1218 | **AI consultation prompt for v1.0 (§4 prompt body).** | landed via A1.D2 / S161 / S162a / S162b | yes |

### 2.8 §8 — Staged artifacts for undecided arcs (1 row)

| line | item | kind | state |
|---|---|---|---|
| 1228 | **`docs/shared/archive/CLEARED-BODY-AUDIT.md`** — runtime inventory of all 28 test cards' cleared-state field population | decision record | recorded; file on disk, gitignored (`.gitignore:48`) |

---

## §3 — Mirror 1: §1 ↔ METHODOLOGY-MAP §Gap audit, both directions

The sync instruction is at `V1X:36`: *"Source-of-truth: METHODOLOGY-MAP.md §Gap audit. If a gap is
closed or re-prioritised, edit there first; mirror here."* There is no check.

Source: `METHODOLOGY-MAP.md:314`–`:323`, §"Remaining gaps (future work)".
Mirror: `V1X:27`–`:34`.

### 3.1 Item level — zero divergence

**Six rows against six. Same six gap names, same dimension letters, same order. Nothing gained,
nothing lost.**

**The 8-versus-6 apparent discrepancy resolves, and it resolves in the mirror's favour.** Part
one censused METHODOLOGY-MAP's gap audit at 8 rows. V1X declares itself a mirror of the
*sub*-section `"Gap audit > Remaining gaps (future work)"` — 6 rows. The two excluded rows are
§"Gaps addressed by planned tests", both of which landed (S114, S102/S104) and neither of which
says so. **The mirror's scope is correctly stated; it simply does not mirror the half that went
stale.**

### 3.2 Text level — six of six rows diverged, and every one gained text in the mirror

| gap | source (METHODOLOGY-MAP) | mirror (V1X) | direction |
|---|---|---|---|
| 2D spatial plate variance | "Parked v1.0" | "Parked v1.0. Detects spatial autocorrelation in plate-layout data — well-position effects, edge effects, batch-position artefacts that the row-ordered tests don't see." | **mirror gained a sentence** |
| Non-linear cross-replicate dependence | "IRC is winsorized Pearson only. Low forensic justification." | "IRC is winsorised Pearson only. Low forensic justification — most fabrication signal is linear or rank-detectable." | **gained a clause**; also respelled *winsorized* → *winsorised* |
| Distribution skewness | "AD already captures via full CDF. Low priority." | "Anderson-Darling already captures via full CDF comparison. Low priority." | **gained** — abbreviation expanded, "full CDF" → "full CDF comparison" |
| Row-matched near-duplicates across conditions | "Near-matches with small perturbations. Needs own null." | "Near-matches with small perturbations (e.g. fabricator copies Control rows + adds tiny noise to make Treatment rows). Needs its own null." | **gained a worked example** |
| Cross-condition missing data pattern | "Deletion in one condition only. Hard without ground truth." | "Deletion in one condition only. Hard without ground truth on missingness mechanism." | **gained a qualifier** |
| Per-condition pooled entropy / GoF / modality | "Extension for datasets with replicates. Small per-condition sample concern." | "Extension for datasets with replicates — pool replicate values within a condition, run Dim V tests on the pooled per-condition distribution. Small per-condition sample concern." | **gained a procedure clause** |

Also divergent: the source's column header is `Dim`; the mirror's is `Dimension`.

**Nothing has flowed the other way.** There is no source-side text absent from the mirror, on any
of the six rows.

### 3.3 A third divergence, and it is the count class

`V1X:25` — inside the mirror's own preamble — reads *"gaps that the **27-test** battery doesn't
currently address."* The battery is **29** (`TEST_MECHANISM` 29 entries, `MINIPLOT_REGISTRY` 29,
`src/tests/` 30 files of which one is the property registry).

**V1X carries three different battery sizes in live prose:**

| size | lines | correct? |
|---|---|---|
| 27 | `:25`, `:701` | no |
| 28 | `:603`, `:1228` | no |
| 29 | `:125`, `:609` | **yes** |

Command: `command grep -noE '.{0,40}(2[0-9]\|3[0-9])[- ](test\|tests).{0,40}' docs/shared/V1X-FUTURE-WORK.md`.
This is the fourth failure class part one named — counts with no freshness gate — occurring
inside the mirror's own framing sentence.

### 3.4 What mirror 1 shows

A manual sync instruction with no check held the **item set** exactly and lost the **item text**
completely, on every row, always in the same direction. The mirror is the fuller document. A
reader editing the source per the instruction at `:36` would be editing the thinner of the two
copies and would then overwrite the better one.

---

## §4 — Mirror 2: §5 ↔ STATUS parked items, both directions

### 4.1 First finding — §5 does not carry a sync instruction

The premise carried into this dispatch was that both mirrors carry "edit there first; mirror
here". **That is true of §1 only.** `command grep -n 'edit there first'` returns one hit,
`V1X:36`.

§5's mirror claim lives in two other places, neither inside §5:

- `V1X:19`, the At-a-glance table: *"§5.9 is primary scope; the rest mirrored from STATUS parked
  items."*
- `V1X:1177`, the general instruction governing §6's cross-reference table: *"When updating these
  surfaces, edit the source-of-truth first and mirror here."* **This sits 346 lines below §5's
  heading** (`:831` → `:1177`), and among §5's nine subsections its table names a live STATUS
  source for one.

**A mirror whose sync instruction is 346 lines away, in a section about something else, is not
governed by that instruction in any practical sense.**

### 4.2 Second finding — §5 is not mostly a mirror

Of its nine subsections, §6's index gives a STATUS source for three:

| §5 subsection | §6's declared source | pointer resolves? |
|---|---|---|
| 5.1 Permutation B = 999 → 9999 | This doc; *"STATUS parked #8 retires with it"* | **no** — dead scheme |
| 5.2 Severity-formula diversity metric | This doc — primary scope | n/a |
| 5.3 Modality plot upgrade | **STATUS parked #7** — role: "Mirror" | **no** — dead scheme |
| 5.4 Large-N effect-size gate audit | **STATUS.md §v1.0 blockers** | **yes** |
| 5.5 Assay-aware severity weighting | This doc; ROADMAP Item 5 | n/a |
| 5.6 LOESS binary segmentation | This doc; ROADMAP Item 6c | n/a |
| 5.7 Terminal Digit directional statistic | This doc; ROADMAP Item 6a | n/a |
| 5.8 Genomics advisory | This doc; ROADMAP Item 6e | n/a |
| 5.9 Tier reachability | This doc — single source, primary scope | n/a |

**One of nine subsections has a resolvable STATUS pointer.**

### 4.3 Which of STATUS's 39 P-numbers does §5 know about? Two, and both sit outside the mirror.

```
command grep -noE '\bP[0-9]{1,3}\b' docs/shared/V1X-FUTURE-WORK.md
  669:P5   669:P6   1148:P45   1166:P43
```

`P5` and `P6` at `:669` are the **cross-condition property** namespace, not the parked register —
STATUS's own opener records that *"`P` is two namespaces. P4–P9 are cross-condition framework
properties in METHODOLOGY. P41–P79 are parked items here."* They are excluded.

That leaves **P45** (`:1148`) and **P43** (`:1166`). Both sit inside **§5.9**, the one subsection
§6 declares *"This doc | Single source"*. **The mirrored subsections of §5 carry no live
P-number at all.**

P78 and P79 are absent, which is expected — both were allocated at the S346 close. **The finding
is that the other 37 are absent too.**

### 4.4 Both directions, itemised

**In the mirror, not in the source — 7 topics, all orphaned.** Every one is cited in the retired
`STATUS parked #N` scheme, and every one has been searched for in current STATUS.md by subject,
not by number:

| topic | cited at | as | STATUS.md search | hits |
|---|---|---|---|---|
| Modality plot upgrade | `:855`, `:1198` | `#7` | `Modality` | **0** |
| Permutation B = 9999 | `:1195` | `#8` | `permutation` | 2, both unrelated (P67 doc-arithmetic, a tier note) |
| Long-format detection | `:1204` | `#12` | `long-format`, `Long-format` | **0** |
| Real-data benchmark | `:1215` | `#5` | `benchmark` | **0** |
| Lab beta track | `:1215` | `#6` | `beta` | **0** |
| Onboarding / Phase C-lite | `:1216` | `#2` | `onboarding`, `Phase C` | **0** |
| Review-mode redesign (Phase B) | `:1217` | `#3` | `review mode`, `Phase B` | **0** |

An eighth scheme-B citation, `:77` (`STATUS parked #50`), attaches to §2.2's priority line rather
than to §5; it is equally unresolvable — STATUS's register holds no `#50` and its highest live
number is P79.

**All eight scheme-B citations are in the dead scheme; seven of the eight name a topic STATUS no
longer holds under any name. The mirror is the only surviving copy of all seven.**

**In the source, not in the mirror — 37 of 39 P-numbers.** P41–P42, P44, P46–P79 excluding P43,
P45, appear nowhere in V1X.

**In both, agreeing — one: §5.4.**

- `STATUS.md:199`–`:200`: *"§5.4 large-N effect-size gate audit. Gap 1's evidence base is empty.
  A large clean fixture is a prerequisite for measuring it, not a consequence. Gap 2 remains the
  load-bearing half."*
- `V1X:857`–`:868`: *"A large clean fixture is therefore a prerequisite for measuring gap 1, not
  a consequence of measuring it"*, and *"gap 2 is the load-bearing half of this blocker rather
  than gap 1."*

Both sides also point at each other by name — STATUS says "§5.4", V1X says "STATUS.md §v1.0
blockers". **This is the only zero-divergence pair in either mirror, and it is the only pointer
pair in either mirror that uses a live namespace on both ends.**

### 4.5 What mirror 2 shows

Mirror 1 diverged in text while holding its item set, because its pointer (a named section) stayed
live. Mirror 2 cannot be diffed at all by the pointers it carries, because its pointer scheme
died. **The difference between the two mirrors is not care or discipline — it is whether the
namespace the pointer uses survived.** Mirror 2's one live pointer pair, §5.4, is also its one
correct row.

---

## §5 — The landed markers

### 5.1 Part one's 12 is confirmed, and it is a line count

```
command grep -cE 'BUILT|LANDED|FIXED' docs/shared/V1X-FUTURE-WORK.md      → 12   (lines)
command grep -oE 'BUILT|LANDED|FIXED' … | wc -l                           → 16   (occurrences)
command grep -cE '^#+ .*(BUILT|LANDED|FIXED)' …                           →  4   (headings)
```

Three figures, three rules, one name. The 12 lines are `:16 :134 :142 :153 :227 :260 :267 :477
:480 :1189 :1190 :1191`. **Part one's 12 was a line count and is correct as such.**

Two of the 16 occurrences are not landings at all: `:142` reads "Gate AS BUILT" and carries no
session tag, and `:480` reads **"SCOPED, NOT BUILT, DEFERRED"** — a negative the grep scores as a
marker.

### 5.2 The 16 occurrences reduce to 6 distinct landings

V1X echoes each landing into up to three surfaces, which is why the occurrence count is nearly
three times the landing count.

| landing | session tag | commits, all verified with `git log -1` | marked at | does the register say what happened next? |
|---|---|---|---|---|
| §2.8 group-attribute column recognition | **S315** | `531e180` | heading `:227`, At-a-glance `:16`, index `:1189` | **yes** — "moved to `V1X-DECIDED.md`"; its outcome "disproved its own displacement thesis and opened §2.9" |
| §2.9 scattered partial-row duplication | **S316** | `e751523` | heading `:260`, At-a-glance `:16`, index `:1190` | **yes** — "moved to `V1X-DECIDED.md`"; "the coverage failure mode" |
| §2.10 grouping trigger + confirm card | **S320–S321** | `a9d3c61`, `6685f10`, `d4e6dd3`, `15f7488`, `6d95c77`, `005026e` | heading `:267`, At-a-glance `:16`, index `:1191` | **yes** — "twelve fixes unpromoted; one display reconciliation outstanding" |
| §2.11 WAC yield + choke-point fixes | **S317** | `4dd88c4` | body `:477`, index `:1192` | **yes** — "shared yield helper deferred, `N_PERM` and `entropy:142` open" |
| §2.4 VFS near-dup keep-gate | **S308 / S309** | `d22df9f`, `e71f0d2`, `0190ed6` | body `:134`, `:153` | **yes** — road-test set (C23/C21/C20) and calibration set both named |
| §2.6 axis 4, input representation | **S336** | — (no hash cited) | At-a-glance `:16` | **yes** — §2.6's heading reads "DESIGN PROGRAMME COMPLETE — moved to `V1X-DECIDED.md`" |

**Six of six marked landings say what happened next.** Where V1X marks, it marks well: five of
the six carry a commit hash, all of which resolve, and every one carries the residue.

### 5.3 The two landings that carry no marker

**§2.3 "Coherence-cleanup residue from Track A" (`:79`).** The section says *"Track A … listed
coherence cleanups, some of which may not have landed in the v1.0 push. To audit against current
source before v1.x scope"* and lists four. **All four landed at S95**, each evidenced at source:

| cleanup, verbatim from `:82`–`:85` | evidence |
|---|---|
| Mahalanobis Bonferroni → BH-FDR (per-row p-value correction) | `src/tests/mahalanobis.js:162` `const adjRowPvals = bhFDR(rowPvals);` |
| CCR ρ₀ heuristic → LOO alternative | `src/tests/rankCorrelation.js:59` *"Instead of testing against an arbitrary fixed null (ρ₀=0.85)"*; LOO in the module docstring at `:10` |
| ConstOffset expansion to all column pairs | `src/analysis/engine.js:411` — dispatched on the full matrix, bypassing `aggregatePerGroup`; CLAUDE.md:61 |
| Runs + Row-Mean Runs escalation rule → sub-unit BH-FDR promotion | `src/tests/runs.js:75`, `:259`; `rowMeanRuns.js`; CLAUDE.md:55 |

**Both of the sources §2.3 names already say so.** METHODOLOGY-MAP's own revision history records
Track A landed at S95 (part one §5.2 evidenced all eight of its nine sub-items). And the archived
ROADMAP the section cites at `:87` says it in one line — `ad270a8:docs/shared/ROADMAP.md:282`:
*"8. ✅ **Track A** (statistical coherence cleanup) — S95."*

**§2.4's detector (`:89`).** `src/tests/sequentialDuplication.js` exists and is dispatched at
`src/analysis/engine.js:399`. **V1X's own body says so** — `:125`: *"Sequential Duplication is a
dispatched member of the 29-test battery and is deposit-verified firing."* The landing is
recorded in the body, absent from the heading, and absent from the index. The section still sits
under `## 2. Test additions (post-v1.0 forensics)` — a heading that asserts the test does not
exist yet.

### 5.4 The comparison — expectation 2 inverts

The denominator is V1X's **39 work subsections**: V11 + V12 = 35 − 1 + 5. §1's six mirror rows,
§6's 24 index rows, §7's seven exclusions and §8's one artefact are not work subsections and are
excluded.

Discharged means landed, part-landed or superseded: §2.3, §2.4, §2.6, §2.8, §2.9 landed; §2.10,
§2.11 part-landed; §5.1 superseded. **8 of 39 (21%).** §2.14's killed cardinality guard and
§5.4's promotion to v1.0 blocker are **not** counted — the guard is a sub-item of a section whose
core finding survives, and a promotion is a routing change with the work still open.

| register | items (denominator rule) | discharged | of which unmarked | **unmarked fraction** |
|---|---|---|---|---|
| METHODOLOGY-MAP (part one §6.1) | 41 — part one's §0.3 rule over its whole future-work surface | 21 (51%) | 19 | **90%** |
| V1X (this census) | 39 — this census's 77 rows filtered to work subsections (V11 + V12) | 8 (21%) | 2 | **25%** |

**The two denominators are built by different rules, so the discharge columns are not
like-for-like.** 41 is part one's rule over METHODOLOGY-MAP's whole future-work surface; 39 is
this census's 77 rows filtered to work subsections. Over all 77 rows V1X's discharge rate is
**10%**, not 21%. **The like-for-like comparison is the last column** — the unmarked fraction,
19 of 21 against 2 of 8. That is a ratio computed inside each register and it does not depend
on either denominator. §9 leads with that column and is correct as it stands.

**V1X is markedly better, and the mechanism is measurable.**

V1X marks a discharge in **three surfaces that are edited in one pass** — the `###` heading, the
`## At a glance` table at the top of the file, and the §6 cross-reference table at the foot. A
reader scanning any one of the three sees the state. That redundancy is why five of the six
landings above appear two or three times in the grep, and it is why the occurrence count
(16) so badly overstates the landing count (6).

**METHODOLOGY-MAP has no equivalent.** It has no index and no summary table. Its landings are
recorded only in an append-only revision history, and part one found the register and that
history contradicting each other 80 lines apart, with the stale half the one a reader scanning
for work finds first.

**What METHODOLOGY-MAP is missing is an index that is edited in the same pass as the item.**

### 5.5 Both of V1X's failures are failures of the same mechanism

Neither of the two unmarked landings is a case of the author forgetting to write "BUILT". Both
are cases where the index — the surface that would have caught it — was not in play:

- **§2.4 was marked on one surface only** (the body at `:125`), and never propagated to the
  heading or the index.
- **§2.3 has no index row at all**, because the index row that should be its own **points at the
  wrong section** (§6.4).

**The redundancy works when it is used. Both failures are cases of it not being used, and one of
them is a pointer defect rather than an authoring omission.**

---

## §6 — Scheme D, and a fifth pointer class

### 6.1 Scheme D — 19 ROADMAP citations, every one enumerated

```
git ls-files | command grep -ci roadmap                                    → 0
command grep -oE 'ROADMAP' docs/shared/V1X-FUTURE-WORK.md | wc -l          → 19
```

**The zero still holds.** ROADMAP.md is not in the working tree. **It is in the repository**, and
V1X says where — `:1206`: *"**ROADMAP.md status:** retired. … Recoverable from git history (last
live at `ad270a8:docs/shared/ROADMAP.md`)."*

```
git cat-file -t ad270a8:docs/shared/ROADMAP.md      → blob
git show ad270a8:docs/shared/ROADMAP.md | wc -l     → 311
```

19 occurrences across 18 lines; `:1206` carries two.

| # | line | citation | resolves to, in `ad270a8:docs/shared/ROADMAP.md` |
|---|---|---|---|
| 1 | `:4` | ROADMAP Item 8 — **the Purpose line** | `:227` `## Item 8: Planned Tests (v1.0 — from METHODOLOGY-MAP v3.2)` |
| 2 | `:17` | Track F | `:251` `### Track F — Unified SD scan (deferred)` |
| 3 | `:87` | ROADMAP.md Track A | `:282` *"8. ✅ **Track A** (statistical coherence cleanup) — S95"* — **a checklist line, not a section** |
| 4 | `:663` | Track F | `:251` |
| 5 | `:687` | Track F (archived) | `:251` |
| 6 | `:899` | Item 5 | `:133` `## Item 5: Assay-Aware Severity Weighting` |
| 7 | `:903` | Item 5 | `:133` |
| 8 | `:912` | Item 6c | `**6c. CUSUM (or WBS/PELT) Binary Segmentation**` |
| 9 | `:922` | Item 6a | `**6a. Terminal Digit Directional Test (S21)**` |
| 10 | `:930` | Item 6e | `**6e. Normalization Confirmation for Genomics (S21)**` |
| 11 | `:1183` | Track F | `:251` |
| 12 | `:1199` | Track G | `:255` `### Track G — Large-N gate audit` |
| 13 | `:1200` | Item 5 | `:133` |
| 14 | `:1201` | Item 6c | 6c |
| 15 | `:1202` | Item 6a | 6a |
| 16 | `:1203` | Item 6e | 6e |
| 17 | `:1204` | Track H | `:259` `### Track H — Long-format fix (v1.0)` |
| 18 | `:1206` | ROADMAP.md status | the blob |
| 19 | `:1206` | `` `ad270a8:docs/shared/ROADMAP.md` `` | **the working ref itself** |

**All 19 resolve. 18 resolve to a heading; the 19th, `:87` Track A, resolves to a checklist line
that says the work is done** — the exact fact §2.3 is missing (§5.3).

**Scheme D is an archived-file problem, not a rename — nothing was renamed; the file was
deleted and its citations were never rewritten.** The repair is mechanical: substitute
`ad270a8:docs/shared/ROADMAP.md` for `ROADMAP.md`. V1X wrote that repair down at `:1206` and
never applied it to its own 18 other citations. **P79 does not shrink: all 19 pointers stay
broken for a reader who does not hold the ref, and 18 of the 19 do not carry it. What changes
is the remediation cost — mechanical substitution rather than reconstruction.**

A qualification, stated: the blob is reachable from `main`'s history today. A history rewrite
would break it, and a hash in prose has no more freshness gate than a count does. The repair
converts an unresolvable pointer into a resolvable-but-ungated one.

### 6.2 A fifth pointer class the census never counted — file-path pointers

Part one counted four numbering schemes and no file paths. This class is the same failure — a
pointer into a namespace that moved.

```bash
command grep -oE '[A-Za-z0-9_/.-]+\.md' docs/shared/V1X-FUTURE-WORK.md \
  | xargs -n1 basename | sort -u | wc -l          # 21 distinct .md names
```

**21 distinct `.md` names**, plus one extension-less pointer (`S292-ROLE-INFERENCE-SCOPE`,
`:181`) = **22 file pointers**. Classified:

| class | count | members |
|---|---|---|
| **tracked** — `git ls-files` finds it | **11** | METHODOLOGY.md · METHODOLOGY-MAP.md · PERF-BASELINE.md · REALWORLD-CORPUS-SPEC.md · SESSION341-HIGH-REACHABILITY-CLASSIFICATION.md · SESSION342-BAND-COUNTERFACTUAL.md · SESSION342-CLEAN-CORPUS-GATE-CLASSIFICATION.md · SESSION343-GATE-PROVENANCE-AUDIT.md · TEST-GROUND-TRUTH.md · TYPOGRAPHY-SYSTEM.md · V1X-DECIDED.md |
| **on disk, gitignored** — invisible to `git ls-files` | **6** | STATUS.md (`.gitignore:37`) · archive/CLEARED-BODY-AUDIT.md, archive/TEST-INTEGRITY-AUDIT.md, archive/SESSION300-BLOCKCOPY-MEASURE.md (`.gitignore:48`) · SESSION292-CHAT-SUMMARY.md, SESSION311-SPAN-SKIP-READ.md — both at **`docs/sessions/`**, not the `docs/shared/` layout V1X's Owner line implies (`.gitignore:45`) |
| **git history only** | **1** | ROADMAP.md — §6.1 |
| **proposed deliverable, correctly unbuilt** | **1** | `docs/shared/VARIANCE-ESTIMATORS.md` (`:667`) — §3.1's own output, not a pointer at all |
| **dead** | **3** | `C16-GROUNDTRUTH-BANK.md` (`:254`, *"banked in"*) · `SESSION299-CHAT-SUMMARY.md` (`:221`, *"Reasoning banked in"*) · `S292-ROLE-INFERENCE-SCOPE` (`:181`) |
| **total** | **22** | |

The three dead pointers were checked three ways: absent from the working tree, `git log --all
--diff-filter=A -- '*<name>.md'` returns **0**, and a `find` over the whole repository returns
nothing. Two of the three are cited in the past tense as banks that exist.

**Six pointers resolve only because a gitignored file happens to be on this machine.** They are
invisible to `git ls-files` — which is exactly the trap that made this dispatch mandate
`command grep` with explicit paths, and it is why `git ls-files | grep -ci roadmap → 0` was never
sufficient evidence that ROADMAP was gone. **The negative that looked decisive in part one was
produced by the tool the dispatch already warned about.**

### 6.3 The Purpose line, re-adjudicated

`V1X:4` names four sources. Part one found two of them broken. **On measurement, one is
broken:**

| source named at `:4` | part one's verdict | measured here |
|---|---|---|
| METHODOLOGY-MAP's gap audit | live | **live** — mirrored at §1, item set exact (§3.1) |
| ROADMAP Item 8 | *"a file that does not exist"* | **resolves** — `ad270a8:docs/shared/ROADMAP.md:227` |
| STATUS.md parked items | *"a numbering scheme that was retired"* | **broken** — all 8 scheme-B citations dead, 7 topics orphaned (§4.4) |
| chat-history-only specs | unassessed | **partly broken** — 3 of the named chat documents cannot be found anywhere (§6.2) |

**The Purpose line's sharpest failure is not ROADMAP. It is STATUS** — the one source of the four
that is still a live, actively-maintained file, cited through a scheme that died.

### 6.4 The index defect that explains a landed-but-unmarked instance

`V1X:1182` reads:

> `| Track A coherence cleanup (§2.2) | METHODOLOGY-MAP.md §"Inconsistencies to fix" | Mirror + audit-current-state-before-banking. Most of Track A landed S95; verify residue at source. |`

**§2.2 is "Blocked Mahalanobis genuine-block detection". §2.3 is "Coherence-cleanup residue from
Track A". The index row is off by one.**

Two consequences:

1. **§2.3 has no index row.** The one surface that would have carried its landing points
   somewhere else — which is why §5.3's landed-but-unmarked instance survived.
2. **The index row already knows.** It says *"Most of Track A landed S95"*. The fact is in the
   document, one section away from the section that needs it, attached to the wrong section
   number.

**The index has also stopped keeping up.** Six of §2's seventeen subsections have no index row:

| absent from `§6` | added at |
|---|---|
| §2.3 Coherence-cleanup residue | early (mis-pointed, above) |
| §2.9b C16 applicability-saturation exhibit | S318 |
| §2.13 Cost ceilings measure the wrong variable | S327 |
| §2.14 The sequence-duplication null | S327 |
| §2.15 One question, two owners | S332 |
| Evidence — three files | S334 |

**The index covers §2.1 through §2.12 and nothing after.** Every §2 subsection added from S318
onward is unindexed. The three-surface marking mechanism that makes V1X better than
METHODOLOGY-MAP (§5.4) is decaying at exactly the surface that carries it, and it decayed
silently because nothing checks that every `###` has an index row.

---

## §7 — Reconciliation

### 7.1 Combined, five registers

| register | part one | measured now | rule |
|---|---|---|---|
| STATUS.md parked register | 37 | **39** | table rows with a P-number first cell (M1) |
| BANKED.md | 200 | **215** | 197 top-level bullets + 18 prose-only (M8) |
| CLAUDE.md `## Active Conventions` | 108 | **108** | top-level bullets, `:98`–`:259` (M10) |
| METHODOLOGY-MAP.md future-work | 41 | **41** | part one §0.3 rule (M11) |
| **part-one subtotal** | **386** | **403** | M12 |
| **V1X-FUTURE-WORK.md** | — | **77** | §0.3 rule (V16); variants 73 / 53 / 49 |
| **five registers, total** | — | **480** | M12 + V16 |

**The four part-one figures match the dispatch's expected column cell for cell: 39, 215, 108, 41,
summing to 403.** The +2 on STATUS is P78 and P79, allocated at the S346 close. The +15 on BANKED
is the `## Session 346` block appended at `:585`. CLAUDE.md and METHODOLOGY-MAP did not move.
**The S346 close is the whole of the drift, and nothing else moved.**

Two of the four were separately corroborated by Chat from the project-file copies (BANKED at 615
lines / 197 / 215; STATUS at 39, P41–P79 contiguous). Those copies were 20 lines stale on a
different file in the same snapshot, so the agreement is corroboration, not verification. The
figures above are measured on `cb672a0` and reported as measured.

### 7.2 V1X's 77 rows, by kind

| kind | §1 | §2 | §3 | §4 | §5 | §6 | §7 | §8 | **total** |
|---|---|---|---|---|---|---|---|---|---|
| task (work owed) | 6 | 11 | 3 | 9 | 8 | 0 | 0 | 0 | **37** |
| finding | 0 | 6 | 0 | 0 | 1 | 0 | 0 | 0 | **7** |
| decision record | 0 | 0 | 0 | 1 | 0 | 0 | 7 | 1 | **9** |
| mirror of another register | 0 | 0 | 0 | 0 | 0 | 24 | 0 | 0 | **24** |
| **rows** | **6** | **17** | **3** | **10** | **9** | **24** | **7** | **1** | **77** |

### 7.3 V1X's 77 rows, by state

| state | §1 | §2 | §3 | §4 | §5 | §6 | §7 | §8 | **total** |
|---|---|---|---|---|---|---|---|---|---|
| landed, with evidence | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | **5** |
| part-landed (work remains) | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | **2** |
| superseded | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | **1** |
| open | 6 | 9 | 3 | 9 | 8 | 0 | 0 | 0 | **35** |
| recorded (no open/closed axis) | 0 | 1 | 0 | 1 | 0 | 24 | 7 | 1 | **34** |
| unknown | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0** |
| **rows** | **6** | **17** | **3** | **10** | **9** | **24** | **7** | **1** | **77** |

**Zero rows are `unknown`.** Part one had one (STATUS P46). V1X states a status for every
subsection it carries — a third thing it does better than METHODOLOGY-MAP, and the reason a
census of it needs no refusal-to-guess column.

`recorded` covers §6's 24 index rows, §7's seven exclusion decisions, §8's staged artefact, §2's
"Evidence — three files, S334" and §4.6 "Risks".

### 7.4 Cross-register duplication — part one's §7.6, now settled

Part one left two rows unmeasured because they cannot be settled from one side.

**METHODOLOGY-MAP ↔ V1X.** Two links, both live, both stated in V1X's index.
`METHODOLOGY-MAP §Remaining gaps` ↔ `V1X §1` — six items, mirrored, item set exact, all six texts
diverged by addition (§3). `METHODOLOGY-MAP §Inconsistencies to fix` ↔ `V1X §2.3` — nine items on
the source side, four on the mirror side, **all four landed at S95 and neither copy says so**;
the index row that connects them is off by one (§6.4).

**BANKED ↔ V1X.** Measured from BANKED's own duplicate-of column in part one §3.9
(`command sed -n '/### 3.9/,/^## §4/p' … | command grep -c 'V1X §'` → **7**):

| BANKED row | points at |
|---|---|
| `:399` | V1X §2.5 |
| `:401` | V1X §2.10 |
| `:417` | V1X §2.10 |
| `:492` | V1X §2.13 |
| `:494` | V1X §5.9 |
| `:496` | V1X §2.13 |
| `:498` | V1X §2.15 |

**Seven BANKED rows point into V1X; not one of those V1X sections points back.** The link is
one-directional. §2.13 and §2.15 are among the six sections V1X's own index omits (§6.4), so
BANKED can reach them and V1X's index cannot.

**What the duplication is, on the V1X side.** Not mass copy-paste. Of V1X's 77 rows, **24 are its
own internal index** and **6 are a mirror of another register** — **30 of 77, 39%, whose whole
function is to point.** Of those 30:

| defect | rows | which |
|---|---|---|
| points through the dead `STATUS parked #N` scheme | 3 | `:1195` (#8), `:1198` (#7), `:1204` (#12) |
| points at the wrong section | 1 | `:1182` — Track A → §2.2, should be §2.3 (§6.4) |
| points at a live source whose text has drifted | 6 | §1's six mirror rows (§3.2) |
| **defective** | **10 of 30** | |

Six of the seven remaining dead-scheme citations sit outside the 30 — five in §7's exclusion
bullets (`:1215` #5, `:1216` #2, `:1217` #3, plus the bare `#6` at `:1215`) and one in §2.2's
priority line (`:77` #50). **Every one of V1X's eight scheme-B citations is dead, wherever it
sits.**

---

## §8 — Staleness: what a census must carry

Part one went stale inside one session because banking its findings moved the registers it
measured. Three instances are now in hand and they are **three different failure modes**, only
one of which the gate part one proposed for itself would catch.

### 8.1 Measured then moved

STATUS 37 → 39; BANKED 200 → 215. Both are the S346 close, and both are correct in both states.

Part one recorded, for every figure, **the rule and the command** — and not **the commit it was
measured at**. A later reader running the command gets 39 and cannot tell whether the census was
wrong or the register moved. **A census row's provenance is three things, not two: the rule, the
command, and the ref.** Every table in this document is measured at `cb672a0` and says so at §0.

### 8.2 Stale in the heading, current in the body

`SESSION346-REGISTER-CENSUS.md:138` reads:

> `## §2 — STATUS.md — the parked register (37 rows)`

and `:204` reads:

> `## §3 — BANKED.md (200 rows)`

Both were correct when measured. Both moved at the S346 close, three commits later, in the same
session. The body figures at §9 and §0 are consistent with each other; only the two headings are
stale.

**Reported, not amended** — the document is read-only in this dispatch.

The lesson is not "check headings". It is that **a count in a heading has no rule and no command
attached to it**, so §0 cannot gate it — §0 gates figures by matching them against a table of
rules, and a heading figure has no entry to match. A heading is also the first thing a reader
sees and the last thing an author re-reads. **A count belongs in §0, not in a heading.** This
document's section headings carry row counts for §2's sub-tables only, each of which is derived
in place from V10–V15.

### 8.3 A figure that outlives its object

"979 lines" was the census's size at `61ff4fc`, before three correction passes. It is **1,091**
now:

```
awk 'END{print NR}' docs/shared/SESSION346-REGISTER-CENSUS.md   → 1091
```

The 979 has been carried forward since as though it were the document's size.

```
command grep -rn '979' docs/shared/SESSION346-REGISTER-CENSUS.md BANKED.md STATUS.md CLAUDE.md
(no output)
```

**The stale figure never entered any register.** It circulated in session prose alone. No
mechanical gate over the document set could ever have caught it, because there was nothing in the
document set to catch.

### 8.4 What follows for part three

Part one's proposed gate — *every integer in the body appears in §0 with its rule, or is derived
in place* — is necessary and not sufficient. Against the three instances above:

| instance | caught by part one's gate? | what it needs instead |
|---|---|---|
| 8.1 measured then moved | **no** — the figure is internally consistent | a measured-at ref per figure |
| 8.2 stale heading | **no** as written — a heading figure has no §0 entry to match | the gate must sweep headings too, or counts must not appear in headings |
| 8.3 979 in prose only | **no** — the figure is not in any file the gate can read | nothing mechanical; a figure quoted outside the document that owns it is ungated by construction |

**Three design inputs for part three:**

1. **A census figure needs a rule, a command and a ref.** Two of three is what went stale.
2. **A figure that lives only in prose cannot be gated.** The remedy is not a better gate; it is
   that a figure worth repeating must live in a file, and the prose must cite the file rather
   than the number.
3. **The cheapest working mechanism in this repo is not a gate at all — it is redundancy across
   surfaces edited in one pass.** V1X's heading + At-a-glance + index gets landed-but-unmarked
   from METHODOLOGY-MAP's 90% down to 25% (§5.4), with no tooling. But §6.4 shows how it fails:
   silently, at the index, as the document grows, because **nothing checks that every item has an
   index row.** That check is one line of shell and it is a smaller job than the gate.

**The registers already contain their own fix.** V1X:1206 carries the repair for its own 19 dead
ROADMAP citations. V1X:1182 carries the landing §2.3 is missing. V1X:125 carries the landing
§2.4's heading is missing. In all three cases the correct fact is in the document, attached to
the wrong place.

---

## §9 — Expectations

**1. Both mirrors have diverged, and at least one by adding — HELD, and sharper than predicted.**
Mirror 1 diverged by adding on **6 of 6 rows** and by nothing else: the item set is exact. Mirror
2 could not be diffed by its own pointers at all — all eight are in a dead scheme and seven name
topics STATUS no longer holds. **Zero divergence was found in exactly one place, §5.4, and it is
the only pointer pair in either mirror with a live namespace on both ends.** That is the useful
half: a manual sync instruction *can* work, and what it needs is a pointer that survives, not more
discipline.

**2. V1X's landed-but-unmarked fraction is worse than METHODOLOGY-MAP's 51% — INVERTED.** V1X:
2 of 8 discharged unmarked (**25%**). METHODOLOGY-MAP: 19 of 21 landings unmarked (**90%**).
Why, stated because the dispatch asked: V1X marks a discharge in three surfaces edited in one
pass — heading, At-a-glance table, index. METHODOLOGY-MAP has no index and records landings only
in an append-only revision history. **The thing METHODOLOGY-MAP is missing is an index edited in
the same pass as the item.** And §6.4 shows the mechanism's failure mode, which is the other half
of the answer: it decays silently at the index, and both of V1X's two failures are instances of
that decay rather than of authoring carelessness.

**3. The ROADMAP citations are unrepairable — INVERTED.** All 19 resolve. `ad270a8:docs/shared/
ROADMAP.md` is a 311-line blob and V1X supplies that ref itself at `:1206`. **Scheme D is an
archived-file problem, not a rename — nothing was renamed; the file was deleted and its
citations were never rewritten. P79 does not shrink: all 19 pointers stay broken for a reader
who does not hold the ref, and 18 of the 19 do not carry it. What changes is the remediation
cost — mechanical substitution rather than reconstruction.** Against that, a
fifth pointer class the census never counted — 22 file pointers, of which 3 are dead and 6
resolve only via gitignored files — is newly open.

**4. The four part-one figures match the expected column exactly — HELD.** 39, 215, 108, 41 →
**403**. The S346 close is the whole of the drift.

**5. Nothing under `src/` changes — HELD.** Zero lines.

**A sixth result the dispatch did not predict.** The Purpose line's broken source is **STATUS**,
not ROADMAP (§6.3). The retired file is recoverable; the live, actively-maintained register is
the one V1X can no longer reach, because the scheme it cites through died while the file it names
kept going. **A pointer into a live file through a dead namespace is worse than a pointer into a
retired file with a working ref** — and part three is a design question about namespaces before
it is one about files.

---

## §10 — The number sweep

Every integer in this document's prose and tables, checked against §0. Figures appearing only
inside a quoted `file:line`, a commit hash, a section number, a percentage derived in place, or
part one's own quoted text are excluded and listed at the foot.

| figure | appears as | §0 entry or in-place derivation | verdict |
|---|---|---|---|
| 39, 4, 1, 34 | STATUS parked rows / closed / unknown / open | M1–M4 | ✓ |
| 197, 215, 18, 615 | BANKED bullets / census rows / prose / lines | M5, M6, M8, M7, M9 | ✓ |
| 108, 159 | CLAUDE.md Active Conventions | M10 | ✓ |
| 41 | METHODOLOGY-MAP items | M11 | ✓ |
| 403 | part-one total | M12 = M1+M8+M10+M11 | ✓ |
| 1,228 · 135 · 139 · 9 · 35 · 28 · 9 · 80 · 4 | V1X structure | V1–V9 | ✓ |
| 6 · 35 · 24 · 7 · 1 · 77 | the counting rule's components and total | V10–V16 | ✓ |
| 73 · 53 · 49 | rule variants | V17–V19 | ✓ |
| 480 | five-register total | M12 + V16, derived at §7.1 | ✓ |
| 37 · 200 · 386 | part one's figures as it published them | quoted from part one §9; superseded by M1/M8/M12 | ✓ |
| 41 / 38 / 37 | part one's three METHODOLOGY-MAP variants | quoted at 0.4 from part one §0.4, as the precedent for V16–V19 | ✓ |
| 12 · 16 · 4 | marker lines / occurrences / headings | §5.1, three commands shown | ✓ |
| 6 | distinct landings | §5.2, enumerated in the table | ✓ |
| 39 · 8 · 2 · 21% · 25% | work subsections / discharged / unmarked | §5.4; 39 = V11+V12; 8 and 2 enumerated | ✓ |
| 21 · 51% · 19 · 90% | METHODOLOGY-MAP's comparison figures | quoted from part one §6.1 | ✓ |
| 19 · 18 · 311 | ROADMAP citations / lines carrying them / blob lines | §6.1, all three commands shown | ✓ |
| 8 · 7 | scheme-B citations / orphaned topics | §4.4, enumerated | ✓ |
| 37 · 2 | P-numbers absent / present in V1X | §4.3, grep output shown | ✓ |
| 21 · 22 · 11 · 6 · 1 · 1 · 3 | `.md` names · total pointers · tracked · gitignored-on-disk · git-history-only · deliverable · dead | §6.2, command shown, all classes enumerated | ✓ |
| 19 · 24 · 5 · 2 | §6 index rows saying "This doc" / total / outward / dead-scheme | §2.6, command shown | ✓ |
| 30 · 39% · 10 | V1X's pointer rows / share of 77 / defective | §7.4; 30 = 24+6, 39% = 30/77, 10 = 3+1+6 | ✓ |
| 346 | lines from §5's heading to its sync instruction | §4.1; `1177 − 831` | ✓ |
| 7 | BANKED rows pointing into V1X | §7.4, command shown, all seven listed | ✓ |
| 6 | §2 subsections absent from the index | §6.4, enumerated | ✓ |
| 27 · 28 · 29 | battery sizes carried by V1X | §3.3, all six sites listed; 29 is correct per 0.7 | ✓ |
| 30 · 29 | `src/tests/` files · battery | 0.7 | ✓ |
| 37 · 7 · 9 · 24 | kind distribution | §7.2, sums to 77 | ✓ |
| 5 · 2 · 1 · 35 · 34 · 0 | state distribution | §7.3, sums to 77 | ✓ |
| 30 · 9 · 39% | pointer rows / broken / share of 77 | §7.4; 30 = 24+6, 9 = 8+1, 39% = 30/77 | ✓ |
| 979 · 1,091 | the census's stale and live line counts | §8.3, both commands shown | ✓ |
| 42 | part one's collided pair | 0.5, quoted from part one §0.5 | ✓ |
| 259 · 80 | line distances inside METHODOLOGY-MAP | quoted from part one §5.1, §5.2 | ✓ |
| **119** | **scheme citations, part one's total** | **quoted from part one §6.2; not re-measured here** | **⚠ carried, not verified** |
| **182 · 154 · 144** | **part one's machine-parsed row count; this census's judged cells; part one's unsettled rows** | 0.6, §1 — 154 = 77 kind + 77 state, derived in place; 182 and 144 quoted from part one | ✓ (182, 144 carried) |
| **+2 · +15** | **the S346 close's movement** | §7.1; 39−37 and 215−200 | ✓ |

**One figure carried without re-measurement: 119** (part one's total scheme citations, §6.2).
This document reports that scheme D's 19 of that 119 are cheaper to remediate; **it does not
subtract them, and the 119 is unchanged by anything measured here.** It did not re-count the
other 100. The 119 is part one's measurement, cited as part one's.

**Excluded from the sweep**, as noted above: line references (`:44`, `:1206`, …), commit hashes,
section numbers (§2.9b, 4.2.1, …), version and session tags (S95, S315, v1.0, v1.x, 4.2), the
`.gitignore` line numbers, `P` numbers, the archived ROADMAP's own item and track numbers, and
figures inside quoted text from V1X, STATUS or part one.

**Corrected during the sweep**, recorded so the correction is not invisible:

- An earlier draft gave the work-subsection denominator as **40**. It is **39** — `35 − 1 + 5`,
  and the arithmetic slip was carrying §4.2 as both a parent and its five children. The
  unmarked fraction moves from 20% to **25%**; the direction of the inversion is unchanged.
- An earlier draft reported **8** dead file pointers, then **5**. Three (`archive/CLEARED-BODY-
  AUDIT.md`, `archive/TEST-INTEGRITY-AUDIT.md`, `archive/SESSION300-BLOCKCOPY-MEASURE.md`) are on
  disk and gitignored, and two more (`SESSION292-CHAT-SUMMARY.md`, `SESSION311-SPAN-SKIP-READ.md`)
  are on disk at `docs/sessions/`. **The dead count is 3**, and both corrections came from
  checking the filesystem after `git ls-files` — the same trap this dispatch names in its own
  preamble, sprung twice inside the section that reports it.
- An earlier draft counted `docs/shared/VARIANCE-ESTIMATORS.md` as a dead pointer. It is a
  **proposed deliverable** (§3.1's own output), correctly unbuilt, and is not a pointer at all.
- An earlier draft gave the file-pointer total as **18**. Measured, it is **21** `.md` names plus
  one extension-less pointer = **22**. The 18 was counted by eye off a `sort -u` list; the 21 is
  `command grep -oE … | xargs -n1 basename | sort -u | wc -l`. **A list read by eye is not a
  count**, which is the same lesson part one recorded when a three-element set was
  mis-transcribed twice.
- An earlier draft tallied §6's source-of-truth column as **17** `This doc` rows. Measured with
  `awk -F'|' | sort | uniq -c`, it is **19**.
- An earlier draft said **6** BANKED rows point into V1X. It is **7** (`:399`, `:401`, `:417`,
  `:492`, `:494`, `:496`, `:498`).
- An earlier draft said §5's sync instruction sits **340** lines below it. It is **346**
  (`:1177 − :831`).

---

## §11 — Verification

**`git status --porcelain -- src/`** → zero lines, actual output empty.
**Batch: N/A.** Nothing under `src/` is touched.

The counting rule and the figure it produces:

```bash
# V1X census rows = 77, under the rule at §0.3
command grep -c '^### ' docs/shared/V1X-FUTURE-WORK.md                  # 35  (V11)
command grep -c '^#### ' docs/shared/V1X-FUTURE-WORK.md                 # 28  (V6; 5 of them are §4.2's)
command sed -n '23,39p'   docs/shared/V1X-FUTURE-WORK.md | command grep -c '^| '   # 7 = 1 header + 6 rows  (V10)
command sed -n '1175,1209p' docs/shared/V1X-FUTURE-WORK.md | command grep -c '^| ' # 25 = 1 header + 24 rows (V13)
command sed -n '1210,1223p' docs/shared/V1X-FUTURE-WORK.md | command grep -c '^- ' # 7   (V14)
command sed -n '1224,1228p' docs/shared/V1X-FUTURE-WORK.md | command grep -c '^- ' # 1   (V15)
# 6 + 35 − 1 + 5 + 24 + 7 + 1 = 77
```

The four part-one figures re-measured, against the expected column:

```bash
command grep -cE '^\| \*{0,2}P[0-9]+' STATUS.md                          # 39   expected 39  ✓
command grep -nE '^\| \*{0,2}P[0-9]+.*closed' STATUS.md                  #  4   expected  4  ✓  P50 P55 P59 P74
command grep -nE '^\| \*{0,2}P[0-9]+.*\| unknown \|' STATUS.md           #  1   expected  1  ✓  P46
command grep -c '^- '   BANKED.md                                        # 197  expected 197 ✓
command grep -c '^ *- ' BANKED.md                                        # 215  (any-indent — NOT the census rule)
awk 'END{print NR}' BANKED.md                                            # 615  expected 615 ✓
command sed -n '98,259p' CLAUDE.md | command grep -c '^- '               # 108  expected 108 ✓
# METHODOLOGY-MAP: file byte-identical since 793c1c9 (pre-census) → 41 stands
git log --oneline -1 -- docs/shared/METHODOLOGY-MAP.md                   # 793c1c9  (S230)
git log --oneline -1 -- docs/shared/V1X-FUTURE-WORK.md                   # 27ce2fd  (S343)
# 39 + 215 + 108 + 41 = 403   expected 403  ✓
```

The two mirror diffs, both directions: §3 and §4. Mirror 1 — item set exact both ways, six of six
texts diverged, every one by addition in the mirror. Mirror 2 — 7 topics in the mirror with no
source, 37 of 39 P-numbers in the source with no mirror, 1 pair agreeing (§5.4).

The landed-marker confirmation with session tags: §5.2. 12 lines / 16 occurrences / 6 distinct
landings, tagged S315, S316, S320–S321, S317, S308–S309, S336; twelve cited commits, all
resolving.

The scheme D enumeration: §6.1, all 19 with line and target.

```bash
git ls-files | command grep -ci roadmap                                  # 0
command grep -oE 'ROADMAP' docs/shared/V1X-FUTURE-WORK.md | wc -l        # 19
git cat-file -t ad270a8:docs/shared/ROADMAP.md                           # blob
git show ad270a8:docs/shared/ROADMAP.md | wc -l                          # 311
```

The census document's own line count and its §2 / §3 heading figures:

```bash
awk 'END{print NR}' docs/shared/SESSION346-REGISTER-CENSUS.md            # 1091, not 979
command grep -n '^## §2\|^## §3 ' docs/shared/SESSION346-REGISTER-CENSUS.md
#  138:## §2 — STATUS.md — the parked register (37 rows)
#  204:## §3 — BANKED.md (200 rows)
```

Both heading figures are stale (39 and 215 now). **Reported, not amended.**

The number sweep: §10.

The combined reconciliation: §7.1. **403 + 77 = 480 across five registers.**

**Nothing renders.** No preview, no screenshot.

---

## §12 — Amendment record

Four amendments applied at S347, after the document merged at `a252c43`. Each corrected a claim
that contradicted this document's own body. The precedent is §10, which records the seven
corrections the number sweep caught rather than applying them silently; the same rule applies to
corrections found after publication.

| # | site | said | says now | why |
|---|---|---|---|---|
| A1 | `§4.3` heading | *"Which of STATUS's 39 P-numbers does §5 know about? None."* | *"Two, and both sit outside the mirror."* | The body four lines down names P45 (`V1X:1148`) and P43 (`V1X:1166`) and places both in §5.9. §5.9 is part of §5. The body was right and the heading was false against it. |
| A2 | `§6.1` conclusion and `§9` expectation 3 | *"Scheme D is a rename problem"* · *"P79 loses 19 of its 119 citations"* | *"an archived-file problem, not a rename"* · *"P79 does not shrink … what changes is the remediation cost"* | Two errors. Nothing was renamed — ROADMAP.md was deleted and its citations were never rewritten. And P79 does not shrink: all 19 pointers stay broken for any reader who does not hold the ref, and 18 of the 19 do not carry it. Only the remediation cost changes. |
| A2b | `§10` carried-figure note | *"scheme D's 19 of that 119 are repairable"* | *"cheaper to remediate; it does not subtract them, and the 119 is unchanged"* | §10 flagged 119 as carried and not verified; §9 then spent 19 of it. Closing the loop at both ends. |
| A3 | `§5.4` comparison table | header `items`; no rule against either denominator | header `items (denominator rule)`; each rule named inline; a paragraph added giving V1X's 10% over all 77 rows | 41 and 39 are built by different rules. Neither figure changed and no row was deleted — the labelling was added and the like-for-like column named. |
| A4 | `## Provenance` | *"the three corrections it caught"* | *"the seven corrections it caught"* | Not in the amendment brief. §10 lists seven; the Provenance line said three. Same class as A1 — a summary line contradicting the body it summarises — found while checking A4's own precedent, and corrected rather than left standing in a document about counts with no freshness gate. |

**A1 is §8.2 happening inside the document that reports §8.2.** §8.2 says a count belongs in §0
and not in a heading, because a heading is the first thing a reader sees and the last thing an
author re-reads. §4.3's heading was wrong in exactly that way — stale against a body four lines
below it, in the section that names the failure mode. **A4 is the same shape a second time**, in
the Provenance block. Recording both here rather than fixing them quietly is the point: this is
the strongest instance the arc has produced, and a silent fix would have destroyed the evidence.

**What was not changed.** No figure in §5.4 was altered and no row deleted. §10's sweep table
still marks 119 as carried and not verified. `SESSION346-REGISTER-CENSUS.md`'s two stale headings
are still not amended — they belong to part one and are reported at §8.2, not repaired.

---

## Provenance

Read-only census, S347, measured at `cb672a0`. **Amended at S347 after publication — see
§12.** No register was edited, including
`SESSION346-REGISTER-CENSUS.md`'s two stale headings. No fix was applied. No item was merged,
deduplicated or reprioritised. Every figure carries its rule and its command at §0; figures that
are judgment rather than measurement are segregated at §0.6; the number sweep is at §10, and the
seven corrections it caught are recorded there rather than silently applied.

**Part three is not scoped here.** That design call is Chat's, and §8.4 and §9 are its inputs.
