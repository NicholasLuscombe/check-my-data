#!/usr/bin/env python3
"""
Cross-validate Check My Data p-values against scipy/statsmodels.

Usage:
    python cross_validate_pvalues.py validation-*.json

Compares JS-computed p-values to independent scipy recomputation.
Reports max |Δp| per test type. For the review paper methods section.
"""

import json
import sys
import glob
from pathlib import Path
import numpy as np
from scipy import stats
from statsmodels.stats.multitest import multipletests


# ── Tolerance thresholds ──────────────────────────────────────────────
PARAMETRIC_TOL = 1e-4    # parametric CDFs (chi-sq, normal, binomial)
FDR_TOL = 1e-4           # BH-FDR adjusted values
DISPLAY_TOL = 5e-4       # rounded display values (4 sig figs)

results_log = []


def log(test_name, dataset, test_type, js_p, scipy_p, delta, status):
    results_log.append({
        "dataset": dataset,
        "test": test_name,
        "type": test_type,
        "js_p": js_p,
        "scipy_p": scipy_p,
        "delta": delta,
        "status": status,
    })


def check(label, dataset, test_type, js_p, scipy_p, tol=PARAMETRIC_TOL):
    """Compare two p-values and log the result."""
    if js_p is None or scipy_p is None:
        return
    delta = abs(js_p - scipy_p)
    status = "PASS" if delta <= tol else "FAIL"
    log(label, dataset, test_type, js_p, scipy_p, delta, status)
    return status == "PASS"


def validate_chi_squared(test, dataset):
    """Validate chi-squared CDF: p = 1 - chi2.cdf(stat, df)."""
    params = test["parameters"]
    # Terminal Digit Uniformity
    if "chiSq" in params and "df" in params and "p" in params and params["chiSq"] is not None and params["p"] is not None:
        chi_sq = params["chiSq"]
        df = params["df"]
        js_p = params["p"]
        scipy_p = stats.chi2.sf(chi_sq, df)
        check(test["testName"] + " (main)", dataset, "chi-squared", js_p, scipy_p)

    # Some tests have secondary chi-squared (e.g., TDU chi10 for 10-digit)
    if "chi10" in params and "p10" in params and params["chi10"] is not None and params["p10"] is not None:
        scipy_p10 = stats.chi2.sf(params["chi10"], 9)  # df=9 for 10 digits
        check(test["testName"] + " (10-digit)", dataset, "chi-squared",
              params["p10"], scipy_p10)

    # Selective Noise / Bartlett
    if "bartlettChi" in params and "pBartlett" in params and params["bartlettChi"] is not None and params["pBartlett"] is not None:
        scipy_p = stats.chi2.sf(params["bartlettChi"], params["df"])
        check(test["testName"] + " (Bartlett)", dataset, "chi-squared",
              params["pBartlett"], scipy_p, tol=DISPLAY_TOL)


def validate_normal(test, dataset):
    """Validate normal CDF tests.
    
    Note: Autocorrelation pooledT and Runs pooledZ are aggregated statistics
    whose relationship to the final p-value may involve per-condition pooling.
    We only validate when the export provides a direct z-score that maps to
    the reported p-value via a simple normal CDF.
    """
    params = test["parameters"]

    # Only validate if we have a direct z → p mapping
    if "z" in params and test["primaryP"] is not None:
        z = params["z"]
        # Determine tail from test context
        if test["testName"] in ("Runs Test", "Noise Scaling With Measurement Size"):
            scipy_p = 2 * stats.norm.sf(abs(z))  # two-tailed
            check(test["testName"], dataset, "normal",
                  test["primaryP"], scipy_p)

    # Autocorrelation: pooledT is NOT a simple z → p mapping
    # (it's aggregated across conditions). Skip unless raw z is exported.
    if "pooledT" in params and "pooledP" in params:
        # Cannot independently recompute without per-condition detail
        # Log as skipped
        log(test["testName"] + " (pooled)", dataset, "normal-skipped",
            params["pooledP"], None, 0, "SKIP")


