# S347 — BANKED's commit evidence

**Read-only.** Every commit hash cited in `BANKED.md`, resolved, with what it touched, what the
citing item claims, and whether they match. **No deletion is proposed, ranked or grouped.** The
call is Chat's and this document deliberately does not pre-shape it.

**Measured against a pinned copy.**

```
$ md5 -q BANKED.md
1990deb9aa8d5eec03a3b44823a5d01e      # == expected
$ awk 'END{print NR}' BANKED.md
615
```

Repo at `6f61be1`. Every line number below describes those bytes.

**Batch: N/A.** Nothing under `src/` is touched.

```
$ git status --porcelain -- src/
(zero lines)
```

**`BANKED.md` is gitignored and, in a worktree, a symlink.** A recursive grep misses it by either
mechanism and returns nothing that looks like an answer, and `git log -- BANKED.md` returns zero
commits. Every command below names the path explicitly. **§5 reports a case where that trap
appears to have bitten someone else.**

---

## §0 — Every number this document uses

### 0.1 The hash enumeration

| # | Figure | What it counts | Command |
|---|---|---|---|
| H1 | **62** | raw matches of a bare 7-or-more-character lowercase hex string | `command grep -oE '\b[0-9a-f]{7,}\b' BANKED.md \| wc -l` |
| H2 | **0** | of H1 excluded as a colour hex (trap 1) | see 0.2 |
| H3 | **0** | of H1 excluded as part of a `file:line` reference (trap 2) | see 0.2 |
| H4 | **62** | final occurrence count | H1 − H2 − H3 |
| H5 | **47** | distinct hashes | `… \| sort -u \| wc -l` |
| H6 | **62 of 62** | matches that are exactly 7 characters long | `… \| awk '{print length($0)}' \| sort -n \| uniq -c` |
| H7 | **36** | lines carrying at least one hash | `command grep -cE '\b[0-9a-f]{7,}\b' BANKED.md` |
| H8 | **33** | owning units — **29 items + 4 section-prose lines** | node walk, §0.4 |

### 0.2 The two traps, run rather than assumed

**Trap 1 — a colour hex looks like a commit hash.** The identifier audit found `#4A3D8F` inflating
a `#N` count. Here it excludes nothing, and the reason is worth stating rather than the zero:

```
$ command grep -noE '#[0-9a-fA-F]{6,8}\b' BANKED.md
82:#EF4444   174:#F59E0B   174:#F59E0B   392:#F59E0B   609:#A3C1DA   609:#4A3D8F
```

All six are **uppercase** and **six** hex digits. The enumeration pattern is lowercase-only and
requires seven, so none of them reaches it. A case-insensitive re-run confirms nothing is lost the
other way:

```
$ command grep -oE '\b[0-9a-fA-F]{7,}\b' BANKED.md | command grep -E '[A-F]'
(no output)
```

**Trap 2 — a numeric grep matches digits inside a line reference.** Searching `119` in the V1X
census returned twenty-odd hits on `:1190`, `:1195`, `:1199`.

```
$ command grep -oE '[A-Za-z0-9_./-]+:[0-9]+' BANKED.md | command grep -E '[0-9a-f]{7,}'
(no output)
```

No `file:line` reference in BANKED contributes a 7-character hex run. **Both exclusions are zero,
and both were measured.**

**A third check, not asked for.** Every one of the 62 matches mixes digits and letters — none is
all-digits or all-letters — and all are exactly 7 characters, which is this repo's `git log --oneline`
width. No 32-character run appears, so no md5 in the prose is being counted as a hash.

### 0.3 Resolution

| # | Figure | What it counts | Command |
|---|---|---|---|
| R1 | **47 of 47** | distinct hashes resolving to a commit object | `git cat-file -t <hash>` per hash |
| R2 | **0** | hashes that are ambiguous, absent or malformed | R1 complement |
| R3 | **24 / 23** | of R1 that are merge commits / plain commits | `git rev-list --parents -n1 <hash> \| wc -w` |

**`git log -1 --stat` understates a merge.** For the 24 merges it lists nothing, because a merge's
diff is empty against its first parent by default. Every file list below comes from
`git diff --name-only <hash>^1 <hash>`, which reports what the merged branch brought in.

### 0.4 The match test, and where it can run

