#!/usr/bin/env node
/**
 * S398 — acquire the round-2 thirty's README.md, and copy each deposit's
 * landing-page metadata beside it.
 *
 * TWO PHASES, and only one of them makes a request.
 *   A  metadata — abstract, methods, usageNotes and keywords copied VERBATIM out
 *      of the tracked manifest to `<main>/corpus-data/round2/pos-NN/readme/metadata.md`.
 *      ZERO requests. Runs whether or not a token is present.
 *   B  README   — thirty downloads to the same directory, each verified on size
 *      and then sha-256 against the tracked manifest, exactly as the 199 were
 *      (`scripts/round2-fetch.mjs:170-180`). Requires DRYAD_TOKEN.
 *
 * TWO ROOTS, RESOLVED SEPARATELY AND NEVER ASSUMED FROM EACH OTHER.
 *   mainRoot  the git common dir's parent. `corpus-data/` is gitignored, so it
 *             exists in the MAIN CHECKOUT and in no worktree.
 *   repoRoot  `--show-toplevel`. Tracked files — the manifest this writes — live
 *             in the WORKTREE.
 * Resolving one and assuming the other is the S397 failure, and it passed there
 * only because a stray copy happened to be in place. Every write is checked
 * against the root it belongs to before it happens.
 *
 * THE TOKEN is read from the environment and never printed, never written to a
 * file, and never placed in the manifest. Only its presence is reported.
 *
 * IDEMPOTENT. Nothing under `corpus-data/round2/` is overwritten, moved or
 * deleted. A file already present is verified and recorded, not re-fetched and
 * not replaced — if it fails its digest that is an error to report, not a thing
 * to fix by overwriting.
 *
 * NO CONTENT IS READ. Sizes, digests and byte counts only. The metadata copy is
 * a byte copy; nothing in this script parses, summarises or classifies what any
 * document says.
 *
 * Usage:
 *   node scripts/fetch-round2-readmes.mjs [--dry-run]
 * Exit: 0 both phases done · 2 phase B skipped, DRYAD_TOKEN unset · 1 failures
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { headerNumber, validatedResetMs, makeBudget, sleep, LOCAL_LIMIT }
  from './lib/round2-ratelimit.mjs';

const BASE = 'https://datadryad.org';                 // scripts/round2-fetch.mjs:23
const DRY  = process.argv.includes('--dry-run');
const STARTED_AT = Date.now();

// ── the two roots ──────────────────────────────────────────────────────────
const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
const mainRoot = dirname(execSync('git rev-parse --path-format=absolute --git-common-dir',
  { encoding: 'utf-8' }).trim());
const CORPUS_ROOT   = join(mainRoot, 'corpus-data', 'round2');
const MANIFEST_OUT  = join(repoRoot, 'docs', 'shared', 'round2-readme-manifest.json');
const TRACKED_MAN   = join(repoRoot, 'docs', 'shared', 'round2-raw', 'round2-manifest.json');
const RUN_LOG       = join(repoRoot, 'docs', 'shared', 'ROUND2-RUN-LOG.md');

/** Refuse a write that would land outside the two paths this job may touch. */
function guardPath(abs, kind) {
  const r = resolve(abs);
  const okCorpus = r.startsWith(CORPUS_ROOT + sep) && /\/pos-\d\d\/readme\/[^/]+$/.test(r);
  const okManifest = r === resolve(MANIFEST_OUT);
  if (!(okCorpus || okManifest))
    throw new Error(`HALT — ${kind} would write outside the two named paths:\n  ${r}`);
  return r;
}
/** Never overwrites. Returns 'written' | 'skipped (already present)'. */
function writeNew(abs, buf, kind) {
  const r = guardPath(abs, kind);
  if (existsSync(r)) return 'skipped (already present)';
  if (DRY) return 'dry-run';
  mkdirSync(dirname(r), { recursive: true });
  writeFileSync(r, buf);
  return 'written';
}
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const utc = () => new Date().toISOString();

