# SESSION237 — full-suite flag-assembly classification (READ-ONLY)

> **Superseded in part (S239).** Runs was reclassified PER-UNIT-OR → POOLED-SINGLE after the
> routing probe found no fixture where its flag fires on a markable per-unit. Current counts are
> **18 PER-UNIT-OR / 7 POOLED-SINGLE / 3 DETECTION**, and `docs/shared/TIER-A-CI-DRAW-SPEC.md`
> §6/§7 is authoritative for membership. The 6-member POOLED-SINGLE list (line 238) and the Runs
> "DEFECT" rows below are the original S237 snapshot, retained as-is — do not read them for
> current membership.

One structural pass over all 28 active tests, classifying each by **what its returned flag fires
on**. No source changed. Each PER-UNIT-OR / POOLED-SINGLE / DETECTION call is read from the
flag-assembly at source; the flag-driving lines are quoted verbatim below the table. The
"flagged fixture exists" column is taken from the generated `docs/TEST-DISPLAY-MAP.md` (live
22-fixture batch).

Classes (from the dispatch):
- **POOLED-SINGLE** — one pooled statistic vs one reference; no per-unit/sub-unit promotion, no OR across units.
- **PER-UNIT-OR** — the flag can fire from per-unit evidence (per-pair / per-lag / per-window / per-condition / per-column / per-block / per-stage) via promotion, BH-FDR over sub-units, worst-group selection, or min/OR across units.
- **DETECTION** — the flag is presence/count of found items (duplicates, offset copies, missing patterns); the items are located/counted, not displayed as a homogeneous set of per-unit estimate-vs-null intervals. (Null-calibrated via binomial/permutation/Fisher; noted per row.)

## Cross-cutting note — the `aggregatePerGroup` engine wrapper

Separate from each test's intrinsic assembly, the engine wraps many replicate/shape tests in
`aggregatePerGroup` on column-grouped (≥2 condition) data, whose returned flag is the **worst-group
flag** (`aggregation.js:85-86`) optionally **Fisher-promoted** across conditions
(`aggregation.js:139-148`). That is itself a per-condition OR layer. It does **not** change any
POOLED-SINGLE member's class below, because each POOLED-SINGLE test either runs on the full matrix
(Noise Scaling, the three digit tests — `engine.js:288-304,421`) or handles conditions internally
as a single statistic (Residual Spike Correlation, Baseline Balance). It only reinforces that the
listed PER-UNIT-OR tests are not single-decision.

## Classification table

