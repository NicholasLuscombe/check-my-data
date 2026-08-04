// Quick Node.js batch validation — checks all 17 CSV datasets produce expected severity scores.
// Polyfills browser APIs that the analysis engine uses.
//
// PERF=1 mode: in addition to severity validation, records per-test
// wallclock per fixture (from engine.js's PERF instrument) and Blocked
// Mahalanobis exceedance metadata (from blockedMahalanobis.js's
// _perfExceedances field). Prints per-test totals sorted descending, the
// per-fixture × per-test matrix for the three heaviest fixtures, and a BM
// parity table for DS21/DS22/DS15. Writes a JSON sidecar at
// test/perf-out/<label>.json (label defaults to git SHA, override with
// PERF_LABEL=<name>) so PRE/POST runs can be diffed offline.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Polyfill requestAnimationFrame for Node.js
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// ── SEEDS — multi-seed mode ─────────────────────────────────────────
// Default is 1: the shipped stream, byte-identical to every run before this
// existed, and the only mode CI runs. SEEDS=N re-runs the whole battery at N
// PRNG seeds and gates on whether the verdicts hold across them.
//
// Why the gate needs this: every declaration in TEST-GROUND-TRUTH.md was
// recorded from engine output at the shipped stream, so a single-seed batch
// checks that the engine reproduces one recorded draw, not that it detects the
// planted mechanism. Those come apart wherever a p sits near a flag threshold.
//
// The hook must be registered before the first import of src/analysis/engine.js
// below, because that import graph pulls in src/stats/prng.js.
const SEEDS = Math.max(1, Number(process.env.SEEDS) || 1);
const MULTI = SEEDS > 1;
let setSeed = () => {};
if (MULTI) {
  const seedInject = await import('./seed-inject.mjs');
  seedInject.registerSeedHook();
  setSeed = seedInject.setSeed;
}

