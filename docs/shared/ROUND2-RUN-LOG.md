# Round 2 — run log

**Status:** opened S390. Owner: Chat. Tracked (`docs/shared`).
**Purpose:** the record the pre-registration requires — `ROUND2-SPECIFICITY-SCREEN.md` §3 (rejections
with reason and position), §6.1 (the enumeration source), §6.2 (the sheet), §7 (sheet position) and
§8.2 (provenance per gate).

**Write this as the enumeration walks, not afterwards.** A log filled in from memory at the end is not
the record §3 asks for.

---

## 1 — The enumeration source

Fill this in before walking position 1.

| | |
|---|---|
| **Search URL, verbatim** | `https://datadryad.org/api/v2/search`, then `?page=2` and `?page=3` |
| **Retrieval timestamp** | 2026-08-29, 15:36:00 JST |
| **Sort control label, as the interface names it** | none applied; the listing returns date-descending by default |
| **Date field it sorts on** | `publicationDate` — the most recent published version's date, per §9.2 |
| **Total results reported** | 72,099 (same figure from the web interface at `https://datadryad.org/search?q=`) |

**The URL is the enumeration.** Anyone reproducing this screen starts here, so it is copied from the
address bar rather than described. Swapping `https://datadryad.org/` for
`https://datadryad.org/api/v2/` returns the same set as JSON.

**The tracked copy is the only copy.** The fetch also wrote per-position `files-NN.json` and
`versions-NN.json` for all 60 into an untracked `round2-raw/` in the checkout root. Verified S390
before deletion: the five aggregate files are sha-256 identical between the two copies, and the tracked
manifest reproduces all 60 file records and all 60 version records with the version records embedded.
**The untracked directory was deleted.** What it held beyond the manifest was pagination envelopes,
which say nothing about any deposit — and a scratch copy that duplicates committed content but cannot
be re-derived identically is later mistaken for a source.

**If the interface cannot sort on first publication date**, stop and record what it does offer here.
That is a finding about §6.1, not something to work around.

**Version counts are API-sourced, and calibrated.** The `Versions` column below is
`/api/v2/datasets/<doi>/versions`, not `versionNumber` from the search listing. §9.4 names the dataset
page's version history as the source; this endpoint was validated against it on
`doi:10.5061/dryad.d2547d8b7`, whose page shows **one** published version while the listing reads
`versionNumber: 10` — the endpoint returned **1**. Across all 60 it returns 1 or 2 while `versionNumber`
reaches 13, so it is counting published versions rather than curation rounds. **Calibrated on one
deposit against the page; the other 59 are consistent with it and are not independent confirmation.**

---

## 2 — Tripwires

- **n = 30, fixed.** No deposit added after results are seen, none dropped.
- **Depth:** fewer than 10 eligible in the first 50 positions → stop and report the depth reached.
- **Nothing in the pre-registration moves.** A rule that turns out wrong is superseded in a new commit
  that says so.

---

## 3 — Enumeration log

Every position walked, accepted or rejected, in order.

