import csv
import random
import math
import os

random.seed(7741)  # new seed
OUT = "/tmp/dforensix-s108-fixtures"
os.makedirs(OUT, exist_ok=True)

def randn():
    u1 = random.random()
    u2 = random.random()
    return math.sqrt(-2*math.log(u1)) * math.cos(2*math.pi*u2)

def poisson(lam):
    L = math.exp(-min(lam, 700))
    k = 0; p = 1.0
    while True:
        k += 1; p *= random.random()
        if p < L: return k - 1

# ══════════════════════════════════════════════════════════════
# DATASET 1: Two-row header densitometry
# ══════════════════════════════════════════════════════════════

def gen_densitometry_clean():
    conds = ["Control", "Inhibitor_A", "Inhibitor_B"]
    n_rows = 35
    n_reps = 4
    row0 = [""]
    row1 = ["Residue"]
    for c in conds:
        row0.append(c); row0.extend([""] * (n_reps - 1))
        for ri in range(n_reps): row1.append(f"Rep{ri+1}")
    rows = [row0, row1]
    for i in range(1, n_rows + 1):
        row = [str(i)]
        for ci, c in enumerate(conds):
            base = 1.0 if c == "Control" else 0.6 if c == "Inhibitor_A" else 0.35
            residue_fx = 0.2 * math.sin(i * 0.25) + 0.08 * math.cos(i * 0.9)
            true_val = base + residue_fx
            for ri in range(n_reps):
                val = max(0.01, true_val + true_val * 0.12 * randn())
                row.append(f"{val:.4f}")
        rows.append(row)
    
    # --- blind modifications (may or may not be flaws) ---
    # Swap two replicate columns within Inhibitor_B for rows 8-14
    # to create an unusual but not necessarily fabricated pattern
    for i in range(8, 15):
        r = rows[i + 2]  # +2 for headers
        idx_b_r1 = 1 + 2*n_reps  # first col of Inhibitor_B
        idx_b_r2 = idx_b_r1 + 1
        r[idx_b_r1], r[idx_b_r2] = r[idx_b_r2], r[idx_b_r1]
    
    return rows

def gen_densitometry_fabricated():
    conds = ["Control", "Inhibitor_A", "Inhibitor_B"]
    n_rows = 35
    n_reps = 4
    row0 = [""]
    row1 = ["Residue"]
    for c in conds:
        row0.append(c); row0.extend([""] * (n_reps - 1))
        for ri in range(n_reps): row1.append(f"Rep{ri+1}")
    rows = [row0, row1]
    
    # Generate Control genuinely
    ctrl_data = []
    for i in range(1, n_rows + 1):
        base = 1.0 + 0.2 * math.sin(i * 0.25) + 0.08 * math.cos(i * 0.9)
        reps = [max(0.01, base + base * 0.12 * randn()) for _ in range(n_reps)]
        ctrl_data.append(reps)
    
    for i in range(n_rows):
        row = [str(i + 1)]
        for v in ctrl_data[i]: row.append(f"{v:.4f}")
        
        # Inhibitor_A: rescaled Control (preserves rank)
        for ri in range(n_reps):
            val = ctrl_data[i][ri] * 0.58 + 0.008 * randn()
            row.append(f"{val:.4f}")
        
        # Inhibitor_B: independently generated (genuinely different)
        base_b = 0.35 + 0.2 * math.sin((i+1) * 0.25) + 0.08 * math.cos((i+1) * 0.9)
        for ri in range(n_reps):
            val = max(0.01, base_b + base_b * 0.12 * randn())
            row.append(f"{val:.4f}")
        
        rows.append(row)
    
    # --- blind modifications ---
    splot = random.sample(range(n_rows), 5)
    for idx in splot:
        r = rows[idx + 2]
        src_start = 1  # Control columns
        tgt_start = 1 + 2 * n_reps  # Inhibitor_B columns
        for ri in range(n_reps):
            orig = float(r[src_start + ri])
            r[tgt_start + ri] = f"{orig * 0.35 + 0.002 * randn():.4f}"
    
    # Another subtle one: make Rep2 of Inhibitor_A a near-perfect 
    # function of Rep1 for a stretch
    for i in range(18, 28):
        r = rows[i + 2]
        r1_val = float(r[1 + n_reps])  # Inh_A Rep1
        r[1 + n_reps + 1] = f"{r1_val * 1.003 + 0.0015:.4f}"  # Rep2 ≈ Rep1 * 1.003
    
    return rows

# ══════════════════════════════════════════════════════════════
# DATASET 2: qPCR Ct values
# ══════════════════════════════════════════════════════════════

def gen_qpcr_clean():
    genes = [f"Gene{i:02d}" for i in range(1, 26)]
    conds = ["WT", "KO"]
    rows = [["ID", "Target", "Group", "Ct_1", "Ct_2", "Ct_3"]]
    n = 1
    for gene in genes:
        base_ct = random.uniform(14, 34)
        for cond in conds:
            shift = random.uniform(-2, 3) if cond == "KO" else 0
            true_ct = base_ct + shift
            reps = []
            for _ in range(3):
                ct = true_ct + 0.35 * randn()
                ct = max(10, min(40, ct))
                reps.append(f"{ct:.2f}")
            rows.append([f"S{n:03d}", gene, cond] + reps)
            n += 1
    
    # --- blind modification ---
    # A handful of values get an extra decimal place (3dp instead of 2dp)
    # simulating a minor data-entry inconsistency
    picks = random.sample(range(1, len(rows)), 6)
    for pi in picks:
        col = random.randint(3, 5)
        val = float(rows[pi][col])
        rows[pi][col] = f"{val:.3f}"
    
    return rows

def gen_qpcr_fabricated():
    genes = [f"Gene{i:02d}" for i in range(1, 26)]
    conds = ["WT", "KO"]
    rows = [["ID", "Target", "Group", "Ct_1", "Ct_2", "Ct_3"]]
    n = 1
    for gene in genes:
        base_ct = random.uniform(14, 34)
        for cond in conds:
            shift = random.uniform(-2, 3) if cond == "KO" else 0
            true_ct = base_ct + shift
            reps = []
            for _ in range(3):
                # Uniform noise (platykurtic)
                noise = random.uniform(-0.5, 0.5)
                ct = true_ct + noise
                ct = max(10, min(40, ct))
                ct_str = f"{ct:.2f}"
                # Digit avoidance: shift away from 0 and 5
                ld = int(ct_str[-1])
                if ld in (0, 5):
                    ct_str = f"{ct + 0.01:.2f}"
                reps.append(ct_str)
            rows.append([f"S{n:03d}", gene, cond] + reps)
            n += 1
    
    # --- blind modifications ---
    # Inject runs-test violation: for genes 10-18 (KO condition),
    # make all three reps consistently above or below the WT values
    # by biasing noise in one direction per gene
    for gi in range(9, 18):
        wt_row = 1 + gi * 2      # WT row (1-indexed)
        ko_row = wt_row + 1       # KO row
        bias = 0.4 if random.random() < 0.5 else -0.4
        for r in range(3):
            val = float(rows[ko_row][3 + r])
            rows[ko_row][3 + r] = f"{val + bias:.2f}"
    
    # Additional: duplicate 3 rows exactly (different samples, same Ct values)
    for src, tgt in [(3, 41), (7, 43), (11, 45)]:
        if tgt < len(rows) and src < len(rows):
            for r in range(3):
                rows[tgt][3 + r] = rows[src][3 + r]
    
    return rows

