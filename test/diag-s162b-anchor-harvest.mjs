// S162b anchor-harvest. Runs the engine over the 22-fixture batch, captures
// the result objects for the seven chat-picked anchor tests on their named
// fixtures, and writes docs/test-artefacts/S162b-anchor-harvest.md as the
// calibration-sheet input for chat-side prose authoring (Phase B per-test
// composer pass for the §4 prompt body).
//
// The DupDet anchor's fixture is not pre-locked — this script scans all 22
// fixtures for HIGH/MODERATE DupDet results, ranks by forensic richness
// (blockCopies + rowDupGroups + duplicateRows), and picks the top hit. The
// scan summary is dumped at the head of the markdown alongside the chosen
// fixture's full result object.
//
// Read-only on engine, tests, handoffModel.js, promptBodyRenderer.js — this
// script consumes engine output verbatim and writes a markdown artefact.

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');

const FIXTURES = 'test/fixtures';

const CASES = [
  ['01-densitometry-clean.csv',                'densitometry'],
  ['02-densitometry-fabricated.csv',           'densitometry'],
  ['03-qpcr-clean.csv',                        'qpcr'],
  ['04-qpcr-fabricated.csv',                   'qpcr'],
  ['05-cellcount-clean.csv',                   'cell_count'],
  ['06-cellcount-fabricated.csv',              'cell_count'],
  ['07-elisa-clean.csv',                       'elisa'],
  ['08-elisa-fabricated.csv',                  'elisa'],
  ['09-proteomics-clean.csv',                  'proteomics'],
  ['10-proteomics-fabricated.csv',             'proteomics'],
  ['11-rnaseq-multicondition.csv',             'genomics'],
  ['12a-uniform-mixture-clean.csv',            'general'],
  ['12b-uniform-mixture-fabricated.csv',       'general'],
  ['13-vfstest-cellcountest.csv',              'cell_count'],
  ['14-crctest-survey.csv',                    'survey'],
  ['15-missing-carlisle.csv',                  'general'],
  ['16-densitometry-carlisle-overbalanced.csv','densitometry'],
  ['17-densitometry-carlisle-clean.csv',       'densitometry'],
  ['19-inheritance-fabricated.csv',            'general'],
  ['20-bimodal-fab.csv',                       'general'],
  ['21-localised-ar.csv',                      'general'],
  ['22-covariance-block.csv',                  'general'],
];

// Anchor set + fixture mapping. DupDet's fixture is filled in after the scan
// pass below. Canonical names resolved against mechanisms.js:TEST_MECHANISM.
const ANCHORS = [
  { test: "LOESS Residual Analysis",     fixture: "08-elisa-fabricated.csv",        label: "LOESS + CUSUM" },
  { test: "Benford's Law (First Digit)", fixture: "08-elisa-fabricated.csv",        label: "Benford 1st" },
  { test: "Inter-Replicate Correlation", fixture: "08-elisa-fabricated.csv",        label: "Inter-Replicate Correlation (IRC)" },
  { test: "Selective Noise Partitioning", fixture: "08-elisa-fabricated.csv",       label: "Selective Noise Partitioning" },
  { test: "Mahalanobis Row Outlier",     fixture: "08-elisa-fabricated.csv",        label: "Mahalanobis Row Outlier" },
  { test: "Exact Duplicate Detection",   fixture: null,                              label: "Exact Duplicate Detection (DupDet)" },
  { test: "Baseline Balance",            fixture: "16-densitometry-carlisle-overbalanced.csv", label: "Baseline Balance (Carlisle)" },
];

function dsLabel(file) {
  const m = file.match(/^(\d+[a-z]?)/);
  return m ? `DS${m[1]}` : file;
}

async function runFixture(file, assay) {
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
    data, roles, condPerCol, zeroAsMissing: false,
  });
  const vst = detectVST(matrix, assay);
  const dataType = assay === 'survey' ? 'survey' : (assay === 'cell_count' ? 'count' : 'continuous');
  const lfDet = detectLongFormat(headers, data);
  const rsSuggestion = suggestRowSemantics({ assay, longFormatDetected: !!lfDet });
  const rowSemantics = rsSuggestion.value || 'ordered';
  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics,
  );
  return { results, nRows: matrix.length, nCols: matrix[0]?.length || 0 };
}

