// S123-prep — Silent-auto-apply enumeration across ImportView.
// Read-only static inspection. Preserved as evidence artefact per prompt.
//
// Sources consulted:
//   src/components/views/ImportView.jsx (1038 lines)
//   src/stats/vst.js
//   src/import/rowSemantics.js
//   src/constants/assays.js (detectAssay + ASSAY_DATATYPE_MAP)
//   src/import/parser.js (applyHeaders forward-fill)
//   src/import/longFormat.js (detectLongFormat)
//   src/analysis/engine.js (extractAnalysisInputs, runFullAnalysis signature)
//   src/App.jsx (handleProceed VST dispatch)
//   src/components/views/ReportView.jsx (dataProfileRows)

const hr  = () => console.log("─".repeat(78));
const hdr = (s) => { console.log(); console.log(s); console.log("─".repeat(s.length)); };

// ════════════════════════════════════════════════════════════════════════════
console.log();
console.log("=== Section 1: State declaration enumeration ===");
// ════════════════════════════════════════════════════════════════════════════
console.log(`
ImportView.jsx carries FOUR (engine-consumed value, auto-flag) pairs plus
one derived-but-unflagged signal. Declarations at lines 35–57.

Pair A — assay
  line 39: const [assay,setAssay]=useState("general");
  line 40: const [assayAutoDetected,setAssayAutoDetected]=useState(false);
  line 41: const [assaySuggestion,setAssaySuggestion]=useState(null);

  Set-to-true sites (assayAutoDetected):
    line 160 (applyHeaders):   det.confidence==="high" → true
    line 297 (confirmPivot):   det.confidence==="high" → true
    line 315 (changeMeasureCol): det.confidence==="high" → true
  Set-to-false sites (user freeze):
    line 161 (applyHeaders, no det):   false
    line 316 (changeMeasureCol no det): false
    line 522 (Back button reset):      false
    line 630 (assay dropdown click):   false
    line 655 (Suggested-assay click):  false

  Consumers:
    line 622 (AUTO badge render, conditional on assayAutoDetected)
    line 653 (SET ME hint + suggestion link, conditional on assay==="general")

  Note on assaySuggestion (low-confidence parallel flag):
    Set non-null by same three sites when det.confidence==="low".
    Read only at line 653, which is ALREADY gated by assay==="general".
    Low-confidence path SETS assay to the detected value (line 160), so
    assay !== "general" and the suggestion text never renders. This is
    the DS01-densitometry failure mode called out in the prompt.

Pair B — dataType
  line 42: const [dataType,setDataType]=useState("continuous");
  line 43: const [dataTypeAutoSet,setDataTypeAutoSet]=useState(false);

  Set-to-true sites: lines 160, 297, 315, 630 — every assay auto-apply
    or manual-pick path flips it true.
  Set-to-false sites: line 642 (manual Data Type select onChange).

  Consumers of dataTypeAutoSet: NONE. Flag is dead code — never read.
  Actual rendering surface is "locked" = assay!=="general" &&
    !!ASSAY_DATATYPE_MAP[assay] (line 640), which disables the select
    and renders "Set by assay type" helper (line 648). The surface is
    tied to assay value, not to the auto-flag.

Pair C — colRelationship
  line 53: const [colRelationship,setColRelationship]=useState(null);
  line 54: const [colRelAutoSet,setColRelAutoSet]=useState(false);

  Set-to-true sites:
    line 293 (confirmPivot → 'conditions')
    line 346 (useEffect hasCondStructure → 'replicates', S122)
  Set-to-false sites:
    line 303 (dismissPivot reset)
    line 522 (Back button reset)
    line 757, 768 (user clicks Replicates / Non-replicates buttons)

  Consumers:
    line 335: effectiveColRel = colRelationship || (hasCondStructure ? 'replicates' : null)
    line 343–349: auto-apply useEffect
    line 748: isAuto = colRelAutoSet → renders AUTO badge on selected
      button at lines 764 / 775 inside gate card (lines 747–787).
      Gate always renders when sum.nDC >= 2.

Pair D — rowSemantics
  line 55: const [rowSemantics,setRowSemantics]=useState(null);
  line 56: const [rowSemAutoSet,setRowSemAutoSet]=useState(false);

  Set-to-true sites:
    line 365 (useEffect consuming rowSemSuggestion.value)
  Set-to-false sites:
    line 522 (Back reset)
    line 816, 827 (user clicks Ordered / Arbitrary buttons)

  Consumers:
    line 359–368: auto-apply useEffect
    line 372: effectiveRowSem = rowSemantics || 'ordered'
    line 373: rowSemRequired gate
    line 800: isAuto = rowSemAutoSet → AUTO badge at lines 823 / 834
    line 802–807: autoSubText (reason phrase under gate question)
    Gate always renders when sum.nDC >= 1.

Unflagged derived signal — longFormatDetected
  line 57: const [longFormatDetected,setLongFormatDetected]=useState(false);

  Set-true: line 209 (inside pivot modal path). Set-false: line 215, 522.
  NOT user-facing; it feeds rowSemSuggestion via line 356 useMemo. Sticky
  after user dismisses the pivot modal — so rowSemantics auto → arbitrary
  even when the user declines to pivot. This is the second-order silent
  cascade in the row-sem path.

VST pair — vstProposal / vstDecision
  line 50: const [vstProposal,setVstProposal]=useState(null);
  line 51: const [vstDecision,setVstDecision]=useState(null);

  Not a conventional "auto-set" pair. vstProposal non-null == an offer.
  vstDecision is the user's choice (or 'raw' default set eagerly at
  line 417).

  Set sites for proposal/decision:
    line 251 (onFile reset)
    line 416–420 (useMemo at lines 408–423 — auto-detect on
      data/assay/dataType changes; only runs when assay==='general' &&
      dataType!=='ordinal' → crucial; see Section 3)
    line 630 (assay dropdown click clears both)

  Consumers:
    line 449 (ordinal shortcut — emits raw)
    line 453 (general-assay branch, honours user choice)
    line 849: Zone 3 VST selector card renders ONLY when vstProposal
      non-null. Domain-specific assays never populate vstProposal, so
      card never renders on those assays.
`);

