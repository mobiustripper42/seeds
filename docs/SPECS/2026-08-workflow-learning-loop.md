# Workflow learning loop — observation, accrual, promotion

**Status:** Draft — not implemented
**Owner:** @architect
**Implements:** DEC-S039
**Date:** 2026-08-06

## Goal

Make workflow improvement accumulate instead of evaporating. A session's evidence survives the
session, reaches seeds, and is promoted to a rule when its severity warrants it — with the promotion
visible in one reviewable artifact per cycle.

Target, measured after two cycles: every template change merged from `@workout` cites at least one
observation, and no candidate pattern is lost to a `/pull-seeds` overwrite.

## Non-goals

- **No scheduled automation.** `@workout` is invoked by hand. This is not the nightly Routine
  returning under a new name (DEC-S038).
- **No count threshold.** Promotion is a severity call (DEC-S039). `@workout` argues each case
  against the cost/detectability axes; it does not tally occurrences and compare to a number.
- **No change to what `@tape-reader` looks for.** P1–P17 and the cite-guard (DEC-S032) stand. This
  changes where findings *go*, not how they are found.
- **No cross-repo automation of the write.** How an observation physically reaches seeds is Phase 1's
  open question, and the first cut can be manual.

## The three surfaces

| Surface | Runs where | Produces | Edits |
|---|---|---|---|
| `/read-the-tape` → `@tape-reader` | in a project | observations + local fixes | project-owned files only |
| `observations` branch | seeds | the accumulating record | nothing — it is data |
| `/workout` → `@workout` | in seeds | one PR against `main` | `dev/claude/**` |

## Phase 1 — `/read-the-tape` becomes an observer

**Narrow what it may edit.** Split the current Step 5 by file class (DEC-S018), which the agent must
resolve from `<seeds>/.claude/routine-config.yaml` rather than guess:

- **project-owned** (`.claude/settings.json`, the DEC-S035 reviewers) → propose, `y/n`, apply, as
  today. Unchanged behaviour.
- **`logic` class** (skills, `sync-config`, `tape-reader`, `ideas`) → **never edited.** Becomes an
  observation.

**Delete Step 7's instruction to edit `tape-reader.md` in the project.** That is the erasure path
DEC-S039 names. Candidate patterns become observations like everything else.

**Emit an observation file** per run, even when nothing was found — a clean run is evidence that a
pattern has stopped recurring, which `@workout` needs in order to retire a rule. Proposed shape:

```markdown
---
repo: muster
session: 2026-08-04-1130-eric-time-clock
transcript: ~/.claude/projects/…/abc123.jsonl
observed: 2026-08-06
---

## P8 — Full session-log read when only recent entry needed  ·  medium

**Occurrences:** 3
**Cost if it recurs:** wasted context; recoverable — nothing wrong was produced
**Self-announcing:** yes — the redundant read is visible in the transcript
**Evidence:**
- `Read docs/PROJECT_PLAN.md` (full, 412 lines) — turn 14, needed only the Phase 12 rows
- …

**Sketch (proposed, not a rule):** `/its-alive` Step 5 could grep the phase heading instead.

## Candidate — <one-line description>

**Why it might be a pattern:** …
**Why it might be noise:** …
```

Three constraints on that shape, all load-bearing:

1. **Every occurrence carries a citation** — a turn, a tool call, a `file:line`. DEC-S032's
   cite-guard already requires this for findings; it now also gates what may be written to the
   record. No citation, no observation.
2. **A proposed fix is a *sketch*, marked as such.** Including it preserves context that is cheap
   now and expensive to reconstruct later; marking it stops `@workout` anchoring on the first
   session's framing of a problem it will see from three angles.
3. **Cost-if-it-recurs and self-announcing are recorded at capture time.** They are the two inputs
   to the severity call (DEC-S039), and the observer is the only one positioned to answer the
   second: whether a failure surfaced on its own or was caught by someone reading carefully is a
   fact about *this* session that no later reader can reconstruct. Getting it wrong is the
   difference between a rule written on one sighting and a pattern that quietly never accumulates
   evidence at all.

**Open question for Phase 1:** how the file reaches seeds. Candidates — a direct push to the orphan
branch from the project session (needs cross-repo auth, which CC has); writing to a local
`.observations/` that a later seeds session collects; or `/push-seeds` carrying it. Start with
whichever is least machinery; the branch layout does not depend on the answer.

