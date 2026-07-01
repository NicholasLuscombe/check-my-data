# Session 295 — Implementation dispatch outcome: axis-2 collision-null (STOPPED AT GATE)

**Outcome: read-only. No `src/` file was edited, no fixture was built, no batch was run.** The dispatch built the pre-edit source confirmation for Fix 1 into a hard gate — proceed only if the integer-branch parametric null extends cleanly to continuous data, stop and report if it carries an integer-specific assumption. It carries one. This report is the stop, per the dispatch's own instruction: *"If (2) reveals an integer-specific assumption, this becomes READ-ONLY — report what needs to generalise and STOP for Chat before implementing."*

Pre-edit guard passed (worktree `friendly-williams-1ea49a`, branch `claude/friendly-williams-1ea49a`, not the main root). Nothing downstream of the gate was touched.

---

## Fix 1 source confirmation (items 1–3)

### Item 1 — the integer-branch parametric null implementation

`src/tests/duplicateDetection.js`, the `if (isInteger && N <= 5000)` branch at **lines 58–126**. It fits a Poisson(λ) and a Negative Binomial(r, p) by method of moments, selects the better fit by log-likelihood, and computes the per-value collision probability as `pMatch = Σ_k P(X=k)²`:

- `poissonLogPMF(k, lam)` (`:71-76`) — `P(X=k) = e^(-λ)λ^k / k!`, factorial via `for (let i=2; i<=k; i++) logFact += Math.log(i)`.
- `nbLogPMF(k, r, p)` (`:81-85`) — NB PMF via `lnGamma(k+r) - lnGamma(k+1) - lnGamma(r) + k·log(p) + r·log(1-p)`.
- Fit (`:88-102`) — `lambda = mean(allVals)`; log-likelihoods accumulated over `Math.round(val)` (`:90`, `:98`); `useNB` if the NB log-likelihood wins.
- Collision probability (`:104-123`) — `pMatch = Σ_k P(k)²` summed over integer `k` from `Math.floor(arrayMin(allVals))` to `rangeMax` in unit steps (`k++`), floored at `1/(rangeMax+1)` and capped at 1.
- Result: `p1 = pMatch; p1Source = useNB ? "NB" : "Poisson";` (`:125-126`). `p1` then drives Test 1 at `collisionP = binomialSurvival(collisionObs, collisionNPairs, p1)` (`:173`).

### Item 2 — is there an integer-specific assumption? YES. This is the stop.

The parametric null is a discrete count model over non-negative integer support. It is integer-specific in three load-bearing ways, each of which breaks on continuous 2-decimal data:

1. **The PMFs are defined only at non-negative integers.** `poissonLogPMF` computes `log k!` with a factorial loop (`:74`); `nbLogPMF` uses `lnGamma(k+1) = log k!` (`:84`). There is no `P(X = 1.23)`. The model has no value to return for a 2-decimal observation.

2. **Values are rounded to integers before the model sees them.** The log-likelihood is accumulated over `Math.round(val)` (`:90`, `:98`). For fish-length 10.23, 11.45, … the model is fit to 10, 11, … — the decimal, which is exactly the resolution at which duplication is being tested, is discarded before the fit.

3. **The collision probability is summed over integer support at unit step.** `pMatch = Σ_k P(k)²` iterates `k++` (`:110`, `:115`). This computes P(two draws land on the same *integer*). For data recorded to 2 decimals the true value alphabet sits at 0.01 resolution, so the real collision probability is far smaller than the integer-collision probability. Reusing this `pMatch` as `p1` for continuous data would **overestimate** the expected collision rate by roughly two orders of magnitude, which re-inflates the expected count to meet the observed count and collapses the p-value toward 1 again. It does not remove the false negative — it recreates it through a different mechanism.

So the integer null is **not** "over collision counts, indifferent to whether the underlying values are integer or 2-decimal." It is a model of the value-generating distribution itself, and Poisson/NB are count families on the integers. Mirroring the branch condition alone would ship a null that is wrong for continuous data.

**What needs to generalise (the Chat design decision this reserves):** the continuous branch needs a collision probability at the data's own recording precision (`step = 10^-dominantDp`), not at integer resolution. Two candidate shapes, both modeling choices rather than a mirror of existing code:

- Fit a continuous density (normal / lognormal / kernel) to the raw values and integrate its squared density over precision-width bins to get P(two cells share a value at the recording precision); or
- Scale values by `10^dominantDp` to integers and fit a discrete model — but Poisson/NB assume variance ≈ mean, which fails badly for a tight scaled distribution (fish-length ×100 is narrow, hugely under-dispersed relative to its mean), so a different discrete family (for example a discretised normal) would be needed, not the existing Poisson/NB pair.