// ════════════════════════════════════════════════════════════════════════════
console.log();
console.log("=== Section 2: Silent-auto-apply inventory ===");
// ════════════════════════════════════════════════════════════════════════════
console.log(`
Classification per (i) Surfaced AUTO / (ii) Silent / (iii) Partial.

A. assay (high-confidence path)
   Classification: (i) Surfaced AUTO.
   Justification: assayAutoDetected=true → line 622 renders AUTO badge
     inside the assay dropdown button. User sees label + badge + can
     click to open dropdown and override.

B. assay (low-confidence path)  ←  known gap, prompt calls out DS01
   Classification: (ii) Silent auto-apply.
   Justification:
     - line 160/297/315 set assay := det.assay whenever confidence is
       "low", without AUTO badge (assayAutoDetected=false).
     - assaySuggestion is set to det.assay but the render condition at
       line 653 requires assay==="general" — which it no longer is.
     - Net: dropdown silently shows the detected assay (e.g. "Western
       Blot Densitometry") with no badge, no suggestion text, nothing
       distinguishing it from a user choice.
   Impact: forensics user cannot tell whether they chose or the tool
     chose. Compounds with VST auto-application (see Section 3 § D).

C. dataType (auto-from-assay path)
   Classification: (i) Surfaced — via dependent locked state, not the
     auto-flag.
   Justification: when assay maps through ASSAY_DATATYPE_MAP, the select
     is disabled and "Set by assay type" renders at line 648. The
     dataTypeAutoSet flag itself is unused — so the surface IS present,
     but the declared auto-flag is unreachable dead code.
   Cleanup note: dataTypeAutoSet read-sites: 0. Safe to delete in a
     separate scope.

D. colRelationship (two-row header / COND column paths — S122 useEffect)
   Classification: (i) Surfaced AUTO.
   Justification: gate card at 747–787 always renders when nDC ≥ 2 per
     S122. AUTO badge at 764/775 renders whenever colRelAutoSet=true
     AND the matching button is the selected one. Verified by Nick's
     DS03 / DS11 / DS19 pixel-verification.

E. colRelationship (pivot path → 'conditions')
   Classification: (i) Surfaced AUTO.
   Justification: confirmPivot sets colRelAutoSet=true (line 293), and
     gate card renders on pivoted output (nDC ≥ 2). Same AUTO badge
     surface as path D.

F. rowSemantics (long-format detection → arbitrary)
   Classification: (i) Surfaced AUTO.
   Justification: rowSemSuggestion.reason==='long-format' surfaces via
     autoSubText line 803 ("Auto: long-format detected") + AUTO badge.
     Gate always renders when nDC ≥ 1 per S122.

G. rowSemantics (genomics assay → arbitrary)
   Classification: (i) Surfaced AUTO.
   Justification: reason==='genomics' → autoSubText "Auto: genomics
     assay" + AUTO badge. DS11 pixel-verified by Nick.

H. rowSemantics (instrument assay → ordered, HIGH-confidence assay)
   Classification: (i) Surfaced AUTO.
   Justification: reason==='assay' → autoSubText "Auto: instrument
     assay" + AUTO badge. DS03 qPCR pixel-verified by Nick.

I. rowSemantics (instrument assay → ordered, LOW-confidence assay)
   Classification: (iii) Partial — surfaced at the row-sem gate but
     IS a second-order consequence of the silent path (B).
   Justification:
     - rowSemSuggestion fires based on assay (line 356 useMemo).
     - If the assay value was silently set via low-confidence detection
       (case B), then rowSem auto-suggest fires off an invisible
       premise. The user sees the rowSem AUTO badge but cannot see the
       assay=<densitometry> that triggered it.
     - Prompt names this explicitly: "Incomplete on DS01 densitometry
       (low-confidence assay detection path)".
     - The row-sem gate IS surfaced, but the upstream cause is not.
       S123 fix must target the upstream (case B) to complete the
       chain — surfacing only rowSem would mask the mechanism.

J. longFormatDetected (sticky flag after pivot-modal dismiss)
   Classification: (ii) Silent.
   Justification: once the pivot modal sets it true, dismissing the
     pivot keeps longFormatDetected=true (line 209 runs before the
     modal is rendered; line 215 runs only when lfDet is falsy on that
     code path). This drives rowSem → arbitrary regardless of pivot
     outcome. No render site. User's only hint is the rowSem AUTO
     subtext "long-format detected", which is correct but does not
     reveal that longFormatDetected sticks through modal dismiss.

K. VST (general assay, Anscombe / log proposed)
   Classification: (i) Surfaced.
   Justification: Zone 3 VST selector card renders whenever vstProposal
     non-null (line 849). User sees the offer + two buttons.

L. VST (general assay, detectVST returns 'raw' — no proposal)
   Classification: n/a — nothing auto-applied, no surface needed.
   Justification: line 418–420 sets vstProposal=null; engine call in
     App.jsx receives undefined vstDecision and re-runs detectVST which
     again returns 'raw'. Correct behaviour.

M. VST (domain-specific assays: elisa, densitometry, proteomics, etc.)
   ←  known gap, prompt calls out DS01 "Transform: Log transform" surface
   Classification: (ii) Silent auto-apply.
   Justification:
     - useMemo at lines 408–423 guards with assay!=='general' → early
       return. vstProposal stays null. Zone 3 card never renders.
     - App.jsx line 46 falls back to detectVST(matrix, assay). For
       elisa/densitometry/proteomics/genomics the assayMap at
       vst.js:153–159 returns 'log' (gated by signed-data + positivity).
     - Result: runFullAnalysis is called with vst.transform='log' and
       the engine routes the 13 VST-consuming tests to the log-space
       matrix.
     - User has NO pre-run surface for this. Only post-run surface is
       the dataProfile row "Transform: Log transform" rendered by
       ReportView (dataProfileRows line 636). That is reactive, not
       proactive.

N. VST (ordinal dataType, any assay)
   Classification: (i) Surfaced — implicit via dataType "Ordinal /
     Rank" visible in Zone 1.
   Justification: line 448–451 emits raw with reason "Ordinal data —
     no transform applied". No card needed since there is no transform.

O. headerRows (detectHeaderRows auto)
   Classification: (i) Surfaced.
   Justification: buttons [0,1,2] at line 606 show active state via
     background colour. User sees which value is active and can toggle.

P. roles (inferRoles auto)
   Classification: (i) Surfaced.
   Justification: Zone 2 "Review columns" panel renders every column
     header with role colour + click-to-cycle. Reset buttons at line
     680 (Auto / All Data / All Off). This is the explicit user-review
     surface the prompt asks to confirm.

Q. condPerCol (two-row-header forward-fill)
   Classification: (i) Surfaced.
   Justification: condSpans (line 378) render as coloured span headers
     in the Zone 2 preview table. User sees the group assignment.

R. zeroAsMissing
   Classification: n/a — user-owned checkbox default false. Not
     auto-applied. Recommended nudge at line 730 for genomics /
     cell_count is a hint; still requires user click.

S. Data Type dropdown override
   Classification: (i) Surfaced.
   Justification: line 642 select disabled + line 648 "Set by assay
     type" helper visible when assay overrides.

Summary of silent auto-applies that S123 must cover:
  • (B) low-confidence assay detection
  • (M) VST applied on domain-specific assays without a Zone 3 card
  • (J) sticky longFormatDetected after pivot-modal dismiss (second-order
      but not user-visible; lower priority, may be acceptable as-is)
  • (I) downstream: low-confidence assay → rowSem AUTO with invisible
      upstream cause; fixing (B) resolves (I) automatically
`);

