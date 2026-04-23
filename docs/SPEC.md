# seeds — Product Specification

## Overview
Personal template library and sync tooling for Claude Code workflows. Holds session skills, agent definitions, and project templates in one place, then syncs changes across all the user's project repos — laptop, headless Ubuntu box, and Android phone.

Seeds is both a template source (`dev/`, `domain/`) and a real project using its own workflow at the root.

## Philosophy
One source of truth. Workflow improvements flow back to seeds; seeds improvements flow out to projects. No manual copy-paste drift across devices.

## Target Launch
- **V1 target:** TBD
- **V1 critical path:** Upstream sync (nightly Routine) + downstream sync (`/pull-seeds`) both work end-to-end across at least two projects, on all three devices.

## Stack
- **Skills / agents:** Markdown with YAML frontmatter, under `dev/claude/` (templates) and `.claude/` (seeds' own live copies)
- **Sync classifier:** `@sync-config` agent (prompt-only, runs on Sonnet)
- **Orchestration:** Shell scripts + Anthropic Routines (remote, scheduled)
- **Version control:** git + GitHub, one repo per project, seeds as the hub
- **Hosting:** None — everything runs on user's devices or inside Anthropic Routines

## Roles
- **User (solo)** — develops workflow improvements in active projects, approves backport PRs to seeds, pulls seeds updates into projects on demand

## Core Concepts
- **Template family** — `dev/` or `domain/<name>/`. Defines the stock skills and agents for that kind of project.
- **Project-level skills** — live in `<project>/.claude/skills/`, checked into the repo, ride along with clones across devices.
- **Upstream sync** — project → seeds. Remote Routine, nightly, opens PRs.
- **Downstream sync** — seeds → project. Manual, via `/pull-seeds` skill.
- **Classifier** — `@sync-config` agent decides "generic improvement" vs. "project-specific tweak." Used in both directions.

## V1 Scope

Sync-config end-to-end:
1. De-hardcoded skill templates (no `npm run build` assumptions)
2. Remote nightly Routine with fixed repo list
3. Downstream `/pull-seeds` skill
4. Documented migration path from `~/.claude/skills/` to `<project>/.claude/skills/`

## Not V1
- Team / multi-user sync
- Non-git sync (Dropbox, rsync, etc.)
- Support for tools other than Claude Code
- Auto-merge of backport PRs (always user-reviewed)
- Downstream auto-pull on session start (user explicitly doesn't want interruption mid-flow)
- Domain family templates beyond whatever's minimally needed to test

## Future Direction (north star, not committed)

Seeds positioned as the user's personal project hub — not just a template library. New skills get developed here (with full workflow applied), workflow decisions get debated here, and eventually a high-level cross-project status view aggregates state from sailbook, helm, future projects, etc. Sync-config tooling is the foundation; the hub view is the long-term payoff.

Implications if pursued: project setup becomes a guided conversation in seeds (pick which tools this project needs), skill development happens in seeds first then deploys to projects, and a future "@portfolio" agent or `/all-projects` skill summarizes status across the whole estate. Not actionable yet — flagged so it doesn't get lost.
