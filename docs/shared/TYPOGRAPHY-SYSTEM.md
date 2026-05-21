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

Sentence case is the default product-generated case.

Applied to: section headings, verdict headlines, sub-headings, tab labels,
button labels, table headers, identity row labels, settings entries, footnotes,
aside callout content, prose paragraphs.

**ALL CAPS retires entirely.** Section headers (`1 · Summary`) at lg
Semibold sentence case. No letter-spacing. Five active letter-spacing values
in current system retire to zero.

**Name-cased category labels** (added S148-fix1). Cluster names, test names,
and statistical procedure labels render as name-cased category labels: first
word initial-cap, rest lowercase, hyphenated compounds lowercase after the
hyphen. They retain this casing in any context — list, sentence-start,
mid-sentence, prose. They do not switch to sentence case mid-sentence.

Examples:
- Cluster: `Copy, paste, edit`, `Cross-replicate comparisons`, `Unusual digits`
- Test: `Noise predictability`, `Inter-replicate correlation`, `Row-order randomness`

Rationale: these labels are named statistical categories, not descriptive
phrases. "Tests flagged across Copy, paste, edit and Cross-replicate
comparisons" reads correctly because the cluster names are functioning as
named entities embedded in prose. The single-source-of-truth for these
labels is `MECHANISMS` (cluster names) and `DISPLAY_NAMES` (test names) in
`src/constants/mechanisms.js`; downstream consumers must read from these
registries rather than re-derive casing.

Exceptions to sentence case (apply also within name-cased labels):

- **Eponymous tests and named methodologies** retain conventional casing:
  Mahalanobis, Benford, Zipf, Mann-Whitney, Anderson-Darling,
  Kolmogorov-Smirnov, Shapiro-Wilk, Ljung-Box, LOESS, Hartigan, Moran,
  Fisher, Bonferroni, Benjamini-Hochberg.
- **Established statistical acronyms** retain uppercase: GoF, MAD, VST,
  BH-FDR, FDR, OLS, GLS, ANOVA, MCMC, RNG, PRNG.
- **Domain measurement-type names** retain established proper-noun forms:
  Western Blot Densitometry, qPCR, ELISA, SDS-PAGE.
- **Branded names** preserved verbatim: `Check My Data` (brand),
  `Bik standard` (named methodology), `Excel` (product).
- **User-supplied data** preserved verbatim: condition labels
  (`Inhibitor_A`), column headers, file names — never re-cased.
- **Developer namespace identifiers** are not user-facing chrome and are
  exempt from these rules: engine-dispatch keys (`r.name`), region-divider
  comments, internal registry keys, debugging strings.

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

## Primary banner pattern

For load-bearing product claims that warrant primary visual weight. Distinct
from aside-callout (peripheral meta-content) — primary banners carry claims
the user is there to evaluate, not background framing.

First consumer (S148): privacy banner on ImportView — "Your data never
leaves your browser / All analysis runs locally". Anchored at the top of
the page, above all other content.

**Structure:**
- Background: tinted panel (`#EFF6FF` light blue when used for trust
  claims, matching the trust register)
- Border: none
- Border-radius: 6px (CR.LG)
- Padding: 16px 20px
- Layout: flex row, gap 14px
- Icon: 24px lucide-style SVG glyph on the left, coloured to match the
  register tint (`#2563EB` blue for trust claims)
- Text block: flex column, line-height 1.3
  - Headline: base, Medium, C.TEXT
  - Sub-line: sm, Regular, C.TEXT_2

**Versus aside-callout.** Banners and aside-callouts are visually similar
(both tinted panels) but semantically distinct:

| | Primary banner | Aside callout |
|---|---|---|
| Role | Load-bearing product claim | Peripheral meta-content |
| Placement | Page-top, before primary content | Embedded inline, alongside primary content |
| Weight | Headline base Medium | Body sm Regular |
| Icon | Yes (24px, register-coloured) | No |
| Border-radius | 6px all corners | 0 4px 4px 0 (square left, rule-edge) |
| Left rule | No | Yes (3px solid) |

A claim that earns banner treatment never also appears as an aside-callout
(no double-treatment). If demoted from banner, retire the banner entirely.

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
| Trust / info | `#EFF6FF` light blue | `#2563EB` blue | Screening-aid disclaimer, scope limits |
| Status / warning | `#FEF3C7` light amber | `#CA8A04` amber | Beta features, experimental flags, onboarding hints |

## Register inventory — applied to chrome surfaces

25 distinct (size, weight, colour, family) tuples on chrome.

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
| Lane label (§2 + DeepLookModal) | base | Semibold | C.TEXT | sans |
| Modal sub-context | sm | Regular | C.TEXT_2 | sans |
| Tab (inactive) | base | Medium | C.TEXT_2 | sans |
| Button | base | Medium | C.TEXT | sans |
| Primary banner headline | base | Medium | C.TEXT | sans |
| Table header (semantic) | sm | Medium | C.TEXT | sans |
| Column index header (Excel-style) | xs | Medium | C.TEXT | mono |
| Row index | xs | Regular | C.TEXT_2 | mono |
| Table cell — all | xs | Regular | C.TEXT | mono |
| Footnote / reference | sm | Regular | C.TEXT_2 | sans |
| Primary banner sub-line | sm | Regular | C.TEXT_2 | sans |
| Fine print | xs | Regular | C.TEXT_3 | sans |
| Aside callout body | sm | Regular | C.TEXT | sans |
| Aside callout bullet lead | sm | Semibold | C.TEXT | sans |
| Mini-card sub-section label | sm | Semibold | C.TEXT_3 | sans |
| Severity label | xs | Semibold | tier | sans |
| Severity badge | xs | Semibold | tier | sans |
| Pattern pill/chip | sm | Semibold | tier | sans |
| State chip | xs | Medium | token | sans |
| Identity chip | xs | Regular | tinted | sans |
| Marker pill | xs | Semibold | accent | sans |

