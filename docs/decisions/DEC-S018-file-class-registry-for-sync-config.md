---
id: DEC-S018
title: "File-class registry for sync-config"
topic: "Sync — directions, classification & file classes"
---

## DEC-S018: File-class registry for sync-config

**See also** — later decisions that changed part of this one:
- Extended by DEC-S039 — the registry now also decides what /read-the-tape may edit, not only what sync may overwrite
- Revised by DEC-S040 — the registry loses every automated consumer and survives as guidance for the manual copy
- Extended by DEC-S044 — adds a fourth file class, `presence`; the existing three and their meanings are unchanged
- Refined by DEC-S046 — the registry's stated rule for an unmatched file now has something that enforces it; the file classes themselves are untouched

**Date:** 2026-05-19
**Status:** Accepted
**Extends:** DEC-S010, DEC-S011
**Related:** DEC-S016 (concrete example), DEC-S019 (depends on this), DEC-S020 (deferred)

### Decision

Add a `file-class` field to `.claude/routine-config.yaml` with three values: `logic`, `context`, `hybrid`. `@sync-config` reads this registry at Step 1.4 (new), before hunk classification. Behavior forks per class:

- **logic**: hash-compare only. Drift = one row per file, no hunks, no LLM judgment. Either matches or doesn't.
- **context**: excluded from diff scope entirely. Never compared.
- **hybrid**: only the seeds-side shell file participates in classification. The project-side `<name>-context.{md,json}` file is implicitly `context`.

Files not listed in the registry default to `hybrid` with the seeds file as shell — the legacy behavior. Unknown files don't break the routine; they just keep running through the LLM classifier as today.

### Context

The nightly Routine (DEC-S010) produces PRs whose row counts don't match their signal counts. Empirical evidence:

| PR | Rows | Real changes | Noise rows | Notes |
|----|------|--------------|------------|-------|
| seeds#36 | 16 | 5 | 11 | Pre-DEC-S016. Most noise was project-name substitutions and filled placeholders. |
| seeds#45 | 2 | 2 | 0 | Clean. |
| bushel#124 | 6 | 2 | 4 | ui-reviewer row dropped from 6 to 1 after DEC-S016 split. |
| sailbook#58 | 9 | 4 | 5 | Three skips on hybrid files (architect.md, code-review.md, settings.json) wanting DEC-S016 treatment. |

Second problem: the LLM classifier is non-deterministic across nights. A hunk skipped Monday gets re-proposed Tuesday because the classifier has no memory of prior verdicts. For files that are byte-identical-by-design (skills, sync-config itself, tape-reader), running an LLM at all is wasted work — there's nothing to judge.

The diagnosis is structural. Files under `.claude/` come in three shapes:

- **Logic** — skills, sync-config agent, tape-reader agent. Byte-identical-by-design across projects. Hunk classification is wasted; hash comparison is sufficient.
- **Context** — `docs/SPEC.md`, `docs/BRAND.md`, project's `CLAUDE.md` content. Pure project-specific. Comparing across projects is meaningless.
- **Hybrid** — `CLAUDE.md` root, `agents/architect.md`, `agents/code-review.md`. Mix of generic shell and project context. DEC-S016 already split `ui-reviewer.md` this way. The pattern generalizes (DEC-S019).

DEC-S011's type-gating drops whole files per project type, but treats every file identically once in scope. File-class is the missing per-file dimension.

### Config shape

In `.claude/routine-config.yaml`, add a `file-classes` map keyed by glob, value is class name. Order matters — first match wins:

```yaml
file-classes:
  - "dev/claude/skills/**": logic
  - "dev/claude/agents/sync-config.md": logic
  - "dev/claude/agents/tape-reader.md": logic
  - "dev/claude/agents/ui-reviewer.md": hybrid
  - "dev/claude/agents/architect.md": hybrid
  - "dev/claude/agents/code-review.md": hybrid
  - "dev/claude/CLAUDE.md": hybrid
  - "dev/claude/docs/SPEC.md": context
  - "dev/claude/docs/BRAND.md": context
```

Rejected: a separate `file-class-manifest.yaml` parallel to `type-manifest.yaml`. The registry is small, lives next to the rest of the routine config, and doesn't justify a second file.

Globs are seeds-side paths. The agent maps to project-side paths using the same rules as today (Step 1 in sync-config.md).

### Gate ordering

Step 1 (DEC-S011 type-gate, whole-file drop) → Step 1.4 (file-class lookup, behavior fork) → Step 1.5 (open-PR dedup) → Step 2 (hunk classification, only for hybrid shells and unclassified files).

Type-gate first because dropping a file entirely is cheaper than classifying it. File-class second because it changes what "classify" means.

### What changes in sync-config.md

- **Step 1.4 (new)**: Read `file-classes` from routine-config.yaml. For each file pair surviving Step 1, look up class. Drop context-class pairs from scope (log as `Class-gated: context`). Mark logic-class pairs for hash-only comparison.
- **Step 2 (amended)**: For logic-class pairs, compare file hashes. If equal, emit no row. If unequal, emit a single row `logic-drift | <path> | hash mismatch | Flag` — no hunk breakdown, no LLM verdict. Hybrid-class pairs proceed to hunk classification but only against the shell portion (see DEC-S019). Context-class pairs were already dropped at 1.4.
- **Step 3**: Logic-drift rows render as one row per file. Provenance column reads `Class: logic`. Hybrid rows read `Class: hybrid (shell only)`.

### Trade-offs

- Hand-maintained registry. Adding a new skill means updating one glob. Acceptable — skills are added rarely.
- Glob patterns can drift. If someone adds a non-logic file under `dev/claude/skills/`, it gets hash-compared and flagged as drift. Forcing function: a hash mismatch on a logic file opens a PR immediately, no judgment, just "these drifted — sync them." Better than the LLM silently flip-flopping.
- Logic files that grow project-specific sections become wrong loudly. Today they become wrong silently.
- Wildcard collisions: first-match-wins handles this. The rule is documented in the agent.

### Forward references

- **DEC-S019** generalizes DEC-S016's pattern to all hybrid files. Depends on this registry to mark them.
- **DEC-S020 (deferred → resolved by DEC-S023)**: `settings.json` is a hybrid file but needs a JSON-merge strategy, not a shell+context split. Out of scope here. **Resolved by DEC-S023: it ships as a manual-merge template, NOT auto-synced** — permission guardrails are security posture and shouldn't be union-merged by an unattended bot.
- **DEC-S021 (deferred)**: retro "prefer-apply for structural Both-modified diffs" heuristic. Independent of file-class. Not blocked by this.

---
