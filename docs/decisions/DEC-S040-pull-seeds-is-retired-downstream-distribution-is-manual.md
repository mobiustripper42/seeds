---
id: DEC-S040
title: "Automated seeds ↔ project sync is retired entirely — the loop is observe, promote, copy by hand"
topic: "Sync — directions, classification & file classes"
---

## DEC-S040: Automated seeds ↔ project sync is retired entirely — the loop is observe, promote, copy by hand

**See also** — decisions this one changed part of:
- Revises DEC-S038 — the holding that manual /push-seeds and /pull-seeds carry the steady state — both are now retired; the Routine stays off
- Revises DEC-S039 — @tape-reader's project-owned fix path and PR, and Phase 4's outward mechanism — the observation half stands unchanged
- Revises DEC-S018 — the registry loses every automated consumer and survives as guidance for the manual copy
- Revises DEC-S011 — type gating loses its consumer with @sync-config; the manifest survives as documentation
- Refines DEC-S006 — what the version integer is for, now that no skill gates on it

**Decision:** `/pull-seeds`, `/push-seeds`, and `@sync-config` are deleted. `@tape-reader` edits
**nothing** in the repo it runs in. The workflow loop is three steps, of which exactly one is
automated:

| Step | What | Where |
|---|---|---|
| `/read-the-tape` → `@tape-reader` | skill. Reads a transcript, writes one cited observation. Touches no file in the project. | in a project |
| `@workout` | agent. Groups observations into patterns, makes the severity call, opens one PR. | in seeds |
| copy the merged change outward | **manual.** No skill, no agent, no classifier. | from seeds |

### Why the automation went

**The projects differ more than they agree.** Every attempt to automate the crossing has ended by
narrowing what it was allowed to touch — the file-class registry (DEC-S018) carved out `context`,
project-type gating (DEC-S011) carved out whole files by project shape, DEC-S035 pulled the three
substantive reviewers out of scope entirely, and DEC-S019 split `CLAUDE.md` in half so that one half
could be left alone. Each of those was correct. Together they are a machine whose scope had been
whittled down to the files where copying was already trivial.

**The trigger:** muster at `seeds-version: 4`, seeds at `5`, two files needing to cross that had
nothing to do with the v4 → v5 decision-record split. `/pull-seeds` stopped at the gate. The correct
move was `cp` twice — and the skill's whole purpose was to be the thing you did not have to do that
with.

**And the gate was right.** A v4 project genuinely must not receive v5's `check-decisions.mjs`. That
is a per-file hazard enforced at repo granularity, and the repair is not a finer-grained gate. It is
noticing that the operation under all this scaffolding is `cp`, and that deciding *which* file
should cross is the part that actually needs a person.

### `@tape-reader` edits nothing

DEC-S039 split findings by file class: fix what the project owns, observe the rest. That line is
gone, and with it the registry lookup, the `y/n` approval loop, the commit, and the PR.

**The reason is that the split bought nothing.** Its whole content was "`logic` files are dangerous
to edit here, project-owned ones are safe" — an argument about *sync*, made to an agent whose actual
job is reading a transcript. With no sync, an auditor that also edits files is just an auditor with
a side effect. One output, one destination, no branch state, no approval loop: it reads, and it
writes one observation to seeds.

The cost, and it is real: a repeated permission prompt (P2) — the canonical project-local finding,
with a project-local fix in `.claude/settings.json` — now becomes an observation rather than a
`y/n` and an edit. Someone applies it by hand, or does not. That is a genuine step backwards on the
cheapest class of fix, accepted because a tool that only observes is one whose output you can trust
without reading its diff.

### `logic` class survives as guidance, not as enforcement

The registry's consumers were `@sync-config` (deleted) and `@tape-reader`'s edit gate (removed). It
has no automated reader left.

It stays anyway, as the answer to the question the manual copy actually asks: **which files are
byte-identical everywhere and safe to copy wholesale, and which are project-owned and must never be
copied at all.** `.claude/type-manifest.yaml` survives on the same terms — it says which template
files a `tool` project has no use for. Both are now documentation for a human doing `cp`, and are
labelled as such where they live.

The argument for why a project should not fix a `logic`-class file in place also has to be restated,
because the old one died with the mechanism:

- **Before:** the edit is silently deleted by the next `/pull-seeds` full-file overwrite.
- **Now:** nothing deletes it. It survives, and never propagates — invisible local drift in a file
  meant to be identical everywhere, which nothing will ever reconcile.

A weaker failure and a longer-lived one. The remedy is unchanged and is now the only remedy: the
observation path, because it is the only route that ends in seeds.

### What is lost

**Enumeration, and this time nothing recovers it.** `/pull-seeds` would tell you what had drifted
before you decided anything, and `/push-seeds` would do the same from the other side. With both gone
and `@sync-config` deleted, no tool answers "what differs between this project and seeds." A
distribution session runs `diff` and reads the output.

That is the deliberate trade. Enumeration was the half worth keeping and the half that cost almost
nothing to rebuild if it turns out to matter — a read-only differ has no gate, no classifier, and no
write path to get wrong. It is not being built now, on the same reasoning that kept `@workout` from
being built before there were observations to test it against: build the thing when the need is
observed, not when it is anticipated.

**And the outward path is now a habit.** A rule `@workout` promotes sits in seeds until someone
copies it out. This is the third mechanism retired in favour of a ritual — after the Routine
(DEC-S038) and after `/pull-seeds`. If that bet is wrong it is wrong in a compounding way: the fleet
stops being one workflow and becomes N workflows that were once the same. The counter-argument, and
the reason to take it anyway, is that all three mechanisms were *already* not running — the Routine
was off, `/push-seeds`-after-merge was a line of prose nobody acted on (DEC-S039), and `/pull-seeds`
was blocked by its own gate the first time it was needed.

### What the version integer is for now

`seeds-version` gates nothing, because nothing is left to gate. It keeps one job, which was always
the more useful one: `<project>/.claude/seeds-version` against `seeds-version` answers **how far
behind is this repo**, and `docs/SCHEMA_VERSIONS.md` turns the difference into a task list. A
migration is now something you do because the number says you owe it, not because a skill refused to
run.

### What this does not change

The observation half of DEC-S039 stands exactly as written — the orphan `observations` branch, the
inbox/ledger split, cited evidence, cost-and-detectability captured at observation time. `@workout`
stands, including its PR-never-merge rule. The Routine stays off (DEC-S038); this removes the manual
replacement that decision named, and does not reopen the scheduled question.

**Spec:** `docs/SPEC.md`.

**Schema:** no bump. This removes capabilities and adds no requirement; no project's on-disk
contract changes. A project with `.claude/skills/{push,pull}-seeds/` and `.claude/agents/sync-config.md`
still installed keeps working until someone deletes them — correct for a retirement rather than a
migration. Deleting them is a manual copy like any other.
