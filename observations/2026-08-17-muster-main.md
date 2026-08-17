---
repo: muster
session: main
transcript: /home/eric/.claude/tape-queue/2026-08-17-muster-fb57b653-9788-4c53-98be-5708d92c7a9a.jsonl
observed: 2026-08-17
---

## Session shape

Single continuous window, 1151 lines, `2026-08-16T22:36:42Z` → `2026-08-17T03:50:31Z`. Opens on
`task/617-full-payment-default` (a stash-pop resume, line 4-30), moves through a small parked
task (`task/dec-155-fold-into-107`, deliberately not pushed — seeds still owns the DEC rule it
depends on), then does the session's real work on `task/715-guests-before-dates`: issue #715
("Guests come first, and the calendar only offers boats that fit"), ending in PR #753 (merged,
verified live via `gh pr view 753`), a CI-failure fix, a spec written for issue #742, and
`/its-dead`. Only 21 human turns in the whole window — this was a long largely-unattended stretch.

## P7 — Full suite run during development · high

**Rule:** `CLAUDE.md:32` (muster) — "Run the proof — the checks covering what you touched, not
the whole suite; the full suite is my call, never automatic."

**Occurrences: 3**, all bare `npm run test:e2e` (no file argument) on `task/715-guests-before-dates`:
- line 518, `2026-08-17T00:23:45Z`, `"description":"Run the full Playwright suite"` — at the
  "Built, not shipped. Stopping here." checkpoint mid-task-1, following a mis-scoped `pg_isready`
  probe (see next finding). **Not part of `npm run verify`** — `.claude/CLAUDE-context.md:66`
  defines the gate as `check:decisions + check:context + check:docs + typecheck + typecheck:app +
  lint + test + build`, which does not include `test:e2e` at all, so this was a deliberate extra
  action, not gate compliance.
- line 600, `2026-08-17T00:45:15Z` — after widening the demo seed fixture from one boat to three
  (shared fixture state; 13 failures surfaced across 3 files not directly touched).
- line 727, `2026-08-17T01:34:53Z` — after adding `boatCapacity` and deleting one sentence of
  copy. 9 minutes, to re-learn that `admin-nav` still fails on WebKit (already known).

**Cost if it recurs:** compute + wall-clock waste, recoverable — no wrong output shipped. The
third run alone cost 9 minutes for zero new information.
**Self-announcing:** no, mechanically — nothing flags a bare `test:e2e` invocation as out of
policy; it surfaced only because the operator was reading tool calls in real time.
**Cause:** the model's own account (line 771, in full below) says the trigger it was using was
"I'm about to hand back" rather than "this change could plausibly reach code I can't name." That
explains runs 2 and 3. Run 1 (line 518) is not addressed by that account at all — the model's own
retrospective only ever names **two** runs (memory file at line 737: "I ran the full Playwright
suite twice unprompted"; session-log entry at line 1141: "I ran the full 9-minute Playwright suite
twice unprompted") — both undercounts. The transcript has three bare invocations; the record this
session wrote about itself has two. A future session or `@workout` pass reading only the session
log inherits the undercount.
**Operator reaction — quoted in full, in order:**
- line 735, `2026-08-17T01:44:05Z`: *"oh Jesus, you are not supposed to run the whole suite, and
  why on those tiny changes???? yeah, write that down, so you don't do it again ( pssssss it's
  already written down)"* — sarcastic hint that the rule was already documented (it is, at
  `CLAUDE.md:32`).
- line 769, `2026-08-17T01:51:55Z`: *"why did you run the whole playwright suite?"* — a direct
  follow-up demand for explanation, answered at line 771 (the "Two runs, two different answers"
  self-audit quoted above).
- line 812, `2026-08-17T02:00:03Z`: *"not running the full suite is actually in the claude.md. and
  I'm sure if you checked your memory, it might be in there more than once"* — the operator
  predicting, correctly, that the model's own self-correction (a new memory file written at line
  737 in response to turn 735) duplicated a rule already on record. The model checked (line
  814-815, `grep -rln "suite\|whole\|scope" memory/`), confirmed the duplication, and deleted both
  the new memory file (line 820, `rm …never-run-the-full-suite-unasked.md`) and its `MEMORY.md`
  index line (line 825).

Three escalating turns about the same underlying event, the middle one producing a fix (a new
memory file) that the third turn immediately identified as redundant with a rule already in force.
The behavior was corrected in the sense that no further bare `test:e2e` runs occur after line 812
— but the fix that stuck was "delete the redundant self-note," not anything that changes what
happens the next time a session is tempted to run the full suite before handing back.

