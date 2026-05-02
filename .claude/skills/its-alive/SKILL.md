---
name: its-alive
description: Session start. Stamps the start time, opens a new session log entry, reads last session context, reads the project plan, and presents a briefing with task recommendation. Waits for confirmation before any work begins.
tools: Read, Edit, Write, Bash, Glob, Grep, Agent
---

You are executing the session start ritual.

## Step 0 — Branch check

**Worktree check first:** run `git rev-parse --git-dir`.
- If the output contains `/worktrees/`: this is a **linked worktree session** (concurrent with another session). Skip the rest of Step 0 entirely — the branch here is intentional. Note "Linked worktree" in the briefing output and continue to Step 1.
- Otherwise: you are in the main worktree. Continue with the checks below.

Run `git fetch origin` to refresh remote state. Capture `BRANCH=$(git branch --show-current)`.

**Concurrent session check:** scan `session-log.md` for any heading containing `[open]`. If found:
- Show the user: "Session N is already open (started YYYY-MM-DD HH:MM). Is this: **(a)** a currently running concurrent session → I'll create a worktree for this new task, or **(b)** a stale/crashed entry → I'll close it and continue here?"
- Wait for the user's answer.
- If **(b)** (stale): close the open entry by replacing `[open]` in that heading with a note like `[abandoned]`, then continue below.
- If **(a)** (concurrent): ask **"What branch name for this new task? (e.g., `task/6.22-description`)"** Wait for the answer. Capture as `NEW_BRANCH`.
  - Get the repo name: `REPO=$(basename $(git rev-parse --show-toplevel))`
  - Derive a slug from the branch: strip the `task/` prefix if present (e.g., `task/6.22-other` → `6.22-other`). Capture as `SLUG`.
  - Create the worktree: `git worktree add ../${REPO}-wt-${SLUG} -b ${NEW_BRANCH}`
  - Tell the user: **"Worktree created at `../${REPO}-wt-${SLUG}`. Open a new CC window pointed at that directory and run /its-alive there. You can close this window."**
  - **Stop here** — do not open a session entry in the main worktree.

**If `BRANCH` matches `task/*` or any intentional feature branch (not `main`, not a CC auto-branch like `claude/*`):**
- This is intentional PR-flow work. Do NOT attempt to switch to main.
- Run `git status --porcelain` and note any WIP files — they're in-progress work, not an error.
- Continue to Step 1. (The session log commit in Step 3 will push to this branch, not main.)

**If `BRANCH` is `main`:**
- Run `git pull --ff-only origin main`. If it succeeds, continue to Step 1.
- If it fails due to divergence: show the user the divergence with `git log --oneline origin/main..HEAD` (local-ahead) and `git log --oneline HEAD..origin/main` (remote-ahead), then ask: **"Main has diverged. How to reconcile? (a) rebase local onto origin/main, (b) reset local to origin/main (loses local commits), (c) abort /its-alive."** Wait for the user's choice and execute it. Do NOT pick a default.

**If `BRANCH` is anything else** (e.g., `claude/<slug>` CC auto-branches):
- Run `git status --porcelain`. If non-empty (dirty tree): stop. Surface the dirty files and ask the user to commit or stash before re-running `/its-alive`.
- If clean:
  - Check whether local `main` exists: `git rev-parse --verify main` (silently). If it fails (no local main yet), run `git checkout -b main origin/main` to create the tracking branch, then continue.
  - Otherwise run `git checkout main && git pull --ff-only origin main`. If the pull diverges, apply the same (a)/(b)/(c) prompt above.

Per `docs/DECISIONS.md` DEC-005, seeds/solo projects work on `main`. PR-flow projects (like sailbook) work on `task/*` branches — landing there at session start is correct and expected.

## Step 1 — Stamp the time

Run `date` to get the current local time. Record it — this is the session start time.

## Step 2 — Determine session number

Read `session-log.md`. Scan all `## Session N` headings (open or closed) and find the highest N. The new session number is that N+1. Do not just take the first heading — if a concurrent session is already open, it will be `[open]` at the top and must be counted.

## Step 3 — Open a session entry (auto-commit + push)

Prepend a new open entry at the top of `session-log.md`, immediately after the `# [Project] — Session Log` header line:

```
## Session N — YYYY-MM-DD HH:MM [open]
```

Then immediately commit and push so the stop hook doesn't fire mid-briefing:

```
git add session-log.md
git commit -m "Open Session N entry"
git push origin <BRANCH>   # push to whatever branch you're on (main or task/*)
```

Do not fill in any other fields — this is just the timestamp anchor + a clean commit boundary.

## Step 4 — Read last session context

From the most recent completed session entry, extract:
- **Next Steps** — what was planned for the next sitting
- **In Progress** — anything partially done
- **Blocked** — anything waiting on a decision or external input
- **Context** — gotchas and patterns worth remembering

## Step 5 — Read project state

Grep `docs/PROJECT_PLAN.md` — do not read the whole file:
- Unchecked tasks: `grep "\[ \]" docs/PROJECT_PLAN.md`
- Deferred tasks: `grep "\[~\]" docs/PROJECT_PLAN.md`
- Priority note: `grep "Next session priority" docs/PROJECT_PLAN.md -A 2`
- Velocity: `grep "Velocity baseline" docs/PROJECT_PLAN.md -A 1`

Identify:
- Unchecked tasks and which are next (or in scope soon)
- Any tasks marked `[~]` (deferred) or flagged as blocked
- Velocity baseline for rough timeline awareness (if established)

## Step 6 — Present briefing

Output a concise briefing:

```
Session N — [date]
Started: HH:MM

Last session: [one-line summary of what was done]

In Progress: [anything half-done]
Blocked: [anything waiting]
Next Steps from last session: [verbatim or paraphrased]

Recommended task: [specific task ID + name + why it's the right next thing]

[If on `main`:] ⚠ First move after confirming: cut the branch — `git checkout -b task/X.Y-description`
[If on `task/*`:] Branch already cut: `<BRANCH>` — good to go.
[If linked worktree:] Linked worktree on `<BRANCH>` — concurrent session, good to go.
```

Then ask: **"Ready to go? Confirm the task or redirect me."**

Stop here. Do not begin any implementation work until the user confirms.
