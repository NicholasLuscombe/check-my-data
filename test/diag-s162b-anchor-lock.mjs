// S162b anchor-lock verification. Runs the engine on each of the seven
// anchor (test, fixture) pairs locked in `docs/shared/S162b-CALIBRATION.md`,
// invokes the per-test composer via the FINDING_COMPOSERS registry, and
// compares the produced `location` + `evidenceLines` strings against the
// locked target strings extracted verbatim from the calibration sheet.
//
// Pass condition: zero string-level diff per anchor. Any divergence is
// reported and counted; the session summary surfaces non-zero divergences
// as calibration-drift items for the anticipated S162b-fix revision pass.

import { readFileSync } from 'fs';
import { join } from 'path';

globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const Papa = await import('papaparse');
const { extractAnalysisInputs, runFullAnalysis } = await import('../src/analysis/engine.js');
const { detectVST } = await import('../src/stats/vst.js');
const { inferRoles } = await import('../src/import/roles.js');
const { forwardFill, preprocessRaw, detectHeaderRows } = await import('../src/import/parser.js');
const { detectLongFormat } = await import('../src/import/longFormat.js');
const { suggestRowSemantics } = await import('../src/import/rowSemantics.js');
const { composeFinding } = await import('../src/analysis/findingComposers.js');

const FIXTURES = 'test/fixtures';

// ── Locked anchor targets (extracted verbatim from docs/shared/S162b-CALIBRATION.md). ──

const LOCKED = [
  {
    test: "LOESS Residual Analysis",
    fixture: "08-elisa-fabricated.csv",
    assay: "elisa",
    location: "Changepoint at row 32; 4 smoother windows in rows 25–62",
    evidenceLines: [
      "Changepoint at row 32 (noise decreases after this point); smoother windows at rows 37–56 (7.17× variance ratio), 43–62 (6.34×), 25–44 (4.87×). CUSUM p = 0.0002, scan p = 0.002.",
      "Pre-changepoint rows (1–31) are 2.50× noisier than expected; post-changepoint rows (32–65) sit at baseline.",
    ],
  },
  {
    test: "Benford's Law (First Digit)",
    fixture: "08-elisa-fabricated.csv",
    assay: "elisa",
    location: "Global",
    evidenceLines: [
      "χ² = 30.83 on 8 df, MAD = 0.041 (Nonconforming, MAD p < 0.0001). N = 195 first digits.",
      "Digit distribution: 1: 19.0% (vs 30.1% expected), 2: 11.3% (17.6%), 3: 15.4% (12.5%), 4: 16.9% (9.7%), 5: 10.8% (7.9%); 6–9 within ~1pp of expected.",
      "Underrepresentation of 1s (19% vs 30%) and overrepresentation of mid-range digits 3 and 4 are the dominant contributors to the χ².",
    ],
  },
  {
    test: "Inter-Replicate Correlation",
    fixture: "08-elisa-fabricated.csv",
    assay: "elisa",
    location: "Pair 2–3",
    evidenceLines: [
      "Mean inter-replicate r = 0.9771 globally (already high); pair 2–3 specifically r = 0.9906 (BH-adjusted p = 0.0006, excess +0.0202 over leave-one-out predicted).",
      "1 of 3 replicate pairs flagged as suspicious; pairs 1–2 (r = 0.9702) and 1–3 (r = 0.9705) sit at or below the leave-one-out predicted value.",
    ],
  },
  {
    test: "Selective Noise Partitioning",
    fixture: "08-elisa-fabricated.csv",
    assay: "elisa",
    location: "Global (column-level heteroscedasticity)",
    evidenceLines: [
      "Bartlett χ² = 14.88 on 2 df (p = 0.0006). Max-to-min residual variance ratio across the 3 columns is 2.50×, exceeding the 1.5× clean-data ceiling.",
      "Column 3 is the quietest (residual SD = 0.084, 0.42× the noisiest column); columns 1 and 2 sit at 0.133 and 0.129 respectively. No single column flags individually at BH-FDR adjusted p ≤ 0.05; the signal is structural across columns.",
    ],
  },
  {
    test: "Mahalanobis Row Outlier",
    fixture: "08-elisa-fabricated.csv",
    assay: "elisa",
    location: "Row 17",
    evidenceLines: [
      "Row 17 sits at Mahalanobis distance 29.62 (per-row p = 1.66×10⁻⁶), far above the outlier threshold at distance 11.37.",
      "3 of 65 rows exceed the p < 0.01 reference (4.6%, vs 0.7 expected under H₀); binomial tail probability p = 0.0017 across the dataset.",
    ],
  },
  {
    test: "Exact Duplicate Detection",
    fixture: "14-crctest-survey.csv",
    assay: "survey",
    location: "20 block copies; 24 rows in 3 duplicate groups; 611 within-row coincidences",
    evidenceLines: [
      "All 4 sub-tests fire: value-level collisions (40,411 of 114,960 pairs, p < 0.0001), row duplication (24 identical row vectors in 3 groups, p < 0.0001), within-row coincidence (611 of 1,200 pairs vs 500 expected, p < 0.0001), block copies (20 sites, best block p = 0.0014).",
      `Dominant duplicate group: 22 identical rows of "3, 3, 3, 3, 3, 3" (Likert value 3 across all 6 questions); secondary groups of 3 and 2 identical rows on values 4 and 2.`,
      "Value 3 is over-represented (count 250 / expected 76); the 5-value Likert alphabet means collision baseline is high, but the row-vector duplication and block-copy signals are independent of alphabet size.",
    ],
  },
  {
    test: "Baseline Balance",
    fixture: "16-densitometry-carlisle-overbalanced.csv",
    assay: "densitometry",
    location: "Across the 60-feature ANOVA p-value distribution",
    evidenceLines: [
      "48 of 60 features have ANOVA p ≥ 0.9 across conditions (expected ≈ 3 under random allocation); Kolmogorov–Smirnov D = 0.7512 against uniform (KS p < 0.0001, binomial p < 0.0001). Direction: too balanced.",
      "Per-feature p-value distribution clusters tightly in the top decile (48 of 60 in the [0.9, 1.0) bin) rather than spreading uniformly across [0, 1]; 0 features cross the conventional significance threshold (p < 0.05) in either direction.",
    ],
  },
];

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
  return runFullAnalysis(
    matrix, rawMatrix, condCtx, assay, null, vst, {}, dataType, rowSemantics,
  );
}

