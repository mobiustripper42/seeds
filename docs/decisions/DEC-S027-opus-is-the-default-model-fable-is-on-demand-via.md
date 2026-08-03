---
id: DEC-S027
title: "Opus is the default model; Fable is on-demand via a bundling trigger (supersedes the PR #107 tiering)"
topic: "Model selection"
---

## DEC-S027: Opus is the default model; Fable is on-demand via a bundling trigger (supersedes the PR #107 tiering)

**Decision:** `claude-opus-4-8` is the standing model for development and architecture; `claude-sonnet-4-6` handles cheap/scoped agents and reviews; `claude-fable-5` is **never the default** — it is a deliberate, scope-confirmed escalation for a *bundled* long-horizon unit (several related tasks combined into one coherent multi-file run). Either party raises it: Claude proposes a bundle before starting, or the operator says `bundle for fable`. `@architect` runs `model: opus`, escalating to a Fable run only for genuinely hard or bundled design work.

**Why:** the first Fable rollout (PR #107) made Fable the standing "frontier tier" for all long/complex work and pinned `@architect` to it. That drained usage fast — $10/$50 per MTok is 2× Opus both directions, and `@architect` fires often. Fable's capability lead is largest on long, coherent, multi-file work, which is *also* where its cost amortizes across the most output; routing individual tasks to it pays the premium exactly where the edge is smallest. Bundle-then-escalate spends Fable only where it earns the cost.

**What changes:** `dev/claude/CLAUDE.md` § Model Selection rewritten (Cheap / Default / on-demand Frontier tiers + the bundle trigger, raisable by Claude or the operator). `@architect` flipped `fable` → `opus` across all five mirrors (two `architect.md` frontmatters + the `@architect` rows in root `CLAUDE.md`, `dev/claude/docs/AGENTS.md`, `docs/AGENTS.md`). The Narration block and the Scope-Discipline reviewability-split guidance are unaffected — they describe model behavior and review practice, not the default model.

**Schema:** template/labeling only — no skill contract or frontmatter-field changes. No version bump (consistent with DEC-S023–S026). Rides the nightly Routine to downstream projects.