# ══════════════════════════════════════════════════════════════
# DATASET 3: Cell counts (integers)
# ══════════════════════════════════════════════════════════════

def gen_cellcount_clean():
    rows = [["Position", "Rep_A", "Rep_B", "Rep_C", "Rep_D"]]
    for i in range(1, 56):
        true_ct = random.randint(15, 600)
        reps = [str(poisson(true_ct)) for _ in range(4)]
        rows.append([f"P{i:03d}"] + reps)
    
    # --- blind modification ---
    # Nothing extra — this one is genuinely clean
    return rows

def gen_cellcount_fabricated():
    rows = [["Position", "Rep_A", "Rep_B", "Rep_C", "Rep_D"]]
    for i in range(1, 56):
        true_ct = random.randint(15, 600)
        reps = []
        for _ in range(4):
            # Wrong noise: constant SD=10 regardless of mean
            val = max(0, round(true_ct + 10 * randn()))
            reps.append(str(val))
        rows.append([f"P{i:03d}"] + reps)
    
    # --- blind modifications ---
    # Block of rows where Rep_C = Rep_A (exact duplicate column for a stretch)
    for i in range(22, 34):
        rows[i][3] = rows[i][1]  # Rep_C = Rep_A
    
    # A few rows with suspiciously round numbers (all ending in 0)
    for i in [8, 9, 10, 38, 39, 40]:
        for r in range(1, 5):
            val = int(rows[i][r])
            rows[i][r] = str(round(val / 10) * 10)
    
    return rows

# ══════════════════════════════════════════════════════════════
# DATASET 4: ELISA-style wide range
# ══════════════════════════════════════════════════════════════

def gen_elisa_clean():
    rows = [["Analyte", "Plate1", "Plate2", "Plate3"]]
    for i in range(1, 66):
        log_true = random.uniform(-1.2, 3.2)
        true_val = 10 ** log_true
        reps = []
        for _ in range(3):
            val = true_val * math.exp(0.11 * randn())
            if val > 100: reps.append(f"{val:.1f}")
            elif val > 10: reps.append(f"{val:.2f}")
            elif val > 1: reps.append(f"{val:.3f}")
            else: reps.append(f"{val:.4f}")
        rows.append([f"A{i:03d}"] + reps)
    
    # --- blind modification ---
    # Introduce a precision inconsistency in a few rows
    # (some values stored at 2dp when magnitude says they should be 3dp)
    for i in [12, 25, 44]:
        for r in range(1, 4):
            val = float(rows[i][r])
            if 1 < val < 10:
                rows[i][r] = f"{val:.2f}"
    
    return rows

def gen_elisa_fabricated():
    rows = [["Analyte", "Plate1", "Plate2", "Plate3"]]
    prev_res = [0.0, 0.0, 0.0]
    for i in range(1, 66):
        log_true = random.uniform(-1.2, 3.2)
        true_val = 10 ** log_true
        reps = []
        for r in range(3):
            # Autocorrelated residuals
            prev_res[r] = 0.55 * prev_res[r] + 0.09 * randn()
            val = true_val * math.exp(prev_res[r])
            if val > 100: reps.append(f"{val:.1f}")
            elif val > 10: reps.append(f"{val:.2f}")
            elif val > 1: reps.append(f"{val:.3f}")
            else: reps.append(f"{val:.4f}")
        rows.append([f"A{i:03d}"] + reps)
    
    # Benford violation: push leading digits away from 1,2 toward 6,7,8
    for i in range(1, 25):
        for r in range(1, 4):
            val = float(rows[i][r])
            s = f"{abs(val):.10f}".lstrip("0").replace(".", "")
            if s and int(s[0]) <= 3:
                val *= random.uniform(2.0, 3.0)
                if val > 100: rows[i][r] = f"{val:.1f}"
                elif val > 10: rows[i][r] = f"{val:.2f}"
                elif val > 1: rows[i][r] = f"{val:.3f}"
                else: rows[i][r] = f"{val:.4f}"
    
    # --- blind modifications ---
    # Constant offset block: Plate2 = Plate1 * 1.047 for rows 35-48
    for i in range(35, 49):
        p1 = float(rows[i][1])
        p2 = p1 * 1.047
        if p2 > 100: rows[i][2] = f"{p2:.1f}"
        elif p2 > 10: rows[i][2] = f"{p2:.2f}"
        elif p2 > 1: rows[i][2] = f"{p2:.3f}"
        else: rows[i][2] = f"{p2:.4f}"
    
    # Selective noise: Plate3 has artificially reduced variance for rows 50-64
    for i in range(50, min(65, len(rows))):
        p1 = float(rows[i][1])
        p2 = float(rows[i][2])
        avg = (p1 + p2) / 2
        rows[i][3] = f"{avg * (1 + 0.01 * randn()):.4f}"  # very tight around mean
    
    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 9: proteomics-clean.csv
# ══════════════════════════════════════════════════════════════

def gen_proteomics_clean():
    """Clean proteomics data: log-normal, CV~20%, 2-3 orders of magnitude.
    200 proteins, 2 conditions (Treatment/Vehicle), 6 reps each.
    Blind modification: 3 proteins with one outlier replicate (QC issue)."""
    rows = [["ProteinID", "Condition", "Rep1", "Rep2", "Rep3", "Rep4", "Rep5", "Rep6"]]
    n_proteins = 200
    n_reps = 6
    conds = ["Vehicle", "Treatment"]

    # Generate protein base abundances (log-normal, spanning ~2.5 orders of magnitude)
    protein_bases = []
    for i in range(n_proteins):
        log_base = random.uniform(1.0, 3.5)  # log10 scale: 10 to ~3000
        protein_bases.append(10 ** log_base)

    for i in range(n_proteins):
        base = protein_bases[i]
        # Small genuine fold-change for some proteins (biological variation)
        fc = 1.0 + 0.15 * randn()  # most proteins ~1.0, some up to ±30%
        fc = max(0.5, min(2.0, fc))

        for ci, cond in enumerate(conds):
            cond_base = base if cond == "Vehicle" else base * fc
            reps = []
            for _ in range(n_reps):
                val = cond_base * math.exp(0.20 * randn())  # CV ~20%
                val = max(0.1, val)
                reps.append(f"{val:.2f}")
            rows.append([f"P{i+1:04d}", cond] + reps)

    # --- blind modification: 3 proteins with one outlier replicate (QC issue) ---
    outlier_proteins = [15, 80, 150]  # 0-indexed
    for pi in outlier_proteins:
        for ci in range(2):  # both conditions
            row_idx = 1 + pi * 2 + ci  # +1 for header
            rep_to_hit = random.randint(2, 7)  # column index (2-7 = Rep1-Rep6)
            orig = float(rows[row_idx][rep_to_hit])
            # QC outlier: 3-5x off
            rows[row_idx][rep_to_hit] = f"{orig * random.uniform(3.0, 5.0):.2f}"

    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 10: proteomics-fabricated.csv
