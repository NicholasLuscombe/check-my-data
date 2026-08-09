// S361 — the condition-noise ladder.
//
// `test/gen-copy-fidelity.mjs` gained `condNoiseRatio`: the ratio of replicate
// noise scale between the two conditions, with the file's total replicate noise
// held fixed so only the split moves. This runs the battery across a ladder of
// that ratio on otherwise honest data — no copy, no fabrication, no per-subject
// dispersion — and records what every test does.
//
// Two modes.
//
//   --cost     One file through the whole battery, timed. Reports which tests
//              return a verdict on this file shape and which return
//              not-applicable with the cause, then extrapolates the grid.
//              Run this before the ladder; it is what makes the grid honest
//              rather than guessed.
//
//   --ladder   The measurement. Every test, every rung, flag rate and median p
//              and not-applicable count across draws.
//
// Rung 1.0 is not only a control. At ratio 1 the file is honest, homoscedastic,
// paired and unfabricated, so whatever the battery does there is a
// false-positive rate on honest data. It is reported on its own line.
//
// Datasets are ephemeral. Nothing here is written to test/fixtures and nothing
// enters the batch; regenerate from the parameters.
//
//   node test/probes/probe-s361-ladder.mjs --cost
//   node test/probes/probe-s361-ladder.mjs --ladder
//   DRAWS=10 REPS=6 node test/probes/probe-s361-ladder.mjs --ladder

import { writeFileSync, mkdirSync } from 'fs';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { generate } = await import('../gen-copy-fidelity.mjs');

const LADDER = [1.0, 1.15, 1.3, 1.5, 1.65, 2.0, 2.5];
const DRAWS = Number(process.env.DRAWS) || 20;
const REPS = process.env.REPS ? [Number(process.env.REPS)] : [4, 6];
const SUBJECTS = 120;
const SEED_BASE = 6100;

// The assay label decides whether the variance transform is active. Both labels
// below are continuous, so the data type is identical and the transform is the
// only thing that differs between the two arms — which is what makes the
// difference between their curves a measurement of the transform rather than of
// anything else. On this file shape 'general' promotes to log and
// 'plate_reader' stays raw.
const ASSAYS = (process.env.ASSAYS || 'general,plate_reader').split(',');
const ASSAY = process.env.ASSAY || ASSAYS[0];

// ── Run one generated file through the whole battery ────────────────────
// Same load path as test/validate-batch.mjs, so the results are the ones the
// engine would produce on this file if it were imported.
async function battery(csv, assay = ASSAY) {
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, null);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol: null, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, 'ordered');
  return { results, severity: computeSeverity(results).severity, vst, condCtx, matrix };
}

const gen = (opts) => generate({ k: 1, sigmaS: 0, nSubjects: SUBJECTS, ...opts });