| # | Figure | What it counts | Command / derivation |
|---|---|---|---|
| M1 | **11** | of H8 naming at least one file in the item's own text | node: backtick-quoted `*.js/.jsx/.mjs/.md/.json/.html` |
| M2 | **22** | of H8 naming no file at all | H8 − M1 |
| M3 | **8** | of M1 where at least one cited commit touched a named file | node set-intersection |
| M4 | **3** | of M1 where no cited commit touched any named file — `:74`, `:83`, `:214` | M1 − M3 |
| M5 | **13 / 8** | hash-to-unit rows scoring a file match / no overlap | node, §3 |

**The test the dispatch specifies runs on 11 of 33 units.** For the other 22 the item names no
file, so "the commit touched the file the item names" has no subject. Those verdicts are judgment
(§0.6), read off the commit subject against the item's prose.

### 0.5 Two discrete checks

| # | Figure | What it counts | Command |
|---|---|---|---|
| C1 | **13** | bullets under the `RETIRED S237` heading (`:64`–`:88`) | node walk, §4 |
| C2 | **9 / 4** | of C1 carrying at least one hash **anywhere in the item** / carrying none | node, continuation lines included |
| C3 | **7** | of C1 carrying a discharge word (`DONE`/`LANDED`/`BUILT`/`RESOLVED`/`CLOSED`/`FIXED`) | node |
| C4 | **5** | BANKED citations of a `METHODOLOGY-MAP:NNN` line number | `command grep -noE 'METHODOLOGY-MAP[A-Za-z.]*:[0-9]+' BANKED.md` plus the three bare `:NNN` continuations on `:591` |
| C5 | **5 of 5** | of C4 that are stale after `6f61be1` | `git show aff6791:<path>` against the current file, §5 |
| C6 | **3 / 2** | of C4 whose content survives elsewhere / was deleted | §5 |
| C7 | **4 → 2** | scheme-A citations in METHODOLOGY-MAP before and after `6f61be1` | `command grep -oE 'STATUS (priority )?[0-9]+' <file> \| wc -l` |

### 0.6 Figures that are judgment, not measurement

- **Every match verdict for the 22 units that name no file (M2).** There is nothing to intersect.
  The verdict is read off the commit's subject line against the item's prose, and the commit subject
  is reported in full at §3 so a reader can judge the gap themselves.
- **The three partial verdicts at `:74`, `:83`, `:214`** (M4). Each names a file, no cited commit
  touched it, and each has a different reason. Stated per item at §3.2.
- **Kind, for 24 of the 29 items.** Only **5** carry an authoritative kind — part one's §3.9 table
  covers BANKED `:399`–`:583`, which contains `:407`, `:425`, `:470`, `:482`, `:583`. The other 24
  are judged here from the item's own language and are labelled as judged.
- **The mechanism proposed at §5.3** for why a pre-delete check missed five citations. The staleness
  is measured; the explanation is inference.
- **What a match proves.** A commit touching the file an item names shows *something* landed there.
  It does not show that *this item's* work landed. That gap is not quantified anywhere in this
  document and cannot be closed by any of these commands.

---

## §1 — Method

`command grep` with an explicit path throughout. Every hash resolved with `git cat-file -t`, every
file list from `git diff --name-only <hash>^1 <hash>`, every subject from `git log -1 --format=%s`.

**Item boundaries.** A BANKED item starts at a `^- ` bullet, a `^N. ` numbered entry or a `^**`
prose lead, and runs to the next such line or the next `##` heading. A hash on a continuation line
belongs to the item above it — this matters, and §4 is where it changes an answer.

**Section headings reset the owner.** A first pass did not reset the item pointer at a `##`
heading, so a hash sitting in section prose was attributed to the last bullet of the previous
section. Corrected; the 4 section-prose units at §3.3 are the ones that were mis-attributed.

---

## §2 — The enumeration

**62 occurrences, 47 distinct, 36 lines, 33 owning units. Nothing excluded by either trap.**

```bash
command grep -oE '\b[0-9a-f]{7,}\b' BANKED.md            # 62 occurrences
command grep -oE '\b[0-9a-f]{7,}\b' BANKED.md | sort -u  # 47 distinct
command grep -cE '\b[0-9a-f]{7,}\b' BANKED.md            # 36 lines
```

**All 47 resolve.** `git cat-file -t` returns `commit` for every one. **Zero failures — no
ambiguous hash, no absent object, no malformed string.** Expectation 2 holds at the maximum.

Distribution: **24 merge commits, 23 plain commits.**

---

## §3 — The per-unit evidence table

Ordered by BANKED line. **Kind** is authoritative only where part one supplies it (marked *[p1]*);
the rest is judged.

### 3.1 Units where a named file is matched by a cited commit — 8

