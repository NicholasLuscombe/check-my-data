# S350 Part 11 — copy-fidelity sweep, raw tables

Companion data for `docs/shared/SESSION350-AUDIT-SUMMARY.md` Part 11. Nothing is
interpreted here; the reading is in the summary.

Produced by `test/probes/probe-s350-copy-fidelity-sweep.mjs` over the datasets
`test/gen-copy-fidelity.mjs` generates. The datasets themselves are ephemeral and
are not committed — regenerate from `(k, seed)`.

The per-unit record for every point of both runs is in
`docs/shared/S350-COPY-FIDELITY-UNITS.csv` and
`docs/shared/S350-COPY-FIDELITY-UNITS-SHARED.csv`, 6400 rows each.

A "seed" here is an INDEPENDENT DATASET, not a permutation-seed offset on one
dataset. A detection rate needs data replication; seed offsets would measure the
null's own noise instead. This differs from how "twenty seeds" was read in Parts
5 and 6 and is stated rather than left to inference.

## Two modes, and why both are needed

`k = 1` means the copy noise equals the within-condition replicate noise, which
is where condition B stops being a copy. What "stops being a copy" means depends
on whether the subject levels are shared.

- **full** — both the subject level and the residual degrade with `k`. At `k = 1`
  condition B is an independent honest condition with independent subjects. That
  end is *two unrelated experiments*.
- **shared-subjects** — the subject level is identical in both conditions at
  every `k`; only the residual interpolates. At `k = 1` condition B is *an honest
  paired experiment* with a real condition effect, which is the clean case P82 is
  actually about, because the free permutation null is mis-specified precisely
  when subjects are matched.

Condition A is byte-identical between the two modes at the same `(k, seed)`.

## Reproducibility

The full-mode grid was run twice. The second run reproduced the first exactly,
so every number here is a function of the seed alone.

## Run 1 — mode `full`

```bash
node --import ./test/probes/s348-hash-hook.mjs \
     --import ./test/probes/s350-paired-null-hook.mjs \
     --import ./test/probes/s350-rsc-null-hook.mjs \
     test/probes/probe-s350-copy-fidelity-sweep.mjs
```

