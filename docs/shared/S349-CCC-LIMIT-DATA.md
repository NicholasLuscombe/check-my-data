# CCC Stage 1 — limiting adjusted p, paired null, pairing census (S349 data)

**Status:** S349. **Owner:** Code. **Tracked** — lives in `docs/shared/` and rides git.

**Purpose:** the recount source for S349. Raw rows only, so a reader can recount rather than re-run.
No conclusions here; Chat authors the interpretation.

**Nothing under `src/` changed.** `git status --porcelain -- src/` returned zero lines at every
checkpoint. `B` and the per-unit capture are load-time source rewrites in memory
(`test/probes/s349-ccc-hook.mjs`), the same mechanism as `s348-hash-hook.mjs`.

**Regenerate.** All runs are deterministic — the same command reproduces the same rows.

```bash
S349_B=9999 SWEEP=20 node --import ./test/probes/s348-hash-hook.mjs --import ./test/probes/s349-ccc-hook.mjs test/probes/probe-s349-ccc-limit.mjs
```

```bash
S349_B=499 SWEEP=20 FILES=09-proteomics-clean.csv node --import ./test/probes/s348-hash-hook.mjs --import ./test/probes/s349-ccc-hook.mjs test/probes/probe-s349-ccc-limit.mjs
```

```bash
node test/probes/probe-s349-paired-null.mjs
node test/probes/probe-s349-pairing-census.mjs
```

`p` columns are printed verbatim as JavaScript renders them, so `0.0048000000000000004` is the float
actually compared against `ALPHA.NOTE`, not a rounding of it.

Seeds are the same real one-unit-neighbour hashes S348 Part 5 used — `cells[(k * 7) % 2400]` of
`09-proteomics-clean.csv`, nudge up on even `k`. Run `k` here is run `k` there. Each neighbour matrix
was built, hashed, and discarded; no perturbed data was ever scored.

---

## 0. Structure read (S349 Part 1), for reference

- Stage 1 permutes **whole row-tuples**, not cells. Fisher–Yates over `permRow`
  (`crossConditionConsistency.js:456-461`); a tuple is one slice row carrying all its non-null cells.
  Held fixed: per-condition row counts, each row's values, each row's intra-row pairings.
- On `09-proteomics-clean` the Stage 1 BH family is `m = 3` — three properties on the single
  Vehicle-vs-Treatment pair: P1 Trimmed span, P2 Dispersion (MAD), P3 CDF shape (KS).
- All three read the identical sorted pooled array per condition, and one shuffle per permutation
  feeds all three. They share the data and the permutation realisation.
- `max(N_c) = 1200` (200 rows × 6 cells, zero blanks) → shipped `B = 499`.
- Raw doubled p: `p2 = min(1, 2 * min(pUpper, pLower))`, `pUpper = (1 + nUpper) / (B + 1)`.
  `flagFromP`: `p < 0.001 → HIGH`, `p < 0.01 → MODERATE`, else `LOW`. Strict `<`.
- `u.p2` never reaches the returned object (assigned once, consumed by the three `bhFDR` calls;
  `permDist` deleted). The per-unit raw p is unobservable from `runFullAnalysis` output — S349 Part 2a.

VST on both sweep files is **natural log**, no shift (`engine.js:283`):

| file | detectVST | reason |
|---|---|---|
| `09-proteomics-clean.csv` | log | slope=1.99, CI [1.94, 2.04] above 1 → inconclusive → assay fallback (proteomics) → log |
| `01-densitometry-clean.csv` | log | slope=0.05, CI [-0.33, 0.43] below 1 → inconclusive → assay fallback (densitometry) → log |

---

## 1. Part 3a parity gate — `B = 499`, 20 seeds, `09-proteomics-clean`

Run before the sweep to prove the hook's capture insert is inert. Every value reproduces S348 Part 5
seed-for-seed.

