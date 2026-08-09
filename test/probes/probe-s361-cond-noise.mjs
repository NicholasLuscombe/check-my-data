// S361 — the condition-noise axis: its negative control, and whether it
// contaminates the per-subject estimator.
//
// `test/gen-copy-fidelity.mjs` gained a `condNoiseRatio` parameter. It sets the
// ratio of replicate noise scale between the two conditions, holding the file's
// total replicate noise fixed. It exists because several tests in the battery
// respond to a change in noise scale, and every corpus fixture carrying such a
// change also carries a fabrication — so for that family a variance change and a
// fabrication are the same object, and specificity is unmeasured.
//
// This probe does two things.
//
//   --control   At condNoiseRatio = 1 the generator must reproduce its previous
//               output exactly. The expected hashes below were taken from a run
//               BEFORE the parameter existed and are hand-recorded here. They
//               cannot be recomputed from the current code, which is the point:
//               a snapshot that could be regenerated from the thing it checks
//               would restate that thing and pass by construction.
//
//   --ladder    Measures the per-subject noise-scale dispersion estimator at
//               sigmaS = 0 across a ladder of condition ratios. If the estimator
//               reads dispersion between subjects when the only thing that
//               changed is a difference between CONDITIONS, the two axes are
//               separable in the generator and not in the readout, and they
//               cannot be measured together.
//
// The estimator is imported, never re-derived. It is the same function that
// produced the numbers this result has to be comparable with.
//
//   node test/probes/probe-s361-cond-noise.mjs --control
//   node test/probes/probe-s361-cond-noise.mjs --ladder
//   node test/probes/probe-s361-cond-noise.mjs            (both)

import { createHash } from 'node:crypto';

const { generate } = await import('../gen-copy-fidelity.mjs');
const { residualScaleDispersion } = await import('../s-dispersion.mjs');

const hash = (o) => createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);

