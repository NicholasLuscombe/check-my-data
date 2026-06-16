/* ══════════════════════════════════════════════════════════════════════
   STATISTICAL PRIMITIVES — Mean, variance, distributions, FDR
   @see METHODOLOGY.md §"General Approach"
══════════════════════════════════════════════════════════════════════ */

/** Arithmetic mean. Returns 0 for empty arrays.
 *  @param {number[]} arr
 *  @returns {number} */
export function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Sample variance (Bessel-corrected, n−1 denominator).
 *  @param {number[]} arr
 *  @returns {number} */
export function variance(arr) {
  const m = mean(arr);
  return arr.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(arr.length - 1, 1);
}

/** Sample standard deviation.
 *  @param {number[]} arr
 *  @returns {number} */
export function stddev(arr) { return Math.sqrt(variance(arr)); }

/** CUSUM changepoint statistic. Returns {cusum, maxAbs, cpIdx} where cpIdx is the
 *  index of maximum |cumulative deviation from mu|. */
export function cusumStat(values, mu) {
  const n = values.length;
  const cusum = new Array(n);
  let maxAbs = 0, cpIdx = 0;
  cusum[0] = values[0] - mu;
  if (Math.abs(cusum[0]) > maxAbs) { maxAbs = Math.abs(cusum[0]); }
  for (let i = 1; i < n; i++) {
    cusum[i] = cusum[i - 1] + (values[i] - mu);
    const ac = Math.abs(cusum[i]);
    if (ac > maxAbs) { maxAbs = ac; cpIdx = i; }
  }
  return { cusum, maxAbs, cpIdx };
}

/** Stack-safe minimum for large arrays (avoids Math.min(...arr) RangeError).
 *  @param {number[]} arr
 *  @returns {number} */
export function arrayMin(arr) { let m=Infinity; for(let i=0;i<arr.length;i++) if(arr[i]<m) m=arr[i]; return m; }

/** Stack-safe maximum for large arrays.
 *  @param {number[]} arr
 *  @returns {number} */
export function arrayMax(arr) { let m=-Infinity; for(let i=0;i<arr.length;i++) if(arr[i]>m) m=arr[i]; return m; }

/** Robust log-span: 5th–95th percentile of log10 values, resistant to outliers.
 *  @param {number[]} vals - Positive values
 *  @returns {number} Log-span in orders of magnitude */
export function robustLogSpan(vals) {
  const logV = vals.filter(v=>v>0).map(v=>Math.log10(v)).sort((a,b)=>a-b);
  if(logV.length < 10) return arrayMax(logV)-arrayMin(logV);
  const lo = logV[Math.floor(logV.length*0.05)];
  const hi = logV[Math.floor(logV.length*0.95)];
  return hi - lo;
}

/** Predicted σ from log-log mean-variance fit.
 *  Shared by Kurtosis, Regional Noise, RSC. Fits log(variance) ~ slope × log(mean)
 *  across rows, returns per-row predicted σ.
 *  @param {Array<Array<?number>>} matrix - Numeric matrix (null = missing)
 *  @returns {{sigma: Array<?number>, used: boolean, rowMeans: Array<?number>}}
 *    sigma[r] = predicted σ for row r (null if unavailable). used = true if fit covers ≥50% rows.
 *  @see METHODOLOGY.md §"Mean-Variance Relationship" */
export function fitPredictedSigma(matrix) {
  const nR = matrix.length;
  const rowMeans = matrix.map(row => { const v = row.filter(x => x != null); return v.length >= 2 ? mean(v) : null; });
  const pts = [];
  for (let r = 0; r < nR; r++) {
    const vals = matrix[r].filter(v => v != null);
    if (vals.length < 2) continue;
    const m = mean(vals), v = variance(vals);
    if (m > 0 && v > 0) pts.push({ r, logM: Math.log(m), logV: Math.log(v) });
  }
  const sigma = new Array(nR).fill(null);
  if (pts.length < 5) return { sigma, used: false, rowMeans };
  const mlm = mean(pts.map(p => p.logM)), mlv = mean(pts.map(p => p.logV));
  let num = 0, den = 0;
  for (const p of pts) { num += (p.logM - mlm) * (p.logV - mlv); den += (p.logM - mlm) ** 2; }
  const slope = den > 0 ? num / den : 0;
  const intercept = mlv - slope * mlm;
  let nValid = 0;
  for (let r = 0; r < nR; r++) {
    if (rowMeans[r] != null && rowMeans[r] > 0) {
      const pv = Math.exp(intercept + slope * Math.log(rowMeans[r]));
      if (pv > 0 && isFinite(pv)) { sigma[r] = Math.sqrt(pv); nValid++; }
    }
  }
  return { sigma, used: nValid >= nR * 0.5, rowMeans };
}

