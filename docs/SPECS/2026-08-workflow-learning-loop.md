# Workflow learning loop — observation, accrual, promotion

**Status:** Implemented 2026-08-06 — Phases 1–4. Untested against real evidence: the inbox is empty
until the first `/read-the-tape` runs under the new shape, and `@workout` has not yet judged
anything. Phase 3 was built ahead of the sequencing note below at the operator's call.
**Owner:** @architect
**Implements:** DEC-S039
**Date:** 2026-08-06

## Goal

Make workflow improvement accumulate instead of evaporating. A session's evidence survives the
session, reaches seeds, and is promoted to a rule when its severity warrants it — with the promotion
visible in one reviewable artifact per cycle.

Target, measured after two cycles: every template change merged from `@workout` cites at least one
observation, and no candidate pattern is lost to the session that found it.

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
| `/read-the-tape` → `@tape-reader` | in a project | one cited observation | **nothing, anywhere in that repo** |
| `observations` branch | seeds | the accumulating record | nothing — it is data |
| `/workout` → `@workout` | in seeds | one PR against `main` | `dev/claude/**` |

## Phase 1 — `/read-the-tape` becomes an observer

**It edits nothing.** Not a skill, not `.claude/settings.json`, not a reviewer — no file in the repo
it runs in. It has no `Edit` tool, so the constraint is structural rather than remembered. Its whole
output is one observation file, written to seeds.

> **Amended 2026-08-06 by DEC-S040.** As first written, this phase split findings by file class:
> project-owned ones got a `y/n` and an edit, everything else became an observation. That line came
> from the sync classifier — an argument about which files a sync would overwrite — and it did not
> survive the sync being retired. With nothing to overwrite, an auditor that also edits files is
> just an auditor with a side effect. The cost is that a repeated permission prompt (P2), the
> cheapest possible fix, is now an observation someone applies by hand or doesn't.

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

**~~Open question for Phase 1:~~ Resolved 2026-08-06 — write to the seeds worktree directly.**
`/read-the-tape` resolves `$SEEDS` (skill arg → `../seeds` sibling → `$SEEDS_REPO`), attaches `.observations-worktree/` there, and the agent commits and pushes
to the `observations` branch itself. Least machinery of the three: the resolution logic already
existed, and no cross-repo auth is needed beyond a checkout on disk. Rejected — a local
`.observations/` collected later, because the collection step is one more ritual that can be skipped,
and skipping it is the same evaporation this decision exists to stop; and having a sync skill carry it,
because that couples evidence capture to a ritual DEC-S039 already observes nobody runs — and which
DEC-S040 has since deleted outright.

The cost, stated so it isn't a surprise: **`/read-the-tape` now hard-requires a seeds checkout** and
stops if it can't resolve one. That is deliberate — running the audit with nowhere to write means
producing findings and discarding them, which is the failure being removed.

## Phase 2 — the `observations` branch

Orphan branch in seeds, created the same way as a project's `sessions` branch (DEC-S014), reachable
via a `.observations-worktree/` checkout that `main` gitignores.

```
observations/
  LEDGER.md                        # one row per PATTERN — the accumulating judgment
  2026-08-06-muster-time-clock.md  # INBOX: unread by @workout
  2026-08-06-bushel-catalog-units.md
  archive/
    2026-07/…                      # consumed — every verdict, not just promoted/dismissed
```

Append-only by construction: one file per run, named for date + repo + slug, so two projects writing
the same day never touch the same path.

### Inbox and ledger — what "processed" means

**Directory position is the state.** A file in `observations/` is unread. After a cycle it moves to
`archive/YYYY-MM/` — **regardless of verdict, held included.** No status field, nothing to keep in
sync, and the move is atomic in git.

**The ledger is what accumulates; observations are consumed.** This is the split that keeps the read
cost bounded, and getting it wrong is the obvious way this design fails in practice: archiving only
what was promoted or dismissed leaves every *held* observation in the inbox forever, so the working
set grows without limit and each cycle re-derives the same judgment from the same raw evidence.

`LEDGER.md` carries one row per **pattern**, not per observation:

