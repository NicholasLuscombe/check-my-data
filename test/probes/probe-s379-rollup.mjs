// S379 Part A roll-up — reads the corpus-run artifact and emits the tables the
// dispatch asks for. Runs NO engine code: every number here comes from
// scripts/corpus-run.mjs's output, which called runFullAnalysis itself. The only
// engine import is TEST_MECHANISM, the constant severity.js reads to build its
// dimension set — imported rather than transcribed so the two cannot drift.
//
// Usage: node test/probes/probe-s379-rollup.mjs [artifact.json]

import { readFileSync } from 'node:fs';
import { TEST_MECHANISM, MECHANISMS } from '../../src/constants/mechanisms.js';

const ARTIFACT = process.argv[2] || 'corpus-out/s379-honest-run.json';
const art = JSON.parse(readFileSync(ARTIFACT, 'utf-8'));

const FLAGGED = f => f === 'HIGH' || f === 'MODERATE';

// ── Split the artifact into imported sheets and import failures ──────
const sheets = [];
const failures = [];
for (const d of art.datasets) {
  const [deposit, sheet] = d.label.split(' :: ');
  if (d.error) { failures.push({ deposit, sheet, path: d.path, reason: d.error }); continue; }
  sheets.push({ deposit, sheet, ...d });
}

// A deposit whose every sheet failed must never read as unflagged — track it.
const allDeposits = [...new Set(art.datasets.map(d => d.label.split(' :: ')[0]))].sort();

// ── Per-sheet table ──────────────────────────────────────────────────
console.log('='.repeat(100));
console.log('PER-SHEET RESULTS');
console.log('='.repeat(100));
for (const s of sheets) {
  const st = s.structure;
  console.log(`\n### ${s.deposit} :: ${s.sheet}`);
  console.log(`    file=${s.path}  matrix=${st.nRows}x${st.nCols}  assay=${st.assay}(${st.assaySource}) ` +
    `dataType=${st.dataType} vst=${st.vst}(${st.vstSource}) rowSem=${st.rowSemantics} ` +
    `cond=${st.nConditions ?? '-'}(${st.conditionType ?? '-'}) import=OK`);
  const sev = s.severity;
  console.log(`    severity=${sev.severity} H=${sev.high} M=${sev.mod} D=${sev.nFlaggedDimensions}`);
  const flagged = s.tests.filter(t => FLAGGED(t.flag));
  if (flagged.length) {
    for (const t of flagged) {
      console.log(`      ${t.flag.padEnd(8)} ${t.name.padEnd(38)} p=${t.primaryP}  dim=${TEST_MECHANISM[t.name] || '(unmapped:' + t.name + ')'}`);
    }
  } else {
    console.log('      (no HIGH/MODERATE)');
  }
  const na = s.tests.filter(t => t.flag === 'N/A');
  console.log(`      LOW=${s.tests.filter(t => t.flag === 'LOW').length}  N/A=${na.length}`);
}

// ── Per-deposit roll-up: worst verdict across runnable sheets ────────
console.log('\n' + '='.repeat(100));
console.log('PER-DEPOSIT ROLL-UP (worst verdict across runnable sheets)');
console.log('='.repeat(100));
const perDeposit = [];
for (const dep of allDeposits) {
  const mine = sheets.filter(s => s.deposit === dep);
  const failed = failures.filter(f => f.deposit === dep);
  if (!mine.length) {
    perDeposit.push({ deposit: dep, verdict: null, nSheets: 0, nFailed: failed.length });
    console.log(`\n${dep}: NO RUNNABLE SHEET — ${failed.length} import failure(s). NOT a clean result.`);
    continue;
  }
  // Worst = highest severity; ties broken by H then M.
  const worst = mine.slice().sort((a, b) =>
    b.severity.severity - a.severity.severity ||
    b.severity.high - a.severity.high ||
    b.severity.mod - a.severity.mod)[0];
  // Dimension set of the worst sheet's flagged tests.
  const dims = [...new Set(worst.tests.filter(t => FLAGGED(t.flag))
    .map(t => TEST_MECHANISM[t.name] || `(unmapped:${t.name})`))].sort();
  perDeposit.push({
    deposit: dep, sheet: worst.sheet, nSheets: mine.length, nFailed: failed.length,
    severity: worst.severity.severity, H: worst.severity.high, M: worst.severity.mod,
    D: worst.severity.nFlaggedDimensions, dims,
  });
  console.log(`\n${dep}  worst sheet="${worst.sheet}"  (${mine.length} runnable, ${failed.length} failed)`);
  console.log(`    severity=${worst.severity.severity}  H=${worst.severity.high}  M=${worst.severity.mod}  D=${worst.severity.nFlaggedDimensions}`);
  console.log(`    flagged dimensions: ${dims.length ? dims.map(d => `${d} (${MECHANISMS[d]?.label ?? '?'})`).join(', ') : '(none)'}`);
}

