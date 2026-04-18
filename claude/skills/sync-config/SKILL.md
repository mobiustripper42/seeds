---
name: sync-config
description: Syncs workflow improvements from the active project back to the dev-config template repo (~/.claude/skills/ and .claude/agents/ vs ~/dev-config). Diffs live files against templates, classifies changes as structural improvements vs project-name substitutions, and propagates the structural ones. Run when a skill or agent has been meaningfully improved mid-project.
tools: Read, Edit, Write, Bash, Glob, Grep
---

## Purpose

Sync workflow improvements (new steps, revised logic, bug fixes) from the active project back to `~/dev-config`. Do NOT sync project-specific content — project names, deadlines, schema references, domain-specific file paths. Only structural improvements to the workflow itself.

## Paths

- Live skills: `~/.claude/skills/`
- Live agents: `.claude/agents/` (current project root)
- Dev-config skills: `~/dev-config/claude/skills/`
- Dev-config agents: `~/dev-config/claude/agents/`

Adjust `~/dev-config` to match the actual path of the dev-config repo on this machine.

## Step 1 — Diff skills

For each skill directory in `~/.claude/skills/`, run:
```
diff ~/.claude/skills/<name>/SKILL.md ~/dev-config/claude/skills/<name>/SKILL.md
```

Collect all diffs. Skip `sync-config` itself.

## Step 2 — Diff agents

For each `.md` file in `.claude/agents/`, run:
```
diff .claude/agents/<name>.md ~/dev-config/claude/agents/<name>.md
```

Collect all diffs.

## Step 3 — Classify each diff hunk

For every changed hunk, classify it:

**Skip (project-specific substitution):**
- Project name (e.g., "SailBook" → "[Project]") — same text, different name
- Hard deadline dates or season references
- Project-specific file paths or schema references
- Domain references specific to the project

**Flag for backport (structural improvement):**
- A new step added to a skill
- A step removed or reordered
- New logic, conditions, or behavior
- Bug fixes (wrong variable, wrong file marker, etc.)
- Additions to the session log draft format

## Step 4 — Present findings

Output a summary table:

| File | Change summary | Classification | Action |
|------|----------------|----------------|--------|

For each **structural improvement**, show the full diff hunk and ask: **"Backport this to dev-config? (y/n)"**

Wait for user response on each one before proceeding.

## Step 5 — Apply approved backports

For each approved change:

1. Read the target dev-config file
2. Apply the structural change
3. Replace any project-specific strings with generic equivalents:
   - Project name → `[Project]`
   - Specific deadline → "the project deadline" or "launch date"
   - Project-specific file paths → generic equivalents
4. Write the updated file

## Step 6 — Flag live bugs

If any diff shows dev-config is more correct than the live version (e.g., correct file marker, right variable name), flag it:

> **Live version bug:** `<file>` — dev-config says X, live says Y. Fix live version? (y/n)

Apply if approved.

## Step 7 — Report

List:
- Files updated in dev-config
- Live bugs fixed (if any)
- Changes skipped (project-specific, not backported)

Remind the user to review before committing either repo.
