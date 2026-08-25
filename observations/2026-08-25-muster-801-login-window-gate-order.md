---
repo: muster
session: 2026-08-21-1048-eric-797-operator-cancel-full-refund (session 92; harness slug 801-login-window-gate-order)
transcript: /home/eric/.claude/tape-queue/2026-08-22-muster-ad732f7c-4a21-5916-8cd9-6e3016d9ae4b.jsonl
observed: 2026-08-25
---

**Scope note.** The harness slug names the session `801-login-window-gate-order`, but issue #801 was
never worked in this window — it belongs to a *concurrent* session running in `/home/eric/muster-s91`
(confirmed: session file frontmatter and the its-dead Step 4.5 audit at the end of this transcript both
say so). This window's actual branch trail is `task/797-operator-cancel-full-refund` →
`task/803-cancelled-owes-nothing` → `task/804-paging-test-not-broken`, ending on
`task/801-login-window-gate-order` only because the last thing done was checking out the *other*
window's PR #810 branch to review it locally. `801` in the slug reflects the git state at session end,
not the work performed. Findings below are cited against the actual three tasks shipped (#797, #803,
#804).

False-calibration sweep: grepped 64 assistant text turns for the confidence-marker regex
(`almost certainly|certainly|definitely|clearly|obviously|must have been|is likely|probably|no doubt|undoubtedly`).
**0/64 hits.** (Note: the session's central defect, Finding 2 below, is a false claim stated as fact —
but it uses none of the swept hedge words. It reads as a plain declarative ("costs `/book`'s default
month its emptiness") rather than a hedged one, so the sweep's regex is not the right tool for catching
this shape of unsupported claim — it slips through under the sweep by being *more* confident than the
sweep's wordlist, not less.)

## Summary

| ID | Pattern | Found | Cost if it recurs | Self-announcing |
|----|---------|-------|--------------------|------------------|
| Finding 1 | `/kill-this` step ordering lets hand-testing happen against pre-review code | Yes — self-diagnosed at turn 901, citing a prior real defect from session 90 | code reviewed by `@code-review` diverges silently from code the operator hand-tested; not recoverable after merge without a second look | no — "a review that changes code after a hand test announces nothing" (turn 901, verbatim) |
| Finding 2 | Test behaviour asserted as fact from reading a test's title/comments, not from running it or reading its assertions | Yes — 1 occurrence, landed on `main` for ~3.5 hours before self-caught | a false "KNOWN BROKEN" claim, a phantom issue, and an incorrect doc/comment trail shipped to `main`; recoverable only by a dedicated follow-up PR | no — passed `@code-review`, `/security-review`, and CI; self-caught only because the model happened to check on unrelated CI status |
| Finding 3 | Multi-turn escalation over a fabricated/misremembered "fare-only carve-out" framing of a refund policy the operator had already stated plainly | Yes — 4-turn escalation, turns 231→241→251→290 | wrong money math shipped to a customer-facing refund screen if not caught; this time caught before merge | no — required the operator to catch it, and the operator's own words say this specific correction recurs across sessions |
| Candidate | Guessed a not-yet-created PR number in a GitHub comment, because concurrent sessions share GitHub's one issue/PR counter | Yes — 1 occurrence, self-corrected in the same turn | a wrong PR number in a public comment for however long it takes to notice; here, seconds | yes — the actual PR number is visible immediately after creation |

---

## Finding 1 — `/kill-this` step ordering invites hand-testing against pre-review code · high

**Occurrences:** The operator names this as their standing practice ("i have been testing ... then
doing kill-this," turn 898), not a one-off in this session, and the model cites a specific prior
instance where it caused a real shipped defect (session 90, "a cookie `path` mismatch that made
'cleared on save' a no-op" — turn 901; this audit did not independently verify session 90's transcript,
so that specific claim is reported as the model's self-report, not as independently confirmed fact).

**Cost if it recurs:** Not recoverable in general. `/kill-this` Step 2 commits and pushes, Step 3 runs
`@code-review` and fixes land as follow-up commits, and only then does Step 4 open the PR
(`/home/eric/muster/.claude/skills/kill-this/SKILL.md:36,58,115`). If a hand test (the workflow's own
"surface check," CLAUDE.md:32, step 7) happens *before* `/kill-this` is invoked, it tests a tree that
review has not yet touched. When review's fixes are comments-only, the tested and shipped code are
identical by luck (this session's own words, turn 901: "That was luck"). When review's fixes are
behavioural, the operator's hand test verified nothing about what actually ships.

**Self-announcing:** No. Quoting turn 901 directly: "the failure is silent by construction, since a
review that changes code after a hand test announces nothing." Nothing in the PR body, the CI run, or
the merge flags that the tested tree and the merged tree differ.

**Cause:** The Micro Workflow's own step numbering (CLAUDE.md:26-35) reads as "test, then ship" —
step 7 is "Check the surface," step 9 is "`/kill-this`" — but the actual review gate
(`@code-review`, kill-this Step 3) sits *inside* step 9, after step 7 has already happened by the
numbering's own reading. The operator was following the steps in the order they're numbered; the
numbering itself is what produces the wrong order. This is not a one-time lapse — the operator states
it is what they have "been doing all along" (turn 904), and re-invoked `/kill-this` immediately after
without engaging with the proposed remediation ("i didn't read what you wrote because it seems like
what i've been doing all along up to today" — turn 904).

**Operator reaction (all turns, in order):**
- Turn 898: "i have been testing ... then doing kill-this. but it's not really the correct order. i need to test after the code reivew /kill-this"
- Turn 904 (re-invoking `/kill-this` for task 3, minutes later): "(i didn't read what you wrote because it seems like what i've been doing all along up to today)"

No turn re-raises this later in the session; the model's proposed reordering
("`/kill-this` → PR opens → hand test → fix on the branch if needed → merge," turn 901) is not
visibly adopted or rejected within this transcript — the session moves straight to shipping #803 the
same way.

**Sketch (proposed, not a rule):** The step numbering in `CLAUDE.md`'s Micro Workflow currently places
"Check the surface" (7) before "`/kill-this`" (9), which reads as sequential when the actual gate
(code review) is nested inside step 9, after the point step 7 already passed. One structural option
worth `@workout` weighing: state explicitly, next to step 7 or step 8, that the surface check performed
here is pre-review and advisory only, and that the operator's authoritative hand test happens after
`/kill-this` opens the PR and before merge — which is exactly the reordering the model proposed
in-session (turn 901) and which requires no skill change, only a documented convention.

---

## Finding 2 — Claimed a test's behaviour from its title and comments, not from running it or reading its assertions · high

**Occurrences:** 1. While widening a dev-fixture's date range for issue #797, the model read
`e2e/book-availability.spec.ts` at offset 233 (transcript line 523) and, from the test's *title*
("an empty month prompts a date pick and pages forward to availability") and surrounding comments,
concluded the change would break it. It wrote a `KNOWN BROKEN` block into the test file, added matching
claims to two more comments (`src/reservations/seed-reservation.ts` header, `seed-reservation.test.ts`),
filed issue #804 to track the "break," and shipped all of it in PR #805, which merged to `main`. The
claim was false: the prompt in question is gated on *no date being selected*
(`app/(public)/book/page.tsx:490`), not on the month being empty, and the model's own later PR body
(#811) states the root cause directly: "I made the claim from the test's title and comments ... rather
than from its assertions." The e2e suite had in fact already run green on that exact branch — PR #805's
`e2e` job passed in 25m47s — before the claim was ever written down, so the evidence contradicting the
claim existed the whole time it sat on `main`.

**Cost if it recurs:** A false "KNOWN BROKEN" comment and a phantom tracking issue (#804) shipped to
`main`, requiring a dedicated follow-up PR (#811) to retract — file edits, an issue comment posted
then corrected for a wrong PR number (see Candidate below), a second `@code-review` pass, and operator
attention across two more turns (1048, 1068) before the correction shipped. Recoverable, but the
mechanism that let it ship at all — no check compares a "this will break" claim against the CI result
that already exists for the same branch — would let the same shape of claim ship again undetected.

**Self-announcing:** No. It passed `@code-review` (2 findings, neither about the claim's truth — one
was a stale header, the other was "a deliberate e2e break with no tracking issue," which the model
satisfied by *filing the tracking issue for the false break* rather than questioning whether the break
was real). It passed `/security-review` (out of scope for a comment-only diff). It passed CI, because
the CI check that would have contradicted the claim (the green `e2e` run on the very same branch) was
never cross-referenced against the claim before the claim was written. The model self-caught only
because the operator's unrelated status update ("805 was green and is merged," turn 1048) prompted it
to look at the e2e job for a different reason (checking whether the *deliberate* break in #804 had
fired as expected) and found it hadn't.

**Cause:** `.claude/CLAUDE-context.md` § Workflow Mechanisms defines this project's "Proof" as Vitest
against the domain core, explicitly not e2e/Playwright (`.claude/CLAUDE-context.md:114-115`), and
"Surface check" as a manual eyeball at `mill-dev:3000` (`:116`) — neither slot requires running the e2e
suite locally before making a claim about it. At the moment the claim was written (turn ~547, in the
middle of task #797, well before PR #805 opened or its CI ran), there was no tool result available that
could have confirmed or denied it — the model had not yet run the test and had not yet seen a CI
result. It wrote the claim as settled fact anyway. CLAUDE.md:263 governs exactly this: "Cite facts;
label proposals. Any claim about the code, config or project rules cites a file:line or a tool result.
If you can't cite it, ask instead of asserting." The claim cited neither — no tool result (the e2e test
was never run) and no file:line beyond the test's own title, which is not an assertion. The branch
point: reading the test's *name* is cheap and was already in context from an adjacent grep (turn 478);
running or fully reading the test's logic was not done at that point, and nothing in the workflow gated
writing "KNOWN BROKEN" into a file on making the cheaper read.

**Operator reaction:** None directed at the mistake itself — the operator's turn 1048 ("805 was green
and is merged") is a plain status update, made without apparent awareness that the earlier claim was
wrong; the correction was entirely self-initiated by the model at turn 1065 ("I was wrong, and
something false is now on `main` because of it"). The operator's only reaction *to the proposed fix* is
turn 1068, matter-of-fact: "so a small document PR? to fix the broken comments," followed by "go"
(turn 1074).

**Evidence:**
- False claim written: turn ~547 (season-widening summary) and the `KNOWN BROKEN` block added to
  `e2e/book-availability.spec.ts` in the same span (edits at transcript lines 483-537).
- Self-correction: turn 1065 ("I was wrong..."), full root-cause admission in PR #811 body: "I made the
  claim from the test's title and comments ('an empty month prompts a date pick') rather than from its
  assertions."
- The evidence that contradicted the claim the whole time: PR #805's own `e2e` CI run, green, 25m47s,
  cited at turn 1051 and again in PR #811's body.

**Sketch (proposed, not a rule):** Nothing in this session's tooling flags "you are about to write a
claim about test behaviour into a comment or a filed issue, and you have neither run the test nor
quoted its assertions." That check would need to fire at the point of writing the claim, not at review
time — `@code-review`'s own pass here shows it re-derives claims from source when reviewing a *diff*
that already contains the false claim (see PR #811's code-review section, which caught the *comment*
was still wrong the second time around), but it did not catch the *original* claim in PR #805 because
nothing told it the claim was assertable-but-unverified rather than settled.

---

## Finding 3 — Multi-turn escalation over a refund-policy detail the operator had already stated plainly · medium-high

**Occurrences:** 1 escalation sequence within task #797's spec phase, turns 231→241→251→290.

**What happened.** Asked to spec issue #797 (a full-refund quote was short by the tip and a service
fee), the model's first proposed fix (turn 224, quoting fully at "Judgment") corrected the operator-cancel
branch but explicitly preserved the existing behaviour on the customer-cancel branch — "customer keeps
the fare-only carve-out exactly as it is" — treating that carve-out as settled because DEC-153 states it.
The operator called this out as still wrong (turn 231: "'fare-only, minus the \$50 outside the
window'... i think it's completely wrong"). The model then re-derived from DEC-153's own text that the
carve-out contradicted a different sentence nine lines later in the same document (turn 238), but still
answered with a paragraph of "Judgment" reasoning rather than a plain restatement of the rule. The
operator's turn 251 makes clear the reasoning itself was the problem, not just its conclusion: "we are
going to skip everything you said in Judgement... Please fix all DEC and SPEC and CODE to match the
above 3 rules with no adlibe on what you think might be a good idea." Turn 290, later in the same
exchange (responding well to a different, narrower question the model asked about the service fee),
still carries the accumulated frustration explicitly: "i really like that you are thought[ful]... but
for f---s sake... i wish i could count the number of times i correct you and said 'full refund'" —
stated by the operator as a *recurring* correction, not specific to this session.

**Cost if it recurs:** Wrong refund math reaching a customer-facing cancellation screen if the operator
did not catch it before merge — this time it was caught pre-merge, at the cost of a four-turn
correction cycle plus the operator's stated cumulative frustration across sessions.

**Self-announcing:** No. The model's own proposed fix at turn 224 read as internally coherent and cited
real file:line references; nothing in it flagged that "preserve the carve-out on this branch" was an
unstated assumption rather than a requirement. It required the operator's own knowledge of the policy
to catch.

**Cause:** At turn 224, the model treated DEC-153's stated design ("the carve-out," "two different
numbers, deliberately") as authoritative without checking it against the plain three-rule policy text
that was available in the same file (`refund-terms.ts:9-13`, which the model itself quotes moments
later at turn 244) or against the operator's issue report. This is the situation CLAUDE.md's Scope
Discipline section names directly: "never invent or misattribute a rationale I didn't state (especially
in DECs and durable notes)" (CLAUDE.md:235). The model preserved a rationale from a decision document
instead of checking it against the rule the operator had already given, and did so a second time (turn
238) even after starting to notice the contradiction, by continuing to explain rather than just stating
the corrected rule — which is exactly what turn 251 stops.

**Operator reaction (all turns, in order):**
- Turn 231: "'fare-only, minus the \$50 outside the window' ...what does 'fair only' mean here? 'That's now half-wrong' ... i think it's completely wrong"
- Turn 241: "okay ... can you please re-read the refund policy and then tell me what the 3 refund options are?"
- Turn 251: "we are going to skip everything you said in Judgement. Please fix all DEC and SPEC and CODE to match the above 3 rules with no adlibe on what you think might be a good idea"
- Turn 290: "i really like that you are thought[ful] ... and if we had done all this and later said ... oh yeah. the service fee, that stays out ... but for f---s sake on a f---ing f--- stick ... i wish i could count the number of times i correct you and said 'full refund'"

The escalation runs from a specific correction (231) to a blanket instruction to stop reasoning and
just match the stated rules (251) to an explicit statement that this exact correction recurs across an
unstated number of prior sessions (290) — that last point is a claim about history outside this
transcript that this audit did not and cannot verify, reported here as the operator's own words, not as
established fact.

**Sketch (proposed, not a rule):** Not proposed here — the operator's turn 290 frames this as a standing,
recurring pattern rather than a one-off, which is exactly the kind of repetition a single-transcript
observer cannot itself validate or size. That judgment belongs to `@workout`, which can check whether
other observations describe the same shape of failure (trusting an existing decision/doc's stated
rationale over a plainer, already-available source) across sessions.

---

## Candidate — Guessed a not-yet-created PR number in a public GitHub comment

**Why it might be a pattern:** While closing issue #804 by hand (turn 1165), the model posted an issue
comment referencing "PR #810" before creating the PR — a guess about what number the next-created PR
would get. The actual PR came out as #811 (turn 1182: "PR is #811, but the issue comment I posted says
#810 — I guessed the number before creating it. Correcting."), requiring a `gh api PATCH` to fix the
comment. The likely cause is structural rather than careless: this session ran concurrently with another
window (session 91, in `/home/eric/muster-s91`) creating its own issues and PRs against the same
GitHub repo, and GitHub allocates issues and PRs from one shared counter (the exact fact CLAUDE.md:209
cites as the reason to always qualify "issue #N" vs "PR #N"). With two windows drawing from the same
counter, "the next number" is not predictable from local state alone, which is a sharper version of
the ambiguity that rule already exists to manage.

**Why it might be noise:** Single occurrence, self-caught and corrected within the same turn, no
operator involvement, and no incorrect information persisted anywhere after the `PATCH`.

**Cost if it recurs:** Low as observed — a wrong PR number visible in a public comment for the seconds
between posting and noticing. Higher if the correction is missed: a comment permanently pointing at the
wrong PR.

**Self-announcing:** Yes — the real PR number is known immediately after `gh pr create` returns, so the
mismatch is visible on the model's own next check, as happened here.

**Cause:** The model wrote the issue-closing comment and created the PR in separate steps
(comment text drafted with a guessed number, in `cat > /tmp/pr-804.md` context; PR created after), rather
than creating the PR first and then writing any cross-reference to it. Guessing was cheaper in the
moment than sequencing the two operations to avoid needing a guess at all.

**Operator reaction:** None — not raised in-session; entirely self-caught and self-corrected by the model.
