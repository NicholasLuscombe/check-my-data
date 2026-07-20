# S327 — Code read: the skip state

Read-only. No file in `src/` was changed. Worktree `cmd-s327-skip-state`, branch `s327-skip-state`, off `d4c38b5`.

## Headline

The lean does not survive the structure-first pass, and Sequential Duplication turns out to be the least of it.

Sequential Duplication is the only test in the battery whose *whole* verdict comes from a cost ceiling. But the pass found **eight further cost ceilings inside seven other tests** that skip a sub-test rather than the whole test, and fold a literal `p = 1` into a combined p-value. Six of the eight are invisible in the returned object — there is no field a reader or a downstream consumer could inspect to learn the scan did not run. Those are not a display problem. They are a correctness problem that the display could not surface even if it wanted to.

Separately, the pass found a **severity ceiling** nobody appears to have costed: six tests tier their permutation count down as the row count rises, and on files the size of C10, C14 and C25 the resulting arithmetic floor puts `HIGH` out of reach entirely. On Cross-Condition Consistency above 10,000 rows per condition, even `MODERATE` is unreachable — the test can only ever return `LOW`.

The coverage vocabulary can express the Sequential Duplication case today with no new state. It cannot honestly express the other eight, because those tests did run and did produce a verdict; what is wrong with them is that the verdict is built on a silently narrowed evidence base.

---

## 1. The 29-test classification

`src/tests/` holds 30 files; `crossConditionProperties.js` is the Track D property registry, not a test. The 29 below are the battery.

Four columns of classification, which I found I needed instead of the prompt's two. The discriminator that matters is **did the test look at the data on this path**:

- **Ceiling skip** — a maximum. The test could have run and declined for cost. This is the S327 class.
- **Applicability guard** — a minimum, shape, or dataType requirement. The data genuinely cannot support the test. Returns `flag: "N/A"`.
- **Determined-null exit** — the test looked, the result was already fixed as null, and it stopped refining a number that could not change tier. Legitimately "ran".
- **Degenerate / semantic constant** — the test looked and found nothing to model. Returns a literal p, usually with `flag: "LOW"`.

Effect-size gates (the `esGate` pattern, roughly a dozen sites) compute a real p and then override the flag to `"LOW"`. They are not in scope here — the test ran, the p is real, the override is a deliberate forensic-relevance floor — but they are noted where they interact with a skip.

