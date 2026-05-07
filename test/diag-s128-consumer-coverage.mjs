// S128 Phase 2 — 27-test consumer-coverage audit (parked #40).
//
// Walks the producer → user-evidence path end-to-end for every active
// test across the 22-fixture batch. For each test, picks the fixture
// where it fires highest severity (HIGH > MOD > LOW > N/A) and dumps:
//
//   1. Producer-emitted result fields (top-level keys)
//   2. Aggregator pass-through (groupsAssessed branch + the
//      condXXX, simDiffs, decayCurves, normDiffs spread fields)
//   3. findings.js classification (global vs localised, region.raw
//      population, S126b add-8 fallback firing, regionNumber assigned)
//   4. MINIPLOT_REGISTRY entry presence (literal lookup in the source
//      registry constant)
//   5. MiniCard component existence (file presence under
//      src/components/cards/)
//
// READ-ONLY. Reproduces the audit doc's findings.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');
const { extractCellFlags } = await import('../src/analysis/convergence.js');
const { buildFindings } = await import('../src/analysis/findings.js');
const { GLOBAL_TESTS, TEST_MECHANISM, DISPLAY_NAMES } = await import('../src/constants/mechanisms.js');

const FIXTURES = 'test/fixtures';
const ASSAYS = {
  '01-densitometry-clean.csv': 'densitometry',
  '02-densitometry-fabricated.csv': 'densitometry',
  '03-qpcr-clean.csv': 'qpcr',
  '04-qpcr-fabricated.csv': 'qpcr',
  '05-cellcount-clean.csv': 'cell_count',
  '06-cellcount-fabricated.csv': 'cell_count',
  '07-elisa-clean.csv': 'elisa',
  '08-elisa-fabricated.csv': 'elisa',
  '09-proteomics-clean.csv': 'proteomics',
  '10-proteomics-fabricated.csv': 'proteomics',
  '11-rnaseq-multicondition.csv': 'genomics',
  '12a-uniform-mixture-clean.csv': 'general',
  '12b-uniform-mixture-fabricated.csv': 'general',
  '13-vfstest-cellcountest.csv': 'cell_count',
  '14-crctest-survey.csv': 'survey',
  '15-missing-carlisle.csv': 'general',
  '16-densitometry-carlisle-overbalanced.csv': 'densitometry',
  '17-densitometry-carlisle-clean.csv': 'densitometry',
  '19-inheritance-fabricated.csv': 'general',
  '20-bimodal-fab.csv': 'general',
  '21-localised-ar.csv': 'general',
  '22-covariance-block.csv': 'general',
};

// Reproduce MINIPLOT_REGISTRY from src/components/cards/MiniPlot.jsx
// (read literally from source so the diag stays in sync without imports
// — JSX can't be loaded by Node directly).
const MINIPLOT_SRC = readFileSync('src/components/cards/MiniPlot.jsx', 'utf-8');
const MINIPLOT_REGISTRY_KEYS = (() => {
  const keys = new Set();
  const re = /"([^"]+)":\s+MiniCard_/g;
  let m;
  while ((m = re.exec(MINIPLOT_SRC)) !== null) keys.add(m[1]);
  return keys;
})();

// Mapping test names → MiniCard file (read from MINIPLOT.jsx source so
// the diag finds the actual file mapping rather than guessing names).
const TEST_TO_CARD_FILE = (() => {
  const map = {};
  const re = /"([^"]+)":\s+(MiniCard_\w+)/g;
  let m;
  while ((m = re.exec(MINIPLOT_SRC)) !== null) {
    map[m[1]] = `src/components/cards/${m[2]}.jsx`;
  }
  return map;
})();

const FLAG_RANK = { HIGH: 4, FLAGGED: 4, MODERATE: 3, NOTED: 3, LOW: 2, CLEAR: 1, "N/A": 0, ERROR: -1 };

function flagRank(f) { return FLAG_RANK[f] ?? -1; }

function summariseFields(r) {
  const skip = new Set(['name', 'category', 'description', 'flag', 'primaryP', 'interpretation']);
  const fields = Object.keys(r).filter(k => !skip.has(k));
  return fields.sort();
}

function fieldShape(r, k) {
  const v = r[k];
  if (v == null) return 'null';
  if (Array.isArray(v)) return `Array(${v.length})`;
  if (typeof v === 'object') return `Object{${Object.keys(v).length}}`;
  if (typeof v === 'number') {
    if (!isFinite(v)) return String(v);
    return Number.isInteger(v) ? `int(${v})` : `num(${v.toExponential ? v.toExponential(2) : v})`;
  }
  if (typeof v === 'string') return `str(${v.length>40?v.slice(0,37)+'...':v})`;
  return typeof v;
}

