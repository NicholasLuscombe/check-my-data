# S347 — The BANKED identifier audit

**Read-only.** Part three, job zero: the inputs to a decision about BANKED. **The decision is
Chat's.** This document proposes no identifier scheme, no rewrite and no renumbering.

The dispatch's premise was that BANKED's opener refuses line numbers while every external citation
of BANKED uses them. **That premise does not survive contact with the opener.** §1 quotes it
verbatim; §2 and §3 measure what follows.

**Batch: N/A.** Nothing under `src/` is touched.

```
$ git status --porcelain -- src/
(zero lines)
```

**Two tool facts that bite here, stated before any figure.** `BANKED.md` is **gitignored**
(`.gitignore:38`) and **untracked** — `git log -- BANKED.md` returns **0 commits**, so no question
about its history can be answered from git. And a recursive grep misses it **twice over**, by two
independent mechanisms measured at §0.7. Every command below uses `command grep` with an explicit
path.

---

## §0 — Every number this document uses

Measured at `4a1c115`. Figures from an earlier document are re-measured here or marked **carried**.

### 0.1 The opener

| # | Figure | What it counts | Command |
|---|---|---|---|
| O1 | **1** | lines the opener occupies (`BANKED.md:3`) | `command sed -n '1,6p' BANKED.md` |
| O2 | **5** | sentences in it | read at source, §1.1 |
| O3 | **0** | instructions it gives about how BANKED items are to be **cited from outside** | §1.2 |

### 0.2 Citations of BANKED

| # | Figure | What it counts | Command |
|---|---|---|---|
| C1 | **7** | files searched | enumerated at §2.1 |
| C2 | **253** | lines mentioning "BANKED" across the 7 | `command grep -c 'BANKED' <file>` summed: 8+1+0+1+164+31+48 |
| C3 | **134** | `BANKED:NNN` occurrences across the 7 | `command grep -oE 'BANKED[.a-z]*:[0-9]+' <file> \| wc -l` summed: 2+0+0+0+111+6+15 |
| C4 | **182** | S346-census §3 table rows citing a BANKED line **with a description of what is there** | node extract over `## §3`–`## §4` |
| C5 | **182** | of C4 that resolve — ≥50% of the claim's ≥5-char words present at that line today | node, §2.2 |
| C5b | **180 / 2** | of C5 scoring exactly 1.00 / below it (0.67 and 0.50, both hand-checked, both resolving) | node, §0.6 |
| C6 | **9 – 583** | the range of BANKED lines C4 cites | `Math.min` / `Math.max` over C4 |
| C7 | **5** | citations of BANKED's own line numbers **inside BANKED** | `command grep -noE 'BANKED[.:]?[a-z]*:?[0-9]+' BANKED.md` |

### 0.3 Line-number stability

| # | Figure | What it counts | Command |
|---|---|---|---|
| S1 | `4768918f…d67` | md5 of `head -583 BANKED.md` today | `head -583 BANKED.md \| md5 -q` |
| S2 | **615** | BANKED lines now | `awk 'END{print NR}' BANKED.md` |
| S3 | **583** | BANKED lines before the S346 append | recorded in `SESSION346-CHAT-SUMMARY.md:85`; **confirmed by S1** |
| S4 | **585** | line of the `## Session 346` heading | `command grep -n '^## Session 346' BANKED.md` |
| S5 | **41** | `##` sections | `command grep -c '^## ' BANKED.md` |
| S6 | **290** | highest session tag anywhere in lines 1–273 | `command sed -n '1,273p' BANKED.md \| command grep -oE '\bS[0-9]{2,3}\b' \| … \| sort -n \| tail -1` |
| S7 | **346** | highest session tag in lines 274–615 | same, on that range |
| S8 | **0** | occurrences of any `S32x`–`S39x` tag in lines 1–273 | `command sed -n '1,273p' BANKED.md \| command grep -noE '\bS3[2-9][0-9]\b'` |
| S9 | **12 of 37** | sections whose highest session tag is lower than the section above | node walk, §3.2 |
| S10 | **13 / 15** | bullets appended at S345 / at S346 | `command sed -n '557,584p'` and `'585,615p'`, `command grep -c '^- '` |

### 0.4 Identifier candidates