32 roles, 25 distinct tuples. Down from ~40 in pre-system inventory.

Notes on chrome-shape vs typography register:

- **Severity label** is a bare-text register — no bounded chrome. Consumed by TestCardLayout per-test verdict (`FLAGGED`/`Noted`/`Clear`) and ExcelMetaCard inline tier-coloured tags. Distinct from Severity badge (below) which is bounded.
- **Severity badge** is bounded chrome (bg + border + padding + borderRadius). Canonical (currently sole) consumer is BatchView per-file severity in the tabular results column. Both rows share the same typography tuple (xs Semibold tier sans); the difference is chrome shape.
- **Pattern pill/chip** is bounded chrome at the larger sm size. FindingPill + FindingChip on the §2 dataset-wide / localised pattern surface. Tier-coloured per SEV_VERDICT[s].color, with optional mech-stripe (4px inset boxShadow) as a second axis.
- **State chip** is bounded chrome with no border. xs Medium with the colour wired to a `BADGE.*` token slot (`BADGE.AUTO` teal, `BADGE.REQUIRED` gold, `BADGE.SET_ME` neutral). Also the canonical register for the column-header role chip (DATA / LABEL / COND / SKIP — colour wired to `ROLES[role].color`). Colour axis is "token" rather than "tier" because state chips encode workflow chrome, not severity.
- **Identity chip** is bounded chrome with no border, FW.NORM weight. Lighter weight signals an identity tag with no editorial claim — currently consumed by ImportView Zone 1 condition chips (one per condition name in `s.cNames`). Colour wired to `condColorMap[c]` from the 8-entry `COND_COLORS` palette.
- **Marker pill** is bounded chrome with border. xs Semibold accent (currently gold via `BADGE.PROMOTED`, distinct from severity tier axis). Consumed by MiniCard_Kurtosis + ConditionTable "differs between conditions — promoted" badge — semantic marker for a cross-condition finding, not a severity.

### Chip-family weight rule

A deliberate weight axis runs through the chip-shape family. Match the weight to the semantic role:

- **Regular (FW.NORM)** — identity tag. A condition name, a user-supplied label, anything that names but does not claim. Identity chip register.
- **Medium (FW.MED)** — state/role indicator. AUTO / SET ME / REQUIRED / column-role chips. Workflow chrome, not editorial. State chip register.
- **Semibold (FW.SEMI)** — severity or load-bearing finding. Severity labels (bare text), Severity badges (bounded), Pattern pills/chips, Marker pills. Claim-carrying weight.
- **Bold (FW.BOLD)** retires from chip-family entirely. Bold remains reserved for the Verdict headline carve-out (per § Weights rule, line 73).

Prior versions of this doc cited "18 roles, 13 distinct tuples". Recount at S138 close (post-Phase C.2 surface migration) found the actual table contained more tuples than the summary line claimed. Whether this was original miscount at S134 lock or drift since lock is undetermined from available evidence; the numbers above reflect the current table as the source of truth going forward. Column title (verdict §1) role added during S138-fix4 as a co-consumer of the Sub-heading tuple — no new tuple introduced. Primary banner headline + sub-line roles added during S148 as co-consumers of the Button and Footnote tuples respectively — no new tuples introduced. Lane label (§2 StickySurface + DeepLookModal) and Modal sub-context roles added during S149 (C.6+C.7 combined) — Lane label shares the `base Semibold C.TEXT` tuple with Tab (active); Modal sub-context shares `sm Regular C.TEXT_2` with Footnote/reference. Both are role-additions only, no new tuples. Mini-card sub-section label added during S150 (C.8) — `sm Semibold C.TEXT_3` is a genuinely new tuple, 35+ consumer sites via shared `SUB_HEAD` in `src/components/shared/styles.js`. Status badge + Pattern pill/chip added during S151 (C.9) — surfaced by S150-fix1 status badge tuple finding; genuine role distinction at xs (bare-text Severity label sites — TestCardLayout per-test verdict + ~8-10 ExcelMetaCard inline tier-text spans + bounded FlagBadge prior to its S152 retire) vs sm (2 pattern surface chips — FindingPill + FindingChip). Option (a) two-row split chosen over option (b) consolidation to preserve §2 dataset-wide pattern surface prominence (sm) vs §3 per-row status indicator density (xs). Tier-coloured (red/amber/green per `SEV_VERDICT[s].color`) on both rows. S152 badge-family pass: Status badge row renamed to Severity label (bare-text register, name now matches consumption); three new bounded-chrome rows added (Severity badge, State chip, Identity chip) plus one new accent-axis row (Marker pill); chip-family weight rule landed as a system rule alongside the existing letter-spacing retire-to-zero rule; FlagBadge bounded shape retired with sole consumer ExcelMetaCard now consuming the Severity label register via bare-text render; BatchView severity badge became the canonical Severity badge consumer (FW.BOLD → FW.SEMI, hex-math → SEV_VERDICT, letterSpacing 0.05em retired).

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
