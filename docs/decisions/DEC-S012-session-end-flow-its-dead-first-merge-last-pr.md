---
id: DEC-S012
title: "Session-end flow — `/its-dead` first, merge last; PR-flow default on protected `$WORKING_BRANCH`"
topic: "Session lifecycle & skills"
---

## DEC-S012: Session-end flow — `/its-dead` first, merge last; PR-flow default on protected `$WORKING_BRANCH`

**Date:** 2026-05-12
**Status:** Accepted

**Context.** Three concrete failures from the post-DEC-S005 era forced a clean redesign of the session-end sequence:

1. **Stranded session logs.** `/its-dead` Step 5.2 had two paths for `STATE=MERGED` (user merged the PR between `/kill-this` and `/its-dead`) — both required pushing the finalize commit somewhere. On protected `$WORKING_BRANCH` (the post-merge target), the direct push returned 403; the session log got pushed to the just-merged-and-orphaned branch, where it sat forever (S15, Task 19). The `STATE=MERGED`-mid-session path was always a special case for a sequence the workflow shouldn't recommend in the first place.

2. **Cheerful close on `STATE=OPEN`.** The closing summary said "Session N closed" identically whether the PR was MERGED, OPEN, or NO_PR. Users read success and walked away, leaving PRs sitting overnight (S22 → PR #24, merged 36+ hours late after the next session caught it).

3. **`NO_PR` legacy path on protected main.** DEC-S005's "always on main while solo" pre-dates branch protection. When a session ran without a PR (e.g. `/kill-this` Step 4.2 skipped due to missing `gh` + MCP), `/its-dead`'s NO_PR cleanup tried to direct-push to `$WORKING_BRANCH`, got 403, and had no in-flow fallback (PR #24 documented this verbatim).

**The reordered flow.**

```
1. /kill-this — opens PR with draft session entry. Captures pr_number, pr_url, pr_opened_at into session frontmatter.
2. /its-dead  — pushes finalize commit (wall_clock + dev_time + body sections) to the SAME branch. PR auto-updates. Closing summary tells user how to merge.
3. User merges — `gh pr merge <N> --merge --delete-branch` or GitHub UI. Branch deletes at merge time (GitHub's job, not the skill's).
4. Next /its-alive — Step 7.5 backfills review_time on the prior session by reading the now-MERGED PR's merged_at.
```

The user merging AFTER `/its-dead` is the keystone. It eliminates the `STATE=MERGED`-mid-session race, gives the session log a definite landing place (the open PR), and shifts branch cleanup to GitHub's --delete-branch handler.

**The `NO_PR`-on-protected-main fallback.** When `/its-dead` Step 5.2 enters the legacy NO_PR path, it probes `$WORKING_BRANCH` protection first. If protected, the skill opens a "Session N close-out" PR from the session branch instead of trying to direct-push. The session effectively ends in `STATE=OPEN` regardless of how it started — protected `$WORKING_BRANCH` makes PR-flow the only viable shape.

**What DEC-S005 still covers.** DEC-S005 (always on main while solo) is now scoped to projects where `$WORKING_BRANCH` is unprotected. The CC platform's `claude/<slug>` auto-branching + protected `main` + branch protection rules on org repos means the de-facto default has already shifted to PR-flow. DEC-S005's direct-push is the unprotected-main fallback, not the primary path.

**Wall clock / dev time / review time.** The reordering created the seam to capture three time fields rather than one. The session splits in two at `pr_opened_at`:

- `wall_clock` = `/its-dead` end − `/its-alive` start. Raw.
- `dev_time` = `pr_opened_at` − `started`, minus inferred breaks within that window.
- `review_time` = `ended` − `pr_opened_at`, minus inferred breaks within that window.

Break inference walks the transcript JSONL(s) and counts any gap > 15 min as idle. A gap's start timestamp picks which window it belongs to. Manual user adjustments (`/its-dead subtract 30 minutes for time away from desk`) apply on top, with the user clarifying which window if ambiguous.

If `pr_opened_at` is unset (`STATE=NO_PR` — `/kill-this` never opened a PR), the session is treated as one window: `dev_time = wall_clock - all_breaks`, `review_time = 0`.

The merge happens AFTER `/its-dead` (the DEC-S012 reorder) — so merge time is *not* part of `review_time`. `review_time` here measures in-session review work (addressing `@code-review` findings, drafting the log, running `/its-dead`), not GitHub-PR-pending-merge wall time.

All three fields are populated at `/its-dead` close, no backfill needed. `duration:` stays as a synonym for `dev_time:` for legacy velocity-table readers.

**Consequences.**
- `/ship-it` was on the template skills table but never built — folded into `/its-dead` + manual merge.
- The "everything is closed" closing summary line is now `STATE`-conditional. `OPEN` says "merge to ship," `MERGED` says "version bumped + branch cleaned," `NO_PR` says "cleaned up branch." No more flat success when a PR sits waiting.
- `/its-alive` Step 0.5 scans for orphan-branches-without-PRs at session start, catching any work that fell through the cracks of a prior session.
- Three new frontmatter fields per session: `wall_clock`, `dev_time`, `review_time` — all populated at `/its-dead` close from the `pr_opened_at` seam. `/retro` reads all three to compute three velocities: points/wall_clock, points/dev_time, points/review_time.

**Trade-offs.** The user is on the hook for one extra step (merge after /its-dead) that the original convention had them do mid-session. The benefit: no orphaned commits, no overnight-PR surprises, no "everything is closed" misreports. The cost: a 5-second `gh pr merge` after `/its-dead` prints its closing line.

**Migration.** Existing projects pick up DEC-S012 via the nightly Routine (forward-port of the four skill files + this CLAUDE.md template change). No data migration — the new frontmatter fields are additive and optional; sessions written before DEC-S012 stay readable.

**Supersedes:** DEC-S005's direct-push convention (now scoped to unprotected `$WORKING_BRANCH` only).

---
