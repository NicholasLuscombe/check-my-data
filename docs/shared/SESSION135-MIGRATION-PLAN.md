# Session B — Typography migration plan

Read-only audit. Maps the post-S133h current state (per
`docs/shared/TYPOGRAPHY-INVENTORY.md`) onto the locked target spec (per
`docs/shared/TYPOGRAPHY-SYSTEM.md`) and surfaces the work required for
Phase B (token consolidation) and Phase C (surface migration). No code
changes in this dispatch; output is this document only.

Ground truth: TYPOGRAPHY-INVENTORY.md for current values, TYPOGRAPHY-SYSTEM.md
for target. Where the two disagree, current values win and the discrepancy
is flagged inline.

Branch / HEAD: `claude/blissful-torvalds-5862cd` rooted on commit `5e77647`
(typography system spec — locked end of Session A).

Consumer counts below are produced by `grep -rn --include="*.js"
--include="*.jsx" "<token>" src/` from the worktree at audit time. Counts are
raw text matches (token usages, not unique render sites).

---

## Section 1 — Token reconciliation

For each typography-relevant token currently defined in `src/`, the table
below maps current → system target. Action codes:

- **KEEP** — token preserved as-is, role unchanged
- **UPDATE-VALUE** — token name preserved, value(s) change (re-point only;
  consumers don't move)
- **RENAME** — token re-keyed under new name (consumers re-point)
- **RETIRE** — token removed; consumers migrate to a different token
- **NEW** — defined by the system but not currently in `src/`

### 1.1 Font-family tokens (`FF.*`, [tokens.js:49](src/constants/tokens.js:49))

| Token | Current value | System role | Action | Notes |
|---|---|---|---|---|
| `FF.UI` | `system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif` | sans family — **all text** | **UPDATE-VALUE** | New value: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (Inter web font, weights 400/500/600/700, served via Google Fonts `<link>` in `index.html`) |
| `FF.MONO` | `'SF Mono','Cascadia Code',Menlo,Consolas,monospace` | mono family — **data values only** | **UPDATE-VALUE** | New value: `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace` (JetBrains Mono web font, weights 400/500) |
| `FF.PRINT` | `Calibri,sans-serif` | (none) | **RETIRE** | 1 consumer ([ReportView.jsx:514](src/components/views/ReportView.jsx:514), HTML-export summary table). System rule: two-face system. Re-point to `FF.UI` |
| `FF.SERIF` | `Georgia,'Times New Roman',serif` | (none) | **RETIRE** | 1 consumer ([Logo.jsx:9](src/components/shared/Logo.jsx:9)). Logo is product chrome; either retire to `FF.UI` or move logo styling out of typography tokens (one-off display face is not a typography-system concern) |

### 1.2 Font-weight tokens (`FW.*`, [tokens.js:55](src/constants/tokens.js:55))

System mandates **four** weights (400 / 500 / 600 / 700). Current has three
(`NORM` 400 / `SEMI` 600 / `BOLD` 700) — **500 (Medium) is missing**.

| Token | Current value | System role | Action | Notes |
|---|---|---|---|---|
| `FW.NORM` | `400` | Regular — body default (~90% of text) | **KEEP** | |
| (none) | — | Medium — tabs (inactive), buttons, table headers, tier word | **NEW** | Add `FW.MED: 500` |
| `FW.SEMI` | `600` | Semibold — section headings, sub-headings, tabs (active), filename, aside callout bullet leads | **KEEP** | |
| `FW.BOLD` | `700` | Bold — verdict headline only | **KEEP** | Role narrows from "headings, flagged values, emphasis, logo" to "verdict headline only" — large rebalance for Phase C surface migration |

### 1.3 HTML-card font-size tokens (`TF.*`, [tokens.js:70](src/constants/tokens.js:70))

System mandates a 6-step 1.25 scale anchored at 16px: `xs 13` / `sm 14` /
`base 16` / `md 20` / `lg 25` / `xl 32`. Current scale is 6 sizes too (22 /
16 / 13 / 12 / 11 / 9) but at different values and with different role
mapping.

Naming-strategy decision required (surfaced for Session B kickoff): retain
`TF.*` keys with new values, or rename to `FS.*` lowercase keys matching the
spec's vocabulary (`xs / sm / base / md / lg / xl`). The plan below treats
this as a **rename**, since values, count, and roles all shift; preserving
the old `TF.HERO` name on a 32px slot is misleading. Old `TF.*` references
retire after Phase C migration completes.

| Current token | Current value | System target | Action | Notes |
|---|---|---|---|---|
| `TF.HERO` | `22px` | `xl = 32px` (verdict headline) | **RENAME + UPDATE-VALUE** | Verdict headline only — 2 raw refs ([VerdictBanner.jsx:58](src/components/views/VerdictBanner.jsx:58), [ReportView.jsx:545](src/components/views/ReportView.jsx:545) export-CSS) |
| `TF.TITLE` | `16px` | `md = 20px` (sub-headings, modal headers, test card titles) | **RENAME + UPDATE-VALUE** | 9 raw refs across [DeepLookModal.jsx](src/components/forensics/DeepLookModal.jsx) and elsewhere |
| (none) | — | `base = 16px` (body, identity rows, settings, tabs, buttons) | **NEW** | This is the reference register. Currently the body register is `TF.BODY = 13px` — base goes up by 3px |
| `TF.BODY` | `13px` | `xs = 13px` (fine print, deep footnotes, table body cells) | **RENAME, role-shift** | **111 raw refs** — highest blast radius. Currently used as the body register; under the system, body promotes to `base 16px` and `xs 13px` is fine-print. Most current `TF.BODY` consumers will re-point to `base` (16px), not `xs` (13px). Per-call-site decision required during Phase C |
| `TF.NOTE` | `12px` | (none) | **RETIRE** | Zero live rendering consumers (per inventory §5.3); 1 raw ref is a documentation comment at [VerdictBanner.jsx:166](src/components/views/VerdictBanner.jsx:166). System has no 12px slot |
| `TF.DETAIL` | `11px` | `xs = 13px` (table body cells) for table use; `sm = 14px` for footnotes / table headers; or other base level for general use | **RENAME, role-split** | **142 raw refs** — second-highest blast radius. Currently the all-purpose "small" register: data cells, footers, footnote, sub-heads, badges, captions. Under the system: table cells go to `xs 13px`, footnotes/captions go to `sm 14px` or `xs 13px` per row of register inventory, and the "fine print" register (currently `TF.DETAIL`) is `xs 13px`. Per-call-site decision required during Phase C |
| `TF.SMALL` | `9px` | (none) | **RETIRE** | **59 raw refs** — most are ALL CAPS labels and badges with `letter-spacing`. System retires ALL CAPS entirely (§ Case rules) and removes the 9px slot. All 59 consumers re-point to `xs 13px` (or are eliminated as ALL CAPS treatment retires) |
| (none) | — | `sm = 14px` (secondary text, captions, table headers, footnotes, aside callouts) | **NEW** | Currently filled by ImportView's `FS.T1 = 14px` (component-scoped) and the hardcoded `"14px"` literals at [Section.jsx:23](src/components/shared/Section.jsx:23) and [ReportView.jsx:723](src/components/views/ReportView.jsx:723). Promotes to canonical token |

### 1.4 Component-scoped scale (`FS.*` in `ImportView.jsx`, [ImportView.jsx:494](src/components/views/ImportView.jsx:494))

| Current token | Current value | System target | Action | Notes |
|---|---|---|---|---|
| `FS.T1` | `"14px"` | `sm = 14px` | **RETIRE** (move to canonical `sm` token) | 56 raw refs across ImportView. Per System.md "ImportView's component-scoped FS scale retires." |
| `FS.T2` | `"13px"` | `xs = 13px` (some) or `base = 16px` (some) | **RETIRE** (per-site decision) | Most `FS.T2` consumers serve "secondary reading" — under the system, this maps to `base` body for prose/labels and `xs` for fine print. Per-call-site decision required |
| `FS.T3` | `"11px"` | `sm = 14px` or `xs = 13px` | **RETIRE** (per-site decision) | The 11px tier vanishes from the scale. Closest replacements are `xs 13px` or `sm 14px`. Per-call-site decision required |

### 1.5 SVG-chart scale (`CF.*`, [tokens.js:60](src/constants/tokens.js:60))

| Token | Current value | System role | Action | Notes |
|---|---|---|---|---|
| `CF.TICK` / `CF.AXIS` / `CF.LABEL` / `CF.VALUE` / `CF.SMALL` / `CF.TINY` | 9–11 unitless | (out of system scope — "Plot / chart typography — separate system") | **KEEP** | System.md § *What this system does NOT cover* exempts plot/chart typography. ~20 consumer files in `src/components/plots/` and SVG helpers — untouched in this migration |

### 1.6 Section-header style (`SECTION_HEADER_TYPOGRAPHY`, [Section.jsx:22](src/components/shared/Section.jsx:22))

| Property | Current | System target | Action |
|---|---|---|---|
| `fontSize` | `"14px"` (literal) | `lg = 25px` (section heading per inventory, sentence case) | **UPDATE-VALUE** + reference token |
| `color` | `C.TEXT_2` | `C.TEXT` (section heading row of register inventory) | **UPDATE-VALUE** |
| `textTransform` | `"uppercase"` | (sentence case) | **RETIRE** property |
| `letterSpacing` | `"0.12em"` | `0` | **RETIRE** property |
| `fontWeight` | `FW.SEMI` | `FW.SEMI` (Semibold) | **KEEP** |
| `whiteSpace` | `"nowrap"` | (no system rule) | **KEEP** |

After Phase B, this style helper either retires (callers compose
inline against canonical tokens) or stays as a thin alias mapping role →
tokens. Either way the hardcoded `"14px"` and `letterSpacing/uppercase`
values come out.

### 1.7 Style helpers in `styles.js` ([styles.js](src/components/shared/styles.js))

| Helper | Current typography | System target | Action |
|---|---|---|---|
| `SUB_HEAD` | `TF.DETAIL / FF.UI / FW.SEMI / C.TEXT_3` | "Sub-heading (test card title) — `md / Semibold / C.TEXT / sans`" — but only if SUB_HEAD is used as a sub-heading; usage is mostly card section labels (e.g. "Duplicated blocks of data") | **UPDATE-VALUE** (likely target: `sm / Medium / C.TEXT / sans` table-header-style) |
| `S_NOTE` | `TF.DETAIL / FF.UI / C.TEXT_4` | Footnote: `sm / Regular / C.TEXT_2` | **UPDATE-VALUE** + retire `C.TEXT_4` (see 1.10) |
| `S_TABLE` | `TF.DETAIL / FF.MONO` | Table cell: `xs / Regular / C.TEXT / mono` | **UPDATE-VALUE** (no live consumers — orphan; retire) |
| `TH_EVIDENCE` | `TF.DETAIL / FF.UI / FW.SEMI / C.TEXT_3` | Table header: `sm / Medium / C.TEXT / sans` | **UPDATE-VALUE** (size up 11→14px, weight 600→500, colour TEXT_3→TEXT) |
| `TD_EVIDENCE` | `TF.DETAIL / FF.MONO` | Table cell numeric: `xs / Regular / C.TEXT / mono` | (orphan — no live consumers; retire) |
| `TD_EVIDENCE_ID` | `TF.DETAIL / FF.UI` | (orphan; retire) | |
| `TD_NUM_CELL` | `TF.DETAIL / FF.MONO` | Table cell numeric: `xs / Regular / C.TEXT / mono` | **KEEP** at `xs` (=13px) — value already aligns once `xs` lands |
| `TD_ID_CELL` | `TF.DETAIL / FF.UI` | Table cell text: `xs / Regular / C.TEXT / mono` (system mandates mono on all data cells, including text values) | **UPDATE-VALUE** — flip `FF.UI` → `FF.MONO` for text data cells |
| `M` ([tokens.js:171](src/constants/tokens.js:171)) | `{fontFamily: FF.MONO}` | (mono family — narrowed to data-only) | **KEEP** but audit consumers — current `...M` consumers spread mono into many non-data places (e.g. `App.jsx:95` "v0.8" badge, `BatchView.jsx:271` Back button, `FlagBadge.jsx`). Many of these need to revert to sans under system rule "Mono register only on data" |

### 1.8 CardLayout inline definitions ([CardLayout.jsx](src/components/shared/CardLayout.jsx))

CardLayout defines several composite renderers (`CardBanner`, `CardHeadline`,
`CardDesc`, `CardFooter`, Implications/What-to-look-for collapse + bodies)
with inline typography. None are tokens per se — they are composed from
`TF.*` / `C.*` / `FW.*` — but they constitute **a sixth de facto definition
site** because the chosen tuples (`TF.DETAIL/FW.SEMI/C.TEXT_4` for the
"Primary finding:" prefix, `TF.DETAIL/C.TEXT_4` for `CardFooter`, etc.) are
authored ad-hoc rather than referencing role names.

Action: rebuild CardLayout under the system in Phase C — every renderer
maps to one row of the register inventory.

### 1.9 Severity-text colours (`SEV_VERDICT[s].text`, [tokens.js:147](src/constants/tokens.js:147))

System: "Single saturation level — retire `.text` secondary saturation per
inventory finding."

| Token | Current value | System target | Action |
|---|---|---|---|
| `SEV_VERDICT[0].text` | `#166534` | (retire) | **RETIRE** |
| `SEV_VERDICT[1].text` | `#4D7C0F` | (retire) | **RETIRE** |
| `SEV_VERDICT[2].text` | `#C2410C` | (retire) | **RETIRE** |
| `SEV_VERDICT[3].text` | `#991B1B` | (retire) | **RETIRE** |

Live consumers as `text colour`: 3 sites (full list in §4):
- [FindingPill.jsx:71](src/components/forensics/FindingPill.jsx:71) `color: sev.text`
- [FindingChip.jsx:114](src/components/forensics/FindingChip.jsx:114) `color: sev.text`
- [FindingChip.jsx:123](src/components/forensics/FindingChip.jsx:123) `color: sev.text` on `[N]` prefix

These re-point to `sev.color` (the vivid hue) under the system's single-
saturation rule.

Indirect consumers via `SIGNAL.{RED,GREEN,AMBER}.text` (which back tier 0
and tier 3 of `SEV_VERDICT.text`): the `SIGNAL.*.text` tokens themselves
remain in tokens.js but lose this consumer chain. Audit needed for whether
`SIGNAL.RED.text` retains live consumers (preliminary check: 1 consumer at
[ErrorBoundary.jsx:25](src/components/shared/ErrorBoundary.jsx:25); spot-
check if any others survive).

### 1.10 Text-colour tokens (`C.TEXT*`, [tokens.js:4](src/constants/tokens.js:4))

System mandates **three-tier hierarchy** with updated hex values:

| Token | Current hex | System hex | Action |
|---|---|---|---|
| `C.TEXT` | `#1E293B` | `#1F1F1F` | **UPDATE-VALUE** |
| `C.TEXT_2` | `#475569` | `#525252` | **UPDATE-VALUE** |
| `C.TEXT_3` | `#64748B` | `#737373` | **UPDATE-VALUE** |
| `C.TEXT_4` | `#94A3B8` | (none — "too pale to earn a level") | **RETIRE** |

`C.TEXT_4` retirement blast radius: **152 raw refs** — see §4.

### 1.11 Aside callout pattern (NEW)

System defines a new chrome pattern (§ Aside callout pattern) with three
semantic sub-types: frame-setting (neutral grey), trust/info (light blue),
status/warning (light amber). No corresponding token group exists today.

| New token | Suggested name | Value | Notes |
|---|---|---|---|
| Frame-setting bg | `ASIDE.FRAME.bg` | `#F5F5F5` | New |
| Frame-setting rule | `ASIDE.FRAME.rule` | `C.TEXT_3` | New (already a token, re-purposed) |
| Trust/info bg | `ASIDE.INFO.bg` | `#EFF6FF` (= existing `UI.INFO.bg` = `ACCENT.BLUE.bg`) | New token slot, may resolve to existing |
| Trust/info rule | `ASIDE.INFO.rule` | `#2563EB` | New (not currently in `ACCENT.BLUE` palette — `ACCENT.BLUE.color` is `#3B82F6`, slightly different) |
| Status/warning bg | `ASIDE.WARN.bg` | `#FEF3C7` | New (not currently in `ACCENT.GOLD.bg` which is `#FFFBEB`) |
| Status/warning rule | `ASIDE.WARN.rule` | `#CA8A04` | New (not currently in `ACCENT.GOLD.color` which is `#D97706`) |
| Padding | `ASIDE.PAD` | `"14px 18px"` | New layout token (or inline) |
| Border-radius | `ASIDE.RAD` | `"0 4px 4px 0"` | New layout token (or inline) |
| Rule width | `ASIDE.RULE_W` | `"3px"` | New |

Decision (resolved S136 kickoff): aside-callout values live as sub-keys
under `UI.{WARN,INFO,OK}` — `UI.WARN.callout = {bg, rule}` etc. — plus a
new `UI.FRAME.callout` for the neutral-grey frame-setting variant. Sub-key
shape preferred over flat-key replacement: existing `UI.WARN.bg` / `.rule`
values differ from the aside-callout values in the table above, so flat
updates would shift unrelated chip / box consumers. Sub-keys gate the
diff to aside callouts only. Phase C decides whether to consolidate.
Typography tokens stay type-only; no `ASIDE` namespace.

### 1.12 Other tokens noted in inventory §1.10–§1.12

| Token | Current value | Action | Notes |
|---|---|---|---|
| `SIGNAL.RED.text` | `#991B1B` | **KEEP** (audit consumers) | Used as flagged-cell text colour in tables and ErrorBoundary; system retires `SEV_VERDICT[s].text` but `SIGNAL.*.text` is a separate, more general slot that may retain non-tier consumers |
| `SIGNAL.AMBER.text` / `SIGNAL.GREEN.text` | as defined | **KEEP** (audit) | Inventory §5.3: no live consumers on the eight surveyed surfaces. Re-confirm wider sweep before retiring |
| `ACCENT.BLUE.color` / `.text` | as defined | **KEEP** | Used for "Copy prompt" button bg + reportLink chip + `UI.INFO` |
| `ACCENT.GOLD.text` | `#9a7010` | **KEEP** | UI.WARN box text — may need re-evaluation under system aside-callout pattern (which calls for `#CA8A04`) |
| `ACCENT.TEAL.text` | `#0F766E` | **KEEP** | AUTO badge text — but AUTO badge ALL CAPS treatment retires; badge becomes sentence case `sm Medium` |
| `BADGE.AUTO.text` | resolves to `ACCENT.TEAL.text` | **KEEP** | |
| `FLAG_STYLES.{HIGH,MOD,LOW}.text` | (in [thresholds.js](src/constants/thresholds.js)) | **AUDIT** | Used in ImportView err box and `FLAG_STYLES.MODERATE.text` for the `assayPlausibilityHint` warn body. Decide whether to consolidate with `SEV_VERDICT` (system mandates single saturation level) |
| `HEADLINE_COLOR[flag]` | (in [thresholds.js](src/constants/thresholds.js)) | **RETIRE** likely | Drives `CardHeadline` colour per flag. Under system, the headline saturation pattern collapses: cards under tier saturation become signal-coloured uniformly via `SEV_VERDICT[s].color`. Confirm during Phase C |
| `MECH_COLOR.*` | as defined | **KEEP** | "Mechanism colours — chip stripes only, no text usage (per existing pattern)." Currently consumed as text colour on count-strip numerals ([VerdictBanner.jsx:107](src/components/views/VerdictBanner.jsx:107)) — system explicitly preserves chip-stripe role; verdict-banner text use may need revisit. Surface in §4 risk |

### 1.13 Global CSS in `index.html` ([index.html:7](index.html:7))

| Selector | Current rules | Action | Notes |
|---|---|---|---|
| `th, td` | `font-size: 11px; text-align: center` | **RETIRE** | Replaces with component-level table tokens; retiring this requires every `<th>`/`<td>` in `src/` to inline its own size (most do via `TH_EVIDENCE` / `TD_*` — unscoped fall-throughs are the risk) |
| `th` | `font-family: system-ui...` | **RETIRE** | Per system rule "table rendering goes through component-level tokens"; sans-on-th is now part of `TH_EVIDENCE` |
| `td` | `font-family: 'SF Mono'...` | **RETIRE** | Per system "Mono register only on data"; mono-on-td is now part of `TD_NUM_CELL` / `TD_ID_CELL` (the latter currently uses `FF.UI` and **flips** to `FF.MONO` per system rule, see §1.7) |

### 1.14 Discrepancies surfaced (inventory ↔ system)

- **`FF.UI` family value disagreement:** inventory says
  `system-ui,-apple-system,...,sans-serif`. System says `Inter` web font with
  `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  fallback. Both refer to the same token slot; the system spec describes the
  **target** value, not the current. Treated as `UPDATE-VALUE` above.
- **`C.TEXT*` hex disagreement:** inventory shows current slate-800/600/500
  values; system shows updated `#1F1F1F / #525252 / #737373`. Same token
  slot; values differ. Treated as `UPDATE-VALUE` above.
- **`SEV_VERDICT[s].text` consumers:** inventory §5.7 says these are "not
  used as text colour on these surfaces" — but `FindingPill.jsx:71` /
  `FindingChip.jsx:114, 123` set `color: sev.text` (where `sev = SEV_VERDICT[s]`).
  The pill/chip code reads `sev.text` (the dark-ink readable variant), so
  inventory §5.7's claim is incorrect. The corrected fact: `SEV_VERDICT[s].text`
  has 3 live consumers, all in pills/chips. Phase C surface migration must
  re-point these to `sev.color`.

---

## Section 2 — Definition-site consolidation plan

System rule (§ Composition rules #6): "Five token definition sites collapse
to one. All typography tokens live in `src/constants/tokens.js`."

Current sites:

### 2.1 `src/constants/tokens.js` — primary

What's defined: `FF.*` / `FW.*` / `TF.*` / `CF.*` / `C.*` / `SEV_VERDICT` /
`MECH_COLOR` / `UI` / `BADGE` / `M`.

Status: **canonical**. Phase B mutations land here.

Migration: see Section 1. Net change after Phase B:
- `FF` mutated (UI / MONO new values, `PRINT` / `SERIF` retire)
- `FW` adds `MED`
- New 6-step size scale lands (likely as a new `FS` namespace; old `TF` keys
  remain referencing the new `FS` keys for back-compat through Phase C, then
  retire)
- `C` mutated (`TEXT*` updated hex, `TEXT_4` retires at end of C)
- `SEV_VERDICT[s].text` retires
- New `M` shorthand audit (mono family scope narrows to data-only)

### 2.2 `src/components/views/ImportView.jsx` — `FS` scale ([ImportView.jsx:494](src/components/views/ImportView.jsx:494))

What's defined: `FS = { T1:14px, T2:13px, T3:11px }`, plus inline `fieldLabel`
and `zoneHeader` style objects (lines 497, 501).

Migration:
- `FS` object **retires entirely**. 56 raw refs in `ImportView.jsx`
  re-point to canonical `xs / sm / base` tokens during Phase C — per-call-
  site decision (T1 → `sm`, T2 → `base` or `xs` depending on role,
  T3 → `xs` or `sm`).
- `fieldLabel` style: ALL CAPS + `0.08em` letter-spacing retires;
  `FW.NORM` → `FW.MED` likely (under "Table header semantic" register
  pattern — table headers are sentence-case Medium); becomes a thin role
  mapping or inline-on-call-site against system tokens.
- `zoneHeader` style: ALL CAPS + `0.12em` retires; promotes to canonical
  `lg Semibold C.TEXT sentence-case` matching system "Section heading"
  register. Note: zone headers and §-section dividers will look identical
  under the system (both are 25px Semibold `C.TEXT`); current visual
  distinction (zone headers in import view vs. §-section dividers in report
  view) needs a deliberate decision — same register? subtler? — surfaced
  in §4.

### 2.3 `src/components/shared/Section.jsx` — `SECTION_HEADER_TYPOGRAPHY` + hardcoded "14px" ([Section.jsx:22](src/components/shared/Section.jsx:22))

Migration:
- Hardcoded `fontSize: "14px"` replaces with the canonical `lg = 25px`
  reference (per System.md "Section.jsx hardcoded '14px' replaces with
  `--fs-sm`" — note: spec says `--fs-sm`, but system register inventory
  puts section heading at `lg = 25px`; this is an internal disagreement in
  System.md and the register inventory wins. **Surfaced as a discrepancy**:
  System.md § Type scale says "Section.jsx hardcoded '14px' replaces with
  `--fs-sm`" (= 14px), but System.md § Register inventory says "Section
  heading | lg | Semibold | C.TEXT | sans" (= 25px). Recommendation: defer
  to register inventory — section headings at `lg`. Confirm at Phase B
  kickoff.)
- `textTransform: "uppercase"` retires
- `letterSpacing: "0.12em"` retires
- `color: C.TEXT_2` updates to `C.TEXT`
- `fontWeight: FW.SEMI` keeps
- Whether `SECTION_HEADER_TYPOGRAPHY` survives as a named export: yes,
  retain it, but as a thin alias mapping role → system tokens. Otherwise
  the lane-label drift problem (the export's documented purpose) re-emerges.

### 2.4 `src/components/shared/styles.js` — multiple inline definitions ([styles.js](src/components/shared/styles.js))

Defined: `SUB_HEAD`, `S_NOTE`, `S_TABLE`, `TH_EVIDENCE`, `TD_EVIDENCE`,
`TD_EVIDENCE_ID`, `TD_NUM_CELL`, `TD_ID_CELL`.

Migration:
- These are not raw token definitions — they are role-mapped composites
  built from `TF.*` / `FF.*` / `FW.*` / `C.*`.
- Per-helper actions in §1.7 above. Net effect: the 8 helpers compress to
  ~3 active roles (`TH_EVIDENCE` table-header, `TD_NUM_CELL` numeric data
  cell, `TD_ID_CELL` text data cell) plus `SUB_HEAD` / `S_NOTE`. Orphan
  helpers (`S_TABLE`, `TD_EVIDENCE`, `TD_EVIDENCE_ID`) retire — already
  unused per consumer count.
- `BANNER_STYLES` + `COL_W` + `FREEZE_*` are layout / non-typography —
  out of scope.

### 2.5 `index.html` — global `<th>` / `<td>` CSS ([index.html:7](index.html:7))

Migration:
- Block retires. Replace with Inter + JetBrains Mono `<link>` tags
  importing the web fonts.
- Risk: any `<th>` / `<td>` in `src/` that didn't inline a `fontSize` will
  visually shift. Most live cells inline via `TH_EVIDENCE` / `TD_*` style
  helpers. Spot-check needed during Phase C verification.

### 2.6 `src/components/shared/CardLayout.jsx` — sixth de facto site

Not in dispatch's listed 5, but per §1.8 above this is effectively a
definition site through composite renderers (`CardHeadline`, `CardDesc`,
`CardFooter`, `CardBanner`, Implications/What-to-look-for collapse + body).

Migration: rebuild against the system register inventory in Phase C.
Strict mapping — every renderer maps to one row of register inventory.

### 2.7 Net result after Phase B

`tokens.js` is the single source of truth. ImportView's `FS`, Section.jsx's
hardcoded literal, index.html's global CSS — all gone. styles.js becomes
role-mapping composites (all properties reference `tokens.js`). CardLayout
inline composites either rebuild to role-mapped or move into a
`cardStyles.js` shared helper that mirrors styles.js's pattern.

---

## Section 3 — Surface migration scope

Per surface, register count current → target, file count, complexity. The
register count is "distinct (size, weight, colour, family) tuples" per
inventory §3 / system § Register inventory.

| Surface | Current registers (approx) | System target registers | Files touched in `src/` | Complexity |
|---|---|---|---|---|
| **ImportView** | ~15 distinct (file-bar, zone headers, dropdowns, AUTO/SET ME/REQUIRED badges, Row-Sem / VST gate cards, hints) | ~6 active (verdict-equivalent off; sub-heading, body, identity, table-header, footnote, fine print) | 1 file: [ImportView.jsx](src/components/views/ImportView.jsx) | **Large** — heaviest single surface. ALL CAPS retire on zone headers, `fieldLabel`, AUTO/SET ME/REQUIRED badges; `FS.T1/T2/T3` retire entirely (56 refs); 2 hardcoded literals (`13px`, `12px`) retire. Privacy block ("Your data never leaves your computer") is the canonical aside-callout candidate (system §). Auto-cleaned hint, drop-zone hint, "Set by measurement type" lock note all use `C.TEXT_4` → re-point to `C.TEXT_3` (per `C.TEXT_4` retirement) |
| **VerdictBanner (§1)** | ~6 distinct (headline, action sub, count-strip outer/numeral/separator, false-positive context, identity-row, settings, reference-convention note) | ~4 (verdict headline `xl Bold tier`, verdict sub `base Regular C.TEXT_2`, identity row label `base Regular C.TEXT_3`, identity row value `base Regular C.TEXT`) | 1 file: [VerdictBanner.jsx](src/components/views/VerdictBanner.jsx) | **Medium** — canonical paired-fact identity row pattern lands here (left + right columns). Headline 22→32px is a major visual shift. Count-strip numerals coloured by `MECH_COLOR.*` — system says mechanism colours are chip-stripes only, no text use; this VerdictBanner consumer needs design call. False-positive context at 9px → retires (no 9px slot under system); promotes to `xs` or `sm` |
| **§2 StickySurface + FindingPill + FindingChip** | ~5 distinct (severity echo, lane label, pill text, chip text, chip prefix) | ~3 (sub-heading-equivalent for lane label, body for severity-echo, fine-print for pill/chip) | 4 files: [Section.jsx](src/components/shared/Section.jsx), [StickySurface.jsx](src/components/forensics/StickySurface.jsx), [FindingPill.jsx](src/components/forensics/FindingPill.jsx), [FindingChip.jsx](src/components/forensics/FindingChip.jsx) | **Medium** — `sev.text` retires across 3 sites (FindingPill, FindingChip 2x); LOW-only chip currently uses `C.TEXT_2` → likely promotes to `C.TEXT` under simplified hierarchy. Lane label register currently shares family/weight with section header; new system makes them distinct (lane label is `md` sub-heading, section header is `lg`) |
| **§3 ForensicsCategoryBlock + TestCardLayout + MiniCards** | ~12 distinct across the dimension wrapper, test-card outer, and ~24 mini-card variants | ~6 (sub-heading, body, table-header, table-cell numeric/text, footnote, fine-print) | 1 (Section.jsx) + 1 (ForensicsCategoryBlock) + 1 (TestCardLayout) + 1 (CardLayout) + ~24 mini-card files in [src/components/cards/](src/components/cards) + [EvidenceTable.jsx](src/components/shared/EvidenceTable.jsx) + [ExcerptTable.jsx](src/components/forensics/ExcerptTable.jsx) + [HotspotCard.jsx](src/components/views/HotspotCard.jsx) + [HotspotTable.jsx](src/components/views/HotspotTable.jsx) + [HotspotExcerptList.jsx](src/components/views/HotspotExcerptList.jsx) + 8 plot files using `TF.*` for axes/legends. **~35 files** | **Large** — the largest surface by file count and the biggest test of the simplification. Every mini-card has its own evidence-rendering nuances; CardLayout's `CardHeadline` "Primary finding:" prefix retires (ALL CAPS + `letterSpacing`). 24 mini-cards re-verify against system pattern individually. Plot files in `src/components/plots/` use `TF.*` (not `CF.*`) for some labels — these need attention since plot typography is exempted but `TF.*` references aren't |
| **§4 Investigate further (AI prompt panel)** | ~4 distinct (severity-0 placeholder, prompt instruction, prompt body, "Copy prompt" button) | ~3 (body for instruction, fine print/`xs` for prompt body, button register) | 1 file: [ReportView.jsx:1202–1219](src/components/views/ReportView.jsx) | **Small** — clean surface; main fix is the `fontFamily:"monospace"` literal at [ReportView.jsx:1211](src/components/views/ReportView.jsx:1211) → `FF.MONO` token reference. Also flag: prompt body should be `JetBrains Mono` `xs` per system. The "Copy prompt" button is canonical button register |
| **§5 Methodology** | ~5 distinct (test-count line, disclaimer, battery toggle, battery body, references body) | ~3 (body, footnote/fine-print, button-equivalent for toggles); plus the **screening-aid disclaimer goes into a trust-aside callout** per System.md § Implementation notes | 1 file: [ReportView.jsx:1221–1256](src/components/views/ReportView.jsx) | **Small–Medium** — disclaimer becomes the first canonical aside-callout instance. Battery body and references body all consolidate to `xs` or `sm`. Toggles' `<strong>` per-category becomes `Semibold` weight |
| **DeepLookModal** | ~5 distinct (modal title, ✕ close, focused-region context, lane labels, pills/chips re-used) | ~3 (modal title `md Semibold C.TEXT`, sub `sm Regular C.TEXT_2` for region context, lane labels via shared StickySurface helper) | 1 file: [DeepLookModal.jsx](src/components/forensics/DeepLookModal.jsx) + reuses 4 from §2 + [MinimapStrip.jsx](src/components/forensics/MinimapStrip.jsx) + [ExcerptTable.jsx](src/components/forensics/ExcerptTable.jsx) | **Medium** — modal title 16→20px (`TF.TITLE` → `md`); MinimapStrip uses chart `CF.*` so out of scope; ExcerptTable uses `TH_EVIDENCE`/`TD_*` so already styled via styles.js helpers — migrates with §3 |
| **Page chrome** (file bar, mode tabs, ⋯ Actions, Section dividers, advisory) | ~7 distinct (Back button, filename, Change-file, mode tab active/inactive, Actions trigger, Actions menu items, advisory body) | ~4 (button, tab active/inactive, body, footnote) | 1 file: [ReportView.jsx](src/components/views/ReportView.jsx) (lines 720–776) + [Section.jsx](src/components/shared/Section.jsx) for dividers | **Medium** — mode-tab `0.02em` letter-spacing retires; mode-tab inactive currently `FW.NORM` → system says `FW.MED`; filename hardcoded `"14px"` literal retires (also at [ImportView.jsx:552](src/components/views/ImportView.jsx:552) where `FS.T1`); advisory `⚠ COLUMN STRUCTURE NOTE` label is the most opinionated current chrome (FW.BOLD + ALL CAPS + 0.06em + mono via `…M`) — retires to sentence case Medium sans, becomes an aside-callout-warn |

**Total file count for Phase C migration:** approximately **40–45 source
files** in `src/`, dominated by the §3 surface (~35) and the rest spread
over the chrome surfaces. Includes 24 mini-cards in `src/components/cards/`
which all consume `TF.*` and shared helpers indirectly.

Out of Phase C scope (per system § What this system does NOT cover):
- All files in [src/components/plots/](src/components/plots/) (chart
  typography uses `CF.*` and is exempt) — but spot-check for `TF.*`
  references that should also be `CF.*`.
- [HeatmapView.jsx](src/components/views/HeatmapView.jsx) (chart-style
  matrix; uses `TF.*` for column headers — needs decision: is the column-
  index header `xs Medium C.TEXT mono` per system table inventory, or is it
  chart typography exempt?)
- HTML report export ([ReportView.jsx:514](src/components/views/ReportView.jsx:514)
  uses `FF.PRINT`) — separate output channel, may or may not need migration
  alongside chrome.

---

## Section 4 — Risk assessment

### 4.1 Tokens with high consumer count (large blast radius)

| Token | Refs | Risk | Mitigation |
|---|---|---|---|
| `TF.BODY` | 111 | Currently the body register (13px). Under system, body promotes to `base = 16px` — every `TF.BODY` consumer either becomes 16px (correct, per role) or 13px (`xs`, retains current size). Per-call-site judgement required for every one of 111 sites | Phase C surface migration: enumerate every `TF.BODY` ref against the register inventory; the call site's role determines the new size |
| `TF.DETAIL` | 142 | All-purpose "small" register (11px). Splits into `xs` (13px, table cells / fine print), `sm` (14px, table headers / footnotes / aside callouts), or other. Per-call-site decision required for all 142 | Per-call-site classification during Phase C |
| `C.TEXT_4` | 152 | `C.TEXT_4` retires entirely. All 152 consumers re-point to `C.TEXT_3` (next tier up) or another non-text token | Phase B value-update can co-opt `C.TEXT_4` to alias `C.TEXT_3` as a transitional step (fold values), then remove the alias after consumer sweep in Phase C |
| `TF.SMALL` | 59 | All consumers are ALL CAPS labels/badges with letter-spacing. ALL CAPS retires entirely under system. All 59 either re-point to `xs` (13px) sentence-case, or get visually rebuilt as part of the badge / label redesign | Sentence-case + Medium-weight pattern replaces ALL-CAPS-Bold; badges (AUTO, SET ME, REQUIRED) need design pass |
| `FS.T1/T2/T3` | 56 (ImportView only) | Per-call-site decision; co-located in one file | Single-file migration in Phase C; manageable |

### 4.2 Surfaces using hardcoded inline styles (refactor before tokens help)

Hardcoded `fontSize: "Npx"` literals in active rendering (a `grep -rn
"fontSize: *['\"][0-9]\+px['\"]"` sweep):

| File:line | Literal | Notes |
|---|---|---|
| [ImportView.jsx:539](src/components/views/ImportView.jsx:539) | `"13px"` | Privacy headline |
| [ImportView.jsx:540](src/components/views/ImportView.jsx:540) | `"12px"` | Privacy body — equals `TF.NOTE` (which has no other consumer) |
| [ReportView.jsx:723](src/components/views/ReportView.jsx:723) | `"14px"` | Filename |
| [Section.jsx:23](src/components/shared/Section.jsx:23) | `"14px"` | `SECTION_HEADER_TYPOGRAPHY` |
| [ForensicsCategoryBlock.jsx:109](src/components/forensics/ForensicsCategoryBlock.jsx:109) | `"15px"` | ⚠/✓ severity icon |
| [ForensicsCategoryBlock.jsx:119](src/components/forensics/ForensicsCategoryBlock.jsx:119) | `"14px"` | Category-block expand chevron |
| [CategoryRow.jsx:60](src/components/shared/CategoryRow.jsx:60) | `"15px"` | ⚠/✓ icon (sister to ForensicsCategoryBlock) |
| [CategoryRow.jsx:64](src/components/shared/CategoryRow.jsx:64) | `"14px"` | Expand chevron |
| [HeatmapView.jsx:474](src/components/views/HeatmapView.jsx:474) | `"10px"` | Column letter (chart-typography candidate — exempted? confirm) |
| [HeatmapView.jsx:475](src/components/views/HeatmapView.jsx:475) | `"7px"` | Em-dash placeholder |
| [HeatmapView.jsx:502](src/components/views/HeatmapView.jsx:502) | `"10px"` | Letter |
| [HeatmapView.jsx:503](src/components/views/HeatmapView.jsx:503) | `"8px"` | Column label |
| [HeatmapView.jsx:541](src/components/views/HeatmapView.jsx:541) | `"8px"` | Disabled cell text |
| [TestHeatmapFacets.jsx:102](src/components/views/TestHeatmapFacets.jsx:102) | `"16px"` | ✓ glyph |
| [FlagBadge.jsx:9](src/components/shared/FlagBadge.jsx:9) | `"10px"` | ⚠ glyph |
| [ErrorBoundary.jsx:24](src/components/shared/ErrorBoundary.jsx:24) | `"20px"` | ⚠ glyph |
| [ReportView.jsx:1096, 1100, 1104](src/components/views/ReportView.jsx:1096) | `"13px"` × 3 | ⚠/✓ glyphs in advisory |

System rule: "No hardcoded pixel literals." All retire. But: the icon-glyph
sizes (15px, 10px, 7px, 8px, 16px, 20px) don't sit on the standard 6-step
scale. Decision required: are icon glyph sizes part of the typography
system or a separate icon-sizing system? Recommend **separate system** —
icons aren't text and shouldn't share the type scale. Surface in §5.

### 4.3 Patterns that resist clean migration

- **`...M` mono-spread on non-data text.** `M = {fontFamily: FF.MONO}` is
  spread inline at [App.jsx:95–114](src/App.jsx:95) (version badge), [BatchView.jsx:271, 306, 327, 333](src/components/views/BatchView.jsx:271)
  (Back button, CTA, filename, Copy button), [FlagBadge.jsx:7](src/components/shared/FlagBadge.jsx:7),
  [DensityStrip.jsx:90, 91, 138, 145, 149](src/components/views/DensityStrip.jsx:90),
  and many others. System rule "Mono register only on data" mandates these
  revert to sans. Mid-blast-radius refactor (~20+ sites).
- **Tier-coloured text in 5 contexts.** Inventory §5.7 lists VerdictBanner
  headline, severity badge, sticky echo, pills + chips. System keeps tier
  colour on tier-signalling text (the headline + tier word) but retires the
  `.text` saturation. Pills/chips currently at `sev.text` (dark variant)
  need to re-point — but visually, `sev.color` (vivid hue) on a tinted
  background reads differently. **May trigger a contrast / readability
  check** during Phase C verification.
- **Mode tabs case + tracking.** Sentence case + `0.02em` letter-spacing
  is currently distinct from all other sentence-case text. System says
  letter-spacing retires entirely. Mode tabs become plain sentence-case at
  `base Medium/Semibold`. No information loss but the tabs lose their
  current visual signature; design check during Phase C.
- **Zone headers ↔ section dividers.** Currently both at 14px / uppercase /
  0.12em / FW.SEMI / `C.TEXT_2` (visually identical). Under system both
  promote to `lg = 25px / Semibold / C.TEXT / sentence-case`. The two
  surfaces (ImportView zones vs. ReportView §-numbered sections) lose
  their identical-treatment relationship by virtue of sentence-casing —
  but become register-identical. Acceptable; surfaced for awareness.
- **AUTO / SET ME / REQUIRED badges.** Currently 9px / 11px ALL CAPS /
  Bold / letter-spacing. System retires ALL CAPS. Badges become sentence
  case — but "Auto" / "Set me" / "Required" lose their current visual
  weight against surrounding text. Likely needs a chip / pill background
  treatment to retain provenance signalling. **Design call during Phase C.**
- **`⚠ COLUMN STRUCTURE NOTE` advisory.** Currently 11px / `FW.BOLD` /
  ALL CAPS / mono / 0.06em. Most-stylised piece of chrome under current
  system. Per system, advisory bodies become aside-callouts (warn-amber).
  Whole surface rebuilds, not just typography re-pointing.

### 4.4 Tier-coloured text consumers (system retires `SEV_VERDICT[s].text`)

Live consumers of `sev.text` / `SEV_VERDICT[s].text` as a text colour:

| File:line | Element | Re-point to |
|---|---|---|
| [FindingPill.jsx:71](src/components/forensics/FindingPill.jsx:71) | Pill text | `sev.color` |
| [FindingChip.jsx:114](src/components/forensics/FindingChip.jsx:114) | Chip text | `sev.color` |
| [FindingChip.jsx:123](src/components/forensics/FindingChip.jsx:123) | Chip `[N]` prefix (modal mode) | `sev.color` |

(Indirect: [FindingChip.jsx:55](src/components/forensics/FindingChip.jsx:55)
LOW-only chip uses `C.TEXT_2`, not `sev.text` — unaffected by retirement.)

`SIGNAL.{RED,AMBER,GREEN}.text` (which back tier 0 / tier 3 of
`SEV_VERDICT.text`) retain non-tier consumers and remain. Spot-check after
Phase B to confirm `SIGNAL.AMBER.text` and `SIGNAL.GREEN.text` are unused
in `src/` — if so, retire them with `SEV_VERDICT[s].text`.

### 4.5 Mode-axis SEVERITY_TEXT (out of typography scope but worth a note)

Inventory §5.12: `SEVERITY_TEXT` in `guidance.js:20–32` provides per-mode
verdict-banner headlines. Typography is identical across modes; the
divergence is content. No Phase B / C action — purely a content table.

---

## Section 5 — Phased implementation proposal

### Phase B — token consolidation (no surface changes)

**Goal:** `tokens.js` becomes the single source of truth. Surfaces don't
change visually until Phase C lands. Inevitably, some incidental visual
shifts will occur during Phase B if `TF.BODY` / `TF.DETAIL` values are
updated in place — strategy below avoids that.

**B.1 — Token additions to tokens.js (no consumer changes)**

1. Add web-font `<link>` tags to `index.html` for Inter (400/500/600/700)
   and JetBrains Mono (400/500).
2. Add `FW.MED: 500`. Doesn't break existing consumers.
3. Add new size scale alongside `TF.*` — likely as `FS.{xs, sm, base, md, lg, xl}` →
   `{13px, 14px, 16px, 20px, 25px, 32px}`. Uses lowercase keys to match
   System.md vocabulary (decision: confirm at kickoff vs. uppercase
   convention `TF.*` keys).
4. Add aside-callout values (decision: extend `UI.{WARN,OK,INFO}` with new
   bg/rule values, or add `ASIDE` namespace). Recommendation: extend `UI`.
5. New tokens are added but unused — system inventory rows don't bind to
   sources yet.

**B.2 — Token value updates (immediate visual impact unless gated)**

1. `FF.UI` value: from `system-ui,...,sans-serif` → `'Inter',
   -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
   **Affects all UI text immediately**; web font load adds a paint flicker
   risk. Visual verification required after this change lands.
2. `FF.MONO` value: from `'SF Mono',...,monospace` → `'JetBrains Mono',
   ui-monospace, 'SF Mono', Menlo, monospace`. Same caveat as `FF.UI`.
3. `C.TEXT*` hex values: `C.TEXT` `#1E293B` → `#1F1F1F`; `C.TEXT_2`
   `#475569` → `#525252`; `C.TEXT_3` `#64748B` → `#737373`. **Subtle but
   visible shift across every text colour in the app.**
4. `C.TEXT_4` is **not** retired in Phase B — a Phase B alias from
   `C.TEXT_4` → `C.TEXT_3` (i.e. `C.TEXT_4 = "#737373"`) keeps the build
   green but visually folds the tier. 152 consumers don't move; their
   colour just shifts. Phase C surface migration removes the reference
   token-by-token, then the alias retires.
5. Skip `TF.*` value updates in Phase B. Per-call-site role classification
   happens in Phase C; updating values in place would impose system sizing
   on consumers before role-classification, which is the wrong order.
   `TF.*` keys remain at current 22/16/13/12/11/9 px values through
   Phase B — surfaces look identical except for the family + colour shift
   above.

**B.3 — Token retirements (low-blast-radius first)**

1. `TF.NOTE` (12px): zero live consumers. Retire after re-pointing the
   one literal `"12px"` in [ImportView.jsx:540](src/components/views/ImportView.jsx:540)
   to `xs` (or `sm` per role decision). Ensures retirement.
2. `FF.PRINT` (1 consumer at HTML export): re-point to `FF.UI`. Retire.
3. `FF.SERIF` (1 consumer at logo): keep for now; logo styling is product
   chrome, not typography. Decision: keep `FF.SERIF` outside the
   typography token namespace, or retire and inline the logo's
   `fontFamily` literal. **Defer to Session B kickoff.**
4. `SEV_VERDICT[s].text` retirement: re-point 3 consumers to `sev.color`,
   then remove `.text` from each tier of `SEV_VERDICT`. Verify
   `SIGNAL.AMBER.text` and `SIGNAL.GREEN.text` have zero live consumers
   in `src/`; if so retire them too.

**B.4 — Definition-site consolidation**

1. **`Section.jsx`:** replace hardcoded `"14px"` with `FS.lg` (or whichever
   size token represents section heading post-decision). Remove
   `textTransform`, `letterSpacing`. Update `color: C.TEXT_2 → C.TEXT`.
   Visual: section headers grow from 14px ALL CAPS to 25px sentence case —
   **major visual impact**. Defer this change to **Phase C** to keep
   Phase B visually neutral except for the family + colour shift.
2. **`ImportView.jsx FS`:** retain `FS = { T1, T2, T3 }` through Phase B
   (referencing canonical `FS.{sm, xs, ...}` tokens internally). Retire
   the local `FS` declaration during Phase C surface migration.
   Alternatively: declare `FS.T1/T2/T3` as `FS.sm / FS.xs / FS.xs` (alias
   at definition) so Phase C call-site decisions can override per-site.
   Recommend: leave alone in Phase B; full retire in Phase C.
3. **`styles.js` helpers:** retire orphan exports (`S_TABLE`,
   `TD_EVIDENCE`, `TD_EVIDENCE_ID`) — zero consumers per consumer-count
   sweep. Active helpers (`SUB_HEAD`, `S_NOTE`, `TH_EVIDENCE`,
   `TD_NUM_CELL`, `TD_ID_CELL`, `BANNER_STYLES`) retain through Phase B
   with values referencing canonical tokens. Property-level updates
   (e.g. `TD_ID_CELL`'s `FF.UI` → `FF.MONO`) defer to Phase C to keep
   visual change gated to surface migration.
4. **`index.html`:** retire global `<th>/<td>` CSS only after spot-checking
   that no live `<th>/<td>` in `src/` relies on the global fall-through.
   Defer to Phase C end.

**B.5 — Output of Phase B**

`tokens.js` carries the new size scale, the new family values, the new
text-colour hex values, and the new weight token. Old `TF.*` keys remain
populated (for Phase C migration). `C.TEXT_4` still exists but aliases to
`C.TEXT_3`. Surfaces are visually identical in size/weight/case/treatment
but show subtler colours and the new family stack. No surface re-points
yet.

**Risk-managed verification gate:** after B.1–B.4 ship, run visual
verification on DS01 / DS02 / DS04 / DS21 fixtures. Expected change:
fonts render in Inter / JetBrains Mono, tier-text colour shifts from
`C.TEXT_4`-bearing elements (e.g. CardFooter, "… N more rows" overflow)
become slightly darker. Anything else is a regression.

### Phase C — surface migration

**Surface order: simplest dependencies first, heaviest last.**

| Step | Surface | Files | Why this order | Verification fixtures |
|---|---|---|---|---|
| **C.1** | Page chrome (file bar, mode tabs, ⋯ Actions, Section dividers, advisory) | [ReportView.jsx](src/components/views/ReportView.jsx) (lines 720–776), [Section.jsx](src/components/shared/Section.jsx) | Visible on every screen. Validates `lg` section heading, `base` button/tab register, advisory aside-callout pattern. Smallest file count (~2). Most dramatic change (section headers 14→25px sentence case) — best to land first to ground subsequent work | DS01 (clean), DS02 (severity 3) |
| **C.2** | VerdictBanner (§1) | [VerdictBanner.jsx](src/components/views/VerdictBanner.jsx) | Anchors the verdict-headline and identity-row register patterns. 1 file, ~10 elements. Headline 22→32px is dramatic; lands the canonical paired-fact pattern. **Actual S138 arc expanded scope across four fix-cycles — see SESSION138-SUMMARY.md for fix-cycle detail (settings restructure, count-strip retirement, two-column titling, column-title role addition).** | DS01, DS02, DS21 (severity 2) |
| **C.3** | §5 Methodology | [ReportView.jsx](src/components/views/ReportView.jsx) (lines 1221–1256) | Small surface. Lands the trust-aside-callout pattern (screening-aid disclaimer) | DS01, DS21 |
| **C.4** | §4 Investigate further | [ReportView.jsx](src/components/views/ReportView.jsx) (lines 1275–1295) | **S149-fix1: closed.** Folded into the S149 arc alongside the §2 StickySurface internal text retune. Intro paragraph (and severity-0 placeholder) lifted from `TF.BODY` to `FS.base`; intro colour from `C.TEXT_2` to `C.TEXT` for peer parity with the §5 count line. Prompt body retuned from `TF.DETAIL` + `"monospace"` string literal to `FS.sm` + `FF.MONO` token (JetBrains Mono); colour `C.TEXT_3` → `C.TEXT` to mirror §5 battery body. Copy prompt button held at `TF.BODY` (peer drift with other page-chrome secondary buttons; migrates en bloc when C.1 sweeps them). | DS02 |
| **C.5** | ImportView | [ImportView.jsx](src/components/views/ImportView.jsx) | Heaviest single-file surface (56 `FS.*` refs, 2 hardcoded literals, ~15 distinct registers). Lands aside-callout patterns at the privacy block. ALL CAPS retirement most visible here (zone headers, fieldLabel, AUTO/SET ME/REQUIRED badges). Self-contained — no shared helpers downstream depend on its decisions | DS01, DS04, DS21 (different file types) |
| **C.6 + C.7** | §2 StickySurface + FindingPill + FindingChip + DeepLookModal | [Section.jsx](src/components/shared/Section.jsx), [StickySurface.jsx](src/components/forensics/StickySurface.jsx), [FindingPill.jsx](src/components/forensics/FindingPill.jsx), [FindingChip.jsx](src/components/forensics/FindingChip.jsx), [DeepLookModal.jsx](src/components/forensics/DeepLookModal.jsx) | **S149: C.6 folded into C.7.** S149 audit (`docs/sessions/SESSION149-AUDIT-SUMMARY.md` §3) found the lane-label "reuse" was a duplicated literal, not a structural shared import — touching one file without the other would create drift. Combined session extracted `LANE_LABEL_TYPOGRAPHY` to Section.jsx (shared export), retired both local consts, retuned lane-label register to `FS.base` 16px Semibold, lifted modal title to `md` Semibold, retuned region context to `FS.sm Regular C.TEXT_2`, fixed parked #22 (FindingPill / FindingChip helper return key `text` → `color`). Remaining StickySurface-internal typography (severity-echo line) deferred to a later C.7 follow-on if needed. | DS02, DS04 |
| **C.8** | §3 Detailed test results | [ForensicsCategoryBlock.jsx](src/components/forensics/ForensicsCategoryBlock.jsx), [TestCardLayout.jsx](src/components/shared/TestCardLayout.jsx), [CardLayout.jsx](src/components/shared/CardLayout.jsx), 24 mini-cards in [src/components/cards/](src/components/cards/), [EvidenceTable.jsx](src/components/shared/EvidenceTable.jsx), [ExcerptTable.jsx](src/components/forensics/ExcerptTable.jsx), HotspotCard/Table/ExcerptList | Heaviest by file count. CardLayout's `CardHeadline` "Primary finding:" prefix retires (ALL CAPS + tracking). 24 mini-cards verify register-by-register against the system. Land last so the patterns are well-understood | DS02 (severity 3 — broadest §3 surface), DS04 (different fabrication shape) |
| **C.9** | Cleanup | tokens.js, styles.js, index.html | Retire `TF.*` keys (or leave as aliases; decision deferred), retire `C.TEXT_4` alias, retire orphan `S_TABLE / TD_EVIDENCE / TD_EVIDENCE_ID` exports if not done, retire global `<th>/<td>` CSS in index.html | DS01, DS02, DS04, DS21 (full anchor sweep) |

**Visual verification strategy:**

Per System.md: "Built fixture-by-fixture. DS01 (clean), DS02 (severity 3),
DS04 (different fabrication shape), DS21 (severity 2 dataset-wide-only) per
existing anchor fixture set."

Per-step strategy:
- Each step targets the named fixture(s) above.
- **Anchor screenshots** captured pre-migration on the worktree HEAD;
  post-migration screenshots compared. The system explicitly rebuilds many
  surfaces (sentence case across the board, 25px section headings, etc.) —
  pixel-diff is **not** the success criterion. Instead, success is: every
  text element on the surface maps 1-to-1 to a row of the system register
  inventory, with no orphans.
- For high-blast-radius steps (C.5 ImportView, C.8 §3) split the
  verification across 2 sessions: first session lands the typography
  changes against DS02; second session sweeps DS01 / DS04 / DS21 to catch
  edge cases (clean state, different fabrication shape, severity 2 dataset-
  wide-only).
- §3 (C.8) verification is per-mini-card. 24 mini-cards × ~2 fixtures each
  is a long-running pass; can split across multiple sessions.

**Out of scope for Phase C:**
- Plot / chart typography (separate system).
- HTML report export (`FF.PRINT` consumer at [ReportView.jsx:514](src/components/views/ReportView.jsx:514))
  — separate output channel; may migrate later or stay on `FF.UI`.
- HeatmapView column headers — chart-style matrix; decision deferred to
  whether plot exemption applies.
- Icon glyph sizes (15px, 10px, 8px, 7px) — separate icon-sizing system,
  not typography.

---

## Open decisions surfaced for Session B kickoff

1. **Naming strategy.** Rename `TF.*` → `FS.{xs,sm,base,md,lg,xl}` (matches
   System.md vocabulary), or retain `TF.*` keys with new values? Plan
   above assumes rename.
2. **Section.jsx hardcoded "14px" replacement.** System.md § Type scale
   says `--fs-sm` (= 14px); System.md § Register inventory says section
   heading is `lg` (= 25px). Internal disagreement in the spec. Plan above
   defers to register inventory (`lg`).
3. **`FF.SERIF` (logo only).** Retire from typography tokens or keep?
   Plan defers to kickoff.
4. **Aside-callout token home.** Extend `UI.{WARN,OK,INFO}` with new
   bg/rule values, or new `ASIDE` namespace? Plan recommends extending `UI`.
5. **Mechanism-coloured count-strip numerals at VerdictBanner.** System
   says mechanism colours are chip-stripes only; current code uses them as
   text colour at [VerdictBanner.jsx:107](src/components/views/VerdictBanner.jsx:107).
   Keep the exception, or migrate to a single text colour? Plan flags
   for design call.
6. **AUTO / SET ME / REQUIRED badges visual signature.** ALL CAPS retires;
   the badges lose visual differentiation against surrounding text.
   Likely needs background-tinted chip treatment to retain provenance
   signalling. Surface for design pass during C.5 ImportView.
7. **`HEADLINE_COLOR[flag]` retirement.** Drives `CardHeadline` colour per
   tier. Under system, do all card headlines share `C.TEXT`, or do
   tier-coloured headlines persist? Surface for design call during C.8.
