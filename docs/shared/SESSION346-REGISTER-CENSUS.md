# S346 — Register census, P76 part one

**Read-only census of the four smaller future-work registers — `STATUS.md`, `BANKED.md`,
`CLAUDE.md` and `docs/shared/METHODOLOGY-MAP.md`.** Part one of two; V1X is part two (§13).
One row per item, no merging, no deduplication, no reprioritisation. Every figure carries
its counting rule and the command that produced it (§0).

**Batch: N/A.** Nothing under `src/` is touched.

```
$ git status --porcelain -- src/
(zero lines)
```

---

## §0 — Every number this document uses

Each row names the figure, what it counts, and the command that produced it. Where two
registers are counted by different rules they are in different rows, never one column.

### 0.1 Register sizes

| # | Figure | What it counts | Command | Note |
|---|---|---|---|---|
| N1 | **37** | rows in STATUS's parked-item table whose first cell is a P-number | `command grep -cE '^\| \*{0,2}P[0-9]+' STATUS.md` | P41–P77 contiguous; 37 distinct |
| N2 | **4** | of N1 whose state cell says `closed` | `command grep -nE '^\| \*{0,2}P[0-9]+.*closed' STATUS.md` | P50, P55, P59, P74 |
| N3 | **1** | of N1 whose state cell is `unknown` | `command grep -nE '^\| \*{0,2}P[0-9]+.*\| unknown \|' STATUS.md` | P46 |
| N4 | **32** | of N1 open | N1 − N2 − N3 | P67 counts open (part one landed, 16 sites remain) |
| N5 | **182** | BANKED top-level bullets | `command grep -c '^- ' BANKED.md` | 200 at any indent |
| N6 | **18** | BANKED items carried as prose, no bullet | enumerated in §3.9 | judged, not grep-derived — see 0.4 |
| N7 | **200** | BANKED census rows | N5 + N6 | |
| N8 | **108** | CLAUDE.md top-level bullets in `## Active Conventions` (`:98`–`:258`) | `command sed -n '98,259p' CLAUDE.md \| command grep -c '^- '` | 159 at any indent |
| N9 | **149** | CLAUDE.md top-level bullets, whole file | `command grep -c '^- ' CLAUDE.md` | not a register figure; recorded so it is not confused with N8 |
| N10 | **41** | METHODOLOGY-MAP future-work items under the rule in 0.3 | enumerated in §5 | no single grep produces it |
| N11 | **44** | METHODOLOGY-MAP bullets at any indent, whole file | `command grep -c '^ *- ' docs/shared/METHODOLOGY-MAP.md` | **not** an item count — 41 of the 44 sit outside the future-work sections |
| N12 | **386** | part-1 census rows | N1 + N7 + N8 + N10 | reconciled in §9 |

### 0.2 Figures measured but reserved for part two

| # | Figure | What it counts | Command |
|---|---|---|---|
| N13 | **1,228** | lines in V1X | `awk 'END{print NR}' docs/shared/V1X-FUTURE-WORK.md` |
| N14 | **135** | V1X top-level bullets | `command grep -c '^- ' docs/shared/V1X-FUTURE-WORK.md` |
| N15 | **139** | V1X bullets at any indent | `command grep -c '^ *- ' docs/shared/V1X-FUTURE-WORK.md` |

### 0.3 The counting rules, stated

Four registers, three different rules, because the registers have three different shapes.
They are **not** summed into one column without this statement.

- **STATUS** — one row per table row in `## Parked items — the register`. The table is the
  register; the rule is the table.
- **BANKED** — one row per top-level `- ` bullet, **plus** one row per bolded or numbered
  lead paragraph that stands outside any bullet and carries a finding or work owed. The
  bullet-only rule (N5 = 182) under-counts BANKED by 18 because five sections carry their
  items as prose. Nested bullets are not rows; they elaborate a parent.
- **CLAUDE.md** — one row per top-level `- ` bullet inside `## Active Conventions`. The
  other eleven `##` sections are architecture reference, not a register.
- **METHODOLOGY-MAP** — no bullet rule works. **My rule:** an item is a unit of work that
  carries its own leading marker — a row in a future-work table, a numbered entry, a
  lettered sub-entry under a numbered entry that is separately dischargeable, a `###`
  subsection under Planned tests, or a bolded Track. Track A is counted as its five
  numbered sub-items and not additionally as a parent. This gives 41.
  The circulating "~27 items" is not reproducible by any grep and is not used here.

### 0.4 Figures that are judgment, not measurement

Named separately so they are never cited as measured.

- **N6 = 18** (BANKED prose-only items). Enumerated by line in §3.9 so it can be checked.
- **N10 = 41** depends on the rule in 0.3. Under a rule that counts Track A as one item
  rather than five it is 37; under a rule that counts §Tolerable inconsistencies as
  carrying no items it is 38. The three variants are stated rather than one being asserted.
- Every `state` cell marked **unknown** is a refusal to guess, not an omission.
- **N16 = 119** — dead-scheme citations (§6.2), counted as **occurrences** and de-overlapped:
  a `STATUS parked #N` citation also matches the bare-`#N` pattern, so scheme C is measured
  net of scheme B. Three judgments inside it: `BANKED:559` is excluded from scheme A because
  it *quotes* the dead scheme inside the entry reporting it; CLAUDE.md contributes 0 to
  scheme C because its seven bare `#N` are two scheme-B citations, three colour hexes and two
  references to the live locked-A2 fix list; and METHODOLOGY-MAP's 29 sit almost entirely in
  its append-only revision history, counted because a reader can still follow them.
- **N17 = 179 / 42 / 137** — task rows; task rows whose state is landed, superseded or void;
  the difference. **137 is a ceiling on the open queue, not a count of it** — it counts task
  rows *not marked* discharged, and landed-not-marked is one of the four failure classes this
  document identifies. It is a property of the registers, not of the world.
- The **18 prose-row kind and state assignments** (§3.9) are judged, not parsed. The 182
  tabulated rows were machine-parsed from the state and kind columns; the 18 prose rows were
  assigned by hand and are listed individually so they can be checked.

### 0.5 The retired figure

**"Roughly 365 future-work bullets across four files"** has circulated since S345 and is
retired here. It cannot be reconstructed from any combination of the measurements above, it
says four files while naming five registers, and its source (`BANKED.md:559`) mis-states
three of the five inputs. Part-1 alone is **386** rows (N12) across four registers, with
V1X's 135 top-level bullets still to come.

**"Roughly 142 genuinely-open tasks"** is retired too, and it was this document's own. It
subtracted a rounded "~40" from 184 when the all-kind discharged count was 54, so it crossed
kinds — eight of BANKED's landed rows are decision records, one is a void decision record, and
three superseded rows are findings. **The 42 at §9 is a different quantity that only looks
like the same number**: it counts task rows alone (4 + 13 + 4 + 21), so `179 − 42` stays
inside one kind. Corrected at §9: 179 task rows, 42 marked discharged, **137 not marked discharged**,
and 137 is a ceiling rather than a count. The census cannot size the open queue without a
second pass that settles BANKED's 88 unsettled task rows at source.

### 0.6 Source-of-truth figures used as landing evidence

| Figure | Value | Command |
|---|---|---|
| files in `src/tests/` | 30 | `ls src/tests/*.js \| wc -l` |
| `MiniCard_*.jsx` files | 28 | `ls src/components/cards/MiniCard_*.jsx \| wc -l` |
| `MINIPLOT_REGISTRY` entries | 29 | `command grep -cE '^\s*"[^"]+":\s*MiniCard' src/components/cards/MiniPlot.jsx` |
| `FINDING_COMPOSERS` entries | 29 | `command grep -cE '^\s*"[^"]+":' src/analysis/findingComposers.js` |
| `TEST_MECHANISM` entries | 29 | `sed -n '/export const TEST_MECHANISM/,/^};/p' … \| grep -cE '^\s*"'` |
| `FISHER_EXEMPT` entries | 7 | `command grep -n -A 20 'FISHER_EXEMPT' src/analysis/aggregation.js` |
| `.js`/`.jsx` files under `src/` | 163 | `find src -name '*.js' -o -name '*.jsx' \| wc -l` |
| plot components in `src/components/plots/` | 17 `.jsx` + 1 `.js` | `ls src/components/plots/` |

---

## §1 — Method

Read-only. No register was edited. `command grep` with explicit paths throughout, because
the shell `grep` carries `--ignore-files` and `BANKED.md`, `STATUS.md`, `CLAUDE.md` and
`project-instructions.md` are all gitignored — a recursive grep skips every one of them
silently.

**Evidence standard.** `landed` is written only where a commit, a shipped file or a `src/`
symbol can be pointed at. Everything else is `open` (where the register says so itself) or
`unknown`. 25 BANKED rows and 21 METHODOLOGY-MAP rows carry evidenced landings; the rest of
BANKED is `open`/`unknown` because settling the remaining 144 at source is a second dispatch, not
this one. That is stated rather than papered over.

---

## §2 — STATUS.md — the parked register (37 rows)

`STATUS.md:100`–`:138`. **This list allocates P-numbers. Nothing else does.**

