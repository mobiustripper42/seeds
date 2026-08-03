---
id: DEC-S001
title: "Two template families (`dev/` and `domain/`)"
topic: "Template families & repo structure"
---

## DEC-S001: Two template families (`dev/` and `domain/`)

**Decision:** Templates are organized by project kind, not by component type. `dev/` holds everything for software projects; `domain/<name>/` holds everything for non-dev domains (bread, tomatoes, ops, etc.).
**Why:** Session workflow is shaped by the kind of work, not the kind of file. A farm repo and a Next.js repo both need `/kill-this`, but the build-check step differs fundamentally. Per-family bundles keep that difference explicit.
**Tradeoff:** Duplication across families when skills converge. If a pattern emerges in both, `@sync-config` flags it for potential extraction — but extraction is never automatic.
