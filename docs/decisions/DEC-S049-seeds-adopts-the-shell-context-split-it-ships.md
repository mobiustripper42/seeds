---
id: DEC-S049
title: "Seeds adopts the shell/context split it has been shipping since DEC-S019"
topic: "Docs, decisions & context discipline"
---

## DEC-S049: Seeds adopts the shell/context split it has been shipping since DEC-S019

**See also** — decisions this one changed part of:
- Extends DEC-S019 — the shell/context split now has one more consumer, and it is the repo that
  wrote it. Nothing about the split's design changes; what changes is that seeds stops being the
  exception to it
- Refines DEC-S047 — the dogfooded set gains `dev/claude/CLAUDE.md`. The two-prefix rule is now two
  prefixes and one override, because the shell's mirror lands at the repo root rather than under
  `.claude/`

**Decision:** Seeds' root `CLAUDE.md` becomes `dev/claude/CLAUDE.md` **verbatim**, and everything
that was seeds-specific in it moves to `.claude/CLAUDE-context.md` — the same arrangement every
project installed from this repo has used since DEC-S019. `check-context.mjs` joins `verify`,
`check-mirrors.mjs` compares the shell against seeds' copy, and `drift.mjs` drops the exclusion that
existed because the two files were different documents.

**Why now.** Seeds preached the split and did not eat it, and the cost was measurable: `##
Communication` had reached **976 words** in the template and **538** in seeds' own copy. Nothing
reported the divergence, and nothing could have — `check-mirrors` never compared the pair,
`drift.mjs` excluded it by name, and both were right to, because the two files genuinely were
different documents that happened to share a filename.

That is a defensible architecture and it produced an indefensible outcome: the repo whose entire
subject is keeping documents identical across a fleet was running a hand-maintained second copy of
its own conduct rules, drifting, unwatched. The operator's phrasing is the clearest statement of the
requirement — *"I want all my claudes to work the same, I don't care what they are doing."* A repo
that exempts itself from that is not a template library, it is a template library plus one fork.

**What the first run found, which is the argument in miniature.** `check-context.mjs` had never been
run against seeds — it asserts `.claude/CLAUDE-context.md` exists, and seeds had no such file, so the
gate was excluded. Its first run reported **two dead references, both in the shell**:
`docs/USER_STORIES.md` (line 13) and `docs/DEV_REFERENCE.md` (line 198). Both are webapp-shaped docs
that seeds ships as templates and that a `tool` or docs project never installs.

The shell already forbids exactly this, ten lines below the first offence: *"The shell lists only docs
every project has; a shell that names a doc a whole project type doesn't need is a dead reference in
every one of them."* Both citations moved to the context template's `## Additional Docs`, where
`BRAND.md` already sat as the stated precedent.

