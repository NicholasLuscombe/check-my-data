/* S369 Part 1 (P83) — is `aggregatePerGroup` calibrated when the groups are
   correlated, and in which direction does each of its arms fail?
   ------------------------------------------------------------------------
   NOTHING IS REIMPLEMENTED. Every number below comes out of the shipped
   `aggregatePerGroup` in src/analysis/aggregation.js, driven with synthetic
   per-group results. Fisher's combination, the Sidak adjustment, the guard at
   :152 and the two-arm maximum at :221-222 all run as shipped. The thresholds
   are imported from src/constants/thresholds.js and are never retyped. The
   p-values fed in are built here, because the whole point is to control their
   dependence — that is the probe's own construction and is stated as such.

   THE FOUR QUANTITIES. The layer takes a maximum over two arms, so a
   conservative arm cannot offset an anti-conservative one and the arms have to
   be read apart:
     1. Fisher arm            `__s369.fisherFlag`      (hook — see below)
     2. group arm, as live    `__s369.groupArmFlag`    (hook)
     3. bare maximum          `worstGroupFlagRaw`      (shipped, :384)
     4. combined, as shipped  `flag`                   (shipped, :377)
   plus the fraction of draws on which the Sidak guard held,
     `multiplicityCorrected` (shipped, :384).
   Quantity 2 is the CORRECTED arm when the guard held and the BARE maximum
   when it did not — it is whichever arm the maximum at :221-222 actually saw.
   Reading 2 and 3 together is how the guard's effect becomes visible.

   WHY A HOOK. Three of the four are published at full precision already. The
   Fisher arm's flag is not, and it cannot be recovered: `fisherP` ships as
   `.toFixed(4)`, so re-thresholding it against ALPHA.FLAG = 0.001 would take a
   decision off a rounded string. `s369-arm-flags-hook.mjs` adds one line
   publishing three already-computed locals; `--hookdiff` prints it and
   `--digest` measures its inertness. Without the hook this probe runs
   everything except the Fisher-arm and group-arm columns.

   THE DEPENDENCE MODEL. One-factor equicorrelated standard normals,
   z_i = sqrt(rho)*u + sqrt(1-rho)*e_i, with u and every e_i independent
   standard normal. Exact for rho >= 0. Converted to p by the two conventions
   Part 0 found on the real inputs:
     two-sided  p = 2(1 - Phi(|z|))   — Autocorrelation, Runs, per pair
     one-sided  p = 1 - Phi(z)        — Regional Noise, LOESS, permutation scans
   Both are exactly Uniform(0,1) marginally, so the two arms differ only in the
   dependence structure the correlation induces, which is the point of running
   both. Phi is evaluated through the SHIPPED `chiSquaredP` at one degree of
   freedom, because 2(1 - Phi(|z|)) is P(chi2_1 > z^2) identically and that
   route keeps full relative precision in the tail where the A&S `normalCDF`
   (absolute error 7.5e-8) does not. `--controls` checks the identity against
   the shipped `zToP`.

   THE GUARD BRANCH. With flags derived from their own p-values the guard at
   :152 always holds, so that construction measures one branch of two. The
   `promoted` branch gives group 1 a flag one tier above `flagFromP(its own p)`
   — the pair-promotion / effect-size-gate case the comment at :133-143
   describes — which is what makes the guard fail and the correction switch off.

   Usage:
     node test/probes/probe-s369-aggregate-per-group.mjs --hookdiff
     node test/probes/probe-s369-aggregate-per-group.mjs --controls
     node test/probes/probe-s369-aggregate-per-group.mjs --digest
     node test/probes/probe-s369-aggregate-per-group.mjs --time
     DRAWS=20000 node --import ./test/probes/s369-arm-flags-hook.mjs \
       test/probes/probe-s369-aggregate-per-group.mjs --grid
*/
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const B = new URL('../../', import.meta.url).pathname;

