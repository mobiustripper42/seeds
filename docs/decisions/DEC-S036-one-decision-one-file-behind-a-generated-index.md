---
id: DEC-S036
title: "One decision, one file, behind a generated index — with amendments declared once and generated both ways"
topic: "Docs, decisions & context discipline"
---

## DEC-S036: One decision, one file, behind a generated index — with amendments declared once and generated both ways

**Decision:** A project's decision record moves from a single `docs/DECISIONS.md` to **one file per decision** at `docs/decisions/DEC-<id>-<slug>.md`, with `docs/DECISIONS.md` **generated** as a topic index over them. Amendment relations (`amends:`) and spec amendments (`amends_spec:`) are declared **once**, in the amending decision's frontmatter, and the reciprocal pointers are generated — into the amended decision's own file, onto its index row, and under the amended `docs/SPEC.md` section's heading. `scripts/gen-decisions-index.mjs` writes; `scripts/check-decisions.mjs` gates.

**Adopted from muster** (its DEC-141 + DEC-143), which ran it across 145 decisions before this backport.

**Why one file per decision:** the record is read one decision at a time — someone hits an id in a code comment or another doc and wants *that* holding, not the whole file. muster's was 4,161 lines, so answering one question meant loading all of it. A file read replaces a scroll, `grep -rl DEC-042 docs/decisions/` resolves any id, and a topic grep pulls a whole area. It also makes the index derivable rather than hand-maintained, which is what killed its predecessor: a hand-updated index decays silently, and muster's had drifted to claiming "124 of 124" against a real 131 rows over 136 bodies.

**Why the reciprocal pointer is generated, not written:** muster's audit found **28 supersede-class edges where the amending decision updated itself and never its target**. A reader arriving by `Ctrl-F`, a code comment, or another doc's citation lands in the *body* of the amended decision, not in the index — so an index-only pointer reaches nobody who needed it, and they read the retired answer with no signal. Declaring the edge once and generating both ends is what makes the two agree by construction.

**Why ten relations, and why only `supersedes` strikes a row:** a strike-through was the only "something changed" marker available, which forced every partial amendment to be recorded as total or as nothing. An audit of all 138 muster decisions found **zero fully superseded** — every struck row still had a leg cited by SPEC, code, or a later decision. So partial amendment (`amends` + a `scope`) is the default and total supersession is the rare case. The vocabulary (`amends`, `revises`, `refines`, `reverses`, `retires`, `extends`, `corrects`, `resolves`, `reframes`) was already in use as prose; declaring it in frontmatter is what makes it checkable.

**Why `amends_spec`:** the audit's single largest finding class was a change that lands in a decision and never in the spec it claims to change — 17 of 41 such claims had not landed. A declared spec amendment generates the pointer under that section's heading, so an unlanded claim is a red build rather than a line of prose nobody cross-read.

**Everything project-specific is config, not code.** The topic order (editorial — it is the index's reading order), the non-numeric id families and where they sit in the record's chronology, and the spec path live in `docs/decisions/_config.json`. The scripts are therefore **byte-identical across every project** and are registered `logic` in `routine-config.yaml` — a project that needs different behavior edits its config, never the script. Verified behavior-preserving: regenerating muster's full record with the config-driven version produced a zero-byte diff across all 145 decision files, the index, and SPEC.

**Two mechanisms worth not re-litigating.** (1) The index carries **no "N of M" footer** — completeness is asserted by a throw at generation time instead. The footer was the only per-branch-varying line in a generated, committed file: two branches each adding a decision write different numbers, git merges the rows cleanly and silently takes one footer, and the trunk lands stale with no conflict marker. That is how muster's main went red after a six-PR merge. (2) `stripBanner` normalizes **only the seam it creates** — a global blank-line collapse makes the generator a non-fixed-point for any body containing a double blank line, so the first run writes a file and the next check calls that same file stale.

**Migration:** `scripts/split-decisions.mjs`, run once per project. It deliberately **never invents an `amends:` edge** — "superseded" and "amended in one leg" are indistinguishable in prose, and a guess would write a wrong fact into a *generated banner*, which reads as verified. It reports every decision whose prose smells like an edge and leaves the declaration to a human. Same for topics: everything lands in the first topic and the report says so, because a wrong topic is visible on sight and a wrong edge is not.

**Scope:** new `dev/claude/scripts/{gen-decisions-index,check-decisions,check-decisions.test,split-decisions}.mjs`; new `dev/claude/docs/decisions/{_config.json,_preamble.md,DEC-001-example…md}`; `dev/claude/docs/DECISIONS.md` becomes generated output; `dev/claude/CLAUDE.md` gains `## Decision Record`; `dev/claude/agents/{architect,code-review,pm,ideas}.md` gain the read-the-record step and the citation rule; `.claude/routine-config.yaml` file-class registrations.

**Schema:** **V5.** A project's decision record changes shape on disk and `/pull-seeds` must not install these scripts into a project still carrying a monolithic `DECISIONS.md`. See `docs/SCHEMA_VERSIONS.md`.
