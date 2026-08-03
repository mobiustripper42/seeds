---
id: DEC-S031
title: "CLAUDE.md shell audit — cut bloat, merge duplicates, add the memory keepers"
topic: "Docs, decisions & context discipline"
---

## DEC-S031: CLAUDE.md shell audit — cut bloat, merge duplicates, add the memory keepers

**Decision:** Audited the synced shell (`dev/claude/CLAUDE.md`) through four lenses — misleading/stale, unnecessary, could-be-more-direct, could-be-a-hook — and rewrote it shorter and sharper. The thesis (from the same session that produced DEC-S030): CLAUDE.md prose only sticks if it's lean; bloat buries the rules that matter and trains the reader to skim.

**What changed:**
- **Three overlapping sections → one.** `Response Length` + `Verbosity` + `Narration` all said "be concise" (~30 lines); merged into one `Communication` section (~14). The section telling the model not to wall the user was itself a wall, three ways.
- **Reference material out of the always-loaded file.** The `<VersionTag />` wiring, CHANGELOG format example, and "PR Review on Mobile" notes (~40 lines) moved to `dev/claude/docs/DEV_REFERENCE.md`. The Versioning *rule* stays; the examples don't load every session anymore.
- **Duplicate merged.** `Bug Reports & Questions` just restated `Approval Before Action`; folded into one.
- **`Scope Discipline` "Splitting" block trimmed** from ~7 lines to its 3 load-bearing bullets.

**Memory keepers folded in (from DEC-S030's triage, 5 locked by the user):**
1. *Stop-and-reconcile on the first surprise — pin the assumption/environment before diagnosing* → Workflow Notes (replaces the narrower "Debugging CI failures" bullet). The false-premise fix.
2. *Trust the user's statement the first time; check the obvious thing last, not first* → Approval Before Action.
3. *Enumerate + confirm the concrete set before writing code; live words override docs* → Micro Workflow step 1 (sharpened). Also the target of the planned spec-gate **hook**.
4. *Change only the named surface; never invent a rationale the user didn't state* → Scope Discipline.
5. *Don't guess third-party API shapes; ask for the real docs* → Workflow Notes.
Plus a new `Communication` rule — *never lead with a false premise* (state a made-up cause as fact, then defend it at length) — the sharpest ask from the session.

**Deliberately kept:** Cost and Waste, Model Selection, Micro Workflow, Migration Protocol, PR Workflow, Production branch. A full pass, not cherry-picks.

**Hooks deferred (not in this DEC):** three enforcement candidates surfaced — a verbosity/register check on replies, the spec-gate (block the first code-write of a task until "done = X" exists), and a "no test, no push" pre-push check. These are settings.json/hook work, tracked separately from the shell rewrite. Prose that drifts becomes a tripwire that holds.

**Net:** ~90 lines cut, ~4 added. Shorter and sharper.

**Scope (deviates from steady-state sync, deliberately):** the rewrite lands on the canonical `dev/claude/CLAUDE.md` + the new `dev/claude/docs/DEV_REFERENCE.md` first, for review before it fans out to the seven live shells (poop-deck, sailbook, muster, tinkle, helm, bushel, bushel-mobile). Once approved, the identical shell is copied to each so all eight stay byte-identical; DEV_REFERENCE copies into each project's `docs/`.

**Schema:** template/labeling only — no skill contract or frontmatter-field change. No version bump (consistent with DEC-S023–S030).