| # | Test | Whole-test ceiling skip | Sub-test ceiling skip | Applicability guards | Constant-p / other |
|---|---|---|---|---|---|
| 1 | Autocorrelation | — | — | 1 (L22) | esGate → LOW |
| 2 | Benford First Digit | — | — | 4 | caps sim at 10k, still computes |
| 3 | Benford Second Digit | — | — | 3 | caps sim at 10k, still computes |
| 4 | Blocked Mahalanobis | — | — | 5 | determined-null exit (L525) |
| 5 | Carlisle Balance | — | — | 7 | 1 assumption-violation N/A (L114) |
| 6 | Column Goodness-of-Fit | — | — | 3 fn + 3 per-column | inline N/A on non-finite p (L220) |
| 7 | Constant Offset | — | **1** (L165, MAX_PERM_PAIRS=30) | 1 (L25) | esGate; **severity ceiling** L164 |
| 8 | Cross-Condition Consistency | — | — | 4 fn + 4 unit-level | neutralise to 1 (L616); **severity ceiling** L166 |
| 9 | Decimal Precision | — | — | 1 (L32) | **literal p=1.0 + flag LOW** (L60) |
| 10 | Duplicate Detection | — | **2** (L370 BLOCK_SCAN_LIMIT, L759 PARTIAL_ROW_MAX_OPS) + card cap L753 | 3 | — |
| 11 | Entropy / Zipf | — | — | 3 fn + 1 per-column | esGate; **HIGH unreachable** (B=999) |
| 12 | Inter-Replicate Correlation | — | **1** (L174, MAX_WIN_IRC_PAIRS=30) + stride L186 | 6 | **allHighSNR → LOW + p=1** (L278); **severity ceiling** L240 |
| 13 | Excess Kurtosis | — | — | 1 (L78) | determined-null exit → p=1.0 (L332) |
| 14 | LOESS Residual | — | **1** (L345, MAX_LOESS_PAIRS=30) | 4 | **literal p=1 + flag LOW** (L71) |
| 15 | Mahalanobis Row Outlier | — | — | 4 | none |
| 16 | Mean-Variance / Noise Scaling | — | — | 3 | literal p=1 in-range (L117) |
| 17 | Missing Data Pattern | — | **1** (L58, nC≤50 pairwise scan) | 6 | — |
| 18 | Modality | — | — | 3 fn + 3 per-column | p-floor clamp 0.001 (L161) |
| 19 | Rank Correlation (CCR) | — | — | 3 | — |
| 20 | Regional Noise | — | — | 4 | esGate; N_PERM step L140 |
| 21 | Residual Spike Correlation | — | — | 3 | none |
| 22 | Row-Mean Runs | — | — | 3 | — |
| 23 | Runs Test | — | **2** (L103 MAX_WIN_PAIRS=30, L203 scan skipped under esGate) + stride L163 | 1 (L16) | fall-through p=1 (L76); **severity ceiling** L207 |
| 24 | Selective Noise | — | — | 3 fn + 7 helper | **literal 1.0 into shared BH-FDR pool** (L171) |
| 25 | **Sequential Duplication** | **1 (L38, BLOCK_SCAN_LIMIT=5000)** | — | 2 | — |
| 26 | Terminal Digits | — | — | 3 | none |
| 27 | Value Frequency Spike | — | 1 pass-level (L274) + 1 bucket-level (L380) | 7 | S312 repaired the deep-tail case |
| 28 | Windowed Autocorrelation | — | — | 3 + 1 per-pair | **severity ceiling** L82 |
| 29 | Within-Row Variance | — | — | 3 | semantic suppression → p=1 (L137) |

All 29 accounted for. Six tests have no branch of any of these kinds beyond ordinary applicability guards: Mahalanobis Row Outlier, Residual Spike Correlation, Terminal Digits, Row-Mean Runs, Rank Correlation, Regional Noise.

### 1.1 The case the dispatch named

`src/tests/sequentialDuplication.js:38`

```js
const BLOCK_SCAN_LIMIT = 5000;   // mirror DupDet: skip the O(cols × offsets × rows) scan on huge tables

if (nR > BLOCK_SCAN_LIMIT) {
  return { name: "Sequential Duplication", category: "copied", flag: "LOW", primaryP: 1,
    sequences: [], nSequences: 0,
    description: `Sequence scan skipped for large dataset (${nR} rows > ${BLOCK_SCAN_LIMIT}).` };
}
```

The two guards above it (`nR === 0`, `nR < 4`) return `flag: "N/A"` with no `primaryP` key at all. This one returns `flag: "LOW"` with `primaryP: 1`. That asymmetry is the whole defect: the file's own not-applicable convention is available three lines up and this branch does not use it.

The reader sees a Low verdict with a real-looking p. A 16,522-row file has strictly more opportunity for a recurring height-3 run than the 4-row minimum the test accepts, so this is not a data-shape limitation. It is a decision not to look, encoded as a finding of nothing.

### 1.2 The class the dispatch did not name

Eight sub-test ceilings. Each skips part of a test and contributes a literal `p = 1` to a combination, or silently narrows what got scanned. The test still returns a real verdict tier, so none of these are reachable by any coverage-state change.

**Duplicate Detection, `duplicateDetection.js:370`.** The same `BLOCK_SCAN_LIMIT = 5000`, same rationale, different consequence. Test 4 (block copies) is skipped; the other four sub-tests still run. `bestBlockP` keeps its initialiser `1` from L667 and enters the five-way BH-FDR at L806 as the fourth raw p. It occupies a slot in the denominator, so it also dilutes the four sub-tests that did run. **`blockScanSkipped` is computed at L371 and never returned.** Its sibling `partialRowSkipped` *is* returned at L824 — so the file demonstrates the right pattern and does not apply it here.

**Duplicate Detection, `:759`.** `PARTIAL_ROW_MAX_OPS = 20000000`. Trips → `partialRowP` stays literal `1`. This one is exposed.

