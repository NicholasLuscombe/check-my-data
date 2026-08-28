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
const { EXPECTED, ACKNOWLEDGED, SUSPENDED, MATRIX_EXCEPTIONS } = await import('./batch-fixtures.mjs');
// S384 — the failures this runner is expected to have today. See the header of
// test/known-failures.mjs for what an entry means and how to add or retire one.
const { KNOWN_FAILURES } = await import('./known-failures.mjs');

const FIXTURES = 'test/fixtures';

// ── S384 — failure signatures ───────────────────────────────────────────────
// A signature names one failure in three parts: the check, the gate that
// rejected it, and the test at fault. Every gate below builds its signatures
// from the values it just compared — never by parsing its own printed line —
// so the identity the known failure list matches on is the identity the gate
// actually rejected.
//
// Three parts rather than one, because a fixture name on its own would let a
// declared red keep hiding a different failure inside the same fixture, which
// is precisely what this machinery exists to stop.
function sig(check, gate, test) {
  return { check, gate, test: test || null };
}
// JSON rather than a joined string: a test name can contain any punctuation a
// separator might use, and a key that could collide would silently match the
// wrong signature.
function sigKey(s) {
  return JSON.stringify([s.check, s.gate, s.test]);
}
// How a signature reads in the runner's output. `gateLabel` is the form used
// under a check's own line, where the check name is already above it.
function gateLabel(s) {
  return `${s.gate}${s.test ? `, ${s.test}` : ''}`;
}
function sigLabel(s) {
  return `${s.check} — ${gateLabel(s)}`;
}
// The DS01 cross-shape check's name. It shares a CSV with a fixture-loop entry
// and must not share that entry's name, or declaring one would declare both.
const CROSS_SHAPE_CHECK = '01-densitometry-clean.csv (long-form cross-shape)';
const KNOWN_KEYS = new Map(KNOWN_FAILURES.map(e => [sigKey(e), e]));

// Every check that ran, with the signatures it produced. One record per check
// that counts toward the total; pending fixtures are not checks and are not
// recorded.
const checkRecords = [];

// ── S358 P101 — the flag matrix ─────────────────────────────────────
// Every (fixture, test) cell's flag, pinned at seed offset 0 and compared on
// every run in BOTH directions. The three declaration lanes above name 62 of
// the 783 cells, and only the 53 declared ones can fail by going quiet — so a
// detection that disappears anywhere else costs nothing. S357 measured this
// tool's instability running toward false negatives, which is exactly the
// direction those lanes are weakest in. The matrix closes the other 730.
//
// It is emitted by the fixture loop below, from the same `results` array the
// gate has just compared — never by a separate script that rebuilds its own
// inputs, which would verify the engine and never the path that feeds it.
//
// Regenerate with `WRITE_MATRIX=1 node test/validate-batch.mjs`. Generated
// file: never hand-edit it. Hand-authored allowances live in
// MATRIX_EXCEPTIONS in test/batch-fixtures.mjs, where a regeneration cannot
// reach them.
const WRITE_MATRIX = process.env.WRITE_MATRIX === '1';
const MATRIX_PATH = 'test/flag-matrix.json';

// Refused rather than guarded. Under SEEDS>1 the loop visits eight offsets and
// a write would silently record whichever one ran last; making the caller pick
// is clearer than picking for them.
if (WRITE_MATRIX && MULTI) {
  console.error('WRITE_MATRIX=1 and SEEDS>1 are mutually exclusive — the matrix records offset 0 only.');
  console.error('Run `WRITE_MATRIX=1 node test/validate-batch.mjs` to regenerate, then `SEEDS=8 …` to sweep.');
  process.exit(2);
}

let MATRIX = null;
if (!WRITE_MATRIX) {
  try {
    MATRIX = JSON.parse(readFileSync(MATRIX_PATH, 'utf-8')).cells;
  } catch (err) {
    console.error(`flag matrix unreadable at ${MATRIX_PATH}: ${err.message}`);
    console.error('Regenerate with `WRITE_MATRIX=1 node test/validate-batch.mjs`.');
    process.exit(2);
  }
}
const matrixOut = WRITE_MATRIX ? {} : null;

