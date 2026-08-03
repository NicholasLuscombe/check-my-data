# Seed Sensitivity on Clean Fixtures — S348 per-seed data

**Status:** S348. **Owner:** Code. **Tracked** — lives in `docs/shared/` and rides git.

**Purpose:** the recount source for `docs/shared/S348-SEED-SENSITIVITY.md`. Every figure in that
document is derived from the rows below, so a reader can recount rather than re-run. The run
outputs themselves lived in a temporary scratchpad and are gone; this file and the committed probe
are what survive.

**Regenerate.** All runs are deterministic — the same command reproduces the same rows.

```bash
SEEDS_OUT=test/probes/out-s348-seeds.json node --import ./test/probes/s348-hash-hook.mjs test/probes/probe-s348-seed-sensitivity.mjs
```

```bash
SEEDS_IN=test/probes/out-s348-seeds.json MODE=fixtures node --import ./test/probes/s348-hash-hook.mjs test/probes/probe-s348-seed-sensitivity.mjs
```

```bash
MODE=sweep SEED_SOURCE=neighbours FILES=09-proteomics-clean.csv node --import ./test/probes/s348-hash-hook.mjs test/probes/probe-s348-seed-sensitivity.mjs
```

`p` columns are printed verbatim as JavaScript renders them, so `0.018000000000000002` is the
float actually compared against `ALPHA.NOTE`, not a rounding of it.

---

## 1. Part 2 — the 2x2 square on `09-proteomics-clean`, n = 60

Baseline: clean data at its own seed `1bd429d2:794ce92c`, severity 0, CCC p = 0.012 [LOW].

Pass A = perturbed data at its own derived seed. Pass B = clean data at that same seed.
Pass C = perturbed data at the base file's seed. `A!=B` and `A!=C` mark disagreements.

```
  k  cell            edit                seed              | A: perturbed @ own seed                | B: clean @ that seed                   | C: perturbed @ base seed
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------
   0  L2:c2           54.79->54.80        56403601:391d1413 | sev 0 CCC p=0.018000000000000002   LOW      | sev 0 CCC p=0.018000000000000002   LOW      | sev 0 CCC p=0.012                  LOW     
   1  L8:c7           42.91->42.90        4bf03620:316a76fc | sev 0 CCC p=0.024                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
   2  L15:c6          22.92->22.93        9725e72b:376cbdcf | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
   3  L22:c5          128.16->128.15      b80b4e8c:89a46076 | sev 0 CCC p=0.018000000000000002   LOW      | sev 0 CCC p=0.018000000000000002   LOW      | sev 0 CCC p=0.012                  LOW     
   4  L29:c4          47.32->47.33        4d42f251:4e9c97c3 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
   5  L36:c3          455.70->455.69      1a5b0181:d279d7b9 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
   6  L43:c2          291.35->291.36      de515917:39c10e43 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
   7  L49:c7          1170.32->1170.31    615abc90:9c76a30e | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
   8  L56:c6          23.83->23.84        cf5ee131:7cde5493 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
   9  L63:c5          282.18->282.17      ac5c2d29:93526621 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  10  L70:c4          177.90->177.91      a41078cc:efa1bc46 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  11  L77:c3          333.37->333.36      6cc3bf89:6a0c7621 | sev 0 CCC p=0.018000000000000002   LOW      | sev 0 CCC p=0.018000000000000002   LOW      | sev 0 CCC p=0.012                  LOW     
  12  L84:c2          113.15->113.16      77e286c6:a8620ba0 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  13  L90:c7          2390.47->2390.46    38a73e0b:9d2af62f | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  14  L97:c6          71.09->71.10        6b71eec6:2a914418 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  15  L104:c5         3104.33->3104.32    765b8d2a:4825e7e6 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  16  L111:c4         30.85->30.86        ccd78883:36a64ba3 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  17  L118:c3         1182.09->1182.08    7b73b79a:c1f2997a | sev 1 CCC p=0.006                  MODERATE | sev 1 CCC p=0.006                  MODERATE | sev 0 CCC p=0.012                  LOW       <-- A!=C
  18  L125:c2         844.89->844.90      a7d17017:ec48cde7 | sev 0 CCC p=0.024                  LOW      | sev 0 CCC p=0.024                  LOW      | sev 0 CCC p=0.012                  LOW     
  19  L131:c7         82.04->82.03        c466c09d:22a4e32d | sev 0 CCC p=0.036000000000000004   LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  20  L138:c6         2118.93->2118.94    7f244675:47b8424d | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  21  L145:c5         17.11->17.10        692c558b:57c15373 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  22  L152:c4         65.30->65.31        6105347d:6465d903 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  23  L159:c3         1480.05->1480.04    1331e754:6ae6dd3c | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  24  L166:c2         110.67->110.68      bd8ed465:a171aad3 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  25  L172:c7         38.15->38.14        e6572c64:78038c6e | sev 0 CCC p=0.012                  LOW      | sev 1 CCC p=0.006                  MODERATE | sev 0 CCC p=0.012                  LOW       <-- A!=B
  26  L179:c6         1375.39->1375.40    195ae63d:7bc5fcbf | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  27  L186:c5         1966.75->1966.74    078ba048:02f2297c | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  28  L193:c4         9.97->9.98          e5f0642e:5a9b9356 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  29  L200:c3         209.63->209.62      d808f167:45ea1703 | sev 0 CCC p=0.024                  LOW      | sev 0 CCC p=0.024                  LOW      | sev 0 CCC p=0.012                  LOW     
  30  L207:c2         135.99->136.00      c997763c:fd677fc2 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  31  L213:c7         185.48->185.47      3499c395:f0dc69f7 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  32  L220:c6         20.40->20.41        02145ad8:07e2b834 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  33  L227:c5         54.64->54.63        bfe70fad:8f7b1e73 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  34  L234:c4         230.68->230.69      8aed3650:407a6662 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  35  L241:c3         228.96->228.95      0141103d:94bea9b7 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  36  L248:c2         637.23->637.24      6edce610:610e059e | sev 1 CCC p=0.006                  MODERATE | sev 1 CCC p=0.006                  MODERATE | sev 0 CCC p=0.012                  LOW       <-- A!=C
  37  L254:c7         42.21->42.20        8a571207:98f4e7b7 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  38  L261:c6         113.41->113.42      4c3fe74b:664313fd | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  39  L268:c5         9.91->9.90          6245113c:478e8590 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  40  L275:c4         1874.38->1874.39    d532d68f:afaa37b5 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  41  L282:c3         1739.80->1739.79    2ab8822c:8ff16614 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  42  L289:c2         47.27->47.28        f4aa08f5:4145f5e7 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  43  L295:c7         261.57->261.56      fd4fb1b1:c9bfbc35 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.024                  LOW     
  44  L302:c6         2288.63->2288.64    fc94a7c6:119ea962 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  45  L309:c5         46.06->46.05        958f7cec:d288dca2 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  46  L316:c4         89.78->89.79        19d097a7:febe8a9d | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  47  L323:c3         2189.19->2189.18    32ba69e1:e199ac05 | sev 0 CCC p=0.024                  LOW      | sev 0 CCC p=0.024                  LOW      | sev 0 CCC p=0.012                  LOW     
  48  L330:c2         3075.43->3075.44    830311cd:af51482d | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  49  L336:c7         28.07->28.06        528ae5df:8a7093c1 | sev 0 CCC p=0.024                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  50  L343:c6         40.16->40.17        31612414:08e11bee | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  51  L350:c5         427.09->427.08      f3bbffc7:42c9535f | sev 0 CCC p=0.018000000000000002   LOW      | sev 0 CCC p=0.018000000000000002   LOW      | sev 0 CCC p=0.012                  LOW     
  52  L357:c4         209.75->209.76      6f11721d:ded093f5 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  53  L364:c3         145.97->145.96      d27f2ba4:36998ce6 | sev 1 CCC p=0.006                  MODERATE | sev 1 CCC p=0.006                  MODERATE | sev 0 CCC p=0.012                  LOW       <-- A!=C
  54  L371:c2         703.90->703.91      73ed1c08:34c7579a | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  55  L377:c7         60.03->60.02        58e58172:c19e4da0 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.024                  LOW     
  56  L384:c6         512.38->512.39      503359c0:04988bd2 | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW      | sev 0 CCC p=0.012                  LOW     
  57  L391:c5         63.17->63.16        44166000:ab89642e | sev 1 CCC p=0.006                  MODERATE | sev 1 CCC p=0.006                  MODERATE | sev 0 CCC p=0.012                  LOW       <-- A!=C
  58  L398:c4         958.88->958.89      32038dc8:34c6fa62 | sev 1 CCC p=0.006                  MODERATE | sev 1 CCC p=0.006                  MODERATE | sev 0 CCC p=0.012                  LOW       <-- A!=C
  59  L5:c3           16.11->16.10        7362c5af:7726d1db | sev 1 CCC p=0.006                  MODERATE | sev 1 CCC p=0.006                  MODERATE | sev 0 CCC p=0.012                  LOW       <-- A!=C
```

