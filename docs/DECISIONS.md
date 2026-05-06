# seeds — Architectural Decisions

Decisions are numbered DEC-NNN. "DEC-TBD" means the decision is flagged but unresolved — consult @architect before building.

---

## DEC-001: Two template families (`dev/` and `domain/`)
**Decision:** Templates are organized by project kind, not by component type. `dev/` holds everything for software projects; `domain/<name>/` holds everything for non-dev domains (bread, tomatoes, ops, etc.).
**Why:** Session workflow is shaped by the kind of work, not the kind of file. A farm repo and a Next.js repo both need `/kill-this`, but the build-check step differs fundamentally. Per-family bundles keep that difference explicit.
**Tradeoff:** Duplication across families when skills converge. If a pattern emerges in both, `@sync-config` flags it for potential extraction — but extraction is never automatic.

## DEC-002: Skills live project-level, not user-global
**Decision:** Session skills (`/its-alive`, `/kill-this`, etc.) live in `<project>/.claude/skills/`, checked into each project's repo. Not in `~/.claude/skills/` (user-global).
**Why:** Skills are project-shaped, not device-shaped — `/kill-this` in a Next.js repo runs `npm run build`; in a farm repo it doesn't. Project-level skills ride along with the git checkout, so they're automatically consistent across laptop, headless box, and mobile — no separate device-sync mechanism needed.
**Verified (2026-04-22):** Mobile CC auto-discovers `<project>/.claude/skills/` from a cloned repo. Confirmed via `mobile-test` probe skill.
**Tradeoff:** Setup step per new project (seed the skills from seeds). `~/.claude/skills/` becomes empty or holds only truly cross-project skills.

## DEC-003: One sync concept, two directions, same classifier
**Decision:** Sync-config is one system running in two directions — **upstream** (project → seeds, opens PR) and **downstream** (seeds → project, pulls updates). Both invocations pass diffs through the same `@sync-config` agent to classify changes as "generic improvement" vs. "project-specific tweak."
**Why:** The classification logic is the hard part and doesn't depend on direction. Treating sync as two features would duplicate the hardest piece.
**Tradeoff:** None material. Invocation paths (nightly Routine vs. manual skill) differ, but the core logic is shared.

## DEC-004: Upstream = nightly remote Routine, downstream = manual skill
**Decision:** Upstream sync runs on a schedule via Anthropic Routines (remote, nightly). Downstream sync is manual via a `/pull-seeds` skill the user runs inside a project when they want updates.
**Why:** Upstream catches improvements automatically without cluttering mid-task flow. Downstream is rare enough and disruptive enough (could introduce conflicts mid-work) that the user explicitly wants it on-demand only — no "session start" nag reminders.
**Tradeoff:** Two different invocation mechanisms to maintain. Offset by them sharing the classifier (DEC-003).
**Revisit if:** User ends up never running `/pull-seeds` manually — means downstream needs a gentler reminder mechanism, or the update frequency doesn't justify downstream sync at all.

## DEC-005: Branch model — task/* branches + PR flow
**Decision:** All work happens on `task/*` branches, same as any other project using this workflow. `/its-alive` starts on `main`, cuts a branch; `/kill-this` pushes and opens a PR; `/its-dead` commits the session log to `main` after merge and deletes the branch.
**Why:** Seeds was on `main` (solo, no review surface) but this caused a recurring problem: skill copies in the seeds repo never got properly pushed, so `git pull` on other machines returned "already up to date." The PR merge acts as the natural forcing function — work isn't done until the PR merges, which guarantees everything is pushed. Also: seeds should eat its own dogfood. If the PR workflow is good enough to recommend, it's good enough to use here.
**Changed from:** Always on `main`. Changed 2026-05-01 after observing the push-discipline failure in practice.
**Tradeoff:** Slightly more ceremony per task. Worth it for the push guarantee and consistency.

---

## DEC-006: Schema versioning — single global integer at `seeds-version`
**Decision:** The seeds workflow is versioned as a single integer (V1, V2, …) stored at the seeds repo root in `seeds-version` and at each project root in `.claude/seeds-version`. One number covers `PROJECT_PLAN.md` format, session-file format, and the skill set + API as one bundle. `/pull-seeds` (and any future seeds ↔ project sync) compares the two files; mismatch → STOP and require an explicit migration (documented in `docs/SCHEMA_VERSIONS.md`). Never auto-migrate.
**Why:** Without versioning, `/pull-seeds` into a project on an older convention (e.g. sailbook still on monolithic `session-log.md`) would silently install incompatible skills and corrupt the project's session history. A single integer is enough — the three surfaces are coupled in practice (a skill API change usually implies a session-file change), so independent counters add complexity without clarity. Plain text in a bare file is grep-able by shell tooling without parsing markdown or JSON.
**Tradeoff:** Bumps are coarse — adding one new optional skill could trigger a version bump even if existing projects keep working. Acceptable: when in doubt, bump, and document the migration as a no-op if nothing requires action.
**Alternatives considered:** SemVer (rejected — no real "patch" axis for templates); per-surface counters (rejected — coupling makes them move together anyway); version field embedded in CLAUDE.md frontmatter (rejected — harder to grep, easy to drift from the truth).

