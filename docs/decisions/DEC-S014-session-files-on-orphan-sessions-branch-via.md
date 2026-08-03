---
id: DEC-S014
title: "Session files on orphan `sessions` branch via dedicated worktree"
topic: "Session lifecycle & skills"
---

## DEC-S014: Session files on orphan `sessions` branch via dedicated worktree

**Date:** 2026-05-14
**Status:** Accepted
**Depends on:** DEC-S013 (per-task `/kill-this` semantics).

**Context.** DEC-S013 made `/kill-this` per-task, opening N PRs per session. Each `/kill-this` writes to the session file. The file therefore needs commits on N different task branches — and those branches get squashed/merged/deleted at PR merge. The session file would either fragment across merged-and-deleted branches or pile up on whichever branch happened to be current at each `/kill-this` invocation. Both shapes are broken.

The fix is to remove the session file from the task-branch lifecycle entirely.

**Decision.** Each project has an **orphan `sessions` branch** containing only `sessions/` and a stub `README.md`. Skills access it via a dedicated git worktree at `.sessions-worktree/` (hidden, project-root-adjacent, ignored from `main`'s tree by being on a separate branch with separate history).

**Properties:**
- `sessions` branch has **zero shared history** with `main` (created via `git checkout --orphan sessions`). Never merges to main. Never merges from main.
- `.sessions-worktree/` is a `git worktree` attached to the `sessions` branch. Skills `cd` into it for session-file commits and pushes; the user's main checkout never moves.
- Branch protection on `main` becomes irrelevant for session work. Sessions branch is unprotected by default.
- Dev server / hot reload / build tools never see session-file commits, because they never appear in the main working tree.

**Skill changes.**
- `/its-alive` — Step 0.6 (new): ensures `.sessions-worktree/` exists. If missing, regenerates from `origin/sessions`; if `origin/sessions` doesn't exist yet (first run on a fresh project), creates the orphan branch + initial commit + worktree. Writes the session opener file inside the worktree. Commits and pushes the `sessions` branch.
- `/kill-this` — code commits + PR go to the task branch as today. Session-file appends go to `.sessions-worktree/sessions/<file>.md` and are committed/pushed to the `sessions` branch.
- `/its-dead` — stamps `ended:` inside the worktree, commits and pushes `sessions` branch. Sets `status: closed`.
- `/retro` — reads session files from `.sessions-worktree/sessions/*.md`.

**Three creation triggers** (so users can't accidentally end up without a worktree):
1. **New projects** — one-time setup step added to CLAUDE.md's "Setting Up a New Dev Project" list.
2. **Existing projects** — migration step (see below) creates it once.
3. **Safety net** — `/its-alive` Step 0.6 (new) checks for `.sessions-worktree/`; if missing, it regenerates from `origin/sessions` automatically.

**`.gitignore` entry.** `.sessions-worktree/` is added to `main`'s `.gitignore` so the worktree directory is invisible from main's tree.

**Migration (one-time per project).**
1. Create the `sessions` orphan branch with the existing session files: `git checkout --orphan sessions && git rm -rf . && git checkout main -- sessions/ && git add sessions/ && git commit -m "Initialize sessions branch" && git push -u origin sessions`.
2. Switch back to `main`: `git checkout main`.
3. Remove `sessions/` from `main`: `git rm -r sessions/`.
4. Add `.sessions-worktree/` to `.gitignore`.
5. Commit on `main`: `git commit -m "Move sessions to orphan sessions branch (DEC-S014)"`.
6. Create the worktree: `git worktree add .sessions-worktree sessions`.

Existing session files preserved verbatim — they live on the new branch from commit 1.

**Trade-offs.**
- `ls sessions/` from `main` returns "no such directory" — muscle memory breaks. Quick peek workaround: `cat .sessions-worktree/sessions/<file>.md`.
- The Routine (DEC-S010) doesn't currently know about the `sessions` branch. Sessions are project-local; only skill templates sync via the Routine. No change needed there.
- A user who manually `git checkout sessions` lands in a working tree with no code. Recovery: `git checkout main`. Not a hazard unless deliberately invoked.

**Why orphan rather than long-lived feature-branch.** Long-lived parallel branches accumulate merge debt against main forever. Orphan branches have zero shared history — they can't conflict, can't drift, can't fall behind. Sessions are not source code; treating them as a sibling timeline is the honest shape.

---
