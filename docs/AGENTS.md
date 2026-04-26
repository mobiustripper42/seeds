# seeds — Claude Code Agents & Skills

## Overview
Five agents and six session skills drive seeds' own workflow. All run as Claude Code subagents or slash commands. Skills live project-level in `.claude/skills/`; agents in `.claude/agents/`.

---

## Agents

### @architect
**Purpose:** Reviews architectural decisions before they're committed.
**When:** Before adding a dependency, before a DEC-TBD is resolved, when scope creep appears.
**Spec:** `.claude/agents/architect.md`

### @code-review
**Purpose:** Post-commit review — catches issues, inconsistencies, potential bugs.
**When:** After a task or related commits (wired into `/kill-this`).
**Spec:** `.claude/agents/code-review.md`

### @pm
**Purpose:** Tracks project state. Knows what's done, next, blocked.
**When:** Session start (via `/its-alive`), session end (via `/its-dead`), ad hoc status checks.
**Spec:** `.claude/agents/pm.md`

### @ui-reviewer
**Purpose:** Visual design review.
**When:** After UI-heavy work, phase boundaries.
**Spec:** `.claude/agents/ui-reviewer.md`
**Note:** N/A for seeds itself (no UI) — included for completeness / test coverage of the template.

### @sync-config
**Purpose:** Classifies diffs between seeds and active projects — "generic improvement" (backport) vs. "project-specific tweak" (skip). Used in both directions (upstream PR automation + downstream `/pull-seeds`).
**When:** Via `/sync-config` skill, the nightly Routine, or manually.
**Spec:** `.claude/agents/sync-config.md`

---

## Session Skills

### /its-alive — Session Start
Stamps start time, reads last session context, reads `docs/PROJECT_PLAN.md`, presents briefing with recommended task. Waits for confirmation.
**Spec:** `.claude/skills/its-alive/SKILL.md`

### /pause-this — Mid-Session Break
Build check, commit WIP, note pause in `session-log.md`. Doesn't close the session entry.
**Spec:** `.claude/skills/pause-this/SKILL.md`

### /restart-this — Resume from Pause
Reloads context from `session-log.md` and `docs/PROJECT_PLAN.md`. No new session number.
**Spec:** `.claude/skills/restart-this/SKILL.md`

### /kill-this — End Session (Part 1: Draft)
Build check, commit, run `@code-review`, draft session log entry. Does not write log yet.
**Spec:** `.claude/skills/kill-this/SKILL.md`

### /its-dead — End Session (Part 2: Finalize)
Calculate duration + points, write session log entry, update `docs/PROJECT_PLAN.md`, push, run `@pm` for next-task recommendation.
**Spec:** `.claude/skills/its-dead/SKILL.md`

### /sync-config — Backport workflow changes
Invokes `@sync-config` agent to diff live project files against seeds templates. One run, one commit per repo.
**Spec:** `.claude/skills/sync-config/SKILL.md`

---

## Session Workflow

**Start:** `/its-alive` → get briefing and task recommendation
**During:** spec → build → test → mobile screenshot (N/A for seeds)
**Pause:** `/pause-this` → break → `/restart-this`
**End:** `/kill-this` → review draft → `/its-dead` → finalize + push
**After workflow tweaks:** `/sync-config` → propose backports

---

## Summary Table

| Agent/Skill | Model | When | Purpose |
|-------------|-------|------|---------|
| @architect | Opus | Before design decisions | Keep architecture coherent |
| @code-review | Sonnet | After commits | Catch issues early |
| @pm | Sonnet | Start/end of sessions | Track progress, flag risks |
| @ui-reviewer | Sonnet | After UI work | Design quality (N/A for seeds) |
| @sync-config | Sonnet | Via skill / Routine | Classify diffs, propose backports |
| /its-alive | — | Session start | Timestamp + briefing |
| /pause-this | — | Mid-session break | Safe pause with commit |
| /restart-this | — | Resume from pause | Reload context |
| /kill-this | — | Session end (part 1) | Draft log entry |
| /its-dead | — | Session end (part 2) | Finalize + push |
| /sync-config | — | After workflow tweaks | Backport to seeds |
