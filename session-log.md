# seeds — Session Log

Session summaries for continuity across work sessions.
Format: prepend newest entry at the top.

---

## Session 6 — 2026-04-25 13:41 [open]

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
