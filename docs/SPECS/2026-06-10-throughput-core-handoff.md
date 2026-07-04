# Handoff — Throughput velocity, 5-point core (DEC-S026)

**Status:** execute-ready handoff. Written 2026-06-10 for a *separate* build session.
**Parent pitch:** PR #109 `docs/SPECS/2026-06-10-tiller-throughput-velocity.md` (the full Tiller proposal). This doc is the **narrowed, validation-first slice** of it — build the core, prove it against real data, *then* decide whether to do the doc/table sweep.

This doc is self-contained. You do not need the PR or any prior chat to execute it.

---

## The one-line idea

Retire **effort-hours per point** (`active = wall − breaks`, reconstructed from session transcripts) and replace it with **throughput: points shipped per calendar week**, computed from GitHub issue/PR dates + `points:N` labels. hrs/pt kept failing because the transcript it needs is usually unreachable (`breaks = 0 → active = wall_clock`, the one number the guide forbids). Dates + labels live in GitHub forever, so throughput is measurable on every repo — *and reconstructable retroactively*.

Read the full "why" in PR #109's spec if you want it. The build below is what matters.

---

## Strategy: validate before you sweep

The expensive, irreversible work is rewriting the guide, the RETROSPECTIVES/PROJECT_PLAN tables, and bumping the schema. **Do none of that first.** The open question is empirical: *at solo part-time volume, is points/week a usable signal or is it dominated by 1–2 noisy data points?*

So the build order is:

1. **Build `throughput.py`** (net-new, touches nothing else).
2. **Run it against `bushel`** (72 points-labelled closed issues — the richest history in the fleet) and `crewbook`/`muster`/`helm` (20/20/13). **Look at the actual numbers.**
3. **Decision gate (Eric):** does the trailing band tell a story you'd plan against? 
   - **Yes** → proceed to the retro Step 2 rewrite + DEC-S026, then schedule the doc/table sweep as a follow-up task.
   - **No / too noisy** → widen the window (trailing 8–12 wk), or stop — you've spent one script, not a schema migration.

Everything after step 2 is gated on a human looking at real output. That's the whole point of slicing it this way.

---

## Grounded facts (verified 2026-06-10 against `main`)

