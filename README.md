# dev-config

Personal Claude Code configuration, templates, and workflow tooling. Copy what you need into a new project.

## Contents

### `bash/`
- `aliases.sh` — shell aliases for Claude Code workflows

### `claude/`
- `CLAUDE.md` — project CLAUDE.md template (fill in project-specific sections)
- `agents/` — Claude Code agent definitions (copy to `.claude/agents/` in your project)
  - `architect.md` — architectural decision reviewer
  - `code-review.md` — post-commit code reviewer
  - `pm.md` — project manager / velocity tracker
  - `ui-reviewer.md` — visual design reviewer (fill in your design system)
- `skills/` — session lifecycle slash commands (copy to `~/.claude/skills/`)
  - `its-alive/` — session start ritual
  - `kill-this/` — session end part 1 (build, commit, draft log)
  - `its-dead/` — session end part 2 (finalize log, push, PM check)
  - `pause-this/` — mid-session pause with WIP commit
  - `restart-this/` — resume from pause
- `docs/AGENTS.md` — reference doc explaining agents and skills (adapt for your project)

## What's Missing

- **Velocity tracker JSX** — referenced in SailBook CLAUDE.md but never built. Someday.
- **VELOCITY_AND_POKER_GUIDE.md** — same story.

## Setup

1. Copy `claude/CLAUDE.md` to your project root and fill in the project-specific sections.
2. Copy `claude/agents/` to `.claude/agents/` in your project root.
3. Copy `claude/skills/` directories to `~/.claude/skills/`.
4. Source `bash/aliases.sh` from your `.bashrc` or `.bash_aliases`.
