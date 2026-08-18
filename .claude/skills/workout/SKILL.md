---
name: workout
description: Promotion cycle for the workflow learning loop. Reads accumulated observations in seeds, invokes @workout to group them into patterns and make the severity call, and lands one PR against main. Seeds-only. Run weekly or fortnightly, by hand.
tools: Read, Bash, Glob, Grep, Agent
---

You are executing the /workout skill — the promotion half of the learning loop (DEC-S039).

**This runs in seeds and nowhere else.** It edits `dev/claude/**`. If the current repo isn't seeds,
stop.

**Cadence: weekly or fortnightly, by hand.** This is not the nightly Routine returning under a new
name — that stays off (DEC-S038). The honest failure mode is that the workout doesn't happen;
observations then pile up harmlessly and nothing regresses, which is still better than a candidate
pattern being deleted by the next sync.

## Step 0 — Confirm you're in seeds, on a clean `main`

```bash
git rev-parse --show-toplevel
git branch --show-current
git status --porcelain
```

- Not seeds → STOP. "`/workout` runs in seeds. Nothing to promote here."
- Dirty tree → STOP and ask the user to commit or stash. This skill opens a PR; uncommitted work
  would ride along in it.
- Not on `main` → ask whether to switch. Promotions branch off `main`.

Then `git pull --ff-only origin main`.

## Step 1 — Attach the observations worktree

```bash
git fetch origin observations
```

- **Present** (`[ -e .observations-worktree/.git ]` — `-e`, not `-d`: in a linked worktree `.git` is a
  *file*, a `gitdir:` pointer): `git -C .observations-worktree reset --hard origin/observations`
- **Missing, branch exists:** `git worktree add .observations-worktree observations`
- **Missing, no branch:** STOP — nothing has ever been observed. Bootstrap per
  `docs/SPECS/2026-08-workflow-learning-loop.md` § Phase 2.

## Step 2 — Size the inbox before spending anything

```bash
ls .observations-worktree/observations/*.md | grep -v -e LEDGER -e README | wc -l
```

- **Zero** → report "Inbox empty. Nothing observed since the last cycle." and stop. That is a real
  result, not a failure.
- **Non-zero** → echo the count and the date range, then continue.

## Step 3 — Invoke @workout

> "Run a promotion cycle. Inbox: `.observations-worktree/observations/` (exclude `archive/`).
> Ledger: `.observations-worktree/observations/LEDGER.md`. Templates you may edit: `dev/claude/**`.
> Group observations into patterns, make the severity call per DEC-S039 — cost and detectability,
> not a count — update the ledger, archive the whole inbox, and open one PR against `main`.
> Do not merge it."

The agent handles grouping, judgment, template edits, the DEC file if one is warranted, the ledger,
the archive move, and the PR.

## Step 4 — Verify the cycle actually closed

Three checks. Each has a specific way of going wrong silently.

```bash
ls .observations-worktree/observations/*.md | grep -v -e LEDGER -e README   # expect empty
git -C .observations-worktree status --porcelain                            # expect clean
git -C .observations-worktree log --oneline -1                              # expect the archive commit, pushed
```

1. **Inbox empty.** A file left behind is a claim it wasn't read, and the next cycle will re-judge
   it from scratch.
2. **Observations branch clean and pushed.** An unpushed archive move is undone by the next
   `reset --hard` in Step 1 — the inbox comes back and the ledger update is lost.
3. **The PR exists** (`gh pr list --state open --base main --limit 5`). Report its URL.

Then run the doc gates on the template change, since the PR touches `dev/claude/**` and possibly
`docs/decisions/`:

```bash
node dev/claude/scripts/check-decisions.mjs
node dev/claude/scripts/check-docs.mjs
```

## Step 5 — Report

State plainly: how many observations, how many patterns, how many promoted / held / dismissed, and
the PR URL.

**If everything was promoted, say so as a warning.** A report that flags everything gets skimmed,
and a `/workout` that always promotes is one that has stopped judging — the same failure the
splitter's over-broad hint regex nearly caused in the V5 rollout.

Do not merge the PR. Read it first; that review is the entire point of the artifact.
