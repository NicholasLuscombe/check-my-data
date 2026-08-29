// Round 2 — bundle-size split across the deposits still standing.
// Read-only. Run from the repo root:  node scripts/round2-split.mjs
// Joins ROUND2-RUN-LOG.md §3 (rows with a blank outcome) to storageSize in round2-manifest.json.

import { readFileSync } from 'node:fs';

const LOG = 'docs/shared/ROUND2-RUN-LOG.md';
const MANIFEST = 'docs/shared/round2-raw/round2-manifest.json';

// The run log writes DOIs with a `doi:` prefix. Strip it on both sides so the join
// does not depend on which form the manifest happens to carry.
const key = s => String(s).trim().toLowerCase().replace(/^doi:/, '');

// --- the deposits still standing: blank outcome AND blank reason ---
const standing = [];
for (const line of readFileSync(LOG, 'utf8').split('\n')) {
  const m = line.match(/^\|\s*(\d+)\s*\|\s*(doi:\S+?)\s*\|[^|]*\|[^|]*\|\s*\|\s*\|\s*$/);
  if (m) standing.push({ pos: Number(m[1]), doi: m[2] });
}

// --- storageSize per DOI, found by walking the manifest rather than assuming its shape ---
const sizes = new Map();
(function walk(node) {
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (node && typeof node === 'object') {
    const doi = node.identifier ?? node.doi ?? node.DOI;
    const size = node.storageSize;
    if (typeof doi === 'string' && /10\.\d{4,}\//.test(doi) && typeof size === 'number') {
      const k = key(doi);
      if (sizes.has(k) && sizes.get(k) !== size) {
        console.error(`WARNING: two storageSize values for ${doi}: ${sizes.get(k)} and ${size}`);
      }
      sizes.set(k, size);
    }
    for (const v of Object.values(node)) walk(v);
  }
})(JSON.parse(readFileSync(MANIFEST, 'utf8')));

// --- join, and say so loudly if it does not close ---
const rows = standing.map(d => ({ ...d, bytes: sizes.get(key(d.doi)) }));
const missing = rows.filter(r => typeof r.bytes !== 'number');

console.log(`standing deposits in the run log : ${standing.length}`);
console.log(`DOIs carrying storageSize        : ${sizes.size}`);
console.log(`joined                           : ${rows.length - missing.length}`);
if (missing.length) {
  console.log(`\nNOT JOINED — do not read the totals below as complete:`);
  for (const r of missing) console.log(`  position ${r.pos}  ${r.doi}`);
}

const GiB = 1024 ** 3, MiB = 1024 ** 2;
const fmt = b => b >= GiB ? `${(b / GiB).toFixed(2)} GiB` : `${(b / MiB).toFixed(1)} MiB`;

const joined = rows.filter(r => typeof r.bytes === 'number');
const total = joined.reduce((a, r) => a + r.bytes, 0);
console.log(`\ntotal across the joined set      : ${fmt(total)}`);

console.log(`\nlargest first, with a running total:`);
const desc = [...joined].sort((a, b) => b.bytes - a.bytes);
let run = 0;
for (const r of desc) {
  run += r.bytes;
  console.log(`  pos ${String(r.pos).padStart(2)}  ${fmt(r.bytes).padStart(10)}  cum ${fmt(run).padStart(10)}  ${r.doi}`);
}

console.log(`\nhow many sit under each line, and what the rest costs:`);
for (const t of [50 * MiB, 100 * MiB, 250 * MiB, 500 * MiB, GiB, 5 * GiB, 10 * GiB]) {
  const under = joined.filter(r => r.bytes <= t);
  const over = joined.filter(r => r.bytes > t);
  const overSum = over.reduce((a, r) => a + r.bytes, 0);
  console.log(
    `  <= ${fmt(t).padStart(9)} : ${String(under.length).padStart(2)} deposits` +
    `   |  above: ${String(over.length).padStart(2)} deposits, ${fmt(overSum)}`
  );
}