// ── Negative control ────────────────────────────────────────────────────
// Recorded from the generator as it stood before `condNoiseRatio` was added,
// across the parameter combinations the instrument is actually driven at: the
// full copy-fidelity ladder at two seeds, the full heterogeneity ladder, both
// subject modes, three replicate counts and two subject counts.
//
// `ab` hashes the two emitted matrices, `cg` and `rg` the two CSV layouts. All
// three are checked because a layout could move without a value moving.
const BASELINE = [
  { opts: {"k":0,"seed":0}, ab: "59080c1fdaca0909", cg: "8f73835995f58124", rg: "d49d5f00846e41e4" },
  { opts: {"k":0,"seed":1}, ab: "90253302f0617d2a", cg: "c2496bbc7ae49340", rg: "79753f5998dd6449" },
  { opts: {"k":0.1,"seed":0}, ab: "8af67d42b483899b", cg: "37827b01bd13bd3d", rg: "7b073253a46f73f4" },
  { opts: {"k":0.1,"seed":1}, ab: "77cd646112a74b7e", cg: "574ebb03cb601cc4", rg: "425548ada85e5009" },
  { opts: {"k":0.2,"seed":0}, ab: "ee5de324eac8db0f", cg: "68e02c361b5db712", rg: "b35dede15dc31397" },
  { opts: {"k":0.2,"seed":1}, ab: "edf614dd84dcdcb1", cg: "ff6be0a90eb119be", rg: "29af3bcae6518448" },
  { opts: {"k":0.3,"seed":0}, ab: "6d5544d16e04d1cd", cg: "d6e2900bacd15cdc", rg: "881ee0bd3831f175" },
  { opts: {"k":0.3,"seed":1}, ab: "538cefb17ebbb34d", cg: "5c05dc46ddd67f05", rg: "7c24615496b8c558" },
  { opts: {"k":0.4,"seed":0}, ab: "9b53fe9c24d4d77c", cg: "b4bc42db1db1ac5e", rg: "563613b222819e29" },
  { opts: {"k":0.4,"seed":1}, ab: "27573806ddcae6a6", cg: "0bcba9041d08ac6d", rg: "98a81620209522e9" },
  { opts: {"k":0.5,"seed":0}, ab: "35cd65a8ef564630", cg: "1ab73b63b1584f4c", rg: "923ef1c32b046d62" },
  { opts: {"k":0.5,"seed":1}, ab: "0eac6d2b3e304b77", cg: "7175e8f2148db2a1", rg: "2767e2b063ba7e7f" },
  { opts: {"k":0.65,"seed":0}, ab: "326fbf86e06ad27e", cg: "3f6466bba81304af", rg: "dc344fa47f69321d" },
  { opts: {"k":0.65,"seed":1}, ab: "fe14c8385fe1a64e", cg: "bd0b2e5e16dbb777", rg: "b15db46da12a7917" },
  { opts: {"k":0.8,"seed":0}, ab: "3dbf19b3078fc54a", cg: "5f60cd4a508316ba", rg: "6e43e6e2a9c22639" },
  { opts: {"k":0.8,"seed":1}, ab: "941e227ed05c6c11", cg: "cc9492056df24a2c", rg: "50cba5bb705f712a" },
  { opts: {"k":0.9,"seed":0}, ab: "bb0e01122e941bb1", cg: "82605be535a760f7", rg: "77706a38b5ca90ba" },
  { opts: {"k":0.9,"seed":1}, ab: "5d9f0dbba3340da2", cg: "0cc64a6ed58e24bf", rg: "3ae2f5a1b662a097" },
  { opts: {"k":1,"seed":0}, ab: "95b5e3aaaadbe983", cg: "ff8e1301cd602c2c", rg: "a4a8914a0d769b40" },
  { opts: {"k":1,"seed":1}, ab: "7121ce459616bdc2", cg: "12f2d3241bc6ace0", rg: "39fe6b719caf194f" },
  { opts: {"k":0.3,"seed":7,"sigmaS":0}, ab: "afa106c67ecbc977", cg: "3a6692bfc5ba1cf9", rg: "6b0c80e95bacc20c" },
  { opts: {"k":0.3,"seed":7,"sigmaS":0.15}, ab: "259b69b4d13b4e5f", cg: "0f8c1bbc2a1fa7ed", rg: "5cb5befce8357636" },
  { opts: {"k":0.3,"seed":7,"sigmaS":0.3}, ab: "01b02d2aeaf15a92", cg: "ed1c05460ef14848", rg: "d48892d4a12ed8a1" },
  { opts: {"k":0.3,"seed":7,"sigmaS":0.5}, ab: "87975fa5195b48c2", cg: "294a1e9b6a767a4e", rg: "3085f5f2453396f1" },
  { opts: {"k":0.3,"seed":7,"sigmaS":0.75}, ab: "e82068ac888309a9", cg: "98a205563084c86c", rg: "fbb29dfdf5bc7dff" },
  { opts: {"k":0.3,"seed":7,"sigmaS":1}, ab: "d6180330177201f0", cg: "65ae7e3eba75bac4", rg: "2764a08fbbfa44f1" },
  { opts: {"k":0.5,"seed":11,"sharedSubjects":true}, ab: "909cb29fa62104fb", cg: "47424240865307ff", rg: "07eb4a902c418c6e" },
  { opts: {"k":0.5,"seed":11,"sharedSubjects":false}, ab: "f9f290545e0e5dea", cg: "00e9fe58e414a0dc", rg: "307162c7db99ab28" },
  { opts: {"k":1,"seed":13,"nReps":4}, ab: "46f1237d4bb1d0f5", cg: "00b8a53cba2b06b4", rg: "56ba14e82e124a84" },
  { opts: {"k":1,"seed":13,"nReps":6}, ab: "80478f6cc471de01", cg: "9e74e33250bf4a86", rg: "b7d16fc107890e11" },
  { opts: {"k":1,"seed":13,"nReps":12}, ab: "209f217624706b05", cg: "be76828107a05113", rg: "9602c780e8a3ba34" },
  { opts: {"k":0,"seed":17,"nSubjects":35,"sigmaS":0.5}, ab: "bf1ef67813b52345", cg: "c9bccc7446096f7f", rg: "6e56fb3d30c0eee1" },
  { opts: {"k":0,"seed":17,"nSubjects":120,"sigmaS":0.5}, ab: "f527cee0c789452b", cg: "3b997f9ce542609f", rg: "90a92728fc8ab630" },
];

function control() {
  console.log('S361 negative control — condNoiseRatio = 1 must reproduce the generator as it was\n');
  let bad = 0;
  for (const b of BASELINE) {
    const d = generate(b.opts);
    const got = { ab: hash([d.A, d.B]), cg: hash(d.columnGroupedCsv), rg: hash(d.rowGroupedCsv) };
    const ok = got.ab === b.ab && got.cg === b.cg && got.rg === b.rg;
    if (!ok) {
      bad++;
      console.log(`  DIFF ${JSON.stringify(b.opts)}`);
      if (got.ab !== b.ab) console.log(`       matrices  expected ${b.ab}  got ${got.ab}`);
      if (got.cg !== b.cg) console.log(`       column csv expected ${b.cg}  got ${got.cg}`);
      if (got.rg !== b.rg) console.log(`       row csv    expected ${b.rg}  got ${got.rg}`);
    }
  }
  // Explicit too: at a ratio of 1 the parameter must be a no-op against a call
  // that never mentions it. This catches a default that drifts off 1.
  const withParam = generate({ k: 0.3, seed: 5, condNoiseRatio: 1 });
  const without = generate({ k: 0.3, seed: 5 });
  const noop = hash([withParam.A, withParam.B]) === hash([without.A, without.B]);
  console.log(`\n  ${BASELINE.length - bad}/${BASELINE.length} reproduce the pre-change output exactly`);
  console.log(`  explicit no-op at ratio 1: ${noop ? 'ok' : 'FAIL'}`);
  if (bad || !noop) {
    console.log('\n  A difference here is a defect in the new code, not a finding about the generator.');
    process.exitCode = 1;
  }
  return bad === 0 && noop;
}

