---
name: pause-this
description: Mid-session pause. Checks the build, commits WIP, and notes the pause point in the session log. Use when you need to walk away mid-task without closing the session. Follow up with /restart-this to resume.
tools: Read, Edit, Write, Bash, Glob, Grep
---

You are executing a mid-session pause.

## Step 1 — Build check (conditional)

Look up the project's build check in `CLAUDE.md §Commands`. Run whatever is defined there (e.g. `npm run build`, `cargo build`, `make`, etc.).

If `CLAUDE.md §Commands` defines no build step, skip this step silently — no noise.

If the build fails, do not commit broken code. If there are errors you cannot quickly fix, note them explicitly in the pause entry so the next sitting knows exactly where to start.

## Step 2 — Commit WIP

Stage and commit all uncommitted changes:

```
git add -A
git commit -m "WIP [phase/task] — [brief description of where things stand]"
```

Prefix the message with `WIP` so it's clear this is an in-progress commit. If there's nothing to commit, skip and say so.

## Step 3 — Note the pause

Update the open session entry in `session-log.md` — the one with `[open]` in the heading. Add a pause note below the timestamp line:

```
**[PAUSED HH:MM]** Working on: [task]. Left off at: [specific file/function/step]. Next: [exactly what to do when resuming].
```

Do not close the entry. Do not fill in an end time. The session is still open.

## Step 4 — Confirm

Tell the user:
- What was committed (or that there was nothing to commit)
- What the pause note says
- To run `/restart-this` when ready to resume
