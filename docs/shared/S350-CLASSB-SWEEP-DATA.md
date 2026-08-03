# S350 Part 5 — Class B seed sweep, raw tables

Companion data for `docs/shared/SESSION350-AUDIT-SUMMARY.md` Part 5. Nothing is
interpreted here; the reading is in the summary.

Produced by `test/probes/probe-s350-classb-bound.mjs` with the two load hooks.
Twenty seeds per fixture per null. Seeds are the S348 Part 5 rule — one-unit
neighbours of `09-proteomics-clean.csv` at stride 7, hashed and substituted,
with the perturbed matrix discarded and never scored, so run *k* here is run *k*
in S348 Part 5 and S349 Part 3a.

`dist` is `adjP - ALPHA.NOTE`; negative means the unit's own adjusted p is below
the threshold. `FLAGS n/20` counts seeds where the unit is forensic-direction
AND gate-passed AND below `ALPHA.NOTE` — the three conditions the driver
requires before a unit may contribute to `primaryP`.

## Run 1 — shipped B ladder (999 / 499 / 199)

```bash
node --import ./test/probes/s348-hash-hook.mjs \
     --import ./test/probes/s350-paired-null-hook.mjs \
     test/probes/probe-s350-classb-bound.mjs
```

```
[s350 hook] CCC per-unit capture armed; null switchable via __S350_PAIRED; B ladder unchanged (in memory)
S350 Part 5 — bounding Class B
Phase 1: pairing rule of probe-s349-pairing-census.mjs applied across all 27 fixtures.

| fixture | sev | conditions | pairing key | subjects | paired | alignment |
|---|---|---|---|---|---|---|
| 01-densitometry-clean.csv | 0 | column-grouped ×3 | row index (structural) | 35 | yes | ok |
| 02-densitometry-fabricated.csv | 3 | column-grouped ×3 | row index (structural) | 35 | yes | ok |
| 03-qpcr-clean.csv | 0 | row-grouped ×2 | Target | 25 | yes | ok |
| 04-qpcr-fabricated.csv | 3 | row-grouped ×2 | Target | 25 | yes | ok |
| 05-cellcount-clean.csv | 0 | none | — | — | no | no conditions |
| 06-cellcount-fabricated.csv | 3 | none | — | — | no | no conditions |
| 07-elisa-clean.csv | 0 | none | — | — | no | no conditions |
| 08-elisa-fabricated.csv | 3 | none | — | — | no | no conditions |
| 09-proteomics-clean.csv | 0 | row-grouped ×2 | ProteinID | 200 | yes | ok |
| 10-proteomics-fabricated.csv | 3 | row-grouped ×2 | ProteinID | 200 | yes | ok |
| 11-rnaseq-multicondition.csv | 3 | row-grouped ×3 | GeneID | 500 | yes | ok |
| 12a-uniform-mixture-clean.csv | 0 | row-grouped ×2 | — | — | no | not fully paired |
| 12b-uniform-mixture-fabricated.csv | 1 | row-grouped ×2 | — | — | no | not fully paired |
| 13-vfstest-cellcountest.csv | 2 | none | — | — | no | no conditions |
| 14-crctest-survey.csv | 2 | none | — | — | no | no conditions |
| 15-missing-carlisle.csv | 3 | row-grouped ×2 | — | — | no | not fully paired |
| 16-densitometry-carlisle-overbalanced.csv | 2 | column-grouped ×3 | row index (structural) | 60 | yes | ok |
| 17-densitometry-carlisle-clean.csv | 0 | column-grouped ×3 | row index (structural) | 60 | yes | ok |
| 19-inheritance-fabricated.csv | 1 | row-grouped ×2 | — | — | no | not fully paired |
| 20-bimodal-fab.csv | 3 | row-grouped ×2 | — | — | no | not fully paired |
| 21-localised-ar.csv | 3 | row-grouped ×2 | — | — | no | not fully paired |
| 22-covariance-block.csv | 1 | row-grouped ×2 | — | — | no | not fully paired |
| 23-recurrence-null-mixed.csv | 3 | none | — | — | no | no conditions |
| 24-recurrence-null-control.csv | 3 | none | — | — | no | no conditions |
| vfs-a-pigeonhole-clear.csv | 0 | none | — | — | no | no conditions |
| vfs-b-recurrence-high.csv | 2 | none | — | — | no | no conditions |
| vfs-c-deeptail-high.csv | 2 | none | — | — | no | no conditions |

Paired AND fabricated (severity >= 1): 5
   02-densitometry-fabricated.csv  sev 3  column-grouped ×3  key row index (structural)  35 subjects  align ok
   04-qpcr-fabricated.csv  sev 3  row-grouped ×2  key Target  25 subjects  align ok
   10-proteomics-fabricated.csv  sev 3  row-grouped ×2  key ProteinID  200 subjects  align ok
   11-rnaseq-multicondition.csv  sev 3  row-grouped ×3  key GeneID  500 subjects  align ok
   16-densitometry-carlisle-overbalanced.csv  sev 2  column-grouped ×3  key row index (structural)  60 subjects  align ok

Paired AND clean, for reference: 4 — 01-densitometry-clean.csv, 03-qpcr-clean.csv, 09-proteomics-clean.csv, 17-densitometry-carlisle-clean.csv

Phase 2: 20 seeds x 2 nulls on 5 fixture(s).
Seeds: cells[(k * 7) % 2400] of 09-proteomics-clean.csv, nudge up on even k — the S348 Part 5 rule.
B: shipped ladder (999 / 499 / 199)
ALPHA.NOTE = 0.01, ALPHA.FLAG = 0.001

parity on 02-densitometry-fabricated.csv seed 0 — direct primaryP 0.0945 flag LOW B 999 | runFullAnalysis primaryP 0.0945 flag LOW B 999 -> MATCH

── 02-densitometry-fabricated.csv  (35 x 12, densitometry, sev 3) ──
   column-grouped ×3: Control, Inhibitor_A, Inhibitor_B; key row index (structural), 35 subjects
   VST log — slope=0.54, CI [0.28, 0.81] below 1 → inconclusive → assay fallback (densitometry) → log
   cost 0.03s per CCC run at B = 999; projected 0.0 min for 20 seeds x 2 nulls

   ARM free permutation (shipped)
      test primaryP: min 0.09225  median 0.1123  max 0.1327   flagging 0/20   flags seen: LOW
      per running unit (18); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   Control vs Inhibitor_A     dir {"similar":20}               adjP [0.09225 .. 0.1327] med 0.1160 dist [0.0823 .. 0.123] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Control vs Inhibitor_B     dir {"different":20}             adjP [0.003600 .. 0.003600] med 0.003600 dist [-0.00640 .. -0.00640] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Inhibitor_A vs Inhibitor_B dir {"different":20}             adjP [0.003600 .. 0.003600] med 0.003600 dist [-0.00640 .. -0.00640] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Inhibitor_A     dir {"similar":20}               adjP [0.09450 .. 0.1400] med 0.1165 dist [0.0845 .. 0.130] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Inhibitor_B     dir {"different":20}             adjP [0.02700 .. 0.07457] med 0.05100 dist [0.0170 .. 0.0646] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Inhibitor_A vs Inhibitor_B dir {"different":20}             adjP [0.04114 .. 0.09514] med 0.05914 dist [0.0311 .. 0.0851] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Inhibitor_A     dir {"different":20}             adjP [0.003600 .. 0.003600] med 0.003600 dist [-0.00640 .. -0.00640] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Inhibitor_B     dir {"different":20}             adjP [0.003600 .. 0.003600] med 0.003600 dist [-0.00640 .. -0.00640] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Inhibitor_A vs Inhibitor_B dir {"different":20}             adjP [0.003600 .. 0.003600] med 0.003600 dist [-0.00640 .. -0.00640] forensic 0/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Inhibitor_A     dir {"similar":20}               adjP [0.5850 .. 0.8370] med 0.6570 dist [0.575 .. 0.827] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Inhibitor_B     dir {"different":20}             adjP [0.9068 .. 0.9900] med 0.9427 dist [0.897 .. 0.980] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Inhibitor_A vs Inhibitor_B dir {"different":20}             adjP [0.8666 .. 0.9495] med 0.9214 dist [0.857 .. 0.940] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Inhibitor_A     dir {"similar":20}               adjP [0.4680 .. 0.7470] med 0.6165 dist [0.458 .. 0.737] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Inhibitor_B     dir {"similar":20}               adjP [0.8666 .. 0.9495] med 0.9214 dist [0.857 .. 0.940] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Inhibitor_A vs Inhibitor_B dir {"similar":20}               adjP [0.8666 .. 0.9495] med 0.9214 dist [0.857 .. 0.940] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Inhibitor_A     dir {"similar":20}               adjP [0.8666 .. 0.9495] med 0.9214 dist [0.857 .. 0.940] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Inhibitor_B     dir {"similar":11,"different":9} adjP [0.9620 .. 1.000] med 0.9830 dist [0.952 .. 0.990] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Inhibitor_A vs Inhibitor_B dir {"similar":20}               adjP [0.8666 .. 0.9495] med 0.9214 dist [0.857 .. 0.940] forensic 20/20 gate 20/20 FLAGS 0/20

   ARM within-subject relabel
      test primaryP: min 0.09225  median 0.1080  max 0.1220   flagging 0/20   flags seen: LOW
      per running unit (18); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   Control vs Inhibitor_A     dir {"similar":20}               adjP [0.09225 .. 0.1240] med 0.1090 dist [0.0823 .. 0.114] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Control vs Inhibitor_B     dir {"different":20}             adjP [0.003600 .. 0.003600] med 0.003600 dist [-0.00640 .. -0.00640] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Inhibitor_A vs Inhibitor_B dir {"different":20}             adjP [0.003600 .. 0.003600] med 0.003600 dist [-0.00640 .. -0.00640] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Inhibitor_A     dir {"similar":20}               adjP [0.09225 .. 0.1220] med 0.1080 dist [0.0823 .. 0.112] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Inhibitor_B     dir {"different":20}             adjP [0.08700 .. 0.1209] med 0.1045 dist [0.0770 .. 0.111] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Inhibitor_A vs Inhibitor_B dir {"different":20}             adjP [0.09400 .. 0.1300] med 0.1080 dist [0.0840 .. 0.120] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Inhibitor_A     dir {"different":20}             adjP [0.003600 .. 0.003600] med 0.003600 dist [-0.00640 .. -0.00640] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Inhibitor_B     dir {"different":20}             adjP [0.003600 .. 0.003600] med 0.003600 dist [-0.00640 .. -0.00640] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Inhibitor_A vs Inhibitor_B dir {"different":20}             adjP [0.003600 .. 0.003600] med 0.003600 dist [-0.00640 .. -0.00640] forensic 0/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Inhibitor_A     dir {"similar":20}               adjP [0.7509 .. 0.8229] med 0.7864 dist [0.741 .. 0.813] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Inhibitor_B     dir {"different":20}             adjP [0.7509 .. 0.8320] med 0.7909 dist [0.741 .. 0.822] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Inhibitor_A vs Inhibitor_B dir {"different":20}             adjP [0.7509 .. 0.8320] med 0.7909 dist [0.741 .. 0.822] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Inhibitor_A     dir {"similar":20}               adjP [0.4320 .. 0.7560] med 0.5670 dist [0.422 .. 0.746] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Inhibitor_B     dir {"similar":20}               adjP [0.7509 .. 0.8320] med 0.7909 dist [0.741 .. 0.822] forensic 20/20 gate 1/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Inhibitor_A vs Inhibitor_B dir {"similar":20}               adjP [0.7509 .. 0.8320] med 0.7909 dist [0.741 .. 0.822] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Inhibitor_A     dir {"similar":20}               adjP [0.7509 .. 0.8320] med 0.7909 dist [0.741 .. 0.822] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Inhibitor_B     dir {"different":20}             adjP [0.7800 .. 0.9000] med 0.8410 dist [0.770 .. 0.890] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Inhibitor_A vs Inhibitor_B dir {"similar":20}               adjP [0.7673 .. 0.8528] med 0.8088 dist [0.757 .. 0.843] forensic 20/20 gate 20/20 FLAGS 0/20

── 04-qpcr-fabricated.csv  (50 x 3, qpcr, sev 3) ──
   row-grouped ×2: WT, KO; key Target, 25 subjects
   VST raw — slope=-1.12, CI [-2.44, 0.21] below 1 → inconclusive → assay fallback (qpcr) → raw
   cost 0.01s per CCC run at B = 999; projected 0.0 min for 20 seeds x 2 nulls

   ARM free permutation (shipped)
      test primaryP: min 0.05400  median 0.07500  max 0.1200   flagging 0/20   flags seen: LOW
      per running unit (5); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   WT vs KO                   dir {"similar":20}               adjP [0.05400 .. 0.1200] med 0.07500 dist [0.0440 .. 0.110] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       WT vs KO                   dir {"similar":20}               adjP [0.4620 .. 0.5560] med 0.5200 dist [0.452 .. 0.546] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         WT vs KO                   dir {"similar":20}               adjP [0.3420 .. 0.4680] med 0.4035 dist [0.332 .. 0.458] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            WT vs KO                   dir {"similar":20}               adjP [0.2640 .. 0.3420] med 0.3000 dist [0.254 .. 0.332] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      WT vs KO                   dir {"similar":20}               adjP [0.2640 .. 0.3420] med 0.3000 dist [0.254 .. 0.332] forensic 20/20 gate 20/20 FLAGS 0/20

   ARM within-subject relabel
      test primaryP: min 0.1200  median 0.1380  max 0.1980   flagging 0/20   flags seen: LOW
      per running unit (5); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   WT vs KO                   dir {"similar":20}               adjP [0.1200 .. 0.1980] med 0.1380 dist [0.110 .. 0.188] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       WT vs KO                   dir {"similar":17,"different":3} adjP [0.9100 .. 0.9960] med 0.9770 dist [0.900 .. 0.986] forensic 17/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         WT vs KO                   dir {"different":20}             adjP [0.9100 .. 0.9960] med 0.9770 dist [0.900 .. 0.986] forensic 0/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            WT vs KO                   dir {"similar":20}               adjP [0.2740 .. 0.3480] med 0.2990 dist [0.264 .. 0.338] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      WT vs KO                   dir {"similar":20}               adjP [0.2740 .. 0.3480] med 0.2990 dist [0.264 .. 0.338] forensic 20/20 gate 20/20 FLAGS 0/20

── 10-proteomics-fabricated.csv  (400 x 6, proteomics, sev 3) ──
   row-grouped ×2: Vehicle, Treatment; key ProteinID, 200 subjects
   VST log — slope=1.97, CI [1.92, 2.02] above 1 → inconclusive → assay fallback (proteomics) → log
   cost 0.09s per CCC run at B = 499; projected 0.1 min for 20 seeds x 2 nulls

   ARM free permutation (shipped)
      test primaryP: min 0.1000  median 0.1500  max 0.2240   flagging 0/20   flags seen: LOW
      per running unit (7); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   Vehicle vs Treatment       dir {"similar":20}               adjP [0.3360 .. 0.5120] med 0.4300 dist [0.326 .. 0.502] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Vehicle vs Treatment       dir {"similar":20}               adjP [0.3360 .. 0.4680] med 0.3930 dist [0.326 .. 0.458] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Vehicle vs Treatment       dir {"similar":20}               adjP [0.3360 .. 0.4680] med 0.3930 dist [0.326 .. 0.458] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P4 Residual SD            Vehicle vs Treatment       dir {"different":20}             adjP [0.2200 .. 0.3160] med 0.2580 dist [0.210 .. 0.306] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Vehicle vs Treatment       dir {"similar":20}               adjP [0.2200 .. 0.3160] med 0.3000 dist [0.210 .. 0.306] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Vehicle vs Treatment       dir {"similar":20}               adjP [0.2200 .. 0.3160] med 0.2520 dist [0.210 .. 0.306] forensic 20/20 gate 20/20 FLAGS 0/20
      S3 P9 Mean-variance slope    Vehicle vs Treatment       dir {"similar":20}               adjP [0.1000 .. 0.2240] med 0.1500 dist [0.0900 .. 0.214] forensic 20/20 gate 20/20 FLAGS 0/20

   ARM within-subject relabel
      test primaryP: min 0.1440  median 0.1730  max 0.2100   flagging 0/20   flags seen: LOW
      per running unit (7); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   Vehicle vs Treatment       dir {"similar":20}               adjP [0.7440 .. 0.9200] med 0.8640 dist [0.734 .. 0.910] forensic 20/20 gate 0/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Vehicle vs Treatment       dir {"similar":20}               adjP [0.7440 .. 0.9160] med 0.8400 dist [0.734 .. 0.906] forensic 20/20 gate 0/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Vehicle vs Treatment       dir {"different":20}             adjP [0.7440 .. 0.9160] med 0.8370 dist [0.734 .. 0.906] forensic 0/20 gate 0/20 FLAGS 0/20
      S2 P4 Residual SD            Vehicle vs Treatment       dir {"different":20}             adjP [0.1500 .. 0.2880] med 0.2040 dist [0.140 .. 0.278] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Vehicle vs Treatment       dir {"similar":20}               adjP [0.2240 .. 0.3360] med 0.2780 dist [0.214 .. 0.326] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Vehicle vs Treatment       dir {"similar":20}               adjP [0.1500 .. 0.2880] med 0.2040 dist [0.140 .. 0.278] forensic 20/20 gate 20/20 FLAGS 0/20
      S3 P9 Mean-variance slope    Vehicle vs Treatment       dir {"similar":20}               adjP [0.1440 .. 0.2400] med 0.1860 dist [0.134 .. 0.230] forensic 20/20 gate 20/20 FLAGS 0/20

── 11-rnaseq-multicondition.csv  (1500 x 4, genomics, sev 3) ──
   row-grouped ×3: CondA, CondB, CondC; key GeneID, 500 subjects
   VST log — slope=1.99, CI [1.97, 2.02] above 1 → inconclusive → assay fallback (genomics) → log
   cost 0.27s per CCC run at B = 499; projected 0.2 min for 20 seeds x 2 nulls

   ARM free permutation (shipped)
      test primaryP: min 0.03600  median 0.03600  max 0.1080   flagging 0/20   flags seen: LOW
      per running unit (21); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   CondA vs CondB             dir {"similar":20}               adjP [0.8600 .. 0.9840] med 0.9280 dist [0.850 .. 0.974] forensic 20/20 gate 0/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   CondA vs CondC             dir {"similar":20}               adjP [0.6900 .. 0.8160] med 0.7530 dist [0.680 .. 0.806] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   CondB vs CondC             dir {"similar":20}               adjP [0.6900 .. 0.8160] med 0.7530 dist [0.680 .. 0.806] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondA vs CondB             dir {"different":20}             adjP [0.8600 .. 0.9840] med 0.9280 dist [0.850 .. 0.974] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondA vs CondC             dir {"similar":20}               adjP [0.6900 .. 0.8160] med 0.7530 dist [0.680 .. 0.806] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondB vs CondC             dir {"similar":20}               adjP [0.7560 .. 0.9514] med 0.8897 dist [0.746 .. 0.941] forensic 20/20 gate 0/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondA vs CondB             dir {"similar":20}               adjP [0.6900 .. 0.8160] med 0.7530 dist [0.680 .. 0.806] forensic 20/20 gate 0/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondA vs CondC             dir {"similar":20}               adjP [0.03600 .. 0.1080] med 0.03600 dist [0.0260 .. 0.0980] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondB vs CondC             dir {"similar":20}               adjP [0.6900 .. 0.8160] med 0.7530 dist [0.680 .. 0.806] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P4 Residual SD            CondA vs CondB             dir {"similar":20}               adjP [0.1980 .. 0.3240] med 0.2700 dist [0.188 .. 0.314] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            CondA vs CondC             dir {"similar":20}               adjP [0.2304 .. 0.3360] med 0.2754 dist [0.220 .. 0.326] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            CondB vs CondC             dir {"similar":20}               adjP [0.07200 .. 0.3024] med 0.2160 dist [0.0620 .. 0.292] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondA vs CondB             dir {"different":20}             adjP [0.3394 .. 0.4320] med 0.3960 dist [0.329 .. 0.422] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondA vs CondC             dir {"similar":20}               adjP [0.3735 .. 0.4500] med 0.4027 dist [0.363 .. 0.440] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondB vs CondC             dir {"different":20}             adjP [0.4160 .. 0.5560] med 0.4760 dist [0.406 .. 0.546] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondA vs CondB             dir {"similar":20}               adjP [0.2580 .. 0.3900] med 0.3030 dist [0.248 .. 0.380] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondA vs CondC             dir {"similar":20}               adjP [0.1980 .. 0.3240] med 0.2670 dist [0.188 .. 0.314] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondB vs CondC             dir {"similar":20}               adjP [0.1980 .. 0.3240] med 0.2670 dist [0.188 .. 0.314] forensic 20/20 gate 20/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondA vs CondB             dir {"similar":20}               adjP [0.4980 .. 0.6840] med 0.6030 dist [0.488 .. 0.674] forensic 20/20 gate 20/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondA vs CondC             dir {"similar":20}               adjP [0.5680 .. 0.7200] med 0.6760 dist [0.558 .. 0.710] forensic 20/20 gate 0/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondB vs CondC             dir {"similar":20}               adjP [0.4980 .. 0.6840] med 0.6030 dist [0.488 .. 0.674] forensic 20/20 gate 20/20 FLAGS 0/20

   ARM within-subject relabel
      test primaryP: min 0.4937  median 0.5623  max 0.6017   flagging 0/20   flags seen: LOW
      per running unit (21); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   CondA vs CondB             dir {"different":20}             adjP [0.5256 .. 0.7056] med 0.6156 dist [0.516 .. 0.696] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   CondA vs CondC             dir {"different":14,"similar":6} adjP [0.9495 .. 1.000] med 0.9840 dist [0.940 .. 0.990] forensic 6/20 gate 0/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   CondB vs CondC             dir {"different":15,"similar":5} adjP [0.9520 .. 1.000] med 0.9840 dist [0.942 .. 0.990] forensic 5/20 gate 0/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondA vs CondB             dir {"different":20}             adjP [0.01200 .. 0.06000] med 0.03000 dist [0.00200 .. 0.0500] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondA vs CondC             dir {"different":20}             adjP [0.6780 .. 0.8580] med 0.7710 dist [0.668 .. 0.848] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondB vs CondC             dir {"different":20}             adjP [0.1980 .. 0.4410] med 0.3285 dist [0.188 .. 0.431] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondA vs CondB             dir {"different":20}             adjP [0.01200 .. 0.03600] med 0.01800 dist [0.00200 .. 0.0260] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondA vs CondC             dir {"different":20}             adjP [0.8537 .. 1.000] med 0.9760 dist [0.844 .. 0.990] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondB vs CondC             dir {"different":20}             adjP [0.01200 .. 0.03600] med 0.01800 dist [0.00200 .. 0.0260] forensic 0/20 gate 0/20 FLAGS 0/20
      S2 P4 Residual SD            CondA vs CondB             dir {"different":20}             adjP [0.4937 .. 0.6171] med 0.5674 dist [0.484 .. 0.607] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P4 Residual SD            CondA vs CondC             dir {"different":20}             adjP [0.4937 .. 0.6171] med 0.5674 dist [0.484 .. 0.607] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P4 Residual SD            CondB vs CondC             dir {"similar":20}               adjP [0.4937 .. 0.6570] med 0.5712 dist [0.484 .. 0.647] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondA vs CondB             dir {"different":20}             adjP [0.4937 .. 0.6171] med 0.5674 dist [0.484 .. 0.607] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondA vs CondC             dir {"similar":20}               adjP [0.4937 .. 0.6570] med 0.5712 dist [0.484 .. 0.647] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondB vs CondC             dir {"different":20}             adjP [0.4937 .. 0.6171] med 0.5712 dist [0.484 .. 0.607] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondA vs CondB             dir {"similar":12,"different":8} adjP [0.9240 .. 1.000] med 0.9760 dist [0.914 .. 0.990] forensic 20/20 gate 8/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondA vs CondC             dir {"similar":20}               adjP [0.4937 .. 0.6570] med 0.5853 dist [0.484 .. 0.647] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondB vs CondC             dir {"similar":20}               adjP [0.5445 .. 0.7200] med 0.6435 dist [0.534 .. 0.710] forensic 20/20 gate 2/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondA vs CondB             dir {"similar":20}               adjP [0.5400 .. 0.6960] med 0.6220 dist [0.530 .. 0.686] forensic 20/20 gate 20/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondA vs CondC             dir {"similar":20}               adjP [0.6120 .. 0.7840] med 0.6880 dist [0.602 .. 0.774] forensic 20/20 gate 0/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondB vs CondC             dir {"similar":20}               adjP [0.5400 .. 0.6960] med 0.6220 dist [0.530 .. 0.686] forensic 20/20 gate 20/20 FLAGS 0/20

── 16-densitometry-carlisle-overbalanced.csv  (60 x 18, densitometry, sev 2) ──
   column-grouped ×3: Control, Treatment_A, Treatment_B; key row index (structural), 60 subjects
   VST log — slope=1.97, CI [1.63, 2.30] above 1 → inconclusive → assay fallback (densitometry) → log
   cost 0.09s per CCC run at B = 999; projected 0.1 min for 20 seeds x 2 nulls

   ARM free permutation (shipped)
      test primaryP: min 0.01800  median 0.03600  max 0.05400   flagging 0/20   flags seen: LOW
      per running unit (18); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   Control vs Treatment_A     dir {"similar":20}               adjP [0.2500 .. 0.3220] med 0.2900 dist [0.240 .. 0.312] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Control vs Treatment_B     dir {"similar":20}               adjP [0.05400 .. 0.09600] med 0.07800 dist [0.0440 .. 0.0860] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.2500 .. 0.3060] med 0.2740 dist [0.240 .. 0.296] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Treatment_A     dir {"similar":20}               adjP [0.1740 .. 0.2430] med 0.2100 dist [0.164 .. 0.233] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Treatment_B     dir {"similar":20}               adjP [0.07650 .. 0.1170] med 0.09000 dist [0.0665 .. 0.107] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.1980 .. 0.2740] med 0.2379 dist [0.188 .. 0.264] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Treatment_A     dir {"similar":20}               adjP [0.01800 .. 0.09000] med 0.04500 dist [0.00800 .. 0.0800] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Treatment_B     dir {"similar":20}               adjP [0.1740 .. 0.2376] med 0.2070 dist [0.164 .. 0.228] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.01800 .. 0.05400] med 0.03600 dist [0.00800 .. 0.0440] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Treatment_A     dir {"similar":20}               adjP [0.5920 .. 0.7060] med 0.6410 dist [0.582 .. 0.696] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Treatment_B     dir {"similar":20}               adjP [0.4063 .. 0.5085] med 0.4706 dist [0.396 .. 0.499] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.4050 .. 0.5010] med 0.4530 dist [0.395 .. 0.491] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Treatment_A     dir {"similar":20}               adjP [0.4050 .. 0.4824] med 0.4530 dist [0.395 .. 0.472] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Treatment_B     dir {"similar":20}               adjP [0.4050 .. 0.4824] med 0.4530 dist [0.395 .. 0.472] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.5085 .. 0.6030] med 0.5861 dist [0.499 .. 0.593] forensic 20/20 gate 19/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Treatment_A     dir {"different":20}             adjP [0.4020 .. 0.4824] med 0.4500 dist [0.392 .. 0.472] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Treatment_B     dir {"different":20}             adjP [0.4020 .. 0.4824] med 0.4500 dist [0.392 .. 0.472] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.09000 .. 0.4320] med 0.2520 dist [0.0800 .. 0.422] forensic 20/20 gate 20/20 FLAGS 0/20

   ARM within-subject relabel
      test primaryP: min 0.1620  median 0.2790  max 0.4680   flagging 0/20   flags seen: LOW
      per running unit (18); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   Control vs Treatment_A     dir {"similar":20}               adjP [0.6740 .. 0.7540] med 0.7030 dist [0.664 .. 0.744] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Control vs Treatment_B     dir {"similar":20}               adjP [0.3960 .. 0.6300] med 0.5490 dist [0.386 .. 0.620] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.6457 .. 0.7493] med 0.6940 dist [0.636 .. 0.739] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Treatment_A     dir {"similar":20}               adjP [0.6457 .. 0.7380] med 0.6919 dist [0.636 .. 0.728] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Treatment_B     dir {"similar":20}               adjP [0.4680 .. 0.6930] med 0.5940 dist [0.458 .. 0.683] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.6457 .. 0.7380] med 0.6919 dist [0.636 .. 0.728] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Treatment_A     dir {"similar":20}               adjP [0.6457 .. 0.7380] med 0.6919 dist [0.636 .. 0.728] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Treatment_B     dir {"different":20}             adjP [0.6457 .. 0.7380] med 0.6919 dist [0.636 .. 0.728] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.6457 .. 0.7380] med 0.6919 dist [0.636 .. 0.728] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Treatment_A     dir {"similar":20}               adjP [0.5920 .. 0.7080] med 0.6580 dist [0.582 .. 0.698] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Treatment_B     dir {"similar":20}               adjP [0.4346 .. 0.5426] med 0.4744 dist [0.425 .. 0.533] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.4110 .. 0.5370] med 0.4569 dist [0.401 .. 0.527] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Treatment_A     dir {"similar":20}               adjP [0.4110 .. 0.4860] med 0.4548 dist [0.401 .. 0.476] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Treatment_B     dir {"similar":20}               adjP [0.4110 .. 0.4860] med 0.4548 dist [0.401 .. 0.476] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.5355 .. 0.6278] med 0.5963 dist [0.525 .. 0.618] forensic 20/20 gate 9/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Treatment_A     dir {"different":20}             adjP [0.3780 .. 0.4860] med 0.4515 dist [0.368 .. 0.476] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Treatment_B     dir {"different":20}             adjP [0.3780 .. 0.4860] med 0.4515 dist [0.368 .. 0.476] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.1620 .. 0.4680] med 0.2790 dist [0.152 .. 0.458] forensic 20/20 gate 20/20 FLAGS 0/20

── summary, split by direction ──

   direction similar: 94 (fixture x unit x arm) records
      units flagging on at least one seed: 0
      six closest to ALPHA.NOTE by min adjP:
         16-densitometry-carlisle-overbalanced.csv free   S1 P3 CDF shape (KS)         min adjP 0.01800  dist 0.00800
         16-densitometry-carlisle-overbalanced.csv free   S1 P3 CDF shape (KS)         min adjP 0.01800  dist 0.00800
         11-rnaseq-multicondition.csv       free   S1 P3 CDF shape (KS)         min adjP 0.03600  dist 0.0260
         04-qpcr-fabricated.csv             free   S1 P1 Trimmed span (5–95%)   min adjP 0.05400  dist 0.0440
         16-densitometry-carlisle-overbalanced.csv free   S1 P1 Trimmed span (5–95%)   min adjP 0.05400  dist 0.0440
         11-rnaseq-multicondition.csv       free   S2 P4 Residual SD            min adjP 0.07200  dist 0.0620

   direction different: 44 (fixture x unit x arm) records
      units flagging on at least one seed: 0
      six closest to ALPHA.NOTE by min adjP:
         02-densitometry-fabricated.csv     free   S1 P1 Trimmed span (5–95%)   min adjP 0.003600  dist -0.00640
         02-densitometry-fabricated.csv     free   S1 P1 Trimmed span (5–95%)   min adjP 0.003600  dist -0.00640
         02-densitometry-fabricated.csv     free   S1 P3 CDF shape (KS)         min adjP 0.003600  dist -0.00640
         02-densitometry-fabricated.csv     free   S1 P3 CDF shape (KS)         min adjP 0.003600  dist -0.00640
         02-densitometry-fabricated.csv     free   S1 P3 CDF shape (KS)         min adjP 0.003600  dist -0.00640
         02-densitometry-fabricated.csv     paired S1 P1 Trimmed span (5–95%)   min adjP 0.003600  dist -0.00640

── movement free -> paired, per unit, split by direction ──
   "toward" = median adjP fell, i.e. the unit moved closer to flagging.

   direction similar: 40 units — 11 toward, 29 away, 0 unchanged
      02-densitometry-fabricated.csv     S2 P5 Residual lag-1 AC      Control vs Inhibitor_B     adjP med 0.9214 -> 0.7909  toward 0.130  contributes yes
      02-densitometry-fabricated.csv     S2 P5 Residual lag-1 AC      Inhibitor_A vs Inhibitor_B adjP med 0.9214 -> 0.7909  toward 0.130  contributes no (filtered)
      02-densitometry-fabricated.csv     S2 P6 Residual kurtosis      Control vs Inhibitor_A     adjP med 0.9214 -> 0.7909  toward 0.130  contributes yes
      02-densitometry-fabricated.csv     S2 P6 Residual kurtosis      Inhibitor_A vs Inhibitor_B adjP med 0.9214 -> 0.8088  toward 0.113  contributes yes
      02-densitometry-fabricated.csv     S2 P5 Residual lag-1 AC      Control vs Inhibitor_A     adjP med 0.6165 -> 0.5670  toward 0.0495  contributes yes
      closest any "toward" unit gets to ALPHA.NOTE under the corrected null: 0.1080 on 02-densitometry-fabricated.csv P2 — 10.8x the threshold

   direction different: 29 units — 9 toward, 15 away, 5 unchanged
      11-rnaseq-multicondition.csv       S1 P2 Dispersion (MAD)       CondA vs CondB             adjP med 0.9280 -> 0.03000  toward 0.898  contributes no (filtered)
      11-rnaseq-multicondition.csv       S1 P3 CDF shape (KS)         CondA vs CondB             adjP med 0.7530 -> 0.01800  toward 0.735  contributes no (filtered)
      11-rnaseq-multicondition.csv       S1 P3 CDF shape (KS)         CondB vs CondC             adjP med 0.7530 -> 0.01800  toward 0.735  contributes no (filtered)
      11-rnaseq-multicondition.csv       S1 P2 Dispersion (MAD)       CondB vs CondC             adjP med 0.8897 -> 0.3285  toward 0.561  contributes no (filtered)
      11-rnaseq-multicondition.csv       S1 P1 Trimmed span (5–95%)   CondA vs CondB             adjP med 0.9280 -> 0.6156  toward 0.312  contributes no (filtered)
      closest any "toward" unit gets to ALPHA.NOTE under the corrected null: 0.01800 on 11-rnaseq-multicondition.csv P3 — 1.80x the threshold

── did the corrected null GAIN any detection? ──
   none — no unit flags on more seeds under the within-subject relabel than under the shipped null.
```

