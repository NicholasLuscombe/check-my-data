/* S341 — reduce the three branch-cost arms to the report tables.
   node test/probes/analyse-s341-branch.mjs   (after all three arms have run) */
import { readFileSync, writeFileSync } from 'fs';

const OUT = 'test/probes/out-s341-branch';
const arms = ['shipped', 'high', 'low199'];
const D = {};
for (const a of arms) D[a] = JSON.parse(readFileSync(`${OUT}/${a}.json`, 'utf8'));

/* the eight row-count-branched tests, by result name */
const SCOPE = {
  'Constant-Offset Blocks':          { file: 'constantOffset.js',            sel: 'nR',              decl: [199, 499, 999],  trip: '>10000 → 199; >1000 → 499; else 999' },
  'LOESS Residual Analysis':         { file: 'loessResidual.js',             sel: 'validRows.length',decl: [499, 4999],      trip: '<=100 → 4999; else 499' },
  'Regional Noise Homogeneity':      { file: 'regionalNoise.js',             sel: 'validRows.length',decl: [499, 4999],      trip: '<=100 → 4999; else 499' },
  'Blocked Mahalanobis':             { file: 'blockedMahalanobis.js',        sel: 'maxN',            decl: [999, 4999],      trip: '<=500 → 4999; else 999' },
  'Inter-Replicate Correlation':     { file: 'interReplicateCorrelation.js', sel: 'maxN',            decl: [199, 499, 999],  trip: '<=100 → 999; <=1000 → 499; else 199' },
  'Runs Test':                       { file: 'runs.js',                      sel: 'maxN',            decl: [199, 499, 999],  trip: '<=100 → 999; <=1000 → 499; else 199' },
  'Cross-Condition Consistency':     { file: 'crossConditionConsistency.js', sel: 'maxN',            decl: [199, 499, 999],  trip: '<=1000 → 999; <=10000 → 499; else 199' },
  'Windowed Autocorrelation':        { file: 'windowedAutocorrelation.js',   sel: 'nR',              decl: [199, 499, 999],  trip: '<=500 → 999; <=5000 → 499; else 199' },
};

const fixtures = Object.keys(D.shipped.fixtures);
const allTests = new Set();
for (const f of fixtures) for (const t of Object.keys(D.shipped.fixtures[f].tests)) allTests.add(t);

const uniq = (a) => [...new Set(a)];
const cell = (arm, f, t) => D[arm].fixtures[f]?.tests?.[t] || null;

/* ── 0. STREAM-SEPARATION CHECK ─────────────────────────────────────────────
   Only the eight scoped tests may move between arms. Anything else moving is a
   defect in the S340 per-test stream separation and outranks the whole pass. */
const leaks = [];
for (const t of allTests) {
  if (SCOPE[t]) continue;
  for (const f of fixtures) {
    const s = cell('shipped', f, t); if (!s) continue;
    for (const a of ['high', 'low199']) {
      const x = cell(a, f, t); if (!x) continue;
      if (JSON.stringify(s.ps) !== JSON.stringify(x.ps) || JSON.stringify(s.flags) !== JSON.stringify(x.flags)) {
        leaks.push({ test: t, fixture: f, arm: a,
          shippedP: s.ps[0], armP: x.ps[0], shippedFlag: s.flags[0], armFlag: x.flags[0] });
      }
    }
  }
}

/* ── A. branch census ──────────────────────────────────────────────────── */
const census = {};
for (const t of Object.keys(SCOPE)) {
  const rows = [];
  for (const f of fixtures) {
    const s = cell('shipped', f, t);
    if (!s) continue;
    const counts = uniq(s.counts.filter((c) => c !== null));
    rows.push({ fixture: f, nRows: D.shipped.fixtures[f].nRows, nCols: D.shipped.fixtures[f].nCols,
      count: counts.length === 1 ? counts[0] : (counts.length ? counts : null),
      applicable: uniq(s.flags).join('/') !== 'N/A' });
  }
  census[t] = { ...SCOPE[t], rows };
}

/* ── B. diff table ─────────────────────────────────────────────────────── */
const NSEED = D.shipped.seeds.length;
const diff = [];
for (const t of Object.keys(SCOPE)) {
  for (const f of fixtures) {
    const S = cell('shipped', f, t), H = cell('high', f, t), L = cell('low199', f, t);
    if (!S || !H || !L) continue;
    const applicable = !(uniq(S.flags).length === 1 && S.flags[0] === 'N/A');
    const rec = { test: t, fixture: f, nRows: D.shipped.fixtures[f].nRows, applicable,
      shipped: { tiers: uniq(S.flags), p: S.ps[0], counts: uniq(S.counts.filter(c=>c!==null)) },
      high:    { tiers: uniq(H.flags), p: H.ps[0], counts: uniq(H.counts.filter(c=>c!==null)) },
      low199:  { tiers: uniq(L.flags), p: L.ps[0], counts: uniq(L.counts.filter(c=>c!==null)) } };
    rec.unstable = [S, H, L].some((x) => uniq(x.flags).length > 1);
    rec.unstableArms = ['shipped','high','low199'].filter((a,i)=>uniq([S,H,L][i].flags).length>1);
    for (const [a, X] of [['high', H], ['low199', L]]) {
      const pMoved = X.ps.some((p, i) => p !== S.ps[i]);
      const tierMovedSeeds = X.flags.filter((fl, i) => fl !== S.flags[i]).length;
      rec[a + 'Verdict'] =
        tierMovedSeeds === NSEED ? 'tier moved (all 8)' :
        tierMovedSeeds > 0       ? `tier moved (${tierMovedSeeds}/${NSEED})` :
        pMoved                   ? 'p moved, tier held' : 'unchanged';
      rec[a + 'TierSeeds'] = tierMovedSeeds;
    }
    diff.push(rec);
  }
}

