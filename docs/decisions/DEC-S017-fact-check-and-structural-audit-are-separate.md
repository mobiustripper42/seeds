---
id: DEC-S017
title: "Fact-check and structural-audit are separate reviewer concerns"
topic: "Agents & review"
---

## DEC-S017: Fact-check and structural-audit are separate reviewer concerns

**Date:** 2026-05-19
**Status:** Accepted
**Applies to:** All project types.

**Problem.** A casual "make sure the docs are consistent" prompt run in a brand-new crewbook checkout drifted from cross-reference fact-checking ("does CLAUDE.md's stack line agree with SPEC.md's?") into structural auditing ("DEC-007 references DEC-013 which isn't stubbed locally — should we add stubs for DEC-013/014/015, or restructure DEC numbering to put workflow DECs in seeds-only and project DECs at DEC-101+?"). Both kinds of review have value, but conflating them produced a wall-of-text response that buried the actual cross-doc finding (a stale version-bump trigger in the local DEC-007 stub) under a list of restructuring proposals the user hadn't asked for. The structural-audit framing also pulled the reviewer into "should we add stubs?" debates that aren't even consistency questions.

**Decision.** Fact-checking and structural auditing are distinct concerns and live in distinct surfaces.

- **Fact-checking** is the `@doc-consistency` agent (invoked via `/doc-consistency-check`). It cross-references claims across `docs/*.md` + root `CLAUDE.md`, flags mismatches with file:line refs and verbatim quotes, and flags unfilled template placeholders (literal `PLACEHOLDER`, bracketed leftover tokens). It produces no edits, no recommendations, no "should we restructure" prose. The agent spec carries an explicit out-of-scope list with the failure modes from the 2026-05-18 crewbook drift named directly: DEC numbering policy, file ownership, "this section should be added," stub strategy. If the reviewer notices an interesting structural concern, it gets one line in a tail "Out of scope (not investigated)" section and then the agent stops.

- **Structural auditing** is `@architect` or `@sync-config` territory, depending on which axis is in question. `@architect` reviews proposed architectural decisions against `SPEC.md` and `DECISIONS.md`. `@sync-config` classifies template-vs-project drift across files. Neither agent is invoked by `/doc-consistency-check` — keeping them out of the fact-check surface is what prevents the drift this DEC addresses.

**Project-type interaction (DEC-S011).** `@doc-consistency` reads `.claude/project-type` to interpret `docs/BRAND.md`. For `webapp` projects, BRAND.md must declare theme/colors/typography/voice — an empty or template-stock file is a finding. For `tool` projects, BRAND.md is allowed to declare itself out of scope, but only with an explicit justification (e.g. "tool project — no end-user surface, so no visual brand"). A bare "not used" or any occurrence of the literal string `PLACEHOLDER` is a finding regardless of type. Projects without `.claude/project-type` are ungated and the report says so.

**Consequences.**
- The `/doc-consistency-check` surface produces predictable, scannable reports. Pass-with-zero-findings is a valid result; the report doesn't pad.
- The agent will not surface DEC-numbering opinions, file-ownership opinions, or "you should add a section" prose. Future skills that want those concerns invoke `@architect` instead.
- The skill is wireable into `/start-phase` (pre-phase clean-state check) and `/retro` (phase-end snapshot) without changing the agent — both wirings are deferred until the manual surface stabilizes.
- The Routine forward-ports the skill + agent to bushel/captains-log/helm/sailbook/crewbook on the next sync.
- Crewbook's 2026-05-18 stale-DEC-S007 finding (the original signal) gets re-surfaced cleanly on the next `/doc-consistency-check` run there — no restructuring proposals attached.

**Why not extend `@architect` to cover doc consistency.** Different output shape, different fences. `@architect` reviews proposed decisions and is expected to make recommendations. `@doc-consistency` reviews facts in already-written docs and is expected to make zero recommendations. Bundling them would dilute both agents' specs and reintroduce the drift this DEC names.

---
