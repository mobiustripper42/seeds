# seeds — Project Plan

**Start date:** 2026-04-22
**Focus:** Cross-device skill sync via sync-config tooling.
**Critical path:** Upstream Routine + downstream `/pull-seeds` both functional across laptop, headless Ubuntu, and Android.

---

## Estimation Method

Fibonacci scale (2, 3, 5, 8, 13). See `VELOCITY_AND_POKER_GUIDE.md`.
All estimates from planning poker between user and Claude.
No phases — flat task list. Tests baked into each estimate.

**Velocity baseline:** Not yet established.

---

## Tasks

| # | Task | Effort | Status | Notes |
|---|------|--------|--------|-------|
| 1 | De-hardcode skill templates in `dev/claude/skills/` — rewrite the 6 skills (its-alive, pause-this, restart-this, kill-this, its-dead, sync-config) to delegate project-specific commands to `CLAUDE.md §Commands` instead of assuming `npm run build` etc. | 5 | [x] | <!-- completed 2026-04-26 --> Audited all 6 skills. Real changes: kill-this Step 1 (test-suite y/n → verification recap, advisory + non-blocking), kill-this Step 2 + pause-this Step 1 (npm run build → CLAUDE.md §Commands lookup, skip silently if none), its-alive Step 5 ("current phase" → "unchecked tasks"). its-dead, restart-this, sync-config already project-agnostic — no changes needed. 6 file edits across 3 skills × 2 locations. |
| 2 | Update seeds root `CLAUDE.md` setup instructions — step 5 switches from `~/.claude/skills/` (global) to `<project>/.claude/skills/` (project-level). Add Key Docs table pointing at `docs/`. | 2 | [x] | <!-- completed 2026-04-30 --> Code review found 4 more files still referencing old path — fix in follow-up. |
| 3 | Delete `mobile-test` probe skill from seeds `.claude/skills/` | 2 | [x] | <!-- completed 2026-04-25 --> Removed `.claude/skills/mobile-test/` directory. Probe served its purpose. |
| 4 | Research: verify Anthropic Routines can (a) access N private GitHub repos and (b) open a PR to one of them. | 3 | [x] | <!-- completed 2026-04-26 --> Confirmed viable: multi-repo OAuth via /web-setup, PRs to claude/<slug> branches, Pro=5 runs/day. DEC-006 captured. |
| 5 | Define fixed repo list format for the Routine to scan — where it lives in seeds, what format (JSON / YAML / plain text) | 2 | [ ] | Depends on 4 (Routine may dictate format). |
| 6 | Build remote Routine for nightly upstream sync — invokes `@sync-config` classifier per repo, opens one stacked PR to seeds | 8 | [ ] | Depends on 4, 5. |
| 7 | Build `/pull-seeds` downstream skill — manual trigger inside a project, uses `@sync-config` in reverse direction | 5 | [ ] | Depends on 1 (clean skill templates needed). |
| 8 | Decide fate of `scripts/nightly-sync.sh` — supersede with remote Routine, keep as local-only alternative, or retire | 3 | [ ] | Depends on 6 being working. |
| 9 | Migrate personal projects to project-level skills — install de-hardcoded skills into each active project's `<project>/.claude/skills/`, verify | 5 | [ ] | Depends on 1. Covers laptop, headless Ubuntu, and at least one repo to test on Android. |
| 10 | Discuss + decide: how the auto-created `claude/<task-slug>` feature branches affect the seeds workflow. | 3 | [x] | <!-- completed 2026-04-24 --> Decided DEC-005: always on main while solo, per-session branches when team grows. |
| 11 | Implement DEC-005 in skills — `/its-alive` Step 0: switch to main + pull before opening session entry. `/its-dead` Step 5: merge non-main working branch into main, delete, push. Touches both `dev/claude/skills/` templates and seeds' own `.claude/skills/` copies (4 files). | 3 | [x] | <!-- completed 2026-04-24 --> Step 0 added to its-alive (4 files), Step 5 added to its-dead (4 files). Takes effect next session — /its-dead Step 5 will auto-clean the current feature branch when Session 5 closes. |
| 12 | Fix DEC-005 implementation bugs surfaced by code review + Session 5 live failure — 6 issues across `/its-alive` Step 0/3 and `/its-dead` Step 5: (1) missing-local-main guard, (2) diverged-main remediation, (3) Step 5 ordering vs commit/push, (4) Step 5 dirty-tree guard, (5) Step 5 remote-delete failure should leave orphan-branch TODO note, (6) `/its-alive` should auto-commit the session-open marker so the stop hook stops firing every session start. | 5 | [x] | <!-- completed 2026-04-25 --> All 6 findings addressed across 4 files. /its-alive Step 0 now handles missing-local-main + diverged-main with user prompt. Step 3 auto-commits + pushes the open marker. /its-dead Step 3 no longer pushes; Step 5 has dirty-tree guard, missing-local-main guard, single push at end, orphan-branch note via commit --amend when remote delete fails. |
| 13 | `/kill-this` push behavior — currently commits but doesn't push, so stop hook fires between `/kill-this` and `/its-dead`. Two options: (a) add `git push origin main` to `/kill-this` Step 3 (2 pushes per session), or (b) live with the hook firing once between halves. Decision + implementation. | 2 | [x] | <!-- completed 2026-04-26 --> Chose (a). /kill-this Step 3 now pushes unconditionally after the commit step (no-op if nothing new). Catches any unpushed earlier commits too. Applied to both kill-this skill files; verified byte-identical. |
| 14 | PR-flow support in `/kill-this` + `/its-dead` — branch detection in kill-this Step 3 (main → DEC-005 push; task/* → gh pr create); PR state detection in its-dead Step 5 (OPEN → push to branch + stop; MERGED → FF-merge cleanup; CLOSED → STOP + ask; no PR → FF-merge cleanup). Fix 2 code review bugs (CLOSED fall-through, literal placeholders). 4 files × 2 skills. | 3 | [x] | <!-- completed 2026-04-30 --> |

| 15 | Build `/read-the-tape` skill + `@tape-reader` agent — 10 known anti-patterns, self-improving candidate discovery, PR flow | 5 | [x] | <!-- completed 2026-05-02 --> Templates in dev/claude/, installed in seeds + sailbook. |
| 16 | Project management workflow rework — per-session files (`sessions/YYYY-MM-DD-HHMM-<dev>-<slug>.md`), `~/.claude/devname` for dev identity, hybrid Issues + PROJECT_PLAN.md model, new `/start-phase` and `/retro` skills, `/read-the-tape` default + Transcript field, dual-mode skill cutover. Installed in bushel as first project on the new model. | 13 | [x] | <!-- completed 2026-05-03 --> 9 SKILL.md files touched in seeds (template + installed), 2 new skills, CLAUDE.md/AGENTS.md updates, bushel `.claude/` + `docs/` + `CLAUDE.md` + DEC-023 (testing) + DEC-024 (PM workflow) installed. |
| 17 | Schema versioning for the seeds workflow — define a version field for PROJECT_PLAN.md / session-file format / skill API; cut a migration path so `/pull-seeds` into older projects (sailbook still on monolithic session-log.md) works without breaking. Pre-req before next `/pull-seeds`. | 5 | [ ] | New. Surfaced during Session 15. Without this, downstream installs of the new skills will silently corrupt projects still on the old conventions. |
| 18 | Migrate sailbook to new PM workflow — copy seeds template forward, archive `session-log.md`, install per-session files + phase rituals, materialize current sailbook phase as Issues. | 5 | [ ] | Depends on Task 17 (versioning + migration path). |
| 19 | Fix `/kill-this` + `/its-dead` — PR-state check robustness. (a) Hoist the PR state lookup to its own gating sub-step that returns an explicit `STATE` variable; make every downstream branch (OPEN / MERGED / CLOSED / NO_PR) reference `STATE` so silent skip-and-default-to-OPEN can't recur. (b) Add explicit `gh`-unavailable fallback: try MCP github tools (`mcp__github__pull_request_read`, `mcp__github__list_pull_requests`, `mcp__github__create_pull_request`); if neither is present, STOP and ask the user. Never default silently. 4 files: kill-this template + installed, its-dead template + installed. | 2 | [ ] | Surfaced Session 15 — user merged PR#5 between `/kill-this` and `/its-dead`; my `/its-dead` skipped the PR-state check and pushed the session-log finalize commit to the merged-and-orphaned branch instead of main. Required a manual cherry-pick to recover. Same shape of bug applies to `/kill-this` Step 4 PR creation when `gh` is unavailable on web CC. |
| 20 | Project semver workflow — dev projects only (skip seeds + domain). v1.2.3 stored in `package.json` + git tag (skip `VERSION` file). Major = manual via `/bump-major` skill. Minor = bumped by `/retro` on phase close (initial trigger; later `/promote-staging` for projects with staging). Patch = bumped by `/its-dead` on every PR merge to the working branch (or `/ship-it` once that exists). Auto-write CHANGELOG.md entry from PR title on each bump. Build-time `<VersionTag />` component pattern in `dev/claude/` template — reads `process.env.npm_package_version` + `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`, renders e.g. "v1.2.43 (a1b2c3)" for login-screen / footer display. | 5 | [ ] | New. Surfaced Session 16. Vercel-displayed version is the highest-priority surface — user wants it on the login screen. Touches `/its-dead`, `/retro`, new `/bump-major` skill, template `<VersionTag />`, `dev/claude/CLAUDE.md` setup steps. Skip seeds + domain — they aren't deployable. |
| 21 | Staging-flow conventions in skills — when a project has a `staging` branch, `/kill-this` PRs into `staging` (not `main`); promotion to `main` happens via new `/promote-staging` skill that ff-merges `staging` into `main`, tags the release with the bumped minor version (driven by Task 20), and pushes both. Detect staging vs no-staging via presence of `origin/staging`. Document in `dev/claude/CLAUDE.md §PR Workflow` and seeds `CLAUDE.md`. Add DEC entry recording the ff-merge-not-PR choice (no review benefit when solo, less ceremony). | 3 | [ ] | New. Surfaced Session 16 alongside Task 20. Sailbook adopting staging is the forcing function. Must land before Task 22 propagates the convention into sailbook. |
| 22 | Propagate semver + staging flow into sailbook — run `/pull-seeds` (after Task 20 + 21 land in seeds) to bring `<VersionTag />` template, semver-aware `/its-dead` + `/retro`, and `/promote-staging` skill into sailbook. Wire `<VersionTag />` into the login screen + a footer. Add CHANGELOG.md, seed it from existing v1.0.0 tag forward. Update sailbook `CLAUDE.md` to document the new flow (PRs target staging, promotion via `/promote-staging`). Verify Vercel staging environment is wired (user-side prerequisite). | 3 | [ ] | New. Surfaced Session 16. Depends on Tasks 20, 21, 18 (sailbook V2 migration). The staging branch already exists at `origin/staging` (Session 16). |

**Total: 92 pts** (delivered through Task 16: 69 pts; remaining: Tasks 5, 6, 7, 8, 9, 17, 18, 19, 20, 21, 22 — pending /its-dead reconciliation for 7 + 17 + 19 closing this session)

**Next session priority:** Tasks 20 + 21 (8 pts combined) — semver workflow + staging-flow conventions, designed and built together since they're entangled. Then Task 18 (sailbook V2 migration, 5 pts) before Task 22 propagates the new flow into sailbook. Tasks 5, 6, 8, 9 stay deferred (Routine-flow work).

---

## Velocity Table

| Work batch | Actual Hours | Effort Points | Hrs/Pt | Notes |
|-----------|-------------|---------------|--------|-------|
| Session 5 (tasks 10, 11) | 0.75 | 6 | 0.125 | Focused work only; 0.5h recovery excluded |
| Session 6 (tasks 12, 3) | 1.00 | 7 | 0.143 | ~1 hr focused |
| Session 7 (tasks 13, 1, 4) | — | 10 | — | Wall clock 8h20m idle-heavy; not representative |

**Lifetime velocity (clean sessions 5+6):** ~0.13 hrs/pt (edit/decision tasks; build tasks likely run higher)

---

## Estimation Poker — Standing Disagreements

| Task | Claude says | You say | Question |
|------|------------|---------|----------|
| — | — | — | — |

---

## Cuttable Tasks (if behind)

| Task | Why it's cuttable | Defer to |
|------|------------------|----------|
| 8 | Keeping both local script + Routine is fine short-term | Later |
| 9 | Can migrate projects opportunistically as they're touched | Rolling |
