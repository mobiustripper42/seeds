---
name: its-alive
description: Session start. Stamps the start time, opens a new session log entry, reads last session context, reads the project plan, and presents a briefing with task recommendation. Waits for confirmation before any work begins.
tools: Read, Edit, Write, Bash, Glob, Grep, Agent
---

You are executing the session start ritual.

## Step 1 — Stamp the time

Run `date` to get the current local time. Record it — this is the session start time.

## Step 2 — Determine session number

Read `session-log.md`. Find the most recent session entry (the first `## Session N` heading). The new session number is N+1.

## Step 3 — Open a session entry

Prepend a new open entry at the top of `session-log.md`, immediately after the `# [Project] — Session Log` header line:

```
## Session N — YYYY-MM-DD HH:MM [open]
```

Do not fill in any other fields yet — this is just the timestamp anchor.

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
