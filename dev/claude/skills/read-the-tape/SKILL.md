---
name: read-the-tape
description: Reviews a recent session JSONL transcript for workflow anti-patterns. Fixes what the project owns and records everything else as a cited observation on the seeds observations branch. Run after a session you want to learn from. Optional arg: session number or file path.
tools: Read, Bash, Glob, Grep, Agent
---

You are executing the /read-the-tape skill.

Under DEC-S039 this skill is an **observer**. It fixes what the project owns and writes everything else to the `observations` branch in seeds, where `@workout` can see it alongside other repos and other weeks. Steps 0 and 0.5 exist to make that write possible; without them the agent has no registry to resolve file classes against and nowhere to put the evidence.

## Step 0 — Resolve the seeds checkout

Same resolution order as `/pull-seeds` Step 0 — stop at the first hit:

1. **Skill arg:** if a path to a seeds checkout is passed, use it as `SEEDS`.
2. **Sibling default:** `SEEDS=$(git rev-parse --show-toplevel)/../seeds` if `git -C "$SEEDS" rev-parse --git-dir` succeeds.
3. **Env var:** `$SEEDS_REPO` if set and a git repo exists there.
4. **STOP:** if none resolve, ask: "Where's your seeds checkout? Re-run as `/read-the-tape <transcript> <path-to-seeds>`."

Echo: "Seeds checkout: `$SEEDS`."

Do **not** gate on `seeds-version` here and do **not** require `$SEEDS` to be on `main`. This skill reads one config file and writes to an orphan branch; it changes no template and applies no sync, so the DEC-S006 version gate has nothing to protect. Refuse only if the checkout doesn't exist.

**If you're running this skill inside seeds itself**, `$SEEDS` is the current repo. That is fine — seeds audits its own sessions like any other project.

## Step 0.5 — Attach the observations worktree

```bash
git -C "$SEEDS" fetch origin observations
```

- **Worktree already present** (`[ -d "$SEEDS/.observations-worktree/.git" ]`): check it's clean
  first — `git -C "$SEEDS/.observations-worktree" status --porcelain`. **If dirty, STOP** and show
  what's there. A dirty observations worktree means an earlier run wrote a file and failed to push
  it, or another session is mid-write; `reset --hard` over either destroys an observation with no
  trace. Only on a clean tree: `git -C "$SEEDS/.observations-worktree" reset --hard origin/observations`
- **Missing, `origin/observations` exists:** `git -C "$SEEDS" worktree add .observations-worktree observations`
- **Missing, no `origin/observations`:** the branch hasn't been bootstrapped. STOP and point at `docs/SPECS/2026-08-workflow-learning-loop.md` § Phase 2. Do not create it from a project session — the branch is seeds' to own, and bootstrapping it from a project is how you get two of them.

Set `SEEDS_OBS="$SEEDS/.observations-worktree"`.

If the fetch or worktree attach fails, **stop before invoking the agent**. Running the audit with nowhere to write means the findings are produced and then discarded, which is the failure DEC-S039 exists to remove.

## Step 1 — Find the transcript

**If a session file path is given as the arg** (e.g. `/read-the-tape sessions/2026-05-03-0339-eric-pm-rework.md`):
Read its YAML frontmatter and pull `transcript:`. Use that path directly. If the field is empty or missing, fall back to the heuristic below.

**If a JSONL file path is given as the arg** (e.g. `/read-the-tape ~/.claude/projects/foo/abc123.jsonl`):
Use it directly.

**No arg — heuristic:**

Compute the project's JSONL directory path via Bash:

```
echo "$HOME/.claude/projects/$(pwd | tr '/' '-')"
```

Capture stdout as `JSONL_DIR`. Then use the **Glob** tool to list the JSONLs:
- `path: <JSONL_DIR>`
- `pattern: *.jsonl`

Glob returns absolute paths sorted by modification time, newest first. No basename re-prefixing needed — the result is already absolute.

Default to the **second-newest** JSONL (`result[1]`) — the current session's JSONL is always the newest (being written live); the one to audit is the previous one. If only one JSONL exists, use `result[0]`.

The Glob tool is used in place of `ls *.jsonl` because the Bash form trips two harness validator rules (tree-sitter-bash on `"$VAR"/*.glob`, and a newer rule on `cd "$VAR" && ls 2>/dev/null`). See its-alive Step 5 for the full note.

Also capture the audited session's **slug** — from the session filename if one was passed, otherwise ask, or derive from the branch. It names the observation file.

## Step 2 — Invoke @tape-reader

Pass the transcript, both seeds paths, and the slug:

> "Analyze the session transcript at `<path>`. Repo: `<project dir name>`. Session slug: `<slug>`.
> Seeds checkout: `$SEEDS` — resolve file classes from `$SEEDS/.claude/routine-config.yaml`.
> Observations worktree: `$SEEDS_OBS` — write this run's observation there and push to the `observations` branch.
> Project skills are in `.claude/skills/`, agents in `.claude/agents/`. Fix only what the project owns; observe everything else."

The agent handles analysis, the interactive review of project-owned fixes, the observation write, and any PR.

## Step 3 — Confirm the observation landed

After the agent returns:

```bash
git -C "$SEEDS_OBS" log --oneline -1
git -C "$SEEDS_OBS" status --porcelain
```

Expect the newest commit to be this run's observation and a clean tree. **If the file is uncommitted or unpushed, say so plainly and surface the path** — an observation stranded in a worktree nobody looks at is indistinguishable from one that was never written, and it will be silently discarded by the next `reset --hard` in Step 0.5.
