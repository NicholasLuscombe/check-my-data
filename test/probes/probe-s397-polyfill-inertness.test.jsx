/* S397 Part C — ROUND2 §8.3's assertion, scoped by §18.
 *
 * §8.3 requires, per deposit: `parseExcel` through the polyfill against
 * `parseExcel` on a buffer read from disk, same workbook, same sheet —
 * IDENTICAL, or the run stops and the deposit is not scored. It did not exist
 * when §8.3 was written, nor at `10fb958`. This is it.
 *
 * §18 SCOPES IT TO THE EIGHT xlsx DEPOSITS and requires the other 22 to be
 * recorded INAPPLICABLE WITH THEIR REASON rather than silently skipped — a
 * skipped check and an inapplicable one look identical in a log.
 *
 * THIS IS NOT AN ARM. No analysis runs, no gate is answered, no verdict is
 * produced and nothing is scored. It reads each deposit's bytes twice and
 * compares. Reading the eight is the assertion's whole purpose.
 *
 * THE THIRTY are generated from `ROUND2-RUN-LOG.md` §4's table — position,
 * file, sheet — so the list is the run log's and not a second copy of it.
 * Cross-checked at authoring: 30 rows, 8 xlsx + 21 csv + 1 tsv, and the eight
 * are §18's own pos-01, 08, 14, 18, 21, 27, 31, 39.
 *
 * NOT IN A DEFAULT LANE. Gated on POLYFILL=1 so `npm test` collects and skips.
 * Run: POLYFILL=1 npx vitest run test/probes/probe-s397-polyfill-inertness.test.jsx
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import { assertPolyfillInert, installCountingPolyfill } from "./s397-polyfill-inertness.mjs";

const ENABLED = !!process.env.POLYFILL;

function corpusDir() {
  if (process.env.CORPUS_DIR) return process.env.CORPUS_DIR;
  const common = execSync("git rev-parse --path-format=absolute --git-common-dir",
    { encoding: "utf-8" }).trim();
  return join(dirname(common), "corpus-data");
}

/* Generated from ROUND2-RUN-LOG.md §4. */
const THIRTY = [
  { pos: "pos-01", file: "micro_data_compiled.xlsx", sheet: "1300-3" },
  { pos: "pos-02", file: "os_cells_new.csv", sheet: "os_cells_new.csv" },
  { pos: "pos-03", file: "OpilionesChemicalCues_v2(data).csv", sheet: "OpilionesChemicalCues_v2(data).csv" },
  { pos: "pos-07", file: "data_complete.csv", sheet: "data_complete.csv" },
  { pos: "pos-08", file: "ECS-SA_(Affinity).xlsx", sheet: "Protein-Peptide Info" },
  { pos: "pos-12", file: "Non-target_OUTs.csv", sheet: "Non-target_OUTs.csv" },
  { pos: "pos-14", file: "Rawdata_Figures_Tables_TSA.xlsx", sheet: "Figure 2" },
  { pos: "pos-18", file: "Data_2022.xlsx", sheet: "Floral_M" },
  { pos: "pos-21", file: "FEMS_dryad_v2_published.xlsx", sheet: "Data" },
  { pos: "pos-22", file: "pgls_all_genera.csv", sheet: "pgls_all_genera.csv" },
  { pos: "pos-23", file: "05_hydrodynamic_daily_outputs.csv", sheet: "05_hydrodynamic_daily_outputs.csv" },
  { pos: "pos-27", file: "radMS_table_1.xlsx", sheet: "Sheet1" },
  { pos: "pos-28", file: "dominance_data.csv", sheet: "dominance_data.csv" },
  { pos: "pos-30", file: "ips_density_Goundar_et_al_2026_Where_are_they_now.csv", sheet: "ips_density_Goundar_et_al_2026_Where_are_they_now.csv" },
  { pos: "pos-31", file: "MC_Drosophila_hydei.xlsx", sheet: "Males" },
  { pos: "pos-32", file: "XLarge_All_Pod_Inference_data.csv", sheet: "XLarge_All_Pod_Inference_data.csv" },
  { pos: "pos-34", file: "Sperm_morphological_data.csv", sheet: "Sperm_morphological_data.csv" },
  { pos: "pos-35", file: "AgeRelatedChangesInAcousticCues_data.csv", sheet: "AgeRelatedChangesInAcousticCues_data.csv" },
  { pos: "pos-38", file: "Nightly_Capture_Rates_Spp_Updated.csv", sheet: "Nightly_Capture_Rates_Spp_Updated.csv" },
  { pos: "pos-39", file: "FIG3.xlsx", sheet: "FIG3A" },
  { pos: "pos-40", file: "13._b_Planctomycetota_asv.csv", sheet: "13._b_Planctomycetota_asv.csv" },
  { pos: "pos-41", file: "SNPeffect_BSLMM_allvar.csv", sheet: "SNPeffect_BSLMM_allvar.csv" },
  { pos: "pos-43", file: "Isoodon_data_raw_only.csv", sheet: "Isoodon_data_raw_only.csv" },
  { pos: "pos-44", file: "subset_dets.csv", sheet: "subset_dets.csv" },
  { pos: "pos-45", file: "FF_blank.csv", sheet: "FF_blank.csv" },
  { pos: "pos-46", file: "full_chemistry_wMeta.csv", sheet: "full_chemistry_wMeta.csv" },
  { pos: "pos-47", file: "seed-density.csv", sheet: "seed-density.csv" },
  { pos: "pos-49", file: "data_R.csv", sheet: "data_R.csv" },
  { pos: "pos-50", file: "Assemblies_and_species.tsv", sheet: "Assemblies_and_species.tsv" },
  { pos: "pos-51", file: "Pieris_phenotype.csv", sheet: "Pieris_phenotype.csv" },];