def validate_binomial(test, dataset):
    """Validate binomial survival function."""
    params = test["parameters"]

    # Mahalanobis: normal approximation to binomial
    # Engine returns p=1.0 when nExceed <= expected (nothing to test). Skip these.
    if "nExceedP01" in params and "nRows" in params:
        k = params["nExceedP01"]
        n = params["nRows"]
        p0 = 0.01  # ALPHA_BIN threshold
        expected = n * p0
        if k <= expected:
            log(test["testName"] + " (nExceed<=expected, skip)", dataset, "binomial-skip",
                params.get("binomP", test["primaryP"]), None, 0, "SKIP")
        else:
            mu = n * p0
            sigma = np.sqrt(n * p0 * (1 - p0))
            z = (k - mu) / sigma
            scipy_p = stats.norm.sf(z)  # one-tailed upper
            check(test["testName"] + " (binom-normal-approx)", dataset, "binomial",
                  params.get("binomP", test["primaryP"]), scipy_p)

    # Decimal Precision per-level: LOWER tail (flags suspiciously FEW values)
    # Having more values at a precision is normal (rounding); fewer is suspicious
    if "perLevel" in test:
        for level in test["perLevel"]:
            if "rawP" in level and "observed" in level and "expectedP" in level:
                k = level["observed"]
                n = params.get("nDecimalValues", 0)
                p0 = level["expectedP"]
                if n > 0 and p0 > 0 and p0 < 1:
                    # Lower tail: P(X <= k) — flags too few
                    scipy_p = stats.binom.cdf(k, n, p0)
                    check(f"{test['testName']} (dp={level['dp']})", dataset,
                          "binomial", level["rawP"], scipy_p)


def validate_fisher_z(test, dataset):
    """Validate Fisher-z transform p-values for correlation tests.
    
    Prefer using exported zStat directly (full precision) over recomputing
    from potentially rounded r/iccExpected.
    """
    if "perPair" not in test:
        return
    k = test["parameters"].get("nPairs", len(test["perPair"]))
    for pair in test["perPair"]:
        raw_p = pair.get("rawP")
        if raw_p is None:
            continue

        # Determine tail: CRC is one-sided upper (only flags high correlation)
        # IRC is two-sided
        is_crc = "Cross-Condition Rank" in test["testName"]
        
        # Prefer direct zStat if available (full precision)
        z_stat = pair.get("zStat")
        if z_stat is not None:
            if is_crc:
                # One-sided upper: if z <= 0, p = 1.0 (r below expected, not suspicious)
                scipy_p = 1.0 if z_stat <= 0 else stats.norm.sf(z_stat)
            else:
                scipy_p = 2 * stats.norm.sf(abs(z_stat))
            check(f"{test['testName']} ({pair['pair']})", dataset,
                  "fisher-z", raw_p, scipy_p)
            continue

        # Fallback: recompute from r and iccExpected
        r = pair.get("r")
        n = pair.get("n")
        loo_icc = pair.get("rawLooICC", pair.get("iccExpected"))
        if r is None or n is None or loo_icc is None:
            continue
        z_obs = np.arctanh(r)
        z_null = np.arctanh(loo_icc)
        se_pair = 1.0 / np.sqrt(n - 3)
        se = se_pair * np.sqrt(k / (k - 1))
        z_stat_calc = (z_obs - z_null) / se
        if is_crc:
            scipy_p = 1.0 if z_stat_calc <= 0 else stats.norm.sf(z_stat_calc)
        else:
            scipy_p = 2 * stats.norm.sf(abs(z_stat_calc))
        check(f"{test['testName']} ({pair['pair']})", dataset,
              "fisher-z", raw_p, scipy_p)