// One string per cell, keyed by fixture filename and test name — never by
// index, so reordering engine.js's `tests` array produces no diff. ERROR is
// recorded as ERROR: a test that starts throwing where it used to return LOW
// is exactly the change this is for. `N/A` carries its structured cause when
// the result has one, so a withholding rule that widens by accident fails here
// even though the flag string never moves (P94 gave the withheld state its own
// cause code, and a withheld and a not-applicable test both render `N/A`).
function cellValue(r) {
  if (r.flag !== 'N/A') return r.flag;
  return r.naCause ? `N/A:${r.naCause}` : 'N/A';
}

// Cell-by-cell comparison, failing in both directions. A shape change — a test
// added to or removed from the battery — is reported by name and does not
// crash, and an unmatched cell is never skipped in silence.
//
// S384: each miss carries the test it is about alongside its message, so a
// signature can be keyed on the cell rather than on the whole fixture. `test`
// is null for the one miss that is about the fixture as a whole.
function compareMatrix(file, live) {
  const misses = [];
  const pinned = MATRIX[file];
  if (!pinned) {
    misses.push({ test: null, msg: `${file}: fixture is not in the flag matrix — regenerate with WRITE_MATRIX=1` });
    return misses;
  }
  const exceptions = MATRIX_EXCEPTIONS[file] || {};
  for (const name of Object.keys(pinned)) {
    if (!(name in live)) {
      misses.push({ test: name, msg: `${file} / ${name}: in the matrix, absent from this run — test removed from the battery? regenerate with WRITE_MATRIX=1` });
    }
  }
  for (const [name, got] of Object.entries(live)) {
    if (!(name in pinned)) {
      misses.push({ test: name, msg: `${file} / ${name}: ran but is absent from the matrix — test added to the battery? regenerate with WRITE_MATRIX=1` });
      continue;
    }
    const want = pinned[name];
    if (got === want) continue;
    const exc = exceptions[name];
    if (exc && exc.observed.includes(got)) continue;
    misses.push({ test: name, msg: `${file} / ${name}: matrix ${want}, live ${got}` });
  }
  return misses;
}

const PERF = process.env.PERF === '1';
const PERF_LABEL = process.env.PERF_LABEL || null;
const perfPerFixture = PERF ? {} : null;
const batchStart = PERF ? performance.now() : 0;

// S384 — three counts, not two. `knownRed` is a check that failed only in ways
// the known failure list already declares; `newFailed` is a check that failed
// in at least one way it does not. Splitting them is the whole point: a repo
// whose runner is permanently red cannot see tomorrow's failure arrive.
let passed = 0, knownRed = 0, newFailed = 0, pending = 0;