describe("S397 Part C — §8.3's assertion, scoped by §18", () => {
  it.skipIf(!ENABLED)("runs on the eight, records the other 22 inapplicable", async () => {
    console.log("   polyfill:", installCountingPolyfill());
    expect(THIRTY.length, "the thirty").toBe(30);

    const out = [];
    for (const d of THIRTY) {
      const path = join(corpusDir(), "round2", d.pos, d.file);
      expect(existsSync(path), `deposit missing: ${path}`).toBe(true);
      out.push({ ...d, r: await assertPolyfillInert({ path, sheet: d.sheet }) });
    }

    const app = out.filter((x) => x.r.applicable);
    const inapp = out.filter((x) => !x.r.applicable);

    console.log("\n   APPLICABLE — §8.3 asserted, and blocking (§18)");
    console.log("   pos      file                                 sheet                  rows x cols   A/B polyfill  identical  ok");
    for (const x of app) {
      const r = x.r;
      console.log("   " + x.pos.padEnd(9) + r.file.padEnd(37) + String(r.sheet).padEnd(23) +
        `${r.rows} x ${r.cols}`.padEnd(14) + `${r.polyfillCallsA}/${r.polyfillCallsB}`.padEnd(14) +
        String(r.identical).padEnd(11) + (r.ok ? "PASS" : "FAIL — " + r.reason));
      if (r.ok) console.log("             sha256 " + r.sha256Polyfill.slice(0, 32) + " on both paths");
    }
    console.log("\n   INAPPLICABLE — recorded with its reason, NOT skipped (§18)");
    for (const x of inapp)
      console.log("   " + x.pos.padEnd(9) + x.r.file.padEnd(48) + "." + x.r.ext);
    console.log("   reason, identical on all " + inapp.length + ": " + (inapp[0]?.r.reason || "-"));

    console.log(`\n   split: ${app.length} applicable / ${inapp.length} inapplicable (§18 predicts 8 / 22)`);

    /* NEGATIVE CONTROL. An assertion that has never failed is not an assertion.
     * One cell of one side is corrupted and the same call must refuse. */
    const first = app[0];
    const bad = await assertPolyfillInert({
      path: join(corpusDir(), "round2", first.pos, first.file), sheet: first.sheet, _corrupt: true });
    console.log(`\n   negative control on ${first.pos}: ok=${bad.ok} - ${bad.reason}`);
    expect(bad.ok, "the corrupted comparison passed — the assertion asserts nothing").toBe(false);
    expect(bad.reason).toMatch(/^MISMATCH at row 0 col 0/);

    // §18's split, and §8.3's requirement on the eight.
    expect(app.length, "applicable deposits").toBe(8);
    expect(inapp.length, "inapplicable deposits").toBe(22);
    for (const x of app) {
      expect(x.r.identical, `${x.pos}: the two paths differ — ${x.r.reason}`).toBe(true);
      expect(x.r.polyfillCallsA, `${x.pos}: path A never went through the polyfill`).toBeGreaterThanOrEqual(1);
      expect(x.r.polyfillCallsB, `${x.pos}: path B went through the polyfill`).toBe(0);
    }
    for (const x of inapp) expect(x.r.reason).toMatch(/not an Excel deposit/);
  }, 900000);
});