| BANKED | item, verbatim head | kind | hash | files touched | commit subject | match |
|---|---|---|---|---|---|---|
| `:68` | **The per-card object audit (S290) — the classification S237 skipped, run once from source.** | task *(judged)* | `9e17b6a` | `S290-PER-UNIT-OBJECT-AUDIT.md`, `MiniCard_InterReplicateCorrelation.jsx` | *Merge … S290: IRC heatmap restore* | **YES** — `S290-PER-UNIT-OBJECT-AUDIT.md` |
| | | | `3b502d9` | `src/components/cards/MiniCard_RowMean.jsx` | *S290: Row-Mean Runs windowed-arm surface* | no overlap |
| `:82` | **IRC forest-gate audit + window-table fix (S289); heatmap restore LANDED S290 (`9e17b6a`).** | task *(judged)* | `9e17b6a` | as above | *Merge … S290: IRC heatmap restore* | **YES** — `MiniCard_InterReplicateCorrelation.jsx` |
| | | | `7835f15` | 2 files | *S289: IRC window-table promotion columns + per-pair contributor* | (named files not in this commit) |
| `:240` | **`docs/ARCHITECTURE.md` (Code-owned) — "25 vs ~27 tests" header drift.** | task *(judged)* | `e75f20d` | 22 files | *Merge … S228: dead-code prune — 11 orphans* | **YES** — `docs/ARCHITECTURE.md` |
| `:384` | **Cross-reference naming inconsistency in the look-for copy — DONE S263 (`31f5e32`).** | task *(judged)* | `31f5e32` | 8 files | *Merge … S263: cross-reference naming tidy* | **YES** — `CARD-COPY.md` |
| | | | `c4b07fb` | 1 file | *S263: track CARD-COPY doc + cross-reference naming tidy* | **YES** — `CARD-COPY.md` |
| `:407` | **(S325) Hardcoded `engine.js:NNN` references in `confirmGrouping.js` drift on almost any edit.** | **finding** *[p1]* | `9ce686c` | 3 files | *S325: merge shared applicability guards (cc838a6)* | **YES** — `confirmGrouping.js` |
| `:425` | **(S325, harvested S340) The ecology census is archived; these three findings are what it carried alone.** | **decision record** *[p1]* | `cc838a6` | 3 files | *S325: share the upfront applicability guards between the two dispatch sites* | **YES** — `src/analysis/applicability.js` |
| | | | `99f75de` | `src/import/roles.js` | *S325: reject grouping keys whose median level holds one row* | no overlap |
| | | | `d3f50e9` | `src/import/parser.js` | *Merge branch 's326-width-trim'* | no overlap |
| `:470` | **(S340) A dangling citation survived in `src/` for roughly 180 sessions…** | **decision record** *[p1]* | `ef52157` | 2 files | *Repoint the S162b-CALIBRATION citations* | **YES** — `findingComposers.js`, `diag-s162b-anchor-lock.mjs` |
| `:587` | **(S346, P76) The register census landed: 386 rows across four registers.** | task *(judged)* | `61ff4fc` · `897d6ea` · `4bec2d8` · `c5e9353` | 1 file each | *S346: register census — P76 part one* / *census amendment* / *separate the two 42s* / *take the hex member names from grep* | **YES** on all four — `docs/shared/SESSION346-REGISTER-CENSUS.md` |

### 3.2 Units naming a file that no cited commit touched — 3

**Each has a different reason, and none is a wrong hash.**

| BANKED | names | hash → touched | why it does not match |
|---|---|---|---|
| `:74` **The per-unit display programme (supersedes the CI band programme)** | `S237-FLAG-ASSEMBLY-CLASSIFICATION-v2.md`, `TIER-A-CI-DRAW-SPEC.md`, `ForestPlot.jsx` | `9764c7f` → 4 `src/tests/*.js` · `be4d6ad` → `MiniCard_Autocorrelation.jsx` · `9e17b6a` → 2 files | The item is a **multi-session programme**. Its three hashes are increments of the programme; the named files are the spec it works from and the primitive it uses, neither of which those commits edited. |
| `:83` **Forest suppression on the Fisher-combined column-grouped path** | `TIER-A-CI-DRAW-SPEC.md` | `9764c7f` → `autocorrelation.js`, `kurtosis.js`, `regionalNoise.js`, `valueFrequencySpike.js` | The named file is cited as **the authority for class membership**, not as a file the commit changed. |
| `:214` **§2 highlight emission vs the iteration idiom** | `findings.js` | `8dd2105` → `src/analysis/convergence.js` | **Subject matches, file does not.** The commit is *"S188: Regional Noise §2 highlight iterates details[] (multi-window fix)"* — exactly the item's topic — but the fix landed in `convergence.js` while the item names `findings.js` as where a related concern lives. |

