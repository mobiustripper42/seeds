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

Tags are applied on the active trunk (`main`) at bump time (DEC-022). Promotion to a `production` deploy branch (if the project has one) carries the already-tagged commit via ff-merge; `/promote-production` does not tag. (Under the retired DEC-008 staging model, bumps were untagged on `staging` and tagged at `/promote-staging` — no longer the case.)

**Detection — "is this a dev project?":** presence of `package.json` at the repo root. Seeds + domain repos have no `package.json` → all version-bump steps no-op silently.

**Bump tool:** `npm version <patch|minor|major> --no-git-tag-version` mutates `package.json` (and `package-lock.json`) in place and prints the new version. The `--no-git-tag-version` flag is critical — we control tagging ourselves so a release gets exactly one tag.

**`<VersionTag />` template:** `dev/claude/templates/VersionTag.tsx` reads `process.env.NEXT_PUBLIC_APP_VERSION` + `process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` at build time and renders `v1.2.3 (a1b2c3)`. The `NEXT_PUBLIC_` prefix is required — Next.js only inlines those into client bundles, so a Server-Component-only read of `process.env.npm_package_version` would silently render `v0.0.0` in any client tree. The component requires a one-time `next.config.js` setup that forwards `npm_package_version` into `NEXT_PUBLIC_APP_VERSION`. Wired into login screen + footer per project.

**Why:** Vercel-displayed version on the login screen is the highest-priority surface — without a version surface, "what's deployed?" is unanswerable. SemVer is the only ladder users already know how to read. Tying patch to PR merges and minor to phase close means version movement matches work cadence with no extra ceremony.

**Tradeoff:** Patch-per-PR can produce noisy version numbers for short tasks. Acceptable — version is for communication, not collectible.

**Limitation:** `package.json` detection presumes a node-shaped dev project. When a non-node dev project lands (Rust, Python, etc.), generalize the detector — likely "any of `package.json`, `Cargo.toml`, `pyproject.toml`" with a per-language bump strategy. Not built now (YAGNI until that project actually exists).