| # | Figure | What it counts | Command |
|---|---|---|---|
| A1 | **197** | top-level bullets | `command grep -c '^- ' BANKED.md` |
| A2 | **161** | of A1 carrying a bold lead phrase (`^- \*\*(.+?)\*\*`) | node capture |
| A3 | **161** | of A2 that are distinct — **0 collisions** | `new Set(...).size` |
| A4 | **36** | of A1 with no bold lead | A1 − A2 |
| A5 | **74** | of A1 opening with a parenthesised session tag | `^- \*\*\(S[0-9]{2,3}` |
| A6 | **16** | distinct values among A5 — **10 of them collide** | `uniq -c`, §4.2 |
| A7 | **197** | of A1 distinct in their **first 60 characters** — 0 collisions | node |
| A8 | **18** | prose-only items | **carried** from part one §3.9, re-read at source at §4.3 |
| A9 | **11 / 5 / 2** | of A8 opening `**bold**` / `N. ` / plain prose | node, §4.3 |
| A10 | **175** | census rows carrying a distinct bold lead (161 bullets + 14 prose) — **0 collisions** | node over both sets |
| A11 | **215** | BANKED census rows | **carried** — part one's rule (197 + 18) |
| A12 | **41 / 0 / 4 / 15 / 3** | sections / heading collisions / median bullets per section / max / sections with zero bullets | node walk |
| A13 | **42 / 47** | `file:line` refs inside BANKED items / file refs without a line number | `command grep -oE` on each form |

### 0.5 The bare `#N` scheme

**Rule applied before any count:** `file:line` references are excluded first. A numeric grep matches
digits inside a line reference — searching `119` in the V1X census returned twenty-odd hits on
`:1190`, `:1195` and `:1199`. Here the exclusion is measured at **0** (D2), so it changes nothing,
but it was run rather than assumed.

| # | Figure | What it counts | Command |
|---|---|---|---|
| D1 | **51** | `#N` occurrences, whole file | `command grep -oE '(^\|[^A-Za-z0-9#])#[0-9]+' BANKED.md \| wc -l` |
| D2 | **0** | of D1 sitting inside a `file:line` reference | `command grep -oE '[A-Za-z0-9_.-]+:[0-9]+#[0-9]+'` |
| D3 | **49** | `#N` occurrences in lines 1–583 | same, on `command sed -n '1,583p'` |
| D4 | **1** | of D3 that is a scheme-B `STATUS parked #N` | `command grep -oE 'STATUS(\.md)? parked #[0-9]+'` |
| D5 | **48** | scheme-C occurrences in lines 1–583 | D3 − D4 — **reproduces part one's 48 exactly** |
| D6 | **2** | occurrences added by the S346 append, **both artefacts** | D1 − D3; identified at §5.2 |
| D7 | **20** | distinct scheme-C values in lines 1–583 | `sort -n -u \| wc -l` |
| D8 | **5 – 52** | their range | `sort -n` head and tail |
| D9 | **28** | integers absent from that range | 48 slots − D7 |
| D10 | **5** | BANKED items **defined** by a `#N` rather than citing one | `command grep -noE '^- \*\*#[0-9]+[^*]*'` |
| D11 | **11** | citations of `#49`, all naming one subject | `command grep -noE '.{0,40}#49.{0,50}'`, all 11 read |

### 0.6 Figures that are judgment, not measurement

Named separately so they are never cited as measured.

- **The reading of the opener's "no line numbers" clause** (§1.2). The clause is quoted verbatim;
  what it governs is an interpretation, argued from its own remedy clause and from three
  measurements. A reader may disagree with the reading; the measurements stand either way.
- **C5's resolution threshold.** "Resolves" means ≥50% of the claim's ≥5-character words appear at
  the cited line. That threshold is chosen, not derived. **The distribution makes the choice nearly
  moot: 180 of the 182 score exactly 1.00.** The two that do not are `BANKED:358` at 0.67 and
  `BANKED:549` at 0.50 — the latter sitting exactly on the threshold, so the figure is
  threshold-sensitive at one row. **Both were read by hand and both resolve.** The census
  abbreviates "Cross-Condition Consistency" to "CCC" at `:549` and paraphrases a longer sentence
  at `:358`; same session tag, same P-number, same item in each case. The dip measures the
  census's compression, not a citation failure.
- **The regime boundary at §3.2.** "BANKED stopped taking insertions around S290" is read off S6
  and S8. The exact session is judgment; the fact that lines 1–273 carry nothing above S290 is not.
- **Whether the 2 plain-prose items (A9) could carry an identifier at all.** §4.3 says what they
  are and declines to guess.
- **A8 = 18 and A11 = 215 are carried** from part one and not re-derived. The 18 line numbers were
  re-read at source and all 18 still hold their stated content (§4.3), which is a check on the
  carried figure, not an independent re-derivation of it.

### 0.7 Why a recursive grep cannot answer any question here — two mechanisms, separated

| where | `grep -rl 'Surface-organised backlog'` | `command grep -rl` same |
|---|---|---|
| main checkout | **nothing** | `./BANKED.md` |
| this worktree | **nothing** | **nothing** |

- **In main**, the shell `grep` is a ugrep wrapper carrying `--ignore-files`, and `BANKED.md` is
  gitignored at `.gitignore:38`. The wrapper skips it silently. `command grep` finds it.
