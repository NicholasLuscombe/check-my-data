# Check My Data — review paper: structure outline (draft)

**Status:** S294, Chat-authored. First structural skeleton for the review paper (the RC gate). No paper outline existed before this — the paper lived only as framing lines scattered across BANKED, REALWORLD-CORPUS-SPEC, and the session openers. This fixes the structure and argument spine so the already-drafted real-world section slots into a settled frame, and marks what is drafted, what is anchored-but-unwritten, and what is gated on work in flight.

**Discipline note:** every case study below is named but NOT yet documented at source — they are a track, not drafted material. The outline states what each case is *for* in the argument; the writeups are separate work. Nothing here should be read as a claim that the case-study content exists.

---

## The paper's claim (verbatim from source, unchanged)

The load-bearing claim, stated identically in BANKED and REALWORLD-CORPUS-SPEC:

> **"Every expert-flagged item the engine was built to catch, it caught"** — a sensitivity claim bounded by what the tool targets — **plus a characterised and disclosed false-positive surface** (the discipline claim). Explicitly **NOT** "provably defect-free," and **NOT** a clean sensitivity number.

The whole paper is organised to earn exactly this claim and no more. Two framing consequences fall out of it and govern the structure:

1. The paper's credibility rests as much on *disclosed limits* as on *detections*. A disclosed coverage gap and a characterised false-positive surface are not weaknesses to minimise — they are the evidence that the tool is calibrated rather than trigger-happy. The structure gives them their own sections, not footnotes.
2. Because the claim is bounded ("built to catch"), the paper must be explicit about the tool's detection *target* — what it is and is not designed to find — before any results, so "missed X" reads as scope, not failure.

---

## Proposed structure

### 1. Introduction — the problem and the gap
- Data fabrication in published science; why post-hoc statistical forensics matters (retractions, the cost of undetected fabrication).
- The existing landscape: manual expert forensics (Bik, Simonsohn/Data Colada, Englund), their reliance on specialist attention, the coverage problem (too many papers, too few experts).
- The gap this tool addresses: a client-side, no-upload, reproducible battery that a non-specialist can run — not to replace expert judgement but to widen the net and make the first-pass reproducible.
- **The bounded claim, stated up front** (from source above): flags patterns inconsistent with honest data generation, not intent; catches what it targets, discloses what it doesn't.

### 2. The detection target and battery — what the tool is built to catch
*This section exists to bound the later "missed X" rows as scope, not failure.*
- The detection philosophy: patterns statistically implausible under honest data generation (duplication, digit anomalies, variance/moment anomalies, distributional and covariance structure).
- The battery at a level of detail the paper needs (the five detection categories, the 27 tests as an organised map — draws on METHODOLOGY / METHODOLOGY-MAP, does not reproduce them).
- **The intent boundary** (load-bearing, from REALWORLD-CORPUS-SPEC §1): the tool detects patterns, not intent; several real positives have innocent or contested causes; verdict copy describes anomaly and implausibility, never asserts fraud. This is a design commitment the paper defends, not a disclaimer.
- Explicit scope statement: what the battery is NOT built for (the disclosed gaps land here as *known* boundaries — column-localised sequential duplication, pairwise near-duplicate matching — so their later appearance in results is expected, not surprising).

### 3. Case studies — the tool applied to known cases
*Anchored, NOT yet written. Each named case is a public misconduct case used as a worked example of the tool's behaviour on a documented pattern. These are illustrative worked examples, distinct from the blind corpus run in §4.*
- **Ariely** (the "S3" dataset) — [case-study writeup TBD; the well-known insurance-form field-experiment data anomaly].
- **Gino** (the "S4" material) — [case-study writeup TBD].
- **Pruitt** — [case-study writeup TBD; source material named at S293: the Laskowski blog account + PubPeer threads. Gather at source before writing.].
- **RMSF-Kozume — FRAMING ONLY, not a named case study** (colleague relationship). Referenced for methodological framing if at all; never presented as a worked case. This constraint is fixed and must survive into the draft.
- *Open decision for this section: how case studies relate to the corpus run — worked illustrations of mechanism (case studies) vs blind sensitivity/discipline test (corpus). Keep them structurally separate so the corpus's "blind" character isn't diluted by the pre-known cases.*

