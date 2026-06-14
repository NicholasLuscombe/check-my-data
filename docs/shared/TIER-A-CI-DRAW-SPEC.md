# TIER-A CI DRAW SPEC — v1.0 confidence-interval programme

**Status:** Chat-authored, Chat-owned (`docs/shared`). The canonical spec every CI
implementation prompt cites. Locked inputs: the natural-fit classification (S230) and the
99.9% level lock (S230, METHODOLOGY Unified α Framework "Confidence-interval level on
plotted bands"). Evidence base: `SESSION229-CI-SCREEN.md` (per-test null type, correction
family, feasibility), `SESSION230-ALPHA-AUDIT.md` (verbatim retrofit targets, level
confirm).

This spec governs only the **draw** set — the 8 cards where a CI is the natural read of
the test. The no-band and decorative-distinguish cards are specified separately (§Appendix
B) so the boundary is explicit, but they carry no band.

---

## 1. The governing rule (locked, do not re-litigate)

A CI band is drawn **only where the band's exceedance is the verdict's exceedance** — a
band that excludes its null must mean "this card flags HIGH." Three consequences fix every
downstream decision:

1. **Level.** Every band is drawn at **99.9% (z = 3.29), the HIGH gate (α = 0.001)**.
   Never 95%, never 99%, never a dual inner/outer band. The level is uniform across the
   draw set. (A 95% band excludes its null at p < 0.05 — looser than even MODERATE — and
   would read "significant" on a LOW card. That is the bug the programme fixes.)

2. **Corrected basis.** The band reflects the **BH-adjusted** decision the verdict uses,
   never the raw per-unit statistic. Where a card routes per-condition (Fisher-exempt
   worst-group; see §4), the band reflects the worst-group decision, not a pooled draw.

3. **Convention follows the null per card.** Two shapes, assigned per card in §3:
   - **exclude-null** — the band sits on a statistic with a meaningful zero; the null
     VALUE (r=0, z=0, slope=expected, ratio=1) is marked; significance = null outside
     band.
   - **centred-on-null** — the band sits around an expected REFERENCE; significance =
     observed outside band.

   **The convention is an OUTPUT of the exceedance rule, not an independent choice (S232).**
   Which shape a card takes is fixed by what its verdict tests against: the band must use
   the same null/spread the verdict uses, or the picture can contradict the verdict. A card
   whose verdict tests an observed statistic against a meaningful zero, on the observed
   spread, is exclude-null by construction — there is no free swap to centred-on-null without
   also changing what the verdict tests. "Consistent cross-test" therefore means each band
   faithfully pictures its own verdict, not that all bands share one shape regardless of
   verdict. (See the WS-1 lock notes below, and the §Locked summary.)

A card draws a band **iff** it is in the §3 draw set. A card being feasibility-"analytic"
in the CI screen does NOT put it in the draw set — Within-Row Variance, Selective Noise,
and CCR are analytic-feasible but are NOT drawn (they fail the exceedance rule; see
§Appendix B).

---

## 2. The draw set — 8 cards, three workstreams

*(Was 12. Four WS-2 cards moved to no-band: Mahalanobis Row Outlier (S233, sliver), Decimal Precision (S234, dominant-bar scale swamp), Value-Frequency Spike (S235, no hostable plot), Terminal Digits (S236, no clean-uniform fixture — every fixture trips the trailing-zero branch). Appendix B for each. Drops to 7 if Modality lands no-band per its §3 OPEN.)*

