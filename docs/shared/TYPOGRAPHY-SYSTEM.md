# Typography System — Check My Data

System spec governing all chrome surfaces. Locked at end of Session A
(typography design pass). Implementation lands in Phase B (token consolidation)
and Phase C (surface migration).

This document is the authoritative reference. Code reads it at every
chrome-touching session. New chrome work cites the register it uses and why.
No "I picked something that looked right" decisions land without this doc
backing them.

## Voice profile

Authoritative, technical-leaning, serious-disciplined.

Audience: scientists, peer reviewers, journal editors making decisions about
research integrity. Voice respects expertise without dramatising. Style
references: Stripe Docs, Linear, Anthropic — technical products with
disciplined readability.

Avoids: Bloomberg Terminal density, Notion casualness, marketing flourish.

## Typefaces

Two-face system.

- **`FF.UI`** — Inter, served via web font.
  - Used for: all text content. Headlines, body prose, identity rows,
    settings, captions, tabs, buttons, table headers, footnotes — every word
    the engine writes.
  - Web font import: Google Fonts, weights 400/500/600/700.
  - Fallback stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

- **`FF.MONO`** — JetBrains Mono, served via web font.
  - Used for: data values only. Table body cells, p-values, identifiers, row
    indices (17, 23, 145), column letters (A, B, C), computed values, code
    references.
  - Web font import: Google Fonts, weights 400/500.
  - Fallback stack: `ui-monospace, "SF Mono", Menlo, monospace`.

Other family tokens (FF.PRINT, FF.SERIF) retire. Inventory shows ≤1 consumer
for each.

## Type scale

1.25 ratio, six sizes. Anchored at 16px base for comfortable long reading.

| Token   | Size | Role |
|---------|------|------|
| `xs`    | 13px | Fine print, deep footnotes, table body cells |
| `sm`    | 14px | Secondary text, captions, table headers, footnotes, aside callouts |
| `base`  | 16px | Body — reference register. Body prose, identity rows, settings, tabs, buttons |
| `md`    | 20px | Sub-headings within sections — test card titles, modal headers |
| `lg`    | 25px | Section headings — 1 · Summary, 2 · What was found, etc. |
| `xl`    | 32px | Verdict headline only |

Six sizes total. No others permitted. ImportView's component-scoped FS scale
retires. TF.NOTE (12px, zero consumers) retires. TF.HERO folds into xl.

Hardcoded pixel literals in any file retire — all sizes through tokens. The
hardcoded "14px" in Section.jsx replaces with `--fs-lg` (per register
inventory — section heading is `lg = 25px`).

## Weights

Four weights, semantic roles.

| Weight | Value | Role |
|--------|-------|------|
| Regular | 400 | Body default. ~90% of all text. |
| Medium | 500 | Tabs (inactive), buttons, table headers, tier word. |
| Semibold | 600 | Section headings, sub-headings, tabs (active), filename, aside callout bullet leads. |
| Bold | 700 | Verdict headline only — exception, used nowhere else. |

Italic axis: avoid in UI chrome. Permitted in body prose for technical
references (variable names, methodology references like "Bik standard").

## Text colours

Three-tier hierarchy. Single set across all families (sans + mono share these
colours; family conveys content type, colour conveys hierarchy — two clean
axes, no cross-talk).

| Token | Hex | Role |
|-------|-----|------|
| `C.TEXT` | `#1F1F1F` | Primary — body content, headings, signal text, table cells. |
| `C.TEXT_2` | `#525252` | Secondary — supporting content, sub-text, footnotes (evidence-bearing), inactive states. |
| `C.TEXT_3` | `#737373` | Tertiary — captions, identity row labels, fine print. |

Quaternary level (`C.TEXT_4`) retires — too pale to earn a level.

Plus three semantic colour groups (unchanged from current system):

- **Tier colours** (`SEV_VERDICT[s].color`) — green/amber/orange/red. Used
  only on tier-signalling text. Single saturation level — retire `.text`
  secondary saturation per inventory finding.
