# [Project Name] — Architectural Decisions

Architectural decisions, each with an ID. Unresolved questions are parked as open-question entries at the bottom.

> Where a decision compresses reasoning that lives in the spec, the spec section is cited — read it
> for the full argument.

**One decision, one file.** Each lives at `docs/decisions/DEC-<id>-<slug>.md`; this file is the
generated index. Read one decision by reading its file — `grep -rl DEC-NNN docs/decisions/` resolves
any id, and `grep -rl 'topic: "Auth' docs/decisions/` pulls a whole topic — rather than loading the
whole record to answer one question. To add or change a decision, edit its file and run
`npm run gen:decisions`; `npm run check:decisions` fails the build if this index is stale.

**Three states, not two.** A strike-through is the only marker for "something changed", which forces
every partial supersession to be recorded as total or as nothing. In the project this pattern came
from, an audit of 138 decisions found **zero fully superseded**: every struck row still had a leg
cited by the spec, the code, or a later decision. So:

- **plain row** — current, nothing amends it.
- **~~struck~~ → superseded by another decision** — the whole holding is replaced.
- **row + "amended by … — scope"** — the decision still governs, but one leg was replaced. **Use
  this by default**; total supersession is rarer than it looks.

The relation and its scope are declared once, in the amending decision's `amends:` frontmatter, and
generated in both directions — onto the row below *and* into a banner at the top of the amended
decision's own file. The same audit found 28 supersede-class edges where the amending decision
updated itself and never its target, because a reader arriving by `Ctrl-F`, a code comment, or
another doc's citation lands in the body, not the index. Declaring it once is what makes both ends
agree.

Available relations: `supersedes` (the only one that strikes a row), `amends`, `revises`, `refines`,
`reverses`, `retires`, `extends`, `corrects`, `resolves`, `reframes`.

A decision that changes the spec declares that too — `amends_spec: [{section, scope}]` — and the
pointer under that spec section's heading is generated from the declaration. A claim that never
reached the spec is then a red build rather than a line of prose nobody cross-read.
