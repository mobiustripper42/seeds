# seeds — Session Log

Session summaries for continuity across work sessions.
Format: prepend newest entry at the top.

---

## Session 13 — 2026-05-01 20:58–23:07 (2h 10m)
**Duration:** 2h 10m | **Points:** 0 (no tracked tasks — workflow analysis)
**Task:** Session JSONL transfer + workflow analysis; session capture tooling

**Completed:**
- Analyzed sailbook Session 118 JSONL for efficiency and workflow correctness
- Identified 5 high-impact improvement targets (PROJECT_PLAN read waste, branch-switch re-reads,
  form scope heuristic, Playwright debug path, merge-order warning)
- Established JSONL-via-git-repo transfer pattern for Ubuntu → Windows
- Confirmed Docker Supabase makes concurrent worktrees feasible (separate instances per worktree)
- Added two memory files: fewer-questions feedback, workflow refinement pattern

**In Progress:** Nothing.

**Blocked:** Task 7 (/pull-seeds) — still waiting on thoughts re: diff direction problem.

**Next Steps:**
1. Open new session with both sailbook + seeds loaded:
   `claude --add-dir C:\Users\eric\OneDrive\Documents\GitHub\sailbook`
2. Use Session 118 findings to update seeds skill templates:
   - its-alive/its-dead: grep PROJECT_PLAN.md instead of full read
   - kill-this: read files after branch switch, not before
   - kill-this: add merge-order warning when multiple PRs share files
3. Task 7 (/pull-seeds, 5 pts) when ready

**Context:**
- Script capture on Ubuntu: `script -q ~/sessions/sailbook-$(date +%Y%m%d).log` before `claude`
- JSONL transfer: copy to sailbook repo, push, pull on Windows, I can Read directly
- seeds has no build step — markdown only
- /kill-this naming: user noted it's hard to find in CC Desktop — consider alias or rename
- Next session: load both repos with `claude --add-dir <sailbook-path>` from seeds dir

**Code Review:** Skipped — seeds is docs/templates only, session was analysis work.

---

## Session 12 — 2026-05-01 (~3h 00m)
**Duration:** 3h 00m | **Points:** 0 (workflow improvements — no tracked tasks)
**Task:** Skill polish — PM strip, worktree support, kill-this restructure, misc bug fixes

**Completed:**
- Stripped PM step from `/its-dead` (seeds + sailbook) — run `/pm` manually when wanted
- Added branch-cut reminder to `/its-alive` Step 6 briefing (seeds + sailbook)
- Fixed `/its-alive` Step 2 — scan for highest session N to handle concurrent sessions correctly
- Added worktree support to `/its-alive` Step 0 + `/its-dead` Step 4 — detects `/worktrees/` in git-dir, skips main-enforcement and FF-merge in linked worktrees; provides `git worktree remove` cleanup command
- Fixed `/its-dead` Step 4d — `git branch -d` only (never `-D`), surface denial instead of retrying
- Required test plan section in `/kill-this` PR body (all 3 copies)
- Restructured `/kill-this` — new order: commit → push branch → code review → open PR with findings in body → draft log. Added `Agent` to tools frontmatter.
- Removed PostToolUse code-review hook from sailbook `settings.json` — was firing 16-min agent on every commit; hook + kill-this = double review
- Synced all changes to sailbook installed copies throughout session; pushed to both remotes

**In Progress:** Nothing.

**Blocked:** Task 7 (`/pull-seeds`) — pinned pending user writing up thoughts on the diff direction problem.

**Next Steps:**
1. Pull on sailbook server — gets all today's skill updates
2. Worktree smoke test: `git worktree add ../sailbook-wt-test -b task/wt-test`, open CC there, run `/its-alive` (confirm "Linked worktree"), `/kill-this`, `/its-dead`, clean up
3. Task 7 (`/pull-seeds`, 5 pts) — when user has written up thoughts
4. `/sync-config` from sailbook — pull all today's changes into sailbook's installed copies formally

**Context:**
- Worktree setup: `git worktree add ../sailbook-task-N -b task/N.M-description` before opening second CC session. Open CC in that directory. `git worktree list` shows all active worktrees.
- Worktree cleanup after merged PR: `git worktree remove <path>` from main repo
- Sailbook `settings.json` has `Bash(grep *)` + `Bash(git commit *)` added server-side — not yet in Windows local copy, comes in on next pull
- seeds has no build step — markdown-only repo, no PR needed (always on main)
- Session 12 had no /its-alive open marker — continued directly from session 11 compacted context

**Code Review:** Skipped — seeds is docs/templates only.

---

## Session 11 — 2026-04-30 17:01–20:07 (3h 05m)
**Duration:** 3h 05m | **Points:** 3 (Task 14)
**Task:** Stale-ref cleanup, permission prompt fix, sailbook sync, PR-flow implementation

