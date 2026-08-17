---
id: DEC-S016
title: "ui-reviewer agent split — generic shell + project context file"
topic: "Sync — directions, classification & file classes"
---

## DEC-S016: ui-reviewer agent split — generic shell + project context file

**See also** — later decisions that changed part of this one:
- Extended by DEC-S019 — the pattern generalized from one agent to any shell/context pair

**Date:** 2026-05-18
**Status:** Accepted
**Applies to:** `[webapp]` projects only (tool projects don't use ui-reviewer).

**Problem.** `dev/claude/agents/ui-reviewer.md` contained both the generic review structure (behavior rules, output format, severity rubric) and the project-specific design system (brand tokens, typography scale, surface rules). The moment a project filled in its brand content, the file became Both-modified relative to the seeds template — the nightly sync could never forward-port structural improvements without overwriting project brand content. Every webapp project that customized the agent was permanently orphaned from template updates.

**Decision.** Split into two files:

1. **`dev/claude/agents/ui-reviewer.md`** (seeds template) — the generic shell. Contains: the instruction to read the project context file, the How to Review procedure, output format, priority definitions, severity rubric, and behavior rules. No project-specific content. Syncs cleanly across all webapp projects via the nightly routine.

2. **`.claude/ui-context.md`** (per project, never in seeds templates) — the project's design system reference. Contains: brand tokens, typography scale, surface descriptions (e.g. customer vs admin), component rules, and the project-specific review checklist. The nightly sync never touches this file.

The agent shell opens with: "Read `.claude/ui-context.md`. It contains the project's brand tokens, surfaces, typography scale, component rules, and review checklist. Treat it as authoritative. If the file does not exist, stop and tell the user to create it."

**Consequences.**
- `ui-reviewer.md` becomes sync-clean: structural improvements to the shell (new behavior rules, checklist additions, output format changes) propagate to all webapp projects via the nightly routine.
- Each project's full design system reference lives in one readable file (`.claude/ui-context.md`).
- New webapp projects: copy the seeds shell, fill in `[Project]`, create `.claude/ui-context.md` with the design system.
- Existing projects that have already customized their `ui-reviewer.md` (bushel, sailbook) need a one-time migration: extract the project-specific content to `ui-context.md`, slim the agent file back to match the shell.

**Namespace note.** This is a framework decision — numbered `DEC-S016` under the `DEC-S` prefix convention (see DEC-S025). A project's own `docs/DECISIONS.md` uses plain `DEC-NNN` with independent numbering (e.g., bushel uses DEC-016 for Wave invoicing) — a separate document, no conflict. The `DEC-S` prefix exists precisely so a seeds-workflow decision can never be mistaken for a project's own `DEC-NNN`, and vice versa.

---