// ════════════════════════════════════════════════════════════════════════════
console.log();
console.log("=== Section 3: VST decision logic audit ===");
// ════════════════════════════════════════════════════════════════════════════
console.log(`
Render gate for Zone 3 VST card — ImportView.jsx lines 408–423:

  useMemo(()=>{
    if(!data||!roles.length||assay!=='general'||dataType==='ordinal') return;
    const config={data,roles,hdrs,condPerCol,zeroAsMissing,assay,
                  dataType,colRelationship:effectiveColRel};
    try{
      const{matrix}=extractAnalysisInputs(config);
      const proposed=detectVST(matrix,assay);
      if(proposed && proposed.transform!=='raw'){
        setVstProposal(proposed);
        setVstDecision('raw'); // safe default
      } else {
        setVstProposal(null);
        setVstDecision(null);
      }
    }catch(e){/* ignore — matrix extraction may fail */}
  },[data,roles,hdrs,condPerCol,zeroAsMissing,assay,dataType,effectiveColRel]);

Gate is DOUBLE-GUARDED: assay must be 'general' AND dataType must not
be 'ordinal'. Any domain-specific assay short-circuits at the first
clause — no proposal, no card.

Card render: lines 849–886, conditional on {vstProposal&&(...)} only.

detectVST decision tree — src/stats/vst.js:59–183:

  1. Count isInteger (intFrac > 0.95), posFrac, slope + 95% CI.
  2. requiresPositiveDomain(matrix) := negFrac < 0.1 (S111 gate).
  3. If isInteger:
     a. slopeTest==='above' AND posFrac>0.5 AND positiveDomain → 'log'
     b. !positiveDomain → 'raw' (reasonCode signedData)
     c. else → 'anscombe'
  4. Continuous:
     a. slopeTest==='above' AND posFrac>0.5 AND assay==='general' AND
        positiveDomain → 'log'
     b. Else assayMap fallback:
          elisa: log, densitometry: log, genomics: log,
          proteomics: log, cell_count: raw, plate_reader: raw,
          qpcr: raw, physiological: raw, general: raw
     c. If t==='log' AND !positiveDomain → 'raw' (S111 gate)
     d. If t==='log' AND posFrac<=0.5 → 'raw' (secondary posFrac gate)

Application of the non-raw transform:

  ImportView.handleProceed (lines 440–461):
    - Ordinal dataType → onProceed({..., vstDecision:{transform:'raw',...}})
    - assay==='general' && vstProposal && vstDecision → emits user's
      choice or vstProposal (forced to raw if user chose 'raw')
    - ELSE (includes all domain-specific assays) → onProceed(config)
      without a vstDecision key

  App.jsx handleProceed line 46:
    const vst = config.vstDecision !== undefined
      ? config.vstDecision
      : detectVST(matrix, config.assay);

  So domain-specific assays run detectVST AT analysis time with the
  user's (possibly silently auto-set) assay choice. densitometry →
  assayMap[densitometry]='log' → gate check → if passes, {transform:
  'log', reason: "...assay (densitometry) suggests log → log"} →
  runFullAnalysis receives {transform:'log',...} → vstMatrix built at
  engine.js:219: matrix.map(v>0?Math.log(v):null).

Classification of VST auto-applies:

  Assay      → Proposed transform  |  Zone 3 card renders? | Surfaced?
  ─────────────────────────────────────────────────────────────────────
  general    → depends on slope     |  YES if !=='raw'      | YES
  qpcr       → 'raw' (assayMap)     |  NO  (short-circuit)  | n/a (no op)
  elisa      → 'log' (assayMap)     |  NO  (short-circuit)  | SILENT
  densitom.  → 'log' (assayMap)     |  NO  (short-circuit)  | SILENT
  plate_rdr  → 'raw' (assayMap)     |  NO  (short-circuit)  | n/a (no op)
  cell_count → 'raw' continuous,    |  NO  (short-circuit)  | PARTIAL
                 anscombe if integer                          [see below]
  genomics   → 'log' cont.          |  NO  (short-circuit)  | SILENT
                 anscombe / log integer                        [see below]
  physiol.   → 'raw' (assayMap)     |  NO  (short-circuit)  | n/a (no op)
  proteomics → 'log' (assayMap)     |  NO  (short-circuit)  | SILENT
  survey     → ordinal → 'raw'      |  n/a                  | n/a (no op)

  cell_count: if data is integer-dominant AND passes signed-data gate,
    detectVST integer branch can return 'anscombe' (non-raw). No Zone 3
    card renders. Also SILENT for this sub-case.

  genomics: integer-dominant NB → 'log'; continuous TPM/FPKM → 'log'
    via assayMap. Both SILENT.

Paths where transform is auto-applied with NO Zone 3 surface:
  • elisa            → log
  • densitometry     → log   (DS01 — prompt's reference case)
  • genomics (integer) → log if slope CI entirely above 1 + positive domain
  • genomics (integer fallback) → anscombe
  • genomics (continuous) → log
  • proteomics       → log
  • cell_count (integer)  → anscombe

Override surface: NONE pre-run. Only post-run dataProfile row shows
"Transform: Log transform" (or Anscombe VST), rendered by
ReportView/VerdictBanner via dataProfileRows line 636. Users cannot
undo the transform without going back and manually switching assay to
"general" to unlock the gate.
`);