# ══════════════════════════════════════════════════════════════

def gen_proteomics_fabricated():
    """Fabricated proteomics: multiple planted flaws.
    1. 15 proteins with inflated fold-changes (2-3x inflation)
    2. 10 rows with copy-paste from another row (Mahalanobis target)
    3. Rows 80-120: smoothed noise (LOESS target)
    4. Second-digit avoidance of 0 (digit fabrication target)"""
    rows = [["ProteinID", "Condition", "Rep1", "Rep2", "Rep3", "Rep4", "Rep5", "Rep6"]]
    n_proteins = 200
    n_reps = 6
    conds = ["Vehicle", "Treatment"]

    protein_bases = []
    for i in range(n_proteins):
        log_base = random.uniform(1.0, 3.5)
        protein_bases.append(10 ** log_base)

    # Track which proteins get inflated fold-changes
    inflated_proteins = sorted(random.sample(range(n_proteins), 15))
    # Track which rows get copy-pasted (Mahalanobis targets)
    copypaste_proteins = sorted(random.sample(
        [p for p in range(n_proteins) if p not in inflated_proteins], 10))

    for i in range(n_proteins):
        base = protein_bases[i]
        # Genuine small fold-change
        fc = 1.0 + 0.15 * randn()
        fc = max(0.5, min(2.0, fc))

        # Inflate fold-change for selected proteins
        if i in inflated_proteins:
            inflation = random.uniform(2.0, 3.0)
            fc = fc * inflation  # push Treatment further from Vehicle

        for ci, cond in enumerate(conds):
            cond_base = base if cond == "Vehicle" else base * fc

            # Rows 80-120: reduced noise (smoothed — LOESS target)
            if 80 <= i <= 120:
                cv = 0.10  # half the normal CV
            else:
                cv = 0.20

            reps = []
            for _ in range(n_reps):
                val = cond_base * math.exp(cv * randn())
                val = max(0.1, val)
                reps.append(f"{val:.2f}")
            rows.append([f"P{i+1:04d}", cond] + reps)

    print(f"  DS10 inflated FC proteins (0-idx): {inflated_proteins}")
    print(f"  DS10 copy-paste proteins (0-idx): {copypaste_proteins}")

    # --- Flaw 2: copy-paste rows (Mahalanobis target) ---
    # For each copy-paste protein, replace Treatment row reps with values
    # from a different protein's Vehicle row
    for pi in copypaste_proteins:
        treatment_row_idx = 1 + pi * 2 + 1  # Treatment row
        # Pick a source protein (different protein's Vehicle row)
        source_pi = (pi + 50) % n_proteins
        source_row_idx = 1 + source_pi * 2  # Vehicle row
        for r in range(n_reps):
            rows[treatment_row_idx][2 + r] = rows[source_row_idx][2 + r]

    # --- Flaw 4: second-digit avoidance of 0 ---
    # For all values, if second significant digit is 0, bump it to 1
    for i in range(1, len(rows)):
        for c in range(2, 2 + n_reps):
            val_str = rows[i][c]
            val = float(val_str)
            # Extract significant digits
            if val > 0:
                sig = f"{val:.10e}"  # scientific notation
                # Get the mantissa digits
                mantissa = sig.split("e")[0].replace(".", "").replace("-", "")
                mantissa = mantissa.lstrip("0")
                if len(mantissa) >= 2 and mantissa[1] == "0":
                    # Bump the value slightly to change second digit
                    # Add ~1% to push second digit from 0 to 1
                    bump = val * 0.012
                    val = val + bump
                    rows[i][c] = f"{val:.2f}"

    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 11: rnaseq-multicondition.csv
# ══════════════════════════════════════════════════════════════

def gen_rnaseq_multicondition():
    """Multi-condition RNA-seq-like dataset: 500 genes, 3 conditions, 4 reps each.
    Planted flaws:
    1. 20 genes with correlated residual spikes across all conditions
    2. 30 genes with inflated fold-changes in CondB only"""
    rows = [["GeneID", "Condition", "Rep1", "Rep2", "Rep3", "Rep4"]]
    n_genes = 500
    n_reps = 4
    conds = ["CondA", "CondB", "CondC"]

    # Track planted flaw targets
    correlated_spike_genes = sorted(random.sample(range(n_genes), 20))
    inflated_fc_genes = sorted(random.sample(
        [g for g in range(n_genes) if g not in correlated_spike_genes], 30))

    print(f"  DS11 correlated-spike genes (0-idx): {correlated_spike_genes}")
    print(f"  DS11 inflated FC genes (0-idx, CondB): {inflated_fc_genes}")

    gene_bases = []
    for i in range(n_genes):
        # Log-normal base expression spanning ~3 orders of magnitude
        log_base = random.uniform(0.5, 3.5)
        gene_bases.append(10 ** log_base)

    for i in range(n_genes):
        base = gene_bases[i]

        # Pre-generate a shared residual spike pattern for correlated-spike genes
        if i in correlated_spike_genes:
            # Same residual pattern across conditions (one rep is spiked)
            spike_rep = random.randint(0, n_reps - 1)
            spike_magnitude = random.uniform(2.0, 4.0) * random.choice([-1, 1])
        else:
            spike_rep = None

        for ci, cond in enumerate(conds):
            # Small genuine fold-change between conditions
            if cond == "CondA":
                fc = 1.0
            elif cond == "CondB":
                fc = 1.0 + 0.1 * randn()
                fc = max(0.7, min(1.5, fc))
                # Inflate fold-change for selected genes in CondB
                if i in inflated_fc_genes:
                    fc = fc * random.uniform(2.5, 4.0)
            else:
                fc = 1.0 + 0.08 * randn()
                fc = max(0.7, min(1.3, fc))

            cond_base = base * fc

            reps = []
            for r in range(n_reps):
                val = cond_base * math.exp(0.25 * randn())  # CV ~25%
                val = max(0.1, val)

                # Flaw 1: correlated residual spike at same rep across all conditions
                if spike_rep is not None and r == spike_rep:
                    val = val * (1.0 + spike_magnitude * 0.3)
                    val = max(0.1, val)

                reps.append(f"{val:.1f}")
            rows.append([f"G{i+1:05d}", cond] + reps)

    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 12: Uniform mixture fabrication (kurtosis stratification target)
