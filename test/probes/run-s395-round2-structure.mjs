/* S395 — the parent for the round-2 structural read.
   READ-ONLY. Spawns one `probe-s395-round2-structure.mjs` per deposit and
   collects the JSON. No src/ file is modified, no test is run, no gate is
   answered, no role is reassigned.

   ORDER. Ascending position, with pos-40 LAST: it carries a 33,678 x 416 sheet
   (14.0M cells, 187 MB on disk) and its runtime is unmeasured, so a hang there
   costs the other deposits nothing. pos-01 runs FIRST as a control — it is
   already recorded in S395-POS01-STRUCTURE.md, so a disagreement there means
   the harness is wrong before any new deposit is believed.

   TIMEOUT. 600 s per deposit, implemented in node: `timeout(1)` does not exist
   on macOS. A deposit that exceeds it is recorded as timed out WITH its elapsed
   time and the batch continues. A deposit that throws is recorded with its
   error and the batch continues. Neither aborts the run.

   Run: node test/probes/run-s395-round2-structure.mjs [--only 31,44]
*/
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAIN = '/Users/hedgehog/Projects/check-my-data';
const OUTDIR = resolve(ROOT, 'test/probes/out-s395');
const TIMEOUT_MS = 600_000;
const HEAP_MB = 8192;

const argv = process.argv.slice(2);
const only = argv.includes('--only')
  ? new Set(argv[argv.indexOf('--only') + 1].split(',').map(Number)) : null;

// ── the thirty, parsed from run log §4 rather than transcribed ──
const log = readFileSync(resolve(MAIN, 'docs/shared/ROUND2-RUN-LOG.md'), 'utf-8').split('\n');
const s4 = log.findIndex(l => /^## 4 — /.test(l));
const s5 = log.findIndex((l, i) => i > s4 && /^## 5 — /.test(l));
if (s4 < 0 || s5 < 0) { console.error('could not locate §4 in ROUND2-RUN-LOG.md'); process.exit(2); }
const thirty = log.slice(s4, s5)
  .map(l => /^\|\s*(\d+)\s*\|/.exec(l)).filter(Boolean).map(m => Number(m[1]));
if (thirty.length !== 30) { console.error(`§4 parsed ${thirty.length} rows, expected 30`); process.exit(2); }

// pos-01 first as the control, then ascending, then pos-40.
const rest = thirty.filter(p => p !== 1 && p !== 40).sort((a, b) => a - b);
let order = [1, ...rest, ...(thirty.includes(40) ? [40] : [])];
if (only) order = order.filter(p => only.has(p));

console.log(`§4 rows parsed: ${thirty.length}   running ${order.length}: ${order.join(' ')}`);
console.log(`timeout ${TIMEOUT_MS / 1000}s per deposit · heap ${HEAP_MB} MB · pos-01 is the control\n`);

function runOne(pos) {
  return new Promise((res) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [
      `--max-old-space-size=${HEAP_MB}`,
      '--import', resolve(ROOT, 'test/probes/s395-corpus-run-hook.mjs'),
      resolve(ROOT, 'test/probes/probe-s395-round2-structure.mjs'),
      '--pos', String(pos),
    ], { cwd: ROOT });
    let sout = '', serr = '', timedOut = false;
    child.stdout.on('data', (d) => { sout += d; });
    child.stderr.on('data', (d) => { serr += d; });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, TIMEOUT_MS);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const elapsedMs = Date.now() - t0;
      if (timedOut) return res({ position: pos, harnessError: 'TIMED OUT', timedOut: true,
                                 elapsedMs, exitCode: code, signal, stderrTail: serr.slice(-600) });
      let parsed = null, parseError = null;
      try { parsed = JSON.parse(sout.trim().split('\n').filter(Boolean).pop() || 'null'); }
      catch (e) { parseError = e.message; }
      if (!parsed) return res({ position: pos, harnessError: 'no JSON on stdout', timedOut: false,
                                elapsedMs, exitCode: code, signal, parseError,
                                stderrTail: serr.slice(-900), stdoutTail: sout.slice(-300) });
      parsed.wallMs = elapsedMs; parsed.exitCode = code; parsed.signal = signal;
      if (serr.trim()) parsed.stderrTail = serr.slice(-600);
      res(parsed);
    });
  });
}

const results = [];
for (const pos of order) {
  process.stdout.write(`pos-${String(pos).padStart(2, '0')} ... `);
  const r = await runOne(pos);
  results.push(r);
  const secs = (r.wallMs ?? r.elapsedMs) / 1000;
  const tag = r.harnessError ? `** ${r.harnessError}`
            : r.error ? `** ERROR: ${r.error}`
            : `${r.validRows}r x ${r.nNumericDataCols}c` +
              ` · hdr ${r.headerRows} · synth ${r.synthesisedHeaders.count}/${r.synthesisedHeaders.of}` +
              ` · bands ${r.spanningBands.length}` +
              ` · pending ${r.groupingTrigger.pending}` +
              ` · rs ${JSON.stringify(r.rsSuggestion.value)}`;
  const dis = (r.disagreements && r.disagreements.length) ? `  [${r.disagreements.length} DISAGREEMENT]` : '';
  console.log(`${secs.toFixed(1)}s  ${tag}${dis}`);
}

mkdirSync(OUTDIR, { recursive: true });
const outPath = resolve(OUTDIR, 'round2-structure.json');
writeFileSync(outPath, JSON.stringify({
  generatedBy: 'test/probes/run-s395-round2-structure.mjs',
  nodeVersion: process.version,
  note: 'Structural read only. No test was run, no verdict computed, no gate answered, no role reassigned.',
  timeoutMs: TIMEOUT_MS, heapMB: HEAP_MB,
  order, results,
}, null, 1));

const bad = results.filter(r => r.harnessError || r.error);
const dis = results.filter(r => r.disagreements && r.disagreements.length);
console.log(`\nwrote ${outPath}`);
console.log(`failed or timed out : ${bad.length}${bad.length ? ' -> ' + bad.map(r => r.position).join(', ') : ''}`);
console.log(`manifest disagreements: ${dis.length}${dis.length ? ' -> ' + dis.map(r => r.position).join(', ') : ''}`);
console.log(`total wall: ${(results.reduce((a, r) => a + (r.wallMs ?? r.elapsedMs ?? 0), 0) / 1000).toFixed(1)}s`);
