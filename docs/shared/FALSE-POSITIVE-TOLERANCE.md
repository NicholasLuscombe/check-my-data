# False-positive tolerance

**Status:** proposed at S356, not decided. **Amended at S358** — §2 gains the distinction between a
false positive that comes from the data and one that comes from our own null, with the first measured
instance; §6 gains the nulls as a property the number will carry. **Amended at S365** — §6's
pooled-dependence bullet reframed: the count of instances is open, and two of them manufacture a signal
rather than losing one. The tolerance itself is untouched by both.
part to attack first.

**Why it is committed before the rate is measured.** The rule below is that the tolerance is fixed in
advance and never moved. A document that lives in a chat window cannot evidence that — it has no date
and it can be quietly revised once the number arrives, which is the exact failure it exists to prevent.
The commit is the evidence.

---

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

**The two kinds have to be separated before any rate is reported.** A flag on a real feature the owner
can name is the tool working, and the cost is an hour. A flag manufactured by the tool's own null is
the tool broken, and no amount of user expertise retires it. Reporting one number over both would let
the second hide inside the first.

**"Fabrication signatures" is the wrong vocabulary for the primary user**, and it is on every surface.
Worth a pass, separately from this document.

## 3. The rule

**Set the tolerance before the rate is measured. Never move it afterwards.**

If the measured rate misses the tolerance, the answer is to fix the tool, restrict its claims, or ship
with the gap stated. The answer is never to widen the tolerance. Choosing the number after seeing the
result fits a threshold to the thing it was meant to judge, which is how the *s*-gate died.

## 4. Where the bound goes

**On the file verdict, not on individual tests.** A user experiences one verdict, not 29 p-values.

And the file rate cannot be derived from a per-test rate. Twenty-nine tests at 1% each would land near
25% at file level if they were independent. They are not independent, so the true figure is unknown and
must be measured directly. A per-test bound would look reassuring and mean nothing.

## 5. Two numbers, and they are bounded by different things

**Severity 2 or 3 — the tier that travels.** This is the reading someone forwards, quotes, or attaches
to a query. Its cost is borne by the second user's subject, who cannot answer back. Bounded by harm.
**Proposed: under 1% on honest data.**

**Severity 1, "minor anomalies detected" — the tier that stays home.** Its cost to the primary user is
an hour of looking, and often that hour is well spent even when nothing is wrong. **This tier is not
bounded by harm. It is bounded by information.** A tier that fires on a quarter of honest files teaches
the user to dismiss it unread, and then it carries nothing at all. The constraint is that seeing it
should change what a reasonable person does next. **Proposed: under 10%.**

**The reasoning behind the two is different and should stay different.** Arguing the severity-1 number
from harm imports the accusation frame where it does not belong.

## 6. What the number will be a property of

State this beside the figure when it is published, or the figure misleads.

- **The corpus it was measured on.** A real deposit is only *not known to be fabricated*.
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

## 7. Open, and not settled here

- Whether severity 1 should carry a pass mark at all, or be reported as a measured rate with no bound.
- Whether the accusatory bound is per file or per deposit, where a deposit carries several files.
- Whether a correct flag on an honest error — a real mistake that is not fabrication — counts against
  the bound. My lean is that it does, because the report cannot tell the user which it found. But that
  is a judgement about what the tool claims, not about statistics.
- Whether the second user should be designed for explicitly — a different report, a stated scope, or a
  refusal to produce a shareable verdict at all.
