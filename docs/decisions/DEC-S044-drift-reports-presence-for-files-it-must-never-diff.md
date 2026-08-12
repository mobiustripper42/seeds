---
id: DEC-S044
title: "`drift.mjs` gains a `presence` class — report the absence, never the contents"
topic: "Sync — directions, classification & file classes"
amends:
  - id: DEC-S018
    relation: extends
    scope: "adds a fourth file class, `presence`; the existing three and their meanings are unchanged"
  - id: DEC-S023
    relation: refines
    scope: "the per-repo settings.json now has one thing that notices when it is missing; distribution of its contents stays manual and unwatched"
---

## DEC-S044: `drift.mjs` gains a `presence` class — report the absence, never the contents

**Decision:** The file-class registry gains a fourth class, **`presence`**. A file classified `presence` is reported by `drift.mjs` **when it is absent from the project, and never otherwise** — its contents are not hashed, not compared, and not mentioned. `dev/claude/settings.json` is the first and currently only member.

The report prints in its own block, above both drift tables:

```
MISSING — no copy here, and nothing else reports it (1):
  absent  .claude/settings.json
  Contents are yours and are never compared. Only the absence is reported.
```

**The gap this closes.** `.claude/settings.json` was in no file class at all, and `drift.mjs` skips anything it cannot classify. So a project with **no repo-level permission policy whatsoever** produced no mention of it — verified before the change against a fixture project holding a `CLAUDE.md` and a `seeds-version` and nothing else: 23 rows of "also absent", not one of them the settings file.

That silence has already cost twice. muster lost its copy at DEC-S032 and soundings never had one; both went unnoticed for months, and both were found by hand in a session that went looking. Neither `check-docs` nor `drift.mjs` reports it, because to `check-docs` it is not a doc and to `drift.mjs` it did not exist.

**Why absence and contents are different questions.** DEC-S023 distributes this file **by hand, per machine**, and says so deliberately: permission guardrails are security posture, and a project legitimately carries whatever revision was last copied to it. A "differs" row would therefore be noise on every project simultaneously — and worse, it would assert that seeds' copy is the correct one. That is precisely the judgment DEC-S040 removed when it deleted `@sync-config`, and `drift.mjs` is written under an explicit standing instruction never to reacquire it.

Absence is not that kind of claim. It is checkable, it is never correct, and — per DEC-S023 — on a phone or web session the committed per-repo file is the **only** policy that reaches the ephemeral container. A missing one is not a stale revision, it is no seatbelt at all.

**Why it prints above the drift tables rather than inside them.** The existing "also absent or unexpected" block exists to say *ignore me* — it collects one-time migration helpers and stack-specific tooling a project has no use for. Filing a missing permission policy under a heading that means "often fine" is how a real gap gets read as a non-problem. And it is not DRIFT either, since DRIFT means two copies of something meant to be identical and one being stale; here there is one copy, and it is on another machine.

**This does not make `drift.mjs` a syncer or a classifier.** It reports one more fact and still copies nothing, still recommends nothing, still has no opinion about which side is right. The line it must not cross is comparison-with-a-verdict, and `presence` is defined specifically so it cannot: there is nothing to compare.

**What it still does not cover, so its silence is not mistaken for safety:**

- **The user-global `~/.claude/settings.json`** — on this box the file that actually governs most sessions. It is not in any checkout, so nothing enumerates it and nothing ever will. Manual, per machine, forever (DEC-S023).
- **Staleness of a present file.** A project holding a two-revision-old policy reads as fine, by design. That is the accepted cost of not comparing contents.
- **Drift appearing after the run.** Unchanged from `drift.mjs`'s existing caveat.

**Proof:** verified in both directions before and after, against a throwaway fixture — silent when the file is absent (the bug), reported when absent (the fix), silent when present, and **silent when present with deliberately different contents** (the property that keeps it an enumerator). muster and soundings both report nothing, correctly.

**Schema:** additive — a new class value that older readers ignore, and there are no automated readers left to break (DEC-S040). No version bump.

**Alternatives considered:** hardcoding the filename inside `drift.mjs` (rejected — the registry is the single answer to "what is this file", and a script accumulating its own list of special filenames is how the classifier grew the first time). Comparing contents and reporting "differs" (rejected — noise on every project, and an implicit verdict that seeds wins). Adding it to `check-docs.mjs` (rejected — it is not a doc, and `check-docs` gates a build while this is a briefing note).
