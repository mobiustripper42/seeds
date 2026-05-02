---
name: its-dead
description: Second half of the end-of-session shutdown. Calculates session time and effort points, writes the approved session log entry, updates the project plan, commits the log, and cleans up branches. Run after /kill-this once the draft looks good. Optional args: natural-language time adjustments, e.g. "/its-dead subtract 30 minutes for time away from desk".
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
For each task completed this session, grep its row from `docs/PROJECT_PLAN.md` to get its effort value — do not read the whole file. Use the task ID or a unique substring: `grep "| taskID " docs/PROJECT_PLAN.md`. Sum all effort points.

Fill the calculated duration and points into the draft, replacing the `[TBD]` placeholders.

## Step 1 — Write the session log

Write the approved session entry (with real duration and points) into `session-log.md`, replacing the open `[open]` entry at the top.

## Step 2 — Update PROJECT_PLAN.md

Mark any tasks completed this session that aren't already checked `[x]`. Add `<!-- completed YYYY-MM-DD -->`.

## Step 3 — Commit and push the log

**Do not commit yet.** First determine the target in Step 4, then commit to the right place. Committing on a task branch before checking PR state causes a cherry-pick tangle when the PR is already merged.

## Step 4 — Branch cleanup + final push

**Worktree check first:** run `git rev-parse --git-dir`.
- If the output contains `/worktrees/`: this is a **linked worktree session**. Take the worktree path below — do NOT attempt `git checkout main` or FF-merge.
- Otherwise: skip to the normal path.

**Worktree path:**
Run `git branch --show-current` to get `BRANCH`. Run `git rev-parse --show-toplevel` to get `WORKTREE_PATH`.
1. Run `gh pr view $BRANCH --json state -q '.state' 2>/dev/null` to check PR state.
2. If `OPEN`: commit + push the log on this branch — `git add session-log.md docs/PROJECT_PLAN.md && git commit -m "Update session log and plan for session N" && git push origin $BRANCH`. Remind the user to review/merge the PR. Stop here — worktree stays until the PR is merged.
3. If `MERGED`: commit + push the log on this branch (same as OPEN — log travels with the branch). Tell the user: "Worktree cleanup — from your main repo run: `git worktree remove $WORKTREE_PATH`"
4. If `CLOSED`: **STOP.** Ask: "PR was closed without merging — discard this worktree (`git worktree remove $WORKTREE_PATH` from main repo) or keep for archeology?" Wait for answer.
5. If no PR: commit + push — `git add session-log.md docs/PROJECT_PLAN.md && git commit -m "Update session log and plan for session N" && git push origin $BRANCH`. Remind the user to open a PR or merge manually.

**Normal (single-session) path:**

Run `git branch --show-current`. Capture as `BRANCH`.

**On `main`:**
- Commit + push: `git add session-log.md docs/PROJECT_PLAN.md && git commit -m "Update session log and plan for session N" && git push origin main`. Done.

**On a non-main branch — check PR state first:**
Run `gh pr view $BRANCH --json state -q '.state' 2>/dev/null`.

- If `OPEN`: **PR is the merge gate.** Commit + push the log on the task branch so it lands in the PR:
  ```
  git add session-log.md docs/PROJECT_PLAN.md
  git commit -m "Update session log and plan for session N"
  git push origin $BRANCH
  ```
  Surface the PR URL and remind the user to review/merge it. **Do NOT FF-merge or delete the branch.** Stop here.

- If `MERGED`: **Commit the log directly to main — do NOT commit on the task branch.** Doing so would require a cherry-pick later and prevent clean `-d` deletion.
  ```
  git checkout main
  git pull --ff-only origin main        # gets the merged PR work
  git add session-log.md docs/PROJECT_PLAN.md
  git commit -m "Update session log and plan for session N"
  git push origin main
  git branch -d $BRANCH                 # safe — task branch's commits are now in main
  git push origin --delete $BRANCH      # no-op if GitHub already deleted on merge
  ```
  If `git branch -d` fails (unexpected): tell the user and provide `git branch -D $BRANCH` to run manually. Do not retry with `-D`.

- If `CLOSED` (closed without merge): the user deliberately discarded this work. **STOP.** Surface the closed PR URL and ask: **"PR was closed without merging — discard this branch (delete local + remote) or keep for archeology?"** Wait for an explicit answer. Do NOT commit or FF-merge.

- If no PR exists (or `gh` is unavailable): proceed to legacy DEC-005 cleanup below.

**Legacy DEC-005 cleanup** (no open PR — fallback for orphan auto-branches like CC's `claude/<slug>`):
a. **Commit the log on the current branch:**
   ```
   git add session-log.md docs/PROJECT_PLAN.md
   git commit -m "Update session log and plan for session N"
   ```
b. **Switch to main:** `git checkout main`. If checkout fails because local `main` doesn't exist yet, run `git checkout -b main origin/main`. Then `git pull --ff-only origin main`. If the pull diverges, apply the (a)/(b)/(c) prompt from `/its-alive` Step 0.
c. **FF merge:** `git merge --ff-only $BRANCH`. If it can't FF (origin/main advanced externally during the session), stop and surface — recovery options: rebase $BRANCH onto main and retry, or merge --no-ff. Ask the user.
d. **Delete local branch:** `git branch -d $BRANCH` (lowercase `-d` only — safe delete, never `-D`). If this is denied or fails, tell the user and provide the manual command — do not retry with `-D`.
e. **Try remote delete:** `git push origin --delete $BRANCH`. Capture success/failure as `REMOTE_DELETE_OK`.
f. **Orphan note (if remote delete failed):** edit `session-log.md` to append a line under the just-written session's `**Context:**` section: `- **Orphan branch:** \`$BRANCH\` could not be deleted on origin (best-effort failure). Manual cleanup via GitHub UI required.` Then `git add session-log.md && git commit --amend --no-edit` to fold the note into the log commit.
g. **Single push:** `git push origin main`.

Per `docs/DECISIONS.md` DEC-005, seeds/solo projects work on `main` directly. PR-flow projects (like sailbook) use task/* branches — the MERGED path above handles clean log commit + branch deletion without cherry-pick.