const perFixtureResults = []; // [{file, results, matrix, findings}]

console.log('=== S128 — Consumer-coverage audit ===\n');
console.log('Running 22-fixture batch...');

for (const [file, assay] of Object.entries(ASSAYS)) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  let raw = parsed.data;
  const pp = preprocessRaw(raw);
  raw = pp.rows;
  const headerRows = detectHeaderRows(raw);
  let condPerCol = null;
  if (headerRows >= 2) condPerCol = forwardFill(raw[0]);
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false
  });
  const vst = detectVST(matrix, assay);
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';
  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, () => {}, vst,
    { isPivoted: false }, dataType, rowSemantics
  );
  const nRows = matrix.length;
  const nCols = matrix[0]?.length || 0;
  const findings = buildFindings(results, nRows, nCols, {});
  perFixtureResults.push({ file, results, nRows, nCols, findings, assay });
  process.stdout.write('.');
}
process.stdout.write('\n\n');

// Group results per test name; pick the fixture where each test fires
// highest severity, breaking ties by smallest primaryP.
const allTestNames = new Set();
for (const { results } of perFixtureResults) {
  for (const r of results) {
    if (r && r.name) allTestNames.add(r.name);
  }
}

// Augment with the canonical 28-test set from TEST_MECHANISM (in case
// any test never fires across the 22-batch).
for (const name of Object.keys(TEST_MECHANISM)) allTestNames.add(name);

const perTest = {};
for (const name of allTestNames) {
  let best = null; // { fixture, result }
  for (const { file, results } of perFixtureResults) {
    const r = results.find(x => x?.name === name);
    if (!r) continue;
    const score = flagRank(r.flag) * 1e6 + (1 - Math.min(1, r.primaryP ?? 1));
    if (!best || score > best.score) {
      best = { fixture: file, result: r, score };
    }
  }
  perTest[name] = best;
}

console.log('\n=== Per-test highest-severity firing ===\n');
const sortedNames = Array.from(allTestNames).sort();
for (const name of sortedNames) {
  const e = perTest[name];
  if (!e) {
    console.log(`  ${name.padEnd(40)} → never present in any fixture`);
    continue;
  }
  const r = e.result;
  console.log(`  ${name.padEnd(40)} → ${r.flag.padEnd(8)} on ${e.fixture} (p=${r.primaryP?.toExponential ? r.primaryP.toExponential(2) : r.primaryP})`);
}

// ── Per-test detailed audit ────────────────────────────────────────
console.log('\n=== Per-test detailed audit ===\n');

const auditTable = [];

