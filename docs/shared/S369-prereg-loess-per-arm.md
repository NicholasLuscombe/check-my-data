# Pre-registration — LOESS per-arm marginals

Committed before any per-arm draw is read. Basis and predictions are
prior to measurement.

## Basis

`loessResidual.js:225, :451`

    combinedP     = min(scanP, cusumP)
    finalPrimaryP = min(combinedP, pairBestAdjP)

Three arms, not four.

- `scanP` (:213) and `cusumP` (:214) are raw `(b+1)/(N_PERM+1)`
  permutation p's from one shared loop (:180-206). Uncorrected.
  `N_PERM` = 4999 at <=100 valid rows, else 499 (:179).
- `pairBestAdjP` (:450) is a BH minimum over a per-column-pair family,
  `m = pairResults.length`, data-dependent. Exactly 1 when the block
  does not run.

Under any dependence structure among three arms that are each uniform
or conservative, the median of their minimum is >= 0.206
(= 1 - 2^(-1/3)). Dependence raises it; a conservative or dead third
arm raises it further. 0.206 is the floor of the admissible band.

Observed session values:
- median 0.164-0.192 — entirely BELOW the floor
- marginal at ALPHA.NOTE 2.28%, k_eff 2.30 — INSIDE the band
  (three independent arms predict 2.97%)

The tail is unremarkable. The median is the anomaly. This points at
arm-level calibration of the permutation null, not multiplicity.

## Predictions

P1. `min(scanP, cusumP, pairBestAdjP)` reproduces `finalPrimaryP`
    exactly on every group x fixture. If it fails anywhere, an
    unaccounted path exists and P2-P4 are void.

P2. `scanP` and `cusumP` each have their own median below 0.5, by
    comparable amounts. Comparable shifts point upstream — a LOESS
    fit taken once on observed data with residuals permuted under it,
    rather than refit per permutation. A shift in only one points at
    that statistic's own permutation handling.

P3. `pairBestAdjP`'s own median is >= 0.5 and its marginal at
    ALPHA.NOTE is below 1%.

P4. `pairResults.length` is typically small — modal value 1 or 2.

## Falsifier

All three arm medians near 0.5 and all three marginals near 1%, with
P1 holding. Then the arms are calibrated, the joint median is
unexplained, and neither multiplicity nor a fourth path accounts for it.

## Prior record

Two predictions in this arc were tidy, landed where wanted, and missed:
the shared-shuffle correlation mechanism, and a first per-arm reading
that assumed four arms and predicted tail conservatism with the median
unremarkable. Both were structural assumptions not checked against the
built code. This one is written against the source sweep.