**Completed:**
- Fixed remaining stale-ref items from Session 10 next steps:
  - `.claude/agents/sync-config.md` (installed copy): `~/.claude/skills/` → `.claude/skills/` (lines 16, 31), `~/seeds/` → `<seeds>/` throughout
  - `dev/claude/agents/sync-config.md`: `~/seeds/` → `<seeds>/` (8 occurrences)
  - `scripts/nightly-sync.sh:92`: `~/.claude/skills,` → `.claude/skills,`
- Created `.claude/settings.json` with full permissions allowlist — stops CC from prompting for Read/Edit/Write/Glob/Grep/Bash(git *)/Bash(gh *) etc. Includes deny list for destructive git commands. Root cause was empty `{}` project settings overriding global allowlist.
- Synced sailbook to current seeds templates (3 commits pushed to sailbook origin main):
  - All 5 session skills updated (its-alive, pause-this, restart-this, kill-this, its-dead)
  - Added sync-config agent + skill (new files)
  - Updated `docs/AGENTS.md` (spec-pointer style, 5 stale path fixes, sync-config entry)
  - Un-hardcoded pm.md "Today's Date" section
  - Fixed `docs/PROJECT_PLAN.md:45` stale path
  - Added permissions block to sailbook's `.claude/settings.json`
- Implemented Task 14 — PR-flow in `/kill-this` and `/its-dead` (4 files):
  - `/kill-this` Step 3: branch detection — on `main` push unconditionally (DEC-005); on `task/*`/`claude/<slug>` branch push + `gh pr create`; captures PR URL for log; handles `gh` failure gracefully (push-only, tell user to open PR manually)
  - `/its-dead` Step 5: PR state detection via `gh pr view --json state` — OPEN → push log commit to branch + stop (PR is merge gate); MERGED → DEC-005 FF-merge cleanup; CLOSED → STOP, ask user (never FF-merge); no PR → DEC-005 FF-merge cleanup
  - Applied to both template (`dev/claude/skills/`) and installed (`.claude/skills/`) copies
- Fixed 2 code review bugs caught in same session:
  - `its-dead` Step 5: CLOSED state was falling through to MERGED path (would FF-merge deliberately-discarded work) — fixed with explicit STOP + user prompt
  - `kill-this` Step 3: used literal `<branch>` and `<commit subject>` placeholders instead of shell variable capture instructions — fixed with explicit `BRANCH=` and `SUBJECT=` capture lines

**In Progress:** Sailbook's installed `/kill-this` and `/its-dead` are the pre-PR-flow versions (commit 203d930). Needs `/sync-config` in sailbook.

**Blocked:** Nothing.

**Next Steps:**
1. In sailbook session: `git pull` then run `/sync-config` to pull PR-flow kill-this + its-dead into sailbook's installed copies
2. Test PR-flow on sailbook: make a change on `task/X-test`, run `/kill-this` (confirm `gh pr create` fires), run `/its-dead` (confirm pushes log commit to branch + stops without merging)
3. Task 7 — build `/pull-seeds` skill (5 pts) — next seeds task
4. Consider `/ship-it` skill — referenced in its-dead Step 3 but not built (handles PR merge + post-merge migration push)

**Context:**
- Sailbook has an orphaned local branch `task/gitignore-settings-local` — remote deleted, local couldn't be deleted (deny rule). Run `git branch -d task/gitignore-settings-local` manually in sailbook.
- The `.claude/settings.json` permissions allowlist is now in both seeds and sailbook. Empty `{}` project settings was overriding global allowlist — that was the root cause of permission prompt spam.
- CLOSED PR state must NEVER trigger FF-merge — it's the "discard this work" gesture. Always STOP and ask.

**Code Review:** 2 bugs found and fixed in-session (its-dead CLOSED fall-through, kill-this literal placeholders). Clean after fixes.

---

## Session 10 — 2026-04-30 16:34–16:49 (15m)
**Duration:** 15m | **Points:** 0 (cleanup — stale-ref sweep not a tracked task)
**Task:** Stale-ref sweep — propagate skills install path change to all files

**Completed:**
- Fixed `~/.claude/skills/` → `.claude/skills/` in 4 files (10 occurrences):
  `README.md` ×2, `dev/claude/docs/AGENTS.md` ×5,
  `dev/claude/agents/sync-config.md` ×2, `dev/claude/docs/PROJECT_PLAN.md` ×1
- Opened and merged seeds PR #4

**In Progress:** Nothing.

**Blocked:** Nothing.

**Next Steps:**
1. Fix 2 remaining stale refs code review caught:
   - `.claude/agents/sync-config.md` lines 16, 31 (installed copy — missed in template sweep)
   - `scripts/nightly-sync.sh` line 92
