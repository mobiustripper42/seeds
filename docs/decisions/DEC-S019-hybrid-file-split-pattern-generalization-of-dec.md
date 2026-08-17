---
id: DEC-S019
title: "Hybrid-file split pattern (generalization of DEC-S016)"
topic: "Sync — directions, classification & file classes"
---

## DEC-S019: Hybrid-file split pattern (generalization of DEC-S016)

**See also** — decisions this one changed part of:
- Extends DEC-S016 — the pattern generalized from one agent to any shell/context pair

**See also** — later decisions that changed part of this one:
- Refined by DEC-S042 — how the shell/context boundary is drawn inside Micro Workflow — the split itself, and every other section's use of it, stands

**Date:** 2026-05-19
**Status:** Accepted
**Generalizes:** DEC-S016
**Depends on:** DEC-S018
**Related:** DEC-S010, DEC-S011

### Decision

Every hybrid file gets split into two artifacts:

1. A **seeds-managed shell** at the original path. Generic, cross-project, syncs through the Routine.
2. A project-owned **context file** at `.claude/<basename>-context.{md,json}`. Project-specific. Never appears in seeds. Never syncs.

The shell file opens with a load instruction pointing at its context file. The context file is implicitly `class: context` per DEC-S018's registry — no explicit registry entry needed.

This is DEC-S016's pattern, lifted out of the ui-reviewer-specific case and applied to every hybrid file.

### Pattern shape

What makes the split work:

1. **Load instruction at the top of the shell.** Pattern: "Read `.claude/<name>-context.md`. If the file does not exist, stop and tell the user to create it." DEC-S016's exact phrasing.
2. **Predictable context path.** `.claude/<shell-basename>-context.{md,json}`. For `CLAUDE.md` (root) the context is `.claude/CLAUDE-context.md`. For `agents/architect.md` it's `.claude/architect-context.md`.
3. **Registry marks the shell `hybrid`.** Context file path doesn't need a registry entry — anything under `.claude/` not listed is treated as project-owned.
4. **One-time migration cost.** Per project, per hybrid file: extract project-specific content into the context file, replace shell with seeds version. After that, the two diverge cleanly forever.

### Targets

In priority order:

- **P0: `CLAUDE.md`** (project root, sourced from `dev/claude/CLAUDE.md` in seeds). This is the biggest noise generator. Phase 2 of the SPEC.
- **P1: `agents/architect.md`** — contains stack-specific examples ("Next.js, Supabase, shadcn/ui, Tailwind") that don't apply to tool projects. Phase 3.
- **P2: `agents/code-review.md`** — same shape, stack-specific review checks. Phase 4.

### CLAUDE.md split

Section-by-section verdict against the current `dev/claude/CLAUDE.md` template. Validated against the user's worked example — diverges where the worked example was too aggressive.