# Single COND column: Genuine vs Fabricated
# Fabricated condition: uniform RNG mimicking real range
# Purpose: validate condition-stratified kurtosis promotion to MODERATE
# Expected: κDev ≈ 0 (Genuine), κDev ≈ -1.2 (Fabricated), spread >> 0.5
# ══════════════════════════════════════════════════════════════

def gen_uniform_mixture_clean():
    """
    Clean comparator: both conditions are genuine log-normal noise.
    Expected: CLEAN or MINOR — no condition-stratified kurtosis signal.
    n_reps=6 to avoid artefactual platykurtosis from per-row sigma normalisation at n_reps<=4.
    """
    n_rows = 200
    n_reps = 6
    conds = ["CondA", "CondB"]
    header = ["sample_id", "condition"] + [f"rep{i+1}" for i in range(n_reps)]
    rows = [header]
    sid = 1
    for cond in conds:
        for i in range(n_rows):
            base = math.exp(3.0 + 0.8 * randn())  # log-normal, range ~5–1000
            reps = [max(0.1, base * math.exp(0.18 * randn())) for _ in range(n_reps)]
            rows.append([str(sid), cond] + [f"{v:.2f}" for v in reps])
            sid += 1
    return rows

def gen_uniform_mixture_fabricated():
    """
    Fabricated condition: same mean structure as Genuine, but replicate noise is uniform.
    This is the Ariely/Cambria pattern — uniform RNG noise masquerading as measurement error.

    KEY DESIGN PRINCIPLE: both conditions share the same base means (per-row true values).
    Only the noise distribution differs:
      - Genuine: log-normal multiplicative noise (CV ~18%), κDev ≈ 0 in residual space
      - Fabricated: uniform noise ±40% around the same base, κDev ≈ -1.2 in residual space

    This isolates the kurtosis signal from confounds:
    - Shared mean structure → mean-variance regression fit is valid for both conditions
    - Per-row mean normalization produces comparable residuals across conditions
    - Platykurtosis in Fabricated is a property of the noise model, not the mean distribution

    Contrast with previous design (v1): Fabricated drew from global uniform(min,max), which
    gave Fabricated a flat mean distribution (different from Genuine's log-normal means),
    corrupting the mean-variance fit and producing artefactual leptokurtosis in both conditions.

    Expected detections:
    - Kurtosis (condition-stratified): Fabricated κDev << -0.5 [PLAT], Genuine ≈ 0 → MODERATE
    - Selective Noise: Fabricated noise is non-proportional → possible flag
    - Terminal Digit: uniform noise produces flatter digit distribution → possible
    - Benford 1st: shared means preserve Benford-conforming leading digits → likely LOW
    - Overall: MODERATE or SERIOUS (kurtosis is primary signal)
    """
    n_rows = 200
    n_reps = 6
    header = ["sample_id", "condition"] + [f"rep{i+1}" for i in range(n_reps)]
    rows = [header]
    sid = 1

    # Generate shared base means — log-normal, same as DS12a
    bases = [math.exp(3.0 + 0.8 * randn()) for _ in range(n_rows)]

    # Genuine condition: proportional log-normal noise (same as DS12a)
    for i in range(n_rows):
        base = bases[i]
        reps = [max(0.1, base * math.exp(0.18 * randn())) for _ in range(n_reps)]
        rows.append([str(sid), "Genuine"] + [f"{v:.2f}" for v in reps])
        sid += 1

    # Fabricated condition: same base means, but uniform noise ±40% of base
    # This mimics a human entering values near a "true" value by RNG —
    # the per-row mean is plausible, but the noise distribution is too flat.
    for i in range(n_rows):
        base = bases[i]
        lo = base * 0.60
        hi = base * 1.40
        reps = [round(random.uniform(lo, hi), 2) for _ in range(n_reps)]
        rows.append([str(sid), "Fabricated"] + [f"{v:.2f}" for v in reps])
        sid += 1

    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 15: Missing data patterns + (no Carlisle — see DS16)
# ══════════════════════════════════════════════════════════════

def gen_missing_data():
    """
    Clean underlying data with three planted missingness signals:
    (c) Block missingness: Treatment rows 41-52, Rep3/4/5 — 12×3 block all NaN
    (b) Condition-dependent: Rep6 ~15% missing in Treatment vs ~2.5% in Control
    (a) Pairwise column association: 8 Control rows with both Rep1 AND Rep2 missing

    Base data is clean proportional Gaussian — no fabrication signals for existing tests.
    Treatment and Control share the same population mean (not forced sample match).
    Overall missing rate ~7.7%.
    """
    n_rows = 80
    n_reps = 6
    header = ["sample_id", "condition"] + [f"rep{i+1}" for i in range(n_reps)]
    rows = [header]
    sid = 1

    for cond in ["Control", "Treatment"]:
        for i in range(n_rows):
            base = 50 + 150 * random.random()  # range 50-200
            reps = [max(0.01, base * (1 + 0.15 * randn())) for _ in range(n_reps)]
            row = [str(sid), cond] + [f"{v:.2f}" for v in reps]
            rows.append(row)
            sid += 1

    # Now plant missingness signals on the completed data
    # Row indices in rows[] are 1-indexed (row 0 = header)
    # Control = rows 1..80, Treatment = rows 81..160

    # (c) Block missingness: Treatment rows 41-52 (absolute rows 121-132), Rep3/4/5 (cols 4,5,6)
    for r in range(121, 133):  # rows 121-132 inclusive
        for c in [4, 5, 6]:   # Rep3, Rep4, Rep5 (0=sid, 1=cond, 2=rep1, ...)
            rows[r][c] = ""

    # (b) Condition-dependent missingness in Rep6 (col index 7)
    # Treatment: ~15% missing (12 random rows outside block region)
    # Pick rows that don't overlap with the block (avoid rows 121-132)
    trt_rep6_missing = random.sample(
        [r for r in range(81, 161) if r < 121 or r > 132], 12
    )
    for r in trt_rep6_missing:
        rows[r][7] = ""

    # Control: ~2.5% missing in Rep6 (2 random rows)
    ctrl_rep6_missing = random.sample(range(1, 81), 2)
    for r in ctrl_rep6_missing:
        rows[r][7] = ""

    # (a) Pairwise association: 8 Control rows with BOTH Rep1 AND Rep2 missing
    # No rows where only one of Rep1/Rep2 is missing
    pairwise_rows = random.sample(
        [r for r in range(1, 81) if r not in ctrl_rep6_missing], 8
    )
    for r in pairwise_rows:
        rows[r][2] = ""  # Rep1
        rows[r][3] = ""  # Rep2

    # Background MCAR: ~8 additional scattered missing cells in Rep3-Rep6
    mcar_candidates = []
    for r in range(1, 161):
        for c in [4, 5, 6, 7]:  # Rep3-Rep6
            if rows[r][c] != "":  # don't overwrite existing missingness
                mcar_candidates.append((r, c))
    mcar_cells = random.sample(mcar_candidates, 8)
    for r, c in mcar_cells:
        rows[r][c] = ""

    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 16: Carlisle baseline balance — over-balanced fabrication
