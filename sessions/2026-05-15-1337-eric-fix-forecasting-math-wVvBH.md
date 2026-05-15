---
session: 27
dev: eric
slug: fix-forecasting-math-wVvBH
branch: claude/fix-forecasting-math-wVvBH
started: 2026-05-15T13:37:58Z
ended:
points:
pr_numbers: [44]
status: open
transcript: /root/.claude/projects/-home-user-seeds/537f2c46-f867-45ae-a82f-66823369d04c.jsonl
---

# Session 27 — fix-forecasting-math-wVvBH

<!-- Task blocks appended by /kill-this, one per task. -->

## Task 1: Fix retro dev/review boundary (bushel forecasting math)

**Completed:**
- `dev/claude/skills/retro/SKILL.md` Step 2.5: `min(all pr.createdAt)` → `max(all pr.createdAt)` for the dev window. The dev/review boundary is now the **last** `/kill-this` of the session, not the first.
- `review_time` formula re-anchored on `max(pr.createdAt)` for all three sub-cases (merged-after-`/its-dead`, merged-in-session, closed-unmerged).
- Defined `Post-dev-window = [max(pr.createdAt), ended]` inline.
- Simplified in-session merged-PR sub-formula from `(merged_at − max(max(pr.createdAt), created_at))` clamped at 0 to `max(0, merged_at − max(pr.createdAt))` — semantically equivalent, no nested max. Added a sentence noting the clamp is load-bearing (absorbs dev-overlapped review), not a clock-skew guard.
- Notes section now flags the artifact, names bushel Phase 3 (0.15 dev vs 0.35 active), and tells historical retros to forecast against `wall_clock − breaks` instead of the broken `dev/pt`.
- Single-PR sessions unaffected — formula collapses to the pre-fix shape when `min = max`.

**Code review:** @code-review (Sonnet) caught two issues on first pass: ambiguous clamp semantics on the in-session merged-PR sub-formula, and an undefined "post-dev-window" term. Both addressed in 6e68294. Clean on second pass.

**PR:** [#44](https://github.com/mobiustripper42/seeds/pull/44)
**Points:** 2
**Branch:** claude/fix-forecasting-math-wVvBH
**Opened at:** 2026-05-15T13:42:00Z

**Next Steps:**

**Context:**
