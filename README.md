# domain-seeds

Personal Claude Code configuration, templates, and workflow tooling. Copy what you need into a new project.

## Contents

### `bash/`
- `aliases.sh` — shell aliases for Claude Code workflows

### `claude/`
- `CLAUDE.md` — project CLAUDE.md template (fill in project-specific sections)
- `session-log.md` — blank session log (copy to project root)
- `agents/` — Claude Code agent definitions (copy to `.claude/agents/` in your project)
  - `architect.md` — architectural decision reviewer
  - `code-review.md` — post-commit code reviewer
  - `pm.md` — project manager / velocity tracker
  - `ui-reviewer.md` — visual design reviewer (fill in your design system details)
- `skills/` — session lifecycle slash commands (copy to `~/.claude/skills/`)
  - `its-alive/` — session start ritual
  - `kill-this/` — session end part 1 (build, commit, draft log)
  - `its-dead/` — session end part 2 (finalize log, push, PM check)
  - `pause-this/` — mid-session pause with WIP commit
  - `restart-this/` — resume from pause
- `docs/` — project document templates (copy to `docs/` in your project)
  - `AGENTS.md` — agent and skill reference (adapt project name/details)
  - `SPEC.md` — product specification template
  - `DECISIONS.md` — architectural decisions log (starts with standard DEC-001–004)
  - `USER_STORIES.md` — user story template
  - `BRAND.md` — brand and visual direction template
  - `PROJECT_PLAN.md` — project plan with Phase 0 pre-filled
  - `RETROSPECTIVES.md` — phase-end retrospective template (velocity, scope, forecast)
  - `VELOCITY_AND_POKER_GUIDE.md` — estimation method and velocity tracking

## Setup (new project)

1. **Project docs** — copy `claude/docs/` contents to `docs/` in your project root. Fill in all `[Project Name]` and `[placeholder]` fields.
2. **Session log** — copy `claude/session-log.md` to your project root. Update the header.
3. **CLAUDE.md** — copy `claude/CLAUDE.md` to your project root. Fill in all project-specific sections.
4. **Agents** — copy `claude/agents/` to `.claude/agents/` in your project root. Update `description:` frontmatter with your project name.
5. **Skills** — copy `claude/skills/` directories to `~/.claude/skills/` (one-time, global install — skip if already installed).
6. **Shell alias** — source `bash/aliases.sh` from `~/.bashrc` and add a project-specific alias (see comments in the file).

After setup, run `/its-alive` in the new project to start your first session.