### 3.3 Hashes sitting in section prose, not in an item — 4

These belong to a `##` heading's introductory paragraph. **They are not items and cannot be
deletion candidates**; they are recorded because the enumeration found them.

| BANKED | section | hash | commit subject |
|---|---|---|---|
| `:11` | Table standardisation — content design calls (S217 full-audit triage) | `3afbbec` | *S217: card-surface table standardisation + plot sizing/wrapper* |
| `:46` | Test-card redesign cluster (#25) — multi-card | `6e2e755` | *Merge … Duplicated Data peer titles + stats* |
| `:236` | Stale doc / comment references to deleted code (S226 + S227) | `641cd42` · `e75f20d` | *S226 follow-up: drop deleted plots from ARCHITECTURE listing* · *Merge … S228: dead-code prune* |
| `:395` | Import and role-inference findings (S325 corpus census chain) | `9ce686c` · `377468e` | *S325: merge shared applicability guards (cc838a6)* · *S325: merge minimum grouping-key level size (99f75de)* |

### 3.4 Units naming no file — 18 items

The match test has no subject here. Hash, files touched and subject are reported so Chat can judge
the gap; the "match" column is deliberately absent rather than guessed.

| BANKED | item, verbatim head | kind | hashes → files touched, subject |
|---|---|---|---|
| `:30` | **Live-exposure portion CLOSED (S279).** | task *(judged)* | `c940618` → 4, *Merge … RSC ρ-matrix: gate cell colour on carrier* · `4c5bbeb` → 1, *Merge … S279: MADConformity label-as-diagnostic* |
| `:32` | **Group 1 — genuine parallel verdict (independent thresholds, reaches the reader, can disagree with the flag).** | finding *(judged)* | `4c5bbeb` → 1, *Merge … S279: MADConformity label-as-diagnostic* |
| `:50` | **Duplicated Data redesign — DONE S274 (`6e2e755`).** | task *(judged)* | `6e2e755` → 2, *Merge … Duplicated Data peer titles + stats* |
| `:58` | **EvidenceTable fixed-layout add — DONE (built S275 `92eec5f`/`c3d3d01`, acceptance cleared S282).** | task *(judged)* | `92eec5f` → 1, *EvidenceTable: gated tableLayout:fixed when columns declare widths* · `c3d3d01` → 1, *Merge …* same · `ef2d773` → 1, *S282: VFS card — lift Pass column to a heading note* |
| `:75` | **The two CI-band defects are resolved — Autocorrelation forest DONE S283, Runs band correct since S240.** | task *(judged)* | `b92d6c1` → 3, *Merge … S240 Parts 2-3: Runs pooled-z band* |
| `:78` | **Row-Mean Runs `primaryP` divergence — RESOLVED S285 (`51b7ca5`).** | task *(judged)* | `51b7ca5` → 2, *Merge … Row-Mean Runs primaryP carries promotion* · `2aaf401` → 1, *Merge … Row-Mean Runs: per-unit stored-forest* |
| `:79` | **Row-Mean Runs windowed-arm surface — BUILT S290 (`3b502d9`), LATENT on the batch.** | task *(judged)* | `3b502d9` → 1, *S290: Row-Mean Runs windowed-arm surface* |
| `:80` | **VFS surface residuals (S235 read-only) — DONE S282.** | task *(judged)* | `ef2d773` → 1, *S282: VFS card — lift Pass column to a heading note* |
| `:81` | **Autocorrelation per-pair retention — the third retention case (S283, found at the Stage 1 source gate).** | finding *(judged)* | `9764c7f` → 4, *Merge … S288: quad retention* · `be4d6ad` → 1, *S289: Autocorrelation per-pair forest gate* |
| `:97` | **Verdict-line register pass (R1) — DONE S279 (`f2f9ee8` src + `3d2913b` spec).** | task *(judged)* | `f2f9ee8` → 2, *Merge … S279: R1 verdict-line register* · `3d2913b` → 2, *S279 docs: Cluster-2 verdict-line register reconcile* |
| `:100` | **Plot-sizing / wrapper-hug (Arc A unit 1) — DONE S264 (`4aa32e1`).** | task *(judged)* | `4aa32e1` → 12, *Merge … S264 Arc A unit 1 — flip fixed-width* · `6364e61` → 2, *Merge … S265: SelectiveNoise wrapper* |
| `:201` | **Col-N file-column label — #31 — DONE S281 (`8306fcd`/`bc0646a`).** | task *(judged)* | `8306fcd` → 6, *S281: column-label file-letter resolution + Noise shape rename* · `bc0646a` → 3, *S281: column header name on identifier tables and prose* |
| `:219` | Marginal-shape tests are invalid on count data. | finding *(judged)* | `16ace4e` → 1, *Merge … S180 Part C / Finding 2: trio N/A on count* |
| `:334` | **VFS pass-2 near-dup keep-gate — BUILT S308 (`d22df9f`, … NOT promoted, screenshot-gated).** | task *(judged)* | `d22df9f` → 5, *S308: VFS pass-2 near-dup keep-gate (concentration OR depth)* |
| `:386` | **Transcription follow-up — orphaned display variables + `flaggedColStr` aggregated-path fix. DONE S263 (`e2d9d66`).** | task *(judged)* | `e2d9d66` → 9, *Merge … S263: prune orphaned display vars* · `111e5d6` → 27, *Merge … Arc B: transcribe card copy* |
| `:392` | **(S269) #15 fill-treatment programme — body closed; remaining = two `buildHighlightSpec` amber tints.** | task *(judged)* | `4e430c9` → 7, *Merge … Retoken mechanical colour literals* · `faaac6a` → 6, *Merge … S269: collapse flag-mark SIGNAL.RED.dot* · `93f96ab` → 8, *Merge … S269 Tier 3: full-saturation flag marks* · `38bb741` → 2, *Merge … S269 (e) revert* |
| `:482` | **(S296) Close-out verifies `git status` clean BEFORE writing STATUS's hash.** | **decision record** *[p1]* | `682512c` → 5, *docs: S294 corpus results, provenance, paper outline* · `39ff312` → 7, *docs: land S295 §2.6 progress + paper §4 wrapper* |
| `:583` | **(S345) P74 shipped but its doc half did not.** | **task** *[p1]* | `9bca7bf` → 3, *S345: retire rank-1 arithmetic from src/ comments; census amendments* |

### 3.5 Kind, as far as it is authoritative

Part one's §3.9 covers BANKED `:399`–`:583` and supplies a kind for **5** of the 29 items:

| BANKED | kind | part one's state cell |
|---|---|---|
| `:407` | **finding** | open convention question |
| `:425` | **decision record** | recorded |
| `:470` | **decision record** | **landed** `ef52157` |
| `:482` | **decision record** | open (→ close-out) |
| `:583` | **task** | open |

**Four of the five are not tasks.** Expectation 4 holds on the only sample with an authoritative
classification: one task, one finding, three decision records. The other 24 kinds above are judged
from the item's own language and carry no authority.

**16 of the 29 items carry a discharge word on their own first line** (`DONE`, `LANDED`, `BUILT`,
`RESOLVED`, `CLOSED`, `FIXED`). That is a property of the text, not a kind, and the two do not
coincide — `:470` carries a landing and part one calls it a decision record.

---

## §4 — The `RETIRED S237` heading

**Heading, verbatim, at `BANKED.md:64`:**

```
## CI programme (v1.0 arc — RETIRED S237, see TIER-A-CI-DRAW-SPEC.md)
```

Section extent `:64`–`:88`; the next `##` is at `:89`.

**Part one's figures, checked:**

| part one's claim | measured | verdict |
|---|---|---|
| 13 bullets | **13** | **confirmed** |
| 4 are open work | **4 carry no hash anywhere in the item** — `:76`, `:77`, `:87`, `:88` | **confirmed** |
| 6 landed with commit hashes | **9 bullets carry at least one hash**; **7 of those carry a discharge word** | **corrected — neither variant is 6** |

The 6 is not reproducible from the text under either rule I can state. Both measurable variants are
given rather than one asserted, and the gap is one or three bullets depending on the rule.

**Why the count moves: `:83` carries its hash on a continuation line.** A scan of bullet first-lines
finds 8; a scan of whole items finds 9. This is the same class of error the identifier audit
recorded — a line-oriented pattern missing what the item actually contains.

The 13 bullets:

| line | hashes | discharge word | head |
|---|---|---|---|
| `:68` | 2 | — | The per-card object audit (S290) |
| `:74` | 3 | ✓ | The per-unit display programme |
| `:75` | 1 | ✓ | The two CI-band defects are resolved |
| `:76` | — | — | Programme-wide CI level mismatch / Noise Scaling re-level (S237) |
| `:77` | — | — | Kurtosis per-condition forest (S237) |
| `:78` | 2 | ✓ | Row-Mean Runs `primaryP` divergence — RESOLVED S285 |
| `:79` | 1 | ✓ | Row-Mean Runs windowed-arm surface — BUILT S290 |
| `:80` | 1 | ✓ | VFS surface residuals — DONE S282 |
| `:81` | 2 | ✓ | Autocorrelation per-pair retention |
| `:82` | 2 | ✓ | IRC forest-gate audit + window-table fix |
| `:83` | 1 | — | Forest suppression on the Fisher-combined column-grouped path |
| `:87` | — | — | Stale rationale clause — comment rewrite on next touch (S231) |
| `:88` | — | — | Dispatch-vs-implementation shape |

**The section's own body already says so.** `BANKED:66` ends: *"The live remainder lifts to the
entries below."* And BANKED carries the finding about itself at `:603`, which is where part one's
6/4/3 split is recorded.

---

## §5 — Five stale METHODOLOGY-MAP citations

The dispatch asked for any BANKED citation of a METHODOLOGY-MAP line number, noting that Chat
checked before the delete pass and found none, so a hit would mean the check missed something.

**There are five, and all five are stale.**

### 5.1 The citations

```
$ command grep -noE 'METHODOLOGY-MAP[A-Za-z.]*:[0-9]+' BANKED.md
591:METHODOLOGY-MAP:186
593:METHODOLOGY-MAP:90
```

`BANKED:591` carries three further bare continuations in the same clause — *"(4, at
`METHODOLOGY-MAP:186`, `:291`, `:506`, `:537`)"* — so the citation count is **5**, not the 2 the
prefix-anchored grep returns. **A pattern anchored on the filename finds the first citation in a
list and misses the rest.**

