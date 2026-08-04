"""S351 Part 4 — DS11 with its planted residual spikes removed.

DS11 is Residual Spike Correlation's other adjudicated detection: twenty genes
carrying the same residual spike in every condition, nine of them flagged and
all planted. Part 3 measured that DS02's rescaled copy inflates the per-subject
noise-scale estimate. This file builds the arm that asks whether DS11 does the
same by a different mechanism.

generate-test-datasets.py is read-only and is not edited. DS11 is the eleventh
generator in the writer list and every one of them draws from a single Mersenne
Twister seeded at 7741, so DS11 cannot be reproduced without replaying the ten
before it. Rather than re-implement eleven generators, this runs the real file
with one in-memory source substitution.

The substitution disables the line that WRITES the spike. Both draws that decide
a spike — `spike_rep` and `spike_magnitude` — happen outside the replicate loop
and are left in place, and the multiplication itself consumes no randomness. So
the ablated run draws exactly what the shipped run draws, in the same order, and
every other fixture in the file is untouched.

The guard: with no substitution, the run must reproduce the shipped DS11 byte
for byte. DS16 and DS17 both fail that check (P85), so it is not a formality.

Usage:
    python3 test/probes/gen-s351-ds11-ablation.py <outdir>
"""
import io
import contextlib
import os
import sys

TARGET = "generate-test-datasets.py"
DS11 = "11-rnaseq-multicondition.csv"

# The line that applies the spike. Re-located by string, never by line number.
SPIKE_GUARD = "                if spike_rep is not None and r == spike_rep:"
SPIKE_OFF = "                if False and spike_rep is not None and r == spike_rep:"
OUT_LINE = 'OUT = "/tmp/dforensix-s108-fixtures"'


def run(outdir, ablate):
    with open(TARGET, "r") as f:
        src = f.read()
    if SPIKE_GUARD not in src:
        raise SystemExit("HALT — the spike guard line has moved. Re-locate it before running.")
    if OUT_LINE not in src:
        raise SystemExit("HALT — the OUT line has moved. Re-locate it before running.")
    src = src.replace(OUT_LINE, f'OUT = "{outdir}"')
    if ablate:
        src = src.replace(SPIKE_GUARD, SPIKE_OFF)
    os.makedirs(outdir, exist_ok=True)
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(compile(src, TARGET, "exec"), {"__name__": "__main__"})
    return buf.getvalue()


def read(path):
    with open(path, "r", newline="") as f:
        return f.read()


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else "/tmp/s351-ds11"
    shipped_dir = os.path.join(outdir, "shipped")
    ablated_dir = os.path.join(outdir, "ablated")

    log = run(shipped_dir, ablate=False)

    # Provenance. Unsubstituted output must equal the committed fixture.
    here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    want = read(os.path.join(here, "test", "fixtures", DS11))
    got = read(os.path.join(shipped_dir, DS11))
    if got != want:
        raise SystemExit(
            f"HALT — regenerated {DS11} does not match the shipped fixture. "
            "DS11's provenance is broken, as DS16's and DS17's are. Nothing measured."
        )
    print(f"provenance: {DS11} reproduces byte for byte")

    # The generator prints its own planted-gene lists; carry them through so the
    # measurement never has to guess which genes were targeted.
    for line in log.splitlines():
        if "DS11" in line:
            print("  " + line.strip())

    run(ablated_dir, ablate=True)
    a, b = read(os.path.join(shipped_dir, DS11)), read(os.path.join(ablated_dir, DS11))
    if a == b:
        raise SystemExit("HALT — the ablated file is identical to the shipped one. The substitution did nothing.")
    changed = sum(1 for x, y in zip(a.splitlines(), b.splitlines()) if x != y)
    print(f"  ablated copy written; {changed} of {len(a.splitlines())} lines differ")
    print(f"  shipped: {os.path.join(shipped_dir, DS11)}")
    print(f"  ablated: {os.path.join(ablated_dir, DS11)}")


if __name__ == "__main__":
    main()