// ════════════════════════════════════════════════════════════════════════════
console.log();
console.log("=== Section 4: Other potential silent-auto-apply paths ===");
// ════════════════════════════════════════════════════════════════════════════
console.log(`
Candidates beyond gates + VST:

T. detectLongFormat (src/import/longFormat.js)
   Surface: pivot MODAL (LongFormatModal, lines 485–492) — the user
     is explicitly asked to confirm or dismiss. This is a
     user-interaction surface, not silent.
   Classification: (i) Surfaced.
   Caveat: the sticky flag longFormatDetected after the user dismisses
     the modal IS silent (see §J above). That is a post-modal artefact,
     not the detection event itself.

U. inferRoles (src/import/roles.js:3)
   Surface: Zone 2 review panel renders every column with its role
     colour + role legend + click-to-cycle + Auto/All Data/All Off
     reset buttons (line 680). This IS the review surface.
   Classification: (i) Surfaced.
   Controversial auto-role risks: the heuristic at roles.js:8 classifies
     <50% numeric + uniq/n <0.3 as "condition" and <50% numeric + high
     uniq as "label". Headers matching (id|name|sample|…|gene) → label;
     (group|condition|…|genotype) → condition. Numeric integer sequences
     with >85% increments → label. Edge cases where header keywords
     conflict with numeric content: roles.js:11 explicitly protects
     DATA classification when condPerCol is populated AND the column
     is numeric. All outcomes are VISIBLE in the preview table.

V. zeroAsMissing
   Default: false. Checkbox at line 725. User-owned.
   Classification: n/a — not auto-applied.
   Nudge banner at line 730 for genomics / cell_count with zeros ≥ 1
     is informational and requires a click.

W. Data Type dropdown (dataType)
   Locked/disabled surface at line 642 + "Set by assay type" at line
     648 whenever ASSAY_DATATYPE_MAP[assay] resolves non-general.
   Classification: (i) Surfaced — override IS visible.

X. preprocessRaw side effects — skippedRows / trimmedRows / removedCols
   Surface: line 549–556 renders "Auto-cleaned: stripped N preamble
     rows · trimmed M trailing rows · removed K sparse separator cols"
     inside the compact filename bar whenever any of the three is > 0.
   Classification: (i) Surfaced. (Not engine-consumed as decision
     state, but observable to user.)

Y. detectBlocks (parser.js:45)
   Surface: Zone-1-adjacent card at lines 582–596 — renders when
     blocks.length > 1 with a button per block. User picks.
   Classification: (i) Surfaced.

Z. Block auto-select (selectedBlock default 0)
   If detectBlocks returns multiple blocks, block 0 is auto-loaded at
     line 195 BEFORE the user sees the picker. The picker then allows
     switching. The INITIAL render reflects block 0 loaded — user sees
     state "block 1 of 3 loaded, pick another to switch".
   Classification: (iii) Partial — the selection IS auto-applied
     before the picker appears, but the picker is visible and allows
     override immediately. Not forensically silent in the same sense
     as VST, but worth flagging as a minor edge case.

AA. pivotConfig.measureCol default (line 288)
   confirmPivot accepts the user's measureCol from LongFormatModal.
   No silent default — user picks. Subsequent changes via line 939
     measure-switch dropdown.
   Classification: (i) Surfaced.

BB. Excel metadata extraction
   Triggered at loadExcelSheet line 226; threads excelMeta through to
     ReportView. Metadata shown on ExcelMetaCard in report mode.
   Classification: (i) Surfaced post-run. Not an analysis decision —
     pure forensic artefact display. No silent auto-apply impact.

CC. Excel sheet picker (line 563)
   When multi-sheet, user picks. First sheet is NOT auto-loaded — the
     picker blocks.
   Classification: (i) Surfaced.

No additional silent auto-apply paths found beyond those listed in
Section 2.
`);

