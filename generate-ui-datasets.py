#!/usr/bin/env python3
"""Generate DS-UIclear and DS-UIflagged visual-QA datasets.
Outputs to test-data/ at project root.
Usage: python3 generate-ui-datasets.py
"""
import csv, math, os, random

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test-data")
os.makedirs(OUT, exist_ok=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def randn(rng):
    while True:
        u1, u2 = rng.random(), rng.random()
        if u1 > 0:
            return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)

def write_csv(path, rows):
    with open(path, "w", newline="") as f:
        csv.writer(f).writerows(rows)

def benford_sample(rng, n_decades=3, min_decade=1):
    """Draw a value whose leading digit distribution follows Benford's law exactly.
    Uses 3 complete integer log-decades (10^min_decade to 10^(min_decade+n_decades)).
    """
    # First: pick first digit d with probability log10((d+1)/d)
    u = rng.random()
    cumulative = 0.0
    d = 9  # fallback
    for digit in range(1, 10):
        cumulative += math.log10((digit + 1) / digit)
        if u <= cumulative:
            d = digit
            break
    # Second: pick magnitude (which decade) uniformly
    decade_exp = rng.randint(min_decade, min_decade + n_decades - 1)
    magnitude = 10 ** decade_exp
    # Third: pick mantissa uniformly within [d, d+1) on log scale
    mantissa = 10 ** rng.uniform(math.log10(d), math.log10(d + 1))
    return mantissa * magnitude


# ══════════════════════════════════════════════════════════════════════════════
# DS-UIclear  (seed 9901)
# Purpose: all applicable tests CLEAR/LOW, severity 0.
# Structure: 1-row header; COND (4 conditions); Rep1–Rep6; 30 rows/cond; 120 total.
# Rows shuffled (not condition-blocked).
#
# Key: benford_sample() forces exactly Benford-distributed first digits by
# construction (not sampling from log-uniform which gives wrong distribution
# unless the range is an exact integer number of decades).
# ══════════════════════════════════════════════════════════════════════════════

def gen_uiclear():
    rng = random.Random(9901)
    N_PER_COND = 30
    CONDS = ["CondA", "CondB", "CondC", "CondD"]
    N_REPS = 6
    CV = 0.15

    all_rows = []
    for cond in CONDS:
        for _ in range(N_PER_COND):
            # Exactly Benford-distributed base → Benford CLEAR regardless of seed
            base = benford_sample(rng, n_decades=3, min_decade=1)  # range 10–9999
            reps = []
            for _ in range(N_REPS):
                val = base * (1.0 + CV * randn(rng))
                reps.append(max(val, 0.01))
            all_rows.append((cond, reps))

    # Shuffle so rows are not condition-blocked
    rng.shuffle(all_rows)

    # Scatter ~22 missing cells (≈3% of 720 data cells) — no systematic pattern
    missing_positions = set()
    while len(missing_positions) < 22:
        r = rng.randint(0, len(all_rows) - 1)
        c = rng.randint(0, N_REPS - 1)
        missing_positions.add((r, c))

    header = ["COND"] + [f"Rep{j+1}" for j in range(N_REPS)]
    csv_rows = [header]
    for row_idx, (cond, reps) in enumerate(all_rows):
        cells = []
        for j, v in enumerate(reps):
            if (row_idx, j) in missing_positions:
                cells.append("")
            else:
                cells.append(f"{v:.2f}")
        csv_rows.append([cond] + cells)

    return csv_rows


