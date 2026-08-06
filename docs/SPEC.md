# seeds — Product Specification

## Overview
Personal template library and sync tooling for Claude Code workflows. Holds session skills, agent definitions, and project templates in one place, then syncs changes across all the user's project repos — laptop, headless Ubuntu box, and Android phone.

Seeds is both a template source (`dev/`, `domain/`) and a real project using its own workflow at the root.

## Philosophy
Seeds is one source of truth for what the workflow *should* be. Getting a change across the boundary between seeds and a project is a **deliberate human act**, not a mechanism.

That is a reversal, and it was earned rather than chosen. The original philosophy here read: *"Workflow improvements flow back to seeds; seeds improvements flow out to projects. No manual copy-paste drift across devices."* Three successive attempts to build that flow — the nightly Routine (DEC-S010), then manual `/push-seeds` + `/pull-seeds` (DEC-S038), then just `/push-seeds` — each ended by narrowing what the automation was allowed to touch, until what remained was a gate around `cp`. **The projects differ more than they agree**, and deciding which file should cross is the part that needs judgment (DEC-S040).

What still flows automatically is *evidence*, not files: a session's observations reach seeds on their own (DEC-S039), because evidence is uniform in a way template files are not.

## Target Launch
- **V1 shipped and was retired.** The sync system worked end-to-end and was removed anyway — see § V1, retired.
- **Current critical path:** the learning loop — `/read-the-tape` observes, `@workout` promotes, a human copies. Spec: `docs/SPECS/2026-08-workflow-learning-loop.md`.

## Stack
- **Skills / agents:** Markdown with YAML frontmatter, under `dev/claude/` (templates) and `.claude/` (seeds' own live copies)
- **Promotion judgment:** `@workout` agent (prompt-only, Opus, seeds-only)
- **Orchestration:** none. Nothing is scheduled; nothing runs unattended (DEC-S038, DEC-S040)
- **Version control:** git + GitHub, one repo per project, seeds as the hub. Two orphan branches: `sessions` per project (DEC-S014), `observations` in seeds (DEC-S039)
- **Hosting:** None — everything runs on the user's devices

## Roles
- **User (solo)** — develops workflow improvements in active projects, reviews `@workout`'s promotion PRs, and copies merged changes out to projects by hand

## Core Concepts
- **Template family** — `dev/` or `domain/<name>/`. Defines the stock skills and agents for that kind of project.
- **Project-level skills** — live in `<project>/.claude/skills/`, checked into the repo, ride along with clones across devices.
- **File class** — `logic` / `context` / `hybrid` (DEC-S018). Once the input to a classifier; now the reference a person checks before copying a file.
- **Observation** — a cited, dated record of what one session actually did. Cheap, high-volume, factual. Flows to seeds automatically.
- **Promotion** — turning accumulated observations into a template change. Rare, cross-project, a judgment. Made by `@workout` in seeds, on a severity call rather than a count (DEC-S039).

## V1, retired

Sync-config end-to-end. Built, shipped, used, and removed:
1. ~~De-hardcoded skill templates (no `npm run build` assumptions)~~ — kept; this outlived the sync
2. ~~Remote nightly Routine with fixed repo list~~ — off (DEC-S038), then unrevivable (DEC-S040)
3. ~~Downstream `/pull-seeds` skill~~ — deleted (DEC-S040)
4. ~~Documented migration path from `~/.claude/skills/` to `<project>/.claude/skills/`~~ — done; project-level install is the settled shape

The decision record is the reason this section reads as strikethrough rather than being deleted: DEC-S004, S010, S028, S038 and S040 are a sequence, and a spec that quietly forgot its own V1 would make that sequence unreadable.

## Not V1
- Team / multi-user sync
- Non-git sync (Dropbox, rsync, etc.)
- Support for tools other than Claude Code
- Auto-merge of backport PRs (always user-reviewed)
- Downstream auto-pull on session start (user explicitly doesn't want interruption mid-flow)
- Domain family templates beyond whatever's minimally needed to test

## Future Direction (north star, not committed)

Seeds positioned as the user's personal project hub — not just a template library. New skills get developed here (with full workflow applied), workflow decisions get debated here, and eventually a high-level cross-project status view aggregates state from sailbook, helm, future projects, etc. Sync-config tooling is the foundation; the hub view is the long-term payoff.

Implications if pursued: project setup becomes a guided conversation in seeds (pick which tools this project needs), skill development happens in seeds first then deploys to projects, and a future "@portfolio" agent or `/all-projects` skill summarizes status across the whole estate.

**Read side now partially actionable (DEC-S028).** The cross-project status view no longer needs its own enumeration machinery built from scratch — the nightly sync Routine already touches every repo on a schedule, and once the sync converged (zero-PR nights) that enumeration was freed up. The Routine's **fleet-status digest** (Step 4.5) is the first concrete piece of the hub: a rolling `fleet: status` issue aggregating version · activity · open-PRs · migration · throughput · flags per project. A `@portfolio` agent or `/all-projects` skill would be the read-API layered on top of that digest, not a from-scratch build. The guided-setup and skill-development-in-seeds-first implications remain not-yet-actionable — flagged so they don't get lost.
