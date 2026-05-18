/* Modality Test (Track E (b), §3.8)
   Tests whether each DATA column's empirical distribution is unimodal against a
   multimodal alternative. Uses Hartigan's dip statistic against the
   Hartigan-Hartigan (1985) tabulated uniform-reference null — the uniform is the
   unimodal ceiling, so observed-exceeds-uniform rules out any unimodal distribution.

   Distinct forensic target from §3.6 and §3.7: a column may pass Shannon (correct
   distinct-value count) and Column GoF (correct CDF shape-class) and still be bimodal,
   e.g. a condition fabricated as a mixture of two sources with different central
   tendencies.

   Procedure (METHODOLOGY.md §3.8, v1.0):
   1. Applicability: ≥50 obs, ≥15 distinct values (ordinal skipped upstream).
      Additional γ₂ pre-skip (S107): γ₂ < −1.2 skip (universal), γ₂ < −0.8 at
      N ≥ 100 skip. No γ₁ pre-skip — uniform-reference null is family-agnostic.
   2. Dip statistic: Hartigan's D_N via GCM/LCM construction.
   3. Analytical p-value via R's qDiptab (Hartigan & Hartigan 1985 tabulated
      uniform-reference null quantiles, transcribed from R's diptest package,
      inst/extraData/qDiptab.rds — 21 n-rows × 26 Pr-cols). Replaces the
      pre-S159b B=999 uniform-reference bootstrap (METHODOLOGY pre-S159b §3.8
      step 3). Same statistical target; ~1000× faster on the bootstrap layer.
      Procedure mirrors `diptest::dip.test()`:
        - Bracket the observed n between two table rows n0, n1.
        - Compute y.0 = √n0 · qDiptab[n0,:],  y.1 = √n1 · qDiptab[n1,:],
          interpolate linearly in (n − n0)/(n1 − n0) → y_n.
        - Compare sD = √n · D_obs to y_n; linearly interpolate the corresponding
          Pr; one-sided p = 1 − Pr; clamp at table endpoints (R's rule = 2).
        - n above table ceiling (72000) collapses to the last row treated as
          asymptotic, per R's behaviour. None of our 22 fixtures approach this.
      Bootstrap fallback retired in S159b; PRNG no longer consumed in the
      p-value path.
   4. Clamp: p = max(0.001, min(1.0, raw_p)). The 0.001 floor preserves the
      pre-S159b bootstrap-floor calibration: B=999 gave p ≥ 1/1000, which lands
      at exactly ALPHA.FLAG = 0.001 → Modality caps at MODERATE never HIGH on
      single-column evidence. Without the floor, BH-FDR on a tight multi-column
      multimodal stack could promote analytical p < 1e-4 into HIGH, changing
      the test's flag ceiling.
   5. BH-FDR across applicable columns (separate family from Column GoF per SP4).
   6. Effect-size gate (Tier 2): raw D_obs ≥ 0.04 → MOD+ eligible.

   @param {number[][]} matrix
   @param {{ random, randn }} rng - retained for signature compatibility; unused
     since S159b retired the bootstrap (no PRNG consumption in this test).
   @param {string} dataType - 'continuous' | 'count' | 'ordinal'
   @returns {object}
   @see METHODOLOGY.md §3.8 Modality Test */

import { mean, bhFDR } from "../stats/primitives.js";
import { flagFromP } from "../constants/thresholds.js";

const NAME = "Modality Test";
const CAT  = "shapes";
const DIP_GATE = 0.04;            // effect-size gate per §3.8 step 6
// γ₁ > 1.5 pre-skip is NOT applied to Modality (S107 calibration decision):
// Modality's uniform-reference null is family-agnostic by design, so the skew
// pre-skip that protects §3.7's parametric fit is philosophically mismatched.
// The γ₂ hybrid below is retained to suppress meaningless adj-p ≈ 1 entries on
// near-uniform noise columns (load-bearing for qpcr-style bounded ranges).
const EXKURT_FLOOR = -1.2;
const EXKURT_GATE_HIGHN = -0.8;
const GAMMA_N_ADAPTIVE_THRESHOLD = 100;
const MIN_N = 50;
const MIN_DISTINCT = 15;

