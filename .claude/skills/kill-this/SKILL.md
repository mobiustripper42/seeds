---
name: kill-this
description: First half of the end-of-session shutdown. Checks the build, commits code changes, runs code review, and shows a draft session log entry for review. Time calculation and point tally happen in /its-dead. Follow up with /its-dead to finalize.
tools: Read, Edit, Write, Bash, Glob, Grep
---

You are executing the first half of the end-of-session shutdown.

## Step 1 — Full suite check

Ask the user: **"Did you run the full test suite this session?"**

Wait for their answer.

- If yes: continue.
- If no: ask separately: **"Do you want to run it now before committing?"**
  - If yes: run the full suite and fix any failures before proceeding.
  - If no: continue.

## Step 2 — Build check

Run `npm run build`. Fix any errors before proceeding. Do not commit broken code.

## Step 3 — Commit code

Stage and commit all uncommitted changes with `git add -A`. Write a commit message that:
- Starts with the phase/task (e.g. "Phase 5.5 —")
- Summarizes what was done in plain English
- Ends with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

If there is nothing to commit, skip and say so.

## Step 4 — Code review

Run the @code-review agent against HEAD (`git diff HEAD~1`). Wait for it to complete. Include a **Code Review** section in the draft log entry with either the findings or "Clean Bill of Health."

## Step 5 — Draft session log entry

Compose the full session log entry but DO NOT write it yet. Duration and points are not yet known — use `[TBD]` placeholders:

```
## Session N — YYYY-MM-DD HH:MM–[TBD] ([TBD] hrs)
**Duration:** [TBD] | **Points:** [TBD]
**Task:** What the session was working on
**Completed:** Bullet list of what got done (include file paths for significant changes)
**In Progress:** Anything partially done
**Blocked:** Anything waiting on a decision or external input
**Next Steps:** Exactly what to do when sitting back down (specific enough for cold start)
**Context:** Gotchas, patterns established, things easy to forget
**Code Review:** [findings or "Clean Bill of Health"]
```

Show the draft to the user and ask: **"Does this look right? Any edits before I lock it in? Run /its-dead when ready — pass any time adjustments as args (e.g. /its-dead subtract 30 minutes for time away from desk)."**

Stop here. Do not write anything to session-log.md yet. Do not push.
