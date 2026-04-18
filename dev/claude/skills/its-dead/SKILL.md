---
name: its-dead
description: Second half of the end-of-session shutdown. Calculates session time and effort points, writes the approved session log entry, updates the project plan, commits the log, and runs the PM agent for next task recommendation. Run after /kill-this once the draft looks good. Optional args: natural-language time adjustments, e.g. "/its-dead subtract 30 minutes for time away from desk".
tools: Read, Edit, Write, Bash, Glob, Grep, Agent
---

You are executing the second half of the end-of-session shutdown. The user has reviewed and approved the session log draft from /kill-this.

## Step 0 — Calculate time and tally points

**Time:**
Run `git log -1 --format="%ci"` to get the most recent commit timestamp — this is the session end time.
Read the session start time from the open entry at the top of `session-log.md` (it has `[open]` in the heading).
Subtract start from end. Apply any time adjustment from args (e.g. "subtract 30 minutes" reduces duration by 30 min). Round to nearest 5 minutes (0.08 hr).

If the duration cannot be confidently determined, ask the user before proceeding.

**Points:**
Read `docs/PROJECT_PLAN.md`. For each task completed this session (tasks you checked off or that the user confirmed done), note its effort point value from the plan table. Sum them.

Fill the calculated duration and points into the draft, replacing the `[TBD]` placeholders.

## Step 1 — Write the session log

Write the approved session entry (with real duration and points) into `session-log.md`, replacing the open `[open]` entry at the top.

## Step 2 — Update PROJECT_PLAN.md

Mark any tasks completed this session that aren't already checked `[x]`. Add `<!-- completed YYYY-MM-DD -->`.

## Step 3 — Commit and push the log

```
git add session-log.md docs/PROJECT_PLAN.md
git commit -m "Update session log and plan for session N"
git push
```

## Step 4 — PM agent

Run the `pm` subagent to assess current project status and recommend the best next task — highest-value unblocked task given timeline, dependencies, and remaining scope. Not just the first unchecked box.

Report the recommendation to the user.