### 5.2 Each one, before and after `6f61be1`

`git show aff6791:docs/shared/METHODOLOGY-MAP.md` is the 602-line pre-delete file.

| cited | content before `6f61be1` | content now (567 lines) | survives? |
|---|---|---|---|
| `:90` | `**Current total: 27 tests** (S96 added Windowed Autocorrelation; …)` | `## The five dimensions` | **yes, at `:101`** |
| `:186` | `… slated for merge into unified SD scan (STATUS 12). …` | `*Magnitude, uniformity, and scaling of replicate noise.*` | **yes, at `:197`** |
| `:291` | `Planned merge into unified SD scan (STATUS 12). …` | (blank line) | **yes, at `:302`** |
| `:506` | `**3. Cross-Condition Rank uses ρ₀ = 0.85 heuristic …** Already planned — STATUS priority 12.` | (blank line) | **no — deleted** |
| `:537` | `Already on roadmap (STATUS priority 13). …` | `2. Paired/matched design handling.` | **no — deleted** |

**All five pointed at the right content before the delete pass and point at something else now.
Three are relocatable; two name content that no longer exists.**

```
$ command grep -c 'STATUS priority' docs/shared/METHODOLOGY-MAP.md
0
```

**The delete pass removed every `STATUS priority` string from the file.**

