# seeds — Architectural Decisions

Decisions are numbered DEC-NNN. "DEC-TBD" means the decision is flagged but unresolved — consult @architect before building.

---

## DEC-001: Two template families (`dev/` and `domain/`)
**Decision:** Templates are organized by project kind, not by component type. `dev/` holds everything for software projects; `domain/<name>/` holds everything for non-dev domains (bread, tomatoes, ops, etc.).
**Why:** Session workflow is shaped by the kind of work, not the kind of file. A farm repo and a Next.js repo both need `/kill-this`, but the build-check step differs fundamentally. Per-family bundles keep that difference explicit.
**Tradeoff:** Duplication across families when skills converge. If a pattern emerges in both, `@sync-config` flags it for potential extraction — but extraction is never automatic.

## DEC-002: Skills live project-level, not user-global
**Decision:** Session skills (`/its-alive`, `/kill-this`, etc.) live in `<project>/.claude/skills/`, checked into each project's repo. Not in `~/.claude/skills/` (user-global).
**Why:** Skills are project-shaped, not device-shaped — `/kill-this` in a Next.js repo runs `npm run build`; in a farm repo it doesn't. Project-level skills ride along with the git checkout, so they're automatically consistent across laptop, headless box, and mobile — no separate device-sync mechanism needed.
**Verified (2026-04-22):** Mobile CC auto-discovers `<project>/.claude/skills/` from a cloned repo. Confirmed via `mobile-test` probe skill.
**Tradeoff:** Setup step per new project (seed the skills from seeds). `~/.claude/skills/` becomes empty or holds only truly cross-project skills.

## DEC-003: One sync concept, two directions, same classifier
**Decision:** Sync-config is one system running in two directions — **upstream** (project → seeds, opens PR) and **downstream** (seeds → project, pulls updates). Both invocations pass diffs through the same `@sync-config` agent to classify changes as "generic improvement" vs. "project-specific tweak."
**Why:** The classification logic is the hard part and doesn't depend on direction. Treating sync as two features would duplicate the hardest piece.
**Tradeoff:** None material. Invocation paths (nightly Routine vs. manual skill) differ, but the core logic is shared.

## DEC-004: Upstream = nightly remote Routine, downstream = manual skill
**Decision:** Upstream sync runs on a schedule via Anthropic Routines (remote, nightly). Downstream sync is manual via a `/pull-seeds` skill the user runs inside a project when they want updates.
**Why:** Upstream catches improvements automatically without cluttering mid-task flow. Downstream is rare enough and disruptive enough (could introduce conflicts mid-work) that the user explicitly wants it on-demand only — no "session start" nag reminders.
**Tradeoff:** Two different invocation mechanisms to maintain. Offset by them sharing the classifier (DEC-003).
**Revisit if:** User ends up never running `/pull-seeds` manually — means downstream needs a gentler reminder mechanism, or the update frequency doesn't justify downstream sync at all.

## DEC-005: Branch model — task/* branches + PR flow
**Decision:** All work happens on `task/*` branches, same as any other project using this workflow. `/its-alive` starts on `main`, cuts a branch; `/kill-this` pushes and opens a PR; `/its-dead` commits the session log to `main` after merge and deletes the branch.
**Why:** Seeds was on `main` (solo, no review surface) but this caused a recurring problem: skill copies in the seeds repo never got properly pushed, so `git pull` on other machines returned "already up to date." The PR merge acts as the natural forcing function — work isn't done until the PR merges, which guarantees everything is pushed. Also: seeds should eat its own dogfood. If the PR workflow is good enough to recommend, it's good enough to use here.
**Changed from:** Always on `main`. Changed 2026-05-01 after observing the push-discipline failure in practice.
**Tradeoff:** Slightly more ceremony per task. Worth it for the push guarantee and consistency.

---

## DEC-TBD: Anthropic Routines GitHub access model
**Question:** Can Anthropic Routines authenticate to N private GitHub repos and open a PR to one of them? What auth mechanism (GitHub App, PAT, OAuth)?
**Options:** GitHub App install vs. PAT stored in Routine config.
**Blocks:** Task 6 in PROJECT_PLAN.md.

## DEC-TBD: Fate of `scripts/nightly-sync.sh`
**Question:** Once the remote Routine works, does the local WSL-scheduled `scripts/nightly-sync.sh` stay as a belt-and-suspenders alternative, get retired, or stay as the "works offline" path?
**Blocks:** Task 8 in PROJECT_PLAN.md.

## DEC-TBD: Repo list format for the Routine
**Question:** JSON, YAML, or plain text newline-separated? Lives in seeds root or under `docs/`?
**Depends on:** What the Routine natively reads.
