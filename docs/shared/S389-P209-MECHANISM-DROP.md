# P209 — the mechanism-grouping drop

**No. A flagged result can never arrive under a dispatch name.** Every emission site that stamps a
dispatch-side name hardcodes a non-flagged flag: six write `flag: "N/A"` and one writes
`flag: "ERROR"`. None can write `HIGH` or `MODERATE`. P209 is therefore **not** a case of a
user-facing surface omitting a firing test — but it is not purely cosmetic either, because one of the
seven is the error path, and an errored test is the loudest state the battery has.

Measured at S389 against `364e8a3`, read-only, no `src/` change. Seed offset 0 throughout.

---

## 1. Where `r.name` is set

**The name is written once, at whichever site builds the result object, and nothing rewrites it
afterwards.** There are two kinds of site.

**Canonical, on the run path.** The test module's own return. `kurtosis.js` writes
`name:"Excess Kurtosis"` at both of its two return sites (`:85` the too-few-columns/rows guard, `:546`
the real result). `selectiveNoise.js` binds `const NAME = "Selective Noise Partitioning"` at `:157`
and every return reads it.

**Dispatch-side, everywhere else.** The `tests` array in `engine.js` pairs a string with a thunk:

```
["Kurtosis",        async () => devSkip("Kurtosis","distributional") || condSkip(…) || dtSkip(…) || tagVST(await runPairVST(…))]
["Selective Noise", async () => condSkip("Selective Noise","structural") || dtSkip(…) || tagVST(await runPairVST(…))]
```

That first string is the dispatch name. It reaches a result object only through a helper that was
handed it.

### The complete set of variable-name emission sites

Searched over the *quantity* — a result object whose `name` is a variable rather than a literal —
rather than over one identifier. Seven sites, exhaustive:

| # | Site | Name written | Flag written |
|---|---|---|---|
| 1 | `engine.js:335` `dtSkip` | `testName` | **hardcoded `"N/A"`** |
| 2 | `engine.js:344` `condSkip` | `testName` | **hardcoded `"N/A"`** |
| 3 | `engine.js:355` `rsSkip` | `testName` | **hardcoded `"N/A"`** |
| 4 | `engine.js:383` `pairedSkip` | `testName` | **hardcoded `"N/A"`** |
| 5 | `engine.js:401` `devSkip` | `testName` | **hardcoded `"N/A"`** |
| 6 | `engine.js:709` the dispatch loop's `catch` | `name` | **hardcoded `"ERROR"`** |
| 7 | `aggregation.js:116` errored-coverage probe | `proto.name` | **hardcoded `"N/A"`** |

`aggregation.js:392` also writes `name: proto.name`, but there `proto = applicable[0].result` — a real
test result — so the name is canonical.

**No rewrite step exists.** `engine.js:705` is `results.push(await fn())`, which carries the object
through untouched. `tagVST` (`:321`) sets `r.vstTransform` and returns `r`. The pivot post-process
(`:726-737`) matches on `r.name.includes('Selective Noise')` — true of both spellings — and mutates
`flag`, `primaryP`, `pivotNote` and `description`, but **not `name`**, and it can only set `flag` to
`'LOW'`.

### The exact strings

Character for character, as they appear in source:

- `"Kurtosis"` — `engine.js:588`, dispatch array. Canonical form `"Excess Kurtosis"`.
- `"Selective Noise"` — `engine.js:685`, dispatch array. Canonical form `"Selective Noise Partitioning"`.

### The fallback, side by side

`src/analysis/severity.js:14` — **has one**:

```js
const flaggedDimensions=new Set(results.filter(r=>r.flag==="HIGH"||r.flag==="MODERATE").map(r=>TEST_MECHANISM[r.name]||r.category));
```

`src/analysis/localization.js:212-213` — **has none**:

```js
const mech = TEST_MECHANISM[r.name];
if (!mech || !groups[mech]) continue;
```

**The inconsistency is inside one file.** `localization.js:58`, in `extractLocalizations`, reads
`TEST_MECHANISM[r.name] || "noise"`. Two functions in the same module, one falls back and one drops.

### A near-miss on the premise

`mechanisms.js:118` exports **`DT_SKIP_ALIAS`**, mapping canonical → dispatch:

```js
export const DT_SKIP_ALIAS = { "Excess Kurtosis": "Kurtosis", "Selective Noise Partitioning": "Selective Noise" };
```

This is *not* a second mechanism registry and does not dissolve P209 — `TEST_MECHANISM` still has no
`Kurtosis` or `Selective Noise` key. `DT_SKIP_ALIAS` has exactly two readers: `severity.js:123`, which
maps canonical → dispatch to read `DATATYPE_SKIP` (whose keys are dispatch-side), and
`resolveDisplayName` (`mechanisms.js:127`), which reverses it so a skipped test shows its display name.
`buildMechanismGroups` consults neither.

### Expectations, all four held