### 5.3 A count went stale with them

`BANKED:591` says: *"Four dead numbering schemes, 119 citations — 88 live, 31 archived. … 'STATUS
priority N' (4, at `METHODOLOGY-MAP:186`, `:291`, `:506`, `:537`)"*.

```
$ command grep -oE 'STATUS (priority )?[0-9]+' docs/shared/METHODOLOGY-MAP.md | wc -l
2
$ git show aff6791:docs/shared/METHODOLOGY-MAP.md | command grep -oE 'STATUS (priority )?[0-9]+' | wc -l
4
```

**Scheme A was 4 and is now 2.** BANKED's figure was correct when written and is wrong against the
current file — a count going stale as a downstream consequence of a delete elsewhere, which is the
failure class the whole arc exists to name.

### 5.4 Why the pre-delete check plausibly missed them

**Measured:** the citations exist and are stale. **Inferred (§0.6):** a check for
`METHODOLOGY-MAP:NNN` across the repo would not have seen them. `BANKED.md` is gitignored at
`.gitignore:38`, so the shell `grep` wrapper's `--ignore-files` skips it; in a worktree it is also a
symlink, so `command grep -r` skips it too. **Both mechanisms were measured in the identifier
audit two dispatches ago, and this is what they look like when they bite.** A second contributor is
5.1's shape — three of the five citations are bare `:NNN` continuations that a filename-anchored
pattern cannot reach.