// p-value floor preserving the pre-S159b bootstrap calibration (B=999 → p ≥ 0.001).
// See §3.8 step 4 above.
const P_FLOOR = 0.001;

// ── Hartigan-Hartigan (1985) tabulated uniform-reference null quantiles.
// Verbatim transcription of R's `diptest::qDiptab` from `inst/extraData/qDiptab.rds`
// (diptest version 0.77-1, sha cf77d6bf). Indexed [n_row][Pr_col].
// DIPTAB[i][j] = quantile of D_n at sample size DIPTAB_N[i] and CDF level DIPTAB_PR[j].
// The table is sqrt(n)-scaled in the algorithm below (matches R's `dip.test` code path).
const DIPTAB_N = [4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 40000, 72000];
const DIPTAB_PR = [0.0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 0.99, 0.995, 0.998, 0.999, 0.9995, 0.9998, 0.9999, 0.99995, 0.99998, 0.99999, 1.0];
const DIPTAB = [
  /* n=    4 */ [0.1250000000, 0.1250000000, 0.1250000000, 0.1250000000, 0.1250000000, 0.1250000000, 0.1250000000, 0.1250000000, 0.1250000000, 0.1250000000, 0.1325595488, 0.1574973690, 0.1874018788, 0.2072697886, 0.2237558046, 0.2317962589, 0.2372637438, 0.2419928927, 0.2443698390, 0.2459666255, 0.2474395972, 0.2482306597, 0.2487542691, 0.2493020400, 0.2494596523, 0.2497483625],
  /* n=    5 */ [0.1000000000, 0.1000000000, 0.1000000000, 0.1000000000, 0.1000000000, 0.1000000000, 0.1000000000, 0.1087205936, 0.1215637980, 0.1343189187, 0.1472987990, 0.1610850257, 0.1768119985, 0.1863917960, 0.1936125336, 0.1965091398, 0.1981599673, 0.1992442794, 0.1996175274, 0.1998009415, 0.1999170818, 0.1999590291, 0.1999783954, 0.1999931514, 0.1999955250, 0.1999998356],
  /* n=    6 */ [0.0833333333, 0.0833333333, 0.0833333333, 0.0833333333, 0.0833333333, 0.0924514471, 0.1039134311, 0.1138852206, 0.1230711871, 0.1318697339, 0.1405647965, 0.1494192411, 0.1591370646, 0.1647696085, 0.1791765474, 0.1918628280, 0.2021019710, 0.2130157811, 0.2195186273, 0.2243390474, 0.2294493322, 0.2327145304, 0.2365481284, 0.2390887912, 0.2401035664, 0.2446728836],
  /* n=    7 */ [0.0714285714, 0.0714285714, 0.0714285714, 0.0725717816, 0.0817315479, 0.0940590182, 0.1032444908, 0.1109646000, 0.1178078465, 0.1242160868, 0.1304090140, 0.1366396421, 0.1442406690, 0.1599033957, 0.1751965533, 0.1841186591, 0.1910143962, 0.1982167952, 0.2023410107, 0.2053775663, 0.2083065625, 0.2098660479, 0.2109675769, 0.2122333486, 0.2126610383, 0.2135361861],
  /* n=    8 */ [0.0625000000, 0.0625000000, 0.0656911995, 0.0738651136, 0.0820045918, 0.0922700601, 0.0996737190, 0.1057335318, 0.1110351298, 0.1159200557, 0.1205614793, 0.1255587590, 0.1418410670, 0.1539783040, 0.1659785672, 0.1729885283, 0.1790104135, 0.1865043887, 0.1944840412, 0.2008642970, 0.2088499971, 0.2125560404, 0.2171491741, 0.2217000764, 0.2250008354, 0.2337729197],
  /* n=    9 */ [0.0555555556, 0.0613018090, 0.0658615858, 0.0732651143, 0.0803941630, 0.0890432421, 0.0950811420, 0.0999380898, 0.1041535601, 0.1080078024, 0.1125126171, 0.1229150335, 0.1364126394, 0.1466037850, 0.1570840657, 0.1641646437, 0.1728216746, 0.1825552836, 0.1886588331, 0.1940891208, 0.1991570081, 0.2028815984, 0.2059797957, 0.2105411550, 0.2118003310, 0.2153799143],
  /* n=   10 */ [0.0500000000, 0.0610132556, 0.0651627333, 0.0718321620, 0.0779662122, 0.0852835360, 0.0903204174, 0.0943334984, 0.0977817630, 0.1021808667, 0.1099609481, 0.1188447672, 0.1304621496, 0.1396113951, 0.1509617289, 0.1596841589, 0.1671952474, 0.1754195409, 0.1806111958, 0.1852864161, 0.1912030839, 0.1958051593, 0.2002939809, 0.2056510896, 0.2096820488, 0.2215302822],
  /* n=   15 */ [0.0341378172, 0.0546284208, 0.0572191260, 0.0610087368, 0.0642657137, 0.0692234108, 0.0745462114, 0.0792030879, 0.0836210335, 0.0881198482, 0.0931246667, 0.0996694393, 0.1100874969, 0.1187607692, 0.1288904752, 0.1359835686, 0.1424524837, 0.1501728165, 0.1554561337, 0.1608964991, 0.1669794079, 0.1711179352, 0.1759005057, 0.1818566760, 0.1857434542, 0.1922405633],
  /* n=   20 */ [0.0337185636, 0.0474333741, 0.0490891388, 0.0527199982, 0.0567795509, 0.0620134674, 0.0660163872, 0.0696506075, 0.0733437741, 0.0776460663, 0.0824558407, 0.0883446270, 0.0972346018, 0.1051302183, 0.1143097043, 0.1206240433, 0.1265523780, 0.1336013538, 0.1385699038, 0.1433691612, 0.1489401164, 0.1528325382, 0.1560101636, 0.1613192258, 0.1655682559, 0.1758344595],
  /* n=   30 */ [0.0262674485, 0.0395871890, 0.0414574607, 0.0444462614, 0.0473998525, 0.0516677370, 0.0551037519, 0.0582650053, 0.0614510857, 0.0649164408, 0.0689178762, 0.0739249074, 0.0814791379, 0.0881689143, 0.0960564383, 0.1014785589, 0.1065048714, 0.1127246365, 0.1171641402, 0.1214258599, 0.1267330519, 0.1311985789, 0.1336917395, 0.1378316380, 0.1415575096, 0.1638330461],
  /* n=   50 */ [0.0218544781, 0.0314400502, 0.0329008160, 0.0353023819, 0.0377279973, 0.0410699984, 0.0437704599, 0.0462925643, 0.0488511553, 0.0516145898, 0.0548121932, 0.0588230483, 0.0649136324, 0.0702737877, 0.0767095886, 0.0811998415, 0.0852854647, 0.0904847827, 0.0940930107, 0.0974904345, 0.1022842043, 0.1046806243, 0.1074966942, 0.1114088755, 0.1135366077, 0.1178867169],
  /* n=  100 */ [0.0164852597, 0.0228319858, 0.0238917486, 0.0256559538, 0.0273987415, 0.0298109371, 0.0317771497, 0.0336073822, 0.0354621761, 0.0374805845, 0.0398046179, 0.0427283847, 0.0471527833, 0.0511279443, 0.0558022052, 0.0590241323, 0.0620425065, 0.0658016011, 0.0684479731, 0.0709169444, 0.0741183486, 0.0762579403, 0.0785735968, 0.0813458357, 0.0832963014, 0.0926780423],
  /* n=  200 */ [0.0111236389, 0.0165017735, 0.0172594158, 0.0185259426, 0.0197917613, 0.0215233746, 0.0229259770, 0.0242438483, 0.0255843583, 0.0270252130, 0.0286920262, 0.0308006766, 0.0339967814, 0.0368418414, 0.0402729850, 0.0426864800, 0.0449589592, 0.0477643874, 0.0497198002, 0.0516114612, 0.0540543979, 0.0558704526, 0.0573877056, 0.0593365902, 0.0607646310, 0.0705309108],
  /* n=  500 */ [0.0075548860, 0.0106403461, 0.0111255573, 0.0119353655, 0.0127411306, 0.0138524543, 0.0147536004, 0.0155963186, 0.0164519238, 0.0173830579, 0.0184503950, 0.0198162680, 0.0218781313, 0.0237294743, 0.0259195790, 0.0274518023, 0.0288986370, 0.0306813505, 0.0320170997, 0.0332452747, 0.0348335699, 0.0359832389, 0.0369051996, 0.0387221159, 0.0399302591, 0.0431448164],
  /* n= 1000 */ [0.0054165813, 0.0076028675, 0.0079498783, 0.0085216518, 0.0090977561, 0.0098892452, 0.0105309297, 0.0111322727, 0.0117439009, 0.0124050333, 0.0131684179, 0.0141377943, 0.0156148055, 0.0169343970, 0.0185130674, 0.0196080260, 0.0206489569, 0.0219285177, 0.0228689169, 0.0237387101, 0.0248334159, 0.0256126573, 0.0265491337, 0.0275784301, 0.0284430733, 0.0313640942],
  /* n= 2000 */ [0.0039044000, 0.0054166418, 0.0056617139, 0.0060712097, 0.0064762536, 0.0070357310, 0.0074942125, 0.0079208789, 0.0083557372, 0.0088243933, 0.0093678582, 0.0100560460, 0.0111019117, 0.0120380990, 0.0131721011, 0.0139655122, 0.0146889122, 0.0156076780, 0.0162685616, 0.0168874938, 0.0176505093, 0.0181944265, 0.0186226038, 0.0193001797, 0.0196241518, 0.0213081254],
  /* n= 5000 */ [0.0024565779, 0.0034480928, 0.0036047394, 0.0038632655, 0.0041208951, 0.0044764005, 0.0047655569, 0.0050370403, 0.0053123925, 0.0056092992, 0.0059535273, 0.0063909228, 0.0070556613, 0.0076506368, 0.0083682169, 0.0088635789, 0.0093416279, 0.0099321864, 0.0103498795, 0.0107780907, 0.0113184317, 0.0117329446, 0.0119995949, 0.0124410052, 0.0129467397, 0.0143960638],
  /* n=10000 */ [0.0017495427, 0.0024459513, 0.0025571080, 0.0027399096, 0.0029225481, 0.0031737464, 0.0033807226, 0.0035724388, 0.0037673472, 0.0039788501, 0.0042243001, 0.0045343751, 0.0050017881, 0.0054237224, 0.0059265668, 0.0062803473, 0.0066103064, 0.0070225470, 0.0073182263, 0.0076065423, 0.0079564037, 0.0082270525, 0.0085224099, 0.0089286391, 0.0091385393, 0.0095223458],
  /* n=20000 */ [0.0011945881, 0.0017343535, 0.0018119443, 0.0019425947, 0.0020717372, 0.0022499320, 0.0023952083, 0.0025303679, 0.0026686317, 0.0028181999, 0.0029913755, 0.0032102490, 0.0035436222, 0.0038433019, 0.0042025880, 0.0044577490, 0.0046946151, 0.0049941607, 0.0052091776, 0.0054039624, 0.0056454020, 0.0058046079, 0.0059977474, 0.0063309925, 0.0065698711, 0.0068582945],
  /* n=40000 */ [0.0008524156, 0.0012288348, 0.0012846930, 0.0013761765, 0.0014675150, 0.0015937645, 0.0016966845, 0.0017925342, 0.0018906126, 0.0019964547, 0.0021192975, 0.0022745770, 0.0025099908, 0.0027237507, 0.0029807296, 0.0031594219, 0.0033273653, 0.0035398897, 0.0036940005, 0.0038334572, 0.0040079347, 0.0041489274, 0.0042839159, 0.0044187010, 0.0045081860, 0.0051347747],
  /* n=72000 */ [0.0006444001, 0.0009168722, 0.0009579329, 0.0010264186, 0.0010949515, 0.0011890409, 0.0012657520, 0.0013375097, 0.0014104971, 0.0014893671, 0.0015802754, 0.0016965164, 0.0018730618, 0.0020317840, 0.0022235610, 0.0023578281, 0.0024834358, 0.0026421083, 0.0027524322, 0.0028608571, 0.0029869504, 0.0030934009, 0.0031993277, 0.0033268823, 0.0033931609, 0.0037633170],
];

