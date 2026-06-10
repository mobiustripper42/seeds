# Tiller pitch — Throughput velocity: measure the shipping rate, retire transcript-dependent hrs/pt

**Status:** draft proposal (Tiller overnight run, 2026-06-10). Eric is the gate — nothing here is merged.

---

## The pitch

### The idea

Stop measuring **effort-hours per point** and start measuring **points shipped per calendar
week**. The velocity apparatus has been rebuilt and walked back three times — DEC-S013 (single
seam), DEC-S015 (per-PR windows), DEC-S024 (active = wall − breaks) — and all three stayed inside
the same frame: *reconstruct how many hours Eric spent at the keyboard.* They keep failing on the
same root cause, which DEC-S024's own skill spells out:

> `/retro` Step 2.3 — "If the transcript is unreadable or missing, set `total_breaks_hours = 0`."

When breaks fall to zero, `active = wall_clock`. And `wall_clock` carries the overnight gaps
(these sessions span nights) — so the headline silently degrades to `wall / point`, the **one
number the guide explicitly forbids quoting as a velocity**. The PROJECT_PLAN velocity table
already confirms this is the *normal* case, not the edge: *"JSONL transcripts live on Linux paths
inaccessible from the local checkout, so the break-inference math … was skipped."* The metric the
whole `/retro` machine exists to produce is, in practice, unmeasurable for every session run from
the web or Desktop runner — which is most of them.

The reframe: hrs/pt was secretly doing **two jobs**, and neither one actually needs the transcript.

1. **Forecasting** — "how many calendar weeks until this phase closes?" Answered by **throughput**:
   points shipped per week × remaining points = an ETA. Source data = PR-merge / issue-close
   **dates** and `points:N` labels. All in GitHub, always accessible, robust to merge ordering.
2. **Estimate calibration** — "is my pointing consistent?" Answered by a **per-task surprise
   check** at retro (did the 5 feel like a 5; was anything re-estimated mid-flight). The
   "re-estimate when surprised" rule already half-does this. No hours required.

hrs/pt tried to be both and demanded effort-time it can't measure. Split the job and *both halves
read from data that's already there.*

### Why it's worth it

- **It deletes the fragile machine instead of patching it a fourth time.** `/retro` Step 2's
  transcript read, break inference, and the degenerate `breaks = 0` fallback all go away. Less
  code, fewer disclaimers, one honest number.
- **It produces a real number on every project, every week** — including the dozen sessions whose
  transcripts were never reachable. Today those contribute nothing; under throughput they're just
  merge dates in GitHub.
- **Forecasting actually comes back.** hrs/pt has not produced a usable forecast for this repo
  (the velocity table is all dashes and caveats). `points/week × remaining points` gives a
  calendar ETA from week one.
- **It rides infrastructure that already exists.** The nightly sync Routine already enumerates
  every repo; computing fleet-wide throughput is a read it can publish as a rolling issue — no new
  service, no new substrate.

### Why he hasn't already

`VELOCITY_AND_POKER_GUIDE.md` is built on classic agile velocity, where hrs/pt is *the* number
because in a team shop human-hours are the scarce capacity you're rationing. Eric has sunk ~140
points of workflow-building into that frame, so every failure read as "my *measurement* is broken,
fix the formula" — never "the *metric* is wrong for this shop." But in a solo+Claude shop the
labor isn't the scarce thing Claude does the building; the plannable quantities are *how fast work
clears* (throughput) and *whether estimates hold* (calibration). Stepping outside agile orthodoxy
to notice that hrs/pt answers a question this mode of working doesn't ask is exactly the move you
can't make from inside the frame you're maintaining. Three rebuilds is the tell: the model was
never the problem.

---

## The build handoff

A Claude Code session in `seeds` (with `gh` authed) can run this in one pass.

### Approach

Replace `/retro`'s effort-time math with two cheap reads, and rewrite the guide's Part 1 around
them. Keep `wall_clock` exactly where it is — an on-screen gut-check in `/its-dead` — but stop
calling it or anything derived from it a velocity.

- **Throughput (forecast number).** A phase's points ÷ its **calendar span in weeks**, where the
  span is `first issue createdAt → last issue closedAt` (already computed in `/retro` Step 2 for
  the session window). Headline unit: **points/week**. For the rolling cross-project number, sum
  points shipped per ISO week from PR-merge / issue-close dates over a trailing window.
- **Calibration (estimate health).** At retro, for each task ask the existing surprise question
  and tally: how many tasks were re-estimated, and net drift (Σ final − Σ original points). A tight
  spread = pointing holds; a wide one = it doesn't. This replaces the per-session h/pt scatter as
  the consistency test.
