/* S340 step 3 — the eight-seed channel dump.

   Chat re-derives declarations against what holds at ALL eight seeds, so the
   working material is the per-seed detail, not a summary. This turns the gate's
   JSON sidecar into a flat table a person can read, and leaves both.

   Run the gate first to produce the sidecar, then this:

     SEEDS=8 SEEDS_JSON=test/data/s340-eight-seed.json node test/validate-batch.mjs
     node test/probes/probe-s340-channel-dump.mjs test/data/s340-eight-seed.json > test/data/s340-eight-seed.txt

   Per fixture per test it prints the flag at every seed, the p at every seed,
   and the published resample count. Tests that never leave LOW or N/A at any
   seed are collapsed to one line, because a declaration is never written from
   them and listing 29 of them per fixture buries the ones that matter.

   Reads a JSON file. Touches nothing. */
import { readFileSync } from 'fs';

const path = process.argv[2] || 'test/data/s340-eight-seed.json';
const S = JSON.parse(readFileSync(path, 'utf8'));
const SEEDS = S.seeds.length;

const fmtP = v => v == null ? '—' : (v === 0 ? '0' : Math.abs(v) < 1e-4 ? v.toExponential(2) : String(Number(v.toPrecision(4))));
const pad = (s, n) => String(s).padEnd(n);

console.log(`S340 eight-seed channel dump — ${SEEDS} seeds, ${Object.keys(S.fixtures).length} fixtures`);
console.log(`seeds ${S.seeds.join(', ')} (0 = the shipped stream)`);
console.log('');
console.log('A declaration should rest on a channel that holds its tier at every seed.');
console.log('Cells marked UNSTABLE change tier across seeds and are not safe to declare.');
console.log('"count" is the resample count the test publishes; blank means it publishes none,');
console.log('and null means its permutation arm did not run on that fixture.');
console.log('');

let totalUnstable = 0;
for (const [file, F] of Object.entries(S.fixtures)) {
  const declared = new Set(S.declared?.[file] || []);
  const sev = F.severities;
  const sevConst = new Set(sev).size === 1;
  console.log('='.repeat(110));
  console.log(`${file}    declared severity ${F.expectedSeverity}    observed ${sev.join(' ')}${sevConst ? '' : '   SEVERITY NOT CONSTANT'}`);
  console.log('-'.repeat(110));

  const quiet = [];
  const rows = [];
  for (const [name, T] of Object.entries(F.tests)) {
    const tiers = new Set(T.flags);
    const everFired = T.flags.some(f => f === 'HIGH' || f === 'MODERATE');
    if (!everFired) { quiet.push(`${name}${tiers.size > 1 ? ` (${[...tiers].join('/')})` : ''}`); continue; }
    rows.push({ name, T, unstable: tiers.size > 1, declared: declared.has(name) });
  }
  rows.sort((a, b) => Number(b.unstable) - Number(a.unstable) || a.name.localeCompare(b.name));

  if (rows.length) {
    console.log(`  ${pad('test', 34)} ${pad('count', 7)} flags by seed / p by seed`);
    for (const r of rows) {
      totalUnstable += r.unstable ? 1 : 0;
      const tag = (r.declared ? ' [declared]' : '') + (r.unstable ? '  UNSTABLE' : '');
      console.log(`  ${pad(r.name, 34)} ${pad(r.T.B ?? '', 7)} ${r.T.flags.map(f => f === 'HIGH' ? 'H' : f === 'MODERATE' ? 'M' : f === 'N/A' ? '-' : 'l').join(' ')}${tag}`);
      console.log(`  ${' '.repeat(34)} ${' '.repeat(7)} ${r.T.ps.map(fmtP).join('  ')}`);
    }
  } else {
    console.log('  no test fires above LOW at any seed.');
  }
  console.log(`  quiet at every seed (${quiet.length}): ${quiet.join(', ')}`);
  console.log('');
}

console.log('='.repeat(110));
console.log(`Firing cells that change tier across the ${SEEDS} seeds: ${totalUnstable}. Those are the cells no declaration can rest on.`);
console.log('Legend: H = HIGH, M = MODERATE, l = LOW, - = N/A.');