// ════════════════════════════════════════════════════════════════════════════
console.log();
console.log("=== Section 5: Missing fields ===");
// ════════════════════════════════════════════════════════════════════════════
console.log(`
Not verifiable from static inspection:

  • The exact assay detectAssay would return for DS01 densitometry.
    detectAssay is filename + header keyword driven; without invoking
    it on the fixture headers/filename, confidence ("high" vs "low")
    cannot be confirmed. The prompt specifies "low-confidence-assay
    detection path" for DS01, so this is assumed correct.
  • Timing-ordering of the S122 hasCondStructure useEffect vs the
    initialConfig restore useEffect (line 67–105) when returning from
    ReportView. In principle initialConfig.colRelationship overrides,
    but the hasCondStructure useEffect at line 343 could refire and
    re-assert 'replicates' with colRelAutoSet=true, masking a user's
    prior explicit 'conditions' choice on structured input. Worth
    runtime-probing during S123 but not verifiable here.
  • Whether any of the fifteen setXxx(...) calls inside the Back
    button reset (line 522) leave a residue that persists across
    onFile re-entry. Static inspection shows a full reset list; no
    obvious miss, but reset + new-file race could be runtime-specific.
  • MeasureCol re-detect on changeMeasureCol (line 314) uses
    originalHeaders — correct per comment — but its side-effect on
    assayAutoDetected/assaySuggestion could create transient states
    if the user changes measure col multiple times. Not relevant to
    the silent-auto-apply audit.
`);

hr();
console.log("end diag-s123-prep-silent-autoapply");
