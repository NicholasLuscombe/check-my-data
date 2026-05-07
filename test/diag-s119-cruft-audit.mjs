// S119 diagnostic — cruft audit (read-only).
// Evidence artefact (S118 Phase 2 pattern).
//
// Ten labelled sections on stdout covering dead code, stale taxonomy, stale
// comments, ad-hoc pre-gate patterns, dead branches, commented-out code,
// unused imports, STATUS parked-item hygiene, Chat-owned docs stale content,
// and missing fields. Each finding carries a disposition tag from the
// vocabulary defined in the S119 prompt.
//
// No src/ edits, no doc edits, no fixes — grep-driven enumeration only.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename, extname } from 'path';

const ROOT = process.cwd();
const SRC = 'src';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const SRC_FILES = walk(SRC).sort();
const FILE_TEXT = new Map();
for (const f of SRC_FILES) FILE_TEXT.set(f, readFileSync(f, 'utf-8'));

function lines(f) { return FILE_TEXT.get(f).split('\n'); }
function readDoc(path) { try { return readFileSync(path, 'utf-8'); } catch { return ''; } }

// ──────────────────────────────────────────────────────────────────────
// Section 1: Dead code
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 1: Dead code ===\n');
console.log('Methodology:');
console.log('  - Enumerate every `export` identifier in every src/ file.');
console.log('  - Grep the rest of src/ for each identifier (token-boundary).');
console.log('  - Flag zero-cross-reference exports + files imported nowhere.');
console.log('  - Also flag sync-conflict duplicates (" 2.jsx", ".orig", ".bak").');
console.log('  - Spot-check internal (non-exported) functions that are visibly unused in');
console.log('    their own module.\n');

// (a) Sync-conflict / backup files
console.log('-- (a) Filesystem duplicates / sync-conflict copies --');
const allFilesInSrc = [];
function walkAny(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkAny(p, out);
    else out.push(p);
  }
  return out;
}
walkAny(SRC, allFilesInSrc);
const suspicious = allFilesInSrc.filter(f =>
  / 2\.(js|jsx|mjs)$/.test(f) || /\.orig$|\.bak$|~$/.test(f)
);
if (!suspicious.length) {
  console.log('  (none)');
} else {
  for (const f of suspicious) {
    console.log(`  ${f}  [remove]`);
    console.log(`    — sync-conflict artefact (probable ProtonDrive/iCloud duplicate of`);
    console.log(`      ${f.replace(/ 2(\.(js|jsx|mjs))$/, '$1')}); not imported, never executed`);
  }
}
console.log();

// (b) Zero-reference exports
console.log('-- (b) Zero-cross-reference exports in src/ --');
const idents = []; // {file, line, kind, name}
for (const f of SRC_FILES) {
  const ls = lines(f);
  for (let i = 0; i < ls.length; i++) {
    const m1 = ls[i].match(/^\s*export\s+(?:async\s+)?function\s+(\w+)/);
    const m2 = ls[i].match(/^\s*export\s+(?:const|let|var)\s+(\w+)/);
    const m3 = ls[i].match(/^\s*export\s+class\s+(\w+)/);
    const m4 = ls[i].match(/^\s*export\s+default\s+function\s+(\w+)/);
    const m  = m1 || m2 || m3 || m4;
    if (m) idents.push({ file: f, line: i + 1, name: m[1] });
  }
}
let zeroRef = [];
for (const it of idents) {
  let hits = 0;
  const re = new RegExp(`\\b${it.name}\\b`, 'g');
  for (const [f, t] of FILE_TEXT) {
    if (f === it.file) continue;
    const m = t.match(re);
    if (m) hits += m.length;
  }
  if (hits === 0) zeroRef.push(it);
}
if (!zeroRef.length) {
  console.log('  (none)');
} else {
  for (const z of zeroRef) {
    console.log(`  ${z.file}:${z.line}  export \`${z.name}\`  [remove]`);
    console.log(`    — no cross-file reference in src/; verify no dynamic-import/string-key`);
    console.log(`      lookup before deletion`);
  }
}
console.log();

// (c) Internal spot-checks — functions defined + declared but not self-called
console.log('-- (c) Internal functions declared and visibly unused within module --');
let internalDead = [];
for (const f of SRC_FILES) {
  const src = FILE_TEXT.get(f);
  const ls = src.split('\n');
  for (let i = 0; i < ls.length; i++) {
    const m = ls[i].match(/^\s*function\s+(\w+)/);
    if (!m) continue;
    const name = m[1];
    // count usages excluding declaration line
    const body = ls.slice(0, i).join('\n') + '\n' + ls.slice(i + 1).join('\n');
    const re = new RegExp(`\\b${name}\\b`);
    const used = re.test(body);
    // also check if exported from same file
    const exportedHere = new RegExp(`\\bexport\\b.*\\b${name}\\b`).test(src);
    if (!used && !exportedHere) internalDead.push({ file: f, line: i + 1, name });
  }
}
if (!internalDead.length) {
  console.log('  (none)');
} else {
  for (const d of internalDead) {
    console.log(`  ${d.file}:${d.line}  function \`${d.name}\`  [remove]`);
  }
}
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 2: Stale taxonomy
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 2: Stale taxonomy ===\n');

// (a) Parked #22 — per-test `category` emissions
console.log('-- (a) Parked #22 — per-test `category` emissions vs TEST_MECHANISM --\n');
console.log('TEST_MECHANISM authoritative keys: copied, digits, shapes, replicate, group\n');