// Dynamic imports
const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { computeSeverity } = await import('../src/analysis/severity.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { detectAssay, ASSAY_DATATYPE_MAP } = await import('../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');
// EXPECTED allow-sets + ACKNOWLEDGED incidental-fire map: shared with the
// lookup-table generator (scripts/build-test-display-map.mjs) so the fixture
// set and routing can't drift between the two. See test/batch-fixtures.mjs.
const { EXPECTED, ACKNOWLEDGED, SUSPENDED } = await import('./batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';

const PERF = process.env.PERF === '1';
const PERF_LABEL = process.env.PERF_LABEL || null;
const perfPerFixture = PERF ? {} : null;
const batchStart = PERF ? performance.now() : 0;

let passed = 0, failed = 0, pending = 0;

// Multi-seed collectors, populated only when SEEDS > 1.
// file → { severities[], tests: { name: { flags[], ps[] } }, firing[], ok[], misses[] }
const seedRuns = MULTI ? {} : null;
const SEED_LIST = Array.from({ length: SEEDS }, (_, i) => i);

for (const SEED of SEED_LIST) {
const PRIMARY = SEED === 0;
if (MULTI) setSeed(SEED);

  for (const [file, expected] of Object.entries(EXPECTED)) {
    const csv = readFileSync(join(FIXTURES, file), 'utf-8');
    const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
    let raw = parsed.data;

    // Preprocess: trim, remove empty columns, etc.
    const pp = preprocessRaw(raw);
    raw = pp.rows;

    // Detect headers
    const headerRows = detectHeaderRows(raw);

    // Forward-fill the condition row for two-row headers
    let condPerCol = null;
    if (headerRows >= 2) {
      condPerCol = forwardFill(raw[0]);
    }
    const headers = raw[headerRows - 1];
    const data = raw.slice(headerRows);

    // Infer roles — inferRoles(data, headers, condPerCol)
    const roles = inferRoles(data, headers, condPerCol);
    const assay = expected.assay;

    // Extract inputs (includes condCtx)
    const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
      data, roles, condPerCol, zeroAsMissing: false
    });

    // Detect VST
    const vst = detectVST(matrix, assay);

    // Determine data type via the canonical resolver (S172). Prior to S172 this
    // was a hand-rolled ternary that emitted 'survey' for the survey assay; the
    // UI / BatchView path used ASSAY_DATATYPE_MAP which emits 'ordinal'. The
    // divergence bypassed DATATYPE_SKIP['ordinal'] in the harness only, running
    // 11 extra tests on DS14 and lifting batch severity 2 → 3.
    const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';

    // S118 Track H — Row Semantics Gate. Auto-suggest from detectLongFormat()
    // (long-format detection on raw post-preprocessing rows, mirroring the UI
    // path) and assay. Batch mode default is 'ordered'; the UI prompts the
    // user when neither signal resolves (general / proteomics / survey on
    // wide-format input). Conservative default keeps sequential tests live
    // unless detection succeeds.
    const lfDet = detectLongFormat(headers, data);
    const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
    const rowSemantics = rsSuggestion.value || 'ordered';

    // Run analysis
    const results = await runFullAnalysis(
      matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics
    );

    // Compute severity
    const { severity } = computeSeverity(results);

    // S177 Phase 0 — per-test flag assertion (positives-only cells declared in
    // EXPECTED[file].flags). Allow-set semantics: each entry is the set of
    // tier strings the test's r.flag must land in; HIGH|MODERATE|LOW|N/A
    // (the producer vocabulary — no CLEAR / N-A). Declared cells are
    // ground-truth-derived (TEST-GROUND-TRUTH.md), not snapshotted from
    // output. A non-resolving key (typo or producer rename) silently never
    // asserts; the bind-at-source name binding above guards against that.
    const cellMisses = [];
    if (expected.flags) {
      const resultsByName = new Map(results.map(r => [r.name, r]));
      for (const [name, allow] of Object.entries(expected.flags)) {
        const r = resultsByName.get(name);
        if (!r) {
          cellMisses.push(`${name}: result not present (unresolved name binding?)`);
        } else if (!allow.includes(r.flag)) {
          cellMisses.push(`${name}: got ${r.flag}, expected ∈ [${allow.join(', ')}]`);
        }
      }
    }
    const cellsOk = cellMisses.length === 0;

    // S183 Phase 2 — completeness gate. The allow-set check above catches a
    // declared channel that goes quiet or fires the wrong tier; this gate
    // catches the other half — a MOD/HIGH firing that no cell or
    // ACKNOWLEDGED entry accounts for. On a positive fixture (severity ≥ 1)
    // every MOD/HIGH must be in expected.flags (tier-asserted) or
    // ACKNOWLEDGED[file] (named-and-reasoned). On a clean fixture
    // (severity === 0) any MOD/HIGH is a false positive.
    const ackForFile = ACKNOWLEDGED[file] || {};
    const firingNames = results
      .filter(r => r.flag === 'MODERATE' || r.flag === 'HIGH')
      .map(r => r.name);
    const completenessMisses = [];
    if (expected.severity === 0) {
      if (firingNames.length > 0) {
        completenessMisses.push(`clean fixture fired ${firingNames.join(', ')} — false positive`);
      }
    } else {
      const accountedNames = new Set([
        ...Object.keys(expected.flags || {}),
        ...Object.keys(ackForFile),
      ]);
      const undeclared = firingNames.filter(n => !accountedNames.has(n));
      if (undeclared.length > 0) {
        completenessMisses.push(`undeclared MOD/HIGH firing(s): ${undeclared.join(', ')} — declare a cell in expected.flags or add to ACKNOWLEDGED with a reason`);
      }
    }
    const completenessOk = completenessMisses.length === 0;

    const ok = severity === expected.severity && cellsOk && completenessOk;
    const flags = results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE').map(r => `${r.name}:${r.flag}`).join(', ');

    if (MULTI) {
      // Record this seed's verdicts. Flags and p-values are stored per seed and
      // never averaged — the distribution across seeds IS the finding, and a mean
      // p would hide exactly the cell that straddles a threshold.
      if (!seedRuns[file]) seedRuns[file] = { severities: [], tests: {}, firing: [], ok: [], misses: [] };
      const rec = seedRuns[file];
      rec.severities.push(severity);
      rec.ok.push(!!ok);
      rec.misses.push([...cellMisses, ...completenessMisses]);
      // Channel composition: which tests carry the fixture at this seed. A fixture
      // can reach its declared severity through different channels at different
      // seeds, and that is not a pass.
      rec.firing.push(results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE').map(r => r.name).sort());
      for (const r of results) {
        if (!rec.tests[r.name]) rec.tests[r.name] = { flags: [], ps: [], B: null, Bfield: null };
        const t = rec.tests[r.name];
        t.flags.push(r.flag);
        t.ps.push((typeof r.primaryP === 'number' && isFinite(r.primaryP)) ? r.primaryP : null);
        // Resample count as the result publishes it, so anything reading this
        // sidecar sizes a Monte Carlo interval from a measured count, not an
        // assumed one. First field wins; null when the test publishes none.
        if (t.B === null) {
          for (const k of ['nPerm', 'nSimulations', 'B', 'nSim', 'nBoot']) {
            if (typeof r[k] === 'number' && isFinite(r[k])) { t.B = r[k]; t.Bfield = k; break; }
          }
        }
      }
    }

    // Seed 0 owns the per-fixture console output, the pass/fail tally and PERF,
    // so single-seed invocations print exactly what they always printed.
    if (!PRIMARY) continue;

    if (expected.pending) {
      // Pending-verification lane: fabricated fixture with no applicable active
      // test yet. Report status but don't count as pass/fail.
      console.log(`◦ ${file}: severity=${severity} (pending — ${expected.pendingNote})${flags ? ' [' + flags + ']' : ''}`);
      pending++;
    } else {
      const mark = ok ? '✓' : '✗';
      const sevSuffix = severity === expected.severity ? '' : ` (expected=${expected.severity})`;
      const sevLine = `${mark} ${file}: severity=${severity}${sevSuffix}${!ok && flags ? ' [' + flags + ']' : ''}`;
      console.log(sevLine);
      if (!cellsOk) {
        for (const m of cellMisses) console.log(`    ↳ per-test miss — ${m}`);
      }
      if (!completenessOk) {
        for (const m of completenessMisses) console.log(`    ↳ completeness gate — ${m}`);
      }
      // A withdrawn true detection stays visible in the run. A suspension the
      // batch never mentions is a record nobody reads, and a green line beside a
      // fixture whose channel was removed by decision would read as though
      // nothing had been given up.
      for (const [name, s] of Object.entries(SUSPENDED[file] || {})) {
        console.log(`    ↳ suspended — ${name}: was [${s.was.join(', ')}], withdrawn by ${s.decision}`);
      }
      if (ok) passed++; else failed++;
    }

    if (PERF) {
      const timings = results._perfTimings || [];
      const bm = results.find(r => r.name === 'Blocked Mahalanobis');
      const bmExceed = bm && bm._perfExceedances ? bm._perfExceedances : null;
      let bmPrimaryExceed = null;
      if (bmExceed && bmExceed.length) {
        // Primary unit = arg-min(adjP); if ties, the lowest-index unit wins
        // (Math.min behaviour). We mirror that with reduce for an explicit
        // tie-break.
        const primary = bmExceed.reduce((best, u) => (u.adjP < best.adjP ? u : best), bmExceed[0]);
        bmPrimaryExceed = { ...primary };
      }
      perfPerFixture[file] = {
        timings,
        bmPrimaryP: bm ? bm.primaryP : null,
        bmFlag: bm ? bm.flag : null,
        bmNPerm: bm ? bm.nPerm : null,
        bmExceedances: bmExceed,
        bmPrimaryExceed,
      };
    }
  }
}

// Back to the shipped stream. The cross-shape check below is a structural
// routing assertion, not part of the seed sweep.
if (MULTI) setSeed(0);

// ── S181 — DS01 cross-shape invariance (long-form with conditions) ──────
// Active assertion (replaces the S177 Phase 0 pending block). What this
// proves: when DS01's DATA cells are pooled into ONE data column but
// presented WITH a row-level condition column, A1's per-condition routing
// (engine.js trio dispatch via condCtx.rowGroups()) lands the distribution-
// shape trio on each condition slice independently, and every slice
// clears — Column Goodness-of-Fit, Entropy / Zipf Analysis, Modality Test
// each ∈ {N/A, LOW} at the aggregate. CLEAR = {N/A, LOW}, not "LOW only":
// the Inhibitor_B slice trips the §3.7 |γ₁| > 1.5 family pre-skip on this
// fixture (lowest-base condition, right-tailed log-normal-like residual),
// returning N/A per-column; that is a passing applicability outcome, not
// a failure.
//
// Contrast (not asserted, kept as comment to ground the test's purpose):
// the SAME pool with NO condition column (an unlabelled mixture) fires
// GoF MODERATE p≈0.004 — that is correct behaviour, not a defect to
// suppress, because an unlabelled multi-condition mixture genuinely is
// wrong-shape against any single-family fit. The shape-invariance
// property this assertion guards is: presenting the mixture WITH its
// conditions, the engine's per-condition routing absorbs the
// between-condition mean differences and the trio fits within-condition
// shape only. Regression target: a future change that bypasses A1
// (e.g. a refactor that drops the rowGroups() guard or routes the trio
// pooled when conditions are present) would break this.
{
  const file = '01-densitometry-clean.csv';
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const pp = preprocessRaw(parsed.data);
  const raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let nativeCondPerCol = null;
  if (headerRows >= 2) nativeCondPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const nativeRoles = inferRoles(data, headers, nativeCondPerCol);
  const dataColIdxs = nativeRoles.map((r, i) => r === 'data' ? i : -1).filter(i => i >= 0);

  // Build a long-form 2-col matrix: [value, condLabel] per cell. The
  // condition label comes from the DATA col the cell originated from in
  // the native wide layout.
  const longRows = [];
  for (const row of data) {
    for (const ci of dataColIdxs) {
      const v = row[ci];
      if (v == null || v === '') continue;
      const n = Number(v);
      if (isNaN(n)) continue;
      const condLabel = nativeCondPerCol ? nativeCondPerCol[ci] : null;
      longRows.push([n, condLabel]);
    }
  }

  const longRoles = ['data', 'condition'];
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data: longRows, roles: longRoles, condPerCol: null, zeroAsMissing: false,
  });
  const assay = 'densitometry';
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const rowSemantics = 'ordered';

  const longResults = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics
  );

  // Precondition: rowGroups() must return 3 groups (the routing surface
  // A1 dispatches through). If it returns null the trio falls back to the
  // pooled full-matrix path and the test loses its meaning.
  const rg = condCtx.rowGroups();
  const rgOk = Array.isArray(rg) && rg.length === 3;

  const trioNames = ['Column Goodness-of-Fit', 'Entropy / Zipf Analysis', 'Modality Test'];
  const allow = ['N/A', 'LOW'];
  const trio = trioNames.map(n => {
    const r = longResults.find(x => x.name === n);
    return r ? { name: n, flag: r.flag } : { name: n, flag: '?' };
  });
  const trioViolations = trio.filter(t => !allow.includes(t.flag));
  const ok = rgOk && trioViolations.length === 0;
  const mark = ok ? '✓' : '✗';
  const trioLine = trio.map(t => `${t.name}:${t.flag}`).join(', ');
  const rgLabel = rgOk
    ? `rowGroups=${rg.map(g => `${g.name}(n=${g.rowIndices.length})`).join(',')}`
    : `rowGroups=${rg === null ? 'null' : (Array.isArray(rg) ? `${rg.length} groups` : 'unexpected')} (expected 3)`;
  console.log(`${mark} ${file} (long-form, ${longRows.length} cells + COND col): ${rgLabel}; trio [${trioLine}]`);
  if (!ok) {
    if (!rgOk) console.log(`    ↳ routing precondition failed — A1 per-condition path not engaged`);
    for (const v of trioViolations) {
      console.log(`    ↳ ${v.name} flag=${v.flag}, expected ∈ [${allow.join(', ')}]`);
    }
  }
  if (ok) passed++; else failed++;
}