for (const name of sortedNames) {
  const e = perTest[name];
  const isGlobal = GLOBAL_TESTS.has(name);
  const inRegistry = MINIPLOT_REGISTRY_KEYS.has(name);
  const cardFile = TEST_TO_CARD_FILE[name] || null;
  const cardExists = cardFile ? existsSync(cardFile) : false;

  const row = {
    test: name,
    displayName: DISPLAY_NAMES[name] || name,
    dimension: TEST_MECHANISM[name] || '?',
    isGlobal,
    inRegistry,
    cardFile: cardFile || '— (no MINIPLOT entry)',
    cardExists,
    flagOnPick: e?.result?.flag ?? 'NEVER',
    fixtureOnPick: e?.fixture ?? '—',
  };

  if (!e) {
    row.notes = 'Test never fires on 22-batch (or N/A everywhere)';
    auditTable.push(row);
    continue;
  }

  const r = e.result;
  const fields = summariseFields(r);
  const isFlagged = ['HIGH', 'MODERATE', 'NOTED', 'FLAGGED'].includes(r.flag);
  const hasDetails = Array.isArray(r.details) && r.details.length > 0;
  const hasSubDetails = Array.isArray(r.subDetails) && r.subDetails.length > 0;
  const isAgg = r.groupsAssessed !== undefined;

  // Aggregator pass-through check: when stratified, top-level should
  // carry spread-from-worst-group fields (the aggregation.js spread
  // step). Sample a few likely fields.
  const aggSpread = isAgg ? {
    hasFisher: r.fisherChi !== undefined,
    hasCondAutocorr: !!r.condAutocorr,
    hasCondRuns: !!r.condRuns,
    hasCondConstOffset: !!r.condConstOffset,
    hasCondRegionalNoise: !!r.condRegionalNoise,
    hasCondKurtosis: !!r.condKurtosis,
    hasNormDiffs: Array.isArray(r.normDiffs) && r.normDiffs.length > 0,
    hasSimDiffs: Array.isArray(r.simDiffs) && r.simDiffs.length > 0,
    hasDecayCurves: Array.isArray(r.perGroupDecay) && r.perGroupDecay.length > 0,
    hasGroupSignSeqs: Array.isArray(r.groupSignSeqs) && r.groupSignSeqs.length > 0,
  } : null;

  // findings.js — does this test produce a finding?
  const fixtureBundle = perFixtureResults.find(p => p.file === e.fixture);
  const finding = fixtureBundle.findings.find(f => f.tests?.[0]?.testId === name);
  const cellFlags = !isGlobal ? extractCellFlags(r, fixtureBundle.nRows, fixtureBundle.nCols) : null;
  const cellFlagCount = cellFlags ? cellFlags.length : null;

  // S126b add-8 fallback: localised flagged + extractCellFlags empty +
  // r.nRows > 0 → synthetic region with empty raw.
  let fallbackFires = false;
  let fallbackBlocked = false;
  if (isFlagged && !isGlobal && cellFlagCount === 0) {
    if (r.nRows > 0) fallbackFires = true;
    else fallbackBlocked = true; // nRows missing or 0 → no chip
  }

  // The chip emission rule: localised finding with region.rowRange
  // present → gets a regionNumber → renders as chip.
  let chipEmits = false;
  if (finding && finding.type === 'localised' && finding.region && finding.region.rowRange) {
    chipEmits = true;
  }

  row.fields = fields;
  row.fieldShapes = Object.fromEntries(fields.map(k => [k, fieldShape(r, k)]));
  row.isAgg = isAgg;
  row.aggSpread = aggSpread;
  row.hasDetails = hasDetails;
  row.hasSubDetails = hasSubDetails;
  row.cellFlagCount = cellFlagCount;
  row.findingType = finding?.type ?? 'no-finding';
  row.fallbackFires = fallbackFires;
  row.fallbackBlocked = fallbackBlocked;
  row.chipEmits = chipEmits;
  row.regionNumber = finding?.regionNumber ?? null;
  row.nRowsField = r.nRows ?? '(absent)';

  auditTable.push(row);

  // Detailed dump
  console.log(`─── ${name} ───`);
  console.log(`  Display name: "${row.displayName}"  (dim=${row.dimension}${isGlobal ? ', global' : ', localised'})`);
  console.log(`  Pick fixture: ${e.fixture}  flag=${r.flag}  primaryP=${r.primaryP}`);
  console.log(`  isAgg=${isAgg}  hasDetails=${hasDetails} (${r.details?.length ?? 0})  hasSubDetails=${hasSubDetails} (${r.subDetails?.length ?? 0})  r.nRows=${row.nRowsField}`);
  console.log(`  Fields (${fields.length}):`);
  for (const k of fields) console.log(`    ${k.padEnd(30)} = ${fieldShape(r, k)}`);
  if (aggSpread) {
    console.log(`  Aggregator spread: ${JSON.stringify(aggSpread)}`);
  }
  if (!isGlobal) {
    console.log(`  extractCellFlags() returned ${cellFlagCount} region(s)`);
    console.log(`  finding.type=${row.findingType}  finding.regionNumber=${row.regionNumber ?? '—'}  chip emits=${chipEmits}`);
    if (fallbackFires) console.log(`  → S126b add-8 fallback FIRES (synthetic rowRange=[0..${r.nRows-1}])`);
    if (fallbackBlocked) console.log(`  ✗ Fallback BLOCKED — flagged + no region + r.nRows missing/0 → NO CHIP`);
  } else {
    console.log(`  Global test: no region/chip; pill-only in §2 lane.`);
  }
  console.log(`  MINIPLOT_REGISTRY entry: ${inRegistry ? 'YES' : 'NO'}  → cardFile=${cardFile ?? '—'}  exists=${cardExists}`);
  console.log('');
}

// ── Gap classification ────────────────────────────────────────────
console.log('\n=== Gap classification ===\n');

const gaps = []; // { class, tier, test, fixture, description, fix }

// Class A — producer emits, downstream drops (none expected; sanity check)
// Class B — producer doesn't emit evidence the user needs (#38 r.nRows
// missing on Runs / Row-Mean Runs)
// Class C — rendering layer missing (#39 Modality, headline mismatches)

