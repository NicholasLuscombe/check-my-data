/* Per-subject residual noise-scale dispersion — the `s` estimator.
 *
 * Lifted out of test/gen-copy-fidelity.mjs at S352, ARITHMETIC UNCHANGED. It had
 * been living inside the copy-fidelity generator, so measuring `s` on anything
 * else meant importing a data generator to borrow one function from it. The
 * generator now imports it back and re-exports it, so every existing caller
 * keeps working and no probe had to change.
 *
 * Nothing here was re-derived. The function body and both helpers are the S351
 * text, moved. The move was checked against fixed heteroscedastic input at 17
 * significant digits before and after.
 *
 * ── The two estimators are ONE function at two arities ─────────────────────
 *
 *   cross-condition   residualScaleDispersion([A, B, ...])
 *                     Pools each subject's residuals across every condition, so
 *                     a subject contributes sum(n_c - 1) degrees of freedom.
 *                     More df, and therefore better resolution — but a COPY
 *                     between conditions makes two of those residual sets the
 *                     same numbers, so the subject carries fewer independent df
 *                     than the bias correction assumes and the estimate inflates.
 *                     This is the contaminated one.
 *
 *   one-condition     residualScaleDispersion([A])
 *                     Reads one condition only, so no cross-condition copy can
 *                     reach it. Immune by construction, and it pays for that in
 *                     df: n_rep - 1 per subject instead of the pooled total.
 *                     S350-PAIRED-DESIGN-DISPOSITION.md §3 records it reading up
 *                     to 0.214 on data planted at zero dispersion with 6
 *                     replicates — inside the 0.2-0.3 knee — and needing about
 *                     12 replicates to resolve that threshold.
 *
 * ── What it assumes about its input ────────────────────────────────────────
 *
 *   shape        one nSubjects x nReps array per condition. Subject s must be at
 *                offset s in every condition's array; the function matches by
 *                position and cannot check that the positions correspond.
 *   scale        RAW values. It takes logs itself. Values <= 0 are dropped, so
 *                a condition of negative numbers silently loses rows.
 *   centring     row means are removed PER SUBJECT PER CONDITION, so differences
 *                in subject LEVEL are invisible to it. Only noise SCALE is read.
 *   replicates   at least 2 per subject per condition, or that condition
 *                contributes nothing for that subject.
 *   correction   Var(log sd_hat) ~ 1/(2*df) is subtracted before the square
 *                root, because even perfectly homoscedastic data reads a raw
 *                dispersion around 1/sqrt(2*df). `corrected` clamps at 0, so a
 *                zero is "at or below the floor", never a measurement of zero.
 */

export const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

export function sd(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}

/**
 * Per-subject residual noise-scale dispersion, bias-corrected.
 *
 * Takes one array per condition, each `nSubjects x nReps` of RAW values. Row
 * means are removed per subject per condition, the residuals are pooled across
 * conditions for that subject, and the dispersion reported is the spread of
 * log(per-subject residual sd) across subjects.
 *
 * @param {number[][][]} conditions - one nSubjects x nReps matrix per condition
 * @returns {{ raw:number, corrected:number, df:number, perSubject:number[] }}
 */
export function residualScaleDispersion(conditions) {
  const S = Math.min(...conditions.map(c => c.length));
  const logSd = [];
  let dfTotal = 0;
  for (let s = 0; s < S; s++) {
    const res = [];
    let df = 0;
    for (const C of conditions) {
      const vals = C[s].filter(v => v != null && isFinite(v) && v > 0).map(Math.log);
      if (vals.length < 2) continue;
      const m = mean(vals);
      for (const v of vals) res.push(v - m);
      df += vals.length - 1;
    }
    if (df < 1 || !res.length) continue;
    const ss = res.reduce((a, v) => a + v * v, 0);
    const sdHat = Math.sqrt(ss / df);
    if (sdHat > 0) { logSd.push(Math.log(sdHat)); dfTotal += df; }
  }
  const dfMean = logSd.length ? dfTotal / logSd.length : 0;
  const raw = sd(logSd);
  const bias = dfMean > 0 ? 1 / (2 * dfMean) : 0;
  return { raw, corrected: Math.sqrt(Math.max(0, raw * raw - bias)), df: dfMean, perSubject: logSd };
}