## Run 2 — B forced to 9999, DS11 and DS16

Run to rule out the shipped lattice hiding movement. At `B = 499` with a Stage-1
family of nine, the reachable adjusted-p values near the threshold are coarse;
raising the count resolves them.

```bash
S350_B=9999 FILES=11-rnaseq-multicondition.csv,16-densitometry-carlisle-overbalanced.csv \
  node --import ./test/probes/s348-hash-hook.mjs \
       --import ./test/probes/s350-paired-null-hook.mjs \
       test/probes/probe-s350-classb-bound.mjs
```

```
[s350 hook] CCC per-unit capture armed; null switchable via __S350_PAIRED; B -> 9999 (in memory)
S350 Part 5 — bounding Class B
Phase 1: pairing rule of probe-s349-pairing-census.mjs applied across all 27 fixtures.

| fixture | sev | conditions | pairing key | subjects | paired | alignment |
|---|---|---|---|---|---|---|
| 01-densitometry-clean.csv | 0 | column-grouped ×3 | row index (structural) | 35 | yes | ok |
| 02-densitometry-fabricated.csv | 3 | column-grouped ×3 | row index (structural) | 35 | yes | ok |
| 03-qpcr-clean.csv | 0 | row-grouped ×2 | Target | 25 | yes | ok |
| 04-qpcr-fabricated.csv | 3 | row-grouped ×2 | Target | 25 | yes | ok |
| 05-cellcount-clean.csv | 0 | none | — | — | no | no conditions |
| 06-cellcount-fabricated.csv | 3 | none | — | — | no | no conditions |
| 07-elisa-clean.csv | 0 | none | — | — | no | no conditions |
| 08-elisa-fabricated.csv | 3 | none | — | — | no | no conditions |
| 09-proteomics-clean.csv | 0 | row-grouped ×2 | ProteinID | 200 | yes | ok |
| 10-proteomics-fabricated.csv | 3 | row-grouped ×2 | ProteinID | 200 | yes | ok |
| 11-rnaseq-multicondition.csv | 3 | row-grouped ×3 | GeneID | 500 | yes | ok |
| 12a-uniform-mixture-clean.csv | 0 | row-grouped ×2 | — | — | no | not fully paired |
| 12b-uniform-mixture-fabricated.csv | 1 | row-grouped ×2 | — | — | no | not fully paired |
| 13-vfstest-cellcountest.csv | 2 | none | — | — | no | no conditions |
| 14-crctest-survey.csv | 2 | none | — | — | no | no conditions |
| 15-missing-carlisle.csv | 3 | row-grouped ×2 | — | — | no | not fully paired |
| 16-densitometry-carlisle-overbalanced.csv | 2 | column-grouped ×3 | row index (structural) | 60 | yes | ok |
| 17-densitometry-carlisle-clean.csv | 0 | column-grouped ×3 | row index (structural) | 60 | yes | ok |
| 19-inheritance-fabricated.csv | 1 | row-grouped ×2 | — | — | no | not fully paired |
| 20-bimodal-fab.csv | 3 | row-grouped ×2 | — | — | no | not fully paired |
| 21-localised-ar.csv | 3 | row-grouped ×2 | — | — | no | not fully paired |
| 22-covariance-block.csv | 1 | row-grouped ×2 | — | — | no | not fully paired |
| 23-recurrence-null-mixed.csv | 3 | none | — | — | no | no conditions |
| 24-recurrence-null-control.csv | 3 | none | — | — | no | no conditions |
| vfs-a-pigeonhole-clear.csv | 0 | none | — | — | no | no conditions |
| vfs-b-recurrence-high.csv | 2 | none | — | — | no | no conditions |
| vfs-c-deeptail-high.csv | 2 | none | — | — | no | no conditions |

Paired AND fabricated (severity >= 1): 5
   02-densitometry-fabricated.csv  sev 3  column-grouped ×3  key row index (structural)  35 subjects  align ok
   04-qpcr-fabricated.csv  sev 3  row-grouped ×2  key Target  25 subjects  align ok
   10-proteomics-fabricated.csv  sev 3  row-grouped ×2  key ProteinID  200 subjects  align ok
   11-rnaseq-multicondition.csv  sev 3  row-grouped ×3  key GeneID  500 subjects  align ok
   16-densitometry-carlisle-overbalanced.csv  sev 2  column-grouped ×3  key row index (structural)  60 subjects  align ok

Paired AND clean, for reference: 4 — 01-densitometry-clean.csv, 03-qpcr-clean.csv, 09-proteomics-clean.csv, 17-densitometry-carlisle-clean.csv

Phase 2: 20 seeds x 2 nulls on 2 fixture(s).
Seeds: cells[(k * 7) % 2400] of 09-proteomics-clean.csv, nudge up on even k — the S348 Part 5 rule.
B: forced to 9999
ALPHA.NOTE = 0.01, ALPHA.FLAG = 0.001

── 11-rnaseq-multicondition.csv  (1500 x 4, genomics, sev 3) ──
   row-grouped ×3: CondA, CondB, CondC; key GeneID, 500 subjects
   VST log — slope=1.99, CI [1.97, 2.02] above 1 → inconclusive → assay fallback (genomics) → log
   cost 5.40s per CCC run at B = 9999; projected 3.6 min for 20 seeds x 2 nulls

   ARM free permutation (shipped)
      test primaryP: min 0.01980  median 0.03060  max 0.04320   flagging 0/20   flags seen: LOW
      per running unit (21); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   CondA vs CondB             dir {"similar":20}               adjP [0.9022 .. 0.9272] med 0.9111 dist [0.892 .. 0.917] forensic 20/20 gate 0/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   CondA vs CondC             dir {"similar":20}               adjP [0.6948 .. 0.7332] med 0.7174 dist [0.685 .. 0.723] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   CondB vs CondC             dir {"similar":20}               adjP [0.6948 .. 0.7332] med 0.7174 dist [0.685 .. 0.723] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondA vs CondB             dir {"different":20}             adjP [0.9022 .. 0.9272] med 0.9111 dist [0.892 .. 0.917] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondA vs CondC             dir {"similar":20}               adjP [0.6948 .. 0.7332] med 0.7174 dist [0.685 .. 0.723] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondB vs CondC             dir {"similar":20}               adjP [0.8923 .. 0.9212] med 0.9071 dist [0.882 .. 0.911] forensic 20/20 gate 0/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondA vs CondB             dir {"similar":20}               adjP [0.6948 .. 0.7332] med 0.7174 dist [0.685 .. 0.723] forensic 20/20 gate 0/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondA vs CondC             dir {"similar":20}               adjP [0.01980 .. 0.04320] med 0.03060 dist [0.00980 .. 0.0332] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondB vs CondC             dir {"similar":20}               adjP [0.6948 .. 0.7332] med 0.7174 dist [0.685 .. 0.723] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P4 Residual SD            CondA vs CondB             dir {"similar":20}               adjP [0.2459 .. 0.2819] med 0.2644 dist [0.236 .. 0.272] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            CondA vs CondC             dir {"similar":20}               adjP [0.2459 .. 0.2819] med 0.2644 dist [0.236 .. 0.272] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            CondB vs CondC             dir {"similar":20}               adjP [0.1548 .. 0.2268] med 0.1773 dist [0.145 .. 0.217] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondA vs CondB             dir {"different":20}             adjP [0.3845 .. 0.4021] med 0.3938 dist [0.375 .. 0.392] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondA vs CondC             dir {"similar":20}               adjP [0.3845 .. 0.4021] med 0.3938 dist [0.375 .. 0.392] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondB vs CondC             dir {"different":20}             adjP [0.4664 .. 0.4958] med 0.4803 dist [0.456 .. 0.486] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondA vs CondB             dir {"similar":20}               adjP [0.2769 .. 0.3114] med 0.2952 dist [0.267 .. 0.301] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondA vs CondC             dir {"similar":20}               adjP [0.2459 .. 0.2819] med 0.2644 dist [0.236 .. 0.272] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondB vs CondC             dir {"similar":20}               adjP [0.2459 .. 0.2819] med 0.2644 dist [0.236 .. 0.272] forensic 20/20 gate 20/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondA vs CondB             dir {"similar":20}               adjP [0.5805 .. 0.6327] med 0.6005 dist [0.571 .. 0.623] forensic 20/20 gate 20/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondA vs CondC             dir {"similar":20}               adjP [0.6558 .. 0.6852] med 0.6756 dist [0.646 .. 0.675] forensic 20/20 gate 0/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondB vs CondC             dir {"similar":20}               adjP [0.5805 .. 0.6327] med 0.6005 dist [0.571 .. 0.623] forensic 20/20 gate 20/20 FLAGS 0/20

   ARM within-subject relabel
      test primaryP: min 0.5626  median 0.5881  max 0.6009   flagging 0/20   flags seen: LOW
      per running unit (21); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   CondA vs CondB             dir {"different":20}             adjP [0.5900 .. 0.6350] med 0.6048 dist [0.580 .. 0.625] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   CondA vs CondC             dir {"different":20}             adjP [0.9788 .. 1.000] med 0.9902 dist [0.969 .. 0.990] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   CondB vs CondC             dir {"different":17,"similar":3} adjP [0.9788 .. 1.000] med 0.9902 dist [0.969 .. 0.990] forensic 3/20 gate 0/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondA vs CondB             dir {"different":20}             adjP [0.01200 .. 0.02100] med 0.01530 dist [0.00200 .. 0.0110] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondA vs CondC             dir {"different":20}             adjP [0.7281 .. 0.7650] med 0.7438 dist [0.718 .. 0.755] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       CondB vs CondC             dir {"different":20}             adjP [0.2920 .. 0.3254] med 0.3033 dist [0.282 .. 0.315] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondA vs CondB             dir {"different":20}             adjP [0.002700 .. 0.01500] med 0.009000 dist [-0.00730 .. 0.00500] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondA vs CondC             dir {"different":20}             adjP [0.9788 .. 0.9990] med 0.9902 dist [0.969 .. 0.989] forensic 0/20 gate 0/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         CondB vs CondC             dir {"different":20}             adjP [0.001800 .. 0.003600] med 0.001800 dist [-0.00820 .. -0.00640] forensic 0/20 gate 0/20 FLAGS 0/20
      S2 P4 Residual SD            CondA vs CondB             dir {"different":20}             adjP [0.5626 .. 0.6009] med 0.5881 dist [0.553 .. 0.591] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P4 Residual SD            CondA vs CondC             dir {"different":20}             adjP [0.5626 .. 0.6009] med 0.5881 dist [0.553 .. 0.591] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P4 Residual SD            CondB vs CondC             dir {"similar":20}               adjP [0.5626 .. 0.6009] med 0.5881 dist [0.553 .. 0.591] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondA vs CondB             dir {"different":20}             adjP [0.5626 .. 0.6009] med 0.5881 dist [0.553 .. 0.591] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondA vs CondC             dir {"similar":20}               adjP [0.5626 .. 0.6009] med 0.5881 dist [0.553 .. 0.591] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      CondB vs CondC             dir {"different":20}             adjP [0.5626 .. 0.6009] med 0.5881 dist [0.553 .. 0.591] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondA vs CondB             dir {"similar":20}               adjP [0.9584 .. 0.9954] med 0.9769 dist [0.948 .. 0.985] forensic 20/20 gate 0/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondA vs CondC             dir {"similar":20}               adjP [0.5626 .. 0.6009] med 0.5881 dist [0.553 .. 0.591] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      CondB vs CondC             dir {"similar":20}               adjP [0.6255 .. 0.6635] med 0.6442 dist [0.616 .. 0.654] forensic 20/20 gate 0/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondA vs CondB             dir {"similar":20}               adjP [0.6039 .. 0.6366] med 0.6205 dist [0.594 .. 0.627] forensic 20/20 gate 20/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondA vs CondC             dir {"similar":20}               adjP [0.6634 .. 0.7120] med 0.6946 dist [0.653 .. 0.702] forensic 20/20 gate 0/20 FLAGS 0/20
      S3 P9 Mean-variance slope    CondB vs CondC             dir {"similar":20}               adjP [0.6039 .. 0.6366] med 0.6205 dist [0.594 .. 0.627] forensic 20/20 gate 20/20 FLAGS 0/20

── 16-densitometry-carlisle-overbalanced.csv  (60 x 18, densitometry, sev 2) ──
   column-grouped ×3: Control, Treatment_A, Treatment_B; key row index (structural), 60 subjects
   VST log — slope=1.97, CI [1.63, 2.30] above 1 → inconclusive → assay fallback (densitometry) → log
   cost 0.92s per CCC run at B = 9999; projected 0.6 min for 20 seeds x 2 nulls

   ARM free permutation (shipped)
      test primaryP: min 0.02160  median 0.03420  max 0.04680   flagging 0/20   flags seen: LOW
      per running unit (18); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   Control vs Treatment_A     dir {"similar":20}               adjP [0.2736 .. 0.3010] med 0.2929 dist [0.264 .. 0.291] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Control vs Treatment_B     dir {"similar":20}               adjP [0.06060 .. 0.08580] med 0.07590 dist [0.0506 .. 0.0758] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.2736 .. 0.2976] med 0.2885 dist [0.264 .. 0.288] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Treatment_A     dir {"similar":20}               adjP [0.2100 .. 0.2415] med 0.2223 dist [0.200 .. 0.232] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Treatment_B     dir {"similar":20}               adjP [0.07830 .. 0.09360] med 0.08347 dist [0.0683 .. 0.0836] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.2289 .. 0.2523] med 0.2416 dist [0.219 .. 0.242] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Treatment_A     dir {"similar":20}               adjP [0.03330 .. 0.05580] med 0.04320 dist [0.0233 .. 0.0458] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Treatment_B     dir {"similar":20}               adjP [0.2038 .. 0.2304] med 0.2171 dist [0.194 .. 0.220] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.02160 .. 0.04680] med 0.03420 dist [0.0116 .. 0.0368] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Treatment_A     dir {"similar":20}               adjP [0.6228 .. 0.6604] med 0.6470 dist [0.613 .. 0.650] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Treatment_B     dir {"similar":20}               adjP [0.4431 .. 0.4778] med 0.4587 dist [0.433 .. 0.468] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.4356 .. 0.4734] med 0.4519 dist [0.426 .. 0.463] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Treatment_A     dir {"similar":20}               adjP [0.4356 .. 0.4734] med 0.4519 dist [0.426 .. 0.463] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Treatment_B     dir {"similar":20}               adjP [0.4356 .. 0.4734] med 0.4519 dist [0.426 .. 0.463] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.5450 .. 0.5830] med 0.5605 dist [0.535 .. 0.573] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Treatment_A     dir {"different":20}             adjP [0.4356 .. 0.4734] med 0.4519 dist [0.426 .. 0.463] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Treatment_B     dir {"different":20}             adjP [0.4356 .. 0.4734] med 0.4519 dist [0.426 .. 0.463] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.2016 .. 0.3258] med 0.2646 dist [0.192 .. 0.316] forensic 20/20 gate 20/20 FLAGS 0/20

   ARM within-subject relabel
      test primaryP: min 0.2322  median 0.2619  max 0.3078   flagging 0/20   flags seen: LOW
      per running unit (18); "dist" is adjP - ALPHA.NOTE, negative = flagging
      S1 P1 Trimmed span (5–95%)   Control vs Treatment_A     dir {"similar":20}               adjP [0.6952 .. 0.7222] med 0.7067 dist [0.685 .. 0.712] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Control vs Treatment_B     dir {"similar":20}               adjP [0.4752 .. 0.5715] med 0.5351 dist [0.465 .. 0.561] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P1 Trimmed span (5–95%)   Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.6952 .. 0.7222] med 0.7055 dist [0.685 .. 0.712] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Treatment_A     dir {"similar":20}               adjP [0.6952 .. 0.7222] med 0.7055 dist [0.685 .. 0.712] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Control vs Treatment_B     dir {"similar":20}               adjP [0.4752 .. 0.5778] med 0.5476 dist [0.465 .. 0.568] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P2 Dispersion (MAD)       Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.6952 .. 0.7222] med 0.7055 dist [0.685 .. 0.712] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Treatment_A     dir {"similar":20}               adjP [0.6952 .. 0.7222] med 0.7055 dist [0.685 .. 0.712] forensic 20/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Control vs Treatment_B     dir {"different":20}             adjP [0.6952 .. 0.7222] med 0.7055 dist [0.685 .. 0.712] forensic 0/20 gate 20/20 FLAGS 0/20
      S1 P3 CDF shape (KS)         Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.6952 .. 0.7222] med 0.7055 dist [0.685 .. 0.712] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Treatment_A     dir {"similar":20}               adjP [0.6456 .. 0.6786] med 0.6649 dist [0.636 .. 0.669] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Control vs Treatment_B     dir {"similar":20}               adjP [0.4531 .. 0.4999] med 0.4693 dist [0.443 .. 0.490] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P4 Residual SD            Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.4344 .. 0.4803] med 0.4642 dist [0.424 .. 0.470] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Treatment_A     dir {"similar":20}               adjP [0.4344 .. 0.4803] med 0.4642 dist [0.424 .. 0.470] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Control vs Treatment_B     dir {"similar":20}               adjP [0.4344 .. 0.4803] med 0.4642 dist [0.424 .. 0.470] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P5 Residual lag-1 AC      Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.5762 .. 0.6091] med 0.5896 dist [0.566 .. 0.599] forensic 20/20 gate 14/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Treatment_A     dir {"different":20}             adjP [0.4206 .. 0.4680] med 0.4422 dist [0.411 .. 0.458] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Control vs Treatment_B     dir {"different":20}             adjP [0.4206 .. 0.4680] med 0.4422 dist [0.411 .. 0.458] forensic 20/20 gate 20/20 FLAGS 0/20
      S2 P6 Residual kurtosis      Treatment_A vs Treatment_B dir {"similar":20}               adjP [0.2322 .. 0.3078] med 0.2619 dist [0.222 .. 0.298] forensic 20/20 gate 20/20 FLAGS 0/20

── summary, split by direction ──

   direction similar: 57 (fixture x unit x arm) records
      units flagging on at least one seed: 0
      six closest to ALPHA.NOTE by min adjP:
         11-rnaseq-multicondition.csv       free   S1 P3 CDF shape (KS)         min adjP 0.01980  dist 0.00980
         16-densitometry-carlisle-overbalanced.csv free   S1 P3 CDF shape (KS)         min adjP 0.02160  dist 0.0116
         16-densitometry-carlisle-overbalanced.csv free   S1 P3 CDF shape (KS)         min adjP 0.03330  dist 0.0233
         16-densitometry-carlisle-overbalanced.csv free   S1 P1 Trimmed span (5–95%)   min adjP 0.06060  dist 0.0506
         16-densitometry-carlisle-overbalanced.csv free   S1 P2 Dispersion (MAD)       min adjP 0.07830  dist 0.0683
         11-rnaseq-multicondition.csv       free   S2 P4 Residual SD            min adjP 0.1548  dist 0.145

   direction different: 21 (fixture x unit x arm) records
      units flagging on at least one seed: 0
      six closest to ALPHA.NOTE by min adjP:
         11-rnaseq-multicondition.csv       paired S1 P3 CDF shape (KS)         min adjP 0.001800  dist -0.00820
         11-rnaseq-multicondition.csv       paired S1 P3 CDF shape (KS)         min adjP 0.002700  dist -0.00730
         11-rnaseq-multicondition.csv       paired S1 P2 Dispersion (MAD)       min adjP 0.01200  dist 0.00200
         11-rnaseq-multicondition.csv       paired S1 P2 Dispersion (MAD)       min adjP 0.2920  dist 0.282
         11-rnaseq-multicondition.csv       free   S2 P5 Residual lag-1 AC      min adjP 0.3845  dist 0.375
         16-densitometry-carlisle-overbalanced.csv paired S2 P6 Residual kurtosis      min adjP 0.4206  dist 0.411

── movement free -> paired, per unit, split by direction ──
   "toward" = median adjP fell, i.e. the unit moved closer to flagging.

   direction similar: 23 units — 1 toward, 22 away, 0 unchanged
      16-densitometry-carlisle-overbalanced.csv S2 P6 Residual kurtosis      Treatment_A vs Treatment_B adjP med 0.2646 -> 0.2619  toward 0.00270  contributes yes
      16-densitometry-carlisle-overbalanced.csv S2 P4 Residual SD            Control vs Treatment_B     adjP med 0.4587 -> 0.4693  away 0.0105  contributes yes
      16-densitometry-carlisle-overbalanced.csv S2 P4 Residual SD            Treatment_A vs Treatment_B adjP med 0.4519 -> 0.4642  away 0.0123  contributes yes
      16-densitometry-carlisle-overbalanced.csv S2 P5 Residual lag-1 AC      Control vs Treatment_A     adjP med 0.4519 -> 0.4642  away 0.0123  contributes yes
      16-densitometry-carlisle-overbalanced.csv S2 P5 Residual lag-1 AC      Control vs Treatment_B     adjP med 0.4519 -> 0.4642  away 0.0123  contributes yes
      closest any "toward" unit gets to ALPHA.NOTE under the corrected null: 0.2619 on 16-densitometry-carlisle-overbalanced.csv P6 — 26.2x the threshold

   direction different: 16 units — 7 toward, 9 away, 0 unchanged
      11-rnaseq-multicondition.csv       S1 P2 Dispersion (MAD)       CondA vs CondB             adjP med 0.9111 -> 0.01530  toward 0.896  contributes no (filtered)
      11-rnaseq-multicondition.csv       S1 P3 CDF shape (KS)         CondB vs CondC             adjP med 0.7174 -> 0.001800  toward 0.716  contributes no (filtered)
      11-rnaseq-multicondition.csv       S1 P3 CDF shape (KS)         CondA vs CondB             adjP med 0.7174 -> 0.009000  toward 0.708  contributes no (filtered)
      11-rnaseq-multicondition.csv       S1 P2 Dispersion (MAD)       CondB vs CondC             adjP med 0.9071 -> 0.3033  toward 0.604  contributes no (filtered)
      11-rnaseq-multicondition.csv       S1 P1 Trimmed span (5–95%)   CondA vs CondB             adjP med 0.9111 -> 0.6048  toward 0.306  contributes no (filtered)
      closest any "toward" unit gets to ALPHA.NOTE under the corrected null: 0.001800 on 11-rnaseq-multicondition.csv P3 — 0.180x the threshold

── did the corrected null GAIN any detection? ──
   none — no unit flags on more seeds under the within-subject relabel than under the shipped null.
```
