# Typography inventory — pre-system audit

Read-only inventory of the typography setup in active rendering. No
recommendations, no value judgements — facts only. Audit performed
post-S133h FIX4 against worktree `claude/nostalgic-lovelace-c5dd6b`
HEAD `f4ce95d`.

Scope: every typography-related token defined in `src/`, plus the text-
rendering elements on the eight chrome surfaces specified in the
audit dispatch.

---

## Section 1 — Token definitions

### 1.1 Font-family tokens (`FF.*` in `src/constants/tokens.js:49–54`)

| Token | Resolved value | In-definition comment |
|---|---|---|
| `FF.MONO` | `'SF Mono','Cascadia Code',Menlo,Consolas,monospace` | data tables, code, stats, report grid |
| `FF.UI` | `system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif` | app UI, SVG charts, report body |
| `FF.PRINT` | `Calibri,sans-serif` | HTML report summary tables |
| `FF.SERIF` | `Georgia,'Times New Roman',serif` | logo only |

### 1.2 Font-weight tokens (`FW.*` in `src/constants/tokens.js:55–59`)

| Token | Resolved value | In-definition comment |
|---|---|---|
| `FW.BOLD` | `700` | headings, flagged values, emphasis, logo |
| `FW.SEMI` | `600` | sub-headings, labels, table headers |
| `FW.NORM` | `400` | body text, normal weight |

### 1.3 HTML-card font-size tokens (`TF.*` in `src/constants/tokens.js:70–77`)

| Token | Resolved value | In-definition comment |
|---|---|---|
| `TF.HERO` | `22px` | verdict headline |
| `TF.TITLE` | `16px` | modal/section titles |
| `TF.BODY` | `13px` | descriptions, body text, panel headings, buttons, test names |
| `TF.NOTE` | `12px` | method descriptions, tertiary annotations |
| `TF.DETAIL` | `11px` | stat numbers, table cells, footers, secondary text |
| `TF.SMALL` | `9px` | uppercase labels, badges, dense table headers |

### 1.4 SVG-chart font-size tokens (`CF.*` in `src/constants/tokens.js:60–68`)

A separate scale, in unitless points (no `px` suffix), used inside SVG
plot components only. Comment in definition: "SVG chart font sizes —
6 levels (nothing below 9pt)".

| Token | Resolved value | In-definition comment |
|---|---|---|
| `CF.TICK` | `"10"` | axis tick numbers |
| `CF.AXIS` | `"11"` | axis title labels |
| `CF.LABEL` | `"10"` | group names, bar labels, legend text |
| `CF.VALUE` | `"10"` | data value annotations on bars/points |
| `CF.SMALL` | `"9"` | secondary annotations, reference line labels |
| `CF.TINY` | `"9"` | floor — nothing smaller than 9pt in any chart |

### 1.5 ImportView local font-size scale (`FS` in `src/components/views/ImportView.jsx:494`)

A component-scoped scale, declared inside the `ImportView` function body
(reachable only inside that component). Comment in definition: "Import
page 3-tier font sizes / T1: headings, control values, CTA — the user's
eye goes here first / T2: body text, form labels, stats — secondary
reading / T3: hints, badges, metadata — tertiary".

| Token | Resolved value |
|---|---|
| `FS.T1` | `"14px"` |
| `FS.T2` | `"13px"` |
| `FS.T3` | `"11px"` |

### 1.6 Section-header typography (`SECTION_HEADER_TYPOGRAPHY` in `src/components/shared/Section.jsx:22–29`)

| Property | Value |
|---|---|
| `fontSize` | `"14px"` (hardcoded literal, not via TF) |
| `color` | `C.TEXT_2` |
| `textTransform` | `"uppercase"` |
| `letterSpacing` | `"0.12em"` |
| `fontWeight` | `FW.SEMI` |
| `whiteSpace` | `"nowrap"` |

In-definition comment: "Section-header typography chrome — exported so
sub-header consumers (e.g. StickySurface lane labels) inherit family /
weight / tracking / casing / color from a single source. Override
`fontSize` at the call site to express hierarchy."

### 1.7 Style-helper exports in `src/components/shared/styles.js`

Composite style objects that bundle typography with layout. Listed for
completeness; properties show only the typography-relevant fields.

| Export | File:line | Typography fields |
|---|---|---|
| `SUB_HEAD` | `styles.js:7` | `fontSize:TF.DETAIL`, `fontFamily:FF.UI`, `fontWeight:FW.SEMI`, `color:C.TEXT_3` |
| `S_NOTE` | `styles.js:9` | `fontFamily:FF.UI`, `fontSize:TF.DETAIL`, `color:C.TEXT_4` |
| `S_TABLE` | `styles.js:10` | `fontSize:TF.DETAIL`, `…M` (= `fontFamily:FF.MONO`) |
| `TH_EVIDENCE` | `styles.js:13` | `fontSize:TF.DETAIL`, `fontFamily:FF.UI`, `fontWeight:FW.SEMI`, `color:C.TEXT_3`, `textAlign:"center"` |
| `TD_EVIDENCE` | `styles.js:16` | `fontSize:TF.DETAIL`, `fontFamily:FF.MONO`, `fontVariantNumeric:"tabular-nums"`, `textAlign:"center"` |
| `TD_EVIDENCE_ID` | `styles.js:19` | `fontSize:TF.DETAIL`, `fontFamily:FF.UI`, `textAlign:"center"` |
| `TD_NUM_CELL` | `styles.js:23` | `fontSize:TF.DETAIL`, `fontFamily:FF.MONO`, `fontVariantNumeric:"tabular-nums"` |
| `TD_ID_CELL` | `styles.js:24` | `fontSize:TF.DETAIL`, `fontFamily:FF.UI` |
| `M` | `tokens.js:171` | `fontFamily:FF.MONO` (one-property shorthand spread) |

### 1.8 Card-layout helpers in `src/components/shared/CardLayout.jsx`

Composite renderers; properties show typography-relevant fields.

| Component / call site | File:line | Typography fields |
|---|---|---|
| `CardBanner` body | `CardLayout.jsx:12` | `fontSize:TF.DETAIL`, `lineHeight:"1.5"`, `color:s.color` (banner-type) |
| `CardHeadline` outer | `CardLayout.jsx:22` | `fontFamily:FF.UI`, `fontSize:TF.DETAIL`, `color:HEADLINE_COLOR[flag]` (defaults `C.TEXT_3`), `lineHeight:"1.7"` |
| `CardHeadline` "Primary finding" prefix | `CardLayout.jsx:23` | `fontSize:TF.DETAIL`, `fontWeight:FW.SEMI`, `color:C.TEXT_4`, `textTransform:"uppercase"`, `letterSpacing:"0.04em"` |
| `CardDesc` paragraph | `CardLayout.jsx:32` | `color:C.TEXT_3`, `fontSize:TF.BODY`, `lineHeight:"1.55"` |
| `CardFooter` body | `CardLayout.jsx:36` | `fontFamily:FF.UI`, `fontSize:TF.DETAIL`, `color:C.TEXT_4` |
| Implications collapse-toggle | `CardLayout.jsx:56` | `fontSize:TF.DETAIL`, `color:C.TEXT_3`, `fontWeight:FW.SEMI`, `fontFamily:FF.UI` |
| Implications body | `CardLayout.jsx:61` | `fontSize:TF.BODY`, `fontFamily:FF.UI`, `color:C.TEXT_2`, `lineHeight:"1.6"` |
| What-to-look-for toggle | `CardLayout.jsx:70` | same as implications toggle |
| What-to-look-for body | `CardLayout.jsx:75` | same as implications body |

