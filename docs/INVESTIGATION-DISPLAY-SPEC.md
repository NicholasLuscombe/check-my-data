# Check My Data — Investigation Display UI Specification

**Version:** 6.2 (Code S95 — Track C category restructure per METHODOLOGY-MAP v3)
**Status:** QC mode ✅ (Code S21). Forensics mode ✅ (Code S25+S69+S71). Peer review mode ✅ (Code S70+S71).

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

1. **Engine** — runs all 24 tests, unchanged
2. **Localisation** — each localising test emits a set of (row, col) cells it considers suspicious
3. **Convergence layer** — overlays all cell sets onto the original data grid. Computes per-cell flag count and test diversity. Identifies rectangular hotspots. Ranks them.
4. **Global findings** — tests that don't localise produce dataset-wide observations
5. **Narrative generator** — each hotspot + its contributing tests + the active mode → text. Three templates per finding type.
6. **Renderer** — displays the active mode's view. Mode is switchable without recomputation.

---

## Severity Scale

Numeric 0–3 scale. Communicated via compact severity dots (4 dots: green → yellow-green → orange → red). Active level filled, label shown on active only. Dots visible at all severity levels including clean.

| Score | Label | Colour | Verdict (QC) | Verdict (Peer review) | Verdict (Forensics) |
|-------|-------|--------|-------------|---------------------|---------------------|
| 0 | Clean | Green #27ae60 | Your data looks good | All checks passed | All checks passed |
| 1 | Low | Yellow-green #8DB600 | A few things worth checking | Minor flags detected — likely false positives | Minor flags detected |
| 2 | Medium | Orange #e67e22 | Some issues found — check your data before proceeding | Anomalies detected — warrants further review | Anomalies detected |
| 3 | High | Red #c0392b | Significant problems detected — investigate your data before proceeding | Multiple anomalies detected — investigation recommended | Multiple anomalies detected |

FP context for severity 1: "With N applicable tests at α=0.01, expect ~X false positives by chance." Hidden in QC mode.

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
| 5 | Cross-Group Comparisons | `group` | IV | Distinct experimental groups are more similar or different than usual |

Display order: fixed (`MECHANISM_ORDER: copied → digits → shapes → replicate → group`). Same order across all modes. Not sorted by flag status. Order reflects concreteness — most tangible evidence first, most abstract last.

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
| Cross-Cond Rank (CCR) | **Cross-Group Comparisons** | ❌ | Global |
| Carlisle Balance | **Cross-Group Comparisons** | ❌ | Global |

**† Missing Data Pattern — interim placement.** This test detects structural missingness patterns rather than replicate-value variation, so the category description ("Replicate values don't vary like usual experiments") doesn't strictly apply. Parked for re-homing when File Integrity (Dim VI) category lands, or for scope-restriction to cross-condition missingness for a Dim IV home.

**S95 Track C changes:**
- Constant-Response Concentration (CRC) removed entirely (engine + UI + exports + docs). Zero detections across 18 validation datasets + 4 real-world cases; scale-group fragmentation on real survey data prevented firing. METHODOLOGY-MAP S94 decision.
- 5 categories renamed and re-keyed: `uneven`/`noise`/`perfect` retired; `shapes`/`replicate`/`group` introduced. Alignment with METHODOLOGY-MAP v3 five dimensions.
- Inter-Replicate Correlation (IRC) moved from Copy, Paste, Edit → Cross-Replicate Comparisons (its mechanism is replicate agreement, not value repetition).
- Mahalanobis moved from "Too Perfect" → Cross-Replicate Comparisons (Dim III).
- Entropy moved from "Unnatural Noise" → Distribution Shapes (Dim V — its own dimension).
- CCR and Carlisle grouped under new Cross-Group Comparisons (Dim IV).
- Missing Data Pattern placed in Cross-Replicate Comparisons as interim (see footnote).

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

## Shared UI Components (S71)

### Visual hierarchy — three tiers

The report view uses three visual tiers to create clear information hierarchy:

