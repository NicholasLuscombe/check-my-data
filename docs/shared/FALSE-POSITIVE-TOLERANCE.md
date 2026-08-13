# False-positive tolerance

**Status: DECIDED at S374, 14 August 2026. Fixed in advance of the measurement and not to be moved.**
Proposed S356. **Amended at S358** — §2 gains the distinction between a false positive that comes from
the data and one that comes from our own null, with the first measured instance; §6 gains the nulls as
a property the number will carry. **Amended at S365** — §6's pooled-dependence bullet reframed: the
count of instances is open, and two of them manufacture a signal rather than losing one. **Decided at
S374** — §0 records what was settled, §5 states the two bounds as decisions rather than proposals, and
§7 is new.

**Corrected twice at S374.** `28c5f40` was written against a copy of this file that predated the S365
amendment and silently dropped it, restating the count as five and the manufacturing instances as one.
`fcb042a` restored the amendment from `METHODOLOGY.md` rather than from this file, and lost the
consequence clause — that instance 4's manufacturing half is one line from firing, which is what ties
this section to P119. The third commit restores §6's nulls bullet verbatim. Each correction is its own
commit, never an amend.

**Why this commits before the rate is measured.** The rule in §3 is that the tolerance is fixed in
advance and never moved. A document that lives in a chat window cannot evidence that. It has no date,
and it can be quietly revised once the number arrives, which is the exact failure it exists to prevent.
The commit is the evidence.

---

## 0. What was decided

Five decisions, all Nick's, all taken before any rate was measured.

- **The bound sits on the file verdict, not on individual tests.** §4.
- **Severity 2 or 3: under 1% on honest data.** §5.
- **Severity 1: under 10%, and it is a bound rather than a reported rate.** §5.
- **A correct flag on an honest error counts against the bound.** §5. The report cannot tell the user
  which of the two it found, so the tool cannot claim the distinction.
- **The bound applies to the combined figure; the split is published beside it.** §2. One number over
  both kinds would let the manufactured kind hide inside the explainable kind. Two numbers with no
  bound over either would let the tool pass on the half it chose.

**And one thing recorded at the same time, so that it cannot be discovered later and argued with.**
§7 states what a corpus of this size can demonstrate. At the counts we hold, neither bound is
demonstrable by observation. That does not move either bound. It fixes in advance which of §3's three
answers v1.0 is heading for: **ship with the gap stated.**

**Still open, and not gating anything:** §8.

## 1. Who the tool is for

**The primary user is a researcher checking their own data before it is deposited or submitted.** The
tool is called Check My Data. That has been the position since the name was chosen and this document
had drifted away from it.

That user has what nobody else has: the notebook, the protocol, the instrument log, and the memory of
what was done. When the tool surfaces a pattern, they can usually explain it in a minute — *that is the
loading-control normalisation*, *those two columns are x and y from the same trace*, *that block was
re-run on a different day*. The tool asks a question and the only person who can answer it is holding
the answer.

**The second user is an editor, reviewer or integrity officer running it on someone else's deposit.**
This use is real, it cannot be prevented — the tool is public, client-side, and deposited data is
public — and it is where the cost of being wrong lands on someone who cannot reply.

**The tolerance is set by the second user even though the tool is designed for the first.** You cannot
ship something and rely on people using it the gentle way.

## 2. What follows from the primary framing

**A flag is a question, not a finding.** The report must never conclude fabrication. It reports a
pattern and asks for an explanation. This is a writing constraint on every surface, and it does more to
protect the second user than any threshold does.

**Structure in honest data is not a defect of the data.** The tool detects structure. Real experiments
have plenty of it — shared normalisation, batch effects, instrument drift, replicate design. Some of
what we currently count as a false positive is the tool correctly finding a real feature that the owner
can name. That does not make the flag free: it costs attention, and attention is the budget.

**And some of it is neither.** A false positive can come from the tool's own null rather than from
anything in the data. **DS12b's Regional Noise MODERATE is the first one adjudicated from a fixture's
construction.** The file is 200 honest rows of log-normal noise followed by 200 fabricated rows of
uniform noise on the same base means. Neither half flags alone — 4.89× at p = 0.092 and 2.64× at
p = 0.778 — and pooling one permutation null across the two noise regimes gives 7.83× at p = 0.010 and
a flag. The firing localises to rows 51–65, inside the honest half, at every seed offset. Nobody owns
an explanation for that one, because there is nothing in the data to explain.

**The two kinds are reported separately and bounded together. Decided S374.** A flag on a real feature
the owner can name is the tool working, and the cost is an hour. A flag manufactured by the tool's own
null is the tool broken, and no amount of user expertise retires it. So publish both counts. But the
bound in §5 applies to their sum, because the user experiences the sum — they do not get told which
kind arrived.

**Each flag counted in the measurement needs an adjudication, and that is a cost of the run rather
than a detail of it.** The split cannot be computed; somebody has to look at each firing and say which
kind it is. Size that before the run, not during it.

**"Fabrication signatures" is the wrong vocabulary for the primary user**, and it is on every surface.
Worth a pass, separately from this document.

## 3. The rule

**Set the tolerance before the rate is measured. Never move it afterwards.**

If the measured rate misses the tolerance, there are three answers: fix the tool, restrict its claims,
or ship with the gap stated. The answer is never to widen the tolerance. Choosing the number after
seeing the result fits a threshold to the thing it was meant to judge, which is how the *s*-gate died.

## 4. Where the bound goes

**On the file verdict, not on individual tests.** A user experiences one verdict, not 29 p-values.