// ── Cost mode ───────────────────────────────────────────────────────────
async function cost() {
  console.log('S361 ladder — costing run\n');
  const d = gen({ seed: SEED_BASE, nReps: 6, condNoiseRatio: 1 });
  const t0 = Date.now();
  const { results, severity, vst, condCtx, matrix } = await battery(d.rowGroupedCsv);
  const ms = Date.now() - t0;

  console.log(`  file shape: ${matrix.length} rows x ${matrix[0].length} columns, ` +
    `${condCtx?.count ?? '?'} conditions (${condCtx?.type ?? 'none'})`);
  console.log(`  assay '${ASSAY}', transform '${vst.transform}' (${vst.reason ?? 'no reason given'})`);
  console.log(`  severity ${severity}`);
  console.log(`  one battery run: ${(ms / 1000).toFixed(1)} s\n`);

  const ran = results.filter((r) => r.flag !== 'N/A');
  const na = results.filter((r) => r.flag === 'N/A');
  console.log(`  ${ran.length} of ${results.length} tests return a verdict on this shape\n`);
  console.log('  returns a verdict:');
  for (const r of [...ran].sort((a, b) => a.name.localeCompare(b.name))) {
    const p = r.primaryP == null || !Number.isFinite(r.primaryP) ? '—' : r.primaryP.toPrecision(4);
    console.log(`    ${r.name.padEnd(38)} ${String(r.flag).padEnd(9)} p=${p}`);
  }
  console.log('\n  not applicable:');
  for (const r of [...na].sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`    ${r.name.padEnd(38)} ${r.naCause ?? '(no cause)'}`);
  }

  // The Selective Noise gate's unit, read off the result rather than assumed.
  const sn = results.find((r) => r.name === 'Selective Noise Partitioning');
  if (sn) {
    console.log('\n  Selective Noise gate:');
    console.log(`    flag ${sn.flag}, variance ratio ${sn.maxMinVarianceRatio}, ` +
      `${sn.nGateSuppressed ?? 0} condition(s) gate-suppressed`);
  }

  const grid = (rungs, draws, repCounts, assays) => rungs * draws * repCounts * assays;
  const full = grid(LADDER.length, 20, 2, 2);
  const reduced = grid(LADDER.length, 10, 1, 1);
  console.log('\n  extrapolated wallclock, at this per-file cost:');
  console.log(`    full grid   ${full} files  ->  ${(full * ms / 60000).toFixed(1)} min`);
  console.log(`    reduced     ${reduced} files  ->  ${(reduced * ms / 60000).toFixed(1)} min` +
    `   (10 draws, one replicate count, one assay label)`);
  return ms;
}

// ── Ladder mode ─────────────────────────────────────────────────────────
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

async function ladder(assay) {
  console.log('S361 condition-noise ladder');
  console.log(`  ${LADDER.length} rungs x ${DRAWS} draws x [${REPS.join(', ')}] replicates, ` +
    `${SUBJECTS} subjects, assay '${assay}'`);
  console.log('  k = 1 (no copy), sigmaS = 0 (no subject dispersion) throughout\n');

  const rows = [];
  const t0 = Date.now();
  let done = 0;
  const total = LADDER.length * DRAWS * REPS.length;

  for (const nReps of REPS) {
    for (const r of LADDER) {
      const perTest = new Map();
      for (let i = 0; i < DRAWS; i++) {
        const d = gen({ seed: SEED_BASE + i, nReps, condNoiseRatio: r });
        const { results } = await battery(d.rowGroupedCsv, assay);
        for (const res of results) {
          if (!perTest.has(res.name)) perTest.set(res.name, { flags: [], ps: [], na: 0 });
          const e = perTest.get(res.name);
          if (res.flag === 'N/A') e.na++;
          else {
            e.flags.push(res.flag);
            if (Number.isFinite(res.primaryP)) e.ps.push(res.primaryP);
          }
        }
        done++;
        if (done % 10 === 0) {
          const rate = (Date.now() - t0) / done;
          process.stderr.write(`  ${done}/${total}  eta ${((total - done) * rate / 60000).toFixed(1)} min\n`);
        }
      }
      for (const [name, e] of perTest) {
        const fired = e.flags.filter((f) => f === 'HIGH' || f === 'MODERATE').length;
        rows.push({
          assay, nReps, ratio: r, test: name,
          n: DRAWS, na: e.na, ran: e.flags.length,
          fireRate: e.flags.length ? fired / e.flags.length : 0,
          high: e.flags.filter((f) => f === 'HIGH').length,
          moderate: e.flags.filter((f) => f === 'MODERATE').length,
          medianP: e.ps.length ? median(e.ps) : null,
        });
      }
    }
  }
  return rows;
}