# ══════════════════════════════════════════════════════════════════════════════
# DS-UIflagged  (seed 9902)
# Purpose: maximum test violations → severity CRITICAL.
# Structure: 4-cond COND column; 6 reps; 30 rows/cond.
# Row order: INTERLEAVED [A0,B0,C0,D0, A1,B1,C1,D1, ...] — appears shuffled
# while preserving within-condition row order for temporal tests.
#
# Noise architecture (two layers, avoids proportional model):
#   BASE NOISE  : flat SD_BASE=5 (independent of row mean) → MeanVar violation
#   LOESS LAYER : rows 15-29 per condition get additional N(0, SD_LOESS=55)
#                 → RegNoise / LOESS changepoint at row 14→15
#
# Fabrications:
#   DupDet        10 exact duplicates appended
#   ConstOffset   CondB rows 10–19 base += 80 (between-condition block additive offset)
#   CCD           CondC = CondA exactly (ALL 30 rows)
#   IRC           rows 5–25 per cond: Rep2 = Rep1 × 1.001
#   TermDigit     fix_terminal() removes any 0 or 5 as last decimal digit
#   Benford+2     12 base values — all first digits 5–9 → biased pool
#   DecPrec       alternating 1dp / 3dp rows
#   SelNoise      Rep5 noise × 0.03 globally
#   RegNoise+LOESS rows 15–29 per cond: SD increases 11× (from √5²+55² / 5 ≈ 11.2)
#   MissingData   block CondC rows 10–18 Rep4+5+6, pairwise 6 CondA Rep1+2,
#                 cond-dep CondD Rep3 15% vs 2%
#   Autocorr+Runs AR(1) φ=0.85 within each condition in row order
#   Kurtosis      CondB uniform noise instead of Gaussian
#   RowMeanRuns   CondA rows 0–14 base += 300, rows 15–29 base −= 140
#   MeanVar       flat SD_BASE=5 regardless of base value (52–6235 × 100 range)
#   WithinRowVar  rows 18–25 per cond: noise × 0.0005
#   Entropy       only 12 distinct base values → narrow value clusters
#   Mahalanobis   rows 25–27 per cond: Rep1 = base × 8
#   CrossCondRank CondB = CondA × 0.6 + ε (preserves replicate rank ordering)
#   RSC           CondA/CondB residuals proportional → correlated spikes
#   CrossCondDup  8 CondA rows appended as CondC (additional CCD signal)
#   Carlisle      low-priority (conflicts with CrossCondRank; expected LOW)
# ══════════════════════════════════════════════════════════════════════════════

