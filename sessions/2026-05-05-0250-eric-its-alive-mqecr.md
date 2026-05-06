---
session: 17
dev: eric
slug: its-alive-mqecr
branch: claude/its-alive-MqecR
started: 2026-05-05T02:50:33Z
ended: 2026-05-06T02:20:07Z
duration: 3.5
points: 8
status: closed
transcript: /root/.claude/projects/-home-user-seeds/ac240c67-dce3-46d6-b186-d75cc9754f7f.jsonl
---

# Session 17 — its-alive-mqecr

**Task:** Tasks 20 + 21 paired — project semver workflow (DEC-007) + staging-flow conventions (DEC-008). Adjacent fix: `/its-alive` auto-branch handling for CC Desktop/web/mobile.

**Completed:**
- **Task 20 (5 pts) — project semver workflow (DEC-007):**
  - `/its-dead` Step 5.3: patch bump on STATE=MERGED for dev projects (`package.json` exists). CHANGELOG.md entry from PR title. Tag on main only.
  - `/retro` Step 6.5: minor bump at phase close. CHANGELOG entry references the phase. Tag on main only.
  - `/bump-major`: new manual skill for breaking changes. Captures rationale, writes BREAKING entry, conditional tag.
  - `dev/claude/templates/VersionTag.tsx`: build-time component reading `NEXT_PUBLIC_APP_VERSION` + `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`. Requires one-time `next.config.js` setup forwarding `npm_package_version` (B2 fix — without `NEXT_PUBLIC_` prefix, Next.js silently renders `v0.0.0` in client trees).
  - DEC-007 records the contract; `package.json` detection limitation acknowledged (will need generalizing for non-node dev projects).
- **Task 21 (3 pts) — staging-flow conventions (DEC-008):**
  - `/kill-this`: PR base resolves to `staging` if `git show-ref --verify --quiet refs/remotes/origin/staging` succeeds, else `main`.
  - `/its-dead`: working-branch resolution + Step 5.2 STATE=MERGED block honor `$WORKING_BRANCH`. Patch bump targets the correct branch.
  - `/promote-staging`: new skill — ff-merge `staging` → `main`, tag with current `package.json` version, push. Refuses on diverged main, on staging==main, or on missing `package.json`.
  - DEC-008 records the ff-not-PR choice (no second reviewer in solo flow).
- **Adjacent fix — `/its-alive`:** `claude/*` CC Desktop/web/mobile auto-branches now accepted as workspace (was: silently switched to main, breaking the platform's pre-cut branch — observed at this session's start). Stale DEC-005 reference cleaned ("seeds/solo on main" was incorrect post-DEC-005 update).
- **Schema bump:** `seeds-version` 2 → 3. `docs/SCHEMA_VERSIONS.md` V3 entry + complete v2→v3 migration notes (additive — no data migration required).
- **Code review pass:** `@code-review` surfaced 2 BLOCKERs and 10 NITs against `545996b`. BLOCKERs B1 (`/promote-staging` detection drift) + B2 (VersionTag client-tree footgun) fixed in `3c0b7ec`. NITs N1 (CHANGELOG header guard), N2 (`npm pkg get` for version extraction), N6 (stale AGENTS.md skill count) folded in. NITs N3/N4/N5/N7/N8/N9 deferred — cosmetic or niche edge cases.
- **PR merged:** https://github.com/mobiustripper42/seeds/pull/7

**In Progress:** Nothing.

**Blocked:** Nothing.

**Next Steps:**
1. New session (sailbook): **Task 18** (5 pts) — V2 migration. Pre-req for Task 22.
2. New session (sailbook): **Tasks 22 + 23 paired** (6 pts) — `/pull-seeds` to bring 20+21 into sailbook; wire `<VersionTag />` to login + footer (test the B2 fix in a real client tree); seed CHANGELOG.md from existing v1.0.0 baseline; install `safe-supabase.sh` wrapper.
3. Long-term: when first non-node dev project lands, generalize the `package.json`-only dev-project detector (DEC-007 acknowledges this).

**Context:**
- This session: **8 pts shipped** (20 + 21), **0 partial**, BLOCKERs fixed live before merge.
- The `/its-alive` fix was discovered in real-time — this session itself was started on a `claude/*` branch and the user observed the wrong "switch to main" behavior in the previous protocol. Fix landed in the same session that exposed it.
- B2 (VersionTag client-tree footgun) is a Next.js gotcha worth flagging: `process.env.X` is only inlined into the client bundle when `X` starts with `NEXT_PUBLIC_`. Without the prefix, server components see the value and client components see `undefined`. Easy to test wrong because login screens are typically server-rendered.
- Staging detection uses local-cache `git show-ref` rather than `git ls-remote` so skills work offline. `/its-alive` already fetches at session start, so the cache is fresh by the time later skills check it.
- Tag-only-on-main rule is uniformly applied across `/its-dead`, `/retro`, `/bump-major`. Bumps on `staging` are untagged; tag arrives via `/promote-staging`.
- Cheatsheet now 59 lines (was 53, target 50). Still likely fits one printed page in mono.
- `/promote-staging` Step 0 still uses `git ls-remote` for the **initial existence gate** (it's a hard prerequisite — no remote means nothing to promote). The other four skills use local-cache `git show-ref`. *Correction post-B1 fix:* `/promote-staging` Step 0 now also uses `git show-ref --verify --quiet refs/remotes/origin/staging` for consistency. Step 1 fetches to refresh the cache, so a stale local view that misses a freshly-created staging is recovered after the user re-runs.
- Pre-existing cosmetic: `docs/PROJECT_PLAN.md` line 37 still has the stray blank line splitting the task table visually. Not introduced this session, didn't fix.
- Wall clock 23.5h (session opened 02:50 UTC 5/5, finalized 02:20 UTC 5/6). Adjusted -20h for time away from desk → effective 3.5h active work.

**Code Review:** 2 BLOCKERs, 10 NITs. BLOCKERs both addressed in commit `3c0b7ec`. 3 NITs folded in (N1, N2, N6). 6 NITs deferred as cosmetic/niche edge cases. Full output in PR #7 body.