// ── The contamination question ──────────────────────────────────────────
// The per-subject estimator pools each subject's residuals across both
// conditions. The condition ratio is common to every subject, so the reasoning
// was that it inflates every subject's spread alike and adds nothing to the
// dispersion BETWEEN subjects. That is reasoning. This measures it.
const LADDER = [1.0, 1.15, 1.3, 1.5, 1.65, 2.0, 2.5];
const DRAWS = 20;
const SUBJECTS = 120;

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

function ladder() {
  console.log('\nS361 contamination check — measured s at sigmaS = 0, across condition ratios');
  console.log(`${DRAWS} draws per rung, ${SUBJECTS} subjects, k = 1 (no copy), sigmaS = 0 throughout\n`);
  const rows = [];
  for (const nReps of [4, 6]) {
    console.log(`  ${nReps} replicates per subject`);
    console.log('    ratio   median s    range               realised ratio');
    for (const r of LADDER) {
      const ss = [], rr = [];
      for (let seed = 0; seed < DRAWS; seed++) {
        const d = generate({ k: 1, seed: 3000 + seed, sigmaS: 0, condNoiseRatio: r, nSubjects: SUBJECTS, nReps });
        ss.push(residualScaleDispersion([d.A, d.B]).corrected);
        rr.push(d.diagnostics.condNoiseRatioRealised);
      }
      const med = median(ss), lo = Math.min(...ss), hi = Math.max(...ss);
      rows.push({ nReps, r, med, lo, hi });
      console.log(`    ${String(r).padEnd(6)}  ${med.toFixed(4)}      [${lo.toFixed(4)}, ${hi.toFixed(4)}]      ${median(rr).toFixed(3)}`);
    }
    console.log('');
  }
  // The verdict is about the direction of the median across the ladder, so it is
  // read off the two ends and off monotonicity, not off one rung.
  for (const nReps of [4, 6]) {
    const set = rows.filter((x) => x.nReps === nReps);
    const first = set[0].med, last = set[set.length - 1].med;
    const rising = set.every((x, i) => i === 0 || x.med >= set[i - 1].med - 1e-12);
    console.log(`  ${nReps} replicates: median s goes ${first.toFixed(4)} -> ${last.toFixed(4)}` +
      ` (${(last - first >= 0 ? '+' : '') + (last - first).toFixed(4)}), monotone rising: ${rising}`);
  }
  console.log('\n  Flat across the ladder clears the joint design. Rising means the axes are');
  console.log('  separable in the generator and not in the readout.');
  return rows;
}

// ── Where the contamination lives ───────────────────────────────────────
// The ladder above shows the estimator moving. This says which part of it
// moves. The estimator is the same function at two arities: given both
// conditions it pools each subject's residuals across them, given one it reads
// that condition alone. At sigmaS = 0 the noise scale is constant across
// subjects WITHIN each condition, so a one-condition read should see nothing
// whatever the ratio is. If it is flat and the pooled read is not, the
// contamination is the pooling and nothing else.
function arity() {
  console.log('\nS361 — which arity carries the contamination, at sigmaS = 0\n');
  for (const nReps of [4, 6]) {
    console.log(`  ${nReps} replicates`);
    console.log('    ratio   both conds   cond A only   cond B only');
    for (const r of LADDER) {
      const ab = [], a = [], b = [];
      for (let seed = 0; seed < DRAWS; seed++) {
        const d = generate({ k: 1, seed: 3000 + seed, sigmaS: 0, condNoiseRatio: r, nSubjects: SUBJECTS, nReps });
        ab.push(residualScaleDispersion([d.A, d.B]).corrected);
        a.push(residualScaleDispersion([d.A]).corrected);
        b.push(residualScaleDispersion([d.B]).corrected);
      }
      console.log(`    ${String(r).padEnd(6)}  ${median(ab).toFixed(4)}       ${median(a).toFixed(4)}        ${median(b).toFixed(4)}`);
    }
    console.log('');
  }
  console.log('  A flat one-condition column against a rising pooled column means the');
  console.log('  pooling is the whole of it. The one-condition read pays for that');
  console.log('  immunity in degrees of freedom, and its floor is what it costs.');
}

const args = process.argv.slice(2);
const all = args.length === 0;
if (all || args.includes('--control')) control();
if (all || args.includes('--ladder')) ladder();
if (all || args.includes('--arity')) arity();