/** Excess kurtosis (Fisher definition, = 0 for normal). Returns NaN if n < 4 or s = 0.
 *  @param {number[]} arr
 *  @returns {number} */
export function kurtosis(arr) {
  const n = arr.length; if (n < 4) return NaN;
  const m = mean(arr), s = stddev(arr); if (s === 0) return NaN;
  return arr.reduce((a, x) => a + ((x - m) / s) ** 4, 0) / n - 3;
}

/** Robust kurtosis: symmetric trim of top/bottom p fraction before computing.
 *  @param {number[]} arr
 *  @param {number} [trimFrac=0.02] - Fraction to trim from each tail
 *  @returns {number} */
export function trimmedKurtosis(arr, trimFrac = 0.02) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const cut = Math.max(1, Math.floor(n * trimFrac));
  const trimmed = sorted.slice(cut, n - cut);
  return kurtosis(trimmed);
}

/** Normal CDF via Abramowitz & Stegun approximation (|error| < 7.5e-8).
 *  @param {number} z - Standard normal deviate
 *  @returns {number} P(Z ≤ z) */
export function normalCDF(z) {
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign=z<0?-1:1, az=Math.abs(z)/Math.SQRT2, t=1/(1+p*az);
  const y=1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-az*az);
  return 0.5*(1+sign*y);
}

/** Two-tailed p-value from z-score.
 *  @param {number} z
 *  @returns {number} */
export function zToP(z) { return 2*(1-normalCDF(Math.abs(z))); }

/** Chi-squared p-value via Wilson-Hilferty normal approximation.
 *  @param {number} x - Chi-squared statistic
 *  @param {number} df - Degrees of freedom
 *  @returns {number} Upper-tail probability P(χ² ≥ x) */
/** Chi-squared survival function P(X > x | df) via the regularized incomplete gamma.
 *  Uses series expansion when x < a+1, continued fraction otherwise (Numerical Recipes §6.2).
 *  @param {number} x - Chi-squared statistic
 *  @param {number} df - Degrees of freedom
 *  @returns {number} p-value (upper tail probability) */
export function chiSquaredP(x, df) {
  if (df <= 0 || x <= 0) return 1;
  const a = df / 2, z = x / 2;
  // Regularized lower incomplete gamma P(a, z) via series or continued fraction
  // chiSquaredP = 1 - P(a, z)  [upper tail = survival function]
  return 1 - regIncGamma(a, z);
}

/** Regularized lower incomplete gamma function P(a, x) = γ(a,x) / Γ(a).
 *  Series expansion for x < a+1; Lentz continued fraction otherwise.
 *  @param {number} a @param {number} x @returns {number} ∈ [0, 1] */
function regIncGamma(a, x) {
  if (x <= 0) return 0;
  if (x < a + 1) return regIncGammaSeries(a, x);
  // Use continued fraction for the UPPER incomplete gamma Q(a,x) = 1 - P(a,x)
  return 1 - regIncGammaContFrac(a, x);
}

/** Series expansion for P(a, x). Converges rapidly when x < a+1. */
function regIncGammaSeries(a, x) {
  const lnPre = a * Math.log(x) - x - lnGamma(a);
  let sum = 1 / a, term = 1 / a;
  for (let n = 1; n <= 300; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 3e-14) break;
  }
  return sum * Math.exp(lnPre);
}

/** Continued fraction for Q(a, x) = 1 - P(a,x) via modified Lentz's method.
 *  Converges rapidly when x >= a+1. */
