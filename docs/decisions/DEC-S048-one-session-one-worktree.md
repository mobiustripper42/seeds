---
id: DEC-S048
title: "One session, one worktree — the checkout is chosen before the session, never during"
topic: "Session lifecycle & skills"
---

## DEC-S048: One session, one worktree

**Decision:** A Claude session starts in the checkout its work lives in and stays there. `/its-alive` creates exactly one worktree — `.sessions-worktree/` — and never another. A concurrent session's code worktree is created **before** that session exists, by the operator, in a terminal:

```
git worktree add ../<repo>-<slug> -b task/<slug> main
cd ../<repo>-<slug> && claude
```

Every other skill may then use plain `git`, because the session's shell, checkout and branch are the same thing.

**The invariant this restores, stated plainly because every skill already assumed it:** one session = one checkout = one branch. It held for months and nothing wrote it down.

## What broke it

`/its-alive` Step 3 used to offer "set up a linked worktree" as the answer to a concurrent session. It made the tree, and then the session carried on in the window it was already in — **whose working directory the harness pins at launch and resets on any `cd`.** So the session's code was in one checkout and its shell in another.

Nothing announced that. Anything using absolute paths or `git -C` kept working, which is most things. Only the tools that read the working directory were wrong, and they were wrong silently.

## What it cost

Three PRs — #202, #203, #204 — spent adding compensation to the skills instead of naming the cause. (Six others landed the same day on unrelated subjects; the cost being counted here is the compensation, not the session.) Each symptom looked like its own bug:

| symptom | what was added | PR |
|---|---|---|
| which open session file is mine | `head -1` → `transcript:` → hard stop → confirm-a-candidate, four versions | #202, #204 |
| `BRANCH` read from the wrong checkout | Step 0.1, then a Step 2 dirtiness check across worktrees | #202, #203 |
| `/security-review` reviewing another branch's diff | detection, then a re-run instruction that could not be carried out, then an agent-run replacement | #204, unmerged |

Three of those instructions **could not be followed at all** — matching a `transcript:` a session cannot know, re-running a built-in whose working directory cannot be moved — and each read as solved. That is the characteristic failure of fixing a symptom: the remedy is shaped by the symptom rather than by the cause, so it can be confidently wrong.

## What this removes

- `/its-alive` Step 3's worktree-creation option. It reports a concurrent session and continues; if asked to make a code worktree, it prints the two lines above and stops.
- `/kill-this` Step 0.1 entirely, Step 2's cross-worktree check, Step 3.5's wrong-tree detection, Step 3.6's `✗` example row. (The staged-file echo stays — see below.)
- The multi-session disambiguation prose in `/kill-this`, `/pause-this`, `/restart-this`, `/its-dead`, down to: report the candidates, ask, never `head -1`.
- `/pause-this`'s cross-worktree check on an empty stage.

`/its-alive` Step 0's linked-worktree detection **stays**, demoted to a report. It tells the briefing which shape the session is; nothing branches on it.

## What is deliberately not solved

**Session files remain shared.** `.sessions-worktree/` is a checkout of the orphan `sessions` branch, and git refuses to check out one branch in two worktrees — so a second session cannot have its own. Two concurrent sessions still produce two open files in one directory, and "which is mine" is still a question.

It is now a *question to the operator* rather than a guess. Every skill reports the candidates and asks. `head -1` is banned by name in all four, with its reason: it takes the lexically-earliest filename, session filenames start with a date, and so it silently selects the **stale** file exactly when a session was left open from an earlier day. It appears to work whenever the stale file happens to sort later, which is why it survived unnoticed for months.

**One thing removed had a second job.** `/kill-this` and `/pause-this` echoed the staged file list before committing, justified as the only moment a wrong-tree commit becomes visible to a person. That justification dies with the split — but the line also caught an unrelated file riding along in `git add -A` *within the correct checkout*, which has nothing to do with worktrees. Kept for that reason, restated without the wrong-tree framing.

**The `branch:` frontmatter field is near-useless and is left alone for now.** It records what the session opened on, goes stale at the first `git checkout -b`, and every `## Task` block already carries its own `**Branch:**`. Removing it is a schema change; not worth bundling here.

## Why not the alternative

The considered alternative was to record the session's worktree path in the session file and have every skill use `git -C "$WORKTREE"`. It works, and it is worse: it keeps the split and teaches five skills to route around it, so every new skill must learn the same lesson and every cwd-reading tool outside our control — `/security-review` is one, and there will be others — stays broken. Choosing the checkout before the session removes the split instead of routing around it.

**Schema:** no version bump. No file moves, no new fields; skills lose logic.

**See also** DEC-S014 (the orphan `sessions` branch and `.sessions-worktree/`, which is the one worktree this skill still creates).
