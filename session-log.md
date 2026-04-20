# seeds — Session Log

Session summaries for continuity across work sessions.
Format: prepend newest entry at the top.

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