### 1.9 Text-colour tokens (`C.*` in `src/constants/tokens.js:4–15`)

Slate-ramp neutrals. Listed for the colour register.

| Token | Hex | In-definition comment |
|---|---|---|
| `C.TEXT` | `#1E293B` | headings, primary labels (slate-800) |
| `C.TEXT_2` | `#475569` | secondary text (slate-600) |
| `C.TEXT_3` | `#64748B` | table headers, axis labels (slate-500) |
| `C.TEXT_4` | `#94A3B8` | muted, annotations, N/A (slate-400) |
| `C.WHITE` | `#FFFFFF` | (used as text colour on dark/severity backgrounds) |

Background neutrals (`C.BG`, `C.BG_L`, `C.BG_ZONE`, `C.BORDER`, `C.BORDER_L`)
exist but are non-text — out of scope.

### 1.10 Severity-text colours (`SEV_VERDICT[s].color/.text` in `src/constants/tokens.js:147–152`)

Per-tier colour pair. `.color` is the vivid hue (used as text colour on
the verdict banner headline); `.text` is the dark-ink readable variant
(used on tinted backgrounds in pills/chips/badges).

| Tier | `.color` | `.text` |
|---|---|---|
| 0 (Clean) | `#22C55E` (= `SIGNAL.GREEN.dot`) | `#166534` (= `SIGNAL.GREEN.text`) |
| 1 (Low) | `#84CC16` | `#4D7C0F` |
| 2 (Moderate) | `#F97316` | `#C2410C` |
| 3 (High) | `#EF4444` (= `SIGNAL.RED.dot`) | `#991B1B` (= `SIGNAL.RED.text`) |

### 1.11 Mechanism-colour tokens (`MECH_COLOR.*` in `src/constants/tokens.js:115–121`)

Five-key map keyed to `MECHANISM_ORDER`. Used as text colour on the
verdict count-strip numerals and as a 4px left-edge stripe on §2 chips
and pills.

| Key | Hex | Comment |
|---|---|---|
| `copied` | `#4A6FA5` | slate blue |
| `digits` | `#BE185D` | magenta |
| `shapes` | `#6B7C32` | olive |
| `replicate` | `#6B46C1` | violet |
| `group` | `#9B4F76` | dusty rose |

### 1.12 Other colour-text tokens

| Token | File:line | Resolved | Used as text colour at |
|---|---|---|---|
| `SIGNAL.RED.text` | `tokens.js:20` | `#991B1B` | flagged-cell text in tables |
| `SIGNAL.AMBER.text` | `tokens.js:21` | `#713F12` | (no live consumer found in the 8 surfaces) |
| `SIGNAL.GREEN.text` | `tokens.js:22` | `#166534` | (no live consumer found in the 8 surfaces) |
| `ACCENT.BLUE.color` | `tokens.js:28` | `#3B82F6` | "Copy prompt" button bg + reportLink chip fg in §4 |
| `ACCENT.BLUE.text` | `tokens.js:28` | `#2a4a6a` | UI.INFO box text (excelSheetPicker hint) |
| `ACCENT.GOLD.text` | `tokens.js:31` | `#9a7010` | UI.WARN box text (general-assay note, advisory bar) |
| `ACCENT.TEAL.text` | `tokens.js:30` | `#0F766E` | AUTO badge text |
| `BADGE.AUTO.text` | `tokens.js:168` | resolves to `ACCENT.TEAL.text` | AUTO badge text + border |
| `FLAG_STYLES.{HIGH,MOD,LOW}.text` | `src/constants/thresholds.js` (not read in this audit) | flagged cell text colour, ImportView err box text |
| `HEADLINE_COLOR[flag]` | `src/constants/thresholds.js` | per-flag headline colour on test cards |

### 1.13 Global CSS in `index.html`

Loaded with the page; applies to all `<th>` and `<td>` not overridden by inline style.

| Selector | Property | Value | File:line |
|---|---|---|---|
| `th, td` | `font-size` | `11px` | `index.html:8` |
| `th, td` | `text-align` | `center` | `index.html:8` |
| `th` | `font-family` | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | `index.html:9` |
| `td` | `font-family` | `'SF Mono', 'Cascadia Code', Menlo, Consolas, monospace` | `index.html:10` |

Note: same families and same 11px size as `FF.UI` / `FF.MONO` /
`TF.DETAIL` from `tokens.js`, but the values are duplicated as literals
in the HTML rather than referenced — they will not track changes to
the token definitions.

---

## Section 2 — Surface usage map

For each surface, every text-rendering element with semantic role,
applied tokens, and file:line. Backgrounds and borders shown only when
they sit on the same element as text (interleaved tints). Click handlers
and non-text props omitted.

### 2.1 ImportView (`src/components/views/ImportView.jsx`)

Surface Nick described as "looks clean".

#### File-bar / upload zone

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| Empty-state prompt | "Upload a dataset to begin analysis" | `fontSize:FS.T2 (13px)`, `color:C.TEXT_2` | `ImportView.jsx:528` |
| Upload-File label (button) | primary CTA | `fontSize:TF.BODY`, `fontWeight:FW.SEMI`, `color:C.TEXT` | `ImportView.jsx:530` |
| Batch-Analysis button | secondary CTA | `fontSize:TF.BODY`, `fontWeight:FW.SEMI`, `color:C.TEXT` | `ImportView.jsx:534` |
| Drop-zone hint | "Drop a .csv / .tsv / .xlsx file" | `fontSize:FS.T3 (11px)`, `color:C.TEXT_4` | `ImportView.jsx:536` |
| Privacy headline | "🔒 Your data never leaves your computer" | `fontSize:"13px"` (literal), `fontWeight:FW.SEMI`, `color:C.TEXT_2` | `ImportView.jsx:539` |
| Privacy body | "All analyses run in your browser…" | `fontSize:"12px"` (literal), `color:C.TEXT_3` | `ImportView.jsx:540` |
| Back button (compact bar) | navigation | `fontSize:TF.DETAIL`, `fontWeight:FW.SEMI`, `color:C.TEXT_3` | `ImportView.jsx:550` |
| Filename | current file | `fontSize:FS.T1 (14px)`, `fontWeight:FW.SEMI`, `color:C.TEXT` | `ImportView.jsx:552` |
| Pinned-file pin display | meta indicator | `fontSize:TF.DETAIL`, `color:CC.OBS` | `ImportView.jsx:554` |
| Unpin ✕ button | action | `fontSize:TF.BODY`, `color:C.TEXT_4` | `ImportView.jsx:560` |
| Pin button (📌) | action | `fontSize:TF.DETAIL`, `color:C.TEXT_4` | `ImportView.jsx:567` |
| Change-file label | action | `fontSize:TF.DETAIL`, `fontWeight:FW.SEMI`, `color:C.TEXT_2` | `ImportView.jsx:572` |
| Auto-cleaned hint | meta info | `fontSize:FS.T3 (11px)`, `color:C.TEXT_4` | `ImportView.jsx:577` |

