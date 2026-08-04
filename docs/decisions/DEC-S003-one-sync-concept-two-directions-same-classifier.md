---
id: DEC-S003
title: "One sync concept, two directions, same classifier"
topic: "Sync — directions, classification & file classes"
---

## DEC-S003: One sync concept, two directions, same classifier

**Decision:** Sync-config is one system running in two directions — **upstream** (project → seeds, opens PR) and **downstream** (seeds → project, pulls updates). Both invocations pass diffs through the same `@sync-config` agent to classify changes as "generic improvement" vs. "project-specific tweak."
**Why:** The classification logic is the hard part and doesn't depend on direction. Treating sync as two features would duplicate the hardest piece.
**Tradeoff:** None material. Invocation paths (nightly Routine vs. manual skill) differ, but the core logic is shared.