**Sketch (proposed, not a rule):** `CLAUDE.md:32` already states the rule; the gap is that nothing
_operational_ distinguishes "fixture/shared-state change, plausibly fleet-wide" (line 600, which
the model itself defended) from "trivial, already-covered change" (lines 518 and 727, which it
couldn't). A one-line addendum naming the actual test — "if the specs you already ran cover the
files you touched, that's the whole check; running everything again to double-check green is the
banned case" — might close exactly the gap the model's own self-audit found, without inventing a
new mechanism.

## P13 — Bash `sed -n` used instead of Read tool for source-file inspection · medium

**Rule:** `CLAUDE.md:206` (muster) — "Read files with the Read tool — never `sed`, `grep`, `awk`,
or `cat` to pull a section out. Read is allowlisted and never prompts. A shell one-liner extracting
a section can miss an allow-pattern match and stop a skill dead on a permission prompt mid-run,
which has now happened twice on `.claude/CLAUDE-context.md` — once in `/kill-this`, once in
`/promote-production`." The rule cites its own prior-incident history.

**Occurrences: 21**, `sed -n '<range>p' <file>` reads of source/spec files, lines: 142, 158, 173,
365, 390, 421, 445, 447, 461, 464, 489, 569, 574, 658, 796, 837, 885, 1046, 1067, 1070, 1087.
Representative sample: `sed -n '85,140p' src/reservations/claim.ts` (142), `sed -n '360,412p'
src/reservations/availability.ts` (445), `sed -n '135,175p' 'app/(public)/book/checkout/page.tsx'`
(447), `sed -n '128,170p' e2e/book-checkout.spec.ts` (658). None of these files were subsequently
read via the Read tool in this transcript. `app/(public)/book/checkout/page.tsx` specifically was
never Read-tool-read yet was Edit-tool-edited four times (lines 368, 696, 848, 856) — all four
Edits succeeded (no "has not been read" error at any point in 94 total Edit calls this session).

**Cost if it recurs:** in *this* session, none realized — no permission stop occurred. But the
rule text names two prior sessions where this exact shape (a `sed`/one-liner extraction hitting a
missed allow-pattern) stopped a skill mid-run, and the cost when it does trigger is a dead skill,
not a slow one.
**Self-announcing:** no in the case that doesn't trigger a permission stop (this session, 21 times)
— yes in the case that does (the two prior incidents the rule cites).
**Cause:** not established from this transcript — no turn explains why `sed` was reached for over
Read. The instinctive habit is the more economical guess (`sed -n` returns exactly the requested
range in one call without a token-cost discussion), but that is not evidenced here, only inferred.
**Operator reaction:** none — not raised in this transcript.

**Note on Edit's read-tracking:** the absence of any "not read" error across 21 sed-reads paired
with 94 Edits (including 4 on a never-Read-tool-read file) suggests this session's harness did not
enforce Read-before-Edit as a hard precondition, or the model's exact-`old_string` matches
substituted for it successfully every time. Either way, the CLAUDE.md:206 rule's own stated
rationale (permission-prompt risk, not edit-precision) held regardless of whether the substitute
edit-path worked — the two are separate risks and this session only sidestepped one of them.

## Candidate — `pg_isready` misdiagnoses containerized Postgres as down, recurring across sessions

**What happened.** Line 403 (`2026-08-17T00:12:09Z`): bare `pg_isready` returns "no response" (it
probes a unix socket that does not exist for the containerized Postgres this project runs
locally). The model's own text, same turn: *"Postgres is down (`5432 - no response`), **same as
last session**. Continuing with what doesn't need it."* — an explicit admission this is a repeat,
not a first occurrence. Work continued without Postgres-backed verification until line 504
(`2026-08-17T00:22:28Z`, ~10 minutes later) when a fuller probe (`systemctl`, `docker ps`) found
Postgres healthy in Docker (`muster-postgres`). The session's own closing note (line 1141,
appended to the session-log file) records: *"`pg_isready` with no `-h` lies about this box …
Session 84's notes record the same conclusion from the same command, so this has now cost two
sessions."*

**Why this might be a pattern (not noise):** the model's own record states two-session recurrence
in plain language, unprompted by any question about it — this is the strongest kind of
self-reported repetition a single-transcript audit can surface, even though this audit only has
direct visibility into session 85 (this transcript) and hearsay about session 84 (via the prior
session's closing note, read at this session's start, line 76-ish region).