#### Zone headers (1 · Describe your data, 2 · Confirm column roles, etc.)

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| Zone-header pill | section divider | `fontSize:FS.T1 (14px)`, `color:C.TEXT_2`, `textTransform:"uppercase"`, `letterSpacing:"0.12em"`, `fontWeight:FW.SEMI` | `ImportView.jsx:501` |

#### Field labels (within the zones)

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| `fieldLabel` style helper | form label | `fontSize:FS.T2 (13px)`, `color:C.TEXT_3`, `textTransform:"uppercase"`, `letterSpacing:"0.08em"`, `fontWeight:FW.NORM` | `ImportView.jsx:497` |

#### Dropdowns + selectors (Header rows, Measurement type, Data type, etc.)

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| Header-rows numeric button | toggle | `fontSize:FS.T1 (14px)`, `fontWeight:FW.SEMI` | `ImportView.jsx:635` |
| Measurement-type dropdown selected text | control value | `fontSize:FS.T1 (14px)`, `color:C.TEXT` | `ImportView.jsx:646` |
| Measurement-type dropdown option label | option | `fontSize:TF.BODY`, `fontWeight:FW.SEMI`, `color:C.TEXT` | `ImportView.jsx:664` |
| Measurement-type option description | option detail | `fontSize:TF.DETAIL`, `color:C.TEXT_3` | `ImportView.jsx:665` |
| Data-type dropdown | control value | `fontSize:FS.T1 (14px)`, `color:C.TEXT` (or `C.TEXT_3` when locked) | `ImportView.jsx:675` |
| "Set by measurement type" lock note | meta | `fontSize:FS.T3 (11px)`, `color:C.TEXT_4` | `ImportView.jsx:680` |
| Excel sheet-picker title | "Select Sheet" | `fontSize:TF.DETAIL`, `color:UI.INFO.text (#2a4a6a)`, `textTransform:"uppercase"`, `letterSpacing:"0.08em"`, `fontWeight:FW.SEMI` | `ImportView.jsx:592` |
| Excel sheet-picker body | prompt | `fontSize:TF.BODY`, `color:C.TEXT_2` | `ImportView.jsx:593` |
| Excel sheet button | option | `fontSize:TF.BODY`, `fontWeight:FW.SEMI` | `ImportView.jsx:600` |

#### Hints, suggestions, badges

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| "Select a measurement type…" hint | warning | `fontSize:FS.T3 (11px)`, `color:UI.WARN.text (#9a7010)` | `ImportView.jsx:685` |
| "Suggested:" link button | suggestion | `fontSize:FS.T3 (11px)`, `fontWeight:FW.SEMI`, `color:CC.OBS` | `ImportView.jsx:688` |
| AUTO badge | provenance tag | `fontSize:FS.T3 (11px)`, `fontWeight:FW.BOLD`, `letterSpacing:"0.02em"`, `color:BADGE.AUTO.text (#0F766E)` | `ImportView.jsx:654, 855, 866, 912, 925` |
| SET ME badge | required indicator | `fontSize:FS.T3 (11px)`, `fontWeight:FW.BOLD`, `letterSpacing:"0.02em"`, `color:UI.WARN.text (#9a7010)` | `ImportView.jsx:655` |
| REQUIRED badge | required indicator | `fontSize:TF.SMALL (9px)`, `fontWeight:FW.BOLD`, `letterSpacing:"0.02em"`, `color:UI.WARN.text` | `ImportView.jsx:844` |
| `assayPlausibilityHint` body | warn/info banner text | `fontSize:TF.DETAIL`, `lineHeight:"1.5"`, `color` is `FLAG_STYLES.MODERATE.text` (warn) or `C.TEXT` (info) | `ImportView.jsx:691–696` |

#### Row-Sem / VST gate cards

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| Row-Sem gate prompt | question | `fontSize:FS.T2 (13px)`, `color:C.TEXT_2`, `lineHeight:"1.5"` | `ImportView.jsx:842` |
| Row-Sem auto sub-text | reason | `fontSize:FS.T3 (11px)`, `color:C.TEXT_3`, `lineHeight:"1.4"` | `ImportView.jsx:846` |
| Row-Sem option title | choice label | `fontSize:FS.T2 (13px)`, `fontWeight:FW.BOLD` | `ImportView.jsx:853, 864` |
| Row-Sem option description | choice detail | `fontSize:FS.T3 (11px)`, `color:C.TEXT_3`, `lineHeight:"1.4"` | `ImportView.jsx:857, 868` |
| Row-Sem REQUIRED hint | bottom note | `fontSize:FS.T3 (11px)`, `color:C.TEXT_4`, `lineHeight:"1.4"` | `ImportView.jsx:872` |
| VST card prompt body | question | `fontSize:FS.T2 (13px)`, `color:C.TEXT_2`, `lineHeight:"1.8"` | `ImportView.jsx:895` |
| VST option title | choice | `fontSize:FS.T2 (13px)`, `fontWeight:FW.BOLD` | `ImportView.jsx:910, 923` |
| VST option detail | choice description | `fontSize:FS.T3 (11px)`, `color:C.TEXT_3`, `lineHeight:"1.4"` | `ImportView.jsx:914` |

### 2.2 VerdictBanner — §1 SUMMARY (`src/components/views/VerdictBanner.jsx`)

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| Headline | tier statement (e.g. "All checks passed") | `fontSize:TF.HERO (22px)`, `fontWeight:FW.BOLD`, `color:v.color` (= `SEV_VERDICT[s].color`), `lineHeight:"1.2"` | `VerdictBanner.jsx:58` |
| Action sub | action one-liner ("Proceed with dataset" etc.) | `fontSize:TF.BODY`, `color:C.TEXT_2`, `lineHeight:"1.5"` | `VerdictBanner.jsx:83` |
| Count-strip outer | container | `fontSize:TF.BODY`, `color:C.TEXT_2`, `lineHeight:"1.5"` | `VerdictBanner.jsx:96` |
| Count-strip numeral | mechanism count | `color:MECH_COLOR[mk]`, `fontWeight:FW.SEMI` (size inherited from outer = `TF.BODY`) | `VerdictBanner.jsx:107` |
| Count-strip label | mechanism name | inherits `TF.BODY` / `C.TEXT_2` from outer | `VerdictBanner.jsx:108` |
| Count-strip separator `·` | divider | inherits size, override `color:C.TEXT_4` | `VerdictBanner.jsx:109` |
| False-positive context | severity-1/2 footnote | `fontSize:TF.SMALL (9px)`, `color:C.TEXT_3`, `lineHeight:"1.5"` | `VerdictBanner.jsx:122` |
| Identity-row text (left column) | "Measurement type: …" / "Table size: …" / "Conditions: …" | `fontSize:TF.BODY`, `color:C.TEXT`, `lineHeight:"1.5"` | `VerdictBanner.jsx:149` |
| Settings entry (right column) | configuration entries | `fontSize:TF.BODY`, `color:C.TEXT`, `lineHeight:"1.5"` | `VerdictBanner.jsx:156` |
| Reference-convention note | "Row numbers and column labels…" | `fontSize:TF.BODY`, `color:C.TEXT` (centred) | `VerdictBanner.jsx:169` |

