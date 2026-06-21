# Tiller proposal — Fleet-status digest: turn the converged sync Routine into the hub's read side

**Tiller overnight run — 2026-06-21. Draft proposal, not for merge. Eric is the gate.**

---

## The idea

The nightly sync Routine has opened **0 PRs for four nights running** (`routine: last run` #122 → #123 → #124 → #125). That isn't a dull stretch — it's the fleet reporting that it has *converged*: 17 logic-class files are byte-identical across all 7 sources, every hybrid hunk classifies Project-only/Both-modified and auto-skips, and the only things moving are project-local commits the sync surface never touches. The sync mission is, for now, essentially done.

But the Routine still runs every night. It enumerates all six active projects, pulls each one's `seeds-version`, computes the drift inventory, surfaces pattern flags, and resolves the migration backlog — and then throws all of that away into a one-night-only `routine: last run` issue and exits with "nothing changed." It is paying, nightly, to assemble a complete snapshot of the estate and then discard it.

The SPEC's north star — "a high-level cross-project status view aggregates state from sailbook, helm, future projects… a future `@portfolio` agent or `/all-projects` skill" — is parked as **"not actionable yet."** That judgment is now stale. The thing that made it un-actionable was the absence of an enumeration engine that touches every repo on a schedule. **That engine exists, runs nightly, and currently produces nothing.** The hub's hard half is already built and idle.

The proposal: add a **read-side projection** to the Routine — a *fleet-status digest*. Same enumeration the Routine already does; instead of (or alongside) "0 PRs," emit one durable artifact carrying, per project: schema version, last-activity date, open-PR count, stuck-migration status, throughput (from the existing `throughput.py`), and divergence/pattern flags. One pinned issue, addressed by a **config-recorded issue number** and overwritten in place each run.

That pinned-handle detail is not incidental — it also fixes a bug hiding in plain sight. There are **34 open `routine: last run` issues** right now. DEC-S010 intended *one* rolling issue, body-replaced each run. It doesn't roll because a stateless nightly run can't reliably find its own prior artifact, so it creates a new one every night. Give the run a stable handle (issue number in `routine-config.yaml`) and the accretion stops by construction — the same mechanism the digest needs anyway.

## Why it's worth it — leverage, and why now

- **It realizes the SPEC's stated long-term payoff on infrastructure already paid for.** No new traversal, no new schedule, no new agent invocations. The digest is a cheap projection over data Steps 1–2 of the Routine already collect, plus one `list_pull_requests` per repo. For a solo dev steering six repos from a phone, "what's the state of my estate, in one place, every morning" is exactly the thing that can't be held in the head.
- **Why now is the convergence itself.** Four zero-PR nights are the signal that the Routine has spare capacity and a complete data set with nowhere to put it. The moment the sync goes quiet is precisely when its enumeration is freed up to do something else. Waiting wastes a nightly run that's already firing.
- **It kills the 34-issue accretion** as a structural side effect, not a separate chore.
- **It has a clean growth path.** V1 is a stateless snapshot that computes lightweight deltas by diffing against its own prior issue body ("xola idle 9 nights," "migration #94 stuck 21 days"). V2 backs it with a persistent stateful agent so trend-reporting stops depending on parsing the last issue body and becomes first-class — the difference between a digest you diff in your head and a hub that hands you the diff.

## Why he hasn't already

The SPEC filed the hub under "not actionable yet" and that label stuck — written *before* the sync converged, when the assumption was that a portfolio view needed its own enumeration machinery built from scratch. Every Routine improvement since (DEC-S010 → S011 → S018 → S019) was framed as "make the sync classify drift better," because the sync was *busy* — there were real PRs to open every week. The enumeration was always there, but it read as plumbing for the sync write-path, never as a standalone read surface worth harvesting. It took the write-path going *silent* — four nights of nothing — to expose that the read-path is the asset. You don't notice the engine is idle until it stops producing output, and the output only stopped this week.

---

## Build handoff — execute-ready plan

A read-side projection bolted onto the existing Routine. No new schedule, no new agent calls, no LLM classification on the digest path — it reuses enumeration the Routine already performs.

### Approach & key decisions

1. **Separate read pass, not fused into `@sync-config`.** `@sync-config`'s job is diff classification; status aggregation is a different concern. Add the digest as a new Routine step (Step 4.5) that runs *after* sync, reading the data Steps 1–2 already gathered. Do not touch the agent.
2. **One durable artifact, addressed by a pinned number.** Introduce `status_issue:` (and `last_run_issue:`) in `routine-config.yaml` — the stable handles. The Routine edits those issue bodies in place instead of title-searching-and-creating. This is what stops the 34-issue accretion. A separate pinned `fleet: status` issue (portfolio view) from `routine: last run` (operational "did sync work?") — two concerns, two pinned issues.
3. **Cheap by construction.** Per-project fields come from data already in hand (version, skips, backlog, flags from Steps 1–2) plus one `mcp__github__list_pull_requests` count per repo. Throughput is best-effort (see gotcha). No extra `@sync-config` invocations — name this explicitly so a future reader doesn't "optimize" it into the agent.
4. **V1 trends for free.** Before overwriting the pinned issue, read its current body, parse the prior per-project snapshot, and compute deltas (idle-night count, migration-stuck days, "convergence held an Nth night"). No new storage. V2 (deferred) swaps body-parsing for a persistent stateful agent that holds fleet history.

### File-by-file

- **`dev/claude/routines/nightly-sync.md`** — the core change.
  - New **Step 4.5 — Fleet status digest**: define the pinned `fleet: status` issue (addressed by `status_issue:` from config), the per-project field set (version · last-activity date · open-PR count · migration status · throughput · pattern/divergence flags), the data sources (reuse Steps 1–2 + one PR-count call per repo + optional `throughput.py`), the delta computation (diff vs prior body), and the body layout. Obey the existing **Output formatting** section — real newlines, never literal `\n`.
  - Amend **Step 4**: address `routine: last run` by `last_run_issue:` number instead of create-new. Add a one-time note to close the stale `routine: last run` issues (#48–#125 minus the pinned one).
- **`.claude/routine-config.yaml`** — add `status_issue:` and `last_run_issue:` pinned numbers (created once, by hand or by a bootstrap run), plus an optional `digest: true|false` toggle. Document each with a comment in the file's existing style.
- **`dev/claude/scripts/throughput.py`** — add a machine-readable `--fleet`/JSON output mode so the digest ingests per-repo throughput cleanly instead of scraping human text. Nice-to-have; the digest still works without it (throughput marked `n/a`).
- **`docs/DECISIONS.md`** — **DEC-S028**: the Routine emits a fleet-status digest as the read side of the SPEC hub; rolling issues are addressed by config-pinned number (closes the 34-issue accretion). Record the V1/V2 split and the "separate read pass, never fused into `@sync-config`" decision.
- **`docs/SPEC.md`** — update *Future Direction*: the hub's read side is now realized via the Routine digest; mark the north star partially actionable, `@portfolio`/`/all-projects` as the read-API on top.
- **Re-paste `nightly-sync.md` into the Routine config on claude.ai** — the standing manual drift step (README §). The Routine executes from claude.ai storage, not the repo file.

(Seeds has no `package.json`, so no version bump — DEC-S007. Schema impact is additive config + a logic-class prompt change; `seeds-version` likely unchanged, Eric's call per the DEC-S026 precedent.)

### Gotchas / risks

- **`throughput.py` shells out to `gh`; the Routine session uses MCP github tools.** If `gh` isn't on the Routine runner, throughput can't compute. Make it best-effort: emit every other field and mark throughput `n/a (gh unavailable)`. Don't let it block the digest.
- **Output formatting trap** (the 2026-05-08 PR #15 bug): build the issue body with real line breaks, never the literal escape `\n`. The existing section already warns; the digest's table is the most likely re-offender.
- **Pinned issue must exist before it can be addressed.** Bootstrap: create the `fleet: status` and `routine: last run` issues once, record their numbers in config. Until then, fall back to create-once-then-pin.
- **Keep it read-only.** The digest emits an artifact; it must never merge, push to a branch, or mutate project state. Same guardrails as the rest of the Routine.
- **Don't let the digest inflate cost.** It's ~6 cheap MCP calls + optional throughput. If it ever starts spawning agents, the design has drifted — the whole point is reusing enumeration already paid for.

### Done when

- The next nightly run updates **one** pinned `fleet: status` issue *in place* (number from `routine-config.yaml`) — no new issue created.
- The digest lists all active projects with version · last-activity · open-PR count · migration status · flags, and shows at least the cheap deltas (idle nights, migration-stuck days) computed from the prior body.
- `routine: last run` stops accreting (addressed by pinned number); the stale ones are closed once.
- Throughput renders where `gh` is available and is gracefully marked `n/a` otherwise.
- `@sync-config` is untouched; the digest is a separate read pass.

### Kickoff

> Read `docs/SPECS/2026-06-21-tiller-fleet-status-digest.md`. Implement DEC-S028: add a read-side fleet-status digest to `dev/claude/routines/nightly-sync.md` as Step 4.5, emitting one pinned `fleet: status` issue addressed by a `status_issue:` number in `.claude/routine-config.yaml`, and convert the `routine: last run` issue to the same pinned-number addressing to stop the 34-issue accretion. Start by proposing the pinned-issue config shape and the digest body layout, then we'll wire the Routine step.

---

*Innovator note: the outside-tech cross is Anthropic-hosted **persistent stateful agents** (radar) — the V2 substrate that turns the digest from a point-in-time snapshot into a hub with cross-run memory (trends/deltas as first-class, not body-diffing). Load-bearing for V2 specifically: without persistence, "fleet trends" degrades to a snapshot the human diffs by hand. V1 deliberately needs none of it.*

---
_Generated by Claude Code (Tiller routine)._
