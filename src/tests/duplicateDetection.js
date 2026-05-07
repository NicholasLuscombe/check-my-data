import { mean, variance, arrayMin, arrayMax, normalCDF, lnGamma, bhFDR, regIncBeta } from "../stats/primitives.js";
import { flagFromP } from "../constants/thresholds.js";

/* 1. Exact Duplicate Detection — 2 statistical signals: structural duplication (row-dup binomial + block copies) and within-row coincidences. BH-FDR on 2. */
/**
 * Detects exact row duplicates and within-row value coincidences indicative of copy-paste fabrication.
 * @param {number[][]} matrix - Per-group numeric matrix (rows x replicate columns).
 * @param {number[][]} [fullMatrix] - Full cross-group matrix for within-row coincidence scanning.
 * @param {number[]} [colGroupId] - Maps fullMatrix column index to group (-1 if ungrouped).
 * @param {string} [assay] - Assay type identifier (e.g. 'genomics') for assay-specific thresholds.
 * @returns {{ name: string, category: string, flag: string, primaryP: number, dupCount: number, coincidenceCount: number, details: object[] }} Result object with duplicate counts, coincidence analysis, BH-FDR-corrected p-values, and flag severity.
 * @see METHODOLOGY.md §"1.1 Exact Duplicate Detection"
 */