1. **Category row** — grey background (`C.BG_ZONE`), coloured sidebar (header row only, 3px, red/amber/green), ⚠/✓ icon. Sidebar does NOT extend through expanded test cards below.
2. **Test card** — white background (`#FFFFFF`), `1px solid #E5E7EB` border, `borderRadius: 6px`, `boxShadow: '0 1px 3px rgba(0,0,0,0.08)'`. 12px gap between cards. No sidebar.
3. **Evidence content** — inside the white test card. No grey sub-container. Tables and plots sit directly on white.

Categories are separated by horizontal divider lines (`1px solid #E0E0E0`) within a shared container. All categories sit inside one panel (NOT separate panels per category).

### Component inventory

| Component | File | Purpose |
|-----------|------|---------|
| `Section` | `shared/Section.jsx` | Numbered section wrapper ("1 · SUMMARY" dividers) with consistent padding |
| `CategoryRow` | `shared/CategoryRow.jsx` | Category header + test cards; `mode` prop (`qc`/`review`/`full`) |
| `TestCardLayout` | `shared/TestCardLayout.jsx` | White card wrapper for individual tests; mode-aware expand/collapse |
| `EvidenceTable` | `shared/EvidenceTable.jsx` | Results/statistics tables with baked-in font split |
| `PlotLayout` | `shared/PlotLayout.jsx` | Chart container with consistent caption styling |
| `ColumnHeaders` | `shared/ColumnHeaders.jsx` | Two-row sticky header (Excel letters + column names) |

### Section

`<Section number={2} title="WHAT WAS FOUND">` wraps each numbered section. Renders the divider line with centred number + title, then wraps children with consistent padding. All spacing between sections controlled here.

### CategoryRow

One component, three modes via `mode` prop (`"qc"` | `"review"` | `"full"`).

**Category header (all modes):**
```
⚠ Copy, Paste, Edit  (N tests) — duplicate rows or block patterns found     ▸
✓ Uneven Sections  (N tests) — consistent patterns across the data
```
- Grey background (`C.BG_ZONE`)
- Left border: 3px, coloured by worst flag level (red/amber/green) — **header row only**
- ⚠ icon for flagged/noted categories, ✓ icon for clean
- Category name in dark text, `(N tests)` in parentheses, `— description` secondary text
- Expand chevron (▸/▾) on right
- Divider line between categories (not above first or below last)

**On expand:** Test cards (via TestCardLayout) appear below the header. Sidebar does not extend through the cards.

### TestCardLayout

White card wrapper for individual test results. Mode-aware rendering.

**Props:** `testName`, `subtitle`, `status` (level + pValue), `mode`, `method`, `footer`, `expanded`, `onToggle`, `children`

**Collapsed:**
```
┌ white card ─────────────────────────────────────────┐
│ Test Name · subtitle                   Status ▸     │
└─────────────────────────────────────────────────────┘
```

**Expanded:**
```
┌ white card ─────────────────────────────────────────┐
│ Test Name · subtitle                   Status ▾     │
│                                                     │
│ [Method description — Forensics mode only]          │
│                                                     │
│ [children — evidence content]                       │
│                                                     │
│ [footer — summary line]                             │
└─────────────────────────────────────────────────────┘
```

**Mode-aware rendering:**
- **QC:** Test name + status only. No subtitle, no method, no p-value. Not individually expandable.
- **Peer Review:** Test name + subtitle + status (no p-value). Expandable. No method line. Simplified evidence as children.
- **Forensics:** Test name + subtitle + status + p-value. Expandable. Method line shown. Full evidence as children. Flagged/noted auto-expand.

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

**All sections wrapped in `<Section>` component** — consistent numbered dividers and padding.

---

### Mode 1: Check my data (QC)

**Audience:** Researchers checking their own data before submission.
**Tone:** Supportive, practical. Process-focused.

**Status:** ✅ Fully implemented (Code S21 / Chat S64 / S71 refactor)

#### Page structure

**1 · SUMMARY**
- Verdict card with severity-appropriate supportive text
- Severity dots, data profile inside card

**2 · WHAT WAS CHECKED**
- Five category rows (CategoryRow, mode="qc")
- Flagged categories expanded by default showing:
  - Process-focused description paragraph (see Category Descriptions below)
  - "▾ Show technical details" expandable → test cards (TestCardLayout) with name + status (FLAGGED/NOTED/CLEAR)
  - No p-values, no descriptions, no method lines
- Clean categories: collapsed

