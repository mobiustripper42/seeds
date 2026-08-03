---
id: DEC-S025
title: "Seeds-workflow DECs carry the `DEC-S` prefix; project DECs stay plain"
topic: "Docs, decisions & context discipline"
---

## DEC-S025: Seeds-workflow DECs carry the `DEC-S` prefix; project DECs stay plain

**Decision:** Every seeds-workflow decision is named `DEC-S<NNN>` (this file's own IDs were renumbered `DEC-001…024` → `DEC-S001…S024`). A project's `docs/DECISIONS.md` keeps plain `DEC-<NNN>` for its own decisions. A reference to a seeds-workflow decision uses the `DEC-S` form **everywhere it appears** — including inside a project's files (CLAUDE.md, skills, docs) — so it is unmistakable and can never collide with that project's own `DEC-NNN`.

**Why:** seeds DECs and every project's DECs both started at `DEC-001`, sharing the `DEC-NNN` namespace — same string, different meaning per repo. The collision was real and recurring: bushel `DEC-008` ("Fulfillment") vs seeds `DEC-008` (staging) clashed during the v4 migration. The danger is two-sided — a blind `DEC-NNN` rewrite during a sync mangles a project's own decisions, and a human cross-references the wrong DEC. The old DEC-S016 "Namespace note" punted with "future projects start at DEC-017," which never worked (seeds ran past 017) and didn't help projects already numbered. Prefixing the framework side resolves it permanently: the prefix lives on the smaller, centrally-controlled set (seeds), and projects need no renumbering of their own DECs.

**Scope of the rename:**
- **Seeds:** `docs/DECISIONS.md` definitions + all references in propagating templates (`dev/claude/**`), the dogfooded live install (`.claude/**`), `CLAUDE.md`, `README.md`, `docs/SCHEMA_VERSIONS.md`, `docs/WORKFLOW.md`, `docs/CHEATSHEET.md`.
- **Fleet:** each project's `CLAUDE.md` / skills / docs references to seeds-workflow DECs convert to `DEC-S…` as a standalone per-repo sweep (it could not piggyback on the v4 muster, which predated this).

**Not a blind find-replace — these stay plain `DEC-NNN`:**
- A project's own DECs (e.g. the example `DEC-001…004` in `dev/claude/docs/DECISIONS.md`; bushel's `DEC-016` for Wave invoicing).
- Illustrative / numbering-scheme prose: "architectural decisions log (starts with standard DEC-001–004)", "this contradicts DEC-007" as a generic example, the "project DECs at DEC-101+" story.
- In a project file, a bare `DEC-013` may mean the seeds-workflow DEC **or** the project's own — judge per line.

**Scoped out:** historical archives where a rewrite risks mangling narrative for no benefit — `session-log.md`, `docs/SPECS/`, the completed `PROJECT_PLAN.md` ledger, `RETROSPECTIVES.md`. Their plain `DEC-NNN` references are frozen records, not live template surface.

**Schema:** labeling-only — no skill contract, file path, or frontmatter changes. No version bump (consistent with DEC-S023/DEC-S024). The fleet sweep is manual, not a `/pull-seeds` migration.
