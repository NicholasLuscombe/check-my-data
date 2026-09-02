/* S404 Part 9 — run the shipped battery over a directory of generated files and
 * dump WHICH TESTS FIRED, plus Exact Duplicate Detection's five ARM p-values.
 *
 * WHY THIS EXISTS RATHER THAN `corpus-run.mjs`. That runner keeps only
 * `{name, flag, primaryP}` per test (scripts/corpus-run.mjs:321-330), so
 * `_rawPs` — the five sub-test p-values Duplicate Detection publishes at
 * duplicateDetection.js:829 — never reaches the artifact. The census recorded
 * Test 1 pooling every cell into one frequency table and feeding
 * `min(bhFDR(rawPs))` (:807-809), so ONE arm can drive the whole verdict, and
 * the verdict alone cannot say which. That distinction decides whether a repair
 * is a gate on one arm or a rewrite of it.
 *
 * THE PREP IS THE SHIPPED PREP. `prepStructure` and `buildAnalysisConfig` come
 * from scripts/corpus-run.mjs through the S395 load-time hook, so this probe
 * analyses each file exactly as arm A does. Nothing is reimplemented.
 *
 * Run:
 *   node --import ./test/probes/s395-corpus-run-hook.mjs \
 *        test/probes/probe-s404-arms.mjs <dir-of-csvs>
 */
import { readdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import Papa from 'papaparse';

import * as CR from '../../scripts/corpus-run.mjs';
import { extractAnalysisInputs, runFullAnalysis } from '../../src/analysis/engine.js';
import { computeSeverity } from '../../src/analysis/severity.js';
import { detectVST } from '../../src/stats/vst.js';

const DIR = process.argv[2];
if (!DIR) { console.error('usage: probe-s404-arms.mjs <dir-of-csvs>'); process.exit(2); }

/* The five arms, in the order duplicateDetection.js:807 builds them. */
const ARM = ['collision(T1,pooled)', 'rowDup(T2)', 'withinRow(T3)', 'block(T4)', 'partialRow(T5)'];

const files = readdirSync(DIR).filter(f => f.endsWith('.csv')).sort();
const out = [];

for (const f of files) {
  const path = join(DIR, f);
  const label = basename(f, '.csv');
  const raw = Papa.parse(readFileSync(path, 'utf-8'), { header: false, skipEmptyLines: false }).data;

  let rec;
  try {
    const s = CR.prepStructure(raw, null);
    const { config, assay, dataType, rowSemantics } =
      CR.buildAnalysisConfig({ entry: { path }, hdrs: s.hdrs, data: s.data,
                               condPerCol: s.condPerCol, roles: s.roles,
                               longFormatDetected: s.longFormatDetected });
    const { matrix, rawMatrix, condCtx } = extractAnalysisInputs(config);
    const vst = detectVST(matrix, assay);
    const results = await runFullAnalysis(
      matrix, rawMatrix, condCtx, assay, null, vst,
      { isPivoted: false }, dataType, rowSemantics);
    const sev = computeSeverity(results);
    const dup = results.find(r => r.name === 'Exact Duplicate Detection');
    rec = {
      label,
      severity: sev.severity, high: sev.high, mod: sev.mod,
      rowSemantics, assay,
      fired: results.filter(r => r.flag === 'HIGH' || r.flag === 'MODERATE')
                    .map(r => ({ n: r.name, f: r.flag, p: r.primaryP })),
      dupFlag: dup ? dup.flag : null,
      dupArms: dup && dup._rawPs ? dup._rawPs : null,
    };
  } catch (e) {
    rec = { label, error: e.message };
  }
  out.push(rec);

  if (rec.error) { console.log(`${label.padEnd(30)} ERROR ${rec.error}`); continue; }
  const names = rec.fired.map(x => x.n).join(', ');
  console.log(`${label.padEnd(30)} sev ${rec.severity} H=${rec.high} M=${rec.mod}  ${names || '(nothing fired)'}`);
  if (rec.dupArms) {
    const armStr = rec.dupArms.map((p, i) => `${ARM[i]}=${p == null ? 'null' : p.toExponential(2)}`).join('  ');
    console.log(`${' '.repeat(30)}   DupDet ${rec.dupFlag}: ${armStr}`);
  }
}

console.log('\n' + JSON.stringify(out));
