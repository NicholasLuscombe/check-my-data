// S374 P155 instrument — renders the §4 AI hand-off prompt for all 27 fixtures
// through the REAL product path and captures it for before/after comparison.
//
// The path is `buildHandoffModel(results, importConfig, nRows, nCols)` then
// `renderPromptBody(model)` — the same two calls ReportView makes. It is
// deliberately NOT `composeFinding` with a hand-built context: that
// substitution is exactly what made `diag-s162b-anchor-lock.mjs` blind to the
// context the mapper travels in, and repeating it would measure nothing.
//
// Artefacts written to <outdir>:
//   prompts.txt        every fixture's rendered prompt, concatenated — diff target
//   index.tsv          per fixture: skippedRows, headerRows, offset, severity, rendered?
//   probe.tsv          per finding: composer, location, evidence lines (one row per string)
//   perturbed.tsv      the same strings, re-rendered with a perturbed importConfig
//   perturb-report.txt per string: INVARIANT, or the integer deltas it moved by
//
// Perturbation control. The parse is held fixed and only the importConfig
// handed to buildHandoffModel is changed: headerRows + PERTURB_HDR and
// skippedRows + PERTURB_SKIP. Those two fields reach nothing but the row
// mapper, so the control isolates it completely.
//
// The shipped mapper is `makeRowMapper` in components/shared/coordinates.js:
//   originalFileRow(i, skip, hdr) = i + skip + hdr + 1
//   toFileRow(n) = originalFileRow(n - 1, skip, hdr) = n + skip + hdr
// so the offset is the SUM of the two, not their difference, and the expected
// delta under perturbation is PERTURB_HDR + PERTURB_SKIP. Every fixture in the
// corpus has skippedRows = 0, so on the corpus alone a sum and a difference are
// indistinguishable — which is the whole reason this control exists.
//
// Usage: node test/probes/probe-s374-prompt-corpus.mjs <outdir>

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const PERTURB_HDR = 100;
const PERTURB_SKIP = 40;
const EXPECTED_DELTA = PERTURB_HDR + PERTURB_SKIP;

