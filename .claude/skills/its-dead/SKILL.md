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

## Step 3 — Commit the log (no push yet)

```
git add session-log.md docs/PROJECT_PLAN.md
git commit -m "Update session log and plan for session N"
```

Do NOT push yet — Step 5 handles the single push for this session after branch cleanup, so any orphan-branch note from Step 5 can be amended into this commit before it leaves local.

## Step 4 — PM agent

Run the `pm` subagent to assess current project status and recommend the best next task — highest-value unblocked task given timeline, dependencies, and remaining scope. Not just the first unchecked box.

Report the recommendation to the user.

## Step 5 — Branch cleanup + final push (DEC-005)

After PM, clean up any non-main working branch and do the single push for this session:

1. Run `git branch --show-current`. Capture as `BRANCH`.
2. If on `main`:
   - Single push: `git push origin main`. Done.
3. If on a non-main branch (e.g. CC auto-created `claude/<slug>`):
   a. **Dirty-tree guard:** run `git status --porcelain`. If non-empty, stop and surface — Step 3's commit should have left the tree clean. Ask the user to commit or stash, then re-run `/its-dead` from Step 5.
   b. **Switch to main:** `git checkout main`. If checkout fails because local `main` doesn't exist yet, run `git checkout -b main origin/main`. Then `git pull --ff-only origin main`. If the pull diverges, apply the (a)/(b)/(c) prompt from `/its-alive` Step 0.
   c. **FF merge:** `git merge --ff-only $BRANCH`. If it can't FF (origin/main advanced externally during the session), stop and surface — recovery options: rebase $BRANCH onto main and retry, or merge --no-ff. Ask the user.
   d. **Delete local branch:** `git branch -d $BRANCH`.
   e. **Try remote delete:** `git push origin --delete $BRANCH`. Capture success/failure as `REMOTE_DELETE_OK`.
   f. **Orphan note (if remote delete failed):** edit `session-log.md` to append a line under the just-written session's `**Context:**` section: `- **Orphan branch:** \`$BRANCH\` could not be deleted on origin (best-effort failure). Manual cleanup via GitHub UI required.` Then `git add session-log.md && git commit --amend --no-edit` to fold the note into Step 3's commit.
   g. **Single push:** `git push origin main`. This pushes the merged work + any amended orphan note in one operation.

Per `docs/DECISIONS.md` DEC-005, solo dev with no PR review surface — auto-branches don't earn their keep.
