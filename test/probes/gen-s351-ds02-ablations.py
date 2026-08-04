"""S351 Part 3 — DS02 ablation generator.

Re-implements `gen_densitometry_clean` and `gen_densitometry_fabricated` from
generate-test-datasets.py so DS02's three planted mechanisms can be switched off
one at a time. The generator itself is read-only and is not imported: importing
it runs the whole 20-fixture writer loop.

The transcription is guarded, not trusted. With all three mechanisms on, this
file must reproduce BOTH shipped fixtures byte for byte. It refuses to emit an
ablation if either check fails, so a mis-copied constant cannot reach the
measurement.

DS01 has to be regenerated too. Both generators draw from one module-level
Mersenne Twister seeded at 7741, and DS02 runs second, so DS02's stream depends
on DS01 having consumed its draws first.

Stream alignment across ablations. Each variant consumes exactly the same number
of random draws in the same order as the full construction:
  - M1 off substitutes an honestly generated Inhibitor_A that takes the same
    four draws per row, so Inhibitor_B's draws do not shift.
  - M2's twenty draws happen after every row is built and nothing later in DS02
    reads the stream, so skipping them shifts nothing.
  - M3 draws nothing.
So a difference between two variants is the mechanism, not a reseeded stream.

Usage:
    python3 test/probes/gen-s351-ds02-ablations.py <outdir>
"""
import csv
import math
import os
import random
import sys

SEED = 7741


def randn():
    u1 = random.random()
    u2 = random.random()
    return math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)


def gen_densitometry_clean():
    conds = ["Control", "Inhibitor_A", "Inhibitor_B"]
    n_rows = 35
    n_reps = 4
    row0 = [""]
    row1 = ["Residue"]
    for c in conds:
        row0.append(c)
        row0.extend([""] * (n_reps - 1))
        for ri in range(n_reps):
            row1.append(f"Rep{ri+1}")
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

    for i in range(8, 15):
        r = rows[i + 2]
        idx_b_r1 = 1 + 2 * n_reps
        idx_b_r2 = idx_b_r1 + 1
        r[idx_b_r1], r[idx_b_r2] = r[idx_b_r2], r[idx_b_r1]

    return rows


def gen_densitometry_fabricated(m1=True, m2=True, m3=True, m1_mode="ds01"):
    """DS02. m1 = rescaled copy, m2 = scattered row copy, m3 = replicate lock.

    m1_mode controls what replaces the copy when m1 is off:
      "ds01"    Inhibitor_A generated the way DS01's clean sibling does it,
                base 0.6 + residue effect. Realistic, but its row-to-row
                amplitude is not the same as 0.58 x Control's, so an arm built
                this way confounds "not a copy" with "different row profile".
      "matched" Inhibitor_A drawn independently from Control's own law scaled by
                0.58 — identical marginal distribution to what M1 produces, only
                the shared noise realisation removed. This is the control that
                isolates the copy itself.
    """
    conds = ["Control", "Inhibitor_A", "Inhibitor_B"]
    n_rows = 35
    n_reps = 4
    row0 = [""]
    row1 = ["Residue"]
    for c in conds:
        row0.append(c)
        row0.extend([""] * (n_reps - 1))
        for ri in range(n_reps):
            row1.append(f"Rep{ri+1}")
    rows = [row0, row1]

    ctrl_data = []
    for i in range(1, n_rows + 1):
        base = 1.0 + 0.2 * math.sin(i * 0.25) + 0.08 * math.cos(i * 0.9)
        reps = [max(0.01, base + base * 0.12 * randn()) for _ in range(n_reps)]
        ctrl_data.append(reps)

    for i in range(n_rows):
        row = [str(i + 1)]
        for v in ctrl_data[i]:
            row.append(f"{v:.4f}")

        # M1 — Inhibitor_A as a rescaled copy of Control.
        # Off: Inhibitor_A generated the way DS01's clean sibling generates it,
        # taking the same four draws so the stream stays aligned.
        if m1:
            for ri in range(n_reps):
                val = ctrl_data[i][ri] * 0.58 + 0.008 * randn()
                row.append(f"{val:.4f}")
        elif m1_mode == "matched":
            base_a = 0.58 * (1.0 + 0.2 * math.sin((i + 1) * 0.25) + 0.08 * math.cos((i + 1) * 0.9))
            for ri in range(n_reps):
                val = max(0.01, base_a + base_a * 0.12 * randn())
                row.append(f"{val:.4f}")
        else:
            base_a = 0.6 + 0.2 * math.sin((i + 1) * 0.25) + 0.08 * math.cos((i + 1) * 0.9)
            for ri in range(n_reps):
                val = max(0.01, base_a + base_a * 0.12 * randn())
                row.append(f"{val:.4f}")

        base_b = 0.35 + 0.2 * math.sin((i + 1) * 0.25) + 0.08 * math.cos((i + 1) * 0.9)
        for ri in range(n_reps):
            val = max(0.01, base_b + base_b * 0.12 * randn())
            row.append(f"{val:.4f}")

        rows.append(row)

    # M2 — five randomly chosen rows have Inhibitor_B overwritten from Control.
    # The draw happens whether or not the write does, so the selection is
    # identical across variants and the stream cannot shift.
    splot = random.sample(range(n_rows), 5)
    if m2:
        for idx in splot:
            r = rows[idx + 2]
            src_start = 1
            tgt_start = 1 + 2 * n_reps
            for ri in range(n_reps):
                orig = float(r[src_start + ri])
                r[tgt_start + ri] = f"{orig * 0.35 + 0.002 * randn():.4f}"

    # M3 — Inhibitor_A Rep2 locked to Rep1 over a contiguous stretch. No draws.
    if m3:
        for i in range(18, 28):
            r = rows[i + 2]
            r1_val = float(r[1 + n_reps])
            r[1 + n_reps + 1] = f"{r1_val * 1.003 + 0.0015:.4f}"

    return rows, sorted(splot)


