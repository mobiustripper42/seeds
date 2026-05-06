# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Docs

| File | Purpose |
|------|---------|
| `docs/PROJECT_PLAN.md` | Phases, scope, velocity table — **written at phase boundaries only** (planning + retro). Tasks for the *current* phase live in GitHub Issues. |
| `docs/SPEC.md` | Scope boundaries — what's in and out |
| `docs/DECISIONS.md` | Architectural decisions (DEC-NNN IDs) |
| `docs/AGENTS.md` | Agent and skill specs |
| `docs/RETROSPECTIVES.md` | Phase-end retros — written by `/retro` |
| `docs/VELOCITY_AND_POKER_GUIDE.md` | Estimation methodology |
| `docs/CHEATSHEET.md` | One-page printable skill reference |
| `docs/SCHEMA_VERSIONS.md` | Schema versioning policy + version history (V1, V2, …) + migration notes. The contract that `/pull-seeds` enforces. |
| `seeds-version` | Single line at repo root — the latest published schema version. Compared against `<project>/.claude/seeds-version` by `/pull-seeds`. |
| `sessions/*.md` | Per-session files (one per session). Filename: `YYYY-MM-DD-HHMM-<dev>-<slug>.md`. |
| `session-log.md` | Legacy archive — pre-rollout sessions only. New sessions write to `sessions/`. |

## What This Repo Is

A personal template library: Claude Code workflow templates, agent definitions, session skills, and shell aliases intended to be copied into new projects. Nothing here runs — it's all source material.

Two template families:
- **`dev/`** — software development projects
- **`domain/`** — non-dev domains (bread, tomatoes, ops, etc.) — aspirational, populated as patterns emerge

## Repo Layout

```
seeds-version            # Single line — current schema version (integer, no `v` prefix)

dev/
  bash/
    aliases.sh             # Shell aliases for Claude Code workflows (source from ~/.bashrc)
  claude/
    CLAUDE.md              # Project CLAUDE.md template (fill in project-specific sections)
    session-log.md         # Blank session log (copy to project root)
    agents/                # Agent definition files — copy to .claude/agents/ in your project
      sync-config.md       # Template maintenance agent (see "Syncing improvements" below)
    skills/                # Session lifecycle skills — copy to .claude/skills/ in your project
      push-seeds/          # Invokes @sync-config agent to push improvements to seeds
    templates/             # Code templates — copy individually as needed
      VersionTag.tsx       # Build-time version display (DEC-007). Wire into login + footer.
    docs/
      AGENTS.md            # Reference doc explaining the full agent + skill workflow
      VELOCITY_AND_POKER_GUIDE.md  # Estimation and velocity tracking methodology

domain/
  README.md                # Stub — populated as non-dev domains get scaffolded
```

## The Workflow System

This repo encodes a specific development workflow for solo Claude-assisted projects. The key pieces:

### Session Skills (copy to `.claude/skills/` in your project)

| Skill | When | What it does |
|-------|------|--------------|
| `/its-alive` | Session start | Stamps time, opens a per-session file in `sessions/`, captures the active JSONL transcript path, reads last session context, recommends task |
| `/pause-this` | Mid-session break | Runs build check, commits WIP, notes pause in the session file |
| `/restart-this` | Resume from pause | Reloads context from the open session file — no new session number |
| `/kill-this` | Session end (part 1) | Build check, commit, runs @code-review, drafts session file body for review |
| `/its-dead` | Session end (part 2) | Calculates duration, fills points, finalizes the session file, commits + pushes, cleans up branch, bumps patch version on dev projects |
| `/start-phase` | Phase boundary (start) | Reads next phase from PROJECT_PLAN.md, creates one Issue per task with `phase:N` and `points:X` labels, writes issue numbers back into the plan |
| `/retro` | Phase boundary (end) | Marks phase tasks `[x]`, reconciles drift, computes phase velocity, prompts retro notes, appends to RETROSPECTIVES.md, bumps minor version on dev projects, optionally chains into `/start-phase` |
| `/bump-major` | Breaking change | Manually bumps major version. CHANGELOG entry + tag (on main) or deferred tag (on staging). Dev projects only |
| `/promote-staging` | Ship staging to prod | ff-merges `staging` → `main`, tags release with current `package.json` version, pushes both. Staging-flow projects only |
| `/push-seeds` | After workflow improvements | Invokes @sync-config to classify diffs and propose backports to seeds |
| `/pull-seeds` | After seeds gets new improvements | Resolves seeds checkout, gates on `seeds-version` compatibility, invokes @sync-config in pull direction to apply approved changes to the project |
| `/read-the-tape` | After a session worth learning from | Invokes @tape-reader to audit JSONL transcript, find anti-patterns, propose skill improvements |

**Dev identity:** skills resolve `DEV` from `~/.claude/devname` (one-line file) with `$USER` as fallback. Set once per machine. Used in session filenames so two devs never collide.

**Task management model (post phase-rituals rollout):**
- `PROJECT_PLAN.md` is **read at planning** and **written at retro**. Untouched during the phase.
- The **current phase's tasks live as GitHub Issues** (created by `/start-phase`, closed by PRs).
- Project board (GitHub Projects v2) gives kanban visibility — optional but recommended for multi-dev projects.
- Phase boundaries are work-defined, not time-boxed: a phase ends when its issues are closed.

### Agents (copy to `.claude/agents/` in your project)