### 4. Real-world validation — the blind corpus run
*DRAFTED. `PAPER-REALWORLD-RESULTS-DRAFT.md` (S294) is this section: the three-row results table (argument-ordered), the split sensitivity/severity statistics, the false-positive-surface headline, the coverage-gap disclosure, the CORPUS-02 cell-count discrepancy, the CORPUS-03 under-call limitation, and the declared-structure methods paragraph.*
- Intro framing (sensitivity vs false-positive-surface as the section's claim) — the wrapper prose is the one piece of this section not yet drafted; deferred earlier pending a settled results block, now buildable.
- The results block (drafted).
- Tier-2 (Geng cases) as cited corroboration, gated on data access — enters here or as a short adjunct, not as blind corpus rows (they are under active investigation, so cited-corroboration framing is safer and stronger).

### 5. Methods — reproducibility and disclosed limitations
- The client-side architecture and why it matters for reproducibility (no upload, runs in-browser, public repo).
- Declared column structure for the corpus run (from CORPUS-PROVENANCE — the CORPUS-03 declaration, disclosed).
- **The disclosed-limitations pass** — this is where the §2.6 consistency-audit findings live as a credibility item: the paper discloses known consistency limitations (the continuous-branch null circularity demonstrated on CORPUS-03; the cross-column pooling false-positive class) as *disclosed* rather than *discovered-by-a-reviewer*. **GATED:** the §2.6 source-derivation read is running (S294); this subsection is scoped from its returned classification, not from the seed list. Independent of whether the fixes land — disclosure strengthens the validity claim on its own.

### 6. Discussion / limitations / future work
- What the tool is and isn't (restating the bounded claim, now earned by §§4–5).
- The v1.x roster as honest forward-looking scope (role-inference spine change, the consistency-audit fixes, the near-duplicate and sequential-duplication coverage gaps) — draws on V1X-FUTURE-WORK.
- The broader argument: reproducible first-pass forensics as a complement to expert attention, not a replacement.

---

## What slots where (status map)

| Section | Status | Source |
|---|---|---|
| 1. Introduction | not written | — |
| 2. Detection target + battery | not written | METHODOLOGY, METHODOLOGY-MAP, REALWORLD-CORPUS-SPEC §1 (intent boundary) |
| 3. Case studies | anchored, not written | Ariely/Gino/Pruitt named; Pruitt source = Laskowski + PubPeer; Kozume framing-only |
| 4. Real-world validation | **results block drafted**, intro prose pending | PAPER-REALWORLD-RESULTS-DRAFT (S294) |
| 5. Methods + disclosed limitations | not written; §2.6 subsection **gated on the running read** | CORPUS-PROVENANCE; §2.6 audit (in flight) |
| 6. Discussion / future work | not written | V1X-FUTURE-WORK |

---

## Open decisions this outline surfaces (for a scope call, not settled here)

1. **Case-studies vs corpus separation (§3 vs §4).** Keep structurally distinct so the corpus's blind character is preserved. Recommended, not locked.
2. **Where Tier-2 (Geng) enters** — end of §4 as cited corroboration, or a short §4 adjunct. Gated on data access regardless.
3. **How much battery detail §2 carries** — enough to bound the claim, not a methods dump (that's what METHODOLOGY is for; the paper references it).
4. **Target venue / length** — unknown; shapes how much §2 compresses. Not addressable here.

## Next step this outline sets up
The one immediately buildable piece is §4's intro/wrapper prose (results block already drafted, frame now fixed). Everything else in §§1–3, 6 is first-authoring from the named sources; §5's consistency subsection waits on the §2.6 read. A defensible drafting order once the outline is approved: §4 wrapper (closes the drafted section) → §2 (bounds the claim, unblocks everything after) → §1 → §3 case studies (gather Pruitt source first) → §5 (after §2.6 read) → §6.
