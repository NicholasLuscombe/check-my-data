# Session 298 — collision-null density estimator, second candidate (READ-ONLY)

Read-only. No source changed, no fixture changed, no batch gated. This scopes the density estimator for the Exact Duplicate Detection collision test after the first candidate — a Silverman-bandwidth kernel density integrated as the step times the integral of the squared density — was found to over-fire on legitimate high-precision continuous data. That earlier form moved seven benign fixtures to HIGH, including a clean one (09-proteomics). This read measures one replacement baseline against the full batch of 25 fixtures. It implements nothing.

Method is the same mirror-pipeline probe the two prior reads used, now removed: parse each fixture, run the full engine to get the exact matrix the collision test sees, recompute the collision baseline, and re-run the real survival, correction, and flag chain. The per-column stratified binomial combine (within-column observed pairs against each column's own null, aggregated to one collision probability) is the same one already confirmed to reproduce current behaviour on all 25 fixtures with the empirical index; it is not under test here. Only the per-column baseline changes.

---

## The candidate: a concentration index over recording cells

For each column, estimate a smooth density (Silverman-bandwidth Gaussian kernel, the same provisional estimator). Discretize it to that column's own recording grid, where the step is ten to the power of minus the column's decimal precision. Each recording cell's probability is the density's mass over the cell's width. The per-pair collision probability is the sum of the squared cell probabilities — a Herfindahl index over cells rather than over observed values. The intended contrast with the failed form: an integral of squared density drives the exact-match probability toward zero as precision rises, so any coincidental exact repeat looks impossible and fires; a sum over finite-width recording cells was expected to keep a same-cell match at a realistic probability.

## Result: the candidate fails criterion (b)

Both criteria had to hold. The first does; the second does not.

- **(a) Fixture 23 flips LOW to HIGH.** Yes, decisively — collision p ≈ 6.4e-204.
- **(b) The seven benign movers stay LOW.** No. All seven move to HIGH again, with the same collision p-values as the failed form.

Full verdict table under the cell-discretized baseline:

| Fixture | Live | Cell-discretized | |
| --- | --- | --- | --- |
| 01-densitometry-clean | LOW | LOW | |
| 02-densitometry-fabricated | LOW | LOW | |
| 03-qpcr-clean | LOW | LOW | |
| 04-qpcr-fabricated | HIGH | HIGH | |
| 05-cellcount-clean | LOW | LOW | |
| 06-cellcount-fabricated | HIGH | HIGH | |
| 07-elisa-clean | LOW | LOW | |
| 08-elisa-fabricated | LOW | LOW | |
| 09-proteomics-clean | LOW | **HIGH** | moved — clean fixture false positive |
| 10-proteomics-fabricated | HIGH | HIGH | |
| 11-rnaseq-multicondition | LOW | **HIGH** | moved |
| 12a-uniform-mixture-clean | LOW | LOW | |
| 12b-uniform-mixture-fabricated | LOW | LOW | |
| 13-vfstest-cellcountest | LOW | LOW | |
| 14-crctest-survey | HIGH | HIGH | |
| 15-missing-carlisle | LOW | LOW | |
| 16-densitometry-carlisle-overbalanced | LOW | LOW | |
| 17-densitometry-carlisle-clean | LOW | LOW | |
| 19-inheritance-fabricated | LOW | **HIGH** | moved |
| 20-bimodal-fab | LOW | **HIGH** | moved |
| 21-localised-ar | LOW | **HIGH** | moved |
| 22-covariance-block | LOW | **HIGH** | moved |
| 23-recurrence-null-mixed | LOW | **HIGH** | moved — the intended target |
| 24-recurrence-null-control | LOW | **HIGH** | moved |

The mover set is identical to the first candidate's, and the collision p-values match it to the significant figures measured. Fixture 24, the control, also moves to HIGH; it shares the same recurrence column as fixture 23, so a baseline that fires on 23 fires on 24 as well.

## The near-boundary numbers

The margins are not close on either side. The target flips overwhelmingly, and the two benign fixtures the first candidate failed worst fail again by wide margins — these are not fixtures holding LOW at a marginal p, they are clear false positives.

**Fixture 23 (must flip, and does):** aggregate collision probability 5.18e-4, expected 11.1 collisions against 225 observed, collision p ≈ 6.4e-204. The recurrence column alone carries it: 120 values, 75 distinct, 225 same-value pairs, baseline 1.54e-3, expected 11.0 against 225 observed.

**09-proteomics-clean (must stay LOW, does not):** aggregate baseline 7.0e-6, expected 3.37 collisions against 12 observed, collision p 2.0e-4 — HIGH. Per column, six columns of 400 values each, almost entirely distinct, carrying only a handful of coincidental exact repeats:

| Column | N | distinct | observed pairs | precision | baseline | expected |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 400 | 400 | 0 | 2 | 6.9e-6 | 0.55 |
| 1 | 400 | 399 | 1 | 2 | 6.7e-6 | 0.53 |
| 2 | 400 | 397 | 3 | 2 | 7.1e-6 | 0.57 |
| 3 | 400 | 398 | 2 | 2 | 7.2e-6 | 0.57 |
| 4 | 400 | 396 | 4 | 2 | 7.2e-6 | 0.58 |
| 5 | 400 | 398 | 2 | 2 | 7.1e-6 | 0.57 |

Twelve coincidental matches across six columns against an expected 3.4 is enough to fire, on data with no fabrication.

**21-localised-ar (must stay LOW, does not):** aggregate baseline 2.8e-7, expected 0.18 collisions against 15 observed, collision p 4.3e-24 — HIGH. Eight columns of normal-shaped values recorded to six decimals, each carrying one to three coincidental repeats against an expected fraction of a collision. The baseline expects essentially no exact matches at six-decimal precision, so a dozen coincidental ones read as overwhelming evidence.

## Why the candidate equals the form it was meant to replace

The two baselines are the same quantity whenever the recording step is much smaller than the kernel bandwidth. Summing the squared cell probabilities over cells of width `step` is a Riemann sum: it converges to the step times the integral of the squared density as the cells get narrow. Every continuous column in this batch sits deep in that narrow-cell regime — precisions of two to six decimals against bandwidths from about 0.6 up to the tens. Checked directly on fixture 23's recurrence column, the one column where the probe evaluated the true recording grid rather than the narrow-cell limit: bandwidth 0.60, step 0.01, exact cell sum 1.5390e-3 versus the integral form 1.5386e-3 — a relative difference of 0.03 percent. The two forms coincide, so the candidate inherits the earlier failure exactly.

The distinction the candidate was built on — that a recording cell has finite width, so a same-cell match keeps a realistic probability — only bites when the cell width is a meaningful fraction of the density's spread. At six decimals the cell is a millionth of a unit against a spread near one; at two decimals over a range of several thousand the cell is a hundredth against a bandwidth in the tens. In both, the cell mass is the density times the step and shrinks with the grid exactly as the integral does. There is no continuous column in this batch coarse enough, relative to its own spread, for the discretization to behave differently.

Underneath that is a structural point about the whole approach. The empirical index does not fire on 09 or 21 because it predicts collisions from the observed distinct-value count: with 400 near-distinct values it expects around 200 collisions per column and sees about two, so it vastly over-predicts and stays LOW. The recurrence in fixture 23 is exactly what makes the empirical index expect more collisions than occur — 283 expected against 225 seen — which is the circularity the fix targets. But any density model that expects fewer collisions than the recurrence produces (11 against 225 for the recurrence column) also expects far fewer than the coincidental repeats in a clean high-precision column (3.4 against 12 for 09). Comparing exact-repeat counts against a smooth-density collision rate cannot separate a genuine recurrence defect from the ordinary coincidental repeats that legitimate high-precision data carries — whether that rate is written as an integral or as a sum over cells.

## The precision-grid question

The prior read flagged that the pooled decimal precision and step are computed once over all cells, at lines 38 and 39. A per-column baseline needs a per-column precision instead. This is derivable at the point the baseline is built: the matrix is in scope, and the same string-based precision computation used at line 37 runs on each column's own values inside the collision loop. Nothing needs threading in from elsewhere — the pooled precision and step at lines 38 and 39 simply become per-column values computed within the loop. That plumbing is local and was confirmed clean; it is not what fails here.

## Where this leaves the fix

The combine is ready and the per-column precision is available. The blocker is the estimator, and both candidates measured so far fail the same benign columns for the same structural reason. A third baseline is a design decision, not a Code improvisation, so this read stops at a clean failure characterization rather than reaching for another candidate. What the next candidate has to do is separate a genuine recurrence from coincidental exact repeats in legitimate high-precision data — the empirical index does this only by being self-calibrated to the observed repeat rate, which is the circularity being removed, so the replacement needs a source of expected-collision rate that is neither the observed repeats (circular) nor a smooth continuous density (blind to quantization). That is the crux for the Chat design pass.

`./scripts/dev.sh awesome-almeida-9917d4`