// ── inputs ─────────────────────────────────────────────────────────────────
if (!existsSync(TRACKED_MAN)) throw new Error(`HALT — tracked manifest missing: ${TRACKED_MAN}`);
const manifest = JSON.parse(readFileSync(TRACKED_MAN, 'utf-8'));

/* The thirty, from ROUND2-RUN-LOG.md §4 — the record the S397 manifests were
 * generated from. Derived, never transcribed. */
const logText = readFileSync(RUN_LOG, 'utf-8');
const s4 = logText.slice(logText.indexOf('\n## 4 —'), logText.indexOf('\n## 5 —'));
const thirty = s4.split('\n').filter((l) => /^\| \d+ \|/.test(l))
  .map((l) => { const f = l.split('|').map((x) => x.trim()); return { pos: +f[1], doi: f[2] }; });
if (thirty.length !== 30) throw new Error(`HALT — §4 yields ${thirty.length} positions, expected 30`);

const byPos = new Map(manifest.map((d) => [d.position, d]));
for (const e of thirty) {
  const d = byPos.get(e.pos);
  if (!d) throw new Error(`HALT — tracked manifest does not cover pos-${e.pos}`);
  if (d.doi !== e.doi) throw new Error(`HALT — pos-${e.pos} DOI: §4 ${e.doi} vs manifest ${d.doi}`);
}

const README_RE = /^(readme|read[ _-]?me)\b|readme/i;   // part 1's rule, unchanged
const pad = (p) => String(p).padStart(2, '0');

/* THE VERSION ELEMENT, chosen not assumed. `versions[0]` is NOT always current —
 * it differs from the deposit's own versionNumber on 7 of the 30, and on pos-45
 * the two carry different abstracts. The landing page shows the CURRENT version,
 * so the element whose versionNumber equals the deposit's is the one copied.
 * Exactly one element matches on 30 of 30; the fallback exists so a future
 * deposit with none is loud rather than silent. */
function currentVersion(d) {
  const hit = (d.versions || []).filter((v) => v.versionNumber === d.versionNumber);
  if (hit.length === 1) return { v: hit[0], basis: 'versionNumber matches the deposit' };
  const last = (d.versions || [])[(d.versions || []).length - 1];
  return { v: last || {}, basis: `NO element matches deposit v${d.versionNumber} — fell back to the last of ${(d.versions || []).length}` };
}

const EMPTY = 'field empty in manifest';
/** Verbatim. An array is rendered one value per line in manifest order; nothing
 *  is summarised, reordered, truncated or otherwise altered. */
function fieldText(v) {
  if (v == null) return null;
  if (Array.isArray(v)) return v.length ? v.join('\n') : null;
  const s = String(v);
  return s.trim().length ? s : null;
}
function metadataDoc(e, d) {
  const { v, basis } = currentVersion(d);
  const fields = ['abstract', 'methods', 'usageNotes', 'keywords'];
  const sizes = {};
  let out = `# pos-${pad(e.pos)} — ${e.doi}\n\n`
    + `Deposit metadata, copied VERBATIM from \`docs/shared/round2-raw/round2-manifest.json\`.\n`
    + `Version ${v.versionNumber ?? '?'} (${v.versionStatus ?? '?'}) — selected because ${basis}.\n`
    + `Nothing below is summarised, reordered or truncated. \`keywords\` is an array in the\n`
    + `manifest and is written one value per line in manifest order; the values are untouched.\n`;
  for (const f of fields) {
    const t = fieldText(v[f]);
    sizes[f] = t ? Buffer.byteLength(t, 'utf8') : 0;
    out += `\n## ${f}\n\n${t ?? EMPTY}\n`;
  }
  return { doc: out, sizes, version: v.versionNumber ?? null, versionStatus: v.versionStatus ?? null, basis };
}

