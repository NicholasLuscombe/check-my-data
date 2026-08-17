# S379 — the measurement's selection rule, and the honest denominator

> **READ §8 BEFORE §1. The word "honest" in this document's title, in clause 3 of §1, and throughout
> §2 and §3 is WRONG — corrected S380.** Twelve of the twelve deposits called honest trials carry a
> PubPeer thread with a specific allegation; **twelve of twelve, verified at source against
> `REALWORLD-CORPUS-SPEC.md` §0.** They are not honest files and they are not a control arm. They are
> **positives whose defect we had not confirmed ourselves** — a lifecycle state, not a class.
> **§7 corrected the reasoning and left the vocabulary, and the vocabulary is what travelled.** This
> file is retrievable from project knowledge, so anyone reaching §1's five clauses will read a
> definition that S380 overturned. §8 also corrects what this document says about the corpus itself
> and about why round 2 is needed.

**Written before the run, which is the whole point of it.** A denominator can be fitted after the fact
exactly as a threshold can. This file fixes both the rule and the count while no result exists to
argue with.

**Source:** `docs/shared/REALWORLD-CORPUS-SPEC.md` §0 master table, §0.1 update blocks, §0.4 and §2
adjudication blocks, read live at S379. Standard from `FALSE-POSITIVE-TOLERANCE.md` §6.

**Headline: n = 12, not 20.** Pending one check on C22, which could make it 11.

---

## 0. When this landed, stated because it matters

**The content was fixed before any result existed. The commit was not, and the gap turned out to be
larger than this section first recorded.** The rule and the twelve were settled and transmitted in full
at S379 before the run was dispatched. The run then began before this file reached disk. **It never
reached disk during S379 at all** — the routing slip carried it, Code checked for it at the close, and
it was not there. It is being committed after the complete result is known: twelve deposits, all at
severity 3.

**So this is not a pre-registration and must not be described as one.** The repository cannot evidence
the ordering, and no wording here can substitute for a commit date. The only record that the
denominator was fixed before the result was seen is the S379 session transcript, where the
classification and the count appear before the dispatch that produced any number.

**What that costs, stated honestly.** The rule's practical job was to stop the denominator being fitted
to the result. The result is a constant verdict across all twelve, so there was no rate to fit a
denominator to and nothing here was adjusted after the fact — **§1 to §4 are byte-identical to what was
transmitted before the run, apart from a corrected count in §3 that Code caught and this section.** The
loss is procedural rather than substantive. It is still a real loss, and the remedy is fixed: **the next
measurement commits its rule before its dispatch, in that order, with the hash quoted in the dispatch
itself.**

---

## 1. The rule

Five clauses. Every deposit takes exactly one of three states.

1. **The unit is the deposit, not the sheet and not the file.** One observation each, the worst verdict
   across its runnable sheets. Decided S378: sheets in a workbook share a lab, an instrument, a
   pipeline and an author, and Clopper-Pearson needs independent trials.
2. **A deposit is a positive if the defect is confirmed to exist in the deposited data.** Three routes
   count and they count equally: a retraction, an author acknowledgement, or our own read at source.
   **Who confirmed it does not matter; whether it is confirmed does.** A positive cannot sit in the
   honest denominator, because a flag on it may be correct.
3. **A deposit is an honest trial if the allegation against it is unverified.** Per §6, a real deposit
   is only *not known to be fabricated*. An open PubPeer thread is an allegation, not a finding.
4. **A deposit is not runnable if no data sits on disk**, whether parked, dropped or duplicated.
   Not runnable is not the same as honest, and it never enters n.
5. **Author updates do not add trials.** An update is a version of one deposit, not a second deposit.
   A silent tool on an update proves the authors pasted correctly the second time and nothing else.

**One word carries two senses in the corpus spec and clause 2 uses only one of them.** The §0.4 and §2
case headings read ADJUDICATED, meaning *we adjudicated the tool's output against the deposit*. §4A
says *third-party-adjudicated defect*, which is the sense that matters here. Nine cases carry the
heading. A read keyed on the heading word gets a different answer from a read keyed on the defect.

---

## 2. The classification — all 25 deposits, one state each

