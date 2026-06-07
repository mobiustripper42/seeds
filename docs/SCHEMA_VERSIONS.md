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
| **4** | skill set, skill API, branch convention | Production-branch model replaces staging-flow (DEC-S022, retires DEC-S008). `main` is the always-active trunk in every project; an optional `production` branch is a downstream deploy pointer advanced by the new `/promote-production` skill (`main` → `production` ff-merge, deploy-only — no tagging). `/promote-staging` is removed. `origin/staging` detection removed from `/kill-this` (PR base), `/retro` + `/bump-major` (working branch), `/its-alive` (orphan-scan base), and the nightly routine (downstream PR base) — all now use the default branch. Tags land on `main` at bump time, uniformly. `@sync-config` gains anti-churn rules: drop formatting-only hunks, apply verbatim, post-apply no-op guard, report-from-staged-diff. Detection signal: `origin/production` (only `/promote-production` reads it). No new project-root files. |
| **3** | skill set, skill API, project-root convention | Project semver workflow (DEC-S007) + staging-flow conventions (DEC-S008). New skills: `/bump-major`, `/promote-staging`. `/its-dead` patch-bumps on STATE=MERGED for dev projects. `/retro` minor-bumps at phase close on dev projects. `/kill-this` PRs into `staging` if `git show-ref --verify --quiet refs/remotes/origin/staging` succeeds, else `main`. `/its-dead` resolves the working branch from the same staging detection. New `dev/claude/templates/VersionTag.tsx` build-time component template. New `CHANGELOG.md` at the project root, auto-maintained by the bump skills. Detection signals: `package.json` (dev project) and local-cache `refs/remotes/origin/staging` (staging flow) — no new project-root files required, but skills now write `package.json` and `CHANGELOG.md` for dev projects. |

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

### v2 → v3

A v2 project has no version skills installed and (if deployable) no version surface. Migration depends on whether the project is a dev project (`package.json` exists) and whether it uses staging-flow.

**All v2 projects:**
1. Copy the new skill directories: `dev/claude/skills/bump-major/` and `dev/claude/skills/promote-staging/` into `<project>/.claude/skills/`.
2. Update existing skills with v3 changes — easiest via `/pull-seeds` once it's been wired to honor v3:
   - `/its-dead` — staging-aware working-branch resolution + Step 5.3 patch bump
   - `/retro` — Step 6.5 minor bump
   - `/kill-this` — staging-aware PR base
3. Update `<project>/.claude/seeds-version` to `3`.

