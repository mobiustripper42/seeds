---
id: DEC-S038
title: "The nightly sync Routine is off — seeds ↔ project sync is on-demand from CC Desktop"
topic: "Sync — directions, classification & file classes"
amends:
  - id: DEC-S004
    relation: amends
    scope: "the upstream leg — both directions are now manual; downstream-is-manual was already right"
  - id: DEC-S010
    relation: retires
    scope: "the nightly automation only — the config, the classifier and the file-class registry it defined are still read by manual sync"
  - id: DEC-S028
    relation: retires
    scope: "the digest is dormant while the Routine that emitted it is off"
---

## DEC-S038: The nightly sync Routine is off — seeds ↔ project sync is on-demand from CC Desktop

**Decision:** The Anthropic Routine that ran bi-directional sync nightly is **disabled**. Sync happens
on demand, per repo, driven from Claude Code Desktop — `/pull-seeds` downstream, `/push-seeds`
upstream, or a direct session in the repo doing the same work by hand.

**Operator, 2026-08-04:** *"Routine is off. I think I will just use CC Desktop to update repos as
needed."* That is the whole rationale on record; nothing further is attributed here.

**What stops.** The nightly fire. Automatic per-repo PRs in both directions. `mode: auto`
invocations of `@sync-config`. The rolling `routine: last run` and `routine: migration backlog`
issues. The Step 4.5 fleet-status digest (DEC-S028).

**What stays, because none of it was ever Routine-specific.** The file-class registry (DEC-S018),
project-type gating (DEC-S011), the schema-version gate (DEC-S006), and `@sync-config`'s classifier
itself are all read by manual `/pull-seeds` and `/push-seeds` too. `.claude/routine-config.yaml`
remains the source of truth for `file-classes:`; only its scheduling keys go dormant. The Routine
prompt stays source-controlled at `dev/claude/routines/nightly-sync.md`, so re-enabling is switching
it back on rather than rebuilding it — the same reason DEC-S029 should have been kept rather than
deleted.

**What gets better.** `mode: auto`'s safety rules exist because an unattended bot cannot tell a
genuine upstream improvement from a stale project — the PUSH+auto skip, the Both-modified default,
the logic-drift skip. Every one of those trades a real backport for protection against a bot
running blind. With a human driving, that judgment is present by construction, and the interactive
paths were always the better half of the design.

**What gets worse, stated plainly.** Drift between seeds and a project is now discovered only when
someone runs a sync. Under a nightly pass the window was a day; now it is however long until
somebody looks. The V5 rollout is the live example — sheepdog's migration improved
`scripts/check-docs.mjs`, and seeds' template was behind until the backport merged. Nothing would
have surfaced that gap on its own.

**The ordering trap this creates.** `scripts/**` is `logic` class, so seeds wins in the pull
direction and drift there is a full-file overwrite onto the project. When a project's migration
improves a shared script, the improvement must reach seeds **before** the next downstream sync, or
that sync silently replaces the project's newer copy with seeds' older one. The schema-version gate
does not help: both sides read the same number by then. Recorded in `docs/SCHEMA_VERSIONS.md`
§ v4 → v5 as a step, because a rule that lives only in a decision file is a rule nobody reads at the
moment it applies.

**Revisit if:** the fleet grows past what on-demand sync keeps current, or projects start drifting
far enough apart that a nightly pass would have caught something a human pass did not.
