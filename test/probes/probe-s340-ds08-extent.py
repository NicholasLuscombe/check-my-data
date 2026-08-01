#!/usr/bin/env python3
"""S340 step 1 — measure DS08's planted extent at source.

Replays generate-test-datasets.py's PRNG stream up to DS08, then runs an
instrumented copy of gen_elisa_fabricated that records every cell each
planting stage actually writes. Self-verifies by comparing the replayed
matrix against the shipped fixture byte-for-byte.

Read-only with respect to src/ and the fixtures. Prints numbers only.
"""
import csv
import math
import os
import random
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GEN = os.path.join(REPO, "generate-test-datasets.py")
FIXTURE = os.path.join(REPO, "test", "fixtures", "08-elisa-fabricated.csv")

# Exec the generator module to pick up its function defs + randn().
# Its trailing write loop runs into /tmp; harmless, and we discard its output.
ns = {"__name__": "gen_module"}
src = open(GEN).read()
_stdout = sys.stdout
sys.stdout = open(os.devnull, "w")
exec(compile(src, GEN, "exec"), ns)
sys.stdout.close()
sys.stdout = _stdout

randn = ns["randn"]

# Instrumented copy of gen_elisa_fabricated (generate-test-datasets.py:258-304).
# Body is line-for-line identical; only the record.append() calls are added.
def gen_elisa_fabricated_instrumented(rec):
    rows = [["Analyte", "Plate1", "Plate2", "Plate3"]]
    prev_res = [0.0, 0.0, 0.0]
    for i in range(1, 66):
        log_true = random.uniform(-1.2, 3.2)
        true_val = 10 ** log_true
        reps = []
        for r in range(3):
            prev_res[r] = 0.55 * prev_res[r] + 0.09 * randn()
            val = true_val * math.exp(prev_res[r])
            rec["ar"].add((i, r + 1))
            if val > 100: reps.append(f"{val:.1f}")
            elif val > 10: reps.append(f"{val:.2f}")
            elif val > 1: reps.append(f"{val:.3f}")
            else: reps.append(f"{val:.4f}")
        rows.append([f"A{i:03d}"] + reps)

    for i in range(1, 25):
        for r in range(1, 4):
            val = float(rows[i][r])
            s = f"{abs(val):.10f}".lstrip("0").replace(".", "")
            rec["benford_scanned"].add((i, r))
            if s and int(s[0]) <= 3:
                val *= random.uniform(2.0, 3.0)
                rec["benford_written"].add((i, r))
                if val > 100: rows[i][r] = f"{val:.1f}"
                elif val > 10: rows[i][r] = f"{val:.2f}"
                elif val > 1: rows[i][r] = f"{val:.3f}"
                else: rows[i][r] = f"{val:.4f}"

    for i in range(35, 49):
        p1 = float(rows[i][1])
        p2 = p1 * 1.047
        rec["offset"].add((i, 2))
        if p2 > 100: rows[i][2] = f"{p2:.1f}"
        elif p2 > 10: rows[i][2] = f"{p2:.2f}"
        elif p2 > 1: rows[i][2] = f"{p2:.3f}"
        else: rows[i][2] = f"{p2:.4f}"

    for i in range(50, min(65, len(rows))):
        p1 = float(rows[i][1])
        p2 = float(rows[i][2])
        avg = (p1 + p2) / 2
        rec["noise"].add((i, 3))
        rows[i][3] = f"{avg * (1 + 0.01 * randn()):.4f}"

    return rows


# Replay the PRNG stream: seed, then DS01-DS07 in file order, then DS08.
random.seed(7741)
for name in ["gen_densitometry_clean", "gen_densitometry_fabricated",
             "gen_qpcr_clean", "gen_qpcr_fabricated",
             "gen_cellcount_clean", "gen_cellcount_fabricated",
             "gen_elisa_clean"]:
    ns[name]()

rec = {"ar": set(), "benford_scanned": set(), "benford_written": set(),
       "offset": set(), "noise": set()}
rows = gen_elisa_fabricated_instrumented(rec)

# Self-verify against the shipped fixture.
shipped = list(csv.reader(open(FIXTURE)))
assert rows == shipped, "replay does NOT match the shipped fixture"
print("replay matches shipped fixture: OK")

N_ROWS = len(rows) - 1
N_COLS = len(rows[0]) - 1
print(f"fixture: {N_ROWS} data rows x {N_COLS} data columns "
      f"({N_ROWS * N_COLS} data cells); label column 'Analyte' excluded")
print()


def report(label, cells, row_range_note):
    r = sorted({c[0] for c in cells})
    c = sorted({c[1] for c in cells})
    print(f"{label}")
    print(f"  rows    {r[0]}-{r[-1]} ({len(r)}/{N_ROWS} = {100*len(r)/N_ROWS:.1f}%)  {row_range_note}")
    print(f"  columns {[rows[0][x] for x in c]} ({len(c)}/{N_COLS} = {100*len(c)/N_COLS:.1f}%)")
    print(f"  cells   {len(cells)}/{N_ROWS*N_COLS} = {100*len(cells)/(N_ROWS*N_COLS):.1f}%")
    print()


report("AR(1) residuals, phi=0.55 (base generation loop, lines 261-273)",
       rec["ar"], "contiguous")
report("Benford push, rows 1-24 (lines 276-285) — SCANNED region",
       rec["benford_scanned"], "contiguous")
report("Benford push — CELLS ACTUALLY REWRITTEN (leading digit <= 3)",
       rec["benford_written"], "within rows 1-24")
report("Constant-offset block, Plate2 = Plate1 x 1.047 (lines 289-295)",
       rec["offset"], "contiguous")
report("Selective noise, Plate3 = mean(P1,P2) x (1+0.01 randn) (lines 298-302)",
       rec["noise"], "contiguous")

union_blind = rec["benford_written"] | rec["offset"] | rec["noise"]
union_blind_scan = rec["benford_scanned"] | rec["offset"] | rec["noise"]
for label, u in [("union of the three blind modifications (Benford cells actually rewritten)", union_blind),
                 ("union, counting the whole scanned Benford region", union_blind_scan)]:
    r = sorted({c[0] for c in u})
    c = sorted({c[1] for c in u})
    untouched = [i for i in range(1, N_ROWS + 1) if i not in set(r)]
    print(label)
    print(f"  rows touched    {len(r)}/{N_ROWS} = {100*len(r)/N_ROWS:.1f}%")
    print(f"  rows untouched  {len(untouched)}/{N_ROWS} = {100*len(untouched)/N_ROWS:.1f}%  -> {untouched}")
    print(f"  columns touched {[rows[0][x] for x in c]} ({len(c)}/{N_COLS})")
    print(f"  cells touched   {len(u)}/{N_ROWS*N_COLS} = {100*len(u)/(N_ROWS*N_COLS):.1f}%")
    print()

# Column-pair coverage: Windowed Autocorrelation works on replicate pairs.
pairs = [(1, 2), (1, 3), (2, 3)]
touched_cols = {c[1] for c in union_blind}
noise_cols = {c[1] for c in rec["noise"]}
print("column-pair view (3 data columns -> 3 replicate pairs)")
for a, b in pairs:
    tags = []
    if a in noise_cols or b in noise_cols: tags.append("selective-noise column")
    if a == 1 and b == 2: tags.append("constant-offset pair")
    print(f"  {rows[0][a]}-{rows[0][b]}: {', '.join(tags) if tags else 'no blind modification on either column'}")
print(f"  pairs with at least one modified column: "
      f"{sum(1 for a,b in pairs if a in touched_cols or b in touched_cols)}/3")