// `tick()` in aggregation.js yields to the browser between groups via
// requestAnimationFrame + setTimeout(0). Node clamps setTimeout(0) to 1ms, so
// two chained timers per group would cost about 2ms and put the grid out of
// reach. requestAnimationFrame is shimmed to call its callback immediately with
// setTimeout swapped for a synchronous stand-in FOR THE DURATION OF THAT
// CALLBACK ONLY — the one setTimeout call inside is the one `tick` makes.
// Nothing in aggregatePerGroup reads a clock or a timer handle, and `--digest`
// measures that the shim moves no number rather than asserting it.
// S369_RAF=timer selects the conventional probe stand-in instead (the one every
// other probe in test/probes/ uses), so `--digest` can be run both ways and the
// shim's inertness measured rather than asserted.
globalThis.requestAnimationFrame = process.env.S369_RAF === 'timer'
  ? (cb) => setTimeout(cb, 0)
  : (cb) => {
      const realSetTimeout = globalThis.setTimeout;
      globalThis.setTimeout = (f) => { f(); return 0; };
      try { cb(); } finally { globalThis.setTimeout = realSetTimeout; }
      return 0;
    };

const { aggregatePerGroup } = await import(B + 'src/analysis/aggregation.js');
const { ALPHA, flagFromP, flagRankOf } = await import(B + 'src/constants/thresholds.js');
const { chiSquaredP, zToP, sidakAdjust } = await import(B + 'src/stats/primitives.js');

const HOOKED = globalThis.__S369_PATCH?.applied === 1;

// ── the construction ──────────────────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeNormal(rnd) {
  let spare = null;
  return function randn() {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u, v, s2;
    do { u = 2 * rnd() - 1; v = 2 * rnd() - 1; s2 = u * u + v * v; } while (s2 >= 1 || s2 === 0);
    const f = Math.sqrt(-2 * Math.log(s2) / s2);
    spare = v * f;
    return u * f;
  };
}
// 2(1 - Phi(|z|)) === P(chi2_1 > z^2), exactly. Shipped chiSquaredP.
const pTwoSided = (z) => chiSquaredP(z * z, 1);
const pOneSided = (z) => (z >= 0 ? 0.5 * chiSquaredP(z * z, 1) : 1 - 0.5 * chiSquaredP(z * z, 1));

// A name that is NOT in aggregation.js's FISHER_EXEMPT set, so the Fisher arm runs.
const NAME = "S369 Synthetic";
const PROMOTE = { LOW: "MODERATE", MODERATE: "HIGH", HIGH: "HIGH" };

function callArgs(ps, promoted) {
  const results = ps.map((p) => ({
    name: NAME, category: "replicate", description: "synthetic",
    flag: flagFromP(p), primaryP: p,
  }));
  if (promoted) results[0].flag = PROMOTE[results[0].flag];
  let i = 0;
  const testFn = () => results[i++];
  const groups = ps.map((_, k) => ({ name: `G${k + 1}`, matrix: [[0]] }));
  return { testFn, groups };
}

async function oneDraw(m, rho, pOf, promoted, randn) {
  const a = Math.sqrt(rho), b = Math.sqrt(1 - rho), u = randn();
  const ps = new Array(m);
  for (let i = 0; i < m; i++) ps[i] = pOf(a * u + b * randn());
  const { testFn, groups } = callArgs(ps, promoted);
  return aggregatePerGroup(testFn, groups, null);
}

// ── modes ─────────────────────────────────────────────────────────────────
const arg = (f) => process.argv.includes(f);

if (arg('--hookdiff')) {
  const patch = globalThis.__S369_PATCH;
  if (!patch) {
    console.log('Hook not loaded. Re-run with --import ./test/probes/s369-arm-flags-hook.mjs');
    process.exit(1);
  }
  const src = readFileSync(B + patch.target, 'utf-8');
  const patched = src.replace(patch.from, patch.to);
  const a = src.split('\n'), c = patched.split('\n');
  console.log(`### The whole patch to ${patch.target}, applied in memory at load.\n`);
  console.log(`  original lines: ${a.length}   patched lines: ${c.length}   delta: +${c.length - a.length}\n`);
  let i = 0, j = 0, shown = 0;
  while (i < a.length || j < c.length) {
    if (a[i] === c[j]) { i++; j++; continue; }
    // every insertion in this patch is a pure addition
    console.log(`  + ${j + 1}: ${c[j]}`);
    shown++; j++;
    if (shown > 20) break;
  }
  console.log(`\n  ${shown} line(s) added, 0 removed, 0 modified.`);
  console.log('  Every identifier on the added line is a local already computed above it:');
  console.log('    fisherFlag    declared aggregation.js:159, assigned :217');
  console.log('    fisherP       declared :160, assigned :216, shipped rounded at :380');
  console.log('    groupArmFlag  declared :150, assigned :155');
  process.exit(0);
}