## Phase 2 — the `observations` branch

Orphan branch in seeds, created the same way as a project's `sessions` branch (DEC-S014), reachable
via a `.observations-worktree/` checkout that `main` gitignores.

```
observations/
  2026-08-06-muster-time-clock.md
  2026-08-06-bushel-catalog-units.md
  archive/
    2026-07/…            # promoted or dismissed, moved by @workout
```

Append-only by construction: one file per run, named for date + repo + slug, so two projects writing
the same day never touch the same path. No index, no generator, nothing to keep fresh — the
properties that make `docs/decisions/` need a gate are exactly the ones this avoids by not being a
record anyone cites.

## Phase 3 — `@workout`

Runs in seeds. Reads `observations/` (excluding `archive/`). Model: Opus — this is the judgment
step, and it is the one place in the loop where being wrong is expensive.

1. **Group by pattern across repos and dates.** This is the capability `@tape-reader` structurally
   lacks.
2. **For each group, make the severity call** — not a count. Per DEC-S039: what does the next
   occurrence cost, and would it announce itself? Irreversible or silent earns a rule on one
   sighting; recoverable and self-announcing waits for repetition. Frequency is evidence about
   whether a thing is systemic, never the decision itself.

   Then: promote / hold / dismiss.
   - *Promote* — the fix is clear and a template can carry it. State which cell of the DEC-S039
     table the pattern is in and why.
   - *Hold* — real, but the right fix is not obvious, or it is recoverable and has been seen once.
     Stays unarchived.
   - *Dismiss* — noise, or a project-specific artifact misfiled as general. Archived with a reason.

   **A single-sighting promotion must say so explicitly** and name the cost that justifies it. That
   is the sentence a reviewer needs in order to disagree.
3. **Draft the template change**, citing every observation that supports it.
4. **Open one PR** against seeds `main`. Never merge. If a change is significant enough to be a
   decision, draft the DEC file too — `@workout` follows the same rule as everyone else and does not
   hand-write index rows or banners (DEC-S036).
5. **Archive** what was promoted or dismissed, in the same PR, so the working set is the unpromoted
   tail.

**What `@workout` must not do:** invent a pattern with no observation behind it; promote from a
single occurrence without saying that is what it is doing and why the cost justifies it; treat a
count as the decision; edit project repos; or merge its own PR.

**Retirement is in scope.** A rule whose pattern stops appearing across many clean runs is a
candidate for removal. A workflow that only ever accretes is the failure this whole system exists to
avoid.

## Phase 4 — cadence

Weekly or fortnightly, by hand, in seeds. The PR is the report: what recurred, what was promoted,
what was held and why. Merged rules travel outward by `/pull-seeds` (DEC-S038), and the DEC-S038
ordering trap applies — a `logic`-class change must be in seeds `main` before the next `/pull-seeds`
on any project.

## Risks

- **The workout does not happen.** The honest failure mode. Observations pile up harmlessly and
  nothing regresses — strictly better than today, where a candidate pattern is deleted by the next
  sync. But the loop delivers nothing until the ritual is real.
- **Observation volume swamps signal.** If every session emits a file and most are empty, `@workout`
  spends its budget reading nothing. Mitigation: emit the file always, but keep clean runs to a
  single line; revisit if the read cost shows up.
- **`@workout` becomes a rubber stamp.** The same failure the splitter's over-broad hint regex nearly
  caused in the V5 rollout — a report that flags everything gets skimmed. Its output is a PR, and a
  PR that is always "promote all" is the signal that the judgment has stopped happening.
- **Two sources of truth for "what the workflow should do."** Until a promotion lands, an observation
  argues for a rule that is not in the templates. Mitigation: observations are explicitly *not*
  authoritative — `dev/claude/**` is, and nothing reads `observations/` at session time.

## Sequencing

Phase 1 is useful alone: it stops the deletion path immediately, even before anything reads the
observations. Phase 2 is a branch and a directory convention. Phase 3 is the only real design work
and should not start until there are enough real observations to test `@workout` against — building
the promoter before the evidence exists would mean inventing the evidence, which is the failure mode
this whole loop is built to remove.
