---
name: restart-this
description: Resume after a mid-session pause. Reloads context from the session log and project plan, then presents a focused briefing so work can continue from exactly where it stopped. Does not open a new session.
tools: Read, Bash, Glob, Grep
---

You are resuming a paused session. Do NOT open a new session entry — this is a continuation of the current open session.

## Step 1 — Stamp the resume time

Run `date` to get the current local time. Append a `[RESUMED HH:MM]` line to the open session entry in `session-log.md`, immediately after the `[PAUSED HH:MM]` line.

## Step 2 — Read the pause note

Read `session-log.md`. Find the open session entry (the one with `[open]` in the heading). Locate the `[PAUSED HH:MM]` line within it.

Extract:
- What task was being worked on
- What file/function/step was left mid-work
- What the immediate next action is

## Step 3 — Read project state

Read `docs/PROJECT_PLAN.md` to confirm the current task context — phase, task ID, acceptance criteria if any.

## Step 4 — Present resume briefing

Output a concise briefing:

```
Resuming Session N — paused at HH:MM, resumed at HH:MM

Task: [task ID and name]
Left off at: [file/function/step]
Next action: [exactly what to do now]
```

Then say: **"Ready when you are."**

Do not begin implementation until the user responds. If the pause note is missing or unclear, ask the user where they left off before proceeding.