**Alternatives considered:** Standalone `VERSION` file (rejected — duplicates `package.json` for node projects, no benefit); date-based versioning like CalVer (rejected — communicates time-since-release, not change magnitude); auto-categorize PR titles into Added/Changed/Fixed (rejected — heuristic, would lie often, not worth the complexity for a solo dev's CHANGELOG).

## DEC-008: Staging promotion via ff-merge, not PR
> **⚠ SUPERSEDED by DEC-022 (2026-06-01).** The staging-flow model made the *active* branch (`staging`) the *non-default* branch. The nightly sync reads each project's default branch (`main`) but PR'd downstream into `staging`, so on the one repo that adopted staging (sailbook) a permanent main↔staging gap was re-proposed as "drift" every night (sailbook PR #75). DEC-022 inverts the model: `main` is always the active trunk, and an optional `production` branch is the downstream deploy pointer. The text below is retained for history; the `origin/staging` detection it describes has been removed from `/kill-this`, `/retro`, `/bump-major`, `/its-alive`, and the nightly routine, and `/promote-staging` is replaced by `/promote-production`.

**Decision:** When a project has a `staging` branch, `/kill-this` PRs into `staging` (not `main`). Promotion to `main` happens via `/promote-staging` which fast-forward-merges `staging` into `main`, tags the release with the version currently in `package.json`, and pushes both branches and the tag. No PR opens for the staging→main step.

**Detection — "is staging in use?":** `git show-ref --verify --quiet refs/remotes/origin/staging` returns 0 if the local cache has the ref. Used by `/kill-this` (PR base), `/its-dead` (merge target detection), `/retro` and `/bump-major` (working branch resolution), and `/promote-staging` (gating). Local-cache check rather than `git ls-remote` so the skills work offline — `/its-alive` already fetched at session start, so the cache is fresh.

**Why:** Solo dev — there is no second reviewer for the staging→main promotion, so a PR adds ceremony without adding signal. The work was already reviewed when each task PR landed in `staging`. Fast-forward keeps history linear; if staging diverges from main (shouldn't happen but possible), `/promote-staging` STOPs and asks rather than auto-merging.

**Tradeoff:** No GitHub UI moment to inspect the promotion before it ships. Acceptable — anything worth re-inspecting should have been caught at the staging PR. The Vercel deploy hook on `main` is still the deploy moment.

**Alternatives considered:** Open a staging→main PR and self-merge (rejected — empty ceremony, every promotion would auto-approve); merge commit instead of ff (rejected — adds a "Merge branch 'staging'" commit on every promotion that conveys nothing).

## DEC-009: Supabase prod-write guard — discipline + wrapper script
**Decision:** Two-layer defense against destructive Supabase CLI ops landing on production:
- **Discipline:** never `supabase link` to a prod project ref from a dev box. Production reads its `SUPABASE_URL` + service-role key from Vercel env vars; there is no reason for a local link to prod.
- **Wrapper script:** `scripts/safe-supabase.sh` (template at `dev/claude/scripts/safe-supabase.sh`) reads the linked ref from `supabase/.temp/project-ref` and a per-project prod-ref allowlist from `.claude/prod-supabase-refs` (gitignored). For destructive subcommands, if the linked ref is in the prod list, refuses the operation and prints a remediation hint. Pass-through for everything else. The matcher walks adjacent argument pairs (not just `$1 $2`), so leading global flags don't shift the destructive subcommand out of view.

**Guards (extend as new destructive forms surface):** `db reset`, `db push`, `db remote *`, `migration up`, `migration repair`.

**Why:** `supabase db reset` is a common dev-loop command that needs to work freely on staging — but the same command on a prod link would wipe production. Discipline alone fails the day someone runs `supabase link --project-ref <prod>` to "just check something" and forgets to relink. The wrapper closes that gap without restricting the staging dev loop.

**Tradeoff:** Wrapper only catches CLI ops that go through the linked-project mechanism. Bypass surfaces (by design — the wrapper is opt-in protection, not a sandbox):
- `--db-url postgres://...prod...` on `db push` / `db remote commit` bypasses the link entirely.
- Dashboard ops, direct `psql` against the prod URL, any tool not going through the `supabase` binary.
- A user who keeps invoking `supabase` directly (no shell alias) sees no protection.

These rely on the discipline (no prod URL in local env, no prod password on disk). Aliasing `supabase='./scripts/safe-supabase.sh'` is what makes the protection transparent.

**Detection — "is this a Supabase project?":** presence of `supabase/` directory at the repo root. Projects without it skip the script + setup entirely.

**Where the prod list lives:** `<project>/.claude/prod-supabase-refs`, gitignored. One ref per line, blank lines + `#` comments allowed. Per-project rather than global so multi-project dev boxes don't cross-contaminate (e.g. project A's prod ref shouldn't block project B's destructive ops). A stale ref from a retired project would silently un-protect a global file; per-project keeps the blast radius scoped.

**Alternatives considered:** Single global `~/.claude/prod-supabase-refs` (rejected — cross-project bleed, retired-project staleness). Wrap with a shell alias only, no script (rejected — discipline becomes "remember to type `safe-supabase` instead of `supabase`"; a script + alias is just-as-easy and transparent). Block at the CLI argv level via a hook in the supabase CLI itself (rejected — Supabase CLI has no plugin hook; we'd be patching their binary). PR-test that runs against staging-only (rejected — different concern; this guard is for the developer's local box, not CI).

---

## DEC-010: Bi-directional nightly sync via Anthropic Routine
**Decision:** Sync runs unattended nightly via a single Anthropic Routine (`dev/claude/routines/nightly-sync.md`) that handles BOTH directions per repo. The Routine reads `.claude/routine-config.yaml` for filter rules + direction config, enumerates the repos its MCP github session has access to (the **Routine form's repo chip area on claude.ai is the active-set source of truth**), filters by `exclude:` + `require:` + `.claude/seeds-version` presence and version match, and per (repo × direction) invokes `@sync-config` in `mode: auto`. Each invocation that produces non-empty changes opens its own PR — upstream PRs into `mobiustripper42/seeds:main`, downstream PRs into the project's default branch (the active trunk; never a `production` deploy branch — DEC-022). Nothing merges automatically; the PR is the human-review checkpoint.

**Active-set source of truth = Routine form, not config.** The original design (PR #11, 2026-05-07) had `routine-config.yaml` carry an `orgs:` list and the Routine enumerated `<org>/*` via `repos.list`, then filtered. The first live run (2026-05-08) revealed the failure mode: GitHub OAuth scope is per-repo, not org-wide. Listing returned 18 repos; per-repo content reads denied 17 of them; the Routine aborted cleanly via the safety guardrail. Fix: the Routine form's chip area (the same surface that gates MCP access) is now the canonical active-set declaration. Adding a project to the active set = add it to the form. Removing = remove the chip. No config edit needed for either. The `orgs:` block was dropped from `routine-config.yaml`; `exclude:` stays as a second filter for the always-skip-anyway case (seeds-itself).

**Supersedes the upstream-only stance in DEC-004.** That decision treated downstream as manual-only because mid-task conflicts were the worst-case. The Routine's "open a PR, never apply directly" pattern bounds that risk: a bad downstream sync lands as a PR sitting in a project's queue, not as a destructive merge. Manual `/pull-seeds` still exists for the "I want it now" case.

**Auto mode on `@sync-config`:** the agent now accepts `mode: interactive` (default, used by `/push-seeds` and `/pull-seeds`) and `mode: auto` (used by the Routine). Auto mode applies every backport/forward-port without prompting, defaults to skip on ambiguity (the PR is the safety net), and never acts on pattern flags — those go in the report only.

**Provenance labeling on every hunk.** The first live run blanket-skipped `docs/*.md` files as "100% project-specific" without per-hunk classification — a degradation of the agent's contract that hid template-side structural improvements from propagation. Fix: `@sync-config` Step 2 now labels every hunk's provenance: `Project-only` (content in project, missing from template — typically a `[placeholder]` filled in or project-specific structure), `Template-only` (content in template, missing from project — typically a structural improvement to forward-port), or `Both-modified` (non-matching content on both sides — highest ambiguity, defaults to skip with a flag in the PR body). The Provenance label is a required column in the agent's classification table and in every Routine PR body. Rationale: BRAND.md, PROJECT_PLAN.md, RETROSPECTIVES.md, and CLAUDE.md all carry both project substitutions AND template structure; the per-hunk + per-provenance treatment is the only way to propagate structural changes without overwriting customizations. Files that have a corresponding template (every file under `<seeds>/dev/claude/`) MUST be hunk-classified — never blanket-skipped.

**`CLAUDE.md` added to `@sync-config` diff scope.** The agent's Step 1 originally listed `.claude/skills/`, `.claude/agents/`, and `docs/<name>.md` pairs but omitted the project root `CLAUDE.md` vs `<seeds>/dev/claude/CLAUDE.md` pair. Result: structural sections added to the template (e.g. `§Versioning`, `§Tone`, `§Verbosity`, `§Cost and Waste`, `§Migration Protocol § Production write protection`) had no propagation path. Now in scope; the per-hunk Provenance treatment handles the heavy customization (stack, role descriptions, project-specific commands) without blocking structural propagation.

**PR shape: one per (repo × direction).** The earlier local prototype (`scripts/nightly-sync.sh`) used a stacked single-PR-to-seeds for all upstream changes. Per-repo PRs are easier to merge selectively, easier to revert per-repo, and parallelize across the two directions. Cost: more PR noise per run. Acceptable — the rolling `routine: last run <DATE>` issue lists them all in one place.

**Schema-version mismatches** are skipped per-repo with no PR opened, rolled into a single rolling `routine: migration backlog` issue on `mobiustripper42/seeds`. The repo rejoins the active set automatically the run after it migrates.

**Per-run summary** is a rolling `routine: last run <DATE>` issue on `mobiustripper42/seeds` — body replaced each run, edit history preserved by GitHub. One issue, not one per day, so the issue list stays clean.

**Why YAML for `routine-config.yaml`:** the config carries lists (exclude, directions) and nested keys (per-direction prefixes). Plain newline-separated would force a parallel-file convention; JSON forbids comments which the file genuinely needs. YAML supports comments, is human-editable, and CC parses it natively.

**Why a single Routine, not one per direction:** running both directions in the same session means upstream backports landing in seeds first are already visible to the downstream pass — no day-of-lag for a backport to ride out to other projects. The Pro plan's 5-runs/day limit also matters; one Routine consuming one slot/day leaves headroom for ad-hoc Routines.

**Tradeoff:** the prompt in `dev/claude/routines/nightly-sync.md` is the canonical body, but the Routine actually executes from a copy stored in claude.ai. Drift between the two is a real failure mode — the deployment guide (`dev/claude/routines/README.md`) calls out the manual re-paste step, but there's no automated check. Same drift risk now applies to the form's chip area as the active-set surface — adding a project there has no source-control trace.

**Scaling boundary:** discovery is O(repos-the-form-grants). The user controls the size of the active set directly; no API enumeration cost. Worth re-examining if the form ever exposes an "all repos in org X" toggle that would short-circuit the per-repo selection — at that point we'd be back to the per-repo OAuth question and might want a `routine-config.yaml`-side allowlist as a second filter.

**Resolves the prior `DEC-TBD: Anthropic Routines GitHub access model`** — answered by Task 4 research and refined by the 2026-05-08 first run: multi-repo OAuth via the `/web-setup` skill flow on claude.ai, PRs opened via the MCP github connector, scope is per-repo (per chip in the form), Pro plan = 5 runs/day. No PAT or GitHub App install needed.

**Resolves the prior `DEC-TBD: Repo list format for the Routine`** — chosen format is YAML at `.claude/routine-config.yaml`. Rationale above.

**Resolved:** the local-WSL `scripts/nightly-sync.sh` was retired 2026-05-14 (DEC-TBD resolution above, Task 8). The Routine is the only sync path.

---

## DEC-011: Project-type gating for template files
**Decision:** Each project declares its type in a single-line `<project>/.claude/project-type` file (currently `webapp` or `tool`). A manifest at `<seeds>/.claude/type-manifest.yaml` lists the small subset of `dev/claude/` template files that don't apply to every type — e.g. `agents/ui-reviewer.md` is `[webapp]` only because it's built around shadcn UI conventions. `@sync-config` reads both before scoping its diff: any gated file whose allowed-types list doesn't include the project's type is dropped from scope and surfaces in the PR body as a `Type-gated` Provenance row. Projects without `.claude/project-type` are treated as **ungated** — every template file is diffed (legacy behavior preserved); the Step 6 report carries a one-liner so the absent file doesn't go unnoticed.

**Why a separate file, not a field on `seeds-version`.** Two reasons. (1) Read precision — `seeds-version` is parsed as an integer by every consumer (skills, the Routine, `@sync-config`'s own gate). Mixing in a string field would force every reader to grow a parser. (2) Scope clarity — `seeds-version` controls schema-compatibility gating (DEC-006), `project-type` controls file-applicability gating. Different concerns, different lifetimes (a project's type rarely changes; its schema version migrates each cycle). One file per concern is the convention here (`devname`, `seeds-version`, `prod-supabase-refs` all follow it).

**Why a manifest, not per-file frontmatter.** A YAML manifest at the seeds root makes the gating list visible in one place, easy to audit, and easy to extend. Per-file frontmatter (e.g. a `# project-types: [webapp]` header inside `ui-reviewer.md`) would scatter the policy across the template tree and require every file consumer to parse it. Since most template files apply to all types — only listed files are gated — a single deny-list-style manifest keeps the common case overhead-free.

**Whole-file gate, not hunk-level.** Type-gating drops a file pair from the diff scope entirely; it doesn't classify hunks. This is intentional: a `tool` project doesn't half-want a UI reviewer, it doesn't want one at all. Scoping out the file before classification is cleaner than emitting a Provenance row per hunk inside a file that shouldn't have been diffed in the first place. The PR body still surfaces one `Type-gated` row per gated file so the reviewer can confirm the gate fired correctly.

**Provenance row for type-gated skips.** The PR body's classification table gets a fourth Provenance value: `Type-gated`. Action format: `Skipped — project type <type>, file applies to [<allowed types>]`. Same column as the Step 2 hunk Provenance values; readers don't need a separate section.

**Backfill:** existing projects (bushel, sailbook → `webapp`; helm, captains-log → `tool`) get the file written manually as part of Task 28. New projects get it during `/web-setup` per CLAUDE.md Setup step 9a.

**Forcing function:** the 2026-05-09 nightly sync run surfaced two related failures. (a) helm#5's pattern flag fired only because helm has *no* `ui-reviewer.md` — the absence triggered the flag. captains-log was created from seeds the day before, so it *has* `ui-reviewer.md` even though it's a tool project; the SHA matched and no flag fired. Same architectural fact (both projects are tool-type), inconsistent classifier output. (b) The Routine had no way to express "this template file applies only to certain projects" — the `@sync-config` contract was either "all template files diff against all projects" or "the human reviewer figures it out per file." DEC-011 makes the distinction explicit and source-controlled.

**Tradeoff:** the manifest is a hand-maintained list. Adding a new template file that's type-specific requires editing two files (the file itself, plus the manifest). The same applies to type-renames or splits. Acceptable — the alternative is per-file frontmatter, which scales worse on the read path.

**Out of scope (deferred to a later task):** a `domain` project type for `<seeds>/domain/` template family (bread, tomatoes, ops, etc.). Surface it when the domain templates get populated; the manifest format already accommodates new types via the per-file `[<types>]` list.

---

## DEC-TBD: Fate of `scripts/nightly-sync.sh` — RESOLVED 2026-05-14
**Resolution:** Retired. The remote Routine (DEC-010) has run cleanly for ~5 days. `scripts/nightly-sync.sh` and its docs are removed. Task 8 closed.

---

## DEC-012: Session-end flow — `/its-dead` first, merge last; PR-flow default on protected `$WORKING_BRANCH`

**Date:** 2026-05-12
**Status:** Accepted

**Context.** Three concrete failures from the post-DEC-005 era forced a clean redesign of the session-end sequence:

1. **Stranded session logs.** `/its-dead` Step 5.2 had two paths for `STATE=MERGED` (user merged the PR between `/kill-this` and `/its-dead`) — both required pushing the finalize commit somewhere. On protected `$WORKING_BRANCH` (the post-merge target), the direct push returned 403; the session log got pushed to the just-merged-and-orphaned branch, where it sat forever (S15, Task 19). The `STATE=MERGED`-mid-session path was always a special case for a sequence the workflow shouldn't recommend in the first place.

2. **Cheerful close on `STATE=OPEN`.** The closing summary said "Session N closed" identically whether the PR was MERGED, OPEN, or NO_PR. Users read success and walked away, leaving PRs sitting overnight (S22 → PR #24, merged 36+ hours late after the next session caught it).

3. **`NO_PR` legacy path on protected main.** DEC-005's "always on main while solo" pre-dates branch protection. When a session ran without a PR (e.g. `/kill-this` Step 4.2 skipped due to missing `gh` + MCP), `/its-dead`'s NO_PR cleanup tried to direct-push to `$WORKING_BRANCH`, got 403, and had no in-flow fallback (PR #24 documented this verbatim).

**The reordered flow.**

```
1. /kill-this — opens PR with draft session entry. Captures pr_number, pr_url, pr_opened_at into session frontmatter.
2. /its-dead  — pushes finalize commit (wall_clock + dev_time + body sections) to the SAME branch. PR auto-updates. Closing summary tells user how to merge.
3. User merges — `gh pr merge <N> --merge --delete-branch` or GitHub UI. Branch deletes at merge time (GitHub's job, not the skill's).
4. Next /its-alive — Step 7.5 backfills review_time on the prior session by reading the now-MERGED PR's merged_at.
```

The user merging AFTER `/its-dead` is the keystone. It eliminates the `STATE=MERGED`-mid-session race, gives the session log a definite landing place (the open PR), and shifts branch cleanup to GitHub's --delete-branch handler.

**The `NO_PR`-on-protected-main fallback.** When `/its-dead` Step 5.2 enters the legacy NO_PR path, it probes `$WORKING_BRANCH` protection first. If protected, the skill opens a "Session N close-out" PR from the session branch instead of trying to direct-push. The session effectively ends in `STATE=OPEN` regardless of how it started — protected `$WORKING_BRANCH` makes PR-flow the only viable shape.

**What DEC-005 still covers.** DEC-005 (always on main while solo) is now scoped to projects where `$WORKING_BRANCH` is unprotected. The CC platform's `claude/<slug>` auto-branching + protected `main` + branch protection rules on org repos means the de-facto default has already shifted to PR-flow. DEC-005's direct-push is the unprotected-main fallback, not the primary path.

**Wall clock / dev time / review time.** The reordering created the seam to capture three time fields rather than one. The session splits in two at `pr_opened_at`:

- `wall_clock` = `/its-dead` end − `/its-alive` start. Raw.
- `dev_time` = `pr_opened_at` − `started`, minus inferred breaks within that window.
- `review_time` = `ended` − `pr_opened_at`, minus inferred breaks within that window.

Break inference walks the transcript JSONL(s) and counts any gap > 15 min as idle. A gap's start timestamp picks which window it belongs to. Manual user adjustments (`/its-dead subtract 30 minutes for time away from desk`) apply on top, with the user clarifying which window if ambiguous.

If `pr_opened_at` is unset (`STATE=NO_PR` — `/kill-this` never opened a PR), the session is treated as one window: `dev_time = wall_clock - all_breaks`, `review_time = 0`.

The merge happens AFTER `/its-dead` (the DEC-012 reorder) — so merge time is *not* part of `review_time`. `review_time` here measures in-session review work (addressing `@code-review` findings, drafting the log, running `/its-dead`), not GitHub-PR-pending-merge wall time.

All three fields are populated at `/its-dead` close, no backfill needed. `duration:` stays as a synonym for `dev_time:` for legacy velocity-table readers.

**Consequences.**
- `/ship-it` was on the template skills table but never built — folded into `/its-dead` + manual merge.
- The "everything is closed" closing summary line is now `STATE`-conditional. `OPEN` says "merge to ship," `MERGED` says "version bumped + branch cleaned," `NO_PR` says "cleaned up branch." No more flat success when a PR sits waiting.
- `/its-alive` Step 0.5 scans for orphan-branches-without-PRs at session start, catching any work that fell through the cracks of a prior session.
- Three new frontmatter fields per session: `wall_clock`, `dev_time`, `review_time` — all populated at `/its-dead` close from the `pr_opened_at` seam. `/retro` reads all three to compute three velocities: points/wall_clock, points/dev_time, points/review_time.

**Trade-offs.** The user is on the hook for one extra step (merge after /its-dead) that the original convention had them do mid-session. The benefit: no orphaned commits, no overnight-PR surprises, no "everything is closed" misreports. The cost: a 5-second `gh pr merge` after `/its-dead` prints its closing line.

**Migration.** Existing projects pick up DEC-012 via the nightly Routine (forward-port of the four skill files + this CLAUDE.md template change). No data migration — the new frontmatter fields are additive and optional; sessions written before DEC-012 stay readable.

**Supersedes:** DEC-005's direct-push convention (now scoped to unprotected `$WORKING_BRANCH` only).

---

## DEC-013: Per-task `/kill-this`, single `/its-dead`, all time math at `/retro`

**Date:** 2026-05-14
**Status:** Accepted
**Supersedes:** DEC-012's three-time-fields-at-close and the `/its-alive` Step 7.5 backfill.

**Context.** DEC-012 introduced `pr_opened_at` as the seam for `dev_time` / `review_time` splits, plus a backfill in `/its-alive` that wrote `review_time` into the *previous* session's frontmatter once that PR merged. Two problems surfaced in dogfooding:

1. **Backfill violates atomicity.** A session file that was supposed to be closed kept getting mutated by the next session. The closing summary said "everything is clean," but it wasn't — the next `/its-alive` would reach back and rewrite. The user surfaced this directly: "session_log needs to be atomic to the claude session."
2. **One Claude session usually has multiple tasks.** The skill names imply pairing (`/kill-this` ↔ `/its-dead`), but the actual workflow opens N PRs across one Claude window — `/kill-this` runs per task while waiting on CI / walking away / context-switching, and `/its-dead` only runs once at the very end. Stacked tasks on the old model left earlier commits uncounted and stranded the prior session's `status: open`.

**The new shape.**

- `/its-alive` — opens a session (1 per Claude window).
- `/kill-this` — runs **per task**. Build check, commit, opens a PR, **appends** a task block to the running session file. Captures `pr_number` into a `pr_numbers:` list in frontmatter. Does **not** compute time, does not set `ended:`.
- `/its-dead` — runs **once per Claude window**, last. Stamps `ended:`. Displays `wall_clock` (= `ended − started`) to screen as a gut-check, but does **not** write any time field to the session file. Commits and closes the file. No version bump (moved to `/retro`).
- Merge ordering — user's choice. PRs can merge before or after `/its-dead`; retro reads GitHub at retro time and gets the merge timestamps regardless.
- `/its-alive` Step 7.5 (backfill) — **deleted**.
- `/retro` — new responsibilities. For each session in the closing phase: reads `started`, `ended`, `transcript`, `pr_numbers`. Queries GitHub for each PR's `opened_at` / `merged_at`. Walks the transcript JSONL for break gaps. Computes per-session `wall_clock`, `dev_time`, `review_time`, and the three phase-level velocities (points / each).

**Session file schema after DEC-013.**

Frontmatter (atomic — written once, never mutated):
- `session:` `dev:` `slug:` `branch:` — unchanged.
- `started:` — stamped at `/its-alive`.
- `ended:` — stamped at `/its-dead`. Sole new addition vs pre-frontmatter.
- `pr_numbers:` — list of PR numbers, appended by each `/kill-this`. Replaces the singular `pr_number:` / `pr_url:`.
- `points:` — total points for the session (sum across tasks). Filled at `/its-dead` from the per-task points entered at each `/kill-this`.
- `status:` — `open` / `closed` / `abandoned`.
- `transcript:` — JSONL path captured at `/its-alive`.

**Removed fields:** `wall_clock`, `dev_time`, `review_time`, `duration`, `pr_opened_at`, `pr_url`, `pr_number`. Velocity-table readers that reached for `duration:` now read it from `RETROSPECTIVES.md` or from `/retro`'s computed report.

**Body structure.** One **## Task <N>** block per task, appended by each `/kill-this`. Each task block has `Task:`, `Completed:`, `Blocked:`, `PR:` (number + URL), `Points:`. The session-wide `Next Steps:` and `Context:` sections live at the bottom, written by `/its-dead`.

**Sanity check at close.** `/its-dead` displays "Wall clock: Nh Mm" to screen *only*. Lets the user spot anomalies ("that can't be right, I was here way less than that") and apply manual adjustments before walking away. The displayed number is not persisted to the file — the user's instinct to verify gets served, atomicity holds.

**Migration.** Existing session files (DEC-012-era) keep their old fields — the new schema is forward-only. `/retro` tolerates old-schema sessions: if `wall_clock`/`dev_time`/`review_time` are pre-filled, it uses them; otherwise it computes. No mass rewrite.

**Trade-offs.**
- Per-task velocity fidelity is lost when a session bundles multiple tasks of different sizes. Session-total velocity still works; per-task velocity would need either separate sessions per task (back to the old model) or tagging each commit with a task ID. Not worth the friction.
- Phase-end velocity reports require GitHub API access at `/retro` time. If `gh` + MCP are both unavailable, `/retro` skips `review_time` and reports only wall_clock + dev_time with a note. Same fallback discipline as DEC-012's STATE checks.
- The "wall clock seems wrong at close" case has no path to silently fix the file. The user adjusts via manual notes in the session body (`Context:` section) or waits for `/retro` to surface the anomaly across the phase.

**Why merge ordering is now free.** Pre-DEC-013, merge-before-/its-dead was a problem because the session file's `review_time` couldn't be computed without the merge timestamp, and merge-after-/its-dead needed the backfill hack. With math at retro: GitHub has both timestamps no matter what order things happened in, so retro just queries and computes. Neither ordering is privileged.

**Paired with DEC-014.** DEC-013's per-task `/kill-this` creates an immediate question: which branch does the appended session file get committed to? DEC-014 answers that — an orphan `sessions` branch via a dedicated worktree, decoupled from any task branch. The two ship together.

---

## DEC-014: Session files on orphan `sessions` branch via dedicated worktree

**Date:** 2026-05-14
**Status:** Accepted
**Depends on:** DEC-013 (per-task `/kill-this` semantics).

**Context.** DEC-013 made `/kill-this` per-task, opening N PRs per session. Each `/kill-this` writes to the session file. The file therefore needs commits on N different task branches — and those branches get squashed/merged/deleted at PR merge. The session file would either fragment across merged-and-deleted branches or pile up on whichever branch happened to be current at each `/kill-this` invocation. Both shapes are broken.

The fix is to remove the session file from the task-branch lifecycle entirely.

**Decision.** Each project has an **orphan `sessions` branch** containing only `sessions/` and a stub `README.md`. Skills access it via a dedicated git worktree at `.sessions-worktree/` (hidden, project-root-adjacent, ignored from `main`'s tree by being on a separate branch with separate history).

**Properties:**
- `sessions` branch has **zero shared history** with `main` (created via `git checkout --orphan sessions`). Never merges to main. Never merges from main.
- `.sessions-worktree/` is a `git worktree` attached to the `sessions` branch. Skills `cd` into it for session-file commits and pushes; the user's main checkout never moves.
- Branch protection on `main` becomes irrelevant for session work. Sessions branch is unprotected by default.
- Dev server / hot reload / build tools never see session-file commits, because they never appear in the main working tree.

**Skill changes.**
- `/its-alive` — Step 0.6 (new): ensures `.sessions-worktree/` exists. If missing, regenerates from `origin/sessions`; if `origin/sessions` doesn't exist yet (first run on a fresh project), creates the orphan branch + initial commit + worktree. Writes the session opener file inside the worktree. Commits and pushes the `sessions` branch.
- `/kill-this` — code commits + PR go to the task branch as today. Session-file appends go to `.sessions-worktree/sessions/<file>.md` and are committed/pushed to the `sessions` branch.
- `/its-dead` — stamps `ended:` inside the worktree, commits and pushes `sessions` branch. Sets `status: closed`.
- `/retro` — reads session files from `.sessions-worktree/sessions/*.md`.

**Three creation triggers** (so users can't accidentally end up without a worktree):
1. **New projects** — one-time setup step added to CLAUDE.md's "Setting Up a New Dev Project" list.
2. **Existing projects** — migration step (see below) creates it once.
3. **Safety net** — `/its-alive` Step 0.6 (new) checks for `.sessions-worktree/`; if missing, it regenerates from `origin/sessions` automatically.

**`.gitignore` entry.** `.sessions-worktree/` is added to `main`'s `.gitignore` so the worktree directory is invisible from main's tree.

**Migration (one-time per project).**
1. Create the `sessions` orphan branch with the existing session files: `git checkout --orphan sessions && git rm -rf . && git checkout main -- sessions/ && git add sessions/ && git commit -m "Initialize sessions branch" && git push -u origin sessions`.
2. Switch back to `main`: `git checkout main`.
3. Remove `sessions/` from `main`: `git rm -r sessions/`.
4. Add `.sessions-worktree/` to `.gitignore`.
5. Commit on `main`: `git commit -m "Move sessions to orphan sessions branch (DEC-014)"`.
6. Create the worktree: `git worktree add .sessions-worktree sessions`.

Existing session files preserved verbatim — they live on the new branch from commit 1.

**Trade-offs.**
- `ls sessions/` from `main` returns "no such directory" — muscle memory breaks. Quick peek workaround: `cat .sessions-worktree/sessions/<file>.md`.
- The Routine (DEC-010) doesn't currently know about the `sessions` branch. Sessions are project-local; only skill templates sync via the Routine. No change needed there.
- A user who manually `git checkout sessions` lands in a working tree with no code. Recovery: `git checkout main`. Not a hazard unless deliberately invoked.

**Why orphan rather than long-lived feature-branch.** Long-lived parallel branches accumulate merge debt against main forever. Orphan branches have zero shared history — they can't conflict, can't drift, can't fall behind. Sessions are not source code; treating them as a sibling timeline is the honest shape.

---

## DEC-015: Per-PR dev/review windows in retro time math

**Date:** 2026-05-17
**Status:** Accepted
**Supersedes the math** introduced in `/retro` Step 2.5 by DEC-013 (single-seam at `min(pr.createdAt)`) and amended by the 2026-05-15 fix (single-seam at `max(pr.createdAt)`).

**Context.** Under DEC-013, multi-PR sessions are the norm — a single Claude window may ship 8–10 PRs via N `/kill-this` calls. The original Step 2.5 collapsed the session to a single dev/review seam, first at `min(pr.createdAt)` (first `/kill-this`), then after the 2026-05-15 fix at `max(pr.createdAt)` (last `/kill-this`). Both versions had the same structural flaw: there is no single moment where "dev" ends and "review" begins in a multi-PR session. PRs 1..N-1 are reviewed and merged while PR_N is being built.

Bushel Phase 3 surfaced the symptom under the `min` formula (dev_time grossly under-counted, review_time over-counted). Phase 4+ retros under the `max` formula showed the inverse: dev_time = 0.035 h/pt is implausibly fast because the formula stuffed all post-last-PR time into review and treated all pre-last-PR time as dev, including the time spent reviewing PRs 1..N-1.

The retro skill correctly self-flagged the artifact ("DEC-013 method artifact (10 PRs in 2 sessions); do not trust as headline") and pointed users at `Active = wall_clock − breaks` as the honest headline. But that's a workaround, not a fix — `dev_time/pt` and `review_time/pt` should both be meaningful.

**Decision.** Each PR gets its own dev_window and review_window. Sum across all PRs in the session.

For each PR_i (sorted by `createdAt`):
- `dev_window_i = anchor_i → PR_i.createdAt` where `anchor_i = started` (first PR) or `PR_{i-1}.mergedAt` (subsequent PRs).
- `review_window_i = PR_i.createdAt → effective_merge_i` where `effective_merge_i = min(PR_i.mergedAt, ended)`.
- Trailing review window = `last_in_session → ended` for session close-out.
- Per-window break inference from transcript JSONL gaps > 15 min.

```
dev_time     = Σ max(0, dev_window_i − dev_breaks_i)
review_time  = Σ max(0, review_window_i − review_breaks_i) + trailing
```

**Honest accounting of concurrency.** When PR_{i} opens before PR_{i-1} merges (concurrent work), `dev_window_i` clamps at 0 — the time is real but it overlapped review of PR_{i-1} and is counted there. The user wasn't doing pure dev during that overlap; they were context-switching.

**Edge cases handled cleanly:**
- N=0 (no PRs): `dev_time = wall_clock − breaks`, `review_time = 0`.
- N=1 (single-PR session): formula collapses naturally — dev = `started → opened`, review = `opened → merged`, trailing = `merged → ended`.
- PR merged post-session: review_window caps at `ended`.
- PR still open at retro time: review_window also caps at `ended` (likely contains an open PR not yet reviewed).
- PR closed without merge: count `opened → closed` as review (the time was spent on it).

**Sanity invariant.** `dev_time + review_time + Σ break minutes ≈ wall_clock` for any N. If the formula drifts more than 0.1 h from this after rounding, the retro surfaces the discrepancy in Notes.

**Consequences.**
- `dev_time/pt` and `review_time/pt` become trustworthy as headline numbers for forecasting (no more "do not trust" caveat in the retro PM commentary).
- Historical retro numbers run under the single-seam formula are method artifacts. Pre-DEC-015 multi-PR sessions have under-reported (or over-reported, depending on the version) dev_time/review_time. The notes in `/retro` flag this; cross-phase comparisons should normalize against `Active = wall_clock − breaks` for any pre-DEC-015 phase.
- One additional `mergedAt` lookup per PR at retro time. Already fetched by Step 2 for `review_time` purposes — no new API calls.
- The retro skill PM commentary no longer needs the "DEC-013 method artifact" caveat once all sessions in a phase are post-DEC-015.

**Trade-offs.** More math, longer Step 2.5. Each PR contributes 2-3 sub-computations. Worth it: the headline numbers become trustworthy. The previous "use active as the headline" workaround was the skill apologizing for its own model — the model itself was the bug.

**Migration.** No data migration. Pre-DEC-015 retros stay as-written; their notes already flag the artifact. Future retros use the per-PR formula automatically once this lands. Routine forward-ports to bushel, captains-log, helm, sailbook on next nightly run.

---

## DEC-016: ui-reviewer agent split — generic shell + project context file

**Date:** 2026-05-18
**Status:** Accepted
**Applies to:** `[webapp]` projects only (tool projects don't use ui-reviewer).

**Problem.** `dev/claude/agents/ui-reviewer.md` contained both the generic review structure (behavior rules, output format, severity rubric) and the project-specific design system (brand tokens, typography scale, surface rules). The moment a project filled in its brand content, the file became Both-modified relative to the seeds template — the nightly sync could never forward-port structural improvements without overwriting project brand content. Every webapp project that customized the agent was permanently orphaned from template updates.

**Decision.** Split into two files:

1. **`dev/claude/agents/ui-reviewer.md`** (seeds template) — the generic shell. Contains: the instruction to read the project context file, the How to Review procedure, output format, priority definitions, severity rubric, and behavior rules. No project-specific content. Syncs cleanly across all webapp projects via the nightly routine.

2. **`.claude/ui-context.md`** (per project, never in seeds templates) — the project's design system reference. Contains: brand tokens, typography scale, surface descriptions (e.g. customer vs admin), component rules, and the project-specific review checklist. The nightly sync never touches this file.

The agent shell opens with: "Read `.claude/ui-context.md`. It contains the project's brand tokens, surfaces, typography scale, component rules, and review checklist. Treat it as authoritative. If the file does not exist, stop and tell the user to create it."

**Consequences.**
- `ui-reviewer.md` becomes sync-clean: structural improvements to the shell (new behavior rules, checklist additions, output format changes) propagate to all webapp projects via the nightly routine.
- Each project's full design system reference lives in one readable file (`.claude/ui-context.md`).
- New webapp projects: copy the seeds shell, fill in `[Project]`, create `.claude/ui-context.md` with the design system.
- Existing projects that have already customized their `ui-reviewer.md` (bushel, sailbook) need a one-time migration: extract the project-specific content to `ui-context.md`, slim the agent file back to match the shell.

**Namespace note.** Seeds DEC-016 is a framework decision. Projects initialized before this decision may already use DEC-016 for a project-specific decision (e.g., bushel uses DEC-016 for Wave invoicing). Those project DECISIONS.md files are separate documents with independent numbering — no conflict. Future projects seeded from seeds v3+ should start their project-specific decisions at DEC-017.

---

## DEC-017: Fact-check and structural-audit are separate reviewer concerns

**Date:** 2026-05-19
**Status:** Accepted
**Applies to:** All project types.

**Problem.** A casual "make sure the docs are consistent" prompt run in a brand-new crewbook checkout drifted from cross-reference fact-checking ("does CLAUDE.md's stack line agree with SPEC.md's?") into structural auditing ("DEC-007 references DEC-013 which isn't stubbed locally — should we add stubs for DEC-013/014/015, or restructure DEC numbering to put workflow DECs in seeds-only and project DECs at DEC-101+?"). Both kinds of review have value, but conflating them produced a wall-of-text response that buried the actual cross-doc finding (a stale version-bump trigger in the local DEC-007 stub) under a list of restructuring proposals the user hadn't asked for. The structural-audit framing also pulled the reviewer into "should we add stubs?" debates that aren't even consistency questions.

**Decision.** Fact-checking and structural auditing are distinct concerns and live in distinct surfaces.

- **Fact-checking** is the `@doc-consistency` agent (invoked via `/doc-consistency-check`). It cross-references claims across `docs/*.md` + root `CLAUDE.md`, flags mismatches with file:line refs and verbatim quotes, and flags unfilled template placeholders (literal `PLACEHOLDER`, bracketed leftover tokens). It produces no edits, no recommendations, no "should we restructure" prose. The agent spec carries an explicit out-of-scope list with the failure modes from the 2026-05-18 crewbook drift named directly: DEC numbering policy, file ownership, "this section should be added," stub strategy. If the reviewer notices an interesting structural concern, it gets one line in a tail "Out of scope (not investigated)" section and then the agent stops.

- **Structural auditing** is `@architect` or `@sync-config` territory, depending on which axis is in question. `@architect` reviews proposed architectural decisions against `SPEC.md` and `DECISIONS.md`. `@sync-config` classifies template-vs-project drift across files. Neither agent is invoked by `/doc-consistency-check` — keeping them out of the fact-check surface is what prevents the drift this DEC addresses.

**Project-type interaction (DEC-011).** `@doc-consistency` reads `.claude/project-type` to interpret `docs/BRAND.md`. For `webapp` projects, BRAND.md must declare theme/colors/typography/voice — an empty or template-stock file is a finding. For `tool` projects, BRAND.md is allowed to declare itself out of scope, but only with an explicit justification (e.g. "tool project — no end-user surface, so no visual brand"). A bare "not used" or any occurrence of the literal string `PLACEHOLDER` is a finding regardless of type. Projects without `.claude/project-type` are ungated and the report says so.

**Consequences.**
- The `/doc-consistency-check` surface produces predictable, scannable reports. Pass-with-zero-findings is a valid result; the report doesn't pad.
- The agent will not surface DEC-numbering opinions, file-ownership opinions, or "you should add a section" prose. Future skills that want those concerns invoke `@architect` instead.
- The skill is wireable into `/start-phase` (pre-phase clean-state check) and `/retro` (phase-end snapshot) without changing the agent — both wirings are deferred until the manual surface stabilizes.
- The Routine forward-ports the skill + agent to bushel/captains-log/helm/sailbook/crewbook on the next sync.
- Crewbook's 2026-05-18 stale-DEC-007 finding (the original signal) gets re-surfaced cleanly on the next `/doc-consistency-check` run there — no restructuring proposals attached.

**Why not extend `@architect` to cover doc consistency.** Different output shape, different fences. `@architect` reviews proposed decisions and is expected to make recommendations. `@doc-consistency` reviews facts in already-written docs and is expected to make zero recommendations. Bundling them would dilute both agents' specs and reintroduce the drift this DEC names.

---

## DEC-018: File-class registry for sync-config

**Date:** 2026-05-19
**Status:** Accepted
**Extends:** DEC-010, DEC-011
**Related:** DEC-016 (concrete example), DEC-019 (depends on this), DEC-020 (deferred)

### Decision

Add a `file-class` field to `.claude/routine-config.yaml` with three values: `logic`, `context`, `hybrid`. `@sync-config` reads this registry at Step 1.4 (new), before hunk classification. Behavior forks per class:

- **logic**: hash-compare only. Drift = one row per file, no hunks, no LLM judgment. Either matches or doesn't.
- **context**: excluded from diff scope entirely. Never compared.
- **hybrid**: only the seeds-side shell file participates in classification. The project-side `<name>-context.{md,json}` file is implicitly `context`.

Files not listed in the registry default to `hybrid` with the seeds file as shell — the legacy behavior. Unknown files don't break the routine; they just keep running through the LLM classifier as today.

### Context

The nightly Routine (DEC-010) produces PRs whose row counts don't match their signal counts. Empirical evidence:

| PR | Rows | Real changes | Noise rows | Notes |
|----|------|--------------|------------|-------|
| seeds#36 | 16 | 5 | 11 | Pre-DEC-016. Most noise was project-name substitutions and filled placeholders. |
| seeds#45 | 2 | 2 | 0 | Clean. |
| bushel#124 | 6 | 2 | 4 | ui-reviewer row dropped from 6 to 1 after DEC-016 split. |
| sailbook#58 | 9 | 4 | 5 | Three skips on hybrid files (architect.md, code-review.md, settings.json) wanting DEC-016 treatment. |

Second problem: the LLM classifier is non-deterministic across nights. A hunk skipped Monday gets re-proposed Tuesday because the classifier has no memory of prior verdicts. For files that are byte-identical-by-design (skills, sync-config itself, tape-reader), running an LLM at all is wasted work — there's nothing to judge.

The diagnosis is structural. Files under `.claude/` come in three shapes:

- **Logic** — skills, sync-config agent, tape-reader agent. Byte-identical-by-design across projects. Hunk classification is wasted; hash comparison is sufficient.
- **Context** — `docs/SPEC.md`, `docs/BRAND.md`, project's `CLAUDE.md` content. Pure project-specific. Comparing across projects is meaningless.
- **Hybrid** — `CLAUDE.md` root, `agents/architect.md`, `agents/code-review.md`. Mix of generic shell and project context. DEC-016 already split `ui-reviewer.md` this way. The pattern generalizes (DEC-019).

DEC-011's type-gating drops whole files per project type, but treats every file identically once in scope. File-class is the missing per-file dimension.

### Config shape

In `.claude/routine-config.yaml`, add a `file-classes` map keyed by glob, value is class name. Order matters — first match wins:

```yaml
file-classes:
  - "dev/claude/skills/**": logic
  - "dev/claude/agents/sync-config.md": logic
  - "dev/claude/agents/tape-reader.md": logic
  - "dev/claude/agents/ui-reviewer.md": hybrid
  - "dev/claude/agents/architect.md": hybrid
  - "dev/claude/agents/code-review.md": hybrid
  - "dev/claude/CLAUDE.md": hybrid
  - "dev/claude/docs/SPEC.md": context
  - "dev/claude/docs/BRAND.md": context
```

Rejected: a separate `file-class-manifest.yaml` parallel to `type-manifest.yaml`. The registry is small, lives next to the rest of the routine config, and doesn't justify a second file.

Globs are seeds-side paths. The agent maps to project-side paths using the same rules as today (Step 1 in sync-config.md).

### Gate ordering

Step 1 (DEC-011 type-gate, whole-file drop) → Step 1.4 (file-class lookup, behavior fork) → Step 1.5 (open-PR dedup) → Step 2 (hunk classification, only for hybrid shells and unclassified files).

Type-gate first because dropping a file entirely is cheaper than classifying it. File-class second because it changes what "classify" means.

### What changes in sync-config.md

- **Step 1.4 (new)**: Read `file-classes` from routine-config.yaml. For each file pair surviving Step 1, look up class. Drop context-class pairs from scope (log as `Class-gated: context`). Mark logic-class pairs for hash-only comparison.
- **Step 2 (amended)**: For logic-class pairs, compare file hashes. If equal, emit no row. If unequal, emit a single row `logic-drift | <path> | hash mismatch | Flag` — no hunk breakdown, no LLM verdict. Hybrid-class pairs proceed to hunk classification but only against the shell portion (see DEC-019). Context-class pairs were already dropped at 1.4.
- **Step 3**: Logic-drift rows render as one row per file. Provenance column reads `Class: logic`. Hybrid rows read `Class: hybrid (shell only)`.

### Trade-offs

- Hand-maintained registry. Adding a new skill means updating one glob. Acceptable — skills are added rarely.
- Glob patterns can drift. If someone adds a non-logic file under `dev/claude/skills/`, it gets hash-compared and flagged as drift. Forcing function: a hash mismatch on a logic file opens a PR immediately, no judgment, just "these drifted — sync them." Better than the LLM silently flip-flopping.
- Logic files that grow project-specific sections become wrong loudly. Today they become wrong silently.
- Wildcard collisions: first-match-wins handles this. The rule is documented in the agent.

### Forward references

- **DEC-019** generalizes DEC-016's pattern to all hybrid files. Depends on this registry to mark them.
- **DEC-020 (deferred → resolved by DEC-023)**: `settings.json` is a hybrid file but needs a JSON-merge strategy, not a shell+context split. Out of scope here. **Resolved by DEC-023: it ships as a manual-merge template, NOT auto-synced** — permission guardrails are security posture and shouldn't be union-merged by an unattended bot.
- **DEC-021 (deferred)**: retro "prefer-apply for structural Both-modified diffs" heuristic. Independent of file-class. Not blocked by this.

---

## DEC-019: Hybrid-file split pattern (generalization of DEC-016)

**Date:** 2026-05-19
**Status:** Accepted
**Generalizes:** DEC-016
**Depends on:** DEC-018
**Related:** DEC-010, DEC-011

### Decision

Every hybrid file gets split into two artifacts:

1. A **seeds-managed shell** at the original path. Generic, cross-project, syncs through the Routine.
2. A project-owned **context file** at `.claude/<basename>-context.{md,json}`. Project-specific. Never appears in seeds. Never syncs.

The shell file opens with a load instruction pointing at its context file. The context file is implicitly `class: context` per DEC-018's registry — no explicit registry entry needed.

This is DEC-016's pattern, lifted out of the ui-reviewer-specific case and applied to every hybrid file.

### Pattern shape

What makes the split work:

1. **Load instruction at the top of the shell.** Pattern: "Read `.claude/<name>-context.md`. If the file does not exist, stop and tell the user to create it." DEC-016's exact phrasing.
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
| `## Micro Workflow (DEC-013 + DEC-014)` | shell | The 12 steps are universal. If a project has step-specific overrides (e.g., "skip Supabase test db" for tool projects), they live in context under `## Workflow Overrides`. |
| `## Migration Protocol` | **shell, with Supabase-specific subsections moved to context** | The discipline (every schema change = migration, never edit applied migrations) is universal. Supabase CLI specifics and `### Production write protection (DEC-009)` move to context. Tool projects without a database drop the whole section from their context. |
| `## Commands` | context | Every project has different npm scripts. |
| `## Conventions` | **split** | TypeScript strict, Server Components default, error handling philosophy, RLS-default, naming conventions — shell. Component dirs, specific lint configs, project-specific testing layouts — context under `## Conventions (project)`. |
| `## Session Skills` table | shell | Universal slash command list. |
| `## Agent Workflow` table | shell | Universal agent list. |
| `## Model Selection` | shell | Opus vs Sonnet guidance is cross-project. |
| `## PR Workflow (DEC-013 + DEC-014)` | shell | Branch/PR rules are universal. |
| `### Production branch (DEC-022)` | shell | Universal: `main` is the active trunk; an optional `production` deploy branch is advanced by `/promote-production`. Shell handles both the has-production and deploys-off-main cases. |
| `## Versioning (DEC-007)` | **split** | Versioning policy and `### CHANGELOG.md` discipline — shell. `### <VersionTag />` component wiring and `### PR Review on Mobile` workflow — shell (universal). Project-specific version source paths — context. |
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
- The project's `.claude/<name>-context.{md,json}` is implicitly context-class (DEC-018) and never enters scope
- No special hunk-level filtering needed — the shell file in the project repo only contains shell content by definition

### Migration ordering

Per the SPEC: Phase 2 = CLAUDE.md, Phase 3 = architect.md, Phase 4 = code-review.md. Each phase is one session. Each phase = update seeds shell + extract context per project. Scope per phase varies by file applicability (webapp-only vs all-projects).

### Trade-offs

- Two files to read at session start instead of one. Mitigated by the load instruction at the top of every shell — if Claude reads the shell first, it knows to read the context next.
- One source of duplication risk: a project could fail to re-read shell after a sync. Mitigated by the Routine itself — if shell drifts, sync proposes a PR.
- Migration is manual and per-project. Acceptable: it's a one-time cost. LLM-assisted extraction is fine; full automation is not in scope.
- Context files have no version control across projects. By design — they're project-owned.

---

## DEC-022: `main` is the active trunk; `production` is the deploy branch (replaces DEC-008)
**Decision:** Every project's **default branch (`main`) is the always-active development trunk**. Deployable projects add an optional **`production`** branch that the host (Vercel, etc.) watches; shipping is `main` → `production` via fast-forward merge through the new `/promote-production` skill. This replaces the DEC-008 staging-flow, where the active branch was `staging` (non-default) and `main` was the release branch.

**Why (the bug it fixes):** the nightly sync Routine (DEC-010) and the dev skills read/operate on each project's **default branch**. DEC-008 made the *active* branch the *non-default* one, so the read-source (`main`) and the PR-target (`staging`) diverged. On sailbook — the only repo that adopted staging — `main` was frozen on an old workflow generation while `staging` carried the current one. Every nightly downstream run diffed stale `main` against seeds, generated a large "forward-port everything" plan, then opened the PR against `staging` (which already had that content), so the net diff collapsed to cosmetic regeneration noise that the next run re-detected — a self-perpetuating loop (sailbook PR #75, 2026-06-01). Aligning active = default eliminates the split at the source: the branch we diff is the branch we target.

**The model:**
- `main` — active trunk, in every project. `/kill-this` PRs here; `/retro`, `/bump-major`, `/its-alive` resolve `main` as the working branch. Identical dev workflow whether or not a project deploys.
- `production` — optional downstream deploy pointer. Never read or targeted by sync; never a PR base. Adopt with `git checkout -b production main && git push -u origin production`, then point the host's production branch at it.
- **Tags land on `main` at bump time** (uniform — DEC-007). Promotion carries the already-tagged commit; `/promote-production` does not tag.
- **Sync always targets the default branch** — `origin/staging` detection removed from all skills + the routine.

**Detection:** `/promote-production` gates on `origin/production` existing (the only skill that cares). No skill changes behavior based on branch topology otherwise — the trunk is always the default branch.

**Anti-churn hardening (folded into `@sync-config`):** to stop a branch-gap or regeneration from ever manifesting as a noise PR again — (a) formatting-only hunks (whitespace, indentation, tabs/spaces, table-separator padding) are dropped before classification; (b) real applies are transcribed verbatim, never paraphrased; (c) a post-apply no-op guard reverts and stages nothing if the whitespace-ignored diff is empty; (d) PR/report tables are derived from the actual staged diff, not from intended changes.

**Migration:** schema bump v3 → v4 (skill rename + branch-convention change). Per-project: rename `/promote-staging` → `/promote-production`, and for any project on the old staging-flow, promote `staging` content onto `main`, cut `production` off it, repoint the host's production branch, and delete `staging`. See `docs/SCHEMA_VERSIONS.md` § v3 → v4. Single-branch projects (no staging) are behaviorally unchanged — they already worked on `main`; they only pick up the skill rename.

**Tradeoff:** `main` now receives every WIP commit, so on deployable projects the host's production branch **must** be repointed from `main` to `production` before `main` starts taking active work — otherwise WIP auto-deploys to prod. This is the one manual, host-side step the migration can't automate. Acceptable: it's a one-time per-deployable-project action, and it's exactly the trunk-based-development + release-branch pattern most teams already use.

**Alternatives considered:** Make the sync resolve and target the active branch per-repo (rejected — keeps the non-default-active inversion and needs per-repo config; treats the symptom, not the cause). Keep `/promote-staging`'s name and only change its internals (rejected — the name would lie about what it does). Stay at schema v3 and let the rename flow unmanaged (rejected — a renamed skill pulled without migration leaves the old `/promote-staging` orphaned in projects).

---

## DEC-023: Permission policy — default-allow with a deny guardrail; master in seeds, distributed by hand (resolves DEC-020)
**Decision:** The Claude Code permission posture is **default-allow**: `allow` carries `Bash(*)` (plus `Read`/`Edit`/`Write`/`Glob`/`Grep`), and a **deny list is the only seatbelt**. `deny` beats `allow`, so destructive/secret commands are blocked and everything else runs without prompting. The canonical "master" lives at `dev/claude/settings.json` in seeds. It is **NOT auto-synced** by `@sync-config`/the Routine — it's distributed by hand (see procedure in seeds `README.md` § Permission settings).

**Why default-allow:** the operator isn't reading long concatenated shell commands and wouldn't action them anyway, so a gated allow-list just produces prompts that get rubber-stamped — security theater. Flipping to `Bash(*)` + a solid deny list removes the noise and concentrates the protection where it's read: the deny list. (Use `defaultMode: default`, NOT `bypassPermissions` — bypass would disable the deny list too.)

**The deny list is therefore load-bearing** and a bit hardened beyond the obvious: destructive git (`push --force`/`-f`, `reset --hard`, `clean -f`, `branch -D`), `rm -rf` of dangerous roots + `.git*`, `dd`, `mkfs*`, `truncate`, recursive/`777` chmod, redirects to `/dev/*` (best-effort — CC's matcher is unreliable on redirections), all `sudo`, network-exfil (`curl`/`wget`/`nc`), and reads of `.env` secrets / `.envrc` / `.ssh/**` / private keys.

**Precedence gotcha (Claude Code):** `deny` beats `allow` — once denied you cannot re-allow a subset. So the `.env` deny is **enumerated** (`.env`, `.env.local`, `.env.*.local`, `.env.{development,production,preview,staging,test}`, `.envrc`) not a blanket `Read(**/.env.*)`, so `.env.example`/`.env.sample` stay readable. Trade-off: a novel `.env.<custom>` secret name isn't caught — add it explicitly.

**Distribution — master → machines (the real model):**
- **Real machines (windows laptop, mill-dev, bee-grace — distinct boxes):** copy the master into each machine's **user-global** `~/.claude/settings.json` (Windows: `%USERPROFILE%\.claude\settings.json`). One global file = every repo + every ad-hoc dir on that box. Globals don't travel via git; set once per machine.
- **Phone (CC on web — ephemeral container):** no editable global. Covered only by the **committed per-repo `.claude/settings.json`** (cloned with the repo). Reminder lives in the README: before a code-heavy phone session, confirm that repo's committed file matches the master.

**Updating the allowlist:** not self-service. The recurring trigger is never a simple missing command (default-allow covers those) — it's something gnarly that got denied. Procedure: bring it to a Claude session in seeds, which edits the master + emits the redistribute steps. No `/permissions` muscle-memory to maintain.

**`.claude/settings.local.json`** (per-machine, gitignored) is never templated, synced, or edited by skills — the user's per-box override surface. Under default-allow most accumulated local "always-allow" entries become redundant; a cleanup prompt lives in the README (preserves any personal `deny`, strips redundant/stale allows).

**Schema:** additive within v4 — no skill requires the settings file. No version bump.

**Alternatives considered:** gated allow-list of specific tools (rejected — produces rubber-stamped prompts; the operator doesn't read the commands). `bypassPermissions` mode (rejected — disables the deny list, the one thing we rely on). Auto-merge settings into `@sync-config` (rejected — security guardrails shouldn't be bot-edited; and default-allow makes per-repo allow churn rare anyway). Blanket `Read(**/.env.*)` deny (rejected — blocks `.env.example`, deny can't be carved back).

## DEC-024: Retire the dev/review time split — active time is the single velocity (supersedes DEC-015, amends DEC-013)
**Decision:** `/retro` no longer computes `dev_time` / `review_time`. The one velocity is **active = wall_clock − breaks** (breaks inferred from the transcript JSONL, gaps > 15 min) divided by points. The per-PR dev/review window math (DEC-015) and the single-seam model before it (DEC-013) are removed from the skill. No PR timestamps are fetched for time math.

**Why:** the split was never trustworthy — every bushel retro since Phase 3 footnoted it "do not trust as headline" and forecast on active anyway. The DEC-015 per-PR model assumed each PR merged before the next opened; the actual workflow opens PRs in a burst and merges them whenever (DEC-022 + CLAUDE.md "merge PRs whenever — order doesn't matter"), so the dev-window anchor (`PR_{i-1}.mergedAt`) routinely lands *after* `PR_i.createdAt` and clamps every dev window after the first to zero, while the overlapping review windows get summed past wall-clock. Reproduced on bushel Session 25 (4 PRs): `dev_time` = 0.06 h/pt and `review_time` = 26.8h inside a 9.2h session — physically impossible. A real correctness bug, not tuning: the spec is internally consistent but built on a merge-ordering assumption the workflow contradicts by design.

**Why not fix the split instead:** correctly attributing per-task time would require reconstructing keystroke spans from the transcript — which is exactly what `active = wall − breaks` already approximates. Two disclaimed numbers and one trusted one collapse to the one that was always the headline.

**What changes:**
- `/retro` Step 2: removed the PR-timestamp fetch + per-PR window math; new Step 2.4 = `active = max(0, wall_clock − breaks)`. Steps 2.5 / 3 / 4 / 6 / 7 / 8 / 10 + Notes updated. RETROSPECTIVES.md + PROJECT_PLAN.md velocity tables: `Dev` / `Review` columns → `Breaks` / `Active`; a single `h/pt (active)` velocity.
- `VELOCITY_AND_POKER_GUIDE.md`: Parts 1 + 3 rewritten — retro-computed, nothing to log, active h/pt, `Σactive ÷ Σpoints` (never the average of per-phase ratios), pointing-consistency named as the real risk.
- New standalone extractor `dev/claude/scripts/velocity.py` — reads each repo's RETROSPECTIVES.md and prints lifetime active h/pt, per-phase, per-session spread; cross-repo via args; `--issues` for a `points:N` histogram. Denominator = session-table points, not issue-label sums (those count moved/cut issues).

**Historical retros stay as written.** Phase retros through Phase 7 keep their `Dev` / `Review` columns — method artifacts, flagged in the retro Notes and skipped by the extractor. Phases predating active time (0–2) carry only a legacy `Velocity: X hrs/pt` and are excluded from any active rollup — a different metric, never blended.

**Schema:** additive within v4 — session frontmatter is unchanged (`/its-dead` already writes no time fields). No version bump.

**Alternatives considered:** keep DEC-015 and footnote it forever (rejected — a permanently-disclaimed metric is just noise; the footnotes already proved nobody trusts it). Repair the windows by unioning overlaps + per-task transcript attribution (rejected — large effort to reconstruct what active already captures). Keep `wall/pt` as a second velocity (rejected — inflated by overnight gaps; one honest number beats two).
