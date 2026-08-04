---
id: DEC-001
title: "Example decision — delete this file once the project has a real one"
topic: "Workflow, tooling & process"
---

## DEC-001: Example decision — delete this file once the project has a real one

**Decision:** This file exists to show the shape. Frontmatter carries `id`, `title`, and `topic`;
the body carries the argument. The `## <id>: <title>` heading repeats the frontmatter so the file
reads on its own, on GitHub, and in a grep hit.

**Why:** A decision is read one at a time — someone hits `DEC-001` in a code comment or another
doc and wants *this* answer, not the whole record. One file per decision makes that a file read
instead of a scroll, and makes the index generatable rather than hand-maintained.

**Tradeoff:** An extra step (`npm run gen:decisions`) after every edit. `npm run check:decisions`
makes forgetting it a red build rather than a silent stale index, which is the whole point — the
hand-maintained version decayed precisely because nothing noticed.

**Declaring an amendment** — if this decision later replaced one leg of an earlier decision, its
frontmatter would carry:

```yaml
amends:
  - id: DEC-NNN
    relation: refines
    scope: "the retry policy only — the transport choice stands"
```

and the generator would write the reciprocal banner into that decision's own file and the
annotation onto its index row. Never hand-write either end.

**Declaring a spec change** — if it rewrote §2.4 of `docs/SPEC.md`:

```yaml
amends_spec:
  - section: "2.4"
    scope: "the availability rule; the surface described below is unchanged"
```

and the pointer under that section's heading is generated. `scope` is mandatory here: it is what
tells a reader of that spec section what stopped being true.
