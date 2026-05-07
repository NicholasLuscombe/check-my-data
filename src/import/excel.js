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

  // sheet_to_json with header:1 gives a 2D array of raw values.
  // { raw: false, defval: null } ensures empty cells become null (matching PapaParse).
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null });

  if (!raw || !raw.length) throw new Error("Sheet is empty.");

  // Normalise: ensure every row has the same length (pad with null).
  const maxC = raw.reduce((m, r) => Math.max(m, r.length), 0);
  const rows = raw.map(r => {
    const out = new Array(maxC).fill(null);
    for (let i = 0; i < r.length; i++) {
      const v = r[i];
      out[i] = v == null ? null : String(v);
    }
    return out;
  });

  return { rows, sheetName: target };
}