`TEST_MECHANISM` holds **29** keys; `Kurtosis` and `Selective Noise` are **absent**; `severity.js`
has the `r.category` fallback and `localization.js`'s `buildMechanismGroups` does not. Nothing
inverted.

---

## 2. Reachability

**Answer: no.** A flagged result cannot arrive under a dispatch name.

### Where these two run

`DATATYPE_SKIP` is keyed on the dispatch names. Only `ordinal` skips them (17 entries); `count` (3
entries) and `continuous` (0) do not. So **both tests run on continuous and count data** — the two
data types that cover 26 of the 27 fixtures.

A second live path emits the dispatch names on any data type: `condSkip` fires when
`isConditionsMode`, which `engine.js:223` defines as
`condCtx.type === 'column-grouped' && !condCtx.paired`. That is a column-relationship setting, not a
data type. It still writes `flag: "N/A"`.

### They do flag — the refuting observation is absent

The dispatch named the refuting observation as *a data-type or dispatch gate that makes these two
unreachable-when-flagged on every path*. **I looked for such a gate and there is none.** Read from
`test/flag-matrix.json` at seed offset 0:

| Result name | Flag tally across 27 fixtures |
|---|---|
| `Selective Noise Partitioning` | **HIGH ×3**, LOW ×19, N/A ×4 |
| `Excess Kurtosis` | LOW ×25, N/A ×1 |
| `Kurtosis` | N/A:dataTypeMismatch ×1 |
| `Selective Noise` | N/A:dataTypeMismatch ×1 |

Selective Noise Partitioning returns **HIGH** on `08-elisa-fabricated.csv`, `20-bimodal-fab.csv` and
`23-recurrence-null-mixed.csv`. Excess Kurtosis runs on 25 fixtures and, per its per-condition
promotion arm, can reach MODERATE.

**So the "no" does not rest on these tests being unable to fire.** They fire. It rests on the
emission sites: when they fire they came from the test module's own return, which writes the
canonical name, and the canonical name is a `TEST_MECHANISM` key. The two spellings are disjoint by
construction — a result carries the dispatch name **only** when a skip helper or the catch block
built it, and all seven of those hardcode the flag.

### Which observation would have flipped this

A `flag:` written from a variable or an expression at any of the seven sites in §1, or a return
inside `kurtosis.js` / `selectiveNoise.js` that wrote the dispatch spelling. **My read could have
produced either**: I read all seven return statements in full and grepped both test modules for every
`name:` site (`kurtosis.js` has exactly two, `selectiveNoise.js` binds one `NAME` constant). A single
`flag: computedFlag` beside a `name: testName` would have given the opposite answer.

### Does a flagged result reach `buildMechanismGroups`?

Yes, and it maps correctly. A firing Selective Noise Partitioning carries the canonical name, is
keyed to `replicate`, and lands in the Cross-Replicate Comparisons group on every consumer.

### Does `severity.js` count it?

`severity.js:14` filters to `HIGH`/`MODERATE` before the map, and no dispatch-named result can be
either — so severity never sees one, exactly as the grouping never sees one. **There is no run on
which the file verdict counts a firing test that the mechanism grouping drops.** The two agree.

### The residual, and it is not nothing

Site 6 writes `flag: "ERROR"`. A thrown Excess Kurtosis or Selective Noise Partitioning emits
`{ name: "Kurtosis", flag: "ERROR" }` and is **dropped from every consumer in §3** — the loudest state
the battery can produce, omitted without a word. Severity does not count it either, so no verdict
moves; the cost is entirely that the reader is not told the test blew up. Unobserved on the corpus.

Site 7 has a second failure mode recorded at S379: `aggregation.js:100` does not await its
`testFn([])` probe, so an `async` test yields a Promise and `proto.name` is `undefined` — an unmapped
name that is not even a string. It too is hardcoded `flag: "N/A"`.

---

## 3. Consumers, and the 27-against-29

### Every consumer

Seven production call sites in four files, plus one probe. All take the same drop.

| Call site | Surface | What a dropped result costs the reader |
|---|---|---|
| `ReportView.jsx:252` | **Copy Summary** (clipboard) | The test's whole row vanishes — no name, no flag, no reason. This is the 27-of-29 gap below. |
| `ReportView.jsx:729` | **Standalone HTML report** | Absent from the category summary table. |
| `ReportView.jsx:1281` | **On-screen category/evidence summaries** | Absent from `catSummaries`, so absent from the applicable/clear/flagged counts that section prints. |
| `ReportView.jsx:1305` | **On-screen QC-mode category rows** | Absent from the row's counts. Its sibling line at `:1311` re-derives the same predicate directly — `TEST_MECHANISM[r.name] === mk` — and drops identically, so the fix has to reach that line too. |
| `VerdictBanner.jsx:70` | **§1 verdict banner** | Absent from the mechanism count strip. |
| `BatchView.jsx:270` | **Batch markdown copy** | Absent from that file's per-mechanism block. |
| `excelExport.js:390` | **.xlsx workbook** | Absent from the category summary sheet. |
| `test/probes/probe-s354-withheld-state.mjs:102` | probe | Instrument, not a product surface. |