def build(m1=True, m2=True, m3=True, m1_mode="ds01", seed=SEED):
    """Reseed and replay DS01 then DS02, so DS02 sees the shipped stream."""
    random.seed(seed)
    clean = gen_densitometry_clean()
    fab, splot = gen_densitometry_fabricated(m1=m1, m2=m2, m3=m3, m1_mode=m1_mode)
    return clean, fab, splot


def write(rows, path):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        for r in rows:
            w.writerow(r)


def read_text(path):
    with open(path, "r", newline="") as f:
        return f.read()


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else "/tmp/s351-ds02-ablations"
    os.makedirs(outdir, exist_ok=True)
    here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    fixtures = os.path.join(here, "test", "fixtures")

    clean, fab, splot = build(True, True, True)

    # Guard. Both shipped fixtures must reproduce exactly.
    checks = [("01-densitometry-clean.csv", clean), ("02-densitometry-fabricated.csv", fab)]
    tmp = os.path.join(outdir, "_verify.csv")
    for name, rows in checks:
        write(rows, tmp)
        got = read_text(tmp)
        want = read_text(os.path.join(fixtures, name))
        if got != want:
            os.remove(tmp)
            raise SystemExit(
                f"HALT — re-implementation does not reproduce {name}. "
                "The transcription is wrong; no ablation emitted."
            )
    os.remove(tmp)
    print(f"provenance: both shipped fixtures reproduced byte for byte (seed {SEED})")
    print(f"M2 rows, 0-indexed: {splot}")
    print(f"M2 rows, 1-indexed data rows: {[i + 1 for i in splot]}")

    variants = [
        ("ds02-full.csv",     dict(m1=True,  m2=True,  m3=True),  "all three mechanisms"),
        ("ds02-no-m1.csv",    dict(m1=False, m2=True,  m3=True),  "rescaled copy removed, DS01-style replacement"),
        ("ds02-no-m1b.csv",   dict(m1=False, m2=True,  m3=True, m1_mode="matched"),
                                                                  "rescaled copy removed, variance-matched replacement"),
        ("ds02-no-m2.csv",    dict(m1=True,  m2=False, m3=True),  "scattered row copy removed"),
        ("ds02-no-m3.csv",    dict(m1=True,  m2=True,  m3=False), "replicate lock removed"),
        ("ds02-none.csv",     dict(m1=False, m2=False, m3=False), "all three removed"),
        ("ds02-none-b.csv",   dict(m1=False, m2=False, m3=False, m1_mode="matched"),
                                                                  "all three removed, variance-matched"),
    ]
    for fname, kw, label in variants:
        _, rows, _ = build(**kw)
        write(rows, os.path.join(outdir, fname))
        print(f"  wrote {fname:22s} {label}")

    # The clean sibling, for the DS01 comparison arm.
    write(clean, os.path.join(outdir, "ds01-clean.csv"))
    print(f"  wrote {'ds01-clean.csv':22s} DS01, the clean counterpart")

    # Honest replicates at other seeds. The dispersion estimator's spread across
    # these IS its resolution on this shape (35 subjects, 9 df each) — without
    # them a single value cannot be read against the 0.2-0.3 knee.
    repdir = os.path.join(outdir, "honest-replicates")
    os.makedirs(repdir, exist_ok=True)
    for s in range(12):
        _, rows, _ = build(m1=False, m2=False, m3=False, m1_mode="matched", seed=1000 + s)
        write(rows, os.path.join(repdir, f"honest-{s:02d}.csv"))
    print(f"  wrote {'honest-replicates/':22s} 12 honest DS02-shaped files at seeds 1000-1011")


if __name__ == "__main__":
    main()
