---
id: DEC-S004
title: "Upstream = nightly remote Routine, downstream = manual skill"
topic: "Sync — directions, classification & file classes"
---

## DEC-S004: Upstream = nightly remote Routine, downstream = manual skill

**Decision:** Upstream sync runs on a schedule via Anthropic Routines (remote, nightly). Downstream sync is manual via a `/pull-seeds` skill the user runs inside a project when they want updates.
**Why:** Upstream catches improvements automatically without cluttering mid-task flow. Downstream is rare enough and disruptive enough (could introduce conflicts mid-work) that the user explicitly wants it on-demand only — no "session start" nag reminders.
**Tradeoff:** Two different invocation mechanisms to maintain. Offset by them sharing the classifier (DEC-S003).
**Revisit if:** User ends up never running `/pull-seeds` manually — means downstream needs a gentler reminder mechanism, or the update frequency doesn't justify downstream sync at all.