// ── plan ───────────────────────────────────────────────────────────────────
const plan = thirty.map((e) => {
  const d = byPos.get(e.pos);
  const hits = (d.files || []).filter((f) => README_RE.test(f.path.replace(/\.[^.]*$/, '')));
  const f = hits[0] || null;
  return {
    ...e, dep: d, file: f, candidates: hits.length,
    type: f ? 'file' : 'landing',
    dir: join(CORPUS_ROOT, `pos-${pad(e.pos)}`, 'readme'),
    url: f ? BASE + f._links['stash:download'].href : null,
  };
});
console.log(`plan: ${plan.length} deposits · ${plan.filter((p) => p.file).length} with a README `
  + `· ${plan.reduce((a, p) => a + (p.file?.size || 0), 0)} bytes to fetch`);
console.log(`roots:\n  corpus (main)     ${CORPUS_ROOT}\n  manifest (worktree) ${MANIFEST_OUT}`);

// ── phase A — metadata, zero requests ──────────────────────────────────────
const rows = [];
let metaWritten = 0, metaSkipped = 0, metaBytes = 0;
const fieldNonEmpty = { abstract: 0, methods: 0, usageNotes: 0, keywords: 0 };
for (const p of plan) {
  const { doc, sizes, version, versionStatus, basis } = metadataDoc(p, p.dep);
  for (const k of Object.keys(fieldNonEmpty)) if (sizes[k] > 0) fieldNonEmpty[k]++;
  const path_ = join(p.dir, 'metadata.md');
  const st = writeNew(path_, Buffer.from(doc, 'utf8'), 'metadata');
  if (st === 'written') { metaWritten++; metaBytes += Buffer.byteLength(doc, 'utf8'); }
  else if (st.startsWith('skipped')) metaSkipped++;
  rows.push({
    position: p.pos, doi: p.doi, artefactType: p.type, readmeCandidates: p.candidates,
    readme: p.file ? {
      filename: p.file.path, size: p.file.size, sha256: p.file.digest,
      localPath: join(p.dir, p.file.path), url: p.url,
      fetchedAt: null, status: 'not fetched', error: null,
    } : null,
    metadata: {
      localPath: path_, status: st, sourceVersion: version, sourceVersionStatus: versionStatus,
      versionBasis: basis, fieldBytes: sizes,
    },
  });
}
console.log(`phase A — metadata: ${metaWritten} written, ${metaSkipped} already present, ${metaBytes} bytes`);
console.log(`  non-empty: ` + Object.entries(fieldNonEmpty).map(([k, v]) => `${k} ${v}/30`).join(' · '));

// ── phase B0 — what is already on disk, verified. No network, no token. ────
//
// This was inside the token branch, which is the same fault as the one above at
// a smaller scale: a check gated on something it does not need. Verifying a file
// already present costs nothing and must happen whether or not a fetch can run,
// or the manifest reports "not fetched" for a file sitting verified on disk.
let sizeOk0 = 0, digestOk0 = 0, present = 0;
const preFailures = [];
for (const p of plan) {
  if (!p.file) continue;
  const dest = join(p.dir, p.file.path);
  if (!existsSync(dest)) continue;
  present++;
  const have = readFileSync(dest);
  const okS = have.length === p.file.size;
  const okD = sha(have) === p.file.digest;
  if (okS) sizeOk0++;
  if (okD) digestOk0++;
  const row = rows.find((r) => r.position === p.pos);
  row.readme.status = okS && okD ? 'already present, verified' : 'already present, FAILS VERIFICATION';
  row.readme.error = okS && okD ? null
    : `on disk but ${!okS ? 'size' : 'digest'} does not match the manifest; left untouched`;
  if (!(okS && okD)) preFailures.push(`pos-${pad(p.pos)}: ${row.readme.error}`);
}
console.log(`phase B0 — on disk: ${present} present, ${sizeOk0} size ok, ${digestOk0} digest ok`);