---

## DEC-007: Project semver — `package.json` + git tag, three triggers, dev projects only
**Decision:** Dev projects carry a SemVer version (`MAJOR.MINOR.PATCH`) stored in `package.json` and mirrored to a git tag (`vX.Y.Z`) on `main`. Three triggers move it:
- **Patch:** bumped by `/its-dead` on every PR merge to the working branch. CHANGELOG entry derived from PR title.
- **Minor:** bumped by `/retro` on phase close. CHANGELOG entry derived from phase summary.
- **Major:** bumped manually by a new `/bump-major` skill. User supplies the rationale.

Tags are only ever applied on `main`. In staging-flow projects (DEC-008), patch/minor bumps happen on `staging` without tagging; the tag is applied when `/promote-staging` ff-merges into `main`.

**Detection — "is this a dev project?":** presence of `package.json` at the repo root. Seeds + domain repos have no `package.json` → all version-bump steps no-op silently.

**Bump tool:** `npm version <patch|minor|major> --no-git-tag-version` mutates `package.json` (and `package-lock.json`) in place and prints the new version. The `--no-git-tag-version` flag is critical — we control tagging ourselves so a release gets exactly one tag.

**`<VersionTag />` template:** `dev/claude/templates/VersionTag.tsx` reads `process.env.NEXT_PUBLIC_APP_VERSION` + `process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` at build time and renders `v1.2.3 (a1b2c3)`. The `NEXT_PUBLIC_` prefix is required — Next.js only inlines those into client bundles, so a Server-Component-only read of `process.env.npm_package_version` would silently render `v0.0.0` in any client tree. The component requires a one-time `next.config.js` setup that forwards `npm_package_version` into `NEXT_PUBLIC_APP_VERSION`. Wired into login screen + footer per project.

**Why:** Vercel-displayed version on the login screen is the highest-priority surface — without a version surface, "what's deployed?" is unanswerable. SemVer is the only ladder users already know how to read. Tying patch to PR merges and minor to phase close means version movement matches work cadence with no extra ceremony.

**Tradeoff:** Patch-per-PR can produce noisy version numbers for short tasks. Acceptable — version is for communication, not collectible.

**Limitation:** `package.json` detection presumes a node-shaped dev project. When a non-node dev project lands (Rust, Python, etc.), generalize the detector — likely "any of `package.json`, `Cargo.toml`, `pyproject.toml`" with a per-language bump strategy. Not built now (YAGNI until that project actually exists).

**Alternatives considered:** Standalone `VERSION` file (rejected — duplicates `package.json` for node projects, no benefit); date-based versioning like CalVer (rejected — communicates time-since-release, not change magnitude); auto-categorize PR titles into Added/Changed/Fixed (rejected — heuristic, would lie often, not worth the complexity for a solo dev's CHANGELOG).

## DEC-008: Staging promotion via ff-merge, not PR
**Decision:** When a project has a `staging` branch, `/kill-this` PRs into `staging` (not `main`). Promotion to `main` happens via `/promote-staging` which fast-forward-merges `staging` into `main`, tags the release with the version currently in `package.json`, and pushes both branches and the tag. No PR opens for the staging→main step.

**Detection — "is staging in use?":** `git show-ref --verify --quiet refs/remotes/origin/staging` returns 0 if the local cache has the ref. Used by `/kill-this` (PR base), `/its-dead` (merge target detection), `/retro` and `/bump-major` (working branch resolution), and `/promote-staging` (gating). Local-cache check rather than `git ls-remote` so the skills work offline — `/its-alive` already fetched at session start, so the cache is fresh.

**Why:** Solo dev — there is no second reviewer for the staging→main promotion, so a PR adds ceremony without adding signal. The work was already reviewed when each task PR landed in `staging`. Fast-forward keeps history linear; if staging diverges from main (shouldn't happen but possible), `/promote-staging` STOPs and asks rather than auto-merging.

**Tradeoff:** No GitHub UI moment to inspect the promotion before it ships. Acceptable — anything worth re-inspecting should have been caught at the staging PR. The Vercel deploy hook on `main` is still the deploy moment.

**Alternatives considered:** Open a staging→main PR and self-merge (rejected — empty ceremony, every promotion would auto-approve); merge commit instead of ff (rejected — adds a "Merge branch 'staging'" commit on every promotion that conveys nothing).

---

## DEC-TBD: Anthropic Routines GitHub access model
**Question:** Can Anthropic Routines authenticate to N private GitHub repos and open a PR to one of them? What auth mechanism (GitHub App, PAT, OAuth)?
**Options:** GitHub App install vs. PAT stored in Routine config.
**Blocks:** Task 6 in PROJECT_PLAN.md.

## DEC-TBD: Fate of `scripts/nightly-sync.sh`
**Question:** Once the remote Routine works, does the local WSL-scheduled `scripts/nightly-sync.sh` stay as a belt-and-suspenders alternative, get retired, or stay as the "works offline" path?
**Blocks:** Task 8 in PROJECT_PLAN.md.

## DEC-TBD: Repo list format for the Routine
**Question:** JSON, YAML, or plain text newline-separated? Lives in seeds root or under `docs/`?
**Depends on:** What the Routine natively reads.