**3 · WHAT NEXT**
- Content scales by severity (see Guidance System)
- Direct download link for annotated Excel report

#### What is hidden in QC
- No heatmap/hotspot view
- No p-values
- No test names (unless "Show technical details" expanded)
- No convergence language
- No AI prompt
- No methodology

#### QC category descriptions (S64 final)

**Copy, Paste, Edit:**
Some values in your data are duplicated or follow repeating patterns — this includes identical rows, blocks of similar values, or columns that track each other too closely. Check your data assembly process for accidental duplication — for example when copying between spreadsheets, merging files, or combining data from different runs.

**Unusual Digits:**
The pattern of digits in your data looks different from what measurements typically produce — this includes unusual rounding, inconsistent decimal places, or certain values appearing too often. Check whether any values were rounded, reformatted, or altered during data handling — for example when transferring between software, converting file formats, or transcribing from records.

**Uneven Sections:**
Parts of your data behave differently from other parts — this includes one section being more or less variable, averages shifting partway, or missing values that cluster in an area of the table. Check whether conditions changed during the experiment or whether data from different sessions were combined — for example a new batch of reagents, recalibration of instruments, or a gap between collection dates.

**Too Perfect:**
Your measurements agree with each other more closely than expected — this includes replicates that are too similar, conditions that track each other too well, or experimental groups that match more closely than random assignment would produce. Check whether any averaging, filtering, or outlier removal was applied during data processing — for example summarising replicates before export, removing failed runs, or selecting best-of-three readings.

**Unnatural Noise:**
The random scatter in your data doesn't follow typical measurement noise — this includes consecutive values being too similar, the spread not matching the magnitude, or the overall distribution being unusual. Check whether any transformation, smoothing, or normalisation was applied during data processing — for example log transforms, baseline subtraction, or batch correction.

---

### Mode 2: Peer review

**Audience:** Journal editors, integrity officers, department heads screening someone else's data.
**Tone:** Neutral, factual. Investigation-framed — points at what to request from the authors.

**Status:** ✅ Implemented (Code S70 + S71 refactor, Chat S69/S70 design)

#### Design rationale

QC → Forensics is too big a jump. Peer Review gives reviewers enough to write a letter to authors without drowning them in charts and method descriptions. Each mode adds one layer of depth:
- QC: "What's wrong?" → process advice
- Peer Review: "Where + what to ask?" → investigation questions
- Forensics: "Show me all the evidence" → full statistical detail

#### Page structure

**1 · SUMMARY**
- Verdict card with investigation language (same as Forensics)
- Severity dots, data profile inside card
- No Excel forensics (Forensics only)

**2 · WHAT WAS FOUND** (severity > 0) / **WHAT WAS CHECKED** (severity 0)
- Five category rows (CategoryRow, mode="review")
- Test cards (TestCardLayout) visible directly on category expand (no "Show technical details" gate)
- Test card: name + description + status text (coloured, no p-values)
- No method line
- Flagged/noted tests expandable → **simplified evidence:** finding subtitle + key statistic only. No charts, no data tables, no full evidence panels.
- Flagged/noted tests NOT auto-expanded (unlike Forensics)
- Clear tests: compact card, not expandable

**3 · WHERE TO LOOK** (severity > 0 only)
- No minimap, no interactive detail table (those are Forensics power tools)
- Hotspot list with expandable table excerpts
- Each excerpt: hotspot rows ± context rows, with convergence cell shading. Fixed 200px height, scrollable. Collapsed by default.
- If no hotspots: "No convergent spatial patterns detected."

**4 · WHAT TO ASK** (severity > 0) / **WHAT NEXT** (severity 0)
- Severity-scaled investigation questions (see Guidance System)
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

**Status:** ✅ Implemented (Chat S68–S71 / Code S25+S69+S70+S71)

#### Page structure — Severity 0 (QC-identical layout)

When severity = 0, Forensics mode renders the same structure as QC mode:
- **1 · SUMMARY** — "All checks passed" headline, data profile
- **2 · WHAT WAS CHECKED** — Five category rows, all green, expandable to show test cards with status and p-values
- **3 · WHAT NEXT** — "Your data passed all checks."

No heatmap, no methodology, no "Investigate further" at severity 0.