The severity-dot row (10×10 dots, 1.5px borders, `SEV_VERDICT[s].color`)
is non-text — out of typography scope.

### 2.3 §2 WHAT WAS FOUND — StickySurface + FindingPill + FindingChip

#### Section header (rendered via `Section.jsx`)

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| "2 · WHAT WAS FOUND" | section divider | `SECTION_HEADER_TYPOGRAPHY` (14px, `C.TEXT_2`, uppercase, 0.12em tracking, `FW.SEMI`) | `Section.jsx:36` |

#### Sticky body

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| Severity echo line | "{K} patterns flagged" | `fontFamily:FF.UI`, `fontSize:TF.BODY`, `fontWeight:FW.SEMI`, `color:sevColor` (= `SEV_VERDICT[s].color`) | `StickySurface.jsx:158–168` |
| Lane label `LANE_LABEL` | "Dataset-wide patterns" / "Localised patterns" / "Patterns flagged broadly" | `fontFamily:FF.UI`, `fontSize:TF.BODY`, `fontWeight:FW.SEMI`, `color:C.TEXT` | `StickySurface.jsx:44–51` (definition) ; lines 178/192/210 (use) |
| Pill text | test display name | `fontSize:TF.DETAIL`, `fontFamily:FF.UI`, `fontWeight:FW.SEMI`, `color:sev.text` (= `SEV_VERDICT[s].color`) | `FindingPill.jsx:72–74` |
| Chip text (single-test) | test display name | `fontSize:TF.DETAIL`, `fontFamily:FF.UI`, `fontWeight:FW.SEMI`, `color:sev.text` | `FindingChip.jsx:115–117` |
| Chip text (multi-test, inline mode) | dimension label | same as single-test chip | `FindingChip.jsx:115–117` |
| Chip `[N]` prefix (modal mode only) | region anchor | `fontWeight:FW.BOLD`, `color:sev.text` (size inherited) | `FindingChip.jsx:123` |
| Chip `+M` counter | other-dimension count | `color:C.TEXT_3`, `fontWeight:FW.NORM` (size inherited) | `FindingChip.jsx:127` |

LOW-only chip uses `color:C.TEXT_2` instead of `sev.text` (`FindingChip.jsx:55`).

### 2.4 §3 DETAILED TEST RESULTS — section / dimension block / TestCardLayout / representative MiniCard

#### Section header

| Element | Tokens | File:line |
|---|---|---|
| "3 · DETAILED TEST RESULTS" | `SECTION_HEADER_TYPOGRAPHY` (same as §2) | `Section.jsx:36` (via `Section` wrapper) |

#### ForensicsCategoryBlock (dimension wrapper, `src/components/forensics/ForensicsCategoryBlock.jsx`)

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| ⚠/✓ severity icon | tier glyph | `fontSize:"15px"` (literal), `color:flagColor` (= `SEV_VERDICT[s].color`) | `ForensicsCategoryBlock.jsx:109` |
| Dimension label | "Copy, Paste, Edit" etc. | `fontSize:TF.BODY`, `fontWeight:FW.SEMI`, `color:C.TEXT` | `ForensicsCategoryBlock.jsx:112` |
| Test-count parenthetical | "(28 tests)" | `fontSize:TF.DETAIL`, `color:C.TEXT_3` | `ForensicsCategoryBlock.jsx:113` |
| Description after em-dash | dimension caption | `fontSize:TF.BODY`, `color:C.TEXT_3` | `ForensicsCategoryBlock.jsx:116` |
| Expand chevron | toggle | `fontSize:"14px"` (literal), `color:C.TEXT_2` | `ForensicsCategoryBlock.jsx:119` |
| CLEAR-summary row container | collapse line | `fontSize:TF.DETAIL`, `fontFamily:FF.UI`, `color:C.TEXT_3` | `ForensicsCategoryBlock.jsx:178–186` |
| CLEAR ✓ icon | tier glyph | `fontSize:TF.BODY`, `color:SEV_VERDICT[0].color` | `ForensicsCategoryBlock.jsx:189` |
| CLEAR count "N tests CLEAR" | summary | `fontWeight:FW.SEMI` (size inherited from container) | `ForensicsCategoryBlock.jsx:190` |
| CLEAR em-dash | divider | `color:C.TEXT_4` (size inherited) | `ForensicsCategoryBlock.jsx:191` |
| CLEAR test-name list | ellipsised names | (inherits container) | `ForensicsCategoryBlock.jsx:193` |
| CLEAR chevron | toggle | (inherits container) `color:C.TEXT_3` | `ForensicsCategoryBlock.jsx:195` |

#### TestCardLayout (`src/components/shared/TestCardLayout.jsx`)

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| Card outer | container fontFamily | `fontFamily:FF.UI` | `TestCardLayout.jsx:48` |
| Test display name | header | `fontSize:TF.BODY`, `fontWeight:FW.SEMI`, `color:C.TEXT` | `TestCardLayout.jsx:56` |
| Subtitle (after `·`) | test description | `fontSize:TF.BODY`, `color:C.TEXT_3` | `TestCardLayout.jsx:60` |
| Severity badge | "Flagged" / "Noted" / "Clear" | `fontWeight:FW.SEMI`, `fontSize:TF.BODY`, `color:flColor` (= `SEV_VERDICT[s].color`) | `TestCardLayout.jsx:69` |
| Expand chevron | toggle | `fontSize:TF.BODY`, `color:C.TEXT_3` | `TestCardLayout.jsx:75` |
| "How this test works" toggle | collapse | `fontSize:TF.DETAIL`, `color:C.TEXT_3`, `fontWeight:FW.SEMI`, `fontFamily:FF.UI` | `TestCardLayout.jsx:85` |
| Method body | method copy | `fontSize:TF.BODY`, `fontFamily:FF.UI`, `color:C.TEXT_2`, `lineHeight:"1.6"` | `TestCardLayout.jsx:90` |
| Footer text | "26 column pairs · slope 0.05 …" | `fontSize:TF.DETAIL`, `fontFamily:FF.UI`, `color:C.TEXT_3` | `TestCardLayout.jsx:98` |