```
   i   seed               sev  CCC adjP             flag      | Stage-1 units (id raw-p2 -> adjP, dir)
    0  56403601:391d1413  0   0.018000000000000002 LOW       | P1 0.01200->0.01800 simi | P2 0.2480->0.2480 simi | P3 0.008000->0.01800 simi
    1  7b7145d7:bb777965  1   0.006                MODERATE  | P1 0.004000->0.006000 simi | P2 0.2520->0.2520 simi | P3 0.004000->0.006000 simi
    2  d21f830e:1f3a806e  1   0.006                MODERATE  | P1 0.004000->0.006000 simi | P2 0.2520->0.2520 simi | P3 0.004000->0.006000 simi
    3  2086d808:3d12a38c  0   0.012                LOW       | P1 0.01600->0.02400 simi | P2 0.2400->0.2400 simi | P3 0.004000->0.01200 simi
    4  6163d0d1:7bb75621  0   0.012                LOW       | P1 0.008000->0.01200 simi | P2 0.2040->0.2040 simi | P3 0.008000->0.01200 simi
    5  222bc948:89b3c94c  1   0.006                MODERATE  | P1 0.004000->0.006000 simi | P2 0.2520->0.2520 simi | P3 0.004000->0.006000 simi
    6  51bd0d33:6ea28089  0   0.012                LOW       | P1 0.01600->0.02400 simi | P2 0.2040->0.2040 simi | P3 0.004000->0.01200 simi
    7  16cb608f:3e2500c5  0   0.012                LOW       | P1 0.01600->0.02400 simi | P2 0.3160->0.3160 simi | P3 0.004000->0.01200 simi
    8  287f0b57:6c3c6b55  1   0.006                MODERATE  | P1 0.004000->0.006000 simi | P2 0.2560->0.2560 simi | P3 0.004000->0.006000 simi
    9  d97444bb:e92c77db  0   0.012                LOW       | P1 0.01200->0.01800 simi | P2 0.2000->0.2000 simi | P3 0.004000->0.01200 simi
   10  22f4da80:9516648e  0   0.012                LOW       | P1 0.01200->0.01800 simi | P2 0.2720->0.2720 simi | P3 0.004000->0.01200 simi
   11  d0467d7c:14514550  0   0.012                LOW       | P1 0.008000->0.01200 simi | P2 0.2400->0.2400 simi | P3 0.008000->0.01200 simi
   12  fceb18ea:c56a0306  0   0.012                LOW       | P1 0.008000->0.01200 simi | P2 0.2840->0.2840 simi | P3 0.004000->0.01200 simi
   13  5898ae5f:0a7eaad9  0   0.012                LOW       | P1 0.01200->0.01800 simi | P2 0.2040->0.2040 simi | P3 0.004000->0.01200 simi
   14  26b5805e:9b97d3f8  0   0.012                LOW       | P1 0.02000->0.03000 simi | P2 0.2400->0.2400 simi | P3 0.004000->0.01200 simi
   15  035965d5:425d6b0b  0   0.024                LOW       | P1 0.01600->0.02400 simi | P2 0.2160->0.2160 simi | P3 0.008000->0.02400 simi
   16  7e2f6c3e:67524210  0   0.012                LOW       | P1 0.008000->0.01200 simi | P2 0.1800->0.1800 simi | P3 0.008000->0.01200 simi
   17  e3f7dec3:b387a9af  0   0.012                LOW       | P1 0.008000->0.01200 simi | P2 0.2120->0.2120 simi | P3 0.004000->0.01200 simi
   18  71963bf5:4b23dc0b  0   0.012                LOW       | P1 0.01200->0.01800 simi | P2 0.2800->0.2800 simi | P3 0.004000->0.01200 simi
   19  62a9a24b:63676c19  1   0.006                MODERATE  | P1 0.004000->0.006000 simi | P2 0.2040->0.2040 simi | P3 0.004000->0.006000 simi

   adjusted-p grid (4 distinct): 0.006x5  0.012x13  0.018000000000000002x1  0.024x1
   observed spacing: min 0.006000  max 0.006000
   flagging at ALPHA.NOTE = 0.01: 5/20 = 25.0%  [95% Wilson 11.19-46.87%]
```

Comparison rows from `S348-SEED-SENSITIVITY-DATA.md` §4, same seeds: `0.018…, 0.006, 0.006, 0.012,
0.012, 0.006, 0.012, 0.012, 0.006, 0.012, 0.012, 0.012, 0.012, 0.012, 0.012, 0.024, 0.012, 0.012,
0.012, 0.006`. Identical, 20 of 20.

