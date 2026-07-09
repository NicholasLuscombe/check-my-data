/**
 * Excel raw-numeric import — precision-through-import proof (S310).
 *
 * This is a DEDICATED .xlsx-path test, separate from the CSV severity batch
 * (validate-batch.mjs reads .csv via PapaParse and never calls parseExcel, so
 * it cannot exercise this path). Run standalone:
 *
 *     node test/excel-precision.mjs
 *
 * What it proves: a numeric column cell-formatted to display 3 decimals but
 * holding a deep 6-digit fractional tail (.385732) survives import at full
 * precision, and that tail reaches the VFS pass-2 scorer's own substring
 * extractor. Pre-fix (raw:false) the engine saw "2.386" and the tail was
 * lost; post-fix it sees "2.385732".
 *
 * OUT OF SCOPE (by design): this does NOT assert VFS flags C23. The
 * valueFrequencySpike.js span>10000 pass-2 bucket skip still sits upstream of
 * the scorer and is a separate decision. Success here is "precision survives
 * import", not "C23 flags".
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(__dirname, "fixtures", "excel-precision-3dp.xlsx");

const { parseExcel } = await import("../src/import/excel.js");
const { extractAnalysisInputs } = await import("../src/analysis/engine.js");
const { extractFractionalDigitSubstring } = await import("../src/tests/valueFrequencySpike.js");

let failures = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.log(`  ✗ ${label}${detail != null ? "  — " + detail : ""}`);
  }
}

// A minimal File shim — parseExcel only calls file.arrayBuffer().
const fileShim = { arrayBuffer: async () => new Uint8Array(readFileSync(FIXTURE)) };

const { rows } = await parseExcel(fileShim, "Sheet1");

// rows[0] = header, rows[1..] = data. Columns: reading (numeric), sample (text), date.
const header = rows[0];
const dataRows = rows.slice(1);

console.log("Level 1 — parseExcel output (import boundary):");
check(
  'reading cell holds full precision "2.385732" (not display-rounded "2.386")',
  dataRows[0][0] === "2.385732",
  `got "${dataRows[0][0]}"`
);
check(
  "no reading cell was rounded to a 3-dp display value",
  !dataRows.some(r => /^\d+\.\d{3}$/.test(r[0])),
  "some reading cell matched N.NNN (round-trip lost precision)"
);
check(
  'date column stays on its formatted string "2026-01-01" (numeric-only discrimination)',
  dataRows[0][2] === "2026-01-01",
  `got "${dataRows[0][2]}"`
);
check(
  "date column carries no datetime/timezone artifact (blanket raw:true symptom)",
  !dataRows.some(r => /[T:Z]/.test(r[2])),
  "a date cell stringified as ISO-with-time"
);
check(
  'text column stays text "S1"',
  dataRows[0][1] === "S1",
  `got "${dataRows[0][1]}"`
);

// Level 2 — the deep tail reaches the VFS pass-2 scorer's own extractor.
// Isolate the reading column as the only data column.
const roles = header.map((_, i) => (i === 0 ? "data" : "label"));
const { rawMatrix } = extractAnalysisInputs({
  data: dataRows,
  roles,
  condPerCol: null,
  zeroAsMissing: false,
  colRelationship: null,
  dataColHeaders: [header[0]],
});

console.log("Level 2 — scorer input (rawMatrix → extractFractionalDigitSubstring):");
const tails = rawMatrix.map(r => extractFractionalDigitSubstring(r[0])).filter(Boolean);
check(
  'the reading rawMatrix carries "2.385732"',
  rawMatrix[0][0] === "2.385732",
  `got "${rawMatrix[0][0]}"`
);
check(
  'the scorer\'s own substring extractor recovers the 6-digit tail "385732"',
  extractFractionalDigitSubstring(rawMatrix[0][0]) === "385732",
  `got "${extractFractionalDigitSubstring(rawMatrix[0][0])}"`
);
const sharedTailCount = tails.filter(t => t === "385732").length;
check(
  "the recurring near-duplicate tail survives on ≥2 rows (C23 shape reaches the scorer)",
  sharedTailCount >= 2,
  `only ${sharedTailCount} row(s) carried tail 385732`
);

console.log("");
if (failures === 0) {
  console.log("PASS — Excel numeric precision survives import; deep tail reaches the scorer.");
  process.exit(0);
} else {
  console.log(`FAIL — ${failures} assertion(s) failed.`);
  process.exit(1);
}
