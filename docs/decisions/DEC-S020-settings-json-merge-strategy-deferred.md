---
id: DEC-S020
title: "settings.json merge strategy — deferred at DEC-S018, resolved by DEC-S023"
topic: "Tooling & safety"
---

## DEC-S020: settings.json merge strategy — deferred at DEC-S018, resolved by DEC-S023

**See also** — later decisions that changed part of this one:
- Resolved by DEC-S023 — settings.json ships as a manual-merge template, not an auto-synced JSON merge

**Status:** deferred when raised, later resolved. This entry exists because DEC-S018 and DEC-S023 both cite the id and a record that cites an id it does not contain is a record with a hole in it — the reader following the citation lands nowhere and cannot tell whether the decision was lost, renamed, or never taken.

**The question, as DEC-S018 left it:** `.claude/settings.json` is shaped like a hybrid file, but it needs a **JSON merge** strategy rather than the shell + context split DEC-S019 generalizes. DEC-S018 deferred it explicitly rather than forcing it into the file-class registry.

**How it was resolved:** DEC-S023 answered it by declining the merge entirely — `settings.json` ships as a **manual-merge template that is not auto-synced**. Permission guardrails are security posture, and union-merging them from an unattended bot is the wrong default: a merge that silently widens an allow list is indistinguishable, at read time, from one that was reviewed.

**No separate decision was ever written under this number** — the answer landed inside DEC-S023. Recorded here so the citation resolves and the deferral is visible as part of the chain rather than as a gap.
