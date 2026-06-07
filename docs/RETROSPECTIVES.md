# seeds — Retrospectives

Written at meaningful boundaries (end of a batch of related tasks, or when velocity shifts).

Format per entry: velocity, scope changes, what worked, what didn't, forecast update.

---

## Phase (single, full-history) — 2026-05-14

**Window:** 2026-04-22 → 2026-05-14 (22 days)
**Sessions:** 26 total (1 abandoned mid-session, 25 productive)
**Points:** 137 shipped (per `[x]` rows in PROJECT_PLAN.md + Tasks 29/30 closed at this retro)
**PRs merged:** 34
**Wall clock:** ~150h on paper (overstated — sessions S17, S20, S21, S22 span overnight breaks)
**Dev time:** largely unmeasurable for this retro — transcripts for sessions 16–24 live on the claude.ai web/Desktop runner (Linux paths), inaccessible from the local Windows checkout. `/retro` Step 2.3 break-inference skipped for those.
**Velocities:**
- Wall: ~150h / 137 pts = ~1.1 h/pt (not representative — overnight inflation)
- Dev: ~0.13 hrs/pt headline forecast (three clean datapoints — S5, S6, S23 — all edit-heavy)
- Review: not computed (would require per-PR enumeration across 34 PRs; left for future per-phase retros)
**Issues:** project never used GitHub Issues for tasks — flat `PROJECT_PLAN.md` rows only. 34 tasks created, 34 closed, 0 moved.

### Per-session breakdown

| Session | Date | Wall (h) | Dev (h) | Points | PRs | Notes |
|---------|------|----------|---------|--------|-----|-------|
| 1 | 2026-04-20 | — | — | 0 | — | Pre-plan setup |
| 2 | 2026-04-22 | — | — | 0 | — | Created the project plan |
| 3 | 2026-04-23 | — | — | 0 | — | No work performed |
| 4 | 2026-04-24 | — | — | 0 | — | Discussion only |
| 5 | 2026-04-24 | 1.25 | 0.75 | 6 | — | First clean velocity datapoint (0.125 hrs/pt) |
| 6 | 2026-04-25 | ~12 calendar | 1.0 | 7 | — | 0.143 hrs/pt focused |
| 7 | 2026-04-26 | 8.33 | ~1.0 | 10 | — | Idle-heavy wall |
| 8 | 2026-04-30 | — | — | 0 | — | Design session |
| 9 | 2026-04-30 | 1.17 | — | 2 | — | — |
| 10 | 2026-04-30 | 0.25 | — | 0 | — | Cleanup |
| 11 | 2026-04-30 | 3.08 | — | 3 | — | — |
| 12 | 2026-05-01 | 3.0 | — | 0 | — | Workflow analysis |
| 13 | 2026-05-01 | 2.17 | — | 0 | — | Workflow analysis |
| 14 | 2026-05-01 | 2.5 | — | 5 | — | Spanned overnight |
| 15 | 2026-05-03 | 11.83 | — | 13 | — | Idle-heavy, not representative |
| 16 | 2026-05-03 | 2.0 | ~2.0 | 12 | — | First worktree-format session |
| 17 | 2026-05-05 | 23.5 (wall) | 3.5 | 8 | — | Overnight span |
| 18 | 2026-05-06 | 0.77 | 0.75 | 3 | — | — |
| 19 | 2026-05-06 | 4.10 | 4.08 | 3 | — | — |
| 20 | 2026-05-07 | 36.7 (wall) | 9.08 | 17 | — | 2-day span — biggest single-session points |
| 21 | 2026-05-09 | 24.92 (wall) | — | 3 | — | Overnight |
| 22 | 2026-05-11 | 13.33 (wall) | — | 6 | — | Overnight |
| 23 | 2026-05-12 | 7.54 | 1.40 | 11 | #26 | 0.127 hrs/pt dev — third clean datapoint |
| 24 | 2026-05-14 | 3.77 | — | 13 | #38, #75 | DEC-S013/014 ship |
| 25 | 2026-05-14 | — | — | 0 | — | Abandoned (web runner, no work shipped) |
| 26 | 2026-05-14 | 2.58 | — | 5 | #39, #40 | Tasks 29 + 30 + retro |