export function testDuplicates(matrix, fullMatrix, colGroupId, assay) {
  const nR=matrix.length, nC=matrix[0]?.length||0;
  const isGenomics = assay === 'genomics';
  // fullMatrix: when running per-group, the within-row coincidence test
  // should scan ALL columns to detect cross-group value copying.
  // colGroupId: maps fullMatrix column index → group (-1 if ungrouped).
  const wrMatrix = fullMatrix || matrix;
  const wrC = wrMatrix[0]?.length || nC;
  const wrR = wrMatrix.length;
  const hasGroups = colGroupId && colGroupId.some(g => g >= 0);

  // ── Instrument precision null ────────────────────────────────────────────────
  const allVals=[];
  const globalFreq={};
  for(let r=0;r<nR;r++) for(let c=0;c<nC;c++){
    const v=matrix[r]?.[c];
    if(v!=null){allVals.push(v);const k=v.toFixed(4);globalFreq[k]=(globalFreq[k]||0)+1;}
  }
  const N=allVals.length;
  if(N===0) return {name:"Exact Duplicate Detection",category:"copied",flag:"N/A",description:"No data."};

  // Dominant decimal precision from observed strings
  const dpCounts={};
  for(const v of allVals){const s=String(v),d=s.indexOf("."),dp=d<0?0:s.length-d-1;dpCounts[dp]=(dpCounts[dp]||0)+1;}
  const dominantDp=parseInt(Object.entries(dpCounts).reduce((a,b)=>b[1]>a[1]?b:a,[0,0])[0])||0;
  const step=Math.pow(10,-dominantDp);
  const mn=arrayMin(allVals), mx=arrayMax(allVals);
  const nBins=Math.max(Math.round((mx-mn)/step)+1, 1);

  // For integer data (dominantDp=0), the uniform-bins null (p1=1/nBins) is wrong:
  // it assumes values are equally likely across the entire range, but integer count
  // data (RNA-seq, cell counts) concentrates heavily at low values.
  //
  // Three-way collision null:
  //   (a) Integer, N≤5000: Parametric Poisson/NB model-predicted pMatch.
  //       Breaks HHI circularity at moderate N.
  //   (b) Integer, N>5000: Empirical HHI. At large N, genuine distribution
  //       dominates — circularity isn't a concern; parametric model is inadequate
  //       for zero-inflated multimodal count distributions.
  //   (c) Continuous (dominantDp>0): Empirical HHI.
  const isInteger = dominantDp===0;
  const hhi = Object.values(globalFreq).reduce((s,c)=>s+(c/N)**2, 0);

  let p1, p1Source;
  if (isInteger && N <= 5000) {
    // ── Parametric collision null for moderate-N integer data ──
    // At moderate N (cell counts, ~50–200 values per column), Poisson/NB captures
    // the distribution well and breaks HHI circularity.
    // At large N (RNA-seq 30K+ rows), the parametric model is inadequate for
    // zero-inflated multimodal count distributions — fall back to empirical HHI
    // where circularity isn't a concern (genuine distribution dominates).
    // Fit Poisson(λ) and NB(r, p) by method of moments
    const mu = mean(allVals);
    const v = variance(allVals);

    // Poisson PMF: P(X=k) = e^(-λ) λ^k / k!
    // Use log-space for numerical stability
    function poissonLogPMF(k, lam) {
      if (lam <= 0) return k === 0 ? 0 : -Infinity;
      let logFact = 0;
      for (let i = 2; i <= k; i++) logFact += Math.log(i);
      return -lam + k * Math.log(lam) - logFact;
    }

    // NB PMF: P(X=k) = C(k+r-1, k) * p^k * (1-p)^r
    // Parameterised as: mean = r*p/(1-p), var = r*p/(1-p)^2
    // So r = mu^2/(v-mu), p = (v-mu)/v  [when v > mu, i.e. overdispersed]
    function nbLogPMF(k, r, p) {
      if (r <= 0 || p <= 0 || p >= 1) return -Infinity;
      // log C(k+r-1, k) = lnGamma(k+r) - lnGamma(k+1) - lnGamma(r)
      return lnGamma(k + r) - lnGamma(k + 1) - lnGamma(r) + k * Math.log(p) + r * Math.log(1 - p);
    }

    // Compute log-likelihood for each model on observed values
    const lambda = mu; // Poisson MLE
    let poissonLL = 0;
    for (const val of allVals) poissonLL += poissonLogPMF(Math.round(val), lambda);

    // NB MoM: r = mu^2/(v-mu), p = (v-mu)/v
    const nbR = v > mu && mu > 0 ? (mu * mu) / (v - mu) : null;
    const nbP = v > mu ? (v - mu) / v : null;
    let nbLL = -Infinity;
    if (nbR !== null && nbR > 0 && nbP > 0 && nbP < 1) {
      nbLL = 0;
      for (const val of allVals) nbLL += nbLogPMF(Math.round(val), nbR, nbP);
    }

    // Select model by log-likelihood (higher = better fit)
    const useNB = isFinite(nbLL) && nbLL > poissonLL;

    // Compute pMatch = Σ P(X=v)² over the range of plausible values
    // Range: 0 to observed max + a margin (captures >99.9% of probability mass)
    const vMax = Math.max(arrayMax(allVals), mu + 6 * Math.sqrt(v));
    const rangeMax = Math.min(Math.ceil(vMax) + 1, 100000); // cap for safety
    let pMatch = 0;
    if (useNB) {
      for (let k = Math.max(0, Math.floor(arrayMin(allVals))); k <= rangeMax; k++) {
        const lp = nbLogPMF(k, nbR, nbP);
        if (lp > -50) pMatch += Math.exp(2 * lp); // P(k)^2
      }
    } else {
      for (let k = Math.max(0, Math.floor(arrayMin(allVals))); k <= rangeMax; k++) {
        const lp = poissonLogPMF(k, lambda);
        if (lp > -50) pMatch += Math.exp(2 * lp); // P(k)^2
      }
    }

    // Safety: pMatch must be at least as large as 1/(range+1) and no larger than 1
    pMatch = Math.max(pMatch, 1 / (rangeMax + 1));
    pMatch = Math.min(pMatch, 1);

    p1 = pMatch;
    p1Source = useNB ? "NB" : "Poisson";
  } else if (isInteger) {
    // Large-N integer data: empirical HHI. At large N the genuine distribution
    // dominates — circularity only applies at moderate N.
    p1 = hhi;
    p1Source = "empirical";
  } else {
    // Continuous (float) data: empirical HHI. Uniform-bins null assumes equal
    // probability across the range, which is wrong for any realistic distribution.
    // HHI circularity is not a concern for float data (high precision → many bins).
    p1 = hhi;
    p1Source = "empirical";
  }
  const nDistinct = Object.keys(globalFreq).length;

  function binomialP(k, n, p){
    if(k<=1) return 1;
    if(k===0) return 1;
    let cum=0, lq=n*Math.log(Math.max(1-p,1e-300)), lt=lq;
    for(let i=0;i<k&&i<=100;i++){
      cum+=Math.exp(lt);
      if(i<k-1) lt+=Math.log((n-i)/(i+1))+Math.log(p/Math.max(1-p,1e-300));
    }
    return Math.max(0,1-cum);
  }

  // Exact binomial survival P(X >= k | Bin(n, p)) via regularized incomplete beta.
  // Robust for any k (unlike binomialP's 100-iteration cap). Used for Tests 1 & 3.
  function binomialSurvival(k, n, p) {
    if (k <= 0) return 1;
    if (k > n) return 0;
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    // Identity: P(X >= k | Bin(n, p)) = I_p(k, n - k + 1)
    const s = regIncBeta(k, n - k + 1, p);
    return Math.max(0, Math.min(1, s));
  }

  // ── Test 1: value-level collision count (exact binomial) ────────────────────
  // Observed = Σ_v C(freq(v), 2) over all distinct values (total same-value pair count).
  // Null: Bin(n = C(N_cells, 2), p = p1).  p1 inherits the parametric/empirical
  // branch computed above (Poisson/NB for moderate-N integers; empirical HHI else).
  let collisionObs = 0;
  for (const cnt of Object.values(globalFreq)) {
    if (cnt >= 2) collisionObs += cnt * (cnt - 1) / 2;
  }
  const collisionNPairs = N * (N - 1) / 2;
  const collisionP = collisionNPairs > 0 ? binomialSurvival(collisionObs, collisionNPairs, p1) : 1;

  // ── Over-represented values (display only) ───────────────────────────────────
  const overRepresented=[];
  for(const [val,cnt] of Object.entries(globalFreq)){
    if(cnt>=3) overRepresented.push({value:parseFloat(val), count:cnt});
  }
  overRepresented.sort((a,b)=>b.count-a.count);

  // ── Within-row coincidence test ───────────────────────────────────────────────
  // Scans ALL columns (wrMatrix = fullMatrix when available) to detect both
  // within-group and cross-group value copying.
  // Three-level breakdown: within-group (same R1-R4), cross-group,
  // and within-column (same column, different rows) as control.
  // Null: per-column-pair match probability = dot product of empirical frequency
  // distributions. Expected = Σ_pairs n_valid_rows × pMatch_pair.
  const withinRowLocs=[];
  const withinRowSeen=new Set();
  let withinRowMatchTotal = 0;
  let wrWithinObs = 0, wrCrossObs = 0;

  // Build per-column frequency distributions from wrMatrix (full matrix)
  const colFreqs = [];
  const colNs = [];
  for (let c = 0; c < wrC; c++) {
    const freq = {};
    let cn = 0;
    for (let r = 0; r < wrR; r++) {
      const v = wrMatrix[r]?.[c];
      if (v != null) { const k = v.toFixed(4); freq[k] = (freq[k] || 0) + 1; cn++; }
    }
    colFreqs.push(freq);
    colNs.push(cn);
  }
  // Per-column HHI on full matrix (for block copy p-values)
  const wrColHHI = colFreqs.map((freq, ci) => {
    if (colNs[ci] === 0) return 1;
    let h = 0;
    for (const cnt of Object.values(freq)) h += (cnt / colNs[ci]) ** 2;
    return h;
  });
  // Cross-column frequency overlap: P(col_i[r] = col_j[r]) for column-match p-values
  // crossColOverlap[i][j] = Σ_v (freq_i(v)/N_i × freq_j(v)/N_j)
  const crossColOverlap = {};
  const crossColKey = (i, j) => i < j ? `${i},${j}` : `${j},${i}`;
  // Computed lazily in p-value section to avoid O(nCols²) when not needed

  // Count observed within-row matches, split by within/cross group
  // Skip for genomics — small integer counts produce massive FP coincidences
  let withinRowExpected = 0, wrWithinExp = 0, wrCrossExp = 0;
  let withinColObs = 0, withinColExp = 0;
  let wrZ = 0, withinRowP = 1;
  let withinRowPairTotal = 0; // Σ_rows C(n_valid_cols_in_row, 2) — exact binomial n
  if (!isGenomics) {
  for (let r = 0; r < wrR; r++) {
    const matchCols = [];
    let nValidInRow = 0;
    for (let c = 0; c < wrC; c++) if (wrMatrix[r][c] != null) nValidInRow++;
    withinRowPairTotal += nValidInRow * (nValidInRow - 1) / 2;
    for (let i = 0; i < wrC; i++) for (let j = i + 1; j < wrC; j++) {
      if (wrMatrix[r][i] != null && wrMatrix[r][i] === wrMatrix[r][j]) {
        withinRowMatchTotal++;
        if (hasGroups && colGroupId[i] >= 0 && colGroupId[i] === colGroupId[j]) wrWithinObs++;
        else wrCrossObs++;
        matchCols.push({ ci: i, cj: j, value: wrMatrix[r][i] });
      }
    }
    if (matchCols.length > 0 && !withinRowSeen.has(r)) {
      withinRowSeen.add(r);
      const byVal = {};
      for (const m of matchCols) {
        const k = m.value.toFixed(4);
        if (!byVal[k]) byVal[k] = { value: m.value, cols: new Set() };
        byVal[k].cols.add(m.ci); byVal[k].cols.add(m.cj);
      }
      const groups = Object.values(byVal).map(g => ({ value: g.value, cols: [...g.cols].sort((a, b) => a - b) }));
      withinRowLocs.push({ type: "within-row", row: r + 1, groups });
    }
  }

  // Compute expected within-row matches using ROW-BINNED frequency overlap.
  // Global frequency overlap underestimates collision probability because replicates
  // within a row share the same base value — local collision rate is much higher than
  // the global marginal predicts. Binning rows by row mean computes per-bin frequency
  // overlap, correctly inflating expected matches for clustered data (e.g. DS12a:
  // 6 reps of log-normal at 2dp, global range ~5–1000 but within-row range ~±18%).
  const BIN_SIZE = 30; // rows per bin — balances granularity vs frequency estimation
  // Compute row means for binning
  const wrRowMeans = [];
  for (let r = 0; r < wrR; r++) {
    let s = 0, c2 = 0;
    for (let c = 0; c < wrC; c++) { if (wrMatrix[r][c] != null) { s += wrMatrix[r][c]; c2++; } }
    wrRowMeans.push(c2 > 0 ? s / c2 : null);
  }
  // Sort row indices by mean, partition into bins
  const sortedRowIdx = Array.from({ length: wrR }, (_, i) => i)
    .filter(r => wrRowMeans[r] != null)
    .sort((a, b) => wrRowMeans[a] - wrRowMeans[b]);
  const bins = [];
  for (let i = 0; i < sortedRowIdx.length; i += BIN_SIZE) {
    bins.push(sortedRowIdx.slice(i, i + BIN_SIZE));
  }

  for (const bin of bins) {
    if (bin.length < 2) continue;
    // Build per-column frequency distributions for this bin only
    const binFreqs = [];
    const binNs = [];
    for (let c = 0; c < wrC; c++) {
      const freq = {};
      let cn = 0;
      for (const r of bin) {
        const v = wrMatrix[r]?.[c];
        if (v != null) { const k = v.toFixed(4); freq[k] = (freq[k] || 0) + 1; cn++; }
      }
      binFreqs.push(freq);
      binNs.push(cn);
    }
    // Per-pair bin-local expected
    for (let i = 0; i < wrC; i++) for (let j = i + 1; j < wrC; j++) {
      const fi = binFreqs[i], ni = binNs[i], fj = binFreqs[j], nj = binNs[j];
      if (ni === 0 || nj === 0) continue;
      let pMatch = 0;
      for (const v in fi) { if (fj[v]) pMatch += (fi[v] / ni) * (fj[v] / nj); }
      let nValid = 0;
      for (const r of bin) { if (wrMatrix[r][i] != null && wrMatrix[r][j] != null) nValid++; }
      const exp = nValid * pMatch;
      withinRowExpected += exp;
      if (hasGroups && colGroupId[i] >= 0 && colGroupId[i] === colGroupId[j]) wrWithinExp += exp;
      else wrCrossExp += exp;
    }
  }

  // Within-column control: same column, different rows (should be ~1.0× if data is genuine)
  // Uses GLOBAL HHI (across all columns) as the null, not per-column HHI which is
  // biased (comparing a column's frequencies against themselves).
  let withinColNPairs = 0;
  const globalFreqWR = {};
  let globalNWR = 0;
  for (let c = 0; c < wrC; c++) {
    const freq = colFreqs[c], cn = colNs[c];
    if (cn < 2) continue;
    let cp = 0;
    for (const k in freq) { cp += freq[k] * (freq[k] - 1) / 2; }
    withinColObs += cp;
    withinColNPairs += cn * (cn - 1) / 2;
    for (const k in freq) { globalFreqWR[k] = (globalFreqWR[k] || 0) + freq[k]; globalNWR += freq[k]; }
  }
  let globalHHI = 0;
  for (const k in globalFreqWR) globalHHI += (globalFreqWR[k] / globalNWR) ** 2;
  withinColExp = withinColNPairs * globalHHI;

  // Z-score retained for display (diagnostic only).
  const wrSigma = Math.sqrt(Math.max(withinRowExpected, 1));
  wrZ = wrSigma > 0 ? (withinRowMatchTotal - withinRowExpected - 0.5) / wrSigma : 0;

  // Exact binomial survival for Test 3 (S95): n = Σ_rows C(n_valid_cols, 2),
  // p = withinRowExpected / n (mean-matched). Slightly over-dispersed vs. true
  // Poisson-binomial (per-pair p varies by row bin) — conservative direction.
  if (withinRowPairTotal > 0 && withinRowMatchTotal > 0) {
    let pHat = withinRowExpected / withinRowPairTotal;
    if (pHat <= 0) pHat = 1e-300;
    if (pHat >= 1) pHat = 1 - 1e-12;
    withinRowP = binomialSurvival(withinRowMatchTotal, withinRowPairTotal, pHat);
  } else {
    withinRowP = 1;
  }
  } // end if (!isGenomics)

  // ── Block copy detection — hash-based pattern matching ─────────────
  // For each block height h, hash h consecutive rows into a sequence key.
  // Group starting positions by key → positions sharing the same pattern.
  const blockCopies = [];
  const MIN_BLOCK_CELLS = 6;

  // Gate: skip block detection for large datasets (>5000 rows).
  // Block copy detection is O(n² × cols) in the verification step and designed
  // for human-edited datasets (tens to hundreds of rows). For large -omics
  // datasets, row-dup grouping and within-row coincidences still run.
  const BLOCK_SCAN_LIMIT = 5000;
  const blockScanSkipped = wrR > BLOCK_SCAN_LIMIT;
  const maxOffset = wrR > 500 ? Math.min(wrR - 1, 200) : wrR - 1;

  if (!blockScanSkipped) {
  // Step 1: Hash each row (FNV-1a on string representation)
  const rowHashKeys = [];
  for (let i = 0; i < wrR; i++) {
    let h = 2166136261;
    for (let c = 0; c < wrC; c++) {
      const v = wrMatrix[i][c];
      const s = v != null ? v.toFixed(4) : "\u2205";
      for (let j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = Math.imul(h, 16777619); }
    }
    rowHashKeys.push(h >>> 0); // unsigned
  }
  // Step 2: For each height h (largest first), find multi-occurrence patterns
  const maxH = Math.min(10, Math.floor(wrR / 2));
  const coveredBlocks = new Set(); // "startRow:height" keys for dedup
  for (let h = maxH; h >= 1; h--) {
    // Build sequence key → [starting positions]
    const seqGroups = {};
    for (let i = 0; i <= wrR - h; i++) {
      let key = "";
      for (let j = 0; j < h; j++) key += rowHashKeys[i + j] + "|";
      if (!seqGroups[key]) seqGroups[key] = [];
      seqGroups[key].push(i);
    }
    for (const positions of Object.values(seqGroups)) {
      if (positions.length < 2) continue;
      // Verify actual equality (guard against hash collisions)
      // Group positions into equivalence classes
      const classes = [];
      for (const pos of positions) {
        let matched = false;
        for (const cls of classes) {
          const ref = cls[0];
          let equal = true;
          for (let r = 0; r < h && equal; r++) {
            for (let c = 0; c < wrC && equal; c++) {
              if (wrMatrix[ref + r][c] !== wrMatrix[pos + r][c]) equal = false;
            }
          }
          if (equal) { cls.push(pos); matched = true; break; }
        }
        if (!matched) classes.push([pos]);
      }
      for (const cls of classes) {
        if (cls.length < 2) continue;
        // Skip height=1 full-row matches — handled by rowDupGroupList
        if (h === 1) continue;
        // Skip if all positions already covered by a larger block
        const anyNew = cls.some(p => {
          for (let r = 0; r < h; r++) if (!coveredBlocks.has(`${p+r}`)) return true;
          return false;
        });
        if (!anyNew) continue;
        // Mark covered
        for (const p of cls) for (let r = 0; r < h; r++) coveredBlocks.add(`${p+r}`);
        // Record: all pairwise copies (first = src, rest = dst)
        const sorted = cls.slice().sort((a, b) => a - b);
        for (let gi = 1; gi < sorted.length; gi++) {
          blockCopies.push({
            srcRows: [sorted[0], sorted[0] + h - 1],
            dstRows: [sorted[gi], sorted[gi] + h - 1],
            cols: Array.from({length: wrC}, (_, i) => i),
            height: h, width: wrC, offset: sorted[gi] - sorted[0],
            isFullRow: true, isFullCol: false,
            occurrences: sorted.length,
            allPositions: sorted.slice(),
          });
        }
      }
    }
  }
  // Step 3: Partial-column blocks — use offset scan for blocks where only
  // a subset of columns match (genuine copy-paste with column shift).
  // These can't be found by full-row hashing.
  const partialBlocks = [];
  for (let d = 1; d <= maxOffset; d++) {
    let prevMatchKey = "";
    let blockStart = -1, blockCols = null;
    const closeBlock = (endExcl) => {
      const bh = endExcl - blockStart;
      const w = blockCols.length;
      const fullRow = w === wrC;
      // Only keep PARTIAL-width blocks (full-row already found by hash method)
      if (!fullRow && bh >= 2 && w >= 2 && bh * w >= MIN_BLOCK_CELLS) {
        partialBlocks.push({
          srcRows: [blockStart, endExcl - 1],
          dstRows: [blockStart + d, endExcl - 1 + d],
          cols: blockCols.slice(),
          height: bh, width: w, offset: d,
          isFullRow: false, isFullCol: bh >= wrR - d,
        });
      }
    };
    for (let i = 0; i <= wrR - 1 - d; i++) {
      const matchCols = [];
      for (let c = 0; c < wrC; c++) {
        if (wrMatrix[i][c] != null && wrMatrix[i + d][c] != null && wrMatrix[i][c] === wrMatrix[i + d][c]) {
          matchCols.push(c);
        }
      }
      const matchKey = matchCols.length >= 2 ? matchCols.join(",") : "";
      if (matchKey && matchKey === prevMatchKey) { /* extend */ }
      else {
        if (blockStart >= 0) closeBlock(i);
        if (matchKey) { blockStart = i; blockCols = matchCols; }
        else { blockStart = -1; blockCols = null; }
      }
      prevMatchKey = matchKey;
    }
    if (blockStart >= 0) closeBlock(wrR - d);
  }
  // Step 4: Column-segment matching (transposed pass)
  // Merge partial-width blocks from offset scan first
  for (const pb of partialBlocks) blockCopies.push(pb);
  // For each starting row, incrementally hash each column's values downward.
  // Group columns by hash at each height — columns with identical hash have
  // the same values over that row range. Directly answers: "does this column's
  // values appear in any other column over the same rows?"
  const colMatchBlocks = [];
  const minColStreak = 3;
  const maxColScanH = Math.min(wrR, 100);
  for (let startRow = 0; startRow < wrR - minColStreak + 1; startRow++) {
    // Skip if previous row also starts a match (only record maximal starts)
    const hashes = new Array(wrC);
    for (let c = 0; c < wrC; c++) hashes[c] = 2166136261;
    let bestGroupAtH = {}; // "col1,col2,..." → best height
    for (let h = 1; h <= Math.min(maxColScanH, wrR - startRow); h++) {
      const r = startRow + h - 1;
      for (let c = 0; c < wrC; c++) {
        let hash = hashes[c];
        hash ^= 0xFF; hash = Math.imul(hash, 16777619); // row separator
        const v = wrMatrix[r][c];
        const s = v != null ? v.toFixed(4) : `\x00NULL${c}\x00${r}`;  // unique per col+row so nulls never match
        for (let j = 0; j < s.length; j++) { hash ^= s.charCodeAt(j); hash = Math.imul(hash, 16777619); }
        hashes[c] = hash >>> 0;
      }
      if (h < minColStreak) continue;
      // Group columns by hash
      const groups = {};
      for (let c = 0; c < wrC; c++) {
        const k = hashes[c];
        if (!groups[k]) groups[k] = [];
        groups[k].push(c);
      }
      for (const cols of Object.values(groups)) {
        if (cols.length < 2) continue;
        // Verify actual equality (hash collision guard) AND require non-null
        let valid = true;
        for (let ci = 1; ci < cols.length && valid; ci++) {
          for (let rr = startRow; rr <= r && valid; rr++) {
            const va = wrMatrix[rr][cols[0]], vb = wrMatrix[rr][cols[ci]];
            if (va == null || vb == null || va !== vb) valid = false;
          }
        }
        if (valid) bestGroupAtH[cols.join(",")] = h;
      }
    }
    // Record maximal segments that start HERE (not a continuation of a longer match)
    for (const [key, h] of Object.entries(bestGroupAtH)) {
      const cols = key.split(",").map(Number);
      // Check: does this match extend to the row BEFORE startRow?
      if (startRow > 0) {
        let prevMatch = true;
        for (let ci = 1; ci < cols.length && prevMatch; ci++) {
          if (wrMatrix[startRow - 1][cols[0]] !== wrMatrix[startRow - 1][cols[ci]]) prevMatch = false;
        }
        if (prevMatch) continue; // not the true start — skip
      }
      colMatchBlocks.push({ cols, startRow, endRow: startRow + h - 1, height: h });
    }
  }
  // Convert column-match segments into block records for unified display
  // Format: first column is "src", subsequent are "dst" — same row range, different columns
  for (const cm of colMatchBlocks) {
    for (let ci = 1; ci < cm.cols.length; ci++) {
      blockCopies.push({
        srcRows: [cm.startRow, cm.endRow],
        dstRows: [cm.startRow, cm.endRow], // same rows
        cols: [cm.cols[0], cm.cols[ci]], // the two matching columns
        height: cm.height, width: 2,
        offset: 0,
        isFullRow: false, isFullCol: false,
        isColumnMatch: true, // flag for display: column-to-column, not row-to-row
        srcCol: cm.cols[0], dstCol: cm.cols[ci],
        allMatchCols: cm.cols.slice(),
      });
    }
  }
  } // end if (!blockScanSkipped)

  // Merge all blocks (row-hash, partial offset, column-match), dedup subsets
  blockCopies.sort((a, b) => (b.height * b.width) - (a.height * a.width) || b.height - a.height);
  const keptBlocks = [];
  for (const blk of blockCopies) {
    const dominated = keptBlocks.some(big =>
      big.srcRows[0] <= blk.srcRows[0] && big.srcRows[1] >= blk.srcRows[1] &&
      big.dstRows[0] <= blk.dstRows[0] && big.dstRows[1] >= blk.dstRows[1] &&
      blk.cols.every(c => big.cols.includes(c))
    );
    if (!dominated) keptBlocks.push(blk);
  }
  // Sparsity filter: suppress blocks where source rows are >50% null
  const sparseFilteredBlocks = keptBlocks.filter(blk => {
    const srcRow = matrix[blk.srcRows[0]];
    if (!srcRow) return true;
    const nonNull = blk.cols.reduce((s, c) => s + (srcRow[c] != null ? 1 : 0), 0);
    return nonNull > blk.cols.length * 0.5;
  });


  // ── Identical row vectors (grouped by pattern) ─────────────────────
  const rowKeys=matrix.map(row=>row.map(v=>v!=null?v.toFixed(4):"null").join("|"));
  const rowDupGroups={}; // key → [row indices (0-based)]
  for(let r=0;r<nR;r++){
    const k=rowKeys[r];
    if(!rowDupGroups[k]) rowDupGroups[k]=[];
    rowDupGroups[k].push(r);
  }
  // Filter to groups with ≥2 rows, sort by count desc
  // Sparsity filter: suppress groups where the representative row is >50% null
  const rowDupGroupList=Object.entries(rowDupGroups)
    .filter(([,rows])=>rows.length>=2)
    .filter(([,rows])=>{
      const rep=matrix[rows[0]];
      const nonNull=rep.filter(v=>v!=null).length;
      return nonNull > rep.length * 0.5;  // require >50% non-null
    })
    .map(([,rows])=>({
      type:"duplicate-group",
      rows:rows,
      count:rows.length,
      values:matrix[rows[0]].map(v=>v!=null?v.toFixed(2):"—").join(", ")
    }))
    .sort((a,b)=>b.count-a.count);
  // Back-compat: count total duplicate rows (each group contributes count-1 excess)
  const nRowDups=rowDupGroupList.reduce((s,g)=>s+g.count-1,0);
  // Legacy pair list for copy summary (limit display)
  const rowDupPairs=[];
  for(const g of rowDupGroupList){
    if(rowDupPairs.length>=10) break;
    for(let i=1;i<g.rows.length&&rowDupPairs.length<10;i++){
      rowDupPairs.push({type:"duplicate-row",rows:`${g.rows[0]+1} & ${g.rows[i]+1}`,
        values:g.values});
    }
  }
  const rowDupSet=new Set(rowDupPairs.map(d=>d.rows));

  const crossRowSameColLocs=[];
  for(let c=0;c<nC;c++){
    const seen={};
    for(let r=0;r<nR;r++){
      const v=matrix[r]?.[c]; if(v==null) continue;
      const k=v.toFixed(4);
      if(seen[k]!==undefined){
        const pairKey=`${seen[k]+1} & ${r+1}`;
        if(!rowDupSet.has(pairKey)&&crossRowSameColLocs.length<10)
          crossRowSameColLocs.push({type:"cross-row-same-col",rows:pairKey,col:c+1,value:v});
      } else { seen[k]=r; }
    }
  }

  // ── Row-duplicate p-value ────────────────────────────────────────────────────
  // Catches scattered identical rows at arbitrary positions (e.g. DS04 row 3→41).
  // Block copy detector only finds consecutive rectangular blocks, not scattered copies.
  // pMatchRow = Π(HHI_c) across columns = probability two random rows match.
  let pMatchRow = 1;
  for(let c=0;c<nC;c++){
    const colFreq={};
    let colN=0;
    for(let r=0;r<nR;r++){
      const v=matrix[r]?.[c];
      const k=v!=null?v.toFixed(4):`\x00NULL${c}\x00${r}`;  // unique per cell so nulls never match
      colFreq[k]=(colFreq[k]||0)+1; colN++;
    }
    if(colN>0){
      let hhi=0;
      for(const cnt of Object.values(colFreq)) hhi+=(cnt/colN)**2;
      pMatchRow *= hhi;
    }
  }
  const nRowPairs=nR*(nR-1)/2;
  const rowDupPValue=binomialP(Math.max(nRowDups,1), nRowPairs, pMatchRow);
  const rowDupPValueAdj=nRowDups===0?1:rowDupPValue;

  // ── Block copy p-value ──────────────────────────────────────────────────────
  // Row-to-row blocks:
  //   p_row = Π(HHI_c) over the block's columns = P(two rows match at those cols)
  //   p_block = p_row^h = P(h consecutive row-pairs all match)
  //   n_opportunities = search volume (offsets × starting positions)
  // Column-to-column blocks (isColumnMatch):
  //   p_cross = Σ_v freq_src(v)/N × freq_dst(v)/N = P(same-row match between two columns)
  //   p_block = p_cross^h = P(h consecutive same-row matches)
  //   n_opportunities = C(nCols, 2) × (nRows - h + 1) = column pairs × starting rows
  let bestBlockP = 1;
  for (const blk of sparseFilteredBlocks) {
    let pBlock, nOpp;
    if (blk.isColumnMatch) {
      // Cross-column frequency overlap (lazy computation)
      const ci = blk.srcCol ?? blk.cols[0], cj = blk.dstCol ?? blk.cols[1];
      const key = crossColKey(ci, cj);
      if (crossColOverlap[key] === undefined) {
        const freqI = colFreqs[ci] || {}, freqJ = colFreqs[cj] || {};
        const nI = colNs[ci] || 1, nJ = colNs[cj] || 1;
        let overlap = 0;
        for (const [val, cntI] of Object.entries(freqI)) {
          if (freqJ[val]) overlap += (cntI / nI) * (freqJ[val] / nJ);
        }
        crossColOverlap[key] = overlap;
      }
      const pCross = crossColOverlap[key];
      pBlock = Math.pow(pCross, blk.height);
      // Opportunities: any pair of columns × any starting row
      const nColPairs = wrC * (wrC - 1) / 2;
      nOpp = nColPairs * Math.max(1, wrR - blk.height + 1);
    } else {
      // Row-to-row: use within-column HHI
      let pRow = 1;
      for (const c of blk.cols) pRow *= (wrColHHI[c] || 1);
      pBlock = Math.pow(pRow, blk.height);
      const effectiveMaxOff = blk.isFullRow ? (wrR - 1) : maxOffset;
      nOpp = 0;
      for (let d = 1; d <= effectiveMaxOff; d++) nOpp += Math.max(0, wrR - d - blk.height + 1);
    }
    if (nOpp < 1) nOpp = 1;
    const pAdj = Math.min(1, pBlock * nOpp);
    if (pAdj < bestBlockP) bestBlockP = pAdj;
  }

  // ── Combined flag (S95 Track A 1a) ──────────────────────────────────────────
  // Four sub-tests matched to METHODOLOGY.md §1.1:
  //   Test 1 — value-level collision count (exact binomial on same-value pair count)
  //   Test 2 — identical row vectors (row-dup binomial, h=1 scattered copies)
  //   Test 3 — within-row column-pair coincidences (exact binomial, bin-local null)
  //   Test 4 — block copies (h≥2 contiguous blocks via row-hash / offset / col-segment)
  // BH-FDR across all 4 raw p-values; combined p = min of adjusted.
  // Previous regime (`structuralP = min(block, row-dup)`) was not a valid correction.
  const rawPs = [collisionP, rowDupPValueAdj, withinRowP, bestBlockP];
  const adjPs = bhFDR(rawPs);
  const combinedP = Math.min(...adjPs);
  const flag = flagFromP(combinedP);

  const allLocs=[...rowDupPairs,...withinRowLocs,...crossRowSameColLocs];

  return { name:"Exact Duplicate Detection", category:"copied",
    description:`Tests for suspicious value repetition. Four sub-tests: (1) value-level collisions (exact binomial on same-value pair count), (2) identical row vectors (row-dup binomial), (3) within-row column-pair coincidences (exact binomial, bin-local null), (4) block copies (\u03A0(HHI_c)^h \u00D7 Bonferroni). BH-FDR on 4. Range ${mn.toFixed(2)}\u2013${mx.toFixed(2)}, precision ${dominantDp}dp \u2192 ${nBins} possible values, p\u2081=${p1.toExponential(2)}.`,
    nBins, nDistinct, isInteger, p1:p1.toExponential(2), p1Source, expectedPerValue:(N*p1).toFixed(2),
    primaryP:combinedP,
    overRepresentedValues:overRepresented.length,
    collisionObs, collisionNPairs, collisionP:collisionP<0.0001?"<0.0001":collisionP.toFixed(4),
    duplicateRows:nRowDups, rowDupPValue:rowDupPValueAdj<0.0001?"<0.0001":rowDupPValueAdj.toFixed(4),
    withinRowMatches:withinRowMatchTotal, withinRowExpected:withinRowExpected.toFixed(1),
    withinRowPairTotal,
    withinRowZ:wrZ.toFixed(2), withinRowP:withinRowP<0.0001?"<0.0001":withinRowP.toFixed(4),
    bestBlockP:bestBlockP<0.0001?"<0.0001":bestBlockP.toFixed(4),
    // S95 diagnostic: raw numeric p-values [collision, rowDup, withinRow, block]
    _rawPs:[collisionP, rowDupPValueAdj, withinRowP, bestBlockP],
    _wrZ:wrZ,
    wrWithinObs, wrWithinExp:wrWithinExp.toFixed(1), wrWithinRatio:wrWithinExp>0?(wrWithinObs/wrWithinExp).toFixed(1):"\u2014",
    wrCrossObs, wrCrossExp:wrCrossExp.toFixed(1), wrCrossRatio:wrCrossExp>0?(wrCrossObs/wrCrossExp).toFixed(1):"\u2014",
    withinColObs, withinColExp:withinColExp.toFixed(1), withinColRatio:withinColExp>0?(withinColObs/withinColExp).toFixed(1):"\u2014",
    blockCopies:sparseFilteredBlocks.slice(0,20),
    flag, details:allLocs.slice(0,20), overRepresented:overRepresented.slice(0,10),
    rowDupGroupList:rowDupGroupList.slice(0,20), withinRowLocs:withinRowLocs.slice(0,200),
    groups:rowDupGroupList.slice(0,20).map((g,i)=>({id:i,rows:g.rows,type:"exact",testKey:"dupDet",count:g.count})) };
}
