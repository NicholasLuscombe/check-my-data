// Round 2 — recompute §3's rejections from the tracked manifest and diff them
// against what the run log records. Read-only. Writes nothing.
//   node scripts/round2-recompute.mjs
//
// The run log claims the rejections are recomputable rather than asserted.
// This is that recomputation. It also reports the tabular payload per deposit
// and tests storageSize against the file list.

import { readFileSync } from 'node:fs';

const LOG = 'docs/shared/ROUND2-RUN-LOG.md';
const MANIFEST = 'docs/shared/round2-raw/round2-manifest.json';
const CAP = 50 * 1024 * 1024;                       // 50 MiB, per ImportView.jsx:298
const EXTS = ['.xlsx', '.xls', '.csv', '.tsv'];     // §6.2's list, verbatim
const TABULAR_MIME = [
  'text/csv', 'application/csv', 'text/tab-separated-values',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MiB = 1024 ** 2, GiB = 1024 ** 3;
const fmt = b => b >= GiB ? `${(b / GiB).toFixed(2)} GiB`
  : b >= MiB ? `${(b / MiB).toFixed(1)} MiB` : `${(b / 1024).toFixed(1)} KiB`;

// ---------- what the run log records ----------
const logged = new Map();   // position -> {doi, outcome, reason}
for (const line of readFileSync(LOG, 'utf8').split('\n')) {
  const m = line.match(/^\|\s*(\d+)\s*\|\s*(doi:\S+?)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/);
  if (m) logged.set(Number(m[1]), { doi: m[2], outcome: m[5].trim(), reason: m[6].trim() });
}

// ---------- the manifest ----------
const records = JSON.parse(readFileSync(MANIFEST, 'utf8'));
console.log(`manifest records: ${records.length}   run-log rows: ${logged.size}\n`);

// ---------- storageSize against the file list ----------
let sizeExact = 0, sizeOff = [];
for (const r of records) {
  const sum = (r.files ?? []).reduce((a, f) => a + (f.size ?? 0), 0);
  if (sum === r.storageSize) sizeExact++;
  else sizeOff.push({ pos: r.position, storageSize: r.storageSize, fileSum: sum });
}
console.log(`storageSize equals the sum of files[].size on ${sizeExact} of ${records.length}`);
if (sizeOff.length) {
  console.log('  mismatches — the bundle cost is NOT the file list on these:');
  for (const m of sizeOff) console.log(`    pos ${m.pos}: storageSize ${m.storageSize}, files sum ${m.fileSum}`);
}

// ---------- file status census ----------
const statuses = new Map();
for (const r of records) for (const f of r.files ?? []) statuses.set(f.status, (statuses.get(f.status) ?? 0) + 1);
console.log(`\nfile status values: ${[...statuses].map(([k, v]) => `${k}=${v}`).join('  ')}`);
const deleted = records.flatMap(r => (r.files ?? []).filter(f => f.status === 'deleted').map(f => `pos ${r.position} ${f.path}`));
if (deleted.length) console.log(`  DELETED files present — check whether §6.2's "current version" excludes them:\n    ${deleted.join('\n    ')}`);

// ---------- the two readings of "a tabular file in a considered format" ----------
const byExt = f => EXTS.some(e => String(f.path ?? '').toLowerCase().endsWith(e));
const byMime = f => TABULAR_MIME.includes(String(f.mimeType ?? '').toLowerCase());

function classify(r, considered) {
  const live = (r.files ?? []).filter(f => f.status !== 'deleted');
  const files = live.filter(considered);
  if (files.length === 0) return { outcome: 'rejected', reason: 'no tabular file in a considered format', files };
  if (files.every(f => f.size > CAP)) return { outcome: 'rejected', reason: 'only considered file exceeds the 50 MiB import cap', files };
  return { outcome: '', reason: '', files };
}

for (const [label, pred] of [['A — extension only', byExt], ['B — extension OR tabular mimeType', f => byExt(f) || byMime(f)]]) {
  console.log(`\n===== reading ${label} =====`);
  let rejected = 0, agree = 0;
  const disagree = [];
  for (const r of records) {
    const c = classify(r, pred);
    if (c.outcome === 'rejected') rejected++;
    const l = logged.get(r.position);
    if (!l) { disagree.push(`pos ${r.position}: no run-log row`); continue; }
    if (c.outcome === l.outcome && c.reason === l.reason) agree++;
    else disagree.push(`pos ${r.position} ${r.doi}\n      run log:  "${l.outcome}" / "${l.reason}"\n      recompute: "${c.outcome}" / "${c.reason}"`);
  }
  console.log(`rejections: ${rejected}    rows matching the run log: ${agree} of ${records.length}`);
  if (disagree.length) { console.log('DISAGREEMENTS:'); for (const d of disagree) console.log(`    ${d}`); }
  else console.log('exact match on every row.');
}

// ---------- tabular payload, on reading A ----------
console.log(`\n===== tabular payload, extension reading, deposits still standing =====`);
const standing = records.filter(r => (logged.get(r.position)?.outcome ?? '') === '');
let payload = 0, bundle = 0;
const rows = standing.map(r => {
  const files = (r.files ?? []).filter(f => f.status !== 'deleted' && byExt(f));
  const p = files.reduce((a, f) => a + f.size, 0);
  payload += p; bundle += r.storageSize;
  return { pos: r.position, n: files.length, payload: p, bundle: r.storageSize };
});
console.log(`standing: ${rows.length}   bundle total: ${fmt(bundle)}   tabular payload total: ${fmt(payload)}`);
console.log(`\nworst bundle-to-payload ratios — where per-file access is worth most:`);
for (const r of [...rows].sort((a, b) => (b.bundle / Math.max(b.payload, 1)) - (a.bundle / Math.max(a.payload, 1))).slice(0, 8)) {
  console.log(`  pos ${String(r.pos).padStart(2)}  bundle ${fmt(r.bundle).padStart(10)}  payload ${fmt(r.payload).padStart(10)}  ${r.n} file(s)`);
}
const noFiles = rows.filter(r => r.n === 0);
if (noFiles.length) console.log(`\nSTANDING BUT NO CONSIDERED FILE — these should have been rejected: ${noFiles.map(r => r.pos).join(', ')}`);