def gen_uiflagged():
    rng = random.Random(9902)
    N_PER_COND = 30
    CONDS = ["CondA", "CondB", "CondC", "CondD"]
    N_REPS = 6

    # ── 12 base values: all first digits 5–9, none end in 0/5 → Benford + TDU
    # Range 51–6235 ≈ 2.09 log-decades; low entropy (only 12 distinct values)
    BASE_POOL = [51.0, 62.0, 73.0, 84.0, 97.0,
                 514.0, 625.0, 736.0, 847.0, 968.0,
                 5124.0, 6235.0]

    SD_BASE  = 5.0    # flat base noise (MeanVar violation: constant regardless of mean)
    SD_LOESS = 55.0   # additional noise for rows 15-29 (LOESS/RegNoise signal)
    PHI      = 0.85   # AR(1) coefficient (Autocorr/Runs signal)

    # AR(1) state per condition × replicate
    ar = {c: [0.0] * N_REPS for c in CONDS}

    def step_ar(cond, j):
        fresh = randn(rng)
        ar[cond][j] = PHI * ar[cond][j] + math.sqrt(1 - PHI**2) * fresh
        return ar[cond][j]

    # ── Per-condition row generation ─────────────────────────────────────
    cond_data = {c: [] for c in CONDS}

    # CondA first (CondB/CondC derived)
    for i in range(N_PER_COND):
        base_a = BASE_POOL[i % len(BASE_POOL)]

        # RowMeanRuns: first half above grand mean, second half below
        if i < 15:
            base_a += 300.0
        else:
            base_a -= 140.0
        base_a = max(base_a, 5.0)

        reps_a = []
        for j in range(N_REPS):
            ar_val = step_ar("CondA", j)

            # Flat base noise (MeanVar violation)
            noise = SD_BASE * ar_val

            # LOESS layer: extra noise in second half
            if i >= 15:
                noise += SD_LOESS * randn(rng)

            # SelNoise: Rep5 very quiet
            if j == 4:
                noise *= 0.03

            # WithinRowVar: rows 18-25 nearly constant reps
            if 18 <= i < 26:
                noise = SD_BASE * 0.0005 * randn(rng)

            # Mahalanobis: rows 25-27, Rep1 is extreme
            if 25 <= i < 28 and j == 0:
                noise = base_a * 7.5

            reps_a.append(base_a + noise)
        cond_data["CondA"].append((base_a, reps_a))

    # CondB: CrossCondRank via CondA × 0.6 + tiny perturbation
    for i in range(N_PER_COND):
        base_a, reps_a = cond_data["CondA"][i]
        base_b = base_a * 0.6

        reps_b = []
        for j in range(N_REPS):
            step_ar("CondB", j)   # advance AR state (Autocorr for CondB)
            # Scale CondA rep × 0.6 plus infinitesimal perturbation (preserves rank)
            tiny = 0.001 * randn(rng)
            rep = reps_a[j] * 0.6 + tiny

            # ConstOffset: CondB rows 10-19 get +80 (between-condition block offset)
            if 10 <= i < 20:
                rep += 80.0

            # SelNoise carried over
            if j == 4:
                rep = reps_a[j] * 0.6 * 0.03 + tiny

            reps_b.append(max(rep, 0.01))
        cond_data["CondB"].append((base_b, reps_b))

    # CondC: exact copy of CondA for ALL rows (CCD signal)
    for i in range(N_PER_COND):
        base_a, reps_a = cond_data["CondA"][i]
        cond_data["CondC"].append((base_a, list(reps_a)))
        step_ar("CondC", 0)  # advance state (not used for values, keeps RNG deterministic)

    # CondD: independent
    for i in range(N_PER_COND):
        base_d = BASE_POOL[i % len(BASE_POOL)] * 0.85
        reps_d = []
        for j in range(N_REPS):
            ar_val = step_ar("CondD", j)
            noise = SD_BASE * ar_val
            if i >= 15:
                noise += SD_LOESS * randn(rng)
            if j == 4:
                noise *= 0.03
            reps_d.append(max(base_d + noise, 0.01))
        cond_data["CondD"].append((base_d, reps_d))

    # ── Apply IRC: rows 5–25 per condition: Rep2 ≈ Rep1 × 1.001 ──────────
    for cond in CONDS:
        for i in range(5, 26):
            base, reps = cond_data[cond][i]
            reps[1] = reps[0] * 1.001 + 0.001
            cond_data[cond][i] = (base, reps)

    # ── Identify missing-data rows ────────────────────────────────────────
    pairwise_conda_rows = set(range(6))   # CondA rows 0-5: Rep1+Rep2 missing
    block_condc_rows    = set(range(10, 19))  # CondC rows 10-18: Rep4+5+6 missing

    # ── Terminal-digit avoidance ──────────────────────────────────────────
    def fix_terminal(v, prec):
        s = f"{v:.{prec}f}"
        parts = s.split(".")
        if len(parts) == 2 and parts[1]:
            ld = int(parts[1][-1])
            if ld in (0, 5):
                v2 = v + 10 ** (-prec)
                s = f"{v2:.{prec}f}"
                parts2 = s.split(".")
                if len(parts2) == 2 and parts2[1] and int(parts2[1][-1]) in (0, 5):
                    v2 += 10 ** (-prec)
                    s = f"{v2:.{prec}f}"
        return s

    # ── Build interleaved CSV ─────────────────────────────────────────────
    header = ["COND"] + [f"Rep{j+1}" for j in range(N_REPS)]
    csv_rows = [header]
    prec_toggle = [1, 3]  # DecPrec: strictly alternating 1dp / 3dp

    for slot in range(N_PER_COND):
        for ci, cond in enumerate(CONDS):
            _, reps = cond_data[cond][slot]
            prec = prec_toggle[(slot * 4 + ci) % 2]  # alternates each row

            formatted = []
            for j, v in enumerate(reps):
                is_missing = False

                if cond == "CondA" and slot in pairwise_conda_rows and j in (0, 1):
                    is_missing = True
                if cond == "CondC" and slot in block_condc_rows and j in (3, 4, 5):
                    is_missing = True
                if not is_missing and j == 2:
                    rate = 0.15 if cond == "CondD" else 0.02
                    if rng.random() < rate:
                        is_missing = True

                if is_missing:
                    formatted.append("")
                else:
                    formatted.append(fix_terminal(max(v, 0.01), prec))

            csv_rows.append([cond] + formatted)

    # ── CrossCondDup: 8 CondA rows relabelled CondC ───────────────────────
    conda_file_rows = [r for r in csv_rows[1:] if r[0] == "CondA"][:8]
    for src in conda_file_rows:
        dup = list(src)
        dup[0] = "CondC"
        csv_rows.append(dup)

    # ── DupDet: 10 exact duplicate rows ──────────────────────────────────
    for pos in [1, 5, 9, 13, 17, 21, 25, 29, 33, 37]:
        if pos < len(csv_rows):
            csv_rows.append(list(csv_rows[pos]))

    return csv_rows


# ── Generate and write ────────────────────────────────────────────────────────

clear_rows   = gen_uiclear()
flagged_rows = gen_uiflagged()

p_clear   = os.path.join(OUT, "ui-review-clear.csv")
p_flagged = os.path.join(OUT, "ui-review-flagged.csv")

write_csv(p_clear,   clear_rows)
write_csv(p_flagged, flagged_rows)

print(f"ui-review-clear.csv:   {len(clear_rows)-1} rows → {p_clear}")
print(f"ui-review-flagged.csv: {len(flagged_rows)-1} rows → {p_flagged}")
print("Done.")