**Reported, not fixed.** `BANKED.md` is Chat-primary and `METHODOLOGY-MAP.md` is Chat-owned.

---

## §6 — Expectations

**1. Between 10 and 25 BANKED items cite a commit hash — INVERTED.** **29 items** do, plus 4
section-prose lines, across 62 occurrences and 47 distinct hashes. The figure is above the
predicted range, and the range's basis — 6 in one section — undercounted that section too: it holds
9 (§4).

**2. Most hashes resolve — HELD, at the maximum.** **47 of 47.** No ambiguous hash, no absent
object, no malformed string. There are no interesting rows of the kind the expectation anticipated.

**3. Most resolving hashes touched the file the item names — HELD where testable, and the bigger
finding is where it is not.** The test runs on **11 of 33 units**; **8 of the 11 match**. **22
units name no file at all**, so for two thirds of the population the specified test has no subject
and the verdict is judgment. Of the 3 that name a file and miss, **none is a wrong hash** — one is
a programme citing its increments, one cites a spec as an authority, and one (`:214`) matches on
subject and misses on file.

**4. Some hash-carrying items are findings rather than tasks — HELD.** Of the 5 items with an
authoritative kind from part one, **four are not tasks**: one finding and three decision records
against one task. The remaining 24 kinds are judged and carry no authority.

**5. Nothing under `src/` changes — HELD.** Zero lines.

**A sixth result the dispatch anticipated as a possibility and got.** Five BANKED citations of
METHODOLOGY-MAP line numbers, all five stale after `6f61be1`, two of them naming deleted content,
and one BANKED count (scheme A = 4) invalidated with them. §5.

---

## §7 — The number sweep

Every integer in this document's prose and tables, checked against §0. **`file:line` references are
excluded before counting** — the rule this project earned when searching `119` returned twenty-odd
hits on `:1190`, `:1195` and `:1199`. Commit hashes, `.gitignore` line numbers, session tags and
BANKED/METHODOLOGY-MAP line references are excluded on the same basis.

| figure | appears as | §0 entry or in-place derivation | verdict |
|---|---|---|---|
| 615 · `1990deb9…` | BANKED lines · md5 | header, both commands shown | ✓ |
| 62 · 0 · 0 · 62 · 47 · 36 · 33 | raw / trap-1 excluded / trap-2 excluded / final / distinct / lines / units | H1–H5, H7, H8 | ✓ |
| 7 | length of every match | H6 | ✓ |
| 29 · 4 | items / section-prose lines | H8, split at §3.3 and §3.4 | ✓ |
| 47 · 0 · 24 · 23 | resolving / failing / merge / plain | R1, R2, R3 | ✓ |
| 11 · 22 · 8 · 3 · 13 · 8 | naming a file / naming none / matched / unmatched / YES rows / no-overlap rows | M1–M5 | ✓ |
| 18 | items in §3.4 naming no file | M2 − 4 section-prose units, all four of which also name none | ✓ |
| 13 · 9 · 4 · 7 | RETIRED S237 bullets / with a hash / without / with a discharge word | C1, C2, C3 | ✓ |
| 8 | the same section counted by bullet first-line only | §4, stated as the wrong rule and why | ✓ |
| 5 · 5 · 3 · 2 | M-MAP citations / stale / relocatable / deleted | C4, C5, C6 | ✓ |
| 4 · 2 | scheme-A citations before / after `6f61be1` | C7, both commands shown | ✓ |
| 602 · 567 | METHODOLOGY-MAP lines before / after | `awk 'END{print NR}'` on each; 567 measured, 602 from `git show aff6791:` | ✓ |
| 5 · 24 | items with an authoritative kind / judged | §3.5; 24 = 29 − 5 | ✓ |
| 16 | items carrying a discharge word on their first line | node over the 29 item lines, §3.5 | ✓ |
| 1 · 3 | of the 5 authoritative kinds: tasks / non-tasks | §3.5 table, enumerated | ✓ |
| 6 · 3 | part one's "6 landed" / "3 findings or live references" | **quoted from BANKED:603**, corrected at §4 | ✓ |
| 6 | hex digits in each of the six colour hexes — why none reaches the 7-character pattern | §0.2, all six listed with their lines | ✓ |
| 32 | the md5 width checked for and not found among the matches | §0.2; H6 shows every match is 7 | ✓ |
| 119 · 88 · 31 · 82 · 14 · 19 | inside the `BANKED:591` quotation | **quoted, not measured** | n/a |
| 386 · 37 · 200 · 182 · 18 · 108 · 41 | inside the `BANKED:587` quotation | **quoted, not measured** | n/a |
| 180 | "roughly 180 sessions", inside the `BANKED:470` head | **quoted, not measured** | n/a |
| 25 · 27 | "25 vs ~27 tests", inside the `BANKED:240` head | **quoted, not measured** | n/a |
| 18 · 7 · 3 | flag-assembly classes, inside the `BANKED:66` quotation | **quoted, not measured** | n/a |

