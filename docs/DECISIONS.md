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
**Decision:** Sync runs unattended nightly via a single Anthropic Routine (`dev/claude/routines/nightly-sync.md`) that handles BOTH directions per repo. The Routine reads `.claude/routine-config.yaml` for filter rules + direction config, enumerates the repos its MCP github session has access to (the **Routine form's repo chip area on claude.ai is the active-set source of truth**), filters by `exclude:` + `require:` + `.claude/seeds-version` presence and version match, and per (repo × direction) invokes `@sync-config` in `mode: auto`. Each invocation that produces non-empty changes opens its own PR — upstream PRs into `mobiustripper42/seeds:main`, downstream PRs into the project's default branch (or `staging` when present, DEC-008). Nothing merges automatically; the PR is the human-review checkpoint.

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
