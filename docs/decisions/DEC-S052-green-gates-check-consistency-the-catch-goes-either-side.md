---
id: DEC-S052
title: "Green gates check consistency, not truth or surface — so the catch goes on either side of them"
topic: "Agents & review"
---

## DEC-S052: Green gates check consistency, not truth or surface — so the catch goes on either side of them

**See also** — decisions this one relates to:
- Extends DEC-S033 — `@code-review` gains a tenth check. The stack-neutral posture and the deferral
  to `CLAUDE-context.md § Conventions` are unchanged; the new check is stack-neutral by construction
- Constrained by DEC-S035 — `@code-review` is project-owned and never syncs. This edits the
  install-time template only; every existing project needs the check hand-merged into its own
  adapted copy, and `drift.mjs` will not report the gap because the file is `context`-class

**Decision.** Two edits, one holding.

1. **`@code-review` gains check 10 — "unsourced claims in the diff."** Every sentence in a diff that
   asserts a fact must have a locatable source: the file it describes, a tool result the diff cites,
   or a captured payload. A claim whose source cannot be found is reported as a finding with a new
   **unsourced** severity, quoted, with the one command that would settle it — and is *not* settled
   by the reviewer and passed. Sentences labelled as proposals or hypotheses are explicitly out of
   scope; a hedge that names itself is the wanted behaviour.

2. **The Micro Workflow's `Check the surface` step is marked advisory, and the authoritative hand
   test moves to the PR.** The step stays where it is and keeps its slot; what is added is that
   `@code-review` has not run yet at that point, its fixes land as later commits on the same branch,
   and the hand test that counts is the PR's own `Verify by hand` section run after `/kill-this`
   opens the PR and before merge.

**Why one decision and not two.** Both are consequences of one fact about the pipeline: **a passing
gate is a statement about internal consistency, not about truth and not about what a person sees.**
`@code-review` checks the project's conventions and invariants. `/security-review` checks what a
hostile or malformed input does. The suite checks that the code does what the tests say. Given a
diff whose premise is false, or whose defect is in what renders, all three are green and all three
are correct to be green. Nothing downstream distinguishes that from a clean pass, because
*"0 findings"* has one spelling.

### The evidence, which is why this is not a hunch about review scope

Six observations, two repos, 2026-08-16 → 2026-08-25, all with every automated pass green.

| what shipped | what the gates said | who caught it |
|---|---|---|
| a test fixture built from a paraphrase of a sentence the operator said, silencing a real alert on a money-adjacent report | `@code-review`: 0 findings | the operator, who happened to know the one customer record that mattered |
| a `KNOWN BROKEN` comment and a tracking issue written from a test's *title*, while that test's CI run was green on the same branch | `@code-review` 2 findings (neither about the claim), `/security-review` clean, CI green | the model itself, 3.5 hours later, by accident, while checking CI for something else |
| a decision record stating two validators had been retired when neither had been touched | caught here — `@code-review` did fire, because the review prompt happened to name the check | the reviewer, contingently |
| a comment claiming the product bills by the boat, contradicted by the pricing file | nothing | self-noticed post-hoc, and left unfixed on `main` |
| a compound-outcome message picker that silently dropped "cancelled" whenever a refund error rode along, so a failed submission cancelled a booking and reported only *"Enter an amount like 50 or 536.25"* | `npm run verify` (2429 tests), targeted e2e, `@code-review`, `/security-review` — all green | the operator's own seven hand steps, after merge |
| a cookie `path` mismatch that made "cleared on save" a no-op | green | shipped |

The session that produced the first case wrote its own verdict: *"`@code-review`'s 0 findings were
against the commit that silenced Sarah… it had no way to know the fixture was fabricated. That's
'internally consistent,' not 'correct.'"* The session that produced the fifth wrote:
*"**The bug that mattered this session was found by hand, not by any suite.** … Session 93 recorded
'not done: the surface check' as its one gap. That gap was the whole yield."*

### Why this is not more prose in `CLAUDE.md`

The rules that would have prevented the first four **already exist, already load every session, and
already lost.** `CLAUDE.md § Communication` says *"Cite facts; label proposals… If you can't cite
it, ask instead of asserting."* `§ Workflow Notes` says *"Before asserting what is built or live,
check the code in the same turn."* The model quoted both back correctly when asked and had still
shipped the fabrication:

> *"It's already there, verbatim… Both loaded, the whole time. I can quote them and I still built a
> fixture out of your sentence and shipped it. More text isn't the fix — the rule wasn't missing,
> and I didn't notice I was standing in the situation it describes."*

The operator was blunter, across a two-to-three-hour correction that ran to fifteen turns:
*"THIS IS BECASUE YOU HAVE NO IDEA HOW MANY TIMES THIS HAS ALREADY HAPPENED"*, *"AND THERE IS NO
SOLUTION. 'put it in claude.md' ... it's already in there"*, *"MEMORIES DO NOT WORK"*, and
*"I'm not sure if you realize how unconfident I am that this report is really worth anything."*

**A rule stated by the person who owns the workflow, out loud, that then loses, is not repaired by
restating it.** So the repair is not a sentence next to the failed sentences. It is a **different
reader, given a question it was not previously asked to ask**, running mechanically on every diff
through `/kill-this`. The author of a claim is the worst possible checker of it — the whole reason
the claim got written is that it felt already known. `@code-review` has no such feeling, reads the
diff cold, and until now had no instruction to treat a sentence as anything but code.

### What this does not close, and it is a lot

- **Claims made only in chat are untouched.** The reviewer reads a diff. A confident wrong statement
  in a reply reaches the operator directly and this changes nothing about it.
- **A convincing fabrication can still pass.** Check 10 asks whether a source is locatable, not
  whether the claim is true. A fixture that cites a plausible-looking file is a finding avoided,
  not a lie detected.
- **The surface-check reordering is a convention, not a gate.** Nothing enforces that the PR's hand
  section was actually run before merge, and nothing will — the operator merges. When the same
  ordering was pointed out to the operator in-session, the reply was *"(i didn't read what you wrote
  because it seems like what i've been doing all along up to today)"*, and `/kill-this` was
  re-invoked the old way minutes later. The reason to write it into the shell is precisely that:
  the numbering, read plainly, produces the wrong order, and correcting the numbering costs nothing
  and lasts, where a correction spoken once in a session did not.
- **`/security-review` is unchanged.** Its scope is right for what it hunts.

### Distribution, stated because it is the part that will be got wrong

Per **DEC-S035**, `@code-review` is project-owned: seeds' `dev/claude/agents/code-review.md` is an
install-time starting point, no sync writes to it, and `drift.mjs` classifies it `context` and will
report nothing. Several projects have heavily adapted reviewers whose adaptation is the reason they
are worth running — sheepdog's redefined **bug** severity being the named example. **Check 10 must
be hand-merged into each project's own copy, not copied over it.** A cycle that overwrites those
files to deliver this check has destroyed more than it added.

**Schema:** additive — one agent check plus one severity, and prose in the shell's Micro Workflow.
No skill contract, frontmatter field, or settings change. No version bump.
