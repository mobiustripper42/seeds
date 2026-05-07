---
session: 20
dev: eric
slug: next-task-isrrg
branch: claude/next-task-ISRrG
started: 2026-05-07T02:11:40Z
ended: 2026-05-07T11:18:44Z
duration: 9.08
points: 10
status: closed
transcript: /root/.claude/projects/-home-user-seeds/f85d0233-7bb8-4e9b-b5e4-11f414189b2e.jsonl
---

# Session 20 — next-task-isrrg

**Task:** Tasks 5 + 6 — stand up the bi-directional nightly sync Routine. Define the repo-list config format (Task 5, 2 pts), build the Routine prompt + auto-mode `@sync-config` (Task 6, 8 pts).

**Completed:**
- **Routine config (bbb8a4d, refined 1cc1f73):** new `.claude/routine-config.yaml` (auto-discover by org scan, exclude list, `require:` filter block, per-direction PR/branch prefixes). YAML chosen over JSON/plain-text — comments + nested keys.
- **`@sync-config` auto mode (bbb8a4d, 1cc1f73):** added `mode: auto | interactive` parameter. Auto mode applies all backports/forward-ports without prompting, defaults-to-skip on ambiguity, never acts on pattern flags. Pinned literal commit-message formats (`sync-config: push backport from <repo>` / `sync-config: pull propagate from seeds`). Template + live mirrored byte-identical.
- **Routine prompt (bbb8a4d, 1cc1f73):** new `dev/claude/routines/nightly-sync.md` — clones seeds, reads config, lists `<org>/*` repos, filters by `.claude/seeds-version`, schema-version gates per-repo with split `## Project lagging` / `## Seeds lagging` backlog sections, runs `[upstream, downstream]` outer loop with explicit per-repo error handling, opens per-(repo × direction) PRs. Downstream PRs target `origin/staging` when present (DEC-008).
- **Routines README (bbb8a4d, 1cc1f73):** `dev/claude/routines/README.md` — deployment + update guide. Calls out the manual re-paste step for prompt drift between canonical file and deployed Routine.
- **DEC-010 (bbb8a4d, 1cc1f73):** captures bi-directional Routine, supersedes DEC-004's upstream-only stance, resolves two prior DEC-TBDs (Routines GitHub access model, repo list format), notes the canonical-vs-deployed drift tradeoff and the O(repos-in-org) scaling boundary.
- **`CLAUDE.md` (bbb8a4d, 1cc1f73):** new "The Routine" section + repo layout entry.
- **PROJECT_PLAN (bbb8a4d, 1cc1f73):** Tasks 5 + 6 marked `[x]`. Task 4 row stale `DEC-006` reference fixed to `DEC-010`. Next-session priority rewritten.
- **Code-review fold-in (1cc1f73):** 8 OBSERVATIONs + 4 NITs from `@code-review` all addressed. No BLOCKERs.
- **PR #11:** https://github.com/mobiustripper42/seeds/pull/11 — base `main`, awaiting merge.

**In Progress:** Nothing — PR #11 is the close-out.

**Blocked:** Nothing in code. The Routine itself is blocked on a manual deploy step (paste prompt into claude.ai `/web-setup` UI) — can't be automated, that's the user's call post-merge.

**Next Steps:**
1. Merge PR #11. Patch bump skipped (seeds has no `package.json` — DEC-007 detection).
2. **Deploy the Routine on claude.ai:** `/web-setup` flow → create `seeds nightly sync` → paste `dev/claude/routines/nightly-sync.md` body → grant `mobiustripper42` org OAuth → set nightly schedule.
3. After first nightly fire: check `mobiustripper42/seeds` issues for `routine: last run <DATE>` and `routine: migration backlog` (sailbook should appear under `## Project lagging` until Task 18 lands).
4. **Task 18** (sailbook V2→V3 migration, 5 pts) is now the gating item to get sailbook out of the migration backlog. Bushel reportedly already on V3 (per user) — verify and shrink/close Task 24 next session.
5. Long-deferred: Task 8 (nightly-sync.sh fate) revisits after the Routine has run a couple weeks.

**Context:**
- The local `scripts/nightly-sync.sh` prototype (lines 87-114 specifically) was the design template for `mode: auto` — the override block lifted almost verbatim into the formal agent contract. Task 8's "what to do with the local script" is now squarely about whether the offline path still earns its keep, not about what it implements.
- `gh` CLI is not installed in the CC web sandbox — used `mcp__github__list_pull_requests` and `mcp__github__create_pull_request` for /kill-this Step 4. The skill's Method 1/2/3 fallback ladder worked as designed. Worth flagging that CC web sessions essentially always need Method 2 (MCP) — `gh` is never present.
- `git diff main..HEAD` showed dozens of unrelated files because the local `main` was stale relative to `origin/main` (no `git pull` since session start on a fresh CC web checkout). Fix: `git fetch origin main && git diff --name-only origin/main..HEAD` for the accurate scope. Worth adding a one-liner to `/kill-this` Step 4 — currently it says `git diff --name-only $BASE..HEAD` which silently uses the stale local ref.
- Auto-mode "default to skip on ambiguity" inversion vs interactive mode is load-bearing. In interactive, the agent asks; in auto, the agent can't, so it defaults conservative. The PR is the safety net — over-skipping is recoverable next run, over-backporting pollutes the template. DEC-010 captures this; the agent file states it explicitly in the auto-mode contract.
- Downstream-targets-staging detection happens per-project at PR-open time (each project gets its own `git ls-remote --heads origin staging`), not from the Routine config. This means a project flipping to staging-flow mid-cycle automatically picks up the new base on the next run — no Routine-config edit needed. Same DEC-008 detection pattern the skills already use.
- Manual deploy step is the only gap between code-merged and Routine-running. There's no automated push of `nightly-sync.md` body → claude.ai because Anthropic doesn't expose Routine config via API (per Task 4 / DEC-010). Drift between canonical and deployed is a real failure mode; the README calls it out but can't prevent it. Worth a future skill (`/sync-routine-prompt`?) to at least diff the canonical body against a clipboard-pasted snapshot.
- Duration recorded raw (9.08h) per user — wall-clock from session start to last commit. Actual focused effort was a fraction of that; the session spanned multiple discussion → implementation passes with idle gaps.

**Code Review:** No BLOCKERs. 8 OBSERVATIONs + 4 NITs all folded in via `1cc1f73`. Findings: staging-flow downstream-base gap (would have hit sailbook the moment it joined V3), loop-ordering ambiguity (prose-only, now load-bearing), per-repo error handling missing in Step 3, migration-backlog conflation between project-lagging and seeds-lagging cases, ambiguous `<direction>` placeholder in commit-message format, `has_default_branch` vs `has_commits_on_default_branch` definition mismatch, scaling-boundary note for DEC-010, two stale DEC-006 cross-references (README + PROJECT_PLAN Task 4 row), CLAUDE.md "The Routine" truncated description, README `/web-setup` URL-vs-skill phrasing, re-trigger one-liner shy of explaining daily-cap blast radius. All addressed.