| Position | DOI | First published | Versions | Outcome | Reason |
|---|---|---|---|---|---|
| 1 | doi:10.5061/dryad.fttdz0980 | 2026-08-28 | 2 | | |
| 2 | doi:10.5061/dryad.rv15dv4q9 | 2026-08-28 | 1 | | |
| 3 | doi:10.5061/dryad.4mw6m90r1 | 2026-08-28 | 2 | | |
| 4 | doi:10.5061/dryad.vdncjszbg | 2026-08-28 | 1 | | |
| 5 | doi:10.5061/dryad.p5hqbzkz7 | 2026-08-28 | 1 | rejected | no tabular file in a considered format |
| 6 | doi:10.5061/dryad.wwpzgmt01 | 2026-08-28 | 1 | rejected | no tabular file in a considered format |
| 7 | doi:10.5061/dryad.hqbzkh1vv | 2026-08-28 | 1 | | |
| 8 | doi:10.5061/dryad.djh9w0wf0 | 2026-08-28 | 1 | | |
| 9 | doi:10.5061/dryad.s7h44j1pg | 2026-08-28 | 1 | | |
| 10 | doi:10.5061/dryad.d2547d8b7 | 2026-08-28 | 1 | rejected | only considered file exceeds the 50 MiB import cap |
| 11 | doi:10.5061/dryad.2ngf1vj4r | 2026-08-28 | 1 | rejected | no tabular file in a considered format |
| 12 | doi:10.5061/dryad.d7wm37qh7 | 2026-08-27 | 1 | | |
| 13 | doi:10.5061/dryad.nk98sf85b | 2026-08-27 | 1 | rejected | only considered file exceeds the 50 MiB import cap |
| 14 | doi:10.5061/dryad.bvq83bkr6 | 2026-08-27 | 1 | | |
| 15 | doi:10.5061/dryad.80gb5mm5q | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 16 | doi:10.5061/dryad.fxpnvx18x | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 17 | doi:10.5061/dryad.6djh9w1hn | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 18 | doi:10.5061/dryad.g79cnp5vs | 2026-08-27 | 1 | | |
| 19 | doi:10.5061/dryad.w3r22817z | 2026-08-27 | 1 | | |
| 20 | doi:10.5061/dryad.c59zw3rq0 | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 21 | doi:10.5061/dryad.m827p | 2026-08-27 | 2 | | |
| 22 | doi:10.5061/dryad.xsj3tx9vw | 2026-08-27 | 1 | | |
| 23 | doi:10.5061/dryad.6q573n6ff | 2026-08-27 | 1 | | |
| 24 | doi:10.5061/dryad.sn02v6xfg | 2026-08-27 | 1 | rejected | only considered file exceeds the 50 MiB import cap |
| 25 | doi:10.5061/dryad.wm37pvn3k | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 26 | doi:10.5061/dryad.z34tmpgws | 2026-08-27 | 1 | rejected | no tabular file in a considered format |
| 27 | doi:10.5061/dryad.83bk3jb37 | 2026-08-27 | 2 | | |
| 28 | doi:10.5061/dryad.gtht76j3x | 2026-08-27 | 1 | | |
| 29 | doi:10.5061/dryad.3j9kd521j | 2026-08-27 | 1 | | |
| 30 | doi:10.5061/dryad.qv9s4mwwc | 2026-08-27 | 1 | | |
| 31 | doi:10.5061/dryad.1vhhmgr9v | 2026-08-27 | 1 | | |
| 32 | doi:10.5061/dryad.9ghx3fg0p | 2026-08-27 | 1 | | |
| 33 | doi:10.5061/dryad.4mw6m90r5 | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 34 | doi:10.5061/dryad.m0cfxppgt | 2026-08-26 | 2 | | |
| 35 | doi:10.5061/dryad.4xgxd25s6 | 2026-08-26 | 1 | | |
| 36 | doi:10.5061/dryad.bvq83bkqp | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 37 | doi:10.5061/dryad.bk3j9kdr1 | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 38 | doi:10.5061/dryad.3tx95x6t7 | 2026-08-26 | 2 | | |
| 39 | doi:10.5061/dryad.280gb5n5c | 2026-08-26 | 1 | | |
| 40 | doi:10.5061/dryad.2280gb64c | 2026-08-26 | 1 | | |
| 41 | doi:10.5061/dryad.kprr4xhfb | 2026-08-26 | 1 | | |
| 42 | doi:10.5061/dryad.tx95x6bdd | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 43 | doi:10.5061/dryad.8gtht772x | 2026-08-26 | 1 | | |
| 44 | doi:10.5061/dryad.g4f4qrg50 | 2026-08-26 | 1 | | |
| 45 | doi:10.5061/dryad.hqbzkh1zw | 2026-08-26 | 2 | | |
| 46 | doi:10.5061/dryad.bzkh189qb | 2026-08-26 | 1 | | |
| 47 | doi:10.5061/dryad.cnp5hqcmx | 2026-08-26 | 1 | | |
| 48 | doi:10.5061/dryad.vt4b8gv7r | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 49 | doi:10.5061/dryad.3r2280gzk | 2026-08-26 | 1 | | |
| 50 | doi:10.5061/dryad.1rn8pk187 | 2026-08-26 | 1 | | |
| 51 | doi:10.5061/dryad.v15dv42cj | 2026-08-26 | 1 | | |
| 52 | doi:10.5061/dryad.h44j0zq2v | 2026-08-26 | 1 | | |
| 53 | doi:10.5061/dryad.zgmsbccv4 | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 54 | doi:10.5061/dryad.8gtht774v | 2026-08-26 | 1 | rejected | no tabular file in a considered format |
| 55 | doi:10.5061/dryad.jm63xsjrt | 2026-08-26 | 1 | | |
| 56 | doi:10.5061/dryad.0k6djhbh0 | 2026-08-26 | 1 | | |
| 57 | doi:10.5061/dryad.280gb5n39 | 2026-08-25 | 2 | | |
| 58 | doi:10.5061/dryad.5dv41nsmd | 2026-08-25 | 1 | | |
| 59 | doi:10.5061/dryad.dbrv15fht | 2026-08-25 | 1 | rejected | no tabular file in a considered format |
| 60 | doi:10.5061/dryad.s1rn8pkq5 | 2026-08-25 | 1 | rejected | no tabular file in a considered format |

