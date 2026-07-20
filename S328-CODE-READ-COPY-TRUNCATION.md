# S328 Part 1 — where the Copy summary truncates

Read-only. Nothing changed for this part.

**Short answer.** The shared formatter did land, and it is fine. The truncation
is not in either surface it feeds. It is in a **third** surface — the Copy
summary — which never called `formatSkipDetail` at all and applies a
150-character cap to every not-applicable reason it prints.

---

## 1. Does the §3 stanza call `formatSkipDetail`, or build its own string?

**It calls it.** `ForensicsCategoryBlock.jsx:253`:

```js
if (g.detail == null) g.detail = formatSkipDetail(r);
```

imported at `:20` from `analysis/handoffModel.js`. The §4 body uses the same
formatter through the model — `handoffModel.js:264` sets `detail:
formatSkipDetail(r)` on each `notRun` entry, and `promptBodyRenderer.js:90`
renders it.

Those are the only two call sites, and they are the two the branch claimed. **The
stated design landed.**

## 2. Where is the truncation applied?

**`ReportView.jsx:174`** — a character cap:

```js
if(r.flag==="N/A"){
  lines.push(`  N/A      ${r.name}`);
  if(r.description) lines.push(`           ${r.description.slice(0,150)}`);
  continue;
}
```

`slice(0, 150)`. Verified against the actual string rather than inferred — the
skip reason is 217 characters, and its first 150 are:

> The sequence scan was skipped because this dataset is too large for it. The
> scan's cost grows with rows, columns and offsets together, so it carries a

That is the reported symptom, character for character.

**And this is why the figure line never appears.** The block prints
`r.description` and nothing else. It has no knowledge of `scanSkippedRows` or
`scanRowLimit`, and it does not call `formatSkipDetail`. The figures are not
truncated — they were never rendered on this surface.

So there are two separate defects here, not one:

- the reason is cut at 150 characters
- the detail line is absent entirely

## 3. Is the cap general or specific to this path?

**General.** It sits on the `r.flag === "N/A"` branch of the Copy summary's
per-test loop, so it applies to **every** not-applicable test's reason, not only
to skips. Most existing reasons are shorter than 150 characters and so pass
through whole — which is why this has not been noticed before. The skip reason is
the longest in the battery at 217, so it is the first to hit the cap.

The same builder caps other things at other sizes — `slice(0,10)` on duplicate
row lists at `:212`, `slice(0,60)` on value lists at `:213` and `:217`,
`slice(0,200)` at `:538`. The 150 is one of a family of display caps in this
dump, not a one-off.

## 4. Does §4 truncate as well?

**No.** `promptBodyRenderer.js:84–93` applies no cap:

```js
return skipped.map(s => {
  const detail = s.detail ? ` (${s.detail})` : "";
  return `- ${s.testName} — ${s.reason}${detail}`;
}).join("\n");
```

Rendered output, from the probe:

```
- Sequential Duplication — The sequence scan was skipped because this dataset is
too large for it. The scan's cost grows with rows, columns and offsets together,
so it carries a size cap. This is a limit of the scan, not a property of the
data. (9,398 rows, against a limit of 5,000)
```

Full reason, figures present, one line.

**The pasted summary showing only one occurrence is explained.** §4 and the Copy
summary are different buttons producing different text. §4 is "Copy prompt"
(`ReportView.jsx:1419`); the truncated output is "Copy summary"
(`ReportView.jsx:894`, handler at `:479`). Whichever was pasted, only one of the
two surfaces was in it.

---

## What this means

The card and §4 are correct and share the formatter as designed. The Copy summary
is a third plain-text dump that predates the skip work and reads `r.description`
directly.

Fixing it is not a one-character change to the cap. Raising 150 would restore the
full sentence but still leave the figures absent, because that builder does not
call the formatter. Making it agree with the other two means routing it through
`formatSkipDetail` as well — which is a small change, but it is a change to a
surface this dispatch scoped as read-only, and the cap is general enough that
lifting it affects every not-applicable reason in the dump. Left for a decision.

---

## Out of scope, for parking

**Residual Spike Correlation's "Insufficient rows (<10)" on a 9,398-row file.**

`residualSpikeCorrelation.js:42–44`:

```js
const nFeatures = Math.min(...slices.map(s => s.matrix.length));
if (nFeatures < 10) return { name: NAME, category: CAT, flag: "N/A",
  description: "Insufficient rows (<10) for residual spike correlation analysis." };
```

`nFeatures` is the **minimum row count across condition slices** — the smallest
group, not the file. C14's `Data` sheet groups into 236 conditions with a minimum
size of 1, so `nFeatures` is 1 and the guard fires.

The count is correct; the wording is not. It says "rows" where it means "rows in
the smallest condition". On a file with 9,398 rows and 236 groups the message
reads as plainly wrong. Not fixed, as instructed.

---

## Verification

Batch **28/28**, `npm test` **9/9**. Neither can see this part — nothing changed
for it — and neither could see Parts 2 and 3 either. The 150-character cap is
reachable only by a reason longer than 150 characters on a not-applicable test,
and no fixture produces one.

## A note on the dispatch's paths

Three named files do not exist at the paths given. There is exactly one file of
each name, so the intent was unambiguous and I used the real paths:

| dispatch | actual |
|---|---|
| `src/report/handoffModel.js` | `src/analysis/handoffModel.js` |
| `src/components/ReportView.jsx` | `src/components/views/ReportView.jsx` |
| `src/report/coverage.js` | `src/analysis/coverage.js` |

`coverage.js` was read only and not changed, as instructed.