2. Run `/sync-config` in sailbook to push all path changes over
3. Fix hardcoded `~/seeds/` paths in `dev/claude/agents/sync-config.md` (lines 14, 17, 31)
4. Task 7 — build `/pull-seeds` skill (5 pts)

**Context:**
- seeds has two copies of sync-config.md: template (`dev/claude/agents/sync-config.md`)
  and installed copy (`.claude/agents/sync-config.md`). Both need to stay in sync —
  easy to miss. Check both whenever the template changes.
- `scripts/nightly-sync.sh` is outside the markdown sweep scope; check for stale refs
  whenever CLAUDE.md conventions change.
- Sonnet 200k context vs Opus 4.7 1M — relevant for long agentic sessions.

**Code Review:** 2 findings — installed `.claude/agents/sync-config.md` and
`scripts/nightly-sync.sh` both missed the path sweep. Fix before running
`/sync-config` or automation will diff against the wrong path.

---

## Session 9 — 2026-04-30 15:15–16:23 (1h10m)
**Duration:** 1h10m | **Points:** 2 (task 2)
**Task:** Task 2 — seeds CLAUDE.md setup instructions + Key Docs table

**Completed:**
- Updated seeds root `CLAUDE.md`: skills install path global → project-level (`.claude/skills/` in project root), updated 2 matching references
- Added Key Docs table at top of `CLAUDE.md`
- Added `.claude/settings.local.json` to `.gitignore` (bonus find)
- First session running the PR workflow manually (branch → PR → merge)

**In Progress:** Nothing.

**Blocked:** Nothing.

**Next Steps:**
1. Fix code review findings from task 2 — 5 files still reference `~/.claude/skills/` (`README.md` ×2, `AGENTS.md` ×5, `sync-config.md` ×2, `PROJECT_PLAN.md` template); Key Docs table paths wrong (`dev/claude/docs/` not `docs/`)
2. Session 7 code-review fixes — `§Commands` notation, `[Project]` placeholders
3. Task 7 — build `/pull-seeds` skill (5 pts)

**Context:**
- Task 2 was scoped as 2 pts but the install-path change has a wider ripple — code review caught 4 more files needing updates. Worth fixing before task 7.
- `settings.local.json` is auto-generated by CC and should be gitignored in every project; worth checking other repos.
- PR workflow ran cleanly: branch cut after plan approval, PR opened manually in kill-this, merged by user, back to main before kill-this.

**Code Review:** 6 findings — all consistency/stale-reference issues from the install-path change not fully propagated (`README.md`, `AGENTS.md`, `sync-config.md`, `PROJECT_PLAN.md` template, Key Docs paths). No blockers to merged work but fixes needed before task 7.

---

## Session 8 — 2026-04-30 (design session, no /its-alive)
**Duration:** N/A (discussion only — no code) | **Points:** 0
**Task:** Vercel CI/PR workflow design, model selection strategy, async summer schedule planning

**Decisions made:**
- **Vercel preview PR workflow** — adopt branch-per-task + PR-per-task after sailbook V2 ships (target May 4+). Partial switch (branch+PR, immediate self-merge) is safe before then; concurrent PRs wait until post-V2.
- **Concurrent PRs** — explicitly supported for async summer schedule. Prefer 1 open, max ~3. Never two open PRs with migrations on the same table.
- **`/ship-it` skill** — new skill needed: merges approved PR, runs `supabase db push` if migration present, records ship time and wall clock. Not built yet.
- **Timing metrics** — dev time = `/its-alive` → `/kill-this`. Review time = `/kill-this` → `/ship-it`. Wall clock = `/its-alive` → `/ship-it`. Velocity uses dev time for estimation; weekly throughput (pts/week) is the headline for async schedules.
- **Model selection** — Sonnet as main CC session default (confirmed via `/model`). Opus for 8+ pt tasks or genuine blocks. Agents keep their frontmatter models. New agents default to Sonnet.
- **@pm open PR check** — added to pm.md: run `gh pr list` at session start, flag migration conflicts across open PRs, surface open PRs before recommending new work.
- **GitHub mobile** — tips captured in CLAUDE.md template under "PR Review on Mobile": use the native app, tap preview URL first, enable auto-merge, checklist PR descriptions.

**Template files updated:**
- `dev/claude/CLAUDE.md` — Micro Workflow (steps 7–8), Migration Protocol (conflict check), Session Skills table (`/ship-it` added), new Model Selection section, new PR Workflow section with mobile notes
- `dev/claude/agents/pm.md` — Responsibility 6 (open PR check), Status Format (Open PRs + dual velocity), Behavior (session-start PR scan), Velocity (dev time vs wall clock, weekly throughput)

**Next Steps (cold start):**
1. Build `/ship-it` skill — merge PR, optional migration push, record dev/wall clock times
2. Apply PR workflow to sailbook after May 4 — `/kill-this` pushes branch + opens PR
3. Task 2 — seeds CLAUDE.md setup instructions update (still pending from session 7)
4. Session 7 code-review fixes — `[Project]` placeholders in agents, `§Commands` notation tightening