```
S350 Part 11 — the copy-fidelity sweep
mode: full  — both levels degrade; k = 1 is two unrelated experiments
grid: 10 fidelity points x 20 independent datasets x 2 layouts x 2 nulls x 2 tests
generator defaults: 120 subjects, 6 reps, tau 1.15, sigma 0.25, effect 1.5x on 20% of subjects
ALPHA.NOTE = 0.01 (MODERATE), ALPHA.FLAG = 0.001 (HIGH). A "flag" is MODERATE or HIGH.

grid complete in 106s

per-unit record: 6400 rows -> docs/shared/S350-COPY-FIDELITY-UNITS.csv


── CCC · column-grouped · free permutation (shipped) ──
    k     detect shipped   detect lifted    median p shipped   median p lifted   p range shipped
     0     100% (20/20)     100% (20/20)     0.002000          0.002000      [0.00200 .. 0.00200]
   0.1      10% (2/20)      10% (2/20)      0.07050           0.07050      [0.0168 .. 0.153]
   0.2       0% (0/20)       0% (0/20)       0.1050            0.1050      [0.0174 .. 0.329]
   0.3       0% (0/20)       0% (0/20)       0.2100            0.2100      [0.0294 .. 0.435]
   0.4       0% (0/20)       0% (0/20)       0.2910            0.2910      [0.0120 .. 0.473]
   0.5       0% (0/20)       0% (0/20)       0.3470            0.3470      [0.0336 .. 0.773]
  0.65       0% (0/20)       0% (0/20)       0.3100            0.3100      [0.0744 .. 0.792]
   0.8       5% (1/20)       5% (1/20)       0.4030            0.3700      [0.0414 .. 0.894]
   0.9       0% (0/20)       0% (0/20)       0.4965            0.3950      [0.269 .. 0.764]
     1       0% (0/20)       0% (0/20)       0.4445            0.3360      [0.200 .. 0.750]
  false-positive rate at k = 1 (independent): shipped 0%, filter lifted 0% — same threshold, ALPHA.NOTE

── CCC · column-grouped · within-subject relabel ──
    k     detect shipped   detect lifted    median p shipped   median p lifted   p range shipped
     0       0% (0/20)       0% (0/20)       0.2350            0.2350      [0.0360 .. 1.00]
   0.1       0% (0/20)       0% (0/20)       0.4085            0.4085      [0.102 .. 0.732]
   0.2       0% (0/20)       0% (0/20)       0.3095            0.3095      [0.0916 .. 0.600]
   0.3       0% (0/20)       0% (0/20)       0.4305            0.4245      [0.112 .. 0.899]
   0.4       0% (0/20)       0% (0/20)       0.3460            0.3460      [0.0522 .. 1.00]
   0.5       0% (0/20)       0% (0/20)       0.4875            0.4875      [0.0750 .. 1.00]
  0.65       0% (0/20)       0% (0/20)       0.2785            0.2560      [0.0462 .. 1.00]
   0.8       0% (0/20)       5% (1/20)       0.3550            0.3060      [0.0354 .. 0.791]
   0.9       0% (0/20)       0% (0/20)       0.4280            0.3660      [0.254 .. 0.762]
     1       0% (0/20)       0% (0/20)       0.4465            0.3810      [0.210 .. 0.753]
  false-positive rate at k = 1 (independent): shipped 0%, filter lifted 0% — same threshold, ALPHA.NOTE

── CCC · row-grouped · free permutation (shipped) ──
    k     detect shipped   detect lifted    median p shipped   median p lifted   p range shipped
     0     100% (20/20)     100% (20/20)     0.002000          0.002000      [0.00200 .. 0.00200]
   0.1      10% (2/20)      10% (2/20)      0.07050           0.07050      [0.0168 .. 0.153]
   0.2       0% (0/20)       0% (0/20)       0.1050            0.1050      [0.0174 .. 0.329]
   0.3       0% (0/20)       0% (0/20)       0.2100            0.2100      [0.0294 .. 0.435]
   0.4       0% (0/20)       0% (0/20)       0.2910            0.2910      [0.0120 .. 0.473]
   0.5       0% (0/20)       0% (0/20)       0.3470            0.3470      [0.0336 .. 0.773]
  0.65       0% (0/20)       0% (0/20)       0.3100            0.3100      [0.0744 .. 0.792]
   0.8       5% (1/20)       5% (1/20)       0.4030            0.3700      [0.0414 .. 0.894]
   0.9       0% (0/20)       0% (0/20)       0.4965            0.3950      [0.269 .. 0.764]
     1       0% (0/20)       0% (0/20)       0.4445            0.3360      [0.200 .. 0.750]
  false-positive rate at k = 1 (independent): shipped 0%, filter lifted 0% — same threshold, ALPHA.NOTE

── CCC · row-grouped · within-subject relabel ──
    k     detect shipped   detect lifted    median p shipped   median p lifted   p range shipped
     0       0% (0/20)       0% (0/20)       0.2350            0.2350      [0.0360 .. 1.00]
   0.1       0% (0/20)       0% (0/20)       0.4085            0.4085      [0.102 .. 0.732]
   0.2       0% (0/20)       0% (0/20)       0.3095            0.3095      [0.0916 .. 0.600]
   0.3       0% (0/20)       0% (0/20)       0.4305            0.4245      [0.112 .. 0.899]
   0.4       0% (0/20)       0% (0/20)       0.3460            0.3460      [0.0522 .. 1.00]
   0.5       0% (0/20)       0% (0/20)       0.4875            0.4875      [0.0750 .. 1.00]
  0.65       0% (0/20)       0% (0/20)       0.2785            0.2560      [0.0462 .. 1.00]
   0.8       0% (0/20)       5% (1/20)       0.3550            0.3060      [0.0354 .. 0.791]
   0.9       0% (0/20)       0% (0/20)       0.4280            0.3660      [0.254 .. 0.762]
     1       0% (0/20)       0% (0/20)       0.4465            0.3810      [0.210 .. 0.753]
  false-positive rate at k = 1 (independent): shipped 0%, filter lifted 0% — same threshold, ALPHA.NOTE

── RSC · column-grouped · free permutation (shipped) ──
    k     detect           median p     p range (10th-90th)
     0     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.1     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.2     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.3     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.4     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.5      95% (19/20)     0.001000    [0.00100 .. 0.00310]
  0.65      55% (11/20)     0.005000    [0.00100 .. 0.103]
   0.8       5% (1/20)      0.05550    [0.0149 .. 0.330]
   0.9      10% (2/20)       0.3410    [0.0236 .. 0.747]
     1       0% (0/20)       0.5400    [0.104 .. 1.00]
  false-positive rate at k = 1 (independent): 0% — same threshold, ALPHA.NOTE

── RSC · column-grouped · within-subject relabel ──
    k     detect           median p     p range (10th-90th)
     0       0% (0/20)        1.000    [1.00 .. 1.00]
   0.1       0% (0/20)        1.000    [0.374 .. 1.00]
   0.2       0% (0/20)       0.9360    [0.624 .. 1.00]
   0.3       0% (0/20)       0.9640    [0.732 .. 1.00]
   0.4       0% (0/20)       0.9480    [0.301 .. 1.00]
   0.5       0% (0/20)       0.8020    [0.375 .. 0.999]
  0.65       0% (0/20)       0.8775    [0.326 .. 0.996]
   0.8       0% (0/20)       0.9120    [0.689 .. 0.972]
   0.9       0% (0/20)       0.9175    [0.541 .. 1.00]
     1       0% (0/20)       0.9705    [0.717 .. 1.00]
  false-positive rate at k = 1 (independent): 0% — same threshold, ALPHA.NOTE

── RSC · row-grouped · free permutation (shipped) ──
    k     detect           median p     p range (10th-90th)
     0     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.1     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.2     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.3     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.4     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.5      95% (19/20)     0.001000    [0.00100 .. 0.00310]
  0.65      55% (11/20)     0.005000    [0.00100 .. 0.103]
   0.8       5% (1/20)      0.05550    [0.0149 .. 0.330]
   0.9      10% (2/20)       0.3410    [0.0236 .. 0.747]
     1       0% (0/20)       0.5400    [0.104 .. 1.00]
  false-positive rate at k = 1 (independent): 0% — same threshold, ALPHA.NOTE

── RSC · row-grouped · within-subject relabel ──
    k     detect           median p     p range (10th-90th)
     0       0% (0/20)        1.000    [1.00 .. 1.00]
   0.1       0% (0/20)        1.000    [0.374 .. 1.00]
   0.2       0% (0/20)       0.9360    [0.624 .. 1.00]
   0.3       0% (0/20)       0.9640    [0.732 .. 1.00]
   0.4       0% (0/20)       0.9480    [0.301 .. 1.00]
   0.5       0% (0/20)       0.8020    [0.375 .. 0.999]
  0.65       0% (0/20)       0.8775    [0.326 .. 0.996]
   0.8       0% (0/20)       0.9120    [0.689 .. 0.972]
   0.9       0% (0/20)       0.9175    [0.541 .. 1.00]
     1       0% (0/20)       0.9705    [0.717 .. 1.00]
  false-positive rate at k = 1 (independent): 0% — same threshold, ALPHA.NOTE


── resolved direction of the Stage-1 units, and how many flip between the nulls ──
   Counted over unit x dataset. Three Stage-1 units x one pair x the datasets at each k.

   column-grouped
    k     free: similar/different   paired: similar/different   units flipping (of 3 per dataset)
     0         59/1                   23/37                 36 of 60
   0.1         59/1                   23/37                 36 of 60
   0.2         57/3                   16/44                 41 of 60
   0.3         54/6                   18/42                 36 of 60
   0.4         45/15                  20/40                 25 of 60
   0.5         41/19                  24/36                 17 of 60
  0.65         35/25                  25/35                 10 of 60
   0.8         30/30                  26/34                 6 of 60
   0.9         28/32                  26/34                 2 of 60
     1         24/36                  24/36                 2 of 60

   row-grouped
    k     free: similar/different   paired: similar/different   units flipping (of 3 per dataset)
     0         59/1                   23/37                 36 of 60
   0.1         59/1                   23/37                 36 of 60
   0.2         57/3                   16/44                 41 of 60
   0.3         54/6                   18/42                 36 of 60
   0.4         45/15                  20/40                 25 of 60
   0.5         41/19                  24/36                 17 of 60
  0.65         35/25                  25/35                 10 of 60
   0.8         30/30                  26/34                 6 of 60
   0.9         28/32                  26/34                 2 of 60
     1         24/36                  24/36                 2 of 60


── generator sanity ──
   any detection anywhere on the grid: yes
```