```markdown
| pattern | state | seen | repos | first | last | note |
|---|---|---|---|---|---|---|
| P8 full-plan read | promoted → `/its-alive` §5 | 7 | muster, bushel | 2026-07-14 | 2026-08-06 | |
| C3 grep-loop on one error file | held | 2 | muster | 2026-08-01 | 2026-08-06 | recoverable + self-announcing; fix unclear — three plausible shapes |
| C7 emoji in commit subjects | dismissed | 1 | sailbook | 2026-08-02 | — | style, not workflow |
```

So a cycle reads **the inbox plus the ledger** — never the archive. Cost scales with how much
happened since the last run, not with how long the loop has been running. A held pattern's row
carries the reasoning, so the next cycle argues *from* the prior judgment rather than re-inventing
it, and a pattern that stays held for months is visible as a row that keeps gaining occurrences
without ever earning a promotion — which is itself a signal worth reading.

**The ledger is the one hand-maintained artifact in this system, which makes it the one that can
rot.** That is a known cost, accepted because the alternative — deriving state from the archive —
means reading everything every time, which is the failure this section exists to prevent. Mitigation
if it bites: a check asserting every archived observation is cited by exactly one ledger row, in the
shape of `check-docs`' exemption-existence assertion. Not built until the rot is real.

## Phase 3 — `@workout`

Runs in seeds. Reads `observations/` (excluding `archive/`). Model: Opus — this is the judgment
step, and it is the one place in the loop where being wrong is expensive.

**It is deliberately not a template.** `@workout` and `/workout` live at `.claude/agents/workout.md`
and `.claude/skills/workout/`, alongside the other seeds-only config (`routine-config.yaml`,
`type-manifest.yaml`) — **not** under `dev/claude/`. It edits `dev/claude/**` and reads a branch
that exists only in seeds, so no project could run it; shipping it as a template would install dead
machinery in every project and put a skill in every project's list that fails on invocation. It is
absent from the file-class registry for the same reason: nothing syncs it, so nothing needs to
classify it.

1. **Read the inbox and `LEDGER.md`. Never the archive.** Group new observations by pattern, and
   fold them into the ledger's existing rows — a pattern seen twice before and once more today is
   one row with three occurrences, not three findings. Grouping across repos and dates is the
   capability `@tape-reader` structurally lacks.
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
5. **Update `LEDGER.md`** — one row per pattern, with the verdict and, for a hold, the reasoning
   the next cycle should argue from.
6. **Archive the whole inbox** to `archive/YYYY-MM/`, in the same PR. Every file, every verdict. An
   observation left in the inbox is a claim that it has not been read.

**What `@workout` must not do:** invent a pattern with no observation behind it; promote from a
single occurrence without saying that is what it is doing and why the cost justifies it; treat a
count as the decision; edit project repos; or merge its own PR.

**Retirement is in scope.** A rule whose pattern stops appearing across many clean runs is a
candidate for removal. A workflow that only ever accretes is the failure this whole system exists to
avoid.

## Phase 4 — cadence

Weekly or fortnightly, by hand, in seeds. The PR is the report: what recurred, what was promoted,
what was held and why.

**Getting a merged rule into a project is a fourth step, and it is manual** (DEC-S040). Nothing
carries it outward. `@workout` closes its PR with a distribution list — which projects, which files
— so the destinations are named while the reasoning is fresh; acting on that list is separate and
deliberate. The DEC-S038 ordering trap is gone with the sync that caused it: no mechanism can now
overwrite a project's newer file with seeds' older one. A person still can, by copying carelessly.

## Risks

- **The workout does not happen.** The honest failure mode. Observations pile up harmlessly and
  nothing regresses — strictly better than today, where a candidate pattern is deleted by the next
  sync. But the loop delivers nothing until the ritual is real.
- **Observation volume swamps signal.** If every session emits a file and most are empty, `@workout`
  spends its budget reading nothing. Mitigation: emit the file always, but keep clean runs to a
  single line. The inbox/ledger split bounds the *total* read cost; it does not stop one cycle's
  inbox being mostly noise.
- **The ledger rots.** It is hand-maintained by an agent, and this system's own history says that
  decays — a hand-updated index is what DEC-S036 replaced with a generator. It cannot be generated
  here, because it carries judgment rather than derived facts. Watch for rows whose occurrence
  counts stop moving while observations for that pattern keep arriving.
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
