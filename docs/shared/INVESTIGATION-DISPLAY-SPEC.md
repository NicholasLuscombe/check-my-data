# Check My Data — Investigation Display UI Specification

**Version:** 7.0 (Chat post-S157 — A1.D0c-bis chrome lock + mechanism iconography)
**Status:** QC mode ✅ (Code S21). Forensics mode ✅ (Code S25+S69+S71, S156+S157 chrome lock). Peer review mode ✅ (Code S70+S71).

This document is the authoritative reference for how Check My Data presents analysis results across three modes. It covers:
1. **Category system** — what observation categories exist and which tests map to them
2. **Convergence layer** — how cell-level flags accumulate and hotspots are detected
3. **Shared components** — UI architecture (S71)
4. **Font system** — typography rules (S71)
5. **Original file coordinates** — coordinate tracking (S71)
6. **Three-mode presentation** — what each audience sees and why
7. **Guidance system** — how actionable advice scales across modes
8. **Excel export** — standalone investigation document structure

---

## Design Principle

The tool serves three audiences with one analysis:
- **Researchers** checking their own data before submission
- **Reviewers** (editors, integrity officers) screening someone else's data
- **Experts** (forensic statisticians) doing deep investigation

All three need the same answer to the same question — "is something wrong, and where?" — but in different language, at different depth, and with different follow-up actions.

**Three modes scale gradually:** QC answers "is something wrong?" → Peer Review answers "where is it wrong and what to ask?" → Forensics answers "what exactly is wrong and how do I know?" Each mode adds one layer of depth. Most experienced users will gravitate to Forensics, but the bridge matters for first-time reviewers.

**Screening → Investigation workflow:** Check My Data is a domain-blind statistical screening tool. It tells you *that* something looks anomalous and *where* in the data. Domain-aware investigation (connecting statistical anomalies to study context) is a separate step — the tool facilitates this handoff via the Excel export and AI consultation prompt.

---

## Analysis Pipeline (mode-independent)

Every analysis produces the same outputs regardless of which mode is displayed:

1. **Engine** — runs all applicable tests (currently 23+ across five cluster categories, see Test-to-Category Mapping below)
2. **Localisation** — each localising test emits a set of (row, col) cells it considers suspicious
3. **Convergence layer** — overlays all cell sets onto the original data grid. Computes per-cell flag count and test diversity. Identifies rectangular hotspots. Ranks them.
4. **Global findings** — tests that don't localise produce dataset-wide observations
5. **Narrative generator** — each hotspot + its contributing tests + the active mode → text. Three templates per finding type.
6. **Renderer** — displays the active mode's view. Mode is switchable without recomputation.

---

## Severity Scale

The product uses two related-but-distinct severity ladders, settled post-S156 D1 + D5:

### Test-level tier (per-finding)

Per-test verdict, sentence-case "High / Moderate / Clear" (replaced the earlier mixed ALL CAPS `FLAGGED/NOTED/CLEAR` chrome). Wired through `SEV_VERDICT[severity].color` for chrome colour, `SEV_VERDICT[severity].label` for the tier word.

| Tier word | Internal flag | Colour | Used at |
|-----------|---------------|--------|---------|
| **High** | `HIGH` | Red `#c0392b` (`SEV_VERDICT.HIGH.color`) | Test cards, chip suffix, cluster-header right badge |
| **Moderate** | `MED` | Orange `#D97706` (`SEV_VERDICT.MED.color`) | Test cards, chip suffix, cluster-header right badge |
| **Clear** | `LOW` | Green `#16a34a` (`SEV_VERDICT.LOW.color`) | Test cards, CLEAR-strip, cluster-header right badge for all-cleared clusters |

Engine identifier `r.flag === "HIGH" / "MED" / "LOW"` stays the load-bearing string identity at the dispatch layer (S129 convention); display-label transform happens at the chrome edge.

### Dataset-level outcome (overall severity score)

Dataset-wide assessment, 4-band action ladder. Settled at S156 D5 (replacing the earlier "Clean / Low / Medium / High" verdict language).

| Score | Outcome label | Verdict text (`VERDICT_TEXT.headline`) | Colour | Action framing |
|-------|---------------|----------------------------------------|--------|----------------|
| 0 | Proceed | "All checks passed" | Green | Your data is consistent with genuine instrument-recorded measurements. |
| 1 | Review | "Some findings warrant a closer look" | Yellow-green | A few things worth checking — likely false positives but verify. |
| 2 | Investigate | "Multiple anomalies detected" | Orange | Investigate the dataset before proceeding. |
| 3 | Investigate closely | "Significant anomalies detected" | Red | Investigate the dataset closely; consider raw-data recovery. |

The "Outcome: N of 4 — Label" row appears in the §4 emit body and in the Excel export Investigation Report header. §1 chrome renders the headline + dot strip + count clause; no Outcome row in §1 (the headline + dots do the work).

Engine canon stays integer 0–3 internally. Display layer maps score → label via `ACTION_LABEL[score]` in `src/constants/narrative.js`.

### Severity-1 false-positive context

For Outcome 1 (Review band): "With N applicable tests at α=0.01, expect ~X false positives by chance." Hidden in QC mode; visible in Peer Review and Forensics modes. Pre-S156 implementation rendered as a separate row; A1.D2 redesign will re-shape into a calibration prologue at §4 emit body.

---

## Category System

### v4.0 categories — five dimensions, display-ordered by concreteness

Aligned with METHODOLOGY-MAP v3's five fabrication dimensions. Categories describe **what was observed**, not what caused it. Causal interpretation lives in the guidance layer.

| Order | Category | Internal key | Dim | Short description |
|---|---|---|---|---|
| 1 | Copy, Paste, Edit | `copied` | I | Same numbers repeat where they shouldn't |
| 2 | Unusual Digits | `digits` | II | Digit patterns don't match usual experimental measurements |
| 3 | Distribution Shapes | `shapes` | V | Data within columns don't follow expected distributions |
| 4 | Cross-Replicate Comparisons | `replicate` | III | Replicate values don't vary like usual experiments |
| 5 | Cross-Condition Comparisons | `group` | IV | Distinct experimental conditions are more similar or different than usual |

Display order: fixed (`MECHANISM_ORDER: copied → digits → shapes → replicate → group`). Same order across all modes. Not sorted by flag status. Order reflects concreteness — most tangible evidence first, most abstract last.

Engine identifier `group` stays — display label is `Cross-Condition Comparisons` (S157-fix3 rename). The S132g engine-identifier-stays / display-label-moves convention governs.

### Test-to-Category Mapping (23 principled + 1 interim)

Display names shown are the strings users see in test cards.

| Test | Category | Localises? | Scope |
|------|----------|------------|-------|
| Duplicated Data (DupDet) | **Copy, Paste, Edit** | ✅ | Row / block / column-segment highlights |
| Duplicated and Offset (ConstOffset) | **Copy, Paste, Edit** | ✅ | Row-pair × column highlights |
| Correlated Residuals (RSC) ‡ | **Copy, Paste, Edit** | ✅ | Top-K row highlights |
| First-Digit Frequencies (Benford 1st) | **Unusual Digits** | ❌ | Global |
| Second-Digit Frequencies (Benford 2nd) | **Unusual Digits** | ❌ | Global |
| Last-Digit Frequencies (TDU) | **Unusual Digits** | ❌ | Global |
| Decimal Places (DecPrec) | **Unusual Digits** | ❌ | Global |
| Repeated Digits (VFS) | **Unusual Digits** | ✅ | Cell value highlights |
| Value Entropy (Shannon) | **Distribution Shapes** | ❌ | Global (column-level detail) |
| Inter-Replicate Correlation (IRC) | **Cross-Replicate Comparisons** | ✅ | Window highlights |
| Kurtosis + A-D | **Cross-Replicate Comparisons** | ❌ | Global/condition |
| Autocorrelation | **Cross-Replicate Comparisons** | ❌ | Global |
| Runs Test | **Cross-Replicate Comparisons** | ✅ | Window highlights |
| Mean-Variance (Noise Scaling) | **Cross-Replicate Comparisons** | ❌ | Global |
| Within-Row Variance | **Cross-Replicate Comparisons** | ✅ | Row highlights |
| Selective Noise | **Cross-Replicate Comparisons** | ✅ | Column highlights |
| Regional Noise | **Cross-Replicate Comparisons** | ✅ | Window × column block |
| LOESS + CUSUM | **Cross-Replicate Comparisons** | ✅ | Changepoint + window |
| Row-Mean Runs | **Cross-Replicate Comparisons** | ✅ | Window highlights |
| Mahalanobis | **Cross-Replicate Comparisons** | ✅ | Outlier row highlights |
| Missing Data Pattern† | **Cross-Replicate Comparisons** | ✅ | Block highlights |
| Cross-Cond Rank (CCR) | **Cross-Condition Comparisons** | ❌ | Global |
| Carlisle Balance | **Cross-Condition Comparisons** | ❌ | Global |
| Cross-Condition Consistency (CCC) | **Cross-Condition Comparisons** | ❌ | Global |

