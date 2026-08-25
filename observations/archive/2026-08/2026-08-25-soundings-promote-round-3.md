---
repo: soundings
session: 2026-08-22-soundings-38d6b9c2-9665-553f-bdf4-85ae16bce5cf
transcript: /home/eric/.claude/tape-queue/2026-08-22-soundings-38d6b9c2-9665-553f-bdf4-85ae16bce5cf.jsonl
observed: 2026-08-25
---

## Candidate — bare issue number written after CLAUDE.md explicitly forbids it

**Occurrences:** 1 (four bare uses in a single message)
**Cost if it recurs:** the exact confusion this rule exists to prevent — operator loses track of whether a number names an issue, a PR, or a plan row. Recoverable this time (one clarifying round-trip), but not self-limiting: the rule is explicit and was still violated by the model that carries it in context every turn.
**Self-announcing:** yes, but only because the operator caught it — nothing in the tool output or workflow flags a bare `#N`.
**Cause:** turn 1135 opens correctly ("issue #47"), then the same message's closing section reverts to bare `#47` four times ("Two things about #47 itself"). The rule (`CLAUDE.md` — "Never write a bare #N. Always say which kind") has no mechanical enforcement; it only holds if applied at every subsequent mention in the same turn, and long structured responses (headers, bold, code) are exactly where a model drops the qualifier once established. Nothing in the turn re-checked its own later sentences against the opening one.
**Operator reaction:** turn 1138 (`"I dunno what 47 is? an issue?"`) — direct confusion, not a stylistic nitpick. Turn 1143 (`"I think you are supposed to put issue or pr before numbers .... 2.4 is not valid anymore?"`) — operator names the rule from memory and asks a *second*, unrelated question (is task 2.4 stale) in the same breath, because the numbering confusion had already spread to doubting other numbers in the docs. Turn 1146: Claude Code's own admission — `"You're right on both counts — I wrote #47 bare four times after leading with the full form."` No further recurrence in the rest of the session (checked: no other bare `#N` outside `closes #N`, which is the documented exception).

**Evidence:**
- Turn 1135 (assistant): `"Two things about #47 itself:"` and 3 further bare uses in the same message, versus the correct `"issue #47"` earlier in the same message.
- `CLAUDE.md` (soundings): *"Never write a bare `#N`. Always say which kind: `issue #699`, `PR #707`."*
- Turn 1138, 1143: operator confusion, quoted above.
- Turn 1146: self-acknowledged violation, count matches (4).