## Run 2 — mode `shared-subjects`

```bash
MODE=shared-subjects node --import ./test/probes/s348-hash-hook.mjs \
     --import ./test/probes/s350-paired-null-hook.mjs \
     --import ./test/probes/s350-rsc-null-hook.mjs \
     test/probes/probe-s350-copy-fidelity-sweep.mjs
```

```
S350 Part 11 — the copy-fidelity sweep
mode: shared-subjects  — subject levels identical in both conditions; k = 1 is an HONEST PAIRED experiment
grid: 10 fidelity points x 20 independent datasets x 2 layouts x 2 nulls x 2 tests
generator defaults: 120 subjects, 6 reps, tau 1.15, sigma 0.25, effect 1.5x on 20% of subjects
ALPHA.NOTE = 0.01 (MODERATE), ALPHA.FLAG = 0.001 (HIGH). A "flag" is MODERATE or HIGH.

grid complete in 108s

per-unit record: 6400 rows -> docs/shared/S350-COPY-FIDELITY-UNITS-SHARED.csv


── CCC · column-grouped · free permutation (shipped) ──
    k     detect shipped   detect lifted    median p shipped   median p lifted   p range shipped
     0     100% (20/20)     100% (20/20)     0.002000          0.002000      [0.00200 .. 0.00200]
   0.1      10% (2/20)      10% (2/20)      0.04200           0.04200      [0.0170 .. 0.102]
   0.2       0% (0/20)       0% (0/20)      0.09300           0.09300      [0.0447 .. 0.192]
   0.3       5% (1/20)       5% (1/20)       0.1205            0.1205      [0.0180 .. 0.276]
   0.4       0% (0/20)       0% (0/20)       0.1625            0.1625      [0.0576 .. 0.361]
   0.5       5% (1/20)       5% (1/20)       0.1460            0.1460      [0.0354 .. 0.339]
  0.65       0% (0/20)       0% (0/20)       0.2165            0.2165      [0.0570 .. 0.395]
   0.8       0% (0/20)       0% (0/20)       0.2385            0.2385      [0.0942 .. 0.409]
   0.9       0% (0/20)       0% (0/20)       0.2175            0.2175      [0.0660 .. 0.403]
     1       5% (1/20)       5% (1/20)       0.1940            0.1940      [0.0726 .. 0.399]
  false-positive rate at k = 1 (independent): shipped 5%, filter lifted 5% — same threshold, ALPHA.NOTE

── CCC · column-grouped · within-subject relabel ──
    k     detect shipped   detect lifted    median p shipped   median p lifted   p range shipped
     0       0% (0/20)       0% (0/20)       0.2350            0.2350      [0.0360 .. 1.00]
   0.1       0% (0/20)       0% (0/20)       0.2010            0.2010      [0.0300 .. 0.683]
   0.2       0% (0/20)       0% (0/20)       0.3035            0.3035      [0.119 .. 0.701]
   0.3       5% (1/20)       5% (1/20)       0.3235            0.3235      [0.0576 .. 0.719]
   0.4       0% (0/20)       0% (0/20)       0.3195            0.3195      [0.113 .. 0.651]
   0.5       0% (0/20)       0% (0/20)       0.2460            0.2460      [0.0777 .. 1.00]
  0.65       0% (0/20)       0% (0/20)       0.3020            0.3020      [0.115 .. 0.535]
   0.8       0% (0/20)       0% (0/20)       0.3725            0.3725      [0.0630 .. 0.718]
   0.9       0% (0/20)       0% (0/20)       0.3660            0.3660      [0.138 .. 0.697]
     1       0% (0/20)       0% (0/20)       0.3360            0.3360      [0.0828 .. 0.715]
  false-positive rate at k = 1 (independent): shipped 0%, filter lifted 0% — same threshold, ALPHA.NOTE

── CCC · row-grouped · free permutation (shipped) ──
    k     detect shipped   detect lifted    median p shipped   median p lifted   p range shipped
     0     100% (20/20)     100% (20/20)     0.002000          0.002000      [0.00200 .. 0.00200]
   0.1      10% (2/20)      10% (2/20)      0.04200           0.04200      [0.0170 .. 0.102]
   0.2       0% (0/20)       0% (0/20)      0.09300           0.09300      [0.0447 .. 0.192]
   0.3       5% (1/20)       5% (1/20)       0.1205            0.1205      [0.0180 .. 0.276]
   0.4       0% (0/20)       0% (0/20)       0.1625            0.1625      [0.0576 .. 0.361]
   0.5       5% (1/20)       5% (1/20)       0.1460            0.1460      [0.0354 .. 0.339]
  0.65       0% (0/20)       0% (0/20)       0.2165            0.2165      [0.0570 .. 0.395]
   0.8       0% (0/20)       0% (0/20)       0.2385            0.2385      [0.0942 .. 0.409]
   0.9       0% (0/20)       0% (0/20)       0.2175            0.2175      [0.0660 .. 0.403]
     1       5% (1/20)       5% (1/20)       0.1940            0.1940      [0.0726 .. 0.399]
  false-positive rate at k = 1 (independent): shipped 5%, filter lifted 5% — same threshold, ALPHA.NOTE

── CCC · row-grouped · within-subject relabel ──
    k     detect shipped   detect lifted    median p shipped   median p lifted   p range shipped
     0       0% (0/20)       0% (0/20)       0.2350            0.2350      [0.0360 .. 1.00]
   0.1       0% (0/20)       0% (0/20)       0.2010            0.2010      [0.0300 .. 0.683]
   0.2       0% (0/20)       0% (0/20)       0.3035            0.3035      [0.119 .. 0.701]
   0.3       5% (1/20)       5% (1/20)       0.3235            0.3235      [0.0576 .. 0.719]
   0.4       0% (0/20)       0% (0/20)       0.3195            0.3195      [0.113 .. 0.651]
   0.5       0% (0/20)       0% (0/20)       0.2460            0.2460      [0.0777 .. 1.00]
  0.65       0% (0/20)       0% (0/20)       0.3020            0.3020      [0.115 .. 0.535]
   0.8       0% (0/20)       0% (0/20)       0.3725            0.3725      [0.0630 .. 0.718]
   0.9       0% (0/20)       0% (0/20)       0.3660            0.3660      [0.138 .. 0.697]
     1       0% (0/20)       0% (0/20)       0.3360            0.3360      [0.0828 .. 0.715]
  false-positive rate at k = 1 (independent): shipped 0%, filter lifted 0% — same threshold, ALPHA.NOTE

── RSC · column-grouped · free permutation (shipped) ──
    k     detect           median p     p range (10th-90th)
     0     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.1     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.2     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.3     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.4     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.5      95% (19/20)     0.001000    [0.00100 .. 0.00410]
  0.65      55% (11/20)     0.006000    [0.00100 .. 0.103]
   0.8       5% (1/20)      0.05300    [0.0100 .. 0.347]
   0.9      10% (2/20)       0.3355    [0.0281 .. 0.729]
     1       0% (0/20)       0.5425    [0.0942 .. 1.00]
  false-positive rate at k = 1 (independent): 0% — same threshold, ALPHA.NOTE

── RSC · column-grouped · within-subject relabel ──
    k     detect           median p     p range (10th-90th)
     0       0% (0/20)        1.000    [1.00 .. 1.00]
   0.1       0% (0/20)        1.000    [0.354 .. 1.00]
   0.2       0% (0/20)       0.9190    [0.649 .. 1.00]
   0.3       0% (0/20)       0.9580    [0.759 .. 1.00]
   0.4       0% (0/20)       0.9545    [0.291 .. 1.00]
   0.5       0% (0/20)       0.8000    [0.366 .. 0.999]
  0.65       0% (0/20)       0.8865    [0.349 .. 0.998]
   0.8       0% (0/20)       0.9055    [0.697 .. 0.967]
   0.9       0% (0/20)       0.9230    [0.544 .. 1.00]
     1       0% (0/20)       0.9725    [0.730 .. 1.00]
  false-positive rate at k = 1 (independent): 0% — same threshold, ALPHA.NOTE

── RSC · row-grouped · free permutation (shipped) ──
    k     detect           median p     p range (10th-90th)
     0     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.1     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.2     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.3     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.4     100% (20/20)     0.001000    [0.00100 .. 0.00100]
   0.5      95% (19/20)     0.001000    [0.00100 .. 0.00410]
  0.65      55% (11/20)     0.006000    [0.00100 .. 0.103]
   0.8       5% (1/20)      0.05300    [0.0100 .. 0.347]
   0.9      10% (2/20)       0.3355    [0.0281 .. 0.729]
     1       0% (0/20)       0.5425    [0.0942 .. 1.00]
  false-positive rate at k = 1 (independent): 0% — same threshold, ALPHA.NOTE

── RSC · row-grouped · within-subject relabel ──
    k     detect           median p     p range (10th-90th)
     0       0% (0/20)        1.000    [1.00 .. 1.00]
   0.1       0% (0/20)        1.000    [0.354 .. 1.00]
   0.2       0% (0/20)       0.9190    [0.649 .. 1.00]
   0.3       0% (0/20)       0.9580    [0.759 .. 1.00]
   0.4       0% (0/20)       0.9545    [0.291 .. 1.00]
   0.5       0% (0/20)       0.8000    [0.366 .. 0.999]
  0.65       0% (0/20)       0.8865    [0.349 .. 0.998]
   0.8       0% (0/20)       0.9055    [0.697 .. 0.967]
   0.9       0% (0/20)       0.9230    [0.544 .. 1.00]
     1       0% (0/20)       0.9725    [0.730 .. 1.00]
  false-positive rate at k = 1 (independent): 0% — same threshold, ALPHA.NOTE


── resolved direction of the Stage-1 units, and how many flip between the nulls ──
   Counted over unit x dataset. Three Stage-1 units x one pair x the datasets at each k.

   column-grouped
    k     free: similar/different   paired: similar/different   units flipping (of 3 per dataset)
     0         59/1                   23/37                 36 of 60
   0.1         59/1                   24/36                 35 of 60
   0.2         60/0                   19/41                 41 of 60
   0.3         60/0                   18/42                 42 of 60
   0.4         60/0                   20/40                 40 of 60
   0.5         60/0                   19/41                 41 of 60
  0.65         59/1                   21/39                 38 of 60
   0.8         59/1                   18/42                 41 of 60
   0.9         59/1                   21/39                 38 of 60
     1         57/3                   22/38                 35 of 60

   row-grouped
    k     free: similar/different   paired: similar/different   units flipping (of 3 per dataset)
     0         59/1                   23/37                 36 of 60
   0.1         59/1                   24/36                 35 of 60
   0.2         60/0                   19/41                 41 of 60
   0.3         60/0                   18/42                 42 of 60
   0.4         60/0                   20/40                 40 of 60
   0.5         60/0                   19/41                 41 of 60
  0.65         59/1                   21/39                 38 of 60
   0.8         59/1                   18/42                 41 of 60
   0.9         59/1                   21/39                 38 of 60
     1         57/3                   22/38                 35 of 60


── generator sanity ──
   any detection anywhere on the grid: yes
```

