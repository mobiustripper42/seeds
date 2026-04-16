# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A personal configuration library: Claude Code workflow templates, agent definitions, session skills, and shell aliases intended to be copied into new projects. Nothing here runs — it's all source material.

## Repo Layout

```
claude/
  CLAUDE.md              # Project CLAUDE.md template (fill in project-specific sections)
  agents/                # Agent definition files — copy to .claude/agents/ in your project
  skills/                # Session lifecycle skills — copy to ~/.claude/skills/
  docs/
    AGENTS.md            # Reference doc explaining the full agent + skill workflow
    VELOCITY_AND_POKER_GUIDE.md  # Estimation and velocity tracking methodology
bash/
  aliases.sh             # Shell aliases for Claude Code workflows (source from ~/.bashrc)
```

## The Workflow System

This repo encodes a specific development workflow for solo Claude-assisted projects. The key pieces:

### Session Skills (copy to `~/.claude/skills/`)

Five slash commands manage the session lifecycle:

| Skill | When | What it does |
|-------|------|--------------|
| `/its-alive` | Session start | Stamps time, opens session log entry, reads context from last session + `PROJECT_PLAN.md`, recommends task |
| `/pause-this` | Mid-session break | Runs build check, commits WIP, notes pause in session log |
| `/restart-this` | Resume from pause | Reloads context from session log and plan — no new session number |
| `/kill-this` | Session end (part 1) | Build check, commit, runs @code-review, drafts session log entry for review |
| `/its-dead` | Session end (part 2) | Finalizes session log, tallies effort points, updates PROJECT_PLAN.md, commits + pushes, runs @pm |

### Agents (copy to `.claude/agents/` in your project)

| Agent | Model | When | Purpose |
|-------|-------|------|---------|
| @architect | Opus | Before design decisions, new dependencies, scope creep | Keep architecture coherent against SPEC.md + DECISIONS.md |
| @code-review | Sonnet | After commits (wired into `/kill-this`) | Catch issues early |
| @pm | Sonnet | Start/end of sessions via skills | Track progress, flag risks, update PROJECT_PLAN.md |
| @ui-reviewer | Sonnet | After UI work, phase boundaries | Design quality review |

### Files a target project needs

The skills and agents expect these files to exist in the project root:

- `session-log.md` — session continuity log (skills read/write this)
- `docs/PROJECT_PLAN.md` — phases, tasks, estimates, velocity table
- `docs/SPEC.md` — scope (V1 vs later) and "Not V1" list
- `docs/DECISIONS.md` — architectural decisions with IDs (e.g. DEC-001)
- `docs/AGENTS.md` — adapted from `claude/docs/AGENTS.md` in this repo

### Velocity & Estimation

Effort uses Fibonacci points: 2, 3, 5, 8, 13. No 1s (just do it), no 13s if avoidable (break them down). Velocity = hours per effort point. `docs/VELOCITY_AND_POKER_GUIDE.md` covers the full methodology.

## Setting Up a New Project

1. **Project docs** — copy `claude/docs/` contents to `docs/` in the project root. Fill in all `[Project Name]` and `[placeholder]` fields. `PROJECT_PLAN.md` has Phase 0 pre-filled — fill in Phase 1+ during planning.
2. **Session log** — copy `claude/session-log.md` to the project root. Update the header.
3. **CLAUDE.md** — copy `claude/CLAUDE.md` to the project root. Fill in stack, data model, roles, and doc table.
4. **Agents** — copy `claude/agents/` to `.claude/agents/` in the project root. Update `description:` frontmatter with the project name.
5. **Skills** — copy `claude/skills/` directories to `~/.claude/skills/` (global install, not per-project — skip if already installed).
6. **Shell alias** — source `bash/aliases.sh` from `~/.bashrc` and add a project-specific alias.

After setup, run `/its-alive` in the new project to start the first session.

## Updating This Repo

When the workflow evolves (new skill behavior, improved agent prompts, updated template conventions), update the source here first, then propagate to active projects manually. There's no sync mechanism — it's intentionally copy-on-setup.
