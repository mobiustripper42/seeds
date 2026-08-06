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

### @tape-reader
**Purpose:** Audits session JSONL transcripts for workflow anti-patterns (P1–P17). Under DEC-S039 it is an **observer** — it fixes project-owned files and records everything `logic`-class as a cited observation on the `observations` branch. It never edits a shared workflow file, including its own pattern list.
**When:** Via `/read-the-tape` skill, after a session worth learning from.
**Spec:** `.claude/agents/tape-reader.md`

### @workout
**Purpose:** The promotion half of the learning loop (DEC-S039). Reads the accumulated observations, groups them into patterns across repos and weeks, makes the severity call — cost and detectability, never a count — and opens one PR against `main`. Never merges it.
**When:** Via `/workout`, weekly or fortnightly, by hand. Not scheduled (DEC-S038).
**Spec:** `.claude/agents/workout.md`
**Note:** **Seeds-only.** It edits `dev/claude/**` and reads a branch that exists only here, so it is deliberately not a template — shipping it would install machinery no project can run. Not in the file-class registry, because nothing syncs it.


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

### /read-the-tape — Audit a session transcript
Resolves the seeds checkout, attaches `.observations-worktree/`, then invokes `@tape-reader` on a session JSONL. Applies project-owned fixes only; writes one cited observation per run — including a run that found nothing — to the `observations` branch.
**Spec:** `.claude/skills/read-the-tape/SKILL.md`

### /workout — Promote what accumulated (seeds only)
Invokes `@workout` on the observation inbox plus `LEDGER.md`, never the archive. Groups observations into patterns, makes the severity call, updates the ledger, archives the whole inbox, and opens one PR against `main`. Weekly or fortnightly, by hand.
**Spec:** `.claude/skills/workout/SKILL.md`


---

## Session Workflow

**Start:** `/its-alive` → get briefing and task recommendation
**During:** spec → build → test → mobile screenshot (N/A for seeds)
**Pause:** `/pause-this` → break → `/restart-this`
**End:** `/kill-this` → review draft → `/its-dead` → finalize + push
**After a notable session:** `/read-the-tape` → fix what the project owns → observation lands on the `observations` branch
**Weekly/fortnightly, in seeds:** `/workout` → group, judge, promote → one PR against `main` → merge → **copy the change out by hand** (DEC-S040)
**Moving any file between seeds and a project:** manual `cp`. No skill, no classifier. Check `file-classes` first.

---

## Summary Table

| Agent/Skill | Model | When | Purpose |
|-------------|-------|------|---------|
| @architect | Opus 5 | Before design decisions | Keep architecture coherent |
| @code-review | Sonnet | After commits | Catch issues early |
| @pm | Sonnet | Start/end of sessions | Track progress, flag risks |
| @ui-reviewer | Sonnet | After UI work | Design quality (N/A for seeds) |
| @tape-reader | Sonnet | Via /read-the-tape | Observe transcripts; fix project-owned files, record the rest |
| @workout | Opus 5 | Via /workout, weekly/fortnightly — seeds only | Group observations into patterns, judge severity, promote via one PR |
| @doc-consistency | Sonnet | Via /doc-consistency-check | Cross-reference doc claims. Report-only, no edits |
| @ideas | Sonnet | Park or re-rank an idea | Curate the FUTURE_IDEAS parking lot |
| /its-alive | — | Session start | Timestamp + briefing |
| /pause-this | — | Mid-session break | Safe pause with commit |
| /restart-this | — | Resume from pause | Reload context |
| /kill-this | — | Session end (part 1) | Draft log entry |
| /its-dead | — | Session end (part 2) | Finalize + push |
| /read-the-tape | — | After notable sessions | Audit; fix project-owned files, write one observation |
| /workout | — | Weekly/fortnightly — seeds only | Promote accumulated observations into template changes |
| /start-phase | — | Phase boundary (start) | Materialize the phase as GitHub Issues |
| /retro | — | Phase boundary (end) | Close the phase, compute throughput, bump minor |
| /bump-major | — | Breaking change | Manual major bump + CHANGELOG + tag |
| /promote-production | — | Ship trunk to prod | ff-merge `main` → `production`, patch-bump |
| /doc-consistency-check | — | When docs feel drifted | Cross-read docs for drift. Report-only |