---

## Session 7 — 2026-04-26 03:08–11:27 (~8h 20m wall clock)
**Duration:** ~8h 20m wall clock (idle-heavy — context compaction mid-session) | **Points:** 10 (task 13: 2, task 1: 5, task 4: 3)
**Task:** Tasks 13 + 1 + 4 — kill-this push behavior, skill de-hardcoding, Routines research

**Completed:**
- **Task 13** — `/kill-this` Step 3 now pushes unconditionally after commit (`git push origin main`).
  Stops the stop hook firing between /kill-this and /its-dead. Applied to both `{.claude,dev/claude}/skills/kill-this/SKILL.md`; verified byte-identical. Commit `116de2b`.
- **Task 1** — De-hardcoded 6 skills across 3 affected files × 2 locations:
  - `kill-this` Step 1: test-suite y/n → advisory verification recap (non-blocking)
  - `kill-this` Step 2: `npm run build` → CLAUDE.md §Commands lookup, skip silently if none
  - `pause-this` Step 1: same CLAUDE.md §Commands delegation + silent skip
  - `its-alive` Step 5: "current phase" → "unchecked tasks and which are next"
  - `its-dead`, `restart-this`, `sync-config`: already project-agnostic, no changes needed
  - All 6 skill pairs verified byte-identical. Commit `964d53a`.
- **Task 4** — Researched Anthropic Routines (research preview): multi-repo OAuth via `/web-setup`, creates PRs to `claude/<slug>` branches by default, Pro=5 runs/day up to 45 min each. Verdict: viable for nightly upstream sync. Captured as DEC-006 in `docs/DECISIONS.md`.

**In Progress:** None.

**Blocked:** Nothing new. Task 5 (fixed repo list format) may be N/A — Routines stores its own OAuth config; reassess when starting task 6.

**Next Steps (cold start):**
1. Task 2 — update seeds CLAUDE.md setup instructions: step 5 → project-level skills, add Key Docs table (2 pts, quick win)
2. Session 3 code-review fixes — `[Project]` placeholders in agents, seeds-ify dev-family agents, `sync-config.md` skill-location ref, PROJECT_PLAN velocity guide path prefix
3. Task 7 — build `/pull-seeds` downstream skill (5 pts, unblocked by task 1)
4. Task 6 — build remote Routine for nightly upstream sync (8 pts, unblocked by task 4)
5. Task 9 — migrate personal projects to project-level skills (5 pts)

**Context:**
- `§Commands` notation in skill files is informal shorthand for `## Commands` — code review flagged as ambiguous for agent lookup. Consider tightening wording in task 2 pass.
- Routines creates PRs to `claude/`-prefixed branches; seeds workflow (DEC-005) expects main. May need a merge step in the Routine or a post-Routine manual merge. Assess when designing task 6.
- Velocity this session: 8h20m / 10 pts = 0.83 hrs/pt (wall-clock, idle-inflated — not representative).

**Code Review:** 4 findings on `964d53a`:
1. `§Commands` notation is informal — agent doing literal lookup might miss `## Commands`. Actionable.
2. Example lists differ between kill-this and pause-this (`supabase db reset` in kill-this only). Minor divergence.
3. "Domain project" skip example in kill-this is self-referential for seeds; could confuse agents in real dev projects. Borderline.
4. Unconditional push doesn't explicitly say "Everything up-to-date is fine, proceed." Easy one-phrase fix.
All pairs byte-identical (primary invariant preserved). No blockers.

---

## Session 6 — 2026-04-25 13:41–14:41 (~1 hr focused)
**Duration:** ~1 hr (calendar 12h, mostly away from desk) | **Points:** 7 (task 12: 5, task 3: 2)

**Task:** Task 12 (DEC-005 implementation bug fixes) + task 12 polish from code review + task 3 (delete mobile-test probe).

**Completed:**
- **Task 12** — Fixed 6 DEC-005 enforcement bugs across 4 skill files:
  - `/its-alive` Step 0: `git rev-parse --verify main` guard with `checkout -b main origin/main` fallback for fresh clones; diverged-main now asks user (a) rebase / (b) reset / (c) abort instead of just stopping.
  - `/its-alive` Step 3: auto-commits + pushes the session-open marker (`git push origin main`) so the stop hook stops firing every session start.
  - `/its-dead` Step 3: dropped the push (single-push-per-session rule).
  - `/its-dead` Step 5: dirty-tree guard with recovery guidance, missing-local-main guard, FF-only merge with surface-and-stop on can't-FF, single push at end, orphan-branch note via `git commit --amend` when remote delete fails.
  - All 4 files (`{.claude,dev/claude}/skills/{its-alive,its-dead}/SKILL.md`) verified byte-identical.
  - Commits `8e17ec7` (main impl) + `4c8ab0d` (polish + task 3, amended).
