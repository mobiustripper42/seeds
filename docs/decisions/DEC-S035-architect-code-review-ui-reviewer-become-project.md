---
id: DEC-S035
title: "`@architect`, `@code-review`, `@ui-reviewer` become project-owned — seeds keeps templates, sync stops touching them"
topic: "Agents & review"
---

## DEC-S035: `@architect`, `@code-review`, `@ui-reviewer` become project-owned — seeds keeps templates, sync stops touching them

**See also** — decisions this one changed part of:
- Amends DEC-S033 — the rollout paragraph only — the stack-neutral template stands

**Decision:** Reclassify the three reviewing agents from `hybrid` to **`context`** in `routine-config.yaml`'s file-class registry. `@sync-config` Step 1.4 drops `context` pairs from diff scope entirely — both directions, both `interactive` and `auto`. Seeds' `dev/claude/agents/*.md` remain **install-time starting points** (Setup step 5 copies them once); after install each project owns its copy and no sync ever writes to it again.

**The principle:** *agents that reason about the project's substance are project-owned; agents that operate the workflow machinery sync.* That line puts `architect` / `code-review` / `ui-reviewer` on the project side, and leaves `sync-config` / `tape-reader` / `ideas` (`logic`) and `pm` / `doc-consistency` where they are. It's the DEC-S019 split — shell syncs, context doesn't — applied one level down, to agents.

**It was a misclassification, not a missing feature.** `hybrid` means "generic shell + paired `.claude/<basename>-context.md`" — the CLAUDE.md/CLAUDE-context.md pattern. No such context file exists for an agent, so the three fell through to full hunk classification and the machine forward-ported template edits *into* hand-adapted reviewers. The mechanism to stop it (DEC-S018's registry) already existed; three globs pointed at the wrong class.

**The evidence, and how close it came.** sheepdog's `@code-review` had been adapted into something no stack-neutral template could produce: classifier purity (no I/O in `classifier/`, which is what makes the whole fixture-testing strategy work), ntfy topics treated as bearer secrets, alert-path independence (a channel must not route through monitored infrastructure — it fails exactly when needed), a Result-vs-throw contract where a dead site is the normal case rather than an exception, `reference/` frozen as behavioral spec, a closed label vocabulary, and a redefined **bug** severity that includes "silently fails to detect a real outage," with the standing instruction to weight silent-failure heaviest. Its `@architect` likewise carries no-launch-deadline framing (guard against *sprawl*, not lateness), the "which target in `sheepdog.yaml` needs this?" test against premature generality, and the DEC-008 native-HTTP bet with a sanctioned fallback. The DEC-S033 rollout would have overwritten all of it; it survived only because the operator asked for a diff before the sync ran. Treat that as the near-miss it was — the safety net was a human question, not a rule.

**Cost, accepted knowingly:** `context` is a hard drop with no mode distinction, so a good idea that emerges in one project's reviewer will never auto-surface for backporting. Improving the seeds template becomes a deliberate manual act — hand-diff when harvesting. Accepted because reviewer quality is dominated by project fit, and the failure mode on the other side (silently destroying adaptation) is unrecoverable while a missed backport is merely deferred.

**Also amended:** DEC-S033's rollout paragraph, whose "converge later … then drop to neutral" instruction is withdrawn in place. Neutrality is right for the *template* and wrong for an *installed copy*.

**Scope:** `.claude/routine-config.yaml` (three globs + rationale comment), `dev/claude/agents/sync-config.md` (Step 1.4 `context` description now names the reviewers explicitly and states that heavy divergence is by design, not drift), `docs/DECISIONS.md` (this entry + the DEC-S033 amendment). The three template files themselves are unchanged — they stay stack-neutral per DEC-S033, which is still correct for a starting point.

**Left as-is deliberately:** `@pm` reads `PROJECT_PLAN.md` but reasons about workflow rather than code, so it stays syncing. Revisit if it starts accumulating project-specific judgment.

**Schema:** classification/labeling only — no skill contract or frontmatter-field change. No version bump (consistent with DEC-S023–S034).
