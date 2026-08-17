---
id: DEC-S022
title: "`main` is the active trunk; `production` is the deploy branch (replaces DEC-S008)"
topic: "Branches, versioning & release"
---

## DEC-S022: `main` is the active trunk; `production` is the deploy branch (replaces DEC-S008)

**See also** — decisions this one changed part of:
- Supersedes DEC-S008

**Decision:** Every project's **default branch (`main`) is the always-active development trunk**. Deployable projects add an optional **`production`** branch that the host (Vercel, etc.) watches; shipping is `main` → `production` via fast-forward merge through the new `/promote-production` skill. This replaces the DEC-S008 staging-flow, where the active branch was `staging` (non-default) and `main` was the release branch.

**Why (the bug it fixes):** the nightly sync Routine (DEC-S010) and the dev skills read/operate on each project's **default branch**. DEC-S008 made the *active* branch the *non-default* one, so the read-source (`main`) and the PR-target (`staging`) diverged. On sailbook — the only repo that adopted staging — `main` was frozen on an old workflow generation while `staging` carried the current one. Every nightly downstream run diffed stale `main` against seeds, generated a large "forward-port everything" plan, then opened the PR against `staging` (which already had that content), so the net diff collapsed to cosmetic regeneration noise that the next run re-detected — a self-perpetuating loop (sailbook PR #75, 2026-06-01). Aligning active = default eliminates the split at the source: the branch we diff is the branch we target.

**The model:**
- `main` — active trunk, in every project. `/kill-this` PRs here; `/retro`, `/bump-major`, `/its-alive` resolve `main` as the working branch. Identical dev workflow whether or not a project deploys.
- `production` — optional downstream deploy pointer. Never read or targeted by sync; never a PR base. Adopt with `git checkout -b production main && git push -u origin production`, then point the host's production branch at it.
- **Tags land on `main` at bump time** (uniform — DEC-S007). Promotion carries the already-tagged commit; `/promote-production` does not tag.
- **Sync always targets the default branch** — `origin/staging` detection removed from all skills + the routine.

**Detection:** `/promote-production` gates on `origin/production` existing (the only skill that cares). No skill changes behavior based on branch topology otherwise — the trunk is always the default branch.

**Anti-churn hardening (folded into `@sync-config`):** to stop a branch-gap or regeneration from ever manifesting as a noise PR again — (a) formatting-only hunks (whitespace, indentation, tabs/spaces, table-separator padding) are dropped before classification; (b) real applies are transcribed verbatim, never paraphrased; (c) a post-apply no-op guard reverts and stages nothing if the whitespace-ignored diff is empty; (d) PR/report tables are derived from the actual staged diff, not from intended changes.

**Migration:** schema bump v3 → v4 (skill rename + branch-convention change). Per-project: rename `/promote-staging` → `/promote-production`, and for any project on the old staging-flow, promote `staging` content onto `main`, cut `production` off it, repoint the host's production branch, and delete `staging`. See `docs/SCHEMA_VERSIONS.md` § v3 → v4. Single-branch projects (no staging) are behaviorally unchanged — they already worked on `main`; they only pick up the skill rename.

**Tradeoff:** `main` now receives every WIP commit, so on deployable projects the host's production branch **must** be repointed from `main` to `production` before `main` starts taking active work — otherwise WIP auto-deploys to prod. This is the one manual, host-side step the migration can't automate. Acceptable: it's a one-time per-deployable-project action, and it's exactly the trunk-based-development + release-branch pattern most teams already use.

**Alternatives considered:** Make the sync resolve and target the active branch per-repo (rejected — keeps the non-default-active inversion and needs per-repo config; treats the symptom, not the cause). Keep `/promote-staging`'s name and only change its internals (rejected — the name would lie about what it does). Stay at schema v3 and let the rename flow unmanaged (rejected — a renamed skill pulled without migration leaves the old `/promote-staging` orphaned in projects).

---
