---
id: DEC-S033
title: "`@architect` + `@code-review` go stack-neutral (defer to `CLAUDE-context.md § Conventions`)"
topic: "Agents & review"
---

## DEC-S033: `@architect` + `@code-review` go stack-neutral (defer to `CLAUDE-context.md § Conventions`)

**See also** — later decisions that changed part of this one:
- Amended by DEC-S035 — the rollout paragraph only — the stack-neutral template stands

**Decision:** The two review agents stop hardcoding the Supabase/RLS/shadcn/Next.js webapp stack as universal criteria. `@code-review` replaces "RLS policy gaps / unhandled Supabase errors / Server Components / `src/`" with stack-neutral equivalents (access-control gaps, unhandled errors from the data layer or external calls, "the codebase") and defers the specifics to `CLAUDE-context.md § Conventions`. `@architect` replaces "new RLS policy shape / server action" and the dependency check's "(Next.js, Supabase, shadcn/ui, Tailwind)" with "the project's actual stack — see `§ Conventions`." Both gain an explicit **"Stack-neutral"** note near the top.

**Why:** the agents run on *every* project (`@code-review` is wired into `/kill-this`; `@architect` gates design), so a non-webapp project inherited wrong criteria and had to hand-adapt them at setup — sheepdog (a tool project) flagged exactly this. It's the DEC-S019 principle: shared templates are stack-neutral; stack facts live in `CLAUDE-context.md § Conventions` (which the shell already designates as the home for auth/RLS + the error-handling contract). No per-project context edits are needed — the specifics already live there in filled webapp contexts.

**Evidence it was the right call:** several repos had *already* hand-patched these two agents away from the webapp assumption — helm and poop-deck rewrote them to a "tool-shape," sailbook substituted domain framing. Those customizations are the manual workaround for exactly this bug.

**Scope / rollout:** rewritten in seeds canonical and hand-rolled to the repos whose agents were byte-identical to seeds (**tinkle, bushel-mobile, bushel**) — for them the neutral version is a better *starting point*, since they had unadapted boilerplate carrying the webapp bug. The repos that had customized these agents (**sailbook, helm, poop-deck, soundings, muster**, and **sheepdog**) are left as-is.

> **Amended 2026-07-24 by DEC-S035.** This entry originally instructed the customized repos to "converge later (lift their keeper-specifics into `§ Conventions`, then drop to neutral)." **That instruction is withdrawn — do not follow it.** It had the ownership backwards: those repos are not laggards awaiting convergence, they are the intended end state. Under DEC-S035 these three agents are project-owned and never sync, so "converging to neutral" would destroy exactly the adaptation that makes a reviewer worth running. Neutrality remains the right shape for the seeds *template* (a starting point shouldn't presume a stack); it was never the right end state for an installed copy.

**Not done here:** the shell's Micro Workflow test-step defaults (`Playwright` / `pgTAP` / RLS) still carry webapp assumptions, but they have the "override in `§ Workflow Overrides`" escape hatch — left for a separate pass.

**Schema:** template/labeling only — no skill contract or frontmatter-field change. No version bump (consistent with DEC-S023–S032).
