---
id: DEC-S042
title: "The shell states invariants and the context file fills named slots — overrides are a patch where the structure was wrong"
topic: "Docs, decisions & context discipline"
amends:
  - id: DEC-S019
    relation: refines
    scope: "how the shell/context boundary is drawn inside Micro Workflow — the split itself, and every other section's use of it, stands"
---

## DEC-S042: The shell states invariants and the context file fills named slots — overrides are a patch where the structure was wrong

**Decision:** `## Micro Workflow` states what every step must *achieve* and names a **slot** for how. Each project fills its slots in `.claude/CLAUDE-context.md` under `## Workflow Mechanisms`. `## Workflow Overrides` — which corrected the shell's defaults by step number — is retired.

**Slots are referenced by name, never by step number.**

### The problem

DEC-S019 split `CLAUDE.md` into a syncing shell and a project-owned context file, on a clean binary: universal guidance in the shell, project-specific facts in context. That binary is missing a third category, and Micro Workflow is where it shows.

**Some rules are universal while their *mechanism* is not.** *"Prove the change before you make it"* holds in every project. *"Write a failing Playwright test, plus pgTAP if RLS-touching"* holds in one shape of project. The shell currently states the second as the default and sends everything else to an overrides section — so a `tool` project reads a webapp instruction, then reads a correction of it. Three steps do this: the failing test, the targeted test command, and the 375px screenshot.

That is a **patch mechanism standing in for structure**, and it fails in four ways:

**The wrong instruction is read first.** Muster and soundings both get a Playwright/pgTAP step neither can run, then a paragraph explaining it doesn't apply. The always-loaded file's default is false for the project loading it.

**Overrides cite step numbers, and numbers move.** When steps 4 and 5 swapped at v5, muster's override still read "Step 5 (Write the test)" — describing the pre-v5 order, in an always-loaded doc, silently. The same shell adoption that fixed one thing broke this. The template's own worked example carries the identical bug today: it says *"Step 5 — no pgTAP"* when the test step is 4.

**"Applies as-is" is unfalsifiable.** A project that never wrote overrides looks the same as one whose overrides went stale. Nothing distinguishes "the default fits" from "nobody checked."

**It makes the shell un-copyable in exactly the case it was built for.** DEC-S019's promise was that the shell copies clean. It does — into a project whose overrides now describe a step layout that changed.

### The cut

**The shell owns the invariant. The context file owns the mechanism. Neither corrects the other.**

Concretely, the three leaking steps become:

| Step | Invariant (shell) | Slot (context) |
|---|---|---|
| Prove it first | Write the check before the change and watch it fail *for the expected reason*. A check written afterwards has never been observed failing, so it may assert nothing. | `Proof` — what a check is here |
| Run the proof | Run the checks covering what you touched, not the whole suite. | `Proof command` |
| Check the surface | Confirm the change is right where a person meets it. | `Surface check` |

A `webapp` fills `Proof` with "Playwright integration test, pgTAP if RLS-touching" and `Surface check` with "375px screenshot". A firmware project fills them with "Vitest against the domain core" and "flash the bench node, read the packet". **Both fill the same slots. Neither corrects a default, because there isn't one.**

**This is not a new pattern in the file — it is the pattern the file already uses everywhere else.** `## Migration Protocol` states the discipline and sends the toolchain to context. `## Conventions` sends the whole body there. Micro Workflow was the one section that inlined a project type's answer instead of naming the question.

### Why by name, not by number

A slot named `Proof` survives renumbering, reordering, and insertion. A cross-reference to "Step 5" survives none of those and fails **silently**, in a file loaded into every session as ground truth. This is the same failure class as DEC-S030's context-docs rule: a snapshot of current state goes stale the day the thing moves, and no audit catches it because the claim is about a document, not code.

### What this costs

**Every project needs a one-time pass** to convert overrides into filled slots. Small — three slots — but it is real work in each repo, and a project that skips it has empty slots rather than wrong ones, which at least fails visibly.

**An unfilled slot must read as unfilled.** `(None — the shell's default applies)` is exactly the unfalsifiable state being removed; the template ships each slot with a placeholder that a doc-consistency pass can see.

**And the shell gets slightly more abstract.** "Write the check before the change" is weaker prose than "write the failing Playwright test." That is the trade: the concrete version is better writing and wrong in most repos it lands in.

### What this does not change

DEC-S019 stands — the shell/context split, and the classes in `.claude/routine-config.yaml`. Every other shell section keeps its current shape. This narrows *how* the boundary is drawn inside one section that had drawn it by correction rather than by structure.

**Spec:** `docs/SPEC.md`.

**Schema:** no bump on its own. The context file gains a section and loses one, but nothing reads either mechanically, and a project with the old `## Workflow Overrides` keeps working — the shell simply stops promising a default for it to override. Fold the conversion into the next schema bump's migration notes rather than minting one for a prose reshape.