And the file rate cannot be derived from a per-test rate. Twenty-nine tests at 1% each would land near
25% at file level if they were independent. They are not independent, so the true figure is unknown and
must be measured directly. A per-test bound would look reassuring and mean nothing.

**The measurement still attributes per test.** That is a different thing from bounding per test: the
bound is what the tool is held to, the attribution is how we find out which test to fix.

## 5. Two bounds, and they are bounded by different things

**Severity 2 or 3 — the tier that travels. Under 1% on honest data.** This is the reading someone
forwards, quotes, or attaches to a query. Its cost is borne by the second user's subject, who cannot
answer back. Bounded by harm.

**Severity 1, "minor anomalies detected" — the tier that stays home. Under 10%.** Its cost to the
primary user is an hour of looking, and often that hour is well spent even when nothing is wrong.
**This tier is not bounded by harm. It is bounded by information.** A tier that fires on a quarter of
honest files teaches the user to dismiss it unread, and then it carries nothing at all. The constraint
is that seeing it should change what a reasonable person does next.

**Severity 1 carries a bound rather than a bare reported rate. Decided S374.** A number the tool can be
held to is worth more than a figure that floats. The information argument above stands on its own and
borrows nothing from harm, which is the point of keeping the two reasonings apart.

**The reasoning behind the two is different and stays different.** Arguing the severity-1 number from
harm imports the accusation frame where it does not belong.

**A correct flag on an honest error counts against the bound. Decided S374.** A real mistake that is
not fabrication is still a firing the report cannot label, so the tool gets no credit for the
distinction. This is a judgement about what the tool claims, not about statistics.

## 6. What the number will be a property of

State these beside the figure when it is published, or the figure misleads.

- **The corpus it was measured on, and its size.** A real deposit is only *not known to be fabricated*.
- **The resolution.** §7's limit, quoted with the denominator.
- **The gates, not the statistics.** With every effect-size gate removed, five of eight clean fixtures
  return non-clean. The gates carry the specificity.
- **Five of seventy constants have a basis that survives inspection.**
- **One run.** A false-positive rate is a property of a run, not of a file. **This is why verdict
  stability comes first: a rate cannot be bounded while the answer changes on a seed.** It also matters
  more under the primary framing, not less — the author who is unsure will run it twice.
- **The nulls, and specifically the places where they assume an independence the data does not have.**
  Pooled dependence has five examined instances (METHODOLOGY §Pooled Dependence) **and the count is
  open** — `METHODOLOGY-TESTS.md:549` documents a sixth occurrence of the same pattern that has never
  been assessed against it (P125). **Two of the five manufacture a signal rather than losing one, and
  only one of those two reaches a flag.** Instance 5 fires. Instance 4's manufacturing half is held
  back by a single directional comparison, and **a suppressed false-positive mechanism is still a
  false-positive mechanism** — this one is one line from firing. A rate measured before those are
  settled prices the nulls we happen to ship today.
- **The split.** §2's two kinds, counted separately under the combined bound.

## 7. What this corpus can demonstrate — recorded S374, before the run

**Neither bound is demonstrable by observation at the counts we hold.** This is arithmetic about the
denominator and it is fixed the moment the corpus size is fixed. It is recorded here so that it cannot
arrive later as a reason to move a number.

The honest-file count for the run is not yet fixed. The S373 census read nineteen deposits and eight
update pairs; seven ecology files are released. **Count it before the run and state it beside the
result.** Whatever it turns out to be, the table below is what a clean result buys.

One-sided 95% upper confidence limits, Clopper-Pearson, for *k* flags observed in *n* honest files:

| *n* | *k* = 0 | *k* = 1 | *k* = 2 |
|---|---|---|---|
| 25 | 11.3% | 17.6% | 23.1% |
| 27 | 10.5% | 16.4% | 21.5% |
| 30 | 9.5% | 14.9% | 19.5% |
| 50 | 5.8% | 9.1% | 12.1% |
| 100 | 3.0% | 4.7% | 6.2% |
| 300 | 1.0% | 1.6% | 2.1% |

**Read three things off it.**

- **The 1% bound needs about 300 honest files with nothing firing.** We are two orders of magnitude
  short. No arrangement of the corpus we hold can demonstrate it.
- **Even the 10% bound is out of reach at these counts.** Around thirty files with zero severity-1
  flags gets to 9.5%. One flag at thirty takes the limit to 14.9%. Severity 1 is expected to fire, so
  in practice the run will not clear 10% by observation either.
- **A point estimate is not a bound and must never be reported as one.** Zero of twenty-seven is a
  point estimate of 0% and an upper limit of 10.5%. The second number is the honest one.

**What this fixes in advance.** Under §3, missing a tolerance has three answers, and the answer here is
already known: **ship with the gap stated.** v1.0 reports the point estimate, the interval, the
denominator, and a plain sentence saying the corpus is too small to demonstrate either bound. The
bounds stay where they are, and they stay as the standard the tool is held to when a corpus large
enough exists.

**Growing the corpus is the only thing that changes this**, and it is not on the road to v1.0. Recorded
here so that the arithmetic is on the file rather than in somebody's head.

## 8. Still open, and not settled here

Neither gates the measurement.

- **Whether the accusatory bound is per file or per deposit**, where a deposit carries several files.
  A deposit-level bound is stricter and is closer to how the second user works, but the tool's unit is
  a file and it has no deposit object.
- **Whether the second user should be designed for explicitly** — a different report, a stated scope,
  or a refusal to produce a shareable verdict at all.