**Missing Data Pattern, `:58`.** `if (nC <= 50)` gates the entire pairwise Fisher scan — sub-signal (a) of three. Above 50 columns it never runs. Nothing in the result records it; `nPairwiseHits` reads `0`, which is indistinguishable from a scan that ran and found nothing.

**Inter-Replicate Correlation `:174`, Runs `:103`, Constant Offset `:165`, LOESS `:345`** — all cap the number of column pairs examined at 30. Above 30 pairs the remainder is silently unexamined. None of the four surfaces the truncation.

**Value Frequency Spike `:274` / `:380`.** Span ceiling of 10,000. This is the one that was handled well: the pass-level skip is surfaced via `pass1Status`, the bucket-level skip via `bucketDiag[].skipped`, and S312 added `distinctKeyNearDupScan` so a wide-but-deep bucket is rerouted rather than discarded. It is the worked example of taking a ceiling seriously.

So the battery already contains both the failure mode and its remedy. Six of eight ceilings are silent; VFS shows what surfacing looks like; Duplicate Detection surfaces one of its own two and not the other.

### 1.3 Three cases that are not skips but read like them

Worth separating, because they would be mis-swept by any fix that keys on "returns a literal p".

`loessResidual.js:71` returns `flag: "LOW", primaryP: 1, scanP: 1` when `globalVar < 1e-30`. The test looked. Residual variance is genuinely zero, the variance-ratio scan is undefined, and the description says so. Cause is applicability; the reporting is a verdict. The other four guards in the same function return `"N/A"`.

`decimalPrecision.js:60` — when `nDistinct === 1` the binomial model is never applied, `primaryP` keeps its initialiser `1.0` and `flag` keeps `"LOW"`, and the function falls through to the full return. The interpretation string is honest ("consistent with single fixed-precision instrument"). The flag is not.

`interReplicateCorrelation.js:278` — under `allHighSNR` the test writes an interpretation saying in as many words that it has "limited discriminating power", then returns `flag: "LOW"` with `globalBestP` neutralised to `1`. This is the sharpest self-contradiction in the battery: the prose says the test cannot discriminate and the verdict says it discriminated and found nothing.

By contrast `kurtosis.js:332` and `blockedMahalanobis.js:525` are *legitimate*. Both stop a permutation loop early, but only after the observed statistic is established to sit inside the null body — the result was already determined. Kurtosis burns the PRNG to keep downstream reproducibility. These are correctly "ran" and should not be touched.

### 1.4 The severity ceiling

Not asked for, and I think more consequential for the corpus than the skip state.

Six tests tier permutation count down as N rises. With `p = (exceed + 1)/(N_PERM + 1)`, that sets an arithmetic floor. Against `ALPHA.FLAG = 0.001` and `ALPHA.NOTE = 0.01` (`thresholds.js:22`):

| Test | Tiering | Floor at the top tier | Consequence |
|---|---|---|---|
| Constant Offset `:164` | 199 above 10k rows | 0.005 | HIGH unreachable |
| Runs `:207` | 199 above 1k | 0.005 | HIGH unreachable on the windowed arm |
| Inter-Replicate Corr `:240` | 199 above 1k | 0.005 | HIGH unreachable on the windowed arm |
| Windowed Autocorr `:82` | 199 above 5k | 0.005 | HIGH unreachable (already noted at L174) |
| Entropy / Zipf `:36` | fixed 999, two-sided | 0.002 | HIGH unreachable on any input |
| **Cross-Cond Consistency `:166`** | 199 above 10k | **0.01** | **MODERATE also unreachable — LOW only** |

The Cross-Condition Consistency row is the one to check. `p2 = min(1, 2 × min(pUpper, pLower))` at L526, each side floored at `1/(B+1)`, so the floor is `2/200 = 0.01`, and `0.01 < 0.01` is false. BH-FDR only raises it. Caveat I could not settle cheaply: `maxN` there is the largest per-condition N, not the file's row count, so whether C10/C14/C25 actually cross it depends on their condition sizes. I did not check the corpus files. Windowed Autocorrelation's `nR > 5000`, though, is a plain row count — C10, C14 and C25 all cross it.