# ══════════════════════════════════════════════════════════════

def gen_carlisle_overbalanced():
    """DS16: Positive case for Carlisle Baseline Balance test.

    Column-grouped (two-row header), 3 conditions × 6 reps, 60 features.
    Accept-reject fabrication: generate genuine i.i.d. Normal draws for all
    conditions, but cherry-pick rows where ANOVA p > 0.8 (biased toward
    over-balance). Each value is a genuine Normal draw — the only artifact
    is selection bias in which rows were "kept."

    3 conditions needed (not 2) because preprocessRaw's sparsity gate drops
    rows with <3 non-empty cells. "Condition" label in cell [0][0] adds a
    third non-empty cell.

    Feature labels are strings (F1, F2...) not integers to prevent
    inferRoles from classifying them as DATA.

    Mean range 150-500 keeps robustLogSpan < 1.0 so Benford gates out
    (Normal draws don't follow Benford's law).

    Uses independent seed (333) via separate Random instance.

    Expected: severity 2 (Baseline Balance HIGH only). All other tests CLEAN.

    Design evolution: Mean-shift (Treatment centered on Control mean) created
    correlation artifacts (CrossRank, Autocorrelation). Accept-reject isolates
    Carlisle signal cleanly — the most realistic fabrication model.
    """
    rng = random.Random(333)
    conds = ["Control", "Treatment_A", "Treatment_B"]
    n_rows = 60
    n_reps = 6
    cv = 0.15
    n_target_high = 48

    def _randn(r):
        u1 = r.random()
        u2 = r.random()
        return math.sqrt(-2*math.log(u1)) * math.cos(2*math.pi*u2)

    def _anova_p(groups):
        """One-way ANOVA p-value using regularized incomplete beta."""
        k = len(groups)
        all_vals = [v for g in groups for v in g]
        N = len(all_vals)
        gm = sum(all_vals) / N
        ssB = sum(len(g) * (sum(g)/len(g) - gm)**2 for g in groups)
        ssW = sum((v - sum(g)/len(g))**2 for g in groups for v in g)
        dfB = k - 1
        dfW = N - k
        if dfW <= 0 or ssW == 0:
            return None
        F = (ssB / dfB) / (ssW / dfW)
        x = dfB * F / (dfB * F + dfW)
        return 1.0 - _reg_inc_beta(dfB/2, dfW/2, x)

    def _reg_inc_beta(a, b, x):
        """Regularized incomplete beta via continued fraction (Lentz)."""
        if x < 0 or x > 1:
            return 0.0
        if x == 0:
            return 0.0
        if x == 1:
            return 1.0
        # Use symmetry relation when x > (a+1)/(a+b+2)
        if x > (a + 1) / (a + b + 2):
            return 1.0 - _reg_inc_beta(b, a, 1.0 - x)
        # Log of the beta-function prefix
        lbeta = (math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b))
        front = math.exp(a * math.log(x) + b * math.log(1-x) - lbeta) / a
        # Lentz's continued fraction
        f = 1.0; c = 1.0; d = 1.0 - (a+b)*x/(a+1)
        if abs(d) < 1e-30: d = 1e-30
        d = 1.0 / d; f = d
        for m in range(1, 200):
            # Even step
            num = m * (b - m) * x / ((a + 2*m - 1) * (a + 2*m))
            d = 1.0 + num * d
            if abs(d) < 1e-30: d = 1e-30
            c = 1.0 + num / c
            if abs(c) < 1e-30: c = 1e-30
            d = 1.0 / d; f *= d * c
            # Odd step
            num = -(a + m) * (a + b + m) * x / ((a + 2*m) * (a + 2*m + 1))
            d = 1.0 + num * d
            if abs(d) < 1e-30: d = 1e-30
            c = 1.0 + num / c
            if abs(c) < 1e-30: c = 1e-30
            d = 1.0 / d
            delta = d * c; f *= delta
            if abs(delta - 1.0) < 1e-10:
                break
        return front * f

    # Two-row header with "Condition" label for sparsity gate
    row0 = ["Condition"]
    row1 = ["Feature"]
    for c in conds:
        row0.append(c); row0.extend([""] * (n_reps - 1))
        for ri in range(n_reps): row1.append(f"Rep{ri+1}")

    rows = [row0, row1]
    above95 = 0

    for i in range(n_rows):
        mu = 150 + rng.random() * 350  # range 150-500
        sd = mu * cv

        normal_slots_left = 12 - (i - above95)
        need_high = above95 < n_target_high and normal_slots_left <= 0

        if need_high:
            best = None; best_p = -1
            for _ in range(3000):
                c = [mu + sd * _randn(rng) for _ in range(n_reps)]
                a = [mu + sd * _randn(rng) for _ in range(n_reps)]
                b = [mu + sd * _randn(rng) for _ in range(n_reps)]
                p = _anova_p([c, a, b])
                if p is not None and p > best_p:
                    best_p = p; best = c + a + b
                if p is not None and p > 0.95:
                    break
            vals = [max(10, v) for v in best]
            rows.append([f"F{i+1}"] + [f"{v:.2f}" for v in vals])
            if best_p > 0.95: above95 += 1
        else:
            c = [mu + sd * _randn(rng) for _ in range(n_reps)]
            a = [mu + sd * _randn(rng) for _ in range(n_reps)]
            b = [mu + sd * _randn(rng) for _ in range(n_reps)]
            vals = [max(10, v) for v in c + a + b]
            rows.append([f"F{i+1}"] + [f"{v:.2f}" for v in vals])
            p = _anova_p([c, a, b])
            if p is not None and p > 0.95: above95 += 1

    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 17: Carlisle baseline balance — clean comparator
# ══════════════════════════════════════════════════════════════