/** Analytical p-value for Hartigan's dip statistic, mirroring R's
 *  `diptest::dip.test()` (table-based, no simulation).
 *  @param {number} n - sample size (length of the sorted vector input to hartiganDip).
 *  @param {number} D - observed dip statistic.
 *  @returns {number} one-sided p-value ∈ [P_FLOOR, 1]. */
function dipPValue(n, D) {
  if (!(n > 0) || !isFinite(D) || D <= 0) return 1;
  const maxN = DIPTAB_N[DIPTAB_N.length - 1];

  // Bracket n between two table rows. R uses findInterval; replicated here.
  let i0;
  if (n >= maxN) {
    // Above table ceiling — use last row as asymptotic (matches R behaviour).
    i0 = DIPTAB_N.length - 1;
  } else if (n <= DIPTAB_N[0]) {
    // Below table floor — n < 4 already short-circuited by hartiganDip → 0.
    i0 = 0;
  } else {
    // findInterval: greatest i such that DIPTAB_N[i] ≤ n.
    i0 = 0;
    for (let i = 0; i < DIPTAB_N.length - 1; i++) {
      if (DIPTAB_N[i] <= n && n < DIPTAB_N[i + 1]) { i0 = i; break; }
    }
  }
  const i1 = i0 + 1 < DIPTAB_N.length ? i0 + 1 : i0;
  const n0 = DIPTAB_N[i0], n1 = DIPTAB_N[i1];
  const fN = n1 > n0 ? (n - n0) / (n1 - n0) : 0;

  // Interpolated y array = sqrt(n0)*qDiptab[i0,:] + fN * (sqrt(n1)*qDiptab[i1,:] - sqrt(n0)*qDiptab[i0,:]).
  // R: y.0 + fN*(y.1 - y.0).
  const sqrtN0 = Math.sqrt(n0), sqrtN1 = Math.sqrt(n1);
  const row0 = DIPTAB[i0], row1 = DIPTAB[i1];
  const m = DIPTAB_PR.length;
  const y = new Float64Array(m);
  for (let j = 0; j < m; j++) {
    const y0 = sqrtN0 * row0[j];
    const y1 = sqrtN1 * row1[j];
    y[j] = y0 + fN * (y1 - y0);
  }

  // sD = sqrt(n) * D; linearly interpolate the CDF level Pr from y → DIPTAB_PR.
  // Clamp at endpoints (matches R's rule = 2): sD below y[0] → Pr = PR[0] = 0,
  // sD above y[last] → Pr = PR[last] = 1.
  const sD = Math.sqrt(n) * D;
  let Pr;
  if (sD <= y[0]) {
    Pr = DIPTAB_PR[0];
  } else if (sD >= y[m - 1]) {
    Pr = DIPTAB_PR[m - 1];
  } else {
    // Find bracket [j, j+1] with y[j] ≤ sD < y[j+1].
    let j = 0;
    for (let k = 0; k < m - 1; k++) {
      if (y[k] <= sD && sD < y[k + 1]) { j = k; break; }
    }
    const frac = (sD - y[j]) / (y[j + 1] - y[j]);
    Pr = DIPTAB_PR[j] + frac * (DIPTAB_PR[j + 1] - DIPTAB_PR[j]);
  }

  const p = 1 - Pr;
  // Clamp to preserve pre-S159b bootstrap floor (§3.8 step 4).
  if (p < P_FLOOR) return P_FLOOR;
  if (p > 1) return 1;
  return p;
}

