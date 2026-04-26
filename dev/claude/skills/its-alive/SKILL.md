---
name: its-alive
description: Session start. Stamps the start time, opens a new session log entry, reads last session context, reads the project plan, and presents a briefing with task recommendation. Waits for confirmation before any work begins.
tools: Read, Edit, Write, Bash, Glob, Grep, Agent
---

You are executing the session start ritual.

## Step 0 — Ensure on main branch (DEC-005)

Before opening a session entry, ensure work happens on `main`:

1. Run `git fetch origin main` to refresh remote state.
2. Run `git branch --show-current` to identify the current branch.
3. If on `main`:
   - Run `git pull --ff-only origin main`. If it succeeds, continue to Step 1.
   - If it fails due to divergence: show the user the divergence with `git log --oneline origin/main..HEAD` (local-ahead) and `git log --oneline HEAD..origin/main` (remote-ahead), then ask: **"Main has diverged. How to reconcile? (a) rebase local onto origin/main, (b) reset local to origin/main (loses local commits), (c) abort /its-alive."** Wait for the user's choice and execute it. Do NOT pick a default.
4. If not on `main`:
   - Run `git status --porcelain`. If non-empty (dirty tree): stop. Surface the dirty files and ask the user to commit or stash before re-running `/its-alive`.
   - If clean:
     - Check whether local `main` exists: `git rev-parse --verify main` (silently). If it fails (no local main yet), run `git checkout -b main origin/main` to create the tracking branch, then continue.
     - Otherwise run `git checkout main && git pull --ff-only origin main`. If the pull diverges, apply the same (a)/(b)/(c) prompt from Step 3.

Per `docs/DECISIONS.md` DEC-005, all work happens on main while solo. Auto-created `claude/<slug>` feature branches from Claude Code are tolerated mid-session but cleaned up by `/its-dead` Step 5.

## Step 1 — Stamp the time

Run `date` to get the current local time. Record it — this is the session start time.

## Step 2 — Determine session number

Read `session-log.md`. Find the most recent session entry (the first `## Session N` heading). The new session number is N+1.

## Step 3 — Open a session entry (auto-commit + push)

Prepend a new open entry at the top of `session-log.md`, immediately after the `# [Project] — Session Log` header line:

```
## Session N — YYYY-MM-DD HH:MM [open]
```

Then immediately commit and push so the stop hook doesn't fire mid-briefing:

```
git add session-log.md
git commit -m "Open Session N entry"
git push
```

Do not fill in any other fields — this is just the timestamp anchor + a clean commit boundary.

## Step 4 — Read last session context

From the most recent completed session entry, extract:
- **Next Steps** — what was planned for the next sitting
- **In Progress** — anything partially done
- **Blocked** — anything waiting on a decision or external input
- **Context** — gotchas and patterns worth remembering

## Step 5 — Read project state

Read `docs/PROJECT_PLAN.md`. Identify:
- Current phase and which tasks are unchecked
- Any tasks marked `[~]` (deferred) or flagged as blocked
- Velocity baseline for rough timeline awareness

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
```

Then ask: **"Ready to go? Confirm the task or redirect me."**

Stop here. Do not begin any implementation work until the user confirms.
