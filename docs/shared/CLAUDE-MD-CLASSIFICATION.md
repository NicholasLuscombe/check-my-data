# CLAUDE.md — a structural classification

**This is a read.** Nothing is deleted, moved or rewritten, no line is proposed for deletion, and
**no cut is recommended**. The output is a classification with sizes, so that a later cut can be
priced and argued rather than guessed. `CLAUDE.md` itself is not modified — it is the subject, and
appending a block about classifying it would change the thing being measured. No `src/` file is
modified.

**Generated** by `test/probes/measure-claude-md.mjs` from `test/probes/claude-md-classes.json`.
Sizes, line numbers, markers and the document cross-reference are computed; the four-way class and
the mixed flag are hand-authored judgements, keyed by unit index. The tool refuses to emit if the
unit count has moved since the classification was written.

**The subject is gitignored** (`.gitignore:41`), so this tracked record measures an untracked file.
A reader without the working copy can read the classification and cannot reproduce it.

**Measured at commit `1a44787`.** `CLAUDE.md` is **391,290 characters / 394,235 bytes over 829 lines** — 476 bytes a line.

## 1 — totals

### 1.1 — by section

| section | bytes | share | lines | units |
|---|---|---|---|---|
| What This Is | 164 | 0.0% | 3 | — |
| Session start | 364 | 0.1% | 3 | — |
| Tech Stack | 265 | 0.1% | 5 | — |
| Directory Structure | 1,091 | 0.3% | 24 | — |
| Architecture | 224,003 | 56.8% | 398 | 74 |
| Active Conventions | 151,503 | 38.4% | 302 | 146 |
| 5 Mechanism Categories | 1,026 | 0.3% | 13 | — |
| Deployment | 649 | 0.2% | 3 | — |
| Test → display map (generated reference) | 982 | 0.2% | 3 | — |
| Validation | 5,398 | 1.4% | 15 | 5 |
| Commands | 1,549 | 0.4% | 20 | — |
| Session close-out | 6,952 | 1.8% | 26 | 10 |
| **classified (sections over 2 KB)** | **387,604** | **98.3%** | | **235** |

Four sections exceed 2 KB. The other 8 together are 6,379 bytes.

### 1.2 — by class

| class | units | bytes | share of classified | mean bytes |
|---|---|---|---|---|
| `convention` | 101 | 81,728 | 21.1% | 809 |
| `specification` | 93 | 100,889 | 26.0% | 1,085 |
| `finding` | 37 | 202,716 | 52.3% | 5,479 |
| `unclear` | 4 | 2,271 | 0.6% | 568 |
| **total** | **235** | **387,604** | | |

### 1.3 — by class, per section

| section | `convention` | `specification` | `finding` | `unclear` | total |
|---|---|---|---|---|---|
| Architecture | 6,806 (9) | 52,422 (37) | 164,695 (28) | — | 223,923 (74) |
| Active Conventions | 67,490 (81) | 44,100 (53) | 37,494 (8) | 2,271 (4) | 151,355 (146) |
| Validation | 494 (1) | 4,367 (3) | 527 (1) | — | 5,388 (5) |
| Session close-out | 6,938 (10) | — | — | — | 6,938 (10) |
| **total** | **81,728** (101) | **100,889** (93) | **202,716** (37) | **2,271** (4) | **387,604** (235) |

### 1.4 — mixed units, and the number a cut is actually priced against

**A class is the unit's dominant function, not its only content.** The dominant shape in this file
is a bullet that opens with one class and continues in another — a rule stated once, then several
kilobytes of the measurement that produced it. The `mixed` column records the secondary class.

**91 of 235 units are mixed, carrying 296,093 bytes — 76.4% of the classified mass.**

The dispatch names the risk directly: *a wrong `finding` is how a load-bearing line gets deleted
later*. So the figure that matters is not the `finding` total but the part of it that carries no
instruction.

| | units | bytes | share of classified |
|---|---|---|---|
| all `finding` | 37 | 202,716 | 52.3% |
| … of which carry an embedded convention | 27 | 182,976 | 47.2% |
| … **free of embedded instruction** | **10** | **19,740** | **5.1%** |

**Only 10 of 37 findings are free of embedded instruction, and they are 19,740 bytes** — 9.7% of the finding mass and 5.1% of the file's classified mass. Units 4, 17, 18, 26, 29, 30, 63, 71, 72, 224.

**How the flag was assigned, stated so it can be re-run or disputed.** A scan for
imperative-shaped sentences over every `finding`, then a read of the matches. The scan over-fires
on descriptive prose — unit 63's three matches are all descriptive and it stays unflagged — and
under-fires on imperatives outside its verb list, which is how units 48 and 64 were initially
missed. **The flag is a cut-pricing aid, not a reclassification**, and it was set by reading.

### 1.5 — session markers

**Three measures, because they answer three questions and differ by a factor of two.** State which
one a figure is.

| measure | count | bytes |
|---|---|---|
| lines containing a marker | 262 lines | 178,670 |
| units whose **first line** carries one | 114 units | 296,759 |
| units where **any line** carries one | 122 units | 329,345 |

The third is 85.0% of the classified mass: a unit counts in full when one sub-bullet in it carries a marker, which is common. **87 distinct sessions are named**, from `S110` to `S395`.

### 1.6 — the ten largest units

| # | bytes | class | section | opening |
|---|---|---|---|---|
| 33 | 25,772 | `finding` | Architecture | Paired-design null limit — CCC and RSC (P82, sized at S350): |
| 21 | 22,302 | `finding` | Architecture | P120's gap closes at ONE line, and the two numbers were neve |
| 94 | 14,447 | `convention` | Active Conventions | Per-unit display: pick the primitive from the unit's shape, |
| 51 | 13,520 | `finding` | Architecture | The display contract's LABEL side — headings, units and fram |
| 39 | 13,066 | `finding` | Architecture | aggregatePerGroup's two arms fail in OPPOSITE directions und |
| 48 | 10,019 | `finding` | Architecture | Three modes: QC / Peer review / Forensics — same engine outp |
| 87 | 9,128 | `finding` | Active Conventions | Taking the better of two arms is FOURTEEN of the 29 tests, n |
| 19 | 8,824 | `finding` | Architecture | Inter-Replicate Correlation's standard error is wrong by a f |
| 86 | 7,983 | `finding` | Active Conventions | A p-value ON its permutation floor is a zero exceedance coun |
| 49 | 7,654 | `finding` | Architecture | Tier drivers — FOUR levels, FIVE shapes, and the file verdic |

