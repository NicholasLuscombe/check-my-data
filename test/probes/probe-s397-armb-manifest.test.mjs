/* S397 — assert the generated ARMB_MANIFEST against ROUND2-RUN-LOG.md §4.
 *
 * THE CHECK IS AGAINST §4, NOT AGAINST THE GENERATOR'S INPUT. §4 is re-read from
 * disk here and parsed by a DIFFERENT METHOD: the generator splits each row on
 * `|` and takes fields by POSITION; this searches each row for the vocabulary
 * §4 actually uses — `replicates (`, `ordered (`, `confirmed as offered` — and
 * keys on CONTENT. A column index off by one in the generator would still be
 * found here and would disagree, which a shared parser could not do.
 *
 * DISAGREEMENTS ARE REPORTED, NOT RESOLVED. A row where the two readings differ
 * is printed and fails; it is not silently taken from one side.
 *
 * Run: MANIFEST=1 npx vitest run test/probes/probe-s397-armb-manifest.test.mjs
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

const ENABLED = !!process.env.MANIFEST;
const root = dirname(execSync("git rev-parse --path-format=absolute --git-common-dir",
  { encoding: "utf-8" }).trim());
const MANIFEST = process.env.ARMB_MANIFEST || join(root, "docs/shared/round2-raw/round2-armb-manifest.json");

/* §4, re-read and parsed by content rather than by column position. */
function readS4() {
  const t = readFileSync(join(root, "docs/shared/ROUND2-RUN-LOG.md"), "utf-8");
  const s4 = t.slice(t.indexOf("\n## 4 —"), t.indexOf("\n## 5 —"));
  const out = new Map();
  for (const line of s4.split("\n")) {
    const m = line.match(/^\|\s*(\d+)\s*\|/);
    if (!m) continue;
    const pos = +m[1];
    out.set(pos, {
      pos, line,
      file:    (line.match(/\|\s*([^|\s][^|]*\.(?:xlsx|xls|csv|tsv))\s*\|/i) || [])[1]?.trim() ?? null,
      colRel:  (line.match(/\|\s*(replicates|conditions)\s*\(/) || [])[1] ?? null,
      rowSem:  (line.match(/\|\s*(ordered|arbitrary)\s*\(/) || [])[1] ?? null,
      confirm: (line.match(/\|\s*(confirmed as offered|confirmed with \d+ unticked|gate did not render)/g) || [])
                 .map((x) => x.replace(/^\|\s*/, "")),
    });
  }
  return out;
}

describe("S397 — the arm-B manifest against §4", () => {
  it.skipIf(!ENABLED)("every entry agrees with the run log, read again", () => {
    const m = JSON.parse(readFileSync(MANIFEST, "utf-8"));
    const s4 = readS4();
    expect(s4.size, "§4 rows").toBe(30);

    const bad = [];
    for (const e of m.entries) {
      const pos = +(e.label.match(/^pos-(\d+)/) || [])[1];
      const r = s4.get(pos);
      if (!r) { bad.push(`${e.label}: no §4 row for position ${pos}`); continue; }
      const file = e.file.split("/").pop();
      if (file !== r.file) bad.push(`pos-${pos} FILE: manifest ${file} vs §4 ${r.file}`);
      if (e.colRel !== r.colRel) bad.push(`pos-${pos} COL-REL: manifest ${e.colRel} vs §4 ${r.colRel}`);
      if (e.rowSem !== r.rowSem) bad.push(`pos-${pos} ROW-SEM: manifest ${e.rowSem} vs §4 ${r.rowSem}`);
      /* The confirm-gate cell is the LAST of the three "gate ..." style cells on
       * the row, because the column-relationship and row-semantics cells can
       * carry the same phrase on a refusal. */
      const gate = r.confirm[r.confirm.length - 1] ?? null;
      const want = /^confirmed as offered/.test(gate || "") ? "confirm" : undefined;
      if ((e.confirm ?? undefined) !== want)
        bad.push(`pos-${pos} CONFIRM: manifest ${JSON.stringify(e.confirm)} vs §4 ${JSON.stringify(gate)}`);
      if (/unticked/.test(gate || "")) bad.push(`pos-${pos} is an UNTICKED row and must not be in the manifest`);
      const isExcel = /\.xlsx?$/i.test(file);
      if (isExcel && !e.sheet) bad.push(`pos-${pos} SHEET: workbook with no sheet`);
      if (!isExcel && e.sheet !== null) bad.push(`pos-${pos} SHEET: non-Excel carries ${JSON.stringify(e.sheet)}`);
    }

    // The omissions, checked from §4 rather than taken from the generator.
    const s4Ref = [...s4.values()].filter((r) => r.colRel === null).map((r) => r.pos).sort((a, b) => a - b);
    const s4Unt = [...s4.values()].filter((r) => /unticked/.test(r.confirm.join(" "))).map((r) => r.pos).sort((a, b) => a - b);
    const inMan = m.entries.map((e) => +(e.label.match(/^pos-(\d+)/) || [])[1]).sort((a, b) => a - b);
    console.log("\n   §4 rows                       :", s4.size);
    console.log("   refusals (no col-rel answer)  :", s4Ref.map((p) => "pos-" + String(p).padStart(2, "0")).join(", "));
    console.log("   unticked (confirm cell)       :", s4Unt.map((p) => "pos-" + String(p).padStart(2, "0")).join(", "));
    console.log("   manifest entries              :", inMan.length);
    console.log("   30 = " + inMan.length + " entries + " + s4Unt.length + " unticked + " + s4Ref.length + " refusals :",
                inMan.length + s4Unt.length + s4Ref.length === 30);
    console.log("   answered (30 - refusals)      :", 30 - s4Ref.length);
    for (const p of [...s4Ref, ...s4Unt]) if (inMan.includes(p)) bad.push(`pos-${p} is omitted by §4 yet present in the manifest`);
    for (const r of s4.values())
      if (!s4Ref.includes(r.pos) && !s4Unt.includes(r.pos) && !inMan.includes(r.pos))
        bad.push(`pos-${r.pos} is drivable per §4 yet missing from the manifest`);

    if (bad.length) { console.log("\n   DISAGREEMENTS — reported, not resolved:"); for (const b of bad) console.log("     " + b); }
    else console.log("\n   every entry agrees with §4 on file, sheet, both answers and the confirm gate");
    expect(bad.join("\n")).toBe("");
  });
});
