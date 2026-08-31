/* S397 — assert arm A's manifest against §4 re-read, the ranking, and the workbooks.
 *
 * THREE INDEPENDENT CHECKS, not one, because the sheet is load-bearing here in a
 * way it is not for arm B: on five of the eight workbooks `SheetNames[0]` is not
 * the §6.2 sheet, so a wrong sheet is a silently wrong verdict.
 *
 *   1  §4 RE-READ BY A DIFFERENT PARSE. The generator splits each row on `|` and
 *      takes fields by POSITION. This anchors on CONTENT — a regex keyed to the
 *      filename's extension, taking the cell that follows it — so a column index
 *      off by one in the generator is found rather than mirrored.
 *   2  THE COMMITTED §6.2 RANKING, a different artifact by a different producer
 *      (`round2-select.mjs --rank` over the inventory).
 *   3  THE WORKBOOK ITSELF. The named sheet must exist in `wb.SheetNames`. A
 *      manifest naming a sheet no workbook has is worthless, and neither of the
 *      documentary checks can catch it.
 *
 * DISAGREEMENTS ARE REPORTED, NOT RESOLVED.
 *
 * Run: MANIFEST=1 npx vitest run test/probes/probe-s397-arma-manifest.test.mjs
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import * as XLSX from "xlsx";

const ENABLED = !!process.env.MANIFEST;
/* TWO ROOTS, and they are not the same directory.
 *
 * TRACKED docs (`docs/shared/…`) live in the WORKTREE — `--show-toplevel`. The
 * GITIGNORED corpus (`corpus-data/`) exists in the MAIN CHECKOUT and in no
 * worktree, so it is reached through the common dir's parent, which is the rule
 * CLAUDE.md already records.
 *
 * FOUND BY RUNNING, at S397 part 6. Both were resolved through the common-dir
 * parent, so a tracked doc was read from MAIN. The arm-B checker passed at
 * 4a28354 only because a copy of the manifest happened to be sitting in main's
 * working tree at that moment; it was removed in the same part, and the check
 * has been unreproducible since. A worktree's own committed docs must be read
 * from the worktree, or a probe scores a file the branch did not write. */
const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
const mainRoot = dirname(execSync("git rev-parse --path-format=absolute --git-common-dir",
  { encoding: "utf-8" }).trim());
const MAN  = join(repoRoot, "docs/shared/round2-raw/round2-arma-manifest.json");
const RANK = join(repoRoot, "docs/shared/round2-raw/round2-ranking.json");

/* §4, parsed by CONTENT: anchor on the filename, take the cell after it. */
function readS4() {
  const t = readFileSync(join(repoRoot, "docs/shared/ROUND2-RUN-LOG.md"), "utf-8");
  const s4 = t.slice(t.indexOf("\n## 4 —"), t.indexOf("\n## 5 —"));
  const out = new Map();
  for (const line of s4.split("\n")) {
    const p = line.match(/^\|\s*(\d+)\s*\|/); if (!p) continue;
    const m = line.match(/\|\s*([^|]*\.(?:xlsx|xls|csv|tsv))\s*\|\s*([^|]+?)\s*\|/i);
    out.set(+p[1], { pos: +p[1], file: m ? m[1].trim() : null, sheet: m ? m[2].trim() : null });
  }
  return out;
}
const isExcel = (f) => ["xlsx", "xls"].includes((f.split(".").pop() || "").toLowerCase());
const pad = (p) => String(p).padStart(2, "0");

describe("S397 — arm A's manifest against §4, the ranking and the workbooks", () => {
  it.skipIf(!ENABLED)("thirty entries, each agreeing with all three", () => {
    const m = JSON.parse(readFileSync(MAN, "utf-8"));
    const s4 = readS4();
    const rank = JSON.parse(readFileSync(RANK, "utf-8"));
    expect(s4.size, "§4 rows").toBe(30);

    const bad = [];
    const seen = [];
    for (const e of m.datasets) {
      const pos = +(e.label.match(/^pos-(\d+)/) || [])[1];
      seen.push(pos);
      const r = s4.get(pos);
      if (!r) { bad.push(`${e.label}: no §4 row for position ${pos}`); continue; }

      const want = `corpus-data/round2/pos-${pad(pos)}/${r.file}`;
      if (e.path !== want) bad.push(`pos-${pad(pos)} PATH: manifest ${e.path} vs §4-derived ${want}`);
      if (!existsSync(join(mainRoot, e.path))) bad.push(`pos-${pad(pos)} PATH does not exist: ${e.path}`);

      // sheet: present iff Excel, and equal to §4's
      if (isExcel(r.file)) {
        if (e.sheet !== r.sheet) bad.push(`pos-${pad(pos)} SHEET: manifest ${JSON.stringify(e.sheet)} vs §4 ${JSON.stringify(r.sheet)}`);
        const sel = rank.ranking.find((x) => x.position === pos)?.ranked?.[0];
        if (sel && e.sheet !== sel.sheet) bad.push(`pos-${pad(pos)} SHEET vs RANKING: ${e.sheet} vs ${sel.sheet}`);
        const names = XLSX.read(readFileSync(join(mainRoot, e.path)), { type: "buffer", bookSheets: true }).SheetNames || [];
        if (!names.includes(e.sheet)) bad.push(`pos-${pad(pos)} SHEET not in the workbook: ${e.sheet} not among ${names.join(" | ")}`);
      } else if ("sheet" in e) {
        bad.push(`pos-${pad(pos)} SHEET: non-Excel entry carries ${JSON.stringify(e.sheet)}`);
      }

      // arm A carries NO answers — supplying one would stop it being the defaults arm
      for (const k of ["colRel", "rowSem", "confirm", "assay", "dataType", "vst", "conditionsHint"])
        if (k in e) bad.push(`pos-${pad(pos)} carries "${k}" — arm A must supply no answer or override`);
    }

    for (const p of s4.keys()) if (!seen.includes(p)) bad.push(`pos-${pad(p)} is in §4 yet missing from the manifest`);
    for (const p of seen) if (!s4.has(p)) bad.push(`pos-${pad(p)} is in the manifest yet not in §4`);

    /* How many would be scored on the WRONG sheet without the field — the reason
     * it is carried at all. Reported, and required to be non-zero: if it were 0
     * the sheet field would be inert and this manifest would need no defending. */
    const wrongWithout = m.datasets.filter((e) => e.sheet).filter((e) => {
      const names = XLSX.read(readFileSync(join(mainRoot, e.path)), { type: "buffer", bookSheets: true }).SheetNames || [];
      return names[0] !== e.sheet;
    });
    console.log("\n   §4 rows                          :", s4.size);
    console.log("   manifest entries                 :", m.datasets.length);
    console.log("   entries carrying a sheet         :", m.datasets.filter((e) => e.sheet).length, "(the eight workbooks)");
    console.log("   of those, SheetNames[0] is wrong :", wrongWithout.length, "->",
                wrongWithout.map((e) => e.label.match(/^pos-\d+/)[0]).join(", "));
    console.log("   30 = 24 arm-B + 3 unticked + 3 refusals :",
                24 + m.counts.armBOmitsUnticked + m.counts.armBOmitsRefusals === 30);

    if (bad.length) { console.log("\n   DISAGREEMENTS — reported, not resolved:"); for (const b of bad) console.log("     " + b); }
    else console.log("\n   every entry agrees with §4, the §6.2 ranking and the workbook itself");
    expect(bad.join("\n")).toBe("");
    expect(m.datasets.length, "thirty entries").toBe(30);
    expect(wrongWithout.length, "the sheet field would be inert").toBeGreaterThan(0);
  });
});
