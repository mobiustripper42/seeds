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
| `sessions/*.md` (on orphan `sessions` branch) | Per-session files (one per session). Filename: `YYYY-MM-DD-HHMM-<dev>-<slug>.md`. Lives on the orphan `sessions` branch, accessed via `.sessions-worktree/` (DEC-014). Atomic after `/its-dead` writes `status: closed` (DEC-013). |
| `session-log.md` | Legacy archive — pre-rollout sessions only. New sessions write to the orphan `sessions` branch. |

## What This Repo Is

A personal template library: Claude Code workflow templates, agent definitions, session skills, and shell aliases intended to be copied into new projects. Nothing here runs — it's all source material.

Two template families:
- **`dev/`** — software development projects
- **`domain/`** — non-dev domains (bread, tomatoes, ops, etc.) — aspirational, populated as patterns emerge

## Repo Layout

```
seeds-version            # Single line — current schema version (integer, no `v` prefix)

.claude/
  routine-config.yaml      # Routine config — exclude list, directions, per-direction PR/branch prefixes (DEC-010)
  type-manifest.yaml       # Project-type gating manifest read by @sync-config (DEC-011)

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
    routines/              # Source-controlled prompts for scheduled Anthropic Routines
      nightly-sync.md      # Nightly bi-directional sync Routine (DEC-010)
      README.md            # How to deploy + update Routines via /web-setup
    templates/             # Code templates — copy individually as needed
      VersionTag.tsx       # Build-time version display (DEC-007). Wire into login + footer.
    scripts/               # Per-project scripts — copy individually as needed
      safe-supabase.sh     # Supabase prod-write guard (DEC-009). Wrap with shell alias.
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
| `/its-alive` | Session start | Ensures `.sessions-worktree/` exists, stamps time, opens a per-session file on the orphan `sessions` branch, captures the active JSONL transcript path, reads last session context, recommends task (DEC-014) |
| `/pause-this` | Mid-session break | Runs build check, commits WIP on the task branch, notes pause in the session file on the sessions branch |
| `/restart-this` | Resume from pause | Reloads context from the open session file — no new session number |
| `/kill-this` | Per-task (DEC-013) | Build check, code commit on the task branch, runs @code-review, opens a PR, appends a `## Task <N>` block to the running session file. May run multiple times per Claude window — one per task |
| `/its-dead` | Session end (once per window) | Stamps `ended:`, tallies total points, displays wall_clock to screen for gut-check, closes the session file. No time math, no version bump — those moved to `/retro` (DEC-013) |
| `/start-phase` | Phase boundary (start) | Reads next phase from PROJECT_PLAN.md, creates one Issue per task with `phase:N` and `points:X` labels, writes issue numbers back into the plan |
| `/retro` | Phase boundary (end) | Computes per-session wall/dev/review times from each session's `started`/`ended`/transcript/PR timestamps. Aggregates to phase velocity. Marks tasks `[x]`, prompts retro notes, appends to RETROSPECTIVES.md, runs version bumps (patch per merged PR + minor at phase close), optionally chains into `/start-phase` (DEC-013) |
| `/bump-major` | Breaking change | Manually bumps major version. CHANGELOG entry + tag on the trunk (`main`). Dev projects only |
| `/promote-production` | Ship trunk to prod | ff-merges `main` → `production` (deploy-only; tag already on the commit), pushes. Projects with a `production` branch only |
| `/push-seeds` | After workflow improvements | Invokes @sync-config to classify diffs and propose backports to seeds |
| `/pull-seeds` | After seeds gets new improvements | Resolves seeds checkout, gates on `seeds-version` compatibility, invokes @sync-config in pull direction to apply approved changes to the project |
| `/read-the-tape` | After a session worth learning from | Invokes @tape-reader to audit JSONL transcript, find anti-patterns, propose skill improvements |
| `/doc-consistency-check` | Mid-project, before phase boundaries, or after a multi-doc session | Invokes @doc-consistency to cross-reference factual claims across `docs/*.md` + root `CLAUDE.md` and flag mismatches and unfilled placeholders. Report-only |

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
| @doc-consistency | Sonnet | Via `/doc-consistency-check` skill, or ad-hoc | Cross-reference factual claims across project docs; flag mismatches + unfilled placeholders. Report-only, no edits |

### Files a target project needs

The skills and agents expect these files to exist in the project root:

