# [Project] — Claude Code Agents & Skills

## Overview
Several agents and slash-command skills support the development workflow. All run as Claude Code sessions, subagents, or slash commands. None are blocking — if one creates friction, drop it and revisit later. The summary table at the end of this doc is the canonical list — the per-skill sections below cover the original session-lifecycle set; newer skills (`/start-phase`, `/retro`, `/bump-major`, `/promote-staging`, etc.) are documented in their own `SKILL.md` files under `.claude/skills/`.

---

## Agents

### 1. @architect

**Purpose:** Reviews architectural and design decisions before they're committed.

**When to invoke:**
- Before adding a new library or dependency
- When a task requires a pattern you haven't used yet
- When scope creep is knocking at the door
- When a task has a DEC-TBD flagged in PROJECT_PLAN.md

**Spec:** `.claude/agents/architect.md`

**Output:** Recommendation (proceed / modify / reject) with reasoning. Draft DECISIONS.md entry if proceeding.

---

### 2. @code-review

**Purpose:** Lightweight post-commit review. Catches issues, inconsistencies, and potential bugs.

**When to invoke:**
- After completing a task or set of related commits (wired into `/kill-this`)
- Before merging a phase
- Optional — skip if it's slowing you down

**Spec:** `.claude/agents/code-review.md`

**Output:** Findings list ranked by severity, or "Clean Bill of Health."

---

### 3. @pm

**Purpose:** Tracks project state. Knows what's done, what's next, what's blocked.

**When to invoke:**
- Start of every work session (via `/its-alive`)
- End of every work session (via `/its-dead`)
- Status checks ("where are we?")
- Scope cut decisions

**Spec:** `.claude/agents/pm.md`

**Output:** Updated `docs/PROJECT_PLAN.md`. Timeline risk flags. Scope cut recommendations.

---

### 4. @sync-config

**Purpose:** Maintains the seeds template ↔ project sync. Classifies diffs, proposes backports, flags cross-family patterns.

**When to invoke:**
- `/push-seeds` (project → seeds)
- `/pull-seeds` (seeds → project, schema-version-gated)

**Spec:** `.claude/agents/sync-config.md`

**Output:** Diff report with proposed actions; user approves before any file changes (interactive mode) or auto-applies in nightly Routine.

---

### 5. @tape-reader

**Purpose:** Audits a session's JSONL transcript for anti-patterns. Used by `/read-the-tape`.

**When to invoke:**
- After a rough session, to figure out what went sideways
- After a good session, to bottle what worked

**Spec:** `.claude/agents/tape-reader.md`

**Output:** Findings + proposed skill or CLAUDE.md improvements.

---

### 6. @ui-reviewer

**Purpose:** Reviews visual design quality against the project's design system.

**When to invoke:**
- After completing a page or significant component
- At phase boundaries (formal review)
- When something "looks off" but you can't say why

**Note:** Type-gated — only applies to `webapp` projects per `.claude/type-manifest.yaml`. `tool` projects skip this agent.

**Spec:** `.claude/agents/ui-reviewer.md`

**Output:** Scored report (X/10) with prioritized issues and exact Tailwind class fixes.

---

### 7. @doc-consistency

**Purpose:** Cross-references factual claims across the project's doc set and flags mismatches and unfilled template placeholders. Report-only.

**When to invoke:**
- Mid-project, anytime the docs feel like they've drifted apart
- Before a phase boundary (clean-state check)
- After a session that touched multiple docs at once
- Via `/doc-consistency-check` (the manual surface)

**Spec:** `.claude/agents/doc-consistency.md`

**Scope:** `docs/*.md` + root `CLAUDE.md`. Type-aware via `.claude/project-type` — `webapp` must declare brand in BRAND.md; `tool` must justify any "not used"; literal `PLACEHOLDER` is always a finding regardless of type.

**Hard fences:** no structural recommendations (DEC numbering, file ownership, "you should reorganize"), no edits, no copy editing. Fact-check only.

**Output:** Per-category pass/MISMATCH report with file:line refs and verbatim conflicting quotes. Zero-finding sweeps are a valid full report.

---

## Session Skills

Slash commands manage session lifecycle. Time tracking is automatic.

### /its-alive — Session Start

**Purpose:** Stamps start time, reads last session context, recommends next task.

**What it does:**
1. Runs `date` to get current time
2. Opens a per-session file on the orphan `sessions` branch via `.sessions-worktree/`
3. Reads last session's context and any open task/phase state
4. Reads PROJECT_PLAN.md for current phase
5. Presents briefing with recommended task
6. Waits for confirmation before proceeding

**Spec:** `.claude/skills/its-alive/SKILL.md`

---

### /pause-this — Mid-Session Break