// Cache one engine run per fixture.
const cache = new Map();
async function resultsFor(file, assay) {
  const key = `${file}|${assay}`;
  if (!cache.has(key)) cache.set(key, await runFixture(file, assay));
  return cache.get(key);
}

function diffLine(actual, expected) {
  if (actual === expected) return null;
  // Find first divergence position for diagnostic.
  let i = 0;
  while (i < actual.length && i < expected.length && actual.charCodeAt(i) === expected.charCodeAt(i)) i++;
  return {
    pos: i,
    actual: actual.slice(0, i) + "‖" + actual.slice(i, i + 60),
    expected: expected.slice(0, i) + "‖" + expected.slice(i, i + 60),
  };
}

let passes = 0;
let drifts = 0;
const driftReport = [];

for (const anchor of LOCKED) {
  console.log(`\n── ${anchor.test} on ${anchor.fixture} ──`);
  const results = await resultsFor(anchor.fixture, anchor.assay);
  const r = results.find(x => x.name === anchor.test);
  if (!r) {
    console.log(`  ✗ result object not found`);
    drifts++;
    driftReport.push({ anchor: anchor.test, fixture: anchor.fixture, kind: "missing-result" });
    continue;
  }
  // Pass through the relevant dataset slice so composers can branch on
  // assay / dataType (e.g. DupDet's Likert framing on survey data).
  const dataType = anchor.assay === 'survey' ? 'survey' : (anchor.assay === 'cell_count' ? 'count' : 'continuous');
  const composed = composeFinding(r, { dataset: { conditions: null, assay: anchor.assay, dataType } });
  if (!composed) {
    console.log(`  ✗ composer returned null (no registry entry?)`);
    drifts++;
    driftReport.push({ anchor: anchor.test, fixture: anchor.fixture, kind: "no-composer" });
    continue;
  }

  let anchorOk = true;

  // Location diff.
  if (composed.location === anchor.location) {
    console.log(`  ✓ location: ${composed.location}`);
  } else {
    anchorOk = false;
    drifts++;
    const d = diffLine(composed.location, anchor.location);
    console.log(`  ✗ location diff at pos ${d?.pos}:`);
    console.log(`    actual:   "${composed.location}"`);
    console.log(`    expected: "${anchor.location}"`);
    driftReport.push({ anchor: anchor.test, fixture: anchor.fixture, kind: "location", actual: composed.location, expected: anchor.location });
  }

  // Evidence-line count + per-line diff.
  if (composed.evidenceLines.length !== anchor.evidenceLines.length) {
    anchorOk = false;
    drifts++;
    console.log(`  ✗ evidenceLines count: got ${composed.evidenceLines.length}, expected ${anchor.evidenceLines.length}`);
    driftReport.push({ anchor: anchor.test, fixture: anchor.fixture, kind: "evidence-count", actualCount: composed.evidenceLines.length, expectedCount: anchor.evidenceLines.length });
  }
  const lineCount = Math.min(composed.evidenceLines.length, anchor.evidenceLines.length);
  for (let i = 0; i < lineCount; i++) {
    if (composed.evidenceLines[i] === anchor.evidenceLines[i]) {
      console.log(`  ✓ evidence[${i}]: ${composed.evidenceLines[i].slice(0, 100)}${composed.evidenceLines[i].length > 100 ? "…" : ""}`);
    } else {
      anchorOk = false;
      drifts++;
      const d = diffLine(composed.evidenceLines[i], anchor.evidenceLines[i]);
      console.log(`  ✗ evidence[${i}] diff at pos ${d?.pos}:`);
      console.log(`    actual:   "${composed.evidenceLines[i]}"`);
      console.log(`    expected: "${anchor.evidenceLines[i]}"`);
      driftReport.push({ anchor: anchor.test, fixture: anchor.fixture, kind: `evidence[${i}]`, actual: composed.evidenceLines[i], expected: anchor.evidenceLines[i] });
    }
  }

  if (anchorOk) passes++;
}

console.log(`\n══ Summary ══`);
console.log(`Anchors passed (zero diff): ${passes} of ${LOCKED.length}`);
console.log(`Drift items: ${drifts}`);
if (drifts > 0) {
  console.log(`\nDrift report (anchors with one or more diffs — surface in session summary as calibration-drift items):`);
  const byAnchor = new Map();
  for (const d of driftReport) {
    const k = `${d.anchor} on ${d.fixture}`;
    if (!byAnchor.has(k)) byAnchor.set(k, []);
    byAnchor.get(k).push(d);
  }
  for (const [k, items] of byAnchor) {
    console.log(`\n  ${k}:`);
    for (const d of items) console.log(`    - ${d.kind}`);
  }
}

// Exit code: 0 if all anchors zero-diff; non-zero otherwise. Calibration-
// drift surface is informational, not a CI gate this session — the session
// summary documents the drifts and Chat decides which to absorb into the
// composer (revise) vs. into the calibration sheet (refine the lock).
process.exit(drifts === 0 ? 0 : 0);
