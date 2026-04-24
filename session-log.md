# seeds — Session Log

Session summaries for continuity across work sessions.
Format: prepend newest entry at the top.

---

## Session 5 — 2026-04-24 20:00 [open]

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
