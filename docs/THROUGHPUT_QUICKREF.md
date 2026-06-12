# Throughput — quick reference

Plain-language guide to the velocity numbers. This is the *how to read it* page;
the *why* lives in `docs/DECISIONS.md` (DEC-S026). Tool: `dev/claude/scripts/throughput.py`.

## What changed (if you remember the old way)

We used to measure **hours per point** (`active = wall − breaks`, dug out of the
session transcript). That's retired — the transcript was usually unreachable, so the
number kept rotting. Now velocity is **throughput: points shipped per calendar week**,
read straight from GitHub issue close-dates + `points:N` labels. Nothing to log; it
recomputes from data GitHub already holds.

## Run it

From your seeds checkout, point it at one or more project paths:

```bash
python3 dev/claude/scripts/throughput.py ~/bushel
python3 dev/claude/scripts/throughput.py ~/bushel ~/muster ~/helm   # cross-repo rollup
python3 dev/claude/scripts/throughput.py --issues ~/bushel          # + points histogram
python3 dev/claude/scripts/throughput.py --self-test                # offline sanity check
```

Needs `gh` installed and authed. A project with no `points:N`-labelled closed issues
prints "nothing to measure" (it predates the labelling ritual) — not an error.

## Reading the output (four sections)

**1. Active-weeks throughput — the headline.** Two lifetime rates:
- `pts / calendar-week` — realized pace, *including* idle weeks.
- `pts / active-week` — intensity in the weeks you actually shipped.

> bushel: `37 pts/calendar-week`. Read it as: *a bushel-sized phase of ~37 points is
> about one active week of clearance.*

**This is an active-time rate, not a calendar date.** To forecast "when will it ship,"
divide by *your* real availability — the tool measures the work, you supply the calendar.

**2. Per phase — points, pointing stability, span.**
- `pts/issue` is your **estimation-consistency** signal. A tight range = you're pointing
  consistently; a drifting one = scope growing or points inflating. The tool prints a
  `tight` / `drifting` verdict.
- `pts/wk` shows only for phases spanning **≥7 days**. Shorter phases say `burst` — a
  phase done in an afternoon has no meaningful weekly rate.

> bushel: `pts/issue 2.29–3.60 across 9 phases — tight`. Translation: your estimates
> hold their value. That's the number to watch over time.

**3. PR merge latency — flow health, NOT effort.**
Median + p85 hours from PR-open to merge. It answers "do my PRs sit unmerged?" —
**not** "how long does a 5-pointer take." (The PR opens *after* the build is done, so
this can't see build time; it's flat across task sizes by design.)

> bushel: `median ~0.7h, p85 ~7h` — PRs don't pile up. That's all it tells you.

**4. Histogram (`--issues`).** Count of closed issues per point value — a pointing-habit
view (lots of 2s? any 13s?). Not joined to time.

## Four things not to forget

1. **Active-time, not calendar.** A slow week and a vacation week look identical. Correct
   for "when does it ship"; never read it as at-keyboard speed.
2. **It's coarse.** Solo work is bursty — treat the number as ±50% ("ships in ~5–8 weeks"),
   never a precise date.
3. **Retroactive only to the labelling ritual.** A project from before you used `points:N`
   is invisible (sailbook returns nothing). It doesn't reach further back than the labels.
4. **Never forecast a new project from another's throughput.** Project shapes differ too
   much. The numbers describe the project you ran them on, full stop.

## Where the rest lives

- **Full rationale + what was tried and rejected:** `docs/DECISIONS.md` → DEC-S026.
- **The phase-end ritual that records throughput:** `/retro` (Step 2).
- **Methodology guide** (`docs/VELOCITY_AND_POKER_GUIDE.md`): Part 1 still describes the
  old hrs/pt model — **stale, rewrite pending.** Trust this page until that's done.
