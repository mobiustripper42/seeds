---
id: DEC-S008
title: "Staging promotion via ff-merge, not PR"
topic: "Branches, versioning & release"
---

## DEC-S008: Staging promotion via ff-merge, not PR

**See also** — later decisions that changed part of this one:
- Superseded by DEC-S022

> **⚠ SUPERSEDED by DEC-S022 (2026-06-01).** The staging-flow model made the *active* branch (`staging`) the *non-default* branch. The nightly sync reads each project's default branch (`main`) but PR'd downstream into `staging`, so on the one repo that adopted staging (sailbook) a permanent main↔staging gap was re-proposed as "drift" every night (sailbook PR #75). DEC-S022 inverts the model: `main` is always the active trunk, and an optional `production` branch is the downstream deploy pointer. The text below is retained for history; the `origin/staging` detection it describes has been removed from `/kill-this`, `/retro`, `/bump-major`, `/its-alive`, and the nightly routine, and `/promote-staging` is replaced by `/promote-production`.

**Decision:** When a project has a `staging` branch, `/kill-this` PRs into `staging` (not `main`). Promotion to `main` happens via `/promote-staging` which fast-forward-merges `staging` into `main`, tags the release with the version currently in `package.json`, and pushes both branches and the tag. No PR opens for the staging→main step.

**Detection — "is staging in use?":** `git show-ref --verify --quiet refs/remotes/origin/staging` returns 0 if the local cache has the ref. Used by `/kill-this` (PR base), `/its-dead` (merge target detection), `/retro` and `/bump-major` (working branch resolution), and `/promote-staging` (gating). Local-cache check rather than `git ls-remote` so the skills work offline — `/its-alive` already fetched at session start, so the cache is fresh.

**Why:** Solo dev — there is no second reviewer for the staging→main promotion, so a PR adds ceremony without adding signal. The work was already reviewed when each task PR landed in `staging`. Fast-forward keeps history linear; if staging diverges from main (shouldn't happen but possible), `/promote-staging` STOPs and asks rather than auto-merging.

**Tradeoff:** No GitHub UI moment to inspect the promotion before it ships. Acceptable — anything worth re-inspecting should have been caught at the staging PR. The Vercel deploy hook on `main` is still the deploy moment.

**Alternatives considered:** Open a staging→main PR and self-merge (rejected — empty ceremony, every promotion would auto-approve); merge commit instead of ff (rejected — adds a "Merge branch 'staging'" commit on every promotion that conveys nothing).