## Generator diagnostics

```bash
node test/gen-copy-fidelity.mjs --out /tmp/copy-fidelity --reps 5
```

```
copy-fidelity sweep -> /tmp/copy-fidelity   10 k values x 5 seed(s) x 2 layouts

    k     rho    cell corr   subj corr   repl noise A/B   spread A/B
     0  1.0000   0.9909      0.9906     0.2468/0.2468    1.2092/1.2137
   0.1  0.9950   0.9855      0.9851     0.2468/0.2466    1.2092/1.2051
   0.2  0.9798   0.9702      0.9698     0.2468/0.2464    1.2092/1.1958
   0.3  0.9539   0.9440      0.9436     0.2468/0.2463    1.2092/1.1858
   0.4  0.9165   0.9055      0.9050     0.2468/0.2462    1.2092/1.1758
   0.5  0.8660   0.8525      0.8519     0.2468/0.2461    1.2092/1.1659
  0.65  0.7599   0.7386      0.7376     0.2468/0.2460    1.2092/1.1527
   0.8  0.6000   0.5636      0.5621     0.2468/0.2462    1.2092/1.1440
   0.9  0.4359   0.3834      0.3814     0.2468/0.2464    1.2092/1.1442
     1  0.0000   -0.0798      -0.0826     0.2468/0.2473    1.2092/1.1719

Written. Datasets are ephemeral — regenerate from (k, seed), do not commit them.
```