- **Interactive** — single brand colour for clickable text (links, action
  text). Defined separately, not part of text-colour hierarchy.
- **Mechanism colours** — chip stripes only, no text usage (per existing
  pattern).

## Case rules

Sentence case is the only product-generated case.

Applied to: section headings, verdict headlines, sub-headings, tab labels,
button labels, table headers, identity row labels, settings entries, footnotes,
aside callout content, prose paragraphs.

**ALL CAPS retires entirely.** Section headers (`1 · Summary`) at lg
Semibold sentence case. No letter-spacing. Five active letter-spacing values
in current system retire to zero.

Exceptions to sentence case:

- **Title Case / verbatim** preserved on proper nouns, branded names (Western Blot Densitometry), named methodologies (Bik standard), and verbatim user-supplied data (condition labels like Inhibitor_A, column headers).
- **ALL CAPS state tokens on blocking validation chips** preserved — SET ME, REQUIRED, and any future blocking-state vocabulary inside chip chrome. The case treatment carries semantic weight: ALL CAPS signals "the user must act to proceed." Passive provenance signals (Auto) stay sentence case. The carve-out is scoped narrowly to chip-rendered state tokens with blocking semantics; no other ALL-CAPS use is licensed.
- **Glyph prefixes** (#, ▶, ▼, ✓, ✗, 🔒, etc.) stay as content; the first alphabetic character is the case anchor. # Header rows is sentence case (the H is the anchor), ▶ Test battery details is sentence case (the T is the anchor).

## Line-heights

| Context | Value |
|---------|-------|
| Body prose, identity rows, settings, captions | 1.55 |
| Headings (xl, lg, md), section headings | 1.4 |
| Verdict headline | 1.3 |
| Tables (rows are short, dense) | 1.5 |

## Alignment rules

| Content type | Alignment |
|--------------|-----------|
| Body prose, identity rows, settings, footnotes, captions, headings (inline) | Left |
| Numeric table columns + their headers | Right (`text-align: right`, `font-variant-numeric: tabular-nums`) |
| Text table columns + their headers | Left |
| Page-level frame-setting notes (verdict bottom note) | Centre |
| Section dividers when functioning as hero markers between large blocks | Centre (existing pattern, e.g. `1 · Summary` above the verdict) |
| Verdict headline + dot row | Headline left, dots right within the same flex row |

ALL CAPS-with-tracking centring retires (no longer used).

## Composition rules

1. **Differentiation within a row uses weight + colour, not size.** A label-value
   pair uses the same size for both; weight or colour shift handles the
   differentiation.
2. **Inner spans inherit row register.** No span inside a row carries a
   different register than its parent unless it's carrying a distinct semantic
   role. Register inheritance enforced through the system, not patched
   per-surface.
3. **Mono register only on data.** Numbers in tables, identifiers, code,
   p-values, row indices, column letters. Never on prose.
4. **No more than two registers stacked vertically within one block.**
5. **No hardcoded pixel literals.** All sizes through tokens.
6. **Five token definition sites collapse to one.** All typography tokens
   live in `src/constants/tokens.js`. `Section.jsx`, `ImportView.jsx FS`,
   `styles.js` inline definitions, `index.html` `<th>`/`<td>` rules — all
   retire or reference back to tokens.js.

## Tables

| Element | Family | Size | Weight | Colour | Alignment |
|---------|--------|------|--------|--------|-----------|
| Header (semantic, e.g. "Digit", "Observed") | sans | sm | Medium | C.TEXT | matches column |
| Body cells (text values) | mono | xs | Regular | C.TEXT | left |
| Body cells (numeric values) | mono | xs | Regular | C.TEXT | right + `tabular-nums` |
| Row index column (excerpt tables) | mono | xs | Regular | C.TEXT_2 | centre, with light bg |
| Column index header (Excel-style A, B, C) | mono | xs | Medium | C.TEXT | right + `tabular-nums` |
| Footnote / reference under table | sans | sm | Regular | C.TEXT_2 | left |

**Table sizing rule:** tables size to content (`width: auto; max-width: 100%`).
When narrower than container, centre horizontally (`margin: 0 auto`). Don't
stretch to fill container width unnecessarily.

**Flagged row treatment:** light tier-coloured background on the entire row
(e.g. `#FEF2F2` for high tier); row-index cell darker tier background and
tier-coloured text at Medium weight.

## Identity row pattern (paired fact)

Used in: Verdict block body — identity rows + settings entries.

| Element | Family | Size | Weight | Colour |
|---------|--------|------|--------|--------|
| Label (e.g. "Measurement type:") | sans | base | Regular | C.TEXT_3 |
| Colon separator | (within label) | | | |
| Value (e.g. "Western Blot Densitometry") | sans | base | Regular | C.TEXT |

Same size, same weight. **Colour split** is the differentiation: label at
C.TEXT_3 (tertiary), value at C.TEXT (primary). Reads as quietly-organised
rhythm.

## Aside callout pattern

For meta-content: frame-setting notes, trust statements, status indicators.

**Structure:**
- Background: tinted panel
- Left rule: solid colour (3px width)
- Padding: 14px 18px
- Border-radius: 0 4px 4px 0 (square left edge)
- Size: sm
- Family: sans
- Weight: bullet leads Semibold + continuation Regular, both C.TEXT

**Three semantic sub-types:**

| Type | Background | Left rule | Use |
|------|------------|-----------|-----|
| Frame-setting | `#F5F5F5` neutral grey | C.TEXT_3 | Reading conventions, supplementary notes, help-block content |
| Trust / info | `#EFF6FF` light blue | `#2563EB` blue | Screening-aid disclaimer (canonical), scope limits within content-dense surfaces. See usage note below |
| Status / warning | `#FEF3C7` light amber | `#CA8A04` amber | Beta features, experimental flags, onboarding hints |

**When callout chrome earns its place — and when it doesn't:**

Aside callouts compete with surrounding content for visual weight. They earn
their place when the surrounding chrome is dense. Canonical case is the
screening-aid disclaimer at the top of ReportView, where it sits alongside
flagged-content chrome and earns INFO chrome to register against the
surrounding noise. On empty-state or sparsely-populated surfaces, standalone
prose with weight-based emphasis (Semibold headline + Regular continuation)
can carry adequate prominence without callout chrome; adding the panel + rule
would over-engineer the space.

Canonical example of standalone-not-callout: ImportView empty state. The
privacy block ("🔒 Your data never leaves your computer" + supporting line)
sits as standalone centred prose on a near-empty page. Headline at `base
Semibold C.TEXT`, supporting line at `base Regular C.TEXT_3`. No callout
chrome.

**FRAME sub-type current status:** Zero live consumers in product. The token
(`UI.FRAME.callout` in `tokens.js`) sits available; first consumer pending a
genuinely-ambient frame-setting block (reading conventions, dense help-block
content) that earns the panel chrome over standalone treatment. FRAME may
stay unused if no surface needs the panel chrome.

## Register inventory — applied to chrome surfaces

18 distinct (size, weight, colour, family) tuples on chrome.

| Role | Size | Weight | Colour | Family |
|------|------|--------|--------|--------|
| Verdict headline | xl | Bold | tier | sans |
| Verdict sub | base | Regular | C.TEXT_2 | sans |
| Section heading | lg | Semibold | C.TEXT | sans |
| Sub-heading (test card title) | md | Semibold | C.TEXT | sans |
| Column title (verdict §1) | md | Semibold | C.TEXT | sans |
| Body prose | base | Regular | C.TEXT | sans |
| Test card sub | base | Regular | C.TEXT_2 | sans |
| Identity row label | base | Regular | C.TEXT_3 | sans |
| Identity row value | base | Regular | C.TEXT | sans |
| Tier word | base | Medium | tier | sans |
| Tab (active) | base | Semibold | C.TEXT | sans |
| Tab (inactive) | base | Medium | C.TEXT_2 | sans |
| Button | base | Medium | C.TEXT | sans |
| Table header (semantic) | sm | Medium | C.TEXT | sans |
| Column index header (Excel-style) | xs | Medium | C.TEXT | mono |
| Row index | xs | Regular | C.TEXT_2 | mono |
| Table cell — all | xs | Regular | C.TEXT | mono |
| Footnote / reference | sm | Regular | C.TEXT_2 | sans |
| Fine print | xs | Regular | C.TEXT_3 | sans |
| Aside callout body | sm | Regular | C.TEXT | sans |
| Aside callout bullet lead | sm | Semibold | C.TEXT | sans |

21 roles, 18 distinct tuples. Down from ~40 in pre-system inventory.

Note: prior versions of this doc cited "18 roles, 13 distinct tuples". Recount at S138 close (post-Phase C.2 surface migration) found the actual table contained more tuples than the summary line claimed. Whether this was original miscount at S134 lock or drift since lock is undetermined from available evidence; the numbers above reflect the current table as the source of truth going forward. Column title (verdict §1) role added during S138-fix4 as a co-consumer of the Sub-heading tuple — no new tuple introduced.

## Implementation notes — for Phase B and Phase C

**Phase B (token consolidation):**

1. `src/constants/tokens.js` becomes the single source of truth for every
   typography token defined above.
2. Section.jsx hardcoded "14px" literal replaces with `--fs-lg` token reference.
3. ImportView.jsx component-scoped FS scale retires; usages migrate to TF tokens.
4. styles.js inline typography definitions retire or reference tokens.js.
5. index.html `<th>`/`<td>` global CSS retires; table rendering goes through
   component-level tokens.

**Phase C (surface migration):**

Surface-by-surface, every render of text content maps to one row of the
register inventory above. Specifically:

- ImportView — full sweep against system
- VerdictBanner (§1) — full sweep, with body padding tightening (22px), label
  C.TEXT_3 push, and bottom-note centring
- StickySurface (§2 Findings strip) — full sweep
- §3 Detailed test results — full sweep with new test card register set
- §4 Next steps (AI prompt panel) — full sweep
- §5 Methodology — full sweep, with screening-aid disclaimer in trust-aside callout
- DeepLookModal — full sweep
- Page chrome — tabs, buttons, file header, section dividers — full sweep

**Visual verification (Phase C):**

Built fixture-by-fixture. DS01 (clean), DS02 (severity 3), DS04 (different
fabrication shape), DS21 (severity 2 dataset-wide-only) per existing anchor
fixture set.

## What this system does NOT cover

- Spacing tokens (margins, paddings) — separate system
- Iconography — separate system
- Plot / chart typography — separate system, may inherit base values from
  this spec but governs its own register set per chart type
- Surface-level chrome (borders, shadows, backgrounds beyond aside callout
  panels) — separate system

## Maintenance discipline

- New chrome work cites the register row from this doc and the role the new
  surface plays
- Decisions that don't fit any existing row require system update first;
  no "I picked something that looked right" decisions land
- This doc updates only via deliberate revision; ad-hoc edits during chrome
  sessions are not allowed
- Inventory drift (creep beyond current 18 tuples on chrome) flagged in
  the next typography audit and reconciled

## Locked at end of Session A

Locks: voice profile · two-face Inter + JetBrains Mono · 6-step 1.25 scale ·
4 weights · 3 text colours · sentence case throughout · 1.55/1.4/1.3
line-heights · convention alignment (left default, right numerics, centre
frame-setters) · paired-fact identity row pattern (colour split) · aside
callout pattern (3 semantic sub-types) · table sizing (size to content,
centre when narrow) · 18-tuple chrome register inventory (recounted at
S138 close — prior "13" was either original miscount or pre-S138 drift) ·
single colour hierarchy across families · 5 token definition sites
collapse to 1.