// S384 — record one check's outcome and sort it into one of the three counts.
// A check that failed is a known red only when EVERY signature it produced is
// declared; one undeclared signature makes the whole check a new failure, even
// alongside a declared one. Erring the other way would let a declared red carry
// an undeclared one in on its back, which is the failure mode this replaces.
function tally(name, ok, signatures) {
  const known = signatures.filter(s => KNOWN_KEYS.has(sigKey(s)));
  const fresh = signatures.filter(s => !KNOWN_KEYS.has(sigKey(s)));
  checkRecords.push({ name, ok, signatures, known, fresh });
  if (ok) {
    passed++;
    return;
  }
  for (const s of known) {
    console.log(`    ↳ known failure, expected — ${gateLabel(s)}. It is declared in test/known-failures.mjs.`);
  }
  for (const s of fresh) {
    console.log(`    ↳ NEW FAILURE — ${gateLabel(s)}. Nothing in test/known-failures.mjs accounts for it.`);
  }
  if (fresh.length) newFailed++; else knownRed++;
}

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
          cellMisses.push({ test: name, msg: `${name}: result not present (unresolved name binding?)` });
        } else if (!allow.includes(r.flag)) {
          cellMisses.push({ test: name, msg: `${name}: got ${r.flag}, expected ∈ [${allow.join(', ')}]` });
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
    // S384: one miss per offending test rather than one miss listing them all.
    // The known failure list keys on the test, so two undeclared firings on one
    // fixture have to be two signatures — otherwise declaring the first would
    // silently bless the second.
    const completenessMisses = [];
    if (expected.severity === 0) {
      for (const n of firingNames) {
        completenessMisses.push({ test: n, msg: `${n} fired on a clean fixture — false positive` });
      }
    } else {
      const accountedNames = new Set([
        ...Object.keys(expected.flags || {}),
        ...Object.keys(ackForFile),
      ]);
      for (const n of firingNames.filter(x => !accountedNames.has(x))) {
        completenessMisses.push({ test: n, msg: `${n} fired MODERATE or HIGH and nothing accounts for it — declare a cell in expected.flags or add it to ACKNOWLEDGED with a reason` });
      }
    }
    const completenessOk = completenessMisses.length === 0;

    // S358 P101 — flag matrix. Built from the `results` array the three lanes
    // above just read, so the values compared are the values that ran. The
    // comparison runs at EVERY offset: under SEEDS>1 the sweep is where the
    // exceptions earn their keep.
    const liveCells = {};
    for (const r of results) liveCells[r.name] = cellValue(r);
    if (WRITE_MATRIX) matrixOut[file] = liveCells;
    const matrixMisses = WRITE_MATRIX ? [] : compareMatrix(file, liveCells);
    const matrixOk = matrixMisses.length === 0;

    // The severity assertion stays. Severity reaches the verdict through an
    // aggregation, so pinning every flag does not pin it — the matrix is
    // strictly stronger per cell and subsumes neither the severity check nor
    // the three lanes' reasons for a cell being what it is.
    const ok = severity === expected.severity && cellsOk && completenessOk && matrixOk;
    const flags = results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE').map(r => `${r.name}:${r.flag}`).join(', ');

    // S384 — this fixture's failure signatures, one per rejected thing. Built
    // from the four gates' own comparisons, in the order they are printed.
    const signatures = [];
    if (severity !== expected.severity) signatures.push(sig(file, 'severity', null));
    for (const m of cellMisses) signatures.push(sig(file, 'per-test flag', m.test));
    for (const m of completenessMisses) signatures.push(sig(file, 'completeness', m.test));
    for (const m of matrixMisses) signatures.push(sig(file, 'flag matrix', m.test));

    if (MULTI) {
      // Record this seed's verdicts. Flags and p-values are stored per seed and
      // never averaged — the distribution across seeds IS the finding, and a mean
      // p would hide exactly the cell that straddles a threshold.
      if (!seedRuns[file]) seedRuns[file] = { severities: [], tests: {}, firing: [], ok: [], misses: [] };
      const rec = seedRuns[file];
      rec.severities.push(severity);
      rec.ok.push(!!ok);
      // Strings, as this collector has always held. S384 gave the three miss
      // arrays a `{ test, msg }` shape; the message is the part this records.
      rec.misses.push([...cellMisses, ...completenessMisses, ...matrixMisses].map(m => m.msg));
      // Channel composition: which tests carry the fixture at this seed. A fixture
      // can reach its declared severity through different channels at different
      // seeds, and that is not a pass.
      rec.firing.push(results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE').map(r => r.name).sort());
      for (const r of results) {
        if (!rec.tests[r.name]) rec.tests[r.name] = { flags: [], ps: [], cells: [], B: null, Bfield: null };
        const t = rec.tests[r.name];
        t.flags.push(r.flag);
        // The matrix cell value, which is the flag plus the N/A cause. Kept
        // beside the flag rather than derived from it: a cell can move between
        // two N/A causes without the flag string changing.
        t.cells.push(cellValue(r));
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
        for (const m of cellMisses) console.log(`    ↳ per-test miss — ${m.msg}`);
      }
      if (!completenessOk) {
        for (const m of completenessMisses) console.log(`    ↳ completeness gate — ${m.msg}`);
      }
      if (!matrixOk) {
        for (const m of matrixMisses) console.log(`    ↳ flag matrix — ${m.msg}`);
      }
      // A withdrawn true detection stays visible in the run. A suspension the
      // batch never mentions is a record nobody reads, and a green line beside a
      // fixture whose channel was removed by decision would read as though
      // nothing had been given up.
      for (const [name, s] of Object.entries(SUSPENDED[file] || {})) {
        console.log(`    ↳ suspended — ${name}: was [${s.was.join(', ')}], withdrawn by ${s.decision}`);
      }
      tally(file, ok, signatures);
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

// ── S358 P101 — emit the flag matrix ────────────────────────────────
// Keys sorted at both levels so a regeneration produces a minimal, readable
// git diff and never a reordering one. The counts are written beside the cells
// so a reader can see the matrix's shape without parsing it.
if (WRITE_MATRIX) {
  const sortedFiles = Object.keys(matrixOut).sort();
  const cells = {};
  let nCells = 0;
  for (const f of sortedFiles) {
    const names = Object.keys(matrixOut[f]).sort();
    cells[f] = Object.fromEntries(names.map(n => [n, matrixOut[f][n]]));
    nCells += names.length;
  }
  writeFileSync(MATRIX_PATH, JSON.stringify({
    _generated: 'GENERATED by `WRITE_MATRIX=1 node test/validate-batch.mjs` — do not hand-edit.',
    _what: 'Flag of every (fixture, test) cell at seed offset 0. Compared in both directions on every run: a cell that stops firing fails as loudly as one that starts.',
    _exceptions: 'Hand-authored allowances for measured-unstable cells live in MATRIX_EXCEPTIONS in test/batch-fixtures.mjs, out of reach of a regeneration.',
    seedOffset: 0,
    nFixtures: sortedFiles.length,
    nCells,
    cells,
  }, null, 2) + '\n');
  console.log(`\nFlag matrix written: ${MATRIX_PATH} — ${nCells} cells across ${sortedFiles.length} fixtures at seed offset 0.`);
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
  // S384 — this check's own name, distinct from the fixture-loop entry for the
  // same CSV, so the known failure list can name one without touching the other.
  const signatures = [];
  if (!rgOk) signatures.push(sig(CROSS_SHAPE_CHECK, 'cross-shape routing', null));
  for (const v of trioViolations) signatures.push(sig(CROSS_SHAPE_CHECK, 'cross-shape trio', v.name));
  tally(CROSS_SHAPE_CHECK, ok, signatures);
}

// ── S384 — the summary ──────────────────────────────────────────────────────
// Three counts, then the detail behind each, then one sentence saying whether
// the run is clean. Written so that someone who has never seen this file can
// read the last line and know the answer.
//
// A declared failure that did not fire is its own outcome, reported on its own
// and failing the run. When the DS12b red is eventually fixed, this is the part
// that says so instead of quietly accepting it.
const observedKeys = new Set(checkRecords.flatMap(c => c.signatures.map(sigKey)));
const ranChecks = new Set(checkRecords.map(c => c.name));
const unexpectedPasses = KNOWN_FAILURES.filter(e => {
  if (observedKeys.has(sigKey(e))) return false;
  // Under WRITE_MATRIX=1 the matrix comparison does not run, so a flag matrix
  // entry cannot fire and its silence means nothing. Not an unexpected pass.
  if (WRITE_MATRIX && e.gate === 'flag matrix') return false;
  return true;
});

const total = passed + knownRed + newFailed;
const pendingSuffix = pending ? ` (+ ${pending} pending, which are not checks)` : '';
console.log(`\n${'─'.repeat(72)}`);
console.log(`${total} checks${pendingSuffix}`);
console.log(`  ${passed} passed`);
console.log(`  ${knownRed} failed in a way already known about and declared`);
console.log(`  ${newFailed} failed in a way nothing declares`);

const firedKnown = checkRecords.flatMap(c => c.known);
if (firedKnown.length) {
  console.log(`\nThe known failures, which fired as expected:`);
  for (const s of firedKnown) {
    console.log(`  ${sigLabel(s)}`);
    const why = KNOWN_KEYS.get(sigKey(s)).why;
    if (why) console.log(`      ${why}`);
  }
}

const fresh = checkRecords.flatMap(c => c.fresh);
if (fresh.length) {
  console.log(`\nNew failures. Nothing declares these, so somebody needs to look at them:`);
  for (const s of fresh) console.log(`  ${sigLabel(s)}`);
}

if (unexpectedPasses.length) {
  console.log(`\nDeclared known failures that did not fail this time:`);
  for (const e of unexpectedPasses) {
    console.log(`  ${sigLabel(e)}`);
    console.log(ranChecks.has(e.check)
      ? `      That check ran and passed this gate.`
      : `      No check by that name ran at all, so the entry may be misspelled.`);
  }
  console.log(`  If one of these was fixed on purpose, delete its entry from the known`);
  console.log(`  failure list in test/known-failures.mjs. Until then the runner cannot`);
  console.log(`  tell a fix apart from a change that hid the problem.`);
}

// S389 — the standing register, printed on EVERY run whether or not anything
// matched. The blocks above are conditional: they report what happened this
// run. This one reports what the runner is choosing to tolerate at all, with
// the count and the one thing that would close each entry. A toleration nobody
// sees becomes permanent — BANKED went forty sessions with a correct entry
// nobody opened, and an unconditional print is the cheapest guard against this
// list going the same way. Every entry is listed, fired or not.
console.log(`\nThe known-failure register — ${KNOWN_FAILURES.length} ` +
  `${KNOWN_FAILURES.length === 1 ? 'entry' : 'entries'} the runner is choosing to tolerate:`);
if (!KNOWN_FAILURES.length) {
  console.log(`  (empty — every failure this runner sees fails the run)`);
}
for (const e of KNOWN_FAILURES) {
  const fired = observedKeys.has(sigKey(e));
  console.log(`  ${sigLabel(e)}  [${fired ? 'fired this run' : 'did NOT fire this run'}]`);
  if (e.reviewTrigger) console.log(`      Closes when: ${e.reviewTrigger}`);
  if (e.provenance) console.log(`      Adjudicated: ${e.provenance}`);
}

console.log('');
if (newFailed === 0 && unexpectedPasses.length === 0) {
  // S389 — the pass condition, stated in the words it is judged in. Exit 0
  // means zero undeclared failures; it is deliberately not a ratio, because
  // the pass count moves with the seed offset while the condition does not.
  console.log(knownRed
    ? `This run is clean: zero undeclared failures. Everything that failed was already known about and declared.`
    : `This run is clean: zero undeclared failures. Nothing failed.`);
} else {
  const reasons = [];
  if (newFailed) reasons.push(`${newFailed} check${newFailed === 1 ? '' : 's'} failed in a way nothing declares`);
  if (unexpectedPasses.length) reasons.push(`${unexpectedPasses.length} declared failure${unexpectedPasses.length === 1 ? '' : 's'} did not fire`);
  console.log(`This run is NOT clean: ${reasons.join(', and ')}.`);
}
console.log('─'.repeat(72));

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

  // ── S358 P101 — flag-matrix divergence across offsets. ─────────────────
  // The matrix pins each cell at offset 0. This reports every cell that took a
  // different value at any offset, and prints the observed set an exception
  // must be derived from. Reported on the CELL value, not the flag, so a move
  // between two N/A causes shows up here even though the flag never changed.
  // A cell listed with NO EXCEPTION will fail the matrix at the offsets where
  // it moves; that is the list Part 3 encodes from.
  const matrixMoved = [];
  for (const f of files) {
    for (const [name, t] of Object.entries(seedRuns[f].tests)) {
      const base = t.cells[0];
      if (t.cells.every(c => c === base)) continue;
      matrixMoved.push({ f, name, t, base });
    }
  }
  console.log(`\nFlag-matrix divergence — ${matrixMoved.length} of ${totalCells} cells differ from their offset-0 value at some offset:`);
  if (!matrixMoved.length) console.log('  (every cell holds its offset-0 value at every offset)');
  for (const { f, name, t, base } of matrixMoved) {
    const exc = (MATRIX_EXCEPTIONS[f] || {})[name];
    console.log(`  ${f} / ${name}   ${exc ? `[exception ${exc.parked}]` : '[NO EXCEPTION]'}`);
    console.log(`    matrix (offset 0)  ${base}`);
    t.cells.forEach((c, s) => { if (c !== base) console.log(`    offset ${s}           ${c}`); });
    console.log(`    observed set       ${JSON.stringify([...new Set(t.cells)])}`);
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

// S384 — exit 0 needs BOTH halves: nothing failed that is not declared, and
// every declared failure actually fired. A known red is not a reason to go red,
// and a known red that has quietly started passing is.
process.exit(newFailed > 0 || unexpectedPasses.length > 0 || seedFailed > 0 ? 1 : 0);