- **Task 12 polish** (from `@code-review` of `8e17ec7`):
  - Bare `git push` → `git push origin main` in /its-alive Step 3 for fresh-clone safety.
  - Dirty-tree guard message in /its-dead Step 5a now tells the user what to do.
- **Task 3** — Removed `.claude/skills/mobile-test/` directory; cleaned `docs/AGENTS.md` (dropped Overview parenthetical, full subsection, and summary-table row referencing mobile-test). Historical references in PROJECT_PLAN task 3 row + DECISIONS.md DEC-002 left intact (reviewer judged optional).
- **Branch model self-test passed** — `/its-alive` Step 0 ran cleanly at session start (already on main, FF pull). First session that didn't get sidetracked by branch confusion. Stop hook fired once at the open-marker stage (before task 12 fix landed); silent thereafter until /kill-this surfaced task 13.
- **Task 13 added** — `/kill-this` push behavior follow-up (2 pts), surfaced live when stop hook fired between /kill-this commit and /its-dead.

**In Progress:** None.

**Blocked:**
- Anthropic Routines GitHub access model (DEC-TBD) — research task 4
- Repo list format for Routine (DEC-TBD)
- Fate of `scripts/nightly-sync.sh` (DEC-TBD)

**Next Steps (cold start):**
1. Task 13 — decide `/kill-this` push behavior (2 pts, decision + 1-line edit). Quick win.
2. Task 4 — research Anthropic Routines GitHub access (3 pts, async; unblocks task 6).
3. Apply Helm extraction (queued from Session 3) — 6 files. NB: its-alive Step 0 already does --ff-only pull (task 12), so the Helm extraction's pull change should be folded into Step 0 rather than added separately.
4. Session 3 code-review fixes — `[Project]` placeholders in agents, seeds-ify dev-family agents, `sync-config.md` skill-location ref, etc.
5. Task 1 (rest of de-hardcoding) — kill-this, pause-this, restart-this, sync-config skills.
6. Task 2 — setup instructions update + per-tool selection guide.
7. Task 5/6 (Routine build) once task 4 is unblocked.

**Context:**
- DEC-005 enforcement is now hardened against the 6 known failure modes. /its-alive Step 0 self-tested live this session — passed.
- /its-dead Step 5 hasn't been live-tested with the new logic on a feature branch yet — this session is on main, so Step 5 hits the on-main fast path. Real test of the FF merge + orphan-note flow will come when a future session starts on a feature branch.
- AGENTS.md cleanup folded into the same commit as task 3 deletion via `git commit --amend` — first amend in this project; works clean.
- Velocity datapoint: 7 pts in ~1 hr = 0.14 hrs/pt. Consistent with Session 5 (0.125 hrs/pt). n=2 now, but both sessions were skill-edit / decision work — heavy build/debug tasks (task 6, 8 pts) likely run higher.

**Code Review:** Two passes ran. (1) `8e17ec7` review surfaced 1 real bug + 1 polish — both addressed in `4c8ab0d`. (2) `4c8ab0d` review surfaced 4 stale `mobile-test` refs in `docs/AGENTS.md` — addressed via `git commit --amend`. Final state: Clean Bill of Health.

---

## Session 5 — 2026-04-24 20:00–21:15 (~1.25 hrs)
**Duration:** ~1.25 hrs (0.75 focused + 0.5 recovery — see addendum) | **Points:** 6 (task 10: 3, task 11: 3)

**Task:** Task 10 — CC branch workflow decision; Task 11 — implement DEC-005 in skills.

**Completed:**
- **Task 10** — Decided DEC-005: always on main while solo; switch to per-session branches when a team member joins. Captured in `docs/DECISIONS.md`. Commit `acbbb16`.
- **Task 11** — Implemented DEC-005:
  - `/its-alive` Step 0 (new): fetch + check branch + ensure on main with `--ff-only` pull. Stops with surface on dirty tree.
  - `/its-dead` Step 5 (new): merge non-main branch into main with `--ff-only`, push, delete locally + remote.
  - Applied to all 4 files: `dev/claude/skills/{its-alive,its-dead}/SKILL.md` + `.claude/skills/{its-alive,its-dead}/SKILL.md`. Templates and seeds copies verified byte-identical.
  - Commit `491ea62`.

**In Progress:** None.

**Blocked:** Same as prior sessions — three DEC-TBDs gating tasks 5/6.