| Agent | Model | When | Purpose |
|-------|-------|------|---------|
| @architect | Opus | Before design decisions, new dependencies, scope creep | Keep architecture coherent against SPEC.md + DECISIONS.md |
| @code-review | Sonnet | After commits (wired into `/kill-this`) | Catch issues early |
| @pm | Sonnet | Start/end of sessions via skills | Track progress, flag risks, update PROJECT_PLAN.md |
| @ui-reviewer | Sonnet | After UI work, phase boundaries | Design quality review |
| @sync-config | Sonnet | Via `/push-seeds` skill, or ad-hoc | Classify diffs, propose backports, flag cross-family patterns |
| @tape-reader | Sonnet | Via `/read-the-tape` skill | Audit session JSONL for anti-patterns; self-improving via candidate pattern discovery |

### Files a target project needs

The skills and agents expect these files to exist in the project root:

- `sessions/` — directory for per-session files (skills create + write)
- `docs/PROJECT_PLAN.md` — phases, tasks, estimates, velocity table
- `docs/RETROSPECTIVES.md` — phase-end retros (created by `/retro` if missing)
- `docs/SPEC.md` — scope (V1 vs later) and "Not V1" list
- `docs/DECISIONS.md` — architectural decisions with IDs (e.g. DEC-001)
- `docs/AGENTS.md` — adapted from `dev/claude/docs/AGENTS.md` in this repo
- `.claude/seeds-version` — single line containing the schema version this project was last installed at (e.g. `2`). Read by `/pull-seeds`. See `docs/SCHEMA_VERSIONS.md`.

Plus a one-time global setup per machine:
- `~/.claude/devname` — single line with the dev's handle (e.g. `eric`). Used in session filenames.

### Velocity & Estimation

Effort uses Fibonacci points: 2, 3, 5, 8, 13. No 1s (just do it), no 13s if avoidable (break them down). Velocity = hours per effort point. `docs/VELOCITY_AND_POKER_GUIDE.md` covers the full methodology.

## Setting Up a New Dev Project

1. **Global one-time:** put a one-liner in `~/.claude/devname` (e.g. `eric`) — your dev handle.
2. **Project docs** — copy `dev/claude/docs/` contents to `docs/` in the project root. Fill in all `[Project Name]` and `[placeholder]` fields. `PROJECT_PLAN.md` has Phase 0 pre-filled — fill in Phase 1+ during planning.
3. **Sessions dir** — `mkdir sessions` in project root. (No template file needed — `/its-alive` creates entries.)
4. **CLAUDE.md** — copy `dev/claude/CLAUDE.md` to the project root. Fill in stack, data model, roles, and doc table.
5. **Agents** — copy `dev/claude/agents/` to `.claude/agents/` in the project root. Update `description:` frontmatter with the project name.
6. **Skills** — copy `dev/claude/skills/` directories to `.claude/skills/` in the project root (project-level install, not global).
7. **Shell alias** — source `dev/bash/aliases.sh` from `~/.bashrc` and add a project-specific alias.
8. **GitHub labels** (if using phase rituals) — `/start-phase` will create them on first use, but you can pre-create: `phase:0`–`phase:9`, `points:1`/`2`/`3`/`5`/`8`, `blocked`.
9. **Schema version** — `cp seeds-version <project>/.claude/seeds-version` so `/pull-seeds` can detect compatibility. See `docs/SCHEMA_VERSIONS.md`.
10. **VersionTag (deployable projects)** — copy `dev/claude/templates/VersionTag.tsx` to `<project>/src/components/VersionTag.tsx`. Wire into login screen + footer per `dev/claude/CLAUDE.md §Versioning`. Skip for non-deployable projects.
11. **Staging branch (optional)** — if shipping through a staging environment: `git checkout -b staging main && git push -u origin staging`. Skills auto-detect via `git ls-remote --heads origin staging`. See DEC-008.

After setup, run `/its-alive` in the new project to start the first session.

## Syncing Improvements Back

When the workflow evolves in an active project, run `/push-seeds` there. The @sync-config agent will:
- Diff live files against these templates
- Classify each change as a structural improvement (backport candidate) or project-specific substitution (skip)
- Flag patterns appearing in both `dev/` and `domain/` contexts that might eventually warrant a `shared/` extraction — but never extract automatically

One run, one commit per repo.

**Schema version compatibility:** before any seeds ↔ project sync (in either direction), the active skill (`/push-seeds`, future `/pull-seeds`) must compare `seeds-version` against `<project>/.claude/seeds-version`. Mismatch → STOP and surface the migration. Never auto-migrate. See `docs/SCHEMA_VERSIONS.md`.

## Verbosity

End-of-turn summaries: one or two sentences. What changed, what's next. Stop there.

Do not recap work I just watched you do. Do not restate the task. Do not explain why an obvious step was obvious. The summary exists so I can re-enter context next session — not so you can demonstrate effort.

If a turn ends with a tidy bullet list followed by three paragraphs of prose, the prose is wrong. Delete it.

Mid-session updates: one sentence per state change. "Found X." "Switching to Y." "Build green." Not a paragraph.

This rule applies double at session end. The session-summary block is the first thing I read next session — make it dense, not voluminous. Five points of work and a wall of text means I cannot actually use the summary. Cut the wall.

## Cost and Waste

Never minimize cost. Banned phrasings include but are not limited to:
- "essentially zero"
- "negligible"
- "only a few cents"
- "just X dollars"
- "a rounding error"
- "not a big deal"
- "don't worry about it"

If you find yourself reaching for one, stop.

It's my money. Willing-to-spend is not the same as willing-to-spend-flippantly. Treat every cost as real, including small ones. Same rule for compute, API calls, third-party services, and dependencies — anything that consumes resources I'm paying for.

Waste of any kind — food thrown out, hours lost, a bad batch, a bricked migration, an over-provisioned instance, a wrong dependency pulled — is a fact, not a problem to console me about. When I tell you something had to be discarded, do not reassure me it's fine. Acknowledge it and move on.

If you catch yourself about to write a reassurance, just don't. The fact is the fact.
