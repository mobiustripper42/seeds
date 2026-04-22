# seeds — Session Log

Session summaries for continuity across work sessions.
Format: prepend newest entry at the top.

---

## Session — 2026-04-22 (Wed)

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

## Session — 2026-04-20 (Sun/Mon)

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