The Windowed Autocorrelation ceiling is already documented in a comment at L174. The other five are not.

---

## 2. What the coverage vocabulary can express

`src/analysis/coverage.js`, `classifyCoverage` at L37, in order:

1. `!r` → `errored`
2. `VERDICT_FLAGS.has(r.flag)` where the set is `{HIGH, MODERATE, LOW}` → `ran`
3. `r.groupingPending` → `pending`
4. `r.groupingUnassessed` → `unassessed`
5. `r.error === true || r.flag === "ERROR" || r.erroredCoverage === true` → `errored`
6. everything else → `notApplicable`

**Mechanism per state.** `ran` is a flag-membership test. `pending` and `unassessed` are explicit boolean stamps the engine or UI writes. `errored` is three explicit signals — two flags and a sentinel flag value; the header comment at L21–28 records that `erroredCoverage` was made a flag precisely so a reword of the aggregator's human-readable note could not silently empty the bucket. `notApplicable` alone is **not marked at all**. It is the fall-through: whatever is left after four positive tests. That asymmetry matters for the question below.

**Could a skip be marked not-applicable today, without a new state?** Yes, and it needs no change to `coverage.js`. Because `notApplicable` is the default branch, a result only has to fail all four preceding tests. Concretely, at `sequentialDuplication.js:38`: change `flag: "LOW"` to `flag: "N/A"` and drop the `primaryP: 1` key. That is the entire mechanical change. `"N/A"` is not in `VERDICT_FLAGS`, no grouping stamp is set, no error stamp is set — it falls to `notApplicable`. The two guards immediately above it in the same file already do exactly this.

Dropping `primaryP` is not cosmetic. Fisher's combination in `aggregation.js` and any consumer reading `r.primaryP` would otherwise see a real-looking `1`.

**Is there anything not-applicable asserts that would be false of a skip?** Yes — one thing, and it is in the user-visible copy rather than the code.

The state's own doc comment (L6) reads "the data shape does not support the test". Of a 16,522-row file and a scan that handles 5,000, that is false. The data shape supports the test perfectly; the implementation declined.

The display copy repeats it. `ReportView.jsx:1387` renders "**N tests did not apply to this data** and were not run." `ClusterRow.jsx:76–79` reasons that not-applicable is the case where "nothing could run", and that "this state nothing reverses" — both false of a skip, which could run given a wider ceiling or a faster scan, and which a future implementation change does reverse.

So the honest answer to Chat's lean is: **the routing fits, the semantics stretch, and the stretch is repairable in copy but is real.** The state's mechanism (fall-through, no stamp) accommodates a skip without argument. Its *stated meaning* currently asserts something false about one. A cause-specific reason string does most of the repair, because the per-reason stanza displays the reason verbatim and can say "scan skipped" in the reader's own words. What it does not repair is the two generic lines above — the collapsed count says "not applicable" and `ReportView`'s clean-path sentence says "did not apply to this data", and neither is reachable from the reason string.

That is a smaller problem than a sixth state, and I would not read it as a reason to build one. But it is not nothing, and it is the piece a reason-string-only fix leaves behind.

---

## 3. The upfront-check comparison

S324's four checks, all in `src/analysis/engine.js`:

| Site | Constant | Where declared |
|---|---|---|
| `:440` Mahalanobis Row Outlier | `MAHAL_MIN_COLS` | `export const MIN_COLS = 3` — `mahalanobis.js:7` |
| `:531` Column Goodness-of-Fit | `GOF_MIN_OBS` | `export const MIN_OBS = 30` — `columnGof.js:49` |
| `:544` Modality | `MODALITY_MIN_N` | `export const MIN_N = 50` — `modality.js:62` |
| Fourth | via `noGroupMeetsMin` | `src/analysis/applicability.js` |

The dispatch site imports the constant under an alias (`engine.js:91–92`) and checks before fanning out. Two shapes: Mahalanobis tests a whole-dataset fact (`matrix[0].length < MAHAL_MIN_COLS`) directly; GoF and Modality test a per-group fact through the shared predicate `noGroupMeetsMin(rowGroups, minRows)` at `applicability.js:15`, which is a one-liner asking whether any group clears the minimum.