// ── Totals ───────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(100));
console.log('TOTALS');
console.log('='.repeat(100));

const bySev = {};
for (const p of perDeposit) { const k = p.verdict === null ? 'no-runnable-sheet' : p.severity; bySev[k] = (bySev[k] || 0) + 1; }
console.log('\nDeposits at each severity (deposit is the unit, n = 12):');
for (const k of Object.keys(bySev).sort()) console.log(`  severity ${k}: ${bySev[k]}`);

// Flag counts. Two denominators, kept separate on purpose:
//   - deposit-level: the worst sheet only, which is the measurement's unit
//   - sheet-level: every runnable sheet, which is the adjudication's unit
const depHigh = perDeposit.reduce((n, p) => n + (p.H || 0), 0);
const depMod = perDeposit.reduce((n, p) => n + (p.M || 0), 0);
let shHigh = 0, shMod = 0;
for (const s of sheets) { shHigh += s.severity.high; shMod += s.severity.mod; }
console.log(`\nFlags on the worst sheet of each deposit: HIGH=${depHigh}  MODERATE=${depMod}  total=${depHigh + depMod}`);
console.log(`Flags across ALL ${sheets.length} runnable sheets:    HIGH=${shHigh}  MODERATE=${shMod}  total=${shHigh + shMod}`);

// Per-test flag counts across all runnable sheets.
const perTest = {};
for (const s of sheets) for (const t of s.tests) {
  const e = (perTest[t.name] ||= { HIGH: 0, MODERATE: 0, LOW: 0, 'N/A': 0 });
  e[t.flag] = (e[t.flag] || 0) + 1;
}
console.log('\nPer-test flag counts across all runnable sheets (sorted by HIGH+MODERATE):');
const rows = Object.entries(perTest)
  .map(([n, e]) => ({ n, ...e, fired: e.HIGH + e.MODERATE }))
  .sort((a, b) => b.fired - a.fired || a.n.localeCompare(b.n));
console.log('  ' + 'test'.padEnd(40) + 'HIGH'.padStart(6) + 'MOD'.padStart(6) + 'LOW'.padStart(6) + 'N/A'.padStart(6) + 'dim'.padStart(12));
for (const r of rows) {
  console.log('  ' + r.n.padEnd(40) + String(r.HIGH).padStart(6) + String(r.MODERATE).padStart(6) +
    String(r.LOW).padStart(6) + String(r['N/A']).padStart(6) + String(TEST_MECHANISM[r.n] || '(unmapped)').padStart(12));
}

// How the flags distribute across deposits — four files carrying it, or all twelve?
console.log('\nFlag distribution across deposits (all runnable sheets):');
for (const dep of allDeposits) {
  const mine = sheets.filter(s => s.deposit === dep);
  const h = mine.reduce((n, s) => n + s.severity.high, 0);
  const m = mine.reduce((n, s) => n + s.severity.mod, 0);
  console.log(`  ${dep.padEnd(6)} HIGH=${String(h).padStart(3)}  MOD=${String(m).padStart(3)}  total=${String(h + m).padStart(3)}  (${mine.length} sheet(s))`);
}

// ── Import failures, their own category ──────────────────────────────
console.log('\n' + '='.repeat(100));
console.log(`IMPORT FAILURES (${failures.length} of ${art.datasets.length} sheets) — never counted as unflagged`);
console.log('='.repeat(100));
for (const f of failures) console.log(`  ${f.deposit} :: ${f.sheet}\n      ${f.reason}`);
if (!failures.length) console.log('  (none)');

console.log(`\nSheets attempted: ${art.datasets.length}   imported: ${sheets.length}   failed: ${failures.length}`);
console.log(`Deposits: ${allDeposits.length}   with >=1 runnable sheet: ${perDeposit.filter(p => p.nSheets > 0).length}`);