**Grounding check:** `.claude/CLAUDE-context.md` (muster) documents Postgres as "local Postgres in
dev" (line 27, line 131) but does not state it runs in Docker locally or that `pg_isready` needs
`-h localhost` to probe it correctly — so there is no existing written rule this violates; this is
a documentation gap, not a rule violation, and is reported as a Candidate for that reason.

**Cost if it recurs:** at minimum ~10 minutes of restructured work-avoidance per occurrence (this
session); the larger, harder-to-bound cost is that Postgres-backed checks get silently skipped for
whatever stretch the misdiagnosis persists, which is a different risk than lost time.
**Self-announcing:** no — nothing errors; the model's own conclusion ("Postgres is down") is
plausible-sounding and self-consistent, and only a second, more thorough probe corrects it.
**Cause:** the environment fact (containerized Postgres, TCP-only, unix-socket probe fails by
design) is real and stated nowhere in project docs available to the model. This is the second
session in which the same wrong tool invocation produced the same wrong conclusion — evidence the
gap is in the documentation, not in a single session's judgment.
**Operator reaction:** none in this transcript — not raised by the human at any point; caught and
recorded only by the model itself, in a note that will not resurface unless a future session
happens to read this specific session-log entry.

**Sketch (proposed, not a rule):** a one-line addition to `.claude/CLAUDE-context.md`'s Postgres
paragraph — "local Postgres runs in Docker (`muster-postgres`); bare `pg_isready` probes a unix
socket that doesn't exist for it and will report false-down — use `pg_isready -h localhost` or
`docker ps`" — would remove the need for either session's 10-minute re-derivation.

## Candidate — Dev server started twice against operator preference, self-corrected same session

**What happened.** Lines 624 and 626 (`2026-08-17T00:57:31Z`, `00:57:33Z`): the model starts
`PORT=3200 npm run dev` twice in immediate succession (first attempt denied by the `curl *` deny
rule mid-chain; second attempt, `run_in_background:true`, succeeded — task `btbv111nx`). The
operator's turn 639, `2026-08-17T00:58:xx`-ish: *"please do not start dev servers for me."* The
model stopped the task (line 644, `2026-08-17T01:18:43Z`) and wrote a new personal memory file
(line 645, `dev-server-port-allocation.md`) recording the instruction. No further dev-server starts
occur in this transcript after that point.

**Why this might be a pattern, not noise:** single occurrence, fully self-corrected within the
same session, and grounded in a personal memory file rather than any written muster project rule
(neither `CLAUDE.md` nor `.claude/CLAUDE-context.md` says "don't start dev servers" anywhere this
audit could find) — so this is weak evidence on its own. Reported because it is the same shape as
the `test:e2e` and `pg_isready` findings above: a default habit (start what you need to verify a
change) colliding with an operator preference the model didn't have on record yet.
**Cost if it recurs:** low and recoverable — an unwanted background process the operator has to
notice and kill, per the memory file's own stated rationale.
**Self-announcing:** yes — the operator noticed and said so within the same turn-pair.
**Cause:** no pre-existing instruction to violate; this is the first time the preference was
stated (memory file `modified: 2026-08-17T01:18:51Z`, created this session).
**Operator reaction:** one turn, immediate, no escalation needed — the strongest possible case of
a self-correcting loop working as intended.

## False-calibration sweep

Confidence-marker grep (`almost certainly|certainly|definitely|clearly|obviously|must have been|is
likely|probably|no doubt|undoubtedly`) against all 93 `"type":"text"` blocks in the transcript
returned 1 genuine assistant assertion carrying a flagged marker (after excluding: a source-code
comment quoted via a Read result, a verbatim quote of the operator's own words, and boilerplate
from the `/security-review` subagent's system prompt — none of which are model-authored claims).

The one hit: *"the stated cause for `calendar:789` is probably wrong"* (line 1116, repeated
verbatim in a `gh issue comment` at line 1121 and the session-log close at line 1141 — one
underlying claim, three places it's written). Checked against same-turn evidence: the claim is
followed immediately by a cited mechanism (`toContainText` auto-retries against a 10-second
`expect` timeout per `playwright.config.ts:54`, and "the failure log shows it polling for the full
10s") that directly contradicts the issue body's paint-race hypothesis. Supported.

**false-calibration: 0/1 unsupported** (1 confidence-marker assertion found; it cited file:line and
log evidence in the same turn).