The draw set is the natural-fit DRAW classification (S230), not the feasibility roll-up.
Workstreams are ordered by implementation cost, not priority. (Four WS-2 cards have since
moved to Appendix B — two on their live renders (Mahalanobis, DecPrec), one on a read-only
that found no plot to host a band (VFS), one on a probe that found no fixture exercises the
band's reference branch (Terminal) — see the count note above.)

| WS | Cards | What the draw needs |
|---|---|---|
| **WS-1 retrofit** | Autocorrelation, Runs, Mean-Variance | Already draw a 95% band; swap z 1.96 → 3.29. Lowest cost. |
| **WS-2 analytic-new** | IRC (per-pair), Modality | Closed-form band, not currently drawn. No engine edit. (Mahalanobis, Decimal Precision, Value-Frequency Spike, and Terminal Digits were scoped here first but moved to no-band — S233 / S234 / S235 / S236, Appendix B.) |
| **WS-3 permutation-read** | Entropy, Column GoF, Kurtosis | Band read from an existing permutation/sim null at the adjusted quantile. **Prerequisite engine edit** — the null quantiles are currently discarded; they must be retained. |

WS-3 has a hard dependency (the engine edit) that WS-1 and WS-2 do not. WS-1 and WS-2 can
proceed in parallel; WS-3's draw work waits on its prerequisite (§5).

---

## 3. Per-card draw specification

Each row: convention (exclude-null / centred-on-null), what the band sits on, what marks
the null, the feasibility mechanism, and the per-card watch-item.

### WS-1 — retrofit (swap 1.96 → 3.29)

**Autocorrelation** — exclude-null. Band on the pooled lag-1 mean r; null value **r = 0**
marked (the existing "r=0 independent" dashed line stays). Mechanism: analytic SE = sd/√n
(`autocorrelation.js:61`), swap the z literal at `:63`. Watch: the band is the verdict
marker — at 99.9% it must visibly agree with the pooled-t flag (a band excluding 0 ⇔ card
flags HIGH). Confirm on a flagged fixture that the two agree.

> **Convention lock (S232).** Exclude-null is locked here *because* the headline verdict is
> the pooled-t on the observed between-pair spread (METHODOLOGY §2.1) — the band must use the
> same spread (the §1 exceedance rule), and a band on the observed r with that spread is
> exclude-null by construction. Centred-on-null was considered (one-glance "outside
> expectation" read) and closed: it would require the verdict to use the `1/√n` independence
> null, which §2.1 deliberately rejected for the documented pair-lottery artifact. Do not
> reopen centred-on-null without first changing the verdict null — which §2.1 argues against.
> (S232 also restructured the verdict surface to a 1-D r number-line — the whisker on the
> decay plot didn't read as an interval; the convention is unaffected by that render change.
> Verified on flagged and clean fixtures.)

**Runs** — exclude-null. Band on the pooled-z mean; null value **z = 0** marked.
Mechanism: analytic pooled-z SE (`runs.js:83`), swap the z literal at `:85`
(PooledZMarker). Watch: this card's strip/table now mark MODERATE pairs (S230); the
headline band marks HIGH. Two tiers on one card by design — the band (HIGH) and the
per-pair surfaces (MODERATE) are different statements. The band must not be confused with
the strip; keep them visually distinct.

> **Convention lock (S232).** Same as Autocorrelation: the headline verdict is the pooled-t
> on the observed spread of the pooled-z (METHODOLOGY §2.1 Runs, step 4 + flag) → the band
> uses the observed spread → exclude-null. Centred-on-null closed for the same reason.
> Verified at source S232. Runs' verdict surface is already a 1-D z number-line and reads
> correctly as-is — it is the reference treatment the S232 Autocorrelation restructure
> converged onto.

**Mean-Variance** — exclude-null. Band on the slope; null value **expected slope (0/1/2)**
marked. Mechanism: analytic slope SE (`MeanVarianceScatter.jsx:25`), swap z. **Carry-over
S229 5c:** the expected line is centroid-pinned (rotated about the observed log-centroid,
not an independent intercept) — the band reflects slope uncertainty only, about the
centroid. Keep the centroid pinning; the band widens to 99.9% about the same pivot. Do not
"fix" the expected line to an independent intercept — that is the documented deliberate
anchoring, not a bug.

> **Geometry confirm (S232).** A read-only source confirm established that the band is a
> centroid-pinned bow-tie (both bounding lines pass through the log-centroid → zero width
> there, fanning out with |x−cx|), and the expected-slope line, also centroid-pinned, touches
> the band only at the pinch (measure-zero) and is strictly outside elsewhere when the
> expected slope is outside the slope CI. The verdict is computed in slope-space
> (`meanVariance.js:107-112`, z = (slope−expSlope)/slopeSE); the line-space band is a
> separate render of that same slope CI. The S231 "expected line threads through the band"
> read was a centroid-pinch resolution artifact (S133f pixel-read class), not a contradiction
> — the band agrees with the verdict. No fix. Exclude-null holds: the verdict tests the
> observed slope against the expected on the slope SE, so the band uses that same spread.

### WS-2 — analytic-new (closed-form, not yet drawn)

**Mahalanobis Row Outlier** — **moved to no-band (Appendix B), S233.** Was the first WS-2
card scoped; the band was built and rendered, and the live render answered the §3 OPEN
("does the band earn its name") with no. On every fixture in the 22-set, `outlierThreshold`
(the smallest BH-FDR survivor D²) equals the single flagged row's own distance — so the
"flagged region above the cutoff" degenerates to a thin sliver hugging the plot ceiling with
the one outlier sitting on its lower edge. It adds visual weight without information; the
existing dashed `outlierThreshold` line plus the red outlier dot already carry the whole
argument. The only state where the band would have area (2+ outliers, cutoff below several
flagged points) has no positive anchor in the 22-set (walk #10 / parked #49) and cannot be
built or verified. See Appendix B for the full rationale. The S233 correction below stands
as the record of why the χ² framing was wrong, but the card is no longer in the draw set.

> **Correction (S233).** An earlier draft of this row conflated two distinct values and is
> corrected here against source (S233 read-only). `outlierThreshold` (`:195`) is the BH-FDR
> survivor boundary — data-derived, the verdict's cutoff, null when `nOut === 0`.
> `plotThreshold` = `chiSquaredQuantile(nC, 1 − ALPHA_BIN)` (`:194`) is the closed-form
> χ²(nC, 0.99) tail — a *different* value that does NOT decide membership. The two diverge on
> real data. The verdict flags on BH-FDR at α=0.001, not on the raw χ²(0.99) tail, so §1
> (band-exceedance = verdict-exceedance) requires any band to picture the BH-FDR decision,
> not the χ²(0.99) tail. The earlier "centred-on-null / band IS the χ² envelope / matches by
> construction" framing rested on the conflation and is withdrawn. The `:152` line reference
> in the earlier draft was also wrong (`:152` is unrelated; the symbols are at `:194`/`:195`).

**Decimal Precision** — **moved to no-band (Appendix B), S234.** Was scoped as a per-level
binomial-deficit band with the suppressed expected line restored; built (`0dae9c7`),
rendered on the live UI, and reverted. The live render answered the §3 OPEN ("does the band
earn its name") with no: the band and expected line are invisible. See Appendix B for the
full rationale. The `gapCount` correctness fix found during the scoping — the card's deficit
count read `deficit`/`ratio` fields that don't exist on `details`, so it was permanently
zero; now reads `perLevel.adjP < 0.001` — was kept and promotes independently (`cf8c749`).

**Value-Frequency Spike** — **moved to no-band (Appendix B), S235.** Scoped as a per-value
Poisson band but the read-only found there is no plot to host it: the card body is an
`EvidenceTable`, not an SVG (`MiniCard_ValueFrequency.jsx` imports no plot component;
`MiniPlot.jsx:54` maps the test to the table card; no `plots/` file references VFS). Adding
a band is "build a plot first," not a ride-along, and three further blockers sit behind the
missing plot: the test is dual-pass with no single canonical axis (pass-1 integer histogram
vs pass-2 per-length digit-substring histograms, driving pass varies by fixture); the
"expected" is the per-value leave-one-out neighbour mean (a jagged per-bar line, not a
single CI reference); and real fixtures have hostile x-cardinality (~180 near-unit bars on
the cellcount fixtures). See Appendix B. Two source corrections to the withdrawn draft: the
Poisson survival is **inline** (exact upper tail, normal approx for λ>30 —
`valueFrequencySpike.js:88-105`), not a closed-form library call; and `ratio` divides by the
**raw** neighbour mean `smoothed`, not the 0.1-floored λ (`:107`).

**Terminal Digits** — **moved to no-band (Appendix B), S236.** Was scoped as a centred-on-null
per-digit binomial(n, 1/10) band on the flat ten-digit uniform expected line. The §3 OPEN
(does the clean-uniform null distinguish it from Benford's pooled-MAD carve-out?) resolved
against the band: in principle the distinction holds (the default verdict gates on a global χ²
over the flat ten-digit uniform, `terminalDigits.js:58`, and the plotted expected line is that
same uniform — a genuine centred reference, unlike Benford's pooled MAD), but a probe across
all 22 fixtures found **no fixture exercises the default 10-digit branch** — every numeric
fixture (18/18) trips the trailing-zero 9-digit branch, the other 4 are integer and never
gated. Decimal instrument data strips trailing zeros (exactly the artifact the 9-digit branch
corrects for), so the clean ten-digit uniform the band sits on is produced by no real dataset,
and the band has no fixture to verify against. See Appendix B for the full rationale,
including the digit-0 display defect fixed alongside (`5a1402d`).

**IRC (per-pair)** — centred-on-null. Per-pair band on the heatmap; the null is the
**LOO-expected r, not ρ = 0** (`interReplicateCorrelation.js`). Mechanism: per-pair
Fisher-z SE (`:107-114`), analytic. Watch: the centre is the leave-one-out expected
correlation, NOT zero — drawing a band around ρ=0 would be the wrong null. The windowed
sub-unit stays no-band (permutation scan, separate surface). The "elevated replicates"
amber tint is a *relative* cut (mean-Z+1·SD), not a significance band (alpha-audit Q1
cleared it) — the new per-pair band must not be conflated with that tint. **Per the
four prior WS-2 reverts: confirm a hostable plot with a single canonical axis AND a fixture
that exercises the band's reference branch before scoping — not just exceedance.**

**Modality** — centred-on-null. Band on the Hartigan dip vs the uniform null. Mechanism:
analytic qDiptab inversion (bootstrap retired S159b). **The real null is not currently
plotted** — today's reference line is the dip-gate 0.04 (an effect-size floor), NOT the
null value. Drawing this band means plotting a *different object* than the current line:
the qDiptab-derived null envelope. Watch: decide whether the 0.04 gate line stays
(alongside the new null band) or is replaced. The gate and the null are different
quantities; if both show, the card must distinguish them. **Modality caps at MODERATE**
(`modality.js:34`, never HIGH) — so per the level rule this is a MOD-capped card. A 99.9%
HIGH-tier band would over-state. **This is a level exception: Modality's band, if drawn,
sits at the 99% MODERATE level, not 99.9%** — or Modality moves to no-band. See the OPEN
flag.

> **OPEN — Modality level exception.** Modality is the one draw-set card that caps at
> MODERATE. The level lock says the band marks HIGH; a card that can't reach HIGH can't
> carry a HIGH-tier band honestly. Two resolutions: (a) draw Modality's band at 99%
> (MODERATE), making it the documented single exception to the uniform-99.9% rule, with the
> band meaning "would flag MODERATE"; or (b) move Modality to no-band (Appendix B) on the
> same logic that removes CCR — a band that can't move the flag to its own level is
> decoration. **Lean: (b) no-band**, for consistency with the CCR decision (both MOD-capped,
> both therefore off the draw set), which keeps the level rule clean (every drawn band is
> 99.9%, no exceptions). Confirm before WS-2 Modality dispatch. If (b), Modality leaves the
> draw set → 7 cards, and WS-2 loses its last analytic-new draw.

### WS-3 — permutation-read (engine prerequisite, §5)

**Entropy / Zipf** — exclude-null. Band on the H ratio vs **1** (H_obs / median(H_null)).
Mechanism: B=999 bootstrap null exists in-loop but is collapsed to its median and
discarded; the band needs **retained quantiles** (the engine edit, §5). Read the band at
the corrected quantile of the retained null. Watch: **Fisher-exempt, per-condition
worst-group** — the band reflects the worst-group decision, not a pooled draw (§4).

**Column GoF** — exclude-null. Band on the A² ratio vs **1** (A²_obs / median(A²_null),
two-sided). Same mechanism and same engine dependency as Entropy (B=999 refit bootstrap,
median-collapsed). Same Fisher-exempt worst-group constraint (§4). Watch: two-sided —
the band has both an upper and lower bound on the ratio; significance is ratio outside
either.

**Kurtosis** — centred-on-null. Band on the simulated null density (N(0,√2)-shaped).
Mechanism: N_SIM=1999 nulls pooled κ; analytic √(24/N) SE *also* exists, so this one has a
fallback if the retained-quantile path is awkward. Fisher-exempt (per-condition BH sub-unit
promotes). Watch: **Kurtosis has no positive anchor in the 22-fixture set** (STATUS,
parked #49) — the flagged-band path is verified-by-construction only, never rendered on a
real flagged fixture. The band can be specified and built but cannot be visually verified
on a flagged card until a positive-anchor fixture exists. Note this as a render-unexercised
draw; do not block the build on it, but flag it as unverified at close.

---

## 4. The Fisher-exempt worst-group constraint (WS-3)

Entropy, Column GoF, and Kurtosis route **per-condition** when ≥2 row groups exist
(`aggregatePerGroup`), and are **Fisher-exempt** — the aggregate flag is the **worst-group**
flag, never a Fisher promotion (`aggregation.js:127-135`). The card displays the worst-group
slice (the card captions this scope).

**Constraint on the band:** the drawn band must reflect the **worst-group** decision the
verdict uses — the same per-unit-display principle as Mahalanobis (S218). Concretely: the
band is read at the corrected quantile of the *worst group's* retained null, on the
worst group's statistic — not a pooled-across-conditions null. A pooled band would be a
different (and wrong) statistic, contaminated by treatment effects across conditions.

This is why WS-3 cannot be a pure presentational swap: the retained-quantile engine edit
(§5) must retain the **per-group** null quantiles, so the worst-group band is available.
Retaining only a pooled quantile would not satisfy this.

---

## 5. WS-3 engine prerequisite (separate Code dispatch)

WS-3's three bands read a quantile of a permutation/bootstrap null that the engine
**currently discards** — Entropy and Column GoF collapse their B=999 null to its median
(the ratio denominator) and drop the array; Kurtosis nulls pooled κ via N_SIM=1999 and
retains only the p. To draw the band, the engine must **retain the adjusted-level quantile**
(per-group, per §4) instead of discarding it.

This is a `src/` engine change, owned by Code, **separate from the presentational draw
work** and a prerequisite for it. It does not depend on the alpha audit or anything else
landed in S230. Scope when WS-3 is reached:

- Entropy (`entropyTest.js` ~:36) — retain the per-group null quantile at the 99.9%
  level alongside the median.
- Column GoF (`columnGof.js` ~:35,138-164) — same, on the refit bootstrap null.
- Kurtosis (`kurtosis.js` ~:158) — retain the sim-null quantile; OR use the analytic
  √(24/N) SE if cleaner (Kurtosis has the analytic fallback the other two lack).

Decision for the engine dispatch: **retained-quantile vs analytic-SE per card.** Entropy
and Column GoF have no closed form → retained quantile is the only path. Kurtosis has both
→ pick analytic-SE if it avoids touching the sim loop, retained-quantile if consistency
with the other two is worth more. Resolve at WS-3 scoping, not now.

**WS-3 is gated on this engine edit. WS-1 and WS-2 are not — they can land first.**

---

## 6. Surface-residual co-landing (the ride-with-the-band set)

The S229 walk's plot residuals on CI-bearing cards (R2 wrapper-hug, R4 legend, R5 colour,
plot-design specifics, the S211 section-heading resolution) land **with** the band on each
tier-A card — one touch per surface, not a battery-wide legend pass followed by a
third-of-them redraw. This is the double-touch trap the classification exists to avoid. The
no-band cards' residuals already landed (or land) separately as the land-now set; they are
not part of this spec.

Per tier-A card, the band dispatch carries: the band itself, plus that card's R2/R4/R5/
plot-design residuals and any S211 heading resolution. Specify the residuals per card from
WALK-FINDINGS at dispatch time — they are not re-listed here (this spec owns the band; the
walk findings own the residuals; the dispatch merges them).

---

## Appendix A — implementation order

1. **WS-1 retrofit** (Autocorrelation, Runs, Mean-Variance) — lowest cost, no engine edit,
   highest confidence (the bands already draw). Validates the 99.9% level visually on three
   live bands before extending. Land first.
2. **WS-2 analytic-new** — IRC is the live analytic-new draw candidate; Modality gated on its
   level-exception OPEN. (Mahalanobis was the original WS-2 lead, Decimal Precision the next,
   VFS the third, and Terminal the fourth; all four moved to no-band — S233 / S234 / S235 /
   S236, Appendix B.)
3. **WS-3 engine prerequisite** dispatch, then WS-3 draws (Entropy, Column GoF, Kurtosis).

Each card's band rides with its surface residuals (§6).

## Appendix B — the no-band set (specified for boundary clarity; NO band drawn)

These are NOT in the draw set. Listed so the boundary is explicit and the exceedance rule
is auditable.

**No-band — no per-unit interval-shaped null (keep p in verdict):** Exact Duplicate
Detection, Constant Offset, RSC (gating stat; the ρ matrix stays informational, NOT
promoted to a CI — S217 fault if it were), Regional Noise, LOESS, Row-Mean Runs, Missing
Data, Carlisle, Blocked Mahalanobis, CCC.

**No-band — analytic-feasible but fails the exceedance rule:**
- **Benford 1 / Benford 2** — per-digit band wouldn't match the pooled-MAD raw-sim gate;
  the dashed expected-frequency line is already the natural read. Keep the line, no band.
- **CCR** — flag-capped at MODERATE; a band can't move the flag to its own (HIGH) level →
  decoration. No band.
- **Within-Row Variance** — count-tail gate (is the COUNT of extreme rows beyond the
  binomial tail), not per-row; a per-row band would assert per-row inference the gate
  doesn't make. Decorative-distinguish only (§Appendix C).
- **Mahalanobis Row Outlier** — **moved here from the draw set on the live render (S233).**
  The corrected decision is a single threshold (`outlierThreshold`, the smallest BH-FDR
  survivor D²), not an interval, so the only honest band is the shaded half-plane above it.
  On every 22-set fixture that flag is a *single* outlier, so `outlierThreshold` equals that
  one row's distance and the shaded region degenerates to a sliver at the plot ceiling — the
  flagged dot sits on its lower edge, the region is near-empty. Built and rendered S233 on
  DS06/DS08; it added visual weight without information. The band would only have area on a
  2+-outlier fixture (cutoff below several flagged points), which has no positive anchor
  (walk #10 / parked #49) and cannot be verified. The existing dashed `outlierThreshold` line
  plus the red outlier dot already carry the full argument. No band; keep the line. (If a
  multi-outlier positive anchor lands via #49, revisit whether a band earns its place then —
  but not before a fixture can render it.)
- **Decimal Precision** — **moved here from the draw set on the live render (S234).**
  The band was the per-level binomial deficit floor below the trailing-zero expected line,
  over intermediate precision levels 1…maxDp−1. It is geometrically well-formed (lower bound
  ≤ expected on every level, verified by probe) but invisible: the dominant precision bar
  sets the y-scale, and the trailing-zero model predicts only ~0.9 × 0.1^k of the dominant
  at each intermediate level k — a handful of values against a dominant bar in the hundreds.
  The expected line and band therefore live in the bottom few percent of the plot; on a
  clean fixture the expected line renders as a dashed scrawl along the axis that reads as a
  glitch, not information. **This failure is intrinsic to the test's scale, not anchor-gated.**
  Unlike Mahalanobis — where a 2+-outlier anchor would give the band area — no DecPrec
  fixture rescues it: the dominant-bar-sets-scale relationship holds for every fixture, clean
  or flagged. The bars-only card already carries the precision distribution; gaps and
  deficits read directly off the bars. No band, no expected line. (Not revisitable via a
  positive anchor — the scale relationship is structural; NOT homed in #49. Revisit only if
  the plot were re-scaled to the intermediate levels, which would bury the dominant bar and
  defeat the card's main read.) The `gapCount` correctness fix found during scoping was kept
  (`cf8c749`).
- **Value-Frequency Spike** — **moved here from the draw set on a read-only, S235.** Unlike
  Mahalanobis and DecPrec, VFS did not get to a live render: the read-only found the card has
  no plot. The body is an `EvidenceTable`; frequency appears only as the `Observed` /
  `Expected` / `Ratio` columns, never on an axis. A band would require building a plot first,
  and three structural facts make that plot ill-posed: (1) **no single canonical axis** — VFS
  is dual-pass (pass-1 integer-value histogram, pass-2 a set of fractional-digit-substring
  histograms bucketed by length), and the driving pass varies by fixture (DS13/DS06 full,
  DS04 digit), so one plot cannot host both; (2) **per-value null** — λ is the leave-one-out
  local-neighbour mean, a jagged line tracking local density, not the single reference the
  programme draws against; (3) **hostile x-cardinality** on the real fixtures (DS06/DS05 are
  ~180 near-unit-count bars over a 600-wide range). The probe also showed the scale story is
  per-fixture and varied, not the DecPrec swamp: the synthetic HIGH anchor DS13 is bounded
  (6–71, 55 bars, count spread 4.4×, the tallest bar IS the spike) and a band there would
  render legibly and be anchor-verifiable — but the real cellcount fixtures degenerate by
  sparsity and the qPCR fixtures have no integer axis at all. So even a DS13-shaped plot would
  degenerate on the other fixtures. No band; the EvidenceTable already carries Observed /
  Expected / Ratio / Adj. p per value, which is the honest read. (If the programme ever wants
  a VFS visual, DS13 is the only viable anchor-verifiable target, and it is a bespoke
  single-fixture-shaped plot build — its own scoped piece, not a band ride-along. Not homed in
  #49: the blocker is structural, not a missing positive anchor — VFS already has three.)
- **Terminal Digits** — **moved here from the draw set on a probe, S236.** Was scoped as a
  centred-on-null per-digit binomial(n, 1/10) band on the flat ten-digit uniform expected
  line, with the verdict gating on the global χ² (illustrative band, not per-digit decision).
  The §3 OPEN tested whether the clean-uniform null distinguishes Terminal from Benford —
  which is no-band because its expected frequencies ARE the test content and the MAD is
  pooled. **The distinction holds in principle:** the default verdict gates on `p10`, a global
  χ² over the flat ten-digit uniform `exp10 = total/10` (`terminalDigits.js:58`), and the
  plotted expected line is that same flat uniform — a genuine centred reference a reader
  interprets directly, unlike Benford's pooled MAD. **What killed it:** a probe across all 22
  fixtures (real `testTerminalDigits` on each, matrix built as `validate-batch.mjs` does)
  found **0 fixtures exercise the default 10-digit branch.** 18/18 numeric-applicable fixtures
  trip the trailing-zero 9-digit branch (`counts[0] < exp10*0.40`, `df=8`); 4 are
  100%-integer and never gated. Decimal instrument data strips trailing zeros — exactly the
  artifact the 9-digit branch corrects for — so the clean ten-digit uniform the band sits on
  is produced by no real dataset, and the band has no fixture to verify against. Same outcome
  as VFS, different cause. **The display defect found alongside (fixed, separate from the
  band):** the plot drew digit 0 and the flat ten-digit expected line even in the suppression
  branch, while the verdict gates on the 9-digit test with digit 0 excluded — a
  per-unit-display violation (INVESTIGATION-DISPLAY-SPEC §544, S218). Fixed `5a1402d`,
  card-side (`MiniCard_TerminalDigit.jsx`): when `trailingZeroWarning`, plot digits 1–9 with
  `exp9 = total9/9`. This correctness fix lands regardless of the no-band decision — the
  suppression branch is the operating norm on all real numeric data, not an edge case. The
  default-branch display path is preserved in source (not removed) but unexercised; a future
  fixture or upload could trip it. **NOT a parked-anchor band:** Terminal already has fixtures;
  the blocker is that they all trip the trailing-zero branch. A purpose-built fabricated
  fixture engineered to dodge trailing-zero stripping (to exercise the default branch and give
  the band a clean-uniform home) is parked in #49 as a bespoke off-CI idea, not a live band.
  **Source notes confirmed:** line 58 is the default-branch `flagFromP(p10)`; the suppression
  branch gates `flagFromP(p9)` at line 54; the plotted expected line is `exp10`
  (`terminalDigits.js:35`), never rewritten to `exp9` in the suppression branch (the source of
  the display defect).

**Modality** — pending the §3 OPEN; lean is to land it here (no-band, MOD-capped, same
logic as CCR).

## Appendix C — decorative-distinguish (make the rect visually NOT-a-CI)

These draw a rect/line that reads like a tolerance interval but isn't. The work is to make
it visually not read as a CI — the opposite of a draw.

- **Selective Noise** — the ±medianStd grey rect is the empirical median column SD,
  flag-gated, illustrative; significance is the Bartlett omnibus, not the rect. Make it
  read as a display aid, not a band.
- **Within-Row Variance** — the ±3.5 z-lines are fixed display cuts AND don't match the
  engine's own Z_THRESH=4.0. Distinguish as display cuts; reconcile the threshold to the
  engine value so the line stops contradicting the code.

---

## Locked / open summary

**Locked:** level (99.9% uniform across the draw set), corrected basis (BH-adjusted,
worst-group where per-condition), draw set membership (the 8 cards of §2, modulo the one
remaining OPEN), the no-band and decorative-distinguish boundaries (Appendices B/C),
implementation order (Appendix A), the engine prerequisite as a separate gated dispatch (§5).
The per-card convention (exclude-null vs centred-on-null) is the *output* of the §1
band-matches-verdict rule applied to each card's verdict null, not an independent choice — the
WS-1 set (Autocorrelation, Runs, Mean-Variance) all lock exclude-null because all three
verdicts test an observed statistic against a meaningful zero using the observed spread (S232,
sourced to METHODOLOGY §2.1 pooled-t and the Mean-Variance slope-space geometry confirm).
"Consistent cross-test" means each band faithfully pictures its own verdict, not that all
bands are identically shaped regardless of verdict.

**Open (confirm before the relevant dispatch, not before the spec lands):**
1. **Modality level exception** — no-band (lean, → 7 cards) vs 99% exception band? (§3
   OPEN.) Confirm before WS-2 Modality.

(The Terminal Digits convention OPEN — did the clean-uniform null distinguish it from
Benford's carve-out? — RESOLVED S236: it holds in principle, but no fixture exercises the
default branch, so Terminal moved to Appendix B no-band.)

The Modality OPEN does not block WS-1 (retrofit), the WS-2 IRC card, or the WS-3 engine
prerequisite. The spec is dispatchable for WS-1 immediately on landing.