#### Page structure — Severity > 0

**1 · SUMMARY**

Verdict card with severity-coloured header and border:
- Headline in severity colour (e.g. "Multiple anomalies detected")
- Severity dots (top-right)
- Data profile inside card body: Assay, Size, Precision, Conditions, Columns, Transform

**Excel forensics** (`.xlsx` with findings only): ExcelMetaCard below verdict card.

**2 · WHAT WAS FOUND** — Findings strip + persistent docked data panel

A1.D3 (S163) collapsed the prior pre-A1.D3 §2 (category test cards) + §3 (WHERE TO LOOK minimap + table) + the DeepLookModal overlay into one §2 surface. The chip-strip and the data view sit in one persistent docked panel below §2's section header; test cards moved out to a new §3. The reader can keep raw data on screen while reading a §3 test card. The DeepLookModal component retires entirely (file + consumers).

The surface composes:

```
+---------------------------------------------------------------+
| 2 · WHAT WAS FOUND                                            |
| Dataset-wide  [pill] [pill]                                   |
| Localised     [chip] [chip] [chip]                            |
| Flagged, location unclear  [chip]                             |
| ▸ Data table                              Show all · Clear all|
| Last-digit frequencies applies across the whole dataset — …   |
| ┌─────────────────────────────────────────────────────────┐   |
| │ █▒░ horizontal density strip (data cols only)          │   |
| ├──┬──────────────────────────────────────────────────────┤   |
| │▓│ scrollable data table — locality fills, identity     │   |
| │▒│ borders, whole-table wash compositing                │   |
| │ │                                                       │   |
| └──┴──────────────────────────────────────────────────────┘   |
+═══════════════════════════════════════════════════════════════+  ← 3px SECTION_DIVIDER (slate-500)
```

The whole surface is the single sticky element, pinned to viewport top through §3–§5 scroll. The data panel is collapsible via the `▸ Data table` disclosure; chip lanes + the guidance caption + Show all / Clear all stay visible regardless of collapse state.

#### 2.1 Lanes — three rows above the data toggle

Three chip / pill lanes, partitioned by `finding.locality`:

| Lane | Locality tiers | Glyph |
|---|---|---|
| Dataset-wide | `dataset-wide` | `FindingPill` |
| Localised | `cell-local`, `row-local`, `column-local` | `FindingChip` |
| Flagged, location unclear | `unscoped` | `FindingChip` |

Each row renders only when at least one finding falls in its tier. Lane labels are `LANE_LABELS` exported from `Section.jsx`. Pills and chips both activate the panel — pills-activate ratified at B2a; the pre-implementation spec's "chip-only, pills scroll-only" is **superseded**. Pills do not carry the `[N]` region prefix (no spatial scope). Chips also do not carry `[N]` (fix-pass 1 retired the prefix — the active chip's ring + the data block's filtered minimap + the region-zoomed table carry the same information).

Each chip / pill renders with a 3 px mechanism-colour left stripe (`MECH_COLOR[dim]`) linking it visually to its §3 test-card sibling.

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
| `unscoped` | whole-table wash (same wash) | no border |

Encoding properties:

- **Fill colour is convergence count, not severity.** When multiple active findings touch the same cell (cell ∩ row ∩ column union counts), the per-cell intensity reads through `convergenceRampStyle(count)` on a purple ramp (purple-200 → purple-700, opacities 0.55 / 0.7 / 0.85). Overlap intensifies. Severity continues to live on the chip / pill chrome (background tint + tier word) and the §3 card status badge — never on the data block.
- **Identity border is `IDENTITY_BORDER = #4C1D95` (purple-900).** Lifted beyond the ramp top stop (`CONVERGENCE_RAMP[5+]` = purple-700) so the border reads as unambiguously deeper than the densest fill at any overlap level. Rendered via `box-shadow: inset` per edge — no layout consumption, so the shared colgroup (with ImportView preview) is unaffected.
- **Whole-table wash composites UNDER localised fills.** Cells with localised count > 0 never paint the wash. When a dataset-wide pill and a cell-local chip are both active, the cell-local cells render their convergence fill; everywhere else paints the wash.
- **Subset-mode dim**: when selection is subset AND ≥1 finding is selected, cells outside the active coverage demote to `#CCC` text on `C.WHITE` background. Suppressed in `all` mode (the message is "show me everything") and on whole-table-wash cells (the wash IS the coverage signal — dim there would compete).