function regIncGammaContFrac(a, x) {
  const lnPre = a * Math.log(x) - x - lnGamma(a);
  // Lentz's method: CF = b0 + a1/(b1 + a2/(b2 + ...))
  // For Q(a,x): b0=0, then a_n and b_n per Numerical Recipes §6.2
  // a1 = 1, b1 = x - a + 1, then a_i = -(i-1)(i-1-a), b_i = x - a + (2i-1)
  let b = x - a + 1;
  let c = 1e30; // large value to start
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return h * Math.exp(lnPre);
}

/** Log-gamma function via Lanczos approximation.
 *  @param {number} z
 *  @returns {number} ln(Γ(z)) */
export function lnGamma(z) {
  const c=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
  let x=z,y=z,tmp=x+5.5; tmp-=(x+0.5)*Math.log(tmp); let ser=1.000000000190015;
  for(let j=0;j<6;j++) ser+=c[j]/++y;
  return -tmp+Math.log(2.5066282746310005*ser/x);
}

/** Continued-fraction evaluation for incomplete beta function.
 *  @param {number} a @param {number} b @param {number} x
 *  @returns {number} */
export function betaCF(a,b,x) {
  const qab=a+b,qap=a+1,qam=a-1; let c=1,d=1-qab*x/qap;
  if(Math.abs(d)<1e-30)d=1e-30; d=1/d; let h=d;
  for(let m=1;m<=200;m++){
    const m2=2*m; let aa=m*(b-m)*x/((qam+m2)*(a+m2));
    d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;d=1/d;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;h*=d*c;
    aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));
    d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;d=1/d;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;
    const del=d*c; h*=del; if(Math.abs(del-1)<3e-12) break;
  }
  return h;
}
/** Regularised incomplete beta function I_x(a,b).
 *  @param {number} a @param {number} b @param {number} x
 *  @returns {number} */
export function regIncBeta(a,b,x) {
  if(x<=0)return 0; if(x>=1)return 1;
  const bt=Math.exp(lnGamma(a+b)-lnGamma(a)-lnGamma(b)+a*Math.log(x)+b*Math.log(1-x));
  return x<(a+1)/(a+b+2)?bt*betaCF(a,b,x)/a:1-bt*betaCF(b,a,1-x)/b;
}

/** Benjamini-Hochberg FDR correction.
 *  @param {number[]} pValues - Raw p-values
 *  @returns {number[]} BH-adjusted p-values (q-values), same order as input
 *  @see METHODOLOGY.md §"Multiple Testing Correction" */
export function bhFDR(pValues) {
  const n = pValues.length;
  if(n === 0) return [];
  const indexed = pValues.map((p, i) => ({p, i})).sort((a, b) => a.p - b.p);
  const adj = new Array(n);
  let minAdj = 1;
  for(let r = n - 1; r >= 0; r--) {
    const raw = indexed[r].p * n / (r + 1);
    minAdj = Math.min(minAdj, raw);
    adj[indexed[r].i] = Math.min(minAdj, 1);
  }
  return adj;
}

// ── Functions used by individual tests but shared across multiple ──

/** Spearman rank correlation coefficient.
 *  @param {number[]} x @param {number[]} y - Paired arrays (same length)
 *  @returns {number} ρ ∈ [−1, 1], or NaN if n < 4 */
export function spearmanR(x, y) {
  const n=x.length;
  if(n<4) return NaN;
  const rankOf=(arr)=>{
    const sorted=[...arr].map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);
    const ranks=new Array(n);
    let i=0;
    while(i<n){
      let j=i;
      while(j<n-1&&sorted[j+1].v===sorted[j].v) j++;
      const avgRank=(i+j)/2+1;
      for(let k=i;k<=j;k++) ranks[sorted[k].i]=avgRank;
      i=j+1;
    }
    return ranks;
  };
  const rx=rankOf(x), ry=rankOf(y);
  const mrx=mean(rx), mry=mean(ry);
  let num=0,dx=0,dy=0;
  for(let i=0;i<n;i++){num+=(rx[i]-mrx)*(ry[i]-mry);dx+=(rx[i]-mrx)**2;dy+=(ry[i]-mry)**2;}
  return dx>0&&dy>0?num/Math.sqrt(dx*dy):0;
}

