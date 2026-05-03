---
name: read-the-tape
description: Reviews a recent session JSONL transcript for workflow anti-patterns and proposes targeted improvements to skill and agent files. Run after a session you want to learn from. Optional arg: session number or file path.
tools: Read, Bash, Glob, Grep, Agent
---

You are executing the /read-the-tape skill.

## Step 1 — Find the transcript

Run `pwd` to get the current working directory.

Find the matching `.claude/projects/` directory:
```bash
ls ~/.claude/projects/
```

The directory name is a sanitized version of the path — separators become `--`. Find the entry that corresponds to the current project. If multiple match, pick the closest.

List available sessions:
```bash
ls -lt ~/.claude/projects/<matched-dir>/*.jsonl
```

**Selecting the session:**
- No arg → **second most recently modified JSONL** — the current session's JSONL is always the newest (even if tiny); the one you want to audit is the previous one
- File path arg → use that path directly

## Step 2 — Invoke @tape-reader

Pass the selected path to the @tape-reader agent:

> "Analyze the session transcript at `<path>`. Current project skills are in `.claude/skills/`, agents in `.claude/agents/`. Identify workflow anti-patterns and propose targeted improvements."

The agent handles all analysis, interactive review, file changes, and the PR.