Either path is a new null model with its own calibration, which is why the dispatch's own gate routes it back to Chat. METHODOLOGY §1.1's "the continuous branch … needs the same parametric-null treatment" (Known limitation, line ~343) is accurate as intent but should not be read as "the integer Poisson/NB machinery transfers unchanged" — it does not.

### Item 3 — the N ceiling

Moot until the model family is chosen. The integer branch uses N ≤ 5000 for parametric and empirical HHI above that, on the rationale that at large N the genuine distribution dominates and the parametric model is inadequate for zero-inflated multimodal counts (`:47-64`). The right ceiling for a continuous null depends on which continuous null is chosen and how its variance behaves with N; it does not automatically inherit 5000. Deferred to the design pass.

---

## Fix 2 — comment correction: NOT applied (contingent on Fix 1)

`duplicateDetection.js:135` still reads verbatim `// HHI circularity is not a concern for float data (high precision → many bins)`. The dispatch's replacement text was *"the float branch now routes through the parametric null"* — that statement is false until Fix 1 lands, so writing it now would introduce a new inaccurate comment. The comment is left unchanged. When the continuous null is designed and implemented, the comment correction rides that change. The claim remains falsified (CORPUS-03 is the counterexample); it is simply not corrected in place by a fix that did not happen.

## Fix 3 — regression fixture: NOT built (contingent on Fix 1)

The fixture's axis-2 assertion is defined only relative to post-Fix-1 behaviour ("Test 1 must rate the structured recurrence as a genuine positive AFTER Fix 1"). With Fix 1 stopped:

- Building the fixture with the post-fix expectation would register a ground-truth verdict the current engine fails, breaking the batch gate.
- Building it with the pre-fix expectation would encode the defect (Test 1 → p≈1.0, LOW) as the expected verdict, which is wrong and would silently lock in the false negative.

Neither is correct, so the fixture is deferred until the continuous null exists. The spec input from the S295 audit read still stands and is restated below as the routing slip so it is ready to build the moment Fix 1 lands.

---

## Routing slip for Chat

**Design pass owed before any implementation dispatch can proceed:** choose the continuous-branch collision null (density-integration at recording precision, or a scaled discrete family that is not Poisson/NB) and its N ceiling. Only after that decision is a Code implementation dispatch well-formed.

**Expected-verdict table (for TEST-GROUND-TRUTH.md — Chat authors; do not let Code edit that file).** For the regression fixture once buildable:

| Column / scope | Test | Pre-fix (current engine) | Post-fix (target) |
|---|---|---|---|
| `recur` alone (continuous 2dp, each value ×4) | Exact Duplicate Detection, Test 1 collision | LOW — p≈1.0, self-conditioned HHI null suppresses the genuine recurrence | genuine positive (MODERATE/HIGH) — parametric continuous null does not self-inflate |
| `recur` alone | Exact Duplicate Detection overall | LOW/near-LOW driven by the suppressed Test 1 | flags, driven by Test 1 |
| Full four-column matrix | Exact Duplicate Detection | LOW — Test 1 suppressed and Tests 2/3/4 neutralised by co-present real columns | Test 1 now fires; whole-test verdict depends on the separately-tracked dispatch item |

The `recur`-alone row is the control isolating axis-2's collision-null half (this dispatch) from the multi-column dispatch half (separately tracked, `engine.js` `runPair`, not in scope here).

**Fixture spec (four columns, ≥100 rows), from the S295 audit read:**
- `recur` — continuous 2-decimal, structured 4× recurrence (each distinct value appears exactly four times), the axis-2 defect carrier (CORPUS-03 `SL` shape).
- `wide` — continuous, wide magnitude spread (forward-looking axis-1 Benford carrier; not acted on here).
- `precA`, `precB` — differing recording precision (forward-looking axis-1 Decimal-Precision carrier; not acted on here).

**Chat follow-ups noted in the dispatch, unchanged by this stop:** METHODOLOGY §1.1 caveat removal (lines ~285, ~343) waits for the fix to land; TEST-GROUND-TRUTH expected-verdict row waits for the fixture; V1X §2.6 status update should record that axis-2's collision-null fix is blocked on a null-model design decision, not merely on implementation time.

---

## Batch / promote

Not run — no code changed, so the byte-identical batch gate has nothing to verify. Nothing to promote. No worktree edits were made to any tracked source file, so `./scripts/dev.sh` is not applicable this session.