- **orphan `sessions` branch + `.sessions-worktree/`** (DEC-014) — per-session files live here, not on `main`. `/its-alive` Step 0.6 auto-creates the worktree (and the branch on first run). `.sessions-worktree/` should be `.gitignore`d from `main`.
- `docs/PROJECT_PLAN.md` — phases, tasks, estimates, velocity table
- `docs/RETROSPECTIVES.md` — phase-end retros (created by `/retro` if missing)
- `docs/SPEC.md` — scope (V1 vs later) and "Not V1" list
- `docs/DECISIONS.md` — architectural decisions with IDs (e.g. DEC-001)
- `docs/AGENTS.md` — adapted from `dev/claude/docs/AGENTS.md` in this repo
- `.claude/seeds-version` — single line containing the schema version this project was last installed at (e.g. `2`). Read by `/pull-seeds`. See `docs/SCHEMA_VERSIONS.md`.
- `.claude/project-type` — single line naming the project's type: `webapp` (Next.js + Supabase shape) or `tool` (CLI / agent / library shape). Read by `@sync-config` to gate template files that don't apply to the project's type (DEC-011). Optional but recommended; without it, `@sync-config` skips type-gating and diffs every template file.

Plus a one-time global setup per machine:
- `~/.claude/devname` — single line with the dev's handle (e.g. `eric`). Used in session filenames.

### Velocity & Estimation

Effort uses Fibonacci points: 2, 3, 5, 8, 13. No 1s (just do it), no 13s if avoidable (break them down). Velocity = hours per effort point. `docs/VELOCITY_AND_POKER_GUIDE.md` covers the full methodology.

## Setting Up a New Dev Project

1. **Global one-time:** put a one-liner in `~/.claude/devname` (e.g. `eric`) — your dev handle.
2. **Project docs** — copy `dev/claude/docs/` contents to `docs/` in the project root. Fill in all `[Project Name]` and `[placeholder]` fields. `PROJECT_PLAN.md` has Phase 0 pre-filled — fill in Phase 1+ during planning.
3. **Sessions branch + worktree (DEC-014)** — `/its-alive` Step 0.6 creates these automatically on first run (orphan `sessions` branch + `.sessions-worktree/` checkout). You can do it manually if preferred: `git checkout --orphan sessions && git rm -rf . && mkdir sessions && echo "# Sessions branch" > sessions/README.md && git add . && git commit -m "Initialize sessions branch" && git push -u origin sessions && git checkout main && echo ".sessions-worktree/" >> .gitignore && git add .gitignore && git commit -m "Ignore .sessions-worktree" && git push && git worktree add .sessions-worktree sessions`.
4. **CLAUDE.md** — copy `dev/claude/CLAUDE.md` to the project root. Fill in stack, data model, roles, and doc table.
5. **Agents** — copy `dev/claude/agents/` to `.claude/agents/` in the project root. Update `description:` frontmatter with the project name.
6. **Skills** — copy `dev/claude/skills/` directories to `.claude/skills/` in the project root (project-level install, not global).
7. **Shell alias** — source `dev/bash/aliases.sh` from `~/.bashrc` and add a project-specific alias.
8. **GitHub labels** (if using phase rituals) — `/start-phase` will create them on first use, but you can pre-create: `phase:0`–`phase:9`, `points:1`/`2`/`3`/`5`/`8`, `blocked`.
9. **Schema version** — `cp seeds-version <project>/.claude/seeds-version` so `/pull-seeds` can detect compatibility. See `docs/SCHEMA_VERSIONS.md`.
10. **Project type (DEC-011)** — write the project's type to `<project>/.claude/project-type` as a single line. Currently supported: `webapp` (Next.js / React / shadcn / Supabase / Vercel) or `tool` (CLI / agent / library; Node stdlib + shell). The type gates a small set of template files in `dev/claude/` (e.g. `agents/ui-reviewer.md` is `webapp`-only). See `.claude/type-manifest.yaml`. Optional — if omitted, `@sync-config` runs without gating and forward-ports every template file.
11. **VersionTag (deployable projects)** — copy `dev/claude/templates/VersionTag.tsx` to `<project>/src/components/VersionTag.tsx`. Wire into login screen + footer per `dev/claude/CLAUDE.md §Versioning`. Skip for non-deployable projects.
12. **Production branch (optional, deployable projects)** — if the project deploys, add a downstream `production` branch: `git checkout -b production main && git push -u origin production`, then repoint the host's production branch (e.g. Vercel → Settings → Git → Production Branch) from `main` to `production` **before** `main` takes active work (otherwise WIP auto-deploys to prod). `main` stays the active trunk; `/promote-production` ff-merges `main` → `production` to ship. See DEC-022.
13. **Supabase prod-write guard (Supabase projects)** — copy `dev/claude/scripts/safe-supabase.sh` to `<project>/scripts/safe-supabase.sh`, `chmod +x`, then `mkdir -p .claude && echo "<your-prod-ref>" > .claude/prod-supabase-refs && echo ".claude/prod-supabase-refs" >> .gitignore`. Optional alias: `alias supabase='./scripts/safe-supabase.sh'`. See DEC-009 + `dev/claude/CLAUDE.md §Migration Protocol`.

After setup, run `/its-alive` in the new project to start the first session.

## Syncing Improvements Back

