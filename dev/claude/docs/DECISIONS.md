# [Project Name] — Architectural Decisions

Architectural decisions, each with an ID. Unresolved questions are parked as open-question entries at the bottom.

> Where a decision compresses reasoning that lives in the spec, the spec section is cited — read it
> for the full argument.

**One decision, one file.** Each lives at `docs/decisions/DEC-<id>-<slug>.md`; this file is the
generated index. Read one decision by reading its file — `grep -rl DEC-NNN docs/decisions/` resolves
any id, and `grep -rl 'topic: "Auth' docs/decisions/` pulls a whole topic — rather than loading the
whole record to answer one question. To add or change a decision, edit its file and run
`npm run gen:decisions`; `npm run check:decisions` fails the build if this index is stale.

**A change to a decision goes IN that decision's file**, appended as a dated
`## Amendment, YYYY-MM-DD (who)` section. It is not a new decision and gets no id of its own. A new
id is for a subject the record has no decision about yet — one worth writing even if nothing before
it existed. Two decisions that merely relate name each other in a plain **see also**.

**So every row here is one subject, and the file behind it holds the current answer.** The index
carries no strike-throughs and no "amended by" annotations: a decision amended last week still shows
its original title and date, because the amendment is inside it. The row tells you a subject exists;
the file tells you what is true. Open the file.

A decision that changes the spec declares that in frontmatter — `amends_spec: [{section, scope}]` —
and the pointer under that spec section's heading is generated from the declaration. A claim that
never reached the spec is then a red build rather than a line of prose nobody cross-read. This is
the one generated cross-reference left, and it points at the spec, never at another decision.

## Index

### Workflow, tooling & process
- DEC-001 — Example decision — delete this file once the project has a real one

_**This file is GENERATED** by `npm run gen:decisions` —
edit `docs/decisions/DEC-*.md`, not this file. `npm run check:decisions` fails on a stale index, a
duplicate id, an unknown topic, an unlanded SPEC amendment, or a reference to a decision
that does not exist._
