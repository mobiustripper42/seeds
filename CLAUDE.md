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
| `docs/SCHEMA_VERSIONS.md` | Schema versioning policy + version history (V1, V2, …) + migration notes. Turns a version gap into a task list — it gates nothing now (DEC-S040). |
| `seeds-version` | Single line at repo root — the latest published schema version. Compared against `<project>/.claude/seeds-version` by hand, to answer "how far behind is this repo". |
| `sessions/*.md` (on orphan `sessions` branch) | Per-session files (one per session). Filename: `YYYY-MM-DD-HHMM-<dev>-<slug>.md`. Lives on the orphan `sessions` branch, accessed via `.sessions-worktree/` (DEC-S014). Atomic after `/its-dead` writes `status: closed` (DEC-S013). |
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
  routine-config.yaml      # The file-class registry (DEC-S018). NO automated reader since DEC-S040 —
                           # it now answers "is this file safe to copy wholesale, or project-owned?" for a human
  type-manifest.yaml       # Which template files a project type has no use for (DEC-S011). Same status: documentation
  agents/workout.md        # SEEDS-ONLY agent (DEC-S039). Not a template — see "The Learning Loop" below
  skills/workout/          # SEEDS-ONLY skill (DEC-S039). Ditto

observations/*.md          # On the orphan `observations` branch, via `.observations-worktree/` (DEC-S039).
                           # The accumulating record: one file per /read-the-tape run, plus LEDGER.md and archive/

dev/
  bash/
    aliases.sh             # Shell aliases for Claude Code workflows (source from ~/.bashrc)
  claude/
    CLAUDE.md              # Project CLAUDE.md SHELL (DEC-S019) — universal workflow guidance; copy verbatim, syncs from seeds. Don't edit per-project.
    CLAUDE-context.md      # Project context TEMPLATE (DEC-S019) — copy to <project>/.claude/CLAUDE-context.md and fill placeholders. Project-owned, never syncs.
    settings.json          # Baseline CC permission policy (DEC-S023). Merge by hand into <project>/.claude/settings.json — NOT auto-synced.
    session-log.md         # Blank session log (copy to project root)
    agents/                # Agent definition files — copy to .claude/agents/ in your project
    skills/                # Session lifecycle skills — copy to .claude/skills/ in your project
      read-the-tape/       # Observes a session; writes to seeds' observations branch, edits nothing (DEC-S040)
    templates/             # Code templates — copy individually as needed
      VersionTag.tsx       # Build-time version display (DEC-S007). Wire into login + footer.
    doc-check.json         # Config for check-docs.mjs (DEC-S037) — copy to <project>/.claude/doc-check.json and fill in repo slug + roster/exemption lists
    scripts/               # Per-project scripts — copy to <project>/scripts/
      gen-decisions-index.mjs  # Generates docs/DECISIONS.md + every reciprocal amendment pointer (DEC-S036)
      check-decisions.mjs      # Gates the decision record. Runs first in verify — fails in ms
      check-decisions.test.mjs # vitest suite for both of the above
      check-context.mjs        # Asserts paths cited in the always-loaded context docs resolve
      check-docs.mjs           # Doc-set ratchet — DEC refs, npm scripts, issue links, rosters, paths (DEC-S037)
      drift.mjs                # SEEDS-SIDE, read-only. What differs between these templates and one
                               # project. Enumerates; never copies, never says which side wins
      split-decisions.mjs      # ONE-TIME v4→v5 migration: monolithic DECISIONS.md → docs/decisions/
      throughput.py            # Throughput extraction for /retro
      safe-supabase.sh         # Supabase prod-write guard (DEC-S009). Wrap with shell alias.
    docs/
      AGENTS.md            # Reference doc explaining the full agent + skill workflow
      VELOCITY_AND_POKER_GUIDE.md  # Estimation and velocity tracking methodology
      DECISIONS.md         # GENERATED index — do not edit; output of gen-decisions-index.mjs
      decisions/           # The decision record, one file per decision (DEC-S036)
        _config.json       # Topic order + id families. The ONLY project-specific knob — scripts stay identical
        _preamble.md       # Index header prose
        DEC-001-example…md # Shows the file shape + both frontmatter declaration forms. Delete after install

domain/
  README.md                # Stub — populated as non-dev domains get scaffolded
```

## The Workflow System

This repo encodes a specific development workflow for solo Claude-assisted projects. The key pieces:

### Session Skills (copy to `.claude/skills/` in your project)

| Skill | When | What it does |
|-------|------|--------------|
| `/its-alive` | Session start | Ensures `.sessions-worktree/` exists, stamps time, opens a per-session file on the orphan `sessions` branch, captures the active JSONL transcript path, reads last session context, recommends task (DEC-S014) |
| `/pause-this` | Mid-session break | Runs build check, commits WIP on the task branch, notes pause in the session file on the sessions branch |
| `/restart-this` | Resume from pause | Reloads context from the open session file — no new session number |
| `/kill-this` | Per-task (DEC-S013) | Build check, code commit on the task branch, runs @code-review, opens a PR, appends a `## Task <N>` block to the running session file. May run multiple times per Claude window — one per task |
| `/its-dead` | Session end (once per window) | Stamps `ended:`, tallies total points, displays wall_clock to screen for gut-check, closes the session file. No time math, no version bump — those moved to `/retro` (DEC-S013) |
| `/start-phase` | Phase boundary (start) | Reads next phase from PROJECT_PLAN.md, creates one Issue per task with `phase:N` and `points:X` labels, writes issue numbers back into the plan |
| `/retro` | Phase boundary (end) | Computes per-session active time (wall − breaks, breaks inferred from the transcript) from each session's `started`/`ended`. Aggregates to one phase velocity (active h/pt). Marks tasks `[x]`, prompts retro notes, appends to RETROSPECTIVES.md, runs version bumps (patch per merged PR + minor at phase close), optionally chains into `/start-phase` (DEC-S013) |
| `/bump-major` | Breaking change | Manually bumps major version. CHANGELOG entry + tag on the trunk (`main`). Dev projects only |
| `/promote-production` | Ship trunk to prod | ff-merges `main` → `production` (deploy-only; tag already on the commit), pushes. Projects with a `production` branch only |
| `/read-the-tape` | After a session worth learning from | Invokes @tape-reader to audit the JSONL transcript and write one cited observation to seeds' `observations` branch. **Changes nothing in the project** (DEC-S040). Requires a resolvable seeds checkout |
| `/doc-consistency-check` | Ad-hoc, when docs feel drifted (no scheduled trigger) | Invokes @doc-consistency to cross-reference factual claims across `docs/*.md` + root `CLAUDE.md` and flag mismatches and unfilled placeholders. Report-only |

**Dev identity:** skills resolve `DEV` from `~/.claude/devname` (one-line file) with `$USER` as fallback. Set once per machine. Used in session filenames so two devs never collide.

**Task management model (post phase-rituals rollout):**
- `PROJECT_PLAN.md` is **read at planning** and **written at retro**. Untouched during the phase.
- The **current phase's tasks live as GitHub Issues** (created by `/start-phase`, closed by PRs).
- Phase boundaries are work-defined, not time-boxed: a phase ends when its issues are closed.

### Agents (copy to `.claude/agents/` in your project)

| Agent | Model | When | Purpose |
|-------|-------|------|---------|
| @architect | Opus 5 | Before design decisions, new dependencies, scope creep | Keep architecture coherent against SPEC.md + DECISIONS.md |
| @code-review | Sonnet | After commits (wired into `/kill-this`) | Catch issues early |
| @pm | Sonnet | Start/end of sessions via skills | Track progress, flag risks, update PROJECT_PLAN.md |
| @ui-reviewer | Sonnet | After UI work, phase boundaries | Design quality review |
| @tape-reader | Sonnet | Via `/read-the-tape` skill | **Observer** (DEC-S039, DEC-S040). Audits session JSONL and writes one cited observation to seeds. Modifies nothing in the repo it runs in |
| @workout | Opus 5 | Via `/workout`, weekly or fortnightly — **seeds only** | The promotion half of the learning loop. Reads accumulated observations across repos, groups them into patterns, makes the severity call (DEC-S039), opens one PR against `main`. Not a project template — see below |
| @doc-consistency | Sonnet | Via `/doc-consistency-check` skill, or ad-hoc | Cross-reference factual claims across project docs; flag mismatches + unfilled placeholders. Report-only, no edits |
| @ideas | Sonnet | Park an idea, re-rank, or audit the parking lot | Curate `<project>/docs/FUTURE_IDEAS.md` — capture, dedupe, cross-ref, keep the prioritized index. Edits only that file |

### Files a target project needs

The skills and agents expect these files to exist in the project root:

- **orphan `sessions` branch + `.sessions-worktree/`** (DEC-S014) — per-session files live here, not on `main`. `/its-alive` Step 0.6 auto-creates the worktree (and the branch on first run). `.sessions-worktree/` should be `.gitignore`d from `main`.
- `docs/PROJECT_PLAN.md` — phases, tasks, estimates, velocity table
- `docs/RETROSPECTIVES.md` — phase-end retros (created by `/retro` if missing)
- `docs/SPEC.md` — scope (V1 vs later) and "Not V1" list
- `docs/decisions/DEC-*.md` — the architectural decision record, one file per decision, plus `_config.json` and `_preamble.md` (DEC-S036)
- `docs/DECISIONS.md` — **generated** topic index over `docs/decisions/`. Never hand-edited
- `.claude/doc-check.json` — repo slug + roster/exemption lists read by `check-docs.mjs` (DEC-S037)
- `docs/AGENTS.md` — adapted from `dev/claude/docs/AGENTS.md` in this repo
- `.claude/seeds-version` — single line containing the schema version this project was last installed at (e.g. `2`). Nothing reads it automatically (DEC-S040); compared against `seeds-version` by hand to see which migrations the project owes. See `docs/SCHEMA_VERSIONS.md`.
- `.claude/project-type` — single line naming the project's type: `webapp` (Next.js + Supabase shape) or `tool` (CLI / agent / library shape). Says which template files the project has no use for (DEC-S011) — e.g. a `tool` project skips `agents/ui-reviewer.md`. Read by a person deciding what to copy. Optional.

Plus a one-time global setup per machine:
- `~/.claude/devname` — single line with the dev's handle (e.g. `eric`). Used in session filenames.

### Velocity & Estimation

Effort uses Fibonacci points: 2, 3, 5, 8, 13. No 1s (just do it), no 13s if avoidable (break them down). Velocity = hours per effort point. `docs/VELOCITY_AND_POKER_GUIDE.md` covers the full methodology.

## Setting Up a New Dev Project

1. **Global one-time:** put a one-liner in `~/.claude/devname` (e.g. `eric`) — your dev handle.
2. **Project docs** — copy `dev/claude/docs/` contents to `docs/` in the project root. Fill in all `[Project Name]` and `[placeholder]` fields. `PROJECT_PLAN.md` has Phase 0 pre-filled — fill in Phase 1+ during planning.
3. **Sessions branch + worktree (DEC-S014)** — `/its-alive` Step 0.6 creates these automatically on first run (orphan `sessions` branch + `.sessions-worktree/` checkout). You can do it manually if preferred: `git checkout --orphan sessions && git rm -rf . && mkdir sessions && echo "# Sessions branch" > sessions/README.md && git add . && git commit -m "Initialize sessions branch" && git push -u origin sessions && git checkout main && echo ".sessions-worktree/" >> .gitignore && git add .gitignore && git commit -m "Ignore .sessions-worktree" && git push && git worktree add .sessions-worktree sessions`.
4. **CLAUDE.md + context (DEC-S019)** — copy `dev/claude/CLAUDE.md` (the shell) to the project root **verbatim — don't edit it**; it's universal workflow guidance that syncs from seeds. Then copy `dev/claude/CLAUDE-context.md` to `<project>/.claude/CLAUDE-context.md` and fill in stack, data model, roles, commands, and project-specific overrides there. The shell loads the context file at session start; all per-project content lives in context so the shell can sync cleanly.
5. **Agents** — copy `dev/claude/agents/` to `.claude/agents/` in the project root. Update `description:` frontmatter with the project name.
6. **Skills** — copy `dev/claude/skills/` directories to `.claude/skills/` in the project root (project-level install, not global).
7. **Shell alias** — source `dev/bash/aliases.sh` from `~/.bashrc` and add a project-specific alias.
8. **GitHub labels** (if using phase rituals) — `/start-phase` will create them on first use, but you can pre-create: `phase:0`–`phase:9`, `points:1`/`2`/`3`/`5`/`8`, `blocked`.
9. **Schema version** — `cp seeds-version <project>/.claude/seeds-version` so you can later tell how far behind the project has drifted. See `docs/SCHEMA_VERSIONS.md`.
10. **Project type (DEC-S011)** — write the project's type to `<project>/.claude/project-type` as a single line. Currently supported: `webapp` (Next.js / React / shadcn / Supabase / Vercel) or `tool` (CLI / agent / library; Node stdlib + shell). It tells you which template files to skip when copying — e.g. `agents/ui-reviewer.md` is `webapp`-only. See `.claude/type-manifest.yaml`. Optional.
11. **VersionTag (deployable projects)** — copy `dev/claude/templates/VersionTag.tsx` to `<project>/src/components/VersionTag.tsx`. Wire into login screen + footer per `dev/claude/CLAUDE.md §Versioning`. Skip for non-deployable projects.
12. **Production branch (optional, deployable projects)** — if the project deploys, add a downstream `production` branch: `git checkout -b production main && git push -u origin production`, then repoint the host's production branch (e.g. Vercel → Settings → Git → Production Branch) from `main` to `production` **before** `main` takes active work (otherwise WIP auto-deploys to prod). `main` stays the active trunk; `/promote-production` ff-merges `main` → `production` to ship. See DEC-S022.
13. **Supabase prod-write guard (Supabase projects)** — copy `dev/claude/scripts/safe-supabase.sh` to `<project>/scripts/safe-supabase.sh`, `chmod +x`, then `mkdir -p .claude && echo "<your-prod-ref>" > .claude/prod-supabase-refs && echo ".claude/prod-supabase-refs" >> .gitignore`. Optional alias: `alias supabase='./scripts/safe-supabase.sh'`. See DEC-S009 + `dev/claude/CLAUDE.md §Migration Protocol`.

**Permission rules are exact, prefix, or tool-only — there is no mid-string wildcard.** `Bash(git *)` matches; `Bash(*npx*)` does not do what it looks like. Two consequences worth carrying:

- **`Bash(* > /dev/*)` in the deny list is almost certainly inert** — it leads with a wildcard, which is not a documented form. It has been in every repo since DEC-S023 looking like protection. Left in place rather than deleted, because verifying it needs a live session, but do not count on it.
- **A deny rule cannot catch a chained command.** `npm run typecheck && npx prettier` does not *start* with `npx`, so no prefix pattern sees it — and that is exactly the shape that ran an unrequested Prettier over a repo and moved 231 lines. The `PreToolUse` hook at `dev/claude/hooks/no-remote-exec.sh` reads the whole command line, which is why it exists rather than more deny entries.

14. **Permission settings (DEC-S023)** — the master policy is `dev/claude/settings.json` (default-allow: `Bash(*)` + a deny guardrail; `deny` beats `allow`). NOT auto-synced. Distribute by hand per the full procedure in `README.md` § Permission settings: copy the master into each real machine's user-global `~/.claude/settings.json` (covers all repos on that box), and commit a per-repo `.claude/settings.json` for phone/web sessions (the only thing that reaches the ephemeral cloud container). Leave `.claude/settings.local.json` alone — per-box override. Change the policy by bringing it to a Claude session in seeds, not via `/permissions`.

15. **Decision record + doc gate (DEC-S036, DEC-S037)** — copy `dev/claude/docs/decisions/` to `<project>/docs/decisions/`, then write the project's real topic list into `_config.json` and delete the example decision file once there's a real one. Copy `dev/claude/scripts/{gen-decisions-index,check-decisions,check-decisions.test,check-context,check-docs}.mjs` to `<project>/scripts/`, and `dev/claude/doc-check.json` to `<project>/.claude/doc-check.json` (fill in the repo slug, the docs that claim to be complete rosters, and the historical ledgers). Add the scripts to `package.json` and put `check:decisions && check:context && check:docs` at the **front** of `verify` — they're text-only and fail in milliseconds, so they belong ahead of typecheck/test/build. Run `npm run gen:decisions` to write `docs/DECISIONS.md`. **A project migrating an existing monolithic `DECISIONS.md` uses `split-decisions.mjs` instead — see `docs/SCHEMA_VERSIONS.md` § v4 → v5.**

After setup, run `/its-alive` in the new project to start the first session.

## Seeds' Own Decision Record

Seeds eats its own dogfood: its decisions live one per file in `docs/decisions/` and `docs/DECISIONS.md` is generated (DEC-S036). Seeds has **no `package.json` on purpose** — adding one would switch on the semver bump skills, which detect it at the repo root — so run the gate directly:

```
node dev/claude/scripts/gen-decisions-index.mjs   # after editing any decision
node dev/claude/scripts/check-decisions.mjs       # gate: index freshness, ids, edges, references
node dev/claude/scripts/check-docs.mjs            # gate: DEC refs, rosters, issue links, paths
```

Run them from the repo root — they resolve `docs/` relative to the working directory, so seeds validates the exact template files it ships rather than a copy that could drift. `check-context.mjs` is **not** run here: it asserts `.claude/CLAUDE-context.md` exists, and seeds doesn't use the DEC-S019 shell/context split — its `CLAUDE.md` describes this repo, not a project.

Seeds' ids are `DEC-S###` with no numeric main line, so `docs/decisions/_config.json` sets `"numericIds": false`. That matters: seeds cites plain `DEC-001`-style ids on purpose (DEC-S025 — a project's own decisions stay unprefixed), and without the flag the reference check would report another repo's record as seeds' dangling references.

## Moving Files Between Seeds and a Project — All Manual (DEC-S040)

**There is no sync.** The pull-seeds and push-seeds skills and the sync-config agent are deleted — named without backticks throughout this section, because backticks would read as a claim that they still resolve. A template change reaches a project when someone copies it, one file at a time, with `cp`. A project's improvement reaches seeds the same way, in the other direction.

**Why:** every attempt to automate the crossing ended by narrowing what it was allowed to touch. `context` class carved out (DEC-S018), whole files carved out by project type (DEC-S011), the three substantive reviewers carved out entirely (DEC-S035), `CLAUDE.md` split in half so one half could be left alone (DEC-S019). Each of those was right. Together they were a machine whittled down to the files where copying was already trivial — and then the version gate blocked the first copy that actually mattered. **The projects differ more than they agree, and choosing which file should cross is the part that needs a person.**

**Before copying anything, run the differ:**

```
node dev/claude/scripts/drift.mjs /path/to/project
```

Read-only. It prints which `logic`-class files differ, which are absent, and whether the project owes a schema migration — so you are choosing what should cross rather than guessing at the state. It refuses to run against seeds itself, deliberately: this repo's root `CLAUDE.md` and `dev/claude/CLAUDE.md` are **different documents that share a filename**, and comparing them would report the whole shell as drift.

`/its-alive` runs it at session start in a project, which is why there is no fleet list — a dormant repo's drift only matters the day you open it, and that is when the briefing tells you.

**It enumerates and stops there.** It has no opinion about which side is right, and must never grow one: the moment it does, it has re-acquired the judgment DEC-S040 removed, and every argument for deleting the classifier applies to it instead.

**What tells you what to copy:**

| Question | Where the answer is |
|---|---|
| Is this file identical everywhere, or project-owned? | `.claude/routine-config.yaml` § `file-classes` — `logic` copies wholesale, `context` never copies, `hybrid` copies the shell only |
| Does this project type even use the file? | `.claude/type-manifest.yaml` |
| How far behind is this project, and what does it owe? | `<project>/.claude/seeds-version` vs `seeds-version`, then `docs/SCHEMA_VERSIONS.md` |
| What actually differs right now? | `diff`. Nothing enumerates it for you any more — that was the real loss, and it is deliberate |

Both YAML files kept their contents and lost their readers. They are documentation for a human running `cp`, not config for anything.

**What this costs, stated once so it isn't rediscovered:** nothing applies a change for you, and nothing notices when a project drifts. A rule `@workout` promotes sits in seeds until someone copies it out. That is the third mechanism retired in favour of a ritual — after the Routine (DEC-S038) and the downstream skill. If the bet is wrong, the fleet stops being one workflow and becomes N workflows that were once the same. It was taken anyway because all three mechanisms were already not running.

## The Learning Loop (DEC-S039)

Three steps, exactly one of them automated. Spec: `docs/SPECS/2026-08-workflow-learning-loop.md`.

**Observation and rule are different acts with different homes.** An observation is cheap, high-volume, project-local, and factual: *this session read the whole plan file three times*. A rule change is expensive, rare, cross-project, and a judgment: *therefore `/its-alive` should grep*. One agent doing both in one sitting is why neither was done well.

| Surface | Runs where | Produces | May edit |
|---|---|---|---|
| `/read-the-tape` → `@tape-reader` | in a project | one cited observation | **nothing, anywhere in that repo** |
| `observations` branch | seeds | the accumulating record | nothing — it is data |
| `/workout` → `@workout` | **seeds only** | one PR against `main` | `dev/claude/**` |
| copying the merged change outward | from seeds | a changed project | whatever you choose, by hand |

**`@tape-reader` edits nothing (DEC-S040).** No file-class lookup, no `y/n` approval loop, no branch, no PR. An earlier version fixed "what the project owns" and observed the rest, but that line came from the sync classifier: an argument about which files a sync would overwrite, applied to an agent whose job is reading a transcript. With no sync, an auditor that also edits files is just an auditor with a side effect. The cost is real — a repeated permission prompt has a one-line fix in `.claude/settings.json` and now becomes an observation someone applies later, or doesn't. Taken so the output needs no diff review.

**How much of that is enforced:** the `Edit` tool is withheld, which removes the habitual path, but the agent keeps `Write` and `Bash` and either could write here. `/read-the-tape` Step 3 checks `git status` after the run and treats any change as an agent defect — detection, not prevention. Worth knowing precisely, because "it structurally cannot" is a stronger claim than the tooling supports and would be the wrong thing to rely on.

**The `observations` branch** is orphan, same shape and same reasons as a project's `sessions` branch (DEC-S014). Reached via `.observations-worktree/`, which `main` gitignores. One file per run, named `YYYY-MM-DD-<repo>-<slug>.md`, pushed directly — no PR, because evidence is not policy and nothing reads it at session time. A run that found nothing still writes a file: a clean run is the evidence that retires a rule.

**Inbox and ledger.** Directory position is the state — a file in `observations/` is unread, and after a cycle it moves to `archive/YYYY-MM/` **regardless of verdict, held included**. `LEDGER.md` carries one row per *pattern* with the accumulated judgment. A cycle reads the inbox plus the ledger, **never the archive**, so cost scales with what happened since the last run rather than with how long the loop has been running. The ledger is the one hand-maintained artifact here and therefore the one that can rot — watch for a row whose count stops moving while observations for it keep arriving.

**Promotion is a severity call, not a count.** No threshold exists and none should be invented. The question is what the next occurrence costs and whether it would announce itself — irreversible or silent earns a rule on one sighting; recoverable and self-announcing waits for repetition. Frequency is evidence *about* severity, never severity. Full table in DEC-S039.

**`@workout` is seeds-only and deliberately not a template.** It edits `dev/claude/**` and reads a branch that exists only here, so a project could never run it; shipping it in `dev/claude/agents/` would install dead machinery in every project and put it in every project's skill list. It lives at `.claude/agents/workout.md` + `.claude/skills/workout/`, alongside the other seeds-only files (`routine-config.yaml`, `type-manifest.yaml`).

**Cadence: weekly or fortnightly, by hand.** Not scheduled — this is not the Routine returning under a new name (DEC-S038). The honest failure mode is that the workout doesn't happen; observations then pile up harmlessly and nothing regresses, which still beats a candidate pattern evaporating with the session that found it.

**Getting a merged promotion into a project is the third step, and it is manual** (DEC-S040). Nothing carries it outward. `@workout` closes its PR body with a distribution list — which projects, which files — so the destinations are named while the reasoning is fresh; acting on that list is a separate deliberate act.

## The Routine — OFF, and now unrevivable (DEC-S038, DEC-S040)

The nightly sync Routine was switched off by DEC-S038 and kept **dormant, not deleted**, so that
re-enabling it would be switching it on rather than rebuilding it. DEC-S040 ends that: the Routine's
entire job was invoking `@sync-config` per (repo × direction), and `@sync-config` no longer exists.
A prompt that calls a deleted agent is not dormant machinery, it is a dead file, so the
dev/claude/routines directory is gone too.

Reviving scheduled sync would mean designing it again from the decision record — DEC-S004, DEC-S010,
DEC-S028, DEC-S038, and this one — which is the correct cost for reversing three deliberate
retirements.

What survived the Routine, and then survived the sync: `.claude/routine-config.yaml`'s file-class
registry and `.claude/type-manifest.yaml`. Both kept their contents and lost their readers. See
§ Moving Files Between Seeds and a Project.

## How Work Happens Here

Seeds is markdown. There is no build, no test suite, and deliberately no `package.json` — adding one would switch on the semver skills, which detect it at the repo root. The workflow is the same shape as the one this repo ships to projects, with the mechanism slots (DEC-S042) filled for a docs repo:

1. **Spec it** — what changes and why. For a template edit, name the failure it fixes; a rule with no observed failure behind it is cargo.
2. **Plan it** — say what you'll touch. Wait for approval before editing.
3. **Cut the branch** — `git checkout -b task/<slug>`.
4. **Prove it first** — *`Proof` slot:* the doc gates. A change to a decision, an id, a roster, or a cited path has a mechanical check; run it and watch it fail before the fix if you can. **Prose has no mechanical proof — say so plainly rather than implying the gates covered it.**
5. **Make the change** — template under `dev/claude/`, then mirror to `.claude/` if the file is one seeds dogfoods.
6. **Run the proof** — *`Proof command` slot:*

   ```
   node dev/claude/scripts/gen-decisions-index.mjs   # after editing any decision
   node dev/claude/scripts/check-decisions.mjs
   node dev/claude/scripts/check-docs.mjs
   ```

   From the repo root, so seeds validates the files it ships rather than a copy. `check-context.mjs` is **not** run here — it asserts `.claude/CLAUDE-context.md` exists, and seeds doesn't use the DEC-S019 split.
7. **Check the surface** — *`Surface check` slot:* read the edited section as the project that will receive it. A shell change lands in muster and soundings verbatim; a sentence that only makes sense in a webapp is a defect no gate catches.
8. **STOP. The change is written, not shipped.** Report and wait. Don't commit, don't push, don't open a PR, don't start the next thing. This is where I look at it.
9. **`/kill-this` — I invoke it, you don't.** Hand-typing `git push` + `gh pr create` reaches the same end state without `@code-review` ever reading the diff, and its absence announces itself to nobody.
10. **Next task or `/its-dead`.**

**Mirrors:** several files exist twice — `dev/claude/<x>` is the template, `.claude/<x>` is seeds' live copy. Edit the template, copy to the mirror, and `diff` them before committing. A drifted mirror means seeds is running different rules than it ships.

## Workflow Notes

- **Diagnostic commands** (the gates, `git status`, `diff`): run them directly.
- **Environment-changing commands** (`git push`, deletes, anything outside this repo): surface them rather than assuming.
- **Read files with the Read tool — never `sed`, `grep`, `awk` or `cat` to pull a section out.** Read is allowlisted and never prompts; a shell one-liner extracting a section can miss an allow-pattern match and stop a skill dead mid-run. `grep` to *search* across many files is fine.
- **Never write a bare `#N`. Say which kind: `issue #149`, `PR #167`.** GitHub draws issues and PRs from one shared counter, so they interleave permanently and the number can't tell you which it is. `closes #N` stays bare — it's GitHub syntax.
- **A scripted edit must fail loudly when its anchor doesn't match.** A `read_text()` / `.replace()` / `write_text()` script writes the file back unchanged and exits 0. Assert the match count, or the file it silently skipped looks reviewed.
- **Before asserting what a template says or does, read it in the same turn.** This repo's whole subject is documents about documents, and a confident claim about a file's contents is one `grep` from being checked.

## Approval Before Action

State what you'll change and why, list the commands you'll run, and wait for "go". This holds for edits as much as for pushes — a template change lands in every project that copies it.

**Trust my statements the first time.** "It's fixed" is a fact, not an invitation to re-verify.

## Scope Discipline

Check `docs/SPEC.md` before adding anything. Apply a change to the surface I named and don't propagate it to siblings.

**A workflow rule needs an observed failure behind it.** This repo's failure mode is accretion — rules that sound right, were never triggered by anything, and are skimmed past forever after. If you can't cite the session, transcript, or PR that produced it, it's a proposal, and it should say so.

**Prefer removing.** A retired rule with a decision explaining why it went is worth more than a new one.

## Model Selection

**Opus 5 is the standing model**; **Sonnet** handles cheap, scoped work. `@workout` runs Opus because promotion is the one judgment in the loop that's expensive to get wrong. Reviewers stay Sonnet. New agents default to Sonnet — pin `model: opus` only when the standing job needs it.

`effort` buys more than a model jump: start at `xhigh` for hard work and `high` elsewhere, then try lower.

## Tone

Occasional dry humor and sarcasm welcome. One good line beats three forced ones.

## Communication

**Pick the kind of reply before writing it, and say which.** Open every reply with the bare word — `Lookup.`, `Action.`, `Judgment.`, `Session summary.` — then the reply. Stating the choice makes it a commitment rather than a private intention.

> **On trial (added 2026-08-09), to be judged rather than accreted.** Count the replies where the tag and the shape disagree — `Lookup.` above four paragraphs, `Action.` above a recap. Near zero, keep it; routine, it is theatre and it goes with this note. See `dev/claude/CLAUDE.md` § Communication for the session that prompted it.

- **Lookup** — *where is that file, did the gate pass, what's the current value.* The answer is a fact. Give it in a line or two and stop. **Hard cap: do not add the extra sentence even when it is true and relevant** — that sentence is always true and relevant, which is why nothing ever cuts it. If the fact took work, cite where you got it on the same line.
- **Action** — *you did the thing; report what happened.* Result first, then only what **changes what I do next**: a blocker, a surprise, something I'm about to trip over, a thing you did differently than asked. Nothing else — no recap of work I just watched, no restatement of the task, no summary of your reasoning. Specifically: **one artifact**, and **don't bolt on the adjacent concern** you noticed while answering — raise it after, in one line, or not at all.
- **Judgment** — *why did this fail, which approach, what's the tradeoff.* The reasoning **is** the answer; a one-liner is useless. Explain at whatever length it takes. Do not compress a real explanation to look terse — that costs three follow-ups to reassemble. The complaint is never that you explained something; it is explaining the answer to a question I could have grepped.
- **Session summary** — end of turn: one or two sentences, what changed and what's next. First thing I read next session. If a turn ends with a bullet list plus three paragraphs, the prose is wrong.

Unsure which? If one tool call and no thinking would have answered it, it's Lookup.

**One message can hold more than one kind. Answer each in its own, and tag each** — a Lookup does not stop being a Lookup because a harder question arrived in the same message. Don't let the longer answer set the register for both.

**In all four, the first line is the answer** — not the route you took to it.

**When I push back, say less — never explain.** "Trim", "again", "too many words", "this is confusing": re-answer shorter, immediately. Explaining why the confusing thing was confusing is the same failure recursing, and it reads as arguing.

**Never lead with a false premise.** If you don't know the cause, ask. What's banned is stating a made-up cause as fact and explaining at length on top of it.

**Cite facts; label proposals.** Any claim about a file, a rule, or a decision cites a file:line or a tool result. If you can't cite it, ask instead of asserting. This never restricts *ideas* — propose freely, just mark them "proposed / not in the repo".

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