**Outcome** is `accepted` or `rejected`. **Reason** is required on every rejection and names the shape
test that failed — no tabular file in a considered format; imports with error; under three columns; no
numeric matrix with replicate or condition structure. **Never a reason drawn from content, subject,
author or journal.**

**The cap is two gates, and three is a lower bound.** Verified S390 at `1ad8faa`: 50 MiB, written as a
literal at `ImportView.jsx:298` on `file.size` and at `:215` on the decoded `text.length`. It sits
before the xlsx branch, so it covers csv, tsv and Excel alike, and it is a hard refusal with no
override. **Because `:215` measures the CSV re-serialisation of the chosen sheet, a workbook under
50 MiB on disk can still be refused** — xlsx is compressed and its serialised form is not.

**So the three cap rejections above were found from file size and are a floor, not a count.** Any
further one can only surface at import, and is recorded then.

**Why a cap rejection is a rejection rather than a single-armed run.** `BatchView` does not enforce the
cap (S381 row 1, confirmed S390), so an over-cap deposit would run on arm A and be refused on arm B.
§3 requires both arms on all 30, and a deposit that can carry only one cannot be scored.

---

## 4 — The thirty

One row per accepted deposit. Filled before either arm runs on it.

| # | DOI | File | Sheet | Sheet index / total | Column relationship | Row semantics | Structural reason | Arm B run by | Polyfill assertion |
|---|---|---|---|---|---|---|---|---|---|

- **Sheet** is chosen by §6.2 — largest cell count among sheets that pass, tie-broken on data columns,
  then rows, then file name, then sheet index.
- **Sheet index / total** is §7's requirement, and it is what makes the discarded alternative
  auditable.
- **Column relationship** and **Row semantics** each carry the answer and its provenance word:
  `(user-set)` where you answered, `(assumed)` where the product supplied it. §8.2 — these are two
  separate gates and on C10 the product answered one of them by itself.
- **Structural reason** is why that answer follows from the file's own structure.
- **Arm B run by** is `probe` or `hand-run`, and a hand-run names the control the probe could not
  drive. §8.1 — no deposit is dropped for needing one.
- **Polyfill assertion** is §8.3: `parseExcel` through the polyfill against `parseExcel` on a buffer
  read from disk. `pass`, or the deposit is not scored.

---

## 5 — Counts

**Do not keep a running total in prose here.** Counts are computed from the tables, because a written
count goes stale silently and the tables cannot.