`ReportView.jsx:58` (`s5ClusterGroups`) does **not** take the drop: it reads
`TEST_MECHANISM[r.name] || "replicate"` and carries a comment naming this exact problem. So §5's
coverage panel already sees all 29 while the seven surfaces above see 27 — **two surfaces of one
report disagree on how many tests exist.**

### The 27-against-29, settled

Not inferred from the two names. Counted per fixture over `test/flag-matrix.json`:

- **Every one of the 27 fixtures emits exactly 29 results.**
- **`14-crctest-survey.csv` is the only fixture with any drop, and it drops exactly 2** —
  `Kurtosis` and `Selective Noise`.
- 29 emitted − 2 dropped = **27 rows. The gap is exactly this drop; nothing else removes rows.**

### The arithmetic

`TEST_MECHANISM` 29 keys · 31 distinct result names across the matrix · residual exactly
`["Kurtosis", "Selective Noise"]` · **no registry key is unused.** Confirmed.

---

## Candidate fixes — described, not chosen

Nick's call. None implemented.

### (a) Add the two dispatch names to `TEST_MECHANISM`

Two lines, both `"replicate"`, matching where the canonical names already sit. Moves no user-visible
string and no flag-matrix key.

*Cost:* `BATTERY_SIZE` is `Object.keys(TEST_MECHANISM).length` (`mechanisms.js:75`), so this takes
the battery total from **29 to 31** and every "N of 29" surface reads 31. That is a real regression
unless the constant is re-derived from a filtered key set, which turns two lines into a change to the
battery-count contract. Does not protect against a future unmapped name.

*Verify before shipping:* the three readers of `BATTERY_SIZE` — `ReportView.jsx:248`,
`ReportView.jsx:1550` and `VerdictBanner.jsx:94`, all of them "N of BATTERY_SIZE tests completed"
sentences. **Take that list from a grep, not from the constant's own comment**, which at `:71-74`
names "the import-screen applicability list, the report coverage line, and the section-5 methodology
block" — a description that no longer matches the three call sites above. Also confirm the two new
keys never collide with a canonical name, and that `severity.js`'s dimension set is unaffected (it
is — dispatch names are never flagged).

### (b) Add an `r.category` fallback to `localization.js`, mirroring `severity.js`

`const mech = TEST_MECHANISM[r.name] || r.category;` — one line, covers every future unmapped name,
leaves `BATTERY_SIZE` alone.

*Would it land these two in the right group?* **Yes.** The dispatch passes `"distributional"` for
Kurtosis and `"structural"` for Selective Noise as the `category` argument, and neither is a
`MECHANISM_ORDER` key — so `groups[mech]` is undefined and the `|| !groups[mech]` clause still drops
them. **A bare `|| r.category` therefore fixes nothing for these two.** It would need to be
`|| r.category` with those two dispatch categories added to the mechanism map, or
`|| "replicate"` — the form `ReportView.jsx:58` and `ImportView.jsx:1207` already use.

*Verify before shipping:* that `"replicate"` is correct for every name that could fall through, not
just these two; and that `ReportView.jsx:1311`'s parallel predicate gets the same treatment or the
QC rows still disagree with their own counts.

### (c) Rename at emission so dispatch names match registry keys

Change the two strings in `engine.js`'s `tests` array to the canonical spellings. Collapses the
31-against-29 at its root and makes `DT_SKIP_ALIAS` and `DISPATCH_TO_CANONICAL` dead.

*Cost, and it is the largest:* **the dispatch key is the PRNG stream identifier.** `rngFor("Kurtosis")`
derives that test's stream from the data hash plus this exact string, so renaming reseeds Excess
Kurtosis on every file and every permutation p it reports moves. Nothing fails and nothing warns —
the batch simply comes back different. It also moves `test/flag-matrix.json` keys, the
`DATATYPE_SKIP['ordinal']` keys, and any `expected.flags` / `ACKNOWLEDGED` / `MATRIX_EXCEPTIONS` entry
naming either string.

*Verify before shipping:* a `SEEDS=8` sweep before and after, with every declaration for Excess
Kurtosis re-derived; regenerate the flag matrix deliberately rather than to clear a red; and confirm
`DATATYPE_SKIP` and `DT_SKIP_ALIAS` are re-keyed in the same change.

### (d) Fix the drop rather than the name — make it loud

`buildMechanismGroups` currently `continue`s in silence. It could route an unmapped result to a
fallback group *and* record it, so a future unmapped name surfaces instead of vanishing. Independent
of (a)–(c) and compatible with all three.

*Verify before shipping:* that no consumer breaks on a group it did not expect, and that a
`flag: "ERROR"` result renders somewhere a reader will see it.

---

## What this does not settle

The ERROR path is unobserved on the corpus, so its behaviour is read from source rather than
measured. A fixture that makes a test throw would settle it; none exists.