| ID | Lifecycle | State | Why |
|---|---|---|---|
| CORPUS-01 | run | **positive** | Sequential block duplication, deposit-verified S329 |
| CORPUS-02 | run | **positive** | Retracted June 2026; author admission of altered absorbance values |
| CORPUS-03 | run | **positive** | Every SL value repeated ×4, join scramble, Class A |
| CORPUS-04 | parked | not runnable | No deposit on disk |
| CORPUS-05 | parked | not runnable | No deposit on disk |
| C06 | dropped | not runnable | DOI-confirmed duplicate of CORPUS-02 |
| C07 | runnable | **honest trial** | Allegation only — identical total/organic P rows |
| C08 | run | **positive** | Read at source: 268 of 1,050 values exact duplicates, 25.5%. No author admission and none needed |
| C09 | runnable | **honest trial** | Allegation only — cross-replicate duplicates |
| C10 | runnable | **honest trial** | Allegation only — reordered frame data |
| C11 | run | **positive** | Source-confirmed in the UI; 33 duplicated control rows |
| C12 | run | **positive** | Retracted May 2026; author acknowledgement August 2025 |
| C13 | runnable | **honest trial** | Allegation only — Day 90/360 = Day 30 blocks |
| C14 | runnable | **honest trial** | Allegation only — duplicated tree sequences |
| C15 | runnable | **honest trial** | Allegation only — duplicated soil/leaf concentrations |
| C16 | runnable | **positive** | Author-corrected March 2026; **910 Z-values differ between the two deposited files, source-verified S318** |
| C17 | runnable | **honest trial** | Allegation only — duplicated EEG values |
| C18 | runnable | **honest trial** | Allegation only, **and it is a count mismatch rather than a duplication** |
| C19 | runnable | **honest trial** | Allegation only — copied C and N between timepoints |
| C20 | runnable | **honest trial** | Allegation only — duplicated respiration values |
| C21 | run | **positive** | Author acknowledgement of the 275 mm / 2017 copy-paste |
| C22 | runnable | **honest trial, provisional** | Allegation only. `C22-update.xlsx` sits on disk with no thread marker — **if an author response exists this becomes a positive and n falls to 11** |
| C23 | run | **positive** | Confirmed at source; author reply admits the wrong file was deposited |
| C24 | runnable | **honest trial** | Allegation only — copied windscreen counts across years |
| C25 | run | **positive** | Author-admitted paste error in Fig. 2b, caught and localised |

**10 positives · 3 not runnable · 12 honest trials.**

**C16 is the row a lifecycle-keyed read would have got wrong.** It is `runnable`, never run by us, and
sits in the ecology cluster — but it carries an author correction and a source-verified difference of
910 values between the two deposited files. Nothing about its lifecycle state says positive.

---

## 3. The arithmetic

**25 enumerated deposits → 12 honest trials.**

This does not run through S378's chain and does not need to. That chain subtracted retractions, then a
drop, then two parks, reaching 20. The 20 was never the honest count: it counted every deposit whose
data can be loaded, and **eight** of those carry a confirmed defect — CORPUS-01, CORPUS-03, C08, C11,
**C16**, C21, C23 and C25. **One classification with three states replaces the chain, and the two
reconcile only once C16 is among the eight.**

**This sentence read seven until it was checked, and the way it got there is the point.** Seven is what
you get by counting the nine `run` deposits and subtracting the two retracted. That is a
lifecycle-keyed read, and it drops the single positive that is `runnable` rather than `run` — the exact
row §2 exists to catch. The classification is not a tidier way of saying the chain. It reaches a
different answer, and the chain reaches the right one only by importing §2's result.

## 4. What n = 12 buys

One-sided 95% Clopper-Pearson upper limits, *k* flags in *n* honest deposits. The n = 25 and n = 27
rows reproduce `FALSE-POSITIVE-TOLERANCE.md` §7 exactly, which is the check that this table is
computed the same way.

| *n* | *k* = 0 | *k* = 1 | *k* = 2 |
|---|---|---|---|
| **12** | **22.1%** | **33.9%** | **43.8%** |
| 13 | 20.6% | 31.6% | 41.0% |
| 20 | 13.9% | 21.6% | 28.3% |
| 25 | 11.3% | 17.6% | 23.1% |
| 27 | 10.5% | 16.4% | 21.5% |
| 300 | 1.0% | 1.6% | 2.1% |