PR-derived columns left blank for most rows — pre-DEC-S013 sessions didn't record `pr_numbers` in frontmatter. `gh pr list --state merged` confirms 34 total merges in the window.

### What worked
- "we have a functioning workflow tool that is seems dialed in to my developement workcycle"

### What didn't
- "can't seem to get task 'closed'"

### Changes for next phase
- "we will be getting domain workflow running"

### Scope changes
- No scope creep visible in the plan — all 34 task rows reached `[x]`, no abandoned or descoped tasks.
- Task 33 (three time fields on frontmatter, shipped Session 23) was superseded by Task 34 (DEC-S013/DEC-S014, shipped Session 24). Counted as closed with a "superseded by Task 34" note in the plan; not scope creep.

### PM read

137 points across 22 days, 34 merged PRs, zero scope creep visible in the plan, and the user opening today's session by saying they'd need to invent work to do. That's a project that finished. The 6.2 pts/day average is meaningless as a forward-looking number — this was a personal tool built in nights and weekends, not a sustainable cadence — but the shape of it (consistent ~0.13 hrs/pt on the three sessions we can actually measure, no phase that ballooned, the V1→V2→V3 schema migrations absorbed without a major rewrite) reads like a system that converged rather than one that ran out of runway.

The "can't seem to get task closed" answer is the most important sentence in this retro, and it's been the most important sentence for about two weeks. DEC-S012 was a response to it (the S22 false-merge report). DEC-S013 was a response to it (atomic session files, retro owns the `[x]` flip). Both helped at the layer they targeted and neither closed the gap, because the gap isn't technical — it's that "done" has four definitions (PR merged, plan checkbox flipped, session file says shipped, user feels finished) and the workflow only forcibly reconciles them at phase boundaries. With one retro in 22 days, that's a 22-day lag window. The fix is probably not another decision record; it's either retro-on-demand or a lightweight "reconcile open PRs against PROJECT_PLAN" pass that runs more often than retro does. Worth a Task 35 in domain phase rather than a deeper rework now.

On the brevity of the three answers: a 3-word "what worked," a 5-word "what didn't," and an 8-word "what's next" is not a user who's disengaged — it's a user who built the tool they wanted and is bored of describing it. That's the correct response to a finished thing. I'll note it because the temptation in a first-and-only retro is to fish for more reflection, and there's nothing to fish for. The verbatim answers are the retro. Don't pad them in the file.

Forward note on domain: the dev-shaped skills carry hidden assumptions that will break when `domain/` gets populated. `/kill-this` assumes a git branch + PR + CI build check. `/its-dead` assumes a `package.json` to patch-bump. `/start-phase` assumes GitHub Issues with `points:N` labels. `@code-review` assumes a diff of code. Bread doesn't have a `package.json`. Tomatoes don't have CI. The skills will need a project-type gate (the DEC-S011 manifest already exists — extend it) or domain-specific variants, and the honest answer is you probably won't know which until you try to run `/its-alive` on a tomato season and watch it fail. Expect the first domain to be a forcing function that exposes which parts of the workflow were universal vs. which were just dev-coded all along. Budget for that — the velocity in the first domain phase will look terrible, and that's the data, not a regression.

One last thing for the record: this retro itself is a stress test of the retro skill — first run, no prior entries, 22 days of history, partial transcript access. That it produced clean numbers for the sessions it could measure and honestly flagged the ones it couldn't is the right behavior. Note it in RETROSPECTIVES.md as the baseline; future phase retros should be cheaper and more complete because the window is smaller.