The 5/20 here is one 20-seed sample of the same process S348 measured at 93/500 = 18.6%; the two
intervals overlap and no comparison is claimed from it.

---

## 2. Part 3a sweep — `B = 9999`, 20 seeds per file

Cost measured before the sweep: **4.8 s per full run** on `09-proteomics-clean`, **1.0 s** on
`01-densitometry-clean`. Twenty seeds each is under two minutes. No count reduction was needed.

### 2.1 `09-proteomics-clean.csv` (400 × 6, proteomics)

```
   i   seed               sev  CCC adjP             flag      | Stage-1 units (id raw-p2 -> adjP, dir)
    0  56403601:391d1413  1   0.003                MODERATE  | P1 0.006800->0.01020 simi | P2 0.2094->0.2094 simi | P3 0.001000->0.003000 simi
    1  7b7145d7:bb777965  1   0.0036               MODERATE  | P1 0.006400->0.009600 simi | P2 0.2168->0.2168 simi | P3 0.001200->0.003600 simi
    2  d21f830e:1f3a806e  1   0.0042               MODERATE  | P1 0.006600->0.009900 simi | P2 0.2250->0.2250 simi | P3 0.001400->0.004200 simi
    3  2086d808:3d12a38c  1   0.0042               MODERATE  | P1 0.005400->0.008100 simi | P2 0.2200->0.2200 simi | P3 0.001400->0.004200 simi
    4  6163d0d1:7bb75621  1   0.003                MODERATE  | P1 0.006400->0.009600 simi | P2 0.2208->0.2208 simi | P3 0.001000->0.003000 simi
    5  222bc948:89b3c94c  1   0.0018               MODERATE  | P1 0.006400->0.009600 simi | P2 0.2230->0.2230 simi | P3 0.0006000->0.001800 simi
    6  51bd0d33:6ea28089  1   0.0012000000000000001 MODERATE | P1 0.006000->0.009000 simi | P2 0.2254->0.2254 simi | P3 0.0004000->0.001200 simi
    7  16cb608f:3e2500c5  1   0.0042               MODERATE  | P1 0.007400->0.01110 simi | P2 0.2378->0.2378 simi | P3 0.001400->0.004200 simi
    8  287f0b57:6c3c6b55  1   0.0042               MODERATE  | P1 0.005800->0.008700 simi | P2 0.2320->0.2320 simi | P3 0.001400->0.004200 simi
    9  d97444bb:e92c77db  1   0.003                MODERATE  | P1 0.006000->0.009000 simi | P2 0.2218->0.2218 simi | P3 0.001000->0.003000 simi
   10  22f4da80:9516648e  1   0.003                MODERATE  | P1 0.006600->0.009900 simi | P2 0.2222->0.2222 simi | P3 0.001000->0.003000 simi
   11  d0467d7c:14514550  1   0.0054               MODERATE  | P1 0.004400->0.006600 simi | P2 0.2266->0.2266 simi | P3 0.001800->0.005400 simi
   12  fceb18ea:c56a0306  1   0.0012000000000000001 MODERATE | P1 0.006800->0.01020 simi | P2 0.2196->0.2196 simi | P3 0.0004000->0.001200 simi
   13  5898ae5f:0a7eaad9  1   0.0054               MODERATE  | P1 0.006400->0.009600 simi | P2 0.2138->0.2138 simi | P3 0.001800->0.005400 simi
   14  26b5805e:9b97d3f8  1   0.0048000000000000004 MODERATE | P1 0.008600->0.01290 simi | P2 0.2152->0.2152 simi | P3 0.001600->0.004800 simi
   15  035965d5:425d6b0b  1   0.0036               MODERATE  | P1 0.006000->0.009000 simi | P2 0.2198->0.2198 simi | P3 0.001200->0.003600 simi
   16  7e2f6c3e:67524210  1   0.003                MODERATE  | P1 0.006000->0.009000 simi | P2 0.2158->0.2158 simi | P3 0.001000->0.003000 simi
   17  e3f7dec3:b387a9af  1   0.0042               MODERATE  | P1 0.007000->0.01050 simi | P2 0.2274->0.2274 simi | P3 0.001400->0.004200 simi
   18  71963bf5:4b23dc0b  1   0.0012000000000000001 MODERATE | P1 0.007600->0.01140 simi | P2 0.2220->0.2220 simi | P3 0.0004000->0.001200 simi
   19  62a9a24b:63676c19  1   0.0048000000000000004 MODERATE | P1 0.006000->0.009000 simi | P2 0.2198->0.2198 simi | P3 0.001600->0.004800 simi

   adjusted-p grid (7 distinct): 0.0012000000000000001x3  0.0018x1  0.003x5  0.0036x2  0.0042x5
                                 0.0048000000000000004x2  0.0054x2
   observed spacing: min 0.0006000  max 0.001200
   flagging at ALPHA.NOTE = 0.01: 20/20 = 100.0%  [95% Wilson 83.89-100.00%]
   min 0.00120000   median 0.00360000   max 0.00540000
```

