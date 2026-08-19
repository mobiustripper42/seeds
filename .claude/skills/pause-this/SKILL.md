---
name: pause-this
description: Mid-session pause. Checks the build, commits WIP, and notes the pause point in the session file. Use when you need to walk away mid-task without closing the session. Follow up with /restart-this to resume.
tools: Read, Edit, Write, Bash, Glob, Grep
---

You are executing a mid-session pause.

## Step 0 — Locate the open session

```
grep -l "^status: open" .sessions-worktree/sessions/*.md 2>/dev/null
```

**Exactly one match:** that's `SESSION_FILE`. NEW MODE — pause note goes in its Context section (on the sessions branch).

**No match:** check `session-log.md` for `[open]` — LEGACY MODE, pause note goes there.

**More than one match — resolve it, never pick one.** Disambiguate on `transcript:`, which `/its-alive` Step 5 stamps and which is unique per window. If that doesn't resolve it, **stop and list the candidates for the user to choose.** Do not use `... | head -1`: it returns the lexically-earliest filename and session filenames start with a date, so it silently writes this pause into the **stale** session's file. Same defect as `/its-dead` Step 0, fixed there 2026-08-17.

**The wrong-tree check goes in Step 2, not here.** This skill commits WIP, and `git branch --show-current` resolves against the current directory rather than the session — `/its-alive` Step 3 offers a linked worktree for a concurrent session, so the two can legitimately differ. Do **not** prompt on a branch mismatch: a session opens on `main` and its work is cut onto branches, so that fires every run and becomes noise. If Step 2 finds **nothing to commit**, that is the ambiguous case — run `git worktree list` and compare against the session file's `branch:` before reporting a clean pause, because "already committed" and "the WIP is in another tree" look identical from here.

## Step 1 — Build check (conditional)

Look up the project's build check in `.claude/CLAUDE-context.md §Commands`, **with the Read tool** — never a `sed`/`grep` one-liner. Run whatever is defined (e.g. `npm run build`, `cargo build`, `make`). If `.claude/CLAUDE-context.md §Commands` defines no build step, skip silently.

If the build fails: do NOT commit broken code. If you can't fix quickly, note the errors in the pause entry so the next sitting knows where to start.

## Step 2 — Commit WIP on the task branch

```
git add -A
git commit -m "WIP [phase/task] — [brief description of where things stand]"
```

Prefix with `WIP`. If nothing to commit, skip and say so. This commit goes to the **current task branch** — NOT to the sessions branch.

## Step 3 — Note the pause in the session file (sessions branch)

Append a pause line to the session file's `**Context:**` section:

```
**[PAUSED HH:MM UTC]** Working on: [task]. Left off at: [specific file/function/step]. Next: [exactly what to do when resuming].
```

Commit + push from inside the worktree:
```
cd .sessions-worktree
git add sessions/$(basename "$SESSION_FILE")
git commit -m "Pause note for Session <N>"
git push origin sessions
cd ..
```

Do not close the session. Do not fill `ended:` / `points:`. Status remains `open`.

## Step 4 — Confirm

Tell the user:
- What was committed on the task branch (or that nothing was)
- What the pause note says
- To run `/restart-this` when ready to resume