**Dev projects only (`package.json` exists):**
4. Copy `dev/claude/templates/VersionTag.tsx` to `<project>/src/components/VersionTag.tsx`. Wire into login screen + footer per `dev/claude/CLAUDE.md §Versioning`.
5. Decide starting version. Three reasonable choices:
   - First release: leave `package.json` at `0.1.0` (npm's default), let `/its-dead` patch-bump from there.
   - Has been deploying without semver: read the most recent git tag if any (`git describe --tags --abbrev=0`); if none, set `package.json` to `1.0.0` and tag `v1.0.0` on main manually as the baseline.
   - Has historical CalVer or other scheme: pick a SemVer floor that won't go backwards, set both `package.json` and a tag.
6. Seed `CHANGELOG.md`. The first bump skill will create it if absent, but for projects with history worth preserving, create it manually with notable past releases before running the first bump.

**Staging adoption (optional, dev projects only):**
7. If shipping through a staging environment: `git checkout -b staging main && git push -u origin staging`. All skills auto-detect via `git ls-remote --heads origin staging`. No skill changes required to opt in or out — staging existence is the only signal.

**No data migration required.** v3 changes are additive — existing session files, PROJECT_PLAN.md, RETROSPECTIVES.md formats are unchanged. v2-only projects (e.g. seeds itself, domain projects) skip steps 4–7 and only inherit the new skill bodies.

### v3 → v4

v4 replaces the DEC-S008 staging-flow with the DEC-S022 production-branch model. The change is a skill rename + branch-convention shift; **no data migration** (session files, PROJECT_PLAN.md, RETROSPECTIVES.md formats are unchanged).

**All v3 projects:**
1. Replace the skill directory: remove `<project>/.claude/skills/promote-staging/`, add `<project>/.claude/skills/promote-production/` (copy from `dev/claude/skills/promote-production/`). Easiest via `/pull-seeds` once it honors v4.
2. Update existing skills with v4 changes (the `origin/staging` detection is gone — all resolve the default branch / always tag on `main`): `/kill-this`, `/retro`, `/bump-major`, `/its-alive`. Also pick up the `@sync-config` anti-churn rules.
3. Update `<project>/.claude/seeds-version` to `4`.

**Single-branch projects (no `staging` — the common case):**
Behaviorally unchanged — they already shipped off `main`. Steps 1–3 are the whole migration; nothing about how they work changes. (This is the 7 of 8 family repos.)

**Projects on the old staging-flow (had `origin/staging`):** do this carefully, in order — `main` is about to become the active trunk and the host's production branch must be repointed first or WIP auto-deploys to prod:
1. Bring `main` current with `staging`: open/merge a PR of `staging` → `main` (or ff-merge if `main` is an ancestor) so `main` holds the latest workflow generation. Verify `main` and `staging` now match.
2. Cut the deploy branch: `git checkout -b production main && git push -u origin production`.
3. **Repoint the host's production branch** (Vercel dashboard → Settings → Git → Production Branch) from `main` to `production`. Confirm before continuing — this is the footgun.
4. Delete `staging`: `git push origin --delete staging` (and `git branch -d staging` locally).
5. From here, work on `main`; ship with `/promote-production`.

**Why bump (not additive like v3):** a skill was renamed and a branch convention changed, so a v3 project pulling v4 templates without migrating would end up with both `/promote-staging` (orphaned) and `/promote-production`, and staging-flow projects would have skills that no longer detect their staging branch. The version gate forces the per-project migration above.

### Caution: never rewrite a project's own `DEC-NNN`

Seeds-workflow decisions carry the `DEC-S` prefix (DEC-S025); a project's own decisions in its `docs/DECISIONS.md` stay plain `DEC-NNN`. When a sync or migration touches DEC references — in either direction — convert **only** seeds-workflow refs (`DEC-013` → `DEC-S013`). Never blind-`s/DEC-NNN/DEC-SNNN/` a project file: a bare `DEC-008` may be the project's own decision (e.g. bushel `DEC-008` = "Fulfillment", not seeds' staging DEC), and prefixing it would mangle the project's record and break its cross-references. Judge ambiguous refs per line by what the surrounding text is about. This is not a versioned migration — the `DEC-S` sweep is a standalone per-repo pass, no `seeds-version` bump.

### Per-repo DEC-S sweep runbook (one-time, DEC-S025 rollout)

Every fleet project needs this once. It cannot ride the nightly Routine: `@sync-config` applies template hunks verbatim and only touches the seeds-mirrored files (`.claude/skills/**`, `.claude/agents/*.md`), and it can't make the per-line "seeds vs. project-own" call the project-specific files require. So it's manual, per repo. The helper `dev/claude/scripts/dec_s_sweep.py` does the safe conversions and surfaces the rest.

1. **Branch.** In the project: `git checkout -b chore/dec-s-sweep`.
2. **Find the ceiling.** The project's own DECs live in its `docs/DECISIONS.md` (`## DEC-NNN` headers). The highest is the "own ceiling" — refs *above* it are unambiguously seeds. The helper reads this automatically.
3. **Dry run.** `python3 <seeds>/dev/claude/scripts/dec_s_sweep.py` from the project root. It prints (a) `WOULD CONVERT` — the safe seeds refs (mirrored files in full; project files above the ceiling), and (b) `NEEDS REVIEW` — every ref at/below the ceiling.
4. **Judge the review list.** It always includes the project's own DECs (expected — leave those plain). Hunt it for *seeds* refs hiding at/below the ceiling — a bare `DEC-005` (branch model), `DEC-007` (semver), `DEC-008` (staging), `DEC-010` (Routine), etc. that the project's `CLAUDE.md`/docs cite. Hand-convert only those.
5. **Keep plain (DEC-S025 exception list):** the project's own DECs; bushel's `DEC-016`/`DEC-008`/etc. when this project's file cites *another* project; illustrative `e.g.` examples ("this contradicts DEC-007"); `docs/DECISIONS.md` definitions and the `architect.md` example (the helper never touches these).
6. **Apply + verify.** `python3 …/dec_s_sweep.py --apply`, then re-run with no flag — the `NEEDS REVIEW` list should now contain only refs you've confirmed are project-own or illustrative. Spot-check combined shorthand (`DEC-S013/S014`) and `.gitignore`.
7. **Ship.** Commit (`DEC-S namespace sweep (seeds#101)`), push, open a PR to the project's default branch. No `seeds-version` bump.

Worked example: **tinkle** (own ceiling `DEC-010`) — every `DEC-011/013/014/015` was seeds; `DEC-001…010` everywhere (hardware/firmware) stayed plain.

## How `/pull-seeds` (downstream sync) uses this

When `/pull-seeds` runs in a project, it compares versions:

- **`seeds-version == project.seeds-version`** → proceed with sync. Classify diffs, propose backports / forward-ports.
- **`seeds-version > project.seeds-version`** → STOP. Surface the gap: "seeds is on v$SEEDS, project is on v$PROJECT. Run the v$PROJECT → v$SEEDS migration first (see `docs/SCHEMA_VERSIONS.md` § Migration notes)." Never auto-migrate — migrations touch session files and `PROJECT_PLAN.md`, blast radius is too high for silent runs.
- **`seeds-version < project.seeds-version`** → unusual; usually means the project has un-pushed seeds-bound improvements that haven't been backported yet. Surface: "project is ahead of seeds — did you mean `/push-seeds`?"

`/pull-seeds` itself is Task 7. This contract describes what it must enforce when built.