**† Missing Data Pattern — interim placement.** This test detects structural missingness patterns rather than replicate-value variation, so the category description ("Replicate values don't vary like usual experiments") doesn't strictly apply. Parked for re-homing when File Integrity (Dim VI) category lands, or for scope-restriction to cross-condition missingness for a Dim IV home.

**‡ Correlated Residuals (RSC) — cross-condition by scope, Dim I by mechanism.** RSC compares residuals *across conditions*, so a reader scanning by scope might expect it under Cross-Condition Comparisons. It sits in Copy, Paste, Edit because category follows the fabrication *mechanism* — coordinated editing, the same rows edited across groups — and scope is orthogonal to dimension (METHODOLOGY-MAP §Scope). The cross-condition correlation is *how* the editing is detected, not *what* it is. This is the sole scope-vs-placement divergence in the battery (audit-confirmed S175: all 26 other tests' scope matches their §3 cluster).

**S95 Track C changes:**
- Constant-Response Concentration (CRC) removed entirely (engine + UI + exports + docs). Zero detections across 18 validation datasets + 4 real-world cases; scale-group fragmentation on real survey data prevented firing. METHODOLOGY-MAP S94 decision.
- 5 categories renamed and re-keyed: `uneven`/`noise`/`perfect` retired; `shapes`/`replicate`/`group` introduced. Alignment with METHODOLOGY-MAP v3 five dimensions.
- Inter-Replicate Correlation (IRC) moved from Copy, Paste, Edit → Cross-Replicate Comparisons (its mechanism is replicate agreement, not value repetition).
- Mahalanobis moved from "Too Perfect" → Cross-Replicate Comparisons (Dim III).
- Entropy moved from "Unnatural Noise" → Distribution Shapes (Dim V — its own dimension).
- CCR and Carlisle grouped under new Cross-Condition Comparisons (Dim IV) — engine key `group`, display label updated S157-fix3 from "Cross-Group Comparisons" to align with the product's "conditions" vocabulary.
- Missing Data Pattern placed in Cross-Replicate Comparisons as interim (see footnote).

### Mechanism colour + icon registry (S156 + S157)

Each cluster carries a colour and an icon as paired identifiers:

| Cluster | MECH_COLOR | MechIcon glyph |
|---------|-----------|----------------|
| `copied` | `#4A6FA5` slate blue | Two overlapping rectangles (Tabler `ti-copy` lookalike) |
| `digits` | `#BE185D` magenta | "123" numerals (Tabler `ti-123` lookalike, +2px size compensation) |
| `shapes` | `#6B7C32` olive | Histogram (axis + 4 bars of varying heights) |
| `replicate` | `#6B46C1` violet | Horizontal bidirectional arrows |
| `group` | `#9B4F76` dusty rose | 2×2 checkerboard (two filled, two outlined cells) |

Implementation: inline SVG paths in `src/components/shared/MechIcon.jsx` (no external icon library dependency). Sizes vary by surface — see Shared UI Components → Visual hierarchy for surface-by-surface size table.

---

## Convergence Layer

### Purpose

Individual test flags tell you *that* something is wrong. Convergence tells you *where* it's wrong. Multiple independent tests flagging the same region of the data table is far more informative than any individual p-value.

### Cell-level flag accumulation

Each localising test emits a set of (row, col) cells. The convergence layer overlays all cell sets onto the original data grid:

```
convergenceGrid[row][col] = {
    count: 3,
    tests: ['dupDet', 'constOffset', 'loess'],
    categories: ['copied', 'uneven'],
    maxFlag: 'HIGH'
}
```

**Global tests do not contribute to the convergence grid.** They produce dataset-wide observations reported separately.

### Hotspot detection

A **hotspot** is a contiguous rectangular region of the grid with elevated flag density.

Algorithm:
1. Mark all cells with `count ≥ 2` (flagged by ≥2 tests)
2. Find connected components of marked cells (8-connected)
3. Compute bounding rectangle for each component
4. For each rectangle, compute: Density, Depth, Diversity, Category breadth
5. Rank hotspots by depth × diversity
6. Filter: discard hotspots with density < 0.3
7. **Merge** overlapping or adjacent hotspots sharing the same row range (S69)

### Hotspot classification

| Pattern | Meaning |
|---------|---------|
| **Sparse hotspot** — one or two rectangles, rest clear | Partial fabrication. The clean regions provide contrast. |
| **Saturated** — most of the grid lit up | Wholesale fabrication or severe instrument issues. |
| **Scattered** — isolated flagged cells, no connected regions | Probably noise / false positives. |

---

## Shared UI Components (S71, S156, S157)

### Visual hierarchy — three tiers

The report view uses three visual tiers to create clear information hierarchy:

1. **Cluster header (CategoryRow)** — grey background (`C.BG_ZONE`), 3px MECH_COLOR left border (full row, area-marker for the cluster's expanded contents), MechIcon at leading position in MECH_COLOR[mk] at 20px (+2px for digits). Right-side worst-tier word badge in SEV_VERDICT colour at FS.base plain weight ("High" / "Moderate" / "Clear"). Inline ⚠/✓ glyph retired post-S156-fix3.
2. **Test card (TestCardLayout)** — white background (`#FFFFFF`), `1px solid #E5E7EB` border, `borderRadius: 6px`, `boxShadow: '0 1px 3px rgba(0,0,0,0.08)'`. 12px gap between cards. 3px MECH_COLOR left stripe (inherits cluster colour). Cluster-name breadcrumb above test name in `sm Regular MECH sans` typography + 14px MechIcon prefix (+2px for digits) — S156-fix5 + S157.
3. **Evidence content** — inside the white test card. No grey sub-container. Tables and plots sit directly on white.

Categories are separated by horizontal divider lines (`1px solid #E0E0E0`) within a shared container. All categories sit inside one panel (NOT separate panels per category).

### MechIcon size table

| Surface | Base size | Effective size (digits) |
|---------|-----------|-------------------------|
| §1 verdict-card opener inline (count sentence) | 14px | 16px |
| §2 chip + pill (FindingChip / FindingPill) | 16px | 18px |
| §3 cluster header (ClusterRow leading position) | 20px | 22px |
| §3 card breadcrumb (TestCardLayout) | 14px | 16px |

The +2px compensation for the `digits` cluster's MechIcon ("123" letterforms) is applied via `mechIconSize(mk, baseSize)` in `mechanisms.js` — the literal "123" glyph occupies less of its viewBox than the other four cluster icons, so it would render visually smaller at the same nominal size. Per-icon size compensation lives at the data layer (mechanisms.js); consumer sites call the utility rather than hard-coding the bump.

### Component inventory

| Component | File | Purpose |
|-----------|------|---------|
| `Section` | `shared/Section.jsx` | Numbered section wrapper ("1 · Summary" dividers) with consistent padding |
| `CategoryRow` (a.k.a. ClusterRow) | `shared/ClusterRow.jsx` | Cluster header + test cards; `mode` prop (`qc`/`review`/`full`) |
| `TestCardLayout` | `shared/TestCardLayout.jsx` | White card wrapper for individual tests; mode-aware expand/collapse; carries cluster-name breadcrumb |
| `MechIcon` | `shared/MechIcon.jsx` | Inline SVG mechanism glyph (5 cluster-keyed paths) |
| `FindingChip` | `forensics/FindingChip.jsx` | §2 pattern chip with MechIcon + SEV background + tier-word suffix |
| `FindingPill` | `forensics/FindingPill.jsx` | §2 pattern pill variant of FindingChip |
| `EvidenceTable` | `shared/EvidenceTable.jsx` | Results/statistics tables with baked-in font split |
| `PlotLayout` | `shared/PlotLayout.jsx` | Chart container with consistent caption styling |
| `ColumnHeaders` | `shared/ColumnHeaders.jsx` | Two-row sticky header (Excel letters + column names) |

### Section

`<Section number={2} title="What was found">` wraps each numbered section. Renders the divider line with centred number + title (sentence case post-S156), then wraps children with consistent padding. All spacing between sections controlled here.

### CategoryRow / ClusterRow

One component, three modes via `mode` prop (`"qc"` | `"review"` | `"full"`).

**Cluster header chrome (all modes, post-S156 + S157):**
```
[3px MECH border] [icon] **Copy, paste, edit** (3 tests) — are values repeated or too similar?              Moderate ▸
[3px MECH border] [icon] **Distribution shapes** (2 tests) — do the value distributions look unusual?       Clear ▸
```

- Grey background (`C.BG_ZONE`)
- 3px MECH_COLOR left border, full row height
- MechIcon at leading position (20px, +2 for digits) in MECH_COLOR[mk]
- Cluster name + `(N tests)` + dim subtitle (a question framing the cluster's investigative scope)
- Right-side worst-tier word badge in SEV_VERDICT colour ("High" / "Moderate" / "Clear")
- Expand chevron (▸/▾) to the right of the worst-tier word
- Divider line between cluster rows (not above first or below last)

**On expand:** Test cards (via TestCardLayout) appear below the header. The cluster header's MECH left border continues down through the expanded card area as an area-marker for cluster membership.

### TestCardLayout

White card wrapper for individual test results. Mode-aware rendering. Carries cluster-name breadcrumb (S156-fix5) and MECH left stripe (S156-fix3).

**Props:** `testName`, `subtitle`, `status` (level + pValue), `mode`, `mk` (mechanism cluster key — added S156-fix3), `method`, `footer`, `expanded`, `onToggle`, `children`

**Collapsed (post-S156-fix3+fix5 + S157):**
```
┌ white card · 3px MECH stripe ───────────────────────────┐
│ [icon] Cross-replicate comparisons                      │
│ Test Name · subtitle                   Moderate p=0.018 ▸│
└─────────────────────────────────────────────────────────┘
```

**Expanded (Forensics mode):**
```
┌ white card · 3px MECH stripe ───────────────────────────┐
│ [icon] Cross-replicate comparisons                      │
│ Test Name · subtitle                   Moderate p=0.018 ▾│
│                                                         │
│ [footer — one-line result, PROMOTED]                    │
│                                                         │
│ [children — evidence content]                           │
│                                                         │
│ ▸ How this test works                                   │
│ ▸ Implications                                          │
│ ▸ What to look for                                      │
└─────────────────────────────────────────────────────────┘
```

The breadcrumb line above test name renders in `sm Regular MECH sans` typography (cluster-name breadcrumb tuple), prefixed with a 14px MechIcon (+2 for digits) in MECH_COLOR[mk]. On cleared-tier cards (severity LOW), both breadcrumb text and icon render at 0.4 opacity per the consistent cleared-state treatment.

The expanded-body order is set by `MiniCardLayout` in `src/components/shared/CardLayout.jsx` (S168). Footer (the test-specific one-line result) sits ABOVE evidence so the verdict reads first; disclosure stack (How it works / Implications / What to look for) drops BELOW evidence so power users see numbers before exposition. Disclosures are Forensics-only — Peer Review never mounts `MiniCardLayout` (the review branch in `CategoryRow.jsx` routes children to a finding-string `<div>` instead).

Disclosure gates are intentionally asymmetric (not unified): "How this test works" is descriptive — it shows on any expanded Forensics card with a `TEST_METHODS` entry, flagged or not. "Implications" and "What to look for" are finding-specific — they render only when the test fired (`flag !== "LOW"` and `flag !== "N/A"`). The asymmetry exists because the method description carries general orientation regardless of result, while implications and look-for clauses describe what the flagged signal means.

**Mode-aware rendering:**
- **QC:** Test name + status only. No subtitle, no disclosures, no p-value, no breadcrumb. Not individually expandable.
- **Peer Review:** Test name + subtitle + status (no p-value). Breadcrumb visible (post-S156-fix5). Expandable. No disclosure blocks. Simplified evidence as children.
- **Forensics:** Test name + subtitle + status + p-value. Breadcrumb visible. Expandable. Full evidence as children + three-block disclosure stack below evidence (How this test works / Implications / What to look for). Flagged/noted auto-expand.

**Header remains in exactly the same position on expand/collapse** — no layout shift.

### Card information-architecture map (the three-jobs contract)

The card's information-architecture contract — the backstop every per-card copy/display finding routes through. The item-46 design axes (Plot consistency, Per-condition, Standalone-crop, Table content-adaptiveness, Engine-internal-language) and the Tier-4 copy arcs are **cells of this map, not parallel tracks.**

**Why it exists.** The S168 redundancy calls, the S190 sub-header findings, the S197 cleared mismatch, and the engine-internal-language leaks are one problem surfacing on different surfaces in different sessions, each historically fixed locally. Local fixes leave seams (footer↔heading redundancy, state-mismatch) and the seams reappear as new findings. This map ends that by assigning every card element exactly one *job*, so any future finding routes to one owner without fresh adjudication.

**The three jobs.** Under the design principle ("is something wrong, and where?", answered at mode-appropriate depth), every element on a card does exactly one of three:

1. **ORIENT** — *"What is this?"* Labels a surface. State-neutral, verdict-free.
2. **VERDICT** — *"What was found?"* States the result. Lives on **exactly one surface.** Specific when flagged, "nothing found" when cleared. Nothing else on the card concludes.
3. **EXPOUND** — *"What does it mean / how does it work?"* Methodology, implications, follow-up. One click away (disclosure), never in an always-visible label.

**The single rule:** each element does one job; the verdict job is held by one surface only; orientation and exposition never conclude.

**Assignment table.** Every surface, its job, its owning arc. The job is fixed by this map; execution is the arc's.

| Surface | Job | Owning arc | State-varies? |
|---|---|---|---|
| Category breadcrumb | ORIENT | settled (TestCardLayout) | opacity only (0.4 cleared) |
| **Sub-header descriptor** | **ORIENT** | **Sub-header/footer arc (Tier-4)** | **no — one static string** |
| **Footer / result line** | **VERDICT** | **Sub-header/footer arc (Tier-4)** | **yes — finding vs "none found"** |
| Plot heading | ORIENT | Axis 1 (plot consistency) | no |
| Plot caption | EXPOUND | Caption-density arc | no |
| Table heading | ORIENT | Table content-adaptiveness axis | no |
| Table columns/rows | ORIENT (structure) | Table content-adaptiveness axis | content-adaptive |
| §2 guidance caption | EXPOUND (locality) | settled (S193 locality tiers) | by locality tier |
| How this test works | EXPOUND | Engine-internal-language axis | no (always shown) |
| Implications | EXPOUND | settled (gated `flag !== LOW`) | withheld when cleared |
| What to look for | EXPOUND | settled (gated `flag !== LOW`) | withheld when cleared |

No element is owned twice; none is unowned. A finding about *what a plot title says* → Axis 1; *which table rows show* → content-adaptiveness; *methodology in a caption* → engine-language / caption arc; *the sub-header asserting an anomaly, or the footer repeating a count* → the sub-header/footer arc.

**Cross-cutting rules (apply within every cell, so the seams between cells close).**

- **Say it once.** If two surfaces would state the same fact, the ORIENT surface keeps the label and the VERDICT surface states the result — never both. (S167/S168 redundancy calls. Canonical: "Noise by column" heading + "noise differs 3.2× across columns" footer — not "across columns" twice.) The rule governs the *boundary between cells*; each owner trims its own side.
- **One colour per label (S71 font-split rule).** ORIENT surfaces are single-colour (`C.TEXT_1`), no coloured spans; the evidence below carries the highlight. A red column-name in a heading is redundant with the marked cell.
- **Verdict-free orientation.** ORIENT surfaces never conclude — not by asserting an anomaly (S197 cleared mismatch), not by naming the fired mechanism (S190). The mechanism is the footer's job.
- **Plain language on always-visible surfaces.** Engine internals (W=30, χ²/df, §1.9 ¶8) are EXPOUND and belong in How-this-works, never in an ORIENT label or the VERDICT line.

**How the item-46 axes map in** (re-seated as cells, not retired):

- **Axis 1 (plot consistency)** — owns ORIENT for plot headings + the plot visual (null-band, strip idiom, spatial-minimap, axis-label overlap). Plot *caption* is EXPOUND (caption arc).
- **Axis 2 (per-condition presentation)** — a modifier, not a surface: governs how ORIENT/VERDICT/EXPOUND each render when a test runs per-condition.
- **Axis 3 (standalone-crop chrome)** — a coherence check *across* the map: an evidence visual must carry its own ORIENT + VERDICT when cropped out of card chrome. (Re-seated from peer-axis to cross-check — S198.)
- **Table content-adaptiveness** — owns ORIENT (structure) for tables: which columns/rows justify themselves, truncation disclosure.
- **Engine-internal-language** — owns the EXPOUND boundary battery-wide: keeps methodology out of ORIENT/VERDICT surfaces.
- **Affordance discoverability** — DONE (S195–S197). Was the reachability layer *beneath* the map (a surface must be reachable before its copy matters). Reachability first, then content.

**The sub-header/footer arc — the two cells this Tier-4 pass executes.**

- **Sub-header → ORIENT, one static string per test, state-neutral.** States the property the test examines; names no mechanism; asserts no anomaly. Resolves S197 (no longer asserts on a cleared card) and S190 (no longer over/under-claims the fired case) *because it stops being a verdict surface.* Illustrative grammar (final set authored against the read-only audit):
  - "Whether rows or blocks repeat" (Duplicated data)
  - "Whether values are offset copies" (Duplicated and offset)
  - "Whether the same rows are noisy across conditions" (Correlated residuals)
  - "Whether noise differs across columns" (Selective noise)
- **Footer → VERDICT, the sole concluding surface.** Specific fired mechanism when flagged (S190's "name what fired," here where it is state-appropriate); "no X found" + scope + p when cleared (Class-2 pattern, Duplicate Detection landed S198). Drops any count the adjacent heading already states (say-it-once).

Staged execution, each its own dispatch off promoted main: **(1)** sub-header neutralisation — battery-wide string swap, no state gate, highest leverage / lowest risk; **(2)** footer↔heading redundancy — replace-not-append on the known S168 sites (Modality, Selective Noise, Noise Scaling) plus any the audit surfaces.

**Audit (read-only, runs against this map once locked).** Per card, verbatim + `file:line`: sub-header string and where defined (single registry vs per-card); footer string (flagged + cleared where reachable); plot heading; table heading; any inline coloured span in a heading. No edits. Inventory matched to the assignment table → stage-1 string set + redundancy site list. Plot/table heading + colour-span findings are *recorded for their owning axes*, not fixed by this arc — the audit feeds the whole map; this arc consumes only its two cells.

### EvidenceTable

Single source of truth for results/statistics tables (e.g. VFS over-represented values, Mahalanobis outlier rows, Kurtosis condition table). Font split baked in (see Font System). `identifierColumns` prop controls how many leading columns use sans-serif.

Not used for input data excerpt tables (DupDet, hotspot excerpts) — those have specialised rendering but use shared cell tokens (`TD_NUM_CELL`, `TD_ID_CELL`).

### PlotLayout

Chart container replacing the former `miniCardWrap`. Wraps SVG charts with consistent margins and renders caption below in `FF.UI` / `C.TEXT_3`.

### ColumnHeaders

Two-row sticky header for data excerpt tables:
- Row 1: Original Excel column letters (#, A, B, C, D, E...)
- Row 2: Column names (Row, Position, Rep_A, Rep_B...)

Bleed-through bug fix baked in (2px overlap + z-index). Used by DupDet evidence tables.

---

## Font System (S71)

### Font split rule

Baked into shared components. No inline font overrides needed.

| Context | Font family | Size | Notes |
|---------|------------|------|-------|
| `<th>` table headers | `FF.UI` (system sans-serif) | `TF.DETAIL` (11px) | All tables |
| `<td>` identifier columns (row #, position) | `FF.UI` | `TF.DETAIL` | First 1–2 columns |
| `<td>` data columns (numeric values) | `FF.MONO` (monospace) | `TF.DETAIL` | Crossbar 0s, tabular-nums |
| Method descriptions | `FF.UI` | `TF.BODY` | Matches QC category descriptions |
| Chart captions | `FF.UI` | `TF.DETAIL` | `C.TEXT_3` colour |
| Summary footers | `FF.UI` | `TF.DETAIL` | `C.TEXT_3` colour |
| Sub-headings (table/chart labels) | `FF.UI` | `FW.SEMI` | `C.TEXT_1` — **no coloured spans** |

Full typography system lives in `TYPOGRAPHY-SYSTEM.md` (27-tuple chrome register inventory). This section captures only the font-split rule that pre-dates the typography system.

### Import preview table is the visual reference

All data tables across the app match the import preview table's font treatment, padding, row height, and alternating row backgrounds.

### Cell formatting tokens (`styles.js`)

| Token | Purpose |
|-------|---------|
| `TH_EVIDENCE` | Table header style (FF.UI, TF.DETAIL, FW.SEMI) |
| `TD_EVIDENCE` | Table data cell base (FF.MONO, TF.DETAIL, tabular-nums) |
| `TD_EVIDENCE_ID` | Identifier cell variant (FF.UI) |
| `TD_NUM_CELL` | Data excerpt numeric cell (FF.MONO, centred) |
| `TD_ID_CELL` | Data excerpt identifier cell (FF.UI, centred) |

---

## Original File Coordinates (S71 fix)

All displayed row numbers and column letters match **original file positions**, not post-cleanup array indices.

### What the import pipeline tracks

- **Preamble rows stripped:** offset stored, applied via `originalFileRow()`
- **Header rows:** counted in offset
- **Sparse separator columns removed:** original column indices stored, mapped via `buildOriginalColMap()`
- **Trailing rows trimmed:** not shown, no mapping needed

### Where coordinates appear

- Import preview table (column letters + row numbers)
- DupDet evidence tables
- Hotspot excerpt tables
- WHERE TO LOOK detail table
- Hotspot list labels ("Row 9, Cols B–E")
- Excel export (annotated data sheet)

### Helper module: `coordinates.js`

- `colToExcelLetter(index)` — converts column index to Excel letter (A, B, ..., Z, AA, AB...)
- `originalFileRow(internalRow, skippedRows, headerRows)` — maps internal row to original file row
- `buildOriginalColMap(removedColumns)` — maps internal column indices to original positions

---

## Three-Mode Presentation

### Shared page structure (all modes)

**File bar** (two-row, shared with import page):
- Row 1: ← Back | **filename** (bold) | Actions ▾ | Change file
- Row 2: Mode tabs (underline style)

No VST or severity badges in the file bar.

**Mode tabs:** `Check my data` | `Peer review` | `Forensics`

Default: **Check my data**. Mode is switchable without recomputation. `window.scrollTo(0,0)` on mode switch.

**All sections wrapped in `<Section>` component** — consistent numbered dividers and padding. Section titles render in sentence case (e.g. "1 · Summary", not "1 · SUMMARY") post-S156 case-rules update.

---

### Mode 1: Check my data (QC)

**Audience:** Researchers checking their own data before submission.
**Tone:** Supportive, practical. Process-focused.

**Status:** ✅ Fully implemented (Code S21 / Chat S64 / S71 refactor). QC-mode TestCardLayout ALL CAPS `FLAGGED`/`NOTED`/`CLEAR` branch flagged for sentence-case alignment per S156 D1 at next QC-mode touching session (out of S156+S157 scope).

#### Page structure

**1 · Summary**
- Verdict card with severity-appropriate supportive text
- Severity dots, data profile inside card

**2 · What was checked**
- Five cluster rows (CategoryRow/ClusterRow, mode="qc")
- Flagged clusters expanded by default showing:
  - Process-focused description paragraph (see Cluster Descriptions below)
  - "▾ Show technical details" expandable → test cards (TestCardLayout) with name + status (sentence-case High/Moderate/Clear pending QC-mode update)
  - No p-values, no descriptions, no method lines
- Clean clusters: collapsed

**3 · What next**
- Content scales by outcome (see Guidance System)
- Direct download link for annotated Excel report

#### What is hidden in QC
- No heatmap/hotspot view
- No p-values
- No test names (unless "Show technical details" expanded)
- No convergence language
- No AI prompt
- No methodology

#### QC cluster descriptions (S64 final, pre-S95 vocabulary — refresh pending)

The original five descriptions below were authored at S64 for the pre-S95 category names (`Uneven Sections`, `Too Perfect`, `Unnatural Noise`). S95 renamed three of the five clusters and the descriptions have not been refreshed to match. Pending QC-mode copy refresh; descriptions retained as-is for engine-output parity.

**Copy, Paste, Edit:**
Some values in your data are duplicated or follow repeating patterns — this includes identical rows, blocks of similar values, or columns that track each other too closely. Check your data assembly process for accidental duplication — for example when copying between spreadsheets, merging files, or combining data from different runs.

**Unusual Digits:**
The pattern of digits in your data looks different from what measurements typically produce — this includes unusual rounding, inconsistent decimal places, or certain values appearing too often. Check whether any values were rounded, reformatted, or altered during data handling — for example when transferring between software, converting file formats, or transcribing from records.

**Uneven Sections:** *(pre-S95 — maps to current Distribution shapes + Cross-replicate comparisons)*
Parts of your data behave differently from other parts — this includes one section being more or less variable, averages shifting partway, or missing values that cluster in an area of the table. Check whether conditions changed during the experiment or whether data from different sessions were combined — for example a new batch of reagents, recalibration of instruments, or a gap between collection dates.

**Too Perfect:** *(pre-S95 — maps to current Cross-replicate + Cross-condition comparisons)*
Your measurements agree with each other more closely than expected — this includes replicates that are too similar, conditions that track each other too well, or experimental groups that match more closely than random assignment would produce. Check whether any averaging, filtering, or outlier removal was applied during data processing — for example summarising replicates before export, removing failed runs, or selecting best-of-three readings.

**Unnatural Noise:** *(pre-S95 — maps to current Cross-replicate comparisons)*
The random scatter in your data doesn't follow typical measurement noise — this includes consecutive values being too similar, the spread not matching the magnitude, or the overall distribution being unusual. Check whether any transformation, smoothing, or normalisation was applied during data processing — for example log transforms, baseline subtraction, or batch correction.

---

### Mode 2: Peer review

**Audience:** Journal editors, integrity officers, department heads screening someone else's data.
**Tone:** Neutral, factual. Investigation-framed — points at what to request from the authors.

**Status:** ✅ Implemented (Code S70 + S71 refactor, Chat S69/S70 design). Inherits S156 + S157 chrome via shared ClusterRow + TestCardLayout components.

#### Design rationale

QC → Forensics is too big a jump. Peer Review gives reviewers enough to write a letter to authors without drowning them in charts and method descriptions. Each mode adds one layer of depth:
- QC: "What's wrong?" → process advice
- Peer Review: "Where + what to ask?" → investigation questions
- Forensics: "Show me all the evidence" → full statistical detail

#### Page structure

**1 · Summary**
- Verdict card with investigation language (same as Forensics)
- Severity dots, data profile inside card
- No Excel forensics (Forensics only)

**2 · What was found** (outcome > 0) / **What was checked** (outcome 0)
- Five cluster rows (ClusterRow, mode="review")
- Test cards (TestCardLayout) visible directly on cluster expand (no "Show technical details" gate)
- Test card: cluster-name breadcrumb + test name + description + status text (coloured, no p-values)
- No method line
- Flagged/noted tests expandable → **simplified evidence:** finding subtitle + key statistic only. No charts, no data tables, no full evidence panels.
- Flagged/noted tests NOT auto-expanded (unlike Forensics)
- Clear tests: compact card, not expandable

**3 · Where to look** (outcome > 0 only)
- No minimap, no interactive detail table (those are Forensics power tools)
- Hotspot list with expandable table excerpts
- Each excerpt: hotspot rows ± context rows, with convergence cell shading. Fixed 200px height, scrollable. Collapsed by default.
- If no hotspots: "No convergent spatial patterns detected."

**4 · What to ask** (outcome > 0) / **What next** (outcome 0)
- Outcome-scaled investigation questions (see Guidance System)
- Direct download link for annotated Excel report

**No Section 5.** No methodology, no AI prompt.

#### What is hidden in Peer Review
- No p-values
- No method lines
- No auto-expand of flagged/noted tests
- No charts or full evidence panels (only simplified key stats on expand)
- No interactive minimap or detail table (hotspot excerpts only)
- No AI consultation prompt
- No methodology section
- No Excel forensics

---

### Mode 3: Forensics

**Audience:** Forensic statisticians, expert reviewers, experienced researchers doing deep investigation.
**Tone:** Technical. Full statistical detail.

**Status:** ✅ Implemented (Chat S68–S71 / Code S25+S69+S70+S71). Chrome lock at S156 + S157 (A1.D0c-bis + mechanism iconography).

#### Page structure — Outcome 0 (clean / QC-identical layout)

When dataset-level outcome = Proceed (severity score 0), Forensics mode renders the same structure as QC mode:
- **1 · Summary** — "All checks passed" headline, data profile
- **2 · What was checked** — Five cluster rows, all green, expandable to show test cards with status and p-values
- **3 · What next** — "Your data passed all checks."

No heatmap, no methodology, no "Investigate further" at outcome 0.

#### Page structure — Outcome > 0 (Review / Investigate / Investigate closely)

**1 · Summary**

Verdict card with severity-coloured chrome:
- 2px outline + light tinted background per `SEV_VERDICT[severity]` colour stops
- Headline in `xl Bold tier sans` typography ("Significant anomalies detected" / "Multiple anomalies detected" / "Some findings warrant a closer look") per `VERDICT_TEXT.headline`
- Severity dots (4-dot strip, top-right): green → yellow-green → orange → red, active level filled solid, others outline
- Count clause below headline in `base Regular C.TEXT_2 sans` typography — **per-tier split** (S156 D2):
  - HIGH-only outcomes: "Investigate dataset closely. {N} high-severity findings across {cluster names}."
  - MOD-only outcomes: "Investigate dataset before proceeding. {N} moderate findings across {cluster names}."
  - Mixed outcomes: "Investigate dataset before proceeding. {K} high-severity findings and {M} moderate findings across {cluster names}."
- Cluster names in count clause render in `base Regular MECH sans` (each name in its `MECH_COLOR[mk]` hue) with inline MechIcon prefix at 14px (+2 for digits) in matching MECH_COLOR — S156-fix2 + S157-fix4.
- Data profile inside card body, two-column: Measurement type, Table size, Conditions (left); Columns role, Row order, Transform, Precision (right). Identity row pattern: label in `C.TEXT_3`, value in `C.TEXT` (typography system § Identity row pattern).
- Bottom note (centred, `C.TEXT_3`): "Row numbers and column labels are displayed as in uploaded file"

**Excel forensics** (`.xlsx` with findings only): ExcelMetaCard below verdict card.

**2 · What was found** — Findings strip + persistent docked data panel

A1.D3 (S163) collapsed the prior pre-A1.D3 §2 (category test cards) + §3 (WHERE TO LOOK minimap + table) + the DeepLookModal overlay into one §2 surface. The chip-strip and the data view sit in one persistent docked panel below §2's section header; test cards moved out to §3. The reader can keep raw data on screen while reading a §3 test card. The DeepLookModal component retires entirely (file + consumers).

The surface composes:


```
+---------------------------------------------------------------+
| 2 · What was found                                            |
| Dataset-wide  [pill] [pill]                                   |
| Localised     [chip] [chip] [chip]                            |
| Flagged, location unclear  [chip]                             |
| > Data table                              Show all · Clear all|
| Last-digit frequencies applies across the whole dataset — …   |
| +---------------------------------------------------------+   |
| | horizontal density strip (data cols only)               |   |
| +--+------------------------------------------------------+   |
| |  | scrollable data table — locality fills, identity     |   |
| |  | borders, whole-table wash compositing                |   |
| +--+------------------------------------------------------+   |
+===============================================================+  <- 3px SECTION_DIVIDER (slate-500)
```


The whole surface is the single sticky element, pinned to viewport top through §3–§5 scroll. The data panel is collapsible via the `> Data table` disclosure; chip lanes + the guidance caption + Show all / Clear all stay visible regardless of collapse state.

#### 2.1 Lanes — three rows above the data toggle

Three chip / pill lanes, partitioned by `finding.locality`:

| Lane | Locality tiers | Glyph |
|---|---|---|
| Dataset-wide | `dataset-wide` | `FindingPill` |
| Localised | `cell-local`, `row-local`, `column-local` | `FindingChip` |
| Flagged, location unclear | `unscoped` | `FindingChip` |

Each row renders only when at least one finding falls in its tier. Lane labels are `LANE_LABELS` exported from `Section.jsx`, in `base Semibold C.TEXT sans` (Lane label tuple). Pills and chips both activate the panel — pills-activate ratified at B2a; the pre-implementation spec's "chip-only, pills scroll-only" is **superseded**. Pills do not carry the `[N]` region prefix (no spatial scope). Chips also do not carry `[N]` (fix-pass 1 retired the prefix — the active chip's ring + the data block's filtered minimap + the region-zoomed table carry the same information).

**Chip / pill chrome (post-S156-fix1 + S157):**
- 16px MechIcon (+2 for digits) at leading position in `MECH_COLOR[mk]` — mechanism cluster identifier
- Light `SEV_VERDICT[severity]` background tint — tier signal on chrome
- Test name in plain `C.TEXT` colour (S156-fix1)
- Separator (·) inheriting test-name register
- Tier-word suffix ("High" / "Moderate") in `SEV_VERDICT` colour at plain weight (`base Regular tier sans`)
- 3 px mechanism-colour left stripe (`MECH_COLOR[dim]`) linking the chip / pill visually to its §3 test-card sibling
- Active state: the purple identity ring (`IDENTITY_BORDER`) signals the finding is in the data-block overlay

Cleared findings within a flagged cluster route to the CLEAR strip below (not rendered as individual chips). Strip format (S156 D4 past-tense): "{N} tests cleared — {test name list}".

#### 2.2 Selection model — click always toggles

Click on any chip or pill **always toggles** the clicked finding (active → inactive, inactive → active). Default-on-panel-expand is **all-active** (every finding contributes). The pre-implementation Model B "all-on → first click isolates" rule is **superseded** — at B2e the same gesture stopped meaning different things depending on how many findings were active.

| Predicate | Effect |
|---|---|
| `selection === null` (initial / Show all) | All active; selection mode resolves to `'all'` via `activeSelected.size === allFindingIds.size` |
| Click N, `N ∈ activeSelected` | REMOVE — drop N from the set; lastAdded demotes to next-most-recent (or null when the set empties); NO scroll |
| Click N, `N ∉ activeSelected` | ADD — insert N; lastAdded = N; scroll §3 to the finding's first test card; expand dimension + test card; auto-expand data block on first activation |
| `Show all` | Selection = full set; lastAdded = null |
| `Clear all` | Selection = empty set; lastAdded = null |

`Show all` and `Clear all` live on the Data toggle row (right-aligned). They are two persistent controls, not a single context-switching button — direction can switch mid-investigation. Disabled state mirrors the current mode (`Show all` disabled when mode = `'all'`; `Clear all` disabled when subset is already empty).

Reaching "just this one" from default-all-on now takes two clicks (`Clear all` → click chip). Predictability over saving a click — locked at B2e.

State lives in `ForensicsBody`: `selection = { selected: Set<regionNumber>, lastAdded }`. Sentinel `null` means uninitialised (treated as all-active without allocating a Set). `selectionMode` is derived from set size vs universe size, not stored.

#### 2.3 Locality-driven encoding — single dispatch axis

`finding.locality` (set once in `findings.js:classifyLocality`, dispatched once in `buildHighlightSpec`) drives the data-block highlight extent. Five tiers:

| Tier | Extent | Border |
|---|---|---|
| `cell-local` | individual cells fill | 4-edge identity border per cell |
| `row-local` | row-band fills across all data cols | top + bottom identity-border edges at run boundaries |
| `column-local` | column-band fills across all rows | left + right identity-border edges at run boundaries |
| `dataset-wide` | whole-table wash (`LOCALITY_WHOLE_TABLE_WASH = rgba(139,92,246,0.08)`) | no border |
| `unscoped` | no table treatment — caption only (test fired, localised nothing) | no border |

Encoding properties:

- **Fill colour is convergence count, not severity.** When multiple active findings touch the same cell (cell ∩ row ∩ column union counts), the per-cell intensity reads through `convergenceRampStyle(count)` on a purple ramp (purple-200 → purple-700, opacities 0.55 / 0.7 / 0.85). Overlap intensifies. Severity continues to live on the chip / pill chrome (background tint + tier word) and the §3 card status badge — never on the data block.
- **Identity border is `IDENTITY_BORDER = #4C1D95` (purple-900).** Lifted beyond the ramp top stop (`CONVERGENCE_RAMP[5+]` = purple-700) so the border reads as unambiguously deeper than the densest fill at any overlap level. Rendered via `box-shadow: inset` per edge — no layout consumption, so the shared colgroup (with ImportView preview) is unaffected.
- **Whole-table wash composites UNDER localised fills.** Cells with localised count > 0 never paint the wash. When a dataset-wide pill and a cell-local chip are both active, the cell-local cells render their convergence fill; everywhere else paints the wash.
- **Subset-mode dim:** when selection is subset AND ≥1 finding is selected, cells outside the active coverage demote to `#CCC` text on `C.WHITE` background. Suppressed in `all` mode (the message is "show me everything"), on whole-table-wash cells (the wash IS the coverage signal — dim there would compete), and on `hasUnscoped` selections (an unscoped finding makes no localisation claim, so the table stays at rest rather than dimming — S193; see the split property below).
- **`dataset-wide` and `unscoped` are distinct tiers, not one wash (split S193).** `dataset-wide` sets `hasWholeTable` and washes — a true "every row implicated" claim. `unscoped` sets a separate `hasUnscoped` flag and produces **no table treatment** (no wash, no dim): the test fired but localised nothing, so any highlight would be a false localisation claim. The two flags are returned alongside each other from `buildLocalityCompose`; a consumer needing "is this whole-table-tier" must pick which it means and must not use `hasWholeTable` as a proxy for both (that double-duty was the wash-on-unscoped tension, unwound S193 — the same flag had also been suppressing the subset dim, so dropping the wash without the `hasUnscoped` term would have greyed the table). The minimap was already correct for unscoped (empty, gates on `region.cells.length`); the fix made the table agree with it.

Encoding dispatch is single-source: `buildHighlightSpec.buildLocalityCompose(activeFindings, ctx)` is the only locality switch. The `hasWholeTable` assignment is at `buildHighlightSpec.js:193` (the `case "dataset-wide"` / `case "unscoped"` labels fall through to it pre-S193; post-S193 only `case "dataset-wide"` sets `hasWholeTable`, and `case "unscoped"` sets the separate `hasUnscoped` flag). ExcerptTable's renderCell consumes `localityCompose` (with `hasWholeTable`, `hasUnscoped`, `unionCells / unionRows / unionCols`, `countCells / countRows / countCols`, `dimUncovered`) and never re-derives locality from `findings[]`. The `composeDim` and `isDimmedFinal` predicates suppress the dim on both `hasWholeTable` and `hasUnscoped`.

#### 2.4 `activeConvergence` — single rebuild on selection change

`FindingDetailPanel` maintains an `activeConvergence` memo that rebuilds the convergence grid from the active finding set on every selection change. **`mode === 'all'` early-returns the original `heatmapProps.convergence` object — no recompute, no allocation.** Protects batch-parity at rest and keeps the resting-state grid byte-identical to pre-A1.D3.

`activeConvergence` threads to:
- ExcerptTable cell-fill (the `convergenceCellBg` legacy resting-state heat layer reads it via `visGrid`).
- MinimapStripVertical density (row-axis).
- MinimapStripHorizontal density (column-axis).

All three consumers read the re-keyed grid. There is no redundant filter prop (`activeFindingTests` was retired at B2d — the grid IS the filter source).

#### 2.5 Guidance caption — three cases

Rendered between the Data toggle row and the (collapsible) data block, OUTSIDE the collapse wrapper so it persists when the data table folds. Dispatched by `(finding.locality, TEST_RAW_VISIBILITY[testId])`:

| Locality | rawVisibility | Caption |
|---|---|---|
| `dataset-wide` / `unscoped` | (either) | "{DisplayName} applies across the whole dataset — see the test card for the evidence." (and the `unscoped` variant: "… flagged the data but couldn't isolate specific rows. See the test card for the statistical detail.") |
| `cell-local` / `row-local` / `column-local` | `visible` | "{DisplayName}: the flagged cells show the pattern directly — compare the highlighted values." |
| `cell-local` / `row-local` / `column-local` | `statistical` | "{DisplayName}: this pattern is statistical — it won't be visible in the individual values. See the test card." |

The dataset-wide / unscoped branch takes precedence over the visible / statistical split: when there are no flagged cells, "look at the cells but they're unreadable" is the wrong framing. For `dataset-wide` the wash signals "applies everywhere; evidence in the test card" and the caption pairs with it. For `unscoped` (post-S193) the table renders at rest — no wash, no dim — so the caption is the *only* §2 signal and "see the test card" does the whole job of redirecting the reader to where the evidence lives. (Whether that caption-only state on a *selected* chip reads as intended or as inert is a Tier-2 selected-state affordance question, decided S193 not to special-case here.)

The caption names `focusFinding` (last-added). When multiple findings are active, the caption tracks the last activation — consistent with the scroll-on-add-only model. No caption at rest (no active finding).

#### 2.6 Data block — minimaps + table

When `dataExpanded` is true, the panel mounts:

- **Horizontal density strip** above the table. Spans the DATA-COLUMN region only, proportional (flex-grow) alignment to the table's stretched colgroup. Identifier columns never carry strip coverage. Density bars at the matrix-col positions reading from `activeConvergence.grid`. Viewport-band indicator overlays the strip when the table actually scrolls horizontally; suppressed when the table fits in the viewport. (Column-edge alignment is approximate, not pixel-exact — see the ExcerptTable de-branch parked item.)
- **Vertical minimap** to the left of the table. Same density model on the row axis, with a vertical viewport-band indicator. Mounted only when the table actually scrolls vertically. Click + drag writes back to `tableEl.scrollTop`.
- **Scrollable data table** via `ExcerptTable` mounted with `compactMode={true}`. Full-table semantic — every row in the matrix renders. `ScrollTable`'s built-in virtualisation (`ROW_H=22.5`, `VIRT_THRESHOLD=500`) bounds DOM size on large fixtures while keeping native Cmd-F working below threshold. Cell tints follow §2.3.

Total block height bounded at 250 px. `ExcerptTable.compactMode` suppresses its own internal SegmentMinimap / ColMinimap / caption / convergence-ramp legend / hotspot list footer — the panel-level minimaps replace them at one resolution higher.

#### 2.7 Collapse — `overflow-anchor: none` is required

The data block uses a max-height transition (0 ↔ 600 px, 220 ms ease) — always mounted, never torn down. **`<body style="overflow-anchor: none">` in `index.html` is REQUIRED. Do not remove this declaration without understanding why it exists.**

Failure mode: when the data panel collapses (max-height transitions to 0), the document shrinks by ~284 px. Browser CSS scroll anchoring auto-adjusts `scrollY` to keep visible content stable. In states where the panel landed close to the sticky's natural-flow position (most reliably the dataset-wide-only active state), the adjustment moved `scrollY` UP by ~284 px, un-pinning the sticky from `top: 0` and rendering it at its natural-flow position ~98 px below viewport top — the "folds down" symptom. Disabling scroll anchoring keeps `scrollY` stable; the sticky stays pinned; §3 cards slide up into the vacated space — the user's mental model.

The site is a static forensics report; there is no chat-like dynamic content where keeping visible items stable is a UX win. The trade-off favours scroll-stability over content-anchor stability.

#### 2.8 §2↔§3 boundary

`SECTION_DIVIDER` token (slate-500 `#64748B`, 3 px) on the sticky surface's bottom edge. Heavier than the `C.BORDER` hairline; reads as a real section break against the `C.BG_ZONE` backdrop when the sticky pins at viewport top and §3 cards slide up behind it. Pairs with a ~29 px `marginBottom` to keep §3 content from touching the divider.

The token lives at `src/constants/tokens.js` next to `C.*`. Flagged for consolidation if a second "section-break-weight rule rendered standalone, not framing a centred title" site lands; currently a single-consumer token.

#### 2.9 What survives, what retires

**Retires entirely (file + consumers):**
- `DeepLookModal.jsx` — modal overlay surface (retired at Phase 3d).
- `data-finding-detail-panel` selector (Phase 3e — `data-sticky-surface` is the canonical marker).
- Chip `[N]` prefix (fix-pass 1 — replaced by ring + filtered minimap).
- Status row + header row + ✕ button on the panel (fix-pass 1 — chip click activates AND deactivates).
- MinimapStripVertical badge dots + tick lines + convergence-ramp legend + hotspot list footer (fix-pass 2, all gated on `compactMode`).
- Horizontal `MinimapStrip` mount in §2 (Phase 3d; file kept for HotspotExcerpt.jsx back-compat shim).
- The pre-A1.D3 hotspot intensity strip + "Where flags are concentrated" description line (superseded by the data-block density strip + the guidance caption).
- B2a/B2b's single-region `activeRegionNumber` scalar + isolate-on-first-click special case (B2b → B2e).

**New surfaces:**
- `FindingDetailPanel.jsx` — owns the docked-panel composition.
- `MinimapStripVertical.jsx` + `MinimapStripHorizontal.jsx` — viewport-band minimaps with click-to-scroll.
- `findings.js:classifyLocality` (lines 168–189) — single source of truth for the five locality tiers.
- `buildHighlightSpec.js:buildLocalityCompose` — single locality dispatch into `localityCompose`.
- `TEST_RAW_VISIBILITY` map in `mechanisms.js` — 8th entry on the test-onboarding checklist.
- `SECTION_DIVIDER` token in `tokens.js`.

**3 · Detailed test results**

Cluster rows (ClusterRow, mode="full"), all five clusters in fixed `MECHANISM_ORDER` (copied → digits → shapes → replicate → group). Each cluster row:

**Cluster header chrome (post-S156-fix3 + S157):**
- 3px MECH_COLOR left border, full row height — area-marker for expanded contents
- 20px MechIcon (+2 for digits) at leading position in MECH_COLOR[mk]
- Cluster name in name-cased category form (e.g. "Cross-replicate comparisons") + `(N tests)` in dim parentheses
- Dim subtitle (a question framing the cluster's investigative scope: "— do the replicates look unusual?", "— do the numbers themselves look odd?", etc.)
- Right-side worst-tier word badge: SEV_VERDICT colour, FS.base, plain weight ("High" / "Moderate" / "Clear")
- Expand chevron (▸/▾) right of the worst-tier word

**On cluster expand:** Test cards (TestCardLayout, mode="full") render inside the cluster's bordered area. Each card:

**Test card chrome (post-S156-fix3 + S156-fix5 + S157):**
- 3px MECH_COLOR left stripe (inherits cluster colour)
- Cluster-name breadcrumb above test name: `sm Regular MECH sans` typography, 14px MechIcon (+2 for digits) prefix in MECH_COLOR
- Test name in `md Semibold C.TEXT sans` (Sub-heading tuple) · plain-language description in `base Regular C.TEXT_2 sans`
- Right-aligned status: tier word in SEV_VERDICT colour at `base Medium` (Tier word tuple) + p-value in mono
- Right-side ▸/▾ chevron on flagged/noted cards only
- Cleared-tier cards: 0.4 opacity on breadcrumb (icon + text), reduced visual prominence

**Flagged/noted tests auto-expand** showing (top-to-bottom, post-S168 reorder):
- One-line result footer (PROMOTED to top): test-specific summary that reads as the result — typically `scope · stat · finding-clause · p`. Forensics-mode test cards carry a finding-clause in the footer (e.g. "positive autocorrelation", "block mean shift in Inhibitor_A", "leading digits off Benford") so the headline conveys WHAT was found, not just numbers.
- Evidence content: charts via PlotLayout, tables via EvidenceTable. Inside the white card, no grey sub-container.
- Three-block disclosure stack (Forensics-only, collapsible, collapsed by default):
  - ▸ How this test works (descriptive — shown on any expanded card with a `TEST_METHODS` entry)
  - ▸ Implications (finding-specific — gated on `flag !== "LOW"`)
  - ▸ What to look for (finding-specific — gated on `flag !== "LOW"`)

**Clear tests within a flagged cluster** render in compact form, click-expandable to show evidence. Cleared tests within an all-cleared cluster route to the cluster-level CLEAR-strip rather than rendering as cards (see parked CLEAR-strip-expandability item in STATUS.md).

**4 · Investigate further**

AI consultation prompt + Excel download. See Guidance System § Tier 3 below.

> **Spec note:** §4 chrome description below describes the pre-A1.D2 implementation. Vocabulary updates from S156 Pass 7 (Outcome row, sentence-case tier words "High"/"Moderate"/"Cleared") are reflected. Full prompt body redesign — three-tier emit, TEST_METHODS verbatim wiring, calibration prologue, severity-1 FP prefix, Questions block reshape, SKIPPED line — pending under parked #21 / A1.D2 dispatch. Spec section will be rewritten when A1.D2 lands.

**5 · Methodology**

- Summary line: "{N} of {M} tests applicable. Tests span 5 investigation clusters."
- Disclaimer: "This report is a screening aid, not a determination of misconduct." (Trust aside-callout register, S148 chrome.)
- Expandable "Test battery details" — cluster-grouped test list (now uses post-S157-fix3 "Cross-condition comparisons" cluster label)
- Expandable "References" — citation list

---

### Mode comparison table

| Element | QC | Peer Review | Forensics |
|---------|-----|-------------|-----------|
| Numbered sections | 1–3 | 1–4 | 1–5 |
| Verdict language | Supportive | Investigation | Technical |
| Severity dots | ✅ | ✅ | ✅ |
| Data profile | ✅ | ✅ | ✅ |
| Excel forensics | ❌ | ❌ | ✅ |
| Cluster component | ClusterRow (mode="qc") | ClusterRow (mode="review") | ClusterRow (mode="full") |
| Cluster border + icon (post-S156+S157) | Border + icon | Border + icon | Border + icon |
| Right-side worst-tier word badge | ✅ | ✅ | ✅ |
| Test presentation | TestCardLayout (white cards) | TestCardLayout (white cards) | TestCardLayout (white cards) |
| Test details gate | Behind "Show technical details" | Visible directly | Visible directly |
| Test card content | Name + status | Cluster breadcrumb + name + description + status | Cluster breadcrumb + name + description + status + p-value |
| MECH stripe on test card | ❌ (no card chrome in QC) | ✅ (3px) | ✅ (3px) |
| Method description | ❌ | ❌ | ✅ (body font, inside card) |
| Evidence on expand | None | Simplified (subtitle + key stat) | Full (charts, tables, data) |
| Auto-expand flagged | No | No | Yes |
| Section 3 | (hidden) | Hotspot list + expandable excerpts | Detailed test results (cluster rows) — chrome with §2-equivalent locality strip surfaced at §2 instead |
| Section 4 | What next (process) | What to ask (investigation Qs) | Investigate further (AI prompt) |
| Section 5 | — | — | Methodology |
| P-values | ❌ | ❌ | ✅ |
| §1 cluster names in MECH colour + icon | ❌ | ✅ | ✅ |

**Mental model:** QC answers "is something wrong?" Peer Review answers "where is it wrong and what to ask?" Forensics answers "what exactly is wrong and how do I know?"

---

## Guidance System

Each mode ends with an actionable guidance section. The content, framing, and follow-up actions are different for each audience.

### Tier 1: "What next" (QC mode)

**Purpose:** Help the researcher fix their own data handling.

Content scales by outcome:
- **Proceed (0):** "All checks passed. Your data is consistent with genuine instrument-recorded measurements. You can proceed with confidence." + download link
- **Review (1):** Download the annotated report. Verify your source data files match what you submitted. These flags are within the expected false positive range.
- **Investigate (2):** 1. Download the annotated report and review the highlighted regions. 2. Check your data assembly process — verify you haven't accidentally duplicated rows, merged files incorrectly, or applied unintended transformations. 3. If the flagged patterns correspond to a known processing step, document it.
- **Investigate closely (3):** 1. Download the annotated report. 2. Compare the flagged regions against your original instrument output files. 3. Check each flagged cluster for the specific issue described. 4. If you applied any data processing (normalisation, outlier removal, batch correction), verify it was applied correctly. 5. Consider re-exporting raw data directly from instrument software and re-running this analysis.

Always includes a direct download link for the annotated Excel report.

### Tier 2: "What to ask" (Peer review mode)

**Purpose:** Give the reviewer specific questions to ask the data's authors.

Content scales by outcome:
- **Proceed:** "No anomalies detected. No action needed."
- **Review:** "These flags are likely false positives. No action needed unless other concerns exist."
- **Investigate:** Request the original instrument output files for the flagged regions. Ask whether data was processed or transformed before submission. Ask whether the flagged rows correspond to a specific experimental batch or session.
- **Investigate closely:** Request raw instrument output files and lab notebooks for the relevant dates. Ask for an explanation of any data processing steps applied to the raw data. Ask for the experimental timeline — when were these samples collected, and by whom? Consider requesting independent replication of key results. Consider whether other datasets from this group warrant screening.

Always includes a direct download link for the annotated Excel report.

### Tier 3: "Investigate further" (Forensics mode)

> **Note:** This section describes the pre-A1.D2 implementation. Vocabulary reflects S156 Pass 7 (sentence-case tier words, Outcome row in dataset header). Full redesign — three-tier emit (High / Moderate / Cleared), TEST_METHODS verbatim wiring, calibration prologue, severity-1 false-positive prefix, Questions block reshape, SKIPPED line — pending under parked #21 / A1.D2 dispatch.

**Purpose:** Hand off from domain-blind screening to domain-aware investigation via AI.

#### UI layout

**Section heading:** "4 · Investigate further" (sentence case post-S156)

**Instructions block:**
> Copy the prompt below and paste it into Claude or another AI assistant for help interpreting these findings and planning next steps.

**Copyable prompt block** (monospace, with copy button):

```
I'm investigating a dataset flagged by Check My Data, a statistical forensics screening tool. The attached Excel file contains the full annotated dataset with flagged regions highlighted, plus a detailed test report.

Dataset: {filename}, {rows} × {cols}, {assay type}, {conditions}
Outcome: {N} of 4 — {Outcome label}

Tests that flagged:
High: {list of high-tier test names with brief findings}
Moderate: {list of moderate-tier test names with brief findings}
Cleared: {list of cleared test names — included for completeness}

Using the paper for study context and the Excel file for the statistical evidence:
1. Which figures or tables in the paper correspond to the flagged data regions?
2. Do the authors describe any data processing steps that could explain the anomalies?
3. What domain-specific innocent explanations should I consider given the experimental method?
4. What additional evidence should I request from the authors?
5. Are there other datasets in this paper that should be screened?
```

- Tier labels in prompt use sentence-case High / Moderate / Cleared (post-S156 D1, replacing pre-S156 ALL CAPS FLAGGED/NOTED)
- Dataset header uses Outcome row ("Outcome: N of 4 — Label") replacing the pre-S156 "Overall severity: N/3 — verdict text" form (S156 Pass 7)
- If outcome 0 (Proceed): prompt not shown. "No anomalies were detected."
- If outcome 1 (Review): prompt prefixed with FP context note (A1.D2 redesign will reshape into calibration prologue)

---

## Investigation Guidance Templates

Each category has mode-dependent templates stored in `guidance.js`:

```javascript
CATEGORY_GUIDANCE = {
  copied: {
    qc: {
      short: "Some values in your data are duplicated or follow repeating patterns",
      detail: "Check your data assembly process for accidental duplication...",
      lookFor: "Identical rows, blocks of similar values, or columns that track each other too closely",
      innocent: "Instrument memory effects, legitimate biological similarity"
    },
    review: {
      short: "Values are repeated or offset by fixed amounts",
      detail: "Open highlighted rows in spreadsheet, look for identical rows or constant differences...",
      lookFor: "Sort by flagged columns and look for blocks of identical or near-identical values",
      innocent: "Instrument carry-over, biological replicates with genuinely low variance"
    }
  },
  // ... (digits, shapes, replicate, group)
};
```

---

## Coloured Excel Export (standalone investigation document)

The xlsx functions as a self-contained forensic investigation brief.

**Design principle:** The Excel export always uses **Peer review** language — neutral, factual, investigation-oriented.

**Technical approach:** SheetJS (xlsx) in-browser via dynamic import (~6KB code-split chunk).

### Sheet count by mode

| Mode | Sheets |
|------|--------|
| Forensics | 4: Annotated Data, Investigation Report, Test Details, Legend |
| Peer review | 3: Annotated Data, Investigation Report, Legend |
| QC | 3: Annotated Data, Investigation Report, Legend |

### Sheet 1: Annotated Data
Original data values with convergence heatmap cell backgrounds. Legend block rows 1–4. Flags column A. Frozen panes.

### Sheet 2: Investigation Report
Top-to-bottom forensic brief. Header block (uses Outcome row post-S156 Pass 7) → Overall assessment → Hotspot investigation guide → Dataset-wide anomalies → Category summary → Footer.

### Sheet 3: Test Details (Forensics mode only)
One row per test with full diagnostic information.

### Sheet 4: Legend
Colour key, intensity scale, flag level definitions, severity scale, methodology note.

---

## Fabrication Coverage Analysis

| Fabrication type | Tests covering it | Category |
|-----------------|-------------------|----------|
| Copy-paste recycling | DupDet, ConstOffset, RSC | Copy, Paste, Edit |
| Replicate copying or over-correlation | IRC | Cross-Replicate Comparisons |
| Manual/keyboard entry | TermDigit, Benford, DecPrec, VFS, Entropy | Unusual Digits + Distribution Shapes |
| Formula/RNG fill | Kurtosis, Runs, Autocorr, MeanVar, WithinRowVar, Entropy | Cross-Replicate Comparisons + Distribution Shapes |
| Partial block edit | LOESS+CUSUM, RegNoise, RowMeanRuns, SelNoise, MissingData | Cross-Replicate Comparisons |
| Over-balanced conditions | CarlisleBalance, CCR | Cross-Condition Comparisons |
| Multivariate outlier rows | Mahalanobis | Cross-Replicate Comparisons |
| Selective deletion | MissingData | Cross-Replicate Comparisons (interim) |
| Image manipulation | Out of scope | — |
| Summary statistic fabrication | Out of scope (raw data tool) | — |

---

## Standalone Compatibility

All features work on GitHub Pages static hosting:
- ✅ No API calls (AI prompt is clipboard-based, not a live API call)
- ✅ Template-driven narratives and guidance
- ✅ AI consultation via clipboard prompt
- ✅ Convergence heatmap (in-browser computation)
- ✅ Three-mode presentation (pure UI)
- ✅ Excel export via SheetJS in-browser (~6KB code-split chunk)
- ✅ Iconography via inline SVG (no external library; ~1.5kB added at S157)
- ⏳ Calibration runs entirely in-browser (Web Worker if available) — Phase F deferred

---

## Implementation Status

| Component | Status | Sessions |
|-----------|--------|----------|
| Phase A: Category reorganisation | ✅ Complete | Code S11 |
| Phase B: Convergence layer | ✅ Complete | Code S11 |
| Phase C: Heatmap rendering | ✅ Complete | Code S11 |
| Phase D: Three-mode UI | ✅ Complete | Code S12 |
| Phase E: Excel export | ✅ Complete | Code S13 |
| Visual polish P1 — report views | ✅ Complete | Code S14 |
| Visual polish — import page | ✅ Complete | Code S15 + Chat S62 |
| Original file coordinates | ✅ Complete | Code S17 + S71 fix |
| Ghost grid | ✅ Complete | Code S18 |
| QC mode redesign | ✅ Complete | Code S21 + Chat S64 |
| Forensics mode redesign | ✅ Complete | Chat S68–S71 + Code S25+S69+S71 |
| Peer review mode redesign | ✅ Complete | Chat S69–S70 + Code S70+S71 |
| Shared component extraction | ✅ Complete | Code S71 |
| Typography system + chrome migration | ✅ Complete | Chat S134 + Code S136–S138 |
| A1.D0c-bis chrome lock (vocabulary + cluster handles) | ✅ Complete | Chat S155 + Code S156 + S156-fix1-5 |
| Mechanism iconography (MechIcon + cross-condition rename + §1 inline icons) | ✅ Complete | Chat + Code S157 + S157-fix1-4 |
| A1.D2 Next steps + §4 emit body redesign | 🔲 Pending | parked #21 |
| Batch view audit | 🔲 Pending | — |
| Phase F: Calibration verification | ⏳ Deferred | — |

### Report view P2 items still pending

- QC hotspot cards repeat identical guidance when same category
- SelNoise summary line shows wrong p-value (global vs promoting) — display issue, not logic bug
- Condition-span two-row headers for evidence tables (wide multi-condition datasets)
- Individual test card content review — most cards not yet screenshot-verified
- QC mode TestCardLayout ALL CAPS FLAGGED/NOTED/CLEAR branch alignment to sentence-case High/Moderate/Clear (S156 D1)
- QC cluster descriptions refresh against post-S95 v4.0 cluster names
- ReportView embedded summary HTML title cell raw-integer severity inconsistent with the ACTION_LABEL canon (carry from S156 arc)