- **In a worktree**, `BANKED.md` is a **symlink** to the main checkout (created by
  `scripts/init-worktree-symlinks.sh`), and a recursive grep does not follow symlinks. **So even
  `command grep -r` returns nothing there.**

**Both greps return zero in a worktree, and zero looks like an answer.** Every figure in this
document was produced by naming the path.

---

## §1 — What the opener actually says

### 1.1 Verbatim

`BANKED.md:1`–`:5`:

```
  1 | # BANKED — Check My Data
  2 |
  3 | Surface-organised backlog of non-blocking follow-ons. Replaces the dated "arc follow-ons"
    | sections formerly carried in STATUS.md. Items are not sequenced; each names the surface and
    | the trigger that would make it actionable. No dates and no line numbers — both drift;
    | filename plus "next X-touching session" is enough to relocate. Closed items are deleted, not
    | struck through, and their history lives in the session summaries.
  4 |
  5 | ## Card information architecture (the three-jobs map, S198)
```

Line 3 is one paragraph and the whole of the opener. **Every instruction it gives, split at the
sentence:**

| # | instruction | about |
|---|---|---|
| 1 | *"Surface-organised backlog of non-blocking follow-ons."* | how the file is **ordered** — by surface |
| 2 | *"Replaces the dated 'arc follow-ons' sections formerly carried in STATUS.md."* | provenance |
| 3 | *"Items are not sequenced; each names the surface and the trigger that would make it actionable."* | what an **item must contain** — a surface and a trigger |
| 4 | *"No dates and no line numbers — both drift; filename plus 'next X-touching session' is enough to relocate."* | what an item **must not contain**, and the substitute |
| 5 | *"Closed items are deleted, not struck through, and their history lives in the session summaries."* | how items are **removed** |

**O3 = 0. The opener says nothing about how BANKED items are to be cited, referenced or located
from outside.** Every one of its five instructions is about the file's internal ordering or an
item's own content.

### 1.2 What clause 4 governs — expectation 1 inverts

Clause 4 sits between two other clauses about item content, and it carries its own remedy:
*"filename plus 'next X-touching session' is enough to relocate."*

**A filename and a session trigger locate code to change. They do not locate a backlog entry.** The
clause tells an author writing a BANKED item not to write *"fix the thing at `foo.js:412`"* —
because `src/` moves under it — and to write *"`foo.js`, next foo-touching session"* instead. It is
a rule about pointers **out of** BANKED into the codebase.

Three measurements support that reading, and one complicates it:

**The "no dates" half is observed exactly.** BANKED carries **0** ISO dates in 615 lines, and 447
`S<nnn>` session tags in their place. The rule works, and it works on item content.

**BANKED cites its own items by line number, five times** (C7) — `BANKED:559` and `BANKED:240` at
`:593`, `BANKED:486` at `:595`, `BANKED:577` and `BANKED:506` at `:605`. If clause 4 forbade
line-number citation of BANKED items, the register would be breaking its own rule in its own most
recent entries. It is far more likely that the clause never addressed that case.

**Clause 4's own half is not observed on item content either.** BANKED items carry **42**
`file:line` references (A13) — `valueFrequencySpike.js:107`, `mahalanobis.js:68`,
`carlisleBalance.js:144`, and 39 more — against **47** file references without a line number.
**Roughly half the time the rule is followed and half the time it is not.** So clause 4 is a rule
about item content that item content violates 42 times.

> **The correction, stated plainly.** `SESSION347-INDEX-VIABILITY-AUDIT.md` §2.3 says *"BANKED
> explicitly refuses the only identifier an index could key on"* and *"Every external citation of a
> BANKED item … addresses it as `BANKED:<line>` — the exact form the file says it will not use."*
> **That is wrong on both halves.** The opener does not address external citation at all, and the
> form it does discourage — a line number inside an item, pointing at code — is one BANKED uses 42
> times itself. That document is Code-owned and read-only in this dispatch, so this is reported and
> not amended.

**The contradiction the dispatch was built on does not exist.** There is no rule against citing
BANKED by line number. There is a half-observed rule against putting `src/` line numbers inside
items, which is a different thing about a different direction of pointer.

---

## §2 — What cites BANKED, and whether it resolves

### 2.1 The citation surface

| citing file | lines mentioning BANKED | `BANKED:NNN` form | other forms |
|---|---|---|---|
| `STATUS.md` | 8 | **2** | count claims; a heading-free prose reference at `:155` |
| `CLAUDE.md` | 1 | 0 | names the file only, in a list of four working docs (`:315`) |
| `docs/shared/METHODOLOGY-MAP.md` | **0** | 0 | — |
| `docs/shared/V1X-FUTURE-WORK.md` | 1 | 0 | **description only** — `:107` *"(BANKED sub-item, no corpus instance yet)"* |
| `docs/shared/SESSION346-REGISTER-CENSUS.md` | 164 | **111** | 182 table rows pairing a line with a description |
| `docs/shared/SESSION347-REGISTER-CENSUS-V1X.md` | 31 | **6** | — |
| `docs/shared/SESSION347-INDEX-VIABILITY-AUDIT.md` | 48 | **15** | — |
| **total** | **253** | **134** | |

