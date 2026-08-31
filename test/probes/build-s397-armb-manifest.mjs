/* S397 — generate arm B's ARMB_MANIFEST from ROUND2-RUN-LOG.md §4.
 *
 * GENERATED, NOT TRANSCRIBED. The run log's §4 is the record of what was
 * answered; this reads it and emits the manifest `probe-s390-armb-spike.test.jsx`
 * part 4 consumes. Nothing here decides an answer — §4 decided them, before any
 * deposit was scored, and a transcription would be a second copy free to drift.
 *
 * WHAT IS OMITTED, AND WHY EACH IS NOT A DRIVABLE ENTRY.
 *   - THE THREE REFUSALS. §4 records `gate did not render` in the column-
 *     relationship cell itself, which is what the import floor's refusal looks
 *     like: nothing to answer. pos-02, pos-44, pos-47 (§15.1).
 *   - THE THREE UNTICKED. §4 records `confirmed with N unticked`, and `runArm`'s
 *     `confirm` reaches the card's two buttons and none of its checkboxes
 *     (ROUND2 §8.5.5), so the answer cannot be expressed from a manifest.
 *     pos-08, pos-31, pos-40 route to §8.1's hand-run.
 *
 * THE SHEET FIELD. `runArm` consults it only when the product raises a sheet
 * picker, which is workbooks only; §4 records a CSV's "sheet" as its own
 * filename. Emitted as null for non-Excel so the manifest cannot be read as
 * naming a sheet that does not exist.
 *
 * Usage: node test/probes/build-s397-armb-manifest.mjs [outfile]
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";

const root = dirname(execSync("git rev-parse --path-format=absolute --git-common-dir",
  { encoding: "utf-8" }).trim());
const LOG = join(root, "docs/shared/ROUND2-RUN-LOG.md");
const RANK = join(root, "docs/shared/round2-raw/round2-ranking.json");

const text = readFileSync(LOG, "utf-8");
const s4 = text.slice(text.indexOf("\n## 4 —"), text.indexOf("\n## 5 —"));
const rows = s4.split("\n").filter((l) => /^\| \d+ \|/.test(l))
  .map((l) => { const f = l.split("|").map((x) => x.trim());
    return { line: l, pos: +f[1], doi: f[2], file: f[3], sheet: f[4],
             sheetIdx: f[5], colRel: f[6], rowSem: f[7], confirm: f[8] }; });

if (rows.length !== 30) throw new Error(`§4 holds ${rows.length} rows, expected 30`);

const first = (s) => (s.match(/^[a-z]+/) || [""])[0];
const isExcel = (f) => ["xlsx", "xls"].includes((f.split(".").pop() || "").toLowerCase());

const refusals = rows.filter((r) => !/^(replicates|conditions)\b/.test(r.colRel));
const unticked = rows.filter((r) => /unticked/.test(r.confirm));
const drivable = rows.filter((r) => !refusals.includes(r) && !unticked.includes(r));

const rank = JSON.parse(readFileSync(RANK, "utf-8"));
const entries = drivable.map((r) => {
  const e = {
    label: `pos-${String(r.pos).padStart(2, "0")} ${r.file}` + (isExcel(r.file) ? ` :: ${r.sheet}` : ""),
    file: `round2/pos-${String(r.pos).padStart(2, "0")}/${r.file}`,
    sheet: isExcel(r.file) ? r.sheet : null,
    colRel: first(r.colRel),
    rowSem: first(r.rowSem),
  };
  if (/^confirmed as offered/.test(r.confirm)) e.confirm = "confirm";
  // Cross-check the sheet against the committed §6.2 ranking, a second source.
  const sel = rank.ranking.find((x) => x.position === r.pos)?.ranked?.[0];
  e._rankFile = sel?.file ?? null; e._rankSheet = sel?.sheet ?? null;
  return e;
});

const out = process.argv[2];
const payload = {
  generatedBy: "test/probes/build-s397-armb-manifest.mjs",
  source: "docs/shared/ROUND2-RUN-LOG.md §4",
  counts: { s4Rows: rows.length, refusals: refusals.length, unticked: unticked.length,
            answered: rows.length - refusals.length, entries: entries.length },
  omitted: {
    refusals: refusals.map((r) => `pos-${String(r.pos).padStart(2, "0")} ${r.file}`),
    unticked: unticked.map((r) => `pos-${String(r.pos).padStart(2, "0")} ${r.file} — ${r.confirm.split(" —")[0]}`),
  },
  entries: entries.map(({ _rankFile, _rankSheet, ...e }) => e),
};
const json = JSON.stringify(payload, null, 2) + "\n";
if (out) { writeFileSync(out, json); console.error(`written ${out}`); } else process.stdout.write(json);

console.error(`§4 rows ${rows.length} = entries ${entries.length} + unticked ${unticked.length} + refusals ${refusals.length}`);
for (const e of entries) if (e._rankFile && e._rankFile !== e.file.split("/").pop())
  console.error(`  RANKING DISAGREES on file: ${e.label} — §4 ${e.file} vs ranking ${e._rankFile}`);
for (const e of entries) if (e.sheet && e._rankSheet && e.sheet !== e._rankSheet)
  console.error(`  RANKING DISAGREES on sheet: ${e.label} — §4 ${e.sheet} vs ranking ${e._rankSheet}`);
