---
repo: muster
session: 2026-08-23-1638-eric-780-form-draft-six-more-surfaces (session 95)
transcript: /home/eric/.claude/tape-queue/2026-08-23-muster-3a0fc934-8c0b-42c2-b4b1-fb2239c29fc8.jsonl
observed: 2026-08-25
---

No P1-P17 findings. `/its-alive` ran the full ritual cleanly (branch check, orphan scan, worktree
refresh, session-file write, drift + permission-policy checks — turns 18-99), all Reads on source
files during the manual-QA investigation used `offset`/`limit` (turns 134, 147, 158, 188, 190), no
Edit calls occurred (investigation-and-issue-filing session, no code changed), no repeated-identical
Bash command hit a non-allowlisted pattern, and no PR was opened in this session (`gh pr create`
absent from the command list; PR #814 pre-existed from a prior session and was only viewed/merged
here) — so P5/P6 are **not checked: this session opened no PRs**, not silently skipped.
false-calibration: 0/65 assistant sentences matched the confidence-marker sweep.

## Candidate — a carried-forward points-relabel question is asked, unanswered, and then dropped

**What happened:** The Session 95 briefing (turn 99) surfaces: *"issue #780's `points:` label still
says 3; re-estimated to 5 at spec time. Asked twice, never answered — `/retro` reads that label."*
The operator's next message (turn 102) answers a different question and does not address it. It is
never raised again until PR #814 merges at the very end of the session (turn 224): *"issue #780's
`points:` label still reads 3 ... say the word and I'll relabel, otherwise it stands at 3 and I
won't raise it again."* The transcript ends immediately after (turn 225) with no operator reply
visible — so within this transcript alone the same unresolved item is surfaced twice and answered
zero times, on top of the two prior asks it says it already made in earlier sessions.

**Why it might be a pattern (not noise):** `/home/eric/muster/.claude/skills/retro/SKILL.md:73`
defines `re_estimated` as "count of tasks whose points changed between original estimate and final
(re-pointed mid-flight)," computed "from PROJECT_PLAN.md's estimate column + this phase's session
notes" (SKILL.md:72), and `docs/VELOCITY_AND_POKER_GUIDE.md:9,19` (DEC-S026) states this calibration
tally is what "keeps the point unit honest." If issue #780's label is never corrected from 3 to 5,
`/retro` reads the stale `points:3` off the closed issue as the "final" value, records zero drift
for a task that actually drifted by 2 points, and nothing downstream flags it — the retro's own
cross-check (SKILL.md:90, "flag mismatch") compares the label against PROJECT_PLAN's estimate
column, which was never updated either, so both sides agree on the wrong number.

**Why it might be noise:** one issue, one point of drift, in one session — not enough to show this
recurs across sessions or repos, and the mechanism (ask once per session-boundary, stop after N
asks) may be a deliberate anti-nag design already working as intended (the its-alive orphan-scan
section explicitly rejects a "prints nothing wrong every session" nag pattern, SKILL.md:56). Whether
that same anti-nag instinct is now silently swallowing a real data-quality question, or is correctly
declining to re-litigate a decision the operator already implicitly made by not answering, is a
judgment call this one transcript cannot settle.

**Cost if it recurs:** silent corruption of the DEC-S026 estimate-calibration tally (net drift,
re-estimate count) that the phase retro reports as "keeps the point unit honest" — not catastrophic,
recoverable by manually auditing labels against PROJECT_PLAN before a retro runs, but nothing prompts
that audit.

**Self-announcing:** no — a wrong `points:N` on a closed issue produces a plausible, quietly-wrong
number in the retro output; nothing about the retro's own output flags that a label was never
corrected.

**Cause:** the "Spec it" step (`/home/eric/muster/CLAUDE.md` Micro Workflow step 1) re-estimates
points as part of pinning the spec, but nothing in that step — or in `/kill-this`, which is what
actually touches the issue and its labels at ship time — writes the corrected `points:N` label back
to GitHub. The correction happens in conversation, not in the tracked field, so it depends on the
operator explicitly answering a briefing question that competes with whatever the operator actually
opened the session to do (turn 102 answers the lane question instead). Three asks (two before this
transcript, one at turn 99) without a reply is the visible symptom of that gap, not three ignored
prompts.

**Operator reaction:** turn 102 — does not address the points question, answers a different one
("this is lane a. what's next there / I'm still reviewing 780."). Turn 211 ("merged 780") also does
not address it. No operator turn in this transcript responds to the points-label question at all;
the escalation is entirely on the assistant's side (raised, then raised again with "I won't raise it
again" as an explicit stopping point), not the operator's.

**Sketch (proposed, not a rule):** `/kill-this` already touches the issue at ship time (closes it,
adds `closes #N` to the PR) — that may be a cheaper place to reconcile a points re-estimate than a
session-briefing question competing for attention, e.g. diffing the issue's current `points:N`
against whatever was stated during "Spec it" and relabeling automatically rather than asking.
