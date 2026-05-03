# Seeds Schema Versions

This file defines the schema-versioning policy for the seeds workflow templates and tracks the history of breaking changes.

## What "schema version" means

A single integer that names a coherent generation of the seeds workflow. It covers, as one bundle:

- **`PROJECT_PLAN.md` format** — sections, task table columns, velocity table shape
- **Session-file format** — file location (`session-log.md` vs `sessions/*.md`), naming convention, frontmatter shape
- **Skill set + skill API** — which `/skills` exist, their args, the conventions they assume (e.g. `~/.claude/devname`, phase labels, dual-mode detection)

It is **not** SemVer. There is no patch level. Each bump is a discrete generation that's either compatible with a project's installed version or not.

## Where the version lives

- **`seeds-version`** at the seeds repo root — single line, holds the latest published version. The source of truth.
- **`<project>/.claude/seeds-version`** — single line, holds the version a project was last installed at. Created by setup; updated by `/pull-seeds` after a successful migration.

Seeds itself does not have a `.claude/seeds-version` — it is the workflow source, not a consumer. Its only version file is the root `seeds-version`.

The version file is a single line containing the integer (no `v` prefix, no newline beyond the trailing one). Grep-friendly, parse-free.

## When to bump

Bump the version when **any** of the following changes in a way that breaks projects on the previous version:

- A skill's API or expectations change (e.g. arg shape, file paths it reads, files it writes)
- A skill is removed or renamed
- The session-file format changes location, naming, or frontmatter
- `PROJECT_PLAN.md` adds or changes a required section/column
- A new project-root convention is added that existing skills now require

Bump is **not** required for:

- Documentation-only changes (typos, clarifications, prose rewrites that don't change behavior)
- New skills that don't change any existing skill's contract
- Internal refactors of skill bodies that produce the same outputs
- Bug fixes that align skills with their already-documented behavior

When in doubt, bump.

## Version history

| Version | Surfaces affected | Summary |
|---------|-------------------|---------|
| **1** | session-file, skill set | Original workflow. Monolithic `session-log.md`. No `~/.claude/devname`. No phase rituals (no `/start-phase`, no `/retro`). No dual-mode detection. |
| **2** | session-file, skill set, skill API | Per-session files at `sessions/YYYY-MM-DD-HHMM-<dev>-<slug>.md` with YAML frontmatter. `~/.claude/devname` resolves dev identity. Phase rituals via GitHub Issues (`/start-phase` materializes a phase, `/retro` closes it). New skills: `/start-phase`, `/retro`, `/pause-this`, `/restart-this`, `/read-the-tape`, `/push-seeds`. Skills detect legacy projects (`session-log.md` present, `sessions/` absent) and run in legacy mode for backward compat. |

## Migration notes

### v1 → v2

A v1 project still has `session-log.md` and no `sessions/` directory. To migrate to v2:

1. **`mkdir sessions`** at project root.
2. **Archive `session-log.md`** in place (do not delete) — historical sessions stay readable. New sessions land in `sessions/`.
3. **Set `~/.claude/devname`** if not already set.
4. **Materialize the current phase as Issues** via `/start-phase` (creates one Issue per active task with `phase:N` and `points:X` labels).
5. **Update `<project>/.claude/seeds-version`** to `2`.

The dual-mode detection in v2 skills (`grep -l "^status: open" sessions/*.md` first, fall back to `session-log.md`) means v1 projects keep working without migration — but `/start-phase` and `/retro` will behave unexpectedly until the project is fully migrated. Rule: do not partially migrate.

The actual migration script and per-project execution are out of scope for the schema-version definition. They land per-project as Task 18 (sailbook) and any future v1 holdouts.

## How `/pull-seeds` (downstream sync) uses this

When `/pull-seeds` runs in a project, it compares versions:

- **`seeds-version == project.seeds-version`** → proceed with sync. Classify diffs, propose backports / forward-ports.
- **`seeds-version > project.seeds-version`** → STOP. Surface the gap: "seeds is on v$SEEDS, project is on v$PROJECT. Run the v$PROJECT → v$SEEDS migration first (see `docs/SCHEMA_VERSIONS.md` § Migration notes)." Never auto-migrate — migrations touch session files and `PROJECT_PLAN.md`, blast radius is too high for silent runs.
- **`seeds-version < project.seeds-version`** → unusual; usually means the project has un-pushed seeds-bound improvements that haven't been backported yet. Surface: "project is ahead of seeds — did you mean `/push-seeds`?"

`/pull-seeds` itself is Task 7. This contract describes what it must enforce when built.