When the workflow evolves in an active project, run `/push-seeds` there. The @sync-config agent will:
- Diff live files against these templates
- Classify each change as a structural improvement (backport candidate) or project-specific substitution (skip)
- Flag patterns appearing in both `dev/` and `domain/` contexts that might eventually warrant a `shared/` extraction — but never extract automatically

One run, one commit per repo.

**Schema version compatibility:** before any seeds ↔ project sync (in either direction), the active skill (`/push-seeds`, future `/pull-seeds`) must compare `seeds-version` against `<project>/.claude/seeds-version`. Mismatch → STOP and surface the migration. Never auto-migrate. See `docs/SCHEMA_VERSIONS.md`.

## The Routine

Bi-directional sync also runs unattended via a nightly Anthropic Routine (DEC-010). The Routine clones seeds, reads `.claude/routine-config.yaml` for filter rules + directions + PR/branch prefixes, enumerates the repos its MCP github session has access to (the **Routine form's repo chip area on claude.ai is the active-set source of truth**), filters by `exclude:` + `require:` + `.claude/seeds-version` match, and per (repo × direction) invokes @sync-config in `mode: auto`. Each invocation that produces non-empty changes opens its own PR — upstream PRs land on `mobiustripper42/seeds:main`, downstream PRs land on each project's default branch (the active trunk; never a `production` deploy branch — DEC-022). Nothing merges automatically; the PR is the human review surface.

- **Prompt source of truth:** `dev/claude/routines/nightly-sync.md`. Edit there, then re-paste into the Routine config on claude.ai (manual — see `dev/claude/routines/README.md`).
- **Active-set source of truth:** the Routine form's repo chip area on claude.ai — NOT `routine-config.yaml`. Add a project = add chip + toggle "Allow unrestricted git push" in Permissions. Remove = remove chip. No config edit either way.
- **Config source of truth:** `.claude/routine-config.yaml` carries `exclude:`, `require:`, `directions:`, and per-direction PR/branch prefixes. No `orgs:` or active-repo list (DEC-010 post-mortem from the 2026-05-08 first run).
- **Provenance labeling:** every PR body the Routine opens includes a per-hunk classification table with `Provenance` column — `Project-only` / `Template-only` / `Both-modified` / `Type-gated`. The first three are hunk-level (Step 2 rubric); `Type-gated` is whole-file (Step 1 scoping per DEC-011 — file dropped because the project's `.claude/project-type` doesn't match the manifest's allowed list). See `@sync-config` for both rubrics.
- **Project-type gating:** projects with `.claude/project-type` set get filtered against `<seeds>/.claude/type-manifest.yaml` before diffing — irrelevant template files (e.g. `agents/ui-reviewer.md` for a `tool`-type project) drop out of scope and surface as `Type-gated` skips in the PR body. Projects without `.claude/project-type` are treated as ungated (legacy behavior). DEC-011.
- **Schema-version mismatches** are skipped per-repo and rolled into a single rolling `routine: migration backlog` issue on `mobiustripper42/seeds`. Migrate the project, next run picks it back up.
- **Per-run summary:** rolling `routine: last run <DATE>` issue on `mobiustripper42/seeds`. Body replaced each run.
- **Run budget:** Pro plan caps Routines at 5 runs/day across all your Routines. This one assumes a single nightly fire.

Manual `/push-seeds` and `/pull-seeds` still exist for ad-hoc pulls and pushes — the Routine handles the steady-state, manual handles the "I want it now" cases.

## Verbosity

End-of-turn summaries: one or two sentences. What changed, what's next. Stop there.

Do not recap work I just watched you do. Do not restate the task. Do not explain why an obvious step was obvious. The summary exists so I can re-enter context next session — not so you can demonstrate effort.

If a turn ends with a tidy bullet list followed by three paragraphs of prose, the prose is wrong. Delete it.

Mid-session updates: one sentence per state change. "Found X." "Switching to Y." "Build green." Not a paragraph.

This rule applies double at session end. The session-summary block is the first thing I read next session — make it dense, not voluminous. Five bullets of work and a wall of text means I cannot actually use the summary. Cut the wall.

## Cost and Waste

Never minimize cost. Banned phrasings include but are not limited to:
- "essentially zero"
- "negligible"
- "only a few cents"
- "just X dollars"
- "a rounding error"
- "not a big deal"
- "don't worry about it"

If you find yourself reaching for one, stop. Any synonym counts. If the function of the phrase is to minimize, it's banned.

It's my money. Willing-to-spend is not the same as willing-to-spend-flippantly. Treat every cost as real, including small ones. Same rule for compute, API calls, third-party services, and dependencies — anything that consumes resources I'm paying for.

Waste of any kind — food thrown out, hours lost, a bad batch, a bricked migration, an over-provisioned instance, a wrong dependency pulled — is a fact, not a problem to console me about. When I tell you something had to be discarded, do not reassure me it's fine. Acknowledge it and move on.

If you catch yourself about to write a reassurance, just don't. The fact is the fact.
