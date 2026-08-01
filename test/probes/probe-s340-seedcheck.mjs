/* S340 step 2 — verify the seed injection is honest.

   Seed offset 0 XORs nothing into the PRNG state, so the sweep's seed-0 arm
   must reproduce the shipped stream exactly. This compares it against an
   un-hooked run of probe-s340-pdump.mjs and reports any test x fixture cell
   where the flag or the p-value differs. A clean result means the hook changes
   the seed and nothing else.

     node test/probes/probe-s340-pdump.mjs unhooked
     node --import ./test/probes/s340-seed-hook.mjs test/probes/probe-s340-seedsweep.mjs 8
     node test/probes/probe-s340-seedcheck.mjs */
import { readFileSync } from 'fs';

const U = JSON.parse(readFileSync('test/probes/out-s340/unhooked.json', 'utf8'));
const S = JSON.parse(readFileSync('test/probes/out-s340-seed/sweep.json', 'utf8'));

let checked = 0;
const diffs = [];
for (const [file, F] of Object.entries(S.fixtures)) {
  const u = U.fixtures[file];
  if (!u) { diffs.push(`${file}: absent from the un-hooked run`); continue; }
  if (u.severity !== F.severityBySeed[0]) {
    diffs.push(`${file}: severity ${u.severity} un-hooked vs ${F.severityBySeed[0]} at seed 0`);
  }
  const uByName = new Map(u.tests.map(t => [t.name, t]));
  for (const [name, T] of Object.entries(F.tests)) {
    const ut = uByName.get(name);
    checked++;
    if (!ut) { diffs.push(`${file} / ${name}: absent from the un-hooked run`); continue; }
    if (ut.flag !== T.flags[0]) diffs.push(`${file} / ${name}: flag ${ut.flag} vs ${T.flags[0]}`);
    const a = ut.p, b = T.ps[0];
    if (a === null && b === null) continue;
    if (a === null || b === null || a !== b) diffs.push(`${file} / ${name}: p ${a} vs ${b}`);
  }
}

console.log(`seed-0 identity check: ${checked} test x fixture cells compared against the un-hooked run`);
if (diffs.length === 0) {
  console.log('IDENTICAL — the hook moves the seed and nothing else.');
} else {
  console.log(`${diffs.length} difference(s):`);
  diffs.forEach(d => console.log('  ' + d));
  process.exitCode = 1;
}