if (arg('--controls')) {
  console.log('### Imported thresholds, read not retyped\n');
  console.log(`  ALPHA.FLAG = ${ALPHA.FLAG}`);
  console.log(`  ALPHA.NOTE = ${ALPHA.NOTE}`);
  console.log(`  flagFromP compares strictly: p < FLAG -> HIGH, p < NOTE -> MODERATE, else LOW\n`);

  console.log('### The two-sided identity against the shipped zToP\n');
  console.log('  ' + 'z'.padEnd(8) + 'chiSquaredP(z^2,1)'.padEnd(26) + 'zToP(z)'.padEnd(26) + 'abs diff');
  let worst = 0;
  for (const z of [0.5, 1, 1.5, 2, 2.5, 3, 3.2905, 4, 5]) {
    const a = pTwoSided(z), b = zToP(z);
    worst = Math.max(worst, Math.abs(a - b));
    console.log('  ' + String(z).padEnd(8) + a.toExponential(12).padEnd(26) + b.toExponential(12).padEnd(26) + Math.abs(a - b).toExponential(2));
  }
  console.log(`\n  worst absolute disagreement ${worst.toExponential(2)}; normalCDF's own stated bound is 7.5e-8 and`);
  console.log('  the two-sided p doubles it, so anything at or under 1.5e-7 is the approximation, not a defect.');
  console.log('  The chi-squared route is the one used for the grid because it keeps relative precision in the tail.\n');

  console.log('### sidakAdjust as shipped (primitives.js:262-267)\n');
  console.log('  return -Math.expm1(k * Math.log1p(-p));   // algebraically 1 - (1-p)^k');
  console.log('  ' + 'p'.padEnd(12) + 'k'.padEnd(5) + 'sidakAdjust'.padEnd(24) + 'literal 1-(1-p)^k');
  for (const [p, k] of [[0.001, 2], [0.001, 3], [0.001, 10], [1e-12, 3]]) {
    console.log('  ' + String(p).padEnd(12) + String(k).padEnd(5) +
      sidakAdjust(p, k).toExponential(12).padEnd(24) + (1 - (1 - p) ** k).toExponential(12));
  }
  console.log('\n  The two agree wherever the literal is trustworthy. The form assumes the k groups are');
  console.log('  independent, which is the same assumption Fisher makes, failing in the opposite direction.');
  process.exit(0);
}

if (arg('--uniformity')) {
  // The negative control at rho = 0 asserts that the LAYER is calibrated. It can
  // only do that if the p-values handed to the layer are themselves uniform, so
  // this measures the probe's own construction with the layer taken out: the
  // marginal tail of p, and the tail of sidakAdjust(min of m independent p, m),
  // which is exactly Uniform(0,1) when the inputs are. Shipped sidakAdjust,
  // shipped chiSquaredP, nothing else.
  const N = Number(process.env.DRAWS) || 2000000;
  for (const side of [{ k: 'two-sided', f: pTwoSided }, { k: 'one-sided', f: pOneSided }]) {
    const rnd = mulberry32(0x5369A + (side.k === 'one-sided' ? 7 : 0)), randn = makeNormal(rnd);
    let below = 0, belowN = 0;
    const minAdj = { 2: 0, 3: 0, 6: 0, 10: 0 };
    const buf = [];
    for (let d = 0; d < N; d++) {
      const p = side.f(randn());
      if (p < ALPHA.FLAG) below++;
      if (p < ALPHA.NOTE) belowN++;
      buf.push(p);
      if (buf.length === 10) {
        for (const m of [2, 3, 6, 10]) {
          let mn = 1; for (let i = 0; i < m; i++) if (buf[i] < mn) mn = buf[i];
          if (sidakAdjust(mn, m) < ALPHA.FLAG) minAdj[m]++;
        }
        buf.length = 0;
      }
    }
    const se = (r, n) => Math.sqrt(r * (1 - r) / n);
    console.log(`\n### ${side.k}: marginal uniformity of the probe's p construction, ${N} draws\n`);
    for (const [lbl, hit, nom, n] of [
      ['P(p < ALPHA.FLAG)', below, ALPHA.FLAG, N],
      ['P(p < ALPHA.NOTE)', belowN, ALPHA.NOTE, N],
    ]) {
      const r = hit / n;
      console.log(`  ${lbl.padEnd(22)} ${(100 * r).toFixed(4)}%  nominal ${(100 * nom).toFixed(4)}%  z = ${((r - nom) / se(nom, n)).toFixed(2)}`);
    }
    console.log(`\n  sidakAdjust(min of m independent p, m) < ALPHA.FLAG — exactly nominal when p is uniform\n`);
    for (const m of [2, 3, 6, 10]) {
      const n = Math.floor(N / 10), r = minAdj[m] / n;
      console.log(`  m = ${String(m).padEnd(3)} ${(100 * r).toFixed(4)}%  nominal ${(100 * ALPHA.FLAG).toFixed(4)}%  z = ${((r - ALPHA.FLAG) / se(ALPHA.FLAG, n)).toFixed(2)}   (${n} sets)`);
    }
  }
  process.exit(0);
}