Encoding dispatch is single-source: `buildHighlightSpec.buildLocalityCompose(activeFindings, ctx)` is the only locality switch. ExcerptTable's renderCell consumes `localityCompose` (with `hasWholeTable`, `unionCells / unionRows / unionCols`, `countCells / countRows / countCols`, `dimUncovered`) and never re-derives locality from `findings[]`.

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

The dataset-wide / unscoped branch takes precedence over the visible / statistical split: when there are no flagged cells (whole-table wash only), "look at the cells but they're unreadable" is the wrong framing — the wash signals "applies everywhere; evidence in the test card".

The caption names `focusFinding` (last-added). When multiple findings are active, the caption tracks the last activation — consistent with the scroll-on-add-only model. No caption at rest (no active finding).

#### 2.6 Data block — minimaps + table

When `dataExpanded` is true, the panel mounts:

- **Horizontal density strip** above the table. Spans the DATA-COLUMN region only, proportional (flex-grow) alignment to the table's stretched colgroup. Identifier columns never carry strip coverage. Density bars at the matrix-col positions reading from `activeConvergence.grid`. Viewport-band indicator overlays the strip when the table actually scrolls horizontally; suppressed (band-only-no-band) when the table fits in the viewport.
- **Vertical minimap** to the left of the table. Same density model on the row axis, with a vertical viewport-band indicator. Mounted only when the table actually scrolls vertically. Click + drag writes back to `tableEl.scrollTop`.
- **Scrollable data table** via `ExcerptTable` mounted with `compactMode={true}`. Full-table semantic — every row in the matrix renders. `ScrollTable`'s built-in virtualisation (`ROW_H=22.5`, `VIRT_THRESHOLD=500`) bounds DOM size on large fixtures while keeping native Cmd-F working below threshold. Cell tints follow §2.3.

Total block height bounded at 250 px. `ExcerptTable.compactMode` suppresses its own internal SegmentMinimap / ColMinimap / caption / convergence-ramp legend / hotspot list footer — the panel-level minimaps replace them at one resolution higher.

#### 2.7 Collapse — `overflow-anchor: none` is required

The data block uses a max-height transition (0 ↔ 600 px, 220 ms ease) — always mounted, never torn down. **`<body style="overflow-anchor: none">` in `index.html` is REQUIRED.** Do not remove this declaration without understanding why it exists.

Failure mode: when the data panel collapses (max-height transitions to 0), the document shrinks by ~284 px. Browser CSS scroll anchoring auto-adjusts `scrollY` to keep visible content stable. In states where the panel landed close to the sticky's natural-flow position (most reliably the dataset-wide-only active state), the adjustment moved `scrollY` UP by ~284 px, un-pinning the sticky from `top: 0` and rendering it at its natural-flow position ~98 px below viewport top — the "folds down" symptom. Disabling scroll anchoring keeps `scrollY` stable; the sticky stays pinned; §3 cards slide up into the vacated space — the user's mental model.

The site is a static forensics report; there is no chat-like dynamic content where keeping visible items stable is a UX win. The trade-off favours scroll-stability over content-anchor stability.

#### 2.8 §2↔§3 boundary

`SECTION_DIVIDER` token (slate-500 `#64748B`, 3 px) on the sticky surface's bottom edge. Heavier than the `C.BORDER` hairline; reads as a real section break against the `C.BG_ZONE` backdrop when the sticky pins at viewport top and §3 cards slide up behind it. Pairs with a ~29 px `marginBottom` to keep §3 content from touching the divider.

The token lives at `src/constants/tokens.js` next to `C.*` (alongside the C-palette primitives). Flagged for consolidation if a second "section-break-weight rule rendered standalone, not framing a centred title" site lands; currently a single-consumer token.

#### 2.9 What survives, what retires