**The line-number form is almost entirely a Code-side habit.** 132 of the 134 occurrences sit in the
three Code-owned audit documents. Chat-primary and Chat-owned files use it **twice**, both in
STATUS.

### 2.2 Resolution — the direct test

The S346 census's §3 tables pair a BANKED line number with a description of what is there. That
makes them self-checking: if line numbers had moved, the descriptions would no longer match.

```bash
# 182 rows of the form | NNN | description | kind | state | dup |, extracted from ## §3 .. ## §4
# for each, score the fraction of the description's >=5-char words present at BANKED:NNN today
```

Real output:

```
FORM A — census §3 table rows citing a BANKED line: 182
resolve at >=50% of claim words present:            182 / 182
range of cited lines:                               9 - 583
```

**182 of 182 resolve, spanning BANKED lines 9 through 583** — effectively the whole file as it
stood when the census was written. Not one citation has drifted.

The two Chat-side citations, checked individually:

| citation | claims | at that line today | resolves |
|---|---|---|---|
| `STATUS.md:65` → `BANKED:559` | *"mis-states BANKED's own bullet count"* | `- **(S345, P76) Future work lives in five registers and nothing reconciles them.**` — the entry carrying the wrong counts | **yes** |
| `STATUS.md:174` → `BANKED:486` | *"S175 doc-placement write-target, unnumbered since S304"* | `- **(S304) S175 doc-placement write-target — a durable fix is owed…**` | **yes** |

**A citation that resolves to the wrong item would be the finding. There is not one.** 184 of 184
checked citations resolve.

### 2.3 The one citation that cannot be checked

`V1X:107` reads *"**Constant-value run (BANKED sub-item, no corpus instance yet).**"* It names no
line, no heading and no phrase — only that a sub-item exists somewhere in BANKED. **This is the
only form in the set that no mechanical check can resolve, in either direction.** It is also the
only citation of BANKED in either Chat-owned doc.

### 2.4 A note on what these figures are

**Every coverage and reachability figure in this document is a floor, not a count.** The index
audit's P48 case is why: P48's case material sits at `BANKED:516` under **P61**, because STATUS's
own row routes it (*"carried by P61"*). An identifier check cannot follow a carry-relation, so it
under-reports. C5 = 182/182 is a statement about the citations that exist, not about all the
material that could have been cited.

---

## §3 — Do line numbers move?

`BANKED.md` is untracked, so there is no history to measure (`git log -- BANKED.md` → 0 commits).
Two things can be done instead, and both were.

### 3.1 The S346 case, settled at source

**The two sources disagree.**

- `STATUS.md:67`–`:69`, known bug 7, verbatim:
  > *"**P59 is closed in STATUS and still live in BANKED.** One entry opens the claim and another
  > retracts it 16 lines later, open claim first. **Line numbers shifted after the S346 append —
  > locate by string.** (P76)"*
- `SESSION346-CHAT-SUMMARY.md:85`–`:87`, verbatim:
  > *"**583 → 615 lines. 182 → 197 top-level bullets, 200 → 215 at any indent.** Source md5
  > `4768918f896ada2ef49bbb81c9c96d67`, verified against the live file before editing; the first 583
  > lines of the replacement hash to the same value, so nothing above the new heading moved."*

**A correction to the dispatch's framing:** the md5 record is in **Chat's** `SESSION346-CHAT-SUMMARY.md`,
not Code's `SESSION346-SUMMARY.md`. Code's summary carries no md5 for BANKED. The dispatch
attributed it to the wrong file; the record itself is real and is quoted above.

**Settled by direct measurement, not by preferring a source:**

```bash
$ head -583 BANKED.md | md5 -q
4768918f896ada2ef49bbb81c9c96d67          # the recorded pre-S346 md5, byte for byte
$ awk 'END{print NR}' BANKED.md
615
$ command grep -n '^## Session 346' BANKED.md
585:## Session 346 — the register census
```

**The first 583 lines of the live file are byte-identical to the whole of the pre-S346 file.**
Nothing above line 583 moved. The append added 32 lines: a blank, the heading at `:585`, and 15
bullets below it.

**STATUS known bug 7's clause "Line numbers shifted after the S346 append" is wrong.** Chat
authored it and expected it to be the wrong side; it is. The rest of that bug — P59 closed in
STATUS and live in BANKED, one entry retracting another 16 lines later — is not touched by this
finding and is not assessed here. **Reported, not edited: STATUS is Chat-primary.**