This is the third template defect in two weeks found only by carrying a template into a project —
after the em-dash citation and the `DEC-107` example (PRs #197, #199). The pattern is now firm enough
to state as a property: **seeds cannot see its own templates fail, because it was not a project.**
This decision makes it one, which converts that whole class from "found by luck downstream" to "found
by the gate at home".

**What moved, and what was promoted rather than moved.** Lines 5–330 of the old root `CLAUDE.md` —
repo layout, the workflow system, the setup procedure, the decision record, the manual-copy
discipline, the learning loop, the dead Routine — are context and moved verbatim to
`.claude/CLAUDE-context.md`. Verbatim on purpose: a rewrite would have made the diff unreviewable and
lost detail that was paid for.

Two rules in the old conduct sections were **not** in the shell, and a verbatim adoption would have
deleted them silently. Both are universal, so they were promoted **into** the shell first:

- *A workflow rule needs an observed failure behind it.*
- *Prefer removing.*

That step is the hazard in this shape of change and it is worth naming: adopting a shared file
wholesale destroys every local improvement that was never promoted. Seeds hit the same hazard on
2026-08-19 when a wholesale `settings.json` copy silently dropped a seeds-local `allow` entry (PR
#201). Diff before you adopt.

**Two seeds-only conduct lines went to context rather than to the shell**, being facts about seeds
rather than rules for anyone: that a template change here lands in every project that copies it, and
that `@workout` runs Opus because promotion is the expensive judgment in the loop.

**Both were dropped on the first pass and restored in review** — the claim above was written before
it was true. That is the hazard of this shape of change arriving from the other direction: the two
lines were consciously identified as *not* belonging in the shell, and identifying them as such is
what made them easy to leave nowhere at all. No gate can catch it; `check-context` verifies that
cited paths resolve, not that content survived a move. The reviewer found them by diffing
`git show HEAD~1:CLAUDE.md` against both new files, which is the only method that works.

**What seeds gains by taking the shell whole**, all of it previously absent from its own copy: the
`AskUserQuestion` prohibition, the `narration:` switch, the full Model Selection table, Micro
Workflow, PR Workflow, Session Skills and Agents rosters, Versioning, and Approval Before Action's
three sub-rules. Seeds had been running a subset of its own guidance without anything saying so.

**The mirror mapping needed one override.** Every other dogfooded template maps
`dev/claude/<rel>` → `.claude/<rel>`; the shell lands at the repo **root**. `check-mirrors.mjs` gains
a one-entry `MIRROR_OVERRIDE` map rather than a second mapping convention, and `mustExist` consults
it, so an absent root `CLAUDE.md` is a failure like any other missing mirror.

**`.claude/CLAUDE-context.md` is `presence` class here** (DEC-S044's semantics, under
`check-mirrors`'s `PRESENT_NOT_COMPARED` roof): it must exist, and its contents are never compared
against the template. That is not a concession — it is the whole point of the split. The template
ships placeholders; seeds' copy describes seeds; a project's describes that project. Comparing them
would report drift on every repo simultaneously, which is DEC-S044's argument arriving at the same
answer by the same route.

**The override had a second half that a green run cannot reach.** `mirrorPath()` was threaded through
the comparison and the `--write` repair, and the run was green — but the `ABSENT` and `DRIFT`
remediation lines still hardcoded `.claude/${rel}`, so a missing root `CLAUDE.md` would have printed
`cp dev/claude/CLAUDE.md .claude/CLAUDE.md`: the wrong destination, in the one branch that only
executes when something is already broken. Found in review, not by running it, because running it
clean is precisely what does not execute that code.

**Honest limits:**

- **Nothing forces the shell to stay universal.** `check-context` catches a dead *path*; it cannot
  catch a sentence that is merely wrong for a docs repo. The `Surface check` slot is still a person
  reading it.
- **This does not distribute anything.** The two promoted rules and the two moved doc citations reach
  muster and soundings when someone copies them, same as everything else (DEC-S040).
- **Seeds' context file is large** — most of a 330-line document. That is honest rather than tidy:
  seeds genuinely has more project-specific content than a webapp does, because its project *is*
  the templates.

**Proof:** `npm run verify` green with `check:context` in the chain for the first time — 22 mirrored
files compared and matching, root `CLAUDE.md` among them; `drift.mjs .` clean with the exclusion
removed. The two dead references were watched failing before the fix, which is the only part of this
change that had a mechanical check to fail.

**Alternatives considered:** keeping the exception and adding a check that compares only the conduct
sections (rejected — it needs a list of which headings are universal, which is a hand-maintained
roster of exactly the kind DEC-S047 replaced with a prefix rule, and it would have to be updated the
first time the shell gains a section). Rewriting seeds' context content while moving it (rejected —
two changes in one diff, and the review could not have told a move from an edit). Leaving the shell's
two webapp-shaped doc citations in place and exempting seeds (rejected — the shell's own rule forbids
them, and an exemption would preserve the defect for every `tool` project downstream).