`applicability.js`'s header states the reason the module exists: two dispatch sites (`runFullAnalysis` and `runConfirmedGroupedTests`) must agree, and the drift between them before S325 is what put the confirm path's grouped tests into the errored bucket.

**Is a ceiling expressible in this pattern?** Mechanically, yes, and Mahalanobis is the closer template of the two — it reads a whole-dataset fact before any group split, which is exactly the shape of a row-count ceiling. A declaration would be a second exported constant plus a dispatch-site check with the comparison reversed. I am not writing it, per the dispatch.

Three ways it differs in kind, in ascending order of how much they matter:

*Minor.* A minimum is a property of the data alone. A ceiling is a property of the data **and** the implementation — it moves when the algorithm is optimised or the constant is retuned. A constant named like a data requirement will read as one, which is how the current `"LOW"` return came to look reasonable.

*Moderate.* The four S324 constants are each a genuine floor below which the statistic is undefined or unstable. Of the ceilings in the battery, only Sequential Duplication's is a whole-test decision that an upfront check could make. The other eight are *inside* a test, gating a sub-test whose siblings still run. An upfront check cannot express "run this test but skip its fourth sub-test" — the dispatch site has no vocabulary for a partial run, and neither does the coverage classifier.

*Load-bearing.* The four checks all move a test **from a worse state to a better one** — from errored, or from a fan-out where every group returns N/A, to a clean single not-applicable. Nothing is lost. Lifting Sequential Duplication's ceiling to the dispatch site moves it from a *false* state to a *true-but-uncomfortable* one, and the discomfort is exactly the semantic stretch in §2. That is still an improvement. It is not the same kind of improvement, and I would not let the S324 precedent carry the argument on its own.

---

## 4. The display path

**Where a skip would surface if it became not-applicable.** `ForensicsBody.jsx:457` filters each cluster's tests by `classifyCoverage(r) === "notApplicable"` and passes them to `ForensicsCategoryBlock` as `notApplicableTests`. Collapsed (`:200`), that is one `CollapsedSummaryRow` reading the count and the label "not applicable", with the joined display names. Expanded (`:204`), the same row plus stanzas from `groupNotApplicableByReason` (`:235`) — reason text in `C.TEXT_3`, then the test names joined by `" · "`, no card chrome.

Sequential Duplication carries `TEST_MECHANISM["Sequential Duplication"] = "copied"` (`mechanisms.js:34`), so it lands in the Copy, Paste, Edit cluster, and displays as "Recurring value sequences" (`:74`).

**Do three files crossing a ceiling produce one reason string or three?** Three. `groupNotApplicableByReason` keys the Map on `r.description` with exact string equality (`:239`). The skip description interpolates the row count:

```js
description: `Sequence scan skipped for large dataset (${nR} rows > ${BLOCK_SCAN_LIMIT}).`
```

C10 → "16522 rows", C14 → "9398 rows", C25 → "43202 rows". Three distinct keys.

Two things follow. Within a single report this is invisible — one file, one Sequential Duplication result, one stanza either way. Across the corpus it means the skip can **never** share a stanza with anything, including another ceiling skip of the same kind, because the count makes every instance unique. If a future ceiling fix gives several tests the same cause, the grouping that exists to collapse them will not fire. Whether that is a defect depends on whether the row count belongs in the reason at all: it is genuinely useful to a reader, and a fix could keep it out of the grouping key by carrying the cause in one field and the count in another. Worth deciding deliberately rather than inheriting.

**What the reader sees on C14.** C14 has thirteen High tests. Adding one not-applicable entry changes:

