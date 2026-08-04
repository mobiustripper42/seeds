---
id: DEC-S030
title: "Memory doctrine removed — CLAUDE-context.md is the memory system"
topic: "Docs, decisions & context discipline"
---

## DEC-S030: Memory doctrine removed — CLAUDE-context.md is the memory system

**Decision:** The `## Memory` section is **deleted** from the synced shell (`dev/claude/CLAUDE.md`). The `MEMORY.md` + per-file "memory directory" scheme it described is retired entirely. Its three jobs re-home to systems that already exist and work:
- **Durable project facts / preferences / constraints** → `.claude/CLAUDE-context.md` (project-owned, loaded every session by the harness, reviewable as a diff, sync-safe).
- **Hard safety rules** (e.g. "don't read `.env`") → `.claude/settings.json` `deny` (DEC-S023), where the harness *enforces* the rule instead of relying on the model to recall prose.
- **Cross-cutting personal prefs** (tone, verbosity, narration) → already live in the shell.

**Why:** The memory doctrine was pure prose with zero machinery — no DEC, no skill, no scaffolding. It failed four ways at once:
1. **Wrote unprompted.** Rule 1 literally commanded it ("never wait for the user to ask… the moment the user states a durable fact… write the memory file"). Working as written *was* the complaint — silent writes the user couldn't govern.
2. **Never loaded.** Rule 2 ("reconcile at session start") was implemented by no skill; `/its-alive` has no memory step, so loading depended on the model spontaneously recalling CLAUDE.md prose, which it doesn't.
3. **Not enforced.** Even when loaded, a `MEMORY.md` pointer line kept no constraint salient.
4. **Not curatable.** Unprompted + unreviewed writes accumulate junk with no prune path.

The deeper point: `CLAUDE.md` + `CLAUDE-context.md` are already a memory system, and a strictly better one — harness-loaded (guaranteed, not model-dependent), deliberately written, reviewable, sync-safe. The memory layer stored the *same categories* ("a preference, a correction, a project constraint" is the doctrine's own trigger list) in a second, worse copy. Deletion removes all four failure modes by subtraction — nothing writes unprompted, so nothing needs curating; the thing that loads is the file the harness already loads.

**What changes:** `dev/claude/CLAUDE.md` § Memory removed (section sat between § Workflow Notes and § Approval Before Action). No replacement block added — the shell already directs project facts to `CLAUDE-context.md` at the top, so a Memory-adjacent pointer would just be a new vestige. No skill touched (`/its-alive` gets no memory step — the tape-reader's proposed Step 7.5 is moot once the system it served is gone).

**Scope — deviates from DEC-S029's "sync does it once," at user request.** Edited the canonical source *and* hand-applied the identical deletion to the seven live shells carrying the section (poop-deck, sailbook, muster, tinkle, helm, bushel, bushel-mobile) so the doctrine is gone immediately rather than waiting on the nightly Routine. soundings (older shell) and grace (knowledge repo) never carried it. All eight shells stay byte-identical.

**Follow-ups (not done here, flagged):**
- No live `MEMORY.md` files or memory directories were present in any clone, so none were deleted. Any that exist on other machines (e.g. a `dont-touch-secrets-files-unprompted.md`) are now dead weight — they load unreliably at best — and want a manual `rm`.
- The one memory that did real safety work (the `.env` warning) should be re-homed as a `settings.json` `deny` for harness enforcement. Not done unprompted here — additive to the removal.

**Schema:** template/labeling only — no skill contract or frontmatter-field change. No version bump (consistent with DEC-S023–S029).