const pendingSuffix = pending ? ` (+ ${pending} pending)` : '';
console.log(`\n${passed}/${passed + failed} passed${pendingSuffix}` + (failed ? ` — ${failed} FAILED` : ' — all clear'));

// ── Multi-seed report ───────────────────────────────────────────────
// Only runs under SEEDS>1. Three findings, in descending order of what they
// cost us: a fixture whose severity moves across seeds, a fixture that reaches
// its severity through a different set of channels at different seeds, and a
// cell whose flag moves without shifting the fixture's tier.
let seedFailed = 0;
if (MULTI) {
  const fmtP = v => v == null ? '—' : (v === 0 ? '0' : v < 1e-4 ? v.toExponential(2) : String(Number(v.toPrecision(4))));
  const files = Object.keys(seedRuns);

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`MULTI-SEED — ${SEEDS} seeds (0 = the shipped stream), ${files.length} fixtures`);
  console.log('═'.repeat(72));

  // Per-seed batch outcome, so a reader can see which seeds the suite holds at.
  console.log('\nBatch outcome per seed:');
  for (let s = 0; s < SEEDS; s++) {
    const bad = files.filter(f => !seedRuns[f].ok[s]);
    console.log(`  seed ${String(s).padEnd(3)} ${files.length - bad.length}/${files.length} pass` +
      (bad.length ? `  — ${bad.join(', ')}` : ''));
  }

  // ── Severity constancy. A fixture whose severity moves is a gate failure. ──
  const sevMoved = files.filter(f => new Set(seedRuns[f].severities).size > 1);
  console.log(`\nSeverity across seeds — ${files.length - sevMoved.length}/${files.length} constant:`);
  for (const f of files) {
    const sev = seedRuns[f].severities;
    const constant = new Set(sev).size === 1;
    console.log(`  ${constant ? ' ' : '✗'} ${f.padEnd(42)} ${sev.join(' ')}${constant ? '' : '   NOT CONSTANT'}`);
  }
  if (sevMoved.length) {
    seedFailed += sevMoved.length;
    console.log(`\n✗✗ SEED-UNSTABLE SEVERITY on ${sevMoved.length} fixture(s) — this is a gate failure, not a note.`);
    console.log('   The declared severity depends on which draw the PRNG happened to take.');
    for (const f of sevMoved) {
      const rec = seedRuns[f];
      console.log(`\n   ${f}  severity ${rec.severities.join(' ')} (declared ${EXPECTED[f].severity})`);
      for (const [name, t] of Object.entries(rec.tests)) {
        if (new Set(t.flags).size === 1) continue;
        console.log(`     ${name}`);
        console.log(`       flag  ${t.flags.join(' ')}`);
        console.log(`       p     ${t.ps.map(fmtP).join(' ')}`);
      }
    }
  }

  // ── Channel composition. Reaching the declared severity by a different set
  // of channels at different seeds is not a pass, even at constant severity. ──
  const compMoved = files.filter(f => new Set(seedRuns[f].firing.map(a => a.join('|'))).size > 1);
  console.log(`\nChannel composition across seeds — ${files.length - compMoved.length}/${files.length} constant:`);
  if (!compMoved.length) console.log('  (every fixture fires the same MOD/HIGH set at every seed)');
  for (const f of compMoved) {
    const rec = seedRuns[f];
    const constantSev = new Set(rec.severities).size === 1;
    console.log(`  ${f}  (severity ${constantSev ? `constant at ${rec.severities[0]}` : rec.severities.join('/')})`);
    const seen = new Map();
    rec.firing.forEach((set, s) => {
      const k = set.join(', ') || '(none)';
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push(s);
    });
    for (const [set, seedsWith] of seen) console.log(`    seeds ${seedsWith.join(',')}: ${set}`);
  }

  // ── Flag constancy per cell, reported separately from severity: a cell can
  // flip without moving its fixture's tier, and both are worth seeing. ──
  const flagMoved = [];
  for (const f of files) {
    for (const [name, t] of Object.entries(seedRuns[f].tests)) {
      if (new Set(t.flags).size > 1) flagMoved.push({ f, name, t });
    }
  }
  const totalCells = files.reduce((n, f) => n + Object.keys(seedRuns[f].tests).length, 0);
  console.log(`\nFlag constancy — ${flagMoved.length} of ${totalCells} test × fixture cells are NOT constant:`);
  for (const { f, name, t } of flagMoved) {
    const declared = EXPECTED[f].flags && name in EXPECTED[f].flags;
    console.log(`  ${f} / ${name}${declared ? '   [declared channel]' : ''}`);
    console.log(`    flag  ${t.flags.join(' ')}`);
    console.log(`    p     ${t.ps.map(fmtP).join(' ')}`);
  }

  // Optional sidecar so a calibration read sizes intervals from measured
  // counts instead of transcribed ones. SEEDS_JSON=<path>.
  if (process.env.SEEDS_JSON) {
    const declared = {};
    for (const f of files) declared[f] = Object.keys(EXPECTED[f].flags || {});
    const outPath = process.env.SEEDS_JSON;
    try { mkdirSync(join(outPath, '..'), { recursive: true }); } catch {}
    writeFileSync(outPath, JSON.stringify({
      seeds: SEED_LIST, declared,
      fixtures: Object.fromEntries(files.map(f => [f, {
        expectedSeverity: EXPECTED[f].severity,
        severities: seedRuns[f].severities,
        ok: seedRuns[f].ok,
        firing: seedRuns[f].firing,
        tests: seedRuns[f].tests,
      }])),
    }));
    console.log(`\nSeed sidecar written: ${outPath}`);
  }

  console.log(`\n${'═'.repeat(72)}`);
  if (seedFailed) {
    console.log(`MULTI-SEED: FAILED — ${sevMoved.length} fixture(s) with seed-unstable severity, ${flagMoved.length} unstable cell(s).`);
  } else {
    console.log(`MULTI-SEED: severity constant on all ${files.length} fixtures across ${SEEDS} seeds` +
      (flagMoved.length ? `; ${flagMoved.length} cell(s) flip below the tier.` : '; no cell flips.'));
  }
  console.log('═'.repeat(72));
}

