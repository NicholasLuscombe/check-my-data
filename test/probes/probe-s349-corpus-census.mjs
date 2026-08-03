// probe-s349-corpus-census.mjs — S349 Part 4c.
//
// One row per fixture in the 27-file corpus. For each: how the engine groups its
// conditions, whether its rows are paired across conditions (COUNTED FROM THE
// FIXTURE), and — when CCC runs — which stage supplies primaryP, which units
// drive it, their direction and tier, and whether any effect-size gate
// suppressed a unit before its p reached the flag.
//
// Runs each fixture ONCE at its own shipped seed and the shipped B. The seed is
// not substituted, so every number here is the draw the batch actually sees.
//
// READ-ONLY on src/. The per-unit fields are exposed by an in-memory load hook
// (s349-unit-capture-hook.mjs) because `u.p2` and `u.gatePassed` never reach the
// returned object — S349 Part 2a.
//
// Usage:
//   node --import ./test/probes/s349-unit-capture-hook.mjs test/probes/probe-s349-corpus-census.mjs
//
// Env: JSON_OUT — also write the rows as JSON for recounting.

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { ALPHA } = await import('../../src/constants/thresholds.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

if (!globalThis.__S349_CAPTURE_HOOK) {
  throw new Error('probe-s349-census: capture hook missing — --import ./test/probes/s349-unit-capture-hook.mjs');
}

const FIXTURES = 'test/fixtures';
const CCC = 'Cross-Condition Consistency';
const files = Object.keys(EXPECTED);

console.log(`S349 Part 4c — CCC corpus census, ${files.length} fixtures`);
console.log(`Each fixture run ONCE at its own shipped seed and the shipped B. Nothing substituted.\n`);

const out = [];

for (const file of files) {
  const assay = EXPECTED[file].assay;
  const declared = EXPECTED[file].severity;
  const text = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(text, { skipEmptyLines: true });
  const raw = preprocessRaw(parsed.data).rows;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({ data, roles, condPerCol, zeroAsMissing: false });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';

  const slices = condCtx?.slices ? condCtx.slices() : null;
  const branch = !condCtx?.has ? 'none' : condCtx.type;

  // ── pairing, counted from the fixture ───────────────────────────────────
  let pairing, pairDetail;
  if (branch === 'none') {
    pairing = 'n/a';
    pairDetail = 'no conditions';
  } else if (branch === 'column-grouped') {
    // Every condition is a COLUMN subset of the same rows: slice row r is the
    // same subject in every condition. buildGroups filters per group, so the
    // alignment is positional and only holds while the row counts match.
    const lens = slices.map(s => s.matrix.length);
    const aligned = new Set(lens).size === 1 && lens[0] === matrix.length;
    pairing = aligned ? 'structural' : 'structural-RAGGED';
    pairDetail = `slice row counts ${lens.join('/')} of ${matrix.length} matrix rows; condCtx.paired=${condCtx.paired}`;
  } else {
    // Row-grouped: pairing needs an identifier appearing once in every condition.
    const condIdx = roles.findIndex(r => r === 'condition');
    const labelIdx = roles.map((r, i) => (r === 'label' ? i : -1)).filter(i => i >= 0);
    const condNames = [...new Set(data.map(r => String(r[condIdx]).trim()).filter(Boolean))];
    let best = null;
    for (const li of labelIdx) {
      const per = new Map();
      for (const r of data) {
        const id = String(r[li]).trim(), c = String(r[condIdx]).trim();
        if (!c) continue;
        const e = per.get(id) || {}; e[c] = (e[c] || 0) + 1; per.set(id, e);
      }
      const ids = [...per.keys()];
      const once = ids.filter(id => condNames.every(c => per.get(id)[c] === 1)).length;
      const full = ids.length > 0 && once === ids.length;
      if (!best || (full && !best.full) || (full === best.full && once > best.once)) {
        best = { col: headers[li], n: ids.length, once, full };
      }
    }
    pairing = best?.full ? 'paired' : 'unpaired';
    pairDetail = best
      ? `best key "${best.col}": ${best.n} distinct, ${best.once} appear exactly once in each of ${condNames.length} conditions; condCtx.paired=${condCtx.paired}`
      : `no label column; condCtx.paired=${condCtx.paired}`;
  }

  // ── run ─────────────────────────────────────────────────────────────────
  globalThis.__S349_UNITS = null;
  globalThis.__S349_SKIPPED = null;
  const t0 = Date.now();
  const results = await runFullAnalysis(matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const sev = computeSeverity(results);
  const ccc = results.find(r => r.name === CCC);
  const units = globalThis.__S349_UNITS || [];
  const skipped = globalThis.__S349_SKIPPED || [];

  // which units actually supply primaryP
  const contributing = units.filter(u => u.forensic && u.gatePassed);
  const pMin = ccc?.primaryP;
  const drivers = contributing.filter(u => Math.abs(u.adjP - pMin) < 1e-12);
  const driverStages = [...new Set(drivers.map(u => u.stage))];
  const suppressed = units.filter(u => u.forensic && !u.gatePassed);
  const barredByDirection = units.filter(u => !u.forensic);

  console.log(`── ${file}  [${assay}]  declared severity ${declared}  ->  observed ${sev.severity}   ${secs}s`);
  console.log(`   grouping: ${branch}${condCtx?.has ? `, ${condCtx.count} level(s) (${slices.map(s => s.name).join(', ')})` : ''}`);
  console.log(`   pairing: ${pairing.toUpperCase()} — ${pairDetail}`);
  if (!ccc || ccc.flag === 'N/A') {
    console.log(`   CCC: N/A — ${ccc?.description || '(no result)'}`);
    console.log(`   Stage 1 never runs.\n`);
    out.push({ file, assay, declared, observed: sev.severity, branch, pairing, pairDetail, cccFlag: 'N/A', cccP: null, naReason: ccc?.description ?? null, units: [], skipped: [] });
    continue;
  }
  console.log(`   CCC: ${ccc.flag}  primaryP ${ccc.primaryP}  B=${ccc.B}  units ran ${units.length}/${ccc.nUnitsTotal}  nGateSuppressed(result field) ${ccc.nGateSuppressed}`);
  console.log(`   primaryP supplied by stage ${driverStages.join('+') || '(none — every unit neutralised, p forced to 1)'}` +
    (drivers.length ? `: ${drivers.map(u => `S${u.stage} ${u.id} ${u.condA}~${u.condB} ${u.direction} adjP=${u.adjP.toPrecision(4)} raw=${u.p2.toPrecision(4)}`).join(' | ')}` : ''));
  const s1 = units.filter(u => u.stage === 1);
  console.log(`   Stage-1 units: ${s1.length} ran; forensic(similar) ${s1.filter(u => u.forensic).length}, ` +
    `barred by direction ${s1.filter(u => !u.forensic).length}, gate-suppressed ${s1.filter(u => u.forensic && !u.gatePassed).length}`);
  if (s1.length) {
    for (const u of s1) {
      const tier = !u.forensic ? 'informational' : (u.adjP < ALPHA.FLAG && u.gatePassed) ? 'HIGH'
        : (u.adjP < ALPHA.NOTE && u.gatePassed) ? 'MODERATE' : 'LOW';
      console.log(`      S1 ${u.id} ${u.prop.padEnd(20)} ${(u.condA + '~' + u.condB).padEnd(26)} dObs ${u.dObs.toPrecision(5).padStart(11)} nullMed ${u.permMedian.toPrecision(5).padStart(11)}` +
        ` raw ${u.p2.toPrecision(4).padStart(10)} adjP ${u.adjP.toPrecision(4).padStart(10)} ${u.direction.padEnd(9)} gate ${u.gatePassed ? 'pass' : 'FAIL'}  ${tier}`);
    }
  }
  if (suppressed.length) {
    console.log(`   GATE-SUPPRESSED (forensic direction, gate failed, p never consulted):`);
    for (const u of suppressed) {
      console.log(`      S${u.stage} ${u.id} ${u.prop} ${u.condA}~${u.condB}  ${u.direction}  dObs ${u.dObs.toPrecision(5)} nullMed ${u.permMedian.toPrecision(5)}` +
        `  raw p ${u.p2.toPrecision(4)}  adjP ${u.adjP.toPrecision(4)}  nMin ${u.nMin}`);
    }
  }
  if (skipped.length) {
    const byReason = {};
    for (const s of skipped) byReason[s.reason] = (byReason[s.reason] || 0) + 1;
    console.log(`   units that never ran: ${skipped.length} — ${Object.entries(byReason).map(([r, n]) => `${r} x${n}`).join('; ')}`);
  }
  console.log('');
  out.push({
    file, assay, declared, observed: sev.severity, branch, pairing, pairDetail,
    cccFlag: ccc.flag, cccP: ccc.primaryP, B: ccc.B,
    driverStages, drivers: drivers.map(u => ({ stage: u.stage, id: u.id, dir: u.direction, adjP: u.adjP, p2: u.p2 })),
    nStage1: s1.length, nStage1Forensic: s1.filter(u => u.forensic).length,
    nBarredDirection: barredByDirection.length, nGateSuppressed: suppressed.length,
    suppressed: suppressed.map(u => ({ stage: u.stage, id: u.id, dir: u.direction, p2: u.p2, adjP: u.adjP, dObs: u.dObs, permMedian: u.permMedian })),
    units, skipped,
  });
}

// ── summary tables ────────────────────────────────────────────────────────
console.log('\n════ SUMMARY ════\n');
console.log('file                                  sev  branch          pairing      CCC flag  primaryP     driver stage');
for (const r of out) {
  console.log(`${r.file.padEnd(38)}${String(r.declared).padEnd(5)}${r.branch.padEnd(16)}${r.pairing.padEnd(13)}${String(r.cccFlag).padEnd(10)}` +
    `${String(r.cccP ?? '—').slice(0, 12).padEnd(13)}${r.driverStages ? r.driverStages.join('+') : '—'}`);
}

console.log('\n──— counts ——–');
const na = out.filter(r => r.cccFlag === 'N/A');
const ran = out.filter(r => r.cccFlag !== 'N/A');
console.log(`CCC N/A: ${na.length}   CCC ran: ${ran.length}`);
console.log(`  of those that ran — paired ${ran.filter(r => r.pairing.startsWith('structural') || r.pairing === 'paired').length}, unpaired ${ran.filter(r => r.pairing === 'unpaired').length}`);
console.log(`  primaryP from Stage 1: ${ran.filter(r => r.driverStages?.includes(1)).length}`);
console.log(`  any Stage-1 unit forensic (similar-direction): ${ran.filter(r => r.nStage1Forensic > 0).length}`);
console.log(`  any gate-suppressed unit: ${ran.filter(r => r.nGateSuppressed > 0).length}`);
console.log(`  CCC flagged MOD/HIGH: ${ran.filter(r => r.cccFlag === 'MODERATE' || r.cccFlag === 'HIGH').length}`);

if (process.env.JSON_OUT) {
  writeFileSync(process.env.JSON_OUT, JSON.stringify(out, null, 1));
  console.log(`\nwrote ${process.env.JSON_OUT}`);
}