// ── Phase 1: scan all 22 fixtures, find DupDet HIGH/MOD richness. ─────────
console.log('── Phase 1: DupDet scan across 22 fixtures ──\n');

const dupDetSummaries = [];
const allResults = new Map(); // file → results array, cached for Phase 2 reuse

for (const [file, assay] of CASES) {
  const { results, nRows, nCols } = await runFixture(file, assay);
  allResults.set(file, { results, nRows, nCols, assay });
  const dd = results.find(r => r.name === "Exact Duplicate Detection");
  if (!dd) continue;
  const blockCopies = Array.isArray(dd.blockCopies) ? dd.blockCopies.length : 0;
  const rowDupGroups = Array.isArray(dd.rowDupGroupList) ? dd.rowDupGroupList.length : 0;
  const duplicateRows = typeof dd.duplicateRows === 'number' ? dd.duplicateRows : 0;
  const withinRowLocs = Array.isArray(dd.withinRowLocs) ? dd.withinRowLocs.length : 0;
  const richness = blockCopies + rowDupGroups + Math.min(duplicateRows, 20);
  dupDetSummaries.push({
    file, flag: dd.flag, primaryP: dd.primaryP,
    blockCopies, rowDupGroups, duplicateRows, withinRowLocs, richness,
  });
  console.log(
    `  ${file}: flag=${dd.flag} ` +
    `blockCopies=${blockCopies} rowDupGroups=${rowDupGroups} ` +
    `duplicateRows=${duplicateRows} withinRowLocs=${withinRowLocs} richness=${richness}`
  );
}

// Pick richest HIGH; if no HIGH, fall back to richest MODERATE.
const highCandidates = dupDetSummaries.filter(s => s.flag === 'HIGH');
const modCandidates = dupDetSummaries.filter(s => s.flag === 'MODERATE');
const pool = highCandidates.length > 0 ? highCandidates : modCandidates;
pool.sort((a, b) => b.richness - a.richness);
const chosen = pool[0];

if (!chosen) {
  console.error('\n✗ No HIGH or MODERATE DupDet found across batch — anchor harvest cannot proceed for DupDet.');
  process.exit(1);
}

console.log(`\n→ DupDet anchor fixture: ${chosen.file} (flag=${chosen.flag}, richness=${chosen.richness})`);

// Patch DupDet anchor with chosen fixture.
ANCHORS.find(a => a.test === "Exact Duplicate Detection").fixture = chosen.file;

// ── Phase 2: harvest result objects + Phase A comparison strings. ─────────
console.log('\n── Phase 2: anchor harvest ──\n');

// Stable JSON.stringify — sorts keys so the harvest is diff-friendly.
function stableStringify(obj, indent = 2) {
  const seen = new WeakSet();
  function replacer(key, value) {
    if (typeof value === 'number') {
      if (Number.isNaN(value)) return 'NaN';
      if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    }
    if (value && typeof value === 'object') {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
      if (!Array.isArray(value)) {
        const sorted = {};
        for (const k of Object.keys(value).sort()) sorted[k] = value[k];
        return sorted;
      }
    }
    return value;
  }
  return JSON.stringify(obj, replacer, indent);
}

// Pull the Phase A testLocalisation summary mirroring handoffModel.js's
// locationOf(r). Reproduced inline so the harvest doc shows exactly the
// "Phase A location" string the §4 prompt body emits today.
function phaseALocation(r) {
  if (Array.isArray(r.blockCopies) && r.blockCopies.length) {
    const n = r.blockCopies.length;
    return `${n} block${n > 1 ? 's' : ''}`;
  }
  if (Array.isArray(r.rowDupGroupList) && r.rowDupGroupList.length) {
    const n = r.rowDupGroupList.length;
    return `${n} duplicate group${n > 1 ? 's' : ''}`;
  }
  if (Array.isArray(r.details) && r.details.length && r.details[0]?.rows) {
    const n = r.details.length;
    return `${n} region${n > 1 ? 's' : ''}`;
  }
  if (Array.isArray(r.details) && r.details.length && r.details[0]?.Row !== undefined) {
    const n = r.details.length;
    return `${n} row${n > 1 ? 's' : ''}`;
  }
  return "Global";
}