def gen_carlisle_clean():
    """DS17: Clean comparator for DS16.

    Same structure (column-grouped, 3 conditions × 6 reps, 60 features) but
    with genuinely independent data. ~30% of features have real fold-changes
    (0.6-1.4×), ~70% share the same population mean with independent noise.
    ANOVA p-values approximately uniform — no excess near 1.0.

    Uses independent seed (77) via separate Random instance.

    Expected: CLEAN (severity 0). Carlisle non-significant.
    """
    rng = random.Random(77)
    conds = ["Control", "Treatment_A", "Treatment_B"]
    n_rows = 60
    n_reps = 6
    cv = 0.15

    def _randn(r):
        u1 = r.random()
        u2 = r.random()
        return math.sqrt(-2*math.log(u1)) * math.cos(2*math.pi*u2)

    # Two-row header with "Condition" label for sparsity gate
    row0 = ["Condition"]
    row1 = ["Feature"]
    for c in conds:
        row0.append(c); row0.extend([""] * (n_reps - 1))
        for ri in range(n_reps): row1.append(f"Rep{ri+1}")

    rows = [row0, row1]

    for i in range(n_rows):
        mu = 150 + rng.random() * 350  # range 150-500
        sd = mu * cv
        row_vals = []

        # Control
        c = [mu + sd * _randn(rng) for _ in range(n_reps)]
        row_vals.extend(c)

        # Treatment_A: ~30% real effect, ~70% same population
        muA = mu * (0.6 + rng.random() * 0.8) if rng.random() < 0.3 else mu
        a = [max(10, muA + sd * _randn(rng)) for _ in range(n_reps)]
        row_vals.extend(a)

        # Treatment_B: ~30% real effect, ~70% same population
        muB = mu * (0.6 + rng.random() * 0.8) if rng.random() < 0.3 else mu
        b = [max(10, muB + sd * _randn(rng)) for _ in range(n_reps)]
        row_vals.extend(b)

        vals = [max(10, v) for v in row_vals]
        rows.append([f"F{i+1}"] + [f"{v:.2f}" for v in vals])

    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 16: Carlisle baseline balance — over-balanced fabrication
# ══════════════════════════════════════════════════════════════

def gen_carlisle_overbalanced():
    """DS16: 60 features x 2 conditions (column-grouped), 4 reps each.
    Rows 1-48: Treatment centered on observed Control sample mean.
    Rows 49-60: genuine fold-changes (0.7-1.3x).
    """
    conds = ["Control", "Treatment"]
    n_rows = 60
    n_reps = 4
    n_balanced = 48

    row0 = [""]
    row1 = ["Feature"]
    for c in conds:
        row0.append(c); row0.extend([""] * (n_reps - 1))
        for ri in range(n_reps): row1.append(f"Rep{ri+1}")

    rows = [row0, row1]

    for i in range(1, n_rows + 1):
        base = 20 + 480 * random.random()
        row = [str(i)]

        ctrl_vals = [max(0.01, base * (1 + 0.12 * randn())) for _ in range(n_reps)]
        for v in ctrl_vals:
            row.append(f"{v:.2f}")

        ctrl_mean = sum(ctrl_vals) / n_reps

        if i <= n_balanced:
            trt_vals = [max(0.01, ctrl_mean * (1 + 0.12 * randn())) for _ in range(n_reps)]
        else:
            effect = 0.7 + 0.6 * random.random()
            trt_base = base * effect
            trt_vals = [max(0.01, trt_base * (1 + 0.12 * randn())) for _ in range(n_reps)]

        for v in trt_vals:
            row.append(f"{v:.2f}")

        rows.append(row)

    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 17: Carlisle baseline balance — clean (genuine effects)
# ══════════════════════════════════════════════════════════════

def gen_carlisle_clean():
    """DS17: Same structure as DS16, genuine independent Treatment data.
    ~30% real fold-changes, ~70% same population mean, all independent noise.
    """
    conds = ["Control", "Treatment"]
    n_rows = 60
    n_reps = 4

    row0 = [""]
    row1 = ["Feature"]
    for c in conds:
        row0.append(c); row0.extend([""] * (n_reps - 1))
        for ri in range(n_reps): row1.append(f"Rep{ri+1}")

    rows = [row0, row1]

    for i in range(1, n_rows + 1):
        base = 20 + 480 * random.random()
        row = [str(i)]

        ctrl_vals = [max(0.01, base * (1 + 0.12 * randn())) for _ in range(n_reps)]
        for v in ctrl_vals:
            row.append(f"{v:.2f}")

        if random.random() < 0.3:
            effect = 0.7 + 0.6 * random.random()
        else:
            effect = 1.0
        trt_base = base * effect
        trt_vals = [max(0.01, trt_base * (1 + 0.12 * randn())) for _ in range(n_reps)]

        for v in trt_vals:
            row.append(f"{v:.2f}")

        rows.append(row)

    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 19: Inheritance fabrication (Track D Stage 1 calibration)
# ══════════════════════════════════════════════════════════════