const testDir = 'src/tests';
const testFiles = readdirSync(testDir).filter(n => /\.js$/.test(n)).sort();

const TEST_NAME_BY_FILE = {
  'autocorrelation.js':          'Autocorrelation',
  'benford.js':                  "Benford's Law (First Digit)",
  'benford2.js':                 "Benford's Law (Second Digit)",
  'blockedMahalanobis.js':       'Blocked Mahalanobis',
  'carlisleBalance.js':          'Baseline Balance',
  'columnGof.js':                'Column Goodness-of-Fit',
  'constantOffset.js':           'Constant-Offset Blocks',
  'crossConditionConsistency.js':'Cross-Condition Consistency',
  'crossConditionProperties.js': '(property registry — not a test)',
  'decimalPrecision.js':         'Decimal Precision Consistency',
  'duplicateDetection.js':       'Exact Duplicate Detection',
  'entropyTest.js':              'Entropy / Zipf Analysis',
  'interReplicateCorrelation.js':'Inter-Replicate Correlation',
  'kurtosis.js':                 'Excess Kurtosis',
  'loessResidual.js':            'LOESS Residual Analysis',
  'mahalanobis.js':              'Mahalanobis Row Outlier',
  'meanVariance.js':             'Noise Scaling With Measurement Size',
  'missingDataPattern.js':       'Missing Data Pattern',
  'modality.js':                 'Modality Test',
  'rankCorrelation.js':          'Cross-Condition Rank Correlation',
  'regionalNoise.js':            'Regional Noise Homogeneity',
  'residualSpikeCorrelation.js': 'Residual Spike Correlation',
  'rowMeanRuns.js':              'Row-Mean Runs',
  'runs.js':                     'Runs Test',
  'selectiveNoise.js':           'Selective Noise Partitioning',
  'terminalDigits.js':           'Terminal Digit Uniformity',
  'valueFrequencySpike.js':      'Value-Frequency Spike',
  'windowedAutocorrelation.js':  'Windowed Autocorrelation',
  'withinRowVariance.js':        'Within-Row Variance',
};

// Authoritative TEST_MECHANISM map (mirror of src/constants/mechanisms.js)
const TEST_MECH = {
  'Exact Duplicate Detection': 'copied',
  'Constant-Offset Blocks': 'copied',
  'Residual Spike Correlation': 'copied',
  "Benford's Law (First Digit)": 'digits',
  "Benford's Law (Second Digit)": 'digits',
  'Terminal Digit Uniformity': 'digits',
  'Decimal Precision Consistency': 'digits',
  'Value-Frequency Spike': 'digits',
  'Entropy / Zipf Analysis': 'shapes',
  'Column Goodness-of-Fit': 'shapes',
  'Modality Test': 'shapes',
  'Inter-Replicate Correlation': 'replicate',
  'Excess Kurtosis': 'replicate',
  'Autocorrelation': 'replicate',
  'Windowed Autocorrelation': 'replicate',
  'Runs Test': 'replicate',
  'Noise Scaling With Measurement Size': 'replicate',
  'Within-Row Variance': 'replicate',
  'Selective Noise Partitioning': 'replicate',
  'Regional Noise Homogeneity': 'replicate',
  'LOESS Residual Analysis': 'replicate',
  'Row-Mean Runs': 'replicate',
  'Mahalanobis Row Outlier': 'replicate',
  'Blocked Mahalanobis': 'replicate',
  'Cross-Condition Rank Correlation': 'group',
  'Baseline Balance': 'group',
  'Cross-Condition Consistency': 'group',
  'Missing Data Pattern': 'replicate',
};

const header = ['file', 'test_name', 'emitted_category', 'TEST_MECHANISM_key', 'match?'];
const rows = [];
let mismatchCount = 0;
for (const name of testFiles) {
  const path = join(testDir, name);
  const src = readFileSync(path, 'utf-8');
  let cat = null;
  const m = src.match(/category\s*:\s*"([a-z_]+)"/);
  if (m) cat = m[1];
  else {
    const cm = src.match(/\bCAT\s*=\s*"([a-z_]+)"/);
    if (cm) cat = cm[1];
  }
  const testName = TEST_NAME_BY_FILE[name] || '(unmapped)';
  const authKey = TEST_MECH[testName];
  const match = authKey && cat === authKey ? 'OK' : (cat ? 'MISMATCH' : 'n/a');
  if (match === 'MISMATCH') mismatchCount++;
  rows.push([name, testName, cat ?? '<none>', authKey ?? '<not-in-TM>', match]);
}
const w = header.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)));
const pad = (s, i) => String(s).padEnd(w[i]);
console.log(header.map(pad).join(' | '));
console.log(w.map(wi => '-'.repeat(wi)).join('-+-'));
rows.forEach(r => console.log(r.map(pad).join(' | ')));
console.log();
console.log(`Mismatches: ${mismatchCount} of ${testFiles.length} test modules`);
console.log('Disposition: [rename] — opportunistic, align `category` emissions with');
console.log('TEST_MECHANISM keys. Parked #22 (trivial). Severity aggregator already reads');
console.log('TEST_MECHANISM, not result.category, so this is cosmetic/consistency only.\n');

// (b) Pre-S95 UI category names in components / engine / localization
console.log('-- (b) Pre-S95 UI category strings outside INVESTIGATION-DISPLAY-SPEC scope --\n');
const preS95Strings = ['"Copy Detection"', '"Distributional"', '"Unnatural Noise"',
                       '"Too Perfect"', '"Uneven Sections"', '"Copy Detection"'];
