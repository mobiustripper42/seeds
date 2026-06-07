# seeds

Personal templates and workflow tooling for Claude Code projects. Two families:

- **`dev/`** — software development projects (Next.js + Supabase shape, session lifecycle skills, agent workflow)
- **`domain/`** — non-dev domains (bread, tomatoes, ops workflows, etc.) — aspirational; populated as domains get scaffolded

## `dev/`

### `dev/bash/`
- `aliases.sh` — shell aliases for Claude Code workflows

### `dev/claude/`
- `CLAUDE.md` — project CLAUDE.md template (fill in project-specific sections)
- `settings.json` — **master Claude Code permission policy** (default-allow + deny guardrail). Source of truth; distributed by hand — see § Permission settings (DEC-S023).
- `session-log.md` — blank session log (copy to project root)
- `agents/` — Claude Code agent definitions (copy to `.claude/agents/` in your project)
  - `architect.md` — architectural decision reviewer
  - `code-review.md` — post-commit code reviewer
  - `pm.md` — project manager / velocity tracker
  - `ui-reviewer.md` — visual design reviewer (fill in your design system details)
  - `sync-config.md` — template maintenance agent; classifies diffs, proposes backports, flags cross-family patterns
- `skills/` — session lifecycle slash commands (copy to `.claude/skills/` in your project)
  - `its-alive/` — session start ritual
  - `kill-this/` — session end part 1 (build, commit, draft log)
  - `its-dead/` — session end part 2 (finalize log, push, PM check)
  - `pause-this/` — mid-session pause with WIP commit
  - `restart-this/` — resume from pause
  - `push-seeds/` — invokes @sync-config agent to push improvements back to seeds
- `docs/` — project document templates (copy to `docs/` in your project)
  - `AGENTS.md` — agent and skill reference (adapt project name/details)
  - `SPEC.md` — product specification template
  - `DECISIONS.md` — architectural decisions log (starts with standard DEC-001–004)
  - `USER_STORIES.md` — user story template
  - `BRAND.md` — brand and visual direction template
  - `PROJECT_PLAN.md` — project plan with Phase 0 pre-filled
  - `RETROSPECTIVES.md` — phase-end retrospective template (velocity, scope, forecast)
  - `VELOCITY_AND_POKER_GUIDE.md` — estimation method and velocity tracking

## `domain/`

Non-dev domain templates. Nothing here yet — populated as domains get scaffolded. Starting with bread.

## Setup (new dev project)

1. **Project docs** — copy `dev/claude/docs/` contents to `docs/` in your project root. Fill in all `[Project Name]` and `[placeholder]` fields.
2. **Session log** — copy `dev/claude/session-log.md` to your project root. Update the header.
3. **CLAUDE.md** — copy `dev/claude/CLAUDE.md` to your project root. Fill in all project-specific sections.
4. **Agents** — copy `dev/claude/agents/` to `.claude/agents/` in your project root. Update `description:` frontmatter with your project name.
5. **Skills** — copy `dev/claude/skills/` directories to `.claude/skills/` in the project root (project-level install, not global).
6. **Shell alias** — source `dev/bash/aliases.sh` from `~/.bashrc` and add a project-specific alias (see comments in the file).

After setup, run `/its-alive` in the new project to start your first session.

## Permission settings (DEC-S023)

**Posture: default-allow.** `dev/claude/settings.json` is the **master** — `allow` carries `Bash(*)`, and the **deny list is the only seatbelt** (`deny` beats `allow`, so dangerous/secret commands are blocked and everything else runs without prompting). Use `defaultMode: default`, never `bypassPermissions` (that turns the deny list off too).

The master is **not auto-synced.** Distribute it by hand:

| Where | How | Covers |
|-------|-----|--------|
| **mill-dev** | copy master → `~/.claude/settings.json` | all repos + ad-hoc dirs on the box |
| **bee-grace** | copy master → `~/.claude/settings.json` | all repos + ad-hoc dirs on the box |
| **windows laptop** | copy master → `%USERPROFILE%\.claude\settings.json` | all repos + ad-hoc dirs on the box |
| **phone (CC on web)** | commit a per-repo `.claude/settings.json` matching the master | only that repo |

mill-dev and bee-grace are **separate machines** — two separate globals. Globals don't travel via git; set once per box (re-copy when the master changes).

> ⚠ **Phone reminder:** the cloud container has no editable global. Before a code-heavy phone/web session, confirm that repo's **committed** `.claude/settings.json` matches the master — that file is the only thing that reaches the container.

**Changing the policy.** Don't fiddle with `/permissions` per-machine. The recurring trigger is never a simple missing command (default-allow covers those) — it's something gnarly that got denied. Bring it to a Claude session in seeds: it edits the master and hands you the redistribute steps above.

**Cleaning up `.claude/settings.local.json`** (per-repo, gitignored — accumulates "always allow" entries). Under default-allow most become redundant. Paste this into a CC session in any repo to prune it (preserves your personal denies):

```
Clean up this repo's .claude/settings.local.json.
1. Read it and show me the current contents.
2. Under our posture (global ~/.claude/settings.json allows Bash(*); the master deny
   list is the guardrail), flag each entry: REDUNDANT (allow already covered by global
   Bash(*) → remove); STALE (allow for something the master now DENIES → remove);
   KEEP (any `deny` I added here → do NOT touch); UNCLEAR (leave it, ask me).
3. Show the proposed cleaned file. Wait for my OK before writing.
4. On OK: write it, confirm valid JSON. If everything was removable, leave
   {"permissions":{}} rather than deleting the file.
```

## Syncing improvements back

Run `/push-seeds` in any active project to invoke @sync-config, which classifies diffs between live files and these templates, proposes backports, and flags patterns that might eventually warrant a `shared/` extraction.
