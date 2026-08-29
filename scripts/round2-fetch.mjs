// Round 2 — fetch the considered tabular files for every standing deposit.
// Verifies each download against the manifest's sha-256. Resumable. Prints no secrets.
//
//   export DRYAD_TOKEN='...'
//   node scripts/round2-fetch.mjs                    # plan only, downloads nothing
//   node scripts/round2-fetch.mjs --go               # fetch, 1.2s between requests
//   node scripts/round2-fetch.mjs --go --delay=3000  # slower, if 429s persist
//
// Dryad rate-limits. On 429 this backs off, honours Retry-After when sent, and
// retries. Verified files on disk are skipped, so an interrupted run resumes.
//
// Selection is reading A — extension on `path` — which reproduced §3's 21 rejections
// exactly on all sixty rows. This script does not decide anything; it fetches what
// §6.2 already selected.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const LOG = 'docs/shared/ROUND2-RUN-LOG.md';
const MANIFEST = 'docs/shared/round2-raw/round2-manifest.json';
const OUT = 'corpus-data/round2';
const BASE = 'https://datadryad.org';
const EXTS = ['.xlsx', '.xls', '.csv', '.tsv'];
const CAP = 50 * 1024 * 1024;
const GO = process.argv.includes('--go');
const arg = n => (process.argv.find(a => a.startsWith(`--${n}=`)) ?? '').split('=')[1];
const DELAY = Number(arg('delay') ?? 1200);      // ms between requests
const MAX_RETRIES = Number(arg('retries') ?? 4);
const QUOTA_GIVEUP = Number(arg('quota-giveup') ?? 2);  // consecutive quota failures before stopping
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NO_WAIT = process.argv.includes('--no-wait');
const MAX_WAIT = 70 * 60 * 1000;   // never sleep longer than this, whatever a header claims

// Dryad sends ratelimit-limit / ratelimit-remaining / ratelimit-reset.
// The limit is 100 per hour and resets on the hour, so waiting is exact, not guesswork.
function msUntilReset(res) {
  const r = Number(res.headers.get('ratelimit-reset'));
  if (!r) return null;
  const ms = r * 1000 - Date.now() + 5000;      // 5s buffer past the boundary
  if (ms <= 0) return 5000;
  return Math.min(ms, MAX_WAIT);
}
const clock = ms => new Date(Date.now() + ms).toLocaleTimeString();
async function waitForReset(ms, why) {
  console.log(`\n  ${why}. Resuming at ${clock(ms)} — ${Math.ceil(ms / 60000)} min.`);
  await sleep(ms);
  console.log(`  resuming.`);
}

const MiB = 1024 ** 2;
const fmt = b => b >= MiB ? `${(b / MiB).toFixed(1)} MiB` : `${(b / 1024).toFixed(1)} KiB`;

const token = process.env.DRYAD_TOKEN;
if (GO && !token) { console.error('DRYAD_TOKEN is not set. Refusing to run.'); process.exit(2); }

// ---------- standing deposits, from the run log ----------
const standingPos = new Set();
for (const line of readFileSync(LOG, 'utf8').split('\n')) {
  const m = line.match(/^\|\s*(\d+)\s*\|\s*doi:\S+?\s*\|[^|]*\|[^|]*\|\s*\|\s*\|\s*$/);
  if (m) standingPos.add(Number(m[1]));
}

// ---------- build the plan ----------
const records = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const plan = [];
for (const r of records) {
  if (!standingPos.has(r.position)) continue;
  for (const f of r.files ?? []) {
    if (f.status === 'deleted') continue;
    if (!EXTS.some(e => String(f.path).toLowerCase().endsWith(e))) continue;
    const href = f._links?.['stash:download']?.href;
    if (!href) { console.error(`pos ${r.position}: no download href for ${f.path} — SKIPPED`); continue; }
    // flatten: Dryad paths are normally bare filenames, but never trust that
    const safe = String(f.path).replace(/[/\\]/g, '_').replace(/^\.+/, '_');
    plan.push({
      pos: r.position, doi: r.doi, name: safe, size: f.size,
      url: BASE + href, digest: f.digest, digestType: f.digestType,
      dir: join(OUT, `pos-${String(r.position).padStart(2, '0')}`),
    });
  }
}

// ---------- report the plan ----------
const total = plan.reduce((a, p) => a + p.size, 0);
const overCap = plan.filter(p => p.size > CAP);
const noDigest = plan.filter(p => p.digestType !== 'sha-256');
const deposits = new Set(plan.map(p => p.pos));

console.log(`standing deposits : ${standingPos.size}   with at least one considered file: ${deposits.size}`);
console.log(`files to fetch    : ${plan.length}   total ${fmt(total)}`);
console.log(`over the 50 MiB import cap : ${overCap.length}` +
  (overCap.length ? ` -> ${overCap.map(p => `pos ${p.pos} ${p.name} ${fmt(p.size)}`).join(', ')}` : ''));
if (noDigest.length) console.log(`WITHOUT a sha-256 digest : ${noDigest.length} — these cannot be verified`);

const collisions = [];
for (const d of deposits) {
  const names = plan.filter(p => p.pos === d).map(p => p.name);
  if (new Set(names).size !== names.length) collisions.push(d);
}
if (collisions.length) console.log(`NAME COLLISIONS within a deposit: positions ${collisions.join(', ')} — resolve before fetching`);