if (arg('--digest')) {
  // Shipped fields ONLY. Identical with and without the hook, and identical
  // with and without the requestAnimationFrame shim.
  const rnd = mulberry32(0x53363900), randn = makeNormal(rnd);
  const out = [];
  for (const m of [2, 3, 6, 10]) {
    for (const rho of [0, 0.5, 0.9]) {
      for (const promoted of [false, true]) {
        for (let d = 0; d < 250; d++) {
          const r = await oneDraw(m, rho, pTwoSided, promoted, randn);
          out.push([r.flag, r.worstGroupFlagRaw, r.multiplicityCorrected ? 1 : 0,
            r.groupMinP === null ? 'null' : r.groupMinP.toExponential(17),
            r.groupMinPAdj === null ? 'null' : r.groupMinPAdj.toExponential(17),
            r.fisherChi, r.fisherDF, r.fisherP, r.groupsAssessed, r.groupsFlagged].join('|'));
        }
      }
    }
  }
  console.log(`draws ${out.length}`);
  console.log(out.join('\n'));
  process.exit(0);
}

if (arg('--cell')) {
  // One grid cell through the same machinery, at arbitrary depth. Exists because
  // a control cell that does not regress across seed bases has to be settled by
  // precision rather than by repetition.
  //   CELL="m,rho,side,branch" DRAWS=4000000 SEEDBASE=... --cell
  const [mS, rhoS, sideS, brS] = (process.env.CELL || '10,0,two-sided,guard-held').split(',');
  const m = Number(mS), rho = Number(rhoS);
  const pOf = sideS === 'one-sided' ? pOneSided : pTwoSided;
  const promoted = brS === 'guard-failed';
  const N = Number(process.env.DRAWS) || 1000000;
  const rnd = mulberry32(Number(process.env.SEEDBASE) || 0x5336900), randn = makeNormal(rnd);
  const hit = { F: [0, 0], S: [0, 0], B: [0, 0], C: [0, 0] };
  let guardHeld = 0;
  for (let d = 0; d < N; d++) {
    const r = await oneDraw(m, rho, pOf, promoted, randn);
    if (r.multiplicityCorrected) guardHeld++;
    for (const [k, f] of [['F', HOOKED ? r.__s369.fisherFlag : 'LOW'],
                          ['S', HOOKED ? r.__s369.groupArmFlag : (r.multiplicityCorrected ? flagFromP(r.groupMinPAdj) : r.worstGroupFlagRaw)],
                          ['B', r.worstGroupFlagRaw], ['C', r.flag]]) {
      if (f === 'HIGH') { hit[k][0]++; hit[k][1]++; } else if (f === 'MODERATE') hit[k][1]++;
    }
  }
  const se = (r) => Math.sqrt(r * (1 - r) / N);
  console.log(`### cell m=${m} rho=${rho} ${sideS} ${brS}, ${N} draws, guard held ${(100 * guardHeld / N).toFixed(2)}%\n`);
  console.log('  arm         at ALPHA.FLAG            z vs 0.001      at ALPHA.NOTE            z vs 0.01');
  for (const [k, name] of [['F', 'Fisher'], ['S', 'group arm'], ['B', 'bare max'], ['C', 'combined']]) {
    const rf = hit[k][0] / N, rn = hit[k][1] / N;
    console.log('  ' + name.padEnd(12) +
      `${(100 * rf).toFixed(4)}% (${(100 * se(ALPHA.FLAG)).toFixed(4)})`.padEnd(25) +
      ((rf - ALPHA.FLAG) / se(ALPHA.FLAG) >= 0 ? '+' : '') + ((rf - ALPHA.FLAG) / se(ALPHA.FLAG)).toFixed(2).padEnd(16) +
      `${(100 * rn).toFixed(4)}% (${(100 * se(ALPHA.NOTE)).toFixed(4)})`.padEnd(25) +
      ((rn - ALPHA.NOTE) / se(ALPHA.NOTE) >= 0 ? '+' : '') + ((rn - ALPHA.NOTE) / se(ALPHA.NOTE)).toFixed(2));
  }
  process.exit(0);
}

