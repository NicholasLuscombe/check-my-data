# S350 Part 13 — heterogeneity grid, raw tables

Companion data for `docs/shared/SESSION350-AUDIT-SUMMARY.md` Part 13. Nothing is
interpreted here; the reading is in the summary.

Produced by `test/probes/probe-s350-heterogeneity-grid.mjs` over datasets from
`test/gen-copy-fidelity.mjs`. The datasets are ephemeral — regenerate from
`(k, s, seed)`. Per-unit record in `docs/shared/S350-HETEROGENEITY-UNITS.csv`.

Two axes. `k` is copy fidelity, 0 a perfect copy and 1 exact independence. `s`
is the dispersion of the per-subject replicate-noise scale, 0 homoscedastic.
The scale multiplier is centred so the pooled replicate noise does not change
with `s`: raising `s` redistributes noise between subjects without changing how
much there is.

Residual Spike Correlation only, free null, one layout. Part 11 measured the
corrected null flat at zero across the whole fidelity axis and every number
identical between the two layouts, so both are cut and the corrected null
appears as a control row at `k = 1` for each `s`.

## Consistency with the earlier sweep

The `s = 0` row reproduces the committed Part 11 free-null curve exactly —
100, 100, 100, 100, 100, 95, 55, 5, 10, 0 — so adding the heterogeneity axis
left the original instrument undisturbed.

```bash
node --import ./test/probes/s348-hash-hook.mjs \
     --import ./test/probes/s350-rsc-null-hook.mjs \
     test/probes/probe-s350-heterogeneity-grid.mjs
```

```
S350 Part 13 — the falsification grid: copy fidelity k x noise-scale heterogeneity s

grid: 10 k x 6 s x 20 independent datasets, free null
       plus a corrected-null control at k = 1 for each s
generator: 120 subjects, 6 reps, tau 1.15, sigma 0.25, effect 1.5x on 20% of subjects
a flag is MODERATE or HIGH, i.e. p < ALPHA.NOTE = 0.01

grid complete in 28s

per-unit record: 1320 rows -> docs/shared/S350-HETEROGENEITY-UNITS.csv

── Q1 — detection along k, at each heterogeneity level. Free null. ──
   If detection still falls from full to zero as the copy degrades at every s,
   the test responds to copying and not merely to subject structure.

    s  |      0   0.1   0.2   0.3   0.4   0.5  0.65   0.8   0.9     1
  -------------------------------------------------------------------
     0 |   100%  100%  100%  100%  100%   95%   55%    5%   10%    0%
  0.15 |   100%  100%  100%  100%   95%   95%   55%   15%    5%    0%
   0.3 |   100%  100%  100%  100%  100%  100%   80%   60%   30%   25%
   0.5 |   100%  100%  100%  100%  100%  100%  100%   90%   80%   85%
  0.75 |   100%  100%  100%  100%  100%  100%  100%  100%  100%  100%
     1 |   100%  100%  100%  100%  100%  100%  100%  100%  100%  100%

   median p, same cells:
    s  |      0   0.1   0.2   0.3   0.4   0.5  0.65   0.8   0.9     1
     0 |  0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00500 0.0555 0.341 0.540
  0.15 |  0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00200 0.0570 0.330 0.349
   0.3 |  0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00150 0.00500 0.0625 0.0260
   0.5 |  0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00200
  0.75 |  0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00100
     1 |  0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00100 0.00100


── Q2 — false-positive rate on honest data, k = 1, no copy at all ──
   Threshold ALPHA.NOTE = 0.01 throughout, so these are directly comparable to Q1.

     s    measured dispersion   free null FPR     median p     p range (10-90)    corrected null FPR
     0         0.0551            0% (0/20)      0.5400   [0.104 .. 1.00]         0% (0/20)
  0.15         0.1500            0% (0/20)      0.3495   [0.0852 .. 0.749]         0% (0/20)
   0.3         0.2931           25% (5/20)     0.02600   [0.00100 .. 0.408]         0% (0/20)
   0.5         0.4867           85% (17/20)    0.002000   [0.00100 .. 0.0171]         0% (0/20)
  0.75         0.7304          100% (20/20)    0.001000   [0.00100 .. 0.00110]         0% (0/20)
     1         0.9747          100% (20/20)    0.001000   [0.00100 .. 0.00100]         5% (1/20)

   The mechanism, made visible: mean subjects in the top-12 of BOTH conditions at k = 1,
   where no copying has occurred. Under independence the expectation is 1.2.
     s =    0: 1.50 subjects
     s = 0.15: 2.05 subjects
     s =  0.3: 3.50 subjects
     s =  0.5: 5.65 subjects
     s = 0.75: 7.00 subjects
     s =    1: 8.10 subjects


── ANCHOR — where the four clean paired fixtures sit on the s axis ──
   These are OUR OWN GENERATED FIXTURES. The anchor says where our corpus sits.
   It does not say where real deposits sit; that question belongs to P65.

   fixture                              conditions  subjects  reps  df   raw disp  corrected disp
   01-densitometry-clean                    3          35     4    9   0.2420    0.0549
   03-qpcr-clean                            2          25     3    4   0.3891    0.1624
   09-proteomics-clean                      2         200     6   10   0.2992    0.1988
   17-densitometry-carlisle-clean           3          60     6   15   0.1870    0.0405

   For comparison, the same estimator on generated data at each s:
     sigmaS =    0  ->  measured 0.0551
     sigmaS = 0.15  ->  measured 0.1500
     sigmaS =  0.3  ->  measured 0.2931
     sigmaS =  0.5  ->  measured 0.4867
     sigmaS = 0.75  ->  measured 0.7304
     sigmaS =    1  ->  measured 0.9747
```
