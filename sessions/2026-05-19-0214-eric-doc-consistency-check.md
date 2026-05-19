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

**Context:**
- Session 29 (`baseline-sweep-cleanup-5Fzc0`) remains `status: open` in remote — produced sailbook PR #59 from a Linux env that no longer exists. Not concurrent in any practical sense; needs manual `/its-dead` later or fold into the next `/retro`.
- Crewbook consistency-sweep result (brand-new project) passes cleanly on stack/font/theme/roles/product types/MVP scope/admin/phase totals/notifications. That positive result is what motivates building this into a reusable skill.
- User-observed workflow drift: in several recent sessions Claude has opened PRs before `/kill-this` ran. Unresolved — discuss whether `/kill-this` should detect existing PRs and adapt, or whether to discourage the early PR creation upstream.