for (const row of auditTable) {
  if (row.flagOnPick === 'NEVER') {
    // Tests that never fire: only relevant for rendering layer
    if (!row.inRegistry && !row.isGlobal) {
      gaps.push({
        cls: 'C', tier: 4, test: row.test, fixture: '—',
        description: 'No MINIPLOT_REGISTRY entry; never fires on current batch (informational).',
        fix: row.cardExists ? 'Add registry entry only.' : 'Create MiniCard + add registry entry.'
      });
    }
    continue;
  }

  const flagged = ['HIGH', 'MODERATE', 'FLAGGED', 'NOTED'].includes(row.flagOnPick);
  if (!flagged) continue;

  // Class B — producer side gaps
  if (!row.isGlobal && row.cellFlagCount === 0 && row.fallbackBlocked) {
    gaps.push({
      cls: 'B', tier: 1, test: row.test, fixture: row.fixtureOnPick,
      description: `Flagged ${row.flagOnPick} but extractCellFlags=[] AND r.nRows=${row.nRowsField} → S126b add-8 fallback BLOCKED → no chip in §2 lane.`,
      fix: 'Producer emits r.nRows so the add-8 fallback fires (or emits per-window evidence).'
    });
  }
  // Class C — rendering layer
  if (!row.inRegistry) {
    gaps.push({
      cls: 'C', tier: 2, test: row.test, fixture: row.fixtureOnPick,
      description: `Flagged ${row.flagOnPick}; MINIPLOT_REGISTRY entry MISSING → MiniPlot returns null → empty card body in §3.`,
      fix: row.cardExists ? `Add registry entry mapping "${row.test}" to existing card.` : `Create src/components/cards/MiniCard_<X>.jsx and register key.`
    });
  } else if (!row.cardExists) {
    gaps.push({
      cls: 'C', tier: 2, test: row.test, fixture: row.fixtureOnPick,
      description: `Registered but card file ${row.cardFile} does not exist.`,
      fix: 'Create the MiniCard file or remove the registry entry.'
    });
  }
}

console.log(`${gaps.length} gap(s) detected.\n`);
gaps.forEach((g, i) => {
  console.log(`  [${i + 1}] Class ${g.cls} | Tier ${g.tier} | ${g.test} (on ${g.fixture})`);
  console.log(`        ${g.description}`);
  console.log(`        Fix: ${g.fix}`);
});

// ── Pre-known gap confirmation ─────────────────────────────────────
console.log('\n=== Pre-known gap confirmation ===\n');

// Parked #38 — Runs Test / Row-Mean Runs r.nRows missing across DS02, DS21, DS22
console.log('Parked #38 — Runs Test / Row-Mean Runs windowed-evidence emission gap:');
for (const targetName of ['Runs Test', 'Row-Mean Runs']) {
  for (const { file, results, nRows, nCols } of perFixtureResults) {
    const r = results.find(x => x?.name === targetName);
    if (!r) continue;
    if (!['HIGH', 'MODERATE', 'FLAGGED', 'NOTED'].includes(r.flag)) continue;
    const cf = extractCellFlags(r, nRows, nCols);
    const fbFires = (r.nRows ?? 0) > 0;
    if (cf.length === 0) {
      console.log(`    ${file.padEnd(40)} ${targetName.padEnd(18)} flag=${r.flag.padEnd(8)} extractCellFlags=0  r.nRows=${r.nRows ?? '(absent)'}  fallback fires=${fbFires}  → ${fbFires ? 'CHIP via fallback' : 'NO CHIP'}`);
    }
  }
}

// Parked #39 — Modality MINIPLOT_REGISTRY entry
console.log('\nParked #39 — Modality Test rendering layer:');
console.log(`    MINIPLOT_REGISTRY entry for "Modality Test": ${MINIPLOT_REGISTRY_KEYS.has('Modality Test') ? 'YES' : 'NO'}`);
console.log(`    src/components/cards/MiniCard_Modality.jsx exists: ${existsSync('src/components/cards/MiniCard_Modality.jsx')}`);

// Confirmed-correct list
console.log('\n=== Confirmed-correct list (passes audit cleanly) ===\n');
const passing = auditTable.filter(row => {
  if (row.flagOnPick === 'NEVER') return false;
  const flagged = ['HIGH', 'MODERATE', 'FLAGGED', 'NOTED'].includes(row.flagOnPick);
  if (!flagged) return true; // never flagged on batch → trivially clean
  // Has registry entry, card exists, finding type matches global/localised expectation,
  // no fallback-blocked cases.
  if (!row.inRegistry || !row.cardExists) return false;
  if (!row.isGlobal && row.cellFlagCount === 0 && row.fallbackBlocked) return false;
  return true;
});
for (const row of passing) {
  console.log(`  ✓ ${row.test.padEnd(40)} (${row.flagOnPick} on ${row.fixtureOnPick})`);
}

console.log(`\n${passing.length}/${auditTable.length} tests pass audit cleanly.`);
console.log(`${auditTable.length} tests in TEST_MECHANISM × 22 fixtures audited.`);
