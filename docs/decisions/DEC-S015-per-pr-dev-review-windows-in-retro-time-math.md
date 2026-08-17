---
id: DEC-S015
title: "Per-PR dev/review windows in retro time math"
topic: "Velocity, retro math & throughput"
---

## DEC-S015: Per-PR dev/review windows in retro time math

**See also** — later decisions that changed part of this one:
- Superseded by DEC-S024

**Date:** 2026-05-17
**Status:** Accepted
**Supersedes the math** introduced in `/retro` Step 2.5 by DEC-S013 (single-seam at `min(pr.createdAt)`) and amended by the 2026-05-15 fix (single-seam at `max(pr.createdAt)`).

**Context.** Under DEC-S013, multi-PR sessions are the norm — a single Claude window may ship 8–10 PRs via N `/kill-this` calls. The original Step 2.5 collapsed the session to a single dev/review seam, first at `min(pr.createdAt)` (first `/kill-this`), then after the 2026-05-15 fix at `max(pr.createdAt)` (last `/kill-this`). Both versions had the same structural flaw: there is no single moment where "dev" ends and "review" begins in a multi-PR session. PRs 1..N-1 are reviewed and merged while PR_N is being built.

Bushel Phase 3 surfaced the symptom under the `min` formula (dev_time grossly under-counted, review_time over-counted). Phase 4+ retros under the `max` formula showed the inverse: dev_time = 0.035 h/pt is implausibly fast because the formula stuffed all post-last-PR time into review and treated all pre-last-PR time as dev, including the time spent reviewing PRs 1..N-1.

The retro skill correctly self-flagged the artifact ("DEC-S013 method artifact (10 PRs in 2 sessions); do not trust as headline") and pointed users at `Active = wall_clock − breaks` as the honest headline. But that's a workaround, not a fix — `dev_time/pt` and `review_time/pt` should both be meaningful.

**Decision.** Each PR gets its own dev_window and review_window. Sum across all PRs in the session.

For each PR_i (sorted by `createdAt`):
- `dev_window_i = anchor_i → PR_i.createdAt` where `anchor_i = started` (first PR) or `PR_{i-1}.mergedAt` (subsequent PRs).
- `review_window_i = PR_i.createdAt → effective_merge_i` where `effective_merge_i = min(PR_i.mergedAt, ended)`.
- Trailing review window = `last_in_session → ended` for session close-out.
- Per-window break inference from transcript JSONL gaps > 15 min.

```
dev_time     = Σ max(0, dev_window_i − dev_breaks_i)
review_time  = Σ max(0, review_window_i − review_breaks_i) + trailing
```

**Honest accounting of concurrency.** When PR_{i} opens before PR_{i-1} merges (concurrent work), `dev_window_i` clamps at 0 — the time is real but it overlapped review of PR_{i-1} and is counted there. The user wasn't doing pure dev during that overlap; they were context-switching.

**Edge cases handled cleanly:**
- N=0 (no PRs): `dev_time = wall_clock − breaks`, `review_time = 0`.
- N=1 (single-PR session): formula collapses naturally — dev = `started → opened`, review = `opened → merged`, trailing = `merged → ended`.
- PR merged post-session: review_window caps at `ended`.
- PR still open at retro time: review_window also caps at `ended` (likely contains an open PR not yet reviewed).
- PR closed without merge: count `opened → closed` as review (the time was spent on it).

**Sanity invariant.** `dev_time + review_time + Σ break minutes ≈ wall_clock` for any N. If the formula drifts more than 0.1 h from this after rounding, the retro surfaces the discrepancy in Notes.

**Consequences.**
- `dev_time/pt` and `review_time/pt` become trustworthy as headline numbers for forecasting (no more "do not trust" caveat in the retro PM commentary).
- Historical retro numbers run under the single-seam formula are method artifacts. Pre-DEC-S015 multi-PR sessions have under-reported (or over-reported, depending on the version) dev_time/review_time. The notes in `/retro` flag this; cross-phase comparisons should normalize against `Active = wall_clock − breaks` for any pre-DEC-S015 phase.
- One additional `mergedAt` lookup per PR at retro time. Already fetched by Step 2 for `review_time` purposes — no new API calls.
- The retro skill PM commentary no longer needs the "DEC-S013 method artifact" caveat once all sessions in a phase are post-DEC-S015.

**Trade-offs.** More math, longer Step 2.5. Each PR contributes 2-3 sub-computations. Worth it: the headline numbers become trustworthy. The previous "use active as the headline" workaround was the skill apologizing for its own model — the model itself was the bug.

**Migration.** No data migration. Pre-DEC-S015 retros stay as-written; their notes already flag the artifact. Future retros use the per-PR formula automatically once this lands. Routine forward-ports to bushel, captains-log, helm, sailbook on next nightly run.

---
