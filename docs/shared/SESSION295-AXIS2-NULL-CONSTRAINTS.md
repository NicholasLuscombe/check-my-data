# Session 295 — Axis-2 continuous collision-null: design constraints (READ-ONLY)

**Read-only.** No `src/` file was edited, no batch was run. This gathers the source facts that a new continuous (dp>0) collision null must satisfy, so the model choice can be made against contracts rather than guesses. It does not choose a null. The three candidate models under consideration are named only to organise the closing evidence: **A** density-integration at recording precision, **B** a rescaled discrete family, **C** simulation over the observed multiset. All line references are against the origin checkout as read this session.

---

## Constraint 1 — how the collision probability is consumed downstream

The collision null produces `p1`, the per-value match probability (`duplicateDetection.js:125`, `:130`, `:136`). `p1` is not itself surfaced as a p-value; it feeds an exact binomial survival:

- `const collisionP = collisionNPairs > 0 ? binomialSurvival(collisionObs, collisionNPairs, p1) : 1;` (`duplicateDetection.js:173`) — `p1` is the success probability of `Bin(n = collisionNPairs, p = p1)`, and `collisionP` is the resulting tail probability.

`collisionP` then flows through three consumers, none of which assumes it is closed-form, monotone, or differentiable:

- **BH-FDR combine.** `const rawPs = [collisionP, rowDupPValueAdj, withinRowP, bestBlockP];` (`:692`) → `const adjPs = bhFDR(rawPs);` (`:693`) → `const combinedP = Math.min(...adjPs);` (`:694`). `bhFDR` (`primitives.js:235-247`) only sorts the p-values ascending and scales each by `n/(r+1)`; it accepts any numeric value in [0,1] and imposes no smoothness or exactness requirement.
- **Flag decision.** `const flag = flagFromP(combinedP);` (`:695`). `flagFromP` (`thresholds.js:38-40`) is a pure threshold compare against `ALPHA.FLAG = 0.001` (HIGH) and `ALPHA.NOTE = 0.01` (MODERATE) (`thresholds.js:22-24`).
- **Display / diagnostics.** `collisionP:collisionP<0.0001?"<0.0001":collisionP.toFixed(4)` (`:704`) and the `_rawPs` diagnostic array (`:711`) — formatting only.

**What this settles for the design.** Nothing downstream requires a closed-form probability. A simulated fraction is tolerated, with one hard granularity condition: to reach HIGH, the combined p must resolve below `ALPHA.FLAG = 0.001`. A simulation reporting `exceedances / B` (with the customary `1/B`-style floor for zero exceedances) needs B on the order of 1000 or more for HIGH to be reachable at all, and comfortably above that to place HIGH robustly rather than at the granularity floor. This condition can be satisfied either by simulating `p1` (then keeping the existing `binomialSurvival` closed form) or by simulating the whole collision-count tail directly (replacing `binomialSurvival`). BH-FDR does not care which.

## Constraint 2 — the N≤5000 ceiling is accuracy-bound, not compute-bound

The integer branch uses the parametric null at N≤5000 and empirical HHI above. The rationale is stated twice in comments, and both times it is about model adequacy, not a compute budget:

- `duplicateDetection.js:50-52`: *"Integer, N>5000: Empirical HHI. At large N, genuine distribution dominates — circularity isn't a concern; parametric model is inadequate for zero-inflated multimodal count distributions."*
- `duplicateDetection.js:62-64`: *"At large N (RNA-seq 30K+ rows), the parametric model is inadequate for zero-inflated multimodal count distributions — fall back to empirical HHI where circularity isn't a concern (genuine distribution dominates)."*

The parametric computation is in fact bounded regardless of N: the `pMatch` sum runs over integer support to `rangeMax = Math.min(Math.ceil(vMax)+1, 100000)` (`:107`), and the log-likelihood fit is O(N). So the ceiling is not a cost cap — it is the point above which the authors judged the parametric count model a worse description than the raw empirical index, combined with the claim that circularity stops mattering at large N because the genuine distribution dominates the empirical HHI.

**What this settles for the design.** The "empirical HHI is safe above the ceiling" half of the integer rationale rests on the genuine distribution dominating as N grows. That reasoning does not obviously transfer to the continuous defect this fix targets: structured value recurrence (each value repeated a fixed number of times, as in CORPUS-03) is a fixed multiplier on the frequency counts that does not dilute as N grows, so a large-N continuous column with structured recurrence would still inflate its own empirical HHI. This is evidence that the continuous branch may not be able to inherit a large-N empirical-HHI fallback the way the integer branch does — the chosen null may need to hold across all N rather than only below a ceiling. Because a simulation null's cost is roughly B×N, that "hold across all N" pressure is the place where compute cost re-enters for candidate C at large continuous N.

## Constraint 3 — the empirical-HHI failure surface (what the replacement must not reintroduce)

The current continuous null is the empirical Herfindahl index of the column's own value frequencies:

- `const hhi = Object.values(globalFreq).reduce((s,c)=>s+(c/N)**2, 0);` (`duplicateDetection.js:55`), assigned `p1 = hhi;` in the continuous branch (`:136`). `globalFreq` counts values keyed at four decimals (`k=v.toFixed(4)`, `:30`).

**Malicious-direction failure (confirmed).** Structured recurrence raises the per-value frequencies, which raises `hhi`, which raises the expected collision count that `binomialSurvival(collisionObs, collisionNPairs, hhi)` compares against, so `collisionP` collapses toward 1. CORPUS-03 demonstrated this on real data.