def validate_bh_fdr(test, dataset):
    """Validate BH-FDR correction."""
    fdr = test.get("bhFdrGroup")
    if not fdr or not fdr.get("rawPValues"):
        return
    raw = np.array(fdr["rawPValues"])
    js_adj = np.array(fdr["adjustedPValues"])

    # statsmodels BH-FDR
    _, scipy_adj, _, _ = multipletests(raw, method="fdr_bh")

    for i in range(len(raw)):
        check(f"{test['testName']} BH-FDR[{i}]", dataset,
              "BH-FDR", js_adj[i], scipy_adj[i], tol=FDR_TOL)


def validate_dataset(filepath):
    """Run all validations on a single exported JSON."""
    with open(filepath) as f:
        data = json.load(f)

    dataset = data["datasetName"]
    print(f"\n{'='*60}")
    print(f"Dataset: {dataset}")
    print(f"{'='*60}")

    for test in data["tests"]:
        tt = test["testType"]

        if tt == "chi-squared":
            validate_chi_squared(test, dataset)
        elif tt == "normal":
            validate_normal(test, dataset)
        elif tt == "binomial":
            validate_binomial(test, dataset)
        elif tt == "fisher-z":
            validate_fisher_z(test, dataset)

        # Also check chi-squared params even for non-chi-squared primary type
        # (e.g., Benford uses simulation but also has chiSq)
        if tt != "chi-squared" and "chiSq" in test.get("parameters", {}):
            validate_chi_squared(test, dataset)

        # Selective Noise is chi-squared but may be labeled differently
        if "bartlettChi" in test.get("parameters", {}):
            validate_chi_squared(test, dataset)

        # BH-FDR groups
        validate_bh_fdr(test, dataset)


def print_summary():
    """Print results table for methods section."""
    print(f"\n{'='*60}")
    print("CROSS-VALIDATION SUMMARY")
    print(f"{'='*60}\n")

    # Group by test type
    from collections import defaultdict
    by_type = defaultdict(list)
    for r in results_log:
        by_type[r["type"]].append(r)

    all_pass = True
    print(f"{'Test Type':<15} {'N':>4} {'Max |Δp|':>12} {'Verdict':>8}")
    print("-" * 45)
    for tt in sorted(by_type.keys()):
        entries = by_type[tt]
        n = len(entries)
        max_delta = max(e["delta"] for e in entries)
        fails = sum(1 for e in entries if e["status"] == "FAIL")
        verdict = "PASS" if fails == 0 else f"FAIL({fails})"
        if fails > 0:
            all_pass = False
        print(f"{tt:<15} {n:>4} {max_delta:>12.2e} {verdict:>8}")

    print(f"\nTotal comparisons: {len(results_log)}")
    print(f"Overall: {'ALL PASS' if all_pass else 'FAILURES DETECTED'}")

    # Print failures detail
    fails = [r for r in results_log if r["status"] == "FAIL"]
    if fails:
        print(f"\n{'─'*60}")
        print("FAILURES:")
        for f in fails:
            print(f"  {f['dataset']} / {f['test']}")
            print(f"    JS={f['js_p']:.10e}  scipy={f['scipy_p']:.10e}  Δ={f['delta']:.2e}")

    # Print all comparisons
    print(f"\n{'─'*60}")
    print("ALL COMPARISONS:")
    for r in results_log:
        if r["status"] == "SKIP":
            print(f"  ○ {r['dataset']:30s} {r['test']:45s} SKIPPED")
            continue
        marker = "✓" if r["status"] == "PASS" else "✗"
        print(f"  {marker} {r['dataset']:30s} {r['test']:45s} "
              f"JS={r['js_p']:.6e} scipy={r['scipy_p']:.6e} Δ={r['delta']:.2e}")


if __name__ == "__main__":
    files = sys.argv[1:]
    if not files:
        files = sorted(glob.glob("validation-*.json"))
    if not files:
        print("Usage: python cross_validate_pvalues.py validation-*.json")
        sys.exit(1)

    for f in files:
        validate_dataset(f)

    print_summary()
