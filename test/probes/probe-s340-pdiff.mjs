/* S340 step 3 — diff two probe-s340-pdump.mjs runs.
   Reports: severity changes, flag changes, p-value movement per test,
   and the engine wallclock delta per fixture.

   usage: node test/probes/probe-s340-pdiff.mjs <labelA> <labelB> */
import { readFileSync } from 'fs';
import { join } from 'path';

const OUT = 'test/probes/out-s340';
const [a, b] = process.argv.slice(2);
if (!a || !b) { console.error('usage: probe-s340-pdiff.mjs <labelA> <labelB>'); process.exit(1); }
const A = JSON.parse(readFileSync(join(OUT, `${a}.json`), 'utf8'));
const B = JSON.parse(readFileSync(join(OUT, `${b}.json`), 'utf8'));

const EPS = 1e-12;
const sevChanges = [], flagChanges = [], moved = new Map();

console.log(`=== ${a} -> ${b} ===\n`);
console.log('per-fixture engine wallclock (ms) and Windowed Autocorrelation nPerm');
console.log('fixture'.padEnd(38), 'rows×cols'.padEnd(11), 'nPerm'.padEnd(12), a.padEnd(9), b.padEnd(9), 'delta');
for (const f of Object.keys(A.fixtures)) {
  const fa = A.fixtures[f], fb = B.fixtures[f];
  console.log(
    f.padEnd(38),
    `${fa.nRows}×${fa.nCols}`.padEnd(11),
    `${fa.waNPerm}→${fb.waNPerm}`.padEnd(12),
    String(fa.engineMs).padEnd(9),
    String(fb.engineMs).padEnd(9),
    `${(fb.engineMs - fa.engineMs >= 0 ? '+' : '')}${(fb.engineMs - fa.engineMs).toFixed(1)}`
  );
  if (fa.severity !== fb.severity) sevChanges.push(`${f}: ${fa.severity} -> ${fb.severity}`);
  const ta = new Map(fa.tests.map(t => [t.name, t]));
  for (const tb of fb.tests) {
    const t = ta.get(tb.name);
    if (!t) { flagChanges.push(`${f} / ${tb.name}: absent -> ${tb.flag}`); continue; }
    if (t.flag !== tb.flag) flagChanges.push(`${f} / ${tb.name}: ${t.flag} -> ${tb.flag}`);
    const pa = t.p, pb = tb.p;
    if (pa == null && pb == null) continue;
    if (pa == null || pb == null || Math.abs(pa - pb) > EPS) {
      if (!moved.has(tb.name)) moved.set(tb.name, []);
      moved.get(tb.name).push({ f, pa, pb, flag: tb.flag });
    }
  }
}
console.log(`\nbatch total: ${A.totalMs} ms -> ${B.totalMs} ms (${(B.totalMs - A.totalMs >= 0 ? '+' : '')}${(B.totalMs - A.totalMs).toFixed(0)} ms)`);

console.log(`\n=== severity changes: ${sevChanges.length} ===`);
sevChanges.forEach(s => console.log('  ' + s));

console.log(`\n=== flag (verdict tier) changes: ${flagChanges.length} ===`);
flagChanges.forEach(s => console.log('  ' + s));

const names = [...moved.keys()].sort();
console.log(`\n=== tests whose primaryP moved on at least one fixture: ${names.length} ===`);
for (const n of names) {
  const rows = moved.get(n);
  console.log(`\n  ${n}  (${rows.length} fixture${rows.length > 1 ? 's' : ''})`);
  for (const r of rows) {
    const fmt = v => v == null ? 'null' : (v < 1e-4 ? v.toExponential(3) : v.toPrecision(6));
    console.log(`    ${r.f.padEnd(36)} ${fmt(r.pa)} -> ${fmt(r.pb)}   [${r.flag}]`);
  }
}

const unchanged = [];
const allNames = new Set();
for (const f of Object.keys(A.fixtures)) for (const t of A.fixtures[f].tests) allNames.add(t.name);
for (const n of allNames) if (!moved.has(n)) unchanged.push(n);
console.log(`\n=== tests with byte-identical p on every fixture: ${unchanged.length} ===`);
console.log('  ' + unchanged.sort().join('\n  '));
