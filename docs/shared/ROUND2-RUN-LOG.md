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
| **Search URL, verbatim** | |
| **Retrieval timestamp** | |
| **Sort control label, as the interface names it** | |
| **Date field it sorts on** | |
| **Total results reported** | |

**The URL is the enumeration.** Anyone reproducing this screen starts here, so it is copied from the
address bar rather than described. Swapping `https://datadryad.org/` for
`https://datadryad.org/api/v2/` returns the same set as JSON.

**If the interface cannot sort on first publication date**, stop and record what it does offer here.
That is a finding about §6.1, not something to work around.

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

**Outcome** is `accepted` or `rejected`. **Reason** is required on every rejection and names the shape
test that failed — no tabular file in a considered format; imports with error; under three columns; no
numeric matrix with replicate or condition structure. **Never a reason drawn from content, subject,
author or journal.**

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
command grep -cE "accepted" docs/shared/ROUND2-RUN-LOG.md
command grep -cE "rejected" docs/shared/ROUND2-RUN-LOG.md
```

Positions walked is the highest number in §3's first column.
