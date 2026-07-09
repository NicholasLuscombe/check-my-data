/**
 * Generator for excel-precision-3dp.xlsx — the fixture that proves numeric
 * cells survive import at full precision (S310, Excel raw-numeric import).
 *
 * The workbook has one numeric column ("reading") cell-formatted to display
 * three decimals ("0.000") while the underlying values carry a deep 6-digit
 * fractional tail (.385732) shared across distinct integer parts — C23's
 * near-duplicate shape. A reader opening the file in Excel sees "2.386",
 * "6.386", …; the underlying value is 2.385732, 6.385732, ….
 *
 * A "sample" text column and a "date" column (formatted yyyy-mm-dd) are
 * included so the same fixture proves the numeric-ONLY discrimination: the
 * fix must leave dates and text on their formatted string, only numbers go raw.
 *
 * Regenerate with:  node test/fixtures/gen-excel-precision-3dp.mjs
 * The .xlsx it writes is the committed artifact; this script is provenance.
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Shared deep tail .385732 across distinct integer parts (the near-dup shape),
// interleaved with a few unique values so the column reads as real data.
const readings = [
  2.385732, 6.385732, 15.385732, 1.385732, 9.385732, 4.385732,
  11.385732, 3.385732, 7.412009, 12.905517, 8.385732, 5.385732,
];

const ws = XLSX.utils.aoa_to_sheet([["reading", "sample", "date"]]);
readings.forEach((v, i) => {
  const r = i + 1;
  // numeric cell, display-formatted to 3 dp but holding the full value
  ws[XLSX.utils.encode_cell({ r, c: 0 })] = { t: "n", v, z: "0.000" };
  // text and date columns — must stay on their formatted string post-fix
  ws[XLSX.utils.encode_cell({ r, c: 1 })] = { t: "s", v: "S" + r };
  ws[XLSX.utils.encode_cell({ r, c: 2 })] = { t: "d", v: new Date(Date.UTC(2026, 0, r)), z: "yyyy-mm-dd" };
});
ws["!ref"] = "A1:C" + (readings.length + 1);

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
const buf = XLSX.write(wb, { type: "array", bookType: "xlsx", cellDates: true });

const outPath = join(__dirname, "excel-precision-3dp.xlsx");
writeFileSync(outPath, Buffer.from(buf));
console.log("wrote", outPath, "(" + buf.length + " bytes)");