---

## 2. Part 3 — eight clean fixtures at the same 60 neighbour-derived seeds

Per-fixture grid counts and the fixture's own shipped draw. Full per-seed rows are reproducible
with the `MODE=fixtures` command above.

```
── 01-densitometry-clean.csv  (35 x 12, densitometry) ──
   0/60 non-clean at the 60 foreign seeds = 0.0%   33.8s
   own (shipped) seed 687831bc:f6272092: severity 0 "All checks passed"  CCC p=0.036000000000000004 [LOW]  firing: —
   CCC primaryP grid over the 60: 7 distinct — 0.018000000000000002x11  0.036000000000000004x15  0.054x14  0.063x3  0.07200000000000001x11  0.09x5  0.108x1
── 03-qpcr-clean.csv  (50 x 3, qpcr) ──
   0/60 non-clean at the 60 foreign seeds = 0.0%   15.4s
   own (shipped) seed abf6a307:3e680d91: severity 0 "All checks passed"  CCC p=0.168 [LOW]  firing: —
   CCC primaryP grid over the 60: 25 distinct — 0.10799999999999998x1  0.11399999999999999x1  0.12x2  0.126x1  0.132x4  0.14400000000000002x5  0.15000000000000002x1  0.156x5  0.16x1  0.162x2  0.168x5  0.172x2  0.17400000000000002x4  0.176x2  0.18x3  0.186x6  0.192x1  0.196x1  0.198x2  0.2x1  0.204x2  0.20400000000000001x2  0.21000000000000002x3  0.21599999999999997x2  0.22199999999999998x1
── 05-cellcount-clean.csv  (55 x 4, cell_count) ──
   0/60 non-clean at the 60 foreign seeds = 0.0%   15.5s
   own (shipped) seed 2bfa7699:0ad6514b: severity 0 "All checks passed"  CCC p=undefined [N/A]  firing: —
   CCC primaryP grid over the 60: 1 distinct — undefinedx60
── 07-elisa-clean.csv  (65 x 3, elisa) ──
   0/60 non-clean at the 60 foreign seeds = 0.0%   25.8s
   own (shipped) seed cb1aea3b:656db58d: severity 0 "All checks passed"  CCC p=undefined [N/A]  firing: —
   CCC primaryP grid over the 60: 1 distinct — undefinedx60
── 09-proteomics-clean.csv  (400 x 6, proteomics) ──
   7/60 non-clean at the 60 foreign seeds = 11.7%   169.7s
   own (shipped) seed 1bd429d2:794ce92c: severity 0 "All checks passed"  CCC p=0.012 [LOW]  firing: —
   CCC primaryP grid over the 60: 4 distinct — 0.006x7  0.012x46  0.018000000000000002x4  0.024x3
── 12a-uniform-mixture-clean.csv  (400 x 6, general) ──
   0/60 non-clean at the 60 foreign seeds = 0.0%   114.1s
   own (shipped) seed 1bd0d70f:4aca101b: severity 0 "All checks passed"  CCC p=0.516 [LOW]  firing: —
   CCC primaryP grid over the 60: 31 distinct — 0.468x1  0.472x2  0.484x3  0.492x2  0.496x1  0.5x4  0.504x1  0.508x2  0.512x1  0.516x2  0.52x2  0.524x1  0.528x3  0.532x3  0.536x4  0.544x2  0.552x1  0.556x1  0.56x2  0.564x3  0.5640000000000001x1  0.568x3  0.576x3  0.584x5  0.588x1  0.592x1  0.596x1  0.604x1  0.612x1  0.616x1  0.64x1
── 17-densitometry-carlisle-clean.csv  (60 x 18, densitometry) ──
   0/60 non-clean at the 60 foreign seeds = 0.0%   86.9s
   own (shipped) seed aede95c0:aa51819a: severity 0 "All checks passed"  CCC p=0.5991428571428571 [LOW]  firing: —
   CCC primaryP grid over the 60: 40 distinct — 0.5348571428571428x1  0.5374285714285715x1  0.5477142857142857x2  0.5502857142857143x1  0.555x1  0.5605714285714286x2  0.5631428571428572x1  0.5657142857142857x1  0.57x2  0.5708571428571428x3  0.5730000000000001x2  0.576x5  0.5785714285714285x1  0.5811428571428572x2  0.582x2  0.5831999999999999x1  0.5837142857142857x1  0.5850000000000001x1  0.5862857142857143x1  0.5868x1  0.588x1  0.5888571428571429x1  0.5914285714285715x1  0.594x4  0.5940000000000001x1  0.5965714285714286x3  0.5991428571428571x2  0.6x2  0.6012000000000001x1  0.6030000000000001x1  0.6075x1  0.612x1  0.6145714285714285x1  0.6171428571428572x1  0.6197142857142858x1  0.621x2  0.63x1  0.636x1  0.6479999999999999x1  0.648x1
── vfs-a-pigeonhole-clear.csv  (180 x 2, general) ──
   0/60 non-clean at the 60 foreign seeds = 0.0%   17.2s
   own (shipped) seed ed8a15b3:109e9249: severity 0 "All checks passed"  CCC p=undefined [N/A]  firing: —
   CCC primaryP grid over the 60: 1 distinct — undefinedx60
```

---

## 3. Part 4 — 500 constructed seeds

```
── 09-proteomics-clean.csv  (400 x 6, proteomics) ──
   own (shipped) seed 1bd429d2:794ce92c: severity 0 "All checks passed"  CCC p=0.012 [LOW]
   non-clean:                81/500 = 16.20%  [95% Wilson 13.23-19.69%]
   CCC p < ALPHA.NOTE:       81/500 = 16.20%  [95% Wilson 13.23-19.69%]
   CCC primaryP grid: 5 distinct — 0.006x81  0.012x363  0.018000000000000002x31  0.024x24  0.036000000000000004x1
── 01-densitometry-clean.csv  (35 x 12, densitometry) ──
   own (shipped) seed 687831bc:f6272092: severity 0 "All checks passed"  CCC p=0.036000000000000004 [LOW]
   non-clean:                 0/500 = 0.00%  [95% Wilson 0.00-0.76%]
   CCC p < ALPHA.NOTE:        0/500 = 0.00%  [95% Wilson 0.00-0.76%]
   CCC primaryP grid: 11 distinct — 0.018000000000000002x83  0.036000000000000004x138  0.045x4  0.054x147  0.063x1  0.07200000000000001x74  0.08099999999999999x5  0.09x33  0.09899999999999999x1  0.108x13  0.11699999999999999x1
```

---

## 4. Part 5 — 500 real neighbour-derived seeds on `09-proteomics-clean`

**The reported rate: 93/500 = 18.60% non-clean, 95% Wilson 15.43-22.25%.**

