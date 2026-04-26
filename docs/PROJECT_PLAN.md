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
| 2 | Update seeds root `CLAUDE.md` setup instructions — step 5 switches from `~/.claude/skills/` (global) to `<project>/.claude/skills/` (project-level). Add Key Docs table pointing at `docs/`. | 2 | [ ] | |
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

**Total: 48 pts**

**Next session priority:** Task 2 (CLAUDE.md setup instructions, 2 pts) → Session 3 code-review fixes → Task 7 (/pull-seeds skill, 5 pts) → Task 6 (Routine build, 8 pts).

---

## Velocity Table

| Work batch | Actual Hours | Effort Points | Hrs/Pt | Notes |
|-----------|-------------|---------------|--------|-------|
| — | — | — | — | |

**Lifetime velocity:** — hrs/pt

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
