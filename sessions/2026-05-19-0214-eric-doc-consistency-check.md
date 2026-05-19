---
session: 30
dev: eric
slug: doc-consistency-check
branch: main
started: 2026-05-19T02:14:33Z
ended:
points:
pr_numbers: [52]
status: open
transcript: C:/Users/eric/.claude/projects/C--Users-eric-OneDrive-Documents-GitHub-seeds/6bff778e-c114-4927-8e57-87b5e4778c69.jsonl
---

# Session 30 — doc-consistency-check

<!-- Task blocks appended by /kill-this, one per task. -->

## Task 1: `/doc-consistency-check` skill + `@doc-consistency` agent (DEC-017)

**Completed:**
- New `dev/claude/agents/doc-consistency.md` + `.claude/agents/doc-consistency.md` mirror (byte-identical)
- New `dev/claude/skills/doc-consistency-check/SKILL.md` + `.claude/skills/doc-consistency-check/SKILL.md` mirror (byte-identical)
- Registered in 4 enumeration surfaces: root `CLAUDE.md` Session Skills + Agents tables, `dev/claude/CLAUDE.md` Session Skills + Agent Workflow tables, `dev/claude/docs/AGENTS.md` per-agent §5 + Agent Summary rows (both agent + skill)
- `docs/DECISIONS.md` — new DEC-017 ("Fact-check and structural-audit are separate reviewer concerns") with the crewbook drift named explicitly as the failure mode being fenced off
- `docs/PROJECT_PLAN.md` — Task 36 row added (3 pts, `[ ]`), cosmetic blank line fix

**Code review:** Clean on substance. One cosmetic nit (stray blank line above Task 36 row in PROJECT_PLAN.md) caught + fixed in follow-up commit.
**PR:** [#52](https://github.com/mobiustripper42/seeds/pull/52)
**Points:** 3
**Branch:** task/36-doc-consistency-check
**Opened at:** 2026-05-19T02:35:00Z

**Next Steps:**
- **DEC namespace split — needs a real plan (DEC-018 candidate).** Seeds owns DEC-001..0XX (workflow); projects each number their own DECs from DEC-001 upward; collisions are inevitable and already real (sailbook DEC-009 = shadcn vs seeds DEC-009 = safe-supabase). Forward-port made it worse by copying the literal `(DEC-009)` string from seeds CLAUDE.md into sailbook. Two-part fix: (a) namespace split — seeds DEC-001..099, projects DEC-101..199; existing projects keep numbers but add a pointer at top of project DECISIONS.md and start all new DECs at 100+; (b) sync-config Step 4 strips/tokenizes seeds DEC numbers when forward-porting prose, OR template DEC numbers get scrubbed from `dev/claude/CLAUDE.md` workflow sections so they never appear in transit. DEC-016 already has a "namespace note" at the bottom — formalize it as DEC-018.
- **Sailbook PR #59 merge** — has conflicts (staging moved) and 3 caveats: (1) DEC-009 collision (strip the label or renumber), (2) `scripts/safe-supabase.sh` not present in sailbook (copy from seeds or accept docs are aspirational), (3) DEC-014 migration is deferred-execution (first `/its-alive` post-merge bootstraps the orphan sessions branch). Resolve at fresh head.
- **Sailbook cleanup:** delete `preview-test` branch via GitHub UI ([sailbook/branches](https://github.com/mobiustripper42/sailbook/branches)).
- **Seeds PR #52 (this task)** — merge after tonight's nightly sync to spread Task 36 to all projects on next nightly run.
- **Triage tonight's Routine output** — sailbook should hit Step 1.5 `Already-proposed` and produce minimal/no new PR; if it opens a duplicate full forward-port PR, that's a Step 1.5 bug worth investigating.
- **`/kill-this` runs after PRs already exist** — observed pattern. `/kill-this` Step 4.0 should detect `EXISTING_PR_STATE=OPEN` and adapt, which it does — but worth confirming the platform's pre-PR behavior interacts cleanly. Lower priority than the DEC namespace problem.
- **Session 29 cleanup** — still `status: open` (Linux env gone). Close manually or fold into next `/retro`.

**Context:**
- Session 29 (`baseline-sweep-cleanup-5Fzc0`) remains `status: open` in remote — produced sailbook PR #59 from a Linux env that no longer exists. Not concurrent in any practical sense; needs manual `/its-dead` later or fold into the next `/retro`.
- Crewbook consistency-sweep result (brand-new project) passes cleanly on stack/font/theme/roles/product types/MVP scope/admin/phase totals/notifications. That positive result is what motivates building this into a reusable skill.
- User-observed workflow drift: in several recent sessions Claude has opened PRs before `/kill-this` ran. Unresolved — discuss whether `/kill-this` should detect existing PRs and adapt, or whether to discourage the early PR creation upstream.