def gen_inheritance_fabricated():
    """DS19: Row-grouped Control/Treatment, N=600 per condition, 1 DATA column.
    Treatment[i] = Control[i] + small location shift + small Gaussian jitter
    scaled to 0.1 * MAD(Control). Pool-level location/scale/CDF near-identical
    between conditions — direct inheritance fabrication. Serves as the
    calibration target for the direction-blind effect-size gate fix
    (STATUS item 14 / TRACK-D-SPEC §Parked item 1).

    Seed 20260420 is locked per spec. Reset locally so this dataset's output
    is independent of its position in the `datasets` list.

    Layout: three columns (ID label, COND, value). The ID column is a
    concession to `preprocessRaw`, which treats rows with < 3 filled cells as
    sparse and strips them; two-column CSVs would be discarded. The ID role
    is label-only and does not affect the forensic signal.

    Note: Chat spec calls out numpy; the repo generator is numpy-free, so we
    use Python's `random` module with the same construction. The forensic
    signal (span/MAD/CDF near-equal; N ≥ 500) is preserved regardless of
    which PRNG realisation is used.
    """
    local = random.Random(20260420)

    def _randn():
        u1 = local.random()
        u2 = local.random()
        return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)

    n_per_cond = 600

    # Condition A — real biological measurements
    A = [10.0 + 2.0 * _randn() for _ in range(n_per_cond)]

    # Noise scale referenced to MAD(A) for robustness. No location shift —
    # pure jitter inheritance so all three Stage 1 properties land in the
    # "similar" tail and the direction-blind effect-size gate (STATUS #14)
    # is the binding constraint. 0.02×MAD keeps d_obs well below gate
    # thresholds at N=600 (S98 Part B.2 revision — the original 0.5 shift
    # flipped P3 KS to "different" at gate✓; see SESSION98-SUMMARY §Part B).
    med_A = sorted(A)[n_per_cond // 2]
    mad_A = sorted(abs(x - med_A) for x in A)[n_per_cond // 2]

    noise_scale = 0.02 * mad_A
    B = [A[i] + noise_scale * _randn() for i in range(n_per_cond)]

    rows = [["ID", "COND", "value"]]
    for i, v in enumerate(A):
        rows.append([f"S{i+1:04d}", "Control", f"{v:.6f}"])
    for i, v in enumerate(B):
        rows.append([f"S{i+n_per_cond+1:04d}", "Treatment", f"{v:.6f}"])
    return rows

# ══════════════════════════════════════════════════════════════
# DATASET 20: Bimodal fabrication gradient (Modality + Column GoF)
# ══════════════════════════════════════════════════════════════

def gen_bimodal_fab():
    """DS20 v2: Modality gate-hole calibration + asymmetric-mix positive
    exercise. 2 conditions × 150 rows each. 8 Rep cols: Rep1-3 iid N(0,1)
    clean; Rep4-8 are 70/30 ASYMMETRIC Normal mixtures at separations
    [2.5, 3.0, 3.5, 4.0, 4.5] SD (component σ = 1; majority mode at
    −sep/2 with weight 0.7, minority mode at +sep/2 with weight 0.3).
    Symmetric across conditions — same mixture in Control and Treatment
    so Cross-Cond Consistency does not fire on distributional drift.

    Phase 1 diagnostic (S108 Part 2) showed the 50/50 symmetric mixture
    cannot exercise Modality positively at N=300: at any sep where dip
    exceeds DIP_GATE=0.04 (sep ≥ 4.0), γ₂ drops below −0.8 and the column
    is γ₂-pre-skipped before dip is even computed. The asymmetric 70/30
    mixture breaks the platykurtic γ₂ collapse — unequal weights skew
    the distribution, raising γ₂ above the skip gate while still producing
    multimodal structure that Hartigan dip can detect.

    Primary forensic target: Modality (asymmetric-mix positive exercise).
    Column GoF fires collaterally on mixture cols (fails Normal/Poisson/
    NB fit). IRC / cross-rep tests expected to fire on Rep1-3 vs Rep4-8
    distributional mismatch (Dim III collateral) — accepted, pushes
    severity to 3 via the cross-dimension convergence rule.

    Seed 20260421 locked per-fixture.
    """
    local = random.Random(20260421)

    def _randn():
        u1 = local.random()
        u2 = local.random()
        return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)

    def _bimodal_asym(sep):
        # 70/30 mixture: majority N(-sep/2, 1) at weight 0.7,
        # minority N(+sep/2, 1) at weight 0.3. |μ_hi − μ_lo| / σ = sep.
        if local.random() < 0.7:
            return -sep / 2 + _randn()
        return sep / 2 + _randn()

    n_per_cond = 150
    seps = [2.5, 3.0, 3.5, 4.0, 4.5]  # Rep4..Rep8

    header = ["ID", "Condition"] + [f"Rep{k+1}" for k in range(8)]
    rows = [header]

    idx = 1
    for cond in ("Control", "Treatment"):
        for _ in range(n_per_cond):
            row = [f"S{idx:04d}", cond]
            # Rep1-3: iid N(0,1) clean
            for _ in range(3):
                row.append(f"{_randn():.6f}")
            # Rep4-8: 70/30 asymmetric mixture at gradient separations
            for sep in seps:
                row.append(f"{_bimodal_asym(sep):.6f}")
            rows.append(row)
            idx += 1

    print("  DS20 v2 fab cols (70/30 asymmetric): Rep4(2.5SD), Rep5(3.0SD), "
          "Rep6(3.5SD), Rep7(4.0SD), Rep8(4.5SD); clean Rep1-3")
    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 21: Localised AR(1) asymmetric (Windowed Autocorr + Stage 2)
# ══════════════════════════════════════════════════════════════

def gen_localised_ar():
    """DS21 v2: Localised high-ρ AR(1) injected in Control rows only,
    creating a cross-condition asymmetry in residual structure. 2
    conditions × 200 rows each. 8 Rep cols: Rep1-3 iid N(0,1) clean
    throughout; Rep4-8 all inject AR(1) with ρ=0.92 in Control rows
    within window [60, 140) (80 rows), independent noise streams per Rep;
    iid N(0,1) outside the window (Control) and across all 8 Reps in
    Treatment.

    Phase 1 diagnostic (S108 Part 2) showed the v1 ρ-gradient [0.3..0.7]
    in a 25-row window did not deliver detectable signal through
    Windowed Autocorr: the test measures lag-1 r of replicate-DIFFERENCE
    series, so fab-fab pair diffs carry r(d) ≈ ρ while the noise floor
    at W=15 has SD ≈ 0.27; after BH-FDR across ~hundreds of pair×window
    units, |r| ≳ 0.85 is needed. At ρ=0.92 in an 80-row injection
    window with 5 fab cols (C(5,2)=10 fab-fab pairs × ~14 inside
    W=15/stride=5 sub-windows ≈ 140 fab-fab window units), r(d) mean ≈
    0.92 clears the threshold robustly.

    AR(1) construction (unchanged from v1): x[0] fresh N(0,1);
    x[i] = ρ·x[i-1] + √(1-ρ²)·z[i]. Preserves marginal N(0,1); lag-1
    autocorrelation ρ inside window. Independent z[i] streams per Rep
    ensure each Rep's AR draws are independent of every other Rep's.

    Primary forensic targets:
    - Windowed Autocorr (Dim III) on ~140 fab-fab window units in Control
    - Cross-Cond Consistency Stage 2 P4 (Residual SD) + P5 (Residual
      lag-1 AC) on the Control-vs-Treatment residual-structure asymmetry
      (Control has AR in 80/200 rows across 5 cols; Treatment is fully
      iid)
    Expected severity 3 via cross-dimension convergence.

    Seed 20260422 locked per-fixture.
    """
    local = random.Random(20260422)

    def _randn():
        u1 = local.random()
        u2 = local.random()
        return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)

    def _ar1_window(n, rho, win_start, win_end):
        """Generate n iid N(0,1) values; inside [win_start, win_end) replace
        with AR(1) series (fresh start at win_start, lag-1 autocorrelation
        ρ, unit marginal variance). Outside window stays iid. Each
        invocation draws independently from the shared _randn() stream so
        successive calls produce independent noise paths."""
        out = [_randn() for _ in range(n)]
        if win_end > win_start:
            out[win_start] = _randn()  # fresh AR start
            c = math.sqrt(1.0 - rho * rho)
            for i in range(win_start + 1, win_end):
                out[i] = rho * out[i - 1] + c * _randn()
        return out

    n_per_cond = 200
    RHO = 0.92
    WIN_START = 60
    WIN_END = 140  # 80-row injection window

    # Control: inject AR in Rep4-8 at uniform (ρ, window); independent
    # per-Rep noise streams via successive _ar1_window() calls.
    ctrl_cols = {}
    for k in range(3):
        ctrl_cols[f"Rep{k+1}"] = [_randn() for _ in range(n_per_cond)]
    for k in range(5):
        ctrl_cols[f"Rep{k+4}"] = _ar1_window(n_per_cond, RHO,
                                             WIN_START, WIN_END)

    # Treatment: all Rep1-8 iid N(0,1)
    trt_cols = {f"Rep{k+1}": [_randn() for _ in range(n_per_cond)]
                for k in range(8)}

    header = ["ID", "Condition"] + [f"Rep{k+1}" for k in range(8)]
    rows = [header]
    idx = 1
    for cond, cols in (("Control", ctrl_cols), ("Treatment", trt_cols)):
        for i in range(n_per_cond):
            row = [f"S{idx:04d}", cond]
            for k in range(8):
                row.append(f"{cols[f'Rep{k+1}'][i]:.6f}")
            rows.append(row)
            idx += 1

    print(f"  DS21 v2 AR injection in Control Rep4-8 only; "
          f"uniform ρ={RHO}, window [{WIN_START},{WIN_END}) "
          f"({WIN_END-WIN_START} rows); independent noise per Rep")
    return rows