function render(rows) {
  const tests = [...new Set(rows.map((r) => r.test))].sort();
  const out = [];
  out.push('# S361 — condition-noise ladder');
  out.push('');
  out.push(`Generated by \`test/probes/probe-s361-ladder.mjs --ladder\`. Honest data throughout:`);
  out.push(`no copy (k = 1), no per-subject dispersion (sigmaS = 0), no fabrication of any kind.`);
  out.push(`Only the ratio of replicate noise scale between the two conditions moves, and the file's`);
  out.push(`total replicate noise is held fixed, so a test that fires is responding to the split and`);
  out.push(`not to the file getting noisier.`);
  out.push('');
  out.push(`${DRAWS} draws per rung, ${SUBJECTS} subjects. Two assay labels, both continuous, so the`);
  out.push('variance transform is the only thing that differs between them: `general` promotes to log,');
  out.push('`plate_reader` stays raw. Datasets are ephemeral — regenerate from the parameters.');
  out.push('');
  for (const assay of ASSAYS) for (const nReps of REPS) {
    out.push(`## assay \`${assay}\`, ${nReps} replicates per subject`);
    out.push('');
    out.push('Flag rate is the fraction of draws returning MODERATE or HIGH. A test that is');
    out.push('not-applicable on every draw is omitted.');
    out.push('');
    out.push('| Test | ' + LADDER.map((r) => `r=${r}`).join(' | ') + ' |');
    out.push('|---|' + LADDER.map(() => '---:').join('|') + '|');
    for (const t of tests) {
      const cells = LADDER.map((r) => rows.find((x) => x.test === t && x.ratio === r && x.nReps === nReps && x.assay === assay));
      if (cells.every((c) => !c || c.ran === 0)) continue;
      out.push(`| ${t} | ` + cells.map((c) => {
        if (!c || c.ran === 0) return 'n/a';
        const pct = (c.fireRate * 100).toFixed(0) + '%';
        return c.fireRate > 0 ? `**${pct}**` : pct;
      }).join(' | ') + ' |');
    }
    out.push('');
    out.push('Median p, same layout.');
    out.push('');
    out.push('| Test | ' + LADDER.map((r) => `r=${r}`).join(' | ') + ' |');
    out.push('|---|' + LADDER.map(() => '---:').join('|') + '|');
    for (const t of tests) {
      const cells = LADDER.map((r) => rows.find((x) => x.test === t && x.ratio === r && x.nReps === nReps && x.assay === assay));
      if (cells.every((c) => !c || c.ran === 0)) continue;
      out.push(`| ${t} | ` + cells.map((c) => (c && c.medianP != null ? c.medianP.toPrecision(3) : '—')).join(' | ') + ' |');
    }
    out.push('');
  }
  return out.join('\n') + '\n';
}

const args = process.argv.slice(2);
if (args.includes('--cost')) await cost();
if (args.includes('--ladder')) {
  const rows = [];
  for (const a of ASSAYS) rows.push(...await ladder(a));
  mkdirSync('test/probes/out-s361', { recursive: true });
  writeFileSync('test/probes/out-s361/ladder.json', JSON.stringify(rows, null, 1));
  const md = render(rows);
  writeFileSync('docs/shared/S361-CONDITION-NOISE-LADDER.md', md);
  console.log('\nwrote docs/shared/S361-CONDITION-NOISE-LADDER.md and test/probes/out-s361/ladder.json');

  // Headline: lowest ratio at which any test leaves LOW.
  const fired = rows.filter((r) => r.fireRate > 0).sort((a, b) => a.ratio - b.ratio);
  console.log('\n  rung 1.0 — the honest-data false-positive line:');
  for (const r of rows.filter((x) => x.ratio === 1.0 && x.fireRate > 0)) {
    console.log(`    ${r.assay.padEnd(13)} ${r.nReps} reps  ${r.test.padEnd(38)} ${(r.fireRate * 100).toFixed(0)}% ` +
      `(${r.high} high, ${r.moderate} moderate)`);
  }
  if (!rows.some((x) => x.ratio === 1.0 && x.fireRate > 0)) console.log('    quiet on every test');
  console.log('\n  lowest ratio at which any test leaves LOW:');
  if (!fired.length) console.log('    none — every test stayed LOW at every rung');
  else {
    const lo = fired[0].ratio;
    for (const r of fired.filter((x) => x.ratio === lo)) {
      console.log(`    r = ${lo}  ${r.test} (${r.assay}, ${r.nReps} reps, ${(r.fireRate * 100).toFixed(0)}%)`);
    }
    console.log(`    below 1.3? ${lo < 1.3 ? 'YES' : 'no'}`);
  }
}
if (!args.length) console.log('pass --cost or --ladder');