/** Matrix inversion via Gauss-Jordan elimination with partial pivoting.
 *  Designed for small matrices (nC typically 3–6). Returns null if singular.
 *  @param {number[][]} M - Square matrix
 *  @param {number} n - Dimension
 *  @returns {?number[][]} Inverse matrix, or null if singular */
export function invertMatrix(M, n) {
  // Create augmented matrix [M | I]
  const aug = Array.from({ length: n }, (_, i) => {
    const row = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) row[j] = M[i][j];
    row[n + i] = 1;
    return row;
  });

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-12) return null; // singular

    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Scale pivot row
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  // Extract inverse
  return aug.map(row => row.slice(n));
}

/** Chi-squared quantile via Wilson-Hilferty approximation.
 *  @param {number} df @param {number} prob - Upper-tail probability
 *  @returns {number} */
export function chiSquaredQuantile(df, prob) {
  const z=normalQuantile(prob);
  const t=1-2/(9*df);
  return df*Math.pow(t+z*Math.sqrt(2/(9*df)),3);
}

/** Normal quantile (inverse CDF) via rational approximation.
 *  @param {number} p - Probability ∈ (0, 1)
 *  @returns {number} z such that P(Z ≤ z) = p */
export function normalQuantile(p) {
  if(p<=0) return -Infinity;
  if(p>=1) return Infinity;
  if(p===0.5) return 0;
  const a=[0,-3.969683028665376e1,2.209460984245205e2,-2.759285104469687e2,1.383577518672690e2,-3.066479806614716e1,2.506628277459239e0];
  const b=[0,-5.447609879822406e1,1.615858368580409e2,-1.556989798598866e2,6.680131188771972e1,-1.328068155288572e1];
  const c=[0,-7.784894002430293e-3,-3.223964580411365e-1,-2.400758277161838e0,-2.549732539343734e0,4.374664141464968e0,2.938163982698783e0];
  const d=[0,7.784695709041462e-3,3.224671290700398e-1,2.445134137142996e0,3.754408661907416e0];
  const pL=0.02425,pH=1-pL;
  let q,r;
  if(p<pL){q=Math.sqrt(-2*Math.log(p));return(((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6])/((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);}
  if(p<=pH){q=p-0.5;r=q*q;return(((((a[1]*r+a[2])*r+a[3])*r+a[4])*r+a[5])*r+a[6])*q/(((((b[1]*r+b[2])*r+b[3])*r+b[4])*r+b[5])*r+1);}
  q=Math.sqrt(-2*Math.log(1-p));
  return -(((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6])/((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
}

/** LOESS (locally estimated scatterplot smoothing) with tricube weights.
 *  K-nearest-neighbours approach: each point fits a weighted linear regression
 *  on its k = ceil(span × n) nearest neighbours.
 *  @param {number[]} xs - X values
 *  @param {number[]} ys - Y values (same length)
 *  @param {number} span - Fraction of data used per local fit (0, 1]
 *  @returns {number[]} Fitted values
 *  @see METHODOLOGY.md §"LOESS Residual Analysis with CUSUM Changepoint" */
export function loessSmooth(xs, ys, span) {
  const n = xs.length;
  const k = Math.max(3, Math.ceil(span * n)); // number of neighbours
  const fitted = new Array(n);

  for (let i = 0; i < n; i++) {
    // Find k nearest neighbours by x-distance
    const dists = [];
    for (let j = 0; j < n; j++) {
      dists.push({ j, d: Math.abs(xs[j] - xs[i]) });
    }
    dists.sort((a, b) => a.d - b.d);
    const neighbours = dists.slice(0, k);
    const maxDist = neighbours[k - 1].d || 1;

    // Tricube weights: w(u) = (1 - |u|³)³ for |u| < 1
    let sumW = 0, sumWX = 0, sumWY = 0, sumWXX = 0, sumWXY = 0;
    for (const nb of neighbours) {
      const u = maxDist > 0 ? nb.d / maxDist : 0;
      const w = u < 1 ? Math.pow(1 - Math.pow(u, 3), 3) : 0;
      const xj = xs[nb.j], yj = ys[nb.j];
      sumW += w;
      sumWX += w * xj;
      sumWY += w * yj;
      sumWXX += w * xj * xj;
      sumWXY += w * xj * yj;
    }
    // Weighted linear regression: y = a + b*x
    if (sumW === 0) { fitted[i] = ys[i]; continue; }
    const denom = sumW * sumWXX - sumWX * sumWX;
    if (Math.abs(denom) < 1e-30) {
      fitted[i] = sumWY / sumW; // fallback to weighted mean
    } else {
      const b = (sumW * sumWXY - sumWX * sumWY) / denom;
      const a = (sumWY - b * sumWX) / sumW;
      fitted[i] = a + b * xs[i];
    }
  }
  return fitted;
}

/** Autocorrelation at a given lag, using pre-computed mean and denominator.
 *  @param {number[]} diffs - Time series
 *  @param {number} m - Mean of diffs
 *  @param {number} den - Σ(diffs[i] − m)² (total variance)
 *  @param {number} lag - Lag ≥ 1
 *  @returns {number} ACF at lag */
export function acfAtLag(diffs, m, den, lag) {
  let num=0;
  for(let i=lag;i<diffs.length;i++) num+=(diffs[i]-m)*(diffs[i-lag]-m);
  return den>0?num/den:0;
}

/** One-sample t-test: H₀: μ = 0. Uses normal approximation for df > 30.
 *  @param {number[]} vals
 *  @returns {{t: number, df: number, p: number}} */
export function oneSampleT(vals) {
  const n=vals.length; if(n<2) return {t:0,df:0,p:1};
  const m=mean(vals), s=stddev(vals); if(s===0) return {t:0,df:n-1,p:1};
  const t=m/(s/Math.sqrt(n)), df=n-1;
  // Two-tailed p: use normal approximation for df>30 (sufficient for pooled n)
  const p=df>30?zToP(t):pooledTtoP(t,df);
  return{t,df,p};
}

/** Two-tailed t → p-value via regularised incomplete beta function.
 *  @param {number} t @param {number} df
 *  @returns {number} */
export function pooledTtoP(t,df) {
  const x=df/(df+t*t);
  return regIncBeta(df/2,0.5,x);
}

/** Two-sided Student-t quantile (inverse-CDF). Given a two-sided tail
 *  probability p and degrees of freedom df, returns t > 0 such that the
 *  two-sided tail area beyond ±t equals p — i.e. the 1 − p/2 quantile.
 *  Inverts pooledTtoP (the same regIncBeta forward path) by bisection, so a
 *  consumer's interval edge matches the exact-t tail rather than a normal
 *  approximation. Correct at low df (df=2, p=0.01 → ≈9.925); → normal
 *  quantile as df → ∞.
 *  @param {number} p - two-sided tail probability ∈ (0,1)
 *  @param {number} df - degrees of freedom (>0)
 *  @returns {number} */
export function tQuantileTwoSided(p,df) {
  if(!(p>0&&p<1)||!(df>0)) return NaN;
  // pooledTtoP(t,df) is monotone decreasing in t: 1 at t=0, →0 as t→∞.
  // Bracket the root [lo,hi] then bisect.
  let lo=0, hi=1;
  while(pooledTtoP(hi,df)>p && hi<1e8) hi*=2;
  for(let i=0;i<100;i++){
    const mid=(lo+hi)/2;
    if(pooledTtoP(mid,df)>p) lo=mid; else hi=mid;
  }
  return (lo+hi)/2;
}

/** Modal decimal precision of a numeric array (most common # of decimal places).
 *  Trailing zeros are stripped by `Number→String` coercion (so 30.70 → "30.7" → 1dp).
 *  @param {number[]} vals
 *  @returns {number} Most-common decimal-place count (0 for integer-dominant columns) */
export function modalPrecision(vals) {
  const counts = {};
  for (const v of vals) {
    const s = String(Math.abs(v));
    const dp = s.includes(".") ? s.split(".")[1].replace(/0+$/, "").length : 0;
    counts[dp] = (counts[dp] || 0) + 1;
  }
  let bestDP = 0, bestCount = 0;
  for (const [dp, c] of Object.entries(counts)) {
    if (c > bestCount) { bestDP = Number(dp); bestCount = c; }
  }
  return bestDP;
}