**Purpose:** Safe pause point within a session. Use when you need to walk away but aren't done with the task.

**What it does:**
1. Runs a build check — fixes errors before pausing
2. Commits WIP with descriptive message
3. Notes pause point in session file

**Spec:** `.claude/skills/pause-this/SKILL.md`

---

### /restart-this — Resume from Pause

**Purpose:** Reload context after a mid-session break.

**What it does:**
1. Reads the pause note from the session file
2. Reloads context from session file and PROJECT_PLAN.md
3. No new session number, no new timestamp — resuming same session

**Spec:** `.claude/skills/restart-this/SKILL.md`

---

### /kill-this — Per-Task PR + Log Append

**Purpose:** Per task. Build check, commit code, push the task branch, run code review, open a PR, append a `## Task <N>` block to the session file.

**What it does:**
1. Runs the relevant tests for what changed
2. Commits all changes with task prefix + Co-Authored-By
3. Pushes the task branch and opens a PR via `gh pr create`
4. Runs @code-review against the PR
5. Appends a `## Task <N>` block to the session file (on the orphan `sessions` branch)

May run multiple times in one session — once per task.

**Spec:** `.claude/skills/kill-this/SKILL.md`

---

### /its-dead — Session End (Once Per Claude Window)

**Purpose:** Stamps `ended:`, tallies points from per-task blocks, displays wall_clock for gut-check, commits + pushes the sessions branch. No time math (moved to `/retro` per DEC-013).

**Spec:** `.claude/skills/its-dead/SKILL.md`

---

## Session Workflow

**Starting a work session:**
1. `/its-alive` → get briefing and task recommendation
2. Confirm what you're working on

**During a work session:**
3. Spec → Plan → Approve → Build → Test → Manual smoke (if UI)
4. If hitting an architectural question → `@architect`
5. If session is getting long → `/pause-this` → break → `/restart-this`
6. When a task is done → `/kill-this`. Repeat per task.

**Ending a work session:**
7. `/its-dead` → close the session file. PRs can merge whenever.

**End of a phase:**
8. `/retro` → close phase, write retrospective, bump versions.

---

## Agent Summary

| Agent/Skill | Model | When | Purpose |
|-------------|-------|------|----------|
| @architect | Opus | Before design decisions | Keep architecture coherent |
| @code-review | Sonnet | After commits (via `/kill-this`) | Catch issues early |
| @pm | Sonnet | Start/end of sessions | Track progress, flag risks |
| @sync-config | Sonnet | `/push-seeds`, `/pull-seeds` | Template sync |
| @tape-reader | Sonnet | `/read-the-tape` | Transcript audit |
| @ui-reviewer | Sonnet | After UI work, phase boundaries (webapp only) | Design quality |
| @doc-consistency | Sonnet | Via `/doc-consistency-check`, mid-project, before phase boundaries | Cross-reference facts across docs; flag mismatches + placeholders. Report-only |
| /its-alive | — | Session start | Stamp + open session file + briefing |
| /pause-this | — | Mid-session break | Safe pause with commit |
| /restart-this | — | Resume from pause | Reload context |
| /kill-this | — | Per task | Build + commit + PR + log append |
| /its-dead | — | Session end (once per window) | Close session file |
| /start-phase | — | Phase boundary (start) | Materialize phase as Issues |
| /retro | — | Phase boundary (end) | Close out phase, write retro, bump versions |
| /bump-major | — | Breaking change | Manual major version bump |
| /promote-staging | — | Ship staging to prod | ff-merge `staging` → `main`, tag, push |
| /doc-consistency-check | — | Mid-project, before phase boundaries | Invokes @doc-consistency; cross-refs `docs/*.md` + root `CLAUDE.md` |
| /push-seeds | — | After workflow improvements | Backport project-side improvements to seeds templates |
| /pull-seeds | — | After seeds gets new improvements | Pull template changes into this project |
| /read-the-tape | — | After a session worth learning from | Audit session JSONL for anti-patterns |

**Per-session files:** the workflow uses `sessions/YYYY-MM-DD-HHMM-<dev>-<slug>.md` (one file per session) on the orphan `sessions` branch via `.sessions-worktree/`. `<dev>` comes from `~/.claude/devname` (one-line file, falls back to `$USER`). The slug is derived from the branch name (`task/X-foo` → `X-foo`, `main` → `main`, etc.). The active JSONL transcript path is captured in the file's frontmatter for later `/read-the-tape` audits.

**Task model (post phase-rituals rollout):** `PROJECT_PLAN.md` is a phase-boundary document — read at planning, written at retro. Current-phase tasks materialize as GitHub Issues with `phase:N` + `points:X` labels. The plan stays untouched mid-phase, eliminating merge contention with multiple devs.