**Read one thing off it.** At n = 12 with nothing firing at all, the tightest demonstrable bound is
22.1% — more than twice the 10% severity-1 bound, before a single flag. The gap S374 recorded in
advance is now roughly double what S378 measured it at, and **the bounds still do not move.** This is
the third time that ruling has paid out on a number arriving worse than the estimate.

## 5. The bias, stated plainly

**Every one of the twelve carries an open, specific, localised allegation of duplicated values — the
exact defect class the battery detects.** Not one is a deposit nobody has complained about. The corpus
holds no honest control of any kind.

So the conservatism is not mild. Several of the twelve probably do contain real duplications, and any
flag on those will be counted as a false positive because we cannot show otherwise. **A low rate is
therefore a real result and a strong one. A high rate is uninterpretable and must not be published as
a false-positive rate.** Decide that reading now, not after seeing the number.

**C18 is the partial exception and it is worth one line in the results.** Its allegation is a count
mismatch against the methods section, not a duplication. It is the closest thing the corpus has to an
honest trial for the duplication tests.

## 6. What this changes, and what it does not

- **The measurement can run.** The gate on step 2 was this read and it is answered.
- **n = 12** goes beside the result, with §5's sentence, not in a footnote.
- **One check outstanding: C22's author response.** It moves n to 11 and it does not block the run —
  run all twelve, hold C22's row separable in the output.
- **Nothing here reopens the tolerance.** The bounds were set at S374 before any of this was known.

---

## 7. Correction — written after the result, and §5 and §6 are left standing

**Sections 1 to 6 are the pre-run record and are not edited.** This section corrects them. Rewriting
the reasoning after seeing the outcome is the exact failure the rest of this document exists to
prevent, so the error stays visible above and the correction sits below it.

### §5 was wrong in both directions, not merely understated

§5 says a low rate would be "a real result and a strong one" and a high rate uninterpretable. **The
first half is false and the asymmetry does not exist.**

**A low flag rate on a corpus selected for suspicion is not evidence of good specificity.** These
deposits are not honest files. Several of the twelve very likely contain the duplications alleged
against them. A tool staying quiet on them would be demonstrating a *sensitivity* problem — it would be
missing defects — and that says nothing whatever about how it behaves on honest data.

**So the corpus could not have produced the quantity, whichever way the number went.** High:
uninterpretable, because the flags might be correct. Low: informative about something else entirely.
**There was no outcome of this run that would have measured specificity.**

### §6's first bullet is false

"The measurement can run" is true only in the sense that a program can execute. **The measurement could
not answer the question it was posed, and that was determinable before it ran** — from §5's own opening
sentence, which states that the corpus holds no honest control of any kind. The objection was found,
written down, and filed as a caveat rather than acted on as a stop.

### What replaces both

**This corpus cannot measure specificity at any n, in either direction, by construction.** Not because
twelve is too few. Because every deposit in it is present on the strength of a report, so *not yet
adjudicated* is not *honest*, and no selection rule applied to it can produce an honest arm.

**Nothing about the tolerance changes.** The bounds were fixed at S374 and they do not move. What
changes is that this corpus is not the instrument that tests them, and no amount of care applied to it
will make it one. **Round 2 acquisition — deposits drawn without reference to any allegation — is the
only instrument, and it is now a v1.0 blocker.**

### The rule this yields

**Before a measurement runs, ask what the answer would look like if the tool were perfect, and whether
this instrument could produce that answer.** Here a perfect tool returns a low rate, and this corpus
cannot distinguish a perfect tool from one that misses everything. Thirty seconds of that check against
forty-one minutes of compute and a session of attention.

**And the sharper half: finding an objection and filing it as a caveat is the same as missing it.**
§5 contains the whole argument for stopping. It was written, read, approved, and carried forward as a
note on how to read the result.

---

## 8. Correction — written at S380, after Nick's reminder that the corpus is a list of independently flagged files

**§1 to §7 are not edited.** §7 set that rule for itself and it applies here: the error stays visible
above and the correction sits below it. **§7 fixed the reasoning and left the words in place, and this
section is largely about what that cost.**

### 8.1 The vocabulary was wrong, and the vocabulary is what propagated

§1 clause 3 reads: *a deposit is an honest trial if the allegation against it is unverified.* **That
definition conflates "not yet confirmed" with "not defective", and they are not the same thing.** An
unverified allegation is an allegation. §2 then labels twelve rows *honest trial*, §3 calls the result
*the honest denominator*, and the title carries it too.