The 182/182 resolution result at §2.2 is independent corroboration. Those citations were written
against the pre-S346 file and all still resolve.

### 3.2 Structural — is BANKED append-only in form?

**In current practice, yes. In form, it is two regimes with a boundary.**

| region | sections | organised by | highest session tag |
|---|---|---|---|
| lines 1–273 | 24 | **surface** — Card IA, Table standardisation, Colour-token decisions, Naming / prop cleanups … | **S290** |
| lines 274–615 | 17 | **session** — Real-world corpus (S292), Import findings (S325), Calibration (S342), Session 345, Session 346 | **S346** |

**Lines 1–273 carry no session tag above S290, and zero tags in the S320–S399 range** (S6, S8).
They have taken no new content for roughly 56 sessions.

The top region **was** edited in place for a long time: its sections carry content later than their
own heading tag — `Table standardisation (S217)` holds S274 material, `Test-card redesign cluster`
holds S282, `Watch-items` holds S286. **So insertion above existing content is a thing BANKED used
to do, and stopped.** 12 of 37 sections have a highest tag lower than the section above them (S9),
and every one of those inversions is in the top region or at the boundary.

Since roughly S292, new work has landed as a **new section at the end**: 13 bullets under
`## Session 345`, 15 under `## Session 346` (S10), both appended below everything else.

**Expectation 3 holds.** Line numbers are stable in practice because BANKED grows by appending — and
the S346 md5 is the direct proof for the one append that is documented from both sides. The
qualification is that this is a **practice**, not a structural guarantee: 24 surface-organised
sections sit above the append point and nothing prevents an item being inserted into one. The
opener's *"Surface-organised"* still describes the top 273 lines. **Nothing in the file records that
the regime changed.**

---

## §4 — Identifier candidates

### 4.1 Bold lead phrases — coverage is the constraint, not collisions

| candidate | coverage | distinct | collisions |
|---|---|---|---|
| **bold lead phrase** `^- \*\*(.+?)\*\*` | **161 of 197 (82%)** | 161 | **0** |
| first 60 characters of the bullet | **197 of 197 (100%)** | 197 | **0** |
| leading `(S<nnn>)` session tag | 74 of 197 (38%) | 16 | **10 values collide** |

**Expectation 2 holds, and the binding constraint is coverage.** CLAUDE.md's Active Conventions run
108 of 108 with zero collisions; BANKED's bullets run **161 of 197 — 82%**. Every candidate that
covers anything covers it **without a single collision**. The 36 uncovered bullets are the older
surface-residual entries whose first clause is a description rather than a title:

```
- Raw-integer `Severity ${...}` residue — the BatchView text-report line and the excelExport …
- excelExport "Measurement type" row — source change landed; live Excel-export verification …
- excelExport case consistency — Title Case sheet names alongside ALL CAPS section headers …
- Replicate-structure callout (ReportView) — the `nDC > 6 && !hasConds && !userChose` branch …
```

**A text prefix covers everything and collides with nothing** (A7). Whether a 60-character prefix is
an *identifier* or merely a *discriminator* is a design question this audit does not answer.

### 4.2 Session tags are not an identifier

74 bullets open with a parenthesised session tag, but only **16 distinct values** across them.
`S325` labels 8 different items, `S342` labels 7, `S327` labels 6, `S340` labels 5. **An identifier
that repeats is not an identifier**, and this one repeats up to eightfold.

### 4.3 The 18 prose-only items

All 18 line numbers recorded by part one were re-read at source and all 18 still hold their stated
content — a check on the carried figure (§0.6).

| form | count | example |
|---|---|---|
| opens `**bold**` | **11** | `:296` *"**Cross-cutting — the unifying structural finding (S292 Code read-only confirmed).**"* |
| opens `N. ` | **5** — of which **3** then carry a bold lead | `:310` *"1. **Cross-column pooling manufactures a guard pass — Benford FP.**"* |
| **plain prose, no lead of any kind** | **2** | `:322` *"Nick provided 22 PubPeer-flagged papers from science-detective.org as the road-test corpus. …"* · `:344` *"Surfaced at the S304 CORPUS-01 live check after the long-format pivot fix. …"* |

**16 of the 18 already carry a lead form.** Folding the 14 that yield a clean bold capture into the
bullet set gives **175 distinct leads across 215 census rows — 81% coverage, still zero
collisions** (A10). **Two items carry nothing an identifier could be derived from** without an
author writing one, and this audit does not guess what they should be called.

### 4.4 Section headings

41 sections, **zero heading collisions**, median 4 bullets each, maximum 15, and **3 sections hold
no bullets at all** (their items are prose). A heading addresses a group, not an item — at a median
of 4 items per section it is a coarse locator, not an identifier.

### 4.5 Markers the document already uses

The only per-item marker BANKED carries is the bare `#N`, and it labels **5 items** (§5).