Those ten are 132,715 bytes — 34.2% of the classified mass in 4.3% of the units.

## 2 — the per-unit table

`#` is the unit index the classification is keyed on. `line` is the line `CLAUDE.md` starts the
unit at, at the commit named above. `mixed` names the secondary class where the unit carries
substantial material of another.

| # | section | line | bytes | class | mixed | marker | opening 60 chars | note |
|---|---|---|---|---|---|---|---|---|
| 0 | Arch | 44 | 3,231 | `specification` | finding | S340 | PRNG — one stream per test (S340): createPRNGFactory(matrix) |  |
| 1 | Arch | 48 | 139 | `specification` | — | — | ConditionContext: createConditionContext() — uniform interfa |  |
| 2 | Arch | 49 | 6,689 | `specification` | finding | S383 | The column-group drop rule is named once, and a header click |  |
| 3 | Arch | 59 | 2,322 | `finding` | convention | S393 | The grouping confirm's cost is MEASURED, and it is zero on t |  |
| 4 | Arch | 61 | 1,727 | `finding` | — | S393 | The arm-B probe had three C10-shaped assumptions, all now fi |  |
| 5 | Arch | 63 | 482 | `specification` | — | S118 | Row Semantics Gate (S118): Import-stage flag rowSemantics ∈ |  |
| 6 | Arch | 64 | 252 | `specification` | — | — | Convergence: buildConvergence() → { grid, hotspots, pattern, |  |
| 7 | Arch | 65 | 361 | `convention` | specification | — | Engine-owned classifications: Engine results carry pre-compu |  |
| 8 | Arch | 66 | 1,472 | `specification` | convention | — | flaggedRowIndices per-row test field (S162a): |  |
| 9 | Arch | 71 | 2,180 | `specification` | finding | S369 | DupDet BH-FDR is FIVE p-values, not four (corrected S369). d |  |
| 10 | Arch | 73 | 306 | `specification` | — | — | Sub-unit BH-FDR escalation: Autocorrelation, Kurtosis, Const | contradicted by unit 87, which calls this roster line stale for Selective Noise |
| 11 | Arch | 74 | 320 | `specification` | — | — | Autocorrelation lags 1–5: Engine result exposes lagTable (pa |  |
| 12 | Arch | 75 | 370 | `specification` | — | — | Windowed Autocorrelation: Separate test + card from Autocorr |  |
| 13 | Arch | 76 | 165 | `specification` | — | — | Benford First Digit applicability gates: Engine returns N/A |  |
| 14 | Arch | 77 | 249 | `specification` | — | — | Excess Kurtosis effect-size gate: Engine result exposes esGa |  |
| 15 | Arch | 78 | 675 | `specification` | — | S113 | Cross-Condition Consistency (Track D): Framework test in Dim |  |
| 16 | Arch | 79 | 670 | `specification` | convention | S352 | The s estimator lives at test/s-dispersion.mjs (lifted there |  |
| 17 | Arch | 80 | 2,589 | `finding` | — | S361 | A CONDITION-level noise difference contaminates the cross-co |  |
| 18 | Arch | 84 | 2,655 | `finding` | — | S361 | The battery does not respond to a between-condition noise di |  |
| 19 | Arch | 90 | 8,824 | `finding` | convention | S362 | Inter-Replicate Correlation's standard error is wrong by a f |  |
| 20 | Arch | 105 | 7,281 | `finding` | convention | S361 | The S361 ladder is NOT degenerate — one test reads it end to |  |
| 21 | Arch | 118 | 22,302 | `finding` | convention | S364 | P120's gap closes at ONE line, and the two numbers were neve |  |
| 22 | Arch | 158 | 4,639 | `finding` | convention | S365 | P124's census is three callers and the exposure splits three |  |
| 23 | Arch | 164 | 6,948 | `finding` | convention | S366 | The five unlabelled fixtures have provenance, all of it in s |  |
| 24 | Arch | 175 | 3,496 | `finding` | convention | S367 | The register is 89 rows and one expression counts it, but on |  |
| 25 | Arch | 183 | 490 | `finding` | convention | S352 | corrected clamps at 0, and at low replicate counts the bias |  |
| 26 | Arch | 184 | 900 | `finding` | — | S352 | s cannot be bounded on the real-world corpus, and the reason |  |
| 27 | Arch | 185 | 428 | `convention` | — | S352 | Build the positive control at the CORPUS's parameters, not t |  |
| 28 | Arch | 186 | 473 | `specification` | convention | S352 | The real-world corpus IS in the repo, at corpus-data/ — 33 f |  |
| 29 | Arch | 187 | 717 | `finding` | — | S352 | C11's Residual Spike Correlation catch reads UNPAIRED, so P8 |  |
| 30 | Arch | 188 | 395 | `finding` | — | S352 | On real deposits the pairing rule reaches mostly by the STRU |  |
| 31 | Arch | 189 | 500 | `convention` | finding | S352 | A probe that cannot express one branch of a rule under-repor |  |
| 32 | Arch | 190 | 5,327 | `specification` | finding, convention | S351 | Paired-design skip — P82 and P86 BOTH IMPLEMENTED (src/analy |  |
| 33 | Arch | 200 | 25,772 | `finding` | convention | S350 | Paired-design null limit — CCC and RSC (P82, sized at S350): | largest unit in the file |
| 34 | Arch | 248 | 215 | `specification` | convention | — | ConstOffset all-pairs: Invocation bypasses aggregatePerGroup |  |
| 35 | Arch | 249 | 195 | `specification` | — | — | Mahalanobis row BH-FDR: Per-row outlier identification via S |  |
| 36 | Arch | 250 | 880 | `specification` | convention | S127 | Mahalanobis dispatch — stratified-only on multi-condition ro |  |
| 37 | Arch | 251 | 758 | `specification` | — | S110 | Blocked Mahalanobis (§2.6b, S110): Dim III sibling of §2.6; |  |
| 38 | Arch | 252 | 703 | `specification` | convention | — | Fisher's-combination exempt list: Set-based lookup in src/an | 7 entries confirmed at source |
| 39 | Arch | 253 | 13,066 | `finding` | convention | S369 | aggregatePerGroup's two arms fail in OPPOSITE directions und |  |
| 40 | Arch | 276 | 2,261 | `specification` | — | S128 | Test-onboarding dispatch-map checklist: when adding a new te | the dispatch's named type case |
| 41 | Arch | 277 | 1,641 | `convention` | — | S340 | Further test-onboarding checks (alongside the FISHER_EXEMPT |  |
| 42 | Arch | 283 | 484 | `specification` | convention | S172 | dataType routes test behaviour via two independent channels, |  |
| 43 | Arch | 284 | 3,162 | `specification` | convention | S335 | Declined reasons carry a shared cause and a per-test tail (S |  |
| 44 | Arch | 291 | 5,633 | `specification` | finding, convention | S354 | The battery has SIX coverage states, and the sixth is withhe |  |
| 45 | Arch | 301 | 550 | `specification` | — | S111 | VST signed-data gate (S111, src/stats/vst.js): requiresPosit |  |
| 46 | Arch | 302 | 283 | `specification` | — | — | Reconciled test-input routing: 13 TRANSFORMED (consume hasVS | contradicted by unit 48, which names this line's undercount explicitly |
| 47 | Arch | 303 | 624 | `specification` | — | S114 | VFS dual-pass (S114, src/tests/valueFrequencySpike.js): Sing |  |
| 48 | Arch | 304 | 10,019 | `finding` | convention | S372 | Three modes: QC / Peer review / Forensics — same engine outp |  |
| 49 | Arch | 319 | 7,654 | `finding` | convention | S372 | Tier drivers — FOUR levels, FIVE shapes, and the file verdic |  |
| 50 | Arch | 333 | 426 | `specification` | — | S116 | Severity (S116): computeSeverity() in src/analysis/severity. |  |
| 51 | Arch | 334 | 13,520 | `finding` | convention | S373 | The display contract's LABEL side — headings, units and fram |  |
| 52 | Arch | 358 | 1,207 | `convention` | specification | — | Coordinates: originalFileRow() maps matrix indices to file r |  |
| 53 | Arch | 359 | 134 | `specification` | — | — | Excel: Import via dynamic SheetJS; metadata via JSZip. Expor |  |
| 54 | Arch | 360 | 146 | `convention` | — | — | Group terminology: src/ uses 'group' for column-grouping uni |  |
| 55 | Arch | 361 | 1,380 | `convention` | specification | — | IRC windowed entries carry matCol1/matCol2 — use them, don't |  |
| 56 | Arch | 362 | 675 | `convention` | — | — | §2 cell-highlight emission — extractCellFlags branches must |  |
| 57 | Arch | 363 | 1,231 | `specification` | convention | — | Row-Mean Runs emits rowIdxs per sequence; row-local on the c |  |
| 58 | Arch | 364 | 1,633 | `specification` | convention | — | IRC gate admits windowed OR suspicious dataset-level entries |  |
| 59 | Arch | 365 | 468 | `convention` | — | S153 | Measurement type / Data type terminology (S153 A2): Do not u |  |
| 60 | Arch | 366 | 935 | `specification` | — | — | FindingComposers registry (S162b): src/analysis/findingCompo |  |
| 61 | Arch | 367 | 797 | `specification` | — | S161 | HandoffModel (S161): src/analysis/handoffModel.js exports bu |  |
| 62 | Arch | 368 | 344 | `specification` | — | — | AsideCallout: src/components/shared/AsideCallout.jsx — left- |  |
| 63 | Arch | 369 | 2,525 | `finding` | — | S379 | Severity 3 has FOUR syntactic arms and the corpus never come |  |
| 64 | Arch | 373 | 2,716 | `finding` | convention | S379 | The battery returns severity 3 on every honest real deposit |  |
| 65 | Arch | 378 | 2,962 | `finding` | convention | S378 | A one-column group is DROPPED, not kept (S378, measured). ag |  |
| 66 | Arch | 384 | 5,364 | `specification` | finding | S382 | detectVST's assay-fallback branch is reached by FOUR differe |  |
| 67 | Arch | 394 | 1,914 | `finding` | convention | S382 | probe-s372-display-dump.mjs builds its own importConfig from |  |
| 68 | Arch | 397 | 3,612 | `finding` | convention | S290 | The A1 per-unit display programme stopped at S290, not S285, |  |
| 69 | Arch | 404 | 3,613 | `finding` | convention | S394 | Role inference inverts designs by TWO INDEPENDENT MECHANISMS |  |
| 70 | Arch | 410 | 2,810 | `specification` | finding | S394 | A condition is a MERGED label, so the levels are distinct ob |  |
| 71 | Arch | 417 | 3,522 | `finding` | — | S395 | The first round-2 deposit is read and nothing about it is an |  |
| 72 | Arch | 424 | 4,183 | `finding` | — | S395 | pos-01's two gate facts, and both gates block (S395 second p |  |
| 73 | Arch | 432 | 4,332 | `finding` | convention | S395 | The thirty are read structurally, and three things round 1 c |  |
| 74 | Conv | 443 | 335 | `convention` | — | — | STOP AND CHECK: Am I over-analyzing? Before writing more tha |  |
| 75 | Conv | 444 | 406 | `convention` | — | — | Surgical changes only. Every changed line must trace directl |  |
| 76 | Conv | 445 | 400 | `convention` | — | — | Dead-code prune discipline. |  |
| 77 | Conv | 449 | 561 | `convention` | — | S283 | Plan multi-step work. For changes touching 3+ files or invol |  |
| 78 | Conv | 450 | 428 | `convention` | — | S118 | Write in plain English. Session summaries, STATUS edits, and |  |
| 79 | Conv | 451 | 514 | `convention` | — | — | Structure-first gate for suite-spanning work. Before scoping |  |
| 80 | Conv | 452 | 713 | `convention` | finding | S344 | A sweep searches the quantity, not the notation — and the us |  |
| 81 | Conv | 453 | 846 | `convention` | finding | S356 | A probe that edits a CSV as text must preserve the line term |  |
| 82 | Conv | 454 | 1,833 | `convention` | finding | S356 | A test's row-count branch may not be counting rows — check ( |  |
| 83 | Conv | 458 | 3,706 | `finding` | convention | S357 | The SEEDS=8 instability is three cells and they are not one |  |
| 84 | Conv | 465 | 2,545 | `specification` | finding | S357 | The large clean fixture exists and is deliberately OUT of FI |  |
| 85 | Conv | 469 | 607 | `specification` | convention | S357 | Eight sites in the battery scale a resample count from the d |  |
| 86 | Conv | 470 | 7,983 | `finding` | convention | S359 | A p-value ON its permutation floor is a zero exceedance coun |  |
| 87 | Conv | 481 | 9,128 | `finding` | convention | S360 | Taking the better of two arms is FOURTEEN of the 29 tests, n |  |
| 88 | Conv | 497 | 4,417 | `specification` | finding | S360 | The reachable tier set is declared per test per branch, and |  |
| 89 | Conv | 505 | 458 | `convention` | specification | S357 | detectVST returns a decision, not a matrix (S357). Its retur |  |
| 90 | Conv | 506 | 3,575 | `finding` | convention | S355 | STATUS's parked register allocates numbers and defines nothi |  |
| 91 | Conv | 514 | 635 | `convention` | — | S355 | A routing arrow needs a landing check (S355). Every (→ desti |  |
| 92 | Conv | 515 | 977 | `convention` | — | S355 | Every artifact carrying a session number takes the running s |  |
| 93 | Conv | 516 | 693 | `convention` | — | S327 | Measure what a figure is a figure *of* before asserting anyt |  |
| 94 | Conv | 517 | 14,447 | `convention` | finding | S284 | Per-unit display: pick the primitive from the unit's shape, | opens as a rule; the bulk of its bytes are findings |
| 95 | Conv | 535 | 529 | `convention` | — | — | New correctness rules apply retroactively to shipped work, s |  |
| 96 | Conv | 536 | 564 | `convention` | — | S248 | Never repair a verdict-load-bearing denominator in place — a |  |
| 97 | Conv | 537 | 3,610 | `convention` | finding | S283 | "Done / clean / settled" is a verification trigger, not a st |  |
| 98 | Conv | 543 | 892 | `specification` | convention | — | test/floors/ is the home for floor and reachable-tier declar |  |
| 99 | Conv | 544 | 375 | `convention` | — | S351 | test/probes/ holds the tracked probes — new probes go there, | dated: says 75 probe files at S351 open; 142 tracked today |
| 100 | Conv | 545 | 5,261 | `specification` | finding | S391 | The round-2 sheet choice is MEASURED by corpus-run.mjs --inv |  |
| 101 | Conv | 552 | 511 | `finding` | convention | S391 | corpus-data/ is the ONE .gitignore directory entry carrying |  |
| 102 | Conv | 553 | 3,348 | `convention` | finding | S372 | Promote a session via ./scripts/promote.sh <worktree-name> " |  |
| 103 | Conv | 559 | 351 | `convention` | — | — | Run a worktree's dev server via ./scripts/dev.sh <worktree-n |  |
| 104 | Conv | 560 | 2,560 | `convention` | — | S343 | Worktree workflow. |  |
| 105 | Conv | 568 | 593 | `specification` | convention | — | Worktree symlinks for gitignored Chat-owned docs. The untrac |  |
| 106 | Conv | 569 | 607 | `convention` | — | S163 | Continuing sessions attach to the existing branch worktree. |  |
| 107 | Conv | 570 | 205 | `convention` | — | — | Worktree precondition fires BEFORE the first edit, not as po |  |
| 108 | Conv | 571 | 445 | `convention` | — | S175 | Pre-flight after the first Edit/Write of a session: md5sum < |  |
| 109 | Conv | 572 | 295 | `convention` | — | — | Worktree hygiene. Legacy worktrees accumulate in .claude/wor |  |
| 110 | Conv | 573 | 404 | `convention` | — | — | Chat-authored content only reaches Code by physical paste. M |  |
| 111 | Conv | 574 | 334 | `convention` | — | — | A Code prompt cannot carry a file — the dispatch-constructio |  |
| 112 | Conv | 575 | 334 | `convention` | — | — | Commit disposition follows ownership class, not edit size. A |  |
| 113 | Conv | 576 | 1,334 | `convention` | — | S283 | Screenshot / verification-gate discipline. |  |
| 114 | Conv | 584 | 1,088 | `convention` | finding | S382 | Before mandating a check, name the FIELD the change lives in |  |
| 115 | Conv | 585 | 908 | `convention` | finding | S382 | A doc dispatch's replacement text arrives intact only inside |  |
| 116 | Conv | 586 | 517 | `convention` | — | S382 | An expected property count is PARSED from the block it descr |  |
| 117 | Conv | 587 | 486 | `convention` | — | S382 | The untouched-region diff measures the COMPLEMENT of what is |  |
| 118 | Conv | 588 | 545 | `convention` | — | S382 | Every tally over a table is parsed, never read — including t |  |
| 119 | Conv | 589 | 532 | `convention` | — | S382 | A corrected dispatch needs a NEW FILENAME (S382). An edit ma |  |
| 120 | Conv | 590 | 679 | `convention` | finding | S382 | A co-land makes its own doc half false at the moment it land |  |
| 121 | Conv | 591 | 399 | `convention` | — | S382 | A range computed against the working tree is not a range aga |  |
| 122 | Conv | 592 | 507 | `convention` | — | S382 | Doubting a RED result is the same discipline as doubting a g |  |
| 123 | Conv | 593 | 505 | `convention` | — | S382 | A markdown table needs a blank line above it or it is absorb |  |
| 124 | Conv | 594 | 434 | `convention` | — | S382 | A struck-through entry under a heading that reads *Open* is |  |
| 125 | Conv | 595 | 378 | `convention` | — | — | Chat-owned tracked docs commit to main BEFORE a close-promot |  |
| 126 | Conv | 596 | 266 | `convention` | — | — | Halt-and-confirm between doc-merge and promote is standard o |  |
| 127 | Conv | 597 | 1,243 | `unclear` | — | — | §2 chrome refinements. F1–F4, F7 (Show-all/Clear-all placeme | an index of numbered chrome items (F1-F4, F7) whose content is elsewhere; cannot tell from the text whether it is a spec, a pointer or a changelog |
| 128 | Conv | 601 | 895 | `specification` | — | — | §2 multi-region selection: ForensicsBody owns selection = { |  |
| 129 | Conv | 603 | 334 | `convention` | — | — | No scattered dispatch. When multiple tests or components nee |  |
| 130 | Conv | 604 | 537 | `convention` | — | S284 | The SECOND consumer of a shared primitive is the real primit |  |
| 131 | Conv | 605 | 317 | `convention` | — | — | Diagnostic findings describe state, not bugs. Before scoping |  |
| 132 | Conv | 606 | 528 | `convention` | finding | S342 | Recoverability is a property of a return site, not a test (S |  |
| 133 | Conv | 607 | 528 | `convention` | — | — | Test verdict reads off the localised finding output the test |  |
| 134 | Conv | 608 | 898 | `specification` | — | — | MiniCardLayout: All 28 MiniCards use it. Props: footer, look |  |
| 135 | Conv | 612 | 191 | `unclear` | — | — | Implications: Data-driven with conditional variants where ne | a bare parenthetical list of conditional variants; cannot tell whether it is a spec of shipped copy or a record of what was added |
| 136 | Conv | 613 | 266 | `specification` | convention | S151 | SUB_HEAD: Exported from styles.js. { fontSize:FS.sm, fontFam |  |
| 137 | Conv | 614 | 454 | `convention` | specification | S351 | SEVERITY_WORD is retired — don't reach for it (corrected S35 |  |
| 138 | Conv | 615 | 2,567 | `specification` | — | — | §2 sticky surface + active-region lifecycle: ForensicsBody o |  |
| 139 | Conv | 620 | 472 | `specification` | — | — | §1 Verdict surface: VerdictBanner consumes dataProfile = { i |  |
| 140 | Conv | 621 | 154 | `convention` | specification | — | makeRowMapper: makeRowMapper(importConfig, rowMap) in coordi |  |
| 141 | Conv | 622 | 1,395 | `specification` | convention | S372 | MINIPLOT_REGISTRY: MiniPlot.jsx dispatches to MiniCards via | 29 keys / 28 components confirmed at source |
| 142 | Conv | 623 | 135 | `specification` | — | — | TestCard: Minimal wrapper — just HideHeadlineCtx.Provider + |  |
| 143 | Conv | 624 | 1,592 | `specification` | convention | — | Footer convention: |  |
| 144 | Conv | 629 | 606 | `specification` | — | — | Methodology copy registers per chrome surface: MiniCard foot |  |
| 145 | Conv | 630 | 109 | `specification` | — | — | Badge p-value: LOW/Clear tests never show p in the header ba |  |
| 146 | Conv | 631 | 381 | `specification` | convention | — | PlotLayout: Wraps SVG only. Never double-nest — if a plot co |  |
| 147 | Conv | 632 | 137 | `specification` | — | — | EvidenceTable: Default maxHeight=200, sticky header. identif |  |
| 148 | Conv | 633 | 1,031 | `convention` | specification | S184 | Per-condition MiniCard detail tables bind to subDetails, not |  |
| 149 | Conv | 634 | 293 | `specification` | — | — | Convergence heatmap: Warm color ramp by flag count: 0=white, |  |
| 150 | Conv | 635 | 350 | `unclear` | — | — | Detail-table chrome (Excel-style header with condition spans | a feature list that defers its own spec elsewhere; cannot tell whether the list is authoritative or an index |
| 151 | Conv | 636 | 328 | `specification` | convention | — | Unified highlight dispatch: buildHighlightSpec(testKey, resu |  |
| 152 | Conv | 637 | 375 | `convention` | specification | — | Click-to-highlight overrides: per-test tints (IRC amber colu | says its own list is not authoritative - read the registry instead |
| 153 | Conv | 638 | 462 | `specification` | — | — | ScrollTable: Shared component (shared/ScrollTable.jsx) used |  |
| 154 | Conv | 639 | 282 | `specification` | — | — | IrcBracketStrip: DOM-measured column centres via useLayoutEf |  |
| 155 | Conv | 640 | 538 | `specification` | — | — | Frozen columns: # + consecutive LABEL/COND from left. SKIP a |  |
| 156 | Conv | 641 | 381 | `specification` | — | — | Column width rules: COL_W in styles.js. Tables use tableLayo |  |
| 157 | Conv | 642 | 406 | `specification` | — | S386 | ChartLegend swatches: "line" (line+dot), "dot" (circle, opti |  |
| 158 | Conv | 643 | 108 | `convention` | — | — | SVG fonts: PlotSVG sets FF.UI root. Numeric ticks/values → F |  |
| 159 | Conv | 644 | 271 | `convention` | specification | S151 | Chart captions: FS.xs, FF.UI, C.TEXT_3. No colour words — us |  |
| 160 | Conv | 645 | 132 | `convention` | — | — | Style constants: Never inline what has a shared constant. Ch |  |
| 161 | Conv | 646 | 504 | `specification` | — | — | Mahalanobis plot: Split x-axis — below-threshold region (40% |  |
| 162 | Conv | 647 | 177 | `convention` | — | — | LOESS changepoint labels: Use "between rows X and Y" (card t |  |
| 163 | Conv | 648 | 679 | `specification` | — | S247 | Sign strip rendering: Forward-fill zeros, then one rect per |  |
| 164 | Conv | 649 | 121 | `specification` | — | — | Frozen cell opacity: Sticky columns use blendOnto() (ScrollT |  |
| 165 | Conv | 650 | 187 | `convention` | specification | — | Finding template row mapping: Templates that embed row numbe | STALE against src/: names three templates taking toFileRow; keyFindingTemplates.js has five |
| 166 | Conv | 651 | 320 | `specification` | — | — | Test-result category taxonomy: TEST_MECHANISM is the canonic |  |
| 167 | Conv | 652 | 1,005 | `specification` | — | — | Auto-resolved import gates render as AUTO cards: Col-Rel and |  |
| 168 | Conv | 653 | 683 | `convention` | — | — | QC vs Review/Forensics copy discipline: QC mode ("Check my d |  |
| 169 | Conv | 654 | 1,010 | `specification` | — | S120 | Row Semantics provenance surface (S120): Two render sites ex |  |
| 170 | Conv | 655 | 1,619 | `specification` | — | — | Findings[] aggregator — canonical source-of-truth for downst |  |
| 171 | Conv | 662 | 633 | `specification` | convention | — | renderMode flag pattern: ReportView's Forensics ('full') bra |  |
| 172 | Conv | 663 | 505 | `convention` | — | — | Token discipline for colour: All colour references in code a |  |
| 173 | Conv | 664 | 280 | `convention` | — | — | Verify an asserted equivalence at the arithmetic, not from t |  |
| 174 | Conv | 665 | 324 | `convention` | — | — | A fix that touches a line can surface a sibling the inventor |  |
| 175 | Conv | 666 | 339 | `convention` | — | — | Split a retoken into mechanical versus decision, and ship on |  |
| 176 | Conv | 667 | 631 | `specification` | — | — | Forensics section IA: Forensics document branch renders five |  |
| 177 | Conv | 668 | 516 | `specification` | — | — | Producer threshold dual-emit (Mahalanobis Row Outlier): a hy |  |
| 178 | Conv | 669 | 207 | `specification` | — | — | Pill/chip ordering: pillsAndChips(findings) in StickySurface |  |
| 179 | Conv | 670 | 575 | `specification` | — | — | Findings.js fallback region for flagged-but-empty-evidence: |  |
| 180 | Conv | 671 | 606 | `convention` | specification | — | Fallback rules need verdict guards: a fallback that synthesi |  |
| 181 | Conv | 672 | 1,029 | `specification` | convention | — | Sticky scope = parent's vertical extent: |  |
| 182 | Conv | 675 | 456 | `specification` | — | — | Pill/chip colour family: HIGH/MOD chip → SEV_VERDICT[s].bg w |  |
| 183 | Conv | 676 | 239 | `specification` | — | — | SECTION_HEADER_TYPOGRAPHY (named export from Section.jsx) is |  |
| 184 | Conv | 677 | 578 | `specification` | — | — | Chip/pill activation contract: chip/pill onActivate?.(findin |  |
| 185 | Conv | 678 | 692 | `specification` | — | — | Aggregator-level region expansion: region shape on findings[ |  |
| 186 | Conv | 680 | 1,567 | `specification` | convention | — | finding.locality is the canonical lane / encoding classifier |  |
| 187 | Conv | 683 | 407 | `specification` | — | — | activeConvergence rebuilds the convergence grid from the act |  |
| 188 | Conv | 684 | 785 | `specification` | convention | — | <body style="overflow-anchor: none"> in index.html is REQUIR |  |
| 189 | Conv | 685 | 387 | `specification` | — | — | §2 horizontal density strip uses flex-grow proportional layo |  |
| 190 | Conv | 686 | 789 | `specification` | convention | — | Forensics symmetric pulse model: PulseProvider wraps the sev |  |
| 191 | Conv | 687 | 265 | `convention` | — | — | Decoupling rule for dual-surface components: when a single c |  |
| 192 | Conv | 688 | 348 | `specification` | — | — | Canonical modal pattern: position: fixed, inset: 0, rgba(0,0 |  |
| 193 | Conv | 689 | 301 | `specification` | — | — | heatmapProps bundle: Forensics consumers take a single heatm |  |
| 194 | Conv | 690 | 410 | `specification` | — | S227 | ExcerptTable canonical home: src/components/forensics/Excerp |  |
| 195 | Conv | 691 | 1,000 | `specification` | — | — | Typography registers — canonical home is TYPOGRAPHY-SYSTEM.m |  |
| 196 | Conv | 692 | 153 | `convention` | — | — | ImportView badge case: AUTO badge (passive provenance) is se |  |
| 197 | Conv | 693 | 193 | `convention` | — | — | Pin/✕ file-bar feature retired for v1.0: grep "window.storag |  |
| 198 | Conv | 694 | 605 | `convention` | specification | — | Chip-in-tinted-parent context overrides chip-bg rule: Chip b |  |
| 199 | Conv | 695 | 475 | `convention` | — | — | Chip-family chrome doesn't apply to non-chip elements: Chrom |  |
| 200 | Conv | 696 | 308 | `specification` | — | — | ImportView chip family: three chip families share a base sha |  |
| 201 | Conv | 697 | 789 | `convention` | — | — | Chrome principles: (1) button chrome foregrounds affordance, |  |
| 202 | Conv | 698 | 487 | `unclear` | — | — | A chrome change that triggered a page-height cascade can be | reads as a permission rather than a rule or a record; cannot tell whether it licenses an action or explains a past one |
| 203 | Conv | 699 | 527 | `convention` | — | — | Chip-tint tokens carry semantic identity, not generic colour |  |
| 204 | Conv | 700 | 721 | `convention` | specification | — | App voice: sentence case across user-facing labels: User-fac |  |
| 205 | Conv | 701 | 526 | `specification` | — | — | Shared-component + token locks: FindingChip/FindingPill cons |  |
| 206 | Conv | 702 | 658 | `convention` | — | — | Page-level primary CTA chrome is single per surface: Primary |  |
| 207 | Conv | 703 | 1,316 | `convention` | finding | S340 | Match on what ran, not on test names. Some tests carry one n |  |
| 208 | Conv | 705 | 519 | `convention` | finding | S364 | A dispatch's mode: line is unverifiable from inside the sess |  |
| 209 | Conv | 706 | 646 | `convention` | — | S325 | On a genuine fork, do not proceed on your own pick in silenc |  |
| 210 | Conv | 707 | 3,554 | `finding` | convention | S388 | A card heading names the engine total; the display keeps its |  |
| 211 | Conv | 712 | 4,462 | `finding` | convention | S388 | The exports each compose their own copy of every count, so 2 |  |
| 212 | Conv | 719 | 4,575 | `finding` | convention | S389 | P209 answered: a flagged result can NEVER arrive under a dis |  |
| 213 | Conv | 728 | 4,822 | `convention` | finding | S389 | The batch's pass condition is EXIT 0 WITH ZERO UNDECLARED FA | the dispatch's named convention type case |
| 214 | Conv | 737 | 463 | `convention` | — | S394 | Run a new predicate against the instance it was named from b |  |
| 215 | Conv | 738 | 296 | `convention` | — | S394 | Check which side of a filter a count is taken from (S394). s |  |
| 216 | Conv | 739 | 546 | `convention` | finding | S394 | A/B arms cannot share a PRNG stream, so an arm comparison ne |  |
| 217 | Conv | 740 | 260 | `convention` | — | S394 | Check whether a corpus-level ratio survives removing its lar |  |
| 218 | Conv | 741 | 239 | `convention` | — | S394 | git branch --list belongs in every opening and closing read |  |
| 219 | Conv | 742 | 342 | `convention` | — | S394 | Kill any dev server before dispatching (S394). Vite watches |  |
| 220 | Valid | 768 | 726 | `specification` | finding | S111 | CSV datasets in test/fixtures/ (DS01–DS11, DS12a/b, DS13–DS1 | dated: 'Post-S111 batch: 27/27 passed' predates the S384 known-failure register |
| 221 | Valid | 770 | 1,269 | `specification` | convention | S183 | Validation gate (S183 Phase 2 completeness). validate-batch. |  |
| 222 | Valid | 772 | 2,372 | `specification` | convention | S358 | The flag matrix pins every cell, and it is the only assertio |  |
| 223 | Valid | 778 | 494 | `convention` | — | — | Batch-green is engine-only — presentational defects are invi |  |
| 224 | Valid | 780 | 527 | `finding` | — | S325 | And the blind spot is wider than presentation (S325). The ba |  |
| 225 | Close | 805 | 107 | `convention` | — | — | On "close S[N]" / "session close" / "write handoff", run thi |  |
| 226 | Close | 807 | 135 | `convention` | — | — | Commit to the worktree branch before declaring complete; com |  |
| 227 | Close | 808 | 501 | `convention` | — | S368 | Pre-merge verify — dev-server sanity in the worktree, then t | contradicted by unit 213: names a 27/28 count as the steady state, which unit 213 calls stale as a pass criterion |
| 228 | Close | 809 | 316 | `convention` | — | S175 | Promote — git merge claude/<name> → git push origin main, or |  |
| 229 | Close | 810 | 330 | `convention` | — | — | SESSION[N]-SUMMARY.md — author scope, implementation detail, |  |
| 230 | Close | 811 | 4,330 | `convention` | — | S247 | Worktree teardown — remove the just-merged worktree (safe on |  |
| 231 | Close | 823 | 302 | `convention` | — | S175 | Worktree-write pre-flight (S175 bug) — apply the first-Edit/ |  |
| 232 | Close | 824 | 302 | `convention` | — | — | Emit a close-out state block — commit hash, batch status, de |  |
| 233 | Close | 826 | 365 | `convention` | — | — | STATUS.md is Chat-authored — Code does not edit it. If CLAUD |  |
| 234 | Close | 828 | 250 | `convention` | — | — | The hinge between the two roles: Chat's Decisions block (CHA |  |

## 3 — check one: does a unit duplicate a tracked `docs/shared/` document?

**32 units name a `docs/` markdown file in their own text, and they are 197,869 bytes — 51.0% of the classified mass.** 28 of them name a **tracked** document.

These are the cheapest possible relocations, because the unit has already named where its content
lives. **This does not establish that the document says the same thing** — the check is that a
committed home is named, not that the content is duplicated there. Verifying the overlap is a
per-unit read and was not performed.

| # | bytes | class | document named | tracked | opening |
|---|---|---|---|---|---|
| 0 | 3,231 | `specification` | `docs/shared/PERMUTATION-COUNT-FEASIBILITY.md` | yes | PRNG — one stream per test (S340): createPRNGFactory(matrix) |
| 3 | 2,322 | `finding` | `docs/shared/S393-GROUPING-CONFIRM-COST.md` | yes | The grouping confirm's cost is MEASURED, and it is zero on t |
| 18 | 2,655 | `finding` | `docs/shared/S361-CONDITION-NOISE-LADDER.md` | yes | The battery does not respond to a between-condition noise di |
| 20 | 7,281 | `finding` | `docs/shared/S363-KURTOSIS-DOSE-RESPONSE.md` | yes | The S361 ladder is NOT degenerate — one test reads it end to |
| 21 | 22,302 | `finding` | `docs/shared/S364-PROMOTION-GAP.md`, `docs/shared/S364B-STEP0-CHECKPOINT.md` +3 | yes | P120's gap closes at ONE line, and the two numbers were neve |
| 22 | 4,639 | `finding` | `docs/shared/SESSION365-AUDIT-SUMMARY.md` | yes | P124's census is three callers and the exposure splits three |
| 23 | 6,948 | `finding` | `docs/shared/SESSION366-AUDIT-SUMMARY.md`, `docs/shared/archive/SESSION296-FIXTURE-BUILD-FINDINGS.md` | yes | The five unlabelled fixtures have provenance, all of it in s |
| 24 | 3,496 | `finding` | `docs/shared/SESSION367-AUDIT-SUMMARY.md` | yes | The register is 89 rows and one expression counts it, but on |
| 32 | 5,327 | `specification` | `docs/shared/SESSION351-AUDIT-SUMMARY.md` | yes | Paired-design skip — P82 and P86 BOTH IMPLEMENTED (src/analy |
| 33 | 25,772 | `finding` | `docs/shared/SESSION350-AUDIT-SUMMARY.md`, `docs/shared/S350-CLASSB-SWEEP-DATA.md` +3 | yes | Paired-design null limit — CCC and RSC (P82, sized at S350): |
| 37 | 758 | `specification` | `docs/PERF-BASELINE.md` | yes | Blocked Mahalanobis (§2.6b, S110): Dim III sibling of §2.6; |
| 39 | 13,066 | `finding` | `docs/shared/S369-P83-AGGREGATION-CALIBRATION.md`, `docs/shared/S369-P83-NULL-CORRELATION.md` | yes | aggregatePerGroup's two arms fail in OPPOSITE directions und |
| 48 | 10,019 | `finding` | `docs/shared/S372-SURFACE-ROSTER.md` | yes | Three modes: QC / Peer review / Forensics — same engine outp |
| 49 | 7,654 | `finding` | `docs/shared/S372-TIER-DRIVER-CENSUS.md`, `docs/shared/S364-PROMOTION-GAP.md` | yes | Tier drivers — FOUR levels, FIVE shapes, and the file verdic |
| 51 | 13,520 | `finding` | `docs/shared/S373-DISPLAY-LABEL-CENSUS.md` | yes | The display contract's LABEL side — headings, units and fram |
| 60 | 935 | `specification` | `docs/shared/S162b-CALIBRATION.md` | **no** | FindingComposers registry (S162b): src/analysis/findingCompo |
| 68 | 3,612 | `finding` | `docs/sessions/SESSION382-SUMMARY.md` | **no** | The A1 per-unit display programme stopped at S290, not S285, |
| 69 | 3,613 | `finding` | `docs/shared/ROLE-INFERENCE-INVERSION-CENSUS.md` | yes | Role inference inverts designs by TWO INDEPENDENT MECHANISMS |
| 71 | 3,522 | `finding` | `docs/shared/S395-POS01-STRUCTURE.md` | yes | The first round-2 deposit is read and nothing about it is an |
| 72 | 4,183 | `finding` | `docs/shared/S395-POS01-STRUCTURE.md` | yes | pos-01's two gate facts, and both gates block (S395 second p |
| 73 | 4,332 | `finding` | `docs/shared/S395-ROUND2-STRUCTURE-TABLE.md` | yes | The thirty are read structurally, and three things round 1 c |
| 82 | 1,833 | `convention` | `docs/shared/CCC-B-SCALING.md` | yes | A test's row-count branch may not be counting rows — check ( |
| 83 | 3,706 | `finding` | `docs/shared/SEEDS8-STRADDLE.md` | yes | The SEEDS=8 instability is three cells and they are not one |
| 84 | 2,545 | `specification` | `docs/shared/LARGE-CLEAN-FIXTURE.md` | yes | The large clean fixture exists and is deliberately OUT of FI |
| 87 | 9,128 | `finding` | `docs/shared/S360-EXTREME-STATISTIC-CENSUS.md` | yes | Taking the better of two arms is FOURTEEN of the 29 tests, n |
| 90 | 3,575 | `finding` | `docs/shared/SESSION355-AUDIT-SUMMARY.md` | yes | STATUS's parked register allocates numbers and defines nothi |
| 94 | 14,447 | `convention` | `docs/shared/PLOT-COLOUR-SEMANTICS.md`, `docs/shared/INVESTIGATION-DISPLAY-SPEC.md` | yes | Per-unit display: pick the primitive from the unit's shape, |
| 104 | 2,560 | `convention` | `docs/shared/V1X-FUTURE-WORK.md`, `docs/shared/METHODOLOGY.md` +3 | yes | Worktree workflow. |
| 105 | 593 | `specification` | `docs/shared/project-instructions.md` | **no** | Worktree symlinks for gitignored Chat-owned docs. The untrac |
| 134 | 898 | `specification` | `docs/shared/archive/card-text-all-25-final.md` | **no** | MiniCardLayout: All 28 MiniCards use it. Props: footer, look |
| 212 | 4,575 | `finding` | `docs/shared/S389-P209-MECHANISM-DROP.md` | yes | P209 answered: a flagged result can NEVER arrive under a dis |
| 213 | 4,822 | `convention` | `docs/shared/S389-KNOWN-FAILURE-REGISTER.md` | yes | The batch's pass condition is EXIT 0 WITH ZERO UNDECLARED FA |

**4 name only an untracked or archived path** (units 60, 68, 105, 134), so for those the named home is not itself in the repository and relocation would need one made first.

## 4 — check two: contradictions

Reported as pairs with both line numbers. **Not resolved here.** Three of the four are
*self-declared*: a later unit states in its own text that an earlier one is wrong, and neither was
changed. That is what an append-only file produces.

| # | pair | lines | what disagrees | status |
|---|---|---|---|---|
| C1 | 46 ↔ 48 | 302 ↔ 304 | Unit 46 gives the VST routing split as **13 TRANSFORMED + 14 RAW + 1 STRUCTURAL**. Unit 48 gives **13 + 15 + 1** and says *"this file's own 'Reconciled test-input routing' line carries the same undercount"*. | self-declared, unreconciled |
| C2 | 10 ↔ 87 | 73 ↔ 481 | Unit 10 lists **Selective Noise** on the sub-unit BH-FDR escalation roster. Unit 87 says *"Selective Noise is on the sub-unit escalation roster above and should not be … The roster line is stale, the code is not."* | self-declared, unreconciled |
| C3 | 165 ↔ 51 | 650 ↔ 334 | Unit 165 says **three** finding templates take `toFileRow` and names them. Unit 51 says **five**, *"corrected S373 from an earlier count of three"*. **Settled at source: `keyFindingTemplates.js` has five** (`:190`, `:268`, `:361`, `:398`, `:447`). | self-declared **and** confirmed against `src/` |
| C4 | 227 ↔ 213 | 808 ↔ 728 | Close-out step 2 gives the batch steady state as **"27/28, DS12b the sole failure"**. Unit 213 says the pass condition *"is not a count"* and that this phrasing *"describes the PRE-S384 runner and is stale as a pass criterion"*. | self-declared, unreconciled |

**C1, C2 and C4 all point the same way**: the correcting unit was appended and the corrected unit
was left in place, so both readings are live in a file read start to finish every session.

## 5 — check three: staleness against `src/` as it stands

Checked at source where the check is cheap. Where it is not, the row says `unverified` rather than
guessing — the dispatch's instruction, and the honest answer for a claim whose verification is a
multi-file read.

| claim | unit | asserted | measured at source | verdict |
|---|---|---|---|---|
| `FISHER_EXEMPT` entries | 38 | 7 | 7 | **current** |
| `MINIPLOT_REGISTRY` keys | 141 | 29 | 29 | **current** |
| distinct MiniCard components | 141 | 28 | 28 `MiniCard_*.jsx` | **current** |
| files in `src/tests/` | Directory Structure | 30 | 30 | **current** |
| `ROW_SEMANTICS_FULL_SKIP` members | 5 | 5 | 5 | **current** |
| `TEST_MECHANISM` keys | 166 | 29 (5 mechanism keys, 29 tests) | 29 | **current** |
| templates taking `toFileRow` | 165 | three, named | **five**, named at `:190 :268 :361 :398 :447` | **STALE** |
| tracked files in `test/probes/` | 99 | 75 *"at S351 open"* | 142 | **dated, not wrong** — the claim is anchored to S351 |
| batch steady state | 220 | *"Post-S111 batch: 27/27 passed"* | 28 checks, 27 passed + 1 declared | **dated** — predates the S384 register |
| VST routing split 13/14/1 | 46 | 14 RAW | not cheaply derivable from one grep | `unverified` — but see C1 |
| Selective Noise sub-unit escalation | 10 | on the roster | `selectiveNoise.js` does call `bhFDR`, which does not settle whether it *escalates* | `unverified` — but see C2 |

**One stale claim outside the classified sections**, reported because it was found while checking:
§What This Is says **167 modules**; `find src -name '*.js' -o -name '*.jsx'` returns **165**. That section is under 2 KB and is not a classified unit.

**Six of eleven checkable claims are current, one is stale, two are dated-but-anchored, and two
could not be checked cheaply.** No conclusion is drawn from that ratio about the unchecked
remainder: these are the claims that happened to be cheap to verify, not a sample of anything.

## 6 — what this record does not settle

- **It does not decide what is cut.** No deletion list, no recommendation, no ranking by
  removability. A cut is a separate decision taken against these numbers, and proposing one here
  would price it before it was measured.
- **It does not establish that any `finding` is safe to remove.** §1.4 is the reason: only
  10 of 37 findings carry no embedded instruction. A `finding` class means the unit's dominant
  function is evidence — not that removing it would cost nothing.
- **The `unclear` rows are unclassified, not neutral.** Four units where the text alone does not say
  what the reader is meant to do with it. They are not a residual bucket and they are not "probably
  fine": they are the rows a cut must read before touching.
- **The four-way class is a judgement, and a contestable one.** Sizes, line numbers, markers and the
  document cross-reference are computed. The class and the mixed flag are not, and a second reader
  would move some rows.
- **Check one does not show duplication.** It shows that a unit names a committed document. Whether
  the document already carries the content is a per-unit read that was not performed.
- **Check two does not resolve any contradiction**, and check three does not say what a stale claim
  should become. Both are reports.
- **Two source checks are `unverified` and stay that way.** They are not "probably fine".
- **Nothing about `STATUS.md`,** which has its own draining instruction and is a different file with
  a different contract. This record makes no claim about it.
- **Nothing about whether the file should be smaller.** That the growth is invisible from inside a
  file that has only ever been appended to is a fact about its history, not an argument for a cut.

