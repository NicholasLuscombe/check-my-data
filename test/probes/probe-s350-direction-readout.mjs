// probe-s350-direction-readout.mjs — S350 Part 8.
//
// A read-out, not a measurement. Everything below comes from the per-unit
// tables already committed in docs/shared/S350-CLASSB-SWEEP-DATA.md, which
// Part 5 produced for five fixtures under both nulls at twenty seeds each.
//
// The question: across every `different`-direction Stage-1 unit in that data,
// what is the distribution of adjusted p under each null, and how many units
// cross ALPHA.NOTE when the null is corrected?
//
// The claim under test is that the `similar`-only restriction on Stage-1
// properties has never been load-bearing, because it suppressed an arm with no
// power under the free null. If any `different`-direction Stage-1 unit already
// sat below the threshold under the free null, the claim is wrong and the
// filter has been suppressing live results all along.
//
// A unit's `dir` field is a count across the twenty seeds, so a unit can be
// mixed. Units are bucketed by majority direction and the mixed ones are
// reported separately rather than folded in.
//
// The file carries two runs — the shipped B ladder over all five fixtures, and
// B = 9999 over DS11 and DS16. They are parsed and reported separately, because
// the reachable p lattice differs between them.
//
// Not named *.test.* or *.spec.*, so `vitest run` does not collect it.
// READ-ONLY. Reads one committed markdown file and ALPHA from src/.
//
// Usage:  node test/probes/probe-s350-direction-readout.mjs

import { readFileSync } from 'fs';

const { ALPHA } = await import('../../src/constants/thresholds.js');

const SRC = 'docs/shared/S350-CLASSB-SWEEP-DATA.md';
const text = readFileSync(SRC, 'utf-8');
const lines = text.split('\n');

// One record per (run, fixture, arm, unit).
//
// The pair column is padEnd(26) in the producer, so a pair whose name is
// exactly 26 characters — "Inhibitor_A vs Inhibitor_B", "Treatment_A vs
// Treatment_B" — is followed by a single space, not two. Matching on \s{2,}
// there drops those rows silently. The declared-count check below is what
// catches that class of gap rather than trusting the pattern.
const UNIT_RE = /^\s+S(\d) (P\d) (.+?)\s{2,}(\S.*?)\s+dir (\{.*?\})\s+adjP \[(\S+) \.\. (\S+)\] med (\S+) dist \[(\S+) \.\. (\S+)\] forensic (\d+)\/(\d+) gate (\d+)\/(\d+) FLAGS (\d+)\/(\d+)/;

let run = null, fixture = null, arm = null;
const records = [];
const declared = [];   // { run, fixture, arm, n } from the "per running unit (N)" line
for (const ln of lines) {
  if (ln.startsWith('## Run 1')) { run = 'shipped B ladder'; continue; }
  if (ln.startsWith('## Run 2')) { run = 'B = 9999'; continue; }
  const fx = ln.match(/^── (\S+\.csv)/);
  if (fx) { fixture = fx[1]; arm = null; continue; }
  if (/^\s+ARM free permutation/.test(ln)) { arm = 'free'; continue; }
  if (/^\s+ARM within-subject relabel/.test(ln)) { arm = 'paired'; continue; }
  const dc = ln.match(/^\s+per running unit \((\d+)\)/);
  if (dc && run && fixture && arm) { declared.push({ run, fixture, arm, n: Number(dc[1]) }); continue; }
  const m = ln.match(UNIT_RE);
  if (!m || !run || !fixture || !arm) continue;
  const dirs = JSON.parse(m[5]);
  const nSeeds = Object.values(dirs).reduce((a, b) => a + b, 0);
  const majority = Object.keys(dirs).sort((a, b) => dirs[b] - dirs[a])[0];
  const mixed = Object.keys(dirs).length > 1;
  records.push({
    run, fixture, arm,
    stage: Number(m[1]), id: m[2], prop: m[3].trim(), pair: m[4].trim(),
    dirs, nSeeds, majority, mixed,
    adjMin: Number(m[6]), adjMax: Number(m[7]), adjMed: Number(m[8]),
    forensic: Number(m[11]), forensicN: Number(m[12]),
    gate: Number(m[13]), flags: Number(m[15]),
  });
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]); };
const fmt = (x) => Number.isFinite(x) ? x.toPrecision(4) : String(x);

console.log('S350 Part 8 — `different`-direction Stage-1 units, read out of the committed sweep data\n');
console.log(`Source: ${SRC} — ${records.length} (run x fixture x arm x unit) records parsed.`);
console.log(`ALPHA.NOTE = ${ALPHA.NOTE}. "Below" means the unit's own adjusted p is under it.\n`);

if (!records.length) {
  console.log('HALT — nothing parsed. The table format has changed and this read-out is not valid.');
  process.exit(1);
}

// Completeness gate. Each (run, fixture, arm) block declares its own unit count
// on its "per running unit (N)" line. A parse that misses rows is silent
// otherwise, and a read-out built on a partial table is worse than none.
let gaps = 0;
for (const d of declared) {
  const got = records.filter(r => r.run === d.run && r.fixture === d.fixture && r.arm === d.arm).length;
  if (got !== d.n) {
    console.log(`   !! ${d.run} / ${d.fixture} / ${d.arm}: declared ${d.n} units, parsed ${got}`);
    gaps++;
  }
}
if (gaps) {
  console.log('\nHALT — the parse does not reproduce the declared unit counts. Read-out not valid.');
  process.exit(1);
}
console.log(`Completeness: ${declared.length} declared blocks, every one matched by the parse.\n`);