All seven running units, all three stages, across the 20 seeds:

```
   S1 P1 Trimmed span (5–95%)   pair 0-1  dObs  0.00012099  nullMed    0.020743  p2 [0.004400 .. 0.008600] med 0.006400  adjP med 0.009600  dir {"similar":20}   forensic 20/20  gate-pass 20/20  CAN-FLAG 20/20
   S1 P2 Dispersion (MAD)       pair 0-1  dObs    0.013353  nullMed    0.065738  p2 [0.2094 .. 0.2378]     med 0.2213    adjP med 0.2213    dir {"similar":20}   forensic 20/20  gate-pass 20/20  CAN-FLAG 20/20
   S1 P3 CDF shape (KS)         pair 0-1  dObs    0.021667  nullMed    0.066667  p2 [0.0004000 .. 0.001800] med 0.001200 adjP med 0.003600  dir {"similar":20}   forensic 20/20  gate-pass 20/20  CAN-FLAG 20/20
   S2 P4 Residual SD            pair 0-1  dObs    0.021379  nullMed    0.040263  p2 [0.5442 .. 0.5688]     med 0.5568    adjP med 0.5568    dir {"similar":20}   forensic 20/20  gate-pass  0/20  CAN-FLAG  0/20
   S2 P5 Residual lag-1 AC      pair 0-1  dObs    0.055104  nullMed    0.029929  p2 [0.4124 .. 0.4416]     med 0.4254    adjP med 0.5568    dir {"different":20} forensic 20/20  gate-pass 20/20  CAN-FLAG 20/20
   S2 P6 Residual kurtosis      pair 0-1  dObs     0.98880  nullMed      2.7272  p2 [0.4862 .. 0.5134]     med 0.4972    adjP med 0.5568    dir {"similar":20}   forensic 20/20  gate-pass 20/20  CAN-FLAG 20/20
   S3 P9 Mean-variance slope    pair 0-1  dObs    0.080798  nullMed    0.035173  p2 [0.2232 .. 0.2480]     med 0.2380    adjP med 0.2380    dir {"different":20} forensic 20/20  gate-pass  0/20  CAN-FLAG  0/20
```

### 2.2 `01-densitometry-clean.csv` (35 × 12, densitometry)

```
   adjusted-p grid (11 distinct): 0.0162x1  0.018000000000000002x1  0.0198x1  0.028800000000000003x1
                                  0.0306x2  0.0342x3  0.036000000000000004x2  0.0378x3  0.0396x3
                                  0.0414x2  0.043199999999999995x1
   observed spacing: min 0.001800  max 0.009000
   flagging at ALPHA.NOTE = 0.01: 0/20 = 0.0%  [95% Wilson 0.00-16.11%]
   min 0.0162000   median 0.0360000   max 0.0432000
```

Three conditions → three pairs → nine Stage-1 units. Every one is `different`-direction, so every one
is non-forensic and none can contribute to the flag on any seed. The reported CCC p comes from
Stage 2, not Stage 1.