if (!GO) { console.log(`\nPlan only. Nothing written. Re-run with --go to fetch.`); process.exit(0); }

// ---------- fetch ----------
const sha = buf => createHash('sha256').update(buf).digest('hex');
let fetched = 0, skipped = 0, bytes = 0, throttled = 0, consecutiveQuota = 0;
const failures = [];

for (const p of plan) {
  mkdirSync(p.dir, { recursive: true });
  const dest = join(p.dir, p.name);

  if (existsSync(dest)) {
    const have = readFileSync(dest);
    if (p.digestType === 'sha-256' && sha(have) === p.digest) { skipped++; continue; }
    console.log(`pos ${p.pos} ${p.name}: on disk but digest does not match — refetching`);
  }

  let res = null, gaveUp = false;
  let wait = 5000;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0 || fetched + skipped > 0) await sleep(attempt === 0 ? DELAY : 0);
    try {
      res = await fetch(p.url, { headers: { Authorization: `Bearer ${token}` }, redirect: 'follow' });
    } catch (e) {
      failures.push(`pos ${p.pos} ${p.name}: network error ${e.message}`); res = null; break;
    }
    if (res.status !== 429) break;
    throttled++;
    const untilReset = msUntilReset(res);
    if (untilReset !== null) {
      if (NO_WAIT) {
        console.log(`\n\nQuota exhausted. Window resets at ${clock(untilReset)}.`);
        console.log(`fetched this run: ${fetched}   verified on disk: ${skipped}   remaining: ${plan.length - fetched - skipped}`);
        process.exit(4);
      }
      await waitForReset(untilReset, `quota exhausted at pos ${p.pos} (limit ${res.headers.get('ratelimit-limit') ?? '?'} per window)`);
      continue;                                  // retry the same file, no attempt consumed
    }
    const ra = Number(res.headers.get('retry-after'));
    const pause = ra ? ra * 1000 : wait;
    process.stdout.write(`\n  429 on pos ${p.pos} — waiting ${Math.round(pause / 1000)}s` +
      ` (retry ${attempt + 1} of ${MAX_RETRIES}), no ratelimit-reset header\n`);
    await sleep(pause);
    wait = Math.min(wait * 2, 300000);
    if (attempt === MAX_RETRIES) gaveUp = true;
  }
  if (!res) continue;
  if (gaveUp && res.status === 429) {
    failures.push(`pos ${p.pos} ${p.name}: still 429 after ${MAX_RETRIES} retries`);
    if (++consecutiveQuota >= QUOTA_GIVEUP) {
      console.log(`\n\nSTOPPING. ${consecutiveQuota} files in a row exhausted their retries on 429.`);
      console.log(`This is a quota, not a pace — backing off further will not clear it.`);
      console.log(`fetched this run: ${fetched}   already verified on disk: ${skipped}   remaining: ${plan.length - fetched - skipped}`);
      console.log(`Wait for the window to reset, then re-run. Verified files are skipped.`);
      process.exit(4);
    }
    continue;
  }
  if (res.status === 401) {
    console.error(`\n401 on pos ${p.pos}. The token has expired or been revoked. Get a new one and re-run —`);
    console.error(`everything already verified on disk is skipped, so this is resumable.`);
    process.exit(3);
  }
  if (!res.ok) { failures.push(`pos ${p.pos} ${p.name}: HTTP ${res.status}`); continue; }

  const buf = Buffer.from(await res.arrayBuffer());

  if (buf.length !== p.size) {
    failures.push(`pos ${p.pos} ${p.name}: got ${buf.length} bytes, manifest says ${p.size}`);
    continue;
  }
  if (p.digestType === 'sha-256') {
    const got = sha(buf);
    if (got !== p.digest) {
      failures.push(`pos ${p.pos} ${p.name}: sha-256 mismatch\n    manifest ${p.digest}\n    download ${got}`);
      continue;
    }
  }

  writeFileSync(dest, buf);
  fetched++; bytes += buf.length; consecutiveQuota = 0;

  const left = Number(res.headers.get('ratelimit-remaining'));
  if (!Number.isNaN(left) && left <= 0) {
    const untilReset = msUntilReset(res);
    if (untilReset !== null && !NO_WAIT) await waitForReset(untilReset, `quota spent (${fetched + skipped} of ${plan.length} done)`);
  }
  process.stdout.write(`\r  fetched ${fetched}  verified  ${fmt(bytes)}          `);
}

console.log(`\n\nfetched ${fetched}   already present and verified ${skipped}   bytes ${fmt(bytes)}` +
  (throttled ? `   rate-limit waits: ${throttled}` : ''));
if (failures.length) {
  console.log(`\nFAILURES — ${failures.length}. Nothing was written for these:`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log(`All files match the manifest on size and sha-256.`);

// ---------- a small receipt, so the corpus is reproducible without the files ----------
const receipt = plan.map(p => ({ position: p.pos, doi: p.doi, file: p.name, size: p.size, sha256: p.digest }));
writeFileSync(join(OUT, 'round2-files.json'), JSON.stringify(receipt, null, 1));
console.log(`receipt written: ${join(OUT, 'round2-files.json')}`);