```bash
command grep -c '| rejected |' docs/shared/ROUND2-RUN-LOG.md
command grep -c '| accepted |' docs/shared/ROUND2-RUN-LOG.md
command grep -cE '^\| [0-9]+ \| doi:.*\| \| \|$' docs/shared/ROUND2-RUN-LOG.md
```

The third command counts rows still undecided — outcome and reason both blank.

**The original commands searched the whole file and were wrong.** Measured S391: `-cE "rejected"`
returned **24** against 21 real rejections, matching three prose lines including the command quoting
itself; `-cE "accepted"` returned **4** when no deposit had been accepted. Both figures are plausible
on sight, which is why the error survived. **Match the table row, not the word.**

Positions walked is the highest number in §3's first column.

---

## 6 — Acquisition

**Route.** Dryad's per-file endpoint at `/api/v2/files/<id>/download` requires an OAuth2 bearer token
and answers 401 without one. An API account is self-serve: ORCID login, then the interface on the
*My account* page. Tokens last 10 hours. The whole-deposit bundle needs no token but moves 1,425 GiB
to obtain 247 MiB, and **"largest file per deposit" was rejected as a substitute** — §6.2 ranks on
valid rows × data columns and a 40 KB CSV can outrank a 4 MB one.

**Rate limit, measured S391.** 100 requests per hour per API account, resetting on the hour UTC.
Reported on every response as `ratelimit-limit`, `ratelimit-remaining` and `ratelimit-reset`, the last
a Unix timestamp. **No `Retry-After` header is sent**, so a client backing off blindly will keep
missing the window. Acquiring 199 files took three windows.

**What was fetched.** 199 considered files across the 39 standing deposits, 247.3 MiB, into
`corpus-data/round2/pos-NN/`. Each verified on size and then sha-256 against the manifest before being
written; nothing failing either check was kept. The receipt is `corpus-data/round2/round2-files.json`.
`corpus-data/` is gitignored — the manifest digests and the receipt make the set reproducible, so the
bytes are not tracked.

**Zero considered files exceed the 50 MiB cap.** The `ImportView.jsx:298` gate on `file.size` cannot
fire on this corpus. **The `:215` gate on decoded `text.length` still can**, because it measures the
CSV re-serialisation of the chosen sheet; §3's floor stands.

### 6.1 — Three facts about the manifest, verified S391

- **The 21 rejections recompute exactly.** From the tracked manifest, all 60 rows matching §3, under
  both readings of §6.2's format list — extension on `path`, and extension or tabular `mimeType`.
  §6.2 names formats without saying which field decides, and **that ambiguity has zero incidence**:
  both readings give the same 21 rejections and the same 39 standing. Recorded as measured, not
  resolved by choosing after the fact.
- **`storageSize` equals the sum of `files[].size` on 60 of 60.** Bundle cost and tabular payload are
  both derivable from the manifest without downloading anything.
- **No file carries `deleted` status.** 351 `copied`, 60 `created`, 411 total. Nothing was excluded on
  status grounds and no carried-forward deletion is in play.

### 6.2 — What §6.2's cell count is measured on

**`prepStructure` takes the first block when a sheet holds several** — `corpus-run.mjs:152–153`,
`detectBlocks(preprocessed)` then `blocks[0]`. So valid rows × data columns is the **first block's**,
not the sheet's, on any multi-block sheet. Round 1 saw `detectBlocks(…).length > 1` on 2 of 41 sheets.

**Stated, not fixed.** Changing it now would be a selection rule altered after the corpus was in hand.
The sheet inventory records blocks detected per sheet so the incidence is measurable.

**Measured S391, once the inventory existed.** Across **251 measured round-2 sheets, 5 take block 1 of
several** — and one of those discards **148 of 149 blocks**. On `C11.xls` (round 1, 34 sheets, run as
the shakedown), **13 of 31 measured sheets** took block 1 of several, the widest discarding 13 of 14.
**Low incidence, near-total loss per instance; either figure quoted alone misleads.**
`detectBlocksSplit` carries it per sheet, so a deposit whose selected sheet ranked on a fragment is
identifiable rather than assumed.