- **GitHub is back in the time loop — but only for dates.** DEC-S024 pulled GitHub out because
  per-PR *windows* were the bug. Merge/close *dates* are not windows; they don't assume merge
  ordering and can't sum past wall-clock. Reintroducing them is safe in a way the windows never
  were.

### File-by-file

- `dev/claude/skills/retro/SKILL.md` (+ `.claude/skills/retro/SKILL.md` live mirror, byte-identical)
  — rewrite Step 2: drop 2.3 (transcript/break inference) and 2.4 (active). New Step 2.3 =
  `phase_points`; Step 2.4 = `phase_weeks = (last closedAt − first createdAt)/7`,
  `throughput = phase_points / phase_weeks`. New Step 2.5 = calibration tally (re-estimated count +
  net drift) from PROJECT_PLAN's poker table + session notes. Update Steps 3/6/7/8/10 and the
  frontmatter `description:` that still says "computes wall_clock and active time … from the
  transcript JSONL."
- `dev/claude/docs/VELOCITY_AND_POKER_GUIDE.md` (+ `docs/VELOCITY_AND_POKER_GUIDE.md` mirror) —
  rewrite Part 1: velocity = points/week; "you don't log anything" now means *merge dates*, not
  *transcripts*; delete the active = wall − breaks definition and the break-inference paragraph;
  replace the per-session h/pt-spread calibration rule with the re-estimate tally. Keep Part 2
  (poker) intact.
- `dev/claude/scripts/velocity.py` → `throughput.py` — stop parsing RETROSPECTIVES active-hours;
  read points (issue `points:N` labels) keyed to merge/close dates via `gh`, print points/week
  trailing-N, per-phase, per-project, cross-repo via args. The `--issues` points histogram stays.
- `docs/RETROSPECTIVES.md` + the PROJECT_PLAN velocity table (template + the seeds copies) — swap
  the `Wall / Breaks / Active / h/pt(active)` columns for `Points / Weeks / pts-week / re-est'd /
  net-drift`. Per DEC-S024's precedent, **freeze** historical retro blocks as written (the old
  columns are a retired metric); throughput.py reads GitHub dates and is independent of old retro
  prose, so history needs no backfill.
- `docs/DECISIONS.md` — new **DEC-S026**, framed as *supersedes DEC-S024* with the two-jobs split
  as the rationale and the `breaks = 0 → active = wall` degeneracy as the trigger.
- `docs/SCHEMA_VERSIONS.md` + `seeds-version` — this changes a `/retro` contract and the velocity
  table columns, which the bump policy lists as bump triggers → **likely v5**. Eric's call; flag it,
  don't assume it (DEC-S024 chose "no bump" on a narrower change).

### Gotchas / risks

- **Points attribution is the load-bearing detail.** A PR can close 0/1/N issues; an issue may have
  no PR. Rule: credit points on the **issue's** `closedAt` with its `points:N` label (N issues on a
  PR sum naturally); a PR closing no labelled issue is skipped from throughput, not guessed. Spell
  this out in throughput.py and the guide.
- **Throughput is lumpy for a part-time solo dev** — some weeks ship zero. Quote a **trailing-4-week
  band**, not a single week, and reuse the guide's existing "use the ramp, not your best-ever"
  wisdom. A single hot week is not your velocity.
- **Name what it includes.** Throughput is capacity *including availability* — a slow week and a
  didn't-touch-it week look alike. That's correct for *calendar* forecasting (which is the
  question), but say so plainly so it's never mistaken for at-keyboard speed.
- **Even more project-shape-specific than hrs/pt.** Don't forecast a new project from another's
  throughput. The caveat already in the guide carries over, harder.
- **Don't reintroduce window math.** Merge dates only. If a future tweak starts pairing PR-open to
  PR-merge to recover "effort," that's DEC-S024's bug coming back — block it.

### Done when

- `/retro` Step 2 reads **no** transcript and computes points/week from issue dates; the
  `breaks = 0 → active = wall` path is gone from the skill.
- `throughput.py` prints a real points/week number from `gh` data on a repo with at least one
  closed phase (sailbook or bushel), with no RETROSPECTIVES parsing.
- Guide Part 1 defines velocity as points/week + the calibration tally; no active/break language
  survives; Part 2 untouched.
- DEC-S026 written (supersedes S024); the schema-bump decision is recorded either way.
- Template and live `.claude/` mirrors are byte-identical (the standing seeds invariant).

### Kickoff

> Read `docs/SPECS/2026-06-10-tiller-throughput-velocity.md`. Implement DEC-S026: retire
> transcript-based active-time velocity and replace it with throughput (points/calendar-week) from
> GitHub issue/PR dates, plus a retro estimate-calibration tally. Start by drafting the DEC-S026
> entry and the rewritten `/retro` Step 2, then we'll poker the rest before touching the guide,
> `throughput.py`, and the doc tables. Flag the schema-version call (likely v5) for me.