**Sketch (proposed, not a rule):** not a skill-file fix — this rule applies to free-form chat replies, not a skill step, so there's no SKILL.md to patch. If `@workout` judges this worth promoting, the likely target is a lint/grep-based post-check (`grep -o '[^#]#[0-9]\+' `) run by the human periodically, since a prose instruction has now been shown not to self-enforce across one long reply, let alone a session.

## Candidate — clarifying question answered with the same explanation restated, not simplified

**Occurrences:** 1
**Cost if it recurs:** wasted round-trip plus operator frustration; recoverable, but corrodes trust in whether Claude Code is actually listening to a "I don't understand" signal versus pattern-matching it to "say it again."
**Self-announcing:** yes — operator called it out directly and sharply.
**Cause:** turn 467 originally explained the holder-length issue in one dense paragraph including phrases like "the protection PCB sits under the negative cap." Turn 471, operator: `"I don't understand protecting holder length thing. what do I need to verify?"` — a request to re-explain in *plainer* terms, not a request for the same content again. Turn 473's reply repeats the identical mechanism ("Protected 18650s are longer than bare ones because the protection PCB sits under the negative cap...") with the same vocabulary, just reformatted with bold. The model appears to have treated "I don't understand X" as "re-state X" rather than "re-derive X for this reader," and had no signal in-context that told it the first phrasing was the obstacle.
**Operator reaction:** turn 475/477 (same message, queued once, split by the harness): `"I said I didn't understand the holder length, at you just repeated the same really long jargon laddend paragraph. thanks!"` — this is escalation, not a first-time correction; the operator is visibly annoyed at having to say it twice. No further recurrence of this specific pattern later in the session; subsequent explanations to the same operator (e.g. turn 1140, the issue #47 lookup) were shorter and more direct, so the correction may have generalized, but that is inference from absence, not confirmed by a second test.

**Evidence:**
- Turn 467/468 (assistant): "Protected 18650s are physically longer than bare ones — the protection PCB sits under the negative cap..."
- Turn 471 (operator): "I don't understand protecting holder length thing. what do I need to verify?"
- Turn 473/474 (assistant): "Protected 18650s are longer than bare ones because the protection PCB sits under the negative cap..." (same mechanism, same vocabulary)
- Turn 477 (operator): "I said I didn't understand the holder length, at you just repeated the same really long jargon laddend paragraph. thanks!"

**Sketch (proposed, not a rule):** no existing pattern in P1–P17 covers this; it isn't `Concise`'s job either, since `Concise` governs register/length, not whether a second attempt actually changes content when the first didn't land. Any fix here is a judgment call about session state ("this explanation already failed once") that a static style file can't carry — flagging for `@workout` to decide if it's worth a workflow note at all, or just an observed-once curiosity.

## P11 — Multi-hypothesis / multi-step dump during manual bench testing

**Occurrences:** 1, self-corrected within the same exchange
**Cost if it recurs:** minor if caught immediately (as here); compounds if not — a non-technical operator running physical bench steps out of order risks a wrong reading being attributed to the wrong check.
**Self-announcing:** yes — operator's objection was immediate and explicit.
**Cause:** turn 139, responding to "what do i need to check on the stick lite?", Claude Code returned a 4-row table covering all four bench checks (JP1 polarity, GPIO36 toggle, Vext residual, sensor read) in one reply, mirroring how the checks are listed together in `HARDWARE_BUILD_PLAN.md:589-594`. The source document batches them as a reference table; the reply inherited that shape uncritically for a live, one-step-at-a-time physical task performed by a non-technical operator with a multimeter.
**Operator reaction:** turn 142: `"i dnno what jp1 is? it's why you should only give me one thing at atime"`. Single correction. Turns 145 onward (JP1 definition, then waiting for the reading before giving check 2) show correction held for the rest of the bench session — no repeat of the multi-step dump in ~90 subsequent turns of live measurement exchange.

**Evidence:**
- Turn 139 (assistant): 4-row markdown table, all four checks presented at once.
- Turn 142 (operator): direct callout, quoted above.
- Turns 145, 151 (assistant): single-item responses following the correction, holding for the remainder of the bench session (through turn ~224).

**Sketch (proposed, not a rule):** `CLAUDE.md` (soundings) — no existing line covers "when relaying a reference table from a doc as live instructions to a non-technical operator, split one step per message." This is the manual-testing-sequence half of P11's spirit but the trigger here is relaying a *doc's* batched format rather than proposing simultaneous debugging fixes; `@workout` may judge it's the same rule or a distinct one.

## Confirmed-working: no findings

**Bash `sed -n` denial (fleet-wide deny, `CLAUDE.md`).** Turn 754: `sed -n '1,40p'` denied. Turn 757: Claude Code immediately named the cause ("`Bash(sed -n *)` is denied fleet-wide — that's on me, it's in CLAUDE.md") and switched to `Read` with offset/limit. No retry-in-a-new-shape, no repeat. Not a finding — evidence the rule and the model's response to it both work as designed.

**Scripted-edit assert-or-fail (`CLAUDE.md`, "a scripted edit must fail loudly").** Turn 974: a `python3` heredoc with `assert n == 1` per anchor correctly raised `AssertionError` on one anchor out of five (`HARDWARE_BUILD_PLAN.md`, the "Series holder" row had already been reworded by an earlier edit in the same file). Turn 983: Claude Code stated "The assertion did its job — nothing was written to the build plan," then greped for the real anchor and proceeded correctly. Not a finding — this is the rule catching exactly the failure mode it exists to catch, with the two other files' edits (which did match) already applied and left in place rather than rolled back, which is correct per-file behavior for that script's structure.

**DEC-S036 search-before-write discipline.** All three PRs (#68, #69, #70) stated the `grep -rli` search and its result explicitly, and PR #70 caught and corrected an internal contradiction (chat's draft tried to be both a new decision `DEC-010` and `Amends: DEC-006` simultaneously) by citing the protocol's own test ("which decision would be wrong if you shipped this"). No finding — this is the control working on a case designed to defeat it.

## P5/P6 — PR test plans

**Checked directly** (`gh pr view 68/69/70 --json body`) rather than abstained. All three test plans are walkthrough-shaped with numbered manual steps, explicit setup/reset state, and file:line or grep commands to run — no "verify it works" phrasing (P5 clean). None of the three test plans duplicate their own code-review section; each test-plan step is independently phrased against the diff rather than restating a review finding (P6 clean).

## False-calibration sweep

31 raw regex hits. On inspection: the "almost certainly back-powering..." and similar phrases are quoted verbatim from a pre-existing doc (`CHAT_HANDOFF.md`, written by "Claude chat" in an earlier round, not this session's assistant) being read/reproduced in tool results and PR bodies — not fresh claims by this session. The one hedge newly authored this session ("Local hardware is likely cheaper than shipped — say so if that's the answer") is explicitly marked provisional and asks the reader to confirm, not stated as settled fact. **false-calibration: 0/31 raw hits attributable to this session's own unsupported assertions** (31/31 are either quoted pre-existing text or self-hedged proposals with an explicit ask for confirmation).