```
   S1 P1 Trimmed span (5–95%)   pair 0-1  dObs     0.47200  nullMed  0.22832  p2 [0.1692 .. 0.1920]      med 0.1771     adjP med 0.1992   dir {"different":20} forensic  0/20  CAN-FLAG  0/20
   S1 P1 Trimmed span (5–95%)   pair 0-2  dObs      1.1375  nullMed  0.22704  p2 [0.0002000 .. 0.0002000] med 0.0002000 adjP med 0.0004500 dir {"different":20} forensic  0/20  CAN-FLAG  0/20
   S1 P1 Trimmed span (5–95%)   pair 1-2  dObs     0.66549  nullMed  0.22777  p2 [0.02220 .. 0.02860]    med 0.02530    adjP med 0.03795  dir {"different":20} forensic  0/20  CAN-FLAG  0/20
   S1 P2 Dispersion (MAD)       pair 0-1  dObs     0.30818  nullMed  0.14762  p2 [0.3030 .. 0.3282]      med 0.3151     adjP med 0.3151   dir {"different":20} forensic  0/20  CAN-FLAG  0/20
   S1 P2 Dispersion (MAD)       pair 0-2  dObs     0.83285  nullMed  0.14704  p2 [0.0002000 .. 0.001000] med 0.0004000  adjP med 0.0007200 dir {"different":20} forensic  0/20  CAN-FLAG  0/20
   S1 P2 Dispersion (MAD)       pair 1-2  dObs     0.52467  nullMed  0.14724  p2 [0.02880 .. 0.03660]    med 0.03330    adjP med 0.04281  dir {"different":20} forensic  0/20  CAN-FLAG  0/20
   S1 P3 CDF shape (KS)         pair 0-1  dObs     0.75000  nullMed  0.14286  p2 [0.0002000 .. 0.0002000] med 0.0002000 adjP med 0.0004500 dir {"different":20} forensic  0/20  CAN-FLAG  0/20
   S1 P3 CDF shape (KS)         pair 0-2  dObs     0.96429  nullMed  0.14286  p2 [0.0002000 .. 0.0002000] med 0.0002000 adjP med 0.0004500 dir {"different":20} forensic  0/20  CAN-FLAG  0/20
   S1 P3 CDF shape (KS)         pair 1-2  dObs     0.52857  nullMed  0.14286  p2 [0.0002000 .. 0.0004000] med 0.0002000 adjP med 0.0004500 dir {"different":20} forensic  0/20  CAN-FLAG  0/20
   S2 P4 Residual SD            pair 0-1  dObs     0.11846  nullMed  0.065491 p2 [0.4260 .. 0.4672]      med 0.4491     adjP med 0.5774   dir {"different":20} forensic 20/20  CAN-FLAG 20/20
   S2 P4 Residual SD            pair 0-2  dObs   0.0066322  nullMed  0.065819 p2 [0.09940 .. 0.1172]     med 0.1068     adjP med 0.3204   dir {"similar":20}   forensic 20/20  CAN-FLAG 20/20
   S2 P4 Residual SD            pair 1-2  dObs     0.12509  nullMed  0.066130 p2 [0.3930 .. 0.4132]      med 0.4027     adjP med 0.5774   dir {"different":20} forensic 20/20  CAN-FLAG 20/20
   S2 P5 Residual lag-1 AC      pair 0-1  dObs   0.0020289  nullMed  0.094027 p2 [0.01820 .. 0.02680]    med 0.02340    adjP med 0.1053   dir {"similar":20}   forensic 20/20  CAN-FLAG 20/20
   S2 P5 Residual lag-1 AC      pair 0-2  dObs    0.089949  nullMed  0.093394 p2 [0.9456 .. 0.9862]      med 0.9692     adjP med 0.9692   dir {"similar":20}   forensic 20/20  CAN-FLAG  0/20
   S2 P5 Residual lag-1 AC      pair 1-2  dObs    0.087920  nullMed  0.093629 p2 [0.9310 .. 0.9580]      med 0.9461     adjP med 0.9692   dir {"similar":20}   forensic 20/20  CAN-FLAG  0/20
   S2 P6 Residual kurtosis      pair 0-1  dObs      1.6344  nullMed  0.37431  p2 [0.001800 .. 0.004800]  med 0.004000   adjP med 0.03600  dir {"different":20} forensic 20/20  CAN-FLAG 20/20
   S2 P6 Residual kurtosis      pair 0-2  dObs     0.94120  nullMed  0.37177  p2 [0.1496 .. 0.1706]      med 0.1564     adjP med 0.3519   dir {"different":20} forensic 20/20  CAN-FLAG 20/20
   S2 P6 Residual kurtosis      pair 1-2  dObs     0.69322  nullMed  0.37335  p2 [0.3958 .. 0.4228]      med 0.4051     adjP med 0.5774   dir {"different":20} forensic 20/20  CAN-FLAG 20/20
```