| P | item (verbatim cell) | kind | state, evidenced | duplicate-of |
|---|---|---|---|---|
| P41 | Fisher combination | task | open | — |
| P42 | LOESS | task | open | BANKED:91 (LOESS detail admission, same card) |
| P43 | detection margin | task | open | V1X (P43 cited) |
| P44 | order-invariant nulls | task | open | — |
| P45 | gate fallback | task | open | V1X (P45 cited) |
| P46 | never allocated or lost — do not reuse without checking | unknown | **unknown** — the register's own answer | — |
| P47 | count choice per test | task | open | BANKED:553 (P73 is a sub-case) |
| P48 | DS12b batch disposition | task | open, carried by P61 | BANKED:516 |
| P49 | convergence-rule basis | task | open | — |
| P50 | — | task | **closed** at `280508d` | BANKED:510 (cited as history) |
| P51 | empirical Monte Carlo uncertainty | task | open | — |
| P52 | condition-card display split | task | open | STATUS known bug 6 (same file) |
| P53 | Excess Kurtosis pooling | task | open | STATUS known bug 7 (same file) |
| P54 | kurtosis ceiling | task | open | — |
| P55 | — | task | **closed** at `659a6d7` | — |
| P56 | `promote.sh` `git add -A` | finding | open, verified safe from a worktree | STATUS known bug 11; CLAUDE.md:126 |
| P57 | Grok cross-validation | task | open | STATUS Cross-validation §  |
| P58 | doubling replacement | task | open | BANKED:549 (P71 is the instance) |
| P59 | — | task | **closed** at `95a2808` | **BANKED:512 still carries it as a live finding** |
| P60 | Baseline Balance | task | open, cross-validation candidate | BANKED:514; STATUS known bug 3 |
| P61 | DS12b adjudication | task | open, carries P48 and DS08 | BANKED:516; STATUS known bug 4 |
| P62 | `esGateMode` | task | open | BANKED:518; STATUS known bug 8 |
| P63 | `(ack)` mislabel | task | open | BANKED:520; STATUS known bug 9 |
| P64 | `FIXTURES` coverage hole | task | open | BANKED:522 |
| P65 | held-out corpus and power curves | task | open, design-first | BANKED:524; STATUS next priority 2 |
| P66 | multiplicity structure at large `m` | task | open, v1.0 blocker | BANKED:530; STATUS known bug 2; STATUS Cross-validation § |
| P67 | per-site floor assertions | task | **part one landed `29fb543`** — 7 of 23 + `bhFDR`; 16 open | BANKED:532, :565; STATUS accepted limitation 3; STATUS next priority 3 |
| P68 | `ALPHA.FLAG` provenance | task | open, P65 design input | BANKED:534 |
| P69 | one-cell-neighbour rate | task | open | BANKED:536; STATUS known bug 2 |
| P70 | doc residues | task | open, grown at S345 | BANKED:538, :569, :583; STATUS next priority 4 |
| P71 | CCC locked to LOW above 10,000 rows | task | open, v1.0 blocker | BANKED:549; STATUS known bug 1; STATUS v1.0 blockers |
| P72 | per-stage BH arithmetic | finding | open, arithmetic case void, not re-derived | BANKED:551 |
| P73 | two counts one draw short of a tier | task | open | BANKED:553; STATUS accepted limitation 5 |
| P74 | three `src/` comments carrying retired arithmetic | task | **closed** at `9bca7bf`; doc half → P70 | BANKED:583 |
| P75 | vitest collects from `.claude/worktrees/` | task | open, build config | BANKED:561; STATUS known bug 10 |
| P76 | five registers, no reconciliation | task | open, **lead** | BANKED:559; STATUS next priority 1; this document |
| P77 | Kurtosis early-exit denominator divergence | task | open, latent | BANKED:563; STATUS known bug 5; STATUS pending verification |

**Rows: 37.** Open 32, closed 4, unknown 1.

**Finding (S2-a).** 24 of the 37 P-numbers are duplicated by a BANKED entry that states the
same item at length. The STATUS row is the allocation; the BANKED entry is the case
material. That is the declared division of labour (`STATUS.md:97`) and is working as
designed — with one exception:

**Finding (S2-b).** **P59 is closed in STATUS and still live in BANKED.**
`STATUS.md:120` reads `closed at 95a2808`. `BANKED.md:512` still opens
`**(S342, P59) 09-proteomics-clean reaches severity 1 at three seeds in eight, today, with
no counterfactual.** … v1.0 blocker either way.` Two sections later `BANKED.md:528` records
the closure and names P69 as the replacement — so BANKED contains both the open claim and
its own retraction, 16 lines apart, with the open claim first.

**Finding (S2-c).** STATUS's own §Known bugs restates all 11 of its numbered bugs as parked items already in the parked
table (bugs 1–5, 6–10 map to P71, P66/P69, P60, P61, P77, P52, P53, P62, P63, P75). This is
intra-register duplication inside the register that declares itself the allocator. It is
navigational rather than harmful — but it means "how many open items does STATUS hold" has
two defensible answers (32, or 32 counting the bug list as pointers) and neither is stated.

---

## §3 — BANKED.md (200 rows)

40 `##` sections. Rows below are grouped by section; the count after each heading is
top-level bullets in that section, from
`awk '/^## /{…} /^- /{n++}' BANKED.md`.

### 3.1 Card IA, table standardisation, single-verdict, test-card cluster (20 rows)

| line | item (opening, verbatim) | kind | state | dup-of |
|---|---|---|---|---|
| 9 | Card elements do one of three jobs — ORIENT / VERDICT / EXPOUND (S198). | decision record | recorded; lives in INVESTIGATION-DISPLAY-SPEC | IDS §Card IA map |
| 15 | Finding-vs-significance (render-gated). | task | open | — |
| 16 | Promotion signalling (render-gated). | task | open | — |
| 17 | Mahalanobis display raw-vs-adjusted p (render+methodology). | task | open | BANKED:19, :358 |
| 18 | Footer composition — Windowed Autocorr + Blocked Mahalanobis (design). | task | open | — |
| 19 | Runs per-pair-p keep/drop — partially resolved S230. | task | open (residual) | BANKED:17 |
| 20 | ColumnGoF plot-axis `valueAxisLabel="A² ratio"` (S217). | task | open | — |
| 21 | S229 walk residuals (CI-independent). | task | open | BANKED:99, :150, :204 |
| 22 | ColumnGoF/Entropy Direction-column order — sibling-pair convention call (S273). | task | open | BANKED:21 (10a) |
| 23 | Details cap precedes the signal-sort — sort-before-cap when addressed (S244). | task | open | — |
| 24 | Seven MIXED footers — lead-with-count consistency (S274). | task | open, low | BANKED:270 |
| 32 | Group 1 — genuine parallel verdict. | finding | open (live-exposure portion closed S279) | BANKED:44 |
| 38 | Group 2 — second field wired into the flag. | finding | recorded, safe by construction | — |
| 40 | Group 3 — no second categorical field. | finding | recorded | — |
| 42 | Incidental — `constantOffset.severityClass` is a dead parallel verdict. | task | open | — |
| 50 | Duplicated Data redesign — **DONE S274** (`6e2e755`). | task | **landed** `6e2e755` | — |
| 52 | CrossCond two-table split (S273) — designed, ONE blocker remaining. | task | open | BANKED:58 |
| 58 | EvidenceTable fixed-layout add — **DONE** (S275 `92eec5f`/`c3d3d01`). | task | **landed** `92eec5f` | BANKED:52 |
| 60 | #32 — Duplicated Data dead-code tidy (S274). | task | open | — |
| 62 | #33 — Duplicated Data LOW-card within-row prominence (S274). | task | open | BANKED:246 |

Plus prose row **:44** — *Governing rule to write off 25a's verified fix shape* (decision
record, recorded, → IDS parallel-verdict subsection).

### 3.2 CI programme, RETIRED S237 (13 rows) — **specific check 3**

