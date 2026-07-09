/**
 * Excel import — reads .xlsx/.xls files and returns a 2D array compatible
 * with the existing preprocessRaw pipeline.
 *
 * Uses dynamic import() for SheetJS to avoid bundle bloat — the ~1 MB xlsx
 * library is only fetched when the user actually loads an Excel file.
 *
 * @module import/excel
 */

let _XLSX = null;

/** Lazily load SheetJS. Cached after first call. */
async function getXLSX() {
  if (!_XLSX) {
    _XLSX = await import("xlsx");
  }
  return _XLSX;
}

/**
 * Read the workbook and return sheet names without parsing cell data.
 * Used to show a sheet selector when a workbook has multiple sheets.
 *
 * @param {File} file
 * @returns {Promise<string[]>} array of sheet names
 */
export async function getSheetNames(file) {
  const XLSX = await getXLSX();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", bookSheets: true });
  return wb.SheetNames || [];
}

/**
 * Parse a specific sheet from an Excel file into a 2D string array.
 *
 * All cell values are coerced to strings (matching PapaParse CSV output) so
 * the downstream preprocessRaw → detectBlocks → applyHeaders pipeline works
 * identically.
 *
 * @param {File} file
 * @param {string} [sheetName] — sheet to extract. Defaults to first sheet.
 * @returns {Promise<{ rows: string[][], sheetName: string }>}
 */
export async function parseExcel(file, sheetName) {
  const XLSX = await getXLSX();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });

  const target = sheetName || wb.SheetNames[0];
  if (!target) throw new Error("Workbook contains no sheets.");
  if (!wb.Sheets[target]) throw new Error(`Sheet "${target}" not found in workbook.`);

  const ws = wb.Sheets[target];

  // Two passes over the same sheet, header:1 + defval:null so both share the
  // same shape and empty cells become null (matching PapaParse):
  //   - `formatted` carries display strings (dates, text, and the DISPLAY of
  //     numbers under any cell number-format);
  //   - `rawVals` carries the underlying primitives.
  // For NUMERIC cells we take the raw underlying number, so a display format
  // (e.g. "0.000" hiding a deeper value like 2.385732 shown as "2.386")
  // cannot round precision away before the forensic engine sees it. Every
  // other cell type keeps its formatted string, so dates and text are
  // unchanged from the prior raw:false behaviour. A blanket raw:true is not
  // usable here — it stringifies Date objects into ISO-with-timezone (see the
  // S309 import-precision read); the `typeof === "number"` test isolates real
  // numeric cells because dates are Date objects, strings are strings, and
  // booleans are booleans under raw:true.
  const formatted = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });
  const rawVals = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  if (!formatted || !formatted.length) throw new Error("Sheet is empty.");

  // Normalise: ensure every row has the same length (pad with null).
  const maxC = formatted.reduce((m, r) => Math.max(m, r.length), 0);
  const rows = formatted.map((fRow, ri) => {
    const rRow = rawVals[ri] || [];
    const out = new Array(maxC).fill(null);
    for (let i = 0; i < fRow.length; i++) {
      const rawV = rRow[i];
      if (typeof rawV === "number") {
        out[i] = String(rawV);                    // numeric → underlying value, full precision
      } else {
        const fV = fRow[i];
        out[i] = fV == null ? null : String(fV);  // date / text / boolean → formatted string
      }
    }
    return out;
  });

  return { rows, sheetName: target };
}