**Retires entirely (file + consumers):**
- `DeepLookModal.jsx` — modal overlay surface (retired at Phase 3d).
- `data-finding-detail-panel` selector (Phase 3e — `data-sticky-surface` is the canonical marker).
- Chip `[N]` prefix (fix-pass 1 — replaced by ring + filtered minimap).
- Status row + header row + ✕ button on the panel (fix-pass 1 — chip click activates AND deactivates).
- MinimapStripVertical badge dots + tick lines + convergence-ramp legend + hotspot list footer (fix-pass 2, all gated on `compactMode`).
- Horizontal `MinimapStrip` mount in §2 (Phase 3d; file kept for HotspotExcerpt.jsx back-compat shim).
- B2a/B2b's single-region `activeRegionNumber` scalar + isolate-on-first-click special case (B2b → B2e).

**New surfaces:**
- `FindingDetailPanel.jsx` — owns the docked-panel composition.
- `MinimapStripVertical.jsx` + `MinimapStripHorizontal.jsx` — viewport-band minimaps with click-to-scroll.
- `findings.js:classifyLocality` — single source of truth for the five locality tiers.
- `buildHighlightSpec.js:buildLocalityCompose` — single locality dispatch into `localityCompose`.
- `TEST_RAW_VISIBILITY` map in `mechanisms.js` — 8th entry on the test-onboarding checklist.
- `SECTION_DIVIDER` token in `tokens.js`.

---

**3 · DETAILED TEST RESULTS**

All five categories in fixed order (`MECHANISM_ORDER`). `ForensicsCategoryBlock` per category — sub-tests sorted severity-descending (HIGH → MOD → LOW) with stable order within tier; LOW (= "CLEAR") collapses to a one-line `N tests CLEAR — A, B, C` summary with click-to-expand. Pre-A1.D3 used the shared `CategoryRow` for all three modes; A1.D3 split the Forensics-mode rendering off because the sticky chip / pill click bus needs to address each test card directly.

Each category:
- Category header: grey background, sidebar (header only), ⚠/✓ icon + name + `(N tests)` + `— description` + expand chevron.
- Divider line between categories.

On category expand:
- **Test cards (TestCardLayout) visible directly.** Each white card shows:
  - Test name (semibold) · description (regular) → status text + p-value (right-aligned, coloured).
  - Right-side ▸/▾ chevron on flagged / noted cards only.
- **Flagged / noted tests auto-expand** showing:
  - Method description (body font, matches QC category description style).
  - Evidence content directly (charts via PlotLayout, tables via EvidenceTable) — inside the white card, no grey sub-container.
  - Summary footer below evidence.
- **Clear tests:** compact white card, expandable by click.

