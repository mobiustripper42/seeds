---
id: DEC-S029
title: "Fable disabled in active guidance — taken, then withdrawn when Fable came back"
topic: "Model selection"
---

## DEC-S029: Fable disabled in active guidance — taken, then withdrawn when Fable came back

**Status: withdrawn.** This decision was taken (`883b2e5`) and then **deleted outright** when Fable was re-enabled (`e1c7bca`, "Re-enable Fable: delete DEC-S029, restore on-demand Fable tier in Model Selection"). It is reconstructed here as a stub because DEC-S030 still cites the id, and a citation that resolves to nothing tells the reader neither what it said nor that it was reversed.

**What it held:** the `claude-fable-5` frontier tier was withdrawn from active guidance while Fable was unavailable. Model Selection collapsed to two tiers — Opus (default/standing) and Sonnet (cheap/scoped) — and the Fable bundling trigger, the vision-escalation note, and the stray Fable mentions elsewhere in the shell came out with it. The reasoning was that guidance routing work to a tier that isn't there is worse than neutral: it's dead instructions that tell a session to escalate into a hole.

**Why it is gone rather than superseded:** it was written as a *suspension* — explicitly expecting Fable to return, with re-enabling defined as reverting this decision and restoring the DEC-S027 guidance block verbatim rather than reconstructing it from memory. When that happened, the decision had served its whole purpose, so it was deleted rather than struck.

**What governs now:** DEC-S034 — Opus 5 is the standing model, effort is the primary lever, and Fable is a narrow exception rather than a standing escalation path.

**The lesson worth keeping:** deleting a decision leaves every citation of it dangling, and nothing noticed for months. That is one of the failures DEC-S036's `check:decisions` now catches — this file is here because that check found it.