---

## §5 — The bare `#N` scheme

### 5.1 The count, re-measured — and a correction to the dispatch

The dispatch says *"Part one found 82 BANKED citations using a bare `#N`."* **Part one found 48 for
BANKED.** Its §6.2 table reads:

> `| **C — bare #N with no allocating register** | item ids inherited from scheme B | 0 | 48 | 29 | 5 | **82** |`

**82 is the four-file total** — CLAUDE.md 0, BANKED 48, METHODOLOGY-MAP 29, V1X 5. The dispatch
attributed the whole scheme's size to one file.

Re-measured here rather than carried:

| region | raw `#N` | scheme-B | scheme-C |
|---|---|---|---|
| lines 1–583 (part one's file state) | 49 | 1 | **48** — reproduces part one exactly |
| whole file, 615 lines | 51 | 1 | 50 |

**The 2 occurrences the S346 append added are both artefacts, not new pointers** (D6): `:597` quotes
CLAUDE.md's *"revival recipe in STATUS parked #18"* — a scheme-**B** citation being reported, not
used — and `:609` is the colour hex `#4A3D8F`, whose leading `#4` the regex clips. **The live
scheme-C population in BANKED is unchanged at 48.**

### 5.2 Where the numbers came from — BANKED says

The register states the origin itself, at `:173`:

> *"(Was **STATUS parked #11** …)"*

and refers throughout to *"the parked items below"* (`:50`), *"parked #49"* (`:21`, `:208`),
*"parked #39"* (`:80`), *"parked #27"* (`:122`). **These are the pre-P-number STATUS parked
numbering** — scheme B in part one's taxonomy, stripped of its `STATUS parked` prefix. Part one
classified them as "item ids inherited from scheme B", and BANKED's own text confirms the
inheritance.

### 5.3 Do two items share a number?

**No.** Five items are **defined** by a `#N` (D10):

```
:60  - **#32 — Duplicated Data dead-code tidy (S274, Code-flagged).
:62  - **#33 — Duplicated Data LOW-card within-row prominence (S274, signal-gating question).
:202 - **#37 — ColumnGoF/Entropy multi-condition prose flattening (S281, watch-class).
:203 - **#38 — Entropy prose names no column (S281, pre-existing inert).
:204 - **#39 — VFS Finding column (S282, walk 8a remainder).
```

Five distinct numbers, five distinct subjects. Every other occurrence is a **citation** of a number
defined elsewhere — in a STATUS list that no longer exists. `#49` is cited 11 times and all 11 name
one subject (the missing fabricated fixture that would give Kurtosis a positive anchor), so the
scheme is used consistently even though its allocator is gone.

### 5.4 Gaps

20 distinct values, spanning **5 to 52**:

```
5 6 7 11 15 16 17 22 25 27 31 32 33 35 37 38 39 49 51 52
```

**28 of the 48 integers in that range are absent:** 8 9 10 12 13 14 18 19 20 21 23 24 26 28 29 30
34 36 40 41 42 43 44 45 46 47 48 50.

**The sequence is dense with gaps and its allocator is gone.** Whether a missing number was closed,
never allocated, or renumbered into the P-series cannot be recovered from BANKED — and STATUS's
current register starts at P41 with no crosswalk to the old numbering. `#49` and `P49` are different
items in different schemes.

---

## §6 — Summary of what the decision has to work with

**Not a proposal. The five findings, stated once.**

1. **There is no contradiction to resolve.** The opener never governed external citation (O3 = 0),
   and the rule it does state — no line numbers inside items — is violated by BANKED itself 42
   times.
2. **Line-number citation works today.** 184 of 184 checked citations resolve, spanning BANKED
   lines 9–583, and the one documented append moved nothing above it (md5 exact).
3. **It works because of a practice, not a guarantee.** 24 surface-organised sections sit above the
   append point and took insertions until about S290. Nothing in the file records that this stopped.
4. **Every identifier candidate that covers anything collides with nothing.** Bold leads reach 82%
   of bullets and 81% of census rows; a text prefix reaches 100%. Coverage is the only constraint,
   and it costs 36 bullets plus 2 prose items to close by hand.
5. **The `#N` scheme is 48 citations, 20 values, 5 defined items, 28 gaps, and no allocator.** It is
   used consistently and cannot be resolved by anyone who does not already know what the numbers
   meant.

---

## §7 — The number sweep

Every integer in this document's prose and tables, checked against §0. **Line references are
excluded before counting** — the rule earned at the V1X census, where searching `119` returned
twenty-odd hits on `:1190`, `:1195` and `:1199`. Commit hashes, `.gitignore` line numbers, session
tags and P-numbers are excluded on the same basis.

| figure | appears as | §0 entry or in-place derivation | verdict |
|---|---|---|---|
| 1 · 5 · 0 | opener lines / sentences / external-citation instructions | O1, O2, O3 | ✓ |
| 7 · 253 · 134 | files searched / lines mentioning BANKED / `BANKED:NNN` | C1, C2, C3; C2 and C3 shown summed | ✓ |
| 182 · 182 · 180 · 2 | census §3 rows cited / resolving / scoring 1.00 / below | C4, C5, C5b | ✓ |
| 0.67 · 0.50 | the two sub-1.00 scores | C5b; both hand-checked at §0.6 | ✓ |
| 9 · 583 | range of cited BANKED lines | C6 | ✓ |
| 184 | total citations checked | C4 + 2 STATUS citations, §2.2 | ✓ |
| 5 | BANKED self-citations by line | C7, all five listed at §1.2 | ✓ |
| 132 · 2 | `BANKED:NNN` in Code-owned docs / in Chat-side files | 111+6+15 and 2+0+0+0, §2.1 | ✓ |
| 615 · 583 · 585 · 32 | lines now / before / append heading / lines added | S2, S3, S4; 32 = S2 − S3 | ✓ |
| 290 · 346 · 0 | max tag in 1–273 / in 274–615 / S32x–S39x tags above 273 | S6, S7, S8 | ✓ |
| 41 · 24 · 17 | sections / in the top region / in the bottom | S5; 24 and 17 counted at §3.2, summing to S5 | ✓ |
| 12 · 37 | order inversions / comparisons | S9 | ✓ |
| 13 · 15 | bullets appended at S345 / S346 | S10 | ✓ |
| 56 | sessions since the top region last took content | S7 − S6 = 56 | ✓ |
| 197 · 161 · 36 · 0 | bullets / with a bold lead / without / collisions | A1, A2, A4, A3 | ✓ |
| 82% · 81% · 100% | bold-lead coverage of bullets / of census rows / prefix coverage | 161/197, 175/215, A7 | ✓ |
| 74 · 16 · 10 · 8 · 7 · 6 · 5 | session-tag coverage / distinct / colliding / the four largest collisions | A5, A6, §4.2 | ✓ |
| 18 · 11 · 5 · 2 · 14 · 3 | prose items / direct bold / numbered / plain / yielding a clean capture / numbered-and-bold | **A8 carried**; A9 measured; 14 = 11 + 3, and 11 + 3 + 2 + 2 = 18, §4.3 | ✓ |
| 200 | "200 → 215 at any indent", inside the SESSION346-CHAT-SUMMARY quotation | **quoted, not measured** | n/a |
| 175 · 215 | distinct leads across census rows / census rows | A10; **A11 carried** | ✓ |
| 41 · 0 · 4 · 15 · 3 | sections / heading collisions / median / max / zero-bullet sections | A12 | ✓ |
| 42 · 47 | `file:line` refs in items / file refs without a line | A13 | ✓ |
| 447 · 0 | session tags in BANKED / ISO dates | `command grep -oE '\bS[0-9]{2,3}\b' \| wc -l`; `command grep -coE '20[0-9]{2}-[0-9]{2}-[0-9]{2}'` | ✓ |
| 51 · 49 · 48 · 50 · 1 · 2 | `#N` whole file / in 1–583 / scheme-C in 1–583 / scheme-C whole file / scheme-B / S346 artefacts | D1, D3, D5, D6; 50 = D1 − D4 | ✓ |
| 0 | `#N` inside a `file:line` ref | D2 — the exclusion rule, run not assumed | ✓ |
| 20 · 5 · 52 · 28 · 48 | distinct values / range / absent / slots in range | D7, D8, D9; 48 = 52 − 5 + 1 | ✓ |
| 5 | items defined by a `#N` | D10, all five listed | ✓ |
| 11 | `#49` citations | D11, all eleven read | ✓ |
| 82 · 29 · 5 | part one's scheme-C totals for all files / M-MAP / V1X | **carried** — quoted from part one §6.2 at §5.1 | **⚠ carried** |
| 108 | CLAUDE.md Active Conventions bullets | **carried** — index audit §0, cited as the comparison | **⚠ carried** |
| 8 · 1 · 0 · 164 · 31 · 48 | per-file BANKED mention counts | §2.1 table, `command grep -c` per file | ✓ |
| 111 · 6 · 15 | per-file `BANKED:NNN` counts | §2.1 table, same method | ✓ |
| 16 | "16 lines later", inside the STATUS known-bug-7 quotation | **quoted, not measured** — not assessed here | n/a |
| 22 | PubPeer papers, inside a BANKED quotation at `:322` | **quoted, not measured** | n/a |

**Figures carried without re-measurement:** A8 (18 prose items, line numbers re-read but the rule
not re-derived), A11 (215), part one's 82 / 29 / 5 scheme-C totals for the other files, and the
index audit's 108 for CLAUDE.md. Every one is cited as its source's.

**Corrected during the sweep**, recorded rather than silently applied:

- A first pass tested all 468 citation instances with one matcher and reported **55 of 133**
  `BANKED:NNN` and **183 of 335** table rows resolving. **That measurement was wrong**, and the
  fault was in the test: for the inline form the "claim" was the whole citing line, which carries
  STATUS-side and prose words that were never expected to appear in BANKED. Split by form, the
  direct test — census §3 rows, where the claim really is a description of the cited line — returns
  **182 of 182**. The first figure is not a weaker version of the second; it measured the wrong
  thing and is retired.
- A first pass asserted at §0.6 that C5's threshold choice did not matter because "the lowest score
  in the set is well clear". **It is not** — the lowest is exactly 0.50, sitting on the threshold.
  The distribution was then measured (180 at 1.00, two below) and both low scorers read by hand;
  both resolve, and the dip is the census's own abbreviation. The claim was replaced with the
  measurement. **An assertion about a distribution is not a substitute for measuring it.**
- A first pass counted **51** scheme-C occurrences and compared them against part one's 48 as though
  the difference were drift. Measured on the same region part one used (lines 1–583), it is **49
  raw, 1 scheme-B, 48 scheme-C** — an exact reproduction. The two extra occurrences are in the S346
  append and both are artefacts (§5.1).
- A first pass reported that the shell `grep` wrapper was the reason a recursive search missed
  BANKED. In a worktree that is **not** the reason — `BANKED.md` is a symlink there and
  `command grep -r` misses it too. Both mechanisms are separated at §0.7.

---

## §8 — Verification

**`git status --porcelain -- src/`** → zero lines, actual output empty. **Batch: N/A.**

**The opener**, quoted verbatim with line numbers: §1.1. It occupies `BANKED.md:3`; the five
instructions it gives are tabulated, and **none of them concerns external citation**.

**The citation table** — citing file, line, form, resolves or not: §2.1 and §2.2. **184 of 184
checked citations resolve.** One citation (`V1X:107`) carries no locator of any kind and cannot be
checked in either direction.

**The append-versus-insert finding**: §3.2. Lines 1–273 carry no session tag above **S290** and zero
tags in S320–S399; lines 274–615 reach S346. The top region took insertions until about S290 and has
taken nothing since.

**The S346 disagreement, settled**: §3.1, by direct measurement rather than by preferring a source.

```bash
$ head -583 BANKED.md | md5 -q
4768918f896ada2ef49bbb81c9c96d67     # == the pre-S346 md5 recorded in SESSION346-CHAT-SUMMARY.md:86
```

**Nothing above line 583 moved. STATUS known bug 7's "Line numbers shifted after the S346 append" is
wrong.** Reported, not edited — STATUS is Chat-primary. The md5 record is in **Chat's**
`SESSION346-CHAT-SUMMARY.md:85`–`:87`, not Code's `SESSION346-SUMMARY.md`; the dispatch attributed
it to the wrong file.

**Identifier candidate coverage and collisions**: §4. Bold leads **161 of 197 bullets, 0
collisions**; **175 of 215 census rows, 0 collisions**; session tags 74 of 197 with **10 colliding
values**; a 60-character text prefix **197 of 197, 0 collisions**. **Coverage is the binding
constraint everywhere. Collisions are zero everywhere they were measured.**

**The bare `#N` findings**: §5. **48** scheme-C occurrences on part one's file state, reproducing
part one exactly — **not 82**, which is the four-file total the dispatch attributed to BANKED. **20
distinct values, range 5–52, 28 absent, 5 items defined, no two items sharing a number**, origin
stated by BANKED itself at `:173` as the retired STATUS parked numbering.

**The number sweep**: §7, with three corrections recorded.

**Nothing renders.** No preview, no screenshot.

---

## Provenance

Read-only audit, S347, measured at `4a1c115`. No register was edited. `BANKED.md` was read and
quoted, never modified. `STATUS.md` known bug 7 is reported wrong and left standing for Chat to
correct. No identifier scheme is proposed, and no rewrite or renumbering is suggested — the decision
is Chat's and these are its inputs.

**One correction to a Code-owned document is reported and not applied.**
`SESSION347-INDEX-VIABILITY-AUDIT.md` §2.3 claims BANKED "explicitly refuses the only identifier an
index could key on". §1.2 shows the opener does not address external citation at all. That document
is read-only in this dispatch.

**No CLAUDE.md convention change is proposed.** One candidate surfaced and is reported rather than
landed: §0.7's second mechanism — a symlinked workspace doc is invisible to `command grep -r` inside
a worktree, not only to the ugrep wrapper. The existing convention already mandates `command grep`
with explicit paths, which covers it; whether the symlink half is worth naming beside the
`--ignore-files` half is Chat's call.