#### Representative card — MiniCard_DuplicateDetection (`src/components/cards/MiniCard_DuplicateDetection.jsx`)

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| Card headline (via `CardHeadline`) | one-sentence finding | (see §1.8) `fontFamily:FF.UI`, `fontSize:TF.DETAIL`, `color:HEADLINE_COLOR[flag]`, `lineHeight:"1.7"` | `CardLayout.jsx:22` |
| Card desc paragraph (via `CardDesc`) | descriptive context | `color:C.TEXT_3`, `fontSize:TF.BODY`, `lineHeight:"1.55"` | `CardLayout.jsx:32` |
| Implications collapse + body | (see §1.8) | | `CardLayout.jsx:56, 61` |
| What-to-look-for collapse + body | (see §1.8) | | `CardLayout.jsx:70, 75` |
| Card footer | "{rows} rows · {col-pairs} column pairs · …" | `fontFamily:FF.UI`, `fontSize:TF.DETAIL`, `color:C.TEXT_4` | `CardLayout.jsx:36` |
| Evidence sub-head ("Duplicated blocks of data") | (via `SUB_HEAD`) | `fontSize:TF.DETAIL`, `fontFamily:FF.UI`, `fontWeight:FW.SEMI`, `color:C.TEXT_3` | `MiniCard_DuplicateDetection.jsx:166` (uses `SUB_HEAD`) |
| Evidence detail line ("3 copied blocks (12 rows); …") | sub-heading detail | `fontSize:TF.DETAIL`, `fontFamily:FF.UI`, `color:C.TEXT_2` | `MiniCard_DuplicateDetection.jsx:167` |
| Inline pair label "X = Y for rows …" | block label | `fontSize:TF.DETAIL`, `fontFamily:FF.UI`, `fontWeight:FW.SEMI`, `color:C.TEXT_2` | `MiniCard_DuplicateDetection.jsx:209–210` |
| Block "— N consecutive rows" caption | meta | `color:C.TEXT_3` (size inherited) | `MiniCard_DuplicateDetection.jsx:213` |
| Original/Copy table caption | "Original (rows 12–15)" | `fontSize:TF.DETAIL`, `color:C.TEXT_3`, `fontFamily:FF.UI` | `MiniCard_DuplicateDetection.jsx:243, 255` |
| Evidence-table data cell `TD_NUM_CELL` | numeric cell | `fontSize:TF.DETAIL`, `fontFamily:FF.MONO`, `fontVariantNumeric:"tabular-nums"` | `styles.js:23` |
| Evidence-table identifier cell `TD_ID_CELL` | row-number / label cell | `fontSize:TF.DETAIL`, `fontFamily:FF.UI` | `styles.js:24` |
| "… N more rows" overflow | continuation | `color:C.TEXT_4` (size from `TD_ID_CELL` = `TF.DETAIL`) | `MiniCard_DuplicateDetection.jsx:221, 250, 262, 283, 327` |

For comparison, MiniCard_InterReplicateCorrelation uses the same shared
helpers (`SUB_HEAD`, `MiniCardLayout`'s `CardHeadline`/`CardDesc`/
`CardFooter`, `EvidenceTable` which renders via `TH_EVIDENCE` /
`TD_EVIDENCE`). The "no localised row ranges" fallback line at
`MiniCard_InterReplicateCorrelation.jsx:188` uses `fontSize:TF.BODY`,
`fontFamily:FF.UI`, `color:C.TEXT_3`.

### 2.5 §4 INVESTIGATE FURTHER (AI prompt panel) — `src/components/views/ReportView.jsx:1202–1219`

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| Section header "4 · INVESTIGATE FURTHER" | divider | `SECTION_HEADER_TYPOGRAPHY` (via `Section`) | `Section.jsx:36` |
| Severity-0 placeholder | "No anomalies were detected. No further investigation is needed." | `fontSize:TF.BODY`, `color:C.TEXT_3` | `ReportView.jsx:1205` |
| Prompt instruction | "Copy the prompt below and paste it…" | `fontSize:TF.BODY`, `color:C.TEXT_2`, `lineHeight:"1.6"` | `ReportView.jsx:1208` |
| Prompt body box | rendered consultation prompt | `fontSize:TF.DETAIL`, `color:C.TEXT_3`, `lineHeight:"1.6"`, `fontFamily:"monospace"` (literal — not via `FF.MONO`) | `ReportView.jsx:1211` |
| "Copy prompt" button | CTA | `fontWeight:FW.SEMI`, `fontSize:TF.BODY`, `color:C.WHITE` (text on coloured bg) | `ReportView.jsx:1214` |

### 2.6 §5 METHODOLOGY — `src/components/views/ReportView.jsx:1221–1256`

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| Section header "5 · METHODOLOGY" | divider | `SECTION_HEADER_TYPOGRAPHY` | `Section.jsx:36` |
| Test-count line | "{nApp} of {results.length} tests applicable. …" | `fontSize:TF.BODY`, `color:C.TEXT_2`, `lineHeight:"1.6"` | `ReportView.jsx:1226` |
| Disclaimer | "This report is a screening aid, not a determination of misconduct…" | `fontSize:TF.DETAIL`, `color:C.TEXT_3` | `ReportView.jsx:1228` |
| "Test battery details" toggle | collapse | `fontSize:TF.DETAIL`, `color:C.TEXT_3` | `ReportView.jsx:1231` |
| Battery body | category list | `fontSize:TF.DETAIL`, `color:C.TEXT_3`, `lineHeight:"1.7"` | `ReportView.jsx:1236` |
| Battery `<strong>` per-category | "Copy, paste, edit:" etc. | `color:C.TEXT_2` (weight via `<strong>` element default) | `ReportView.jsx:1237–1241` |
| "References" toggle | collapse | `fontSize:TF.DETAIL`, `color:C.TEXT_3` | `ReportView.jsx:1245` |
| References body | citation list | `fontSize:TF.DETAIL`, `color:C.TEXT_3`, `lineHeight:"1.7"` | `ReportView.jsx:1250` |