No Stage-3 unit runs on this file.

---

## 3. Part 3b — free vs within-pair null on `09-proteomics-clean`

Standalone probe, statistics re-implemented, engine test code not imported. Natural log, matching
`engine.js:283`. `B = 9999` per arm, local Mulberry32.

Observed-distance self-check against the engine's captured `dObs`:

```
   P1  probe  0.00012098783   engine   0.00012099   rel diff 1.79e-5  MATCH
   P2  probe    0.013352905   engine     0.013353   rel diff 7.13e-6  MATCH
   P3  probe    0.021666667   engine     0.021667   rel diff 1.54e-5  MATCH
```

Structural axis — identifiers landing one-per-pseudo-condition, out of 200:

| arm | mean split | observed assignment |
|---|---|---|
| free permutation | 100.4 | 200 |
| within-pair swap | 200.0 | 200 |

### 3.1 Seed 12345

```
── ARM 1 — free permutation (what the engine does) ──
   P1  dObs   0.000120988 | null med    0.0204634 mean 0.0242083 sd 0.01829 | 5-95% [0.001802, 0.05927]
       nLower    35/9999  percentile  0.350%  direction similar    doubled p = 0.0072000
   P2  dObs     0.0133529 | null med    0.0657428 mean 0.0770786 sd 0.05849 | 5-95% [0.005900, 0.1903]
       nLower  1162/9999  percentile 11.621%  direction similar    doubled p = 0.23260
   P3  dObs     0.0216667 | null med    0.0666667 mean 0.0710693 sd 0.02563 | 5-95% [0.03667, 0.1183]
       nLower     7/9999  percentile  0.070%  direction similar    doubled p = 0.0016000

── ARM 2 — within-pair swap-or-keep (matched-pair exchangeability) ──
   P1  dObs   0.000120988 | null med   0.00909015 mean 0.0102378 sd 0.007241 | 5-95% [0.0007593, 0.02351]
       nLower    63/9999  percentile  0.630%  direction similar    doubled p = 0.012800
   P2  dObs     0.0133529 | null med    0.0141046 mean 0.0167402 sd 0.01295 | 5-95% [0.001275, 0.04169]
       nLower  4736/9999  percentile 47.365%  direction similar    doubled p = 0.94740
   P3  dObs     0.0216667 | null med    0.0200000 mean 0.0204942 sd 0.003399 | 5-95% [0.01583, 0.02667]
       nLower  6788/9999  percentile 67.887%  direction different  doubled p = 0.73620
```

Validity gate — arm 1 against the engine's Part 3a doubled p (median over 20 seeds, `B = 9999`).
Band is 3 SE on the one-sided tail proportion at `B = 9999`, doubled.

```
   P1  probe  0.0072000   engine     0.0064   |diff| 0.000800   3-SE band 0.00354   AGREE
   P2  probe    0.23260   engine     0.2213   |diff|   0.0113   3-SE band  0.0192   AGREE
   P3  probe  0.0016000   engine     0.0012   |diff| 0.000400   3-SE band 0.00159   AGREE
```

### 3.2 Monte Carlo stability, three probe seeds

```
   seed    arm1 P1     arm1 P2     arm1 P3     arm2 P1     arm2 P2     arm2 P3
   12345   0.0072      0.2326      0.0016      0.0128      0.9474      0.7362
     999   0.0076      0.2132      0.0012      0.0114      0.9602      0.7540
    4242   0.0066      0.2162      0.0020      0.0130      0.9292      0.7492

   arm2 percentiles      P1 0.630% / 0.560% / 0.640%
                         P2 47.365% / 48.005% / 46.455%
                         P3 67.887% / 67.237% / 67.237%
```

