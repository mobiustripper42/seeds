# `observations` — the accumulating record (DEC-S039)

Orphan branch. It has no shared history with `main` and never merges into it. Nothing here is
policy: `dev/claude/**` on `main` is authoritative for what the workflow should do, and nothing
reads this branch at session time. **Evidence is not policy.**

Reachable from a seeds checkout as `.observations-worktree/`, which `main` gitignores:

```bash
git worktree add .observations-worktree observations
```

## Layout

```
observations/
  README.md                        # this file
  LEDGER.md                        # one row per PATTERN — the accumulating judgment
  2026-08-06-muster-time-clock.md  # INBOX: unread by @workout
  2026-08-06-bushel-catalog-units.md
  archive/
    2026-07/…                      # consumed — every verdict, not just promoted/dismissed
```

## Who writes what

| Actor | Writes | Runs where |
|---|---|---|
| `@tape-reader` via `/read-the-tape` | one observation file per run, always — a clean run included | in a project |
| `@workout` via `/workout` | ledger rows; moves the whole inbox to `archive/` | in seeds |

Append-only by construction. One file per run, named `YYYY-MM-DD-<repo>-<slug>.md`, so two
projects writing the same day never touch the same path and there is nothing to merge. Push
directly — no PR. There is no review gate on data that changes no behaviour.

## Directory position is the state

A file sitting in `observations/` is **unread**. After a `@workout` cycle it moves to
`archive/YYYY-MM/` — **regardless of verdict, held included.** No status field, nothing to keep in
sync, and the move is atomic in git.

**The ledger is what accumulates; observations are consumed.** Archiving only what was promoted or
dismissed would leave every *held* observation in the inbox forever, so the working set would grow
without limit and each cycle would re-derive the same judgment from the same raw evidence. A cycle
reads **the inbox plus `LEDGER.md`, never the archive** — so its cost scales with what happened
since the last run, not with how long the loop has been running.