- `seeds-version` = **4**. A `/retro` contract change + table-column change are listed bump triggers → **likely v5**, but **DEC-S024 chose "no bump" on a comparable change**. This is Eric's call — flag it, don't assume.
- Latest decision in `docs/DECISIONS.md` = **DEC-S025**. New decision is **DEC-S026** (free). DEC-S026 *supersedes DEC-S024*.
- **DEC-S025 is unrelated** (it's the `DEC-S` prefix-naming decision) — no conflict, but follow its convention: this is a seeds-workflow decision, so it's `DEC-S026` everywhere it's referenced.
- **velocity.py** lives at `dev/claude/scripts/velocity.py` (template only — no `.claude/scripts/` mirror exists). It currently parses `docs/RETROSPECTIVES.md` for active hours. Keep its `issue_histogram()` / `--issues` logic and CLI shape; replace the RETROSPECTIVES parsing with date+label reads.
- **Retro skill has TWO copies:**
  - `dev/claude/skills/retro/SKILL.md` (template, 13,248 bytes)
  - `.claude/skills/retro/SKILL.md` (seeds' own dogfooded live install, 15,336 bytes)
  - **⚠️ They are NOT byte-identical right now** (~2 KB apart). The PR spec asserts "byte-identical mirrors." Before editing, **diff them** and decide: is the divergence intentional (seeds-project customization) or drift? Edit both consistently; don't blindly assume they should end up identical.
- **Guide has two copies:** `dev/claude/docs/VELOCITY_AND_POKER_GUIDE.md` (template) + `docs/VELOCITY_AND_POKER_GUIDE.md` (seeds copy). **Deferred** — not in this slice.
- Current retro **Step 2** ("Per-session time math") is the block to rewrite. Sub-steps: 2.1 read frontmatter, 2.2 wall_clock, **2.3 break inference from transcript**, **2.4 active_time**, 2.5 per-session line. Steps 2.3 + 2.4 (and the transcript dependency) are what die.

### Fleet data availability (why retroactive works)

Throughput needs only `closedAt` + `points:N` label — both permanent in GitHub. Surveyed:

| Repo | Closed issues | Points-labelled | Historic throughput |
|------|--------------:|----------------:|---------------------|
| bushel | 83 | **72** | ✅ best test case |
| crewbook | 20 | 20 | ✅ |
| muster | 21 | 20 | ✅ |
| helm | 13 | 13 | ✅ |
| sailbook / grace / chiplog | 0 | 0 | ❌ never used the issue+label ritual |
| seeds | — | none | ❌ uses DEC-S IDs, not points issues |

Repos at 0 were dark to hrs/pt too — not a throughput limitation.

---

## In scope (the 5-point core)

### 1. `throughput.py` — new script (rewrite of `velocity.py`)

Replace `dev/claude/scripts/velocity.py` (rename to `throughput.py`; `git mv`). Reads GitHub via `gh`, **never** parses RETROSPECTIVES.

**Inputs (all via `gh`, per repo):** closed issues with `points:N` labels and their `closedAt` dates.

**Points-attribution rule — LOAD-BEARING, spell it out in code comments and the eventual guide:**
- Credit a task's points on the **issue's `closedAt`**, using its `points:N` label.
- A PR closing **N labelled issues** → those N issues each credit on their own `closedAt` (they sum naturally; don't also count the PR).
- A PR (or issue) closing **no labelled issue** → **skipped**, not guessed.
- This keys throughput to issues, not PRs — robust to the "merge PRs in any order" workflow (DEC-S022).

**Outputs:**
- **Per ISO week:** points shipped (sum of `points:N` for issues closed that week).
- **Trailing-band headline:** points/week over a **trailing-4-week window** (make window a CLI flag, default 4; you'll want to try 8 and 12 on bushel). **Quote a band/range, never a single hot week.**
- **Per-phase** (group by `phase:N` label): points ÷ calendar weeks, where weeks = `(last closedAt − first createdAt)/7` for that phase's issues.
- **Per-repo and cross-repo** (multiple repo args), same as velocity.py's combined rollup.
- Keep `--issues` points histogram (it's a pointing-habit view, unchanged).

**CLI shape (preserve velocity.py's ergonomics):**
```
python3 throughput.py [REPO_PATH ...]          # default: cwd
python3 throughput.py --window 8 ~/GitHub/bushel
python3 throughput.py --issues ~/GitHub/bushel
```
Note: velocity.py took repo *paths* and read files; throughput.py needs `gh` against each repo. Use `gh ... --repo` or `cwd=` per repo (velocity.py's `issue_histogram()` already does `cwd=repo` — follow that pattern). Handle "no labelled issues" gracefully (sailbook/grace return empty — print a clean "no points-labelled issues" line, don't crash).

**Reuse from velocity.py:** the `--issues` histogram, the cross-repo combined rollup, the "sum then divide, never average ratios" discipline, the clean-skip-on-missing-data pattern.

### 2. `/retro` Step 2 rewrite (BOTH skill copies — see mirror warning)

Rewrite "Step 2 — Per-session time math":
- **Delete 2.3** (break inference from transcript) and **2.4** (active_time). Remove the `breaks = 0 → active = wall` fallback entirely — it's the bug that triggered this.
- **Keep wall_clock** (2.2) but only as the `/its-dead` on-screen gut-check — stop calling it or anything derived from it a velocity.
- **New Step 2.3** = `phase_points` (sum of `points:N` on the phase's closed issues).
- **New Step 2.4** = `phase_weeks = (last closedAt − first createdAt)/7`; `throughput = phase_points / phase_weeks`. (The phase window is *already computed* in the current Step 2 header — reuse it.)
- **New Step 2.5** = calibration tally: from PROJECT_PLAN's poker table + session notes, count tasks re-estimated mid-flight and net drift (Σ final − Σ original points). This is the estimate-health signal that replaces the per-session h/pt spread.
- Update the frontmatter `description:` (currently says it computes wall_clock/active from transcript JSONL) and any downstream Step 3/6/7/8/10 references to active/breaks.
- **No transcript is read anywhere in Step 2 after this.**

### 3. `docs/DECISIONS.md` — DEC-S026

Skeleton (fill in fully):

```markdown
## DEC-S026: Throughput (points/calendar-week) replaces transcript-based active-time velocity (supersedes DEC-S024)
**Decision:** Velocity = points shipped per calendar week, computed from GitHub issue
`closedAt` dates + `points:N` labels. The transcript-dependent `active = wall − breaks`
model (DEC-S024) is retired. hrs/pt secretly did two jobs — forecasting and estimate
calibration — and neither needs the transcript: forecasting → throughput; calibration →
a per-task re-estimate tally at retro.

**Why:** DEC-S024's own skill sets `total_breaks_hours = 0` when the transcript is
unreadable, which makes `active = wall_clock` — overnight gaps and all — i.e. the
`wall/pt` number the guide forbids. Transcripts live on inaccessible paths for ~every
web/Desktop session, so the headline degraded to the forbidden number as the *normal*
case. Three rebuilds (DEC-S013 → S015 → S024) all stayed inside "reconstruct keyboard
hours" and all died on the same root cause. The metric, not the formula, was wrong for a
solo+Claude shop: Claude does the labor, so effort-hours aren't the scarce quantity —
calendar clearance rate and estimate stability are.

**What changes:** [retro Step 2 rewrite; velocity.py → throughput.py; guide Part 1;
RETROSPECTIVES + PROJECT_PLAN table columns — note which land in this slice vs deferred]

**Merge dates only — never re-pair PR-open → PR-merge.** That window math is exactly
DEC-S024's bug. Dates are not windows; they can't sum past wall-clock or assume merge
ordering.

**Historical retros stay as written** (DEC-S024 precedent). throughput.py reads GitHub
dates and is independent of old retro prose — history needs no backfill; it recomputes.

**Schema:** [v5 bump? — Eric's call; DEC-S024 chose no-bump on a comparable change]

**Alternatives considered:** patch the break inference a fourth time (rejected — three
rebuilds is the tell the metric is wrong, not the formula). Keep hrs/pt and add
throughput alongside (rejected — two velocities, one unmeasurable, is the noise DEC-S024
already cut).
```

---

## Explicitly deferred (NOT in this slice — schedule after the decision gate)

- `VELOCITY_AND_POKER_GUIDE.md` Part 1 rewrite (both copies). Part 2 (poker) untouched regardless.
- `docs/RETROSPECTIVES.md` + PROJECT_PLAN velocity-table column swap (`Wall/Breaks/Active/h-pt` → `Points/Weeks/pts-week/re-est'd/net-drift`). **Freeze** historical blocks (DEC-S024 precedent).
- The **schema-version bump decision** (v5?) — record it in DEC-S026 either way, but the actual `seeds-version` edit + SCHEMA_VERSIONS entry can ride with the doc sweep.

Keeping these out means the core slice touches: `throughput.py` (new), 2× retro `SKILL.md`, `DECISIONS.md`. That's it.

---

## Gotchas / risks (read before coding)

- **Signal-to-noise is the real risk, not correctness.** Team velocity smooths over 6 people × 40 pts/sprint. A solo part-time dev ships ~3–15 pts in a good week, 0 in others — one good weekend can swing the band 2×. This is *why* the validation step exists. Expect to need a trailing-8-or-12-week window and to treat the output as ±50% coarse ("closes in ~5–8 weeks"), not a date. If bushel's band is dominated by one or two weeks, that's the finding — report it, don't paper over it.
- **Throughput is capacity *including availability*.** A slow week and a vacation week look identical. That's *correct* for calendar forecasting (the question is "when does it ship," and your availability is the actual constraint in a solo+AI shop) — but name it plainly so it's never mistaken for at-keyboard speed.
- **Throughput alone rots; the calibration tally is load-bearing.** Without it, the point-unit drifts (points quietly shrink, "velocity" rises). Don't drop Step 2.5.
- **Merge dates only.** If any future tweak starts pairing PR-open → PR-merge to recover "effort," that's DEC-S024's bug returning. Block it.
- **Even more project-shape-specific than hrs/pt.** Never forecast a new project from another's throughput. The guide's existing caveat carries over, harder.
- **Mirror byte-identity is unverified** (see Grounded facts). Diff the two retro `SKILL.md` copies before editing both.

---

## Done when (core slice only)

- `throughput.py` prints a real points/week trailing band from `gh` data on **bushel** (≥1 closed phase), with **no RETROSPECTIVES parsing**. Cross-repo arg works; `--issues` histogram preserved; empty-repo case handled cleanly.
- Eric has looked at bushel/crewbook/muster/helm output and made the go/no-go call on signal quality.
- *(If go:)* `/retro` Step 2 reads **no transcript**; computes points/week from issue dates + a calibration tally; the `breaks = 0 → active = wall` path is gone from **both** skill copies (edited consistently per the mirror decision).
- *(If go:)* DEC-S026 written, framed as supersedes-DEC-S024, with the schema-bump call recorded.
- Guide, RETROSPECTIVES, PROJECT_PLAN tables, and the `seeds-version` edit are **left for the follow-up task** and noted as such.

---

## Kickoff prompt for the build session

> Read `docs/SPECS/2026-06-10-throughput-core-handoff.md`. Build the throughput-velocity
> core (DEC-S026), validation-first. Step 1: write `throughput.py` (rename of
> `dev/claude/scripts/velocity.py`) that computes points/calendar-week from `gh` issue
> `closedAt` dates + `points:N` labels — no RETROSPECTIVES parsing, trailing-window flag,
> per-phase + cross-repo, keep `--issues`. Step 2: run it against `~/GitHub/bushel`
> (--window 4, 8, 12) plus crewbook/muster/helm and show me the bands. Then STOP for my
> go/no-go before rewriting `/retro` Step 2 and DEC-S026. Defer the guide, the
> RETROSPECTIVES/PROJECT_PLAN tables, and the schema bump. Diff the two retro SKILL.md
> copies before you touch them — they're ~2 KB apart and I want to know why.