| Test (`result.name`) | Flag fires on | Unit types (if PER-UNIT-OR) | Per-unit magnitude+reference available? | Ships a band today? | Flagged fixture in 22-set? | Note |
|---|---|---|---|---|---|---|
| Autocorrelation | PER-UNIT-OR | per-pair lag-1; higher-lags 2–5; (pooled lag-1 t) | Y — `details[]` per-pair `lag1/z/p`; `lagTable[]` per-lag `pooledR/adjP` | **YES (CI band)** | Y (DS02/11/20/21/22) | **DEFECT** — band plots pooled lag-1; flag promotes on lags 2–5 / a single pair |
| Runs Test | PER-UNIT-OR | per-pair; per-window scan; (pooled mean-z t) | Y — `allPairStats[]` `runs/expected/z/adjP`; window `details` | **YES (CI band)** | Y (DS02/21/22) | **DEFECT** — band plots pooled mean-z; flag promotes on a pair / a window |
| Noise Scaling With Measurement Size | POOLED-SINGLE | — | N (single slope; `logPoints` are raw data, not per-unit estimates) | **YES (CI band)** | Y (DS06) | CLEAN — single slope vs expected; band quantity = verdict quantity |
| Excess Kurtosis | PER-UNIT-OR | per-condition (platykurtic promotion); (pooled directional) | Partial — `condKurtosis[]` per-condition `kurtosis/kurtDeviation/p`; sim null computed & dropped | No (band reverted S237) | N (latent) | Pooled leptokurtic suppressed; condition promotion can flag MODERATE |
| Column Goodness-of-Fit | PER-UNIT-OR | per-column (BH, min adjP of flagged) | Y — `details[]`/`colRatios[]` `A2_obs/A2_null_median/ratio/adjP` | No | Y (DS10/20) | Per-column AD² vs refit-bootstrap null |
| Entropy / Zipf Analysis | PER-UNIT-OR | per-column (BH, min adjP of flagged) | Y — `details[]` `H_obs/H_expected/ratio/adjP`; `colRatios[]` | No | N (latent) | Per-column Shannon H vs bootstrap null |
| Benford's Law (First Digit) | POOLED-SINGLE | — | N (per-digit `details` descriptive, not null-tested) | No | Y (DS08) | Pooled MAD + simulation p, effect-size floor |
| Benford's Law (Second Digit) | POOLED-SINGLE | — | N (per-digit descriptive) | No | Y (DS10/11) | Pooled MAD + simulation p |
| Terminal Digit Uniformity | POOLED-SINGLE | — | N (per-digit descriptive) | No | Y (DS04) | Pooled χ² GoF (10- or 9-digit select); two-sided omnibus |
| Decimal Precision Consistency | PER-UNIT-OR | per decimal-place level (BH, min adjP) | Y — `perLevel[]` `observed/expected/expectedP/p/adjP` | No | N (latent) | One-sided deficit binomial per level |
| Value-Frequency Spike | PER-UNIT-OR | per integer value; per fractional substring (BH; max-rank OR of pass tiers) | Y — `details[]`/`_spikeValues[]` `observed/expected(smoothed λ)/ratio/adjP` | No | Y (DS04/06/13) | Poisson upper-tail per value; pass-2 gated ≥2 spikes |
| Exact Duplicate Detection | DETECTION | (BH-min over 4 sub-tests: collision/row-dup/within-row/block) | N — found rows/blocks are locations; per-block p computed & dropped | No | Y (DS04/06/10/14) | Flag = `flagFromP(min(bhFDR([4 binomial p])))` |
| Constant-Offset Blocks | DETECTION | (pooled block-count permP; + per-pair BH promotion; + add/mul pass OR) | N — found blocks are locations; per-pair permP computed & dropped | No | Y (DS08) | Count of equal-diff blocks vs permutation null; per-pair promotion overlay |
| Residual Spike Correlation | POOLED-SINGLE | — | N — flag-bearing pair overlaps dropped; `pairDetails[]` r is informational | No | Y (DS02/11) | Single max-pairwise-overlap vs matched permutation null (max inside the statistic) |
| Missing Data Pattern | DETECTION | (BH-min over 3 sub-signals: pairwise / column×condition / block) | Partial — `pairwiseHits/condHits/blockHits` each carry `p/adjP` + counts (heterogeneous) | No | Y (DS15) | Structured-missingness finder; Fisher/χ²/Bonferroni sub-signals |
| Mahalanobis Row Outlier | PER-UNIT-OR | per-row (Stage-2 BH α=0.001 survivor gate); dataset binomial tiers severity | Y — `details[]` `Row/Distance(D²)/p-value`; `flaggedRowIndices` | No | Y (DS06 ack / DS08 ack) | Flag gated on `nOut>0` per-row survivors, not the binomial alone |
| Blocked Mahalanobis | PER-UNIT-OR | (pass × condition) scan-max (BH, min); windows via scan-max | Y — `details[]` `pass/condition/startRow/endRow/stat/rawP/adjP` | No | Y (DS15/21/22) | μ-pass T² + Σ-pass λ_max per condition; one-sided inflation |
| Inter-Replicate Correlation | PER-UNIT-OR | per-pair (suspicious + BH MODERATE); per-window scan (can hit HIGH) | Y — `details[]` per-pair `r/iccExpected/excess/adjP`; per-window `rWin/baseline/excess/scanP` | No | Y (DS02/08) | Windowed scan max-rank OR not MOD-capped |
| Windowed Autocorrelation | PER-UNIT-OR | (pair × window) (per-pair BH, min adjP) | Y — `details[]` `r/rawP/adjP/startRow/endRow` | No | N (latent) | Two-sided; arithmetic floor makes HIGH unreachable in practice |
| Regional Noise Homogeneity | PER-UNIT-OR | scan-max (window × col); per-column BH promotion (MOD-capped) | Partial — window `details` `ratio/sdRatio/anomCol`; per-column promotion stats computed & dropped | No | Y (DS10/21) | Symmetric variance ratio (elevated or reduced) |
| Selective Noise Partitioning | PER-UNIT-OR (stratified) / POOLED-SINGLE (single-run) | per-condition Bartlett (BH, min adjP) | Y — `condResults[]` `maxMinVarianceRatio/bartlettChi/pBartlett`; `perColumnResults[]` (display-only) | No | Y (DS08/20) | Per-column Levene is display-only; flag = per-condition min-BH |
| LOESS Residual Analysis | PER-UNIT-OR | per-window scan; CUSUM changepoint; per-pair BH (MOD-capped) | Y — `details[]` window `ratio`/changepoint `cusumP/cusumStat`; `pairResults[]` `combinedP/adjP` | No | Y (DS08/10/12b) | Scan + CUSUM can hit HIGH; per-pair promotion capped |
| Row-Mean Runs | PER-UNIT-OR | per-condition sequence (min); per-window BH (MOD-capped) | Y — `details[]` window `runs/expected/z/p/adjP`; per-condition `runs/expected/z/rowIdxs` | No | Y (DS21) | `primaryP=globalBestP` does NOT track the windowed promoter |
| Modality Test | PER-UNIT-OR | per-column dip (BH, min adjP of flagged) | Y — `details[]` `Dip(D_obs)/adjP`; `colDips[]`; rawP dropped | No | N (latent) | One-sided Hartigan dip vs uniform null |
| Cross-Condition Rank Correlation | PER-UNIT-OR (cap MOD) | per-condition-pair LOO (BH, min adjP) | Y — `details`/`looResults[]` `spearmanR/fisherZ/looMean/zStat/rawP/adjP` | No | N (latent) | One-sided "pair more correlated than the rest"; MODERATE cap |
| Baseline Balance (Carlisle) | POOLED-SINGLE (AMBIGUOUS) | — | Partial — dataset `binomP/ksD/ksP/nExcess/expectedExcess`; per-feature ANOVA p in `details` w/o per-feature null | No | Y (DS16) | `min(binomP, ksP)` over two whole-dataset tests; gate only demotes |
| Cross-Condition Consistency | PER-UNIT-OR | (property × condition-pair) over 3 stages (3 separate BH-FDR; min across stages' gate-passed+forensic adj-p) | Y — `details[]` `observed(dObs)/nullMedian(permMedian)/adjP/direction`; `top` | No | Y (DS15/19) | Two-sided permutation + forensic-direction filter |
| Within-Row Variance | PER-UNIT-OR | dataset binomial (smooth count) + per-window BH (max-severe); per-row evidence feeds counts | Y — `flaggedRows[]`/`details[]` `z/expectedSD`; `flaggedRowIndices`; per-window p dropped | No | N (latent) | One-sided "too smooth" drives flag; per-row detection two-sided |

(Band-shipping footnote: only the three marked **YES (CI band)** carry a CI-of-verdict band — `PooledR1Marker` / `PooledZMarker` / `MeanVarianceScatter` CI. Selective Noise's `NoiseSpreadPlot` draws a flag-gated *median reference* band, which is not a CI-of-verdict band and is not part of the CI-draw programme.)

---

## Verbatim flag-assembly — PER-UNIT-OR tests (promotion / BH / OR lines)

**Autocorrelation** (`autocorrelation.js`) — pooled lag-1 t, per-pair BH, higher-lag promotion:
```
74	  const esGate = nR>=500 && absR1<EFFECT_SIZE.AUTOCORR_STRONG;
75	  const pooledFlag=esGate?"LOW":flagFromP(pooled.p);
79	  const anyPairFlagged = acfAdjPs.some(p => p < ALPHA.FLAG);
80	  const pairPromotedFlag = anyPairFlagged ? "MODERATE" : "LOW";
81	  let flag = flagRankOf(pairPromotedFlag) > flagRankOf(pooledFlag) ? pairPromotedFlag : pooledFlag;
139	  const higherLagPromoted = HIGHER_LAGS.some(k => triggeredByLag[k]);
140	  if (flag === "LOW" && higherLagPromoted) flag = "MODERATE";
```

**Runs Test** (`runs.js`) — pooled mean-z t, per-pair BH, windowed scan:
```
195	  const globalFlag=esGate?"LOW":flagFromP(pooled.p);
236	  const anyWindowFlagged = windowAdjPs.some(p => p < ALPHA.FLAG);
237	  const anyPairFlagged = runsAdjPs.some(p => p < ALPHA.FLAG);
238	  const subUnitPromoted = anyWindowFlagged || anyPairFlagged;
239	  const promotedFlag = subUnitPromoted ? "MODERATE" : "LOW";
241	  const flag = flagRankOf(promotedFlag) > flagRankOf(globalFlag) ? promotedFlag : globalFlag;
```

**Excess Kurtosis** (`kurtosis.js`) — pooled directional gate + per-condition platykurtic promotion:
```
371	  const directionalSuppress = kurtDeviation >= 0;
374	  const flag = esGate ? "LOW" : flagFromP(pooledP);
475	        if (flag === "LOW" && condAdjPs.some(p => p < ALPHA.FLAG)) {
476	          Object.assign(condKurtosis, { promoted: true, promotedFlag: "MODERATE" });
483	  const finalFlag = (condKurtosis?.promoted && flag === "LOW") ? "MODERATE" : flag;
```

**Column Goodness-of-Fit** (`columnGof.js`) — per-column BH, min adjP of flagged:
```
214	  const flag = flaggedCols.length > 0 ? flagFromP(Math.min(...flaggedCols.map(c => c.adjP))) : "LOW";
```

**Entropy / Zipf Analysis** (`entropyTest.js`) — per-column BH, min adjP of flagged:
```
142	  let flag = nFlagged > 0 ? flagFromP(Math.min(...tested.filter(c => c.flag !== "LOW").map(c => c.adjP))) : "LOW";
```

**Decimal Precision Consistency** (`decimalPrecision.js`) — per decimal-level BH, min adjP:
```
80	    primaryP = Math.min(...adjPs);
81	    flag = flagFromP(primaryP);
```

**Value-Frequency Spike** (`valueFrequencySpike.js`) — per-spike BH; max-rank OR of pass tiers:
```
311	  const pass1Tier = pass1Spikes.length > 0 ? flagFromP(pass1BestP) : "LOW";
315	  const pass2Tier = pass2MultiSpikeCleared ? pass2TierRaw : "LOW";
316	  const flag = flagRankOf(pass1Tier) >= flagRankOf(pass2Tier) ? pass1Tier : pass2Tier;
```

**Mahalanobis Row Outlier** (`mahalanobis.js`) — per-row BH survivor gate, then dataset binomial tiers:
```
170	  if (nOut === 0) flag = "LOW";              // S126b add-5b — no per-row evidence → CLEAR
171	  else if (gated) flag = "LOW";
172	  else if (binomP < ALPHA.FLAG) flag = "HIGH";
173	  else if (binomP < ALPHA.NOTE) flag = "MODERATE";
174	  else flag = "LOW";
```
(`nOut` = count of rows surviving Stage-2 BH-FDR at α=0.001, `mahalanobis.js:151-163`.)

**Blocked Mahalanobis** (`blockedMahalanobis.js`) — (pass×condition) BH, min:
```
572	  const adjPs = bhFDR(units.map(u => u.rawP));
575	  const primaryP = Math.min(...units.map(u => u.adjP));
576	  const flag = flagFromP(primaryP);
```

**Inter-Replicate Correlation** (`interReplicateCorrelation.js`) — per-pair + windowed OR:
```
285	    flag = flagFromP(bestSuspP);
292	    const anyPairSig = !allHighSNR && allPairs.some(p => p.adjP != null && p.adjP < ALPHA.FLAG);
294	      flag = "MODERATE";
301	  if(!allHighSNR&&windowIrcFlag&&flagRankOf(windowIrcFlag)>flagRankOf(flag)){
302	    flag=windowIrcFlag;
```

**Windowed Autocorrelation** (`windowedAutocorrelation.js`) — (pair×window) per-pair BH, min:
```
158	  const minAdjP = Math.min(...windowUnits.map(u => u.adjP));
160	  const flag = flagFromP(primaryP);
```

**Regional Noise Homogeneity** (`regionalNoise.js`) — scan-max + per-column BH promotion:
```
178	  let flag = esGate ? "LOW" : flagFromP(scanP);
180	  if (!esGate && flag === "LOW" && anyColSig) flag = "MODERATE";
```

**Selective Noise Partitioning** (`selectiveNoise.js`) — per-condition Bartlett min-BH (stratified):
```
190	    const minAdjP = Math.min(...adjusted);
191	    const overallFlag = flagFromP(minAdjP);
229	  const flag = esGate ? "LOW" : flagFromP(b.pBartlett);   // single-run path: POOLED-SINGLE
```

**LOESS Residual Analysis** (`loessResidual.js`) — scan + CUSUM + per-pair BH promotion:
```
215	  const combinedFlag = flagRankOf(scanFlag) >= flagRankOf(cusumFlag) ? scanFlag : cusumFlag;
216	  const flag = esGate ? "LOW" : combinedFlag;
427	      if (pairAdjPs.some(p => p < ALPHA.FLAG)) pairPromoted = true;
431	    const finalFlag = (pairPromoted && flagRankOf(flag) < flagRankOf("MODERATE")) ? "MODERATE" : flag;
```

**Row-Mean Runs** (`rowMeanRuns.js`) — per-condition sequence min + per-window BH promotion:
```
98	  const globalFlag = flagFromP(globalBestP);
145	  const anyWindowFlagged = windowAllAdjPs.some(p => p < ALPHA.FLAG);
146	  const promotedFlag = anyWindowFlagged ? "MODERATE" : "LOW";
147	  const flag = flagRankOf(promotedFlag) > flagRankOf(globalFlag) ? promotedFlag : globalFlag;
```

**Modality Test** (`modality.js`) — per-column dip BH, min adjP of flagged:
```
248	  const flag = flaggedCols.length > 0 ? flagFromP(Math.min(...flaggedCols.map(c => c.adjP))) : "LOW";
```

**Cross-Condition Rank Correlation** (`rankCorrelation.js`) — per-pair LOO BH, min adjP, MOD cap:
```
98	  const bestXcrP = Math.min(...looResults.map(r => r.adjP != null ? r.adjP : 1));
99	  const rawFlag = flagFromP(bestXcrP);
101	  const flag = flagRankCap[rawFlag] || rawFlag;
```

**Cross-Condition Consistency** (`crossConditionConsistency.js`) — 3-stage BH, min across stages:
```
616	  const effAdjPs = running.map(u => (u.gatePassed && u.forensic) ? u.adjP : 1);
617	  const primaryP = effAdjPs.length ? Math.min(...effAdjPs) : 1;
618	  const flag     = flagFromP(primaryP);
```

**Within-Row Variance** (`withinRowVariance.js`) — dataset binomial + per-window BH, max-severe:
```
141	  let flag = flagRank(windowFlag) > flagRank(globalFlag) ? windowFlag : globalFlag;
```

## Verbatim flag-assembly — POOLED-SINGLE tests

**Noise Scaling** (`meanVariance.js`): `flag=flagFromP(pSlope)` (`:112`, expSlope path) / `if(pNearest<ALPHA.FLAG) flag="HIGH"…` (`:119-120`, general). Single slope vs expected; no promotion path.
**Benford 1st** (`benford.js:82-86`): `if(mad<0.015) flag="LOW"; else if(pMAD<ALPHA.FLAG) flag="HIGH";…` — pooled MAD + sim p.
**Benford 2nd** (`benford2.js:119-123`): same shape on second-digit MAD.
**Terminal Digit** (`terminalDigits.js:54,58`): `reportedFlag=flagFromP(p9|p10)` — single pooled χ² GoF (selects which null).
**Residual Spike Correlation** (`residualSpikeCorrelation.js:206`): `let flag = flagFromP(permP)` — single max-overlap permutation p (max inside the statistic and the null; AMBIGUOUS-edge, not a per-unit OR).
**Baseline Balance** (`carlisleBalance.js:132-133`): `const primaryP = Math.min(binomP, ksP); let flag = flagFromP(primaryP)` — min over two whole-dataset tests; effect-size gate only demotes (`:139-141`). AMBIGUOUS (an OR over two dataset-level tests, not units).

## Verbatim flag-assembly — DETECTION tests

**Exact Duplicate Detection** (`duplicateDetection.js:692-695`):
```
692	  const rawPs = [collisionP, rowDupPValueAdj, withinRowP, bestBlockP];
693	  const adjPs = bhFDR(rawPs);
694	  const combinedP = Math.min(...adjPs);
695	  const flag = flagFromP(combinedP);
```
**Constant-Offset Blocks** (`constantOffset.js:92-95`):
```
93	  const esGate = nR >= 500 && blockRate < 0.01;
94	  let flag = esGate ? "LOW" : flagFromP(best.permP);
95	  if (!esGate && flag === "LOW" && best.anyPairSig) flag = "MODERATE";
```
**Missing Data Pattern** (`missingDataPattern.js:151-153`):
```
151	  const combinedAdj = bhFDR(allPs);
152	  const minAdjP = Math.min(...combinedAdj);
153	  const flag = flagFromP(minAdjP);
```
(These three are placed in DETECTION because the flag fundamentally counts found items — duplicate rows/blocks, equal-difference blocks, missing-data rectangles — and the items surface as locations/counts, not as a homogeneous per-unit estimate-vs-null set. Each is null-calibrated and ConstOffset/DupDet/MissingData carry a BH / per-pair-promotion overlay, noted so the per-sub-unit firing isn't lost. None ships a band, so the DETECTION-vs-PER-UNIT-OR boundary here does not bear on the band-defect conclusion.)

---

## Summary counts

- **POOLED-SINGLE: 6** — Noise Scaling, Benford 1st, Benford 2nd, Terminal Digit, Residual Spike Correlation, Baseline Balance (last two AMBIGUOUS, noted).
- **PER-UNIT-OR: 19** — Autocorrelation, Runs, Excess Kurtosis, Column GoF, Entropy/Zipf, Decimal Precision, Value-Frequency Spike, Mahalanobis Row, Blocked Mahalanobis, IRC, Windowed Autocorrelation, Regional Noise, Selective Noise (stratified), LOESS, Row-Mean Runs, Modality, Cross-Condition Rank Correlation, Cross-Condition Consistency, Within-Row Variance.
- **DETECTION: 3** — Exact Duplicate Detection, Constant-Offset Blocks, Missing Data Pattern.

(6 + 19 + 3 = 28, matching the 28 `TEST_MECHANISM` keys.)

## Defect set — shipped bands sitting on PER-UNIT-OR tests

| Test | Band quantity | Flag can also fire on | Status |
|---|---|---|---|
| **Autocorrelation** | pooled lag-1 mean ± 99.9% CI | higher-lags 2–5; a single pair's lag-1 BH-adj p | **DEFECT** |
| **Runs Test** | pooled mean-z ± 99.9% CI | a single pair's BH-adj p; a localised row-window | **DEFECT** |

**2 of the 3 currently-shipped CI bands sit on PER-UNIT-OR tests** (Autocorrelation, Runs) — the
same band-contradicts-verdict failure that moved Kurtosis to no-band. The third shipped band,
**Noise Scaling, is POOLED-SINGLE → not a defect** (band quantity = verdict quantity; its only
divergence is the programme-wide 99.9%-vs-MODERATE level point from the WS-1 audit). No additional
shipped-band defects exist beyond Autocorrelation and Runs, because no other test ships a CI band.

## Build-order note (verifiable vs not)

Of the 19 PER-UNIT-OR tests, 12 have a flagged fixture in the 22-set (Autocorrelation, Runs,
Kurtosis-no [latent], Column GoF, VFS, Mahalanobis Row [ack], Blocked Mahalanobis, IRC, Regional
Noise, Selective Noise, LOESS, Row-Mean Runs, Cross-Condition Consistency) and 7 are latent
(Excess Kurtosis, Entropy, Decimal Precision, Windowed Autocorrelation, Modality, Cross-Condition
Rank Correlation, Within-Row Variance) — a per-unit display for a latent test would render only its
clean state on the batch.

## Source state
No source changed by this audit. `git diff --stat` over `src/` is empty (the staged Kurtosis band
was reverted in the prior dispatch).
