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

### Test-to-Category Mapping (22 principled + 1 interim)

Display names shown are the strings users see in test cards.

| Test | Category | Localises? | Scope |
|------|----------|------------|-------|
| Duplicated Data (DupDet) | **Copy, Paste, Edit** | ✅ | Row / block / column-segment highlights |
| Duplicated and Offset (ConstOffset) | **Copy, Paste, Edit** | ✅ | Row-pair × column highlights |
| Correlated Residuals (RSC) | **Copy, Paste, Edit** | ✅ | Top-K row highlights |
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

**† Missing Data Pattern — interim placement.** This test detects structural missingness patterns rather than replicate-value variation, so the category description ("Replicate values don't vary like usual experiments") doesn't strictly apply. Parked for re-homing when File Integrity (Dim VI) category lands, or for scope-restriction to cross-condition missingness for a Dim IV home.

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

**Expanded:**
```
┌ white card · 3px MECH stripe ───────────────────────────┐
│ [icon] Cross-replicate comparisons                      │
│ Test Name · subtitle                   Moderate p=0.018 ▾│
│                                                         │
│ [Method description — Forensics mode only]              │
│                                                         │
│ [children — evidence content]                           │
│                                                         │
│ [footer — summary line]                                 │
└─────────────────────────────────────────────────────────┘
```

The breadcrumb line above test name renders in `sm Regular MECH sans` typography (cluster-name breadcrumb tuple), prefixed with a 14px MechIcon (+2 for digits) in MECH_COLOR[mk]. On cleared-tier cards (severity LOW), both breadcrumb text and icon render at 0.4 opacity per the consistent cleared-state treatment.

**Mode-aware rendering:**
- **QC:** Test name + status only. No subtitle, no method, no p-value, no breadcrumb. Not individually expandable.
- **Peer Review:** Test name + subtitle + status (no p-value). Breadcrumb visible (post-S156-fix5). Expandable. No method line. Simplified evidence as children.
- **Forensics:** Test name + subtitle + status + p-value. Breadcrumb visible. Expandable. Method line shown. Full evidence as children. Flagged/noted auto-expand.

**Header remains in exactly the same position on expand/collapse** — no layout shift.

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

**2 · What was found**

Three locality lanes (organised by where the pattern was detected, not by category):

```
Dataset-wide patterns       [chip] [chip]
Localised patterns          [chip] [chip] [chip]
Broadly flagged patterns    [chip]
```

Lane labels in `base Semibold C.TEXT sans` typography (Lane label tuple). Each chip carries one finding:

**Chip chrome (post-S156-fix1 + S157):**
- 16px MechIcon (+2 for digits) at leading position in MECH_COLOR[mk] — mechanism cluster identifier
- Light SEV_VERDICT[severity] background tint — tier signal on chrome
- Test name in plain C.TEXT colour (S156-fix1)
- Separator (·) inheriting test-name register
- Tier-word suffix ("High" / "Moderate") in SEV_VERDICT colour at plain weight (`base Regular tier sans`)
- Cleared-tier chips: MechIcon at 0.4 opacity, no SEV background tint

Cleared findings within a flagged cluster route to the CLEAR strip below (not rendered as individual chips). Strip format (S156 D4 past-tense): "{N} tests cleared — {test name list}".

**Hotspot strip** below the chip lanes (existing, unchanged): horizontal intensity bar showing flag concentration across row index, with hotspot annotations marked above.

**Description line** below the hotspot strip: "Where flags are concentrated. Each segment is a row of your data, shaded by how many tests flag any cell in that row."

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

**Flagged/noted tests auto-expand** showing:
- Method description (Forensics mode only): body font, matches QC category description style. Lives inside the white card, no grey sub-container.
- Evidence content directly: charts via PlotLayout, tables via EvidenceTable. Inside the white card, no grey sub-container.
- Summary footer below evidence (test-specific sentence summarising the finding)

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
