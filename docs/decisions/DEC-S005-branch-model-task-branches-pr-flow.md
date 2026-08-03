---
id: DEC-S005
title: "Branch model — task/* branches + PR flow"
topic: "Branches, versioning & release"
---

## DEC-S005: Branch model — task/* branches + PR flow

**Decision:** All work happens on `task/*` branches, same as any other project using this workflow. `/its-alive` starts on `main`, cuts a branch; `/kill-this` pushes and opens a PR; `/its-dead` commits the session log to `main` after merge and deletes the branch.
**Why:** Seeds was on `main` (solo, no review surface) but this caused a recurring problem: skill copies in the seeds repo never got properly pushed, so `git pull` on other machines returned "already up to date." The PR merge acts as the natural forcing function — work isn't done until the PR merges, which guarantees everything is pushed. Also: seeds should eat its own dogfood. If the PR workflow is good enough to recommend, it's good enough to use here.
**Changed from:** Always on `main`. Changed 2026-05-01 after observing the push-discipline failure in practice.
**Tradeoff:** Slightly more ceremony per task. Worth it for the push guarantee and consistency.

---