### 3.3 BH step-up applied to each arm's raw p

Same `m = 3` step-up the driver runs, applied by hand to the arm's three raw doubled p values.

| arm | probe seed | raw p (P1, P2, P3) | Stage-1 adjusted p | `flagFromP` |
|---|---|---|---|---|
| free (arm 1) | 12345 | 0.0072, 0.2326, 0.0016 | 0.0048 | MODERATE |
| free (arm 1) | 999 | 0.0076, 0.2132, 0.0012 | 0.0036 | MODERATE |
| free (arm 1) | 4242 | 0.0066, 0.2162, 0.0020 | 0.0060 | MODERATE |
| within-pair (arm 2) | 12345 | 0.0128, 0.9474, 0.7362 | 0.0384 | LOW |
| within-pair (arm 2) | 999 | 0.0114, 0.9602, 0.7540 | 0.0342 | LOW |
| within-pair (arm 2) | 4242 | 0.0130, 0.9292, 0.7492 | 0.0390 | LOW |

Engine at `B = 9999` over 20 real seeds, for comparison: 0.0012 – 0.0054, median 0.0036, MODERATE on
20 of 20.

---

## 4. Part 3c — pairing census, eight clean fixtures

Condition structure from the engine's import chain. Identifier counts **counted from the fixture**.
Construction from the generator, function named per row.

| fixture | conditions | levels | identifier | paired? | counted | construction |
|---|---|---|---|---|---|---|
| `01-densitometry-clean` | column-grouped | 3 | `Residue` (row index) | structural | 35/35/35 of 35 | `gen_densitometry_clean:26` — shared deterministic `residue_fx = 0.2·sin(i·0.25) + 0.08·cos(i·0.9)`, identical across conditions; condition base `1.0 / 0.6 / 0.35`; reps `true_val ± 12% CV` |
| `03-qpcr-clean` | row-grouped | 2 (WT, KO) | `Target` | yes | 25/25 exactly once each | `gen_qpcr_clean:116` — shared realised `base_ct = U(14, 34)` per gene; KO `shift = U(-2, 3)`, WT `shift = 0`; reps `+ 0.35·randn` |
| `05-cellcount-clean` | none | 0 | `Position` | n/a | — | `gen_cellcount_clean:194` — no condition column; CCC returns N/A, Stage 1 never runs |
| `07-elisa-clean` | none | 0 | `Analyte` | n/a | — | `gen_elisa_clean:233` — no condition column; CCC returns N/A |
| `09-proteomics-clean` | row-grouped | 2 (Vehicle, Treatment) | `ProteinID` | yes | 200/200 exactly once each | `gen_proteomics_clean:311` — shared realised `base = 10^U(1.0, 3.5)`; Treatment `= base × fc`, `fc = clip(1 + 0.15·randn, 0.5, 2.0)`; reps `× exp(0.20·randn)` |
| `12a-uniform-mixture-clean` | row-grouped | 2 (CondA, CondB) | `sample_id` | **no** | 400 distinct, 0/400 in both | `gen_uniform_mixture_clean:522` — `base = exp(3.0 + 0.8·randn)` drawn **independently inside each condition's loop**; reps `× exp(0.18·randn)` |
| `17-densitometry-carlisle-clean` | column-grouped | 3 | `Feature` (row index) | structural | 60/60/60 of 60 | `gen_carlisle_clean:816` — shared realised `mu = 150 + rng·350`; Treatment_A/B `= mu × (0.6 + rng·0.8)` on ~30% of features, `= mu` on ~70%; `sd = 0.15·mu` |
| `vfs-a-pigeonhole-clear` | none | 0 | `id` | n/a | — | no generator in the repo; no condition column, CCC returns N/A |

**Provenance note on DS17, not a Part 3 question.** `generate-test-datasets.py` defines
`gen_carlisle_clean` twice, at `:816` and `:924`. Python keeps the second. The shipped fixture
(3 conditions × 6 reps, 60 features, `Condition` header row) matches the **first**, `:816`; the second
produces 2 conditions × 4 reps. The writer list at `:1273` also names the output
`17-carlisle-clean.csv`, while the file on disk is `17-densitometry-carlisle-clean.csv`. Re-running
the generator today would not reproduce the shipped DS17. Reported, not fixed.