if (arg('--time')) {
  const rnd = mulberry32(1), randn = makeNormal(rnd);
  for (const m of [2, 10]) {
    const N = 20000, t0 = Date.now();
    for (let d = 0; d < N; d++) await oneDraw(m, 0.5, pTwoSided, false, randn);
    const ms = Date.now() - t0;
    console.log(`  m=${m}: ${N} draws in ${(ms / 1000).toFixed(1)}s  (${(ms / N * 1000).toFixed(1)} us/draw)`);
  }
  process.exit(0);
}

if (arg('--grid')) {
  if (!HOOKED) {
    console.log('The grid needs the arm flags. Re-run with:');
    console.log('  node --import ./test/probes/s369-arm-flags-hook.mjs test/probes/probe-s369-aggregate-per-group.mjs --grid');
    process.exit(1);
  }
  const DRAWS = Number(process.env.DRAWS) || 20000;
  // Every cell is seeded from this plus its own coordinates, so a second run at
  // a different base is an independent replicate of the whole grid — which is
  // how the negative control's largest excursion gets settled rather than
  // argued about. The output path carries the base for the same reason.
  const SEEDBASE = Number(process.env.SEEDBASE) || 0x5336900;
  const RHOS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const MS = [{ m: 2, label: 'shipped' }, { m: 3, label: 'shipped' },
              { m: 6, label: 'counterfactual' }, { m: 10, label: 'counterfactual' }];
  const SIDES = [{ key: 'two-sided', f: pTwoSided }, { key: 'one-sided', f: pOneSided }];
  const BRANCHES = [{ key: 'guard-held', promoted: false }, { key: 'guard-failed', promoted: true }];

  console.log(`### S369 Part 1 — aggregatePerGroup under equicorrelated groups`);
  console.log(`    ${DRAWS} draws per cell. ALPHA.FLAG = ${ALPHA.FLAG}, ALPHA.NOTE = ${ALPHA.NOTE}, both imported.`);
  console.log(`    Rates are fractions of draws whose ARM FLAG is HIGH (p < ALPHA.FLAG) or`);
  console.log(`    HIGH-or-MODERATE (p < ALPHA.NOTE). flagFromP compares strictly, so the two readings coincide.`);
  console.log(`    se is the Monte-Carlo standard error sqrt(r(1-r)/N) of the rate beside it.\n`);

  const rows = [];
  let mismatches = 0, guardCheckFails = 0;
  const t0 = Date.now();

  for (const br of BRANCHES) {
    for (const side of SIDES) {
      for (const { m, label } of MS) {
        for (const rho of RHOS) {
          const rnd = mulberry32(SEEDBASE + m * 1000 + Math.round(rho * 10) * 7
            + (side.key === 'one-sided' ? 131 : 0) + (br.promoted ? 977 : 0));
          const randn = makeNormal(rnd);
          const hit = { F: [0, 0], S: [0, 0], B: [0, 0], C: [0, 0] };
          let guardHeld = 0, zeroP = 0;
          const medF = [], medS = [], medMin = [];
          for (let d = 0; d < DRAWS; d++) {
            const r = await oneDraw(m, rho, side.f, br.promoted, randn);
            const fF = r.__s369.fisherFlag, fS = r.__s369.groupArmFlag;
            const fB = r.worstGroupFlagRaw, fC = r.flag;
            // the shipped combination, re-checked on every draw
            const expect = flagRankOf(fF) >= flagRankOf(fS) ? fF : fS;
            if (expect !== fC) mismatches++;
            if (r.multiplicityCorrected) {
              guardHeld++;
              if (flagFromP(r.groupMinPAdj) !== fS) guardCheckFails++;
              medS.push(r.groupMinPAdj);
            } else if (fS !== fB) guardCheckFails++;
            for (const [k, f] of [['F', fF], ['S', fS], ['B', fB], ['C', fC]]) {
              if (f === 'HIGH') { hit[k][0]++; hit[k][1]++; }
              else if (f === 'MODERATE') hit[k][1]++;
            }
            medF.push(r.__s369.fisherPExact);
            if (r.groupMinP !== null) medMin.push(r.groupMinP);
            if (r.fisherDF !== 2 * m) zeroP++;
          }
          const med = (a) => { if (!a.length) return null; a.sort((x, y) => x - y); const n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
          rows.push({
            branch: br.key, side: side.key, m, mLabel: label, rho,
            draws: DRAWS, guardHeld: guardHeld / DRAWS, dfDropped: zeroP,
            rate: Object.fromEntries(Object.entries(hit).map(([k, v]) => [k, { flag: v[0] / DRAWS, note: v[1] / DRAWS }])),
            medFisherP: med(medF), medSidakP: med(medS), medGroupMinP: med(medMin),
          });
        }
      }
    }
  }

  const se = (r, n) => Math.sqrt(r * (1 - r) / n);
  const cell = (r, n) => `${(100 * r).toFixed(3)}%(${(100 * se(r, n)).toFixed(3)})`;

  for (const br of BRANCHES) {
    for (const side of SIDES) {
      for (const thr of ['flag', 'note']) {
        const nominal = thr === 'flag' ? ALPHA.FLAG : ALPHA.NOTE;
        console.log(`\n## ${br.key} · ${side.key} · rate at ALPHA.${thr.toUpperCase()} = ${nominal} (nominal ${(100 * nominal).toFixed(1)}%)`);
        console.log('  ' + 'm'.padEnd(5) + 'kind'.padEnd(16) + 'rho'.padEnd(6) + 'guard'.padEnd(9) +
          'Fisher'.padEnd(18) + 'group arm'.padEnd(18) + 'bare max'.padEnd(18) + 'combined'.padEnd(18));
        console.log('  ' + '-'.repeat(106));
        for (const r of rows.filter(x => x.branch === br.key && x.side === side.key)) {
          console.log('  ' + String(r.m).padEnd(5) + r.mLabel.padEnd(16) + r.rho.toFixed(1).padEnd(6) +
            `${(100 * r.guardHeld).toFixed(1)}%`.padEnd(9) +
            cell(r.rate.F[thr], r.draws).padEnd(18) + cell(r.rate.S[thr], r.draws).padEnd(18) +
            cell(r.rate.B[thr], r.draws).padEnd(18) + cell(r.rate.C[thr], r.draws).padEnd(18));
        }
      }
      console.log(`\n## ${br.key} · ${side.key} · medians`);
      console.log('  ' + 'm'.padEnd(5) + 'rho'.padEnd(6) + 'median Fisher p'.padEnd(20) +
        'median Sidak-adj p'.padEnd(22) + 'median min group p'.padEnd(22) + 'df dropped');
      console.log('  ' + '-'.repeat(96));
      for (const r of rows.filter(x => x.branch === br.key && x.side === side.key)) {
        const f = (v) => (v === null ? '—' : v.toPrecision(6));
        console.log('  ' + String(r.m).padEnd(5) + r.rho.toFixed(1).padEnd(6) +
          f(r.medFisherP).padEnd(20) + f(r.medSidakP).padEnd(22) + f(r.medGroupMinP).padEnd(22) + String(r.dfDropped));
      }
    }
  }

  console.log(`\n### Integrity`);
  console.log(`  draws total                                  ${rows.length * DRAWS}`);
  console.log(`  combined flag != max(Fisher, group arm)      ${mismatches}`);
  console.log(`  group arm inconsistent with its own guard    ${guardCheckFails}`);
  console.log(`  draws where a group p was dropped from df    ${rows.reduce((s, r) => s + r.dfDropped, 0)}`);
  console.log(`  wall clock                                   ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  mkdirSync(B + 'test/probes/out-s369', { recursive: true });
  const out = `test/probes/out-s369/grid-${SEEDBASE.toString(16)}.json`;
  writeFileSync(B + out,
    JSON.stringify({ draws: DRAWS, seedBase: SEEDBASE, alpha: ALPHA, mismatches, guardCheckFails, rows }, null, 1));
  console.log(`  written                                      ${out}`);
  process.exit(0);
}

console.log('Pick a mode: --hookdiff, --controls, --digest, --time, --grid');