export function testModality(matrix, rng, dataType) {
  if (dataType === "ordinal") {
    return { name: NAME, category: CAT, flag: "N/A",
      description: "Not applicable to ordinal data — Hartigan dip is not meaningful on sparse discrete support." };
  }

  const nR = matrix.length;
  const nC = matrix[0]?.length || 0;
  if (nC < 1) return { name: NAME, category: CAT, flag: "N/A", description: "No DATA columns." };

  const isCount = dataType === "count";
  const columnResults = [];

  for (let ci = 0; ci < nC; ci++) {
    const vals = [];
    for (let ri = 0; ri < nR; ri++) {
      const v = matrix[ri][ci];
      if (v != null && isFinite(v)) vals.push(v);
    }

    if (vals.length < MIN_N) {
      columnResults.push({ col: ci, skip: true, reason: `< ${MIN_N} observations` });
      continue;
    }
    const distinct = new Set(vals).size;
    if (distinct < MIN_DISTINCT) {
      columnResults.push({ col: ci, skip: true, reason: `< ${MIN_DISTINCT} distinct values` });
      continue;
    }

    // γ₂ pre-skip only (S107 calibration). Continuous only; count data has its own
    // shape constraints. No γ₁ gate — uniform-reference null handles skewed shapes
    // conservatively by construction.
    let g1 = NaN, g2 = NaN;
    if (!isCount) {
      const mu = mean(vals);
      const { m2, m3, m4 } = centralMoments(vals, mu);
      g1 = m2 > 0 ? m3 / Math.pow(m2, 1.5) : 0;
      g2 = m2 > 0 ? m4 / (m2 * m2) - 3 : 0;
      const kurtFailFloor = g2 < EXKURT_FLOOR;
      const kurtFailHighN = g2 < EXKURT_GATE_HIGHN && vals.length >= GAMMA_N_ADAPTIVE_THRESHOLD;
      if (kurtFailFloor || kurtFailHighN) {
        columnResults.push({ col: ci, skip: true,
          reason: `Pre-skip: γ₂=${g2.toFixed(2)} — near-uniform shape would dominate the uniform-reference null`,
          g1, g2 });
        continue;
      }
    }

    const sorted = vals.slice().sort((a, b) => a - b);
    const D_obs = hartiganDip(sorted);

    // S159b: analytical p via dipPValue (replaces B=999 uniform-reference
    // bootstrap). See §3.8 step 3-4 in the file header.
    const rawP = dipPValue(vals.length, D_obs);

    columnResults.push({
      col: ci, skip: false,
      n: vals.length, distinct, g1, g2,
      D_obs, rawP,
    });
  }

  const tested = columnResults.filter(c => !c.skip);
  const skipped = columnResults.filter(c => c.skip);

  if (tested.length === 0) {
    return { name: NAME, category: CAT, flag: "N/A",
      description: `All columns routed to N/A (${skipped.length} columns; most common: ${skipped[0]?.reason || "n/a"}).`,
      skippedColumns: skipped.map(s => ({ col: s.col + 1, reason: s.reason })) };
  }

  const rawPs = tested.map(c => c.rawP);
  const adjPs = bhFDR(rawPs);
  for (let i = 0; i < tested.length; i++) tested[i].adjP = adjPs[i];

  for (const c of tested) {
    c.flag = c.D_obs >= DIP_GATE ? flagFromP(c.adjP) : "LOW";
  }

  const primaryP = Math.min(...adjPs);
  const flaggedCols = tested.filter(c => c.flag === "HIGH" || c.flag === "MODERATE");
  const flag = flaggedCols.length > 0 ? flagFromP(Math.min(...flaggedCols.map(c => c.adjP))) : "LOW";

  const details = tested
    .filter(c => c.flag !== "LOW")
    .sort((a, b) => a.adjP - b.adjP)
    .slice(0, 30)
    .map(c => ({
      Col: c.col + 1,
      Dip: c.D_obs.toFixed(4),
      adjP: c.adjP,
    }));

  const colDips = tested.map(c => ({
    col: c.col + 1, dip: c.D_obs,
    flagged: c.flag === "HIGH" || c.flag === "MODERATE",
  }));

  const fewColumns = tested.length < 5;

  return {
    name: NAME, category: CAT, flag, primaryP,
    description: "Hartigan's dip statistic tests each column for unimodality against a uniform-reference bootstrap null. " +
      "Uniform is the unimodal ceiling — observed dip exceeding the uniform ceiling rules out any unimodal distribution " +
      "and is a strong fingerprint of mixture fabrication (two sources combined into one declared condition).",
    nTested: tested.length,
    nSkipped: skipped.length,
    nFlagged: flaggedCols.length,
    fewColumnsNote: fewColumns ? "Fewer than 5 columns tested — BH-FDR correction may be conservative." : null,
    colDips,
    details,
    skippedColumns: skipped.map(s => ({ col: s.col + 1, reason: s.reason })),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Central moments m₂, m₃, m₄ (biased /N denominator — matches γ₁/γ₂ convention). */
function centralMoments(vals, mu) {
  let m2 = 0, m3 = 0, m4 = 0;
  for (const v of vals) {
    const d = v - mu;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }
  const N = vals.length;
  return { m2: m2 / N, m3: m3 / N, m4: m4 / N };
}

/** Hartigan's dip statistic via mode-enumeration over data points.
 *  For each candidate mode index k, computes max(F − GCM) on the left prefix
 *  and max(LCM − F) on the right suffix; dip_k = max of the two maxima. The
 *  dip is (1/2) · min over k of dip_k. Reference: Hartigan & Hartigan (1985).
 *  @param {number[]} sorted - Values in ascending order.
 *  @returns {number} D_N ∈ [0, 1/4]. */
function hartiganDip(sorted) {
  const n = sorted.length;
  if (n < 4) return 0;

  // Precompute GCM-prefix max deviations and LCM-suffix max deviations.
  // leftMaxDev[k] = max over i ∈ [0, k] of (F_n(x_i) − gcm_{[0,k]}(x_i))
  // rightMaxDev[k] = max over i ∈ [k, n−1] of (lcm_{[k,n−1]}(x_i) − F_n(x_i))
  // We compute each in O(n²) via one hull construction per prefix/suffix.
  const leftMaxDev = new Float64Array(n);
  const rightMaxDev = new Float64Array(n);

  for (let k = 1; k < n; k++) {
    leftMaxDev[k] = maxDevAboveHull(sorted, 0, k, n, /* isGCM = */ true);
  }
  for (let k = n - 2; k >= 0; k--) {
    rightMaxDev[k] = maxDevAboveHull(sorted, k, n - 1, n, /* isGCM = */ false);
  }

  // Find min over k of max(leftMaxDev[k], rightMaxDev[k]).
  let minDip = Infinity;
  for (let k = 1; k < n - 1; k++) {
    const cand = Math.max(leftMaxDev[k], rightMaxDev[k]);
    if (cand < minDip) minDip = cand;
  }
  return Number.isFinite(minDip) ? minDip / 2 : 0;
}

/** Build a monotone hull (GCM or LCM) over the range [a, b] of sorted values and
 *  return the maximum vertical deviation between F_n and the hull.
 *  - isGCM = true: convex hull from below (slopes non-decreasing); returns max(F − hull).
 *  - isGCM = false: concave hull from above (slopes non-increasing); returns max(hull − F).
 *  F_n(x_i) = (i + 1) / n (right-continuous empirical CDF at the i-th sorted value). */
function maxDevAboveHull(x, a, b, n, isGCM) {
  if (b - a < 2) return 0;

  // Build hull indices via monotone stack.
  const hull = [a];
  for (let i = a + 1; i <= b; i++) {
    while (hull.length >= 2) {
      const p2 = hull[hull.length - 1];
      const p1 = hull[hull.length - 2];
      const dx12 = x[p2] - x[p1];
      const dx2i = x[i]  - x[p2];
      // Skip duplicate-x collapses.
      if (dx12 === 0) { hull.pop(); continue; }
      if (dx2i === 0) { break; }
      // Slope comparison via cross-multiplication (no division).
      // GCM: require slope(p1,p2) ≤ slope(p2,i) → remove p2 if slope(p1,p2) > slope(p2,i)
      //   i.e., (p2-p1) * dx2i > (i-p2) * dx12
      // LCM: require slope(p1,p2) ≥ slope(p2,i) → remove p2 if slope(p1,p2) < slope(p2,i)
      //   i.e., (p2-p1) * dx2i < (i-p2) * dx12
      const lhs = (p2 - p1) * dx2i;
      const rhs = (i  - p2) * dx12;
      const drop = isGCM ? lhs > rhs : lhs < rhs;
      if (drop) hull.pop();
      else break;
    }
    hull.push(i);
  }

  // Compute max deviation along each hull segment.
  let maxDev = 0;
  for (let s = 0; s < hull.length - 1; s++) {
    const p1 = hull[s], p2 = hull[s + 1];
    const x1 = x[p1], x2 = x[p2];
    const dx = x2 - x1;
    if (dx === 0) continue;
    const F1 = (p1 + 1) / n;
    const F2 = (p2 + 1) / n;
    const slope = (F2 - F1) / dx;
    for (let i = p1 + 1; i < p2; i++) {
      const line = F1 + (x[i] - x1) * slope;
      const Fi = (i + 1) / n;
      const dev = isGCM ? Fi - line : line - Fi;
      if (dev > maxDev) maxDev = dev;
    }
  }
  return maxDev;
}