for (const runName of ['shipped B ladder', 'B = 9999']) {
  const inRun = records.filter(r => r.run === runName);
  if (!inRun.length) continue;
  const fixtures = [...new Set(inRun.map(r => r.fixture))];
  console.log(`══ Run: ${runName} — ${fixtures.length} fixture(s): ${fixtures.join(', ')} ══\n`);

  const s1 = inRun.filter(r => r.stage === 1);
  const diff = s1.filter(r => r.majority === 'different');
  const sim = s1.filter(r => r.majority === 'similar');
  console.log(`   Stage-1 unit records: ${s1.length} — ${diff.length} majority-different, ${sim.length} majority-similar` +
    ` (${s1.filter(r => r.mixed).length} of the ${s1.length} split their seeds across both directions)`);

  for (const armName of ['free', 'paired']) {
    const xs = diff.filter(r => r.arm === armName);
    if (!xs.length) { console.log(`\n   ${armName}: no majority-different Stage-1 units.`); continue; }
    const meds = xs.map(r => r.adjMed);
    const belowMed = xs.filter(r => r.adjMed < ALPHA.NOTE);
    const belowEver = xs.filter(r => r.adjMin < ALPHA.NOTE);
    console.log(`\n   ── ${armName === 'free' ? 'free null (shipped)' : 'corrected null (within-subject relabel)'} — ${xs.length} units`);
    console.log(`      adjusted p (median over seeds, per unit): min ${fmt(Math.min(...meds))}  median ${fmt(median(meds))}  max ${fmt(Math.max(...meds))}`);
    console.log(`      units whose median adjusted p is below ALPHA.NOTE: ${belowMed.length}/${xs.length}`);
    console.log(`      units below on at least one seed:                  ${belowEver.length}/${xs.length}`);
    for (const r of belowEver.sort((a, b) => a.adjMed - b.adjMed)) {
      console.log(`         ${r.fixture.padEnd(34)} ${r.id} ${r.prop.padEnd(22)} ${r.pair.padEnd(26)}` +
        ` adjP med ${fmt(r.adjMed)} [${fmt(r.adjMin)} .. ${fmt(r.adjMax)}]  forensic ${r.forensic}/${r.forensicN}  FLAGS ${r.flags}/${r.forensicN}`);
    }
  }

  // Crossings: same fixture, same unit, above the threshold under the free null
  // and below it under the corrected one, or the reverse.
  const key = r => `${r.fixture}|${r.id}|${r.pair}`;
  const freeBy = new Map(diff.filter(r => r.arm === 'free').map(r => [key(r), r]));
  const pairBy = new Map(diff.filter(r => r.arm === 'paired').map(r => [key(r), r]));
  const both = [...pairBy.keys()].filter(k => freeBy.has(k));
  const toBelow = [], toAbove = [], stayBelow = [];
  for (const k of both) {
    const f = freeBy.get(k), p = pairBy.get(k);
    const fb = f.adjMed < ALPHA.NOTE, pb = p.adjMed < ALPHA.NOTE;
    if (!fb && pb) toBelow.push([f, p]);
    else if (fb && !pb) toAbove.push([f, p]);
    else if (fb && pb) stayBelow.push([f, p]);
  }
  console.log(`\n   ── crossings, on the ${both.length} units present in both arms`);
  console.log(`      above -> below when the null is corrected: ${toBelow.length}`);
  for (const [f, p] of toBelow) console.log(`         ${f.fixture} ${f.id} ${f.prop} (${f.pair}): ${fmt(f.adjMed)} -> ${fmt(p.adjMed)}`);
  console.log(`      below -> above: ${toAbove.length}`);
  for (const [f, p] of toAbove) console.log(`         ${f.fixture} ${f.id} ${f.prop} (${f.pair}): ${fmt(f.adjMed)} -> ${fmt(p.adjMed)}`);
  console.log(`      below under BOTH nulls: ${stayBelow.length}`);
  for (const [f, p] of stayBelow) console.log(`         ${f.fixture} ${f.id} ${f.prop} (${f.pair}): ${fmt(f.adjMed)} -> ${fmt(p.adjMed)}`);

  // Units that keep their majority direction across arms are comparable; ones
  // that flip are named, because a "crossing" for those conflates two changes.
  const s1key = new Map(s1.filter(r => r.arm === 'free').map(r => [key(r), r]));
  const flipped = s1.filter(r => r.arm === 'paired' && s1key.has(key(r)) && s1key.get(key(r)).majority !== r.majority);
  console.log(`\n   ── Stage-1 units whose majority direction flips between the arms: ${flipped.length}`);
  for (const r of flipped) {
    const f = s1key.get(key(r));
    console.log(`         ${r.fixture} ${r.id} ${r.prop} (${r.pair}): ${f.majority} -> ${r.majority}`);
  }
  console.log('');
}

console.log('══ verdict on the claim ══\n');
const shipped = records.filter(r => r.run === 'shipped B ladder' && r.stage === 1 && r.majority === 'different' && r.arm === 'free');
const liveUnderFree = shipped.filter(r => r.adjMed < ALPHA.NOTE);
if (liveUnderFree.length === 0) {
  console.log('No majority-different Stage-1 unit reaches ALPHA.NOTE under the free null on any of the five');
  console.log('fixtures. On this corpus the claim survives: the filter suppressed nothing live.');
} else {
  console.log(`${liveUnderFree.length} majority-different Stage-1 unit(s) ALREADY sit below ALPHA.NOTE under the FREE null:`);
  for (const r of liveUnderFree) {
    console.log(`   ${r.fixture} ${r.id} ${r.prop} (${r.pair}) — adjP med ${fmt(r.adjMed)}, forensic ${r.forensic}/${r.forensicN}`);
  }
  console.log('\nThe claim does not survive. The forensic-direction filter has been suppressing units at');
  console.log('flag-level p under the shipped null, not only under the corrected one.');
}