Each test card carries a `data-test-id="{r.name}"` outer-div attribute so the §2 chip / pill / Show-all click bus can scroll the card into view (`scrollToCard` reads the §2 sticky's `offsetHeight` for the landing offset).

Each test card also carries a 3 px mechanism-colour left stripe (`MECH_COLOR[dim]`) — same colour as the matching chip / pill in §2's lanes. Same colour, two surfaces, one mental model.

**4 · INVESTIGATE FURTHER**

AI consultation prompt + Excel download. See Guidance System § Tier 3 below.

**5 · METHODOLOGY**

- Summary line: "{N} of 24 tests applicable. Tests span 5 investigation categories."
- Disclaimer: "This report is a screening aid, not a determination of misconduct."
- Expandable "Test battery details" — category-grouped test list
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
| Category component | CategoryRow (mode="qc") | CategoryRow (mode="review") | ForensicsCategoryBlock (in §3) |
| Section 2 | What was checked (category rows) | What was found (categories + simplified evidence) | What was found (chip lanes + persistent docked data panel) |
| Section 3 | What next | Hotspot list + expandable excerpts | Detailed test results (dimension cards) |
| Category sidebar | Header only | Header only | Header only |
| Test presentation | TestCardLayout (white cards) | TestCardLayout (white cards) | TestCardLayout (white cards) |
| Test details gate | Behind "Show technical details" | Visible directly | Visible directly |
| Test card content | Name + status | Name + description + status | Name + description + status + p-value |
| Method description | ❌ | ❌ | ✅ (body font, inside card) |
| Evidence on expand | None | Simplified (subtitle + key stat) | Full (charts, tables, data) |
| Auto-expand flagged | No | No | Yes |
| Section 4 | (none) | What to ask (investigation Qs) | Investigate further (AI prompt) |
| Section 5 | — | — | Test coverage / methodology |
| P-values | ❌ | ❌ | ✅ |

**Mental model:** QC answers "is something wrong?" Peer Review answers "where is it wrong and what to ask?" Forensics answers "what exactly is wrong and how do I know?"

---

## Guidance System

Each mode ends with an actionable guidance section. The content, framing, and follow-up actions are different for each audience.

### Tier 1: "What next" (QC mode)

**Purpose:** Help the researcher fix their own data handling.

Content scales by severity:
- **Clean:** "All checks passed. Your data is consistent with genuine instrument-recorded measurements. You can proceed with confidence." + download link
- **Low (1 paragraph):** Download the annotated report. Verify your source data files match what you submitted. These flags are within the expected false positive range.
- **Medium (3 steps):** 1. Download the annotated report and review the highlighted regions. 2. Check your data assembly process — verify you haven't accidentally duplicated rows, merged files incorrectly, or applied unintended transformations. 3. If the flagged patterns correspond to a known processing step, document it.
- **High (5 steps):** 1. Download the annotated report. 2. Compare the flagged regions against your original instrument output files. 3. Check each flagged category for the specific issue described. 4. If you applied any data processing (normalisation, outlier removal, batch correction), verify it was applied correctly. 5. Consider re-exporting raw data directly from instrument software and re-running this analysis.

Always includes a direct download link for the annotated Excel report.

### Tier 2: "What to ask" (Peer review mode)

**Purpose:** Give the reviewer specific questions to ask the data's authors.

Content scales by severity:
- **Clean:** "No anomalies detected. No action needed."
- **Low:** "These flags are likely false positives. No action needed unless other concerns exist."
- **Medium:** Request the original instrument output files for the flagged regions. Ask whether data was processed or transformed before submission. Ask whether the flagged rows correspond to a specific experimental batch or session.
- **High:** Request raw instrument output files and lab notebooks for the relevant dates. Ask for an explanation of any data processing steps applied to the raw data. Ask for the experimental timeline — when were these samples collected, and by whom? Consider requesting independent replication of key results. Consider whether other datasets from this group warrant screening.

Always includes a direct download link for the annotated Excel report.

### Tier 3: "Investigate further" (Forensics mode)

**Purpose:** Hand off from domain-blind screening to domain-aware investigation via AI.

#### UI layout

**Section heading:** "4 · INVESTIGATE FURTHER"

**Instructions block:**
> Copy the prompt below and paste it into Claude or another AI assistant for help interpreting these findings and planning next steps.

**Copyable prompt block** (monospace, with copy button):

```
I'm investigating a dataset flagged by Check My Data, a statistical forensics screening tool. The attached Excel file contains the full annotated dataset with flagged regions highlighted, plus a detailed test report.

Dataset: {filename}, {rows} × {cols}, {assay type}, {conditions}
Overall severity: {N}/3 — {verdict text}

Key findings:
{auto-generated from hotspots + global flags}

Using the paper for study context and the Excel file for the statistical evidence:
1. Which figures or tables in the paper correspond to the flagged data regions?
2. Do the authors describe any data processing steps that could explain the anomalies?
3. What domain-specific innocent explanations should I consider given the experimental method?
4. What additional evidence should I request from the authors?
5. Are there other datasets in this paper that should be screened?
```

- Flag labels in prompt use FLAGGED/NOTED (not HIGH/MODERATE)
- If severity 0: prompt not shown. "No anomalies were detected."
- If severity 1: prompt prefixed with FP context note

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
  // ... (digits, uneven, noise, perfect)
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
Top-to-bottom forensic brief. Header block → Overall assessment → Hotspot investigation guide → Dataset-wide anomalies → Category summary → Footer.

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
| Over-balanced groups | CarlisleBalance, CCR | Cross-Group Comparisons |
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
| Batch view audit | 🔲 Pending | — |
| Phase F: Calibration verification | ⏳ Deferred | — |

### Report view P2 items still pending

- QC hotspot cards repeat identical guidance when same category
- SelNoise summary line shows wrong p-value (global vs promoting) — display issue, not logic bug
- Condition-span two-row headers for evidence tables (wide multi-condition datasets)
- Individual test card content review — most cards not yet screenshot-verified
