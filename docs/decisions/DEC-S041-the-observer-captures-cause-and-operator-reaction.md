---
id: DEC-S041
title: "The observer captures cause and operator reaction — both perish with the session, and severity cannot be judged without them"
topic: "Agents & review"
---

## DEC-S041: The observer captures cause and operator reaction — both perish with the session, and severity cannot be judged without them

**See also** — decisions this one changed part of:
- Refines DEC-S039 — adds a third severity input and a cause field at capture time; the cost/detectability axes and the no-count rule stand unchanged

**Decision:** `@tape-reader` records two more things per finding, both cited, neither a proposal:

1. **Cause** — what the actor was doing instead, and what made the wrong path the natural one.
2. **Operator reaction** — every operator turn responding to the failure, quoted verbatim with its
   turn number. All of them, not the first one.

`@workout` weighs operator reaction as a **third severity input** alongside cost and detectability.

### What went wrong

The first cycle promoted the right pattern and produced the wrong fix.

`@workout` judged correctly on the DEC-S039 axes: `/kill-this` bypassed, irreversible (a PR merged
unreviewed, four defects reached the operator), silent (nothing flagged it). Single sighting,
correctly promoted, correctly reasoned. Then its fix was a sentence of prose forty lines from an
existing rule that had already failed, plus a detector that fires at session close — after the merge
it exists to prevent.

**Not a count problem.** DEC-S039 is right that severity decides and repetition is only evidence
about it; this failure looks identical at cycle fifty. Two specific things were missing.

### One: nobody asked why

`@tape-reader` holds the transcript and is told to observe rather than propose. It read that as *do
not analyse*, and recorded what happened without recording why. `@workout` never sees a transcript,
so it cannot recover the answer at any cycle count. Nothing in the loop asks the question.

The actual cause took four greps of the JSONL. `/kill-this` ran exactly once — immediately after the
only operator message containing a ship instruction ("yes 660 update and open"). Every other
operator turn was a task *start*: "654", "go", "644 go". Claude was using its own judgment that a
task looked done as the trigger to ship, and once you self-trigger you are mid-flow, so you continue
straight through: commit, push, `gh pr create`, next task. The skill was not forgotten. **There was
never a pause at which invoking it could occur** — and no step in the workflow said to stop.

A fix written without that lands on the symptom. It did.

**A sketch and a cause are different objects.** DEC-S039 correctly defers the *sketch*, because a
proposed fix from one session anchors a judgment that should see the problem from several angles.
A cause is not a proposal — it is the most perishable evidence in the transcript, and deferring it
means losing it.

### Two: the operator's own reaction is severity data, and most of it was dropped

The session carried four escalating operator turns about this failure. The observation captured the
first and none of the rest:

| turn | quoted |
|---|---|
| 1688 | "you skipped kill this!" — captured |
| 1705 | "and a code review ... and who knows what else ... because you just skipped it" — dropped |
| 1785 | **"I have zero faith these PRs are correct given you didn't run kill -this"** — dropped |
| 1858 | "I think we are probably supposed to run a code review ultra ... which you have missed also" — dropped |

The escalation is the finding. A single correction is a nudge; the same person raising it four times,
arriving at *zero faith in the shipped artifacts*, is a severity reading no derived metric produces.
It is also the clearest possible evidence that prose will not hold the rule — the operator said it
out loud, in the session, and the next three PRs still shipped by hand.

**Why it must be captured rather than inferred:** it perishes exactly the way detectability does.
Whether a human stopped work to object, and how hard, is a fact about *that session*. No later
reader reconstructs it, and no ledger row implies it.

### The third axis

DEC-S039's two axes both concern the next occurrence. This one concerns the one already seen:

**Reaction — did the operator have to intervene, and did intervening work?** An operator correction
means the guardrails did not hold and a human became the guardrail. An operator correction that is
then *ignored* — the failure recurring after it — means prose has been empirically tested and lost.
That is not a reason to write firmer prose. It is the signal to reach for a mechanism the model
cannot skip.

Priority when the axes disagree: **a failure that made the operator lose confidence in shipped work
is severe regardless of what the cost/detectability table says.** The table's job is judging
patterns nobody noticed. This axis exists for the ones somebody did.

### What this does not change

Promotion is still a severity call and never a count (DEC-S039). Sketches are still deferred and
still labelled. Clean runs still emit an observation. `@tape-reader` still edits nothing (DEC-S040) —
this adds fields to what it writes down, not permission to act on any of it.

**Spec:** `docs/SPECS/2026-08-workflow-learning-loop.md`.

**Schema:** no bump. Two fields added to a file format on a branch nothing reads at session time; no
project's on-disk contract changes.