const OUT = process.argv[2];
if (!OUT) { console.error('usage: probe-s374-prompt-corpus.mjs <outdir>'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../../src/analysis/engine.js');
const { computeSeverity } = await import('../../src/analysis/severity.js');
const { detectVST } = await import('../../src/stats/vst.js');
const { inferRoles } = await import('../../src/import/roles.js');
const { summarize } = await import('../../src/import/summary.js');
const { ASSAY_DATATYPE_MAP } = await import('../../src/constants/assays.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../../src/import/parser.js');
const { detectLongFormat } = await import('../../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../../src/import/rowSemantics.js');
const { buildHandoffModel } = await import('../../src/analysis/handoffModel.js');
const { renderPromptBody } = await import('../../src/analysis/promptBodyRenderer.js');
const { EXPECTED } = await import('../batch-fixtures.mjs');

const FIXTURES = 'test/fixtures';

// The eight composers Part 2 scoped as printing a row coordinate. Membership is
// used only to label the report — the check itself is per string.
const MAPPING = new Set([
  'LOESS Residual Analysis', 'Mahalanobis Row Outlier', 'Within-Row Variance',
  'Constant-Offset Blocks', 'Windowed Autocorrelation', 'Missing Data Pattern',
  'Blocked Mahalanobis', 'Regional Noise Homogeneity',
]);
const INVARIANT = new Set([
  'Exact Duplicate Detection', 'Residual Spike Correlation', 'Sequential Duplication',
]);

const promptChunks = [];
const indexRows = ['fixture\tskippedRows\theaderRows\toffset\tseverity\tpromptRendered'];
const probeRows = ['fixture\tcomposer\tkind\tstring'];
const perturbRows = ['fixture\tcomposer\tkind\tstring'];
const report = [];
const descLines = [];

function stringsOf(model) {
  const out = [];
  for (const bucket of ['high', 'moderate']) {
    for (const f of (model.findings?.[bucket] || [])) {
      out.push({ composer: f.testName, kind: `${bucket}/location`, s: f.location });
      f.evidenceLines.forEach((l, i) =>
        out.push({ composer: f.testName, kind: `${bucket}/evidence[${i}]`, s: l }));
    }
  }
  return out;
}

// All integers in a string, in order, with their positions — so a comparison can
// report which numbers moved and by how much rather than only that it differs.
const ints = s => (s.match(/\d+/g) || []).map(Number);

for (const [file, expected] of Object.entries(EXPECTED)) {
  const csv = readFileSync(join(FIXTURES, file), 'utf-8');
  const parsed = Papa.default.parse(csv, { skipEmptyLines: true });
  const pp = preprocessRaw(parsed.data);
  const raw = pp.rows;
  const skippedRows = pp.skippedRows || 0;
  const headerRows = detectHeaderRows(raw);
  const condPerCol = headerRows >= 2 ? forwardFill(raw[0]) : null;
  const headers = raw[headerRows - 1];
  const data = raw.slice(headerRows);
  const roles = inferRoles(data, headers, condPerCol);
  const assay = expected.assay;
  const { matrix, rawMatrix, condCtx } = extractAnalysisInputs({
    data, roles, condPerCol, zeroAsMissing: false,
  });
  const vst = detectVST(matrix, assay);
  const dataType = ASSAY_DATATYPE_MAP[assay] || 'continuous';
  const lfDet = detectLongFormat(headers, data);
  const rowSemantics = suggestRowSemantics({ assay, longFormatDetected: !!lfDet }).value || 'ordered';

  const results = await runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics,
  );
  const { severity } = computeSeverity(results);

  // Engine-level control. This fix lives entirely downstream of the engine —
  // nothing in src/analysis/engine.js or src/tests/ imports handoffModel or
  // findingComposers — so every `description` must be byte-identical. Dumped
  // here rather than in a second instrument so it rides the same engine run.
  for (const r of results) descLines.push(`${file}\t${r.name}\t${JSON.stringify(r.description ?? null)}`);

  const summary = summarize(data, roles, condPerCol, false);
  const nRows = matrix.length;
  const nCols = matrix[0]?.length || 0;
  const importConfig = {
    fileName: file, assay, dataType, vst, summary,
    skippedRows, headerRows, hdrs: headers,
  };

  const model = buildHandoffModel(results, importConfig, nRows, nCols);
  const body = renderPromptBody(model);
  const offset = skippedRows + headerRows;

  indexRows.push([file, skippedRows, headerRows, offset, severity, body ? 'yes' : 'no'].join('\t'));
  promptChunks.push(
    `\n${'='.repeat(78)}\n### ${file}  (skippedRows=${skippedRows} headerRows=${headerRows} offset=${offset} severity=${severity})\n${'='.repeat(78)}\n` +
    (body ?? '(renderPromptBody returned null — outcome tier 0)') + '\n'
  );

  const pModel = buildHandoffModel(
    results,
    { ...importConfig, headerRows: headerRows + PERTURB_HDR, skippedRows: skippedRows + PERTURB_SKIP },
    nRows, nCols,
  );

  const base = stringsOf(model);
  const pert = stringsOf(pModel);
  for (const x of base) probeRows.push([file, x.composer, x.kind, x.s].join('\t'));
  for (const x of pert) perturbRows.push([file, x.composer, x.kind, x.s].join('\t'));

  if (base.length !== pert.length) {
    report.push(`${file}\tSTRING-COUNT-CHANGED\t${base.length} → ${pert.length}`);
    continue;
  }
  for (let i = 0; i < base.length; i++) {
    const cls = MAPPING.has(base[i].composer) ? 'map'
      : INVARIANT.has(base[i].composer) ? 'inv' : 'other';
    if (base[i].s === pert[i].s) {
      report.push(`${file}\t${cls}\t${base[i].composer}\t${base[i].kind}\tINVARIANT`);
      continue;
    }
    const a = ints(base[i].s), b = ints(pert[i].s);
    if (a.length !== b.length) {
      report.push(`${file}\t${cls}\t${base[i].composer}\t${base[i].kind}\tINT-COUNT-CHANGED ${a.length} → ${b.length}`);
      continue;
    }
    const moved = a.map((v, j) => [v, b[j]]).filter(([x, y]) => x !== y);
    const deltas = [...new Set(moved.map(([x, y]) => y - x))];
    const ok = deltas.length === 1 && deltas[0] === EXPECTED_DELTA;
    report.push(`${file}\t${cls}\t${base[i].composer}\t${base[i].kind}\t${ok ? 'MOVED-OK' : 'MOVED-UNEXPECTED'} deltas=${deltas.join(',')} n=${moved.length}`);
  }
}

writeFileSync(join(OUT, 'prompts.txt'), promptChunks.join(''));
writeFileSync(join(OUT, 'index.tsv'), indexRows.join('\n') + '\n');
writeFileSync(join(OUT, 'probe.tsv'), probeRows.join('\n') + '\n');
writeFileSync(join(OUT, 'perturbed.tsv'), perturbRows.join('\n') + '\n');
writeFileSync(join(OUT, 'perturb-report.txt'), report.join('\n') + '\n');
writeFileSync(join(OUT, 'descriptions.txt'), descLines.join('\n') + '\n');

const tally = k => report.filter(l => l.includes(`\t${k}`)).length;
const cls = c => report.filter(l => l.split('\t')[1] === c);
console.log(`fixtures: ${Object.keys(EXPECTED).length}   prompts rendered: ${indexRows.filter(l => l.endsWith('yes')).length}`);
console.log(`strings captured: ${probeRows.length - 1}`);
console.log(`perturbation: headerRows +${PERTURB_HDR}, skippedRows +${PERTURB_SKIP} → expected delta ${EXPECTED_DELTA}`);
console.log(`  mapping-composer strings:   ${cls('map').length}  (moved-ok ${cls('map').filter(l => l.includes('MOVED-OK')).length}, invariant ${cls('map').filter(l => l.includes('\tINVARIANT')).length}, unexpected ${cls('map').filter(l => l.includes('UNEXPECTED') || l.includes('CHANGED')).length})`);
console.log(`  invariant-composer strings: ${cls('inv').length}  (invariant ${cls('inv').filter(l => l.includes('\tINVARIANT')).length}, moved ${cls('inv').filter(l => !l.includes('\tINVARIANT')).length})`);
console.log(`  all other composers:        ${cls('other').length}  (invariant ${cls('other').filter(l => l.includes('\tINVARIANT')).length}, moved ${cls('other').filter(l => !l.includes('\tINVARIANT')).length})`);
console.log(`written to ${OUT}`);