**Checked at source S380: twelve of the twelve carry a PubPeer thread.** C07, C09, C10, C13, C14, C15,
C17, C18, C19, C20, C22, C24 — every one. §5 says this plainly (*not one is a deposit nobody has
complained about*) and §7 repeats it (*these deposits are not honest files*). **Both were right, and
neither changed the word.**

So the word travelled, and it travelled as a claim:

- into `SESSION379-CHAT-SUMMARY.md` and the S380 opener, as *the honest denominator is twelve*;
- into `STATUS.md`, in roughly seventy places;
- into **P185's register row at S380**, which described a census over *the twelve honest deposits*;
- into the run artifact's own filename, **`corpus-out/s379-honest-run.json`**, which cannot be corrected
  without invalidating every reference to it.

**The rule: when a correction overturns a concept, change the word in the same edit.** A term left
standing carries the old concept into every document that quotes it, and a reader has no way to know
the reasoning beneath it was withdrawn. §7 is the demonstration — it is a complete and correct
retraction, and it failed to stop the error spreading for two sessions.

### 8.2 The corpus is not defective, and it was never mis-selected

§7 says *no selection rule applied to it can produce an honest arm*. **That is true, and it reads as a
fault. It is not one.**

`REALWORLD-CORPUS-SPEC.md` states its purpose in its own header: *labelled external datasets with
third-party ground truth, an adjudication protocol that distinguishes true detection from false
positive without overclaiming intent, and the adjudicated Tier-1 results that become the paper's
real-world section.* **It is a sensitivity instrument. Every row is keyed to a documented defect
because that is the job.** It does that job, and this measurement's twelve are simply the part of it
we had not adjudicated yet.

**The category error was in the request, not in the corpus.** Asking a labelled positive set for a
false-positive rate is asking an instrument for a quantity it was not built to produce — which is a
different failure from building the instrument badly, and it needs a different remedy.

**The rule: a finding that an instrument cannot answer a question should name the instrument the
question needs, rather than fault the one in hand.** §7 named round 2 correctly and still described
the existing corpus as though its construction were the problem.

### 8.3 Round 2 is a second instrument — and the tolerance is the wrong argument for it

§7 makes acquisition a v1.0 blocker on the strength of the tolerance. **That argument does not survive
this document's own §4 table.** The severity-2/3 bound is under 1%, and §4 gives 1.0% at **n = 300**.
An acquisition justified on demonstrating the tolerance therefore needs roughly three hundred clean
deposits and **has no completion condition** — which is how a blocker becomes permanent.

**The argument that works is gross malfunction.** Measured at S380 on these same twelve: **Selective
Noise fires on 25 of the 26 sheets it reaches**, 23 of them HIGH. **Nothing currently in the project
can distinguish that from a test that fires on everything**, and a test that fires on everything
carries no information whatever the verdict ladder does with it.

**That question has an end.** Roughly thirty honestly-sampled deposits settle it decisively in either
direction, and **either answer changes what ships** — if the rate holds, the tool has a defect no
documentation covers; if it collapses, this corpus's saturation was selection and the tool is sound.

**The sampling rule, fixed here and before any deposit is acquired**, per S374 and per §0's own remedy:

1. **Deposits drawn without reference to any complaint** — by deposit date, or at random from a
   repository's index. **Never from a flag list, a thread, or a curated set.**
2. **n and the rule are committed before the first file is downloaded**, with the hash quoted in the
   dispatch. §0 records that this document failed exactly that ordering; the remedy was already named
   and this is where it applies.
3. **The screen's question is stated in advance:** does the battery fire on deposits nobody has
   questioned, and at what rate. **Not** the tolerance — that bound remains undemonstrable by
   observation and, per S374, ships as a stated gap.

### 8.4 What still stands from §7

**Everything except the framing.** *This corpus cannot measure specificity at any n* is correct.
*Before a measurement runs, ask what the answer would look like if the tool were perfect, and whether
this instrument could produce that answer* is correct and is the arc's most useful rule.
**Finding an objection and filing it as a caveat is the same as missing it** is correct — and §8.1 is
its second instance in the same file, because §7 found the vocabulary problem, stated it twice, and
filed it as prose rather than fixing the word.
