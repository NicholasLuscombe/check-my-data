/* S397 — generate arm A's corpus-run manifest from ROUND2-RUN-LOG.md §4.
 *
 * GENERATED, NOT TRANSCRIBED, on 4a28354's discipline.
 *
 * WHY ARM A NEEDS ONE AT ALL. §7 runs arm A on the §6.2-selected sheet.
 * `corpus-run.mjs`'s `readRawMatrix` (:124-131) passes `entry.sheet` to
 * `parseExcel`, and `parseExcel` falls back to `wb.SheetNames[0]` when it is
 * absent. On FIVE of the eight workbooks SheetNames[0] is NOT the §6.2 sheet —
 * pos-01 (Initial MORB vs 1300-3), pos-14 (Figure 1 vs Figure 2), pos-18
 * (Metadata vs Floral_M), pos-31 (Females vs Males), pos-39 (FIG3_metadata vs
 * FIG3A) — so without an explicit sheet arm A would score the wrong sheet on
 * five deposits.
 *
 * AND THE EXISTING ARTIFACT DOES NOT DO IT. `corpus-out/round2-manifest-entries.json`
 * holds 199 entries, one per FILE across all 39 positions, carrying `path` and
 * `label` and NO sheet on any of them. It is the `--inventory` input, not this.
 *
 * THIRTY ENTRIES, NOT ARM B's 24. Arm A scores the three refusals — §14.3, and
 * `corpus-run.mjs` does not go through `ImportView`, so the import floor that
 * refuses pos-02, pos-44 and pos-47 is not on its path — and it answers no
 * confirm gate at all, so the three unticked deposits cost it nothing. Neither
 * of arm B's omission sets applies here.
 *
 * NO ANSWERS ARE CARRIED, and that is what makes it arm A. `buildAnalysisConfig`
 * hardcodes `colRelationship: 'replicates'` (:246) and takes `rowSemantics` from
 * `rsSuggestion.value || 'ordered'` (:243). A manifest that supplied either
 * would stop being the defaults arm. No assay, dataType or vst override either.
 *
 * PATHS ARE RELATIVE, matching `round2-manifest-entries.json`, so the runner is
 * invoked from the MAIN CHECKOUT root — `corpus-data/` is gitignored and exists
 * there and in no worktree.
 *
 * Usage: node test/probes/build-s397-arma-manifest.mjs [outfile]
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

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
const text = readFileSync(join(repoRoot, "docs/shared/ROUND2-RUN-LOG.md"), "utf-8");
const s4 = text.slice(text.indexOf("\n## 4 —"), text.indexOf("\n## 5 —"));
const rows = s4.split("\n").filter((l) => /^\| \d+ \|/.test(l))
  .map((l) => { const f = l.split("|").map((x) => x.trim());
    return { pos: +f[1], file: f[3], sheet: f[4], colRel: f[6], confirm: f[8] }; });
if (rows.length !== 30) throw new Error(`§4 holds ${rows.length} rows, expected 30`);

const rank = JSON.parse(readFileSync(join(repoRoot, "docs/shared/round2-raw/round2-ranking.json"), "utf-8"));
const isExcel = (f) => ["xlsx", "xls"].includes((f.split(".").pop() || "").toLowerCase());
const pad = (p) => String(p).padStart(2, "0");

const entries = rows.map((r) => {
  const e = { label: `pos-${pad(r.pos)} ${r.file}` + (isExcel(r.file) ? ` :: ${r.sheet}` : ""),
              path: `corpus-data/round2/pos-${pad(r.pos)}/${r.file}` };
  if (isExcel(r.file)) e.sheet = r.sheet;   // consumed only on the Excel branch
  return e;
});

const refusals = rows.filter((r) => !/^(replicates|conditions)\b/.test(r.colRel)).map((r) => `pos-${pad(r.pos)}`);
const unticked = rows.filter((r) => /unticked/.test(r.confirm)).map((r) => `pos-${pad(r.pos)}`);

const payload = {
  generatedBy: "test/probes/build-s397-arma-manifest.mjs",
  source: "docs/shared/ROUND2-RUN-LOG.md §4; sheet cross-checked against docs/shared/round2-raw/round2-ranking.json",
  note: "Arm A. No gate answers: corpus-run.mjs hardcodes colRelationship 'replicates' and takes " +
        "rowSemantics from suggestRowSemantics, so supplying either would stop this being the defaults arm. " +
        "Run from the main checkout root — paths are relative and corpus-data/ is gitignored there.",
  counts: { s4Rows: rows.length, entries: entries.length, excelEntriesWithSheet: entries.filter((e) => e.sheet).length,
            armBEntries: 24, armBOmitsRefusals: refusals.length, armBOmitsUnticked: unticked.length },
  alsoScoredHereButNotByArmB: { refusals, unticked },
  datasets: entries,
};
const out = process.argv[2];
const json = JSON.stringify(payload, null, 2) + "\n";
if (out) { writeFileSync(out, json); console.error(`written ${out}`); } else process.stdout.write(json);
console.error(`§4 rows ${rows.length} -> ${entries.length} entries (${payload.counts.excelEntriesWithSheet} carry a sheet)`);
console.error(`arm B's 24 + unticked ${unticked.length} + refusals ${refusals.length} = ${24 + unticked.length + refusals.length}`);
for (const r of rows) {
  const sel = rank.ranking.find((x) => x.position === r.pos)?.ranked?.[0];
  if (sel && sel.file !== r.file) console.error(`  RANKING DISAGREES on file: pos-${pad(r.pos)} §4 ${r.file} vs ${sel.file}`);
  if (sel && sel.sheet !== r.sheet) console.error(`  RANKING DISAGREES on sheet: pos-${pad(r.pos)} §4 ${r.sheet} vs ${sel.sheet}`);
}
