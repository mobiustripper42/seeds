---
id: DEC-S045
title: "Capture is a hook, distillation stays a ritual — the loop's front end stops depending on memory"
topic: "Agents & review"
amends:
  - id: DEC-S039
    relation: refines
    scope: "the trigger for evidence capture only; the observation/promotion split, @tape-reader's job, and @workout's manual cadence are unchanged"
  - id: DEC-S023
    relation: extends
    scope: "adds a user-global-only hooks stanza to the hand-distribution list; the permission policy itself is untouched"
---

## DEC-S045: Capture is a hook, distillation stays a ritual — the loop's front end stops depending on memory

**Decision:** Cut the learning loop one level below where DEC-S039 cut it. **Evidence capture** becomes a deterministic `SessionEnd` hook — `dev/claude/scripts/tape-capture.sh`, wired in each machine's **user-global** `~/.claude/settings.json` — which copies the ending session's transcript into `~/.claude/tape-queue/` and appends one line to `index.jsonl`. **Distillation** and **promotion** stay exactly as manual as they were: `/read-the-tape` gains a `--queue` drain mode run on a human cadence, and `@workout` is untouched.

The hook makes no model call, needs no seeds checkout, touches no repo, and makes no judgment. It stages bytes.

**The problem.** DEC-S039 bet the loop on rituals, and named *"the ritual doesn't happen"* as risk #1. For the **judgment** half that bet is sound — if `/workout` slips a week, observations pile up harmlessly on a branch and nothing is lost. For the **capture** half it is not, for two independent reasons:

1. **The evidence expires.** `cleanupPeriodDays` defaults to **30**, and Claude Code deletes session files older than that *at startup*. A session you did not tape within the month is not a delayed observation, it is a deleted one. Confirmed against the docs and against this machine, where the oldest surviving transcript on 2026-08-13 was 20 days old and nothing earlier remained.
2. **The filter drops the wrong sessions.** "Run it after a session worth learning from" asks a human to predict, from memory, which sessions carried an anti-pattern — but the sessions that carry unrecognised anti-patterns are precisely the ones nobody suspected. Moving that call to distill time makes it a decision against evidence instead of a guess.

**Why a hook and not a better-remembered skill.** DEC-S041 already reached this conclusion — *"reach for a mechanism the model cannot skip"* — and then spent it on the `/kill-this` failure it happened to be investigating, leaving the auditor's own trigger a skippable command. **The loop that studies skipped rituals was itself gated on one.** A skill, or an opt-out default inside `/its-dead`, is still model-invoked and can be drifted past by a session in a hurry to finish. The harness runs a hook regardless.

**This does not reopen DEC-S038, and the distinction is the whole argument.** What was retired was unattended *judgment* — a nightly Routine opening and merging sync PRs in both directions, which needed elaborate safety rules precisely because a bot cannot tell a real improvement from stale drift. This schedules nothing, opens no PR, merges nothing, writes no policy and reads nothing. The reflex the Routine left behind — *automation bad, ritual good* — is a good reflex pointed at the wrong target: pure factual byte-capture is the ideal automation case, not a forbidden one. The fence stands where it was built.

**Why it copies rather than only indexing.** An index alone would be cheaper and would leave the queue pointing at files that vanish on day 31 — handing back a deadline to remember, which is the failure being removed. Measured cost: 58 ms to copy the largest transcript in the corpus (8 MB); typical is ~800 KB. `SessionEnd` hooks share a **1.5-second budget as a group**, so a copy fits with room to spare and nothing else may be added — no scanning, no compression, no model call.

**Coverage is partial, will look complete, and must be stated wherever the queue is described.** The hook captures sessions ending on a machine with a durable filesystem. Cloud-container sessions cannot be captured at all — the filesystem dies with the container — and a box without the install captures nothing. Of the 18 sessions in seeds' own log on 2026-08-14: **12 ran in cloud containers, 3 on the windows laptop, 2 on mill-dev.** A full-looking queue is coverage of the boxes you installed on, and reading it as coverage of your work would be the natural mistake.

**What is deliberately not solved:**

- **The queue is a staging area, not the record.** It is local and unpushed; a machine lost before a drain loses it. Strictly better than the current state, which captures nothing, and the durable artifact is still the observation on the `observations` branch once drained. Stated rather than engineered around.
- **Distillation volume rises**, since boring sessions queue too. That is the point — the "worth learning from" filter was the defect — and clean runs stay one line, as the spec already requires. If noise climbs, let the drain skip trivially short sessions; do not restore a human pre-filter.
- **`jq` is a hard dependency.** Without it the script exits silently, because a `SessionEnd` hook cannot block a session (exit 2 only prints to stderr) and so *every* failure here is silent by construction. The only signal that capture works is the queue filling up, which is why the README says to check it.

**`@tape-reader` is unchanged.** DEC-S039's non-goal — "no change to what the observer looks for" — holds. Only the driver changed.

**Schema:** additive. `read-the-tape/SKILL.md` gains a mode; no project is required to install the hook, and one that doesn't is exactly where it is today. No version bump.

**Alternatives considered:** a `Stop` hook as well as `SessionEnd` (rejected for now — `Stop` fires every turn, so it would re-copy a growing transcript dozens of times per session for a hypothetical gain; capture is idempotent on `session_id`, so adding it later is a one-line change, and this repo asks for the observed failure first). An opt-out prompt in `/its-dead` (rejected — model-invoked, the exact antipattern). Index-only, no copy (rejected — see above; it reinstates the deadline). Putting the stanza in the master `settings.json` (rejected — that master is also the source for each repo's committed copy, which reaches the cloud container where the hook is dead weight pointing at an absent script).