### 4.1 Stage-1 units on the conditioned fixtures, `B = 9999`

`09` and `01` are the 20-seed sweep above. `03`, `12a` and `17` are 5 seeds each.

```
── 03-qpcr-clean.csv  —  0/5 flag, adjP 0.162 .. 0.191
   S1 P1 Trimmed span   pair 0-1  dObs 0.020963  nullMed 0.069869  p2 med 0.3322   dir similar
   S1 P2 Dispersion     pair 0-1  dObs 0.020834  nullMed 0.31221   p2 med 0.05600  dir similar
   S1 P3 CDF shape (KS) pair 0-1  dObs 0.13333   nullMed 0.20000   p2 med 0.2636   dir similar

── 12a-uniform-mixture-clean.csv  —  0/5 flag, adjP 0.524 .. 0.555
   S1 P1 Trimmed span   pair 0-1  dObs 0.041846  nullMed 0.051356  p2 med 0.8324   dir similar   gate-pass 0/5
   S1 P2 Dispersion     pair 0-1  dObs 0.014493  nullMed 0.069175  p2 med 0.2210   dir similar   gate-pass 5/5
   S1 P3 CDF shape (KS) pair 0-1  dObs 0.050833  nullMed 0.060833  p2 med 0.6394   dir similar   gate-pass 0/5

── 17-densitometry-carlisle-clean.csv  —  0/5 flag, adjP 0.581 .. 0.606
   S1 P1 Trimmed span   pair 0-1  dObs 0.13503   nullMed 0.063379  p2 med 0.2918   dir different
   S1 P1 Trimmed span   pair 0-2  dObs 0.11256   nullMed 0.063895  p2 med 0.4576   dir different
   S1 P1 Trimmed span   pair 1-2  dObs 0.022469  nullMed 0.064359  p2 med 0.3704   dir similar
   S1 P2 Dispersion     pair 0-1  dObs 0.090333  nullMed 0.10926   p2 med 0.8372   dir similar
   S1 P2 Dispersion     pair 0-2  dObs 0.13282   nullMed 0.10937   p2 med 0.8208   dir different
   S1 P2 Dispersion     pair 1-2  dObs 0.042489  nullMed 0.10911   p2 med 0.4138   dir similar
   S1 P3 CDF shape (KS) pair 0-1  dObs 0.061111  nullMed 0.097222  p2 med 0.2794   dir similar
   S1 P3 CDF shape (KS) pair 0-2  dObs 0.058333  nullMed 0.097222  p2 med 0.2368   dir similar
   S1 P3 CDF shape (KS) pair 1-2  dObs 0.050000  nullMed 0.097222  p2 med 0.1200   dir similar
```

### 4.2 Flagging behaviour on record

| fixture | conditioned | paired | non-clean rate | source | 95% Wilson upper |
|---|---|---|---|---|---|
| `09-proteomics-clean` | yes | yes | 93/500 = 18.60% | S348 §4 | 22.25% (interval 15.43–22.25%) |
| `01-densitometry-clean` | yes | structural | 0/500 = 0% | S348 §3 | 0.76% |
| `03-qpcr-clean` | yes | yes | 0/60 = 0% | S348 §2 | 6.02% |
| `12a-uniform-mixture-clean` | yes | no | 0/60 = 0% | S348 §2 | 6.02% |
| `17-densitometry-carlisle-clean` | yes | structural | 0/60 = 0% | S348 §2 | 6.02% |
| `05-cellcount-clean` | no | n/a | 0/60 = 0% | S348 §2 | 6.02% |
| `07-elisa-clean` | no | n/a | 0/60 = 0% | S348 §2 | 6.02% |
| `vfs-a-pigeonhole-clear` | no | n/a | 0/60 = 0% | S348 §2 | 6.02% |

Every zero above is a bound at the stated sample size, not an established negative. Three of the
eight (`05`, `07`, `vfs-a`) have no condition column at all, so CCC returns N/A and Stage 1 never
runs on them — their zeros are structural, not statistical.
