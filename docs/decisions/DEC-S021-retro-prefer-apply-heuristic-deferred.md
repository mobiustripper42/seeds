---
id: DEC-S021
title: "Retro prefer-apply heuristic for structural Both-modified diffs — deferred, still open"
topic: "Open questions"
---

## DEC-S021: Retro prefer-apply heuristic for structural Both-modified diffs — deferred, still open

**Status:** deferred at DEC-S018 and **never taken up**. Recorded so the citation resolves and so the deferral stays visible instead of decaying into a dangling reference nobody can interpret.

**The question:** should `@sync-config` gain a "prefer-apply" heuristic for `Both-modified` hunks that are structural rather than substitutions — i.e. auto-apply when the template side is clearly a workflow-mechanism change and the project side is clearly a rename or a placeholder fill?

**Why it was deferred:** it is independent of the file-class registry, so DEC-S018 was not blocked on it. It has not been revisited since.

**Current behavior in its absence:** `Both-modified` hunks are skipped in `mode: auto` and surfaced for a human in `mode: interactive`. That default is conservative in the right direction — the failure it avoids (a bot overwriting an adaptation) is unrecoverable, while the failure it accepts (a deferred backport) is not.

**Revisit if:** `Both-modified` skips start dominating the Step 6 summaries across repos, which would mean the conservative default is costing more than it saves.