Seeds derived from `cells[(k * 7) % 2400]`, k = 0..499, nudged up on even k and down on odd k.
Each neighbour matrix was hashed through `validateMatrix` + `createPRNGFactory` and discarded;
only the `{h1, h2}` pairs entered the runs, so no perturbed data was ever scored.

Grid: `0.006 x 93`, `0.012 x 353`, `0.018000000000000002 x 29`, `0.024 x 25`.
No test other than Cross-Condition Consistency reached MODERATE or HIGH in any of the 500 runs.

```
     i=  0  seed 56403601:391d1413  sev 0  CCC p=0.018000000000000002   LOW       —
     i=  1  seed 7b7145d7:bb777965  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=  2  seed d21f830e:1f3a806e  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=  3  seed 2086d808:3d12a38c  sev 0  CCC p=0.012                  LOW       —
     i=  4  seed 6163d0d1:7bb75621  sev 0  CCC p=0.012                  LOW       —
     i=  5  seed 222bc948:89b3c94c  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=  6  seed 51bd0d33:6ea28089  sev 0  CCC p=0.012                  LOW       —
     i=  7  seed 16cb608f:3e2500c5  sev 0  CCC p=0.012                  LOW       —
     i=  8  seed 287f0b57:6c3c6b55  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=  9  seed d97444bb:e92c77db  sev 0  CCC p=0.012                  LOW       —
     i= 10  seed 22f4da80:9516648e  sev 0  CCC p=0.012                  LOW       —
     i= 11  seed d0467d7c:14514550  sev 0  CCC p=0.012                  LOW       —
     i= 12  seed fceb18ea:c56a0306  sev 0  CCC p=0.012                  LOW       —
     i= 13  seed 5898ae5f:0a7eaad9  sev 0  CCC p=0.012                  LOW       —
     i= 14  seed 26b5805e:9b97d3f8  sev 0  CCC p=0.012                  LOW       —
     i= 15  seed 035965d5:425d6b0b  sev 0  CCC p=0.024                  LOW       —
     i= 16  seed 7e2f6c3e:67524210  sev 0  CCC p=0.012                  LOW       —
     i= 17  seed e3f7dec3:b387a9af  sev 0  CCC p=0.012                  LOW       —
     i= 18  seed 71963bf5:4b23dc0b  sev 0  CCC p=0.012                  LOW       —
     i= 19  seed 62a9a24b:63676c19  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 20  seed 596fb79e:435f2e9e  sev 0  CCC p=0.012                  LOW       —
     i= 21  seed 8ed90696:0a486ac0  sev 0  CCC p=0.012                  LOW       —
     i= 22  seed 48d25109:7ad20679  sev 0  CCC p=0.024                  LOW       —
     i= 23  seed 0e973d65:dc42a779  sev 0  CCC p=0.012                  LOW       —
     i= 24  seed aa96fbd8:14230774  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 25  seed b9aa6ef8:3a353744  sev 0  CCC p=0.018000000000000002   LOW       —
     i= 26  seed 9edbe86d:1cee39eb  sev 0  CCC p=0.012                  LOW       —
     i= 27  seed ca0f23ba:2ece1066  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 28  seed 0e7da33c:fa1c2fac  sev 0  CCC p=0.012                  LOW       —
     i= 29  seed ae78743b:8a8b96fd  sev 0  CCC p=0.012                  LOW       —
     i= 30  seed 0d5dd011:78d72e15  sev 0  CCC p=0.012                  LOW       —
     i= 31  seed f8307ab8:f56b1a0e  sev 0  CCC p=0.012                  LOW       —
     i= 32  seed 33641ff8:912010ce  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 33  seed 386dd930:77223688  sev 0  CCC p=0.012                  LOW       —
     i= 34  seed 7bd1ce1b:0dfe590f  sev 0  CCC p=0.018000000000000002   LOW       —
     i= 35  seed cccf47dd:302a9613  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 36  seed d76044e3:9cc778a9  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 37  seed 13ea3f65:14b3e10d  sev 0  CCC p=0.018000000000000002   LOW       —
     i= 38  seed 74ca2550:061d3f46  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 39  seed d3be9910:09393116  sev 0  CCC p=0.012                  LOW       —
     i= 40  seed 266b75e3:c8de2ed5  sev 0  CCC p=0.012                  LOW       —
     i= 41  seed 615abc90:9c76a30e  sev 0  CCC p=0.012                  LOW       —
     i= 42  seed 5be85819:b2f4dc29  sev 0  CCC p=0.012                  LOW       —
     i= 43  seed a04ecfac:5e27a1e0  sev 0  CCC p=0.012                  LOW       —
     i= 44  seed ba585950:14ea4064  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 45  seed 047c2cc1:5a939c6b  sev 0  CCC p=0.018000000000000002   LOW       —
     i= 46  seed ecab86bb:5b0e0dad  sev 0  CCC p=0.012                  LOW       —
     i= 47  seed e4457672:6b9bfca0  sev 0  CCC p=0.012                  LOW       —
     i= 48  seed 3a3a21d0:b3418912  sev 0  CCC p=0.024                  LOW       —
     i= 49  seed 7b8c7805:02bcabe7  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 50  seed b40de503:0a8153e7  sev 0  CCC p=0.012                  LOW       —
     i= 51  seed d3d0bcb7:f2b37269  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 52  seed 9ff1182b:9fc1c6f1  sev 0  CCC p=0.012                  LOW       —
     i= 53  seed 99cb7731:b0bbce95  sev 0  CCC p=0.012                  LOW       —
     i= 54  seed e9486782:0d581e4a  sev 0  CCC p=0.012                  LOW       —
     i= 55  seed c94b5b63:7e8544db  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 56  seed 7049a678:abfead52  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 57  seed 78eb0504:eecf3204  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 58  seed fb8f4664:2eb3cb50  sev 0  CCC p=0.012                  LOW       —
     i= 59  seed 6cb12393:13619b85  sev 0  CCC p=0.024                  LOW       —
     i= 60  seed a0805cb7:29e7e357  sev 0  CCC p=0.012                  LOW       —
     i= 61  seed c54209a4:1697529a  sev 0  CCC p=0.012                  LOW       —
     i= 62  seed 0e1baf1b:5a9cf497  sev 0  CCC p=0.012                  LOW       —
     i= 63  seed fa628cd1:86293425  sev 0  CCC p=0.024                  LOW       —
     i= 64  seed 3f4a2324:16bca71c  sev 0  CCC p=0.012                  LOW       —
     i= 65  seed ad161aa6:6a60c8be  sev 0  CCC p=0.012                  LOW       —
     i= 66  seed 98c724dc:d334f23c  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 67  seed 74628039:e90fb845  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 68  seed 380b7f3d:c2c8c039  sev 0  CCC p=0.012                  LOW       —
     i= 69  seed 29d65878:19ef83ba  sev 0  CCC p=0.012                  LOW       —
     i= 70  seed 8fc5f29b:94cff8fd  sev 0  CCC p=0.012                  LOW       —
     i= 71  seed 1ee84ad0:7cba6e3e  sev 0  CCC p=0.012                  LOW       —
     i= 72  seed 14bb7c42:ed96e952  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 73  seed 536d4053:5b28195d  sev 0  CCC p=0.012                  LOW       —
     i= 74  seed b1db5028:f24d3052  sev 0  CCC p=0.012                  LOW       —
     i= 75  seed 270a18f7:e26cf873  sev 0  CCC p=0.012                  LOW       —
     i= 76  seed dc16fbf7:c0936c1f  sev 0  CCC p=0.012                  LOW       —
     i= 77  seed a8775cb0:df022e8e  sev 0  CCC p=0.012                  LOW       —
     i= 78  seed 386742e0:56308d5e  sev 0  CCC p=0.012                  LOW       —
     i= 79  seed 175a8d31:5b9ff7ef  sev 0  CCC p=0.012                  LOW       —
     i= 80  seed a0940ca1:df833d1b  sev 0  CCC p=0.012                  LOW       —
     i= 81  seed 540a8d26:36bc2aa8  sev 0  CCC p=0.012                  LOW       —
     i= 82  seed 6b71eec6:2a914418  sev 0  CCC p=0.012                  LOW       —
     i= 83  seed 0f709788:df9e1ff2  sev 0  CCC p=0.012                  LOW       —
     i= 84  seed a06b64fc:001d801e  sev 0  CCC p=0.012                  LOW       —
     i= 85  seed 543aa486:8ee97882  sev 0  CCC p=0.012                  LOW       —
     i= 86  seed 24f239f9:32cc0a67  sev 0  CCC p=0.012                  LOW       —
     i= 87  seed 10285eab:1eb94239  sev 0  CCC p=0.012                  LOW       —
     i= 88  seed d89dbde8:43918300  sev 0  CCC p=0.012                  LOW       —
     i= 89  seed a8997f6a:550105a6  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 90  seed 11a32241:9515aea1  sev 0  CCC p=0.018000000000000002   LOW       —
     i= 91  seed 318689d3:ada96c75  sev 0  CCC p=0.012                  LOW       —
     i= 92  seed 76b70fa6:7896f27a  sev 0  CCC p=0.012                  LOW       —
     i= 93  seed 64bdaf85:9fd6dd83  sev 0  CCC p=0.012                  LOW       —
     i= 94  seed 6efe3b16:46d2a6b6  sev 0  CCC p=0.012                  LOW       —
     i= 95  seed b7d91f21:9d7fc297  sev 0  CCC p=0.012                  LOW       —
     i= 96  seed 0944bd2c:ad0767fe  sev 0  CCC p=0.012                  LOW       —
     i= 97  seed 897fb2ae:fca90b06  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 98  seed b3a45d55:073cb025  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i= 99  seed c95a30bb:2e5a740b  sev 0  CCC p=0.012                  LOW       —
     i=100  seed 4c6f810e:da9daf6e  sev 0  CCC p=0.012                  LOW       —
     i=101  seed 349c3a1a:9a7ae078  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=102  seed d7ae80c8:acd9f610  sev 0  CCC p=0.012                  LOW       —
     i=103  seed f0dc820f:ec30367d  sev 0  CCC p=0.012                  LOW       —
     i=104  seed d285b124:dfafc4aa  sev 0  CCC p=0.012                  LOW       —
     i=105  seed 365c3e57:eb2af2af  sev 0  CCC p=0.018000000000000002   LOW       —
     i=106  seed c2bc12ef:3ec065cd  sev 0  CCC p=0.012                  LOW       —
     i=107  seed 52ec4f8e:3987a7a8  sev 0  CCC p=0.012                  LOW       —
     i=108  seed 0f9c3d42:72b7746a  sev 0  CCC p=0.012                  LOW       —
     i=109  seed 5a88546d:b9885b8f  sev 0  CCC p=0.012                  LOW       —
     i=110  seed 22548767:2668bb8b  sev 0  CCC p=0.012                  LOW       —
     i=111  seed 497dbcd3:e0b4e0bd  sev 0  CCC p=0.012                  LOW       —
     i=112  seed cac74f64:7d6345ee  sev 0  CCC p=0.012                  LOW       —
     i=113  seed cb8eaafb:cf67b5eb  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=114  seed 78f7f72d:61b9d53b  sev 0  CCC p=0.024                  LOW       —
     i=115  seed ce05b388:891176dc  sev 0  CCC p=0.018000000000000002   LOW       —
     i=116  seed 700fd0f6:ae3cb7ea  sev 0  CCC p=0.012                  LOW       —
     i=117  seed 5b163d9d:4129cdd5  sev 0  CCC p=0.012                  LOW       —
     i=118  seed f342e99d:bcb7b88d  sev 0  CCC p=0.012                  LOW       —
     i=119  seed dd961fab:8266c109  sev 0  CCC p=0.012                  LOW       —
     i=120  seed c5d00b47:88abc7bd  sev 0  CCC p=0.012                  LOW       —
     i=121  seed 87e2697e:c9d20d88  sev 0  CCC p=0.018000000000000002   LOW       —
     i=122  seed bd476290:5759614c  sev 0  CCC p=0.012                  LOW       —
     i=123  seed 692c558b:57c15373  sev 0  CCC p=0.012                  LOW       —
     i=124  seed e0e2c231:9dd81dd1  sev 0  CCC p=0.024                  LOW       —
     i=125  seed b5d9bfd1:e9a1de3f  sev 0  CCC p=0.012                  LOW       —
     i=126  seed 47318933:af87fe3f  sev 0  CCC p=0.024                  LOW       —
     i=127  seed 8a003c45:2290a72f  sev 0  CCC p=0.012                  LOW       —
     i=128  seed 6c67553c:d3eb3532  sev 0  CCC p=0.012                  LOW       —
     i=129  seed 79d0328b:1f7bcac1  sev 0  CCC p=0.012                  LOW       —
     i=130  seed 7c3269fd:80de461f  sev 0  CCC p=0.012                  LOW       —
     i=131  seed e936f706:68075c44  sev 0  CCC p=0.012                  LOW       —
     i=132  seed ecd3ed9f:d614e20b  sev 0  CCC p=0.012                  LOW       —
     i=133  seed 7f638c0d:4984ee19  sev 0  CCC p=0.012                  LOW       —
     i=134  seed 24216e93:1f8a87c3  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=135  seed f1a6467f:7b34723d  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=136  seed 1a713ebe:8e290cf8  sev 0  CCC p=0.012                  LOW       —
     i=137  seed b437c4fd:a0a9598b  sev 0  CCC p=0.012                  LOW       —
     i=138  seed a6d7db04:ea8d5322  sev 0  CCC p=0.012                  LOW       —
     i=139  seed 0865314c:d269b4ea  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=140  seed e9fbdfc5:044a99c7  sev 0  CCC p=0.012                  LOW       —
     i=141  seed 145ce688:27de7212  sev 0  CCC p=0.012                  LOW       —
     i=142  seed fc80f41d:da6b6ddb  sev 0  CCC p=0.012                  LOW       —
     i=143  seed 1ddb0d8c:0f2b4ace  sev 0  CCC p=0.012                  LOW       —
     i=144  seed 0f97bf0f:34f2e435  sev 0  CCC p=0.012                  LOW       —
     i=145  seed 52b1657e:1ad4e476  sev 0  CCC p=0.012                  LOW       —
     i=146  seed 73263a1f:482aca09  sev 0  CCC p=0.012                  LOW       —
     i=147  seed 28260484:b28c98e2  sev 0  CCC p=0.012                  LOW       —
     i=148  seed b0ebc15e:1cbab26a  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=149  seed e42c94fa:609ba4fc  sev 0  CCC p=0.012                  LOW       —
     i=150  seed e17c8198:d99ecdd6  sev 0  CCC p=0.012                  LOW       —
     i=151  seed 5e998425:56b851fb  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=152  seed c2bf9847:d81e8101  sev 0  CCC p=0.012                  LOW       —
     i=153  seed 34414b21:db23a307  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=154  seed 65b86899:46d5198b  sev 0  CCC p=0.012                  LOW       —
     i=155  seed b514822c:aa505f5e  sev 0  CCC p=0.012                  LOW       —
     i=156  seed 21d0eb19:2f454d91  sev 0  CCC p=0.012                  LOW       —
     i=157  seed 95296d15:c59db015  sev 0  CCC p=0.012                  LOW       —
     i=158  seed 9ccd0b1c:6027551a  sev 0  CCC p=0.012                  LOW       —
     i=159  seed f1e82a19:82206d43  sev 0  CCC p=0.012                  LOW       —
     i=160  seed f77ffa01:2a384561  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=161  seed 5337f0cd:971ffdd7  sev 0  CCC p=0.018000000000000002   LOW       —
     i=162  seed 155aa2e7:64814961  sev 0  CCC p=0.012                  LOW       —
     i=163  seed bf390b3a:693ae328  sev 0  CCC p=0.012                  LOW       —
     i=164  seed e5f0642e:5a9b9356  sev 0  CCC p=0.012                  LOW       —
     i=165  seed 9fef7d13:84e8daeb  sev 0  CCC p=0.012                  LOW       —
     i=166  seed e0268659:9c861781  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=167  seed 628fba47:e31d1413  sev 0  CCC p=0.012                  LOW       —
     i=168  seed 68761656:8952caf2  sev 0  CCC p=0.012                  LOW       —
     i=169  seed 6e7815d6:62986416  sev 0  CCC p=0.012                  LOW       —
     i=170  seed d1a1ea31:56f06ead  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=171  seed 3b7b3b7b:1a2c148b  sev 0  CCC p=0.012                  LOW       —
     i=172  seed 413995bc:0153c512  sev 0  CCC p=0.012                  LOW       —
     i=173  seed 54bb4c0a:12f89dc8  sev 0  CCC p=0.012                  LOW       —
     i=174  seed 2769d8f0:5cc95354  sev 0  CCC p=0.012                  LOW       —
     i=175  seed 10abb6d1:85c4d2af  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=176  seed b92d94e1:3b770fb3  sev 0  CCC p=0.012                  LOW       —
     i=177  seed 6cae5e90:65ed137a  sev 0  CCC p=0.012                  LOW       —
     i=178  seed 87f69d3c:6185ed92  sev 0  CCC p=0.012                  LOW       —
     i=179  seed 274e2e1b:22c10587  sev 0  CCC p=0.012                  LOW       —
     i=180  seed d0fa1a69:2deaeddb  sev 0  CCC p=0.012                  LOW       —
     i=181  seed 60229e50:ae6345ca  sev 0  CCC p=0.012                  LOW       —
     i=182  seed 06749948:5946da32  sev 0  CCC p=0.012                  LOW       —
     i=183  seed d9cad313:f69faf63  sev 0  CCC p=0.012                  LOW       —
     i=184  seed 5c68059d:8854303b  sev 0  CCC p=0.012                  LOW       —
     i=185  seed c6aca3f9:85af4f43  sev 0  CCC p=0.024                  LOW       —
     i=186  seed 1212bb81:182e6039  sev 0  CCC p=0.012                  LOW       —
     i=187  seed 8f815a37:29b6e703  sev 0  CCC p=0.012                  LOW       —
     i=188  seed 267f483e:b6ec23a6  sev 0  CCC p=0.012                  LOW       —
     i=189  seed c328ea7f:6795f5c3  sev 0  CCC p=0.012                  LOW       —
     i=190  seed 59bc5971:8ae9151d  sev 0  CCC p=0.012                  LOW       —
     i=191  seed 803ded77:ced6d46f  sev 0  CCC p=0.012                  LOW       —
     i=192  seed d32c4f29:d46ec9b3  sev 0  CCC p=0.018000000000000002   LOW       —
     i=193  seed 9847beac:a9630630  sev 0  CCC p=0.012                  LOW       —
     i=194  seed 3e461186:256c2448  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=195  seed 5c105ddd:d0b27971  sev 0  CCC p=0.018000000000000002   LOW       —
     i=196  seed fc684154:25c916f2  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=197  seed efe06537:d22ad9a3  sev 0  CCC p=0.012                  LOW       —
     i=198  seed b1d3d36d:e20daa35  sev 0  CCC p=0.012                  LOW       —
     i=199  seed 6c5f3665:5712e2af  sev 0  CCC p=0.012                  LOW       —
     i=200  seed d43f724c:8fa6e526  sev 0  CCC p=0.018000000000000002   LOW       —
     i=201  seed 5ebc4d17:ae278ab3  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=202  seed 5eb8f5d0:74d00634  sev 0  CCC p=0.018000000000000002   LOW       —
     i=203  seed 1572468c:538b80dc  sev 0  CCC p=0.012                  LOW       —
     i=204  seed 9e4fecc3:05a83257  sev 0  CCC p=0.012                  LOW       —
     i=205  seed 0141103d:94bea9b7  sev 0  CCC p=0.012                  LOW       —
     i=206  seed 127989c5:6f03c513  sev 0  CCC p=0.018000000000000002   LOW       —
     i=207  seed 03ba0220:bf50a3a8  sev 0  CCC p=0.012                  LOW       —
     i=208  seed 113d7bab:416c2c69  sev 0  CCC p=0.012                  LOW       —
     i=209  seed ea108943:41ce065d  sev 0  CCC p=0.012                  LOW       —
     i=210  seed 9443d0a4:94772e70  sev 0  CCC p=0.012                  LOW       —
     i=211  seed c42ee603:cb3c18cb  sev 0  CCC p=0.012                  LOW       —
     i=212  seed b4dc67e0:b362e1aa  sev 0  CCC p=0.012                  LOW       —
     i=213  seed 0cd7e7ed:dd4d386b  sev 0  CCC p=0.012                  LOW       —
     i=214  seed 25b84a91:72fb439f  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=215  seed 27e1847c:c2135fca  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=216  seed d268ebc6:5c132e92  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=217  seed d3240690:1e81a16a  sev 0  CCC p=0.012                  LOW       —
     i=218  seed 62a9509f:cfa4b615  sev 0  CCC p=0.012                  LOW       —
     i=219  seed 70588220:0945ccc8  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=220  seed 0c1a1db4:6bebe15c  sev 0  CCC p=0.012                  LOW       —
     i=221  seed d952c40c:a8c911b6  sev 0  CCC p=0.012                  LOW       —
     i=222  seed ad2e6f66:813824aa  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=223  seed 30c4da55:4c5287c3  sev 0  CCC p=0.012                  LOW       —
     i=224  seed 633a9e81:c8242c5f  sev 0  CCC p=0.018000000000000002   LOW       —
     i=225  seed dbf074ad:7ea24c3d  sev 0  CCC p=0.018000000000000002   LOW       —
     i=226  seed da51e360:60f74466  sev 0  CCC p=0.012                  LOW       —
     i=227  seed 95e01b30:18555a7e  sev 0  CCC p=0.012                  LOW       —
     i=228  seed deba2ef6:146d0d4a  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=229  seed 7be51552:0c94a2b6  sev 0  CCC p=0.012                  LOW       —
     i=230  seed 640240b0:e77264bc  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=231  seed bc20a532:08bffab2  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=232  seed 81775e93:9649e1d3  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=233  seed 5ed0e246:290f4298  sev 0  CCC p=0.012                  LOW       —
     i=234  seed e0b2cb11:58cfa56b  sev 0  CCC p=0.012                  LOW       —
     i=235  seed ed8b9c9d:5bc5d941  sev 0  CCC p=0.012                  LOW       —
     i=236  seed f1b5b433:916d37cb  sev 0  CCC p=0.012                  LOW       —
     i=237  seed 5f4be553:d90c429f  sev 0  CCC p=0.012                  LOW       —
     i=238  seed 5e84cd74:671e1972  sev 0  CCC p=0.012                  LOW       —
     i=239  seed 2cd32273:37bf16f1  sev 0  CCC p=0.012                  LOW       —
     i=240  seed 656eb231:a751dacb  sev 0  CCC p=0.012                  LOW       —
     i=241  seed 54161d05:ea5e5677  sev 0  CCC p=0.012                  LOW       —
     i=242  seed b07e22f0:8cb7cdda  sev 0  CCC p=0.012                  LOW       —
     i=243  seed f907284d:3df9442d  sev 0  CCC p=0.012                  LOW       —
     i=244  seed bd67ce4f:7276ca75  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=245  seed 0741ce81:91bda8f1  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=246  seed f4aa08f5:4145f5e7  sev 0  CCC p=0.012                  LOW       —
     i=247  seed 799dc40b:fd01da75  sev 0  CCC p=0.012                  LOW       —
     i=248  seed 8b6e9356:bca3af68  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=249  seed 18396170:bdc6ae3e  sev 0  CCC p=0.012                  LOW       —
     i=250  seed f1ba4c5f:c68d2151  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=251  seed 85c5a77f:a3b96c81  sev 0  CCC p=0.012                  LOW       —
     i=252  seed 12f7ae83:7c226079  sev 0  CCC p=0.012                  LOW       —
     i=253  seed 3bf5a87b:a3fbc003  sev 0  CCC p=0.012                  LOW       —
     i=254  seed 80d94975:4f92c685  sev 0  CCC p=0.012                  LOW       —
     i=255  seed 788be3f8:d7567232  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=256  seed f87a402a:64c449d2  sev 0  CCC p=0.012                  LOW       —
     i=257  seed e3873014:58ad92c6  sev 0  CCC p=0.012                  LOW       —
     i=258  seed 576e1e03:f4fe200b  sev 0  CCC p=0.018000000000000002   LOW       —
     i=259  seed a7a93e81:3b6cdec3  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=260  seed 340f400a:8092197e  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=261  seed bdbb29ff:b1f3a55b  sev 0  CCC p=0.012                  LOW       —
     i=262  seed 9aec0403:4685536f  sev 0  CCC p=0.012                  LOW       —
     i=263  seed 4ac9c6fc:0ae8523e  sev 0  CCC p=0.012                  LOW       —
     i=264  seed 0419ca53:5f601627  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=265  seed fbb9333d:41318469  sev 0  CCC p=0.012                  LOW       —
     i=266  seed 860b4ac0:fa83861a  sev 0  CCC p=0.012                  LOW       —
     i=267  seed 0d08b829:b8e5faf3  sev 0  CCC p=0.012                  LOW       —
     i=268  seed 25b96410:413126c6  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=269  seed 3c303b95:b3768605  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=270  seed 37f8cb5f:e15c1105  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=271  seed ccf7e0d0:c0985492  sev 0  CCC p=0.012                  LOW       —
     i=272  seed 8ab3cf28:d78cefb2  sev 0  CCC p=0.012                  LOW       —
     i=273  seed f7af51a8:7f706a7e  sev 0  CCC p=0.012                  LOW       —
     i=274  seed 773119f9:260f463b  sev 0  CCC p=0.012                  LOW       —
     i=275  seed 64cdc469:5d7d9c93  sev 0  CCC p=0.012                  LOW       —
     i=276  seed 3cd646e0:e2c8e25a  sev 0  CCC p=0.012                  LOW       —
     i=277  seed 8a4d4009:8988254f  sev 0  CCC p=0.012                  LOW       —
     i=278  seed d6e60208:3ff6179c  sev 0  CCC p=0.012                  LOW       —
     i=279  seed 24eaa79b:d712c791  sev 0  CCC p=0.012                  LOW       —
     i=280  seed 89388fbc:32c4ac9c  sev 0  CCC p=0.012                  LOW       —
     i=281  seed 34bb9f48:d6fcb1f6  sev 0  CCC p=0.012                  LOW       —
     i=282  seed c76dd2dd:1666ecbb  sev 0  CCC p=0.012                  LOW       —
     i=283  seed 35c20aff:41f7d919  sev 0  CCC p=0.012                  LOW       —
     i=284  seed 8d2e8f90:8f09b47c  sev 0  CCC p=0.012                  LOW       —
     i=285  seed 3d54b5a4:0892dbf2  sev 0  CCC p=0.012                  LOW       —
     i=286  seed ac5cfc21:1877fcf5  sev 0  CCC p=0.012                  LOW       —
     i=287  seed 528ae5df:8a7093c1  sev 0  CCC p=0.012                  LOW       —
     i=288  seed 41ee753b:d993383b  sev 0  CCC p=0.012                  LOW       —
     i=289  seed e9ae54b4:b4db5946  sev 0  CCC p=0.012                  LOW       —
     i=290  seed 6e9c71a1:77622bb1  sev 0  CCC p=0.012                  LOW       —
     i=291  seed 3668c4b8:c8542b4a  sev 0  CCC p=0.012                  LOW       —
     i=292  seed 8fa722a9:20b6010f  sev 0  CCC p=0.012                  LOW       —
     i=293  seed 480ccc20:fb046dde  sev 0  CCC p=0.018000000000000002   LOW       —
     i=294  seed 644c9a24:c332e722  sev 0  CCC p=0.012                  LOW       —
     i=295  seed f41e5fe6:61042ac0  sev 0  CCC p=0.012                  LOW       —
     i=296  seed 6c85000e:8f6e4a70  sev 0  CCC p=0.012                  LOW       —
     i=297  seed 00542590:bed51382  sev 0  CCC p=0.012                  LOW       —
     i=298  seed c442db10:23f6bde2  sev 0  CCC p=0.012                  LOW       —
     i=299  seed 45145714:d9f17a0e  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=300  seed ce2e9038:338afcfc  sev 0  CCC p=0.012                  LOW       —
     i=301  seed 1dacd65b:f554356b  sev 0  CCC p=0.012                  LOW       —
     i=302  seed 08cd119b:f291c0ff  sev 0  CCC p=0.018000000000000002   LOW       —
     i=303  seed 6c3fb7b8:78c55682  sev 0  CCC p=0.024                  LOW       —
     i=304  seed f9c9370b:9939eaa5  sev 0  CCC p=0.012                  LOW       —
     i=305  seed 39823721:5dac5763  sev 0  CCC p=0.012                  LOW       —
     i=306  seed 478a120b:6a8b860f  sev 0  CCC p=0.012                  LOW       —
     i=307  seed a72dcd40:8e9d1856  sev 0  CCC p=0.012                  LOW       —
     i=308  seed 67036051:e4a5707b  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=309  seed b10ea1c8:6d4a5b1a  sev 0  CCC p=0.012                  LOW       —
     i=310  seed eaaf5988:d4779f46  sev 0  CCC p=0.012                  LOW       —
     i=311  seed b09b251b:60d8d5e3  sev 0  CCC p=0.012                  LOW       —
     i=312  seed 0f9b3fb0:ceceee26  sev 0  CCC p=0.012                  LOW       —
     i=313  seed 9faa23cc:e6a2762a  sev 0  CCC p=0.012                  LOW       —
     i=314  seed 8b6c0980:949c280e  sev 0  CCC p=0.012                  LOW       —
     i=315  seed f8cae06b:2819c7af  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=316  seed b2577681:20c15d0f  sev 0  CCC p=0.012                  LOW       —
     i=317  seed 16884995:0cf89d2f  sev 0  CCC p=0.012                  LOW       —
     i=318  seed 2198ebbc:e7f2103a  sev 0  CCC p=0.012                  LOW       —
     i=319  seed e729dcbd:5c28615b  sev 0  CCC p=0.012                  LOW       —
     i=320  seed 6240c90b:4d17d4a1  sev 0  CCC p=0.012                  LOW       —
     i=321  seed 0911eec0:6289d1e8  sev 0  CCC p=0.012                  LOW       —
     i=322  seed 3834cde3:de020da1  sev 0  CCC p=0.012                  LOW       —
     i=323  seed 7427a337:655261e1  sev 0  CCC p=0.012                  LOW       —
     i=324  seed 40358838:fc4ce32a  sev 0  CCC p=0.012                  LOW       —
     i=325  seed a880bf85:b56ebbcb  sev 0  CCC p=0.012                  LOW       —
     i=326  seed faece3e0:5b1aa568  sev 0  CCC p=0.012                  LOW       —
     i=327  seed fce7baaa:4db31ab6  sev 0  CCC p=0.012                  LOW       —
     i=328  seed 503359c0:04988bd2  sev 0  CCC p=0.012                  LOW       —
     i=329  seed 199cce63:150e3161  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=330  seed 828e3679:a5a6ad2d  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=331  seed 04f1d0d7:005ddefb  sev 0  CCC p=0.012                  LOW       —
     i=332  seed 6f35adf4:ded05da4  sev 0  CCC p=0.012                  LOW       —
     i=333  seed 347e4131:af91069f  sev 0  CCC p=0.012                  LOW       —
     i=334  seed 4b80a642:7790d166  sev 0  CCC p=0.012                  LOW       —
     i=335  seed 6761cdf6:74d1c0a0  sev 0  CCC p=0.018000000000000002   LOW       —
     i=336  seed ec53bbfb:f1f57b51  sev 0  CCC p=0.012                  LOW       —
     i=337  seed f3ea37ec:b144c82c  sev 0  CCC p=0.012                  LOW       —
     i=338  seed fe640cb1:65a5dc3b  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=339  seed a0c53646:288a2846  sev 0  CCC p=0.012                  LOW       —
     i=340  seed 4c932a82:e092f3fa  sev 0  CCC p=0.024                  LOW       —
     i=341  seed 64ffb14c:52ccf1ac  sev 0  CCC p=0.012                  LOW       —
     i=342  seed 7bc7558b:41f5a613  sev 0  CCC p=0.012                  LOW       —
     i=343  seed 8823972f:83429769  sev 0  CCC p=0.012                  LOW       —
     i=344  seed f2f0a31b:66b80d35  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=345  seed 5d43db7d:f3a63135  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=346  seed 080bf5f3:f48711c5  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=347  seed 60130d50:33266b04  sev 0  CCC p=0.012                  LOW       —
     i=348  seed b8d3dc9c:b9ce56ce  sev 0  CCC p=0.012                  LOW       —
     i=349  seed f01b6a24:7574211c  sev 0  CCC p=0.012                  LOW       —
     i=350  seed 9e777951:03bc074b  sev 0  CCC p=0.018000000000000002   LOW       —
     i=351  seed ad615629:a5505d43  sev 0  CCC p=0.012                  LOW       —
     i=352  seed 26a2e865:90c32d71  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=353  seed 5384b88d:c40ba5bd  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=354  seed 8219d479:206c8d49  sev 0  CCC p=0.012                  LOW       —
     i=355  seed f2620303:e4e49f7d  sev 0  CCC p=0.012                  LOW       —
     i=356  seed d3a93fb9:7c097619  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=357  seed f750797f:16ec9ec9  sev 0  CCC p=0.012                  LOW       —
     i=358  seed 8b627b2e:747293d0  sev 0  CCC p=0.012                  LOW       —
     i=359  seed ee5f5ce1:cf495179  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=360  seed d32d26a4:677b3df6  sev 0  CCC p=0.024                  LOW       —
     i=361  seed dac43d60:c6592886  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=362  seed 08580bbe:15995880  sev 0  CCC p=0.018000000000000002   LOW       —
     i=363  seed 91da82b3:da619265  sev 0  CCC p=0.012                  LOW       —
     i=364  seed 7b5810b0:3af87cfa  sev 0  CCC p=0.012                  LOW       —
     i=365  seed 4fe24517:9b499c5d  sev 0  CCC p=0.012                  LOW       —
     i=366  seed 9c92ce38:a6a231bc  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=367  seed fbd17358:82f9877c  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=368  seed 1a1f6f75:a26af65f  sev 0  CCC p=0.012                  LOW       —
     i=369  seed adb3bde6:297914c0  sev 0  CCC p=0.012                  LOW       —
     i=370  seed 7e6b7bf5:109b2217  sev 0  CCC p=0.012                  LOW       —
     i=371  seed 3054ffbd:f0b3f871  sev 0  CCC p=0.012                  LOW       —
     i=372  seed b6d86b34:e80844ba  sev 0  CCC p=0.012                  LOW       —
     i=373  seed c2712db5:9f5b8a09  sev 0  CCC p=0.012                  LOW       —
     i=374  seed b5bab5f6:496b1e40  sev 0  CCC p=0.012                  LOW       —
     i=375  seed be1e46f3:730aeced  sev 0  CCC p=0.024                  LOW       —
     i=376  seed 192017d0:071f3bc4  sev 0  CCC p=0.012                  LOW       —
     i=377  seed 9e448581:acaf2677  sev 0  CCC p=0.012                  LOW       —
     i=378  seed de515917:39c10e43  sev 0  CCC p=0.012                  LOW       —
     i=379  seed 4768cfbd:f9043763  sev 0  CCC p=0.012                  LOW       —
     i=380  seed c576e18e:723ac9c6  sev 0  CCC p=0.012                  LOW       —
     i=381  seed 2c9e01b9:1251e44d  sev 0  CCC p=0.012                  LOW       —
     i=382  seed 36cb44dc:8793cd76  sev 0  CCC p=0.012                  LOW       —
     i=383  seed f267f726:3bd0c270  sev 0  CCC p=0.024                  LOW       —
     i=384  seed fbbc6799:13966b6d  sev 0  CCC p=0.024                  LOW       —
     i=385  seed a71694d0:b9aa872a  sev 0  CCC p=0.012                  LOW       —
     i=386  seed 352d27ae:7d26037a  sev 0  CCC p=0.012                  LOW       —
     i=387  seed f7bb4579:e264831b  sev 0  CCC p=0.012                  LOW       —
     i=388  seed e5b54ccd:0d52e463  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=389  seed 6b99dddc:6720d5ce  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=390  seed c528deac:80572938  sev 0  CCC p=0.012                  LOW       —
     i=391  seed f2c6aa28:4f3c2c2a  sev 0  CCC p=0.012                  LOW       —
     i=392  seed 55f9c847:8e81045d  sev 0  CCC p=0.012                  LOW       —
     i=393  seed 0e8faabc:96357ea4  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=394  seed 5d46d4e4:32f50446  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=395  seed af718d0b:3d59e3e1  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=396  seed 8ba4578f:cbc32fe9  sev 0  CCC p=0.012                  LOW       —
     i=397  seed 3f9b67a0:33107a1a  sev 0  CCC p=0.012                  LOW       —
     i=398  seed 5d50ca2f:0d7a6ee9  sev 0  CCC p=0.024                  LOW       —
     i=399  seed cb582828:e3dd54c6  sev 0  CCC p=0.018000000000000002   LOW       —
     i=400  seed 0afb67a2:b9df16ba  sev 0  CCC p=0.012                  LOW       —
     i=401  seed 04090338:78c157ce  sev 0  CCC p=0.024                  LOW       —
     i=402  seed 31496e6c:5851a642  sev 0  CCC p=0.018000000000000002   LOW       —
     i=403  seed 608ef67c:fbfba33e  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=404  seed ed181e7c:3da9a30e  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=405  seed d3412388:78962422  sev 0  CCC p=0.012                  LOW       —
     i=406  seed 8b4b9e8a:d20e22aa  sev 0  CCC p=0.012                  LOW       —
     i=407  seed 5a1d7ead:a47ba467  sev 0  CCC p=0.012                  LOW       —
     i=408  seed 05a11ded:c763ebe9  sev 0  CCC p=0.012                  LOW       —
     i=409  seed 13790815:269ec499  sev 0  CCC p=0.012                  LOW       —
     i=410  seed d98e85b0:4ca7a7ac  sev 0  CCC p=0.012                  LOW       —
     i=411  seed 44febaa3:ae87f333  sev 0  CCC p=0.012                  LOW       —
     i=412  seed 7f967f64:63c529d2  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=413  seed 7e4787f5:3ac67d4b  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=414  seed c2beb0ec:36619e0a  sev 0  CCC p=0.018000000000000002   LOW       —
     i=415  seed f086b811:557a9f5b  sev 0  CCC p=0.012                  LOW       —
     i=416  seed 1e94a2ef:d8ad02dd  sev 0  CCC p=0.012                  LOW       —
     i=417  seed ac99920d:53593939  sev 0  CCC p=0.012                  LOW       —
     i=418  seed 5d132721:01cfc549  sev 0  CCC p=0.012                  LOW       —
     i=419  seed 38a73e0b:9d2af62f  sev 0  CCC p=0.012                  LOW       —
     i=420  seed 9d01bdfe:d40ef0a2  sev 0  CCC p=0.012                  LOW       —
     i=421  seed 9a898054:8bce6dc2  sev 0  CCC p=0.012                  LOW       —
     i=422  seed 50977197:a09fd17b  sev 0  CCC p=0.012                  LOW       —
     i=423  seed 5caf87a7:2dc99c4d  sev 0  CCC p=0.012                  LOW       —
     i=424  seed 4558068d:ddf11371  sev 0  CCC p=0.012                  LOW       —
     i=425  seed 6f4cdb78:13fc38f8  sev 0  CCC p=0.012                  LOW       —
     i=426  seed 48b60a04:147a3a8a  sev 0  CCC p=0.012                  LOW       —
     i=427  seed 63d66451:80646a7f  sev 0  CCC p=0.012                  LOW       —
     i=428  seed eaa88ea9:be7a699f  sev 0  CCC p=0.012                  LOW       —
     i=429  seed b00261de:d0bd7c38  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=430  seed 09f8fd58:06a2230e  sev 0  CCC p=0.018000000000000002   LOW       —
     i=431  seed 63226191:e62bdfe1  sev 0  CCC p=0.012                  LOW       —
     i=432  seed b64b96cd:8269b1bb  sev 0  CCC p=0.012                  LOW       —
     i=433  seed 8646e87d:142d59e3  sev 0  CCC p=0.012                  LOW       —
     i=434  seed 8fb8f12c:8d6e122c  sev 0  CCC p=0.012                  LOW       —
     i=435  seed a5a4eb7b:5cae0cdb  sev 0  CCC p=0.012                  LOW       —
     i=436  seed 8f69bba9:b12a33af  sev 0  CCC p=0.012                  LOW       —
     i=437  seed 812ef4d9:c9fce805  sev 0  CCC p=0.012                  LOW       —
     i=438  seed 1ffc4473:e3eed96f  sev 0  CCC p=0.012                  LOW       —
     i=439  seed 5b922434:c61eb160  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=440  seed 658b07b6:4774901e  sev 0  CCC p=0.012                  LOW       —
     i=441  seed 1b726c1e:bbf7b25a  sev 0  CCC p=0.012                  LOW       —
     i=442  seed f7fd5987:5a8b4c61  sev 0  CCC p=0.012                  LOW       —
     i=443  seed c2969fef:362918bb  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=444  seed c93b76e5:58b7f7ab  sev 0  CCC p=0.012                  LOW       —
     i=445  seed aba50e30:703f9c94  sev 0  CCC p=0.024                  LOW       —
     i=446  seed 7712eb75:a9a9935b  sev 0  CCC p=0.012                  LOW       —
     i=447  seed 01498464:be1d7a56  sev 0  CCC p=0.012                  LOW       —
     i=448  seed 35887f3c:b6e93044  sev 0  CCC p=0.012                  LOW       —
     i=449  seed b956b4b7:22ae1f67  sev 0  CCC p=0.012                  LOW       —
     i=450  seed 856c722e:69904268  sev 0  CCC p=0.012                  LOW       —
     i=451  seed 69c2bb6d:0d596c35  sev 0  CCC p=0.024                  LOW       —
     i=452  seed 9ed080a0:0fe50d90  sev 0  CCC p=0.012                  LOW       —
     i=453  seed 99c7e811:aa2e62d7  sev 0  CCC p=0.024                  LOW       —
     i=454  seed 15dbd3d7:00649115  sev 0  CCC p=0.012                  LOW       —
     i=455  seed 2a9436e5:18cb7b45  sev 0  CCC p=0.012                  LOW       —
     i=456  seed cbd3a4aa:6732c186  sev 0  CCC p=0.012                  LOW       —
     i=457  seed bf5996e3:ecfa8f57  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=458  seed 03d38cc1:88381ba3  sev 0  CCC p=0.012                  LOW       —
     i=459  seed 045dada3:4bcf6d17  sev 0  CCC p=0.012                  LOW       —
     i=460  seed 7f244675:47b8424d  sev 0  CCC p=0.012                  LOW       —
     i=461  seed 41a57b5d:78847a21  sev 0  CCC p=0.012                  LOW       —
     i=462  seed ec22bbfd:020badff  sev 0  CCC p=0.024                  LOW       —
     i=463  seed 23b4930d:5464067b  sev 0  CCC p=0.012                  LOW       —
     i=464  seed a7d5ec3e:0636c798  sev 0  CCC p=0.024                  LOW       —
     i=465  seed 59cc3f63:b5ba9555  sev 0  CCC p=0.012                  LOW       —
     i=466  seed 13502555:48dbe46d  sev 0  CCC p=0.012                  LOW       —
     i=467  seed 93c6df06:18839c16  sev 0  CCC p=0.012                  LOW       —
     i=468  seed 3dcbdab1:25997c95  sev 0  CCC p=0.024                  LOW       —
     i=469  seed 7fe02ccf:fa567689  sev 0  CCC p=0.024                  LOW       —
     i=470  seed dd8f1615:7ef3ffdf  sev 0  CCC p=0.012                  LOW       —
     i=471  seed 93777020:0e307b16  sev 0  CCC p=0.012                  LOW       —
     i=472  seed 8e7c4949:11461d9b  sev 0  CCC p=0.012                  LOW       —
     i=473  seed fb66f660:ca33141a  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=474  seed 47cd7608:3bdb333a  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=475  seed c64ed165:f7e34fd1  sev 0  CCC p=0.018000000000000002   LOW       —
     i=476  seed 1335abd3:1fa0a0ab  sev 0  CCC p=0.012                  LOW       —
     i=477  seed 20788483:8f201f75  sev 0  CCC p=0.012                  LOW       —
     i=478  seed bbfdde2d:f64b8bf7  sev 0  CCC p=0.012                  LOW       —
     i=479  seed 1e65fd52:6968dc3e  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=480  seed fe23488b:d85322f7  sev 0  CCC p=0.012                  LOW       —
     i=481  seed 958f08d3:7285142f  sev 0  CCC p=0.018000000000000002   LOW       —
     i=482  seed aca57985:e0cee499  sev 0  CCC p=0.012                  LOW       —
     i=483  seed 5015dc07:70bb05c9  sev 0  CCC p=0.012                  LOW       —
     i=484  seed ddc4a717:e8be6025  sev 0  CCC p=0.012                  LOW       —
     i=485  seed d7535499:cbdd9e81  sev 0  CCC p=0.012                  LOW       —
     i=486  seed 42fa7880:c051e5a2  sev 0  CCC p=0.012                  LOW       —
     i=487  seed 4d4e2985:8ead6eed  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=488  seed 39d4d204:6ad216c6  sev 0  CCC p=0.012                  LOW       —
     i=489  seed 82490178:765dbace  sev 0  CCC p=0.012                  LOW       —
     i=490  seed 4e038bc0:1602528a  sev 0  CCC p=0.012                  LOW       —
     i=491  seed 713ef7ed:404968db  sev 0  CCC p=0.012                  LOW       —
     i=492  seed 187d1840:461c45e4  sev 0  CCC p=0.012                  LOW       —
     i=493  seed 3b9a0620:b4638e40  sev 0  CCC p=0.012                  LOW       —
     i=494  seed b4c8509b:e53fefd5  sev 0  CCC p=0.024                  LOW       —
     i=495  seed a29250cb:0395a2e9  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=496  seed 573874df:6259e101  sev 0  CCC p=0.012                  LOW       —
     i=497  seed 1e0d3475:f55be361  sev 1  CCC p=0.006                  MODERATE  Cross-Condition Consistency(MODERATE, p=0.006)
     i=498  seed 996e69b3:d418491d  sev 0  CCC p=0.012                  LOW       —
     i=499  seed cb92834b:99cd55fb  sev 0  CCC p=0.012                  LOW       —
```