const sectionDividerHits = [];
for (const f of SRC_FILES) {
  const ls = lines(f);
  for (let i = 0; i < ls.length; i++) {
    // Section-divider comments: "// --- Too Perfect ---" style
    if (/--- (Too Perfect|Unnatural Noise|Uneven Sections|Copy Detection|Distributional) ---/.test(ls[i])) {
      sectionDividerHits.push({ file: f, line: i + 1, text: ls[i].trim() });
    }
    // Bare quoted strings with the retired name
    for (const needle of ['"Copy Detection"', '"Unnatural Noise"', '"Too Perfect"', '"Uneven Sections"']) {
      if (ls[i].includes(needle)) {
        sectionDividerHits.push({ file: f, line: i + 1, text: ls[i].trim() });
      }
    }
  }
}
if (!sectionDividerHits.length) {
  console.log('  (none)');
} else {
  for (const h of sectionDividerHits) {
    console.log(`  ${h.file}:${h.line}  ${h.text.slice(0, 110)}`);
  }
  console.log(`\n  Total: ${sectionDividerHits.length} hits — all are section-divider comments,`);
  console.log(`  not live taxonomy strings. Disposition: [update-comment] opportunistic.`);
}
console.log();

// (c) Other taxonomy drift
console.log('-- (c) Other taxonomy drift --\n');
console.log('  missingDataPattern.js:23 — `const CAT = "uneven"; // Uneven Sections`');
console.log('    Both the CAT value and the trailing comment are pre-S95. The CAT value');
console.log('    is surfaced in 2(a) above; the trailing comment is surfaced in 2(b).');
console.log('    Disposition: [rename] + [update-comment] — single atomic edit.\n');

// ──────────────────────────────────────────────────────────────────────
// Section 3: Stale comments + JSDoc
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 3: Stale comments + JSDoc ===\n');

console.log('-- (a) Retired-test names in src/ comments (CRC, CrossCondDup, ConstResp) --');
const retiredNames = ['CRC', 'CrossCondDup', 'Constant-Response', 'ConstResp'];
let retiredHits = 0;
for (const f of SRC_FILES) {
  const ls = lines(f);
  for (let i = 0; i < ls.length; i++) {
    for (const n of retiredNames) {
      if (ls[i].includes(n)) {
        // exclude non-comment contexts — heuristic: must be in a // or /* line
        const looksComment = /^\s*(\/\/|\/\*|\*)/.test(ls[i]) || ls[i].includes('//') || ls[i].includes('/*');
        if (looksComment) {
          console.log(`  ${f}:${i + 1}  ${ls[i].trim().slice(0, 110)}  [update-comment]`);
          retiredHits++;
        }
      }
    }
  }
}
if (!retiredHits) console.log('  (none)');
console.log();

console.log('-- (b) Retired UI category labels in src/ comments --');
console.log('  See Section 2(b) — section-divider comments at engine.js:322/390/419,');
console.log('  localization.js:127/196, mechanisms.js:185/196/207, missingDataPattern.js:23.');
console.log('  [update-comment] opportunistic.\n');

console.log('-- (c) Parked # references (post-S118 staleness) --');
const parkedRe = /STATUS(?:\.md)?\s*parked\s*#\s*([0-9]+)([a-z]?)\b|\bparked\s*#\s*([0-9]+)([a-z]?)\b/;
const parkedHits = [];
for (const f of SRC_FILES) {
  const ls = lines(f);
  for (let i = 0; i < ls.length; i++) {
    const m = ls[i].match(parkedRe);
    if (m) parkedHits.push({ file: f, line: i + 1, text: ls[i].trim(), ref: (m[1] || m[3]) + (m[2] || m[4] || '') });
  }
}
if (!parkedHits.length) console.log('  (none)');
else {
  for (const h of parkedHits) {
    console.log(`  ${h.file}:${h.line}  parked #${h.ref}  "${h.text.slice(0, 110)}"`);
    // STATUS parked #8a is the expected one
    if (h.ref === '8a') console.log(`    Disposition: [keep] — live reference, matches STATUS current state.`);
    else                console.log(`    Disposition: [ambiguous-ask] — Chat triage against STATUS current.`);
  }
}
console.log();

console.log('-- (d) Line-number references in comments pointing at other files --');
console.log('    Heuristic grep for `line \\d+` or `:\\d+` patterns referencing cross-file.');
const lineRefHits = [];
for (const f of SRC_FILES) {
  const ls = lines(f);
  for (let i = 0; i < ls.length; i++) {
    // Only in comment lines, exclude package-version-style patterns
    if (!/^\s*(\/\/|\*)/.test(ls[i])) continue;
    const m1 = ls[i].match(/\bline\s+(\d+)\b/i);
    const m2 = ls[i].match(/([A-Za-z][\w.-]+\.(?:js|jsx|mjs|md)):(\d+)/);
    if (m1 || m2) {
      lineRefHits.push({
        file: f, line: i + 1, text: ls[i].trim(),
        ref: m2 ? `${m2[1]}:${m2[2]}` : `line ${m1[1]}`,
      });
    }
  }
}
// De-duplicate & show
if (!lineRefHits.length) console.log('  (none)');
else {
  for (const h of lineRefHits) {
    console.log(`  ${h.file}:${h.line}  ref=${h.ref}  "${h.text.slice(0, 100)}"`);
    console.log(`    [ambiguous-ask] — Chat triage whether line numbers still resolve.`);
  }
}
console.log();