// ── phase B — the downloads ────────────────────────────────────────────────
const token = process.env.DRYAD_TOKEN;                 // never printed, never stored
let requests = 0, remaining = null, kept = 0, corpusBytes = 0;
let sizeOk = sizeOk0, digestOk = digestOk0;
const budget = makeBudget(LOCAL_LIMIT);   // THE budget; headers only corroborate it
const failures = [...preFailures];

/* A token too short to be a credential is refused rather than sent. Found the
 * hard way: `export DRYAD_TOKEN="…"` pasted with the prompt's own ellipsis
 * placeholder sets a 3-byte value that is truthy, so a bare `!token` test lets
 * it through and thirty bogus bearers reach a third party. Presence is not
 * validity. The value is never printed — only its length. */
const MIN_TOKEN_BYTES = 16;
const tokenTooShort = !!token && Buffer.byteLength(token, 'utf8') < MIN_TOKEN_BYTES;

if (!token || tokenTooShort) {
  const why = !token
    ? 'DRYAD_TOKEN is unset'
    : `DRYAD_TOKEN is only ${Buffer.byteLength(token, 'utf8')} bytes, short of the `
      + `${MIN_TOKEN_BYTES}-byte floor — that is a placeholder, not a credential`;
  console.log(`\nphase B — HALT: ${why}. Nothing was fetched.`);
  for (const r of rows)
    if (r.readme && r.readme.status === 'not fetched') r.readme.error = `${why} — no request was made`;
} else if (DRY) {
  console.log('\nphase B — --dry-run, no request made.');
} else {
  /* Waiting on a VALIDATED instant only. `validatedResetMs` throws by name when
   * the header is absent, resolves to the past, or implies over an hour. */
  const waitUntil = async (untilMs, why) => {
    const ms = Math.max(0, untilMs - Date.now()) + 2000;
    console.log(`  ${why}; window reopens at ${new Date(untilMs).toISOString()} — waiting ${Math.ceil(ms / 1000)} s`);
    await sleep(ms);
  };
  for (const p of plan) {
    const row = rows.find((r) => r.position === p.pos);
    if (!p.file) continue;
    const dest = join(p.dir, p.file.path);
    if (existsSync(dest)) { kept++; continue; }  // verified at B0; never re-fetched, never replaced
    let res;
    for (;;) {
      /* THE BUDGET IS OURS, not the server's. A slot is taken before the request;
       * when the hour is full the wait is arithmetic on the clock, so it is
       * always available and cannot be poisoned by a missing header. */
      const hold = budget.reserve();
      if (hold > 0) await waitUntil(Date.now() + hold, `local budget of ${LOCAL_LIMIT} per UTC hour is full`);
      res = await fetch(p.url, { headers: { Authorization: `Bearer ${token}` }, redirect: 'follow' });
      requests++;
      /* Corroboration where it appears, never a precondition. An absent header
       * is normal on this endpoint and the run proceeds. */
      const rem = headerNumber(res, 'ratelimit-remaining');
      if (rem !== null) remaining = rem;
      if (res.status === 401 || res.status === 403) throw new Error(`HALT — authentication failed (${res.status}) at pos-${pad(p.pos)}`);
      if (res.status === 429) {
        // A wait is genuinely required here, so the reset must exist and validate.
        const until = validatedResetMs(res, `429 at pos-${pad(p.pos)}`, STARTED_AT);
        await waitUntil(until, `server reported quota exhausted at pos-${pad(p.pos)}`);
        continue;
      }
      break;
    }
    if (!res.ok) {
      row.readme.status = 'fetch failed';
      row.readme.error = `HTTP ${res.status} ${res.statusText}`;
      failures.push(`pos-${pad(p.pos)}: HTTP ${res.status} ${res.statusText}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const okS = buf.length === p.file.size;
    if (okS) sizeOk++;
    const got = sha(buf);
    const okD = got === p.file.digest;
    if (okD) digestOk++;
    if (!okS || !okD) {                          // nothing failing either check is kept
      row.readme.status = 'discarded — failed verification';
      row.readme.error = !okS
        ? `size ${buf.length} against manifest ${p.file.size}`
        : `sha-256 mismatch: manifest ${p.file.digest}, download ${got}`;
      failures.push(`pos-${pad(p.pos)}: ${row.readme.error}`);
      continue;
    }
    const st = writeNew(dest, buf, 'readme');
    row.readme.status = st === 'written' ? 'fetched and verified' : st;
    row.readme.fetchedAt = utc();
    if (st === 'written') { kept++; corpusBytes += buf.length; }
    /* No throttle is derived from `ratelimit-remaining`. It is reported when
     * present and otherwise ignored; the local budget above is what governs.
     * Reading an absent header as a remaining count of zero is the defect this
     * replaces. */
    if (remaining === 0) console.log(`  note: server reports ratelimit-remaining 0 at pos-${pad(p.pos)}`);
  }
}

// ── the manifest, thirty rows whatever the outcome ─────────────────────────
const payload = {
  generatedBy: 'scripts/fetch-round2-readmes.mjs',
  generatedAt: utc(),
  source: 'docs/shared/ROUND2-RUN-LOG.md §4 for the thirty; docs/shared/round2-raw/round2-manifest.json for sizes, sha-256 and download hrefs',
  roots: { corpus: CORPUS_ROOT, manifest: MANIFEST_OUT },
  complete: rows.every((r) => !r.readme || r.readme.status === 'fetched and verified' || r.readme.status === 'already present, verified'),
  counts: {
    rows: rows.length,
    file: rows.filter((r) => r.artefactType === 'file').length,
    landing: rows.filter((r) => r.artefactType === 'landing').length,
    absent: rows.filter((r) => r.artefactType === 'absent').length,
    requests, localBudgetUsed: budget.total, localBudgetLimitPerHour: LOCAL_LIMIT,
    ratelimitRemainingAtEnd: remaining,
    ratelimitHeadersSeen: remaining !== null,
    sizeChecksPassed: sizeOk, digestChecksPassed: digestOk, readmesOnDisk: kept,
    readmesAlreadyPresentAtStart: present,
    metadataWritten: metaWritten, metadataAlreadyPresent: metaSkipped,
    metadataFieldsNonEmpty: fieldNonEmpty,
    /* ON DISK, not written-this-run. A settled re-run writes nothing, and a
     * field named `bytesReadmes` reading 0 beside 287,530 bytes of READMEs is a
     * figure describing the run in a slot a reader takes for the state. The
     * written-this-run figures keep their own names. */
    bytesReadmesOnDisk: rows.reduce((a, r) => a + (r.readme && existsSync(r.readme.localPath) ? statSync(r.readme.localPath).size : 0), 0),
    bytesMetadataOnDisk: rows.reduce((a, r) => a + (existsSync(r.metadata.localPath) ? statSync(r.metadata.localPath).size : 0), 0),
    bytesReadmesWrittenThisRun: corpusBytes, bytesMetadataWrittenThisRun: metaBytes,
  },
  errors: failures,
  rows,
};
guardPath(MANIFEST_OUT, 'manifest');
if (!DRY) { mkdirSync(dirname(MANIFEST_OUT), { recursive: true }); writeFileSync(MANIFEST_OUT, JSON.stringify(payload, null, 2) + '\n'); }
console.log(`\nmanifest: ${MANIFEST_OUT} — ${rows.length} rows, complete=${payload.complete}`);
console.log(`requests ${requests} · local counter ${budget.total}/${LOCAL_LIMIT} per UTC hour `
  + `· ratelimit-remaining at end ${remaining === null ? 'header absent' : remaining} `
  + `· size checks ${sizeOk}/30 · digest checks ${digestOk}/30`);
if (failures.length) { console.log('\nERRORS:'); for (const f of failures) console.log('  ' + f); }
process.exit(failures.length ? 1 : (!token ? 2 : 0));