| line | item (opening, verbatim) | kind | state, evidenced | dup-of |
|---|---|---|---|---|
| 68 | The per-card object audit (S290) — the classification S237 skipped. | finding | open (KEEP 12 / REBUILD 2 / RESTORE 1 / DEFER 4; 2 builds landed) | `S290-PER-UNIT-OBJECT-AUDIT.md` |
| 74 | The per-unit display programme (supersedes the CI band programme). | task | open (Stage 1 landed S283; remainder Family B + latent) | `TIER-A-CI-DRAW-SPEC.md` §6/§7; BANKED:449 |
| 75 | The two CI-band defects are resolved — Autocorrelation forest **DONE S283**, Runs band correct since S240. | task | **landed** (S283; Runs `b92d6c1` S240) | BANKED:81 |
| 76 | Programme-wide CI level mismatch / Noise Scaling re-level (S237). | task | open | — |
| 77 | Kurtosis per-condition forest (the principled Kurtosis visual, NOT a band). | task | open, fixture-gated | BANKED:208 (#49 class) |
| 78 | Row-Mean Runs `primaryP` divergence — **RESOLVED S285** (`51b7ca5`). | task | **landed** `51b7ca5` | — |
| 79 | Row-Mean Runs windowed-arm surface — **BUILT S290** (`3b502d9`), LATENT. | task | **landed** `3b502d9`, latent | BANKED:68 |
| 80 | VFS surface residuals (S235 read-only) — **DONE S282**. | task | **landed** `ef2d773` | BANKED:204 (#39 remainder) |
| 81 | Autocorrelation per-pair retention — the third retention case (S283). | task | **landed** `9764c7f` + `be4d6ad`; one watch-item carried | BANKED:75 |
| 82 | IRC forest-gate audit + window-table fix (S289); heatmap restore **LANDED S290** (`9e17b6a`). | task | **landed** `7835f15`, `9e17b6a` | BANKED:68, :85 |
| 83 | Forest suppression on the Fisher-combined column-grouped path. | decision record | resolved for the forest; broader question open | TIER-A spec §4/§7 |
| 87 | Stale rationale clause — comment rewrite on next touch (S231). | task | open | — |
| 88 | Dispatch-vs-implementation shape: "render like [prior consumer]" (S286). | decision record | recorded | CLAUDE.md:157 |

Plus 8 nested bullets (`:69`–`:73`, `:84`–`:86`), not counted as rows.

> **Answer to check 3 — are they retired?** No. The heading retires the **CI band
> programme**; the section's own body (`:66`) says *"The live remainder lifts to the entries
> below."* Of the 13: **6 carry an explicit landed marker with a commit hash** (75, 78, 79,
> 80, 81, 82), 2 are findings/decision records (83, 88), 1 is a live classification
> reference (68), and 4 are open work (74, 76, 77, 87). So the section is a mixture of
> completed work retained for the record and a live remainder, sitting under a heading whose
> first word is RETIRED. A reader scanning headings would skip 4 open items; a reader
> scanning bullets would re-derive 6 landed ones. **The heading is the defect, not the
> content.**

### 3.3 Display/copy, surface residuals, axis labels, export (13 rows)

| line | item | kind | state | dup-of |
|---|---|---|---|---|
| 91 | LOESS region-comparison detail admitted at `cusumP < 0.05`. | task | open | STATUS P42; BANKED:246 |
| 97 | Verdict-line register pass (R1) — **DONE S279**. | task | **landed** `f2f9ee8`/`3d2913b` | — |
| 98 | Disclosure-copy pass (R3) — CI-independent. | task | open | BANKED:367 |
| 99 | Legend standardisation + plot-colour consistency (R4 + R5). | task | open | BANKED:156, :157, :177 |
| 100 | Plot-sizing / wrapper-hug (Arc A unit 1) — **DONE S264**. | task | **landed** `4aa32e1` | — |
| 149 | Plot-design specifics. | task | open | BANKED:99 |
| 150 | Section-heading / demoted-secondary resolution (S211 open item). | task | open | BANKED:233 |
| 156 | RegionalNoiseStrip `yAxisTitle` wired but never passed. | task | open, eyes-on gated | BANKED:99 |
| 157 | CarlisleBalance + WithinRowVariance untitled count axis. | task | open | BANKED:99 |
| 161 | Raw-integer `Severity ${...}` residue. | task | open | — |
| 162 | excelExport "Measurement type" row. | task | open (verification deferred) | — |
| 163 | excelExport case consistency. | task | open | — |
| 164 | Replicate-structure callout (ReportView) — unreachable branch. | task | open | — |

Nested under `:100`: `:122` *#27 SelectiveNoise wrapper — **CLOSED S265*** (`6364e61`),
`:137`, `:144` — elaborations, not rows.

### 3.4 Colour tokens, chip chrome, EXPOUND, naming (25 rows)

| line | item | kind | state | dup-of |
|---|---|---|---|---|
| 168 | Row-grouped conditions render as plain text on evidence tables (S263). | task | open, read-only first | BANKED:265 |
| 170 | Dedicated `C.DISABLED` token vs C.TEXT_3. | task | open | — |
| 171 | SVG-stroke colour token slot. | task | open | — |
| 172 | `DUP_GROUP_PALETTE` within-row distinguishability. | task | open | — |
| 173 | `MECH_COLOR_LIGHT` derived background tokens. (Was STATUS parked #11.) | task | open | **dead scheme — see §6.2** |
| 174 | Inline `#F59E0B` repeats across three ImportView REQUIRED sites. | task | open | BANKED:392 |
| 175 | `SvgLabel` mono-tick rail precondition (S216). | task | open | BANKED:99 |
| 176 | ColumnStatBar deferred reference line (S216). | task | open | — |
| 177 | Plot caption-surface findings — bounds and zone placement (S222). | task | open | BANKED:99 |
| 181 | Chip resting-state distinction. | task | open | — |
| 182 | §2 "applies across the whole dataset" callout sizing. | task | open | — |
| 183 | Cleared-tier chip icon opacity (0.4). | task | open, runtime-verification deferred | — |
| 184 | Lane label "Flagged, location unclear" vs the affirming Runs caption. | task | open | — |
| 185 | S71 colour-in-heading — three sites (S198 audit). | finding | open | BANKED:9 |
| 191 | Card-title ↔ METHODOLOGY.md section-name divergence. | task | open | BANKED:248 |
| 192 | TEST_METHODS jargon glosses. | task | open | BANKED:367 |
| 196 | `showRoleBadge` prop — vestigial name. | task | open | BANKED:266 |
| 197 | Pre-S95 taxonomy strings still live engine-side. (CLAUDE L130 relocate, S174.) | task | open | **stale line-ref — CLAUDE.md has no L130 item** |
| 198 | VST inline ternary → `VST_LABEL`. | task | open | — |
| 199 | Methodology-map naming reconciliation (S229 walk). | task | open | METHODOLOGY-MAP §UI categories; BANKED:248 |
| 200 | `LOCALISED_ROWS_CAPTION` shared constant (landed S204). | decision record | landed, retained as template | — |
| 201 | Col-N file-column label — #31 — **DONE S281**. | task | **landed** `8306fcd`/`bc0646a` | — |
| 202 | #37 — ColumnGoF/Entropy multi-condition prose flattening. | task | open, watch-class | BANKED:201 |
| 203 | #38 — Entropy prose names no column. | task | open | BANKED:388 |
| 204 | #39 — VFS Finding column (walk 8a remainder). | task | open, v1.x | BANKED:21, :80 |

### 3.5 Watch-items, methodology discipline, conformance, composition, stale docs, semantics (23 rows)

| line | item | kind | state | dup-of |
|---|---|---|---|---|
| 208 | No shipped fixture renders a platykurtic Kurtosis per-condition table (S221). | finding | open, fixture-gated | BANKED:77, :228 |
| 209 | Modality calibration audit. | task | open, trigger-gated | V1X §5.3 |
| 210 | Cleared-unit dot vs expected tick near-occlusion (S286). | finding | open, watch | — |
| 211 | Band-return-on-horizontal-overflow. | finding | open, watch | — |
| 212 | F6 border-vs-dense-fill. | finding | open, watch | CLAUDE.md:152 |
| 213 | Off-viewport / dataset-spanning table fidelity. | task | open | BANKED:214 |
| 214 | §2 highlight emission vs the iteration idiom. | decision record | fixed S188 `8dd2105`; retained as diagnostic | CLAUDE.md:90 |
| 215 | Intermittent dev-loop stall. | finding | open, unreproduced | — |
| 219 | Marginal-shape tests are invalid on count data. (Landed S180 `16ace4e`.) | decision record | **landed** `16ace4e` | METHODOLOGY-MAP:7; CLAUDE.md:73 |
| 220 | "Operates on" axis for the test roster. | task | open, not actioned | METHODOLOGY-MAP §Test-input routing |
| 221 | An audit finding is not a source fact until source-confirmed (S217). | decision record | recorded | CLAUDE.md:117 |
| 222 | Parallel audit readers can resolve to the main checkout (S217). | decision record | recorded | CLAUDE.md:135 |
| 228 | The `aggregation.js` per-condition rebuild does not carry `condPromoted` (S221). | task | open | BANKED:208 |
| 232 | Single-test cleared-strip wrap. | task | open, scoped | — |
| 233 | Header spans → named register constants. | task | open | BANKED:150 |
| 234 | Disclosure-panel boxiness. | task | open, watch | — |
| 240 | `docs/ARCHITECTURE.md` — "25 vs ~27 tests" header drift. | finding | open | **self-declared size error — see §6.4** |
| 241 | Residual stale comments naming deleted symbols (S227). | task | open, opportunistic | — |
| 242 | `test/diag-s119-cruft-audit.mjs` is a dead diagnostic. | task | open, retirable | — |
| 246 | A display element that reads as a signal must gate on the same significance the verdict gates on. | decision record | recorded; → IDS | CLAUDE.md:116; BANKED:62, :91 |
| 247 | The α a number represents must be labelled which-α. | decision record | open (convention for arc C) | — |
| 248 | The "Noise distribution" display name may evoke the wrong cluster. | task | open | BANKED:191, :199 |
| 252 | "Built with Claude Code" — page-footer line. | task | open, not yet added | — |

### 3.6 RowMean dead fields, Kurtosis comprehension, hover, footer↔heading (6 rows)

| line | item | kind | state | dup-of |
|---|---|---|---|---|
| 256 | `bestRowMeans` / `bestSimMeans` / `bestRowIdxs` / `bestGrandMean` now unconsumed. | task | open, PRNG-parity-gated | CLAUDE.md:201 |
| 260 | The Kurtosis per-condition table shows a significant adjusted p next to a "Normal" Finding. | finding | open, folds into verdict-coherence | BANKED:32, :15 |
| 264 | Role-chip hover tint shift. | task | open | — |
| 265 | Cross-surface condition chip alignment. | task | open | BANKED:168 |
| 266 | DupDet mini-card condition strip. | task | open | BANKED:196 |
| 270 | Footer↔heading redundancy is a seven-card family. | finding | open, drives stage-2b | BANKED:24 |

### 3.7 Real-world corpus S292–S308 (16 bullet rows + 15 prose rows)

| line | item | kind | state | dup-of |
|---|---|---|---|---|
| 279 | Exact Duplicate Detection MISSED the documented defect → Class C. | finding | recorded; → V1X §2.4 | V1X §2.4 |
| 280 | Missing Data Pattern HIGH → B2 (legitimate structure). | finding | recorded | — |
| 281 | *Out-of-run note:* PubPeer comment #16 documents further duplicates. | finding | open (corpus extension) | — |
| 284 | Exact Duplicate Detection HIGH → Class A. | finding | recorded | REALWORLD-CORPUS-SPEC |
| 285 | Near-duplicate-with-shared-terminal-digit pairs → Class C. | finding | open, v1.x candidate | BANKED:334; V1X §2.4 |
| 286 | Discrepancy logged — 8 vs 12 differing cells. | finding | **unresolved**, honestly flagged | — |
| 287 | Regional Noise Homogeneity MODERATE → B1-lean. | finding | recorded | — |
| 288 | IRC / Autocorrelation / Windowed Autocorrelation HIGH/MOD → B2. | finding | recorded | — |
| 289 | Decimal Precision Consistency HIGH → B2. | finding | recorded | — |
| 290 | Mahalanobis Row Outlier + Blocked Mahalanobis HIGH → B3. | finding | recorded | BANKED:296; V1X §2.5 |
| 291 | Selective Noise Partitioning HIGH → unresolved. | finding | **resolved S293** at BANKED:306 — entry not updated | BANKED:306 |
| 292 | *Out-of-run note:* the retraction also names an ATPase-Activity-sheet duplication. | finding | recorded, out of run scope | — |
| 337 | Import precision loss (`raw:false`) defeats deep near-dup detection — ELEVATED. | task | open, high-value | V1X §2.4/§2.5 |
| 338 | VFS card-copy relabel (frequency-spike → near-dup). | task | open | V1X §2.4 |
| 339 | High-precision round-tail carve-out. | task | open, note-not-built | — |
| 340 | Mid-precision τ anchor gap. | task | open | — |

Prose rows: **:294** CORPUS-03 BLOCKED (superseded by :306); **:296** Cross-cutting
role/condition-inference gap (→ V1X §2.5); **:298** Paper-framing consequence; **:304**
`conditionsHint` wired (landed, runner-only); **:306** CORPUS-03 re-run adjudicated;
**:310/:312/:314** three S293 consistency findings (→ V1X §2.6); **:316** source correction
`duplicateDetection.js:134` falsified; **:318** worktree note; **:322** road-test triage
programme (22 papers); **:330** adjudicated cases S305–S306; **:332** known-defect skip rule
ADOPTED S307; **:334** VFS pass-2 near-dup keep-gate BUILT S308 `d22df9f` (**not promoted**);
**:344** row-semantics model is binary where CORPUS-01 is grouped-ordered.

> **Finding (S3-a).** `BANKED:291` says *"Selective Noise Partitioning HIGH → unresolved."*
> `BANKED:306`, twelve lines later in the next section, says the S293 re-run collapsed it
> (`HIGH→N/A`) and **"this resolves the S292 'unresolved' Selective Noise carry."** The
> earlier entry was never amended. Same file, same register, resolved and unresolved.

### 3.8 Relocation-pending rules and Arc B (14 rows)

| line | item | kind | state | dup-of |
|---|---|---|---|---|
| 356 | (S198) A "drafted prompt" referenced across sessions may be a spec. | decision record | open (→ project-instructions) | — |
| 357 | (S200) Stage-2 footer rewrite = information reduction by design. | decision record | open (→ IDS) | — |
| 358 | (S248) Displaying per-condition p's creates a multiple-comparison surface. | decision record | open (→ METHODOLOGY/IDS) | BANKED:17 |
| 359 | (S284) A legend swatch samples its mark, across components. | decision record | open (→ PLOT-COLOUR-SEMANTICS) | — |
| 361 | (S284) `multiplicityNote` is placement-gated, not unconditional. | decision record | open (→ IDS) | TIER-A spec §2.1 |
| 367 | Arc B method-prose pass — how-it-works length / de-jargon (OPEN). | task | open | BANKED:98, :192 |
| 369 | Row-Mean Runs — broaden to column-grouped (wide-format) data (v1.0). | task | open, read-only first | — |
| 371 | Excess Kurtosis — leptokurtic-suppression recall trade-off. **RESOLVED S269**. | decision record | **landed** (no change) | — |
| 380 | Test card redesign (design/UI, later) — home for locality-label element. | task | open | BANKED:150 |
| 384 | Cross-reference naming inconsistency — **DONE S263**. | task | **landed** `31f5e32` | — |
| 386 | Transcription follow-up — **DONE S263**. | task | **landed** `e2d9d66` | BANKED:388 |
| 388 | Entropy look-for renders "flagged columns" (optional, low priority). | task | open | BANKED:203 |
| 390 | (S269) #15 held-bucket dissolution. | decision record | recorded | CLAUDE.md:108 |
| 392 | (S269) #15 fill-treatment programme — remaining two amber tints. | task | open | BANKED:174 |

Prose rows: **:353** consolidation flag 1 (worktree rules → one block); **:354**
consolidation flag 2 (verification discipline → one rule).

> **Finding (S3-b).** The section header (`:350`) says *"The rules below stay in place,
> tagged, until the CLAUDE.md / project-instructions edit lands via a future Code dispatch —
> then they delete from here."* **Both consolidation flags have been discharged and neither
> was deleted.** Flag 1's destination is `CLAUDE.md:124`–`:138` (one worktree-and-dispatch
> block, exactly as instructed). Flag 2's destination is `CLAUDE.md:116` (*"'Done / clean /
> settled' is a verification trigger, not a stopping point"*, one consolidated rule).
> `command grep -c "is a verification trigger, not a stopping point" CLAUDE.md` → **1**.
>
> **Finding (S3-c).** Of the 14 bullets under §Relocation-pending rules, only 5 (`:356`,
> `:357`, `:358`, `:359`, `:361`) are relocation-pending rules. The other 9 (`:367`–`:392`)
> are Arc B card-copy items that sit under a heading describing something else. The section
> boundary drifted; the heading did not.

### 3.9 S325–S345 findings (52 rows)

| line | item | kind | state | dup-of / P |
|---|---|---|---|---|
| 399 | (S325) The `0.1` sparsity factor is an undocumented magic number at three sites. | finding | open | V1X §2.5 |
| 401 | (S325) `NewGrowthRate` on C14 — a measurement acting as a grouping key. | finding | open, trigger-gated | V1X §2.10 |
| 403 | (S325) `MAX_LEVEL_FRACTION` is a second lever, deliberately not pulled. | decision record | recorded hold | — |
| 405 | (S325) The engine's error message names the wrong axis. | task | open | — |
| 407 | (S325) Hardcoded `engine.js:NNN` references in `confirmGrouping.js` drift. | finding | open convention question | CLAUDE.md:257 |
| 409 | (S325/S340) The aggregator's errored description names the wrong reason. | task | open | — |
| 417 | (S325/S340) Cross-Condition Consistency is not gated by the grouping trigger. | finding | open, spec-vs-code | V1X §2.10 |
| 425 | (S325/S340) The ecology census is archived; three findings are what it carried. | decision record | recorded | — |
| 441 | (S340) `docs/shared/s340-eight-seed.{json,txt}` are generated data. | task | open | — |
| 449 | (S340) `TIER-A-CI-DRAW-SPEC.md`'s filename no longer describes its contents. | task | open | BANKED:74 |
| 456 | (S340) `CAPTION-SURFACE-AUDIT.md` is a living reference last refreshed at S212. | finding | open | BANKED:99 |
| 462 | (S340) The archived `METHODOLOGY-MAP.md` shares its name with the live doc. | task | open | — |
| 470 | (S340) A dangling citation survived in `src/` for ~180 sessions. | decision record | **landed** `ef52157` | CLAUDE.md:316 |
| 482 | (S296) Close-out verifies `git status` clean BEFORE writing STATUS's hash. | decision record | open (→ close-out) | CLAUDE.md:327 |
| 484 | (S299) A request for "the full Code prompt" means one checklist-complete artifact. | decision record | open (→ project-instructions) | — |
| 486 | (S304) S175 doc-placement write-target — a durable fix is owed. | task | open, **"needs a P-number"** | **unnumbered — see §6.3** |
| 492 | (S327) `duplicateDetection.js:370` puts a literal into a live BH-FDR denominator. | finding | open | V1X §2.13 |
| 494 | (S327) Six severity ceilings put tiers arithmetically out of reach. | finding | open | STATUS P71/P73; V1X §5.9 |
| 496 | (S327) Two source comments are wrong about their own cost. | finding | open | V1X §2.13 |
| 498 | (S327) Entropy has no exported minimum. | task | open | V1X §2.15 |
| 500 | (S327) A roster entry without a tip hash is an unverified claim. | decision record | open (→ close-out) | CLAUDE.md:117 |
| 506 | (S327) Workbook extent is not analysis row count. | decision record | **landed** in CLAUDE.md:110 | **CLAUDE.md:110 — duplicate** |
| 512 | (S342, P59) `09-proteomics-clean` reaches severity 1 at three seeds in eight. | finding | **superseded** — P59 closed `95a2808`; retracted at BANKED:528 | STATUS P59 |
| 514 | (S342, P60) Baseline Balance carries two independent anti-conservative defects. | finding | open | STATUS P60 |
| 516 | (S342, P61) The CCC gate suppresses a detection inside DS12b's planted mechanism. | finding | open | STATUS P61/P48 |
| 518 | (S342, P62) `esGateMode` names the first OR arm checked. | finding | open | STATUS P62 |
| 520 | (S342, P63) The display map's `(ack)` label means the opposite of what it says. | finding | open | STATUS P63 |
| 522 | (S342, P64) `FIXTURES` coverage hole in the map generator. | finding | open | STATUS P64 |
| 524 | (S342, P65) The held-out corpus and power-curve programme. | task | open, largest | STATUS P65 |
| 530 | (S343, P66) Where `m` is large, no reachable `B` resolves the worst case. | finding | open, amended S344 | STATUS P66 |
| 532 | (S343, P67) No test asserts its own floor. | task | part one landed `29fb543`; 16 open | STATUS P67; BANKED:565 |
| 534 | (S343, P68) Was `ALPHA.FLAG = 0.001` ever set with the battery size in mind? | task | open | STATUS P68 |
| 536 | (S343, P69) The one-cell-neighbour rate is a stability instrument. | task | open | STATUS P69 |
| 538 | (S343, P70) Doc residues, all small, all real. | task | open, grown S344 | STATUS P70 |
| 542 | (S343) A B resting on a D is a D wearing a formula. | decision record | open (→ METHODOLOGY) | — |
| 549 | (S344, P71) CCC cannot flag at all above 10,000 rows. | finding | open, v1.0 blocker | STATUS P71 |
| 551 | (S344, P72) The per-stage BH decision's arithmetic case is void. | finding | open (empirical case stands) | STATUS P72 |
| 553 | (S344, P73) Two fixed resample counts sit one draw short of a tier. | finding | open | STATUS P73 |
| 555 | (S344) The Blocked Mahalanobis `B_perm = 9999` item is **void, not deferred**. | decision record | **closed — no work follows** | METHODOLOGY §2.6b |
| 559 | (S345, P76) Future work lives in five registers and nothing reconciles them. | task | open, **lead** | STATUS P76; **carries three wrong counts — §6.4** |
| 561 | (S345, P75) `npm test` counts differ by working directory. | finding | open | STATUS P75 |
| 563 | (S345, P77) Excess Kurtosis's early-exit path can divide by 51 instead of 2000. | finding | open, latent | STATUS P77 |
| 565 | (S345) P67 part one landed: `bhFDR`'s step-up asserted, seven of twenty-three floors. | decision record | **landed** `29fb543` | STATUS P67 |
| 567 | (S345) A gate can suppress the p before it is computed, at four of twenty-three sites. | finding | recorded | `SESSION345-DRIVABILITY-CLASSIFICATION.md` |
| 569 | (S345) The non-verdict site count was one, not four. | finding | open (census amendment owed) | STATUS P70 |
| 571 | (S345) A census records two kinds of column at the same apparent confidence. | decision record | recorded | STATUS P67 |
| 573 | (S345) The cost of a floor assertion is authoring its input, not running it. | decision record | recorded | STATUS P67 |
| 575 | (S345) A derived copy with a manual sync and no freshness check drifts, by *adding*. | finding | open | STATUS P76; **this document's own premise** |
| 577 | (S345) A verification grep tests content and line-wrapping at once. | decision record | **open — has NOT landed in CLAUDE.md** | routed → CLAUDE.md; 0 hits |
| 579 | (S345) A directory under `.claude/worktrees/` is not a worktree. | decision record | **open — has NOT landed in CLAUDE.md** | routed → CLAUDE.md; 0 hits |
| 581 | (S345) `CLAUDE.md`'s Active Conventions is 108 top-level bullets in one flat list. | finding | open | STATUS P76; **confirmed at 108** |
| 583 | (S345) P74 shipped but its doc half did not. | task | open | STATUS P74 → P70 |

**Rows: 200** (182 bullets + 18 prose). Landed with evidence: **25** (20 tabulated + 5 prose). Superseded within
BANKED itself: **3** (`:291`, `:294`, `:512`). Declared void: **1** (`:555`). Recorded: **26**. The remaining **144**
are open or unknown; §1 states why they are not individually source-settled here.

**The 18 prose rows, enumerated so N6 can be checked:** `:44`, `:294`, `:296`, `:298`,
`:304`, `:306`, `:310`, `:312`, `:314`, `:316`, `:318`, `:322`, `:330`, `:332`, `:334`,
`:344`, `:353`, `:354`.

---

## §4 — CLAUDE.md `## Active Conventions` (108 rows)

`CLAUDE.md:98`–`:258`. Every row is a top-level bullet. **Kind is the finding here:** this
register is overwhelmingly decision records, not work owed.

| line | item (opening) | kind | line | item (opening) | kind |
|---|---|---|---|---|---|
| 100 | STOP AND CHECK: Am I over-analyzing? | decision record | 194 | Column width rules | decision record |
| 101 | Surgical changes only. | decision record | 195 | ChartLegend swatches | decision record |
| 102 | Dead-code prune discipline. | decision record | 196 | SVG fonts | decision record |
| 106 | Plan multi-step work. | decision record | 197 | Chart captions | decision record |
| 107 | Write in plain English. | decision record | 198 | Style constants | decision record |
| 108 | Structure-first gate for suite-spanning work. | decision record | 199 | Mahalanobis plot | decision record |
| 109 | A sweep searches the quantity, not the notation (S344). | decision record | 200 | LOESS changepoint labels | decision record |
| 110 | Measure what a figure is a figure *of* (S327). | decision record | 201 | Sign strip rendering | decision record |
| 111 | Per-unit display: pick the primitive from the unit's shape. | decision record | 202 | Frozen cell opacity | decision record |
| 114 | New correctness rules apply retroactively to shipped work. | decision record | 203 | Finding template row mapping | decision record |
| 115 | Never repair a verdict-load-bearing denominator in place (S248). | decision record | 204 | Test-result `category` taxonomy | decision record |
| 116 | "Done / clean / settled" is a verification trigger. | decision record | 205 | Auto-resolved import gates render as AUTO cards | decision record |
| 122 | Promote a session via `./scripts/promote.sh`. | decision record | 206 | QC vs Review/Forensics copy discipline | decision record |
| 123 | Run a worktree's dev server via `./scripts/dev.sh`. | decision record | 207 | Row Semantics provenance surface (S120) | decision record |
| 124 | Worktree workflow. | decision record | 208 | Findings[] aggregator — canonical source-of-truth | decision record |
| 132 | Worktree symlinks for gitignored Chat-owned docs. | decision record | 215 | renderMode flag pattern | decision record |
| 133 | Continuing sessions attach to the existing branch worktree. | decision record | 216 | Token discipline for colour | decision record |
| 134 | Worktree precondition fires BEFORE the first edit. | decision record | 217 | Verify an asserted equivalence at the arithmetic. | decision record |
| 135 | Pre-flight after the first Edit/Write of a session. | decision record | 218 | A fix that touches a line can surface a sibling. | decision record |
| 136 | Worktree hygiene. | decision record | 219 | Split a retoken into mechanical versus decision. | decision record |
| 137 | Chat-authored content only reaches Code by physical paste. | decision record | 220 | Forensics section IA | decision record |
| 138 | A Code prompt cannot carry a file. | decision record | 221 | Producer threshold dual-emit (Mahalanobis) | decision record |
| 139 | Commit disposition follows ownership class, not edit size. | decision record | 222 | Pill/chip ordering | decision record |
| 140 | Screenshot / verification-gate discipline. | decision record | 223 | Findings.js fallback region | decision record **+ embedded task** |
| 148 | Chat-owned tracked docs commit to main BEFORE a close-promote. | decision record | 224 | Fallback rules need verdict guards | decision record |
| 149 | Halt-and-confirm between doc-merge and promote. | decision record | 225 | Sticky scope = parent's vertical extent | decision record |
| 150 | §2 chrome refinements. | decision record | 228 | Pill/chip colour family | decision record **+ embedded task** |
| 154 | §2 multi-region selection | decision record | 229 | `SECTION_HEADER_TYPOGRAPHY` | decision record |
| 156 | No scattered dispatch. | decision record | 230 | Chip/pill activation contract | decision record |
| 157 | The SECOND consumer of a shared primitive is the real test. | decision record | 231 | Aggregator-level region expansion | decision record |
| 158 | Diagnostic findings describe state, not bugs. | decision record | 233 | `finding.locality` is the canonical classifier | decision record |
| 159 | Recoverability is a property of a return site (S342). | decision record | 236 | `activeConvergence` rebuilds the grid | decision record |
| 160 | Test verdict reads off the localised finding output. | decision record | 237 | `<body style="overflow-anchor: none">` is REQUIRED. | decision record |
| 161 | MiniCardLayout — **"All 25 MiniCards use it"** (wrong, §6.4) | decision record | 238 | §2 horizontal density strip | decision record |
| 165 | Implications | decision record | 239 | Forensics symmetric pulse model | decision record |
| 166 | SUB_HEAD | decision record | 240 | Decoupling rule for dual-surface components | decision record |
| 167 | SEVERITY_WORD | decision record | 241 | Canonical modal pattern | decision record |
| 168 | §2 sticky surface + active-region lifecycle | decision record | 242 | `heatmapProps` bundle | decision record |
| 173 | §1 Verdict surface | decision record | 243 | ExcerptTable canonical home | decision record |
| 174 | makeRowMapper | decision record | 244 | Typography registers | decision record |
| 175 | MINIPLOT_REGISTRY — **"(25 entries)"** (wrong, §6.4) | decision record | 245 | ImportView badge case | decision record |
| 176 | TestCard | decision record | 246 | Pin/✕ file-bar retired for v1.0 | decision record **+ dead ref** |
| 177 | Footer convention | decision record | 247 | Chip-in-tinted-parent context override | decision record |
| 182 | Methodology copy registers per chrome surface | decision record | 248 | Chip-family chrome doesn't apply to non-chips | decision record |
| 183 | Badge p-value | decision record | 249 | ImportView chip family | decision record |
| 184 | PlotLayout | decision record | 250 | Chrome principles | decision record |
| 185 | EvidenceTable | decision record | 251 | A chrome change that triggered a cascade can be re-applied | decision record |
| 186 | Per-condition MiniCard tables bind to `subDetails` (S184) — dead ref "item 46" | decision record | 252 | Chip-tint tokens carry semantic identity | decision record |
| 187 | Convergence heatmap | decision record | 253 | App voice: sentence case | decision record |
| 188 | Detail-table chrome | decision record | 254 | Shared-component + token locks | decision record |
| 189 | Unified highlight dispatch | decision record | 255 | Page-level primary CTA chrome is single per surface | decision record |
| 190 | Click-to-highlight overrides | decision record | 256 | Match on what ran, not on test names. | decision record |
| 191 | ScrollTable | decision record | 258 | On a genuine fork, do not proceed on your own pick. | decision record |
| 192 | IrcBracketStrip | decision record | | | |
| 193 | Frozen columns | decision record | | | |

**Rows: 108.** Kind: **108 decision records, 0 standalone tasks.** Four carry an embedded
work-owed clause inside a rule (`:186` "deferred to item 46", `:223` "parked for
producer-shape fix", `:228` "not yet audited for SEV_VERDICT unification", `:246` "Revival
recipe in STATUS parked #18"). State: all `recorded` — a convention has no open/closed axis.

> **Finding (S4-a) — the register that is not a register.** CLAUDE.md is in the P76 set
> because S345 folded 32 BANKED items into it. But as a register of **work owed** it holds
> **four embedded clauses, not 108 items**. Counting its 108 bullets alongside BANKED's 182
> and STATUS's 37 adds 108 rules to a total of tasks and inflates the problem by roughly
> 28%. **This is the single largest correction the census makes to the P76 framing.**
>
> **Finding (S4-b).** `command grep -oE '\bP[4-7][0-9]\b' CLAUDE.md` returns **nothing**.
> CLAUDE.md carries zero P-numbers. The 32 items S345 absorbed are unreachable from the
> allocating register — no P-number, no back-pointer, and STATUS's parked table has no row
> saying "32 items live in CLAUDE.md". A consolidation that removes items from the numbered
> namespace without recording where they went is a one-way door.
>
> **Finding (S4-c).** Two rules BANKED routed `→ CLAUDE.md` at S345 have not landed:
> `BANKED:577` (verification grep tests content and line-wrapping at once) and `BANKED:579`
> (a directory under `.claude/worktrees/` is not a worktree). Both greps return 0. Two
> others (`BANKED:506` → `CLAUDE.md:110`; consolidation flag 2 → `CLAUDE.md:116`) have
> landed and their BANKED sources still stand. **Both failure directions are live at once:
> routed-and-not-landed, and landed-and-not-deleted.**

---

## §5 — METHODOLOGY-MAP.md future-work sections (41 rows)

### 5.0 Which of the six candidate sections carry work owed, and why

| § | line | carries work owed? | why |
|---|---|---|---|
| Gap audit | 305 | **Yes** | "Remaining gaps (future work)" is its own subheading; the other table names planned tests |
| Inconsistencies to fix | 492 | **Yes** | "Ordered by effort, smallest first" — an explicit work queue |
| Tolerable inconsistencies | 521 | **No** | subheading reads "(no change needed)"; three decision records that close questions rather than open them |
| Planned tests | 529 | **Nominally** | both entries have landed; carries no *remaining* work |
| Implementation sequencing | 541 | **Yes** | eight tracks, four still open |
| Open questions for future review | 569 | **Yes** | seven undecided methodology questions |

Five of six carry work owed. §Tolerable inconsistencies is censused (3 rows) but its kind is
decision record throughout, by its own declaration.

### 5.1 Gap audit (8 rows)

| line | item | kind | state, evidenced | duplicate-of |
|---|---|---|---|---|
| 311 | Overrepresented digit substrings \| II \| VFS digit-substring extension | task | **landed S114** — `src/tests/valueFrequencySpike.js` dual-pass, `pass1`/`pass2` at `:455`; CLAUDE.md:83 | METHODOLOGY-MAP:535; :559 (Track E) |
| 312 | Cross-condition property comparison \| IV \| Consistency framework Stages 2–3 | task | **landed S102/S104** — `crossConditionProperties.js`, `kind ∈ {pool,residual,mvslope}`; CLAUDE.md:60 | METHODOLOGY-MAP:557 (Track D) |
| 318 | 2D spatial plate variance (Moran's I) \| III \| Parked v1.0 | task | open | METHODOLOGY-MAP:577 (open question 7); V1X §1 |
| 319 | Non-linear cross-replicate dependence \| III | task | open, low justification | V1X §1 |
| 320 | Distribution skewness \| III | task | open, low priority | V1X §1 |
| 321 | Row-matched near-duplicates across conditions \| IV | task | open | METHODOLOGY-MAP:575 (open question 5); V1X §1; BANKED:285 |
| 322 | Cross-condition missing data pattern \| IV | task | open | METHODOLOGY-MAP:576 (open question 6); V1X §1 |
| 323 | Per-condition pooled entropy/GoF/modality \| V | task | open | METHODOLOGY-MAP:571, :574 (open questions 1 and 4); V1X §1 |

> **Finding (S5-a) — intra-register duplication.** Four of the six "Remaining gaps" reappear
> verbatim as "Open questions for future review" in the same document (`:318`↔`:577`,
> `:321`↔`:575`, `:322`↔`:576`, `:323`↔`:571`+`:574`). Two sections, 259 lines apart, holding
> the same four items. Nothing cross-references them.
>
> **Finding (S5-b).** Both rows of "Gaps addressed by planned tests" landed — S114 and
> S102/S104 — and the table still calls them planned.

### 5.2 Inconsistencies to fix (9 rows) — **specific check 1**

| line | item | kind | state, evidenced | duplicate-of |
|---|---|---|---|---|
| 498 | 1(a) DupDet Tests 1 and 3 use z-approximation; unify on exact binomial | task | **landed S95** — `duplicateDetection.js:179` `regIncBeta`; `:183` "Test 1: value-level collision count (exact binomial)"; `:348` Test 3 exact | METHODOLOGY-MAP:547 (Track A.1) |
| 500 | 1(b) Test 2 cross-test gate — empirically test removal | task | **landed S95** — revision history v3.1: *"Test 2 'z<−3 integer gate' existed only in doc, never in code"* | METHODOLOGY-MAP:547 |
| 502 | 1(c) METHODOLOGY §1.1 FLAGGED/NOTED terminology | task | **landed** — a grep for FLAGGED or NOTED over METHODOLOGY.md returns 0, checked case-insensitively and whitespace-normalised; §1.1 uses HIGH and MODERATE | METHODOLOGY-MAP:547 |
| 504 | 2. Mahalanobis per-row selection uses BH-FDR **(landed)** | task | **landed** — `mahalanobis.js:162` `bhFDR(rowPvals)` | METHODOLOGY-MAP:548 (Track A.2) |
| 506 | 3. Cross-Condition Rank uses ρ₀ = 0.85 heuristic … **Already planned — STATUS priority 12.** | task | **landed S95** — `rankCorrelation.js:58-59` *"Instead of testing against an arbitrary fixed null (ρ₀=0.85)"*; v3.1 records CCR already used LOO | METHODOLOGY-MAP:549 (Track A.3); **dead scheme, §6.2** |
| 508 | 4. Escalation rule asymmetry — unify on sub-unit BH-FDR promotion | task | **landed S95** — `runs.js:75`, `:259` `bhFDR`; `rowMeanRuns.js`; CLAUDE.md:55 | METHODOLOGY-MAP:550 (Track A.4) |
| 515 | 5. ConstOffset scope — expand to all column pairs | task | **landed S95** — v3.1 *"ConstOffset expanded to all column pairs … bypasses aggregatePerGroup"*; CLAUDE.md:61 | METHODOLOGY-MAP:551 (Track A.5) |
| 517 | 6. Cross-family convergence rule uses wrong grouping — change to cross-dimension | task | **landed S95/S116** — `severity.js:14` `flaggedDimensions` from `TEST_MECHANISM`, `:15` `nFlaggedDimensions`; v4.4 (S116) | CLAUDE.md:85 |
| 519 | 7. Large-N gate audit | task | **open** | METHODOLOGY-MAP:563 (Track G); V1X §5.4; STATUS v1.0 blockers |

> **Answer to check 1 — how much is completed work retained "for sequence completeness"?**
> **Eight of nine (89%).** Only item 7 is open. Of the eight landed, **exactly one carries a
> landed marker** (`:504`, "(landed)"), and `:548` adds the phrase *"listed here for
> sequence completeness."* The other seven read as live work. The document's own revision
> history at `:586` (v3.1, S95) states *"Track A (statistical coherence cleanup) landed"* —
> so the register contradicts itself, 80 lines apart, and the stale half is the half a
> reader scanning for work would find first.
>
> Same shape one section down: **both** Planned tests entries have landed (§5.4), and
> **Tracks A, C, D and E** all record landings inline (§5.5). Across the whole future-work
> surface of METHODOLOGY-MAP, **21 of 41 items (51%) are landed or void**, against 2 items
> carrying an explicit LANDED marker in their own heading.

### 5.3 Tolerable inconsistencies (3 rows)

| line | item | kind | state |
|---|---|---|---|
| 523 | Mix of null types within Dim III | decision record | closed by declaration |
| 524 | Different minimum-N thresholds per test | decision record | closed by declaration — **contradicted by BANKED:498** (Entropy has no exported minimum) |
| 525 | Some tests have BH-FDR, others don't | decision record | closed by declaration |

### 5.4 Planned tests (2 rows)

| line | item | kind | state, evidenced |
|---|---|---|---|
| 531 | Blocked Mahalanobis (Dim III, sub-group C) — **LANDED S110** | task | **landed** — `src/tests/blockedMahalanobis.js` exists (27,987 bytes); CLAUDE.md:64 |
| 535 | VFS Digit-Substring Extension (Dim II) — *"Already on roadmap (STATUS priority 13)"* | task | **landed S114** — `valueFrequencySpike.js` dual-pass; CLAUDE.md:83. **Dead scheme, §6.2** |

Both entries under a heading reading "Planned tests" have shipped. One says so; one still
cites a roadmap position in a scheme that no longer exists.

### 5.5 Implementation sequencing (12 rows)

| line | item | kind | state, evidenced |
|---|---|---|---|
| 547 | Track A.1 — DupDet exact binomial / gate removal / terminology | task | **landed S95** (see 5.2) |
| 548 | Track A.2 — Mahalanobis Bonferroni → BH-FDR. **LANDED**; *"listed here for sequence completeness"* | task | **landed** |
| 549 | Track A.3 — CCR ρ₀ → LOO | task | **landed S95** |
| 550 | Track A.4 — Escalation rule: Runs + Row-Mean Runs → sub-unit BH-FDR | task | **landed S95** |
| 551 | Track A.5 — ConstOffset: expand to all column pairs | task | **landed S95** |
| 553 | Track B — Review paper (Chat) | task | **open** — waits behind the road-test corpus (BANKED:322) |
| 555 | Track C — UI restructure (Code, medium) | task | **landed S95** — v3.2; the five categories are live in `mechanisms.js` |
| 557 | Track D — Cross-condition consistency framework. Stage 1 S97, Stage 2 S102, Stage 3 P9 S104 | task | **landed**; P7/P8 deferred v1.1+ |
| 559 | Track E — New tests. (Landings: S96, S107, S110, S114.) | task | **landed** |
| 561 | Track F — Unified SD scan (Code, large, deferred) | task | **open** — no `src/` symbol; V1X §3.3 carries it |
| 563 | Track G — Large-N gate audit (six tests) | task | **open** | 
| 565 | Track H — Long-format fix (Code, v1.0). Row-order-arbitrary flag. | task | **landed S118** — `src/import/rowSemantics.js`, `src/import/longFormat.js`; CLAUDE.md:46 |

**9 of 12 landed. Tracks B, F and G open; Track A wholly landed and listed as five open
steps.**

### 5.6 Open questions for future review (7 rows)

| line | item | kind | state | duplicate-of |
|---|---|---|---|---|
| 571 | Per-condition pooled Dim V variants — sample size concerns | task | open | METHODOLOGY-MAP:323; V1X §1 |
| 572 | Time-series / dose-response archetype | task | open | BANKED:288 (CORPUS-02 dose-series B2) |
| 573 | Paired/matched design handling | task | open | METHODOLOGY-MAP:411 (Archetype 7) |
| 574 | Per-condition digit tests — useful extension or too small N? | task | open | METHODOLOGY-MAP:323 |
| 575 | Row-matched near-duplicate test (Dim IV) — null model design | task | open | METHODOLOGY-MAP:321; BANKED:285 |
| 576 | Cross-condition missing data pattern — feasibility | task | open | METHODOLOGY-MAP:322 |
| 577 | Plate analysis architecture (Dim III 2D, Moran's I) — timing within v1.0 | task | open | METHODOLOGY-MAP:318 |

**Rows: 41.** Landed with evidence: **21**. Open: **17**. Recorded: **3** — the §Tolerable
inconsistencies rows, which close their questions by declaration and so carry no open/closed
axis. Sub-tallies by subsection: 5.1 (2 landed / 6 open) · 5.2 (8 / 1) · 5.3 (0 / 0, 3
recorded) · 5.4 (2 / 0) · 5.5 (9 / 3) · 5.6 (0 / 7). **21 + 17 + 3 = 41.**

---

## §6 — The four specific checks

### 6.1 Check 1 — completed work retained for sequence completeness

Answered in §5.2. **21 of 41 METHODOLOGY-MAP future-work items (51%) are landed or void.**
Two carry a LANDED marker in their heading; one more says "for sequence completeness". The
other eighteen read as live work, including the entire Track A / Inconsistencies-1-to-6
block that the document's own revision history declares landed at S95 — **251 sessions ago.**

### 6.2 Check 2 — the dead numbering schemes

Not one scheme cited twice. **Four dead schemes, 119 citations.**

Counted as **occurrences**, not lines, because the unit is citations. Schemes B and C
overlap — a `STATUS parked #N` citation also matches the bare-`#N` pattern — so C is
measured net of B.

| scheme | what it was | CLAUDE | BANKED | M-MAP | V1X | **total** |
|---|---|---|---|---|---|---|
| **A — "STATUS priority N" / "(STATUS N)"** | a numbered priority list STATUS no longer keeps | 0 | 0 | 4 | 0 | **4** |
| **B — "STATUS parked #N"** | the pre-P-number parked numbering | 2 | 1 | 3 | 8 | **14** |
| **C — bare `#N` with no allocating register** | item ids inherited from scheme B | 0 | 48 | 29 | 5 | **82** |
| **D — "ROADMAP" / "ROADMAP Item 8" / "ROADMAP Track H"** | a file that is not in the repository | 0 | 0 | 0 | 19 | **19** |

Scheme A sits entirely in METHODOLOGY-MAP: `:186` "(STATUS 12)", `:291` "(STATUS 12)",
`:506` "STATUS priority 12", `:537` "STATUS priority 13". Scheme B's eight V1X sites are
`:77`, `:855`, `:1195`, `:1198`, `:1204`, `:1215`, `:1216`, `:1217`; CLAUDE.md's two are
`:57` (#8) and `:246` (#18); BANKED's one is `:173` (#11); METHODOLOGY-MAP's three are in its
revision history. Scheme C's BANKED half spans 20 distinct values (#5 #6 #7 #11 #15 #16 #17
#22 #25 #27 #31 #32 #33 #35 #37 #38 #39 #49 #51 #52).

Three judgments, stated so they can be disagreed with:

- **`BANKED:559` is excluded from scheme A.** It contains "STATUS priority 13", but as a
  quotation *of* the dead scheme inside the entry that reports it. Describing a dead pointer
  is not using one.
- **CLAUDE.md contributes 0 to scheme C.** Of its seven bare `#N`, two are scheme B and five
  are not pointers: `#4C1D95`, `#A3C1DA` and `#4682B4` are colour hexes, and `#4`/`#2` at `:91`/`:92`
  belong to the live locked-A2 fix list.
- **METHODOLOGY-MAP's 29 sit in its append-only revision history** (`:583`–`:602`). Counted,
  because a reader can still follow them, but they are historical record rather than live
  pointers.

**`V1X:5` is not a scheme-B instance** and was wrongly listed as one on first write. It reads
*"v1.0 UI polish (lives in STATUS.md parked items)"* — an unnumbered reference to a register
that genuinely exists. The count was always 8; the list is now 8.

Commands:

```bash
occ(){ command grep -oE "$2" "$1" | wc -l; }   # occurrences, not lines
occ docs/shared/METHODOLOGY-MAP.md 'STATUS (priority )?[0-9]+'           # A: 4
occ docs/shared/V1X-FUTURE-WORK.md 'STATUS(\.md)? parked #[0-9]+'        # B: 8 of 14
occ BANKED.md '(^|[^A-Za-z0-9#])#[0-9]+'                                 # C: 49, less 1 scheme-B = 48
occ docs/shared/V1X-FUTURE-WORK.md 'ROADMAP'                             # D: 19
git ls-files | command grep -ci roadmap                                  # 0
```
Two further stale pointers of the same class: `METHODOLOGY-MAP:267` cites a **named** STATUS
parked item (*"Excel forensics → File Structure category"*) that STATUS no longer carries;
`BANKED:197` cites *"CLAUDE L130 relocate, S174"* and `CLAUDE.md:130` is the tree-recovery
rule, unrelated. `CLAUDE.md:186` defers a sweep to *"item 46"* with no register holding a 46.

**The sharpest instance is scheme D.** V1X's `**Purpose:**` line says it *"Consolidates
content currently scattered across METHODOLOGY-MAP's gap audit, ROADMAP Item 8, STATUS.md
parked items, and chat-history-only specs."* Of the four sources it names, one is a file that
does not exist and one is a numbering scheme that was retired. The register built to fix the
scatter cites two dead sources in its own statement of purpose.

### 6.3 Check 3 — is the RETIRED S237 CI section retired?

Answered in full at §3.2. **No.** 13 bullets: 6 landed with commit hashes, 5 open, 2
findings/references. The heading retires the programme; the body says *"The live remainder
lifts to the entries below."*

Related, from `BANKED:486`: an item that says of itself **"unnumbered since S304, needs a
P-number."** Two years of sessions later it is still unnumbered. The allocating register
never learned it existed.

### 6.4 Check 4 — `BANKED.md:559` and other registers mis-stating a size

`BANKED.md:559` is the S345 entry that opened this arc. Its inputs, against measurement:

| claim at `:559` | measured | command | verdict |
|---|---|---|---|
| "STATUS parked items (**29** P-numbers)" | **37** | `command grep -cE '^\| \*{0,2}P[0-9]+' STATUS.md` | **wrong by 8** |
| "BANKED (**170** bullets)" | **182** | `command grep -c '^- ' BANKED.md` | **wrong by 12 — the register mis-states its own size** |
| "V1X-FUTURE-WORK (**1,229** lines, 139 bullets)" | **1,228** lines, 139 any-indent | `awk 'END{print NR}'` / `command grep -c '^ *- '` | lines wrong by 1; bullets correct |
| "METHODOLOGY-MAP … about **27** items" | **41** under a stated rule; irreproducible under any grep | §5 | **not reproducible** |
| "CLAUDE.md, which absorbed **32** items this session" | not independently verifiable — CLAUDE.md carries no P-numbers and no provenance marks | `command grep -oE '\bP[4-7][0-9]\b' CLAUDE.md` → nothing | **unverifiable by construction** |
| "Roughly **365** future-work bullets across **four** files" | 386 part-1 rows across four registers, V1X still to come; and five registers are named in the same sentence | §0.5 | **retired** |
| "two of those **four** sections fall outside the document's own stated Purpose" | **six** candidate sections exist | §5.0 | **undercounts the sections** |

**Other registers mis-stating a size — yes, five more, all in CLAUDE.md:**

| site | claim | measured | command |
|---|---|---|---|
| `CLAUDE.md:38` | "**26** MiniCards" | **28** | `ls src/components/cards/MiniCard_*.jsx \| wc -l` |
| `CLAUDE.md:161` | "All **25** MiniCards use it" | **28** import `MiniCardLayout` | `command grep -rl 'MiniCardLayout' src/components/cards/ \| wc -l` |
| `CLAUDE.md:175` | "MINIPLOT_REGISTRY … (**25** entries)" | **29** | `command grep -cE '^\s*"[^"]+":\s*MiniCard' src/components/cards/MiniPlot.jsx` |
| `CLAUDE.md:37` | "PlotSVG + **19** plot components + stripTicks" | **16** components beside PlotSVG | `ls src/components/plots/` |
| `CLAUDE.md:5` | "**167** modules" | 163 `.js`/`.jsx` under `src/`; last recorded build figure 183 (`BANKED:201`) | `find src -name '*.js' -o -name '*.jsx' \| wc -l` |

`CLAUDE.md:38` and `CLAUDE.md:161` **contradict each other** — 26 versus 25 MiniCards, in the
same file, and both are wrong. The `167 modules` figure names no unit and reconciles with
neither the file count nor the build count; it is recorded as unit-ambiguous rather than
asserted wrong.

Three CLAUDE.md counts are correct and are recorded so the wrong ones are not over-read:
`FISHER_EXEMPT` 7 entries ✓, `FINDING_COMPOSERS` 29 entries ✓, `src/tests/` 30 files ✓.

And `METHODOLOGY-MAP:90` states **"Current total: 27 tests"** against a battery of **29**
(`TEST_MECHANISM` 29 entries, `MINIPLOT_REGISTRY` 29, `src/tests/` 30 files of which one is
the property registry). `:349` and `:403` say Dim III holds "all 12 tests" where CLAUDE.md's
mechanism table lists 14. **BANKED:240 already records a sixth instance of this class**
(`docs/ARCHITECTURE.md` "25 statistical forensic tests") and has been open since S226.

> **The class, named:** every register in the set mis-states at least one size, and three
> mis-state their own. This is not a transcription problem — it is the absence of any
> freshness gate on a count, which is exactly what `BANKED:575` already identified and
> routed to P76: *"every count a compression asserts is one grep."*

---

## §7 — Cross-register duplication

**Expectation 1 was to be treated with more suspicion than the others.** It holds, but not
in the shape assumed.

**7.1 STATUS ↔ BANKED — 24 of 37 P-numbers duplicated, by design.** Every P41–P77 row whose
case material exists appears in BANKED at length. `STATUS.md:97` declares this: *"BANKED, V1X
and METHODOLOGY-MAP hold case material and point at it."* This is a working division of
labour, not drift — **with one live defect (P59, §2 finding S2-b).**

**7.2 STATUS ↔ CLAUDE.md — zero.** CLAUDE.md carries no P-numbers. The 32 absorbed items are
invisible to the allocator (§4 finding S4-b).

**7.3 BANKED ↔ CLAUDE.md — the drift is bidirectional and live.** Two S345 rules routed to
CLAUDE.md never landed (`BANKED:577`, `:579`); two landed and their sources were never
deleted (`BANKED:506` → `CLAUDE.md:110`; consolidation flag 2 → `CLAUDE.md:116`). Both flags
under §Relocation-pending rules are discharged and undeleted (§3 finding S3-b).

**7.4 METHODOLOGY-MAP ↔ itself — 4 of 6 remaining gaps are also open questions** (§5 finding
S5-a). And Track A's five sub-items are the same five items as Inconsistencies 1–5, one
section apart, both stale.

**7.5 BANKED ↔ itself — two items carry their own retraction downstream** (`:291` resolved at
`:306`; `:512` retracted at `:528`), and 40 `##` sections have accreted to the point where
§Relocation-pending rules holds 9 bullets about something else (§3 finding S3-c).

**7.6 METHODOLOGY-MAP ↔ V1X and BANKED ↔ V1X** are named in the tables above but **not
measured** — that is part two.

**What the duplication is not.** It is not mass copy-paste of the same task text into five
places. It is four narrower failures: (a) a pointer scheme with four dead namespaces, (b)
landed work never marked landed, (c) routed work never deleted from its source, (d) counts
with no freshness gate. **A "one register" fix addresses none of them directly** — a single
register with the same four properties would be exactly as unusable. **The discoverability
half of expectation 1 is at least as load-bearing as the duplication half, and the naming
half — four dead schemes, 119 citations — is bigger than either.**

---

## §8 — Divergence from the dispatch's five figures

| register | dispatch figure | measured | divergence |
|---|---|---|---|
| STATUS parked | 37 rows, P41–P77, 4 closed, 1 unknown, 32 open | **identical** | none |
| BANKED | 182 top-level, 200 all-indent | **identical** | none — but the rule under-counts by 18 prose items (§0.3) |
| V1X | 1,228 lines; 135 top-level, 139 any-indent | **identical** | none |
| METHODOLOGY-MAP | "no reliable figure — unresolved" | **41 under a stated rule** | rule supplied; figure now reproducible |
| CLAUDE.md | "108 top-level bullets in one section" | **108 confirmed** | none — the *kind* is the divergence (§4 finding S4-a) |

**Rule differences taken.** Two, both stated: (1) BANKED is censused at 200 not 182, because
five sections carry items as prose and the bullet rule silently drops them; (2)
METHODOLOGY-MAP is censused under the rule at §0.3, which no grep reproduces — three variants
of the figure (41 / 38 / 37) are stated rather than one asserted.

**The dispatch's own corrections held.** STATUS is 37, not 34 or 29. `BANKED:559` does carry
29 and 170 and both are wrong. METHODOLOGY-MAP has six candidate sections, not four.

---

## §9 — Reconciliation

| register | rows | rule |
|---|---|---|
| STATUS.md parked register | **37** | table rows with a P-number first cell |
| BANKED.md | **200** | 182 top-level bullets + 18 prose-only items |
| CLAUDE.md `## Active Conventions` | **108** | top-level bullets, `:98`–`:258` |
| METHODOLOGY-MAP.md future-work sections | **41** | §0.3 rule |
| **Sum of per-register counts** | **386** | |
| **Total rows recorded in §2–§5** | **386** | 37 + 200 + 108 + 41 |

**They agree.** 37 + 200 + 108 + 41 = 386 = 386.

State distribution across the 386, summed per register. Parsed from the state column of the
tables in §2–§5 with an exact classifier, not judged — except the 18 BANKED prose rows, which
are hand-assigned per §0.4.

| state | STATUS | BANKED | CLAUDE.md | M-MAP | **total** |
|---|---|---|---|---|---|
| landed, with evidence | 4 | 25 | 0 | 21 | **50** |
| part-landed (work remains) | 1 | 1 | 0 | 0 | **2** |
| superseded (register not updated) | 0 | 3 | 0 | 0 | **3** |
| void (no work follows) | 0 | 1 | 0 | 0 | **1** |
| part-resolved (`:83`) | 0 | 1 | 0 | 0 | **1** |
| recorded (no open/closed axis) | 0 | 26 | 108 | 3 | **137** |
| open | 31 | 143 | 0 | 17 | **191** |
| unknown | 1 | 0 | 0 | 0 | **1** |
| **rows** | **37** | **200** | **108** | **41** | **386** |

The two part-landings are the same item seen twice — STATUS P67 and BANKED `:532`, P67's case
material. `recorded` is not confined to CLAUDE.md: 26 BANKED rows and the 3 METHODOLOGY-MAP
§Tolerable rows carry it too.

Kind distribution. Machine-parsed for the 182 tabulated BANKED rows and for §2, §4 and §5;
**judged for the 18 BANKED prose rows**, which are listed individually at §3.9.

| kind | STATUS | BANKED | CLAUDE.md | M-MAP | **total** |
|---|---|---|---|---|---|
| task (work owed) | 34 | 107 | 0 | 38 | **179** |
| finding | 2 | 58 | 0 | 0 | **60** |
| decision record | 0 | 35 | 108 | 3 | **146** |
| unclassifiable | 1 (P46) | 0 | 0 | 0 | **1** |
| **rows** | **37** | **200** | **108** | **41** | **386** |

**How big is the open queue? The census cannot say.** What it can say is how many task rows
are *not marked* discharged, which is a different quantity and a weaker one.

| register | task rows | of which marked landed / superseded / void |
|---|---|---|
| STATUS | 34 | 4 |
| BANKED, tabulated | 102 | 13 |
| BANKED, prose | 5 | 4 |
| METHODOLOGY-MAP | 38 | 21 |
| CLAUDE.md | 0 | 0 |
| **total** | **179** | **42** |

`179 − 42 = 137`. Part-landings count as not discharged, because they carry remaining work.

> **137 is a ceiling, not a count.** Landed-not-marked is one of the four failure classes
> this document identifies — METHODOLOGY-MAP alone had 19 of its 21 landings unmarked — so
> the true open figure is lower by an unmeasured amount. **88 BANKED task rows were never
> settled at source**, and until they are, the open queue cannot be sized. The earlier figure
> of "roughly 142 genuinely-open tasks" is retired (§0.5): it subtracted a rounded, cross-kind
> state count from a single-kind total.
>
> What survives is the shape, not the size. **The retired 365 was never a count of anything**
> — it summed bullets across registers of three different kinds. Of the 386 rows here, 146
> are decision records and 60 are findings; folding either into a work register would make it
> less usable, not more. **A "one register" design is sized against 137 at most, and against
> an unknown number below that in fact.**

---

## §10 — The census is an instance of its own subject

Three of the four failure classes this document names are present in this document.

**Counts with no freshness gate.** Twenty-one figures were wrong on first write, including
the landed counts for two of the four registers and every cell of §9's two reconciliation
tables. One of them, "roughly 142 genuinely-open tasks", was the recommendation. A read
found five; the sweep that followed found sixteen more.

**One item stated two ways.** Row `:502` was `unknown` in §5.2's table, counted among §5.6's
unknowns, and counted as landed in the section total that §6.1 and §9 both quote. Same shape
as `BANKED:291`/`:306` and `CLAUDE.md:38`/`:161`, which this document reports as findings
about other people's registers.

**A pointer to a section that may not exist.** The completion report for this document cited
"§12" against a draft that ended in an unnumbered section. The shipped file does carry a §12
and the pointer resolves — but the draft and the shipped file are two copies of one document
with no check between them, and the review ran on the stale copy. Same shape as scheme D, and
a fourth instance of the drift `BANKED:575` names.

**What follows.** This document needs the freshness gate it recommends for everything else.
The candidate is §0: it already lists every figure with its rule and its command, and it
becomes a gate only when something checks that **every integer in the body either appears in
§0 or is derived in place from figures that do**. That check is mechanical — extract the
integers from the prose, match against §0 — and it is the prose equivalent of
`FLOOR-MANIFEST`'s freshness test, which fails when the committed copy does not match a fresh
generation. Until it exists, §0 is a convention rather than a gate, and a convention is
exactly what failed here.

---

## §11 — Expectations

**1. Substantial duplication across registers — PARTIALLY INVERTED.** The registers are not
cleanly disjoint, but they are also not substantially duplicated in the assumed sense. The
STATUS↔BANKED overlap (24 of 37) is the declared design and works. The real failures are
naming (four dead schemes, 119 citations), landed-not-marked (21 of 41 in METHODOLOGY-MAP,
16 in BANKED), routed-not-deleted, and counts with no gate. **The premise the arc rests on
survives, but the fix it implies — "one register" — would not address any of the four.**

**2. A significant fraction of pre-S250 BANKED items and METHODOLOGY-MAP tracks are completed
or superseded — HELD, and stronger for METHODOLOGY-MAP than for BANKED.** METHODOLOGY-MAP:
**21 of 41 (51%)**, including the entire Track A block, landed at S95 and still reading as
open 251 sessions later. BANKED: **25 of 200 (12.5%)** evidenced landed — lower than predicted,
but this is a floor, not a count, because 144 rows were not individually source-settled.

**3. The mirrors have diverged — DEFERRED to part two,** but two mirror-class instances are
already live in part one: CLAUDE.md:38 vs :161 (26 vs 25 MiniCards, both wrong), and
BANKED:291 vs :306 (unresolved vs resolved, same file).

**4. The corrected figures hold — HELD.** All five dispatch figures reproduced exactly. Only
the METHODOLOGY-MAP "unresolved" was resolved, by supplying a rule.

**5. Nothing under `src/` changes — HELD.** Zero lines from `git status --porcelain -- src/`.

---

## §12 — Verification

**`git status --porcelain -- src/`** → zero lines, actual output empty.
**Batch: N/A.**

Per-register counts, each with its command and rule:

```bash
# STATUS parked register — table rows with a P-number first cell → 37
command grep -cE '^\| \*{0,2}P[0-9]+' STATUS.md
# closed → 4 ; unknown → 1
command grep -nE '^\| \*{0,2}P[0-9]+.*closed' STATUS.md
command grep -nE '^\| \*{0,2}P[0-9]+.*\| unknown \|' STATUS.md

# BANKED — top-level bullets → 182 (any-indent 200)
command grep -c '^- ' BANKED.md
command grep -c '^ *- ' BANKED.md
# + 18 prose-only items, enumerated by line in §3.9 → census total 200

# CLAUDE.md Active Conventions (:98–:258) — top-level bullets → 108
command sed -n '98,259p' CLAUDE.md | command grep -c '^- '

# METHODOLOGY-MAP — no grep reproduces the item count; rule at §0.3 → 41
command grep -c '^ *- ' docs/shared/METHODOLOGY-MAP.md   # 44, and NOT the item count

# V1X (part two) — 1,228 lines; 135 top-level; 139 any-indent
awk 'END{print NR}' docs/shared/V1X-FUTURE-WORK.md
command grep -c '^- ' docs/shared/V1X-FUTURE-WORK.md
command grep -c '^ *- ' docs/shared/V1X-FUTURE-WORK.md
```

**Divergence from the five dispatch figures:** none on the four that were measured; the fifth
(METHODOLOGY-MAP) was unresolved and is now 41 under a stated rule.

**Reconciliation:** 37 + 200 + 108 + 41 = **386**; total rows recorded = **386**; they agree.

**Nothing renders.** No preview, no screenshot.

---

## §13 — Checkpoint

**Part one ends here.** Part two — `docs/shared/V1X-FUTURE-WORK.md`, 1,228 lines, 135
top-level bullets, eight top-level sections — opens on a fresh dispatch so this
classification is not lost to auto-compaction. Part two owes:

- the same row format over V1X's 135 top-level bullets (plus any prose-only items its own
  shape carries, under the §0.3 rule);
- **the two mirror diffs, measured in both directions.** §1 declares itself a mirror of
  `METHODOLOGY-MAP §Gap audit` (whose source side is censused here at §5.1 — 8 rows, of
  which 2 have landed and 4 are internally duplicated by §Open questions); §5 declares
  itself a mirror of STATUS parked items (source side censused here at §2 — 37 rows). A
  mirror that has **gained** an item is the more interesting direction;
- confirmation of the BUILT / LANDED / FIXED marker counts — a first pass shows 12 in V1X
  and 2 in METHODOLOGY-MAP. **The METHODOLOGY-MAP figure of 2 is confirmed** (`:531`
  "LANDED S110", `:548` "LANDED") — and §5.2/§5.5 of this document show that 2 markers sit
  against **21 items that have actually landed**, so the V1X figure of 12 should be read as
  a count of markers, not of landings;
- the cross-register duplication rows this document left open at §7.6 (METHODOLOGY-MAP ↔
  V1X, BANKED ↔ V1X), which cannot be settled from one side.

**Carried into part two as measured, not assumed:** V1X holds only two P-numbers (P43, P45)
against eight `STATUS parked #N` citations and 19 `ROADMAP` citations to a file that is not
in the repository (§6.2). Whatever part two finds about the mirrors, V1X's pointer surface
is already the most detached of the five.

---

## Provenance

Read-only census, S346. No register was edited. No fix was applied. No item was merged,
deduplicated or reprioritised. Every figure in this document carries its rule and its
command at §0; figures that are judgment rather than measurement are segregated at §0.4.

`git status --porcelain -- src/` → zero lines. **Batch: N/A.**