const sections = [];

for (const anchor of ANCHORS) {
  const fileEntry = allResults.get(anchor.fixture);
  if (!fileEntry) {
    sections.push(`## ${anchor.label} — ${dsLabel(anchor.fixture)} (${anchor.fixture})\n\n*Fixture not in batch.*`);
    continue;
  }
  const { results, nRows, nCols, assay } = fileEntry;
  const r = results.find(x => x.name === anchor.test);
  if (!r) {
    sections.push(
      `## ${anchor.label} — ${dsLabel(anchor.fixture)} (${anchor.fixture})\n\n` +
      `*No result object for "${anchor.test}" — test did not run on this fixture.*`
    );
    continue;
  }

  const interpretation = typeof r.interpretation === 'string' ? r.interpretation : '(none)';
  const phaseALoc = phaseALocation(r);

  console.log(`  ${anchor.label}: ${anchor.fixture} → flag=${r.flag}, primaryP=${r.primaryP}`);

  sections.push(
    `## ${anchor.label} — ${dsLabel(anchor.fixture)} (${anchor.fixture})\n\n` +
    `- Fixture: ${anchor.fixture}\n` +
    `- Assay: ${assay}\n` +
    `- Shape: ${nRows} rows × ${nCols} columns\n` +
    `- Canonical test name: \`${anchor.test}\`\n` +
    `- Flag: **${r.flag}**\n` +
    `- primaryP: ${JSON.stringify(r.primaryP)}\n` +
    `- Phase A location string: \`${phaseALoc}\`\n` +
    `- Phase A interpretation: ${interpretation === '(none)' ? '*(no interpretation field)*' : `\n\n  > ${interpretation.replace(/\n/g, '\n  > ')}`}\n\n` +
    `**Full result object:**\n\n` +
    '```json\n' + stableStringify(r) + '\n```'
  );
}

// ── Output markdown ───────────────────────────────────────────────────────

const scanTable = [
  '| Fixture | flag | blockCopies | rowDupGroups | duplicateRows | withinRowLocs | richness |',
  '|---|---|---|---|---|---|---|',
  ...dupDetSummaries.map(s =>
    `| ${s.file} | ${s.flag} | ${s.blockCopies} | ${s.rowDupGroups} | ${s.duplicateRows} | ${s.withinRowLocs} | ${s.richness} |`
  ),
].join('\n');

const HEADER = `# S162b anchor harvest

Generated by [test/diag-s162b-anchor-harvest.mjs](../../test/diag-s162b-anchor-harvest.mjs). Rerun the script to refresh.

## What this is

Input artefact for Chat's per-test prose authoring (S162b calibration sheet). For each of the seven anchor tests Chat picked, this document dumps the full engine result object on the fixture that fires the test cleanly, alongside the test's existing Phase A interpretation + testLocalisation strings. Chat reads the field-by-field detail here and authors compact statistical statements with units for \`Finding.location\` + \`Finding.evidenceLines\` in the §4 prompt body.

## Anchor set

- LOESS + CUSUM — DS08 (existing locked fragment; refresh numbers)
- Benford 1st — DS08 (existing locked fragment; refresh numbers)
- IRC — DS08 (existing locked fragment; refresh numbers)
- Selective Noise — DS08 (per-column ratio shape)
- Mahalanobis Row Outlier — DS08 (per-row shape; S162a confirmed row 17)
- DupDet — fixture chosen by richness scan (below)
- Baseline Balance (Carlisle) — DS16 (no-per-element-detail shape)

## DupDet fixture selection

22-fixture scan ranked by forensic richness (\`blockCopies.length + rowDupGroupList.length + min(duplicateRows, 20)\`). HIGH-flagged fixtures preferred; falls back to MODERATE if no HIGH fires.

${scanTable}

**Chosen fixture:** ${chosen.file} (flag=${chosen.flag}, richness=${chosen.richness}).

---

`;

writeFileSync(
  'docs/test-artefacts/S162b-anchor-harvest.md',
  HEADER + sections.join('\n\n---\n\n') + '\n'
);

console.log('\n✓ wrote docs/test-artefacts/S162b-anchor-harvest.md');