- **Cluster header.** `ClusterRow.jsx:71` computes `couldRun = cov.total - cov.notApplicable`, so the Copy, Paste, Edit denominator drops by one. The header word is unaffected — `hasHigh` wins at `:83`, and the comment at `:76` records that not-applicable no longer holds a cluster below Clear. If Duplicate Detection is High in that cluster on C14, the word stays "High" and only the fraction moves.
- **Collapsed row.** One line inside the expanded Copy, Paste, Edit block: `1 not applicable`, with "Recurring value sequences" as the name.
- **Expanded stanza.** The description verbatim: "Sequence scan skipped for large dataset (9398 rows > 5000)." That sentence is honest and reads correctly — it says skipped, not inapplicable.
- **`ReportView.jsx:1384`.** Not reached. That clean-path copy is on the no-signal branch; with thirteen High tests C14 never sees it. So the one piece of display copy that would say something false about a skip — "did not apply to this data" — does not render on this file. It would render on a large *clean* file, which is the case to check before shipping.
- **§4 prompt body.** `handoffModel.js:257` builds `notRun`; `promptBodyRenderer.js:84` renders each as `- {testName} — {reason}`, under the standing line "Absence of a finding for a test that wasn't run does not mean absence of the pattern." That line is exactly right for a skip, and better suited to it than to a true not-applicable.

Net: on C14 the change is one line in a collapsed group, in a cluster whose verdict does not move, plus one entry in the handoff prompt. Against thirteen High tests, a reader may never see it. That is an argument for the reason string carrying its own weight, not an argument against the change — today that same reader sees a Low verdict asserting the scan ran clean, which is worse than a line they skim past.

---

## 5. What did not fit

**The batch cannot see any of this, and it is worse than the dispatch supposed.** 29 fixtures, widest 1,501 lines (`11-rnaseq-multicondition.csv`), second 1,201, everything else ≤401. Every ceiling in §1.2 is unexercised: no fixture reaches 5,000 rows, none has >50 columns, and I found none with >30 column pairs. The severity ceilings in §1.4 are likewise never crossed — no fixture exceeds the 1,000-row tier boundary except the two above, and neither reaches 5,000 or 10,000. So the entire skip surface and the entire tiering surface are dark to `validate-batch.mjs`, and a green batch says nothing about either. This is the engine-only blind spot CLAUDE.md already names, but sharper: it is not that the batch misses presentation, it is that the batch's largest input is three-and-a-half times smaller than the smallest ceiling in the code.

**`selectiveNoise.js:171` is a different animal and I want it on the record.** Under the effect-size gate a condition pushes a literal `1.0` into `pValues`, which then goes through `bhFDR(pValues)` at `:189`. That literal does not merely mislabel its own condition — it sits in the shared denominator and perturbs the correction for every sibling condition. Every other constant in this report misreports one test. This one changes another test's number. I did not chase it further; it is not the skip state, but it is adjacent and it is the only case here with cross-unit blast radius.

**`columnGof.js:220` can emit `flag: "N/A"` on a fully-populated payload** that also carries `primaryP`, `nTested`, `details` and `skippedColumns`, when `Math.min(...adjPs)` is non-finite. `classifyCoverage` keys on the flag, so it routes to `notApplicable` correctly. Flagging it only because any future consumer that infers state from payload shape rather than from the flag would get this one wrong.

**Two stale references found in passing, both harmless.** `valueFrequencySpike.js:384` cross-references "as pass 1 does at :212"; the pass-1 site is at :274. `regionalNoise.js:72` guards `validRows.length < WIN` with `WIN = 15`, but the guard at `:53` already required ≥20, so it is unreachable. Same shape at `residualSpikeCorrelation.js:66`. Not defects; noted so a later reader does not re-derive them.

**What I could not establish cheaply.** Whether C10, C14 and C25 actually cross the Cross-Condition Consistency tier boundary, since `maxN` there is per-condition rather than per-file and I did not open the corpus files. Whether any corpus file exceeds 50 columns and so trips the Missing Data pairwise gate — same reason. Both are one probe each against the corpus if the answer matters.

---

## Worktree note

`git worktree list` shows three entries: the main checkout, `cmd-s327-skip-state` (this one, created by this dispatch), and `.claude/worktrees/gracious-heisenberg-7a32d6` on branch `claude/gracious-heisenberg-7a32d6`, which was created by the session tooling at startup and not by this dispatch. That is the third session running where the count is inflated by a tree nobody asked for. It is at the same commit as main and holds no work from this session — every read and the write of this file went to `cmd-s327-skip-state`.