**Nothing is carried from an earlier document without a mark.** The only figures taken from
elsewhere are part one's 6/4/3 for the RETIRED S237 section, quoted from `BANKED:603` and checked
at §4, and part one's five kind assignments, cited as part one's.

**Corrected during the sweep**, recorded rather than silently applied:

- A first pass reported **33 items**. It is **29 items plus 4 section-prose lines**. The item
  pointer was not reset at a `##` heading, so a hash in section prose was attributed to the last
  bullet of the section above — which also produced a phantom duplicate at line `392`, appearing
  under two different sections at once. Corrected at §1.
- A first pass counted the RETIRED S237 section's hash-carrying bullets as **8**, from a scan of
  bullet first-lines. `:83` carries its hash on a continuation line. Whole-item scan gives **9**.
  Both figures and the rule that separates them are at §4.
- A first pass took `git log -1 --stat` for the file lists and reported **24 commits touching zero
  files**. Those are the merges; `--stat` is empty against the first parent by design. Every file
  list now comes from `git diff --name-only <hash>^1 <hash>`. Stated at §0.3.
- The `METHODOLOGY-MAP` citation count was first taken as **2**, from a filename-anchored grep.
  Three of the five citations are bare `:NNN` continuations inside the same clause. The count is
  **5**, and the miss is itself reported at §5.1 because it is the same shape as the check this
  dispatch was sent to test.

---

## §8 — Verification

**The md5, against the expected value:**

```
$ md5 -q BANKED.md
1990deb9aa8d5eec03a3b44823a5d01e     # matches the expected value; 615 lines
```

**`git status --porcelain -- src/`** → zero lines, actual output empty. **Batch: N/A.**

**The hash enumeration:** raw **62**, trap-1 exclusions **0** (six colour hexes, all uppercase and
six digits, none reaching the seven-lowercase pattern), trap-2 exclusions **0** (no `file:line` ref
contributes a 7-hex run), final **62** occurrences / **47** distinct / **36** lines / **33** units.
Command: `command grep -oE '\b[0-9a-f]{7,}\b' BANKED.md`. Both exclusions were run, not assumed.

**The per-hash table:** §3. All **47 resolve**; **24 merge, 23 plain**; files from
`git diff --name-only <hash>^1 <hash>`; every commit subject quoted; every item quoted with its
line; match verdict given where the item names a file and marked judgment where it does not.

**The `RETIRED S237` heading**, quoted with its line at §4: `BANKED.md:64`,
`## CI programme (v1.0 arc — RETIRED S237, see TIER-A-CI-DRAW-SPEC.md)`. **13 bullets confirmed. 4
carrying no hash confirmed. The 6 is corrected** — 9 bullets carry a hash, 7 carry a discharge
word, and part one's rule for "landed" is not reproducible from the text.

**The number sweep:** §7, with four corrections recorded.

**Nothing renders.** No preview, no screenshot.

---

## Provenance

Read-only, S347. Measured at repo `6f61be1` against `BANKED.md` md5
`1990deb9aa8d5eec03a3b44823a5d01e`, 615 lines — **the measured-at ref the index audit said every
census row needs and no census has carried.** A later reader can tell whether this table still
describes the file by re-running one command.

No register was edited. `BANKED.md` was read and quoted, never modified. **No deletion is proposed,
ranked or grouped**; the four facts per hash are reported and the call is Chat's.

**Two things are reported and left standing for Chat.** Five BANKED citations of METHODOLOGY-MAP
line numbers went stale at `6f61be1` and one BANKED count went with them (§5). Part one's "6
landed" figure for the RETIRED S237 section is not reproducible; the two measurable variants are 9
and 7 (§4).

**No CLAUDE.md convention change is proposed.** The three method points this dispatch exercised —
reset the item pointer at a heading, scan whole items rather than first lines, and use
`git diff <hash>^1 <hash>` rather than `git log --stat` on a merge — are applications of rules
CLAUDE.md already carries, not new ones.