**Benign-direction failure (also present).** The mechanism is indifferent to why values repeat. Any column with genuine value repetition — coarse quantisation, a bounded measurement range, continuous-but-discretised readings such as pH to one decimal — inflates its own `hhi` in exactly the same way and raises its own detection threshold. The empirical HHI cannot separate "these values repeat because the instrument quantises coarsely" from "these values repeat because they were copied." So on a legitimately quantised clean column the null is inflated and would mask a real future defect.

**What this settles for the design.** The replacement must not tie the null baseline to the observed value-repetition frequencies — that coupling is the circularity, in both directions. The baseline collision probability has to come from a model of the value-generating distribution that is not itself inflated by the recurrence being tested.

## Constraint 4 — recording precision is already derived and available

Test 1 derives a dominant decimal precision before the null branch:

- `for(const v of allVals){const s=String(v),d=s.indexOf("."),dp=d<0?0:s.length-d-1;dpCounts[dp]=(dpCounts[dp]||0)+1;}` (`:37`), then `const dominantDp=parseInt(Object.entries(dpCounts).reduce((a,b)=>b[1]>a[1]?b:a,[0,0])[0])||0;` (`:38`), and `const step=Math.pow(10,-dominantDp);` (`:39`).

Both `dominantDp` and `step` are computed at lines 38-39, well before the null branch at `:57`, so they are in scope at the point the null is built. `step` is exactly the recording-grid resolution (0.01 for two-decimal data).

**One caveat to record.** `dominantDp` is derived from `String(v)` on the parsed numeric values in `allVals` (numbers), so trailing zeros stripped at parse time are already gone; it is the dominant *observed-after-parse* precision. For the collision test — which matches parsed values against parsed values — that is the correct grid. This differs from the Decimal Precision test, which deliberately reads `rawMatrix` to preserve trailing zeros for a different question; that difference is not a defect here, just a distinction to keep straight.

**What this settles for the design.** A model that needs a recording-grid resolution already has one (`step`) with no new derivation required.

## Constraint 5 — what a simulation null would resample, and the harness available

- **Harness exists and is deterministic.** `createPRNG(matrix)` (`prng.js:40-72`) returns `{ random, randn, shuffle }`, seeded by an FNV-1a hash of the first ≤500 matrix values (`prng.js:38-40`), so runs are reproducible by construction. The engine already builds one: `const rng = createPRNG(matrix);` (`engine.js:181`).
- **But Duplicate Detection does not currently receive it.** The dispatch is `await runPair((m) => testDuplicates(m, matrix, wrColGroup, assay))` (`engine.js:323`) — no `rng` argument, and `testDuplicates(matrix, fullMatrix, colGroupId, assay)` has no `rng` parameter (`duplicateDetection.js:14`). A simulation null would require threading `rng` into the signature and the dispatch, mirroring how Benford already takes it — `testBenford(matrix, rng)` (`engine.js:307`), which runs a 5000-draw simulation loop off `rng.random()` (`benford.js:58-69`). That precedent shows both the signature shape and a working B=5000 simulation at this scale.
- **The resampling-unit trap.** The honest question is what null hypothesis the simulation draws under. Resampling the observed value multiset (a bootstrap or permutation over the column's own values) preserves the recurrence — the resampled draws contain the same repeated values — so it reintroduces exactly the circularity of Constraint 3. A non-circular simulation would instead draw synthetic values from a fitted distribution and count collisions, which requires the same distributional model as candidate A and is essentially a Monte Carlo implementation of it.

**What this settles for the design.** Simulation is feasible and can stay deterministic, but only as simulation *from a fitted model*, and only with a signature change to pass `rng`. Simulation over the observed multiset is ruled out by the same circularity Constraint 3 names.

---

## Evidence toward the decision (Chat makes the choice)

Stated as which constraint pushes toward or away from each candidate, not as a recommendation.

- **Constraint 1** is close to neutral: downstream tolerates a granular simulated fraction as readily as a closed-form probability, so it does not favour A, B, or C on the grounds of the p's nature. Its one live condition is that any simulated variant needs B of at least ~1000 for HIGH to resolve below `ALPHA.FLAG`.
- **Constraint 2** is evidence that the continuous branch may need a null that holds across all N rather than a cheap large-N empirical fallback, because structured recurrence does not dilute with N. That pressure counts mildly against C at large continuous N (its B×N cost) and mildly toward the closed-form A or B, or toward a compute cap on any simulation.
- **Constraint 3** is the decisive one. It rules out any null whose baseline is estimated from the observed value-repetition frequencies. That eliminates the current empirical HHI and eliminates candidate C in its observed-multiset form. It favours the model-based candidates A and B, whose baseline is independent of the observed collisions.
- **Constraint 4** directly enables candidate A: the recording-grid resolution it needs (`step`) is already computed. It is neutral toward B (which also needs `dominantDp` for rescaling, equally available) and toward C.
- **Constraint 5** says that if simulation is chosen it must simulate from a fitted model — at which point C converges to a Monte Carlo implementation of A — and that either way a signature change to thread `rng` is required. So the standalone "simulation over the observed multiset" reading of C is ruled out, while a "simulation from a fitted distribution" reading collapses into A by another route.

Net, the constraints most sharply separate the candidates at Constraint 3 (against any observed-frequency baseline) and Constraint 5 (against naive-multiset simulation), both of which point away from the current empirical HHI and away from C-as-bootstrap, and toward a model-based null. Constraint 4 makes candidate A's grid free; Constraint 2 raises the open question of whether that model can be cheap enough to run across all N or needs its own ceiling. Candidate B remains viable but carries the variance-versus-mean mismatch flagged in the prior implementation stop (a tight rescaled continuous distribution is badly under-dispersed for Poisson/NB, so B would need a discrete family other than the existing pair). Those are the facts; the model choice is Chat's.