### 2.7 DeepLookModal (`src/components/forensics/DeepLookModal.jsx`)

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| Modal outer | container fontFamily | `fontFamily:FF.UI` | `DeepLookModal.jsx:179` |
| ✕ close button | dismiss | `fontSize:TF.TITLE (16px)`, `fontWeight:FW.NORM`, `color:C.TEXT_3` | `DeepLookModal.jsx:190` |
| Modal title "Deep look" | heading | `fontSize:TF.TITLE`, `fontWeight:FW.BOLD`, `color:C.TEXT` | `DeepLookModal.jsx:200` |
| Focused-region context "Region [N] — {testName}" | sub-heading | `fontSize:TF.DETAIL`, `color:C.TEXT_3` | `DeepLookModal.jsx:204` |
| Lane labels (`LANE_LABEL`) | "Dataset-wide patterns" / "Localised patterns" / "Patterns flagged broadly" | `fontFamily:FF.UI`, `fontSize:TF.BODY`, `fontWeight:FW.SEMI`, `color:C.TEXT` | `DeepLookModal.jsx:54–61` (definition; identical to StickySurface's) ; uses 219/238/260 |
| Pills + chips | (re-used from §2 components) | (see §2.3) | `FindingPill.jsx`, `FindingChip.jsx` |
| MinimapStrip | (chart component) | mostly SVG `CF.*` registers | `MinimapStrip.jsx` (not enumerated in this audit) |
| ExcerptTable | (data-grid component) | `TH_EVIDENCE` / `TD_EVIDENCE` | `ExcerptTable.jsx` (not enumerated in this audit) |

### 2.8 Page-level chrome — file bar / mode tabs / actions menu / Section dividers (`src/components/views/ReportView.jsx`)

| Element | Semantic | Tokens | File:line |
|---|---|---|---|
| File-bar Row 1 outer | container fontSize | `fontSize:TF.BODY` | `ReportView.jsx:720` |
| Back button "← Back" | navigation | `fontSize:TF.DETAIL`, `fontWeight:FW.SEMI`, `color:C.TEXT_3` | `ReportView.jsx:721` |
| `\|` separator | divider glyph | `color:C.BORDER` (size inherited from container = `TF.BODY`) | `ReportView.jsx:722` |
| Filename | file context | `color:C.TEXT`, `fontWeight:FW.SEMI`, `fontSize:"14px"` (hardcoded literal — not via TF) | `ReportView.jsx:723` |
| "Change file" label/button | action | `fontSize:TF.DETAIL`, `fontWeight:FW.SEMI`, `color:C.TEXT_2` | `ReportView.jsx:725` |
| Mode tab (Check my data / Peer review / Forensics) — active | tab | `fontSize:TF.DETAIL`, `fontWeight:FW.SEMI`, `color:C.TEXT`, `fontFamily:FF.UI`, `letterSpacing:"0.02em"` | `ReportView.jsx:735–740` |
| Mode tab — inactive | tab | same family/size/spacing, `fontWeight:FW.NORM`, `color:C.TEXT_3` | `ReportView.jsx:735–740` |
| ⋯ Actions button | dropdown trigger | `fontSize:TF.DETAIL`, `fontWeight:FW.SEMI`, `color:C.TEXT_3` | `ReportView.jsx:746` |
| Actions menu item (Print / Copy summary / Export …) | menu entry | `fontSize:TF.BODY`, `color:C.TEXT_2`, `fontFamily:FF.UI` | `ReportView.jsx:752–756` |
| Section divider (§1 SUMMARY etc.) | `SECTION_HEADER_TYPOGRAPHY` (see §1.6) | (see §1.6) | `Section.jsx:36` |
| ⚠ COLUMN STRUCTURE NOTE label | advisory | `fontSize:TF.DETAIL`, `fontWeight:FW.BOLD`, `letterSpacing:"0.06em"`, `fontFamily:FF.MONO` (via `…M`) | `ReportView.jsx:776` |
| Replicate-structure advisory body | warn body | `fontSize:TF.BODY`, `color:UI.WARN.text`, `lineHeight:"1.6"` | `ReportView.jsx:775` |

§1 SUMMARY in Forensics mode bypasses the standard `Section` wrapper —
the VerdictBanner card is the §1 surface itself and there is no
"1 · SUMMARY" header above it in Forensics. (QC and Review modes
render the verdict banner at the top of the document branch with no
explicit Section header above either; Section dividers numbered 2–5
appear only in the Forensics document branch via `ForensicsBody` and
`ReportView`'s §4 / §5 inline.)

---

## Section 3 — Resolved (family, size, weight, colour) tuple summary

Every distinct text register in active rendering across §2 surfaces
(family + size + weight + colour). Tuples ordered by usage count
descending. Letter-spacing / case treatment captured separately in
§4 — same family/size/weight/colour with different case is one tuple
here.

Counts are element-instances surveyed in §2 (not runtime usages —
e.g. an iterated map renders multiple instances but is counted once
per call site).

| # | Family | Size | Weight | Colour | Approximate count | Example call site |
|---|---|---|---|---|---|---|
| 1 | UI | 13px (TF.BODY) | NORM | C.TEXT_2 | 18 | §3 method body, §4 prompt instruction, §5 disclaimer body, advisory body |
| 2 | UI | 11px (TF.DETAIL) | NORM | C.TEXT_3 | 16 | card desc detail, dimension test-count parenthetical, §5 disclaimer, footer caption text |
| 3 | UI | 13px (TF.BODY) | NORM | C.TEXT_3 | 11 | card description, test-card subtitle, dimension description, severity-0 §4 body |
| 4 | UI | 11px (TF.DETAIL) | SEMI | C.TEXT_3 | 9 | SUB_HEAD, TH_EVIDENCE, expand toggles ("Implications" / "What to look for" / "How this test works"), Back/Change-file buttons |
| 5 | UI | 13px (TF.BODY) | SEMI | C.TEXT | 7 | TestCardLayout test-display-name, ForensicsCategoryBlock dimension label, Lane labels, identity-row text (left col), settings entries (right col), reference-convention note |
| 6 | UI | 13px (TF.BODY) | NORM | C.TEXT | 6 | identity-row text (left col), settings entries (right col), reference-convention note, ImportView Upload-File CTA, mode-tab active, Actions menu items |
| 7 | UI | 11px (TF.DETAIL) | SEMI | varies (tier-keyed: SEV_VERDICT[s].color via FindingPill / FindingChip) | 4 | pills + chips |
| 8 | UI | 13px (TF.BODY) | SEMI | C.TEXT_2 | 4 | filename in compact bar, mode-tab inactive (NORM not SEMI — separate row), Actions menu entries |
| 9 | UI | 14px (FS.T1 / SECTION literal) | SEMI | C.TEXT_2 | 3 | zone headers (ImportView), section dividers (§2/§3/§4/§5), Excel sheet-picker title (DETAIL not BODY — separate row) |
| 10 | UI | 14px (FS.T1) | SEMI | C.TEXT | 2 | Header-rows numeric button, Measurement-type dropdown selected text |
| 11 | UI | 14px (literal) | SEMI | C.TEXT | 1 | filename in file bar |
| 12 | UI | 14px (literal) | NORM | C.TEXT_2 | 1 | category-block expand chevron |
| 13 | UI | 22px (TF.HERO) | BOLD | tier-keyed (SEV_VERDICT[s].color) | 1 | VerdictBanner headline |
| 14 | UI | 16px (TF.TITLE) | BOLD | C.TEXT | 1 | DeepLookModal title |
| 15 | UI | 16px (TF.TITLE) | NORM | C.TEXT_3 | 1 | DeepLookModal ✕ button |
| 16 | UI | 15px (literal) | NORM | tier-keyed | 1 | ⚠/✓ category icon |
| 17 | UI | 13px (TF.BODY) | NORM | tier-keyed (SEV_VERDICT[s].color) | 1 | VerdictBanner action sub (NB: outer bg is tinted; sub colour is `C.TEXT_2` not tier — see §2.2) |
| 18 | UI | 13px (TF.BODY) | SEMI | tier-keyed (TestCardLayout flColor / sticky-echo sevColor) | 2 | TestCardLayout severity badge, sticky-surface severity-echo line |
| 19 | UI | 13px (FS.T2) | NORM | C.TEXT_2 | 1 | empty-state "Upload a dataset…" prompt |
| 20 | UI | 13px (FS.T2) | NORM | C.TEXT_3 | 1 | `fieldLabel` (uppercase + tracked — see §4) |
| 21 | UI | 13px (FS.T2) | BOLD | (color-by-state) | 2 | Row-Sem option title, VST option title |
| 22 | UI | 11px (FS.T3) | NORM | C.TEXT_3 | 4 | Row-Sem option description, VST option detail, Row-Sem auto sub-text |
| 23 | UI | 11px (FS.T3) | NORM | C.TEXT_4 | 3 | drop-zone hint, "Set by measurement type" lock note, auto-cleaned hint |
| 24 | UI | 11px (FS.T3) | NORM | UI.WARN.text (#9a7010) | 1 | "Select a measurement type…" hint |
| 25 | UI | 11px (FS.T3) | SEMI | CC.OBS (#3B82F6) | 1 | "Suggested:" inline link |
| 26 | UI | 11px (FS.T3) | BOLD | UI.WARN.text or BADGE.AUTO.text | 2 | AUTO badge, SET ME badge |
| 27 | UI | 11px (TF.DETAIL) | SEMI | UI.INFO.text (#2a4a6a) | 1 | Excel sheet-picker title (uppercase + tracked) |
| 28 | UI | 11px (TF.DETAIL) | NORM | UI.WARN.text (#9a7010) | 1 | assayPlausibilityHint warn body |
| 29 | UI | 13px (TF.BODY) | NORM | UI.WARN.text | 1 | replicate-structure advisory body |
| 30 | UI | 11px (TF.DETAIL) | SEMI | C.TEXT_4 | 1 | CardHeadline "Primary finding:" prefix (uppercase + tracked) |
| 31 | UI | 11px (TF.DETAIL) | NORM | HEADLINE_COLOR[flag] (varies, defaults C.TEXT_3) | 1 | CardHeadline body |
| 32 | UI | 11px (TF.DETAIL) | NORM | C.TEXT_2 | 1 | evidence detail line ("3 copied blocks (12 rows); …") |
| 33 | UI | 11px (TF.DETAIL) | SEMI | C.TEXT_2 | 1 | block pair label "X = Y for rows …" |
| 34 | UI | 11px (TF.DETAIL) | NORM | C.TEXT_4 | 2 | CardFooter, "… N more rows" overflow |
| 35 | UI | 9px (TF.SMALL) | NORM | C.TEXT_3 | 1 | VerdictBanner false-positive context |
| 36 | UI | 9px (TF.SMALL) | BOLD | UI.WARN.text | 1 | REQUIRED badge |
| 37 | MONO | 11px (TF.DETAIL) | NORM | C.TEXT (or per-cell tint) | 2+ | TD_EVIDENCE / TD_NUM_CELL data cells |
| 38 | MONO | 11px (TF.DETAIL) | BOLD | varies (cell-state) | 1 | data cells when highlighted (FW.BOLD applied) |
| 39 | MONO | 11px (TF.DETAIL) | BOLD | C.TEXT_3 | 1 | row-number cell (in MiniCard_DuplicateDetection DataRow) |
| 40 | MONO | 11px (TF.DETAIL) | BOLD | (multi) | 1 | ⚠ COLUMN STRUCTURE NOTE label (uppercase + 0.06em tracking) |

**Headline figure: ~40 distinct (family, size, weight, colour) tuples
in active rendering across the eight surveyed surfaces** — recognising
that "tier-keyed" colour cells expand into 4 × `SEV_VERDICT[s].color`
underlying values so the realised count is somewhat higher in practice.
The dominant clusters are TF.BODY (13px) at C.TEXT / C.TEXT_2 / C.TEXT_3
and TF.DETAIL (11px) at C.TEXT_2 / C.TEXT_3 / C.TEXT_4.

Family axis: **MONO** is restricted to data-cell rendering (and the
`⚠ COLUMN STRUCTURE NOTE` label which spreads `…M`). **SERIF** is the
logo only. **PRINT** is the HTML-export summary table only. All other
text on the eight surfaces is **UI**.

---

## Section 4 — Case + letter-spacing inventory

Case treatment categorised as `sentence` (normal capitalisation, e.g.
"Anomalies detected"), `Title` (each word capitalised), `ALL CAPS`
(textTransform: uppercase), or `verbatim` (text passed through
unchanged from data, e.g. filenames, test names, headlines built from
content).

Letter-spacing only listed when set (default omitted).

### 4.1 Case = ALL CAPS (with letterSpacing)

| Element | Surface | letterSpacing | File:line |
|---|---|---|---|
| Section divider "1 · SUMMARY" / "2 · WHAT WAS FOUND" / "3 · DETAILED TEST RESULTS" / "4 · INVESTIGATE FURTHER" / "5 · METHODOLOGY" | All §-bearing surfaces | `0.12em` | `Section.jsx:26` |
| Zone header "1 · Describe your data" etc. | ImportView | `0.12em` | `ImportView.jsx:501` |
| `fieldLabel` style helper (used on form labels) | ImportView | `0.08em` | `ImportView.jsx:497` |
| Excel sheet-picker title "Select Sheet" | ImportView | `0.08em` | `ImportView.jsx:592` |
| AUTO badge | ImportView (multiple sites) | `0.02em` | `ImportView.jsx:654, 855, 866, 912, 925` |
| SET ME badge | ImportView | `0.02em` | `ImportView.jsx:655` |
| REQUIRED badge | ImportView Row-Sem gate | `0.02em` | `ImportView.jsx:844` |
| ⚠ COLUMN STRUCTURE NOTE label | ReportView advisory | `0.06em` | `ReportView.jsx:776` |
| `CardHeadline` "Primary finding:" prefix | every flagged MiniCard | `0.04em` | `CardLayout.jsx:23` |

### 4.2 Case = sentence + letterSpacing applied

| Element | Surface | letterSpacing | File:line |
|---|---|---|---|
| Mode tabs (Check my data / Peer review / Forensics) | ReportView page chrome | `0.02em` | `ReportView.jsx:739` |

### 4.3 Case = sentence (no letterSpacing)

All other text elements in §2 use sentence case with default letter-
spacing. Notable instances:
- VerdictBanner headline + sub
- Lane labels ("Dataset-wide patterns" etc.) — note: `LANE_LABEL`
  comment in `StickySurface.jsx:42` documents the choice ("Dimension
  headers use sentence case ('Copy, Paste, Edit')")
- ForensicsCategoryBlock dimension labels ("Copy, Paste, Edit" etc.) —
  Title-case-looking but emerge from `MECHANISMS[mk].label` data
- TestCardLayout test-display-name (test names — verbatim from data)
- §4 prompt body
- §5 methodology body, battery, references

### 4.4 Case = Title-from-data

Test display names ("Inter-Replicate Correlation", "Duplicate
Detection") and dimension labels ("Copy, Paste, Edit", "Cross-Replicate
Comparisons") render verbatim from `DISPLAY_NAMES` /
`MECHANISMS[mk].label` constants. The case on screen is the case in
the data file.

### 4.5 Case = verbatim

Filenames, condition names, and other user-supplied or data-derived
strings render with whatever case the user provided. Examples:
filename in compact file bar, "Conditions: Control, Inhibitor_A,
Inhibitor_B" identity row, condition names inside test cards.

### 4.6 Case = ALL CAPS without letter-spacing

None found in the surveyed surfaces.

---

## Section 5 — Notable observations (factual)

### 5.1 Two parallel font-size scales coexist

`TF.*` (six sizes: 22 / 16 / 13 / 12 / 11 / 9 px) is defined in
`tokens.js` and used across most of the codebase. ImportView declares
its own three-tier scale `FS = { T1:14px, T2:13px, T3:11px }` inside
the component body at `ImportView.jsx:494`. The values are
non-overlapping (`FS.T1 = 14px` is not in `TF`; `TF.NOTE = 12px` is
not in `FS`); the values that do overlap (`FS.T2 = 13px = TF.BODY`,
`FS.T3 = 11px = TF.DETAIL`) are duplicated as literals rather than
referenced. The ImportView in-comment rationale ("Import page 3-tier
font sizes") names this as deliberate.

### 5.2 Section-header typography defined in two places

`SECTION_HEADER_TYPOGRAPHY` in `Section.jsx:22–29` and the inline
`zoneHeader` style at `ImportView.jsx:501` are functionally identical
on family / weight / casing / tracking / colour, but defined separately.
ImportView's value uses `FS.T1` (`"14px"`); Section.jsx uses a hardcoded
`"14px"` literal. They will visually drift if either definition is
edited.

### 5.3 Unused (or near-unused) tokens

`TF.NOTE` (12px) — zero rendering uses post-S133h FIX3. The only
remaining `TF.NOTE` reference in `src/` is a literal mention inside a
documentation comment at `VerdictBanner.jsx:166` describing what was
retired; no live consumer.

`TF.HERO` (22px) — one rendering use (`VerdictBanner.jsx:58`) plus one
HTML-report export-CSS use (`ReportView.jsx:545`).

`FF.PRINT` — single use, the HTML-report summary table
(`ReportView.jsx:514`).

`FF.SERIF` — single use, the logo (`Logo.jsx:9`).

`SIGNAL.AMBER.text` and `SIGNAL.GREEN.text` — no live consumer in the
eight surveyed surfaces. (Both have `.bg`/`.border`/`.dot` consumers
elsewhere; only the `.text` slot is unused on these surfaces.)

### 5.4 Hardcoded-pixel font sizes coexisting with TF tokens

Three `fontSize` values inline in JSX use string literals rather than
TF tokens:
- `ImportView.jsx:539` — `fontSize:"13px"` (privacy headline; equals `TF.BODY`)
- `ImportView.jsx:540` — `fontSize:"12px"` (privacy body; equals `TF.NOTE`)
- `ReportView.jsx:723` — `fontSize:"14px"` (filename; equals `FS.T1` but not `TF`)
- `Section.jsx:23` — `fontSize:"14px"` inside `SECTION_HEADER_TYPOGRAPHY` (equals `FS.T1` but not `TF`)
- `ForensicsCategoryBlock.jsx:109, 119` — `fontSize:"15px"` (⚠/✓ icon and category-block chevron); not in either scale.

### 5.5 Two distinct 14px headers in the report

The page-level "1 · SUMMARY" / "2 · WHAT WAS FOUND" etc. section
dividers and the ImportView "1 · Describe your data" zone headers are
both 14px / uppercase / 0.12em-tracked / FW.SEMI / C.TEXT_2, and are
visually adjacent in the user's flow (Import → Report). They are
defined separately (5.2 above), and their case comes via a literal
" · " glue between number and label rather than a shared template.

### 5.6 Letter-spacing cluster

Five distinct letter-spacing values are in use on the eight surveyed
surfaces:
- `0.02em` — mode tabs, AUTO/SET ME/REQUIRED badges
- `0.04em` — CardHeadline "Primary finding:" prefix
- `0.06em` — ⚠ COLUMN STRUCTURE NOTE label
- `0.08em` — `fieldLabel`, Excel sheet-picker title
- `0.12em` — section dividers, ImportView zone headers

All applied to ALL CAPS text except `0.02em` on the mode tabs (sentence
case).

### 5.7 Severity colour family in text-colour role

`SEV_VERDICT[s].color` (the vivid hue) is used as a text colour in five
contexts: VerdictBanner headline (line 58), VerdictBanner action sub
(`v.color` is set on the bordering element, not the sub; the sub is
`C.TEXT_2` — see §2.2), TestCardLayout severity badge (line 69), §2
StickySurface severity echo (line 162), pills + chips (FindingPill
line 72, FindingChip line 114). Pill/chip text additionally uses
`SEV_VERDICT[s].color` as both border and pre-FIX3 read-text colour;
the readable-on-tinted-bg `.text` variant (e.g. `#991B1B` for HIGH) is
not used as text colour on these surfaces.

### 5.8 Card-headline "Primary finding:" prefix

`CardLayout.jsx:23` defines a `Primary finding:` prefix at the start of
every flagged MiniCard's headline, rendered ALL CAPS with `letter-
spacing:0.04em`, weight `FW.SEMI`, colour `C.TEXT_4`. It uses the same
register family as the section dividers (uppercase + tracked) but at
a different size (TF.DETAIL vs 14px), tracking (0.04em vs 0.12em), and
colour (C.TEXT_4 vs C.TEXT_2).

### 5.9 Sub-pixel scale crowding at the small end

Within the small-text band (≤13px), the following distinct sizes are in
active use: 9px (TF.SMALL), 11px (TF.DETAIL / FS.T3), 12px (literal
"12px" at ImportView.jsx:540 — equals `TF.NOTE` which has no other
consumer), 13px (TF.BODY / FS.T2 / literal "13px" at
ImportView.jsx:539). Four sizes occupy the 9–13 px range, with two of
them (12px and 13px) backed by both a token reference and inline
literal at different call sites.

### 5.10 "Lane label" / dimension-header / section-header three-tier comment

`StickySurface.jsx:38–43` and `Section.jsx:14–22` together document
an explicit three-tier hierarchy: section header (uppercase, tracked,
14px) → dimension header / lane label (sentence case, no tracking,
13px) → body. The two header tiers share `fontWeight:FW.SEMI` and
`color:C.TEXT_2` (section) vs `color:C.TEXT` (lane label / dimension
label) — the colour distinction is what marks them apart at the same
weight.

### 5.11 `index.html` global CSS as a fourth definition site

Beyond `tokens.js`, component-local FS scales, and shared/styles.js,
`index.html:7–11` ships a global stylesheet that sets `font-size:11px`
+ family tokens on `th` and `td`. It applies to every uninlined table
cell (most live cells are inlined via `TD_*` style helpers, so the
practical scope is small — but it is a fourth definition site).

### 5.12 Mode-axis variation

`SEVERITY_TEXT` in `guidance.js:20–32` defines per-mode (qc / review)
verdict-banner headlines that override the Forensics-mode `VERDICT_TEXT`
headlines from `narrative.js:50`. The mode-axis text differs but the
typography (size, weight, colour via `v.color`) is identical across
modes. Out of typography scope strictly; noted because the headline
slot has two source-of-truth content tables.

### 5.13 Tier-coloured text crosses three saturation levels

When a text element renders in a severity tier colour, three different
hue-pairs are in play:
- Vivid (`SEV_VERDICT[s].color`) — VerdictBanner headline, severity
  badge, sticky echo, pill/chip text
- Dark (`SEV_VERDICT[s].text` / `SIGNAL.[hue].text`) — defined in
  tokens but not consumed on these surfaces as text colour
- Specific reds/golds — `UI.WARN.text` (#9a7010), `UI.INFO.text`
  (#2a4a6a), `FLAG_STYLES.MODERATE.text`, etc. used as text colour on
  warn / info banners

The relationship between these three saturation levels and which
applies in which context is not encoded in a shared rule.