# ══════════════════════════════════════════════════════════════
# DATASET 22: Localised cross-col covariance block (Blocked Mahalanobis
# target; test not yet implemented — S109 target)
# ══════════════════════════════════════════════════════════════

def gen_covariance_block():
    """DS22: Localised cross-column covariance block for Blocked Mahalanobis
    (test implementation is the S109 Track E (a) target). 2 conditions ×
    200 rows each. 7 Rep cols: Rep1-3 iid N(0,1) clean; Rep4-7 are iid
    N(0,1) OUTSIDE the block and drawn jointly from multivariate N(0, Σ)
    INSIDE the block, where Σ has diag = 1 and off-diag = 0.5.

    Block: rows 80-109 (0-indexed, 30 rows) within EACH condition —
    symmetric across Control and Treatment so Cross-Cond Consistency
    does not fire on block-presence asymmetry. Keeps the forensic signal
    cleanly single-dimension (Dim II) for Blocked Mahalanobis positive
    exercise and S109 spec calibration.

    Construction uses single-factor model:
      for j in Rep4..Rep7 inside block:
        X_j = √ρ · C + √(1-ρ) · Z_j
      where C ~ N(0,1) shared across block row; Z_j iid N(0,1) per col.
    This gives Cov(X_i, X_j) = ρ for i≠j and Var(X_i) = 1 — exactly the
    target Σ without explicit Cholesky.

    GT severity 2 entered now; no applicable test in current active set
    (Blocked Mahalanobis lands S109). Batch runner should flag
    "pending-verification: fabricated fixture with no applicable test"
    rather than counting as pass/fail until S109.

    Seed 20260423 locked per-fixture.
    """
    local = random.Random(20260423)

    def _randn():
        u1 = local.random()
        u2 = local.random()
        return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)

    n_per_cond = 200
    block_start = 80
    block_end = 110  # exclusive; 30 rows [80, 110)
    rho = 0.5
    a = math.sqrt(rho)
    b = math.sqrt(1.0 - rho)
    n_fab = 4  # Rep4..Rep7

    header = ["ID", "Condition"] + [f"Rep{k+1}" for k in range(7)]
    rows = [header]
    idx = 1
    for cond in ("Control", "Treatment"):
        for i in range(n_per_cond):
            row = [f"S{idx:04d}", cond]
            # Rep1-3: iid N(0,1)
            for _ in range(3):
                row.append(f"{_randn():.6f}")
            # Rep4-7: iid outside block; factor-model MVN inside block
            if block_start <= i < block_end:
                shared = _randn()  # common factor for this row
                for _ in range(n_fab):
                    row.append(f"{a * shared + b * _randn():.6f}")
            else:
                for _ in range(n_fab):
                    row.append(f"{_randn():.6f}")
            rows.append(row)
            idx += 1

    print(f"  DS22 covariance block: rows [{block_start},{block_end}) "
          f"within each condition; ρ={rho} across Rep4-7")
    return rows



# ══════════════════════════════════════════════════════════════
# WRITE ALL
# ══════════════════════════════════════════════════════════════

datasets = [
    ("01-densitometry-clean.csv", gen_densitometry_clean),
    ("02-densitometry-fabricated.csv", gen_densitometry_fabricated),
    ("03-qpcr-clean.csv", gen_qpcr_clean),
    ("04-qpcr-fabricated.csv", gen_qpcr_fabricated),
    ("05-cellcount-clean.csv", gen_cellcount_clean),
    ("06-cellcount-fabricated.csv", gen_cellcount_fabricated),
    ("07-elisa-clean.csv", gen_elisa_clean),
    ("08-elisa-fabricated.csv", gen_elisa_fabricated),
    ("09-proteomics-clean.csv", gen_proteomics_clean),
    ("10-proteomics-fabricated.csv", gen_proteomics_fabricated),
    ("11-rnaseq-multicondition.csv", gen_rnaseq_multicondition),
    ("12a-uniform-mixture-clean.csv", gen_uniform_mixture_clean),
    ("12b-uniform-mixture-fabricated.csv", gen_uniform_mixture_fabricated),
    ("15-missing-carlisle.csv", gen_missing_data),
    ("16-carlisle-overbalanced.csv", gen_carlisle_overbalanced),
    ("17-carlisle-clean.csv", gen_carlisle_clean),
    ("19-inheritance-fabricated.csv", gen_inheritance_fabricated),
    ("20-bimodal-fab.csv", gen_bimodal_fab),
    ("21-localised-ar.csv", gen_localised_ar),
    ("22-covariance-block.csv", gen_covariance_block),
]

for fname, gen_fn in datasets:
    path = os.path.join(OUT, fname)
    data = gen_fn()
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        for row in data: writer.writerow(row)
    print(f"  {fname}: {len(data)-1} data rows, {len(data[0])} cols")

# Print details about planted flaws for ground truth verification
print("\n=== DS09 (proteomics-clean) ===")
print("  Outlier replicate proteins (0-indexed): 15, 80, 150")

print("\n=== DS10 (proteomics-fabricated) ===")
random.seed(7741)
# We need to re-derive the selections since they happen during generation
# Just note the design — the actual indices are printed during generation

print("\n=== DS11 (rnaseq-multicondition) ===")
print("  Design: 500 genes × 3 conditions × 4 reps")

print("\n=== DS15 (missing-data) ===")
print("  Design: 80 Control + 80 Treatment, 6 reps")
print("  Block missingness: Treatment rows 41-52, Rep3/4/5")
print("  Condition-dependent: Rep6 ~15% Treatment vs ~2.5% Control")
print("  Pairwise: 8 Control rows with both Rep1+Rep2 missing")

print("\n=== DS16 (carlisle-overbalanced) ===")
print("  Design: 60 features × 3 conditions × 6 reps, column-grouped")
print("  Accept-reject: i.i.d. Normal draws, rows accepted if ANOVA p > 0.8")
print("  Seed: 333. Target: ~48/60 features with p > 0.95")

print("\n=== DS17 (carlisle-clean) ===")
print("  Design: 60 features × 3 conditions × 6 reps, column-grouped")
print("  ~30% real effects, ~70% same population mean, all independent noise")
print("  Seed: 77")

print("\nDone.")