| Section | Verdict | Notes |
|---------|---------|-------|
| `# [Project Name]` heading + intro | context | Project name and one-liner description. |
| `## What We're Building` | context | Pure project description. |
| `## Stack` | context | Stack varies per project (webapp vs tool, Next.js version, etc.). |
| `## Key Docs` | **split** | Universal rows (`docs/SPEC.md`, `docs/DECISIONS.md`, `docs/BRAND.md`, `CHANGELOG.md`) stay in shell as a baseline table. Project-specific docs go in context under a `## Additional Docs` subsection. |
| `## Core Data Model` | context | Project schemas. |
| `## Micro Workflow (DEC-S013 + DEC-S014)` | shell | The 12 steps are universal. If a project has step-specific overrides (e.g., "skip Supabase test db" for tool projects), they live in context under `## Workflow Overrides`. |
| `## Migration Protocol` | **shell, with Supabase-specific subsections moved to context** | The discipline (every schema change = migration, never edit applied migrations) is universal. Supabase CLI specifics and `### Production write protection (DEC-S009)` move to context. Tool projects without a database drop the whole section from their context. |
| `## Commands` | context | Every project has different npm scripts. |
| `## Conventions` | **split** | TypeScript strict, Server Components default, error handling philosophy, RLS-default, naming conventions — shell. Component dirs, specific lint configs, project-specific testing layouts — context under `## Conventions (project)`. |
| `## Session Skills` table | shell | Universal slash command list. |
| `## Agent Workflow` table | shell | Universal agent list. |
| `## Model Selection` | shell | Opus vs Sonnet guidance is cross-project. |
| `## PR Workflow (DEC-S013 + DEC-S014)` | shell | Branch/PR rules are universal. |
| `### Production branch (DEC-S022)` | shell | Universal: `main` is the active trunk; an optional `production` deploy branch is advanced by `/promote-production`. Shell handles both the has-production and deploys-off-main cases. |
| `## Versioning (DEC-S007)` | **split** | Versioning policy and `### CHANGELOG.md` discipline — shell. `### <VersionTag />` component wiring and `### PR Review on Mobile` workflow — shell (universal). Project-specific version source paths — context. |
| `## Workflow Notes` | **split** | "Never rebase a task branch", diagnostic vs env-changing distinction — shell. Project-specific debugging notes (bushel's stale `next start` on port 3001, no `source .envrc` for `npx playwright test`) — context under `## Workflow Notes (project)`. |
| `## Approval Before Action` | shell |
| `## Bug Reports & Questions` | shell |
| `## Scope Discipline` | shell |
| `## Tone` | shell |
| `## Verbosity` | shell |
| `## Cost and Waste` | shell |

**Resolved ambiguities** (the sections that don't cleanly belong on one side):

- `## Key Docs`: shell has baseline table; context appends. Not a clean split, but the alternative (context-only) means every project re-types the universal rows.
- `## Migration Protocol`: shell holds the discipline, context holds the toolchain. Tool projects with no DB get a one-line context note saying "N/A".
- `## Conventions`: shell holds principles, context holds locations. Same rationale.
- `## Workflow Notes`: shell holds rules, context holds debugging gotchas. Bushel's three-line port-3001 note is the canonical example of context content.

After the split, bushel's current `CLAUDE.md` (which today duplicates Tone / Verbosity / Cost and Waste verbatim from the template) loses ~60% of its bytes. Those sections live in shell, get read at session start, and stop drifting.

### architect.md split

Shell stays as today minus stack-specific examples. The "default to simpler option," "high bar for new patterns," "reference DEC IDs" rules are all universal.

Context (`.claude/architect-context.md`) holds:
- Project stack one-liner (so the architect can give stack-appropriate advice)
- Project-specific patterns to prefer (e.g., bushel's "design folder is authoritative")
- Project-specific anti-patterns

### code-review.md split

Shell stays as today minus stack-specific review checks (Supabase RLS checks, shadcn/ui usage patterns).

Context (`.claude/code-review-context.md`) holds:
- Stack-specific review checks
- Project-specific lint rules to verify
- Project-specific RLS or auth conventions

### What changes in sync-config.md

When Step 2 hits a hybrid file:
- Diff only the seeds shell vs the project's shell file (same path)
- The project's `.claude/<name>-context.{md,json}` is implicitly context-class (DEC-S018) and never enters scope
- No special hunk-level filtering needed — the shell file in the project repo only contains shell content by definition

### Migration ordering

Per the SPEC: Phase 2 = CLAUDE.md, Phase 3 = architect.md, Phase 4 = code-review.md. Each phase is one session. Each phase = update seeds shell + extract context per project. Scope per phase varies by file applicability (webapp-only vs all-projects).

### Trade-offs

- Two files to read at session start instead of one. Mitigated by the load instruction at the top of every shell — if Claude reads the shell first, it knows to read the context next.
- One source of duplication risk: a project could fail to re-read shell after a sync. Mitigated by the Routine itself — if shell drifts, sync proposes a PR.
- Migration is manual and per-project. Acceptable: it's a one-time cost. LLM-assisted extraction is fine; full automation is not in scope.
- Context files have no version control across projects. By design — they're project-owned.

---
