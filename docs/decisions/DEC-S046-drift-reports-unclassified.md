---
id: DEC-S046
title: "`drift.mjs` reports what the registry never classified — silence is not an answer"
topic: "Sync — directions, classification & file classes"
amends:
  - id: DEC-S044
    relation: refines
    scope: "S044's holding stands untouched — the `presence` class, its semantics and its sole member are unchanged, and nothing here operates on that branch. What is refined is its reach: S044 treated one unclassified file by classifying it, leaving intact the mechanism that made it invisible, and that mechanism produced two more instances"
  - id: DEC-S018
    relation: refines
    scope: "the registry's stated rule for an unmatched file now has something that enforces it; the file classes themselves are untouched"
---

## DEC-S046: `drift.mjs` reports what the registry never classified — silence is not an answer

**Decision:** `drift.mjs` distinguishes **a class it does not diff** from **no class at all**, and reports the second. A template file matching no glob in `.claude/routine-config.yaml` § `file-classes` prints in its own block, last, phrased as a seeds-side gap:

```
UNCLASSIFIED in seeds — no file-class entry, so never compared (1):
  ?       .claude/agents/pm.md
  Fix in seeds: .claude/routine-config.yaml § file-classes. Not this project's drift.
```

It is reported **whether or not the copies differ**. The defect is the missing entry, not the bytes.

Nine files were in this state. All nine are now classified — `agents/doc-consistency.md` and `docs/VELOCITY_AND_POKER_GUIDE.md` as `logic`; `agents/pm.md`, `CLAUDE-context.md`, `session-log.md`, `templates/**`, `docs/AGENTS.md`, `docs/CHEATSHEET.md` and `docs/DEV_REFERENCE.md` as `context`. The block they motivated stays, because the next file added to `dev/claude/` will arrive unclassified too and nothing else would say so.

**How it was found, and what that says.** In a project being brought up to date, `.claude/agents/doc-consistency.md` still routed out-of-scope findings to `@sync-config` — an agent deleted by DEC-S040 — and `drift.mjs` reported that project clean. `agents/pm.md` differed as well, equally unreported. Both had been outside the registry since the day they were written; neither was ever a deliberate exemption. The bug was found by a code review reading the *sync itself*, not by the differ whose entire job is to find it.

Those are claims about another repository and cannot be verified from this checkout — same caveat DEC-S044 attaches to its muster/soundings evidence, and for the same reason. They are recorded as the observation that motivated the change; the session 34 notes and bushel PR #294 are where they are pinned. **The seeds-side half is checkable from here and is what the decision actually rests on:** nine files matched no glob, and `drift.mjs` skipped every one.

`drift.mjs` skipped them at one line:

```js
if (cls !== 'logic' && cls !== 'hybrid') continue  // unclassified — decide deliberately, don't report as drift
```

The comment is the whole problem in miniature. "Decide deliberately" describes an act nobody was prompted to perform, and `continue` guaranteed nobody would be. `context`, `seeds-only` and `presence` are answers, and skipping them honours one; `undefined` is the **absence** of an answer, and skipping it silently is indistinguishable from agreement.

The registry's own header (`routine-config.yaml:117-119`) already said the right thing — an unmatched file *"has never been classified; treat it as unclassified rather than assuming a default, and decide deliberately before copying it."* The rule was stated in the config and not implemented in the one script that reads it. That gap is the recurring shape here: **DEC-S044 fixed this exact failure for one file** (`settings.json`, unclassified, therefore invisible, therefore absent from two repos for months) by giving that file a class. It did not fix the mechanism that made it invisible, so the mechanism produced two more instances immediately.

**The `scripts/**` default is backwards, and this is the third proof.** The blanket `dev/claude/scripts/**: logic` asserts that every project holds a copy of every script. Every seeds-side tool has therefore been caught by it and carved out **after shipping**, one at a time: `drift.mjs` (PR #172), `tape-capture.sh` (PR #180), and now `throughput.py` — which `/retro` never invokes (Step 2 computes throughput inline from GitHub) and which **both** templates naming it cite at its seeds-side path (`skills/retro/SKILL.md:283`, `docs/VELOCITY_AND_POKER_GUIDE.md:33-42`). In this session the wrong classification actively caused the error it exists to prevent: the differ reported `throughput.py` "absent here", so it was copied into a project, where it does nothing. A fourth instance should invert the default rather than add a fourth carve-out line.

**Why the block prints last and says "not this project's drift".** A reader running `drift.mjs` is standing in a project, deciding what to copy. An unclassified row is not something they can act on from there — the fix is an entry in seeds' registry — so putting it in either drift table would mix rows the reader can act on with rows they cannot, which is how the actionable ones stop being read. Same reasoning that gave DEC-S044's `MISSING` its own block, applied in the other direction: that one prints **first** because it is urgent and local; this one prints **last** because it is neither.

**What this does not do.** It does not classify anything automatically, guess a class, or default an unmatched file to `logic`. Any of those would hand the script an opinion about which side is right, which is the standing prohibition it operates under (DEC-S040) and the constraint DEC-S044 was careful to respect. It reports that a question has not been answered. Answering it stays a person's job, in a YAML file, in seeds.

**Cost.** Nine rows of noise on the first run in any project whose seeds checkout has unclassified templates — zero now, since all nine are classified, but non-zero again the moment someone adds a file to `dev/claude/` and forgets the registry. That is the intended cost: the report is the reminder, and it stops the day someone spends thirty seconds on the entry.