**Next Steps (cold start):**
1. **Verify Step 5 self-test outcome** — this session's `/its-dead` should auto-clean `claude/cross-device-skill-sync-D3KMg`. Confirm in next session's `/its-alive` that we land on main with the branch deleted.
2. **Fix code-review bugs** in Step 0 / Step 5 (see Code Review below) — 4 issues, ~3 pts new task.
3. Task 4 research — Anthropic Routines GitHub access (3 pts, async, unblocks task 6).
4. Helm extraction (queued from Session 3).
5. Code-review fixes from Session 3 (`[Project]` placeholders, seeds-ify dev-family agents, etc.).
6. Task 3 — delete mobile-test probe.
7. Remainder of task 1, task 2.

**Context:**
- DEC-005 enforcement starts with this session's `/its-dead`. First real-world test of Step 5.
- Code-review identified 4 logic bugs in the new steps — none affect *this* session's Step 5 run (FF merge will work, main exists locally, no concurrent main movement) but they will misfire on cross-device scenarios. Fix before relying on Step 5 for actual cross-device sessions.
- Velocity datapoint: 6 pts in ~0.75 hrs = 0.125 hrs/pt. First real session with both real time + real points; n=1.

**Code Review:** 4 findings — all queued, none blocking this session:
1. **Step 0 missing-local-main guard** — `git checkout main` fails on fresh clones where only the auto-branch exists. Add `git rev-parse --verify main` check; fall back to `git checkout -b main origin/main`.
2. **Step 0 diverged-main case** — `git pull --ff-only` failure on first DEC-005 adoption needs remediation guidance (rebase / reset / abort), not just "surface and stop."
3. **Step 5 ordering** — Step 5 runs after Step 3's commit + push to feature branch. If `origin/main` advanced externally during the session, Step 5's FF merge fails and leaves the session "closed" but branch un-cleaned. Move cleanup before Step 3 (or remove Step 3's push since Step 5 will push from main anyway).
4. **Step 5 missing dirty-tree guard** — Mirrors Step 0's `git status --porcelain` check; without it, `git checkout main` from a dirty non-main branch will misbehave.

**Addendum — Step 5 self-test failed live (added at session close):**
Code-review finding #3 manifested in real-time during this very session's `/its-dead` Step 5. Sequence:
1. While Session 5 was active, GitHub auto-merged stale **PR #1** (which only contained `fdad37e`, the original Session 4 open marker) into `main`. This created merge commit `cfc6690` on origin/main with content unrelated to Session 5 work.
2. `/its-dead` Step 5 ran `git checkout main && git pull --ff-only` (succeeded, fast-forwarded to `cfc6690`), then `git merge --ff-only <feature-branch>` — **failed**. The branches had diverged: feature's history didn't include `cfc6690`.
3. Recovery (manual, user authorized rebase strategy):
   - `git checkout <feature> && git rebase main` — replayed 5 commits cleanly on top of `cfc6690`. New hashes: `2d92404`, `0312611`, `7502680`, `da58da5`, `46eb671`.
   - `git checkout main && git merge --ff-only <feature>` → `git push origin main` ✅
   - `git branch -D <feature>` (local force-delete after rebase made `-d` impossible)
   - `git push origin --delete <feature>` → **HTTP 403** (auth scope limitation; orphan remote branch left for manual GitHub-UI cleanup)
4. Final main HEAD: `46eb671`. All Session 5 work present on main.

**New finding for task 12:**
5. **Step 5 remote-delete error handling** — the "best-effort" instruction (don't fail the skill on remote-delete error) worked as intended; recovery continued. But there's no record/log of the failure — user needs to know there's an orphan remote branch to clean up. Step 5 should surface a "TODO: orphan remote branch X" note when remote-delete fails.

Updated duration estimate: ~1.25 hrs (0.75 focused work + ~0.5 hr recovery).

---

## Session 4 — 2026-04-24 19:53 (N/A)
**Duration:** N/A (no work performed) | **Points:** 0

**Task:** Session start ritual test — invoked `/its-alive`, presented briefing, closed without doing the recommended task.

**Completed:**
- Opened Session 4 entry in `session-log.md` (commit `fdad37e`)
- Presented briefing recommending task 10 + parallel task 4 research

**In Progress:** None.

**Blocked:** Same as Session 3 — three DEC-TBDs gating tasks 5/6.

**Next Steps (cold start):** Identical to Session 3's Next Steps — task 10 first (CC branch workflow discussion), then task 4 research in parallel, then Helm extraction, code-review fixes, task 3, rest of task 1, task 2.

**Context:**
- Real workflow signal surfaced: `/its-alive` opened Session 4 on the `claude/cross-device-skill-sync-D3KMg` feature branch (still checked out from Session 3) rather than main. Live example of the task 10 problem — sessions land on whatever branch was last checked out, not on a deliberate branch chosen by the workflow.
- This near-empty session itself is data: starting `/its-alive` without intent to work creates orphan session entries. Worth deciding whether `/its-alive` should require a stated task, or whether a "session abandoned" close path should exist.

**Code Review:** Skipped — no substantive changes (only the open-session marker commit `fdad37e`).

---

## Session 3 — 2026-04-23 (Thu)
**Duration:** N/A (setup session, no /its-alive stamp) | **Points:** 0 (no plan tasks completed — this session *created* the plan)

**Task:** Cross-device skill sync design + promotion of seeds to a real project using its own workflow.

**Completed:**
- Mobile-test probe skill (`.claude/skills/mobile-test/SKILL.md`) — created, pushed, merged to main. Verified on Android that project-level skill discovery works on mobile (no plugin needed).
- Confirmed mobile slash UX: no autocomplete dropdown, but typing `/skillname` as text works.
- Promoted seeds to real project — added `docs/` (PROJECT_PLAN, SPEC, DECISIONS, AGENTS, RETROSPECTIVES, VELOCITY guide), `.claude/agents/` (5 agents), `.claude/skills/` (6 skills) at root.
- Captured 4 architectural decisions (DEC-001..004) + 3 DEC-TBDs.
- Added "Future Direction" north star to `docs/SPEC.md` — seeds as personal project hub (long-term).
- Added task 10 to PROJECT_PLAN — CC branch workflow discussion, priority for next session.
- Retroactively numbered prior session-log entries (Session 1 = 04-20, Session 2 = 04-22) so `/its-alive` can compute the next N.
- Commits: 53ecdc3, 75c66dc, 684d0b9, 61207a9 on `claude/cross-device-skill-sync-D3KMg`.

**In Progress:** None.

**Blocked:**
- Anthropic Routines GitHub access model (DEC-TBD) — research task 4
- Repo list format for Routine (DEC-TBD)
- Fate of `scripts/nightly-sync.sh` (DEC-TBD)

**Next Steps (cold start):**
1. Merge `claude/cross-device-skill-sync-D3KMg` to main (user requested).
2. **Task 10 first** — discuss CC branch impact on workflow before any other work. Affects how `/its-alive`, `/kill-this`, `/its-dead` behave wrt branching.
3. Apply Helm extraction (queued this session, not applied) — 6 files, 3 skills × {dev/ template + seeds .claude/ copy}:
   - `kill-this`: replace test-suite y/n prompt with verification recap (advisory, lands in draft log); make `npm run build` conditional on `package.json` + build script existing
   - `pause-this`: same conditional build check
   - `its-alive`: unconditional `git pull --rebase --autostash` before reading session state (prevents stale log on second machine); re-read session-log.md after pull; surface `git status --porcelain` in briefing
4. Code-review fixes (from @code-review in this session):
   - Fill `[Project]` → `seeds` in architect.md, code-review.md, pm.md, ui-reviewer.md frontmatter
   - Seeds-ify the 4 dev-family agents (remove Next.js/Supabase/RLS/shadcn assumptions)
   - `sync-config.md:16` — update `~/.claude/skills/` reference to `<project>/.claude/skills/` per DEC-002
   - `AGENTS.md` — replace "spec → build → test → mobile screenshot" loop with seeds' actual loop
   - `its-alive/SKILL.md:38` — remove "current phase" assumption (PROJECT_PLAN has no phases)
   - `PROJECT_PLAN.md:11` — add `docs/` prefix to VELOCITY_AND_POKER_GUIDE.md reference
5. Task 3 — delete mobile-test probe.
6. Remainder of task 1 (other 3 skills' de-hardcoding), task 2 (setup instructions + per-tool selection guide).

**Context:**
- Project-level skill discovery **confirmed** on desktop + Android. Plan is viable end-to-end.
- Workflow philosophy: seeds = full library; per-project = subset chosen at seed time via conversation. No fixed profiles.
- Long-term: seeds becomes personal project hub (cross-project status view) — captured in SPEC Future Direction, not actionable yet.
- This session's `/kill-this` ran with adapted Steps 1+2 (no test suite, no build step) — exactly what Helm extraction fixes for next time.
- `@code-review` flagged that seeds dropped `dev/` family templates into its own `.claude/` without seeds-ifying — all findings logged under Next Steps item 4.

**Code Review:** 10 findings from @code-review against branch vs main, all non-blocking, queued into Next Steps item 4.

---

## Session 2 — 2026-04-22 (Wed)

**Topic:** Cross-device skill sync design. No code written — design conversation only.

**Problem framing:** User runs CC on laptop, headless Ubuntu box, and Android phone. Wants session skills (`/its-alive`, `/kill-this`, etc.) to work across all three, and wants seeds to stay source of truth.

**Key finding — skills are project-shaped, not device-shaped:**
- `dev/claude/skills/kill-this/SKILL.md:22` hardcodes `Run npm run build`. Would be wrong for a domain/farm repo.
- Skill *names* are universal (its-alive → work → kill-this → verify → its-dead). Skill *internals* vary by project type.
- Three possible homes for skills: `~/.claude/skills/` (user-global), `<project>/.claude/skills/` (project-level, in repo), or plugin. Current setup uses user-global.

**Direction locked in:**
- Skills move to `<project>/.claude/skills/`, checked into each project repo
- Seeds holds templates per family (`dev/`, `domain/<x>/`)
- New project: seed from matching family → customize in place
- Benefit: skills ride along with the repo checkout — same skills on laptop/headless/mobile without separate sync

**Sync model — one concept, two directions, same classifier (`@sync-config`):**
- **Upstream (project → seeds):** remote Anthropic Routine, nightly, fixed repo list maintained in seeds, opens PR to seeds. Supersedes the local `scripts/nightly-sync.sh` from 2026-04-20 session (or coexists — TBD).
- **Downstream (seeds → project):** manual skill (`/pull-seeds` or similar), run inside a project when user wants updates. No reminders mid-flow — user explicitly doesn't want to be interrupted during task work.

**Open unknown — blocking further design:**
Does Claude Code on Android auto-discover `<project>/.claude/skills/` from a cloned repo? Docs cover desktop CLI only; mobile/web behavior is undocumented. @claude-code-guide agent confirmed the gap.

**Next session — resume here:**
1. User to run empirical test: drop a dummy skill in a project's `.claude/skills/`, open the repo in Android CC, try invoking it. 5-minute test.
2. If it works → proceed with project-level skills plan: de-hardcode the six skill templates in seeds to delegate to `CLAUDE.md §Commands` rather than assuming `npm`, then update setup instructions (step 5) to copy into `<project>/.claude/skills/` instead of `~/.claude/skills/`.
3. If it doesn't work → redesign. Options: hedge with global + project mirror, or wait on plugin support.
4. Separately: decide whether the remote Routine supersedes or coexists with `scripts/nightly-sync.sh`. Requires checking if Anthropic Routines have GitHub access to read N private repos and open a PR.

**Commit:** log entry only, no code changes.

---

## Session 1 — 2026-04-20 (Sun/Mon)

**Built:** Nightly auto-sync automation (skeleton).

**Files:**
- `scripts/nightly-sync.sh` — scans `~/` (depth 3) for dirs containing `.claude/` modified in the last 7 days, does `git pull --ff-only` per repo, skips dirty repos silently (listed in PR body), caps at 10 repos/night. In seeds: creates branch `auto-sync/YYYY-MM-DD` off `origin/main`, invokes `claude -p` non-interactively as the @sync-config agent in "automation mode" (no interactive prompts — agent makes its own backport/skip calls, stages one commit per source repo), then `gh pr create` to stack a PR.
- `.gitignore` — new; ignores `logs/`.
- `logs/` — created (ignored).

**Config decisions (locked in w/ user):**
- Scan root: `~/`  
- Freshness window: 7 days (mtime on `.claude/`)
- Repo cap: 10/night
- Dirty repos: skip silently, list under "Skipped" in PR body
- PRs: stacked (one branch `auto-sync/YYYY-MM-DD` per run; old PRs not touched)
- Schedule target: 2am EDT nightly via Windows Task Scheduler → `wsl.exe -d Ubuntu bash -lc '~/seeds/scripts/nightly-sync.sh'`
- Cross-machine: user pushes from other machines; nightly script's `git pull --ff-only` picks up anything on origin

**Token/quota thinking:** User is on Claude subscription (5h rolling window). 2am EDT is outside typical coding hours so collisions are unlikely. Cap at 10 repos holds per-night agent invocations down.

**Blocker — not addressed tonight:**  
Inside WSL Ubuntu, neither `claude` nor `gh` resolved on PATH when probed from this session's Git Bash via `wsl.exe -d Ubuntu bash -lc 'command -v claude'`. User confirmed "i have both" — so they're installed, just not visible in the login shell PATH the way I probed. Need to locate them before the schtasks registration is meaningful.

**Next session — resume here:**
1. Inside WSL Ubuntu: `command -v claude; command -v gh; gh auth status` — confirm both resolve and `gh` is authenticated.
2. If paths are unusual, adjust the script's shebang or prepend a PATH line.
3. Smoke-test manually (from WSL): `~/seeds/scripts/nightly-sync.sh` — verify detection, pull, branch creation. If no backport-worthy changes it should clean up and exit 0 with no PR.
4. Register the scheduled task (run from Windows PowerShell, not WSL):
   ```
   schtasks.exe /create /tn "Claude Seeds Nightly Sync" /tr "wsl.exe -d Ubuntu bash -lc '~/seeds/scripts/nightly-sync.sh'" /sc daily /st 02:00 /f
   ```
5. Optional: first-run monitoring — tail `~/seeds/logs/nightly-sync-YYYY-MM-DD.log` the morning after.

**Commit:** 1 commit with script + .gitignore + this log. Pushed to origin/main.

---
