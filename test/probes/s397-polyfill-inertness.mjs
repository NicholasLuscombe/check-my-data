/* ROUND2 §8.3's assertion, scoped by §18. S397.
 *
 * §8.3 requires, per deposit: `parseExcel` through the polyfill against
 * `parseExcel` on a buffer read directly from disk, same workbook, same sheet.
 * IDENTICAL, OR THE RUN STOPS AND THE DEPOSIT IS NOT SCORED.
 *
 * §18 scopes it. `ImportView.jsx:301-323` routes only `xlsx`/`xls` through
 * `getSheetNames`, the sole `arrayBuffer` consumer; everything else goes to
 * `FileReader.readAsText`. So §8.3's premise sentence — *every byte arm B
 * analyses arrives through it* — is false for 22 of the thirty. On those the
 * assertion is INAPPLICABLE and says so, because a skipped check and an
 * inapplicable one look identical in a log.
 *
 * THE TWO PATHS, and the only touchpoint that separates them. `parseExcel`
 * (excel.js:48) calls `file.arrayBuffer()` and nothing else; it is duck-typed,
 * so:
 *   A  a real jsdom `File` + the polyfill on `Blob.prototype` → the bytes come
 *      back through jsdom's `FileReader`.
 *   B  `{ arrayBuffer: async () => <disk buffer> }` → `Blob.prototype` is never
 *      consulted at all.
 *
 * THE CHECK THAT MAKES IT AN ASSERTION RATHER THAN TWO IDENTICAL CALLS. If path
 * A did not actually go through the polyfill — jsdom gains `arrayBuffer`, the
 * install is skipped, a refactor drops it — then both sides read from disk and
 * the comparison passes for the wrong reason, forever, in silence. So the
 * polyfill counts its own invocations and the result carries them: path A must
 * use it at least once and path B must use it zero times, or the deposit is
 * reported UNPROVEN rather than identical.
 */
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { parseExcel } from "../../src/import/excel.js";

export const EXCEL_EXT = ["xlsx", "xls"];

/* One counter, owned here, so a caller cannot install a polyfill this module
 * cannot see. Returns a note describing what it did, for the record. */
let polyfillCalls = 0;
export function installCountingPolyfill() {
  const had = typeof Blob.prototype.arrayBuffer === "function";
  const inner = had ? Blob.prototype.arrayBuffer : function () {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsArrayBuffer(this);
    });
  };
  Object.defineProperty(Blob.prototype, "arrayBuffer", {
    configurable: true, writable: true,
    value: function (...a) { polyfillCalls++; return inner.apply(this, a); },
  });
  return had
    ? "counting wrapper over jsdom's own Blob.prototype.arrayBuffer"
    : "counting polyfill installed (jsdom omits Blob.prototype.arrayBuffer)";
}

const digest = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");

/** First differing cell, so a mismatch names a location and not just a hash. */
function firstDiff(a, b) {
  if (a.length !== b.length) return `row count ${a.length} vs ${b.length}`;
  for (let r = 0; r < a.length; r++) {
    const ra = a[r] || [], rb = b[r] || [];
    if (ra.length !== rb.length) return `row ${r}: width ${ra.length} vs ${rb.length}`;
    for (let c = 0; c < ra.length; c++)
      if (ra[c] !== rb[c]) return `row ${r} col ${c}: ${JSON.stringify(ra[c])} vs ${JSON.stringify(rb[c])}`;
  }
  return null;
}

/**
 * @returns {Promise<{applicable, ok, reason, ...}>}
 *   applicable:false  — not an Excel deposit; `reason` says so. Not a pass.
 *   applicable:true, ok:true   — identical AND provably taken through the polyfill.
 *   applicable:true, ok:false  — `reason` says mismatch or unproven.
 */
export async function assertPolyfillInert({ path, sheet, name = null, _corrupt = false }) {
  const file = name || path.split("/").pop();
  const ext = (file.split(".").pop() || "").toLowerCase();
  if (!EXCEL_EXT.includes(ext)) {
    return { applicable: false, ok: null, file, sheet: sheet ?? null, ext,
             reason: `not an Excel deposit (.${ext}); ImportView.jsx:301-323 routes it to ` +
                     `FileReader.readAsText and the polyfill is never invoked (ROUND2 §18)` };
  }

  const bytes = readFileSync(path);
  const before = polyfillCalls;

  // A — through the polyfill, exactly as arm B receives every byte.
  const viaPolyfill = await parseExcel(new File([bytes], file), sheet);
  const usedByA = polyfillCalls - before;

  // B — straight off disk; Blob.prototype is not consulted.
  //
  // THE BUFFER IS COPIED INTO THE TEST REALM, and that is not fussiness. Under
  // jsdom `readFileSync`'s Buffer reports `instanceof Uint8Array === false`,
  // because Node's typed-array constructors and the test global's are different
  // objects. Handing `bytes.buffer.slice(...)` — a Node-realm ArrayBuffer — to
  // `XLSX.read(buf, {type:"array"})` makes SheetJS fail to recognise it, and the
  // first version of this file threw `Sheet "1300-3" not found in workbook.` on
  // a sheet that is plainly in the workbook. Allocating through the global
  // `Uint8Array` and copying puts both paths in one realm, so the comparison is
  // of the two READ ROUTES and not of two JavaScript realms.
  const mid = polyfillCalls;
  const u8 = new Uint8Array(bytes.length);
  u8.set(bytes);
  const viaDisk = await parseExcel({ arrayBuffer: async () => u8.buffer }, sheet);
  const usedByB = polyfillCalls - mid;

  if (_corrupt) viaDisk.rows[0][0] = "__corrupted__";   // negative control only

  const hA = digest(viaPolyfill), hB = digest(viaDisk);
  const identical = hA === hB;
  const proven = usedByA >= 1 && usedByB === 0;
  const diff = identical ? null : firstDiff(viaPolyfill.rows, viaDisk.rows);

  return {
    applicable: true, ok: identical && proven,
    file, sheet: viaPolyfill.sheetName, ext,
    rows: viaPolyfill.rows.length, cols: viaPolyfill.rows[0]?.length ?? 0,
    sha256Polyfill: hA, sha256Disk: hB, identical,
    polyfillCallsA: usedByA, polyfillCallsB: usedByB, proven,
    reason: identical && proven ? "identical, and path A provably went through the polyfill"
          : !proven ? `UNPROVEN: path A used the polyfill ${usedByA}x (need >= 1) and path B ${usedByB}x (need 0) ` +
                      `— the comparison cannot show what §8.3 asks`
          : `MISMATCH at ${diff}`,
  };
}

/** §8.3's blocking form. Throws, so the deposit is not scored. */
export async function guardPolyfillOrThrow(opts) {
  const r = await assertPolyfillInert(opts);
  if (r.applicable && !r.ok)
    throw new Error(`ROUND2 §8.3 — ${r.file}${r.sheet ? " :: " + r.sheet : ""}: ${r.reason}. ` +
                    `The run stops and the deposit is not scored.`);
  return r;
}