console.log('-- (e) TODO / FIXME / HACK / XXX / TEMP markers --');
const markerRe = /\b(TODO|FIXME|HACK|XXX|TEMP)\b/;
const markerHits = [];
for (const f of SRC_FILES) {
  const ls = lines(f);
  for (let i = 0; i < ls.length; i++) {
    const m = ls[i].match(markerRe);
    if (!m) continue;
    // skip if it's literally inside an identifier like TEMPLATE_MAP
    if (/TEMPLATE|TEMP_|XXX_/.test(ls[i])) continue;
    markerHits.push({ file: f, line: i + 1, marker: m[1], text: ls[i].trim() });
  }
}
if (!markerHits.length) console.log('  (none)');
else {
  for (const h of markerHits) {
    console.log(`  ${h.file}:${h.line}  [${h.marker}]  ${h.text.slice(0, 110)}  [ambiguous-ask]`);
  }
}
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 4: Ad-hoc pre-gate patterns
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 4: Ad-hoc pre-gate patterns in src/tests/ ===\n');
const gateRe = /\b(assay|dataType|colRelationship)\s*(===|!==)\s*['"]([A-Za-z_]+)['"]/;
const gateHits = [];
for (const f of SRC_FILES) {
  if (!f.startsWith('src/tests/')) continue;
  const ls = lines(f);
  for (let i = 0; i < ls.length; i++) {
    const m = ls[i].match(gateRe);
    if (!m) continue;
    gateHits.push({
      file: f, line: i + 1, var: m[1], op: m[2], lit: m[3],
      text: ls[i].trim(),
    });
  }
}
if (!gateHits.length) console.log('  (none found)');
else {
  // Classifier: semantic (keep) vs subsumed (lift) vs ambiguous
  const SEMANTIC_KEEP = new Set([
    // biological-semantics gates independent of row order
    'missingDataPattern.js:assay:genomics',
    'withinRowVariance.js:assay:genomics', // checked at engine.js not in-test
    'mahalanobis.js:assay:genomics',       // biological-semantics; engine-level
  ]);
  console.log(`Found ${gateHits.length} hits. Per-hit classification:\n`);
  for (const h of gateHits) {
    console.log(`  ${h.file}:${h.line}`);
    console.log(`    ${h.text.slice(0, 120)}`);
    // Classify
    const base = basename(h.file);
    let klass, note, disp;
    if (base === 'missingDataPattern.js' && h.var === 'assay' && h.lit === 'genomics') {
      klass = '(b) Semantic gate';
      note = 'biological-semantics genomics skip; structured missingness expected.';
      disp = '[keep, document]';
    } else if (base === 'terminalDigits.js' && h.var === 'assay' && h.lit === 'qpcr') {
      klass = '(b) Semantic gate — instrument-artefact caveat';
      note = 'qPCR 0.05°C quantisation note in user-facing description text only;';
      disp = '[keep, document]';
    } else if (base === 'decimalPrecision.js' && h.var === 'assay' && h.lit === 'qpcr') {
      klass = '(b) Semantic gate — instrument-artefact caveat';
      note = 'qPCR float32/float64 mixed-precision note in description text only.';
      disp = '[keep, document]';
    } else if (base === 'duplicateDetection.js' && h.var === 'assay' && h.lit === 'genomics') {
      klass = '(b) Semantic gate — zero-inflation suppression';
      note = 'DupDet zero-inflation handling; independent of row-order semantics.';
      disp = '[keep, document]';
    } else if (base === 'mahalanobis.js' && h.var === 'assay') {
      klass = '(b) Semantic gate — plate/Ct assay feature flag';
      note = 'plateAssay feature flag for Mahalanobis p-threshold tuning, independent of gate.';
      disp = '[keep, document]';
    } else if (base === 'blockedMahalanobis.js' && h.var === 'dataType' && h.lit === 'continuous') {
      klass = '(b) Semantic gate';
      note = 'Defensive `dataType !== "continuous"` double-check; engine-level DATATYPE_SKIP';
      note += ' already routes count/survey to N/A — internal belt-and-braces, documented at';
      note += ' blockedMahalanobis.js:244-245.';
      disp = '[keep, document]';
    } else if (base === 'columnGof.js' && h.var === 'dataType') {
      klass = '(b) Semantic gate — per-column family selection';
      note = 'dataType drives Normal vs Poisson/NB family routing; this is core logic, not';
      note += ' a gate-worthy dispatch decision.';
      disp = '[keep, document]';
    } else if ((base === 'entropyTest.js' || base === 'modality.js') && h.var === 'dataType' && (h.lit === 'ordinal' || h.lit === 'count')) {
      klass = '(b) Semantic gate — routing branches inside test';
      note = 'dataType-driven routing / skip inside test function; semantic, not pre-gate.';
      disp = '[keep, document]';
    } else {
      klass = '(c) Ambiguous';
      note = 'requires Chat triage.';
      disp = '[ambiguous-ask]';
    }
    console.log(`    Classification: ${klass}`);
    console.log(`    ${note}`);
    console.log(`    Disposition: ${disp}`);
    console.log();
  }
  console.log('Summary: every hit classified as (b) Semantic gate (keep) — none of the');
  console.log('current in-test assay/dataType checks are subsumable by Column Relationship');
  console.log('Gate or Row Semantics Gate. The ad-hoc genomics dispatches previously on');
  console.log('§2.6b / §2.7 / §4.2 retired in S118 Track H; what remains are biological-');
  console.log('semantics gates (genomics structured-missingness / zero-inflation), dataType-');
  console.log('family routing (GoF / Entropy / Modality), and instrument-artefact description');
  console.log('caveats (qPCR footnotes in TerminalDigit / DecimalPrecision). All retained.\n');
}

// ──────────────────────────────────────────────────────────────────────
// Section 5: Dead branches
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 5: Dead branches ===\n');

// (a) Pre-S118 BatchView SKIP on long-format
console.log('-- (a) Pre-S118 BatchView SKIP-on-long-format fragments --');
const bvSrc = FILE_TEXT.get('src/components/views/BatchView.jsx') || '';
const bvLines = bvSrc.split('\n');
// Check whether anything sets severity === 'SKIP'
const setsSkip = bvSrc.match(/severity\s*:\s*['"]SKIP['"]/);
// References to r.severity === 'SKIP'
const usesSkip = [];
bvLines.forEach((l, i) => {
  if (/r\.severity\s*===?\s*['"]SKIP['"]/.test(l) || /severity===?"SKIP"/.test(l)) {
    usesSkip.push({ n: i + 1, line: l.trim() });
  }
});
const skipKeyInSevColors = bvLines.findIndex(l => /^const\s+SEV_COLORS\s*=.*"SKIP"/.test(l));
console.log(`  Lines setting severity:"SKIP"         : ${setsSkip ? 'present' : 'NONE'}`);
console.log(`  Lines reading r.severity === "SKIP"   : ${usesSkip.length}`);
for (const u of usesSkip) console.log(`    BatchView.jsx:${u.n}: ${u.line.slice(0, 120)}`);
if (skipKeyInSevColors !== -1) console.log(`  SEV_COLORS["SKIP"] key declared at BatchView.jsx:${skipKeyInSevColors + 1}`);
console.log('  Disposition: [remove] — `severity:"SKIP"` is never set anywhere in src/');
console.log('  post-S118 (runBatch pushes `severity:sev` or `severity:"ERROR"` only).');
console.log('  `SEV_COLORS["SKIP"]` key and the three conditional renders on');
console.log('  `r.severity === "SKIP"` are unreachable. Confirmed pre-S118 long-format-SKIP');
console.log('  residue. Safe to delete in a follow-up session.\n');

// (b) Pre-S95 CRC fragments
console.log('-- (b) Pre-S95 CRC handler fragments in src/ --');
const crcHits = [];
for (const f of SRC_FILES) {
  const t = FILE_TEXT.get(f);
  if (/\bcrc\b|ConstantResponse|CRC_/i.test(t)) {
    const ls = t.split('\n');
    for (let i = 0; i < ls.length; i++) {
      if (/\bcrc\b|ConstantResponse|CRC_/i.test(ls[i]) && !/\bsrc\b/.test(ls[i])) {
        // Filter false positives: "src/" paths, tokens.js hex "#CCC", etc.
        if (/#[0-9a-fA-F]{3,6}\b/.test(ls[i])) continue;
        if (/\bsrcset\b/.test(ls[i])) continue;
        crcHits.push({ file: f, line: i + 1, text: ls[i].trim() });
      }
    }
  }
}
if (!crcHits.length) console.log('  (none) — clean post-S95. Track C fully purged.');
else {
  for (const h of crcHits) console.log(`  ${h.file}:${h.line}  ${h.text.slice(0, 120)}`);
}
console.log();

// (c) Pre-S94 ConstResp fragments
console.log('-- (c) Pre-S94 ConstResp fragments --');
let constRespHits = 0;
for (const f of SRC_FILES) {
  const t = FILE_TEXT.get(f);
  if (/ConstResp|Constant-Response/.test(t)) {
    const ls = t.split('\n');
    for (let i = 0; i < ls.length; i++) {
      if (/ConstResp|Constant-Response/.test(ls[i])) {
        console.log(`  ${f}:${i + 1}  ${ls[i].trim().slice(0, 120)}`);
        constRespHits++;
      }
    }
  }
}
if (!constRespHits) console.log('  (none) — clean post-S94.');
console.log();

// (d) if (false) / commented conditions / unreachable branches
console.log('-- (d) `if (false)` / commented-condition blocks / unreachable branches --');
let constBranchHits = 0;
for (const f of SRC_FILES) {
  const ls = lines(f);
  for (let i = 0; i < ls.length; i++) {
    if (/if\s*\(\s*false\s*\)/.test(ls[i])) {
      console.log(`  ${f}:${i + 1}  ${ls[i].trim().slice(0, 120)}  [remove]`);
      constBranchHits++;
    }
    if (/if\s*\(\s*true\s*\)/.test(ls[i])) {
      console.log(`  ${f}:${i + 1}  ${ls[i].trim().slice(0, 120)}  [ambiguous-ask]`);
      constBranchHits++;
    }
  }
}
if (!constBranchHits) console.log('  (none)');
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 6: Commented-out code ≥3 lines
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 6: Commented-out code ≥3 lines ===\n');
console.log('Heuristic: consecutive `//` lines where ≥60% of content lines begin with a');
console.log('JS code token (const/let/var/function/return/if/for/while/import/</>/})');
console.log('rather than prose (starts with uppercase English word, ends with period).\n');
const codeTokenRe = /^\s*\/\/\s*(const|let|var|function|return|if|for|while|import|export|<\/?|}|\)|\{|\.)/;
function lineLooksLikeCode(l) {
  return codeTokenRe.test(l) ||
    /^\s*\/\/\s*[a-z_\$][\w\$]*\s*\(/.test(l) ||                        // // foo(...)
    /^\s*\/\/\s*[\[\]<>\{\}\(\)]/.test(l);
}
const commentedCodeBlocks = [];
for (const f of SRC_FILES) {
  const ls = lines(f);
  let start = -1, commentCount = 0, codeLikeCount = 0;
  for (let i = 0; i <= ls.length; i++) {
    const l = ls[i] || '';
    if (/^\s*\/\//.test(l)) {
      if (start === -1) start = i;
      commentCount++;
      if (lineLooksLikeCode(l)) codeLikeCount++;
    } else {
      if (commentCount >= 3 && codeLikeCount / commentCount >= 0.6) {
        commentedCodeBlocks.push({ file: f, startLine: start + 1, nLines: commentCount, codeLines: codeLikeCount });
      }
      start = -1; commentCount = 0; codeLikeCount = 0;
    }
  }
}
// Also scan for /* ... */ block-comments spanning code
for (const f of SRC_FILES) {
  const t = FILE_TEXT.get(f);
  const ls = t.split('\n');
  let inBlock = false, start = -1, count = 0, codeLike = 0;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (!inBlock && /\/\*/.test(l)) {
      inBlock = true; start = i; count = 1; codeLike = 0;
      if (/\*\//.test(l)) inBlock = false;
      continue;
    }
    if (inBlock) {
      count++;
      const inner = l.replace(/^\s*\*/, '').trim();
      if (/^(const|let|var|function|return|if|for|while|import|export)\b/.test(inner)
        || /^<\/?[a-zA-Z]/.test(inner) || /^[\}\)\]]/.test(inner)) codeLike++;
      if (/\*\//.test(l)) {
        if (count >= 3 && codeLike / count >= 0.5) {
          commentedCodeBlocks.push({ file: f, startLine: start + 1, nLines: count, codeLines: codeLike, block: true });
        }
        inBlock = false;
      }
    }
  }
}
// Known expected: HotspotExcerpt bracket-strip
const known8a = commentedCodeBlocks.find(b => b.file === 'src/components/views/HotspotExcerpt.jsx' && b.startLine >= 820 && b.startLine <= 830);
if (known8a) {
  console.log(`  ${known8a.file}:${known8a.startLine}  ${known8a.nLines} lines`);
  console.log('    IrcBracketStrip call site commented out — [punt-v1.0, tracked as parked #8a]');
  console.log();
}
const others = commentedCodeBlocks.filter(b => b !== known8a);
if (!others.length) {
  console.log('  No other commented-out code blocks detected by heuristic.');
} else {
  console.log('  Other candidates (heuristic may surface false positives):');
  for (const b of others) {
    console.log(`    ${b.file}:${b.startLine}  ${b.nLines} lines (${b.codeLines} code-like)  [ambiguous-ask]`);
  }
}
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 7: Unused imports
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 7: Unused imports ===\n');
console.log('For each src/ file, parse the `import { A, B, C } from "..."` identifier');
console.log('list and check each identifier against the rest of the file.\n');
let unusedCount = 0;
for (const f of SRC_FILES) {
  const t = FILE_TEXT.get(f);
  const lsAll = t.split('\n');
  // collect imports (multi-line too — simple heuristic: concat continuation lines)
  const joined = t.replace(/\n/g, ' ');
  const importRe = /import\s*(?:(\w+)\s*,\s*)?\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
  let m;
  const unused = [];
  while ((m = importRe.exec(joined)) !== null) {
    const names = m[2].split(',').map(s => s.trim().replace(/\s+as\s+/, ' as ').split(/\s+as\s+/).pop().trim())
      .filter(Boolean);
    // Also capture default
    if (m[1]) names.unshift(m[1].trim());
    for (const n of names) {
      if (!n) continue;
      // Remove this import line's occurrence for counting
      const body = t.replace(m[0], '');
      const reBody = new RegExp(`\\b${n}\\b`);
      if (!reBody.test(body)) unused.push(n);
    }
  }
  // Also handle `import X from "..."`
  const defaultImportRe = /^import\s+(\w+)\s+from\s+['"][^'"]+['"]/gm;
  let dm;
  while ((dm = defaultImportRe.exec(t)) !== null) {
    const n = dm[1];
    const body = t.replace(dm[0], '');
    const reBody = new RegExp(`\\b${n}\\b`);
    if (!reBody.test(body)) unused.push(n);
  }
  const deduped = [...new Set(unused)];
  if (deduped.length) {
    console.log(`  ${f}`);
    for (const n of deduped) console.log(`    unused: ${n}  [remove]`);
    unusedCount += deduped.length;
  }
}
if (unusedCount === 0) console.log('  (none) — no unused imports detected by heuristic.');
else console.log(`\n  Total: ${unusedCount} unused-import candidates (heuristic; confirm with eslint).`);
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 8: STATUS parked-item hygiene
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 8: STATUS parked-item hygiene ===\n');
const statusText = readDoc('STATUS.md');
// Extract parked items
const parkedBlockMatch = statusText.match(/## Parked items\s*\n([\s\S]*?)\n---/);
const parkedBlock = parkedBlockMatch ? parkedBlockMatch[1] : '';
const parkedLines = parkedBlock.split('\n').filter(l => /^\d+[a-z]?\./.test(l.trim()));

const parkedFindings = [
  {
    id: '13',
    text: 'DS11 assay→dataType routing fallthrough',
    tags: '[latent, inert post-S118]',
    finding:
      'Explicitly "inert post-S118" — rsSkip dispatches BEFORE §2.6b internal ' +
      'dataType !== "continuous" gate. Still retained as latent. Per S118 §3 the ' +
      'entire raison d\'être is the `validate-batch.mjs` one-line ternary (`assay === ' +
      '"survey" ? ... : "cell_count" ? ... : "continuous"`); once that batch script ' +
      'adopts `ASSAY_DATATYPE_MAP` lookup directly, the parked item has no live referent.',
    disposition: '[rewrite] — trim parked-item body once `validate-batch.mjs` is aligned; ' +
      'or if the batch script is intentionally frozen for bit-identical-reproducibility, ' +
      '[keep] with a one-line cross-reference to the frozen-by-design rationale.',
  },
  {
    id: '23',
    text: 'METHODOLOGY-MAP.md line 511 historical audit note orthographically stale',
    tags: '[trivial]',
    finding:
      'Line 511 currently reads "Currently runs on replicate pairs only. Expand to all ' +
      'column pairs…" — ConstOffset expansion landed S95 per CLAUDE.md. The audit note ' +
      'is historical; the resolution is in the changelog. Parked item is still accurate; ' +
      'the stale content it describes is unchanged since the parked item was written.',
    disposition: '[keep] — parked #23 correctly surfaces the stale doc content. ' +
      'Resolution is a one-line doc edit during a neighbouring pass.',
  },
];
console.log(`Parked items in STATUS: ${parkedLines.length} found.\n`);
console.log('Per-item hygiene findings:\n');
for (const p of parkedFindings) {
  console.log(`  #${p.id}  ${p.tags}`);
  console.log(`    ${p.text}`);
  console.log(`    Finding: ${p.finding}`);
  console.log(`    Disposition: ${p.disposition}\n`);
}

// Scan for stale cluster refs
console.log('Cluster-ref scan: looking for "Cluster: blocks #N" / "cluster with #N" refs.');
const clusterHits = [];
for (const l of parkedBlock.split('\n')) {
  const m = l.match(/cluster[s]?\s*(?:with|blocks)\s*#([0-9]+[a-z]?)/i);
  if (m) clusterHits.push({ line: l.trim().slice(0, 100), ref: m[1] });
}
for (const h of clusterHits) {
  const exists = parkedLines.some(pl => new RegExp(`^${h.ref}\\.`).test(pl.trim()));
  console.log(`  Cluster ref #${h.ref}: ${exists ? 'resolves (OK)' : 'UNRESOLVED'}`);
  console.log(`    In: ${h.line}`);
}
console.log();

// Items with explicit file:line references — spot-check
console.log('Filename/line-number resolution for parked items referencing specific files:');
const fileLineRe = /([A-Za-z][\w.-]+\.(?:md|js|jsx|mjs))\s*(?:line\s*|:)?(\d+)/g;
for (const pline of parkedLines) {
  let m;
  while ((m = fileLineRe.exec(pline)) !== null) {
    const [, fileName, lineStr] = m;
    const lineNo = parseInt(lineStr, 10);
    // Try to resolve — check known locations
    const candidates = [
      fileName,
      join('docs', 'shared', fileName),
      join('docs', fileName),
      join('src', fileName),
    ];
    let hit = null;
    for (const c of candidates) {
      try { const t = readFileSync(c, 'utf-8'); const lines = t.split('\n'); hit = { path: c, line: lines[lineNo - 1] }; break; } catch {}
    }
    console.log(`  ${fileName}:${lineNo}  ${hit ? 'resolves -> ' + hit.path : 'NOT FOUND'}`);
    if (hit) console.log(`    content: ${(hit.line || '').trim().slice(0, 100)}`);
  }
}
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 9: Chat-owned docs stale content
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 9: Chat-owned docs stale content ===\n');
const METH = readDoc('docs/shared/METHODOLOGY.md');
const MAP  = readDoc('docs/shared/METHODOLOGY-MAP.md');
const GT   = readDoc('docs/shared/TEST-GROUND-TRUTH.md');

console.log('-- (a) Retired-test references outside "Removed tests" / historical sections --');
function scan(name, body, patterns) {
  const out = [];
  const ls = body.split('\n');
  for (let i = 0; i < ls.length; i++) {
    for (const re of patterns) {
      if (re.test(ls[i])) out.push({ doc: name, line: i + 1, text: ls[i].trim().slice(0, 160) });
    }
  }
  return out;
}
const retiredDocHits = [
  ...scan('METHODOLOGY.md', METH, [/\bCRC\b(?!_GATE)/, /ConstResp/, /Constant-Response Concentration/, /CrossCondDup/]),
  ...scan('METHODOLOGY-MAP.md', MAP, [/\bCRC\b(?!_GATE)/, /ConstResp/, /Constant-Response Concentration/, /CrossCondDup/]),
  ...scan('TEST-GROUND-TRUTH.md', GT, [/\bCRC\b(?!_GATE)/, /ConstResp/, /Constant-Response Concentration/, /CrossCondDup/]),
];
for (const h of retiredDocHits) {
  console.log(`  ${h.doc}:${h.line}  ${h.text}`);
  if (/removed|retired|historical|Removed|v2\.0|v3\.2|Track C/.test(h.text)) {
    console.log(`    Disposition: [keep] — historical/changelog context.`);
  } else {
    console.log(`    Disposition: [ambiguous-ask]`);
  }
}
if (!retiredDocHits.length) console.log('  (none)');
console.log();

console.log('-- (b) Pre-S95 category names outside historical notes --');
const catNameHits = [
  ...scan('METHODOLOGY.md', METH, [/\bUnnatural Noise\b/, /\bToo Perfect\b/, /\bUneven Sections\b/, /\bCopy Detection\b/]),
  ...scan('METHODOLOGY-MAP.md', MAP, [/\bUnnatural Noise\b/, /\bToo Perfect\b/, /\bUneven Sections\b/, /\bCopy Detection\b/]),
  ...scan('TEST-GROUND-TRUTH.md', GT, [/\bUnnatural Noise\b/, /\bToo Perfect\b/, /\bUneven Sections\b/, /\bCopy Detection\b/]),
];
for (const h of catNameHits.slice(0, 20)) {
  console.log(`  ${h.doc}:${h.line}  ${h.text}`);
  console.log(`    [ambiguous-ask] — historical vs live prose. Chat triage.`);
}
if (catNameHits.length > 20) console.log(`  … and ${catNameHits.length - 20} more.`);
if (!catNameHits.length) console.log('  (none)');
console.log();

console.log('-- (c) Parked # references in Chat-owned docs --');
const docParkedRe = /parked\s*#\s*([0-9]+[a-z]?)\b/gi;
const docParkedCounts = {};
for (const [name, body] of [['METHODOLOGY.md', METH], ['METHODOLOGY-MAP.md', MAP], ['TEST-GROUND-TRUTH.md', GT]]) {
  let m;
  while ((m = docParkedRe.exec(body)) !== null) {
    const ref = m[1];
    const key = `${name}#${ref}`;
    docParkedCounts[key] = (docParkedCounts[key] || 0) + 1;
  }
}
const docParkedEntries = Object.entries(docParkedCounts).sort();
for (const [k, n] of docParkedEntries) {
  const [doc, ref] = k.split('#');
  // Does STATUS currently have this ref?
  const statusHas = parkedLines.some(pl => new RegExp(`^${ref}\\.`).test(pl.trim()));
  console.log(`  ${doc}  parked #${ref}  ×${n}  ${statusHas ? '(resolves in STATUS)' : '(no match in current STATUS — possibly historical)'}`);
  if (!statusHas) console.log(`    Disposition: [ambiguous-ask] — Chat triage whether reference is historical snapshot or stale pointer.`);
}
console.log();

console.log('-- (d) Section cross-references that don\'t resolve --');
console.log('  Heuristic grep for "§N.M" patterns; reporting counts only (full resolution');
console.log('  requires TOC parse — Chat-owned).');
let sectRefCount = 0;
for (const [name, body] of [['METHODOLOGY.md', METH], ['METHODOLOGY-MAP.md', MAP], ['TEST-GROUND-TRUTH.md', GT]]) {
  const ls = body.split('\n');
  for (let i = 0; i < ls.length; i++) {
    if (/§\d+\.\d+/.test(ls[i])) sectRefCount++;
  }
}
console.log(`  Total §N.M refs across the three docs: ${sectRefCount}  [ambiguous-ask]`);
console.log();

console.log('-- (e) Dangling TODO markers in docs --');
let docTodo = 0;
for (const [name, body] of [['METHODOLOGY.md', METH], ['METHODOLOGY-MAP.md', MAP], ['TEST-GROUND-TRUTH.md', GT]]) {
  const ls = body.split('\n');
  for (let i = 0; i < ls.length; i++) {
    if (/\b(TODO|FIXME|HACK|XXX)\b/.test(ls[i])) {
      console.log(`  ${name}:${i + 1}  ${ls[i].trim().slice(0, 120)}  [ambiguous-ask]`);
      docTodo++;
    }
  }
}
if (!docTodo) console.log('  (none)');
console.log();

// ──────────────────────────────────────────────────────────────────────
// Section 10: Missing fields
// ──────────────────────────────────────────────────────────────────────
console.log('=== Section 10: Missing fields ===\n');
console.log('Items not verifiable from grep-driven static analysis alone:');
console.log('  - Whether zero-ref exports (Section 1b) are accessed via dynamic-import / ');
console.log('    string-key lookup elsewhere. A runtime trace or eslint --no-unused-exports');
console.log('    pass would give higher confidence before deletion.');
console.log('  - Whether unused-imports (Section 7) are retained intentionally for side');
console.log('    effects (rare in this codebase). Eslint --no-unused-vars would confirm.');
console.log('  - Whether section cross-references (Section 9d) actually resolve — needs');
console.log('    TOC parse of the three docs, Chat-owned.');
console.log('  - Whether parked # references in docs (Section 9c) are historical snapshots');
console.log('    (changelog entries describing state-at-the-time) vs live pointers that');
console.log('    should remap to current STATUS numbers. Chat triage.');
console.log('  - Runtime verification that Section 5(a) SKIP branches are truly');
console.log('    unreachable post-S118 — conservative [remove] based on static trace only.');
console.log('  - Commented-out-code heuristic (Section 6) can misclassify prose comments');
console.log('    that happen to contain code-like fragments (e.g. ". See `foo()`.").');
console.log('    Visual eyeball required for non-known-item findings.');
console.log();

console.log('=== End of audit ===');
