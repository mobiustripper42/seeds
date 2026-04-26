---
name: kill-this
description: First half of the end-of-session shutdown. Checks the build, commits code changes, runs code review, and shows a draft session log entry for review. Time calculation and point tally happen in /its-dead. Follow up with /its-dead to finalize.
tools: Read, Edit, Write, Bash, Glob, Grep
---

You are executing the first half of the end-of-session shutdown.

## Step 1 — Verification recap

Ask the user: **"How was this session's work verified? (live run / test message + log inspection / doc re-read / suite run / nothing — list what applies)"**

The answer is **advisory, non-blocking** — capture it for the draft session log entry's Completed or Context section. Decision-only sessions where "nothing to verify" is the honest answer are fine; do not require a specific verification mode.

## Step 2 — Build check (conditional)

Look up the project's build check in `CLAUDE.md §Commands`. Run whatever is defined there (e.g. `npm run build`, `cargo build`, `make`, `supabase db reset`, etc. — whatever the project considers a build verification).

If `CLAUDE.md §Commands` defines no build step (e.g. a markdown-only repo, a domain project with no software build), skip this step silently — no noise.

If the build fails, fix errors before proceeding. Do not commit broken code.

## Step 3 — Commit and push code

Stage and commit all uncommitted changes with `git add -A`. Write a commit message that:
- Starts with the phase/task (e.g. "Phase 5.5 —")
- Summarizes what was done in plain English
- Ends with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

If there is nothing to commit, skip the commit and say so.

Then push: `git push origin main`. Push unconditionally — even with no new commit, this catches any unpushed commits from earlier in the session (work-product, amends) so the stop hook stays quiet through `/kill-this` → `/its-dead`. Per DEC-005 + task 13.

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

Stop here. Do not write anything to session-log.md yet. (Step 3 already pushed work-product; the log push happens in `/its-dead` Step 5.)
