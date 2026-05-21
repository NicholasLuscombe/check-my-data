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

**2 · WHAT WAS FOUND**

All five categories in fixed order (MECHANISM_ORDER). CategoryRow, mode="full".

Each category:
- Category header: grey background, sidebar (header only), ⚠/✓ icon + name + `(N tests)` + `— description` + expand chevron
- Divider line between categories

On category expand:
- **Test cards (TestCardLayout) visible directly.** Each white card shows:
  - Test name (semibold) · description (regular) → status text + p-value (right-aligned, coloured)
  - Right-side ▸/▾ chevron on flagged/noted cards only
- **Flagged/noted tests auto-expand** showing:
  - Method description (body font, matches QC category description style)
  - Evidence content directly (charts via PlotLayout, tables via EvidenceTable) — inside the white card, no grey sub-container
  - Summary footer below evidence
- **Clear tests:** compact white card, expandable by click

**3 · WHERE TO LOOK** (severity > 0 only)

Unified minimap + scrollable detail table component (`HotspotExcerpt.jsx`):
- **Left panel (~40px):** SVG minimap of full dataset. Coloured by convergence density. Hotspot regions marked with red bracket annotations. Clickable.
- **Right panel:** Scrollable data table (~400px height) showing all rows with heatmap cell shading. Sticky header row.
- **Below (wide datasets only):** Horizontal ColMinimap for column density.
- **Below:** Clickable hotspot list. Clicking a label scrolls the detail table to that region.

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
| Category component | CategoryRow (mode="qc") | CategoryRow (mode="review") | CategoryRow (mode="full") |
| Category sidebar | Header only | Header only | Header only |
| Test presentation | TestCardLayout (white cards) | TestCardLayout (white cards) | TestCardLayout (white cards) |
| Test details gate | Behind "Show technical details" | Visible directly | Visible directly |
| Test card content | Name + status | Name + description + status | Name + description + status + p-value |
| Method description | ❌ | ❌ | ✅ (body font, inside card) |
| Evidence on expand | None | Simplified (subtitle + key stat) | Full (charts, tables, data) |
| Auto-expand flagged | No | No | Yes |
| Section 3 | Hidden | Hotspot list + expandable excerpts | Minimap + interactive detail table |
| Section 4 | What next (process) | What to ask (investigation Qs) | Investigate further (AI prompt) |
| Section 5 | — | — | Methodology |
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