/* ── C. severity ───────────────────────────────────────────────────────── */
const sev = fixtures.map((f) => ({
  fixture: f, nRows: D.shipped.fixtures[f].nRows,
  expected: D.shipped.fixtures[f].expectedSeverity,
  shipped: uniq(D.shipped.fixtures[f].severityBySeed),
  high:    uniq(D.high.fixtures[f].severityBySeed),
  low199:  uniq(D.low199.fixtures[f].severityBySeed),
}));

/* ── E. cost ───────────────────────────────────────────────────────────── */
const cost = { totals: {}, perFixture: {} };
for (const a of arms) cost.totals[a] = +(D[a].totalMs / 1000).toFixed(1);
for (const f of fixtures) {
  cost.perFixture[f] = {};
  for (const a of arms) {
    const ms = D[a].fixtures[f].msBySeed;
    cost.perFixture[f][a] = +(ms.reduce((x, y) => x + y, 0) / ms.length).toFixed(0);
  }
}

writeFileSync(`${OUT}/analysis.json`, JSON.stringify({ leaks, census, diff, sev, cost, NSEED }, null, 1));

console.log(`\n=== STREAM SEPARATION: ${leaks.length === 0 ? 'CLEAN — only scoped tests moved' : '!!! ' + leaks.length + ' OUT-OF-SCOPE MOVES !!!'}`);
if (leaks.length) for (const l of leaks.slice(0, 25)) console.log(`  ${l.test} / ${l.fixture} / ${l.arm}: p ${l.shippedP} -> ${l.armP}, ${l.shippedFlag} -> ${l.armFlag}`);

console.log('\n=== A. CENSUS (shipped realised counts) ===');
for (const [t, c] of Object.entries(census)) {
  const byCount = {};
  for (const r of c.rows) { const k = JSON.stringify(r.count); (byCount[k] ||= []).push(r.fixture); }
  console.log(`\n${t}  [${c.sel}]  ${c.trip}`);
  for (const [k, fs] of Object.entries(byCount)) console.log(`   count=${k}  n=${fs.length}  ${fs.length <= 6 ? fs.join(', ') : fs.slice(0,3).join(', ')+' …'}`);
}

console.log('\n=== B. DIFF SUMMARY ===');
const tally = {};
for (const r of diff) {
  for (const a of ['high', 'low199']) { const k = `${a}: ${r[a + 'Verdict'].replace(/\(\d+\/8\)/, '(partial)')}`; tally[k] = (tally[k] || 0) + 1; }
}
for (const [k, v] of Object.entries(tally).sort()) console.log(`  ${k}: ${v}`);
console.log('\n  --- tier moves ---');
for (const r of diff) for (const a of ['high','low199'])
  if (r[a+'TierSeeds'] > 0) console.log(`  ${r.test} / ${r.fixture} (${r.nRows}r) ${a}: ${r.shipped.tiers.join('|')} -> ${r[a].tiers.join('|')}  [${r[a+'TierSeeds']}/8 seeds]`);
console.log('\n  --- unstable cells (tier varies across seeds within an arm) ---');
for (const r of diff) if (r.unstable) console.log(`  ${r.test} / ${r.fixture}: ${r.unstableArms.map(a=>a+'='+r[a].tiers.join('|')).join('  ')}`);

console.log('\n=== C. SEVERITY ===');
for (const s of sev) {
  const moved = JSON.stringify(s.shipped)!==JSON.stringify(s.high) || JSON.stringify(s.shipped)!==JSON.stringify(s.low199);
  console.log(`  ${moved?'*':' '} ${s.fixture.padEnd(42)} exp=${s.expected}  shipped=${s.shipped.join('|')}  high=${s.high.join('|')}  low199=${s.low199.join('|')}`);
}

console.log('\n=== E. COST (total s, 8 seeds x 27 fixtures) ===');
for (const a of arms) console.log(`  ${a.padEnd(8)} ${cost.totals[a]} s   (${(cost.totals[a]/cost.totals.shipped).toFixed(3)}x shipped)`);