if (PERF) {
  const batchMs = performance.now() - batchStart;
  let sha = 'unknown';
  try {
    sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {}
  const label = PERF_LABEL || sha;
  const nodeVersion = process.version;
  const platform = `${process.platform} ${process.arch}`;
  const capturedAt = new Date().toISOString();

  // ── Per-test totals across all fixtures, sorted descending ──
  const perTestTotal = {};
  for (const [file, p] of Object.entries(perfPerFixture)) {
    for (const t of p.timings) {
      perTestTotal[t.name] = (perTestTotal[t.name] || 0) + t.ms;
    }
  }
  const perTestRanked = Object.entries(perTestTotal)
    .sort((a, b) => b[1] - a[1])
    .map(([name, ms]) => ({ name, totalMs: ms }));

  // ── Per-fixture totals, sorted descending ──
  const perFixtureTotal = Object.entries(perfPerFixture)
    .map(([file, p]) => ({ file, totalMs: p.timings.reduce((s, t) => s + t.ms, 0) }))
    .sort((a, b) => b.totalMs - a.totalMs);

  console.log('\n── PERF: batch ' + label + ' (' + nodeVersion + ', ' + platform + ') ──');
  console.log(`Total wallclock: ${(batchMs / 1000).toFixed(2)}s`);
  console.log('\nPer-test totals across 22 fixtures (ms, descending):');
  for (const t of perTestRanked) {
    console.log(`  ${t.totalMs.toFixed(0).padStart(8)}  ${t.name}`);
  }
  console.log('\nPer-fixture totals (ms, descending):');
  for (const f of perFixtureTotal) {
    console.log(`  ${f.totalMs.toFixed(0).padStart(8)}  ${f.file}`);
  }
  console.log('\nBM parity (DS21/DS22/DS15):');
  for (const file of ['21-localised-ar.csv', '22-covariance-block.csv', '15-missing-carlisle.csv']) {
    const p = perfPerFixture[file];
    if (!p) { console.log(`  ${file}: not in batch`); continue; }
    const bmT = p.timings.find(t => t.name === 'Blocked Mahalanobis');
    const exc = p.bmPrimaryExceed
      ? `pass=${p.bmPrimaryExceed.pass} cond=${p.bmPrimaryExceed.condition} exceed=${p.bmPrimaryExceed.exceed} rawP=${p.bmPrimaryExceed.rawP.toFixed(6)} adjP=${p.bmPrimaryExceed.adjP.toFixed(6)}`
      : '(none)';
    const totExc = p.bmExceedances ? p.bmExceedances.reduce((s, u) => s + u.exceed, 0) : 0;
    console.log(`  ${file}: BM=${bmT?.ms.toFixed(0)}ms primaryP=${p.bmPrimaryP} flag=${p.bmFlag} nPerm=${p.bmNPerm}`);
    console.log(`    primary: ${exc}`);
    console.log(`    sumExceed across ${p.bmExceedances?.length || 0} units = ${totExc}`);
  }

  // ── Sidecar JSON for offline diff ──
  const outDir = 'test/perf-out';
  try { mkdirSync(outDir, { recursive: true }); } catch {}
  const sidecar = {
    label, sha, nodeVersion, platform, capturedAt,
    batchMs, perTestRanked, perFixtureTotal,
    perFixture: perfPerFixture,
  };
  const outPath = join(outDir, `${label}.json`);
  writeFileSync(outPath, JSON.stringify(sidecar, null, 2));
  console.log(`\nSidecar written: ${outPath}`);
}

process.exit(failed > 0 || seedFailed > 0 ? 1 : 0);
